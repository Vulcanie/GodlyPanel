import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { all as allServers, addMany } from "../data/serverStore.js";

const NAME_PATTERN = /^[^<>:"/\\|?*\x00-\x1f]{1,64}$/;
const KNOWN_METHODS = new Set(["rcon", "gamedig", "process"]);

/**
 * Validate one candidate entry.
 *
 * Missing paths are warnings, not errors — a real setup will have the odd
 * entry pointing at a drive that isn't mounted or a server that's been moved,
 * and refusing the whole import over one of those would be useless. Only
 * things that would actually break the panel are errors.
 */
function validateEntry(entry, seenNames, seenPorts) {
	const errors = [];
	const warnings = [];

	if (!entry || typeof entry !== "object") {
		return { errors: ["Not an object."], warnings };
	}
	if (!entry.name || !NAME_PATTERN.test(entry.name)) {
		errors.push(`Invalid or missing name: ${JSON.stringify(entry.name)}`);
	} else if (seenNames.has(entry.name)) {
		errors.push(`Duplicate name "${entry.name}".`);
	}
	if (entry.method && !KNOWN_METHODS.has(entry.method)) {
		errors.push(`Unknown method "${entry.method}".`);
	}

	for (const key of ["port", "queryPort", "rconPort"]) {
		const value = entry[key];
		if (value === undefined) continue;
		if (!Number.isInteger(value) || value < 1 || value > 65535) {
			errors.push(`${key} is not a valid port: ${value}`);
			continue;
		}
		const clash = seenPorts.get(value);
		if (clash && clash !== entry.name) {
			warnings.push(`${key} ${value} is also used by "${clash}".`);
		} else {
			seenPorts.set(value, entry.name);
		}
	}

	for (const key of ["workingDir", "installDir", "startScriptPath"]) {
		if (entry[key] && !existsSync(entry[key])) {
			warnings.push(`${key} does not exist: ${entry[key]}`);
		}
	}
	if (entry.configPaths && typeof entry.configPaths === "object") {
		for (const [label, p] of Object.entries(entry.configPaths)) {
			if (p && !existsSync(p)) warnings.push(`config "${label}" missing: ${p}`);
		}
	} else if (entry.configPath && !existsSync(entry.configPath)) {
		warnings.push(`config missing: ${entry.configPath}`);
	}

	return { errors, warnings };
}

function review(candidates) {
	const seenNames = new Set(allServers().map((s) => s.name));
	const seenPorts = new Map();
	for (const s of allServers()) {
		for (const key of ["port", "queryPort", "rconPort"]) {
			if (s[key]) seenPorts.set(s[key], s.name);
		}
	}

	const ready = [];
	const needsAttention = [];
	const rejected = [];

	for (const entry of candidates) {
		const { errors, warnings } = validateEntry(entry, seenNames, seenPorts);
		if (errors.length) {
			rejected.push({ name: entry?.name ?? "(unnamed)", errors });
			continue;
		}
		seenNames.add(entry.name);
		if (warnings.length) needsAttention.push({ name: entry.name, warnings });
		ready.push(entry);
	}

	return { ready, needsAttention, rejected };
}

/**
 * Read a legacy ServerData/servers.js.
 *
 * It's an ES module the user already runs, so importing it is both the most
 * accurate way to read it and the only one that doesn't involve writing a
 * JavaScript parser. The cache-bust matters: without it, re-importing after
 * the user fixes a syntax error silently returns the stale module.
 */
export async function readLegacyServersFile(filePath) {
	if (!existsSync(filePath)) {
		throw new Error(`No file at ${filePath}`);
	}
	const url = `${pathToFileURL(filePath).href}?t=${Date.now()}`;
	const mod = await import(url);
	const list = mod.SERVERS_TO_QUERY;
	if (!Array.isArray(list)) {
		throw new Error("That file doesn't export a SERVERS_TO_QUERY array.");
	}
	return list;
}

/** Preview what importing a legacy servers.js would do, without writing. */
export async function previewLegacyImport(filePath) {
	const candidates = await readLegacyServersFile(filePath);
	const { ready, needsAttention, rejected } = review(candidates);
	return {
		source: filePath,
		found: candidates.length,
		ready: ready.map((e) => e.name),
		needsAttention,
		rejected,
		servers: ready,
	};
}

/** Import a legacy servers.js, optionally limited to a chosen subset. */
export async function importLegacyServers(filePath, onlyNames = null) {
	const preview = await previewLegacyImport(filePath);
	const chosen = onlyNames
		? preview.servers.filter((s) => onlyNames.includes(s.name))
		: preview.servers;

	const added = await addMany(
		chosen.map((s) => ({ ...s, source: "imported" })),
	);

	return {
		imported: added.map((s) => s.name),
		skipped: preview.rejected,
		needsAttention: preview.needsAttention,
	};
}

// Marker files that identify what a folder actually contains. Deliberately
// conservative — a scan produces suggestions for a human to confirm, never a
// committed guess.
const SIGNATURES = [
	{ type: "ark", match: ["ShooterGame"], label: "ARK" },
	{ type: "conan", match: ["ConanSandbox"], label: "Conan Exiles" },
	{ type: "valheim", match: ["valheim_server.exe"], label: "Valheim" },
	{ type: "enshrouded", match: ["enshrouded_server.exe"], label: "Enshrouded" },
	{ type: "minecraft", match: ["variables.txt", "server.properties"], label: "Minecraft" },
	{ type: "Palword", match: ["PalServer.exe"], label: "Palworld" },
	{ type: "rust", match: ["RustDedicated.exe"], label: "Rust" },
	{ type: "7days", match: ["7DaysToDieServer.exe"], label: "7 Days to Die" },
	{ type: "subsistence", match: ["Subsistence.exe"], label: "Subsistence" },
];

/**
 * Scan a folder one level deep and suggest what each subfolder looks like.
 * Returns drafts for a human to confirm — never adds anything.
 */
export async function scanServersRoot(rootDir) {
	if (!existsSync(rootDir)) throw new Error(`No folder at ${rootDir}`);

	const entries = await fs.readdir(rootDir, { withFileTypes: true });
	const known = new Set(
		allServers()
			.map((s) => (s.workingDir || s.installDir || "").replace(/\\+$/, "").toLowerCase())
			.filter(Boolean),
	);

	const drafts = [];
	for (const dirent of entries) {
		if (!dirent.isDirectory()) continue;
		const dir = path.join(rootDir, dirent.name);
		const contents = new Set(
			(await fs.readdir(dir).catch(() => [])).map((f) => f.toLowerCase()),
		);

		const hit = SIGNATURES.find((sig) =>
			sig.match.some((m) => contents.has(m.toLowerCase())),
		);
		if (!hit) continue;

		drafts.push({
			name: dirent.name,
			type: hit.type,
			gameLabel: hit.label,
			workingDir: dir,
			installDir: dir,
			alreadyManaged: known.has(dir.toLowerCase()),
		});
	}

	return { root: rootDir, drafts };
}

import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getConfig } from "../config/configStore.js";
import { all as allServers, add as addServer, remove as removeFromStore } from "../data/serverStore.js";
import { templateOfServer, suggestParams, validateNewServer, slugify } from "./serverCreationService.js";
import { assertStorageHeadroom } from "./storageService.js";
import { planRemoval, writeMarker, MARKER_FILE } from "./serverRemoval.js";
import { applyPorts, describePorts } from "./serverPorts.js";
import { isFullyStopped } from "./serverState.js";
import { logActivity } from "./activityLog.js";
import { broadcastSseEvent } from "./sseHub.js";

// Cloning a server: a second copy of a server the panel made, with its own name,
// folder, ports and RCON password, ready to start. The whole install folder is
// copied (world included), so it takes as long as copying the game takes.
//
// Only servers the panel created, in a folder of their own, are cloned: for a
// server it imported, the panel doesn't know which files make up the game.

export class CloneError extends Error {
	constructor(message, code, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

const jobs = new Map();
export const getCloneJob = (id) => jobs.get(id) ?? null;

const progress = (job, patch) => {
	Object.assign(job, patch);
	broadcastSseEvent({ type: "clone_progress", jobId: job.id, ...job }, (c) => c.role === "admin");
};

async function dirSize(dir) {
	let total = 0;
	const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) total += await dirSize(full);
		else if (entry.isFile()) total += (await fs.stat(full).catch(() => ({ size: 0 }))).size;
	}
	return total;
}

function robocopy(from, to) {
	return new Promise((resolve, reject) => {
		// /E all subfolders, /COPY:DAT data+attributes+times, no retries to speak of, quiet.
		// Exit codes below 8 are success (they say what was copied).
		execFile(
			"robocopy",
			[from, to, "/E", "/COPY:DAT", "/DCOPY:DAT", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/XF", MARKER_FILE],
			{ windowsHide: true, maxBuffer: 16 * 1024 * 1024, timeout: 6 * 60 * 60 * 1000 },
			(error) => {
				const code = error?.code ?? 0;
				if (typeof code === "number" && code >= 8) return reject(new Error(`Copying the files failed (robocopy exit ${code}).`));
				resolve();
			},
		);
	});
}

/** Replace `from` with `to` in every string of a value, ignoring letter case. */
function rewriteStrings(value, pairs) {
	if (typeof value === "string") {
		let out = value;
		for (const [from, to] of pairs) {
			if (!from) continue;
			out = out.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), () => to);
		}
		return out;
	}
	if (Array.isArray(value)) return value.map((v) => rewriteStrings(v, pairs));
	if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewriteStrings(v, pairs)]));
	return value;
}

const TEXT_FILE = /\.(ini|json|xml|properties|cfg|conf|txt|bat|cmd|ya?ml)$/i;

/** The given files and the small text files in the same folders (not subfolders). */
async function withNeighbours(files) {
	const found = new Set(files);
	for (const dir of new Set(files.map((f) => path.dirname(f)))) {
		for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
			if (!entry.isFile() || !TEXT_FILE.test(entry.name)) continue;
			const full = path.join(dir, entry.name);
			if ((await fs.stat(full).catch(() => ({ size: Infinity }))).size < 1024 * 1024) found.add(full);
		}
	}
	return [...found];
}

const randomPassword = () => crypto.randomBytes(12).toString("base64url");

/** Everything that can be checked before any copying starts. */
export async function planClone(source, newName, wantedPorts = null) {
	const name = String(newName ?? "").trim();
	if (!name) throw new CloneError("Give the new server a name.", "no_name");
	if (allServers().some((s) => s.name.toLowerCase() === name.toLowerCase())) throw new CloneError(`A server named "${name}" already exists.`, "name_taken");

	const template = templateOfServer(source);
	if (!template) throw new CloneError("The panel doesn't know this game, so it can't clone it.", "unknown_game");
	if (template.sharedInstall) throw new CloneError("This game's servers share one install. To add another, create a new server from the template instead.", "shared_install");
	const removal = planRemoval(source);
	if (!removal.canDeleteFiles || removal.mode !== "folder") {
		throw new CloneError("Only a server the panel created, in a folder of its own, can be cloned. " + (removal.reason ?? ""), "not_clonable");
	}
	if (!(await isFullyStopped(source))) throw new CloneError("Stop the server first, so its files are copied in one piece.", "server_running", 409);

	// Ports for the copy: the next free ones, for every port the game has.
	const suggested = await suggestParams(template.id);
	const ports = {};
	for (const def of template.ports) ports[def.key] = Number.isInteger(wantedPorts?.[def.key]) ? wantedPorts[def.key] : suggested.ports[def.key];
	await validateNewServer(template, name, ports, null);

	const dest = path.win32.join(getConfig().paths.serversRoot, slugify(name));
	if (await fs.stat(dest).then(() => true, () => false)) throw new CloneError(`The folder ${dest} already exists.`, "folder_exists");

	const bytes = await dirSize(source.installDir);
	try {
		assertStorageHeadroom(bytes, dest);
	} catch (err) {
		throw new CloneError(err.message, err.code ?? "disk_full", 507);
	}
	return { template, name, ports, dest, bytes };
}

/** Start cloning. Returns the job straight away; it finishes in the background. */
export async function startClone(source, newName, { sessionName, ports } = {}) {
	const plan = await planClone(source, newName, ports);
	const job = { id: crypto.randomUUID(), status: "copying", name: plan.name, from: source.name, bytes: plan.bytes, ports: plan.ports, error: null, finishedAt: null };
	jobs.set(job.id, job);
	progress(job, {});
	run(job, source, plan, { sessionName }).catch((err) => console.error("[clone] unexpected:", err));
	return job;
}

async function run(job, source, plan, { sessionName }) {
	const { name, dest, ports, template } = plan;
	const sourceDir = source.installDir.replace(/[\\/]+$/, "");
	let registered = false;
	try {
		await fs.mkdir(dest, { recursive: true });
		await robocopy(sourceDir, dest);
		progress(job, { status: "configuring" });

		// The same entry, pointed at the copy, under its own name and RCON password.
		const newRcon = source.rconPassword ? randomPassword() : null;
		const pairs = [
			[sourceDir, dest],
			...(source.rconPassword ? [[source.rconPassword, newRcon]] : []),
			[`"${source.name}"`, `"${name}"`], // the window title in start scripts
			...(sessionName && source.sessionName && sessionName !== source.sessionName ? [[source.sessionName, sessionName]] : []),
		];
		const { id: _id, createdAt: _created, ...rest } = source;
		const entry = { ...rewriteStrings(rest, pairs), name, source: "created", autoUpdate: false, ...(sessionName ? { sessionName } : {}) };
		await writeMarker(dest, entry);

		// Text files that carry the old name, password or path: the start script and the
		// game's settings, including their neighbours (Conan keeps its RCON password in
		// Game.ini, beside the ServerSettings.ini the panel records).
		const named = [entry.startScriptPath, ...(entry.configPaths ? Object.values(entry.configPaths) : []), entry.configPath].filter(Boolean);
		const texts = await withNeighbours(named);
		for (const file of texts) {
			try {
				const text = await fs.readFile(file, "utf8");
				const next = rewriteStrings(text, pairs);
				// Written directly, with no .bak: a backup copy would carry the original's RCON password.
				if (next !== text) await fs.writeFile(file, next, "utf8");
			} catch {
				// A file that isn't there yet (created on first run) has nothing to fix.
			}
		}

		await addServer(entry);
		registered = true;

		// Its own ports, in the start script, the game's settings and the record.
		const current = allServers().find((s) => s.name === name);
		const { current: have } = await describePorts(current);
		const wanted = {};
		for (const [key, value] of Object.entries(ports)) if (have[key] !== undefined && have[key] !== value) wanted[key] = value;
		const result = Object.keys(wanted).length > 0 ? await applyPorts(current, wanted) : { warnings: [] };

		progress(job, { status: "done", finishedAt: new Date().toISOString(), warnings: result.warnings ?? [] });
		logActivity({ type: "server.cloned", server: name, message: `Cloned ${source.name} as ${name}.`, data: { from: source.name } });
	} catch (err) {
		// Leave nothing half-made behind.
		if (registered) await removeFromStore(name).catch(() => {});
		await fs.rm(dest, { recursive: true, force: true }).catch(() => {});
		progress(job, { status: "failed", error: err.message, finishedAt: new Date().toISOString() });
		logActivity({ type: "server.clone_failed", server: source.name, level: "error", message: `Cloning ${source.name} as ${name} failed: ${err.message}` });
	}
}

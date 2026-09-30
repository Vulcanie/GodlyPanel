import dgram from "node:dgram";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { update as updateServer } from "../data/serverStore.js";
import { getConfig } from "../config/configStore.js";
import { readManagedFile, writeManagedFile } from "../util/managedFiles.js";
import { usedPorts, impliedPortsFor, templateOfServer } from "./serverCreationService.js";
import { implicitPortsOf, usageOf } from "../data/portRules.js";

// Changing a server's ports means changing them everywhere the server has them,
// together, or it ends up half-moved: the panel's record (which it polls), the
// start script (which is what actually launches the game on a port), and
// often a game config file. Missing any one gives a server that starts but that
// the panel, or the players, can't reach.

export const PORT_LABELS = {
	port: "Game port",
	queryPort: "Query port",
	rconPort: "RCON port",
	telnetPort: "Telnet port",
};
const KEYS = Object.keys(PORT_LABELS);

// The launch-line flags that carry each port. -publicport follows the game port
// (Palworld passes the same number twice).
const SCRIPT_FLAGS = {
	port: ["port", "publicport", "serverport"],
	queryPort: ["queryport"],
	rconPort: ["rconport"],
};

const flagPattern = (key, value) =>
	new RegExp(`((?:^|\\s)-(?:${SCRIPT_FLAGS[key].join("|")})(?:=|\\s+))${value}(?!\\d)`, "gim");

/** Ports a start script sets, for the games whose entry doesn't record them (ARK). */
function detectFromScript(text) {
	const found = {};
	for (const key of Object.keys(SCRIPT_FLAGS)) {
		const match = text.match(new RegExp(`(?:^|\\s)-(?:${SCRIPT_FLAGS[key].join("|")})(?:=|\\s+)(\\d+)`, "im"));
		if (match) found[key] = Number(match[1]);
	}
	return found;
}

// Where else, besides the launch line, a game keeps its ports. The value found
// must match the old port for it to be replaced, so an unexpected file is left alone.
const CONFIG_BINDINGS = {
	minecraft: [
		{ key: "port", pattern: /^(server-port\s*=\s*)(\d+)/m },
		{ key: "port", pattern: /^(query\.port\s*=\s*)(\d+)/m },
		{ key: "rconPort", pattern: /^(rcon\.port\s*=\s*)(\d+)/m },
	],
	// Conan's RCON settings are in Game.ini, next to the ServerSettings.ini the panel
	// records as its settings file (found on a real install: ServerSettings.ini has no
	// RconPort, so changing it there did nothing and the game kept the old one).
	conan: [{ key: "rconPort", file: "Game.ini", pattern: /^(RconPort\s*=\s*)(\d+)/im }],
	"7days": [{ key: "port", pattern: /(<property\s+name="ServerPort"\s+value=")(\d+)/i }],
	enshrouded: [{ key: "port", pattern: /("queryPort"\s*:\s*)(\d+)/ }],
	Palword: [
		{ key: "rconPort", pattern: /(RCONPort\s*=\s*)(\d+)/ },
		{ key: "port", pattern: /(PublicPort\s*=\s*)(\d+)/ },
	],
};

const templateFor = (server) => templateOfServer(server);

async function scriptText(server) {
	if (!server.startScriptPath) return null;
	try {
		return await fs.promises.readFile(server.startScriptPath, "utf8");
	} catch {
		return null;
	}
}

/** Every port this server has, wherever it is recorded. */
export async function describePorts(server) {
	const text = await scriptText(server);
	const fromScript = text ? detectFromScript(text) : {};
	const current = {};
	for (const key of KEYS) {
		const value = server[key] ?? fromScript[key];
		if (Number.isInteger(value)) current[key] = value;
	}
	const template = templateFor(server);
	return {
		current,
		gameName: template?.displayName ?? null,
		implicit: implicitPortsOf(template).map(({ offset, label, precaution }) => ({ offset, label, precaution })),
		panelPort: Number(process.env.GHP_PORT) || getConfig().http.port,
		// Only a server the panel created has files it is allowed to rewrite.
		canEditFiles: server.source === "created",
	};
}

const tcpFree = (port) =>
	new Promise((resolve) => {
		const s = net.createServer();
		s.once("error", (e) => resolve(e.code !== "EADDRINUSE"));
		s.once("listening", () => s.close(() => resolve(true)));
		s.listen(port, "0.0.0.0");
	});

const udpFree = (port) =>
	new Promise((resolve) => {
		const s = dgram.createSocket("udp4");
		s.once("error", (e) => {
			try { s.close(); } catch {}
			resolve(e.code !== "EADDRINUSE");
		});
		s.bind(port, "0.0.0.0", () => s.close(() => resolve(true)));
	});

/**
 * Whether these ports can be used, checked against everything that could clash:
 * this server's own other ports, the ports the game takes for itself, every
 * other server (including theirs), the panel's own port, ports reserved in
 * Settings, and, as a warning, anything on this PC listening right now.
 *
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[], changes: Record<string,{from:number,to:number}>, current: object }>}
 */
export async function checkPorts(server, proposed) {
	const errors = [];
	const warnings = [];
	const { current, panelPort } = await describePorts(server);
	const template = templateFor(server);

	const changes = {};
	for (const [key, raw] of Object.entries(proposed ?? {})) {
		if (!KEYS.includes(key) || !(key in current)) {
			errors.push(`This server has no ${PORT_LABELS[key]?.toLowerCase() ?? key}.`);
			continue;
		}
		const to = Number(raw);
		if (!Number.isInteger(to) || to < 1024 || to > 65535) {
			errors.push(`${PORT_LABELS[key]} must be a whole number from 1024 to 65535.`);
			continue;
		}
		if (to !== current[key]) changes[key] = { from: current[key], to };
	}
	if (errors.length > 0 || Object.keys(changes).length === 0) {
		return { ok: errors.length === 0, errors, warnings, changes, current };
	}

	const final = { ...current, ...Object.fromEntries(Object.entries(changes).map(([k, c]) => [k, c.to])) };

	// This server's own ports against each other.
	const byValue = new Map();
	for (const [key, value] of Object.entries(final)) {
		if (byValue.has(value)) {
			errors.push(`${PORT_LABELS[byValue.get(value)]} and ${PORT_LABELS[key].toLowerCase()} are both ${value}. Each needs its own port.`);
		}
		byValue.set(value, key);
	}

	// The panel's own port.
	for (const [key, { to }] of Object.entries(changes)) {
		if (to === panelPort) errors.push(`${to} is the port GodlyPanel itself uses, so ${PORT_LABELS[key].toLowerCase()} can't be ${to}.`);
	}

	// Ports the game takes for itself, next to the game port.
	const implied = impliedPortsFor(template, final);
	const gameName = template?.displayName ?? "This game";
	for (const item of implied) {
		const clash = Object.entries(final).find(([key, v]) => key !== "port" && v === item.port);
		if (clash) {
			errors.push(`${PORT_LABELS[clash[0]]} ${item.port} is the game port + ${item.offset}, which ${usageOf(gameName, item)}. Choose another.`);
		}
	}

	// Every other server, including the ports they take for themselves.
	const used = await usedPorts(template?.sharedInstall ? server.installDir?.replace(/\\$/, "") : undefined, {
		excludeName: server.name,
		excludeScript: server.startScriptPath,
	});
	const claimed = [...Object.entries(changes).map(([k, c]) => [PORT_LABELS[k], c.to]), ...(changes.port ? implied.map((i) => [`${gameName}'s ${i.precaution ? "companion port" : i.label}`, i.port]) : [])];
	for (const [what, value] of claimed) {
		if (used.has(value)) errors.push(`${what} ${value} is already used by another server.`);
	}

	const reserved = new Set(getConfig().portAllocation.reservedPorts);
	for (const [key, { to }] of Object.entries(changes)) {
		if (reserved.has(to)) errors.push(`${to} is on the reserved list in Settings, so ${PORT_LABELS[key].toLowerCase()} can't use it.`);
	}

	// Something on this PC listening right now is a warning, not a block: which
	// protocol matters depends on the game, and it may just be a leftover.
	if (errors.length === 0) {
		for (const { to } of Object.values(changes)) {
			const [tcp, udp] = await Promise.all([tcpFree(to), udpFree(to)]);
			if (!tcp || !udp) warnings.push(`Something on this PC is already using port ${to} (${!tcp ? "TCP" : "UDP"}) right now. If it isn't this server, choose another.`);
		}
	}

	return { ok: errors.length === 0, errors, warnings, changes, current };
}

/**
 * Apply a port change: files first (script, then game config), then the panel's
 * record. Everything is read before anything is written, so a file that can't be
 * read stops the change before it half-happens.
 */
export async function applyPorts(server, proposed) {
	const check = await checkPorts(server, proposed);
	if (!check.ok) {
		const err = new Error(check.errors.join(" "));
		err.code = "port_conflict";
		throw err;
	}
	const { changes } = check;
	if (Object.keys(changes).length === 0) return { changes, filesChanged: [], warnings: ["Nothing changed."] };

	const warnings = [...check.warnings];
	const filesChanged = [];
	const patch = {};
	const applied = new Set();

	if (server.source === "created") {
		const writes = [];

		// The start script, and the panel's own copy of the launch line.
		let script = server.startScriptPath ? await scriptText(server) : null;
		let scriptNext = script;
		let launchArgs = server.launch?.args;
		for (const [key, { from, to }] of Object.entries(changes)) {
			if (!SCRIPT_FLAGS[key]) continue;
			if (scriptNext !== null) {
				const re = flagPattern(key, from);
				if (re.test(scriptNext)) {
					scriptNext = scriptNext.replace(flagPattern(key, from), (_, prefix) => `${prefix}${to}`);
					applied.add(key);
				}
			}
			if (typeof launchArgs === "string") launchArgs = launchArgs.replace(flagPattern(key, from), (_, prefix) => `${prefix}${to}`);
		}
		if (script !== null && scriptNext !== script) writes.push({ file: server.startScriptPath, content: scriptNext });
		if (typeof launchArgs === "string" && launchArgs !== server.launch.args) patch.launch = { ...server.launch, args: launchArgs };

		// The game's own config file.
		// A binding may name a sibling file (same folder as the recorded settings file).
		const configFile = server.configPath;
		const bindings = (CONFIG_BINDINGS[server.type] ?? []).filter((b) => changes[b.key]);
		const byFile = new Map();
		for (const binding of bindings) {
			if (!configFile) break;
			const target = binding.file ? path.join(path.dirname(configFile), binding.file) : configFile;
			byFile.set(target, [...(byFile.get(target) ?? []), binding]);
		}
		for (const [target, list] of byFile) {
			let text = null;
			try {
				text = await readManagedFile(target);
			} catch {
				warnings.push(`${path.basename(target)} doesn't exist yet (the game may create it the first time the server runs), so the ports in it were not changed.`);
			}
			if (text === null) continue;
			let next = text;
			for (const { key, pattern } of list) {
				const change = changes[key];
				next = next.replace(pattern, (whole, prefix, digits) => {
					if (Number(digits) !== change.from) return whole;
					applied.add(key);
					return `${prefix}${change.to}`;
				});
			}
			if (next !== text) writes.push({ file: target, content: next });
		}

		for (const { file, content } of writes) {
			await writeManagedFile(file, content, "ports change");
			filesChanged.push(file);
		}
		for (const [key, { from }] of Object.entries(changes)) {
			if (!applied.has(key) && key !== "telnetPort") {
				warnings.push(`${PORT_LABELS[key]} ${from} wasn't found in this server's files, so only the panel's record was changed. Check the game's own settings.`);
			}
		}
	} else {
		warnings.push("This server was imported, so only the panel's record of its ports was changed. Its own start script and settings weren't touched; change the ports there too, or the game will keep using the old ones.");
	}

	// The panel's record, for the ports it stores.
	for (const [key, { to }] of Object.entries(changes)) {
		if (key in server) patch[key] = to;
	}
	if (Object.keys(patch).length > 0) await updateServer(server.name, patch);

	return { changes, filesChanged, warnings };
}

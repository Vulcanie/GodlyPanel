import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { all as allServers, update as updateServer } from "../data/serverStore.js";
import { isFullyStopped } from "./serverState.js";
import { logActivity } from "./activityLog.js";

// Replacing a server's RCON password with a fresh one, everywhere the game and the panel keep it.
//
// The password lives in the panel's record AND in the game's own files (a start script's
// -ServerAdminPassword=, a server.properties, a Game.ini...), and a running game keeps the one it started
// with. So this only runs on a stopped server, changes every place together, and puts everything back if any
// step fails.
//
// Servers that share a start script folder often share a password and some of the files too (ARK maps in one
// install all read one GameUserSettings.ini). Those can't each get their own: the shared file holds one
// value. So servers that have the same password and share any file are rotated together, to one new password.
// Servers that merely have the same password but no file in common are left alone; rotate them on their own.

export class RotationError extends Error {
	constructor(message, code, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

const TEXT_FILE = /\.(ini|json|xml|properties|cfg|conf|txt|bat|cmd|ya?ml)$/i;
const MAX_TEXT_BYTES = 1024 * 1024;
// Below this a "password" could be a common word that appears in files for other reasons, so it is only
// replaced in the exact files the panel knows hold it.
const MIN_SWEEP_LENGTH = 8;
// Game-owned history files that record what was typed, passwords included. Scrubbed rather than updated.
const HISTORY_FILE = /^ConsoleHistory\.ini$/i;
const SKIP_DIRS = /^(steamapps|Binaries|Content|Engine|node_modules|mods|world|libraries|backups?|logs?|crash-reports|SaveGames)$/i;

const norm = (p) => path.resolve(p).toLowerCase();
export const newRconPassword = () => crypto.randomBytes(24).toString("base64url");

const scriptOf = (s) => s.startScriptPath || null;
const configsOf = (s) => [s.configPath, ...Object.values(s.configPaths ?? {})].filter((p) => typeof p === "string" && p);

/** The servers that must change password together with `server`: same password, and files in common. */
export function rotationGroup(server, servers = allServers()) {
	const same = servers.filter((s) => s.rconPassword && s.rconPassword === server.rconPassword);
	const filesOf = (s) => [scriptOf(s), ...configsOf(s)].filter(Boolean).map(norm);
	const group = new Set([server.name]);
	let grew = true;
	while (grew) {
		grew = false;
		const held = new Set([...group].flatMap((n) => filesOf(same.find((s) => s.name === n))));
		for (const s of same) {
			if (group.has(s.name)) continue;
			if (filesOf(s).some((f) => held.has(f))) {
				group.add(s.name);
				grew = true;
			}
		}
	}
	return same.filter((s) => group.has(s.name));
}

function replaceAll(text, from, to) {
	return text.split(from).join(to);
}

/** Replace `from` in every string of a value (the panel's record of a server). */
function rewrite(value, from, to) {
	if (typeof value === "string") return replaceAll(value, from, to);
	if (Array.isArray(value)) return value.map((v) => rewrite(v, from, to));
	if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v, from, to)]));
	return value;
}

async function readText(file) {
	try {
		const stat = await fs.stat(file);
		if (!stat.isFile() || stat.size > MAX_TEXT_BYTES) return null;
		return await fs.readFile(file, "utf8");
	} catch {
		return null;
	}
}

async function textFilesIn(dir) {
	const out = [];
	for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
		if (entry.isFile() && TEXT_FILE.test(entry.name)) out.push(path.join(dir, entry.name));
	}
	return out;
}

/** What would be touched, without touching anything. */
async function plan(server) {
	const old = server.rconPassword;
	if (!old) throw new RotationError("This server has no RCON password recorded, so there is nothing to rotate.", "no_password");
	const group = rotationGroup(server);

	// Files that are named by the record: always edited.
	const exact = new Set();
	for (const s of group) {
		if (scriptOf(s)) exact.add(scriptOf(s));
		for (const c of configsOf(s)) exact.add(c);
	}
	// Beside a config file (Conan keeps its RCON password in Game.ini next to ServerSettings.ini): edited
	// when the password is long enough to be unmistakable. One folder up, only the game's history file.
	const beside = new Set();
	const history = new Set();
	for (const s of group) {
		for (const c of configsOf(s)) {
			const dir = path.dirname(c);
			if (old.length >= MIN_SWEEP_LENGTH) for (const f of await textFilesIn(dir)) beside.add(f);
			for (const f of await textFilesIn(path.dirname(dir))) if (HISTORY_FILE.test(path.basename(f))) history.add(f);
		}
	}
	return { old, group, exact: [...exact], beside: [...beside], history: [...history] };
}

/** Files under the servers' folders that still hold `old`, for reporting what couldn't be changed. */
async function findRemaining(group, old, depth = 0, dirs = null) {
	const roots = dirs ?? [...new Set(group.flatMap((s) => [s.installDir, s.startScriptPath && path.dirname(s.startScriptPath)]).filter(Boolean).map((d) => path.resolve(d)))];
	const found = [];
	for (const dir of roots) {
		for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (depth < 7 && !SKIP_DIRS.test(entry.name)) found.push(...(await findRemaining(group, old, depth + 1, [full])));
			} else if (TEXT_FILE.test(entry.name)) {
				const text = await readText(full);
				if (text?.includes(old)) found.push(full);
			}
		}
	}
	return [...new Set(found)];
}

/**
 * Describe what rotating would do (for a confirmation), without changing anything.
 * @returns {{servers: string[], files: string[]}}
 */
export async function describeRotation(server) {
	const p = await plan(server);
	const files = [];
	for (const f of [...p.exact, ...p.beside, ...p.history]) {
		const text = await readText(f);
		if (text?.includes(p.old)) files.push(f);
	}
	return { servers: p.group.map((s) => s.name), files };
}

/**
 * Give `server` (and any servers that share its files) a new RCON password.
 * @returns {{servers: string[], changed: string[], scrubbed: string[], remaining: string[]}}
 */
export async function rotateRconPassword(server) {
	const p = await plan(server);

	const running = [];
	for (const s of p.group) if (!(await isFullyStopped(s))) running.push(s.name);
	if (running.length > 0) {
		const who = running.length === 1 ? running[0] : `these servers: ${running.join(", ")}`;
		throw new RotationError(`Stop ${who} first. A running game keeps the password it started with, so the panel would lose its connection.`, "server_running", 409);
	}

	const next = newRconPassword();
	const originals = new Map(); // file -> text before
	const written = [];
	const recordsChanged = []; // [name, the values it had]
	const changed = [];
	const scrubbed = [];

	try {
		for (const file of new Set([...p.exact, ...p.beside, ...p.history])) {
			const text = await readText(file);
			if (text === null || !text.includes(p.old)) continue;
			const isHistory = p.history.includes(file) && !p.exact.includes(file) && !p.beside.includes(file);
			originals.set(file, text);
			// Written directly, with no .bak: a backup copy would keep the password that is being retired.
			await fs.writeFile(file, replaceAll(text, p.old, isHistory ? "[rotated]" : next), "utf8");
			written.push(file);
			(isHistory ? scrubbed : changed).push(file);
		}

		// What the files now say has to be the new password and no longer the old one, before the panel agrees.
		for (const file of changed) {
			const text = await readText(file);
			if (text === null || text.includes(p.old) || !text.includes(next)) throw new Error(`${path.basename(file)} didn't take the change.`);
		}

		// The panel's own record, last: if anything above failed it still holds the old, working password.
		for (const s of p.group) {
			const record = rewrite({ ...s }, p.old, next);
			const patch = {};
			const undo = {};
			for (const key of Object.keys(record)) {
				if (JSON.stringify(record[key]) === JSON.stringify(s[key])) continue;
				patch[key] = record[key];
				undo[key] = s[key];
			}
			await updateServer(s.name, patch);
			recordsChanged.push([s.name, undo]);
		}
	} catch (err) {
		for (const file of written) await fs.writeFile(file, originals.get(file), "utf8").catch(() => {});
		for (const [name, undo] of recordsChanged) await updateServer(name, undo).catch(() => {});
		throw new RotationError(`The password was not changed (${err.message}). Everything was put back.`, "rotation_failed", 500);
	}

	const remaining = await findRemaining(p.group, p.old);
	const names = p.group.map((s) => s.name);
	logActivity({
		type: "server.rcon_rotated",
		server: server.name,
		message: `The RCON password was changed for ${names.join(", ")}.`,
		level: remaining.length ? "warn" : "info",
		data: { servers: names, files: changed.length, remaining: remaining.length },
	});
	return { servers: names, changed, scrubbed, remaining };
}

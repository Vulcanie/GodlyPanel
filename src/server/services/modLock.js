import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../paths.js";
import { writeJsonAtomic, readJson, createWriteQueue } from "../util/atomicJson.js";

// The mod lock: for each server, a record of the mods the panel installed into its mods folder, which files each one put there,
// and their SHA-256 hashes. It lets the panel say later whether a file was changed or removed by hand, and which files it did not
// put there at all.
//
// The record lives in the panel's own data folder, not beside the mods. A game's folders are its own, and the panel's allowed-roots
// checks apply to them, so a file of ours in there would be in the way. The file name is a hash of the server's name, so a name like
// "../x" can never become a path.
//
// Entries refer to each other by id, so a dependency's record says which mods it was installed for. Nothing here removes a mod: a
// dependency whose parents are all gone is only listed as an orphan, for the person to decide.

const SCHEMA = 1;
const MAX_NAMES = 50;
const MAX_FILES = 5000;
const DISABLED = ".disabled";
const SHA256 = /^[0-9a-f]{64}$/;

const enqueue = createWriteQueue();

/** Where a server's lock file is. The name is hashed, so whatever the server is called, the file stays in the modlocks folder. */
export function lockFileOf(serverName) {
	const key = crypto.createHash("sha256").update(String(serverName)).digest("hex").slice(0, 24);
	return path.join(paths.dataDir, "modlocks", `${key}.json`);
}

// A mod that is turned off has ".disabled" added to its name, and that is the same mod.
const normalizeName = (name) => (name.endsWith(DISABLED) ? name.slice(0, -DISABLED.length) : name);
const topOf = (rel) => rel.split("/")[0];

// One name in the mods folder: a plain file or folder name, never a path.
function safeName(name) {
	return typeof name === "string" && name.length >= 1 && name.length <= 260 && !name.startsWith(".") && !/[\\/\0]/.test(name);
}

/** True when a name is one plain name in the mods folder. Anything that could be joined onto the folder to reach outside it is false. */
export { safeName as isSafeName };

// A path inside the mods folder, written with forward slashes. Every part has to be a safe name.
function safePath(rel) {
	return typeof rel === "string" && rel !== "" && rel.split("/").every(safeName);
}

/** An entry's id for a mod: its source and ref, with any "@version" pin taken off, except for a direct link, which is its whole address. */
export function idOf(source, ref) {
	if (source === "url") return `url:${ref}`;
	const at = ref.indexOf("@");
	return `${source}:${at === -1 ? ref : ref.slice(0, at)}`;
}

/** The id of a parent given as "source:ref", the form the installer reports dependencies in. */
export function idOfKey(key) {
	const at = key.indexOf(":");
	if (at === -1) return key;
	return idOf(key.slice(0, at), key.slice(at + 1));
}

// Checks an entry before it is stored. Anything wrong throws, so the install that wanted it can take its files back out.
function normalize(entry) {
	if (!entry || typeof entry !== "object") throw new TypeError("A lock entry must be an object.");
	if (typeof entry.id !== "string" || entry.id === "" || entry.id.length > 600) throw new TypeError("A lock entry needs an id.");
	if (typeof entry.source !== "string" || typeof entry.ref !== "string") throw new TypeError("A lock entry needs a source and a ref.");
	if (!Array.isArray(entry.names) || entry.names.length > MAX_NAMES || !entry.names.every(safeName)) {
		throw new TypeError(`A lock entry names up to ${MAX_NAMES} files or folders in the mods folder.`);
	}
	if (!Array.isArray(entry.files) || entry.files.length > MAX_FILES) throw new TypeError(`A lock entry holds up to ${MAX_FILES} files.`);
	for (const f of entry.files) {
		if (!f || typeof f !== "object" || !safePath(f.path) || typeof f.sha256 !== "string" || !SHA256.test(f.sha256)) {
			throw new TypeError("A lock entry's file needs a safe path and a SHA-256 hash.");
		}
	}
	return {
		id: entry.id,
		source: entry.source,
		ref: entry.ref,
		version: typeof entry.version === "string" ? entry.version : "",
		side: typeof entry.side === "string" ? entry.side : "both",
		names: [...entry.names],
		files: entry.files.map((f) => ({ path: f.path, sha256: f.sha256 })),
		dependencyOf: Array.isArray(entry.dependencyOf) ? entry.dependencyOf.filter((p) => typeof p === "string") : [],
		installedAt: typeof entry.installedAt === "string" ? entry.installedAt : new Date().toISOString(),
	};
}

// A stored entry that doesn't have an id is damage, not a record, so it is skipped rather than acted on.
const isEntry = (m) => m !== null && typeof m === "object" && typeof m.id === "string";

/** The server's record: { mods: [...] }. A missing or damaged file reads as no mods. Never throws. */
export async function read(serverName) {
	try {
		const stored = await readJson(lockFileOf(serverName), null);
		return { mods: stored && Array.isArray(stored.mods) ? stored.mods.filter(isEntry) : [] };
	} catch {
		return { mods: [] };
	}
}

// Read, change, write, all in the queue, so two installs can't overwrite each other's record. The change returns the new list, or
// null when nothing changed, and then nothing is written.
function mutate(serverName, change) {
	return enqueue(async () => {
		const { mods } = await read(serverName);
		const next = change(mods);
		if (next !== null) await writeJsonAtomic(lockFileOf(serverName), { schema: SCHEMA, mods: next });
	});
}

/** Records a mod. An entry with the same id is replaced. */
export async function add(serverName, entry) {
	const next = normalize(entry);
	await mutate(serverName, (mods) => [...mods.filter((m) => m.id !== next.id), next]);
}

/** Takes a name out of the record: a mod that was removed from the folder. An entry whose last name goes is dropped. */
export async function forgetName(serverName, name) {
	const target = normalizeName(String(name));
	await mutate(serverName, (mods) => {
		let touched = false;
		const next = [];
		for (const m of mods) {
			const names = m.names.filter((n) => normalizeName(n) !== target);
			if (names.length === m.names.length) {
				next.push(m);
				continue;
			}
			touched = true;
			if (names.length > 0) {
				const files = m.files.filter((f) => normalizeName(topOf(f.path)) !== target);
				next.push({ ...m, names, files });
			}
		}
		return touched ? next : null;
	});
}

/** Drops an entry by id, such as a mod the panel has just taken back out after a failed install. */
export async function remove(serverName, id) {
	await mutate(serverName, (mods) => {
		const next = mods.filter((m) => m.id !== id);
		return next.length === mods.length ? null : next;
	});
}

/**
 * Puts the record back exactly as an earlier read gave it, order included. Used when an update fails after the record has changed.
 * The entries are written as they were read, not checked again, so a damaged entry comes back damaged rather than vanishing.
 */
export async function restore(serverName, mods) {
	await mutate(serverName, () => mods.map((m) => ({ ...m })));
}

/** The SHA-256 of a file's bytes, read in chunks so a big mod never has to fit in memory. */
export async function hashFile(file) {
	const hash = crypto.createHash("sha256");
	for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
	return hash.digest("hex");
}

// Every regular file under one path. Symlinks are skipped: what they point at is not part of the mod, and following them could hash a
// file outside the mods folder.
async function collect(modsDir, full, files) {
	const stat = await fs.promises.lstat(full).catch(() => null);
	if (!stat || stat.isSymbolicLink()) return;
	if (stat.isFile()) {
		if (files.length >= MAX_FILES) throw Object.assign(new Error("This mod has more files than the lock will hold."), { code: "lock_too_big" });
		files.push({ path: path.relative(modsDir, full).split(path.sep).join("/"), sha256: await hashFile(full) });
		return;
	}
	if (!stat.isDirectory()) return;
	for (const entry of await fs.promises.readdir(full)) await collect(modsDir, path.join(full, entry), files);
}

/** The names among `names` that are in the mods folder now. A name the installer reports but that is not a folder entry is dropped. */
export async function presentNames(modsDir, names) {
	const out = [];
	for (const name of names) {
		if (safeName(name) && (await fs.promises.lstat(path.join(modsDir, name)).then(() => true, () => false))) out.push(name);
	}
	return out;
}

/** The files under each name, with their hashes, sorted by path. Relative to the mods folder, with forward slashes. */
export async function hashEntry(modsDir, names) {
	const files = [];
	for (const name of names) {
		if (safeName(name)) await collect(modsDir, path.join(modsDir, name), files);
	}
	return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

// Where a recorded file is now. A mod turned off is renamed with ".disabled", and the record still holds the name it was installed under.
async function onDisk(modsDir, rel) {
	const [top, ...rest] = rel.split("/");
	const exists = await fs.promises.lstat(path.join(modsDir, top)).then(() => true, () => false);
	return path.join(modsDir, exists ? top : `${top}${DISABLED}`, ...rest);
}

/**
 * How the mods folder differs from the record. `changed` is a recorded file whose bytes differ, `missing` one that is gone,
 * and `untracked` is a top-level name in the folder that no entry owns. A turned-off mod is compared under its own name.
 */
export async function diffAgainstDisk(serverName, modsDir) {
	const { mods } = await read(serverName);
	const changed = [];
	const missing = [];
	const owned = new Set();

	for (const m of mods) {
		for (const n of m.names) owned.add(normalizeName(n));
		for (const f of m.files) {
			if (!safePath(f.path)) {
				missing.push({ id: m.id, path: f.path });
				continue;
			}
			const full = await onDisk(modsDir, f.path);
			const stat = await fs.promises.lstat(full).catch(() => null);
			if (!stat) missing.push({ id: m.id, path: f.path });
			else if (!stat.isFile() || (await hashFile(full)) !== f.sha256) changed.push({ id: m.id, path: f.path });
		}
	}

	const untracked = [];
	const entries = await fs.promises.readdir(modsDir, { withFileTypes: true }).catch(() => []);
	for (const e of entries) {
		if (e.name.startsWith(".")) continue;
		if (!owned.has(normalizeName(e.name))) untracked.push(e.name);
	}
	return { changed, missing, untracked: untracked.sort() };
}

/**
 * The ids of dependencies whose parents are all gone from the record. Offered to the person to remove; never removed here.
 */
export async function orphans(serverName) {
	const { mods } = await read(serverName);
	const live = new Set(mods.map((m) => m.id));
	return mods.filter((m) => m.dependencyOf.length > 0 && m.dependencyOf.every((p) => !live.has(p))).map((m) => m.id);
}

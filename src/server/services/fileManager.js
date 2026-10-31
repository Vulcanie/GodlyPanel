import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../paths.js";
import { writeManagedFile } from "../util/managedFiles.js";
import { folderOf } from "./storageService.js";

// The file manager's path rules and file operations for one server's folder. A path the caller types is only ever joined onto that
// folder after it has passed resolveInside, and the rules are strict on purpose: a path that looks doubtful is refused, not guessed at.
// Nothing here is reachable yet; the routes and the screen come in later steps.

export class FileError extends Error {
	constructor(message, code, status = 400) {
		super(message);
		this.name = "FileError";
		this.code = code;
		this.status = status;
	}
}

const STATUS = {
	outside: 400,
	no_folder: 404,
	not_found: 404,
	exists: 409,
	protected: 403,
	binary: 415,
	too_big: 413,
	not_a_file: 400,
	not_a_dir: 400,
	bad_path: 400,
	parent_missing: 409,
	bad_trash_id: 400,
};
const fail = (code, message) => new FileError(message, code, STATUS[code]);

const OUTSIDE = "That path is outside this server's folder.";
const NOT_FOUND = "Nothing is there.";
const EXISTS = "Something is already there with that name.";
const PARENT_MISSING = "The folder it would go in doesn't exist.";
const NOT_A_FILE = "That isn't a file.";
const NOT_A_DIR = "That isn't a folder.";
const NOT_TEXT = "That file isn't text, so it can't be opened or changed here.";
const PROTECTED = "The panel keeps that item for itself, so it can't be changed here.";

const TRASH = ".godlypanel-trash";
const TRASH_META = "meta.json";
const SETTINGS_FILE = ".godlypanel-server.json";
const MAX_PATH = 1024;
const MAX_SEGMENT = 255;
const LIST_LIMIT = 5000;
const SNIFF_BYTES = 8 * 1024;
const MAX_READ = 2 * 1024 * 1024;
const MAX_WRITE = 2 * 1024 * 1024;
const WEEK_MS = 7 * 24 * 3600 * 1000;
const TRASH_ID = /^\d{13}-[0-9a-f]{6}$/;
// Windows reserves these names in every folder, with or without an extension, so a file called "nul.txt" is the NUL device.
const DEVICE_NAME = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const FORBIDDEN_CHARS = /[<>"|?*]/;

const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

// Resolved and lower case, with no trailing separator, so two spellings of one folder compare equal. Windows is case-blind.
const keyOf = (p) => path.resolve(p).toLowerCase().replace(/[\\/]+$/, "");

/**
 * True when `child` is `parent` or sits under it. Whole path segments are compared, so a sibling whose name only starts the same
 * ("ab" beside "a") is not inside.
 */
export function isWithinFolder(child, parent) {
	const c = keyOf(child);
	const p = keyOf(parent);
	return c === p || c.startsWith(p + path.sep);
}

/** The server's folder, as a real directory. Refused when it is, or is inside, or holds, the panel's own data folder. */
export function rootFor(server) {
	const folder = folderOf(server);
	let isFolder = false;
	try {
		isFolder = Boolean(folder) && fs.statSync(folder).isDirectory();
	} catch {
		isFolder = false;
	}
	if (!isFolder) throw fail("no_folder", "This server has no folder to browse.");

	// The panel's own settings, accounts and backups live in its data folder. A server folder that is that folder, sits inside it, or
	// holds it would bring those files into reach.
	// Compared both as written and with links resolved, so a junction an admin chose cannot lead into the data folder either.
	const data = path.resolve(paths.dataDir);
	const realOf = (p) => {
		try {
			return fs.realpathSync(p);
		} catch {
			return path.resolve(p);
		}
	};
	for (const [a, b] of [[folder, data], [realOf(folder), realOf(data)]]) {
		if (isWithinFolder(a, b) || isWithinFolder(b, a)) {
			throw fail("outside", "This server's folder holds the panel's own data, so it can't be browsed here.");
		}
	}
	return folder;
}

export function rootsFor(server) {
	return [rootFor(server)];
}

// Splits a caller's path into its parts below the folder. Refuses anything that could leave the folder or name something Windows
// treats specially. An empty result means the folder itself.
function splitRel(rel) {
	if (typeof rel !== "string" || rel.length > MAX_PATH || rel.includes("\0")) {
		throw fail("bad_path", "That path isn't valid.");
	}
	// A lone slash names the server's folder, the same as an empty path.
	if (rel === "/" || rel === "\\") return [];
	// Absolute and network paths, drive letters, and any colon (a drive, or an alternate data stream on Windows) can point off the folder.
	if (/^[\\/]/.test(rel) || rel.includes(":")) throw fail("outside", OUTSIDE);

	const segments = rel.split(/[\\/]/);
	// One separator at the end is harmless. It leaves an empty last piece, which is dropped.
	if (segments.length > 1 && segments[segments.length - 1] === "") segments.pop();
	if (segments.length === 1 && segments[0] === "") return [];

	const parts = [];
	segments.forEach((seg, i) => {
		// A "." at the very start names the folder itself, so it is harmless. Anywhere else it is refused, like ".." and empty pieces.
		if (seg === "." && i === 0) return;
		if (seg === "" || seg === "." || seg === "..") throw fail("outside", OUTSIDE);
		checkSegment(seg);
		parts.push(seg);
	});
	return parts;
}

// One name in the folder: no trailing dot or space (Windows silently strips them, so "a." would become "a"), no reserved characters,
// no control characters, no device name, and not too long.
function checkSegment(seg) {
	const bad =
		seg.length > MAX_SEGMENT ||
		seg.endsWith(".") ||
		seg.endsWith(" ") ||
		FORBIDDEN_CHARS.test(seg) ||
		[...seg].some((ch) => ch.charCodeAt(0) < 32) ||
		DEVICE_NAME.test(seg.split(".")[0]);
	if (bad) throw fail("outside", OUTSIDE);
}

/**
 * The one place the path rules live. Every operation calls this first. Returns the absolute path, or throws. Walks each part that
 * already exists and refuses a link or junction, so nothing below the folder can point out of it. The walk stops at the first part
 * that is missing, so creating a new name still works.
 */
export async function resolveInside(server, rel) {
	const root = rootFor(server);
	const parts = splitRel(rel);
	let current = root;
	for (const part of parts) {
		current = path.join(current, part);
		const info = await lstatOrNull(current);
		// Nothing here yet, so everything after it is new and there is nothing to check.
		if (!info) break;
		if (info.isSymbolicLink()) throw fail("outside", OUTSIDE);
	}
	const abs = path.join(root, ...parts);
	if (!isWithinFolder(abs, root)) throw fail("outside", OUTSIDE);
	return abs;
}

/**
 * True for the panel's own files and folders: the trash, the settings file, and any backup. They can be seen and read, but not
 * changed through the file manager.
 */
export function isProtected(rel) {
	const parts = String(rel).split(/[\\/]+/).filter(Boolean).map((p) => p.toLowerCase());
	if (parts.length === 0) return false;
	if (parts.includes(TRASH)) return true;
	const last = parts[parts.length - 1];
	return last === SETTINGS_FILE || last.endsWith(".bak");
}

// The item at `abs`, or null when nothing is there. A path that runs through a file also reads as nothing there.
async function lstatOrNull(abs) {
	try {
		return await fs.promises.lstat(abs);
	} catch (err) {
		if (err.code === "ENOENT" || err.code === "ENOTDIR") return null;
		throw err;
	}
}

// Like lstatOrNull, but follows links. Only the server's own folder is looked at this way, since it may be a junction an admin chose.
async function infoOrNull(abs, followLinks) {
	try {
		return followLinks ? await fs.promises.stat(abs) : await fs.promises.lstat(abs);
	} catch (err) {
		if (err.code === "ENOENT" || err.code === "ENOTDIR") return null;
		throw err;
	}
}

// Resolves a path, then looks at what is there. `info` is null when nothing is.
async function locate(server, rel) {
	const abs = await resolveInside(server, rel);
	const parts = splitRel(rel);
	const info = await infoOrNull(abs, parts.length === 0);
	return { abs, parts, info };
}

function typeOf(info) {
	if (info.isSymbolicLink()) return "link";
	if (info.isDirectory()) return "dir";
	if (info.isFile()) return "file";
	return "other";
}

function entryOf(info, rel, name) {
	const type = typeOf(info);
	return {
		name,
		path: rel,
		type,
		size: type === "file" ? info.size : 0,
		modifiedAt: info.mtime.toISOString(),
		protected: isProtected(rel),
	};
}

// A file is binary when its first few kilobytes hold a NUL byte. Text files do not, and this is how an editor tells them apart.
async function looksBinary(abs) {
	const handle = await fs.promises.open(abs, "r");
	try {
		const buf = Buffer.alloc(SNIFF_BYTES);
		const { bytesRead } = await handle.read(buf, 0, SNIFF_BYTES, 0);
		return buf.subarray(0, bytesRead).includes(0);
	} finally {
		await handle.close();
	}
}

// Folders first, then names, both ignoring case.
const rankOf = (dirent) => (dirent.isDirectory() ? 0 : 1);
function compareNames(a, b) {
	const x = a.toLowerCase();
	const y = b.toLowerCase();
	return x < y ? -1 : x > y ? 1 : 0;
}

export async function list(server, rel) {
	const { abs, parts, info } = await locate(server, rel);
	if (!info) throw fail("not_found", NOT_FOUND);
	if (!info.isDirectory()) throw fail("not_a_dir", NOT_A_DIR);

	const dirents = await fs.promises.readdir(abs, { withFileTypes: true });
	// Sorted before the cap, so the same names are always the ones shown.
	dirents.sort((a, b) => rankOf(a) - rankOf(b) || compareNames(a.name, b.name));
	const shown = [];
	for (const dirent of dirents.slice(0, LIST_LIMIT)) {
		// Looked at without following, so a link shows as a link and its target is never read. A name that vanished since the
		// listing was taken is skipped.
		const child = await infoOrNull(path.join(abs, dirent.name), false);
		if (child) shown.push(entryOf(child, [...parts, dirent.name].join("/"), dirent.name));
	}
	return { path: parts.join("/"), entries: shown, truncated: dirents.length > LIST_LIMIT };
}

export async function stat(server, rel) {
	const { abs, parts, info } = await locate(server, rel);
	if (!info) throw fail("not_found", NOT_FOUND);
	const name = parts.length ? parts[parts.length - 1] : path.basename(abs);
	return entryOf(info, parts.join("/"), name);
}

export async function readText(server, rel, { maxBytes = MAX_READ } = {}) {
	const { abs, info } = await locate(server, rel);
	if (!info) throw fail("not_found", NOT_FOUND);
	if (!info.isFile()) throw fail("not_a_file", NOT_A_FILE);
	if (info.size > maxBytes) {
		throw fail("too_big", `This file is ${mb(info.size)} MB, and the most that opens here is ${mb(maxBytes)} MB.`);
	}
	if (await looksBinary(abs)) throw fail("binary", NOT_TEXT);
	const content = await fs.promises.readFile(abs, "utf8");
	return { content, size: info.size, modifiedAt: info.mtime.toISOString() };
}

export async function writeText(server, rel, content, { source = "file manager" } = {}) {
	if (typeof content !== "string") throw fail("bad_path", "The new content has to be text.");
	const bytes = Buffer.byteLength(content, "utf8");
	if (bytes > MAX_WRITE) {
		throw fail("too_big", `That text is ${mb(bytes)} MB, and the most that can be saved here is ${mb(MAX_WRITE)} MB.`);
	}
	const { abs, info } = await locate(server, rel);
	if (isProtected(rel)) throw fail("protected", PROTECTED);
	const parent = await infoOrNull(path.dirname(abs), true);
	if (!parent || !parent.isDirectory()) throw fail("parent_missing", PARENT_MISSING);
	if (info && !info.isFile()) throw fail("not_a_file", NOT_A_FILE);
	if (info && (await looksBinary(abs))) throw fail("binary", NOT_TEXT);

	try {
		// writeManagedFile keeps the .bak and the history. Its own check is the last line of defence, so a path it refuses is reported as outside.
		await writeManagedFile(abs, content, source);
	} catch (err) {
		if (err.code === "path_not_allowed") throw fail("outside", OUTSIDE);
		throw err;
	}
	const after = await fs.promises.lstat(abs);
	return { size: bytes, modifiedAt: after.mtime.toISOString() };
}

export async function mkdir(server, rel) {
	const { abs, parts } = await locate(server, rel);
	if (parts.length === 0) throw fail("exists", EXISTS);
	if (isProtected(rel)) throw fail("protected", PROTECTED);
	const parent = await infoOrNull(path.dirname(abs), true);
	if (!parent || !parent.isDirectory()) throw fail("parent_missing", PARENT_MISSING);
	try {
		// Not recursive: a folder is only made where its parent already exists, so a typo does not build a whole tree.
		await fs.promises.mkdir(abs);
	} catch (err) {
		if (err.code === "EEXIST") throw fail("exists", EXISTS);
		throw err;
	}
}

export async function rename(server, fromRel, toRel) {
	const from = await locate(server, fromRel);
	const to = await locate(server, toRel);
	if (from.parts.length === 0 || to.parts.length === 0) {
		throw fail("bad_path", "The server's own folder can't be renamed.");
	}
	if (isProtected(fromRel) || isProtected(toRel)) throw fail("protected", PROTECTED);
	if (!from.info) throw fail("not_found", NOT_FOUND);
	// A folder moved into itself would be cut off from everything it holds. Only a rename that changes letter case is exempt.
	const caseOnly = to.abs.toLowerCase() === from.abs.toLowerCase();
	if (from.info.isDirectory() && !caseOnly && isWithinFolder(to.abs, from.abs)) {
		throw fail("bad_path", "A folder can't be moved into itself.");
	}
	// The same file under a new letter case is allowed. A different file already there is not, so nothing is overwritten.
	if (to.info && !(to.info.ino && to.info.ino === from.info.ino)) throw fail("exists", EXISTS);
	const parent = await infoOrNull(path.dirname(to.abs), true);
	if (!parent || !parent.isDirectory()) throw fail("parent_missing", PARENT_MISSING);
	await fs.promises.rename(from.abs, to.abs);
}

function newTrashId() {
	return `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}

// Takes a trash folder away. A junction or link inside it is removed as a link first, so nothing it points at is ever deleted.
async function removeTrashFolder(dir) {
	await unlinkLinks(dir);
	await fs.promises.rm(dir, { recursive: true, force: true });
}

async function unlinkLinks(dir) {
	for (const entry of await fs.promises.readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isSymbolicLink()) {
			// Windows removes a junction with rmdir, not unlink, so try both.
			await fs.promises.unlink(full).catch(() => fs.promises.rmdir(full));
		} else if (entry.isDirectory()) {
			await unlinkLinks(full);
		}
	}
}

export async function moveToTrash(server, rel) {
	const { abs, parts, info } = await locate(server, rel);
	if (parts.length === 0) throw fail("bad_path", "The server's own folder can't be moved to the trash.");
	if (isProtected(rel)) throw fail("protected", PROTECTED);
	if (!info) throw fail("not_found", NOT_FOUND);

	const trashId = newTrashId();
	const trashDir = await resolveInside(server, `${TRASH}/${trashId}`);
	const dest = path.join(trashDir, "data", ...parts);
	try {
		await fs.promises.mkdir(path.dirname(dest), { recursive: true });
		// The record is written before the item moves, so nothing sits in the trash without saying where it came from.
		const meta = { originalPath: parts.join("/"), deletedAt: new Date().toISOString(), type: typeOf(info) };
		await fs.promises.writeFile(path.join(trashDir, TRASH_META), JSON.stringify(meta), "utf8");
		await fs.promises.rename(abs, dest);
	} catch (err) {
		// A half-made trash folder is removed, so the trash never lists something that did not move.
		await removeTrashFolder(trashDir).catch(() => {});
		throw err;
	}
	return { trashId };
}

// A trash item's record, or null when it is damaged. A record is data the panel wrote, so it is read defensively.
async function readTrashItem(dir, id) {
	const info = await infoOrNull(dir, false);
	if (!info || !info.isDirectory()) return null;
	let meta;
	try {
		meta = JSON.parse(await fs.promises.readFile(path.join(dir, TRASH_META), "utf8"));
	} catch {
		return null;
	}
	if (!meta || typeof meta !== "object") return null;
	if (typeof meta.originalPath !== "string" || typeof meta.deletedAt !== "string") return null;
	return {
		id,
		originalPath: meta.originalPath,
		deletedAt: meta.deletedAt,
		type: typeof meta.type === "string" ? meta.type : "other",
	};
}

export async function listTrash(server) {
	const trashRoot = await resolveInside(server, TRASH);
	const names = await fs.promises.readdir(trashRoot).catch((err) => {
		if (err.code === "ENOENT") return [];
		throw err;
	});
	const items = [];
	for (const name of names) {
		// Only folders named the way the panel names them are trash. Anything else in there is left alone.
		if (!TRASH_ID.test(name)) continue;
		const item = await readTrashItem(path.join(trashRoot, name), name);
		if (item) items.push(item);
	}
	// Newest first. The id starts with the time in milliseconds, so comparing the names compares the times.
	return items.sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
}

export async function restoreFromTrash(server, trashId) {
	if (typeof trashId !== "string" || !TRASH_ID.test(trashId)) throw fail("bad_trash_id", "That trash item isn't valid.");
	const trashDir = await resolveInside(server, `${TRASH}/${trashId}`);
	const item = await readTrashItem(trashDir, trashId);
	if (!item) throw fail("not_found", "That item is no longer in the trash.");

	// The record is data, not something to trust. Its path is checked again exactly as a caller's path would be.
	const parts = splitRel(item.originalPath);
	if (parts.length === 0) throw fail("bad_path", "That trash item has no place to go back to.");
	if (isProtected(item.originalPath)) throw fail("protected", PROTECTED);
	const dest = await resolveInside(server, item.originalPath);
	const source = path.join(trashDir, "data", ...parts);
	if (!(await lstatOrNull(source))) throw fail("not_found", "That item is no longer in the trash.");
	if (await lstatOrNull(dest)) throw fail("exists", EXISTS);

	// Folders that were removed since are made again, but only along a path that has just passed the checks above.
	await fs.promises.mkdir(path.dirname(dest), { recursive: true });
	await fs.promises.rename(source, dest);
	await removeTrashFolder(trashDir);
	return { path: parts.join("/") };
}

/**
 * Empties trash items older than the limit, judged by the time in each id. A stray folder, or one whose name is not an id, is left
 * alone. Returns how many items were removed.
 */
export async function purgeTrash(server, { olderThanMs = WEEK_MS } = {}) {
	const trashRoot = await resolveInside(server, TRASH);
	const names = await fs.promises.readdir(trashRoot).catch((err) => {
		if (err.code === "ENOENT") return [];
		throw err;
	});
	const cutoff = Date.now() - olderThanMs;
	let removed = 0;
	for (const name of names) {
		if (!TRASH_ID.test(name)) continue;
		if (!(Number(name.slice(0, 13)) <= cutoff)) continue;
		try {
			// Checked again per item, so a link planted in the trash is refused rather than followed.
			const dir = await resolveInside(server, `${TRASH}/${name}`);
			const info = await lstatOrNull(dir);
			if (!info || !info.isDirectory()) continue;
			await removeTrashFolder(dir);
			removed += 1;
		} catch {
			// An item that can't be removed now stays for the next pass, and must not stop the rest.
		}
	}
	return removed;
}

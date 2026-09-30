import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { paths } from "../paths.js";

// A history of every settings and start-script file the panel writes, so a change can
// be looked at, compared, and undone. The panel already leaves a .bak of the last
// version beside each file; this keeps the versions before that too.
//
// Each file gets a folder named from its path, holding an index and one file per
// version. The oldest content the panel ever saw is kept as the first version
// ("before the panel's first change"), so even the first edit can be undone. It is
// capped by count and size, and it never stops a save from happening.

const ROOT = path.join(paths.dataDir, "state", "config-history");
const MAX_VERSIONS = 60;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;

const folderFor = (file) => path.join(ROOT, crypto.createHash("sha1").update(path.resolve(file).toLowerCase()).digest("hex").slice(0, 16));
const sha = (text) => crypto.createHash("sha1").update(text).digest("hex");

async function readIndex(dir) {
	try {
		return JSON.parse(await fs.readFile(path.join(dir, "index.json"), "utf8"));
	} catch {
		return null;
	}
}

async function addVersion(dir, index, content, source, at) {
	const hash = sha(content);
	if (index.versions.at(-1)?.sha === hash) return false;
	const id = `${at}-${hash.slice(0, 6)}`;
	await fs.writeFile(path.join(dir, `${id}.txt`), content, "utf8");
	index.versions.push({ id, at: new Date(at).toISOString(), bytes: Buffer.byteLength(content, "utf8"), sha: hash, source });
	return true;
}

/**
 * Note a write. `before` is what the file held (null if it didn't exist), `after` what
 * it holds now. Called by the code that writes managed files; never throws.
 */
export async function recordVersion(file, before, after, source = "panel") {
	try {
		if (Buffer.byteLength(after, "utf8") > MAX_FILE_BYTES) return;
		const dir = folderFor(file);
		await fs.mkdir(dir, { recursive: true });
		const index = (await readIndex(dir)) ?? { file: path.resolve(file), versions: [] };
		const now = Date.now();
		if (index.versions.length === 0 && typeof before === "string" && Buffer.byteLength(before, "utf8") <= MAX_FILE_BYTES) {
			await addVersion(dir, index, before, "before the panel's first change", now - 1);
		}
		await addVersion(dir, index, after, source, now);
		// Trim the oldest, always keeping the very first.
		while (index.versions.length > MAX_VERSIONS) {
			const [, doomed] = index.versions;
			await fs.rm(path.join(dir, `${doomed.id}.txt`), { force: true });
			index.versions.splice(1, 1);
		}
		await fs.writeFile(path.join(dir, "index.json"), JSON.stringify(index));
		await trimTotal();
	} catch (err) {
		console.warn("[history] Could not record a version:", err.message);
	}
}

async function trimTotal() {
	let total = 0;
	const all = [];
	for (const name of await fs.readdir(ROOT).catch(() => [])) {
		const dir = path.join(ROOT, name);
		const index = await readIndex(dir);
		if (!index) continue;
		for (const v of index.versions) {
			total += v.bytes;
			all.push({ dir, index, v });
		}
	}
	if (total <= MAX_TOTAL_BYTES) return;
	// Drop the oldest versions anywhere (never a file's first) until it fits.
	all.sort((a, b) => (a.v.at < b.v.at ? -1 : 1));
	for (const item of all) {
		if (total <= MAX_TOTAL_BYTES) break;
		if (item.index.versions[0] === item.v) continue;
		await fs.rm(path.join(item.dir, `${item.v.id}.txt`), { force: true });
		item.index.versions = item.index.versions.filter((x) => x !== item.v);
		total -= item.v.bytes;
		await fs.writeFile(path.join(item.dir, "index.json"), JSON.stringify(item.index));
	}
}

/** Newest first. */
export async function listVersions(file) {
	const index = await readIndex(folderFor(file));
	return index ? [...index.versions].reverse() : [];
}

export async function readVersion(file, id) {
	if (!/^[0-9]+-[0-9a-f]{6}$/.test(id)) return null;
	try {
		return await fs.readFile(path.join(folderFor(file), `${id}.txt`), "utf8");
	} catch {
		return null;
	}
}

export async function forgetHistory(file) {
	await fs.rm(folderFor(file), { recursive: true, force: true }).catch(() => {});
}

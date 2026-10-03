import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Write JSON so a crash mid-write can't leave a truncated file behind: write a
 * temp file, flush it to disk, keep the previous version as .bak, then rename
 * over the target. Rename is atomic on the same NTFS volume.
 */
export async function writeJsonAtomic(filePath, data) {
	const dir = path.dirname(filePath);
	await fs.mkdir(dir, { recursive: true });

	const tmp = `${filePath}.tmp`;
	const json = `${JSON.stringify(data, null, "\t")}\n`;

	const handle = await fs.open(tmp, "w");
	try {
		await handle.writeFile(json, "utf8");
		await handle.sync();
	} finally {
		await handle.close();
	}

	await fs.copyFile(filePath, `${filePath}.bak`).catch(() => {});
	await fs.rename(tmp, filePath);
}

// A file that is missing, or isn't valid JSON, reads as the fallback. With `strict`, a file that exists but
// can't be opened (permissions, or another program holding it) is an error instead: for the stores that hold
// accounts, secrets, servers and settings, treating that as "nothing there" would make an existing install
// look brand new, and the next save would overwrite what is really in the file. Not the default, because
// some files are read while the panel is running and a momentary lock there is harmless.
const UNREADABLE = new Set(["EACCES", "EPERM", "EBUSY"]);

export async function readJson(filePath, fallback = null, { strict = false } = {}) {
	try {
		return JSON.parse(await fs.readFile(filePath, "utf8"));
	} catch (err) {
		if (strict && UNREADABLE.has(err?.code)) {
			throw new Error(`GodlyPanel can't read ${filePath} (${err.code}). Check that this Windows account may open it and that no other program has it locked; the file was not changed.`);
		}
		return fallback;
	}
}

/**
 * Serialises async work so two callers can't interleave a read-modify-write.
 * Sufficient here because exactly one process owns the data dir — the app
 * takes a single-instance lock keyed on it.
 */
export function createWriteQueue() {
	let chain = Promise.resolve();
	return function enqueue(fn) {
		const run = () => fn();
		chain = chain.then(run, run);
		return chain;
	};
}

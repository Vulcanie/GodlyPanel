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

export async function readJson(filePath, fallback = null) {
	try {
		return JSON.parse(await fs.readFile(filePath, "utf8"));
	} catch {
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

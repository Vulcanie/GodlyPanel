import { promises as fs } from "node:fs";
import { assertWithinAllowedRoots } from "./safePath.js";
import { recordVersion } from "../services/configHistory.js";

// Config files and launch scripts are read and written from two routes that
// each used to carry their own copy of the same sequence: check the path is
// somewhere the panel manages, copy the target to .bak, write. The check has
// to come before the copy as well as the write — the backup lands beside the
// target, so an out-of-bounds target means an out-of-bounds backup too — and
// keeping that ordering right in two places is exactly how it gets lost.

export function readManagedFile(filePath) {
	assertWithinAllowedRoots(filePath);
	return fs.readFile(filePath, "utf8");
}

/**
 * @param {string} source  what is making the change, shown in the file's history
 */
export async function writeManagedFile(filePath, content, source = "settings editor") {
	assertWithinAllowedRoots(filePath);
	let before = null;
	try {
		await fs.copyFile(filePath, `${filePath}.bak`);
		before = await fs.readFile(filePath, "utf8");
	} catch (err) {
		// Saving a file that doesn't exist yet is fine; there's nothing to keep.
		if (err.code !== "ENOENT") throw err;
	}
	await writeWhole(filePath, content);
	await recordVersion(filePath, before, content, source);
}

/**
 * Write the file so it is never half written: the new text goes to a file beside it, which then replaces the old one in one step.
 * A crash, a full disk or a power cut in the middle leaves the old file intact instead of a truncated settings file the game then
 * refuses to read. Where Windows won't let one file replace another (a program has the old one open), write in place as before.
 */
async function writeWhole(filePath, content) {
	const temp = `${filePath}.${process.pid}.tmp`;
	try {
		await fs.writeFile(temp, content, "utf8");
		await fs.rename(temp, filePath);
	} catch (err) {
		await fs.rm(temp, { force: true }).catch(() => {});
		if (!["EPERM", "EBUSY", "EACCES", "EXDEV"].includes(err.code)) throw err;
		await fs.writeFile(filePath, content, "utf8");
	}
}

/** Answer a failed read/write in the same way everywhere. */
export function sendFileError(res, err, what) {
	if (err.code === "path_not_allowed") {
		return res.status(400).json({ error: err.message });
	}
	if (err.code === "ENOENT") {
		return res.status(404).json({ error: `${what[0].toUpperCase()}${what.slice(1)} doesn't exist yet.`, code: "file_missing" });
	}
	console.error(`Error handling ${what}:`, err);
	res.status(500).json({ error: `Failed to handle ${what}. System error: ${err.code ?? "unknown"}` });
}

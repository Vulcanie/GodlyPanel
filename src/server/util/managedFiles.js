import { promises as fs } from "node:fs";
import { assertWithinAllowedRoots } from "./safePath.js";

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

export async function writeManagedFile(filePath, content) {
	assertWithinAllowedRoots(filePath);
	try {
		await fs.copyFile(filePath, `${filePath}.bak`);
	} catch (err) {
		// Saving a file that doesn't exist yet is fine; there's nothing to keep.
		if (err.code !== "ENOENT") throw err;
	}
	await fs.writeFile(filePath, content, "utf8");
}

/** Answer a failed read/write in the same way everywhere. */
export function sendFileError(res, err, what) {
	if (err.code === "path_not_allowed") {
		return res.status(400).json({ error: err.message });
	}
	console.error(`Error handling ${what}:`, err);
	res.status(500).json({ error: `Failed to handle ${what}. System error: ${err.code ?? "unknown"}` });
}

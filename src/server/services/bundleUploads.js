import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { paths } from "../paths.js";

// A .gpserver file that was uploaded, kept until it is planned or imported. The upload is only put aside here, not read: reading
// it is the planning step's job. Each one gets a random id, so the page never names a path on this PC, and the id is checked as
// a UUID before any path is made from it, so a crafted id can't point outside the folder.

const FOLDER = path.join(paths.uploadsDir, "bundles");
const EXTENSION = ".gpserver";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000;

const isUploadId = (uploadId) => typeof uploadId === "string" && UUID.test(uploadId);

/**
 * Moves the multer temp file into the staging folder under a new id. The temp file is removed if the move fails, so a failed
 * upload leaves nothing behind. Old uploads are swept first, so the folder can't grow without limit.
 */
export async function stageUpload(tempFile) {
	await sweepStaleUploads();
	const uploadId = crypto.randomUUID();
	const target = path.join(FOLDER, `${uploadId}${EXTENSION}`);
	try {
		await fs.mkdir(FOLDER, { recursive: true });
		try {
			await fs.rename(tempFile, target);
		} catch (err) {
			// A rename can't cross drives; the temp folder and the data folder normally share one, so this is only a fallback.
			if (err.code !== "EXDEV") throw err;
			await fs.copyFile(tempFile, target);
			await fs.rm(tempFile, { force: true });
		}
	} catch (err) {
		await fs.rm(tempFile, { force: true }).catch(() => {});
		throw err;
	}
	return { uploadId };
}

/** The full path of a staged upload, or null when the id is not one, or the upload is gone. */
export async function stagedFile(uploadId) {
	if (!isUploadId(uploadId)) return null;
	const file = path.join(FOLDER, `${uploadId}${EXTENSION}`);
	const stat = await fs.stat(file).catch(() => null);
	return stat?.isFile() ? file : null;
}

/** Removes a staged upload. Safe to call for an id that is gone, or one that is not an id at all. */
export async function discardUpload(uploadId) {
	if (!isUploadId(uploadId)) return;
	await fs.rm(path.join(FOLDER, `${uploadId}${EXTENSION}`), { force: true }).catch(() => {});
}

/**
 * Removes staged uploads older than `maxAgeMs` (by when they were last written). Only .gpserver files in the staging folder are
 * touched; anything else that lands there is left alone. Runs when an upload is staged, so no timer is needed.
 */
export async function sweepStaleUploads(maxAgeMs = DEFAULT_MAX_AGE_MS) {
	const names = await fs.readdir(FOLDER).catch(() => []);
	const cutoff = Date.now() - maxAgeMs;
	for (const name of names) {
		if (!name.toLowerCase().endsWith(EXTENSION)) continue;
		const file = path.join(FOLDER, name);
		const stat = await fs.stat(file).catch(() => null);
		if (stat?.isFile() && stat.mtimeMs < cutoff) await fs.rm(file, { force: true }).catch(() => {});
	}
}

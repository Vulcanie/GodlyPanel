import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Staged bundle uploads: a bundle is put aside under a random id until it is planned or imported. Only ids that are UUIDs ever
// make a path, and a sweep removes old bundles without touching anything else in the folder.

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gp-bundle-uploads-"));
process.env.GHP_DATA_DIR = path.join(tmp, "data");
const { stageUpload, stagedFile, discardUpload, sweepStaleUploads } = await import("../../src/server/services/bundleUploads.js");

const FOLDER = path.join(tmp, "data", "uploads", "bundles");
const HOUR = 60 * 60 * 1000;

// A temp file as multer would leave it, somewhere outside the staging folder.
let counter = 0;
function tempFile(text = "bundle bytes") {
	counter += 1;
	const file = path.join(tmp, `multer-${counter}.part`);
	fs.writeFileSync(file, text);
	return file;
}

// Makes a file in the staging folder that looks as if it was written `ageMs` ago.
function aged(name, ageMs, text = "x") {
	fs.mkdirSync(FOLDER, { recursive: true });
	const file = path.join(FOLDER, name);
	fs.writeFileSync(file, text);
	const when = new Date(Date.now() - ageMs);
	fs.utimesSync(file, when, when);
	return file;
}

describe("staged bundle uploads", () => {
	after(() => {
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("stages a file under a new id, moving it out of the temp place", async () => {
		const temp = tempFile("hello bundle");
		const { uploadId } = await stageUpload(temp);
		assert.match(uploadId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		assert.equal(fs.existsSync(temp), false, "the temp file is gone");

		const file = await stagedFile(uploadId);
		assert.equal(file, path.join(FOLDER, `${uploadId}.gpserver`));
		assert.equal(fs.readFileSync(file, "utf8"), "hello bundle");
	});

	it("gives null for an id that is not a UUID, including a path trick", async () => {
		assert.equal(await stagedFile("not-an-id"), null);
		assert.equal(await stagedFile("..\\x"), null);
		assert.equal(await stagedFile("../../../etc/passwd"), null);
		assert.equal(await stagedFile(undefined), null);
		assert.equal(await stagedFile(42), null);
	});

	it("gives null for a well-formed id with nothing staged under it", async () => {
		assert.equal(await stagedFile("00000000-0000-4000-8000-000000000000"), null);
	});

	it("discards a staged file, and is quiet for an id that is gone or not an id", async () => {
		const { uploadId } = await stageUpload(tempFile());
		await discardUpload(uploadId);
		assert.equal(await stagedFile(uploadId), null);
		await discardUpload(uploadId);
		// A bundle of the same name one folder up must survive a crafted id that would point at it.
		const outside = path.join(tmp, "data", "escape.gpserver");
		fs.writeFileSync(outside, "keep me");
		await discardUpload("../../escape");
		assert.equal(fs.readFileSync(outside, "utf8"), "keep me");
	});

	it("sweeps only old .gpserver files, keeping fresh ones and other files", async () => {
		const old = aged("00000000-0000-4000-8000-0000000000aa.gpserver", 2 * HOUR);
		const fresh = aged("00000000-0000-4000-8000-0000000000bb.gpserver", 5 * 60 * 1000);
		const notBundle = aged("notes.txt", 2 * HOUR);

		await sweepStaleUploads();
		assert.equal(fs.existsSync(old), false, "the old bundle goes");
		assert.equal(fs.existsSync(fresh), true, "a fresh bundle stays");
		assert.equal(fs.existsSync(notBundle), true, "a file that isn't a bundle stays");
	});

	it("takes the age limit as an argument", async () => {
		const file = aged("00000000-0000-4000-8000-0000000000cc.gpserver", 10 * 60 * 1000);
		await sweepStaleUploads(HOUR);
		assert.equal(fs.existsSync(file), true, "ten minutes is not old for a one-hour limit");
		await sweepStaleUploads(5 * 60 * 1000);
		assert.equal(fs.existsSync(file), false, "but it is old for a five-minute limit");
	});
});

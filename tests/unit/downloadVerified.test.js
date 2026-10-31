import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { downloadVerified } from "../../src/server/util/downloadVerified.js";

// A download is kept only when it is exactly what the maker said it should be: the checksum it names, and no more bytes than
// a cap allows. These use a stand-in fetch, so no network is involved.

const bytes = Buffer.from("pretend this is a jar full of classes".repeat(20));
const sha512 = crypto.createHash("sha512").update(bytes).digest("hex");
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
const fakeFetch = (body) => async () => new Response(body, { status: 200 });

describe("downloadVerified: sha512 and maxBytes", () => {
	let dir;
	before(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-dv-"));
	});
	after(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const url = "https://example.test/a.jar";

	it("keeps a download whose sha512 matches", async () => {
		const dest = path.join(dir, "ok-512.jar");
		const result = await downloadVerified({ url, dest, sha512, fetchImpl: fakeFetch(bytes) });
		assert.equal(result.bytes, bytes.length);
		assert.deepEqual(fs.readFileSync(dest), bytes);
		assert.equal(fs.existsSync(`${dest}.partial`), false);
	});

	it("deletes a download whose sha512 doesn't match, and says so", async () => {
		const dest = path.join(dir, "bad-512.jar");
		const wrong = "0".repeat(128);
		await assert.rejects(() => downloadVerified({ url, dest, sha512: wrong, fetchImpl: fakeFetch(bytes) }), /doesn't match the checksum/);
		assert.equal(fs.existsSync(dest), false);
		assert.equal(fs.existsSync(`${dest}.partial`), false);
	});

	it("still checks sha256 when no sha512 is given", async () => {
		const dest = path.join(dir, "bad-256.jar");
		await assert.rejects(() => downloadVerified({ url, dest, sha256: "1".repeat(64), fetchImpl: fakeFetch(bytes) }), /doesn't match the checksum/);
		assert.equal(fs.existsSync(dest), false);
	});

	it("stops a download that runs past maxBytes, and deletes the partial file", async () => {
		const dest = path.join(dir, "too-big.jar");
		const big = Buffer.alloc(5000, 1);
		await assert.rejects(() => downloadVerified({ url, dest, maxBytes: 1000, fetchImpl: fakeFetch(big) }), {
			message: "The download is larger than it should be, so it was stopped.",
		});
		assert.equal(fs.existsSync(dest), false);
		assert.equal(fs.existsSync(`${dest}.partial`), false);
	});

	it("keeps a download that fits within maxBytes", async () => {
		const dest = path.join(dir, "fits.jar");
		await downloadVerified({ url, dest, maxBytes: bytes.length, fetchImpl: fakeFetch(bytes) });
		assert.deepEqual(fs.readFileSync(dest), bytes);
	});

	it("leaves the size unlimited when maxBytes is not given", async () => {
		const dest = path.join(dir, "unlimited.jar");
		await downloadVerified({ url, dest, fetchImpl: fakeFetch(Buffer.alloc(3000, 2)) });
		assert.equal(fs.statSync(dest).size, 3000);
	});
});

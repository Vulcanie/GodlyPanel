import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createS3Client, S3Error } from "../../src/server/services/s3Client.js";
import { startFakeS3 } from "../helpers/fakeS3.js";

// The S3 client against a stand-in that verifies the request signature and payload
// hash the way S3 does: good credentials work, wrong ones say so, large files go up in
// parts and come back identical, and a failed upload leaves nothing half-written.

describe("S3 client", () => {
	let s3;
	let client;
	let dir;

	before(async () => {
		s3 = await startFakeS3({ bucket: "backups", accessKeyId: "AKIATEST", secretAccessKey: "s3cr3t/+key" });
		client = createS3Client({ endpoint: s3.endpoint, bucket: "backups", accessKeyId: "AKIATEST", secretAccessKey: "s3cr3t/+key" });
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-s3-"));
	});
	after(async () => {
		await s3.stop();
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const file = (name, bytes) => {
		const p = path.join(dir, name);
		fs.writeFileSync(p, crypto.randomBytes(bytes));
		return p;
	};
	const same = (a, b) => fs.readFileSync(a).equals(fs.readFileSync(b));

	it("accepts good credentials", async () => {
		await client.test();
	});

	it("says what is wrong with bad credentials, a bad key or a missing bucket", async () => {
		const wrongSecret = createS3Client({ endpoint: s3.endpoint, bucket: "backups", accessKeyId: "AKIATEST", secretAccessKey: "nope" });
		await assert.rejects(() => wrongSecret.test(), (e) => e instanceof S3Error && e.code === "SignatureDoesNotMatch" && /access key and secret/.test(e.message));
		const wrongKey = createS3Client({ endpoint: s3.endpoint, bucket: "backups", accessKeyId: "OTHER", secretAccessKey: "s3cr3t/+key" });
		await assert.rejects(() => wrongKey.test(), (e) => e.code === "InvalidAccessKeyId");
		const wrongBucket = createS3Client({ endpoint: s3.endpoint, bucket: "elsewhere", accessKeyId: "AKIATEST", secretAccessKey: "s3cr3t/+key" });
		await assert.rejects(() => wrongBucket.test(), (e) => e.code === "NoSuchBucket" && /bucket name/.test(e.message));
	});

	it("says so plainly when the address can't be reached", async () => {
		const nowhere = createS3Client({ endpoint: "http://127.0.0.1:1", bucket: "b", accessKeyId: "a", secretAccessKey: "b" });
		await assert.rejects(() => nowhere.test(), /Couldn't reach 127\.0\.0\.1:1/);
	});

	it("uploads and downloads a small file, with a key that needs encoding", async () => {
		const src = file("small.bin", 50_000);
		const key = "My Server-ab12cd/some file (1)_manual.zip";
		const r = await client.putFile(key, src);
		assert.deepEqual(r, { size: 50_000, parts: 1 });
		assert.ok(s3.objects.has(key));
		const back = path.join(dir, "small.back");
		await client.getFile(key, back);
		assert.ok(same(src, back));
	});

	it("uploads a large file in parts and gets identical bytes back", async () => {
		const src = file("large.bin", 40 * 1024 * 1024 + 123);
		const r = await client.putFile("big/large.zip", src);
		assert.equal(r.parts, 3);
		assert.equal(s3.objects.get("big/large.zip").length, 40 * 1024 * 1024 + 123);
		const back = path.join(dir, "large.back");
		await client.getFile("big/large.zip", back);
		assert.ok(same(src, back));
		assert.equal(s3.uploads.size, 0, "no upload left open");
	});

	it("aborts a multipart upload that fails, leaving no object and no open upload", async () => {
		const src = file("fails.bin", 20 * 1024 * 1024);
		// The start succeeds; the first part is refused.
		const original = s3.failNext;
		let armed = false;
		const realFetch = globalThis.fetch;
		globalThis.fetch = async (url, init) => {
			if (!armed && /partNumber=1/.test(String(url))) {
				armed = true;
				s3.failNext(1);
			}
			return realFetch(url, init);
		};
		try {
			await assert.rejects(() => client.putFile("big/fails.zip", src), /Uploading part 1/);
		} finally {
			globalThis.fetch = realFetch;
		}
		assert.equal(s3.objects.has("big/fails.zip"), false);
		assert.equal(s3.uploads.size, 0);
		assert.ok(original);
	});

	it("lists everything under a prefix across pages, and only that prefix", async () => {
		for (let i = 0; i < 5; i += 1) await client.putFile(`list/item-${i}.zip`, file(`l${i}.bin`, 100 + i));
		const all = await client.list("list/");
		assert.deepEqual(all.map((o) => o.key), [0, 1, 2, 3, 4].map((i) => `list/item-${i}.zip`));
		assert.deepEqual(all.map((o) => o.size), [100, 101, 102, 103, 104]);
		assert.ok(s3.requests.filter((r) => r.includes("list-type=2") && r.includes("continuation-token")).length >= 2, "it paged");
		assert.equal((await client.list("nothing/")).length, 0);
	});

	it("deletes, and deleting what isn't there is fine", async () => {
		await client.remove("list/item-0.zip");
		assert.equal(s3.objects.has("list/item-0.zip"), false);
		await client.remove("list/item-0.zip");
	});

	it("reports a missing object when downloading", async () => {
		await assert.rejects(() => client.getFile("missing.zip", path.join(dir, "x")), (e) => e.code === "NoSuchKey");
	});

	it("addresses the bucket by host name when path style is off", async () => {
		// No DNS for bucket.host names here, so what is checked is the address the request goes to.
		const realFetch = globalThis.fetch;
		const seen = [];
		globalThis.fetch = async (url, init) => {
			seen.push({ url: String(url), host: init.headers.host });
			return new Response("<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>", { status: 200 });
		};
		try {
			const virtual = createS3Client({ endpoint: "https://s3.example.com", bucket: "backups", accessKeyId: "AKIATEST", secretAccessKey: "x", pathStyle: false });
			await virtual.test();
			const path = createS3Client({ endpoint: "https://s3.example.com", bucket: "backups", accessKeyId: "AKIATEST", secretAccessKey: "x" });
			await path.test();
		} finally {
			globalThis.fetch = realFetch;
		}
		assert.ok(seen[0].url.startsWith("https://backups.s3.example.com/?"), seen[0].url);
		assert.equal(seen[0].host, "backups.s3.example.com");
		assert.ok(seen[1].url.startsWith("https://s3.example.com/backups?"), seen[1].url);
	});
});

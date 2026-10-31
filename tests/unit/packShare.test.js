import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The mod pack link: which server a token belongs to, and the share file that keeps the tokens. A token is the only thing that
// names a server on the public address, so a wrong or malformed one must never resolve, and a damaged share file must read as empty.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-share-"));
process.env.GHP_DATA_DIR = path.join(root, "data");

const { ensureDataDirs, paths } = await import("../../src/server/paths.js");
ensureDataDirs();
const share = await import("../../src/server/services/packShare.js");
const FILE = path.join(paths.dataDir, "state", "pack-shares.json");
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

describe("the mod pack link", () => {
	before(() => {
		fs.mkdirSync(path.dirname(FILE), { recursive: true });
	});
	after(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it("enable creates a token of the right shape and keeps it on a second enable", async () => {
		const first = await share.enableShare("Alpha");
		assert.equal(first.enabled, true);
		assert.match(first.token, TOKEN);
		assert.ok(first.createdAt);
		const second = await share.enableShare("Alpha");
		assert.equal(second.token, first.token);
		assert.equal(second.createdAt, first.createdAt);
		assert.deepEqual(await share.shareStatus("Alpha"), first);
	});

	it("rotate changes the token, and the old one no longer resolves", async () => {
		const old = (await share.enableShare("Beta")).token;
		assert.equal(await share.serverForToken(old), "Beta");
		const next = await share.rotateShare("Beta");
		assert.match(next.token, TOKEN);
		assert.notEqual(next.token, old);
		assert.equal(await share.serverForToken(old), null);
		assert.equal(await share.serverForToken(next.token), "Beta");
	});

	it("rotate while the share is off is refused as not_enabled", async () => {
		await assert.rejects(share.rotateShare("Gamma"), (err) => err.code === "not_enabled" && err.status === 409);
	});

	it("disable removes the token, and disabling again is not an error", async () => {
		const token = (await share.enableShare("Delta")).token;
		await share.disableShare("Delta");
		assert.deepEqual(await share.shareStatus("Delta"), { enabled: false, token: null, createdAt: null });
		assert.equal(await share.serverForToken(token), null);
		await share.disableShare("Delta");
		await share.disableShare("Nobody has this name");
	});

	it("a token that is garbage, the wrong length, or unknown never resolves", async () => {
		await share.enableShare("Epsilon");
		for (const bad of [undefined, null, 12345, {}, ["x"], "x".repeat(42), "x".repeat(44), "", "A".repeat(43), "A".repeat(43) + "=", "../" + "A".repeat(40)]) {
			assert.equal(await share.serverForToken(bad), null, String(bad));
		}
	});

	it("two servers get different tokens, and each token resolves to its own name", async () => {
		const a = await share.enableShare("Two A");
		const b = await share.enableShare("Two B");
		assert.notEqual(a.token, b.token);
		assert.equal(await share.serverForToken(a.token), "Two A");
		assert.equal(await share.serverForToken(b.token), "Two B");
	});

	it("a damaged share file is treated as empty, and can be written again", async () => {
		await share.enableShare("Zeta");
		fs.writeFileSync(FILE, "{ this is not json");
		assert.deepEqual(await share.shareStatus("Zeta"), { enabled: false, token: null, createdAt: null });
		assert.equal(await share.serverForToken("A".repeat(43)), null);
		const fresh = await share.enableShare("Zeta");
		assert.equal(fresh.enabled, true);
		assert.equal(await share.serverForToken(fresh.token), "Zeta");
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateSigningKey, publicKeyOf, signManifest, verifyManifest } from "../../src/server/util/updateSignature.js";
import { UPDATE_PUBLIC_KEYS, trustedUpdateKeys, signatureRequired } from "../../src/shared/updateKey.js";

// A release's update manifest is signed by the maker; the app checks it against a public key built into it.

const MANIFEST = JSON.stringify({ format: 1, version: "1.2.3", electron: "40.0.0", full: { name: "GodlyPanel-1.2.3-win.zip", size: 10, sha256: "a".repeat(64) } });
const ROOT = path.resolve(import.meta.dirname, "..", "..");

describe("signing an update manifest", () => {
	const mine = generateSigningKey();
	const other = generateSigningKey();

	it("verifies what the matching key signed", () => {
		assert.equal(verifyManifest(MANIFEST, signManifest(MANIFEST, mine.privatePem), [mine.publicKey]), true);
	});

	it("derives the public key from the private one", () => {
		assert.equal(publicKeyOf(mine.privatePem), mine.publicKey);
	});

	it("refuses a manifest changed by even one byte", () => {
		const sig = signManifest(MANIFEST, mine.privatePem);
		assert.equal(verifyManifest(MANIFEST.replace("1.2.3", "1.2.4"), sig, [mine.publicKey]), false);
		assert.equal(verifyManifest(`${MANIFEST} `, sig, [mine.publicKey]), false);
		assert.equal(verifyManifest(MANIFEST.replace("a".repeat(64), "b".repeat(64)), sig, [mine.publicKey]), false, "a different checksum is a different manifest");
	});

	it("refuses a signature from some other key", () => {
		assert.equal(verifyManifest(MANIFEST, signManifest(MANIFEST, other.privatePem), [mine.publicKey]), false);
	});

	it("accepts any of several keys, so a key can be replaced over two releases", () => {
		const sig = signManifest(MANIFEST, other.privatePem);
		assert.equal(verifyManifest(MANIFEST, sig, [mine.publicKey, other.publicKey]), true);
	});

	it("treats rubbish as not valid, without throwing", () => {
		for (const sig of ["", "not base64 !!", "AAAA", Buffer.alloc(64).toString("base64"), undefined, null]) {
			assert.equal(verifyManifest(MANIFEST, sig, [mine.publicKey]), false);
		}
		assert.equal(verifyManifest(MANIFEST, signManifest(MANIFEST, mine.privatePem), ["not a key", ""]), false);
		assert.equal(verifyManifest(MANIFEST, signManifest(MANIFEST, mine.privatePem), []), false);
	});

	it("does not accept a signature of the bare bytes: it has to be made for a manifest", async () => {
		const crypto = await import("node:crypto");
		const bare = crypto.sign(null, Buffer.from(MANIFEST), crypto.createPrivateKey(mine.privatePem)).toString("base64");
		assert.equal(verifyManifest(MANIFEST, bare, [mine.publicKey]), false);
	});
});

describe("the key built into the app", () => {
	it("is there, so updates are checked", () => {
		assert.ok(UPDATE_PUBLIC_KEYS.length >= 1, "an app with no key accepts any update");
		assert.equal(signatureRequired({}), true);
	});

	it("can be replaced by a fork or a test, and by nothing else in the settings", () => {
		assert.deepEqual(trustedUpdateKeys({ GHP_UPDATE_PUBLIC_KEY: "abc" }), ["abc"]);
		assert.deepEqual(trustedUpdateKeys({}), UPDATE_PUBLIC_KEYS);
	});

	it("is waived only for a test pointing the updater at its own stand-in server", () => {
		assert.equal(signatureRequired({ GHP_UPDATE_UNSIGNED_OK: "1" }), true, "not on its own");
		assert.equal(signatureRequired({ GHP_UPDATE_UNSIGNED_OK: "1", GHP_UPDATE_API: "http://127.0.0.1:1" }), false);
		assert.equal(signatureRequired({ GHP_UPDATE_API: "http://127.0.0.1:1" }), true, "a stand-in server alone doesn't waive it");
	});
});

describe("scripts/sign-update.mjs", () => {
	const work = fs.mkdtempSync(path.join(os.tmpdir(), "gp-sign-"));
	const key = generateSigningKey();
	const keyFile = path.join(work, "key.pem");
	fs.writeFileSync(keyFile, key.privatePem);
	fs.writeFileSync(path.join(work, "update-manifest.json"), MANIFEST);
	const run = (args, env = {}) => {
		try {
			return { code: 0, out: execFileSync(process.execPath, [path.join(ROOT, "scripts", "sign-update.mjs"), ...args], { env: { ...process.env, ...env }, encoding: "utf8", stdio: "pipe" }) };
		} catch (e) {
			return { code: e.status, out: `${e.stdout}${e.stderr}` };
		}
	};

	it("writes a signature the app accepts", () => {
		const r = run([work, "--key", keyFile], { GHP_UPDATE_PUBLIC_KEY: key.publicKey });
		assert.equal(r.code, 0, r.out);
		const sig = fs.readFileSync(path.join(work, "update-manifest.json.sig"), "utf8");
		assert.equal(verifyManifest(MANIFEST, sig, [key.publicKey]), true);
	});

	it("takes the key from UPDATE_SIGNING_KEY too, even with its line breaks turned into \\n", () => {
		fs.rmSync(path.join(work, "update-manifest.json.sig"));
		const r = run([work], { GHP_UPDATE_PUBLIC_KEY: key.publicKey, UPDATE_SIGNING_KEY: key.privatePem.replaceAll("\n", "\\n") });
		assert.equal(r.code, 0, r.out);
		assert.ok(fs.existsSync(path.join(work, "update-manifest.json.sig")));
	});

	it("refuses a key the app doesn't have, since every installed copy would reject the release", () => {
		fs.rmSync(path.join(work, "update-manifest.json.sig"));
		const r = run([work, "--key", keyFile]);
		assert.notEqual(r.code, 0);
		assert.match(r.out, /doesn't match any public key built into the app/);
		assert.equal(fs.existsSync(path.join(work, "update-manifest.json.sig")), false);
	});

	it("refuses to run without a key", () => {
		const r = run([work], { UPDATE_SIGNING_KEY: "" });
		assert.notEqual(r.code, 0);
		assert.match(r.out, /No signing key/);
	});
});

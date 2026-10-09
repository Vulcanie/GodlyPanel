import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { startInstance, freePort } from "../helpers/instance.js";
import { generateSigningKey, signManifest } from "../../src/server/util/updateSignature.js";

// "Update now" runs a program that came off the internet, so the panel only does it for a release whose manifest was signed by
// the maker's key (the matching public key is built into the app). A stand-in for GitHub serves releases that are signed,
// unsigned, signed with someone else's key, edited after signing, or described only by their notes; the panel has to offer the
// first and refuse the rest, with a reason a person can act on.

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const NEW = "0.1.0-alpha.99";
const OLD = "0.1.0-alpha.12";
const ELECTRON = "44.4.5";
const APP = Buffer.from("the small update");
const FULL = Buffer.from("the whole package");

describe("updates must be signed", () => {
	const maker = generateSigningKey();
	const stranger = generateSigningKey();
	let work;
	let github;
	let base;
	let release; // { assets: { name: Buffer }, notes }
	let panel;
	let api;

	const manifestText = (edit = (m) => m) =>
		JSON.stringify(
			edit({
				format: 1,
				version: NEW,
				electron: ELECTRON,
				app: { name: `GodlyPanel-${NEW}-app.zip`, size: APP.length, sha256: sha(APP) },
				full: { name: `GodlyPanel-${NEW}-win.zip`, size: FULL.length, sha256: sha(FULL) },
			}),
		);

	/**
	 * Serve a release. `signedBy` signs the manifest as published; `served` is what is actually published as the manifest if it
	 * differs from what was signed (someone edited it afterwards); `sig: false` publishes no signature; `manifest: false` no manifest.
	 */
	function serve({ signedBy = maker, served = null, sig = true, manifest = true, notes = "" } = {}) {
		const text = manifestText();
		const assets = { [`GodlyPanel-${NEW}-app.zip`]: APP, [`GodlyPanel-${NEW}-win.zip`]: FULL };
		if (manifest) assets["update-manifest.json"] = Buffer.from(served ?? text);
		if (manifest && sig) assets["update-manifest.json.sig"] = Buffer.from(`${signManifest(text, signedBy.privatePem)}\n`);
		release = { assets, notes };
	}

	const check = async (p = api) => (await p.post("/api/updates/panel/check", {})).json;

	const panelEnv = (extra = {}) => ({
		GHP_UPDATE_API: base,
		GHP_APP_VERSION: OLD,
		GHP_SELF_UPDATE: "1",
		GHP_APP_DIR: work,
		GHP_APP_EXE: path.join(work, "GodlyPanel.exe"),
		GHP_ELECTRON_VERSION: ELECTRON,
		...extra,
	});

	before(async () => {
		work = fs.mkdtempSync(path.join(os.tmpdir(), "gp-signed-"));
		fs.writeFileSync(path.join(work, "GodlyPanel.exe"), "the installed exe");
		const port = await freePort();
		base = `http://127.0.0.1:${port}`;
		github = http.createServer((req, res) => {
			if (req.url.startsWith("/repos/")) {
				res.setHeader("Content-Type", "application/json");
				if (!release) return res.end("[]");
				return res.end(
					JSON.stringify([
						{
							tag_name: `v${NEW}`,
							name: `GodlyPanel ${NEW}`,
							prerelease: true,
							published_at: "2026-10-05T00:00:00Z",
							body: release.notes,
							assets: Object.entries(release.assets).map(([name, buf]) => ({ name, size: buf.length, browser_download_url: `${base}/dl/${name}` })),
						},
					]),
				);
			}
			const file = release?.assets[decodeURIComponent(req.url.replace(/^\/dl\//, ""))];
			if (!file) {
				res.statusCode = 404;
				return res.end();
			}
			res.end(file);
		});
		await new Promise((resolve) => github.listen(port, "127.0.0.1", resolve));
		panel = await startInstance({ ipc: true, config: { updates: { check: false, includePrereleases: true, repo: "test/repo" } }, env: panelEnv({ GHP_UPDATE_PUBLIC_KEY: maker.publicKey }) });
		api = panel.api;
	});
	after(async () => {
		await panel.stop();
		await new Promise((resolve) => github.close(resolve));
		fs.rmSync(work, { recursive: true, force: true });
	});

	it("offers a release the maker signed, and says so", async () => {
		serve();
		const s = await check();
		assert.equal(s.available, true);
		assert.equal(s.selfUpdate.signature, "valid");
		assert.equal(s.selfUpdate.plan.kind, "app");
		assert.equal(s.selfUpdate.plan.size, APP.length);
	});

	it("will not install a release that has no signature, and says why", async () => {
		serve({ sig: false });
		const s = await check();
		assert.equal(s.selfUpdate.signature, "missing");
		assert.equal(s.selfUpdate.plan, null);
		const r = await api.post("/api/updates/panel/install", {});
		assert.equal(r.status, 400);
		assert.match(r.json.error, /isn't signed by the project/);
	});

	it("will not install one signed with a key it doesn't know", async () => {
		serve({ signedBy: stranger });
		const s = await check();
		assert.equal(s.selfUpdate.signature, "invalid");
		assert.equal(s.selfUpdate.plan, null);
		const r = await api.post("/api/updates/panel/install", {});
		assert.equal(r.status, 400);
		assert.match(r.json.error, /signature doesn't match/);
	});

	it("will not install one whose manifest was edited after it was signed, even to point at a different download", async () => {
		const evil = Buffer.from("not the real package");
		serve({ served: manifestText((m) => ({ ...m, app: { ...m.app, size: evil.length, sha256: sha(evil) } })) });
		const s = await check();
		assert.equal(s.selfUpdate.signature, "invalid");
		assert.equal(s.selfUpdate.plan, null);
	});

	it("will not fall back on the checksum in the release notes, which whoever can edit the release can change", async () => {
		serve({ manifest: false, notes: `SHA-256 of GodlyPanel-${NEW}-win.zip: ${sha(FULL)}` });
		const s = await check();
		assert.equal(s.selfUpdate.plan, null);
		assert.equal((await api.post("/api/updates/panel/install", {})).status, 400);
	});

	it("will not install a signed manifest that belongs to a different release", async () => {
		// A genuine, signed manifest for another version, republished under this release's tag.
		const old = manifestText((m) => ({ ...m, version: "0.1.0-alpha.1" }));
		release = { assets: { ...release.assets, "update-manifest.json": Buffer.from(old), "update-manifest.json.sig": Buffer.from(signManifest(old, maker.privatePem)) }, notes: "" };
		const s = await check();
		assert.equal(s.selfUpdate.plan, null, "its own version has to match the release's");
	});

	it("uses the key built into the app unless told otherwise: the maker's test key is not it", async () => {
		const real = await startInstance({ ipc: true, config: { updates: { check: false, includePrereleases: true, repo: "test/repo" } }, env: panelEnv() });
		try {
			serve(); // signed with the test key, which this copy was not given
			const s = await check(real.api);
			assert.equal(s.selfUpdate.signature, "invalid");
			assert.equal(s.selfUpdate.plan, null);
		} finally {
			await real.stop();
		}
	});

	it("is still waived for the tests that serve their own unsigned releases", async () => {
		const lax = await startInstance({ ipc: true, config: { updates: { check: false, includePrereleases: true, repo: "test/repo" } }, env: panelEnv({ GHP_UPDATE_UNSIGNED_OK: "1" }) });
		try {
			serve({ sig: false });
			const s = await check(lax.api);
			assert.ok(s.selfUpdate.plan, "an unsigned release is accepted when the test says so");
		} finally {
			await lax.stop();
		}
	});
});

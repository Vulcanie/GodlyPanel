import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";
import { createZip } from "../../src/server/util/tarZip.js";

// "Update now", up to the point where the desktop app takes over. A stand-in for GitHub serves a release; the panel
// (given an IPC channel, as the desktop app gives it) picks the small or the whole download, fetches it, checks it, unpacks
// it, and hands it to the app; and refuses at every step where something is off: a checksum that doesn't match, files
// that aren't what their own list says, work in progress, a copy that isn't the installed app.

async function until(check, { timeoutMs = 30_000, everyMs = 250 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const NEW = "0.1.0-alpha.99";
const OLD = "0.1.0-alpha.12";
const ELECTRON = "44.4.5";

describe("installing an update from inside the app", () => {
	let work;
	let appDir;
	let github;
	let base;
	let release; // what the stand-in serves: { assets: { name: Buffer }, body, tag }
	let panel;
	let api;
	let builds = 0;

	const status = async () => (await api.get("/api/updates/panel")).json;
	const check = async () => (await api.post("/api/updates/panel/check", {})).json;
	const install = () => api.post("/api/updates/panel/install", {});
	const applyMessages = () => panel.messages.filter((m) => m.type === "apply-update");

	// The app-only download, as scripts/make-update-payload.mjs makes it.
	async function appZip({ electron = ELECTRON, version = NEW, tamper = false, stray = false } = {}) {
		const dir = path.join(work, `build-${++builds}`);
		const files = { "resources/app.asar": `asar of ${version}`, "resources/scripts/apply-update.ps1": "# the script", "resources/templates/neoforge/start.bat": "@echo off" };
		for (const [rel, text] of Object.entries(files)) {
			fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
			fs.writeFileSync(path.join(dir, rel), text);
		}
		const manifest = { format: 1, version, electron, files: Object.entries(files).map(([p, t]) => ({ path: p, size: Buffer.byteLength(t), sha256: sha(t) })).sort((a, b) => (a.path < b.path ? -1 : 1)) };
		fs.writeFileSync(path.join(dir, "update-manifest.json"), JSON.stringify(manifest));
		if (tamper) fs.writeFileSync(path.join(dir, "resources", "app.asar"), "something else entirely");
		const entries = [{ dir, name: "resources" }, { dir, name: "update-manifest.json" }];
		if (stray) {
			fs.writeFileSync(path.join(dir, "evil.dll"), "not part of the app");
			entries.push({ dir, name: "evil.dll" });
		}
		const out = path.join(work, `GodlyPanel-${version}-app.zip.${builds}`);
		await createZip(out, entries);
		return fs.readFileSync(out);
	}

	// The whole package, as electron-builder makes it (names only; the contents are stand-ins).
	async function fullZip(version = NEW) {
		const dir = path.join(work, `full-${++builds}`);
		fs.mkdirSync(path.join(dir, "resources"), { recursive: true });
		fs.mkdirSync(path.join(dir, "data"), { recursive: true });
		fs.writeFileSync(path.join(dir, "GodlyPanel.exe"), `exe of ${version}`);
		fs.writeFileSync(path.join(dir, "resources", "app.asar"), `asar of ${version}`);
		fs.writeFileSync(path.join(dir, "data", "portable.txt"), "");
		const out = path.join(work, `full-${builds}.zip`);
		await createZip(out, [{ dir, name: "GodlyPanel.exe" }, { dir, name: "resources" }, { dir, name: "data" }]);
		return fs.readFileSync(out);
	}

	// Serve a release made of these files. `manifest: false` leaves the manifest out (as every earlier release did);
	// `claims` changes what the manifest says about a file, to catch a download that isn't what was promised.
	function serve({ app, full, electron = ELECTRON, manifest = true, notes = "", claims = {} }) {
		const assets = {};
		const m = { format: 1, version: NEW, electron };
		if (app) {
			assets[`GodlyPanel-${NEW}-app.zip`] = app;
			m.app = { name: `GodlyPanel-${NEW}-app.zip`, size: app.length, sha256: sha(app), ...claims.app };
		}
		if (full) {
			assets[`GodlyPanel-${NEW}-win.zip`] = full;
			m.full = { name: `GodlyPanel-${NEW}-win.zip`, size: full.length, sha256: sha(full), ...claims.full };
		}
		if (manifest) assets["update-manifest.json"] = Buffer.from(JSON.stringify(m));
		release = { tag: `v${NEW}`, assets, notes };
	}

	before(async () => {
		work = fs.mkdtempSync(path.join(os.tmpdir(), "gp-selfupdate-"));
		appDir = path.join(work, "installed");
		fs.mkdirSync(appDir, { recursive: true });
		fs.writeFileSync(path.join(appDir, "GodlyPanel.exe"), "the installed exe");

		const port = await freePort();
		base = `http://127.0.0.1:${port}`;
		github = http.createServer((req, res) => {
			if (req.url.startsWith("/repos/")) {
				res.setHeader("Content-Type", "application/json");
				if (!release) return res.end("[]");
				return res.end(
					JSON.stringify([
						{
							tag_name: release.tag,
							name: `GodlyPanel ${NEW}`,
							prerelease: true,
							published_at: "2026-10-05T00:00:00Z",
							html_url: `${base}/release`,
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

		panel = await startInstance({
			ipc: true,
			config: { updates: { check: false, includePrereleases: true, repo: "test/repo" } },
			env: {
				GHP_UPDATE_API: base,
				GHP_APP_VERSION: OLD,
				GHP_SELF_UPDATE: "1",
				GHP_APP_DIR: appDir,
				GHP_APP_EXE: path.join(appDir, "GodlyPanel.exe"),
				GHP_ELECTRON_VERSION: ELECTRON,
			},
		});
		api = panel.api;
	});
	after(async () => {
		await panel.stop();
		await new Promise((resolve) => github.close(resolve));
		fs.rmSync(work, { recursive: true, force: true });
	});

	it("says this copy can update itself, and how big the update is", async () => {
		serve({ app: await appZip(), full: await fullZip() });
		const s = await check();
		assert.equal(s.available, true);
		assert.equal(s.selfUpdate.support.ok, true);
		assert.equal(s.selfUpdate.plan.kind, "app", "the small one, since the release was built on the Electron that is running");
		assert.equal(s.selfUpdate.plan.size, release.assets[`GodlyPanel-${NEW}-app.zip`].length);
		assert.equal(s.selfUpdate.install.phase, "idle");
	});

	it("downloads the small update, checks it, unpacks it and hands it to the app", async () => {
		const r = await install();
		assert.equal(r.status, 202, JSON.stringify(r.json));
		assert.equal(await until(() => applyMessages().length === 1), true, JSON.stringify(await status()));
		const m = applyMessages()[0];
		assert.equal(m.mode, "app");
		assert.equal(m.version, NEW);
		assert.ok(m.stageDir.startsWith(path.join(panel.dir, "updates")), m.stageDir);
		assert.equal(fs.readFileSync(path.join(m.stageDir, "resources", "app.asar"), "utf8"), `asar of ${NEW}`);
		assert.ok(m.files.every((f) => fs.existsSync(f)), "the downloaded file is there for the script to remove afterwards");
		assert.equal((await status()).selfUpdate.install.phase, "restarting");
	});

	it("won't start a second update while one is under way", async () => {
		const r = await install();
		assert.equal(r.status, 409);
		assert.match(r.json.error, /already under way/);
	});

	it("shows the app's refusal, if it gives one", async () => {
		panel.send({ type: "update-refused", reason: "The desktop app said no." });
		assert.equal(await until(async () => (await status()).selfUpdate.install.phase === "failed"), true);
		const s = await status();
		assert.match(s.selfUpdate.install.error, /desktop app said no/);
		const log = (await api.get("/api/activity?limit=50")).json;
		assert.ok(log.some((e) => e.type === "panel.update_failed"), "and it is in the activity log");
		assert.deepEqual(fs.readdirSync(path.join(panel.dir, "updates")).filter((n) => n.startsWith("stage-") || n.endsWith(".partial")).length > 0, true, "(its files stay until the next start tidies them)");
	});

	// The real app closes the panel at this point; here the test has the app say no, which frees it for the next one.
	async function giveUp() {
		panel.send({ type: "update-refused", reason: "test is done with this one" });
		assert.equal(await until(async () => (await status()).selfUpdate.install.phase === "failed"), true);
	}

	async function failsWith(pattern) {
		const before = applyMessages().length;
		const r = await install();
		assert.equal(r.status, 202, JSON.stringify(r.json));
		assert.equal(await until(async () => (await status()).selfUpdate.install.phase === "failed"), true, JSON.stringify((await status()).selfUpdate.install));
		const error = (await status()).selfUpdate.install.error;
		assert.match(error, pattern);
		assert.equal(applyMessages().length, before, "nothing was handed to the app");
		const updates = path.join(panel.dir, "updates");
		assert.equal(fs.readdirSync(updates).some((n) => n.endsWith(".partial")), false, "no half-download left");
		assert.equal(fs.readdirSync(updates).some((n) => n === `stage-${NEW}`), false, "nothing unpacked left");
	}

	it("refuses a download that doesn't match the checksum the release published", async () => {
		const good = await appZip();
		serve({ app: good, claims: { app: { sha256: sha("something else") } } });
		await check();
		await failsWith(/doesn't match the checksum/);
	});

	it("refuses a download of the wrong size", async () => {
		serve({ app: await appZip(), claims: { app: { size: 12345 } } });
		await check();
		await failsWith(/should be 12345|larger than it should be/);
	});

	it("refuses files that aren't what the archive's own list says", async () => {
		serve({ app: await appZip({ tamper: true }) });
		await check();
		await failsWith(/isn't what its list says/);
	});

	it("refuses an app update that carries anything but the app's own files", async () => {
		serve({ app: await appZip({ stray: true }) });
		await check();
		await failsWith(/evil\.dll/);
	});

	it("refuses an app update built for a different Electron than the one running", async () => {
		serve({ app: await appZip({ electron: "99.0.0" }), electron: ELECTRON });
		await check();
		await failsWith(/different Electron/);
	});

	it("uses the whole package when the release moved to a different Electron", async () => {
		serve({ app: await appZip({ electron: "99.0.0" }), full: await fullZip(), electron: "99.0.0" });
		const s = await check();
		assert.equal(s.selfUpdate.plan.kind, "full");
		assert.ok(s.selfUpdate.plan.size > 0);
		const before = applyMessages().length;
		const r = await install();
		assert.equal(r.status, 202, JSON.stringify(r.json));
		assert.equal(await until(() => applyMessages().length === before + 1), true, JSON.stringify((await status()).selfUpdate.install));
		const m = applyMessages().at(-1);
		assert.equal(m.mode, "full");
		assert.equal(fs.readFileSync(path.join(m.stageDir, "GodlyPanel.exe"), "utf8"), `exe of ${NEW}`);
		await giveUp();
	});

	it("refuses a whole package with no exe in it", async () => {
		const dir = path.join(work, "no-exe");
		fs.mkdirSync(path.join(dir, "resources"), { recursive: true });
		fs.writeFileSync(path.join(dir, "resources", "app.asar"), "x");
		const out = path.join(work, "no-exe.zip");
		await createZip(out, [{ dir, name: "resources" }]);
		serve({ full: fs.readFileSync(out), electron: "99.0.0" });
		await check();
		await failsWith(/no GodlyPanel\.exe/);
	});

	it("uses the whole package and the release notes' checksum for a release with no manifest", async () => {
		const full = await fullZip();
		serve({ full, manifest: false, notes: `SHA-256 of GodlyPanel-${NEW}-win.zip: ${sha(full)}` });
		// With no manifest the zip is found by its name, as before.
		const s = await check();
		assert.equal(s.selfUpdate.plan?.kind, "full");
	});

	it("won't install a release that gives no checksum at all", async () => {
		serve({ full: await fullZip(), manifest: false, notes: "No checksum here." });
		const s = await check();
		assert.equal(s.selfUpdate.plan, null);
		const r = await install();
		assert.equal(r.status, 400);
		assert.match(r.json.error, /no checksum/);
	});

	it("refuses while a server is starting, and says what it is waiting for", async () => {
		const rconPort = await freePort();
		const busy = await startInstance({
			ipc: true,
			servers: (dir) => [makeFakeGame(path.join(dir, "fake-busy"), { name: "Fake Busy", rconPort, exe: "gp-fake-busy.exe" })],
			config: { updates: { check: false, includePrereleases: true, repo: "test/repo" } },
			env: { GHP_UPDATE_API: base, GHP_APP_VERSION: OLD, GHP_SELF_UPDATE: "1", GHP_APP_DIR: appDir, GHP_APP_EXE: path.join(appDir, "GodlyPanel.exe"), GHP_ELECTRON_VERSION: ELECTRON },
		});
		try {
			serve({ app: await appZip() });
			await busy.api.post("/api/updates/panel/check", {});
			assert.equal((await busy.api.post("/api/control/Fake%20Busy/start")).status, 200);
			const refused = await until(async () => {
				const r = await busy.api.post("/api/updates/panel/install", {});
				return r.status === 409 ? r : null;
			}, { timeoutMs: 15_000, everyMs: 100 });
			assert.ok(refused, "refused with 409 while the server was starting");
			assert.match(refused.json.error, /Fake Busy/);
			assert.equal(busy.messages.filter((m) => m.type === "apply-update").length, 0);
		} finally {
			// The server was still starting when the checks ended. Let that finish, so there is a process to find, then clean
			// up before and after the panel goes (the start script may launch it a moment after the panel is told to stop).
			const folder = path.join(busy.dir, "fake-busy");
			await until(async () => !(await busy.api.get("/api/operations").catch(() => ({ json: {} }))).json["Fake Busy"], { timeoutMs: 30_000 });
			killFakeGames(folder);
			await busy.stop();
			await sleep(500);
			killFakeGames(folder);
		}
	});
});

describe("a copy that can't replace itself", () => {
	it("says why, and refuses, when it isn't the installed app", async () => {
		const panel = await startInstance({ config: { updates: { check: false, repo: "test/repo" } } });
		try {
			const s = (await panel.api.get("/api/updates/panel")).json;
			assert.equal(s.selfUpdate.support.ok, false);
			assert.match(s.selfUpdate.support.reason, /running from source/);
			const r = await panel.api.post("/api/updates/panel/install", {});
			assert.equal(r.status, 400);
			assert.match(r.json.error, /running from source/);
		} finally {
			await panel.stop();
		}
	});

	it("says so when it has no desktop app to restart it", async () => {
		const panel = await startInstance({ env: { GHP_SELF_UPDATE: "1", GHP_APP_DIR: os.tmpdir(), GHP_APP_EXE: path.join(os.tmpdir(), "GodlyPanel.exe") } });
		try {
			const s = (await panel.api.get("/api/updates/panel")).json;
			assert.equal(s.selfUpdate.support.ok, false);
			assert.match(s.selfUpdate.support.reason, /can't reach the desktop app/);
		} finally {
			await panel.stop();
		}
	});

	it("is for administrators only", async () => {
		const panel = await startInstance({});
		try {
			const guest = await panel.api.cookieFor({ username: "viewer", password: "TestGuest!2345" });
			const r = await panel.api.post("/api/updates/panel/install", {}, { cookie: guest });
			assert.equal(r.status, 403);
		} finally {
			await panel.stop();
		}
	});
});

describe("what the panel says after an update", () => {
	const result = (over) => ({ ok: true, version: NEW, from: OLD, message: `Updated from ${OLD} to ${NEW}.`, rolledBack: false, at: "2026-10-05T01:00:00.000Z", ...over });

	async function boot(outcome) {
		return startInstance({
			env: { GHP_APP_VERSION: NEW },
			prepare: (dir) => {
				fs.mkdirSync(path.join(dir, "state"), { recursive: true });
				if (outcome) fs.writeFileSync(path.join(dir, "state", "update-result.json"), JSON.stringify(outcome));
				// Left behind by an update that was cut short.
				fs.mkdirSync(path.join(dir, "updates", "stage-0.0.1"), { recursive: true });
				fs.writeFileSync(path.join(dir, "updates", "GodlyPanel-0.0.1-app.zip.partial"), "half");
			},
		});
	}

	it("reports an update that worked, once, and says this version is up", async () => {
		const panel = await boot(result({}));
		try {
			const s = (await panel.api.get("/api/updates/panel")).json;
			assert.equal(s.selfUpdate.lastUpdate.ok, true);
			assert.equal(s.selfUpdate.lastUpdate.version, NEW);
			const log = (await panel.api.get("/api/activity?limit=50")).json;
			assert.ok(log.some((e) => e.type === "panel.updated"));
			const health = JSON.parse(fs.readFileSync(path.join(panel.dir, "state", "update-health.json"), "utf8"));
			assert.equal(health.version, NEW, "the marker the update script waits for");
			assert.equal(fs.existsSync(path.join(panel.dir, "state", "update-result.json")), false, "the result file is consumed");
			assert.equal(fs.existsSync(path.join(panel.dir, "updates", "stage-0.0.1")), false, "and what an earlier update left is tidied away");
			assert.equal(fs.existsSync(path.join(panel.dir, "updates", "GodlyPanel-0.0.1-app.zip.partial")), false);
			assert.equal((await panel.api.post("/api/updates/panel/update-result/dismiss", {})).status, 200);
			assert.equal((await panel.api.get("/api/updates/panel")).json.selfUpdate.lastUpdate, null, "and can be dismissed");
		} finally {
			await panel.stop();
		}
	});

	it("picks up the verdict when the update script writes it after the new version has started", async () => {
		const panel = await boot(null);
		try {
			assert.equal((await panel.api.get("/api/updates/panel")).json.selfUpdate.lastUpdate, null, "nothing yet");
			// The script writes it only once this version has reported healthy, which is after this version started.
			fs.writeFileSync(path.join(panel.dir, "state", "update-result.json"), JSON.stringify(result({})));
			const s = (await panel.api.get("/api/updates/panel")).json;
			assert.equal(s.selfUpdate.lastUpdate.ok, true);
			assert.equal(s.selfUpdate.lastUpdate.version, NEW);
			assert.ok((await panel.api.get("/api/activity?limit=50")).json.some((e) => e.type === "panel.updated"));
		} finally {
			await panel.stop();
		}
	});

	it("reports an update that was undone because the new version didn't start", async () => {
		const panel = await boot(result({ ok: false, rolledBack: true, message: `Version ${NEW} didn't start properly (it closed again straight after starting), so ${OLD} was put back.` }));
		try {
			const s = (await panel.api.get("/api/updates/panel")).json;
			assert.equal(s.selfUpdate.lastUpdate.ok, false);
			assert.equal(s.selfUpdate.lastUpdate.rolledBack, true);
			assert.match(s.selfUpdate.lastUpdate.message, /put back/);
			const log = (await panel.api.get("/api/activity?limit=50")).json;
			assert.ok(log.some((e) => e.type === "panel.update_failed" && e.level === "error"));
		} finally {
			await panel.stop();
		}
	});
});

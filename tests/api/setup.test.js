import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, tempDir, removeDir, ADMIN } from "../helpers/instance.js";

// First run: choosing where servers live before the account exists, the
// loopback-only setup routes, settings validation, and how errors are reported.

const onWindows = process.platform === "win32";
const windowsDir = process.env.SystemRoot ?? "C:\\Windows";

describe("first-run setup", { skip: !onWindows && "Windows paths" }, () => {
	let panel;
	let api;
	let chosen;

	before(async () => {
		panel = await startInstance({ admin: false });
		api = panel.api;
		chosen = path.join(tempDir("chosen"), "GameServers");
	});
	after(() => {
		panel.stop();
		removeDir(path.dirname(chosen));
	});

	it("says a setup is needed, and signing in before it exists is refused clearly", async () => {
		assert.equal((await api.get("/api/setup/status")).json.setupRequired, true);
		const login = await api.post("/api/auth/login", ADMIN);
		assert.equal(login.status, 409);
		assert.equal(login.json.code, "setup_required");
	});

	it("offers the default folder, inside the app's own data directory", async () => {
		const r = await api.get("/api/setup/folder-defaults");
		assert.equal(r.status, 200);
		assert.equal(r.json.resolved, path.join(panel.dir, "servers"));
		assert.equal(r.json.insideAppFolder, true);
		assert.equal(r.json.ok, true);
	});

	it("checks a folder without creating it", async () => {
		const r = await api.post("/api/setup/check-folder", { path: chosen });
		assert.equal(r.json.ok, true);
		assert.equal(r.json.exists, false);
		assert.equal(fs.existsSync(chosen), false);
	});

	it("rejects an unusable folder, and doesn't leave a half-finished setup behind", async () => {
		const r = await api.post("/api/setup/admin", { ...ADMIN, serversRoot: path.join(windowsDir, "servers") });
		assert.equal(r.status, 400);
		assert.match(r.json.error, /Windows folder/);
		assert.equal((await api.get("/api/setup/status")).json.setupRequired, true, "no account was created");
	});

	it("creates the account and remembers the chosen folder", async () => {
		const r = await api.post("/api/setup/admin", { ...ADMIN, serversRoot: chosen });
		assert.equal(r.status, 200);
		const config = JSON.parse(fs.readFileSync(path.join(panel.dir, "config.json"), "utf8"));
		assert.equal(config.paths.serversRoot, chosen);
	});

	it("closes the first-run routes afterwards", async () => {
		const anonymous = { cookie: "" };
		assert.equal((await api.get("/api/setup/folder-defaults", anonymous)).status, 409);
		assert.equal((await api.post("/api/setup/check-folder", { path: chosen }, anonymous)).status, 409);
	});

	describe("settings", () => {
		it("refuses a server folder that can't work", async () => {
			const relative = await api.put("/api/settings", { paths: { serversRoot: "servers" } });
			assert.equal(relative.status, 400);
			assert.match(relative.json.error, /full path/);
			const system = await api.put("/api/settings", { paths: { serversRoot: windowsDir } });
			assert.equal(system.status, 400);
		});

		it("on the create page a blank box means the configured folder, in settings it means the built-in default", async () => {
			const create = await api.post("/api/settings/check-folder", { path: "", blankUsesConfigured: true });
			assert.equal(create.json.resolved, chosen);
			const settings = await api.post("/api/settings/check-folder", { path: "" });
			assert.equal(settings.json.resolved, path.join(panel.dir, "servers"));
		});

		it("clamps an out-of-range number and reports what needs a restart", async () => {
			const r = await api.put("/api/settings", { http: { port: 99999 } });
			assert.equal(r.status, 200);
			assert.ok(r.json.restartRequired.includes("http.port"));
			const now = (await api.get("/api/settings")).json.config;
			assert.equal(now.http.port, 65535);
		});

		it("keeps keys and webhooks out of the readable settings", async () => {
			await api.put("/api/settings/secrets", { discordWebhookUrl: "https://discord.com/api/webhooks/1/secret-token" });
			const view = (await api.get("/api/settings")).json;
			assert.equal(JSON.stringify(view).includes("secret-token"), false);
			assert.equal(view.secrets.discordWebhookUrl, true, "only reports that one is set");
			assert.equal(fs.readFileSync(path.join(panel.dir, "config.json"), "utf8").includes("secret-token"), false);
		});
	});

	describe("error handling", () => {
		it("answers malformed JSON with a JSON error, not an HTML page with a stack trace", async () => {
			const res = await fetch(`${panel.base}/api/settings`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", Cookie: api.cookie },
				body: '{"broken":',
			});
			assert.equal(res.status, 400);
			const body = await res.text();
			assert.doesNotMatch(body, /<html|node_modules|at .*\.js/i);
			assert.match(JSON.parse(body).error, /valid JSON/);
		});

		it("answers an unknown API route with JSON", async () => {
			const r = await api.get("/api/definitely-not-a-route");
			assert.equal(r.status, 404);
			assert.equal(typeof r.json.error, "string");
		});
	});
});

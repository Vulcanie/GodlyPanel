import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { compareVersions, checksumFromNotes } from "../../src/server/services/panelUpdate.js";

// "Is there a newer GodlyPanel?" against a stand-in for GitHub's releases list:
// it notices a newer version (and not an older or identical one), tells you once,
// downloads the zip, checks it against the checksum in the release notes, and
// refuses a download that doesn't match.

async function until(check, { timeoutMs = 30_000, everyMs = 300 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("version comparison", () => {
	it("orders releases and pre-releases the way semver does", () => {
		const order = ["0.1.0-alpha.2", "0.1.0-alpha.10", "0.1.0-beta.1", "0.1.0", "0.1.1", "0.2.0", "1.0.0"];
		for (let i = 0; i < order.length; i += 1) {
			for (let j = 0; j < order.length; j += 1) {
				assert.equal(compareVersions(order[i], order[j]), Math.sign(i - j), `${order[i]} vs ${order[j]}`);
			}
		}
		assert.equal(compareVersions("v0.1.0", "0.1.0"), 0);
		assert.equal(compareVersions("junk", "0.1.0"), 0);
	});

	it("finds the checksum the release notes give for a file", () => {
		const notes = "### Verify\n\nSHA-256 of `GodlyPanel-0.2.0-win.zip`:\n\n```\n" + "a".repeat(64) + "\n```\n";
		assert.equal(checksumFromNotes(notes, "GodlyPanel-0.2.0-win.zip"), "a".repeat(64));
		assert.equal(checksumFromNotes(notes, "Other.zip"), null);
		assert.equal(checksumFromNotes("", "x.zip"), null);
	});
});

describe("checking for and fetching a new version", () => {
	let panel;
	let api;
	let github;
	let zip;
	let releases;

	before(async () => {
		zip = crypto.randomBytes(200_000);
		const sha = crypto.createHash("sha256").update(zip).digest("hex");
		const port = await freePort();
		const url = `http://127.0.0.1:${port}`;
		const release = (tag, extra = {}) => ({
			tag_name: tag,
			name: `GodlyPanel ${tag.replace(/^v/, "")}`,
			prerelease: tag.includes("-"),
			draft: false,
			published_at: "2026-10-01T00:00:00Z",
			html_url: `${url}/release/${tag}`,
			body: `Notes for ${tag}.\n\nSHA-256 of \`GodlyPanel-${tag.replace(/^v/, "")}-win.zip\`:\n\n\`\`\`\n${sha}\n\`\`\`\n`,
			assets: [{ name: `GodlyPanel-${tag.replace(/^v/, "")}-win.zip`, size: zip.length, browser_download_url: `${url}/download/${tag}.zip` }],
			...extra,
		});
		releases = [release("v0.1.0-alpha.1"), release("v0.1.0-alpha.2"), release("v0.1.0-alpha.3"), release("v0.0.9", { draft: true })];
		github = http.createServer((req, res) => {
			if (req.url.startsWith("/repos/")) {
				res.setHeader("Content-Type", "application/json");
				return res.end(JSON.stringify(releases));
			}
			if (req.url === "/download/v0.1.0-alpha.3.zip") return res.end(zip);
			if (req.url === "/download/v0.1.0-alpha.9.zip") return res.end(Buffer.concat([zip, Buffer.from("tampered")]));
			res.statusCode = 404;
			res.end();
		});
		await new Promise((r) => github.listen(port, "127.0.0.1", r));

		panel = await startInstance({
			env: { GHP_UPDATE_API: url, GHP_APP_VERSION: "0.1.0-alpha.2" },
			config: { updates: { check: false } },
		});
		api = panel.api;
	});
	after(async () => {
		await panel.stop();
		await new Promise((r) => github.close(r));
	});

	it("knows which version it is, and hasn't looked yet", async () => {
		const s = (await api.get("/api/updates/panel")).json;
		assert.equal(s.current, "0.1.0-alpha.2");
		assert.equal(s.latest, null);
		assert.equal(s.available, false);
		assert.equal(s.enabled, false);
	});

	it("finds a newer version, ignoring drafts, and gives its notes and checksum", async () => {
		const s = (await api.post("/api/updates/panel/check", {})).json;
		assert.equal(s.error, null);
		assert.equal(s.available, true);
		assert.equal(s.latest.version, "0.1.0-alpha.3");
		assert.match(s.latest.notes, /Notes for v0.1.0-alpha.3/);
		assert.equal(s.latest.asset.name, "GodlyPanel-0.1.0-alpha.3-win.zip");
		assert.equal(s.latest.asset.sha256.length, 64);
	});

	it("tells you once, in the activity log", async () => {
		await api.post("/api/updates/panel/check", {});
		const events = (await api.get("/api/activity?types=panel.update_available")).json;
		assert.equal(events.length, 1);
		assert.match(events[0].message, /0\.1\.0-alpha\.3 is available \(you have 0\.1\.0-alpha\.2\)/);
	});

	it("downloads it, verifies it, and keeps it in the data folder", async () => {
		assert.equal((await api.post("/api/updates/panel/download", {})).status, 202);
		const done = await until(async () => (await api.get("/api/updates/panel")).json.download?.status === "done");
		assert.ok(done);
		const d = (await api.get("/api/updates/panel")).json.download;
		assert.equal(d.verified, true);
		assert.ok(fs.readFileSync(path.join(panel.dir, "updates", "GodlyPanel-0.1.0-alpha.3-win.zip")).equals(zip));
		assert.equal(fs.readdirSync(path.join(panel.dir, "updates")).some((f) => f.endsWith(".partial")), false);
	});

	it("says nothing is new when it is up to date or ahead", async () => {
		releases = releases.slice(0, 2);
		const s = (await api.post("/api/updates/panel/check", {})).json;
		assert.equal(s.latest.version, "0.1.0-alpha.2");
		assert.equal(s.available, false);
	});

	it("refuses a download that doesn't match its checksum, and deletes it", async () => {
		const bad = { ...releases[0], tag_name: "v0.1.0-alpha.9", assets: [{ name: "GodlyPanel-0.1.0-alpha.9-win.zip", size: zip.length, browser_download_url: releases[0].assets[0].browser_download_url.replace("alpha.1", "alpha.9") }] };
		bad.body = releases[0].body.replace(/alpha\.1/g, "alpha.9");
		releases = [bad];
		assert.equal((await api.post("/api/updates/panel/check", {})).json.latest.version, "0.1.0-alpha.9");
		await api.post("/api/updates/panel/download", {});
		await until(async () => (await api.get("/api/updates/panel")).json.download?.status === "failed");
		const d = (await api.get("/api/updates/panel")).json.download;
		assert.match(d.error, /doesn't match the checksum/);
		assert.equal(fs.existsSync(path.join(panel.dir, "updates", "GodlyPanel-0.1.0-alpha.9-win.zip")), false);
	});

	it("records a failure to reach GitHub instead of crashing", async () => {
		await new Promise((r) => github.close(r));
		const s = (await api.post("/api/updates/panel/check", {})).json;
		assert.ok(s.error);
		github = http.createServer();
	});

	it("is for admins only", async () => {
		await api.post("/api/users", { username: "modu", password: "TestMod!2345", role: "moderator" });
		const mod = await api.cookieFor({ username: "modu", password: "TestMod!2345" });
		assert.equal((await api.get("/api/updates/panel", { cookie: mod })).status, 403);
		assert.equal((await api.post("/api/updates/panel/download", {}, { cookie: mod })).status, 403);
	});
});

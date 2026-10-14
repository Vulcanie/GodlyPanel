import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { serverEntry } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// Modpack uploads (kept on disk while they arrive, checked before they are used, never found by an id that is a path), and the
// numbers a backup's keep rules accept.

const pack = (overrides = "overrides") => {
	const zip = new AdmZip();
	zip.addFile("manifest.json", Buffer.from(JSON.stringify({ name: "Pack", minecraft: { version: "1.20.1", modLoaders: [{ id: "forge-47.1.0", primary: true }] }, files: [], overrides })));
	zip.addFile("overrides/config/a.toml", Buffer.from("a=1"));
	return zip.toBuffer();
};

describe("uploads and limits", () => {
	let panel;
	let api;

	before(async () => {
		panel = await startInProcess({
			servers: (dir) => {
				fs.writeFileSync(path.join(dir, "main.ini"), "a=1\n");
				return [serverEntry(dir, { name: "Alpha", processName: "nope.exe", configPaths: { Main: path.join(dir, "main.ini") } })];
			},
		});
		api = panel.api;
	});
	after(() => panel.stop());

	const incoming = () => {
		try {
			return fs.readdirSync(path.join(panel.dir, "uploads", "incoming"));
		} catch {
			return [];
		}
	};

	it("takes a modpack zip, and leaves no copy of the upload lying about", async () => {
		const r = await api.upload("/api/uploads/modpack", "modpackZip", "pack.zip", pack());
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(r.json.modLoaderFamily, "forge");
		assert.equal(r.json.hasOverrides, true);
		assert.match(r.json.uploadId, /^modpack-\d+-[0-9a-f]{8}$/);
		assert.deepEqual(incoming(), []);
	});

	it("refuses something that isn't a modpack, and leaves nothing behind", async () => {
		const before = fs.readdirSync(path.join(panel.dir, "uploads"));
		const plain = await api.upload("/api/uploads/modpack", "modpackZip", "pack.zip", Buffer.from("this is not a zip"));
		assert.equal(plain.status, 400);
		const other = new AdmZip();
		other.addFile("readme.txt", Buffer.from("hello"));
		const noManifest = await api.upload("/api/uploads/modpack", "modpackZip", "pack.zip", other.toBuffer());
		assert.equal(noManifest.status, 400);
		assert.match(noManifest.json.error, /manifest\.json/);
		assert.deepEqual(incoming(), []);
		assert.deepEqual(fs.readdirSync(path.join(panel.dir, "uploads")).sort(), before.sort());
	});

	it("doesn't follow an upload id that is a path", async () => {
		const r = await api.post("/api/servers", { templateId: "minecraft-modpack", name: "Sneaky", eulaAccepted: true, uploadId: "../../state" });
		assert.equal(r.status, 400);
		assert.match(r.json.error, /isn't valid/);
	});

	it("accepts keep counts of 1 or more, and refuses 0 (it would delete each scheduled backup as it is made)", async () => {
		const put = (body) => api.put("/api/server/Alpha/backups/settings", body);
		assert.equal((await put({ keepCount: 0 })).status, 400);
		assert.equal((await put({ keepCount: -1 })).status, 400);
		assert.equal((await put({ keepCount: 1.5 })).status, 400);
		assert.equal((await put({ keepCount: 5, keepDays: 0 })).status, 200, "0 days still means no age limit");
		assert.equal((await put({ keepCount: null })).status, 200, "null follows the panel-wide rule");
	});

	it("treats a settings file named after something on every object as no file at all", async () => {
		assert.equal((await api.get("/api/config/Alpha?file=Main")).json.content, "a=1\n");
		for (const name of ["constructor", "__proto__", "toString"]) {
			const r = await api.get(`/api/config/Alpha?file=${name}`);
			assert.equal(r.status, 400, name);
			assert.match(r.json.error, /Valid config file/);
		}
	});

	it("does no artwork lookups for game types nobody has (guests can ask for any name)", async () => {
		const { ensureSteamArt, missCount } = await import("../../src/server/services/artService.js");
		const before = missCount();
		for (let i = 0; i < 50; i += 1) assert.equal(await ensureSteamArt(`made-up-${i}`), null);
		assert.equal(missCount(), before, "nothing was remembered about them");
		const guest = await api.cookieFor({ username: "viewer", password: "TestGuest!2345" });
		assert.equal((await api.get("/api/art/another-made-up-name", { cookie: guest })).status, 404);
		assert.equal(missCount(), before);
	});

	it("ignores a \"__proto__\" entry in a settings change (it would be written onto every object in the process)", async () => {
		const r = await api.put("/api/settings", '{"__proto__": {"pollutedBySettings": "yes"}, "polling": {"serversMs": 9000}}');
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal({}.pollutedBySettings, undefined);
		assert.equal((await api.get("/api/settings")).json.config.polling.serversMs, 9000);
	});
});

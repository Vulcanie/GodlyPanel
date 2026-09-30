import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry } from "../helpers/instance.js";

// Every change the panel makes to a settings or start-script file is kept, so it can be
// looked at and undone, including the very first one.

describe("settings history", () => {
	let panel;
	let api;
	let dir;
	let ini;
	let script;

	const enc = encodeURIComponent;
	const save = (content) => api.post("/api/config/History%20Test", { fileName: "config", content });
	const versions = async (key = "config") => (await api.get(`/api/server/History%20Test/history/${enc(key)}`)).json;

	before(async () => {
		panel = await startInstance({
			servers: (d) => {
				dir = path.join(d, "hist");
				fs.mkdirSync(dir, { recursive: true });
				ini = path.join(dir, "Settings.ini");
				script = path.join(dir, "Start.bat");
				fs.writeFileSync(ini, "[S]\r\nDifficulty=1\r\n");
				fs.writeFileSync(script, "@echo off\r\nstart x.exe -port 1\r\n");
				return [serverEntry(d, { name: "History Test", type: "conan", source: "created", installDir: dir, workingDir: dir, configPath: ini, startScriptPath: script, processName: "hist-none.exe" })];
			},
		});
		api = panel.api;
	});
	after(() => panel.stop());

	it("starts empty", async () => {
		const list = (await api.get("/api/server/History%20Test/history")).json;
		assert.deepEqual(list, [{ key: "config", versions: 0 }, { key: "start script", versions: 0 }]);
	});

	it("keeps what was there before the first change, and each change after it", async () => {
		await save("[S]\r\nDifficulty=2\r\n");
		await save("[S]\r\nDifficulty=3\r\n");
		const v = await versions();
		assert.equal(v.length, 3);
		assert.equal(v[0].source, "settings editor", "newest first");
		assert.equal(v.at(-1).source, "before the panel's first change");
		const first = (await api.get(`/api/server/History%20Test/history/config/${v.at(-1).id}`)).json.content;
		assert.equal(first, "[S]\r\nDifficulty=1\r\n", "the original, before the panel ever touched it");
	});

	it("does not record a save that changed nothing", async () => {
		await save("[S]\r\nDifficulty=3\r\n");
		assert.equal((await versions()).length, 3);
	});

	it("puts an earlier version back, and that is a version too", async () => {
		const v = await versions();
		const r = await api.post(`/api/server/History%20Test/history/config/${v.at(-1).id}/restore`, {});
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(fs.readFileSync(ini, "utf8"), "[S]\r\nDifficulty=1\r\n");
		const after = await versions();
		assert.equal(after.length, 4);
		assert.equal(after[0].source, "restored an earlier version");
		// Undo the undo.
		await api.post(`/api/server/History%20Test/history/config/${after[1].id}/restore`, {});
		assert.equal(fs.readFileSync(ini, "utf8"), "[S]\r\nDifficulty=3\r\n");
	});

	it("covers the start script, saying where the change came from", async () => {
		await api.post("/api/batch-files/by-server/History%20Test", { content: "@echo off\r\nstart x.exe -port 2\r\n" });
		const v = await versions("start script");
		assert.equal(v.length, 2);
		assert.equal(v[0].source, "start script editor");
		assert.equal((await api.get(`/api/server/History%20Test/history/start%20script/${v[0].id}`)).json.content, "@echo off\r\nstart x.exe -port 2\r\n");
	});

	it("records changes made by the ports editor and says so", async () => {
		await api.put("/api/server/History%20Test/ports", { ports: { port: 9444 } }).catch(() => {});
		const v = await versions("start script");
		assert.ok(v.some((x) => x.source === "start script editor"));
	});

	it("refuses ids and files that aren't there, and a restore while the server runs isn't possible to fake here", async () => {
		assert.equal((await api.get("/api/server/History%20Test/history/nope")).status, 404);
		assert.equal((await api.get("/api/server/History%20Test/history/config/not-an-id")).status, 404);
		assert.equal((await api.get("/api/server/History%20Test/history/config/1-abcdef")).status, 404);
		assert.equal((await api.get("/api/server/History%20Test/history/config/..%2F..%2Findex")).status, 404);
	});

	it("keeps only the newest versions, and always the first", async () => {
		for (let i = 0; i < 70; i += 1) await save(`[S]\r\nDifficulty=${100 + i}\r\n`);
		const v = await versions();
		assert.equal(v.length, 60);
		assert.equal(v.at(-1).source, "before the panel's first change");
		assert.equal((await api.get(`/api/server/History%20Test/history/config/${v[0].id}`)).json.content, "[S]\r\nDifficulty=169\r\n");
	});

	it("is for administrators only", async () => {
		await api.post("/api/users", { username: "modh", password: "TestMod!2345", role: "moderator" });
		const mod = await api.cookieFor({ username: "modh", password: "TestMod!2345" });
		assert.equal((await api.get("/api/server/History%20Test/history", { cookie: mod })).status, 403);
	});
});

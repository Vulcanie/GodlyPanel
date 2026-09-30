import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry } from "../helpers/instance.js";

// The message of the day through the API: read, change, in the file and in its history,
// only for servers of a game that has one, and only while the server is stopped.

describe("message of the day", () => {
	let panel;
	let api;
	let dir;

	before(async () => {
		panel = await startInstance({
			servers: (d) => {
				dir = path.join(d, "mc");
				fs.mkdirSync(dir, { recursive: true });
				fs.writeFileSync(path.join(dir, "server.properties"), "server-port=25565\r\nmotd=Old one\r\n");
				return [
					serverEntry(d, { name: "Craft", type: "minecraft", source: "created", installDir: dir, workingDir: dir, processName: "craft-none.exe" }),
					serverEntry(d, { name: "Plain", type: "custom", processName: "plain-none.exe" }),
				];
			},
		});
		api = panel.api;
	});
	after(() => panel.stop());

	it("reads the current message", async () => {
		const r = (await api.get("/api/server/Craft/motd")).json;
		assert.equal(r.supported, true);
		assert.equal(r.value, "Old one");
		assert.equal(r.available, true);
	});

	it("changes it in the file, and keeps the old one in the history", async () => {
		const r = await api.put("/api/server/Craft/motd", { value: "Welcome to the server!" });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(r.json.value, "Welcome to the server!");
		assert.equal(fs.readFileSync(path.join(dir, "server.properties"), "utf8"), "server-port=25565\r\nmotd=Welcome to the server!\r\n");
		const versions = (await api.get("/api/server/Craft/history/start%20script")).status; // no script: not a file of this server
		assert.equal(versions, 404);
	});

	it("says which games it can't do", async () => {
		assert.equal((await api.get("/api/server/Plain/motd")).json.supported, false);
		const r = await api.put("/api/server/Plain/motd", { value: "x" });
		assert.equal(r.status, 400);
		assert.equal(r.json.code, "unsupported");
	});

	it("refuses text that is too long or not text", async () => {
		assert.equal((await api.put("/api/server/Craft/motd", { value: "x".repeat(501) })).status, 400);
		assert.equal((await api.put("/api/server/Craft/motd", { value: 5 })).status, 400);
	});

	it("is for administrators only", async () => {
		await api.post("/api/users", { username: "modmo", password: "TestMod!2345", role: "moderator" });
		const mod = await api.cookieFor({ username: "modmo", password: "TestMod!2345" });
		assert.equal((await api.put("/api/server/Craft/motd", { value: "hi" }, { cookie: mod })).status, 403);
	});
});

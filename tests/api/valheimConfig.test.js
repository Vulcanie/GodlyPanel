import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { serverEntry } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// Valheim has no settings file; its start script is the settings file, offered as "Launch options". A server of any other kind
// with no settings file still offers none.

const SCRIPT = '@echo off\r\nstart /MIN valheim_server -nographics -batchmode -name "Godly" -port 7777 -world "W" -password "abcde"\r\n';

describe("Valheim's settings file", () => {
	let panel;
	let api;
	let script;

	before(async () => {
		panel = await startInProcess({
			servers: (dir) => {
				const home = path.join(dir, "valheim");
				fs.mkdirSync(home, { recursive: true });
				script = path.join(home, "Valheim-Server-Start.bat");
				fs.writeFileSync(script, SCRIPT);
				return [
					serverEntry(home, { name: "Valheim", type: "valheim", method: "gamedig", port: 7777, startScriptPath: script, processName: "valheim_server.exe" }),
					serverEntry(path.join(dir, "other"), { name: "Plain", type: "custom", startScriptPath: path.join(dir, "other", "start.bat") }),
				];
			},
		});
		api = panel.api;
	});
	after(() => panel.stop());

	it("lists the start script as its one settings file", async () => {
		assert.deepEqual((await api.get("/api/server/Valheim")).json.configNames, ["Launch options"]);
	});

	it("reads and saves it", async () => {
		const read = await api.get("/api/config/Valheim?file=Launch%20options");
		assert.equal(read.status, 200, JSON.stringify(read.json));
		assert.equal(read.json.content, SCRIPT);
		const next = SCRIPT.replace("-port 7777", "-port 2456");
		const saved = await api.post("/api/config/Valheim", { fileName: "Launch options", content: next });
		assert.equal(saved.status, 200, JSON.stringify(saved.json));
		assert.equal(fs.readFileSync(script, "utf8"), next);
	});

	it("keeps the earlier version in its history, under the same name", async () => {
		const history = (await api.get("/api/server/Valheim/history")).json;
		assert.deepEqual(history.map((h) => h.key), ["Launch options"], "listed once, not as both a settings file and a start script");
		assert.ok(history[0].versions >= 1);
	});

	it("will not hand out any other file under that name", async () => {
		assert.equal((await api.get("/api/config/Valheim?file=config")).status, 400);
		assert.equal((await api.get("/api/config/Valheim?file=..%2Fsecrets.json")).status, 400);
	});

	it("leaves other games without a settings file as they were", async () => {
		assert.deepEqual((await api.get("/api/server/Plain")).json.configNames, []);
	});
});

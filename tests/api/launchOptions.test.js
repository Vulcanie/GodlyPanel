import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { serverEntry } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// A game that is set up partly by its launch line offers the start script as one more settings file, "Launch options", beside its
// own settings file. A settings file the game hasn't made yet is reported as missing, not as a server error. Saving never leaves a
// half-written file or a stray temporary file behind.

const SCRIPT = '@echo off\r\nstart /MIN "R" RustDedicated.exe -batchmode +server.port 28015 +server.hostname "Rusty"\r\n';

describe("launch options as a settings file", () => {
	let panel;
	let api;
	let home;
	let script;
	let cfg;

	before(async () => {
		panel = await startInProcess({
			servers: (dir) => {
				home = path.join(dir, "rust");
				fs.mkdirSync(home, { recursive: true });
				script = path.join(home, "Start_Rust.bat");
				cfg = path.join(home, "server", "main", "cfg", "server.cfg");
				fs.writeFileSync(script, SCRIPT);
				return [serverEntry(home, { name: "Rusty", type: "rust", method: "process", port: 28015, startScriptPath: script, configPath: cfg, processName: "RustDedicated.exe" })];
			},
		});
		api = panel.api;
	});
	after(() => panel.stop());

	it("lists the game's own settings file, then the launch options", async () => {
		assert.deepEqual((await api.get("/api/server/Rusty")).json.configNames, ["config", "Launch options"]);
	});

	it("serves and saves the start script under that name", async () => {
		const read = await api.get("/api/config/Rusty?file=Launch%20options");
		assert.equal(read.json.content, SCRIPT);
		const next = SCRIPT.replace("+server.port 28015", "+server.port 28100");
		assert.equal((await api.post("/api/config/Rusty", { fileName: "Launch options", content: next })).status, 200);
		assert.equal(fs.readFileSync(script, "utf8"), next);
		assert.deepEqual(fs.readdirSync(home).filter((f) => f.endsWith(".tmp")), [], "no temporary file is left behind");
	});

	it("says a settings file that doesn't exist yet is missing, rather than failing", async () => {
		const read = await api.get("/api/config/Rusty?file=config");
		assert.equal(read.status, 404);
		assert.equal(read.json.code, "file_missing");
	});

	it("won't hand out the start script under any other name", async () => {
		// Any other name means the server's own single settings file (here not made yet), never the start script or another path.
		for (const name of ["start%20script", "..%2Fsecrets.json", "launch%20options"]) {
			const r = await api.get(`/api/config/Rusty?file=${name}`);
			assert.equal(r.status, 404, name);
			assert.notEqual(r.json.content, SCRIPT);
		}
	});
});

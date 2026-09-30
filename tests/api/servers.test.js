import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { runStandIn, stopStandIns, startInstance, serverEntry, freePort, sleep } from "../helpers/instance.js";

// Status polling, start/stop guards, and reading/writing server files. The
// servers here are stand-ins written into the test's own folder: one "runs" as
// this test's own node.exe, the rest are absent or broken on purpose.

const runningImage = "gp-running-servers.exe"; // a stand-in run from the server's own folder

describe("servers", () => {
	let panel;
	let api;
	let dir;
	let closedPort;

	before(async () => {
		closedPort = await freePort();
		panel = await startInstance({
			prepare: (folder) => {
				fs.mkdirSync(path.join(folder, "srv"), { recursive: true });
				runStandIn(path.join(folder, "srv"), runningImage);
				fs.writeFileSync(path.join(folder, "srv", "settings.ini"), "a=1\n");
				fs.writeFileSync(path.join(folder, "srv", "start.bat"), "@echo off\r\n");
			},
			servers: (folder) => {
				dir = path.join(folder, "srv");
				return [
					serverEntry(dir, { name: "Running", processName: runningImage, updateAppId: "1", steamCmdPath: "X:\\nowhere\\steamcmd.exe", startScriptPath: path.join(dir, "start.bat") }),
					serverEntry(dir, { name: "Absent", processName: "definitely-not-running-anywhere.exe" }),
					serverEntry(dir, { name: "NoProcessName" }), // process detection with nothing to look for
					serverEntry(dir, { name: "RconDown", method: "rcon", rconPort: closedPort, rconPassword: "x" }),
					serverEntry(dir, { name: "Cfg", processName: "x.exe", configPath: path.join(dir, "settings.ini") }),
					serverEntry(dir, { name: "CfgNew", processName: "x.exe", configPath: path.join(dir, "brand-new.ini") }),
					serverEntry(dir, { name: "CfgEscape", processName: "x.exe", configPath: path.join(process.env.SystemRoot ?? "C:\\Windows", "win.ini") }),
				];
			},
		});
		api = panel.api;
		await sleep(6500); // let a couple of poll cycles land
	});
	after(() => {
		stopStandIns();
		return panel.stop();
	});

	describe("polling", () => {
		it("detects a running process, an absent one, and a closed RCON port", async () => {
			const status = (await api.get("/api/status")).json;
			assert.equal(status.Running.online, true);
			assert.equal(status.Absent.online, false);
			assert.equal(status.RconDown.online, false);
		});

		it("a process-detected server with no process name is simply offline, and doesn't take the API down", async () => {
			assert.equal((await api.get("/api/status")).json.NoProcessName.online, false);
			assert.equal((await api.get("/api/status")).status, 200);
		});

		it("reports system stats that make sense", async () => {
			const s = (await api.get("/api/system-stats")).json;
			assert.ok(s.totalMemMB > 512);
			assert.ok(s.usedMemPercent > 0 && s.usedMemPercent < 100);
			assert.ok(s.cpuPercent >= 0 && s.cpuPercent <= 100);
		});

		it("doesn't fill the log with one line per server per cycle", () => {
			const log = panel.log();
			assert.equal((log.match(/\[DIFF\]/g) ?? []).length, 0);
			assert.ok((log.match(/RconDown/g) ?? []).length <= 2, "a persistent failure isn't repeated every cycle");
		});
	});

	describe("control", () => {
		it("refuses to start a server that is already running", async () => {
			const r = await api.post("/api/control/Running/start");
			assert.equal(r.status, 409);
			assert.match(r.json.error, /already running/);
		});

		it("404s for an unknown server and 400s for an unknown action", async () => {
			assert.equal((await api.post("/api/control/Nope/start")).status, 404);
			assert.equal((await api.post("/api/control/Running/explode")).status, 400);
		});

		it("refuses an update up front when SteamCMD isn't installed, before stopping anything", async () => {
			const r = await api.post("/api/control/Running/update");
			assert.equal(r.status, 500);
			assert.match(r.json.error, /SteamCMD isn't installed/);
			assert.equal((await api.get("/api/status")).status, 200, "and the API survives it");
		});

		it("requires a command for RCON", async () => {
			assert.equal((await api.post("/api/control/RconDown/rcon", {})).status, 400);
		});
	});

	describe("config and launch-script files", () => {
		it("reads a config file", async () => {
			const r = await api.get("/api/config/Cfg?file=x");
			assert.equal(r.status, 200);
			assert.equal(r.json.content, "a=1\n");
		});

		it("saves it, keeping a .bak of what was there", async () => {
			const r = await api.post("/api/config/Cfg", { fileName: "x", content: "a=2\n" });
			assert.equal(r.status, 200);
			assert.equal(fs.readFileSync(path.join(dir, "settings.ini"), "utf8"), "a=2\n");
			assert.equal(fs.readFileSync(path.join(dir, "settings.ini.bak"), "utf8"), "a=1\n");
		});

		it("can save a file that doesn't exist yet", async () => {
			const r = await api.post("/api/config/CfgNew", { fileName: "x", content: "new\n" });
			assert.equal(r.status, 200);
			assert.equal(fs.readFileSync(path.join(dir, "brand-new.ini"), "utf8"), "new\n");
		});

		it("won't read or write outside the folders it manages", async () => {
			const write = await api.post("/api/config/CfgEscape", { fileName: "x", content: "pwned" });
			assert.equal(write.status, 400);
			assert.match(write.json.error, /outside the folders/);
			assert.equal((await api.get("/api/config/CfgEscape?file=x")).status, 400);
			const windowsIni = path.join(process.env.SystemRoot ?? "C:\\Windows", "win.ini.bak");
			assert.equal(fs.existsSync(windowsIni), false, "and no .bak was written beside the target either");
		});

		it("rejects a non-string body", async () => {
			assert.equal((await api.post("/api/config/Cfg", { fileName: "x", content: { not: "text" } })).status, 400);
		});

		it("reads and saves a launch script", async () => {
			assert.equal((await api.get("/api/batch-files/by-server/Running")).status, 200);
			const saved = await api.post("/api/batch-files/by-server/Running", { content: "@echo off\r\nrem hi\r\n" });
			assert.equal(saved.status, 200);
			assert.match(fs.readFileSync(path.join(dir, "start.bat"), "utf8"), /rem hi/);
		});
	});
});

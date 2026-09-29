import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry, sleep } from "../helpers/instance.js";
import { makeStandIns, standInOnTaskbar, isRunning, killStandIns, countRunning, until } from "./helpers.js";

// Window modes, launch reading, and "copy from the running server", against
// real processes and real windows. Needs a Windows desktop session, so it isn't
// part of `npm test`; run it with `npm run test:desktop`. About three minutes,
// most of it waiting for stand-in programs to be force-closed.

const onWindows = process.platform === "win32";

describe("window modes (real processes and windows)", { skip: !onWindows && "needs a Windows desktop", timeout: 900_000 }, () => {
	let panel;
	let api;
	let srv;
	let javaBefore;

	const status = async (name) => (await api.get("/api/status")).json[name];
	const stopAndWait = async (name, image) => {
		await api.post(`/api/control/${name}/stop`);
		await until(() => !isRunning(image, srv), { timeoutMs: 60_000, everyMs: 1000 });
		await sleep(2500); // let the panel's next poll see it gone
	};

	before(async () => {
		javaBefore = countRunning("java.exe", "");
		panel = await startInstance({
			servers: (dir) => {
				srv = path.join(dir, "srv");
				makeStandIns(srv);
				return [
					serverEntry(srv, { name: "Sim", processName: "gamesim.exe", startScriptPath: path.join(srv, "sim.bat") }),
					serverEntry(srv, { name: "Unreadable", processName: "gamesim2.exe", startScriptPath: path.join(srv, "unreadable.bat") }),
					// No processName on purpose: Stop can then only use the recorded process
					// id, never `taskkill /IM java.exe`, which would hit real Java servers.
					serverEntry(srv, { name: "Mc", type: "minecraft", method: "gamedig", queryPort: 59998, startScriptPath: path.join(srv, "mc.bat") }),
				];
			},
			config: { polling: { serversMs: 3000, enableBuildCheck: false, enableServerStats: false } },
		});
		api = panel.api;
	});

	after(async () => {
		killStandIns("gamesim.exe", srv);
		killStandIns("gamesim2.exe", srv);
		killStandIns("java.exe", srv);
		await panel.stop();
	});

	describe("reading the current state", () => {
		it("defaults to hidden, with no launch details yet", async () => {
			const w = (await api.get("/api/server/Sim/window")).json;
			assert.equal(w.effective, "hidden");
			assert.equal(w.requested, null);
			assert.equal(w.launch, null);
			assert.equal(w.hasWindows, true);
		});

		it("Minecraft has no windows to manage", async () => {
			assert.equal((await api.get("/api/server/Mc/window")).json.hasWindows, false);
		});

		it("reads a simple script, and refuses one with a for loop with a reason", async () => {
			const ok = (await api.post("/api/server/Sim/launch/detect")).json;
			assert.equal(ok.ok, true);
			assert.match(ok.launch.exe, /gamesim\.exe$/i);
			const no = (await api.post("/api/server/Unreadable/launch/detect")).json;
			assert.equal(no.ok, false);
			assert.match(no.reason, /"for"/);
		});
	});

	describe("validation", () => {
		it("refuses bad modes, and No window for a script that can't be read", async () => {
			assert.equal((await api.put("/api/server/Sim/window-mode", { mode: "rainbow" })).status, 400);
			const r = await api.put("/api/server/Unreadable/window-mode", { mode: "windowless" });
			assert.equal(r.status, 400);
			assert.match(r.json.error, /Copy from the running server/);
		});

		it("checks launch details: a full .exe path, a single line, a working folder inside the server folders", async () => {
			const exe = path.join(srv, "gamesim.exe");
			assert.equal((await api.put("/api/server/Sim/launch", { exe: "gamesim.exe" })).status, 400);
			assert.equal((await api.put("/api/server/Sim/launch", { exe: path.join(process.env.SystemRoot ?? "C:\\Windows", "win.ini") })).status, 400);
			assert.equal((await api.put("/api/server/Sim/launch", { exe, args: "a\nb" })).status, 400);
			assert.equal((await api.put("/api/server/Sim/launch", { exe, cwd: process.env.SystemRoot ?? "C:\\Windows" })).status, 400);
		});

		it("lets the program itself live outside the server folders (Java sits under the user's own JDK folder)", async () => {
			const r = await api.put("/api/server/Sim/launch", { exe: process.execPath, args: "-v", cwd: srv });
			assert.equal(r.status, 200);
			// Put the real launch back for the tests that follow.
			const found = (await api.post("/api/server/Sim/launch/detect")).json;
			assert.equal((await api.put("/api/server/Sim/launch", found.launch)).status, 200);
		});

		it("only an admin can change any of it", async () => {
			const guest = await api.cookieFor({ username: "viewer", password: "TestGuest!2345" });
			assert.equal((await api.put("/api/server/Sim/window-mode", { mode: "minimized" }, { cookie: guest })).status, 403);
		});
	});

	describe("No window", () => {
		it("starts with no window, captures output, and records the process", { timeout: 120_000 }, async () => {
			const sw = await api.put("/api/server/Sim/window-mode", { mode: "windowless" });
			assert.equal(sw.status, 200);
			assert.equal(sw.json.effective, "windowless");

			assert.equal((await api.post("/api/control/Sim/start")).status, 200);
			assert.equal(await until(() => isRunning("gamesim.exe", srv), { timeoutMs: 15_000 }), true, "running");
			await sleep(2000);
			assert.equal(standInOnTaskbar("Sim"), false, "and no window exists");

			const log = (await api.get("/api/server/Sim/log")).json;
			assert.equal(log.exists, true);
			assert.match(log.text, /tick/, "its own quoted -e code ran, so the arguments arrived intact");
			await sleep(1500);
			const more = (await api.get(`/api/server/Sim/log?offset=${log.next}`)).json;
			assert.ok(more.next > log.next, "the log can be followed by offset");

			const pids = JSON.parse(fs.readFileSync(path.join(panel.dir, "state", "server-pids.json"), "utf8"));
			assert.ok(Number.isInteger(pids.Sim.pid));
		});

		it("is seen online, and refuses a second start", async () => {
			await sleep(4000);
			assert.equal((await status("Sim")).online, true);
			assert.equal((await api.post("/api/control/Sim/start")).status, 409);
		});

		it("stops, and forgets the process id", { timeout: 120_000 }, async () => {
			await stopAndWait("Sim", "gamesim.exe");
			assert.equal(isRunning("gamesim.exe", srv), false);
			const pids = JSON.parse(fs.readFileSync(path.join(panel.dir, "state", "server-pids.json"), "utf8"));
			assert.equal("Sim" in pids, false);
		});
	});

	describe("Hidden, and switching while it runs", () => {
		it("hides the script's window as it opens", { timeout: 120_000 }, async () => {
			await api.put("/api/server/Sim/window-mode", { mode: "hidden" });
			await api.post("/api/control/Sim/start");
			assert.equal(await until(() => isRunning("gamesim.exe", srv), { timeoutMs: 15_000 }), true);
			await sleep(8000);
			assert.equal(standInOnTaskbar("Sim"), false);
		});

		it("switching to minimized brings the window back on the running server", async () => {
			const r = await api.put("/api/server/Sim/window-mode", { mode: "minimized" });
			assert.equal(r.json.appliedNow, true);
			assert.equal(await until(() => standInOnTaskbar("Sim"), { timeoutMs: 8000 }), true, "a hide watcher still running must not hide it again");
		});

		it("switching back hides it again", async () => {
			await api.put("/api/server/Sim/window-mode", { mode: "hidden" });
			assert.equal(await until(() => !standInOnTaskbar("Sim"), { timeoutMs: 15_000 }), true);
		});

		it("Show windows restores only what the panel itself hid; Hide windows now hides it again", async () => {
			const shown = await api.post("/api/server/Sim/windows/show");
			assert.ok(shown.json.restored >= 1);
			assert.equal(await until(() => standInOnTaskbar("Sim"), { timeoutMs: 8000 }), true);
			await api.post("/api/server/Sim/windows/hide");
			assert.equal(await until(() => !standInOnTaskbar("Sim"), { timeoutMs: 15_000 }), true);
		});

		it("going back to the panel default clears the override", async () => {
			const r = await api.put("/api/server/Sim/window-mode", { mode: "default" });
			assert.equal(r.json.requested, null);
			assert.equal(r.json.effective, "hidden");
			await stopAndWait("Sim", "gamesim.exe");
		});
	});

	describe("Copy from the running server", () => {
		it("says so when the server isn't running", async () => {
			const r = (await api.post("/api/server/Unreadable/launch/capture")).json;
			assert.equal(r.ok, false);
			assert.match(r.reason, /isn't running/);
		});

		it("reads the launch from the running process and the result starts the server in No window", { timeout: 180_000 }, async () => {
			await api.put("/api/server/Unreadable/window-mode", { mode: "minimized" });
			await api.post("/api/control/Unreadable/start");
			assert.equal(await until(() => isRunning("gamesim2.exe", srv), { timeoutMs: 15_000 }), true);
			await sleep(2000);

			const cap = (await api.post("/api/server/Unreadable/launch/capture")).json;
			assert.equal(cap.ok, true, JSON.stringify(cap));
			assert.match(cap.launch.exe, /gamesim2\.exe$/i);
			assert.match(cap.launch.args, /-e "setInterval\(\(\)=>console\.log\('tick'\),400\)"/, "quoting preserved");
			await stopAndWait("Unreadable", "gamesim2.exe");

			assert.equal((await api.put("/api/server/Unreadable/launch", cap.launch)).status, 200);
			assert.equal((await api.put("/api/server/Unreadable/window-mode", { mode: "windowless" })).status, 200);
			assert.equal((await api.post("/api/control/Unreadable/start")).status, 200);
			await sleep(3000);
			assert.match((await api.get("/api/server/Unreadable/log")).json.text, /tick/);
			await stopAndWait("Unreadable", "gamesim2.exe");
		});
	});

	describe("a Minecraft-type server", () => {
		it("captures by its loader version, and can then use No window", { timeout: 240_000 }, async () => {
			assert.equal((await api.get("/api/server/Mc/window")).json.effective, "hidden", "standard: its own script");
			await api.post("/api/control/Mc/start");
			assert.equal(await until(() => isRunning("java.exe", srv), { timeoutMs: 15_000 }), true);
			await sleep(2000);

			const cap = (await api.post("/api/server/Mc/launch/capture")).json;
			assert.equal(cap.ok, true, JSON.stringify(cap));
			assert.match(cap.launch.exe, /java\.exe$/i);
			assert.ok(cap.launch.args.includes("--installer 9.9.9"));
			killStandIns("java.exe", srv);
			await sleep(1500);

			assert.equal((await api.put("/api/server/Mc/launch", cap.launch)).status, 200);
			const sw = await api.put("/api/server/Mc/window-mode", { mode: "windowless" });
			assert.equal(sw.json.effective, "windowless");
			assert.equal((await api.post("/api/control/Mc/start")).status, 200);
			await sleep(3000);
			const log = (await api.get("/api/server/Mc/log")).json;
			assert.match(log.text, /argv -jar server\.jar --installer-force --installer 9\.9\.9 nogui/, "the arguments arrived intact");
			assert.match(log.text, /tick/);
		});

		it("Stop works with only the recorded process id, and leaves other Java servers alone", { timeout: 120_000 }, async () => {
			const r = await api.post("/api/control/Mc/stop");
			assert.equal(r.status, 200, JSON.stringify(r.json));
			await until(() => !isRunning("java.exe", srv), { timeoutMs: 60_000, everyMs: 1000 });
			assert.equal(isRunning("java.exe", srv), false);
			assert.equal(countRunning("java.exe", srv), javaBefore, "any real Java servers on this machine are untouched");
			const pids = JSON.parse(fs.readFileSync(path.join(panel.dir, "state", "server-pids.json"), "utf8"));
			assert.equal("Mc" in pids, false);
		});
	});
});

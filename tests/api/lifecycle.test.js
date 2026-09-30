import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames, gameLog } from "../helpers/fakeGame.js";

// Start and stop against a real (stand-in) game process: the panel starts it
// through its own launcher, sees it come online over RCON, tells you what it is in
// the middle of doing, refuses a second action meanwhile, and records that the
// stop was on purpose.

async function until(check, { timeoutMs = 60_000, everyMs = 500 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("start and stop a server", () => {
	let panel;
	let api;
	let folder;

	before(async () => {
		const rconPort = await freePort();
		panel = await startInstance({
			servers: (dir) => {
				folder = path.join(dir, "fake1");
				return [makeFakeGame(folder, { name: "Fake One", rconPort, exe: "gp-fake-one.exe" })];
			},
		});
		api = panel.api;
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	const online = async () => (await api.get("/api/status")).json["Fake One"]?.online === true;
	const operation = async () => (await api.get("/api/operations")).json["Fake One"]?.op ?? null;

	it("starts, says it is starting, and comes online", async () => {
		const r = await api.post("/api/control/Fake%20One/start");
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(await operation(), "starting");
		assert.equal(await until(online), true, "the panel saw it online");
		assert.equal(await until(async () => (await operation()) === null, { timeoutMs: 30_000 }), true, "and the lock was released");
	});

	it("records that it is meant to be running", async () => {
		const intent = JSON.parse(fs.readFileSync(path.join(panel.dir, "state", "server-intent.json"), "utf8"));
		assert.equal(intent["Fake One"].desired, "running");
	});

	it("refuses to start a server that is already running", async () => {
		const r = await api.post("/api/control/Fake%20One/start");
		assert.equal(r.status, 409);
		assert.match(r.json.error, /already running/);
	});

	it("stops, says it is stopping, refuses another action meanwhile, and ends up offline", async () => {
		const r = await api.post("/api/control/Fake%20One/stop");
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(await operation(), "stopping");
		const meanwhile = await api.post("/api/control/Fake%20One/start");
		assert.equal(meanwhile.status, 409);
		assert.match(meanwhile.json.error, /busy \(stopping\)/);
		assert.equal(await until(async () => !(await online()) && (await operation()) === null, { timeoutMs: 60_000 }), true);
		assert.match(gameLog(folder), /rcon: Shutdown/);
		assert.match(fs.readFileSync(path.join(folder, "ConanSandbox", "Saved", "world.sav"), "utf8"), /saved on exit/);
	});

	it("records that the stop was on purpose", async () => {
		const intent = JSON.parse(fs.readFileSync(path.join(panel.dir, "state", "server-intent.json"), "utf8"));
		assert.equal(intent["Fake One"].desired, "stopped");
	});
});

describe("restarting a server", () => {
	let panel;
	let api;
	let folder;

	before(async () => {
		const rconPort = await freePort();
		panel = await startInstance({
			servers: (dir) => {
				folder = path.join(dir, "fake-restart");
				return [makeFakeGame(folder, { name: "Fake Restart", rconPort, exe: "gp-fake-restart.exe" })];
			},
		});
		api = panel.api;
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	const online = async () => (await api.get("/api/status")).json["Fake Restart"]?.online === true;
	const idle = async () => !(await api.get("/api/operations")).json["Fake Restart"];

	it("refuses when it isn't running", async () => {
		const r = await api.post("/api/control/Fake%20Restart/restart");
		assert.equal(r.status, 409);
		assert.match(r.json.error, /isn't running/);
	});

	it("stops it, waits until it has really gone, starts it again, and holds the lock meanwhile", async () => {
		await api.post("/api/control/Fake%20Restart/start");
		assert.equal(await until(online), true);
		await until(idle);
		const before = (gameLog(folder).match(/server starting/g) ?? []).length;

		const r = await api.post("/api/control/Fake%20Restart/restart");
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal((await api.get("/api/operations")).json["Fake Restart"].op, "restarting");
		assert.equal((await api.post("/api/control/Fake%20Restart/stop")).status, 409, "busy while restarting");
		assert.equal(await until(async () => (await idle()) && (await online()), { timeoutMs: 90_000 }), true);
		assert.match(gameLog(folder), /rcon: Shutdown/);
		assert.equal((gameLog(folder).match(/server starting/g) ?? []).length, before + 1, "started exactly once more");
	});
});

describe("stopping a server that is still starting", () => {
	let panel;
	let api;
	let folder;

	before(async () => {
		const rconPort = await freePort();
		panel = await startInstance({
			servers: (dir) => {
				folder = path.join(dir, "fake-never-online");
				// The panel looks for RCON on a port the game isn't using, so it never sees
				// the server come online, the way a game with a wrong query setup would.
				return [{ ...makeFakeGame(folder, { name: "Fake Silent", rconPort, exe: "gp-fake-silent.exe" }), rconPort: await0(rconPort) }];
			},
		});
		api = panel.api;
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	const await0 = (port) => (port % 50000) + 1000;

	it("is allowed, instead of being refused for the minutes the wait for it lasts", async () => {
		assert.equal((await api.post("/api/control/Fake%20Silent/start")).status, 200);
		await sleep(3000);
		assert.equal((await api.get("/api/operations")).json["Fake Silent"].op, "starting");
		const t0 = Date.now();
		const r = await api.post("/api/control/Fake%20Silent/stop");
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.ok(Date.now() - t0 < 20_000, "the wait was cancelled, not sat out");
		assert.equal(await until(async () => !(await api.get("/api/operations")).json["Fake Silent"], { timeoutMs: 90_000 }), true);
		assert.equal(await until(async () => !(await import("node:child_process")).execFileSync("tasklist", ["/FI", "IMAGENAME eq gp-fake-silent.exe"]).toString().includes("gp-fake-silent"), { timeoutMs: 60_000 }), true, "and the game really stopped");
	});
});

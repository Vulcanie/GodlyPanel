import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";

// Crash recovery against real stand-in game processes. A server that has asked for
// it is restarted when it dies on its own; one that was stopped on purpose is not;
// one that keeps dying is given up on, loudly.

async function until(check, { timeoutMs = 90_000, everyMs = 500 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("crash recovery", () => {
	let panel;
	let api;
	let folders;

	const online = async (name) => (await api.get("/api/status")).json[name]?.online === true;
	const events = async (server, types) =>
		(await api.get(`/api/activity?server=${encodeURIComponent(server)}&types=${types}&limit=50`)).json;
	const idle = async (name) => !(await api.get("/api/operations")).json[name];

	before(async () => {
		const ports = [await freePort(), await freePort(), await freePort()];
		folders = [];
		panel = await startInstance({
			// Short, so the tests don't take minutes; the defaults are tried by the unit tests.
			config: { recovery: { graceSec: 10, startupGraceMin: 1, maxRestarts: 2, windowMin: 15 } },
			servers: (dir) => {
				const make = (name, exe, port, extra = {}) => {
					const folder = path.join(dir, exe);
					folders.push(folder);
					return makeFakeGame(folder, { name, rconPort: port, exe: `${exe}.exe`, ...extra });
				};
				return [
					make("Fake Steady", "gp-fake-steady", ports[0]),
					make("Fake Loop", "gp-fake-loop", ports[1], { crashAfterMs: 4000 }),
					make("Fake Off", "gp-fake-off", ports[2]),
				];
			},
		});
		api = panel.api;
	});
	after(async () => {
		for (const f of folders) killFakeGames(f);
		await panel.stop();
	});

	it("is off until asked for, and only an admin can ask", async () => {
		const o = await api.get("/api/server/Fake%20Steady/options");
		assert.equal(o.json.autoRestart, false);
		assert.equal(o.json.autoStart, false);
		await api.post("/api/users", { username: "modx", password: "TestMod!2345", role: "moderator" });
		const mod = await api.cookieFor({ username: "modx", password: "TestMod!2345" });
		assert.equal((await api.put("/api/server/Fake%20Steady/options", { autoRestart: true }, { cookie: mod })).status, 403);
		assert.equal((await api.put("/api/server/Fake%20Steady/options", { autoRestart: "yes" })).status, 400);
		const on = await api.put("/api/server/Fake%20Steady/options", { autoRestart: true });
		assert.equal(on.json.autoRestart, true);
	});

	it("restarts a server that dies on its own", async () => {
		await api.post("/api/control/Fake%20Steady/start");
		assert.equal(await until(() => online("Fake Steady")), true);
		await until(() => idle("Fake Steady"));

		// The game crashes itself, as a real one might.
		await api.post("/api/control/Fake%20Steady/rcon", { command: "crash" }).catch(() => {});
		assert.equal(await until(async () => !(await online("Fake Steady")), { timeoutMs: 30_000 }), true, "it went down");
		assert.equal(await until(async () => (await events("Fake Steady", "server.restarted.auto")).length > 0, { timeoutMs: 60_000 }), true, "and was restarted");
		assert.equal(await until(() => online("Fake Steady")), true, "and came back");
		const crashed = await events("Fake Steady", "server.crashed");
		assert.equal(crashed.length, 1);
		assert.equal(crashed[0].level, "warn");
		assert.equal(await until(async () => (await events("Fake Steady", "server.recovered")).length > 0, { timeoutMs: 30_000 }), true);
	});

	it("does not restart one that was stopped on purpose", async () => {
		await until(() => idle("Fake Steady"));
		const before = (await events("Fake Steady", "server.crashed")).length;
		assert.equal((await api.post("/api/control/Fake%20Steady/stop")).status, 200);
		assert.equal(await until(async () => !(await online("Fake Steady")) && (await idle("Fake Steady")), { timeoutMs: 60_000 }), true);
		await sleep(25_000); // well past the grace period and several checks
		assert.equal(await online("Fake Steady"), false, "still stopped");
		assert.equal((await events("Fake Steady", "server.crashed")).length, before);
	});

	it("never touches a server that didn't ask for it", async () => {
		await api.post("/api/control/Fake%20Off/start");
		assert.equal(await until(() => online("Fake Off")), true);
		await until(() => idle("Fake Off"));
		await api.post("/api/control/Fake%20Off/rcon", { command: "crash" }).catch(() => {});
		assert.equal(await until(async () => !(await online("Fake Off")), { timeoutMs: 30_000 }), true);
		await sleep(20_000);
		assert.equal(await online("Fake Off"), false);
		assert.equal((await events("Fake Off", "server.")).filter((e) => e.type === "server.crashed").length, 0);
	});

	it("gives up on a server that keeps dying, and says so", async () => {
		await api.put("/api/server/Fake%20Loop/options", { autoRestart: true });
		await api.post("/api/control/Fake%20Loop/start");
		const gaveUp = await until(async () => (await events("Fake Loop", "server.gave_up")).length > 0, { timeoutMs: 150_000, everyMs: 2000 });
		assert.equal(gaveUp, true, JSON.stringify((await events("Fake Loop", "server")).map((e) => e.t.slice(11, 19) + " " + e.type)));
		const restarts = (await events("Fake Loop", "server.restarted.auto")).length;
		assert.equal(restarts, 2, "after its two automatic restarts");
		const gave = (await events("Fake Loop", "server.gave_up"))[0];
		assert.equal(gave.level, "error");
		assert.match(gave.message, /stopped restarting it/);
		assert.equal((await api.get("/api/server/Fake%20Loop/options")).json.recovery.gaveUp, true);
		await sleep(15_000);
		assert.equal((await events("Fake Loop", "server.restarted.auto")).length, restarts, "and stayed given up");
	});

	it("gives a fresh set of tries once someone starts it again", async () => {
		await until(() => idle("Fake Loop"));
		const r = await api.post("/api/control/Fake%20Loop/start");
		assert.ok([200, 409].includes(r.status));
		assert.equal((await api.get("/api/server/Fake%20Loop/options")).json.recovery.gaveUp, false);
	});
});

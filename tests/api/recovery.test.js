import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { sleep } from "../helpers/instance.js";
import { until, bootRecovery } from "../helpers/recoveryFixture.js";

// Crash recovery against real stand-in game processes. A server that has asked for
// it is restarted when it dies on its own; one that was stopped on purpose is not.
// (A server that never asked, and one that keeps dying, are in recoveryOff.test.js and
// recoveryLoop.test.js, so the three run side by side.)

describe("crash recovery", () => {
	let fx;
	let api;

	before(async () => {
		fx = await bootRecovery([{ name: "Fake Steady", exe: "gp-fake-steady" }]);
		api = fx.api;
	});
	after(() => fx.stop());

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
		assert.equal(await until(() => fx.online("Fake Steady")), true);
		await until(() => fx.idle("Fake Steady"));

		// The game crashes itself, as a real one might.
		await api.post("/api/control/Fake%20Steady/rcon", { command: "crash" }).catch(() => {});
		assert.equal(await until(async () => !(await fx.online("Fake Steady")), { timeoutMs: 30_000 }), true, "it went down");
		assert.equal(await until(async () => (await fx.events("Fake Steady", "server.restarted.auto")).length > 0, { timeoutMs: 60_000 }), true, "and was restarted");
		assert.equal(await until(() => fx.online("Fake Steady")), true, "and came back");
		const crashed = await fx.events("Fake Steady", "server.crashed");
		assert.equal(crashed.length, 1);
		assert.equal(crashed[0].level, "warn");
		assert.equal(await until(async () => (await fx.events("Fake Steady", "server.recovered")).length > 0, { timeoutMs: 30_000 }), true);
	});

	it("does not restart one that was stopped on purpose", async () => {
		await until(() => fx.idle("Fake Steady"));
		const before = (await fx.events("Fake Steady", "server.crashed")).length;
		assert.equal((await api.post("/api/control/Fake%20Steady/stop")).status, 200);
		assert.equal(await until(async () => !(await fx.online("Fake Steady")) && (await fx.idle("Fake Steady")), { timeoutMs: 60_000 }), true);
		await sleep(25_000); // well past the grace period and several checks
		assert.equal(await fx.online("Fake Steady"), false, "still stopped");
		assert.equal((await fx.events("Fake Steady", "server.crashed")).length, before);
	});
});

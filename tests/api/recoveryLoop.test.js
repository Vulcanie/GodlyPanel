import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { sleep } from "../helpers/instance.js";
import { until, bootRecovery } from "../helpers/recoveryFixture.js";

// A server that keeps dying is given up on, loudly, and gets a fresh set of tries when someone starts it again.

describe("crash recovery: a server that keeps dying", () => {
	let fx;
	let api;
	before(async () => {
		fx = await bootRecovery([{ name: "Fake Loop", exe: "gp-fake-loop", extra: { crashAfterMs: 4000 } }]);
		api = fx.api;
	});
	after(() => fx.stop());

	it("is given up on, and the panel says so", async () => {
		await api.put("/api/server/Fake%20Loop/options", { autoRestart: true });
		await api.post("/api/control/Fake%20Loop/start");
		const gaveUp = await until(async () => (await fx.events("Fake Loop", "server.gave_up")).length > 0, { timeoutMs: 150_000, everyMs: 2000 });
		assert.equal(gaveUp, true, JSON.stringify((await fx.events("Fake Loop", "server")).map((e) => e.t.slice(11, 19) + " " + e.type)));
		const restarts = (await fx.events("Fake Loop", "server.restarted.auto")).length;
		assert.equal(restarts, 2, "after its two automatic restarts");
		const gave = (await fx.events("Fake Loop", "server.gave_up"))[0];
		assert.equal(gave.level, "error");
		assert.match(gave.message, /stopped restarting it/);
		assert.equal((await api.get("/api/server/Fake%20Loop/options")).json.recovery.gaveUp, true);
		await sleep(15_000);
		assert.equal((await fx.events("Fake Loop", "server.restarted.auto")).length, restarts, "and stayed given up");
	});

	it("gets a fresh set of tries once someone starts it again", async () => {
		await until(() => fx.idle("Fake Loop"));
		const r = await api.post("/api/control/Fake%20Loop/start");
		assert.ok([200, 409].includes(r.status));
		assert.equal((await api.get("/api/server/Fake%20Loop/options")).json.recovery.gaveUp, false);
	});
});

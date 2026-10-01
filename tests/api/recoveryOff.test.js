import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { sleep } from "../helpers/instance.js";
import { until, bootRecovery } from "../helpers/recoveryFixture.js";

// A server that never asked to be restarted is left alone when it dies.

describe("crash recovery: a server that didn't ask for it", () => {
	let fx;
	before(async () => {
		fx = await bootRecovery([{ name: "Fake Off", exe: "gp-fake-off" }]);
	});
	after(() => fx.stop());

	it("is never touched", async () => {
		const api = fx.api;
		await api.post("/api/control/Fake%20Off/start");
		assert.equal(await until(() => fx.online("Fake Off")), true);
		await until(() => fx.idle("Fake Off"));
		await api.post("/api/control/Fake%20Off/rcon", { command: "crash" }).catch(() => {});
		assert.equal(await until(async () => !(await fx.online("Fake Off")), { timeoutMs: 30_000 }), true);
		await sleep(20_000);
		assert.equal(await fx.online("Fake Off"), false);
		assert.equal((await fx.events("Fake Off", "server.")).filter((e) => e.type === "server.crashed").length, 0);
	});
});

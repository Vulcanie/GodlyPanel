import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runCountdown } from "../../src/server/services/scheduler.js";

// The warnings before a scheduled restart: "10 minutes", "5 minutes", "1 minute",
// spaced so the restart lands exactly when the last one says. Time is faked.

const server = { name: "T", type: "custom" }; // no RCON, so nothing is actually sent

describe("the countdown before a scheduled restart", () => {
	it("waits out the full time, in the right pieces", async () => {
		const waited = [];
		await runCountdown(server, [10, 5, 1], "restarting", { sleepFn: async (ms) => waited.push(ms / 60_000), isRunning: async () => true });
		assert.deepEqual(waited, [0, 5, 4, 1]);
		assert.equal(waited.reduce((a, b) => a + b, 0), 10, "ten minutes from the first warning to the restart");
	});

	it("does nothing when no warnings are asked for, or the server isn't running", async () => {
		const waited = [];
		const sleepFn = async (ms) => waited.push(ms);
		await runCountdown(server, [], "restarting", { sleepFn, isRunning: async () => true });
		await runCountdown(server, [10, 5], "restarting", { sleepFn, isRunning: async () => false });
		assert.deepEqual(waited, []);
	});

	it("stops counting if the server goes away partway", async () => {
		const waited = [];
		let checks = 0;
		await runCountdown(server, [10, 5, 1], "restarting", {
			sleepFn: async (ms) => waited.push(ms / 60_000),
			isRunning: async () => ++checks <= 2,
		});
		assert.ok(waited.length < 4);
	});

	it("takes the minutes in any order", async () => {
		const waited = [];
		await runCountdown(server, [1, 15, 5], "restarting", { sleepFn: async (ms) => waited.push(ms / 60_000), isRunning: async () => true });
		assert.equal(waited.reduce((a, b) => a + b, 0), 15);
	});
});

describe("which games can be spoken to", () => {
	it("knows the broadcast command of the games that have one, and of no others", async () => {
		const { getBroadcastCommand } = await import("../../src/server/services/gameCommands.js");
		assert.equal(getBroadcastCommand({ type: "minecraft" }, "hi"), "say hi");
		assert.equal(getBroadcastCommand({ type: "ark" }, "hi"), "serverchat hi");
		assert.equal(getBroadcastCommand({ type: "Palword" }, "hi"), "Broadcast hi");
		assert.equal(getBroadcastCommand({ type: "conan" }, "hi"), "broadcast hi");
		assert.equal(getBroadcastCommand({ type: "valheim" }, "hi"), null);
		assert.equal(getBroadcastCommand({ type: "custom" }, "hi"), null);
	});
});

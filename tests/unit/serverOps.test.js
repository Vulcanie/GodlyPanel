import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runOperation, runDetached, currentOperation, BusyError } from "../../src/server/services/serverOps.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe("one job at a time per server", () => {
	it("refuses a second job while one runs, and frees the lock after", async () => {
		const first = runOperation("A", "backup", () => sleep(80));
		assert.equal(currentOperation("A"), "backup");
		await assert.rejects(() => runOperation("A", "restart", async () => {}), (err) => err instanceof BusyError && err.status === 409 && /busy \(backup\)/.test(err.message));
		await first;
		assert.equal(currentOperation("A"), null);
		await runOperation("A", "restart", async () => {});
	});

	it("releases the lock when the job throws", async () => {
		await assert.rejects(() => runOperation("B", "x", async () => { throw new Error("boom"); }), /boom/);
		assert.equal(currentOperation("B"), null);
	});

	it("does not mix up different servers", async () => {
		const a = runOperation("C1", "backup", () => sleep(50));
		await runOperation("C2", "backup", async () => {});
		await a;
	});

	it("lets scheduled work queue behind the current job, in order", async () => {
		const order = [];
		const first = runOperation("D", "one", async () => { await sleep(60); order.push(1); });
		const second = runOperation("D", "two", async () => { order.push(2); }, { wait: true });
		const third = runOperation("D", "three", async () => { order.push(3); }, { wait: true });
		await Promise.all([first, second, third]);
		assert.deepEqual(order, [1, 2, 3]);
	});

	it("answers early but keeps the lock until the work is done", async () => {
		const answer = await runDetached("E", "stopping", async (report) => {
			report("sent");
			await sleep(80);
		});
		assert.equal(answer, "sent");
		assert.equal(currentOperation("E"), "stopping");
		await sleep(150);
		assert.equal(currentOperation("E"), null);
	});

	it("rejects to the caller if the work fails before answering, and refuses when busy", async () => {
		await assert.rejects(() => runDetached("F", "starting", async () => { throw new Error("no start"); }), /no start/);
		assert.equal(currentOperation("F"), null);
		const held = runDetached("G", "updating", async (report) => { report(1); await sleep(80); });
		await held;
		assert.throws(() => runDetached("G", "stopping", async () => {}), BusyError);
	});
});

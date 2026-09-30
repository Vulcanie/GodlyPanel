import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { initialState, step } from "../../src/server/services/crashPolicy.js";

const cfg = { graceMs: 45_000, maxRestarts: 3, windowMs: 15 * 60_000, startupGraceMs: 10 * 60_000 };
const S = 1000;

// Drive the policy through a list of (time, online, alive) observations.
function run(observations, start = initialState()) {
	let state = start;
	const actions = [];
	for (const [t, online, alive = false] of observations) {
		const r = step(state, { online, alive, now: t * S }, cfg);
		state = r.state;
		actions.push(r.action);
	}
	return { state, actions };
}

describe("crash recovery decisions", () => {
	it("leaves a server alone that was never seen online", () => {
		const { actions } = run([[0, false], [60, false], [600, false]]);
		assert.deepEqual(actions, [null, null, null]);
	});

	it("waits out the grace period before calling it a crash", () => {
		const { actions } = run([[0, true], [10, false], [40, false], [56, false]]);
		assert.deepEqual(actions, [null, null, null, "restart"]);
	});

	it("does not restart on a blip that recovers within the grace period", () => {
		const { actions, state } = run([[0, true], [10, false], [30, true], [90, true]]);
		assert.deepEqual(actions, [null, null, null, null]);
		assert.equal(state.downSince, null);
	});

	it("gives a restarted server time to load, then reports it recovered", () => {
		const first = run([[0, true], [10, false], [60, false]]);
		assert.equal(first.actions[2], "restart");
		// Still running, so still loading.
		const loading = run([[70, false, true], [200, false, true], [500, false, true]], first.state);
		assert.deepEqual(loading.actions, [null, null, null], "still within the startup grace");
		const up = run([[520, true]], loading.state);
		assert.deepEqual(up.actions, ["recovered"]);
	});

	it("does not wait out the load time for a program that has already gone", () => {
		const first = run([[0, true], [10, false], [60, false]]);
		const gone = step(first.state, { online: false, alive: false, now: 120 * S }, cfg);
		assert.equal(gone.action, "restart");
		assert.equal(gone.reason, "start_timeout");
	});

	it("tries again when a restart never comes up", () => {
		const first = run([[0, true], [10, false], [60, false]]);
		const timedOut = run([[700, false]], first.state);
		assert.equal(timedOut.actions[0], "restart");
		assert.equal(step(first.state, { online: false, alive: false, now: 700 * S }, cfg).reason, "start_timeout");
	});

	it("gives up after too many restarts in the window, and says so once", () => {
		// A server that comes up, dies within a minute, is restarted, and does it again.
		let state = initialState();
		const actions = [];
		const observe = (t, online) => {
			const r = step(state, { online, alive: false, now: t * S }, cfg);
			state = r.state;
			actions.push(r.action);
		};
		for (let cycle = 0; cycle < 5; cycle += 1) {
			const t0 = cycle * 120;
			observe(t0, true); // up
			observe(t0 + 20, false); // dies
			observe(t0 + 70, false); // past the grace period: restart, or give up
		}
		assert.equal(actions.filter((a) => a === "restart").length, 3);
		assert.equal(actions.filter((a) => a === "give_up").length, 1);
		assert.equal(state.gaveUp, true);
		observe(700, false);
		assert.equal(actions.at(-1), null, "and then it stops trying");
	});

	it("counts only restarts inside the window", () => {
		const old = { ...initialState(), up: true, downSince: 0, restarts: [0, 1 * S, 2 * S] };
		const r = step(old, { online: false, alive: false, now: 100 * 60 * S }, cfg);
		assert.equal(r.action, "restart", "old ones have aged out");
		const recent = { ...initialState(), up: true, downSince: 0, restarts: [90 * 60 * S, 91 * 60 * S, 92 * 60 * S] };
		const g = step(recent, { online: false, alive: false, now: 100 * 60 * S }, cfg);
		assert.equal(g.action, "give_up");
	});

	it("leaves a program that is still running but not answering alone", () => {
		const up = { ...initialState(), up: true, downSince: 0 };
		const first = step(up, { online: false, alive: true, now: 100 * S }, cfg);
		assert.equal(first.action, "unresponsive");
		const second = step(first.state, { online: false, alive: true, now: 200 * S }, cfg);
		assert.equal(second.action, null, "said once, not every few seconds");
		assert.equal(second.state.restarts.length, 0, "and never restarted");
	});
});

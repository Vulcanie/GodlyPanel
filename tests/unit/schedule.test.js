import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nextDaily, dueAt, decide, validateTask } from "../../src/server/services/schedule.js";

const local = (y, m, d, hh, mm) => new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
const iso = (ms) => new Date(ms).toISOString();

describe("when scheduled tasks are due", () => {
	it("finds the next time of day, today if it hasn't passed yet", () => {
		assert.equal(nextDaily("04:30", null, local(2026, 9, 30, 3, 0)), local(2026, 9, 30, 4, 30));
		assert.equal(nextDaily("04:30", null, local(2026, 9, 30, 5, 0)), local(2026, 10, 1, 4, 30));
		assert.equal(nextDaily("04:30", null, local(2026, 9, 30, 4, 30)), local(2026, 10, 1, 4, 30), "strictly after");
	});

	it("honours days of the week, including across a month end", () => {
		// 2026-09-30 is a Wednesday (3). Saturday is 6.
		assert.equal(new Date(nextDaily("12:00", [6], local(2026, 9, 30, 13, 0))).getDay(), 6);
		assert.equal(nextDaily("12:00", [6], local(2026, 9, 30, 13, 0)), local(2026, 10, 3, 12, 0));
		assert.equal(nextDaily("12:00", [3], local(2026, 9, 30, 13, 0)), local(2026, 10, 7, 12, 0));
	});

	it("counts from when a task was made, or last ran", () => {
		const made = local(2026, 9, 30, 10, 0);
		const daily = { createdAt: iso(made), lastRunAt: null, when: { type: "daily", time: "04:00", days: null } };
		assert.equal(dueAt(daily), local(2026, 10, 1, 4, 0));
		const ran = { ...daily, lastRunAt: iso(local(2026, 10, 1, 4, 0)) };
		assert.equal(dueAt(ran), local(2026, 10, 2, 4, 0));
		const every = { createdAt: iso(made), lastRunAt: null, when: { type: "interval", everyMinutes: 360 } };
		assert.equal(dueAt(every), made + 6 * 3600_000);
		assert.equal(dueAt({ ...every, lastRunAt: iso(made + 7 * 3600_000) }), made + 13 * 3600_000);
		const once = { createdAt: iso(made), lastRunAt: null, when: { type: "once", at: iso(made + 5000) } };
		assert.equal(dueAt(once), made + 5000);
		assert.equal(dueAt({ ...once, lastRunAt: iso(made + 6000) }), null, "a one-off doesn't come round again");
	});

	it("runs what is due, waits for what isn't, and skips what is long overdue", () => {
		const made = local(2026, 9, 30, 10, 0);
		const task = { createdAt: iso(made), lastRunAt: null, when: { type: "interval", everyMinutes: 60 } };
		const due = made + 3600_000;
		const catchUp = 30 * 60_000;
		assert.equal(decide(task, due - 1000, catchUp), "wait");
		assert.equal(decide(task, due, catchUp), "run");
		assert.equal(decide(task, due + 29 * 60_000, catchUp), "run", "a little late still runs");
		assert.equal(decide(task, due + 31 * 60_000, catchUp), "skip", "a weekend late does not");
	});
});

describe("checking a schedule before it is saved", () => {
	const servers = ["Alpha", "Beta"];
	const good = { kind: "restart", servers: ["Alpha"], when: { type: "daily", time: "04:00" } };

	it("accepts a sensible one and fills in the defaults", () => {
		const t = validateTask(good, servers);
		assert.deepEqual(t.options.warnMinutes, [10, 5, 1]);
		assert.equal(t.when.days, null);
		assert.equal(t.enabled, true);
	});

	it("turns every day of the week into 'any day', and sorts the warnings", () => {
		assert.equal(validateTask({ ...good, when: { type: "daily", time: "04:00", days: [0, 1, 2, 3, 4, 5, 6] } }, servers).when.days, null);
		assert.deepEqual(validateTask({ ...good, options: { warnMinutes: [1, 15, 5, 5] } }, servers).options.warnMinutes, [15, 5, 1]);
		assert.deepEqual(validateTask({ ...good, options: { warnMinutes: [] } }, servers).options.warnMinutes, []);
	});

	it("refuses what doesn't make sense", () => {
		const bad = [
			[{ ...good, kind: "format-disk" }, /kind/],
			[{ ...good, servers: [] }, /at least one server/],
			[{ ...good, servers: ["Nope"] }, /no server called/],
			[{ ...good, when: { type: "daily", time: "25:00" } }, /Time must/],
			[{ ...good, when: { type: "daily", time: "04:00", days: [7] } }, /Days must/],
			[{ ...good, when: { type: "daily", time: "04:00", days: [] } }, /at least one day/],
			[{ ...good, when: { type: "interval", everyMinutes: 1 } }, /Repeat every/],
			[{ ...good, when: { type: "once", at: "soon" } }, /date and time/],
			[{ ...good, when: { type: "weekly" } }, /when.type/],
			[{ ...good, options: { warnMinutes: [500] } }, /Warning times/],
			[{ kind: "command", servers: ["Alpha"], when: good.when, options: {} }, /command/],
			[{ kind: "backup", servers: ["Alpha"], when: good.when, options: { mode: "eject" } }, /Backup mode/],
		];
		for (const [input, message] of bad) assert.throws(() => validateTask(input, servers), message);
	});
});

describe("announcement schedules", () => {
	const servers = ["Alpha"];
	const base = { kind: "announce", servers: ["Alpha"], when: { type: "interval", everyMinutes: 30 } };

	it("needs at least one message and keeps them short and on one line", () => {
		assert.throws(() => validateTask({ ...base, options: {} }, servers), /at least one message/);
		assert.throws(() => validateTask({ ...base, options: { messages: ["  ", ""] } }, servers), /at least one message/);
		assert.throws(() => validateTask({ ...base, options: { messages: ["x".repeat(201)] } }, servers), /under 200/);
		assert.throws(() => validateTask({ ...base, options: { messages: ["line one\nKick everyone"] } }, servers), /single line/);
		assert.throws(() => validateTask({ ...base, options: { messages: Array(31).fill("hi") } }, servers), /too many messages/);
	});

	it("keeps the messages in order, trimmed", () => {
		const t = validateTask({ ...base, options: { messages: [" Join our Discord ", "Be kind", ""] } }, servers);
		assert.deepEqual(t.options.messages, ["Join our Discord", "Be kind"]);
	});
});

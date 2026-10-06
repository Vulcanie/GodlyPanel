import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { check, fc } from "../helpers/fc.js";
import { nextDaily, dueAt, decide, validateTask, KINDS } from "../../src/server/services/schedule.js";

// When a scheduled backup or restart happens, and what the panel accepts as a schedule. A wrong answer here is a backup that
// silently didn't run, so these are rules over every time, day and setting, not a handful of examples.

const DAY = 86_400_000;
const MINUTE = 60_000;
const time = fc.tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 })).map(([h, m]) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
// Any moment between 2024 and 2030, so every time zone rule and leap day gets its turn.
const moment = fc.integer({ min: Date.UTC(2024, 0, 1), max: Date.UTC(2030, 11, 31) });
const days = fc.option(fc.uniqueArray(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 7 }), { nil: null });

describe("the next time a daily task is due", () => {
	it("is in the future, within a week or so, on one of the chosen days, at the chosen time", () => {
		check(
			fc.property(time, days, moment, (t, chosen, after) => {
				const next = nextDaily(t, chosen, after);
				assert.ok(next > after, "strictly after");
				assert.ok(next - after <= 8 * DAY, "within eight days");
				const when = new Date(next);
				if (chosen) assert.ok(chosen.includes(when.getDay()), `day ${when.getDay()} not in ${chosen}`);
				// At the chosen time, unless that clock time doesn't exist that day (the hour skipped when the clocks go forward).
				const [hh, mm] = t.split(":").map(Number);
				const exists = new Date(when.getFullYear(), when.getMonth(), when.getDate(), hh, mm).getHours() === hh;
				if (exists) assert.deepEqual([when.getHours(), when.getMinutes()], [hh, mm], `${t} on ${when}`);
			}),
		);
	});

	it("is the earliest such time: nothing qualifies between now and it", () => {
		check(
			fc.property(time, days, moment, (t, chosen, after) => {
				const next = nextDaily(t, chosen, after);
				const [hh, mm] = t.split(":").map(Number);
				// Every day from today until the answer's own day: the chosen time on an allowed day, strictly between, would be earlier.
				for (let day = new Date(after); day <= new Date(next); day = new Date(day.getTime() + DAY)) {
					const c = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm, 0, 0).getTime();
					const ok = c > after && c < next && (!chosen || chosen.includes(new Date(c).getDay()));
					assert.equal(ok, false, `${new Date(c)} is earlier than ${new Date(next)}`);
				}
			}),
			{ numRuns: 150 },
		);
	});

	it("moves forward as the starting point moves forward", () => {
		check(fc.property(time, days, moment, fc.integer({ min: 0, max: 40 * DAY }), (t, chosen, after, later) => {
			assert.ok(nextDaily(t, chosen, after + later) >= nextDaily(t, chosen, after));
		}));
	});
});

describe("whether a task runs, waits or is skipped", () => {
	const iso = (ms) => new Date(ms).toISOString();
	const task = fc
		.tuple(
			moment,
			fc.option(fc.integer({ min: 0, max: 400 * DAY }), { nil: null }),
			fc.oneof(
				fc.record({ type: fc.constant("interval"), everyMinutes: fc.integer({ min: 5, max: 60 * 24 * 30 }) }),
				fc.record({ type: fc.constant("daily"), time, days }),
				moment.map((at) => ({ type: "once", at: iso(at) })),
			),
		)
		.map(([created, ranAfter, when]) => ({ createdAt: iso(created), lastRunAt: ranAfter === null ? null : iso(created + ranAfter), when }));
	const rank = { wait: 0, run: 1, skip: 2 };

	it("goes from waiting, to running, to skipped as time passes, and never runs again after skipping", () => {
		check(fc.property(task, moment, fc.integer({ min: 0, max: 365 * DAY }), fc.integer({ min: MINUTE, max: 14 * DAY }), (t, now, step, catchUp) => {
			assert.ok(rank[decide(t, now, catchUp)] <= rank[decide(t, now + step, catchUp)], `${JSON.stringify(t)} at ${iso(now)} then +${step}`);
		}));
	});

	it("runs exactly when it is due and not long overdue, and only skips what is longer overdue than the allowance", () => {
		check(fc.property(task, moment, fc.integer({ min: MINUTE, max: 14 * DAY }), (t, now, catchUp) => {
			const due = dueAt(t);
			const answer = decide(t, now, catchUp);
			if (due === null || due > now) assert.equal(answer, "wait");
			else if (now - due > catchUp) assert.equal(answer, "skip");
			else assert.equal(answer, "run");
		}));
	});

	it("never due again for a one-off that has run, and counts intervals from the later of creation and last run", () => {
		check(fc.property(moment, fc.integer({ min: 1, max: 100 * DAY }), (at, ranAfter) => {
			const once = { createdAt: iso(at - DAY), lastRunAt: iso(at + ranAfter), when: { type: "once", at: iso(at) } };
			assert.equal(dueAt(once), null);
		}));
		check(fc.property(moment, fc.integer({ min: 0, max: 100 * DAY }), fc.integer({ min: 5, max: 5000 }), (created, ranAfter, every) => {
			const t = { createdAt: iso(created), lastRunAt: iso(created + ranAfter), when: { type: "interval", everyMinutes: every } };
			assert.equal(dueAt(t), created + ranAfter + every * MINUTE);
		}));
	});
});

describe("accepting a schedule", () => {
	const servers = ["Alpha", "Beta", "Gamma"];
	const rejected = (fn) => {
		try {
			fn();
			return null;
		} catch (err) {
			return err;
		}
	};

	it("either accepts it or refuses it with a plain 400 and a message, whatever it is sent", () => {
		check(
			fc.property(fc.anything({ maxDepth: 4 }), (input) => {
				const err = rejected(() => validateTask(input, servers));
				if (err) {
					assert.equal(err.status, 400, `${err.name}: ${err.message}`);
					assert.equal(typeof err.message, "string");
				}
			}),
			{ numRuns: 1000 },
		);
	});

	// Schedules the way the interface sends them, with the odd value mixed in.
	const when = fc.oneof(
		fc.record({ type: fc.constant("daily"), time, days: fc.option(fc.array(fc.integer({ min: -1, max: 8 }), { maxLength: 9 }), { nil: undefined }) }),
		fc.record({ type: fc.constant("interval"), everyMinutes: fc.integer({ min: 0, max: 60 * 24 * 40 }) }),
		fc.record({ type: fc.constant("once"), at: moment.map((m) => new Date(m).toISOString()) }),
	);
	const options = fc.record(
		{
			warnMinutes: fc.array(fc.integer({ min: 0, max: 130 }), { maxLength: 5 }),
			mode: fc.constantFrom("stop", "live", "other"),
			command: fc.string({ maxLength: 520 }),
			messages: fc.array(fc.string({ maxLength: 210 }), { maxLength: 32 }),
		},
		{ requiredKeys: [] },
	);
	const schedule = fc.record({ kind: fc.constantFrom(...KINDS), name: fc.string({ maxLength: 100 }), servers: fc.array(fc.constantFrom(...servers, "Nope"), { maxLength: 4 }), when, options, enabled: fc.boolean() });

	it("hands back something it will accept again unchanged, and always within the limits it states", () => {
		check(fc.property(schedule, (input) => {
			let clean;
			try {
				clean = validateTask(input, servers);
			} catch {
				return;
			}
			assert.deepEqual(validateTask(clean, servers), clean, "accepting it again changes nothing");
			assert.ok(clean.servers.length >= 1 && clean.servers.every((s) => servers.includes(s)), "only servers that exist, each once");
			assert.equal(new Set(clean.servers).size, clean.servers.length);
			assert.ok(clean.name.length <= 80);
			if (clean.when.type === "daily") {
				assert.match(clean.when.time, /^([01]\d|2[0-3]):[0-5]\d$/);
				if (clean.when.days) assert.ok(clean.when.days.length >= 1 && clean.when.days.length < 7 && clean.when.days.every((d) => d >= 0 && d <= 6) && new Set(clean.when.days).size === clean.when.days.length);
			}
			if (clean.when.type === "interval") assert.ok(clean.when.everyMinutes >= 5 && clean.when.everyMinutes <= 60 * 24 * 30);
			if (clean.options.warnMinutes) assert.deepEqual(clean.options.warnMinutes, [...clean.options.warnMinutes].sort((a, b) => b - a), "longest warning first");
			if (clean.options.command !== undefined) assert.ok(clean.options.command.length > 0 && clean.options.command.length <= 500 && clean.options.command === clean.options.command.trim());
			if (clean.options.messages) assert.ok(clean.options.messages.length >= 1 && clean.options.messages.every((m) => m.length > 0 && m.length <= 200 && !/[\r\n]/.test(m)), "single, non-empty, short lines");
		}));
	});

	it("never lets a line break into an announcement, where it would end the command and start another", () => {
		check(fc.property(fc.array(fc.string({ maxLength: 40 }), { minLength: 1, maxLength: 5 }), fc.constantFrom("\n", "\r", "\r\n"), fc.nat({ max: 3 }), (messages, eol, at) => {
			// The break goes between two words of a message. (One at the very start or end is trimmed away, which is fine: nothing is left to run.)
			const poisoned = messages.map((m, i) => (i === at % messages.length ? `${m.trim() || "x"}${eol}say hacked` : m));
			const err = rejected(() => validateTask({ kind: "announce", servers: ["Alpha"], when: { type: "interval", everyMinutes: 10 }, options: { messages: poisoned } }, servers));
			assert.ok(err && err.status === 400 && /single line/.test(err.message), poisoned.map((m) => JSON.stringify(m)).join());
		}));
	});
});

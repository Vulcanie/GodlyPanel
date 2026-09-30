// When scheduled tasks are due. Pure, so the arithmetic (daily at a time, on some
// days, every N minutes, once) can be tested without waiting for a clock. Times
// are the PC's local time, which is what someone setting "4am" means.

export const KINDS = ["backup", "restart", "update", "command"];

const MIN_INTERVAL_MINUTES = 5;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** The first local HH:MM strictly after `afterMs`, on one of `days` (0 = Sunday), or any day if null. */
export function nextDaily(time, days, afterMs) {
	const [, hh, mm] = TIME.exec(time);
	const after = new Date(afterMs);
	for (let offset = 0; offset <= 8; offset += 1) {
		const candidate = new Date(after.getFullYear(), after.getMonth(), after.getDate() + offset, Number(hh), Number(mm), 0, 0);
		if (candidate.getTime() <= afterMs) continue;
		if (days && !days.includes(candidate.getDay())) continue;
		return candidate.getTime();
	}
	return null;
}

/**
 * When this task is next due, as epoch ms, or null if it never will be again.
 * Counted from the later of when it was made and when it last ran.
 */
export function dueAt(task) {
	const base = Math.max(Date.parse(task.createdAt) || 0, task.lastRunAt ? Date.parse(task.lastRunAt) : 0);
	const when = task.when;
	switch (when.type) {
		case "daily":
			return nextDaily(when.time, when.days ?? null, base);
		case "interval":
			return base + when.everyMinutes * 60_000;
		case "once":
			return task.lastRunAt ? null : Date.parse(when.at);
		default:
			return null;
	}
}

/**
 * What to do with an enabled task right now.
 * "run" when it is due; "skip" when it was due long ago (the panel was off), so a
 * backlog isn't run all at once; "wait" otherwise.
 */
export function decide(task, now, catchUpMs) {
	const due = dueAt(task);
	if (due === null || due > now) return "wait";
	return now - due > catchUpMs ? "skip" : "run";
}

function fail(message) {
	const err = new Error(message);
	err.status = 400;
	throw err;
}

/** Check and normalise a task as sent by the UI. `servers` are the names that exist. */
export function validateTask(input, knownServers) {
	if (!input || typeof input !== "object") fail("A schedule is required.");
	if (!KINDS.includes(input.kind)) fail(`kind must be one of ${KINDS.join(", ")}.`);

	if (!Array.isArray(input.servers) || input.servers.length === 0) fail("Choose at least one server.");
	if (input.servers.length > 50) fail("That is too many servers for one schedule.");
	for (const name of input.servers) {
		if (!knownServers.includes(name)) fail(`There is no server called "${name}".`);
	}

	const when = input.when ?? {};
	let cleanWhen;
	if (when.type === "daily") {
		if (!TIME.test(when.time ?? "")) fail("Time must look like 04:30.");
		let days = null;
		if (when.days !== undefined && when.days !== null) {
			if (!Array.isArray(when.days) || when.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) fail("Days must be numbers from 0 (Sunday) to 6 (Saturday).");
			days = [...new Set(when.days)].sort();
			if (days.length === 0) fail("Choose at least one day.");
			if (days.length === 7) days = null;
		}
		cleanWhen = { type: "daily", time: when.time, days };
	} else if (when.type === "interval") {
		if (!Number.isInteger(when.everyMinutes) || when.everyMinutes < MIN_INTERVAL_MINUTES || when.everyMinutes > 60 * 24 * 30) {
			fail(`Repeat every ${MIN_INTERVAL_MINUTES} minutes to 30 days.`);
		}
		cleanWhen = { type: "interval", everyMinutes: when.everyMinutes };
	} else if (when.type === "once") {
		const at = Date.parse(when.at);
		if (!Number.isFinite(at)) fail("Choose a date and time.");
		cleanWhen = { type: "once", at: new Date(at).toISOString() };
	} else {
		fail('when.type must be "daily", "interval" or "once".');
	}

	const options = {};
	const given = input.options ?? {};
	if (input.kind === "restart" || input.kind === "update") {
		let warn = given.warnMinutes ?? [10, 5, 1];
		if (!Array.isArray(warn) || warn.some((m) => !Number.isInteger(m) || m < 1 || m > 120)) fail("Warning times must be whole minutes from 1 to 120.");
		warn = [...new Set(warn)].sort((a, b) => b - a);
		options.warnMinutes = warn;
	}
	if (input.kind === "backup" && given.mode !== undefined && given.mode !== null) {
		if (!["stop", "live"].includes(given.mode)) fail('Backup mode must be "stop" or "live".');
		options.mode = given.mode;
	}
	if (input.kind === "command") {
		const command = String(given.command ?? "").trim();
		if (!command) fail("Enter the command to send.");
		if (command.length > 500) fail("That command is too long.");
		options.command = command;
	}

	const name = String(input.name ?? "").trim().slice(0, 80);
	return { kind: input.kind, name, servers: [...new Set(input.servers)], when: cleanWhen, options, enabled: input.enabled !== false };
}

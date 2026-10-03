import crypto from "node:crypto";
import path from "node:path";
import { paths } from "../paths.js";
import { readJson, writeJsonAtomic, createWriteQueue } from "../util/atomicJson.js";
import { all as allServers, get as getServer } from "../data/serverStore.js";
import { sleep } from "../util/async.js";
import { dueAt, decide, validateTask } from "./schedule.js";
import { runOperation } from "./serverOps.js";
import { stopAndWait, startAndWait, warnPlayers, broadcast } from "./serverLifecycle.js";
import { isServerRunning } from "./serverState.js";
import { createBackup } from "./backupService.js";
import { updateServer } from "./updateService.js";
import { sendRconCommand } from "./serverControl.js";
import { logActivity } from "./activityLog.js";

// Runs the recurring jobs people set up: backups, restarts (with an in-game
// countdown), game updates, and console commands. Tasks are kept in
// schedules.json. A task that came due while the panel was off is skipped rather
// than run late, unless it is only a little late, so starting the panel after a
// weekend doesn't fire a weekend's worth of restarts at once.

const FILE = path.join(paths.dataDir, "schedules.json");
const enqueue = createWriteQueue();
const CATCH_UP_MS = 30 * 60_000;
let tasks = [];
const running = new Set();

export async function initScheduler() {
	const stored = await readJson(FILE, null);
	tasks = Array.isArray(stored?.tasks) ? stored.tasks : [];
}

const persist = () => enqueue(() => writeJsonAtomic(FILE, { schemaVersion: 1, tasks }));

const describe = (task) => ({
	...task,
	nextRunAt: task.enabled && dueAt(task) !== null ? new Date(dueAt(task)).toISOString() : null,
	running: running.has(task.id),
});

export const listTasks = () => tasks.map(describe);

export async function addTask(input) {
	const clean = validateTask(input, allServers().map((s) => s.name));
	const task = { id: crypto.randomUUID(), ...clean, createdAt: new Date().toISOString(), lastRunAt: null, lastStatus: null, lastMessage: null };
	tasks = [...tasks, task];
	await persist();
	return describe(task);
}

export async function updateTask(id, input) {
	const existing = tasks.find((t) => t.id === id);
	if (!existing) return null;
	const clean = validateTask({ ...existing, ...input }, allServers().map((s) => s.name));
	// A changed time counts from now, not from when the task was first made.
	const rescheduled = JSON.stringify(clean.when) !== JSON.stringify(existing.when);
	const next = { ...existing, ...clean, ...(rescheduled ? { createdAt: new Date().toISOString(), lastRunAt: null } : {}) };
	tasks = tasks.map((t) => (t.id === id ? next : t));
	await persist();
	return describe(next);
}

export async function removeTask(id) {
	if (!tasks.some((t) => t.id === id)) return false;
	tasks = tasks.filter((t) => t.id !== id);
	await persist();
	return true;
}

/** A deleted server comes out of every schedule; a schedule left with none is removed. */
export async function forgetServerInSchedules(name) {
	const before = tasks.length;
	tasks = tasks
		.map((t) => ({ ...t, servers: t.servers.filter((s) => s !== name) }))
		.filter((t) => t.servers.length > 0);
	if (tasks.length !== before || tasks.some((t) => !t.servers.includes(name))) await persist();
}

// ---- running a task ----------------------------------------------------------

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Warn players on a schedule of "N minutes left" messages, then wait out the last
 * of it. Skipped when nobody could see it (the server isn't running).
 */
export async function runCountdown(server, minutes, action, { sleepFn = sleep, isRunning = isServerRunning } = {}) {
	if (minutes.length === 0 || !(await isRunning(server))) return;
	const steps = [...minutes].sort((a, b) => b - a);
	let remaining = steps[0];
	for (const step of steps) {
		await sleepFn((remaining - step) * 60_000);
		if (!(await isRunning(server))) return;
		await warnPlayers(server, `Server ${action} in ${plural(step, "minute")}. Please find a safe place to log off.`);
		remaining = step;
	}
	await sleepFn(remaining * 60_000);
	await warnPlayers(server, `Server ${action} now.`);
}

async function runOnServer(task, server) {
	switch (task.kind) {
		case "backup": {
			await runOperation(
				server.name,
				"backing up",
				() => createBackup(server, { kind: "scheduled", reason: task.name || "Scheduled backup", mode: task.options.mode ?? null }),
				{ wait: true },
			);
			return "backed up";
		}
		case "restart": {
			if (!(await isServerRunning(server))) return "wasn't running, so left alone";
			await runCountdown(server, task.options.warnMinutes ?? [], "restarting");
			await runOperation(
				server.name,
				"restarting",
				async () => {
					await stopAndWait(server);
					const { online } = await startAndWait(server);
					if (!online) throw new Error("The restart ran, but the server did not come back online afterwards. Check its Logs tab.");
				},
				{ wait: true },
			);
			logActivity({ type: "server.restarted.scheduled", server: server.name, message: `${server.name} was restarted on schedule.` });
			return "restarted";
		}
		case "update": {
			if (!server.updateAppId) return "has no game update to run";
			await runCountdown(server, task.options.warnMinutes ?? [], "updating and restarting");
			await runOperation(
				server.name,
				"updating",
				async () => {
					const started = await updateServer(server, { restart: true });
					await started.finished;
				},
				{ wait: true },
			);
			return "updated";
		}
		case "announce": {
			if (!(await isServerRunning(server))) return "wasn't running, so nothing was announced";
			const messages = task.options.messages ?? [];
			// Each run says the next message in turn, wrapping round.
			const at = (task.nextMessage ?? 0) % messages.length;
			const r = await broadcast(server, messages[at]);
			if (!r.sent) throw new Error(`couldn't announce: ${r.reason}`);
			tasks = tasks.map((t) => (t.id === task.id ? { ...t, nextMessage: (at + 1) % messages.length } : t));
			return `announced "${messages[at].slice(0, 60)}"`;
		}
		case "command": {
			if (!(await isServerRunning(server))) return "wasn't running, so the command wasn't sent";
			const reply = await sendRconCommand(server, task.options.command);
			return `sent (${String(reply ?? "").trim().slice(0, 80) || "no reply"})`;
		}
		default:
			return "unknown task";
	}
}

/** Run a task now. Resolves with what happened to each server. */
export async function runTask(id, { manual = false } = {}) {
	const task = tasks.find((t) => t.id === id);
	if (!task) return null;
	if (running.has(id)) return { alreadyRunning: true };
	running.add(id);
	const label = task.name || `${task.kind} schedule`;
	const results = [];
	try {
		const work = task.servers.map(async (name) => {
			const server = getServer(name);
			if (!server) return results.push({ server: name, ok: false, message: "the server no longer exists" });
			try {
				results.push({ server: name, ok: true, message: await runOnServer(task, server) });
			} catch (err) {
				results.push({ server: name, ok: false, message: err.message });
			}
		});
		// Countdowns overlap, but each server's own stop and start queue behind its lock.
		await Promise.all(work);
	} finally {
		running.delete(id);
	}

	const failed = results.filter((r) => !r.ok);
	const status = failed.length === 0 ? "ok" : "failed";
	const summary = results.map((r) => `${r.server}: ${r.message}`).join("; ");
	tasks = tasks.map((t) => (t.id === id ? { ...t, lastRunAt: new Date().toISOString(), lastStatus: status, lastMessage: summary.slice(0, 500), ...(t.when.type === "once" ? { enabled: false } : {}) } : t));
	await persist();
	logActivity({
		type: status === "ok" ? "schedule.ran" : "schedule.failed",
		server: task.servers.length === 1 ? task.servers[0] : null,
		level: status === "ok" ? "info" : "error",
		message: `${manual ? "Ran" : "Scheduled"}: ${label} ${status === "ok" ? "finished" : "had a problem"}. ${summary}`,
		data: { taskId: id, kind: task.kind },
	});
	return { results };
}

/** Called every few seconds: runs what is due. */
export async function tickScheduler(now = Date.now()) {
	for (const task of [...tasks]) {
		if (!task.enabled || running.has(task.id)) continue;
		const verdict = decide(task, now, CATCH_UP_MS);
		if (verdict === "wait") continue;
		if (verdict === "skip") {
			tasks = tasks.map((t) => (t.id === task.id ? { ...t, lastRunAt: new Date(now).toISOString(), lastStatus: "skipped", lastMessage: "It was due while the panel wasn't running, so it was skipped." } : t));
			await persist();
			logActivity({ type: "schedule.skipped", level: "warn", message: `Skipped: ${task.name || task.kind} was due while the panel wasn't running.` });
			continue;
		}
		runTask(task.id).catch((err) => console.error(`[schedule] ${task.id}:`, err));
	}
}

export const schedulesFile = FILE;

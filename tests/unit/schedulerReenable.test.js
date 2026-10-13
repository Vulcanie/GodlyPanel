import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// A schedule that was switched off for a while and then on again starts counting from then. It used to be counted from when it was
// made (or last ran), found "missed" and logged as skipped with a warning, though nobody had missed anything.

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-sched-"));
process.env.GHP_DATA_DIR = dir;
const { ensureDataDirs } = await import("../../src/server/paths.js");
ensureDataDirs();
const longAgo = new Date(Date.now() - 5 * 86_400_000).toISOString();
fs.writeFileSync(path.join(dir, "servers.json"), JSON.stringify({ schemaVersion: 1, servers: [{ name: "Alpha", type: "custom", method: "process", host: "127.0.0.1", processName: "nope.exe", installDir: dir, workingDir: dir }] }));
fs.writeFileSync(
	path.join(dir, "schedules.json"),
	JSON.stringify({
		schemaVersion: 1,
		tasks: [{ id: "paused", kind: "backup", name: "Nightly", servers: ["Alpha"], when: { type: "daily", time: "04:00", days: null }, options: {}, enabled: false, createdAt: longAgo, lastRunAt: longAgo, lastStatus: "ok", lastMessage: null }],
	}),
);
const { initServerStore } = await import("../../src/server/data/serverStore.js");
const scheduler = await import("../../src/server/services/scheduler.js");

describe("switching a schedule back on", () => {
	before(async () => {
		await initServerStore();
		await scheduler.initScheduler();
	});
	after(() => fs.rmSync(dir, { recursive: true, force: true }));

	it("counts from now, so nothing counts as missed", async () => {
		const back = await scheduler.updateTask("paused", { enabled: true });
		assert.equal(back.enabled, true);
		assert.ok(Date.parse(back.nextRunAt) > Date.now(), "next run is ahead of us");
		await scheduler.tickScheduler();
		const [task] = scheduler.listTasks();
		assert.notEqual(task.lastStatus, "skipped", "it was not logged as a skipped run");
	});

	it("leaves the times alone when something else about a running schedule changes", async () => {
		const before = scheduler.listTasks()[0];
		const renamed = await scheduler.updateTask("paused", { name: "Nightly backup" });
		assert.equal(renamed.createdAt, before.createdAt);
	});
});

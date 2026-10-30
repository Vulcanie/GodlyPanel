import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Keeping the newest scheduled backups. "Keep 0" used to be accepted for one server (or one off-machine destination) and then
// deleted every scheduled backup the moment it was made.

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-retention-"));
process.env.GHP_DATA_DIR = dir;
const { ensureDataDirs } = await import("../../src/server/paths.js");
ensureDataDirs();
const { initConfig } = await import("../../src/server/config/configStore.js");
const { setOptions } = await import("../../src/server/data/serverOptions.js");
const { applyRetention, serverBackupDir, pickRetained } = await import("../../src/server/services/backupService.js");
const { saveDestination } = await import("../../src/server/services/backupDestinations.js");

describe("backup retention", () => {
	const server = { name: "Retention Test" };

	before(async () => {
		await initConfig();
	});
	after(() => fs.rmSync(dir, { recursive: true, force: true }));

	const makeBackups = (count) => {
		const folder = serverBackupDir(server);
		fs.rmSync(folder, { recursive: true, force: true });
		fs.mkdirSync(folder, { recursive: true });
		for (let i = 0; i < count; i += 1) {
			const id = `retention_2026010${i + 1}-000000_scheduled`;
			fs.writeFileSync(path.join(folder, `${id}.zip`), "x");
			fs.writeFileSync(path.join(folder, `${id}.json`), JSON.stringify({ kind: "scheduled", createdAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString() }));
		}
		return folder;
	};

	it("keeps the newest few scheduled backups", async () => {
		const folder = makeBackups(4);
		await setOptions(server.name, { backup: { keepCount: 2 } });
		const removed = await applyRetention(server);
		assert.equal(removed.length, 2);
		assert.deepEqual(fs.readdirSync(folder).filter((f) => f.endsWith(".zip")).sort(), ["retention_20260103-000000_scheduled.zip", "retention_20260104-000000_scheduled.zip"]);
	});

	it("never trims down to nothing, whatever count was stored", async () => {
		const folder = makeBackups(3);
		await setOptions(server.name, { backup: { keepCount: 0 } });
		await applyRetention(server);
		assert.equal(fs.readdirSync(folder).filter((f) => f.endsWith(".zip")).length, 1, "the newest one is kept");
	});

	it("refuses to save a keep count of 0 for an off-machine destination", async () => {
		await assert.rejects(
			saveDestination({ type: "folder", name: "Elsewhere", folder: { path: path.join(os.tmpdir(), "gp-retention-elsewhere") }, keepCount: 0 }),
			(err) => err.code === "bad_number",
		);
	});

	// Archives and records written straight into the folder, so each test can say exactly what is on disk.
	const writeBackup = (folder, id, kind, createdAt) => {
		fs.writeFileSync(path.join(folder, `${id}.zip`), "x");
		fs.writeFileSync(path.join(folder, `${id}.json`), JSON.stringify({ kind, createdAt }));
	};
	const freshFolder = () => {
		const folder = serverBackupDir(server);
		fs.rmSync(folder, { recursive: true, force: true });
		fs.mkdirSync(folder, { recursive: true });
		return folder;
	};
	const zipsIn = (folder) => fs.readdirSync(folder).filter((f) => f.endsWith(".zip")).map((f) => f.slice(0, -4)).sort();
	const recordsIn = (folder) => fs.readdirSync(folder).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
	const clearKeeps = () => setOptions(server.name, { backup: { keepCount: null, keepDays: null, keepDaily: null, keepWeekly: null, keepMonthly: null, keepManual: null } });

	it("in tiered mode keeps the spread the rules pick, removes the rest with their records, and never touches manual backups", async () => {
		await clearKeeps();
		const folder = freshFolder();
		const pad = (n) => String(n).padStart(2, "0");
		const spread = [15, 22, 25, 26, 27, 28, 29, 30, 31].map((n) => `tier_2026-03-${pad(n)}_scheduled`).sort();
		for (let n = 2; n <= 31; n += 1) writeBackup(folder, `tier_2026-03-${pad(n)}_scheduled`, "scheduled", `2026-03-${pad(n)}T02:00:00Z`);
		writeBackup(folder, "tier_2026-01-01_manual", "manual", "2026-01-01T00:00:00Z");
		await setOptions(server.name, { backup: { keepDaily: 7, keepWeekly: 4, keepMonthly: 3 } });

		const removed = await applyRetention(server);
		assert.equal(removed.length, 21, "thirty scheduled, nine kept");
		assert.deepEqual(zipsIn(folder), [...spread, "tier_2026-01-01_manual"].sort());
		assert.deepEqual(recordsIn(folder), [...spread, "tier_2026-01-01_manual"].sort(), "a removed backup's record goes with it");
	});

	it("trims manual backups to keepManual, newest first, and leaves them all when it is not set", async () => {
		await clearKeeps();
		const folder = freshFolder();
		for (let n = 1; n <= 4; n += 1) writeBackup(folder, `manual_2026-02-0${n}_manual`, "manual", `2026-02-0${n}T02:00:00Z`);

		assert.deepEqual(await applyRetention(server), [], "unset: nothing is removed");
		assert.equal(zipsIn(folder).length, 4);

		await setOptions(server.name, { backup: { keepManual: 2 } });
		const removed = await applyRetention(server);
		assert.equal(removed.length, 2);
		assert.deepEqual(zipsIn(folder), ["manual_2026-02-03_manual", "manual_2026-02-04_manual"]);
		assert.deepEqual(recordsIn(folder), ["manual_2026-02-03_manual", "manual_2026-02-04_manual"]);
		await clearKeeps();
	});
});

describe("pickRetained (the tiered keep rules, pure)", () => {
	const day = (n) => `2026-03-${String(n).padStart(2, "0")}`;

	it("keeps the newest backup of each recent day, week and month that has one", () => {
		// Mar 2 2026 is a Monday, so the weeks start on Mar 2, 9, 16, 23 and 30.
		const list = [];
		for (let n = 2; n <= 31; n += 1) list.push({ id: day(n), createdAt: `${day(n)}T02:00:00Z` });
		const kept = [...pickRetained(list, { keepDaily: 7, keepWeekly: 4, keepMonthly: 3 })].sort();
		// Seven days (25-31), plus the newest of the weeks of Mar 22 and Mar 15. No February backup, so monthly adds nothing.
		assert.deepEqual(kept, [15, 22, 25, 26, 27, 28, 29, 30, 31].map(day));
	});

	it("keeps only the newest of two backups on the same day", () => {
		const list = [
			{ id: "early", createdAt: "2026-03-10T02:00:00Z" },
			{ id: "late", createdAt: "2026-03-10T14:00:00Z" },
		];
		assert.deepEqual([...pickRetained(list, { keepDaily: 1 })], ["late"]);
	});

	it("keeps just the newest when every setting is 0", () => {
		const list = [
			{ id: "a", createdAt: "2026-03-01T00:00:00Z" },
			{ id: "b", createdAt: "2026-03-09T00:00:00Z" },
			{ id: "c", createdAt: "2026-03-05T00:00:00Z" },
		];
		assert.deepEqual([...pickRetained(list, { keepDaily: 0, keepWeekly: 0, keepMonthly: 0 })], ["b"]);
	});

	it("keeps the newest backup of each of the recent months that have one", () => {
		const list = [
			{ id: "jan15", createdAt: "2026-01-15T02:00:00Z" },
			{ id: "feb10", createdAt: "2026-02-10T02:00:00Z" },
			{ id: "feb20", createdAt: "2026-02-20T02:00:00Z" },
			{ id: "mar05", createdAt: "2026-03-05T02:00:00Z" },
		];
		assert.deepEqual([...pickRetained(list, { keepDaily: 0, keepWeekly: 0, keepMonthly: 2 })].sort(), ["feb20", "mar05"]);
	});

	it("ignores a backup whose date doesn't parse, and an empty list gives an empty set", () => {
		const list = [
			{ id: "bad", createdAt: "not a date" },
			{ id: "missing" },
			{ id: "ok", createdAt: "2026-03-01T00:00:00Z" },
		];
		assert.deepEqual([...pickRetained(list, { keepDaily: 3 })], ["ok"]);
		assert.equal(pickRetained([], { keepDaily: 3, keepWeekly: 2, keepMonthly: 1 }).size, 0);
	});
});

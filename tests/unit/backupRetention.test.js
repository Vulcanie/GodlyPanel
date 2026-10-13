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
const { applyRetention, serverBackupDir } = await import("../../src/server/services/backupService.js");
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
});

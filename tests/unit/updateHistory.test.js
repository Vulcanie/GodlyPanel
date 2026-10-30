import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { removeDir } from "../helpers/instance.js";

// The update history is a small file per panel, so the test gets its own data folder before the modules load (paths.js reads
// it at import time) and never touches a real one.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-history-"));
process.env.GHP_DATA_DIR = dir;
const { paths } = await import("../../src/server/paths.js");
const { addRecord, listHistory, patchRecord } = await import("../../src/server/services/updateHistory.js");

const record = (i, extra = {}) => ({
	at: new Date(Date.UTC(2026, 9, 30, 0, 0, i)).toISOString(),
	fromBuild: "100",
	toBuild: "101",
	branch: null,
	backupId: null,
	outcome: "updated",
	...extra,
});

describe("the per-server update history", () => {
	before(() => fs.rmSync(paths.updateHistoryFile, { force: true }));
	after(() => removeDir(dir));

	it("keeps only the newest 20 records of 25", async () => {
		for (let i = 0; i < 25; i += 1) await addRecord("Ark", record(i));
		const list = await listHistory("Ark");
		assert.equal(list.length, 20);
		assert.equal(list[0].at, record(5).at, "the oldest five were dropped");
		assert.equal(list[19].at, record(24).at, "newest last");
	});

	it("lists nothing for a server with no history", async () => {
		assert.deepEqual(await listHistory("Never Updated"), []);
	});

	it("patches only the record whose time matches", async () => {
		await addRecord("Patched", record(0));
		await addRecord("Patched", record(1));
		await addRecord("Patched", record(2));
		const before = await listHistory("Patched");
		await patchRecord("Patched", record(1).at, { outcome: "failed", backupId: "b-1" });
		const after = await listHistory("Patched");
		assert.equal(after[1].outcome, "failed");
		assert.equal(after[1].backupId, "b-1");
		assert.deepEqual(after[0], before[0]);
		assert.deepEqual(after[2], before[2]);
	});

	it("a patch for a record that was trimmed away does nothing", async () => {
		const before = await listHistory("Patched");
		await patchRecord("Patched", "1999-01-01T00:00:00.000Z", { outcome: "failed" });
		assert.deepEqual(await listHistory("Patched"), before);
	});

	it("a corrupt file reads as empty, and the next write starts again", async () => {
		fs.writeFileSync(paths.updateHistoryFile, "{ this is not json");
		assert.deepEqual(await listHistory("Ark"), []);
		await addRecord("Ark", record(30));
		assert.equal((await listHistory("Ark")).length, 1);
	});

	it("loses no record when two servers finish at once", async () => {
		const writes = [];
		for (let i = 0; i < 5; i += 1) {
			writes.push(addRecord("Alpha", record(i)), addRecord("Beta", record(i)));
		}
		await Promise.all(writes);
		assert.equal((await listHistory("Alpha")).length, 5);
		assert.equal((await listHistory("Beta")).length, 5);
	});

	it("__proto__ and constructor as server names are harmless", async () => {
		await addRecord("__proto__", record(0));
		await addRecord("constructor", record(1));
		assert.equal((await listHistory("__proto__")).length, 1);
		assert.equal((await listHistory("constructor")).length, 1);
		assert.equal(Object.getPrototypeOf({}), Object.prototype);
		assert.equal({}.outcome, undefined, "nothing was written onto Object.prototype");
		assert.equal(Object.hasOwn(Object.prototype, "fromBuild"), false);
	});
});

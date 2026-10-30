import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Backups in more than one archive format. A server's folder can hold .zip, .tar.zst and .tar.xz backups side by side,
// and listing, keeping, deleting and copying off the machine all treat them as the same kind of backup.

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-format-"));
const copies = fs.mkdtempSync(path.join(os.tmpdir(), "gp-format-copies-"));
process.env.GHP_DATA_DIR = dir;
const { ensureDataDirs } = await import("../../src/server/paths.js");
ensureDataDirs();
const { initConfig } = await import("../../src/server/config/configStore.js");
const { initSecrets } = await import("../../src/server/config/secretsStore.js");
const { setOptions } = await import("../../src/server/data/serverOptions.js");
const { createArchive } = await import("../../src/server/util/tarZip.js");
const { FORMATS } = await import("../../src/server/util/archiveFormats.js");
const { applyRetention, backupArchivePath, deleteBackup, listBackups, serverBackupDir } = await import("../../src/server/services/backupService.js");
const { saveDestination, listRemote, trimDestination } = await import("../../src/server/services/backupDestinations.js");

// A small world to put in every test archive. The archives are real: bsdtar writes each format for real.
const source = path.join(dir, "source");
fs.mkdirSync(source, { recursive: true });
fs.writeFileSync(path.join(source, "world.sav"), "world\n");

/** Writes a real archive of the given format into `folder`, with its JSON record beside it. */
async function makeBackup(folder, id, { format, kind = "scheduled", createdAt }) {
	fs.mkdirSync(folder, { recursive: true });
	const archive = path.join(folder, `${id}${FORMATS[format].ext}`);
	await createArchive(archive, [{ dir: source, name: "world.sav" }], { format, level: "balanced" });
	fs.writeFileSync(
		path.join(folder, `${id}.json`),
		JSON.stringify({ format: 1, id, kind, createdAt: createdAt.toISOString(), archiveFormat: format, archiveLevel: "balanced" }),
	);
	fs.utimesSync(archive, createdAt, createdAt);
	return archive;
}

describe("backups in more than one format", () => {
	const server = { name: "Format Test" };
	const folder = () => serverBackupDir(server);
	const reset = () => {
		fs.rmSync(folder(), { recursive: true, force: true });
		fs.mkdirSync(folder(), { recursive: true });
	};

	before(async () => {
		await initConfig();
		await initSecrets();
	});
	after(() => {
		fs.rmSync(dir, { recursive: true, force: true });
		fs.rmSync(copies, { recursive: true, force: true });
	});

	it("lists a .zip and a .tar.zst backup side by side, each with its format and level", async () => {
		reset();
		await makeBackup(folder(), "fmt_20260101-000000_manual", { format: "zip", kind: "manual", createdAt: new Date(Date.UTC(2026, 0, 1)) });
		await makeBackup(folder(), "fmt_20260102-000000_manual", { format: "zstd", kind: "manual", createdAt: new Date(Date.UTC(2026, 0, 2)) });
		fs.writeFileSync(path.join(folder(), "fmt_20260103-000000_manual.zip.partial"), "half written");

		const list = await listBackups(server);
		assert.equal(list.length, 2, "the .partial file is never listed");
		const byId = Object.fromEntries(list.map((b) => [b.id, b]));
		assert.equal(byId["fmt_20260101-000000_manual"].format, "zip");
		assert.equal(byId["fmt_20260102-000000_manual"].format, "zstd");
		assert.equal(byId["fmt_20260102-000000_manual"].level, "balanced");
	});

	it("lists one entry when a .zip and a .tar.zst share a name", async () => {
		reset();
		await makeBackup(folder(), "fmt_20260104-000000_manual", { format: "zip", kind: "manual", createdAt: new Date(Date.UTC(2026, 0, 4)) });
		await makeBackup(folder(), "fmt_20260104-000000_manual", { format: "zstd", kind: "manual", createdAt: new Date(Date.UTC(2026, 0, 4)) });
		assert.equal((await listBackups(server)).length, 1);
	});

	it("keeps the newest scheduled backups across both formats, and removes their records", async () => {
		reset();
		// Alternating formats, so a count kept per format would keep the wrong ones.
		const formats = ["zip", "zstd", "zip", "zstd"];
		for (let i = 1; i <= 4; i += 1) {
			await makeBackup(folder(), `fmt_2026010${i}-000000_scheduled`, { format: formats[i - 1], createdAt: new Date(Date.UTC(2026, 0, i)) });
		}
		await setOptions(server.name, { backup: { keepCount: 2 } });

		const removed = await applyRetention(server);
		assert.equal(removed.length, 2);
		assert.deepEqual(fs.readdirSync(folder()).filter((f) => !f.endsWith(".json")).sort(), ["fmt_20260103-000000_scheduled.zip", "fmt_20260104-000000_scheduled.tar.zst"]);
		assert.ok(fs.existsSync(path.join(folder(), "fmt_20260104-000000_scheduled.json")), "the newest record is kept");
		assert.equal(fs.existsSync(path.join(folder(), "fmt_20260101-000000_scheduled.json")), false, "the removed record is gone");
		assert.equal(fs.existsSync(path.join(folder(), "fmt_20260102-000000_scheduled.json")), false, "the removed record is gone");
	});

	it("deletes a .tar.zst backup and its record, and says not_found for an unknown id", async () => {
		reset();
		const id = "fmt_20260105-000000_manual";
		await makeBackup(folder(), id, { format: "zstd", kind: "manual", createdAt: new Date(Date.UTC(2026, 0, 5)) });
		await deleteBackup(server, id);
		assert.equal(fs.existsSync(path.join(folder(), `${id}.tar.zst`)), false);
		assert.equal(fs.existsSync(path.join(folder(), `${id}.json`)), false);
		await assert.rejects(deleteBackup(server, "nothing_here"), (err) => err.code === "not_found" && err.status === 404);
	});

	it("refuses an id with a path in it, and finds the archive of whichever format is there", async () => {
		reset();
		await assert.rejects(backupArchivePath(server, "../x"), (err) => err.code === "bad_id");
		await assert.rejects(deleteBackup(server, "../x"), (err) => err.code === "bad_id");
		assert.equal(await backupArchivePath(server, "fmt_missing"), null);

		const id = "fmt_20260106-000000_manual";
		await makeBackup(folder(), id, { format: "zstd", kind: "manual", createdAt: new Date(Date.UTC(2026, 0, 6)) });
		assert.equal(await backupArchivePath(server, id), path.join(folder(), `${id}.tar.zst`));
	});

	it("trims a folder destination that holds .zip and .tar.xz copies together", async () => {
		const server2 = { name: "Format Copies" };
		const remote = path.join(copies, path.basename(serverBackupDir(server2)));
		fs.rmSync(remote, { recursive: true, force: true });
		const destination = await saveDestination({ type: "folder", name: "Format Copies", folder: { path: copies }, keepCount: 2 });

		// Alternating zip and xz, so the newest two are one of each.
		const formats = ["zip", "xz", "zip", "xz"];
		for (let i = 1; i <= 4; i += 1) {
			await makeBackup(remote, `fmt_2026010${i}-000000_scheduled`, { format: formats[i - 1], createdAt: new Date(Date.UTC(2026, 0, i)) });
		}

		const before = await listRemote(destination.id, server2);
		assert.equal(before.length, 4);
		const formatOf = Object.fromEntries(before.map((o) => [o.id, o.format]));
		assert.deepEqual(formatOf, {
			"fmt_20260101-000000_scheduled": "zip",
			"fmt_20260102-000000_scheduled": "xz",
			"fmt_20260103-000000_scheduled": "zip",
			"fmt_20260104-000000_scheduled": "xz",
		});

		const removed = await trimDestination(destination, server2);
		assert.equal(removed.length, 2);
		const left = fs.readdirSync(remote).sort();
		assert.deepEqual(left, ["fmt_20260103-000000_scheduled.json", "fmt_20260103-000000_scheduled.zip", "fmt_20260104-000000_scheduled.json", "fmt_20260104-000000_scheduled.tar.xz"]);
		assert.equal((await listRemote(destination.id, server2)).length, 2);
	});
});

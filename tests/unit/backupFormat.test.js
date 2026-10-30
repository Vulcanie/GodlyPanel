import { describe, it, before, beforeEach, after } from "node:test";
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
const { createArchive, extractArchive, listArchive } = await import("../../src/server/util/tarZip.js");
const { FORMATS } = await import("../../src/server/util/archiveFormats.js");
const { applyRetention, backupArchivePath, deleteBackup, listBackups, recompressBackup, serverBackupDir } = await import("../../src/server/services/backupService.js");
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

	describe("recompressing a backup in place", () => {
		const rec = { name: "Recompress Test" };
		const recFolder = () => serverBackupDir(rec);
		const leftovers = () => fs.readdirSync(recFolder()).filter((f) => f.endsWith(".partial") || f.endsWith(".recompress"));

		beforeEach(() => {
			fs.rmSync(recFolder(), { recursive: true, force: true });
		});

		/** A backup as createBackup leaves it: an archive holding the manifest and the world, with its record beside it. */
		async function makeManifestBackup(id, { format, level = "balanced" }) {
			fs.mkdirSync(recFolder(), { recursive: true });
			const scratch = fs.mkdtempSync(path.join(dir, "manifest-"));
			const manifest = {
				format: 1,
				id,
				server: rec.name,
				kind: "manual",
				createdAt: new Date(Date.UTC(2026, 1, 1)).toISOString(),
				sourceBytes: fs.statSync(path.join(source, "world.sav")).size,
				fingerprint: "f".repeat(40),
				archiveFormat: format,
				archiveLevel: level,
				entries: [{ name: "world.sav", path: path.join(source, "world.sav"), label: "World", type: "file", exclude: [] }],
			};
			fs.writeFileSync(path.join(scratch, "gp-backup.json"), JSON.stringify(manifest, null, 2));
			const archive = path.join(recFolder(), `${id}${FORMATS[format].ext}`);
			await createArchive(archive, [{ dir: scratch, name: "gp-backup.json" }, { dir: source, name: "world.sav" }], { format, level });
			fs.rmSync(scratch, { recursive: true, force: true });
			const sizeBytes = fs.statSync(archive).size;
			fs.writeFileSync(path.join(recFolder(), `${id}.json`), JSON.stringify({ ...manifest, sizeBytes, bytesBefore: manifest.sourceBytes, bytesAfter: sizeBytes }, null, 2));
			return archive;
		}

		it("turns a zip backup into a zstd one, removes the zip, and updates the record", async () => {
			const id = "rc_20260201-000000_manual";
			const zip = await makeManifestBackup(id, { format: "zip" });
			const result = await recompressBackup(rec, id, { format: "zstd", level: "fast" });
			assert.equal(result.id, id);
			assert.ok(result.before > 0 && result.after > 0);
			assert.equal(result.skipped, undefined);

			const zst = path.join(recFolder(), `${id}.tar.zst`);
			assert.equal(fs.existsSync(zip), false, "the old zip is gone");
			assert.ok(fs.existsSync(zst), "the new archive is in place");
			assert.deepEqual(leftovers(), [], "no partial or temp folder is left behind");

			const [listed] = await listBackups(rec);
			assert.equal(listed.format, "zstd");
			assert.equal(listed.level, "fast");
			assert.equal(listed.sizeBytes, result.after);

			const record = JSON.parse(fs.readFileSync(path.join(recFolder(), `${id}.json`), "utf8"));
			assert.equal(record.archiveFormat, "zstd");
			assert.equal(record.archiveLevel, "fast");
			assert.equal(record.sizeBytes, result.after);
			assert.equal(record.bytesAfter, result.after);
			assert.equal(record.bytesBefore, fs.statSync(path.join(source, "world.sav")).size, "what the record said before is kept");
			assert.equal(record.fingerprint, "f".repeat(40), "the rest of the record is kept");

			const scratch = fs.mkdtempSync(path.join(dir, "check-"));
			await extractArchive(zst, scratch, ["gp-backup.json"]);
			assert.equal(JSON.parse(fs.readFileSync(path.join(scratch, "gp-backup.json"), "utf8")).archiveFormat, "zstd", "the manifest inside says so too");
			fs.rmSync(scratch, { recursive: true, force: true });
		});

		it("does nothing when the backup is already in that format and level", async () => {
			const id = "rc_20260202-000000_manual";
			const archive = await makeManifestBackup(id, { format: "zstd", level: "fast" });
			const before = fs.readFileSync(archive);
			const stamp = fs.statSync(archive).mtimeMs;

			const result = await recompressBackup(rec, id, { format: "zstd", level: "fast" });
			assert.equal(result.skipped, true);
			assert.equal(result.before, result.after);
			assert.ok(fs.readFileSync(archive).equals(before), "the file is untouched");
			assert.equal(fs.statSync(archive).mtimeMs, stamp);
		});

		it("rejects a corrupt archive and leaves the garbage, the record and no leftovers behind", async () => {
			const id = "rc_20260203-000000_manual";
			fs.mkdirSync(recFolder(), { recursive: true });
			const garbage = path.join(recFolder(), `${id}.zip`);
			fs.writeFileSync(garbage, "this is not an archive at all");
			fs.writeFileSync(path.join(recFolder(), `${id}.json`), JSON.stringify({ id, kind: "manual", archiveFormat: "zip", archiveLevel: "balanced", createdAt: new Date(0).toISOString() }));

			await assert.rejects(recompressBackup(rec, id, { format: "zstd", level: "fast" }));
			assert.equal(fs.readFileSync(garbage, "utf8"), "this is not an archive at all", "the old archive is still there");
			assert.deepEqual(leftovers(), [], "no .partial and no temp folder remain");
			assert.equal(fs.existsSync(path.join(recFolder(), `${id}.tar.zst`)), false);
		});

		it("refuses unknown formats and levels, unknown ids and unsafe ids, each with its own code", async () => {
			const id = "rc_20260204-000000_manual";
			await makeManifestBackup(id, { format: "zip" });
			const refused = async (format, level, requested, code, status = 400) => {
				await assert.rejects(recompressBackup(rec, requested, { format, level }), (err) => err.code === code && err.status === status, `${String(format)} / ${String(level)} / ${requested}`);
			};
			await refused("rar", "fast", id, "bad_format");
			await refused("__proto__", "fast", id, "bad_format");
			await refused(["zip"], "fast", id, "bad_format");
			await refused("zstd", "ultra", id, "bad_level");
			await refused("zstd", undefined, id, "bad_level");
			await refused("zstd", "fast", "rc_nothing_here", "not_found", 404);
			await refused("zstd", "fast", "../x", "bad_id");
			assert.ok(fs.existsSync(path.join(recFolder(), `${id}.zip`)), "nothing was changed");
		});
	});
});

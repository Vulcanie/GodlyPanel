import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The file manager's service. Every path a caller types is checked before it touches the disk, and each operation stays inside one
// server's folder. The temp folder stands in for an install folder. Each server record goes into the store, because the managed-file
// write only accepts folders the panel knows about, the same as the panel's own servers.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-fm-"));
process.env.GHP_DATA_DIR = path.join(root, "data");

const { ensureDataDirs, paths } = await import("../../src/server/paths.js");
ensureDataDirs();
const { initConfig } = await import("../../src/server/config/configStore.js");
const serverStore = await import("../../src/server/data/serverStore.js");
const fm = await import("../../src/server/services/fileManager.js");
const { FileError } = fm;

const DAY = 24 * 3600 * 1000;
let folders = 0;

/** A fresh server with its own folder outside the data folder, so each test starts empty. */
async function freshServer() {
	folders += 1;
	const folder = path.join(root, "games", `srv-${folders}`);
	fs.mkdirSync(folder, { recursive: true });
	const name = `FM ${folders}`;
	await serverStore.add({ name, type: "minecraft", installDir: folder, workingDir: folder });
	return { server: serverStore.get(name), folder };
}

/** The call rejects with a FileError carrying this code. */
async function refused(promise, code) {
	await assert.rejects(promise, (err) => err instanceof FileError && err.code === code);
}

const HOSTILE = [
	"..",
	"..\\x",
	"a/../../x",
	"/etc/x",
	"\\\\srv\\share\\x",
	"C:\\x",
	"x:stream",
	"a:b",
	"CON",
	"nul.txt",
	"com1",
	"a.",
	"a ",
	"a<b",
	"a//b",
	"a".repeat(300),
	"a/./b",
];

before(async () => {
	await initConfig();
	await serverStore.initServerStore();
});

after(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe("path rules", () => {
	it("refuses every hostile path and creates nothing", async () => {
		const { server, folder } = await freshServer();
		const listedBefore = fs.readdirSync(folder).sort();
		for (const p of HOSTILE) {
			await refused(fm.stat(server, p), "outside");
			await refused(fm.list(server, p), "outside");
			await refused(fm.readText(server, p), "outside");
			await refused(fm.writeText(server, p, "x"), "outside");
			await refused(fm.mkdir(server, p), "outside");
		}
		assert.deepEqual(fs.readdirSync(folder).sort(), listedBefore);
	});

	it("refuses a path that is not text, has a NUL, or is over 1024 characters as bad_path", async () => {
		const { server } = await freshServer();
		for (const p of [42, undefined, "a\0b", "a/".repeat(1000)]) {
			await refused(fm.stat(server, p), "bad_path");
		}
	});

	it("accepts a dot file, a nested name and a folder name with a space", async () => {
		const { server, folder } = await freshServer();
		await fm.mkdir(server, "a");
		await fm.writeText(server, "a/b.txt", "nested");
		await fm.writeText(server, ".hidden", "dot");
		await fm.mkdir(server, "sub dir");
		await fm.writeText(server, "sub dir/file.txt", "spaced");
		assert.equal(fs.readFileSync(path.join(folder, "a", "b.txt"), "utf8"), "nested");
		assert.equal(fs.readFileSync(path.join(folder, ".hidden"), "utf8"), "dot");
		assert.equal(fs.readFileSync(path.join(folder, "sub dir", "file.txt"), "utf8"), "spaced");
	});

	it("does not treat a sibling whose name starts the same as inside", () => {
		const a = fs.mkdtempSync(path.join(root, "pfx-"));
		const ab = `${a}b`;
		fs.mkdirSync(ab);
		assert.equal(fm.isWithinFolder(path.join(ab, "x"), a), false);
		assert.equal(fm.isWithinFolder(path.join(a, "x"), a), true);
		assert.equal(fm.isWithinFolder(a, a), true);
	});

	it("refuses a server folder that is the data folder, inside it, or holds it", async () => {
		const data = paths.dataDir;
		fs.mkdirSync(path.join(data, "servers"), { recursive: true });
		const cases = [data, path.join(data, "servers"), root];
		for (const [i, folder] of cases.entries()) {
			const name = `FM data ${i}`;
			await serverStore.add({ name, type: "minecraft", installDir: folder, workingDir: folder });
			const server = serverStore.get(name);
			assert.throws(() => fm.rootFor(server), (err) => err.code === "outside");
			await refused(fm.list(server, ""), "outside");
		}
	});

	it("refuses a server folder that is a junction into the data folder", async (t) => {
		const link = path.join(root, "games", "junction-to-data");
		try {
			fs.symlinkSync(paths.dataDir, link, "junction");
		} catch {
			t.skip("this account cannot create a junction");
			return;
		}
		const name = "FM junction data";
		await serverStore.add({ name, type: "minecraft", installDir: link, workingDir: link });
		await refused(fm.list(serverStore.get(name), ""), "outside");
	});

	it("reports a server with no folder, or one whose folder is missing", async () => {
		await serverStore.add({ name: "FM nofolder", type: "minecraft" });
		await refused(fm.list(serverStore.get("FM nofolder"), ""), "no_folder");
		await serverStore.add({ name: "FM missing", type: "minecraft", installDir: path.join(root, "games", "gone") });
		await refused(fm.list(serverStore.get("FM missing"), ""), "no_folder");
	});

	it("knows the protected names in any case, and nothing else", () => {
		assert.equal(fm.isProtected(".godlypanel-trash/1/data/x"), true);
		assert.equal(fm.isProtected("a/.GodlyPanel-Server.json"), true);
		assert.equal(fm.isProtected("a/Mod.BAK"), true);
		assert.equal(fm.isProtected("a/b.txt"), false);
	});
});

describe("junctions and links", () => {
	it("refuses a junction below the folder and writes nothing through it", async () => {
		const { server, folder } = await freshServer();
		const outside = fs.mkdtempSync(path.join(root, "outside-"));
		fs.writeFileSync(path.join(outside, "x.txt"), "keep");
		fs.symlinkSync(outside, path.join(folder, "link"), "junction");
		await refused(fm.list(server, "link"), "outside");
		await refused(fm.readText(server, "link/x.txt"), "outside");
		await refused(fm.writeText(server, "link/new.txt", "x"), "outside");
		assert.deepEqual(fs.readdirSync(outside).sort(), ["x.txt"]);
		assert.equal(fs.readFileSync(path.join(outside, "x.txt"), "utf8"), "keep");
	});

	it("lists a symlinked file as a link and refuses to read it", async (t) => {
		const { server, folder } = await freshServer();
		const target = path.join(root, "outside-file.txt");
		fs.writeFileSync(target, "keep");
		try {
			fs.symlinkSync(target, path.join(folder, "ln.txt"));
		} catch {
			return t.skip("this Windows account can't make symlinks");
		}
		const listing = await fm.list(server, "");
		assert.equal(listing.entries.find((e) => e.name === "ln.txt").type, "link");
		await refused(fm.readText(server, "ln.txt"), "outside");
	});
});

describe("list and stat", () => {
	it("lists folders first, then names case-insensitively, with protected flags", async () => {
		const { server, folder } = await freshServer();
		fs.mkdirSync(path.join(folder, "beta"));
		fs.mkdirSync(path.join(folder, "Alpha"));
		for (const f of ["b.txt", "A.txt", ".hidden", "mod.bak", ".godlypanel-server.json"]) {
			fs.writeFileSync(path.join(folder, f), "x");
		}
		const { entries, truncated } = await fm.list(server, "");
		assert.deepEqual(
			entries.map((e) => e.name),
			["Alpha", "beta", ".godlypanel-server.json", ".hidden", "A.txt", "b.txt", "mod.bak"],
		);
		assert.equal(truncated, false);
		const flag = Object.fromEntries(entries.map((e) => [e.name, e.protected]));
		assert.equal(flag["mod.bak"], true);
		assert.equal(flag[".godlypanel-server.json"], true);
		assert.equal(flag["A.txt"], false);
		assert.equal(entries.find((e) => e.name === "Alpha").type, "dir");
	});

	it("caps a listing at 5000 entries and says it was cut short", async () => {
		const { server, folder } = await freshServer();
		const many = path.join(folder, "many");
		fs.mkdirSync(many);
		for (let i = 0; i < 5001; i += 1) {
			fs.writeFileSync(path.join(many, `f${String(i).padStart(4, "0")}.txt`), "");
		}
		const listing = await fm.list(server, "many");
		assert.equal(listing.entries.length, 5000);
		assert.equal(listing.truncated, true);
	});

	it("lists only a folder, and reports a file as not a folder", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "f.txt"), "x");
		await refused(fm.list(server, "f.txt"), "not_a_dir");
		await refused(fm.list(server, "missing"), "not_found");
	});

	it("stats a file with its size and time", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "f.txt"), "hello");
		const entry = await fm.stat(server, "f.txt");
		assert.equal(entry.type, "file");
		assert.equal(entry.size, 5);
		assert.equal(entry.name, "f.txt");
		assert.ok(!Number.isNaN(Date.parse(entry.modifiedAt)));
	});
});

describe("reading", () => {
	it("reads a text file with its size and time", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "notes.txt"), "héllo");
		const got = await fm.readText(server, "notes.txt");
		assert.equal(got.content, "héllo");
		assert.equal(got.size, Buffer.byteLength("héllo"));
		assert.ok(!Number.isNaN(Date.parse(got.modifiedAt)));
	});

	it("refuses a file over the size limit and says the size in MB", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "big.txt"), Buffer.alloc(10 * 1024 * 1024, 0x61));
		await assert.rejects(fm.readText(server, "big.txt"), (err) => err.code === "too_big" && /MB/.test(err.message));
	});

	it("refuses a file with a NUL byte near the start as binary", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "tool.exe"), Buffer.from([0x4d, 0x5a, 0x00, 0x00, 0x41, 0x42]));
		await refused(fm.readText(server, "tool.exe"), "binary");
	});

	it("refuses a folder as not a file", async () => {
		const { server, folder } = await freshServer();
		fs.mkdirSync(path.join(folder, "dir"));
		await refused(fm.readText(server, "dir"), "not_a_file");
	});
});

describe("writing", () => {
	it("keeps the previous text as a .bak and records the change in the history", async () => {
		const { server, folder } = await freshServer();
		await fm.writeText(server, "settings.ini", "one");
		await fm.writeText(server, "settings.ini", "two");
		assert.equal(fs.readFileSync(path.join(folder, "settings.ini"), "utf8"), "two");
		assert.equal(fs.readFileSync(path.join(folder, "settings.ini.bak"), "utf8"), "one");
		const history = path.join(paths.dataDir, "state", "config-history");
		const indexes = fs
			.readdirSync(history)
			.map((d) => path.join(history, d, "index.json"))
			.filter((p) => fs.existsSync(p))
			.map((p) => JSON.parse(fs.readFileSync(p, "utf8")));
		const mine = indexes.find((i) => i.file === path.resolve(path.join(folder, "settings.ini")));
		assert.ok(mine, "the file has a history");
		assert.ok(mine.versions.some((v) => v.source === "file manager"));
	});

	it("saves a new file and returns its size", async () => {
		const { server, folder } = await freshServer();
		const got = await fm.writeText(server, "new.txt", "fresh");
		assert.equal(got.size, 5);
		assert.equal(fs.readFileSync(path.join(folder, "new.txt"), "utf8"), "fresh");
	});

	it("refuses to write over a binary file and leaves it as it was", async () => {
		const { server, folder } = await freshServer();
		const bytes = Buffer.from([0x00, 0x01, 0x02, 0x03]);
		fs.writeFileSync(path.join(folder, "data.bin"), bytes);
		await refused(fm.writeText(server, "data.bin", "text"), "binary");
		assert.deepEqual(fs.readFileSync(path.join(folder, "data.bin")), bytes);
	});

	it("refuses text over 2 MB as too big", async () => {
		const { server } = await freshServer();
		await refused(fm.writeText(server, "huge.txt", "x".repeat(2 * 1024 * 1024 + 1)), "too_big");
	});

	it("refuses a write into a folder that does not exist", async () => {
		const { server } = await freshServer();
		await refused(fm.writeText(server, "nope/x.txt", "x"), "parent_missing");
	});

	it("refuses to change the panel's own files and folders, but still reads them", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, ".godlypanel-server.json"), "{}");
		fs.writeFileSync(path.join(folder, "mod.bak"), "old");
		fs.mkdirSync(path.join(folder, ".godlypanel-trash"));
		for (const p of [".godlypanel-server.json", "MOD.BAK", ".godlypanel-trash/x.txt", ".godlypanel-trash"]) {
			await refused(fm.writeText(server, p, "x"), "protected");
			await refused(fm.mkdir(server, p), "protected");
		}
		await refused(fm.rename(server, ".godlypanel-server.json", "moved.json"), "protected");
		await refused(fm.moveToTrash(server, "mod.bak"), "protected");
		assert.equal((await fm.readText(server, ".godlypanel-server.json")).content, "{}");
	});
});

describe("folders and renames", () => {
	it("makes one folder at a time, refusing a missing parent or an existing name", async () => {
		const { server } = await freshServer();
		await refused(fm.mkdir(server, "p/q"), "parent_missing");
		await fm.mkdir(server, "p");
		await refused(fm.mkdir(server, "p"), "exists");
	});

	it("renames a file within the folder", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "a.txt"), "moved");
		await fm.rename(server, "a.txt", "b.txt");
		assert.equal(fs.existsSync(path.join(folder, "a.txt")), false);
		assert.equal(fs.readFileSync(path.join(folder, "b.txt"), "utf8"), "moved");
	});

	it("refuses to rename onto an existing file, and leaves both alone", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "a.txt"), "first");
		fs.writeFileSync(path.join(folder, "b.txt"), "second");
		await refused(fm.rename(server, "a.txt", "b.txt"), "exists");
		assert.equal(fs.readFileSync(path.join(folder, "a.txt"), "utf8"), "first");
		assert.equal(fs.readFileSync(path.join(folder, "b.txt"), "utf8"), "second");
	});

	it("refuses to move a folder into its own child", async () => {
		const { server, folder } = await freshServer();
		fs.mkdirSync(path.join(folder, "d"));
		await refused(fm.rename(server, "d", "d/sub"), "bad_path");
		assert.equal(fs.existsSync(path.join(folder, "d")), true);
	});

	it("reports a missing source, and a target whose folder is missing", async () => {
		const { server, folder } = await freshServer();
		await refused(fm.rename(server, "gone.txt", "x.txt"), "not_found");
		fs.writeFileSync(path.join(folder, "a.txt"), "x");
		await refused(fm.rename(server, "a.txt", "missing/a.txt"), "parent_missing");
	});

	it("refuses to rename or move the server's own folder", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "x.txt"), "x");
		await refused(fm.rename(server, "", "elsewhere"), "bad_path");
		await refused(fm.rename(server, "x.txt", ""), "bad_path");
		await refused(fm.moveToTrash(server, ""), "bad_path");
	});
});

describe("trash", () => {
	it("moves a file and a folder to the trash, and restores them byte for byte", async () => {
		const { server, folder } = await freshServer();
		const binary = crypto.randomBytes(5000);
		fs.writeFileSync(path.join(folder, "game.pak"), binary);
		fs.mkdirSync(path.join(folder, "saves", "deep"), { recursive: true });
		fs.writeFileSync(path.join(folder, "saves", "deep", "slot1.sav"), "slot one");

		const first = await fm.moveToTrash(server, "game.pak");
		const second = await fm.moveToTrash(server, "saves");
		assert.match(first.trashId, /^\d{13}-[0-9a-f]{6}$/);
		assert.equal(fs.existsSync(path.join(folder, "game.pak")), false);

		const items = await fm.listTrash(server);
		const byId = Object.fromEntries(items.map((i) => [i.id, i]));
		assert.equal(byId[first.trashId].originalPath, "game.pak");
		assert.equal(byId[first.trashId].type, "file");
		assert.equal(byId[second.trashId].type, "dir");

		await fm.restoreFromTrash(server, first.trashId);
		await fm.restoreFromTrash(server, second.trashId);
		assert.deepEqual(fs.readFileSync(path.join(folder, "game.pak")), binary);
		assert.equal(fs.readFileSync(path.join(folder, "saves", "deep", "slot1.sav"), "utf8"), "slot one");
		assert.deepEqual(await fm.listTrash(server), []);
	});

	it("restores a file whose folders are gone by now, and makes them again", async () => {
		const { server, folder } = await freshServer();
		fs.mkdirSync(path.join(folder, "a", "b"), { recursive: true });
		fs.writeFileSync(path.join(folder, "a", "b", "x.txt"), "deep");
		const { trashId } = await fm.moveToTrash(server, "a/b/x.txt");
		fs.rmSync(path.join(folder, "a"), { recursive: true, force: true });
		await fm.restoreFromTrash(server, trashId);
		assert.equal(fs.readFileSync(path.join(folder, "a", "b", "x.txt"), "utf8"), "deep");
	});

	it("refuses to restore onto an existing path, and keeps the trash copy", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "keep.txt"), "old");
		const { trashId } = await fm.moveToTrash(server, "keep.txt");
		fs.writeFileSync(path.join(folder, "keep.txt"), "new");
		await refused(fm.restoreFromTrash(server, trashId), "exists");
		assert.equal(fs.readFileSync(path.join(folder, "keep.txt"), "utf8"), "new");
		assert.equal(fs.existsSync(path.join(folder, ".godlypanel-trash", trashId, "data", "keep.txt")), true);
		assert.equal((await fm.listTrash(server)).length, 1);
	});

	it("refuses a restore whose recorded path leaves the folder, and moves nothing", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "evil.txt"), "data");
		const { trashId } = await fm.moveToTrash(server, "evil.txt");
		const trashDir = path.join(folder, ".godlypanel-trash", trashId);
		fs.writeFileSync(
			path.join(trashDir, "meta.json"),
			JSON.stringify({ originalPath: "../../x", deletedAt: new Date().toISOString(), type: "file" }),
		);
		await refused(fm.restoreFromTrash(server, trashId), "outside");
		assert.equal(fs.existsSync(path.join(trashDir, "data", "evil.txt")), true);
		assert.equal(fs.existsSync(path.join(root, "x")), false);
	});

	it("refuses a trash id that is not one of ours", async () => {
		const { server } = await freshServer();
		for (const id of ["../x", "", "a".repeat(300), "1700000000000-ABCDEF", "1700000000000-abcdef/.."]) {
			await refused(fm.restoreFromTrash(server, id), "bad_trash_id");
		}
	});

	it("skips a trash folder whose record is damaged, and never errors on it", async () => {
		const { server, folder } = await freshServer();
		const bad = path.join(folder, ".godlypanel-trash", "1700000000000-aaaaaa");
		fs.mkdirSync(bad, { recursive: true });
		fs.writeFileSync(path.join(bad, "meta.json"), "{not json");
		fs.mkdirSync(path.join(folder, ".godlypanel-trash", "notes"));
		assert.deepEqual(await fm.listTrash(server), []);
	});
});

describe("purgeTrash", () => {
	it("removes every trash item when the age limit is zero", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "one.txt"), "1");
		fs.writeFileSync(path.join(folder, "two.txt"), "2");
		await fm.moveToTrash(server, "one.txt");
		await fm.moveToTrash(server, "two.txt");
		assert.equal(await fm.purgeTrash(server, { olderThanMs: 0 }), 2);
		assert.deepEqual(await fm.listTrash(server), []);
	});

	it("keeps a recent item, and removes one older than the limit", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "recent.txt"), "r");
		await fm.moveToTrash(server, "recent.txt");
		const old = path.join(folder, ".godlypanel-trash", `${Date.now() - 8 * DAY}-aaaaaa`);
		fs.mkdirSync(path.join(old, "data"), { recursive: true });
		fs.writeFileSync(path.join(old, "meta.json"), JSON.stringify({ originalPath: "old.txt", deletedAt: new Date().toISOString(), type: "file" }));
		assert.equal(await fm.purgeTrash(server), 1);
		assert.equal((await fm.listTrash(server)).length, 1);
		assert.equal(fs.existsSync(old), false);
	});

	it("keeps a folder named like an id but stamped recently, and leaves stray folders alone", async () => {
		const { server, folder } = await freshServer();
		const trash = path.join(folder, ".godlypanel-trash");
		const recent = path.join(trash, `${Date.now()}-abcdef`);
		fs.mkdirSync(recent, { recursive: true });
		fs.mkdirSync(path.join(trash, "notes"), { recursive: true });
		assert.equal(await fm.purgeTrash(server), 0);
		assert.equal(fs.existsSync(recent), true);
		assert.equal(fs.existsSync(path.join(trash, "notes")), true);
	});
});

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import AdmZip from "adm-zip";
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

// The source file a route would have received, kept outside the server folder the way a real upload is.
function uploadSource(name, content) {
	const dir = path.join(root, "uploads");
	fs.mkdirSync(dir, { recursive: true });
	const file = path.join(dir, name);
	fs.writeFileSync(file, content);
	return file;
}

// Everything under a folder, as relative paths, so a test can see that nothing was added or removed.
const treeOf = (dir) => fs.readdirSync(dir, { recursive: true }).sort();

describe("saveUpload", () => {
	it("saves into the root and into a subfolder, with the same bytes", async () => {
		const { server, folder } = await freshServer();
		const bytes = crypto.randomBytes(3000);
		const src = uploadSource("in.bin", bytes);
		fs.mkdirSync(path.join(folder, "sub"));
		const top = await fm.saveUpload(server, "", "top.bin", src);
		const nested = await fm.saveUpload(server, "sub", "nested.bin", src);
		assert.deepEqual(top, { path: "top.bin", size: 3000 });
		assert.deepEqual(nested, { path: "sub/nested.bin", size: 3000 });
		assert.deepEqual(fs.readFileSync(path.join(folder, "top.bin")), bytes);
		assert.deepEqual(fs.readFileSync(path.join(folder, "sub", "nested.bin")), bytes);
	});

	it("never deletes the file it was given, on success or on refusal", async () => {
		const { server, folder } = await freshServer();
		const src = uploadSource("keep.txt", "source");
		await fm.saveUpload(server, "", "copy.txt", src);
		await refused(fm.saveUpload(server, "", "copy.txt", src), "exists");
		assert.equal(fs.readFileSync(src, "utf8"), "source");
		assert.equal(fs.readFileSync(path.join(folder, "copy.txt"), "utf8"), "source");
	});

	it("refuses an existing name and leaves it as it was", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "taken.txt"), "old");
		await refused(fm.saveUpload(server, "", "taken.txt", uploadSource("new.txt", "new")), "exists");
		assert.equal(fs.readFileSync(path.join(folder, "taken.txt"), "utf8"), "old");
		assert.deepEqual(treeOf(folder), ["taken.txt"]);
	});

	it("refuses hostile names and creates nothing", async () => {
		const { server, folder } = await freshServer();
		const src = uploadSource("hostile.txt", "x");
		const before = treeOf(folder);
		const cases = [
			["../x", "outside"],
			["a/b", "outside"],
			["a\\b", "outside"],
			["c:x", "outside"],
			["CON", "outside"],
			["x.", "outside"],
			[".", "outside"],
			["..", "outside"],
			["", "empty_name"],
		];
		for (const [name, code] of cases) {
			await refused(fm.saveUpload(server, "", name, src), code);
		}
		assert.deepEqual(treeOf(folder), before);
	});

	it("reports a missing folder, and a file given as the folder", async () => {
		const { server, folder } = await freshServer();
		const src = uploadSource("dir-case.txt", "x");
		fs.writeFileSync(path.join(folder, "plain.txt"), "p");
		await refused(fm.saveUpload(server, "nowhere", "a.txt", src), "not_found");
		await refused(fm.saveUpload(server, "plain.txt", "a.txt", src), "not_a_dir");
	});

	it("refuses a protected name, and leaves nothing behind", async () => {
		const { server, folder } = await freshServer();
		const src = uploadSource("bak-case.txt", "x");
		await refused(fm.saveUpload(server, "", "x.bak", src), "protected");
		await refused(fm.saveUpload(server, "", ".godlypanel-server.json", src), "protected");
		assert.deepEqual(treeOf(folder), []);
	});

	it("refuses a file over the size limit, with no target and no partial copy", async () => {
		const { server, folder } = await freshServer();
		const src = uploadSource("over.txt", "0123456789");
		await assert.rejects(
			fm.saveUpload(server, "", "over.txt", src, { maxBytes: 4 }),
			(err) => err.code === "too_big" && /MB/.test(err.message),
		);
		assert.deepEqual(treeOf(folder), []);
	});

	it("refuses a folder or a link given as the file to save", async (t) => {
		const { server, folder } = await freshServer();
		const dir = path.join(root, "uploads", "a-folder");
		fs.mkdirSync(dir, { recursive: true });
		await refused(fm.saveUpload(server, "", "f.txt", dir), "not_a_file");
		const target = uploadSource("link-target.txt", "x");
		try {
			fs.symlinkSync(target, path.join(root, "uploads", "link.txt"));
		} catch {
			return t.skip("this Windows account can't make symlinks");
		}
		await refused(fm.saveUpload(server, "", "f.txt", path.join(root, "uploads", "link.txt")), "not_a_file");
		assert.deepEqual(treeOf(folder), []);
	});

	it("refuses to save into a folder reached through a junction", async (t) => {
		const { server, folder } = await freshServer();
		const outside = fs.mkdtempSync(path.join(root, "upload-outside-"));
		try {
			fs.symlinkSync(outside, path.join(folder, "jn"), "junction");
		} catch {
			return t.skip("this account cannot create a junction");
		}
		await refused(fm.saveUpload(server, "jn", "x.txt", uploadSource("j.txt", "x")), "outside");
		assert.deepEqual(fs.readdirSync(outside), []);
	});
});

// A zip built with adm-zip. Each entry is [name, text]; a name ending in "/" is a folder.
function buildZip(file, list) {
	const zip = new AdmZip();
	for (const [name, text] of list) {
		zip.addFile(name, name.endsWith("/") ? Buffer.alloc(0) : Buffer.from(text, "utf8"));
	}
	zip.writeZip(file);
	return file;
}

// adm-zip tidies a name when it writes it ("../x" comes out as "x"), so a hostile name cannot be added directly. Instead a
// placeholder of the same length is written, and its bytes are swapped for the raw name. The lengths match, so no offset moves.
function zipWithRawName(file, rawName) {
	const zip = new AdmZip();
	zip.addFile("ok/first.txt", Buffer.from("1"));
	zip.addFile("second.txt", Buffer.from("2"));
	zip.addFile("Q".repeat(rawName.length), Buffer.from("bad"));
	const bytes = zip.toBuffer().toString("latin1").split("Q".repeat(rawName.length)).join(rawName);
	fs.writeFileSync(file, Buffer.from(bytes, "latin1"));
	return file;
}

describe("extractZipHere", () => {
	it("extracts a normal zip with its folders, byte for byte, and leaves the zip in place", async () => {
		const { server, folder } = await freshServer();
		const big = crypto.randomBytes(4000);
		const zipFile = path.join(folder, "pack.zip");
		const zip = new AdmZip();
		zip.addFile("readme.txt", Buffer.from("hello"));
		zip.addFile("mods/", Buffer.alloc(0));
		zip.addFile("mods/a.bin", big);
		zip.addFile("mods/deep/b.txt", Buffer.from("deep"));
		zip.writeZip(zipFile);
		const got = await fm.extractZipHere(server, "pack.zip");
		assert.deepEqual(got, { files: 3, folders: 2 });
		assert.equal(fs.readFileSync(path.join(folder, "readme.txt"), "utf8"), "hello");
		assert.deepEqual(fs.readFileSync(path.join(folder, "mods", "a.bin")), big);
		assert.equal(fs.readFileSync(path.join(folder, "mods", "deep", "b.txt"), "utf8"), "deep");
		assert.equal(fs.existsSync(zipFile), true);
	});

	it("extracts into the folder the zip sits in, not the root", async () => {
		const { server, folder } = await freshServer();
		fs.mkdirSync(path.join(folder, "sub"));
		buildZip(path.join(folder, "sub", "p.zip"), [["inner.txt", "in"]]);
		await fm.extractZipHere(server, "sub/p.zip");
		assert.equal(fs.readFileSync(path.join(folder, "sub", "inner.txt"), "utf8"), "in");
		assert.equal(fs.existsSync(path.join(folder, "inner.txt")), false);
	});

	it("refuses a hostile entry name, and writes nothing, not even the entries before it", async () => {
		const names = [
			"../evil.txt",
			"a/../../evil.txt",
			"/abs.txt",
			"C:\\x.txt",
			"con.txt",
			"x:y",
			"trailing.",
			"a//b.txt",
			"./dot.txt",
		];
		for (const [i, name] of names.entries()) {
			const { server, folder } = await freshServer();
			const zipFile = zipWithRawName(path.join(folder, `bad-${i}.zip`), name);
			const before = treeOf(folder);
			await refused(fm.extractZipHere(server, `bad-${i}.zip`), "unsafe_archive");
			assert.deepEqual(treeOf(folder), before, `nothing written for ${name}`);
			assert.equal(fs.existsSync(zipFile), true);
			assert.equal(fs.existsSync(path.join(folder, "..", "evil.txt")), false);
		}
	});

	it("refuses a zip entry that is a symlink, and writes nothing", async () => {
		const { server, folder } = await freshServer();
		const zipFile = path.join(folder, "links.zip");
		const zip = new AdmZip();
		zip.addFile("ok.txt", Buffer.from("1"));
		zip.addFile("link.txt", Buffer.from("target"));
		zip.getEntries().find((e) => e.entryName === "link.txt").attr = (0o120777 << 16) >>> 0;
		zip.writeZip(zipFile);
		const before = treeOf(folder);
		await refused(fm.extractZipHere(server, "links.zip"), "unsafe_archive");
		assert.deepEqual(treeOf(folder), before);
	});

	it("refuses an existing file in the way, and writes nothing", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "dup.txt"), "keep");
		buildZip(path.join(folder, "p.zip"), [
			["new.txt", "n"],
			["dup.txt", "y"],
		]);
		await refused(fm.extractZipHere(server, "p.zip"), "exists");
		assert.equal(fs.readFileSync(path.join(folder, "dup.txt"), "utf8"), "keep");
		assert.equal(fs.existsSync(path.join(folder, "new.txt")), false);
	});

	it("refuses an entry that lands on a protected name, and writes nothing", async () => {
		const { server, folder } = await freshServer();
		for (const [i, name] of ["world.bak", ".godlypanel-server.json", ".godlypanel-trash/x.txt"].entries()) {
			buildZip(path.join(folder, `prot-${i}.zip`), [
				["fine.txt", "1"],
				[name, "2"],
			]);
			const before = treeOf(folder);
			await refused(fm.extractZipHere(server, `prot-${i}.zip`), "unsafe_archive");
			assert.deepEqual(treeOf(folder), before);
		}
	});

	it("refuses a zip with more entries than allowed", async () => {
		const { server, folder } = await freshServer();
		buildZip(path.join(folder, "many.zip"), [
			["1.txt", "1"],
			["2.txt", "2"],
			["3.txt", "3"],
		]);
		await refused(fm.extractZipHere(server, "many.zip", { maxEntries: 2 }), "too_many");
		assert.deepEqual(treeOf(folder), ["many.zip"]);
	});

	it("refuses a zip whose declared total is over the limit, and writes nothing", async () => {
		const { server, folder } = await freshServer();
		buildZip(path.join(folder, "big.zip"), [["one.txt", "x".repeat(100)]]);
		await refused(fm.extractZipHere(server, "big.zip", { maxTotalBytes: 10 }), "too_big");
		assert.deepEqual(treeOf(folder), ["big.zip"]);
	});

	it("rolls back what it made when a later entry fails", async () => {
		const { server, folder } = await freshServer();
		// "a" is a file, then "a/b.txt" needs "a" as a folder. The second write fails after the first has landed.
		buildZip(path.join(folder, "half.zip"), [
			["new/", ""],
			["new/x.txt", "1"],
			["a", "file"],
			["a/b.txt", "2"],
		]);
		await refused(fm.extractZipHere(server, "half.zip"), "exists");
		assert.deepEqual(treeOf(folder), ["half.zip"]);
	});

	it("refuses a file that is not a zip, whatever its name", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "x.zip"), "this is plain text, not a zip");
		const real = buildZip(path.join(root, "uploads", "real.zip"), [["a.txt", "a"]]);
		fs.copyFileSync(real, path.join(folder, "y.txt"));
		await refused(fm.extractZipHere(server, "x.zip"), "not_a_zip");
		await refused(fm.extractZipHere(server, "y.txt"), "not_a_zip");
		assert.equal(fs.existsSync(path.join(folder, "a.txt")), false);
	});

	it("reports a folder or a missing file as not a file, or not found", async () => {
		const { server, folder } = await freshServer();
		fs.mkdirSync(path.join(folder, "dir.zip"));
		await refused(fm.extractZipHere(server, "dir.zip"), "not_a_file");
		await refused(fm.extractZipHere(server, "gone.zip"), "not_found");
	});

	it("refuses to extract through a junction", async (t) => {
		const { server, folder } = await freshServer();
		const outside = fs.mkdtempSync(path.join(root, "zip-outside-"));
		try {
			fs.symlinkSync(outside, path.join(folder, "jz"), "junction");
		} catch {
			return t.skip("this account cannot create a junction");
		}
		buildZip(path.join(outside, "p.zip"), [["x.txt", "x"]]);
		await refused(fm.extractZipHere(server, "jz/p.zip"), "outside");
		assert.deepEqual(fs.readdirSync(outside), ["p.zip"]);
	});
});

const downloadDirs = () => fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith("ghp-dl-")).length;

describe("prepareDownload", () => {
	it("returns a file's own path and a cleanup that does nothing", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "f.txt"), "hello");
		const got = await fm.prepareDownload(server, "f.txt");
		assert.equal(got.file, path.join(folder, "f.txt"));
		assert.equal(got.name, "f.txt");
		assert.equal(got.size, 5);
		await got.cleanup();
		assert.equal(fs.readFileSync(path.join(folder, "f.txt"), "utf8"), "hello");
	});

	it("zips a folder with relative names, and leaves out trash and anything a link points to", async (t) => {
		const { server, folder } = await freshServer();
		const pack = path.join(folder, "pack");
		fs.mkdirSync(path.join(pack, "sub", "deep"), { recursive: true });
		fs.writeFileSync(path.join(pack, "a.txt"), "A");
		fs.writeFileSync(path.join(pack, "sub", "b.txt"), "B");
		fs.writeFileSync(path.join(pack, "sub", "deep", "c.txt"), "C");
		fs.mkdirSync(path.join(pack, ".godlypanel-trash"));
		fs.writeFileSync(path.join(pack, ".godlypanel-trash", "t.txt"), "trashed");
		const outside = fs.mkdtempSync(path.join(root, "dl-secret-"));
		fs.writeFileSync(path.join(outside, "secret.txt"), "SECRET-CONTENT");
		try {
			fs.symlinkSync(outside, path.join(pack, "link"), "junction");
		} catch {
			return t.skip("this account cannot create a junction");
		}

		const got = await fm.prepareDownload(server, "pack");
		assert.equal(got.name, "pack.zip");
		const zip = new AdmZip(got.file);
		const names = zip.getEntries().map((e) => e.entryName).sort();
		assert.deepEqual(names, ["a.txt", "sub/", "sub/b.txt", "sub/deep/", "sub/deep/c.txt"]);
		for (const name of names) {
			assert.equal(path.isAbsolute(name), false);
			assert.equal(name.includes(folder), false);
		}
		const everything = zip.getEntries().map((e) => e.getData().toString("utf8")).join("|");
		assert.equal(everything.includes("SECRET-CONTENT"), false);
		assert.equal(everything.includes("trashed"), false);
		assert.equal(zip.getEntry("a.txt").getData().toString("utf8"), "A");
		assert.equal(zip.getEntry("sub/deep/c.txt").getData().toString("utf8"), "C");
		await got.cleanup();
	});

	it("removes its temp folder on cleanup, and a second cleanup does not throw", async () => {
		const { server, folder } = await freshServer();
		fs.mkdirSync(path.join(folder, "d"));
		fs.writeFileSync(path.join(folder, "d", "x.txt"), "x");
		const got = await fm.prepareDownload(server, "d");
		const dir = path.dirname(got.file);
		assert.equal(fs.existsSync(dir), true);
		await got.cleanup();
		assert.equal(fs.existsSync(dir), false);
		await got.cleanup();
	});

	it("refuses a folder over the size limit before making anything", async () => {
		const { server, folder } = await freshServer();
		fs.mkdirSync(path.join(folder, "heavy"));
		fs.writeFileSync(path.join(folder, "heavy", "x.bin"), Buffer.alloc(2000, 1));
		const before = downloadDirs();
		await refused(fm.prepareDownload(server, "heavy", { maxZipBytes: 100 }), "too_big");
		assert.equal(downloadDirs(), before);
	});

	it("reports a missing path as not found", async () => {
		const { server } = await freshServer();
		await refused(fm.prepareDownload(server, "nothing-here"), "not_found");
	});

	it("zips the whole server folder when the path is the root", async () => {
		const { server, folder } = await freshServer();
		fs.writeFileSync(path.join(folder, "top.txt"), "t");
		const got = await fm.prepareDownload(server, "");
		assert.equal(got.name, `${path.basename(folder)}.zip`);
		assert.deepEqual(
			new AdmZip(got.file).getEntries().map((e) => e.entryName),
			["top.txt"],
		);
		await got.cleanup();
	});
});

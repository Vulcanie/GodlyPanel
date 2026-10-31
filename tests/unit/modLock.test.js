import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The mod lock: a record, kept by the panel and not in the game's own folders, of which files each installed mod put in the mods
// folder and what they hashed to. These tests check the record round trips, that a damaged or hostile server name can't reach outside
// its own folder, and that the folder can be compared against the record.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-lock-"));
process.env.GHP_DATA_DIR = path.join(root, "data");

const { ensureDataDirs, paths } = await import("../../src/server/paths.js");
ensureDataDirs();
const lock = await import("../../src/server/services/modLock.js");

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const ZEROS = "0".repeat(64);
const modlocksDir = path.join(paths.dataDir, "modlocks");

let folders = 0;
/** A fresh mods folder, so each test starts with nothing in it. */
function freshMods() {
	folders += 1;
	const dir = path.join(root, "mods", `m-${folders}`);
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}

function entry(overrides = {}) {
	return {
		id: "github:acme/one",
		source: "github",
		ref: "acme/one",
		version: "1.0.0",
		side: "both",
		names: ["One.jar"],
		files: [{ path: "One.jar", sha256: ZEROS }],
		dependencyOf: [],
		installedAt: "2026-10-30T00:00:00.000Z",
		...overrides,
	};
}

before(() => {
	fs.mkdirSync(root, { recursive: true });
});

after(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe("the lock file", () => {
	it("keeps what was added and reads it back", async () => {
		const name = "Round Trip";
		const one = entry();
		await lock.add(name, one);
		assert.deepEqual((await lock.read(name)).mods, [one]);
	});

	it("reads a damaged file as empty, and never throws", async () => {
		const name = "Damaged";
		fs.mkdirSync(modlocksDir, { recursive: true });
		fs.writeFileSync(lock.lockFileOf(name), "{ not json");
		assert.deepEqual(await lock.read(name), { mods: [] });
	});

	it("reads a file that is missing as empty", async () => {
		assert.deepEqual(await lock.read("Never Installed"), { mods: [] });
	});

	it("replaces an entry with the same id rather than adding a second", async () => {
		const name = "Replace";
		await lock.add(name, entry());
		await lock.add(name, entry({ version: "2.0.0" }));
		const { mods } = await lock.read(name);
		assert.equal(mods.length, 1);
		assert.equal(mods[0].version, "2.0.0");
	});

	it("refuses an entry that names more than 50 things in the mods folder", async () => {
		const names = Array.from({ length: 51 }, (_, i) => `N${i}.jar`);
		await assert.rejects(() => lock.add("Too Many Names", entry({ names, files: [] })));
		assert.deepEqual((await lock.read("Too Many Names")).mods, []);
	});

	it("drops an entry once every name in it has been forgotten", async () => {
		const name = "Forget";
		await lock.add(name, entry());
		await lock.forgetName(name, "One.jar");
		assert.deepEqual((await lock.read(name)).mods, []);
	});

	it("forgets a name whether it is on or off (.disabled)", async () => {
		const name = "Forget Off";
		await lock.add(name, entry());
		await lock.forgetName(name, "One.jar.disabled");
		assert.deepEqual((await lock.read(name)).mods, []);
	});

	it("keeps the other names of an entry when only one is forgotten", async () => {
		const name = "Partial";
		await lock.add(name, entry({ names: ["A", "B"], files: [{ path: "A/x.txt", sha256: ZEROS }, { path: "B/y.txt", sha256: ZEROS }] }));
		await lock.forgetName(name, "A");
		const { mods } = await lock.read(name);
		assert.equal(mods.length, 1);
		assert.deepEqual(mods[0].names, ["B"]);
		assert.deepEqual(mods[0].files, [{ path: "B/y.txt", sha256: ZEROS }]);
	});

	it("removes an entry by id", async () => {
		const name = "Remove By Id";
		await lock.add(name, entry());
		await lock.add(name, entry({ id: "url:https://example.test/two.jar", source: "url", ref: "https://example.test/two.jar", names: ["Two.jar"], files: [] }));
		await lock.remove(name, "github:acme/one");
		assert.deepEqual((await lock.read(name)).mods.map((m) => m.id), ["url:https://example.test/two.jar"]);
	});
});

describe("hashing an entry's files", () => {
	it("hashes every file under a folder mod, and a single-file mod", async () => {
		const mods = freshMods();
		fs.mkdirSync(path.join(mods, "Folder", "sub"), { recursive: true });
		fs.writeFileSync(path.join(mods, "Folder", "a.txt"), "alpha");
		fs.writeFileSync(path.join(mods, "Folder", "sub", "b.txt"), "beta");
		fs.writeFileSync(path.join(mods, "Single.jar"), "gamma");

		const files = await lock.hashEntry(mods, ["Folder", "Single.jar"]);
		assert.deepEqual(files, [
			{ path: "Folder/a.txt", sha256: sha256("alpha") },
			{ path: "Folder/sub/b.txt", sha256: sha256("beta") },
			{ path: "Single.jar", sha256: sha256("gamma") },
		]);
	});

	it("skips a symlink rather than hashing what it points at", async (t) => {
		const mods = freshMods();
		const outside = path.join(root, "outside.txt");
		fs.writeFileSync(outside, "not a mod");
		try {
			fs.symlinkSync(outside, path.join(mods, "Link.jar"));
		} catch {
			return t.skip("this Windows account can't make symlinks");
		}
		fs.writeFileSync(path.join(mods, "Real.jar"), "real");
		const files = await lock.hashEntry(mods, ["Link.jar", "Real.jar"]);
		assert.deepEqual(files, [{ path: "Real.jar", sha256: sha256("real") }]);
	});
});

describe("comparing the lock with the mods folder", () => {
	it("reports a changed file, a missing one, and an untracked one, and ignores .disabled and dot files", async () => {
		const name = "Compare";
		const mods = freshMods();
		fs.mkdirSync(path.join(mods, "Folder"), { recursive: true });
		fs.writeFileSync(path.join(mods, "Folder", "a.txt"), "alpha");
		fs.writeFileSync(path.join(mods, "Single.jar"), "gamma");
		fs.writeFileSync(path.join(mods, "Gone.jar"), "soon gone");
		fs.writeFileSync(path.join(mods, "Off.jar"), "switched off");
		await lock.add(name, entry({
			id: "github:acme/compare",
			names: ["Folder", "Single.jar", "Gone.jar", "Off.jar"],
			files: [
				{ path: "Folder/a.txt", sha256: sha256("alpha") },
				{ path: "Single.jar", sha256: sha256("gamma") },
				{ path: "Gone.jar", sha256: sha256("soon gone") },
				{ path: "Off.jar", sha256: sha256("switched off") },
			],
		}));

		// Changed: the bytes differ from what was recorded. Gone: deleted. Off: turned off, which is not a change to the file.
		fs.writeFileSync(path.join(mods, "Single.jar"), "edited by hand");
		fs.rmSync(path.join(mods, "Gone.jar"));
		fs.renameSync(path.join(mods, "Off.jar"), path.join(mods, "Off.jar.disabled"));
		fs.writeFileSync(path.join(mods, "Stray.zip"), "not from the panel");
		fs.writeFileSync(path.join(mods, "Extra.jar.disabled"), "turned off, not from the panel");
		fs.writeFileSync(path.join(mods, ".hidden"), "ignored");

		const drift = await lock.diffAgainstDisk(name, mods);
		assert.deepEqual(drift.changed, [{ id: "github:acme/compare", path: "Single.jar" }]);
		assert.deepEqual(drift.missing, [{ id: "github:acme/compare", path: "Gone.jar" }]);
		assert.deepEqual(drift.untracked.sort(), ["Extra.jar.disabled", "Stray.zip"]);
	});

	it("reports nothing when the folder matches the record", async () => {
		const name = "Clean";
		const mods = freshMods();
		fs.writeFileSync(path.join(mods, "Clean.jar"), "fine");
		await lock.add(name, entry({ names: ["Clean.jar"], files: [{ path: "Clean.jar", sha256: sha256("fine") }] }));
		assert.deepEqual(await lock.diffAgainstDisk(name, mods), { changed: [], missing: [], untracked: [] });
	});

	it("lists entries that were installed as dependencies of mods that are no longer there", async () => {
		const name = "Orphans";
		await lock.add(name, entry({ id: "github:acme/parent", names: ["Parent.jar"], files: [] }));
		await lock.add(name, entry({ id: "github:acme/dep", ref: "acme/dep", names: ["Dep.jar"], files: [], dependencyOf: ["github:acme/parent"] }));
		assert.deepEqual(await lock.orphans(name), []);
		await lock.remove(name, "github:acme/parent");
		assert.deepEqual(await lock.orphans(name), ["github:acme/dep"]);
	});

	it("keeps a dependency that still has one parent installed", async () => {
		const name = "Two Parents";
		await lock.add(name, entry({ id: "github:acme/p1", names: ["P1.jar"], files: [] }));
		await lock.add(name, entry({ id: "github:acme/p2", names: ["P2.jar"], files: [] }));
		await lock.add(name, entry({ id: "github:acme/shared", names: ["Shared.jar"], files: [], dependencyOf: ["github:acme/p1", "github:acme/p2"] }));
		await lock.remove(name, "github:acme/p1");
		assert.deepEqual(await lock.orphans(name), []);
	});
});

describe("server names are data", () => {
	it("keeps every server's record in the modlocks folder, whatever its name", () => {
		for (const name of ["../x", "..\\..\\x", "__proto__", "constructor", "C:\\Windows", "a/b", ""]) {
			assert.equal(path.dirname(lock.lockFileOf(name)), modlocksDir, JSON.stringify(name));
		}
	});

	it("takes names like ../x and __proto__ without breaking, and keeps each apart", async () => {
		await lock.add("../x", entry({ id: "github:acme/escape" }));
		await lock.add("__proto__", entry({ id: "github:acme/proto" }));
		assert.deepEqual((await lock.read("../x")).mods.map((m) => m.id), ["github:acme/escape"]);
		assert.deepEqual((await lock.read("__proto__")).mods.map((m) => m.id), ["github:acme/proto"]);
		assert.deepEqual((await lock.read("constructor")).mods, []);
		assert.equal(fs.existsSync(path.join(root, "x.json")), false, "nothing was written outside the modlocks folder");
	});

	it("never throws on a name that isn't a string", async () => {
		assert.deepEqual(await lock.read(undefined), { mods: [] });
		assert.deepEqual(await lock.orphans(null), []);
	});
});

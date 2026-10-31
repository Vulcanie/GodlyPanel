import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";

// The client manifest and the pack a player takes: only the mods the panel recorded in the lock, never anything else in the mods
// folder, and never a server-only mod. A file that changed, went missing or was turned off is left out and named, not shipped.

const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-pack-"));
const tmp = path.join(root, "tmp");
fs.mkdirSync(tmp, { recursive: true });
// The pack is built in the temp folder: keep this file's own, so it can check nothing is left behind.
process.env.TMPDIR = tmp;
process.env.TMP = tmp;
process.env.TEMP = tmp;
process.env.GHP_DATA_DIR = path.join(root, "data");

const { ensureDataDirs } = await import("../../src/server/paths.js");
ensureDataDirs();
const { initConfig } = await import("../../src/server/config/configStore.js");
const { initSecrets } = await import("../../src/server/config/secretsStore.js");
const { ModError } = await import("../../src/server/services/modService.js");
const clientPack = await import("../../src/server/services/clientPack.js");
const lock = await import("../../src/server/services/modLock.js");

const { buildManifest, buildClientPack, defaultFormat } = clientPack;
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const packLeftovers = () => fs.readdirSync(tmp).filter((n) => n.startsWith("ghp-pack-"));

let folders = 0;
/** A fresh Minecraft server with an empty mods folder, so each test starts clean. */
function freshServer(extra = {}) {
	folders += 1;
	const folder = path.join(root, "data", "servers", `mc-${folders}`);
	fs.mkdirSync(path.join(folder, "mods"), { recursive: true });
	const server = { name: `Pack ${folders}`, type: "minecraft", installDir: folder, workingDir: folder, ...extra };
	return { server, folder, mods: path.join(folder, "mods") };
}

/** A lock entry with the files it holds, the way the install writes it. `bytes` is what each file's hash is taken from. */
function entryOf(mods, { id, source = "github", ref, side = "both", names, files, version = "v1.0.0" }) {
	const list = names ?? files.map((f) => f.path);
	return {
		id,
		source,
		ref,
		version,
		side,
		names: list,
		files: files.map((f) => ({ path: f.path, sha256: f.sha256 })),
		dependencyOf: [],
		installedAt: "2026-10-30T00:00:00.000Z",
	};
}

/** Writes a file into the mods folder and returns the lock's record of it. */
function putMod(mods, rel, text) {
	const full = path.join(mods, rel);
	fs.mkdirSync(path.dirname(full), { recursive: true });
	fs.writeFileSync(full, text);
	return { path: rel, sha256: sha256(Buffer.from(text)) };
}

/** Writes the lock file directly, for records that add() would refuse (a path that leaves the folder). */
function writeLockRaw(server, mods) {
	fs.mkdirSync(path.dirname(lock.lockFileOf(server.name)), { recursive: true });
	fs.writeFileSync(lock.lockFileOf(server.name), JSON.stringify({ schema: 1, mods }));
}

const zipNames = (file) => new AdmZip(file).getEntries().map((e) => e.entryName).sort();
const zipText = (file, name) => new AdmZip(file).getEntry(name).getData().toString("utf8");

before(async () => {
	await initConfig();
	await initSecrets();
});

after(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

describe("the manifest", () => {
	it("leaves out server-only mods, and lists client and both mods with their files and hashes", async () => {
		const { server, mods } = freshServer();
		const client = putMod(mods, "Client.jar", "client bytes");
		const both = putMod(mods, "Both.jar", "both bytes");
		const srv = putMod(mods, "Srv.jar", "server only");
		await lock.add(server.name, entryOf(mods, { id: "github:a/client", ref: "a/client", names: ["Client.jar"], files: [client], side: "client" }));
		await lock.add(server.name, entryOf(mods, { id: "github:a/both", ref: "a/both", names: ["Both.jar"], files: [both], side: "both" }));
		await lock.add(server.name, entryOf(mods, { id: "github:a/srv", ref: "a/srv", names: ["Srv.jar"], files: [srv], side: "server" }));

		const manifest = await buildManifest(server);
		const byName = Object.fromEntries(manifest.mods.map((m) => [m.name, m]));
		assert.deepEqual(Object.keys(byName).sort(), ["Both.jar", "Client.jar"]);
		assert.deepEqual(byName["Client.jar"], { name: "Client.jar", source: "github", ref: "a/client", version: "v1.0.0", side: "client", files: [client], reference: false });
		assert.deepEqual(byName["Both.jar"].files, [both]);
		assert.deepEqual(manifest.omitted, []);
		assert.equal(typeof manifest.game, "string");
		assert.equal(typeof manifest.generatedAt, "string");
		assert.ok("loader" in manifest && "gameVersion" in manifest);
	});

	it("refuses a game with no mods folder as unsupported", async () => {
		const { server } = freshServer({ type: "ark", updateAppId: "376030" });
		await assert.rejects(() => buildManifest(server), { code: "unsupported", status: 400 });
	});
});

describe("the zip pack", () => {
	it("holds exactly the manifest, the README and the mods' files, and each file matches its hash", async () => {
		const { server, mods } = freshServer();
		const one = putMod(mods, "One.jar", "one");
		const two = putMod(mods, "Nested/Two.jar", "two");
		await lock.add(server.name, entryOf(mods, { id: "github:a/one", ref: "a/one", names: ["One.jar"], files: [one] }));
		await lock.add(server.name, entryOf(mods, { id: "github:a/two", ref: "a/two", names: ["Nested"], files: [two] }));
		// A file the panel never recorded is not part of the pack.
		putMod(mods, "Stray.jar", "not ours");

		const pack = await buildClientPack(server, { format: "zip" });
		try {
			assert.equal(pack.name, "mod-pack.zip");
			assert.deepEqual(zipNames(pack.file), ["README.txt", "manifest.json", "mods/Nested/Two.jar", "mods/One.jar"]);
			const manifest = JSON.parse(zipText(pack.file, "manifest.json"));
			assert.deepEqual(manifest.mods.map((m) => m.name).sort(), ["Nested", "One.jar"]);
			assert.deepEqual(manifest.mods.find((m) => m.name === "Nested").files, [two]);
			assert.equal(sha256(new AdmZip(pack.file).getEntry("mods/One.jar").getData()), one.sha256);
			assert.equal(sha256(new AdmZip(pack.file).getEntry("mods/Nested/Two.jar").getData()), two.sha256);
		} finally {
			await pack.cleanup();
		}
	});

	it("lists a CurseForge mod by reference only, and the README says to add it by hand", async () => {
		const { server, mods } = freshServer();
		const cf = putMod(mods, "CF.jar", "from curseforge");
		await lock.add(server.name, entryOf(mods, { id: "curseforge:123", source: "curseforge", ref: "123", names: ["CF.jar"], files: [cf] }));

		const manifest = await buildManifest(server);
		assert.deepEqual(manifest.mods, [{ name: "CF.jar", source: "curseforge", ref: "123", version: "v1.0.0", side: "both", files: [], reference: true }]);

		const pack = await buildClientPack(server, { format: "zip" });
		try {
			assert.deepEqual(zipNames(pack.file), ["README.txt", "manifest.json"]);
			const readme = zipText(pack.file, "README.txt");
			assert.match(readme, /These must be added by hand from their own site:/);
			assert.match(readme, /CF\.jar \(curseforge:123\)/);
		} finally {
			await pack.cleanup();
		}
	});

	it("leaves out a changed, deleted or turned-off mod, and names it as omitted", async () => {
		const { server, mods } = freshServer();
		const changed = putMod(mods, "Changed.jar", "as recorded");
		const gone = putMod(mods, "Gone.jar", "will be deleted");
		const off = putMod(mods, "Off.jar", "will be turned off");
		const ok = putMod(mods, "Ok.jar", "fine");
		await lock.add(server.name, entryOf(mods, { id: "github:a/changed", ref: "a/changed", names: ["Changed.jar"], files: [changed] }));
		await lock.add(server.name, entryOf(mods, { id: "github:a/gone", ref: "a/gone", names: ["Gone.jar"], files: [gone] }));
		await lock.add(server.name, entryOf(mods, { id: "github:a/off", ref: "a/off", names: ["Off.jar"], files: [off] }));
		await lock.add(server.name, entryOf(mods, { id: "github:a/ok", ref: "a/ok", names: ["Ok.jar"], files: [ok] }));
		fs.writeFileSync(path.join(mods, "Changed.jar"), "edited by hand");
		fs.rmSync(path.join(mods, "Gone.jar"));
		fs.renameSync(path.join(mods, "Off.jar"), path.join(mods, "Off.jar.disabled"));

		const manifest = await buildManifest(server);
		assert.deepEqual(manifest.omitted.sort((a, b) => a.name.localeCompare(b.name)), [
			{ name: "Changed.jar", reason: "changed" },
			{ name: "Gone.jar", reason: "missing" },
			{ name: "Off.jar", reason: "missing" },
		]);
		assert.deepEqual(manifest.mods.map((m) => m.name), ["Ok.jar"]);

		const pack = await buildClientPack(server, { format: "zip" });
		try {
			assert.deepEqual(zipNames(pack.file), ["README.txt", "manifest.json", "mods/Ok.jar"]);
		} finally {
			await pack.cleanup();
		}
	});

	it("omits a lock path that leaves the mods folder, and never reads what is outside it", async () => {
		const { server, mods, folder } = freshServer();
		const outside = path.join(folder, "outside");
		fs.mkdirSync(outside, { recursive: true });
		fs.writeFileSync(path.join(outside, "x.jar"), "outside the mods folder");
		const hash = sha256(Buffer.from("outside the mods folder"));
		writeLockRaw(server, [
			{ id: "github:a/up", source: "github", ref: "a/up", version: "v1", side: "both", names: ["x.jar"], files: [{ path: "../outside/x.jar", sha256: hash }], dependencyOf: [], installedAt: "" },
			{ id: "github:a/abs", source: "github", ref: "a/abs", version: "v1", side: "both", names: ["x.jar"], files: [{ path: path.join(outside, "x.jar"), sha256: hash }], dependencyOf: [], installedAt: "" },
		]);

		const manifest = await buildManifest(server);
		assert.deepEqual(manifest.mods, []);
		assert.deepEqual(manifest.omitted.map((o) => o.reason), ["missing", "missing"]);
		const pack = await buildClientPack(server, { format: "zip" });
		try {
			assert.deepEqual(zipNames(pack.file), ["README.txt", "manifest.json"]);
		} finally {
			await pack.cleanup();
		}
	});

	it("omits a file reached through a symlinked folder", async (t) => {
		const { server, mods, folder } = freshServer();
		const outside = path.join(folder, "outside");
		fs.mkdirSync(outside, { recursive: true });
		fs.writeFileSync(path.join(outside, "secret.jar"), "not a mod");
		try {
			fs.symlinkSync(outside, path.join(mods, "Link"), "junction");
		} catch {
			return t.skip("this machine can't make links");
		}
		const hash = sha256(Buffer.from("not a mod"));
		writeLockRaw(server, [{ id: "github:a/link", source: "github", ref: "a/link", version: "v1", side: "both", names: ["Link"], files: [{ path: "Link/secret.jar", sha256: hash }], dependencyOf: [], installedAt: "" }]);

		const manifest = await buildManifest(server);
		assert.deepEqual(manifest.mods, []);
		assert.equal(manifest.omitted.length, 1);
	});

	it("refuses a pack over 200 MB before reading any of it, as too big", async () => {
		const { server, mods } = freshServer();
		const big = path.join(mods, "Big.jar");
		fs.writeFileSync(big, "");
		fs.truncateSync(big, 201 * 1024 * 1024);
		// Only the size is needed for the check, so the hash is a dummy: the file must not be read.
		writeLockRaw(server, [{ id: "github:a/big", source: "github", ref: "a/big", version: "v1", side: "both", names: ["Big.jar"], files: [{ path: "Big.jar", sha256: "0".repeat(64) }], dependencyOf: [], installedAt: "" }]);

		await assert.rejects(() => buildClientPack(server, { format: "zip" }), (err) => err instanceof ModError && err.code === "pack_too_big" && err.status === 413);
		assert.deepEqual(packLeftovers(), []);
	});

	it("refuses an unknown format as bad_format", async () => {
		const { server } = freshServer();
		await assert.rejects(() => buildClientPack(server, { format: "mrpack" }), (err) => err instanceof ModError && err.code === "bad_format" && err.status === 400);
		await assert.rejects(() => buildClientPack(server, { format: undefined }), { code: "bad_format" });
	});
});

describe("the list pack", () => {
	it("gives one line per mod, with a Workshop link only for a numeric Workshop id", async () => {
		const { server, mods } = freshServer();
		const a = putMod(mods, "A.jar", "a");
		const b = putMod(mods, "B.jar", "b");
		const c = putMod(mods, "C.jar", "c");
		await lock.add(server.name, entryOf(mods, { id: "workshop:123456", source: "workshop", ref: "123456", names: ["A.jar"], files: [a], version: "7" }));
		await lock.add(server.name, entryOf(mods, { id: "workshop:abc", source: "workshop", ref: "abc", names: ["B.jar"], files: [b], version: "" }));
		await lock.add(server.name, entryOf(mods, { id: "github:a/c", ref: "a/c", names: ["C.jar"], files: [c], version: "v2" }));

		const pack = await buildClientPack(server, { format: "list" });
		try {
			assert.equal(pack.name, "mod-list.txt");
			const text = fs.readFileSync(pack.file, "utf8");
			const lines = text.trim().split(/\r?\n/);
			assert.equal(lines.length, 4, text);
			assert.match(lines[1], /^A\.jar {2}\(workshop:123456 {2}7\) {2}https:\/\/steamcommunity\.com\/sharedfiles\/filedetails\/\?id=123456$/);
			assert.match(lines[2], /^B\.jar {2}\(workshop:abc\)$/);
			assert.match(lines[3], /^C\.jar {2}\(github:a\/c {2}v2\)$/);
			assert.doesNotMatch(text, /abc\?id=|c\/c.*steamcommunity/);
		} finally {
			await pack.cleanup();
		}
	});

	it("chooses the default format from the game: a list for Workshop, Thunderstore or script ids, else a zip", () => {
		assert.equal(defaultFormat({ type: "minecraft" }), "zip");
		assert.equal(defaultFormat({ type: "ark", updateAppId: "376030" }), "list");
		assert.equal(defaultFormat({ type: "valheim" }), "list");
		assert.equal(defaultFormat({ type: "nothing-like-this" }), "zip");
	});
});

describe("what a pack never shows", () => {
	it("keeps the server's folder, name and RCON password out of the manifest, the zip and the list", async () => {
		const { server, mods, folder } = freshServer({ name: "SENTINEL-NAME-7731", rconPassword: "SENTINEL-RCON-9912", rconPort: 4242 });
		const a = putMod(mods, "A.jar", "a");
		await lock.add(server.name, entryOf(mods, { id: "github:a/a", ref: "a/a", names: ["A.jar"], files: [a] }));
		const sentinels = ["SENTINEL-NAME-7731", "SENTINEL-RCON-9912", folder, JSON.stringify(folder).slice(1, -1)];

		const text = JSON.stringify(await buildManifest(server));
		for (const s of sentinels) assert.equal(text.includes(s), false, s);

		for (const format of ["zip", "list"]) {
			const pack = await buildClientPack(server, { format });
			try {
				const bytes = format === "zip" ? fs.readFileSync(pack.file).toString("latin1") : fs.readFileSync(pack.file, "utf8");
				for (const s of sentinels) assert.equal(bytes.includes(s), false, `${format}: ${s}`);
				if (format === "zip") {
					for (const e of new AdmZip(pack.file).getEntries()) {
						for (const s of sentinels) assert.equal(e.getData().toString("utf8").includes(s), false, `${format} ${e.entryName}: ${s}`);
					}
				}
			} finally {
				await pack.cleanup();
			}
		}
	});

	it("removes its temp folder on cleanup, and cleanup can be called again without a throw", async () => {
		const { server, mods } = freshServer();
		const a = putMod(mods, "A.jar", "a");
		await lock.add(server.name, entryOf(mods, { id: "github:a/a", ref: "a/a", names: ["A.jar"], files: [a] }));
		const before = packLeftovers();
		const pack = await buildClientPack(server, { format: "zip" });
		const dir = path.dirname(pack.file);
		assert.equal(path.basename(dir).startsWith("ghp-pack-"), true);
		assert.equal(fs.existsSync(pack.file), true);
		await pack.cleanup();
		assert.equal(fs.existsSync(dir), false);
		assert.deepEqual(packLeftovers(), before);
		await assert.doesNotReject(() => pack.cleanup());
	});
});

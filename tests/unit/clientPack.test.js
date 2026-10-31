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

const { buildManifest, buildClientPack, defaultFormat, supportsMrpack } = clientPack;
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
		await assert.rejects(() => buildClientPack(server, { format: "nope" }), (err) => err instanceof ModError && err.code === "bad_format" && err.status === 400);
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

describe("mrpack", () => {
	const hex = (algo, bytes) => crypto.createHash(algo).update(bytes).digest("hex");
	const cdnUrl = (name) => `https://cdn.modrinth.com/data/abc123/versions/def456/${name}`;
	const zipBytes = (file, name) => new AdmZip(file).getEntry(name).getData();

	/** A Minecraft server whose variables.txt names the game version and loader, which is where the panel reads them for a modpack. */
	function mcServer(extra = {}) {
		const made = freshServer(extra);
		fs.writeFileSync(path.join(made.folder, "variables.txt"), "MINECRAFT_VERSION=1.21.1\nMODLOADER=fabric\n");
		return made;
	}

	/** What Modrinth would say about a mod's pinned version, for a file with these bytes. `extra` replaces any field. */
	const modrinthFor = (name, bytes, extra = {}) => ({ version: "1.0.0", name, size: bytes.length, sha512: hex("sha512", bytes), url: cdnUrl(name), ...extra });

	/**
	 * A fetch stand-in for Modrinth's API. `answers` maps a slug to the file Modrinth names for its pinned version, or to "fail" (a
	 * server error), "throw" (the request fails) or nothing (not found). Every request is recorded.
	 */
	function modrinthStub(answers) {
		const asked = [];
		const fetchImpl = async (url) => {
			asked.push(String(url));
			const m = /\/project\/([^/?]+)(\/version)?/.exec(String(url));
			const answer = answers[m?.[1]];
			if (answer === "throw") throw new Error("socket hang up");
			if (!answer || answer === "fail") return { ok: false, status: answer ? 500 : 404, headers: new Headers(), body: [] };
			const reply = (value) => ({ ok: true, status: 200, headers: new Headers(), body: [Buffer.from(JSON.stringify(value))] });
			if (!m[2]) return reply({ title: m[1] });
			return reply([
				{
					version_number: answer.version,
					version_type: "release",
					date_published: "2026-01-01T00:00:00Z",
					loaders: ["fabric"],
					game_versions: ["1.21.1"],
					files: [{ url: answer.url, filename: answer.name, size: answer.size, primary: true, hashes: { sha512: answer.sha512 } }],
					dependencies: [],
				},
			]);
		};
		return { fetchImpl, asked };
	}

	/** A lock entry for a mod that came from Modrinth, with its one file. */
	const modrinthEntry = (mods, slug, name, file, side = "client") =>
		entryOf(mods, { id: `modrinth:${slug}`, source: "modrinth", ref: slug, version: "1.0.0", side, names: [name], files: [file] });

	it("is for a Minecraft server only, and the default format is still zip", () => {
		assert.equal(supportsMrpack({ type: "minecraft" }), true);
		assert.equal(supportsMrpack({ type: "ark", updateAppId: "376030" }), false);
		assert.equal(defaultFormat({ type: "minecraft" }), "zip");
	});

	it("refuses a server that isn't Minecraft, and a Minecraft server with no known game version, as unsupported", async () => {
		const ark = freshServer({ type: "ark", updateAppId: "376030" });
		await assert.rejects(() => buildClientPack(ark.server, { format: "mrpack" }), { code: "unsupported", status: 400, message: "This game's mods can't be packed as a Modrinth pack." });
		const noVersion = freshServer();
		await assert.rejects(() => buildClientPack(noVersion.server, { format: "mrpack" }), { code: "unsupported", status: 400 });
	});

	it("lists Modrinth mods that match Modrinth's file, with hashes, env and the download address, and keeps them out of the overrides", async () => {
		const { server, mods } = mcServer();
		const sodium = putMod(mods, "Sodium.jar", "sodium bytes");
		const lithium = putMod(mods, "Lithium.jar", "lithium bytes");
		await lock.add(server.name, modrinthEntry(mods, "sodium", "Sodium.jar", sodium, "client"));
		await lock.add(server.name, modrinthEntry(mods, "lithium", "Lithium.jar", lithium, "both"));
		const { fetchImpl, asked } = modrinthStub({
			sodium: modrinthFor("Sodium.jar", Buffer.from("sodium bytes")),
			lithium: modrinthFor("Lithium.jar", Buffer.from("lithium bytes")),
		});

		const pack = await buildClientPack(server, { format: "mrpack", fetchImpl });
		try {
			assert.equal(pack.name, "mod-pack.mrpack");
			assert.deepEqual(zipNames(pack.file), ["modrinth.index.json"]);
			assert.ok(asked.some((u) => /\/project\/sodium\/version/.test(u)), asked.join(" "));
			const index = JSON.parse(zipText(pack.file, "modrinth.index.json"));
			assert.equal(index.formatVersion, 1);
			assert.equal(index.game, "minecraft");
			assert.equal(index.name, server.name);
			assert.equal(index.summary, `Mods for ${server.name}`);
			assert.equal(typeof index.versionId, "string");
			// Only minecraft is named: the panel doesn't know the loader's version.
			assert.deepEqual(index.dependencies, { minecraft: "1.21.1" });
			assert.deepEqual(index.files, [
				{ path: "mods/Sodium.jar", hashes: { sha1: hex("sha1", "sodium bytes"), sha512: hex("sha512", "sodium bytes") }, env: { client: "required", server: "unsupported" }, downloads: [cdnUrl("Sodium.jar")], fileSize: 12 },
				{ path: "mods/Lithium.jar", hashes: { sha1: hex("sha1", "lithium bytes"), sha512: hex("sha512", "lithium bytes") }, env: { client: "required", server: "required" }, downloads: [cdnUrl("Lithium.jar")], fileSize: 13 },
			]);
		} finally {
			await pack.cleanup();
		}
		assert.deepEqual(packLeftovers(), []);
	});

	const refused = [
		["the hash differs", (bytes) => modrinthFor("Sodium.jar", bytes, { sha512: "0".repeat(128) })],
		["the name differs", (bytes) => modrinthFor("Sodium.jar", bytes, { name: "Other.jar" })],
		["the size differs", (bytes) => modrinthFor("Sodium.jar", bytes, { size: bytes.length + 1 })],
		["the file is on another host", (bytes) => modrinthFor("Sodium.jar", bytes, { url: "https://evil.example.com/Sodium.jar" })],
		["the file is plain http from the CDN", (bytes) => modrinthFor("Sodium.jar", bytes, { url: "http://cdn.modrinth.com/Sodium.jar" })],
		["the file has credentials in its address", (bytes) => modrinthFor("Sodium.jar", bytes, { url: "https://user:pw@cdn.modrinth.com/Sodium.jar" })],
		["Modrinth answers with an error", () => "fail"],
		["the request to Modrinth fails", () => "throw"],
		["Modrinth has no such mod", () => undefined],
	];
	for (const [why, answerFor] of refused) {
		it(`puts a Modrinth mod in the overrides when ${why}`, async () => {
			const { server, mods } = mcServer();
			const local = putMod(mods, "Sodium.jar", "sodium bytes");
			await lock.add(server.name, modrinthEntry(mods, "sodium", "Sodium.jar", local));
			const { fetchImpl } = modrinthStub({ sodium: answerFor(Buffer.from("sodium bytes")) });

			const pack = await buildClientPack(server, { format: "mrpack", fetchImpl });
			try {
				assert.deepEqual(zipNames(pack.file), ["modrinth.index.json", "overrides/mods/Sodium.jar"]);
				assert.equal(hex("sha256", zipBytes(pack.file, "overrides/mods/Sodium.jar")), local.sha256);
				assert.deepEqual(JSON.parse(zipText(pack.file, "modrinth.index.json")).files, []);
			} finally {
				await pack.cleanup();
			}
		});
	}

	it("accepts a loopback address only under the same test hook the download guard reads", async () => {
		const { server, mods } = mcServer();
		const local = putMod(mods, "Sodium.jar", "sodium bytes");
		await lock.add(server.name, modrinthEntry(mods, "sodium", "Sodium.jar", local));
		const url = "http://127.0.0.1:9/Sodium.jar";
		const answer = { sodium: modrinthFor("Sodium.jar", Buffer.from("sodium bytes"), { url }) };

		const saved = process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
		try {
			process.env.GHP_MODSOURCE_ALLOW_LOOPBACK = "1";
			const listed = await buildClientPack(server, { format: "mrpack", fetchImpl: modrinthStub(answer).fetchImpl });
			try {
				assert.deepEqual(zipNames(listed.file), ["modrinth.index.json"]);
				assert.equal(JSON.parse(zipText(listed.file, "modrinth.index.json")).files[0].downloads[0], url);
			} finally {
				await listed.cleanup();
			}
			delete process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
			const overridden = await buildClientPack(server, { format: "mrpack", fetchImpl: modrinthStub(answer).fetchImpl });
			try {
				assert.deepEqual(zipNames(overridden.file), ["modrinth.index.json", "overrides/mods/Sodium.jar"]);
			} finally {
				await overridden.cleanup();
			}
		} finally {
			if (saved === undefined) delete process.env.GHP_MODSOURCE_ALLOW_LOOPBACK;
			else process.env.GHP_MODSOURCE_ALLOW_LOOPBACK = saved;
		}
	});

	it("puts a mod from another source in the overrides, names a CurseForge mod only, and leaves out a server-only or changed mod", async () => {
		const { server, mods } = mcServer();
		const gh = putMod(mods, "Gh.jar", "github bytes");
		const cf = putMod(mods, "Cf.jar", "curseforge bytes");
		const srv = putMod(mods, "Srv.jar", "server only");
		const chg = putMod(mods, "Chg.jar", "as recorded");
		await lock.add(server.name, entryOf(mods, { id: "github:a/gh", ref: "a/gh", names: ["Gh.jar"], files: [gh] }));
		await lock.add(server.name, entryOf(mods, { id: "curseforge:123", source: "curseforge", ref: "123", names: ["Cf.jar"], files: [cf] }));
		await lock.add(server.name, entryOf(mods, { id: "github:a/srv", ref: "a/srv", side: "server", names: ["Srv.jar"], files: [srv] }));
		await lock.add(server.name, entryOf(mods, { id: "github:a/chg", ref: "a/chg", names: ["Chg.jar"], files: [chg] }));
		fs.writeFileSync(path.join(mods, "Chg.jar"), "edited by hand");
		const { fetchImpl, asked } = modrinthStub({});

		const pack = await buildClientPack(server, { format: "mrpack", fetchImpl });
		try {
			assert.deepEqual(zipNames(pack.file), ["modrinth.index.json", "overrides/mods/Gh.jar"]);
			assert.deepEqual(JSON.parse(zipText(pack.file, "modrinth.index.json")).files, []);
			assert.deepEqual(asked, [], "only a Modrinth mod is looked up");
		} finally {
			await pack.cleanup();
		}
	});

	it("names no absolute path and no .. segment, in the zip or in the index", async () => {
		const { server, mods } = mcServer();
		const two = putMod(mods, "Nested/Two.jar", "two bytes");
		const one = putMod(mods, "One.jar", "one bytes");
		await lock.add(server.name, entryOf(mods, { id: "modrinth:two", source: "modrinth", ref: "two", version: "1.0.0", names: ["Nested"], files: [two] }));
		await lock.add(server.name, entryOf(mods, { id: "github:a/one", ref: "a/one", names: ["One.jar"], files: [one] }));
		const { fetchImpl } = modrinthStub({ two: modrinthFor("Two.jar", Buffer.from("two bytes")) });

		const pack = await buildClientPack(server, { format: "mrpack", fetchImpl });
		try {
			const index = JSON.parse(zipText(pack.file, "modrinth.index.json"));
			const names = [...zipNames(pack.file), ...index.files.map((f) => f.path)];
			assert.deepEqual(zipNames(pack.file), ["modrinth.index.json", "overrides/mods/One.jar"]);
			assert.deepEqual(index.files.map((f) => f.path), ["mods/Nested/Two.jar"]);
			for (const name of names) {
				assert.equal(path.isAbsolute(name) || /^[A-Za-z]:/.test(name), false, name);
				assert.equal(name.split(/[\\/]/).includes(".."), false, name);
			}
		} finally {
			await pack.cleanup();
		}
	});

	it("looks up at most 100 mods, and puts the rest in the overrides", async () => {
		const { server, mods } = mcServer();
		const entries = [];
		const answers = {};
		for (let i = 0; i < 101; i += 1) {
			const name = `Mod${i}.jar`;
			const file = putMod(mods, name, `bytes ${i}`);
			answers[`mod${i}`] = modrinthFor(name, Buffer.from(`bytes ${i}`));
			entries.push(modrinthEntry(mods, `mod${i}`, name, file));
		}
		writeLockRaw(server, entries);
		const { fetchImpl, asked } = modrinthStub(answers);

		const pack = await buildClientPack(server, { format: "mrpack", fetchImpl });
		try {
			assert.equal(asked.filter((u) => /\/project\/[^/?]+\/version/.test(u)).length, 100);
			assert.equal(JSON.parse(zipText(pack.file, "modrinth.index.json")).files.length, 100);
			assert.deepEqual(zipNames(pack.file).filter((n) => n.startsWith("overrides/")), ["overrides/mods/Mod100.jar"]);
		} finally {
			await pack.cleanup();
		}
	});

	it("refuses a pack over 200 MB as too big before any file is read or any mod is looked up", async () => {
		const { server, mods } = mcServer();
		const big = path.join(mods, "Big.jar");
		fs.writeFileSync(big, "");
		fs.truncateSync(big, 201 * 1024 * 1024);
		// The hash is a dummy: the file must not be read, and Modrinth must not be asked, before the size is judged.
		writeLockRaw(server, [{ id: "modrinth:big", source: "modrinth", ref: "big", version: "1.0.0", side: "both", names: ["Big.jar"], files: [{ path: "Big.jar", sha256: "0".repeat(64) }], dependencyOf: [], installedAt: "" }]);
		const { fetchImpl, asked } = modrinthStub({ big: modrinthFor("Big.jar", Buffer.from("x")) });

		await assert.rejects(() => buildClientPack(server, { format: "mrpack", fetchImpl }), (err) => err instanceof ModError && err.code === "pack_too_big" && err.status === 413);
		assert.deepEqual(asked, []);
		assert.deepEqual(packLeftovers(), []);
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

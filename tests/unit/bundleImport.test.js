import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Importing a .gpserver bundle: a preview that reads only the manifest, and an import that rebuilds the server in a new folder.
// The bundles are real ones made by exportServer, and hand-built tar files for the hostile cases. A refused or failed import leaves
// no folder and no registration behind, and a folder that was already there is never removed.

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gp-import-"));
process.env.GHP_DATA_DIR = path.join(tmp, "data");
const { ensureDataDirs } = await import("../../src/server/paths.js");
ensureDataDirs();
const { initConfig } = await import("../../src/server/config/configStore.js");
await initConfig();
const serverStore = await import("../../src/server/data/serverStore.js");
await serverStore.initServerStore();
const scheduler = await import("../../src/server/services/scheduler.js");
await scheduler.initScheduler();
const { setOptions, getOptions } = await import("../../src/server/data/serverOptions.js");
const modLock = await import("../../src/server/services/modLock.js");
const { isAutoUpdateEnabled } = await import("../../src/server/services/autoUpdateSettings.js");
const { writeMarker, MARKER_FILE } = await import("../../src/server/services/serverRemoval.js");
const { exportServer, BundleError, BUNDLE_MANIFEST, BUNDLE_VERSION } = await import("../../src/server/services/serverBundle.js");
const { listArchive, listArchiveDetailed, extractArchive, createArchive } = await import("../../src/server/util/tarZip.js");
const { slugify } = await import("../../src/server/services/serverCreationService.js");
const { planImport, importServer, IMPORT_LIMITS } = await import("../../src/server/services/bundleImport.js");

const NAME = "Bundle Source";
const SECRET = "Sup3rSecretRcon";
const root = path.join(tmp, "servers", "bundle-source");
const installDir = `${root}${path.sep}`;
const elsewhere = path.join(tmp, "elsewhere");
const GAME_BIN = Buffer.alloc(2048, 0x78);
const outDirs = [];

const write = (rel, content) => {
	fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
	fs.writeFileSync(path.join(root, rel), content);
};
const walk = (dir) =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const freshDir = (prefix = "d-") => {
	const dir = fs.mkdtempSync(path.join(tmp, prefix));
	outDirs.push(dir);
	return dir;
};
const freshParent = () => path.join(freshDir("parent-"), "servers");
const readManifestOf = async (file) => {
	const dest = freshDir("manifest-");
	await extractArchive(file, dest, [BUNDLE_MANIFEST]);
	return JSON.parse(fs.readFileSync(path.join(dest, BUNDLE_MANIFEST), "utf8"));
};

// A tar file written by hand, so the hostile cases can hold names and entry types that the panel itself never writes.
// Entries: { name, data?, type? ("0" file, "1" hard link, "2" symlink), link? }.
function writeOctal(buf, offset, len, n) {
	buf.write(`${n.toString(8).padStart(len - 1, "0")}\0`, offset, len, "ascii");
}
function tarOf(entries) {
	const blocks = [];
	for (const e of entries) {
		const data = e.data == null ? Buffer.alloc(0) : Buffer.from(e.data);
		const type = e.type ?? "0";
		const header = Buffer.alloc(512, 0);
		header.write(e.name, 0, 100, "utf8");
		writeOctal(header, 100, 8, 0o644);
		writeOctal(header, 108, 8, 0);
		writeOctal(header, 116, 8, 0);
		writeOctal(header, 124, 12, type === "0" ? data.length : 0);
		writeOctal(header, 136, 12, 1700000000);
		header.fill(" ", 148, 156);
		header.write(type, 156, 1, "ascii");
		if (e.link) header.write(e.link, 157, 100, "utf8");
		header.write("ustar\0", 257, 6, "ascii");
		header.write("00", 263, 2, "ascii");
		let sum = 0;
		for (const b of header) sum += b;
		header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
		blocks.push(header);
		if (data.length) {
			const padded = Buffer.alloc(Math.ceil(data.length / 512) * 512);
			data.copy(padded);
			blocks.push(padded);
		}
	}
	blocks.push(Buffer.alloc(1024));
	return Buffer.concat(blocks);
}
const bundleFile = (entries, fileName = "hostile.gpserver") => {
	const file = path.join(freshDir("hostile-"), fileName);
	fs.writeFileSync(file, tarOf(entries));
	return file;
};
const parentIsEmpty = (parent) => !fs.existsSync(parent) || fs.readdirSync(parent).length === 0;

// Deps for importServer: SteamCMD counts as not installed, the disk as roomy, and an install that must not run.
const quiet = {
	isSteamCmdInstalled: () => false,
	updateServer: async () => {
		throw new Error("updateServer should not run here");
	},
};

function serverRecord(extra = {}) {
	return {
		name: NAME,
		type: "conan",
		method: "rcon",
		host: "127.0.0.1",
		port: 8892,
		queryPort: 8894,
		rconPort: 8895,
		rconPassword: SECRET,
		processName: "gp-bundle-source.exe",
		installDir,
		workingDir: root,
		startScriptPath: path.join(root, "start.bat"),
		configPath: path.join(root, "config", "ServerSettings.ini"),
		configPaths: { rcon: path.join(root, "config", "Game.ini") },
		source: "created",
		updateAppId: "443030",
		steamCmdPath: "C:\\Tools\\steamcmd.exe",
		...extra,
	};
}

let fullFile;
let savesFile;
let secretsFile;
let source;

describe("importing a server bundle", () => {
	before(async () => {
		write("saves/world.sav", "world v1\n");
		write("config/ServerSettings.ini", `[ServerSettings]\nAdminPassword=${SECRET}\nServerName=${NAME}\n`);
		write("config/Game.ini", `[RconPlugin]\nRconPassword=${SECRET}\nRconPort=8895\n`);
		write("start.bat", `@echo off\r\ncd /d "${root}"\r\nstart "${NAME}" game.exe\r\n`);
		write("ConanSandbox/Mods/mod.pak", "a mod\n");
		fs.mkdirSync(path.join(root, "bin"), { recursive: true });
		fs.writeFileSync(path.join(root, "bin", "game.bin"), GAME_BIN);
		await writeMarker(root, { name: NAME });
		await modLock.add(NAME, {
			id: "workshop:123",
			source: "workshop",
			ref: "123",
			names: ["mod.pak"],
			files: [{ path: "mod.pak", sha256: "a".repeat(64) }],
		});
		fs.mkdirSync(elsewhere, { recursive: true });
		fs.writeFileSync(path.join(elsewhere, "notes.txt"), "outside the folder");
		await setOptions(NAME, {
			autoStart: true,
			backup: {
				paths: [
					{ path: path.join(root, "saves"), label: "Saves" },
					{ path: elsewhere, label: "Elsewhere" },
				],
			},
		});

		await serverStore.add(serverRecord());
		source = serverStore.get(NAME);

		await scheduler.addTask({ kind: "command", name: "Only mine", servers: [NAME], when: { type: "interval", everyMinutes: 60 }, options: { command: "save" } });
		await serverStore.add({ name: "Bundle Other", type: "conan", installDir: path.join(tmp, "servers", "other"), source: "created" });
		await scheduler.addTask({ kind: "command", name: "Shared", servers: [NAME, "Bundle Other"], when: { type: "interval", everyMinutes: 60 }, options: { command: "save" } });

		fullFile = (await exportServer(source, { include: "all", outDir: freshDir("export-all-") })).file;
		savesFile = (await exportServer(source, { include: "saves", outDir: freshDir("export-saves-") })).file;
		secretsFile = (await exportServer(source, { include: "all", secrets: true, outDir: freshDir("export-secrets-") })).file;
	});

	after(() => {
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	describe("listing a bundle", () => {
		it("gives the type of each entry, file or folder, for a zip bundle", async () => {
			const entries = await listArchiveDetailed(fullFile);
			const world = entries.find((e) => e.name === "saves/world.sav");
			assert.equal(world.type, "file");
			assert.equal(world.size, "world v1\n".length);
			const saves = entries.find((e) => e.name.replace(/\/$/, "") === "saves");
			assert.equal(saves.type, "dir");
			assert.equal(entries.filter((e) => e.type === "other").length, 0);
		});

		it("gives the same types for a zstd archive as for a zip one", async () => {
			const dir = freshDir("zstd-");
			const outFile = path.join(dir, "z.tar.zst");
			const folder = path.join(dir, "src");
			fs.mkdirSync(path.join(folder, "sub"), { recursive: true });
			fs.writeFileSync(path.join(folder, "sub", "a.txt"), "abc");
			await createArchive(outFile, [{ dir: folder, name: "sub" }], { format: "zstd", level: "fast" });
			const entries = await listArchiveDetailed(outFile);
			assert.equal(entries.find((e) => e.name === "sub/a.txt").type, "file");
			assert.equal(entries.find((e) => e.name.replace(/\/$/, "") === "sub").type, "dir");
			assert.equal(entries.find((e) => e.name === "sub/a.txt").size, 3);
		});

		it("marks a symlink and a hard link as other, and keeps the name without the link text", async () => {
			const file = bundleFile([
				{ name: "real.txt", data: "x" },
				{ name: "link", type: "2", link: "/etc/passwd" },
				{ name: "hard", type: "1", link: "real.txt" },
			]);
			const entries = await listArchiveDetailed(file);
			assert.equal(entries.find((e) => e.name === "real.txt").type, "file");
			assert.equal(entries.find((e) => e.name === "link").type, "other");
			assert.equal(entries.find((e) => e.name === "hard").type, "other");
		});
	});

	describe("planning an import", () => {
		it("reads the manifest and says what the bundle holds, without any folder being made", async () => {
			const plan = await planImport(fullFile);
			assert.equal(plan.game, "conan");
			assert.equal(plan.sourceName, NAME);
			assert.equal(plan.include, "all");
			assert.equal(plan.needsGameDownload, false);
			assert.equal(plan.secretsIncluded, false);
			assert.equal(typeof plan.createdAt, "string");
			const entries = await listArchiveDetailed(fullFile);
			assert.equal(plan.bytes, entries.reduce((sum, e) => sum + e.size, 0));
			assert.equal(plan.nameTaken, true, "the source's own name is taken");
			assert.equal(plan.name, `${NAME} (2)`);
		});

		it("says a saves bundle needs the game downloaded", async () => {
			const plan = await planImport(savesFile);
			assert.equal(plan.include, "saves");
			assert.equal(plan.needsGameDownload, true);
		});

		it("lists the passwords that will be made and the settings that were not carried", async () => {
			const plan = await planImport(fullFile);
			assert.ok(plan.warnings.some((w) => w.startsWith("New passwords will be made for:") && w.includes("rconPassword")));
			assert.ok(plan.warnings.some((w) => w.startsWith("Some settings pointed outside the server folder")));
			assert.ok(plan.warnings.some((w) => w === "1 schedule(s) that also covered other servers were not carried."));
		});

		it("lists a port the bundle wants that is taken, and proposes a free one", async () => {
			const plan = await planImport(fullFile);
			const conflict = plan.portConflicts.find((c) => c.key === "port");
			assert.ok(conflict, "the game port conflicts with the source server");
			assert.equal(conflict.port, 8892);
			assert.equal(typeof conflict.owner, "string");
			assert.notEqual(plan.ports.port, 8892);
			assert.ok(Number.isInteger(plan.ports.queryPort) && Number.isInteger(plan.ports.rconPort));
		});

		it("notes a bundle from another panel version, by major and minor", async () => {
			const manifest = { ...(await readManifestOf(fullFile)), panelVersion: "0.0.1" };
			const file = bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }]);
			const plan = await planImport(file);
			assert.ok(plan.warnings.some((w) => w.startsWith("This bundle was made by GodlyPanel 0.0.1")));
		});

		it("refuses an archive that is not a bundle", async () => {
			const file = path.join(freshDir("notzip-"), "text.gpserver");
			fs.writeFileSync(file, "hello, this is not an archive");
			await assert.rejects(planImport(file), (e) => e instanceof BundleError && e.code === "not_a_bundle");
		});

		it("refuses a file that is not a .gpserver, or does not exist", async () => {
			const file = bundleFile([{ name: BUNDLE_MANIFEST, data: "{}" }], "bundle.zip");
			await assert.rejects(planImport(file), (e) => e instanceof BundleError && e.code === "bad_file");
			await assert.rejects(planImport(path.join(tmp, "nope.gpserver")), (e) => e instanceof BundleError && e.code === "bad_file");
		});
	});

	describe("a round trip, everything", () => {
		const NEW = "Imported All";
		let parent;
		let result;
		let dest;

		before(async () => {
			parent = freshParent();
			result = await importServer(fullFile, { name: NEW, parentDir: parent }, quiet);
			dest = path.join(parent, slugify(NEW));
		});

		it("makes the server in a new folder of its own", () => {
			assert.equal(fs.existsSync(dest), true);
			const rec = serverStore.get(NEW);
			assert.equal(rec.installDir, dest);
			assert.equal(rec.name, NEW);
			assert.equal(rec.source, "created");
			assert.equal(rec.autoUpdate, false);
			assert.equal(result.installing, false);
		});

		it("has every save, mod and binary byte for byte, and not the manifest", () => {
			assert.equal(fs.readFileSync(path.join(dest, "saves", "world.sav"), "utf8"), "world v1\n");
			assert.ok(fs.readFileSync(path.join(dest, "bin", "game.bin")).equals(GAME_BIN));
			assert.equal(fs.readFileSync(path.join(dest, "ConanSandbox", "Mods", "mod.pak"), "utf8"), "a mod\n");
			assert.equal(fs.existsSync(path.join(dest, BUNDLE_MANIFEST)), false);
		});

		it("has the new marker, and no trace of the source folder in the record or any file", () => {
			assert.equal(fs.existsSync(path.join(dest, MARKER_FILE)), true);
			const rec = serverStore.get(NEW);
			assert.equal(JSON.stringify(rec).includes(root), false);
			assert.equal(JSON.stringify(rec).includes(root.replaceAll("\\", "/")), false);
			for (const f of walk(dest)) {
				const text = fs.readFileSync(f, "latin1");
				assert.equal(text.includes(root), false, `${f} holds the source folder`);
			}
		});

		it("has the start script and settings rebased to the new folder", () => {
			const script = fs.readFileSync(path.join(dest, "start.bat"), "utf8");
			assert.ok(script.includes(dest), "the script runs from the new folder");
			assert.ok(script.includes(`start "${NEW}"`), "the window carries the new name");
			assert.ok(!script.includes("{{"));
		});

		it("has the mod lock entries under the new name", async () => {
			const { mods } = await modLock.read(NEW);
			assert.ok(mods.some((m) => m.id === "workshop:123"));
		});

		it("has its schedule on the new name, and not the one shared with another server", () => {
			const mine = scheduler.listTasks().filter((t) => t.servers.includes(NEW));
			assert.deepEqual(mine.map((t) => t.name), ["Only mine"]);
		});

		it("has the options carried, with the server not starting on its own", () => {
			const opts = getOptions(NEW);
			assert.equal(opts.autoStart, false);
			assert.ok(opts.backup.paths.some((p) => p.path.startsWith(dest)), "the saves folder is rebased");
			assert.ok(!opts.backup.paths.some((p) => p.path.includes(elsewhere)), "the folder outside is not carried");
		});

		it("has the ports free-checked: not the source's, and written to the record", () => {
			const rec = serverStore.get(NEW);
			assert.notEqual(rec.port, 8892);
			assert.ok(rec.port >= 1024 && rec.port <= 65535);
		});

		it("has the auto-update setting from the bundle", async () => {
			assert.equal(await isAutoUpdateEnabled(serverStore.get(NEW)), false);
		});
	});

	describe("a round trip, saves only", () => {
		it("has the saves but not the game, and is installing when SteamCMD is there", async () => {
			const parent = freshParent();
			const calls = [];
			const deps = {
				isSteamCmdInstalled: () => true,
				updateServer: async (server, opts) => {
					calls.push({ name: server.name, opts });
				},
			};
			const result = await importServer(savesFile, { name: "Imported Saves", parentDir: parent }, deps);
			const dest = path.join(parent, slugify("Imported Saves"));
			assert.equal(fs.readFileSync(path.join(dest, "saves", "world.sav"), "utf8"), "world v1\n");
			assert.equal(fs.existsSync(path.join(dest, "bin", "game.bin")), false, "the game is not in the bundle");
			assert.equal(result.installing, true);
			assert.equal(calls.length, 1);
			assert.equal(calls[0].name, "Imported Saves");
			assert.equal(calls[0].opts.proceedWithoutBackup, true);
		});

		it("warns, and is not installing, when SteamCMD is not there", async () => {
			const parent = freshParent();
			const calls = [];
			const deps = {
				isSteamCmdInstalled: () => false,
				updateServer: async () => calls.push(true),
			};
			const result = await importServer(savesFile, { name: "Imported Saves Two", parentDir: parent }, deps);
			assert.equal(result.installing, false);
			assert.ok(result.warnings.some((w) => w.includes("SteamCMD isn't installed yet. Download it from Settings, then update the server to fetch the game.")));
			assert.equal(calls.length, 0);
		});
	});

	describe("secrets", () => {
		it("a bundle made without secrets gets a new password, the same in the record and the settings", async () => {
			const parent = freshParent();
			const result = await importServer(fullFile, { name: "Imported Secret Off", parentDir: parent }, quiet);
			const rec = serverStore.get("Imported Secret Off");
			assert.notEqual(rec.rconPassword, SECRET);
			assert.match(rec.rconPassword, /^[A-Za-z0-9_-]{16}$/);
			const dest = path.join(parent, slugify("Imported Secret Off"));
			const game = fs.readFileSync(path.join(dest, "config", "Game.ini"), "utf8");
			assert.ok(game.includes(`RconPassword=${rec.rconPassword}`));
			assert.equal(game.includes(SECRET), false);
			const settings = fs.readFileSync(path.join(dest, "config", "ServerSettings.ini"), "utf8");
			assert.ok(settings.includes(`AdminPassword=${rec.rconPassword}`), "the same password everywhere");
			assert.ok(result.warnings.some((w) => w.includes("rconPassword")), "the new password is named in the warnings");
			assert.ok(!result.warnings.join(" ").includes(rec.rconPassword), "no password value in the warnings");
		});

		it("a bundle made with secrets keeps the original password", async () => {
			const parent = freshParent();
			await importServer(secretsFile, { name: "Imported Secret On", parentDir: parent }, quiet);
			const rec = serverStore.get("Imported Secret On");
			assert.equal(rec.rconPassword, SECRET);
			const dest = path.join(parent, slugify("Imported Secret On"));
			assert.ok(fs.readFileSync(path.join(dest, "config", "Game.ini"), "utf8").includes(SECRET));
		});
	});

	describe("names and folders", () => {
		it("refuses a name that is taken, in any letter case, and leaves the existing server alone", async () => {
			const parent = freshParent();
			for (const name of [NAME, NAME.toUpperCase()]) {
				await assert.rejects(importServer(fullFile, { name, parentDir: parent }, quiet), (e) => e instanceof BundleError && e.code === "name_taken");
			}
			assert.equal(serverStore.get(NAME).installDir, installDir);
			assert.ok(parentIsEmpty(parent));
		});

		it("refuses no name at all", async () => {
			await assert.rejects(importServer(fullFile, { name: "  ", parentDir: freshParent() }, quiet), (e) => e instanceof BundleError && e.code === "no_name");
		});

		it("never removes a folder that was already there, and makes nothing", async () => {
			const parent = freshParent();
			const existing = path.join(parent, slugify("Keep Me"));
			fs.mkdirSync(existing, { recursive: true });
			fs.writeFileSync(path.join(existing, "keep.txt"), "mine");
			await assert.rejects(importServer(fullFile, { name: "Keep Me", parentDir: parent }, quiet), (e) => e instanceof BundleError && e.code === "folder_exists");
			assert.equal(fs.readFileSync(path.join(existing, "keep.txt"), "utf8"), "mine");
			assert.equal(serverStore.has("Keep Me"), false);
		});

		it("uses the ports it was given when they are free", async () => {
			const parent = freshParent();
			// Conan keeps the port after its game port for itself, so the query port starts two on.
			await importServer(fullFile, { name: "Imported Ports", parentDir: parent, ports: { port: 9301, queryPort: 9303, rconPort: 9304 } }, quiet);
			const rec = serverStore.get("Imported Ports");
			assert.equal(rec.port, 9301);
			assert.equal(rec.queryPort, 9303);
			assert.equal(rec.rconPort, 9304);
		});

		it("refuses ports that are taken, and leaves nothing behind", async () => {
			const parent = freshParent();
			await assert.rejects(importServer(fullFile, { name: "Imported Clash", parentDir: parent, ports: { port: 8892, queryPort: 9312, rconPort: 9313 } }, quiet));
			assert.ok(parentIsEmpty(parent));
			assert.equal(serverStore.has("Imported Clash"), false);
		});

		it("without ports, uses the free ones the plan proposes", async () => {
			const parent = freshParent();
			const plan = await planImport(fullFile);
			await importServer(fullFile, { name: "Imported Planned", parentDir: parent }, quiet);
			const rec = serverStore.get("Imported Planned");
			assert.equal(rec.port, plan.ports.port);
			assert.equal(rec.queryPort, plan.ports.queryPort);
			assert.equal(rec.rconPort, plan.ports.rconPort);
		});
	});

	describe("hostile bundles leave nothing behind", () => {
		const good = () => readManifestOf(fullFile);

		async function refuses(file, code, { name = "Hostile One", parent = freshParent() } = {}) {
			await assert.rejects(importServer(file, { name, parentDir: parent }, quiet), (e) => e instanceof BundleError && e.code === code, `expected ${code}`);
			assert.ok(parentIsEmpty(parent), "no folder made");
			assert.equal(serverStore.has(name), false, "no registration");
			return parent;
		}

		it("an entry that climbs out of the folder", async () => {
			const manifest = await good();
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "../x", data: "evil" }]), "unsafe_bundle");
		});

		it("an entry with a drive letter", async () => {
			const manifest = await good();
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "C:/x", data: "evil" }]), "unsafe_bundle", { name: "Hostile Two" });
		});

		it("an entry that climbs out in the middle", async () => {
			const manifest = await good();
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "a/../../x", data: "evil" }]), "unsafe_bundle", { name: "Hostile Three" });
		});

		it("a symlink entry", async () => {
			const manifest = await good();
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "link", type: "2", link: "C:\\Windows" }]), "unsafe_bundle", { name: "Hostile Four" });
		});

		it("a hard link entry", async () => {
			const manifest = await good();
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "hard", type: "1", link: "saves/world.sav" }]), "unsafe_bundle", { name: "Hostile Five" });
		});

		it("two names that differ only in letter case", async () => {
			const manifest = await good();
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "saves/a.txt", data: "1" }, { name: "Saves/A.txt", data: "2" }]), "unsafe_bundle", { name: "Hostile Six" });
		});

		it("a name with a colon, which would be an alternate data stream", async () => {
			const manifest = await good();
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "saves/world.sav:hidden", data: "x" }]), "unsafe_bundle", { name: "Hostile Seven" });
		});

		it("a segment ending in a dot", async () => {
			const manifest = await good();
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "saves/bad.", data: "x" }]), "unsafe_bundle", { name: "Hostile Eight" });
		});

		it("a reserved device name", async () => {
			const manifest = await good();
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "saves/NUL.txt", data: "x" }]), "unsafe_bundle", { name: "Hostile Nine" });
		});

		it("more entries than the cap", async () => {
			const manifest = await good();
			const was = IMPORT_LIMITS.entries;
			IMPORT_LIMITS.entries = 2;
			try {
				await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "a", data: "1" }, { name: "b", data: "2" }]), "too_many_entries", { name: "Hostile Ten" });
			} finally {
				IMPORT_LIMITS.entries = was;
			}
		});

		it("a manifest over 1 MiB is refused", async () => {
			const big = Buffer.alloc(IMPORT_LIMITS.manifestBytes + 512, 0x20);
			big.write("{}", 0);
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: big }]), "bad_manifest", { name: "Hostile Eleven" });
		});

		it("a manifest from a newer panel", async () => {
			const manifest = { ...(await good()), version: 99 };
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }]), "newer_bundle", { name: "Hostile Twelve" });
			assert.ok(BUNDLE_VERSION < 99);
		});

		it("a game the panel does not have, named in the message", async () => {
			const manifest = { ...(await good()), game: "nosuchgame" };
			const parent = freshParent();
			await assert.rejects(importServer(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }]), { name: "Hostile Thirteen", parentDir: parent }, quiet), (e) => e.code === "unknown_game" && e.message.includes("nosuchgame"));
			assert.ok(parentIsEmpty(parent));
		});

		it("a record path that lies outside the folder", async () => {
			const manifest = await good();
			manifest.server.startScriptPath = "C:\\Windows\\x.bat";
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "saves/world.sav", data: "x" }]), "unsafe_bundle", { name: "Hostile Fourteen" });
		});

		it("a record path on a network share written with forward slashes", async () => {
			const manifest = await good();
			manifest.server.configPath = "//evil/share/ServerSettings.ini";
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "saves/world.sav", data: "x" }]), "unsafe_bundle", { name: "Hostile Net" });
		});

		it("a backup folder with no drive letter is not carried, and the import still works", async () => {
			const manifest = await good();
			manifest.options.backup.paths = [{ path: "\\Users\\someone\\Documents", label: "Docs" }, { path: "{{serverRoot}}\\saves", label: "Saves" }];
			const parent = freshParent();
			const file = bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }, { name: "saves/world.sav", data: "x" }]);
			const result = await importServer(file, { name: "Hostile Backup", parentDir: parent }, quiet);
			const paths = getOptions("Hostile Backup").backup.paths.map((p) => p.path);
			assert.equal(paths.length, 1);
			assert.ok(paths[0].startsWith(path.join(parent, slugify("Hostile Backup"))));
			assert.ok(result.warnings.some((w) => w.includes("backup folder")));
		});

		it("a token that was never filled in", async () => {
			const manifest = await good();
			manifest.server.configPath = "{{oops}}/ServerSettings.ini";
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: JSON.stringify(manifest) }]), "unsafe_bundle", { name: "Hostile Fifteen" });
		});

		it("a manifest that is not JSON", async () => {
			await refuses(bundleFile([{ name: BUNDLE_MANIFEST, data: "{not json" }]), "not_a_bundle", { name: "Hostile Sixteen" });
		});

		it("a bundle with no manifest", async () => {
			await refuses(bundleFile([{ name: "saves/world.sav", data: "x" }]), "not_a_bundle", { name: "Hostile Seventeen" });
		});

		it("not enough disk space: 507, and nothing made", async () => {
			const parent = freshParent();
			const deps = {
				...quiet,
				assertStorageHeadroom: () => {
					const err = new Error("Not enough free disk space");
					err.code = "disk_full";
					throw err;
				},
			};
			await assert.rejects(importServer(fullFile, { name: "Hostile Eighteen", parentDir: parent }, deps), (e) => e instanceof BundleError && e.code === "disk_full" && e.status === 507);
			assert.ok(parentIsEmpty(parent));
		});
	});

	describe("a failure part way through", () => {
		it("removes the folder, the registration and the mod lock file", async () => {
			const parent = freshParent();
			const name = "Rolled Back";
			const deps = {
				...quiet,
				addTask: async () => {
					throw new Error("boom");
				},
			};
			await assert.rejects(importServer(fullFile, { name, parentDir: parent }, deps), /boom/);
			assert.equal(fs.existsSync(path.join(parent, slugify(name))), false, "the folder is gone");
			assert.equal(serverStore.get(name), null, "the store entry is gone");
			assert.equal(fs.existsSync(modLock.lockFileOf(name)), false, "the mod lock file is gone");
		});
	});
});

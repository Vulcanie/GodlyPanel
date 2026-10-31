import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";

// Exporting a server as one .gpserver bundle: what goes in, what is left out, that no machine path of this PC or secret is
// written into the archive, and that a refused or failed export leaves nothing behind.

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gp-bundle-"));
process.env.GHP_DATA_DIR = path.join(tmp, "data");
const { ensureDataDirs, paths } = await import("../../src/server/paths.js");
ensureDataDirs();
const { initConfig } = await import("../../src/server/config/configStore.js");
await initConfig();
const serverStore = await import("../../src/server/data/serverStore.js");
await serverStore.initServerStore();
const scheduler = await import("../../src/server/services/scheduler.js");
await scheduler.initScheduler();
const { setOptions } = await import("../../src/server/data/serverOptions.js");
const modLock = await import("../../src/server/services/modLock.js");
const { writeMarker, MARKER_FILE } = await import("../../src/server/services/serverRemoval.js");
const { exportServer, BundleError, BUNDLE_MANIFEST, BUNDLE_VERSION } = await import("../../src/server/services/serverBundle.js");
const { listArchive, extractArchive } = await import("../../src/server/util/tarZip.js");
const { slugify } = await import("../../src/server/services/serverCreationService.js");

const SECRET = "Sup3rSecretRcon";
const NAME = "Bundle Test";
const root = path.join(tmp, "servers", "bundle-test");
const installDir = `${root}${path.sep}`;
const elsewhere = path.join(tmp, "elsewhere");
const outDirs = [];

const has = (names, rel) => names.some((n) => n.replaceAll("\\", "/").replace(/\/$/, "") === rel);
const write = (rel, text) => {
	fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
	fs.writeFileSync(path.join(root, rel), text);
};
const walk = (dir) =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const freshOut = () => {
	const dir = fs.mkdtempSync(path.join(tmp, "out-"));
	outDirs.push(dir);
	return dir;
};
const readManifest = async (file) => {
	const dest = fs.mkdtempSync(path.join(tmp, "manifest-"));
	await extractArchive(file, dest, [BUNDLE_MANIFEST]);
	return JSON.parse(fs.readFileSync(path.join(dest, BUNDLE_MANIFEST), "utf8"));
};
const extractAll = async (file) => {
	const dest = fs.mkdtempSync(path.join(tmp, "extracted-"));
	await extractArchive(file, dest);
	return dest;
};
const localStamp = () => {
	const d = new Date();
	return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};

function serverRecord(extra = {}) {
	return {
		name: NAME,
		type: "conan",
		method: "rcon",
		host: "127.0.0.1",
		rconPassword: SECRET,
		processName: "gp-bundle-test.exe",
		installDir,
		workingDir: root,
		startScriptPath: path.join(root, "start.bat"),
		configPath: path.join(root, "config", "ServerSettings.ini"),
		configPaths: { rcon: path.join(root, "config", "Game.ini") },
		source: "created",
		updateAppId: "2465200",
		steamCmdPath: "C:\\Tools\\steamcmd.exe",
		...extra,
	};
}

describe("exporting a server bundle", () => {
	let server;

	before(async () => {
		write("saves/world.sav", "world v1\n");
		write("config/ServerSettings.ini", `[ServerSettings]\nAdminPassword=${SECRET}\nServerName=${NAME}\n`);
		write("config/Game.ini", `[RconPlugin]\nRconPassword=${SECRET}\nRconPort=28016\n`);
		write("start.bat", `@echo off\r\ncd /d "${root}"\r\nstart "${NAME}" game.exe\r\n`);
		write("ConanSandbox/Mods/mod.pak", "a mod\n");
		write("bin/game.bin", "x".repeat(3 * 1024 * 1024));
		// A stale file under the bundle's own name, which must not be taken for the manifest.
		write(BUNDLE_MANIFEST, "stale, not a manifest");
		await writeMarker(root, { name: NAME });
		await modLock.add(NAME, {
			id: "workshop:123",
			source: "workshop",
			ref: "123",
			names: ["mod.pak"],
			files: [{ path: "mod.pak", sha256: "a".repeat(64) }],
		});
		// The game's own mods folder is also a place the panel keeps files; the backup folders below are custom.
		await setOptions(NAME, {
			backup: {
				paths: [
					{ path: path.join(root, "saves"), label: "Saves" },
					{ path: elsewhere, label: "Elsewhere" },
				],
			},
		});
		fs.mkdirSync(elsewhere, { recursive: true });
		fs.writeFileSync(path.join(elsewhere, "notes.txt"), "outside the folder");

		server = serverRecord();
		await serverStore.add(server);
		server = serverStore.get(NAME);

		await scheduler.addTask({ kind: "command", name: "Only mine", servers: [NAME], when: { type: "interval", everyMinutes: 60 }, options: { command: "save" } });
		await serverStore.add({ name: "Bundle Other", type: "conan", installDir: path.join(tmp, "servers", "other"), source: "created" });
		await scheduler.addTask({ kind: "command", name: "Shared", servers: [NAME, "Bundle Other"], when: { type: "interval", everyMinutes: 60 }, options: { command: "save" } });
	});

	after(async () => {
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	describe("what goes in", () => {
		it("saves: the saves, the settings, the start script and the mods, but not the game", async () => {
			const out = freshOut();
			const { file, name } = await exportServer(server, { include: "saves", outDir: out });
			assert.equal(path.dirname(file), out);
			assert.equal(name, `${slugify(NAME)}-${localStamp()}.gpserver`);
			const names = await listArchive(file);
			assert.ok(has(names, "saves/world.sav"), "the save is in");
			assert.ok(has(names, "config/ServerSettings.ini"), "the settings are in");
			assert.ok(has(names, "start.bat"), "the start script is in");
			assert.ok(has(names, "ConanSandbox/Mods/mod.pak"), "the mod is in");
			assert.ok(has(names, BUNDLE_MANIFEST), "the manifest is in");
			assert.ok(!has(names, "bin/game.bin"), "the game binary is not");
			assert.ok(!has(names, MARKER_FILE), "the marker is not");
			assert.equal(names.filter((n) => n.endsWith(BUNDLE_MANIFEST)).length, 1, "one manifest, ours");
			const manifest = await readManifest(file);
			assert.equal(manifest.version, 1);
			assert.equal(manifest.include, "saves");
		});

		it("all: the whole install folder, the game binary included", async () => {
			const { file } = await exportServer(server, { include: "all", outDir: freshOut() });
			const names = await listArchive(file);
			assert.ok(has(names, "bin/game.bin"));
			assert.ok(!has(names, MARKER_FILE));
			const manifest = await readManifest(file);
			assert.equal(manifest.include, "all");
		});

		it("writes the default folder when none is given, and the file is a real archive", async () => {
			const { file } = await exportServer(server, { include: "saves" });
			outDirs.push(path.dirname(file));
			assert.ok(file.endsWith(".gpserver"));
			assert.ok(fs.statSync(file).size > 0);
		});
	});

	describe("no machine path of this PC in the manifest or the files", () => {
		it("rebases the install folder, names the server with a token, and records where the name came from", async () => {
			const { file } = await exportServer(server, { include: "saves", outDir: freshOut() });
			const manifest = await readManifest(file);
			const json = JSON.stringify(manifest);
			assert.ok(!json.includes(installDir), "no install folder");
			assert.ok(!json.includes(tmp), "no temp folder of this PC");
			assert.ok(!json.includes(tmp.replaceAll("\\", "/")), "no temp folder in forward slashes");
			assert.ok(json.includes("{{serverRoot}}"));
			assert.equal(manifest.server.name, "{{serverName}}");
			assert.equal(manifest.server.installDir, "{{serverRoot}}");
			assert.equal(manifest.sourceName, NAME);
		});

		it("drops a field that holds a path outside the folder, and lists it", async () => {
			const { file } = await exportServer(server, { include: "saves", outDir: freshOut() });
			const manifest = await readManifest(file);
			assert.equal("steamCmdPath" in manifest.server, false);
			assert.ok(manifest.dropped.fields.includes("steamCmdPath"));
		});

		it("keeps a web address, which is not a path of this PC", async () => {
			await serverStore.update(NAME, { packUrl: "https://example.com/pack.zip" });
			try {
				const { file } = await exportServer(serverStore.get(NAME), { include: "saves", outDir: freshOut() });
				const manifest = await readManifest(file);
				assert.equal(manifest.server.packUrl, "https://example.com/pack.zip");
				assert.ok(!manifest.dropped.fields.includes("packUrl"));
			} finally {
				await serverStore.update(NAME, { packUrl: undefined });
			}
		});

		it("rebases a backup folder inside the server folder, and drops one outside it", async () => {
			const { file } = await exportServer(server, { include: "saves", outDir: freshOut() });
			const manifest = await readManifest(file);
			const [inside, outside] = manifest.options.backup.paths;
			assert.ok(inside.path.startsWith("{{serverRoot}}"), `inside is rebased, got ${inside.path}`);
			assert.ok(inside.path.includes("saves"));
			assert.equal("path" in outside, false, "the outside path is removed");
			assert.ok(manifest.dropped.fields.some((f) => f.startsWith("options.backup.paths") && f.endsWith(".path")));
			assert.ok(!JSON.stringify(manifest).includes(elsewhere));
		});

		it("the start script in the archive names the install folder with the token, not this PC's path", async () => {
			const { file } = await exportServer(server, { include: "saves", outDir: freshOut() });
			const dest = await extractAll(file);
			const script = fs.readFileSync(path.join(dest, "start.bat"), "utf8");
			assert.ok(!script.includes(root));
			assert.ok(script.includes("{{serverRoot}}"));
		});
	});

	describe("secrets", () => {
		it("secrets off: the password is in no archived file, a token stands in, and the file on disk keeps it", async () => {
			const { file } = await exportServer(server, { include: "saves", secrets: false, outDir: freshOut() });
			const manifest = await readManifest(file);
			assert.equal(manifest.server.rconPassword, "{{secret:rconPassword}}");
			assert.ok(manifest.secretFields.includes("rconPassword"));
			assert.equal(manifest.secretsIncluded, false);
			assert.ok(!JSON.stringify(manifest).includes(SECRET));
			const dest = await extractAll(file);
			for (const f of walk(dest)) assert.ok(!fs.readFileSync(f, "latin1").includes(SECRET), `${f} holds the password`);
			const config = fs.readFileSync(path.join(dest, "config", "Game.ini"), "utf8");
			assert.ok(config.includes("{{secret:rconPassword}}"));
			assert.ok(fs.readFileSync(path.join(root, "config", "Game.ini"), "utf8").includes(SECRET), "the file on this PC is untouched");
		});

		it("secrets on: the password is in the archive and is listed", async () => {
			const { file } = await exportServer(server, { include: "saves", secrets: true, outDir: freshOut() });
			const manifest = await readManifest(file);
			assert.equal(manifest.server.rconPassword, SECRET);
			assert.equal(manifest.secretsIncluded, true);
			assert.ok(manifest.secretFields.includes("rconPassword"));
			const dest = await extractAll(file);
			assert.ok(fs.readFileSync(path.join(dest, "config", "Game.ini"), "utf8").includes(SECRET));
		});
	});

	describe("schedules and mod lock", () => {
		it("exports the schedule for this server alone for this server, and counts the shared one", async () => {
			const { file } = await exportServer(server, { include: "saves", outDir: freshOut() });
			const manifest = await readManifest(file);
			assert.equal(manifest.schedules.length, 1);
			const [task] = manifest.schedules;
			assert.equal(task.name, "Only mine");
			assert.deepEqual(task.servers, ["{{serverName}}"]);
			assert.equal("id" in task, false);
			assert.equal("createdAt" in task, false);
			assert.equal(manifest.omitted.schedules, 1);
		});

		it("carries the mod lock entries", async () => {
			const { file } = await exportServer(server, { include: "saves", outDir: freshOut() });
			const manifest = await readManifest(file);
			assert.ok(manifest.modLock.some((m) => m.id === "workshop:123"));
		});
	});

	describe("refusals", () => {
		it("a bad include or secrets value", async () => {
			await assert.rejects(exportServer(server, { include: "some" }), (e) => e instanceof BundleError && e.code === "bad_input");
			await assert.rejects(exportServer(server, { secrets: "yes" }), (e) => e instanceof BundleError && e.code === "bad_input");
		});

		it("a server the panel did not create", async () => {
			await assert.rejects(exportServer({ ...server, source: "imported" }, { outDir: freshOut() }), (e) => e.code === "not_exportable");
		});

		it("a game the panel doesn't know", async () => {
			await assert.rejects(exportServer({ ...server, type: "nosuchgame" }, { outDir: freshOut() }), (e) => e.code === "unknown_game");
		});

		it("a server whose install folder another server also uses", async () => {
			await serverStore.add({ name: "Bundle Twin", type: "conan", installDir, source: "created" });
			try {
				await assert.rejects(exportServer(server, { outDir: freshOut() }), (e) => e.code === "shared_install");
			} finally {
				await serverStore.remove("Bundle Twin");
			}
		});

		it("saves for a game with no update app id", async () => {
			const { updateAppId: _gone, ...noApp } = server;
			await assert.rejects(exportServer(noApp, { include: "saves", outDir: freshOut() }), (e) => e.code === "saves_unsupported");
		});

		it("a running server, with 409", async () => {
			// A process the panel recorded as this server's: its image name is what the panel checks. It exits on its own.
			const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 20000)"], { stdio: "ignore" });
			const pidFile = path.join(paths.dataDir, "state", "server-pids.json");
			fs.mkdirSync(path.dirname(pidFile), { recursive: true });
			fs.writeFileSync(pidFile, JSON.stringify({ [NAME]: { pid: child.pid, exe: path.basename(process.execPath), at: Date.now() } }));
			try {
				await assert.rejects(exportServer(server, { outDir: freshOut() }), (e) => e instanceof BundleError && e.code === "server_running" && e.status === 409);
			} finally {
				fs.rmSync(pidFile, { force: true });
			}
		});
	});

	describe("failures leave nothing behind", () => {
		it("not enough disk space: 507, and no archive", async () => {
			// A sparse file that claims to be a terabyte: the estimate of the whole folder is then far more than the disk has.
			const big = path.join(root, "bin", "huge.bin");
			fs.writeFileSync(big, "");
			try {
				execFileSync("fsutil", ["sparse", "setflag", big]);
				fs.truncateSync(big, 2 ** 40);
			} catch {
				fs.rmSync(big, { force: true });
				return; // this disk can't make a sparse file here, so there is nothing to test
			}
			const out = freshOut();
			try {
				await assert.rejects(exportServer(server, { include: "all", outDir: out }), (e) => e instanceof BundleError && e.status === 507);
				assert.deepEqual(fs.readdirSync(out).filter((n) => n.endsWith(".gpserver")), []);
			} finally {
				fs.rmSync(big, { force: true });
			}
		});

		it("a failure while archiving (the final name is taken by a folder) leaves no partial file", async () => {
			const out = freshOut();
			fs.mkdirSync(path.join(out, `${slugify(NAME)}-${localStamp()}.gpserver`));
			await assert.rejects(exportServer(server, { include: "saves", outDir: out }), (e) => e instanceof BundleError);
			const left = fs.readdirSync(out).filter((n) => n.includes(".partial") || (n.endsWith(".gpserver") && fs.statSync(path.join(out, n)).isFile()));
			assert.deepEqual(left, []);
		});
	});
});

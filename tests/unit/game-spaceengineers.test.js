import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import spaceEngineers from "../../src/server/data/games/spaceengineers.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";

// Space Engineers, as the research dossier describes it: SpaceEngineersDedicated.exe started with -console, the data folder pinned
// with -path, the game port on the line, and no config file or world written by the panel.

const { template: t, backup, logs, launchOptions } = spaceEngineers;

const params = (extra = {}) => ({
	name: "Test Space",
	port: 27116,
	maxPlayers: 8,
	instanceSlug: "test-space",
	installDir: "C:\\Servers\\space",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	startScriptFilename: "Start_SpaceEngineers.bat",
	...extra,
});

const startLine = (p) => t.buildStartScript(p).split("\r\n").find((l) => l.startsWith("start "));

describe("Space Engineers template", () => {
	it("is the dedicated server tool app, run as a plain process", () => {
		assert.equal(t.id, "spaceengineers");
		assert.equal(t.type, "spaceengineers");
		assert.equal(t.displayName, "Space Engineers");
		assert.equal(t.updateAppId, "298740");
		assert.equal(t.storeAppId, "244850");
		assert.equal(t.method, "process");
		assert.equal(t.sharedInstall, false);
		assert.equal(t.installLayoutRoot, "");
	});

	it("asks for no extra fields: no name, password, RCON or mods", () => {
		assert.deepEqual(t.fields, []);
	});

	it("has one game port, free of the other templates' defaults and of the port after it", async () => {
		assert.deepEqual(t.ports.map((p) => p.key), ["port"]);
		const { GAME_TEMPLATES } = await import("../../src/server/data/gameTemplates.js");
		const others = GAME_TEMPLATES.filter((x) => x.id !== "spaceengineers");
		const taken = new Set(others.flatMap((x) => x.ports.map((p) => p.default)));
		assert.ok(!taken.has(t.ports[0].default), `${t.ports[0].default} is another template's`);
		assert.ok(!taken.has(t.ports[0].default + 1));
		// Not the game's own default (27016) or the Steam port's (8766): other templates here use those.
		assert.notEqual(t.ports[0].default, 27016);
		assert.notEqual(t.ports[0].default, 8766);
		assert.equal(t.ports[0].default, 27116);
	});

	it("writes no config file and no world", () => {
		assert.equal(t.buildConfigFile, undefined);
		assert.equal(t.copyInstalledFiles, undefined);
		assert.equal(t.patchInstalledConfig, undefined);
	});

	it("makes the data folder the game needs, with only a note file in it", () => {
		const extra = t.buildExtraFiles(params());
		assert.deepEqual(extra.map((f) => f.relPath), ["Data\\ABOUT-THIS-FOLDER.md"]);
		// Not a .log or .txt file, so the Logs tab does not list it.
		assert.ok(!/\.(log|txt)$/i.test(extra[0].relPath));
		assert.match(extra[0].content, /SpaceEngineers-Dedicated\.cfg/);
	});
});

describe("Space Engineers start script", () => {
	const script = t.buildStartScript(params());
	const lines = script.split("\r\n");

	it("is a CRLF .bat that changes to the program's own folder first", () => {
		assert.equal(t.buildStartScriptFilename(), "Start_SpaceEngineers.bat");
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0DedicatedServer64"');
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});

	it("starts the server with -console, the data folder and the game port", () => {
		assert.equal(startLine(params()), 'start /MIN "Test Space" SpaceEngineersDedicated.exe -console -path "%~dp0Data" -port 27116 -maxPlayers 8');
	});

	it("never starts without -console or -noconsole, which would open the setup window", () => {
		assert.match(startLine(params()), / -console /);
		assert.doesNotMatch(script, /-noconsole/);
	});

	it("never passes -ignorelastsession, which would start a new world on every start", () => {
		assert.doesNotMatch(script, /ignorelastsession/i);
	});

	it("passes the player limit only when one was asked for, within the game window's 2 to 64", () => {
		const limit = (maxPlayers) => /-maxPlayers (\d+)/.exec(startLine(params({ maxPlayers })))?.[1];
		assert.equal(limit(undefined), undefined);
		assert.equal(limit(""), undefined);
		assert.equal(limit("abc"), undefined);
		assert.equal(limit(0), undefined);
		assert.equal(limit(1), "2");
		assert.equal(limit(16), "16");
		assert.equal(limit(500), "64");
		assert.equal(limit(8.9), "8");
		// Written with the capital P the game matches on.
		assert.doesNotMatch(startLine(params()), /-maxplayers/);
	});

	it("keeps characters cmd acts on out of the window title", () => {
		const nasty = t.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>' }));
		const start = nasty.split("\r\n").find((l) => l.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(start);
		assert.ok(title, start);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.equal(nasty.split("\r\n").filter((l) => l.includes("calc")).length, 1);
		assert.match(startLine(params({ name: '"&%' })), /^start \/MIN "Space Engineers" /);
		// Quotes: the title and the data folder, in pairs.
		assert.equal((start.match(/"/g) ?? []).length, 4);
	});

	it("can be read back by the panel's direct-launch reader", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "se-launch-"));
		try {
			const exe = path.join(dir, "DedicatedServer64", "SpaceEngineersDedicated.exe");
			fs.mkdirSync(path.dirname(exe), { recursive: true });
			fs.writeFileSync(exe, "");
			fs.writeFileSync(path.join(dir, "Start_SpaceEngineers.bat"), script);
			const found = deriveLaunch(path.join(dir, "Start_SpaceEngineers.bat"), { workingDir: dir });
			assert.equal(found.ok, true, found.reason);
			assert.equal(path.resolve(found.launch.exe).toLowerCase(), path.resolve(exe).toLowerCase());
			assert.ok(found.launch.args.includes("-console"));
			assert.ok(found.launch.args.includes("-port 27116"));
			// -path becomes the full path of the Data folder next to the script.
			assert.ok(found.launch.args.toLowerCase().includes(path.join(dir, "Data").toLowerCase()), found.launch.args);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("Space Engineers server entry", () => {
	const p = params();
	const entry = t.buildServerEntry(p);

	it("records the program that stays running, the port and the files", () => {
		assert.equal(entry.type, "spaceengineers");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "SpaceEngineersDedicated.exe");
		assert.equal(entry.port, 27116);
		assert.equal(entry.updateAppId, "298740");
		assert.equal(entry.startScriptPath, "C:\\Servers\\space\\Start_SpaceEngineers.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\space");
		assert.equal(entry.installDir, "C:\\Servers\\space\\");
		assert.equal(entry.name, "Test Space");
	});

	it("matches the port and program in the script", () => {
		const start = startLine(p);
		assert.equal(Number(/-port (\d+)/.exec(start)[1]), entry.port);
		assert.ok(start.includes(entry.processName));
	});

	it("has no settings file the panel edits, no remote console and no password", () => {
		assert.equal(entry.configPath, undefined);
		assert.equal(entry.configPaths, undefined);
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.serverPassword, undefined);
	});
});

describe("Space Engineers backups, logs and launch options", () => {
	it("backs up the worlds and the config, inside the data folder", () => {
		const rels = backup.paths.map((x) => x.rel);
		assert.deepEqual(rels, ["Data/Saves", "Data/SpaceEngineers-Dedicated.cfg"]);
		for (const x of backup.paths) {
			assert.equal(x.base, "working");
			assert.ok(x.label);
			assert.ok(!/^[a-z]:|^\.\.|^\//i.test(x.rel), x.rel);
		}
	});

	it("reads logs from the data folder and the program's logs folder", () => {
		assert.deepEqual(logs.map((l) => l.rel), ["Data", "DedicatedServer64/logs"]);
		for (const l of logs) {
			assert.equal(l.kind, "dir");
			assert.equal(l.base, "working");
			assert.ok(l.label);
		}
	});

	it("gets the launch options form", () => {
		assert.equal(launchOptions, true);
	});
});

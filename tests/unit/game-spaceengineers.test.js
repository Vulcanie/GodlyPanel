import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import spaceEngineers, { serverName, worldFolderName } from "../../src/server/data/games/spaceengineers.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";

// Space Engineers, as a real install behaved (research/spaceengineers/06-verification.md): SpaceEngineersDedicated.exe started with
// -console, the data folder pinned with -path and the game port on the line, plus a SpaceEngineers-Dedicated.cfg the panel writes that
// names the server, the premade world the game copies into Saves on its first start, and the session settings that make it joinable.

const onWindows = process.platform === "win32";

const { template: t, backup, logs, launchOptions } = spaceEngineers;

const params = (extra = {}) => ({
	name: "Test Space",
	sessionName: "Friends Station",
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

	it("asks for the server's name only: no password, RCON or mods", () => {
		assert.deepEqual(t.fields, ["sessionName"]);
		assert.match(t.fieldMeta.sessionName.label, /Server Name/);
	});

	it("has one game port, free of the other templates' defaults and of the port after it", async () => {
		assert.deepEqual(t.ports.map((p) => p.key), ["port"]);
		const { GAME_TEMPLATES } = await import("../../src/server/data/gameTemplates.js");
		const others = GAME_TEMPLATES.filter((x) => x.id !== "spaceengineers");
		const taken = new Set(others.flatMap((x) => x.ports.map((p) => p.default)));
		assert.ok(!taken.has(t.ports[0].default), `${t.ports[0].default} is another template's`);
		assert.ok(!taken.has(t.ports[0].default + 1));
		// Not the game's own default (27016): another template here uses it.
		assert.notEqual(t.ports[0].default, 27016);
		assert.equal(t.ports[0].default, 27116);
	});

	it("writes the config file into the data folder (which also makes the folder the game needs) and nothing else", () => {
		const cfg = t.buildConfigFile(params());
		assert.equal(cfg.relPath, "Data\\SpaceEngineers-Dedicated.cfg");
		assert.equal(t.buildExtraFiles, undefined);
		assert.equal(t.copyInstalledFiles, undefined);
		assert.equal(t.patchInstalledConfig, undefined);
	});
});

describe("Space Engineers config file", () => {
	const cfg = (extra) => t.buildConfigFile(params(extra)).content;
	const tag = (text, name) => new RegExp(`<${name}>([^<]*)</${name}>`).exec(text)?.[1];

	it("is the game's XML: MyConfigDedicated with the name, world and premade world", () => {
		const text = cfg();
		assert.match(text, /^<\?xml version="1\.0"\?>/);
		assert.match(text, /<MyConfigDedicated [^>]*>/);
		assert.match(text, /<\/MyConfigDedicated>\s*$/);
		assert.equal(tag(text, "ServerName"), "Friends Station");
		assert.equal(tag(text, "WorldName"), "Friends Station");
	});

	it("points the game at a premade world the install ships, so the first start makes a world", () => {
		// Relative to DedicatedServer64, where the start script runs the game from (a real start loaded it that way).
		assert.equal(tag(cfg(), "PremadeCheckpointPath"), "..\\Content\\CustomWorlds\\Star System");
		assert.equal(tag(cfg(), "LoadWorld"), undefined);
		assert.equal(tag(cfg(), "IgnoreLastSession"), undefined);
	});

	it("makes the server public with a player limit, and switches the remote API off", () => {
		assert.equal(tag(cfg(), "OnlineMode"), "PUBLIC");
		assert.equal(tag(cfg(), "MaxPlayers"), "8");
		assert.equal(tag(cfg({ maxPlayers: undefined }), "MaxPlayers"), "8");
		assert.equal(tag(cfg({ maxPlayers: "" }), "MaxPlayers"), "8");
		assert.equal(tag(cfg({ maxPlayers: 16 }), "MaxPlayers"), "16");
		assert.equal(tag(cfg({ maxPlayers: 500 }), "MaxPlayers"), "64");
		assert.equal(tag(cfg({ maxPlayers: 1 }), "MaxPlayers"), "2");
		assert.equal(tag(cfg(), "RemoteApiEnabled"), "false");
	});

	it("leaves the ports to the launch line", () => {
		const text = cfg();
		assert.equal(tag(text, "ServerPort"), undefined);
		assert.equal(tag(text, "SteamPort"), undefined);
		assert.equal(tag(text, "IP"), undefined);
	});

	it("takes the server name from the form, and the world name from it without characters a folder cannot have", () => {
		assert.equal(tag(cfg({ sessionName: "  The  Hub  " }), "ServerName"), "The Hub");
		assert.equal(tag(cfg({ sessionName: undefined }), "ServerName"), "Test Space");
		assert.equal(tag(cfg({ sessionName: "   " }), "ServerName"), "Test Space");
		assert.equal(tag(cfg({ sessionName: 'A/B:C*D?"E<F>G|H\\I' }), "WorldName"), "ABCDEFGHI");
		assert.equal(tag(cfg({ sessionName: "Base 2.0" }), "WorldName"), "Base 2.0");
	});

	it("escapes the characters XML acts on, so a name cannot break or extend the file", () => {
		const text = cfg({ sessionName: 'Tom & <Jerry> "x" </ServerName><LoadWorld>C:\\evil</LoadWorld>' });
		assert.equal(tag(text, "LoadWorld"), undefined);
		assert.equal((text.match(/<ServerName>/g) ?? []).length, 1);
		assert.match(tag(text, "ServerName"), /^Tom &amp; &lt;Jerry&gt; &quot;x&quot; /);
		assert.doesNotMatch(tag(text, "ServerName"), /[<>"]/);
		assert.doesNotMatch(tag(text, "WorldName"), /[<>"\\/]/);
	});

	it("strips line breaks and other control characters from names", () => {
		const text = cfg({ sessionName: "Line\r\nTwo\u0000\u0007" });
		assert.equal(tag(text, "ServerName"), "Line Two");
		assert.equal(serverName("a\tb"), "a b");
	});

	it("falls back when nothing usable is left, and avoids names Windows reserves", () => {
		assert.equal(worldFolderName("???"), "Space Engineers World");
		assert.equal(worldFolderName(""), "Space Engineers World");
		assert.equal(worldFolderName("con"), "con World");
		assert.equal(worldFolderName("Base..."), "Base");
		assert.equal(worldFolderName("x".repeat(200)).length, 60);
		assert.equal(serverName("x".repeat(500)).length, 100);
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
		assert.equal(startLine(params()), 'start /MIN "Test Space" SpaceEngineersDedicated.exe -console -path "%~dp0Data" -port 27116');
	});

	it("never starts without -console or -noconsole, which would open the setup window", () => {
		assert.match(startLine(params()), / -console /);
		assert.doesNotMatch(script, /-noconsole/);
	});

	it("never passes -ignorelastsession, which would start a new world on every start", () => {
		assert.doesNotMatch(script, /ignorelastsession/i);
	});

	it("leaves the player limit to the config file; -maxPlayers is only there if a person adds it", () => {
		assert.doesNotMatch(script, /maxplayers/i);
		assert.doesNotMatch(t.buildStartScript(params({ maxPlayers: 40 })), /maxplayers/i);
	});

	it("keeps characters cmd acts on out of the window title, and never puts the server's name in the script", () => {
		const nasty = t.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>' }));
		const start = nasty.split("\r\n").find((l) => l.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(start);
		assert.ok(title, start);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.equal(nasty.split("\r\n").filter((l) => l.includes("calc")).length, 1);
		assert.match(startLine(params({ name: '"&%' })), /^start \/MIN "Space Engineers" /);
		// Quotes: the title and the data folder, in pairs.
		assert.equal((start.match(/"/g) ?? []).length, 4);
		assert.doesNotMatch(t.buildStartScript(params({ sessionName: 'Evil" & calc' })), /calc/);
	});

	it("can be read back by the panel's direct-launch reader", { skip: !onWindows }, () => {
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

	it("shows the server's name as its session, and has no settings file the panel edits, no remote console and no password", () => {
		assert.equal(entry.sessionName, "Friends Station");
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

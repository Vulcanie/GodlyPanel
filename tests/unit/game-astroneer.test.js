import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import astroneer, { ownerGuid, ownerName, joinPassword, publicIp, serverName, SETTINGS_SECTION } from "../../src/server/data/games/astroneer.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";

// Reads real .bat files and real Windows paths, so it only runs on Windows.
const onWindows = process.platform === "win32";

// Astroneer, as the research dossier describes it: one UDP game port, no documented command-line argument, the settings in
// AstroServerSettings.ini and the port in Engine.ini, both written before the first start.

const { template: t, backup, logs, launchOptions } = astroneer;

const params = (extra = {}) => ({
	name: "Test Astroneer",
	sessionName: "My Astro Base",
	serverPassword: "join-1234",
	ownerName: "Astro Owner",
	ownerGuid: "76561198000000000",
	publicIp: "203.0.113.5",
	port: 8787,
	instanceSlug: "test-astroneer",
	installDir: "C:\\Servers\\astroneer",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	startScriptFilename: "Start_Astroneer.bat",
	...extra,
});

const parseLines = (content) => {
	const lines = content.split("\r\n").filter(Boolean);
	const values = Object.fromEntries(lines.slice(1).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
	return { section: lines[0], values, keys: lines.slice(1).map((l) => l.slice(0, l.indexOf("="))) };
};
const iniOf = (p) => parseLines(t.buildConfigFile(p).content);

describe("Astroneer template", () => {
	it("is the Astroneer server app, run as a plain process", () => {
		assert.equal(t.id, "astroneer");
		assert.equal(t.type, "astroneer");
		assert.equal(t.displayName, "Astroneer");
		assert.equal(t.updateAppId, "728470");
		assert.equal(t.method, "process");
		assert.equal(t.sharedInstall, false);
		assert.equal(t.buildServerEntry(params()).rconPort, undefined);
	});

	it("asks for a name, a join password, the owner and the public IP", () => {
		assert.deepEqual(t.fields, ["sessionName", "serverPassword", "ownerName", "ownerGuid", "publicIp"]);
		for (const f of t.fields) assert.ok(t.fieldMeta[f]?.label, f);
		assert.ok(!t.fields.includes("rconPassword") && !t.fields.includes("adminPassword") && !t.fields.includes("mods"));
	});

	it("has one game port that is free of the other templates' defaults", async () => {
		assert.deepEqual(t.ports.map((p) => p.key), ["port"]);
		const { GAME_TEMPLATES } = await import("../../src/server/data/gameTemplates.js");
		const taken = new Set(GAME_TEMPLATES.filter((x) => x.id !== "astroneer").flatMap((x) => x.ports.map((p) => p.default)));
		// The new games not yet registered: css 27515, svencoop 27355, hl2dm 27435, avorion 27000.
		for (const extra of [27515, 27355, 27435, 27000, 27001]) taken.add(extra);
		assert.ok(!taken.has(t.ports[0].default), `default ${t.ports[0].default} is another template's`);
		assert.ok(!taken.has(t.ports[0].default + 1), "the port after the game port is kept free");
		assert.equal(t.ports[0].default, 8787);
	});
});

describe("Astroneer start script", () => {
	const script = t.buildStartScript(params());
	const lines = script.split("\r\n");

	it("is a CRLF .bat that changes to its own folder first", () => {
		assert.equal(t.buildStartScriptFilename(), "Start_Astroneer.bat");
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});

	it("starts the shipping program with no argument", () => {
		const start = lines.filter((l) => l.startsWith("start "));
		assert.equal(start.length, 1, script);
		assert.equal(start[0], 'start /MIN "Test Astroneer" "Astro\\Binaries\\Win64\\AstroServer-Win64-Shipping.exe"');
	});

	it("keeps passwords and every setting out of the script", () => {
		assert.ok(!script.includes("join-1234"));
		assert.ok(!script.includes("76561198000000000"));
		assert.ok(!script.includes("203.0.113.5"));
		assert.ok(!script.includes("8787"));
	});

	it("never lets a character cmd acts on, or a quote, into the title", () => {
		for (const nasty of ['a" & calc & "b', "100%PATH%", "x | y > z", "a^b<c>d!", "line\tbreak"]) {
			const s = t.buildStartScript(params({ name: nasty }));
			const start = s.split("\r\n").find((l) => l.startsWith("start "));
			assert.match(start, /^start \/MIN "[^"%&|<>^!\u0000-\u001f]*" "Astro\\Binaries\\Win64\\AstroServer-Win64-Shipping\.exe"$/, JSON.stringify(nasty));
		}
		const empty = t.buildStartScript(params({ name: '"%&' })).split("\r\n").find((l) => l.startsWith("start "));
		assert.ok(empty.startsWith('start /MIN "Astroneer" '), empty);
	});

	it("can be read back by the panel's direct-launch reader", { skip: !onWindows }, () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "astroneer-launch-"));
		try {
			const exe = path.join(dir, "Astro", "Binaries", "Win64", "AstroServer-Win64-Shipping.exe");
			fs.mkdirSync(path.dirname(exe), { recursive: true });
			fs.writeFileSync(exe, "");
			fs.writeFileSync(path.join(dir, "Start_Astroneer.bat"), script);
			const found = deriveLaunch(path.join(dir, "Start_Astroneer.bat"), { workingDir: dir });
			assert.equal(found.ok, true, found.reason);
			assert.equal(path.resolve(found.launch.exe).toLowerCase(), path.resolve(exe).toLowerCase());
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("Astroneer settings file", () => {
	it("goes where the game reads it, inside the install, before the first start", () => {
		assert.equal(t.buildConfigFile(params()).relPath, "Astro\\Saved\\Config\\WindowsServer\\AstroServerSettings.ini");
	});

	it("has the official section and the twenty keys of the file the game makes, plus the owner entry", () => {
		const { section, keys } = iniOf(params());
		assert.equal(section, `[${SETTINGS_SECTION}]`);
		assert.equal(SETTINGS_SECTION, "/Script/Astro.AstroServerSettings");
		assert.deepEqual(keys, [
			"bLoadAutoSave", "MaxServerFramerate", "MaxServerIdleFramerate", "bWaitForPlayersBeforeShutdown", "ConsolePassword", "PublicIP",
			"ServerName", "ServerGuid", "OwnerName", "OwnerGuid", "PlayerActivityTimeout", "ServerPassword", "bDisableServerTravel",
			"DenyUnlistedPlayers", "VerbosePlayerProperties", "AutoSaveGameInterval", "BackupSaveGamesInterval", "ActiveSaveFileDescriptiveName",
			"ShareCode", "ServerAdvertisedName", "PlayerProperties",
		]);
	});

	it("fills in the server's details and keeps the listed defaults for the rest", () => {
		const { values } = iniOf(params());
		assert.equal(values.ServerName, "My Astro Base");
		assert.equal(values.ServerPassword, "join-1234");
		assert.equal(values.OwnerName, "Astro Owner");
		assert.equal(values.OwnerGuid, "76561198000000000");
		assert.equal(values.PublicIP, "203.0.113.5");
		assert.equal(values.AutoSaveGameInterval, "900");
		assert.equal(values.BackupSaveGamesInterval, "7200");
		assert.equal(values.MaxServerFramerate, "30");
		assert.equal(values.MaxServerIdleFramerate, "3.000000");
		assert.equal(values.PlayerActivityTimeout, "0");
		assert.equal(values.DenyUnlistedPlayers, "false");
		assert.equal(values.ActiveSaveFileDescriptiveName, "SAVE_1");
		assert.equal(values.ConsolePassword, "");
	});

	it("makes the owner the admin the way the hosting egg does", () => {
		const { values } = iniOf(params());
		assert.equal(values.PlayerProperties, '(PlayerFirstJoinName="Astro Owner",PlayerCategory=Admin,PlayerGuid="76561198000000000",PlayerRecentJoinName="")');
	});

	it("writes no owner entry without a real SteamID64 or a name, and uses 0 for the owner id", () => {
		for (const extra of [{ ownerGuid: "" }, { ownerGuid: "0" }, { ownerGuid: "abc" }, { ownerGuid: "123" }, { ownerName: "" }]) {
			const { values, keys } = iniOf(params(extra));
			assert.ok(!keys.includes("PlayerProperties"), JSON.stringify(extra));
			if ("ownerGuid" in extra) assert.equal(values.OwnerGuid, "0");
		}
	});

	it("leaves the join password empty for an open server", () => {
		assert.equal(iniOf(params({ serverPassword: "" })).values.ServerPassword, "");
	});

	it("falls back to the server's name when no session name is given, and cuts it at 60 characters", () => {
		assert.equal(iniOf(params({ sessionName: "" })).values.ServerName, "Test Astroneer");
		assert.equal(iniOf(params({ sessionName: "x".repeat(100) })).values.ServerName.length, 60);
		assert.equal(serverName("", ""), "Astroneer Server");
	});

	it("is one value per line even for odd input", () => {
		const out = t.buildConfigFile(params({ sessionName: "x\ty\r\nInjected=1", ownerName: 'Bob" ,Evil="1', serverPassword: "a b;=c!" })).content;
		const lines = out.split("\r\n").filter(Boolean);
		assert.equal(lines.length, 22);
		assert.ok(!lines.some((l) => l.startsWith("Injected")));
		const { values } = parseLines(out);
		assert.equal(values.ServerPassword, "abc");
		assert.ok(!values.OwnerName.includes('"'));
		assert.equal((values.PlayerProperties.match(/"/g) ?? []).length, 6);
	});

	it("cleans each value as the game and the hosting egg allow", () => {
		assert.equal(joinPassword("ab c_d-e!;="), "abc_d-e");
		assert.equal(joinPassword("x".repeat(150)).length, 100);
		assert.equal(ownerGuid("76561198000000000"), "76561198000000000");
		assert.equal(ownerGuid(" 76561198000000000 "), "76561198000000000");
		assert.equal(ownerGuid("7656119800000000"), "0");
		assert.equal(ownerName('  "Bob"  '), "Bob");
		assert.equal(publicIp("203.0.113.5:8787"), "203.0.113.5");
		assert.equal(publicIp(" my.host.example "), "my.host.example");
		assert.equal(publicIp("1.2.3.4\r\nX=1"), "1.2.3.4X1");
	});
});

describe("Astroneer Engine.ini", () => {
	const files = t.buildExtraFiles(params());

	it("sits beside the settings file and holds the game port", () => {
		assert.equal(files.length, 1);
		assert.equal(files[0].relPath, "Astro\\Saved\\Config\\WindowsServer\\Engine.ini");
		assert.equal(files[0].content, "[URL]\r\nPort=8787\r\n");
	});

	it("follows the port that was chosen", () => {
		assert.ok(t.buildExtraFiles(params({ port: 9100 }))[0].content.includes("Port=9100"));
	});

	it("does not force encryption off, because a Windows server does not need it", () => {
		assert.ok(!/AllowEncryption/i.test(files[0].content));
	});
});

describe("Astroneer server entry", () => {
	const p = params();
	const entry = t.buildServerEntry(p);

	it("records the program that stays running, the port and the files", () => {
		assert.equal(entry.type, "astroneer");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "AstroServer-Win64-Shipping.exe");
		assert.equal(entry.port, 8787);
		assert.equal(entry.updateAppId, "728470");
		assert.equal(entry.startScriptPath, "C:\\Servers\\astroneer\\Start_Astroneer.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\astroneer");
		assert.equal(entry.installDir, "C:\\Servers\\astroneer\\");
		assert.equal(entry.steamCmdPath, "C:\\steamcmd\\steamcmd.exe");
		assert.equal(entry.name, "Test Astroneer");
		assert.equal(entry.sessionName, "My Astro Base");
		assert.equal(entry.configPaths["AstroServerSettings.ini"], "C:\\Servers\\astroneer\\Astro\\Saved\\Config\\WindowsServer\\AstroServerSettings.ini");
		assert.equal(entry.configPaths["Engine.ini"], "C:\\Servers\\astroneer\\Astro\\Saved\\Config\\WindowsServer\\Engine.ini");
		assert.equal(entry.configPath, entry.configPaths["AstroServerSettings.ini"]);
	});

	it("matches the files the creation flow writes", () => {
		assert.ok(entry.configPaths["AstroServerSettings.ini"].endsWith(t.buildConfigFile(p).relPath));
		assert.ok(entry.configPaths["Engine.ini"].endsWith(t.buildExtraFiles(p)[0].relPath));
		const start = t.buildStartScript(p).split("\r\n").find((l) => l.startsWith("start "));
		assert.ok(start.includes(entry.processName));
	});

	it("keeps passwords out of the entry and has no remote console", () => {
		assert.equal(entry.serverPassword, undefined);
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.ok(!JSON.stringify(entry).includes("join-1234"));
	});
});

describe("Astroneer backups, logs and launch options", () => {
	it("backs up the worlds and settings, inside the server's folder", () => {
		const rels = backup.paths.map((x) => x.rel);
		assert.ok(rels.includes("Astro/Saved/SaveGames"));
		assert.ok(rels.includes("Astro/Saved/Config/WindowsServer"));
		for (const x of backup.paths) {
			assert.equal(x.base, "working");
			assert.ok(x.label);
			assert.ok(!/^[a-z]:|^\.\.|^\//i.test(x.rel), x.rel);
		}
	});

	it("names no log, because no page of the dossier does", () => {
		assert.deepEqual(logs, []);
	});

	it("has no launch options form, because the program takes no documented argument", () => {
		assert.equal(launchOptions, false);
	});
});

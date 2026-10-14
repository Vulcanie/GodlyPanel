import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/starrupture.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// StarRupture, from the research dossier and a real SteamCMD install of server app 3809400 (build 25642172).

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Star Server",
	sessionName: "Friends World",
	serverPassword: "ignored",
	port: 7780,
	installDir: "C:\\Servers\\star",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-star-server",
	startScriptFilename: "Start_StarRupture.bat",
	...extra,
});

describe("StarRupture module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "starrupture");
		assert.equal(template.type, "starrupture");
		assert.equal(template.displayName, "StarRupture");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "3809400");
		assert.equal(template.storeAppId, "1631270");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a world name only: no join password it cannot set, no mods, no max players", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
		assert.ok(!template.fields.includes("mods"));
		assert.ok(!template.fields.includes("serverPassword"));
	});

	it("has one UDP game port that does not clash with another game's default or the port beside it", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const port = template.ports[0].default;
		assert.ok(![7777, 7015, 8888, 27015, 27016].includes(port));
		for (const i of implicitPortsOf(template)) assert.notEqual(port + i.offset, port);
		assert.match(template.ports[0].label, /UDP/);
	});
});

describe("StarRupture start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts the launcher with the official arguments", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		const launch = lines.find((l) => l.startsWith("start "));
		assert.match(launch, /^start \/MIN "My Star Server" StarRuptureServerEOS\.exe -Log -Port=7780 /);
		assert.match(launch, /-RCWebControlDisable/);
		assert.match(launch, /-RCWebInterfaceDisable/);
	});

	it("puts the world name in the settings file only, not on the command line", () => {
		assert.ok(!script.includes("Friends World"));
	});

	it("has the same port as the server entry", () => {
		const entry = template.buildServerEntry({ ...params(), ...{ startScriptFilename: "Start_StarRupture.bat" } });
		assert.equal(Number(/-Port=(\d+)/.exec(script)[1]), entry.port);
	});

	it("keeps characters cmd would act on out of the window title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>' }));
		const launch = bad.split("\r\n").find((l) => l.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(launch);
		assert.ok(title, launch);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.equal(bad.split("\r\n").filter((l) => l.includes("calc")).length, 1);
	});

	it("falls back to a plain title for a name that is nothing but such characters", () => {
		const launch = template.buildStartScript(params({ name: '"&%' })).split("\r\n").find((l) => l.startsWith("start "));
		assert.match(launch, /^start \/MIN "StarRupture" /);
	});
});

describe("StarRupture DSSettings.txt", () => {
	const build = (extra) => template.buildConfigFile(params(extra));

	it("is written next to the launcher, in the folder root", () => {
		assert.equal(build().relPath, "DSSettings.txt");
	});

	it("is JSON with exactly the five keys, every value a string, set to create the world on first start", () => {
		const parsed = JSON.parse(build().content);
		assert.deepEqual(Object.keys(parsed), ["SessionName", "SaveGameInterval", "StartNewGame", "LoadSavedGame", "SaveGameName"]);
		for (const v of Object.values(parsed)) assert.equal(typeof v, "string");
		assert.deepEqual(parsed, { SessionName: "Friends World", SaveGameInterval: "300", StartNewGame: "true", LoadSavedGame: "false", SaveGameName: "AutoSave0.sav" });
	});

	it("starts with no byte-order mark", () => {
		assert.notEqual(build().content.charCodeAt(0), 0xfeff);
	});

	it("keeps the world name usable as a folder name", () => {
		const name = (s) => JSON.parse(build({ sessionName: s }).content).SessionName;
		assert.equal(name('A<b>:c"d/e\\f|g?h*i'), "Abcdefghi");
		assert.equal(name("x".repeat(60)).length, 20);
		assert.equal(name("  World.  "), "World");
		assert.equal(name(""), "StarRuptureServer");
		assert.equal(name(undefined), "StarRuptureServer");
		assert.equal(name('"*'), "StarRuptureServer");
	});

	it("escapes whatever is left through JSON, so a quote or backslash cannot break the file", () => {
		assert.doesNotThrow(() => JSON.parse(build({ sessionName: "it's a {world} , ok" }).content));
		assert.equal(JSON.parse(build({ sessionName: "it's a {world} , ok" }).content).SessionName, "it's a {world} , ok");
	});

	it("contains no password", () => {
		assert.ok(!build({ serverPassword: "hunter22" }).content.includes("hunter22"));
	});
});

describe("StarRupture server entry", () => {
	const entry = template.buildServerEntry(params());

	it("has the fields the panel needs", () => {
		assert.equal(entry.name, "My Star Server");
		assert.equal(entry.type, "starrupture");
		assert.equal(entry.method, "process");
		assert.equal(entry.port, 7780);
		assert.equal(entry.startScriptPath, "C:\\Servers\\star\\Start_StarRupture.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\star");
		assert.equal(entry.installDir, "C:\\Servers\\star\\");
		assert.equal(entry.updateAppId, "3809400");
		assert.equal(entry.steamCmdPath, "C:\\steamcmd\\steamcmd.exe");
		assert.equal(entry.autoUpdate, false);
	});

	it("tracks the process that stays running: the real server, not the launcher", () => {
		assert.equal(entry.processName, "StarRuptureServerEOS-Win64-Shipping.exe");
	});

	it("points the Settings tab at DSSettings.txt", () => {
		assert.equal(entry.configPath, "C:\\Servers\\star\\DSSettings.txt");
		assert.deepEqual(entry.configPaths, { "DSSettings.txt": "C:\\Servers\\star\\DSSettings.txt" });
	});

	it("does not record a password, an RCON port or a query port (the vanilla server has none)", () => {
		assert.equal(entry.serverPassword, undefined);
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});
});

describe("StarRupture backup and logs", () => {
	it("backs up the saved worlds, the settings file and the password files", () => {
		const rels = backup.paths.map((p) => p.rel);
		assert.ok(rels.includes("StarRupture/Saved/SaveGames"));
		assert.ok(rels.includes("DSSettings.txt"));
		assert.ok(rels.includes("Password.json"));
		assert.ok(rels.includes("PlayerPassword.json"));
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("reads the game log folder", () => {
		assert.deepEqual(logs, [{ kind: "dir", base: "working", rel: "StarRupture/Saved/Logs", label: "Game log" }]);
	});
});

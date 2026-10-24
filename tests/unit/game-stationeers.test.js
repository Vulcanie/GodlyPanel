import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/stationeers.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Stationeers (dossier: docs/research/games/stationeers/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Stationeers",
	sessionName: "Friends Station",
	mapCode: "Mars2",
	serverPassword: "",
	port: 27816,
	queryPort: 27818,
	installDir: "C:\Servers\st",
	steamCmdExe: "C:\steamcmd\steamcmd.exe",
	instanceSlug: "my-st",
	startScriptFilename: "Start_Stationeers.bat",
	...extra,
});

describe("Stationeers module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "stationeers");
		assert.equal(template.type, "stationeers");
		assert.equal(template.displayName, "Stationeers");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (600760) into the folder root", () => {
		assert.equal(template.updateAppId, "600760");
		assert.equal(template.storeAppId, undefined, "the game's store app id is not in the dossier");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a world type and an optional password, and no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "mapCode", "serverPassword"]);
		assert.ok(!template.fields.includes("mods"));
	});

	it("has a game port 27816 and a Steam port two above it, clear of the other templates", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const [game, steam] = template.ports.map((p) => p.default);
		assert.equal(game, 27816);
		assert.equal(steam, 27818);
		assert.ok(steam >= game + 2, "the second port must leave the companion port (game + 1) free");
		for (const other of GAME_TEMPLATES) {
			if (other.id === template.id) continue;
			for (const p of other.ports ?? []) {
				for (const base of [game, steam]) {
					for (let o = -2; o <= 2; o++) assert.notEqual(p.default, base + o, `${other.id} uses ${base + o}`);
				}
			}
		}
	});
});

describe("Stationeers start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts the dedicated server program", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Stationeers" rocketstation_DedicatedServer\.exe -batchmode -nographics -logfile "%~dp0server\.log" -LOAD Panel Mars2 -settings /);
	});

	it("passes the name, the ports and the visibility through -settings pairs", () => {
		assert.match(launch, /ServerName "Friends Station"/);
		assert.match(launch, / GamePort 27816 UpdatePort 27818/);
		assert.match(launch, / ServerVisible true /);
		assert.match(launch, / StartLocalHost true/);
	});

	it("writes the password only when one was given, as ServerPassword", () => {
		assert.doesNotMatch(launch, /ServerPassword/);
		const withPw = template.buildStartScript(params({ serverPassword: "hunter2" }));
		assert.match(withPw, / ServerPassword hunter2\r\n/);
	});

	it("keeps the ports in the script equal to the entry's ports", () => {
		const entry = template.buildServerEntry(params());
		assert.match(launch, new RegExp(`GamePort ${entry.port} UpdatePort ${entry.queryPort}`));
	});

	it("refuses an unknown world type, and a password with spaces or quotes", () => {
		assert.throws(() => template.buildStartScript(params({ mapCode: "Mars & calc" })));
		assert.throws(() => template.buildStartScript(params({ mapCode: "Mars" })));
		assert.match(template.buildStartScript(params({ mapCode: "europa3" })), /-LOAD Panel Europa3 /);
		assert.throws(() => template.buildStartScript(params({ serverPassword: 'two words' })));
		assert.throws(() => template.buildStartScript(params({ serverPassword: 'a"b' })));
	});

	it("never lets a quote, percent or ampersand from the name into the script", () => {
		const bad = template.buildStartScript(params({ sessionName: 'Evil" & calc %PATH%' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const name = /ServerName "([^"]*)"/.exec(l);
		assert.ok(name, l);
		assert.doesNotMatch(name[1], /["&|%^<>!]/);
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.doesNotMatch(title[1], /["&|%^<>!]/);
	});
});

describe("Stationeers config file", () => {
	it("is not written by the panel: its folder is not evidenced, the settings go on the launch line", () => {
		assert.equal(template.buildConfigFile, undefined);
	});
});

describe("Stationeers server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the program the panel watches and records both ports", () => {
		assert.equal(entry.type, "stationeers");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "rocketstation_DedicatedServer.exe");
		assert.equal(entry.port, 27816);
		assert.equal(entry.queryPort, 27818);
		assert.equal(entry.updateAppId, "600760");
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Stationeers backup and logs", () => {
	it("backs up the saves folder and setting.xml, both in the server folder", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["saves", "setting.xml"]);
	});

	it("shows server.log, which -logfile writes in the server folder", () => {
		assert.deepEqual(logs.map((l) => l.rel), ["server.log"]);
	});
});

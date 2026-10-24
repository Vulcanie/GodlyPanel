import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/acc.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Assetto Corsa Competizione (dossier: docs/research/games/acc/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My ACC",
	sessionName: "Friends GT3",
	port: 28110,
	installDir: "C:\Servers\acc",
	steamCmdExe: "C:\steamcmd\steamcmd.exe",
	instanceSlug: "my-acc",
	startScriptFilename: "Start_ACC.bat",
	...extra,
});

describe("ACC module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "acc");
		assert.equal(template.type, "acc");
		assert.equal(template.displayName, "Assetto Corsa Competizione");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server tool (1430110) into the folder root, and names the game app for the store", () => {
		assert.equal(template.updateAppId, "1430110");
		assert.equal(template.storeAppId, "805550");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for no create-form fields: the server name and passwords are in a UTF-16 file the panel cannot write", () => {
		assert.deepEqual(template.fields, []);
	});

	it("declares one port in the 28xxx range that no other template or neighbour uses", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const [gamePort] = template.ports.map((p) => p.default);
		assert.equal(gamePort, 28110);
		for (const other of GAME_TEMPLATES) {
			if (other.id === template.id) continue;
			for (const p of other.ports ?? []) {
				for (let o = -2; o <= 2; o++) assert.notEqual(p.default, gamePort + o, `${other.id} uses ${gamePort + o}`);
			}
		}
	});
});

describe("ACC start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to the server folder and starts accServer.exe with no arguments", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0server"');
		assert.equal(launch, 'start /MIN "My ACC" accServer.exe');
	});

	it("never lets a quote, percent, ampersand or pipe from the name into the title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH%' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});
});

describe("ACC config and server entry", () => {
	it("writes no config file: settings.json is UTF-16, which the panel cannot write", () => {
		assert.equal(template.buildConfigFile, undefined);
	});

	it("names the program the panel watches and records the port", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(entry.type, "acc");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "accServer.exe");
		assert.equal(entry.port, 28110);
		assert.equal(entry.updateAppId, "1430110");
		assert.equal(entry.autoUpdate, false);
		assert.equal(entry.configPath, undefined);
	});
});

describe("ACC backup and logs", () => {
	it("keeps the cfg folder of the server", () => {
		assert.deepEqual(backup, { paths: [{ base: "working", rel: "server/cfg", label: "Server settings (cfg folder)" }] });
	});

	it("reads no log: no log location is evidenced for this server", () => {
		assert.deepEqual(logs, []);
	});
});

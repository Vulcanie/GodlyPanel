import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/wreckfest.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Wreckfest (dossier: docs/research/games/wreckfest/, confidence medium). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Wreckfest",
	port: 33540,
	installDir: "C:\\Servers\\wf",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-wf",
	startScriptFilename: "Start_Wreckfest.bat",
	...extra,
});

describe("Wreckfest module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "wreckfest");
		assert.equal(template.type, "wreckfest");
		assert.equal(template.displayName, "Wreckfest");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (361580) into the folder root", () => {
		assert.equal(template.updateAppId, "361580");
		assert.equal(template.storeAppId, "228380");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for nothing in the create form: no name, password or mod field is evidenced", () => {
		assert.deepEqual(template.fields, []);
	});

	it("declares the game, query and Steam ports, and no other template uses them or a neighbour", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort", "steamPort"]);
		assert.deepEqual(template.ports.map((p) => p.default), [33540, 33542, 33544]);
		for (const mine of template.ports) {
			for (const other of GAME_TEMPLATES) {
				if (other.id === template.id) continue;
				for (const p of other.ports ?? []) {
					for (let o = -2; o <= 2; o++) assert.notEqual(p.default, mine.default + o, `${other.id} uses ${mine.default + o}`);
				}
			}
		}
	});
});

describe("Wreckfest start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder, makes the settings file if it is missing, then starts the server program", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(lines[2], 'if not exist "server_config.cfg" if exist "initial_server_config.cfg" copy /Y "initial_server_config.cfg" "server_config.cfg" >nul');
		assert.equal(launch, 'start /MIN "My Wreckfest" Wreckfest_x64.exe -s server_config=server_config.cfg -server_set game_port=33540 query_port=33542 steam_port=33544');
	});

	it("never lets a quote, percent, ampersand or pipe from the name into the title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc %PATH% | x' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>!]/);
	});

	it("passes the three ports with -server_set, so they override the config file", () => {
		const custom = template.buildStartScript(params({ port: 8071, queryPort: 8075, steamPort: 8080 })).split("\r\n").find((l) => l.startsWith("start "));
		assert.match(custom, /-server_set game_port=8071 query_port=8075 steam_port=8080$/);
	});
});

describe("Wreckfest config file", () => {
	it("is not written by the panel: the game makes it from its initial file, and the panel adds no settings", () => {
		assert.equal(template.buildConfigFile, undefined);
	});
});

describe("Wreckfest server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program the panel watches and records the config file and port", () => {
		assert.equal(entry.type, "wreckfest");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "Wreckfest_x64.exe");
		assert.equal(entry.port, 33540);
		assert.equal(entry.configPath, "C:\\Servers\\wf\\server_config.cfg");
		assert.equal(entry.configPaths["server_config.cfg"], "C:\\Servers\\wf\\server_config.cfg");
		assert.equal(entry.updateAppId, "361580");
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Wreckfest backup and logs", () => {
	it("keeps the settings file and the savestemp folder", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["server_config.cfg", "savestemp"]);
	});

	it("shows log.txt from the install folder", () => {
		assert.deepEqual(logs.map((l) => l.rel), ["log.txt"]);
	});
});

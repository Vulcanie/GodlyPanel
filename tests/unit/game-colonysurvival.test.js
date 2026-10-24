import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/colonysurvival.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Colony Survival, from the research dossier (docs/research/games/colonysurvival). Nothing here runs the server.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Colony",
	sessionName: "Friends Colony",
	serverPassword: "",
	port: 25936,
	installDir: "C:\\Servers\\colony",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-colony",
	startScriptFilename: "Start_ColonySurvival.bat",
	...extra,
});

describe("Colony Survival module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "colonysurvival");
		assert.equal(template.type, "colonysurvival");
		assert.equal(template.displayName, "Colony Survival");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "748090");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name and a join password, with no mods or player field", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword"]);
		assert.ok(!template.fields.includes("mods"));
	});

	it("has one game port that no other template uses, and the port beside it is free", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const port = template.ports[0].default;
		assert.equal(port, 25936);
		for (const other of GAME_TEMPLATES) {
			if (other.id === template.id) continue;
			for (const p of other.ports ?? []) {
				assert.notEqual(p.default, port, `${other.id} uses ${port}`);
				assert.notEqual(p.default, port + 1, `${other.id} uses ${port + 1}`);
			}
		}
		// The ports the panel holds beside the game port (its companion-port rule) must not be a default of another template either.
		for (const i of implicitPortsOf(template)) {
			for (const other of GAME_TEMPLATES) {
				if (other.id === template.id) continue;
				for (const p of other.ports ?? []) assert.notEqual(p.default, port + i.offset, `${other.id} uses ${port + i.offset}`);
			}
		}
	});
});

describe("Colony Survival start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts the server in batch mode with its config file", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		const launch = lines.find((l) => l.startsWith("start "));
		assert.match(launch, /^start \/MIN "My Colony" colonyserver\.exe -batchmode -nographics \+server\.config "%~dp0server\.config\.json"$/);
	});

	it("keeps the name and password off the command line", () => {
		assert.ok(!script.includes("Friends Colony"));
		assert.ok(!script.includes("secret"));
	});

	it("strips characters cmd would act on from the window title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>' }));
		const launch = bad.split("\r\n").find((l) => l.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(launch);
		assert.ok(title, launch);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});
});

describe("Colony Survival server.config.json as the panel writes it", () => {
	const { relPath, content } = template.buildConfigFile(params({ serverPassword: 'pa"ss' }));
	const json = JSON.parse(content);

	it("is written at the server root under the name the game reads", () => {
		assert.equal(relPath, "server.config.json");
	});

	it("holds the name, the port and the password it was given, with the port matching the script", () => {
		assert.equal(json.ServerSettings.ServerName, "Friends Colony");
		assert.equal(json.ServerSettings.ServerGamePort, 25936);
		assert.equal(json.ServerSettings.ServerPassword, 'pa"ss');
		assert.equal(json.ServerSettings.RCONPassword, "");
		assert.equal(json.ServerSettings.NetworkType, "SteamOnline");
		assert.equal(json.ServerSettings.MaxPlayerCount, 10);
	});

	it("refuses a name with a line break", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: "a\nb" })));
	});
});

describe("Colony Survival server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the process that stays running and the config file the panel tracks", () => {
		assert.equal(entry.type, "colonysurvival");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "colonyserver.exe");
		assert.equal(entry.port, 25936);
		assert.equal(entry.configPath, "C:\\Servers\\colony\\server.config.json");
		assert.deepEqual(Object.keys(entry.configPaths), ["server.config.json"]);
		assert.equal(entry.updateAppId, "748090");
	});
});

describe("Colony Survival backup and logs", () => {
	it("keeps the settings, the saved worlds and the mods added by hand", () => {
		const rels = backup.paths.map((p) => p.rel);
		assert.ok(rels.includes("server.config.json"));
		assert.ok(rels.includes("gamedata/savegames"));
		assert.ok(rels.includes("gamedata/mods"));
		for (const p of backup.paths) assert.equal(p.base, "working");
	});

	it("shows the server log folder the game writes (seen on a real install)", () => {
		assert.deepEqual(logs, [{ kind: "dir", base: "working", rel: "gamedata/logs/server", label: "Server log" }]);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/redorchestra.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Red Orchestra: Ostfront 41-45 (dossier: docs/research/games/redorchestra/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My RO",
	sessionName: "Friends Server",
	serverPassword: "",
	mapCode: "RO-Konigsplatz.rom",
	port: 7757,
	installDir: "C:\\Servers\\redorchestra",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-ro",
	startScriptFilename: "Start_RO.bat",
	...extra,
});

describe("Red Orchestra module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "redorchestra");
		assert.equal(template.type, "redorchestra");
		assert.equal(template.displayName, "Red Orchestra: Ostfront 41-45");
		assert.equal(template.method, "process");
	});

	it("installs the Windows dedicated server (app 223240) into the folder root; the game is app 1200", () => {
		assert.equal(template.updateAppId, "223240");
		assert.equal(template.storeAppId, "1200");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name, a password and a map, and no mod field", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode"]);
		assert.ok(!template.fields.includes("mods"));
	});

	it("has game port 7757 and no other template uses it or a neighbour", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 7757);
		for (const other of GAME_TEMPLATES) {
			if (other.id === template.id) continue;
			for (const p of other.ports ?? []) {
				for (let o = -2; o <= 2; o++) assert.notEqual(p.default, 7757 + o, `${other.id} uses ${7757 + o}`);
			}
		}
	});
});

describe("Red Orchestra start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts system\\ucc.exe with the map and the game class", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(launch, 'start /MIN "My RO" system\\ucc.exe server RO-Konigsplatz.rom?game=ROEngine.ROTeamGame -log=ServerLog.log');
	});

	it("refuses a map name with spaces, quotes or command characters, and adds .rom when it is left off", () => {
		assert.throws(() => template.buildStartScript(params({ mapCode: "RO-Konigsplatz.rom & x" })), /not a map name/);
		assert.throws(() => template.buildStartScript(params({ mapCode: 'RO"x' })), /not a map name/);
		assert.match(template.buildStartScript(params({ mapCode: "RO-Zhitomir1941" })), /system\\ucc\.exe server RO-Zhitomir1941\.rom\?/);
	});

	it("never lets a command character from the name into the script title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});
});

describe("Red Orchestra settings file and server entry", () => {
	it("writes the port, the name and the password into system\\RedOrchestra.ini, creating it when missing", () => {
		const patch = template.patchInstalledConfig;
		assert.equal(patch.relPath, "system\\RedOrchestra.ini");
		const created = patch.create(params({ sessionName: "Friends Server", serverPassword: "pw1" }));
		assert.match(created, /\[URL\]\r\nPort=7757/);
		assert.match(created, /\[Engine\.GameReplicationInfo\]\r\nServerName=Friends Server/);
		assert.match(created, /\[Engine\.AccessControl\]\r\nGamePassword=pw1/);
	});

	it("changes only those values in an existing file, and not a Port= line in another section", () => {
		const original = ["[IpDrv.MasterServerLink]", "LANPort=11757", "", "[URL]", "Port=7777", "", "[Engine.GameReplicationInfo]", "ServerName=SERVERNAME", "", "[Engine.AccessControl]", "GamePassword=old", "", "[ROInterface.ROMapList]", "Maps=RO-FallenHeroes", ""].join("\r\n");
		const out = template.patchInstalledConfig.apply(original, params({ sessionName: "New Name", serverPassword: "" }));
		assert.equal(out, original.replace("Port=7777", "Port=7757").replace("ServerName=SERVERNAME", "ServerName=New Name").replace("GamePassword=old", "GamePassword="));
	});

	it("refuses a line break in the name", () => {
		assert.throws(() => template.patchInstalledConfig.create(params({ sessionName: "a\nb" })), /line break|control/i);
	});

	it("has an entry with the process the panel watches, the port and the config path", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(entry.type, "redorchestra");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "ucc.exe");
		assert.equal(entry.port, 7757);
		assert.equal(entry.updateAppId, "223240");
		assert.equal(entry.autoUpdate, false);
		assert.equal(entry.configPath, "C:\\Servers\\redorchestra\\system\\RedOrchestra.ini");
		assert.deepEqual(Object.keys(entry.configPaths), ["RedOrchestra.ini"]);
	});
});

describe("Red Orchestra backup and logs", () => {
	it("keeps the settings file (with its map list) and reads the server log the start line writes", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["system/RedOrchestra.ini"]);
		assert.deepEqual(logs.map((l) => l.rel), ["system/ServerLog.log"]);
	});
});

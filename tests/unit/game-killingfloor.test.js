import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/killingfloor.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Killing Floor (2009) (dossier: docs/research/games/killingfloor/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My KF",
	sessionName: "Friends Server",
	serverPassword: "",
	mapCode: "KF-BioticsLab.rom",
	port: 7707,
	installDir: "C:\\Servers\\killingfloor",
	steamCmdExe: "C:\steamcmd\steamcmd.exe",
	instanceSlug: "my-kf",
	startScriptFilename: "Start_KF.bat",
	...extra,
});

describe("Killing Floor module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "killingfloor");
		assert.equal(template.type, "killingfloor");
		assert.equal(template.displayName, "Killing Floor");
		assert.equal(template.method, "process");
	});

	it("installs the Windows dedicated server (app 215350) into the folder root; the game is app 1250", () => {
		assert.equal(template.updateAppId, "215350");
		assert.equal(template.storeAppId, "1250");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name, a password and a map, and no mod field", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode"]);
		assert.ok(!template.fields.includes("mods"));
	});

	it("has game port 7707, with 7708 taken for the game beside it, and no other template uses them", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 7707);
		assert.deepEqual(template.implicitPorts, [{ offset: 1, label: template.implicitPorts[0].label }]);
		for (const other of GAME_TEMPLATES) {
			if (other.id === template.id) continue;
			for (const p of other.ports ?? []) {
				for (let o = -2; o <= 2; o++) assert.notEqual(p.default, 7707 + o, `${other.id} uses ${7707 + o}`);
			}
		}
	});
});

describe("Killing Floor start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts ucc.exe from the System folder with the map and the options", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(launch, 'start /MIN "My KF" /D "%~dp0System" ucc.exe server KF-BioticsLab.rom?game=KFmod.KFGameType?VACSecured=true?MaxPlayers=6 -log=server.log');
	});

	it("refuses a map name with spaces, quotes or command characters, and adds .rom when it is left off", () => {
		assert.throws(() => template.buildStartScript(params({ mapCode: "KF-BioticsLab.rom & x" })), /not a map name/);
		assert.throws(() => template.buildStartScript(params({ mapCode: 'KF"x' })), /not a map name/);
		assert.match(template.buildStartScript(params({ mapCode: "KF-Westlondon" })), /ucc\.exe server KF-Westlondon\.rom\?/);
	});

	it("never lets a command character from the name into the script", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});
});

describe("Killing Floor settings file and server entry", () => {
	it("writes the name, the password and the port into System\KillingFloor.ini, creating it when missing", () => {
		const patch = template.patchInstalledConfig;
		assert.equal(patch.relPath, "System\\KillingFloor.ini");
		const created = patch.create(params({ sessionName: "Friends Server", serverPassword: "pw1" }));
		assert.match(created, /\[URL\]\r\nPort=7707/);
		assert.match(created, /\[Engine\.GameReplicationInfo\]\r\nServerName=Friends Server/);
		assert.match(created, /\[Engine\.AccessControl\]\r\nGamePassword=pw1/);
	});

	it("changes only those values in an existing file and leaves the rest alone", () => {
		const original = ["[URL]", "Port=7777", "", "[Engine.GameReplicationInfo]", "ServerName=Placeholder", "ShortName=KF", "", "[Engine.AccessControl]", "GamePassword=old", "AdminPassword=keep", ""].join("\r\n");
		const out = template.patchInstalledConfig.apply(original, params({ sessionName: "New Name", serverPassword: "" }));
		assert.equal(out, original.replace("Port=7777", "Port=7707").replace("ServerName=Placeholder", "ServerName=New Name").replace("GamePassword=old", "GamePassword="));
	});

	it("refuses a line break in the name or the password", () => {
		assert.throws(() => template.patchInstalledConfig.create(params({ sessionName: "a\nb" })), /cannot hold|line break|control/i);
	});

	it("has an entry with the process the panel watches, the ports and the config path", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(entry.type, "killingfloor");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "ucc.exe");
		assert.equal(entry.port, 7707);
		assert.equal(entry.updateAppId, "215350");
		assert.equal(entry.autoUpdate, false);
		assert.equal(entry.configPath, "C:\\Servers\\killingfloor\\System\\KillingFloor.ini");
		assert.deepEqual(Object.keys(entry.configPaths), ["KillingFloor.ini"]);
	});

	it("keeps the port in the script equal to the entry's port", () => {
		const entry = template.buildServerEntry(params({ port: 7717 }));
		assert.equal(entry.port, 7717);
		assert.equal(template.patchInstalledConfig.create(params({ port: 7717 })).includes("Port=7717"), true);
	});
});

describe("Killing Floor backup and logs", () => {
	it("keeps the settings file and reads the server log the start line writes", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["System/KillingFloor.ini"]);
		assert.deepEqual(logs.map((l) => l.rel), ["System/server.log"]);
	});
});

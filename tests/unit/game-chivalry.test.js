import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/chivalry.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Chivalry: Medieval Warfare (UDK-based dedicated server). Built from the research dossier only, never run on a real install.
// Nothing here starts the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Chivalry Server",
	sessionName: "Friends Server",
	adminPassword: "admin-secret",
	mapCode: "AOCFFA-Arena3_p",
	port: 7000,
	queryPort: 7010,
	installDir: "C:\\Servers\\cmw",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-cmw",
	startScriptFilename: "Start_Chivalry.bat",
	...extra,
});

describe("Chivalry module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "chivalry");
		assert.equal(template.type, "chivalry");
		assert.equal(template.displayName, "Chivalry: Medieval Warfare");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app into the folder root", () => {
		assert.equal(template.updateAppId, "220070");
		assert.equal(template.storeAppId, "219640");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name, an admin password (required by the Unraid template) and a map; no join password, no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "adminPassword", "mapCode"]);
		assert.ok(!template.fields.includes("serverPassword"));
		assert.ok(!template.fields.includes("mods"));
	});

	it("has a game port and a query port that no other template uses, with the port beside the game port held", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const port = template.ports[0].default;
		const query = template.ports[1].default;
		assert.equal(port, 7000);
		assert.equal(query, 7010);
		assert.ok(implicitPortsOf(template).map((i) => i.offset).includes(1));
		for (const other of GAME_TEMPLATES) {
			if (other.id === template.id) continue;
			for (const p of other.ports ?? []) {
				for (const o of [-1, 0, 1]) assert.notEqual(p.default, port + o, `${other.id} uses ${port + o}`);
				for (const o of [-1, 0, 1]) assert.notEqual(p.default, query + o, `${other.id} uses ${query + o}`);
			}
		}
	});
});

describe("Chivalry start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to Binaries\\Win64 and starts UDK.exe with the map, the ports and the two flags the dossier names", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0Binaries\\Win64"');
		assert.equal(
			lines[2],
			'start /MIN "My Chivalry Server" UDK.exe AOCFFA-Arena3_p?steamsockets?port=7000?queryport=7010 -dedicated=true -seekfreeloadingserver',
		);
	});

	it("never puts the admin password on the command line", () => {
		assert.ok(!script.includes("admin-secret"));
	});

	it("uses the map and ports the form gave, and refuses a map name with a space or a quote", () => {
		const custom = template.buildStartScript(params({ mapCode: "aocffa-moor_p", port: 7100, queryPort: 7110 }));
		assert.match(custom, /UDK\.exe aocffa-moor_p\?steamsockets\?port=7100\?queryport=7110 /);
		assert.throws(() => template.buildStartScript(params({ mapCode: "bad map" })), /map/i);
	});

	it("strips characters cmd would act on from the window title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>' }));
		const launch = bad.split("\r\n").find((l) => l.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(launch);
		assert.ok(title, launch);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});
});

describe("Chivalry PCServer-UDKGame.ini as the panel writes it", () => {
	const { relPath, content } = template.buildConfigFile(params());

	it("is written under UDKGame\\Config with the name and the admin password in their sections", () => {
		assert.equal(relPath, "UDKGame\\Config\\PCServer-UDKGame.ini");
		assert.match(content, /\[Engine\.GameReplicationInfo\]\r\nServerName=Friends Server\r\n/);
		assert.match(content, /\[Engine\.AccessControl\]\r\nAdminPassword=admin-secret\r\n/);
	});

	it("refuses a name or password with a line break, a semicolon (a comment mark in the file) or a control character", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: "a\nMaxPlayers=1" })));
		assert.throws(() => template.buildConfigFile(params({ sessionName: "a;b" })));
		assert.throws(() => template.buildConfigFile(params({ adminPassword: "x\r\nAdminPassword=y" })));
		assert.throws(() => template.buildConfigFile(params({ adminPassword: "x;y" })));
	});
});

describe("Chivalry parameters from the create form", () => {
	it("requires an admin password, because the Unraid template says it can't be empty", async () => {
		await assert.rejects(() => template.resolveParams({ sessionName: "x", adminPassword: "" }));
		const ok = await template.resolveParams({ sessionName: "Friends", adminPassword: "pw", mapCode: "" });
		assert.equal(ok.adminPassword, "pw");
		assert.equal(ok.mapCode, "AOCFFA-Arena3_p");
	});
});

describe("Chivalry server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names UDK.exe as the process the panel watches, with the settings file it tracks", () => {
		assert.equal(entry.type, "chivalry");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "UDK.exe");
		assert.equal(entry.port, 7000);
		assert.equal(entry.queryPort, 7010);
		assert.equal(entry.configPath, "C:\\Servers\\cmw\\UDKGame\\Config\\PCServer-UDKGame.ini");
		assert.deepEqual(Object.keys(entry.configPaths), ["PCServer-UDKGame.ini"]);
	});
});

describe("Chivalry backup and logs", () => {
	it("keeps the settings folder and the downloaded mod files", () => {
		const rels = backup.paths.map((p) => p.rel);
		assert.ok(rels.includes("UDKGame/Config"));
		assert.ok(rels.includes("UDKGame/CookedSDK"));
		for (const p of backup.paths) assert.equal(p.base, "working");
	});

	it("has no log folder yet: the dossier does not name the game's own log path", () => {
		assert.deepEqual(logs, []);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/risingstorm2.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Rising Storm 2: Vietnam (dossier: docs/research/games/risingstorm2/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My RS2",
	sessionName: "Friends Server",
	serverPassword: "",
	mapCode: "VNSU-SongBe",
	port: 27070,
	queryPort: 27072,
	installDir: "C:\\Servers\\rs2",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-rs2",
	startScriptFilename: "Start_RS2.bat",
	...extra,
});

describe("Rising Storm 2 module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "risingstorm2");
		assert.equal(template.type, "risingstorm2");
		assert.equal(template.displayName, "Rising Storm 2: Vietnam");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (418480) into the folder root; the store app is 418460", () => {
		assert.equal(template.updateAppId, "418480");
		assert.equal(template.storeAppId, "418460");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name, a join password and a map; no mod field is used (the Workshop path is left out)", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode"]);
		assert.ok(!template.fields.includes("mods"));
	});

	it("has a game port 27070 and a query port 27072 (at least game + 2), and no other template uses them or a neighbour", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const [gamePort, queryPort] = template.ports.map((p) => p.default);
		assert.equal(gamePort, 27070);
		assert.equal(queryPort, 27072);
		assert.ok(queryPort >= gamePort + 2);
		for (const other of GAME_TEMPLATES) {
			if (other.id === template.id) continue;
			for (const p of other.ports ?? []) {
				for (const base of [gamePort, queryPort]) {
					for (let o = -2; o <= 2; o++) assert.notEqual(p.default, base + o, `${other.id} uses ${base + o}`);
				}
			}
		}
	});
});

describe("Rising Storm 2 start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts the Win64 server program with the map and the two ports", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(launch, 'start /MIN "My RS2" Binaries\\Win64\\VNGame.exe VNSU-SongBe?MaxPlayers=32 -Port=27070 -QueryPort=27072 -log');
	});

	it("keeps the ports in the script equal to the entry's ports", () => {
		const entry = template.buildServerEntry(params());
		assert.match(launch, new RegExp(`-Port=${entry.port} -QueryPort=${entry.queryPort} -log$`));
	});

	it("refuses a map name with spaces, quotes or command characters", () => {
		assert.throws(() => template.buildStartScript(params({ mapCode: "VNSU SongBe" })), /not a map name/);
		assert.throws(() => template.buildStartScript(params({ mapCode: 'VNSU"x' })), /not a map name/);
	});

	it("never lets a command character from the name into the window title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH%' }));
		const title = /^start \/MIN "([^"]*)" /m.exec(bad);
		assert.ok(title, bad);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});
});

describe("Rising Storm 2 config file", () => {
	it("writes ROGame.ini in ROGame\\Config with the server name", () => {
		const { relPath, content } = template.buildConfigFile(params());
		assert.equal(relPath, "ROGame\\Config\\ROGame.ini");
		assert.match(content, /^\[Engine\.GameReplicationInfo\]\r\nServerName=Friends Server\r\n/);
		assert.doesNotMatch(content, /AccessControl/);
	});

	it("writes the join password under [Engine.AccessControl] only when one was typed", () => {
		const { content } = template.buildConfigFile(params({ serverPassword: "cl4ng4m3" }));
		assert.match(content, /\[Engine\.AccessControl\]\r\nGamePassword=cl4ng4m3\r\n/);
	});

	it("refuses a semicolon or a line break in the name, because the game reads them as a comment or a new setting", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: "A;B" })), /semicolon/);
		assert.throws(() => template.buildConfigFile(params({ sessionName: "A\nB" })), /semicolon|line break/);
	});
});

describe("Rising Storm 2 server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program the panel watches and records both ports and the config file", () => {
		assert.equal(entry.type, "risingstorm2");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "VNGame.exe");
		assert.equal(entry.port, 27070);
		assert.equal(entry.queryPort, 27072);
		assert.equal(entry.updateAppId, "418480");
		assert.equal(entry.autoUpdate, false);
		assert.equal(entry.configPath, "C:\\Servers\\rs2\\ROGame\\Config\\ROGame.ini");
	});
});

describe("Rising Storm 2 backup and logs", () => {
	it("keeps the config folder, and reads Launch.log, which -log writes", () => {
		assert.deepEqual(backup, { paths: [{ base: "working", rel: "ROGame/Config", label: "Server settings (ROGame Config folder)" }] });
		assert.deepEqual(logs.map((l) => l.rel), ["ROGame/Logs/Launch.log"]);
	});
});

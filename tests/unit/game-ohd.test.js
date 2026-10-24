import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/ohd.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Operation: Harsh Doorstop (dossier: docs/research/games/ohd/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My OHD",
	sessionName: "Friends Server",
	mapCode: "Jaziira_AASSmall",
	port: 27050,
	queryPort: 27052,
	installDir: "C:\Servers\ohd",
	steamCmdExe: "C:\steamcmd\steamcmd.exe",
	instanceSlug: "my-ohd",
	startScriptFilename: "Start_OHD.bat",
	...extra,
});

describe("OHD module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "ohd");
		assert.equal(template.type, "ohd");
		assert.equal(template.displayName, "Operation: Harsh Doorstop");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (950900) into the folder root, and the store app is the game (736590)", () => {
		assert.equal(template.updateAppId, "950900");
		assert.equal(template.storeAppId, "736590");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name and a map only: no password or mod field is evidenced", () => {
		assert.deepEqual(template.fields, ["sessionName", "mapCode"]);
		assert.ok(!template.fields.includes("serverPassword"));
		assert.ok(!template.fields.includes("mods"));
	});

	it("has a game port 27050 and a query port 27052 (at least game + 2), and no other template uses them or a neighbour", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const [gamePort, queryPort] = template.ports.map((p) => p.default);
		assert.equal(gamePort, 27050);
		assert.equal(queryPort, 27052);
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

describe("OHD start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts the Win64 shipping server", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My OHD" HarshDoorstop\\Binaries\\Win64\\HarshDoorstopServer-Win64-Shipping\.exe HarshDoorstop Jaziira_AASSmall\?MaxPlayers=32 /);
	});

	it("passes the name, the ports and the bind address the way the egg's start line does", () => {
		assert.match(launch, /-SteamServerName="Friends Server" -Port=27050 -MULTIHOME=0\.0\.0\.0 -QueryPort=27052$/);
	});

	it("keeps the ports in the script equal to the entry's ports", () => {
		const entry = template.buildServerEntry(params());
		assert.match(launch, new RegExp(`-Port=${entry.port} `));
		assert.match(launch, new RegExp(`-QueryPort=${entry.queryPort}$`));
	});

	it("never lets a quote or a command character from the name into the script", () => {
		const bad = template.buildStartScript(params({ sessionName: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const name = /-SteamServerName="([^"]*)"/.exec(l);
		assert.ok(name, l);
		assert.equal(name[1], "Evil calc PATH y");
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});

	it("refuses a map name with spaces, quotes or command characters", () => {
		assert.throws(() => template.buildStartScript(params({ mapCode: "Jaziira_AASSmall & x" })), /not a map name/);
		assert.throws(() => template.buildStartScript(params({ mapCode: 'Ani"loy' })), /not a map name/);
	});

	it("falls back to the panel's name when no server name was typed", () => {
		const s = template.buildStartScript(params({ sessionName: "", name: "Panel Name" }));
		assert.match(s, /-SteamServerName="Panel Name"/);
	});

	it("does not write a settings file: the settings file's folder is not evidenced for Windows", () => {
		assert.equal(template.buildConfigFile, undefined);
	});
});

describe("OHD server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program the panel watches (the Shipping exe that stays running) and records both ports", () => {
		assert.equal(entry.type, "ohd");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "HarshDoorstopServer-Win64-Shipping.exe");
		assert.equal(entry.port, 27050);
		assert.equal(entry.queryPort, 27052);
		assert.equal(entry.updateAppId, "950900");
		assert.equal(entry.autoUpdate, false);
	});
});

describe("OHD backup and logs", () => {
	it("keeps the WindowsServer config folder and reads HarshDoorstop.log", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["HarshDoorstop/Saved/Config/WindowsServer"]);
		assert.deepEqual(logs.map((l) => l.rel), ["HarshDoorstop/Saved/Logs/HarshDoorstop.log"]);
	});
});

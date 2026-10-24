import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/ats.js";
import ets2 from "../../src/server/data/games/ets2.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// American Truck Simulator (dossier: docs/research/games/ats/, confidence medium). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My ATS",
	sessionName: "Friends Convoy",
	port: 27500,
	queryPort: 27502,
	installDir: "C:\\Servers\\ats",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-ats",
	startScriptFilename: "Start_ATS.bat",
	...extra,
});

describe("ATS module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "ats");
		assert.equal(template.type, "ats");
		assert.equal(template.displayName, "American Truck Simulator");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (2239530) into the folder root, and names the game app for the store", () => {
		assert.equal(template.updateAppId, "2239530");
		assert.equal(template.storeAppId, "270880");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name only: no password, mods or logon token field", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
	});

	it("uses ports 27500 and 27502, which no other template uses or sits next to", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const [gamePort, queryPort] = template.ports.map((p) => p.default);
		assert.equal(gamePort, 27500);
		assert.equal(queryPort, 27502);
		for (const other of GAME_TEMPLATES) {
			if (other.id === template.id) continue;
			for (const p of other.ports ?? []) {
				for (const base of [gamePort, queryPort]) {
					for (let o = -2; o <= 2; o++) assert.notEqual(p.default, base + o, `${other.id} uses ${base + o}`);
				}
			}
		}
	});

	it("does not clash with the ETS2 module's ports either", () => {
		const [gamePort, queryPort] = template.ports.map((p) => p.default);
		for (const p of ets2.template.ports) {
			for (const base of [gamePort, queryPort]) assert.ok(Math.abs(p.default - base) > 2, `ets2 ${p.default} is next to ${base}`);
		}
	});
});

describe("ATS start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts the server program with -homedir set to its data folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(launch, 'start /MIN "My ATS" bin\\win_x64\\amtrucks_server.exe -homedir "%~dp0data"');
	});

	it("does not pass the ports, the name or any other setting on the command line (they go in server_config.sii)", () => {
		assert.doesNotMatch(launch, /27500|27502|Friends Convoy/);
		assert.doesNotMatch(launch, /-server_cfg|-server |-nosingle/);
	});

	it("never lets a quote, percent, ampersand or pipe from the panel name into the title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});
});

describe("ATS config file (server_config.sii)", () => {
	const file = template.buildConfigFile(params());
	const content = file.content;

	it("is written into the data folder that -homedir points at", () => {
		assert.equal(file.relPath, "data\\American Truck Simulator\\server_config.sii");
	});

	it("is an SiiNunit block with the name and the two dedicated ports the panel chose", () => {
		assert.match(content, /^SiiNunit\r\n\{\r\nserver_config : \.unnamed \{\r\n/);
		assert.match(content, / lobby_name: "Friends Convoy"\r\n/);
		assert.match(content, / connection_dedicated_port: 27500\r\n/);
		assert.match(content, / query_dedicated_port: 27502\r\n/);
	});

	it("sets the virtual ports to the dossier's 100 and 101 and the player limit to 8", () => {
		assert.match(content, / connection_virtual_port: 100\r\n/);
		assert.match(content, / query_virtual_port: 101\r\n/);
		assert.match(content, / max_players: 8\r\n/);
	});

	it("writes no password, and no logon token", () => {
		assert.match(content, / password: ""\r\n/);
		assert.doesNotMatch(content, /server_logon_token/);
	});

	it("uses the ports the entry records", () => {
		const entry = template.buildServerEntry(params({ port: 27510, queryPort: 27511 }));
		const c = template.buildConfigFile(params({ port: 27510, queryPort: 27511 })).content;
		assert.match(c, new RegExp(` connection_dedicated_port: ${entry.port}\\r\\n`));
		assert.match(c, new RegExp(` query_dedicated_port: ${entry.queryPort}\\r\\n`));
	});

	it("keeps the name to one line of text, without quotes or backslashes, at most 63 characters", () => {
		const c = template.buildConfigFile(params({ sessionName: 'A "quoted" \\ name ' + "x".repeat(80) })).content;
		const name = /lobby_name: "([^"]*)"/.exec(c)[1];
		assert.ok(name.length <= 63, name);
		assert.doesNotMatch(name, /["\\]/);
	});
});

describe("ATS server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program the panel watches and records both ports", () => {
		assert.equal(entry.type, "ats");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "amtrucks_server.exe");
		assert.equal(entry.port, 27500);
		assert.equal(entry.queryPort, 27502);
		assert.equal(entry.updateAppId, "2239530");
		assert.equal(entry.autoUpdate, false);
		assert.equal(entry.configPath, "C:\\Servers\\ats\\data\\American Truck Simulator\\server_config.sii");
	});
});

describe("ATS backup and logs", () => {
	it("backs up the data folder (settings, package files and logs)", () => {
		assert.deepEqual(backup, { paths: [{ base: "working", rel: "data", label: "Server settings, package files and logs" }] });
	});

	it("reads the log file the server writes into the data folder", () => {
		assert.deepEqual(logs, [{ kind: "file", base: "working", rel: "data/American Truck Simulator/server.log.txt", label: "Server log" }]);
	});
});

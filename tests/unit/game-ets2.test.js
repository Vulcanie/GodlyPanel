import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/ets2.js";
import ats from "../../src/server/data/games/ats.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Euro Truck Simulator 2 (dossier: docs/research/games/ets2/, confidence medium). The server program's name is not in the dossier:
// eurotrucks2_server.exe is a guess from the ATS tool, so the start script and the watched process must be checked on a real install.
// Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My ETS2",
	sessionName: "Friends Convoy",
	port: 28100,
	queryPort: 28102,
	installDir: "C:\\Servers\\ets2",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-ets2",
	startScriptFilename: "Start_ETS2.bat",
	...extra,
});

describe("ETS2 module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "ets2");
		assert.equal(template.type, "ets2");
		assert.equal(template.displayName, "Euro Truck Simulator 2");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (1948160) into the folder root, and names the game app for the store", () => {
		assert.equal(template.updateAppId, "1948160");
		assert.equal(template.storeAppId, "227300");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name only: no password, mods or logon token field", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
	});

	it("uses ports 28100 and 28102, which no other template uses or sits next to", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const [gamePort, queryPort] = template.ports.map((p) => p.default);
		assert.equal(gamePort, 28100);
		assert.equal(queryPort, 28102);
		for (const other of GAME_TEMPLATES) {
			if (other.id === template.id) continue;
			for (const p of other.ports ?? []) {
				for (const base of [gamePort, queryPort]) {
					for (let o = -2; o <= 2; o++) assert.notEqual(p.default, base + o, `${other.id} uses ${base + o}`);
				}
			}
		}
	});

	it("does not clash with the ATS module's ports either", () => {
		const [gamePort, queryPort] = template.ports.map((p) => p.default);
		for (const p of ats.template.ports) {
			for (const base of [gamePort, queryPort]) assert.ok(Math.abs(p.default - base) > 2, `ats ${p.default} is next to ${base}`);
		}
	});
});

describe("ETS2 start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts the server program with -homedir set to its data folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(launch, 'start /MIN "My ETS2" bin\\win_x64\\eurotrucks2_server.exe -homedir "%~dp0data"');
	});

	it("does not pass the ports, the name or any other setting on the command line (they go in server_config.sii)", () => {
		assert.doesNotMatch(launch, /28100|28102|Friends Convoy/);
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

describe("ETS2 config file (server_config.sii)", () => {
	const file = template.buildConfigFile(params());
	const content = file.content;

	it("is written into the data folder that -homedir points at", () => {
		assert.equal(file.relPath, "data\\Euro Truck Simulator 2\\server_config.sii");
	});

	it("is an SiiNunit block with the name and the two dedicated ports the panel chose", () => {
		assert.match(content, /^SiiNunit\r\n\{\r\nserver_config : \.unnamed \{\r\n/);
		assert.match(content, / lobby_name: "Friends Convoy"\r\n/);
		assert.match(content, / connection_dedicated_port: 28100\r\n/);
		assert.match(content, / query_dedicated_port: 28102\r\n/);
	});

	it("sets the virtual ports to the dossier's 100 and 101 and the player limit to 8", () => {
		assert.match(content, / connection_virtual_port: 100\r\n/);
		assert.match(content, / query_virtual_port: 101\r\n/);
		assert.match(content, / max_players: 8\r\n/);
	});

	it("writes no password, no logon token and no timezone (the dossier's defaults conflict, so the game's own is used)", () => {
		assert.match(content, / password: ""\r\n/);
		assert.doesNotMatch(content, /server_logon_token|timezones/);
	});

	it("uses the ports the entry records", () => {
		const entry = template.buildServerEntry(params({ port: 28110, queryPort: 28111 }));
		const c = template.buildConfigFile(params({ port: 28110, queryPort: 28111 })).content;
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

describe("ETS2 server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program the panel watches (unconfirmed, see the notes) and records both ports", () => {
		assert.equal(entry.type, "ets2");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "eurotrucks2_server.exe");
		assert.equal(entry.port, 28100);
		assert.equal(entry.queryPort, 28102);
		assert.equal(entry.updateAppId, "1948160");
		assert.equal(entry.autoUpdate, false);
		assert.equal(entry.configPath, "C:\\Servers\\ets2\\data\\Euro Truck Simulator 2\\server_config.sii");
	});
});

describe("ETS2 backup and logs", () => {
	it("backs up the data folder (settings, package files and logs)", () => {
		assert.deepEqual(backup, { paths: [{ base: "working", rel: "data", label: "Server settings, package files and logs" }] });
	});

	it("reads the log file the server writes into the data folder", () => {
		assert.deepEqual(logs, [{ kind: "file", base: "working", rel: "data/Euro Truck Simulator 2/server.log.txt", label: "Server log" }]);
	});
});

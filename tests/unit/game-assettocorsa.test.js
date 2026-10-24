import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/assettocorsa.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Assetto Corsa (Kunos, the stock server; dossier: docs/research/games/assettocorsa/, confidence low). Nothing here runs the server.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My AC",
	sessionName: "Friends Track Day",
	port: 27600,
	httpPort: 27602,
	installDir: "C:\\Servers\\ac",
	steamCmdExe: "C:\steamcmd\steamcmd.exe",
	instanceSlug: "my-ac",
	startScriptFilename: "Start_AssettoCorsa.bat",
	...extra,
});

describe("Assetto Corsa module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "assettocorsa");
		assert.equal(template.type, "assettocorsa");
		assert.equal(template.displayName, "Assetto Corsa");
		assert.equal(template.method, "process");
	});

	it("installs the stock server (302550) into the folder root, and names the game app for the store", () => {
		assert.equal(template.updateAppId, "302550");
		assert.equal(template.storeAppId, "244210");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name only: passwords and the car list are set in the settings file", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
	});

	it("declares ports 27600 and 27602 (the second is at least game + 2), clear of every other template", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "httpPort"]);
		const [gamePort, httpPort] = template.ports.map((p) => p.default);
		assert.equal(gamePort, 27600);
		assert.equal(httpPort, 27602);
		assert.ok(httpPort >= gamePort + 2);
		for (const other of GAME_TEMPLATES) {
			if (other.id === template.id) continue;
			for (const p of other.ports ?? []) {
				for (const base of [gamePort, httpPort]) {
					for (let o = -2; o <= 2; o++) assert.notEqual(p.default, base + o, `${other.id} uses ${base + o}`);
				}
			}
		}
	});
});

describe("Assetto Corsa start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts acServer.exe with no arguments", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(launch, 'start /MIN "My AC" acServer.exe');
	});

	it("never lets a quote, percent, ampersand or pipe from the name into the title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH%' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});
});

describe("Assetto Corsa settings file", () => {
	const file = template.buildConfigFile(params());

	it("writes cfg\\server_cfg.ini with the name and the ports the panel chose", () => {
		assert.equal(file.relPath, "cfg\\server_cfg.ini");
		assert.match(file.content, /^\[SERVER\]\r\n/);
		assert.match(file.content, /^NAME=Friends Track Day\r$/m);
		assert.match(file.content, /^UDP_PORT=27600\r$/m);
		assert.match(file.content, /^TCP_PORT=27600\r$/m);
		assert.match(file.content, /^HTTP_PORT=27602\r$/m);
		assert.match(file.content, /^REGISTER_TO_LOBBY=1\r$/m);
	});

	it("keeps quotes, semicolons, equals signs and brackets out of the name", () => {
		const f = template.buildConfigFile(params({ sessionName: 'A;B=C "D" [E]' }));
		const name = /^NAME=(.*)\r$/m.exec(f.content)[1];
		assert.doesNotMatch(name, /[;="\[\]]/);
		assert.equal(name, "A B C D E");
	});

	it("is written to the same place the server entry points at", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(entry.configPath, "C:\\Servers\\ac\\cfg\\server_cfg.ini");
		assert.equal(file.relPath, "cfg\\server_cfg.ini");
	});
});

describe("Assetto Corsa server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program the panel watches and records both ports", () => {
		assert.equal(entry.type, "assettocorsa");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "acServer.exe");
		assert.equal(entry.port, 27600);
		assert.equal(entry.httpPort, 27602);
		assert.equal(entry.updateAppId, "302550");
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Assetto Corsa backup and logs", () => {
	it("keeps the cfg folder in the backup", () => {
		assert.deepEqual(backup, { paths: [{ base: "working", rel: "cfg", label: "Server settings (cfg folder)" }] });
	});

	it("reads the log folder the server writes", () => {
		assert.deepEqual(logs, [{ kind: "dir", base: "working", rel: "log", label: "Server logs" }]);
	});
});

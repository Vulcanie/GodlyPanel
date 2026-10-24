import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { nameText } from "../../src/server/data/games/starbound.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Starbound, from the research dossier (nothing was run on a real install): dedicated server app 533830, win64\starbound_server.exe,
// one game port (21025), settings in storage\starbound_server.config (JSON), no documented launch arguments, manual mods.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Starbound",
	sessionName: "Friends Universe",
	port: 21025,
	installDir: "C:\\Servers\\starbound",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-starbound",
	startScriptFilename: "Start_Starbound.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Starbound module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(template.id, "starbound");
		assert.equal(template.type, "starbound");
		assert.equal(template.displayName, "Starbound");
		assert.equal(template.method, "process");
		assert.equal(launchOptions, false);
	});

	it("installs the dedicated server tool (533830) with an anonymous login, into the install folder root", () => {
		assert.equal(template.updateAppId, "533830");
		assert.equal(template.storeAppId, "211820");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks only for a server name", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
	});

	it("uses a game port that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 21025);
		// Every game keeps the port after its game port free as a precaution (portRules.js), so 21026 is held too.
		const mine = [21025, ...implicitPortsOf(template).map((i) => 21025 + i.offset)];
		assert.deepEqual(mine, [21025, 21026]);
		const others = GAME_TEMPLATES.filter((t) => t.id !== "starbound");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});
});

describe("Starbound start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts win64\\starbound_server.exe with no arguments", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(launchLine(script), 'start /MIN "My Starbound" win64\\starbound_server.exe');
	});

	it("does not put the port, the name or any other setting on the launch line", () => {
		assert.ok(!/21025|Friends|storage/.test(script));
	});

	it("never lets a character cmd acts on into the title", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%' }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" win64\\starbound_server\.exe$/);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Starbound inputs", () => {
	it("refuses a name with a line break, and trims the rest", async () => {
		await assert.rejects(template.resolveParams({ name: "x", sessionName: "a\nb" }), /control character/);
		assert.equal(nameText("  Friends  "), "Friends");
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends \"Co-op\"  " });
		assert.deepEqual(out, { sessionName: 'Friends "Co-op"' });
	});

	it("warns that the panel's Stop does not save, and that three keys are all it writes", async () => {
		const out = await template.postWrite(params());
		assert.equal(out.warnings.length, 2);
		assert.match(out.warnings[0], /three settings/);
		assert.match(out.warnings[1], /Stop/);
	});
});

describe("Starbound storage\\starbound_server.config", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const config = JSON.parse(content);

	it("goes in the storage folder of the install", () => {
		assert.equal(relPath, "storage\\starbound_server.config");
	});

	it("is JSON with the name, the game port and the player limit the dossier explains", () => {
		assert.deepEqual(config, { serverName: "Friends Universe", gameServerPort: 21025, maxPlayers: 8 });
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(content.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(content));
	});

	it("falls back to the panel's name when no name is given, and keeps the port of the entry", () => {
		const fallback = JSON.parse(template.buildConfigFile(params({ sessionName: "", name: "Plain" })).content);
		assert.equal(fallback.serverName, "Plain");
		const ported = JSON.parse(template.buildConfigFile(params({ port: 21030 })).content);
		assert.equal(ported.gameServerPort, 21030);
	});

	it("keeps quotes and backslashes inside the JSON as escaped text, and refuses a line break", () => {
		const quoted = JSON.parse(template.buildConfigFile(params({ sessionName: 'Say "hi" \\o/' })).content);
		assert.equal(quoted.serverName, 'Say "hi" \\o/');
		assert.throws(() => template.buildConfigFile(params({ sessionName: "a\r\nb" })), /control character/);
	});
});

describe("Starbound server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches starbound_server.exe, by process, with no query or RCON", () => {
		assert.equal(entry.processName, "starbound_server.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "starbound");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("matches the port in the config file", () => {
		assert.equal(entry.port, JSON.parse(template.buildConfigFile(params()).content).gameServerPort);
	});

	it("records the start script, the install folder and the config file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\starbound\\Start_Starbound.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\starbound");
		assert.equal(entry.installDir, "C:\\Servers\\starbound\\");
		assert.equal(entry.updateAppId, "533830");
		assert.equal(entry.configPath, "C:\\Servers\\starbound\\storage\\starbound_server.config");
		assert.deepEqual(entry.configPaths, { "starbound_server.config": "C:\\Servers\\starbound\\storage\\starbound_server.config" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Starbound backups and logs", () => {
	it("backs up the storage folder and the mods copied in by hand", () => {
		const rels = backup.paths.map((p) => p.rel);
		assert.deepEqual(rels, ["storage", "mods"]);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("names no log, since the dossier names none", () => {
		assert.deepEqual(logs, []);
	});
});

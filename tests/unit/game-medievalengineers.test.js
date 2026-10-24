import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/medievalengineers.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { GAME_MODULES } from "../../src/server/data/games/index.js";

// Medieval Engineers, from the research dossier (docs/research/games/medievalengineers/): the Windows dedicated server, app 367970.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Engineers Server",
	sessionName: "Friends Build",
	port: 27680,
	installDir: "C:\\Servers\\me",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-engineers-server",
	startScriptFilename: "Start_MedievalEngineers.bat",
	...extra,
});
const launchLine = (p) => template.buildStartScript(p).split("\r\n").find((l) => l.startsWith("start "));

describe("Medieval Engineers module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(template.id, "medievalengineers");
		assert.equal(template.type, "medievalengineers");
		assert.equal(template.displayName, "Medieval Engineers");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server tool anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "367970");
		assert.equal(template.storeAppId, "333950");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name only, and offers no mods or passwords it cannot write", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
	});

	it("has one UDP game port that no other template uses, nor one beside it", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.match(template.ports[0].label, /UDP/);
		const port = template.ports[0].default;
		assert.equal(port, 27680);
		const others = [];
		for (const t of [...GAME_TEMPLATES, ...GAME_MODULES.map((m) => m.template)]) {
			if (t.id === template.id) continue;
			for (const p of t.ports ?? []) others.push(p.default);
			for (const p of t.implicitPorts ?? []) others.push(t.ports?.[0]?.default + p.offset);
		}
		for (const other of others.filter((n) => typeof n === "number")) assert.ok(Math.abs(other - port) > 2, `port ${port} is next to ${other}`);
	});

	it("is started with the console argument and no launch form (the dossier gives no argument syntax to put one on the line)", () => {
		assert.equal(launchOptions, false);
		assert.match(template.buildStartScript(params()), / -console -path /);
	});
});

describe("Medieval Engineers start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("runs the server from its DedicatedServer64 folder, with the console argument and the data folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0DedicatedServer64"');
		assert.equal(launchLine(params()), 'start /MIN "My Engineers Server" MedievalEngineersDedicated.exe -console -path "%~dp0Data"');
	});

	it("has exactly one start line and ends with a line break", () => {
		assert.equal(lines.filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(script.endsWith("\r\n"));
	});

	it("keeps characters cmd would act on out of the window title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>' }));
		const title = /^start \/MIN "([^"]*)" /m.exec(bad);
		assert.ok(title, bad);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.equal(bad.split("\r\n").filter((l) => l.includes("calc")).length, 1);
	});

	it("falls back to the game's name for a title that is empty after cleaning", () => {
		assert.match(template.buildStartScript(params({ name: '"&%' })), /^start \/MIN "Medieval Engineers" /m);
	});
});

describe("Medieval Engineers config file", () => {
	const cfg = template.buildConfigFile(params());

	it("is written to the data folder the start script points the game at", () => {
		assert.equal(cfg.relPath, "Data\\MedievalEngineers-Dedicated.cfg");
	});

	it("has the server's name, world name, port and the Scenario from the dossier's sample", () => {
		const c = cfg.content;
		assert.match(c, /<MyConfigDedicated /);
		assert.match(c, /<ServerName>Friends Build<\/ServerName>/);
		assert.match(c, /<WorldName>Friends Build<\/WorldName>/);
		assert.match(c, /<ServerPort>27680<\/ServerPort>/);
		assert.match(c, /<IP>0\.0\.0\.0<\/IP>/);
		assert.match(c, /<Scenario Type="ScenarioDefinition" Subtype="SafeAreaStart" \/>/);
	});

	it("switches the remote API off, so it does not bind its HTTP port", () => {
		assert.match(cfg.content, /<RemoteApiEnabled>false<\/RemoteApiEnabled>/);
	});

	it("escapes the characters XML reads as markup", () => {
		const c = template.buildConfigFile(params({ sessionName: "A & <B>" })).content;
		assert.match(c, /<ServerName>A &amp; &lt;B&gt;<\/ServerName>/);
	});
});

describe("Medieval Engineers parameters and server entry", () => {
	it("trims the server name and refuses a line break", async () => {
		assert.deepEqual(await template.resolveParams({ sessionName: '  Two "x" & y  ' }), { sessionName: 'Two "x" & y' });
		await assert.rejects(template.resolveParams({ sessionName: "one\r\ntwo" }), /line break/);
	});

	it("names the process the panel watches and the port the config file sets", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(entry.processName, "MedievalEngineersDedicated.exe");
		assert.equal(entry.port, 27680);
		assert.equal(entry.updateAppId, "367970");
		assert.ok(entry.configPath.endsWith("Data\\MedievalEngineers-Dedicated.cfg"));
		assert.match(template.buildConfigFile(params()).content, new RegExp(`<ServerPort>${entry.port}</ServerPort>`));
	});

	it("backs up the data folder, which holds the config and the worlds", () => {
		assert.deepEqual(backup.paths.map((p) => [p.base, p.rel]), [["working", "Data"]]);
		assert.deepEqual(logs, [{ kind: "file", base: "working", rel: "Data/MedievalEngineersDedicated.log", label: "Server log" }]);
	});
});

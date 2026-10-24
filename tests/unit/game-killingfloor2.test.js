import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/killingfloor2.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Killing Floor 2, from the research dossier (nothing was run on a real install): server app 232130, KFServer.exe (UNVERIFIED for
// Windows), a game port and a query port on the start line, PCServer-KFGame.ini written by the game itself.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My KF2 Server",
	port: 7811,
	queryPort: 7813,
	installDir: "C:\\Servers\\kf2",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-kf2-server",
	startScriptFilename: "Start_KF2.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Killing Floor 2 module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, false);
		assert.equal(template.id, "killingfloor2");
		assert.equal(template.type, "killingfloor2");
		assert.equal(template.displayName, "Killing Floor 2");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (232130) into the folder root", () => {
		assert.equal(template.updateAppId, "232130");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for no create-time fields, since the game writes its name and password settings after the first start", () => {
		assert.deepEqual(template.fields, []);
		assert.equal(template.resolveParams, undefined);
		assert.equal(template.patchInstalledConfig, undefined);
		assert.equal(template.buildConfigFile, undefined);
	});

	it("declares a game port and a query port, neither used by another template, nor beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const [game, query] = template.ports.map((p) => p.default);
		assert.ok(query >= game + 2, "the second port is at least two above the game port");
		const others = GAME_TEMPLATES.filter((t) => t.id !== "killingfloor2");
		assert.ok(others.length > 10);
		const mine = [game, query, ...implicitPortsOf(template).map((i) => game + i.offset)];
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});
});

describe("Killing Floor 2 start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts KFServer.exe from Binaries\\Win64", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(
			launchLine(script),
			'start /MIN "My KF2 Server" /D "%~dp0Binaries\\Win64" KFServer.exe "kf-bioticslab?Port=7811?QueryPort=7813"',
		);
	});

	it("matches the ports in the entry", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(Number(/\?Port=(\d+)/.exec(launchLine(script))[1]), entry.port);
		assert.equal(Number(/\?QueryPort=(\d+)/.exec(launchLine(script))[1]), entry.queryPort);
		const custom = template.buildStartScript(params({ port: 7901, queryPort: 7903, mapCode: "KF-Outpost" }));
		assert.match(custom, /"KF-Outpost\?Port=7901\?QueryPort=7903"/);
	});

	it("keeps any character cmd acts on out of the script", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', mapCode: "kf & calc", port: "7811 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.match(launch, /"kf-bioticslab\?Port=7811\?QueryPort=7813"$/);
	});

	it("never writes the password or a name setting on the line", () => {
		const script = template.buildStartScript(params({ serverPassword: "secret1", sessionName: "Friends" }));
		assert.ok(!script.includes("secret1"));
		assert.ok(!/AdminPassword|GamePassword|ServerName/.test(script));
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Killing Floor 2 server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches KFServer.exe by process, with no RCON", () => {
		assert.equal(entry.processName, "KFServer.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "killingfloor2");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});

	it("points at the settings file the game writes, under KFGame\\Config", () => {
		assert.equal(entry.configPath, "C:\\Servers\\kf2\\KFGame\\Config\\PCServer-KFGame.ini");
		assert.deepEqual(entry.configPaths, { "PCServer-KFGame.ini": "C:\\Servers\\kf2\\KFGame\\Config\\PCServer-KFGame.ini" });
		assert.equal(entry.startScriptPath, "C:\\Servers\\kf2\\Start_KF2.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\kf2");
		assert.equal(entry.updateAppId, "232130");
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Killing Floor 2 backups and logs", () => {
	it("backs up the config folder", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["KFGame/Config"]);
	});

	it("lists no log, because the dossier names no Windows log file", () => {
		assert.deepEqual(logs, []);
	});
});

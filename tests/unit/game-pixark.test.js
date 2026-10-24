import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/pixark.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { GAME_MODULES } from "../../src/server/data/games/index.js";

// PixARK, from the research dossier (docs/research/games/pixark/): the Windows dedicated server, app 824360 (game app 593600).

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My PixARK Server",
	sessionName: "Friends Cube",
	maxPlayers: 10,
	port: 27730,
	queryPort: 27740,
	rconPort: 27750,
	cubePort: 27760,
	installDir: "C:\\Servers\\pixark",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-pixark-server",
	startScriptFilename: "Start_PixARK.bat",
	...extra,
});
const launchLine = (p) => template.buildStartScript(p).split("\r\n").find((l) => l.startsWith("start "));

describe("PixARK module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(template.id, "pixark");
		assert.equal(template.type, "pixark");
		assert.equal(template.displayName, "PixARK");
		assert.equal(template.method, "process");
		assert.equal(launchOptions, false);
	});

	it("installs the dedicated server tool anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "824360");
		assert.equal(template.storeAppId, "593600");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name and the two passwords, and nothing about mods (they are copied in by hand)", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "adminPassword"]);
		assert.ok(!template.fields.includes("mods"));
	});

	it("has its ports apart from every other template's, and not next to one", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort", "rconPort", "cubePort"]);
		const values = template.ports.map((p) => p.default);
		assert.equal(new Set(values).size, values.length);
		const others = [];
		for (const t of [...GAME_TEMPLATES, ...GAME_MODULES.map((m) => m.template)]) {
			if (t.id === template.id) continue;
			for (const p of t.ports ?? []) others.push(p.default);
			for (const p of t.implicitPorts ?? []) others.push((t.ports?.[0]?.default ?? 0) + p.offset);
		}
		for (const value of values) for (const other of others.filter((n) => typeof n === "number")) assert.ok(Math.abs(other - value) > 2, `port ${value} is next to ${other}`);
	});
});

describe("PixARK start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("runs from the install folder and starts PixARKServer.exe with the cube world line and the flags from the dossier", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(
			launchLine(params()),
			'start /MIN "My PixARK Server" "ShooterGame\\Binaries\\Win64\\PixARKServer.exe" "CubeWorld_Light?listen?MaxPlayers=10?SessionName=Friends_Cube?Port=27730?QueryPort=27740?RCONPort=27750?CULTUREFORCOOKING=en" -NoBattlEye -CubePort=27760 -cubeworld=world -nosteamclient -NoHangDetection -game -server -log',
		);
	});

	it("has exactly one start line and ends with a line break", () => {
		assert.equal(lines.filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(script.endsWith("\r\n"));
	});

	it("adds the passwords to the URL only when they are set", () => {
		assert.doesNotMatch(launchLine(params()), /ServerPassword|ServerAdminPassword/);
		const withPass = launchLine(params({ serverPassword: "join-me", adminPassword: "boss1" }));
		assert.match(withPass, /\?ServerPassword=join-me\?ServerAdminPassword=boss1\?CULTUREFORCOOKING=en"/);
	});

	it("has the same game and query ports as the server entry", () => {
		const entry = template.buildServerEntry(params());
		assert.match(launchLine(params()), new RegExp(`\\?Port=${entry.port}\\?`));
		assert.match(launchLine(params()), new RegExp(`\\?QueryPort=${entry.queryPort}\\?`));
		assert.match(launchLine(params()), new RegExp(`-CubePort=${params().cubePort}`));
	});

	it("keeps characters cmd would act on out of the window title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>' }));
		const title = /^start \/MIN "([^"]*)" /m.exec(bad);
		assert.ok(title, bad);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.equal(bad.split("\r\n").filter((l) => l.includes("calc")).length, 1);
	});
});

describe("PixARK parameters", () => {
	it("turns the name's spaces into underscores and drops characters that would break the URL or cmd", async () => {
		const out = await template.resolveParams({ sessionName: 'Friends & Co? "x" = y' });
		assert.equal(out.sessionName, "Friends_Co_x_y");
	});

	it("refuses a session name with a line break", async () => {
		await assert.rejects(template.resolveParams({ sessionName: "one\r\ntwo" }), /line break/);
	});

	it("accepts a password of letters, digits and a few safe marks, and refuses the rest", async () => {
		const ok = await template.resolveParams({ serverPassword: "Good-Pass_1.@#", adminPassword: "Adm1n*+~" });
		assert.equal(ok.serverPassword, "Good-Pass_1.@#");
		assert.equal(ok.adminPassword, "Adm1n*+~");
		for (const bad of ['a"b', "a?b", "a=b", "a&b", "a b", "a%b", "a^b", "a|b", "a<b", "a!b"]) {
			await assert.rejects(template.resolveParams({ serverPassword: bad }), /password/i, bad);
		}
	});

	it("leaves an empty password out (no password on the line)", async () => {
		const out = await template.resolveParams({ serverPassword: "", adminPassword: "" });
		assert.equal(out.serverPassword, "");
		assert.equal(out.adminPassword, "");
	});
});

describe("PixARK server entry and backup", () => {
	it("names the process the panel watches, the game port and the config file", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(entry.processName, "PixARKServer.exe");
		assert.equal(entry.port, 27730);
		assert.equal(entry.queryPort, 27740);
		assert.equal(entry.updateAppId, "824360");
		assert.ok(entry.configPath.endsWith("ShooterGame\\Saved\\Config\\WindowsServer\\GameUserSettings.ini"));
	});

	it("backs up the config folder and the cube world folder", () => {
		assert.deepEqual(backup.paths.map((p) => [p.base, p.rel]), [
			["working", "ShooterGame/Saved/Config"],
			["working", "ShooterGame/Saved/CubeServers"],
		]);
	});
});

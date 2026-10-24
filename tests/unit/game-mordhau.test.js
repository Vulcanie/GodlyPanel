import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { textFor } from "../../src/server/data/games/mordhau.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Mordhau: server app 629800 (anonymous login), MordhauServer.exe in the folder root (it starts Mordhau\Binaries\Win64\
// MordhauServer-Win64-Shipping.exe, checked on a real install), Game.ini under Mordhau\Saved\Config\WindowsServer, the arguments on
// the launch line, no mods, no graceful stop.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Mordhau Server",
	sessionName: "Friends Mordhau",
	serverPassword: "secret1",
	adminPassword: "admin42",
	port: 25900,
	queryPort: 25902,
	beaconPort: 25903,
	installDir: "C:\\Servers\\mordhau",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-mordhau-server",
	startScriptFilename: "Start_Mordhau.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));
const GAME_INI_REL = "Mordhau\\Saved\\Config\\WindowsServer\\Game.ini";
const PROGRAM = "MordhauServer.exe";

describe("Mordhau module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "mordhau");
		assert.equal(template.type, "mordhau");
		assert.equal(template.displayName, "Mordhau");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (629800) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "629800");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password and an admin password", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "adminPassword"]);
	});

	it("keeps its ports clear of every other template, and in the 25900-25989 range", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort", "beaconPort"]);
		const defaults = Object.fromEntries(template.ports.map((p) => [p.key, p.default]));
		for (const p of template.ports) assert.ok(p.default >= 25900 && p.default <= 25989, `${p.key} ${p.default}`);
		const mine = [defaults.port, defaults.queryPort, defaults.beaconPort, ...implicitPortsOf(template).map((i) => defaults.port + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "mordhau");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});

	it("keeps the query port out of the game port's companion port", () => {
		const { port, queryPort } = Object.fromEntries(template.ports.map((p) => [p.key, p.default]));
		for (const i of implicitPortsOf(template)) assert.notEqual(port + i.offset, queryPort);
	});
});

describe("Mordhau start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts the binary minimized", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), new RegExp(`^start /MIN "My Mordhau Server" ${PROGRAM.replace(/\\/g, "\\\\")} `));
	});

	it("writes the map and the egg's arguments, with the ports from the entry", () => {
		assert.equal(
			launchLine(script),
			`start /MIN "My Mordhau Server" ${PROGRAM} /Game/Mordhau/Maps/Grad/FL_Grad -MaxSlots=48 -Port=25900 -queryport=25902 -beaconport=25903`,
		);
	});

	it("leaves out the egg's -USEALLAVAILABLECORES, which no source describes", () => {
		assert.ok(!launchLine(script).includes("USEALLAVAILABLECORES"));
	});

	it("never puts the server name or passwords on the launch line", () => {
		const line = launchLine(template.buildStartScript(params({ serverPassword: "pw-one", adminPassword: "pw-two" })));
		assert.ok(!line.includes("pw-one") && !line.includes("pw-two") && !line.includes("Friends Mordhau"));
	});

	it("falls back to the default ports when the entry gives none", () => {
		const bare = template.buildStartScript(params({ port: undefined, queryPort: undefined, beaconPort: undefined }));
		assert.match(launchLine(bare), /-Port=25900 -queryport=25902 -beaconport=25903$/);
	});

	it("never lets a character cmd acts on into the script, whatever the name", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%' }));
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[%&|<>^]/.test(launchLine(hostile).replace(/^start \/MIN "[^"]*"/, "")));
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Mordhau Game.ini", () => {
	it("is written to the folder the dossier gives, with the session section and the three settings", () => {
		const { relPath, content } = template.buildConfigFile(params());
		assert.equal(relPath, GAME_INI_REL);
		assert.ok(content.startsWith("[/Script/Mordhau.MordhauGameSession]\r\n"));
		assert.ok(content.includes("\r\nServerName=Friends Mordhau\r\n"));
		assert.ok(content.includes("\r\nServerPassword=secret1\r\n"));
		assert.ok(content.includes("\r\nAdminPassword=admin42\r\n"));
		assert.ok(content.endsWith("\r\n"));
	});

	it("writes an empty join password for a public server", () => {
		const { content } = template.buildConfigFile(params({ serverPassword: "" }));
		assert.ok(content.includes("\r\nServerPassword=\r\n"));
	});

	it("names the same file in the entry as the config it writes", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(entry.configPath, `C:\\Servers\\mordhau\\${GAME_INI_REL}`);
		assert.equal(entry.configPaths["Game.ini"], entry.configPath);
	});
});

describe("Mordhau inputs", () => {
	it("refuses a name or password that a config line cannot hold", async () => {
		await assert.rejects(template.resolveParams({ sessionName: "a\nb" }), /cannot hold/);
		await assert.rejects(template.resolveParams({ sessionName: "ok", serverPassword: "x\ry" }), /cannot hold/);
	});

	it("refuses a name longer than 40 characters and a password longer than 20", async () => {
		await assert.rejects(template.resolveParams({ sessionName: "n".repeat(41) }), /40 characters/);
		await assert.rejects(template.resolveParams({ sessionName: "ok", adminPassword: "p".repeat(21) }), /20 characters/);
		await assert.rejects(template.resolveParams({ sessionName: "ok", serverPassword: "p".repeat(21) }), /20 characters/);
	});

	it("trims what it accepts and falls back to the name field", async () => {
		const out = await template.resolveParams({ name: "Fallback", sessionName: "  Friends  ", serverPassword: " pw ", adminPassword: "" });
		assert.equal(out.sessionName, "Friends");
		assert.equal(out.serverPassword, "pw");
		const fallback = await template.resolveParams({ name: "Fallback", sessionName: "" });
		assert.equal(fallback.sessionName, "Fallback");
	});

	it("textFor refuses a control character and accepts plain text", () => {
		assert.throws(() => textFor("a\tb", "x", 10), /cannot hold/);
		assert.equal(textFor(" plain text ", "x", 20), "plain text");
	});
});

describe("Mordhau backup, logs and warnings", () => {
	it("backs up the settings folder and lists the game log", () => {
		assert.equal(backup.paths.length, 1);
		assert.equal(backup.paths[0].base, "working");
		assert.equal(backup.paths[0].rel, "Mordhau\\Saved\\Config\\WindowsServer");
		assert.deepEqual(logs.map((l) => l.rel), ["Mordhau/Saved/Logs/Mordhau.log"]);
	});

	it("warns that the server cannot be stopped cleanly", async () => {
		const { warnings } = await template.postWrite(params());
		assert.ok(warnings.some((w) => /Ctrl\+C/.test(w)));
	});

	it("warns about a missing admin password only when none was typed", async () => {
		const withAdmin = await template.postWrite(params());
		assert.ok(!withAdmin.warnings.some((w) => /admin password was set/.test(w)));
		const without = await template.postWrite(params({ adminPassword: "" }));
		assert.ok(without.warnings.some((w) => /No admin password was set/.test(w)));
	});
});

describe("Mordhau server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches the binary's process and keeps the window minimized so ^C can be sent by hand", () => {
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "MordhauServer-Win64-Shipping.exe");
		assert.equal(entry.windowMode, "minimized");
		assert.equal(entry.autoUpdate, false);
	});

	it("carries the ports the script uses", () => {
		assert.equal(entry.port, 25900);
		assert.equal(entry.queryPort, 25902);
		assert.equal(entry.beaconPort, 25903);
		assert.equal(entry.updateAppId, "629800");
		assert.equal(entry.startScriptPath, "C:\\Servers\\mordhau\\Start_Mordhau.bat");
	});
});

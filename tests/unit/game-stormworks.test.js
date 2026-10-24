import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/stormworks.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Stormworks: Build and Rescue, from the research dossier (nothing was run on a real install): dedicated server app 1247090, server.exe,
// a game port with two more consecutive ports, server_config.xml written by the server itself (the panel does not write it), and the
// one documented launch argument, +server_dir.

const { template, backup, logs, launchOptions } = game;
const INSTALL = "C:\\Servers\\storm";
const params = (extra = {}) => ({
	name: "My Storm Server",
	sessionName: "",
	serverPassword: "",
	port: 25560,
	installDir: INSTALL,
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-storm-server",
	startScriptFilename: "Start_Stormworks.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Stormworks module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "stormworks");
		assert.equal(template.type, "stormworks");
		assert.equal(template.displayName, "Stormworks: Build and Rescue");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (1247090) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "1247090");
		assert.equal(template.storeAppId, "573090");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for no create-form fields, since the panel does not write the server's name or password", () => {
		assert.deepEqual(template.fields, []);
	});

	it("has one game port and two ports beside it, none used by another template", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 25560);
		assert.deepEqual(implicitPortsOf(template).map((i) => i.offset), [1, 2]);
		const mine = [25560, 25561, 25562];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "stormworks");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});
});

describe("Stormworks start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts server.exe with the install folder as +server_dir", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(launchLine(script), `start /MIN "My Storm Server" server.exe +server_dir "${INSTALL}"`);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});

	it("never puts the port, name or password on the line", () => {
		const withSecrets = template.buildStartScript(params({ serverPassword: "secret1", sessionName: "Friends" }));
		assert.ok(!withSecrets.includes("secret1"));
		assert.ok(!/-port|\+port|\+password|\+name/i.test(withSecrets));
	});

	it("keeps a hostile name from adding commands to the line", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%' }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" server\.exe \+server_dir "/);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
	});

	it("refuses an install folder with characters cmd acts on", () => {
		assert.throws(() => template.buildStartScript(params({ installDir: "C:\\a & calc" })), /cannot/);
		assert.throws(() => template.buildStartScript(params({ installDir: "C:\\a%b" })), /cannot/);
	});
});

describe("Stormworks server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches server.exe by process, with no RCON and no config file the panel manages", () => {
		assert.equal(entry.processName, "server.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "stormworks");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.configPath, undefined);
		assert.equal(entry.configPaths, undefined);
		assert.equal(entry.autoUpdate, false);
	});

	it("records the port the panel reserved, and the script and folder paths", () => {
		assert.equal(entry.port, 25560);
		assert.equal(entry.startScriptPath, `${INSTALL}\\Start_Stormworks.bat`);
		assert.equal(entry.workingDir, INSTALL);
		assert.equal(entry.installDir, `${INSTALL}\\`);
		assert.equal(entry.updateAppId, "1247090");
	});
});

describe("Stormworks config and warnings", () => {
	it("writes no config file, because its XML is not a format the panel reads", () => {
		assert.equal(template.buildConfigFile, undefined);
		assert.equal(template.buildExtraFiles, undefined);
	});

	it("warns about the things the panel cannot do or verify", async () => {
		const out = await template.postWrite(params());
		const text = out.warnings.join("\n");
		assert.match(text, /server_config\.xml/);
		assert.match(text, /25560/);
		assert.match(text, /Stop/);
	});
});

describe("Stormworks backups and logs", () => {
	it("backs up the settings file in the install folder", () => {
		assert.deepEqual(backup.paths.map((p) => [p.base, p.rel]), [["working", "server_config.xml"]]);
		assert.ok(backup.paths[0].label);
	});

	it("has no log folder, because the dossier names none", () => {
		assert.deepEqual(logs, []);
	});
});

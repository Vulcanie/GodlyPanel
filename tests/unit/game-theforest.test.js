import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cfgText, argText } from "../../src/server/data/games/theforest.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// The Forest, from the research dossier (nothing was run on a real install): server app 556450, TheForestDedicatedServer.exe in the
// install root, config.cfg under TheForestDedicatedServer_Data\forest\config (passed with -configfilepath), the admin password on the start
// command, no mods, no graceful stop.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Forest Server",
	sessionName: "Friends Forest",
	serverPassword: "secret1",
	adminPassword: "admin42",
	port: 27455,
	queryPort: 27457,
	steamPort: 8770,
	installDir: "C:\\Servers\\forest",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-forest-server",
	startScriptFilename: "Start_TheForest.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));
const CONFIG_REL = "TheForestDedicatedServer_Data\\forest\\config\\config.cfg";

describe("The Forest module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "theforest");
		assert.equal(template.type, "theforest");
		assert.equal(template.displayName, "The Forest");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (556450) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "556450");
		assert.equal(template.storeAppId, "242760");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password and an admin password", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "adminPassword"]);
	});

	it("keeps its ports clear of every other template, and off the dossier's 8766, 27015 and 27016", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort", "steamPort"]);
		const defaults = Object.fromEntries(template.ports.map((p) => [p.key, p.default]));
		const mine = [defaults.port, defaults.queryPort, defaults.steamPort, ...implicitPortsOf(template).map((i) => defaults.port + i.offset)];
		for (const taken of [8766, 27015, 27016]) assert.ok(!mine.includes(taken), `${taken} is in use by another template`);
		const others = GAME_TEMPLATES.filter((t) => t.id !== "theforest");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});
});

describe("The Forest start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts the exe minimized, as the egg's line does on Windows", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My Forest Server" TheForestDedicatedServer\.exe /);
	});

	it("writes the egg's arguments in the egg's order, with the Linux wrapper removed", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My Forest Server" TheForestDedicatedServer.exe -batchmode -nographics -serverPasswordAdmin "admin42" -inittype New -nosteamclient -savefolderpath "TheForestDedicatedServer_Data" -configfilepath "TheForestDedicatedServer_Data\\forest\\config\\config.cfg"',
		);
		assert.ok(!/wine|xvfb|winetricks|grep/i.test(script));
	});

	it("leaves the admin password off when none is typed", () => {
		const open = template.buildStartScript(params({ adminPassword: "" }));
		assert.ok(!open.includes("-serverPasswordAdmin"));
		assert.match(launchLine(open), /-nographics -inittype New -nosteamclient/);
	});

	it("uses the same config path on the command line as the panel writes the file to", () => {
		const { relPath } = template.buildConfigFile(params());
		assert.equal(relPath, CONFIG_REL);
		assert.ok(launchLine(script).includes(`-configfilepath "${CONFIG_REL}"`));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%' }));
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.match(launchLine(hostile), /^start \/MIN "[^"%&|<>^]*" TheForestDedicatedServer\.exe /);
		assert.ok(!/[%&|<>^]/.test(launchLine(hostile).replace(/^start \/MIN "[^"]*"/, "")));
	});

	it("refuses an admin password that would break the line", () => {
		assert.throws(() => template.buildStartScript(params({ adminPassword: 'a"b' })), /cannot carry safely/);
		assert.throws(() => template.buildStartScript(params({ adminPassword: "a%PATH%" })), /cannot carry safely/);
		assert.throws(() => template.buildStartScript(params({ adminPassword: "a\\" })), /cannot carry safely/);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("The Forest inputs", () => {
	it("refuses a name or password that a config line cannot hold", async () => {
		for (const bad of ["a\nb", "http://x//y"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot hold/, JSON.stringify(bad));
			await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: bad }), /cannot hold/, JSON.stringify(bad));
		}
		assert.equal(cfgText("  My Server's name! (1) \"quoted\"  ", "x"), 'My Server\'s name! (1) "quoted"');
	});

	it("refuses an admin password the start script cannot carry", async () => {
		await assert.rejects(template.resolveParams({ name: "x", adminPassword: "a&b" }), /cannot carry safely/);
		assert.equal(argText("  plain Pass1  ", "x"), "plain Pass1");
	});

	it("hands the cleaned values on from resolveParams", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", adminPassword: "" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", adminPassword: "" });
	});

	it("warns that the panel cannot stop the server cleanly, and about the config path", async () => {
		const out = await template.postWrite(params());
		assert.ok(out.warnings.some((w) => /Ctrl\+C/.test(w)));
		assert.ok(out.warnings.some((w) => /config\.cfg/.test(w)));
		const noAdmin = await template.postWrite(params({ adminPassword: "" }));
		assert.ok(noAdmin.warnings.some((w) => /admin password/.test(w)));
	});
});

describe("The Forest config.cfg as the panel writes it", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");
	const value = (key) => lines.find((l) => l.startsWith(`${key} `))?.slice(key.length + 1);

	it("goes under TheForestDedicatedServer_Data\\forest\\config", () => {
		assert.equal(relPath, CONFIG_REL);
	});

	it("writes the panel-managed lines with the values the form gave, name with spaces unquoted", () => {
		assert.equal(value("serverName"), "Friends Forest");
		assert.equal(value("serverPassword"), "secret1");
		assert.equal(value("serverGamePort"), "27455");
		assert.equal(value("serverQueryPort"), "27457");
		assert.equal(value("serverSteamPort"), "8770");
		assert.equal(value("initType"), "New");
		assert.equal(value("difficulty"), "Normal");
		assert.equal(value("serverPlayers"), "5");
	});

	it("falls back to the server's own name, and keeps a blank password line for an open server", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.match(open, /^serverName My Forest Server$/m);
		assert.match(open, /^serverPassword $/m);
	});

	it("keeps the player count to 1 to 8, the egg's 5 otherwise", () => {
		assert.equal(template.buildConfigFile(params({ maxPlayers: 8 })).content.match(/^serverPlayers (\d+)$/m)[1], "8");
		assert.equal(template.buildConfigFile(params({ maxPlayers: 9 })).content.match(/^serverPlayers (\d+)$/m)[1], "5");
		assert.equal(template.buildConfigFile(params({ maxPlayers: "x" })).content.match(/^serverPlayers (\d+)$/m)[1], "5");
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: "a\r\nb" })), /cannot hold/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a//b" })), /cannot hold/);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(content.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(content));
	});
});

describe("The Forest server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches TheForestDedicatedServer.exe, by process, with no RCON or query protocol", () => {
		assert.equal(entry.processName, "TheForestDedicatedServer.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "theforest");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});

	it("uses the ports the config file and the entry share", () => {
		assert.equal(entry.port, 27455);
		assert.equal(entry.queryPort, 27457);
		assert.equal(entry.steamPort, 8770);
		const { content } = template.buildConfigFile(params());
		assert.match(content, new RegExp(`^serverGamePort ${entry.port}$`, "m"));
		assert.match(content, new RegExp(`^serverQueryPort ${entry.queryPort}$`, "m"));
		assert.match(content, new RegExp(`^serverSteamPort ${entry.steamPort}$`, "m"));
	});

	it("records the start script, the folder and the config file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\forest\\Start_TheForest.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\forest");
		assert.equal(entry.installDir, "C:\\Servers\\forest\\");
		assert.equal(entry.updateAppId, "556450");
		assert.equal(entry.configPath, `C:\\Servers\\forest\\${CONFIG_REL}`);
		assert.deepEqual(entry.configPaths, { "config.cfg": `C:\\Servers\\forest\\${CONFIG_REL}` });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("The Forest backups and logs", () => {
	it("backs up the save and config folder, the folder the start command names", () => {
		assert.deepEqual(backup.paths.map((p) => [p.base, p.rel]), [["working", "TheForestDedicatedServer_Data"]]);
		assert.ok(backup.paths[0].label);
	});

	it("lists no log, since no source names one", () => {
		assert.deepEqual(logs, []);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { launchText } from "../../src/server/data/games/barotrauma.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Barotrauma, from the research dossier (nothing was run on a real install): server tool app 1026340, DedicatedServer.exe, a UDP game
// port and a UDP query port, name/ports/password on the launch line, no settings file written by the panel, no graceful stop.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Barotrauma Server",
	sessionName: "Sub Crew",
	serverPassword: "secret1",
	port: 27215,
	queryPort: 27217,
	installDir: "C:\\Servers\\baro",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-barotrauma-server",
	startScriptFilename: "Start_Barotrauma.bat",
	...extra,
});
const startLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Barotrauma module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "barotrauma");
		assert.equal(template.type, "barotrauma");
		assert.equal(template.displayName, "Barotrauma");
		assert.equal(template.method, "process");
	});

	it("installs the free dedicated server tool (1026340) into the folder root", () => {
		assert.equal(template.updateAppId, "1026340");
		assert.equal(template.storeAppId, "602960");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
		assert.ok(template.estimatedInstallBytes >= 200_000_000);
	});

	it("asks for a server name and a password, and has no mods field", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword"]);
		assert.ok(!template.fields.includes("mods"));
	});

	it("says in its description that there is no graceful stop and where the saves are", () => {
		assert.match(template.description, /cannot ask it to shut down properly/);
		assert.match(template.description, /Daedalic Entertainment GmbH/);
	});

	it("has a UDP game port and a UDP query port that are not another game's default nor the game's own 27015/27016", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		assert.match(template.ports[0].label, /UDP/);
		assert.match(template.ports[1].label, /UDP/);
		const taken = [7015, 7777, 8888, 8766, 9876, 15637, 16261, 25565, 26000, 27015, 27016, 28015, 8211, 8890, 8892, 8900, 8910, 8920, 7780, 8930, 17777, 7870, 8777, 27145, 27315, 27116];
		const port = template.ports[0].default;
		const mine = [port, template.ports[1].default, ...implicitPortsOf(template).map((i) => port + i.offset)];
		assert.equal(new Set(mine).size, mine.length);
		for (const m of mine) assert.ok(!taken.includes(m), `${m} is another game's default`);
	});

	it("fills the form with its own defaults (game port, then query port two above it)", () => {
		assert.equal(template.ports[0].default, 27215);
		assert.equal(template.ports[1].default, 27217);
	});
});

describe("Barotrauma start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = startLine(script);

	it("changes to its own folder and starts DedicatedServer.exe", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Barotrauma Server" DedicatedServer\.exe /);
		assert.equal(lines.filter((l) => l.startsWith("start ")).length, 1);
	});

	it("writes the sourced arguments, with the ports the entry records", () => {
		assert.match(launch, / -name "Sub Crew" /);
		assert.match(launch, / -port 27215 /);
		assert.match(launch, / -queryport 27217 /);
		assert.match(launch, / -public False /);
		assert.match(launch, / -maxplayers 10 /);
		const entry = template.buildServerEntry(params());
		assert.equal(Number(/-port (\d+)/.exec(launch)[1]), entry.port);
		assert.equal(Number(/-queryport (\d+)/.exec(launch)[1]), entry.queryPort);
	});

	it("puts the password on the line, or -nopassword when there is none", () => {
		assert.match(launch, / -password "secret1"$/);
		assert.ok(!launch.includes("-nopassword"));
		const open = startLine(template.buildStartScript(params({ serverPassword: "" })));
		assert.match(open, / -nopassword$/);
		assert.ok(!open.includes("-password"));
	});

	it("keeps spaces in a password", () => {
		assert.match(startLine(template.buildStartScript(params({ serverPassword: "two  words" }))), / -password "two {2}words"$/);
	});

	it("takes the ports and the player limit from the form, and keeps the limit between 1 and 16", () => {
		const custom = startLine(template.buildStartScript(params({ port: 27300, queryPort: 27302, maxPlayers: 12 })));
		assert.match(custom, / -port 27300 -queryport 27302 -public False -maxplayers 12 /);
		assert.match(startLine(template.buildStartScript(params({ maxPlayers: "abc" }))), / -maxplayers 10 /);
		assert.match(startLine(template.buildStartScript(params({ maxPlayers: 500 }))), / -maxplayers 16 /);
		assert.match(startLine(template.buildStartScript(params({ maxPlayers: 0 }))), / -maxplayers 10 /);
	});

	it("falls back to the server's name, and cuts a name to the game's 60 characters", () => {
		assert.match(startLine(template.buildStartScript(params({ sessionName: "" }))), / -name "My Barotrauma Server" /);
		const long = startLine(template.buildStartScript(params({ sessionName: "x".repeat(80) })));
		assert.match(long, new RegExp(` -name "x{60}" `));
	});

	it("never lets a character cmd acts on from the name or password into the script", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', sessionName: 'n" & del * & "!x\\', serverPassword: 'p" | calc ^ %X% !' }));
		const line = startLine(hostile);
		assert.match(line, /^start \/MIN "[^"%&|<>^!]*" DedicatedServer\.exe -name "[^"%&|<>^!\\]*" /);
		assert.match(line, / -password "[^"%&|<>^!\\]*"$/);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Barotrauma input checks", () => {
	it("refuses a name or password that cannot go on the launch line", async () => {
		for (const bad of ['a"b', "50%", "a&b", "a|b", "a<b", "a>b", "a^b", "wow!", "back\\slash", "line\nbreak"]) {
			assert.throws(() => launchText(bad, "The password"), /cannot go safely/, bad);
			await assert.rejects(() => template.resolveParams({ sessionName: bad }), /cannot go safely/);
			await assert.rejects(() => template.resolveParams({ serverPassword: bad }), /cannot go safely/);
		}
	});

	it("passes ordinary text through, trimmed, and uses the server name when no session name is given", async () => {
		assert.equal(launchText("  Sub Crew 2  ", "x"), "Sub Crew 2");
		assert.deepEqual(await template.resolveParams({ sessionName: " Sub Crew ", serverPassword: "pw 1" }), { sessionName: "Sub Crew", serverPassword: "pw 1" });
		assert.deepEqual(await template.resolveParams({ name: "Fallback" }), { sessionName: "Fallback", serverPassword: "" });
	});
});

describe("Barotrauma writes no settings file", () => {
	it("has no buildConfigFile, and the entry names no config file", () => {
		assert.equal(template.buildConfigFile, undefined);
		const entry = template.buildServerEntry(params());
		assert.equal(entry.configPath, undefined);
		assert.equal(entry.configPaths, undefined);
	});
});

describe("Barotrauma server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches DedicatedServer.exe, by process", () => {
		assert.equal(entry.processName, "DedicatedServer.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "barotrauma");
		assert.equal(entry.name, "My Barotrauma Server");
	});

	it("records the start script, the folder and the update app", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\baro\\Start_Barotrauma.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\baro");
		assert.equal(entry.installDir, "C:\\Servers\\baro\\");
		assert.equal(entry.steamCmdPath, "C:\\steamcmd\\steamcmd.exe");
		assert.equal(entry.updateAppId, "1026340");
		assert.equal(entry.autoUpdate, false);
	});

	it("has no RCON", () => {
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});

	it("names the start script file Start_Barotrauma.bat", () => {
		assert.equal(template.buildStartScriptFilename(params()), "Start_Barotrauma.bat");
	});
});

describe("Barotrauma first start warnings", () => {
	it("warns that Stop cannot save cleanly and that the settings file is the server's own", async () => {
		const out = await template.postWrite(params());
		assert.equal(out.warnings.length, 2);
		assert.match(out.warnings[0], /cannot be stopped cleanly/);
		assert.match(out.warnings[0], /mid-round|round/);
		assert.match(out.warnings[1], /serversettings\.xml/);
	});
});

describe("Barotrauma backups and logs", () => {
	it("keeps what is in the server folder, and does not pretend to keep the saves in the user profile", () => {
		const rels = backup.paths.map((p) => p.rel);
		for (const rel of ["serversettings.xml", "config_player.xml", "Data/clientpermissions.xml", "Data/bannedplayers.txt", "LocalMods"]) assert.ok(rels.includes(rel), rel);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
			assert.ok(!/AppData|LocalAppData|\.\./i.test(p.rel), p.rel);
			assert.ok(!p.rel.includes("\\"), p.rel);
		}
	});

	it("lists the server logs folder and the crash report", () => {
		assert.deepEqual(logs.map((l) => [l.kind, l.base, l.rel]), [["dir", "working", "ServerLogs"], ["file", "working", "servercrashreport.log"]]);
		for (const l of logs) assert.ok(l.label);
	});
});

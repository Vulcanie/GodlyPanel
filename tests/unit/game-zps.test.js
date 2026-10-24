import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cfgText, cleanLoginToken } from "../../src/server/data/games/zps.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Zombie Panic! Source, from the research dossier (nothing was run on a real install of this game): server app 17505, srcds.exe, one
// game port, a server.cfg the panel writes, an optional login token.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My ZPS Server",
	sessionName: "Friends Biotec",
	serverPassword: "secret1",
	port: 25952,
	installDir: "C:\\Servers\\zps",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-zps-server",
	startScriptFilename: "Start_ZPS.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Zombie Panic! Source module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "zps");
		assert.equal(template.type, "zps");
		assert.equal(template.displayName, "Zombie Panic! Source");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (17505) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "17505");
		assert.equal(template.storeAppId, "17500");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password, a map and a login token, and no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode", "gslt"]);
		assert.ok(template.fieldMeta.gslt.label.length > 20);
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["zpo_biotec"]);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port (25952) that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 25952);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "zps");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
		assert.ok(![27015, 27005, 27020, 26900].includes(template.ports[0].default), "not one of srcds's own default ports");
	});
});

describe("Zombie Panic! Source start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My ZPS Server" srcds\.exe /);
	});

	it("writes the arguments the sources agree on", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My ZPS Server" srcds.exe -console -game zps -dedicated -secure -port 25952 -strictportbind -maxplayers 20 +map zpo_biotec',
		);
	});

	it("does not run a config file by name: the dossier says the game runs zps\\cfg\\server.cfg itself", () => {
		assert.ok(!/\+exec|servercfgfile/.test(script));
	});

	it("never offers -tickrate or the arguments the research did not name for this game", () => {
		assert.ok(!/tickrate|condebug|autoupdate/i.test(script));
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 25952 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 25962, maxPlayers: 12, mapCode: "zpo_example" }));
		assert.match(custom, / -port 25962 /);
		assert.match(custom, / -maxplayers 12 /);
		assert.match(custom, / \+map zpo_example$/m);
	});

	it("adds the login token when given", () => {
		const full = template.buildStartScript(params({ gslt: "ABCDEF0123456789ABCDEF0123456789" }));
		assert.match(launchLine(full), / \+map zpo_biotec \+sv_setsteamaccount ABCDEF0123456789ABCDEF0123456789$/);
		assert.ok(!/sv_setsteamaccount/.test(script));
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Biotec"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', gslt: "x & calc", mapCode: "zpo & calc", maxPlayers: "4 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map zpo_biotec$/m);
		assert.match(launch, / -maxplayers 20 /);
		assert.ok(!/sv_setsteamaccount/.test(launch));
	});

	it("keeps the player limit to a whole number from 1 to 24", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / -maxplayers 20 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 25 })), / -maxplayers 20 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 24 })), / -maxplayers 24 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Zombie Panic! Source inputs", () => {
	it("refuses a name or password that would change what a config line does", async () => {
		for (const bad of ['a"b', "a;b", "a\\b", "http://x", "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot hold safely/, JSON.stringify(bad));
			await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: bad }), /cannot hold safely/, JSON.stringify(bad));
		}
		assert.equal(cfgText("  My Server's name! (1)  ", "x"), "My Server's name! (1)");
	});

	it("accepts a login token as one piece of text only", () => {
		assert.equal(cleanLoginToken("  ABCDEF0123456789 "), "ABCDEF0123456789");
		assert.equal(cleanLoginToken(""), "");
		for (const bad of ["a b", 'a"b', "a&b", "%x%", "x".repeat(65)]) assert.throws(() => cleanLoginToken(bad), /login token/, bad);
	});

	it("hands the cleaned values on from resolveParams", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "", gslt: " TOKEN123 " });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "zpo_biotec", gslt: "TOKEN123" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "zpo_biotec & calc" }), /not a map name/);
	});
});

describe("Zombie Panic! Source server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the game's cfg folder, named server.cfg", () => {
		assert.equal(relPath, "zps\\cfg\\server.cfg");
	});

	it("writes the name, the password and sv_lan as console lines", () => {
		assert.ok(lines.includes('hostname "Friends Biotec"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines.includes("sv_lan 0"));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My ZPS Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("Zombie Panic! Source server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "zps");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\zps\\Start_ZPS.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\zps");
		assert.equal(entry.installDir, "C:\\Servers\\zps\\");
		assert.equal(entry.updateAppId, "17505");
		assert.equal(entry.configPath, "C:\\Servers\\zps\\zps\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\zps\\zps\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Zombie Panic! Source backups and logs", () => {
	it("backs up the settings, admin and Workshop data, and the map lists, and nothing else", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["zps/cfg", "zps/data", "zps/default_plugins.json", "zps/mapcycle.txt", "zps/maplist.txt"]);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("lists no log, since the research names none for this game", () => {
		assert.deepEqual(logs, []);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cfgText, cleanLoginToken } from "../../src/server/data/games/l4d.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Left 4 Dead, from the research dossier (nothing was run on a real install of this game): server app 222840, srcds.exe, one game
// port, a server.cfg the panel writes, an optional login token.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My L4D Server",
	sessionName: "Friends Apartment",
	serverPassword: "secret1",
	port: 25950,
	installDir: "C:\\Servers\\l4d",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-l4d-server",
	startScriptFilename: "Start_L4D.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Left 4 Dead module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "l4d");
		assert.equal(template.type, "l4d");
		assert.equal(template.displayName, "Left 4 Dead");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (222840) into the folder root, with the game's app 500 for the store", () => {
		assert.equal(template.updateAppId, "222840");
		assert.equal(template.storeAppId, "500");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password, a map and a login token, and no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode", "gslt"]);
		assert.ok(template.fieldMeta.gslt.label.length > 20);
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["l4d_hospital01_apartment"]);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port (25950) that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 25950);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "l4d");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
		assert.ok(![27015, 27005, 27020, 26900].includes(template.ports[0].default), "not one of srcds's own default ports");
	});
});

describe("Left 4 Dead start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My L4D Server" srcds\.exe /);
	});

	it("writes the arguments the sources agree on", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My L4D Server" srcds.exe -console -game left4dead -port 25950 +maxplayers 8 +map l4d_hospital01_apartment +exec server.cfg',
		);
	});

	it("never offers -tickrate, which the dossier says cannot be changed in this game, nor -condebug (not in the research)", () => {
		assert.ok(!/tickrate/i.test(script));
		assert.ok(!/condebug/i.test(script));
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 25950 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 25960, maxPlayers: 4, mapCode: "l4d_hospital02_subway" }));
		assert.match(custom, / -port 25960 /);
		assert.match(custom, / \+maxplayers 4 /);
		assert.match(custom, / \+map l4d_hospital02_subway /);
	});

	it("adds the login token when given", () => {
		const full = template.buildStartScript(params({ gslt: "ABCDEF0123456789ABCDEF0123456789" }));
		assert.match(launchLine(full), / \+exec server\.cfg \+sv_setsteamaccount ABCDEF0123456789ABCDEF0123456789$/);
		assert.ok(!/sv_setsteamaccount/.test(script));
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Apartment"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', gslt: "x & calc", mapCode: "l4d & calc", maxPlayers: "4 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map l4d_hospital01_apartment /);
		assert.match(launch, / \+maxplayers 8 /);
		assert.ok(!/sv_setsteamaccount/.test(launch));
	});

	it("keeps the player limit to a whole number from 1 to 8", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / \+maxplayers 8 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 9 })), / \+maxplayers 8 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 0 })), / \+maxplayers 8 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 4 })), / \+maxplayers 4 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Left 4 Dead inputs", () => {
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
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "l4d_hospital01_apartment", gslt: "TOKEN123" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "l4d_hospital01 & calc" }), /not a map name/);
	});
});

describe("Left 4 Dead server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the game's cfg folder, named server.cfg", () => {
		assert.equal(relPath, "left4dead\\cfg\\server.cfg");
	});

	it("writes the name, the password and sv_lan as console lines", () => {
		assert.ok(lines.includes('hostname "Friends Apartment"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines.includes("sv_lan 0"));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My L4D Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("Left 4 Dead server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "l4d");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\l4d\\Start_L4D.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\l4d");
		assert.equal(entry.installDir, "C:\\Servers\\l4d\\");
		assert.equal(entry.updateAppId, "222840");
		assert.equal(entry.configPath, "C:\\Servers\\l4d\\left4dead\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\l4d\\left4dead\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Left 4 Dead backups and logs", () => {
	it("backs up the settings folder and nothing else", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["left4dead/cfg"]);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("lists no log, since the research names none for this game", () => {
		assert.deepEqual(logs, []);
	});
});

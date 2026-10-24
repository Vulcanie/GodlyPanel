import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cfgText, cleanLoginToken } from "../../src/server/data/games/brainbread2.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// BrainBread 2, from the research dossier (nothing was run on a real install of this game): server app 475370, srcds.exe, one game
// port, a server.cfg the panel writes, an optional login token.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My BB2 Server",
	sessionName: "Friends Termoil",
	serverPassword: "secret1",
	port: 25954,
	installDir: "C:\\Servers\\bb2",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-bb2-server",
	startScriptFilename: "Start_BB2.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("BrainBread 2 module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "brainbread2");
		assert.equal(template.type, "brainbread2");
		assert.equal(template.displayName, "BrainBread 2");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (475370) into the folder root, with the game's app 346330 for the store", () => {
		assert.equal(template.updateAppId, "475370");
		assert.equal(template.storeAppId, "346330");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password, a map and a login token, and no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode", "gslt"]);
		assert.ok(template.fieldMeta.gslt.label.length > 20);
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["bbc_termoil"]);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port (25954) that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 25954);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "brainbread2");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
		assert.ok(![27015, 27005, 27020, 26900].includes(template.ports[0].default), "not one of srcds's own default ports");
	});
});

describe("BrainBread 2 start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My BB2 Server" srcds\.exe /);
	});

	it("writes the arguments in the order of the vendor guide's example, with the panel's port", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My BB2 Server" srcds.exe -console -game BrainBread2 -secure +map bbc_termoil +maxplayers 12 -port 25954 +ip 0.0.0.0 +exec server.cfg',
		);
	});

	it("never offers -tickrate or the arguments the research did not name for this game", () => {
		assert.ok(!/tickrate|condebug|autoupdate|strictportbind/i.test(script));
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 25954 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 25964, maxPlayers: 16, mapCode: "bba_barracks" }));
		assert.match(custom, / -port 25964 /);
		assert.match(custom, / \+maxplayers 16 /);
		assert.match(custom, / \+map bba_barracks /);
	});

	it("adds the login token when given", () => {
		const full = template.buildStartScript(params({ gslt: "ABCDEF0123456789ABCDEF0123456789" }));
		assert.match(launchLine(full), / \+exec server\.cfg \+sv_setsteamaccount ABCDEF0123456789ABCDEF0123456789$/);
		assert.ok(!/sv_setsteamaccount/.test(script));
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Termoil"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', gslt: "x & calc", mapCode: "bbc & calc", maxPlayers: "10 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map bbc_termoil /);
		assert.match(launch, / \+maxplayers 12 /);
		assert.ok(!/sv_setsteamaccount/.test(launch));
	});

	it("keeps the player limit to a whole number from 1 to 64", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / \+maxplayers 12 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 65 })), / \+maxplayers 12 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 64 })), / \+maxplayers 64 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("BrainBread 2 inputs", () => {
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
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "bbc_termoil", gslt: "TOKEN123" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "bbc_termoil & calc" }), /not a map name/);
	});
});

describe("BrainBread 2 server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the game's cfg folder, named server.cfg", () => {
		assert.equal(relPath, "brainbread2\\cfg\\server.cfg");
	});

	it("writes the name, the password and sv_lan as console lines", () => {
		assert.ok(lines.includes('hostname "Friends Termoil"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines.includes("sv_lan 0"));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My BB2 Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("BrainBread 2 server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "brainbread2");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\bb2\\Start_BB2.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\bb2");
		assert.equal(entry.installDir, "C:\\Servers\\bb2\\");
		assert.equal(entry.updateAppId, "475370");
		assert.equal(entry.configPath, "C:\\Servers\\bb2\\brainbread2\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\bb2\\brainbread2\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("BrainBread 2 backups and logs", () => {
	it("backs up the settings and custom content folders and nothing else", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["brainbread2/cfg", "brainbread2/custom"]);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("lists no log, since the research names none for this game", () => {
		assert.deepEqual(logs, []);
	});
});

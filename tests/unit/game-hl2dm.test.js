import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cfgText, cleanLoginToken } from "../../src/server/data/games/hl2dm.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Half-Life 2: Deathmatch, from the research dossier (nothing was run on a real install of this game): server app 232370, srcds.exe,
// one game port, a server.cfg the panel writes, an optional login token.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My HL2DM Server",
	sessionName: "Friends Frag",
	serverPassword: "secret1",
	port: 27435,
	installDir: "C:\\Servers\\hl2dm",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-hl2dm-server",
	startScriptFilename: "Start_HL2DM.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Half-Life 2: Deathmatch module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "hl2dm");
		assert.equal(template.type, "hl2dm");
		assert.equal(template.displayName, "Half-Life 2: Deathmatch");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (232370) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "232370");
		assert.equal(template.storeAppId, "320");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password, a map and a login token, and no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode", "gslt"]);
		assert.ok(template.fieldMeta.gslt.label.length > 20);
		assert.deepEqual(template.mapChoices.map((m) => m.code), [
			"dm_lockdown", "dm_overwatch", "dm_powerhouse", "dm_resistance", "dm_runoff", "dm_steamlab", "dm_underpass", "halls3",
		]);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "hl2dm");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
		assert.ok(![27015, 27005, 27020, 26900, 27515].includes(template.ports[0].default), "not one of srcds's own default ports, nor CS:S's");
	});
});

describe("Half-Life 2: Deathmatch start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My HL2DM Server" srcds\.exe /);
	});

	it("writes the arguments the sources agree on", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My HL2DM Server" srcds.exe -console -game hl2mp -port 27435 -strictportbind +maxplayers 16 +map dm_lockdown -condebug',
		);
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 27435 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 27600, maxPlayers: 8, mapCode: "dm_runoff" }));
		assert.match(custom, / -port 27600 /);
		assert.match(custom, / \+maxplayers 8 /);
		assert.match(custom, / \+map dm_runoff /);
	});

	it("adds the login token when given", () => {
		const full = template.buildStartScript(params({ gslt: "ABCDEF0123456789ABCDEF0123456789" }));
		assert.match(launchLine(full), / -condebug \+sv_setsteamaccount ABCDEF0123456789ABCDEF0123456789$/);
		assert.ok(!/sv_setsteamaccount/.test(script));
	});

	it("keeps the password and the server name out of the script, and does not exec the config", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Frag"));
		assert.ok(!/sv_password|hostname|\+exec/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', gslt: "x & calc", mapCode: "dm & calc", maxPlayers: "10 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map dm_lockdown /);
		assert.match(launch, / \+maxplayers 16 /);
		assert.ok(!/sv_setsteamaccount/.test(launch));
	});

	it("keeps the player limit to a whole number from 1 to 24", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / \+maxplayers 16 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 500 })), / \+maxplayers 16 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 24 })), / \+maxplayers 24 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 0 })), / \+maxplayers 16 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Half-Life 2: Deathmatch inputs", () => {
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
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "dm_lockdown", gslt: "TOKEN123" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "dm_lockdown & calc" }), /not a map name/);
	});
});

describe("Half-Life 2: Deathmatch server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the game's cfg folder, named server.cfg", () => {
		assert.equal(relPath, "hl2mp\\cfg\\server.cfg");
	});

	it("writes the name, the password and sv_lan as console lines", () => {
		assert.ok(lines.includes('hostname "Friends Frag"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines.includes("sv_lan 0"));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My HL2DM Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("Half-Life 2: Deathmatch server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "hl2dm");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\hl2dm\\Start_HL2DM.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\hl2dm");
		assert.equal(entry.installDir, "C:\\Servers\\hl2dm\\");
		assert.equal(entry.updateAppId, "232370");
		assert.equal(entry.configPath, "C:\\Servers\\hl2dm\\hl2mp\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\hl2dm\\hl2mp\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Half-Life 2: Deathmatch backups and logs", () => {
	it("backs up the settings folder and the hand-added custom maps", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["hl2mp/cfg", "hl2mp/custom"]);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("lists the console log the launch line asks for", () => {
		assert.deepEqual(logs.map((l) => [l.kind, l.base, l.rel]), [["file", "working", "hl2mp/console.log"]]);
		assert.match(launchLine(template.buildStartScript(params())), / -condebug$/);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cfgText, cleanLoginToken } from "../../src/server/data/games/counterstrike2.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Counter-Strike 2, from the research dossier (nothing was run on a real install): server app 730, cs2.exe in game\bin\win64, one game
// port, a server.cfg the panel writes, an optional login token, and no RCON.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My CS2 Server",
	sessionName: "Friends Match",
	serverPassword: "secret1",
	port: 27065,
	installDir: "C:\\Servers\\cs2",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-cs2-server",
	startScriptFilename: "Start_CS2.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Counter-Strike 2 module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "counterstrike2");
		assert.equal(template.type, "counterstrike2");
		assert.equal(template.displayName, "Counter-Strike 2");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (730) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "730");
		assert.equal(template.storeAppId, "730");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password, a map and an optional login token, and no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode", "gslt"]);
		assert.ok(template.fieldMeta.gslt.label.includes("optional"));
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["de_dust2", "de_inferno"]);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port that no other template uses, inside 27015 to 27099 and clear of 8030-8043 and 25990", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const port = template.ports[0].default;
		assert.ok(port >= 27015 && port <= 27099, `${port} is outside 27015-27099`);
		assert.ok(!(port >= 8030 && port <= 8043) && port !== 25990);
		const mine = [port, ...implicitPortsOf(template).map((i) => port + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "counterstrike2");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});
});

describe("Counter-Strike 2 start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to the folder with cs2.exe and starts it from there", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0game\\bin\\win64"');
		assert.match(launchLine(script), /^start \/MIN "My CS2 Server" cs2\.exe /);
	});

	it("writes the arguments the sources agree on, with no token and no password", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My CS2 Server" cs2.exe -dedicated -port 27065 -maxplayers 10 +map de_dust2 +exec server.cfg',
		);
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 27065 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 27080, maxPlayers: 12, mapCode: "de_inferno" }));
		assert.match(custom, / -port 27080 /);
		assert.match(custom, / -maxplayers 12 /);
		assert.match(custom, / \+map de_inferno /);
	});

	it("adds the login token only when given, before the map", () => {
		const full = template.buildStartScript(params({ gslt: "ABCDEF0123456789ABCDEF0123456789" }));
		assert.match(launchLine(full), / -maxplayers 10 \+sv_setsteamaccount ABCDEF0123456789ABCDEF0123456789 \+map de_dust2 \+exec server\.cfg$/);
		assert.ok(!/sv_setsteamaccount/.test(script));
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Match"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', gslt: "x & calc", mapCode: "de & calc", maxPlayers: "10 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" cs2\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map de_dust2 /);
		assert.match(launch, / -maxplayers 10 /);
		assert.ok(!/sv_setsteamaccount/.test(launch));
	});

	it("keeps the player limit to a whole number from 1 to 64", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / -maxplayers 10 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 500 })), / -maxplayers 10 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 64 })), / -maxplayers 64 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 0 })), / -maxplayers 10 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Counter-Strike 2 inputs", () => {
	it("refuses a name or password that would change what a config line does", async () => {
		for (const bad of ['a"b', "a;b", "a\\b", "http://x", "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot hold safely/, JSON.stringify(bad));
			await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: bad }), /cannot hold safely/, JSON.stringify(bad));
		}
		assert.equal(cfgText("  My Server's name! (1)  ", "x"), "My Server's name! (1)");
	});

	it("accepts a login token as one piece of text only, and an empty one means none", () => {
		assert.equal(cleanLoginToken("  ABCDEF0123456789 "), "ABCDEF0123456789");
		assert.equal(cleanLoginToken(""), "");
		for (const bad of ["a b", 'a"b', "a&b", "%x%", "x".repeat(65)]) assert.throws(() => cleanLoginToken(bad), /login token/, bad);
	});

	it("hands the cleaned values on from resolveParams, and refuses a map name with odd characters", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "", gslt: " TOKEN123 " });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "de_dust2", gslt: "TOKEN123" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "de_dust2 & calc" }), /not a map name/);
	});
});

describe("Counter-Strike 2 config files", () => {
	it("writes server.cfg with the name, the password and sv_lan 0, and nothing else", () => {
		const { relPath, content } = template.buildConfigFile(params());
		assert.equal(relPath, "game\\csgo\\cfg\\server.cfg");
		assert.equal(content, 'hostname "Friends Match"\r\nsv_password "secret1"\r\nsv_lan 0\r\n');
	});

	it("leaves out the password line when there is none", () => {
		const { content } = template.buildConfigFile(params({ serverPassword: "" }));
		assert.ok(!/sv_password/.test(content));
		assert.match(content, /^sv_lan 0\r\n$/m);
	});

	it("lists both settings files in the entry, the mode file pointing into the same folder, and no RCON", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(entry.type, "counterstrike2");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "cs2.exe");
		assert.equal(entry.updateAppId, "730");
		assert.equal(entry.configPaths["server.cfg"], "C:\\Servers\\cs2\\game\\csgo\\cfg\\server.cfg");
		assert.equal(entry.configPaths["gamemode_competitive_server.cfg"], "C:\\Servers\\cs2\\game\\csgo\\cfg\\gamemode_competitive_server.cfg");
		assert.equal(entry.rconPort, undefined);
	});

	it("backs up the config and addon folders, and lists no logs", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["game/csgo/cfg", "game/csgo/addons"]);
		assert.deepEqual(logs, []);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cfgText, cleanLoginToken } from "../../src/server/data/games/teamfortress2.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Team Fortress 2, from the research dossier (nothing was run on a real install of this game): server app 232250, srcds.exe, one
// game port, a server.cfg the panel writes, an optional login token.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My TF2 Server",
	sessionName: "Friends Payload",
	serverPassword: "secret1",
	port: 27615,
	installDir: "C:\\Servers\\tf2",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-tf2-server",
	startScriptFilename: "Start_TF2.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Team Fortress 2 module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "teamfortress2");
		assert.equal(template.type, "teamfortress2");
		assert.equal(template.displayName, "Team Fortress 2");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (232250) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "232250");
		assert.equal(template.storeAppId, "440");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password, a map and an optional login token, and no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode", "gslt"]);
		assert.ok(template.fieldMeta.gslt.label.includes("optional"));
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["ctf_2fort"]);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "teamfortress2");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
		const port = template.ports[0].default;
		assert.ok(![27015, 27005, 27020, 26900, 27515].includes(port), "not one of srcds's own default ports, nor CS:S's");
		assert.ok(port < 8030 || port > 8043, "outside 8030-8043");
		assert.notEqual(port, 25990);
	});

});

describe("Team Fortress 2 start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My TF2 Server" srcds\.exe /);
	});

	it("writes the arguments the dossier's start lines agree on", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My TF2 Server" srcds.exe -console -game tf -port 27615 -strictportbind +maxplayers 24 +map ctf_2fort +exec server.cfg -condebug',
		);
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 27615 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 27700, maxPlayers: 12, mapCode: "ctf_turbine" }));
		assert.match(custom, / -port 27700 /);
		assert.match(custom, / \+maxplayers 12 /);
		assert.match(custom, / \+map ctf_turbine /);
	});

	it("adds the login token when given, and only then", () => {
		const full = template.buildStartScript(params({ gslt: "ABCDEF0123456789ABCDEF0123456789" }));
		assert.match(launchLine(full), / -condebug \+sv_setsteamaccount ABCDEF0123456789ABCDEF0123456789$/);
		assert.ok(!/sv_setsteamaccount/.test(script));
	});

	it("keeps the password and the server name out of the script, and does not set them on the line", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Payload"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', gslt: "x & calc", mapCode: "ctf & calc", maxPlayers: "10 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map ctf_2fort /);
		assert.match(launch, / \+maxplayers 24 /);
		assert.ok(!/sv_setsteamaccount/.test(launch));
	});

	it("keeps the player limit to a whole number from 1 to 32", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / \+maxplayers 24 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 500 })), / \+maxplayers 24 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 32 })), / \+maxplayers 32 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 0 })), / \+maxplayers 24 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Team Fortress 2 inputs", () => {
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

	it("hands the cleaned values on from resolveParams, and works with no token", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "", gslt: " TOKEN123 " });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "ctf_2fort", gslt: "TOKEN123" });
		const none = await template.resolveParams({ name: "x", sessionName: "Friends" });
		assert.equal(none.gslt, "");
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "ctf_2fort & calc" }), /not a map name/);
	});
});

describe("Team Fortress 2 server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is written in the game's cfg folder as plain text", () => {
		assert.equal(relPath, "tf\\cfg\\server.cfg");
		assert.ok(!relPath.endsWith(".txt"));
	});

	it("holds the name and, when set, the password, one per line", () => {
		assert.ok(lines.includes('hostname "Friends Payload"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out when none is set", () => {
		const open = template.buildConfigFile(params({ serverPassword: "" })).content;
		assert.ok(!/sv_password/.test(open));
	});

	it("uses CRLF line endings", () => {
		assert.ok(!/[^\r]\n/.test(content));
	});
});

describe("Team Fortress 2 server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names srcds.exe as the process to watch, in the install folder", () => {
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.type, "teamfortress2");
		assert.equal(entry.method, "process");
		assert.equal(entry.updateAppId, "232250");
		assert.equal(entry.configPaths["server.cfg"], "C:\\Servers\\tf2\\tf\\cfg\\server.cfg");
		assert.equal(entry.startScriptPath, "C:\\Servers\\tf2\\Start_TF2.bat");
	});

	it("has no RCON fields, since the panel stops the window instead", () => {
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});
});

describe("Team Fortress 2 backup and logs", () => {
	it("backs up the cfg folder and reads the console log", () => {
		assert.deepEqual(backup.paths, [{ base: "working", rel: "tf/cfg", label: "Server settings, map rotation and custom-content lists" }]);
		assert.deepEqual(logs, [{ kind: "file", base: "working", rel: "tf/console.log", label: "Console log" }]);
	});
});

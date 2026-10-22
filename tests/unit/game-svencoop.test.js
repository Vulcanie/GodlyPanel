import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cfgText } from "../../src/server/data/games/svencoop.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Sven Co-op, from the research dossier (nothing was run on a real install): server app 276060, SvenDS.exe, one game port,
// name and password in svencoop\server.cfg, no login token and no mods.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Sven Server",
	sessionName: "Friends Co-op",
	serverPassword: "secret1",
	port: 27355,
	installDir: "C:\\Servers\\sven",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-sven-server",
	startScriptFilename: "Start_SvenCoop.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Sven Co-op module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "svencoop");
		assert.equal(template.type, "svencoop");
		assert.equal(template.displayName, "Sven Co-op");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (276060) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "276060");
		assert.equal(template.storeAppId, "225840");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password and a map only", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode"]);
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["stadium4"]);
	});

	it("has one game port that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "svencoop");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
		assert.ok(![27015, 26900].includes(template.ports[0].default), "not one of the server's own default ports");
	});
});

describe("Sven Co-op start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts SvenDS.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My Sven Server" SvenDS\.exe /);
	});

	it("writes the arguments the manual and the wiki agree on", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My Sven Server" SvenDS.exe -console -port 27355 +maxplayers 12 +servercfgfile server.cfg +map stadium4 +log on',
		);
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 27355 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 27400, maxPlayers: 24, mapCode: "_server_start" }));
		assert.match(custom, / -port 27400 /);
		assert.match(custom, / \+maxplayers 24 /);
		assert.match(custom, / \+map _server_start /);
	});

	it("has no login token, no mods and no anti-cheat arguments the sources do not explain", () => {
		assert.ok(!/sv_setsteamaccount|workshop|authkey|-secure|-noipx|-game /i.test(script));
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Co-op"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', mapCode: "stadium4 & calc", maxPlayers: "20 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" SvenDS\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map stadium4 /);
		assert.match(launch, / \+maxplayers 12 /);
	});

	it("keeps the player limit to a whole number from 2 to 32", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / \+maxplayers 12 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 33 })), / \+maxplayers 12 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 1 })), / \+maxplayers 12 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 2 })), / \+maxplayers 2 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 32 })), / \+maxplayers 32 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Sven Co-op inputs", () => {
	it("refuses a name or password that would change what a config line does", async () => {
		for (const bad of ['a"b', "a;b", "a\\b", "http://x", "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot hold safely/, JSON.stringify(bad));
			await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: bad }), /cannot hold safely/, JSON.stringify(bad));
		}
		assert.equal(cfgText("  My Server's name! (1)  ", "x"), "My Server's name! (1)");
	});

	it("hands the cleaned values on from resolveParams", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "stadium4" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "stadium4 & calc" }), /not a map name/);
	});

	it("warns that the only documented stop is closing the window", async () => {
		const out = await template.postWrite(params());
		assert.equal(out.warnings.length, 1);
		assert.match(out.warnings[0], /Stop/);
	});
});

describe("Sven Co-op server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("goes in the game folder, not into the install root", () => {
		assert.equal(relPath, "svencoop\\server.cfg");
	});

	it("starts with the name, as the wiki asks, and writes the password as a quoted line", () => {
		assert.equal(lines[0], 'hostname "Friends Co-op"');
		assert.ok(lines.includes('sv_password "secret1"'));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My Sven Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("Sven Co-op server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches SvenDS.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "SvenDS.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "svencoop");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the config file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\sven\\Start_SvenCoop.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\sven");
		assert.equal(entry.installDir, "C:\\Servers\\sven\\");
		assert.equal(entry.updateAppId, "276060");
		assert.equal(entry.configPath, "C:\\Servers\\sven\\svencoop\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\sven\\svencoop\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Sven Co-op backups and logs", () => {
	it("backs up the settings, the lists, the profiles and the hand-added maps", () => {
		const rels = backup.paths.map((p) => p.rel);
		for (const rel of ["svencoop/server.cfg", "svencoop/admins.txt", "svencoop/banned.cfg", "svencoop/listip.cfg", "svencoop/servers", "svencoop_addons"]) assert.ok(rels.includes(rel), rel);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("lists the log folder the launch line's +log on writes to (default logs)", () => {
		assert.deepEqual(logs.map((l) => [l.kind, l.base, l.rel]), [["dir", "working", "svencoop/logs"]]);
		assert.match(launchLine(template.buildStartScript(params())), / \+log on$/);
	});
});

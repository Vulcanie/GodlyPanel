import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cfgText } from "../../src/server/data/games/bladesymphony.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Blade Symphony, from the research dossier (nothing was run on a real install): server app 228780, srcds.exe, one game port
// (given with -port, which is not confirmed for this game), name and password in berimbau\cfg\server.cfg, no login token, no mods.

const { template, backup, logs, launchOptions } = game;
const INSTALL = "C:\\Servers\\blade";
const params = (extra = {}) => ({
	name: "My Blade Server",
	sessionName: "Friends Duels",
	serverPassword: "secret1",
	port: 27034,
	installDir: INSTALL,
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-blade-server",
	startScriptFilename: "Start_BladeSymphony.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Blade Symphony module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "bladesymphony");
		assert.equal(template.type, "bladesymphony");
		assert.equal(template.displayName, "Blade Symphony");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (228780) into the folder root; the game itself is 225600", () => {
		assert.equal(template.updateAppId, "228780");
		assert.equal(template.storeAppId, "225600");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password and a map", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode"]);
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["duel_winter"]);
	});

	it("has one game port that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		for (const t of GAME_TEMPLATES.filter((x) => x.id !== "bladesymphony")) {
			const theirs = new Set();
			for (const p of t.ports) {
				theirs.add(p.default);
				for (const i of implicitPortsOf(t)) theirs.add(p.default + i.offset);
			}
			for (const port of mine) assert.ok(!theirs.has(port), `${port} clashes with ${t.id}`);
		}
		assert.notEqual(template.ports[0].default, 27015, "not the Source default");
	});
});

describe("Blade Symphony start script", () => {
	const script = template.buildStartScript(params());

	it("changes to its own folder and starts srcds.exe with the official arguments, plus the port", () => {
		assert.equal(script.split("\r\n")[0], "@echo off");
		assert.equal(script.split("\r\n")[1], 'cd /d "%~dp0"');
		assert.equal(
			launchLine(script),
			'start /MIN "My Blade Server" srcds.exe -console -port 27034 +maxplayers 16 +map duel_winter',
		);
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 27034 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		assert.match(template.buildStartScript(params({ port: 27400 })), / -port 27400 /);
	});

	it("uses a map name only when it is a plain name, otherwise duel_winter", () => {
		assert.match(template.buildStartScript(params({ mapCode: "duel_temple" })), / \+map duel_temple$/m);
		assert.match(template.buildStartScript(params({ mapCode: "duel_temple & calc" })), / \+map duel_winter$/m);
	});

	it("never lets a character cmd acts on into the title, and keeps one start line", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', mapCode: "x & calc" }));
		assert.match(launchLine(hostile), /^start \/MIN "[^"%&|<>^]*" srcds\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launchLine(hostile).replace(/^start \/MIN "[^"]*"/, "")));
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});

	it("keeps the password and the name out of the script, and adds no login token or mod argument", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Duels"));
		assert.ok(!/sv_setsteamaccount|-game |workshop|authkey/i.test(script));
	});
});

describe("Blade Symphony server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("goes in berimbau\\cfg, not in the install root", () => {
		assert.equal(relPath, "berimbau\\cfg\\server.cfg");
	});

	it("starts with the name and writes the password as a quoted line", () => {
		assert.equal(lines[0], 'hostname "Friends Duels"');
		assert.ok(lines.includes('sv_password "secret1"'));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My Blade Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "http://x" })), /cannot hold safely/);
	});
});

describe("Blade Symphony inputs", () => {
	it("refuses a name or password that would change what a config line does", async () => {
		for (const bad of ['a"b', "a;b", "a\\b", "http://x", "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot hold safely/, JSON.stringify(bad));
		}
		assert.equal(cfgText("  My Server's name! (1)  ", "x"), "My Server's name! (1)");
	});

	it("hands the cleaned values on, and refuses a map name that is not a plain name", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "duel_winter" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "duel_winter & calc" }), /not a map name/);
	});
});

describe("Blade Symphony server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "bladesymphony");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the config file", () => {
		assert.equal(entry.startScriptPath, `${INSTALL}\\Start_BladeSymphony.bat`);
		assert.equal(entry.workingDir, INSTALL);
		assert.equal(entry.installDir, `${INSTALL}\\`);
		assert.equal(entry.updateAppId, "228780");
		assert.equal(entry.configPath, `${INSTALL}\\berimbau\\cfg\\server.cfg`);
		assert.deepEqual(entry.configPaths, { "server.cfg": `${INSTALL}\\berimbau\\cfg\\server.cfg` });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Blade Symphony backups and logs", () => {
	it("backs up the settings folder and the hand-added maps", () => {
		const rels = backup.paths.map((p) => p.rel);
		assert.deepEqual(rels, ["berimbau/cfg", "berimbau/maps"]);
		for (const p of backup.paths) assert.equal(p.base, "working");
	});

	it("lists no log folder, since the dossier names none", () => {
		assert.deepEqual(logs, []);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cfgText } from "../../src/server/data/games/dayofinfamy.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Day of Infamy, from the research dossier (nothing was run on a real install): server app 462310, srcds_x64.exe (one user's post),
// one game port, a server.cfg the panel writes.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My DoI Server",
	sessionName: "Friends Sicily",
	serverPassword: "secret1",
	port: 27715,
	installDir: "C:\\Servers\\doi",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-doi-server",
	startScriptFilename: "Start_DOI.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Day of Infamy module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, false);
		assert.equal(template.id, "dayofinfamy");
		assert.equal(template.type, "dayofinfamy");
		assert.equal(template.displayName, "Day of Infamy");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (462310) into the folder root, and records the store game (447820)", () => {
		assert.equal(template.updateAppId, "462310");
		assert.equal(template.storeAppId, "447820");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password and a map, and no login token or mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode"]);
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["sicily"]);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "dayofinfamy");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
		assert.ok(template.ports[0].default !== 27015, "not the engine's default, which other Source servers take");
	});
});

describe("Day of Infamy start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds_x64.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My DoI Server" srcds_x64\.exe /);
	});

	it("writes the arguments the dossier has", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My DoI Server" srcds_x64.exe -console -game doi -port 27715 +map sicily +mp_gamemode frontline +servercfgfile server.cfg',
		);
	});

	it("matches the port in the entry, and takes the map", () => {
		const entry = template.buildServerEntry(params({ port: 27715 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 27800, mapCode: "sicily_test" }));
		assert.match(custom, / -port 27800 /);
		assert.match(custom, / \+map sicily_test /);
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Sicily"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', mapCode: "sicily & calc", port: "27715 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds_x64\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map sicily /);
		assert.match(launch, / -port 27715 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Day of Infamy inputs", () => {
	it("refuses a name or password that would change what a config line does", async () => {
		for (const bad of ['a"b', "a;b", "a\\b", "http://x", "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot hold safely/, JSON.stringify(bad));
			await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: bad }), /cannot hold safely/, JSON.stringify(bad));
		}
		assert.equal(cfgText("  My Server's name! (1)  ", "x"), "My Server's name! (1)");
	});

	it("hands the cleaned values on from resolveParams, and refuses a map name with odd characters", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "sicily" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "sicily & calc" }), /not a map name/);
	});
});

describe("Day of Infamy server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is in the game's cfg folder, named server.cfg", () => {
		assert.equal(relPath, "doi\\cfg\\server.cfg");
	});

	it("writes the name, the password and sv_lan as console lines", () => {
		assert.ok(lines.includes('hostname "Friends Sicily"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines.includes("sv_lan 0"));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My DoI Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("Day of Infamy server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds_x64.exe by process, with no RCON and no query port", () => {
		assert.equal(entry.processName, "srcds_x64.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "dayofinfamy");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
		assert.equal(entry.port, 27715);
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\doi\\Start_DOI.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\doi");
		assert.equal(entry.installDir, "C:\\Servers\\doi\\");
		assert.equal(entry.updateAppId, "462310");
		assert.equal(entry.configPath, "C:\\Servers\\doi\\doi\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\doi\\doi\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Day of Infamy backups and logs", () => {
	it("backs up the cfg folder", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["doi/cfg"]);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("lists no log, because the dossier names none", () => {
		assert.deepEqual(logs, []);
	});
});

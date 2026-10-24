import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import game, { cfgText } from "../../src/server/data/games/dystopia.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Dystopia, from the research dossier (nothing was run on a real install of this game): server app 17585, srcds.exe run from
// bin\win32, one game port, a server.cfg the panel writes, no login token and no player limit.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Dystopia Server",
	sessionName: "Friends Vaccine",
	serverPassword: "secret1",
	port: 25924,
	installDir: "C:\\Servers\\dystopia",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-dystopia-server",
	startScriptFilename: "Start_Dystopia.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

/** Every game module in the folder, registered or not, so a port picked here cannot clash with one still being added. */
async function otherTemplates() {
	const dir = join(dirname(fileURLToPath(import.meta.url)), "../../src/server/data/games");
	const out = [...GAME_TEMPLATES];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith(".js") || file === "index.js" || file === "dystopia.js") continue;
		const mod = await import(pathToFileURL(join(dir, file)).href);
		if (mod.default?.template) out.push(mod.default.template);
	}
	return out.filter((t) => t.id !== "dystopia");
}

describe("Dystopia module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "dystopia");
		assert.equal(template.type, "dystopia");
		assert.equal(template.displayName, "Dystopia");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (17585) into the folder root, with the game as its store app", () => {
		assert.equal(template.updateAppId, "17585");
		assert.equal(template.storeAppId, "17580");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password and a map, and no login token or mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode"]);
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["dys_vaccine"]);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port, 25924, that no other template uses, nor any port beside theirs", async () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 25924);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = await otherTemplates();
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});
});

describe("Dystopia start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to bin\\win32 under its own folder and starts srcds.exe from there", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0bin\\win32"');
		assert.match(launchLine(script), /^start \/MIN "My Dystopia Server" srcds\.exe /);
	});

	it("writes the arguments the panel uses, with the game folder reached from bin\\win32", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My Dystopia Server" srcds.exe -console -game ..\\..\\dystopia -port 25924 +map dys_vaccine +exec server.cfg',
		);
	});

	it("does not write a player limit, since the dossier names none for this game", () => {
		assert.ok(!/maxplayers/i.test(script));
	});

	it("does not write -autoupdate, log or a login token", () => {
		assert.ok(!/autoupdate|condebug|sv_setsteamaccount/i.test(script));
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 25924 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 25925, mapCode: "dys_ruins" }));
		assert.match(custom, / -port 25925 /);
		assert.match(custom, / \+map dys_ruins /);
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Vaccine"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', mapCode: "dys & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map dys_vaccine /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Dystopia inputs", () => {
	it("refuses a name or password that would change what a config line does", async () => {
		for (const bad of ['a"b', "a;b", "a\\b", "http://x", "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot hold safely/, JSON.stringify(bad));
			await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: bad }), /cannot hold safely/, JSON.stringify(bad));
		}
		assert.equal(cfgText("  My Server's name! (1)  ", "x"), "My Server's name! (1)");
	});

	it("hands the cleaned values on from resolveParams, and refuses a map name with odd characters", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "dys_vaccine" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "dys_vaccine & calc" }), /not a map name/);
	});
});

describe("Dystopia server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the game's cfg folder, named server.cfg", () => {
		assert.equal(relPath, "dystopia\\cfg\\server.cfg");
	});

	it("writes the name, the password, sv_lan 0 and logging as console lines", () => {
		assert.ok(lines.includes('hostname "Friends Vaccine"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines.includes("sv_lan 0"));
		assert.ok(lines.includes("log on"));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My Dystopia Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("Dystopia server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "dystopia");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("runs from bin\\win32 inside the install folder, and records the script and the settings file", () => {
		assert.equal(entry.workingDir, "C:\\Servers\\dystopia\\bin\\win32");
		assert.equal(entry.startScriptPath, "C:\\Servers\\dystopia\\Start_Dystopia.bat");
		assert.equal(entry.installDir, "C:\\Servers\\dystopia\\");
		assert.equal(entry.updateAppId, "17585");
		assert.equal(entry.configPath, "C:\\Servers\\dystopia\\dystopia\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\dystopia\\dystopia\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Dystopia backups and logs", () => {
	it("backs up the cfg folder, where the server settings and the map list live", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["dystopia/cfg"]);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("lists no log file, since the dossier names none", () => {
		assert.deepEqual(logs, []);
	});
});

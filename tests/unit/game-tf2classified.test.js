import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import game, { cfgText } from "../../src/server/data/games/tf2classified.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Team Fortress 2 Classified, from the research dossier (nothing was run on a real install of this game): server app 3557020,
// srcds_win64.exe (not srcds.exe), a game folder tf2classified, one port (not on any page: the brief's 25930), a server.cfg the panel writes.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My TF2C Server",
	sessionName: "Friends Classified",
	serverPassword: "secret1",
	port: 25930,
	installDir: "C:\\Servers\\tf2classified",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-tf2c-server",
	startScriptFilename: "Start_TF2Classified.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

/** Every game module in the folder, registered or not, so a port picked here cannot clash with one still being added. */
async function otherTemplates() {
	const dir = join(dirname(fileURLToPath(import.meta.url)), "../../src/server/data/games");
	const out = [...GAME_TEMPLATES];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith(".js") || file === "index.js" || file === "tf2classified.js") continue;
		const mod = await import(pathToFileURL(join(dir, file)).href);
		if (mod.default?.template) out.push(mod.default.template);
	}
	return out.filter((t) => t.id !== "tf2classified");
}

describe("Team Fortress 2 Classified module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "tf2classified");
		assert.equal(template.type, "tf2classified");
		assert.equal(template.displayName, "Team Fortress 2 Classified");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (3557020) into the folder root, with no shared install", () => {
		assert.equal(template.updateAppId, "3557020");
		assert.equal(template.storeAppId, "3545060");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks only for a name and a password: no map, no token, no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword"]);
		assert.equal(template.mapChoices, undefined);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port at 25930, that no other template uses, nor any port beside theirs", async () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 25930);
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

describe("Team Fortress 2 Classified start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds_win64.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My TF2C Server" srcds_win64\.exe /);
	});

	it("writes the dossier's -steam with the game folder, the console, the port and the settings file", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My TF2C Server" srcds_win64.exe -steam -game tf2classified -console -port 25930 +exec server.cfg',
		);
	});

	it("writes no map and no player limit, since the dossier names no default for either", () => {
		assert.ok(!/\+map|\+maxplayers/.test(script));
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 25930 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		assert.match(template.buildStartScript(params({ port: 25931 })), / -port 25931 /);
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Classified"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%' }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds_win64\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Team Fortress 2 Classified inputs", () => {
	it("refuses a name or password that would change what a config line does", async () => {
		for (const bad of ['a"b', "a;b", "a\\b", "http://x", "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot hold safely/, JSON.stringify(bad));
			await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: bad }), /cannot hold safely/, JSON.stringify(bad));
		}
		assert.equal(cfgText("  My Server's name! (1)  ", "x"), "My Server's name! (1)");
	});

	it("hands the cleaned values on from resolveParams", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw" });
	});
});

describe("Team Fortress 2 Classified server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the game's cfg folder, named server.cfg (the dossier's path)", () => {
		assert.equal(relPath, "tf2classified\\cfg\\server.cfg");
	});

	it("writes the name and the password as console lines", () => {
		assert.ok(lines.includes('hostname "Friends Classified"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My TF2C Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("Team Fortress 2 Classified server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds_win64.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds_win64.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "tf2classified");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\tf2classified\\Start_TF2Classified.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\tf2classified");
		assert.equal(entry.installDir, "C:\\Servers\\tf2classified\\");
		assert.equal(entry.updateAppId, "3557020");
		assert.equal(entry.configPath, "C:\\Servers\\tf2classified\\tf2classified\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\tf2classified\\tf2classified\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Team Fortress 2 Classified backups and logs", () => {
	it("backs up the settings folder and nothing else", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["tf2classified/cfg"]);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("lists no log file, since the dossier names none and the launch line writes none", () => {
		assert.deepEqual(logs, []);
		assert.ok(!/condebug/.test(launchLine(template.buildStartScript(params()))));
	});
});

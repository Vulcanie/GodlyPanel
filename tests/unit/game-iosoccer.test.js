import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import game, { cfgText } from "../../src/server/data/games/iosoccer.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// IOSoccer, from the research dossier (nothing was run on a real install of this game): Steam server app 673990, srcds.exe, one game
// port, a server.cfg the panel writes, no login token, no mods field.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My IOSoccer Server",
	sessionName: "Friends Vienna",
	serverPassword: "secret1",
	port: 25948,
	installDir: "C:\\Servers\\iosoccer",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-iosoccer-server",
	startScriptFilename: "Start_IOSoccer.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

/** Every game module in the folder, registered or not, so a port picked here cannot clash with one still being added. */
async function otherTemplates() {
	const dir = join(dirname(fileURLToPath(import.meta.url)), "../../src/server/data/games");
	const out = [...GAME_TEMPLATES];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith(".js") || file === "index.js" || file === "iosoccer.js") continue;
		const mod = await import(pathToFileURL(join(dir, file)).href);
		if (mod.default?.template) out.push(mod.default.template);
	}
	return out.filter((t) => t.id !== "iosoccer");
}

describe("IOSoccer module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "iosoccer");
		assert.equal(template.type, "iosoccer");
		assert.equal(template.displayName, "IOSoccer");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (673990) into the folder root", () => {
		assert.equal(template.updateAppId, "673990");
		assert.equal(template.storeAppId, "673560");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password and a map, and no login token or mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode"]);
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["8v8_vienna"]);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port that no other template uses, nor any port beside theirs", async () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 25948);
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

describe("IOSoccer start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds_win64.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My IOSoccer Server" srcds_win64.exe /);
	});

	it("writes the arguments the dossier's examples agree on, and runs the settings file", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My IOSoccer Server" srcds_win64.exe -console -game iosoccer -port 25948 +maxplayers 32 +map 8v8_vienna +exec server.cfg',
		);
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 25948 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 25947, maxPlayers: 16, mapCode: "8v8_other" }));
		assert.match(custom, / -port 25947 /);
		assert.match(custom, / \+maxplayers 16 /);
		assert.match(custom, / \+map 8v8_other /);
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Vienna"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', mapCode: "8v8 & calc", maxPlayers: "10 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds_win64.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map 8v8_vienna /);
		assert.match(launch, / \+maxplayers 32 /);
	});

	it("keeps the player limit to a whole number from 2 to 33", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / \+maxplayers 32 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 34 })), / \+maxplayers 32 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 1 })), / \+maxplayers 32 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 33 })), / \+maxplayers 33 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("IOSoccer inputs", () => {
	it("refuses a name or password that would change what a config line does", async () => {
		for (const bad of ['a"b', "a;b", "a\\b", "http://x", "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot hold safely/, JSON.stringify(bad));
			await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: bad }), /cannot hold safely/, JSON.stringify(bad));
		}
		assert.equal(cfgText("  My Server's name! (1)  ", "x"), "My Server's name! (1)");
	});

	it("hands the cleaned values on from resolveParams, and refuses a map name with odd characters", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "8v8_vienna" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "8v8 & calc" }), /not a map name/);
	});
});

describe("IOSoccer server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the game's cfg folder, named server.cfg", () => {
		assert.equal(relPath, "iosoccer\\cfg\\server.cfg");
	});

	it("writes the name, the password and sv_lan as console lines", () => {
		assert.ok(lines.includes('hostname "Friends Vienna"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines.includes("sv_lan 0"));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My IOSoccer Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("IOSoccer server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds_win64.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds_win64.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "iosoccer");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\iosoccer\\Start_IOSoccer.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\iosoccer");
		assert.equal(entry.installDir, "C:\\Servers\\iosoccer\\");
		assert.equal(entry.updateAppId, "673990");
		assert.equal(entry.configPath, "C:\\Servers\\iosoccer\\iosoccer\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\iosoccer\\iosoccer\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("IOSoccer backups and logs", () => {
	it("backs up the settings folder and nothing else", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["iosoccer/cfg"]);
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

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import game, { cfgText } from "../../src/server/data/games/empires.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Empires, from the research dossier (nothing was run on a real install of this game): server app 460040, srcds.exe, one game port,
// a server.cfg the panel writes, no login token, no stop command.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Empires Server",
	sessionName: "Friends District",
	serverPassword: "secret1",
	port: 25926,
	installDir: "C:\\Servers\\empires",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-empires-server",
	startScriptFilename: "Start_Empires.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

/** Every game module in the folder, registered or not, so a port picked here cannot clash with one still being added. */
async function otherTemplates() {
	const dir = join(dirname(fileURLToPath(import.meta.url)), "../../src/server/data/games");
	const out = [...GAME_TEMPLATES];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith(".js") || file === "index.js" || file === "empires.js") continue;
		const mod = await import(pathToFileURL(join(dir, file)).href);
		if (mod.default?.template) out.push(mod.default.template);
	}
	return out.filter((t) => t.id !== "empires");
}

describe("Empires module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "empires");
		assert.equal(template.type, "empires");
		assert.equal(template.displayName, "Empires");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (460040) into the folder root", () => {
		assert.equal(template.updateAppId, "460040");
		assert.equal(template.storeAppId, "17740");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password and a map, with no login token and no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode"]);
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["con_district402"]);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port at 25926, that no other template uses, nor any port beside theirs", async () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 25926);
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

describe("Empires start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My Empires Server" srcds\.exe /);
	});

	it("writes the arguments the dossier's minimal line agrees on, plus the panel's port and config", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My Empires Server" srcds.exe -game empires -console -toconsole -secure -port 25926 +maxplayers 62 +map con_district402 +exec server.cfg',
		);
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 25926 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 25927, maxPlayers: 20, mapCode: "emp_rise" }));
		assert.match(custom, / -port 25927 /);
		assert.match(custom, / \+maxplayers 20 /);
		assert.match(custom, / \+map emp_rise /);
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends District"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', mapCode: "emp & calc", maxPlayers: "10 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map con_district402 /);
		assert.match(launch, / \+maxplayers 62 /);
	});

	it("keeps the player limit to a whole number from 1 to 64", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / \+maxplayers 62 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 65 })), / \+maxplayers 62 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 0 })), / \+maxplayers 62 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 64 })), / \+maxplayers 64 /);
	});

	it("adds no login token, since the dossier names no such setting", () => {
		assert.ok(!/sv_setsteamaccount/.test(script));
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Empires inputs", () => {
	it("refuses a name or password that would change what a config line does", async () => {
		for (const bad of ['a"b', "a;b", "a\\b", "http://x", "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot hold safely/, JSON.stringify(bad));
			await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: bad }), /cannot hold safely/, JSON.stringify(bad));
		}
		assert.equal(cfgText("  My Server's name! (1)  ", "x"), "My Server's name! (1)");
	});

	it("hands the cleaned values on from resolveParams, and refuses a map name with odd characters", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "con_district402" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "emp & calc" }), /not a map name/);
	});
});

describe("Empires server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the game's cfg folder, named server.cfg", () => {
		assert.equal(relPath, "empires\\cfg\\server.cfg");
	});

	it("writes the name and the password as console lines", () => {
		assert.ok(lines.includes('hostname "Friends District"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My Empires Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("Empires server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "empires");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\empires\\Start_Empires.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\empires");
		assert.equal(entry.installDir, "C:\\Servers\\empires\\");
		assert.equal(entry.updateAppId, "460040");
		assert.equal(entry.configPath, "C:\\Servers\\empires\\empires\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\empires\\empires\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Empires backups and logs", () => {
	it("backs up the settings folder and nothing else", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["empires/cfg"]);
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

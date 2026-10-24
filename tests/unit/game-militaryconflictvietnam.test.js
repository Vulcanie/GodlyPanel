import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import game, { cfgText } from "../../src/server/data/games/militaryconflictvietnam.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Military Conflict: Vietnam, from the research dossier (nothing was run on a real install of this game): server app 1136190,
// srcds_x64.exe (unverified which process stays running), one game port, a server.cfg the panel writes, no login token.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My MCV Server",
	sessionName: "Friends Bridge",
	serverPassword: "secret1",
	port: 25970,
	installDir: "C:\\Servers\\mcv",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-mcv-server",
	startScriptFilename: "Start_MilitaryConflictVietnam.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

/** Every game module in the folder, registered or not, so a port picked here cannot clash with one still being added. */
async function otherTemplates() {
	const dir = join(dirname(fileURLToPath(import.meta.url)), "../../src/server/data/games");
	const out = [...GAME_TEMPLATES];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith(".js") || file === "index.js" || file === "militaryconflictvietnam.js") continue;
		const mod = await import(pathToFileURL(join(dir, file)).href);
		if (mod.default?.template) out.push(mod.default.template);
	}
	return out.filter((t) => t.id !== "militaryconflictvietnam");
}

describe("Military Conflict: Vietnam module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "militaryconflictvietnam");
		assert.equal(template.type, "militaryconflictvietnam");
		assert.equal(template.displayName, "Military Conflict: Vietnam");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (1136190) into the folder root", () => {
		assert.equal(template.updateAppId, "1136190");
		assert.equal(template.storeAppId, "1012110");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password and a map, and no login token or mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode"]);
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["mcv_bridge"]);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port, 25970, that no other template uses, nor any port beside theirs", async () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 25970);
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

describe("Military Conflict: Vietnam start script", () => {
	const script = template.buildStartScript(params());

	it("changes to its own folder and starts srcds_x64.exe from the install folder", () => {
		const lines = script.split("\r\n");
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My MCV Server" srcds_x64.exe /);
	});

	it("writes the console, game folder, port, player limit, map and settings file", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My MCV Server" srcds_x64.exe -console -game vietnam -port 25970 +maxplayers 24 +map mcv_bridge +exec server.cfg',
		);
	});

	it("never starts through a srcds.exe launcher", () => {
		assert.ok(!/\bsrcds\.exe\b/.test(script));
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 25970 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 25971, maxPlayers: 16, mapCode: "mcv_tower" }));
		assert.match(custom, / -port 25971 /);
		assert.match(custom, / \+maxplayers 16 /);
		assert.match(custom, / \+map mcv_tower /);
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Bridge"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', mapCode: "mcv_bridge & calc", maxPlayers: "10 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds_x64.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map mcv_bridge /);
		assert.match(launch, / \+maxplayers 24 /);
	});

	it("keeps the player limit to a whole number from 1 to 32", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / \+maxplayers 24 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 33 })), / \+maxplayers 24 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 0 })), / \+maxplayers 24 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 12 })), / \+maxplayers 12 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Military Conflict: Vietnam inputs", () => {
	it("refuses a name or password that would change what a config line does", async () => {
		for (const bad of ['a"b', "a;b", "a\\b", "http://x", "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot hold safely/, JSON.stringify(bad));
			await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: bad }), /cannot hold safely/, JSON.stringify(bad));
		}
		assert.equal(cfgText("  My Server's name! (1)  ", "x"), "My Server's name! (1)");
	});

	it("hands the cleaned values on from resolveParams, and refuses a map name with odd characters", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "mcv_bridge" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "mcv_bridge & calc" }), /not a map name/);
	});
});

describe("Military Conflict: Vietnam server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the game's cfg folder, named server.cfg", () => {
		assert.equal(relPath, "vietnam\\cfg\\server.cfg");
	});

	it("writes the name, the password and sv_lan 0 as console lines", () => {
		assert.ok(lines.includes('hostname "Friends Bridge"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines.includes("sv_lan 0"));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My MCV Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("Military Conflict: Vietnam server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds_x64.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds_x64.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "militaryconflictvietnam");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\mcv\\Start_MilitaryConflictVietnam.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\mcv");
		assert.equal(entry.installDir, "C:\\Servers\\mcv\\");
		assert.equal(entry.updateAppId, "1136190");
		assert.equal(entry.configPath, "C:\\Servers\\mcv\\vietnam\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\mcv\\vietnam\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Military Conflict: Vietnam backups and logs", () => {
	it("backs up the settings folder and nothing else", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["vietnam/cfg"]);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("lists no log file, since the dossier names none", () => {
		assert.deepEqual(logs, []);
	});
});

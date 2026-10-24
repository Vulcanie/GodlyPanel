import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import game, { cfgText, cleanLoginToken } from "../../src/server/data/games/fof.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Fistful of Frags, from the research dossier (nothing was run on a real install of this game): server app 295230, srcds.exe, one
// game port, a server.cfg the panel writes (the dossier conflicts on the name; see the module's header), an optional login token that
// goes into that file.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My FoF Server",
	sessionName: "Friends Frags",
	serverPassword: "secret1",
	port: 25975,
	installDir: "C:\\Servers\\fof",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-fof-server",
	startScriptFilename: "Start_FOF.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

/** Every game module in the folder, registered or not, so a port picked here cannot clash with one still being added. */
async function otherTemplates() {
	const dir = join(dirname(fileURLToPath(import.meta.url)), "../../src/server/data/games");
	const out = [...GAME_TEMPLATES];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith(".js") || file === "index.js" || file === "fof.js") continue;
		const mod = await import(pathToFileURL(join(dir, file)).href);
		if (mod.default?.template) out.push(mod.default.template);
	}
	return out.filter((t) => t.id !== "fof");
}

describe("Fistful of Frags module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "fof");
		assert.equal(template.type, "fof");
		assert.equal(template.displayName, "Fistful of Frags");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (295230) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "295230");
		assert.equal(template.storeAppId, "265630");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password, a map and an optional token, and no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode", "gslt"]);
		assert.ok(template.fieldMeta.gslt.label.includes("optional"));
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["fof_fistful", "fof_revenge"]);
		assert.equal(template.postWrite, undefined);
	});

	it("has one game port that no other template uses, nor any port beside theirs", async () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = await otherTemplates();
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
		assert.ok(template.ports[0].default >= 25900 && template.ports[0].default <= 25999, "in the 25900 range");
	});
});

describe("Fistful of Frags start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My FoF Server" srcds\.exe /);
	});

	it("writes the arguments the dossier's examples agree on, with no -ip", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My FoF Server" srcds.exe -console -game fof -port 25975 +maxplayers 16 +map fof_fistful +exec server.cfg',
		);
		assert.ok(!/ -ip /.test(script), "the dossier's two sources disagree on -ip, so it is not written");
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 25975 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 25976, maxPlayers: 12, mapCode: "fof_revenge" }));
		assert.match(custom, / -port 25976 /);
		assert.match(custom, / \+maxplayers 12 /);
		assert.match(custom, / \+map fof_revenge /);
	});

	it("never puts the login token on the launch line", () => {
		const full = template.buildStartScript(params({ gslt: "ABCDEF0123456789ABCDEF0123456789" }));
		assert.ok(!full.includes("ABCDEF0123456789"));
		assert.ok(!/sv_setsteamaccount/.test(full));
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Frags"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', gslt: "x & calc", mapCode: "fof & calc", maxPlayers: "10 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map fof_fistful /);
		assert.match(launch, / \+maxplayers 16 /);
	});

	it("keeps the player limit to a whole number from 1 to 20", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / \+maxplayers 16 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 21 })), / \+maxplayers 16 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 20 })), / \+maxplayers 20 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Fistful of Frags inputs", () => {
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

	it("hands the cleaned values on from resolveParams, and refuses a map name with odd characters", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "", gslt: " TOKEN123 " });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "fof_fistful", gslt: "TOKEN123" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "fof_fistful & calc" }), /not a map name/);
	});
});

describe("Fistful of Frags server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the game's cfg folder, named server.cfg", () => {
		assert.equal(relPath, "fof\\cfg\\server.cfg");
	});

	it("writes the name, the password and sv_lan as console lines", () => {
		assert.ok(lines.includes('hostname "Friends Frags"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines.includes("sv_lan 0"));
		assert.ok(lines[0].startsWith("//"));
	});

	it("writes the login token into the file, where the host guide puts it, and nowhere else", () => {
		const withToken = template.buildConfigFile(params({ gslt: "TOKEN123" })).content;
		assert.ok(withToken.split("\r\n").includes('sv_setsteamaccount "TOKEN123"'));
		assert.ok(!template.buildConfigFile(params()).content.includes("sv_setsteamaccount"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My FoF Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ gslt: "a b" })), /login token/);
	});
});

describe("Fistful of Frags server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "fof");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\fof\\Start_FOF.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\fof");
		assert.equal(entry.installDir, "C:\\Servers\\fof\\");
		assert.equal(entry.updateAppId, "295230");
		assert.equal(entry.configPath, "C:\\Servers\\fof\\fof\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\fof\\fof\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Fistful of Frags backups and logs", () => {
	it("backs up the settings folder and nothing else", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["fof/cfg"]);
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

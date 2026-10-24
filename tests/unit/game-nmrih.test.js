import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import game, { cfgText, cleanLoginToken } from "../../src/server/data/games/nmrih.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// No More Room in Hell, from the research dossier (nothing was run on a real install of this game): server app 317670, srcds.exe, one
// game port, a server.cfg the panel writes, an optional login token. The anonymous-login question is open (see the module's header).

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My NMRiH Server",
	sessionName: "Friends Zombies",
	serverPassword: "secret1",
	port: 25985,
	installDir: "C:\\Servers\\nmrih",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-nmrih-server",
	startScriptFilename: "Start_NMRIH.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

/** Every game module in the folder, registered or not, so a port picked here cannot clash with one still being added. */
async function otherTemplates() {
	const dir = join(dirname(fileURLToPath(import.meta.url)), "../../src/server/data/games");
	const out = [...GAME_TEMPLATES];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith(".js") || file === "index.js" || file === "nmrih.js") continue;
		const mod = await import(pathToFileURL(join(dir, file)).href);
		if (mod.default?.template) out.push(mod.default.template);
	}
	return out.filter((t) => t.id !== "nmrih");
}

describe("No More Room in Hell module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "nmrih");
		assert.equal(template.type, "nmrih");
		assert.equal(template.displayName, "No More Room in Hell");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (317670) into the folder root", () => {
		assert.equal(template.updateAppId, "317670");
		assert.equal(template.storeAppId, "224260");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password, a map and a login token, and no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode", "gslt"]);
		assert.ok(template.fieldMeta.gslt.label.includes("317670"));
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["nmo_broadway"]);
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
		assert.ok(![27015, 2456].includes(template.ports[0].default), "not the srcds default or the host guide's connect port");
	});
});

describe("No More Room in Hell start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My NMRiH Server" srcds\.exe /);
	});

	it("writes the arguments the dossier's examples agree on, and no -secure", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My NMRiH Server" srcds.exe -console -game nmrih -port 25985 +maxplayers 8 +map nmo_broadway +exec server.cfg',
		);
		assert.ok(!/ -secure/.test(script), "the dossier does not say what -secure does for this game");
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 25985 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 25986, maxPlayers: 6, mapCode: "nmo_broadway" }));
		assert.match(custom, / -port 25986 /);
		assert.match(custom, / \+maxplayers 6 /);
	});

	it("adds the login token when given", () => {
		const full = template.buildStartScript(params({ gslt: "ABCDEF0123456789ABCDEF0123456789" }));
		assert.match(launchLine(full), / \+exec server\.cfg \+sv_setsteamaccount ABCDEF0123456789ABCDEF0123456789$/);
		assert.ok(!/sv_setsteamaccount/.test(script));
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Zombies"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', gslt: "x & calc", mapCode: "nmo & calc", maxPlayers: "10 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map nmo_broadway /);
		assert.match(launch, / \+maxplayers 8 /);
		assert.ok(!/sv_setsteamaccount/.test(launch));
	});

	it("keeps the player limit to a whole number from 1 to 22", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / \+maxplayers 8 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 23 })), / \+maxplayers 8 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 22 })), / \+maxplayers 22 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("No More Room in Hell inputs", () => {
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
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "nmo_broadway", gslt: "TOKEN123" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "nmo_broadway & calc" }), /not a map name/);
	});
});

describe("No More Room in Hell server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the game's cfg folder, named server.cfg", () => {
		assert.equal(relPath, "nmrih\\cfg\\server.cfg");
	});

	it("writes the name, the password and sv_lan as console lines", () => {
		assert.ok(lines.includes('hostname "Friends Zombies"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines.includes("sv_lan 0"));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My NMRiH Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("No More Room in Hell server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "nmrih");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\nmrih\\Start_NMRIH.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\nmrih");
		assert.equal(entry.installDir, "C:\\Servers\\nmrih\\");
		assert.equal(entry.updateAppId, "317670");
		assert.equal(entry.configPath, "C:\\Servers\\nmrih\\nmrih\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\nmrih\\nmrih\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("No More Room in Hell backups and logs", () => {
	it("backs up the settings folder and nothing else", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["nmrih/cfg"]);
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

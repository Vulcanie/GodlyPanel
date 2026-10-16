import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vein, { serverName } from "../../src/server/data/games/vein.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { GAME_MODULES } from "../../src/server/data/games/index.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";
import { cmdSafe } from "../../src/server/services/windowlessLauncher.js";

// VEIN, from the research dossier: server app 2131400, game 1857950, UDP game and query ports, name/password/player limit in
// Game.ini (Ramjet's Config page), gameplay console variables in Engine.ini, no RCON, no mods.

const { template: t, backup, logs, launchOptions } = vein;

const params = (extra = {}) => ({
	name: "Test Vein",
	sessionName: "Friends Vein",
	serverPassword: "join-1234",
	port: 8960,
	queryPort: 8962,
	maxPlayers: 12,
	instanceSlug: "test-vein",
	installDir: "C:\\Servers\\vein",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	startScriptFilename: "Start_Vein.bat",
	...extra,
});

const launchLine = (p = params()) => t.buildStartScript(p).split("\r\n").find((l) => l.startsWith("start "));

// An ini text as { section: { key: value } }.
const parseIni = (text) => {
	const out = {};
	let section = null;
	for (const line of text.split("\r\n")) {
		if (!line) continue;
		const m = /^\[(.+)\]$/.exec(line);
		if (m) {
			section = m[1];
			out[section] = {};
		} else {
			const eq = line.indexOf("=");
			out[section][line.slice(0, eq)] = line.slice(eq + 1);
		}
	}
	return out;
};

describe("VEIN template", () => {
	it("is the VEIN dedicated server app, run as a plain process", () => {
		assert.equal(t.id, "vein");
		assert.equal(t.type, "vein");
		assert.equal(t.displayName, "VEIN");
		assert.equal(t.method, "process");
		assert.equal(t.updateAppId, "2131400");
		assert.equal(t.storeAppId, "1857950");
		assert.equal(t.sharedInstall, false);
		assert.equal(t.installLayoutRoot, "");
	});

	it("asks for a name and a join password, and nothing it cannot use (no admin or RCON password, no mods)", () => {
		assert.deepEqual(t.fields, ["sessionName", "serverPassword"]);
		assert.ok(!t.fields.includes("mods") && !t.fields.includes("rconPassword") && !t.fields.includes("adminPassword"));
	});

	it("has a game port and a query port that clash with no other template's ports", () => {
		assert.deepEqual(t.ports.map((p) => p.key), ["port", "queryPort"]);
		const others = [...GAME_TEMPLATES, ...GAME_MODULES.map((m) => m.template)].filter((x) => x.id !== "vein");
		const taken = new Set();
		for (const x of others) {
			const game = x.ports?.find((p) => p.key === "port")?.default;
			for (const p of x.ports ?? []) taken.add(p.default);
			if (game != null) for (const i of implicitPortsOf(x)) taken.add(game + i.offset);
		}
		for (const p of t.ports) assert.ok(!taken.has(p.default), `${p.key} default ${p.default} is already used`);
		const [game, query] = t.ports.map((p) => p.default);
		for (const i of implicitPortsOf(t)) assert.notEqual(game + i.offset, query);
		assert.equal(query, game + 2); // the wiki's rule
		assert.ok(query < 27020 || query > 27050); // Steam's range, per the wiki
	});

	it("has no mods field, no RCON and no Steam login", () => {
		assert.equal(t.rconPort, undefined);
		assert.ok(!("mods" in t) && !("modFields" in t));
		assert.equal(t.buildServerEntry(params()).rconPort, undefined);
	});
});

describe("VEIN start script", () => {
	const script = t.buildStartScript(params());
	const lines = script.split("\r\n");

	it("is a CRLF .bat that changes to the program's own folder first", () => {
		assert.equal(t.buildStartScriptFilename(), "Start_Vein.bat");
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0Vein\\Binaries\\Win64"');
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
		assert.equal(lines.filter((l) => l.startsWith("start ")).length, 1);
	});

	it("starts the program with -log and both ports, in the =-form the hosting pages stress", () => {
		assert.match(launchLine(), /^start \/MIN "Test Vein" VeinServer-Win64-Test\.exe -log -Port=8960 -QueryPort=8962$/);
	});

	it("keeps the name, the password and the player limit off the launch line (they live in Game.ini)", () => {
		assert.ok(!script.includes("join-1234") && !script.includes("Friends Vein"));
		assert.doesNotMatch(script, /MaxPlayers|-Password|ServerName/i);
	});

	it("has the same ports as the server entry", () => {
		const entry = t.buildServerEntry(params());
		assert.equal(Number(/-Port=(\d+)/.exec(script)[1]), entry.port);
		assert.equal(Number(/-QueryPort=(\d+)/.exec(script)[1]), entry.queryPort);
		assert.ok(launchLine().includes(entry.processName));
	});

	it("keeps characters cmd acts on out of the window title", () => {
		const bad = t.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>' }));
		const line = bad.split("\r\n").find((l) => l.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(line);
		assert.ok(title, line);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.equal(cmdSafe(line.slice(line.indexOf("VeinServer"))), true);
		assert.match(t.buildStartScript(params({ name: '"&%' })).split("\r\n").find((l) => l.startsWith("start ")), /^start \/MIN "VEIN" /);
	});

	it("is read by the panel as a direct launch of the shipping program from its own folder", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vein-test-"));
		try {
			const win64 = path.join(dir, "Vein", "Binaries", "Win64");
			fs.mkdirSync(win64, { recursive: true });
			fs.writeFileSync(path.join(win64, "VeinServer-Win64-Test.exe"), "");
			const scriptPath = path.join(dir, "Start_Vein.bat");
			fs.writeFileSync(scriptPath, script);
			const found = deriveLaunch(scriptPath, { workingDir: dir });
			assert.equal(found.ok, true, JSON.stringify(found));
			assert.equal(found.launch.exe.toLowerCase(), path.join(win64, "VeinServer-Win64-Test.exe").toLowerCase());
			assert.equal(found.launch.cwd.toLowerCase(), win64.toLowerCase());
			assert.ok(found.launch.args.includes("-log") && found.launch.args.includes("-QueryPort=8962"));
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("VEIN Game.ini", () => {
	const file = t.buildConfigFile(params());
	const ini = parseIni(file.content);

	it("goes where the game reads it, inside the install, before the first start", () => {
		assert.equal(file.relPath, "Vein\\Saved\\Config\\WindowsServer\\Game.ini");
		assert.ok(file.content.endsWith("\r\n"));
		assert.notEqual(file.content.charCodeAt(0), 0xfeff);
	});

	it("uses Ramjet's section and key names for the name, password and player limit", () => {
		assert.deepEqual(Object.keys(ini), ["/Script/Engine.GameSession", "/Script/Vein.VeinGameSession"]);
		assert.deepEqual(ini["/Script/Engine.GameSession"], { MaxPlayers: "12" });
		assert.deepEqual(ini["/Script/Vein.VeinGameSession"], { ServerName: "Friends Vein", Password: "join-1234" });
	});

	it("writes no admin line (there is no admin password and the person's own Steam ID is not known)", () => {
		assert.doesNotMatch(file.content, /AdminSteamIDs|Whitelisted/);
	});

	it("leaves the password empty for an open server, and takes the name from the server's name when no session name is given", () => {
		const open = parseIni(t.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content);
		assert.equal(open["/Script/Vein.VeinGameSession"].Password, "");
		assert.equal(open["/Script/Vein.VeinGameSession"].ServerName, "Test Vein");
	});

	it("defaults to 16 players and keeps whole numbers of at least one", () => {
		const slots = (maxPlayers) => parseIni(t.buildConfigFile(params({ maxPlayers })).content)["/Script/Engine.GameSession"].MaxPlayers;
		assert.equal(slots(undefined), "16");
		assert.equal(slots(""), "16");
		assert.equal(slots(0), "16");
		assert.equal(slots("abc"), "16");
		assert.equal(slots(8.9), "8");
	});

	it("keeps every value on its own line", () => {
		const out = t.buildConfigFile(params({ sessionName: "a\r\n[Evil]\r\nb", serverPassword: "x\ny" })).content;
		assert.deepEqual(Object.keys(parseIni(out)), ["/Script/Engine.GameSession", "/Script/Vein.VeinGameSession"]);
	});

	it("keeps the server's name to 64 characters and never empty", () => {
		assert.equal(serverName("x".repeat(100)).length, 64);
		assert.equal(serverName("  My   Server  "), "My Server");
		assert.equal(serverName(""), "Vein Server");
	});
});

describe("VEIN Engine.ini", () => {
	const files = t.buildExtraFiles(params());

	it("is made with only its [ConsoleVariables] header, so no community default can override the game's own", () => {
		assert.equal(files.length, 1);
		assert.equal(files[0].relPath, "Vein\\Saved\\Config\\WindowsServer\\Engine.ini");
		assert.equal(files[0].content, "[ConsoleVariables]\r\n");
	});
});

describe("VEIN server entry", () => {
	const p = params();
	const entry = t.buildServerEntry(p);

	it("records the program that is started, the ports and the files", () => {
		assert.equal(entry.type, "vein");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "VeinServer-Win64-Test.exe");
		assert.equal(entry.port, 8960);
		assert.equal(entry.queryPort, 8962);
		assert.equal(entry.updateAppId, "2131400");
		assert.equal(entry.startScriptPath, "C:\\Servers\\vein\\Start_Vein.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\vein");
		assert.equal(entry.installDir, "C:\\Servers\\vein\\");
		assert.equal(entry.configPath, "C:\\Servers\\vein\\Vein\\Saved\\Config\\WindowsServer\\Game.ini");
		assert.deepEqual(Object.keys(entry.configPaths), ["Game.ini", "Engine.ini"]);
		assert.ok(entry.configPaths["Engine.ini"].endsWith(t.buildExtraFiles(p)[0].relPath));
		assert.ok(entry.configPath.endsWith(t.buildConfigFile(p).relPath));
		assert.equal(entry.sessionName, "Friends Vein");
		assert.equal(entry.serverPassword, "join-1234");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});
});

describe("VEIN backups, logs and launch options", () => {
	it("backs up the Saved folder inside the server's folder, without logs and crash dumps", () => {
		assert.equal(backup.paths.length, 1);
		const [x] = backup.paths;
		assert.equal(x.base, "working");
		assert.equal(x.rel, "Vein/Saved");
		assert.deepEqual(x.exclude, ["Logs", "Crashes"]);
		assert.ok(x.label);
		assert.ok(!/^[a-z]:|^\.\.|^\//i.test(x.rel));
	});

	it("reads the game log from Saved/Logs", () => {
		assert.deepEqual(logs, [{ kind: "dir", base: "working", rel: "Vein/Saved/Logs", label: "Game log" }]);
	});

	it("gets the launch options form", () => {
		assert.equal(launchOptions, true);
	});
});

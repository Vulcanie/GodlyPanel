import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import theisle, { serverName, joinPassword, portNumber, SESSION_SECTION } from "../../src/server/data/games/theisle.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";

// Reads real .bat files and real Windows paths, so the direct-launch check only runs on Windows.
const onWindows = process.platform === "win32";

// The Isle (Evrima), from the research dossier: server app 412680 on the evrima beta, TheIsleServer.exe in the install root, the game
// port on the start line (?Port=), Game.ini in TheIsle\Saved\Config\WindowsServer, no RCON, no saves path known.

const { template: t, backup, logs, launchOptions } = theisle;

const params = (extra = {}) => ({
	name: "Test Isle",
	sessionName: "My Isle Server",
	serverPassword: "join-1234",
	port: 25920,
	instanceSlug: "test-isle",
	installDir: "C:\\Servers\\theisle",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	startScriptFilename: "Start_TheIsle.bat",
	...extra,
});

const startLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

// Game.ini as { section, values } for the checks below.
const parseGameIni = (content) => {
	const lines = content.split("\r\n").filter(Boolean);
	return {
		section: lines[0],
		keys: lines.slice(1).map((l) => l.slice(0, l.indexOf("="))),
		values: Object.fromEntries(lines.slice(1).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])),
	};
};

describe("The Isle module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(t && backup && logs);
		assert.equal(launchOptions, false);
		assert.equal(t.id, "theisle");
		assert.equal(t.type, "theisle");
		assert.equal(t.displayName, "The Isle (Evrima)");
		assert.equal(t.method, "process");
	});

	it("installs the dedicated server (412680) into the folder root, on the evrima beta branch", () => {
		assert.equal(t.updateAppId, "412680");
		assert.equal(t.updateBranch, "evrima");
		assert.equal(t.sharedInstall, false);
		assert.equal(t.installLayoutRoot, "");
	});

	it("sets the same branch on the server entry, so an update keeps it", () => {
		assert.equal(t.buildServerEntry(params()).updateBranch, "evrima");
		assert.equal(t.buildServerEntry(params()).updateAppId, "412680");
	});

	it("asks for a name and an optional join password, and no RCON or mod fields", () => {
		assert.deepEqual(t.fields, ["sessionName", "serverPassword"]);
		for (const f of t.fields) assert.ok(t.fieldMeta[f]?.label?.length > 20, f);
		assert.ok(!t.fields.includes("rconPassword") && !t.fields.includes("mods") && !t.fields.includes("adminPassword"));
	});

	it("has one game port, 25920, which no other template's default range uses", async () => {
		assert.deepEqual(t.ports.map((p) => p.key), ["port"]);
		assert.equal(t.ports[0].default, 25920);
		assert.equal(t.implicitPorts, undefined);
		const { GAME_TEMPLATES } = await import("../../src/server/data/gameTemplates.js");
		const taken = new Set(GAME_TEMPLATES.filter((x) => x.id !== "theisle").flatMap((x) => (x.ports ?? []).map((p) => p.default)));
		assert.ok(!taken.has(25920), "25920 is another template's default");
		assert.ok(!taken.has(25901), "the port after it is kept free");
	});

	it("says in its description that the beta branch is needed and that the listing needs credentials", () => {
		assert.match(t.description, /evrima/i);
		assert.match(t.description, /Engine\.ini/);
	});
});

describe("The Isle start script", () => {
	const script = t.buildStartScript(params());
	const lines = script.split("\r\n");

	it("is a CRLF .bat that changes to its own folder first", () => {
		assert.equal(t.buildStartScriptFilename(), "Start_TheIsle.bat");
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});

	it("starts TheIsleServer.exe with ?Port= and -log, and nothing else", () => {
		const start = lines.filter((l) => l.startsWith("start "));
		assert.equal(start.length, 1, script);
		assert.equal(start[0], 'start /MIN "Test Isle" TheIsleServer.exe ?Port=25920 -log');
	});

	it("uses the port the entry records, so the script and the entry agree", () => {
		const entry = t.buildServerEntry(params({ port: 25910 }));
		assert.equal(entry.port, 25910);
		assert.ok(startLine(t.buildStartScript(params({ port: 25910 }))).includes("?Port=25910 "));
	});

	it("keeps the join password, the name and the install path out of the script", () => {
		assert.ok(!script.includes("join-1234"));
		assert.ok(!script.includes("My Isle Server"));
		assert.ok(!script.includes("C:\\Servers"));
	});

	it("never lets a character cmd acts on, or a quote, into the title", () => {
		for (const nasty of ['a" & calc & "b', "100%PATH%", "x | y > z", "a^b<c>d!", "line\tbreak"]) {
			const line = startLine(t.buildStartScript(params({ name: nasty })));
			assert.match(line, /^start \/MIN "[^"%&|<>^!\u0000-\u001f]*" TheIsleServer\.exe \?Port=25920 -log$/, JSON.stringify(nasty));
		}
		assert.ok(startLine(t.buildStartScript(params({ name: '"%&' }))).startsWith('start /MIN "The Isle" '));
	});

	it("can be read back by the panel's direct-launch reader", { skip: !onWindows }, () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "theisle-launch-"));
		try {
			const exe = path.join(dir, "TheIsleServer.exe");
			fs.writeFileSync(exe, "");
			fs.writeFileSync(path.join(dir, "Start_TheIsle.bat"), script);
			const found = deriveLaunch(path.join(dir, "Start_TheIsle.bat"), { workingDir: dir });
			assert.equal(found.ok, true, found.reason);
			assert.equal(path.resolve(found.launch.exe).toLowerCase(), path.resolve(exe).toLowerCase());
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("The Isle Game.ini", () => {
	it("goes where the game reads it, inside the install", () => {
		assert.equal(t.buildConfigFile(params()).relPath, "TheIsle\\Saved\\Config\\WindowsServer\\Game.ini");
	});

	it("writes the session section and only the keys the panel owns", () => {
		const { section, keys } = parseGameIni(t.buildConfigFile(params()).content);
		assert.equal(section, `[${SESSION_SECTION}]`);
		assert.equal(SESSION_SECTION, "/Script/TheIsle.TIGameSession");
		assert.deepEqual(keys, ["ServerName", "MapName", "bServerPassword", "ServerPassword"]);
	});

	it("fills the name, the map and the join password, with the switch on only when there is a password", () => {
		const { values } = parseGameIni(t.buildConfigFile(params()).content);
		assert.equal(values.ServerName, '"My Isle Server"');
		assert.equal(values.MapName, "Gateway");
		assert.equal(values.bServerPassword, "true");
		assert.equal(values.ServerPassword, '"join-1234"');
		const open = parseGameIni(t.buildConfigFile(params({ serverPassword: "" })).content).values;
		assert.equal(open.bServerPassword, "false");
		assert.equal(open.ServerPassword, '""');
	});

	it("falls back to the server's name when no session name is given", () => {
		assert.equal(parseGameIni(t.buildConfigFile(params({ sessionName: "" })).content).values.ServerName, '"Test Isle"');
	});

	it("is one value per line even for odd input", () => {
		const out = t.buildConfigFile(params({ sessionName: 'x\ty"\r\nInjected=1', serverPassword: 'a"b\r\nEvil=1' })).content;
		const lines = out.split("\r\n").filter(Boolean);
		assert.equal(lines.length, 5);
		assert.ok(!lines.some((l) => l.startsWith("Injected") || l.startsWith("Evil")));
		assert.equal((out.match(/"/g) ?? []).length, 4);
	});

	it("gives the name and password helpers a clean value", () => {
		assert.equal(serverName("  A   name  "), "A name");
		assert.equal(serverName("", ""), "The Isle Server");
		assert.equal(joinPassword(' ab"c '), "abc");
		assert.equal(joinPassword(undefined), "");
		assert.equal(portNumber("25905"), 25905);
		assert.equal(portNumber("0"), 25920);
		assert.equal(portNumber("99999"), 25920);
	});
});

describe("The Isle entry, backup and logs", () => {
	it("records the exe that is started, the config path and the install folder", () => {
		const entry = t.buildServerEntry(params());
		assert.equal(entry.processName, "TheIsleServer.exe");
		assert.equal(entry.startScriptPath, "C:\\Servers\\theisle\\Start_TheIsle.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\theisle");
		assert.equal(entry.installDir, "C:\\Servers\\theisle\\");
		assert.equal(entry.configPaths["Game.ini"], "C:\\Servers\\theisle\\TheIsle\\Saved\\Config\\WindowsServer\\Game.ini");
		assert.deepEqual(Object.keys(entry.configPaths), ["Game.ini"]);
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.autoUpdate, false);
	});

	it("backs up the config folder only, and reads the server log", () => {
		assert.deepEqual(backup.paths, [{ base: "working", rel: "TheIsle/Saved/Config/WindowsServer", label: "Game.ini and Engine.ini settings" }]);
		assert.equal(logs.length, 1);
		assert.equal(logs[0].kind, "file");
		assert.equal(logs[0].rel, "TheIsle/Saved/Logs/TheIsle.log");
	});
});

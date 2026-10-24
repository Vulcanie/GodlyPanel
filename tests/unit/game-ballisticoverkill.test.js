import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cfgText } from "../../src/server/data/games/ballisticoverkill.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Ballistic Overkill, from the research dossier (nothing was run on a real install): server app 416880, BODS.exe (unverified on Windows),
// two ports written into config.txt (ServerPort, QueryPort), a join password, no launch options, no mods.

const { template, backup, logs, launchOptions } = game;
const INSTALL = "C:\\Servers\\bo";
const params = (extra = {}) => ({
	name: "My BO Server",
	sessionName: "Friends Overkill",
	serverPassword: "secret1",
	port: 27080,
	queryPort: 27082,
	installDir: INSTALL,
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-bo-server",
	startScriptFilename: "Start_BallisticOverkill.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Ballistic Overkill module", () => {
	it("has the four parts a game module needs, with no launch options", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, false);
		assert.equal(template.id, "ballisticoverkill");
		assert.equal(template.type, "ballisticoverkill");
		assert.equal(template.displayName, "Ballistic Overkill");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (416880) into the folder root, and names the base game for the store", () => {
		assert.equal(template.updateAppId, "416880");
		assert.equal(template.storeAppId, "296300");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name and a password only", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword"]);
	});

	it("has a game port and a query port two above it", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const [gamePort, queryPort] = template.ports.map((p) => p.default);
		assert.equal(queryPort - gamePort, 2);
	});

	it("keeps its block of ports (27079 to 27083) free of every other template's ports and the ports they keep beside them", () => {
		const block = new Set([27079, 27080, 27081, 27082, 27083]);
		for (const t of GAME_TEMPLATES.filter((x) => x.id !== "ballisticoverkill")) {
			const theirs = new Set();
			for (const p of t.ports) {
				theirs.add(p.default);
				for (const i of implicitPortsOf(t)) theirs.add(p.default + i.offset);
			}
			for (const port of theirs) assert.ok(!block.has(port), `${port} of ${t.id} sits in the block 27079 to 27083`);
		}
	});
});

describe("Ballistic Overkill start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts BODS.exe with the LinuxGSM flags, config path last", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(
			launchLine(script),
			'start /MIN "My BO Server" BODS.exe -batchmode -nographics -dedicated -configfile="%~dp0config.txt"',
		);
	});

	it("does not put the port, the name or the password on the launch line (they are in config.txt)", () => {
		assert.ok(!/-port|-queryport|ServerPort|Password|secret1|Friends Overkill/i.test(script));
	});

	it("never lets a character cmd acts on into the title", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%' }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" BODS\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Ballistic Overkill config.txt", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is config.txt in the server's folder", () => {
		assert.equal(relPath, "config.txt");
	});

	it("writes the name, both ports and the password as Key=value lines", () => {
		assert.equal(lines[0], "ServerName=Friends Overkill");
		assert.ok(lines.includes("ServerPort=27080"));
		assert.ok(lines.includes("QueryPort=27082"));
		assert.ok(lines.includes("Password=secret1"));
	});

	it("matches the ports in the entry", () => {
		const entry = template.buildServerEntry(params());
		assert.ok(content.includes(`ServerPort=${entry.port}`));
		assert.ok(content.includes(`QueryPort=${entry.queryPort}`));
	});

	it("leaves the password out for an open server, and falls back to the panel's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/Password=/.test(open));
		assert.match(open, /^ServerName=My BO Server$/m);
	});

	it("refuses a value that would start a new line", () => {
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a\r\nAdminPassword=x" })), /line break/);
	});
});

describe("Ballistic Overkill inputs", () => {
	it("refuses a line break in the name or password, and hands the cleaned values on", async () => {
		await assert.rejects(template.resolveParams({ name: "x", sessionName: "a\nb" }), /line break/);
		await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: "a\rb" }), /line break/);
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw" });
	});

	it("keeps the text it is given (cfgText only refuses control characters)", () => {
		assert.equal(cfgText("  My Server's name! (1) \"quoted\" ;x  ", "x"), 'My Server\'s name! (1) "quoted" ;x');
	});
});

describe("Ballistic Overkill server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches BODS.exe by process, with no RCON", () => {
		assert.equal(entry.processName, "BODS.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "ballisticoverkill");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});

	it("records the ports, the start script, the folder and the config file", () => {
		assert.equal(entry.port, 27080);
		assert.equal(entry.queryPort, 27082);
		assert.equal(entry.startScriptPath, `${INSTALL}\\Start_BallisticOverkill.bat`);
		assert.equal(entry.workingDir, INSTALL);
		assert.equal(entry.installDir, `${INSTALL}\\`);
		assert.equal(entry.updateAppId, "416880");
		assert.equal(entry.configPath, `${INSTALL}\\config.txt`);
		assert.deepEqual(entry.configPaths, { "config.txt": `${INSTALL}\\config.txt` });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Ballistic Overkill backups and logs", () => {
	it("backs up config.txt and lists no log folder (none is documented)", () => {
		assert.deepEqual(backup.paths.map((p) => [p.base, p.rel]), [["working", "config.txt"]]);
		assert.deepEqual(logs, []);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/scum.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// SCUM, from the research dossier (nothing was run on a real install): server app 3792580, SCUMServer.exe, one UDP game port with the
// two after it taken by the game, name/password/player limit in ServerSettings.ini.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My SCUM Server",
	sessionName: "Friends Island",
	serverPassword: "secret1",
	port: 7870,
	queryPort: 7880,
	installDir: "C:\\Servers\\scum",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-scum-server",
	startScriptFilename: "Start_SCUM.bat",
	...extra,
});

describe("SCUM module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "scum");
		assert.equal(template.type, "scum");
		assert.equal(template.displayName, "SCUM");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server tool (3792580) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "3792580");
		assert.equal(template.storeAppId, "513710");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
		assert.ok(template.estimatedInstallBytes >= 15_000_000_000);
	});

	it("asks for a server name and a password, and has no mods field", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword"]);
		assert.ok(!template.fields.includes("mods"));
	});

	it("has a UDP game port and a UDP query port that do not clash with another game's default or the ports beside them", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const port = template.ports[0].default;
		assert.match(template.ports[0].label, /UDP/);
		const taken = [7015, 7777, 8888, 8766, 9876, 15637, 16261, 25565, 26000, 27015, 27016, 28015, 8211, 8890, 8892, 8900, 8910, 8920, 7780];
		const mine = [port, template.ports[1].default, ...implicitPortsOf(template).map((i) => port + i.offset)];
		for (const m of mine) assert.ok(!taken.includes(m), `${m} is another game's default`);
	});

	it("keeps the one more port the game opens beside its game port (TCP, game port + 2: seen on a real install)", () => {
		const offsets = implicitPortsOf(template).map((i) => i.offset);
		// The panel adds a precaution port at +1 to every game's list; the +2 is SCUM's own.
		assert.deepEqual(offsets, [1, 2]);
	});
});

describe("SCUM start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts the program from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		const launch = lines.find((l) => l.startsWith("start "));
		assert.ok(launch, "has a start line");
		assert.match(launch, /^start \/MIN "My SCUM Server" SCUM\\Binaries\\Win64\\SCUMServer\.exe /);
	});

	it("uses the arguments the wiki gives, with the port the entry records", () => {
		const launch = lines.find((l) => l.startsWith("start "));
		assert.match(launch, / -log /);
		assert.match(launch, / -port=7870 /);
		assert.match(launch, / -MaxPlayers=64$/);
		const entry = template.buildServerEntry({ ...params(), port: 7870 });
		assert.equal(entry.port, 7870);
		assert.equal(Number(/-port=(\d+)/.exec(launch)[1]), entry.port);
	});

	it("passes the query port, does not add -nobattleye, and keeps the name and password out of the script", () => {
		assert.ok(!/nobattleye/i.test(script));
		assert.match(script, / -QueryPort=\d+ /);
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Island"));
	});

	it("takes the ports and the player limit from the form", () => {
		const custom = template.buildStartScript(params({ port: 7900, queryPort: 7910, maxPlayers: 20 }));
		assert.match(custom, / -port=7900 -QueryPort=7910 -MaxPlayers=20$/m);
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / -MaxPlayers=64$/m);
		assert.match(template.buildStartScript(params({ maxPlayers: 500 })), / -MaxPlayers=128$/m);
	});

	it("starts the server without the administrator prompt, because its program asks for one and a panel that is not elevated then cannot see or stop it (seen on a real install)", () => {
		assert.ok(lines.includes("set __COMPAT_LAYER=RunAsInvoker"));
		assert.ok(lines.indexOf("set __COMPAT_LAYER=RunAsInvoker") < lines.findIndex((l) => l.startsWith("start ")));
	});

	it("never lets a character cmd acts on from the server name into the script", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%' }));
		const launch = hostile.split("\r\n").find((l) => l.startsWith("start "));
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" SCUM\\/);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("SCUM ServerSettings.ini", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const byKey = Object.fromEntries(content.split("\r\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));

	it("goes where the game reads it", () => {
		assert.equal(relPath, "SCUM\\Saved\\Config\\WindowsServer\\ServerSettings.ini");
	});

	it("starts with the General section and writes the name, password and player limit with the scum. prefix", () => {
		assert.equal(content.split("\r\n")[0], "[General]");
		assert.equal(byKey["scum.ServerName"], "Friends Island");
		assert.equal(byKey["scum.ServerPassword"], "secret1");
		assert.equal(byKey["scum.MaxPlayers"], "64");
	});

	it("writes an empty password for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.match(open, /^scum\.ServerPassword=$/m);
		assert.match(open, /^scum\.ServerName=My SCUM Server$/m);
	});

	it("keeps a value to one line", () => {
		const text = template.buildConfigFile(params({ sessionName: "Name\r\n[Features]\r\nscum.FullWipe=True" })).content;
		assert.ok(!/^scum\.FullWipe/m.test(text));
		assert.equal(text.split("\r\n").filter((l) => l.startsWith("[")).length, 1);
	});

	it("matches the player limit on the launch line", () => {
		const p = params({ maxPlayers: 24 });
		assert.match(template.buildConfigFile(p).content, /^scum\.MaxPlayers=24$/m);
		assert.match(template.buildStartScript(p), /-MaxPlayers=24/);
	});
});

describe("SCUM server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches SCUMServer.exe, by process", () => {
		assert.equal(entry.processName, "SCUMServer.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "scum");
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\scum\\Start_SCUM.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\scum");
		assert.equal(entry.installDir, "C:\\Servers\\scum\\");
		assert.equal(entry.updateAppId, "3792580");
		assert.equal(entry.configPath, "C:\\Servers\\scum\\SCUM\\Saved\\Config\\WindowsServer\\ServerSettings.ini");
		assert.equal(entry.configPaths["ServerSettings.ini"], entry.configPath);
		assert.equal(entry.autoUpdate, false);
	});

	it("records the query port the script gives, and has no RCON", () => {
		assert.equal(entry.queryPort, 7880);
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});
});

describe("SCUM first start", () => {
	it("warns that the game rewrites its settings file on the very first start", async () => {
		const out = await template.postWrite(params());
		assert.equal(out.warnings.length, 1);
		assert.match(out.warnings[0], /first start/i);
		assert.match(out.warnings[0], /second/i);
	});
});

describe("SCUM backups and logs", () => {
	it("backs up the save database folder and the settings folder", () => {
		const rels = backup.paths.map((p) => p.rel);
		assert.ok(rels.includes("SCUM/Saved/SaveFiles"));
		assert.ok(rels.includes("SCUM/Saved/Config/WindowsServer"));
		for (const p of backup.paths) assert.equal(p.base, "working");
	});

	it("lists the game's log folder", () => {
		assert.deepEqual(logs.map((l) => [l.kind, l.base, l.rel]), [["dir", "working", "SCUM/Saved/Logs"]]);
	});
});

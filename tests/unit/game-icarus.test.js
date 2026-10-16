import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import icarus, { batSafeName } from "../../src/server/data/games/icarus.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";
import { cmdSafe } from "../../src/server/services/windowlessLauncher.js";

// Reads real .bat files and real Windows paths, so it only runs on Windows (CI's Windows job runs it).
const onWindows = process.platform === "win32";

// Icarus, as the research dossier describes it: UDP game port and query port, the name given as -SteamServerName=, the
// settings file written before the first start, no RCON, and no -CreateProspect in the start script.

const { template: t, backup, logs, launchOptions } = icarus;

const params = (extra = {}) => ({
	name: "Test Icarus",
	sessionName: "My Icarus Server",
	serverPassword: "join1234",
	adminPassword: "boss-pass-1",
	port: 17777,
	queryPort: 17779,
	maxPlayers: 6,
	instanceSlug: "test-icarus",
	installDir: "C:\\Servers\\icarus",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	startScriptFilename: "Start_Icarus.bat",
	...extra,
});

const iniOf = (p) => {
	const lines = t.buildConfigFile(p).content.split("\r\n");
	const section = lines[0];
	const values = Object.fromEntries(lines.slice(1).filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
	return { section, values, keys: lines.slice(1).filter(Boolean).map((l) => l.slice(0, l.indexOf("="))) };
};

describe("Icarus template", () => {
	it("is the Icarus server app, run as a plain process", () => {
		assert.equal(t.id, "icarus");
		assert.equal(t.type, "icarus");
		assert.equal(t.displayName, "Icarus");
		assert.equal(t.updateAppId, "2089300");
		assert.equal(t.storeAppId, "1149460");
		// There is no RCON, so the panel must not be told to stop it over one. Its query port does answer Steam queries (checked on a
		// real install), which is how the panel sees it online and counts its players.
		assert.equal(t.method, "gamedig");
		assert.equal(t.queryProtocol, "icarus");
		assert.equal(t.buildServerEntry(params()).queryProtocol, "icarus");
		assert.equal(t.buildServerEntry(params()).rconPort, undefined);
		assert.equal(t.sharedInstall, false);
	});

	it("asks for a name, a join password and an admin password, and nothing else", () => {
		assert.deepEqual(t.fields, ["sessionName", "serverPassword", "adminPassword"]);
		assert.ok(!t.fields.includes("rconPassword") && !t.fields.includes("mods"));
	});

	it("has a game port and a query port, both free of the other templates' defaults", async () => {
		assert.deepEqual(t.ports.map((p) => p.key), ["port", "queryPort"]);
		const { GAME_TEMPLATES } = await import("../../src/server/data/gameTemplates.js");
		const taken = new Set(GAME_TEMPLATES.filter((x) => x.id !== "icarus").flatMap((x) => x.ports.map((p) => p.default)));
		for (const p of t.ports) assert.ok(!taken.has(p.default), `${p.key} default ${p.default} is another template's`);
		assert.equal(t.ports[0].default, 17777);
		// The port right after the game port is kept free for every game.
		assert.notEqual(t.ports[1].default, t.ports[0].default + 1);
	});
});

describe("Icarus start script", () => {
	const script = t.buildStartScript(params());
	const lines = script.split("\r\n");

	it("is a CRLF .bat that changes to its own folder first", () => {
		assert.equal(t.buildStartScriptFilename(), "Start_Icarus.bat");
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});

	it("starts the shipping program with -Log, the name, and both ports", () => {
		const start = lines.find((l) => l.startsWith("start "));
		assert.ok(start, script);
		assert.match(start, /^start \/MIN "Test Icarus" "Icarus\\Binaries\\Win64\\IcarusServer-Win64-Shipping\.exe" -Log /);
		assert.ok(start.includes('-SteamServerName="My Icarus Server"'));
		assert.ok(start.includes("-PORT=17777"));
		assert.ok(start.includes("-QueryPort=17779"));
	});

	it("does not create a world on every start, and keeps passwords out of the script", () => {
		assert.ok(!/CreateProspect|LoadProspect|ResumeProspect/i.test(script));
		assert.ok(!script.includes("join1234") && !script.includes("boss-pass-1"));
		assert.ok(!/JoinPassword|maxplayers/i.test(script));
	});

	it("takes the server name from the name when no session name is given", () => {
		assert.ok(t.buildStartScript(params({ sessionName: "" })).includes('-SteamServerName="Test Icarus"'));
	});

	it("never lets a character cmd acts on, or a quote, into the script", () => {
		for (const nasty of ['a" & calc & "b', "100%PATH%", "x | y > z", "a^b<c>d", "line\tbreak"]) {
			const s = t.buildStartScript(params({ name: nasty, sessionName: nasty }));
			const start = s.split("\r\n").find((l) => l.startsWith("start "));
			const rest = start.slice(start.indexOf("-Log"));
			assert.equal(cmdSafe(rest), true, `${JSON.stringify(nasty)} -> ${rest}`);
			assert.ok(!/[%&|<>^]/.test(start.replace(/"[^"]*"/, "")), start);
			assert.equal((start.match(/"/g) ?? []).length, 6, start); // title, program and name, each in a pair
		}
	});

	it("keeps the name to the 64 characters the game allows, and falls back when nothing is left", () => {
		assert.equal(batSafeName("x".repeat(100)).length, 64);
		assert.equal(batSafeName('"%&'), "Icarus Server");
		assert.equal(batSafeName("  My   Server  "), "My Server");
	});

	it("can be read back by the panel's direct-launch reader", { skip: !onWindows }, () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "icarus-launch-"));
		try {
			const exe = path.join(dir, "Icarus", "Binaries", "Win64", "IcarusServer-Win64-Shipping.exe");
			fs.mkdirSync(path.dirname(exe), { recursive: true });
			fs.writeFileSync(exe, "");
			fs.writeFileSync(path.join(dir, "Start_Icarus.bat"), script);
			const found = deriveLaunch(path.join(dir, "Start_Icarus.bat"), { workingDir: dir });
			assert.equal(found.ok, true, found.reason);
			assert.equal(path.resolve(found.launch.exe).toLowerCase(), path.resolve(exe).toLowerCase());
			assert.ok(found.launch.args.includes("-QueryPort=17779"));
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("Icarus settings file", () => {
	it("goes where the game reads it, inside the install, before the first start", () => {
		const { relPath } = t.buildConfigFile(params());
		assert.equal(relPath, "Icarus\\Saved\\Config\\WindowsServer\\ServerSettings.ini");
	});

	it("has the official section and exactly the twelve official keys", () => {
		const { section, keys } = iniOf(params());
		assert.equal(section, "[/Script/Icarus.DedicatedServerSettings]");
		assert.deepEqual(keys, [
			"SessionName", "JoinPassword", "MaxPlayers", "AdminPassword", "ShutdownIfNotJoinedFor", "ShutdownIfEmptyFor",
			"AllowNonAdminsToLaunchProspects", "AllowNonAdminsToDeleteProspects", "LoadProspect", "CreateProspect", "ResumeProspect", "LastProspectName",
		]);
	});

	it("keeps the official defaults for everything it doesn't fill in", () => {
		const { values } = iniOf(params());
		assert.equal(values.ShutdownIfNotJoinedFor, "300.000000");
		assert.equal(values.ShutdownIfEmptyFor, "300.000000");
		assert.equal(values.AllowNonAdminsToLaunchProspects, "True");
		assert.equal(values.AllowNonAdminsToDeleteProspects, "False");
		assert.equal(values.ResumeProspect, "True");
		for (const k of ["LoadProspect", "CreateProspect", "LastProspectName"]) assert.equal(values[k], "", k);
	});

	it("puts the passwords and the player limit where the game reads them", () => {
		const { values } = iniOf(params());
		assert.equal(values.JoinPassword, "join1234");
		assert.equal(values.AdminPassword, "boss-pass-1");
		assert.equal(values.MaxPlayers, "6");
	});

	it("leaves the join password empty for an open server, but never the admin password", () => {
		const { values } = iniOf(params({ serverPassword: "", adminPassword: "" }));
		assert.equal(values.JoinPassword, "");
		assert.ok(values.AdminPassword.length >= 8, "a random admin password is made");
		const again = iniOf(params({ serverPassword: "", adminPassword: "" })).values.AdminPassword;
		assert.notEqual(values.AdminPassword, again);
	});

	it("uses 8 players when none is asked for, and a whole number otherwise", () => {
		assert.equal(iniOf(params({ maxPlayers: undefined })).values.MaxPlayers, "8");
		assert.equal(iniOf(params({ maxPlayers: "" })).values.MaxPlayers, "8");
		assert.equal(iniOf(params({ maxPlayers: 0 })).values.MaxPlayers, "8");
		assert.equal(iniOf(params({ maxPlayers: 4.9 })).values.MaxPlayers, "4");
	});

	it("is one value per line even for odd input", () => {
		const out = t.buildConfigFile(params({ serverPassword: "a b=c;d", sessionName: "x\ty" })).content;
		assert.equal(out.split("\r\n").filter(Boolean).length, 13);
		assert.ok(out.includes("JoinPassword=a b=c;d"));
	});
});

describe("Icarus server entry", () => {
	const p = params();
	const entry = t.buildServerEntry(p);

	it("records the program that stays running, the ports and the files", () => {
		assert.equal(entry.type, "icarus");
		assert.equal(entry.processName, "IcarusServer-Win64-Shipping.exe");
		assert.equal(entry.port, 17777);
		assert.equal(entry.queryPort, 17779);
		assert.equal(entry.updateAppId, "2089300");
		assert.equal(entry.startScriptPath, "C:\\Servers\\icarus\\Start_Icarus.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\icarus");
		assert.equal(entry.installDir, "C:\\Servers\\icarus\\");
		assert.equal(entry.configPaths["ServerSettings.ini"], "C:\\Servers\\icarus\\Icarus\\Saved\\Config\\WindowsServer\\ServerSettings.ini");
		assert.equal(entry.configPath, entry.configPaths["ServerSettings.ini"]);
		assert.equal(entry.name, "Test Icarus");
		assert.equal(entry.sessionName, "My Icarus Server");
		assert.equal(entry.serverPassword, "join1234");
	});

	it("matches the ports in the script and the files in the settings", () => {
		const start = t.buildStartScript(p).split("\r\n").find((l) => l.startsWith("start "));
		assert.equal(Number(/-PORT=(\d+)/.exec(start)[1]), entry.port);
		assert.equal(Number(/-QueryPort=(\d+)/.exec(start)[1]), entry.queryPort);
		assert.ok(start.includes(entry.processName));
		assert.ok(entry.configPath.endsWith(t.buildConfigFile(p).relPath));
	});

	it("has no remote console and no password beyond the join password", () => {
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.adminPassword, undefined);
	});
});

describe("Icarus backups, logs and launch options", () => {
	it("backs up the worlds and settings, inside the server's folder", () => {
		const rels = backup.paths.map((x) => x.rel);
		assert.ok(rels.includes("Icarus/Saved/PlayerData/DedicatedServer/Prospects"));
		assert.ok(rels.includes("Icarus/Saved/Config/WindowsServer"));
		for (const x of backup.paths) {
			assert.equal(x.base, "working");
			assert.ok(x.label);
			assert.ok(!/^[a-z]:|^\.\.|^\//i.test(x.rel), x.rel);
		}
	});

	it("reads the game log from Saved/Logs", () => {
		assert.deepEqual(logs, [{ kind: "dir", base: "working", rel: "Icarus/Saved/Logs", label: "Game log" }]);
	});

	it("gets the launch options form", () => {
		assert.equal(launchOptions, true);
	});
});

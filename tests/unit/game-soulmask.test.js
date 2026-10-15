import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import soulmask, { MAP_CHOICES } from "../../src/server/data/games/soulmask.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";
import { cmdSafe } from "../../src/server/services/windowlessLauncher.js";

// Soulmask, from the research dossier: everything is on the launch line, the Shipping program is started directly with
// SteamAppId set, and the panel can not send the telnet commands the game saves safely with.

const { template: t, backup, logs, launchOptions } = soulmask;

const params = (extra = {}) => ({
	name: "Test Soulmask",
	sessionName: "My Soulmask",
	serverPassword: "join1234",
	adminPassword: "boss-pass-1",
	mapCode: "Level01_Main",
	mods: "",
	port: 8777,
	queryPort: 8779,
	echoPort: 18888,
	maxPlayers: 12,
	instanceSlug: "test-soulmask",
	installDir: "C:\\Servers\\soulmask",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	startScriptFilename: "Start_Soulmask.bat",
	...extra,
});
const launchLine = (p) => t.buildStartScript(p).split("\r\n").find((l) => l.startsWith("start "));

describe("Soulmask template", () => {
	it("is the Soulmask dedicated server tool, run as a plain process", () => {
		assert.equal(t.id, "soulmask");
		assert.equal(t.type, "soulmask");
		assert.equal(t.displayName, "Soulmask");
		assert.equal(t.updateAppId, "3017310");
		assert.equal(t.storeAppId, "2646460");
		assert.equal(t.method, "process");
		assert.equal(t.sharedInstall, false);
		assert.equal(t.installLayoutRoot, "");
		assert.equal(launchOptions, true);
	});

	it("asks for a name, a map, two passwords and mods, and has no RCON password", () => {
		assert.deepEqual(t.fields, ["sessionName", "mapCode", "serverPassword", "adminPassword", "mods"]);
		assert.ok(!t.fields.includes("rconPassword"));
		assert.deepEqual(MAP_CHOICES.map((m) => m.code), ["Level01_Main", "DLC_Level01_Main"]);
		assert.deepEqual(t.mapChoices, MAP_CHOICES);
	});

	it("has a game port, a query port and a console port, none of them another template's default", async () => {
		assert.deepEqual(t.ports.map((p) => p.key), ["port", "queryPort", "echoPort"]);
		assert.deepEqual(t.ports.map((p) => p.default), [8777, 8779, 18888]);
		const { GAME_TEMPLATES } = await import("../../src/server/data/gameTemplates.js");
		const taken = new Set(GAME_TEMPLATES.filter((x) => x.id !== "soulmask").flatMap((x) => x.ports.map((p) => p.default)));
		// What each other game keeps next to its game port is as taken as its listed ports.
		for (const x of GAME_TEMPLATES.filter((o) => o.id !== "soulmask")) {
			const game = x.ports.find((p) => p.key === "port")?.default;
			if (game) for (const i of implicitPortsOf(x)) taken.add(game + i.offset);
		}
		for (const p of t.ports) assert.ok(!taken.has(p.default), `${p.key} default ${p.default} is already taken`);
		// The port right after the game port is kept free for every game, and the implied ports must not be the query port.
		for (const i of implicitPortsOf(t)) assert.notEqual(t.ports[0].default + i.offset, t.ports[1].default);
		assert.match(t.ports[0].label, /UDP/);
		assert.match(t.ports[1].label, /UDP/);
		assert.match(t.ports[2].label, /TCP/);
	});

	it("has no settings file for the panel to write", () => {
		assert.equal(t.buildConfigFile, undefined);
		assert.equal(t.buildExtraFiles, undefined);
	});

	it("copies the three Steam DLLs next to the Shipping program, never from anywhere else", () => {
		assert.deepEqual(t.copyInstalledFiles.map((f) => f.from), ["steamclient64.dll", "tier0_s64.dll", "vstdlib_s64.dll"]);
		for (const f of t.copyInstalledFiles) assert.equal(f.to, `WS\\Binaries\\Win64\\${f.from}`);
	});
});

describe("Soulmask start script", () => {
	const script = t.buildStartScript(params());
	const lines = script.split("\r\n");

	it("is a CRLF .bat that goes to its own folder and sets the Steam app id before starting", () => {
		assert.equal(t.buildStartScriptFilename(), "Start_Soulmask.bat");
		assert.deepEqual(lines.slice(0, 3), ["@echo off", 'cd /d "%~dp0"', "set SteamAppId=2646460"]);
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});

	it("starts the Shipping program with the level name first, then the dossier's required arguments", () => {
		const line = launchLine(params());
		assert.match(line, /^start \/MIN "Test Soulmask" "WS\\Binaries\\Win64\\WSServer-Win64-Shipping\.exe" Level01_Main -log -server -UTF8Output /);
		assert.ok(line.includes(" -forcepassthrough "));
	});

	it("writes the ports, name, passwords, mode and save timers in the equals form", () => {
		const line = launchLine(params());
		assert.ok(line.includes(" -PORT=8777 "));
		assert.ok(line.includes(" -QueryPort=8779 "));
		assert.ok(line.includes(" -EchoPort=18888 "));
		assert.ok(line.includes(' -SteamServerName="My Soulmask" '));
		assert.ok(line.includes(" -MaxPlayers=12 "));
		assert.ok(line.includes(' -PSW="join1234" '));
		assert.ok(line.includes(' -adminpsw="boss-pass-1" '));
		assert.ok(line.includes(" -pve "));
		assert.ok(line.endsWith(" -saving=600 -backup=900 -serverpm=2"));
		assert.ok(!/-pvp|-mod=/.test(line));
	});

	it("leaves out the two arguments no source has, and the ones with no description", () => {
		for (const bad of ["-forcepassword", "-mapcycle", "-online", "-SILENT", "-gamedistindex", "-NOSTEAM", "?ND=", "?CustomGameMode"]) assert.ok(!script.includes(bad), bad);
	});

	it("leaves the join password off for an open server, but always sets an admin password", () => {
		const line = launchLine(params({ serverPassword: "", adminPassword: "" }));
		assert.ok(!line.includes("-PSW"));
		const admin = /-adminpsw="([^"]+)"/.exec(line)[1];
		assert.ok(admin.length >= 8);
		assert.notEqual(admin, /-adminpsw="([^"]+)"/.exec(launchLine(params({ adminPassword: "" })))[1]);
	});

	it("uses 20 players when none is asked for, and the name when no session name is given", () => {
		assert.ok(launchLine(params({ maxPlayers: undefined })).includes(" -MaxPlayers=20 "));
		assert.ok(launchLine(params({ maxPlayers: 0 })).includes(" -MaxPlayers=20 "));
		assert.ok(launchLine(params({ maxPlayers: 7.9 })).includes(" -MaxPlayers=7 "));
		assert.ok(launchLine(params({ sessionName: "" })).includes('-SteamServerName="Test Soulmask"'));
	});

	it("takes the map from the form, and only a known one", () => {
		assert.match(launchLine(params({ mapCode: "DLC_Level01_Main" })), /" DLC_Level01_Main -log /);
		assert.match(launchLine(params({ mapCode: "Level01_Main & calc" })), /" Level01_Main -log /);
		assert.match(launchLine(params({ mapCode: undefined })), /" Level01_Main -log /);
	});

	it("adds -mod with the ids in their order, only when there are some", () => {
		assert.ok(launchLine(params({ mods: "3331511657,3325592770" })).endsWith(' -serverpm=2 -mod="3331511657,3325592770"'));
		assert.ok(!launchLine(params({ mods: "" })).includes("-mod"));
		// Anything that is not an id is dropped before it reaches the line.
		assert.ok(launchLine(params({ mods: '3331511657,"&calc,3325592770' })).endsWith('-mod="3331511657,3325592770"'));
	});

	it("checks the mod list before the download, with the Workshop id rules", async () => {
		assert.deepEqual(await t.resolveParams({ mods: "3331511657, 3325592770\n3331511657" }), { mods: "3331511657,3325592770" });
		assert.deepEqual(await t.resolveParams({ mods: "https://steamcommunity.com/sharedfiles/filedetails/?id=3331511657" }), { mods: "3331511657" });
		assert.deepEqual(await t.resolveParams({ mods: "" }), { mods: "" });
		await assert.rejects(() => t.resolveParams({ mods: "not-an-id" }), /not a Steam Workshop mod id/);
	});

	it("never lets a character cmd acts on, or a quote, into the script, in any typed value", () => {
		for (const nasty of ['a" & calc & "b', "100%PATH%", "x | y > z", "a^b<c>d", "line\tbreak", "slash\\"]) {
			const s = t.buildStartScript(params({ name: nasty, sessionName: nasty, serverPassword: nasty, adminPassword: nasty }));
			const line = s.split("\r\n").find((l) => l.startsWith("start "));
			assert.ok(!/[&|<>^]/.test(line.replace(/"[^"]*"/g, "")), line);
			assert.equal((line.match(/"/g) ?? []).length % 2, 0, line);
			// A % in a typed value is doubled so the .bat reads it as one.
			assert.ok(!/(?<!%)%(?!%)/.test(line.replace(/%%/g, "")), line);
			assert.ok(!/[\u0000-\u001f]/.test(line));
		}
		assert.ok(launchLine(params({ sessionName: "100%" })).includes('-SteamServerName="100%%"'));
		assert.ok(launchLine(params({ serverPassword: "pw\\" })).includes('-PSW="pw"'));
	});

	it("can be read back by the panel's direct-launch reader, with SteamAppId", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "soulmask-launch-"));
		try {
			const exe = path.join(dir, "WS", "Binaries", "Win64", "WSServer-Win64-Shipping.exe");
			fs.mkdirSync(path.dirname(exe), { recursive: true });
			fs.writeFileSync(exe, "");
			fs.writeFileSync(path.join(dir, "Start_Soulmask.bat"), script);
			const found = deriveLaunch(path.join(dir, "Start_Soulmask.bat"), { workingDir: dir });
			assert.equal(found.ok, true, found.reason);
			assert.equal(path.resolve(found.launch.exe).toLowerCase(), path.resolve(exe).toLowerCase());
			assert.ok(found.launch.args.includes("-QueryPort=8779"));
			assert.ok(found.launch.args.includes("Level01_Main"));
			assert.equal(found.launch.env?.SteamAppId, "2646460");
			// The part after the program is plain enough for cmd to pass to the game unchanged.
			assert.equal(cmdSafe(launchLine(params()).slice(launchLine(params()).indexOf("Level01_Main"))), true);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("Soulmask server entry", () => {
	const p = params();
	const entry = t.buildServerEntry(p);

	it("records the program the script starts, the ports and the files", () => {
		assert.equal(entry.type, "soulmask");
		assert.equal(entry.method, "process");
		// The Shipping program is the one the script starts; whether it is the one that stays running is unverified.
		assert.equal(entry.processName, "WSServer-Win64-Shipping.exe");
		assert.equal(entry.port, 8777);
		assert.equal(entry.queryPort, 8779);
		assert.equal(entry.echoPort, 18888);
		assert.equal(entry.updateAppId, "3017310");
		assert.equal(entry.startScriptPath, "C:\\Servers\\soulmask\\Start_Soulmask.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\soulmask");
		assert.equal(entry.installDir, "C:\\Servers\\soulmask\\");
		assert.equal(entry.sessionName, "My Soulmask");
		assert.equal(entry.serverPassword, "join1234");
		assert.equal(entry.name, "Test Soulmask");
	});

	it("matches the ports and program in the script", () => {
		const line = launchLine(p);
		assert.equal(Number(/-PORT=(\d+)/.exec(line)[1]), entry.port);
		assert.equal(Number(/-QueryPort=(\d+)/.exec(line)[1]), entry.queryPort);
		assert.equal(Number(/-EchoPort=(\d+)/.exec(line)[1]), entry.echoPort);
		assert.ok(line.includes(entry.processName));
	});

	it("has no RCON or telnet port recorded, because the panel could not talk to either", () => {
		for (const key of ["rconPort", "rconPassword", "telnetPort", "adminPassword", "configPath", "configPaths"]) assert.equal(entry[key], undefined, key);
	});
});

describe("Soulmask backups, logs and launch options", () => {
	it("backs up the worlds, the gameplay settings and the ban lists, inside the server's folder", () => {
		const rels = backup.paths.map((x) => x.rel);
		for (const rel of ["WS/Saved/Worlds", "WS/Saved/GameplaySettings", "WS/Saved/BlackAccountList.txt", "WS/Saved/WhiteAccountList.txt", "WS/Saved/BlackIPList.txt", "WS/Saved/WhiteIPList.txt", "WS/Saved/BanSpeek.txt"]) {
			assert.ok(rels.includes(rel), rel);
		}
		for (const x of backup.paths) {
			assert.equal(x.base, "working");
			assert.ok(x.label);
			assert.ok(!/^[a-z]:|^\.\.|^\//i.test(x.rel), x.rel);
		}
	});

	it("reads the game log from WS/Saved/Logs", () => {
		assert.deepEqual(logs, [{ kind: "dir", base: "working", rel: "WS/Saved/Logs", label: "Game log" }]);
	});
});

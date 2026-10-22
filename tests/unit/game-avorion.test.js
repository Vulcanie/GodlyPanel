import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import game, { galaxyName, serverNameText, adminSteamId, parseModIds } from "../../src/server/data/games/avorion.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";
import { cmdSafe } from "../../src/server/services/windowlessLauncher.js";
import { classify } from "../../src/server/services/serverProcesses.js";
import { detectFromScript } from "../../src/server/util/scriptPorts.js";

// Reads real .bat files and real Windows paths, so it only runs on Windows (CI's Windows job runs it).
const onWindows = process.platform === "win32";

// Avorion, from the research dossier (nothing was run on a real install): server tool app 565060, bin\AvorionServer.exe, everything on the
// launch line, modconfig.lua written only for Workshop ids, no server.ini written by the panel, no graceful stop (/save then /stop).

const { template: t, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Avorion Server",
	sessionName: "Our Galaxy Server",
	galaxyName: "Our_Galaxy",
	adminSteamId: "76561198000000000",
	mods: "",
	port: 27000,
	maxPlayers: 8,
	installDir: "C:\\Servers\\avorion",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-avorion-server",
	startScriptFilename: "Start_Avorion.bat",
	...extra,
});
const startLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Avorion module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(t && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(t.id, "avorion");
		assert.equal(t.type, "avorion");
		assert.equal(t.displayName, "Avorion");
		assert.equal(t.method, "process");
	});

	it("installs the dedicated server tool (565060), not the game (445220), into the folder root", () => {
		assert.equal(t.updateAppId, "565060");
		assert.equal(t.storeAppId, "445220");
		assert.equal(t.sharedInstall, false);
		assert.equal(t.installLayoutRoot, "");
		assert.ok(t.estimatedInstallBytes > 0);
	});

	it("asks for a galaxy name, an admin and mods", () => {
		assert.deepEqual(t.fields, ["galaxyName", "adminSteamId", "mods"]);
		for (const f of t.fields) assert.ok(t.fieldMeta[f].label.length > 20, f);
	});

	it("says prominently that the panel cannot save and stop the server", () => {
		assert.match(t.description, /CANNOT SAVE AND STOP IT CLEANLY/);
		assert.match(t.description, /\/save/);
		assert.match(t.description, /\/stop/);
	});

	it("does not use rcon: the protocol is not verified", () => {
		assert.equal(t.method, "process");
		assert.equal(t.buildServerEntry(params()).rconPort, undefined);
		assert.equal(t.buildServerEntry(params()).rconPassword, undefined);
	});

	it("has the game port 27000 and a query port, clashing with no other template's port range", async () => {
		assert.deepEqual(t.ports.map((p) => p.key), ["port", "queryPort"]);
		assert.equal(t.ports[0].default, 27000);
		assert.equal(t.ports[1].default, 27004);
		assert.match(t.ports[0].label, /UDP and TCP/);
		assert.deepEqual(t.implicitPorts, [{ offset: 2, label: "its Steam query port" }, { offset: 3, label: "its Steam master port" }]);
		const { GAME_TEMPLATES } = await import("../../src/server/data/gameTemplates.js");
		const mine = new Set([27000, 27001, 27002, 27003, 27004]);
		for (const x of GAME_TEMPLATES.filter((g) => g.id !== "avorion")) {
			const reach = Math.max(1, ...(x.implicitPorts ?? []).map((i) => i.offset));
			for (const p of x.ports ?? []) {
				for (let n = p.default; n <= p.default + reach; n++) assert.ok(!mine.has(n), `${x.id} uses ${n} (${p.key})`);
			}
		}
		// Games written but not registered yet (css, svencoop, hl2dm) keep to their own ranges.
		for (const other of [27515, 27355, 27435]) for (let n = other; n <= other + 3; n++) assert.ok(!mine.has(n), String(n));
	});
});

describe("Avorion start script", () => {
	const script = t.buildStartScript(params());
	const lines = script.split("\r\n");
	const start = startLine(script);

	it("is a CRLF .bat that changes to its own folder first", () => {
		assert.equal(t.buildStartScriptFilename(), "Start_Avorion.bat");
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});

	it("starts bin\\AvorionServer.exe, with a title that ends in -Avorion so the Launch options reader finds the line", () => {
		assert.ok(start, script);
		assert.match(start, /^start \/MIN "My Avorion Server -Avorion" "bin\\AvorionServer\.exe" --galaxy-name /);
	});

	it("gives the galaxy, the data folder, every port, the slots and the name", () => {
		assert.ok(start.includes('--galaxy-name "Our_Galaxy"'));
		assert.ok(start.includes(" --datapath galaxy "));
		assert.ok(start.includes(" --port 27000 "));
		assert.ok(start.includes(" --query-port 27004 "));
		assert.ok(start.includes(" --steam-master-port 27003 "));
		assert.ok(start.includes(" --steam-query-port 27002 "));
		assert.ok(start.includes(" --max-players 8 "));
		assert.ok(start.includes('--server-name "Our Galaxy Server"'));
		assert.ok(start.endsWith(" --admin 76561198000000000"));
	});

	it("shifts the derived ports with the game port, and lets an own query port win", () => {
		const moved = startLine(t.buildStartScript(params({ port: 28000 })));
		assert.ok(moved.includes(" --port 28000 ") && moved.includes(" --query-port 28004 ") && moved.includes(" --steam-master-port 28003 ") && moved.includes(" --steam-query-port 28002 "));
		const own = startLine(t.buildStartScript(params({ queryPort: 29999 })));
		assert.ok(own.includes(" --query-port 29999 "));
	});

	it("leaves --admin off when no id is given, and uses 10 slots when none is asked for", () => {
		const open = startLine(t.buildStartScript(params({ adminSteamId: "", maxPlayers: undefined })));
		assert.ok(!open.includes("--admin"));
		assert.ok(open.includes("--max-players 10"));
		assert.ok(startLine(t.buildStartScript(params({ maxPlayers: 99999 }))).includes("--max-players 1000"));
		assert.ok(startLine(t.buildStartScript(params({ maxPlayers: 0 }))).includes("--max-players 10"));
	});

	it("takes the galaxy and server names from the server's name when none is given", () => {
		const s = startLine(t.buildStartScript(params({ galaxyName: "", sessionName: "" })));
		assert.ok(s.includes('--galaxy-name "My_Avorion_Server"'), s);
		assert.ok(s.includes('--server-name "My Avorion Server"'), s);
	});

	it("never lets a character cmd acts on, or a quote, into the script", () => {
		for (const nasty of ['a" & calc & "b', "100%PATH%", "x | y > z", "a^b<c>d", "line\tbreak", "caf\u00e9!", "back\\slash"]) {
			const s = t.buildStartScript(params({ name: nasty, sessionName: nasty, galaxyName: nasty, adminSteamId: "" }));
			const line = startLine(s);
			assert.equal(cmdSafe(line.slice(line.indexOf("--galaxy-name"))), true, `${JSON.stringify(nasty)} -> ${line}`);
			assert.ok(!/[%&|<>^!]/.test(line.replace(/"[^"]*"/g, "")), line);
			assert.equal((line.match(/"/g) ?? []).length, 8, line); // title, program, galaxy and server name, each in a pair
		}
	});

	it("keeps only digits of a stray admin value on the line", () => {
		const line = startLine(t.buildStartScript(params({ adminSteamId: '7656"&calc' })));
		assert.ok(!line.includes("--admin"), line); // not 17 digits: left off, never changed into something else
		assert.ok(!line.includes("calc"));
	});

	it("keeps the galaxy name to plain characters and 40 of them", () => {
		assert.equal(galaxyName("My Galaxy_2-x"), "My_Galaxy_2-x");
		assert.equal(galaxyName("a/b\\c:d*e?"), "abcde");
		assert.equal(galaxyName("x".repeat(100)).length, 40);
		assert.equal(galaxyName("???"), "Avorion");
		assert.equal(galaxyName("???", "Fallback"), "Fallback");
		assert.equal(galaxyName(undefined), "Avorion");
	});

	it("keeps the server name to plain ASCII and 60 characters", () => {
		assert.equal(serverNameText('  My "Great"   Server & Co  '), "My Great Server Co");
		assert.equal(serverNameText("caf\u00e9"), "caf");
		assert.equal(serverNameText("x".repeat(100)).length, 60);
		assert.equal(serverNameText("%%"), "Avorion Server");
	});

	it("refuses, rather than changes, an admin id that is not 17 digits", () => {
		for (const bad of ["1234", "7656119800000000", "765611980000000000", "abc", "76561198000000000x", "7656 1198000000000", "https://steamcommunity.com/id/me"]) {
			assert.throws(() => adminSteamId(bad), /Steam ID/, bad);
		}
		assert.equal(adminSteamId("  76561198000000000 "), "76561198000000000");
		assert.equal(adminSteamId(""), "");
		assert.equal(adminSteamId(undefined), "");
	});

	it("reads Workshop ids and links, drops repeats, and refuses anything else", () => {
		assert.deepEqual(parseModIds(""), []);
		assert.deepEqual(parseModIds(undefined), []);
		assert.deepEqual(parseModIds("1691539727, 1691591293"), ["1691539727", "1691591293"]);
		assert.deepEqual(parseModIds("https://steamcommunity.com/sharedfiles/filedetails/?id=1691539727 1691539727;1691591293\n"), ["1691539727", "1691591293"]);
		for (const bad of ["abc", "12", "modlister", "123456789012345", "1691539727 oops"]) assert.throws(() => parseModIds(bad), /Workshop/, bad);
		assert.throws(() => parseModIds(Array.from({ length: 51 }, (_, i) => String(100000 + i)).join(",")), /most/);
	});

	it("resolves the names and refuses a bad admin id or mod before anything is downloaded", async () => {
		assert.deepEqual(await t.resolveParams({ name: "Srv One", galaxyName: "Big/Galaxy", adminSteamId: "76561198000000000", mods: "1691539727,1691591293" }), {
			galaxyName: "BigGalaxy",
			adminSteamId: "76561198000000000",
			mods: "1691539727,1691591293",
		});
		assert.deepEqual(await t.resolveParams({ name: "Srv One", galaxyName: "", adminSteamId: "", mods: "" }), { galaxyName: "Srv_One", adminSteamId: "", mods: "" });
		await assert.rejects(t.resolveParams({ name: "x", galaxyName: "g", adminSteamId: "12345", mods: "" }), /Steam ID/);
		await assert.rejects(t.resolveParams({ name: "x", galaxyName: "g", adminSteamId: "", mods: "nope" }), /Workshop/);
	});

	it("can be read back by the panel's direct-launch reader", { skip: !onWindows }, () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "avorion-launch-"));
		try {
			const exe = path.join(dir, "bin", "AvorionServer.exe");
			fs.mkdirSync(path.dirname(exe), { recursive: true });
			fs.writeFileSync(exe, "");
			fs.writeFileSync(path.join(dir, "Start_Avorion.bat"), script);
			const found = deriveLaunch(path.join(dir, "Start_Avorion.bat"), { workingDir: dir });
			assert.equal(found.ok, true, found.reason);
			assert.equal(path.resolve(found.launch.exe).toLowerCase(), path.resolve(exe).toLowerCase());
			assert.ok(found.launch.args.startsWith("--galaxy-name"));
			assert.ok(found.launch.args.includes("--port 27000"));
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it("has NO port where the panel's port editor looks for it (it only knows -port style names, not --port)", () => {
		// Documented limitation: a port change in the Ports section does not rewrite the script. The notes tell the user to edit --port in
		// Launch options, and the lead can extend SCRIPT_FLAGS.
		assert.ok(detectFromScript(script).port == null, JSON.stringify(detectFromScript(script)));
	});
});

describe("Avorion files the panel writes", () => {
	it("writes no server.ini: the server makes it and overwrites it at every start", () => {
		assert.equal(t.buildConfigFile, undefined);
		assert.equal(t.patchInstalledConfig, undefined);
		assert.equal(t.patchAfterFirstBoot, undefined);
	});

	it("writes no modconfig.lua when there are no Workshop ids", () => {
		assert.deepEqual(t.buildExtraFiles(params()), []);
		assert.deepEqual(t.buildExtraFiles(params({ mods: "not a mod" })), []);
	});

	it("writes modconfig.lua into the galaxy folder, in the developers' template with the ids filled in", () => {
		const files = t.buildExtraFiles(params({ mods: "1691539727, 1691591293" }));
		assert.equal(files.length, 1);
		assert.equal(files[0].relPath, "galaxy\\Our_Galaxy\\modconfig.lua");
		assert.equal(
			files[0].content,
			['modLocation = ""', "forceEnabling = false", "mods =", "{", '\t{workshopid = "1691539727"},', '\t{workshopid = "1691591293"}', "}", "allowed =", "{", "}", ""].join("\r\n"),
		);
		const one = t.buildExtraFiles(params({ mods: "1691539727" }))[0].content;
		assert.ok(one.includes('\t{workshopid = "1691539727"}\r\n}'), one);
	});

	it("warns at creation about the stop, server.ini and the ports", async () => {
		const { warnings } = await t.postWrite(params());
		const text = warnings.join(" ");
		assert.match(warnings[0], /cannot be stopped cleanly/);
		assert.match(text, /\/save/);
		assert.match(text, /\/stop/);
		assert.match(text, /15 seconds/);
		assert.match(text, /NEW SEED/);
		assert.match(text, /Password under \[Administration\]/);
		assert.match(text, /UDP and TCP/);
		assert.ok(!/No admin was set/.test(text));
		assert.ok(!/Workshop mods/.test(text));
	});

	it("also warns about a missing admin and about mods when they apply", async () => {
		const text = (await t.postWrite(params({ adminSteamId: "", mods: "1691539727" }))).warnings.join(" ");
		assert.match(text, /No admin was set/);
		assert.match(text, /Disabling a mod/);
	});
});

describe("Avorion server entry", () => {
	const p = params();
	const entry = t.buildServerEntry(p);

	it("records AvorionServer.exe and the galaxy's server.ini under the install folder", () => {
		assert.equal(entry.type, "avorion");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "AvorionServer.exe");
		assert.equal(entry.port, 27000);
		assert.equal(entry.queryPort, 27004);
		assert.equal(entry.updateAppId, "565060");
		assert.equal(entry.autoUpdate, false);
		assert.equal(entry.startScriptPath, "C:\\Servers\\avorion\\Start_Avorion.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\avorion");
		assert.equal(entry.installDir, "C:\\Servers\\avorion\\");
		assert.equal(entry.galaxyName, "Our_Galaxy");
		assert.equal(entry.adminSteamId, "76561198000000000");
		assert.equal(entry.configPath, "C:\\Servers\\avorion\\galaxy\\Our_Galaxy\\server.ini");
		assert.deepEqual(entry.configPaths, { "server.ini": "C:\\Servers\\avorion\\galaxy\\Our_Galaxy\\server.ini" });
		assert.equal(entry.steamCmdPath, "C:\\steamcmd\\steamcmd.exe");
	});

	it("keeps the window on the taskbar so the console can be reached to type /save and /stop", () => {
		assert.equal(entry.windowMode, "minimized");
	});

	it("owns AvorionServer.exe from its own bin folder and nobody else's", { skip: !onWindows }, () => {
		const found = classify(entry, [
			{ pid: 10, path: "C:\\Servers\\avorion\\bin\\AvorionServer.exe" },
			{ pid: 11, path: "D:\\Other\\bin\\AvorionServer.exe" },
			{ pid: 12, path: "C:\\Servers\\avorion2\\bin\\AvorionServer.exe" }, // a sibling folder with the same prefix
			{ pid: 13, path: null },
		]);
		assert.deepEqual(found.owned.map((x) => x.pid), [10]);
		assert.deepEqual(found.foreign.map((x) => x.pid).sort(), [11, 12, 13]);
	});

	it("matches the port in the script and the program the script starts", () => {
		const line = startLine(t.buildStartScript(p));
		assert.equal(Number(/--port (\d+)/.exec(line)[1]), entry.port);
		assert.equal(Number(/--query-port (\d+)/.exec(line)[1]), entry.queryPort);
		assert.ok(line.toLowerCase().includes("bin\\" + entry.processName.toLowerCase()));
		assert.ok(line.includes(`--galaxy-name "${entry.galaxyName}"`));
	});
});

describe("Avorion backups, logs and launch options", () => {
	it("backs up the galaxy folder, inside the server's folder", () => {
		assert.deepEqual(backup.paths.map((x) => x.rel), ["galaxy"]);
		for (const x of backup.paths) {
			assert.equal(x.base, "working");
			assert.ok(x.label);
			assert.ok(!/^[a-z]:|^\.\.|^\//i.test(x.rel), x.rel);
		}
	});

	it("has no log entries: the server's log is in %appdata%, outside the install", () => {
		assert.deepEqual(logs, []);
	});

	it("gets the launch options form", () => {
		assert.equal(launchOptions, true);
	});
});

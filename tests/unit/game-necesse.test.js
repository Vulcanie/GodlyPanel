import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import game, { worldName, launchPassword } from "../../src/server/data/games/necesse.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";
import { cmdSafe } from "../../src/server/services/windowlessLauncher.js";
import { classify } from "../../src/server/services/serverProcesses.js";
import { detectFromScript } from "../../src/server/util/scriptPorts.js";

// Necesse, from the research dossier (nothing was run on a real install): server tool app 1169370, the bundled jre\bin\java.exe running
// Server.jar, one UDP game port, everything on the launch line, no server.cfg written by the panel, no graceful stop.

const { template: t, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Necesse Server",
	sessionName: "Our World",
	serverPassword: "join1234",
	port: 14159,
	maxPlayers: 6,
	installDir: "C:\\Servers\\necesse",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-necesse-server",
	startScriptFilename: "Start_Necesse.bat",
	...extra,
});
const startLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Necesse module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(t && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(t.id, "necesse");
		assert.equal(t.type, "necesse");
		assert.equal(t.displayName, "Necesse");
		assert.equal(t.method, "process");
	});

	it("installs the free dedicated server tool (1169370), not the game (1169040), into the folder root", () => {
		assert.equal(t.updateAppId, "1169370");
		assert.equal(t.storeAppId, "1169040");
		assert.equal(t.sharedInstall, false);
		assert.equal(t.installLayoutRoot, "");
		assert.ok(t.estimatedInstallBytes >= 180_000_000);
	});

	it("asks for a world name and a password, and has no mods field", () => {
		assert.deepEqual(t.fields, ["sessionName", "serverPassword"]);
		assert.match(t.fieldMeta.sessionName.label, /World name/);
	});

	it("says prominently that the panel cannot save and stop the server", () => {
		assert.match(t.description, /CANNOT SAVE AND STOP IT CLEANLY/);
		assert.match(t.description, /quit/);
	});

	it("has one UDP game port that is no other template's default, and not the port after one", async () => {
		assert.deepEqual(t.ports.map((p) => p.key), ["port"]);
		assert.match(t.ports[0].label, /UDP/);
		assert.equal(t.ports[0].default, 14159);
		const { GAME_TEMPLATES } = await import("../../src/server/data/gameTemplates.js");
		const taken = new Set(GAME_TEMPLATES.filter((x) => x.id !== "necesse").flatMap((x) => [...x.ports.map((p) => p.default), ...x.ports.map((p) => p.default + 1)]));
		assert.ok(!taken.has(14159), "14159 is another template's port");
		assert.ok(!taken.has(14160), "14160 is the port after another template's");
	});
});

describe("Necesse start script", () => {
	const script = t.buildStartScript(params());
	const lines = script.split("\r\n");
	const start = startLine(script);

	it("is a CRLF .bat that changes to its own folder first", () => {
		assert.equal(t.buildStartScriptFilename(), "Start_Necesse.bat");
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});

	it("starts the bundled java.exe on Server.jar as a text console, with its data and mods in this folder", () => {
		assert.ok(start, script);
		assert.match(start, /^start \/MIN "My Necesse Server" "jre\\bin\\java\.exe" -jar Server\.jar -nogui /);
		assert.ok(start.includes(" -localdir "));
		assert.ok(start.includes(" -mod .\\mods "));
		assert.ok(!/javaw/i.test(script), "javaw has no console");
		assert.ok(!/StartServer/i.test(script), "the shipped bat starts a second window");
	});

	it("gives the world, the port, the slots and the password", () => {
		assert.ok(start.includes('-world "Our World"'));
		assert.ok(start.includes("-port 14159"));
		assert.ok(start.includes("-slots 6"));
		assert.ok(start.endsWith('-password "join1234"'));
	});

	it("leaves the password off for an open server, and uses 10 slots when none is asked for", () => {
		const open = startLine(t.buildStartScript(params({ serverPassword: "", maxPlayers: undefined })));
		assert.ok(!open.includes("-password"));
		assert.ok(open.includes("-slots 10"));
		assert.ok(startLine(t.buildStartScript(params({ maxPlayers: 9999 }))).includes("-slots 250"));
		assert.ok(startLine(t.buildStartScript(params({ maxPlayers: 0 }))).includes("-slots 10"));
	});

	it("takes the world name from the server's name when no session name is given", () => {
		assert.ok(startLine(t.buildStartScript(params({ sessionName: "" }))).includes('-world "My Necesse Server"'));
	});

	it("never lets a character cmd acts on, or a quote, into the script", () => {
		for (const nasty of ['a" & calc & "b', "100%PATH%", "x | y > z", "a^b<c>d", "line\tbreak", "caf\u00e9!"]) {
			const s = t.buildStartScript(params({ name: nasty, sessionName: nasty, serverPassword: "" }));
			const line = startLine(s);
			assert.equal(cmdSafe(line.slice(line.indexOf("-jar"))), true, `${JSON.stringify(nasty)} -> ${line}`);
			assert.ok(!/[%&|<>^!]/.test(line.replace(/"[^"]*"/, "")), line);
			assert.equal((line.match(/"/g) ?? []).length, 6, line); // title, program and world, each in a pair
		}
	});

	it("keeps the world name to plain characters and 40 of them", () => {
		assert.equal(worldName("My World_2.0-x"), "My World_2.0-x");
		assert.equal(worldName("a/b\\c:d*e?"), "abcde");
		assert.equal(worldName("  .hidden.  "), "hidden");
		assert.equal(worldName("x".repeat(100)).length, 40);
		assert.equal(worldName("???", "world"), "world");
	});

	it("refuses, rather than changes, a password that cannot go on the line", () => {
		for (const bad of ['a"b', "50%", "a&b", "a|b", "a<b", "a>b", "a^b", "a!b", "a\\b", "a\nb", "p\u00e4ss"]) {
			assert.throws(() => launchPassword(bad), /password/i, bad);
		}
		assert.equal(launchPassword("  plain pass-1_2.3  "), "plain pass-1_2.3");
		assert.equal(launchPassword(undefined), "");
	});

	it("resolves the world name and refuses a bad password before anything is downloaded", async () => {
		assert.deepEqual(await t.resolveParams({ name: "Srv", sessionName: "Big/World", serverPassword: "ok pass" }), { sessionName: "BigWorld", serverPassword: "ok pass" });
		assert.deepEqual(await t.resolveParams({ name: "Srv One", sessionName: "", serverPassword: "" }), { sessionName: "Srv One", serverPassword: "" });
		await assert.rejects(t.resolveParams({ name: "x", sessionName: "w", serverPassword: 'a"b' }), /password/i);
	});

	it("can be read back by the panel's direct-launch reader", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "necesse-launch-"));
		try {
			const exe = path.join(dir, "jre", "bin", "java.exe");
			fs.mkdirSync(path.dirname(exe), { recursive: true });
			fs.writeFileSync(exe, "");
			fs.writeFileSync(path.join(dir, "Start_Necesse.bat"), script);
			const found = deriveLaunch(path.join(dir, "Start_Necesse.bat"), { workingDir: dir });
			assert.equal(found.ok, true, found.reason);
			assert.equal(path.resolve(found.launch.exe).toLowerCase(), path.resolve(exe).toLowerCase());
			assert.ok(found.launch.args.startsWith("-jar Server.jar -nogui"));
			assert.ok(found.launch.args.includes("-port 14159"));
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it("has its port where the panel's port editor looks for it", () => {
		assert.equal(detectFromScript(script).port, 14159);
	});
});

describe("Necesse files the panel writes", () => {
	it("writes no server.cfg or world settings: the launch line carries everything", () => {
		assert.equal(t.buildConfigFile, undefined);
		assert.equal(t.patchInstalledConfig, undefined);
		assert.equal(t.patchAfterFirstBoot, undefined);
	});

	it("makes the mods folder the launch line points at, inside the server's folder", () => {
		const files = t.buildExtraFiles(params());
		assert.equal(files.length, 1);
		assert.match(files[0].relPath, /^mods\\[^\\]+$/);
		assert.ok(files[0].content.length > 10);
		assert.ok(!files[0].relPath.endsWith(".jar"));
	});

	it("warns at creation about the stop, the missing owner and the mods", async () => {
		const { warnings } = await t.postWrite(params());
		const text = warnings.join(" ");
		assert.match(warnings[0], /cannot be stopped cleanly/);
		assert.match(text, /quit/);
		assert.match(text, /-owner/);
		assert.match(text, /mods folder/);
	});
});

describe("Necesse server entry", () => {
	const p = params();
	const entry = t.buildServerEntry(p);

	it("records java.exe, told apart by where it runs from, and no settings file", () => {
		assert.equal(entry.type, "necesse");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "java.exe");
		assert.equal(entry.port, 14159);
		assert.equal(entry.updateAppId, "1169370");
		assert.equal(entry.startScriptPath, "C:\\Servers\\necesse\\Start_Necesse.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\necesse");
		assert.equal(entry.installDir, "C:\\Servers\\necesse\\");
		assert.equal(entry.sessionName, "Our World");
		assert.equal(entry.serverPassword, "join1234");
		assert.equal(entry.configPath, undefined);
		assert.equal(entry.configPaths, undefined);
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});

	it("keeps the window on the taskbar so the console can be reached to type quit", () => {
		assert.equal(entry.windowMode, "minimized");
	});

	it("owns the bundled java.exe and nobody else's, by its path", () => {
		const found = classify(entry, [
			{ pid: 10, path: "C:\\Servers\\necesse\\jre\\bin\\java.exe" },
			{ pid: 11, path: "C:\\Program Files\\Java\\jdk-21\\bin\\java.exe" },
			{ pid: 12, path: "C:\\Servers\\necesse2\\jre\\bin\\java.exe" }, // a sibling folder with the same prefix
			{ pid: 13, path: null },
		]);
		assert.deepEqual(found.owned.map((x) => x.pid), [10]);
		assert.deepEqual(found.foreign.map((x) => x.pid).sort(), [11, 12, 13]);
	});

	it("matches the port in the script and the program the script starts", () => {
		const line = startLine(t.buildStartScript(p));
		assert.equal(Number(/-port (\d+)/.exec(line)[1]), entry.port);
		assert.ok(line.toLowerCase().includes("jre\\bin\\" + entry.processName.toLowerCase()));
	});
});

describe("Necesse backups, logs and launch options", () => {
	it("backs up the saves, the settings and the mods, inside the server's folder", () => {
		assert.deepEqual(backup.paths.map((x) => x.rel).sort(), ["cfg", "mods", "saves"]);
		for (const x of backup.paths) {
			assert.equal(x.base, "working");
			assert.ok(x.label);
			assert.ok(!/^[a-z]:|^\.\.|^\//i.test(x.rel), x.rel);
		}
	});

	it("reads the server logs folder", () => {
		assert.deepEqual(logs, [{ kind: "dir", base: "working", rel: "logs", label: "Server logs" }]);
	});

	it("gets the launch options form", () => {
		assert.equal(launchOptions, true);
	});
});

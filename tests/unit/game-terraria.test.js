import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import game, { worldName, parseModIds, modNameFromTmod, downloadMods, playerLimit } from "../../src/server/data/games/terraria.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";
import { cmdSafe } from "../../src/server/services/windowlessLauncher.js";
import { classify } from "../../src/server/services/serverProcesses.js";
import { detectFromScript } from "../../src/server/util/scriptPorts.js";
import { checkSpec } from "../../src/server/services/zipInstall.js";

// Reads real .bat files and real Windows paths, so those tests only run on Windows (CI's Windows job runs it).
const onWindows = process.platform === "win32";

// Terraria with tModLoader, from the research dossier (nothing was run on a real install): installed from tModLoader's GitHub release
// zip, started through the zip's own busybox and start script, one TCP game port, the world and password in serverconfig.txt, the port
// and the player limit on the launch line, Workshop mods by SteamCMD, no graceful stop.

const { template: t, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Terraria Server",
	sessionName: "Our World",
	serverPassword: "join1234",
	port: 7878,
	maxPlayers: 6,
	mods: "",
	installDir: "C:\\Servers\\terraria",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-terraria-server",
	startScriptFilename: "Start_Terraria.bat",
	...extra,
});
const startLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Terraria module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(t && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(t.id, "terraria");
		assert.equal(t.type, "terraria");
		assert.equal(t.displayName, "Terraria (tModLoader)");
		assert.equal(t.method, "process");
	});

	it("is installed from tModLoader's GitHub release, not through SteamCMD", () => {
		assert.equal(t.updateAppId, undefined, "no Steam app can be installed without a login");
		assert.equal(checkSpec(t.zipInstall).repo, "tModLoader/tModLoader");
		assert.equal(t.zipInstall.asset, "tModLoader.zip");
		assert.ok(t.zipInstall.maxBytes >= 100 * 1024 * 1024 && t.zipInstall.maxBytes <= 1024 ** 3);
		for (const file of ["tModLoader.dll", "start-tModLoaderServer.sh", "LaunchUtils\\busybox64.exe", "LaunchUtils\\ScriptCaller.sh"]) {
			assert.ok(t.zipInstall.expect.includes(file), file);
		}
		assert.equal(t.sharedInstall, false);
		assert.equal(t.installLayoutRoot, "");
		assert.ok(t.estimatedInstallBytes >= 500_000_000);
	});

	it("asks for a world name, a password and a Workshop mod list", () => {
		assert.deepEqual(t.fields, ["sessionName", "serverPassword", "mods"]);
		assert.match(t.fieldMeta.sessionName.label, /World name/);
		assert.match(t.fieldMeta.mods.label, /Workshop/);
	});

	it("says prominently that the panel cannot save and stop the server", () => {
		assert.match(t.description, /CANNOT SAVE AND STOP IT CLEANLY/);
		assert.match(t.description, /exit/);
	});

	it("has one TCP game port that is no other template's default, and not the port after one", async () => {
		assert.deepEqual(t.ports.map((p) => p.key), ["port"]);
		assert.match(t.ports[0].label, /TCP/);
		assert.equal(t.ports[0].default, 7878);
		const { GAME_TEMPLATES } = await import("../../src/server/data/gameTemplates.js");
		const taken = new Set(GAME_TEMPLATES.filter((x) => x.id !== "terraria").flatMap((x) => [...x.ports.map((p) => p.default), ...x.ports.map((p) => p.default + 1)]));
		assert.ok(!taken.has(7878), "7878 is another template's port");
		assert.ok(!taken.has(7879), "7879 is the port after another template's");
		assert.ok(taken.has(7777), "7777 really is taken, which is why 7878 is used");
	});

	it("needs SteamCMD only when Workshop mods are asked for", () => {
		assert.equal(t.needsSteamCmd({}), false);
		assert.equal(t.needsSteamCmd({ mods: "" }), false);
		assert.equal(t.needsSteamCmd({ mods: "2824688072" }), true);
		assert.equal(t.needsSteamCmd({ mods: "not an id" }), false, "an unreadable list is refused later, it does not break the check");
	});
});

describe("Terraria start script", () => {
	const script = t.buildStartScript(params());
	const lines = script.split("\r\n");
	const start = startLine(script);

	it("is a CRLF .bat that changes to its own folder first", () => {
		assert.equal(t.buildStartScriptFilename(), "Start_Terraria.bat");
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});

	it("starts tModLoader's own start script through the zip's busybox, never asking about Steam", () => {
		assert.ok(start, script);
		assert.match(start, /^start \/MIN "My Terraria Server" "LaunchUtils\\busybox64\.exe" bash \.\/start-tModLoaderServer\.sh -nosteam /);
		assert.ok(start.includes(" -config serverconfig.txt "));
		assert.ok(!/start-tModLoaderServer\.bat/i.test(script), "the shipped bat starts a window of its own and returns at once");
	});

	it("gives the port and the player limit, and keeps the data in the server's folder", () => {
		assert.ok(start.includes(" -port 7878"));
		assert.ok(start.includes(" -players 6"));
		assert.ok(start.endsWith(" -tmlsavedirectory tmldata"));
	});

	it("keeps every value on the line to one word, because the shipped script splits on spaces", () => {
		const afterScript = start.slice(start.indexOf("start-tModLoaderServer.sh") + "start-tModLoaderServer.sh".length);
		assert.ok(!afterScript.includes('"'), afterScript);
		assert.ok(!/world|pass/i.test(afterScript), "the world and the password are in serverconfig.txt");
	});

	it("uses 8 players when none is asked for, and stays within the game's 1 to 255", () => {
		assert.ok(startLine(t.buildStartScript(params({ maxPlayers: undefined }))).includes("-players 8"));
		assert.ok(startLine(t.buildStartScript(params({ maxPlayers: 9999 }))).includes("-players 8"));
		assert.ok(startLine(t.buildStartScript(params({ maxPlayers: 255 }))).includes("-players 255"));
		assert.ok(startLine(t.buildStartScript(params({ maxPlayers: 0 }))).includes("-players 8"));
		assert.equal(playerLimit("12"), 12);
	});

	it("points tModLoader at the Workshop downloads only when mods were asked for", () => {
		assert.ok(!start.includes("-steamworkshopfolder"));
		const withMods = startLine(t.buildStartScript(params({ mods: "2824688072,2619954303" })));
		assert.ok(withMods.includes(" -steamworkshopfolder steamapps/workshop"), withMods);
	});

	it("never lets a character cmd acts on, or a quote, into the script", () => {
		for (const nasty of ['a" & calc & "b', "100%PATH%", "x | y > z", "a^b<c>d", "line\tbreak", "caf\u00e9!"]) {
			const s = t.buildStartScript(params({ name: nasty, sessionName: nasty, serverPassword: nasty }));
			const line = startLine(s);
			assert.equal(cmdSafe(line.slice(line.indexOf("bash"))), true, `${JSON.stringify(nasty)} -> ${line}`);
			assert.ok(!/[%&|<>^!]/.test(line.replace(/"[^"]*"/g, "")), line);
			assert.equal((line.match(/"/g) ?? []).length, 4, line); // the title and the program, each in a pair
		}
	});

	it("can be read back by the panel's direct-launch reader", { skip: !onWindows }, () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "terraria-launch-"));
		try {
			const exe = path.join(dir, "LaunchUtils", "busybox64.exe");
			fs.mkdirSync(path.dirname(exe), { recursive: true });
			fs.writeFileSync(exe, "");
			fs.writeFileSync(path.join(dir, "Start_Terraria.bat"), script);
			const found = deriveLaunch(path.join(dir, "Start_Terraria.bat"), { workingDir: dir });
			assert.equal(found.ok, true, found.reason);
			assert.equal(path.resolve(found.launch.exe).toLowerCase(), path.resolve(exe).toLowerCase());
			assert.ok(found.launch.args.startsWith("bash ./start-tModLoaderServer.sh -nosteam"));
			assert.ok(found.launch.args.includes("-port 7878"));
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it("has its port where the panel's port editor looks for it", () => {
		assert.equal(detectFromScript(script).port, 7878);
	});
});

describe("Terraria serverconfig.txt", () => {
	const { relPath, content } = t.buildConfigFile(params());
	const lines = content.split("\r\n");
	const settings = Object.fromEntries(lines.filter((l) => l && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));

	it("is the file the launch line names, in the server's folder", () => {
		assert.equal(relPath, "serverconfig.txt");
		assert.ok(content.endsWith("\r\n"));
	});

	it("loads a world file in the server's own folder, and makes a Medium one if it is not there", () => {
		assert.equal(settings.world, "C:\\Servers\\terraria\\tmldata\\Worlds\\Our World.wld");
		assert.ok(!settings.world.includes('"'), "the game wants no quotes around the path");
		assert.equal(settings.autocreate, "2");
		assert.equal(settings.worldname, "Our World");
	});

	const settingsOf = (extra) =>
		Object.fromEntries(
			t.buildConfigFile(params(extra))
				.content.split("\r\n")
				.filter((l) => l && !l.startsWith("#"))
				.map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
		);

	it("writes the password as it was typed, and leaves the line out for an open server", () => {
		assert.equal(settings.password, "join1234");
		assert.equal(settingsOf({ serverPassword: "a b=c#d" }).password, "a b=c#d");
		assert.ok(!("password" in settingsOf({ serverPassword: "" })));
	});

	it("does not repeat the port or the player limit, which are on the launch line", () => {
		assert.ok(!("port" in settings));
		assert.ok(!("maxplayers" in settings));
	});

	it("takes the world's name from the server's name when no session name is given", () => {
		const s = t.buildConfigFile(params({ sessionName: "" })).content;
		assert.match(s, /worldname=My Terraria Server\r\n/);
		assert.match(s, /My Terraria Server\.wld/);
	});

	it("keeps the world's name to plain characters and 27 of them", () => {
		assert.equal(worldName("My World_2.0-x"), "My World_2.0-x");
		assert.equal(worldName("a/b\\c:d*e?"), "abcde");
		assert.equal(worldName("  .hidden.  "), "hidden");
		assert.equal(worldName("x".repeat(100)).length, 27);
		assert.equal(worldName("???", "World"), "World");
	});

	it("never lets a line break into a value", () => {
		const s = t.buildConfigFile(params({ serverPassword: "ab\r\nworld=C:\\evil.wld", sessionName: "x\r\nworld=C:\\evil.wld" })).content;
		assert.equal(s.split("\r\n").filter((l) => l.startsWith("world=")).length, 1);
	});
});

describe("Terraria form values", () => {
	it("resolves the world name, the password and the mod list before anything is downloaded", async () => {
		assert.deepEqual(await t.resolveParams({ name: "Srv", sessionName: "Big/World", serverPassword: " ok pass ", mods: "2824688072, https://steamcommunity.com/sharedfiles/filedetails/?id=2619954303" }), {
			sessionName: "BigWorld",
			serverPassword: "ok pass",
			mods: "2824688072,2619954303",
		});
		assert.deepEqual(await t.resolveParams({ name: "Srv One", sessionName: "", serverPassword: "", mods: "" }), { sessionName: "Srv One", serverPassword: "", mods: "" });
		await assert.rejects(t.resolveParams({ name: "x", mods: "abc" }), /not a Steam Workshop item id/);
	});

	it("reads mod ids as numbers or links, once each, and refuses anything else", () => {
		assert.deepEqual(parseModIds("2824688072 2824688072\n2619954303;2669644269"), ["2824688072", "2619954303", "2669644269"]);
		assert.deepEqual(parseModIds(""), []);
		for (const bad of ["12", "1234567890123", "mod", "-5", "1e9", "https://example.com/no-id"]) assert.throws(() => parseModIds(bad), /not a Steam Workshop item id/, bad);
		assert.throws(() => parseModIds(Array.from({ length: 61 }, (_, i) => 100000 + i).join(",")), /most this form takes/);
	});
});

// A .tmod header as TmodFile.Read in the tModLoader source reads it: "TMOD", the tML version as a BinaryWriter string, a 20-byte hash, a
// 256-byte signature, an int32 length, then the mod's name and version as BinaryWriter strings (7-bit length, then UTF-8).
const bwString = (text) => {
	const body = Buffer.from(text, "utf8");
	const length = [];
	let n = body.length;
	do {
		let byte = n & 0x7f;
		n >>= 7;
		if (n > 0) byte |= 0x80;
		length.push(byte);
	} while (n > 0);
	return Buffer.concat([Buffer.from(length), body]);
};
const tmod = (name, version = "1.0.0.0", tml = "2026.8.3.0") =>
	Buffer.concat([Buffer.from("TMOD", "ascii"), bwString(tml), Buffer.alloc(20, 1), Buffer.alloc(256, 2), Buffer.from([0, 1, 0, 0]), bwString(name), bwString(version), Buffer.from("file table and data follow")]);

describe("Terraria Workshop mods", () => {
	it("reads a mod's internal name from the start of its .tmod file", () => {
		assert.equal(modNameFromTmod(tmod("MagicStorage")), "MagicStorage");
		assert.equal(modNameFromTmod(tmod("CalamityMod", "2.0.4.1", "v2026.8.3.0")), "CalamityMod");
		assert.equal(modNameFromTmod(tmod("N".repeat(100))), "N".repeat(100));
	});

	it("refuses a name longer than any mod has, rather than read it", () => {
		assert.equal(modNameFromTmod(tmod("A".repeat(130))), null);
	});

	it("gives nothing for a file that is not a .tmod", () => {
		for (const bad of [Buffer.alloc(0), Buffer.from("TMO"), Buffer.from("NOPE and more bytes here"), tmod("Mod").subarray(0, 40), Buffer.concat([Buffer.from("TMOD"), Buffer.from([200, 200, 200, 200, 200, 200])]), tmod("bad name!"), tmod("1Mod"), tmod("")]) {
			assert.equal(modNameFromTmod(bad), null);
		}
	});

	it("downloads each mod, reads its name, and writes the list of enabled mods", { skip: !onWindows }, async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "terraria-mods-"));
		try {
			const calls = [];
			const run = async (exe, args) => {
				calls.push([exe, ...args]);
				const id = args[args.indexOf("+workshop_download_item") + 2];
				if (id === "300000000") return { output: "ERROR! Download item 300000000 failed (Access Denied).", error: null };
				const folder = path.join(dir, "steamapps", "workshop", "content", "1281930", id, "2026.8");
				fs.mkdirSync(folder, { recursive: true });
				if (id === "400000000") fs.writeFileSync(path.join(folder, "Weird.tmod"), "not a mod file");
				else fs.writeFileSync(path.join(folder, `${id}.tmod`), tmod(id === "100000000" ? "MagicStorage" : "BossChecklist"));
				return { output: "Success", error: null };
			};
			const lines = [];
			const out = await downloadMods({ installDir: dir, steamCmdExe: "C:\\steamcmd\\steamcmd.exe", mods: "100000000,200000000,300000000,400000000" }, { run, log: (m) => lines.push(m) });
			assert.deepEqual(out.installed, ["100000000", "200000000", "400000000"]);
			assert.deepEqual(out.enabled, ["MagicStorage", "BossChecklist"]);
			assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "tmldata", "Mods", "enabled.json"), "utf8")), ["MagicStorage", "BossChecklist"]);
			assert.deepEqual(calls[0], ["C:\\steamcmd\\steamcmd.exe", "+force_install_dir", dir, "+login", "anonymous", "+workshop_download_item", "1281930", "100000000", "+quit"]);
			const text = out.warnings.join(" ");
			assert.match(text, /Workshop mod 300000000 was not added.*Access Denied/);
			assert.match(text, /Workshop mod 400000000 was downloaded, but the panel could not read its name/);
			assert.match(text, /required items/);
			assert.ok(fs.existsSync(path.join(dir, "steamapps", "workshop", "content", "1281930", "100000000")), "the downloads stay where tModLoader reads them");
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it("does nothing, and runs no SteamCMD, when there are no mods", async () => {
		let ran = false;
		const out = await downloadMods({ installDir: "C:\\x", mods: "" }, { run: async () => { ran = true; return { output: "" }; } });
		assert.equal(ran, false);
		assert.deepEqual(out, { warnings: [], installed: [], enabled: [] });
	});

	it("writes no enabled.json when no mod could be named", { skip: !onWindows }, async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "terraria-mods-"));
		try {
			const out = await downloadMods({ installDir: dir, steamCmdExe: "x", mods: "100000000" }, { run: async () => ({ output: "" }) });
			assert.equal(out.installed.length, 0);
			assert.ok(!fs.existsSync(path.join(dir, "tmldata")));
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("Terraria files the panel writes", () => {
	it("makes the mods and worlds folders the game reads, inside the server's folder, with a note in each", () => {
		const files = t.buildExtraFiles(params());
		assert.deepEqual(files.map((f) => f.relPath.split("\\").slice(0, -1).join("\\")).sort(), ["tmldata\\Mods", "tmldata\\Worlds"]);
		for (const f of files) {
			assert.ok(f.content.length > 20);
			assert.ok(!/\.(tmod|wld|json)$/i.test(f.relPath), f.relPath);
		}
	});

	it("has no Steam config of its own, no patching and no first-boot step", () => {
		assert.equal(t.patchInstalledConfig, undefined);
		assert.equal(t.patchAfterFirstBoot, undefined);
		assert.equal(t.rconConfigRelPath, undefined);
	});

	it("warns at creation about the stop, the first start and the version", async () => {
		const { warnings } = await t.postWrite(params());
		const text = warnings.join(" ");
		assert.match(warnings[0], /cannot save and stop this server cleanly/);
		assert.match(text, /type exit/);
		assert.match(text, /\.NET runtime/);
		assert.match(text, /TCP port 7878/);
		assert.match(text, /same tModLoader version/);
	});
});

describe("Terraria server entry", () => {
	const p = params();
	const entry = t.buildServerEntry(p);

	it("records dotnet.exe, told apart by where it runs from, and the settings file", () => {
		assert.equal(entry.type, "terraria");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "dotnet.exe");
		assert.equal(entry.port, 7878);
		assert.equal(entry.startScriptPath, "C:\\Servers\\terraria\\Start_Terraria.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\terraria");
		assert.equal(entry.installDir, "C:\\Servers\\terraria\\");
		assert.equal(entry.sessionName, "Our World");
		assert.equal(entry.serverPassword, "join1234");
		assert.equal(entry.configPath, "C:\\Servers\\terraria\\serverconfig.txt");
		assert.deepEqual(entry.configPaths, { "serverconfig.txt": "C:\\Servers\\terraria\\serverconfig.txt" });
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.updateAppId, undefined, "there is no SteamCMD update for it");
		assert.equal(entry.autoUpdate, false);
	});

	it("keeps the window on the taskbar so the console can be reached to type exit", () => {
		assert.equal(entry.windowMode, "minimized");
	});

	it("owns the dotnet.exe in its own folder and nobody else's, by its path", { skip: !onWindows }, () => {
		const found = classify(entry, [
			{ pid: 10, path: "C:\\Servers\\terraria\\dotnet\\dotnet.exe" },
			{ pid: 11, path: "C:\\Program Files\\dotnet\\dotnet.exe" },
			{ pid: 12, path: "C:\\Servers\\terraria2\\dotnet\\dotnet.exe" }, // a sibling folder with the same prefix
			{ pid: 13, path: null },
		]);
		assert.deepEqual(found.owned.map((x) => x.pid), [10]);
		assert.deepEqual(found.foreign.map((x) => x.pid).sort(), [11, 12, 13]);
	});

	it("matches the port in the script and in the settings file", () => {
		const line = startLine(t.buildStartScript(p));
		assert.equal(Number(/-port (\d+)/.exec(line)[1]), entry.port);
		assert.ok(line.includes("-config serverconfig.txt"));
		assert.ok(entry.configPath.endsWith("\\serverconfig.txt"));
	});
});

describe("Terraria backups, logs and launch options", () => {
	it("backs up the worlds, the mod settings, the enabled mods and the settings, inside the server's folder", () => {
		assert.deepEqual(backup.paths.map((x) => x.rel).sort(), ["banlist.txt", "serverconfig.txt", "tmldata/ModConfigs", "tmldata/Mods", "tmldata/Worlds"]);
		for (const x of backup.paths) {
			assert.equal(x.base, "working");
			assert.ok(x.label);
			assert.ok(!/^[a-z]:|^\.\.|^\//i.test(x.rel), x.rel);
		}
	});

	it("leaves the Workshop downloads out of the backup", () => {
		assert.ok(!backup.paths.some((x) => /steamapps/i.test(x.rel)));
	});

	it("reads the server logs folder", () => {
		assert.deepEqual(logs, [{ kind: "dir", base: "working", rel: "tModLoader-Logs", label: "Server logs" }]);
	});

	it("gets the launch options form", () => {
		assert.equal(launchOptions, true);
	});
});

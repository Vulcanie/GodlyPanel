import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import game, { SANDBOX_DEFAULTS } from "../../src/server/data/games/abiotic.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";

// Reads real .bat files and real Windows paths, so it only runs on Windows (CI's Windows job runs it).
const onWindows = process.platform === "win32";

// Abiotic Factor, from the research dossier (developer wiki plus a real SteamCMD install of server app 2857200, build 24343458).

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Lab Server",
	sessionName: "Friends Lab",
	serverPassword: "join-me",
	adminPassword: "boss-pass",
	port: 8950,
	queryPort: 8952,
	installDir: "C:\\Servers\\lab",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-lab-server",
	startScriptFilename: "Start_AbioticFactor.bat",
	...extra,
});
const launchLine = (p) => template.buildStartScript(p).split("\r\n").find((l) => l.startsWith("start "));

describe("Abiotic Factor module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "abiotic");
		assert.equal(template.type, "abiotic");
		assert.equal(template.displayName, "Abiotic Factor");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server tool anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "2857200");
		assert.equal(template.storeAppId, "427410");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name and the two passwords, and for nothing it cannot use (no RCON password, no mods)", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "adminPassword"]);
		assert.ok(!template.fields.includes("mods"));
		assert.ok(!template.fields.includes("rconPassword"));
	});

	it("has two UDP ports that clash with no other default and are not next to each other", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		for (const p of template.ports) assert.match(p.label, /UDP/);
		const [game_, query] = template.ports.map((p) => p.default);
		const taken = [7015, 7017, 7777, 7780, 8888, 8890, 8892, 8894, 8895, 8900, 8902, 8910, 8915, 8920, 8922, 8923, 9876, 9878, 15637, 16261, 16270, 17777, 17779, 25565, 26000, 26002, 26003, 27015, 27016, 28015, 28017, 28018, 8766];
		assert.ok(!taken.includes(game_) && !taken.includes(query));
		for (const i of implicitPortsOf(template)) assert.notEqual(game_ + i.offset, query);
	});
});

describe("Abiotic Factor start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("goes to the folder of the Shipping program, where steam_appid.txt is, and starts it with -log", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0AbioticFactor\\Binaries\\Win64"');
		const launch = launchLine(params());
		assert.match(launch, /^start \/MIN "My Lab Server" AbioticFactorServer-Win64-Shipping\.exe -log /);
		assert.match(launch, / -useperfthreads /);
	});

	it("uses the equals form for every game argument and quotes the name and passwords", () => {
		const launch = launchLine(params());
		assert.match(launch, / -MaxServerPlayers=6 /);
		assert.match(launch, / -PORT=8950 /);
		assert.match(launch, / -QueryPort=8952 /);
		assert.match(launch, / -SteamServerName="Friends Lab"/);
		assert.match(launch, / -ServerPassword="join-me"/);
		assert.match(launch, / -AdminPassword="boss-pass"$/);
		assert.match(launch, / -WorldSaveName=Cascade /);
		assert.match(launch, / -SandboxIniPath=Config\/WindowsServer\/SandboxSettings\.ini/);
	});

	it("never uses -NOSTEAM", () => {
		assert.doesNotMatch(script, /NOSTEAM/i);
	});

	it("leaves the passwords off when they are empty, instead of passing an empty value", () => {
		const launch = launchLine(params({ serverPassword: "", adminPassword: undefined }));
		assert.doesNotMatch(launch, /ServerPassword/);
		assert.doesNotMatch(launch, /AdminPassword/);
	});

	it("has the same ports as the server entry", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(Number(/-PORT=(\d+)/.exec(script)[1]), entry.port);
		assert.equal(Number(/-QueryPort=(\d+)/.exec(script)[1]), entry.queryPort);
	});

	it("keeps the player limit within the game's 1 to 24 and defaults to 6", () => {
		const slots = (maxPlayers) => Number(/-MaxServerPlayers=(\d+)/.exec(launchLine(params({ maxPlayers })))[1]);
		assert.equal(slots(undefined), 6);
		assert.equal(slots(12), 12);
		assert.equal(slots(500), 24);
		assert.equal(slots(0), 6);
		assert.equal(slots("abc"), 6);
		assert.equal(slots(8.9), 8);
	});

	it("uses the server's name when no session name was given", () => {
		assert.match(launchLine(params({ sessionName: "" })), /-SteamServerName="My Lab Server"/);
	});

	it("keeps characters cmd would act on out of the window title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>' }));
		const launch = bad.split("\r\n").find((l) => l.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(launch);
		assert.ok(title, launch);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.equal(bad.split("\r\n").filter((l) => l.includes("calc")).length, 1);
		assert.match(template.buildStartScript(params({ name: '"&%' })).split("\r\n").find((l) => l.startsWith("start ")), /^start \/MIN "Abiotic Factor" /);
	});

	it("cannot be broken out of by a quote, a percent sign or a trailing backslash in a typed value", () => {
		const launch = launchLine(params({ sessionName: 'He said "hi" 100% \\', serverPassword: 'a"b%c\\\\', adminPassword: 'x"; calc' }));
		const quotes = launch.slice(launch.indexOf("AbioticFactorServer-Win64-Shipping.exe")).match(/"/g).length;
		assert.equal(quotes % 2, 0, launch);
		assert.match(launch, /-SteamServerName="He said hi 100%% "/);
		assert.match(launch, /-ServerPassword="ab%%c"/);
		assert.match(launch, /-AdminPassword="x; calc"/);
	});

	it("has no line break inside the launch line and ends with a line break", () => {
		assert.equal(script.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(script.endsWith("\r\n"));
		assert.doesNotMatch(script.replace(/\r\n/g, ""), /[\r\n]/);
	});

	it("is read by the panel as a direct launch (so 'no window' mode is available) of the Shipping program", { skip: !onWindows }, () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "abiotic-test-"));
		try {
			const win64 = path.join(dir, "AbioticFactor", "Binaries", "Win64");
			fs.mkdirSync(win64, { recursive: true });
			fs.writeFileSync(path.join(win64, "AbioticFactorServer-Win64-Shipping.exe"), "");
			const scriptPath = path.join(dir, "Start_AbioticFactor.bat");
			fs.writeFileSync(scriptPath, template.buildStartScript(params({ installDir: dir })));
			const found = deriveLaunch(scriptPath, { workingDir: dir });
			assert.equal(found.ok, true, JSON.stringify(found));
			assert.equal(found.launch.exe.toLowerCase(), path.join(win64, "AbioticFactorServer-Win64-Shipping.exe").toLowerCase());
			assert.equal(found.launch.cwd.toLowerCase(), win64.toLowerCase());
			assert.ok(found.launch.args.includes("-log"));
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("Abiotic Factor SandboxSettings.ini", () => {
	const file = template.buildConfigFile(params());
	const lines = file.content.split("\r\n");

	it("is written where -SandboxIniPath points, inside the AbioticFactor\\Saved folder", () => {
		assert.equal(file.relPath, "AbioticFactor\\Saved\\Config\\WindowsServer\\SandboxSettings.ini");
		assert.match(launchLine(params()), /-SandboxIniPath=Config\/WindowsServer\/SandboxSettings\.ini/);
	});

	it("starts with the [SandboxSettings] header and has no byte-order mark", () => {
		assert.equal(lines[0], "[SandboxSettings]");
		assert.notEqual(file.content.charCodeAt(0), 0xfeff);
		assert.ok(file.content.endsWith("\r\n"));
	});

	it("has the developer's 48 keys once each, with True/False for yes/no", () => {
		const body = lines.slice(1).filter(Boolean);
		assert.equal(body.length, 48);
		assert.equal(SANDBOX_DEFAULTS.length, 48);
		const keys = body.map((l) => l.split("=")[0]);
		assert.equal(new Set(keys).size, 48);
		for (const l of body) assert.match(l, /^[A-Za-z]+=(True|False|-?\d+(\.\d+)?)$/);
	});

	it("carries the defaults of the developer's example file", () => {
		const by = Object.fromEntries(lines.slice(1).filter(Boolean).map((l) => l.split("=")));
		assert.equal(by.GameDifficulty, "1");
		assert.equal(by.DamageToAlliesMultiplier, "0.5");
		assert.equal(by.DurabilityLossOnDeathMultiplier, "0.1");
		assert.equal(by.BaseInventorySize, "12");
		assert.equal(by.StructuralSupportLimit, "5");
		assert.equal(by.PowerSocketsOffAtNight, "True");
		assert.equal(by.HardcoreMode, "False");
		assert.equal(by.ApocalypticAbilities, "False");
		assert.equal(by.EnemyAccuracy, "2");
	});

	it("contains no password", () => {
		assert.ok(!file.content.includes("join-me") && !file.content.includes("boss-pass"));
	});
});

describe("Abiotic Factor server entry", () => {
	const entry = template.buildServerEntry(params());

	it("has the fields the panel needs", () => {
		assert.equal(entry.name, "My Lab Server");
		assert.equal(entry.type, "abiotic");
		assert.equal(entry.method, "process");
		assert.equal(entry.host, "127.0.0.1");
		assert.equal(entry.port, 8950);
		assert.equal(entry.queryPort, 8952);
		assert.equal(entry.sessionName, "Friends Lab");
		assert.equal(entry.startScriptPath, "C:\\Servers\\lab\\Start_AbioticFactor.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\lab");
		assert.equal(entry.installDir, "C:\\Servers\\lab\\");
		assert.equal(entry.updateAppId, "2857200");
		assert.equal(entry.steamCmdPath, "C:\\steamcmd\\steamcmd.exe");
		assert.equal(entry.autoUpdate, false);
	});

	it("tracks the Shipping program, the one that holds the ports, and not the launcher beside it", () => {
		assert.equal(entry.processName, "AbioticFactorServer-Win64-Shipping.exe");
		assert.equal(launchLine(params()).includes(entry.processName), true);
	});

	it("names the two settings files where the game reads them", () => {
		assert.deepEqual(entry.configPaths, {
			"SandboxSettings.ini": "C:\\Servers\\lab\\AbioticFactor\\Saved\\Config\\WindowsServer\\SandboxSettings.ini",
			"Admin.ini": "C:\\Servers\\lab\\AbioticFactor\\Saved\\SaveGames\\Server\\Admin.ini",
		});
		assert.equal(entry.configPath, entry.configPaths["SandboxSettings.ini"]);
	});

	it("keeps the admin password out of the entry", () => {
		assert.ok(!JSON.stringify(entry).includes("boss-pass"));
	});

	it("does not need an RCON port (the game has none)", () => {
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});
});

describe("Abiotic Factor backup and logs", () => {
	it("backs up the saves folder (worlds and admin list) and the world rules, relative to the server folder", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["AbioticFactor/Saved/SaveGames", "AbioticFactor/Saved/Config/WindowsServer/SandboxSettings.ini"]);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("reads the game's log folder", () => {
		assert.deepEqual(logs, [{ kind: "dir", base: "working", rel: "AbioticFactor/Saved/Logs", label: "Game log" }]);
	});

	it("matches the folders the config files are in", () => {
		const entry = template.buildServerEntry(params());
		for (const file of Object.values(entry.configPaths)) {
			const rel = file.slice("C:\\Servers\\lab\\".length).replace(/\\/g, "/");
			assert.ok(backup.paths.some((p) => rel === p.rel || rel.startsWith(`${p.rel}/`)), rel);
		}
	});
});

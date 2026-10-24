import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game, { cfgName } from "../../src/server/data/games/ageofchivalry.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Age of Chivalry (dossier: docs/research/games/ageofchivalry/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My AoC",
	sessionName: "Friends Server",
	port: 27030,
	installDir: "C:\\Servers\\aoc",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-aoc",
	startScriptFilename: "Start_AgeOfChivalry.bat",
	...extra,
});

// Every template's ports, from the legacy list and every game module (registered or not), so a clash with any of them is caught.
const gamesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "server", "data", "games");
const others = []; // { id, ports: [{ port, offsets }] }
for (const t of GAME_TEMPLATES) {
	if (t.id === template.id) continue;
	others.push({ id: t.id, ports: (t.ports ?? []).map((p) => ({ port: Number(p.default), offsets: [] })) });
}
for (const f of readdirSync(gamesDir)) {
	if (!f.endsWith(".js") || f === "index.js" || f === "ageofchivalry.js") continue;
	const mod = (await import(pathToFileURL(path.join(gamesDir, f)).href)).default;
	const t = mod?.template;
	if (!t || t.id === template.id) continue;
	const implicit = (t.implicitPorts ?? []).map((i) => i.offset);
	others.push({ id: t.id, ports: (t.ports ?? []).map((p) => ({ port: Number(p.default), offsets: implicit })) });
}

describe("Age of Chivalry module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "ageofchivalry");
		assert.equal(template.type, "ageofchivalry");
		assert.equal(template.displayName, "Age of Chivalry");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (17515) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "17515");
		assert.equal(template.storeAppId, "17510");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name only: no password, RCON or mods field", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
		assert.ok(!template.fields.includes("rconPassword"));
		assert.ok(!template.fields.includes("serverPassword"));
		assert.ok(!template.fields.includes("mods"));
	});

	it("declares one port, 27030, and no other template holds it or the ports next to it", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const base = template.ports[0].default;
		assert.equal(base, 27030);
		for (const other of others) {
			for (const p of other.ports) {
				for (let o = -2; o <= 2; o++) assert.notEqual(p.port, base + o, `${other.id} uses ${base + o}`);
				for (const off of p.offsets) {
					for (let o = -2; o <= 2; o++) assert.notEqual(p.port + off, base + o, `${other.id} holds ${p.port + off} beside its port`);
				}
			}
		}
	});
});

describe("Age of Chivalry start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder first", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
	});

	it("starts srcds.exe with the mod folder, the map, the player limit, the port and the settings file", () => {
		assert.match(
			launch,
			/^start \/MIN "My AoC" srcds\.exe -console -game ageofchivalry -secure \+map aoc_siege \+log on \+maxplayers 32 -port 27030 \+ip 0\.0\.0\.0 \+exec server\.cfg$/,
		);
	});

	it("keeps the port in the script equal to the entry's port", () => {
		const entry = template.buildServerEntry(params());
		assert.match(launch, new RegExp(`-port ${entry.port} `));
	});

	it("does not write -autoupdate, which the dossier says Valve has not implemented on Windows", () => {
		assert.doesNotMatch(launch, /-autoupdate/);
	});

	it("never lets a quote, percent, ampersand or pipe from the title into the script", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});
});

describe("Age of Chivalry settings file (server.cfg)", () => {
	const cfg = template.buildConfigFile(params());

	it("is written to ageofchivalry\\cfg\\server.cfg, with single backslashes in the path", () => {
		assert.equal(cfg.relPath, "ageofchivalry\\cfg\\server.cfg");
		assert.ok(cfg.relPath.includes("\\"), "the path must have backslashes");
	});

	it("names the server and sets sv_lan and log, one command per line", () => {
		assert.match(cfg.content, /^hostname "Friends Server"$/m);
		assert.match(cfg.content, /^sv_lan 0$/m);
		assert.match(cfg.content, /^log on$/m);
		assert.match(cfg.content, /^\/\/ Age of Chivalry server settings/m);
	});

	it("uses the panel name when no server name was typed", () => {
		const c = template.buildConfigFile(params({ sessionName: "", name: "Panel Name" }));
		assert.match(c.content, /^hostname "Panel Name"$/m);
	});

	it("drops the characters that would change what the game reads from the name", () => {
		assert.equal(cfgName('Say "hi"; // \\ there', "x"), "Say hi there");
		assert.equal(cfgName("   ", "fallback"), "fallback");
	});
});

describe("Age of Chivalry server entry and backup", () => {
	const entry = template.buildServerEntry(params());

	it("names srcds.exe as the process and records the port", () => {
		assert.equal(entry.type, "ageofchivalry");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.port, 27030);
		assert.equal(entry.updateAppId, "17515");
		assert.equal(entry.autoUpdate, false);
	});

	it("points the settings file at the install's ageofchivalry\\cfg folder", () => {
		assert.equal(entry.configPaths["server.cfg"], "C:\\Servers\\aoc\\ageofchivalry\\cfg\\server.cfg");
		assert.equal(entry.configPath, "C:\\Servers\\aoc\\ageofchivalry\\cfg\\server.cfg");
	});

	it("backs up the settings folder, and reads no log file (the dossier names none)", () => {
		assert.deepEqual(backup, { paths: [{ base: "working", rel: "ageofchivalry/cfg", label: "Server settings" }] });
		assert.deepEqual(logs, []);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game from "../../src/server/data/games/arma3.js";

// Arma 3 (dossier: docs/research/games/arma3/, confidence medium). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Arma Server",
	sessionName: "My Arma Server",
	port: 2302,
	serverPassword: "joinpw",
	adminPassword: "adminpw",
	maxPlayers: 32,
	installDir: "C:\\Servers\\arma3",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-arma",
	startScriptFilename: "Start_Arma3.bat",
	...extra,
});

// Every other game module, registered or not, so a port clash with an unregistered one is caught too. A module that does not load is
// read as text instead, and its ports are taken from its source.
const gamesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "server", "data", "games");
const otherPorts = []; // { id, ports: [numbers] }
for (const f of readdirSync(gamesDir)) {
	if (!f.endsWith(".js") || f === "arma3.js" || f === "index.js") continue;
	const full = path.join(gamesDir, f);
	let mod = null;
	try {
		mod = (await import(pathToFileURL(full).href)).default;
	} catch {
		mod = null;
	}
	if (mod?.template) {
		const base = mod.template.ports?.[0]?.default ?? 0;
		const ports = [...(mod.template.ports ?? []).map((p) => p.default), ...(mod.template.implicitPorts ?? []).map((p) => base + p.offset)];
		otherPorts.push({ id: mod.template.id, ports });
		continue;
	}
	const text = readFileSync(full, "utf8");
	const found = [...text.matchAll(/default:\s*(\d{4,5})/g)].map((m) => Number(m[1]));
	otherPorts.push({ id: f, ports: found });
}

describe("Arma 3 module", () => {
	it("has the four parts a game module needs, with the type its template uses", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, true);
		assert.equal(template.id, "arma3");
		assert.equal(template.type, "arma3");
		assert.equal(template.displayName, "Arma 3");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (233780) into the folder root", () => {
		assert.equal(template.updateAppId, "233780");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "adminPassword"]);
	});

	it("has one declared game port, 2302, and keeps 2303 to 2306 free as the game's own ports", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const base = template.ports[0].default;
		assert.equal(base, 2302);
		assert.deepEqual(
			template.implicitPorts.map((i) => i.offset),
			[1, 2, 3, 4],
		);
	});

	it("has no port within two of its own range that another template uses", () => {
		const base = template.ports[0].default;
		for (const other of otherPorts) {
			for (const p of other.ports) {
				for (let o = -2; o <= 2; o++) assert.notEqual(p, base + o, `${other.id} uses ${base + o}`);
			}
		}
	});

	it("writes server.cfg in the install root with the settings the dossier names", () => {
		const { relPath, content } = template.buildConfigFile(params());
		assert.equal(relPath, "server.cfg");
		const lines = content.split("\r\n");
		assert.ok(lines.includes('hostname = "My Arma Server";'));
		assert.ok(lines.includes('passwordAdmin = "adminpw";'));
		assert.ok(lines.includes('password = "joinpw";'));
		assert.ok(lines.includes("maxPlayers = 32;"));
		assert.ok(lines.includes("BattlEye = 1;"));
		assert.ok(lines.includes("verifySignatures = 2;"));
		assert.ok(lines.includes("allowedFilePatching = 0;"));
	});

	it("writes an empty join password when none is set", () => {
		const { content } = template.buildConfigFile(params({ serverPassword: "" }));
		assert.ok(content.split("\r\n").includes('password = "";'));
	});

	it("refuses an admin password that is missing, and never puts a quote or line break into the file", () => {
		assert.throws(() => template.buildConfigFile(params({ adminPassword: "" })), /admin password/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: 'a"b' })), /double quote/);
		assert.throws(() => template.buildConfigFile(params({ sessionName: "line\nbreak" })), /line break/);
	});
});

describe("Arma 3 start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts arma3server.exe from the install root", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Arma Server" arma3server\.exe /);
	});

	it("passes the profile folder, the port, the config file and an empty world, as the wiki example does", () => {
		assert.equal(
			launch,
			'start /MIN "My Arma Server" arma3server.exe "-profiles=%~dp0profiles" -port=2302 -config=server.cfg -world=empty',
		);
	});

	it("never lets a quote, percent, ampersand or pipe from the name into the script", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});

	it("rejects a port that is not a whole number from 1 to 65535", () => {
		assert.throws(() => template.buildStartScript(params({ port: "70000" })), /game port/);
		assert.throws(() => template.buildServerEntry(params({ port: "abc" })), /game port/);
	});
});

describe("Arma 3 server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the program the panel watches and records the port", () => {
		assert.equal(entry.type, "arma3");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "arma3server.exe");
		assert.equal(entry.port, 2302);
		assert.equal(entry.updateAppId, "233780");
		assert.equal(entry.autoUpdate, false);
	});

	it("builds the start script, install and config paths with real backslashes", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\arma3\\Start_Arma3.bat");
		assert.equal(entry.installDir, "C:\\Servers\\arma3\\");
		assert.equal(entry.configPath, "C:\\Servers\\arma3\\server.cfg");
		assert.equal(entry.configPaths["server.cfg"], entry.configPath);
	});

	it("uses the same port in the start script and the entry", () => {
		const script = template.buildStartScript(params());
		assert.ok(script.includes(`-port=${entry.port}`));
	});
});

describe("Arma 3 backup and logs", () => {
	it("backs up the config, the profile folder and the custom missions", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["server.cfg", "profiles", "MPMissions"]);
	});

	it("lists no log, because the report file's folder is not verified", () => {
		assert.deepEqual(logs, []);
	});
});

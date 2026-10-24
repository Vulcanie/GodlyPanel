import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game from "../../src/server/data/games/craftopia.js";

// Craftopia (dossier: docs/research/games/craftopia/, confidence medium). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Craftopia",
	sessionName: "Friends World",
	port: 27980,
	installDir: "C:\Servers\cr",
	steamCmdExe: "C:\steamcmd\steamcmd.exe",
	instanceSlug: "my-cr",
	startScriptFilename: "Start_Craftopia.bat",
	...extra,
});

// Every other game module in src/server/data/games, registered or not. A module that does not load (another agent's unfinished work in
// the tree) is read as text instead: its port numbers are taken from its source.
const gamesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "server", "data", "games");
const otherPorts = []; // { id, ports: [numbers] }
for (const f of readdirSync(gamesDir)) {
	if (!f.endsWith(".js") || f === "craftopia.js" || f === "index.js") continue;
	const full = path.join(gamesDir, f);
	let mod = null;
	try {
		mod = (await import(pathToFileURL(full).href)).default;
	} catch {
		mod = null;
	}
	if (mod?.template) {
		otherPorts.push({ id: mod.template.id, ports: (mod.template.ports ?? []).map((p) => p.default) });
		continue;
	}
	const text = readFileSync(full, "utf8");
	const found = [...text.matchAll(/PORT\w*\s*[=:]\s*(\d{4,5})\b/g)].map((m) => Number(m[1]));
	otherPorts.push({ id: f, ports: found });
}

/** The value of one key in one section of the INI text the panel writes. */
function iniValue(text, section, key) {
	let current = "";
	for (const line of text.split(/\r?\n/)) {
		const t = line.trim();
		const s = /^\[(.+)\]$/.exec(t);
		if (s) {
			current = s[1];
			continue;
		}
		if (current === section && t.startsWith(`${key}=`)) return t.slice(key.length + 1);
	}
	return undefined;
}

describe("Craftopia module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "craftopia");
		assert.equal(template.type, "craftopia");
		assert.equal(template.displayName, "Craftopia");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (1670340) with anonymous login, into the folder root", () => {
		assert.equal(template.updateAppId, "1670340");
		assert.equal(template.storeAppId, "1307550");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name only: the 8-digit password and the mods are not set by the panel", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
		assert.ok(!template.fields.includes("serverPassword"));
		assert.ok(!template.fields.includes("mods"));
	});

	it("has one game port, 27980, with no clash with any other template or its companion port", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const base = template.ports[0].default;
		assert.equal(base, 27980);
		for (const other of otherPorts) {
			if (other.id === template.id) continue;
			for (const p of other.ports) {
				for (let o = -2; o <= 2; o++) assert.notEqual(p, base + o, `${other.id} uses ${base + o}`);
			}
		}
	});
});

describe("Craftopia start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts Craftopia.exe with the flags from the guides", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(launch, 'start /MIN "My Craftopia" Craftopia.exe -batchmode -showlogs');
	});

	it("never lets a quote, percent, ampersand or pipe from the title into the script", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});
});

describe("Craftopia config file (ServerSetting.ini)", () => {
	const file = template.buildConfigFile(params());
	const ini = file.content;

	it("is written to the folder root, where the game reads it", () => {
		assert.equal(file.relPath, "ServerSetting.ini");
	});

	it("sets the world name from the server name and the port the entry records", () => {
		assert.equal(iniValue(ini, "GameWorld", "name"), "Friends World");
		assert.equal(iniValue(ini, "Host", "port"), "27980");
		assert.equal(template.buildServerEntry(params()).port, 27980);
	});

	it("keeps the Steam lobby off, the password off and the save folder at the dossier's default", () => {
		assert.equal(iniValue(ini, "Host", "isUseSteamLobby"), "0");
		assert.equal(iniValue(ini, "Host", "usePassword"), "0");
		assert.equal(iniValue(ini, "Save", "savePath"), "DedicatedServerSave/");
	});

	it("falls back to the panel's name when no server name was typed, and keeps the INI safe", () => {
		const f = template.buildConfigFile(params({ sessionName: "", name: "Panel [Name];x" }));
		assert.equal(iniValue(f.content, "GameWorld", "name"), "Panel Namex");
	});

	it("uses the port the script and entry use, so a changed port changes all three", () => {
		const f = template.buildConfigFile(params({ port: 27999 }));
		assert.equal(iniValue(f.content, "Host", "port"), "27999");
		assert.equal(template.buildServerEntry(params({ port: 27999 })).port, 27999);
	});

	it("refuses a port that is not a whole number from 1 to 65535", () => {
		assert.throws(() => template.buildConfigFile(params({ port: "70000" })), /1 to 65535/);
	});
});

describe("Craftopia server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program the panel watches and records the port", () => {
		assert.equal(entry.type, "craftopia");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "Craftopia.exe");
		assert.equal(entry.port, 27980);
		assert.equal(entry.updateAppId, "1670340");
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Craftopia backup and logs", () => {
	it("backs up the saves folder and the settings file in the server folder", () => {
		assert.deepEqual(backup, {
			paths: [
				{ base: "working", rel: "DedicatedServerSave", label: "Saved worlds and players" },
				{ base: "working", rel: "ServerSetting.ini", label: "Server settings" },
			],
		});
	});

	it("has no log file: -showlogs writes to the console, and no log file is named", () => {
		assert.deepEqual(logs, []);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game from "../../src/server/data/games/towerunite.js";

// Tower Unite (dossier: docs/research/games/towerunite/, confidence medium). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Condo",
	sessionName: "Friends Condo",
	port: 7800,
	installDir: "C:\\Servers\\tu",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-condo",
	startScriptFilename: "Start_TowerUnite.bat",
	...extra,
});

// Every other game module, registered or not, so a port clash with an unregistered one is caught too. A module that does not load is
// read as text instead, and its ports are taken from its source.
const gamesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "server", "data", "games");
const otherPorts = []; // { id, ports: [numbers] }
for (const f of readdirSync(gamesDir)) {
	if (!f.endsWith(".js") || f === "towerunite.js" || f === "index.js") continue;
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

describe("Tower Unite module", () => {
	it("has the four parts a game module needs, with the type its template uses", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "towerunite");
		assert.equal(template.type, "towerunite");
		assert.equal(template.displayName, "Tower Unite");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server tool (439660) into the folder root, and names the game's own app (394690)", () => {
		assert.equal(template.updateAppId, "439660");
		assert.equal(template.storeAppId, "394690");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a condo title only: the login tokens and admins are left to the settings file", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
		assert.ok(!template.fields.includes("rconPassword"));
		assert.ok(!template.fields.includes("serverPassword"));
		assert.ok(!template.fields.includes("mods"));
	});

	it("has one game port, 7800, with nothing from another template within two ports of it", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const base = template.ports[0].default;
		assert.equal(base, 7800);
		for (const other of otherPorts) {
			for (const p of other.ports) {
				for (let o = -2; o <= 2; o++) assert.notEqual(p, base + o, `${other.id} uses ${base + o}`);
			}
		}
	});
});

describe("Tower Unite start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder first", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
	});

	it("starts TowerServer.exe from the install root with the map and the official arguments", () => {
		assert.match(launch, /^start \/MIN "My Condo" TowerServer\.exe \/Game\/Maps\/C_Condo -log -Port=7800 -nosteamclient -QueryPort=27016$/);
	});

	it("keeps the port in the script equal to the entry's port", () => {
		const entry = template.buildServerEntry(params());
		assert.match(launch, new RegExp(`-Port=${entry.port} `));
	});

	it("never lets a quote, percent, ampersand or pipe from the panel name into the script", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});

	it("rejects a port that is not a whole number from 1 to 65535", () => {
		assert.throws(() => template.buildStartScript(params({ port: 0 })), /game port/);
		assert.throws(() => template.buildServerEntry(params({ port: "abc" })), /game port/);
	});
});

describe("Tower Unite settings file", () => {
	const file = template.buildConfigFile(params());

	it("is written to Tower\\Saved\\Config\\WindowsServer\\TowerServer.ini under the install folder", () => {
		assert.match(file.relPath, /^Tower\\Saved\\Config\\WindowsServer\\TowerServer\.ini$/);
	});

	it("has the dossier's section and keys, with the condo title and the default of 32 players", () => {
		const lines = file.content.split("\r\n");
		assert.equal(lines[0], "[/script/towernetworking.dedicatedserveroptions]");
		assert.ok(lines.includes("ServerTitle=Friends Condo"));
		assert.ok(lines.includes("MaxPlayers=32"));
		assert.ok(lines.includes("[DedicatedCondoOptions]"));
		assert.ok(lines.includes("CondoAutoSave=True"));
		assert.ok(lines.includes("CondoBackupsEnabled=True"));
	});

	it("leaves the two login tokens empty for the person to fill in", () => {
		const lines = file.content.split("\r\n");
		assert.ok(lines.includes("SteamLoginToken="));
		assert.ok(lines.includes("TowerLoginToken="));
	});

	it("keeps a line break in the title from starting a new setting", () => {
		const bad = template.buildConfigFile(params({ sessionName: "Good\r\nAdminSteamID=1" }));
		const lines = bad.content.split("\r\n");
		assert.ok(lines.includes("ServerTitle=GoodAdminSteamID=1"));
		assert.ok(!lines.some((l) => l.startsWith("AdminSteamID")));
	});
});

describe("Tower Unite server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the program the panel watches and records the port", () => {
		assert.equal(entry.type, "towerunite");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "TowerServer.exe");
		assert.equal(entry.port, 7800);
		assert.equal(entry.updateAppId, "439660");
		assert.equal(entry.autoUpdate, false);
	});

	it("points at the start script and the settings file with real backslashes", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\tu\\Start_TowerUnite.bat");
		assert.equal(entry.installDir, "C:\\Servers\\tu\\");
		assert.equal(entry.configPath, "C:\\Servers\\tu\\Tower\\Saved\\Config\\WindowsServer\\TowerServer.ini");
		assert.match(entry.configPath, /\\Tower\\Saved\\Config\\WindowsServer\\TowerServer\.ini$/);
	});
});

describe("Tower Unite backup and logs", () => {
	it("backs up the condo save data and the settings and ban list folder, in the server folder", () => {
		assert.deepEqual(backup, {
			paths: [
				{ base: "working", rel: "Tower/Condos", label: "Condo save data" },
				{ base: "working", rel: "Tower/Saved/Config/WindowsServer", label: "Server settings and ban list" },
			],
		});
	});

	it("reads the chat and join log in the Tower folder", () => {
		assert.deepEqual(logs.map((l) => l.rel), ["Tower/TowerServer_Chat.txt"]);
	});
});

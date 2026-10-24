import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game from "../../src/server/data/games/miscreated.js";

// Miscreated (dossier: docs/research/games/miscreated/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Miscreated",
	sessionName: "Friends Server",
	port: 27960,
	installDir: "C:\\Servers\\mis",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-mis",
	startScriptFilename: "Start_Miscreated.bat",
	...extra,
});

// Every other game module in src/server/data/games, registered or not, so a port clash with an unregistered one is caught too. A module that
// does not load (another agent's unfinished work in the tree) is read as text instead: its port numbers are taken from its source.
const gamesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "server", "data", "games");
const otherPorts = []; // { id, ports: [numbers] }
for (const f of readdirSync(gamesDir)) {
	if (!f.endsWith(".js") || f === "miscreated.js" || f === "index.js") continue;
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
	const found = [...text.matchAll(/PORT\w*\s*[=:]\s*(\d{4,5})/g)].map((m) => Number(m[1]));
	otherPorts.push({ id: f, ports: found });
}

describe("Miscreated module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "miscreated");
		assert.equal(template.type, "miscreated");
		assert.equal(template.displayName, "Miscreated");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (302200) into the folder root", () => {
		assert.equal(template.updateAppId, "302200");
		assert.equal(template.storeAppId, "299740");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name only: the RCON password and mods are not set by the panel", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
		assert.ok(!template.fields.includes("rconPassword"));
		assert.ok(!template.fields.includes("serverPassword"));
		assert.ok(!template.fields.includes("mods"));
	});

	it("has one game port, 27960, with no clash with any other template or its companion port", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const base = template.ports[0].default;
		assert.equal(base, 27960);
		for (const other of otherPorts) {
			if (other.id === template.id) continue;
			for (const p of other.ports) {
				for (let o = -2; o <= 2; o++) assert.notEqual(p, base + o, `${other.id} uses ${base + o}`);
			}
		}
	});
});

describe("Miscreated start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts the server program from the Bin64_dedicated folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Miscreated" Bin64_dedicated\\MiscreatedServer\.exe /);
	});

	it("sets the game server id, the game port and the server name on the launch line", () => {
		assert.match(launch, /-mis_gameserverid 1337 -sv_port 27960 \+sv_servername "Friends Server"$/);
	});

	it("does not add -sv_bind or the RCON (+http_startserver) arguments, and says why in the notes", () => {
		assert.doesNotMatch(launch, /-sv_bind/);
		assert.doesNotMatch(launch, /http_startserver/);
	});

	it("keeps the port in the script equal to the entry's port", () => {
		const entry = template.buildServerEntry(params());
		assert.match(launch, new RegExp(`-sv_port ${entry.port} `));
	});

	it("never lets a quote, percent, ampersand or pipe from the name into the script", () => {
		const bad = template.buildStartScript(params({ sessionName: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const name = /\+sv_servername "([^"]*)"/.exec(l);
		assert.ok(name, l);
		assert.equal(name[1], "Evil calc PATH y");
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});

	it("falls back to the panel's name when no server name was typed", () => {
		const s = template.buildStartScript(params({ sessionName: "", name: "Panel Name" }));
		assert.match(s, /\+sv_servername "Panel Name"/);
	});

	it("writes no config file: the dossier's hosting.cfg keys are left to the game", () => {
		assert.equal(template.buildConfigFile, undefined);
	});
});

describe("Miscreated server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program the panel watches and records the port", () => {
		assert.equal(entry.type, "miscreated");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "MiscreatedServer.exe");
		assert.equal(entry.port, 27960);
		assert.equal(entry.updateAppId, "302200");
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Miscreated backup and logs", () => {
	it("backs up the world database and hosting.cfg in the server folder", () => {
		assert.deepEqual(backup, {
			paths: [
				{ base: "working", rel: "miscreated.db", label: "World database" },
				{ base: "working", rel: "hosting.cfg", label: "Server settings" },
			],
		});
	});

	it("reads server.log in the server folder", () => {
		assert.deepEqual(logs.map((l) => l.rel), ["server.log"]);
	});
});

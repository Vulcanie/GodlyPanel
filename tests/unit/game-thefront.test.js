import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game from "../../src/server/data/games/thefront.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// The Front (dossier: docs/research/games/thefront/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Front",
	sessionName: "Friends Server",
	serverPassword: "",
	port: 7900,
	installDir: "C:\\Servers\\front",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-front",
	startScriptFilename: "Start_TheFront.bat",
	...extra,
});

// Every other game module in src/server/data/games and every registered template, so a port clash with either is caught.
// A module that does not load is read as text instead: its port numbers are taken from its source.
const gamesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "server", "data", "games");
const otherPorts = []; // { id, ports: [numbers] }
for (const t of GAME_TEMPLATES) {
	if (t.id === template.id) continue;
	otherPorts.push({ id: `template ${t.id}`, ports: (t.ports ?? []).map((p) => p.default) });
}
for (const f of readdirSync(gamesDir)) {
	if (!f.endsWith(".js") || f === "thefront.js" || f === "index.js") continue;
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

describe("The Front module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "thefront");
		assert.equal(template.type, "thefront");
		assert.equal(template.displayName, "The Front");
		assert.equal(template.method, "process");
	});

	it("installs the Windows dedicated server app (2612550) into the folder root, anonymously", () => {
		assert.equal(template.updateAppId, "2612550");
		assert.equal(template.storeAppId, "2285150");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name and a join password", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword"]);
	});

	it("has one declared port, 7900, and keeps the three ports above it for the game", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, 7900);
		assert.deepEqual(template.implicitPorts.map((p) => p.offset), [1, 2, 3]);
	});

	it("does not clash with any other template or module, nor with the ports next to them", () => {
		const base = template.ports[0].default;
		for (const other of otherPorts) {
			for (const p of other.ports) {
				for (let o = -3; o <= 3; o++) assert.notEqual(p, base + o, `${other.id} uses ${base + o}`);
			}
		}
	});
});

describe("The Front start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts the server program from ProjectWar\\Binaries\\Win64", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Front" ProjectWar\\Binaries\\Win64\\TheFrontServer\.exe /);
	});

	it("keeps the backslashes of the program path (a dropped one would give ProjectWarBinaries)", () => {
		assert.doesNotMatch(launch, /ProjectWarBinaries|Win64TheFront/);
		assert.match(launch, /ProjectWar\\Binaries\\Win64\\TheFrontServer\.exe/);
	});

	it("gives the map and the host guide's switches, with the server name in quotes", () => {
		assert.match(launch, / ProjectWar ProjectWar_Start \?Listen\?MaxPlayers=8 -server -game -QueueThreshold=8 /);
		assert.match(launch, / -ServerName="Friends Server" /);
	});

	it("sets the game port and the three ports above it", () => {
		assert.match(launch, / -port=7900 -BeaconPort=7901 -QueryPort=7902 -ShutDownServicePort=7903$/);
	});

	it("keeps the port in the script equal to the entry's port", () => {
		const entry = template.buildServerEntry(params());
		assert.match(launch, new RegExp(`-port=${entry.port} `));
	});

	it("never lets a quote, percent, ampersand or pipe from the name into the script", () => {
		const bad = template.buildStartScript(params({ sessionName: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const name = /-ServerName="([^"]*)"/.exec(l);
		assert.ok(name, l);
		assert.equal(name[1], "Evil calc PATH y");
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});

	it("falls back to the panel's name when no server name was typed", () => {
		const s = template.buildStartScript(params({ sessionName: "", name: "Panel Name" }));
		assert.match(s, /-ServerName="Panel Name"/);
	});

	it("refuses a port that is not a whole number in range", () => {
		assert.throws(() => template.buildStartScript(params({ port: 70000 })), /game port/);
		assert.throws(() => template.buildStartScript(params({ port: "abc" })), /game port/);
	});
});

describe("The Front settings file", () => {
	it("writes ServerName and ServerPassword under [BaseServerConfig] in ProjectWar's manager folder", () => {
		const file = template.buildConfigFile(params({ serverPassword: "join-me" }));
		assert.equal(file.relPath, "TheFrontManager\\ServerConfig_.ini");
		assert.match(file.relPath, /^TheFrontManager\\ServerConfig_\.ini$/);
		assert.equal(file.content, ["[BaseServerConfig]", 'ServerName="Friends Server"', 'ServerPassword="join-me"', ""].join("\r\n"));
	});

	it("leaves the password empty for a public server, as the sample file does", () => {
		const file = template.buildConfigFile(params());
		assert.match(file.content, /^ServerPassword=$/m);
	});

	it("keeps quotes and line breaks out of a typed password", () => {
		const file = template.buildConfigFile(params({ serverPassword: 'a"b\r\nServerAdminAccounts=1' }));
		// The line break is dropped, so the rest stays inside the one value and cannot start a key of its own.
		assert.doesNotMatch(file.content, /^ServerAdminAccounts/m);
		assert.match(file.content, /^ServerPassword="abServerAdminAccounts=1"$/m);
	});
});

describe("The Front server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program the panel watches and records the port and config file", () => {
		assert.equal(entry.type, "thefront");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "TheFrontServer.exe");
		assert.equal(entry.port, 7900);
		assert.equal(entry.updateAppId, "2612550");
		assert.equal(entry.autoUpdate, false);
		assert.equal(entry.configPath, "C:\\Servers\\front\\TheFrontManager\\ServerConfig_.ini");
	});
});

describe("The Front backup and logs", () => {
	it("backs up the saved folder (without logs) and the manager's settings file", () => {
		assert.deepEqual(backup, {
			paths: [
				{ base: "working", rel: "ProjectWar/Saved", label: "Saved worlds and settings", exclude: ["Logs"] },
				{ base: "working", rel: "TheFrontManager/ServerConfig_.ini", label: "Server settings" },
			],
		});
	});

	it("lists the server log found on a real install", () => {
		assert.deepEqual(logs, [{ kind: "file", base: "working", rel: "ProjectWar/Saved/Logs/ProjectWar.log", label: "Server log" }]);
	});
});

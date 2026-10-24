import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game from "../../src/server/data/games/motortown.js";

// Motor Town: Behind The Wheel (dossier: docs/research/games/motortown/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Motor Town",
	port: 9600,
	queryPort: 9602,
	installDir: "C:\\Servers\\motortown",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-motortown",
	startScriptFilename: "Start_MotorTown.bat",
	...extra,
});

// Every other game module, registered or not, so a port clash with an unregistered one is caught too. A module that does not load is
// read as text instead, and its ports are taken from its source.
const gamesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "server", "data", "games");
const otherPorts = []; // { id, ports: [numbers] }
for (const f of readdirSync(gamesDir)) {
	if (!f.endsWith(".js") || f === "motortown.js" || f === "index.js") continue;
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

describe("Motor Town module", () => {
	it("has the four parts a game module needs, with the type its template uses", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "motortown");
		assert.equal(template.type, "motortown");
		assert.equal(template.displayName, "Motor Town: Behind The Wheel");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server tool (2223650) into the folder root, with no sign-in fields", () => {
		assert.equal(template.updateAppId, "2223650");
		assert.equal(template.storeAppId, "1369670");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
		assert.deepEqual(template.fields, []);
	});

	it("has a game port (9600) and a query port (9602), with nothing from another template within three ports of the game port", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const base = template.ports[0].default;
		assert.equal(base, 9600);
		assert.ok(template.ports[1].default >= base + 2, "query port must be at least game port + 2");
		for (const other of otherPorts) {
			for (const p of other.ports) {
				for (let o = -3; o <= 3; o++) assert.notEqual(p, base + o, `${other.id} uses ${base + o}`);
			}
		}
	});

	it("copies the game's own sample config to DedicatedServerConfig.json and writes no config of its own", () => {
		assert.deepEqual(template.copyInstalledFiles, [{ from: "DedicatedServerConfig_Sample.json", to: "DedicatedServerConfig.json" }]);
		assert.equal(template.buildConfigFile, undefined);
	});
});

describe("Motor Town start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts the server exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Motor Town" MotorTown\\Binaries\\Win64\\MotorTownServer-Win64-Shipping\.exe /);
	});

	it("passes the map and the vendor's flags, then the two ports", () => {
		assert.equal(
			launch,
			'start /MIN "My Motor Town" MotorTown\\Binaries\\Win64\\MotorTownServer-Win64-Shipping.exe Jeju_World?listen? -server -log -useperfthreads -Port=9600 -QueryPort=9602',
		);
	});

	it("uses the ports the server entry records", () => {
		const entry = template.buildServerEntry(params());
		assert.ok(launch.includes(`-Port=${entry.port}`));
		assert.ok(launch.includes(`-QueryPort=${entry.queryPort}`));
	});

	it("never lets a quote, percent, ampersand or pipe from the name into the script", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.equal(title[1], "Evil calc PATH y");
	});

	it("rejects a port that is not a whole number from 1 to 65535, and a query port below game port + 2", () => {
		assert.throws(() => template.buildStartScript(params({ port: "70000" })), /game port/);
		assert.throws(() => template.buildServerEntry(params({ port: "abc" })), /game port/);
		assert.throws(() => template.buildStartScript(params({ queryPort: 9601 })), /query port/);
	});
});

describe("Motor Town server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the program the panel watches and records the ports", () => {
		assert.equal(entry.type, "motortown");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "MotorTownServer-Win64-Shipping.exe");
		assert.equal(entry.port, 9600);
		assert.equal(entry.queryPort, 9602);
		assert.equal(entry.updateAppId, "2223650");
		assert.equal(entry.autoUpdate, false);
	});

	it("builds the start script, install and config paths with real backslashes", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\motortown\\Start_MotorTown.bat");
		assert.equal(entry.installDir, "C:\\Servers\\motortown\\");
		assert.equal(entry.configPath, "C:\\Servers\\motortown\\DedicatedServerConfig.json");
		assert.equal(entry.configPaths["DedicatedServerConfig.json"], entry.configPath);
	});
});

describe("Motor Town backup and logs", () => {
	it("backs up the settings file and the saved worlds", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["DedicatedServerConfig.json", "MotorTown/Saved/SaveGames"]);
	});

	it("lists the Unreal log folder of the project", () => {
		assert.deepEqual(logs, [{ kind: "dir", base: "working", rel: "MotorTown/Saved/Logs", label: "Server log" }]);
	});
});

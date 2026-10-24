import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game from "../../src/server/data/games/dayofdragons.js";

// Day of Dragons (dossier: docs/research/games/dayofdragons/, confidence medium). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Dragons",
	port: 9300,
	installDir: "C:\\Servers\\dod",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-dragons",
	startScriptFilename: "Start_DayofDragons.bat",
	...extra,
});

// Every other game module, registered or not, so a port clash with an unregistered one is caught too. A module that does not load is
// read as text instead, and its ports are taken from its source.
const gamesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "server", "data", "games");
const otherPorts = []; // { id, ports: [numbers] }
for (const f of readdirSync(gamesDir)) {
	if (!f.endsWith(".js") || f === "dayofdragons.js" || f === "index.js") continue;
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

describe("Day of Dragons module", () => {
	it("has the four parts a game module needs, with the type its template uses", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "dayofdragons");
		assert.equal(template.type, "dayofdragons");
		assert.equal(template.displayName, "Day of Dragons");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (1088320) into the folder root, with no sign-in", () => {
		assert.equal(template.updateAppId, "1088320");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
		assert.deepEqual(template.fields, []);
	});

	it("has one game port, 9300, with nothing from another template within two ports of it", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const base = template.ports[0].default;
		assert.equal(base, 9300);
		for (const other of otherPorts) {
			for (const p of other.ports) {
				for (let o = -2; o <= 2; o++) assert.notEqual(p, base + o, `${other.id} uses ${base + o}`);
			}
		}
	});

	it("writes Game.ini with the developer's section header only, under Dragons\\Saved\\Config\\WindowsServer", () => {
		const { relPath, content } = template.buildConfigFile(params());
		assert.equal(relPath, "Dragons\\Saved\\Config\\WindowsServer\\Game.ini");
		assert.equal(content, "[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]\r\n");
	});
});

describe("Day of Dragons start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts DragonsServer.exe from the install root", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Dragons" DragonsServer\.exe /);
	});

	it("passes the server name, -log and the query port the panel shows", () => {
		assert.equal(launch, 'start /MIN "My Dragons" DragonsServer.exe -SteamServerName="My Dragons" -log -QueryPort=9300');
	});

	it("never lets a quote, percent, ampersand or pipe from the name into the script", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.equal(title[1], "Evil calc PATH y");
		assert.match(l, /-SteamServerName="Evil calc PATH y"/);
	});

	it("rejects a port that is not a whole number from 1 to 65535", () => {
		assert.throws(() => template.buildStartScript(params({ port: "70000" })), /game port/);
		assert.throws(() => template.buildServerEntry(params({ port: "abc" })), /game port/);
	});
});

describe("Day of Dragons server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the program the panel watches and records the port", () => {
		assert.equal(entry.type, "dayofdragons");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "DragonsServer.exe");
		assert.equal(entry.port, 9300);
		assert.equal(entry.updateAppId, "1088320");
		assert.equal(entry.autoUpdate, false);
	});

	it("builds the start script, install and config paths with real backslashes", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\dod\\Start_DayofDragons.bat");
		assert.equal(entry.installDir, "C:\\Servers\\dod\\");
		assert.equal(entry.configPath, "C:\\Servers\\dod\\Dragons\\Saved\\Config\\WindowsServer\\Game.ini");
		assert.equal(entry.configPaths["Game.ini"], entry.configPath);
	});
});

describe("Day of Dragons backup and logs", () => {
	it("backs up the saved folder, which holds the settings and the saves", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["Dragons/Saved"]);
	});

	it("lists the server log found on a real install", () => {
		assert.deepEqual(logs, [{ kind: "file", base: "working", rel: "Dragons/Saved/Logs/Dragons.log", label: "Server log" }]);
	});
});

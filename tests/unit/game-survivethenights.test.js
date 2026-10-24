import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game from "../../src/server/data/games/survivethenights.js";

// Survive the Nights (dossier: docs/research/games/survivethenights/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Nights",
	sessionName: "",
	port: 7950,
	installDir: "C:\\Servers\\stn",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-nights",
	startScriptFilename: "Start_SurvivetheNights.bat",
	...extra,
});

// Every other game module, registered or not, so a port clash with an unregistered one is caught too. A module that does not load is
// read as text instead, and its ports are taken from its source.
const gamesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "server", "data", "games");
const otherPorts = []; // { id, ports: [numbers] }
for (const f of readdirSync(gamesDir)) {
	if (!f.endsWith(".js") || f === "survivethenights.js" || f === "index.js") continue;
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

describe("Survive the Nights module", () => {
	it("has the four parts a game module needs, with the type its template uses", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "survivethenights");
		assert.equal(template.type, "survivethenights");
		assert.equal(template.displayName, "Survive the Nights");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (1502300) into the folder root", () => {
		assert.equal(template.updateAppId, "1502300");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name only, and writes Config/ServerConfig.txt with the name, port and UPnP off", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
		const { relPath, content } = template.buildConfigFile(params({ sessionName: 'Evil" // x', port: 7960 }));
		assert.equal(relPath, "Config\\ServerConfig.txt");
		const lines = content.split("\r\n");
		assert.equal(lines[0], 'ServerName="Evil / x"');
		assert.ok(lines.includes("ServerPort=7960"));
		assert.ok(lines.includes("UseUpnp=False"));
	});

	it("has one game port, 7950, with nothing from another template within two ports of it", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const base = template.ports[0].default;
		assert.equal(base, 7950);
		for (const other of otherPorts) {
			for (const p of other.ports) {
				for (let o = -2; o <= 2; o++) assert.notEqual(p, base + o, `${other.id} uses ${base + o}`);
			}
		}
	});
});

describe("Survive the Nights start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts the server program from the install root", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Nights" STN_Dedicated_Server\.exe$/);
	});

	it("adds no arguments, because none is documented", () => {
		assert.doesNotMatch(launch, / -/);
		assert.doesNotMatch(launch, /\+/);
	});

	it("never lets a quote, percent, ampersand or pipe from the name into the script", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.equal(title[1], "Evil calc PATH y");
	});

	it("rejects a port that is not a whole number from 1 to 65535", () => {
		assert.throws(() => template.buildStartScript(params({ port: "70000" })), /game port/);
		assert.throws(() => template.buildServerEntry(params({ port: "abc" })), /game port/);
	});
});

describe("Survive the Nights server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the program the panel watches and records the port", () => {
		assert.equal(entry.type, "survivethenights");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "STN_Dedicated_Server.exe");
		assert.equal(entry.port, 7950);
		assert.equal(entry.updateAppId, "1502300");
		assert.equal(entry.autoUpdate, false);
	});

	it("builds the start script and install paths with real backslashes", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\stn\\Start_SurvivetheNights.bat");
		assert.equal(entry.installDir, "C:\\Servers\\stn\\");
		assert.match(entry.startScriptPath, /^C:\\Servers\\stn\\Start_SurvivetheNights\.bat$/);
	});
});

describe("Survive the Nights backup and logs", () => {
	it("backs up the Config folder and the world database", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["Config", ".stn-server-V8.db"]);
	});

	it("lists no log, because none is documented", () => {
		assert.deepEqual(logs, []);
	});
});

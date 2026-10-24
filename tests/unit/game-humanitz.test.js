import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game from "../../src/server/data/games/humanitz.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// HumanitZ (dossier: docs/research/games/humanitz/, confidence medium). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My HumanitZ",
	port: 27090,
	queryPort: 27092,
	installDir: "C:\\Servers\\humanitz",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-humanitz",
	startScriptFilename: "Start_HumanitZ.bat",
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
	if (!f.endsWith(".js") || f === "index.js" || f === "humanitz.js") continue;
	const mod = (await import(pathToFileURL(path.join(gamesDir, f)).href)).default;
	const t = mod?.template;
	if (!t || t.id === template.id) continue;
	const implicit = (t.implicitPorts ?? []).map((i) => i.offset);
	others.push({ id: t.id, ports: (t.ports ?? []).map((p) => ({ port: Number(p.default), offsets: implicit })) });
}

describe("HumanitZ module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "humanitz");
		assert.equal(template.type, "humanitz");
		assert.equal(template.displayName, "HumanitZ");
		assert.equal(template.method, "process");
	});

	it("installs the server app (2728330) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "2728330");
		assert.equal(template.storeAppId, "1766060");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for nothing on the create form, and uses no RCON, password or mods", () => {
		assert.deepEqual(template.fields, []);
		assert.equal(template.buildConfigFile, undefined);
	});

	it("declares a game port 27090 and a query port 27092, two past it, and no clash with any other template", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const base = template.ports[0].default;
		const query = template.ports[1].default;
		assert.equal(base, 27090);
		assert.equal(query, 27092);
		assert.ok(query >= base + 2, "the query port must be at least the game port plus 2");
		for (const other of others) {
			for (const p of other.ports) {
				for (let o = -2; o <= 2; o++) assert.notEqual(p.port, base + o, `${other.id} uses ${base + o}`);
				for (let o = -2; o <= 2; o++) assert.notEqual(p.port, query + o, `${other.id} uses ${query + o}`);
				for (const off of p.offsets) {
					for (let o = -2; o <= 2; o++) assert.notEqual(p.port + off, base + o, `${other.id} holds ${p.port + off} beside its port`);
				}
			}
		}
	});

	it("copies the shipped REF settings file to GameServerSettings.ini, with single backslashes", () => {
		assert.deepEqual(template.copyInstalledFiles, [
			{ from: "HumanitZServer\\REF_GameServerSettings.ini", to: "HumanitZServer\\GameServerSettings.ini" },
		]);
	});
});

describe("HumanitZ start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder first", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
	});

	it("starts HumanitZServer.exe with logging, the game port and the query port, in the form the dossier gives", () => {
		assert.match(launch, /^start \/MIN "My HumanitZ" HumanitZServer\.exe -log -port=27090 -queryport=27092$/);
	});

	it("keeps the ports in the script equal to the entry's ports", () => {
		const entry = template.buildServerEntry(params());
		assert.match(launch, new RegExp(`-port=${entry.port} `));
		assert.match(launch, new RegExp(`-queryport=${entry.queryPort}$`));
	});

	it("never lets a quote, percent, ampersand or pipe from the title into the script", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});
});

describe("HumanitZ server entry and backup", () => {
	const entry = template.buildServerEntry(params());

	it("names HumanitZServer.exe as the process and records both ports", () => {
		assert.equal(entry.type, "humanitz");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "HumanitZServer.exe");
		assert.equal(entry.port, 27090);
		assert.equal(entry.queryPort, 27092);
		assert.equal(entry.updateAppId, "2728330");
		assert.equal(entry.autoUpdate, false);
	});

	it("points the settings file at HumanitZServer\\GameServerSettings.ini in the install", () => {
		assert.equal(entry.configPaths["GameServerSettings.ini"], "C:\\Servers\\humanitz\\HumanitZServer\\GameServerSettings.ini");
	});

	it("backs up the saved world and settings (not the logs), and reads the server log", () => {
		assert.deepEqual(backup.paths, [
			{ base: "working", rel: "HumanitZServer/Saved", label: "Saved worlds and settings", exclude: ["Logs"] },
			{ base: "working", rel: "HumanitZServer/GameServerSettings.ini", label: "Server settings" },
		]);
		assert.deepEqual(logs.map((l) => l.rel), ["HumanitZServer/Saved/Logs/HumanitZServer.log"]);
	});
});

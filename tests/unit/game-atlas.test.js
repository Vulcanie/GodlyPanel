import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game from "../../src/server/data/games/atlas.js";

// ATLAS (dossier: docs/research/games/atlas/, confidence medium). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Atlas",
	port: 7400,
	queryPort: 7402,
	installDir: "C:\\Servers\\atlas",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-atlas",
	startScriptFilename: "Start_ATLAS.bat",
	...extra,
});

// Every other game module, registered or not, so a port clash with an unregistered one is caught too. A module that does not load is
// read as text instead, and its ports are taken from its source.
const gamesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "server", "data", "games");
const otherPorts = []; // { id, ports: [numbers] }
for (const f of readdirSync(gamesDir)) {
	if (!f.endsWith(".js") || f === "atlas.js" || f === "index.js") continue;
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

describe("ATLAS module", () => {
	it("has the four parts a game module needs, with the type its template uses", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "atlas");
		assert.equal(template.type, "atlas");
		assert.equal(template.displayName, "ATLAS");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (1006030) into the folder root, with no sign-in", () => {
		assert.equal(template.updateAppId, "1006030");
		assert.equal(template.storeAppId, "834910");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("has a game port 7400 and a query port 7402, with nothing from another template within three of either", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const [game, query] = template.ports.map((p) => p.default);
		assert.equal(game, 7400);
		assert.equal(query, 7402);
		assert.ok(query - game >= 2, "query port must be at least game port + 2");
		for (const other of otherPorts) {
			for (const p of other.ports) {
				for (let o = -3; o <= 3; o++) {
					assert.notEqual(p, game + o, `${other.id} uses ${game + o}`);
					assert.notEqual(p, query + o, `${other.id} uses ${query + o}`);
				}
			}
		}
	});

	it("takes the join password only, from the Settings tab, and the admin password on the start line", () => {
		assert.deepEqual(template.fields, ["serverPassword", "adminPassword"]);
		assert.equal(template.fieldMeta.serverPassword.type, "password");
		assert.equal(template.fieldMeta.adminPassword.type, "password");
	});

	it("writes GameUserSettings.ini with its [ServerSettings] header, and the join password only when one is set", () => {
		const open = template.buildConfigFile(params());
		assert.equal(open.relPath, "ShooterGame\\Saved\\Config\\WindowsServer\\GameUserSettings.ini");
		assert.equal(open.content, "[ServerSettings]\r\n");
		const locked = template.buildConfigFile(params({ serverPassword: "join1" }));
		assert.equal(locked.content, "[ServerSettings]\r\nServerPassword=join1\r\n");
	});

	it("refuses a password with spaces or quotes", () => {
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a b" })), /join password/);
		assert.throws(() => template.buildStartScript(params({ adminPassword: 'x"y' })), /admin password/);
	});
});

describe("ATLAS start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts ShooterGameServer.exe from the Win64 folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Atlas" ShooterGame\\Binaries\\Win64\\ShooterGameServer\.exe Ocean\?/);
	});

	it("starts the Ocean map with the query and game ports, and the flags the guides use", () => {
		assert.equal(
			launch,
			'start /MIN "My Atlas" ShooterGame\\Binaries\\Win64\\ShooterGameServer.exe Ocean?ServerX=0?ServerY=0?QueryPort=7402?Port=7400 -log -server -NoBattlEye',
		);
	});

	it("puts the admin password on the start line when one is set", () => {
		const withAdmin = template.buildStartScript(params({ adminPassword: "adm1n" }));
		const l = withAdmin.split("\r\n").find((x) => x.startsWith("start "));
		assert.match(l, /\?ServerAdminPassword=adm1n -log/);
	});

	it("never lets a quote, percent, ampersand or pipe from the name into the script", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.equal(title[1], "Evil calc PATH y");
	});

	it("uses the ports the entry records, and rejects a port that is not a whole number", () => {
		const other = template.buildStartScript(params({ port: 7410, queryPort: 7412 }));
		assert.match(other, /QueryPort=7412\?Port=7410 /);
		assert.throws(() => template.buildStartScript(params({ port: "70000" })), /game port/);
		assert.throws(() => template.buildServerEntry(params({ queryPort: "abc" })), /query port/);
	});
});

describe("ATLAS server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the program the panel watches and records both ports", () => {
		assert.equal(entry.type, "atlas");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "ShooterGameServer.exe");
		assert.equal(entry.port, 7400);
		assert.equal(entry.queryPort, 7402);
		assert.equal(entry.updateAppId, "1006030");
		assert.equal(entry.autoUpdate, false);
	});

	it("builds the start script, install and config paths with real backslashes", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\atlas\\Start_ATLAS.bat");
		assert.equal(entry.installDir, "C:\\Servers\\atlas\\");
		assert.equal(entry.configPath, "C:\\Servers\\atlas\\ShooterGame\\Saved\\Config\\WindowsServer\\GameUserSettings.ini");
		assert.equal(entry.configPaths["GameUserSettings.ini"], entry.configPath);
		assert.equal(entry.configPaths["ServerGrid.json"], "C:\\Servers\\atlas\\ShooterGame\\ServerGrid.json");
	});
});

describe("ATLAS backup and logs", () => {
	it("backs up the Saved folder under the install, which holds the settings and the saves", () => {
		assert.deepEqual(backup.paths.map((p) => [p.base, p.rel]), [["working", "ShooterGame/Saved"]]);
	});

	it("lists no log, because the dossier names none", () => {
		assert.deepEqual(logs, []);
	});
});

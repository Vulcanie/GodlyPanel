import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game from "../../src/server/data/games/empyrion.js";

// Empyrion - Galactic Survival (dossier: docs/research/games/empyrion/, confidence medium). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Empyrion",
	sessionName: "My Empyrion",
	port: 30000,
	telnetPort: 30004,
	serverPassword: "joinpw",
	maxPlayers: 12,
	installDir: "C:\\Servers\\empyrion",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-empyrion",
	startScriptFilename: "Start_Empyrion.bat",
	...extra,
});

// Every other game module, registered or not, so a port clash with an unregistered one is caught too. A module that does not load is
// read as text instead, and its ports are taken from its source.
const gamesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "server", "data", "games");
const otherPorts = []; // { id, ports: [numbers] }
for (const f of readdirSync(gamesDir)) {
	if (!f.endsWith(".js") || f === "empyrion.js" || f === "index.js") continue;
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

describe("Empyrion module", () => {
	it("has the four parts a game module needs, with the type its template uses", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, true);
		assert.equal(template.id, "empyrion");
		assert.equal(template.type, "empyrion");
		assert.equal(template.displayName, "Empyrion - Galactic Survival");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (530870) anonymously into the install root; the server exe sits in the DedicatedServer folder beside the game's own dedicated.yaml", () => {
		assert.equal(template.updateAppId, "530870");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
		assert.deepEqual(template.fields, ["sessionName", "serverPassword"]);
	});

	it("declares the game port 30000 and the telnet port 30004, with 30001 to 30003 kept free as the game's own", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "telnetPort"]);
		assert.equal(template.ports[0].default, 30000);
		assert.equal(template.ports[1].default, 30004);
		assert.deepEqual(
			template.implicitPorts.map((i) => i.offset),
			[1, 2, 3],
		);
	});

	it("has no port within two of its game port that another template uses", () => {
		const base = template.ports[0].default;
		for (const other of otherPorts) {
			for (const p of other.ports) {
				for (let o = -2; o <= 2; o++) assert.notEqual(p, base + o, `${other.id} uses ${base + o}`);
			}
		}
	});

	it("writes dedicated.yaml with the server and game sections and the ports it was given", () => {
		const { relPath, content } = template.buildConfigFile(params());
		assert.equal(relPath, "dedicated.yaml");
		const lines = content.split("\r\n");
		assert.equal(lines[0], "ServerConfig:");
		assert.ok(lines.includes("  Srv_Port: 30000"));
		assert.ok(lines.includes('  Srv_Name: "My Empyrion"'));
		assert.ok(lines.includes('  Srv_Password: "joinpw"'));
		assert.ok(lines.includes("  Srv_MaxPlayers: 12"));
		assert.ok(lines.includes("  Tel_Enabled: true"));
		assert.ok(lines.includes("  Tel_Port: 30004"));
		assert.ok(lines.includes("GameConfig:"));
		assert.ok(lines.includes('  GameName: "MyGame"'));
		assert.ok(lines.includes("  Mode: Survival"));
		assert.ok(lines.includes("  Seed: 1011345"));
		// No tabs: the dossier says the file is whitespace-sensitive and wants spaces.
		assert.doesNotMatch(content, /\t/);
	});

	it("quotes a name or password with a quote or backslash, so the YAML stays valid", () => {
		const { content } = template.buildConfigFile(params({ sessionName: 'Say "hi" \\ now', serverPassword: "" }));
		assert.ok(content.includes('  Srv_Name: "Say \\"hi\\" \\\\ now"'));
		assert.ok(content.includes('  Srv_Password: ""'));
	});
});

describe("Empyrion start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to the DedicatedServer folder, which holds the server exe (the game reads dedicated.yaml one folder up)", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0DedicatedServer"');
		assert.match(launch, /^start \/MIN "My Empyrion" EmpyrionDedicated\.exe /);
	});

	it("starts the server with -batchmode, -nographics and a log file, as the egg and FireDaemon guide do", () => {
		assert.equal(launch, 'start /MIN "My Empyrion" EmpyrionDedicated.exe -batchmode -nographics -logFile "../Logs/server/server.log"');
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

describe("Empyrion server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the program the panel watches and records both ports", () => {
		assert.equal(entry.type, "empyrion");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "EmpyrionDedicated.exe");
		assert.equal(entry.port, 30000);
		assert.equal(entry.telnetPort, 30004);
		assert.equal(entry.updateAppId, "530870");
		assert.equal(entry.autoUpdate, false);
	});

	it("uses the telnet save-and-exit command for a stop, which the panel sends before it closes the window", () => {
		assert.equal(entry.telnetSaveCommand, "saveandexit 0");
	});

	it("builds the start script, working folder and config paths in the install root, where the game reads dedicated.yaml", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\empyrion\\Start_Empyrion.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\empyrion");
		assert.equal(entry.installDir, "C:\\Servers\\empyrion\\");
		assert.equal(entry.configPath, "C:\\Servers\\empyrion\\dedicated.yaml");
		assert.equal(entry.configPaths["dedicated.yaml"], entry.configPath);
	});
});

describe("Empyrion backup and logs", () => {
	it("backs up the yaml file and the saved games", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["dedicated.yaml", "Saves/Games"]);
	});

	it("reads the server log the start script writes", () => {
		assert.deepEqual(logs, [{ kind: "file", base: "working", rel: "Logs/server/server.log", label: "Server log" }]);
	});
});

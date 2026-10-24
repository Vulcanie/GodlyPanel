import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import game from "../../src/server/data/games/hyperchargeunboxed.js";

// HYPERCHARGE: Unboxed (dossier: docs/research/games/hyperchargeunboxed/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Hypercharge",
	port: 9400,
	queryPort: 9402,
	installDir: "C:\\Servers\\hyper",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-hyper",
	startScriptFilename: "Start_HYPERCHARGE.bat",
	...extra,
});

// Every other game module, registered or not, so a port clash with an unregistered one is caught too. A module that does not load is
// read as text instead, and its ports are taken from its source.
const gamesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "server", "data", "games");
const otherPorts = []; // { id, ports: [numbers] }
for (const f of readdirSync(gamesDir)) {
	if (!f.endsWith(".js") || f === "hyperchargeunboxed.js" || f === "index.js") continue;
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

describe("HYPERCHARGE module", () => {
	it("has the four parts a game module needs, with the type its template uses", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "hyperchargeunboxed");
		assert.equal(template.type, "hyperchargeunboxed");
		assert.equal(template.displayName, "HYPERCHARGE: Unboxed");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server tool (1045940) into the folder root, with no sign-in", () => {
		assert.equal(template.updateAppId, "1045940");
		assert.equal(template.storeAppId, "523660");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
		assert.deepEqual(template.fields, []);
	});

	it("has a game port (9400) and a query port (9402), with nothing from another template within two ports of either", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const game = template.ports[0].default;
		const query = template.ports[1].default;
		assert.equal(game, 9400);
		assert.equal(query, 9402, "the query port is two past the game port, because the panel keeps game + 1");
		for (const other of otherPorts) {
			for (const p of other.ports) {
				for (const base of [game, query]) {
					for (let o = -2; o <= 2; o++) assert.notEqual(p, base + o, `${other.id} uses ${base + o}`);
				}
			}
		}
	});
});

describe("HYPERCHARGE start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts UnboxedServer.exe with the word Unboxed first", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Hypercharge" UnboxedServer\.exe Unboxed /);
	});

	it("passes the Garage map, co-op mode and the two ports the panel holds", () => {
		assert.equal(launch, 'start /MIN "My Hypercharge" UnboxedServer.exe Unboxed Garage?Game=WV -Port=9400 -QueryPort=9402');
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
		assert.throws(() => template.buildStartScript(params({ queryPort: "abc" })), /query port/);
		assert.throws(() => template.buildServerEntry(params({ port: "abc" })), /game port/);
	});
});

describe("HYPERCHARGE server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the program the panel watches and records both ports", () => {
		assert.equal(entry.type, "hyperchargeunboxed");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "UnboxedServer.exe");
		assert.equal(entry.port, 9400);
		assert.equal(entry.queryPort, 9402);
		assert.equal(entry.updateAppId, "1045940");
		assert.equal(entry.autoUpdate, false);
	});

	it("builds the start script and install paths with real backslashes", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\hyper\\Start_HYPERCHARGE.bat");
		assert.equal(entry.installDir, "C:\\Servers\\hyper\\");
		assert.match(entry.startScriptPath, /^C:\\Servers\\hyper\\Start_HYPERCHARGE\.bat$/);
	});
});

describe("HYPERCHARGE backup and logs", () => {
	it("backs up nothing, because no save location is documented", () => {
		assert.deepEqual(backup.paths, []);
	});

	it("lists no log, because none is documented", () => {
		assert.deepEqual(logs, []);
	});
});

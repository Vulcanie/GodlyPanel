import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import game, { launchText } from "../../src/server/data/games/battalionlegacy.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// BATTALION: Legacy, from the research dossier (nothing was run on a real install of this game): Steam server app 805140,
// BattalionServer.exe, a query port and a game port, arguments only (no config file), no mods.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My BATTALION Server",
	sessionName: "Friends Battle",
	adminPassword: "adm1n",
	port: 25956,
	queryPort: 25958,
	installDir: "C:\\Servers\\battalion",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-battalion-server",
	startScriptFilename: "Start_BATTALION.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

/** Every game module in the folder, registered or not, so a port picked here cannot clash with one still being added. */
async function otherTemplates() {
	const dir = join(dirname(fileURLToPath(import.meta.url)), "../../src/server/data/games");
	const out = [...GAME_TEMPLATES];
	for (const file of readdirSync(dir)) {
		if (!file.endsWith(".js") || file === "index.js" || file === "battalionlegacy.js") continue;
		const mod = await import(pathToFileURL(join(dir, file)).href);
		if (mod.default?.template) out.push(mod.default.template);
	}
	return out.filter((t) => t.id !== "battalionlegacy");
}

describe("BATTALION: Legacy module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "battalionlegacy");
		assert.equal(template.type, "battalionlegacy");
		assert.equal(template.displayName, "BATTALION: Legacy");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (805140) into the folder root", () => {
		assert.equal(template.updateAppId, "805140");
		assert.equal(template.storeAppId, "489940");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name and an admin password only, with no map, no login token and no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "adminPassword"]);
		assert.equal(template.mapChoices, undefined);
		assert.equal(template.postWrite, undefined);
	});

	it("has a game port and a query port that no other template uses, nor any port beside theirs", async () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		assert.equal(template.ports[0].default, 25956);
		assert.equal(template.ports[1].default, 25958);
		const mine = [
			template.ports[0].default,
			template.ports[1].default,
			...implicitPortsOf(template).flatMap((i) => [template.ports[0].default + i.offset, template.ports[1].default + i.offset]),
		];
		const others = await otherTemplates();
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});
});

describe("BATTALION: Legacy start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to the install folder and starts BattalionServer.exe from the install root", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My BATTALION Server" BattalionServer\.exe /);
	});

	it("writes the query port, the name and the admin password in the egg's form", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My BATTALION Server" BattalionServer.exe -Port=25956 -QueryPort=25958 -SteamServerName="Friends Battle" -AdminPassword="adm1n"',
		);
	});

	it("leaves out the admin password flag when none is set", () => {
		const open = template.buildStartScript(params({ adminPassword: "" }));
		assert.ok(!/AdminPassword/.test(open));
		assert.match(launchLine(open), /-QueryPort=25958 -SteamServerName="Friends Battle"$/);
	});

	it("falls back to the window's name for the server name", () => {
		const bare = template.buildStartScript(params({ sessionName: "" }));
		assert.match(launchLine(bare), /-SteamServerName="My BATTALION Server"/);
	});

	it("matches the query port in the entry", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(Number(/-QueryPort=(\d+)/.exec(launchLine(script))[1]), entry.queryPort);
		const custom = template.buildStartScript(params({ queryPort: 25948 }));
		assert.match(custom, /-QueryPort=25948 /);
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', sessionName: 'x" & calc', adminPassword: "p\" & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" BattalionServer\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("BATTALION: Legacy inputs", () => {
	it("refuses a name or password that cannot go on the launch line", async () => {
		for (const bad of ['a"b', "a&b", "a%b", "a\\b", "a^b", "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot go safely/, JSON.stringify(bad));
			await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", adminPassword: bad }), /cannot go safely/, JSON.stringify(bad));
		}
		assert.equal(launchText("  My Server (1)  ", "x", 60), "My Server (1)");
	});

	it("refuses a name over 60 characters and an admin password over 20", async () => {
		await assert.rejects(template.resolveParams({ name: "x", sessionName: "n".repeat(61) }), /60 characters/);
		await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", adminPassword: "p".repeat(21) }), /20 characters/);
	});

	it("hands the cleaned values on from resolveParams", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", adminPassword: "pw" });
		assert.deepEqual(out, { sessionName: "Friends", adminPassword: "pw" });
	});
});

describe("BATTALION: Legacy server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches BattalionServer.exe, by process, with no RCON, and minimizes the window so Ctrl+C can be sent", () => {
		assert.equal(entry.processName, "BattalionServer.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "battalionlegacy");
		assert.equal(entry.windowMode, "minimized");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});

	it("records the start script, the folder and the ports", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\battalion\\Start_BATTALION.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\battalion");
		assert.equal(entry.installDir, "C:\\Servers\\battalion\\");
		assert.equal(entry.updateAppId, "805140");
		assert.equal(entry.port, 25956);
		assert.equal(entry.queryPort, 25958);
		assert.equal(entry.autoUpdate, false);
	});

	it("writes no config file, since the dossier gives no location for one", () => {
		assert.equal(entry.configPath, undefined);
		assert.equal(entry.configPaths, undefined);
		assert.equal(template.buildConfigFile, undefined);
	});
});

describe("BATTALION: Legacy backups and logs", () => {
	it("backs up nothing and lists no log, since no folder of either is known", () => {
		assert.deepEqual(backup.paths, []);
		assert.deepEqual(logs, []);
	});
});

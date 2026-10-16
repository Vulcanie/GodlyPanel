import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { configObject, cleanScenario, cleanAdminPassword, DEFAULT_SCENARIO } from "../../src/server/data/games/armareforger.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Arma Reforger, from the research dossier (nothing was run on a real install): server app 1874900, ArmaReforgerServer.exe, one JSON
// settings file given with -config, UDP 2001 for players and a Steam query port.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Reforger Server",
	sessionName: "Friends Reforger",
	serverPassword: "secret1",
	adminPassword: "adminpw99",
	scenarioId: "",
	port: 2001,
	queryPort: 17877,
	installDir: "C:\\Servers\\reforger",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-reforger-server",
	startScriptFilename: "Start_ArmaReforger.bat",
	...extra,
});

describe("Arma Reforger module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "armareforger");
		assert.equal(template.type, "armareforger");
		assert.equal(template.displayName, "Arma Reforger");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (1874900) anonymously into the folder root, not the game (1874880)", () => {
		assert.equal(template.updateAppId, "1874900");
		assert.equal(template.storeAppId, "1874880");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a join password, an admin password and a scenario, and has no mods field", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "adminPassword", "scenarioId"]);
		assert.ok(!template.fields.includes("mods"));
		for (const f of template.fields) assert.ok(f === "serverPassword" || template.fieldMeta[f], `${f} has a label`);
	});

	it("has a UDP game port 2001 and a query port that clash with no other template's port or the ports beside them", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		assert.equal(template.ports[0].default, 2001);
		assert.match(template.ports[0].label, /UDP/);
		const taken = new Set();
		for (const t of GAME_TEMPLATES) {
			if (t.id === "armareforger") continue;
			for (const p of t.ports ?? []) {
				taken.add(p.default);
				for (const i of implicitPortsOf(t)) if (p.key === "port") taken.add(p.default + i.offset);
			}
		}
		const mine = [template.ports[0].default, template.ports[1].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		for (const m of mine) assert.ok(!taken.has(m), `${m} is another game's port`);
		// 17777 is the game's own default query port but Icarus has it here.
		assert.notEqual(template.ports[1].default, 17777);
	});
});

describe("Arma Reforger start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts ArmaReforgerServer.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.ok(launch, "has a start line");
		assert.match(launch, /^start \/MIN "My Reforger Server" ArmaReforgerServer\.exe /);
	});

	it("points the server at its settings file, sets the frame rate limit and the profile folder", () => {
		assert.match(launch, / -config "\.\\Configs\\server-config\.json" /);
		assert.match(launch, / -maxFPS 60$/);
		assert.match(launch, / -profile "%~dp0profile" /);
	});

	it("never uses -server (which makes the game ignore -config) and keeps names and passwords out of the script", () => {
		assert.ok(!/ -server\b/.test(script));
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("adminpw99"));
		assert.ok(!script.includes("Friends Reforger"));
	});

	it("writes the file the -config argument names", () => {
		const { relPath } = template.buildConfigFile(params());
		assert.equal(relPath, "Configs\\server-config.json");
		assert.ok(launch.includes(`".\\${relPath}"`));
	});

	it("never lets a character cmd acts on from the server name into the script", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%' }));
		const hl = hostile.split("\r\n").find((l) => l.startsWith("start "));
		assert.match(hl, /^start \/MIN "[^"%&|<>^]*" ArmaReforgerServer\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Arma Reforger settings file", () => {
	const { content } = template.buildConfigFile(params());
	const cfg = JSON.parse(content);

	it("is valid JSON with real booleans and numbers", () => {
		assert.equal(typeof cfg.game.visible, "boolean");
		assert.equal(typeof cfg.game.maxPlayers, "number");
		assert.equal(typeof cfg.game.gameProperties.fastValidation, "boolean");
		assert.equal(typeof cfg.publicPort, "number");
		assert.ok(content.endsWith("\n"));
	});

	it("writes the name, passwords, scenario and ports from the form", () => {
		assert.equal(cfg.game.name, "Friends Reforger");
		assert.equal(cfg.game.password, "secret1");
		assert.equal(cfg.game.passwordAdmin, "adminpw99");
		assert.equal(cfg.game.scenarioId, DEFAULT_SCENARIO);
		assert.equal(cfg.game.maxPlayers, 64);
		assert.equal(cfg.publicPort, 2001);
		assert.equal(cfg.a2s.port, 17877);
	});

	it("leaves out what the wiki says to leave out, and the remote console", () => {
		for (const k of ["bindAddress", "bindPort", "publicAddress", "rcon", "dedicatedServerId", "region"]) assert.ok(!(k in cfg), k);
		assert.ok(!("modsRequiredByDefault" in cfg.game));
		assert.ok(!("supportedPlatforms" in cfg.game));
		assert.deepEqual(cfg.game.mods, []);
		assert.deepEqual(cfg.game.admins, []);
	});

	it("uses the wiki's documented defaults for the rules, and keeps fast validation on", () => {
		const gp = cfg.game.gameProperties;
		assert.equal(gp.fastValidation, true);
		assert.equal(gp.battlEye, true);
		assert.equal(gp.serverMaxViewDistance, 1600);
		assert.equal(gp.networkViewDistance, 1500);
		assert.equal(gp.persistence.autoSaveInterval, 10);
		assert.equal(cfg.game.crossPlatform, false);
		assert.equal(cfg.operating.playerSaveTime, 120);
		assert.equal(cfg.operating.joinQueue.maxSize, 0);
	});

	it("takes the player limit from the form within the wiki's 1..128 range", () => {
		assert.equal(configObject(params({ maxPlayers: 20 })).game.maxPlayers, 20);
		assert.equal(configObject(params({ maxPlayers: "abc" })).game.maxPlayers, 64);
		assert.equal(configObject(params({ maxPlayers: 500 })).game.maxPlayers, 64);
		assert.equal(configObject(params({ maxPlayers: 128 })).game.maxPlayers, 128);
	});

	it("falls back to the server's name, cuts a name at 100 characters and writes an open server's empty password", () => {
		assert.equal(configObject(params({ sessionName: "" })).game.name, "My Reforger Server");
		assert.equal(configObject(params({ sessionName: "x".repeat(150) })).game.name.length, 100);
		assert.equal(configObject(params({ serverPassword: "" })).game.password, "");
	});

	it("keeps a quote, a backslash or a line break in a value from breaking the file", () => {
		const text = template.buildConfigFile(params({ sessionName: 'He said "hi" \\ and\r\n"extra": 1', serverPassword: 'p"w\\' })).content;
		const parsed = JSON.parse(text);
		assert.ok(!("extra" in parsed.game));
		assert.equal(parsed.game.password, 'p"w\\');
		assert.ok(!/[\r\n]/.test(parsed.game.name));
	});

	it("uses a scenario that was typed, and refuses one that is not a .conf path", () => {
		const own = "{64B2F8D8059EE270}Missions/FreedomFighters/Everon.conf";
		assert.equal(configObject(params({ scenarioId: own })).game.scenarioId, own);
		assert.equal(cleanScenario("  "), "");
		assert.throws(() => cleanScenario("Everon"), /scenario/i);
		assert.throws(() => cleanScenario('{AAAA}"x.conf'), /scenario/i);
	});

	it("refuses an admin password with a space, which the game does not support", () => {
		assert.throws(() => cleanAdminPassword("two words"), /spaces/);
		assert.equal(cleanAdminPassword("  abc123 "), "abc123");
		assert.throws(() => template.buildConfigFile(params({ adminPassword: "a b" })), /spaces/);
	});

	it("cleans the form values before the files are written", async () => {
		const out = await template.resolveParams({ scenarioId: "  ", adminPassword: " pw1 " });
		assert.deepEqual(out, { scenarioId: "", adminPassword: "pw1" });
		await assert.rejects(() => template.resolveParams({ scenarioId: "nope", adminPassword: "" }), /scenario/i);
	});
});

describe("Arma Reforger server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches ArmaReforgerServer.exe, by process", () => {
		assert.equal(entry.processName, "ArmaReforgerServer.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "armareforger");
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\reforger\\Start_ArmaReforger.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\reforger");
		assert.equal(entry.installDir, "C:\\Servers\\reforger\\");
		assert.equal(entry.updateAppId, "1874900");
		assert.equal(entry.configPath, "C:\\Servers\\reforger\\Configs\\server-config.json");
		assert.equal(entry.configPaths["server-config.json"], entry.configPath);
		assert.equal(entry.autoUpdate, false);
	});

	it("records the ports the settings file gives, and has no RCON", () => {
		const cfg = JSON.parse(template.buildConfigFile(params({ port: 2100, queryPort: 17900 })).content);
		const e = template.buildServerEntry(params({ port: 2100, queryPort: 17900 }));
		assert.equal(e.port, cfg.publicPort);
		assert.equal(e.queryPort, cfg.a2s.port);
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});
});

describe("Arma Reforger first start", () => {
	it("says which scenario was used when none was chosen, and nothing when one was", async () => {
		const warned = await template.postWrite(params());
		assert.equal(warned.warnings.length, 1);
		assert.ok(warned.warnings[0].includes(DEFAULT_SCENARIO));
		const quiet = await template.postWrite(params({ scenarioId: "{64B2F8D8059EE270}Missions/FreedomFighters/Everon.conf" }));
		assert.equal(quiet.warnings.length, 0);
	});
});

describe("Arma Reforger backups and logs", () => {
	it("backs up the profile folder (without logs and downloaded add-ons) and the settings folder", () => {
		const byRel = Object.fromEntries(backup.paths.map((p) => [p.rel, p]));
		assert.deepEqual(byRel.profile.exclude, ["logs", "addons"]);
		assert.ok(byRel.Configs);
		for (const p of backup.paths) assert.equal(p.base, "working");
	});

	it("lists the profile folder for logs, where the wiki says the server keeps them", () => {
		assert.deepEqual(logs.map((l) => [l.kind, l.base, l.rel]), [["dir", "working", "profile"], ["dir", "working", "profile/logs"]]);
	});
});

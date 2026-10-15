import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cfgText, cleanLoginToken, parseCollectionId } from "../../src/server/data/games/garrysmod.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Garry's Mod, from the research dossier (nothing was run on a real install): server app 4020, srcds.exe, one game port,
// name and password in autoexec.cfg, a Workshop collection and a login token on the launch line.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My GMod Server",
	sessionName: "Friends Sandbox",
	serverPassword: "secret1",
	port: 27145,
	installDir: "C:\\Servers\\gmod",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-gmod-server",
	startScriptFilename: "Start_GarrysMod.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Garry's Mod module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "garrysmod");
		assert.equal(template.type, "garrysmod");
		assert.equal(template.displayName, "Garry's Mod");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (4020) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "4020");
		assert.equal(template.storeAppId, "4000");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password, a map, a login token and a Workshop collection", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode", "gslt", "mods"]);
		for (const f of ["gslt", "mods"]) assert.ok(template.fieldMeta[f].label.length > 20, f);
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["gm_construct", "gm_flatgrass"]);
	});

	it("has one game port that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "garrysmod");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
		assert.ok(![27015, 27005, 27020, 26900].includes(template.ports[0].default), "not one of srcds's own default ports");
	});

});

describe("Garry's Mod start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My GMod Server" srcds\.exe /);
	});

	it("writes the arguments the sources agree on", () => {
		const launch = launchLine(script);
		assert.equal(
			launch,
			'start /MIN "My GMod Server" srcds.exe -console -game garrysmod -port 27145 -strictportbind +maxplayers 16 +gamemode sandbox +map gm_construct -condebug',
		);
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 27145 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 27300, maxPlayers: 24, mapCode: "gm_flatgrass" }));
		assert.match(custom, / -port 27300 /);
		assert.match(custom, / \+maxplayers 24 /);
		assert.match(custom, / \+map gm_flatgrass /);
	});

	it("adds the login token and the Workshop collection when given, and no -authkey", () => {
		const full = template.buildStartScript(params({ gslt: "ABCDEF0123456789ABCDEF0123456789", mods: "157384458" }));
		assert.match(launchLine(full), / \+sv_setsteamaccount ABCDEF0123456789ABCDEF0123456789 \+host_workshop_collection 157384458$/);
		assert.ok(!/authkey/i.test(full));
		const none = template.buildStartScript(params());
		assert.ok(!/sv_setsteamaccount|host_workshop_collection/.test(none));
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Sandbox"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', gslt: "x & calc", mods: "1 & calc", mapCode: "gm_a & calc", maxPlayers: "20 & calc", gamemode: "a&b" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map gm_construct /);
		assert.match(launch, / \+gamemode sandbox /);
		assert.match(launch, / \+maxplayers 16 /);
		assert.ok(!/sv_setsteamaccount|host_workshop_collection/.test(launch));
	});

	it("keeps the player limit to a whole number from 1 to 128", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / \+maxplayers 16 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 500 })), / \+maxplayers 16 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 128 })), / \+maxplayers 128 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Garry's Mod inputs", () => {
	it("refuses a name or password that would change what a config line does", async () => {
		for (const bad of ['a"b', "a;b", "a\\b", "http://x", "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /cannot hold safely/, JSON.stringify(bad));
			await assert.rejects(template.resolveParams({ name: "x", sessionName: "ok", serverPassword: bad }), /cannot hold safely/, JSON.stringify(bad));
		}
		assert.equal(cfgText("  My Server's name! (1)  ", "x"), "My Server's name! (1)");
	});

	it("accepts a login token as one piece of text only", () => {
		assert.equal(cleanLoginToken("  ABCDEF0123456789 "), "ABCDEF0123456789");
		assert.equal(cleanLoginToken(""), "");
		for (const bad of ["a b", 'a"b', "a&b", "%x%", "x".repeat(65)]) assert.throws(() => cleanLoginToken(bad), /login token/, bad);
	});

	it("reads a collection id from a number or the collection's link", () => {
		assert.equal(parseCollectionId("157384458"), "157384458");
		assert.equal(parseCollectionId("https://steamcommunity.com/sharedfiles/filedetails/?id=157384458"), "157384458");
		assert.equal(parseCollectionId(""), "");
		for (const bad of ["abc", "12", "1,2", "157384458 157384459"]) assert.throws(() => parseCollectionId(bad), /collection id/, bad);
	});

	it("hands the cleaned values on from resolveParams", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "", gslt: " TOKEN123 ", mods: "?id=157384458" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "gm_construct", gslt: "TOKEN123", mods: "157384458" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "gm_a & calc" }), /not a map name/);
	});

	it("warns when there is no login token, and about client downloads when there is a collection", async () => {
		const bare = await template.postWrite(params());
		assert.equal(bare.warnings.length, 1);
		assert.match(bare.warnings[0], /Login Token/);
		const withMods = await template.postWrite(params({ gslt: "T", mods: "157384458" }));
		assert.equal(withMods.warnings.length, 1);
		assert.match(withMods.warnings[0], /resource\.AddWorkshop/);
	});
});

describe("Garry's Mod autoexec.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("goes where the shipped valve.rc runs it, not into the shipped server.cfg", () => {
		assert.equal(relPath, "garrysmod\\cfg\\autoexec.cfg");
	});

	it("writes the name and the password as quoted console lines", () => {
		assert.ok(lines.includes('hostname "Friends Sandbox"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My GMod Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("Garry's Mod server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "garrysmod");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the two config files", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\gmod\\Start_GarrysMod.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\gmod");
		assert.equal(entry.installDir, "C:\\Servers\\gmod\\");
		assert.equal(entry.updateAppId, "4020");
		assert.equal(entry.configPath, "C:\\Servers\\gmod\\garrysmod\\cfg\\autoexec.cfg");
		assert.deepEqual(entry.configPaths, {
			"autoexec.cfg": "C:\\Servers\\gmod\\garrysmod\\cfg\\autoexec.cfg",
			"server.cfg": "C:\\Servers\\gmod\\garrysmod\\cfg\\server.cfg",
		});
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Garry's Mod backups and logs", () => {
	it("backs up the data folder, the cfg folder, the admin list, server Lua and hand-made addons", () => {
		const rels = backup.paths.map((p) => p.rel);
		for (const rel of ["garrysmod/data", "garrysmod/cfg", "garrysmod/settings/users.txt", "garrysmod/lua/autorun/server", "garrysmod/addons"]) assert.ok(rels.includes(rel), rel);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("lists the console log the launch line asks for", () => {
		assert.deepEqual(logs.map((l) => [l.kind, l.base, l.rel]), [["file", "working", "garrysmod/console.log"]]);
		assert.match(launchLine(template.buildStartScript(params())), / -condebug$/);
	});
});

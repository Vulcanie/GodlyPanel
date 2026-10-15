import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import game, { cfgText, cleanLoginToken, parseAddonIds, downloadAddons } from "../../src/server/data/games/l4d2.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Left 4 Dead 2, from the research dossier (nothing was run on a real install of this game): server app 222860, srcds.exe, one game
// port, a server.cfg the panel writes, an optional login token and Workshop addon ids.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My L4D2 Server",
	sessionName: "Friends Campaign",
	serverPassword: "secret1",
	port: 27245,
	installDir: "C:\\Servers\\l4d2",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-l4d2-server",
	startScriptFilename: "Start_L4D2.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Left 4 Dead 2 module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "l4d2");
		assert.equal(template.type, "l4d2");
		assert.equal(template.displayName, "Left 4 Dead 2");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (222860) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "222860");
		assert.equal(template.storeAppId, "550");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password, a campaign, a login token and Workshop addons", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode", "gslt", "mods"]);
		for (const f of ["gslt", "mods"]) assert.ok(template.fieldMeta[f].label.length > 20, f);
		const codes = template.mapChoices.map((m) => m.code);
		assert.equal(codes.length, 14);
		assert.equal(new Set(codes).size, 14);
		assert.ok(codes.includes("c1m1_hotel") && codes.includes("c8m1_apartments") && codes.includes("c14m1_junkyard"));
		for (const m of template.mapChoices) assert.match(m.code, /^c\d+m1_[a-z_]+$/);
	});

	it("has one game port that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const mine = [template.ports[0].default, ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "l4d2");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
		assert.ok(![27015, 27005, 27020, 26900].includes(template.ports[0].default), "not one of srcds's own default ports");
	});
});

describe("Left 4 Dead 2 start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts srcds.exe from the install folder", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My L4D2 Server" srcds\.exe /);
	});

	it("writes the arguments the sources agree on", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My L4D2 Server" srcds.exe -console -game left4dead2 -port 27245 -strictportbind +maxplayers 4 +map c1m1_hotel +exec server.cfg -condebug',
		);
	});

	it("never offers -tickrate, which is disabled in the game's code", () => {
		assert.ok(!/tickrate/i.test(script));
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 27245 }));
		assert.equal(Number(/-port (\d+)/.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 27300, maxPlayers: 8, mapCode: "c2m1_highway" }));
		assert.match(custom, / -port 27300 /);
		assert.match(custom, / \+maxplayers 8 /);
		assert.match(custom, / \+map c2m1_highway /);
	});

	it("adds the login token when given, and nothing about Workshop", () => {
		const full = template.buildStartScript(params({ gslt: "ABCDEF0123456789ABCDEF0123456789", mods: "3815658696" }));
		assert.match(launchLine(full), / -condebug \+sv_setsteamaccount ABCDEF0123456789ABCDEF0123456789$/);
		assert.ok(!/workshop|3815658696/i.test(full));
		assert.ok(!/sv_setsteamaccount/.test(script));
	});

	it("keeps the password and the server name out of the script", () => {
		assert.ok(!script.includes("secret1"));
		assert.ok(!script.includes("Friends Campaign"));
		assert.ok(!/sv_password|hostname/.test(script));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', gslt: "x & calc", mapCode: "c1 & calc", maxPlayers: "4 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" srcds\.exe /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
		assert.match(launch, / \+map c1m1_hotel /);
		assert.match(launch, / \+maxplayers 4 /);
		assert.ok(!/sv_setsteamaccount/.test(launch));
	});

	it("keeps the player limit to a whole number from 1 to 32", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / \+maxplayers 4 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 500 })), / \+maxplayers 4 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 32 })), / \+maxplayers 32 /);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Left 4 Dead 2 inputs", () => {
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

	it("reads Workshop item ids from numbers or links, once each", () => {
		assert.deepEqual(parseAddonIds("3815658696"), ["3815658696"]);
		assert.deepEqual(parseAddonIds("https://steamcommunity.com/sharedfiles/filedetails/?id=3815658696, 2976027012\n3815658696"), ["3815658696", "2976027012"]);
		assert.deepEqual(parseAddonIds(""), []);
		assert.deepEqual(parseAddonIds(undefined), []);
		for (const bad of ["abc", "12", "1 & calc", "3815658696;x"]) assert.throws(() => parseAddonIds(bad), /Workshop item id/, bad);
		assert.throws(() => parseAddonIds(Array.from({ length: 31 }, (_, i) => 100000 + i).join(",")), /most this form takes/);
	});

	it("hands the cleaned values on from resolveParams", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", serverPassword: "pw", mapCode: "", gslt: " TOKEN123 ", mods: "?id=3815658696 2976027012" });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw", mapCode: "c1m1_hotel", gslt: "TOKEN123", mods: "3815658696,2976027012" });
		await assert.rejects(template.resolveParams({ name: "x", mapCode: "c1m1 & calc" }), /not a map name/);
	});
});

describe("Left 4 Dead 2 server.cfg", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is the game's own settings file, which the game does not ship", () => {
		assert.equal(relPath, "left4dead2\\cfg\\server.cfg");
	});

	it("writes the name, the password and the lobby setting as console lines", () => {
		assert.ok(lines.includes('hostname "Friends Campaign"'));
		assert.ok(lines.includes('sv_password "secret1"'));
		assert.ok(lines.includes("sv_allow_lobby_connect_only 0"));
		assert.ok(lines.includes("sv_lan 0"));
		assert.ok(lines[0].startsWith("//"));
	});

	it("leaves the password out for an open server, and falls back to the server's name", () => {
		const open = template.buildConfigFile(params({ serverPassword: "", sessionName: "" })).content;
		assert.ok(!/sv_password/.test(open));
		assert.match(open, /^hostname "My L4D2 Server"$/m);
	});

	it("will not write a value that breaks out of its line", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: 'a"\r\nrcon_password "x' })), /cannot hold safely/);
		assert.throws(() => template.buildConfigFile(params({ serverPassword: "a;quit" })), /cannot hold safely/);
	});
});

describe("Left 4 Dead 2 server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches srcds.exe, by process, with no RCON", () => {
		assert.equal(entry.processName, "srcds.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "l4d2");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.queryPort, undefined);
	});

	it("records the start script, the folder and the settings file", () => {
		assert.equal(entry.startScriptPath, "C:\\Servers\\l4d2\\Start_L4D2.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\l4d2");
		assert.equal(entry.installDir, "C:\\Servers\\l4d2\\");
		assert.equal(entry.updateAppId, "222860");
		assert.equal(entry.configPath, "C:\\Servers\\l4d2\\left4dead2\\cfg\\server.cfg");
		assert.deepEqual(entry.configPaths, { "server.cfg": "C:\\Servers\\l4d2\\left4dead2\\cfg\\server.cfg" });
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Left 4 Dead 2 Workshop addons", () => {
	// A stand-in for SteamCMD: puts a file where SteamCMD does, from the arguments it was given.
	const VPK = Buffer.from([0x34, 0x12, 0xaa, 0x55, 1, 2, 3]);
	const fakeSteamCmd = (outcome) => async (exe, args) => {
		const dir = args[args.indexOf("+force_install_dir") + 1];
		const ids = args.flatMap((a, i) => (a === "+workshop_download_item" ? [args[i + 2]] : []));
		for (const id of ids) {
			const files = outcome[id];
			if (!files) continue;
			const item = path.join(dir, "steamapps", "workshop", "content", "550", id);
			await fsp.mkdir(item, { recursive: true });
			for (const [name, data] of Object.entries(files)) await fsp.writeFile(path.join(item, name), data);
		}
		return { output: ids.map((id) => (outcome[id] ? `Success. Downloaded item ${id}` : `ERROR! Download item ${id} failed (Failure).`)).join("\n"), error: null };
	};
	const withInstall = async (fn) => {
		const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "gp-l4d2-test-"));
		try {
			return await fn(dir);
		} finally {
			await fsp.rm(dir, { recursive: true, force: true });
		}
	};

	it("does nothing without addons", async () => {
		const out = await template.postWrite(params({ mods: "" }), { log() {} });
		assert.deepEqual(out, { warnings: [] });
	});

	it("asks SteamCMD for app 550 anonymously, with the install folder set first", async () => {
		await withInstall(async (installDir) => {
			let seen;
			await downloadAddons(params({ installDir, mods: "3815658696,2976027012" }), {
				run: async (exe, args) => ((seen = { exe, args }), { output: "", error: null }),
			});
			assert.equal(seen.exe, "C:\\steamcmd\\steamcmd.exe");
			assert.equal(seen.args[0], "+force_install_dir");
			assert.deepEqual(seen.args.slice(2, 4), ["+login", "anonymous"]);
			assert.deepEqual(seen.args.slice(4), ["+workshop_download_item", "550", "3815658696", "+workshop_download_item", "550", "2976027012", "+quit"]);
		});
	});

	it("copies a package, or a legacy .bin that is one, to addons/<id>.vpk", async () => {
		await withInstall(async (installDir) => {
			const run = fakeSteamCmd({ 3815658696: { "isiw.vpk": VPK }, 2976027012: { "abc123_legacy.bin": VPK } });
			const out = await downloadAddons(params({ installDir, mods: "3815658696,2976027012" }), { run });
			assert.deepEqual(out.installed, ["3815658696.vpk", "2976027012.vpk"]);
			for (const name of out.installed) assert.deepEqual(await fsp.readFile(path.join(installDir, "left4dead2", "addons", name)), VPK);
			assert.equal(out.warnings.length, 1);
			assert.match(out.warnings[0], /same addons/);
		});
	});

	it("reports an item Steam did not give, keeps the others, and ignores files that are not packages", async () => {
		await withInstall(async (installDir) => {
			const run = fakeSteamCmd({ 3815658696: { "readme.bin": Buffer.from("not a package") }, 2976027012: { "x.vpk": VPK } });
			const out = await downloadAddons(params({ installDir, mods: "3815658696,2976027012,1111111111" }), { run });
			assert.deepEqual(out.installed, ["2976027012.vpk"]);
			assert.equal(out.warnings.length, 3);
			assert.ok(out.warnings.some((w) => w.includes("3815658696") && /not added/.test(w)));
			assert.ok(out.warnings.some((w) => w.includes("1111111111") && /Failure/.test(w)));
		});
	});

	it("is what postWrite runs", async () => {
		await withInstall(async (installDir) => {
			// No SteamCMD here: with an empty list it must not try to start one.
			const out = await template.postWrite(params({ installDir, mods: "" }), {});
			assert.deepEqual(out.warnings, []);
		});
	});
});

describe("Left 4 Dead 2 backups and logs", () => {
	it("backs up the settings and ban lists and the addons, and nothing else", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["left4dead2/cfg", "left4dead2/addons"]);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
		}
	});

	it("lists the console log the launch line asks for, named console.log, and the game's log folder", () => {
		assert.deepEqual(logs.map((l) => [l.kind, l.base, l.rel]), [
			["file", "working", "left4dead2/console.log"],
			["dir", "working", "left4dead2/logs"],
		]);
		assert.match(launchLine(template.buildStartScript(params())), / -condebug$/);
	});
});

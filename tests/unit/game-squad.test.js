import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import game, { serverNameText, parseModIds, downloadMods } from "../../src/server/data/games/squad.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Moves real folders with Windows paths, so it only runs on Windows (CI's Windows job runs it).
const onWindows = process.platform === "win32";

// Squad, from the research dossier (nothing was run on a real install): server app 403240, SquadGameServer.exe, arguments written
// KEY=value without a dash, name and player limit in Server.cfg, Workshop mods fetched by SteamCMD into SquadGame\Plugins\Mods.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Squad Server",
	sessionName: "Friends Squad",
	port: 7787,
	queryPort: 27165,
	beaconPort: 15000,
	installDir: "C:\\Servers\\squad",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-squad-server",
	startScriptFilename: "Start_Squad.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Squad module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "squad");
		assert.equal(template.type, "squad");
		assert.equal(template.displayName, "Squad");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (403240) anonymously into the folder root, and names the game (393380)", () => {
		assert.equal(template.updateAppId, "403240");
		assert.equal(template.storeAppId, "393380");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
		assert.ok(template.estimatedInstallBytes >= 14_000_000_000);
	});

	it("asks for a name and Workshop mods only (no password key is documented)", () => {
		assert.deepEqual(template.fields, ["sessionName", "mods"]);
		assert.ok(template.fieldMeta.mods.label.length > 20);
	});

	it("has game, query and beacon ports that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort", "beaconPort"]);
		assert.deepEqual(template.ports.map((p) => p.default), [7787, 27165, 15000]);
		const mine = [...template.ports.map((p) => p.default), ...implicitPortsOf(template).map((i) => template.ports[0].default + i.offset)];
		assert.ok(mine.includes(7788));
		const others = GAME_TEMPLATES.filter((t) => t.id !== "squad");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
			// The Steam query port's companion (27166), which the panel cannot keep free, must not be another game's port either.
			assert.ok(!theirs.has(27166), `27166 clashes with ${t.id}`);
		}
	});
});

describe("Squad start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts SquadGameServer.exe by its path from there", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My Squad Server" SquadGame\\Binaries\\Win64\\SquadGameServer\.exe /);
		assert.ok(!/SquadServer\.exe/.test(script));
	});

	it("writes the wiki's arguments, Name=value without a dash, Port= first", () => {
		assert.equal(
			launchLine(script),
			'start /MIN "My Squad Server" SquadGame\\Binaries\\Win64\\SquadGameServer.exe Port=7787 QueryPort=27165 beaconport=15000 FIXEDMAXPLAYERS=80 RANDOM=NONE -log',
		);
		const args = launchLine(script).split("SquadGameServer.exe ")[1];
		assert.ok(args.startsWith("Port="));
		assert.ok(!/ -(Port|QueryPort|beaconport)/i.test(args));
	});

	it("matches the ports in the entry", () => {
		const entry = template.buildServerEntry(params());
		const line = launchLine(script);
		assert.equal(Number(/ Port=(\d+)/.exec(line)[1]), entry.port);
		assert.equal(Number(/ QueryPort=(\d+)/.exec(line)[1]), entry.queryPort);
		assert.equal(Number(/ beaconport=(\d+)/.exec(line)[1]), entry.beaconPort);
		const custom = template.buildStartScript(params({ port: 8900, queryPort: 8902, beaconPort: 25000, maxPlayers: 50 }));
		assert.match(custom, / Port=8900 QueryPort=8902 beaconport=25000 FIXEDMAXPLAYERS=50 /);
	});

	it("keeps the player limit to a whole number from 1 to 100, default 80", () => {
		assert.match(template.buildStartScript(params({ maxPlayers: "abc" })), / FIXEDMAXPLAYERS=80 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 500 })), / FIXEDMAXPLAYERS=80 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 100 })), / FIXEDMAXPLAYERS=100 /);
		assert.match(template.buildStartScript(params({ maxPlayers: 1 })), / FIXEDMAXPLAYERS=1 /);
	});

	it("keeps the server name and the mods out of the script", () => {
		const full = template.buildStartScript(params({ mods: "3516838562" }));
		assert.ok(!full.includes("Friends Squad"));
		assert.ok(!/3516838562|workshop|ServerName/i.test(full));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%', maxPlayers: "80 & calc", port: "7787 & calc" }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" SquadGame\\/);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[&|<>^%]/.test(launch.replace(/^start \/MIN "[^"]*"/, "")));
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Squad inputs", () => {
	it("refuses a name that would end the quoted value", async () => {
		for (const bad of ['a"b', "a\nb"]) {
			await assert.rejects(template.resolveParams({ name: "x", sessionName: bad }), /double quote/, JSON.stringify(bad));
		}
		assert.equal(serverNameText("  My [EU] Squad's name!  "), "My [EU] Squad's name!");
	});

	it("reads Workshop ids from numbers or links, once each", () => {
		assert.deepEqual(parseModIds("3516838562"), ["3516838562"]);
		assert.deepEqual(parseModIds("https://steamcommunity.com/sharedfiles/filedetails/?id=3516838562, 3726472400\n3516838562"), ["3516838562", "3726472400"]);
		assert.deepEqual(parseModIds(""), []);
		assert.deepEqual(parseModIds(undefined), []);
		for (const bad of ["abc", "12", "1 & calc", "3516838562;x"]) assert.throws(() => parseModIds(bad), /Workshop item id/, bad);
		assert.throws(() => parseModIds(Array.from({ length: 31 }, (_, i) => 100000 + i).join(",")), /most this form takes/);
	});

	it("hands the cleaned values on from resolveParams", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  Friends  ", mods: "?id=3516838562 3726472400" });
		assert.deepEqual(out, { sessionName: "Friends", mods: "3516838562,3726472400" });
	});
});

describe("Squad Server.cfg and Rcon.cfg", () => {
	const patch = template.patchInstalledConfig;

	it("patches the file the install ships, relative to the install folder", () => {
		assert.equal(patch.relPath, "SquadGame\\ServerConfig\\Server.cfg");
	});

	it("changes the name (keeping its double quotes) and the player limit, and nothing else, keeping the line endings", () => {
		const shipped = ['ServerName="SERVERNAME"', "", "// Max player count on the server", "MaxPlayers=100", "// ServerName=\"not this\"", "NumReservedSlots=0", "MapRotationMode=LayerList_Vote", ""].join("\r\n");
		const out = patch.apply(shipped, params({ maxPlayers: 60 }));
		assert.equal(out, shipped.replace('ServerName="SERVERNAME"', 'ServerName="Friends Squad"').replace("MaxPlayers=100", "MaxPlayers=60"));
		assert.ok(out.includes("MapRotationMode=LayerList_Vote"));
		assert.ok(out.includes('// ServerName="not this"'));
	});

	it("adds the lines a shipped file lacks, and does not treat $ in a name as a replacement pattern", () => {
		const out = patch.apply("ShouldAdvertise=true\n", params({ sessionName: "Cash $& $1 Squad" }));
		assert.equal(out, 'ShouldAdvertise=true\nServerName="Cash $& $1 Squad"\nMaxPlayers=80\n');
	});

	it("makes a small file when there is none, with the wiki's printed defaults", () => {
		const text = patch.create(params({ maxPlayers: 70 }));
		const lines = text.split("\r\n");
		assert.ok(lines.includes('ServerName="Friends Squad"'));
		assert.ok(lines.includes("ShouldAdvertise=true"));
		assert.ok(lines.includes("IsLANMatch=false"));
		assert.ok(lines.includes("MaxPlayers=70"));
		assert.ok(lines[0].startsWith("//"));
		assert.match(patch.create(params({ sessionName: "" })), /^ServerName="My Squad Server"$/m);
		assert.ok(!/Password/i.test(text));
	});

	it("will not write a name that breaks out of its quotes", () => {
		assert.throws(() => patch.create(params({ sessionName: 'a"\r\nIsLANMatch=true' })), /double quote/);
		assert.throws(() => patch.apply("MaxPlayers=1\n", params({ sessionName: 'a" b' })), /double quote/);
	});

	it("writes Rcon.cfg with an empty password, which keeps the remote console off", () => {
		const [file] = template.buildExtraFiles(params());
		assert.equal(file.relPath, "SquadGame\\ServerConfig\\Rcon.cfg");
		const lines = file.content.split("\r\n");
		assert.ok(lines.includes("Password="));
		assert.ok(lines.includes("Port=21114"));
		assert.ok(lines.includes("MaxConnections=5"));
		assert.ok(lines.includes("SecondsBeforeTimeoutCheck=120"));
	});
});

describe("Squad server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches SquadGameServer.exe by process, with no RCON so Stop never sends a Source RCON command", () => {
		assert.equal(entry.processName, "SquadGameServer.exe");
		assert.equal(entry.method, "process");
		assert.equal(entry.type, "squad");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.serverPassword, undefined);
	});

	it("records the ports, the start script and the folder", () => {
		assert.equal(entry.port, 7787);
		assert.equal(entry.queryPort, 27165);
		assert.equal(entry.beaconPort, 15000);
		assert.equal(entry.startScriptPath, "C:\\Servers\\squad\\Start_Squad.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\squad");
		assert.equal(entry.installDir, "C:\\Servers\\squad\\");
		assert.equal(entry.updateAppId, "403240");
		assert.equal(entry.autoUpdate, false);
		assert.equal(entry.sessionName, "Friends Squad");
	});

	it("records no settings file (the Settings tab has none for it)", () => {
		assert.equal(entry.configPath, undefined);
		assert.equal(entry.configPaths, undefined);
	});
});

describe("Squad Workshop mods", () => {
	// A stand-in for SteamCMD: puts files where SteamCMD does, from the arguments it was given.
	const fakeSteamCmd = (outcome, calls = []) => async (exe, args) => {
		calls.push(args);
		const dir = args[args.indexOf("+force_install_dir") + 1];
		const id = args[args.indexOf("+workshop_download_item") + 2];
		const files = outcome[id];
		if (files) {
			const item = path.join(dir, "steamapps", "workshop", "content", "393380", id);
			await fsp.mkdir(item, { recursive: true });
			for (const [name, data] of Object.entries(files)) {
				await fsp.mkdir(path.dirname(path.join(item, name)), { recursive: true });
				await fsp.writeFile(path.join(item, name), data);
			}
			// SteamCMD's bookkeeping, which the module cleans up.
			await fsp.mkdir(path.join(dir, "steamapps", "workshop", "downloads"), { recursive: true });
		}
		return { output: files ? `Success. Downloaded item ${id}` : `ERROR! Download item ${id} failed (Failure).`, error: null };
	};
	const withInstall = async (fn) => {
		const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "gp-squad-test-"));
		try {
			return await fn(dir);
		} finally {
			await fsp.rm(dir, { recursive: true, force: true });
		}
	};
	const exists = (p) => fsp.access(p).then(() => true, () => false);

	it("does nothing without mods", async () => {
		assert.deepEqual(await template.postWrite(params({ mods: "" }), { log() {} }), { warnings: [] });
	});

	it("asks SteamCMD for app 393380 anonymously, one call per mod, with the install folder set first", async () => {
		await withInstall(async (installDir) => {
			const calls = [];
			await downloadMods(params({ installDir, mods: "3516838562,3726472400" }), { run: fakeSteamCmd({}, calls) });
			assert.equal(calls.length, 2);
			assert.deepEqual(calls[0], ["+force_install_dir", installDir, "+login", "anonymous", "+workshop_download_item", "393380", "3516838562", "+quit"]);
			assert.equal(calls[1][6], "3726472400");
		});
	});

	it("moves each mod to SquadGame/Plugins/Mods/<id>, directly containing its files, and cleans up SteamCMD's folder", { skip: !onWindows }, async () => {
		await withInstall(async (installDir) => {
			const run = fakeSteamCmd({ 3516838562: { "modinfo.smi": "x", "ModLoader.uplugin": "{}", "Content/a.uasset": "y" }, 3726472400: { "Content/b.uasset": "z" } });
			const out = await downloadMods(params({ installDir, mods: "3516838562,3726472400" }), { run });
			assert.deepEqual(out.installed, ["3516838562", "3726472400"]);
			const mods = path.join(installDir, "SquadGame", "Plugins", "Mods");
			assert.equal(await fsp.readFile(path.join(mods, "3516838562", "ModLoader.uplugin"), "utf8"), "{}");
			assert.equal(await fsp.readFile(path.join(mods, "3516838562", "Content", "a.uasset"), "utf8"), "y");
			assert.ok(await exists(path.join(mods, "3726472400", "Content", "b.uasset")));
			assert.ok(!(await exists(path.join(installDir, "steamapps", "workshop"))));
			assert.equal(out.warnings.length, 1);
			assert.match(out.warnings[0], /layer names/);
			assert.match(out.warnings[0], /same mods/);
		});
	});

	it("replaces an older copy of the same mod instead of mixing into it", { skip: !onWindows }, async () => {
		await withInstall(async (installDir) => {
			const old = path.join(installDir, "SquadGame", "Plugins", "Mods", "3516838562");
			await fsp.mkdir(old, { recursive: true });
			await fsp.writeFile(path.join(old, "old.txt"), "old");
			await downloadMods(params({ installDir, mods: "3516838562" }), { run: fakeSteamCmd({ 3516838562: { "Content/a.uasset": "new" } }) });
			assert.ok(!(await exists(path.join(old, "old.txt"))));
			assert.ok(await exists(path.join(old, "Content", "a.uasset")));
		});
	});

	it("reports a mod Steam did not give, keeps the others, and warns about one nested too deep", { skip: !onWindows }, async () => {
		await withInstall(async (installDir) => {
			const run = fakeSteamCmd({ 3726472400: { "inner/Content/b.uasset": "z" }, 3516838562: { "Content/a.uasset": "y" } });
			const out = await downloadMods(params({ installDir, mods: "1111111111,3726472400,3516838562" }), { run });
			assert.deepEqual(out.installed, ["3726472400", "3516838562"]);
			assert.ok(out.warnings.some((w) => w.includes("1111111111") && /not added/.test(w) && /Failure/.test(w)));
			assert.ok(out.warnings.some((w) => w.includes("3726472400") && /too deep/.test(w)));
		});
	});
});

describe("Squad backups and logs", () => {
	it("backs up the config folder and the ini overrides, and not the (huge) mods", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["SquadGame/ServerConfig", "SquadGame/Saved/Config/WindowsServer"]);
		for (const p of backup.paths) {
			assert.equal(p.base, "working");
			assert.ok(p.label);
			assert.ok(!/Plugins/.test(p.rel));
		}
	});

	it("reads the game's log folder", () => {
		assert.deepEqual(logs.map((l) => [l.kind, l.base, l.rel]), [["dir", "working", "SquadGame/Saved/Logs"]]);
	});
});

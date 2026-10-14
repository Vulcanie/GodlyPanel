import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cleanClusterToken, parseWorkshopIds } from "../../src/server/data/games/dst.js";
import { implicitPortsOf, blockLayout } from "../../src/server/data/portRules.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Don't Starve Together, from the research dossier (server app 343050, build 756039). One overworld shard.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My DST Server",
	sessionName: "Friends Camp",
	serverPassword: "Pass1234",
	port: 8930,
	queryPort: 8933,
	installDir: "C:\\Servers\\dst",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-dst-server",
	startScriptFilename: "Start_DST.bat",
	clusterToken: "",
	modIds: [],
	...extra,
});

const iniValue = (text, section, key) => {
	let current = null;
	for (const line of text.split(/\r?\n/)) {
		const head = /^\[(.+)\]$/.exec(line.trim());
		if (head) current = head[1];
		else if (current === section && line.startsWith(`${key} =`)) return line.slice(key.length + 2).trim();
	}
	return undefined;
};

describe("Don't Starve Together module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "dst");
		assert.equal(template.type, "dst");
		assert.equal(template.displayName, "Don't Starve Together");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server tool anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "343050");
		assert.equal(template.storeAppId, "322330");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a password, the cluster token and the mods, and says so for the two it adds", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "clusterToken", "mods"]);
		assert.match(template.fieldMeta.sessionName.label, /overworld only/i);
		assert.match(template.fieldMeta.sessionName.label, /no Caves/i);
		assert.match(template.fieldMeta.clusterToken.label, /cluster token/i);
		assert.match(template.fieldMeta.clusterToken.label, /offline/i);
		assert.match(template.fieldMeta.mods.label, /Workshop/);
	});

	it("has a game port and a Steam server port that do not clash with another game's default", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const taken = [7015, 7017, 7777, 8888, 8890, 8892, 8894, 8900, 8902, 8910, 8915, 8920, 8922, 8923, 9876, 9878, 15637, 16261, 16270, 25565, 25575, 26000, 26002, 26003, 27015, 27016, 27025, 28015, 28017, 28018, 8766];
		const [game_, query] = template.ports.map((p) => p.default);
		const mine = [game_, game_ + 1, game_ + 2, query];
		for (const port of mine) assert.ok(!taken.includes(port), `${port} is another game's default`);
		assert.equal(new Set(mine).size, mine.length);
		const layout = blockLayout(template);
		assert.equal(game_ + layout.queryOffset, query, "the default query port is where the panel puts it");
	});

	it("keeps the Steam login port (game port + 2) free as an implicit port", () => {
		const implicit = implicitPortsOf(template);
		assert.deepEqual(implicit.map((i) => i.offset), [1, 2]);
	});
});

describe("Don't Starve Together start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("goes to bin64 before starting the x64 server", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0bin64"');
		assert.match(launch, /^start \/MIN "My DST Server" dontstarve_dedicated_server_nullrenderer_x64\.exe /);
	});

	it("starts the Master shard of one cluster whose data is inside the server's folder", () => {
		assert.match(launch, / -console /);
		assert.match(launch, /-persistent_storage_root "%~dp0data" /);
		assert.match(launch, /-conf_dir DoNotStarveTogether /);
		assert.match(launch, /-cluster Cluster_1 /);
		assert.match(launch, /-shard Master /);
		assert.ok(!/-shard Caves/.test(script));
	});

	it("has the same ports as the server entry, and a Steam login port two above the game port", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(Number(/ -port (\d+)/.exec(script)[1]), entry.port);
		assert.equal(Number(/-steam_master_server_port (\d+)/.exec(script)[1]), entry.queryPort);
		assert.equal(Number(/-steam_authentication_port (\d+)/.exec(script)[1]), entry.port + 2);
	});

	it("keeps characters cmd would act on out of the window title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>' }));
		const line = bad.split("\r\n").find((l) => l.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(line);
		assert.ok(title, line);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.equal(bad.split("\r\n").filter((l) => l.includes("calc")).length, 1);
	});

	it("puts no password, name or token on the command line", () => {
		const text = template.buildStartScript(params({ clusterToken: "SECRETTOKEN" }));
		assert.ok(!text.includes("Pass1234"));
		assert.ok(!text.includes("Friends Camp"));
		assert.ok(!text.includes("SECRETTOKEN"));
	});
});

describe("Don't Starve Together direct launch", () => {
	it("is read back from the script the panel writes, so the no-window mode works", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-dst-"));
		try {
			fs.mkdirSync(path.join(root, "bin64"), { recursive: true });
			fs.writeFileSync(path.join(root, "bin64", "dontstarve_dedicated_server_nullrenderer_x64.exe"), "");
			const scriptPath = path.join(root, "Start_DST.bat");
			fs.writeFileSync(scriptPath, template.buildStartScript(params()));
			const found = deriveLaunch(scriptPath, { workingDir: root });
			assert.equal(found.ok, true, found.reason);
			assert.equal(found.launch.cwd, path.join(root, "bin64"));
			assert.equal(path.basename(found.launch.exe), "dontstarve_dedicated_server_nullrenderer_x64.exe");
			assert.ok(found.launch.args.includes(`-persistent_storage_root "${path.join(root, "data")}"`), found.launch.args);
			assert.ok(found.launch.args.includes("-shard Master"));
		} finally {
			fs.rmSync(root, { recursive: true, force: true });
		}
	});
});

describe("Don't Starve Together cluster.ini", () => {
	const build = (extra) => template.buildConfigFile(params(extra));

	it("goes in the cluster folder under the server's data folder", () => {
		assert.equal(build().relPath, "data\\DoNotStarveTogether\\Cluster_1\\cluster.ini");
	});

	it("holds the name and password, a single shard, and the autosave", () => {
		const text = build().content;
		assert.equal(iniValue(text, "NETWORK", "cluster_name"), "Friends Camp");
		assert.equal(iniValue(text, "NETWORK", "cluster_password"), "Pass1234");
		assert.equal(iniValue(text, "SHARD", "shard_enabled"), "false");
		assert.equal(iniValue(text, "NETWORK", "autosaver_enabled"), "true");
		assert.equal(iniValue(text, "GAMEPLAY", "game_mode"), "survival");
		assert.equal(iniValue(text, "MISC", "console_enabled"), "true");
	});

	it("is an offline cluster without a token and an online one with a token", () => {
		assert.equal(iniValue(build().content, "NETWORK", "offline_cluster"), "true");
		assert.equal(iniValue(build({ clusterToken: "abc123" }).content, "NETWORK", "offline_cluster"), "false");
	});

	it("never contains the token", () => {
		assert.ok(!build({ clusterToken: "SECRETTOKEN" }).content.includes("SECRETTOKEN"));
	});

	it("sets the player limit from the form or to 8, and refuses nonsense", () => {
		assert.equal(iniValue(build().content, "GAMEPLAY", "max_players"), "8");
		assert.equal(iniValue(build({ maxPlayers: 12 }).content, "GAMEPLAY", "max_players"), "12");
		assert.equal(iniValue(build({ maxPlayers: 500 }).content, "GAMEPLAY", "max_players"), "8");
		assert.equal(iniValue(build({ maxPlayers: "abc" }).content, "GAMEPLAY", "max_players"), "8");
	});

	it("writes no port: the launch line carries them", () => {
		assert.ok(!/port/i.test(build().content.replace(/cluster_password/gi, "")));
	});

	it("keeps a name or password on one line, with no byte-order mark", () => {
		const text = build({ sessionName: "A\r\nB", serverPassword: "p\nq" }).content;
		assert.ok(!text.includes("\nB"));
		assert.equal(text.split("\r\n").filter((l) => l.startsWith("cluster_name")).length, 1);
		assert.notEqual(text.charCodeAt(0), 0xfeff);
	});

	it("leaves the password empty when there is none", () => {
		assert.equal(iniValue(build({ serverPassword: "" }).content, "NETWORK", "cluster_password"), "");
	});
});

describe("Don't Starve Together extra files", () => {
	const files = (extra) => Object.fromEntries(template.buildExtraFiles(params(extra)).map((f) => [f.relPath, f.content]));

	it("always writes the Master shard's server.ini, without ports", () => {
		const f = files();
		const text = f["data\\DoNotStarveTogether\\Cluster_1\\Master\\server.ini"];
		assert.equal(iniValue(text, "SHARD", "is_master"), "true");
		assert.ok(!/port/i.test(text));
	});

	it("writes the cluster token alone, with nothing after it, only when there is one", () => {
		assert.ok(!("data\\DoNotStarveTogether\\Cluster_1\\cluster_token.txt" in files()));
		const f = files({ clusterToken: "tok-EN_123" });
		assert.equal(f["data\\DoNotStarveTogether\\Cluster_1\\cluster_token.txt"], "tok-EN_123");
	});

	it("writes no mod files without mods", () => {
		assert.deepEqual(Object.keys(files()), ["data\\DoNotStarveTogether\\Cluster_1\\Master\\server.ini"]);
	});

	it("lists each mod to download and enables it in the Master shard", () => {
		const f = files({ modIds: ["350811795", "2902364746"] });
		const setup = f["mods\\dedicated_server_mods_setup.lua"];
		assert.match(setup, /^ServerModSetup\("350811795"\)$/m);
		assert.match(setup, /^ServerModSetup\("2902364746"\)$/m);
		const overrides = f["data\\DoNotStarveTogether\\Cluster_1\\Master\\modoverrides.lua"];
		assert.match(overrides, /^return \{/);
		assert.match(overrides, /\["workshop-350811795"\] = \{ enabled = true \},/);
		assert.match(overrides, /\["workshop-2902364746"\] = \{ enabled = true \},/);
		assert.match(overrides.trim(), /\}$/);
	});
});

describe("Don't Starve Together cluster token and mod list", () => {
	it("accepts a token as it is pasted, trimmed", () => {
		assert.equal(cleanClusterToken("  pds-g^KU_abc^xyz= \n"), "pds-g^KU_abc^xyz=");
		assert.equal(cleanClusterToken(""), "");
		assert.equal(cleanClusterToken(undefined), "");
	});

	it("refuses a token with spaces or quotes in it", () => {
		assert.throws(() => cleanClusterToken("my token"), /spaces or quotes/);
		assert.throws(() => cleanClusterToken('"abc"'), /spaces or quotes/);
	});

	it("reads ids, links and mixed separators, once each", () => {
		assert.deepEqual(parseWorkshopIds(""), []);
		assert.deepEqual(parseWorkshopIds("350811795, 2902364746;350811795"), ["350811795", "2902364746"]);
		assert.deepEqual(parseWorkshopIds("https://steamcommunity.com/sharedfiles/filedetails/?id=378160973 666155465"), ["378160973", "666155465"]);
	});

	it("refuses anything that is not a mod id, so no text reaches a Lua file", () => {
		assert.throws(() => parseWorkshopIds('123456"); os.execute("x'), /not a Steam Workshop mod id/);
		assert.throws(() => parseWorkshopIds("my-mod"), /not a Steam Workshop mod id/);
		assert.throws(() => parseWorkshopIds("12"), /not a Steam Workshop mod id/);
	});

	it("resolves the form values before anything is downloaded", async () => {
		const out = await template.resolveParams({ clusterToken: " tok ", mods: "350811795,https://x/?id=666155465" });
		assert.deepEqual(out, { clusterToken: "tok", mods: "350811795,666155465", modIds: ["350811795", "666155465"] });
		await assert.rejects(() => template.resolveParams({ mods: "nope" }), /Workshop mod id/);
	});
});

describe("Don't Starve Together server entry", () => {
	const entry = template.buildServerEntry(params());

	it("has the fields the panel needs", () => {
		assert.equal(entry.name, "My DST Server");
		assert.equal(entry.type, "dst");
		assert.equal(entry.method, "process");
		assert.equal(entry.port, 8930);
		assert.equal(entry.queryPort, 8933);
		assert.equal(entry.startScriptPath, "C:\\Servers\\dst\\Start_DST.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\dst");
		assert.equal(entry.installDir, "C:\\Servers\\dst\\");
		assert.equal(entry.updateAppId, "343050");
		assert.equal(entry.steamCmdPath, "C:\\steamcmd\\steamcmd.exe");
		assert.equal(entry.autoUpdate, false);
	});

	it("tracks the program that stays running", () => {
		assert.equal(entry.processName, "dontstarve_dedicated_server_nullrenderer_x64.exe");
	});

	it("points the Settings tab at cluster.ini and has no RCON", () => {
		const file = "C:\\Servers\\dst\\data\\DoNotStarveTogether\\Cluster_1\\cluster.ini";
		assert.equal(entry.configPath, file);
		assert.deepEqual(entry.configPaths, { "cluster.ini": file });
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});

	it("does not record the cluster token", () => {
		const withToken = template.buildServerEntry(params({ clusterToken: "SECRETTOKEN" }));
		assert.ok(!JSON.stringify(withToken).includes("SECRETTOKEN"));
	});
});

describe("Don't Starve Together warnings", () => {
	it("warns about an offline server on a port outside the documented range", async () => {
		const out = await template.postWrite(params({ port: 8930 }));
		assert.equal(out.warnings.length, 1);
		assert.match(out.warnings[0], /10998 to 11018/);
	});

	it("does not warn inside that range, or when there is a token", async () => {
		assert.deepEqual((await template.postWrite(params({ port: 10999 }))).warnings, []);
		assert.deepEqual((await template.postWrite(params({ clusterToken: "tok" }))).warnings, []);
	});
});

describe("Don't Starve Together backup and logs", () => {
	it("backs up the cluster folder, and not the token", () => {
		assert.equal(backup.paths.length, 1);
		const [spec] = backup.paths;
		assert.equal(spec.base, "working");
		assert.equal(spec.rel, "data/DoNotStarveTogether/Cluster_1");
		assert.ok(spec.label);
		assert.deepEqual(spec.exclude, ["cluster_token.txt"]);
	});

	it("reads the Master shard's server and chat logs", () => {
		assert.deepEqual(
			logs.map((l) => [l.kind, l.base, l.rel]),
			[
				["file", "working", "data/DoNotStarveTogether/Cluster_1/Master/server_log.txt"],
				["file", "working", "data/DoNotStarveTogether/Cluster_1/Master/server_chat_log.txt"],
			],
		);
	});
});

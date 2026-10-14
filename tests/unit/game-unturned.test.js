import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { serverId, cleanLoginToken, parseWorkshopIds, workshopConfig } from "../../src/server/data/games/unturned.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";
import { deriveLaunch } from "../../src/server/services/batchLaunch.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Unturned, from the research dossier (server app 1110390, build 3.26.3.13).

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Unturned Server",
	sessionName: "Friends Camp",
	serverPassword: "Pass1234",
	mapCode: "PEI",
	port: 27315,
	installDir: "C:\\Servers\\unturned",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-unturned-server",
	startScriptFilename: "Start_Unturned.bat",
	gslt: "",
	modIds: [],
	...extra,
});

const command = (text, name) => {
	const line = text.split(/\r?\n/).find((l) => l.startsWith(`${name} `) || l === name);
	return line === undefined ? undefined : line.slice(name.length).trim();
};

describe("Unturned module", () => {
	it("has the four parts a game module needs, and no launch form", () => {
		assert.ok(template && backup && logs);
		// The launch form adds arguments at the end of the line, where the server ID has to stay.
		assert.equal(launchOptions, false);
		assert.equal(template.id, "unturned");
		assert.equal(template.type, "unturned");
		assert.equal(template.displayName, "Unturned");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server tool anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "1110390");
		assert.equal(template.storeAppId, "304930");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, password, map, login token and Workshop items, and warns about long paths", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "mapCode", "gslt", "mods"]);
		assert.match(template.fieldMeta.sessionName.label, /5 to 50/);
		assert.match(template.fieldMeta.gslt.label, /304930/);
		assert.match(template.fieldMeta.mods.label, /Workshop/);
		assert.match(template.fieldMeta.mods.label, /path/i);
		assert.match(template.description, /260 characters/);
		assert.match(template.description, /OpenMod/);
	});

	it("offers the five maps the official docs name, starting with PEI", () => {
		assert.deepEqual(template.mapChoices.map((m) => m.code), ["PEI", "Washington", "Yukon", "Russia", "Germany"]);
		for (const m of template.mapChoices) assert.ok(m.label);
	});

	it("has one game port that does not clash with another game's default, and keeps the next port free", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const taken = [7015, 7017, 7777, 7780, 7870, 8766, 8888, 8890, 8892, 8894, 8900, 8902, 8910, 8915, 8920, 8922, 8923, 8930, 8933, 9876, 9878, 15637, 16261, 16270, 17777, 17779, 25565, 25575, 26000, 26002, 26003, 27015, 27016, 27017, 27025, 27115, 28015, 28017, 28018];
		const port = template.ports[0].default;
		for (const p of [port, port + 1]) assert.ok(!taken.includes(p), `${p} is another game's default`);
		assert.deepEqual(implicitPortsOf(template).map((i) => i.offset), [1]);
	});
});

describe("Unturned start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("starts Unturned.exe from the install folder with the two Unity arguments", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Unturned Server" Unturned\.exe -batchmode -nographics /);
	});

	it("ends the launch line with +InternetServer/<ID>, with nothing after it", () => {
		assert.match(launch, / \+InternetServer\/my-unturned-server$/);
		assert.equal(launch.trimEnd(), launch);
		assert.equal(launch.match(/\+InternetServer\//g).length, 1);
		// Every other argument comes before it.
		assert.equal(launch.indexOf("+InternetServer/"), launch.lastIndexOf(" +") + 1);
	});

	it("puts no password, name, token or port on the command line", () => {
		const text = template.buildStartScript(params({ gslt: "SECRETTOKEN" }));
		for (const secret of ["Pass1234", "Friends Camp", "SECRETTOKEN", "27315"]) assert.ok(!text.includes(secret), secret);
	});

	it("keeps characters cmd would act on out of the window title and the ID", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>', instanceSlug: 'evil" & calc' }));
		const line = bad.split("\r\n").find((l) => l.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(line);
		assert.ok(title, line);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		assert.match(line, / \+InternetServer\/evilcalc$/);
		assert.equal(bad.split("\r\n").filter((l) => l.includes("calc")).length, 1);
	});

	it("makes the server ID letters, digits, - and _, never empty and never Singleplayer", () => {
		assert.equal(serverId({ instanceSlug: "my-server" }), "my-server");
		assert.equal(serverId({ instanceSlug: "My Server!" }), "myserver");
		assert.equal(serverId({ instanceSlug: "" }), "server");
		assert.equal(serverId({}), "server");
		assert.equal(serverId({ instanceSlug: "singleplayer" }), "singleplayer-server");
	});
});

describe("Unturned direct launch", () => {
	it("is read back from the script the panel writes, so the no-window mode works", () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "gp-unturned-"));
		try {
			fs.writeFileSync(path.join(root, "Unturned.exe"), "");
			const scriptPath = path.join(root, "Start_Unturned.bat");
			fs.writeFileSync(scriptPath, template.buildStartScript(params()));
			const found = deriveLaunch(scriptPath, { workingDir: root });
			assert.equal(found.ok, true, found.reason);
			assert.equal(found.launch.cwd, root);
			assert.equal(path.basename(found.launch.exe), "Unturned.exe");
			assert.equal(found.launch.args, "-batchmode -nographics +InternetServer/my-unturned-server");
		} finally {
			fs.rmSync(root, { recursive: true, force: true });
		}
	});
});

describe("Unturned Commands.dat", () => {
	const build = (extra) => template.buildConfigFile(params(extra));

	it("goes in Servers\\<ID>\\Server, the folder named by the last word of the launch line", () => {
		assert.equal(build().relPath, "Servers\\my-unturned-server\\Server\\Commands.dat");
	});

	it("holds the name, map, player limit, port, difficulty and password", () => {
		const text = build().content;
		assert.equal(command(text, "Name"), "Friends Camp");
		assert.equal(command(text, "Map"), "PEI");
		assert.equal(command(text, "MaxPlayers"), "8");
		assert.equal(command(text, "Port"), "27315");
		assert.equal(command(text, "Mode"), "Normal");
		assert.equal(command(text, "Password"), "Pass1234");
	});

	it("matches the port in the server entry", () => {
		const entry = template.buildServerEntry(params({ port: 27400 }));
		assert.equal(command(build({ port: 27400 }).content, "Port"), String(entry.port));
	});

	it("starts with a comment line and has one command per line", () => {
		const lines = build().content.split("\r\n").filter(Boolean);
		assert.match(lines[0], /^\/\//);
		for (const line of lines.slice(1)) assert.match(line, /^[A-Za-z_]+ \S/);
	});

	it("uses the chosen map and falls back to PEI", () => {
		assert.equal(command(build({ mapCode: "Washington" }).content, "Map"), "Washington");
		assert.equal(command(build({ mapCode: "" }).content, "Map"), "PEI");
	});

	it("leaves the password and the token out when there are none, and writes the token as the GSLT command when there is one", () => {
		const bare = build({ serverPassword: "" }).content;
		assert.equal(command(bare, "Password"), undefined);
		assert.equal(command(bare, "GSLT"), undefined);
		assert.equal(command(build({ gslt: "ABCDEF0123456789ABCDEF0123456789" }).content, "GSLT"), "ABCDEF0123456789ABCDEF0123456789");
	});

	it("sets the player limit from the form or to 8, and refuses nonsense", () => {
		assert.equal(command(build({ maxPlayers: 24 }).content, "MaxPlayers"), "24");
		assert.equal(command(build({ maxPlayers: 200 }).content, "MaxPlayers"), "200");
		assert.equal(command(build({ maxPlayers: 500 }).content, "MaxPlayers"), "8");
		assert.equal(command(build({ maxPlayers: 0 }).content, "MaxPlayers"), "8");
		assert.equal(command(build({ maxPlayers: "abc" }).content, "MaxPlayers"), "8");
	});

	it("keeps a name or password on one line, with no byte-order mark", () => {
		const text = build({ sessionName: "A\r\nB Camp", serverPassword: "p\nq" }).content;
		assert.equal(text.split("\r\n").filter((l) => l.startsWith("Name ")).length, 1);
		assert.equal(text.split("\r\n").filter((l) => l.startsWith("Password ")).length, 1);
		assert.notEqual(text.charCodeAt(0), 0xfeff);
	});
});

describe("Unturned Workshop items", () => {
	const files = (extra) => Object.fromEntries(template.buildExtraFiles(params(extra)).map((f) => [f.relPath, f.content]));
	const target = "Servers\\my-unturned-server\\WorkshopDownloadConfig.json";

	it("always writes the Workshop list next to Config.txt, empty when there are no items", () => {
		const f = files();
		assert.deepEqual(Object.keys(f), [target]);
		assert.deepEqual(JSON.parse(f[target]).File_IDs, []);
	});

	it("lists the items as numbers and keeps the game's own defaults for the other keys", () => {
		const cfg = JSON.parse(files({ modIds: ["1753134636", "1753131903"] })[target]);
		assert.deepEqual(cfg.File_IDs, [1753134636, 1753131903]);
		assert.deepEqual(Object.keys(cfg), [
			"File_IDs", "Ignore_Children_File_IDs", "Query_Cache_Max_Age_Seconds", "Max_Query_Retries", "Use_Cached_Downloads",
			"Should_Monitor_Updates", "Shutdown_Update_Detected_Timer", "Shutdown_Update_Detected_Message", "Shutdown_Kick_Message",
		]);
		assert.equal(cfg.Query_Cache_Max_Age_Seconds, 600);
		assert.equal(cfg.Max_Query_Retries, 2);
		assert.equal(cfg.Use_Cached_Downloads, true);
		assert.equal(cfg.Should_Monitor_Updates, true);
		assert.equal(cfg.Shutdown_Update_Detected_Timer, 600);
		assert.equal(cfg.Shutdown_Update_Detected_Message, "Workshop file update detected, shutdown in: {0}");
		assert.equal(workshopConfig(["1753134636"]), JSON.stringify(JSON.parse(workshopConfig(["1753134636"])), null, 2));
	});

	it("reads ids, links and mixed separators, once each", () => {
		assert.deepEqual(parseWorkshopIds(""), []);
		assert.deepEqual(parseWorkshopIds("1753134636, 1702240229;1753134636"), ["1753134636", "1702240229"]);
		assert.deepEqual(parseWorkshopIds("https://steamcommunity.com/sharedfiles/filedetails/?id=1753134636 2136497468"), ["1753134636", "2136497468"]);
	});

	it("refuses anything that is not a file id, so no text reaches the JSON", () => {
		assert.throws(() => parseWorkshopIds('123456"], "x'), /not a Steam Workshop file id/);
		assert.throws(() => parseWorkshopIds("my-map"), /not a Steam Workshop file id/);
		assert.throws(() => parseWorkshopIds("12"), /not a Steam Workshop file id/);
	});
});

describe("Unturned form values", () => {
	it("cleans the token, map, name and Workshop list before anything is downloaded", async () => {
		const out = await template.resolveParams({ name: "x", sessionName: "  My Server  ", gslt: " tok123 ", mapCode: "Yukon", mods: "1753134636,https://x/?id=2136497468" });
		assert.deepEqual(out, { sessionName: "My Server", mapCode: "Yukon", gslt: "tok123", mods: "1753134636,2136497468", modIds: ["1753134636", "2136497468"] });
	});

	it("takes the server's name when no session name is typed, and PEI when no map", async () => {
		const out = await template.resolveParams({ name: "Camp Fire" });
		assert.equal(out.sessionName, "Camp Fire");
		assert.equal(out.mapCode, "PEI");
		assert.deepEqual(out.modIds, []);
	});

	it("refuses a name outside the game's 5 to 50 characters", async () => {
		await assert.rejects(() => template.resolveParams({ name: "abcd" }), /5 to 50/);
		await assert.rejects(() => template.resolveParams({ name: "x".repeat(51) }), /5 to 50/);
		await assert.doesNotReject(() => template.resolveParams({ name: "abcde" }));
		await assert.doesNotReject(() => template.resolveParams({ name: "x".repeat(50) }));
	});

	it("refuses a bad map name, a bad token and a bad Workshop id", async () => {
		await assert.rejects(() => template.resolveParams({ name: "Camp Fire", mapCode: "PEI\\..\\x" }), /not a map name/);
		await assert.rejects(() => template.resolveParams({ name: "Camp Fire", gslt: "two words" }), /spaces or quotes/);
		await assert.rejects(() => template.resolveParams({ name: "Camp Fire", mods: "nope" }), /Workshop file id/);
	});

	it("accepts a token as pasted, trimmed", () => {
		assert.equal(cleanLoginToken("  abc \n"), "abc");
		assert.equal(cleanLoginToken(undefined), "");
		assert.throws(() => cleanLoginToken('"abc"'), /spaces or quotes/);
		assert.throws(() => cleanLoginToken("x".repeat(65)), /longer than a real one/);
	});
});

describe("Unturned server entry", () => {
	const entry = template.buildServerEntry(params());
	const commands = "C:\\Servers\\unturned\\Servers\\my-unturned-server\\Server\\Commands.dat";

	it("has the fields the panel needs", () => {
		assert.equal(entry.name, "My Unturned Server");
		assert.equal(entry.type, "unturned");
		assert.equal(entry.method, "process");
		assert.equal(entry.port, 27315);
		assert.equal(entry.startScriptPath, "C:\\Servers\\unturned\\Start_Unturned.bat");
		assert.equal(entry.workingDir, "C:\\Servers\\unturned");
		assert.equal(entry.installDir, "C:\\Servers\\unturned\\");
		assert.equal(entry.updateAppId, "1110390");
		assert.equal(entry.steamCmdPath, "C:\\steamcmd\\steamcmd.exe");
		assert.equal(entry.autoUpdate, false);
		assert.equal(entry.rconPort, undefined);
	});

	it("tracks the program that stays running", () => {
		assert.equal(entry.processName, "Unturned.exe");
	});

	it("points the Settings tab at Commands.dat and the Workshop list", () => {
		assert.equal(entry.configPath, commands);
		assert.deepEqual(entry.configPaths, {
			"Commands.dat": commands,
			"WorkshopDownloadConfig.json": "C:\\Servers\\unturned\\Servers\\my-unturned-server\\WorkshopDownloadConfig.json",
		});
	});

	it("uses the same server folder as the script and the files", () => {
		const script = template.buildStartScript(params());
		const id = /\+InternetServer\/(\S+)$/m.exec(script)[1];
		assert.ok(entry.configPath.includes(`\\Servers\\${id}\\Server\\Commands.dat`));
		assert.equal(template.buildConfigFile(params()).relPath, `Servers\\${id}\\Server\\Commands.dat`);
	});

	it("does not record the login token", () => {
		assert.ok(!JSON.stringify(template.buildServerEntry(params({ gslt: "SECRETTOKEN" }))).includes("SECRETTOKEN"));
	});
});

describe("Unturned warnings", () => {
	it("warns about a long folder path, and not about a short one", async () => {
		const short = await template.postWrite(params({ gslt: "tok" }));
		assert.deepEqual(short.warnings, []);
		const deep = "C:\\" + "very-long-folder-name\\".repeat(5) + "unturned";
		const out = await template.postWrite(params({ gslt: "tok", installDir: deep }));
		assert.equal(out.warnings.length, 1);
		assert.match(out.warnings[0], /260 characters/);
		assert.match(out.warnings[0], /Could not find a part of the path/);
	});

	it("says what a missing login token means", async () => {
		const out = await template.postWrite(params());
		assert.equal(out.warnings.length, 1);
		assert.match(out.warnings[0], /login token/);
		assert.match(out.warnings[0], /Server Code/);
	});
});

describe("Unturned backup and logs", () => {
	it("backs up the Servers folder, without the Workshop downloads", () => {
		assert.equal(backup.paths.length, 1);
		const [spec] = backup.paths;
		assert.equal(spec.base, "working");
		assert.equal(spec.rel, "Servers");
		assert.ok(spec.label);
		assert.deepEqual(spec.exclude, ["*/Workshop/Steam"]);
	});

	it("reads the install's Logs folder", () => {
		assert.deepEqual(logs.map((l) => [l.kind, l.base, l.rel]), [["dir", "working", "Logs"]]);
	});
});

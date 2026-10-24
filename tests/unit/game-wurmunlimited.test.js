import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { plainText, secretWord, worldName } from "../../src/server/data/games/wurmunlimited.js";

// Wurm Unlimited, from the research dossier (nothing was run on a real install): server app 402370, WurmServerLauncher.exe, the launch line
// carries the world, ports, name, player limit and passwords, no wurm.ini written by the panel, no graceful stop from the panel.

const { template: t, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Wurm Server",
	sessionName: "Our Wurm World",
	mapCode: "Creative",
	serverPassword: "",
	adminPassword: "",
	port: 3724,
	queryPort: 27020,
	maxPlayers: 20,
	installDir: "C:\\Servers\\wurm",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-wurm-server",
	startScriptFilename: "Start_WurmUnlimited.bat",
	...extra,
});
const startLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("Wurm Unlimited module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(t && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(t.id, "wurmunlimited");
		assert.equal(t.type, "wurmunlimited");
		assert.equal(t.displayName, "Wurm Unlimited");
		assert.equal(t.method, "process");
	});

	it("installs the dedicated server (402370) into the folder root, with no shared depot handling", () => {
		assert.equal(t.updateAppId, "402370");
		assert.equal(t.storeAppId, "366220");
		assert.equal(t.sharedInstall, false);
		assert.equal(t.installLayoutRoot, "");
		assert.ok(t.estimatedInstallBytes > 0);
	});

	it("asks for a name, passwords and a world, and every field has a label", () => {
		assert.deepEqual(t.fields, ["sessionName", "serverPassword", "adminPassword", "mapCode"]);
		assert.ok(t.fieldMeta.sessionName.label.length > 20);
		assert.ok(t.fieldMeta.adminPassword.label.length > 20);
		assert.deepEqual(t.mapChoices.map((m) => m.code), ["Creative", "Adventure"]);
	});

	it("says prominently that the panel cannot shut the server down cleanly", () => {
		assert.match(t.description, /CANNOT SHUT IT DOWN CLEANLY/);
		assert.match(t.description, /Shutdown server/);
	});

	it("does not use rcon, and watches the launcher process", () => {
		const entry = t.buildServerEntry(params());
		assert.equal(entry.method, "process");
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
		assert.equal(entry.processName, "WurmServerLauncher.exe");
		assert.equal(entry.windowMode, "minimized");
	});

	it("has the game port 3724 and a query port in the dossier's 27016-27030 range", () => {
		assert.deepEqual(t.ports.map((p) => p.key), ["port", "queryPort"]);
		assert.equal(t.ports[0].default, 3724);
		assert.equal(t.ports[1].default, 27020);
		assert.ok(t.ports[1].default >= 27016 && t.ports[1].default <= 27030);
		assert.equal(t.implicitPorts, undefined);
	});

	it("keeps its default ports clear of every other registered template", async () => {
		const { GAME_TEMPLATES } = await import("../../src/server/data/gameTemplates.js");
		const mine = new Set([3724, 27020]);
		for (const x of GAME_TEMPLATES.filter((g) => g.id !== "wurmunlimited")) {
			const reach = Math.max(1, ...(x.implicitPorts ?? []).map((i) => i.offset));
			for (const p of x.ports ?? []) {
				for (let n = p.default; n <= p.default + reach; n++) assert.ok(!mine.has(n), `${x.id} uses ${n} (${p.key})`);
			}
		}
	});
});

describe("Wurm Unlimited input checks", () => {
	it("accepts plain names and refuses quotes, cmd characters and non-ASCII letters", () => {
		assert.equal(plainText("My Server 2", "The server name", 64), "My Server 2");
		for (const bad of ['a"b', "100%", "x & y", "a|b", "a<b", "a^b", "a!b", "back\\slash", "caf\u00e9"]) {
			assert.throws(() => plainText(bad, "The server name", 64), /plain English/, bad);
		}
		assert.throws(() => plainText("x".repeat(65), "The server name", 64), /64 characters/);
	});

	it("accepts one-word passwords and refuses spaces and cmd characters", () => {
		assert.equal(secretWord("abc-123!x".replace("!", "_"), "The password"), "abc-123_x");
		assert.equal(secretWord("", "The password"), "");
		assert.throws(() => secretWord("two words", "The password"), /one word/);
		assert.throws(() => secretWord('a"b', "The password"), /one word/);
	});

	it("accepts only a plain world folder name", () => {
		assert.equal(worldName("Creative"), "Creative");
		assert.equal(worldName(""), "Creative");
		assert.equal(worldName("My_World-2"), "My_World-2");
		assert.throws(() => worldName("..\\x"), /world folder name/);
		assert.throws(() => worldName("a b"), /world folder name/);
	});

	it("resolves the form values, and defaults the server name to the server's name", async () => {
		const ok = await t.resolveParams({ sessionName: "Our Server", serverPassword: "pw", adminPassword: "adm", mapCode: "Adventure" });
		assert.deepEqual(ok, { sessionName: "Our Server", serverPassword: "pw", adminPassword: "adm", mapCode: "Adventure" });
		const named = await t.resolveParams({ name: "Fallback Name", sessionName: "", mapCode: "" });
		assert.equal(named.sessionName, "Fallback Name");
		assert.equal(named.mapCode, "Creative");
		await assert.rejects(t.resolveParams({ sessionName: 'a"b' }));
	});
});

describe("Wurm Unlimited start script", () => {
	const script = t.buildStartScript(params());
	const lines = script.split("\r\n");
	const start = startLine(script);

	it("is a CRLF .bat that changes to its own folder first", () => {
		assert.equal(t.buildStartScriptFilename(), "Start_WurmUnlimited.bat");
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});

	it("copies the shipped world template into place on the first start only", () => {
		assert.equal(lines[2], 'if not exist "%~dp0Creative\\wurm.ini" if exist "%~dp0dist\\Creative" xcopy "%~dp0dist\\Creative" "%~dp0Creative\\" /E /I /Q /Y >nul');
	});

	it("starts WurmServerLauncher.exe minimized, with a title that ends in -Wurm so the Launch options reader finds the line", () => {
		assert.ok(start, script);
		assert.match(start, /^start \/MIN "My Wurm Server -Wurm" WurmServerLauncher\.exe /);
	});

	it("gives the world, both ports, the player limit and the name on the launch line, in key=value form", () => {
		assert.ok(start.includes(" start=Creative "));
		assert.ok(start.includes(" externalport=3724 "));
		assert.ok(start.includes(" queryport=27020 "));
		assert.ok(start.includes(" maxplayers=20 "));
		assert.ok(start.includes(' servername="Our Wurm World"'));
		assert.ok(!/ (?:-|\+)\w/.test(start.replace(/"[^"]*"/g, "").replace(/^start \/MIN .*? WurmServerLauncher\.exe/, "")), start);
	});

	it("adds the passwords only when given, and never with a quote or cmd character", () => {
		const bare = startLine(t.buildStartScript(params()));
		assert.ok(!bare.includes("serverpassword="));
		assert.ok(!bare.includes("adminpwd="));
		const set = startLine(t.buildStartScript(params({ serverPassword: "join1", adminPassword: "admin2" })));
		assert.ok(set.endsWith(" serverpassword=join1 adminpwd=admin2"), set);
		const cleaned = startLine(t.buildStartScript(params({ serverPassword: 'a"b&c', adminPassword: "x y" })));
		assert.ok(cleaned.includes(" serverpassword=abc "), cleaned);
		assert.ok(cleaned.includes(" adminpwd=xy"), cleaned);
	});

	it("uses Creative when the world is not a plain name, and 25 players when none is given", () => {
		const s = startLine(t.buildStartScript(params({ mapCode: "..\\evil", maxPlayers: undefined })));
		assert.ok(s.includes(" start=Creative "), s);
		assert.ok(s.includes(" maxplayers=25 "), s);
		assert.ok(startLine(t.buildStartScript(params({ maxPlayers: 9999 }))).includes(" maxplayers=25 "));
	});

	it("never lets a character cmd acts on, or a stray quote, into the script", () => {
		for (const nasty of ['a" & calc & "b', "100%PATH%", "x | y > z", "a^b<c>d", "back\\slash", "caf\u00e9!"]) {
			const s = t.buildStartScript(params({ name: nasty, sessionName: nasty, serverPassword: nasty, adminPassword: nasty }));
			const line = startLine(s);
			assert.ok(!/[%&|<>^!]/.test(line.replace(/"[^"]*"/g, "")), line);
			assert.equal((line.match(/"/g) ?? []).length, 4, line); // title and the server name, each in a pair
		}
	});
});

describe("Wurm Unlimited server entry and extras", () => {
	const entry = t.buildServerEntry({ ...params(), startScriptFilename: "Start_WurmUnlimited.bat" });

	it("points the settings at wurm.ini in the world folder, and writes no config file", () => {
		assert.equal(entry.configPath, "C:\\Servers\\wurm\\Creative\\wurm.ini");
		assert.deepEqual(Object.keys(entry.configPaths), ["wurm.ini"]);
		assert.equal(t.buildConfigFile, undefined);
		assert.equal(t.buildExtraFiles, undefined);
	});

	it("names the launcher, the install folder and the ports the entry uses", () => {
		assert.equal(entry.workingDir, "C:\\Servers\\wurm");
		assert.equal(entry.startScriptPath, "C:\\Servers\\wurm\\Start_WurmUnlimited.bat");
		assert.equal(entry.port, 3724);
		assert.equal(entry.queryPort, 27020);
		assert.equal(entry.updateAppId, "402370");
	});

	it("warns about the clean stop, the world and the firewall, and about a missing admin password", async () => {
		const withAdmin = await t.postWrite(params({ adminPassword: "x" }));
		const text = withAdmin.warnings.join(" ");
		assert.match(text, /Shutdown server/);
		assert.match(text, /first start by copying the template/);
		assert.match(text, /TCP/);
		assert.ok(!withAdmin.warnings.some((w) => /admin password was set/.test(w)));
		const without = await t.postWrite(params({ adminPassword: "" }));
		assert.ok(without.warnings.some((w) => /No admin password was set/.test(w)));
	});

	it("backs up the two world folders and the player statistics log", () => {
		assert.deepEqual(backup.paths.map((p) => p.rel), ["Creative", "Adventure"]);
		assert.equal(logs.length, 1);
		assert.equal(logs[0].rel, "numplayers.log");
	});
});

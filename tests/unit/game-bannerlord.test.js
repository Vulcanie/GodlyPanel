import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { cleanToken, lineText } from "../../src/server/data/games/bannerlord.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Mount & Blade II: Bannerlord, from the research dossier (nothing was run on a real install of this game): server tool app 1863440
// (anonymous login), DedicatedCustomServer.Starter.exe in bin\Win64_Shipping_Server, one UDP game port, ds_config_server.txt in
// Modules\Native, a login token on the launch line when given, no clean stop, no mods.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Bannerlord Server",
	sessionName: "Friends Calradia",
	adminPassword: "admin42",
	authToken: "",
	port: 25910,
	installDir: "C:\\Servers\\bannerlord",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-bannerlord-server",
	startScriptFilename: "Start_Bannerlord.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));
const PROGRAM = "bin\\Win64_Shipping_Server\\DedicatedCustomServer.Starter.exe";
const CONFIG_REL = "Modules\\Native\\ds_config_server.txt";
const TOKEN = "AbC123_def-456+ghi/jkl=mno.pqr";

describe("Bannerlord module", () => {
	it("has the parts a game module needs, and no launch form", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, false);
		assert.equal(template.id, "bannerlord");
		assert.equal(template.type, "bannerlord");
		assert.equal(template.displayName, "Mount & Blade II: Bannerlord");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server tool (1863440) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "1863440");
		assert.equal(template.storeAppId, undefined);
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, an admin password and an optional token, and no mods", () => {
		assert.deepEqual(template.fields, ["sessionName", "adminPassword", "authToken"]);
		assert.ok(template.fieldMeta.authToken.label.includes("optional"));
		assert.equal(template.postWrite !== undefined, true);
	});

	it("has one game port in 25900-25989 that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const port = template.ports[0].default;
		assert.equal(port, 25910);
		assert.ok(port >= 25900 && port <= 25989);
		const mine = [port, ...implicitPortsOf(template).map((i) => port + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "bannerlord");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});
});

describe("Bannerlord start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts the Starter from the install folder, minimized", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.ok(launchLine(script).startsWith(`start /MIN "My Bannerlord Server" ${PROGRAM} `));
	});

	it("names the config file, the port and the log folder, with no token when none is given", () => {
		assert.equal(
			launchLine(script),
			`start /MIN "My Bannerlord Server" ${PROGRAM} /dedicatedcustomserverconfigfile ds_config_server.txt /port 25910 /LogOutputPath "C:\\Servers\\bannerlord\\logs"`,
		);
		assert.ok(!/dedicatedcustomserverauthtoken/.test(script));
	});

	it("puts the token on the line only when given", () => {
		const withToken = template.buildStartScript(params({ authToken: TOKEN }));
		assert.match(launchLine(withToken), new RegExp(` /dedicatedcustomserverauthtoken ${TOKEN.replace(/[.+/]/g, "\\$&")}$`));
		assert.ok(!/dedicatedcustomserverauthtoken/.test(script));
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params({ port: 25910 }));
		assert.equal(Number(/ \/port (\d+) /.exec(launchLine(script))[1]), entry.port);
		const custom = template.buildStartScript(params({ port: 25915 }));
		assert.match(custom, / \/port 25915 /);
	});

	it("falls back to the default port when the entry gives none", () => {
		assert.match(template.buildStartScript(params({ port: undefined })), / \/port 25910 /);
	});

	it("keeps the admin password and the name off the launch line", () => {
		const line = launchLine(template.buildStartScript(params({ adminPassword: "pw-secret", sessionName: "Friends Calradia" })));
		assert.ok(!line.includes("pw-secret") && !line.includes("Friends Calradia"));
	});

	it("leaves out the log folder when the install folder has a character cmd acts on", () => {
		const odd = template.buildStartScript(params({ installDir: "C:\\Servers\\a&b" }));
		assert.ok(!/LogOutputPath/.test(odd));
	});

	it("never lets a character cmd acts on into the script, whatever is typed", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%' }));
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		assert.ok(!/[%&|<>^]/.test(launchLine(hostile).replace(/^start \/MIN "[^"]*"/, "")));
	});

	it("refuses a token that is not plain text, before it reaches the script", async () => {
		assert.throws(() => template.buildStartScript(params({ authToken: "x & calc" })), /launch line/);
		await assert.rejects(template.resolveParams({ name: "x", authToken: "a b" }), /launch line/);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Bannerlord inputs", () => {
	it("refuses a name or password with a line break or control character", async () => {
		await assert.rejects(template.resolveParams({ sessionName: "a\nb" }), /cannot hold/);
		await assert.rejects(template.resolveParams({ sessionName: "ok", adminPassword: "x\ry" }), /cannot hold/);
		assert.throws(() => lineText("a\tb", "x"), /cannot hold/);
	});

	it("trims what it accepts and falls back to the name field", async () => {
		const out = await template.resolveParams({ name: "Fallback", sessionName: "  Friends  ", adminPassword: " pw ", authToken: " " + TOKEN + " " });
		assert.deepEqual(out, { sessionName: "Friends", adminPassword: "pw", authToken: TOKEN });
		const none = await template.resolveParams({ name: "Fallback", adminPassword: "" });
		assert.equal(none.sessionName, "Fallback");
		assert.equal(none.authToken, "");
	});

	it("accepts a token only in the characters the panel allows", () => {
		assert.equal(cleanToken("  "), "");
		assert.equal(cleanToken(TOKEN), TOKEN);
		for (const bad of ["-starts-with-dash", "a b", 'a"b', "a&b", "%x%", "a|b", "x".repeat(513)]) {
			assert.throws(() => cleanToken(bad), /launch line/, bad);
		}
	});
});

describe("Bannerlord config file", () => {
	const { relPath, content } = template.buildConfigFile(params());
	const lines = content.split("\r\n");

	it("is written in Modules\\Native, the folder the official page names", () => {
		assert.equal(relPath, CONFIG_REL);
	});

	it("holds the name, the game mode, the admin password and the start command, one per line", () => {
		assert.equal(lines[0], "ServerName Friends Calradia");
		assert.equal(lines[1], "GameType TeamDeathmatch");
		assert.equal(lines[2], "AdminPassword admin42");
		assert.equal(lines[3], "start_game_and_mission");
	});

	it("starts the mission as the last line, and leaves the password out when none is set", () => {
		const open = template.buildConfigFile(params({ adminPassword: "" })).content;
		assert.ok(!/AdminPassword/.test(open));
		assert.ok(open.trimEnd().endsWith("start_game_and_mission"));
	});

	it("uses CRLF line endings and ends with one", () => {
		assert.ok(content.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(content));
	});

	it("does not write the login token into the config", () => {
		assert.ok(!content.includes(TOKEN));
	});
});

describe("Bannerlord server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the Starter as the process to watch, in the install folder", () => {
		assert.equal(entry.processName, "DedicatedCustomServer.Starter.exe");
		assert.ok(entry.processName.endsWith(".exe"));
		assert.equal(entry.type, "bannerlord");
		assert.equal(entry.method, "process");
		assert.equal(entry.updateAppId, "1863440");
		assert.equal(entry.configPath, `C:\\Servers\\bannerlord\\${CONFIG_REL}`);
		assert.equal(entry.configPaths["ds_config_server.txt"], entry.configPath);
		assert.equal(entry.startScriptPath, "C:\\Servers\\bannerlord\\Start_Bannerlord.bat");
	});

	it("does not store the admin password or the token in the entry", () => {
		const secret = template.buildServerEntry(params({ adminPassword: "pw-secret", authToken: TOKEN }));
		const text = JSON.stringify(secret);
		assert.ok(!text.includes("pw-secret") && !text.includes(TOKEN));
	});

	it("has no RCON fields, since the panel stops the window instead", () => {
		assert.equal(entry.rconPort, undefined);
		assert.equal(entry.rconPassword, undefined);
	});
});

describe("Bannerlord backup, logs and warnings", () => {
	it("backs up the Modules\\Native folder and reads the server's log folder", () => {
		assert.deepEqual(backup.paths, [{ base: "working", rel: "Modules\\Native", label: "Server settings (the config file in Modules\\Native)" }]);
		assert.deepEqual(logs, [{ kind: "dir", base: "working", rel: "logs", label: "Server log" }]);
	});

	it("warns about the clean stop, the map and the missing token", async () => {
		const bare = await template.postWrite(params({ authToken: "" }));
		const text = bare.warnings.join("\n");
		assert.match(text, /cannot be stopped cleanly/);
		assert.match(text, /registers no map/);
		assert.match(text, /not listed publicly/);
		const withToken = await template.postWrite(params({ authToken: TOKEN }));
		assert.ok(!withToken.warnings.join("\n").includes("not listed publicly"));
	});
});

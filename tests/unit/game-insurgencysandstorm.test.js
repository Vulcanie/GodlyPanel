import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game, { joinPassword, loginToken, plainText } from "../../src/server/data/games/insurgencysandstorm.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Insurgency: Sandstorm: server app 581330 (anonymous login), InsurgencyServer.exe (the dossier's Windows name), Game.ini under
// Insurgency\Saved\Config\WindowsServer, Admins.txt under Insurgency\Config\Server, the settings on the launch line, no mods, no
// graceful stop from the panel.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Insurgency Server",
	sessionName: "Friends Sandstorm",
	serverPassword: "",
	gslt: "",
	port: 25940,
	queryPort: 25942,
	installDir: "C:\\Servers\\insurgency",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-insurgency-server",
	startScriptFilename: "Start_Insurgency.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));
const GAME_INI_REL = "Insurgency\\Saved\\Config\\WindowsServer\\Game.ini";
const ADMINS_REL = "Insurgency\\Config\\Server\\Admins.txt";
const MAP = "Oilfield?Scenario=Scenario_Refinery_Push_Security";

describe("Insurgency: Sandstorm module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, true);
		assert.equal(template.id, "insurgencysandstorm");
		assert.equal(template.type, "insurgencysandstorm");
		assert.equal(template.displayName, "Insurgency: Sandstorm");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server (581330) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "581330");
		assert.equal(template.storeAppId, undefined);
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name, a join password and an optional login token", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword", "gslt"]);
	});

	it("keeps its ports in the 25900-25989 range and clear of every other template", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const defaults = Object.fromEntries(template.ports.map((p) => [p.key, p.default]));
		for (const p of template.ports) assert.ok(p.default >= 25900 && p.default <= 25989, `${p.key} ${p.default}`);
		const mine = [defaults.port, defaults.queryPort, ...implicitPortsOf(template).map((i) => defaults.port + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "insurgencysandstorm");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});

	it("keeps the query port out of the game port's companion port", () => {
		const { port, queryPort } = Object.fromEntries(template.ports.map((p) => [p.key, p.default]));
		for (const i of implicitPortsOf(template)) assert.notEqual(port + i.offset, queryPort);
	});
});

describe("Insurgency: Sandstorm start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts the binary minimized", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My Insurgency Server" InsurgencyServer\.exe /);
	});

	it("writes the map and scenario, the player limit, and the ports, in the order the dossier gives", () => {
		assert.equal(
			launchLine(script),
			`start /MIN "My Insurgency Server" InsurgencyServer.exe ${MAP}?MaxPlayers=28 -Port=25940 -QueryPort=25942 -log -hostname="Friends Sandstorm"`,
		);
	});

	it("adds the join password to the map address, and the login token last, when given", () => {
		const withAll = template.buildStartScript(params({ serverPassword: "pw-1", gslt: "TOKEN_abc-9" }));
		assert.equal(
			launchLine(withAll),
			`start /MIN "My Insurgency Server" InsurgencyServer.exe ${MAP}?MaxPlayers=28?Password=pw-1 -Port=25940 -QueryPort=25942 -log -hostname="Friends Sandstorm" -GSLTToken=TOKEN_abc-9`,
		);
	});

	it("leaves out the login token and the password when none is given", () => {
		assert.ok(!launchLine(script).includes("GSLTToken"));
		assert.ok(!launchLine(script).includes("Password="));
	});

	it("falls back to the default ports when the entry gives none", () => {
		const bare = template.buildStartScript(params({ port: undefined, queryPort: undefined }));
		assert.match(launchLine(bare), /-Port=25940 -QueryPort=25942 -log/);
	});

	it("uses the panel's name when no server name was typed, with the unsafe characters removed", () => {
		const line = launchLine(template.buildStartScript(params({ sessionName: "", name: 'a" & calc & "%PATH%' })));
		assert.ok(line.includes('-hostname="a calc PATH"'), line);
	});

	it("never lets a character cmd acts on into the start line through the name or the title", () => {
		const hostile = template.buildStartScript(params({ name: 'x" & del & "%PATH%', sessionName: "" }));
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
		const rest = launchLine(hostile).replace(/^start \/MIN "[^"]*"/, "").replace(/-hostname="[^"]*"/, "");
		assert.ok(!/[%&|<>^!"]/.test(rest), rest);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Insurgency: Sandstorm config and extra files", () => {
	it("writes Game.ini under the folder the dossier gives, as a comment only (the settings tab adds the rest)", () => {
		const { relPath, content } = template.buildConfigFile(params());
		assert.equal(relPath, GAME_INI_REL);
		assert.ok(content.startsWith(";"));
		assert.ok(!content.includes("["), "no section is written before the user sets a value");
		assert.ok(!content.includes("Friends Sandstorm") && !content.includes("pw"));
	});

	it("creates an empty Admins.txt in the server config folder, which the dossier says must exist", () => {
		assert.deepEqual(template.buildExtraFiles(params()), [{ relPath: ADMINS_REL, content: "" }]);
	});

	it("names the same Game.ini in the entry as the config it writes", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(entry.configPath, `C:\\Servers\\insurgency\\${GAME_INI_REL}`);
		assert.equal(entry.configPaths["Game.ini"], entry.configPath);
	});
});

describe("Insurgency: Sandstorm inputs", () => {
	it("refuses a name with a quote, a percent sign or a line break", async () => {
		await assert.rejects(template.resolveParams({ sessionName: 'a"b' }), /cannot hold/);
		await assert.rejects(template.resolveParams({ sessionName: "100%" }), /cannot hold/);
		await assert.rejects(template.resolveParams({ sessionName: "a\nb" }), /cannot hold/);
		assert.throws(() => plainText("a&b", "x"), /cannot hold/);
	});

	it("refuses a password the map address cannot hold, and accepts plain ones", () => {
		assert.equal(joinPassword(""), "");
		assert.equal(joinPassword(" pw-1.x@ "), "pw-1.x@");
		for (const bad of ["a b", "a?b", "a=b", "a&b", 'a"b', "a%b"]) assert.throws(() => joinPassword(bad), /can use only/, bad);
		assert.throws(() => joinPassword("p".repeat(65)), /can use only/);
	});

	it("refuses a login token with spaces or odd characters, and accepts an empty one", () => {
		assert.equal(loginToken(""), "");
		assert.equal(loginToken(" ABC_123-x "), "ABC_123-x");
		for (const bad of ["a b", "a;b", 'a"b', "x".repeat(65)]) assert.throws(() => loginToken(bad), /token/, bad);
	});

	it("trims and returns the cleaned values from resolveParams", async () => {
		const out = await template.resolveParams({ name: "Fallback", sessionName: "  Friends  ", serverPassword: " pw1 ", gslt: " TOK " });
		assert.deepEqual(out, { sessionName: "Friends", serverPassword: "pw1", gslt: "TOK" });
		const fallback = await template.resolveParams({ name: "Fallback", sessionName: "" });
		assert.equal(fallback.sessionName, "Fallback");
	});
});

describe("Insurgency: Sandstorm backup, logs and warnings", () => {
	it("backs up the settings and admin list folders", () => {
		assert.deepEqual(backup.paths.map((p) => [p.base, p.rel]), [
			["working", "Insurgency\\Saved\\Config\\WindowsServer"],
			["working", "Insurgency\\Config\\Server"],
		]);
	});

	it("lists no log, because the dossier does not name the Windows log folder", () => {
		assert.deepEqual(logs, []);
	});

	it("warns that the server cannot be stopped cleanly", async () => {
		const { warnings } = await template.postWrite(params());
		assert.ok(warnings.some((w) => /Ctrl\+C/.test(w)));
	});

	it("warns about a missing login token only when none was given, and never repeats a password", async () => {
		const without = await template.postWrite(params({ gslt: "" }));
		assert.ok(without.warnings.some((w) => /login token/.test(w)));
		const withToken = await template.postWrite(params({ gslt: "TOK" }));
		assert.ok(!withToken.warnings.some((w) => /login token/.test(w)));
		const pw = await template.postWrite(params({ serverPassword: "secret-pw" }));
		assert.ok(!JSON.stringify(pw).includes("secret-pw"));
	});
});

describe("Insurgency: Sandstorm server entry", () => {
	const entry = template.buildServerEntry(params());

	it("watches InsurgencyServer.exe and keeps the window minimized so ^C can be sent by hand", () => {
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "InsurgencyServer.exe");
		assert.equal(entry.windowMode, "minimized");
		assert.equal(entry.autoUpdate, false);
	});

	it("carries the ports the script uses and the install app id", () => {
		assert.equal(entry.port, 25940);
		assert.equal(entry.queryPort, 25942);
		assert.equal(entry.updateAppId, "581330");
		assert.equal(entry.startScriptPath, "C:\\Servers\\insurgency\\Start_Insurgency.bat");
	});

	it("keeps the ports in the script and in the entry the same", () => {
		const line = launchLine(template.buildStartScript(params()));
		assert.ok(line.includes(`-Port=${entry.port} -QueryPort=${entry.queryPort}`));
	});
});

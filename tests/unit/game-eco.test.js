import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/eco.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Eco, from the research dossier (nothing was run on a real install): server tool app 739590 (anonymous login), EcoServer.exe, one UDP
// game port, and a web port (TCP) that the server takes two above it. Both are written to Configs\Network.eco, which is the only place
// the ports are set. The file is written by the panel because the dossier's install does not contain it.

const { template, backup, logs, launchOptions } = game;
const PORT = 25980;
const WEB = PORT + 2;
const params = (extra = {}) => ({
	name: "My Eco Server",
	sessionName: "Friends World",
	serverPassword: "secret1",
	port: PORT,
	installDir: "C:\\Servers\\eco",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-eco-server",
	startScriptFilename: "Start_Eco.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));
const networkFile = (p) => JSON.parse(template.buildConfigFile(p).content);

describe("Eco module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, false);
		assert.equal(template.id, "eco");
		assert.equal(template.type, "eco");
		assert.equal(template.displayName, "Eco");
		assert.equal(template.method, "process");
	});

	it("installs the server tool (739590) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "739590");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a name and a password", () => {
		assert.deepEqual(template.fields, ["sessionName", "serverPassword"]);
	});

	it("has one game port, with the web port two above it and the next port up kept free", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, PORT);
		assert.ok(PORT >= 25900 && PORT <= 25989);
		assert.deepEqual(implicitPortsOf(template).map((i) => i.offset), [1, 2]);
	});

	it("keeps its game, web and companion ports clear of every other template and its held ports", () => {
		const mine = [PORT, PORT + 1, WEB];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "eco");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});
});

describe("Eco start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts EcoServer.exe from there, with no arguments", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.equal(launchLine(script), 'start /MIN "My Eco Server" EcoServer.exe');
	});

	it("never lets a character cmd acts on into the script, whatever is typed as the name", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%' }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" EcoServer\.exe$/);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("Eco server entry and Network.eco", () => {
	it("watches EcoServer.exe, the program that stays running", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(entry.processName, "EcoServer.exe");
		assert.equal(entry.port, PORT);
		assert.equal(entry.startScriptPath, "C:\\Servers\\eco\\Start_Eco.bat");
	});

	it("writes the ports and the name and password into Configs\\Network.eco", () => {
		const built = template.buildConfigFile(params());
		assert.equal(built.relPath, "Configs\\Network.eco");
		const network = networkFile(params());
		assert.equal(network.GameServerPort, PORT);
		assert.equal(network.WebServerPort, WEB);
		assert.equal(network.Name, "Friends World");
		assert.equal(network.Password, "secret1");
		assert.equal(network.PublicServer, false);
	});

	it("falls back to the panel's name when no server name is typed, and leaves the password empty when none is set", () => {
		const network = networkFile(params({ sessionName: "", serverPassword: "" }));
		assert.equal(network.Name, "My Eco Server");
		assert.equal(network.Password, "");
	});

	it("writes names and passwords as JSON strings, so a quote or a backslash cannot break the file", () => {
		const network = networkFile(params({ sessionName: 'Say "hi" \\ there', serverPassword: 'p"w' }));
		assert.equal(network.Name, 'Say "hi" \\ there');
		assert.equal(network.Password, 'p"w');
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/risingworld.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Rising World (the Unity server), checked on a real install (docs/research/games/risingworld/06-verification.md). Nothing here runs the server.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Rising World",
	sessionName: "Friends World Server",
	port: 4255,
	installDir: "C:\\Servers\\rw",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-rw",
	startScriptFilename: "Start_RisingWorld.bat",
	...extra,
});

describe("Rising World module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "risingworld");
		assert.equal(template.type, "risingworld");
		assert.equal(template.displayName, "Rising World");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "339010");
		assert.equal(template.storeAppId, "324080");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name only: no join password (not evidenced), no mods field", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
		assert.ok(!template.fields.includes("serverPassword"));
		assert.ok(!template.fields.includes("mods"));
	});

	it("has one game port that no other template uses, with the port after it held by the panel's usual rule", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const port = template.ports[0].default;
		assert.equal(port, 4255);
		const held = implicitPortsOf(template).map((i) => i.offset);
		assert.ok(held.includes(1));
		for (const other of GAME_TEMPLATES) {
			if (other.id === template.id) continue;
			for (const p of other.ports ?? []) {
				for (const o of [-1, 0, 1]) assert.notEqual(p.default, port + o, `${other.id} uses ${port + o}`);
			}
		}
	});
});

describe("Rising World start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts RisingWorldServer.exe as a windowless Unity program", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		const launch = lines.find((l) => l.startsWith("start "));
		assert.match(launch, /^start \/MIN "My Rising World" RisingWorldServer\.exe -batchmode -nographics$/);
	});

	it("does not pass the old Java server's +serverport: this build ignores it", () => {
		assert.ok(!script.includes("+serverport"));
		assert.ok(!script.includes("java"));
	});

	it("keeps the server name off the command line", () => {
		assert.ok(!script.includes("Friends World Server"));
	});

	it("strips characters cmd would act on from the window title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>' }));
		const launch = bad.split("\r\n").find((l) => l.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(launch);
		assert.ok(title, launch);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});
});

describe("Rising World server.properties as the panel writes it", () => {
	const { relPath, content } = template.buildConfigFile(params());

	it("is written at the server root with the name and the port", () => {
		assert.equal(relPath, "server.properties");
		assert.match(content, /^Server_Name=Friends World Server\r\n/);
		assert.match(content, /\r\nServer_Port=4255\r\n$/);
	});

	it("refuses a name with a backslash or a line break, since .properties reads both", () => {
		assert.throws(() => template.buildConfigFile(params({ sessionName: "a\\b" })));
		assert.throws(() => template.buildConfigFile(params({ sessionName: "a\nServer_Port=1" })));
	});
});

describe("Rising World server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program and the settings file the panel tracks", () => {
		assert.equal(entry.type, "risingworld");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "RisingWorldServer.exe");
		assert.equal(entry.port, 4255);
		assert.equal(entry.configPath, "C:\\Servers\\rw\\server.properties");
		assert.deepEqual(Object.keys(entry.configPaths), ["server.properties"]);
	});
});

describe("Rising World backup and logs", () => {
	it("keeps the settings, the worlds, the plugins and the player lists", () => {
		const rels = backup.paths.map((p) => p.rel);
		for (const r of ["server.properties", "Worlds", "Plugins", "whitelist", "blacklist"]) assert.ok(rels.includes(r), r);
		for (const p of backup.paths) assert.equal(p.base, "working");
	});

	it("reads the Logs folder", () => {
		assert.deepEqual(logs, [{ kind: "dir", base: "working", rel: "Logs", label: "Server log" }]);
	});
});

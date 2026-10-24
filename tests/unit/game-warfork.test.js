import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/warfork.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Warfork, checked on a real Windows install (docs/research/games/warfork/06-verification.md). Nothing here runs the server.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Warfork",
	sessionName: "Friends Arena",
	port: 44400,
	installDir: "C:\\Servers\\wf",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-wf",
	startScriptFilename: "Start_Warfork.bat",
	...extra,
});

describe("Warfork module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "warfork");
		assert.equal(template.type, "warfork");
		assert.equal(template.displayName, "Warfork");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app into the folder root, with the store app id from the dossier", () => {
		assert.equal(template.updateAppId, "1136510");
		assert.equal(template.storeAppId, "671610");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name only: no password (not evidenced), no mods field", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
		assert.ok(!template.fields.includes("serverPassword"));
		assert.ok(!template.fields.includes("mods"));
	});

	it("has one game port that no other template uses, next to it or on it", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const port = template.ports[0].default;
		assert.equal(port, 44400);
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

describe("Warfork start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts wf_server_x64.exe", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Warfork" wf_server_x64\.exe /);
	});

	it("passes the name and the ports as +set arguments, the download port one above the game port, and keeps files in the install", () => {
		assert.ok(launch.includes('+set sv_hostname "Friends Arena"'));
		assert.ok(launch.includes("+set sv_port 44400"));
		assert.ok(launch.includes("+set sv_port6 44400"));
		assert.ok(launch.includes("+set sv_http_port 44401"));
		assert.ok(launch.includes("+set fs_usehomedir 0"));
	});

	it("moves with the port the server is given", () => {
		const other = template.buildStartScript(params({ port: 8081 })).split("\r\n").find((l) => l.startsWith("start "));
		assert.ok(other.includes("+set sv_port 8081") && other.includes("+set sv_http_port 8082"));
	});

	it("falls back to the server's own name when no session name is given", () => {
		const bare = template.buildStartScript(params({ sessionName: "" })).split("\r\n").find((l) => l.startsWith("start "));
		assert.ok(bare.includes('+set sv_hostname "My Warfork"'));
	});

	it("refuses a name with a quote, a semicolon, a backslash or a line break, since the game reads it as console text", () => {
		for (const bad of ['a"b', "a;quit", "a\\b", "a\nset x 1"]) {
			assert.throws(() => template.buildStartScript(params({ sessionName: bad })), undefined, bad);
		}
	});

	it("strips characters cmd would act on from the window title", () => {
		const bad = template.buildStartScript(params({ name: 'Evil" & calc | %PATH% ^ <x>' }));
		const line = bad.split("\r\n").find((l) => l.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(line);
		assert.ok(title, line);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});

	it("writes no settings file: the game does not read basewf/server.cfg", () => {
		assert.equal(template.buildConfigFile, undefined);
	});
});

describe("Warfork server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program and the shipped settings file the panel tracks", () => {
		assert.equal(entry.type, "warfork");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "wf_server_x64.exe");
		assert.equal(entry.port, 44400);
		assert.equal(entry.configPath, "C:\\Servers\\wf\\basewf\\dedicated_autoexec.cfg");
		assert.deepEqual(Object.keys(entry.configPaths), ["basewf\\dedicated_autoexec.cfg"]);
	});
});

describe("Warfork backup and logs", () => {
	it("keeps the settings file and the gametype configs, all under the working folder", () => {
		const rels = backup.paths.map((p) => p.rel);
		assert.ok(rels.includes("basewf/dedicated_autoexec.cfg"));
		assert.ok(rels.includes("basewf/configs"));
		for (const p of backup.paths) assert.equal(p.base, "working");
	});

	it("reads the console log file in basewf", () => {
		assert.deepEqual(logs, [{ kind: "file", base: "working", rel: "basewf/wfconsole.log", label: "Server log" }]);
	});
});

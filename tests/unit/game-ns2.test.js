import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/ns2.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// Natural Selection 2 dedicated server (Server.exe). Built from docs/research/games/ns2/ (status: researched-unverified). Nothing here runs the server.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My NS2 Server",
	sessionName: "Friends NS2",
	port: 27040,
	installDir: "C:\\Servers\\ns2",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-ns2",
	startScriptFilename: "Start_NS2.bat",
	...extra,
});

describe("Natural Selection 2 module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, true);
		assert.equal(template.id, "ns2");
		assert.equal(template.type, "ns2");
		assert.equal(template.displayName, "Natural Selection 2");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (4940, resolved in the dossier) into the folder root", () => {
		assert.equal(template.updateAppId, "4940");
		assert.equal(template.storeAppId, "4920");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name only: no join password (no flag is documented), no mods field", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
		assert.ok(!template.fields.includes("serverPassword"));
		assert.ok(!template.fields.includes("mods"));
	});

	it("has one game port that no other template uses or holds next to", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		const port = template.ports[0].default;
		assert.equal(port, 27040);
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

describe("Natural Selection 2 start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts x64\\Server.exe with the required arguments", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My NS2 Server" x64\\Server\.exe /);
		assert.match(launch, / -name "Friends NS2"/);
		assert.match(launch, / -map ns2_summit/);
		assert.match(launch, / -limit 20/);
	});

	it("passes the panel's port and points the config and log folders into the server's folder", () => {
		assert.match(launch, / -port 27040/);
		assert.match(launch, / -config_path "%~dp0config" -logdir "%~dp0serverlogs"$/);
	});

	it("does not pass the -ip flag, which the forum says is optional", () => {
		assert.ok(!launch.includes("-ip"));
	});

	it("strips characters cmd would act on from the name and the window title", () => {
		const bad = template.buildStartScript(params({ sessionName: 'Evil" & calc | %PATH% ^ <x>', name: 'Evil" & calc | %PATH% ^ <x>' }));
		const line = bad.split("\r\n").find((l) => l.startsWith("start "));
		const title = /^start \/MIN "([^"]*)" /.exec(line);
		assert.ok(title, line);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
		const name = /-name "([^"]*)"/.exec(line);
		assert.ok(name, line);
		assert.doesNotMatch(name[1], /["&|%^<>]/);
	});

	it("uses the entry's port in the script", () => {
		const other = template.buildStartScript(params({ port: 27050 }));
		assert.match(other, / -port 27050 /);
	});
});

describe("Natural Selection 2 name handling", () => {
	it("refuses a name with a line break", async () => {
		await assert.rejects(template.resolveParams({ sessionName: "a\nb" }));
	});

	it("keeps a plain name as it was typed", async () => {
		const out = await template.resolveParams({ sessionName: "Friends NS2" });
		assert.equal(out.sessionName, "Friends NS2");
	});
});

describe("Natural Selection 2 server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program and the config files the panel tracks", () => {
		assert.equal(entry.type, "ns2");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "Server.exe");
		assert.equal(entry.port, 27040);
		assert.equal(entry.updateAppId, "4940");
		assert.equal(entry.configPath, "C:\\Servers\\ns2\\config\\serverconfig.json");
		assert.deepEqual(Object.keys(entry.configPaths).sort(), ["mapcycle.json", "serveradmin.json", "serverconfig.json"]);
		assert.equal(entry.configPaths["mapcycle.json"], "C:\\Servers\\ns2\\config\\mapcycle.json");
	});
});

describe("Natural Selection 2 backup and logs", () => {
	it("keeps the config folder", () => {
		const rels = backup.paths.map((p) => p.rel);
		assert.deepEqual(rels, ["config"]);
		for (const p of backup.paths) assert.equal(p.base, "working");
	});

	it("reads the log the start script's -logdir puts in the install", () => {
		assert.deepEqual(logs, [{ kind: "file", base: "working", rel: "serverlogs/log-Server.txt", label: "Server log" }]);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/hurtworld.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";

// Hurtworld (dossier: docs/research/games/hurtworld/, confidence low). Nothing here runs the server or SteamCMD.

const { template, backup, logs, launchOptions } = game;
const params = (extra = {}) => ({
	name: "My Hurtworld",
	sessionName: "Friends Server",
	port: 12871,
	queryPort: 12881,
	installDir: "C:\\Servers\\hw",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-hw",
	startScriptFilename: "Start_Hurtworld.bat",
	...extra,
});

describe("Hurtworld module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && Array.isArray(logs));
		assert.equal(launchOptions, false);
		assert.equal(template.id, "hurtworld");
		assert.equal(template.type, "hurtworld");
		assert.equal(template.displayName, "Hurtworld");
		assert.equal(template.method, "process");
	});

	it("installs the dedicated server app (405100) into the folder root", () => {
		assert.equal(template.updateAppId, "405100");
		assert.equal(template.storeAppId, "393420");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for a server name only: no password field is evidenced, no mods field", () => {
		assert.deepEqual(template.fields, ["sessionName"]);
		assert.ok(!template.fields.includes("serverPassword"));
		assert.ok(!template.fields.includes("mods"));
	});

	it("has a game port 12871 and a query port 12881, and no other template uses them or a neighbour", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port", "queryPort"]);
		const [game, query] = template.ports.map((p) => p.default);
		assert.equal(game, 12871);
		assert.equal(query, 12881);
		for (const other of GAME_TEMPLATES) {
			if (other.id === template.id) continue;
			for (const p of other.ports ?? []) {
				for (const base of [game, query]) {
					for (let o = -2; o <= 2; o++) assert.notEqual(p.default, base + o, `${other.id} uses ${base + o}`);
				}
			}
		}
	});
});

describe("Hurtworld start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");
	const launch = lines.find((l) => l.startsWith("start "));

	it("changes to its own folder and starts Hurtworld.exe with the headless flags", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launch, /^start \/MIN "My Hurtworld" Hurtworld\.exe -batchmode -nographics /);
	});

	it("passes the host port, query port and server name through -exec, separated by semicolons", () => {
		assert.match(launch, /-exec "host 12871;queryport 12881;servername Friends Server"/);
	});

	it("writes a log file in the server folder, the one the Logs tab reads", () => {
		assert.match(launch, /-logfile "gamelog\.txt"$/);
	});

	it("keeps the ports in the script equal to the entry's ports", () => {
		const entry = template.buildServerEntry(params());
		assert.match(launch, new RegExp(`host ${entry.port};queryport ${entry.queryPort};`));
	});

	it("never lets a quote, percent, ampersand or semicolon from the name into the script", () => {
		const bad = template.buildStartScript(params({ sessionName: 'Evil" & calc;x | %PATH% ^ <y>' }));
		const l = bad.split("\r\n").find((x) => x.startsWith("start "));
		const exec = /-exec "([^"]*)"/.exec(l);
		assert.ok(exec, l);
		const [host, queryport, servername] = exec[1].split(";");
		assert.equal(host, "host 12871");
		assert.equal(queryport, "queryport 12881");
		assert.equal(servername, "servername Evil calcx PATH y");
		assert.equal(exec[1].split(";").length, 3, "only the two separators of -exec");
		const title = /^start \/MIN "([^"]*)" /.exec(l);
		assert.ok(title, l);
		assert.doesNotMatch(title[1], /["&|%^<>]/);
	});

	it("falls back to the panel's name when no server name was typed", () => {
		const s = template.buildStartScript(params({ sessionName: "", name: "Panel Name" }));
		assert.match(s, /servername Panel Name"/);
	});
});

describe("Hurtworld config file", () => {
	it("is not written by the panel: no file location is evidenced, the settings go through -exec", () => {
		assert.equal(template.buildConfigFile, undefined);
	});
});

describe("Hurtworld server entry", () => {
	const entry = template.buildServerEntry(params());

	it("names the server program the panel watches and records both ports", () => {
		assert.equal(entry.type, "hurtworld");
		assert.equal(entry.method, "process");
		assert.equal(entry.processName, "Hurtworld.exe");
		assert.equal(entry.port, 12871);
		assert.equal(entry.queryPort, 12881);
		assert.equal(entry.updateAppId, "405100");
		assert.equal(entry.autoUpdate, false);
	});
});

describe("Hurtworld backup and logs", () => {
	it("keeps nothing in the backup, because no save or config folder is evidenced", () => {
		assert.deepEqual(backup, { paths: [] });
	});

	it("reads the log file the start script writes", () => {
		assert.deepEqual(logs, [{ kind: "file", base: "working", rel: "gamelog.txt", label: "Server log" }]);
	});
});

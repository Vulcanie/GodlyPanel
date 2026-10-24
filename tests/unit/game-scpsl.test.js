import { describe, it } from "node:test";
import assert from "node:assert/strict";
import game from "../../src/server/data/games/scpsl.js";
import { GAME_TEMPLATES } from "../../src/server/data/gameTemplates.js";
import { implicitPortsOf } from "../../src/server/data/portRules.js";

// SCP: Secret Laboratory, from the research dossier (nothing was run on a real install): server tool app 996560 (anonymous login),
// started through LocalAdmin.exe with the game port as its first argument, one game port, no config written by the panel.

const { template, backup, logs, launchOptions } = game;
const PORT = 25977;
const params = (extra = {}) => ({
	name: "My SCP Server",
	sessionName: "",
	port: PORT,
	installDir: "C:\\Servers\\scpsl",
	steamCmdExe: "C:\\steamcmd\\steamcmd.exe",
	instanceSlug: "my-scp-server",
	startScriptFilename: "Start_SCPSL.bat",
	...extra,
});
const launchLine = (script) => script.split("\r\n").find((l) => l.startsWith("start "));

describe("SCP: Secret Laboratory module", () => {
	it("has the four parts a game module needs", () => {
		assert.ok(template && backup && logs);
		assert.equal(launchOptions, false);
		assert.equal(template.id, "scpsl");
		assert.equal(template.type, "scpsl");
		assert.equal(template.displayName, "SCP: Secret Laboratory");
		assert.equal(template.method, "process");
	});

	it("installs the server tool (996560) anonymously into the folder root", () => {
		assert.equal(template.updateAppId, "996560");
		assert.equal(template.sharedInstall, false);
		assert.equal(template.installLayoutRoot, "");
	});

	it("asks for nothing in the create form, since the name and password live in a file the panel does not write", () => {
		assert.deepEqual(template.fields, []);
	});

	it("has one game port that no other template uses, nor any port beside theirs", () => {
		assert.deepEqual(template.ports.map((p) => p.key), ["port"]);
		assert.equal(template.ports[0].default, PORT);
		assert.ok(PORT >= 25900 && PORT <= 25989);
		const mine = [PORT, ...implicitPortsOf(template).map((i) => PORT + i.offset)];
		const others = GAME_TEMPLATES.filter((t) => t.id !== "scpsl");
		assert.ok(others.length > 10);
		for (const t of others) {
			const theirs = new Set(t.ports.map((p) => p.default));
			for (const i of implicitPortsOf(t)) for (const p of t.ports) theirs.add(p.default + i.offset);
			for (const m of mine) assert.ok(!theirs.has(m), `${m} clashes with ${t.id}`);
		}
	});
});

describe("SCP: Secret Laboratory start script", () => {
	const script = template.buildStartScript(params());
	const lines = script.split("\r\n");

	it("changes to its own folder and starts LocalAdmin.exe from there", () => {
		assert.equal(lines[0], "@echo off");
		assert.equal(lines[1], 'cd /d "%~dp0"');
		assert.match(launchLine(script), /^start \/MIN "My SCP Server" LocalAdmin\.exe /);
	});

	it("passes the port as the first argument and accepts the EULA and skips the first-run setup prompt", () => {
		assert.equal(launchLine(script), 'start /MIN "My SCP Server" LocalAdmin.exe 25977 --acceptEULA --useDefault');
	});

	it("matches the port in the entry", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(Number(/LocalAdmin\.exe (\d+)/.exec(launchLine(script))[1]), entry.port);
	});

	it("watches the launcher, which stays running", () => {
		const entry = template.buildServerEntry(params());
		assert.equal(entry.processName, "LocalAdmin.exe");
		assert.equal(entry.startScriptPath, "C:\\Servers\\scpsl\\Start_SCPSL.bat");
	});

	it("never lets a character cmd acts on into the script, whatever is typed as the name", () => {
		const hostile = template.buildStartScript(params({ name: 'a" & calc & "%PATH%' }));
		const launch = launchLine(hostile);
		assert.match(launch, /^start \/MIN "[^"%&|<>^]*" LocalAdmin\.exe 25977 /);
		assert.equal(hostile.split("\r\n").filter((l) => l.startsWith("start ")).length, 1);
	});

	it("uses carriage-return line feeds and ends with one", () => {
		assert.ok(script.endsWith("\r\n"));
		assert.ok(!/[^\r]\n/.test(script));
	});
});

describe("SCP: Secret Laboratory backup, logs and launch options", () => {
	it("keeps nothing it cannot find on disk in the install folder, so the backup list is empty", () => {
		assert.deepEqual(backup.paths, []);
	});

	it("names no log file, since the dossier found no log location", () => {
		assert.deepEqual(logs, []);
	});

	it("gives the launch line a form, with LocalAdmin's own option names", () => {
		assert.equal(launchOptions, false);
	});
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseValheimLaunch, serializeValheimLaunch, valheimLaunchEntries } from "../../ui/src/configParsers/valheimLaunch.js";
import { check, fc } from "../helpers/fc.js";

// Valheim has no settings file; the launch arguments in its start script are the settings. The form reads them out of the line that
// starts the server and writes edits back, touching nothing else in the script.

// The script the panel writes, and the one the Valheim server ships with (as found on a real install).
const OURS = '@echo off\r\nset SteamAppId=892970\r\n\r\nstart /MIN "Valheim" valheim_server.exe -nographics -batchmode -name "Godly Heroes" -port 7777 -world "Godly1" -savedir "%~dp0saves" -logFile "%~dp0valheim_server.log" -password "hunter22"\r\n';
const SHIPPED = [
	"@echo off",
	"set SteamAppId=892970",
	"",
	'echo "Starting server PRESS CTRL-C to exit"',
	"REM NOTE: Minimum password length is 5 characters & Password cant be in the server name.",
	'valheim_server -nographics -batchmode -name "My server" -port 2456 -world "Dedicated" -password secret -crossplay',
	"",
].join("\r\n");

const value = (text, key) => valheimLaunchEntries(parseValheimLaunch(text)).find((e) => e.key === key)?.value;
const edit = (text, changes) => {
	const parsed = parseValheimLaunch(text);
	const byKey = new Map(valheimLaunchEntries(parsed).map((e) => [e.key, e.id]));
	return serializeValheimLaunch(parsed, Object.fromEntries(Object.entries(changes).map(([k, v]) => [byKey.get(k), v])));
};

describe("Valheim's launch options as settings", () => {
	it("reads the settings off the line that starts the server, quoted or not", () => {
		assert.equal(value(OURS, "name"), "Godly Heroes");
		assert.equal(value(OURS, "port"), "7777");
		assert.equal(value(OURS, "world"), "Godly1");
		assert.equal(value(OURS, "password"), "hunter22");
		assert.equal(value(OURS, "savedir"), "%~dp0saves");
		assert.equal(value(SHIPPED, "port"), "2456");
		assert.equal(value(SHIPPED, "password"), "secret");
		assert.equal(value(SHIPPED, "crossplay"), "true");
	});

	it("lists settings that aren't on the line yet, empty, so they can be turned on", () => {
		assert.equal(value(OURS, "public"), "");
		assert.equal(value(OURS, "crossplay"), "false");
		assert.equal(value(OURS, "preset"), "");
		assert.equal(value(OURS, "combat"), "");
		assert.equal(value(OURS, "setkey nomap"), "false");
	});

	it("changes a value in place and leaves the rest of the script, and its line endings, exactly as they were", () => {
		const out = edit(OURS, { port: "2456" });
		assert.equal(out, OURS.replace("-port 7777", "-port 2456"));
		assert.equal(out.includes("\r\n"), true);
		assert.equal(out.replace(/\r\n/g, "").includes("\n"), false, "no bare line feeds were introduced");
	});

	it("keeps the quotes round names and paths, and adds them where a value needs them", () => {
		const out = edit(OURS, { name: "Two Words", world: "NewWorld" });
		assert.match(out, /-name "Two Words"/);
		assert.match(out, /-world "NewWorld"/);
	});

	it("adds a setting that wasn't there, and takes one off when it is cleared", () => {
		const added = edit(OURS, { public: "0", saveinterval: "600", crossplay: "true" });
		assert.match(added, /-public 0/);
		assert.match(added, /-saveinterval 600/);
		assert.match(added, /-crossplay/);
		const removed = edit(added, { public: "", crossplay: "false", savedir: "" });
		assert.doesNotMatch(removed, /-public|-crossplay|-savedir/);
		assert.match(removed, /-logFile/, "the others are untouched");
	});

	it("sets world modifiers and keys, with a preset ahead of them", () => {
		let out = edit(OURS, { combat: "hard", resources: "more", "setkey nomap": "true" });
		assert.match(out, /-modifier combat hard/);
		assert.match(out, /-modifier resources more/);
		assert.match(out, /-setkey nomap/);
		out = edit(out, { preset: "hardcore" });
		assert.ok(out.indexOf("-preset hardcore") < out.indexOf("-modifier combat"), "a preset applied after a modifier would undo it");
		out = edit(out, { combat: "", "setkey nomap": "false" });
		assert.doesNotMatch(out, /-modifier combat|-setkey nomap/);
		assert.match(out, /-modifier resources more/);
	});

	it("leaves arguments it doesn't manage, and anything after them on the line", () => {
		const text = "start valheim_server -nographics -batchmode -name \"A\" -port 2456 -world \"W\" -password pass1 -foo bar & echo started\n";
		const out = edit(text, { port: "2460" });
		assert.equal(out, text.replace("2456", "2460"));
	});

	it("ignores the script's comments and echo lines that mention the program, and the steamcmd line before it", () => {
		const text = "C:\\x\\steamcmd.exe +login anonymous +app_update 896660 validate +quit\nREM run valheim_server -port 1 to test\n@echo valheim_server -port 2\nstart /MIN valheim_server -name \"A\" -port 7777 -world \"W\" -password abcde\n";
		assert.equal(value(text, "port"), "7777");
	});

	it("shows nothing for a script with no launch line, and changes nothing", () => {
		const text = "@echo off\r\necho hello\r\n";
		assert.deepEqual(valheimLaunchEntries(parseValheimLaunch(text)), []);
		assert.equal(serializeValheimLaunch(parseValheimLaunch(text), { "Server::port": "1" }), text);
	});

	it("round-trips: with no edits the script comes back unchanged, for any password and name", () => {
		check(
			fc.property(fc.stringMatching(/^[A-Za-z0-9 _.-]{1,20}$/), fc.stringMatching(/^[A-Za-z0-9_.-]{5,12}$/), fc.integer({ min: 1024, max: 65000 }), (name, password, port) => {
				const text = `@echo off\r\nstart /MIN valheim_server -nographics -batchmode -name "${name}" -port ${port} -world "W" -password "${password}"\r\n`;
				assert.equal(serializeValheimLaunch(parseValheimLaunch(text), {}), text);
				assert.equal(value(text, "name"), name);
				assert.equal(value(text, "password"), password);
				assert.equal(value(text, "port"), String(port));
			}),
		);
	});
});

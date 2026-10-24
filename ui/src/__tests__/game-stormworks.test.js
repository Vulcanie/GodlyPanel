import { describe, it, expect } from "vitest";
import game from "../catalog/games/stormworks.js";
import server from "../../../src/server/data/games/stormworks.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered. There is no settings file to check: the panel
// does not read server_config.xml, so the checks are on the launch form and the guide.

const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("Stormworks module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("stormworks");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Stormworks: Build and Rescue");
		expect(game.files).toEqual({});
		expect(server.launchOptions).toBe(true);
		expect(game.guide.name).toBe("Stormworks: Build and Rescue");
		expect(game.guide.files["server_config.xml"]).toBeTruthy();
	});

	it("says in the guide where the settings are and how the panel stops the server", () => {
		const notes = game.guide.notes.join("\n");
		expect(game.guide.summary).toMatch(/server_config\.xml/);
		expect(notes).toMatch(/Stop closes the server's window/);
		expect(notes).toMatch(/Edit server_config\.xml only while the server is stopped/);
		expect(notes).toMatch(/same number as the server's Game Port/);
	});
});

describe("Stormworks: launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group, with unique flags", () => {
		expect(def.args.length).toBeGreaterThan(0);
		for (const arg of def.args) {
			expect(arg.label?.trim(), arg.flag).toBeTruthy();
			expect(arg.description.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group?.trim(), arg.flag).toBeTruthy();
		}
		const flags = def.args.map((a) => a.flag.toLowerCase());
		expect(new Set(flags).size).toBe(flags.length);
	});

	it("offers only the argument the sources document", () => {
		expect(def.args.map((a) => a.flag)).toEqual(["+server_dir"]);
		for (const bad of ["-port", "+port", "-console", "+password", "+name", "-server64"]) expect(def.args.some((a) => a.flag === bad), bad).toBe(false);
	});

	it("matches server.exe and does not match the Wine spelling by mistake", () => {
		expect(def.program.test('start /MIN "x" server.exe +server_dir "C:\\x"')).toBe(true);
		expect(def.program.test('start /MIN "x" Server.EXE +server_dir "C:\\x"')).toBe(true);
	});

	const script = server.template.buildStartScript({ name: "Test", installDir: "C:\\Servers\\storm" });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.server_dir.value).toBe("C:\\Servers\\storm");
	});

	it("changes the folder in place", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.server_dir.id]: "D:\\Other" });
		expect(out).toContain('server.exe +server_dir "D:\\Other"');
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("explains every argument the form offers for the line", () => {
		const parsed = parseLaunchArgs(script, def);
		const explained = new Set(def.args.filter((a) => a.edit !== false).map(keyOf));
		for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), entry.key).toBe(true);
	});
});

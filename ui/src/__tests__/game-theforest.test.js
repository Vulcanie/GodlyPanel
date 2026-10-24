import { describe, it, expect } from "vitest";
import game from "../catalog/games/theforest.js";
import server from "../../../src/server/data/games/theforest.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered. The game has no settings file with a parser
// (config.cfg is key-value lines with spaces, which the panel does not read), so the module offers the launch-arguments form only.

const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("The Forest module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("theforest");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("The Forest");
		expect(game.files).toEqual({});
		expect(game.guide.name).toBe("The Forest");
		expect(game.guide.files["config.cfg"]).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("explains what is not in the form", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/Ctrl\+C/);
		expect(notes).toMatch(/config\.cfg/);
		expect(notes).toMatch(/Ports/);
		expect(notes).toMatch(/ModAPI/);
	});
});

describe("The Forest: launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group, with flags and form keys nobody else uses", () => {
		expect(def.args.length).toBeGreaterThan(5);
		for (const arg of def.args) {
			expect(arg.label?.trim(), arg.flag).toBeTruthy();
			expect(arg.description.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group?.trim(), arg.flag).toBeTruthy();
		}
		const flags = def.args.map((a) => a.flag.toLowerCase());
		expect(new Set(flags).size).toBe(flags.length);
		const keys = def.args.filter((a) => a.edit !== false).map(keyOf);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("offers the start type as a dropdown of exactly the two values the dossier gives", () => {
		const inittype = def.args.find((a) => a.flag === "-inittype");
		expect(inittype.options.map((o) => o[0])).toEqual(["New", "Continue"]);
		expect(inittype.edit).not.toBe(false);
	});

	it("keeps the arguments the panel must always write out of the form", () => {
		for (const flag of ["-batchmode", "-nographics", "-nosteamclient", "-serverPasswordAdmin", "-savefolderpath", "-configfilepath"]) {
			const arg = def.args.find((a) => a.flag === flag);
			expect(arg, flag).toBeTruthy();
			expect(arg.edit, flag).toBe(false);
			expect(arg.managed, flag).toBe(true);
		}
	});

	it("does not offer what the sources do not explain", () => {
		for (const bad of ["-difficulty", "-port", "-secure", "-authkey", "-mod"]) expect(def.args.some((a) => a.flag === bad), bad).toBe(false);
	});

	const script = server.template.buildStartScript({ name: "Test", installDir: "C:\\x", maxPlayers: 5, adminPassword: "admin42" });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.inittype.value).toBe("New");
	});

	it("changes the start type in place", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.inittype.id]: "Continue" });
		expect(out).toMatch(/ -inittype Continue /);
		expect(out).not.toMatch(/ -inittype New /);
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("every argument the form offers for the line is explained", () => {
		const parsed = parseLaunchArgs(script, def);
		const explained = new Set(def.args.filter((a) => a.edit !== false).map(keyOf));
		for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), entry.key).toBe(true);
	});
});

import { describe, it, expect } from "vitest";
import game from "../catalog/games/starrupture.js";
import server from "../../../src/server/data/games/starrupture.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";
import { parseJsonConfig, flattenJsonEntries, serializeJsonConfig } from "../configParsers/json.js";

// The rules of catalogs.test.js and launchArgs.test.js, applied to this game's module before it is registered.

const file = game.files["DSSettings.txt"];
const settings = Object.entries(file.settings);

describe("StarRupture module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("starrupture");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("StarRupture");
		expect(Object.keys(game.files)).toEqual(["DSSettings.txt"]);
		expect(Object.keys(server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat" }).configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("StarRupture");
		expect(game.guide.files["DSSettings.txt"]).toBeTruthy();
	});
});

describe("StarRupture DSSettings.txt catalog", () => {
	it("covers exactly the five keys the game reads", () => {
		expect(Object.keys(file.settings).sort()).toEqual(["LoadSavedGame", "SaveGameInterval", "SaveGameName", "SessionName", "StartNewGame"]);
	});

	it("gives every setting a label, an explanation and a group", () => {
		for (const [key, meta] of settings) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("lists each choice of a dropdown once, with a label", () => {
		for (const [key, meta] of settings) {
			if (!meta.options) continue;
			const values = meta.options.map((o) => o.value);
			expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
			for (const o of meta.options) {
				expect(typeof o.value).toBe("string");
				expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
			}
		}
		// The game only knows "true" and "false", written as text.
		expect(file.settings.StartNewGame.options.map((o) => o.value)).toEqual(["true", "false"]);
		expect(file.settings.LoadSavedGame.options.map((o) => o.value)).toEqual(["true", "false"]);
	});

	it("names only groups in groupOrder that exist", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), g).toBe(true);
	});

	it("is a JSON file", () => {
		expect(file.parser).toBe("json");
	});

	it("reads the file the panel writes, and writes a choice back as text, not as a JSON boolean", () => {
		const text = server.template.buildConfigFile({ sessionName: "My World" }).content;
		const parsed = parseJsonConfig(text);
		const entries = flattenJsonEntries(parsed, new Set(file.structuredPaths));
		expect(entries.map((e) => e.path).sort()).toEqual(Object.keys(file.settings).sort());
		const out = JSON.parse(serializeJsonConfig(parsed, { StartNewGame: "false", LoadSavedGame: "true", SaveGameInterval: "600" }));
		expect(out).toEqual({ SessionName: "My World", SaveGameInterval: "600", StartNewGame: "false", LoadSavedGame: "true", SaveGameName: "AutoSave0.sav" });
	});
});

describe("StarRupture launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group", () => {
		expect(def.args.length).toBe(5);
		for (const arg of def.args) {
			expect(arg.label, arg.flag).toBeTruthy();
			expect(arg.description.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group, arg.flag).toBeTruthy();
		}
	});

	it("has no two editable arguments with the same name, and no repeated dropdown choice", () => {
		const keys = def.args.filter((a) => a.edit !== false).map((a) => a.key ?? a.flag.replace(/^[-+]+/, ""));
		expect(new Set(keys).size).toBe(keys.length);
		const flags = def.args.map((a) => a.flag.toLowerCase());
		expect(new Set(flags).size).toBe(flags.length);
		for (const arg of def.args) if (arg.options) expect(new Set(arg.options.map((o) => (Array.isArray(o) ? o[0] : o))).size).toBe(arg.options.length);
	});

	it("only offers arguments the research found evidence for", () => {
		expect(def.args.map((a) => a.flag).sort()).toEqual(["-Log", "-Port", "-RCWebControlDisable", "-RCWebInterfaceDisable", "-multihome"]);
	});

	const script = server.template.buildStartScript({ name: "Test", port: 7780 });

	it("finds the launch line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
	});

	it("reads the port from the line and edits it in place", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.Port.value).toBe("7780");
		const out = serializeLaunchArgs(parsed, { [by.Port.id]: "7790", [by.multihome.id]: "192.168.1.20" });
		expect(out).toContain("-Port=7790");
		expect(out).toContain("-multihome=192.168.1.20");
		expect(out).toContain("StarRuptureServerEOS.exe -Log");
		expect(out).toContain("-RCWebControlDisable");
	});

	it("shows the two Remote Control switches as on, and takes one off the line when switched off", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.RCWebControlDisable).toBeTruthy();
		const out = serializeLaunchArgs(parsed, { [by.RCWebControlDisable.id]: "false" });
		expect(out).not.toContain("-RCWebControlDisable");
		expect(out).toContain("-RCWebInterfaceDisable");
	});

	it("matches the launcher in the script and not a bare word in the title", () => {
		expect(def.program.test("start /MIN \"x\" StarRuptureServerEOS.exe -Log")).toBe(true);
		expect(def.program.test("cd /d \"%~dp0\"")).toBe(false);
	});
});

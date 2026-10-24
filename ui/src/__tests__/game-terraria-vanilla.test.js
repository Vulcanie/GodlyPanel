import { describe, it, expect } from "vitest";
import game from "../catalog/games/terraria-vanilla.js";
import server from "../../../src/server/data/games/terraria-vanilla.js";
import { parseProperties, serializeProperties } from "../configParsers/properties.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered, and checked against the files the server side
// writes: serverconfig.txt (the panel's "properties" reader) and the launch line of the start script.

const FILE = "serverconfig.txt";
const file = game.files[FILE];
const settings = Object.entries(file.settings);
const def = game.launch;
const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");
const params = { name: "Test", sessionName: "Our World", serverPassword: "join1234", port: 7790, maxPlayers: 12, installDir: "C:\\Servers\\terraria" };
const script = server.template.buildStartScript(params);
const config = server.template.buildConfigFile(params).content;

describe("Terraria (vanilla) module", () => {
	it("has the shape a game module needs, and the type its server template uses", () => {
		expect(game.type).toBe("terraria-vanilla");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Terraria (vanilla)");
		expect(Object.keys(game.files)).toEqual([FILE]);
		expect(Object.keys(game.guide.files)).toEqual([FILE]);
		expect(game.guide.name).toBe("Terraria (vanilla)");
		expect(game.guide.summary.length).toBeGreaterThan(20);
		expect(server.launchOptions).toBe(true);
		const entry = server.template.buildServerEntry({ ...params, startScriptFilename: "Start_Terraria.bat" });
		expect(Object.keys(entry.configPaths)).toEqual([FILE]);
	});

	it("tells the person the panel fetches the XNA Framework the Windows server needs, and installs nothing", () => {
		expect(game.guide.notes.join(" ")).toMatch(/XNA Framework 4\.0[^]*fetches[^]*Nothing is installed/);
	});

	it("says in the guide that there is no clean stop, how to stop by hand, and that the port is TCP", () => {
		expect(game.guide.notes[0]).toMatch(/cannot stop the server cleanly/);
		const text = game.guide.notes.join(" ");
		expect(text).toMatch(/type `exit`/);
		expect(text).toMatch(/TCP/);
		expect(text).toMatch(/tModLoader/);
	});

	it("gives every guide note some text", () => {
		for (const note of game.guide.notes) expect(note.trim().length).toBeGreaterThan(20);
	});
});

describe("Terraria (vanilla) serverconfig.txt settings", () => {
	it("gives every setting a label, an explanation and a group", () => {
		expect(settings.length).toBe(25);
		for (const [key, meta] of settings) {
			expect(key.startsWith("root::"), key).toBe(true);
			expect(meta.label?.trim(), key).toBeTruthy();
			expect(meta.description?.trim().length, key).toBeGreaterThan(10);
			expect(meta.group?.trim(), key).toBeTruthy();
		}
	});

	it("repeats no choice in a dropdown, and gives every choice a label", () => {
		for (const [key, meta] of settings) {
			if (!meta.options) continue;
			const values = meta.options.map((o) => o.value);
			expect(new Set(values).size, key).toBe(values.length);
			for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
		}
	});

	it("does not give two settings in a group the same label", () => {
		const seen = new Set();
		for (const [, meta] of settings) {
			const id = `${meta.group}/${meta.label}`;
			expect(seen.has(id), id).toBe(false);
			seen.add(id);
		}
	});

	it("uses the key spellings of the dossier, in lower case", () => {
		const keys = settings.map(([key]) => key.replace(/^root::/, ""));
		for (const key of ["world", "worldpath", "autocreate", "worldname", "seed", "difficulty", "password", "motd", "banlist", "secure", "language", "upnp", "npcstream", "priority"]) {
			expect(keys, key).toContain(key);
		}
		for (const key of keys) expect(key, key).toBe(key.toLowerCase());
		expect(keys.filter((k) => k.startsWith("journeypermission_")).length).toBe(11);
	});

	it("leaves out the port and player limit (on the launch line) and the settings the research could not explain", () => {
		const keys = settings.map(([key]) => key.replace(/^root::/, ""));
		for (const key of ["port", "maxplayers", "journeypermission_setspawnrate", "journeypermission_setdifficulty", "journeypermission_increaseplacementrange", "journeypermission_biomespread_setfrozen"]) {
			expect(keys, key).not.toContain(key);
		}
	});

	it("offers the values the dossier lists, and only those", () => {
		const options = (key) => file.settings[`root::${key}`].options.map((o) => o.value);
		expect(options("autocreate")).toEqual(["1", "2", "3"]);
		expect(options("difficulty")).toEqual(["0", "1", "2", "3"]);
		expect(options("priority")).toEqual(["0", "1", "2", "3", "4", "5"]);
		expect(options("language")).toEqual(["en-US", "de-DE", "it-IT", "fr-FR", "es-ES", "ru-RU", "zh-Hans", "pt-BR", "pl-PL"]);
		expect(options("journeypermission_godmode")).toEqual(["0", "1", "2"]);
		expect(file.settings["root::npcstream"].options).toBeUndefined();
		expect(file.settings["root::seed"].options).toBeUndefined();
	});

	it("only names groups in groupOrder that exist, and puts every group in it", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), g).toBe(true);
		for (const g of groups) expect(file.groupOrder, g).toContain(g);
	});

	it("reads the file the server side writes, every line of it a setting the catalog explains", () => {
		const parsed = parseProperties(config);
		expect(parsed.entries.map((e) => e.key)).toEqual(["world", "autocreate", "worldname", "password"]);
		for (const entry of parsed.entries) expect(file.settings[`root::${entry.key}`], entry.key).toBeTruthy();
	});

	it("changes a value in place and leaves the comments and the other lines alone", () => {
		const parsed = parseProperties(config);
		const by = Object.fromEntries(parsed.entries.map((e) => [e.key, e]));
		const out = serializeProperties(parsed, { [by.autocreate.id]: "3", [by.password.id]: "new pass" });
		expect(out).toContain("autocreate=3");
		expect(out).toContain("password=new pass");
		expect(out).toContain("world=C:\\Servers\\terraria\\1458\\Windows\\Worlds\\Our World.wld");
		expect(out.split("\n").filter((l) => l.startsWith("#")).length).toBe(config.split("\r\n").filter((l) => l.startsWith("#")).length);
		expect(serializeProperties(parsed, {}).replace(/\n/g, "\r\n")).toBe(config);
	});
});

describe("Terraria (vanilla): launch arguments", () => {
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

	it("keeps the arguments the panel must always write out of the form", () => {
		for (const flag of ["-config", "-port", "-maxplayers"]) {
			const arg = def.args.find((a) => a.flag === flag);
			expect(arg, flag).toBeTruthy();
			expect(arg.managed, flag).toBe(true);
		}
		expect(def.args.find((a) => a.flag === "-config").edit).toBe(false);
	});

	it("offers only arguments the dossier names, and none of the Steam or duplicate ones", () => {
		const flags = def.args.map((a) => a.flag);
		for (const bad of ["-steam", "-lobby", "-pass", "-password", "-motd", "-world", "-worldname", "-autocreate", "-seed", "-banlist", "-secure", "-forcepriority", "-savedirectory", "-logfile"]) {
			expect(flags, bad).not.toContain(bad);
		}
		for (const flag of ["-ip", "-noupnp", "-disableannouncementbox", "-announcementboxrange"]) expect(flags, flag).toContain(flag);
	});

	it("matches the program's file name", () => {
		expect(def.program.test('start /MIN "x" TerrariaServer.exe -config serverconfig.txt')).toBe(true);
		expect(def.program.test('start /MIN "x" TerrariaServer -config serverconfig.txt')).toBe(true);
	});

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("7790");
		expect(by.maxplayers.value).toBe("12");
		expect(by.config).toBeUndefined();
	});

	it("adds an option at the end of the line", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.port.id]: "7800", "Network::noupnp": "true" });
		expect(out).toMatch(/ -port 7800 /);
		expect(out).toMatch(/ -noupnp$/m);
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("every argument the form offers for the line is explained", () => {
		const parsed = parseLaunchArgs(script, def);
		const explained = new Set(def.args.filter((a) => a.edit !== false).map(keyOf));
		for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), entry.key).toBe(true);
	});
});

import { describe, it, expect } from "vitest";
import game from "../catalog/games/squad.js";
import server from "../../../src/server/data/games/squad.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered. Squad has no settings file in the form
// (its .cfg files use // comments that the panel's readers would show as settings), so only the launch arguments and the guide are held
// to them.

const def = game.launch;
const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");
const script = server.template.buildStartScript({ name: "Test", port: 7787, queryPort: 27165, beaconPort: 15000, maxPlayers: 80 });

describe("Squad module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("squad");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Squad");
		expect(game.guide.name).toBe("Squad");
		expect(game.guide.summary.length).toBeGreaterThan(20);
		expect(server.launchOptions).toBe(true);
	});

	it("offers no settings file, and the server records none", () => {
		expect(game.files).toEqual({});
		expect(Object.keys(game.guide.files)).toEqual([]);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 7787, queryPort: 27165, beaconPort: 15000 });
		expect(entry.configPath).toBeUndefined();
		expect(entry.configPaths).toBeUndefined();
	});

	it("says in the guide what is not in the form, and how stop, RCON, ports, mods and licensing work", () => {
		const text = game.guide.notes.join("\n");
		expect(text).toMatch(/not in the Settings tab/);
		expect(text).toMatch(/Admins\.cfg/);
		expect(text).toMatch(/AdminSetServerPassword/);
		expect(text).toMatch(/Ctrl\+C/);
		expect(text).toMatch(/15 seconds/);
		expect(text).toMatch(/Rcon\.cfg/);
		expect(text).toMatch(/Start_Squad\.bat/);
		expect(text).toMatch(/Plugins\\Mods/);
		expect(text).toMatch(/Licensing/);
		expect(text).toMatch(/Steam program/);
		for (const note of game.guide.notes) expect(note.trim().length).toBeGreaterThan(20);
	});
});

describe("Squad launch arguments", () => {
	it("gives every argument a label, an explanation and a group", () => {
		expect(def.args.length).toBe(14);
		for (const arg of def.args) {
			expect(arg.label?.trim(), arg.flag).toBeTruthy();
			expect(arg.description.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group?.trim(), arg.flag).toBeTruthy();
		}
	});

	it("lists each flag once, ignoring case, and each editable key once", () => {
		const flags = def.args.map((a) => a.flag.toLowerCase());
		expect(new Set(flags).size).toBe(flags.length);
		const keys = def.args.filter((a) => a.edit !== false).map((a) => keyOf(a).toLowerCase());
		expect(new Set(keys).size).toBe(keys.length);
		const stems = def.args.map((a) => a.flag.replace(/^[-+]+/, "").toLowerCase());
		expect(new Set(stems).size).toBe(stems.length);
	});

	it("repeats no choice in a dropdown", () => {
		for (const arg of def.args) {
			if (!arg.options) continue;
			const values = arg.options.map((o) => (Array.isArray(o) ? o[0] : o));
			expect(new Set(values).size, arg.flag).toBe(values.length);
		}
		expect(def.args.find((a) => a.flag === "RANDOM").options.map((o) => o[0])).toEqual(["NONE", "ALWAYS", "FIRST"]);
	});

	it("is spelt the way the wiki spells it: Name=value without a dash, and only -log and -fullcrashdump with one", () => {
		expect(def.style).toBe("equals");
		expect(def.editable).toBe(true);
		const dashed = def.args.filter((a) => a.flag.startsWith("-")).map((a) => a.flag);
		expect(dashed).toEqual(["-log", "-fullcrashdump"]);
		expect(def.args.find((a) => a.flag === "beaconport")).toBeTruthy();
		expect(def.args.some((a) => a.flag === "PREFERPREPROCESSOR")).toBe(false);
	});

	it("matches the program the server side starts", () => {
		expect(def.program.test(script.split("\r\n").find((l) => l.startsWith("start ")))).toBe(true);
		expect(def.program.test(server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 1 }).processName)).toBe(true);
	});

	it("marks every argument the script writes as managed and keeps the ports and -log out of the form", () => {
		const by = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		for (const flag of ["Port", "QueryPort", "beaconport", "FIXEDMAXPLAYERS", "-log"]) {
			expect(by[flag], flag).toBeTruthy();
			expect(by[flag].managed, flag).toBe(true);
		}
		for (const flag of ["Port", "QueryPort", "beaconport", "-log"]) expect(by[flag].edit, flag).toBe(false);
		expect(by.RANDOM.managed).toBeUndefined();
	});
});

describe("Squad launch line in the editor", () => {
	it("is found without a dash on its arguments, and left byte for byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.FIXEDMAXPLAYERS.value).toBe("80");
		expect(by.RANDOM.value).toBe("NONE");
		expect(by.fullcrashdump.value).toBe("false");
		expect(by.RCONPORT.value).toBe("");
		for (const hidden of ["Port", "QueryPort", "beaconport", "log"]) expect(by[hidden], hidden).toBeUndefined();
	});

	it("changes a value in place and adds the rest at the end, keeping Port= first and the other lines", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.FIXEDMAXPLAYERS.id]: "60", [by.RANDOM.id]: "ALWAYS", [by.FIXEDMAXTICKRATE.id]: "40", [by.fullcrashdump.id]: "true", [by.RCONPORT.id]: "21120" });
		const line = out.split("\r\n").find((l) => l.startsWith("start "));
		expect(line).toContain("SquadGameServer.exe Port=7787 QueryPort=27165 beaconport=15000 FIXEDMAXPLAYERS=60 RANDOM=ALWAYS -log");
		expect(line).toMatch(/ FIXEDMAXTICKRATE=40/);
		expect(line).toMatch(/ -fullcrashdump/);
		expect(line).toMatch(/ RCONPORT=21120$/);
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
		expect(out.split("\r\n")[1]).toBe('cd /d "%~dp0"');
	});

	it("takes an argument off the line when it is cleared, and leaves the ones it does not manage", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.RANDOM.id]: "" });
		expect(out).not.toMatch(/RANDOM/);
		expect(out).toContain("Port=7787 QueryPort=27165 beaconport=15000 FIXEDMAXPLAYERS=80 -log");
	});

	it("does not mistake QueryPort= or RCONPORT= for Port=, and reads the keys whatever their case", () => {
		const text = ["@echo off", "start /MIN \"x\" SquadGame\\Binaries\\Win64\\SquadGameServer.exe Port=7787 QueryPort=27165 rconport=21120 fixedmaxplayers=70 -log", ""].join("\r\n");
		const parsed = parseLaunchArgs(text, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.RCONPORT.value).toBe("21120");
		expect(by.FIXEDMAXPLAYERS.value).toBe("70");
		const out = serializeLaunchArgs(parsed, { [by.RCONPORT.id]: "21130" });
		expect(out).toContain("Port=7787 QueryPort=27165 rconport=21120".replace("rconport=21120", "RCONPORT=21130"));
	});

	it("every argument the form offers for the line is explained", () => {
		const parsed = parseLaunchArgs(script, def);
		const explained = new Set(def.args.filter((a) => a.edit !== false).map(keyOf));
		for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), entry.key).toBe(true);
	});
});

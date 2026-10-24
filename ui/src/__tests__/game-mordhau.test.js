import { describe, it, expect } from "vitest";
import game from "../catalog/games/mordhau.js";
import server from "../../../src/server/data/games/mordhau.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";
import { parseIni } from "../configParsers/ini.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered. Game.ini is read by the ini parser; the launch
// line is read by the launch-arguments form.

const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");
const SECTION = "/Script/Mordhau.MordhauGameSession";

describe("Mordhau module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("mordhau");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Mordhau");
		expect(Object.keys(game.files)).toEqual(["Game.ini"]);
		expect(game.guide.name).toBe("Mordhau");
		expect(game.guide.files["Game.ini"]).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("reads Game.ini with the ini parser, in the one section the module names", () => {
		const file = game.files["Game.ini"];
		expect(file.parser).toBe("ini");
		expect(file.groupOrder).toEqual(["Server", "Access"]);
		for (const key of Object.keys(file.settings)) expect(key.startsWith(`${SECTION}::`), key).toBe(true);
	});

	it("offers the three settings the panel writes, and no list or key whose sources disagree", () => {
		const keys = Object.keys(game.files["Game.ini"].settings).map((k) => k.slice(k.indexOf("::") + 2));
		expect(keys.sort()).toEqual(["AdminPassword", "ServerName", "ServerPassword"]);
	});

	it("explains what is not in the form", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/Ctrl\+C/);
		expect(notes).toMatch(/Win64/);
		expect(notes).toMatch(/MapRotation/);
		expect(notes).toMatch(/mod\.io/);
		expect(notes).toMatch(/Engine\.ini/);
	});
});

describe("Mordhau: Game.ini settings", () => {
	it("gives every setting a label, an explanation of more than 10 characters and a group", () => {
		for (const [key, meta] of Object.entries(game.files["Game.ini"].settings)) {
			expect(meta.label?.trim(), key).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, key).toBeGreaterThan(10);
			expect(meta.group?.trim(), key).toBeTruthy();
		}
	});

	it("parses a Game.ini the panel writes, and reads each setting back", () => {
		const { content } = server.template.buildConfigFile({ sessionName: "Friends", serverPassword: "pw1", adminPassword: "adm2" });
		const parsed = parseIni(content);
		const entries = Object.fromEntries(
			(parsed.entries ?? []).map((e) => [`${e.section}::${e.key}`, e.value]),
		);
		expect(entries[`${SECTION}::ServerName`]).toBe("Friends");
		expect(entries[`${SECTION}::ServerPassword`]).toBe("pw1");
		expect(entries[`${SECTION}::AdminPassword`]).toBe("adm2");
	});
});

describe("Mordhau: launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group, with unique flags and form keys", () => {
		expect(def.args.length).toBeGreaterThan(3);
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

	it("keeps the three ports and the player limit as the panel writes them", () => {
		for (const flag of ["-Port", "-queryport", "-beaconport"]) {
			const arg = def.args.find((a) => a.flag === flag);
			expect(arg, flag).toBeTruthy();
			expect(arg.edit, flag).toBe(false);
			expect(arg.managed, flag).toBe(true);
		}
		expect(def.args.find((a) => a.flag === "-MaxSlots").edit).not.toBe(false);
	});

	it("does not offer what the sources do not explain", () => {
		for (const bad of ["-USEALLAVAILABLECORES", "-ModDownload", "-RconPort", "-Map"]) expect(def.args.some((a) => a.flag === bad), bad).toBe(false);
	});

	const script = server.template.buildStartScript({ name: "Test", port: 25900, queryPort: 25902, beaconPort: 25903 });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.MaxSlots.value).toBe("48");
	});

	it("changes the player limit in place", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.MaxSlots.id]: "60" });
		expect(out).toMatch(/ -MaxSlots=60 /);
		expect(out).not.toMatch(/ -MaxSlots=48 /);
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("every argument the form offers for the line is explained", () => {
		const parsed = parseLaunchArgs(script, def);
		const explained = new Set(def.args.filter((a) => a.edit !== false).map(keyOf));
		for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), entry.key).toBe(true);
	});
});

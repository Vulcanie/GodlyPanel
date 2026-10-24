import { describe, it, expect } from "vitest";
import game from "../catalog/games/insurgencysandstorm.js";
import server from "../../../src/server/data/games/insurgencysandstorm.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";
import { parseIni } from "../configParsers/ini.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered. Game.ini is read by the ini parser; the launch
// line is read by the launch-arguments form.

const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");
const GENERAL = "/Script/Insurgency.INSGameMode";
const MULTI = "/Script/Insurgency.INSMultiplayerMode";

describe("Insurgency: Sandstorm module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("insurgencysandstorm");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Insurgency: Sandstorm");
		expect(Object.keys(game.files)).toEqual(["Game.ini"]);
		expect(game.guide.name).toBe("Insurgency: Sandstorm");
		expect(game.guide.files["Game.ini"]).toBeTruthy();
		expect(game.guide.files["Admins.txt"]).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("reads Game.ini with the ini parser, in the two sections the dossier gives defaults for", () => {
		const file = game.files["Game.ini"];
		expect(file.parser).toBe("ini");
		expect(file.groupOrder).toEqual(["Kill feed", "Teams", "Rounds and maps", "Players"]);
		const sections = new Set(Object.keys(file.settings).map((k) => k.slice(0, k.indexOf("::"))));
		expect([...sections].sort()).toEqual([GENERAL, MULTI].sort());
	});

	it("offers only keys the dossier gives a name and a default for", () => {
		const keys = Object.keys(game.files["Game.ini"].settings).map((k) => k.slice(k.indexOf("::") + 2));
		expect(keys.sort()).toEqual([
			"FriendlyFireModifier",
			"IdleLimit",
			"MinimumPlayers",
			"PostRoundTime",
			"PreRoundTime",
			"TeamKillLimit",
			"bAllowFriendlyFire",
			"bAllowPlayerTeamSelect",
			"bAutoBalanceTeams",
			"bBots",
			"bKillFeed",
			"bKillerInfo",
			"bMapVoting",
			"bUseMapCycle",
		]);
	});

	it("explains what is not in the form", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/Ctrl\+C/);
		expect(notes).toMatch(/mod\.io/);
		expect(notes).toMatch(/Rcon/i);
		expect(notes).toMatch(/Oilfield/);
	});
});

describe("Insurgency: Sandstorm: Game.ini settings", () => {
	it("gives every setting a label, an explanation of more than 10 characters and a group", () => {
		for (const [key, meta] of Object.entries(game.files["Game.ini"].settings)) {
			expect(meta.label?.trim(), key).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, key).toBeGreaterThan(10);
			expect(meta.group?.trim(), key).toBeTruthy();
		}
	});

	it("gives each dropdown its own choices, with no value repeated", () => {
		for (const [key, meta] of Object.entries(game.files["Game.ini"].settings)) {
			if (!meta.options) continue;
			const values = meta.options.map((o) => o.value);
			expect(new Set(values).size, key).toBe(values.length);
		}
	});

	it("offers True and False for the on-off settings, as the game writes them", () => {
		const settings = game.files["Game.ini"].settings;
		expect(settings[`${GENERAL}::bKillFeed`].options.map((o) => o.value)).toEqual(["True", "False"]);
		expect(settings[`${MULTI}::bUseMapCycle`].options.map((o) => o.value)).toEqual(["True", "False"]);
	});

	it("parses a Game.ini with a value the form writes and reads it back", () => {
		const content = `[${GENERAL}]\r\nbKillFeed=False\r\n[${MULTI}]\r\nIdleLimit=150\r\n`;
		const parsed = parseIni(content);
		const entries = Object.fromEntries((parsed.entries ?? []).map((e) => [`${e.section}::${e.key}`, e.value]));
		expect(entries[`${GENERAL}::bKillFeed`]).toBe("False");
		expect(entries[`${MULTI}::IdleLimit`]).toBe("150");
	});

	it("reads the Game.ini the server module writes (a comment only) without error", () => {
		const { content } = server.template.buildConfigFile({});
		expect(() => parseIni(content)).not.toThrow();
	});
});

describe("Insurgency: Sandstorm: launch arguments", () => {
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

	it("keeps the ports, the server name and the login token as the panel writes them", () => {
		for (const flag of ["-Port", "-QueryPort", "-hostname", "-GSLTToken"]) {
			const arg = def.args.find((a) => a.flag === flag);
			expect(arg, flag).toBeTruthy();
			expect(arg.edit, flag).toBe(false);
			expect(arg.managed, flag).toBe(true);
		}
	});

	it("does not offer what the dossier does not give, or what it advises against", () => {
		for (const bad of ["-EnableCheats", "-GameStats", "-GameStatsToken", "-mods", "-NoEAC", "-RconPassword", "-RconListenPort", "-SecurityCode"]) {
			expect(def.args.some((a) => a.flag === bad), bad).toBe(false);
		}
	});

	const script = server.template.buildStartScript({ name: "Test", sessionName: "Test", port: 25940, queryPort: 25942, serverPassword: "pw1", gslt: "TOK" });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		expect(script).toMatch(/ -Port=25940 -QueryPort=25942 -log -hostname="Test" -GSLTToken=TOK\r\n$/);
	});

	it("every argument the form offers for the line is explained", () => {
		const parsed = parseLaunchArgs(script, def);
		const explained = new Set(def.args.filter((a) => a.edit !== false).map(keyOf));
		for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), entry.key).toBe(true);
	});
});

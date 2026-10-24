import { describe, it, expect } from "vitest";
import game from "../catalog/games/bannerlord.js";
import server from "../../../src/server/data/games/bannerlord.js";
import { parseConvarCfg, convarEntries } from "../configParsers/convarCfg.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered. The one file, ds_config_server.txt, is read by
// the console-variable parser; the game has no launch-arguments form.

describe("Bannerlord module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("bannerlord");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Mount & Blade II: Bannerlord");
		expect(Object.keys(game.files)).toEqual(["ds_config_server.txt"]);
		expect(game.guide.name).toBe("Mount & Blade II: Bannerlord");
		expect(game.guide.files["ds_config_server.txt"]).toBeTruthy();
		expect(game.launch).toBeFalsy();
		expect(server.launchOptions).toBe(false);
	});

	it("reads the config file with the console-variable parser, and the file name is the one the server writes", () => {
		const file = game.files["ds_config_server.txt"];
		expect(file.parser).toBe("convar");
		expect(file.groupOrder).toEqual(["Server", "Access"]);
		const { relPath } = server.template.buildConfigFile({ sessionName: "x" });
		expect(relPath.endsWith("\\ds_config_server.txt")).toBe(true);
	});

	it("offers the three settings the official page names, and nothing from a mod build", () => {
		const keys = Object.keys(game.files["ds_config_server.txt"].settings).sort();
		expect(keys).toEqual(["AdminPassword", "GameType", "ServerName"]);
	});

	it("explains what the panel cannot do", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/cannot stop the server cleanly/);
		expect(notes).toMatch(/customserver\.gettoken/);
		expect(notes).toMatch(/No map is set/);
	});
});

describe("Bannerlord: config settings", () => {
	it("gives every setting a label, an explanation of more than 10 characters and a group", () => {
		for (const [key, meta] of Object.entries(game.files["ds_config_server.txt"].settings)) {
			expect(meta.label?.trim(), key).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, key).toBeGreaterThan(10);
			expect(meta.group?.trim(), key).toBeTruthy();
		}
	});

	it("lists the game modes once each, as the official page names them", () => {
		const options = game.files["ds_config_server.txt"].settings.GameType.options;
		expect(options.map((o) => o.value)).toEqual(["Siege", "TeamDeathmatch", "Captain", "Skirmish", "Duel", "Battle"]);
		expect(new Set(options.map((o) => o.value)).size).toBe(options.length);
	});

	it("reads the file the panel writes, and each setting reads back with its value", () => {
		const { content } = server.template.buildConfigFile({ sessionName: "Friends Calradia", adminPassword: "adm2" });
		const parsed = parseConvarCfg(content);
		const entries = Object.fromEntries(convarEntries(parsed).map((e) => [e.key, e.value]));
		expect(entries.ServerName).toBe("Friends Calradia");
		expect(entries.GameType).toBe("TeamDeathmatch");
		expect(entries.AdminPassword).toBe("adm2");
		expect(entries.start_game_and_mission).toBe("");
	});

	it("every setting the form offers is one the file can hold", () => {
		const { content } = server.template.buildConfigFile({ sessionName: "x", adminPassword: "y" });
		const have = new Set(parseConvarCfg(content).entries.map((e) => e.key));
		for (const key of Object.keys(game.files["ds_config_server.txt"].settings)) expect(have.has(key), key).toBe(true);
	});
});

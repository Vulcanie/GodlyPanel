import { describe, it, expect } from "vitest";
import game from "../catalog/games/dayofdragons.js";
import server from "../../../src/server/data/games/dayofdragons.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Day of Dragons module", () => {
	it("has the shape a game module needs, and the type its server template uses", () => {
		expect(game.type).toBe("dayofdragons");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Day of Dragons");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeNull();
		expect(game.guide.name).toBe("Day of Dragons");
	});

	it("has one settings file, Game.ini, with the developer's section as its only section", () => {
		expect(Object.keys(game.files)).toEqual(["Game.ini"]);
		expect(game.files["Game.ini"].parser).toBe("ini");
		const sections = new Set(Object.keys(game.files["Game.ini"].settings).map((k) => k.split("::")[0]));
		expect([...sections]).toEqual(["/game/_dev/runtime/classes/dragonsgi.dragonsgi_c"]);
	});

	it("keeps the keys the developer documents, and leaves out the ones whose names or defaults conflict", () => {
		const keys = Object.keys(game.files["Game.ini"].settings).map((k) => k.split("::")[1]);
		for (const key of ["iServerType", "iMaxPlayers", "iCorpseDespawnTime", "iAutoSaveSeconds", "sMap", "sServerPassword"]) {
			expect(keys).toContain(key);
		}
		for (const key of ["bUseFriendsList", "bChatShowClanTags", "bForceLAN", "bDisablePVP", "iServerMaxPlayers", "sServerMOTD"]) {
			expect(keys).not.toContain(key);
		}
	});

	it("gives every setting a label, an explanation of more than 10 characters and a group", () => {
		for (const [key, meta] of Object.entries(game.files["Game.ini"].settings)) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("lists each dropdown choice once, with a label", () => {
		for (const [key, meta] of Object.entries(game.files["Game.ini"].settings)) {
			if (!meta.options) continue;
			const values = meta.options.map((o) => o.value);
			expect(values.length, `${key} has no choices`).toBeGreaterThan(0);
			expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
			for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
		}
	});

	it("explains the port, the stop and the mods in the guide", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/[Pp]ort/);
		expect(notes).toMatch(/Stop/);
		expect(notes).toMatch(/[Mm]ods/);
	});

	it("names the settings file, in the guide", () => {
		expect(Object.keys(game.guide.files)).toEqual(["Game.ini"]);
		expect(game.guide.files["Game.ini"].length).toBeGreaterThan(10);
	});

	it("writes its guide's paths and notes with forward slashes only", () => {
		for (const note of game.guide.notes) expect(note).not.toMatch(/\\/);
	});
});

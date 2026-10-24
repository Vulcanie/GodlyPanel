import { describe, it, expect } from "vitest";
import game from "../catalog/games/hyperchargeunboxed.js";
import server from "../../../src/server/data/games/hyperchargeunboxed.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("HYPERCHARGE: Unboxed module", () => {
	it("has the shape a game module needs, and the type its server template uses", () => {
		expect(game.type).toBe("hyperchargeunboxed");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("HYPERCHARGE: Unboxed");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeNull();
		expect(game.guide.name).toBe("HYPERCHARGE: Unboxed");
	});

	it("has no settings file, because the dossier finds none", () => {
		expect(Object.keys(game.files)).toEqual([]);
		expect(Object.keys(game.guide.files)).toEqual([]);
	});

	it("says which values are from a 2020 guide, and that the stop and mods are not covered", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/2020/);
		expect(notes).toMatch(/Stop/);
		expect(notes).toMatch(/[Mm]ods/);
		expect(notes).toMatch(/-Port/);
	});

	it("writes its guide's notes with forward slashes only", () => {
		for (const note of game.guide.notes) expect(note).not.toMatch(/\\/);
	});
});

import { describe, it, expect } from "vitest";
import game from "../catalog/games/acc.js";
import server from "../../../src/server/data/games/acc.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("ACC module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("acc");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Assetto Corsa Competizione");
		expect(server.launchOptions).toBe(false);
		expect(game.guide.name).toBe("Assetto Corsa Competizione");
	});

	it("has no settings form: the settings are UTF-16 files the panel cannot read or write", () => {
		expect(Object.keys(game.files)).toEqual([]);
		expect(game.launch).toBeNull();
	});

	it("explains the things the panel cannot do: the UTF-16 files, the port and the stop", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/UTF-16/);
		expect(notes).toMatch(/configuration\.json/);
		expect(notes).toMatch(/stop/i);
	});
});

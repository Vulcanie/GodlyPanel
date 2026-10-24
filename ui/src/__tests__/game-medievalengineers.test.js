import { describe, it, expect } from "vitest";
import game from "../catalog/games/medievalengineers.js";

// Medieval Engineers' UI module: no settings file and no launch form (see the top of the module), so the checks are on the guide
// and on the shape the Settings tab reads.

describe("Medieval Engineers catalog module", () => {
	it("has its type, title and guide", () => {
		expect(game.type).toBe("medievalengineers");
		expect(game.title).toBe("Medieval Engineers");
		expect(game.guide.name).toBe("Medieval Engineers");
		expect(game.guide.summary.length).toBeGreaterThan(40);
	});

	it("offers no settings file and no launch form, and says so in the guide", () => {
		expect(game.files).toEqual({});
		expect(game.launch).toBeNull();
		expect(game.guide.files).toEqual({});
		expect(game.guide.notes.length).toBeGreaterThan(0);
	});

	it("gives every guide note a line of text, with no empty entries", () => {
		for (const note of game.guide.notes) expect(note.trim().length).toBeGreaterThan(10);
	});

	it("names the config file the panel writes, the way the server module writes it", () => {
		expect(game.guide.summary).toContain("MedievalEngineers-Dedicated.cfg");
	});
});

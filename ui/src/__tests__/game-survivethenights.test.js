import { describe, it, expect } from "vitest";
import game from "../catalog/games/survivethenights.js";
import server from "../../../src/server/data/games/survivethenights.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Survive the Nights module", () => {
	it("has the shape a game module needs, and the type its server template uses", () => {
		expect(game.type).toBe("survivethenights");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Survive the Nights");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeNull();
		expect(game.guide.name).toBe("Survive the Nights");
	});

	it("has no settings file in the catalog, because the // comments in ServerConfig.txt have no parser", () => {
		expect(Object.keys(game.files)).toEqual([]);
	});

	it("explains the port and UPnP, the stop and the mods", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/UPnP/);
		expect(notes).toMatch(/7950/);
		expect(notes).toMatch(/Stop/);
		expect(notes).toMatch(/[Mm]ods/);
	});

	it("names the settings file, in the guide", () => {
		expect(Object.keys(game.guide.files)).toEqual(["Config/ServerConfig.txt"]);
		expect(game.guide.files["Config/ServerConfig.txt"].length).toBeGreaterThan(10);
	});

	it("writes its guide's paths and notes with forward slashes only", () => {
		for (const note of game.guide.notes) expect(note).not.toMatch(/\\/);
	});
});

import { describe, it, expect } from "vitest";
import game from "../catalog/games/motortown.js";
import server from "../../../src/server/data/games/motortown.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Motor Town module", () => {
	it("has the shape a game module needs, and the type its server template uses", () => {
		expect(game.type).toBe("motortown");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Motor Town: Behind The Wheel");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeNull();
		expect(game.guide.name).toBe("Motor Town: Behind The Wheel");
	});

	it("has one settings file, DedicatedServerConfig.json, parsed as JSON", () => {
		expect(Object.keys(game.files)).toEqual(["DedicatedServerConfig.json"]);
		expect(game.files["DedicatedServerConfig.json"].parser).toBe("json");
	});

	it("offers the four keys the vendor guide describes, and no others", () => {
		const keys = Object.keys(game.files["DedicatedServerConfig.json"].settings);
		expect(keys.sort()).toEqual(["MaxPlayers", "Password", "ServerMessage", "ServerName"]);
	});

	it("gives every setting a label, an explanation of more than 10 characters and a group", () => {
		for (const [key, meta] of Object.entries(game.files["DedicatedServerConfig.json"].settings)) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("lists each dropdown choice once, with a label", () => {
		for (const [key, meta] of Object.entries(game.files["DedicatedServerConfig.json"].settings)) {
			if (!meta.options) continue;
			const values = meta.options.map((o) => o.value);
			expect(values.length, `${key} has no choices`).toBeGreaterThan(0);
			expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
			for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
		}
	});

	it("explains the sign-in, the port, the stop and the mods in the guide", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/[Ss]ign-in/);
		expect(notes).toMatch(/[Pp]ort/);
		expect(notes).toMatch(/Stop/);
		expect(notes).toMatch(/[Mm]ods/);
	});

	it("names the settings file, in the guide", () => {
		expect(Object.keys(game.guide.files)).toEqual(["DedicatedServerConfig.json"]);
		expect(game.guide.files["DedicatedServerConfig.json"].length).toBeGreaterThan(10);
	});

	it("writes its guide's paths and notes with forward slashes only", () => {
		for (const note of game.guide.notes) expect(note).not.toMatch(/\\/);
	});
});

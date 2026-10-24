import { describe, it, expect } from "vitest";
import game from "../catalog/games/assettocorsa.js";
import server from "../../../src/server/data/games/assettocorsa.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Assetto Corsa module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("assettocorsa");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Assetto Corsa");
		expect(server.launchOptions).toBe(false);
		expect(game.guide.name).toBe("Assetto Corsa");
	});

	it("has one settings file, the server_cfg.ini the panel also writes", () => {
		expect(Object.keys(game.files)).toEqual(["server_cfg.ini"]);
		expect(game.files["server_cfg.ini"].parser).toBe("ini");
	});

	it("explains the unknowns: the car slots, the stop and the defaults", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/entry_list/);
		expect(notes).toMatch(/stop/i);
		expect(notes).toMatch(/default/i);
	});
});

describe("Assetto Corsa settings", () => {
	const settings = game.files["server_cfg.ini"].settings;

	it("gives every setting a label, a description of more than ten characters, and a group", () => {
		for (const [key, meta] of Object.entries(settings)) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("lists each dropdown choice once, with a label", () => {
		for (const [key, meta] of Object.entries(settings)) {
			if (!meta.options) continue;
			const values = meta.options.map((o) => o.value);
			expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
			for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
		}
	});

	it("uses keys in the file's section::key form, and only groups it declares", () => {
		for (const key of Object.keys(settings)) expect(key).toMatch(/^[A-Z_]+::[A-Z_0-9]+$/);
		const groups = new Set(Object.values(settings).map((m) => m.group));
		for (const g of game.files["server_cfg.ini"].groupOrder) expect(groups.has(g), g).toBe(true);
	});

	it("keeps the password fields as text, and does not offer the conflicting ABS setting", () => {
		expect(settings["SERVER::ADMIN_PASSWORD"]).toBeTruthy();
		expect(settings["SERVER::PASSWORD"]).toBeTruthy();
		expect(settings["ASSIST_RULES::ABS_ALLOWED"]).toBeUndefined();
	});
});

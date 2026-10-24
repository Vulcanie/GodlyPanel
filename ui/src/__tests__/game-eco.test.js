import { describe, it, expect } from "vitest";
import game from "../catalog/games/eco.js";
import server from "../../../src/server/data/games/eco.js";
import { parseJsonConfig, flattenJsonEntries } from "../configParsers/json.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["Network.eco"];

describe("Eco module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("eco");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Eco");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 25980 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Eco");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeNull();
	});

	it("explains the port, the stop and the JSON question", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/Ports section does not update/);
		expect(notes).toMatch(/JSON/);
		expect(notes).toMatch(/closing its window/);
	});

	it("keeps the ports out of the form, because the Ports section does not update them", () => {
		const keys = Object.keys(game.files["Network.eco"].settings);
		expect(keys).not.toContain("GameServerPort");
		expect(keys).not.toContain("WebServerPort");
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Eco ${name} catalog`, () => {
		it("is read as JSON", () => {
			expect(file.parser).toBe("json");
		});

		it("gives every setting a label, an explanation and a group", () => {
			expect(settings.length).toBeGreaterThan(1);
			for (const [key, meta] of settings) {
				expect(meta.label?.trim(), `${key} label`).toBeTruthy();
				expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
				expect(meta.group?.trim(), `${key} group`).toBeTruthy();
			}
		});

		it("lists each choice of a dropdown once, with a label", () => {
			for (const [key, meta] of settings) {
				if (!meta.options) continue;
				const values = meta.options.map((o) => o.value);
				expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
				for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
			}
		});

		it("names only groups in groupOrder that exist, and puts every group in it", () => {
			const groups = new Set(settings.map(([, m]) => m.group));
			for (const g of file.groupOrder) expect(groups.has(g), g).toBe(true);
			for (const g of groups) expect(file.groupOrder.includes(g), `${g} is not in groupOrder`).toBe(true);
		});

		it("does not give two settings in a group the same label", () => {
			const seen = new Set();
			for (const [, meta] of settings) {
				const id = `${meta.group}/${meta.label}`;
				expect(seen.has(id), id).toBe(false);
				seen.add(id);
			}
		});

		it("has the name and the password the panel writes into the file", () => {
			const built = server.template.buildConfigFile({ name: "a", sessionName: "b", serverPassword: "", port: 25980 });
			const written = flattenJsonEntries(parseJsonConfig(built.content)).map((e) => e.path);
			expect(written).toEqual(expect.arrayContaining(["Name", "Password"]));
			expect(Object.keys(file.settings)).toEqual(expect.arrayContaining(["Name", "Password"]));
		});
	});
}

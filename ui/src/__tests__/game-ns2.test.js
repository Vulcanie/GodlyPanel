import { describe, it, expect } from "vitest";
import game from "../catalog/games/ns2.js";
import server from "../../../src/server/data/games/ns2.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["mapcycle.json"];

describe("Natural Selection 2 module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("ns2");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Natural Selection 2");
		expect(Object.keys(game.files)).toEqual(FILES);
		expect(server.launchOptions).toBe(true);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("Natural Selection 2");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
	});

	it("explains the stop, the port choice and the settings it does not show", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/27040/);
		expect(notes).toMatch(/serverconfig\.json/);
		expect(notes).toMatch(/clean stop/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Natural Selection 2 ${name} catalog`, () => {
		it("is read as JSON", () => {
			expect(file.parser).toBe("json");
			expect(settings.length).toBeGreaterThan(1);
		});

		it("gives every setting a label, an explanation and a group", () => {
			for (const [key, meta] of settings) {
				expect(meta.label?.trim(), `${key} label`).toBeTruthy();
				expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
				expect(meta.group?.trim(), `${key} group`).toBeTruthy();
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

		it("lists each dropdown choice once, with a label", () => {
			for (const [key, meta] of settings) {
				if (!meta.options) continue;
				const values = meta.options.map((o) => o.value);
				expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
				for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
			}
		});
	});
}

describe("Natural Selection 2 launch arguments", () => {
	const args = game.launch.args;

	it("gives every argument a label, an explanation and a group", () => {
		for (const a of args) {
			expect(a.label?.trim(), `${a.flag} label`).toBeTruthy();
			expect(a.description?.trim().length ?? 0, `${a.flag} description`).toBeGreaterThan(10);
			expect(a.group?.trim(), `${a.flag} group`).toBeTruthy();
		}
	});

	it("has unique flags", () => {
		const flags = args.map((a) => a.flag);
		expect(new Set(flags).size).toBe(flags.length);
	});

	it("lets the form change the map, the player limit and the mods, and not the name or the config folder", () => {
		expect(game.launch.editable).toBe(true);
		const editable = args.filter((a) => a.edit !== false).map((a) => a.flag);
		expect(editable).toEqual(expect.arrayContaining(["-map", "-limit", "-mods"]));
		for (const flag of ["-name", "-config_path"]) expect(args.find((a) => a.flag === flag).edit).toBe(false);
	});

	it("matches the start script the panel writes", () => {
		const script = server.template.buildStartScript({ name: "x", sessionName: "Friends", port: 27040, installDir: "C:\\ns2", startScriptFilename: "s.bat" });
		const line = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(line)).toBe(true);
		for (const flag of ["-name", "-map", "-limit", "-port", "-config_path"]) expect(line).toContain(flag);
	});
});

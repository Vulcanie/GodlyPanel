import { describe, it, expect } from "vitest";
import game from "../catalog/games/colonysurvival.js";
import server from "../../../src/server/data/games/colonysurvival.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["server.config.json"];

describe("Colony Survival module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("colonysurvival");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Colony Survival");
		expect(Object.keys(game.files)).toEqual(FILES);
		expect(game.launch).toBeNull();
		expect(server.launchOptions).toBe(false);
		expect(game.guide.name).toBe("Colony Survival");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
	});

	it("says what the panel does not manage and why", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/closing its window/);
		expect(notes).toMatch(/Workshop/);
		expect(notes).toMatch(/left out on purpose/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Colony Survival ${name} catalog`, () => {
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

		it("lists each choice of a dropdown once, with a label", () => {
			for (const [key, meta] of settings) {
				if (!meta.options) continue;
				const values = meta.options.map((o) => o.value);
				expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
				for (const o of meta.options) {
					expect(typeof o.value).toBe("string");
					expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
				}
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
	});
}

describe("Colony Survival settings match what the panel writes", () => {
	const s = game.files["server.config.json"].settings;
	const flat = (o, pre = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${pre}${k}.`) : [`${pre}${k}`]));
	const written = flat(JSON.parse(server.template.buildConfigFile({ name: "x", sessionName: "a", serverPassword: "", port: 25936 }).content));

	it("explains every key the panel writes that the form offers", () => {
		for (const k of ["ServerSettings.ServerName", "ServerSettings.ServerPassword", "ServerSettings.ServerGamePort", "ServerSettings.MaxPlayerCount", "NewOptions.WorldName", "NewOptions.DifficultyKey", "ServerSettings.RCONPassword"]) {
			expect(s[k], k).toBeTruthy();
		}
	});

	it("only offers keys the panel writes or the guides name", () => {
		for (const k of Object.keys(s)) expect(written.includes(k), k).toBe(true);
	});

	it("offers the difficulty levels the guides name, as numbers", () => {
		expect(s["NewOptions.DifficultyKey"].options.map((o) => o.value)).toEqual(["0", "1", "2", "3", "4"]);
		expect(s["NewOptions.DifficultyKey"].options.map((o) => o.label)).toEqual(["Peaceful", "Low", "Normal", "High", "Very High"]);
	});

	it("does not offer the Steam listing flags, which the guides name without saying what they do", () => {
		for (const k of ["ServerListPublicly", "ServerListLAN", "ServerListFriends", "MaxDrawDistance", "UseVAC"]) expect(s[k], k).toBeUndefined();
	});
});

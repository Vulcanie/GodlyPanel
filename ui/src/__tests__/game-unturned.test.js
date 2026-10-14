import { describe, it, expect } from "vitest";
import game from "../catalog/games/unturned.js";
import server from "../../../src/server/data/games/unturned.js";
import { parseConvarCfg, convarEntries, serializeConvarCfg } from "../configParsers/convarCfg.js";
import { parseJsonConfig, flattenJsonEntries, serializeJsonConfig } from "../configParsers/json.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["Commands.dat", "WorkshopDownloadConfig.json"];

describe("Unturned module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("unturned");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Unturned");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", instanceSlug: "a" });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Unturned");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
	});

	it("has no launch form: the server ID has to stay the last word of the launch line", () => {
		expect(game.launch).toBeNull();
		expect(server.launchOptions).toBe(false);
	});

	it("explains what is not in the form", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/Config\.txt/);
		expect(notes).toMatch(/no autosave/i);
		expect(notes).toMatch(/260 characters/);
		expect(notes).toMatch(/launch-options form/i);
		expect(game.guide.summary).toMatch(/-batchmode -nographics \+InternetServer/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Unturned ${name} catalog`, () => {
		it("gives every setting a label, an explanation and a group", () => {
			expect(settings.length).toBeGreaterThan(5);
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

describe("Unturned Commands.dat", () => {
	const file = game.files["Commands.dat"];
	const text = server.template.buildConfigFile({ sessionName: "Friends Camp", name: "x", serverPassword: "Pass1234", mapCode: "PEI", port: 27315, instanceSlug: "x" }).content;

	it("is read as one command and its value per line", () => {
		expect(file.parser).toBe("convar");
		expect(Object.keys(file.settings).sort()).toEqual(["GSLT", "Map", "MaxPlayers", "Mode", "Password", "Perspective", "Queue_Size", "Timeout"]);
	});

	it("offers the three difficulties the game accepts, and no other", () => {
		expect(file.settings.Mode.options.map((o) => o.value)).toEqual(["Easy", "Normal", "Hard"]);
		expect(file.settings.Mode.allowCustom).toBeUndefined();
	});

	it("offers the four camera words the game accepts", () => {
		expect(file.settings.Perspective.options.map((o) => o.value)).toEqual(["First", "Third", "Both", "Vehicle"]);
	});

	it("offers the five official maps and any other folder name", () => {
		expect(file.settings.Map.options.map((o) => o.value)).toEqual(["PEI", "Washington", "Yukon", "Russia", "Germany"]);
		expect(file.settings.Map.allowCustom).toBe(true);
	});

	it("keeps out of the form what the panel owns or the reader cannot write safely", () => {
		for (const key of ["Name", "Port", "Cheats", "PvE", "Owner", "Welcome"]) {
			expect(file.excludeKeys, key).toContain(key);
			expect(file.settings[key], key).toBeUndefined();
		}
	});

	it("explains the settings in the file the panel writes, and hides the rest", () => {
		const shown = parseConvarCfg(text).entries.filter((e) => !file.excludeKeys.includes(e.key)).map((e) => e.key);
		expect(shown.sort()).toEqual(["Map", "MaxPlayers", "Mode", "Password"]);
		for (const key of shown) expect(file.settings[key], key).toBeTruthy();
	});

	it("offers the settings the file does not have yet, so they can be filled in", () => {
		const entries = convarEntries(parseConvarCfg(text), Object.keys(file.settings));
		expect(entries.map((e) => e.key)).toEqual(expect.arrayContaining(["Perspective", "Queue_Size", "Timeout", "GSLT"]));
	});

	it("changes the difficulty on its own line only", () => {
		const parsed = parseConvarCfg(text);
		const mode = parsed.entries.find((e) => e.key === "Mode");
		const out = serializeConvarCfg(parsed, { [mode.id]: "Hard" });
		expect(out).toMatch(/^Mode Hard$/m);
		expect(out).toMatch(/^Name Friends Camp$/m);
		expect(out.split("\r\n").length).toBe(text.split("\r\n").length);
	});

	it("adds a setting the file does not have and takes it out again", () => {
		const parsed = parseConvarCfg(text);
		const added = serializeConvarCfg(parsed, { Perspective: "Both" });
		expect(added).toMatch(/^Perspective Both$/m);
		const again = parseConvarCfg(added);
		const entry = again.entries.find((e) => e.key === "Perspective");
		expect(serializeConvarCfg(again, { [entry.id]: "" })).toBe(text);
	});
});

describe("Unturned WorkshopDownloadConfig.json", () => {
	const file = game.files["WorkshopDownloadConfig.json"];
	const text = server.template.buildExtraFiles({ instanceSlug: "x", modIds: ["1753134636", "1753131903"] })[0].content;

	it("is read as JSON, and explains every key the game writes", () => {
		expect(file.parser).toBe("json");
		const entries = flattenJsonEntries(parseJsonConfig(text), new Set(file.structuredPaths));
		expect(entries.map((e) => e.path).sort()).toEqual(Object.keys(file.settings).sort());
	});

	it("shows the item list as a list and writes an edited list back as numbers", () => {
		const parsed = parseJsonConfig(text);
		const ids = flattenJsonEntries(parsed, new Set()).find((e) => e.path === "File_IDs");
		expect(ids.rawJson).toBe(true);
		expect(JSON.parse(ids.value)).toEqual([1753134636, 1753131903]);
		const out = JSON.parse(serializeJsonConfig(parsed, { File_IDs: [1753134636] }));
		expect(out.File_IDs).toEqual([1753134636]);
		expect(out.Max_Query_Retries).toBe(2);
	});
});

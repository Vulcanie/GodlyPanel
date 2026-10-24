import { describe, it, expect } from "vitest";
import game from "../catalog/games/pixark.js";

// PixARK's UI module: one settings file (GameUserSettings.ini) with one setting shown, and no launch form (the start line's settings
// are inside one quoted URL the form cannot read).

const files = Object.entries(game.files);
const settingsOf = (file) => Object.entries(file.settings);

describe("PixARK catalog module", () => {
	it("has its type, title and guide", () => {
		expect(game.type).toBe("pixark");
		expect(game.title).toBe("PixARK");
		expect(game.guide.name).toBe("PixARK");
		expect(game.guide.summary.length).toBeGreaterThan(40);
	});

	it("reads GameUserSettings.ini with the ini parser, and says what to do when it is missing", () => {
		expect(files.map(([name]) => name)).toEqual(["GameUserSettings.ini"]);
		const file = game.files["GameUserSettings.ini"];
		expect(file.parser).toBe("ini");
		expect(file.mayBeMissing.length).toBeGreaterThan(20);
		expect(file.groupOrder).toEqual(["Server"]);
	});

	it("gives every setting a label, an explanation and a group", () => {
		for (const [, file] of files) {
			for (const [key, meta] of settingsOf(file)) {
				expect(meta.label?.trim(), `${key} label`).toBeTruthy();
				expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
				expect(meta.group?.trim(), `${key} group`).toBeTruthy();
			}
		}
	});

	it("keys each setting as Section::Key, in a section the guides name", () => {
		const keys = settingsOf(game.files["GameUserSettings.ini"]).map(([key]) => key);
		expect(keys).toEqual(["ServerSettings::ServerPVE"]);
	});

	it("lists each dropdown choice once, with a label", () => {
		for (const [, file] of files) {
			for (const [key, meta] of settingsOf(file)) {
				if (!meta.options) continue;
				const values = meta.options.map((o) => o.value);
				expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
				for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
			}
		}
		const pve = game.files["GameUserSettings.ini"].settings["ServerSettings::ServerPVE"];
		expect(pve.options.map((o) => o.value)).toEqual(["true", "false"]);
	});

	it("offers no launch form (the start line's settings are in one quoted URL)", () => {
		expect(game.launch).toBeNull();
	});

	it("tells the guide reader what the start line and the port choices are", () => {
		expect(game.guide.notes.some((n) => /Ports\./.test(n))).toBe(true);
		expect(game.guide.notes.some((n) => /Passwords\./.test(n))).toBe(true);
		expect(game.guide.files["GameUserSettings.ini"]).toBeTruthy();
	});
});

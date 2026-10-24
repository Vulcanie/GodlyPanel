import { describe, it, expect } from "vitest";
import game from "../catalog/games/ballisticoverkill.js";
import server from "../../../src/server/data/games/ballisticoverkill.js";
import { parseProperties } from "../configParsers/properties.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["config.txt"];

describe("Ballistic Overkill module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("ballisticoverkill");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Ballistic Overkill");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 27080, queryPort: 27082 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Ballistic Overkill");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeNull();
	});

	it("explains what is left out and why", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/ports/);
		expect(notes).toMatch(/Stop/);
		expect(notes).toMatch(/base game/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Ballistic Overkill ${name} catalog`, () => {
		it("is read as Key=value lines", () => {
			expect(file.parser).toBe("properties");
			expect(settings.length).toBeGreaterThan(5);
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

describe("Ballistic Overkill settings", () => {
	const s = game.files["config.txt"].settings;

	it("offers the match map and mode as the numbered lists the example file gives", () => {
		expect(s.GameMap.options.map((o) => o.value)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
		expect(s.GameMode.options.map((o) => o.value)).toEqual(["1", "2", "3", "4", "5"]);
		expect(s.Autobalance.options.map((o) => o.value)).toEqual(["0", "1"]);
	});

	it("leaves out the ports, which the panel sets, and the broadcast mode, whose sources disagree", () => {
		for (const k of ["ServerPort", "QueryPort", "DedicatedBroadcast", "MaxSpectators"]) expect(s[k], k).toBeUndefined();
	});

	it("keeps the settings the example file explains", () => {
		for (const k of ["ServerName", "Password", "MaxPlayers", "MaxPing", "MatchTime", "WarmUpTime", "BannerURL", "ClickURL", "OwnerId"]) expect(s[k], k).toBeTruthy();
	});
});

describe("Ballistic Overkill config.txt as the panel writes it", () => {
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends", serverPassword: "Pass1234", port: 27080, queryPort: 27082 }).content;

	it("shows the name and password, and the ports the panel wrote, as keys the form knows or leaves out", () => {
		const entries = parseProperties(text).entries;
		expect(entries.map((e) => e.key)).toEqual(["ServerName", "ServerPort", "QueryPort", "Password"]);
		expect(entries.find((e) => e.key === "ServerName").value).toBe("Friends");
		expect(entries.find((e) => e.key === "Password").value).toBe("Pass1234");
		expect(game.files["config.txt"].settings.ServerName).toBeTruthy();
	});
});

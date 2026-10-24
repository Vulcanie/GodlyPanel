import { describe, it, expect } from "vitest";
import game from "../catalog/games/towerunite.js";
import server from "../../../src/server/data/games/towerunite.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const file = game.files["TowerServer.ini"];

describe("Tower Unite module", () => {
	it("has the shape a game module needs, and the type its server template uses", () => {
		expect(game.type).toBe("towerunite");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Tower Unite");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeNull();
		expect(game.guide.name).toBe("Tower Unite");
	});

	it("has one settings file, TowerServer.ini, read with the INI parser", () => {
		expect(Object.keys(game.files)).toEqual(["TowerServer.ini"]);
		expect(file.parser).toBe("ini");
	});

	it("gives every setting a label, an explanation of more than ten characters and a group", () => {
		for (const [key, meta] of Object.entries(file.settings)) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("names only groups that exist in its group order", () => {
		const groups = new Set(Object.values(file.settings).map((m) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), g).toBe(true);
	});

	it("lists each choice of a dropdown once, with a label", () => {
		for (const [key, meta] of Object.entries(file.settings)) {
			if (!meta.options) continue;
			const values = meta.options.map((o) => o.value);
			expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
			for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
		}
	});

	it("uses section::key names that match the server's settings file", () => {
		const keys = Object.keys(file.settings);
		expect(keys).toContain("/script/towernetworking.dedicatedserveroptions::ServerTitle");
		expect(keys).toContain("/script/towernetworking.dedicatedserveroptions::MaxPlayers");
		expect(keys).toContain("Administration::AdminSteamID");
		expect(keys).toContain("DedicatedCondoOptions::CondoAutoSave");
	});

	it("keeps the login tokens and the settings the panel writes in the catalog", () => {
		const written = server.template.buildConfigFile({ name: "x", sessionName: "Friends", port: 7800, installDir: "C:\\tu" }).content;
		for (const line of written.split("\r\n").filter((l) => l.includes("="))) {
			const [key] = line.split("=");
			const section = written.split("\r\n").slice(0, written.split("\r\n").indexOf(line)).filter((l) => l.startsWith("[")).pop();
			const name = section.slice(1, -1) + "::" + key;
			expect(file.settings[name], `${name} is written by the panel but not explained`).toBeTruthy();
		}
	});
});

describe("Tower Unite guide", () => {
	it("explains the unknowns: the tokens, the stop, the folder and the ports", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/token/i);
		expect(notes).toMatch(/Stop/);
		expect(notes).toMatch(/TowerServer\.exe/);
		expect(notes).toMatch(/7800/);
		expect(notes).toMatch(/27016/);
	});

	it("writes its notes with forward slashes only", () => {
		for (const note of game.guide.notes) expect(note).not.toMatch(/\\/);
		expect(game.guide.files["TowerServer.ini"]).not.toMatch(/\\/);
	});
});

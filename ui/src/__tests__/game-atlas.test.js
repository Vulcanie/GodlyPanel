import { describe, it, expect } from "vitest";
import game from "../catalog/games/atlas.js";
import server from "../../../src/server/data/games/atlas.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("ATLAS module", () => {
	it("has the shape a game module needs, and the type its server template uses", () => {
		expect(game.type).toBe("atlas");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("ATLAS");
		expect(server.launchOptions).toBe(false);
		expect(game.guide.name).toBe("ATLAS");
	});

	it("has two settings files: the game's ini and the Ocean grid's json", () => {
		expect(Object.keys(game.files).sort()).toEqual(["GameUserSettings.ini", "ServerGrid.json"]);
		expect(game.files["GameUserSettings.ini"].parser).toBe("ini");
		expect(game.files["ServerGrid.json"].parser).toBe("json");
	});

	it("keeps the documented rates and passwords, and leaves out the keys the guides disagree on", () => {
		const keys = Object.keys(game.files["GameUserSettings.ini"].settings).map((k) => k.split("::")[1]);
		for (const key of ["XPMultiplier", "TamingSpeedMultiplier", "HarvestAmountMultiplier", "ServerPassword"]) {
			expect(keys).toContain(key);
		}
		for (const key of ["ActiveMods", "ServerAdminPassword", "GameModIds"]) {
			expect(keys).not.toContain(key);
		}
	});

	it("gives every setting a label, an explanation of more than 10 characters and a group", () => {
		for (const file of Object.values(game.files)) {
			for (const [key, meta] of Object.entries(file.settings)) {
				expect(meta.label?.trim(), `${key} label`).toBeTruthy();
				expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
				expect(meta.group?.trim(), `${key} group`).toBeTruthy();
			}
		}
	});

	it("lists each dropdown choice once, with a label", () => {
		for (const file of Object.values(game.files)) {
			for (const [key, meta] of Object.entries(file.settings)) {
				if (!meta.options) continue;
				const values = meta.options.map((o) => o.value);
				expect(values.length, `${key} has no choices`).toBeGreaterThan(0);
				expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
				for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
			}
		}
	});

	it("has a launch form whose program matches the exe the start script runs", () => {
		expect(game.launch).not.toBeNull();
		expect(game.launch.editable).toBe(false);
		expect(game.launch.program.test('start /MIN "x" ShooterGame\\Binaries\\Win64\\ShooterGameServer.exe Ocean?Port=7400 -log -server')).toBe(true);
		expect(game.launch.program.test("start /MIN \"x\" CoreKeeperServer.exe -port 7400")).toBe(false);
	});

	it("gives every launch flag a label, a description and a group, and no two editable flags share a name", () => {
		const editable = [];
		for (const arg of game.launch.args) {
			expect(arg.label?.trim(), `${arg.flag} label`).toBeTruthy();
			expect(arg.description?.trim().length ?? 0, `${arg.flag} description`).toBeGreaterThan(15);
			expect(arg.group?.trim(), `${arg.flag} group`).toBeTruthy();
			if (arg.edit !== false) editable.push(arg.flag.replace(/^[-+]+/, ""));
		}
		expect(new Set(editable).size).toBe(editable.length);
	});

	it("keeps the flags the panel writes out of the form, so they cannot be edited away", () => {
		const locked = game.launch.args.filter((a) => a.edit === false).map((a) => a.flag);
		expect(locked.sort()).toEqual(["-NoBattlEye", "-log", "-server"]);
	});

	it("explains the port, the stop and the mods in the guide", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/[Pp]ort/);
		expect(notes).toMatch(/Stop/);
		expect(notes).toMatch(/[Mm]ods/);
	});

	it("names both settings files, in the guide", () => {
		expect(Object.keys(game.guide.files).sort()).toEqual(["GameUserSettings.ini", "ServerGrid.json"]);
		for (const text of Object.values(game.guide.files)) expect(text.length).toBeGreaterThan(10);
	});

	it("writes its guide's notes with forward slashes only", () => {
		for (const note of game.guide.notes) expect(note).not.toMatch(/\\/);
	});
});

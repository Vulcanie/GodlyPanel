import { describe, it, expect } from "vitest";
import game from "../catalog/games/empyrion.js";
import server from "../../../src/server/data/games/empyrion.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Empyrion module", () => {
	it("has the shape a game module needs, and the type its server template uses", () => {
		expect(game.type).toBe("empyrion");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Empyrion - Galactic Survival");
		expect(server.launchOptions).toBe(true);
		expect(game.guide.name).toBe("Empyrion - Galactic Survival");
	});

	it("has no settings file editor: dedicated.yaml has no parser, so only the launch arguments are offered", () => {
		expect(Object.keys(game.files)).toEqual([]);
		expect(game.launch).toBeTruthy();
		expect(game.launch.editable).toBe(true);
	});

	it("finds the server exe line in the start script", () => {
		const line = 'start /MIN "My Empyrion" EmpyrionDedicated.exe -batchmode -nographics -logFile "../Logs/server/server.log"';
		expect(game.launch.program.test(line)).toBe(true);
		expect(game.launch.program.test('start /MIN "x" ArkAscendedServer.exe -port=7015')).toBe(false);
	});

	it("gives every launch argument a label, an explanation of more than 10 characters and a group", () => {
		for (const arg of game.launch.args) {
			expect(arg.label?.trim(), `${arg.flag} label`).toBeTruthy();
			expect(arg.description?.trim().length ?? 0, `${arg.flag} description`).toBeGreaterThan(10);
			expect(arg.group?.trim(), `${arg.flag} group`).toBeTruthy();
		}
	});

	it("lists each flag once", () => {
		const flags = game.launch.args.map((a) => a.flag);
		expect(new Set(flags).size).toBe(flags.length);
	});

	it("keeps the flags the panel writes out of the form, and says so", () => {
		const byFlag = Object.fromEntries(game.launch.args.map((a) => [a.flag, a]));
		for (const flag of ["-batchmode", "-nographics"]) {
			expect(byFlag[flag], flag).toBeTruthy();
			expect(byFlag[flag].edit, flag).toBe(false);
			expect(byFlag[flag].managed, flag).toBe(true);
		}
	});

	it("explains the stop, the telnet console and the port in the guide, with forward slashes only", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/[Ss]top/);
		expect(notes).toMatch(/[Tt]elnet/);
		expect(notes).toMatch(/[Pp]ort/);
		for (const note of game.guide.notes) expect(note).not.toMatch(/\\/);
		expect(game.guide.summary).not.toMatch(/\\/);
	});
});

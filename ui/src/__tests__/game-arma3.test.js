import { describe, it, expect } from "vitest";
import game from "../catalog/games/arma3.js";
import server from "../../../src/server/data/games/arma3.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Arma 3 module", () => {
	it("has the shape a game module needs, and the type its server template uses", () => {
		expect(game.type).toBe("arma3");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Arma 3");
		expect(server.launchOptions).toBe(true);
		expect(game.guide.name).toBe("Arma 3");
	});

	it("has no settings file editor: server.cfg has no parser, so only the launch arguments are offered", () => {
		expect(Object.keys(game.files)).toEqual([]);
		expect(game.launch).toBeTruthy();
		expect(game.launch.editable).toBe(true);
	});

	it("finds the server exe line in the start script", () => {
		const line = 'start /MIN "My Arma Server" arma3server.exe "-profiles=%~dp0profiles" -port=2302 -config=server.cfg -world=empty';
		expect(game.launch.program.test(line)).toBe(true);
		expect(game.launch.program.test("start /MIN \"x\" CoreKeeperServer.exe -port 27015")).toBe(false);
	});

	it("gives every launch argument a label, an explanation of more than 10 characters and a group", () => {
		for (const arg of game.launch.args) {
			expect(arg.label?.trim(), `${arg.flag} label`).toBeTruthy();
			expect(arg.description?.trim().length ?? 0, `${arg.flag} description`).toBeGreaterThan(10);
			expect(arg.group?.trim(), `${arg.flag} group`).toBeTruthy();
		}
	});

	it("lists each flag once and writes each one the way the dossier does", () => {
		const flags = game.launch.args.map((a) => a.flag);
		expect(new Set(flags).size).toBe(flags.length);
		for (const flag of flags) expect(flag).toMatch(/^-[A-Za-z]+$/);
	});

	it("keeps the panel's own port, config and profile arguments out of the form", () => {
		const byFlag = Object.fromEntries(game.launch.args.map((a) => [a.flag, a]));
		for (const flag of ["-port", "-config", "-profiles"]) {
			expect(byFlag[flag], flag).toBeTruthy();
			expect(byFlag[flag].edit, flag).toBe(false);
			expect(byFlag[flag].managed, flag).toBe(true);
		}
	});

	it("leaves out -setThreadCharacteristics, which the wiki warns can freeze Windows Server", () => {
		expect(game.launch.args.map((a) => a.flag)).not.toContain("-setThreadCharacteristics");
	});

	it("explains the admin password, the join password and the stop in the guide, with forward slashes only", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/[Ss]top/);
		expect(notes).toMatch(/[Aa]dmin/);
		expect(notes).toMatch(/[Mm]ods/);
		for (const note of game.guide.notes) expect(note).not.toMatch(/\\/);
		expect(game.guide.summary).not.toMatch(/\\/);
	});
});

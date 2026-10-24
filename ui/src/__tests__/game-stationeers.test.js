import { describe, it, expect } from "vitest";
import game from "../catalog/games/stationeers.js";
import server from "../../../src/server/data/games/stationeers.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Stationeers module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("stationeers");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Stationeers");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("Stationeers");
	});

	it("has no settings file: setting.xml's folder is not evidenced, so the settings go on the launch line", () => {
		expect(Object.keys(game.files)).toEqual([]);
	});

	it("explains the restart and the save, the stop, and the backup", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/restart/i);
		expect(notes).toMatch(/save/i);
		expect(notes).toMatch(/stop/i);
	});
});

describe("Stationeers launch arguments", () => {
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

	it("is not edited in the form, and lists the flags the panel writes", () => {
		expect(game.launch.editable).toBe(false);
		expect(args.map((a) => a.flag)).toEqual(["-LOAD", "-settings"]);
		for (const a of args) expect(a.managed).toBe(true);
	});

	it("matches the start script the panel writes", () => {
		const script = server.template.buildStartScript({ name: "x", sessionName: "Friends", mapCode: "Mars2", serverPassword: "", port: 27816, queryPort: 27818, installDir: "C:\st", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		for (const a of args) expect(launch).toContain(a.flag);
	});
});

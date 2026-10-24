import { describe, it, expect } from "vitest";
import game from "../catalog/games/ohd.js";
import server from "../../../src/server/data/games/ohd.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("OHD module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("ohd");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Operation: Harsh Doorstop");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("Operation: Harsh Doorstop");
	});

	it("has no settings file: the Game.ini folder for Windows is not evidenced, and its keys conflict between sources", () => {
		expect(Object.keys(game.files)).toEqual([]);
	});

	it("explains the unknowns: the Windows program, the ports, the mods and the stop", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/Windows/);
		expect(notes).toMatch(/port/i);
		expect(notes).toMatch(/mod/i);
		expect(notes).toMatch(/stop/i);
	});
});

describe("OHD launch arguments", () => {
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
		expect(args.map((a) => a.flag)).toEqual(["-SteamServerName", "-Port", "-MULTIHOME", "-QueryPort"]);
		for (const a of args) expect(a.managed).toBe(true);
	});

	it("matches the start script the panel writes", () => {
		const script = server.template.buildStartScript({ name: "x", sessionName: "Friends", mapCode: "Jaziira_AASSmall", port: 27050, queryPort: 27052, installDir: "C:\\ohd", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		for (const a of args) expect(launch).toContain(a.flag);
	});
});

import { describe, it, expect } from "vitest";
import game from "../catalog/games/miscreated.js";
import server from "../../../src/server/data/games/miscreated.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Miscreated module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("miscreated");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Miscreated");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("Miscreated");
	});

	it("has no settings file: hosting.cfg is key=\"value\" lines, which no parser reads without its quotes", () => {
		expect(Object.keys(game.files)).toEqual([]);
	});

	it("explains the unknowns: the stop, the -sv_bind address, the mods and the RCON", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/stop/i);
		expect(notes).toMatch(/sv_bind/);
		expect(notes).toMatch(/steam_ugc|mod/i);
		expect(notes).toMatch(/rcon/i);
	});
});

describe("Miscreated launch arguments", () => {
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

	it("is not edited in the form, and lists the arguments the panel writes", () => {
		expect(game.launch.editable).toBe(false);
		expect(args.map((a) => a.flag)).toEqual(["-mis_gameserverid", "-sv_port", "+sv_servername"]);
		for (const a of args) expect(a.managed).toBe(true);
	});

	it("matches the start script the panel writes", () => {
		const script = server.template.buildStartScript({ name: "x", sessionName: "Friends", port: 27960, installDir: "C:\mis", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		for (const a of args) expect(launch).toContain(a.flag);
	});
});

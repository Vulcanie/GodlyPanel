import { describe, it, expect } from "vitest";
import game from "../catalog/games/ats.js";
import server from "../../../src/server/data/games/ats.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("ATS module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("ats");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("American Truck Simulator");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("American Truck Simulator");
	});

	it("has no settings file: server_config.sii is SiiNunit, which no parser reads", () => {
		expect(Object.keys(game.files)).toEqual([]);
	});

	it("explains the things the panel cannot do: the package files, the stop, the settings file and the logon token", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/server_packages/);
		expect(notes).toMatch(/Ctrl/);
		expect(notes).toMatch(/server_config\.sii/);
		expect(notes).toMatch(/token/i);
	});
});

describe("ATS launch arguments", () => {
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

	it("is not edited in the form, and lists only the flag the panel writes", () => {
		expect(game.launch.editable).toBe(false);
		expect(args.map((a) => a.flag)).toEqual(["-homedir"]);
		for (const a of args) expect(a.managed).toBe(true);
	});

	it("matches the start script the panel writes", () => {
		const script = server.template.buildStartScript({ name: "x", sessionName: "Friends", port: 27500, queryPort: 27502, installDir: "C:\\ats", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		for (const a of args) expect(launch).toContain(a.flag);
	});
});

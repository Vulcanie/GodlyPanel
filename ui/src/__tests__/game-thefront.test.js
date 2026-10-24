import { describe, it, expect } from "vitest";
import game from "../catalog/games/thefront.js";
import server from "../../../src/server/data/games/thefront.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("The Front module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("thefront");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("The Front");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("The Front");
	});

	it("offers the manager's settings file with one parser the panel has", () => {
		expect(Object.keys(game.files)).toEqual(["ServerConfig_.ini"]);
		expect(game.files["ServerConfig_.ini"].parser).toBe("ini");
	});

	it("names every setting as Section::Key, in the section the file uses", () => {
		for (const key of Object.keys(game.files["ServerConfig_.ini"].settings)) {
			expect(key.startsWith("BaseServerConfig::"), key).toBe(true);
		}
	});

	it("explains the unknowns: the stop, the mods, the backup of the world and the missing log", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/stop/i);
		expect(notes).toMatch(/mod/i);
		expect(notes).toMatch(/world/i);
		expect(notes).toMatch(/log/i);
	});
});

describe("The Front settings", () => {
	const settings = Object.entries(game.files["ServerConfig_.ini"].settings);

	it("gives every setting a label, an explanation and a group", () => {
		for (const [key, meta] of settings) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("only groups that are listed in the group order", () => {
		const order = game.files["ServerConfig_.ini"].groupOrder;
		for (const [, meta] of settings) expect(order).toContain(meta.group);
	});

	it("does not offer a dropdown, because the sources do not give the values", () => {
		for (const [key, meta] of settings) expect(meta.options, key).toBeUndefined();
	});
});

describe("The Front launch arguments", () => {
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
		expect(args.map((a) => a.flag)).toEqual(["-port", "-ServerName", "-QueueThreshold"]);
		for (const a of args) expect(a.managed).toBe(true);
	});

	it("matches the start script the panel writes, with the program path that has its backslashes", () => {
		const script = server.template.buildStartScript({ name: "x", sessionName: "Friends", port: 7900, installDir: "C:\\front", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		expect(launch).toContain("ProjectWar\\Binaries\\Win64\\TheFrontServer.exe");
		for (const a of args) expect(launch).toContain(a.flag);
	});
});

import { describe, it, expect } from "vitest";
import game from "../catalog/games/redorchestra.js";
import server from "../../../src/server/data/games/redorchestra.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Red Orchestra module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("redorchestra");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Red Orchestra: Ostfront 41-45");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("Red Orchestra: Ostfront 41-45");
	});

	it("keeps its settings file under the name the server module writes it as", () => {
		expect(Object.keys(game.files)).toEqual(["RedOrchestra.ini"]);
		expect(server.template.patchInstalledConfig.relPath).toBe("system\\RedOrchestra.ini");
		expect(server.template.buildServerEntry({ name: "x", installDir: "C:\\ro", startScriptFilename: "s.bat", port: 7757 }).configPaths["RedOrchestra.ini"]).toBe("C:\\ro\\system\\RedOrchestra.ini");
	});

	it("gives every setting a label, an explanation longer than 10 characters, and a group", () => {
		for (const [key, meta] of Object.entries(game.files["RedOrchestra.ini"].settings)) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("does not offer the map list, which is a repeated key the form cannot edit", () => {
		expect(Object.keys(game.files["RedOrchestra.ini"].settings).some((k) => /Maps$/.test(k))).toBe(false);
	});

	it("explains the unknowns: the program, the stop, the port and the custom maps", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/not confirmed|not checked/i);
		expect(notes).toMatch(/graceful stop/i);
		expect(notes).toMatch(/7757/);
		expect(notes).toMatch(/Maps/);
	});
});

describe("Red Orchestra launch arguments", () => {
	const args = game.launch.args;

	it("gives every argument a label, an explanation and a group", () => {
		for (const a of args) {
			expect(a.label?.trim(), `${a.flag} label`).toBeTruthy();
			expect(a.description?.trim().length ?? 0, `${a.flag} description`).toBeGreaterThan(10);
			expect(a.group?.trim(), `${a.flag} group`).toBeTruthy();
		}
	});

	it("has unique flags and is not edited in the form", () => {
		const flags = args.map((a) => a.flag);
		expect(new Set(flags).size).toBe(flags.length);
		expect(game.launch.editable).toBe(false);
	});

	it("matches the start script the panel writes", () => {
		const script = server.template.buildStartScript({ name: "x", sessionName: "Friends", mapCode: "RO-Konigsplatz.rom", port: 7757, installDir: "C:\\ro", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		for (const a of args) expect(launch).toContain(a.flag);
	});
});

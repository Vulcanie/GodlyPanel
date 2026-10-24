import { describe, it, expect } from "vitest";
import game from "../catalog/games/ageofchivalry.js";
import server from "../../../src/server/data/games/ageofchivalry.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Age of Chivalry module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("ageofchivalry");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Age of Chivalry");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("Age of Chivalry");
	});

	it("has the one settings file the panel writes, read by the convar parser", () => {
		expect(Object.keys(game.files)).toEqual(["server.cfg"]);
		expect(game.files["server.cfg"].parser).toBe("convar");
	});

	it("explains the unknowns: the stop, the anonymous install, the mods and the query port", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/stop/i);
		expect(notes).toMatch(/anonymous/i);
		expect(notes).toMatch(/mods/i);
		expect(notes).toMatch(/SourceTV/);
	});
});

describe("Age of Chivalry settings", () => {
	const file = game.files["server.cfg"];
	const settings = Object.entries(file.settings);

	it("gives every setting a label, an explanation and a group", () => {
		expect(settings.length).toBeGreaterThan(0);
		for (const [key, meta] of settings) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("lists each choice of a dropdown once, with a label", () => {
		for (const [key, meta] of settings) {
			if (!meta.options) continue;
			const values = meta.options.map((o) => o.value);
			expect(new Set(values).size, `${key} repeats a choice: ${values.join(", ")}`).toBe(values.length);
			for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
		}
	});

	it("only names groups in groupOrder that exist", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), `groupOrder lists "${g}" but no setting is in it`).toBe(true);
	});

	it("writes the server name and LAN flag the panel sets, with the same keys as the template", () => {
		const cfg = server.template.buildConfigFile({ name: "x", sessionName: "Friends", port: 27030, installDir: "C:\\aoc" });
		const keys = cfg.content
			.split("\r\n")
			.map((l) => /^([A-Za-z_]+) /.exec(l)?.[1])
			.filter(Boolean);
		for (const k of keys) expect(Object.keys(file.settings), `${k} is written but not described`).toContain(k);
	});
});

describe("Age of Chivalry launch arguments", () => {
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

	it("is not edited in the form, and every argument is one the panel writes", () => {
		expect(game.launch.editable).toBe(false);
		for (const a of args) expect(a.managed, a.flag).toBe(true);
	});

	it("matches the start script the panel writes", () => {
		const script = server.template.buildStartScript({ name: "x", sessionName: "Friends", port: 27030, installDir: "C:\\aoc", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		for (const flag of ["-console", "-game", "-secure", "+map", "+log", "+maxplayers", "-port", "+ip", "+exec"]) {
			expect(args.map((a) => a.flag), flag).toContain(flag);
			expect(launch.split(" ")).toContain(flag);
		}
	});
});

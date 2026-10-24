import { describe, it, expect } from "vitest";
import game from "../catalog/games/craftopia.js";
import server from "../../../src/server/data/games/craftopia.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Craftopia module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("craftopia");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Craftopia");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("Craftopia");
	});

	it("reads ServerSetting.ini with the ini parser", () => {
		expect(Object.keys(game.files)).toEqual(["ServerSetting.ini"]);
		expect(game.files["ServerSetting.ini"].parser).toBe("ini");
	});

	it("explains the unknowns: the stop, the build, the password and the save folder", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/stop|ctrl/i);
		expect(notes).toMatch(/legacy|build/i);
		expect(notes).toMatch(/password/i);
		expect(notes).toMatch(/save/i);
	});
});

describe("Craftopia settings file", () => {
	const file = game.files["ServerSetting.ini"];
	const settings = Object.entries(file.settings);

	it("gives every setting a label, an explanation and a group", () => {
		expect(settings.length).toBeGreaterThan(0);
		for (const [key, meta] of settings) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("lists each dropdown choice once, with a label", () => {
		for (const [key, meta] of settings) {
			if (!meta.options) continue;
			const values = meta.options.map((o) => o.value);
			expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
			for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
		}
	});

	it("only names groups in groupOrder that exist", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), `groupOrder lists "${g}"`).toBe(true);
	});

	it("names only keys the panel writes, in Section::Key form", () => {
		const written = server.template.buildConfigFile({ name: "x", sessionName: "y", port: 27980 }).content;
		for (const [key] of settings) {
			const [section, name] = key.split("::");
			expect(section && name, key).toBeTruthy();
			expect(written, key).toMatch(new RegExp(`\\[${section}\\][\\s\\S]*?^${name}=`, "m"));
		}
	});
});

describe("Craftopia launch arguments", () => {
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
		expect(args.map((a) => a.flag)).toEqual(["-batchmode", "-showlogs"]);
		for (const a of args) expect(a.managed).toBe(true);
	});

	it("matches the start script the panel writes", () => {
		const script = server.template.buildStartScript({ name: "x", sessionName: "y", port: 27980, installDir: "C:\\cr", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		for (const a of args) expect(launch).toContain(a.flag);
	});
});

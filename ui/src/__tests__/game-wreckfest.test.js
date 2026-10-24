import { describe, it, expect } from "vitest";
import game from "../catalog/games/wreckfest.js";
import server from "../../../src/server/data/games/wreckfest.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Wreckfest module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("wreckfest");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Wreckfest");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("Wreckfest");
	});

	it("has one settings file, server_config.cfg, that the server template names", () => {
		expect(Object.keys(game.files)).toEqual(["server_config.cfg"]);
		expect(game.files["server_config.cfg"].parser).toBe("properties");
		expect(Object.keys(server.template.buildServerEntry({ name: "x", port: 33540, installDir: "C:\\w", startScriptFilename: "s.bat" }).configPaths)).toEqual(["server_config.cfg"]);
	});

	it("explains the unknowns: the defaults, the save folder, the stop and the password", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/default/i);
		expect(notes).toMatch(/save/i);
		expect(notes).toMatch(/stop/i);
		expect(notes).toMatch(/password/i);
	});
});

describe("Wreckfest settings file", () => {
	const file = game.files["server_config.cfg"];
	const settings = Object.entries(file.settings);

	it("gives every setting a label, an explanation of more than ten characters, and a group", () => {
		expect(settings.length).toBeGreaterThan(20);
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

	it("only names groups in its order that exist", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), `groupOrder lists "${g}"`).toBe(true);
	});

	it("leaves out the join password, which the example file gives no explanation for", () => {
		expect(file.settings.password).toBeUndefined();
	});
});

describe("Wreckfest launch arguments", () => {
	const args = game.launch.args;

	it("gives every argument a label, an explanation and a group", () => {
		for (const a of args) {
			expect(a.label?.trim(), `${a.flag} label`).toBeTruthy();
			expect(a.description?.trim().length ?? 0, `${a.flag} description`).toBeGreaterThan(10);
			expect(a.group?.trim(), `${a.flag} group`).toBeTruthy();
		}
	});

	it("has unique flags, is not edited in the form, and matches the start script", () => {
		const flags = args.map((a) => a.flag);
		expect(new Set(flags).size).toBe(flags.length);
		expect(game.launch.editable).toBe(false);
		for (const a of args) expect(a.managed).toBe(true);
		const script = server.template.buildStartScript({ name: "x", port: 33540, installDir: "C:\\w", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		for (const a of args) expect(launch).toContain(a.flag);
	});
});

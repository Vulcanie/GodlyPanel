import { describe, it, expect } from "vitest";
import game from "../catalog/games/risingstorm2.js";
import server from "../../../src/server/data/games/risingstorm2.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("Rising Storm 2 module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("risingstorm2");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Rising Storm 2: Vietnam");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("Rising Storm 2: Vietnam");
		expect(Object.keys(game.files)).toEqual(["ROGame.ini"]);
	});

	it("explains the unknowns: the mods, the stop, the log and the defaults", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/mod|workshop/i);
		expect(notes).toMatch(/stop/i);
		expect(notes).toMatch(/default/i);
	});
});

describe("Rising Storm 2 settings file (ROGame.ini)", () => {
	const file = game.files["ROGame.ini"];
	const settings = Object.entries(file.settings);

	it("gives every setting a label, an explanation of more than 10 characters, and a group", () => {
		expect(settings.length).toBeGreaterThan(15);
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
			expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
			for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
		}
	});

	it("names only groups in groupOrder that exist, and uses sections that are keys of the file", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), `groupOrder lists "${g}" but no setting is in it`).toBe(true);
		for (const [key] of settings) expect(key).toMatch(/^[A-Za-z.]+::[A-Za-z]+$/);
	});

	it("keeps the server name and the join password, which the panel writes when it creates the server", () => {
		expect(settings.map(([k]) => k)).toEqual(expect.arrayContaining(["Engine.GameReplicationInfo::ServerName", "Engine.AccessControl::GamePassword"]));
	});
});

describe("Rising Storm 2 launch arguments", () => {
	const args = game.launch.args;

	it("gives every argument a label, an explanation and a group", () => {
		for (const a of args) {
			expect(a.label?.trim(), `${a.flag} label`).toBeTruthy();
			expect(a.description?.trim().length ?? 0, `${a.flag} description`).toBeGreaterThan(10);
			expect(a.group?.trim(), `${a.flag} group`).toBeTruthy();
		}
	});

	it("has unique flags, is not edited in the form, and lists the flags the panel writes", () => {
		const flags = args.map((a) => a.flag);
		expect(new Set(flags).size).toBe(flags.length);
		expect(game.launch.editable).toBe(false);
		expect(flags).toEqual(["-Port", "-QueryPort"]);
		for (const a of args) expect(a.managed).toBe(true);
	});

	it("matches the start script the panel writes", () => {
		const script = server.template.buildStartScript({ name: "x", sessionName: "Friends", mapCode: "VNSU-SongBe", port: 27070, queryPort: 27072, installDir: "C:\\rs2", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		for (const a of args) expect(launch).toContain(a.flag);
	});
});

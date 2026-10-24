import { describe, it, expect } from "vitest";
import game from "../catalog/games/humanitz.js";
import server from "../../../src/server/data/games/humanitz.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

describe("HumanitZ module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("humanitz");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("HumanitZ");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("HumanitZ");
	});

	it("has one settings file, GameServerSettings.ini, read by the ini parser", () => {
		expect(Object.keys(game.files)).toEqual(["GameServerSettings.ini"]);
		expect(game.files["GameServerSettings.ini"].parser).toBe("ini");
		expect(game.files["GameServerSettings.ini"].sectionLabels).toEqual({
			"Host Settings": "Host settings",
			"World Settings": "World settings",
		});
	});

	it("explains the unknowns: the stop, the mods and the Windows program name", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/stop/i);
		expect(notes).toMatch(/mods/i);
		expect(notes).toMatch(/Official/);
	});
});

describe("HumanitZ settings", () => {
	const file = game.files["GameServerSettings.ini"];
	const settings = Object.entries(file.settings);

	it("uses only keys of the two sections, written as Section::Key", () => {
		for (const [key] of settings) expect(key).toMatch(/^(Host Settings|World Settings)::[A-Za-z]+$/);
	});

	it("leaves out the RCON password and the other keys no page explains", () => {
		const keys = settings.map(([k]) => k.split("::")[1]);
		for (const k of ["RCONPass", "RConPort", "RCONEnabled", "SaveName", "Version", "MapSeg0", "Weather_Rain"]) expect(keys, k).not.toContain(k);
	});

	it("gives every setting a label, an explanation and a group", () => {
		expect(settings.length).toBeGreaterThan(50);
		for (const [key, meta] of settings) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("lists each choice of a dropdown once, with a label", () => {
		for (const [key, meta] of settings) {
			if (!meta.options) continue;
			expect(meta.options.length, `${key} has an empty list of choices`).toBeGreaterThan(0);
			const values = meta.options.map((o) => o.value);
			expect(new Set(values).size, `${key} repeats a choice: ${values.join(", ")}`).toBe(values.length);
			for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
		}
	});

	it("gives true/false settings the values the file uses", () => {
		const pvp = file.settings["World Settings::PVP"];
		expect(pvp.options.map((o) => o.value)).toEqual(["false", "true"]);
		const ai = file.settings["World Settings::AIEvent"];
		expect(ai.options.map((o) => o.value)).toEqual(["0", "1", "2", "3", "4"]);
	});

	it("only names groups in groupOrder that exist, and every group is ordered", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), `groupOrder lists "${g}" but no setting is in it`).toBe(true);
		for (const g of groups) expect(file.groupOrder, `${g} is not in groupOrder`).toContain(g);
	});

	it("keeps the wiki's warning about the word Official and the unit of the decay timer", () => {
		expect(file.settings["Host Settings::ServerName"].description).toMatch(/Official/);
		expect(file.settings["World Settings::Decay"].description).toMatch(/real days/);
	});
});

describe("HumanitZ launch arguments", () => {
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
		expect(args.map((a) => a.flag)).toEqual(["-log", "-port", "-queryport"]);
		for (const a of args) expect(a.managed, a.flag).toBe(true);
	});

	it("matches the start script the panel writes", () => {
		const script = server.template.buildStartScript({ name: "x", port: 27090, queryPort: 27092, installDir: "C:\\hz", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		expect(launch).toContain("HumanitZServer.exe -log -port=27090 -queryport=27092");
	});
});

import { describe, it, expect } from "vitest";
import game from "../catalog/games/dayofinfamy.js";
import server from "../../../src/server/data/games/dayofinfamy.js";
import { parseConvarCfg, convarEntries, serializeConvarCfg } from "../configParsers/convarCfg.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["server.cfg"];

describe("Day of Infamy module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("dayofinfamy");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Day of Infamy");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 27715 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Day of Infamy");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeNull();
	});

	it("explains what is unverified and what is not in the form", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/location/);
		expect(notes).toMatch(/default/);
		expect(notes).toMatch(/Stop/);
		expect(notes).toMatch(/mods/i);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Day of Infamy ${name} catalog`, () => {
		it("is read as one setting and its value per line", () => {
			expect(file.parser).toBe("convar");
			expect(settings.length).toBeGreaterThan(3);
		});

		it("gives every setting a label, an explanation and a group", () => {
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
				for (const o of meta.options) {
					expect(typeof o.value).toBe("string");
					expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
				}
			}
		});

		it("names only groups in groupOrder that exist, and puts every group in it", () => {
			const groups = new Set(settings.map(([, m]) => m.group));
			for (const g of file.groupOrder) expect(groups.has(g), g).toBe(true);
			for (const g of groups) expect(file.groupOrder.includes(g), `${g} is not in groupOrder`).toBe(true);
		});

		it("does not give two settings in a group the same label", () => {
			const seen = new Set();
			for (const [, meta] of settings) {
				const id = `${meta.group}/${meta.label}`;
				expect(seen.has(id), id).toBe(false);
				seen.add(id);
			}
		});
	});
}

describe("Day of Infamy settings", () => {
	const s = game.files["server.cfg"].settings;

	it("covers what the template writes, and the sample's other names", () => {
		for (const k of ["hostname", "sv_password", "sv_lan", "mp_friendlyfire", "mp_timelimit"]) expect(s[k], k).toBeTruthy();
	});

	it("offers the on/off settings as a dropdown of 0 and 1 only", () => {
		expect(s.sv_lan.options.map((o) => o.value)).toEqual(["0", "1"]);
		expect(s.mp_friendlyfire.options.map((o) => o.value)).toEqual(["0", "1"]);
		expect(s.sv_lan.allowCustom).toBeUndefined();
	});

	it("does not offer keys the sample file does not name", () => {
		for (const k of ["rcon_password", "sv_cheats", "mapcyclefile", "mp_roundtime", "mp_buytime", "tv_enable", "sv_tickrate"]) {
			expect(s[k], k).toBeUndefined();
		}
	});
});

describe("Day of Infamy server.cfg as the panel writes it", () => {
	const file = game.files["server.cfg"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends Sicily", serverPassword: "Pass1234" }).content;

	it("shows every setting with its value, all of them explained", () => {
		const entries = parseConvarCfg(text).entries;
		expect(entries.map((e) => [e.key, e.value])).toEqual([
			["hostname", "Friends Sicily"],
			["sv_password", "Pass1234"],
			["sv_lan", "0"],
		]);
		for (const e of entries) expect(file.settings[e.key], e.key).toBeTruthy();
	});

	it("changes the name on its own line only, keeping the quotes", () => {
		const parsed = parseConvarCfg(text);
		const out = serializeConvarCfg(parsed, { hostname: "New Name" });
		expect(out).toMatch(/^hostname "New Name"$/m);
		expect(out).toMatch(/^sv_password "Pass1234"$/m);
		expect(out).toMatch(/^sv_lan 0$/m);
		expect(out.split("\r\n").length).toBe(text.split("\r\n").length);
	});

	it("takes the password out when it is cleared", () => {
		expect(serializeConvarCfg(parseConvarCfg(text), { sv_password: "" })).not.toMatch(/sv_password/);
	});

	it("offers every setting even when the file is empty, and adds one that is filled in", () => {
		const parsed = parseConvarCfg("\n\n");
		const entries = convarEntries(parsed, Object.keys(file.settings));
		expect(entries.length).toBe(Object.keys(file.settings).length);
		const out = serializeConvarCfg(parsed, { mp_friendlyfire: "1" });
		expect(out).toMatch(/^mp_friendlyfire 1$/m);
	});
});

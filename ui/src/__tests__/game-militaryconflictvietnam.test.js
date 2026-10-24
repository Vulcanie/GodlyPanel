import { describe, it, expect } from "vitest";
import game from "../catalog/games/militaryconflictvietnam.js";
import server from "../../../src/server/data/games/militaryconflictvietnam.js";
import { parseConvarCfg, convarEntries, serializeConvarCfg } from "../configParsers/convarCfg.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["server.cfg"];
const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("Military Conflict: Vietnam module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("militaryconflictvietnam");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Military Conflict: Vietnam");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 25970 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Military Conflict: Vietnam");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("explains the login token, the stop and the connect command", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/Steam login token/);
		expect(notes).toMatch(/Stop closes its window/);
		expect(notes).toMatch(/connect/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Military Conflict: Vietnam ${name} catalog`, () => {
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

describe("Military Conflict: Vietnam settings", () => {
	const s = game.files["server.cfg"].settings;

	it("covers what the template writes, and the keys the host's page names", () => {
		for (const k of ["hostname", "sv_password", "rcon_password", "mp_roundtime", "mp_timelimit", "sv_cheats", "sv_gravity"]) {
			expect(s[k], k).toBeTruthy();
		}
	});

	it("offers no dropdowns, since the dossier lists no allowed values", () => {
		for (const [key, meta] of Object.entries(s)) expect(meta.options, key).toBeUndefined();
	});

	it("leaves out the keys with no description in the dossier", () => {
		for (const k of ["sv_contact", "sv_tags", "mapcyclefile", "sv_tickrate"]) expect(s[k], k).toBeUndefined();
	});
});

describe("Military Conflict: Vietnam server.cfg as the panel writes it", () => {
	const file = game.files["server.cfg"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends Bridge", serverPassword: "Pass1234" }).content;

	it("shows every setting it writes with its value, all of them explained", () => {
		const entries = parseConvarCfg(text).entries;
		expect(entries.map((e) => [e.key, e.value])).toEqual([
			["hostname", "Friends Bridge"],
			["sv_password", "Pass1234"],
			["sv_lan", "0"],
		]);
		// sv_lan is written by the panel, but the dossier gives no description for it, so the catalog leaves it out (see the notes).
		for (const e of entries.filter((x) => x.key !== "sv_lan")) expect(file.settings[e.key], e.key).toBeTruthy();
		expect(file.settings.sv_lan).toBeUndefined();
	});

	it("changes the name on its own line only, keeping the quotes", () => {
		const parsed = parseConvarCfg(text);
		const out = serializeConvarCfg(parsed, { hostname: "New Name" });
		expect(out).toMatch(/^hostname "New Name"$/m);
		expect(out).toMatch(/^sv_password "Pass1234"$/m);
		expect(out.split("\r\n").length).toBe(text.split("\r\n").length);
	});

	it("takes the password out when it is cleared", () => {
		expect(serializeConvarCfg(parseConvarCfg(text), { sv_password: "" })).not.toMatch(/sv_password/);
	});

	it("offers every setting even when the file is empty, and adds one that is filled in", () => {
		const parsed = parseConvarCfg("\n\n");
		const entries = convarEntries(parsed, Object.keys(file.settings));
		expect(entries.length).toBe(Object.keys(file.settings).length);
		const out = serializeConvarCfg(parsed, { mp_roundtime: "5" });
		expect(out).toMatch(/^mp_roundtime 5$/m);
	});
});

describe("Military Conflict: Vietnam launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group, with flags and form keys nobody else uses", () => {
		expect(def.args.length).toBeGreaterThan(5);
		for (const arg of def.args) {
			expect(arg.label?.trim(), arg.flag).toBeTruthy();
			expect(arg.description.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group?.trim(), arg.flag).toBeTruthy();
		}
		const flags = def.args.map((a) => a.flag.toLowerCase());
		expect(new Set(flags).size).toBe(flags.length);
		const keys = def.args.filter((a) => a.edit !== false).map(keyOf);
		expect(new Set(keys).size).toBe(keys.length);
		const stems = def.args.map((a) => a.flag.replace(/^[-+]+/, "").toLowerCase());
		expect(new Set(stems).size).toBe(stems.length);
	});

	it("keeps the arguments the panel must always write out of the form", () => {
		for (const flag of ["-console", "-game", "+exec"]) {
			const arg = def.args.find((a) => a.flag === flag);
			expect(arg.edit, flag).toBe(false);
			expect(arg.managed, flag).toBe(true);
		}
	});

	const script = server.template.buildStartScript({ name: "Test", port: 25970, maxPlayers: 24 });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("25970");
		expect(by.maxplayers.value).toBe("24");
		expect(by.map.value).toBe("mcv_bridge");
		for (const hidden of ["console", "game", "exec"]) expect(by[hidden], hidden).toBeUndefined();
	});

	it("changes the map and the player limit in place", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.map.id]: "mcv_tower", [by.maxplayers.id]: "16" });
		expect(out).toContain("+map mcv_tower ");
		expect(out).toContain("+maxplayers 16 ");
		expect(out).not.toContain("mcv_bridge");
		expect(out).toContain("-console -game vietnam -port 25970");
		expect(out).toMatch(/ \+exec server\.cfg$/m);
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});
});

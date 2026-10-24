import { describe, it, expect } from "vitest";
import game from "../catalog/games/nmrih.js";
import server from "../../../src/server/data/games/nmrih.js";
import { parseConvarCfg, convarEntries, serializeConvarCfg } from "../configParsers/convarCfg.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["server.cfg"];
const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("No More Room in Hell module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("nmrih");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("No More Room in Hell");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 25985 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("No More Room in Hell");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("explains the open questions: anonymous install, the port, the start map and the token", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/anonymous/);
		expect(notes).toMatch(/2456/);
		expect(notes).toMatch(/nmo_broadway/);
		expect(notes).toMatch(/Steam login token/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`No More Room in Hell ${name} catalog`, () => {
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

describe("No More Room in Hell settings", () => {
	const s = game.files["server.cfg"].settings;

	it("covers what the template writes and the token line", () => {
		for (const k of ["hostname", "sv_password", "sv_lan", "sv_setsteamaccount", "rcon_password", "sv_difficulty", "mp_maxrounds"]) expect(s[k], k).toBeTruthy();
	});

	it("offers the on/off settings as a dropdown of 0 and 1 only", () => {
		for (const k of ["sv_cheats", "sv_lan", "mp_friendlyfire", "sv_alltalk", "sv_voiceenable", "sv_allowdownload", "sv_logbans", "sv_logecho", "sv_logfile"]) {
			expect(s[k].options.map((o) => o.value), k).toEqual(["0", "1"]);
			expect(s[k].allowCustom, k).toBeUndefined();
		}
	});

	it("offers the difficulty as casual or classic, and log as on or off", () => {
		expect(s.sv_difficulty.options.map((o) => o.value)).toEqual(["casual", "classic"]);
		expect(s.log.options.map((o) => o.value)).toEqual(["on", "off"]);
	});

	it("does not offer the map rotation file or settings the dossier does not describe", () => {
		for (const k of ["mapcyclefile", "sv_pure", "sv_region", "mp_teamplay", "fof_sv_currentmode"]) expect(s[k], k).toBeUndefined();
	});
});

describe("No More Room in Hell server.cfg as the panel writes it", () => {
	const file = game.files["server.cfg"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends Zombies", serverPassword: "Pass1234" }).content;

	it("shows every setting with its value, all of them explained", () => {
		const entries = parseConvarCfg(text).entries;
		expect(entries.map((e) => [e.key, e.value])).toEqual([
			["hostname", "Friends Zombies"],
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
		const out = serializeConvarCfg(parsed, { sv_cheats: "1" });
		expect(out).toMatch(/^sv_cheats 1$/m);
	});
});

describe("No More Room in Hell launch arguments", () => {
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

	it("does not offer -secure, which the dossier does not define for this game", () => {
		expect(def.args.some((a) => a.flag.replace(/^[-+]+/, "").toLowerCase() === "secure")).toBe(false);
	});

	it("keeps the arguments the panel must always write out of the form", () => {
		for (const flag of ["-console", "-game", "+exec"]) {
			const arg = def.args.find((a) => a.flag === flag);
			expect(arg.edit, flag).toBe(false);
			expect(arg.managed, flag).toBe(true);
		}
	});

	const script = server.template.buildStartScript({ name: "Test", port: 25985, maxPlayers: 8, gslt: "TOKEN1234" });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("25985");
		expect(by.maxplayers.value).toBe("8");
		expect(by.map.value).toBe("nmo_broadway");
		expect(by.sv_setsteamaccount.value).toBe("TOKEN1234");
		for (const hidden of ["console", "game", "exec"]) expect(by[hidden], hidden).toBeUndefined();
	});

	it("changes the map and the player limit in place and keeps the token", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.map.id]: "nmo_broadway", [by.maxplayers.id]: "4" });
		expect(out).toContain("+maxplayers 4 ");
		expect(out).toContain("-console -game nmrih -port 25985");
		expect(out).toMatch(/ \+exec server\.cfg /);
		expect(out).toMatch(/ \+sv_setsteamaccount TOKEN1234$/m);
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});
});

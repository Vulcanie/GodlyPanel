import { describe, it, expect } from "vitest";
import game from "../catalog/games/svencoop.js";
import server from "../../../src/server/data/games/svencoop.js";
import { parseConvarCfg, convarEntries, serializeConvarCfg } from "../configParsers/convarCfg.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["server.cfg"];
const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("Sven Co-op module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("svencoop");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Sven Co-op");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 27355 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Sven Co-op");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("explains what is not in the form", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/closing its window/);
		expect(notes).toMatch(/svencoop_addons/);
		expect(notes).toMatch(/hostname/);
		expect(notes).toMatch(/obsolete/);
		expect(notes).toMatch(/Metamod/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Sven Co-op ${name} catalog`, () => {
		it("is read as one setting and its value per line", () => {
			expect(file.parser).toBe("convar");
			expect(settings.length).toBeGreaterThan(1);
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

describe("Sven Co-op settings", () => {
	const s = game.files["server.cfg"].settings;

	it("explains the settings the dossier names", () => {
		for (const k of ["hostname", "sv_password", "rcon_password", "sv_cheats", "skill", "mp_timelimit", "mp_votekickrequired", "mp_classic_mode", "sv_region", "sys_ticrate", "sv_downloadurl"]) expect(s[k], k).toBeTruthy();
	});

	it("offers the documented lists as dropdowns of exactly those values", () => {
		expect(s.skill.options.map((o) => o.value)).toEqual(["0", "1", "2", "3"]);
		expect(s.sv_cheats.options.map((o) => o.value)).toEqual(["0", "1", "2"]);
		expect(s.mp_classic_mode.options.map((o) => o.value)).toEqual(["-1", "0", "1"]);
		expect(s.mp_npckill.options.map((o) => o.value)).toEqual(["0", "1", "2"]);
		expect(s.sv_region.options.map((o) => o.value)).toEqual(["-1", "0", "1", "2", "3", "4", "5", "6", "7", "255"]);
		expect(s.skill.allowCustom).toBeUndefined();
	});

	it("offers the on/off settings as 0 and 1, still accepting a typed value", () => {
		expect(s.mp_banana.options.map((o) => o.value)).toEqual(["0", "1"]);
		expect(s.mp_banana.allowCustom).toBe(true);
	});

	it("does not state a starting value for sys_ticrate, where the sources disagree, and says so", () => {
		expect(s.sys_ticrate.description).toMatch(/disagree/);
		expect(s.sys_ticrate.options).toBeUndefined();
	});

	it("does not offer what is obsolete, fixed, or not explained", () => {
		for (const k of ["allow_spectators", "sv_alltalk", "sv_spectalk", "sv_spectator_password", "mp_fraglimit", "deathmatch", "log", "servercfgfile", "mapcyclefile", "motdfile", "adminsfile", "logsdir", "sv_voicequality", "sv_zmax"]) expect(s[k], k).toBeUndefined();
	});
});

describe("Sven Co-op server.cfg as the panel writes it", () => {
	const file = game.files["server.cfg"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends Camp", serverPassword: "Pass1234" }).content;

	it("shows both settings with their values, the name first", () => {
		const entries = parseConvarCfg(text).entries;
		expect(entries.map((e) => [e.key, e.value])).toEqual([
			["hostname", "Friends Camp"],
			["sv_password", "Pass1234"],
		]);
		for (const e of entries) expect(file.settings[e.key], e.key).toBeTruthy();
	});

	it("changes the name on its own line only, keeping the quotes and the order", () => {
		const parsed = parseConvarCfg(text);
		const out = serializeConvarCfg(parsed, { hostname: "New Name" });
		expect(out.split("\r\n")[0]).toBe('hostname "New Name"');
		expect(out).toMatch(/^sv_password "Pass1234"$/m);
		expect(out.split("\r\n").length).toBe(text.split("\r\n").length);
	});

	it("takes the password out when it is cleared", () => {
		const parsed = parseConvarCfg(text);
		expect(serializeConvarCfg(parsed, { sv_password: "" })).not.toMatch(/sv_password/);
	});

	it("offers every setting even when the file only has the name, and adds one that is filled in", () => {
		const parsed = parseConvarCfg(text);
		const entries = convarEntries(parsed, Object.keys(file.settings));
		expect(entries.length).toBe(Object.keys(file.settings).length);
		const out = serializeConvarCfg(parsed, { mp_timelimit: "30", skill: "2" });
		expect(out).toMatch(/^mp_timelimit 30$/m);
		expect(out).toMatch(/^skill 2$/m);
		expect(out.split("\r\n")[0]).toBe('hostname "Friends Camp"');
	});
});

describe("Sven Co-op: launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group, with flags and form keys nobody else uses", () => {
		expect(def.args.length).toBeGreaterThan(8);
		for (const arg of def.args) {
			expect(arg.label?.trim(), arg.flag).toBeTruthy();
			expect(arg.description.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group?.trim(), arg.flag).toBeTruthy();
		}
		const flags = def.args.map((a) => a.flag.toLowerCase());
		expect(new Set(flags).size).toBe(flags.length);
		const keys = def.args.filter((a) => a.edit !== false).map(keyOf);
		expect(new Set(keys).size).toBe(keys.length);
		// A flag written in both forms (-maxplayers / +maxplayers) would share a form key.
		const stems = def.args.map((a) => a.flag.replace(/^[-+]+/, "").toLowerCase());
		expect(new Set(stems).size).toBe(stems.length);
	});

	it("offers only arguments the sources explain", () => {
		for (const bad of ["-secure", "-noipx", "-authkey", "-condebug"]) expect(def.args.some((a) => a.flag === bad), bad).toBe(false);
	});

	it("keeps the arguments the panel must always write out of the form", () => {
		for (const flag of ["-console", "+servercfgfile"]) {
			const arg = def.args.find((a) => a.flag === flag);
			expect(arg.edit, flag).toBe(false);
			expect(arg.managed, flag).toBe(true);
		}
	});

	it("matches the program in both spellings the sources use", () => {
		expect(def.program.test("start /MIN \"x\" SvenDS.exe -console")).toBe(true);
		expect(def.program.test("start /MIN \"x\" svends.exe -console")).toBe(true);
	});

	const script = server.template.buildStartScript({ name: "Test", port: 27355, maxPlayers: 12 });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("27355");
		expect(by.maxplayers.value).toBe("12");
		expect(by.map.value).toBe("stadium4");
		expect(by.log.value).toBe("on");
		expect(by.console).toBeUndefined();
		expect(by.servercfgfile).toBeUndefined();
	});

	it("changes the map in place and adds an option at the end", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.map.id]: "my_map", [by.sport.id]: "26901" });
		expect(out).toContain("+map my_map ");
		expect(out).not.toContain("stadium4");
		expect(out).toMatch(/ -sport 26901$/m);
		expect(out).toContain("-console -port 27355 +maxplayers 12 +servercfgfile server.cfg");
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("every argument the form offers for the line is explained", () => {
		const parsed = parseLaunchArgs(script, def);
		const explained = new Set(def.args.filter((a) => a.edit !== false).map(keyOf));
		for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), entry.key).toBe(true);
	});
});

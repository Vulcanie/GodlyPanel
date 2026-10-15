import { describe, it, expect } from "vitest";
import game from "../catalog/games/garrysmod.js";
import server from "../../../src/server/data/games/garrysmod.js";
import { parseConvarCfg, convarEntries, serializeConvarCfg } from "../configParsers/convarCfg.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["autoexec.cfg", "server.cfg"];
const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("Garry's Mod module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("garrysmod");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Garry's Mod");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 27145 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Garry's Mod");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("explains what is not in the form", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/validate/);
		expect(notes).toMatch(/Game Server Login Token/);
		expect(notes).toMatch(/resource\.AddWorkshop/);
		expect(notes).toMatch(/remote console/i);
		expect(notes).toMatch(/DarkRP/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Garry's Mod ${name} catalog`, () => {
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

describe("Garry's Mod settings are split between the two files", () => {
	it("keeps the server name and password in autoexec.cfg and out of server.cfg", () => {
		expect(Object.keys(game.files["autoexec.cfg"].settings).sort()).toEqual(["hostname", "sv_password"]);
		expect(game.files["server.cfg"].settings.hostname).toBeUndefined();
		expect(game.files["server.cfg"].settings.sv_password).toBeUndefined();
	});

	it("explains the settings the dossier names for Sandbox and Trouble in Terrorist Town", () => {
		const s = game.files["server.cfg"].settings;
		for (const k of ["sbox_maxprops", "sbox_godmode", "sbox_persist", "ttt_roundtime_minutes", "ttt_karma", "ttt_traitor_pct", "sv_allowcslua", "sv_alltalk", "rcon_password"]) expect(s[k], k).toBeTruthy();
	});

	it("offers the on/off settings as a dropdown of 0 and 1 only", () => {
		const s = game.files["server.cfg"].settings;
		expect(s.sv_cheats.options.map((o) => o.value)).toEqual(["0", "1"]);
		expect(s.sv_cheats.allowCustom).toBeUndefined();
		expect(s.mp_falldamage.allowCustom).toBe(true);
	});

	it("does not offer what the research could not explain", () => {
		const s = game.files["server.cfg"].settings;
		for (const k of ["sv_region", "fps_max", "sv_pure", "ttt_karma_strict", "sbox_search_maxresults", "sv_tags", "motdfile"]) expect(s[k], k).toBeUndefined();
	});
});

describe("Garry's Mod autoexec.cfg as the panel writes it", () => {
	const file = game.files["autoexec.cfg"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends Camp", serverPassword: "Pass1234" }).content;

	it("shows both settings with their values", () => {
		const entries = parseConvarCfg(text).entries;
		expect(entries.map((e) => [e.key, e.value])).toEqual([
			["hostname", "Friends Camp"],
			["sv_password", "Pass1234"],
		]);
		for (const e of entries) expect(file.settings[e.key], e.key).toBeTruthy();
	});

	it("changes the name on its own line only, keeping the quotes", () => {
		const parsed = parseConvarCfg(text);
		const out = serializeConvarCfg(parsed, { hostname: "New Name" });
		expect(out).toMatch(/^hostname "New Name"$/m);
		expect(out).toMatch(/^sv_password "Pass1234"$/m);
		expect(out.split("\r\n").length).toBe(text.split("\r\n").length);
	});

	it("takes the password out when it is cleared", () => {
		const parsed = parseConvarCfg(text);
		expect(serializeConvarCfg(parsed, { sv_password: "" })).not.toMatch(/sv_password/);
	});
});

describe("Garry's Mod server.cfg", () => {
	it("offers every setting even when the file is empty, and adds one that is filled in", () => {
		const shipped = "\n\n";
		const parsed = parseConvarCfg(shipped);
		const entries = convarEntries(parsed, Object.keys(game.files["server.cfg"].settings));
		expect(entries.length).toBe(Object.keys(game.files["server.cfg"].settings).length);
		const out = serializeConvarCfg(parsed, { sv_alltalk: "1", sbox_maxprops: "300" });
		expect(out).toMatch(/^sv_alltalk 1$/m);
		expect(out).toMatch(/^sbox_maxprops 300$/m);
	});
});

describe("Garry's Mod: launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group, with flags and form keys nobody else uses", () => {
		expect(def.args.length).toBeGreaterThan(15);
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

	it("never offers -authkey, which only third-party guides mention", () => {
		expect(def.args.some((a) => /authkey/i.test(a.flag))).toBe(false);
	});

	it("keeps the arguments the panel must always write out of the form", () => {
		for (const flag of ["-console", "-game", "-condebug"]) {
			const arg = def.args.find((a) => a.flag === flag);
			expect(arg.edit, flag).toBe(false);
			expect(arg.managed, flag).toBe(true);
		}
	});

	const script = server.template.buildStartScript({ name: "Test", port: 27145, maxPlayers: 16, gslt: "TOKEN1234", mods: "157384458" });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("27145");
		expect(by.maxplayers.value).toBe("16");
		expect(by.gamemode.value).toBe("sandbox");
		expect(by.map.value).toBe("gm_construct");
		expect(by.sv_setsteamaccount.value).toBe("TOKEN1234");
		expect(by.host_workshop_collection.value).toBe("157384458");
		expect(by.strictportbind.value).toBe("true");
		expect(by.disableluarefresh.value).toBe("false");
		expect(by.console).toBeUndefined();
		expect(by.game).toBeUndefined();
		expect(by.condebug).toBeUndefined();
	});

	it("changes the map and the gamemode in place and adds a flag at the end", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.map.id]: "zs_cleanoffice_v2", [by.gamemode.id]: "zombiesurvival", [by.disableluarefresh.id]: "true" });
		expect(out).toContain("+map zs_cleanoffice_v2 ");
		expect(out).toContain("+gamemode zombiesurvival ");
		expect(out).not.toContain("gm_construct");
		expect(out).toMatch(/ -disableluarefresh$/m);
		expect(out).toContain("-console -game garrysmod -port 27145");
		expect(out).toMatch(/ -condebug /);
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("takes the token and the collection off the line when they are cleared", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.sv_setsteamaccount.id]: "", [by.host_workshop_collection.id]: "" });
		expect(out).not.toMatch(/sv_setsteamaccount|host_workshop_collection/);
	});

	it("adds the login token to a line that has none, after everything else", () => {
		const bare = server.template.buildStartScript({ name: "Test", port: 27145 });
		const parsed = parseLaunchArgs(bare, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.sv_setsteamaccount.id]: "NEWTOKEN" });
		expect(out).toMatch(/ -condebug \+sv_setsteamaccount NEWTOKEN$/m);
	});

	it("every argument the form offers for the line is explained", () => {
		const parsed = parseLaunchArgs(script, def);
		const explained = new Set(def.args.filter((a) => a.edit !== false).map(keyOf));
		for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), entry.key).toBe(true);
	});
});

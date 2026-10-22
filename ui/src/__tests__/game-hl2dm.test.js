import { describe, it, expect } from "vitest";
import game from "../catalog/games/hl2dm.js";
import server from "../../../src/server/data/games/hl2dm.js";
import { parseConvarCfg, convarEntries, serializeConvarCfg } from "../configParsers/convarCfg.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["server.cfg"];
const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("Half-Life 2: Deathmatch module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("hl2dm");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Half-Life 2: Deathmatch");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 27435 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Half-Life 2: Deathmatch");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("explains what is not in the form", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/connect/);
		expect(notes).toMatch(/Steam login token/);
		expect(notes).toMatch(/27020/);
		expect(notes).toMatch(/server\.cfg/);
		expect(notes).toMatch(/mapcycle\.txt/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Half-Life 2: Deathmatch ${name} catalog`, () => {
		it("is read as one setting and its value per line", () => {
			expect(file.parser).toBe("convar");
			expect(settings.length).toBeGreaterThan(10);
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

describe("Half-Life 2: Deathmatch settings", () => {
	const s = game.files["server.cfg"].settings;

	it("covers what the template writes, and the names the research gave", () => {
		const named = [
			"hostname", "sv_password", "sv_lan", "sv_cheats", "mp_teamplay", "mp_fraglimit", "mp_timelimit", "mp_friendlyfire", "mp_forcerespawn",
			"mp_footsteps", "mp_flashlight", "mp_allowspectators", "mp_falldamage", "sv_hl2mp_weapon_respawn_time", "sv_hl2mp_item_respawn_time",
			"sv_voiceenable", "sv_alltalk", "sv_allowupload", "sv_allowdownload", "sv_maxrate", "sv_minrate", "sv_maxupdaterate",
			"sv_minupdaterate", "sv_timeout", "hl2mp_allow_pickup", "mapcyclefile",
		];
		for (const k of named) expect(s[k], k).toBeTruthy();
	});

	it("offers the on/off settings as a dropdown of 0 and 1 only, and the numbers as free text", () => {
		for (const k of ["mp_teamplay", "sv_lan", "sv_cheats", "mp_friendlyfire", "sv_alltalk", "sv_voiceenable", "hl2mp_allow_pickup"]) {
			expect(s[k].options.map((o) => o.value), k).toEqual(["0", "1"]);
			expect(s[k].allowCustom, k).toBeUndefined();
		}
		for (const k of ["mp_fraglimit", "mp_timelimit", "mp_falldamage", "sv_maxrate", "sv_timeout", "hostname"]) expect(s[k].options, k).toBeUndefined();
	});

	it("does not offer what the research did not name for this game", () => {
		for (const k of ["rcon_password", "mp_roundtime", "sv_gravity", "sv_tickrate", "tv_enable", "sv_region", "mp_weaponstay"]) {
			expect(s[k], k).toBeUndefined();
		}
	});
});

describe("Half-Life 2: Deathmatch server.cfg as the panel writes it", () => {
	const file = game.files["server.cfg"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends Frag", serverPassword: "Pass1234" }).content;

	it("shows every setting with its value, all of them explained", () => {
		const entries = parseConvarCfg(text).entries;
		expect(entries.map((e) => [e.key, e.value])).toEqual([
			["hostname", "Friends Frag"],
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
		const out = serializeConvarCfg(parsed, { mp_teamplay: "1", mp_fraglimit: "50" });
		expect(out).toMatch(/^mp_teamplay 1$/m);
		expect(out).toMatch(/^mp_fraglimit 50$/m);
	});
});

describe("Half-Life 2: Deathmatch: launch arguments", () => {
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
		const stems = def.args.map((a) => a.flag.replace(/^[-+]+/, "").toLowerCase());
		expect(new Set(stems).size).toBe(stems.length);
	});

	it("does not offer what the research could not confirm for this game", () => {
		for (const bad of ["tickrate", "secure", "autoupdate", "steamport", "sport", "clientport", "nobots", "exec", "netconport", "netconpassword"]) {
			expect(def.args.some((a) => a.flag.replace(/^[-+]+/, "").toLowerCase() === bad), bad).toBe(false);
		}
	});

	it("keeps the arguments the panel must always write out of the form", () => {
		for (const flag of ["-console", "-game", "-condebug"]) {
			const arg = def.args.find((a) => a.flag === flag);
			expect(arg.edit, flag).toBe(false);
			expect(arg.managed, flag).toBe(true);
		}
	});

	const script = server.template.buildStartScript({ name: "Test", port: 27435, maxPlayers: 16, gslt: "TOKEN1234" });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("27435");
		expect(by.maxplayers.value).toBe("16");
		expect(by.map.value).toBe("dm_lockdown");
		expect(by.sv_setsteamaccount.value).toBe("TOKEN1234");
		expect(by.strictportbind.value).toBe("true");
		expect(by.nohltv.value).toBe("false");
		for (const hidden of ["console", "game", "condebug"]) expect(by[hidden], hidden).toBeUndefined();
	});

	it("changes the map and the player limit in place and adds a flag at the end", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.map.id]: "dm_runoff", [by.maxplayers.id]: "24", [by.nohltv.id]: "true" });
		expect(out).toContain("+map dm_runoff ");
		expect(out).toContain("+maxplayers 24 ");
		expect(out).not.toContain("dm_lockdown");
		expect(out).toMatch(/ -nohltv$/m);
		expect(out).toContain("-console -game hl2mp -port 27435");
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("takes the token off when it is cleared, and adds -insecure at the end of the line", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.insecure.id]: "true", [by.sv_setsteamaccount.id]: "" });
		expect(out).not.toMatch(/sv_setsteamaccount/);
		expect(out).toMatch(/ -insecure$/m);
	});

	it("every argument the form offers for the line is explained", () => {
		const parsed = parseLaunchArgs(script, def);
		const explained = new Set(def.args.filter((a) => a.edit !== false).map(keyOf));
		for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), entry.key).toBe(true);
	});
});

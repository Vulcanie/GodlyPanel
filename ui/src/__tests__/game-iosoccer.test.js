import { describe, it, expect } from "vitest";
import game from "../catalog/games/iosoccer.js";
import server from "../../../src/server/data/games/iosoccer.js";
import { parseConvarCfg, convarEntries, serializeConvarCfg } from "../configParsers/convarCfg.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["server.cfg"];
const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("IOSoccer module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("iosoccer");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("IOSoccer");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 25948 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("IOSoccer");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("explains what is not in the form and the panel's stop limit", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/connect/);
		expect(notes).toMatch(/cfg folder/);
		expect(notes).toMatch(/mp_maxplayers/);
		expect(notes).toMatch(/15 seconds/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`IOSoccer ${name} catalog`, () => {
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

describe("IOSoccer settings", () => {
	const s = game.files["server.cfg"].settings;

	it("covers what the template writes, and the names the dossier describes", () => {
		for (const k of ["hostname", "sv_password", "sv_lan", "rcon_password", "mp_extratime", "mp_offside", "sv_alltalk"]) expect(s[k], k).toBeTruthy();
	});

	it("offers the on/off settings as a dropdown of 0 and 1 only", () => {
		for (const k of ["sv_lan", "mp_extratime", "mp_penalties", "mp_offside", "mp_captaincy_away", "sv_voiceenable", "sv_alltalk", "sv_logfile", "sv_logbans"]) {
			expect(s[k].options.map((o) => o.value), k).toEqual(["0", "1"]);
			expect(s[k].allowCustom, k).toBeUndefined();
		}
	});

	it("offers the keepers as AI or human, by 1 and 0", () => {
		expect(s.mp_botkeepers.options.map((o) => o.value)).toEqual(["1", "0"]);
	});

	it("does not offer what the sources disagree on or give no unit or description for", () => {
		for (const k of [
			"mp_chat_match_captain_only",
			"mp_chat_match_captains_only",
			"mp_captaincy_home",
			"mp_captancy_home",
			"mp_maxplayers",
			"mp_timelimit_halftime",
			"mp_timelimit_cooldown",
			"mp_pitchtexture",
			"sv_restart",
			"sv_autostartmatch",
			"sv_replay_instant_second_enabled",
			"sv_downloadurl",
			"mapcyclefile",
		]) {
			expect(s[k], k).toBeUndefined();
		}
	});
});

describe("IOSoccer server.cfg as the panel writes it", () => {
	const file = game.files["server.cfg"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends Vienna", serverPassword: "Pass1234" }).content;

	it("shows every setting with its value, all of them explained", () => {
		const entries = parseConvarCfg(text).entries;
		expect(entries.map((e) => [e.key, e.value])).toEqual([
			["hostname", "Friends Vienna"],
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
		const out = serializeConvarCfg(parsed, { sv_alltalk: "1" });
		expect(out).toMatch(/^sv_alltalk 1$/m);
	});
});

describe("IOSoccer: launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group, with flags and form keys nobody else uses", () => {
		expect(def.args.length).toBeGreaterThan(4);
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

	const script = server.template.buildStartScript({ name: "Test", port: 25948, maxPlayers: 32 });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("25948");
		expect(by.maxplayers.value).toBe("32");
		expect(by.map.value).toBe("8v8_vienna");
		for (const hidden of ["console", "game", "exec"]) expect(by[hidden], hidden).toBeUndefined();
	});

	it("changes the map and the player limit in place and keeps the rest of the line", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.map.id]: "8v8_other", [by.maxplayers.id]: "16" });
		expect(out).toContain("+map 8v8_other ");
		expect(out).toContain("+maxplayers 16 ");
		expect(out).not.toContain("8v8_vienna");
		expect(out).toContain("-console -game iosoccer -port 25948");
		expect(out).toMatch(/ \+exec server\.cfg$/m);
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});
});

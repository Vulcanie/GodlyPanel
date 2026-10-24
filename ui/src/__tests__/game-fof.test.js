import { describe, it, expect } from "vitest";
import game from "../catalog/games/fof.js";
import server from "../../../src/server/data/games/fof.js";
import { parseConvarCfg, convarEntries, serializeConvarCfg } from "../configParsers/convarCfg.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["server.cfg"];
const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("Fistful of Frags module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("fof");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Fistful of Frags");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 25975 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Fistful of Frags");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("explains the file-name, stop and token questions the dossier left open", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/fofserver\.cfg/);
		expect(notes).toMatch(/Steam login token/);
		expect(notes).toMatch(/graceful/);
		expect(notes).toMatch(/fof_sv_currentmode/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Fistful of Frags ${name} catalog`, () => {
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

describe("Fistful of Frags settings", () => {
	const s = game.files["server.cfg"].settings;

	it("covers what the template writes and the token line", () => {
		for (const k of ["hostname", "sv_password", "sv_lan", "sv_setsteamaccount", "rcon_password", "mp_teamplay", "fof_sv_maxteams"]) expect(s[k], k).toBeTruthy();
	});

	it("offers the on/off settings as a dropdown of 0 and 1 only", () => {
		for (const k of ["sv_cheats", "sv_lan", "mp_friendlyfire", "sv_alltalk", "fof_sv_bot_dynamicjoin", "sv_voiceenable", "sv_allowdownload", "sv_logbans", "sv_logecho", "sv_logfile"]) {
			expect(s[k].options.map((o) => o.value), k).toEqual(["0", "1"]);
			expect(s[k].allowCustom, k).toBeUndefined();
		}
	});

	it("offers the team count as 2, 3 or 4, and log as on or off", () => {
		expect(s.fof_sv_maxteams.options.map((o) => o.value)).toEqual(["2", "3", "4"]);
		expect(s.log.options.map((o) => o.value)).toEqual(["on", "off"]);
	});

	it("does not offer the game-mode number, the map cycle file or the one log setting the guides contradict", () => {
		for (const k of ["fof_sv_currentmode", "mapcyclefile", "sv_log_onefile", "sv_pure", "sv_region"]) expect(s[k], k).toBeUndefined();
	});
});

describe("Fistful of Frags server.cfg as the panel writes it", () => {
	const file = game.files["server.cfg"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends Frags", serverPassword: "Pass1234", gslt: "TOKEN123" }).content;

	it("shows every setting with its value, all of them explained", () => {
		const entries = parseConvarCfg(text).entries;
		expect(entries.map((e) => [e.key, e.value])).toEqual([
			["hostname", "Friends Frags"],
			["sv_password", "Pass1234"],
			["sv_lan", "0"],
			["sv_setsteamaccount", "TOKEN123"],
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

describe("Fistful of Frags launch arguments", () => {
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

	it("does not offer -ip, whose meaning the dossier's sources disagree on, or the token (it lives in server.cfg)", () => {
		for (const bad of ["ip", "sv_setsteamaccount", "secure", "tickrate"]) {
			expect(def.args.some((a) => a.flag.replace(/^[-+]+/, "").toLowerCase() === bad), bad).toBe(false);
		}
	});

	it("keeps the arguments the panel must always write out of the form", () => {
		for (const flag of ["-console", "-game", "+exec"]) {
			const arg = def.args.find((a) => a.flag === flag);
			expect(arg.edit, flag).toBe(false);
			expect(arg.managed, flag).toBe(true);
		}
	});

	const script = server.template.buildStartScript({ name: "Test", port: 25975, maxPlayers: 16 });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("25975");
		expect(by.maxplayers.value).toBe("16");
		expect(by.map.value).toBe("fof_fistful");
		for (const hidden of ["console", "game", "exec"]) expect(by[hidden], hidden).toBeUndefined();
	});

	it("changes the map and the player limit in place and adds a flag at the end", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.map.id]: "fof_revenge", [by.maxplayers.id]: "12", [by.insecure.id]: "true" });
		expect(out).toContain("+map fof_revenge ");
		expect(out).toContain("+maxplayers 12 ");
		expect(out).not.toContain("fof_fistful");
		expect(out).toMatch(/ -insecure$/m);
		expect(out).toContain("-console -game fof -port 25975");
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});
});

import { describe, it, expect } from "vitest";
import game from "../catalog/games/tf2classified.js";
import server from "../../../src/server/data/games/tf2classified.js";
import { parseConvarCfg, convarEntries, serializeConvarCfg } from "../configParsers/convarCfg.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["server.cfg"];
const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("Team Fortress 2 Classified module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("tf2classified");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Team Fortress 2 Classified");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 25930 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Team Fortress 2 Classified");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("says what the research could not confirm: the map, the player limit and the process", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/default/);
		expect(notes).toMatch(/connect/);
		expect(notes).toMatch(/Stop/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Team Fortress 2 Classified ${name} catalog`, () => {
		it("is read as one setting and its value per line", () => {
			expect(file.parser).toBe("convar");
			expect(settings.length).toBeGreaterThanOrEqual(2);
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

describe("Team Fortress 2 Classified settings", () => {
	const s = game.files["server.cfg"].settings;

	it("covers what the template writes and the one name the dossier gives", () => {
		for (const k of ["hostname", "sv_password", "mp_timelimit"]) expect(s[k], k).toBeTruthy();
	});

	it("does not offer names the research found only in a host's panel", () => {
		for (const k of ["rcon_password", "sv_downloadurl", "sv_lan", "sv_cheats", "mp_friendlyfire"]) expect(s[k], k).toBeUndefined();
	});
});

describe("Team Fortress 2 Classified server.cfg as the panel writes it", () => {
	const file = game.files["server.cfg"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends Classified", serverPassword: "Pass1234" }).content;

	it("shows every setting with its value, all of them explained", () => {
		const entries = parseConvarCfg(text).entries;
		expect(entries.map((e) => [e.key, e.value])).toEqual([
			["hostname", "Friends Classified"],
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
		expect(serializeConvarCfg(parseConvarCfg(text), { sv_password: "" })).not.toMatch(/sv_password/);
	});

	it("offers every setting even when the file is empty, and adds one that is filled in", () => {
		const parsed = parseConvarCfg("\n\n");
		const entries = convarEntries(parsed, Object.keys(file.settings));
		expect(entries.length).toBe(Object.keys(file.settings).length);
		const out = serializeConvarCfg(parsed, { mp_timelimit: "30" });
		expect(out).toMatch(/^mp_timelimit 30$/m);
	});
});

describe("Team Fortress 2 Classified launch arguments", () => {
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
	});

	it("keeps the arguments the panel must always write out of the form", () => {
		for (const flag of ["-steam", "-console", "-game", "+exec"]) {
			const arg = def.args.find((a) => a.flag === flag);
			expect(arg.edit, flag).toBe(false);
			expect(arg.managed, flag).toBe(true);
		}
	});

	const script = server.template.buildStartScript({ name: "Test", port: 25930 });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("25930");
		for (const hidden of ["steam", "console", "game", "exec"]) expect(by[hidden], hidden).toBeUndefined();
	});

	it("changes a map and a player limit the user has added, in place", () => {
		const withMap = script.replace(" +exec server.cfg", " +map ctf_example +maxplayers 12 +exec server.cfg");
		const parsed = parseLaunchArgs(withMap, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.map.id]: "cp_other", [by.maxplayers.id]: "16" });
		expect(out).toContain(" +map cp_other ");
		expect(out).toContain(" +maxplayers 16 ");
		expect(out).toMatch(/ \+exec server\.cfg/);
		expect(out).toContain("-steam -game tf2classified -console -port 25930");
	});
});

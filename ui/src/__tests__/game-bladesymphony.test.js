import { describe, it, expect } from "vitest";
import game from "../catalog/games/bladesymphony.js";
import server from "../../../src/server/data/games/bladesymphony.js";
import { parseConvarCfg, convarEntries, serializeConvarCfg } from "../configParsers/convarCfg.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["server.cfg"];
const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("Blade Symphony module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("bladesymphony");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Blade Symphony");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 27034 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Blade Symphony");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("explains what is not in the form", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/2013/);
		expect(notes).toMatch(/Stop/);
		expect(notes).toMatch(/login token/);
		expect(notes).toMatch(/berimbau/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Blade Symphony ${name} catalog`, () => {
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
				for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
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

describe("Blade Symphony settings", () => {
	const s = game.files["server.cfg"].settings;

	it("offers exactly the five settings the official guide names, and no dropdown (it gives no value lists)", () => {
		expect(Object.keys(s).sort()).toEqual(["hostname", "mapcyclefile", "mp_timelimit", "rcon_password", "sv_password"]);
		for (const meta of Object.values(s)) expect(meta.options).toBeUndefined();
	});

	it("leaves out the community keys whose meaning is not confirmed for this game", () => {
		for (const k of ["sv_alltalk", "sv_cheats", "log", "sv_logfile", "sv_downloadurl", "sv_ranked", "fps_max"]) expect(s[k], k).toBeUndefined();
	});
});

describe("Blade Symphony server.cfg as the panel writes it", () => {
	const file = game.files["server.cfg"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends Duels", serverPassword: "Pass1234" }).content;

	it("shows the name and password with their values, the name first", () => {
		const entries = parseConvarCfg(text).entries;
		expect(entries.map((e) => [e.key, e.value])).toEqual([
			["hostname", "Friends Duels"],
			["sv_password", "Pass1234"],
		]);
		for (const e of entries) expect(file.settings[e.key], e.key).toBeTruthy();
	});

	it("changes the name on its own line only, keeping the quotes and the order", () => {
		const out = serializeConvarCfg(parseConvarCfg(text), { hostname: "New Name" });
		expect(out.split("\r\n")[0]).toBe('hostname "New Name"');
		expect(out).toMatch(/^sv_password "Pass1234"$/m);
	});

	it("offers every setting even when the file only has the name, and adds one that is filled in", () => {
		const parsed = parseConvarCfg(text);
		expect(convarEntries(parsed, Object.keys(file.settings)).length).toBe(Object.keys(file.settings).length);
		const out = serializeConvarCfg(parsed, { mp_timelimit: "30" });
		expect(out).toMatch(/^mp_timelimit 30$/m);
	});
});

describe("Blade Symphony: launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group, with flags and form keys nobody else uses", () => {
		expect(def.args.length).toBeGreaterThan(3);
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

	it("keeps the console flag out of the form, and offers only arguments the official guide or the Source page names", () => {
		const consoleArg = def.args.find((a) => a.flag === "-console");
		expect(consoleArg.edit).toBe(false);
		expect(consoleArg.managed).toBe(true);
		for (const bad of ["-secure", "-authkey", "-condebug", "-insecure", "-game"]) expect(def.args.some((a) => a.flag === bad), bad).toBe(false);
	});

	it("matches the program in both spellings the sources use", () => {
		expect(def.program.test('start /MIN "x" srcds.exe -console')).toBe(true);
		expect(def.program.test("sh srcds_run.sh +maxplayers 16")).toBe(true);
	});

	const script = server.template.buildStartScript({ name: "Test", port: 27034, mapCode: "duel_winter" });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("27034");
		expect(by.maxplayers.value).toBe("16");
		expect(by.map.value).toBe("duel_winter");
		expect(by.console).toBeUndefined();
	});
});

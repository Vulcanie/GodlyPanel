import { describe, it, expect } from "vitest";
import avorionUi from "../catalog/games/avorion.js";
import avorionServer from "../../../src/server/data/games/avorion.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// Avorion's catalog, held to the rules of catalogs.test.js (it is not registered in the index yet, so the rules are repeated here):
// every setting explained and grouped, every argument explained and unique, and the launch line the server side writes is found and read.

const def = avorionUi.launch;
const ini = avorionUi.files["server.ini"];
const params = { name: "Test", sessionName: "Our Server", galaxyName: "Our_Galaxy", adminSteamId: "76561198000000000", mods: "", port: 27000, maxPlayers: 8, instanceSlug: "test" };
const script = avorionServer.template.buildStartScript(params);
const byKey = (parsed) => Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));

describe("Avorion module", () => {
	it("is under the type the server side records", () => {
		expect(avorionUi.type).toBe("avorion");
		expect(avorionUi.type).toBe(avorionServer.template.type);
		expect(avorionUi.title).toBe("Avorion");
		expect(avorionUi.guide.name).toBe("Avorion");
		expect(avorionUi.guide.summary.length).toBeGreaterThan(20);
	});

	it("offers server.ini as the one settings file, at the path the server side records", () => {
		expect(Object.keys(avorionUi.files)).toEqual(["server.ini"]);
		expect(Object.keys(avorionUi.guide.files)).toEqual(["server.ini", "modconfig.lua"]);
		const entry = avorionServer.template.buildServerEntry({ ...params, installDir: "C:\\S\\avorion", startScriptFilename: "Start_Avorion.bat" });
		expect(Object.keys(entry.configPaths)).toEqual(["server.ini"]);
		expect(ini.parser).toBe("ini");
		expect(ini.mayBeMissing).toMatch(/first time/);
	});

	it("says in the guide that there is no clean stop, how to stop by hand, and the risks of server.ini", () => {
		const text = avorionUi.guide.notes.join(" ");
		expect(text).toMatch(/cannot stop the server cleanly/);
		expect(text).toMatch(/`\/save`/);
		expect(text).toMatch(/`\/stop`/);
		expect(text).toMatch(/new seed/);
		expect(text).toMatch(/Password/);
		expect(text).toMatch(/--admin/);
		expect(text).toMatch(/TCP/);
		expect(text).toMatch(/--port/);
		expect(text).toMatch(/Workshop/);
		expect(text).toMatch(/corrupt/);
		expect(text).toMatch(/-Avorion/);
	});

	it("gives every guide note some text", () => {
		for (const note of avorionUi.guide.notes) expect(note.trim().length).toBeGreaterThan(20);
		for (const text of Object.values(avorionUi.guide.files)) expect(text.length).toBeGreaterThan(20);
	});
});

describe("Avorion server.ini catalog", () => {
	const entries = Object.entries(ini.settings);

	it("has the settings listed in the notes", () => {
		expect(entries.length).toBe(64);
	});

	it("keys every setting as Section::Key in a section the labels know", () => {
		for (const [key] of entries) {
			const [section, name] = key.split("::");
			expect(Object.keys(ini.sectionLabels), key).toContain(section);
			expect(name?.length, key).toBeGreaterThan(0);
		}
	});

	it("gives every setting a label, an explanation and a group", () => {
		for (const [key, meta] of entries) {
			expect(meta.label?.trim(), key).toBeTruthy();
			expect(meta.description?.length, key).toBeGreaterThan(10);
			expect(meta.group?.trim(), key).toBeTruthy();
		}
	});

	it("gives every group in the order list a setting, and every setting a group in the order list", () => {
		const used = new Set(entries.map(([, m]) => m.group));
		for (const g of ini.groupOrder) expect(used.has(g), g).toBe(true);
		for (const g of used) expect(ini.groupOrder, g).toContain(g);
	});

	it("explains a repeated group and label the same way", () => {
		const seen = new Map();
		for (const [key, m] of entries) {
			const id = `${m.group}::${m.label}`;
			if (seen.has(id)) expect(m.description, key).toBe(seen.get(id));
			else seen.set(id, m.description);
		}
	});

	it("offers choices only where a source states the values, each labelled once", () => {
		const withOptions = entries.filter(([, m]) => m.options).map(([k]) => k);
		expect(withOptions.sort()).toEqual(["Administration::accessListMode", "Game::Scenario"]);
		for (const [key, m] of entries) {
			if (!m.options) continue;
			const values = m.options.map((o) => o.value);
			expect(new Set(values).size, key).toBe(values.length);
			for (const o of m.options) expect(o.label?.trim(), key).toBeTruthy();
		}
		expect(ini.settings["Game::Scenario"].options.map((o) => o.value)).toEqual(["0", "1"]);
	});

	it("leaves out the settings that would break an existing galaxy or the launch line", () => {
		const keys = entries.map(([k]) => k.split("::")[1].toLowerCase());
		for (const left of ["seed", "difficulty", "difficulity", "name", "maxplayers", "port", "mapfactions", "rifts", "barrier", "permadestruction", "explicitcallables", "steamidoverride", "version"]) {
			expect(keys, left).not.toContain(left);
		}
	});
});

describe("Avorion launch arguments", () => {
	it("gives every argument a label, an explanation and a group", () => {
		expect(def.args.length).toBe(22);
		for (const arg of def.args) {
			expect(arg.label?.trim(), arg.flag).toBeTruthy();
			expect(arg.description?.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group?.trim(), arg.flag).toBeTruthy();
		}
	});

	it("lists each flag once, ignoring case, and each form key once", () => {
		const flags = def.args.map((a) => a.flag.toLowerCase());
		expect(new Set(flags).size).toBe(flags.length);
		const keys = def.args.filter((a) => a.edit !== false).map((a) => a.key ?? a.flag.replace(/^[-+]+/, ""));
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("repeats no choice in a dropdown", () => {
		for (const arg of def.args) {
			if (!arg.options) continue;
			const values = arg.options.map((o) => (Array.isArray(o) ? o[0] : o));
			expect(new Set(values).size, arg.flag).toBe(values.length);
		}
	});

	it("marks the arguments the panel writes, and does not offer the ones that would hide its files", () => {
		const by = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		for (const flag of ["--galaxy-name", "--datapath", "--server-name", "--admin", "--max-players", "--port", "--query-port", "--steam-query-port", "--steam-master-port"]) {
			expect(by[flag].managed, flag).toBe(true);
		}
		for (const flag of ["--galaxy-name", "--datapath"]) expect(by[flag].edit, flag).toBe(false);
	});

	it("uses the argument spellings the wiki and the egg list, with explicit true/false for the on-off ones", () => {
		const flags = def.args.map((a) => a.flag);
		for (const flag of [
			"--galaxy-name", "--datapath", "--server-name", "--admin", "--max-players", "--port", "--query-port", "--steam-query-port", "--steam-master-port",
			"--difficulty", "--seed", "--infinite-resources", "--collision-damage", "--same-start-sector", "--save-interval", "--threads", "--public",
			"--listed", "--use-steam-networking", "--exit-on-last-admin-logout", "--stderr-to-log", "--stdout-to-log",
		]) {
			expect(flags, flag).toContain(flag);
		}
		const by = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		for (const flag of ["--infinite-resources", "--same-start-sector", "--public", "--listed", "--use-steam-networking"]) {
			expect(by[flag].options.map((o) => o[0]), flag).toEqual(["true", "false"]);
		}
		expect(by["--difficulty"].options.map((o) => o[0])).toEqual(["-3", "-2", "-1", "0", "1", "2", "3"]);
		for (const flag of ["--exit-on-last-admin-logout", "--stderr-to-log", "--stdout-to-log"]) expect(by[flag].kind, flag).toBe("bool");
	});

	it("leaves out the arguments that are no use in a panel", () => {
		const flags = def.args.map((a) => a.flag.toLowerCase());
		for (const flag of ["--help", "-t", "--trace"]) expect(flags).not.toContain(flag);
	});

	it("finds the launch line the server side writes, and leaves the script byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
	});

	it("also finds the line when no admin is given", () => {
		const open = avorionServer.template.buildStartScript({ ...params, adminSteamId: "" });
		expect(parseLaunchArgs(open, def).at).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parseLaunchArgs(open, def), {})).toBe(open);
	});

	it("reads the ports, slots, name and admin off the line", () => {
		const by = byKey(parseLaunchArgs(script, def));
		expect(by.port.value).toBe("27000");
		expect(by["query-port"].value).toBe("27004");
		expect(by["steam-query-port"].value).toBe("27002");
		expect(by["steam-master-port"].value).toBe("27003");
		expect(by["max-players"].value).toBe("8");
		expect(by["server-name"].value).toBe("Our Server");
		expect(by.admin.value).toBe("76561198000000000");
	});

	it("changes a port in place, adds options at the end, and keeps the name quoted when it is renamed", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = byKey(parsed);
		const out = serializeLaunchArgs(parsed, { [by.port.id]: "27100", [by["server-name"].id]: "Our Base", [by.difficulty.id]: "1" });
		expect(out).toContain("--port 27100");
		expect(out).toContain('--server-name "Our Base"');
		expect(out).toContain('--galaxy-name "Our_Galaxy" --datapath galaxy');
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("appends a new option, and a flag, after the existing ones", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = byKey(parsed);
		const out = serializeLaunchArgs(parsed, { [by.difficulty.id]: "2", [by["stdout-to-log"].id]: "true" });
		const line = out.split("\r\n").find((l) => l.startsWith("start "));
		expect(line).toContain("--difficulty 2");
		expect(line).toContain("--stdout-to-log");
		expect(line.indexOf("--difficulty")).toBeGreaterThan(line.indexOf("--admin"));
	});

	it("takes the admin off the line when it is cleared", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = byKey(parsed);
		expect(serializeLaunchArgs(parsed, { [by.admin.id]: "" })).not.toContain("--admin");
	});

	it("offers only the arguments marked editable, as the generic reader reads them, and shows the others as not set", () => {
		const entries = launchArgsEntries(parseLaunchArgs(script, def));
		const offered = entries.map((e) => e.key).sort();
		expect(offered).toEqual(def.args.filter((a) => a.edit !== false).map((a) => a.flag.replace(/^[-+]+/, "")).sort());
		expect(offered).not.toContain("galaxy-name");
		expect(offered).not.toContain("datapath");
		const set = entries.filter((e) => e.value !== "" && e.value !== "false").map((e) => e.key).sort();
		expect(set).toEqual(["admin", "max-players", "port", "query-port", "server-name", "steam-master-port", "steam-query-port"]);
	});

	it("only offers keys the catalog describes", () => {
		const known = new Set(def.args.map((a) => a.flag.replace(/^[-+]+/, "")));
		for (const e of launchArgsEntries(parseLaunchArgs(script, def))) expect(known.has(e.key), e.key).toBe(true);
	});
});

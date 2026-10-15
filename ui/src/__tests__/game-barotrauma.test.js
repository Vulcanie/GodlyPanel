import { describe, it, expect } from "vitest";
import baroUi from "../catalog/games/barotrauma.js";
import baroServer from "../../../src/server/data/games/barotrauma.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// Barotrauma's catalog, held to the rules of catalogs.test.js (every argument explained, flags unique) and checked against the start
// script the server side writes. There is no settings file in the form: serversettings.xml keeps every setting as an attribute of one
// root element, which no reader of the panel handles.

const def = baroUi.launch;
const params = { name: "Test", sessionName: "My Sub Crew", serverPassword: "join1234", port: 27215, queryPort: 27217, instanceSlug: "test" };
const script = baroServer.template.buildStartScript(params);

describe("Barotrauma module", () => {
	it("is registered under the type the server side records", () => {
		expect(baroUi.type).toBe("barotrauma");
		expect(baroUi.type).toBe(baroServer.template.type);
		expect(baroUi.title).toBe("Barotrauma");
		expect(baroUi.guide.name).toBe("Barotrauma");
		expect(baroUi.guide.summary.length).toBeGreaterThan(20);
	});

	it("offers no settings file, and the server records none", () => {
		expect(baroUi.files).toEqual({});
		expect(Object.keys(baroUi.guide.files)).toEqual([]);
		const entry = baroServer.template.buildServerEntry({ ...params, installDir: "C:\\S\\baro", startScriptFilename: "Start_Barotrauma.bat" });
		expect(entry.configPath).toBeUndefined();
		expect(entry.configPaths).toBeUndefined();
	});

	it("says in the guide that there is no clean stop, that the saves are outside the server folder, and how mods are added", () => {
		const text = baroUi.guide.notes.join(" ");
		expect(text).toMatch(/cannot stop the server cleanly/);
		expect(text).toMatch(/loses that round/);
		expect(text).toMatch(/Saves are not in the server's folder/);
		expect(text).toMatch(/%LocalAppData%\\Daedalic Entertainment GmbH\\Barotrauma\\Multiplayer/);
		expect(text).toMatch(/LocalMods/);
		expect(text).toMatch(/config_player\.xml/);
	});

	it("gives every guide note some text", () => {
		for (const note of baroUi.guide.notes) expect(note.trim().length).toBeGreaterThan(20);
	});
});

describe("Barotrauma launch arguments", () => {
	it("gives every argument a label, an explanation and a group", () => {
		expect(def.args.length).toBe(15);
		for (const arg of def.args) {
			expect(arg.label?.trim(), arg.flag).toBeTruthy();
			expect(arg.description?.length, arg.flag).toBeGreaterThan(10);
			expect(arg.group?.trim(), arg.flag).toBeTruthy();
		}
	});

	it("lists each flag once, ignoring case, and each editable key once", () => {
		const flags = def.args.map((a) => a.flag.toLowerCase());
		expect(new Set(flags).size).toBe(flags.length);
		const keys = def.args.filter((a) => a.edit !== false).map((a) => (a.key ?? a.flag.replace(/^[-+]+/, "")).toLowerCase());
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("repeats no choice in a dropdown", () => {
		for (const arg of def.args) {
			if (!arg.options) continue;
			const values = arg.options.map((o) => (Array.isArray(o) ? o[0] : o));
			expect(new Set(values).size, arg.flag).toBe(values.length);
		}
	});

	it("uses the space form and matches the program the server side starts", () => {
		expect(def.style).toBe("space");
		expect(def.editable).toBe(true);
		expect(def.program.test("DedicatedServer.exe")).toBe(true);
		expect(def.program.test(baroServer.template.buildServerEntry({ ...params, installDir: "C:\\S", startScriptFilename: "x.bat" }).processName)).toBe(true);
	});

	it("marks every argument the script writes as managed, and offers only sourced ones", () => {
		const line = script.split("\r\n").find((l) => l.startsWith("start "));
		const written = [...line.matchAll(/ (-[a-z]+)(?= |$)/g)].map((m) => m[1]);
		expect(written).toEqual(["-name", "-port", "-queryport", "-public", "-maxplayers", "-password"]);
		const by = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		for (const flag of [...written, "-nopassword"]) {
			expect(by[flag], `${flag} is on the line but not explained`).toBeTruthy();
			expect(by[flag].managed, flag).toBe(true);
		}
		const flags = def.args.map((a) => a.flag);
		for (const flag of ["-ownerkey", "-endpoint", "-pipes", "-lenienthandshake", "-multiclienttestmode", "-steamid", "-pause", "-savepath"]) expect(flags).not.toContain(flag);
	});

	it("keeps the aliases and the switch that takes no value out of the form", () => {
		const by = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		for (const flag of ["-enableupnp", "-karmaenabled", "-nopassword"]) expect(by[flag].edit, flag).toBe(false);
		expect(by["-nopassword"].kind).toBe("bool");
	});

	it("gives the game's own dropdown values", () => {
		const values = (flag) => def.args.find((a) => a.flag === flag).options.map((o) => (Array.isArray(o) ? o[0] : o));
		expect(values("-playstyle")).toEqual(["Serious", "Casual", "Roleplay", "Rampage", "SomethingDifferent"]);
		expect(values("-karmapreset")).toEqual(["default", "strict", "custom"]);
		expect(values("-public")).toEqual(["True", "False"]);
		expect(values("-language")).toHaveLength(20);
		expect(values("-language")).toContain("European Portuguese");
	});

	it("warns that a password on the line can be read, and about the last-one-wins pair", () => {
		const by = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		expect(by["-password"].description).toMatch(/anyone who can open the start script/);
		expect(by["-nopassword"].description).toMatch(/comes last wins/);
	});

	it("finds the launch line the server side writes, and leaves the script byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
	});

	it("reads the name, ports, player limit and password off the line", () => {
		const by = Object.fromEntries(launchArgsEntries(parseLaunchArgs(script, def)).map((e) => [e.key, e]));
		expect(by.name.value).toBe("My Sub Crew");
		expect(by.port.value).toBe("27215");
		expect(by.queryport.value).toBe("27217");
		expect(by.public.value).toBe("False");
		expect(by.maxplayers.value).toBe("10");
		expect(by.password.value).toBe("join1234");
	});

	it("changes a value in place, keeps the name quoted, and adds a new argument at the end", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.public.id]: "True", [by.name.id]: "Our Crew", [by.playstyle.id]: "Roleplay" });
		expect(out).toContain(" -public True ");
		expect(out).toContain(' -name "Our Crew" ');
		expect(out).toContain(" -port 27215 -queryport 27217 ");
		expect(out).toMatch(/-playstyle Roleplay\s*\r?$/m);
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("offers every argument marked editable, whether or not it is on the line yet", () => {
		const offered = launchArgsEntries(parseLaunchArgs(script, def)).map((e) => e.key).sort();
		const editable = def.args.filter((a) => a.edit !== false).map((a) => a.key ?? a.flag.replace(/^[-+]+/, "")).sort();
		expect(offered).toEqual(editable);
		expect(editable).toContain("karma");
		expect(editable).toContain("language");
	});

	it("parses a line with no password (-nopassword) without calling it unexplained", () => {
		const open = baroServer.template.buildStartScript({ ...params, serverPassword: "" });
		const entries = launchArgsEntries(parseLaunchArgs(open, def));
		expect(entries.length).toBeGreaterThan(0);
		expect(open).toMatch(/ -nopassword\r?$/m);
	});
});

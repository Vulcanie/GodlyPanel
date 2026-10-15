import { describe, it, expect } from "vitest";
import necesseUi from "../catalog/games/necesse.js";
import necesseServer from "../../../src/server/data/games/necesse.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// Necesse's catalog, held to the rules of catalogs.test.js (every argument explained, flags unique) and checked against the start script
// the server side writes. There is no settings file in the form: server.cfg is a Lua-like block no reader of the panel handles, and
// worldSettings.cfg is inside the world's zip.

const def = necesseUi.launch;
const params = { name: "Test", sessionName: "Our World", serverPassword: "join1234", port: 14159, maxPlayers: 6, instanceSlug: "test" };
const script = necesseServer.template.buildStartScript(params);

describe("Necesse module", () => {
	it("is registered under the type the server side records", () => {
		expect(necesseUi.type).toBe("necesse");
		expect(necesseUi.type).toBe(necesseServer.template.type);
		expect(necesseUi.title).toBe("Necesse");
		expect(necesseUi.guide.name).toBe("Necesse");
		expect(necesseUi.guide.summary.length).toBeGreaterThan(20);
	});

	it("offers no settings file, and the server records none", () => {
		expect(necesseUi.files).toEqual({});
		expect(Object.keys(necesseUi.guide.files)).toEqual([]);
		const entry = necesseServer.template.buildServerEntry({ ...params, installDir: "C:\\S\\necesse", startScriptFilename: "Start_Necesse.bat" });
		expect(entry.configPath).toBeUndefined();
		expect(entry.configPaths).toBeUndefined();
	});

	it("says in the guide that there is no clean stop, how to stop by hand, and that worldSettings.cfg is in the world zip", () => {
		const text = necesseUi.guide.notes.join(" ");
		expect(text).toMatch(/cannot stop the server cleanly/);
		expect(text).toMatch(/type `quit`/);
		expect(text).toMatch(/does not save when it is simply closed/);
		expect(text).toMatch(/worldSettings\.cfg/);
		expect(text).toMatch(/-owner/);
		expect(text).toMatch(/mods/i);
	});

	it("gives every guide note some text", () => {
		for (const note of necesseUi.guide.notes) expect(note.trim().length).toBeGreaterThan(20);
	});
});

describe("Necesse launch arguments", () => {
	it("gives every argument a label, an explanation and a group", () => {
		expect(def.args.length).toBe(16);
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
		for (const flag of ["-nogui", "-localdir", "-mod", "-world", "-port"]) expect(by[flag].managed, flag).toBe(true);
		for (const flag of ["-nogui", "-localdir", "-mod", "-logs", "-datadir", "-settings"]) expect(by[flag].edit, flag).toBe(false);
	});

	it("uses the argument spellings the wiki lists, with explicit 1/0 for the on-off ones", () => {
		const flags = def.args.map((a) => a.flag);
		for (const flag of ["-nogui", "-world", "-port", "-slots", "-owner", "-password", "-motd", "-pausewhenempty", "-logging", "-ip", "-ignoreseasons", "-mod", "-localdir"]) {
			expect(flags, flag).toContain(flag);
		}
		const by = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		expect(by["-pausewhenempty"].options.map((o) => o[0])).toEqual(["1", "0"]);
		expect(by["-logging"].options.map((o) => o[0])).toEqual(["1", "0"]);
		expect(by["-nogui"].kind).toBe("bool");
		expect(by["-ignoreseasons"].kind).toBe("bool");
	});

	it("leaves out the arguments the research could not explain with confidence", () => {
		const flags = def.args.map((a) => a.flag.toLowerCase());
		for (const flag of ["-giveclientspower", "-zipsaves", "-language", "-help"]) expect(flags).not.toContain(flag);
	});

	it("finds the launch line the server side writes, and leaves the script byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
	});

	it("reads the world, port, slots and password off the line", () => {
		const by = Object.fromEntries(launchArgsEntries(parseLaunchArgs(script, def)).map((e) => [e.key, e]));
		expect(by.world.value).toBe("Our World");
		expect(by.port.value).toBe("14159");
		expect(by.slots.value).toBe("6");
		expect(by.password.value).toBe("join1234");
	});

	it("changes a port in place, adds an owner at the end, and keeps the world quoted when it is renamed", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.port.id]: "14200", [by.owner.id]: "Alex", [by.world.id]: "Our Base" });
		expect(out).toContain("-port 14200");
		expect(out).toContain('-world "Our Base"');
		expect(out).toContain("-owner Alex");
		expect(out).toContain("-jar Server.jar -nogui -localdir -mod .\\mods");
		expect(out).toContain('-password "join1234"');
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("takes the password off the line when it is cleared", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(serializeLaunchArgs(parsed, { [by.password.id]: "" })).not.toContain("-password");
	});

	it("offers only the arguments marked editable, as the generic reader reads them", () => {
		const offered = launchArgsEntries(parseLaunchArgs(script, def)).map((e) => e.key).sort();
		expect(offered).toEqual(["ignoreseasons", "ip", "logging", "motd", "owner", "password", "pausewhenempty", "port", "slots", "world"]);
	});
});

import { describe, it, expect } from "vitest";
import game from "../catalog/games/battalionlegacy.js";
import server from "../../../src/server/data/games/battalionlegacy.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered. There is no settings file, so only the launch
// line is checked.

const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("BATTALION: Legacy module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("battalionlegacy");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("BATTALION: Legacy");
		expect(game.files).toEqual({});
		expect(Object.keys(game.guide.files)).toEqual([]);
		expect(game.guide.name).toBe("BATTALION: Legacy");
		expect(server.launchOptions).toBe(true);
	});

	it("writes no config file, so its server entry has none", () => {
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 25956, queryPort: 25958 });
		expect(entry.configPaths).toBeUndefined();
	});

	it("explains the missing settings file, the ports and the stop limit", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/No settings file/);
		expect(notes).toMatch(/Two ports, plus one/);
		expect(notes).toMatch(/Ctrl\+C/);
		expect(notes).toMatch(/15 seconds/);
	});
});

describe("BATTALION: Legacy launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group, with flags and form keys nobody else uses", () => {
		expect(def.args.length).toBeGreaterThan(2);
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

	it("keeps the password and the name in the start command's own form, and no argument the sources disagree on", () => {
		const flags = def.args.map((a) => a.flag);
		expect(flags).toEqual(["-Port", "-QueryPort", "-SteamServerName", "-AdminPassword"]);
		for (const left of ["-Queue", "-Log", "-Password", "-defgameini"]) expect(flags).not.toContain(left);
	});

	const script = server.template.buildStartScript({ name: "Test", sessionName: "Friends Battle", adminPassword: "adm1n", queryPort: 25958 });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.QueryPort?.value ?? by.queryport?.value).toBe("25958");
		expect(JSON.stringify(launchArgsEntries(parsed))).toMatch(/Friends Battle/);
		expect(JSON.stringify(launchArgsEntries(parsed))).toMatch(/adm1n/);
	});

	it("changes the server name in place and keeps the rest of the line", () => {
		const parsed = parseLaunchArgs(script, def);
		const entry = launchArgsEntries(parsed).find((e) => /SteamServerName/i.test(e.flag ?? e.key ?? ""));
		expect(entry, "a SteamServerName entry").toBeTruthy();
		const out = serializeLaunchArgs(parsed, { [entry.id]: "New Name" });
		expect(out).toMatch(/-SteamServerName="New Name"/);
		expect(out).toMatch(/-QueryPort=25958/);
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});
});

import { describe, it, expect } from "vitest";
import soulmaskUi from "../catalog/games/soulmask.js";
import soulmaskServer from "../../../src/server/data/games/soulmask.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// Soulmask's catalog, held to the rules of catalogs.test.js (every argument explained, flags unique) and checked against the start
// script the server side writes. Soulmask has no settings file in the form: nothing in the research explains GameXishu.json.

const def = soulmaskUi.launch;
const params = { name: "Test", sessionName: "My Soulmask", serverPassword: "join1234", adminPassword: "boss-pass-1", mapCode: "Level01_Main", mods: "", port: 8777, queryPort: 8779, echoPort: 18888, maxPlayers: 12, instanceSlug: "test" };
const script = soulmaskServer.template.buildStartScript(params);

describe("Soulmask module", () => {
	it("is registered under the type the server side records", () => {
		expect(soulmaskUi.type).toBe("soulmask");
		expect(soulmaskUi.type).toBe(soulmaskServer.template.type);
		expect(soulmaskUi.title).toBe("Soulmask");
		expect(soulmaskUi.guide.name).toBe("Soulmask");
		expect(soulmaskUi.guide.summary.length).toBeGreaterThan(20);
	});

	it("offers no settings file, and the server records none", () => {
		expect(soulmaskUi.files).toEqual({});
		expect(Object.keys(soulmaskUi.guide.files)).toEqual([]);
		const entry = soulmaskServer.template.buildServerEntry({ ...params, installDir: "C:\S\sm", startScriptFilename: "Start_Soulmask.bat" });
		expect(entry.configPaths).toBeUndefined();
		expect(entry.configPath).toBeUndefined();
	});

	it("says in the guide that the panel cannot save the world before it stops it", () => {
		const text = soulmaskUi.guide.notes.join(" ");
		expect(soulmaskUi.guide.notes[0]).toMatch(/Stopping can lose recent progress/);
		expect(text).toMatch(/saveworld 1/);
		expect(text).toMatch(/cannot send/);
		expect(text).toMatch(/-backup/);
	});

	it("gives every guide note some text", () => {
		for (const note of soulmaskUi.guide.notes) expect(note.trim().length).toBeGreaterThan(20);
	});
});

describe("Soulmask launch arguments", () => {
	it("gives every argument a label, an explanation and a group", () => {
		expect(def.args.length).toBe(28);
		for (const arg of def.args) {
			expect(arg.label?.trim(), arg.flag).toBeTruthy();
			expect(arg.description?.length, arg.flag).toBeGreaterThan(15);
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

	it("uses the equals form and matches the program the server side starts", () => {
		expect(def.style).toBe("equals");
		expect(def.editable).toBe(true);
		expect(def.program.test('"WS\\Binaries\\Win64\\WSServer-Win64-Shipping.exe"')).toBe(true);
		expect(def.program.test(soulmaskServer.template.buildServerEntry({ ...params, installDir: "C:\S", startScriptFilename: "x.bat" }).processName)).toBe(true);
	});

	it("marks every argument the script writes as managed", () => {
		const line = script.split("\r\n").find((l) => l.startsWith("start "));
		const written = [...line.matchAll(/ (-[A-Za-z]+)(?==| |$)/g)].map((m) => m[1]);
		const by = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		for (const flag of written) {
			expect(by[flag], `${flag} is on the line but not explained`).toBeTruthy();
			expect(by[flag].managed, flag).toBe(true);
		}
		// -mod is written only when mods are asked for, and is still the panel's.
		expect(by["-mod"].managed).toBe(true);
	});

	it("does not offer the arguments that would break the line or that no source explains", () => {
		const flags = def.args.map((a) => a.flag.toLowerCase());
		for (const flag of ["-forcepassword", "-mapcycle", "-online=steam", "-online", "-silent", "-gamedistindex", "-nosteam"]) expect(flags).not.toContain(flag);
		const by = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		for (const flag of ["-server", "-forcepassthrough", "-log", "-UTF8Output", "-coef", "-serverid", "-mainserverport", "-clientserverconnect"]) expect(by[flag].edit, flag).toBe(false);
	});

	it("explains the ban list masks", () => {
		const d = def.args.find((a) => a.flag === "-serverpm").description;
		for (const part of ["1 ", "2 ", "4 ", "8 ", "16 "]) expect(d).toContain(part);
	});

	it("finds the launch line the server side writes, and leaves the script byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
	});

	it("reads the name, passwords, ports and timers off the line", () => {
		const by = Object.fromEntries(launchArgsEntries(parseLaunchArgs(script, def)).map((e) => [e.key, e]));
		expect(by.SteamServerName.value).toBe("My Soulmask");
		expect(by.PSW.value).toBe("join1234");
		expect(by.adminpsw.value).toBe("boss-pass-1");
		expect(by.PORT.value).toBe("8777");
		expect(by.QueryPort.value).toBe("8779");
		expect(by.EchoPort.value).toBe("18888");
		expect(by.MaxPlayers.value).toBe("12");
		expect(by.saving.value).toBe("600");
		expect(by.backup.value).toBe("900");
		expect(by.serverpm.value).toBe("2");
	});

	it("changes a value in place, keeps the name quoted when it is renamed, and keeps the map and the required arguments", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.backup.id]: "300", [by.SteamServerName.id]: "Our Camp" });
		expect(out).toContain("-backup=300");
		expect(out).toContain('-SteamServerName="Our Camp"');
		for (const kept of [" Level01_Main -log -server -UTF8Output ", " -forcepassthrough ", " -PORT=8777 ", " -QueryPort=8779 ", " -EchoPort=18888 "]) expect(out).toContain(kept);
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("keeps the mod list quoted when the line already has one", () => {
		const withMods = soulmaskServer.template.buildStartScript({ ...params, mods: "3331511657,3325592770" });
		const parsed = parseLaunchArgs(withMods, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.mod.value).toBe("3331511657,3325592770");
		expect(serializeLaunchArgs(parsed, { [by.mod.id]: "3331511657" })).toContain('-mod="3331511657"');
	});

	it("offers every argument marked editable, whether or not it is on the line yet", () => {
		const offered = launchArgsEntries(parseLaunchArgs(script, def)).map((e) => e.key).sort();
		const editable = def.args.filter((a) => a.edit !== false).map((a) => a.key ?? a.flag.replace(/^[-+]+/, "")).sort();
		expect(offered).toEqual(editable);
		expect(editable).toContain("mod");
		expect(editable).toContain("pvp");
	});
});

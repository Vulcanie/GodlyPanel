import { describe, it, expect } from "vitest";
import icarusUi, { ICARUS_SECTION } from "../catalog/games/icarus.js";
import icarusServer from "../../../src/server/data/games/icarus.js";
import { parseIni } from "../configParsers/ini.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// Icarus's catalog, held to the rules of catalogs.test.js (every setting explained, no repeated choice) and checked against the
// start script and settings file the server side writes.

const file = icarusUi.files["ServerSettings.ini"];
const settings = Object.entries(file.settings);
const def = icarusUi.launch;
const params = { name: "Test", sessionName: "My Icarus Server", serverPassword: "join1234", adminPassword: "boss-pass-1", port: 17777, queryPort: 17779, maxPlayers: 6, instanceSlug: "test" };

describe("Icarus module", () => {
	it("is registered under the type the server side records", () => {
		expect(icarusUi.type).toBe("icarus");
		expect(icarusUi.type).toBe(icarusServer.template.type);
		expect(icarusUi.title).toBe("Icarus");
		expect(icarusUi.guide.name).toBe("Icarus");
		expect(icarusUi.guide.files["ServerSettings.ini"]).toBeTruthy();
	});

	it("names the settings file the server side records", () => {
		const entry = icarusServer.template.buildServerEntry({ ...params, installDir: "C:\\S\\icarus", startScriptFilename: "Start_Icarus.bat" });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(icarusUi.files));
	});
});

describe("Icarus settings", () => {
	it("gives every setting a label, an explanation and a group", () => {
		expect(settings.length).toBe(12);
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
			for (const o of meta.options) if (o.value !== "") expect(o.label?.trim(), key).toBeTruthy();
		}
	});

	it("only names groups in groupOrder that exist, and puts every setting in a declared group", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), `groupOrder lists "${g}" with no setting`).toBe(true);
		for (const g of groups) expect(file.groupOrder, g).toContain(g);
	});

	it("uses the ini parser and keys that are written Section::Key", () => {
		expect(file.parser).toBe("ini");
		for (const [key] of settings) expect(key.startsWith(`${ICARUS_SECTION}::`), key).toBe(true);
		expect(file.sectionLabels[ICARUS_SECTION]).toBeTruthy();
		expect(file.mayBeMissing).toBeTruthy();
	});

	it("explains exactly the keys of the settings file the panel writes, and shows them all", () => {
		const parsed = parseIni(icarusServer.template.buildConfigFile(params).content);
		const written = parsed.entries.map((e) => `${e.section}::${e.key}`).sort();
		expect(written).toEqual(settings.map(([k]) => k).sort());
		// The first line is the section the keys are in.
		expect(new Set(parsed.entries.map((e) => e.section))).toEqual(new Set([ICARUS_SECTION]));
	});

	it("does not explain difficulty as a file setting, because no file has it", () => {
		for (const [key, meta] of settings) expect(/difficulty/i.test(key), key).toBe(false);
		expect(file.settings[`${ICARUS_SECTION}::CreateProspect`].description).toMatch(/difficulty/i);
	});
});

describe("Icarus launch arguments", () => {
	it("gives every argument a label, an explanation and a group", () => {
		expect(def.args.length).toBe(11);
		for (const arg of def.args) {
			expect(arg.label?.trim(), arg.flag).toBeTruthy();
			expect(arg.description?.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group?.trim(), arg.flag).toBeTruthy();
		}
	});

	it("lists each flag once, ignoring case (the guide's links ignore case)", () => {
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
		for (const flag of ["-Log", "-SteamServerName", "-PORT", "-QueryPort"]) expect(by[flag].managed, flag).toBe(true);
		for (const flag of ["-Log", "-UserDir", "-saveddirsuffix", "-ABSLOG", "-CreateProspect", "-LoadProspect"]) expect(by[flag].edit, flag).toBe(false);
	});

	it("leaves out the arguments only third parties show", () => {
		const flags = def.args.map((a) => a.flag.toLowerCase());
		for (const flag of ["-maxplayers", "-joinpassword", "-nosteam"]) expect(flags).not.toContain(flag);
	});

	const script = icarusServer.template.buildStartScript(params);

	it("finds the launch line the server side writes, and leaves the script byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
	});

	it("reads the name and both ports off the line", () => {
		const by = Object.fromEntries(launchArgsEntries(parseLaunchArgs(script, def)).map((e) => [e.key, e]));
		expect(by.SteamServerName.value).toBe("My Icarus Server");
		expect(by.PORT.value).toBe("17777");
		expect(by.QueryPort.value).toBe("17779");
	});

	it("changes a port in place and keeps the name quoted when it is renamed", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.PORT.id]: "17800", [by.SteamServerName.id]: "Our Base Camp" });
		expect(out).toContain("-PORT=17800");
		expect(out).toContain('-SteamServerName="Our Base Camp"');
		expect(out).toContain("-Log");
		expect(out).toContain("-QueryPort=17779");
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("offers only the arguments marked editable, as the generic reader reads them", () => {
		const offered = launchArgsEntries(parseLaunchArgs(script, def)).map((e) => e.key).sort();
		expect(offered).toEqual(["MULTIHOME", "PORT", "QueryPort", "ResumeProspect", "SteamServerName"]);
	});
});

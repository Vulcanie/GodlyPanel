import { describe, it, expect } from "vitest";
import astroUi, { ASTRONEER_SECTION, ENGINE_SECTION } from "../catalog/games/astroneer.js";
import astroServer, { SETTINGS_SECTION } from "../../../src/server/data/games/astroneer.js";
import { parseIni } from "../configParsers/ini.js";

// Astroneer's catalog, held to the rules of catalogs.test.js (every setting explained, no repeated choice) and checked against the
// two files the server side writes.

const params = {
	name: "Test", sessionName: "My Astro Base", serverPassword: "join-1234", ownerName: "Astro Owner", ownerGuid: "76561198000000000",
	publicIp: "203.0.113.5", port: 8787, instanceSlug: "test", installDir: "C:\\S\\astroneer", startScriptFilename: "Start_Astroneer.bat",
};

const settingsFile = astroUi.files["AstroServerSettings.ini"];
const engineFile = astroUi.files["Engine.ini"];
const settings = Object.entries(settingsFile.settings);
const engine = Object.entries(engineFile.settings);
const written = parseIni(astroServer.template.buildConfigFile(params).content);
const writtenEngine = parseIni(astroServer.template.buildExtraFiles(params)[0].content);

describe("Astroneer module", () => {
	it("is registered under the type the server side records", () => {
		expect(astroUi.type).toBe("astroneer");
		expect(astroUi.type).toBe(astroServer.template.type);
		expect(astroUi.title).toBe("Astroneer");
		expect(astroUi.guide.name).toBe("Astroneer");
		expect(astroUi.guide.short).toBeTruthy();
		expect(astroUi.guide.summary.length).toBeGreaterThan(20);
		expect(astroUi.guide.notes.length).toBeGreaterThan(0);
	});

	it("names the files the server side records, and explains each in the guide", () => {
		const entry = astroServer.template.buildServerEntry(params);
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(astroUi.files));
		for (const name of Object.keys(astroUi.files)) expect(astroUi.guide.files[name], name).toBeTruthy();
	});

	it("has no launch form, because the program takes no documented argument", () => {
		expect(astroUi.launch).toBeNull();
		expect(astroServer.launchOptions).toBe(false);
	});
});

describe("Astroneer settings", () => {
	it("gives every setting a label, an explanation and a group", () => {
		expect(settings.length).toBe(14);
		expect(engine.length).toBe(1);
		for (const [key, meta] of [...settings, ...engine]) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("lists each choice of a dropdown once, with a label", () => {
		for (const [key, meta] of [...settings, ...engine]) {
			if (!meta.options) continue;
			const values = meta.options.map((o) => o.value);
			expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
			for (const o of meta.options) if (o.value !== "") expect(o.label?.trim(), key).toBeTruthy();
		}
	});

	it("only names groups in groupOrder that exist, and puts every setting in a declared group", () => {
		for (const [file, list] of [[settingsFile, settings], [engineFile, engine]]) {
			const groups = new Set(list.map(([, m]) => m.group));
			for (const g of file.groupOrder) expect(groups.has(g), `groupOrder lists "${g}" with no setting`).toBe(true);
			for (const g of groups) expect(file.groupOrder, g).toContain(g);
		}
	});

	it("uses the ini parser and keys that are written Section::Key", () => {
		for (const file of [settingsFile, engineFile]) {
			expect(file.parser).toBe("ini");
			expect(file.mayBeMissing).toBeTruthy();
		}
		for (const [key] of settings) expect(key.startsWith(`${ASTRONEER_SECTION}::`), key).toBe(true);
		for (const [key] of engine) expect(key.startsWith(`${ENGINE_SECTION}::`), key).toBe(true);
		expect(settingsFile.sectionLabels[ASTRONEER_SECTION]).toBeTruthy();
		expect(engineFile.sectionLabels[ENGINE_SECTION]).toBeTruthy();
		expect(ASTRONEER_SECTION).toBe(SETTINGS_SECTION);
	});

	it("explains only keys that the settings file the panel writes has", () => {
		const keys = new Set(written.entries.map((e) => `${e.section}::${e.key}`));
		for (const [key] of settings) expect(keys.has(key), `${key} is not written by the panel`).toBe(true);
		expect(new Set(written.entries.map((e) => e.section))).toEqual(new Set([ASTRONEER_SECTION]));
	});

	it("explains the game port, which is the one key of Engine.ini", () => {
		const keys = writtenEngine.entries.map((e) => `${e.section}::${e.key}`);
		expect(keys).toEqual(engine.map(([k]) => k));
		expect(keys).toEqual(["URL::Port"]);
	});

	it("leaves out the keys no page explains, and the player limit whose name is disputed", () => {
		const names = settings.map(([k]) => k.split("::")[1]);
		for (const k of ["bLoadAutoSave", "bWaitForPlayersBeforeShutdown", "ServerGuid", "bDisableServerTravel", "VerbosePlayerProperties", "ShareCode", "MaxPlayerCount", "MaximumPlayerCount"]) {
			expect(names, k).not.toContain(k);
		}
	});

	it("says the server will not start without the public IP, the owner's name and id", () => {
		for (const k of ["PublicIP", "OwnerName", "OwnerGuid"]) {
			expect(settingsFile.settings[`${ASTRONEER_SECTION}::${k}`].description, k).toMatch(/does not start/i);
		}
	});
});

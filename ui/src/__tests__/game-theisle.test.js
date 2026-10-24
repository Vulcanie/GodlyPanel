import { describe, it, expect } from "vitest";
import theisleUi, { SESSION_SECTION } from "../catalog/games/theisle.js";
import theisleServer from "../../../src/server/data/games/theisle.js";
import { parseIni } from "../configParsers/ini.js";

// The Isle's catalog, held to the rules of catalogs.test.js (every setting explained, no repeated choice, declared groups) and checked
// against the file the server side writes.

const params = {
	name: "Test Isle", sessionName: "My Isle Server", serverPassword: "join-1234", port: 25920, instanceSlug: "test-isle",
	installDir: "C:\\Servers\\theisle", startScriptFilename: "Start_TheIsle.bat",
};

const gameFile = theisleUi.files["Game.ini"];
const settings = Object.entries(gameFile.settings);
const written = parseIni(theisleServer.template.buildConfigFile(params).content);

describe("The Isle module", () => {
	it("is registered under the type the server side records", () => {
		expect(theisleUi.type).toBe("theisle");
		expect(theisleUi.type).toBe(theisleServer.template.type);
		expect(theisleUi.title).toBe("The Isle (Evrima)");
		expect(theisleUi.guide.name).toBeTruthy();
		expect(theisleUi.guide.short).toBeTruthy();
		expect(theisleUi.guide.summary.length).toBeGreaterThan(20);
		expect(theisleUi.guide.notes.length).toBeGreaterThan(0);
	});

	it("names the files the server side records, and explains each in the guide", () => {
		const entry = theisleServer.template.buildServerEntry(params);
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(theisleUi.files));
		for (const name of Object.keys(theisleUi.files)) expect(theisleUi.guide.files[name], name).toBeTruthy();
	});

	it("has no launch form, because the panel writes the only launch arguments itself", () => {
		expect(theisleUi.launch).toBeNull();
		expect(theisleServer.launchOptions).toBe(false);
	});
});

describe("The Isle settings", () => {
	it("holds the settings the dossier states with a default and a description", () => {
		expect(settings.length).toBe(29);
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

	it("gives every true/false setting a Yes and No choice", () => {
		for (const [key, meta] of settings) {
			if (!/::b[A-Z]/.test(key)) continue;
			expect(meta.options?.map((o) => o.value), key).toEqual(["true", "false"]);
		}
	});

	it("does not give two settings in one group the same label with different explanations", () => {
		const seen = new Map();
		for (const [, meta] of settings) {
			const id = `${meta.group}/${meta.label}`;
			if (seen.has(id)) expect(meta.description, `"${meta.label}" repeats in ${meta.group}`).toBe(seen.get(id));
			seen.set(id, meta.description);
		}
	});

	it("only names groups in groupOrder that exist, and puts every setting in a declared group", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of gameFile.groupOrder) expect(groups.has(g), `groupOrder lists "${g}" with no setting`).toBe(true);
		for (const g of groups) expect(gameFile.groupOrder, g).toContain(g);
	});

	it("uses the ini parser and keys that are written Section::Key under the session section", () => {
		expect(gameFile.parser).toBe("ini");
		expect(gameFile.mayBeMissing).toBeTruthy();
		for (const [key] of settings) expect(key.startsWith(`${SESSION_SECTION}::`), key).toBe(true);
		expect(gameFile.sectionLabels[SESSION_SECTION]).toBeTruthy();
		expect(SESSION_SECTION).toBe("/Script/TheIsle.TIGameSession");
	});

	it("explains every key the panel writes into Game.ini", () => {
		const keys = new Set(settings.map(([k]) => k));
		for (const e of written.entries) expect(keys.has(`${e.section}::${e.key}`), `${e.key} is written but not explained`).toBe(true);
		expect(new Set(written.entries.map((e) => e.section))).toEqual(new Set([SESSION_SECTION]));
	});

	it("leaves out the keys whose sources disagree and the RCON and admin keys", () => {
		const names = settings.map(([k]) => k.split("::")[1]);
		for (const k of ["bQueueEnabled", "QueuePort", "RconPort", "bRconEnabled", "RconPassword", "AllowedClasses", "AdminsSteamIDs", "WhitelistIDs", "VIPs"]) {
			expect(names, k).not.toContain(k);
		}
	});

	it("explains the join password as optional and turned on by its own switch", () => {
		expect(theisleUi.files["Game.ini"].settings[`${SESSION_SECTION}::ServerPassword`].description).toMatch(/only used when/i);
		expect(theisleUi.files["Game.ini"].settings[`${SESSION_SECTION}::bServerPassword`].description).toMatch(/join password/i);
	});
});

import { describe, it, expect } from "vitest";
import reforger from "../catalog/games/armareforger.js";
import game from "../../../src/server/data/games/armareforger.js";
import { CONFIG_CATALOG, annotateEntries } from "../configCatalog.js";
import { parseJsonConfig, serializeJsonConfig, flattenJsonEntries } from "../configParsers/json.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// Arma Reforger's catalog is written from the research dossier (BI wiki Server Config / Startup Parameters). The rules are the ones
// catalogs.test.js applies to every game, which cannot see a game until it is registered.

const FILE = "server-config.json";
const file = reforger.files[FILE];
const settings = Object.entries(file.settings);
const params = { name: "Test", sessionName: "My Server", serverPassword: "secret1", adminPassword: "adminpw99", port: 2001, queryPort: 17877, instanceSlug: "main" };

describe("Arma Reforger module", () => {
	it("has the shape the interface expects, and the type its template uses", () => {
		expect(reforger.type).toBe("armareforger");
		expect(reforger.type).toBe(game.template.type);
		expect(reforger.title).toBe("Arma Reforger");
		expect(Object.keys(reforger.files)).toEqual([FILE]);
		expect(file.parser).toBe("json");
		const entry = game.template.buildServerEntry({ ...params, installDir: "C:\\x", startScriptFilename: "s.bat" });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(reforger.files));
		expect(reforger.guide.name).toBe("Arma Reforger");
		expect(Object.keys(reforger.guide.files)).toEqual([FILE]);
		expect(game.launchOptions).toBe(true);
	});

	it("tells people the things the form cannot: mods, admins, the ports, the missing clean stop", () => {
		const notes = reforger.guide.notes.join("\n");
		expect(notes).toMatch(/game\.mods/);
		expect(notes).toMatch(/modID/);
		expect(notes).toMatch(/game\.admins/);
		expect(notes).toMatch(/publicPort/);
		expect(notes).toMatch(/BEServer_x64\.cfg/);
		expect(notes).toMatch(/15 seconds/);
	});
});

describe("Arma Reforger: server-config.json", () => {
	it("writes every key as a dotted path from the file's root, once", () => {
		expect(settings.length).toBeGreaterThan(30);
		for (const [key] of settings) expect(key, key).toMatch(/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)*$/);
		expect(new Set(settings.map(([k]) => k)).size).toBe(settings.length);
		// The wiki's names, case and all.
		for (const k of ["game.gameProperties.battlEye", "game.gameProperties.VONDisableUI", "game.gameProperties.fastValidation", "operating.joinQueue.maxSize", "a2s.port", "publicPort", "game.scenarioId"]) {
			expect(file.settings[k], k).toBeTruthy();
		}
	});

	it("gives every setting a label, an explanation and a group", () => {
		for (const [key, meta] of settings) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("keeps the dossier's own notes out of what players read", () => {
		for (const [key, meta] of settings) expect(meta.description, key).not.toMatch(/NOT FOUND|UNVERIFIED|UNSURE|CONFLICT|XGamingServer|\[|\]/);
	});

	it("lists each choice of a dropdown once, with a label", () => {
		const dropdowns = settings.filter(([, m]) => m.options);
		expect(dropdowns.map(([k]) => k)).toEqual(["rcon.permission"]);
		for (const [key, meta] of dropdowns) {
			const values = meta.options.map((o) => o.value);
			expect(new Set(values).size, key).toBe(values.length);
			for (const o of meta.options) expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
		}
		expect(file.settings["rcon.permission"].options.map((o) => o.value)).toEqual(["admin", "monitor"]);
	});

	it("gives two settings in a group the same label only when they are the same thing under two names", () => {
		const seen = new Map();
		for (const [key, meta] of settings) {
			const id = `${meta.group}/${meta.label}`;
			if (seen.has(id)) expect(meta.description, `${key} repeats "${meta.label}" in ${meta.group}`).toBe(seen.get(id));
			seen.set(id, meta.description);
		}
	});

	it("names only groups that exist in groupOrder, and orders every group", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), `groupOrder lists "${g}" but no setting is in it`).toBe(true);
		for (const g of groups) expect(file.groupOrder, g).toContain(g);
	});

	it("leaves out what the sources disagree on or only one community page has, and the lists", () => {
		for (const k of [
			"dedicatedServerId", "region", "game.modsRequiredByDefault", "game.mods", "game.mods.modID", "game.admins", "game.supportedPlatforms",
			"rcon.blacklist", "rcon.whitelist", "operating.disableNavmeshStreaming", "game.gameProperties.persistence.databases",
			"game.gameProperties.persistence.storages", "game.gameProperties.missionHeader",
		]) {
			expect(file.settings[k], k).toBeUndefined();
		}
		expect(file.structuredPaths).toEqual([]);
	});

	it("explains every setting of the file the panel writes, except the two lists, and shows the groups in order", () => {
		CONFIG_CATALOG.armareforger = { files: { [FILE]: file } };
		const written = JSON.parse(game.template.buildConfigFile(params).content);
		const parsed = parseJsonConfig(JSON.stringify(written));
		const entries = flattenJsonEntries(parsed, new Set(file.structuredPaths));
		const { groups, undocumented } = annotateEntries("armareforger", FILE, entries);
		const all = groups.flatMap((g) => g.settings);
		expect(all.filter((e) => !e.documented).map((e) => e.path).sort()).toEqual(["game.admins", "game.mods"]);
		expect(undocumented).toBe(2);
		// The lists are kept as text that can be edited.
		expect(all.find((e) => e.path === "game.mods").rawJson).toBe(true);
		const order = groups.map((g) => g.name);
		const declared = file.groupOrder.filter((g) => order.includes(g));
		expect(order.filter((g) => declared.includes(g))).toEqual(declared);
		// What is left undocumented sits after the declared groups.
		expect(order.slice(declared.length)).toEqual(["More server settings (mods and admins)"]);
		// The things people change are there to change.
		for (const p of ["game.name", "game.password", "game.maxPlayers", "game.scenarioId", "game.gameProperties.battlEye", "operating.joinQueue.maxSize", "publicPort", "a2s.port"]) {
			expect(all.find((e) => e.path === p), p).toBeTruthy();
		}
		// Real booleans and numbers stay that way, and an edit changes only its own key.
		expect(all.find((e) => e.path === "game.gameProperties.battlEye").value).toBe(true);
		const out = JSON.parse(serializeJsonConfig(parsed, { "game.name": "New Name", "game.maxPlayers": 32, "game.gameProperties.battlEye": false }));
		expect(out.game.name).toBe("New Name");
		expect(out.game.maxPlayers).toBe(32);
		expect(out.game.gameProperties.battlEye).toBe(false);
		expect({ ...out, game: { ...out.game, name: written.game.name, maxPlayers: written.game.maxPlayers, gameProperties: { ...out.game.gameProperties, battlEye: true } } }).toEqual(written);
	});

	it("explains the settings of the wiki's template that the panel leaves out of its first file, if a person adds them", () => {
		for (const k of ["bindAddress", "bindPort", "publicAddress", "rcon.address", "rcon.port", "rcon.password", "rcon.maxClients", "rcon.permission", "game.crossPlatform"]) {
			expect(file.settings[k], k).toBeTruthy();
		}
	});

	it("explains each setting of the first file with a path the catalog has", () => {
		const written = JSON.parse(game.template.buildConfigFile(params).content);
		const leaves = [];
		const walk = (o, base) => {
			for (const [k, v] of Object.entries(o)) {
				const p = base ? `${base}.${k}` : k;
				if (v && typeof v === "object" && !Array.isArray(v)) walk(v, p);
				else if (!Array.isArray(v)) leaves.push(p);
			}
		};
		walk(written, "");
		for (const p of leaves) expect(file.settings[p], p).toBeTruthy();
	});
});

describe("Arma Reforger: launch arguments", () => {
	const def = reforger.launch;
	const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

	it("gives every argument a label, an explanation and a group, with a flag nobody else uses", () => {
		expect(def.args.length).toBeGreaterThan(20);
		for (const arg of def.args) {
			expect(arg.label?.trim(), arg.flag).toBeTruthy();
			expect(arg.description.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group?.trim(), arg.flag).toBeTruthy();
			expect(["value", "bool"]).toContain(arg.kind);
			expect(arg.flag).toMatch(/^-[A-Za-z][A-Za-z-]*$/);
		}
		const flags = def.args.map((a) => a.flag.toLowerCase());
		expect(new Set(flags).size).toBe(flags.length);
		const keys = def.args.filter((a) => a.edit !== false).map(keyOf);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("joins values with a space, the way the wiki writes them", () => {
		expect(def.style).toBe("space");
		expect(def.editable).toBe(true);
		expect(def.args.every((a) => !a.style)).toBe(true);
	});

	it("lists only dropdown values with a label, each once", () => {
		for (const arg of def.args) {
			if (!arg.options) continue;
			const values = arg.options.map((o) => (Array.isArray(o) ? o[0] : o));
			expect(new Set(values).size, arg.flag).toBe(values.length);
			for (const o of arg.options) expect(Array.isArray(o) ? o[1] : o, `${arg.flag} choice`).toBeTruthy();
		}
		const by = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		expect(by["-logLevel"].options.map((o) => o[0])).toEqual(["normal", "warning", "error", "fatal"]);
		expect(by["-freezeCheckMode"].options.map((o) => o[0])).toEqual(["crash", "minidump", "kill"]);
		expect(by["-logTime"].options.map((o) => o[0])).toEqual(["none", "time", "datetime"]);
	});

	it("leaves out the arguments that would undo the panel's settings or that the sources disagree on", () => {
		const flags = new Set(def.args.map((a) => a.flag));
		for (const f of ["-server", "-addons", "-addonsDir", "-aiLimit", "-aiPartialSim", "-bindIP", "-bindPort", "-a2sPort", "-a2sIpAddress", "-world", "-rpl-timeout-disable", "-autodeployFaction"]) {
			expect(flags.has(f), f).toBe(false);
		}
		for (const f of ["-config", "-maxFPS", "-profile"]) expect(flags.has(f), f).toBe(true);
	});

	it("reads the line the panel writes, offers the explained arguments, and leaves it byte-for-byte alone when nothing changes", () => {
		const script = game.template.buildStartScript(params);
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.maxFPS.value).toBe("60");
		expect(by.profile.value).toBe("%~dp0profile");
		// -config is explained but not offered in the form (the panel always writes it).
		expect(by.config).toBeUndefined();
		const explained = new Set(def.args.filter((a) => a.edit !== false).map(keyOf));
		for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), entry.key).toBe(true);
		// The only thing the form does not read is -config and its path, which it keeps as they are.
		expect(parsed.items.filter((i) => !i.arg).map((i) => i.raw)).toEqual(["-config", '".\\Configs\\server-config.json"']);
		// -config is the only argument the panel owns that the form hides.
		expect(def.args.filter((a) => a.edit === false).map((a) => a.flag)).toEqual(["-config"]);
	});

	it("changes the frame rate in place and adds a switch and a value at the end", () => {
		const script = game.template.buildStartScript(params);
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.maxFPS.id]: "90", [by.logLevel.id]: "warning", [by.noThrow.id]: "true", [by.logStats.id]: "5000" });
		expect(out).toContain("-maxFPS 90");
		expect(out).not.toContain("-maxFPS 60");
		expect(out).toMatch(/-config "\.\\Configs\\server-config\.json" -profile "%~dp0profile" -maxFPS 90 -logLevel warning -noThrow -logStats 5000$/m);
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
		// Taking a switch off again gives the original line.
		const again = parseLaunchArgs(out, def);
		const byAgain = Object.fromEntries(launchArgsEntries(again).map((e) => [e.key, e]));
		expect(serializeLaunchArgs(again, { [byAgain.maxFPS.id]: "60", [byAgain.logLevel.id]: "", [byAgain.noThrow.id]: "false", [byAgain.logStats.id]: "" })).toBe(script);
	});

	it("does not mistake a value that starts with a dash for another argument", () => {
		const parsed = parseLaunchArgs(game.template.buildStartScript(params) + "", def);
		const out = serializeLaunchArgs(parsed, { [launchArgsEntries(parsed).find((e) => e.key === "streamsDelta").id]: "100" });
		expect(out).toContain("-streamsDelta 100");
	});
});

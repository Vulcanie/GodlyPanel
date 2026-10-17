import { describe, it, expect } from "vitest";
import terrariaUi from "../catalog/games/terraria.js";
import terrariaServer from "../../../src/server/data/games/terraria.js";
import { parseProperties, serializeProperties } from "../configParsers/properties.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// Terraria (tModLoader)'s catalog, held to the rules of catalogs.test.js (every setting and argument explained, flags unique, no repeated
// choice) and checked against the files the server side writes: serverconfig.txt, which the panel's "properties" reader handles as it is,
// and the start script's launch line.

const file = terrariaUi.files["serverconfig.txt"];
const def = terrariaUi.launch;
const params = { name: "Test", sessionName: "Our World", serverPassword: "join1234", port: 7878, maxPlayers: 6, mods: "", installDir: "C:\\Servers\\terraria", instanceSlug: "test" };
const script = terrariaServer.template.buildStartScript(params);
const config = terrariaServer.template.buildConfigFile(params).content;

describe("Terraria module", () => {
	it("is registered under the type the server side records", () => {
		expect(terrariaUi.type).toBe("terraria");
		expect(terrariaUi.type).toBe(terrariaServer.template.type);
		expect(terrariaUi.title).toBe("Terraria (tModLoader)");
		expect(terrariaUi.guide.name).toBe("Terraria (tModLoader)");
		expect(terrariaUi.guide.summary.length).toBeGreaterThan(20);
	});

	it("offers the one settings file the server records", () => {
		expect(Object.keys(terrariaUi.files)).toEqual(["serverconfig.txt"]);
		expect(Object.keys(terrariaUi.guide.files)).toEqual(["serverconfig.txt"]);
		const entry = terrariaServer.template.buildServerEntry({ ...params, installDir: "C:\\S\\terraria", startScriptFilename: "Start_Terraria.bat" });
		expect(Object.keys(entry.configPaths)).toEqual(["serverconfig.txt"]);
		expect(file.parser).toBe("properties");
	});

	it("says in the guide that there is no clean stop, how to stop by hand, and who can join", () => {
		const text = terrariaUi.guide.notes.join(" ");
		expect(terrariaUi.guide.notes[0]).toMatch(/cannot stop the server cleanly/);
		expect(text).toMatch(/type `exit`/);
		expect(text).toMatch(/Only tModLoader players can join/);
		expect(text).toMatch(/\.NET/);
		expect(text).toMatch(/enabled\.json/);
		expect(text).toMatch(/required items/i);
	});

	it("gives every guide note some text", () => {
		for (const note of terrariaUi.guide.notes) expect(note.trim().length).toBeGreaterThan(20);
	});
});

describe("Terraria serverconfig.txt settings", () => {
	const settings = Object.entries(file.settings);

	it("gives every setting a label, an explanation and a group", () => {
		expect(settings.length).toBe(26);
		for (const [key, meta] of settings) {
			expect(key.startsWith("root::"), key).toBe(true);
			expect(meta.label?.trim(), key).toBeTruthy();
			expect(meta.description?.trim().length, key).toBeGreaterThan(10);
			expect(meta.group?.trim(), key).toBeTruthy();
		}
	});

	it("repeats no choice in a dropdown", () => {
		for (const [key, meta] of settings) {
			if (!meta.options) continue;
			const values = meta.options.map((o) => o.value);
			expect(new Set(values).size, key).toBe(values.length);
		}
	});

	it("uses the key spellings of the game's own example file, in lower case", () => {
		const keys = settings.map(([key]) => key.replace(/^root::/, ""));
		for (const key of ["world", "autocreate", "worldname", "seed", "difficulty", "password", "motd", "secure", "language", "banlist", "upnp", "npcstream", "priority", "modpath", "modpack"]) {
			expect(keys, key).toContain(key);
		}
		for (const key of keys) expect(key, key).toBe(key.toLowerCase());
		expect(keys.filter((k) => k.startsWith("journeypermission_")).length).toBe(11);
	});

	it("leaves out the port and player limit (on the launch line) and the settings nothing could explain", () => {
		const keys = settings.map(([key]) => key.replace(/^root::/, ""));
		for (const key of ["port", "maxplayers", "worldrollbackstokeep", "journeypermission_setspawnrate", "journeypermission_setdifficulty", "journeypermission_increaseplacementrange", "journeypermission_biomespread_setfrozen"]) {
			expect(keys, key).not.toContain(key);
		}
	});

	it("offers the values the game's files list", () => {
		const options = (key) => file.settings[`root::${key}`].options.map((o) => o.value);
		expect(options("autocreate")).toEqual(["1", "2", "3"]);
		expect(options("difficulty")).toEqual(["0", "1", "2", "3"]);
		expect(options("priority")).toEqual(["0", "1", "2", "3", "4", "5"]);
		expect(options("language")).toEqual(["en-US", "de-DE", "it-IT", "fr-FR", "es-ES", "ru-RU", "zh-Hans", "pt-BR", "pl-PL"]);
		expect(options("journeypermission_godmode")).toEqual(["0", "1", "2"]);
	});

	it("only names groups in groupOrder that exist", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), g).toBe(true);
		for (const g of groups) expect(file.groupOrder, g).toContain(g);
	});

	it("reads the file the server side writes, every line of it a setting the catalog explains", () => {
		const parsed = parseProperties(config);
		expect(parsed.entries.map((e) => e.key)).toEqual(["world", "autocreate", "worldname", "password"]);
		for (const entry of parsed.entries) expect(file.settings[`root::${entry.key}`], entry.key).toBeTruthy();
	});

	it("changes a value in place and leaves the comments and the other lines alone", () => {
		const parsed = parseProperties(config);
		const by = Object.fromEntries(parsed.entries.map((e) => [e.key, e]));
		const out = serializeProperties(parsed, { [by.autocreate.id]: "3", [by.password.id]: "new pass" });
		expect(out).toContain("autocreate=3");
		expect(out).toContain("password=new pass");
		expect(out).toContain("world=C:\\Servers\\terraria\\tmldata\\Worlds\\Our World.wld");
		expect(out.split("\n").filter((l) => l.startsWith("#")).length).toBe(config.split("\r\n").filter((l) => l.startsWith("#")).length);
		expect(serializeProperties(parsed, {}).replace(/\n/g, "\r\n")).toBe(config);
	});

	it("keeps a password with an equals sign and a hash in it whole", () => {
		const text = terrariaServer.template.buildConfigFile({ ...params, serverPassword: "a=b#c d" }).content;
		const parsed = parseProperties(text);
		expect(parsed.entries.find((e) => e.key === "password").value).toBe("a=b#c d");
	});
});

describe("Terraria launch arguments", () => {
	it("gives every argument a label, an explanation and a group", () => {
		expect(def.args.length).toBe(17);
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
		for (const flag of ["-nosteam", "-config", "-tmlsavedirectory", "-port", "-players"]) expect(by[flag].managed, flag).toBe(true);
		for (const flag of ["-nosteam", "-config", "-tmlsavedirectory", "-modpath", "-savedirectory"]) expect(by[flag].edit, flag).toBe(false);
	});

	it("uses the argument spellings tModLoader's example file lists", () => {
		const flags = def.args.map((a) => a.flag);
		for (const flag of ["-nosteam", "-config", "-port", "-players", "-ip", "-noupnp", "-secure", "-banlist", "-modpack", "-modpath", "-tmlsavedirectory", "-steamworkshopfolder", "-disableannouncementbox", "-announcementboxrange"]) {
			expect(flags, flag).toContain(flag);
		}
		const by = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		for (const flag of ["-nosteam", "-noupnp", "-secure", "-disableannouncementbox"]) expect(by[flag].kind, flag).toBe("bool");
	});

	it("leaves out what is in the config file or what the panel's Steam-less start cannot use", () => {
		const flags = def.args.map((a) => a.flag.toLowerCase());
		for (const flag of ["-world", "-worldname", "-autocreate", "-seed", "-pass", "-password", "-steam", "-lobby", "-friendsoffriends", "-server", "-forcepriority", "-install", "-publish"]) {
			expect(flags, flag).not.toContain(flag);
		}
	});

	it("finds the launch line the server side writes, and leaves the script byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
	});

	it("reads the port and the player limit off the line", () => {
		const by = Object.fromEntries(launchArgsEntries(parseLaunchArgs(script, def)).map((e) => [e.key, e]));
		expect(by.port.value).toBe("7878");
		expect(by.players.value).toBe("6");
	});

	it("changes the port in place and adds an option at the end, keeping the managed arguments", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.port.id]: "7900", [by.secure.id]: "true", [by.ip.id]: "192.168.1.20" });
		expect(out).toContain("-port 7900");
		expect(out).toContain("-secure");
		expect(out).toContain("-ip 192.168.1.20");
		expect(out).toContain("bash ./start-tModLoaderServer.sh -nosteam -config serverconfig.txt -port 7900");
		expect(out).toContain("-tmlsavedirectory tmldata");
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("offers only the arguments marked editable, as the generic reader reads them", () => {
		const offered = launchArgsEntries(parseLaunchArgs(script, def)).map((e) => e.key).sort();
		expect(offered).toEqual(def.args.filter((a) => a.edit !== false).map((a) => a.key ?? a.flag.replace(/^[-+]+/, "")).sort());
		expect(offered).not.toContain("config");
		expect(offered).not.toContain("nosteam");
	});

	it("tells where the shipped script's limit on spaces matters", () => {
		expect(def.intro).toMatch(/one word/);
		expect(terrariaUi.guide.notes.join(" ")).toMatch(/Values with a space on the launch line break/);
	});
});

import { describe, it, expect } from "vitest";
import game from "../catalog/games/minecraft-vanilla.js";
import server from "../../../src/server/data/games/minecraft-vanilla.js";
import { parseProperties, serializeProperties } from "../configParsers/properties.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["server.properties"];
const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("Minecraft (vanilla) module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("minecraft-vanilla");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Minecraft (vanilla)");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 25585 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Minecraft (vanilla)");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(true);
	});

	it("explains stopping, Java and the memory field in its notes", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/`stop`/);
		expect(notes).toMatch(/Java 21/);
		expect(notes).toMatch(/Max Memory/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Minecraft (vanilla) ${name} catalog`, () => {
		it("is read as one setting and its value per line", () => {
			expect(file.parser).toBe("properties");
			expect(settings.length).toBeGreaterThan(1);
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
				for (const o of meta.options) {
					expect(typeof o.value).toBe("string");
					expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
				}
			}
		});

		it("names only groups in groupOrder that exist, and puts every group in it", () => {
			const groups = new Set(settings.map(([, m]) => m.group));
			for (const g of file.groupOrder) expect(groups.has(g), g).toBe(true);
			for (const g of groups) expect(file.groupOrder.includes(g), `${g} is not in groupOrder`).toBe(true);
		});

		it("does not give two settings in a group the same label", () => {
			const seen = new Set();
			for (const [, meta] of settings) {
				const id = `${meta.group}/${meta.label}`;
				expect(seen.has(id), id).toBe(false);
				seen.add(id);
			}
		});
	});
}

describe("Minecraft (vanilla) settings", () => {
	const s = game.files["server.properties"].settings;

	it("explains the settings the dossier names", () => {
		for (const k of ["motd", "max-players", "difficulty", "gamemode", "level-name", "level-type", "white-list", "online-mode", "view-distance", "simulation-distance", "spawn-protection"]) {
			expect(s[k], k).toBeTruthy();
		}
	});

	it("offers the dossier's allowed values as dropdowns, and nothing else", () => {
		expect(s.difficulty.options.map((o) => o.value)).toEqual(["peaceful", "easy", "normal", "hard"]);
		expect(s.gamemode.options.map((o) => o.value)).toEqual(["survival", "creative", "adventure", "spectator"]);
		expect(s["level-type"].options.map((o) => o.value)).toEqual([
			"minecraft:normal",
			"minecraft:flat",
			"minecraft:large_biomes",
			"minecraft:amplified",
			"minecraft:single_biome_surface",
		]);
		expect(s.difficulty.allowCustom).toBeUndefined();
	});

	it("offers the true/false settings as On and Off, with the words the game reads", () => {
		expect(s["online-mode"].options.map((o) => o.value)).toEqual(["true", "false"]);
		expect(s["white-list"].options.map((o) => o.value)).toEqual(["true", "false"]);
	});

	it("does not offer what the panel manages, what the dossier marks uncertain, or what it cannot explain", () => {
		for (const k of [
			"server-port",
			"query.port",
			"enable-rcon",
			"rcon.password",
			"rcon.port",
			"management-server-enabled",
			"enable-jmx-monitoring",
			"allowed-connection-ids",
			"enable-legacy-status",
			"status-contact-details",
			"max-tick-time",
			"sync-chunk-writes",
			"text-filtering-config",
		]) {
			expect(s[k], k).toBeUndefined();
		}
	});
});

describe("Minecraft (vanilla) server.properties as the panel writes it", () => {
	const file = game.files["server.properties"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends Camp", port: 25585 }).content;

	it("shows the message and the port, both as settings the form knows", () => {
		const entries = parseProperties(text).entries;
		expect(entries.map((e) => [e.key, e.value])).toEqual([
			["motd", "Friends Camp"],
			["server-port", "25585"],
		]);
		expect(file.settings["motd"]).toBeTruthy();
	});

	it("changes the message on its own line only, keeping the order", () => {
		const parsed = parseProperties(text);
		const id = parsed.entries.find((e) => e.key === "motd").id;
		const out = serializeProperties(parsed, { [id]: "New Name" });
		const lines = out.split(/\r?\n/);
		expect(lines[0]).toBe("motd=New Name");
		expect(lines[1]).toBe("server-port=25585");
		expect(lines.length).toBe(text.split(/\r?\n/).length);
	});
});

describe("Minecraft (vanilla): launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group, with flags and form keys nobody else uses", () => {
		expect(def.args.length).toBeGreaterThan(5);
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

	it("offers only server arguments: no JVM options, and no port, pid or settings-only flag", () => {
		for (const bad of ["-Xmx", "-Xms", "-jar", "--port", "--pidFile", "--initSettings", "--help", "--jfrProfile"]) {
			expect(def.args.some((a) => a.flag === bad), bad).toBe(false);
		}
	});

	it("keeps the --nogui argument the panel always writes out of the form", () => {
		const arg = def.args.find((a) => a.flag === "--nogui");
		expect(arg.edit).toBe(false);
		expect(arg.managed).toBe(true);
	});

	it("matches the program the start script runs", () => {
		expect(def.program.test('start /MIN "x" java -Xmx4G -jar server.jar --nogui')).toBe(true);
	});

	const script = server.template.buildStartScript({ name: "Test", maxMemoryGB: 4 });

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		// Nothing optional is on the line: value entries are empty and the flags read as off.
		expect(launchArgsEntries(parsed).every((e) => e.value === "" || e.value === "false")).toBe(true);
	});

	it("adds a server argument at the end of the line, after --nogui", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.world.id]: "my_world", [by.bonusChest.id]: "true" });
		expect(out).toMatch(/ --nogui --world my_world --bonusChest$/m);
		expect(out).toContain('-Xmx4G -jar "%~dp0server.jar" --nogui');
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("every argument the form offers for the line is explained", () => {
		const parsed = parseLaunchArgs(script, def);
		const explained = new Set(def.args.filter((a) => a.edit !== false).map(keyOf));
		for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), entry.key).toBe(true);
	});
});

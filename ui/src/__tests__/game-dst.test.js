import { describe, it, expect } from "vitest";
import game from "../catalog/games/dst.js";
import server from "../../../src/server/data/games/dst.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";
import { parseIni, serializeIni } from "../configParsers/ini.js";

// The rules of catalogs.test.js and launchArgs.test.js, applied to this game's module before it is registered.

const file = game.files["cluster.ini"];
const settings = Object.entries(file.settings);

describe("Don't Starve Together module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("dst");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Don't Starve Together");
		expect(Object.keys(game.files)).toEqual(["cluster.ini"]);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat" });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Don't Starve Together");
		expect(game.guide.files["cluster.ini"]).toBeTruthy();
		expect(game.guide.summary).toMatch(/no Caves/i);
	});
});

describe("Don't Starve Together cluster.ini catalog", () => {
	it("gives every setting a label, an explanation and a group", () => {
		expect(settings.length).toBeGreaterThan(10);
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

	it("names only groups in groupOrder that exist", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), g).toBe(true);
	});

	it("is an INI file, and keys are named by section", () => {
		expect(file.parser).toBe("ini");
		for (const [key] of settings) expect(key, key).toMatch(/^[A-Z]+::[a-z_]+$/);
	});

	it("only uses keys from Klei's settings guide, and none that belong to the shard link or the ports", () => {
		const known = [
			"GAMEPLAY::game_mode", "GAMEPLAY::max_players", "GAMEPLAY::pvp", "GAMEPLAY::pause_when_empty", "GAMEPLAY::vote_enabled",
			"NETWORK::cluster_name", "NETWORK::cluster_description", "NETWORK::cluster_password", "NETWORK::lan_only_cluster", "NETWORK::offline_cluster",
			"NETWORK::tick_rate", "NETWORK::whitelist_slots", "NETWORK::autosaver_enabled", "MISC::console_enabled", "MISC::max_snapshots",
			"STEAM::steam_group_only", "STEAM::steam_group_id", "STEAM::steam_group_admins",
		];
		expect(Object.keys(file.settings).sort()).toEqual(known.sort());
	});

	it("hides the shard section", () => {
		expect(file.excludeSections).toContain("SHARD");
	});

	it("reads the file the panel writes: everything in it is explained or hidden", () => {
		const text = server.template.buildConfigFile({ sessionName: "Camp", name: "x", serverPassword: "pw", clusterToken: "" }).content;
		const parsed = parseIni(text);
		const shown = parsed.entries.filter((e) => !file.excludeSections.includes(e.section)).map((e) => `${e.section}::${e.key}`);
		expect(shown).not.toContain("SHARD::shard_enabled");
		expect(shown).toContain("NETWORK::cluster_name");
		for (const id of shown) expect(file.settings[id], id).toBeTruthy();
	});

	it("writes a changed setting back onto its own line only", () => {
		const text = server.template.buildConfigFile({ sessionName: "Camp", name: "x", serverPassword: "pw" }).content;
		const parsed = parseIni(text);
		const pvp = parsed.entries.find((e) => e.section === "GAMEPLAY" && e.key === "pvp");
		const out = serializeIni(parsed, { [pvp.id]: "true" });
		// The shared line editor writes the file back with plain line feeds.
		expect(out.split(/\r?\n/).length).toBe(text.split(/\r?\n/).length);
		expect(out).toMatch(/^pvp\s*=\s*true$/m);
		expect(out).toMatch(/^cluster_name\s*=\s*Camp$/m);
	});
});

describe("Don't Starve Together launch arguments", () => {
	const def = game.launch;
	const script = server.template.buildStartScript({ name: "Test", port: 8930, queryPort: 8933 });

	it("gives every argument a label, an explanation and a group", () => {
		expect(def.args.length).toBeGreaterThan(10);
		for (const arg of def.args) {
			expect(arg.label, arg.flag).toBeTruthy();
			expect(arg.description.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group, arg.flag).toBeTruthy();
		}
	});

	it("has unique flags, no two editable arguments with the same name, and no repeated dropdown choice", () => {
		const flags = def.args.map((a) => a.flag.toLowerCase());
		expect(new Set(flags).size).toBe(flags.length);
		const keys = def.args.filter((a) => a.edit !== false).map((a) => a.key ?? a.flag.replace(/^[-+]+/, ""));
		expect(new Set(keys).size).toBe(keys.length);
		for (const arg of def.args) if (arg.options) expect(new Set(arg.options.map((o) => (Array.isArray(o) ? o[0] : o))).size).toBe(arg.options.length);
	});

	it("only offers arguments the research found evidence for, and keeps the path arguments out of the form", () => {
		const editable = def.args.filter((a) => a.edit !== false).map((a) => a.flag).sort();
		expect(editable).toEqual(["-backup_log_count", "-bind_ip", "-port", "-skip_update_server_mods", "-steam_authentication_port", "-steam_master_server_port", "-ugc_directory"]);
		for (const flag of ["-persistent_storage_root", "-conf_dir", "-cluster", "-shard", "-console"]) {
			const arg = def.args.find((a) => a.flag === flag);
			expect(arg.edit, flag).toBe(false);
			expect(arg.managed, flag).toBe(true);
		}
		// Left on the line, this one would stop the world from ever starting.
		expect(def.args.find((a) => a.flag === "-only_update_server_mods").edit).toBe(false);
	});

	it("finds the launch line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
	});

	it("reads the ports from the line and edits them in place", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("8930");
		expect(by.steam_master_server_port.value).toBe("8933");
		expect(by.steam_authentication_port.value).toBe("8932");
		const out = serializeLaunchArgs(parsed, { [by.port.id]: "8940", [by.steam_authentication_port.id]: "8942" });
		expect(out).toContain(" -port 8940");
		expect(out).toContain("-steam_authentication_port 8942");
		expect(out).toContain('-persistent_storage_root "%~dp0data"');
		expect(out).toContain("-shard Master");
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("adds an argument at the end and takes it off again", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const added = serializeLaunchArgs(parsed, { [by.skip_update_server_mods.id]: "true", [by.backup_log_count.id]: "10" });
		expect(added).toMatch(/-skip_update_server_mods/);
		expect(added).toMatch(/-backup_log_count 10/);
		const again = parseLaunchArgs(added, def);
		const byAgain = Object.fromEntries(launchArgsEntries(again).map((e) => [e.key, e]));
		expect(serializeLaunchArgs(again, { [byAgain.skip_update_server_mods.id]: "false", [byAgain.backup_log_count.id]: "" })).toBe(script);
	});

	it("matches the program in the script and not the folder change before it", () => {
		expect(def.program.test('start /MIN "x" dontstarve_dedicated_server_nullrenderer_x64.exe -console')).toBe(true);
		expect(def.program.test('cd /d "%~dp0bin64"')).toBe(false);
	});
});

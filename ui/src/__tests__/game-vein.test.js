import { describe, it, expect } from "vitest";
import game from "../catalog/games/vein.js";
import server from "../../../src/server/data/games/vein.js";
import { parseIni, serializeIni } from "../configParsers/ini.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js and launchArgs.test.js, applied to this game's module before it is registered.

const gameIni = game.files["Game.ini"];
const engineIni = game.files["Engine.ini"];
const everyFile = [
	["Game.ini", gameIni],
	["Engine.ini", engineIni],
];

describe("VEIN module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("vein");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("VEIN");
		expect(Object.keys(game.files)).toEqual(["Game.ini", "Engine.ini"]);
		expect(Object.keys(server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat" }).configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("VEIN");
		for (const name of Object.keys(game.files)) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(true);
		expect(game.launch).toBeTruthy();
	});
});

for (const [name, file] of everyFile) {
	describe(`VEIN ${name} catalog`, () => {
		const settings = Object.entries(file.settings);

		it("is an ini file the ini parser reads", () => {
			expect(file.parser).toBe("ini");
			expect(settings.length).toBeGreaterThan(0);
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
				expect(meta.options.length, key).toBeGreaterThan(0);
				const values = meta.options.map((o) => o.value);
				expect(new Set(values).size, `${key} repeats a choice`).toBe(values.length);
				for (const o of meta.options) {
					expect(typeof o.value, key).toBe("string");
					expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
				}
			}
		});

		it("names only groups in groupOrder that exist, and puts every group in it", () => {
			const groups = new Set(settings.map(([, m]) => m.group));
			for (const g of file.groupOrder) expect(groups.has(g), g).toBe(true);
			for (const g of groups) expect(file.groupOrder, g).toContain(g);
		});

		it("does not give two settings of a group the same label", () => {
			const seen = new Set();
			for (const [key, meta] of settings) {
				const id = `${meta.group}/${meta.label}`;
				expect(seen.has(id), `${key} repeats "${meta.label}"`).toBe(false);
				seen.add(id);
			}
		});

		it("tells the person what to do when the file is not there yet", () => {
			expect(file.mayBeMissing?.length).toBeGreaterThan(30);
		});

		it("names every key as Section::Key, with the sections the file's catalog labels", () => {
			for (const [key] of settings) {
				const at = key.lastIndexOf("::");
				expect(at, key).toBeGreaterThan(0);
				expect(file.sectionLabels[key.slice(0, at)], key).toBeTruthy();
			}
		});
	});
}

describe("VEIN Game.ini settings", () => {
	const keys = Object.keys(gameIni.settings);

	it("uses the section and key names of Ramjet's Config page for what the panel writes", () => {
		for (const key of ["/Script/Engine.GameSession::MaxPlayers", "/Script/Vein.VeinGameSession::ServerName", "/Script/Vein.VeinGameSession::Password"]) expect(keys, key).toContain(key);
	});

	it("explains every key of the Game.ini the panel writes, and the admin lists with their + form", () => {
		const text = server.template.buildConfigFile({ name: "x" }).content;
		const found = parseIni(text).entries.map((e) => `${e.section}::${e.key}`);
		expect(found.length).toBe(3);
		for (const key of found) expect(gameIni.settings[key], key).toBeTruthy();
		for (const key of ["AdminSteamIDs", "+AdminSteamIDs", "SuperAdminSteamIDs", "+SuperAdminSteamIDs"]) expect(keys, key).toContain(`/Script/Vein.VeinGameSession::${key}`);
		for (const key of ["WhitelistedPlayers", "+WhitelistedPlayers"]) expect(keys, key).toContain(`/Script/Vein.VeinGameStateBase::${key}`);
	});

	it("leaves out what the sources disagree on or do not explain", () => {
		const bare = keys.map((k) => k.slice(k.lastIndexOf("::") + 2));
		for (const left of ["GameServerQueryPort", "Port", "HTTPPort", "HeartbeatInterval"]) expect(bare, left).not.toContain(left);
	});

	it("gives a dropdown only the choices the sources show", () => {
		const options = (key) => gameIni.settings[key].options.map((o) => o.value);
		expect(options("/Script/Vein.VeinGameSession::bPublic")).toEqual(["True", "False"]);
		expect(options("/Script/Vein.ServerSettings::GS_ShowScoreboardBadges")).toEqual(["1", "0"]);
		expect(options("OnlineSubsystemSteam::bVACEnabled")).toEqual(["0", "1"]);
	});

	it("reads the file the panel writes and changes one line without touching the rest", () => {
		const text = server.template.buildConfigFile({ name: "My Server", maxPlayers: 8, serverPassword: "pw" }).content;
		const parsed = parseIni(text);
		const by = Object.fromEntries(parsed.entries.map((e) => [`${e.section}::${e.key}`, e]));
		expect(by["/Script/Engine.GameSession::MaxPlayers"].value).toBe("8");
		const out = serializeIni(parsed, { [by["/Script/Engine.GameSession::MaxPlayers"].id]: "20" });
		expect(out.replace(/\r/g, "")).toBe(text.replace(/\r/g, "").replace("MaxPlayers=8", "MaxPlayers=20"));
	});

	it("tells the first admin line from the + lines that follow it, so each can be edited on its own", () => {
		const text = ["[/Script/Vein.VeinGameSession]", "AdminSteamIDs=76561198000000001", "+AdminSteamIDs=76561198000000002", "+AdminSteamIDs=76561198000000003", ""].join("\r\n");
		const parsed = parseIni(text);
		const keys2 = parsed.entries.map((e) => e.key);
		expect(keys2).toEqual(["AdminSteamIDs", "+AdminSteamIDs", "+AdminSteamIDs"]);
		for (const e of parsed.entries) expect(gameIni.settings[`${e.section}::${e.key}`], e.key).toBeTruthy();
		const extra = parsed.entries.filter((e) => e.key === "+AdminSteamIDs");
		expect(extra[0].id).not.toBe(extra[1].id);
		const out = serializeIni(parsed, { [extra[1].id]: "76561198000000009" });
		expect(out).toContain("+AdminSteamIDs=76561198000000009");
		expect(out).toContain("+AdminSteamIDs=76561198000000002");
	});
});

describe("VEIN Engine.ini settings", () => {
	const keys = Object.keys(engineIni.settings);
	const bare = keys.map((k) => k.slice(k.indexOf("::") + 2));

	it("explains console variables, all under [ConsoleVariables] and all starting with vein.", () => {
		expect(keys.length).toBeGreaterThan(30);
		for (const key of keys) expect(key.startsWith("ConsoleVariables::vein."), key).toBe(true);
	});

	it("uses the spellings both community lists agree on, not the one example that differs", () => {
		expect(bare).toContain("vein.Time.TimeMultiplier");
		expect(bare).not.toContain("vein.TimeMultiplier");
	});

	it("gives a dropdown only to settings the lists show as 0 or 1 (or 0 to 4 for loot), and uses 1 and 0 rather than True", () => {
		const options = (key) => engineIni.settings[`ConsoleVariables::${key}`].options.map((o) => o.value);
		for (const key of ["vein.PvP", "vein.BuildObjectPvP", "vein.BaseDamage", "vein.AISpawner.Enabled", "vein.AISpawner.HordeMode", "vein.ContainersRespawn.Enabled"]) expect(options(key), key).toEqual(["1", "0"]);
		expect(options("vein.Scarcity.Difficulty")).toEqual(["0", "1", "2", "3", "4"]);
		for (const [key, meta] of Object.entries(engineIni.settings)) if (meta.options) expect(meta.options.some((o) => /true|false/i.test(o.value)), key).toBe(false);
	});

	it("reads a file with the header only, and a line added under it", () => {
		const text = server.template.buildExtraFiles({})[0].content + "vein.PvP=0\r\n";
		const parsed = parseIni(text);
		expect(parsed.entries.length).toBe(1);
		expect(`${parsed.entries[0].section}::${parsed.entries[0].key}`).toBe("ConsoleVariables::vein.PvP");
		expect(engineIni.settings["ConsoleVariables::vein.PvP"]).toBeTruthy();
		expect(serializeIni(parsed, { [parsed.entries[0].id]: "1" })).toContain("vein.PvP=1");
	});
});

describe("VEIN launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group", () => {
		expect(def.args.length).toBeGreaterThan(4);
		for (const arg of def.args) {
			expect(arg.label, arg.flag).toBeTruthy();
			expect(arg.description.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group, arg.flag).toBeTruthy();
		}
	});

	it("has no two editable arguments with the same name, no repeated flag and no repeated dropdown choice", () => {
		const keys = def.args.filter((a) => a.edit !== false).map((a) => a.key ?? a.flag.replace(/^[-+]+/, ""));
		expect(new Set(keys).size).toBe(keys.length);
		const flags = def.args.map((a) => a.flag.toLowerCase());
		expect(new Set(flags).size).toBe(flags.length);
		for (const arg of def.args) if (arg.options) expect(new Set(arg.options.map((o) => (Array.isArray(o) ? o[0] : o))).size).toBe(arg.options.length);
	});

	it("writes the arguments in the equals form and only offers the ones the pages document", () => {
		expect(def.style).toBe("equals");
		expect(def.editable).toBe(true);
		for (const arg of def.args) expect(arg.style, arg.flag).toBeUndefined();
		expect(def.args.map((a) => a.flag).sort()).toEqual(["-MaxPlayers", "-Port", "-QueryPort", "-log", "-multihome", "-onethread"].sort());
	});

	it("never lets the form drop -log", () => {
		expect(def.args.find((a) => a.flag === "-log").edit).toBe(false);
	});

	const script = server.template.buildStartScript({ name: "Test", port: 8960, queryPort: 8962 });

	it("finds the launch line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
	});

	it("does not take the folder line or the window title for the launch line", () => {
		expect(def.program.test('cd /d "%~dp0Vein\\Binaries\\Win64"')).toBe(false);
		expect(def.program.test('start /MIN "x" VeinServer-Win64-Test.exe -log')).toBe(true);
		expect(def.program.test('start /MIN "x" VeinServer.exe -log')).toBe(true);
	});

	it("reads the ports off the line and changes one in place", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.Port.value).toBe("8960");
		expect(by.QueryPort.value).toBe("8962");
		const out = serializeLaunchArgs(parsed, { [by.Port.id]: "8970" });
		expect(out).toContain("-Port=8970 -QueryPort=8962");
		expect(out).toContain("VeinServer-Win64-Test.exe -log");
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("adds the optional switches, and keeps -log", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.onethread.id]: "true", [by.multihome.id]: "192.168.1.20" });
		expect(out).toContain("-onethread");
		expect(out).toContain("-multihome=192.168.1.20");
		expect(out).toContain("-log");
	});

	it("is never a game whose launch line must end with a particular argument", () => {
		expect(def.args.some((a) => /last/i.test(a.description))).toBe(false);
	});
});

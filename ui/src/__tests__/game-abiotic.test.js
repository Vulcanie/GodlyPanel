import { describe, it, expect } from "vitest";
import game from "../catalog/games/abiotic.js";
import server, { SANDBOX_DEFAULTS } from "../../../src/server/data/games/abiotic.js";
import { parseIni, serializeIni } from "../configParsers/ini.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The rules of catalogs.test.js and launchArgs.test.js, applied to this game's module before it is registered.

const sandbox = game.files["SandboxSettings.ini"];
const admin = game.files["Admin.ini"];
const everyFile = [
	["SandboxSettings.ini", sandbox],
	["Admin.ini", admin],
];

describe("Abiotic Factor module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("abiotic");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Abiotic Factor");
		expect(Object.keys(game.files)).toEqual(["SandboxSettings.ini", "Admin.ini"]);
		expect(Object.keys(server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat" }).configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Abiotic Factor");
		for (const name of Object.keys(game.files)) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(true);
		expect(game.launch).toBeTruthy();
	});
});

for (const [name, file] of everyFile) {
	describe(`Abiotic Factor ${name} catalog`, () => {
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
	});
}

describe("Abiotic Factor SandboxSettings.ini settings", () => {
	const keys = Object.keys(sandbox.settings);

	it("explains exactly the 48 keys the server writes into the file, in the [SandboxSettings] section", () => {
		expect(keys.length).toBe(48);
		expect(keys.slice().sort()).toEqual(SANDBOX_DEFAULTS.map(([k]) => `SandboxSettings::${k}`).sort());
	});

	it("gives a dropdown only the choices the developer's wiki lists", () => {
		const options = (key) => sandbox.settings[`SandboxSettings::${key}`].options.map((o) => o.value);
		expect(options("GameDifficulty")).toEqual(["1", "2", "3"]);
		expect(options("DayNightCycleState")).toEqual(["0", "1", "2"]);
		expect(options("WeatherFrequency")).toEqual(["1", "2", "3", "4", "5"]);
		expect(options("EnemyAccuracy")).toEqual(["0", "1", "2", "3", "4"]);
		expect(options("DeathPenalties")).toEqual(["0", "1", "2", "3", "4", "5"]);
		expect(options("FirstTimeStartingWeapon")).toEqual(["0", "1", "2", "3", "4", "5", "6"]);
	});

	it("keeps every dropdown's default among its choices", () => {
		for (const [key, def] of SANDBOX_DEFAULTS) {
			const meta = sandbox.settings[`SandboxSettings::${key}`];
			if (meta.options) expect(meta.options.map((o) => o.value), key).toContain(def);
		}
	});

	it("leaves out a dropdown for the one setting whose choices the wiki does not explain", () => {
		expect(sandbox.settings["SandboxSettings::BridgeSupports"].options).toBeUndefined();
	});

	it("reads the file the panel writes and changes one line without touching the rest", () => {
		const text = server.template.buildConfigFile({}).content;
		const parsed = parseIni(text);
		expect(parsed.entries.length).toBe(48);
		expect(parsed.entries.every((e) => e.section === "SandboxSettings")).toBe(true);
		const by = Object.fromEntries(parsed.entries.map((e) => [e.key, e]));
		expect(by.GameDifficulty.value).toBe("1");
		const out = serializeIni(parsed, { [by.GameDifficulty.id]: "3", [by.HardcoreMode.id]: "True" });
		expect(out.split("\n").length).toBe(text.split("\r\n").length);
		expect(out.replace(/\r/g, "")).toBe(text.replace(/\r/g, "").replace("GameDifficulty=1", "GameDifficulty=3").replace("HardcoreMode=False", "HardcoreMode=True"));
	});
});

describe("Abiotic Factor Admin.ini settings", () => {
	// What the game writes on the first start.
	const text = ["[Moderators]", "Moderator=ExampleID1", "Moderator=ExampleID2", "", "[BannedPlayers]", "BannedPlayer=ExampleBanID1", "BannedPlayer=ExampleBanID2", ""].join("\r\n");

	it("explains the two keys the game's file has", () => {
		expect(Object.keys(admin.settings).sort()).toEqual(["BannedPlayers::BannedPlayer", "Moderators::Moderator"]);
		const found = parseIni(text).entries.map((e) => `${e.section}::${e.key}`);
		for (const key of found) expect(admin.settings[key], key).toBeTruthy();
	});

	it("tells the two example lines apart so each can be replaced by a Steam ID", () => {
		const parsed = parseIni(text);
		const mods = parsed.entries.filter((e) => e.key === "Moderator");
		expect(mods.length).toBe(2);
		expect(mods[0].id).not.toBe(mods[1].id);
		const out = serializeIni(parsed, { [mods[0].id]: "76561198053306820" });
		expect(out).toContain("Moderator=76561198053306820");
		expect(out).toContain("Moderator=ExampleID2");
	});
});

describe("Abiotic Factor launch arguments", () => {
	const def = game.launch;

	it("gives every argument a label, an explanation and a group", () => {
		expect(def.args.length).toBeGreaterThan(10);
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

	it("writes the game's arguments in the equals form, as the developer's wiki does", () => {
		expect(def.style).toBe("equals");
		expect(def.editable).toBe(true);
		for (const arg of def.args) expect(arg.style, arg.flag).toBeUndefined();
	});

	it("only offers arguments the developer documents", () => {
		expect(def.args.map((a) => a.flag).sort()).toEqual(
			["-AdminIniPath", "-AdminPassword", "-LANOnly", "-MaxServerPlayers", "-MultiHome", "-NOSTEAM", "-NoAsyncLoadingThread", "-PORT", "-PlatformLimited", "-QueryPort", "-SandboxIniPath", "-ServerPassword", "-SteamServerName", "-UseLocalIPs", "-WorldSaveName", "-log", "-newconsole", "-useperfthreads"].sort(),
		);
	});

	it("never offers -NOSTEAM, or the arguments the panel needs unchanged, in the form", () => {
		const byFlag = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		expect(byFlag["-NOSTEAM"].edit).toBe(false);
		expect(byFlag["-log"].edit).toBe(false);
		expect(byFlag["-SandboxIniPath"].edit).toBe(false);
		expect(byFlag["-PlatformLimited"].options.map((o) => o[0])).toEqual(["PC", "Playstation", "Xbox"]);
	});

	const script = server.template.buildStartScript({ name: "Test", sessionName: "My Lab", serverPassword: "join-me", adminPassword: "boss", port: 8950, queryPort: 8952 });

	it("finds the launch line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
	});

	it("does not take the folder line or the window title for the launch line", () => {
		expect(def.program.test('cd /d "%~dp0AbioticFactor\\Binaries\\Win64"')).toBe(false);
		expect(def.program.test("start /MIN \"x\" AbioticFactorServer-Win64-Shipping.exe -log")).toBe(true);
		expect(def.program.test("start /MIN \"x\" AbioticFactorServer.exe -log")).toBe(true);
	});

	it("reads the values off the line, quoted or not", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.PORT.value).toBe("8950");
		expect(by.QueryPort.value).toBe("8952");
		expect(by.SteamServerName.value).toBe("My Lab");
		expect(by.ServerPassword.value).toBe("join-me");
		expect(by.AdminPassword.value).toBe("boss");
		expect(by.MaxServerPlayers.value).toBe("6");
		expect(by.WorldSaveName.value).toBe("Cascade");
		expect(by.useperfthreads.value).toBe("true");
		expect(by.NoAsyncLoadingThread.value).toBe("false");
		expect(by.PlatformLimited.value).toBe("");
	});

	it("changes a value in place, keeps the quotes round a name with spaces and leaves the rest of the line alone", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.SteamServerName.id]: "Two Words Here", [by.MaxServerPlayers.id]: "8" });
		expect(out).toContain('-SteamServerName="Two Words Here"');
		expect(out).toContain("-MaxServerPlayers=8");
		expect(out).toContain("AbioticFactorServer-Win64-Shipping.exe -log -useperfthreads");
		expect(out).toContain("-SandboxIniPath=Config/WindowsServer/SandboxSettings.ini");
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("adds the optional switches and a choice, and takes a password off the line when it is cleared", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.PlatformLimited.id]: "PC", [by.LANOnly.id]: "true", [by.ServerPassword.id]: "" });
		expect(out).toContain("-PlatformLimited=PC");
		expect(out).toContain("-LANOnly");
		expect(out).not.toContain("-ServerPassword");
		expect(out).toContain("-AdminPassword=");
		expect(out).toContain("-log");
	});

	it("is never a game whose launch line must end with a particular argument", () => {
		// Unlike Unturned's +InternetServer, no Abiotic Factor argument has to come last, so new ones may be added at the end.
		expect(def.args.some((a) => /last/i.test(a.description))).toBe(false);
	});
});

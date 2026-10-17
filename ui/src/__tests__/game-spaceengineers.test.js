import { describe, it, expect } from "vitest";
import seUi from "../catalog/games/spaceengineers.js";
import seServer from "../../../src/server/data/games/spaceengineers.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// Space Engineers' catalog, held to the rules of catalogs.test.js (every argument explained, no repeated choice) and checked against
// the start script the server side writes. It has no settings file: the game's XML config is not a shape the panel can read.
// The panel writes that config itself when the server is created (checked on the server side).

const def = seUi.launch;
const params = { name: "Test", sessionName: "Test", port: 27116, maxPlayers: 8, instanceSlug: "test", installDir: "C:\\S\\space", startScriptFilename: "Start_SpaceEngineers.bat" };
const script = seServer.template.buildStartScript(params);

describe("Space Engineers module", () => {
	it("is registered under the type the server side records", () => {
		expect(seUi.type).toBe("spaceengineers");
		expect(seUi.type).toBe(seServer.template.type);
		expect(seUi.title).toBe("Space Engineers");
		expect(seUi.guide.name).toBe("Space Engineers");
		expect(seUi.guide.notes.length).toBeGreaterThan(0);
	});

	it("offers no settings file, and the server records none", () => {
		expect(seUi.files).toEqual({});
		const entry = seServer.template.buildServerEntry(params);
		expect(Object.keys(entry.configPaths ?? {})).toEqual(Object.keys(seUi.files));
		expect(entry.configPath).toBeUndefined();
	});

	it("says what the panel writes, where the settings live, that Stop does not save, and that Torch is not supported", () => {
		const notes = seUi.guide.notes.join(" ");
		expect(notes).toMatch(/SpaceEngineers-Dedicated.cfg/);
		expect(notes).toMatch(/first time the server starts/);
		expect(notes).toMatch(/Sandbox_config.sbc/);
		expect(notes).toMatch(/Stop does not save/);
		expect(notes).toMatch(/Torch/);
		expect(notes).not.toMatch(/does not write the config file or a world/);
	});

	it("mentions no Steam port: the game does not use it", () => {
		expect(seUi.guide.notes.join(" ")).not.toMatch(/8766|Steam port/);
	});
});

describe("Space Engineers launch arguments", () => {
	it("gives every argument a label, an explanation and a group", () => {
		expect(def.args.length).toBe(11);
		for (const arg of def.args) {
			expect(arg.label?.trim(), arg.flag).toBeTruthy();
			expect(arg.description?.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group?.trim(), arg.flag).toBeTruthy();
		}
	});

	it("lists each flag once, ignoring case", () => {
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

	it("spells the flags the way the game matches them", () => {
		const flags = def.args.map((a) => a.flag);
		for (const flag of ["-console", "-noconsole", "-path", "-ignorelastsession", "-maxPlayers", "-ip", "-port", "-session:", "-plugin", "-eos", "-np"]) expect(flags).toContain(flag);
	});

	it("leaves out the arguments the wiki lists without saying what they do, and the crash-report helper", () => {
		const flags = def.args.map((a) => a.flag.toLowerCase());
		for (const flag of ["-selectinstance", "-checkalive", "-start", "-report", "-game", "-checkpointid", "-startservice"]) expect(flags).not.toContain(flag);
	});

	it("marks the arguments the panel writes, and keeps the risky ones out of the form", () => {
		const by = Object.fromEntries(def.args.map((a) => [a.flag, a]));
		for (const flag of ["-console", "-path", "-port"]) expect(by[flag].managed, flag).toBe(true);
		for (const flag of ["-console", "-path", "-noconsole", "-session:", "-plugin", "-eos", "-np"]) expect(by[flag].edit, flag).toBe(false);
		for (const flag of ["-port", "-maxPlayers", "-ip", "-ignorelastsession"]) expect(by[flag].edit, flag).not.toBe(false);
		expect(by["-session:"].kind).toBe("attached");
	});

	it("finds the launch line the server side writes, and leaves the script byte-for-byte alone when nothing changes", () => {
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
	});

	it("reads the port off the line, and shows the player limit as empty (it is in the config file)", () => {
		const by = Object.fromEntries(launchArgsEntries(parseLaunchArgs(script, def)).map((e) => [e.key, e]));
		expect(by.port.value).toBe("27116");
		expect(by.maxPlayers.value).toBe("");
		expect(by.ip.value).toBe("");
		expect(by.ignorelastsession.value).toBe("false");
	});

	it("changes a port in place, adds an address, and keeps -console and the data folder as they were", () => {
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.port.id]: "27200", [by.maxPlayers.id]: "12", [by.ip.id]: "192.168.1.20" });
		expect(out).toContain("-port 27200");
		expect(out).toContain("-maxPlayers 12");
		expect(out).toContain("-ip 192.168.1.20");
		expect(out).toContain("-console");
		expect(out).toContain('-path "%~dp0Data"');
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("offers only the arguments marked editable, as the generic reader reads them", () => {
		const offered = launchArgsEntries(parseLaunchArgs(script, def)).map((e) => e.key).sort();
		expect(offered).toEqual(["ignorelastsession", "ip", "maxPlayers", "port"]);
	});

	it("reads a player limit a person added to the line", () => {
		const withLimit = script.replace("-port 27116", "-port 27116 -maxPlayers 6");
		const by = Object.fromEntries(launchArgsEntries(parseLaunchArgs(withLimit, def)).map((e) => [e.key, e]));
		expect(by.port.value).toBe("27116");
		expect(by.maxPlayers.value).toBe("6");
	});
});

import { describe, it, expect } from "vitest";
import { GAME_TEMPLATES } from "../../../src/server/data/gameTemplates.js";
import { LAUNCH_ARGS, LAUNCH_EDITABLE_GAMES, launchDefFor } from "../catalog/launchArgs.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// The start scripts the panel writes for each game are the real thing these parsers read, so the tests read those.

const params = (extra = {}) => ({
	name: "Test",
	sessionName: "My Server",
	serverPassword: "secret1",
	rconPassword: "rconpass1",
	port: 7777,
	queryPort: 7779,
	rconPort: 26000,
	telnetPort: 26001,
	maxPlayers: 12,
	instanceSlug: "main",
	maxMemoryGB: 6,
	...extra,
});

const scriptFor = (id) => GAME_TEMPLATES.find((t) => t.id === id).buildStartScript(params());

describe("launch argument definitions", () => {
	it("every argument has a label, an explanation and a group", () => {
		for (const [game, def] of Object.entries(LAUNCH_ARGS)) {
			expect(def.args.length, game).toBeGreaterThan(0);
			for (const arg of def.args) {
				expect(arg.label, `${game} ${arg.flag}`).toBeTruthy();
				expect(arg.description.length, `${game} ${arg.flag}`).toBeGreaterThan(15);
				expect(arg.group, `${game} ${arg.flag}`).toBeTruthy();
			}
		}
	});

	it("no two editable arguments of a game share a name", () => {
		for (const [game, def] of Object.entries(LAUNCH_ARGS)) {
			const keys = def.args.filter((a) => a.edit !== false).map((a) => a.key ?? a.flag.replace(/^[-+]+/, ""));
			expect(new Set(keys).size, game).toBe(keys.length);
		}
	});

	it("a Palworld server (type Palword) finds its definition", () => {
		expect(launchDefFor("Palword")?.title).toBe("Palworld");
	});
});

describe("launch lines the panel writes", () => {
	// Valheim has its own reader (valheimLaunch.js); the rest go through the generic one.
	const generic = LAUNCH_EDITABLE_GAMES.filter((g) => g !== "valheim");

	for (const game of generic) {
		it(`${game}: finds the line and leaves it byte-for-byte alone when nothing changes`, () => {
			const script = scriptFor(game);
			const def = LAUNCH_ARGS[game];
			const parsed = parseLaunchArgs(script, def);
			expect(parsed.at, `no launch line found in:\n${script}`).toBeGreaterThanOrEqual(0);
			expect(serializeLaunchArgs(parsed, {})).toBe(script);
			// Every argument the panel puts on the line that the form manages is read as a value.
			expect(launchArgsEntries(parsed).some((e) => e.value !== "" && e.value !== "false"), game).toBe(true);
		});
	}

	it("Rust: reads +convars and edits one in place", () => {
		const script = scriptFor("rust");
		const parsed = parseLaunchArgs(script, LAUNCH_ARGS.rust);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by["server.hostname"].value).toBe("My Server");
		expect(by["server.maxplayers"].value).toBe("12");
		expect(by["app.port"].value).toBe("-1");
		const out = serializeLaunchArgs(parsed, { [by["server.maxplayers"].id]: "40", [by["server.pve"].id]: "true" });
		expect(out).toContain("+server.maxplayers 40");
		expect(out).toContain("+server.pve true");
		expect(out).toContain('+server.hostname "My Server"');
		expect(out.replace("+server.maxplayers 40", "+server.maxplayers 12").replace(" +server.pve true", "")).toBe(script);
	});

	it("Rust: clearing a setting takes it off the line", () => {
		const parsed = parseLaunchArgs(scriptFor("rust"), LAUNCH_ARGS.rust);
		const seed = launchArgsEntries(parsed).find((e) => e.key === "server.seed");
		expect(serializeLaunchArgs(parsed, { [seed.id]: "" })).not.toContain("+server.seed");
	});

	it("7 Days to Die: reads -Name=value, a whole-quoted argument and a space-separated one", () => {
		const parsed = parseLaunchArgs(scriptFor("7days"), LAUNCH_ARGS["7days"]);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.configfile.value).toBe("serverconfig.xml");
		expect(by.UserDataFolder.value).toBe("%~dp0userdata");
		expect(by.logfile.value).toBe("output_log.txt");
		const out = serializeLaunchArgs(parsed, { [by.UserDataFolder.id]: "D:\\Saves\\7d one" });
		expect(out).toContain('"-UserDataFolder=D:\\Saves\\7d one"');
		expect(out).toContain("-dedicated");
	});

	it("Project Zomboid: edits the Java memory and keeps the long Java line intact", () => {
		const script = scriptFor("zomboid");
		const parsed = parseLaunchArgs(script, LAUNCH_ARGS.zomboid);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.Xmx.value).toBe("6g");
		expect(by.servername.value).toBe("main");
		expect(by.cachedir.value).toBe("%~dp0zomboid");
		const out = serializeLaunchArgs(parsed, { [by.Xmx.id]: "10g", [by.Xms.id]: "10g" });
		expect(out).toContain("-Xmx10g");
		expect(out).toContain("-Xms10g");
		expect(out).toContain("-XX:+UseZGC");
		expect(out).toContain("zombie.network.GameServer");
		// The class path line above it is not mistaken for the launch line.
		expect(out).toContain("SET PZ_CLASSPATH=java/;java/projectzomboid.jar");
	});

	it("keeps CRLF line endings and every other line", () => {
		const script = scriptFor("rust");
		expect(script).toContain("\r\n");
		const parsed = parseLaunchArgs(script, LAUNCH_ARGS.rust);
		const seed = launchArgsEntries(parsed).find((e) => e.key === "server.seed");
		const out = serializeLaunchArgs(parsed, { [seed.id]: "99" });
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
		expect(out).not.toMatch(/[^\r]\n/);
	});

	it("puts a new argument before a redirection at the end of the line", () => {
		const script = '@echo off\r\nstart /MIN "x" CoreKeeperServer.exe -batchmode -port 27015 > out.log\r\n';
		const parsed = parseLaunchArgs(script, LAUNCH_ARGS.corekeeper);
		const maxp = launchArgsEntries(parsed).find((e) => e.key === "maxplayers");
		expect(serializeLaunchArgs(parsed, { [maxp.id]: "6" })).toContain("-port 27015 -maxplayers 6 > out.log");
	});

	it("a script with no launch line is returned unchanged", () => {
		const script = "@echo off\r\necho hello\r\n";
		const parsed = parseLaunchArgs(script, LAUNCH_ARGS.rust);
		expect(launchArgsEntries(parsed)).toEqual([]);
		expect(serializeLaunchArgs(parsed, { x: "y" })).toBe(script);
	});
});


describe("a program name in quotes on the launch line", () => {
	// Hand-made scripts often write start "Title" "Program.exe" -args. The quote after the program belongs to it, not to the first argument.
	const def = launchDefFor("corekeeper");
	const script = '@echo off\r\nstart /MIN "Core" "CoreKeeperServer.exe" -batchmode -port 27015 -worldname "My World" -maxplayers 8\r\n';

	it("is written back unchanged when nothing is edited", () => {
		expect(serializeLaunchArgs(parseLaunchArgs(script, def), {})).toBe(script);
	});

	it("keeps its closing quote when an argument is changed", () => {
		const parsed = parseLaunchArgs(script, def);
		const port = launchArgsEntries(parsed).find((e) => e.key === "port");
		const out = serializeLaunchArgs(parsed, { [port.id]: "28000" });
		expect(out).toBe(script.replace("-port 27015", "-port 28000"));
	});

	it("keeps it when an argument is added", () => {
		const parsed = parseLaunchArgs(script, def);
		const seed = launchArgsEntries(parsed).find((e) => e.key === "worldseed");
		const out = serializeLaunchArgs(parsed, { [seed.id]: "42" });
		expect(out).toContain('"CoreKeeperServer.exe" -batchmode');
		expect(out).toContain("-worldseed 42");
	});
});

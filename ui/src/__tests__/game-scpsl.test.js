import { describe, it, expect } from "vitest";
import game from "../catalog/games/scpsl.js";
import server from "../../../src/server/data/games/scpsl.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const keyOf = (a) => a.key ?? a.flag.replace(/^[-+]+/, "");

describe("SCP: Secret Laboratory module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("scpsl");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("SCP: Secret Laboratory");
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("SCP: Secret Laboratory");
	});

	it("offers no settings file, because its format has no parser", () => {
		expect(Object.keys(game.files)).toEqual([]);
	});

	it("explains where its settings files are and that the panel does not edit them", () => {
		const text = [game.guide.summary, ...game.guide.notes].join("\n");
		expect(text).toMatch(/%APPDATA%/);
		expect(text).toMatch(/config_gameplay\.txt/);
		expect(text).toMatch(/does not write/);
		for (const name of ["config_gameplay.txt", "config_remoteadmin.txt"]) expect(game.guide.files[name], name).toBeTruthy();
	});

	it("says the panel stops the server without a clean save", () => {
		expect(game.guide.notes.join("\n")).toMatch(/closing its window/);
	});
});

describe("SCP: Secret Laboratory launch arguments", () => {
	const args = game.launch.args;

	it("has a label, an explanation and a group for every argument", () => {
		for (const a of args) {
			expect(a.label?.trim(), `${a.flag} label`).toBeTruthy();
			expect(a.description?.trim().length ?? 0, `${a.flag} description`).toBeGreaterThan(10);
			expect(a.group?.trim(), `${a.flag} group`).toBeTruthy();
		}
	});

	it("names each argument once", () => {
		const keys = args.map(keyOf);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("uses the flags the start script writes, so the form shows them as set", () => {
		const script = server.template.buildStartScript({ name: "x", port: 25977, installDir: "C:\\x", startScriptFilename: "s.bat" });
		for (const a of args.filter((x) => x.managed)) expect(script, a.flag).toContain(a.flag);
	});

	it("matches the program on the start line", () => {
		const script = server.template.buildStartScript({ name: "x", port: 25977, installDir: "C:\\x", startScriptFilename: "s.bat" });
		expect(game.launch.program.test(script)).toBe(true);
	});

	it("gives the restart and log limits their documented defaults in the explanations", () => {
		const text = (flag) => args.find((a) => a.flag === flag).description;
		expect(text("--restartsLimit")).toMatch(/default is 4/);
		expect(text("--restartsTimeWindow")).toMatch(/default is 480/);
		expect(text("--logLengthLimit")).toMatch(/default is 25G/);
		expect(text("--logEntriesLimit")).toMatch(/default is 10G/);
	});
});

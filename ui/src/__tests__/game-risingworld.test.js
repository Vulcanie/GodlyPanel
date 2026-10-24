import { describe, it, expect } from "vitest";
import game from "../catalog/games/risingworld.js";
import server from "../../../src/server/data/games/risingworld.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["server.properties"];

describe("Rising World module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("risingworld");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Rising World");
		expect(Object.keys(game.files)).toEqual(FILES);
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("Rising World");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
	});

	it("explains the query port, the stop and the first-start rewrite", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/4254/);
		expect(notes).toMatch(/shutdown/);
		expect(notes).toMatch(/first start/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Rising World ${name} catalog`, () => {
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

describe("Rising World launch arguments", () => {
	const args = game.launch.args;

	it("gives every argument a label, an explanation and a group", () => {
		for (const a of args) {
			expect(a.label?.trim(), `${a.flag} label`).toBeTruthy();
			expect(a.description?.trim().length ?? 0, `${a.flag} description`).toBeGreaterThan(10);
			expect(a.group?.trim(), `${a.flag} group`).toBeTruthy();
		}
	});

	it("is not edited in the form, and lists only the two flags the panel writes", () => {
		expect(game.launch.editable).toBe(false);
		expect(args.map((a) => a.flag)).toEqual(["-batchmode", "-nographics"]);
		for (const a of args) expect(a.managed).toBe(true);
	});

	it("matches the start script the panel writes", () => {
		const script = server.template.buildStartScript({ name: "x", port: 4255, installDir: "C:\\rw", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		for (const a of args) expect(launch).toContain(a.flag);
	});
});

describe("Rising World server.properties as the panel writes it", () => {
	const file = game.files["server.properties"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends", port: 4255 }).content;

	it("has its two settings in the form under the capitalised names the game reads", () => {
		expect(file.settings.Server_Name).toBeTruthy();
		expect(file.settings.Server_Port).toBeTruthy();
		expect(text).toContain("Server_Name=Friends");
		expect(text).toContain("Server_Port=4255");
		for (const key of Object.keys(file.settings)) expect(key, key).toMatch(/^[A-Z]/);
	});
});

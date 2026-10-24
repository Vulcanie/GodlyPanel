import { describe, it, expect } from "vitest";
import game from "../catalog/games/chivalry.js";
import server from "../../../src/server/data/games/chivalry.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["PCServer-UDKGame.ini"];

describe("Chivalry module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("chivalry");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Chivalry: Medieval Warfare");
		expect(Object.keys(game.files)).toEqual(FILES);
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeTruthy();
		expect(game.guide.name).toBe("Chivalry: Medieval Warfare");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
	});

	it("explains the query port, the admin password, the stop and the unverified parts", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/7010/);
		expect(notes).toMatch(/admin/i);
		expect(notes).toMatch(/graceful|close/i);
		expect(notes).toMatch(/not (been )?(checked|verified|tested)|unverified|real install/i);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Chivalry ${name} catalog`, () => {
		it("is read as sections with one key and value per line", () => {
			expect(file.parser).toBe("ini");
			expect(settings.length).toBeGreaterThan(1);
			for (const [key] of settings) expect(key, key).toMatch(/^[A-Za-z.]+::[A-Za-z]+$/);
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

		it("offers true/false dropdowns with no repeated choice", () => {
			for (const [key, meta] of settings) {
				if (!meta.options) continue;
				const values = meta.options.map((o) => o.value);
				expect(new Set(values).size, key).toBe(values.length);
			}
		});
	});
}

describe("Chivalry launch arguments", () => {
	const args = game.launch.args;

	it("gives every argument a label, an explanation and a group", () => {
		for (const a of args) {
			expect(a.label?.trim(), `${a.flag} label`).toBeTruthy();
			expect(a.description?.trim().length ?? 0, `${a.flag} description`).toBeGreaterThan(10);
			expect(a.group?.trim(), `${a.flag} group`).toBeTruthy();
		}
	});

	it("is not edited in the form, and lists only the two flags the panel writes, once each", () => {
		expect(game.launch.editable).toBe(false);
		expect(args.map((a) => a.flag)).toEqual(["-dedicated=true", "-seekfreeloadingserver"]);
		expect(new Set(args.map((a) => a.flag)).size).toBe(args.length);
		for (const a of args) expect(a.managed).toBe(true);
	});

	it("matches the start script the panel writes", () => {
		const script = server.template.buildStartScript({ name: "x", mapCode: "AOCFFA-Arena3_p", port: 7000, queryPort: 7010, installDir: "C:\\cmw", startScriptFilename: "s.bat" });
		const launch = script.split("\r\n").find((l) => l.startsWith("start "));
		expect(game.launch.program.test(launch)).toBe(true);
		for (const a of args) expect(launch).toContain(a.flag);
	});
});

describe("Chivalry PCServer-UDKGame.ini as the panel writes it", () => {
	const file = game.files["PCServer-UDKGame.ini"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends", adminPassword: "pw", port: 7000 }).content;

	it("has the name and the admin password in the form, under the sections the file uses", () => {
		expect(file.settings["Engine.GameReplicationInfo::ServerName"]).toBeTruthy();
		expect(file.settings["Engine.AccessControl::AdminPassword"]).toBeTruthy();
		expect(text).toContain("[Engine.GameReplicationInfo]");
		expect(text).toContain("ServerName=Friends");
		expect(text).toContain("[Engine.AccessControl]");
		expect(text).toContain("AdminPassword=pw");
	});
});

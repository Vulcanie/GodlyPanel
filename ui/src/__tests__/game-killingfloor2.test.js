import { describe, it, expect } from "vitest";
import game from "../catalog/games/killingfloor2.js";
import server from "../../../src/server/data/games/killingfloor2.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered.

const FILES = ["PCServer-KFGame.ini"];

describe("Killing Floor 2 module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("killingfloor2");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Killing Floor 2");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 7811, queryPort: 7813 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Killing Floor 2");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(false);
		expect(game.launch).toBeNull();
	});

	it("explains the first-start rule, the unconfirmed executable and the stop limit", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/first run|first start/);
		expect(notes).toMatch(/KFServer\.exe/);
		expect(notes).toMatch(/Stop/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Killing Floor 2 ${name} catalog`, () => {
		it("is read as Section::Key settings", () => {
			expect(file.parser).toBe("ini");
			expect(settings.length).toBeGreaterThan(5);
			for (const [key] of settings) expect(key).toMatch(/^[A-Za-z.]+::[A-Za-z]+$/);
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

describe("Killing Floor 2 settings", () => {
	const s = game.files["PCServer-KFGame.ini"].settings;

	it("covers the name, the passwords, the difficulty and the player limit the research names", () => {
		for (const k of [
			"Engine.GameReplicationInfo::ServerName",
			"Engine.AccessControl::GamePassword",
			"Engine.AccessControl::AdminPassword",
			"KFGame.KFGameInfo::GameDifficulty",
			"KFGame.KFGameInfo::MaxPlayers",
		]) {
			expect(s[k], k).toBeTruthy();
		}
	});

	it("offers the difficulty and wave count as the dossier's numbered choices", () => {
		expect(s["KFGame.KFGameInfo::GameDifficulty"].options.map((o) => o.value)).toEqual(["0", "1", "2", "3"]);
		expect(s["KFGame.KFGameInfo::GameLength"].options.map((o) => o.value)).toEqual(["0", "1", "2"]);
	});

	it("offers the true/false settings as Yes and No only", () => {
		for (const k of ["KFGame.KFGameInfo::bDisableKickVote", "KFGame.KFGameInfo::bDisableMapVote", "KFGame.KFGameInfo::bDisablePublish"]) {
			expect(s[k].options.map((o) => o.value), k).toEqual(["false", "true"]);
		}
	});

	it("does not offer the Linux file's or the WebAdmin's settings, nor the map cycle", () => {
		for (const k of ["KFGame.KFGameInfo::GameMapCycles", "IpDrv.WebServer::bEnabled", "IpDrv.WebServer::ListenPort"]) {
			expect(s[k], k).toBeUndefined();
		}
	});
});

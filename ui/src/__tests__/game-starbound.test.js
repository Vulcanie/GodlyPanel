import { describe, it, expect } from "vitest";
import game from "../catalog/games/starbound.js";
import server from "../../../src/server/data/games/starbound.js";
import { parseJsonConfig, flattenJsonEntries, serializeJsonConfig } from "../configParsers/json.js";

// The rules of catalogs.test.js, applied to this game's module before it is registered, and the file the server side writes.

const FILES = ["starbound_server.config"];

describe("Starbound module", () => {
	it("has the shape a game module needs, and the type its template uses", () => {
		expect(game.type).toBe("starbound");
		expect(game.type).toBe(server.template.type);
		expect(game.title).toBe("Starbound");
		expect(Object.keys(game.files)).toEqual(FILES);
		const entry = server.template.buildServerEntry({ installDir: "C:\\x", startScriptFilename: "s.bat", name: "a", port: 21025 });
		expect(Object.keys(entry.configPaths)).toEqual(Object.keys(game.files));
		expect(game.guide.name).toBe("Starbound");
		for (const name of FILES) expect(game.guide.files[name], name).toBeTruthy();
		expect(server.launchOptions).toBe(false);
	});

	it("has no launch form, because the program takes no documented argument", () => {
		expect(game.launch).toBeNull();
	});

	it("explains what is not in the form and why", () => {
		const notes = game.guide.notes.join("\n");
		expect(notes).toMatch(/Stop the server before you edit/);
		expect(notes).toMatch(/serverUsers/);
		expect(notes).toMatch(/contents\.pak/);
		expect(notes).toMatch(/Clearing the saved players/);
	});
});

for (const name of FILES) {
	const file = game.files[name];
	const settings = Object.entries(file.settings);

	describe(`Starbound ${name} catalog`, () => {
		it("is read as JSON", () => {
			expect(file.parser).toBe("json");
			expect(settings.length).toBeGreaterThan(5);
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

describe("Starbound settings", () => {
	const s = game.files["starbound_server.config"].settings;

	it("explains the keys the dossier names", () => {
		for (const k of ["serverName", "gameServerPort", "maxPlayers", "maxTeamSize", "allowAnonymousConnections", "anonymousConnectionsAreAdmin", "allowAdminCommands", "allowAdminCommandsFromAnyone", "allowAssetsMismatch", "checkAssetsDigest", "safeScripts", "tutorialMessages", "playerBackupFileCount"]) {
			expect(s[k], k).toBeTruthy();
		}
	});

	it("offers the yes/no settings as true and false, the values the file holds", () => {
		expect(s.allowAnonymousConnections.options.map((o) => o.value)).toEqual(["true", "false"]);
		expect(s.checkAssetsDigest.options.map((o) => o.value)).toEqual(["true", "false"]);
		expect(s.safeScripts.options.map((o) => o.value)).toEqual(["true", "false"]);
	});

	it("does not offer the settings that wipe files, the RCON or query switches, or the account list", () => {
		for (const k of ["clearPlayerFiles", "clearUniverseFiles", "runRconServer", "rconServerPassword", "rconServerPort", "runQueryServer", "queryServerPort", "serverUsers", "bannedIPs", "bannedUuids"]) {
			expect(s[k], k).toBeUndefined();
		}
	});
});

describe("Starbound starbound_server.config as the panel writes it", () => {
	const file = game.files["starbound_server.config"];
	const text = server.template.buildConfigFile({ name: "x", sessionName: "Friends Universe", port: 21025, installDir: "C:\\x" }).content;

	it("parses to the three keys the panel writes, with their JSON types", () => {
		const parsed = parseJsonConfig(text);
		const entries = flattenJsonEntries(parsed);
		expect(entries.map((e) => [e.path, e.value])).toEqual([
			["serverName", "Friends Universe"],
			["gameServerPort", 21025],
			["maxPlayers", 8],
		]);
		for (const e of entries) expect(file.settings[e.path], e.path).toBeTruthy();
	});

	it("changes a number as a number and a name as text, leaving the other keys as they are", () => {
		const parsed = parseJsonConfig(text);
		const out = serializeJsonConfig(parsed, { gameServerPort: 21030, serverName: "New Name" });
		const back = JSON.parse(out);
		expect(back).toEqual({ serverName: "New Name", gameServerPort: 21030, maxPlayers: 8 });
	});
});

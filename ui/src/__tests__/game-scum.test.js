import { describe, it, expect } from "vitest";
import scum from "../catalog/games/scum.js";
import game from "../../../src/server/data/games/scum.js";
import { CONFIG_CATALOG, annotateEntries } from "../configCatalog.js";
import { parseIni, serializeIni } from "../configParsers/ini.js";
import { parseLaunchArgs, launchArgsEntries, serializeLaunchArgs } from "../configParsers/launchArgs.js";

// SCUM's catalog is written from the research dossier (409 of the 437 settings of ServerSettings.ini, and four launch arguments).
// The rules are the ones catalogs.test.js applies to every game, which cannot see a game until it is registered.

const file = scum.files["ServerSettings.ini"];
const settings = Object.entries(file.settings);

describe("SCUM module", () => {
	it("has the shape the interface expects", () => {
		expect(scum.type).toBe("scum");
		expect(scum.type).toBe(game.template.type);
		expect(scum.title).toBe("SCUM");
		expect(Object.keys(scum.files)).toEqual(["ServerSettings.ini"]);
		expect(file.parser).toBe("ini");
		expect(scum.guide.name).toBe("SCUM");
		expect(Object.keys(scum.guide.files)).toEqual(["ServerSettings.ini"]);
	});
});

describe("SCUM: ServerSettings.ini", () => {
	it("explains 409 settings, every key written with the scum. prefix and once", () => {
		expect(settings).toHaveLength(409);
		for (const [key] of settings) expect(key, key).toMatch(/^scum\.[A-Za-z][A-Za-z0-9_.]*$/);
		expect(new Set(settings.map(([k]) => k)).size).toBe(settings.length);
	});

	it("gives every setting a label, an explanation and a group", () => {
		for (const [key, meta] of settings) {
			expect(meta.label?.trim(), `${key} label`).toBeTruthy();
			expect(meta.description?.trim().length ?? 0, `${key} description`).toBeGreaterThan(10);
			expect(meta.group?.trim(), `${key} group`).toBeTruthy();
		}
	});

	it("keeps the sources' own notes (CONFLICT, UNVERIFIED, UNCONFIRMED) out of what players read", () => {
		for (const [key, meta] of settings) expect(meta.description, key).not.toMatch(/CONFLICT|UNVERIFIED|UNCONFIRMED|GameServerKings|server-settings\.com|\[|\]/);
	});

	it("lists each choice of a dropdown once, with a label", () => {
		let dropdowns = 0;
		for (const [key, meta] of settings) {
			if (!meta.options) continue;
			dropdowns += 1;
			const values = meta.options.map((o) => o.value);
			expect(meta.options.length, key).toBeGreaterThan(0);
			expect(new Set(values).size, `${key} repeats a choice: ${values.join(", ")}`).toBe(values.length);
			for (const o of meta.options) {
				expect(typeof o.value, key).toBe("string");
				expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
			}
		}
		expect(dropdowns).toBe(2);
		expect(file.settings["scum.ArmedNPCDifficultyLevel"].options.map((o) => o.value)).toEqual(["1", "2", "3"]);
		expect(file.settings["scum.RaidProtectionType"].options.map((o) => o.value)).toEqual(["0", "1", "2", "3"]);
	});

	it("gives two settings in a group the same label only when they are the same thing under two names", () => {
		const seen = new Map();
		for (const [key, meta] of settings) {
			const id = `${meta.group}/${meta.label}`;
			if (seen.has(id)) expect(meta.description, `${key} repeats "${meta.label}" in ${meta.group}`).toBe(seen.get(id));
			seen.set(id, meta.description);
		}
	});

	it("names only groups that exist in groupOrder, and orders every group", () => {
		const groups = new Set(settings.map(([, m]) => m.group));
		for (const g of file.groupOrder) expect(groups.has(g), `groupOrder lists "${g}" but no setting is in it`).toBe(true);
		for (const g of groups) expect(file.groupOrder, g).toContain(g);
	});

	it("leaves out the 27 settings the sources call unknown, unused, disabled or developer-only", () => {
		const left = [
			"ServerDescription", "ServerBannerUrl", "ServerPlaystyle", "MasterServerUpdateSendInterval", "MasterServerIsLocalTest",
			"ItemVirtualizationRelevancyUpdatePeriod", "ItemVirtualizationEventProcessingTimeBudget", "ItemVirtualizationVisitorDistanceTravelledForUpdate",
			"ItemVirtualizationVisitorBounds", "VirtualizedItemBounds", "MaxAllowedBirds", "EncounterHordeGroupBaseCharacterAmountMultiplier",
			"EncounterHordeBaseCharacterAmountMultiplier", "EncounterHordeSpawnDistanceMultiplier", "EncounterHordeGroupRefillTimeMultiplier",
			"SquadRespawnPrice", "MaximumBaseProximityWhenSpawning", "KingletDusterMinPurchasedAmount", "WaterPricePerUnitMultiplier",
			"WaterPeriodicInitialAmountMultiplier", "GasolineProximityReplenishAmountMultiplier", "GasolineProximityReplenishChanceMultiplier",
			"GasolineProximityReplenishTimeoutMultiplier", "PropaneProximityReplenishAmountMultiplier", "PropaneProximityReplenishChanceMultiplier",
			"PropaneProximityReplenishTimeoutMultiplier", "MovementInertiaAmount",
		];
		expect(left).toHaveLength(27);
		for (const k of left) expect(file.settings[`scum.${k}`], k).toBeUndefined();
		expect(file.settings["scum.EnableDeenaOnServer"]).toBeUndefined();
	});

	it("explains the settings the panel itself writes, and the ones people change most", () => {
		for (const k of ["ServerName", "ServerPassword", "MaxPlayers", "PuppetHealthMultiplier", "BaseElementsDecayRateMultiplier", "RaidProtectionType", "FullWipe", "FameGainMultiplier", "DoorLockability.Garage"]) {
			expect(file.settings[`scum.${k}`], k).toBeTruthy();
		}
	});

	it("finds a setting from the game's own file by its key alone, whatever section it sits in, and shows the groups in order", () => {
		// The lead registers the module; until then the panel's catalog does not know the game, so register it here for this test file only.
		CONFIG_CATALOG.scum = { files: { "ServerSettings.ini": file } };
		const text = ["[General]", "scum.ServerName=My Island", "scum.MaxPlayers=32", "", "[Features]", "scum.QuestsEnabled=True", "scum.RaidProtectionType=3", "scum.SomethingNew=1", ""].join("\r\n");
		const parsed = parseIni(text);
		const { groups, undocumented } = annotateEntries("scum", "ServerSettings.ini", parsed.entries);
		expect(undocumented).toBe(1);
		// The declared order first, then a group the catalog does not know (the section of a setting it has no row for).
		expect(groups.map((g) => g.name)).toEqual(["General: Server identity & access", "Features: Raid protection", "Features: Quests", "Features"]);
		const all = groups.flatMap((g) => g.settings);
		expect(all.find((e) => e.key === "scum.RaidProtectionType").options).toHaveLength(4);
		expect(all.find((e) => e.key === "scum.QuestsEnabled").documented).toBe(true);
		expect(all.find((e) => e.key === "scum.SomethingNew").documented).toBe(false);
		// An edit changes only its own line.
		const name = parsed.entries.find((e) => e.key === "scum.ServerName");
		expect(serializeIni(parsed, { [name.id]: "New Name" }).split("\n").filter((l) => l.includes("ServerName"))).toEqual(["scum.ServerName=New Name"]);
	});
});

describe("SCUM: launch arguments", () => {
	const def = scum.launch;

	it("gives every argument a label, an explanation and a group, with a flag nobody else uses", () => {
		expect(def.args.length).toBe(4);
		for (const arg of def.args) {
			expect(arg.label?.trim(), arg.flag).toBeTruthy();
			expect(arg.description.length, arg.flag).toBeGreaterThan(15);
			expect(arg.group?.trim(), arg.flag).toBeTruthy();
		}
		const flags = def.args.map((a) => a.flag.toLowerCase());
		expect(new Set(flags).size).toBe(flags.length);
		const keys = def.args.filter((a) => a.edit !== false).map((a) => a.key ?? a.flag.replace(/^[-+]+/, ""));
		expect(new Set(keys).size).toBe(keys.length);
	});

	it("has exactly the arguments the dossier verifies (and no -QueryPort)", () => {
		expect(def.args.map((a) => a.flag)).toEqual(["-log", "-port", "-MaxPlayers", "-nobattleye"]);
		expect(def.style).toBe("equals");
		expect(def.editable).toBe(true);
	});

	it("reads the line the panel writes and leaves it byte-for-byte alone when nothing changes", () => {
		const script = game.template.buildStartScript({ name: "Test", sessionName: "S", port: 7870, maxPlayers: 40, instanceSlug: "main" });
		const parsed = parseLaunchArgs(script, def);
		expect(parsed.at, script).toBeGreaterThanOrEqual(0);
		expect(serializeLaunchArgs(parsed, {})).toBe(script);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("7870");
		expect(by.MaxPlayers.value).toBe("40");
		expect(by.nobattleye.value).toBe("false");
		// -log is explained but not offered in the form (the panel always writes it).
		expect(by.log).toBeUndefined();
	});

	it("adds -nobattleye at the end and changes the port in place", () => {
		const script = game.template.buildStartScript({ name: "Test", sessionName: "S", port: 7870, instanceSlug: "main" });
		const parsed = parseLaunchArgs(script, def);
		const by = Object.fromEntries(launchArgsEntries(parsed).map((e) => [e.key, e]));
		const out = serializeLaunchArgs(parsed, { [by.nobattleye.id]: "true", [by.port.id]: "7900" });
		expect(out).toContain("-port=7900");
		expect(out).not.toContain("-port=7870");
		expect(out).toMatch(/-nobattleye$/m);
		expect(out).toContain("-log");
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});

	it("every argument the form offers for the line is explained", () => {
		const script = game.template.buildStartScript({ name: "Test", sessionName: "S", port: 7870, instanceSlug: "main" });
		const parsed = parseLaunchArgs(script, def);
		const explained = new Set(def.args.filter((a) => a.edit !== false).map((a) => a.key ?? a.flag.replace(/^[-+]+/, "")));
		for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), entry.key).toBe(true);
	});
});

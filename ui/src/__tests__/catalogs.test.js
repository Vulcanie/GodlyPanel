import { describe, it, expect } from "vitest";
import { GAME_TEMPLATES } from "../../../src/server/data/gameTemplates.js";
import { CONFIG_CATALOG, annotateEntries, getFileCatalog } from "../configCatalog.js";
import { LAUNCH_ARGS, LAUNCH_EDITABLE_GAMES } from "../catalog/launchArgs.js";
import { parseConvarCfg, convarEntries, serializeConvarCfg } from "../configParsers/convarCfg.js";
import { parseXmlProperties, serializeXmlProperties } from "../configParsers/xmlProperties.js";
import { parseValheimLaunch, valheimLaunchEntries, serializeValheimLaunch } from "../configParsers/valheimLaunch.js";
import { parseLaunchArgs, launchArgsEntries } from "../configParsers/launchArgs.js";

// The settings catalogs are what the Settings tab explains and what the game settings guide is made from, so a setting without an
// explanation, or a dropdown with a repeated choice, is a bug the person using the panel would see.

const files = Object.entries(CONFIG_CATALOG).flatMap(([game, catalog]) => Object.entries(catalog.files).map(([name, file]) => ({ game, name, file })));

describe("every game's settings catalog", () => {
	it("covers the games the panel creates", () => {
		const types = new Set(GAME_TEMPLATES.map((t) => String(t.type).toLowerCase()));
		// Palworld's server type has always been spelt "Palword"; the catalog key follows it.
		for (const type of types) expect(CONFIG_CATALOG[type], `no catalog for ${type}`).toBeTruthy();
	});

	for (const { game, name, file } of files) {
		describe(`${game}: ${name}`, () => {
			const settings = Object.entries(file.settings);

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
					expect(meta.options.length, `${key} has an empty list of choices`).toBeGreaterThan(0);
					const values = meta.options.map((o) => o.value);
					expect(new Set(values).size, `${key} repeats a choice: ${values.join(", ")}`).toBe(values.length);
					for (const o of meta.options) {
						expect(typeof o.value, key).toBe("string");
						expect(o.label?.trim(), `${key} = ${o.value}`).toBeTruthy();
					}
				}
			});

			it("has a unique label for each setting within a group", () => {
				const seen = new Set();
				for (const [key, meta] of settings) {
					const id = `${meta.group}/${meta.label}`;
					expect(seen.has(id), `${key} repeats "${meta.label}" in ${meta.group}`).toBe(false);
					seen.add(id);
				}
			});

			it("only names groups in groupOrder that exist", () => {
				const groups = new Set(settings.map(([, m]) => m.group));
				for (const g of file.groupOrder ?? []) expect(groups.has(g), `groupOrder lists "${g}" but no setting is in it`).toBe(true);
			});

			it("shows the groups in the declared order, and explains everything in it", () => {
				if (!settings.length) return;
				// One entry per catalog setting, shaped the way the parsers report them.
				const entries = settings.map(([key]) => {
					const at = key.lastIndexOf("::");
					if (at >= 0) return { section: key.slice(0, at), key: key.slice(at + 2), value: "" };
					if (file.parser === "json") return { path: key, key: key.split(".").pop(), topLevel: key.split(".")[0], value: "" };
					return { section: "General", key, value: "" };
				});
				const annotated = annotateEntries(game, name, entries);
				expect(annotated.undocumented).toBe(0);
				expect(annotated.groups.flatMap((g) => g.settings).length).toBe(settings.length);
				const order = annotated.groups.map((g) => g.name);
				const declared = file.groupOrder ?? [];
				const ranked = order.filter((g) => declared.includes(g));
				expect(ranked, "declared groups are out of order").toEqual(declared.filter((g) => ranked.includes(g)));
				// A group the order doesn't mention goes after the ones it does.
				const firstUnlisted = order.findIndex((g) => !declared.includes(g));
				if (declared.length && firstUnlisted >= 0) expect(order.slice(firstUnlisted).some((g) => declared.includes(g)), "an unlisted group comes before a listed one").toBe(false);
			});
		});
	}

	it("finds the file catalog of a game's only settings file as 'config'", () => {
		expect(getFileCatalog("rust", "config")).toBe(CONFIG_CATALOG.rust.files["server.cfg"]);
		expect(getFileCatalog("unknown-game", "config")).toBeNull();
	});
});

describe("console variable files (Rust server.cfg)", () => {
	const cfg = ['// my server', 'server.hostname "My Rust Server"', "server.maxplayers 50", "# a note", "server.pve false", "server.maxplayers 60", ""].join("\r\n");

	it("keeps the last of a repeated setting and changes only that line", () => {
		const parsed = parseConvarCfg(cfg);
		const by = Object.fromEntries(parsed.entries.map((e) => [e.key, e]));
		expect(by["server.maxplayers"].value).toBe("60");
		expect(by["server.hostname"].value).toBe("My Rust Server");
		const out = serializeConvarCfg(parsed, { "server.maxplayers": "70", "server.pve": "true" });
		expect(out).toBe(cfg.replace("server.maxplayers 60", "server.maxplayers 70").replace("server.pve false", "server.pve true"));
	});

	it("is unchanged when nothing is edited", () => {
		expect(serializeConvarCfg(parseConvarCfg(cfg), {})).toBe(cfg);
	});

	it("quotes a value with spaces, never lets a quote in, and adds a setting the file lacks", () => {
		const parsed = parseConvarCfg(cfg);
		const out = serializeConvarCfg(parsed, { "server.hostname": 'Say "hi" now', "server.seed": "1337", "server.description": "A longer one" });
		expect(out).toContain('server.hostname "Say hi now"');
		expect(out).toContain("server.seed 1337");
		expect(out).toContain('server.description "A longer one"');
		expect(out.endsWith("\r\n")).toBe(true);
		expect(parseConvarCfg(out).entries.find((e) => e.key === "server.seed").value).toBe("1337");
	});

	it("takes a setting out when it is cleared, and offers the catalog's settings the file doesn't have", () => {
		const parsed = parseConvarCfg(cfg);
		expect(serializeConvarCfg(parsed, { "server.pve": "" })).not.toContain("server.pve");
		const known = Object.keys(CONFIG_CATALOG.rust.files["server.cfg"].settings);
		const offered = convarEntries(parsed, known);
		expect(offered.map((e) => e.key).sort()).toEqual([...new Set([...parsed.entries.map((e) => e.key), ...known])].sort());
	});
});

describe("XML settings files (7 Days to Die serverconfig.xml)", () => {
	const xml = ['<?xml version="1.0"?>', "<ServerSettings>", '\t<property name="ServerName" value="Tom &amp; Jerry&apos;s &quot;Place&quot;"/> <!-- the name -->', '\t<property name="ServerPort" value="26900"/>', "</ServerSettings>"].join("\n");

	it("shows a value as typed and writes it back unchanged", () => {
		const parsed = parseXmlProperties(xml);
		const name = parsed.entries.find((e) => e.key === "ServerName");
		expect(name.value).toBe("Tom & Jerry's \"Place\"");
		expect(name.comment).toBe("the name");
		expect(serializeXmlProperties(parsed, { [name.id]: name.value })).toBe(xml.replace("Jerry&apos;s", "Jerry's"));
	});

	it("writes a typed & as &amp; and a typed quote as &quot;", () => {
		const parsed = parseXmlProperties(xml);
		const name = parsed.entries.find((e) => e.key === "ServerName");
		const out = serializeXmlProperties(parsed, { [name.id]: 'Fish & "Chips" <1>' });
		expect(out).toContain('value="Fish &amp; &quot;Chips&quot; &lt;1&gt;"');
		expect(parseXmlProperties(out).entries.find((e) => e.key === "ServerName").value).toBe('Fish & "Chips" <1>');
		// Nothing else on the page moves.
		expect(out.split("\n").length).toBe(xml.split("\n").length);
		expect(out).toContain('<property name="ServerPort" value="26900"/>');
	});
});

describe("Valheim's launch options", () => {
	const script = GAME_TEMPLATES.find((t) => t.id === "valheim").buildStartScript({
		name: "Test",
		sessionName: "My Valheim",
		serverPassword: "secret1",
		port: 2456,
		queryPort: 2457,
		maxPlayers: 10,
		instanceSlug: "main",
	});

	it("reads the line the panel writes", () => {
		const parsed = parseValheimLaunch(script);
		expect(parsed.at).toBeGreaterThanOrEqual(0);
		const by = Object.fromEntries(valheimLaunchEntries(parsed).map((e) => [e.key, e]));
		expect(by.port.value).toBe("2456");
		expect(by.password.value).toBe("secret1");
	});

	it("offers exactly the settings the catalog explains", () => {
		const offered = valheimLaunchEntries(parseValheimLaunch(script)).map((e) => e.key).sort();
		const explained = Object.keys(CONFIG_CATALOG.valheim.files["Launch options"].settings).sort();
		expect(offered).toEqual(explained);
	});

	it("writes a choice of the dropdowns back", () => {
		const parsed = parseValheimLaunch(script);
		const by = Object.fromEntries(valheimLaunchEntries(parsed).map((e) => [e.key, e]));
		const options = CONFIG_CATALOG.valheim.files["Launch options"].settings;
		const out = serializeValheimLaunch(parsed, { [by.preset.id]: options.preset.options.at(-1).value, [by.combat.id]: options.combat.options[0].value, [by["setkey nomap"].id]: "true" });
		expect(out).toContain(`-preset ${options.preset.options.at(-1).value}`);
		expect(out).toContain(`-modifier combat ${options.combat.options[0].value}`);
		expect(out).toContain("-setkey nomap");
		expect(out).toContain("-nographics");
		expect(out.split("\r\n").length).toBe(script.split("\r\n").length);
	});
});

describe("launch lines of every game with a Launch options form", () => {
	const params = { name: "Test", sessionName: "My Server", serverPassword: "secret1", rconPassword: "rconpass1", port: 7777, queryPort: 7779, rconPort: 26000, telnetPort: 26001, maxPlayers: 12, instanceSlug: "main", maxMemoryGB: 6 };

	it("is defined for each game that has a catalog file for it", () => {
		for (const game of LAUNCH_EDITABLE_GAMES) expect(CONFIG_CATALOG[game]?.files["Launch options"], game).toBeTruthy();
	});

	for (const game of LAUNCH_EDITABLE_GAMES) {
		it(`${game}: the script the panel writes has a launch line whose arguments are all explained`, () => {
			const template = GAME_TEMPLATES.find((t) => String(t.type).toLowerCase() === game);
			expect(template, `no template for ${game}`).toBeTruthy();
			const text = template.buildStartScript(params);
			const def = LAUNCH_ARGS[game];
			if (game === "valheim") {
				const parsed = parseValheimLaunch(text);
				expect(parsed.at, text).toBeGreaterThanOrEqual(0);
				return;
			}
			const parsed = parseLaunchArgs(text, def);
			expect(parsed.at, text).toBeGreaterThanOrEqual(0);
			// Every setting the form offers for this game is one the catalog describes.
			const explained = new Set(Object.keys(CONFIG_CATALOG[game].files["Launch options"].settings));
			for (const entry of launchArgsEntries(parsed)) expect(explained.has(entry.key), `${game}: ${entry.key} is on the line but not in the catalog`).toBe(true);
		});
	}
});

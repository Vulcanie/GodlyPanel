// Compares a REAL game settings file (or start script) with what the panel's catalog knows about that game, so a person with the
// game installed can see at once what is missing or wrong:
//   - settings in the real file that the catalog doesn't explain (candidates to add, or mod/plugin settings to ignore)
//   - settings the catalog explains that the real file doesn't have (a wrong key name, a setting the game has dropped, or one the
//     game only writes when it is changed)
//   - for a start script, the launch arguments found on its launch line and the ones the catalog expects
//   - for each setting with dropdown choices, whether the file's current value is one of them
//
//   cd ui && node scripts/catalog-diff.mjs --game <type> --file "<catalog file name>" <path to the real file>
//   cd ui && node scripts/catalog-diff.mjs --game <type> --launch <path to the start script>
//   cd ui && node scripts/catalog-diff.mjs --list            (game types and file names the catalog has)
//
// <type> is the `type` of the server as the panel records it (ark, conan, valheim, enshrouded, rune, windrose, 7days, subsistence,
// Palword, minecraft, rust, zomboid, satisfactory, vrising, corekeeper, sotf). Add --json for machine-readable output.
import fs from "node:fs";
import { createServer } from "vite";

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const asJson = args.includes("--json");
const positional = args.filter((a, i) => !a.startsWith("--") && !["--game", "--file", "--launch"].includes(args[i - 1]));

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent", optimizeDeps: { noDiscovery: true, include: [] } });
const load = (p) => vite.ssrLoadModule(p);

try {
	const { CONFIG_CATALOG, annotateEntries, getFileParser, getCatalogKeys, getStructuredPaths, getLaunchDef } = await load("/src/configCatalog.js");

	if (args.includes("--list")) {
		for (const [game, def] of Object.entries(CONFIG_CATALOG)) console.log(`${game}: ${Object.keys(def.files).join(" | ")}`);
		process.exit(0);
	}

	const game = flag("--game");
	const launchPath = flag("--launch");
	const file = launchPath ? "Launch options" : (flag("--file") ?? "config");
	const path = launchPath ?? positional[0];
	if (!game || !path) {
		console.error("Usage: node scripts/catalog-diff.mjs --game <type> (--file <name> <path> | --launch <path>) | --list");
		process.exit(2);
	}

	const [ini, props, xml, json, valheim, palworld, convar, launch] = await Promise.all(
		["ini", "properties", "xmlProperties", "json", "valheimLaunch", "palworldStruct", "convarCfg", "launchArgs"].map((m) => load(`/src/configParsers/${m}.js`)),
	);
	const PARSERS = {
		ini: { parse: ini.parseIni, entries: (p) => p.entries },
		properties: { parse: props.parseProperties, entries: (p) => p.entries },
		xml: { parse: xml.parseXmlProperties, entries: (p) => p.entries },
		json: { parse: json.parseJsonConfig, entries: (p, ctx) => json.flattenJsonEntries(p, new Set(ctx.structuredPaths)) },
		valheimLaunch: { parse: valheim.parseValheimLaunch, entries: valheim.valheimLaunchEntries },
		palworld: { parse: palworld.parsePalworldStruct, entries: (p) => p.entries },
		convar: { parse: convar.parseConvarCfg, entries: (p, ctx) => convar.convarEntries(p, ctx.catalogKeys) },
		launchArgs: { parse: (t, ctx) => launch.parseLaunchArgs(t, ctx.launchDef), entries: launch.launchArgsEntries },
	};

	const parserType = getFileParser(game, file);
	const parser = PARSERS[parserType];
	const ctx = { structuredPaths: getStructuredPaths(game, file), catalogKeys: getCatalogKeys(game, file), launchDef: getLaunchDef(game) };
	// The panel hands the form a file without its byte-order mark, so the comparison does too.
	const text = fs.readFileSync(path, "utf8").replace(new RegExp(`^${String.fromCharCode(0xfeff)}`), "");
	const parsed = parser.parse(text, ctx);
	if (parsed.at === -1) {
		console.error(`No launch line for ${game} was found in ${path}.`);
		process.exit(1);
	}
	const entries = parser.entries(parsed, ctx).filter((e) => !(parserType === "convar" && e.lineIndex === -1));
	const { groups, undocumented } = annotateEntries(game, file, parser.entries(parsed, ctx));

	const inFile = new Set(entries.map((e) => e.path ?? e.key));
	const catalogKeys = getCatalogKeys(game, file);
	const bare = (k) => (k.includes("::") ? k.split("::").pop() : k);
	const fileKeys = new Set(entries.flatMap((e) => [e.key, e.path].filter(Boolean)));
	const missingFromFile = catalogKeys.filter((k) => ![...fileKeys].some((fk) => fk === bare(k) || fk === k));
	const undocumentedList = groups.flatMap((g) => g.settings).filter((s) => !s.documented).map((s) => ({ key: s.path ?? s.key, section: s.section ?? s.topLevel ?? "", value: String(s.value).slice(0, 60) }));
	// A key can be "explained" only by the game's own comment in the file (7 Days does this); this list is what the catalog itself lacks.
	const inCatalog = new Set(catalogKeys.flatMap((k) => [k, bare(k)]));
	const notInCatalog = entries.filter((e) => !inCatalog.has(e.key) && !inCatalog.has(e.path ?? e.key)).map((e) => e.path ?? e.key);
	const badChoice = groups
		.flatMap((g) => g.settings)
		.filter((s) => s.options && !s.allowCustom && s.value !== "" && !s.options.some((o) => o.value === String(s.value)))
		.map((s) => ({ key: s.key, value: String(s.value), choices: s.options.map((o) => o.value) }));

	const report = { game, file, parser: parserType, settingsInFile: entries.length, explained: entries.length - undocumented, undocumented: undocumentedList, notInCatalog, catalogKeysNotInFile: missingFromFile, valuesOutsideDropdown: badChoice, inFileSample: [...inFile].slice(0, 5) };
	if (asJson) console.log(JSON.stringify(report, null, 2));
	else {
		console.log(`${game} / ${file} (${parserType}): ${report.settingsInFile} settings in the file, ${report.explained} explained by the catalog.`);
		console.log(`\nIn the file but NOT explained (${undocumentedList.length}):`);
		for (const u of undocumentedList) console.log(`  ${u.section ? `[${u.section}] ` : ""}${u.key} = ${u.value}`);
		if (notInCatalog.length > undocumentedList.length) console.log(`\nIn the file with no catalog entry of its own (${notInCatalog.length}; some are explained only by the file's own comments):\n  ${notInCatalog.join(", ")}`);
		console.log(`\nExplained by the catalog but NOT in the file (${missingFromFile.length}):`);
		for (const k of missingFromFile) console.log(`  ${k}`);
		console.log(`\nValues the dropdown doesn't offer (${badChoice.length}):`);
		for (const b of badChoice) console.log(`  ${b.key} = ${b.value}   (choices: ${b.choices.join(", ")})`);
	}
} finally {
	await vite.close();
}

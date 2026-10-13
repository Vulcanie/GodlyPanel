import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIELD_SPECS } from "../../../src/server/config/configSchema.js";
import { GUIDES, slugify } from "../help/guides.js";
import { HELP_LIST, PANEL_HELP } from "../help/panelHelp.js";
import { headingSlugs } from "../help/renderGuide.js";
import { launchGuideEntries, gameGuideEntries } from "../help/generatedGuides.js";
import { LAUNCH_ARGS } from "../catalog/launchArgs.js";
import { CONFIG_CATALOG } from "../configCatalog.js";
import { DOCS, guideFile, renderDoc } from "../../../scripts/build-guides.mjs";

// The (i) tooltips and the guides they link to are made from the same help text. These tests are what keeps a control without an
// explanation, a link to a heading that is not there, and a guide nobody regenerated from reaching a release.

const here = path.dirname(fileURLToPath(import.meta.url));
const componentsDir = path.resolve(here, "..", "components");

const sourceFiles = (dir) =>
	fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sourceFiles(path.join(dir, e.name)) : /\.jsx?$/.test(e.name) ? [path.join(dir, e.name)] : []));

describe("the help text", () => {
	it("explains every setting on the Settings page", () => {
		const missing = FIELD_SPECS.map((s) => s.path).filter((p) => !PANEL_HELP[p]);
		expect(missing, `no help entry for: ${missing.join(", ")}`).toEqual([]);
	});

	it("has an id, a title, a section and some text for every entry, and points at a known guide", () => {
		for (const e of HELP_LIST) {
			expect(e.id, JSON.stringify(e).slice(0, 80)).toBeTruthy();
			expect(Object.keys(GUIDES), e.id).toContain(e.guide);
			expect(e.section?.trim(), e.id).toBeTruthy();
			expect(e.title?.trim(), e.id).toBeTruthy();
			expect(e.text?.trim().length, e.id).toBeGreaterThan(0);
			// A tooltip is read at a glance; the longer explanation belongs in `details`.
			expect(e.text.length, `${e.id} text is long for a tooltip`).toBeLessThan(400);
		}
	});

	it("uses each id once", () => {
		const ids = HELP_LIST.map((e) => e.id);
		const duplicated = ids.filter((id, i) => ids.indexOf(id) !== i);
		expect(duplicated).toEqual([]);
	});

	it("only the settings and server guides are written by hand", () => {
		for (const e of HELP_LIST) expect(["settings", "server"], e.id).toContain(e.guide);
	});
});

describe("the generated guides", () => {
	for (const key of Object.keys(GUIDES)) {
		describe(GUIDES[key].title, () => {
			const markdown = renderDoc(key);
			const slugs = headingSlugs(markdown);

			it("has no two headings that make the same link", () => {
				const duplicated = slugs.filter((s, i) => slugs.indexOf(s) !== i);
				expect(duplicated).toEqual([]);
			});

			it("has a heading for every entry the interface can link to", () => {
				// The settings and server guides are linked to by the (i) icons, which go to an entry's title.
				for (const e of HELP_LIST.filter((x) => x.guide === key)) expect(slugs, `${e.id}: ${e.title}`).toContain(slugify(e.title));
			});

			it("is the same as the file committed in docs/ (run npm run build:guides if not)", () => {
				expect(fs.readFileSync(guideFile(key), "utf8")).toBe(markdown);
			});

			it("renders the same twice", () => {
				expect(renderDoc(key)).toBe(markdown);
			});
		});
	}

	it("links each game's Launch reference to a heading", () => {
		// LaunchReference.jsx links to guideUrl("launch", def.title).
		const slugs = headingSlugs(renderDoc("launch"));
		for (const def of Object.values(LAUNCH_ARGS)) expect(slugs, def.title).toContain(slugify(def.title));
	});

	it("explains every launch argument of every game", () => {
		const markdown = renderDoc("launch");
		for (const def of Object.values(LAUNCH_ARGS)) {
			for (const arg of def.args) expect(markdown, `${def.title} ${arg.flag}`).toContain(`\`${arg.flag}\``);
		}
		expect(launchGuideEntries.entries().length).toBeGreaterThan(Object.keys(LAUNCH_ARGS).length);
	});

	it("has a section for every game that has a settings catalog, and says mods are not explained", () => {
		const markdown = renderDoc("games");
		const sections = new Set(gameGuideEntries.entries().map((e) => e.section));
		expect(sections.size).toBe(Object.keys(CONFIG_CATALOG).length);
		expect(markdown).toContain("Mods will not have explanations");
	});

	it("lists every catalog setting's label and key", () => {
		const entries = gameGuideEntries.entries();
		const text = entries.map((e) => `${e.text}\n${e.details ?? ""}`).join("\n");
		for (const [game, catalog] of Object.entries(CONFIG_CATALOG)) {
			for (const [file, f] of Object.entries(catalog.files)) {
				if (f.launch) continue;
				for (const [key, meta] of Object.entries(f.settings)) {
					const name = key.includes("::") ? key.slice(key.lastIndexOf("::") + 2) : key;
					expect(text, `${game} ${file} ${key}`).toContain(`\`${name}\``);
					expect(text, `${game} ${file} ${key}`).toContain(meta.label);
				}
			}
		}
	});

	it("lists every guide in the DOCS table", () => {
		expect(Object.keys(DOCS).sort()).toEqual(Object.keys(GUIDES).sort());
	});
});

describe("the (i) icons in the interface", () => {
	// Only ids written out as a string are checked; one built at run time cannot be known from the source.
	const LITERAL = /(?:<InfoTip\b[^>]*?\bid|\bhelpId|\binfo)=(?:"([^"{}]+)"|\{\s*"([^"]+)"\s*\})/g;

	it("only name entries that exist", () => {
		const unknown = [];
		let found = 0;
		for (const file of sourceFiles(componentsDir)) {
			const source = fs.readFileSync(file, "utf8");
			for (const m of source.matchAll(LITERAL)) {
				found += 1;
				const id = m[1] ?? m[2];
				if (!PANEL_HELP[id]) unknown.push(`${path.relative(componentsDir, file)}: ${id}`);
			}
		}
		expect(found, "no InfoTip ids found: the pattern needs updating").toBeGreaterThan(0);
		expect(unknown).toEqual([]);
	});
});

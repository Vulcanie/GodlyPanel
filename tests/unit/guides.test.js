import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// The guides in docs/ that the interface's (i) icons link to are generated from the help text and the game catalogs in ui/src.
// A help text edited without running `npm run build:guides` would leave the page behind the tooltip, and a control with no entry
// would have no tooltip at all, so this fails in either case. (The interface's own vitest checks more; this one runs with the
// server tests so it is seen in CI even by someone who only runs those.)

const root = path.resolve(import.meta.dirname, "..", "..");
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

const [{ GUIDES, slugify }, { HELP_LIST, PANEL_HELP }, { headingSlugs }, { DOCS, guideFile, renderDoc }, { FIELD_SPECS }] = await Promise.all([
	load("ui/src/help/guides.js"),
	load("ui/src/help/panelHelp.js"),
	load("ui/src/help/renderGuide.js"),
	load("scripts/build-guides.mjs"),
	load("src/server/config/configSchema.js"),
]);

describe("the generated guides", () => {
	for (const key of Object.keys(GUIDES)) {
		it(`${GUIDES[key].file}.md is what the generator makes`, () => {
			assert.equal(fs.readFileSync(guideFile(key), "utf8"), renderDoc(key), `docs/${GUIDES[key].file}.md is out of date: run npm run build:guides`);
		});

		it(`${GUIDES[key].file}.md has a unique heading link for everything the interface points at`, () => {
			const slugs = headingSlugs(renderDoc(key));
			assert.deepEqual(slugs.filter((s, i) => slugs.indexOf(s) !== i), [], "two headings make the same link");
			for (const e of HELP_LIST.filter((x) => x.guide === key)) assert.ok(slugs.includes(slugify(e.title)), `${e.id}: no heading "${e.title}"`);
		});
	}

	it("has a generator for every guide the interface can link to", () => {
		assert.deepEqual(Object.keys(DOCS).sort(), Object.keys(GUIDES).sort());
	});

	it("passes `build-guides.mjs --check` as a script", () => {
		const run = spawnSync(process.execPath, [path.join(root, "scripts", "build-guides.mjs"), "--check"], { encoding: "utf8" });
		assert.equal(run.status, 0, run.stderr);
	});
});

describe("the help text", () => {
	it("explains every setting on the Settings page", () => {
		const missing = FIELD_SPECS.map((s) => s.path).filter((p) => !PANEL_HELP[p]);
		assert.deepEqual(missing, [], `no help entry for: ${missing.join(", ")}`);
	});

	it("has text, a title and a known guide for every entry, and each id once", () => {
		const ids = new Set();
		for (const e of HELP_LIST) {
			assert.ok(e.text?.trim(), `${e.id} has no text`);
			assert.ok(e.title?.trim(), `${e.id} has no title`);
			assert.ok(GUIDES[e.guide], `${e.id} points at an unknown guide "${e.guide}"`);
			assert.ok(!ids.has(e.id), `${e.id} is listed twice`);
			ids.add(e.id);
		}
	});
});

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkI18n, pseudoLocalize, buildPseudoWords } from "../../scripts/i18n-check.mjs";

// Every word the panel shows through t() has to exist in English, and every translation has to use the same {placeholders} as its
// English, or a screen would show a raw key or a missing value to the person using it.

describe("the translation files in ui/src", () => {
	it("have every literal t() and tn() key in en.json, and locale files that match English", () => {
		assert.deepEqual(checkI18n(), []);
	});
});

describe("the pseudo-language file", () => {
	it("is current with en.json (regenerate with: node scripts/i18n-check.mjs --pseudo)", () => {
		const dir = path.join(import.meta.dirname, "..", "..", "ui", "src", "locales");
		const en = JSON.parse(fs.readFileSync(path.join(dir, "en.json"), "utf8"));
		const xa = JSON.parse(fs.readFileSync(path.join(dir, "en-XA.json"), "utf8"));
		assert.deepEqual(xa, buildPseudoWords(en));
	});
});

describe("checkI18n on a small fixture", () => {
	let dir;
	let srcDir;
	let localesDir;

	before(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-check-"));
		srcDir = path.join(dir, "src");
		localesDir = path.join(dir, "locales");
		fs.mkdirSync(srcDir);
		fs.mkdirSync(localesDir);
		fs.writeFileSync(path.join(localesDir, "en.json"), JSON.stringify({ "a.b": "A {name}", "files.one": "{count} file", "files.other": "{count} files" }));
	});

	after(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const write = (name, text) => fs.writeFileSync(path.join(localesDir, name), JSON.stringify(text));

	it("reports a t() key that en.json does not define", () => {
		fs.writeFileSync(path.join(srcDir, "Page.jsx"), 'const x = t("missing.key");');
		const problems = checkI18n({ srcDir, localesDir });
		assert.equal(problems.length, 1);
		assert.match(problems[0], /"missing\.key" is not in en\.json/);
		fs.rmSync(path.join(srcDir, "Page.jsx"));
	});

	it("accepts tn() when both plural forms exist, and reports it when one is missing", () => {
		fs.writeFileSync(path.join(srcDir, "Count.js"), 'tn("files", 2); tn("only", 2);');
		const problems = checkI18n({ srcDir, localesDir });
		assert.equal(problems.length, 2);
		assert.ok(problems.some((p) => /"only\.one"/.test(p)));
		assert.ok(problems.some((p) => /"only\.other"/.test(p)));
		fs.rmSync(path.join(srcDir, "Count.js"));
	});

	it("reports a locale key that en.json lacks", () => {
		write("es.json", { "a.b": "A {name}", "files.one": "{count} a", "files.other": "{count} b", "extra": "x" });
		const problems = checkI18n({ srcDir, localesDir });
		assert.deepEqual(problems, ['es.json: "extra" is not in en.json']);
		fs.rmSync(path.join(localesDir, "es.json"));
	});

	it("reports a key a locale file is missing", () => {
		write("es.json", { "a.b": "Un {name}", "files.one": "{count} a" });
		assert.deepEqual(checkI18n({ srcDir, localesDir }), ['es.json: "files.other" is missing']);
		fs.rmSync(path.join(localesDir, "es.json"));
	});

	it("reports a translation that drops or adds a <b> mark", () => {
		fs.writeFileSync(path.join(localesDir, "en.json"), JSON.stringify({ "a.b": "A <b>{name}</b>" }));
		write("es.json", { "a.b": "Un {name}" });
		assert.deepEqual(checkI18n({ srcDir, localesDir }), ['es.json: "a.b" has different <b>/<i>/<code> marks than English']);
		write("es.json", { "a.b": "Un <b>{name}</b>" });
		assert.deepEqual(checkI18n({ srcDir, localesDir }), []);
		fs.rmSync(path.join(localesDir, "es.json"));
		fs.writeFileSync(path.join(localesDir, "en.json"), JSON.stringify({ "a.b": "A {name}", "files.one": "{count} file", "files.other": "{count} files" }));
	});

	it("reports a translation whose {placeholders} differ from English", () => {
		write("es.json", { "a.b": "A {nombre}", "files.one": "{count} a", "files.other": "{count} b" });
		const problems = checkI18n({ srcDir, localesDir });
		assert.equal(problems.length, 1);
		assert.match(problems[0], /"a\.b" has placeholders \{nombre\}, English has \{name\}/);
		fs.rmSync(path.join(localesDir, "es.json"));
	});

	it("accepts a translation that keeps the English placeholders", () => {
		write("es.json", { "a.b": "Un {name}", "files.one": "{count} a", "files.other": "{count} b", _meta: { reviewed: false } });
		assert.deepEqual(checkI18n({ srcDir, localesDir }), []);
		fs.rmSync(path.join(localesDir, "es.json"));
	});
});

describe("pseudoLocalize", () => {
	it("wraps the text in brackets and keeps {placeholders} intact", () => {
		const out = pseudoLocalize("{count} file");
		assert.ok(out.startsWith("⟦") && out.endsWith("⟧"));
		assert.ok(out.includes("{count}"));
		assert.equal(pseudoLocalize("a <i>it</i> and <code>x</code>"), "⟦aa <i>iit</i> aand <code>x</code>⟧");
		assert.ok(out.length > "{count} file".length + 2);
	});
});

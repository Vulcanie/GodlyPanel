// Checks the panel's translated words against English, and generates the pseudo-language used to test layout.
// Run: node scripts/i18n-check.mjs            (exits 1 listing any problem)
//      node scripts/i18n-check.mjs --pseudo   (rewrites ui/src/locales/en-XA.json from en.json)
// tests/unit/i18nKeys.test.js calls checkI18n() so the same rules run in npm test.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSrc = path.join(root, "ui", "src");
const defaultLocales = path.join(defaultSrc, "locales");

const PLACEHOLDER = /\{(\w+)\}/g;

/** Every literal t("key") and tn("key") call under srcDir, skipping tests. A key built at runtime is not a literal and is not checked. */
function findKeyCalls(srcDir) {
	const calls = [];
	const walk = (dir) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (entry.name !== "__tests__") walk(full);
			} else if (/\.jsx?$/.test(entry.name)) {
				const source = fs.readFileSync(full, "utf8");
				for (const match of source.matchAll(/\b(tn?)\(\s*(["'])([^"'\n]+)\2/g)) {
					calls.push({ key: match[3], plural: match[1] === "tn", file: full });
				}
			}
		}
	};
	walk(srcDir);
	return calls;
}

function readWords(file) {
	return JSON.parse(fs.readFileSync(file, "utf8"));
}

function placeholdersOf(text) {
	return [...new Set([...String(text).matchAll(PLACEHOLDER)].map((m) => m[1]))].sort().join(",");
}

/**
 * Returns a list of problems (empty when all is well):
 * - a t("key") or tn("key") literal in srcDir that en.json does not define (tn needs key.one and key.other)
 * - a locale file with a key en.json lacks
 * - a locale file whose {var} set differs from English for the same key
 */
export function checkI18n({ srcDir = defaultSrc, localesDir = defaultLocales } = {}) {
	const problems = new Set();
	const en = readWords(path.join(localesDir, "en.json"));
	const rel = (file) => path.relative(root, file).split(path.sep).join("/");

	for (const { key, plural, file } of findKeyCalls(srcDir)) {
		const needed = plural ? [`${key}.one`, `${key}.other`] : [key];
		for (const name of needed) {
			if (!Object.hasOwn(en, name)) problems.add(`${rel(file)}: "${name}" is not in en.json`);
		}
	}

	for (const name of fs.readdirSync(localesDir).filter((f) => f.endsWith(".json") && f !== "en.json")) {
		let words;
		try {
			words = readWords(path.join(localesDir, name));
		} catch (err) {
			problems.add(`${name}: not valid JSON (${err.message})`);
			continue;
		}
		for (const [key, text] of Object.entries(words)) {
			if (!Object.hasOwn(en, key)) {
				problems.add(`${name}: "${key}" is not in en.json`);
			} else if (placeholdersOf(text) !== placeholdersOf(en[key])) {
				problems.add(`${name}: "${key}" has placeholders {${placeholdersOf(text)}}, English has {${placeholdersOf(en[key])}}`);
			}
		}
	}

	return [...problems];
}

/**
 * The pseudo-language: each text wrapped in ⟦ ⟧, vowels doubled so it runs longer than English the way translations often do,
 * and {placeholders} left exactly as they are.
 */
export function pseudoLocalize(text) {
	const body = String(text)
		.split(/(\{\w+\})/)
		.map((part) => (/^\{\w+\}$/.test(part) ? part : part.replace(/[aeiou]/gi, "$&$&")))
		.join("");
	return `⟦${body}⟧`;
}

/** Builds the pseudo-language's words from English. Returns the object; writing it is up to the caller. */
export function buildPseudoWords(en) {
	return Object.fromEntries(Object.entries(en).map(([key, text]) => [key, typeof text === "string" ? pseudoLocalize(text) : text]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	if (process.argv.includes("--pseudo")) {
		const en = readWords(path.join(defaultLocales, "en.json"));
		fs.writeFileSync(path.join(defaultLocales, "en-XA.json"), `${JSON.stringify(buildPseudoWords(en), null, "\t")}\n`);
		console.log("Wrote ui/src/locales/en-XA.json");
	} else {
		const problems = checkI18n();
		if (problems.length) {
			console.error(`${problems.length} translation problem(s):\n${problems.map((p) => `  ${p}`).join("\n")}`);
			process.exit(1);
		}
		console.log("Translations check out: every literal key is in en.json and locale files match English.");
	}
}

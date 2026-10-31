// Merges new words into ui/src/locales/en.json (sorted, tab-indented) so several people can add keys without editing the same lines.
// Run: node scripts/i18n-add.mjs <file.json>      (the file holds {"key": "English text", ...})
// A key that already exists with different text is refused, so nobody silently overwrites another screen's words.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "ui", "src", "locales", "en.json");
const input = process.argv[2];
if (!input) {
	console.error("Usage: node scripts/i18n-add.mjs <file.json>");
	process.exit(1);
}
const add = JSON.parse(fs.readFileSync(input, "utf8"));
const en = JSON.parse(fs.readFileSync(target, "utf8"));
const clashes = Object.keys(add).filter((k) => Object.hasOwn(en, k) && en[k] !== add[k]);
if (clashes.length) {
	console.error(`Refused: these keys already exist with different text:\n${clashes.map((k) => `  ${k}`).join("\n")}`);
	process.exit(1);
}
Object.assign(en, add);
const sorted = Object.fromEntries(Object.entries(en).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
fs.writeFileSync(target, `${JSON.stringify(sorted, null, "\t")}\n`);
console.log(`Added ${Object.keys(add).length} key(s); en.json now has ${Object.keys(sorted).length}.`);

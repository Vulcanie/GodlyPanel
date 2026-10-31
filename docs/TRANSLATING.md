# Translating GodlyPanel

The panel's words live in `ui/src/locales/`, one JSON file per language. `en.json` is the source: every other language is checked against it.

## Add a language

1. Copy `ui/src/locales/en.json` to `ui/src/locales/<code>.json` (for example `fr.json`; use the browser's language code).
2. Translate every value. Keep the keys exactly as they are. Add `"_meta": { "reviewed": false }` as the first entry until a native speaker has read it through.
3. Register it in `ui/src/i18n/index.js`: one line in `LANGUAGES` (its name in its own language, with "(beta)" while it is unreviewed) and one in `LOADERS`.
4. Run `node scripts/i18n-check.mjs`. It lists any key that is missing or extra, and any translation whose `{placeholders}` or `<b>`, `<i>`, `<code>` marks differ from English. `npm test` runs the same check.
5. Open the panel, pick the language in **Settings > Appearance**, and look at the busiest pages: Dashboard, a server's Console and Backups.

## Rules for a translation

- Keep every `{name}` placeholder exactly as written; move it where your language needs it.
- Keep `<b>`, `<i>` and `<code>` marks around the matching words. They are the only markup the panel understands.
- Words ending in `.one` and `.other` are the singular and plural forms (`{count}` is the number). Add the extra forms your language needs (`.few`, `.many`, `.zero`, `.two`) next to them.
- Brand and product names (GodlyPanel, Discord, Steam) and anything inside `<code>` stay as they are.
- A key you leave out shows the English text, so a half-finished file never breaks a screen, but the check will list it.

## Check the layout

`node scripts/i18n-check.mjs --pseudo` rewrites `ui/src/locales/en-XA.json`, an English that is longer and wrapped in `⟦ ⟧`. Choose "Pseudo (test)" in the picker to see which screens clip long words.

## Not translated

Game catalogs, server messages that have no error code, permission and built-in role names, and some help pages are still English.

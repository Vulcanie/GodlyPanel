# STAGE B: EXTRACT (copy facts out of given pages into a fixed table)

You copy facts from pages that were already chosen for you. You do not use your own knowledge about the game: it is often wrong. Do NOT install or run anything. Write only the one file named in your task.

## Rules
1. Open every URL listed for your topic in `<game folder>\sources.md` (and no others unless a page links directly to its own sub-page with the full list). If a page is blocked (HTTP 402/403), try an archive.org copy or an r.jina.ai mirror; if that fails too, read it with the browser: use ToolSearch with the query "playwright browser navigate evaluate" to load the browser tools, then browser_navigate to the URL and browser_evaluate with `() => document.body.innerText` (wait a few seconds first if the page shows a bot check) and copy the text out. Close the browser when you are done. Save a plain-text copy of each page you used into `<game folder>\raw\` (one file per page).
2. Only write what a page says. Next to every row put the URL of the page it came from. If two pages disagree, write both values and the two URLs, do not pick.
3. If something in your list below is not on any page, write `NOT FOUND` for it. Never fill a gap from memory, never write "typically" or "usually".
4. Copy names, spelling, capitalisation, numbers and units exactly as the page has them. Quote default values exactly. Descriptions: copy the page's own words, shortened to one or two plain sentences; do not add detail.
5. Create your output file within your first few tool calls (even if only partly filled), then keep filling it in. Finish with an `## NOT FOUND / UNSURE` list.

## Output schemas (use the one for your topic)
BASICS: a list of short "Label: value (url)" lines for: Steam app id; anonymous login works?; install size; server exe name(s) and which stays running; every port with protocol and default; minimal start command; where config files live; where saves live; how to stop it; query/RCON options; RAM/CPU needs; first-run behaviour; anything a panel must not do.
CONFIG: one table per config file: `key | type | default | allowed values | description (page's words) | url`, plus a line for file name, location, format, and whether the game creates it. List every key the page lists, in the page's order.
LAUNCH: one table: `argument exactly as written | takes a value? | default | allowed values | description (page's words) | url`.
MODS: Label: value (url) lines for: does the dedicated server support mods; how mods are added (workshop ids, files in a folder, a config line, a launch argument); folder paths; config or file names involved; do clients need the same mods; loader/framework needed; 5 most popular mods or frameworks named on the pages (with ids if shown).

Final message: max 60 words: how many rows you wrote and how many items are NOT FOUND.

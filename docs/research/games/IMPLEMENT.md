# IMPLEMENTATION BRIEF (build one game from its research dossier)

You are an implementation agent for GodlyPanel (repo C:\GodlyPanel, Windows). Research for your game is in
`C:\GodlyPanel\docs\research\games\<slug>\`. Start with `00-overview.md` (frontmatter + quick facts + conflicts + gaps), then read `01-basics.md`,
`02-config.md`, `03-launch-args.md`, `04-mods.md` and `docs\research\games\CONVENTIONS.md` in full. Any conflict listed in the overview is unresolved: check the live source or use the most-evidenced value and note it.

## What you create (NEW FILES ONLY, you must not edit any existing file)
1. `src/server/data/games/<id>.js`, default export `{ template, backup, logs, launchOptions }`, described in `src/server/data/games/index.js`.
   - `template` has the same shape as the entries in `src/server/data/gameTemplates.js` (read the `corekeeper`, `sotf`, `vrising`,
     `satisfactory` entries and the `buildConfigFile`, `copyInstalledFiles`, `patchInstalledConfig`, `buildExtraFiles` hooks used by
     `src/server/services/serverCreationService.js`). `type` is the key the interface and logs use. `updateAppId` is the SteamCMD
     dedicated-server app id. `processName` in `buildServerEntry` MUST be the exe that stays running (per dossier; if unverified, pick
     the most evidenced one and say so in your notes). Pick free default ports that do not clash with the existing templates' defaults.
   - `backup`: `{ paths: [{ base: "working", rel, label, exclude? }] }` (see `src/server/data/backupTemplates.js`).
   - `logs`: array of `{ kind: "file"|"dir", base, rel, label }` (see `logTemplates.js`).
   - `launchOptions`: true if the start script's launch line should get the "Launch options" form (needs `launch` below).
2. `ui/src/catalog/games/<type>.js`, default export `{ type, title, files, launch, guide }` as described in
   `ui/src/catalog/games/index.js`. Use `rows`/`withChoices` from `../rows.js`, `A`/`FLAG` from `../launchHelpers.js`. Model on
   `ui/src/catalog/rust.js`, `zomboid.js`, `vrising.js`, `vrisingWorld.js`, `sevenDays.js` and the Core Keeper / Valheim launch definitions in
   `ui/src/catalog/launchArgs.js`. For `files`, parser names are: ini, properties, xml, json, valheimLaunch, palworld, convar (see
   `ui/src/configParsers/` and the entries in `ui/src/configCatalog.js` for `parser`, `excludeSections`, `sectionLabels`, `settings`,
   `groupOrder`, `mayBeMissing`; INI/section keys are written `"Section::Key"`, JSON nested keys `"a.b.c"`). If the game's format has no parser
   (Lua tables, Source `.cfg`, plain lines), do NOT write a parser: explain in notes, and offer only the launch-arguments form plus whatever
   file the existing parsers can handle.
3. Tests: `tests/unit/game-<id>.test.js` (node:test; import your server module directly and check the template: ports, start script text,
   entry fields, config file content, that ports in the script match the entry) and `ui/src/__tests__/game-<type>.test.js` (vitest; import your
   UI module: every setting has label + description > 10 chars + group, no repeated dropdown choices, every launch arg has label/description/
   group, flags unique). Use the rules in `ui/src/__tests__/catalogs.test.js`.
4. `docs\research\games\<slug>\05-implementation-notes.md` (in the repo, beside the dossier): what you built, every deviation from the dossier, everything you left out and
   why, what MUST be verified on a real install (list concrete checks), and any limitation of the panel for this game (e.g. no graceful stop).

## Rules
- Only facts from the dossier (which cite sources). Anything marked UNVERIFIED there is either left out of the catalog or, if essential to
  a working server, used in the most-evidenced form and listed in your notes under "needs real-install verification". Never invent keys,
  defaults, dropdown values or launch flags. A setting you cannot explain confidently stays out of the catalog (unexplained is allowed).
- Plain-language descriptions per CONVENTIONS.md. Each setting: key exactly as in the dossier, label, 1-2 sentence description, group, choices.
- The panel runs ONE process per server and stops it by asking the window to close, then force-killing after 15 s. Do not build new stop
  mechanisms. If the game needs something else for a clean save (stdin command, RCON), note it prominently; use `method: "rcon"` only if a
  real RCON exists and the dossier verifies the protocol the panel's `sendRconCommand` speaks (Source RCON over TCP).
- The panel's launch-line editor appends new arguments at the END of the line. If a game requires an argument to be last (Unturned's
  `+InternetServer/<ID>`), make everything that could be appended `edit: false` or keep that game's launch form off, and say so.
- Start scripts are `.bat`: `@echo off`, `cd /d "%~dp0"`, then `start /MIN "<name>" <exe> <args>` (see corekeeper). Quote paths and values
  that can contain spaces, and never put an unescaped `%`, `&` or `"` from user input in the script (look at how other templates and
  `serviceCreation` validate inputs; the create flow already refuses line breaks).
- Passwords: never log them; put them where the dossier says the game reads them.
- Modded servers: follow the dossier's recommendation. If it recommends a field (e.g. a Workshop ID list for DST), implement it as a template
  field in the way the ARK `mods` field or Zomboid `Mods` setting works today (read `serverCreationService.js`); if it recommends nothing,
  add nothing.
- DO NOT edit existing files, do not register your module in index.js (the lead does that), do not run git commit, do not start/stop
  game servers, do not touch C:\GodlyPanelApp. You MAY run `node --test tests/unit/game-<id>.test.js` and `cd ui && npx vitest run
  src/__tests__/game-<type>.test.js` to check your own tests; they must pass. Write tests first when practical (RED, then GREEN).
- Final message (max 150 words): files created, test results, number of settings and launch arguments in the catalog, list of
  "needs real-install verification" items.

## Vault upkeep (lead, after the build)
In `<slug>/00-overview.md` change `status: researched-unverified` to `built-unverified` and add a line under "Panel fit" linking `[[05-implementation-notes]]`. In `INDEX.md` move the game from "Researched, not implemented" to "Already built into the panel". Add the game to the status table in `README.md` once it has been checked.

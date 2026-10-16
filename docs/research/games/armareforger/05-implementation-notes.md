# Arma Reforger: implementation notes

Built from the four dossier files plus the raw page copies in `raw\` (BI wiki Server Hosting / Server Config / Startup Parameters were read in full; the XGamingServer pages for what the wiki leaves open). Nothing was run on a real install.

## What was built (new files only)

- `src/server/data/games/armareforger.js` (template, backup, logs, launchOptions: true)
- `ui/src/catalog/games/armareforger.js` (one settings file, launch arguments, guide)
- `tests/unit/game-armareforger.test.js`, `ui/src/__tests__/game-armareforger.test.js`
- Not registered in either `index.js` (the lead does that).

### Template
- id/type `armareforger`, displayName "Arma Reforger", method `process`, `updateAppId` 1874900 (stable; experimental 1890870 not used), `storeAppId` 1874880, anonymous login (BI SteamCMD steps), `installLayoutRoot` "" (BI: "run ./ArmaReforgerServer in the installation directory").
- Start script `Start_ArmaReforger.bat`:
  `start /MIN "<name>" ArmaReforgerServer.exe -config ".\Configs\server-config.json" -profile "%~dp0profile" -maxFPS 60`
  - `-config`: BI and IONOS. `-maxFPS 60`: BI "heavily recommended ... 60..120 range", IONOS uses 60. The launch form lists `-maxFPS` with a 60/90/120 dropdown and a warning not to clear it (the panel cannot force-keep an editable argument).
  - `-profile "%~dp0profile"` is an addition to the minimal line. Reason: BI says the default profile is in Documents (`My Games/ArmaReforger/profile`) and that logs and add-ons go there, so a second Reforger server on one PC would share it; BI's Linux example and GameCP both pass `-profile`. An absolute path (`%~dp0`) was chosen over `.\profile` because no page says what a relative profile path is relative to on Windows.
- Ports: game UDP **2001** (BI, IONOS, GameCP, Unraid), Steam query UDP **17777** in the game but **17877** here, because 17777 is another template's default (Icarus). 2001/2002 clash with no existing default (checked against all 29 registered templates including Squad). The game's RCON port 19999 is not a template port (RCON is off, see below).
- First config `Configs\server-config.json` (file name is the panel's choice; the game reads whatever `-config` points at). Written from BI's template with the BI-documented defaults. `publicPort` = game port; `bindAddress`, `bindPort`, `publicAddress` left out (BI: "should generally be left out"); `a2s.address` "0.0.0.0" and `a2s.port` = query port; `game.name/password/passwordAdmin/admins/scenarioId/maxPlayers/visible/crossPlatform/gameProperties(+persistence)/mods:[]`; `operating.*` with the documented defaults. Booleans and numbers are real JSON types (GameCP's sed strips quotes from "true"/"false" in this file, so quoted values are unwanted).
- Create form fields: sessionName (server name, cut at 100 characters per BI), serverPassword, adminPassword (no spaces: BI), scenarioId (optional text). No mods field: the dossier recommends none; mods are the `game.mods` list.
- `processName`: `ArmaReforgerServer.exe` (dossier: which process stays running is NOT FOUND; this is the only exe named by every source).

## Deviations from the dossier

- **modID spelling.** BI wiki writes `modID`, XGamingServer writes `modId`. Keys are case-sensitive. The official wiki's `game.mods[].modID` is used wherever the panel names it (guide text); the panel writes no mod entries itself. Verify on a real install which spelling the server accepts.
- `game.modsRequiredByDefault`: BI's text shows no parent, XGamingServer puts it in `game`. Not written to the first file and not in the catalog.
- `a2s.address`: BI marks it "required" with no default; its blank template and XGamingServer's default both show `""` (BI's template also has `port: 0`, so it is placeholders, not evidence). `"0.0.0.0"` was used because BI documents 0.0.0.0 as "any interface" for bindAddress. Alternative if the server refuses it: `""`.
- Default scenario `{ECC61978EDCC2B5A}Missions/23_Campaign.conf` is not in the BI text. It is the value XGamingServer's config reference (twice) and its mod guide show. It is used only when the create form's scenario field is blank, and the creation shows a warning saying so.
- `persistence` (autoSaveInterval, saveRetention, loadSessionSave, keepSessionSave, hiveId) is written in the first file with BI's defaults (marked 1.6.0 on the page). If the installed build does not know the block it would be a problem; verify.
- Nested objects follow BI's section headings: `persistence` and `missionHeader` live in `game.gameProperties` (both sources agree).

## Left out (and why)

Catalog (settings):
- `dedicatedServerId`, `region`: only on XGamingServer, not on the BI wiki.
- `game.modsRequiredByDefault`: parent conflict (above).
- `game.supportedPlatforms`, `game.admins`, `game.mods` and `game.mods[].*`, `rcon.blacklist`, `rcon.whitelist`, `operating.disableNavmeshStreaming`, `persistence.databases`, `persistence.storages`: lists/objects or a type that changed between versions (disableNavmeshStreaming is a bool before 1.2.0 and an array after). Per the brief they are left unexplained. The panel's JSON form shows an array as its raw JSON text, which can be edited; the existing structured-list editor only edits entries that already exist (it cannot add one) and breaks on a list of plain strings, so `structuredPaths` was not used. How to add a mod or an admin is in the guide notes instead.
- `missionHeader.*`: the full property list is in collapsed sections of the page that were not read; the examples give no meanings for hours, minutes and weather.
- Nothing is invented for `game.gameProperties.serverMaxViewDistance`: the BI page gives only the range; the explanation is XGamingServer's ("client max view distance").

Launch arguments (kept out; mostly NOT FOUND defaults or conflicts or client/diag-only):
- `-addons`, `-addonsDir`: comma vs space separator conflict, and whether they apply to a dedicated server is NOT FOUND. Mods go in the config.
- `-server`: makes the server ignore `-config` (BI), which would silently drop all panel-managed settings. `-world`, `-bindIP`, `-bindPort`, `-a2sIpAddress`, `-a2sPort`: they override config values and BI and XGamingServer name different config keys; two sources of truth for the ports.
- `-aiLimit`, `-aiPartialSim`: BI and XGamingServer contradict each other (zero/negative meaning; flag vs number). The config key `operating.aiLimit` is documented without conflict and is in the catalog.
- `-autoreload`, `-autoshutdown`, `-loadSessionSave`, `-keepSessionSave`, `-disableNavmeshStreaming`, `-backendLocalStorage`, `-backendDisableStorage`, `-noBackend`, `-enableNightGrain`: unclear effect for a hobbyist or an optional-value form the launch editor cannot show (it needs a value to show the setting).
- All rows the page marks "only works on diag exe", client/window/Workbench rows, `-cfg`, `-GPUAdapter`, `-language`, `-noSound`, `-noSplash`, debugger, shader, profiling and job-system rows, `-createDB`, `-logFS`, `-minidump`, `-VMErrorMode`.
- Duplicates of config keys: `-disableAI`, `-disableCrashReporter`.

## Panel limitations for this game

- **No graceful stop is known.** The panel closes the window, then force-kills after 15 s. No page says the server saves or exits cleanly on that. The game autosaves every `persistence.autoSaveInterval` minutes (default 10), so a forced stop can lose up to that much. Reforger's RCON is not Source RCON, so it cannot be used for a clean stop with the panel's existing mechanism.
- **The Ports tab cannot move this game's ports.** The ports are in the JSON file (`publicPort`, `a2s.port`), not on the launch line, and `serverPorts.js` has no binding for this type (it is an existing file, not edited). Changing a port there only changes the panel's record and warns. Change `publicPort` and `a2s.port` on the Settings tab too. Suggested lead follow-up: add a `CONFIG_BINDINGS.armareforger` entry with patterns for `"publicPort": <n>` (key `port`) and the `a2s` `"port"` (key `queryPort`).
- Players on Xbox/PlayStation cannot join a modded server (XGamingServer mod-setup and blog, partly inconsistent for Xbox). `game.crossPlatform` is in the catalog with that warning.
- `-maxFPS` can be cleared in the launch form; the description tells people not to.
- The BattlEye `BEServer_x64.cfg` is never touched (BI: only append to it, never edit).

## MUST be verified on a real install

1. `ArmaReforgerServer.exe` is the process that stays running, in the install root, after `app_update 1874900` (not a launcher that spawns another exe). Install size (NOT FOUND; no estimate is set).
2. The generated `Configs\server-config.json` is accepted as is: `a2s.address` `"0.0.0.0"`, the default scenario id, the `persistence` block, `crossPlatform`, and no `rcon`/`bindPort`/`publicAddress`. Check the first-start log for "Entered online game state" / "Game successfully created" (IONOS).
3. `-config ".\Configs\server-config.json"` (relative) and `-profile "%~dp0profile"` (absolute) are read as expected; check the profile folder fills.
4. Where inside `profile` the logs and the saves are (NOT FOUND in all sources); fix `logs` and `backup` (currently `profile` and `profile/logs`; backup excludes `logs` and `addons`). Whether logs are in per-start sub-folders (the panel's log list reads files directly in a folder only).
5. What closing the window does (clean exit? save?). What the actual save location is and whether a force-kill corrupts it.
6. The mod key spelling `modID` (BI) vs `modId` (XGamingServer), by starting with one mod entry; that mods download at start into the profile (`addons`) and that a failed download behaves as BI says for `required: false`.
7. The query port: A2S answers on `a2s.port` (a gamedig/A2S query on 17877).
8. Whether the game rewrites the settings file on start (NOT FOUND), as SCUM does.
9. Memory use with `-maxFPS 60` (no official minimum; BI Docker example 4 cores / 6 GB).
10. Whether `-profile`, `-logLevel`, `-logStats` etc. accept the forms the launch editor writes (`-flag value`).

## Counts
- Catalog: 40 settings in `server-config.json` (9 groups; one dropdown, `rcon.permission`), 26 launch arguments (one hidden from the form: `-config`).
- Tests: `node --test tests/unit/game-armareforger.test.js` 26 pass; `npx vitest run src/__tests__/game-armareforger.test.js` 19 pass.
- The first file's two lists (`game.mods`, `game.admins`) show on the Settings tab as editable raw JSON text under "More server settings (mods and admins)", with the "no explanation" chip; the guide notes say how to fill them.

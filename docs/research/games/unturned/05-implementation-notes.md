# Unturned: implementation notes (2026-10-14)

## What was built (new files only)
- `src/server/data/games/unturned.js` (id/type `unturned`, server app 1110390, store app 304930)
- `ui/src/catalog/games/unturned.js` (`launch: null`; two settings files)
- `tests/unit/game-unturned.test.js` (37 tests, pass), `ui/src/__tests__/game-unturned.test.js` (22 tests, pass)
- Not registered in either `index.js` (lead does that, one line each).

### Template
- `method: "process"`, `processName: "Unturned.exe"`, SteamCMD anonymous, install straight into the server folder (`installLayoutRoot: ""`).
- Start script `Start_Unturned.bat`:
  `@echo off` / `cd /d "%~dp0"` / `start /MIN "<title>" Unturned.exe -batchmode -nographics +InternetServer/<ID>`.
  `<ID>` = the server's slug (letters, digits, `-`, `_`; `singleplayer` renamed because the game rejects it) and is the LAST word, no trailing space. Title is stripped of `" % & | < > ^ !`. Nothing from the user (name, password, token, port) is on the command line.
- Ports: one field, `port` default 27315 (query port; the game's traffic uses port+1, both UDP, implicit port offset 1). 27015/27016 are Core Keeper / Sons of the Forest defaults here, 27115 is Rocket RCON's default, so 27315 was chosen.
- Create form fields: sessionName (5-50 chars enforced, the game's limit), serverPassword, `mapCode` (dropdown of the five maps in the official docs: PEI, Washington, Yukon, Russia, Germany), `gslt` (custom field, optional), `mods` (Workshop ids or links).
- `Servers\<ID>\Server\Commands.dat` (written before first start; the game reads it at start and it wins over command-line commands): `Name`, `Map`, `MaxPlayers` (default 8, 1-200), `Port`, `Mode Normal`, `Password` (if given), `GSLT` (if given).
- `Servers\<ID>\WorkshopDownloadConfig.json`: always written, with the game's own defaults from the dossier and `File_IDs` set (numbers). Written even when empty so it shows in the Settings tab.
- postWrite warnings: (1) path length: installDir + ID longer than 90 characters (the dossier's margin) gives the 260-character warning; (2) no GSLT given.
- The path-length warning is also in the `mods` field label and in a new `description` property of the template (inert today: `listTemplates` does not pass it on; the lead may want to show it).
- Backup: `Servers` with `exclude: ["*/Workshop/Steam"]` (the Workshop downloads, re-fetched from the list at start; bsdtar pattern checked with the Windows `tar`). Note Commands.dat in the backup holds the password and the GSLT in plain text.
- Logs: `Logs` folder of the install (`Server_<ID>.log`, `workshop_log.txt`, connection logs; seen in the real install).
- `launchOptions: false`.

### Settings catalog
- `Commands.dat`, parser `convar` (the existing Rust `server.cfg` reader: `Name value` per line, `//` comments, single-line edits): 8 settings: Mode (Easy/Normal/Hard), Map (5 maps + custom), MaxPlayers, Queue_Size, Perspective (First/Third/Both/Vehicle), Timeout, Password, GSLT. `excludeKeys`: Name, Port, Cheats, PvE, Owner, Welcome, Bind.
- `WorkshopDownloadConfig.json`, parser `json`: 9 settings (all keys the game writes; `File_IDs` shows as editable JSON list text).
- Launch arguments: 0 (no form). Total settings: 17.

## Parser decision
- `Config.txt` (gameplay rules): the format is `Version 1`, then `Browser { ... }`, `Server { ... }`, ... blocks with tab-indented `Key` / `Key value` lines and `// >` comments. The same key names (Spawn_Chance, Respawn_Time, Decay_Time...) repeat in several blocks. The convar reader keys entries by name only (last wins, no nesting), ini/properties need `=`, json/xml do not apply. NO parser exists, so Config.txt is not offered and no parser was written. The 282 documented keys of 02-config.md are therefore not in the catalog. Difficulty is offered instead (Mode in Commands.dat).
- `Commands.dat` with the convar reader: works for `Key value` lines, but the reader wraps a value containing a space in quotation marks when it writes. Quote handling in Commands.dat is not documented, so Name, Welcome (normally with spaces) are excluded; Map and Password carry a warning in the description. Bare-word commands (`Cheats`, `PvE`) would be written as `Cheats true`, not confirmed, so they are excluded; their lines in an existing file are hidden, not removed.

## Deviations from the dossier
- Method `process`, not `gamedig` (dossier recommended gamedig with process fallback): which port answers A2S is unresolved (docs/source say Port; GameDig/Docker README say Port+1) and a wrong choice would show a running server as offline. No player counts.
- No launch form (dossier gives a long argument table; the panel's editor appends at the end of the line and the ID must be last). Not in the panel: `-NoDefaultLog`, `-GameplayConfigFile`, `-LogGameplayConfig`, `-UseLegacyJsonGameplayConfig`, `-LegacyConsole`, `-NoWin32Console` etc. Config.json is not used.
- `Port` is written into Commands.dat, not as `-Port` on the line (the dossier's real-install log shows `-Port/27999` was NOT matched; Commands.dat is the documented route).
- Map names: only the five in the official docs are offered. Other maps shipped in `Maps\` (Alpha Valley, Destruction, Monolith, Paintball_Arena_0) exist but "Alpha Valley" has a space; reachable by typing in the Settings tab (custom value). Curated Workshop maps are not in the create dropdown: only Hawaii's level name is verified, so the user adds the Workshop id to `mods` and sets `Map` in the Settings tab afterwards.
- Left out of the mods work (cannot be done by new files / dossier says later step): Rocket (copy `Extras\Rocket.Unturned` to `Modules\Rocket.Unturned`, adds a 30-minute autosave which would fix the no-autosave problem; its `Rocket.Unturned.config.xml` has a 7-day account-age kick), OpenMod (not recommended for v1), per-curated-map pick list. Mod IDs given at creation are written by the template; later changes through the Settings tab file.
- Default `Perspective`, `Queue_Size` not stated (dossier has conflicting defaults).

## Limitations of the panel for this game
- STOP / SAVE: vanilla Unturned has no autosave. It saves on the `Shutdown` console command and (per its source, not verified live) on Ctrl+C / Ctrl+Break / closing its console window. The panel closes the window and force-kills after 15 s. If closing the window does not trigger `Provider.shutdown()` fast enough (Windows gives a console close handler only a few seconds), the world since the last save is lost. No stdin path exists in the panel (piped stdin may not work with the game's threaded console).
- Workshop updates make the server shut itself down after a 10-minute countdown (`Should_Monitor_Updates`); it looks like a crash unless the panel restarts it on exit. Scheduled/update shutdown are in Config.txt (not editable here).
- Port changes in the panel's Ports section will not rewrite the `Port` line of Commands.dat. Suggested one-line addition by the lead to `CONFIG_BINDINGS` in `src/server/services/serverPorts.js`: `unturned: [{ key: "port", file: "Commands.dat", pattern: /^(Port\s+)(\d+)/m }]` (check the `file` semantics: Commands.dat is the recorded config file, so `file` may be unnecessary).
- Server name/Cheats/PvE/Owner can only be changed by editing Commands.dat by hand (no raw file editor assumed).
- `Unturned.exe` is also the player's game client (UNVERIFIED); the panel must match by the path it runs from, not by name alone (it already does for process lookups; killing by image name would be wrong).

## MUST be verified on a real install
1. The create flow end to end: SteamCMD `+force_install_dir` + anonymous `app_update 1110390 validate`, `Unturned.exe` present in the root, and the generated `Servers\<ID>\` after first start has `Config.txt` while the pre-written `Server\Commands.dat` is kept as is.
2. That `start /MIN "<title>" Unturned.exe ... +InternetServer/<ID>` keeps `Unturned.exe` as the running process (no helper process), and that the ID really ends at the end of the line from a `.bat` (CRLF/trailing characters not leaking into the ID). Check the folder created is exactly `Servers\<slug>`.
3. `Commands.dat` lines are all accepted: `Name`, `Map`, `MaxPlayers`, `Port`, `Mode Normal`, `Password`, `GSLT`; the log shows no `Unknown entry in Commands.dat`; the bound ports are `Port` and `Port+1` (the dossier's probe: 27015 gave 27016); a `//` comment line at the top is ignored.
4. STOP behaviour: stop from the panel, start again, confirm the world and player progress are kept (is closing the console window a graceful save?). If not, plan the Rocket autosave or a stdin/console approach.
5. Whether a server name of 5-50 characters with spaces and punctuation round-trips from `Name`, and whether the game accepts a Password with spaces (and quotes written by the settings form).
6. GSLT: `GSLT <token>` in Commands.dat is accepted and the log no longer says "Not using login token"; behaviour without a token (joining by Server Code).
7. `WorkshopDownloadConfig.json` pre-written by the panel (pretty-printed, numbers): the game accepts it, downloads the items, and does not complain about the file; test with Hawaii (1753134636) and `Map Hawaii`.
8. Convar reader on a real Commands.dat the game touched: BOM or line endings (the game's Config.txt has a byte-order mark; Commands.dat was `Map PEI` only in the real install).
9. Path-length warning threshold (90): the postWrite warning appears and the log shows no `Could not find a part of the path` for an install at that length with Hawaii.
10. Backup exclusion `*/Workshop/Steam` on a real server with a Workshop map, and a restore: the server downloads the items again at start.
11. Process lookup when the player's own Unturned (Steam client) is also running on the same PC.
12. Which port answers A2S (for a possible later switch to `gamedig`).
13. `description` property and the `gslt` field label render on the create form (custom field type text).

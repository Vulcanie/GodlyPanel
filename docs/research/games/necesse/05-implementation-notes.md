# Necesse - implementation notes

Files created (no existing file edited, nothing registered in index.js, nothing run or started):
- `C:\GodlyPanel\src\server\data\games\necesse.js` (template, backup, logs, launchOptions: true)
- `C:\GodlyPanel\ui\src\catalog\games\necesse.js` (type, title, files: {}, launch, guide)
- `C:\GodlyPanel\tests\unit\game-necesse.test.js` (node:test, 26 tests, pass)
- `C:\GodlyPanel\ui\src\__tests__\game-necesse.test.js` (vitest, 15 tests, pass)

The lead must add `necesse` to `GAME_MODULES` (src/server/data/games/index.js) and `GAME_UI_MODULES` (ui/src/catalog/games/index.js). After that, run `ui/src/__tests__/catalogs.test.js` (it covers every registered type) and the GAME_TEMPLATES port-clash test of the other game tests.

## What was built
- Template `necesse`, method `process`, app 1169370 (store 1169040), `installLayoutRoot: ""`, estimated install 400 MB.
- Fields: `sessionName` (relabelled "World name"; sanitized to `[A-Za-z0-9 _.-]`, 40 chars, because it is the `-world` value and the save's file name) and `serverPassword`. Password is refused (not silently changed) if it contains a quote, `%`, `& | < > ^ !`, a backslash, control characters or non-ASCII (cmd code page / Java argv quoting).
- Port: one, `port`, UDP, default **14159** (the game's own default). Checked against all existing templates' defaults (list printed from GAME_TEMPLATES): neither 14159 nor 14160 is used.
- Start script (CRLF .bat): `cd /d "%~dp0"` then
  `start /MIN "<name>" "jre\bin\java.exe" -jar Server.jar -nogui -localdir -mod .\mods -world "<world>" -port <n> -slots <n> [-password "<pw>"]`.
  java.exe (not javaw.exe, not the shipped StartServer*.bat, which `start`s a second window). `-password` omitted when empty. Nothing needs to be last, so the Launch options form may append.
- Entry: `processName: "java.exe"`. Process tracking is by path: `classify()` in serverProcesses.js only treats java.exe running from inside installDir/workingDir as this server's; Stop (`gracefulThenForceKill`) only closes those PIDs, never by image name; a foreign java.exe yields "left alone". The bundled `jre\bin\java.exe` is inside the install folder, so this works (unit-tested with sibling-folder and system-JDK paths). Status polling (`pollProcess`) is also path-filtered.
- Entry sets `windowMode: "minimized"` (deviation, see below).
- `buildExtraFiles`: `mods\Put mod jar files here.txt`, only to make the mods folder `-mod .\mods` points at.
- `postWrite` warnings: no clean stop; no owner set; mods are hand-copied jars.
- Backup (base working): `saves`, `cfg`, `mods`. Logs: dir `logs`.
- UI catalog: `files: {}` (no settings tab file), 16 launch arguments (10 editable, 6 `edit:false`: -nogui, -localdir, -mod, -logs, -datadir, -settings), 0 file settings. Guide with 6 notes.

## Deviations from the dossier
- **No server.cfg form and no buildConfigFile.** `server.cfg` is `SERVER = { key = value, // comment }` (braces, trailing commas, `//` comments, bare or quoted words, empty `MOTD =`). Checked ui/src/configParsers/properties.js (lineKV key=value, no sections) and convarCfg.js: neither parses that shape, so a form would show wrong values and write the file back damaged. Everything the panel needs (world, port, slots, password) is a launch argument, which wins over server.cfg. The server writes server.cfg with its defaults itself and rewrites it on stop.
- **`worldSettings.cfg` not touched** (zipped inside the save). Difficulty/death penalty/raids/hunger are described in the guide as changed in game by `/difficulty`, `/deathpenalty`, `/raids`, `/settings`, or by unzip-edit-rezip with the server stopped.
- **`-localdir`** chosen over `-datadir .\data` (wiki's mod recipe uses -datadir). Reason: the Pelican egg and the Docker image start it with -localdir and place `cfg/server.cfg` and `saves/` at the server root; with -datadir the layout under `data\` is not shown by any source.
- **`windowMode: "minimized"`** on the entry (default would be "hidden", and "windowless" is selectable): (a) the owner must be able to reach the console to type `quit`; (b) `serverWindows.processSpec` drops path roots for java.exe, so hiding would match any Java window on the PC; (c) in windowless mode the panel starts the program with stdin ignored (EOF), which a console-reading Java server may not tolerate (unverified).
- **No memory field / -Xmx.** The dossier's -Xmx2G comes from an unofficial blog; the form's generic memory field defaults to 6 GB; the launch-line editor cannot place options before `-jar`. JVM defaults apply (max heap = 1/4 of RAM).
- **No owner field.** `-owner` is a player name; the `adminPassword` field would default to a random string. Added via Launch options, and the creation warning says so.
- **No mods tab / Workshop IDs field.** Describing only: the dossier recommends a Mods tab (upload/delete jars in `mods`, warn that players need identical mods, stop required first). That needs routes and UI in existing files. Workshop download by SteamCMD (`+workshop_download_item 1169040 <id>`) is not built (anonymous login for it is untested).

## Left out of the catalog (cannot be explained with confidence)
- `-giveclientspower` (help: "check client actions, a kind of anti-cheat ... defaults off"; server.cfg: "clients will have much more power over what hits them", default true; Docker image default 1), `-zipsaves` (server.cfg comment says true = uncompressed, wiki says 1 compresses), `-language` (accepted values unknown), `-help`.
- server.cfg keys `unloadLevelsCooldown`, `worldBorderSize` (unit unknown), `jobSearchRange` (one-line egg comment only) and the world settings `allowOutsideCharacters`, `creativeMode`, `disableMobAI`, `canSettlersDie` (one host source, defaults unknown). A few server.cfg keys are mentioned in the guide in plain words only (`maxClientLatencySeconds`, `worldBorderSize`, `droppedItemsLifeMinutes`, `MOTD`).

## Panel limitation: NO GRACEFUL STOP (prominent)
The server saves on the console command `quit` (also /stop, /exit) and does not save on SIGTERM. The panel has no stdin channel and no RCON for it. `stopServer` does `taskkill /PID` (no /F) and then `/F /T` after the fixed 15 s grace (`stopGraceMs` only special-cases satisfactory and scum; a change there is an existing-file edit and was not made). A Java console process has no window to receive the close request, so in practice Stop is a force-kill after 15 s; the world keeps only what the server saved earlier. Mitigations built: window kept minimized (not hidden); the template description, creation warning and guide notes all tell the owner to open the window, type `quit`, wait for it to close, and only then Stop/update/restart. Same applies to scheduled restarts and auto-updates (they will force-kill). Suggested follow-up for the lead (existing files): a per-type stop hook that writes `quit` to the process stdin, or a larger grace for `necesse`.

## MUST be verified on a real install
1. `+login anonymous` installs app 1169370; folder has `Server.jar` and `jre\bin\java.exe` in the root; the running process is the bundled `jre\bin\java.exe` (not a second launcher) and the panel shows it online and Stop finds it as "owned".
2. `-nogui -localdir -mod .\mods -world "X" -port -slots` asks no question on a brand-new world (the "custom options" prompt is the doubt), and `-mod` is accepted by Server.jar.
3. Where `-localdir` puts `cfg\server.cfg`, `saves\` (or `saves\worlds\`) and `logs\` (working directory vs Server.jar folder), so backup/log paths match; whether server.cfg is created on first run.
4. A `mods` folder holding only a .txt file is fine; real .jar mods in it load; the `mods` default is `<localdir>\mods` even without `-mod`.
5. What Stop does to the world (does closing/killing java lose data; any autosave interval), and whether typing `quit` in the minimized window saves and exits cleanly.
6. Whether the server survives with stdin ignored (windowless mode) - if not, hide that mode for this game.
7. Whether `-password ""`-less start gives an open server (server.cfg password empty by default), and the port is UDP only (IONOS says TCP+UDP too); Windows Firewall prompt for the bundled java.exe; the panel's firewall rule covers UDP.
8. `-slots` range enforcement, `-world` accepted characters and length (the panel keeps to `[A-Za-z0-9 _.-]`, 40).
9. `-pausewhenempty` default when absent from the line (help says 0, server.cfg default true).
10. Launch editor on a real line: `-motd` with `\n`, quoted world name with spaces, appended `-owner`.

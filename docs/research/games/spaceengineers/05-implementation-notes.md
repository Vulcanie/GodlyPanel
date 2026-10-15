# Space Engineers: implementation notes

Built 2026-10-15 from 01..04 of this folder. Not run on a real install. Plain dedicated server only; the Torch wrapper is out of scope for v1.

## Files created
- `src/server/data/games/spaceengineers.js` (template, backup, logs, launchOptions: true)
- `ui/src/catalog/games/spaceengineers.js` (type `spaceengineers`; `files: {}`, `launch`, `guide`)
- `tests/unit/game-spaceengineers.test.js` (18 tests, pass), `ui/src/__tests__/game-spaceengineers.test.js` (14 tests, pass)
- Not registered in either `index.js` (the lead does that): add `spaceengineers` to `GAME_MODULES` and `GAME_UI_MODULES`.

## What it does
- SteamCMD app 298740 (anonymous), store 244850, `method: "process"`, `installLayoutRoot: ""`, `fields: []`.
- Start script: `cd /d "%~dp0DedicatedServer64"` then `start /MIN "<name>" SpaceEngineersDedicated.exe -console -path "%~dp0Data" -port <port>` plus `-maxPlayers <2-64>` only when the create form gave a number.
- `processName`: `SpaceEngineersDedicated.exe` (dossier 01: the process in the taskkill lines of Keen's page and the wiki, a single process).
- One panel port: game port UDP, default 27116 (game's own 27016 is Sons of the Forest's query port here). 27117 is free.
- `buildExtraFiles` writes `Data\ABOUT-THIS-FOLDER.md` only to make the `Data` folder (the game quits silently if `-path` does not exist). `.md` so the Logs tab (which lists `.log`/`.txt` in a dir) does not show it.
- Backup: `Data/Saves`, `Data/SpaceEngineers-Dedicated.cfg`. Logs: dir `Data`, dir `DedicatedServer64/logs` (missing dirs are skipped).
- Settings tab: Launch options only. 11 launch arguments in the catalog (4 editable in the form: `-port`, `-maxPlayers`, `-ip`, `-ignorelastsession`; `-console`, `-path`, `-noconsole`, `-session:`, `-plugin`, `-eos`, `-np` explained, `edit: false`). 0 settings (no settings file).

## Deviations from the dossier / decisions
1. **No config file and no world are written.** Brief: write a first `SpaceEngineers-Dedicated.cfg` only if the dossier has a verified minimal one. It has not: 02-config says the first-start sequence is UNVERIFIED end to end. Checking Keen's 2022 source (`raw/MySandboxGame.cs`) shows more: with no `LoadWorld` the server starts a new world only if `PremadeCheckpointPath` points at an existing premade world folder, otherwise it logs "Cannot start new world - Premade world not found" and idles; and an unset `SessionSettings` takes class defaults with `OnlineMode = PRIVATE`. Whether the 2026 build still behaves so (one hosting guide says it makes a random world by itself) is unknown. A minimal cfg with only name/ports would therefore be unverified at best and could leave a server nobody can join.
   Consequence: a server created by the panel starts the exe but has no config, no world, no server name. The user must supply `Data\SpaceEngineers-Dedicated.cfg` and a world in `Data\Saves\<name>` (cfg `LoadWorld` = full path). The guide says this first in its notes.
2. **No XML parser.** The cfg and `Sandbox_config.sbc` are plain-child-element XML (`<MaxPlayers>8</MaxPlayers>`); `xmlProperties.js` only handles `<property name= value=>`, no other parser fits. None written, per brief. So `files: {}` and `entry.configPath(s)` are absent (a game with no editable file; history then covers the launch options). The ~200 settings in 02-config.md are not in the catalog.
3. `sessionName`/`serverPassword` fields not offered: ServerName is a cfg element (not settable by argument), the password is a salted hash by an undocumented method (dossier 02).
4. No `queryPort`: the Steam port (`SteamPort`, 8766) has no launch argument and is only in the cfg. It clashes with Sons of the Forest's default game port (8766) if both run on one PC; noted in the guide. It is not a managed panel port, so the firewall helper does not open it.
5. `-ignorelastsession` is NOT on the generated line (dossier suggests it for first creation). With no `LoadWorld` in a cfg, it could mean a new world on every start. It is offered in the form with that warning.
6. `-maxPlayers` is clamped to 2..64 (the Dedicated Server window's range, 02-config); omitted when not asked for so the world's own limit applies.
7. `-session:` is explained, not editable (wiki only, absent from 2022 source, quoting unknown). `-noconsole` explained, not editable (no window to close, so Stop may not save). `-selectInstance`, `-checkAlive`, `-start` (no description anywhere), `-report` (crash helper) left out.
8. Launch regex `\bSpaceEngineersDedicated`: run from `DedicatedServer64` (the cwd choice is mine: the Pterodactyl egg runs it from a parent folder, double-click runs it from its own folder; either is evidenced).
9. No mods field (dossier 04: mods are a `<Mods>` list in the world's `Sandbox_config.sbc`, authoritative file unestablished; no recommendation to add one).

## Limitations of the panel for this game
- No RCON/console command: Stop = close the console window, then force-kill after 15 s. Keen documents that a normal close saves ("taskkill /IM" without /f) and its source handles CTRL_CLOSE; a force-kill loses unsaved progress. Autosave default is 5 minutes (`AutoSaveInMinutes`).
- The game's own Maintenance features (auto restart/update) are not touched.
- Settings that live in the cfg or the world (name, admins, bans, password hash, rules, mods) are hand-edited, with the server stopped (the game rewrites them on shutdown).

## Needs real-install verification
1. SteamCMD anonymous install of 298740 lands `DedicatedServer64\SpaceEngineersDedicated.exe` directly in the install folder (no `steamapps\common`).
2. `-console -path "<full path>" -port N` starts a server with no setup window; `-path` really accepts the quoted `%~dp0Data` path.
3. What a first start does with a `Data` folder holding only the ABOUT note: does it create a default cfg/world, idle, or exit? (dossier items 9/11 of 01.) This decides whether a cfg/world template can be added later.
4. A cfg + world copied into `Data` (with `LoadWorld` as a full path) loads and is joinable; the minimal cfg elements (`ServerName`, `WorldName`, `IP`, `ServerPort`, `SteamPort`, plus `PremadeCheckpointPath` or `LoadWorld`) suffice; `OnlineMode` in the world is PUBLIC or the server is not listed.
5. `-port` on the line overrides cfg `ServerPort`; `-maxPlayers` overrides the world's limit.
6. Stop: closing the console window saves the world and exits within 15 s (stop, start, check the latest changes are present). Same for `-noconsole` (why it is not offered).
7. Which process stays running: only `SpaceEngineersDedicated.exe`, no launcher child; whether a 32-bit `DedicatedServer\` folder ships.
8. Data location: logs really are in `Data` (file names unknown), world backups in `Data\Saves\<world>\Backup`; `DedicatedServer64\logs\workshop_log.txt` exists.
9. UDP 27116 (game) and 8766 (Steam port) are the only ports needed; the protocol of the Steam port; whether the A2S query answers (not used by the panel: the server is watched by its process).
10. Windows Firewall prompt/rule for `SpaceEngineersDedicated.exe`; the firewall helper guesses the program path as `<install>\SpaceEngineersDedicated.exe` unless a running copy is found.
11. Workshop mod downloads on a SteamCMD install: copying `steamclient64.dll`, `tier0_s64.dll`, `vstdlib_s64.dll` into `DedicatedServer64` may be needed (dossier 01/04); not done by the panel.

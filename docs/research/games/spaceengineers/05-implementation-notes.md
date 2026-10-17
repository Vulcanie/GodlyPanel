# Space Engineers: implementation notes

Built 2026-10-15 from 01..04 of this folder; **revised 2026-10-17 after a real install** (evidence: `06-verification.md`, build 01_210_014). Plain dedicated server only; the Torch wrapper is out of scope for v1.

Status: registered in both `index.js` files for the verification run (`GAME_MODULES`, `GAME_UI_MODULES`; keep them). A server created from the template now starts a world the game reports ready for players (`Game ready...`, answers Steam A2S with its name, world and player limit). A real client join is the one thing not tried.

## Files
- `src/server/data/games/spaceengineers.js` (template, backup, logs, launchOptions: true; named exports `serverName`, `worldFolderName`)
- `ui/src/catalog/games/spaceengineers.js` (type `spaceengineers`; `files: {}`, `launch` with 11 arguments, `guide`)
- `tests/unit/game-spaceengineers.test.js` (25 tests; the one that reads a real `.bat` with Windows paths is `{ skip: !onWindows }`), `ui/src/__tests__/game-spaceengineers.test.js` (15 tests)

## What it does now
- SteamCMD app 298740 (anonymous), store 244850, `method: "process"`, `installLayoutRoot: ""`, `fields: ["sessionName"]` (the create form's server name).
- Start script: `cd /d "%~dp0DedicatedServer64"`, then `start /MIN "<name>" SpaceEngineersDedicated.exe -console -path "%~dp0Data" -port <port>`. No `-maxPlayers` any more (the cfg carries it). No `RunAsInvoker` line: the manifest is `asInvoker`.
- `buildConfigFile` writes `Data\SpaceEngineers-Dedicated.cfg` (which also makes the `Data` folder the game needs): `SessionSettings{OnlineMode PUBLIC, MaxPlayers 8 or the form's 2..64}`, `ServerName` (from `sessionName`, XML-escaped, control characters stripped, 100 characters), `WorldName` (the same, without `\ / : * ? " < > |`, trailing dots/spaces, Windows reserved names; 60 characters), `PremadeCheckpointPath` `..\Content\CustomWorlds\Star System`, `RemoteApiEnabled false`.
- No world file is copied: the game itself copies the premade world from its own `Content\CustomWorlds` into `Data\Saves\<WorldName>` on the first start, then resumes it (`Saves\LastSession.sbl`) on every later start. `buildExtraFiles`/`copyInstalledFiles` are not used. (`copyInstalledFiles` copies single files only, so it could not have copied a world folder anyway.)
- `processName`: `SpaceEngineersDedicated.exe` (confirmed). Entry carries `sessionName`.
- One panel port: game port UDP, default 27116. The game answers Steam A2S on it. SteamPort and the cfg's ServerPort are not used.
- Backup: `Data/Saves`, `Data/SpaceEngineers-Dedicated.cfg`. Logs: dir `Data` (the game log), dir `DedicatedServer64/logs` (Steam `.txt` logs).
- Settings tab: Launch options only (`-port`, `-maxPlayers`, `-ip`, `-ignorelastsession` editable; `-console`, `-path`, `-noconsole`, `-session:`, `-plugin`, `-eos`, `-np` explained, `edit: false`). 0 settings (no parser fits the cfg / `Sandbox_config.sbc`).

## Decisions and deviations
1. **Premade world = Star System** (planets; about 1.6 GB RAM). Empty World (about 0.6 GB) also works; it is one constant (`PREMADE_WORLD`) if a lighter default is wanted.
2. **Relative premade path** (`..\Content\...`, resolved from `DedicatedServer64`, where the script runs the game). An absolute path also worked. Relative survives moving the server folder, but it only matters on the very first start.
3. **OnlineMode PUBLIC**: unset, this build runs OFFLINE. Whether FRIENDS/PRIVATE would suit a hobbyist better is a product choice.
4. **MaxPlayers default 8** is mine (the game's class default is 4). It is only applied when the world is made; afterwards the world's own `Sandbox_config.sbc` wins, so the player limit cannot be changed by editing the cfg later, only there or with `-maxPlayers` on the line (tested: the line wins).
5. No `GameMode` written: the game's default is Creative. Add `<GameMode>Survival</GameMode>` to the `SessionSettings` block if survival is wanted by default.
6. No join password field (hash with salt, undocumented), no RCON (none), no mods field (list in cfg and `Sandbox_config.sbc`), no XML parser for the cfg or the world config (shape not handled by the panel's readers), so the 200 settings of 02-config.md are not in a catalog.
7. `-ignorelastsession` stays off the generated line and is offered with a warning (not tried: with the panel's cfg it probably makes a new world each start).
8. No Steam port note any more (not bound); the old Sons of the Forest clash note was dropped.

## Limitations of the panel for this game
- **STOP DOES NOT SAVE.** The panel's close request (taskkill without /F) does nothing to the game (its console window belongs to `conhost.exe`). After 15 s the panel force-kills, and the log never shows a shutdown or save. Only the game's autosave (5 minutes by default, `AutoSaveInMinutes`) and the save at world creation exist, so a Stop or a "stop"-mode backup can lose up to 5 minutes. A world ended this way loaded normally 3 times in a row. A graceful stop would need a new stop mechanism (a Ctrl+C / console-close sent to the right console, or the game's remote API with its key), which this task did not build.
- With the cfg missing the game starts, logs that it has no world and idles, and the panel still reports the server online.
- Settings that live in the cfg or the world (name, admins, bans, password hash, rules, mods) are hand-edited with the server stopped (the game rewrites the cfg at start and shutdown).

## Still unverified
1. A real client joining (Steam server list, version match, `PUBLIC` vs `OFFLINE`).
2. `LoadWorld` with a world from a client PC; `-ignorelastsession`; Workshop mods on a SteamCMD install.
3. Windows Firewall prompt/rule for `SpaceEngineersDedicated.exe` (the firewall helper guesses `<install>\SpaceEngineersDedicated.exe` unless a running copy is found; the real path is `DedicatedServer64\`).
4. Whether a graceful stop is possible at all from outside the console window.

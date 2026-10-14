# Local verification plan (Windows PC, real games)

This is the checklist for a session that runs **on a Windows PC with the games installed**. Everything here was written and
tested in a Linux sandbox with no games, no Windows and no internet: the code paths are covered by tests, but facts about
real games (which setting names exist, what values they take, what an argument does) and real Windows behaviour could only be
written from knowledge, not checked. This plan is how to check them.

Branch: `claude/festive-fermat-u2oua0` (pull it, or its merge into main).

How to work through it: take a section, do the steps, and where something is wrong **fix it in the repository** (the file to edit
is named in each step), then run the checks in "After any change" at the end. Record what you found in the results table in the
last section so nothing is lost between sessions.

---

## 0. Setup

```powershell
git fetch origin claude/festive-fermat-u2oua0
git checkout claude/festive-fermat-u2oua0
npm run setup            # panel + interface dependencies
npm run build:ui         # Vite build into ui/build
npm run dev              # the panel in Electron against ./data
```

Use a **scratch data folder and scratch servers folder** (Settings → Folders, or `GHP_DATA_DIR`), never your real community's data.

---

## 1. Baseline on Windows (do this first)

The Linux sandbox ran the unit and API suite through stand-ins for `tasklist`, `taskkill`, PowerShell, `cmd`, `robocopy` and `tar.exe`
(`tests/helpers/winshim`). On Windows the real tools are used, so these confirm the stand-ins behave like the real thing.

- [ ] `npm test` (unit + API, 4 files at a time). Expect 0 failures. Anything that fails here and passed on Linux is a stand-in
      that differs from real Windows: fix the product or the test, and say which in the results table.
- [ ] The tests that are **skipped on Linux** and only run here: `tests/api/applyUpdateScript.test.js`, two tests in
      `tests/api/secretsLocation.test.js` (attrib/icacls), one in `tests/api/backups.test.js` ("rolls back…"), the Windows-paths
      cases in `batchLaunch`, `folderCheck`, `lockDownDataDir`, `removalPlan`, `setup`, `readJson`. Confirm each ran and passed.
- [ ] `npm run test:desktop` (needs an interactive desktop; real windows, taskbar). Expect pass.
- [ ] Browser tests against the real Windows Chrome: `$env:GP_CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"`, build the UI,
      then run each suite: `node tests/ui/<name>.mjs` for appearance, community-join, community-view, create-address, create-every-game,
      create-ports, dismissals, navigation, panel-update, passwords, sections, session-box, shell, workspace.
- [ ] `cd ui; npm test` (interface unit tests: catalogs, parsers, launch arguments, help text and guides).
- [ ] `node scripts/build-guides.mjs --check` and `node scripts/check-doc-links.mjs` (guides are generated from the interface's help
      text; if you edit a catalog description or a help entry, run `npm run build:guides` and commit the docs).
- [ ] Push the branch (or open a PR) and confirm the new **GitHub Actions** workflow (`.github/workflows/test.yml`) actually runs:
      ubuntu shards, the Windows subset job, `ui-unit`, `ui-build` + browser tests on ubuntu. This workflow has never run on GitHub.
      Fix anything it flags (likely suspects: Chrome path / Playwright install step, the `scripts/test-files.mjs windows` selection,
      cache keys).

---

## 2. Mapping out the games (the main job)

Every game's settings catalog (`ui/src/catalog/*.js`, `ui/src/configCatalog.js`, dropdown choices in `ui/src/catalog/enums.js`) and
launch arguments (`ui/src/catalog/launchArgs.js`) were written from knowledge of the games, not from a real install. For each game:

### 2a. The procedure (same for every game)

1. In the panel, **create the server** from its template (real SteamCMD install) and **start it once** so the game writes its own
   settings file(s). Stop it.
2. Find the settings file(s): `src/server/data/gameTemplates.js` has each game's `configPath` / `configPaths` and start script.
3. Run the comparison tool against the real file:
   ```powershell
   cd ui
   node scripts/catalog-diff.mjs --list                                    # games and file names the catalog knows
   node scripts/catalog-diff.mjs --game 7days --file serverconfig.xml "D:\Servers\7dtd\serverconfig.xml"
   node scripts/catalog-diff.mjs --game rust --file server.cfg "D:\Servers\rust\server\server\cfg\server.cfg"
   node scripts/catalog-diff.mjs --game rust --launch "D:\Servers\rust\Start_Rust.bat"     # the launch line of a start script
   ```
   `--json` gives machine-readable output. It prints three lists:
   - **In the file but not explained**: add them to the catalog (or confirm they are mod/plugin settings, which are deliberately
     unexplained and covered by the "mods will not have explanations" notice).
   - **Explained by the catalog but not in the file**: either the key name is wrong (fix it), the game dropped it (remove it), or the
     game only writes it once changed (fine; note it).
   - **Values the dropdown doesn't offer**: the choices list is wrong or incomplete (fix `enums.js`, or mark the list `allowCustom`).
4. For each **description**, check it against the game's official documentation or in-game behaviour. Fix wording that is wrong or
   misleading. Keep descriptions plain-language for a hobbyist server host.
5. For each **dropdown**, confirm every listed value is accepted by the game and that the label says what it does.
6. For each **launch argument** marked editable in `launchArgs.js`, confirm the game accepts it in that form (flag spelling, `-a b`
   vs `-a=b` vs `+a b`, quoting) by putting it on the launch line through the panel's Launch options form, starting the server, and
   seeing the effect. Anything the game ignores or rejects: fix or remove it.
7. Edit the catalog files, then run the checks in "After any change".

### 2b. What is most likely wrong, per game (check these first)

| Game (`type`) | File(s) | Specific doubts to settle |
|---|---|---|
| **7 Days to Die** (`7days`) | `serverconfig.xml` | All ~90 keys in `sevenDays.js`. Especially: `HideCommandExecutionLog`, `StormFreq`, `EnemyDifficulty` (0/1), `BloodMoonWarning`, `TwitchServerPermission`, `ServerReservedSlots*`, `QuestProgressionDailyLimit`, `SaveDataLimit`, `DynamicMesh*`, `MaxQueuedMeshLayers`. Dropdown value meanings for `GameDifficulty` (0-5), `DeathPenalty`, `DropOnDeath`, `DropOnQuit`, `PlayerKillingMode`, `LandClaimDecayMode`, `CameraRestrictionMode`, `ZombieFeralSense`, `ZombieMove*`. Which keys exist in the **current game version** (settings change between alpha versions). |
| **Rust** (`rust`) | `server\<identity>\cfg\server.cfg`, launch line | Do these convars exist and take the values described: `decay.scale`, `decay.upkeep`, `server.stability`, `server.radiation`, `server.itemdespawn`, `craft.instant`, `fps.limit`, `server.headerimage`, `server.url`, `server.level` map names. Does `server.writecfg` create the file (the panel's "may be missing" note says so)? Does a value on the launch line really beat `server.cfg`? |
| **Project Zomboid** (`zomboid`) | `zomboid\Server\<name>.ini`, java launch line | The ~110 keys in `zomboid.js` against a freshly generated `servertest.ini` (the game writes the full file on first run, so this diff is the most informative one). Check the capitalisation of `SafeHouseRemovalTime`, the meaning of `MapRemotePlayerVisibility`, `PVPMeleeWhileHitReaction`, `SpeedLimit`, `DisplayUserName`. `-Xms/-Xmx` editing: confirm the java line the panel writes still starts the game after an edit. Sandbox rules (`*_SandboxVars.lua`) are not covered at all. |
| **V Rising** (`vrising`) | `save-data\Settings\ServerHostSettings.json` | Keys: `BindIpAddress`, `ServerFps`, `MaxConnectedAdmins`, `Secure`, `AutoSaveCount/Interval`, `CompressSaveFiles`, `API.Enabled`, `Rcon.*`. Dropdown values for `GameDifficultyPreset` / `GameSettingsPreset`. `ServerGameSettings.json` (the world rules) is **not** covered; consider adding it as a second file in `gameTemplates.js` + the catalog. |
| **Sons of the Forest** (`sotf`) | `userdata\dedicatedserver.cfg` (JSON) | Keys: `IdleDayCycleSpeed`, `IdleTargetFramerate`, `ActiveTargetFramerate`, `SaveInterval`, `TimestampLog*`; `GameMode` / `SaveMode` values. The nested `GameSettings` and `CustomGameModeSettings` objects are shown with no explanations: map and explain them. |
| **Valheim** (`valheim`) | launch line | `-modifier portals` values (`veryhard` is included but unconfirmed). Every `-modifier` / `-setkey` value. That `-public 0`/`1` and `-preset` behave as described. Whether more `-setkey` names exist (add them to `launchArgs.js` and `valheimLaunch.js`: `SETKEYS`). |
| **Core Keeper** (`corekeeper`) | launch line | `-worldmode` values, `-season`, `-gameid`, `-worldseed`, `-ip`, `-world` slot meaning. |
| **Satisfactory** (`satisfactory`) | launch line | `-ServerQueryPort`, `-BeaconPort`, `-multihome`. Settings made in the game's Server Manager are **not** in any file the panel edits: decide whether `FactoryGame\Saved\Config\WindowsServer\*.ini` should be added. |
| **Enshrouded** (`enshrouded`) | `enshrouded_server.json` | Dropdown values: `voiceChatMode`, `gameSettingsPreset`, `tombstoneMode`, `weatherFrequency`, `fishingDifficulty`, `curseModifier`, `randomSpawnerAmount`, `aggroPoolAmount`, `tamingStartleRepercussion` (all in `enums.js`, all `allowCustom`). Explain any key the real file has that the catalog lacks. |
| **Palworld** (`Palword`) | `PalWorldSettings.ini` | Dropdown values: `Difficulty` (None/Casual/Normal/Hard?), `DeathPenalty`, `LogFormatType`, `RandomizerType`. Keys added by newer game versions. Launch arguments (reference only in `launchArgs.js` under `palworld`). |
| **Minecraft** (`minecraft`) | `server.properties` | `level-type` values on the current Minecraft version (`minecraft:normal` form), `region-file-compression`, `op-permission-level` labels. Launch args reference (Java flags). |
| **Conan Exiles** (`conan`) | `ServerSettings.ini` | Dropdown values for `serverRegion`, `MaxNudity`, `ServerCommunity` (0-5). |
| **ARK** (`ark`) | `GameUserSettings.ini`, `Game.ini` | New keys the current ASA/ASE build writes. `Game.ini` repeated/override entries (engrams, spawn overrides) have no explanations. Launch-line reference only (`launchArgs.js` under `ark`): check `-WinLiveMaxPlayers`, `-NoBattlEye`, `-ClusterDirOverride`, `-NoTransferFromFiltering`, `-servergamelog`. |
| **Subsistence** (`subsistence`) | `UDKGame\Config\UDKDedServerSettings.ini` | **Has no documented settings at all** (empty catalog). Start it once, read the file, and write the catalog (`configCatalog.js`, `subsistence`; add `catalog/subsistence.js` in the style of `rust.js`). |
| **RuneScape: Dragonwilds** (`rune`) | `DedicatedServer.ini` | Only 4 settings are explained. Map the rest. |
| **Windrose** (`windrose`) | `ServerDescription.json` | Region values for `UserSelectedRegion` (could become a dropdown), the P2P/direct-connection settings' real meaning. |

For the games not in this table the catalog is either complete for what the panel manages or is launch-only; still run the
`--launch` comparison on each game's real start script (next section).

---

## 3. The launch-line editor against real start scripts

`ui/src/configParsers/launchArgs.js` (and `valheimLaunch.js`) rewrite **only the launch line** of a `.bat`. The unit tests cover the
scripts the panel itself writes. Check it against real-world and hand-edited scripts. Take each of these through the Launch options
form (change one value, save), then diff the file (`git diff --no-index`) and confirm only that one argument changed:

- [ ] A start script for **each of the 17 templates** as the panel creates it (should round-trip byte-for-byte with no edits).
- [ ] An **imported** hand-made script: a launch line wrapped over several lines with `^`, one with `call`, one with `&&` after the
      program, one inside an `if exist … (…)` block, one with redirection `> log.txt 2>&1`, a UTF-8 BOM, a path with spaces in the
      program path, quoted values containing spaces and `&`, `%VARIABLES%`, and one with two programs on the same line.
      Expected limitation to confirm or fix: a launch line continued on the next line with `^` is only parsed up to the line end.
- [ ] A script where the **same argument appears twice**, or in a different case (`-Port` vs `-port`).
- [ ] Launch options on a server the panel did **not** create (imported) for each game that has them.
- [ ] After saving, the game still starts with the edited line (not just parses). Do this at least for Rust, Zomboid (java memory),
      7 Days to Die (`-UserDataFolder` with a space), Valheim (modifiers) and V Rising.

Fix in `launchArgs.js` / the parsers, and add the real-world script as a test case in `ui/src/__tests__/launchArgs.test.js`.

---

## 4. Windows behaviour changed by this branch

The audit changed process handling and paths. Linux stand-ins cannot prove these on real Windows:

- [ ] **One process listing per poll** (`src/server/services/serverProcesses.js` `createSharedLister`, `pollingService.js`,
      `crashWatcher.js`): with 5+ servers running, measure the panel's CPU use (Task Manager / `Get-Process`) before (`main`) and after
      (this branch). Confirm online/offline and crash recovery still behave, including **stopping and starting a server quickly**
      (the 1.5 s cache must not report a just-started server as offline for long, or a just-stopped one as online).
- [ ] **Long program names** (`windowlessLauncher.js` `pidIsStill`, `processCheck.js` `sameImage`): start a server in "No window"
      mode for a game with a long exe name (Dragonwilds `RSDragonwildsServer-Win64-Shipping.exe`, Windrose, Satisfactory); confirm Stop
      reports a real graceful exit and the server isn't thought gone while it runs.
- [ ] **Backup paths with `%~dp0` and backslashes** (`backupService.js`, `cloneService.js`): back up, restore and **clone** a server
      whose start script uses `%~dp0` (7 Days, Sons of the Forest, Core Keeper, Zomboid). Confirm the clone is made in the right place.
- [ ] **Atomic config writes** (`util/managedFiles.js`): save a config while the game has it open (7 Days, Minecraft). Windows may
      refuse the rename; confirm the fallback to a direct write works and no `*.tmp` files are left.
- [ ] **Settings port change** in the Electron window (`electron/main/windows.cjs`): change the web port in Settings, restart, and
      confirm in-window links and reloads work and external links still open the browser.
- [ ] **Electron app**: tray, start-hidden, start-with-Windows, the new icon (`build/icon.png`) in the title bar, taskbar and
      installer, single-instance behaviour.
- [ ] **Packaging**: `npm run package` and unzip on a clean folder; first run works; the interface loads from the asar (Vite output
      uses `assets/` with hashed names, and the server now sends long-lived cache headers for them); `GHP_UI_DIR` is unset.
- [ ] **In-app update** (`docs/UPDATING.md`): `node scripts/make-update-payload.mjs` still includes the new `ui/build/assets/*`
      files, and an update from the previous release to this build works end to end (apply script, rollback).
- [ ] **Dependency changes**: the lock file was updated by `npm audit fix` (electron-builder 26.17, others). Confirm packaging works.

---

## 5. Interface checks that need real data

- [ ] **Game artwork**: with internet, confirm artwork loads on dashboard cards, the server header and the create-server game picker
      (`/api/art/<type>`), and that text over the artwork stays readable for every game's artwork (the cards use white text on a dark
      overlay: check bright artwork such as Minecraft and Palworld).
- [ ] **Retake the README screenshots** in `docs/screenshots/` (dashboard, first-run, create-server, server-page, settings) with a real
      community's servers; they still show the old interface. Names are referenced from `README.md`.
- [ ] **Phone pass**: open the panel from a real phone on the LAN and walk every server tab (Overview, Settings, Players, Backups,
      Schedules, Logs, Network, Mods, Activity, Automation, Advanced) and every Settings category in light and dark; note anything that
      overflows or can't be tapped.
- [ ] **Keyboard / accessibility**: tab order through the sidebar, command palette (Ctrl+K: arrows, Enter, Esc), (i) tooltips reachable
      with the keyboard, dialogs trap focus.
- [ ] **Moderator and viewer accounts** with real roles: a moderator limited to one server sees only that server in the sidebar, the
      palette, the dashboard and the live updates; cannot reach another server's page by URL/history; a viewer sees only the dashboard.
- [ ] **Settings page**: every category, change something in each, save, confirm the "restart needed" chips are right, and that
      secrets still save (Discord webhook/bot, SMTP, CurseForge, alert/audit webhooks).
- [ ] **Hover tips**: spot-check ~20 (i) tooltips; each link must open the right section of the matching guide on GitHub **once the
      branch is merged to main** (until then the links point at main and may 404 for new anchors).
- [ ] **Create server** for every one of the 17 games from the new game picker (the browser test `create-every-game.mjs` does this
      against stand-ins; do at least three for real).

---

## 6. Security re-verification with real conditions

- [ ] **Community view through a real Cloudflare Tunnel**: the listener now has a 300 s request timeout
      (`communityListener.js`). Confirm live updates (SSE) still stream for guests for longer than 5 minutes, and that signing in,
      joining with a code and the staff-sign-in switch work.
- [ ] **IPv6 visitors** to the community listener: per-address limits are keyed on the exact address (a /64 can rotate). Decide whether
      to key on the /64 (`communityListener.js`, `loginLimiter.js`).
- [ ] **Limited moderator**: confirm with a real second browser that activity/backup live events for other servers don't arrive
      (`tests/api/scopedAccess.test.js` covers it; this is the real-browser confirmation).
- [ ] **Backups**: `keepCount` of 0 is now refused/floored at 1; confirm the Backups tab and off-site destination form show a clear
      message, and that existing configs with 0 don't delete everything.
- [ ] **Damaged config recovery** (`util/atomicJson.js`): corrupt `users.json`/`servers.json` in a scratch data folder and confirm the
      panel recovers from the `.bak` and says so.

---

## 7. Known open items (not implemented; decide whether to do them)

0. **Added during the local run:** Project Zomboid asks the router (UPnP) to forward its ports when it starts (`UPnP=true` in its ini by default); the panel's template leaves it on. Decide whether new Zomboid servers should be created with `UPnP=false`. Also: Satisfactory's stop grace period (15 s) may be too short for a real world; V Rising `ServerGameSettings.json` and SotF nested `GameSettings` are still unmapped.

From the backend audit (`SECURITY.md` has the context):

1. A per-server lock around rotate-RCON-password, apply-preset, change-ports and the auto-update rollout (a start can slip in between
   their "is it stopped" check and their writes).
2. Windowless servers' cmd-redirected logs are only rotated at launch; a chatty server grows the file without limit.
3. IPv6: rate limits per exact address (see above).
4. Install/backup paths still appear in some moderator responses (backups overview, checklist, player lists).
5. `util/safePath.js` is lexical (no symlink/junction check); a realpath check needs an opt-out for deliberate junctions (shared saves).
6. Archives unpacked by tar (mods, Thunderstore, updates) have no uncompressed-size cap.
7. Games with no or partial settings coverage: Subsistence (none), Dragonwilds (4), Satisfactory in-game settings, V Rising
   `ServerGameSettings.json`, Zomboid sandbox rules, ARK `Game.ini` override sections.
8. Interface performance has had one pass only (code-splitting, memoised cards, shared polling); a profile on a PC with 20+ servers
   has not been done.

---

## After any change

```powershell
cd ui; npm test                       # catalogs, parsers, launch arguments, help text
cd ..; npm run build:guides           # regenerate docs/*.md from the help text and catalogs
node scripts/build-guides.mjs --check
npm test                              # unit + API
npm run build:ui; node tests/ui/navigation.mjs; node tests/ui/shell.mjs
```

Commit the regenerated `docs/PANEL_SETTINGS.md`, `SERVER_OPTIONS.md`, `LAUNCH_ARGUMENTS.md` and `GAME_SETTINGS.md` with the change.

---

## Results (fill in as you go)

| Section | Item | Result | What was changed / where |
|---|---|---|---|
| 0 | Setup (`npm run setup`, `build:ui`) | Pass | Windows 11, Node 22. Used the existing install at `C:GodlyPanelApp` read-only for real files; no real server was started or stopped. |
| 1 | `npm test` (unit + API) | Pass: 980/980, 0 skipped | The Windows-only tests (applyUpdateScript, secretsLocation, backups rollback, the Windows-path cases) all ran and passed. |
| 1 | `npm run test:desktop` | Pass: 19/19 | |
| 1 | Browser tests, real Windows Chrome | 14/14 suites pass | `sections.mjs` first failed ("ports and the firewall check are on the Network tab"): the firewall card runs real netsh/PowerShell and needed longer than a 1 s pause. It now waits for the card (up to 20 s). |
| 1 | `ui` unit tests, `build-guides --check`, `check-doc-links` | Pass (177 UI tests after additions) | |
| 1 | First real GitHub Actions run (draft PR #13) | Found 3 problems, fixed | (1) `interface tests` job: `ui` tests import panel modules but only the interface's packages were installed (`adm-zip` missing): the job now runs `npm ci` at the root too. (2) `readJson.test.js` "unreadable file": the runner's elevated account reads past an icacls deny rule, so the test skips itself there. (3) `foreignProcess.test.js`: `ECONNRESET` on a stale keep-alive connection (the test waits >5 s for a fake game); the test client retries once. Re-run on PR #13: all 13 jobs pass (Linux x4, Windows x2, interface tests, build, 3 browser jobs, audit). |
| 2 | 7 Days to Die (real V 3.2.0 `serverconfig.xml`) | Fixed | V 3.2 moved the gameplay rules (difficulty, day length, loot, zombies, blood moon…) into one `SandboxCode`. Added `SandboxCode`, `WebDashboardEnabled/Port/Url`, `EnableMapRendering`, `MaxChunkAge`. The 32 old rule keys and `ControlPanel*` stay for older game versions (labelled "older game versions"; the form only shows keys in the file). `catalog-diff` now also lists keys the catalog lacks even when the file's own comment explains them (7 Days). Still to do: dropdown value meanings for older-version keys cannot be checked on V 3.2. |
| 2 | Subsistence (real file) | Fixed | The catalog was empty. Added `catalog/subsistence.js` (22 settings, dropdowns for Difficulty, HunterAttacks, DaysPerYear, MonthOverride) from the game's own comments. |
| 2 | Minecraft (two real `server.properties`, Fabulously Optimized + BMC6) | Mostly fixed | Added `pause-when-empty-seconds`, `management-server-*` (8), `entity-broadcast-range-percentage`, `enable-code-of-conduct`. **Still unexplained** (meaning not verified): `chat-spam-threshold-seconds`, `command-spam-threshold-seconds`, `status-heartbeat-interval`, `text-filtering-version`. Catalog keys the new game dropped (`spawn-monsters`, `spawn-animals`, `spawn-npcs`, `allow-nether`, `max-build-height`, `enable-command-block`, `snooper-enabled`, `pvp` on BMC6) are kept for older Minecraft versions. |
| 2 | ARK (real `GameUserSettings.ini` 523 keys, `Game.ini` 79 keys) | Fixed | Added `ImplantSuicideCD`. Removed 20 breeding/crop/spoil multipliers from the `GameUserSettings.ini` list (the game writes them only in `Game.ini`, where they were already listed). The `[Shiny]` and `[CustomLevelDistrib]` sections (75 keys) are mod settings and stay unexplained on purpose. `Game.ini` `bUseCorpseLocator` under `[ShooterGameMode_TEMPOverrides]` is unexplained. |
| 2 | Enshrouded (real `enshrouded_server.json`) | Checked | 47 of 50 keys explained; every dropdown value in the real file is offered. Unexplained: `tags`, `userGroups`, `bannedAccounts` (lists / objects, not scalar settings). |
| 2 | Valheim launch line | Pass | 23/23 arguments on the real script recognised; a one-argument edit (`-modifier portals veryhard`) changed only the launch line. `veryhard` for `portals` still unconfirmed in game. |
| 2 | Rest of the games (installed for real into a scratch folder with a separate SteamCMD, started once each, then removed) | Done for: Zomboid, V Rising, Sons of the Forest, Palworld, Rust, Conan, Dragonwilds, Windrose, Satisfactory, Core Keeper | See the next rows. Not done: ARK/7 Days/Valheim/Enshrouded/Minecraft/Subsistence were checked only against your own installs, read-only. |
| 2 | Project Zomboid (real build, generated `servertest.ini`, 144 keys) | Fixed | 52 keys were unexplained; all are now explained from the game's own comments, in new groups (Moderation, Anti-cheat, Factions, Discord). Dropdowns added for `BadWordPolicy` and `MapRemotePlayerVisibility`. `SafeHouseRemovalTime` capitalisation was right; its description now says what the game says (hours unvisited before a player is removed). `-Xms/-Xmx` edit through the Launch options form changed only that line and the server started with the new values. **The game opened UPnP port forwards on the router for ports 31000 and 31001 (see Open items).** 11 catalog keys are not in this build's file (`AutoCreateUserInWhiteList`, `SteamPort1/2`, `KickFastPlayers`, `HoursForLootRespawn`, `MaxItemsForLootRespawn`, `ConstructionPreventsLootRespawn`, `DisableSafehouseWhenPlayerConnected`, `DiscordChannel`, `DiscordChannelID`, `DisableRadioObserver`): kept for older builds. |
| 2 | V Rising (server 1.1.15) | Fixed | `GameSettingsPreset` offered `Relaxed`, `Hard`, `Casual`, which the game doesn't have. It now offers the 28 presets the game ships (`StandardPvP`, `Level50PvE`, `TrioPvP_NoSiege`…) and the 3 difficulty presets. All 12 catalog keys exist in the game's own default `ServerHostSettings.json`. **Bug found and fixed:** that default file starts with a byte-order mark, and the Settings form's `JSON.parse` fails on one; the panel now strips it on read and puts it back on save (`tests/api/configBom.test.js`). `ServerGameSettings.json` (82 world-rule keys) is still not covered. |
| 2 | Sons of the Forest (real install; the game never rewrites `dedicatedserver.cfg`) | Partly | The 6 keys the file didn't have (`SaveInterval`, `IdleDayCycleSpeed`, `IdleTargetFramerate`, `ActiveTargetFramerate`, `TimestampLogFilenames`, `TimestampLogEntries`) are all present in the game's own code, so the names are right. The nested `GameSettings` / `CustomGameModeSettings` could not be mapped (their names are not readable from the game files); still open. |
| 2 | Palworld (game's `DefaultPalWorldSettings.ini`, 122 keys) | Fixed | 57 unexplained keys; 49 now explained. Wrong names fixed: `AdminRconPassword` (not a real key, removed), `AutoResetGuildNoOnlinePlayers` is `bAutoResetGuildNoOnlinePlayers`, `MaxBuildingLimitNumRate` is `MaxBuildingLimitNumPerPlayer`. 8 keys left unexplained because their meaning couldn't be confirmed: `bEnableDefenseOtherGuildPlayer`, `PlayerDataPalStorageUpdateCheckTickInterval`, `AutoTransferMasterCheckIntervalSeconds`, `MaxGuildsPerFrame`, `BlockRespawnTime`, `RespawnPenaltyDurationThreshold`, `RespawnPenaltyTimeScale`, `BuildingNameDisplayCacheTTLSeconds`. |
| 2 | Rust (live console over RCON) | Mostly | These convars exist with the values described: `decay.scale`, `decay.upkeep`, `server.stability`, `server.radiation`, `server.itemdespawn` (300), `craft.instant`, `fps.limit` (240), `server.headerimage`, `server.url`, `server.level` ("Procedural Map"), `server.saveinterval`, `server.worldsize`, `server.seed`, `server.pve`, `server.identity`, `app.port`. **`server.secure` and `server.globalchat` are "not found" in the live console** (the names do exist inside the game's code, so they may be start-up only): still to confirm; both are still in the catalog and `+server.secure` is in `launchArgs.js`. `server.writecfg` does NOT create `server.cfg`: it writes `serverauto.cfg`; the "may be missing" note now says so. Not tested: whether a launch-line value beats `server.cfg`. |
| 2 | Conan Exiles (real `ServerSettings.ini`, 218 keys) | Fixed | The catalog contained 16 settings that belong to 7 Days to Die (`LandClaim*`, `DynamicMesh*`, `Twitch*`, `PartySharedKillRange`, `PlayerKillingMode`); removed. Added the whole weekly PvP schedule (42 keys) and the avatar summoning times. 13 left unexplained (client/debug values and two version numbers; `PVPBuildFromStorageRadius` meaning unconfirmed). |
| 2 | Dragonwilds, Windrose (real files) | Fixed | Dragonwilds' file has only 7 keys, so the 4 "explained" settings were nearly everything; added `PlatformPolicy` and `bAllowSendingCrashDumps`. `AdminPassword` is not written by this build (kept). Windrose: added `InviteCode`, `CanLaunchMultipleServerInstances`; the rest are internal ids. |
| 2 | Core Keeper (real run with each launch argument) | Fixed | `-port`, `-world`, `-password`, `-maxplayers`, `-ip` accepted. `-worldseed` is hashed from any text, so "a number" was wrong. `-gameid` is only accepted at 28 letters/numbers (a 30-character code was ignored and a random one made); descriptions corrected. `-worldmode` and `-season` could not be confirmed from the log. |
| 3 | Launch-line editor on real start scripts | Partly done | Every real script in the existing install (ARK x9, Minecraft x2, Valheim, 7 Days, Subsistence, Enshrouded) re-serializes byte-for-byte; a one-argument edit changed only the launch line (Valheim `-modifier`, Zomboid `-Xms/-Xmx`, which then started). ARK and Minecraft launch lines are reference-only. The stock 7 Days `startdedicated.bat` has no recognisable launch line (the program is `%GAMENAME%`). Not done: hand-made `^` continuations, redirection, duplicates; restarting after an edit for Rust, 7 Days (`-UserDataFolder`), Valheim and V Rising. |
| 4 | Long program names (Dragonwilds, Windrose) | Pass | "No window" stop reported "closed gracefully" for both. **Satisfactory** was force-stopped ("didn't close on its own within 15s") about 80 s after starting: a real server saving its world may need longer than 15 s. |
| 4 | `npm run package`, update payload | Pass | `GodlyPanel-0.1.0-alpha.15-win.zip` and `-app.zip` built; `app.asar` contains the hashed `ui/build/assets/*` files. electron-builder 26.17 packaging works. Not done: in-app update end to end, tray / start-with-Windows, CPU measurement with 5+ servers. |
| 5, 6, 7 | Phone, screenshots, moderator accounts, Cloudflare Tunnel, IPv6 and the rest | **Not done** | Need a phone, a community, real roles and a tunnel. |

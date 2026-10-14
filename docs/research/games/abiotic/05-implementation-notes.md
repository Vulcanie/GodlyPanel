# Abiotic Factor: implementation notes (2026-10-14)

Files created (new files only, nothing registered, nothing committed):
- `C:\GodlyPanel\src\server\data\games\abiotic.js` (template, backup, logs, launchOptions: true; also a named export `SANDBOX_DEFAULTS` used by the tests)
- `C:\GodlyPanel\ui\src\catalog\games\abiotic.js` (type "abiotic", title, files, launch, guide)
- `C:\GodlyPanel\tests\unit\game-abiotic.test.js` (node:test, 28 tests, pass)
- `C:\GodlyPanel\ui\src\__tests__\game-abiotic.test.js` (vitest, 31 tests, pass)

Also checked (temporary test, deleted): with the UI module pushed into `GAME_UI_MODULES`, `CONFIG_CATALOG.abiotic` has the three files, `launchDefFor("abiotic")` works, and `annotateEntries` reports 0 undocumented settings for each (same rule as catalogs.test.js). To register: one line in each `games/index.js`.

## What was built
- Template: id/type `abiotic`, name "Abiotic Factor", method `process`, updateAppId 2857200, storeAppId 427410, fields `sessionName`, `serverPassword`, `adminPassword` (no mods, no RCON), ports game 8930 UDP and query 8932 UDP (the game's own 7777/27015 clash with other games here; 8930/8932 clash with no default in gameTemplates.js, icarus.js, starrupture.js). No implicitPorts (only two UDP sockets were seen open; the port next to the game port is kept free by the panel's usual precaution).
- Start script `Start_AbioticFactor.bat`:
  `cd /d "%~dp0AbioticFactor\Binaries\Win64"` then `start /MIN "<name>" AbioticFactorServer-Win64-Shipping.exe -log -useperfthreads -MaxServerPlayers=N -PORT=P -QueryPort=Q -SteamServerName="..." -WorldSaveName=Cascade -SandboxIniPath=Config/WindowsServer/SandboxSettings.ini [-ServerPassword="..."] [-AdminPassword="..."]`.
  Values typed by the person: `"` dropped, `%` doubled, trailing backslashes dropped, control characters dropped; the window title also loses `& | < > ^ !`. Empty passwords are left off (not passed empty). Players clamp to 1..24, default 6. `-NOSTEAM` is never used. `deriveLaunch` reads the script (tested with a temp tree), so "no window" mode is offered.
- Settings (UI): SandboxSettings.ini (48 settings, ini parser, 10 groups, 6 dropdowns), Admin.ini (2 settings), so 50 settings; launch options 18 arguments (managed: -log, -PORT, -QueryPort, -SteamServerName, -ServerPassword, -AdminPassword, -MaxServerPlayers, -WorldSaveName, -SandboxIniPath, -useperfthreads).
- Config the panel writes at creation: `AbioticFactor\Saved\Config\WindowsServer\SandboxSettings.ini` with `[SandboxSettings]` and all 48 keys at the defaults of the developer's example file (the ini form can only edit lines that exist, so the full list has to be there).
- Entry: `processName` = `AbioticFactorServer-Win64-Shipping.exe`, `configPath` = the sandbox file, `configPaths` = SandboxSettings.ini and Admin.ini (`AbioticFactor\Saved\SaveGames\Server\Admin.ini`), no RCON fields.
- Backup: `AbioticFactor/Saved/SaveGames` (worlds, game's own backups, Admin.ini) plus the sandbox file. Logs: dir `AbioticFactor/Saved/Logs`.

## Deviations from the dossier (and why)
1. **Runs the Shipping exe directly, not the root `AbioticFactorServer.exe` launcher.** The dossier tested the launcher; the developer's wiki runs the Shipping exe. Reason: the dossier's own test saw the launcher forward `-SteamServerName="GodlyResearch"` to the game as `-SteamServerName=GodlyResearch` (quotes gone), which suggests a name with spaces would be cut at the first space; the test used a name without spaces. Direct launch matches the wiki's `-SteamServerName="Your Server Name"`. Working directory is the Win64 folder (where `steam_appid.txt` is, and where the wiki's RunServer.bat lives). Satisfactory in this repo uses the launcher pattern; this game uses the direct one. processName is the same either way.
2. **`-SandboxIniPath` is written by the panel**, pointing at `Config/WindowsServer/SandboxSettings.ini`, instead of "keep the default per-world file". Reasons: the game is not known to create the file (issue #58, docs disagree); pre-creating `Worlds\Cascade\` with only a settings file might confuse the game's world-corruption check on first start (unknown); a path outside the world folder also does not depend on the world name, so `-WorldSaveName` can be changed in the Launch options form without orphaning the Settings tab. The argument and its relative-to-`Saved` meaning are documented in the wiki (example `Config/WindowsServer/Server1Sandbox.ini`).
3. `-WorldSaveName=Cascade` is written explicitly (the game's own default) so it is visible and editable in the form.
4. `-newconsole` is not on the line (dossier: panel default minus `-newconsole`); `-log` alone gave the shipping process a console window when tested. Both are explained in the launch list (`-newconsole` not editable).
5. Setting groups consolidated (the dossier's "World: ..." / "Player: ..." sub-groups became Difficulty, Time and weather, Facility, Survival, Building and storage, Enemies, Players, Items, Progression, Death and respawn). Labels are my own plain wording; every default and range is from the official wiki page. Ranges are written as "the wiki's range", never as enforced limits.
6. `BannedPlayers::BannedPlayer` added to Admin.ini (not in the dossier's Table 2): it is in the default Admin.ini the dossier tested (`[BannedPlayers] BannedPlayer=ExampleBanID1`). Its description is limited to what the section name and placeholder show.
7. `StructuralSupportLimit` and `BridgeSupports` are included but their descriptions say what the wiki says, including that the wiki does not explain the unit / values 1 and 2. `BridgeSupports` has no dropdown (only 0 is labelled).

## Left out
- Mods field/loader/mod list: dossier says nothing supported yet (pak or UE4SS folder drops only, uneven; official mod.io support announced, mechanism unknown). A guide note says what to do by hand.
- `-DisableAsyncLoadingThread` (the wiki page contradicts itself, unverified spelling), `-NoAsyncLoadingThread` is offered but off by default.
- Any query/gamedig protocol: method is `process`. A2S on the query port answers (tested), but gamedig's protocol for this server was not run.
- Windows firewall helper: the generic firewall check adds UDP rules for the game and query ports from the entry; nothing game-specific.
- Admin.ini is not written by the panel (the game makes it on first start; one report says the game may rewrite it at start).

## Panel limitations for this game
- **No graceful save/stop channel.** No RCON, no stdin command. The panel stops it by closing its window (`taskkill` without /F, then force after 15 s). It works only because of `-log` (the server then owns a console window); without `-log` there is no window and only a force-kill. Whether a populated world is saved on close is unknown. If the owner switches the window mode to "no window" (panel-spawned, no console), the graceful close may not be deliverable (untested); "minimized" and "hidden" keep the console.
- No in-panel player count or commands (process-level status only).
- The Admin.ini form edits existing lines only (the two example lines); more admins mean adding `Moderator=` lines by hand.
- The sandbox file is read at server start, so changes need a restart; it is written with the game's defaults, so any change made through the in-game sandbox menu may be overwritten by the file at the next start (unverified which wins).
- The first run of the Shipping exe makes Windows ask about the firewall; a dismissed prompt creates Block rules (tested on a non-interactive session).

## MUST be verified on a real install
1. A server created by the panel starts from this script, shows `LogInit: Display: Engine is initialized`, binds UDP 8930 and 8932, and answers A2S on 8932.
2. Direct launch from `AbioticFactor\Binaries\Win64` with `start /MIN` and `-log`: there is a console window, exactly one server process exists, and **Stop in the panel (taskkill without /F) closes it cleanly** within 15 s (log shows `Engine exit requested ... Exiting.`). Also check "hidden" window mode and "no window" mode.
3. A server name with spaces appears in full in the in-game list (`-SteamServerName="Friends Lab"`); also try the launcher variant if direct launch has problems.
4. `-SandboxIniPath=Config/WindowsServer/SandboxSettings.ini` is honoured: change a value (for example GameDifficulty=3) in the Settings tab, restart, confirm it applies; confirm the game does not complain about the file or the world folder and creates `Worlds\Cascade` itself on first join.
5. The sandbox file written with all 48 keys (capitalised True/False, floats like 1.0) is accepted; check the server log shows no parse errors, and what happens to values changed in the in-game sandbox menu after a restart.
6. Admin.ini appears at `AbioticFactor\Saved\SaveGames\Server\Admin.ini` on first start with the two example lines per section; replacing them through the form works while stopped; a Steam ID there gives admin in game; check whether a start wipes them (issue #25).
7. `-AdminPassword="..."` and `-ServerPassword="..."` with quotes work (a join with and without the password), and a password containing `%` still works (script writes `%%`).
8. A saved populated world survives Stop; backup/restore of `AbioticFactor\Saved\SaveGames` round-trips; check what the world backup folder inside it looks like and how big it is.
9. `-MaxServerPlayers` default/limits, `-PlatformLimited`, `-LANOnly` (port 14001) only if offered to users; `-useperfthreads` is included on the developer's recommendation but was not run in the test.
10. Firewall: after creating the server, the panel's firewall check/rule covers the exact Shipping exe path (the check builds `<installDir>\AbioticFactorServer-Win64-Shipping.exe`, which does not exist; it also uses the running process path, so verify the rule is created for the real path under `AbioticFactor\Binaries\Win64`).
11. Memory: about 840 MB idle empty world (tested); real worlds untested.

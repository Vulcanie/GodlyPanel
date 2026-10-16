# VEIN - implementation notes

Files created (nothing existing was edited, not registered in either index.js):
- `src/server/data/games/vein.js` (template, backup, logs, launchOptions)
- `ui/src/catalog/games/vein.js` (Game.ini + Engine.ini catalogs, launch args, guide)
- `tests/unit/game-vein.test.js` (22 node tests, pass), `ui/src/__tests__/game-vein.test.js` (34 vitest tests, pass)

Catalog: Game.ini 16 settings, Engine.ini 39 settings (console variables), 6 launch arguments (3 managed by the panel).

## What was built
- id/type `vein`, displayName "VEIN", method `process`, updateAppId 2131400, storeAppId 1857950, anonymous SteamCMD, installLayoutRoot "".
- Fields: sessionName, serverPassword. No adminPassword (the game has none: admin = SteamID64 in Game.ini), no rconPassword, no mods field.
- Ports (UDP): game 8960, query 8962 (= game + 2, the wiki's rule; outside 27020-27050). The game's own 7777/7778/27015 clash with Valheim, Satisfactory, Core Keeper. Test checks no clash with every template and module default and their implicit ports.
- Start script `Start_Vein.bat`: `cd /d "%~dp0Vein\Binaries\Win64"` then `start /MIN "<title>" VeinServer-Win64-Test.exe -log -Port=N -QueryPort=N`. Title is stripped of cmd characters. Name/password/player limit are NOT on the line.
- Game.ini written before first start (Ramjet: "create it if missing"): `[/Script/Engine.GameSession] MaxPlayers=` (default 16, Ramjet's figure), `[/Script/Vein.VeinGameSession] ServerName=` (64 chars, single line) and `Password=`. No admin lines.
- Engine.ini written with only `[ConsoleVariables]` (via buildExtraFiles).
- Backup: `Vein/Saved` (excluding Logs, Crashes). Logs: dir `Vein/Saved/Logs`.
- Launch options form on. Args: -log (locked), -Port, -QueryPort (managed), -multihome, -onethread, -MaxPlayers.

## Deviations / choices where sources conflict or were NOT FOUND
- Process: dossier is split. Started `VeinServer-Win64-Test.exe` directly (wiki start command, WindowsGSH "shipping child"); `VeinServer.exe` (Ramjet, WindowsGSH launcher) is the other candidate. The name "Vein-Win64-Shipping" appears in no source. processName = VeinServer-Win64-Test.exe. The launch regex in the UI also matches `VeinServer.exe`.
- Query port 7778 vs 27015: moot, the panel always passes -QueryPort. GameServerQueryPort (ini) left out of the catalog, so nothing in the ini can contradict the flag.
- Boolean format: used `1`/`0` (two community lists), never `True`. The `bPublic` (True/False) and `bVACEnabled` (0/1) values are as Ramjet's Config page writes them.
- Time multiplier: `vein.Time.TimeMultiplier` (two lists) used; `vein.TimeMultiplier` (one Docker example) left out.
- Multi-admin syntax: first line `AdminSteamIDs=`, later lines `+AdminSteamIDs=` (Ramjet's own Config page, GSK x2); the "repeat without +" variant (XGamingServer) not used. Catalog has `AdminSteamIDs`, `+AdminSteamIDs`, `SuperAdminSteamIDs`, `+SuperAdminSteamIDs`, `WhitelistedPlayers`, `+WhitelistedPlayers` as separate keys (the ini parser keeps the `+` in the key name and numbers repeats, tested).
- AdminSteamIDs default (1234 vs blank): no default stated in the catalog beyond "a new file may carry the placeholder 1234".
- Ramjet's own Config page (raw/07) was read directly: it is the source for the Game.ini sections/keys (MaxPlayers, bPublic, ServerName, ServerDescription, BindAddr, SuperAdminSteamIDs, AdminSteamIDs, Password, WhitelistedPlayers, bVACEnabled) which the 02-config.md table marked "section NOT FOUND" for several of them.
- Engine.ini not seeded with defaults: the vein.* names/defaults come from community copies (Oct 2025) of Ramjet's list; writing them could silently override the game's real defaults.
- vein.* rows are used only where a source gives a description. Dropdowns only where a source lists 0/1 (PvP, BuildObjectPvP, BaseDamage, AISpawner.Enabled, HordeMode, ContainersRespawn.Enabled) or 0-4 (Scarcity.Difficulty). Other on/off cvars are text boxes whose descriptions say "1 is on" with the list's default.

## Left out of the catalog (and why)
- HTTPPort (no section named; unauthenticated JSON API), HeartbeatInterval (no explanation), `[URL] Port` in Engine.ini (launch line owns the game port), GameServerQueryPort, BindAddr kept (documented) but no default.
- vein.AI.AsyncSensing, AISpawner.EnableVirtualization, FieldOfViewDot, Hordes.MaxDistance, Zombies.NavWalk, Zombies.LayingDownDistance, ZombieBuckets.*, vein.Activity.AFKKickTimeSeconds (no description/default or unclear units).
- `-SaveDir` (WindowsGSH): value form (space vs =) not stated; saves location not documented. Not offered.
- Docker env-var table (not config keys), Linux exe names, RCON (TCP 7777 in the wiki; GSK says the binding was removed in 0.019 Hotfix 2; no password or protocol anywhere).
- Mods: none (no Workshop, no official server mod support, pak mods untested). Nothing added.

## Panel limitations
- No documented graceful stop or save command. The panel closes the console window then force-kills after 15 s. Whether a world is saved on the way out is unknown; the guide tells people to use the admin menu's save button (Server section, per GSK) before stopping. No RCON, so the panel cannot save for them.
- Settings changes are not hot-applied; stop, edit, restart. Unreal removes default-valued lines.
- Only existing lines of an ini show in the form (the ini parser): Engine.ini starts empty and needs "Edit as text" to add lines; the guide says so.
- Query: plain process watching only (no verified A2S/query protocol; Steam query port exists but the panel's gamedig protocol for VEIN is unverified).

## MUST be verified on a real install
1. Which exe stays running: does `Vein\Binaries\Win64\VeinServer-Win64-Test.exe` exist and run directly with `-log -Port= -QueryPort=` from its own folder, or must `VeinServer.exe` (root launcher) be used; what is the process the panel should track; does `-log` give a closable console window.
2. That Game.ini/Engine.ini in `Vein\Saved\Config\WindowsServer` are the files read, that the pre-written Game.ini is accepted (ServerName, Password, MaxPlayers honoured; server shows in browser with that name and password works, case-sensitively).
3. Whether `-MaxPlayers=` on the line or `MaxPlayers` in Game.ini wins when both are set; whether -Port/-QueryPort (and the capitalisation) are honoured, and the real query port behaviour (does Steam/A2S answer on 8962).
4. Where the world saves are: `Vein\Saved\SaveGames` vs `%LOCALAPPDATA%\Vein` (WindowsGSH warns of a March 2026 migration); adjust backup paths if the latter. Whether `-SaveDir` takes `=` or a space.
5. Log folder `Vein\Saved\Logs` (assumed from the Unreal default; WindowsGSH only says "below Vein\Saved").
6. What a closed window / force kill does to the world; whether any stop or save command works; whether the admin menu save button exists on a dedicated server.
7. Whether an empty Game.ini `Password=` is an open server; whether `[ConsoleVariables]`-only Engine.ini is accepted and that `vein.*` lines (1/0 booleans, vein.Time.TimeMultiplier) take effect.
8. Windows run needs: Ramjet says elevated rights may be needed if the server is missing from the browser; `steam_api64.dll` may need copying into `Vein\Binaries\Win64`; VC redist and DirectX.
9. Memory: 8 GB minimum to start.
10. Admin list: first-line `AdminSteamIDs=` plus `+AdminSteamIDs=` lines work, and that a new game-made Game.ini carries `AdminSteamIDs=1234`.

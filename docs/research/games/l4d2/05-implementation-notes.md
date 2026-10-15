# Left 4 Dead 2: implementation notes (2026-10-15)

Nothing was run on a real install of this game. Facts come from the dossier (01..04) and from the Garry's Mod verification of the same engine (`research/garrysmod/06-verification.md`).

## Files created (no existing file edited, not registered)
- `src/server/data/games/l4d2.js` (template, backup, logs, launchOptions: true)
- `ui/src/catalog/games/l4d2.js` (files, launch, guide)
- `tests/unit/game-l4d2.test.js` (30 tests, pass), `ui/src/__tests__/game-l4d2.test.js` (22 tests, pass)
- Lead must add `import l4d2 from "./l4d2.js"` and the entry to both `index.js` lists (server and ui), and docs rows (GAME_SETTINGS.md, LAUNCH_ARGUMENTS.md) if the lead keeps them per game.

## What was built
- Template: id/type `l4d2`, displayName "Left 4 Dead 2", method `process`, updateAppId 222860, storeAppId 550, installLayoutRoot "", processName `srcds.exe`. Fields: sessionName, serverPassword, mapCode (14 official campaigns' first maps as `mapChoices`, default `c1m1_hotel`), gslt (optional, app 550), mods (Workshop item ids/links). `fieldMeta` labels for gslt and mods only.
- Port: one `port`, default **27245** (UDP, TCP for RCON; offset 1 kept free by the panel's precaution rule). Checked by test against every template in `GAME_TEMPLATES` (and their implicit offsets). Existing: 27015 Core Keeper, 27145 Garry's Mod, 27215/27217 Barotrauma, 27315 Unturned, 27016 Space Engineers/SOTF.
- Start script: `start /MIN "<name>" srcds.exe -console -game left4dead2 -port N -strictportbind +maxplayers 4 +map c1m1_hotel +exec server.cfg -condebug`, then `+sv_setsteamaccount <GSLT>` only if given. Nothing has to be last, so the Launch options form is on. `-tickrate` is never offered (Valve: disabled in code for L4D2). Inputs validated in `resolveParams` and again when the script is built (hostile values dropped, never written).
- Config: the panel writes `left4dead2\cfg\server.cfg` with `hostname`, `sv_password` (if any), `sv_allow_lobby_connect_only 0`, `sv_lan 0`. The settings catalog has one file, `server.cfg`, parser `convar`.
- Settings catalog: **110 settings** in 14 groups (Server, Joining, Game rules, Voice, Difficulty tuning, Director, Versus, Survival, Scavenge, Voting, Files and downloads, Network and performance, Logging, Remote console and bans). On/off settings are 0/1 dropdowns; `mp_gamemode` (6 modes + custom), `z_difficulty` (Easy/Normal/Hard/Impossible), `survivor_respawn_with_guns`, `sv_client_predict`, `sv_allow_lobby_connect_only`, `sv_pure_kick_clients` are labelled dropdowns.
- Launch catalog: **15 arguments**, 11 editable. Managed and not editable: `-console`, `-game`, `-condebug`, `+exec`. Editable: `-port`, `-strictportbind`, `-ip`, `-nohltv`, `-nomaster`, `+maxplayers`, `+map`, `+sv_gametypes`, `+sv_setsteamaccount`, `-conclearlog`, `-insecure`. Only one spelling of each pair (`+maxplayers`, `-port`, `-ip`), as in the Garry's Mod module.
- Mods: item ids (or `?id=` links), comma/space/line separated, max 30. `postWrite` runs SteamCMD once (`+force_install_dir <scratch> +login anonymous +workshop_download_item 550 <id> ... +quit`), looks in `steamapps/workshop/content/550/<id>/` for `.vpk` or `*_legacy.bin` files that start with the package magic `34 12 AA 55`, and copies them to `left4dead2\addons\<id>.vpk` (second file of the same item: `<id>_2.vpk`). An item that gives nothing becomes a warning, never an error. A warning reminds that all players need the same addons.
- Backup: `left4dead2/cfg` (server.cfg and ban lists), `left4dead2/addons`. Logs: `left4dead2/console.log` (file) and `left4dead2/logs` (dir).

## Deviations from the dossier / brief
1. **Name and password go in `server.cfg`, not `autoexec.cfg`.** The dossier says no server.cfg ships, so `validate` has nothing to put back (that was the only reason Garry's Mod used autoexec.cfg), and every dossier source writes hostname/password in server.cfg. `+exec server.cfg` is on the launch line (FireDaemon) so the file runs even if it is not auto-run; running twice is harmless.
2. **`+maxplayers 4` default**, not LinuxGSM's 8: the VDC pattern, FireDaemon and modcommunity use 4 for Co-op. Raise to 8 (Versus/Scavenge) in Launch options; the form accepts 1..32 (32 is the most add-ons raise it to; my ceiling, the dossier has none).
3. **`sv_gametypes` only as a launch argument**, not in the settings (the wiki says it is usually set on the launch line; two places would make "which wins" unanswerable).
4. **method `process`, no RCON**, as briefed. `rcon_password` stays an ordinary setting.
5. GSLT is optional and not warned about (third-party sources only); app 550 in the help text, never 222840.
6. Collections are not followed (the keyless Steam Web API call would need new network code; the dossier's API route is not built). Only item ids.
7. SourceMod/Metamod install is not built (needs download + extract + admin file; no hook for it without editing existing files). Said in the guide notes.

## Left out, and why
Settings (dossier: inferred from name or no description): the four `survivor_friendly_fire_factor_*`, `z_mob_spawn_min_size/max_size`, `z_special_spawn_interval` (unit unknown), `sv_filterban` (values unknown), `sv_vote_command_delay` is IN but with no unit. Also out: `sv_region` (code table unverified), `fps_max`, `sv_alternateticks`, `motd*`, `mapcyclefile`, SourceTV `tv_*` (not shown to work), `sv_hosting_lobby`, `servercfgfile`, the unexplained list in dossier 02 (per-special limits, mega mob, tank intervals ...), `mp_disable_autokick` (a command), other-game leftovers (`mp_buytime`...), `sv_maxplayers` (not on Valve's list).
Launch arguments: `-tickrate` (disabled), `-secure` (only FireDaemon), `-autoupdate` (Linux only), `-usercon`, `-nobots`, `-netconport/-netconpassword`, `-hostport/+hostport`, `+ip`, `-clientport/+clientport` (default 27002 vs 27005 unresolved; Garry's Mod showed the engine picks a random client port anyway), `-steamport`, `+hostname`, `+sv_lan`, `+mp_gamemode`, `+sv_allow_lobby_connect_only` (in server.cfg), `+servercfgfile`, `-norestart`, `-fork`, the engine-wide switches.

## Must be verified on a real install
1. `srcds.exe` is in the install root (Steam launch entry and VDC) and not in `left4dead2\` (FireDaemon), is the single process that stays running, and `-game left4dead2` is accepted.
2. `left4dead2\cfg\` exists after install so `server.cfg` is written there; the server prints the `+exec server.cfg` result and applies `hostname`/`sv_password` (browser name, password prompt).
3. `sv_allow_lobby_connect_only 0` lets a friend join with `connect <ip>:<port>`; `+exec server.cfg` does not log "could not exec".
4. Stop: the panel's window-close ends srcds.exe (FireDaemon says srcds ignores the Windows close message; Garry's Mod's srcds.exe closed gracefully in 4.5 s). If it only force-kills after 15 s, say so in the guide. The game has nothing to save.
5. Ports bound: UDP + TCP on the game port, UDP 27020 (shared with other Source servers), random client port; `-strictportbind` accepted.
6. `-condebug` writes `left4dead2\console.log` (name assumed from Garry's Mod) and `left4dead2\logs` exists; the Logs tab shows them.
7. Workshop download: anonymous `workshop_download_item 550 <id>` lands in `steamapps\workshop\content\550\<id>\` of the scratch folder, the file is a `.vpk` or `*_legacy.bin` with magic `34 12 AA 55`, and a copy renamed `<id>.vpk` in `left4dead2\addons` is loaded (map shows in `changelevel`); a connecting player without the addon is refused or can download it.
8. The 14 campaign first-map names against `left4dead2\missions\*.txt`/`maps\*.bsp` (dossier: pairing "likely right").
9. Server starts and is listed with no GSLT; `+sv_setsteamaccount` with a token is accepted.
10. `+maxplayers 8` with Versus; whether 4 is enough for Co-op when lobbies fill slots.
11. Whether cheat-flagged Director/difficulty cvars take effect from server.cfg (guide note says it was not tested).
12. A2S query on the game port (not used: no `gamedig` type claimed).

## Panel limits for this game
- No graceful stop or console command (like Garry's Mod); no player count (process polling only).
- No SourceMod/Metamod install; no Workshop collection expansion; addons are fetched only when the server is created (a later "add addon" needs the panel's Mods tab to know the game, which is in `modTemplates.js`, an existing file).
- Steam updates (`validate`) do not remove addons or server.cfg (not shipped); a game update can still break addons.

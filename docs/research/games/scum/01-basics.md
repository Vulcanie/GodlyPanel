# SCUM dedicated server: basics (researched 2026-10-14)

Facts are for the current public server build: Steam app 3792580 public branch buildid 25803875, built about 2026-10-08 (https://api.steamcmd.net/v1/info/3792580). Game version quoted by guides: SCUM 1.3.3.4.149664 (11 Sept 2026) (https://www.gameserverkings.com/knowledge-base/scum/scum-server-settings-ini/). Nothing here was run on a real install; every item comes from the cited pages. Official Gamepires docs were not found (the only "official-ish" source is the community wiki).

## SteamCMD app id and login
- Server app id is **3792580**, name "SCUM Server", type Tool, windows only, freetodownload=1, parent app 513710. Source: https://api.steamcmd.net/v1/info/3792580
- Windows depot 3792581 (windows 64-bit): 7,058,832,960 bytes download, 15,351,312,202 bytes installed. Small extra depots 1004 (67.9 MB installed) and the Linux depot 1006 exist but the app oslist is windows. Redistributable depots 228989/228990 come from app 228980 (Steamworks common redistributables). Source: same API page.
- Anonymous login works. Commands from the community wiki: interactive `login anonymous`, `force_install_dir <dir>`, `app_update 3792580 validate`, `exit`; or one line `steamcmd +force_install_dir <install_dir> +login anonymous +app_update 3792580 +quit` (wiki one-liner omits validate). Source: https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup . Corroborated: Pterodactyl egg uses anonymous login with app 3792580 ("Steam login not required") https://eggs.pterodactyl.io/egg/games-scum ; Steam guide (since removed from the community, see UNVERIFIED) `steamcmd +force_install_dir C:\scumserver +login anonymous +app_update 3792580 validate +exit` https://steamcommunity.com/sharedfiles/filedetails/?id=3502203232
- Other app ids: the wiki warns "don't confuse with the other scum server application" but gives no id (https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup). Old id 911460 (from the earlier candidates note): the Steam metadata mirror returns only a stub record for it (no name/type/depots) so it cannot be confirmed as anything; use 3792580 (https://api.steamcmd.net/v1/info/911460).
- Downloading the Steam client's "SCUM Server" Tool (Library > Tools) is also possible, default path `...\steamapps\common\SCUM Server\SCUM\Binaries\Win64\` (https://www.oxygenserv.com/en/complete-guide-2025-how-to-launch-your-scum-server-step-by-step , hosting vendor page).

## Install folder layout
- Server exe path relative to install root: `SCUM\Binaries\Win64\SCUMServer.exe`; Steam launch config for the app: executable `SCUM\Binaries\Win64\SCUMServer.exe`, arguments `-log`, windows 64-bit. Source: https://api.steamcmd.net/v1/info/3792580
- Config: `SCUM\Saved\Config\WindowsServer\` (folder is named WindowsServer even on Linux hosts running through Wine). Source: https://www.gameserverkings.com/knowledge-base/scum/scum-server-settings-ini/ , https://eggs.pterodactyl.io/egg/games-scum
- Log: `SCUM\Saved\Logs\SCUM.log` (https://eggs.pterodactyl.io/egg/games-scum , https://gamecp.com/games/scum/hosting-guide)
- Save database: `SCUM.db` in the "SaveFiles" folder, i.e. `SCUM\Saved\SaveFiles\` (path stated by https://www.oxygenserv.com/en/complete-guide-2025-how-to-launch-your-scum-server-step-by-step ; SCUM.db in "the server's SaveFiles folder" per https://guildorder.com/games/scum/wiki/world-backups-and-the-save-database ). Timestamped rotating backups of the DB sit beside the live file (guildorder page).
- Install is inside the chosen `force_install_dir`, so a normal GodlyPanel layout (one directory per server, exe at `SCUM\Binaries\Win64\SCUMServer.exe`) matches the wiki example (`...\SCUM Server\scum` for server files).

## Executable and Windows process name
- Process name to match: **SCUMServer.exe**. Sources: Steam launch config above; wiki.
- Whether `SCUMServer.exe` is a thin launcher that spawns a separate shipping exe (typical Unreal behaviour) is NOT documented in any page found. Both Pterodactyl (Wine) and the wiki run `SCUMServer.exe` directly, and a Steam guide comment kills `taskkill /IM SCUMServer.exe /F`, which implies that image name is the long-running process. See UNVERIFIED.

## Ports and protocols
Wiki table (https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup), defaults with `-port=7777`:
| Protocol | Port | Purpose |
|---|---|---|
| UDP | 7777 | game client port |
| UDP | 7778 | raw UDP socket (game port +1) |
| UDP | 7779 | Steam server-browser query (game port +2) |
| TCP | 7777 | RCON, "optional" |
- "-port ... The connection port is port+2": players connect and use the Steam server list through game port + 2 (7779 by default). Source: wiki; https://emeraldhost.de/docs-redirect/en/gameserver/scum/join-server ("SCUM does not use the Game Port but the query port ... always add +2"); Steam guide https://steamcommunity.com/sharedfiles/filedetails/?id=3502203232 ("Query port 7779, always game port plus 2").
- Second instance example from the wiki: 7780/7781/7782. Query port must not be 27020-27050 when running locally ("Steam uses those ports"). Source: wiki.
- Conflicting figures (other launchers): Pterodactyl egg `-Port=7777 -QueryPort=27015` and says users connect to game+2 (7779) per the Readme https://eggs.pterodactyl.io/egg/games-scum ; GameCP `-Port=27165 -QueryPort=27167` https://gamecp.com/games/scum/hosting-guide ; XGamingServer lists ServerPort 7042, QueryPort 27915, SteamPort 7243, RCONPort 9515 TCP (host-assigned values, also claims ini keys) https://xgamingserver.com/docs/scum/server-config ; a survival-config page lists UDP 7777 game and 7778 query https://survivalconfigs.com/scum ; one guide uses 7000 TCP+UDP (example only) https://www.oxygenserv.com/en/complete-guide-2025-how-to-launch-your-scum-server-step-by-step . The `-QueryPort=` flag exists in at least the Pterodactyl and GameCP commands, but no primary source says what it does in the current build; treat as UNVERIFIED.

## Minimal start command
- Wiki: `SCUMServer.exe -log -port=7777 -MaxPlayers=64` run from `SCUM\Binaries\Win64\` (batch `scum_server.bat` there). Source: https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup
- Steam guide variant from the install root: `start SCUM\Binaries\Win64\SCUMServer.exe -log -port=7777 -MaxPlayers=64` https://steamcommunity.com/sharedfiles/filedetails/?id=3502203232
- Arguments from the wiki: `-log` (log window/log output; Steam's Start button adds it automatically), `-port=<n>`, `-MaxPlayers=<n>` (overrides the value in ServerSettings.ini), `-nobattleye` (disables BattlEye, "not recommended"). Flags are written with capitals by other sources (-Port, -QueryPort, -MaxPlayers); case-insensitivity is not documented (UNVERIFIED).
- Server name, description, password, playstyle live in ServerSettings.ini (keys `scum.ServerName`, `scum.ServerDescription`, `scum.ServerPassword`, per https://steamcommunity.com/sharedfiles/filedetails/?id=3502203232 and the key prefix described at https://www.gameserverkings.com/knowledge-base/scum/scum-server-settings-ini/ ). The Pterodactyl egg edits `ServerName`, `ServerDescription`, `ServerPassword`, `ServerPlaystyle` under General (PVE/PVP) https://eggs.pterodactyl.io/egg/games-scum . Whether the real key is `scum.ServerName` or `ServerName` is disputed between sources; belongs to the settings-catalog step, open it against a real file.
- Max players default 64 per XGamingServer ("up to 64") https://xgamingserver.com/docs/scum/server-config ; wiki example uses 64. Real hard cap UNVERIFIED.

## First-run behaviour
- GameServerKings says a running server generates twelve files in `SCUM\Saved\Config\WindowsServer\`: ServerSettings.ini, AdminUsers.ini, ServerSettingsAdminUsers.ini, WhitelistedUsers.ini, ExclusiveUsers.ini, BannedUsers.ini, SilencedUsers.ini, EconomyOverride.json, RaidTimes.json, Notifications.json, GameUserSettings.ini, Input.ini; a `Loot/` folder is created by the user. https://www.gameserverkings.com/knowledge-base/scum/scum-server-settings-ini/
- A conflicting Steam guide says ServerSettings.ini is not created until you run the server and run the save command in the console, and offers a template (that guide is flagged "removed from the community / incompatible with SCUM"): https://steamcommunity.com/sharedfiles/filedetails/?id=3502203232 . So whether the file appears on the very first launch is UNVERIFIED; a panel should be prepared to write it itself before first start or wait and re-read.
- The server reads ServerSettings.ini and AdminUsers.ini at start only; edit while stopped, otherwise a running server may overwrite changes. Sources: https://www.gameserverkings.com/knowledge-base/scum/scum-admin-commands/ , https://survivalconfigs.com/scum
- World/save: single SQLite-style DB `SCUM.db` (the `-shm`/`-wal` sidecar files are mentioned by a Scribd tutorial as present while running and gone after a clean exit; the Scribd page is low reliability and file names were garbled in the summary) https://www.scribd.com/document/899279499/Copia-de-SCUM-Server-Tutorial , https://www.oxygenserv.com/en/complete-guide-2025-how-to-launch-your-scum-server-step-by-step . No named worlds/slots found.

## Stopping gracefully and saving
- Console window: press CTRL+C in the server's Command Prompt window, then check that `SCUM.db-shm` and `SCUM.db-wal` are gone. Don't click inside the console (ESC if frozen). Source: https://www.oxygenserv.com/en/complete-guide-2025-how-to-launch-your-scum-server-step-by-step
- "SCUM writes its save database on a graceful shutdown. A crash or forced kill may leave the file without the latest state." https://guildorder.com/games/scum/wiki/world-backups-and-the-save-database
- Pterodactyl egg stop command: `^C` (SIGINT). https://eggs.pterodactyl.io/egg/games-scum
- In-game admin chat command `#ShutdownServer` (renamed from `#RestartServer` in update 1.0.2.0, 28 Aug 2025); the admin needs the `ShutdownServer` permission in AdminUsers.ini (`76561198000000003[SetGodMode, ShutdownServer]`). https://www.gameserverkings.com/knowledge-base/scum/scum-admin-commands/ . Not usable by a panel (needs a joined player).
- Wiki "Console Commands" section is empty ("To be determined"); no documented stdin console command for stop. A `#RestartServer pretty please` text also appears in one vendor guide (outdated name) https://www.oxygenserv.com/en/complete-guide-2025-how-to-launch-your-scum-server-step-by-step
- Panel conclusion: no RCON/stdin stop is documented; the practical methods are Ctrl+C / console close event, or `taskkill` without `/F`. Whether a CTRL_C_EVENT/CTRL_BREAK sent to a detached process triggers the save was not documented (UNVERIFIED). Do NOT kill by image name `SCUMServer.exe` (would kill every SCUM server on the host) and do not use `/F` (forced kill risks losing the latest state, per guildorder).
- Scheduled restarts are common practice (daily restart suggested) https://guildorder.com/games/scum/wiki/world-backups-and-the-save-database ; one vendor says a restart frees memory https://www.oxygenserv.com/en/complete-guide-2025-how-to-launch-your-scum-server-step-by-step

## Query protocol / player count
- Steam server browser query on the query port (game+2, UDP). Wiki: "Steam server browser query (game port +2)". That implies Steam A2S, but no source names the protocol "A2S" explicitly; the wiki and hosts only say the Steam server browser queries it. Probable but UNVERIFIED for A2S_INFO/A2S_PLAYER specifics (https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup).
- RCON: wiki and EmeraldHost list "TCP 7777 RCON (optional)" with no usage details; GameServerKings states "no server console equivalent and no RCON interface" for admin commands (https://www.gameserverkings.com/knowledge-base/scum/scum-admin-commands/ ); XGamingServer shows `RCONPort=9515`/`RCONPassword` keys (https://xgamingserver.com/docs/scum/server-config). Not usable for a panel without testing. SCUM's admin tooling is in-game chat commands (`#` prefix), AdminUsers.ini needs Steam64 IDs.
- Browser list reliability: new servers can take minutes to hours to show; direct connect by IP:query-port (game+2) in Steam favorites is the recommended route. https://emeraldhost.de/docs-redirect/en/gameserver/scum/join-server , https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup
- Panel health check: process-based is safest (method "process"); gamedig/A2S on game+2 is a plausible optional extra to test.

## Resources
- RAM: wiki says "at least 8GB of RAM to start", rising with players/mods/settings; Windows Server 2012 R2 used 8GB with no clients. CPU not specified. Disk: volume with at least 15GB free; server files "about 8GB" (the wiki; the depot manifest says 15.35 GB installed, so the wiki text is out of date) https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup , https://api.steamcmd.net/v1/info/3792580
- Pterodactyl egg: RAM 12-16 GiB minimum, disk 15 GiB https://eggs.pterodactyl.io/egg/games-scum . GameCP tiers: 1-16 players 3 cores/8 GB; 16-32 players 3.5 cores/10 GB; 32-64 players 4.5 cores/16 GB, 30 GB SSD https://gamecp.com/games/scum/hosting-guide
- Must be 64-bit Windows (exe is 64-bit).

## Windows pitfalls
- Needs Visual C++ redistributables (2012, 2013, 2015-2022) and DirectX End-User Runtimes (wiki). https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup
- Firewall: allow inbound UDP 7777-7779 (game, game+1, game+2) and forward 7777 and 7779 on the router; wiki mentions TCP 7777 only for optional RCON. If the server isn't listed, check firewall, SteamCMD updates, port forwarding. CGNAT from the ISP blocks hosting (vendor guide). Sources: wiki; https://www.oxygenserv.com/en/complete-guide-2025-how-to-launch-your-scum-server-step-by-step
- Autostart: Task Scheduler task "when the computer starts", "Start in" set to the batch file's directory, "Run whether user is logged on or not". Wiki.
- The console window must not be click-selected (pauses output, vendor guide).
- Saves are inside the install (`SCUM\Saved\SaveFiles`), not in the user profile, per the sources above; user-profile saves for the server were not mentioned anywhere.
- Each additional instance needs a unique port set and runs as a separate process (Steam guide). Wiki: monitor CPU/RAM when hosting several.
- BattlEye is active by default; the wiki recommends keeping it enabled.

## Updates
- Re-run the same `app_update 3792580` command (wiki). Hosts recommend a backup before every update (guildorder). Clients must match the server build, so update promptly after a game patch (UNVERIFIED as a documented requirement; inference).
- Steam app updates are frequent (public branch buildid 25803875 on ~2026-10-08, one private branch exists) https://api.steamcmd.net/v1/info/3792580 . `validate` is optional (the wiki's one-liner omits it).

## What a panel must NOT do
- Do not kill by image name SCUMServer.exe (many instances can share a host); track by PID.
- Do not force-kill (`/F`) for a normal stop: the DB is written on graceful shutdown.
- Do not rewrite ServerSettings.ini / AdminUsers.ini while the server runs: they are read at startup and a running server may overwrite edits.
- Do not assume RCON or A2S is available; do not assume ports 7777-7779 free if several SCUM servers are on the host.

## UNVERIFIED
1. Whether `SCUMServer.exe` is the long-running process or a launcher for another exe (no source).
2. Whether ServerSettings.ini is generated on the very first launch or only after some trigger (sources conflict: GameServerKings says generated; removed Steam guide says it needs a save command).
3. Whether sending Ctrl+C / CTRL_BREAK / WM_CLOSE to a hidden or detached process triggers the save-and-exit path (only the visible-console Ctrl+C is documented).
4. Whether the Steam browser query is standard Valve A2S (and which player-count fields it reports); the query port is game+2 by wiki, but `-QueryPort=` semantics are unconfirmed.
5. Whether RCON works at all (TCP 7777 per wiki/EmeraldHost vs 9515 per XGamingServer vs "no RCON interface" per GameServerKings) and how it is enabled.
6. Meaning/names of the "other scum server application" the wiki mentions; 911460 could not be identified.
7. Hard maximum of players and the case-sensitivity of launch flags (-port vs -Port).
8. Whether the `-log` flag is required for the window/log or only for logging; wiki just says "enables logging".
9. Exact RAM need for a hobbyist (sources range from 8 GB to 12-16 GB; no real-install measurement).
10. Exact location and naming of save files (`Saved\SaveFiles\SCUM.db`) on a fresh install (two vendor pages, no official source); `SCUM.db-wal/-shm` behaviour is from a low-reliability Scribd page.
11. Whether the server needs Steam running or any Steam login after install (none of the sources say so; anonymous install is documented).
12. Whether the Steam Community guide 3502203232 content is current (page says it was removed and is "incompatible with SCUM").
13. Whether clients must exactly match the server build (inference).
14. Server mods: not covered by this step (separate step).

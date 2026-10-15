# Soulmask - 01-basics (server basics, conventions section A)
Researched 2026-10-15, read-only web research (nothing installed or run). Facts are for the Soulmask 1.0 server era (guides dated 2025-2026); no exact build number was found.
"Fandom" = official-run wiki page https://soulmask.fandom.com/wiki/Private_Server (wikitext read from the saved file fandom_private.json; the live URL returned HTTP 402 to the fetch tool). It is the closest thing to official docs found and was cited by a Soulmask staff account in a Steam thread (see Steam thread 4330853251140563779).

## 1. SteamCMD
- Store app 2646460 (game). Windows dedicated-server tool app 3017310, Linux 3017300. Source: Fandom ("Command for Download Dedicated Server").
- Anonymous login works. Command (Fandom): `steamcmd +login anonymous +app_update 3017310 validate +quit`.
- With an install dir (games.gg): `steamcmd.exe +login anonymous +force_install_dir C:\SoulmaskServer +app_update 3017310 validate +quit` - https://games.gg/nl/soulmask/guides/soulmask-dedicated-server-setup-guide-10/ . IONOS uses separate lines `login anonymous`, `force_install_dir C:\soulmask-server`, `app_update 3017310 validate` - https://www.ionos.com/digitalguide/server/know-how/soulmask-server.md
- Steam name of the app: "Soulmask Dedicated Server For Windows" (Fandom: default folder `steamapps\common\Soulmask Dedicated Server For Windows`).
- Download size ~5.6 GB per candidates.md (Steam metadata); Fandom says package 1-2 GB, ~20 GB free disk needed to operate; games.gg says 30 GB free minimum.

## 2. Install folder layout (Windows)
- Root contains `StartServer.bat` (Fandom: path `...\Soulmask Dedicated Server For Windows\StartServer.bat`) and `WSServer.exe` (IONOS batch: `start WSServer.exe Level01_Main ...`; Steam thread https://steamcommunity.com/app/2646460/discussions/0/4330853251140024167 same; Fandom FAQ names `WSServer.exe` in the firewall question).
- Game files under `WS\` ; binaries `WS\Binaries\Win64\` (IONOS; Fandom FAQ: `WS/Binaries/Win64/steam_appid.txt` must contain `2646460`). games.gg and a Steam post say the actual shipping binary is `WS\Binaries\Win64\WSServer-Win64-Shipping.exe`. A Steam post (https://steamcommunity.com/app/2646460/discussions/0/4330853251140563779) puts it under `Engine\Binaries\Win64` - conflicting, see UNVERIFIED.
- Saved data under `WS\Saved\` (Fandom "Save path": `WindowsServer/WS/Saved` / Linux `LinuxServer/WS/Saved`; games.gg `WS\Saved\...`).
- Log: `WS\Saved\Logs\WS.log` (Fandom FAQ).

## 3. Executable and Windows process names
- Launcher: `WSServer.exe` at the install root (IONOS, Steam thread 4330853251140024167). Shipping exe: `WSServer-Win64-Shipping.exe` in `WS\Binaries\Win64` (games.gg nl guide; Steam thread 4330853251140563779; search summaries of survivalservers).
- Which one stays running as the real server is NOT confirmed by any source (typical Unreal launcher-then-child pattern, but unverified). Panel advice: match both names as candidates, and prefer tracking the PID of what it launched plus a check on `WSServer-Win64-Shipping.exe`. Do not kill by image name.
- Guides disagree on how to launch: IONOS/Steam use `start WSServer.exe Level01_Main -server %* ...` in a .bat; games.gg runs `WSServer-Win64-Shipping.exe Level01_Main ...` directly; Fandom calls the shipped `StartServer.bat` with extra arguments (`call StartServer.bat -SteamServerName=... -pve`) - Fandom.
- The shipped `StartServer.bat` contents were not found in any source. Its existence, and that it accepts extra args via `%*`/call, are from Fandom and the IONOS batch (`-server %* -log ...`).

## 4. Ports and protocols (defaults)
| Port | Proto | Purpose | Source |
|---|---|---|---|
| 8777 | UDP | game (`-Port`), must be public | Fandom launch-arg table |
| 27015 | UDP | Steam query (`-QueryPort`), must be public | Fandom |
| 18888 | TCP | maintenance/telnet console (`-EchoPort`), local only, no need to open | Fandom |
| 19000 | TCP | RCON (`-rconport`), optional; enabled only with `-rconpsw` | https://xgamingserver.com/docs/soulmask/server-config , https://low.ms/knowledgebase/soulmask-server-configuration (third-party only) |
| 8781 | (unstated) | `-mainserverport` for a multi-map cluster main server | games.gg nl guide |
- Fandom says each game process needs "two UDP ports"; one process per game instance, each instance needs its own bat with its own ports (Fandom note: "Each game instance requires a separate sh/bat launch").
- Port conflict seen: a user had 7777 taken by another game and changed `-Port` (Steam thread 4330853251140024167). Not relevant to defaults but shows ports are freely changeable.
- No "implicit" offset ports documented; the cluster 8781 port is only for clusters.

## 5. Minimal and ideal start command
- Official example (Fandom, Linux form): `./StartServer.sh -SteamServerName='your server name' -MaxPlayers=50 -PSW='yourpassword' -adminpsw='yourGMpassword' -pve -Port=8777 -QueryPort=27015 -EchoPort=18888`
- Windows form (Fandom): `call StartServer.bat -SteamServerName="your server name" -MaxPlayers=50 -PSW="yourpassword" -adminpsw="yourGMpassword" -pve`
- Full raw form (IONOS): `start WSServer.exe Level01_Main -server %* -log -UTF8Output -MULTIHOME=0.0.0.0 -EchoPort=18888 -forcepassthrough -SteamServerName=... -MaxPlayers=10`. games.gg adds `-Port=8777 -QueryPort=27015 -saving=300 -backup=900 -online=Steam -pve|-pvp`.
- First positional argument = level name; "currently there is only one: Level01_Main" (Fandom). games.gg adds a DLC map `DLC_Level01_Main` (Shifting Sands) as a second map (single source).
- Fandom: `-forcepassthrough` "Must be specified"; `-server` "No change needed"; `-log` turns on console output; `-MULTIHOME` local listening address (0.0.0.0 or NIC address). Full per-argument details belong to 03-launch-args.md (handled separately).
- Defaults per the Fandom Engine.ini sample ([Dedicated.Settings]): MaxPlayers=20, backup=900, saving=600; games.gg/German guides say `-saving` default is 300. Conflict - UNVERIFIED which.
- For the panel: simplest is to write its own .bat that runs the same line as IONOS/Fandom (without relying on the shipped StartServer.bat), `-log` for console output, no `start` prefix if the panel wants to own the process.

## 6. First run, saves, naming
- Server needs Steam init to work: log must show `[AppId: 2646460] Game Server API initialized 1` (Fandom FAQ). Failure causes: missing `WS/Binaries/Win64/steam_appid.txt` (single line `2646460`) or ports unavailable (Fandom FAQ).
- Startup is slow: 2-5 minutes until fully initialised and listed (https://low.ms/knowledgebase/soulmask-troubleshooting ; gitlab README says "takes FOREVER to boot").
- Settings file `WS\Saved\GameplaySettings\GameXishu.json` is created after the first server start (games.gg nl guide). `Engine.ini` at `WS\Saved\Config\WindowsServer\Engine.ini` (Fandom); the Steam thread 4330853251140024167 has users complaining that the server did not create Engine.ini, so it may need to be created by the user. See 02-config.md.
- World save: `WS\Saved\Worlds\Dedicated\Level01_Main\world.db` (games.gg nl guide; consistent with hosting-provider restore guides summarised from https://guides.gamehostbros.com/games/soulmask/automatic-backups and nodecraft). DLC map uses `DLC_Level01_Main` folder. The world folder is named after the level, not a user-chosen save name; the panel has no save-name argument to manage.
- Automatic backups are separate `.db` files (provider guides mention names like `auto_0_<number>.db`, which must be renamed to `world.db` to restore) - provider guide only, folder inside the world folder not confirmed.
- Server invitation/direct-connect code: Base36 GUID, 25 chars, generated on first run and printed to console/log as `[SERVER UNIQUE ID:] ...` (Fandom FAQ). Clients can use it to find the server.
- Saved data is inside the install folder, not the Windows user profile (Fandom save path).

## 7. Stopping gracefully / saving
- Fandom: connect `telnet 127.0.0.1 18888`, type `help` to list commands; `quit 30` shuts down after 30 seconds; `saveworld 1` saves. Also an older Fandom section says `quit 180` and "do not directly close the server window, as this may lead to data rollback." Windows needs the telnet client installed (Fandom).
- Linux systemd example saves then quits via telnet: `echo 'saveworld 1' | telnet 127.0.0.1 18888`, then `echo 'quit 1' | telnet ...`; unit uses KillSignal=SIGINT - https://pimylifeup.com/soulmask-server-linux/
- Ctrl+C in the console is claimed to be a controlled shutdown with auto-save (games.gg nl guide, single third-party source). In-game GM command `gm BaoCun` saves manually (Fandom).
- Whether `quit N` itself writes a save is stated by xgamingserver ("saves and then shuts down") but not by Fandom. Safe panel sequence: send `saveworld 1`, wait, then `quit 1` (or `quit 30`); fall back to Ctrl+C. Force-kill is the main cause of save corruption/rollback (low.ms troubleshooting; Fandom).
- The echo port is a plain telnet TCP socket (a panel can talk to it with a raw TCP connection; line format and response text UNVERIFIED).
- RCON (`-rconpsw`, port 19000): third-party sources only; low.ms says RCON clients connect only from IPs listed under `[Server.SafeIP]` in Engine.ini.

## 8. Player count / query
- Steam A2S via UDP QueryPort 27015 (Fandom: "Steam query port"; low.ms says "Steam query port (UDP)"). Server appears in the Steam browser when 8777/27015 are reachable (Fandom FAQ). Whether A2S_PLAYER/A2S_INFO actually return correct player counts was not verified by any source.
- In-game GM command `Debuginfo 1` shows server FPS/online players (Fandom command table) - not usable from a panel.
- Telnet `help` may list a player-list command - UNVERIFIED.

## 9. Resources
- Fandom: single game process needs at least 16 GB memory and 2-4 CPU cores; bandwidth ~100 kbps per player; 20 GB free disk.
- games.gg nl: 16 GB minimum, process alone uses over 12 GB, 24 GB+ recommended; dual core minimum, quad recommended; SSD strongly recommended; Windows 10 64-bit minimum, Win 10/11 recommended.
- low.ms: ~11-12 GB just to start, 16 GB+ with players; known memory leak (usage grows even with nobody online); recommends daily restart. IONOS lists a much lower minimum (6 GB) - outdated/contradicted by the above.
- Max players: default 20 in Engine.ini sample (Fandom); up to 70 per games.gg and low.ms.

## 10. Windows pitfalls
- Steam DLLs: IONOS says copy `steamclient64.dll`, `tier0_s64.dll`, `vstdlib_s64.dll` into `WS\Binaries\Win64` (source of the files not stated by IONOS; may be fixed in later versions). A Steam thread user (citing another) adds `crashhandler64.dll`, copying from a Steam client installation, and says the server then runs without Steam installed (https://steamcommunity.com/app/2646460/discussions/0/4330853251140563779). Others there say keep the Steam client running, don't run the .bat as administrator, or copy the DLLs to System32. Anecdotal, July 2024; whether needed on the current build is UNVERIFIED. A panel must plan a diagnostic for "Steam Dedicated Server API failed to initialize" in WS.log.
- Firewall: allow `WSServer.exe` (Fandom FAQ names this program) and the UDP ports 8777/27015; router NAT needed for those two. Windows will probably show the firewall prompt on first start (not stated, UNVERIFIED).
- Do not run two servers on the same ports; each instance needs distinct Port/QueryPort/EchoPort (and RCON port if used).
- Running Steam client and a game server on the same machine can break Steam init; log hint says try `-NOSTEAM` (Fandom FAQ) - but this server is Steam-only, so only a log hint.
- Visual C++ / DirectX redistributables: no source mentions them.
- Closing the console window stops the server (IONOS) - prompts data loss risk; panel must not close the window as its stop method.

## 11. Updates
- Stop cleanly, back up `WS\Saved\`, re-run the SteamCMD command with the same install dir (3017310, validate), restart (https://www.redswitches.com/blog/soulmask-dedicated-server-setup-the-ultimate-guide/ ; https://docs.berrybyte.net/games/soulmask/update-server.md). Clients and server must be on the same version or they get "running an incompatible version of the game" (berrybyte).
- Validate is advised by the guides; gitlab docker README notes validation is slow and disabled by default there (https://gitlab.com/japtain_cack/soulmask-server). Updating with `-initbackup` suggested after updates (games.gg).
- Mods are a frequent crash source after game updates (low.ms troubleshooting). Mod details are in 04-mods.md.

## 12. Things the panel must NOT do
- Do not kill by image name or close the console window as the stop method (rollback/corruption risk; Fandom).
- Do not expose the EchoPort (18888) or RCON (19000) publicly (Fandom: no need to open; games.gg: restrict telnet to local).
- Do not rely on the shipped StartServer.bat contents (unknown); write own bat.
- Do not use gitlab docker defaults (admin password `Secret123`) as defaults - https://gitlab.com/japtain_cack/soulmask-server/-/raw/master/remco/templates/start.sh (raw/gitlab_start.sh).

## UNVERIFIED
1. Which process stays resident (`WSServer.exe` launcher vs `WSServer-Win64-Shipping.exe`); whether `WSServer.exe` spawns the shipping exe and exits; exact install-relative path of the shipping exe (`WS\Binaries\Win64` per games.gg/IONOS vs `Engine\Binaries\Win64` per one Steam post).
2. Contents of the shipped `StartServer.bat`/`StartServer.sh` and whether `-forcepassthrough` / `-server` are already inside it.
3. Default of `-saving` (600 per Fandom Engine.ini sample and xgamingserver/low.ms; 300 per games.gg).
4. Whether `quit N` performs a save by itself; exact telnet line format, replies, and the `help` command list; whether a player-list command exists.
5. Whether Ctrl+C saves and exits cleanly on Windows (single third-party claim).
6. RCON (`-rconpsw`, `-rconport=19000`, SafeIP in Engine.ini) behaviour - third-party only, not in Fandom; protocol (Source RCON?) not stated.
7. Whether A2S_INFO/A2S_PLAYER on 27015 report correct player counts for a panel.
8. Whether the Steam DLL copy step is still needed on the current build, and where the DLLs come from when Steam isn't installed.
9. Whether `steam_appid.txt` is shipped by the current build (Fandom and a Steam post say it exists in `WS\Binaries\Win64`; a missing one breaks Steam init).
10. Whether Windows Firewall prompts on first start; whether the server uses UPnP (none mentioned).
11. Exact current server build number and last update date; SteamDB/Steam store pages were blocked, so the 5.6 GB size comes from candidates.md and the Fandom 1-2 GB figure conflicts.
12. Whether `Engine.ini` is auto-created on first run (Steam thread says some users saw it missing) and whether `WS\Saved\Worlds\Dedicated\<level>\` naming changes with the DLC map (`DLC_Level01_Main`) for the panel's save folder (single-source).
13. Auto-backup file location/naming (provider guides only), and whether backups rotate.
14. `-MaxPlayers` upper limit (70 per games.gg/low.ms, 40/50 older guides) and `-gamedistindex` meaning (games.gg lists 0-7 without explanation).
15. Cluster flags (`-serverid`, `-mainserverport=8781`, `-clientserverconnect=IP:8781`, `KaiQiKuaFu=1`) are single-source (games.gg nl guide plus search snippets of another Korean/English page); protocol of 8781 unknown.

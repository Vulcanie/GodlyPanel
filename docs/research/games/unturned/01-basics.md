# Unturned: server basics (STEP-basics, conventions section A)

Researched 2026-10-14. Build facts: dedicated server app 1110390, public branch buildid 25613089, last updated 2026-09-30 15:17 UTC (Steam metadata timestamp 1790781427). Game version string not retrieved (UNVERIFIED).
Nothing was run on this PC; every fact below comes from a page that was opened. "Official docs" = the Smartly Dressed Games (SDG) Unturned documentation, which is the same text on https://docs.smartlydressedgames.com/en/stable/ and https://unturned-docs.readthedocs.io/en/latest/ (the raw .rst sources were read at `.../_sources/servers/<page>.rst.txt`).

## 1. SteamCMD command and anonymous login
- Store app 304930 (Unturned, free to play). Dedicated server tool "Unturned Dedicated Server" is app **1110390**: type Tool, oslist windows,linux, `freetodownload=1`, parent 304930. Source: https://api.steamcmd.net/v1/info/1110390
- Official docs use anonymous login, one command at a time in the SteamCMD prompt: `login anonymous`, `app_update 1110390`, `quit`. The same `app_update` command updates an existing install; `validate` can be appended to repair files. Source: https://unturned-docs.readthedocs.io/en/latest/_sources/servers/steamcmd.rst.txt
- One-line form (a third-party Windows guide that runs it): `.\steamcmd +login anonymous +app_update 1110390 validate +quit`. Source: https://kb.firedaemon.com/support/solutions/articles/4000208773-unturned-dedicated-server-as-a-windows-service
- Official update loop script uses the one-line form: `steamcmd.exe +login anonymous +app_update 1110390 +quit`. Source: https://unturned-docs.readthedocs.io/en/latest/_sources/servers/server-auto-restart.rst.txt
- Panel note: GodlyPanel's existing SteamCMD `+force_install_dir` handling should work (FireDaemon guide's install ends in `steamapps\common\U3DS` without it; with `+force_install_dir` the files go in the chosen dir). Whether `+force_install_dir` is fine for this app was NOT tested (see UNVERIFIED). An older wiki page shows `force_install_dir .\unturned\` with `app_update 1110390`: https://unturned.wiki.gg/wiki/Server (page is outdated, only valid for versions before 3.20.12.2).

## 2. Install folder layout
- Default install directory is `...\steamcmd\steamapps\common\U3DS` (Linux `.../steamapps/common/U3DS/`). Source: https://unturned-docs.readthedocs.io/en/latest/_sources/servers/steamcmd.rst.txt
- Steam metadata launch entries: Windows `ServerHelper.bat` (type server), Linux `ServerHelper.sh`. Source: https://api.steamcmd.net/v1/info/1110390
- The official docs say a script `ExampleServer.bat` (LAN) ships in the install ("ExampleServer.bat is an example of a LAN server"). Source: steamcmd.rst.txt above.
- Per-server data: `<install>\Servers\<ServerID>\`. Source: https://unturned-docs.readthedocs.io/en/latest/_sources/servers/server-hosting.rst.txt ("Savedata and configuration files can be found in the ...\U3DS\Servers\ directory. You will see a folder for each server you have created.") Simple-setup servers (run from the Steam Library app) are in `Servers\Default\`.
- Layout inside a server folder (third-party, two independent sources agree):
  - `Server\Commands.dat`, `Server\Adminlist.dat`, `Server\Blacklist.dat` (ban list), `Server\Whitelist.dat` (docker image only)
  - `Config.txt` at the server folder root, one level above `Server\` (official docs for the location; layout below from hosts)
  - `WorkshopDownloadConfig.json`
  - `Level\<MapName>\` world data, `Players\<one folder per player>` player saves, `Workshop\` content
  - Sources: https://emeraldhost.de/docs-redirect/en/gameserver/unturned/download-savegame , https://hub.docker.com/r/gzordrai/unturned-server , https://www.gameserverkings.com/knowledge-base/unturned/configuration-overview.md
- Logs: FireDaemon's guide says the server log is at `U3DS\Logs\Server_<Server Name>.log` (source: kb.firedaemon.com link above). The docker README did not mention it; fine.
- Windows download size: depots 1004 (67,863,136 B) + 1110391 (234,393,404 B) + 1110393 (1,555,223,482 B, shared OS-less content) + 1110394 (6,200,727 B) = 1,863,680,749 bytes, about 1.86 GB (1.74 GiB) for Windows. The Linux depots (1006, 1110392) are not downloaded on Windows. Source: https://api.steamcmd.net/v1/info/1110390 (sum computed here). This tightens candidates.md's "1.3-2.9 GB" to roughly 1.9 GB before saves/Workshop content.

## 3. Server executable and Windows process name
- The real server binary is **`Unturned.exe`** in the install root. Official docs' Windows update loop launches `...\steamapps\common\U3DS\Unturned.exe -batchmode -nographics +InternetServer/MyServer`. Source: https://unturned-docs.readthedocs.io/en/latest/_sources/servers/server-auto-restart.rst.txt
- FireDaemon service config: Program `...\U3DS\Unturned.exe`, working directory the U3DS folder, parameters `-batchmode -nographics +InternetServer/<Server Name>` (or `+LANServer/<Server Name>`). Source: https://kb.firedaemon.com/support/solutions/articles/4000208773-unturned-dedicated-server-as-a-windows-service
- `ServerHelper.bat` is a launcher, not the server. A 2019 forum post reproducing it (not official, may be out of date): `start Unturned.exe -batchmode -nographics %*` then `exit`. So the bat exits immediately and `Unturned.exe` stays running. Source: https://steamcommunity.com/app/304930/discussions/0/1628538707057525924/ (MoltonMontro, 25 Sep 2019). The official docs' tip says "start "" "%~dp0ServerHelper.bat" +InternetServer/MyServer" (steamcmd.rst.txt).
- Process to match in the panel: `Unturned.exe`. **Do NOT kill by image name**: the game client on the same PC is also `Unturned.exe` (client launches via the same exe name per the old wiki page that says the client `Unturned.exe` is used with the same flags: https://unturned.wiki.gg/wiki/Server). Track the PID of the process the panel started instead. (The reasoning that the client shares the image name rests on that wiki page plus the docs' "Launch ... from Steam Library" usage; see UNVERIFIED.)
- Linux uses `./ServerHelper.sh +InternetServer/MyServer` (steamcmd.rst.txt). Not relevant for the Windows panel.

## 4. Ports and protocols
- Each server uses **two consecutive UDP ports**, default **27015 and 27016**. "The first is for server list queries, and the second for in-game traffic." Setting a different value with the `Port` command uses that value and value+1; the docs recommend 27015, 27017, 27019 for first, second, third servers. Forward UDP only (rule: "Enable UDP protocol", range 27015-27016). Source: https://unturned-docs.readthedocs.io/en/latest/_sources/servers/port-forwarding.rst.txt
- `Port [Number]`, default 27015, config-time command: "Unturned also uses the next port (27016 by default)". Source: https://unturned.wiki.gg/Commands
- Port forwarding is only needed for direct IP / domain joins. Since 3.23.14.0, Server Codes (17-digit, Steam Datagram Relay) or Fake IP (`Use_FakeIP` = true in the server config, `CopyFakeIP` console command) work without forwarding. Sources: port-forwarding.rst.txt; https://unturned-docs.readthedocs.io/en/latest/_sources/servers/fake-ip.rst.txt ; https://unturned-docs.readthedocs.io/en/latest/_sources/servers/server-codes.rst.txt
- Conflict on which of the two ports is the query port: official docs say the first (27015) is queries and the second (27016) is game traffic; the Docker image README says 27015 is the game port and 27016 the Steam query port ("set automatically to the game port + 1"); the GameDig library has `unturned: port 27015, port_query_offset 1, protocol valve` (query on 27016). Sources: port-forwarding.rst.txt, https://hub.docker.com/r/gzordrai/unturned-server , https://raw.githubusercontent.com/gamedig/node-gamedig/master/lib/games.js . Which one actually answers A2S is UNVERIFIED (see below). Forwarding both UDP ports covers either case.
- RCON port: none in vanilla (see section 8). If RocketMod RCON is used it is TCP, one host guide says game port + 2 (27017): https://hosthavoc.com/wiki/game-servers/unturned/use-rcon (single third-party source).

## 5. Minimal working start command
- Official, from the install folder, LAN (no GSLT needed): `start "" "%~dp0ServerHelper.bat" +LanServer/MyServer` (batch file). Internet: `... +InternetServer/MyServer`. Source: steamcmd.rst.txt.
- Direct form used in the official auto-restart script: `Unturned.exe -batchmode -nographics +InternetServer/MyServer` (server-auto-restart.rst.txt); LAN form `+LANServer/<name>` (FireDaemon page). `-batchmode` = "Run in batch mode"; `-nographics` = "Do not initialize the graphics device when running in batch mode" (https://unturned-docs.readthedocs.io/en/latest/about/launch-options.html). `+LanServer` vs `+LANServer` casing both appear in sources (docs vs FireDaemon); case sensitivity was not tested.
- "MyServer" is the ServerID, i.e. the folder name under `Servers\` (steamcmd.rst.txt). It is NOT the name shown in the server list; that is the `Name` command in `Commands.dat` (wiki.gg/Commands: Name, 5 to 50 characters, default "Unturned").
- Internet servers: servers are LAN-only by default; a Game Server Login Token (GSLT) is needed "when hosting an Internet server", plus Fake IP or port forwarding. GSLT is created at https://steamcommunity.com/dev/managegameservers for app **304930** (the game, not the server tool). Set it with `Login_Token` under `Browser` in the server config, or the `GSLT <token>` command in `Commands.dat` or on the command line. "Servers without a GSLT are considered 'anonymous' and are hidden from the Internet server list." Source: https://unturned-docs.readthedocs.io/en/latest/_sources/servers/game-server-login-tokens.rst.txt and server-hosting.rst.txt. Do not store a real token in research notes.
- Settings in `Commands.dat` (one command per line, `//` comments), official example: `Name`, `Map PEI`, `MaxPlayers 24`, `Owner <steamID64>`, `Cheats`, `Password`, `PvE`, `Perspective Both`, `Port 27015`. Source: server-hosting.rst.txt. Full list of commands is its own research step (https://unturned.wiki.gg/Commands).
- Other documented flags useful to a panel: `-NoDefaultLog` ("Disables log file creation unless a plugin calls setLogFilePath"), `-HostPlayerLimit=<int>`, `-LegacyConsole` ("Use the legacy console rather than the default threaded console"), `-NoDefaultConsole` (command-io page), `-GameplayConfigFile="<name>"`, `-LogGameplayConfig`. Sources: launch-options.html, command-io.rst.txt, server-configuration.rst.txt (all under unturned-docs.readthedocs.io).

## 6. First-run behaviour, saves, naming
- First launch with a new ServerID generates the config files: "it will need to generate your server's configuration files ... You should see 'Loading level: 100%' when the server has finished loading (and generated all necessary files). Use the Shutdown command ... to safely save and close", then the folder `Servers\<ServerID>\` exists. Source: steamcmd.rst.txt.
- Which files exist exactly after first run (is `Server\Commands.dat` already created, with what content?) was not documented; sources describe the files but not the first-run content. UNVERIFIED.
- `Config.txt` is current (3.25.8.0+); older servers have `Config.json`, auto-converted to per-difficulty `Config_NormalDifficulty.txt` etc. Generated comments start with `>`. Empty values mean default. Source: https://unturned-docs.readthedocs.io/en/latest/_sources/servers/server-configuration.rst.txt
- Saves: world data under `Servers\<ServerID>\Level\<MapName>\`, players under `Players\` (host docs above). There is **no autosave**: "There is no built-in autosave feature. You must use the Save command ... or the Shutdown command to safely save and close". Source: server-hosting.rst.txt. The `Save` command "Forces a full save of the server state" (wiki.gg/Commands).
- Saves live inside the install folder (no user-profile save folder found in the sources).

## 7. Graceful stop and saving on exit
- Console command `Shutdown [Delay]/[Explanation]` "Saves the server state, disconnects clients, and closes the server"; with no parameters it shuts down immediately. Source: https://unturned.wiki.gg/Commands
- `Shutdown` is typed into the Server Console window or, for admins, in chat prefixed by `@` or `/` (server-hosting.rst.txt).
- Ctrl+C: FireDaemon's guide sets "Console Program: Checked, Shutdown By: Ctrl+C (the server needs Ctrl+C to shut down gracefully)". Source: kb.firedaemon.com link above. It does not say Ctrl+C saves; saving on Ctrl+C is UNVERIFIED.
- Scheduled shutdown and update-shutdown settings exist (the docs call them `Enable_Scheduled_Shutdown`, `Scheduled_Shutdown_Time`, `Scheduled_Shutdown_Warnings`, `Enable_Update_Shutdown`, `Update_Steam_Beta_Name`, `Update_Shutdown_Warnings`), and the docs recommend a restart "once every 24 hours". The page still says they are in `Config.json`; since Config.txt replaced it, treat the location as stale. Source: https://unturned-docs.readthedocs.io/en/latest/_sources/servers/server-auto-restart.rst.txt
- Whether the panel can type `Shutdown` into the process's stdin (redirected input) rather than a real console window is UNVERIFIED. Launch-options docs mention a "threaded console" default and `-LegacyConsole` alternative, which may matter for piping.

## 8. Query protocol for player counts
- A2S (Steam server query, UDP) is supported: "The info screen uses Steam's A2S protocol, which can only be queried by IP". Source: server-codes.rst.txt. Join-by-Server-Code skips that A2S info screen.
- GameDig supports it as `unturned` with the Valve protocol (so server name, map, player count via A2S). Source: https://raw.githubusercontent.com/gamedig/node-gamedig/master/lib/games.js (`port: 27015, port_query_offset: 1, protocol: 'valve'`) and https://github.com/gamedig/node-gamedig/blob/master/GAMES_LIST.md.
- Query only works for a server that actually answers on the Steam query port; whether a LAN-mode or GSLT-less ("anonymous") server answers A2S the same way was not documented. UNVERIFIED.
- RCON: vanilla Unturned has no RCON; it is a plugin-framework feature. The official command list has no RCON entry (https://unturned.wiki.gg/Commands, read: no Rcon/RconPort). Rocket RCON is in `Rocket.config.xml` (`RCON` block), telnet-style, third-party: https://hosthavoc.com/wiki/game-servers/unturned/use-rcon . Not a panel default.
- Recommendation for the template: method `gamedig` (game id `unturned`) plus a process check; fall back to `process` if A2S proves unreliable on first test.

## 9. Memory, CPU, disk
- No official figure found. Hosting-vendor guidance (IONOS): minimum 2 cores at 2.4 GHz; RAM 2 GB for 2-4 players, 3 GB for 5-8, 5 GB for 24; disk at least 4 GB; more with mods. Source: https://www.ionos.com/digitalguide/server/know-how/unturned-server-hosting/ (reached through a search summary; the IONOS page itself was not opened, so treat as UNVERIFIED).
- Official docs recommend restarting every 24 hours "as much of the game's older code still uses single-precision floating point time" (server-auto-restart.rst.txt).

## 10. Windows pitfalls
- FireDaemon's Windows guide has an install step "Install the Microsoft DirectX End-User Runtime" (kb.firedaemon.com link). Whether it is truly required is not stated beyond that list.
- Firewall prompt on first run, UPnP: not covered by the sources. UNVERIFIED. (Server Codes / Fake IP avoid forwarding per the official docs.)
- Settings are changed while the server is stopped: "Most settings cannot be configured while the server is open." (server-hosting.rst.txt)
- Running two servers on one PC requires the SteamCMD install, not the Steam Library tool: "It is not possible to run multiple servers at once—from the same computer—without using SteamCMD." Each needs its own `Port` (+2 per server). Source: steamcmd.rst.txt, port-forwarding.rst.txt.
- Steam client must not be running the Library "Unturned Dedicated Server" app at the same time as a panel-managed server on the same ports (inference; UNVERIFIED).
- The launcher console window: `ServerHelper.bat` uses `start ... exit` (2019 forum copy), so a panel that waits on the bat sees it end immediately. Launch `Unturned.exe` directly with `-batchmode -nographics +InternetServer/<ID>` as the official auto-restart script does, or track the child process.

## 11. Updates
- Update by re-running `app_update 1110390` (steamcmd.rst.txt). Server can detect updates itself and shut down (`Enable_Update_Shutdown`) so a wrapper script can update and restart; official loop in server-auto-restart.rst.txt. Workshop mods and map updates: the server "monitors for changes to the hosted map ... notifies players via chat and shuts down the server after a timer" (https://unturned-docs.readthedocs.io/en/latest/_sources/servers/dedicated-workshop-update-monitor.rst.txt). Workshop items listed in `WorkshopDownloadConfig.json` (`"File_IDs": [ ... ]`) are installed and updated at startup; players download them when connecting (server-hosting.rst.txt).
- Update announcements: Steam news https://store.steampowered.com/news/app/304930 and RSS https://smartlydressedgames.com/rss/unturned-steam-dedicated-server-updates.xml (server-update-notifications.rst.txt).
- Branches: public and `preview` (Update_Steam_Beta_Name, server-auto-restart.rst.txt).

## 12. What the panel must NOT do
- Do not kill by image name `Unturned.exe` (the player's game client uses the same exe; see section 3 caveat).
- Do not stop by hard kill when a graceful stop is available: there is no autosave, so unsaved world and player progress is lost.
- Do not run `app_update ... validate` casually on a live install with Workshop/plugin content without checking (Klei-style deletion was documented for DST, not for Unturned; no Unturned-specific warning found). No claim here.
- Do not store the GSLT token in plain logs or in the repo; it is a Steam credential for the server.
- Do not assume `Config.json`; new servers use `Config.txt`.
- Do not write the internet-server flag silently: a server without a GSLT is hidden from the list (that is a normal state for a friends-only server).

## Sources used (all opened)
- https://unturned-docs.readthedocs.io/en/latest/_sources/servers/{steamcmd,server-hosting,port-forwarding,game-server-login-tokens,fake-ip,server-codes,server-configuration,server-auto-restart,command-io,dedicated-workshop-update-monitor,server-update-notifications,rocket,openmod}.rst.txt
- https://docs.smartlydressedgames.com/en/stable/servers/{server-hosting,steamcmd,port-forwarding,game-server-login-tokens}.html (same pages)
- https://unturned-docs.readthedocs.io/en/latest/about/launch-options.html
- https://unturned.wiki.gg/Commands , https://unturned.wiki.gg/wiki/Server
- https://api.steamcmd.net/v1/info/1110390
- https://kb.firedaemon.com/support/solutions/articles/4000208773-unturned-dedicated-server-as-a-windows-service
- https://steamcommunity.com/app/304930/discussions/0/1628538707057525924/
- https://raw.githubusercontent.com/gamedig/node-gamedig/master/lib/games.js
- https://hub.docker.com/r/gzordrai/unturned-server , https://emeraldhost.de/docs-redirect/en/gameserver/unturned/download-savegame , https://www.gameserverkings.com/knowledge-base/unturned/configuration-overview.md , https://hosthavoc.com/wiki/game-servers/unturned/use-rcon

## UNVERIFIED
1. Which of the two UDP ports (27015 vs 27016) answers Steam A2S queries; official docs say first = queries, Docker README and GameDig say query = game port + 1. Needs a real server and an A2S probe.
2. Whether `+login anonymous` plus `+force_install_dir <dir>` plus `+app_update 1110390` works end to end (docs use anonymous login; metadata says free; no real run done here).
3. Contents of the real `ServerHelper.bat` and `ExampleServer.bat` in today's build (only a 2019 forum copy was read).
4. Whether `Unturned.exe` with `-batchmode -nographics` is still the correct Windows process in the current build and whether any helper process stays (e.g. a console host); only docs examples confirm the launch line.
5. That the client and server share the image name `Unturned.exe` on a PC with the game installed (client exe name not directly confirmed by an opened source for the current build).
6. Whether Ctrl+C saves the world before exit, and whether the panel can send `Shutdown` through redirected stdin.
7. Files created on first run and the first-run content of `Server\Commands.dat`, `Config.txt` (did Commands.dat exist before a user edit?).
8. How to pass `GSLT`, `Port`, `Name`, `Map` on the command line (docs say GSLT "can be specified ... on the command-line" but give no syntax); safest is to write them in `Commands.dat`.
9. Exact case-sensitivity of `+LanServer` vs `+LANServer`.
10. Official RAM/CPU requirements (only the IONOS vendor figure, itself seen via search summary).
11. Whether a Windows firewall prompt appears and whether UPnP is used.
12. Current game/server version string.
13. Whether the DirectX End-User Runtime or any VC++ redistributable is actually required (only a third-party guide lists DirectX).
14. Whether an A2S-queryable server appears for LAN-mode servers and without a GSLT.
15. Whether the "Steam Library Unturned Dedicated Server" tool and a SteamCMD install conflict if both run.

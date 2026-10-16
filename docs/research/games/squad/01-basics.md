# Squad - 01 basics (final; researched 2026-10-15; read-only web research, nothing installed or run)
Build: no source states a build number; facts are as the pages read on 2026-10-15. Unreal Engine game.

Source keys (WIKI = the official Offworld wiki; squad.fandom.com returns HTTP 402 to the direct fetch, but the pages WERE readable through the r.jina.ai text mirror; Server_Administration page was blocked by a bot check and is NOT read):
- [WI] https://squad.fandom.com/wiki/Server_Installation (read via https://r.jina.ai/https://squad.fandom.com/wiki/Server_Installation)
- [WC] https://squad.fandom.com/wiki/Server_Configuration (read via r.jina.ai mirror)
- [WL] https://squad.fandom.com/wiki/Server_licensing (via mirror)
- [RS] https://www.redswitches.com/blog/squad-dedicated-server-setup-windows-linux-ports-and-licensing/ (third party)
- [ESA] https://esagames.ro/how-to-make-a-squad-server.php (third party)
- [LOWMS] https://low.ms/knowledgebase/squad-server-configuration (third party)
- [XG] https://xgamingserver.com/docs/squad/server-cfg-reference (third party)
- [XGC] https://xgamingserver.com/docs/squad/admin-console-commands (third party)
- [CM2] https://hub.docker.com/r/cm2network/squad (third-party Docker image)
- [PTERO] https://eggs.pterodactyl.io/egg/games-squad and https://raw.githubusercontent.com/pelican-eggs/games-steamcmd/main/squad/egg-squad.json
- [SJS] SquadJS: https://raw.githubusercontent.com/Team-Silver-Sphere/SquadJS/master/squad-server/index.js , .../squad-server/rcon.js , https://github.com/Team-Silver-Sphere/SquadJS
- [GD] GameDig: https://raw.githubusercontent.com/gamedig/node-gamedig/master/protocols/squad.js , .../protocols/epic.js , .../lib/games.js
- [GHB] https://www.gamehostbros.com/guides/games/squad/rcon

## SteamCMD
- Server app 403240; Public Testing app 774961 [WI]. Anonymous login: `login anonymous` in the official update script [WI].
- Official update script `update_squad.txt` [WI]: `@ShutdownOnFailedCommand 1`, `@NoPromptForPassword 1`, `force_install_dir ../squad_server`, `login anonymous`, `app_update 403240 validate`, `quit`. One-liner form: `steamcmd +login anonymous +force_install_dir ./squadserver +app_update 403240 validate +quit` [ESA].
- Beta branches: `-beta <name> -betapassword <pw>` added to app_update [WI].
- Size ~14.9 GB (candidates.md, Steam metadata). Installed build id is `buildid` in `appmanifest_403240.acf` [RS].
- Server uses Workshop mods from app 393380 (the game), not 403240 [RS][PTERO].

## Folder layout / executable
- Windows exe: `SquadGame\Binaries\Win64\SquadGameServer.exe` [WI start server.bat: `SET SQUADSERVER=C:\squad\SquadGame\Binaries\Win64\SquadGameServer.exe`; also RS]. Process image name to match: `SquadGameServer.exe`. (candidates.md said `SquadServer.exe`; no source supports that - treat that as wrong.)
- Linux: `SquadGame/Binaries/Linux/SquadGameServer` or `SquadGameServer.sh` [PTERO][ESA]. Not needed on Windows.
- Config folder `<install>\SquadGame\ServerConfig\` [WI]. Files listed by the wiki: Admins.cfg, Bans.cfg, CustomOptions.cfg, ExcludedFactions.cfg, ExcludedFactionSetups.cfg, ExcludedLayers.cfg, ExcludedLevels.cfg, LayerRotation.cfg, LevelRotation.cfg, License.cfg, Motd.cfg (optional), Rcon.cfg, RemoteAdminListHosts.cfg, RemoteBanListHosts.cfg, Server.cfg, ServerMessages.cfg, VoteConfig.cfg [WI]. (Other guides add Whitelist.cfg, LayerVoting.cfg, LayerVotingLowPlayers.cfg [LOWMS][RS] - not in the wiki list.) NOTE: there is no `MapRotation.cfg`; the rotation files are LayerRotation.cfg / LevelRotation.cfg [WI][WC]. MOTD: wiki says filename must be uppercase `MOTD.cfg` on Unix, while its file list writes Motd.cfg [WC][WI].
- Logs: `<install>\SquadGame\Saved\Logs` (SquadJS example `C:/servers/squad_server/SquadGame/Saved/Logs`) [SJS README]. Ready line in log: `LogInit: Display: Engine is initialized.` (a panel guide, https://loafhosts.com/guides/squad-server-hosting-setup-guide); the Pterodactyl egg waits for "Engine Initialization" before it allows stop [PTERO].
- Mods: `SquadGame\Plugins\Mods\` [RS][PTERO].
- Launcher vs shipping exe: the wiki launches SquadGameServer.exe directly; whether it spawns a child process is UNVERIFIED.

## Ports
Official table [WI]:
| Purpose | Protocol (wiki) | Port |
|---|---|---|
| Game | UDP | 7787, 7788 |
| Beacon | UDP and TCP | 15000 |
| Steam query | UDP and TCP | 27165 |
| Steam query +1 | UDP and TCP | 27166 |
| RCON | UDP and TCP | 21114 |
| Ephemeral (client connections) | UDP | 30000+ |
- Those are the firewall ports; the wiki's netsh script opens each for both TCP and UDP [WI]. Defaults when no flag: the wiki never states them ([WC] only shows examples); the example values 7787 / 27165 / 15000 / 21114 are the de-facto defaults (Docker image defaults [CM2]; egg defaults [PTERO]). RCON default port 21114 in Rcon.cfg [WC via mirror].
- Panel suggestion (inference, not a source): list Game 7787, Query 27165, Beacon 15000, RCON 21114 as explicit ports; treat 7788 (game+1) and 27166 (query+1) as implicit ports with +1 offsets [PTERO lists game+1 and query+1 as needed allocations].
- Beacon port must be unique per server; wiki recommends +5 spacing between servers [WC].

## Start command
Official Windows start script [WI]: `start %SQUADSERVER% Port=7787 QueryPort=27165 FIXEDMAXPLAYERS=80 beaconport=15000 RANDOM=NONE -log`
Full parameter list [WC]: `MULTIHOME` (IP to bind, only for multi-IP hosts), `Port`, `QueryPort` (Steam query port), `beaconport`, `RANDOM` (ALWAYS / FIRST / NONE; map-rotation randomisation), `FIXEDMAXPLAYERS` (hard cap), `FIXEDMAXTICKRATE`, `PREFERPREPROCESSOR` (CPU affinity, marked untested), `-log` (log window), `-fullcrashdump`. Wiki example: `SquadGameServer.exe MULTIHOME=1.2.3.4 Port=7787 QueryPort=27165 beaconport=15000 FIXEDMAXPLAYERS=100 FIXEDMAXTICKRATE=40 RANDOM=NONE -log`.
- RCON also has command-line equivalents: `RCONIP`, `RCONPORT`, `RCONPASSWORD`, `RCONMAXCONNECTIONS`, `RCONSECONDSBEFORETIMEOUTCHECK` [WC]. So the panel can pass the RCON port/password as launch args instead of Rcon.cfg.
- Arguments are bare `Name=value` (no dash); `-log` and `-fullcrashdump` are dash flags [WC].
- Pelican/Pterodactyl egg Linux form: `SquadGameServer SquadGame Port=... QueryPort=... -beaconport=...` [PTERO] (note the Linux egg also writes ServerName/MaxPlayers etc. into Server.cfg before each start).
- Minimal/ideal (inference from the above): `SquadGameServer.exe Port=7787 QueryPort=27165 beaconport=15000 FIXEDMAXPLAYERS=<n> RANDOM=NONE -log RCONPORT=21114 RCONPASSWORD=<pw>` (RCON args from [WC]; combined line itself not run).

## First-run behaviour
- Config files live in ServerConfig; docker image edits an existing Server.cfg in the install [CM2]; the wiki sample Server.cfg defaults are in 02-config territory. Which files exist right after first install (vs created by the user): UNVERIFIED. Bans.cfg is written by in-game/RCON bans [WC/LOWMS].
- Server shows as "Squad Dedicated Server", no password on a fresh install (panel guide above). First start: SteamCMD update may run (Docker/egg update on start) [CM2][WI].
- Saves/world: Squad is match-based; no persistent save folder is documented by any source. Demo recording (`RecordDemos`) writes server demos [WC][XG]. "No saves" itself: UNVERIFIED.
- Licensing: unlicensed servers appear only in the Custom Server Browser; licensed (>=60 slots and >=10 admins per instance) appear in the main browser; the key is placed in a config file (License.cfg per [WI] file list; the key format/file contents are not documented) [WL][WI].

## Stopping / saving
- Official wiki (Linux) stop procedure: attach to the screen session and press Ctrl+C [WI]. The Pterodactyl/Pelican egg's stop value is `^C` (SIGINT) [PTERO]. So graceful stop = Ctrl+C (interrupt) of the process; on Windows how to deliver it to a hidden/background process: UNVERIFIED.
- No RCON or console command to shut the server down is documented anywhere I could read: SquadJS issues no such command [SJS rcon.js]; command lists [XGC][ESA-cmds https://esagames.ro/squad-admin-commands.php] have none. The Admins.cfg permission `manageserver` is described as "shut down the server" [WC], but the command it unlocks is not named - UNVERIFIED (do not assume AdminShutdown).
- Nothing to save on exit (no persistent world documented). A restart disconnects players.
- Do NOT kill by image name when several servers run (all are SquadGameServer.exe); track the PID/command line.

## Query protocol / player count
- RCON (TCP 21114): Squad's own RCON protocol; a vendor page says Squad works with Source RCON (https://www.esegece.com/websockets/apis/rcon) and SquadJS uses it, but exact framing is unverified here (UNVERIFIED packet quirks; SquadJS code `utils`/core rcon file not read).
- RCON commands confirmed in SquadJS rcon.js [SJS]: `ShowCurrentMap` ("Current level is X, layer is Y"), `ShowNextMap`, `ListPlayers` (ID, Online IDs, Name, Team ID, Squad ID, Is Leader, Role...), `ListSquads`, `AdminBroadcast`, `AdminSetFogOfWar`, `AdminWarn`, `AdminBan`, `AdminForceTeamChange`.
- `ShowServerInfo` over RCON returns JSON (SquadJS does `JSON.parse`) containing serverName, maxPlayers, playerCount, publicQueue, reserveQueue, currentLayer, nextLayer fields [SJS index.js]. Best candidate for a panel player count (needs RCON password).
- Steam A2S on the query port 27165: the wiki calls QueryPort the "Steam query port" and server lists use it, but no source states A2S_INFO/A2S_PLAYER responses or their content; a user issue ("A2S check ... timeout for external servers ... 27165/udp", github.com/seregatipich/squad-admin-panel issue 127, only seen in a search snippet, page 404) suggests it is attempted in practice. => A2S behaviour UNVERIFIED.
- GameDig has a `squad` protocol but it queries Epic EOS matchmaking (cloud API using embedded credentials), NOT the server's query port [GD]. Not suitable for a panel.

## Requirements
- Windows prerequisites [WI]: Visual C++ Redistributables 2013 and 2015, latest C++ Redistributable, DirectX End-User Runtimes (June 2010).
- Close the Steam client before running the server, or it won't start; allow SquadGameServer.exe through the firewall; hosting and playing on one network needs NAT loopback; if hosting and playing on one PC start the server before Steam/Squad [WI].
- RAM/CPU: wiki gives no minimum [WL says no hardware minimums]. Third-party: "official policy" 8 GB + 4 GB per extra instance; estimates 16 GB at 50 players, 32 GB at 80, 32-64 GB at 100; strong single-core CPU [RS] (RS wording, not official).
- Hosting on VM/VPS not allowed only for licensed servers [RS]; wiki [WL] only says rented-hardware responsibilities (so that claim UNVERIFIED).

## Windows pitfalls
- Firewall prompts: allow SquadGameServer.exe + open ports above (netsh script provided in [WI]).
- Steam client must be closed on the server machine [WI].
- UPnP, user-profile save folders: UNVERIFIED.

## Updates
- Re-run the SteamCMD update script (`app_update 403240 validate`) with the server stopped; Docker image updates at container start [WI][CM2]. Mods must be re-checked after updates [RS].

## Mods (pointer to a later step)
Workshop item download via SteamCMD `workshop_download_item 393380 <id>` then copy into `SquadGame\Plugins\Mods\` [RS][PTERO]; wiki links a separate "Uploading a mod to a dedicated server" page [WI] (not read).

## UNVERIFIED
1. Whether SquadGameServer.exe is a launcher with a child shipping process.
2. Default port values when the flags are omitted (wiki shows only examples).
3. Windows method for a graceful Ctrl+C stop; any command behind the `manageserver` ("shut down") permission.
4. Whether anything is saved/needs saving on exit (no persistent save documented).
5. Which config files exist after first install; License.cfg key format/contents.
6. Steam A2S (A2S_INFO / A2S_PLAYER) support on 27165, and its player-count accuracy.
7. RCON wire framing details (Source RCON compatibility is vendor-claimed); RCON UDP use claimed by the wiki table.
8. Need for/role of 7788, 27166, beacon 15000 (the wiki lists them; whether required for a working server is not stated).
9. Whether VMs are forbidden for unlicensed servers (RS claim for licensed only; not on wiki).
10. Server_Administration wiki page (RCON/console command list) was blocked by a bot check; its content was not read.
11. Minimum RAM/CPU (no official figure).
12. Meaning/exact behaviour of FIXEDMAXPLAYERS vs Server.cfg MaxPlayers interaction (wiki says it is not explained).

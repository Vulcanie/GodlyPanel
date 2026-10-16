# Squad - launch arguments (conventions section C)

Game: Squad. Store app 393380; dedicated server tool app 403240 (`+login anonymous` shown in the wiki's own SteamCMD script). Facts as of the Squad wiki pages last edited 2025-12-08 (Server Configuration) and 2025-08-18 (Server Installation); researched 2026-10-15. No server was installed or run.

## Sources (all opened)
- W1 = official Squad wiki, Server Configuration, wikitext read via the MediaWiki API (the normal page returns HTTP 402/Cloudflare to scripted fetches): https://squad.fandom.com/wiki/Server_Configuration  (API: https://squad.fandom.com/api.php?action=parse&page=Server_Configuration&prop=wikitext&format=json)
- W2 = official Squad wiki, Server Installation (same API method): https://squad.fandom.com/wiki/Server_Installation
- D1 = community Docker image README (cm2network/squad), env vars it maps to launch args: https://github.com/CM2Walki/Squad (README.md)
- O1 = OpenGamePanel's Squad Windows template (third party, shows which args a panel passes): https://github.com/OpenGamePanel/OGP-Website/blob/master/modules/config_games/server_configs/squad_win64.xml
- G1 = third-party guide (RedSwitches 2026): https://www.redswitches.com/blog/squad-dedicated-server-setup-windows-linux-ports-and-licensing/

## Executable and location
- Windows exe: `SquadGame\Binaries\Win64\SquadGameServer.exe` (W1 example, W2 Windows bat, O1 `server_exec_name` + `exe_location`). Linux: `SquadGameServer.sh` (W1, W2).
- NOTE: candidates.md says `SquadServer.exe`; the wiki and OGP both say `SquadGameServer.exe`. Use `SquadGameServer.exe`. Whether a child process with a different name (UE4 shipping exe) is spawned from it on Windows is UNVERIFIED (matters for the panel's processName).
- Config folder: `SquadGame\ServerConfig\` (W1 "Files"). Logs: `SquadGame/Saved/Logs/SquadGame.log` (O1 `console_log`; not on the wiki). Game.ini lives in `Saved\Config\WindowsServer` (W1 Tournament Mode section, "run the server at least once to generate").

## Form rule (important for the panel)
Squad's own arguments are written `KEY=value` with NO leading dash and NO space (W1, W2 examples: `Port=7787 QueryPort=27165 ...`). Only `-log` and `-fullcrashdump` carry a dash (W1). Keys were shown in mixed case (`Port`, `QueryPort`, `beaconport`, `MULTIHOME`, `FIXEDMAXPLAYERS`); whether the server treats keys case-insensitively is UNVERIFIED, so write them exactly as the wiki does.

## Table 1 - game / launch arguments on the wiki command-line list (W1 "Command Line")

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `Port=` | `Port=7787` (equals, no dash) | value | Game port | Port players connect to (UDP). The wiki's firewall list says the game also uses the next port, 7788, so reserve both. | Network | `Port=7787` | integer port | 7787 (wiki examples; D1 default PORT=7787) | YES (port) | W1 list "Game port"; W2 "Ports to Open": Game port = UDP 7787 + 7788 |
| `QueryPort=` | `QueryPort=27165` | value | Steam query port | Port the Steam server browser and query tools ask for server info. | Network | `QueryPort=27165` | integer port | 27165 (W1/W2 examples; D1) | YES (port) | W1 list "Steam query port"; W2 (also opens 27166 = query port+1) |
| `beaconport=` | `beaconport=15000` (lower-case in wiki) | value | Beacon port | Wiki only says: adjust only if you run more than one server; each server MUST have a unique one; recommended spacing +5. Purpose not explained by the wiki. | Network | `beaconport=15000` | integer port | 15000 (W2/D1) | YES (port, default 15000) | W1 list; W2 ports "Beacon Port = UDP and TCP 15000" |
| `MULTIHOME=` | `MULTIHOME=1.2.3.4` | value | Bind IP address | IP address to bind the server to. Use only if the machine has several IPs. | Network | `MULTIHOME=192.168.1.20` | an IPv4 address | not set (optional) | no (optional, advanced) | W1 list "(Optional)"; W1 example; D1; O1 `MultiHome=` |
| `FIXEDMAXPLAYERS=` | `FIXEDMAXPLAYERS=80` | value | Hard player cap | Player count cannot go higher than this. Optional. | Server | `FIXEDMAXPLAYERS=100` | integer | wiki examples 80/100; Docker default 80 (D1); Server.cfg `MaxPlayers=100` is the separate in-config value (W1 Server.cfg block) | YES (max players) | W1 list; W2; D1 |
| `FIXEDMAXTICKRATE=` | `FIXEDMAXTICKRATE=50` | value | Max tick rate | Maximum server tick rate (server updates per second). Optional. Higher costs more CPU. | Performance | `FIXEDMAXTICKRATE=40` | integer | wiki example 40; Docker default 50 (D1); O1 default 50 | no (optional) | W1 list; D1; O1 |
| `RANDOM=` | `RANDOM=NONE` | value | Randomize map rotation | Whether the map/layer rotation is shuffled. | Server | `RANDOM=NONE` | `ALWAYS`, `FIRST`, `NONE` (exactly these three on the wiki). Plain meaning of `FIRST` is UNVERIFIED (wiki gives no explanation). | not stated by wiki; all wiki bat examples use NONE (W2) | no (offer dropdown) | W1 list; O1 select options |
| `PREFERPREPROCESSOR=` | `PREFERPREPROCESSOR=...` | value | CPU affinity | Wiki labels it "CPU Affinity" and marks it "UNTESTED". Value format not documented. Do NOT expose. | Advanced | none | UNVERIFIED | - | no | W1 list |
| `-log` | flag | bool | Show log window | Opens a console window showing the server log. Optional. | Saves and logs | `-log` | - | off (all wiki examples include it) | no (on by default in generated script) | W1 list |
| `-fullcrashdump` | flag | bool | Full crash dump | Saves a full dump file if the server crashes; files can get quite large. Optional. | Saves and logs | `-fullcrashdump` | - | off | no | W1 list |

## Table 2 - RCON arguments (the wiki's Rcon.cfg comments say each can alternatively be set on the command line; W1 "Rcon.cfg")

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `RCONIP=` | `RCONIP=0.0.0.0` | value | RCON bind IP | IP the RCON socket binds to. 0.0.0.0 = the default public IP; set explicitly if multiple IPs. Same as `IP=` in Rcon.cfg. | Network | `RCONIP=0.0.0.0` | IPv4 | 0.0.0.0 | no | W1 Rcon.cfg comments |
| `RCONPORT=` | `RCONPORT=21114` | value | RCON port | RCON (remote admin console) port. Same as `Port=` in Rcon.cfg. NOTE the wiki command-line list does NOT include it, only the Rcon.cfg comments do. | Network | `RCONPORT=21114` | integer port | 21114 | YES (rcon port) | W1 Rcon.cfg comments; W2 (docker `-e RCONPORT=21115`; ports 21114); D1 |
| `RCONPASSWORD=` | `RCONPASSWORD=...` | value | RCON password | Password for RCON login; empty password = RCON off. Same as `Password=` in Rcon.cfg. | Server | (do not print real values) | text | empty = RCON off | YES (rcon password; but a password on the command line is visible in the process list, so prefer writing Rcon.cfg) | W1 Rcon.cfg comments |
| `RCONMAXCONNECTIONS=` | `RCONMAXCONNECTIONS=5` | value | RCON max connections | Maximum number of simultaneous RCON connections. Same as `MaxConnections=` in Rcon.cfg. | Advanced | `RCONMAXCONNECTIONS=5` | integer | 5 | no | W1 Rcon.cfg comments |
| `RCONSECONDSBEFORETIMEOUTCHECK=` | `RCONSECONDSBEFORETIMEOUTCHECK=120` | value | RCON idle check | Seconds without contact before the server checks whether a connected console is still alive. Wiki: supports 30 to 3600. Same as `SecondsBeforeTimeoutCheck=` in Rcon.cfg. | Advanced | `RCONSECONDSBEFORETIMEOUTCHECK=120` | 30-3600 | 120 | no | W1 Rcon.cfg comments |

## Minimum and recommended start commands (all from the wiki)
- Minimum Windows bat line (W2): `start %SQUADSERVER% Port=7787 QueryPort=27165 FIXEDMAXPLAYERS=80 beaconport=15000 RANDOM=NONE -log`
- Full example (W1): `start SquadGame\Binaries\Win64\SquadGameServer.exe MULTIHOME=1.2.3.4 Port=7787 QueryPort=27165 beaconport=15000 FIXEDMAXPLAYERS=100 FIXEDMAXTICKRATE=40 RANDOM=NONE -log`
- Multiple servers: W2 says each extra server needs its own game, query, beacon and RCON ports; its Docker example uses PORT=7788 QUERYPORT=27166 RCONPORT=21115, and its multi-server note uses RCON 21114 and 21124. Because the game port uses Port and Port+1 (W2 firewall list) and query uses QueryPort and QueryPort+1, a safe panel plan is to step each by 10 (inference, not wiki text).

## Ports (W2 "Ports to Open", needed by the template's ports/implicitPorts)
- Game: UDP 7787 and 7788 (Port, Port+1). Beacon: UDP and TCP 15000. Steam query: UDP and TCP 27165 and 27166 (QueryPort, QueryPort+1). RCON: 21114 (wiki lists UDP and TCP; RCON itself is TCP in practice, UDP claim not independently verified). Ephemeral UDP 30000+ also used for client connections (W2).

## Config values that are NOT launch arguments (so the panel must write them to files)
- Server name, max players in-config, reserved slots, public queue limit: `SquadGame\ServerConfig\Server.cfg` keys `ServerName`, `MaxPlayers`, `NumReservedSlots`, `PublicQueueLimit` (W1 Server.cfg block). No command-line argument for the server name is documented on the wiki (D1 uses a `SERVER_NAME` env var of the Docker image, its mechanism unknown; O1 edits Server.cfg with a text replace). So server name must be written to Server.cfg.
- RCON password/port/IP: `Rcon.cfg` keys `Password`, `Port`, `IP` (W1), or the RCON* args above.

## Stopping
- Linux wiki says Ctrl+C in the log window shuts it down (W2). Windows graceful stop: not documented on the wiki. W1 Admins.cfg permission list has "manageserver - Shutdown server" (so an in-game/RCON admin shutdown exists), but the exact RCON command name is UNVERIFIED.

## UNVERIFIED
1. `ServerConfigDir` (and any similar config-path argument): not found on the wiki (W1, W2), nor in D1/O1/G1 or a web search for it. Do not add it.
2. `-MULTIHOME` with a dash: the wiki writes `MULTIHOME=` with no dash. Dash form not sourced.
3. `RCONPORT` etc. as real launch arguments: only evidenced by the Rcon.cfg comment text on the wiki and the Docker env names; never run to confirm.
4. Case-sensitivity of keys (`beaconport` lower-case vs `BeaconPort`).
5. Meaning of `RANDOM=FIRST`, and the default when `RANDOM` is omitted.
6. Format/effect of `PREFERPREPROCESSOR` (wiki says "UNTESTED").
7. Default of `FIXEDMAXPLAYERS`/`FIXEDMAXTICKRATE` when omitted by the server itself (only example values and Docker defaults exist).
8. Purpose of `beaconport` (wiki gives no purpose) and whether the game port is really Port and Port+1 on a current build (per W2 firewall list only).
9. Whether RCON listens on UDP as well as TCP (W2 lists both).
10. Whether the Windows `SquadGameServer.exe` is the long-lived process or spawns a differently named child (affects the panel process name).
11. Windows graceful stop command / RCON shutdown command name.
12. Whether a GSLT / Steam token launch argument exists (G-source low.ms only says "traditionally"; not on the wiki). Server licensing (W: https://squad.fandom.com/wiki/Server_licensing) is a license key placed in config files, not a launch argument; the exact file/key was not read.
13. Any other engine (UE4) arguments for Squad servers (e.g. -port, -nosteam, -ini overrides): none sourced; none listed.
14. `-help` output of SquadGameServer.exe: not available (no server may be run).

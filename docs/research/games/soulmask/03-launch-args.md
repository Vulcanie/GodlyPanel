# Soulmask - launch arguments (03-launch-args.md)
Game: Soulmask (store app 2646460). Windows dedicated server tool app 3017310, Linux 3017300; `+login anonymous` is used by every source's install command. Research date 2026-10-15; sources do not state a server build (the Shifting Sands DLC map `DLC_Level01_Main` exists, released 2026-04-10 per indifferentbroccoli README, so facts are for a post-1.0 build).

Source keys (all opened and read in this session; raw copies in `raw/`):
- **SARA** = https://saraserenity.net/soulmask/dedicated_server_guide.php (most complete, has full parameter table; local `raw/sara_guide.txt`); also https://saraserenity.net/soulmask/server_permissions.php, https://saraserenity.net/soulmask/server_cluster_guide.php, https://saraserenity.net/soulmask/remote_console.php (community site, undated, UE 4.27)
- **FAN** = https://soulmask.fandom.com/wiki/Private_Server (official-style wiki; "Advanced - Common Startup Parameters" table; `fandom_private.json`)
- **XGS** = https://xgamingserver.com/docs/soulmask/server-config (host docs, secondary)
- **LOW** = https://low.ms/knowledgebase/soulmask-getting-started (host docs, secondary)
- **GAZ** = https://www.gazlabs.co.uk/Soulmask/server-settings.html (community guide)
- **IB** = https://github.com/indifferentbroccoli/soulmask-server-docker (scripts/start.sh, README; Soulmask 1.0 + Shifting Sands)
- **JK** = https://github.com/jsknnr/soulmask-dedicated-server (container/entrypoint.sh)
- **SIB** = https://github.com/sibercat/SoulMask-Server-Manager (Services/ServerManager.cs BuildLaunchArgs, Models/ServerConfiguration.cs; a Windows server manager)
- **GSM** = https://github.com/ohmcodes/WindowsGSM.Soulmask (Soulmask.cs)
- **WEK** = https://hub.docker.com/r/wekod/soulmask-server (env var table)

## How the server is launched (Windows)
- Stock launcher: `StartServer.bat` in the install root (FAN). The stock content is not shown by any source I opened. FAN's recommended way to customise: a copy containing `call StartServer.bat -SteamServerName="your server name" -MaxPlayers=50 -PSW="yourpassword" -adminpsw="yourGMpassword" -pve`.
- Direct launch used by SARA, SIB, GSM (and cluster guide): run `WS\Binaries\Win64\WSServer-Win64-Shipping.exe` (process name `WSServer-Win64-Shipping`) with the level name first. SARA's `serve.bat` (Windows, verbatim):
```
set SteamAppId=2646460
WS\Binaries\Win64\WSServer-Win64-Shipping Level01_Main -log -server -UTF8Output -PORT=8777 -QueryPort=27015 -EchoPort=18888 -forcepassthrough -SteamServerName="my server name" -PSW="my password" -adminpsw="admin password" -saving=600 -backup=900
```
  SARA's update script also runs `copy /Y *.dll WS\Binaries\Win64\*.dll` after `app_update 3017310` (copies the root-folder DLLs next to the shipping exe). SIB comments: "Run WSServer-Win64-Shipping.exe directly (not the wrapper WSServer.exe) so Steam DLLs" load and sets the `SteamAppId` environment variable to find Steam. FAN's FAQ: Steam init fails if `WS/Binaries/Win64/steam_appid.txt` (single line `2646460`) is missing or the ports are unavailable. FAN names the process `WSServer.exe` in its firewall FAQ (the wrapper); the real server is the shipping exe (SARA/SIB/GSM).
- Value form: `-Name=value` (equals). Quote values that can contain spaces (`-SteamServerName="my server"`). SIB strips embedded quotes from user text because they break quoting. Mods are `-mod=\"ID1,ID2\"` in SIB (backslash-escaped quotes "so the server exe receives them literally") and `-mod="ID1,ID2"` in XGS.
- The first argument is the level name (positional, not a `-flag`).
- Command-line takes precedence over `WS/Saved/Config/WindowsServer/Engine.ini` (SARA); "many command line params from Unreal Engine 4.27 will also work" (SARA).

## Table
Legend: group Server / Network / Saves and logs / Performance / Advanced. "Panel-managed" = what the panel should set from its own fields (a recommendation).

| flag | form | kind | label | description (plain language) | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| (level name) | first positional | value | Map | Which map the server hosts. `Level01_Main` is Cloud Mist Forest (base game); `DLC_Level01_Main` is Shifting Sands (DLC). | Server | `Level01_Main` | `Level01_Main`, `DLC_Level01_Main` | none stated; every example uses Level01_Main (FAN: "currently there is only one: Level01_Main", out of date after the DLC) | yes (first creation only: do not switch maps on an existing save) | SARA; IB README map table; SIB (`Level01_Main` or `DLC_Level01_Main`) |
| `-server` | bare | bool | Dedicated server mode | Required. Starts the game as a server. | Server | `-server` | - | required | yes (always) | SARA ("A required parameter"); FAN ("No change needed") |
| `-forcepassthrough` | bare | bool | (required engine switch) | Required. SARA and FAN give no explanation of what it does. | Advanced | `-forcepassthrough` | - | required | yes (always) | SARA; FAN ("Must be specified") |
| `-log` | bare | bool | Show server window | On Windows keeps the server in a visible console window (without it it runs in the background with no window) and writes the log to `WS/Saved/Logs/WS.log`. Recommended. | Saves and logs | `-log` | - | recommended | yes (on) | SARA; FAN ("Turns on game console output"); SIB (writes `WS/Saved/Logs/WS.log`) |
| `-UTF8Output` | bare | bool | Readable non-Latin log text | Keeps log text with non-English characters (e.g. player names) readable. | Saves and logs | `-UTF8Output` | - | recommended | yes (on) | SARA ("You should keep this"); GSM; IB |
| `-SteamServerName` | `="value"` | value | Server name | Name shown in the server list. | Server | `-SteamServerName="My Soulmask"` | any text (avoid double quotes) | `UNNAMED_SERVER` (Engine.ini sample) | yes | SARA; FAN (Engine.ini sample shows `SteamServerName=UNNAMED_SERVER`) |
| `-MaxPlayers` | `=N` | value | Player slots | Most players allowed at once. SARA: too many players hurts performance. | Server | `-MaxPlayers=20` | whole number; ~70 maximum claimed by XGS and GAZ only (UNVERIFIED) | 20 (FAN Engine.ini sample; XGS; LOW; IB; GAZ) | yes | SARA; FAN; XGS; LOW |
| `-PSW` | `="value"` | value | Join password | Players must type this to join. Leave the flag out for an open server. | Server | `-PSW="friends"` | any text | none (open) | yes | SARA; FAN |
| `-adminpsw` | `="value"` | value | Admin (GM) password | The password for admin powers in game: press `~`, type `gm key <password>`, then enter it in the GM panel. Anyone with it has full admin, so keep it private. | Server | `-adminpsw="gmpass"` | any text | none (SARA: always set one) | yes | SARA; FAN FAQ |
| `-pve` | bare | bool | Peaceful (PvE) mode | Forces PvE rules. SARA: it also changes some gameplay settings in the server's settings. | Server | `-pve` | - | one of -pve/-pvp is expected by GAZ; Engine.ini sample shows `pvp=False`; the IB image defaults to pve | yes (mode choice) | SARA; FAN; LOW (bare flags) |
| `-pvp` | bare | bool | Player-versus-player mode | Forces PvP rules. Also changes some gameplay settings. | Server | `-pvp` | - | see above | yes (mode choice) | SARA; FAN; LOW |
| `-PORT` | `=N` (also seen as `-Port=`) | value | Game port (UDP) | Port players connect to. Must be open on firewall/router. | Network | `-PORT=8777` | any free UDP port | 8777 | yes | SARA (`-PORT`); FAN (`-Port`); both spellings appear in sources |
| `-QueryPort` | `=N` | value | Query port (UDP) | Port the server list uses to query the server. Must be open. | Network | `-QueryPort=27015` | any free UDP port | 27015 | yes | SARA; FAN |
| `-EchoPort` | `=N` | value | Local console port (TCP) | Telnet console, bound to 127.0.0.1 only, so no need to open it. | Network | `-EchoPort=18888` | any free TCP port | 18888 | yes | SARA; FAN |
| `-MULTIHOME` | `=ip` | value | Listen address | Bind to one specific local IP. Normally not needed. | Network | `-MULTIHOME=0.0.0.0` | local IP | all adapters (0.0.0.0) | no (advanced) | SARA; FAN |
| `-rconpsw` | `="value"` | value | Remote console password | Turns on RCON (remote admin commands). Without it RCON is off. | Network | `-rconpsw="pw"` | any text | off | optional | SARA |
| `-rconaddr` | `=ip` | value | RCON listen address | IP RCON listens on. Falls back to `-MULTIHOME`; if neither is set RCON is disabled. | Network | `-rconaddr=127.0.0.1` | local IP | MULTIHOME | optional (needed with -rconpsw) | SARA |
| `-rconport` | `=N` | value | RCON port (TCP) | Port RCON clients connect to. Other machines must also be listed under `[Server.SafeIP]` in Engine.ini (`IP=x.x.x.x` lines). | Network | `-rconport=19000` | free TCP port | 19000 | optional | SARA |
| `-saving` | `=seconds` | value | World snapshot interval | How often the world state is written to the in-memory database. Not yet on disk. | Saves and logs | `-saving=600` | seconds | 600 (SARA example; FAN Engine.ini sample; LOW; IB). GAZ says 300 (conflict, GAZ only) | optional (show) | SARA; FAN |
| `-backup` | `=seconds` | value | Save-to-disk interval | How often the in-memory database is written to `world.db` on disk. | Saves and logs | `-backup=900` | seconds | 900 (SARA example; FAN sample; LOW; GAZ; IB) | optional (show) | SARA; FAN |
| `-initbackup` | bare | bool | Back up on every start | Copies `world.db` each time the server starts. | Saves and logs | `-initbackup` | - | off | optional | SARA; FAN |
| `-backupinterval` | `=minutes` | value | Automatic backup copies | Makes a backup copy of `world.db` at this interval. The server never deletes old backups, so clean up by hand. | Saves and logs | `-backupinterval=60` | minutes | off | optional | SARA; FAN |
| `-serverpm` | `=mask` | value | Permission lists (ban/whitelist) | Which ban/allow lists are switched on. Without this flag all lists are OFF after every restart, so bans do not work. Add up the masks: 1 account whitelist (only listed Steam IDs may join), 2 account blacklist/ban list, 4 IP whitelist, 8 IP blacklist, 16 mute list. Most hosts want `2`. | Server | `-serverpm=2` | sum of 1,2,4,8,16 | none (all off) | optional (recommend default 2 so bans stick) | SARA server_permissions page (mask table, file names `WhiteAccountList.txt`, `BlackAccountList.txt`, `WhiteIPList.txt`, `BlackIPList.txt`, `BanSpeek.txt` in WS/Saved); SIB (default 2, same table) |
| `-GongHuiMaxMember` | `=N` | value | Max tribe size | Most players in one tribe. Overrides the in-game tribe size setting at next start. | Server | `-GongHuiMaxMember=10` | whole number | the game setting | optional | SARA; XGS |
| `-coef` | `=name` | value | Official settings template | Loads a named settings template that matches an official server, e.g. `PvE_10P_3x`. Templates are files `GameXishu_Template_<Name>.json` in `WS/Config/GameplaySettings`. Saved settings then go to `WS/Saved/GameplaySettings/GameXishu_<Name>.json` instead of `GameXishu.json`. | Advanced | `-coef=PvE_10P_3x` | names of the template files shipped in the install | none | optional (advanced; interacts with the settings editor) | SARA |
| `-serverid` | `=N` | value | Server ID | Number identifying this server. Player characters are tied to it: changing it after players have made characters locks them out (they would start over). Required only for clusters (SARA suggests setting one anyway before players join). | Advanced | `-serverid=1` | whole number, unique per cluster | 0 if not given | first creation only | SARA; SARA cluster guide |
| `-mainserverport` | `=N` | value | Cluster main-server port (TCP) | Makes this the main server of a cluster of servers (e.g. for cross-map travel). Do not expose publicly. Do not add or remove on an existing server. | Advanced | `-mainserverport=20000` | free TCP port | off | first creation only | SARA; cluster guide |
| `-clientserverconnect` | `=ip:port` | value | Cluster: connect to main server | Makes this a client server of the cluster at `ip:port` (the main server's broadcast port). Do not add or remove on an existing server. | Advanced | `-clientserverconnect=10.10.1.5:20000` | ip:port | off | first creation only | SARA; cluster guide |
| `-mod` | `="ID1,ID2"` | value | Workshop mods | Comma-separated Steam Workshop IDs, no spaces; server downloads them at start. See 04-mods.md. | Advanced | `-mod="3331511657,3325592770"` | numeric Workshop IDs | none | yes (mods field) | XGS; IB start.sh; SIB; research in 04-mods.md |
| `-online=Steam` | `=Steam` | value | Online provider | Appears in several example launch lines with no description (GAZ, IB, JK). Meaning not documented. | Advanced | `-online=Steam` | `Steam` seen | - | no (UNVERIFIED need) | GAZ; IB start.sh; JK |
| `-SILENT` | bare | bool | (undocumented) | Used by IB and JK docker images only; no description anywhere. | Advanced | `-SILENT` | - | - | no | IB; JK (no explanation) |
| `-gamedistindex` | `=N` | value | Event region (obsolete) | SARA: "superseded by gameplay settings. You should remove this"; set the event region in server settings instead. Known values 0 test, 1 Asia, 2 North America, 3 Europe, 4 Mainland China, 5 South America, 6 Oceania, 7 Africa. Do not offer. | Advanced | - | 0-7 | - | no (do not offer) | SARA |

### Level-name suffixes (appended to the level name with `?`, e.g. `Level01_Main?ND=2`)
| suffix | status | source |
|---|---|---|
| `?CustomGameMode=N` | Ignored: dedicated servers are locked to Survival (0). Known values 0 Survival, 1 Tribe, 2 Warrior, 3 PVP, 4 Casual. Do not offer. | SARA |
| `?ND=N` | Difficulty preset 0 Casual, 1 Easy, 2 Normal, 3 Hard, 4 Master, 5 Custom (default -1 unset). SARA warns it writes `GameXishu.json` into settings group 0 while dedicated servers read group 1, so the preset does not take effect without manual fixing. Do not offer. | SARA |

### Generic Unreal Engine arguments
SARA states UE 4.27 command-line parameters also work, but no source lists which are safe. Only these generic ones appear in sources: `-log` (above), `-UTF8Output` (above), `-NOSTEAM` (FAN FAQ log message: "Try running with -NOSTEAM"; not useful, the server is Steam-only, do not offer). No other generic switch is sourced.

### Environment variable (not an argument)
`SteamAppId=2646460` must be set when running the shipping exe directly (SARA serve.bat, SIB). Shipping-exe launch also needs the root-folder DLLs copied into `WS\Binaries\Win64` (SARA update.bat).

## Stopping the server (affects the panel stop button)
- SARA (Windows): Ctrl+C in the console window "starts a save and shutdown". Do not close the console window or kill the process: "risk rolling back world data". FAN says the same ("do not directly close the server window... data rollback").
- Telnet to `127.0.0.1:<EchoPort>`: FAN uses `quit 180` / `quit 30` and `saveworld 1`; SARA remote-console page lists `SaveAndExit`/`shutdown <seconds>` (aliases `close`, `exit`; 0 means 300 seconds; announces to players) and `SaveWorld`. In game as admin: `gm exit` saves and shuts down immediately (SARA). Both telnet (EchoPort) and RCON accept these commands (SARA remote console page).
- Saves live under `WS/Saved` (FAN; the dedicated world path `WS\Saved\Worlds\Dedicated\Level01` appears in a survivalservers search snippet only: UNVERIFIED).

## Search results for the arguments named in the task
| asked-about | found? |
|---|---|
| `-SteamServerName`, `-MaxPlayers`, `-pvp`/`-pve`, `-backup`, `-saving`, `-initbackup`, `-adminpsw` | yes (table) |
| `-serverpm` | yes (SARA permissions page, SIB) |
| `-forcepassword` | NOT FOUND in any source. The only similarly-named real flag is `-forcepassthrough` (required, unexplained). |
| `-mapcycle` | NOT FOUND in any source. The map is the first positional argument; multi-map is done with clusters (`-serverid/-mainserverport/-clientserverconnect`). |

## UNVERIFIED
1. `-forcepassword`: not in any source opened (SARA, FAN, XGS, LOW, GAZ, IB, JK, SIB, GSM, WEK, repeated web searches). Do not offer.
2. `-mapcycle`: same, not found. Do not offer.
3. Contents of the stock `StartServer.bat` (what it already passes). No source shows it. Whether FAN's `call StartServer.bat <args>` appends cleanly and which process name results (the wrapper `WSServer.exe` vs the child `WSServer-Win64-Shipping.exe`) is unconfirmed; the panel must be told which process to match (SARA/SIB/GSM launch the shipping exe directly).
4. What `-forcepassthrough` does (sources only say "required").
5. What `-online=Steam` and `-SILENT` do; whether they are needed (no description; only IB/JK/GAZ examples).
6. Exact `-MaxPlayers` limit (~70 per XGS/GAZ; not in SARA/FAN) and `-saving` default (300 per GAZ vs 600 elsewhere); the real defaults when the flags are omitted (FAN Engine.ini sample gives `MaxPlayers=20`, `backup=900`, `saving=600`, `pvp=False` as defaults, which is the only first-party-style evidence).
7. Whether `-PORT` vs `-Port` case matters (both appear; UE command-line parsing is normally case-insensitive: not confirmed here).
8. Which gameplay settings `-pve`/`-pvp` change (SARA says some, does not list them).
9. Which template names exist for `-coef` (only the example `PvE_10P_3x`; list is in the install's `WS/Config/GameplaySettings`).
10. Whether `-serverpm` also accepts the space form shown in the permissions page's heading (`-serverpm mask[int]`); all examples use `=`.
11. Server build number the above corresponds to; none of the sources state it.

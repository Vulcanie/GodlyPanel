# StarRupture dedicated server: launch arguments (research 2026-10-14)

Build: Steam tool app 3809400 "StarRupture Dedicated Server (Experimental)", public build ID 25642172, Windows 64-bit only, parent app 1631270 (https://api.steamcmd.net/v1/info/3809400). Early access, args may change (Creepy Jar's own article says updates may reset the .bat args).

## Ground truth in hand (how strong each source is)
- OFFICIAL (Creepy Jar support article): https://creepyjar.theymes.com/hc/en/starrupture/articles/setting-up-a-star-rupture-dedicated-server-experimental-feature-using-the-steam-app-34
  Launcher `SRServerWithLog.bat`, first line `start .\StarRuptureServerEOS.exe -Log -port=7777`. Only `-Log` and `-port` are in the official text. No full flag list exists in any official source I could open.
- Steam's own launch metadata (steamcmd.net mirror): executable `StarRuptureServerEOS.exe`, arguments `-Log`, oslist windows, type server.
- Everything else below is community (docker projects, WindowsGSM plugin, hosting-company guides). None was verified against a real install or the game's help output (no `-help` output found). Treat as "reported", test once on a real install.
- Reference scripts actually opened (full launch lines):
  - indifferentbroccoli: `wine <exe> -Log -Port=${DEFAULT_PORT} -ServerName="${SERVER_NAME}"` (+ `-RCWebControlDisable -RCWebInterfaceDisable` when DSSettings is used, + `-MULTIHOME=<ip>` if set) https://github.com/indifferentbroccoli/starrupture-server-docker (scripts/start.sh)
  - steam-dedicated-server: `-Log -Port=<p> -ServerName=<name>` + the two RCWeb flags + `-MULTIHOME=` + free extra "UE CLI flags" https://github.com/steam-dedicated-server/starrupture-docker (scripts/lib/server.sh)
  - rhavinx: `-Log` (optional), `-port=<p>`, `-RCWebControlDisable`, `-RCWebInterfaceDisable` https://github.com/rhavinx/starrupture (start.sh)
  - struppinet: `-Log -port=<p>` https://github.com/struppinet/starrupture-dedicated-server (scripts/start.sh)
  - michibiki-io: `-Log -Port=<p>`
  - WindowsGSM plugin: `-log {extra} -Port= -ServerQueryPort= -MaxPlayers= -Multihome= -ServerName=` https://github.com/Alakeram/WindowsGSM.StarRupture (StarRupture.cs)

## Executable names (matters for the panel's process match)
- Steam launcher in install root: `StarRuptureServerEOS.exe` (official article, steamcmd.net launch metadata).
- Real game process path used by Wine/WindowsGSM scripts: `StarRupture\Binaries\Win64\StarRuptureServerEOS-Win64-Shipping.exe` (WindowsGSM plugin StartPath; docker start.sh files). Whether the root exe spawns the Shipping exe as a child (so the process to watch is the Shipping one) is UNVERIFIED.
- One hosting guide says `StarRuptureServer.exe` (starruptureplanner.com); contradicts everything else, disregard.

## Table

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source URL |
|---|---|---|---|---|---|---|---|---|---|---|
| `-Log` | bare flag | bool | Show log window | Opens a console window with the server's log output so you can see what it is doing and diagnose crashes. | Saves and logs | `-Log` | n/a | on in the official bat | yes, always add (matches Steam's own launch entry) | https://creepyjar.theymes.com/hc/en/starrupture/articles/setting-up-a-star-rupture-dedicated-server-experimental-feature-using-the-steam-app-34 ; https://api.steamcmd.net/v1/info/3809400 |
| `-port` (also seen as `-Port`) | equals | value | Game port | The port players connect to. Must match the port you forward on your router. Official guide uses 7777. UE docs: arguments are not case sensitive. | Network | `-port=7777` | integer port (1-65535 assumed) | 7777 (seen in official article, WindowsGSM, all docker projects) | yes (port field) | official article above; https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-command-line-arguments-reference |
| `-MULTIHOME` | equals | value | Bind to IP address | Makes the server listen on one specific network adapter's IP (useful when the PC has a VPN, ZeroTier or several network cards). Leave unset for normal setups. | Network | `-MULTIHOME=192.168.1.20` | an IPv4 address of this PC | unset | optional, only if user fills it | UE: "Multihome IP address" https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-command-line-arguments-reference ; StarRupture use: indifferentbroccoli/steam-dedicated-server scripts above; https://starruptureplanner.com/guides/dedicated-server ("force to bind to a specific IP") |
| `-QueryPort` | equals | value | Query port | Port used for server-list/status queries. Reported default 27015 (UDP). Whether the vanilla server honors this flag or opens a query port at all is not confirmed (see UNVERIFIED). | Network | `-QueryPort=27015` | integer port | 27015 (docker projects, WindowsGSM plugin default) | panel could manage if verified | https://low.ms/de/knowledgebase/starrupture-required-ports-and-firewall-connection-fix (low.ms says game port +1 = 7778, conflicting) ; https://www.low.ms/knowledgebase/starrupture-server-settings-guide ; https://hub.docker.com/r/nitje/starrupture_dedicated_server |
| `-ServerQueryPort` | equals | value | Query port (alt spelling) | Spelling used by one third-party WindowsGSM plugin for the same idea. Probably not honored by the game. | Network | `-ServerQueryPort=27015` | integer port | none | no | https://github.com/Alakeram/WindowsGSM.StarRupture (StarRupture.cs) |
| `-ServerName` | equals | value | Server name | Name used for the server in matchmaking/logs, per two docker projects. How it relates to the `SessionName` in DSSettings.txt (which is what players actually pick between) is not confirmed. | Server | `-ServerName="My Server"` | text; WindowsGSM strips spaces and non-alphanumerics for the session name, 20 char max for SessionName (reported) | `starrupture-server` (docker default, not game default) | maybe, but UNVERIFIED effect | https://github.com/indifferentbroccoli/starrupture-server-docker ; https://github.com/steam-dedicated-server/starrupture-docker |
| `-MaxPlayers` | equals | value | Max players | Player cap, reported default 4 and reported tested up to 8. Another guide says the real server has no MaxPlayers setting, so this flag may do nothing. | Server | `-MaxPlayers=4` | integer (1-4 in one guide, up to 8 in another) | 4 | no until verified | https://github.com/Alakeram/WindowsGSM.StarRupture ; https://www.survivalservers.com/wiki/ (not readable) ; https://supercraft.host/wiki/starrupture/dedicated_server_setup/ ; conflicting statement via https://xgamingserver.com/blog/starrupture-dedicated-server-configuration-guide/ |
| `-RCWebControlDisable` | bare flag | bool | Turn off built-in web remote control | Stops the game's built-in Remote Control web service. Two docker projects add it automatically when the server is configured by DSSettings.txt, and link it to a published security advisory about the in-game HTTP server on the game port. | Advanced (security) | `-RCWebControlDisable` | n/a | off | panel could add by default (recommended by community), UNVERIFIED that it fixes the advisory | https://github.com/indifferentbroccoli/starrupture-server-docker ; https://github.com/rhavinx/starrupture ; https://github.com/steam-dedicated-server/starrupture-docker |
| `-RCWebInterfaceDisable` | bare flag | bool | Turn off built-in web remote UI | Pair of the flag above (disables the web interface part of Remote Control). | Advanced (security) | `-RCWebInterfaceDisable` | n/a | off | same as above | same three repos |
| `-SessionName=` | equals | value | (needs ServerUtility mod) Session name | Only exists if the third-party ServerUtility plugin (StarRupture mod loader) is installed. Replaces DSSettings.txt. Not vanilla. | Server | `-SessionName="My Server"` | text | none | no (mod only) | https://github.com/AlienXAXS/StarRupture-Plugin-ServerUtility |
| `-SaveGameInterval=` | equals | value | (ServerUtility mod) Autosave seconds | Mod-only. Default 300. | Saves | `-SaveGameInterval=600` | seconds | 300 | no (mod only) | same |
| `-RconPort=` | equals | value | (ServerUtility mod) RCON/query port | Mod-only. TCP RCON and UDP Steam A2S on this port. Default 27015. | Network | `-RconPort=27015` | port | 27015 | no (mod only) | same ; https://raw.githubusercontent.com/AlienXAXS/StarRupture-Plugin-ServerUtility/HEAD/src/RCON_README.md |
| `-RconPassword=` | equals | value | (ServerUtility mod) RCON password | Mod-only. RCON stays off without it. | Network | n/a | text | none | no (mod only); never store | same |

## Generic Unreal Engine arguments (documented by Epic; NOT confirmed to be honored by StarRupture's build)
Source: https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-command-line-arguments-reference (page states arguments are not case-sensitive).
| flag | form | kind | UE description (Epic) | StarRupture status |
|---|---|---|---|---|
| `-log` | bare | bool | open a log window | used officially as `-Log` |
| `-port=` | equals | value | default server port | used officially |
| `-multihome=` | equals | value | multihome IP address | used by community scripts |
| `-unattended` | bare | bool | run in unattended mode (no dialogs) | not seen in any StarRupture script, UNVERIFIED |
| `-nosplash` | bare | bool | disable splash screen | not seen, UNVERIFIED |
| `-stdout` | bare | bool | log output to stdout | not seen, UNVERIFIED |
| `-forcelogflush` | bare | bool | flush the log after each line | not seen, UNVERIFIED |
| `-abslog=` | equals | value | absolute log file name | not seen, UNVERIFIED |
| `-nullrhi` | bare | bool | headless rendering | not seen, UNVERIFIED |
Only `-Log`, `-port`, `-multihome` are safe to offer, because they have StarRupture-specific evidence. The steam-dedicated-server project appends arbitrary extra UE flags via SERVER_OPTIONS, so a free-text "extra arguments" box is reasonable.

## Related facts for the panel (not arguments, but they decide what the arguments do)
- Main per-world settings are NOT launch args. They are in `DSSettings.txt`, a JSON file in the install root (next to the root exe), keys `SessionName`, `SaveGameInterval`, `StartNewGame`, `LoadSavedGame`, `SaveGameName`, all string values (e.g. `"SaveGameInterval": "300"`). Seen verbatim in https://github.com/indifferentbroccoli/starrupture-server-docker (starrupture-config/DSSettings.txt), rhavinx, struppinet, and the WindowsGSM plugin. First-creation uses `StartNewGame: true`, `LoadSavedGame: false` (rhavinx, WindowsGSM); later `false`/`true` to auto-load the save. Without DSSettings.txt the world is created through the in-game "Manage Server" screen (client connects to server IP and port) per Creepy Jar/hosting guides.
- Passwords are JSON files `Password.json` (admin) and `PlayerPassword.json` in the install root, not arguments. The docker projects write them with an encrypted value produced by an external site (https://starrupture-utilities.com/passwords/); the WindowsGSM plugin writes `{"Password": ""}`. How a plaintext password becomes the stored value is UNVERIFIED.
- Saves: `StarRupture/Saved/SaveGames/<SessionName>/` with `AutoSave0.sav` (+ `.met`), rotating `AutoSave1.sav` (https://www.low.ms/knowledgebase/starrupture-server-settings-guide and the indifferentbroccoli README).
- Ports: UDP 7777 game (official article uses 7777; protocol not stated there). Several projects also publish TCP 7777 for the in-game Server Manager and warn that exposing TCP has a security advisory (https://github.com/indifferentbroccoli/starrupture-server-docker, https://github.com/rhavinx/starrupture "forward UDP only"). Query: UDP 27015 reported by docker/WindowsGSM; low.ms says game+1.
- Stopping: no official method. Docker projects send SIGTERM and Wine waits (rhavinx), `stop_grace_period 30s/60s` recommended. Mod only: RCON `stop`/`exit`/`quit` saves and exits (RCON_README link above). Console input stop in AMP template (`App.ExitString=stop`) is a template guess, UNVERIFIED for vanilla.
- Install: `steamcmd +force_install_dir <dir> +login anonymous +app_update 3809400 validate +quit`; also seen `+@sSteamCmdForcePlatformType windows` only for Linux hosts. Official article confirms anonymous works.

## UNVERIFIED list (count: 14)
1. Whether `-QueryPort` is honored by the vanilla server and whether a query port exists in vanilla (low.ms says game+1 = 7778, docker/WindowsGSM say 27015; official article lists only the game port).
2. Whether `-ServerQueryPort` does anything (appears only in one third-party plugin).
3. What `-ServerName` actually changes in vanilla (browser name vs. SessionName in DSSettings.txt).
4. Whether `-MaxPlayers` is honored (one source says no MaxPlayers exists; the others use it; value ranges disagree: 1-4 vs tested 8).
5. Exact content/fix of the security advisory (https://wiki.starrupture-utilities.com/en/dedicated-server/Vulnerability-Announcement returned only a title) and whether `-RCWebControlDisable` / `-RCWebInterfaceDisable` fully mitigate it; no description of those flags from a primary source.
6. Whether StarRupture's build honors generic UE flags (`-unattended`, `-nosplash`, `-stdout`, `-forcelogflush`, `-abslog`, `-nullrhi`).
7. Whether the root `StarRuptureServerEOS.exe` is a thin launcher that spawns `StarRuptureServerEOS-Win64-Shipping.exe` (which process the panel should track/stop).
8. Whether `-port` also moves any TCP listener (Server Manager) and the exact protocol(s) on the game port (UDP only vs UDP+TCP).
9. Default value of `-port` when omitted (7777 is the example everywhere, no source states it as the built-in default).
10. Allowed/limit range of `-port`.
11. Whether `-Log` is only a console-window toggle or also writes `Saved/Logs/StarRupture.log` (supercraft says that log exists; not tied to the flag).
12. Official graceful stop method for vanilla (Ctrl+C / console command / RCON): none documented; only docker SIGTERM and mod RCON.
13. Which args reset after game updates besides the .bat (official article only warns the .bat may reset).
14. Whether there is a `-help` output or an official full argument list (none found; Steam community guide https://steamcommunity.com/sharedfiles/filedetails/?id=3643384457 returned HTTP 429 and was not read).

Sources that could not be read: https://www.survivalservers.com/wiki/How_to_Create_a_StarRupture_Server_Guide (403), https://www.nexusmods.com/starrupture/mods/112 (403), https://wiki.starrupture-utilities.com (no body), Steam guide above (429).

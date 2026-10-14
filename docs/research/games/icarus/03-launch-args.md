# Icarus dedicated server: launch arguments (STEP-launch)

Researched 2026-10-14. Server app 2089300 ("Icarus Dedicated Server", Steam Tool, parent 1149460, Steam launch entry `IcarusServer.exe`). Steam public branch buildid 25793607 (timeupdated 1791499164) per https://api.steamcmd.net/v1/info/2089300 . A hosting guide says it was checked against game build `3.0.27.157242-rel-DangerousHorizons` (https://www.gameserverkings.com/knowledge-base/icarus/icarus-dedicated-server-setup/).

Source key (S = official, T = third-party):
- S1 https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Server-Config-&-Launch-Parameters (raw text read via raw.githubusercontent.com/wiki/...; saved in `raw/`)
- S2 https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Server-Setup
- S3 https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Updating-Dedicated-Server-and-Running-your-Server
- S4 https://github.com/RocketWerkz/IcarusDedicatedServer/blob/main/ServerSettings.ini (shipped template)
- T1 https://xgamingserver.com/docs/icarus/launch-parameters
- T2 https://eggs.pterodactyl.io/egg/games-icarus-dedicated
- T3 https://kb.firedaemon.com/support/solutions/articles/4000194572-icarus-dedicated-server
- T4 https://www.gameserverkings.com/knowledge-base/icarus/icarus-dedicated-server-setup/

## Process, start command, stop

- Official start example (S3): `"C:\steamcmd\steamapps\common\Icarus Dedicated Server\IcarusServer.exe" -log -QueryPort=27015 exit` (the trailing `exit` is in the official text; its purpose is not explained, UNVERIFIED).
- Official setup (S2): make a shortcut to `IcarusServer.exe` and add `-Log`; "Without this there will not be anything visible on screen while the server is running."
- Real game process: three third-party sources run/point at `Icarus\Binaries\Win64\IcarusServer-Win64-Shipping.exe` (T2 under Wine, T3 as a Windows service target with working directory = server root, T4). Whether launching the root `IcarusServer.exe` spawns that Shipping exe as a child process (so the panel should watch the Shipping name) is UNVERIFIED; check on a real install.
- Install via SteamCMD, anonymous works per the official wiki (S2): `force_install_dir C:\IcarusServer`, `login anonymous`, `app_update 2089300 validate`.
- Stop: Pterodactyl egg stop is `^C (SIGINT)` (T2). Official update script just does `taskkill /im IcarusServer.exe` (S3). FireDaemon stops via `sc stop` (T3). There is no documented RCON-from-outside or console stop command; RCON commands are typed in the in-game chat (see https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Console---RCON-Commands) and none of them stops the process (`ReturnToLobby` only kicks everyone). A clean Ctrl+C behaviour on Windows is UNVERIFIED.
- Ready line in console: `(Engine Initialization) Total time:` (T2).
- Log file: `Icarus/Saved/Logs/Icarus.log` (T2, T4).

## Argument table

Panel-managed = recommend the panel sets/controls this itself. Default column is the default of the game when the argument is absent.

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-Log` (case-insensitive: docs use `-Log`, `-log`) | bare | bool flag | Show server window | Opens a console window showing the server log while it runs. Without it nothing is visible on screen. | Saved games and logs | `-Log` | n/a | off | Yes: always add (official docs say to). | S2, S3, T1 |
| `-PORT=` | equals | value | Game port | UDP port players connect to. Open/forward it on the router. Change it when running more than one server on this PC. | Network | `-PORT=17777` | a free UDP port; range limit not documented (UNVERIFIED) | 17777 | Yes (panel port field `game`). | S1, S2, T1 |
| `-QueryPort=` | equals | value | Query port | UDP port Steam uses to list/query the server. Open/forward it too. Must differ between servers on one PC. | Network | `-QueryPort=27015` | a free UDP port; range limit not documented (UNVERIFIED) | 27015 | Yes (panel port field `query`). | S1, S2, T1 |
| `-MULTIHOME=` | equals | value | Bind to IP | Makes the server use one specific IP address of this PC. Only useful with several network cards or IPs. | Network | `-MULTIHOME=0.0.0.0` | an IPv4 address of the host | not set | No (advanced, leave unset by default). Official wiki lists it but gives no detail beyond "Sets the multi-home IP to use". | S1, T1 (example value from T1; T3 writes it `-Multihome=`, so the name is case-insensitive in practice, UNVERIFIED officially) |
| `-SteamServerName=` | equals, quote value if it has spaces | value | Server name | Name shown in the in-game server browser. Max 64 characters. This replaces `SessionName` in ServerSettings.ini, which the official wiki says currently does nothing. | Server | `-SteamServerName="My Icarus Server"` | text up to 64 characters | not set (UNVERIFIED what the browser shows when absent) | Yes (server name). | S1, T1; hosting panel caps at 32 (T4) |
| `-UserDir=` | equals | value | Data folder | Moves the whole `Saved` data area (configs, prospect saves, logs) to another folder. Path can be relative or absolute. If used, ServerSettings.ini must live under `<that folder>\Config\WindowsServer\`. | Saved games and logs | `-UserDir=D:\IcarusData` | relative or absolute path | `%localappdata%\Icarus\` per S1; but S2 and S4 say the dedicated server uses `[ServerInstallDirectory]\Icarus\Saved\` by default. The two official pages disagree: UNVERIFIED which applies. | Optional: panel could set it for a per-server save path. | S1, S2 (note about moving Saved), T1 |
| `-saveddirsuffix=` | equals | value | Saved folder suffix | Adds a suffix to the `Saved` folder name (`Saved_player2` per official example, `Saved-instance2` per T1; separator not confirmed). Needed to keep two servers on one machine from sharing saves. | Saved games and logs | `-saveddirsuffix=player2` | any text usable in a folder name | none | Possibly, for multiple instances on a shared install. Separator `_` vs `-` is UNVERIFIED, so do not depend on the resulting path. | S1, T1 |
| `-LOG=` | equals | value | Log file | Writes the log to a specific file name, relative to `Saved/Logs/`. `../MyLog.log` moves it one level up. Not the same as the bare `-Log` window flag. | Saved games and logs | `-LOG=MyLog.log` | relative path | `Icarus.log` (from T2/T4 paths) | No. | S1 |
| `-ABSLOG=` | equals | value | Log file (full path) | Writes the log to an absolute path. May need administrator rights depending on the folder. | Saved games and logs | `-ABSLOG=C:\Logs\icarus.log` | absolute path | not set | No. The official wiki example is typed `-ABS=C:\MyLog.log`, which looks like a typo for `-ABSLOG=`; the flag name `-ABSLOG=` is confirmed by the heading (S1) and by T1/T3. | S1, T1, T3 |
| `-ResumeProspect` | bare | bool flag | Resume last world | On start, resume the last prospect (world) that ran. | Server | `-ResumeProspect` | n/a | The config option `ResumeProspect` is True by default, so the server already resumes unless set False. | Panel may offer; mostly redundant with the INI default. | S1, S4 |
| `-LoadProspect=` | equals | value | Load a saved world | On start, load a prospect by its save name from `Saved/PlayerData/DedicatedServer/Prospects/`. | Server | `-LoadProspect=MyOpenWorld` | an existing save name | none | No (offer as an optional field). | S1, T1 |
| `-CreateProspect=` | equals, whole value in double quotes | value | Create a new world | On start, create and launch a new prospect. Format: `"[ProspectType] [Difficulty] [Hardcore] [SaveName]"`; difficulty is 1 (easy) to 4 (extreme); Hardcore is True/False (True = no respawns); SaveName is required for outposts, random for regular prospects if omitted. | Server | `-CreateProspect="Tier1_Forest_Recon_0 3 false TestProspect01"` | ProspectType = internal prospect name (list: https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Prospect-Names, not extracted here); difficulty 1-4; true/false | none | No. First creation only: remove it after the first boot, otherwise a fresh save is made on every restart (T1 states this; official wiki does not). | S1, T1 |

Processing order on startup, per S1: LoadProspect, then ResumeProspect, then CreateProspect. If none are given on the command line or in config, the server waits in a lobby that players join to pick or create a prospect (S1, Connecting to Servers wiki).

## Settings that are config-file keys, not official launch arguments

Official config file (S1/S4): `Icarus\Saved\Config\WindowsServer\ServerSettings.ini`, section `[/Script/Icarus.DedicatedServerSettings]`, keys `SessionName, JoinPassword, MaxPlayers, AdminPassword, ShutdownIfNotJoinedFor, ShutdownIfEmptyFor, AllowNonAdminsToLaunchProspects, AllowNonAdminsToDeleteProspects, LoadProspect, CreateProspect, ResumeProspect, LastProspectName`. The file is generated on the first lobby/prospect (S2). Of these, only `LoadProspect`, `ResumeProspect` and `CreateProspect` are documented as also usable on the command line. Details belong to the settings-catalog step.

Third-party only: T3 (FireDaemon) shows `-maxplayers=8` and `-JoinPassword=<password>` on the command line. The official wiki does not list these as launch arguments (MaxPlayers/JoinPassword are documented only as INI keys), so they are UNVERIFIED as arguments. Do not offer them; use the INI keys. MaxPlayers is documented as minimum 1, maximum 8 (S1).

## Generic engine (Unreal Engine) arguments

Icarus is an Unreal Engine game and the docs show Unreal-style `-PORT=`, `-LOG=`, `-ABSLOG=`, `-MULTIHOME=`. No source I opened lists which other engine arguments (for example `-unattended`, `-nosplash`, `-nullrhi`, `-NoSteam`) the Icarus server honours, so none are recommended. All marked UNVERIFIED below.

## First-creation-only items
- `-CreateProspect=` (see above).
- `ServerSettings.ini` does not exist until the first lobby/prospect (S2), so the panel should not require it before first run; the official template can be copied from S4 into `Icarus\Saved\Config\WindowsServer\`.

## Platform notes
- Windows server binary only; Linux hosts run it under Wine (T2, T4). No native Linux build was found in the sources.
- Ports are both UDP (T1, T2). Default game 17777, query 27015 (S2).
- Minimal panel start line supported by official docs: `IcarusServer.exe -Log -SteamServerName="<name>" -PORT=<game> -QueryPort=<query>` (the `-Log`/`-PORT`/`-QueryPort` parts are official, `-SteamServerName` official per S1; T1 shows the same combination).

## UNVERIFIED
1. Whether the root `IcarusServer.exe` spawns `Icarus\Binaries\Win64\IcarusServer-Win64-Shipping.exe` as a child, and therefore which process name the panel should match.
2. Purpose of the trailing `exit` in the official run example.
3. Valid port ranges for `-PORT=` / `-QueryPort=`.
4. Whether `-PORT` / `-QueryPort` / `-MULTIHOME` etc. are case-insensitive (only inferred from third-party examples using `-port=`, `-Multihome=`).
5. Default of `-UserDir` (official pages S1 and S2 disagree: `%localappdata%\Icarus\` vs install-dir `Saved`).
6. Folder name produced by `-saveddirsuffix=` (`Saved_player2` in S1 vs `Saved-instance2` in T1).
7. Server browser name when `-SteamServerName` is absent.
8. Whether `-maxplayers=` and `-JoinPassword=` work as command-line arguments (third-party T3 only).
9. Graceful shutdown on Windows: whether Ctrl+C / closing the console saves the world safely (Pterodactyl uses SIGINT under Wine; the official update script just kills the process).
10. Any other Unreal Engine arguments honoured by this server (`-unattended`, `-nosplash`, `-NoSteam`, etc.).
11. Valid ProspectType values (page https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Prospect-Names exists; raw copy in `raw/Prospect-Names.md` but not analysed in this step).

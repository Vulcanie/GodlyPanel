# Icarus: server basics (STEP-basics)

Researched 2026-10-14. Store app 1149460, dedicated server app 2089300.
Build facts: Steam public branch buildid 25793607 (updated 2026-10-08), experimental 25897525 (2026-10-13) per https://api.steamcmd.net/v1/info/2089300 (raw copy in `raw/steamcmd-info.json`). Newest game version number found in a source: 3.0.27.157242 (Week 249, 10 Sep 2026) per https://www.gameserverkings.com/knowledge-base/icarus/icarus-dedicated-server-setup.md (hosting vendor, not RocketWerkz). The newest public build is newer than that, so the version is not pinned.

Source quality note: the official RocketWerkz docs (https://github.com/RocketWerkz/IcarusDedicatedServer/wiki) were last edited in 2022 (repo `pushed_at` 2022-12-01, https://api.github.com/repos/RocketWerkz/IcarusDedicatedServer). Everything below marked "official" comes from there. Newer facts come from vendor/community pages and are labelled as such. Raw copies of every fetched page are in `raw/`.

## 1. SteamCMD command
- Official: `force_install_dir C:\IcarusServer`, `login anonymous`, `app_update 2089300 validate` (plus `quit`). "Installing via SteamCMD allows installing Icarus Dedicated Server without needing an Icarus license." https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Server-Setup (raw: `raw/Server-Setup.md`)
- One-liner form with branch (community wiki): `steamcmd +force_install_dir d:\icarusserver\ +login anonymous +app_update 2089300 -beta public validate +quit`; experimental: `-beta experimental`. To go back to the main branch you must set `-beta public`, not omit it. https://icarus.wiki.gg/wiki/Dedicated_Servers
- Same without `-beta`: `.\steamcmd +login anonymous +app_update 2089300 validate +quit`, default install dir `C:\SteamCMD\steamapps\common\Icarus Dedicated Server`. https://kb.firedaemon.com/support/solutions/articles/4000194572-icarus-dedicated-server
- App id mixup warning: 1149460 is the game, 2089300 is the server. https://www.gameserverkings.com/knowledge-base/icarus/icarus-dedicated-server-setup.md
- Steam metadata: name "Icarus Dedicated Server", type Tool, parent 1149460, `installdir` "Icarus Dedicated Server", one depot 2089301, launch entry 0 executable `IcarusServer.exe` (no arguments, no oslist given). https://api.steamcmd.net/v1/info/2089300
- Branches: public, experimental ("Predeployment Testing"), pre-dangerous-horizons, 2.2.57. Same URL. Experimental is only needed if clients run the experimental branch (icarus.wiki.gg page above).
- Install size: public manifest 10,413,513,537 bytes (about 9.7 GiB); download 7,029,337,440 bytes. Same URL. (A mornedhels README says the updater temporarily needs up to 2x the game size in disk, https://github.com/mornedhels/icarus-server/blob/main/README.md.)

## 2. Install folder layout
- Server root = `force_install_dir`; default via the Steam metadata installdir is `Icarus Dedicated Server`. Root contains `IcarusServer.exe` (Steam launch entry) and the game folder `Icarus\`.
- Real server binary: `Icarus\Binaries\Win64\IcarusServer-Win64-Shipping.exe` (WindowsGSM plugin StartPath https://raw.githubusercontent.com/BizakDaTroll/WindowsGSM.Icarus/HEAD/Icarus.cs/Icarus.cs ; FireDaemon https://kb.firedaemon.com/support/solutions/articles/4000194572-icarus-dedicated-server ; Pterodactyl egg https://eggs.pterodactyl.io/egg/games-icarus-dedicated ; mornedhels `icarus_binary_path=Icarus/Binaries/Win64/IcarusServer-Win64-Shipping.exe` https://raw.githubusercontent.com/mornedhels/icarus-server/HEAD/scripts/common).
- Working directory used by those tools is the server root (FireDaemon, WindowsGSM `WorkingDirectory`).
- Saves/config live under `[ServerInstallDirectory]\Icarus\Saved\`: config in `Saved\Config\WindowsServer\`, prospects in `Saved\PlayerData\DedicatedServer\Prospects\`, logs in `Saved\Logs\` (e.g. `Icarus.log`). Sources: official Server-Setup (config path), official Migrating page `\steamapps\common\Icarus Dedicated Server\Icarus\Saved\PlayerData\DedicatedServer\Prospects` (`raw/Migrating-prospect-from-local-Icarus.md`), log path https://eggs.pterodactyl.io/egg/games-icarus-dedicated (`/home/container/Icarus/Saved/Logs/Icarus.log`).
- Contradiction inside the official wiki: the Config page says the Saved folder "is by default found in %localappdata%\Icarus\ but can be changed using the -UserDir= command line" (`raw/Server-Config-_-Launch-Parameters.md`), while Server-Setup and the Migrating page say it is inside the install folder. Not resolved, see UNVERIFIED.
- Mods go in `Icarus\Content\Paks\mods` (vendor page, mods are out of scope for this step) https://www.gameserverkings.com/knowledge-base/icarus/icarus-mods.md

## 3. Executable and Windows process names
- Official instructions: "Create a shortcut to IcarusServer.exe" and add `-Log` ("Without this there will not be anything visible on screen"). Official update batch does `taskkill /im IcarusServer.exe`. https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Server-Setup , https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Updating-Dedicated-Server-and-Running-your-Server
- Third-party tools launch the shipping exe directly, no launcher: WindowsGSM, FireDaemon (service type "Always Running Program"), Pterodactyl egg (`wine ./Icarus/Binaries/Win64/IcarusServer-Win64-Shipping.exe -Log ...`), mornedhels Docker. Links in section 2.
- Whether running `IcarusServer.exe` spawns `IcarusServer-Win64-Shipping.exe` as a child process, and which of the two stays running, is not stated in any source found. UNVERIFIED. Practical consequence: if the panel launches the Shipping exe directly (as the tools above do), the process name to match is `IcarusServer-Win64-Shipping.exe`; this works per those tools but is not confirmed as the exit-code/lifetime equal of `IcarusServer.exe`.
- Do NOT kill by image name: the official update script's `taskkill /im IcarusServer.exe` hits every instance on the PC, and multiple servers per host are normal (section 4).

## 4. Ports and protocols
- Game port: UDP 17777 default, set with `-PORT=` (or engine config). Query port: UDP 27015 default, set with `-QueryPort=`. "Set up port forwarding for the game port and query port." Official: https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Server-Setup . UDP protocol and "requires 2 UDP Ports": https://hub.docker.com/r/nerodon/icarus-dedicated ; Pterodactyl egg lists 17777 UDP game, 27015 UDP query; mornedhels README Ports table lists 17777/udp and 27015/udp.
- No other ports found. No RCON listener: "Icarus exposes no RCON protocol listener, the commands run through in-game chat" (vendor claim, https://www.gameserverkings.com/knowledge-base/icarus/icarus-console-commands.md). The official page is named "Console & RCON Commands" but only says to type the command into in-game chat: https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Console---RCON-Commands
- Two servers on one PC: use different `-PORT`/`-QueryPort` (examples 17778/27050 FireDaemon, 17779/27017 xgamingserver) and a different Saved folder via `-saveddirsuffix=` (official) or `-UserDir=` (official). WindowsGSM uses a port increment of 10 for new instances (WindowsGSM plugin above). xgamingserver says the suffix is "required for running multiple servers on the same host" (vendor): https://xgamingserver.com/docs/icarus/launch-parameters
- No implicit extra ports found (nothing in any source). Stated as: no sources list any; see UNVERIFIED for whether none exist.

## 5. Minimal working start command
- Official minimum: `IcarusServer.exe -Log` (the exe shortcut + `-Log`), with `-PORT=` / `-QueryPort=` optional because defaults exist. Official Server-Setup. Official "Run Server" example bat: `"C:\steamcmd\steamapps\common\Icarus Dedicated Server\IcarusServer.exe" -log -QueryPort=27015 exit` (note the stray trailing `exit`, presumably cmd syntax, https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Updating-Dedicated-Server-and-Running-your-Server ).
- Typical full command (Pterodactyl egg, Linux/Wine form): `./Icarus/Binaries/Win64/IcarusServer-Win64-Shipping.exe -Log -SteamServerName=IcarusServer -PORT="17777" -QueryPort="27015"` https://eggs.pterodactyl.io/egg/games-icarus-dedicated
- Server name MUST come from `-SteamServerName="..."` (max 64 chars); `SessionName` in the ini "currently does nothing". Official Config page `raw/Server-Config-_-Launch-Parameters.md`.
- Launch arguments seen in third-party examples that the official page does NOT list: `-NOSTEAM` (WindowsGSM), `-maxplayers=8` and `-JoinPassword=<password>` (FireDaemon). Whether the engine honours these is UNVERIFIED.
- If no prospect command is given, the server waits in a lobby that players can join and pick or create a world. Official Config page ("the server will enter a waiting state"). Start-up prospect args: `-ResumeProspect`, `-LoadProspect=NAME`, `-CreateProspect="Type Difficulty Hardcore SaveName"` e.g. `-CreateProspect="Tier1_Forest_Recon_0 3 false TestProspect01"`. Difficulty 1 (easy) to 4 (extreme). Official Config page.

## 6. First-run behaviour, files, saves
- `ServerSettings.ini` is NOT created at install: "the settings file gets generated on first prospect/lobby". Workaround: place RocketWerkz's template into `Icarus\Saved\Config\WindowsServer\` (create the folders). Official Server-Setup. Template (verbatim, 12 keys, section `[/Script/Icarus.DedicatedServerSettings]`): https://raw.githubusercontent.com/RocketWerkz/IcarusDedicatedServer/main/ServerSettings.ini (copy in `raw/ServerSettings.ini`). Keys: SessionName, JoinPassword, MaxPlayers, AdminPassword, ShutdownIfNotJoinedFor=300.000000, ShutdownIfEmptyFor=300.000000, AllowNonAdminsToLaunchProspects=True, AllowNonAdminsToDeleteProspects=False, LoadProspect, CreateProspect, ResumeProspect=True, LastProspectName.
- Written by Docker images on first boot if missing, same section and same keys (mornedhels sets `MaxPlayers=8`, `ShutdownIfEmptyFor=60.000000`): https://raw.githubusercontent.com/mornedhels/icarus-server/HEAD/scripts/icarus-bootstrap . The same script also writes `Engine.ini` `[OnlineSubsystemSteam]` `AsyncTaskTimeout=60` (their default, a Steam-timeout workaround; why it is needed is not explained).
- Config is read at start-up, edit while stopped (vendor claim: https://www.gameserverkings.com/knowledge-base/icarus/icarus-server-settings.md).
- Save model: one server runs ONE "prospect" (a world: Open World, Mission or Outpost) at a time; each prospect is a single `.json` in `Saved\PlayerData\DedicatedServer\Prospects\`. Never rename the file or edit the JSON ("will corrupt your saved data"). Official Migrating page. Local single-player worlds can be copied from `%UserProfile%\AppData\Local\Icarus\Saved\PlayerData\<SteamID>\Prospects\` (same page).
- Naming: the save name is the `SaveName` argument of CreateProspect, or random if omitted for ordinary prospects, "must be included for outposts" (official Config page). Ban list: `Icarus\Saved\PlayerBanList.txt`; admin whitelist `Icarus\Saved\AdminWhitelist.txt` (one SteamID per line; vendor-community wiki says it "Breaks 'delete' button on prospect load"): https://icarus.wiki.gg/wiki/Dedicated_Servers
- Empty-server behaviour: by default after 300 s with no players (or 300 s with nobody joining after boot) the server unloads the prospect and returns to the lobby (it does not exit the process); negative values = run indefinitely, 0 = immediately. Official Config page.
- Admin: no password by default; with empty AdminPassword anyone can `/AdminLogin` to become admin. Official Config page.
- Clients: server browser, switch toggle to "dedicated servers". https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Connecting-to-Servers . Vendor claim: since the Week 244 update (6 Aug 2026) the browser filters to matching versions by default, so a server not updated is invisible (https://www.gameserverkings.com/knowledge-base/icarus/icarus-dedicated-server-setup.md).

## 7. Graceful stop and save-on-exit
- Official docs state no stop command. The only official stop action is `taskkill /im IcarusServer.exe` in their update bat (a plain taskkill without /f sends a close request). https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Updating-Dedicated-Server-and-Running-your-Server
- Console-window Ctrl+C: the Pterodactyl egg's stop command is `^C (SIGINT)` https://eggs.pterodactyl.io/egg/games-icarus-dedicated ; the WindowsGSM plugin sends `^c` to the main window and then waits 20 s; mornedhels sends SIGTERM and waits 60 s before escalating, recommends `stop_grace_period: 90s` (links above).
- No source states what the server writes to disk on exit. A vendor wiki says the prospect is saved automatically and again when a session ends cleanly, and force-killing "loses progress": https://supercraft.host/wiki/icarus/save_files_and_prospect_transfer/ (search-result summary, page not opened by me; treat as UNVERIFIED).
- In-game commands (chat, `/` or `\`, admin after `/AdminLogin password`): AdminLogin, KickPlayer, BanPlayer, UnbanPlayer, ReturnToLobby, ReturnToLobbyWhenEmpty, AdminSay. Official: https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Console---RCON-Commands . There is no save or quit command in that list.

## 8. Query protocol (player count for the panel)
- The query port is a "Steam server query" port (official Config page: "-QueryPort= Set the port to use for Steam server queries"). So an A2S-style query on UDP 27015 is plausible but no source states A2S is answered, nor what it returns. UNVERIFIED. No RCON and no REST API found. GameDig already supports many UE games but I did not find an Icarus entry (not checked).
- Vendor claim that the in-game browser sends a query packet to the query port to read name, prospect, player count and ping: https://supercraft.host/wiki/icarus/icarus_server_not_showing_in_browser/ (search-result summary only).
- Recommended panel approach until tested: process-alive + optional A2S probe on the query port; confirm with a real run (see UNVERIFIED).

## 9. Memory/CPU and disk
- Official: none stated.
- Vendor claims, which disagree: IONOS "Quad-core 2.0 GHz, RAM 4-6 GB minimum, disk 5 GB" (https://www.ionos.com/digitalguide/server/know-how/icarus-dedicated-server.md); mornedhels "CPU min 2 (high single-core preferred), RAM > 8 GB (16 GB recommended), disk ~20 GB" (README link above); Supercraft/Valebyte search results quote 8 GB min / 16 GB recommended and up to 24-32 GB for 8 players (not opened). The official-ish community wiki: "The server is processor-intensive, and load increases with player count." https://icarus.wiki.gg/wiki/Dedicated_Servers
- Panel suggestion supported by the sources: disk at least 20 GB free (10.4 GB install, update needs temporary extra), RAM warn below 8 GB, plan 16 GB. Treat as rough.
- Linux-only note, not relevant on Windows: OOM-on-plenty-of-RAM fixed by `vm.max_map_count=262144` (mornedhels README).

## 10. Windows pitfalls
- Windows binary only, no Linux build (runs under Wine elsewhere). https://www.gameserverkings.com/knowledge-base/icarus/icarus-dedicated-server-setup.md
- FireDaemon guide says to install the "DirectX End-User Runtime" and does not mention VC++ redistributables: https://kb.firedaemon.com/support/solutions/articles/4000194572-icarus-dedicated-server . Whether a missing runtime causes a start failure is UNVERIFIED.
- Firewall: needs inbound UDP for the game and query port; the Windows firewall prompt on first launch is standard but not documented for Icarus. UNVERIFIED as Icarus-specific. UPnP: no source, none mentioned.
- Without `-Log` the official docs say the server shows no window; with `-Log` a log window appears. For a panel capturing output: log file is `Icarus\Saved\Logs\Icarus.log`, `-LOG=`/`-ABSLOG=` redirect it (official Config page).
- `%LocalAppdata%`: see contradiction in section 2; check where `Saved` really lands on the first run, since a user-profile save folder would break backups. `-UserDir=` fixes the location (relative or absolute path).

## 11. Updates
- Re-run `app_update 2089300 validate` with the server stopped. Official update script: taskkill, then `steamcmd +runscript icarus.txt` where icarus.txt = `login anonymous`, `app_update 2089300 validate`, `quit`. Official Updating page.
- Version must match clients: "if the versions don't match, it won't be possible to connect" (guides) and the browser version filter (section 6). The game ships weekly patches per vendor (https://www.gameserverkings.com/knowledge-base/icarus/icarus-dedicated-server-setup.md), but Steam metadata only shows buildids, so checking `buildid` of branch `public` at `https://api.steamcmd.net/v1/info/2089300` is how mornedhels detects updates (their updater script).

## 12. Things the panel must NOT do
- Do not kill by image name (`taskkill /im IcarusServer.exe` or `...Shipping.exe`): kills all instances; track the PID started by the panel.
- Do not hard-kill unless the graceful wait (suggested 60-90 s from mornedhels/WindowsGSM) expires.
- Do not write `SessionName` and expect it to rename the server; pass `-SteamServerName=` instead.
- Do not leave `-CreateProspect=` in the start script permanently (vendor warning: creates a fresh save each restart, https://xgamingserver.com/docs/icarus/launch-parameters); the official docs say the three commands are processed in order LoadProspect, ResumeProspect, CreateProspect (Config page), but what happens when a save of that name already exists is not documented. Use `ResumeProspect=True` instead after first creation.
- Do not rename or edit prospect `.json` files.
- Do not leave `AdminPassword` empty on an exposed server.

## UNVERIFIED
1. Whether `IcarusServer.exe` (server root) launches `IcarusServer-Win64-Shipping.exe` as a child and which one stays alive (process name to match).
2. Exact `Saved` location on Windows when run from the install folder with no `-UserDir=`: install-folder `Icarus\Saved` (Server-Setup page) versus `%localappdata%\Icarus` (Config page).
3. What Ctrl+C / WM_CLOSE / taskkill (no /f) does to the server and whether it saves the prospect on exit; no official stop procedure.
4. Whether the query port answers Steam A2S (and what it reports: players, name, map) or only a custom packet.
5. Official RAM/CPU requirement (sources disagree: 4-6 GB to 16+ GB).
6. Whether `-maxplayers=`, `-JoinPassword=` and `-NOSTEAM` are real arguments (only third-party examples). Also the real maximum for `MaxPlayers` today: official says 1-8; a Dec 2022 patch note quoted by a vendor says dedicated servers "will be opened up to more than 8 players" (https://www.gameserverkings.com/knowledge-base/icarus/icarus-server-settings.md, quoted not opened at source).
7. Whether any implicit ports exist beyond game and query.
8. Windows prerequisites (DirectX End-User Runtime, VC++ redistributables) actually needed on a clean Windows install.
9. Behaviour of `-CreateProspect` when the save name already exists; `ResumeProspect` plus `LastProspectName` interplay on first run.
10. `Engine.ini` `[OnlineSubsystemSteam] AsyncTaskTimeout`: why Docker images set it (60) and whether it is needed on Windows.
11. Full ServerSettings.ini key set in the current build: the official reference was last updated 2022, and the 12-key template is only confirmed by sources that copy it. New keys may exist.
12. Whether `+login anonymous` works with the experimental branch password-free (icarus.wiki.gg shows it without a password; not tried).
13. Actual install on this machine was not done (10.4 GB); no first-run check was made, so nothing in sections 5-8 was confirmed by running the server.

# Abiotic Factor dedicated server: BASICS (conventions section A)

Researched 2026-10-14. Build tested: Steam public branch buildid 24343458 (server reports game version 1.0.0.6, EOS BuildUniqueId 1040001).

Evidence labels: **[TESTED]** = I installed the server with SteamCMD into the research folder and ran it on this PC on ports 17777/27099 (not the user's live install), so the fact is first-hand. Everything else has a URL.
Test install (reusable by other research agents, do not run it on 7777/27015): `...\scratchpad\research\abiotic\server\` ; SteamCMD at `...\abiotic\steamcmd\steamcmd.exe`. Official wiki cloned into `...\abiotic\wiki_clone\w\` (Quickstart, Launch Parameters, Migrating Saves) and `...\abiotic\wiki_clone\main\` (RunServer.Bat, SandboxSettings.ini).

## 1. SteamCMD command
- App: "Abiotic Factor Dedicated Server", app id 2857200, type Tool, `freetodownload=1`, windows 64-bit only, parent app 427410, public buildid 24343458. https://api.steamcmd.net/v1/info/2857200
- Official (wiki) steps: `login anonymous`, optional `force_install_dir <path>`, then `app_update 2857200 validate`. https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki/Guide-%E2%80%90-Quickstart (cloned file `Guide-‐-Quickstart.md`)
- One-line form [TESTED, worked, "Success! App '2857200' fully installed."]:
  `steamcmd.exe +force_install_dir <dir> +login anonymous +app_update 2857200 validate +quit`
  (`force_install_dir` before `login`; exit code 7 on the very first run is just SteamCMD self-updating; re-run it.)
- Sources of the "Linux needs `+@sSteamCmdForcePlatformType windows`" detail are not needed for the panel (Windows only). The Linux/Wine reporter also warns newer SteamCMD rejects `+force_install_dir ./` (use a real path): https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/59
- Download is ~726 MB, installed size 3,014,954,555 bytes (2.9 GB on disk) [TESTED]; matches depot data https://api.steamcmd.net/v1/info/2857200 (download 726285440, size 3014954555).
- Depot 228989 is flagged `sharedinstall` from app 228980 (a shared redist-style depot; SteamCMD also created `steamapps\appmanifest_228980.acf`) [TESTED]. https://api.steamcmd.net/v1/info/2857200

## 2. Install folder layout [TESTED]
Files land directly in the `force_install_dir` (no `steamapps\common\...` subfolder; `installdir` "Abiotic Factor Dedicated Server" is only used when no force dir is given). Matches wiki wording "(Server Install)\AbioticFactor\Binaries\Win64\". Wiki: https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki/Guide-%E2%80%90-Quickstart
```
<install>\AbioticFactorServer.exe            (launcher, 291,840 bytes)
<install>\AbioticFactor\Binaries\Win64\AbioticFactorServer-Win64-Shipping.exe   (134 MB, the real server)
<install>\AbioticFactor\Binaries\Win64\steam_appid.txt, steamclient64.dll, tbb*.dll, OpenImageDenoise.dll ...
<install>\AbioticFactor\Content\...
<install>\Engine\
<install>\Manifest_*.txt
<install>\steamapps\appmanifest_2857200.acf, appmanifest_228980.acf
```
Created at first run: `<install>\AbioticFactor\Saved\` (see section 6).

## 3. Executables and Windows process names
- Steam's own launch entry for the tool: executable `AbioticFactorServer.exe`, arguments `-log -newconsole`, windows 64. https://api.steamcmd.net/v1/info/2857200
- Wiki quickstart / sample RunServer.bat run `AbioticFactorServer-Win64-Shipping.exe` from `AbioticFactor\Binaries\Win64\`. https://github.com/DFJacob/AbioticFactorDedicatedServer/blob/main/RunServer.Bat (cloned at `wiki_clone/main/RunServer.Bat`: `AbioticFactorServer-Win64-Shipping.exe -log -newconsole -useperfthreads -NoAsyncLoadingThread -MaxServerPlayers=6 -PORT=7777 -QueryPort=27015 -ServerPassword=YourServerPassword -SteamServerName="Your Server Name"`).
- Maintainer confirms both exes exist and which is which: root `AbioticFactorServer.exe` vs `Binaries\Win64\AbioticFactorServer-Win64-Shipping.exe`. https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/47
- **TWO processes run [TESTED]** when starting the root launcher (with `-log`, and without `-log`):
  - `AbioticFactorServer.exe` (launcher): ~6-7 MB working set, **parent** of the shipping exe. Command line = your args as given.
  - `AbioticFactorServer-Win64-Shipping.exe`: the real server, ~840 MB working set idle (empty world), 54 threads, owns the UDP sockets. Its command line is `...\AbioticFactor\Binaries\Win64\AbioticFactorServer-Win64-Shipping.exe AbioticFactor <all your args>` (launcher prepends the project name `AbioticFactor` and forwards args).
  - The launcher stays alive as long as the shipping process lives, and exits with it (both gone after a Ctrl+C or close, [TESTED]).
  - Starting the shipping exe directly (as the wiki does) works too (UE log header from a user's run shows `ExecutableName: AbioticFactorServer-Win64-Shipping.exe`, https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/36); then only one process exists. I did NOT test this variant myself.
- For the panel `processName`: use `AbioticFactorServer-Win64-Shipping.exe` as the process that holds the ports and memory. If the panel launches the root launcher, track the launcher PID as the root of a process tree and also match the shipping child by full path/parent PID (see 12).

## 4. Ports and protocols
| Port | Default | Protocol | Purpose | Source |
|---|---|---|---|---|
| Game `-PORT=` | 7777 | UDP | game traffic ("requires port forwarding") | wiki Launch Parameters; https://xgamingserver.com/docs/abiotic-factor/server-ports (7777 UDP) ; [TESTED] bound `0.0.0.0:17777` UDP when `-PORT=17777` |
| Query `-QueryPort=` | 27015 | UDP | Steam server-list/advertising and A2S query | wiki: "The port used for advertising the server on steam, not fully required but still recommended"; [TESTED] bound `0.0.0.0:27099` UDP, answers A2S |
| LAN discovery (only with `-LANOnly`) | 14001 | (not stated) | wiki: "network port 14001 isn't blocked ... used to find servers" | https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki/Technical-%E2%80%90-Launch-Parameters |
| EOS P2P range | 7777-7876 | UDP (EOS P2P) | A server log line "LogEOSP2P: Verbose: Using Port Range 7777-7876 for P2P traffic" appears even with a custom port; purpose unclear | log excerpt in https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/36 |

- [TESTED] The shipping process owned only two UDP sockets (game + query) and no TCP listener except a localhost-only one (127.0.0.1:random, likely Steam/EOS internal). There are also outbound TCP connections (EOS/Steam backends). So **no inbound TCP is needed**; no RCON port exists.
- IONOS's guide says "TCP/UDP" for 7777 and 27015 (https://www.ionos.com/digitalguide/server/know-how/abiotic-factor-dedicated-server.md), but my measured listeners are UDP only; treat UDP as sufficient.
- Query port clash: if another Steam game server uses the same query port, Steam init fails with "STEAM: Failed to initialize Steam. This could be due to another Steam game server running on the same Query Port. Try to change the query port with -QueryPort=". https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/55 (so each Abiotic server needs a unique query port).
- A server on a custom `-PORT` was reported as ignoring it in one case; the cause was a stale empty `SandboxSettings.ini` in the world folder (deleting it fixed it): https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/36 . I could not reproduce (my `-PORT=17777` was honoured, log: "IpNetDriver listening on port 17777") [TESTED].
- Bind: server listens on `0.0.0.0` by default [TESTED]. `-MultiHome=<ip>` to choose an address; per maintainer, for it to take effect use **both** `-UseLocalIPs` and `-MultiHome=<ip>`. https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/61
- Players find the server by name in the in-game browser, or by "join code" (log shows `Session short code: <5 chars>`), or direct connect `ip:port` [TESTED log; join code mentioned at issue #61 and wiki Launch Parameters "join code"]. A user note: the server shows only in the correct list type (PC browser vs LAN) https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/21 (low-quality, see UNVERIFIED).

## 5. Minimal working start command
- Wiki-recommended (bat in `Binaries\Win64`): see sample above. https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki/Guide-%E2%80%90-Quickstart
- [TESTED] works from the install root, running the launcher with a working dir = install root:
  `AbioticFactorServer.exe -log -PORT=7777 -QueryPort=27015 -SteamServerName="My Server" -MaxServerPlayers=6`
  Reached `LogInit: Display: Engine is initialized` ~3 s after process start (game loads quickly), session created, bound sockets within ~10 s.
- With no password args the server is open; with `-ServerPassword=` set joining needs it. `-AdminPassword=` is separate (lets players become admin in-game). https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki/Technical-%E2%80%90-Launch-Parameters
- `-MaxServerPlayers=` 1..24, but over 6 is "not recommended and will provide users with a warning popup" (same page). Defaults when omitted: the test run without `-MaxServerPlayers` was not done; UNVERIFIED default.
- **Never use `-NOSTEAM`**: wiki "WARNING: Do not -NOSTEAM"; server log "DO NOT use -NOSTEAM as the Abiotic Factor server will NOT function correctly". https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/55
- Quote-handling: the launcher forwards `-SteamServerName="GodlyResearch"` and the log shows `-SteamServerName=GodlyResearch` [TESTED]; spaces inside quotes are what the wiki uses (`-SteamServerName="Your Server Name"`).
- `-log` effect [TESTED]: gives the shipping process a console window (title = exe path) that receives the log; without `-log` it runs with **no window and no console** (MainWindowHandle 0) but still writes `Saved\Logs\AbioticFactor.log`. Wiki: "If these parameters aren't used then the server will launch in the background". `-newconsole` is documented to open a visible window (same wiki page); not separately tested.
- Wiki sample also adds `-useperfthreads` (wiki: optional, "currently recommended") and `-NoAsyncLoadingThread` (the Launch Parameters page documents `-DisableAsyncLoadingThread` "not currently recommended after server community feedback" and says "This option used to be called -DisableAsyncLoadingThread" (sic, the wiki text is self-contradictory)). I did not test either. See launch-args step for details.
- Start working directory: [TESTED] works with cwd = install root. Does not require cwd = Win64 when launching via the root launcher.

## 6. First-run behaviour and saves [TESTED unless cited]
Files created by one start with no existing data (relative to `<install>\AbioticFactor\Saved\`):
- `Logs\AbioticFactor.log` (the live log; on each start the previous one is renamed `AbioticFactor-backup-YYYY.MM.DD-HH.MM.SS.log`, timestamp = when the previous run ended)
- `SaveGames\Server\Admin.ini` (see below)
- `Config\WindowsServer\GameUserSettings.ini` (client-style graphics/crossplay file with `CrossplaySetting=PartialCrossplay`) and `Config\WindowsServer\Settings.ini` (`[SectionsToSave] bCanSaveAllSections=true`)
- `Config\CrashReportClient\UECC-Windows-<hash>\CrashReportClient.ini`
- **`SaveGames\Server\Worlds\` was NOT created** on a first start with no player ever joining. The default world name logged: `LogAbiotic: Warning: No WorldSaveName param, using default: Cascade` / `World save: Cascade`. So the world folder (and `SandboxSettings.ini` inside it) appears later; when exactly is UNVERIFIED (see list).
- Default `Admin.ini` content written on first run:
  ```
  [Moderators]
  Moderator=ExampleID1
  Moderator=ExampleID2

  [BannedPlayers]
  BannedPlayer=ExampleBanID1
  BannedPlayer=ExampleBanID2
  ```
  Wiki: put a SteamID64 under `[Moderators]` as `Moderator=<id>`; Admin.ini location `\(Server Install)\AbioticFactor\Saved\SaveGames\Server\Admin.ini`. https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki/Guide-%E2%80%90-Quickstart ; https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki/Technical-%E2%80%90-Launch-Parameters (`-AdminIniPath=`)
  - A user reports that starting the server wiped their moderators from Admin.ini (https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/25); I did not test this. Panel should not assume Admin.ini edits survive while the server is running; edit only while stopped.
- World naming: `-WorldSaveName=<name>` picks the folder `...\SaveGames\Server\Worlds\<name>`; default `Cascade`. Wiki Launch Parameters + Migrating Saves (`The world saves folder on the dedicated server is located at \(Server Install)\AbioticFactor\Saved\SaveGames\Server\Worlds\`). https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki/Guide-%E2%80%90-Migrating-Saves
- `SandboxSettings.ini` is per world: default `...\Worlds\<World>\SandboxSettings.ini`, override with `-SandboxIniPath=` (path relative to `Saved\`). The repo ships a reference `SandboxSettings.ini` (cloned in `wiki_clone/main/`). https://github.com/DFJacob/AbioticFactorDedicatedServer/blob/main/SandboxSettings.ini
- The server checks save integrity at start: log lines "Dedicated Server entered ServerEntry, checking world save for corruption", and a corrupt world with no backup stops the server ("World save Cascade is corrupt and has failed to restore from backup", reporter's log in https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/64). A backup folder is maintained by the game on a schedule (users mention backups roughly every 5-20 minutes and no setting to change it): https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/16
- Single-player/host saves can be copied: `%LocalAppData%\AbioticFactor\Saved\SaveGames\<steamid>\Worlds\<World>` to the server Worlds folder (Steam only; PS5/Xbox/Gamepass saves not supported). Wiki Migrating Saves URL above.

## 7. Stopping gracefully
- **No RCON and no typed stop command** exist. No source found for a dedicated-server console command. XGamingServer: "Abiotic Factor has no built-in console commands" (commands need the Cheat Console Commands mod + UE4SS); admin actions are through the in-game Player Management UI, Admin tab has "Force World Save". https://xgamingserver.com/docs/abiotic-factor/console-commands
- **Ctrl+C works** [TESTED] when the server was started with `-log` (it has a console): log shows `Engine exit requested (reason: ConsoleCtrl RequestExit)`, `*** INTERRUPTED *** : SHUTTING DOWN`, `PreExit Game`, `BeginTearingDown for /Game/Maps/Facility`, net driver shutdown, `Game engine shut down`, `Exiting.` ~2.5 s later; both launcher and shipping process disappeared. Pterodactyl's egg also uses `^C (SIGINT)` as the stop signal. https://eggs.pterodactyl.io/egg/games-abiotic-factor
- **Closing the console window works** [TESTED] when started with `-log`: `Process.CloseMainWindow()` on the shipping process (which has the console window as its main window) gave `Engine exit requested (reason: ConsoleCtrl RequestExit)` and both processes exited. IONOS also says closing the console window takes the server offline. https://www.ionos.com/digitalguide/server/know-how/abiotic-factor-dedicated-server.md
- **Without `-log` there is no console and no window** [TESTED]: `taskkill /PID <shipping>` (no /F) fails with "This process can only be terminated forcefully (with /F option)"; `AttachConsole` to either process fails (error 6, no console); so graceful stop is not possible. Therefore the panel should always start with `-log` (and use a hidden console/own console so a Ctrl+C or window-close can be delivered). I did not test delivering the signal to a console created by the panel's own spawn flags (e.g. `CREATE_NEW_CONSOLE` hidden); that is for the implementer to test.
- Does it save on exit? The shutdown log with an empty world shows no save step (no world existed). **UNVERIFIED** whether a populated world is written on exit. Documented safe practice from the host guides is to use the admin menu "Force World Save" before stopping (XGamingServer above). Auto-save cadence is not documented officially (issue #16 users report about every 5-20 minutes).
- Force-kill is possible but save-risky: one user's data-loss thread is https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/46 (no answer given).

## 8. Query / player count for a panel
- **Steam A2S works on the query port** [TESTED]. Request `FF FF FF FF 54 "Source Engine Query\0"` to UDP `27099` replied immediately (no challenge needed) with a Source-style `0x49` info packet: protocol 17, name = the `-SteamServerName` value, folder `AbioticFactor`, game `Abiotic Factor`, appid field 0, **players = 0, max players = 4 (equal to `-MaxServerPlayers`)**, bots 0, type `d` (dedicated), env `w` (Windows), visibility 0 (public even though I set no password; password-set behaviour untested), version string `1.0.0.6`, plus an extra-data keyword string `BUILDID:1040001,OWNINGID:...,OWNINGNAME:<name>,SESSIONFLAGS:43,ShortCode_s:<join code>,GamePort_i:<game port>,SN_i:1`. So a panel can read online/offline, player count, max and the join code from A2S_INFO with plain UDP and no library. (Game "gamedig" method: protocol type likely `valve`/`protocol-valve`; not tested with gamedig itself.)
- A2S_PLAYER: the request `FF FF FF FF 55 FF FF FF FF` got back a short `0x44` reply with count 0 (6 bytes) when no players were connected; player names with players present UNVERIFIED (no client available).
- A2S works from the host's loopback; reachability from outside needs the query port forwarded (same as for the server browser).
- The query port also being the Steam "advertising" port: wiki text above. A listing site claims it verifies via A2S on the exact QueryPort: https://supercraft.host/servers/abf/add/ (third party, only supports the idea).
- No REST API and no RCON found. "Steam Dedicated Server API" (issue #55) is just the Steam game-server init message, not an API. A claim of RCON on port 27020 appears only in a generic hosting guide and is unsupported (https://www.liquidweb.com/?p=372215); treat as false.
- Admin / player management is in-game only (Admin.ini moderators or `-AdminPassword`). https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki/Technical-%E2%80%90-Launch-Parameters

## 9. Memory and CPU
- Official figures: none found (the wiki has no requirements section; wiki home https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki ). Official stance on slots: over 6 players not recommended (Launch Parameters wiki).
- [TESTED] idle, empty world, 4 slots: shipping exe working set ~837-840 MB.
- A user with a real world on a Ryzen 9 7950X3D: "The server seems to only use 1% of my CPU and 2G of RAM". https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/48
- Hosting vendor figures (third party, differ): IONOS "Quad-core with at least 2 GHz", RAM 2-3 GB, 4 GB storage. https://www.ionos.com/digitalguide/server/know-how/abiotic-factor-dedicated-server.md ; Supercraft (search-result summary only, page fetch timed out): 4 cores 2.5 GHz and 8 GB for 6 players, 16 GB for 12, 32 GB for 24, i.e. a 2-4 GB base + 0.5-1 GB per player: https://supercraft.host/wiki/abiotic-factor/server_requirements/ (UNVERIFIED, not read).
- A user on a 4 vCore / 4 GB / 3 Mbps Windows Server 2022 box reports 5-20 s portal loading times and heavy bandwidth need: https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/43
- Panel suggestion (not a fact): label as "about 1-2 GB RAM for a small world, plan 4+ GB with several players, 4 cores".

## 10. Known Windows pitfalls
- **Firewall prompt**: on the first launch of the shipping exe Windows created **inbound Block rules** (one TCP, one UDP, profiles Private+Public) named `abioticfactorserver-win64-shipping.exe` for the exact exe path [TESTED; the prompt was answered/dismissed by the non-interactive session, resulting in Block rules]. Players cannot connect from other machines until an Allow rule exists for each UDP port/program. The panel should add an inbound allow rule per install (program path and UDP game+query ports) rather than rely on the prompt. Even on this machine I could not delete the rules (needs admin).
- **Visual C++ redistributable**: running the root `AbioticFactorServer.exe` on a fresh Windows Server made it pop up "install the Visual C++ Redistributables"; after installing it still produced no output because of unrelated missing audio/graphics DLLs on Server Core (dsound, winmm, opengl32 etc.). https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/38 . On a normal Windows 10/11 desktop (this PC) it started without any redist prompt [TESTED].
- Server Core / headless Windows needs desktop-experience DLLs (list in issue #38 above).
- **Router/ISP**: port forward UDP game and query ports; CGNAT, wrong system time/timezone and a non-static IP cause "connection timed out" per the maintainer: https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/41 . Direct connect needs the forwarded game port.
- Wrong command-line problems: launching a malformed .bat gives a window with no output (issue #37 https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/37).
- **UPnP**: no UPnP/port-mapping behaviour found in the log or docs. [TESTED] no router mapping attempt visible in log lines I read; not exhaustively checked. UNVERIFIED.
- No user-level folder requirement: it ran from a normal folder (scratchpad under `%LOCALAPPDATA%`) without admin rights [TESTED]. Running the server writes to `<install>\AbioticFactor\Saved`, so the install folder must be writable.
- Windows Event Log spam "Out of memory" warnings from source `AbioticFactor-PID<n>` are harmless in-game warnings per the reporter's text (message is "UpdateActorToWorldSave: ... tried to save before Save Data was loaded"): https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/56
- Occasional crash (stack overflow after 5 min to 10 h) was reported and apparently stopped on its own; suggest auto-restart: https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/48
- Crash reporter: a `CrashReportClient` config folder is created, but I saw no CrashReportClient process.

## 11. Updates
- The server tool is updated through SteamCMD only; when the game updates, clients get a "server is running a newer version" error until the server runs `app_update 2857200` again. https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/19 ; https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/51 ("the steamcmd version of the dedicated server requires manual updating")
- Update by rerunning the same SteamCMD command with the server stopped. [TESTED] a second run with `validate` printed "Verifying installation..." and exited 0 in seconds when up to date.
- Steam build info for freshness check: public branch buildid 24343458 (`timeupdated` 1785179524 ≈ 2026-07-27 UTC) https://api.steamcmd.net/v1/info/2857200 . A panel can compare `buildid` in `steamapps\appmanifest_2857200.acf` [TESTED, field `buildid` present] with Steam's.
- Pterodactyl egg treats "Engine is initialized" (`LogInit: Display: Engine is initialized.`) as the "server is up" console line; the same line appeared in my log [TESTED]. https://eggs.pterodactyl.io/egg/games-abiotic-factor

## 12. What a panel must NOT do
- Do not kill by image name `AbioticFactorServer*.exe`: any other Abiotic server on the machine (or the user's client, whose process is a different name but the pattern is similar) would die. Two processes per server (launcher + shipping) mean image-name matching is double wrong. Track by PID or by full command line / exe path under the server's own install folder. [TESTED process tree above]
- Do not hard-kill (`taskkill /F`, `Stop-Process -Force`) as the normal stop; use Ctrl+C / console close (needs `-log`). Hard kill is allowed only as a timeout fallback, since save-on-exit is unproven.
- Do not start without `-log`: then no graceful stop path exists [TESTED].
- Do not use `-NOSTEAM`.
- Do not give two Abiotic servers the same query port (Steam init fails) and keep game ports unique too (the P2P range note above shows 7777-7876 touched even on custom ports, so avoid game ports inside another server's range if clashes appear; UNVERIFIED if this really conflicts).
- Do not edit `Admin.ini` while the server runs, and do not hand-write an empty `SandboxSettings.ini` into a world (issue #36 reports an empty stale file broke port binding). https://github.com/DFJacob/AbioticFactorDedicatedServer/issues/36
- Do not run SteamCMD with `+force_install_dir ./` (newer SteamCMD rejects it per issue #59); use an absolute path.
- Do not delete `Saved\SaveGames\Server\Worlds\*` when "resetting": that erases all progress (the folder is the world). Do not treat `Cascade` as a magic name when `-WorldSaveName` is set.

---

## UNVERIFIED
1. Whether a populated world is saved on Ctrl+C / console close (no client was available to create a world; empty-world shutdown log shows no save step). Also the autosave interval and backup count/location (only user comments in issue #16).
2. When `Saved\SaveGames\Server\Worlds\<World>\` and its `SandboxSettings.ini` are first created (not on a bare start with no joiner; likely on first player join or via admin action). Whether the server writes its own default `SandboxSettings.ini` at all (issue #58 "Default Sandbox Settings Doesn't Generate" exists; title only read).
3. Default value of `-MaxServerPlayers` when omitted.
4. Whether `-QueryPort` and `-PORT` default to 7777/27015 when omitted (xgamingserver/IONOS list those defaults; I only ran with explicit ports).
5. A2S_PLAYER content when players are connected (names/score); whether the A2S `visibility` byte reflects a password; whether gamedig's "valve" protocol parses this server (not run).
6. Whether the shipping exe alone (wiki-style) leaves exactly one process and behaves identically for stopping.
7. Whether a console created by the panel's spawn flags (hidden new console) can receive Ctrl+C/CTRL_CLOSE so `-log` shutdown still works when the panel runs headless as a service.
8. Official minimum RAM/CPU (no developer figures found); Supercraft page content not read (fetch timed out); progameguides and survivalservers.com pages returned HTTP 403.
9. UPnP: no evidence either way.
10. Purpose and conflict potential of the EOS P2P port range 7777-7876 in logs (seen only in a user's paste; my own log lines for it were not found).
11. Whether the inbound firewall block rules are created only when no one answers the prompt (here the session was non-interactive) vs. always; the exact behaviour for an interactive "Allow" is untested.
12. Whether any mod loader / mod folder exists for the dedicated server is covered by the separate mods step (04-mods.md), not here.

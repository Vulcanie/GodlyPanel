# Terraria / tModLoader: server basics (STEP basics, section A)

Researched 2026-10-15. Read-only web research plus reading file contents of the official release zips (listed, not extracted or run). Nothing was installed or started.
Builds this is for: tModLoader release v2026.08.3.0 (GitHub, published 2026-10-01; branch "1.4.4-stable", .NET 8), vanilla Terraria server 1.4.5.8 (terraria-server-1458.zip).
Steam depot build ids seen (Steam metadata): tModLoader `public` buildid 25640906.

## 0. Bottom line (short)
1. There is NO dedicated-server app for Terraria on Steam. Terraria (105600) has Steam metadata `"noservers": "1"` and no server tool. Source: https://api.steamcmd.net/v1/info/105600
2. Vanilla Terraria server = a zip from terraria.org only (`https://terraria.org/api/download/pc-dedicated-server/terraria-server-1458.zip`, HTTP 200, application/zip, 46,415,317 bytes, Last-Modified 2026-08-23; checked with a HEAD request). Not SteamCMD. The terraria.org API lists the current file as `["terraria-server-1458.zip", ...]` (https://terraria.org/api/get/dedicated-servers-names).
3. tModLoader (Steam app 1281930) IS a SteamCMD app (type Game, `isfreeapp=1`, parent 105600, Windows depot 1281932), BUT: the tModLoader team's own server script installs it with `+login <your steam username>`, not anonymous, and a maintainer says a server app with unrestricted access is not something they can easily make. Open feature request "Anonymous Download for SteamCMD" (#4277). So `+login anonymous +app_update 1281930` is **not documented to work and the evidence says it does not** (not tested here, so UNVERIFIED; one 5-minute real test settles it, see section 0.1).
4. What does work anonymously: Steam Workshop mod downloads for app 1281930 (`+login anonymous +workshop_download_item 1281930 <id>`), used by the official script.
5. The tModLoader server can be had without Steam login from GitHub (`tModLoader.zip`, 61 MB) which the official script offers as `install-tml --github` (a maintainer says the script "downloads the server directly from GitHub by default", but the script copy fetched here only uses GitHub with `--github`; otherwise it needs `--username`). The README recommends SteamCMD, yet the official Dockerfile itself runs `install-tml --github`.

### 0.1 Recommendation for GodlyPanel (installs run only through SteamCMD)
- Neither Terraria server can be installed by plain anonymous SteamCMD with confidence. Be honest in the UI plan: Terraria needs either a non-SteamCMD download step or a Steam account login.
- **Recommend supporting tModLoader** (not vanilla) as the one "Terraria" entry:
  - It is the only one with a Steam app id, it has a Windows launcher in the Steam depot, and its server ships with an official start script and an official Workshop mod download path (which IS anonymous SteamCMD).
  - Best install path for the panel: tiny HTTP download of the GitHub release zip (`https://github.com/tModLoader/tModLoader/releases/latest/download/tModLoader.zip`, 302 to the versioned asset, 61,142,677 bytes for v2026.08.3.0, verified by HEAD request), then SteamCMD only for mods. If the owner insists on SteamCMD-only, the only documented SteamCMD route is a real Steam login (`+login <user>`), which is a bad fit for a panel (password + Steam Guard).
  - tModLoader can host a world with no mods enabled; whether vanilla clients can join such a server is UNVERIFIED (see list).
- Before finalizing, run once on a real machine (needs a human with SteamCMD, not done here): `steamcmd +force_install_dir <dir> +login anonymous +app_update 1281930 +quit`. If it prints a "No subscription" style failure, the SteamCMD-only route is dead for the install step. If it succeeds, confirm that `start-tModLoaderServer.bat` and `tModLoader.dll` exist in the output folder. (Expected result is UNVERIFIED either way.)
- Vanilla (zip): easy to support if the panel gains an HTTP-zip installer (`TerrariaServer.exe` is a single exe, tiny, no runtime install). Mention as phase 2 or an alternative if the panel adds non-Steam installs.

## 1. SteamCMD
| Item | Fact | Source |
|---|---|---|
| Terraria store app | 105600, type Game, depots 105601 (windows), 105602 (linux), 105603 (macos); launch Terraria.exe; `noservers=1`; no server tool | https://api.steamcmd.net/v1/info/105600 |
| tModLoader app | 1281930, type Game, name tModLoader, `isfreeapp=1`, `parent=105600` (also `mustownapptopurchase=105600`, `appidredirect=105600`), oslist windows/macos/linux, `installdir=tModLoader`, workshop_visible=1, `workshopdepot=1281930` | https://api.steamcmd.net/v1/info/1281930 |
| tML Windows depot | 1281932 (config oslist windows). `public` manifest: download 85,927,152 bytes, size 206,997,464 bytes (~207 MB). Also shared redistributable depots 228988/228990/229004/229012 from app 228980 | same |
| tML branches | `public` (1.4.4 stable line), `1.4.3-legacy`, `1.3-legacy`, `preview-v2026.07/.08/.09` | same |
| tML Windows launch entries | `start-tModLoader.bat` (default, windows); legacy `tModLoader.exe` only for branch 1.3-legacy | same |
| Official SteamCMD install line | `eval "$steam_cmd +force_install_dir $folder/server +login $username +app_update 1281930 +quit"`; message "Provide the --username flag in order to download TML from Steam" | official script: https://raw.githubusercontent.com/tModLoader/tModLoader/1.4.4/patches/tModLoader/Terraria/release_extras/DedicatedServerUtils/manage-tModLoaderServer.sh (copy: raw/tml_manage.sh in this folder) |
| Official README | "SteamCMD (recommended)": `./manage-tModLoaderServer.sh install-tml --username your_steam_username`; GitHub alt: `install-tml --github` | https://docs.tmodloader.net/docs/stable/md__github_workspace_src_t_mod_loader__terraria_release_extras__dedicated_server_utils__r_e_a_d_m_e.html |
| Anonymous server download not supported | Issue #4277 (opened 2024-06-29, still open as of the fetch): zackman0010 asks for download "without requiring a login"; JavidPack (collaborator, 2024-06-30): "Our dedicated server management script already downloads the server directly from GitHub by default." and "Making a separate server steam appid with unrestricted access is not something we can easily do."; turtletowerz (2024-12-20): anonymous "would be a nice feature since TML is already free on the Steam store" | https://github.com/tModLoader/tModLoader/issues/4277 |
| Anonymous Workshop mods | `eval "'$steam_cmd' +force_install_dir '$folder' +login anonymous$steamcmd_command +quit"` with `+workshop_download_item 1281930 <id>` per line of install.txt | raw/tml_manage.sh (same URL as above) |
| Third-party claim of anonymous app_update | One blog gives `+login anonymous +app_update 1281930 validate`; unconfirmed, contradicted by the above | https://whitebilisim.com/en/posts/terraria-server-setup-guide (via search summary; page itself returned 403) |
| One user report | A 2022 Steam thread says the tML server batch asked for a Steam login; workaround was to log into Steam, install, run client once. Does not mention SteamCMD/anonymous | https://steamcommunity.com/app/1281930/discussions/0/5696507684084547720 |

Commands that DO work per sources:
- Install tML with Steam login (documented): `steamcmd +force_install_dir <dir> +login <steamuser> +app_update 1281930 +quit`
- Mods anonymously: `steamcmd +force_install_dir <dir> +login anonymous +workshop_download_item 1281930 <workshopId> +quit` (files land in `<dir>\steamapps\workshop\content\1281930\<workshopId>\`; this path pattern is the Valve standard, the tML wiki shows the same pattern for the client: `C:\Program Files (x86)\Steam\steamapps\workshop\content\1281930`, https://github.com/tModLoader/tModLoader/wiki/Basic-tModLoader-Usage-Guide)

## 2. Install folder layout and executables
### 2a. Vanilla server zip (terraria-server-1458.zip, read from the zip's file list)
```
1458/Windows/TerrariaServer.exe       (26,028,032 bytes)
1458/Windows/serverconfig.txt         (example config, all lines commented except priority=1)
1458/Windows/start-server.bat         (loops: TerrariaServer.exe -config serverconfig.txt, restarts on exit)
1458/Windows/changelog.txt
1458/Linux/...  1458/Mac/...
```
`start-server.bat` content: `@echo off / cls / :start / TerrariaServer.exe -config serverconfig.txt / ... Restarting server... / goto start`. NOTE: that bat restarts the server after `exit`, so a panel must run `TerrariaServer.exe` directly, not the bat. Source: the zip (https://terraria.org/api/download/pc-dedicated-server/terraria-server-1458.zip). The wiki also says `TerrariaServer.exe` is runnable standalone and 500 MB RAM is enough for a small world, .NET Framework 4.0 + XNA needed (installing the client provides both) (https://terraria.wiki.gg/wiki/Server).

### 2b. tModLoader release zip (tModLoader.zip v2026.08.3.0, file list read from the zip)
Top level contains: `tModLoader.dll` (+ `.pdb`, `.deps.json`, `.runtimeconfig.json`), `start-tModLoader.bat`, `start-tModLoaderServer.bat`, `start-tModLoaderServer.sh`, `serverconfig.txt`, `LaunchUtils\` (busybox64.exe, ScriptCaller.sh, InstallDotNet.sh, DotNetVersion.sh, EnvironmentFix.sh, QuickEditDisable.exe ...), `Libraries\`, `DedicatedServerUtils\`, `tModPorter\`. There is NO `tModLoaderServer.exe` and NO `TerrariaServer.exe` in the zip (only one top-level binary: `tModLoader.dll`). Source: the zip, https://github.com/tModLoader/tModLoader/releases/download/v2026.08.3.0/tModLoader.zip
- Windows launch chain (contents of the scripts in the zip):
  - `start-tModLoaderServer.bat` = `cd /D "%~dp0"` then `LaunchUtils/busybox-sh.bat ./start-tModLoaderServer.sh %*`
  - `busybox-sh.bat` ends with `start "" "LaunchUtils/busybox64.exe" bash %*` (note `start`: opens a new console window and the .bat returns immediately)
  - `start-tModLoaderServer.sh` adds `-server`, defaults `-config serverconfig.txt` if no `-config`, handles `-steam` / `-nosteam` (it **prompts** "Use steam server (y/n)" if neither is given, and prompts for lobby type if `-steam` without `-lobby`), then calls `LaunchUtils/ScriptCaller.sh`
  - `ScriptCaller.sh` makes sure .NET is installed under `<install>\dotnet\`, then runs `"$dotnet_dir/dotnet" tModLoader.dll "$@"`. Logs: `<install>\tModLoader-Logs\` (Launch.log, Natives.log, server.log)
  - Runtime needed: .NET 8.0.0 (`tModLoader.runtimeconfig.json`: tfm net8.0, Microsoft.NETCore.App 8.0.0). If not present locally, InstallDotNet.sh looks for `dotnet-runtime-8.0.0-win-x64.zip` next to it, else downloads one (`dotnetcli.azureedge.net/...` or `https://dot.net/v1/dotnet-install.ps1`) on FIRST start. So the first start needs internet.
- **Windows process name consequence (a panel must not kill by image name):** the real server process is `dotnet.exe` located at `<install>\dotnet\dotnet.exe` (arguments `tModLoader.dll -server ...`), with parent `busybox64.exe`. Another host `dotnet.exe` may exist on the PC, so match by full path (or by PID the panel spawned). (Inference from ScriptCaller.sh; not run: UNVERIFIED in practice.)
- Whether the Steam depot (not the GitHub zip) also contains a pre-deployed `dotnet-runtime-8.0.0-win-x64.zip` ("Allow for zip to be already delivered by steam win") is UNVERIFIED.
- Steam depot Windows layout: same files expected (launch entry `start-tModLoader.bat`; no server-specific launch entry in Steam metadata). UNVERIFIED beyond metadata.

## 3. Ports
| Port | Proto | What | Source |
|---|---|---|---|
| 7777 | TCP | Game port, default, set with `port=` / `-port`. Wiki: "Default: TCP port 7777", cloud hosts: "open port 7777 for both TCP and UDP" | https://terraria.wiki.gg/wiki/Server |
| 7777 | (Docker) | tML Docker container exposes 7777 | https://raw.githubusercontent.com/tModLoader/tModLoader/1.4.4/patches/tModLoader/Terraria/release_extras/DedicatedServerUtils/Dockerfile (EXPOSE per fetch summary) |
| none else | | No separate query port exists for vanilla or tML | (no source lists one; absence UNVERIFIED) |
- tML docs for `-steam -lobby friends|private` use Steam networking (no port forward needed for friends); `-nosteam` = Steam multiplayer disabled. Source: https://github.com/tModLoader/tModLoader/wiki/Starting-a-modded-server
- `upnp=1` / default UPnP: the vanilla server offers automatic port forwarding at launch; `-noupnp` disables it (zip's serverconfig.txt).
- Firewall: Windows will pop an allow dialog for `dotnet.exe` (tML) / `TerrariaServer.exe` (vanilla) on first listen. (General Windows behaviour, not from a Terraria source: UNVERIFIED for these exes.)

## 4. Minimum working start command
Vanilla, from the exe folder (no prompts, no restart loop):
`TerrariaServer.exe -config serverconfig.txt`
with serverconfig.txt lines (names verified in the zip's own example file) such as:
```
world=<full path>\MyWorld.wld
autocreate=2
worldname=MyWorld
maxplayers=8
port=7777
password=<secret>
```
Source for names/meaning: zip example file (quoted in section 2a) and https://terraria.wiki.gg/wiki/Server. Per the example file: `world=` "Load a world and automatically start the server"; `autocreate=` "Creates a new world if none is found. World size is specified by: 1(small), 2(medium), and 3(large)"; `maxplayers` "between 1 and 255", example 8; `port` example 7777; `priority=1` is the only uncommented line. The wiki says the default max players is 16 (8 before 1.4.0.1) (https://terraria.wiki.gg/wiki/Server): two sources differ in what an unset value means, so always write `maxplayers`.

tModLoader (supported route; run by the panel):
- Official documented form: `start-tModLoaderServer.bat -nosteam -config serverconfig.txt` (the wiki example is `start-tModLoaderServer.bat -nosteam -world "C:\Documents\My Games\Terraria\tModLoader\Worlds\MyWorld.wld"`; source https://github.com/tModLoader/tModLoader/wiki/Starting-a-modded-server). `-nosteam` is required to avoid the interactive prompt.
- Because the .bat uses `start` (new window), the panel cannot pipe stdin through it. Candidate for panel use: call `LaunchUtils\busybox64.exe bash ./start-tModLoaderServer.sh -nosteam -config serverconfig.txt` directly from the install folder, or after first run call `<install>\dotnet\dotnet.exe tModLoader.dll -server -config serverconfig.txt -nosteam` (the latter is what ScriptCaller.sh itself does, minus `-nosteam`, which only the .sh interprets: when started via dotnet directly, whether `-nosteam` is accepted by tModLoader.dll is UNVERIFIED; the Command-Line wiki page does not list it). Both candidates are UNVERIFIED (not run).
- tML-only config keys/args found in the shipped serverconfig.txt: `modpath=`, `modpack=`, `-tmlsavedirectory <path>` ("Mod and World directories are derived from the save directory"), `-modpack <name>`, `-modpath <path>`; `-steamworkshopfolder` appears in the official script's start line (`-steamworkshopfolder "$folder/steamapps/workshop"`) but is undocumented on the wiki (https://github.com/tModLoader/tModLoader/wiki/Command-Line). Detailed settings are for steps 02/03/04 (already in this folder).

## 5. First run, files, saves
- Vanilla world files: `.wld` (+ `.wld.bak`); worlds for Linux `~/.local/share/Terraria/Worlds/`, macOS `~/Library/Application Support/Terraria/Worlds` (https://terraria.wiki.gg/wiki/Server). The Windows default world folder is not stated on that page; the example `worldpath=C:\Users\Defaults\My Documents\My Games\Terraria\Worlds\` is only an example. Singleplayer worlds on Windows live in `%userprofile%\Documents\My Games\Terraria\Worlds` (hosting guides, e.g. https://xgamingserver.com/docs/terraria/upload-save). Whether the dedicated server uses that same folder with no `worldpath=` is UNVERIFIED. A panel should always set `world=` (full path) and `worldpath=` itself so saves stay inside the server folder.
- tML saves (Windows, client and server default): `%UserProfile%\Documents\My Games\Terraria\tModLoader` for the 1.4.4 stable line (`tModLoader-1.4.3` for 1.4.3, `tModLoader-preview` for preview). Subfolders: `Worlds\` (backups in `Worlds\Backups`), `Players\`, `Mods\` (manually installed `.tmod`). Logs are in `<install>\tModLoader-Logs` (https://github.com/tModLoader/tModLoader/wiki/Basic-tModLoader-Usage-Guide). Using `-tmlsavedirectory <install>\data` keeps everything in the server folder (https://github.com/tModLoader/tModLoader/wiki/Command-Line); the official script does exactly this (`-tmlsavedirectory "$folder"`).
- tML worlds: a modded world is a `.wld` plus a `.twld` (mod data) file; `world=` must point at the `.wld`, not `.twld` (https://github.com/tModLoader/tModLoader/wiki/Starting-a-modded-server).
- If the config file is missing the server prompts interactively for parameters (wiki Server page); with `world=` set and the world present it starts without prompts.
- Autosave/rolling backups: the zip's example mentions `worldrollbackstokeep` (vanilla example, "Sets the number of rolling world backups to keep", example value 2) but the shipped tML example does not list it. Wiki: the server "auto-saves periodically", hibernates when no players are online; changelog: since Desktop 1.4.5.0 it saves when the last player leaves. tML 1.4.4 may not have that (1.4.4 code base): UNVERIFIED.

## 6. Graceful stop and console (stdin)
- Console commands are typed into the server console (stdin); no slash. From https://terraria.wiki.gg/wiki/Server: `help`, `playing`, `clear`, `exit` (shut down AND save), `exit-nosave`, `save`, `kick <name>`, `ban <name>`, `password [pass]`, `version`, `time`, `port`, `maxplayers`, `say <msg>`, `motd [msg]`, `dawn`/`noon`/`dusk`/`midnight`, `settle`. Page text: the server "will only save on shutdown when using the exit command".
- So the panel's graceful stop = write `save` then `exit\n` to the server's stdin, wait for the process to end (needs the panel to own stdin of the actual process: easy for `TerrariaServer.exe`, harder for tML through the busybox chain, see section 4). `exit-nosave` is what to avoid.
- Ctrl+C / closing the console window behaviour (does it save?): not documented anywhere found. tML Docker README says in `docker attach` "`Ctrl-C` detaches and shuts down the server" without saying whether it saves. UNVERIFIED.
- tML adds its own console behaviour (mod load messages); extra tML-only console commands: none found in sources. (A hosting guide lists only vanilla commands: https://wabbanode.com/help/terraria/all-tmodloader-server-commands; it also lists `unban` and `seed`, which the wiki page does not, so treat those two as UNVERIFIED.)
- Docker-only helper: `docker exec -it tml execute "say Hello World!"` (README). Not applicable on Windows.

## 7. Query / status options
- Steam A2S (Steam query): none for either server (the vanilla server is not a Steam game server; `noservers=1`). UNVERIFIED that no other query exists in tML; none is documented.
- RCON: none in vanilla/tML. (TShock has a REST API, default port 7878 per one gist: https://gist.github.com/Minikea/5bc513a9e781a3f26277b09674fb4e03; TShock is a different server software and not what is being supported here.)
- GameDig: its `terraria` protocol queries the TShock REST endpoint `http://<ip>:<port>/v2/server/status?players=true&token=<token>` and requires `status == "200"`, so it does NOT work against vanilla or tModLoader (https://raw.githubusercontent.com/gamedig/node-gamedig/master/protocols/terraria.js).
- Practical options for a panel: (1) process-alive check; (2) TCP connect test to the game port (Terraria uses TCP, so a TCP connect on 7777 shows the server is up; the wiki says the server hibernates with 0 players but still listens, UNVERIFIED how it responds); (3) send `playing` on stdin and parse the console output for the player list (the command exists per wiki; the exact output format was not verified here); (4) parse `tModLoader-Logs\server.log` for join/leave lines (format UNVERIFIED).

## 8. Resources
- Vanilla: wiki says 500 MB free RAM for a small world, scaling with world size and players (https://terraria.wiki.gg/wiki/Server).
- tML: the FAQ gives "tModLoader lists 6 GB of RAM as the minimum system requirements", rising with mods; that is a client figure, the server figure is UNVERIFIED (hosting guides commonly say 2-4 GB: UNVERIFIED) (https://github.com/tModLoader/tModLoader/wiki/Basic-tModLoader-Usage-FAQ).
- Disk: tML Windows depot ~207 MB (Steam), GitHub zip 61 MB compressed; vanilla zip 46 MB compressed. Worlds are small (MB range, size depends on world size: UNVERIFIED figures).
- CPU: single main game thread; no official figure (UNVERIFIED).

## 9. Updates
- tML: `install-tml` again with the same SteamCMD login (updates), or newer GitHub release. Official guide warns client and server must be on the same tML version; clients and server also need the same mods (the README implies this via enabled.json/install.txt; specific statement UNVERIFIED). The old Workshop-based tML-server item was said to be abandoned by one host guide (see search result summary; UNVERIFIED).
- Vanilla: download the newest zip from terraria.org (version in file name: 1458 = 1.4.5.8). Version of server must match clients.
- Note the tML 1.4.4 line runs a different game version than the 1.4.5.8 vanilla (the tML release notes show "Compatibility files for 1.4.4 loading 1.4.5.8 assets", RecentGitHubCommits.txt in the zip). Vanilla 1.4.5.8 clients and a tML 1.4.4 server being compatible is UNVERIFIED (assumed not).

## 10. Windows pitfalls and "panel must NOT"
- Do not kill by image name `dotnet.exe`: other .NET apps share it. Kill/track by PID or full path `<install>\dotnet\dotnet.exe`.
- Do not use `start-tModLoaderServer.bat` for supervision: `start` detaches into another window, so the panel's child exits right away and stdin is not connected.
- Do not use vanilla `start-server.bat` as the managed process: it relaunches the server after `exit`.
- First start of tML needs internet (downloads .NET 8 runtime) and may take a while; `QuickEditDisable.exe` is run by the script on Windows 10+ to avoid console-click freezing (ScriptCaller/EnvironmentFix.sh). Windows 7-8.1 use a `DOTNET_EnableWriteXorExecute=0` fix.
- Windows firewall prompt on first run; port-forward 7777 TCP for the internet; UPnP is on by default for vanilla (`upnp=1`), `-noupnp` to disable.
- Default save folders are in the user profile (Documents) unless `worldpath=` / `-tmlsavedirectory` is given: set them to inside the server folder.
- tML on 32-bit Windows is not supported (busybox-sh.bat prints "tModLoader requires a 64 bit operating system"). ARM is unsupported (README).
- Steam Workshop mods downloaded by SteamCMD land in `steamapps\workshop\content\1281930\<id>` and must be both present and listed in `enabled.json`.

## UNVERIFIED list
1. `steamcmd +login anonymous +app_update 1281930` works or not (evidence says no; never run).
2. Whether the Steam depot (vs GitHub zip) ships a pre-deployed .NET runtime zip.
3. What the tML-in-Steam Windows depot folder looks like exactly (only metadata seen).
4. Default Windows world folder of the vanilla dedicated server when `worldpath=` is not set.
5. Whether `-nosteam` is accepted when launching `dotnet tModLoader.dll` directly (only the .sh script is shown to parse it).
6. Real-world behaviour of the busybox/dotnet chain with redirected stdin/stdout from the panel (the candidate launch lines in section 4).
7. Ctrl+C / console-close save behaviour for both servers.
8. Whether tML 1.4.4 saves when the last player leaves (1.4.5.0 vanilla feature) and whether it writes `worldrollbackstokeep` backups.
9. Format of `playing` output and of `server.log` lines; whether the idle (hibernating) server still answers TCP connects.
10. Server RAM/CPU figures for tML (6 GB figure is a client figure).
11. Whether vanilla clients can join a tML server with no mods, and whether vanilla 1.4.5.8 clients can join tML 1.4.4.
12. Whether tML has additional server console commands beyond vanilla; `unban` and `seed` commands (hosting guide only).
13. Default for `maxplayers` when unset (wiki 16 vs example file 8).
14. That no other ports (query/Steam) are used by tML with `-nosteam`.
15. Windows-firewall prompt wording/exe for tML.
16. Third-party blog's anonymous-install claim (page not retrievable, 403).

# Barotrauma dedicated server: BASICS (conventions section A) - FINAL

Researched 2026-10-15. Source-code facts are from the official public repo FakeFishGames/Barotrauma, master at commit e6e95da83b1b (2026-09-02); `Barotrauma/BarotraumaServer/WindowsServer.csproj` says Version 1.13.4.0, assembly name `DedicatedServer`, net8.0 (https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaServer/WindowsServer.csproj ; repo https://github.com/FakeFishGames/Barotrauma). Nothing was installed or run (read-only research). Raw copies of every source file used are in `raw\` next to this file.
Evidence labels: **[SRC]** = read in the game's own source code, **[WIKI]** = official wiki (page marked as last verified for 0.18.15.0, so older), **[STEAM]** = Steam app metadata.

## 1. SteamCMD
- App 1026340 "Barotrauma Dedicated Server", type Tool, `freetodownload=1`, oslist windows,linux, parent app 602960, public buildid 23799137 (build time 1781772754 = 2026-06-18). https://api.steamcmd.net/v1/info/1026340 (saved `raw\steamcmd_1026340.json`) [STEAM]
- `freetodownload=1` means anonymous login is expected to work; the wiki step list is literally `login anonymous` then `app_update 1026340 validate`. https://barotraumagame.com/baro-wiki/index.php?title=Hosting_a_Dedicated_Server&action=raw (`raw\wiki_hosting.txt`) [WIKI]
- One-line form (same pattern as other games; not run by me): `steamcmd.exe +force_install_dir <dir> +login anonymous +app_update 1026340 validate +quit`. UNVERIFIED that it behaves identically (see list).
- Download size: windows depots 1004 (download 24,251,776 / size 67,863,136, `depotfromapp 1007`) + 1026341 (download 55,626,208 / size 155,733,634) => about 80 MB download, about 220 MB on disk. https://api.steamcmd.net/v1/info/1026340 [STEAM]
- Store app 602960 "Barotrauma" is the separate paid game; the dedicated server does not need it. https://api.steamcmd.net/v1/info/602960 [STEAM]

## 2. Install layout, executable, process name
- Steam's launch entry for the tool: Windows executable `DedicatedServer.exe`, Linux `./DedicatedServer`, no arguments. https://api.steamcmd.net/v1/info/1026340 [STEAM]
- `DedicatedServer.exe` is a single .NET 8 app (assembly name `DedicatedServer`); `Program.Main` sets the working directory to the exe's folder, so the cwd you start it from does not matter. raw\src_server_Program.cs (`Directory.SetCurrentDirectory(executableDir)`) [SRC]
- Because of that, settings files are relative to the install root: `serversettings.xml` (`SettingsFile = "serversettings.xml"`, raw\src_shared_ServerSettings.cs line 58) and `Data\clientpermissions.xml` (`ClientPermissionsFile = "Data" + sep + "clientpermissions.xml"`, raw\src_server_ServerSettings.cs line 32). The wiki agrees ("main Barotrauma folder" and its `Data` folder). https://barotraumagame.com/baro-wiki/index.php?title=Hosting_a_Dedicated_Server&action=raw [WIKI]
- Install dir name when no force dir is given: `Barotrauma Dedicated Server` under steamapps\common. [STEAM] `config.installdir`.
- Process name for the panel: `DedicatedServer.exe` (single process, no launcher/shipping split; inferred from the single-assembly design, not observed running). [SRC]
- Crash handling: on an unhandled exception it saves serversettings and the ban list, writes `servercrashreport.log` in the root folder and exits. raw\src_server_Program.cs `CrashDump`. [SRC]

## 3. Ports and protocols
| Setting | Default | Protocol | Source |
|---|---|---|---|
| Game port (`Port`, `-port`) | 27015 | UDP | `NetConfig.DefaultPort = 27015` raw\src_NetConfig.cs line 8 [SRC]; wiki: "both over UDP ... default ports are 27015 and 27016" [WIKI] |
| Query port (`QueryPort`, `-queryport`) | 27016 | UDP | `NetConfig.DefaultQueryPort = 27016` raw\src_NetConfig.cs line 9 [SRC] |
- Both are read from serversettings.xml (`Port`, `QueryPort`) and overridden by the command-line `-port` and `-queryport`. raw\src_server_GameMain.cs `StartServer` [SRC]
- `NetConfig.MaxPlayers = 16` (hard cap); default max players is 10 if the file has no value. raw\src_NetConfig.cs line 11; raw\src_server_GameMain.cs [SRC]
- UPnP exists: attribute `EnableUPnP` or `-upnp` / `-enableupnp true|false`, default false. raw\src_server_GameMain.cs [SRC]; wiki warns it may not work on all routers [WIKI]
- No RCON port exists in the code read. No inbound TCP is mentioned by any source. UNVERIFIED that no TCP listener exists.

## 4. Start command
Command-line flags (each takes a following value except `-nopassword` and `-lenienthandshake`; matching is case-insensitive). From the full parse loops in raw\src_server_GameMain.cs `StartServer` [SRC]:
`-name <text>`, `-port <int>`, `-queryport <int>`, `-public <true|false>`, `-password <text>`, `-nopassword`, `-upnp` / `-enableupnp <true|false>`, `-maxplayers <int>`, `-playstyle <enum value>`, `-banafterwrongpassword <bool>`, `-karma` / `-karmaenabled <bool>`, `-karmapreset <name>`, `-language <id>`, `-lenienthandshake`.
Internal, not for hosts: `-ownerkey`, `-endpoint`, `-pipes` (client-hosted child server; presence of `-ownerkey` skips Steam server init), `-multiclienttestmode` (debug only).
- Minimal: `DedicatedServer.exe` with no arguments works; if `serversettings.xml` is absent it warns "Starting the server with default settings". raw\src_server_GameMain.cs [SRC]
- Example for the panel .bat: `DedicatedServer.exe -name "My Server" -port 27015 -queryport 27016 -maxplayers 10` (plus `-password` if set).
- Caution: each flag reads `CommandLineArgs[i+1]` with no bounds check, so a value-taking flag given last with no value throws. Always give a value. raw\src_server_GameMain.cs [SRC]
- `password` is also a plain attribute of serversettings.xml (`GetAttributeString("password","")`), so the panel can write it to the file instead of exposing it on the command line. [SRC]

## 5. First run: files and save locations
- `serversettings.xml` is read at start and is **rewritten by the server on shutdown** (`ServerSettings.SaveSettings()` inside `GameServer.Quit()`; also saves ban list and server log) and on crash. So edit it only while the server is stopped. raw\src_server_GameServer.cs lines 4764-4790; writer `XmlWriter.Create(SettingsFile ...)` raw\src_server_ServerSettings.cs line 298 [SRC]
- `Data\clientpermissions.xml`: default content is an empty `<ClientPermissions>` element [WIKI https://barotraumagame.com/baro-wiki/index.php?title=Clientpermissions.xml&action=raw]. Loaded at start (`LoadClientPermissions`), rewritten by `SaveClientPermissions()` when permissions change in game. Per `<Client>`: `name` required; `accountid` (legacy `steamid`) OR `address` (legacy `endpoint`, `ip`) required; `permissions` = comma list or `All`, or `preset="<display name>"`; optional child `<command name="..."/>` entries only honoured if ConsoleCommands permission is granted. raw\src_server_ServerSettings.cs lines 478-633 [SRC]. Wiki example id style `STEAM_1:1:12345678` (current formats UNVERIFIED).
- Campaign saves: default `%LocalAppData%\Daedalic Entertainment GmbH\Barotrauma\` (singleplayer) and `...\Barotrauma\Multiplayer\` (multiplayer), `.save` files. A custom folder comes from `SavePath` in the player config (multiplayer uses a `Multiplayer` subfolder of it). Legacy `Data\Saves\` and `Data\Saves\Multiplayer` are still scanned. raw\src_SaveUtil.cs lines 65-92 and 358-425 [SRC]. => saves live in the Windows user profile of whichever user runs the server, not in the install folder (the install-relative `Data\Saves` is legacy; `Data\Saves\Multiplayer_Downloaded` is for campaigns downloaded by clients).
- Mods on a dedicated server (wiki, flagged stub/outdated): mod files under `%LocalAppData%\Daedalic Entertainment GmbH\Barotrauma\WorkshopMods\Installed`, enabled through the content package list in `config_player.xml` in the install folder. https://barotraumagame.com/baro-wiki/index.php?title=Enabling_Mods_on_a_Dedicated_Server&action=raw [WIKI]

## 6. Stopping and saving
- Typed console commands `exit`, `quit` or `close` set `ShouldRun = false`; the main loop then calls `CloseServer()` -> `Server.Quit()` (settings, ban list, server log), `SaveUtil.CleanUnnecessarySaveFiles()` and Steam/EOS shutdown. raw\src_server_DebugConsole.cs (command "exit|quit|close"), raw\src_server_GameMain.cs `Run`/`CloseServer` [SRC]
- `restart` / `reset` closes and restarts the server inside the same process (re-reads args). raw\src_server_DebugConsole.cs [SRC]
- **Redirected stdin is ignored**: the server prints "Redirected input is detected but is not supported by this application. Input will be ignored." So a panel cannot send `exit` through a piped stdin; the server needs a real console to take typed commands (or must be stopped some other way). raw\src_server_Program.cs [SRC]
- Signal handling: `AppDomain.ProcessExit` runs Steam/EOS shutdown; `GameMain.ShouldRun = false` on process exit is wired only under `#if LINUX`. What Ctrl+C or closing the console window does on Windows (and whether `Quit()` saves settings then) is UNVERIFIED. raw\src_server_Program.cs [SRC]
- Other useful console commands (wiki list): `say`, `kick`, `ban`, `clientlist`, `servermsg`, `startgame`, `setpassword`, `maxplayers`, `servername`, `autorestartinterval`. https://barotraumagame.com/baro-wiki/index.php?title=Console_Commands&action=raw [WIKI]

## 7. Query protocol
- The server registers itself as a normal Steamworks game server: `SteamServerInit("Barotrauma","Barotrauma")`, GamePort = Port, **QueryPort = the QueryPort setting only when `IsPublic` is true, otherwise 0** (and mode NoAuthentication), then `LogOnAnonymous()` and `DedicatedServer = true`. Server name, max players, password flag, map name and key/values (message, content packages) are published as Steam server rules. raw\src_server_SteamManager.cs lines 14-95 [SRC]. A Steamworks game server with a query port answers Valve's standard A2S queries on that port, so an A2S player count should work for a public server (inferred from the Steamworks API; a code comment, "a2s seems to break if too much data is added", shows A2S is in use; not tested). A private server (IsPublic false) opens no query port, so nothing can be queried and the panel must fall back to process-alive checks.
- No RCON or REST interface exists in the code read.
- The console prints "Server started" when ready. raw\src_server_GameServer.cs `StartServer` [SRC]; the wiki says the same [WIKI]
- Networking for a dedicated server is Lidgren over UDP (needs port forwarding); the server logs that. raw\src_server_GameServer.cs `StartServer` [SRC]

## 8. Memory / CPU, Windows pitfalls, updates, panel must-nots
- No official requirements found. One hosting guide gives an editorial sizing: 2-6 players vanilla 2 vCPU / 4 GB; 7-10 players light mods 3-4 vCPU / 6 GB; 11-16 players moderate mods 4-6 vCPU / 8 GB ("not official requirements"). https://www.redswitches.com/blog/barotrauma-dedicated-server-setup-guide/ (secondary source)
- Same guide: add Windows Firewall inbound UDP rules for 27015 and 27016; run once so serversettings.xml is generated, then stop before editing; Windows multiplayer saves default to `%LocalAppData%\Daedalic Entertainment GmbH\Barotrauma\Multiplayer`. (The save path matches [SRC] SaveUtil.)
- serversettings.xml is also rewritten while running whenever lobby settings are changed by an admin client (`SaveSettings()` is called from ServerSettings code), not only at exit. raw\src_server_ServerSettings.cs lines 141 and 262 [SRC]. The panel should write the file only while the server is stopped and re-read it before showing it.
- Default differences: when the file exists, start-up reads missing `IsPublic` as false and missing `MaxPlayers` as 10 (raw\src_server_GameMain.cs), but the serialized property defaults are IsPublic true and MaxPlayers 8 (raw\src_shared_ServerSettings.cs lines 406 and 1168). The panel should write `IsPublic` and `MaxPlayers` explicitly. [SRC]
- Updates: re-run `app_update 1026340 validate` while stopped. The wiki describes no auto-update mechanism. Clients and server must be on the same game version (the code has a version-mismatch check for content packages in `GameMain.CheckContentPackage` [SRC]; the client join rule itself is not read).
- Panel must NOT: kill by image name `DedicatedServer.exe` (match by PID / full path); edit serversettings.xml while the server runs; pipe stdin (ignored); pass `-ownerkey` (turns off Steam/EOS server init; meant for client-hosted children). [SRC]
- Console control: input is read only via `Console.KeyAvailable/ReadKey` and only when both stdin and stdout are NOT redirected. raw\src_server_DebugConsole.cs lines 136-151 [SRC]. So the panel must start it in its own real console window; typing `exit` / `quit` / `close` programmatically needs console-attach key injection (AttachConsole + WriteConsoleInput), as in the Abiotic research helper `..\abiotic\attach.ps1` (that file attaches a console; it does not itself prove key injection), or the user types it in a visible console.
- Campaign saving: a new campaign is saved at creation (`StartNewCampaign` -> `SaveUtil.SaveGame`), saved at the end of each successful round (`EndCampaignRound` -> `SaveUtil.SaveGame`) and when bots are first created at round start. `Quit()` has no save-campaign call. raw\src_server_MPCampaign.cs lines 127 and 435; raw\src_server_GameServer.cs near line 3152 [SRC]. So a hard kill loses only the round in progress.
- A dedicated server's console can start or load a campaign through interactive prompts ("Enter a save name for the campaign:", "Select a save file to load"), or an admin client does it from the lobby. raw\src_server_MPCampaign.cs lines 170-215; raw\src_server_DebugConsole.cs lines 1296-1325 [SRC]

## UNVERIFIED
1. `+login anonymous` actually succeeds for 1026340 (only metadata `freetodownload=1` and the wiki say so; not run).
2. That A2S_INFO / A2S_PLAYER really answer on UDP 27016 (inferred from the Steamworks API plus a code comment; not tested), and that nothing answers when `IsPublic` is false.
3. Whether any TCP listener exists (no source mentions one).
4. Windows behaviour on Ctrl+C or closing the console window (the ProcessExit hook runs Steam/EOS shutdown, but `ShouldRun=false` is wired only for Linux; unclear whether `Quit()` and the settings save run).
5. Exact install contents, and whether a default serversettings.xml / Data\clientpermissions.xml ships in the depot (wiki says the clientpermissions default is an empty element; the code only creates serversettings.xml when it saves).
6. Current accepted `accountid` string forms (wiki shows Steam2 `STEAM_1:1:...`; code uses `AccountId.Parse`, not read).
7. Official RAM / CPU needs (only a third-party editorial table).
8. Whether Visual C++ redistributables or a .NET 8 runtime must be installed (assembly targets net8.0; whether the depot is self-contained was not checked).
9. Real process count and name while running (expected a single `DedicatedServer.exe`; inferred from source, not observed).
10. The one-line SteamCMD command with `+force_install_dir` (pattern from other games, not run for this app).

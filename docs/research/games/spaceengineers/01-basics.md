# Space Engineers dedicated server: basics (section A)

Date 2026-10-15. Store app 244850; Windows-only dedicated server tool app 298740 ("Space Engineers Dedicated Server"). Build the facts are for: wiki pages undated (current as fetched 2026-10-15); Keen's published source is from 2022-01 (old); Torch master on GitHub is current (v1.3.1 shown as "Latest" release, year not shown).

## Sources (short names)
- W1 = https://spaceengineers.wiki.gg/wiki/Setting_up_a_Space_Engineers_Dedicated_Server (community wiki; read through a summarizing fetch)
- W2 = https://www.spaceengineersgame.com/dedicated-servers/ (Keen's own page)
- SRC = https://github.com/KeenSoftwareHouse/SpaceEngineers (2022; copies in `raw/` and `_raw/`)
- T-README = https://github.com/TorchAPI/Torch ; T-SITE = https://torchapi.com/
- T-SRC = Torch source on raw.githubusercontent.com/TorchAPI/Torch/master/ (files `Torch.Server/Program.cs`, `Torch.Server/Initializer.cs`, `Torch.Server/TorchConfig.cs`, `Torch.Server/Managers/InstanceManager.cs`, `Torch/CommandLine.cs`, `Torch/Utils/TorchLauncher.cs`; copies in `_raw/torchconfig.cs`, `_raw/t_*.cs`)
- P1 = https://eggs.pterodactyl.io/egg/games-space-engineers (third-party egg)
- TD = https://github.com/adamharley/torch-docker (third-party)
- LM = https://low.ms/blog/how-to-host-space-engineers-dedicated-server (hosting company blog, third party)
- XG = https://xgamingserver.com/docs/space-engineers/import-save (hosting company doc, third party)
- GSK = https://www.gameserverkings.com/knowledge-base/space-engineers/how-to-install-torch.md (hosting company doc, third party)
- GD = https://github.com/gamedig/node-gamedig/blob/master/GAMES_LIST.md
Launch flags are already in `03-launch-args.md` (not repeated); config in `02-config.md`; mods in `04-mods.md`.

## SteamCMD
- Anonymous works. Command: `steamcmd.exe +login anonymous +force_install_dir "D:\SEDS" +app_update 298740 +quit` (W1, W2). Torch's own updater uses the same app and login, in a runscript: `force_install_dir ../../`, `login anonymous`, `app_update 298740`, `quit` (T-SRC Initializer.cs).
- Windows only; needs .NET Framework 4.8+ and Visual C++ redistributable (W1: 2017 x64; W2: 2013 and 2017).
- Size about 8 GB for the server plus space for logs/saves/mods (W1).

## Vanilla server (SpaceEngineersDedicated.exe) vs Torch
There are two ways to run it; the panel needs to pick one per server (or offer both).

### Vanilla: `SpaceEngineersDedicated.exe`
- Path `<install>\DedicatedServer64\SpaceEngineersDedicated.exe` (W1, LM). Process name `SpaceEngineersDedicated.exe` (W1/W2 taskkill line). A single process (no separate launcher/shipping split) as far as the sources show; the exe both shows the setup dialog and runs the server (SRC). The 32-bit `DedicatedServer\` folder: LM says "Ignore the 32-bit folder"; whether it still ships is UNVERIFIED.
- `-console` skips the instance selection dialog and the configuration dialog and goes straight to the console app (W2). Without `-console` or `-noconsole` a GUI configurator opens (03).
- Vanilla also has a Windows-service mode, created through the GUI "Add new instance" (admin rights needed) (W1). A .bat + `-console` avoids that.
- Wiki also says the in-GUI Maintenance tab has Auto Restart and Auto Update (W1); not available in `-console` mode as far as known (UNVERIFIED).

### Torch: `Torch.Server.exe`
- Torch is a community-made wrapper ("successor to SE Server Extender"), WPF UI plus plugin system; "not affiliated with Keen" (T-README, T-SITE). Third party, built on Keen's server DLLs.
- Exe name: assembly name `Torch.Server` (Torch.Server.csproj, `<AssemblyName>Torch.Server</AssemblyName>`, .NET Framework 4.8) so `Torch.Server.exe`. (Inferred from the assembly name; the output file name was not read from a release zip: UNVERIFIED.)
- It runs the game in the SAME process (it loads the game DLLs into an AppDomain via `TorchLauncher`, T-SRC), so the process to track is `Torch.Server.exe`, NOT `SpaceEngineersDedicated.exe`. It does not start `SpaceEngineersDedicated.exe`.
- Install: download `torch-server.zip` from https://build.torchapi.com/job/Torch/job/master/lastSuccessfulBuild/artifact/bin/torch-server.zip (link on T-SITE; LM says to download from torchapi.com, not GitHub releases). Unzip into its own directory and run it; "it will automatically download the SE DS and generate the other necessary files" (T-README). Or unzip into a folder that already contains `DedicatedServer64` (T-README).
- On every start (unless `-noupdate`) Torch itself downloads SteamCMD to `<torch>\steam\steamcmd\` and installs/updates app 298740 into the Torch folder, so `DedicatedServer64` sits beside `Torch.Server.exe` (T-SRC Initializer.cs: `force_install_dir ../../`; Program.cs: `binDir = <torch dir>\DedicatedServer64`). The panel would therefore NOT need its own SteamCMD step for Torch, but it must give Torch the Torch zip (non-Steam download, HTTP) and ordering matters: first run is slow because the 8 GB DS downloads (TD says SteamCMD progress does not show in console but the download runs).
- Torch config `Torch.cfg` (XML) lives in the Torch root (current directory), created with defaults on first run (T-SRC Initializer.InitConfig). Torch rewrites it on shutdown, so edit only while stopped (GSK).
- Torch flags (T-SRC TorchConfig.cs `[Arg]` attributes; prefix `-`; `-help` prints them; value args take the next token, quoted; bool args are bare): `-instancename`, `-instancepath` (server data folder where saves and mods are stored), `-noupdate`, `-forceupdate`, `-autostart` (start immediately), `-restartoncrash`, `-gameupdatedetection`, `-gameupdaterestartdelay` (minutes), `-nogui`, `-waitforpid`, `-plugins` (space-delimited GUIDs), `-localplugins`, `-disconnect`, `-console` (separate console window alongside the UI), `-testplugin`, `-asserts`, `-sendlogstokeen`, `-delteminidumps` (spelling as in source), `-logintoken` (Steam GSLT). Defaults: InstancePath = `<torch dir>\Instance`, InstanceName = `Instance`, Autostart false, NoGui false.
- Headless: `-nogui` runs `Init()` and `Start()` with no WPF window. Without `-nogui` the WPF window opens, and the server only starts if `-autostart` or `Autostart` in Torch.cfg is set (T-SRC Initializer.Run). The panel should use `-nogui -autostart` style launch. (`-nogui` + autostart exact combination not run: UNVERIFIED in practice.)
- Service mode: if the process is not user-interactive (and OS is not Windows Server 2019/2022/2025) Torch runs as a Windows service (T-SRC Program.cs). A normal .bat launch is interactive, so this is not hit.
- Maintenance: T-README says "still in early development"; repo has about 1,007 commits. Breaks after Space Engineers patches, test after each update (GSK). Current compatibility with the latest game build: UNVERIFIED.

## Instance folder layout (-path for vanilla, -instancepath for Torch)
- Instance = the user-data folder. Vanilla `-path <dir>` "stores config and files in a chosen location" (W1); without it data is under `%appdata%\SpaceEngineersDedicated\` for a Steam-tool install (W1, LM: `%APPDATA%\SpaceEngineersDedicated\<InstanceName>\`) while W1 also says logs and saves are in `<InstallFolder>\TempContent\` for a SteamCMD install (internally inconsistent wording: which applies is UNVERIFIED). Service instances use `%ProgramData%\SpaceEngineersDedicated\<instance>` (W1, SRC).
- Contents (all sources agree on these):
  - `SpaceEngineers-Dedicated.cfg`: XML, root `MyConfigDedicated` (SRC `MyConfigDedicatedData`: `SessionSettings`, `LoadWorld`, `IP` default `0.0.0.0`, `SteamPort` default 8766, `ServerPort` default 27016, `AsteroidAmount` 4, `Administrators`, `Banned`, `Mods`, `GroupID`, `ServerName`, `WorldName`, `PauseGameWhenEmpty` false, `IgnoreLastSession` false, `PremadeCheckpointPath`). W1: "in the server's AppData folder", holds all GUI settings plus some hidden ones. Details in 02-config.md.
  - `Saves\<WorldName>\` one folder per world (W1; XG). `Mods\` (Torch creates `Saves` and `Mods`, T-SRC InstanceManager.ValidateInstance). Logs also written here (W1 mentions logs/saves under the data folder).
  - Per world folder: `Sandbox.sbc` (world checkpoint: grids' session state, characters, factions, GPS), `Sandbox_config.sbc` (gameplay/session settings and mod list; XG: "settings take priority over Sandbox.sbc"; T-SRC confirms the two files and that the mod list/settings were moved from Sandbox.sbc to Sandbox_config.sbc, old saves migrate), `SANDBOX_0_0_0_.sbs` (sector data, XG), `Backup\`, `Storage\` (script/mod persistent data, XG). Server deletes unrecognized files inside the world folder on save (XG).
- How the world is picked: `<LoadWorld>` in the cfg is a FULL path with drive letter to the world folder (LM; TD example `Z:\torch-server\Instance\Saves\...`). Torch lists every folder under `Saves` that contains a `Sandbox.sbc` (T-SRC). If no world is set the vanilla server "quietly generates a fresh random world" (LM, third party). Local worlds from the client's `%AppData%\SpaceEngineers\Saves\<SteamID64>\` are copied into the dedicated `Saves` folder (W1; XG).
- `-ignorelastsession`: otherwise the server resumes the last session (03).
- First run with an empty instance folder: Torch writes a default `SpaceEngineers-Dedicated.cfg` (T-SRC ValidateInstance). For the vanilla exe with `-path` to an empty existing folder: whether it creates a default cfg + world is UNVERIFIED (03 item 11). P1's egg downloads a base world archive and a prepared cfg instead (P1), which suggests the panel should ship/generate its own cfg.

## Ports
| Port | Proto | Default | Use | Source |
|---|---|---|---|---|
| ServerPort | UDP | 27016 | game traffic; "forward all incoming UDP traffic on port 27016"; changeable | W2, W1, SRC (`ServerPort = 27016`) |
| SteamPort | UDP (proto not stated) | 8766 | the "second port for Steam itself"; used for server listing | LM (third party), SRC (`SteamPort = 8766`), P1 (Steam 8766). Protocol not stated by Keen: UNVERIFIED |
| Remote API | TCP (HTTP) | 8081 in egg; wiki says host/port/key set in settings | optional REST admin API, requires a security key | W1 (feature), P1 (8081). Keen's own default port UNVERIFIED |
- `IP` bind address default 0.0.0.0 (SRC, W1). Each additional instance/service needs its own port (W1).
- Wiki: Steam/UDP listen port; needs a static public IP for internet play, LAN works otherwise (W1). Allow the exe in Windows Firewall (inbound UDP on the port) (W2).
- Torch uses the same game ports (TD: UDP 27016).

## Minimal working start command
- Vanilla: `"<install>\DedicatedServer64\SpaceEngineersDedicated.exe" -console -path "<datadir>"` (+ `-ignorelastsession` on a prepared world). `<datadir>` must already exist (03/SRC) and contain `SpaceEngineers-Dedicated.cfg` with a valid `LoadWorld` and a world under `Saves` (derived from 03/W1, NOT run).
- Torch: `Torch.Server.exe -nogui -autostart -instancepath "<datadir>"` (flags from T-SRC; combination NOT run). `-noupdate` to stop it re-running SteamCMD on every start.
- Working directory: Torch calls `Directory.SetCurrentDirectory` to its own folder (T-SRC); for vanilla, relative `-path` resolves against the exe folder (03).

## Stopping and saving
- Vanilla: `taskkill /IM SpaceEngineersDedicated.exe` (no `/f`) "will stop the dedicated server correctly, saving the world etc."; `/f` kills without saving (W1, W2). SRC handles CTRL_CLOSE / CTRL_SHUTDOWN console events by calling `MySandboxGame.Static.Exit()`. W1: the Stop button in the configurator UI. P1 egg uses Ctrl+C (`^^C`) as stop and treats "Game ready..." in the console as started.
- Panel warning: killing by image name is dangerous with several instances (taskkill /IM hits all of them); target the PID instead. A PID-targeted graceful close (Ctrl+C / `taskkill /PID <n>` without /f) saving the world is implied by W2 but not shown for PID specifically: UNVERIFIED.
- Torch: UI Stop/save and chat commands; Torch has `Save()` then restart logic (T-SRC TorchServer.cs). Command-line graceful stop for Torch under `-nogui`: UNVERIFIED (not found in sources read; the plugin Essentials / Remote API not checked).
- Autosave interval is a session setting (`AutoSaveInMinutes`, see 02-config.md if present); saving on exit via the graceful path above.

## Query protocol (player count)
- GameDig lists `spaceengineers` with the Valve (Steam A2S) protocol (GD). Which port it queries (27016 vs 8766) and whether it works against current builds: UNVERIFIED. LM says the server "queries on that same number" as the game port (27016), third party.
- Remote API (REST over HTTP, HMAC-SHA1 signed requests, `GET /vrageremote/api` to check) can report server/world data (W1). Needs the security key from the cfg; not tested.
- RCON: none found.

## Resource needs
- Minimum 3.2 GHz CPU, 3 logical cores, 6 GB RAM, 5 Mbps bandwidth (W2; W1 says below minimum forces Experimental mode on); recommended 4.5 GHz CPU, 3 logical cores, 10 GB RAM (W1). LM: "leans on a single fast core"; RAM tracks the world size.

## Windows pitfalls
- Running as a service needs admin (W1). Foreground run does not, but stops on reboot (W1).
- Steam mods may fail to download on SteamCMD installs: copy `steamclient64.dll`, `tier0_s64.dll`, `vstdlib_s64.dll` from the Steam/SteamCMD folder into `DedicatedServer64`; else delete `appworkshop_244850.acf` to force a re-download (W1). The egg does the same copying (P1).
- Changing the data folder for the service: use an NTFS junction (`mklink /J`), and `C:\ProgramData\SpaceEngineersDedicated` must not already exist (W1).
- Torch needs Arial font and .NET Framework under Wine (TD) - irrelevant on Windows.
- Torch deletes `System.Security.Principal.Windows.dll` and `VRage.Platform.Windows.dll` from its root on start (block-skins hack, T-SRC Program.cs): normal, do not "repair" them.
- Windows Server 2019/2022/2025 note: Torch skips service mode there (T-SRC).

## Updates
- Steam tool installs update automatically; SteamCMD installs by re-running `+app_update 298740` or via the Maintenance tab auto update (W1). Torch re-runs the SteamCMD update on each start unless `-noupdate`, and can restart on game update (`-gameupdatedetection`, `-gameupdaterestartdelay`, T-SRC).
- Players must run the same game version; the server loads the world's mods from the Workshop at start (04-mods.md).

## What a panel must NOT do
- Do not start the vanilla exe without `-console`/`-noconsole` (a GUI waits forever).
- Do not point `-path`/`-instancepath` at a missing folder (vanilla exits silently, 03).
- Do not `taskkill /F` or `/IM ... /F` (loses unsaved world progress; /IM hits every instance).
- Do not edit `Torch.cfg` while Torch runs (rewritten on shutdown, GSK).
- Do not watch for `SpaceEngineersDedicated.exe` when running Torch (process is `Torch.Server.exe`).
- Do not use a relative `<LoadWorld>`; use a full drive-letter path (LM).
- Do not mix Torch and vanilla data folders blindly: Torch passes the instance path itself; the `DedicatedServer64` it uses is its own copy beside `Torch.Server.exe`.

## UNVERIFIED
1. Exact output exe name from the Torch zip (`Torch.Server.exe` inferred from assembly name).
2. Torch current compatibility with the latest game build; Torch release date of v1.3.1.
3. `-nogui -autostart` launch actually working as headless in practice; Torch graceful command-line stop.
4. Graceful PID-targeted stop of `SpaceEngineersDedicated.exe` while running a console/background process under a panel.
5. Protocol of the Steam port 8766 and which port A2S answers on; GameDig behaviour against the current server.
6. Remote API default port from Keen (8081 comes from the egg only) and its on-by-default state.
7. Data folder without `-path` for a SteamCMD install (`%APPDATA%\SpaceEngineersDedicated` vs `<install>\TempContent`).
8. Whether the 32-bit `DedicatedServer\` folder still ships.
9. First run with empty `-path` folder: default cfg and world generation behaviour (vanilla).
10. Current server build number (nothing newer than 01_197_170 seen in 03; SRC from 2022).
11. Whether Auto Restart / Auto Update of the GUI apply in `-console` mode.
12. W1/W2 text was read through a summarizing fetch tool, not raw HTML; Torch install steps for the plugin folder / `Torch.cfg` `<Plugins>` GUID list come from GSK (third party).

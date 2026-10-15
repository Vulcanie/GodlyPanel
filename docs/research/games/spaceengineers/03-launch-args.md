# Space Engineers dedicated server: launch arguments (section C)

Date: 2026-10-14. Store app 244850; Windows dedicated server tool app 298740 (SteamCMD anonymous works: `steamcmd.exe +login anonymous +force_install_dir <dir> +app_update 298740 +quit`, source W1/W2). Server build the wiki facts are for: not stated on the wiki pages (UNVERIFIED); the most recent build seen in any source is 01_197_170 (log dated 2021-02-19, K1). Windows only (W1: Windows, .NET Framework 4.8+, VC++ 2013 and 2017 redistributables).

## Sources
- W1 = https://spaceengineers.wiki.gg/wiki/Setting_up_a_Space_Engineers_Dedicated_Server ("Command Line Tool" section; also reachable as /wiki/Dedicated_Server). Community-run wiki hosted on wiki.gg, linked as "Official Space Engineers Wiki" in search result titles. Fetched via a summarizing tool, so wording is paraphrased; flag spellings were carried over as written.
- W2 = https://www.spaceengineersgame.com/dedicated-servers/ (Keen's own site). Lists only: -console, -noconsole, -path, -ignorelastsession, -maxPlayers, -ip, -port, and the SteamCMD line.
- W3 = https://spaceengineers.wiki.gg/wiki/Startup_Arguments (game client arguments; explicitly says dedicated server arguments are NOT listed there and points to W1).
- SRC = Keen's published source, https://github.com/KeenSoftwareHouse/SpaceEngineers (last commit 54f2f0f, 2022-01-06, so OLD; useful for exact parsing behaviour but newer flags are absent). Files: `Sources/VRage.Dedicated/DedicatedServer.cs` (ProcessArgs, RunMain), `Sources/Sandbox.Game/MySandboxGame.cs` (ParseArgs, session load), `Sources/VRage/Plugins/MyPlugins.cs` (RegisterFromArgs), `Sources/SpaceEngineers.Dedicated/MyProgram.cs`. Raw copies are in `raw/` next to this file.
- K1 = https://support.keenswh.com/spaceengineers/pc/topic/crossplay-not-working (server log: `Environment.CommandLine: ... -noconsole -checkAlive -ignorelastsession`, App Version 01_197_170, 2021-02-19). Shows real usage only, no explanation.
- P1 = https://eggs.pterodactyl.io/egg/games-space-engineers (community Pterodactyl egg; third party).
- F1 = https://kb.firedaemon.com/support/solutions/articles/4000087018-space-engineers-as-a-windows-service (third party; documents only -console).
- T1 = https://community.tcadmin.com/topic/10431-space-engineers-dedicated-server (2017 forum post, third party).

## How arguments are parsed (SRC, DedicatedServer.ProcessArgs)
- Matching is exact and case-sensitive in the published source: `args.Contains("-ignorelastsession")` (all lowercase), `"-maxPlayers"` (capital P), `"-ip"`, `"-port"`, `"-path"`, `"-console"`, `"-noconsole"`. So write them exactly as in the table. (Source is from 2022; whether the current build is still case-sensitive is UNVERIFIED, but copying the spelling is safe either way.)
- Value arguments use the SPACE form: the value is the next argument (`-port 27016`, `-path "D:\SE\data"`). Source: `args[IndexOf("-port") + 1]`. Colon or equals forms are not parsed for these. The one exception documented is `-session:<worldPath>` (colon form, W1) and `-np key:value`.
- Unparseable values are silently ignored in SRC (`int.TryParse` fails -> override not applied; bad `-ip` -> not applied).
- `-console` or `-noconsole` is what makes the exe run headless. If neither is present (and the process is user-interactive) the exe opens the GUI configurator (instance picker/config dialog) instead of running the server (SRC `Run`, W1). The panel must always pass one of them. `-noconsole` hides the black window; with it the panel loses the console output window (SRC `RunMain(..., showConsole:false)`).
- `-path` quirk in SRC: if the directory given does NOT exist, the process exits immediately without starting (`return true`, no message). Relative paths are resolved against the folder of the exe. So the panel must create the data folder before first start.
- Without `-path`, data goes to `%APPDATA%\SpaceEngineersDedicated` for the foreground/console instance (SRC RunMain, W1) and to `%ProgramData%\SpaceEngineersDedicated\<instance>` for a Windows service instance (SRC RunMain with isService). W1 also says a SteamCMD-installed server keeps logs/saves in `<InstallFolder>\TempContent\` (conflicts in wording with the above; UNVERIFIED which applies on the current build).
- Stopping (W1, W2): `taskkill /IM SpaceEngineersDedicated.exe` (no /f) stops it and saves the world; `/f` kills without saving. SRC handles CTRL_CLOSE/CTRL_SHUTDOWN console events by calling `MySandboxGame.Static.Exit()`.
- Process / exe name: `SpaceEngineersDedicated.exe`, at `<InstallFolder>\DedicatedServer64\SpaceEngineersDedicated.exe` (W1; the 32-bit `DedicatedServer\` folder exists too in older builds, UNVERIFIED for current).

## Table
Kind: V = value, B = bool flag (bare). Origin: GAME = dedicated-server specific, ENG = generic.

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-console` | bare | B | Run in console mode | Starts the server straight away in a console window instead of opening the setup window. Required for a panel-run server (without it the setup dialog opens and the server does not start by itself). | Server | `-console` | none | off (GUI opens) | Yes, always on (alternative to -noconsole) | W1, W2, SRC, F1 |
| `-noconsole` | bare | B | Hide the console window | Starts the server without showing the black console window. Use instead of -console if you do not want a window. | Server | `-noconsole` | none | off | Optional alternative to -console (panel chooses one) | W1, W2, SRC, K1 |
| `-path` | space, value | V | Data folder | Folder the server loads its config (`SpaceEngineers-Dedicated.cfg`) from and stores all files in (saves, logs, mods cache). The folder must already exist (SRC exits silently if not). Quote paths with spaces. | Saves and logs | `-path "D:\Servers\SE\data"` | an existing directory, absolute (X:\...) or relative to the exe folder | `%APPDATA%\SpaceEngineersDedicated` (console) | Yes (save/data path) | W1, W2, SRC, P1 |
| `-ignorelastsession` | bare | B | Ignore last session | Do not resume the world that was auto-saved last time; use the world named in the config file instead. Useful for the first start of a prepared world. Note the exact lowercase spelling. | Saves and logs | `-ignorelastsession` | none | off (server resumes last session) | No (user option); panel may add on first creation only. Effect: SRC checks `IgnoreLastSession` flag or the config's `IgnoreLastSession` setting. | W1, W2, SRC, K1, P1 |
| `-maxPlayers` | space, value | V | Max players | Overrides the player cap stored in the config file. Whole number. Note capital P. | Server | `-maxPlayers 8` | integer | value from config file | Maybe (config `MaxPlayers` is also set in the cfg; this overrides it) | W1, W2, SRC |
| `-ip` | space, value | V | Listen IP address | Overrides the IP address stored in the config file. Ignored if not a valid IP. | Network | `-ip 0.0.0.0` | an IPv4/IPv6 address | value from config file | Yes (bind address), if the panel exposes it | W1, W2, SRC |
| `-port` | space, value | V | Game port | Overrides the port stored in the config file. Default listen port is UDP 27016 per W2. | Network | `-port 27016` | integer | 27016 (UDP; W2) | Yes (port) | W1, W2, SRC |
| `-session:<worldPath>` | colon, value | V | Load this world | Overrides the last session with the world at the given path. | Saves and logs | `-session:D:\SE\data\Saves\MyWorld` | path to a world folder | none | Possibly (world path); NOT present in the 2022 source, only on the wiki, so exact behaviour is UNVERIFIED | W1 |
| `-plugin` | space, value | V | Load plugin DLL | Loads the given .dll as a server plugin. W1 notes this requires a password for game clients (meaning not clear, UNVERIFIED). | Advanced | `-plugin C:\plugins\X.dll` | path to a .NET dll | none | No | W1, SRC (MyPlugins.RegisterFromArgs: `-plugin <file>`, loaded with `Assembly.LoadFrom`) |
| `-eos` | bare | B | Force EOS network | Forces the Epic Online Services network layer. Meaning for Steam crossplay hosts beyond this is UNVERIFIED. | Network | `-eos` | none | off | No | W1 |
| `-np` | space, `key:value`, repeatable | V | EOS network parameter | Sets an EOS network parameter; repeat for each. Documented keys (defaults in the cfg `<NetworkParameters>` block): `globalMaxUpload` 600, `peerMaxUpload` 600, `statWindow` 60 (seconds), `peakStatWindow` 60 (seconds). Applies to EOS networking only. | Network, Advanced | `-np globalMaxUpload:1000 -np peerMaxUpload:1000` | key:value pairs | cfg defaults above | No | W1 |
| `-selectInstance` | space, value | V | Select service instance | Listed on W1 with no description. Probably selects a named instance of the configurator (UNVERIFIED). | Advanced | `-selectInstance <name>` | instance name | none | No | W1 (name only) |
| `-checkAlive` | bare | B | (unknown) | Listed on W1 with no description. Seen in a real command line `-noconsole -checkAlive -ignorelastsession` (K1), apparently added by the configurator when it launches the server; purpose UNVERIFIED. | Advanced | `-checkAlive` | none | off | No | W1, K1 |
| `-start` | bare | B | (unknown) | Listed on W1 with no description. Purpose UNVERIFIED (not in the 2022 source). | Advanced | `-start` | none | off | No | W1 (name only) |
| `-report` | space, value | V | Error report | In SRC, `-report <file>` sends an error report and exits (`ReportNotInteractive`); internal crash-report helper. Do not use. | Advanced | n/a | n/a | n/a | No | SRC |

## Things the task asked about that are NOT confirmed
- `-game`, `-checkpointId`, `-startService`: found in none of W1, W2, W3, SRC (searched `DedicatedServer.cs`, `MySandboxGame.cs`, `MyPlugins.cs`, `MyProgram.cs`), F1, K1, P1, T1, nor in web searches for the exact strings. Treat as non-existent for panel purposes unless a source turns up. (UNVERIFIED)
- Windows service mode: created through the GUI ("Add new instance", needs admin and a system-wide unique name, each instance needs its own port, W1). In SRC the service has no argument parsing of its own: `Run()` calls `MyServiceBase.Run(new WindowsService())` when the process is not user-interactive, and the service instance name comes from the registry/installer parameter `servicename` (WindowsServiceInstaller.RetrieveServiceName). No documented command-line flag to start a service instance. A panel using a .bat + `-console` (foreground process) avoids all this.

## Generic / engine arguments
The dedicated server is a .NET (VRage) program, not Unity/Unreal. No generic engine arguments (such as -batchmode/-nographics/-log) are documented for it; W3 arguments (`-skipintro`, `-nosplash`, `-appdata`, `-suppressLoadingDialogs`, `+connect`, ...) are for the game client and are not documented as working on the dedicated exe. Do not pass them. (SRC `ParseArgs` for the server only reads `+connect_lobby <id>`, a client lobby-join argument, not useful.)

## Example start lines (sourced)
- Keen's wording, foreground: run `SpaceEngineersDedicated.exe`, pick Local/Console in the dialog (W2). For headless: `SpaceEngineersDedicated.exe -console` (W1, F1).
- Community Pterodactyl egg (Wine): `wine /home/container/DedicatedServer64/SpaceEngineersDedicated.exe -path Z:\\home\\container\\config -console -ignorelastsession` (P1). Ports there: Game 27016, Steam 8766, Remote API 8081 (P1; these ports are from the egg, only 27016 is stated by Keen in W2).
- TCAdmin (2017): `-console -path <root>WORLD -ignorelastsession -maxPlayers <slots> -ip <ip> -port <port>` (T1); the same thread has a poster saying `-path` "does not work" (2016, unresolved there). SRC shows `-path` is implemented, requiring an existing directory.
- Suggested panel line (derived, NOT run): `"<install>\DedicatedServer64\SpaceEngineersDedicated.exe" -console -path "<datadir>"` with `-ignorelastsession` only for first creation, after creating `<datadir>` and (per W1) placing/creating `SpaceEngineers-Dedicated.cfg` inside it. Whether a first run with an empty `-path` folder generates a default cfg and world is UNVERIFIED (needs a run; out of scope for read-only research).

## UNVERIFIED
1. `-game`, `-checkpointId`, `-startService`: no source found anywhere.
2. What `-checkAlive`, `-start`, `-selectInstance` do (names only on W1).
3. Meaning of the "requires a password for game clients" note on `-plugin`.
4. Exact semantics of `-session:<worldPath>` (wiki only, absent in 2022 source), including whether quoting works.
5. Whether current builds still match arguments case-sensitively (source is from 2022, wiki spellings used).
6. Whether `-path` still exits silently on a non-existent folder in the current build (SRC 2022 behaviour).
7. Current server build/version number (latest seen: 01_197_170 on 2021-02-19, from a user log).
8. Where data goes without `-path` for a SteamCMD install (`%APPDATA%\SpaceEngineersDedicated` vs `<InstallFolder>\TempContent\`; W1 gives both).
9. Whether the 32-bit `DedicatedServer\` folder/exe still ships beside `DedicatedServer64\`.
10. Whether `-eos` is needed/safe for ordinary Steam-only servers.
11. Whether first run with an empty `-path` folder auto-creates a default cfg and world.
12. Wiki W1/W2/W3 text was read through a summarizing fetch tool, not as raw text; spellings should be re-checked against the page if exactness matters.

# Unturned dedicated server: launch arguments (STEP: launch, conventions section C)

Researched 2026-10-14. Facts are for the Unturned Dedicated Server (U3DS), Steam app 1110390 (store app 304930), Steam `public` branch
build 25613089 (updated 2026-09-30 per https://api.steamcmd.net/v1/info/1110390). The game's own C# source was read at commit
aba323a (2026-09-21), a little older than that build. So source-derived facts are accurate for the code as of 2026-09-21 and were NOT
run against a live server.

## Source keys
- DOC-LO  = official "Launch Options" page: https://github.com/SmartlyDressedGames/Unturned-Docs/blob/latest/about/launch-options.rst (rendered at https://docs.smartlydressedgames.com/en/stable/about/launch-options.html)
- DOC-STEAMCMD = https://github.com/SmartlyDressedGames/Unturned-Docs/blob/latest/servers/steamcmd.rst
- DOC-RESTART = https://github.com/SmartlyDressedGames/Unturned-Docs/blob/latest/servers/server-auto-restart.rst
- DOC-HOST = https://github.com/SmartlyDressedGames/Unturned-Docs/blob/latest/servers/server-hosting.rst
- DOC-CFG = https://github.com/SmartlyDressedGames/Unturned-Docs/blob/latest/servers/server-configuration.rst
- DOC-GSLT = https://github.com/SmartlyDressedGames/Unturned-Docs/blob/latest/servers/game-server-login-tokens.rst
- DOC-PORT = https://github.com/SmartlyDressedGames/Unturned-Docs/blob/latest/servers/port-forwarding.rst
- DOC-CMDIO = https://github.com/SmartlyDressedGames/Unturned-Docs/blob/latest/servers/command-io.rst
- SRC = the game's public source, https://github.com/SmartlyDressedGames/Unturned-3.x-Community/blob/main/Assets/Runtime/Assembly-CSharp/ + the path in brackets
- WIKI = https://unturned.wiki.gg/wiki/Commands
- UNITY = https://docs.unity3d.com/2022.3/Documentation/Manual/PlayerCommandLineArguments.html
- STEAMINFO = https://api.steamcmd.net/v1/info/1110390

## 1. How the server is started (the part that decides everything)

SteamCMD install: `login anonymous` then `app_update 1110390` (DOC-STEAMCMD, "Install the Unturned Dedicated Server with SteamCMD").
Anonymous login is stated by the official docs. Install folder is `.../steamapps/common/U3DS/` (DOC-STEAMCMD; STEAMINFO `installdir: U3DS`).
Steam's own launch table for the app lists `ServerHelper.bat` (windows) and `ServerHelper.sh` (linux) as the server entry (STEAMINFO config.launch).

Official Windows launch (DOC-STEAMCMD): a .bat containing
`start "" "%~dp0ServerHelper.bat" +InternetServer/MyServer` (Internet) or `start "" "%~dp0ServerHelper.bat" +LanServer/MyServer` (LAN).
`MyServer` is the "ServerID"; save data and config live in `U3DS\Servers\<ServerID>\`.

Official direct launch of the real exe (DOC-RESTART, the auto-restart .bat example):
`start "" /wait "%~dp0steamapps\common\U3DS\Unturned.exe" -batchmode -nographics +InternetServer/MyServer`
So on Windows the game executable is `Unturned.exe` in the U3DS folder, and `-batchmode -nographics` are what ServerHelper adds.
(Linux: `Unturned_Headless.x86_64` per the third-party AMP template https://github.com/CubeCoders/AMPTemplates/blob/main/unturned.kvp
and a ServerHelper.sh copy https://github.com/LancreFI/shellScripts/blob/main/unturned/ServerHelper.sh whose comments say
"-batchmode and -nographics are Unity player arguments ... "$@" appends any command-line arguments passed to this script".)

Recommended panel start line (all parts sourced above), Windows:
```
cd /d "<install>\U3DS"
Unturned.exe -batchmode -nographics [other - flags] +InternetServer/<ServerID>
```
Why run Unturned.exe directly instead of ServerHelper.bat: the exact text of ServerHelper.bat is UNVERIFIED (not in any source I could open;
a third-party tool writes its own version as `start "" "%~dp0Unturned.exe" -batchmode -nographics %*`, which is a re-creation, not the shipped file,
https://github.com/czacknightw/Unturned-Dedicated-Server/blob/main/main.py). The docs pattern `start "" ... ServerHelper.bat` implies the
bat spawns the exe and exits, so the panel would then be tracking the wrong (short-lived) process. Process name to match is `Unturned.exe`.

### The +InternetServer / +LanServer syntax, precisely (SRC Unturned/Utils/CommandLine.cs `tryGetServer`, Unturned/Provider/Dedicator.cs)
- Form: `+InternetServer/<ID>` or `+LanServer/<ID>`. A plus sign, the keyword, a slash, then the ID. No space, no equals. The game prints exactly these two as the valid forms: `+InternetServer/{ID}` and `+LANServer/{ID}` (Dedicator.cs).
- Keyword match is case-insensitive and is found anywhere in the full command line (`line.ToLower().IndexOf("+internetserver")`).
- THE ID IS EVERYTHING AFTER THE SLASH TO THE END OF THE WHOLE COMMAND LINE (`line.Substring(index + 16, line.Length - ...)`). So `+InternetServer/<ID>` MUST BE THE LAST ARGUMENT, with no trailing arguments and no trailing space. Anything after it becomes part of the server folder name. The official examples and the AMP template all put it last. (Derived from source; the docs do not say it. Not run live.)
- Search order in the code: `+secureserver`, then `+insecureserver`, then `+internetserver`, then `+lanserver`. The first three all mean Internet. `+secureserver/<ID>` is the old spelling (the unturned.wiki.gg Server page still shows `+secureserver\Server`, https://unturned.wiki.gg/wiki/Server, pre-3.20.12.2 shortcut method). Use `+InternetServer/` for new servers.
- The ID `Singleplayer` is rejected (treated as no server args).
- If NO server argument is given, the dedicated-server build logs "launch arguments were not specified" and defaults to a LAN server with ID `Default` (Dedicator.cs). This is what you get launching from the Steam library (DOC-HOST: servers are LAN by default).
- ID characters: spaces become `_` in the log filename (SRC Unturned/Managers/Logs.cs line ~311). Whether quotes/spaces in an ID are safe is UNVERIFIED. The panel should restrict IDs to letters, digits, `_` and `-`.
- Internet vs LAN: LAN servers are hidden from the Internet list and join via Steam friends or the 17-digit Server Code (DOC-HOST). An Internet server needs a Game Server Login Token (GSLT) to be listed/joinable over the Internet, plus Fake IP or port forwarding (DOC-HOST "Switching to an Internet Server"; DOC-GSLT; the game itself warns "Without a login token the server: Is not visible in Internet server list, Cannot be joined over the Internet", SRC SteamworksProvider/Services/Multiplayer/Server/SteamworksServerMultiplayerService.cs).

### How other command-line arguments are parsed (SRC Unturned/Utils/CommandLine.cs, Unturned/Bundles/CommandLineValue.cs, Unturned/Bundles/LazyCommandLineFlag.cs)
Three different mechanisms exist. Mixing them up is the main trap.
1. Plain flags (bool): present = on. Detected by a case-insensitive substring search of the entire command line (`IndexOf(flag)`). Example `-SkipAssets`. Never give a value.
2. Valued flags (`-Key=value`, `-Key value`, `-Key "value with spaces"`): the parser accepts `key value`, `key=value`, `key = value` and quoted values (documented in the code comment of `TryParseValue`). Official docs write them as `-Glazier=IMGUI`, `-Width=1920`. Example `-GameplayConfigFile="SpecialEventConfig.txt"` (DOC-CFG).
3. Game commands on the command line: every argument starting with `-` is ALSO turned into a game command (leading dash removed) and the following non-dash words are appended as its parameter (`getCommands()`). So `-Port 27015` runs the game command `Port 27015`, and `-Name "My Server"` runs `Name My Server`. These are run at startup BEFORE `Commands.dat` is read (Provider.cs ~line 6638 then Commands.dat), so a line in Commands.dat overrides the same command given on the command line. After a `+...` argument, following plain words are skipped. A `-flag` that is not a game command (e.g. `-batchmode`) just logs "Did not match ... with any commands" (harmless). The `key=value` form does NOT work for game commands (the command name would be `Port=27015`, which matches nothing). The `-port/27015` form seen in one third-party tool is not valid for the same reason (UNVERIFIED that it does anything; source says it does not).
   Confirmation that command-line commands are an intended feature: the GSLT page says the `GSLT` command "can be specified in the Commands.dat file or on the command-line" (DOC-GSLT). Exact working example on a live server: UNVERIFIED (derived from source, not run).

## 2. Argument table

Group names: Server / Network / Saves and logs / Performance / Advanced.
Kinds: bool = flag with no value; value = takes a value; fixed = always the same text. "Panel-managed" = the panel should write/own it.
"Default" for plain flags is "off" unless stated.

### 2a. Required / core (the panel always writes these)

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-batchmode` | plain flag | bool (Unity engine) | Run without a game window | Starts the game as a headless server with no player window and no player input. Always needed for a dedicated server. | Server | `-batchmode` | n/a | off (without it the exe opens as a normal game) | Yes, always written | UNITY (`-batchmode`); DOC-LO (Unity Options); DOC-RESTART example |
| `-nographics` | plain flag | bool (Unity engine) | Skip the graphics card | In batch mode, does not start the graphics device, so the server runs on machines with no GPU and uses less memory. Always used together with -batchmode. | Performance | `-nographics` | n/a | off | Yes, always written | UNITY (`-nographics`); DOC-LO; DOC-RESTART example |
| `+InternetServer/<ID>` | plus keyword, slash, ID; LAST argument | value (ID) | Internet server and its folder name | Starts a server that can be listed and joined over the Internet (needs a GSLT, see below). The ID names the folder `Servers\<ID>\` holding the world save and config files; use a new ID for a separate server. | Server | `+InternetServer/MyServer` | ID: letters/digits/`_`/`-` recommended (other characters UNVERIFIED); not `Singleplayer` | none given => LAN server `Default` | Yes (visibility + server ID), must be last | DOC-STEAMCMD; DOC-RESTART; SRC Utils/CommandLine.cs |
| `+LanServer/<ID>` | same | value (ID) | LAN-only server and its folder name | Starts a server only reachable from the local network or by Steam friend invite / 17-digit Server Code. Not shown in the Internet list. | Server | `+LanServer/MyServer` | same | (this is the default when no `+` server arg is given) | Yes, alternative to the above | DOC-STEAMCMD; DOC-HOST; SRC Utils/CommandLine.cs |
| `+secureserver/<ID>` / `+insecureserver/<ID>` | same | value | Old spelling of +InternetServer | Legacy aliases, both treated as Internet servers. Do not use for new servers. | Server | `+secureserver/Server` | same | n/a | No (never write) | SRC Utils/CommandLine.cs; https://unturned.wiki.gg/wiki/Server (old shortcut method) |

First-creation note: the first launch with a new ID creates `Servers\<ID>\` including `Server\Commands.dat` (written empty if missing), `Config.txt`, `WorkshopDownloadConfig.json`; the docs then say to run `Shutdown`, edit the files and start again (DOC-STEAMCMD steps 7-9; SRC Provider.cs creates an empty Commands.dat when missing). The panel can pre-write `Servers\<ID>\Server\Commands.dat` before the first start (the game reads it if present, SRC Provider.cs ~6648, path `Servers/<ID>/Server/Commands.dat`).

### 2b. Game commands that can be passed as `-Command value` (and are normally set in Commands.dat; see section 3)

These are the ones the panel's form already covers or that matter for launch. The form on the command line is `-Name value` (dash, command, space, value). Panel recommendation: write them in Commands.dat (the official place, DOC-HOST) rather than on the command line, because Commands.dat wins on conflict and is what the docs and every guide edit.

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-Port` (command `Port`) | `-Port 27015` | value | Server port | The Steam QUERY port. The game traffic itself uses the next port up (Port+1). Both UDP. Change when running several servers on one PC (e.g. 27015, 27017, 27019). Cannot change while running. | Network | `-Port 27017` | 0-65535 (ushort); use one with port+1 free | 27015 | Yes (panel port field) | SRC Command/CommandPort.cs; SRC Provider/Provider.cs (`port` = "Steam query port", `GetServerConnectionPort()` returns port+1; default `port = 27015`); DOC-PORT ("two consecutive ports ... default 27015 and 27016", enable UDP) |
| `-Name` | `-Name "My Server"` | value | Server name | Name shown in the server list. 5-50 characters. | Server | `-Name "My Server"` | text, length 5-50 | `Unturned` | Yes (session name) | SRC Command/CommandName.cs (MIN 5, MAX 50), Provider.cs default; WIKI |
| `-MaxPlayers` | `-MaxPlayers 24` | value | Player limit | Maximum players connected at once. | Server | `-MaxPlayers 16` | integer 1-200 | 8 | Yes | SRC Command/CommandMaxPlayers.cs (MIN 1, MAX 200), Provider.cs default 8; WIKI |
| `-Map` | `-Map PEI` | value | Map | Which map to load. Official maps: PEI, Washington, Yukon, Russia, Germany; Workshop maps need their ID in `WorkshopDownloadConfig.json` and then the map's exact name here. Cannot change while running. | Server | `-Map Washington` | map folder name (case-sensitive per WIKI update history) | PEI | Yes (map field) | DOC-HOST (Commands.dat example); SRC Command/CommandMap.cs, Provider.cs default `map = "PEI"`; WIKI |
| `-Password` | `-Password secret` | value | Join password | Players must type this to join. Stored/compared hashed (SHA-1, so do not reuse a real password). | Server | `-Password hunter2` | text; empty = no password | none | Yes (server password) | SRC Command/CommandPassword.cs; WIKI; https://github.com/unturned-info/unturned-3-knowledgebase (docs/Server-Hosting/ServerHosting.md) |
| `-GSLT` | `-GSLT <token>` | value | Steam login token | Game Server Login Token from https://steamcommunity.com/dev/managegameservers with app ID 304930. Needed for an Internet server to be listed and joined over the Internet, and keeps the Server Code stable. Alternative place: `Login_Token` in Config.txt (Browser section). The command wins over Config.txt. A token is secret: never print/store it in logs. | Network | `-GSLT <32-char token>` | 32-character token (shorter/longer only logs a warning) | none | Yes if the panel gets a token field; secret | DOC-GSLT; SRC Command/CommandGSLT.cs; SRC SteamworksProvider/.../SteamworksServerMultiplayerService.cs (command token checked first, then Config.txt `Login_Token`, empty = anonymous login) |
| `-Bind` | `-Bind 192.168.0.6` | value | Network address to listen on | Binds the server to one local IP address. Only for PCs with several network adapters. | Network | `-Bind 192.168.0.6` | IPv4 address | 0.0.0.0 (all) | No | SRC Command/CommandBind.cs; WIKI |
| `-Owner` | `-Owner 7656119...` | value | Owner (admin) Steam ID | SteamID64 of the server owner; gives them admin and cheat commands in game chat. | Server | `-Owner 76561198000000000` | 17-digit SteamID64 | none | Optional | SRC Command/CommandOwner.cs; DOC-HOST |

(Commands.dat equivalents of everything above, plus Cheats, PvE, Perspective, Welcome etc., are in section 3. Perspective's exact command word is "Perspective" per DOC-HOST/WIKI; its C# class is CommandCamera and the word itself comes from a localisation file that is not in the public source, so the DOC-HOST spelling is the authority.)

### 2c. Official game launch options that matter for a dedicated server (DOC-LO unless noted)

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-SkipAssets` | plain flag | bool | Skip loading assets/Workshop content | Does not load asset bundles or Workshop content, so the server starts fast. For plugin developers only; the map and mods will not load. | Advanced | `-SkipAssets` | n/a | off | No (never write) | DOC-LO; SRC Bundles/Assets.cs ("Plugin developers find it useful to quickly launch the server") |
| `-MaxPlayersLimit` | `-MaxPlayersLimit=48` | value | Hard cap on player limit | Upper limit for the MaxPlayers setting, so a host can stop customers raising it. The game clamps any larger MaxPlayers down to this. | Server | `-MaxPlayersLimit=24` | integer | off | No (optional, hosting-provider use) | SRC Provider/Provider.cs ~4397 ("Allows hosting providers to limit the configurable max players value from the command-line"). Not on the DOC-LO page. |
| `-HostPlayerLimit` | `-HostPlayerLimit=48` | value | Hosting-provider player limit | DOC-LO describes: "Clamps max number of players to this number. Useful for hosting providers." I could not find it in the public source (`-MaxPlayersLimit` does the same job there), so treat as UNVERIFIED whether it still works. Prefer -MaxPlayersLimit. | Server | n/a | integer | off | No | DOC-LO only |
| `-GameplayConfigFile` | `-GameplayConfigFile="Name.txt"` | value | Use a different gameplay config file | Loads gameplay rules from `Servers/<ID>/Name.txt` instead of `Config.txt` (or an absolute path). Useful for seasonal/event rule sets. | Saves and logs | `-GameplayConfigFile="SpecialEventConfig.txt"` | file name or absolute path | `Config.txt` | No | DOC-CFG; SRC Provider.cs ~2129 |
| `-LogGameplayConfig` | plain flag | bool | Print config overrides at startup | Prints which settings your config overrides to the console. Handy when checking that Config.txt took effect. | Saves and logs | `-LogGameplayConfig` | n/a | off | No (optional) | DOC-CFG |
| `-NoLevelConfigOverrides` | plain flag | bool | Ignore map rule overrides | Stops maps from overriding your Config.txt values. Without it, maps can override any setting you left empty. | Advanced | `-NoLevelConfigOverrides` | n/a | off | No | DOC-CFG; SRC Provider.cs ~4557 |
| `-GameplayConfigNoGeneratedComments` | plain flag | bool | Shorter Config.txt | Removes the explanation comments (lines starting with `>`) when Config.txt is written. Makes the file shorter but loses the in-file help. | Saves and logs | `-GameplayConfigNoGeneratedComments` | n/a | off | No. Do not use if the panel shows Config.txt in its form (it relies on comments? UNVERIFIED how the panel parses). | DOC-CFG |
| `-GameplayConfigNoEmptyValues` | plain flag | bool | Hide unused options in Config.txt | Removes all non-overridden options from the written Config.txt. | Saves and logs | `-GameplayConfigNoEmptyValues` | n/a | off | No | DOC-CFG |
| `-UseLegacyJsonGameplayConfig` | plain flag | bool | Use old Config.json | Keep using the pre-3.25.8.0 `Config.json` instead of `Config.txt`. Only for old servers. | Saves and logs | `-UseLegacyJsonGameplayConfig` | n/a | off | No | DOC-CFG |
| `-LegacyConsole` | plain flag | bool | Old blocking console | Uses the old console instead of the default threaded console. Only for troubleshooting console input. | Advanced | `-LegacyConsole` | n/a | off | No | DOC-LO; SRC Command/CommandWindow.cs |
| `-NoDefaultConsole` | plain flag | bool | Turn off the built-in console | Disables the normal console so a plugin can supply its own command input/output. | Advanced | `-NoDefaultConsole` | n/a | off | No | DOC-CMDIO; SRC Command/CommandWindow.cs |
| `-NoWin32Console` | plain flag | bool | Do not create a Windows console | By default the Windows build creates its own console window (and closes it on exit). This stops that. Effect on how the panel captures output: UNVERIFIED (not tested). | Advanced | `-NoWin32Console` | n/a | off | UNVERIFIED, test before use | SRC Command/WindowsConsole.cs |
| `-NoRedirectConsoleInput` / `-NoRedirectConsoleOutput` | plain flags | bool | Do not redirect console input / output | The game redirects console input and output by default; these turn that off. Effect on a panel that pipes stdin/stdout: UNVERIFIED (not tested). | Advanced | `-NoRedirectConsoleOutput` | n/a | off | UNVERIFIED, test before use | SRC Command/ConsoleInputOutputBase.cs |
| `-ProxyRedirectedConsoleOutput` | plain flag | bool | Proxy redirected console output | Also forwards redirected console output. Effect UNVERIFIED. | Advanced | n/a | n/a | off | No | SRC Command/ConsoleInputOutputBase.cs (no comment explains it) |
| `-NoDefaultLog` | plain flag | bool | Do not write the game log file | Disables the normal log file. Without it the server writes `Logs/Server_<ID>.log` in the U3DS folder. Leave off so the panel can show logs. | Saves and logs | `-NoDefaultLog` | n/a | off | No (never write) | DOC-LO; SRC Managers/Logs.cs (file named `Server_<ID>.log`, spaces in the ID become `_`) |
| `-UnredactedLogs` | plain flag | bool | Show IPs in logs | By default player IPs (BattlEye log) and the Workshop download IP are hidden in logs. This shows them. Privacy cost; not needed. | Saves and logs | `-UnredactedLogs` | n/a | off | No | DOC-LO; SRC Managers/Logs.cs |
| `-LogBadMessages` | plain flag | bool | Log ignored network messages | Logs network messages the server ignored and who sent them. Only for investigating a suspicious connection. | Advanced | `-LogBadMessages` | n/a | off | No | DOC-LO |
| `-NoWorkshopSubscriptions` | plain flag | bool | Ignore Workshop subscriptions | Disables loading of all Steam Workshop subscriptions. For troubleshooting. (For a dedicated server, Workshop content comes from WorkshopDownloadConfig.json, not subscriptions.) | Advanced | `-NoWorkshopSubscriptions` | n/a | off | No | DOC-LO |
| `-OfflineOnly` | plain flag | bool | No internet access | For LAN servers: skips the Steam backend connection and uses locally cached Workshop items. | Network | `-OfflineOnly` | n/a | off | No | DOC-LO; SRC Provider/Dedicator.cs |
| `-EnableCharacterControllerOverlapRecovery` | plain flag | bool | Faster player movement checks | Can improve server performance but makes out-of-bounds exploits easier; the docs say it can cause more problems than it solves. Do not recommend. | Performance | `-EnableCharacterControllerOverlapRecovery` | n/a | off | No | DOC-LO |
| `-ForceTrustClient` | plain flag | bool | Do not check vehicle movement | Turns off vehicle movement validation. The docs say using it is not recommended: cheaters can fly cars. Do not offer. | Advanced | `-ForceTrustClient` | n/a | off | No (never write) | DOC-LO |
| `-ModulesPath` | `-ModulesPath <dir>` | value | Modules folder | Looks for `.dll`/`.module` files here instead of `Unturned/Modules`. Plugin hosts only. | Advanced | `-ModulesPath D:\mods` | directory path | `Unturned/Modules` | No | DOC-LO |
| `-NetTransport` | `-NetTransport=SteamNetworking` | value | Network backend | Old option to choose the Steam networking API. SteamNetworkingSockets is now the default; `SteamNetworking` reverts to the older deprecated API. Leave alone. | Network | `-NetTransport=SteamNetworking` | `SteamNetworkingSockets`, `SteamNetworking` | SteamNetworkingSockets | No | DOC-LO; SRC Provider/NetTransportFactory.cs |
| `-Lang=` / `-Loc=` | `-Lang=Russian` | value | Server language | Picks a localisation folder (Localization/ or a Workshop localisation). Only changes server console text. | Advanced | `-Lang=English` | name of a folder in `Localization/` | English (UNVERIFIED which default the server console uses) | No | SRC Utils/CommandLine.cs `tryGetLanguage`. Not on DOC-LO page. |
| `-Glazier=` | `-Glazier=IMGUI` | value | UI system | Client UI option (game window). Irrelevant for a headless server. | Advanced | n/a | `IMGUI`, `UIToolkit` | uGUI | No | DOC-LO |

Source-only flags found in the game code and not documented (all bool, default off, all for debugging; do NOT expose in the panel, listed so nothing is lost): `-ConstNetEvents`, `-AggressiveGC` (runs garbage collection after every loading frame, for players running out of RAM, SRC Bundles/Assets.cs), `-LogWorkshopAssets`, `-LogSpawnInsertions`, `-SkipResourcesHashing`, `-LogResourcesHash`, `-LogLevelHash`, `-NoNsbLogging`, `-NsbLogging`, `-LogSteamNetworkingSockets <int>`, `-SNS_SendBufferSize <int>`, `-SNS_EnableDiagnosticsUI`, `-SNS_AllowWithoutAuth`, `-TryDisableAssertions`. For the next two flags a doc line exists in source comments only:
`-NoSteamGameServerLogin` (skips logging the server in to Steam at all; LAN/offline testing only, SRC SteamworksServerMultiplayerService.cs "Skipping Steam game server login"), `-NoSteamGameServerAdvertisement` (does not announce the server to the Steam server list, same file), `-SNS_DisableIPSocket` and `-SNS_DisableP2PSocket` (turn off the regular IP socket or the Server-Code/Fake-IP style relay socket, SRC ServerTransport_SteamNetworkingSockets.cs). Building on any of these without a live test is risky.
Dev-build only, not present in the shipped release server (compiled out): `-BypassVersion`, `-BypassAssemblyHash`, `-BypassResourcesHash`, `-IgnoreServerWorkshopFiles`, `-ApplicationTargetFrameRate`, `-DedicatedServerInEditor`.

### 2d. Generic engine (Unity) arguments

| flag | form | kind | label | description | group | example | allowed values | default | safe/useful for the panel? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-batchmode`, `-nographics` | see 2a | | | | | | | | Required | UNITY |
| `-logFile` | `-logFile <path>` or `-logFile -` (dash = write to the console) | value | Unity player log location | Where Unity writes its player log. Not the same file as the game's `Logs/Server_<ID>.log`. A third-party panel (Open Game Panel) uses `-logfile Logs/server.log` (https://github.com/OpenGamePanel/OGP-Website/blob/master/modules/config_games/server_configs/unturned_win64.xml). Whether the Unturned server still prints to the console with `-logFile -` is UNVERIFIED. | Saves and logs | `-logFile "Logs\unity.log"` | path, or `-` | Unity default player log (location UNVERIFIED for this game) | Optional; test first | UNITY (`-logFile`) |
| `-nolog` | plain flag | bool | Disable Unity output log | Does not produce Unity's output log. The game's own Server_<ID>.log is separate (turned off by -NoDefaultLog). | Saves and logs | `-nolog` | n/a | off | Not recommended | UNITY (`-nolog`) |
| `-force-vulkan`, `-force-glcore` | plain flags | bool | Graphics API | Force Vulkan or OpenGL. Meaningless with -nographics. | Advanced | n/a | n/a | off | No | DOC-LO (Unity Options) |
| `-silent-crashes`, `-quit`, `-screen-width` etc. | | | | The Unity pages I opened do not list `-silent-crashes` or `-quit`, so no claim is made about them. Other Unity player arguments exist at the UNITY link above. | | | | | UNVERIFIED | UNITY |

## 3. Commands.dat (only the relevant part)

What it is: `Servers\<ID>\Server\Commands.dat`, a plain text file read at startup, one command per line, `Command value` (a space between name and value); blank lines ignored; lines starting with `//` are comments; command names are case-insensitive (SRC Provider.cs ~6645-6665; DOC-HOST; WIKI). Unknown lines log `Unknown entry in Commands.dat`. File is created empty on first run. Commands.dat is applied AFTER command-line commands, so it wins (SRC Provider.cs).
The panel's existing form (name, password, max players, map, port) maps straight onto Commands.dat lines; there is no reason to put them on the command line.

Official sample (DOC-HOST):
```
Name My Unturned Server
Map PEI
MaxPlayers 24
// Owner YourSteamID
Cheats
// Password ExamplePassword1234
// PvE
Perspective Both
// Port 27015
```

Startup-time commands that matter for a panel (defaults from SRC where stated, otherwise WIKI; "config" commands cannot be changed while the server is running):

| command | syntax | what it does | default / range | source |
|---|---|---|---|---|
| Name | `Name <text>` | Name in the server list | `Unturned`; 5-50 chars | SRC CommandName.cs; WIKI |
| Map | `Map <level>` | Map to load | `PEI` | SRC CommandMap.cs |
| MaxPlayers | `MaxPlayers <1-200>` | Player limit | 8 | SRC CommandMaxPlayers.cs |
| Port | `Port <number>` | Steam query port; game port is this +1 | 27015 | SRC CommandPort.cs, Provider.cs |
| Password | `Password <text>` | Join password | none | SRC CommandPassword.cs |
| Queue_Size | `Queue_Size <0-64>` | Players allowed to wait in the join queue | 8 in code (`queueSize = 8`); WIKI lists default 0 (conflict, UNVERIFIED which is right for a fresh server) | SRC CommandQueue.cs max 64, Provider.cs; WIKI |
| Perspective | `Perspective <First/Third/Both/Vehicle>` | Allowed camera views | WIKI says First; DOC-HOST sample uses `Both`; source default is `cameraMode` not read here, UNVERIFIED | DOC-HOST; WIKI; SRC CommandCamera.cs accepts those four words |
| Mode (difficulty) | `Mode <Easy/Normal/Hard>` | Which difficulty config is used | Normal | SRC CommandMode.cs; WIKI; DOC-HOST |
| Cheats | `Cheats` (no value) | Lets admins use cheat commands (Give, Vehicle...) | off | SRC CommandCheats.cs; DOC-HOST |
| PvE | `PvE` (no value) | Turns off player-versus-player damage | PvP on | SRC CommandPvE.cs |
| Owner | `Owner <SteamID64>` | Makes this Steam account the server owner/admin | none | SRC CommandOwner.cs; DOC-HOST |
| GSLT | `GSLT <token>` | Steam login token (secret) | none; or Config.txt `Login_Token` | DOC-GSLT |
| Bind | `Bind <IPv4>` | Listen on one address | 0.0.0.0 | SRC CommandBind.cs |
| Welcome | `Welcome <text>` or `Welcome <text>/<R>/<G>/<B>` | Message shown to joining players, optional colour 0-255 each | none | SRC CommandWelcome.cs |
| Timeout | `Timeout <50-10000>` | Ping (ms) above which a client is kicked | 750 (WIKI) | SRC CommandTimeout.cs range; WIKI default |
| Filter, Gold, Whitelisted, Hide_Admins, Sync, GameMode | see WIKI | Less common join/visibility rules | | WIKI |

Runtime-only commands the panel might send to the console (not for Commands.dat): `Save` (no autosave exists, DOC-HOST), `Shutdown` (saves and closes; optional delay form `Shutdown <seconds>/<message>`, SRC CommandShutdown.cs), `Say <text>`, `Players`, `Help`, `CopyServerCode`, `CopyFakeIP` (DOC-HOST, DOC-FAKEIP/Server Codes docs). Admin chat commands use a `/` or `@` prefix (DOC-HOST).
Stop behaviour relevant to the stop step: the console `shutdown` command saves and quits; Ctrl+C, Ctrl+Break and closing the console window are also handled and trigger the same graceful `Provider.shutdown()` (SRC Command/ConsoleInputOutputBase.cs `handleTermination`, WindowsConsole.cs). Whether piping text into stdin works under a process launched without a visible console is UNVERIFIED: the threaded console polls `Console.KeyAvailable` before `Console.ReadLine` (SRC Command/ThreadedConsoleInputOutput.cs), which may not report piped input. Test before building the stop step on it.

## 4. Things that are NOT launch arguments (so the panel must write them in files)
- Fake IP (`Use_FakeIP true`), `Login_Token`, difficulty/rules, auto-restart (`Enable_Scheduled_Shutdown` etc.): all in `Servers\<ID>\Config.txt` (DOC-CFG, DOC-RESTART; Fake IP: https://github.com/SmartlyDressedGames/Unturned-Docs/blob/latest/servers/fake-ip.rst). Note DOC-RESTART still says "Config.json", which is the pre-3.25.8.0 name; current name is Config.txt (DOC-CFG).
- Workshop mods: `Servers\<ID>\WorkshopDownloadConfig.json`, key `File_IDs` list of numbers (DOC-HOST).
- Admins: `Adminlist.dat`, or the `Owner` command (DOC-HOST).

## 5. Suggested panel start-script (all parts sourced)
```
@echo off
cd /d "%~dp0"
Unturned.exe -batchmode -nographics +InternetServer/<ServerID>
```
(for LAN replace the last argument with `+LanServer/<ServerID>`). Port, name, password, max players, map, GSLT, owner go in `Servers\<ServerID>\Server\Commands.dat`. Ports to open for an Internet server with port forwarding: UDP `Port` and `Port+1` (default 27015 and 27016); with Fake IP or Server Codes no forwarding is needed (DOC-PORT, DOC-HOST).

## UNVERIFIED list
1. Exact text of the shipped `ServerHelper.bat` / `ExampleServer.bat` (not available from any source I could open; Steam lists ServerHelper.bat as the Windows launch file, STEAMINFO).
2. That `+InternetServer/<ID>` must be the last argument is derived from source code (`Substring` to end of line), not stated in the docs, and not run on a live server.
3. Command-line game commands (`-Port 27015`, `-Name "x"`, `-GSLT token`) are read from source; not run on a live server. `-key=value` does not work for them according to the source; `-port/27015` (seen in a third-party tool) likely does nothing.
4. Whether quotes or spaces in the server ID are safe.
5. `-HostPlayerLimit` (documented, but not found in the public source; `-MaxPlayersLimit` found in source but not documented).
6. Behaviour of `-NoWin32Console`, `-NoRedirectConsoleInput`, `-NoRedirectConsoleOutput`, `-ProxyRedirectedConsoleOutput` when the panel captures output; behaviour of piped stdin (`Console.KeyAvailable`) for sending `shutdown`.
7. Unity `-logFile` behaviour with this game (default player-log location, whether `-logFile -` shows console output); Unity `-silent-crashes` and `-quit` not found on the pages opened.
8. Default of `Queue_Size` (code says 8, wiki says 0) and of `Perspective` (wiki says First; docs sample sets Both).
9. Default server-console language for `-Lang=`.
10. Whether UDP is the only protocol needed on the two game ports (docs say enable UDP only; the AMP template lists "Both"; no official TCP requirement found).
11. Whether the panel's Config.txt form depends on the generated comments (matters for `-GameplayConfigNoGeneratedComments`); a panel-side question, not a game question.
12. Source facts come from the public repo at 2026-09-21; the live public build is 25613089 from 2026-09-30, so tiny differences are possible.

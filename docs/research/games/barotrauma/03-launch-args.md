# Barotrauma - launch arguments (STEP: launch)

Server: `DedicatedServer.exe` (Windows; `./DedicatedServer` on Linux). SteamCMD tool app 1026340, store app 602960. Research date 2026-10-15.
Ground truth used: the game's own source on GitHub, `master` branch (the public Barotrauma repo). The exact server build number that master corresponds to is UNVERIFIED (see list), so spot-check on a real install with the Steam build in use.

Sources (S = file read in full or in the relevant part):
- S1 https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaServer/ServerSource/GameMain.cs (`StartServer()` argument parsing, constructor)
- S2 https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaServer/ServerSource/Program.cs (`-pipes`)
- S3 https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaClient/ClientSource/Screens/MainMenuScreen/MainMenuScreen.cs (how the game itself launches a hosted server: the exact argument list it passes)
- S4 https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/SharedSource/Networking/NetConfig.cs (default ports, max players)
- S5 https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/SharedSource/Networking/ServerSettings.cs (PlayStyle enum, setting defaults, clamps)
- S6 https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/Data/karmasettings.xml (karma preset names)
- S7 https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaShared/Data/languageoptions.xml and .../SharedSource/Settings/ServerLanguageOptions.cs (language identifiers)
- S8 https://raw.githubusercontent.com/FakeFishGames/Barotrauma/master/Barotrauma/BarotraumaServer/ServerSource/DebugConsole.cs (console command `exit|quit|close`)
- S9 https://barotraumagame.com/wiki/Hosting_a_Dedicated_Server (official wiki; WebFetch returned 403 for the page directly, the equivalent page https://barotraumagame.com/baro-wiki/index.php?curid=3035 was readable: it only says to run `DedicatedServer.exe` from the main folder, or `app_run 1026340` in SteamCMD, and documents NO command-line arguments; settings go in `serversettings.xml` / `clientpermissions.xml`)
- S10 https://xgamingserver.com/docs/barotrauma/configure-your-server (third-party host: `port` 27015 main UDP game port, `queryport` 27016 Steam query/server browser port; "Startup parameters take priority over serversettings.xml")

## How the arguments work (all from S1 unless noted)
- Two parse passes over the argument list, each argument is matched case-insensitively (`Trim().ToLowerInvariant()`), so `-Name` works the same as `-name`.
- Values are the NEXT argument (space-separated). There is no `-name=value` form in the code. Quote values that contain spaces.
- Before parsing, the server loads `serversettings.xml` (in the working directory) and uses it as the starting values (name, port, queryport, public, upnp, maxplayers, password). Command-line values then override these. If the file is missing it prints a warning and uses built-in defaults. (S1)
- Pass 1 (`-name -port -queryport -public -password -nopassword -upnp/-enableupnp -maxplayers -ownerkey -endpoint -pipes -lenienthandshake`) is applied BEFORE the server object is created, so these are real startup values.
- Pass 2 (`-playstyle -banafterwrongpassword -karma/-karmaenabled -karmapreset -language -multiclienttestmode`) is applied AFTER `Server.StartServer(...)` and writes into the live server settings (S1). Whether these are then saved back into `serversettings.xml` is UNVERIFIED.
- A value-taking flag as the LAST argument with no value throws an exception (no bounds check in S1). The panel must always supply the value.
- `bool.TryParse` / `int.TryParse` failures: the code ignores the return value, so an unparseable value silently becomes `false` / `0` (C# `out` default), e.g. `-port abc` -> port 0. This is derived from reading S1, not observed.
- Booleans are written `True`/`False` by the game itself (S3); `bool.TryParse` is case-insensitive.
- Without `-ownerkey`, the server is a true dedicated server and initializes Steam (SteamManager) and EOS (S1 constructor comment: "no owner key = dedicated server").

## Table

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-name` | space (next arg) | value | Server name | The name shown in the server list and in the lobby. Overrides the name in serversettings.xml. Names longer than 60 characters are the game's limit (`ServerNameMaxLength = 60`; what happens above that is UNVERIFIED). | Server | `-name "My Sub Crew"` | any text | xml `ServerName` (older `name`), else `Server` | YES (session name) | S1, S4 |
| `-port` | space | value (int) | Game port | The UDP port players connect to. | Network | `-port 27015` | integer | 27015 | YES | S1, S4 |
| `-queryport` | space | value (int) | Query port | The UDP port the Steam server list uses to ask the server about itself (name, players). Must also be open for the server to show up properly in the browser. | Network | `-queryport 27016` | integer | 27016 | YES | S1, S4, S10 |
| `-public` | space | value (bool) | Public server | `True` lists the server in the public server browser, `False` keeps it hidden (join by IP/Steam only). | Server | `-public False` | `True` / `False` | xml `IsPublic`, else `False` (code default before xml: false; the game's own shipped xml default for `IsPublic` is `true` in S5 property metadata) | optional (could be a checkbox) | S1, S5 |
| `-password` | space | value | Join password | Players must type this to join. Same effect as the `password` attribute in serversettings.xml. Visible in the process list and in the start script. | Server | `-password "secret"` | any text | xml `password`, else empty | YES (serverPassword) | S1 |
| `-nopassword` | none | bool flag | No password | Clears the password (sets it to empty), overriding any password saved in serversettings.xml. Takes no value. The game itself passes this when no password is set. | Server | `-nopassword` | n/a | n/a | YES (emitted when password empty) | S1, S3 |
| `-upnp` | space | value (bool) | UPnP port forwarding | Asks the router to open the server's ports automatically. Alias of `-enableupnp`. | Network | `-upnp True` | `True` / `False` | xml `EnableUPnP`, else `False` | optional | S1 |
| `-enableupnp` | space | value (bool) | UPnP port forwarding | Same as `-upnp` (the two names run the same code). | Network | `-enableupnp True` | `True` / `False` | `False` | optional | S1 |
| `-maxplayers` | space | value (int) | Max players | Number of player slots. The game clamps it to 1 to 16 (`MathHelper.Clamp(value, 1, NetConfig.MaxPlayers)`, MaxPlayers = 16). | Server | `-maxplayers 8` | 1 to 16 | xml `MaxPlayers`, else 10 in `StartServer` code; the xml property default is 8 | optional | S1, S4, S5 |
| `-playstyle` | space | value (enum) | Play style tag | Label shown in the server list so players know what to expect. Does not change gameplay rules. | Server | `-playstyle Casual` | `Serious`, `Casual`, `Roleplay`, `Rampage`, `SomethingDifferent` (enum names, case-sensitive in C# `Enum.TryParse`; numeric 0-4 also parse; an invalid value falls back to `Serious`, derived from code) | xml `playstyle`, property default `Casual` | optional | S1, S5 |
| `-banafterwrongpassword` | space | value (bool) | Ban after wrong password | If `True`, a player who enters the wrong password too many times is banned. Note: the code does NOT skip the value token (no `i++`), but because the value is not a recognised flag it is ignored harmlessly, so keep the value present. | Server | `-banafterwrongpassword True` | `True` / `False` | property default `True` (retries before ban: `MaxPasswordRetriesBeforeBan` = 3, an xml setting) | optional | S1, S5 |
| `-karma` | space | value (bool) | Karma system | Turns the karma system on (griefing players lose karma and can be auto-kicked/banned). Alias of `-karmaenabled`. | Server | `-karma True` | `True` / `False` | property default `False` | optional | S1, S5 |
| `-karmaenabled` | space | value (bool) | Karma system | Same as `-karma`; this is the spelling the game's own host menu uses. | Server | `-karmaenabled True` | `True` / `False` | `False` | optional | S1, S3 |
| `-karmapreset` | space | value | Karma preset | Which set of karma rules to use. Names come from `Data/karmasettings.xml`, lowercased for lookup. | Server | `-karmapreset strict` | `default`, `strict`, `custom` (the file has presets Default, Strict, Custom; `custom` also is the whole file's own values) | `default` | optional | S1, S5, S6 |
| `-language` | space | value | Server language | Language tag of the server shown in the browser. Only applied if it matches an entry in `Data/languageoptions.xml`; otherwise ignored. | Server | `-language English` | `Brazilian Portuguese`, `Chinese`, `Czech`, `Danish`, `Dutch`, `English`, `Finnish`, `French`, `German`, `Italian`, `Japanese`, `Korean`, `Norwegian`, `Polish`, `European Portuguese`, `Russian`, `Spanish`, `Swedish`, `Turkish`, `Ukrainian` | server setting `language` (default value UNVERIFIED) | optional | S1, S7 |
| `-ownerkey` | space | value (int) | Owner key | Used when the GAME hosts a server for its own player (in-game "Host server"). A random number the game generates so only that player is the owner. Its presence also stops the server from initializing Steam as a dedicated server, so do NOT use it for a normal dedicated server. | Advanced (do not use) | n/a | integer | none | NO (never) | S1, S3 |
| `-endpoint` | space | value | Owner endpoint | Counterpart of `-ownerkey` for in-game hosting (the owner's Steam/EOS peer address, or loopback). Not for dedicated servers. | Advanced (do not use) | n/a | endpoint string (P2P format, exact format UNVERIFIED) | none | NO | S1, S3 |
| `-pipes` | space, 2 values | value x2 | Pipes | Internal: links a child server process to the game that launched it. Handled in `Program.cs` before the game starts. Not for dedicated servers. | Advanced (do not use) | n/a | two pipe handle strings | none | NO | S1, S2 |
| `-lenienthandshake` | none | bool flag | Lenient handshake | Sets `NetConfig.UseLenientHandshake = true`. Passed by the game when it is itself set that way. Purpose is not documented in the places read. | Advanced (do not use) | `-lenienthandshake` | n/a | off | NO | S1, S3 |
| `-multiclienttestmode` | space | value | Multi-client test mode | Developer testing; only does anything in DEBUG builds. Consumes one value token. | Advanced (do not use) | n/a | n/a | off | NO | S1 |

## Arguments you asked about that were NOT found
- `-steamid`: no such argument in S1 (`StartServer()` switch) or S2. A search of the repo for "steamid" in the server `GameMain.cs` found nothing, and the string "-steamid" returned no code hits in a GitHub code search of the repo. Treat as not existing in the server (a Steam ID is only used internally for the in-game `-endpoint`). The original claim is UNVERIFIED as a real argument and likely wrong.
- `-pause`: no such argument in S1, S2 or S3 and a GitHub code search for `"-pause"` in the repo returned no hits. The only "pause" in server `GameMain.cs` is the in-game `GameMode.Paused` check. Treat as not existing.
- `-savepath`, `-config`, `-log`, `-datafolder` or similar: none exist in S1. Save location and config files cannot be moved by launch arguments.

## Related, not arguments (handy for the panel)
- Default ports: 27015 (game, UDP) and 27016 (query, UDP) (S4, S10 says UDP; protocol of query port also UDP per S10 wording "Steam query/server browser port", transport UNVERIFIED in S4).
- Start from the folder containing `DedicatedServer.exe` (the working directory matters because `serversettings.xml`, `clientpermissions.xml`, `Data/...` are relative paths) (S1, S5, S9).
- Minimal start line: `DedicatedServer.exe -name "My Server" -port 27015 -queryport 27016 -public False -maxplayers 8` (composed from the sourced flags above; a real-install run was not done by this research).
- Graceful stop: typing `exit`, `quit` or `close` into the server console sets `ShouldRun = false` and shuts down (S8). The game also registers a process-exit handler (`OnProcessExit -> ShutDown`, S2 region). Whether Ctrl+C triggers it is UNVERIFIED. Feeding a command to the console from the panel requires stdin to the process (UNVERIFIED that stdin piping works).
- Settings are mainly in `serversettings.xml` next to the exe (S5 `SettingsFile`, S9); the launch arguments only cover the handful above.

## Generic engine arguments
Barotrauma is a custom MonoGame/.NET game, not Unity/Unreal; no generic engine flags are processed by the server beyond the above. Dotnet host options are not documented here. None to list.

## UNVERIFIED
1. Which Steam build/version of the server `master` in the GitHub repo corresponds to (the repo master may be ahead of or behind the Steam release; the source was not matched against a specific build string).
2. Whether the pass-2 values (`-playstyle`, `-karma*`, `-banafterwrongpassword`, `-language`) are written back to `serversettings.xml` on save/exit.
3. The precise default for `-language` when not given, and the default of `IsPublic` in a freshly generated serversettings.xml (S5 property default says `true`, S1 code default says `false`; which wins on a fresh install is not confirmed).
4. Behaviour above the 60-character name limit.
5. The `-endpoint` string format and the purpose of `-lenienthandshake`.
6. Whether Ctrl+C or closing the console window shuts down cleanly with a save, and whether piping stdin works for `exit`.
7. Whether the query port needs UDP only (assumed UDP from S10 plus Steam convention; not stated in the game source).
8. The existence of any `-steamid` / `-pause` argument in older or newer builds (not in current master source; not in the official wiki).
9. No real install was run (per instructions), so none of the table behaviour is confirmed on a live server.

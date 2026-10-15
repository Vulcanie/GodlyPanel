# Necesse dedicated server - launch arguments (STEP: LAUNCH, conventions section C)

Store app 1169040, dedicated server tool app 1169370. Researched 2026-10-15. Read-only web research; no server installed or run.
Build note: no build number was available to me. The argument list below is the one on the official wiki page revisions
dated 23 Dec 2025 (French) and 10 Jan 2026 (English), and a developer post from May 2023. The server was not run, so
`-help` output of the current build is NOT confirmed first-hand (see UNVERIFIED).

Raw copies of the pages used are in `raw\` (steam-thread.txt, wiki-en.txt, wiki-fr.txt, modding.txt, linux.txt, Dockerfile).

## Sources (S1-S7)
- S1 Official wiki "Multiplayer", section "Server Parameters" (rev oldid=24618, last edited 10 Jan 2026): http://necessewiki.com/mediawiki/index.php?title=Multiplayer&oldid=24618 (live: https://necessewiki.com/Multiplayer). It states the parameters were taken from `necesse.engine.platforms.desktop.server.DesktopServerWrapper` in Necesse.jar, and "Parameters not given will be loaded from server settings file."
- S2 Steam forum, developer "Fair" posting the output of `-help` (15 May 2023): https://steamcommunity.com/app/1169040/discussions/0/6861841362669185924/
- S3 Official wiki "Multiplayer/fr" (last edited 23 Dec 2025), same parameter list as S1: https://necessewiki.com/Multiplayer/fr
- S4 Official wiki "Modding" (last edited 4 Feb 2026), section "Dedicated servers and local mods": https://necessewiki.com/Modding
- S5 Official wiki "Multiplayer-Linux" (oldid=25730): https://necessewiki.com/Multiplayer-Linux
- S6 Steam forum, developer "Fair" on StartServer.bat (31 Oct 2020): https://steamcommunity.com/app/1169040/discussions/0/2993165479009198682/
- S7 Community Docker image (BrammyS) Dockerfile ENTRYPOINT, a working real-world argument line: https://raw.githubusercontent.com/BrammyS/necesse-docker-server/main/Dockerfile
- S8 Secondary (hosting company, not authoritative): https://xgamingserver.com/docs/necesse/server-config (mentions only "the `-port` startup flag"); https://supercraft.host/wiki/necesse/server_setup/ (example line only).

## How the server is launched
- The server is a Java program: `Server.jar` in the install folder, with a bundled JRE in `jre\` (S6: `jre\bin\java -jar Server.jar -nogui`; S5 process list shows `./jre/bin/java -jar Server.jar -nogui -world`).
- Shipped launcher scripts: `StartServer.bat` (interactive wizard, S1), `StartServer-nogui.bat` (S1/S4 name it; S5 Linux has `StartServer-nogui.sh`).
- Default content of `StartServer-nogui.bat` as quoted by the wiki (S4): `start jre\bin\java.exe -jar Server.jar -nogui %*`. So extra arguments typed after the script name are passed through (`%*`). Note the leading `start`: that opens the server in a NEW window and the .bat itself returns immediately. A panel that tracks the process through the .bat will lose it. The panel should run `jre\bin\java.exe -jar Server.jar -nogui ...` directly, or its own .bat without `start`. (The `start` behaviour is inferred from the quoted line; the actual file was not read, see UNVERIFIED.)
- Minimal non-interactive start (S5, Linux form, same arguments on Windows): `... -nogui -world <SaveName>`. Without `-world` the server asks questions on the console (world name, custom options y/n, port, slots, password, spawn island, spawn seed, guide house; S1). With `-world` given, S5 says "To start the server with no interaction, use the -world [Save name] Argument."
- Working real-world full line (S7, Docker, bundled JRE removed so java from PATH):
  `java ${JVMARGS} -jar Server.jar -nogui -localdir -world "${WORLD}" -slots "${SLOTS}" -owner "${OWNER}" -motd "${MOTD}" -password "${PASSWORD}" -pausewhenempty "${PAUSE}" -giveclientspower "${GIVE_CLIENTS_POWER}" -logging "${LOGGING}" -zipsaves "${ZIP}"` (image defaults there: WORLD=world, SLOTS=10, PAUSE=0, GIVE_CLIENTS_POWER=1, LOGGING=1, ZIP=1). Flags are written as separate words (space-separated value), values quoted.

## Argument table
Value form: all arguments are `-flag value` (space-separated, one dash). Bool-style ones take an explicit `1` or `0` (not a bare flag). `-nogui` and `-localdir` and `-ignoreseasons` are bare flags with no value. Descriptions in the "Wiki text" part are the official wording (S1/S2); the plain-language label/description is mine, derived from it.
Group = Server / Network / Saves and logs / Performance / Advanced.

| flag | form | kind | label | description (plain language) | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-nogui` | bare flag | bool flag | Run without window | Runs the server as a text console instead of opening the server's own graphical window. Required for a panel/background server. Wiki: "Runs the server in terminal instead of opening the GUI". | Server | `-nogui` | none | off (GUI opens without it) | YES, always on | S1, S2, S6 |
| `-world <name>` | space | value | World name | Which save to load. If the world does not exist it is created. Without this the server stops and asks on the console. Wiki: "World to load instead of being asked which to load". | Server | `-world MyWorld` | a world (save) name; characters allowed UNVERIFIED | none (asks) | YES (save/world name) | S1, S2 |
| `-port <port>` | space | value | Game port | UDP port players connect to. Wiki: "Port to host at". | Network | `-port 14159` | a port number | 14159 (UDP, S1 "Port Forwarding"; xgamingserver also lists `port` default 14159) | YES (port) | S1, S2, S8 |
| `-ip <address>` | space | value | Bind address | Makes the server listen only on one IP address of this PC (useful if the PC has several). Wiki: "Binds the server IP to the address". | Network | `-ip 192.168.1.20` | an IP address | not set (all addresses; presumed, UNVERIFIED) | no (advanced, leave unset) | S1, S2 |
| `-slots <slots>` | space | value | Player slots | Maximum players at once. Wiki: "Amount of player slots". The interactive wizard accepts "a number between 1 and 250" (S1). | Server | `-slots 10` | 1 to 250 (wizard text, S1); whether the argument enforces the same range UNVERIFIED | server setting file value; Docker image uses 10 (S7) | possible (max players) | S1, S2 |
| `-owner <name>` | space | value | Owner player name | Anyone who joins using exactly this player name gets owner (full) permissions. It is a player NAME, not a Steam ID. Anyone able to join with that name gets owner rights, so use a password. Wiki: "Anyone that connects with this name, will get owner permissions". Permissions can also be assigned by `/permissions set <name> <permission>` (S1). | Server | `-owner Vulcan` | a player name | none | possible (admin name) | S1, S2 |
| `-password <password>` | space | value | Server password | Password players must enter. Blank means no password. Wiki: "The password for the server, blank for no password". Also changeable at runtime with the Owner command `/password [<password>]` (S1). | Server | `-password secret` | any text; blank = none | none/blank | YES (server password) | S1, S2 |
| `-motd <message>` | space | value | Message of the day | Message shown to players. Use `\n` for a new line. Also settable with admin command `/motd` (S1). | Server | `-motd "Welcome!"` | text; `\n` = line break | none | no | S1, S2 |
| `-pausewhenempty <1/0>` | space | value (bool 1/0) | Pause when empty | When 1, the world is paused while nobody is online (saves CPU, world time stands still). Wiki: "defaults 0". Also runtime command `/pausewhenempty <0/1>` (Admin). | Performance | `-pausewhenempty 1` | 1 or 0 | 0 per the help text (S2); xgamingserver lists server.cfg `pauseWhenEmpty` default true, which conflicts, UNVERIFIED which is right | no | S1, S2, S8 |
| `-giveclientspower <1/0>` | space | value (bool 1/0) | Trust clients (smoother play, no anti-cheat) | Help text: "If the server should check client actions, a kind of anti-cheat. When off it will give a much smoother experience for clients. Defaults off." Wording is confusing: the flag name suggests 1 = clients get more power / are trusted; exact meaning of 1 vs 0 not confirmed. The Docker image sets 1 by default (S7). | Advanced | `-giveclientspower 0` | 1 or 0 | off (S2) | no | S1, S2, S7 |
| `-logging <1/0>` | space | value (bool 1/0) | Write log files | If on, the server writes a log file for each session. Wiki: "defaults 1". | Saves and logs | `-logging 1` | 1 or 0 | 1 | no | S1, S2 |
| `-logs <folder>` | space | value | Log folder | Folder to place the logs in, if logging is on. Wiki: "What folder to place the logs, if logging is enabled". Listed in the English wiki (S1, 2026) and French wiki; NOT in the 2023 `-help` output (S2), so it was added later. | Saves and logs | `-logs C:\necesse\logs` | folder path | the logs folder inside the data directory (see `-datadir`; S1 "File Locations") | no | S1, S3 |
| `-zipsaves <1/0>` | space | value (bool 1/0) | Compress saves | If 1, each world is stored as a single `.zip` file (default); if 0, as a plain folder, easier to inspect by hand but more files. Wiki: "If saves should be compressed, defaults to 1". | Saves and logs | `-zipsaves 1` | 1 or 0 | 1 | no | S1, S2 |
| `-settings <file>` | space | value | Settings file | Path of the file the server settings (`server.cfg`) are read from. Arguments given on the command line take priority; "Parameters not given will be loaded from server settings file". | Advanced | `-settings C:\necesse\server.cfg` | file path | the `server.cfg` in the data directory (S1: `...\Necesse\cfg\server.cfg`) | possibly (config path) | S1, S2 |
| `-language <language>` | space | value | Server language | Language of the server, "only used for occasional messages in log". Also runtime command `/language <language>` (Server). | Advanced | `-language English` | language names/codes accepted UNVERIFIED | UNVERIFIED (not stated) | no | S1, S2 |
| `-datadir <path>` | space | value | Data folder | Where the server keeps its cache, latest log, saves and config. Wiki: "Sets the path where cache, latest log, saves etc. are stored. Defaults to Necesse folder in appdata on different platforms". Default on Windows `%APPDATA%\Necesse` (S1: `C:\Users\<user>\AppData\Roaming\Necesse`, with `cfg\server.cfg`, `saves\<World>.zip`, `logs`); Linux `~/.config/Necesse`. Only in the 2026 wiki, not the 2023 help output. | Saves and logs | `-datadir .\data` | folder path | `%APPDATA%\Necesse` | YES (save path, makes each panel server self-contained) | S1, S3, S4, S5 |
| `-localdir` | bare flag | bool flag | Keep data in server folder | Same as `-datadir` but uses the folder the server is launched from, so settings, logs and saves sit next to the server instead of in the user profile. Dev: "make the game load settings/saves from the directory you are launching from". Caveat: it is the current/working directory at launch, not necessarily the folder of Server.jar (UNVERIFIED which; S1 says "local directory the server is launched from"). | Saves and logs | `-localdir` | none | off | YES (alternative to `-datadir`) | S1, S2, S5, S7 |
| `-mod <folder>` | space | value | Mods folder | Loads mod `.jar` files from this folder. Dedicated-server mod recipe (S4): create a `mods` folder in the server install and use `-datadir .\data -mod .\mods`. Documented on the Modding page, NOT in the Multiplayer parameter list. Without `-mod`, mods are found in `<data dir>\mods` (S4: Windows `%APPDATA%/Necesse/mods/`). | Advanced | `-mod .\mods` | folder path | not set (data dir `mods` folder used) | maybe (mods) | S4 |
| `-ignoreseasons` | bare flag | bool flag | Disable seasonal content | Disables seasonal content, e.g. Christmas Present and Christmas Hat. Wiki: "Disables seasonal content, e.g. Christmas Present, Christmas Hat, etc." | Advanced | `-ignoreseasons` | none | off | no | S1 |
| `-help` | bare flag | bool flag | Show help | Prints the list of arguments and exits (presumably). Wiki: "Shows this help menu". Do not use in a panel start script. | Advanced | `-help` | none | off | no | S1, S2 |

Not arguments of the game but important in the same command: `JVMARGS` (S7 uses `java ${JVMARGS} -jar Server.jar ...`). Any standard Java option such as `-Xmx2G` / `-Xms1G` goes BEFORE `-jar Server.jar`. Java option names are generic JVM options and were not separately sourced here for Necesse; no official Necesse RAM figure was found (candidates.md quotes ~1-2 GB from an unofficial source; S5 shows `Memory: 1.0G` for a running example).

## First-creation vs every-start
- `-world` creates the world if it does not exist (S1 wizard: you "name the world"). Spawn island, spawn seed and "guide house" are asked only in the interactive wizard (S1); no command-line argument for them appears in any list (S1/S2/S3). They are therefore UNVERIFIED as arguments. Per xgamingserver, `worldSeed` is a `server.cfg` key that "applies only at world creation" (S8, secondary).
- All other arguments are read on every start; per S1 anything not given on the command line falls back to the saved `server.cfg`.

## Graceful stop (relevant to launch)
- Console command `quit` / `stop` / `exit` saves and stops (S1 command table: "/stop, /exit or /quit - Owner - Saves and stops the server"; S1 "Running the server": type "quit").
- S5: "the dedicated server does not save on SIGTERM, which is what docker stop sends." A panel should send the console `stop` through stdin rather than killing the process. Whether closing a Windows console window saves is not stated (S1 says you can click the X; save behaviour of that UNVERIFIED).

## Generic / engine arguments
Necesse is a Java app with its own engine; no generic engine arguments (Unity/Unreal style) apply. The only generic ones are Java ones (`-Xmx`, `-Xms`, before `-jar`), see JVMARGS note above.
Safe/useful for a panel: `-nogui`, `-world`, `-port`, `-slots`, `-password`, `-owner`, `-motd`, `-pausewhenempty`, `-zipsaves`, `-logging`, `-datadir` or `-localdir`, `-mod`.

## Suggested panel start line (assembled from the above, not run)
`jre\bin\java.exe -Xmx2G -jar Server.jar -nogui -datadir .\data -world "<name>" -port 14159 -slots 10 -password "<pw>" -pausewhenempty 1`
Run it from the server install folder (so `jre\` and `Server.jar` resolve). Do not use the shipped `start ...` bat as the tracked process (it opens a separate window). Process to match: `java.exe` (the bundled `jre\bin\java.exe`), so the panel needs to match on the command line (`Server.jar`) rather than the exe name. Both points follow from the quoted bat line and the Java launch; none was observed on a live install.

## UNVERIFIED (count: 11)
1. The actual current `-help` output of the installed build; the list is from the wiki (Dec 2025/Jan 2026) and a 2023 developer post.
2. Exact contents of the shipped `StartServer.bat` / `StartServer-nogui.bat` (the `start ... %*` line is quoted from a wiki page, S4, as the "default"; the 2020 post S6 shows `jre\bin\java -jar Server.jar -nogui` without `start`).
3. Allowed characters and length of `-world` names, and what happens with a name that already exists as zip vs folder.
4. Whether the `-slots` argument is limited to 1-250 like the wizard.
5. Real meaning of `-giveclientspower 1` versus `0` (help text is ambiguous; Docker image defaults to 1; xgamingserver says `giveClientsPower` default true while the help says "Defaults off").
6. `-pausewhenempty` default: help says 0; xgamingserver's server.cfg table says `pauseWhenEmpty` true.
7. Accepted values for `-language` and its default.
8. Default of `-ip` (assumed all interfaces) and `-settings` default path when `-datadir`/`-localdir` is used.
9. Whether `-localdir` uses the working directory or the Server.jar folder.
10. Whether spawn island, seed and guide-house have any command-line argument (none documented).
11. Whether closing the console window (rather than typing `quit`) saves the world, and any recommended JVM memory options.

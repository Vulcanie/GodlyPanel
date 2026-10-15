# Necesse: server basics (store app 1169040, dedicated server tool app 1169370)

Researched 2026-10-15 (read-only web research; nothing installed or run). Facts are for the current public build: Steam public branch buildid 24926481 (api.steamcmd.net) / v1.3.3 build 24926468 on necessegame.com (the two numbers differ slightly; both are "v1.3.3 era", Aug 2026 per branch timestamp 1787655797).
Source tags used below:
- [WIKI] https://necessewiki.com/Multiplayer (official community wiki, the best source; its parameter list is said to come from `DesktopServerWrapper.class` inside `Necesse.jar`)
- [WIKI-LINUX] https://necessewiki.com/Multiplayer-Linux
- [STEAMCMD-API] https://api.steamcmd.net/v1/info/1169370 (Steam's own app metadata, mirrored)
- [IONOS] https://www.ionos.com/digitalguide/server/know-how/necesse-dedicated-server
- [SITE] https://necessegame.com/server/ (official game site download page)
- [DOCKER-B] https://github.com/BrammyS/necesse-docker-server (README)
- [WIKI-EDIT] https://necessewiki.com/Special:AbuseLog/91 (an anonymous wiki edit that the wiki's spam filter blocked; the text is not accepted wiki content, so treat as weak)

## SteamCMD
- Dedicated server is a separate free Tool app, id **1169370**, "Necesse Dedicated Server", parent app 1169040, OS list windows,macos,linux. [STEAMCMD-API]
- Anonymous login works. Official wiki sequence: `login anonymous`, `force_install_dir C:\Necesse`, `app_update 1169370 validate`, `quit`; success text "Success! App '1169370' fully installed." [WIKI] (same sequence in [IONOS]; Linux script form with `login anonymous` and `app_update 1169370 validate` in [WIKI-LINUX]).
- One-line form (assembled from those same commands, not quoted from a source): `steamcmd +force_install_dir <dir> +login anonymous +app_update 1169370 validate +quit`. Several guides' one-liner form: `steamcmd +force_install_dir ~/necesse-server +login anonymous +app_update 1169370 validate +quit` (search summary of https://www.ionos.com/digitalguide/server/know-how/necesse-dedicated-server.md and supercraft.host; not independently opened).
- Do NOT use 1169040 as the update app id (that is the game client; some third-party guides list it by typo). [STEAMCMD-API shows 1169040 only as "parent"]
- Alternatives: install "Necesse Dedicated Server" from the Steam library under Tools, or download from necessegame.com/server/. [WIKI] Direct downloads for Windows64, MacOS, Linux64 exist (time-limited signed links). [SITE]
- Download size: Windows depot 1169373 (64-bit) 72,705,888 bytes download / 180,061,550 bytes on disk; 32-bit depot 1169372 148,787,896 on disk; also depot 1004 (Windows, `depotfromapp 1007`) ~67.9 MB on disk. [STEAMCMD-API] So roughly 180 MB to 330 MB installed (what depot 1004 and 1169372 are and whether they install together on Windows: UNVERIFIED).

## Install layout
- Steam installdir name: `Necesse Dedicated Server` (so default Steam path is `...\steamapps\common\Necesse Dedicated Server\`). [STEAMCMD-API]
- Launch entries are relative to the install root and show the root contains `Server.jar` and a bundled `jre\` folder: `jre\bin\javaw.exe -jar Server.jar`, and `jre\bin\java.exe -jar Server.jar -nogui` ("Launch server from terminal"). [STEAMCMD-API]
- The install root also holds `StartServer.bat` (interactive prompts) and `StartServer-nogui.bat`. [WIKI][IONOS] (Linux names: `StartServer-nogui.sh`. [WIKI-LINUX])
- Java is bundled, nothing to install separately (the bundled `jre` is what Steam launches). [STEAMCMD-API]; the Docker repo removes the bundled JRE and uses OpenJDK 17 instead (https://github.com/BrammyS/necesse-docker-server Dockerfile summary), which tells us Java 17 runs it; the exact JRE version bundled in the Windows depot: UNVERIFIED.

## Executable / process names
- Exact commands Steam ships for Windows (`config.launch`): [STEAMCMD-API]
  - `jre\bin\javaw.exe -jar Server.jar` (GUI mode, no console)
  - `jre\bin\java.exe -jar Server.jar -nogui` (terminal mode, console window/stdin)
- Default `StartServer.bat` line is `start jre\bin\javaw.exe -jar Server.jar %*` [WIKI-EDIT, weak]. Consistent with the Steam launch entry above.
- So the running process is **`java.exe` or `javaw.exe` located in the install's own `jre\bin\`**; there is no Necesse-named exe. Image name `java.exe`/`javaw.exe` is shared with any other Java program on the PC; match by full path (`<install>\jre\bin\java.exe`) or by PID, never by image name.
- A wiki edit says: with `-nogui` AND `-world` through the default bat (which uses `start ... javaw.exe`), the server runs windowless in the background and can only be stopped from Task Manager ("OpenJDK Platform binary"). [WIKI-EDIT, weak but consistent with javaw having no console]. A panel should launch `jre\bin\java.exe -jar Server.jar -nogui -world "<name>" ...` directly (the second Steam launch entry) so it owns stdin/stdout.
- The wiki states `-nogui` removes GUI "real-time server stats". [WIKI-EDIT/search summary of necessewiki.com Multiplayer; weak]

## Ports
- Game: **14159, UDP**. Exact wiki wording: "The protocol and default port for Necesse is UDP and port 14159." [WIKI]
- IONOS says "TCP and UDP port 14159" and tells you to create firewall rules for both. [IONOS] This conflicts with the wiki and supercraft (UDP only). Treat UDP as the real need; opening TCP too is harmless. Whether the server also listens on TCP: UNVERIFIED.
- Change with `-port <port>` or `port` in server.cfg. [WIKI] (`-port` listed; the key spelling in server.cfg is covered by the config step.)
- No separate query port, RCON port or web port found in any source. Players join by direct IP:port ("Multiplayer" > "Direct join" in game). [IONOS][WIKI]
- Windows Firewall inbound rule and router port forwarding required for outside players; no UPnP mentioned. [WIKI]
- Two servers on one PC need different `-port` values.

## Minimal start command
Documented parameters (all optional; ones not given are read from the server settings file; `-help` prints the list). [WIKI]
- `-help`, `-nogui`, `-settings <file>`, `-world <name>`, `-port <port>`, `-slots <slots>`, `-owner <name>`, `-motd <message>` (use `\n` for newline), `-password <password>` (blank = none), `-pausewhenempty <1/0>` (default 0), `-giveclientspower <1/0>` (default off), `-logging <1/0>` (default 1), `-logs <folder>`, `-zipsaves <1/0>` (default 1), `-language <language>`, `-ip <address>`, `-datadir <path>` (where cache, logs and saves are stored), `-localdir` (same as `-datadir` but uses the launch directory), `-ignoreseasons`.
- Docker README mirrors the same set as env vars (WORLD default `world`, SLOTS default `10`, OWNER, MOTD, PASSWORD, GIVE_CLIENTS_POWER default `1`, PAUSE default `0`, LOGGING `1`, ZIP `1`, JVMARGS). [DOCKER-B] Note the Docker image defaults GIVE_CLIENTS_POWER to 1 whereas the wiki says the game default is off; the wiki is the better authority for the game. Which is right: UNVERIFIED.
- Without `-world`, the launcher asks questions at every start: world name; custom options (y/n); port (14159); slots (1 to 250); password; custom spawn island `x,y`; spawn seed; spawn guide house (y/n); then Enter. [WIKI] `-world <name>` skips the prompts. [WIKI][WIKI-LINUX]
- Minimal panel command (from the Steam launch entry + documented flags): 
  `jre\bin\java.exe -jar Server.jar -nogui -world "MyWorld"` run with working directory = install root. Typical additions: `-port 14159 -slots 10 -password <pw> -owner <name> -localdir` (or `-datadir <dir>`).
- Whether `-nogui` plus `-world` suppresses ALL prompts (for example the "custom server options" question) on a brand-new world: UNVERIFIED (wiki says "-world argument skips the prompts"). [WIKI-LINUX]
- JVM memory flags are not set by the shipped command, so default JVM heap rules apply. A hosting blog uses `-Xmx2G -Xms1G` in its sample (https://www.valebyte.com/en/blog/your-necesse-server-installation-and-configuration-on-vpsdedicated/ via search summary; unofficial, not opened). `JVMARGS` exists in the Docker image for the same purpose. [DOCKER-B]

## First run and saves
- Default data folder (Windows): `C:\Users\<name>\AppData\Roaming\Necesse\` containing `cfg\server.cfg`, `saves\`, `logs\`. [WIKI][IONOS]
- A world is saved as a **zip named after the world** in `saves\` (`saves\<WorldName>.zip`); its world settings file `worldSettings.cfg` is inside the zip (extract, edit, re-zip; stop the server first). [WIKI] IONOS says `worldSettings.cfg` appears in `saves` once the server is fully running. [IONOS]
- `-localdir` (launch folder) or `-datadir <path>` moves these away from the user profile. [WIKI] The wiki says "To keep configs in the game directory, use -localdir". Exactly which subfolders (cfg, saves, logs, mods) follow `-datadir` / `-localdir`: UNVERIFIED (wiki says "cache, logs, and saves" for `-datadir` and configs for `-localdir`).
- Linux equivalent: `~/.config/Necesse/{cfg,saves,logs}`. [WIKI-LINUX]
- Server config file `server.cfg` is written/updated by the server; third-party guide: "Necesse overwrites the file on shutdown", so edit only while stopped (https://xgamingserver.com/docs/necesse/server-config, unofficial; that page also gives a different path/keys that disagree with the official wiki, so ignore its paths). The wiki also says to stop the server before editing any config. [WIKI]
- Whether server.cfg is created on first run vs created only after the prompts: UNVERIFIED.
- Mods (Steam Workshop jars) go under the config folder `Necesse\mods` per a Docker guide (https://gamepretty.com/necesse-dedicated-server-in-docker/ summary); details belong to the mods step, not verified here.

## Graceful stop
- Official: "type `quit` in the server window and press Enter, or click the X in the window's top-right corner. Owners can also use /stop, /exit, or /quit in game or the console. Stopping saves the world." [WIKI]
- `/save` (Moderator permission or higher) saves all data without stopping. [WIKI]
- Dangerous: the Linux wiki warns the server does **not save on SIGTERM** (what `docker stop` sends); send the console stop command and wait for the save. [WIKI-LINUX]. Windows Ctrl+C / `taskkill` (no /F) behaviour: UNVERIFIED; assume it does not save.
- Panel plan (derived, not source-stated): launch `java.exe ... -nogui` with a piped stdin, send `quit\n` (or `/save` then `quit`), wait for the process to exit, only then force-kill after a generous timeout. This depends on stdin console input working when started with a pipe: UNVERIFIED.

## Query protocol
- None found. No source mentions Steam A2S, RCON, REST or any status port for Necesse. GameDig's supported/unsupported list has no Necesse entry (https://github.com/gamedig/node-gamedig/blob/master/GAMES_LIST.md).
- Therefore player count has to come from the console: `/players` and `/playernames` (Moderator) exist in the console. [WIKI] Their exact output format: UNVERIFIED. Alternatively parse the session log in `logs\`. The log line format: UNVERIFIED.
- The panel could at most check that the UDP port is bound/process alive.

## Resources
- IONOS minimum: 2.8 GHz (2 cores), 2-3 GB RAM. [IONOS] (hosting-guide figures, unofficial).
- Docker/VPS blog guidance: 2 GB for 4-8 players, 4 GB for 8-16, 8 GB+ for 16-32 (https://www.valebyte.com/en/blog/your-necesse-server-installation-and-configuration-on-vpsdedicated/ via search summary; unofficial).
- Disk: ~180 MB install plus world zips. [STEAMCMD-API]
- Slots range 1 to 250. [WIKI]
- Real measured memory of a running server: UNVERIFIED (no source measured it).

## Windows pitfalls
- Firewall: allow inbound for the Java executable / the UDP port; check the Windows Firewall prompt when `java.exe` first listens. [WIKI] (rule advice); the prompt appearing for the bundled jre: UNVERIFIED.
- Saves live in the user's `AppData\Roaming` by default, so a service account or a different Windows user gets a different save location. [WIKI] Use `-datadir`/`-localdir` to keep each server's data inside its folder (see UNVERIFIED about what follows them).
- Default `StartServer.bat` uses `start ... javaw.exe`, which detaches and has no console. Do not wrap that bat for process tracking; launch `java.exe` directly. [STEAMCMD-API][WIKI-EDIT]
- Do not edit config files or world zips while running. [WIKI]
- Port conflict when two servers use 14159.

## Updates
- Re-run `app_update 1169370 validate` through SteamCMD. [WIKI][IONOS][WIKI-LINUX]
- Older versions are kept as Steam beta branches named like `v1.3.2` back to `v0.27.0`; `public` is current. [STEAMCMD-API] (`-beta v1.3.2` is the standard SteamCMD syntax; not documented by Necesse itself.)
- Clients and server need the same game version (not stated explicitly by any opened source): UNVERIFIED. Mod and world compatibility across updates: UNVERIFIED.

## Panel must NOT
- Must not kill by image name `java.exe` / `javaw.exe` (shared by anything Java; also the user's other Necesse servers). Track PID and full path under the install's `jre\bin`.
- Must not stop by SIGTERM/forced kill/closing the pipe first; it may not save. Send `quit` and wait. [WIKI][WIKI-LINUX]
- Must not edit `server.cfg` or `worldSettings.cfg` in the zip while running; the server rewrites the config on shutdown. [WIKI]
- Must not use `StartServer.bat` for a managed start (prompts, detached javaw).
- Must not assume a query port exists.
- Must not use app id 1169040 for the server install.

## UNVERIFIED
1. Whether the server also listens on TCP 14159 (IONOS says TCP+UDP, wiki says UDP only).
2. What Windows depots 1004 (`depotfromapp 1007`) and 1169372 (32-bit) contain and the true installed size on Windows (180 MB for the 64-bit depot is confirmed; total not).
3. Bundled JRE version in the Windows depot.
4. Whether `-nogui -world X` fully skips every prompt for a brand-new world (the "custom server options" question).
5. Which folders `-datadir` and `-localdir` actually relocate (cfg, saves, logs, mods, cache) and whether `server.cfg` follows them.
6. Whether `server.cfg` is created on first run and with what content (config step).
7. Windows Ctrl+C/`taskkill` (graceful) behaviour and whether it saves; only SIGTERM on Linux is documented as not saving.
8. That `quit` on piped stdin works the same as typing in a console window.
9. Output format of `/players`, `/playernames` and log lines, for player counting.
10. Default of `giveClientsPower`: wiki says off, Docker README says `1`.
11. Real RAM/CPU usage of a running server (only third-party estimates exist).
12. Whether clients and server must match versions exactly, and mod handling across updates.
13. Exact build number: Steam public buildid 24926481 vs necessegame.com 24926468.
14. Whether the Windows Firewall prompt fires for the bundled `jre\bin\java.exe`.
15. The WIKI-EDIT claims (default bat line, "OpenJDK Platform binary" in Task Manager) come from a blocked anonymous wiki edit and are weak; the Steam launch entries are the firm basis.

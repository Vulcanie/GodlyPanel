# Terraria / tModLoader dedicated server: launch arguments (STEP-launch)

Researched 2026-10-15. Read-only web research; nothing installed or run. Raw source copies are in `.\src\` (wiki clone, tML patch files, serverconfig.txt, start scripts).

Build the facts are for
- tModLoader (Steam app 1281930), Steam `public` branch buildid 25640906 (api.steamcmd.net, S1). tML source read: GitHub tModLoader/tModLoader, default branch 1.4.5, commit fdcf523 dated 2026-10-14 (S2), tML wiki clone dated 2026-10-09 (S3).
- Vanilla Terraria server docs: terraria.wiki.gg, "current Desktop version is 1.4.5.8" (S4).

## Sources
- S1 https://api.steamcmd.net/v1/info/1281930
- S2 https://github.com/tModLoader/tModLoader (files under patches/tModLoader/..., read from a sparse clone). Specific files:
  - S2a `patches/tModLoader/Terraria/Initializers/LaunchInitializer.cs.patch` (argument parsing; unchanged vanilla lines appear as context)
  - S2b `patches/tModLoader/Terraria/release_extras/start-tModLoaderServer.sh` and `.bat`
  - S2c `patches/tModLoader/Terraria/release_extras/serverconfig.txt` (shipped example config, lists the command line params)
  - S2d `patches/tModLoader/Terraria/Main.cs.patch` (the line that spawns a server from the client menu; modpath= / modpack= keys of the config file)
  - S2e `patches/tModLoader/Terraria/Program.TML.cs`, `Program.cs.patch`, `Social/SocialAPI.cs.patch`, `Social/Steam/WorkshopHelper.TML.cs`, `ModLoader/Engine/InstallVerifier.cs`
  - S2f `patches/tModLoader/Terraria/release_extras/DedicatedServerUtils/manage-tModLoaderServer.sh`, `README.md`, `docker-compose.yml`
  - S2g `patches/tModLoader/Terraria/release_extras/LaunchUtils/ScriptCaller.sh`
- S3 https://github.com/tModLoader/tModLoader/wiki/Command-Line and https://github.com/tModLoader/tModLoader/wiki/Starting-a-modded-server (the latter says it is "outdated for 1.4.4 dedicated servers" and points at DedicatedServerUtils; its headless-start section is still consistent with the scripts)
- S4 https://terraria.wiki.gg/wiki/Command-line_parameters and https://terraria.wiki.gg/wiki/Server (vanilla flags; page itself says "There may be inaccuracies")
- S5 https://xgamingserver.com/configs/terraria (third-party; only used for the `worldrollbackstokeep` config key)

## How the tModLoader server is started (verified in the shipped scripts)
- tML has no separate server exe. The server is the same `tModLoader.dll` started with `-server` (S2e `Program.TML.cs`: `isServer = LaunchParameters.ContainsKey("-server")`). The shipped `start-tModLoaderServer.bat` only runs `LaunchUtils/busybox-sh.bat ./start-tModLoaderServer.sh %*`, and the `.sh` ends in `ScriptCaller.sh`, which runs `"$dotnet_dir/dotnet" tModLoader.dll "$@"` (a local `dotnet` / `dotnet.exe` under `<install>/dotnet`) or, if there is none, the system `dotnet tModLoader.dll` (S2b, S2g). So the OS process the panel sees is most likely `dotnet.exe` (UNVERIFIED on a real Windows install, see list).
- The shipped `.sh` script builds the command as: `-server`, then every argument you pass, except that `-steam` and `-nosteam` are swallowed by the script (they set a yes/no); then adds `-config serverconfig.txt` if no `-config` text is present; if Steam is on, adds `-steam` and, if there is no `-lobby`, asks interactively for the lobby type; if neither `-steam` nor `-nosteam` was given it ASKS ("Use steam server (y/n)") and waits for input (S2b). **A panel start script must therefore pass `-nosteam` (or `-steam -lobby ...`) or the server stalls on a prompt.**
- Without a world given (`-world` or `world=`), the server asks interactively which world, then max players, port, port forwarding and password (S3 Starting-a-modded-server, "Starting server headless"). Config/CLI values for max players/port/etc. are ignored unless a world is specified (S2c header comment: "unless a world is specified, some settings like max player count, port, and port forwarding will be ignored").
- The official Linux management script launches: `ScriptCaller.sh -server -config "$folder/serverconfig.txt" -steamworkshopfolder "$folder/steamapps/workshop" -tmlsavedirectory "$folder" $start_args` (S2f). Good model for the panel's own command line.
- Value form: every example in the sources uses a SPACE between flag and value (`-config serverconfig.txt`, `-world "C:\...\MyWorld.wld"`, `-lobby friends`). No source shows `=` form on the command line. The `key=value` form is for config files only (S2c, S3). How the argument parser (`Utils.ParseArguements`) splits tokens is in the decompiled vanilla code that is not in the tML repo, so the exact rule is UNVERIFIED; quoting values that contain spaces is shown in S3 (`-world "C:\Documents\My Games\..."`).
- Extra file: `cli-argsConfig.txt` in the install dir, "the contained command line parameters will be loaded as if they were used normally" (S3 Command-Line). Not needed by the panel.

## Table. Vanilla Terraria server flags (also valid in tModLoader)
Group names: Server / Network / Saves and logs / Performance / Advanced. "Panel" = recommended panel handling.

| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-config` | space | value | Config file | The text file with the server settings (port, players, world, password ...). tML's start script adds `-config serverconfig.txt` if you gave none. | Server | `-config serverconfig.txt` | path to a text file of `key=value` lines | `serverconfig.txt` (set by the tML script only) | Yes (the panel points it at the file it writes) | S4, S2b, S2c |
| `-port` | space | value | Port | Port the server listens on (TCP). Friends join with this number. | Network | `-port 7777` | number | 7777 (TCP) | Yes | S4 ("Port: TCP 7777"), S2c; also short alias `-p` (S2a: `TryParameter("-p", "-port")`) |
| `-players` (alias `-maxplayers`) | space | value | Max players | How many people can be on the server at once. | Server | `-players 8` | number; config file says "between 1 and 255" | 16 per S4 (8 before 1.4.0.1); S2c example uses 8, and the tML wiki page says default 8; sources DISAGREE, UNVERIFIED which applies to tML | Yes | S4, S2c, S2a (`TryParameter("-maxplayers", "-players")`), S3 |
| `-pass` (alias `-password`) | space | value | Server password | Password players must type to join. Leave off for an open server. | Server | `-pass <password>` (use a placeholder) | any text, no space-safe quoting documented | none | Yes | S4, S2a (`TryParameter("-pass", "-password")` in client section, server section shares the aliases in the wiki), S2c |
| `-motd` | space | value | Message of the day | Welcome text shown to players when they join. | Server | `-motd "Welcome!"` | text | none stated | optional | S4, S2a (`TryParameter("-motd")`) |
| `-world` | space | value | World file | Full path of the `.wld` world to load; starts the server straight away with no menu. Must be the `.wld`, not the `.twld`. | Saves and logs | `-world "C:\path\MyWorld.wld"` | path to `.wld` | none (server asks) | Yes | S4, S3 ("it must be .wld and not .twld") |
| `-autocreate` | space | value | Create world if missing | If the file given by `-world` does not exist, makes a new world of this size. | Saves and logs (first creation only) | `-autocreate 2` | 1 small, 2 medium, 3 large | none | Yes (first creation only) | S4, S2c |
| `-worldname` | space | value | World name | Name of the world, used only when `-autocreate` makes one. | Saves and logs (first creation only) | `-worldname MyWorld` | text | `Terraria` per the S2c example comment only (UNVERIFIED as a true default) | Yes (first creation only) | S4, S2a (`TryParameter("-worldname")`), S2c |
| `-seed` | space | value | World seed | Seed text for the new world, only with `-autocreate`. | Saves and logs (first creation only) | `-seed AwesomeSeed` | text | random (UNVERIFIED) | optional | S4, S2c |
| `-banlist` | space | value | Ban list file | File holding the banned players. | Saves and logs | `-banlist banlist.txt` | path | `banlist.txt` in the working directory | optional | S4, S2c, S2a (`TryParameter("-banlist")`) |
| `-worldrollbackstokeep` | space | value | Rolling world backups to keep | How many automatic rolling backup copies of the world to keep. Exists as a real server argument: tML's own menu starts its hidden server with `-worldrollbackstokeep <WorldRollingBackupsCountToKeep>`, and that field defaults to 2. NOT listed on the Terraria wiki or in S2c. The same setting appears as a config-file line `worldrollbackstokeep=2` (commented out, sample "Sets the number of rolling world backups to keep") on a third-party page only. | Saves and logs | `-worldrollbackstokeep 2` | number | 2 (the client-side field default, S2d) | optional | S2d (`Main.cs.patch` line `text = text + " -worldrollbackstokeep " + WorldRollingBackupsCountToKeep;` and `public static int WorldRollingBackupsCountToKeep = 2;`), S5 |
| `-ip` | space | value | Listen IP address | Makes the server listen only on this local IP address (for machines with several network addresses). | Network | `-ip 192.168.1.10` | IPv4 address | all addresses (not stated, UNVERIFIED) | optional | S4 |
| `-secure` | none | bool flag | Anti-cheat protection | "Adds additional cheat protection to the server." | Advanced | `-secure` | none | off | optional | S4, S2c |
| `-noupnp` | none | bool flag | Disable auto port forwarding | Turns off the automatic UPnP port-forwarding attempt. Useful on a PC that you port-forward by hand. | Network | `-noupnp` | none | UPnP on per the `upnp=1` sample; UNVERIFIED | optional | S4, S2c (S2c wording: "Disables automatic port forwarding") |
| `-forcepriority` | space | value | Process priority | Sets the process priority; overrides the `priority` config line. On non-Windows tML ignores it and logs a warning. | Performance | `-forcepriority 1` | priority number; config file meaning "0:Realtime, 1:High, 2:AboveNormal, 3:Normal, 4:BelowNormal, 5:Idle" (the arg's own accepted forms: UNVERIFIED; the code parses the text) | config sample has `priority=1` | optional | S4, S2c, S2a (non-Windows warning) |
| `-language` | space | value | Server language | Language of server messages. The CLI form is present in code; the config key `language=` documents codes en-US, de-DE, it-IT, fr-FR, es-ES, ru-RU, zh-Hans, pt-BR, pl-PL. | Advanced | `-language en-US` | codes above (S2c) | not stated | optional | S2a (`TryParameter("-language")`), S2c (codes) |
| `-disableannouncementbox` | none | bool flag | Disable announcement boxes | Stops the Announcement Box block from sending text messages when triggered by wire. | Advanced | `-disableannouncementbox` | none | off | optional | S4, S2c |
| `-announcementboxrange` | space | value | Announcement box range | How far (in pixels) announcement box messages reach; -1 means whole server. | Advanced | `-announcementboxrange -1` | number, -1 = server-wide | not stated | optional | S4, S2c |
| `-steam` | none | bool flag | Steam multiplayer support | Turns on Steam join/invite support for the server. In tML, the dedicated server only uses Steam when `-steam` is present (S2e SocialAPI), and the start script itself consumes this flag and re-adds it. | Network | `-steam` | none | off | Panel should choose; default off | S4, S2b, S2e |
| `-lobby` | space | value | Steam lobby type | Who may join through Steam; only matters with `-steam`. | Network | `-lobby friends` | `friends` or `private` (S4, S2c); tML adds `-friendsoffriends` (see below) | none (script asks if missing and Steam is on) | optional | S4, S2b, S3 |

Aliases/short forms seen in code but not on the wiki page: `-p` for port (S2a). Also client-side `-j`/`-join`, `-plr`/`-player` exist but are client only (S2a) and not relevant to a dedicated server.

## Table. tModLoader-only server arguments
| flag | form | kind | label | description | group | example | allowed values | default | panel-managed? | source |
|---|---|---|---|---|---|---|---|---|---|---|
| `-server` | none | bool flag | Run as dedicated server | Makes `tModLoader.dll` start as a server instead of the game. The shipped script adds it itself. Required if the panel starts `tModLoader.dll` directly. | Server | `-server` | none | n/a | Yes (always on) | S2e `Program.TML.cs` (`isServer = LaunchParameters.ContainsKey("-server")`), S2b |
| `-nosteam` | none | bool flag | No Steam | Script-level flag: tells `start-tModLoaderServer.sh` not to ask about Steam and not to pass `-steam`. The script does NOT pass it on to the game (it is consumed). If you start `tModLoader.dll` directly, just leave `-steam` out. (The game code also reads `-nosteam` for the workshop-folder lookup, S2e `WorkshopHelper.TML.cs`.) | Network | `-nosteam` | none | script asks if neither flag given | Yes (when using the script) | S2b, S3, S2e |
| `-friendsoffriends` | none | bool flag | Friends of friends | With `-steam -lobby friends`, also lets friends of friends join. Handled in the Steam network code; only seen in the scripts/wiki here, not in code I could open. | Network | `-steam -lobby friends -friendsoffriends` | none | off | optional | S2b, S3, tML `launchSettings.json.patch` |
| `-modpath` | space | value | Mods folder | Folder where `.tmod` files are read from. Also a config key `modpath=`. Needed on hosts where the default folder is not reachable. | Saves and logs | `-modpath "D:\srv\Mods"` | folder path | tML default Mods folder under the save directory | Yes | S3, S2a, S2c, S2d |
| `-modpack` | space | value | Mod pack | Loads only the mods listed in this named modpack (no `.json`). Also a config key `modpack=`. | Advanced | `-modpack friendsplaythrough` | modpack name | none (uses `enabled.json`) | optional | S3, S2a, S2c |
| `-tmlsavedirectory` | space | value | Save folder (exact) | Base folder for tML data: its Worlds and Mods folders and per-mod data are derived from it. No `/tModLoader` is appended. | Saves and logs | `-tmlsavedirectory "D:\srv\tml-data"` | folder path | the normal per-user tML folder | Yes | S3, S2c, S2e `Program.TML.cs` |
| `-savedirectory` | space | value | Save folder (appends tModLoader) | Same idea, but `/tModLoader` is added to the path automatically. Prefer `-tmlsavedirectory`. | Saves and logs | `-savedirectory D:\srv` | folder path | normal per-user folder | optional (use one of the two, not both) | S3 |
| `-steamworkshopfolder` | space | value | Workshop content folder | Where Steam Workshop mod downloads are read from, if you downloaded them with SteamCMD into a custom folder. Used by the official Linux script. Listed as "TOBEADDEDLIST" on the wiki, but code reads it. | Saves and logs | `-steamworkshopfolder "D:\srv\steamapps\workshop"` | folder path (a `steamapps/workshop` folder) | Steam client's workshop folder | Yes if mods come from SteamCMD | S3, S2e `WorkshopHelper.TML.cs`, S2f |
| `-skipselect` | space (optional) | value/bool | Skip menus | Auto-picks first player/world; wiki says for modders. For servers `-world` is the documented way. Not recommended for the panel. | Advanced | `-skipselect ":MyWorld"` | `Player:World` names | n/a | no | S3, S2a |
| `-showserverconsole` | none | bool flag | Show server console | Internal flag the tML client uses for the server it spawns; just shows the server window. | Advanced | | none | off | no | S2a, S2d |
| `-console` | none | bool flag | (client) keep console | Only affects clients (`!Main.dedServ`): keeps the console window. Irrelevant for a dedicated server. | Advanced | | none | n/a | no | tML `Program.cs.patch` |
| `-accuratememorytracking` | none | bool flag | Memory tracking | Developer option. | Advanced | | none | off | no | S2a |
| `-install <file>` / `-forceupdatemetadata` / `-build` / `-publish` / `-publishtags` / `-publicity` / `-testservermodloading` / `-eac` / `-ciprep` / `-publishedmodfiles` / `-uploadfolder` / `-loadlib` / `-experimental` | space | | Mod-author or internal tools | Not for running a server. Do not expose in the panel. | Advanced | | | | no | S3, S2a |
| `-audiodriver`, `-videodriver`, `-gldevice` | | | Client graphics/audio | Client only. | | | | | no | S3 |

## Not found
- `-steamserver`: I could not find this argument in the tModLoader source (grep of patches/ found only a binary Steamworks DLL) or the wikis. It does not appear to exist. Do not use it.
- Vanilla `-config`, `-world`, `-autocreate`, `-secure`, `-noupnp`, `-steam`, `-lobby`, `-ip` parsing lives in the decompiled vanilla code (not in the tML repo patch files), so for these the evidence is the wiki + the shipped `serverconfig.txt`, not code.

## Recommended minimal panel start line (derived from sources; not run)
`<install>\start-tModLoaderServer.bat -nosteam -config "<install dir>\serverconfig.txt" -world "<...>\Worlds\<name>.wld" [-autocreate 2 -worldname <name>] -port 7777 -players 8 [-pass <password>] -tmlsavedirectory "<data dir>" -steamworkshopfolder "<...>\steamapps\workshop"`
Equivalent to the official `manage-tModLoaderServer.sh` command (S2f). Port/players/password/world can equally go in `serverconfig.txt` instead of the command line (S2c lists `port`, `maxplayers`, `password`, `world`, `autocreate`, `worldname`, `seed`, `difficulty`, `worldpath`, `banlist`, `secure`, `language`, `upnp`, `npcstream`, `priority`, `motd`, `modpath`, `modpack`; this belongs to the config step).

## Other facts relevant to the launch step
- Default port: 7777 TCP (S4; Docker compose publishes `7777:7777`, S2f).
- Stopping: by typing `exit` / the server console (not researched in this step; see basics step). The Docker readme says Ctrl-C on the attached console shuts down the server (S2f README).
- SteamCMD: the tML README's own install command is `+login <username> +app_update 1281930` and it exits with "Provide the --username flag in order to download TML from Steam" if none is given (S2f `manage-tModLoaderServer.sh`). Mods are fetched with `+login anonymous ... +workshop_download_item 1281930 <id>` (S2f). This strongly suggests app 1281930 can NOT be installed with `+login anonymous`. api.steamcmd.net lists 1281930 as type `Game` (not a free Tool) (S1). The earlier candidates.md guess ("Likely yes") is probably wrong. Needs the basics step to confirm.
- The `Journey's End config commands are NOT going to work` note in the tML wiki is from the outdated page (S3) and was not relied on.

## UNVERIFIED
1. The exact accepted forms of `-forcepriority` values (number vs name); only the config file's number list is sourced.
2. Default max players for the tML dedicated server (16 per Terraria wiki, 8 per tML wiki/example config).
3. Whether `-ip`, `-noupnp`, `-secure`, `-autocreate` etc. behave identically in tML 1.4.4/1.4.5 (read from wiki and example config only, parser code not available).
4. Argument parser rule (how `Utils.ParseArguements` handles quoting and values starting with `-`).
5. Default value of `-seed` and `-worldname` (the `Terraria` default is only a comment sample).
6. Default value of `-ip` and `-noupnp`/UPnP.
7. Process name on Windows (`dotnet.exe` vs `tModLoader.exe`) and whether the Windows Steam depot ships `dotnet` or the first start downloads it (S2g runs `InstallDotNet.sh`); needs a real install.
8. `-friendsoffriends` and `-steam`'s exact Steam-lobby behaviour: only scripts/wiki, no code opened.
9. Whether `-worldrollbackstokeep` is honoured when given by a user (it is passed by the tML client to its own spawned server in S2d, so it is parsed by the server side; the parse code is not in the tML repo).
10. Whether app 1281930 can be downloaded with `+login anonymous` (evidence points to no).
11. `-steamserver`: no evidence it exists.
12. Whether stdin prompts still appear for `-world` missing on a headless start under the panel (documented only on the outdated wiki page).

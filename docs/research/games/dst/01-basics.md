# Don't Starve Together: server basics (STEP-basics)

Researched 2026-10-14. Server build per Steam metadata: public branch buildid 25643504 (https://api.steamcmd.net/v1/info/343050). Store app 322330, server tool app 343050.
Raw downloads of the Klei forum pages and the Pterodactyl egg are in `research\dst\raw\` (kleiforums.com blocks WebFetch but answers curl with a browser User-Agent). No real install was run for this step, so everything below is from docs, forum posts and hosting-panel eggs, not from the shipped files.

Source tiers used: [KLEI-DEV] = post by a Klei developer on the official forum; [KLEI-WIKI] = dontstarve.wiki.gg; [COMM] = community/hosting guide or egg.

## 1. SteamCMD

- App: "Don't Starve Together Dedicated Server", id 343050, type Tool, `freetodownload=1`, oslist windows/macos/linux, install dir name `Don't Starve Together Dedicated Server`. Source: https://api.steamcmd.net/v1/info/343050
- Anonymous login works. Klei's own Windows guide (developer V2C, edited 2021 to x64): `c:\steamcmd\steamcmd.exe +login anonymous +app_update 343050 validate +quit`. Source: https://kleiforums.com/forums/topic/64212-dedicated-server-quick-setup-guide/ [KLEI-DEV]. Same login form on the wiki: https://dontstarve.wiki.gg/wiki/Dedicated_Server [KLEI-WIKI].
- With a custom folder: `+login anonymous +force_install_dir "C:\Don't Starve Together" +app_update 343050 validate +quit`. Source: https://kb.firedaemon.com/support/solutions/articles/4000086945-don-t-starve-together-as-a-service [COMM]. (The wiki lists `force_install_dir` before `app_update`; the usual SteamCMD rule that it must come before `login`/`app_update` is not stated by these sources, UNVERIFIED for DST specifically.)
- `validate` removes files that are not part of the game, including installed mods: "Omit it if you have mods installed". Source: https://dontstarve.wiki.gg/wiki/Dedicated_Server [KLEI-WIKI]. A Klei-forum user also reports `validate` resets `dedicated_server_mods_setup.lua` on every run: https://kleiforums.com/forums/topic/64441-dedicated-server-quick-setup-guide-linux/ (reply, Feb 2016, [COMM]).
- The same commands are used to update. Source: wiki page above.
- Owning the game is NOT needed to install the server; it IS needed for the cluster token of an online server ("Online servers require a copy of Don't Starve Together. Offline servers do not."). Source: wiki page above.
- Size: Windows depot 343051 = 4,448,390,983 bytes (about 4.45 GB). Linux depot 343052 = 4.38 GB. Source: https://api.steamcmd.net/v1/info/343050
- Note: a FireDaemon article (2021) says "The game is currently 2.05GB"; that is outdated against the 2026 depot size above.

## 2. Install folder layout and executable

Steam launch configs for app 343050 (no arguments set in any of them). Source: https://api.steamcmd.net/v1/info/343050
- Windows 64-bit: `bin64/dontstarve_dedicated_server_nullrenderer_x64.exe`, working dir `bin64`.
- Windows 32-bit: `bin/dontstarve_dedicated_server_nullrenderer.exe`, working dir `bin`.
- Linux 64: `bin64/scripts/launch_dedicated_server.sh`; Linux 32: `bin/scripts/launch_dedicated_server.sh`.

Facts:
- The exe is started directly (there is no separate launcher exe in the launch config), so the process that stays running is `dontstarve_dedicated_server_nullrenderer_x64.exe`. Source: launch config above, and Klei's Windows guide `start dontstarve_dedicated_server_nullrenderer_x64 ...` https://kleiforums.com/forums/topic/64212-dedicated-server-quick-setup-guide/
- The working directory must be the `bin` / `bin64` folder. Source: wiki ("The working directory must be the `bin/` folder"); egg does `cd bin64`.
- Both shards run the SAME exe name, so there are two processes with the same image name (see "What a panel must not do").
- A community report (2021) says x64 runs smoother ("We just switched from default x86 to x64 and so far runs a lot smoother"): https://kleiforums.com/forums/topic/132660-how-to-start-up-a-64-bit-dedicated-server/ [COMM]. Another set of reports about x64 vs mods disagrees (some say mods only downloaded under 32-bit, others ran x64 fine) per a search summary of https://kleiforums.com/forums/topic/133082-mods-dont-download/ ; I did not open that thread, so x64-with-mods is UNVERIFIED.
- Default Steam GUI install path (Tools filter): `C:/Program Files (x86)/Steam/steamapps/Don't Starve Dedicated Server`. Source: https://dontstarve.wiki.gg/wiki/Guides/Simple_Dedicated_Server_Setup (via SteamCMD with force_install_dir it is wherever you choose).

## 3. Cluster token (required for an online server)

- An online (listed, Steam-authenticated) server needs `cluster_token.txt`; an offline/LAN server does not. Source: https://dontstarve.wiki.gg/wiki/Dedicated_Server [KLEI-WIKI] ("Required for online servers. Omit it for offline servers.")
- How to get one (two ways), both need an account that owns DST:
  1. Klei accounts website: log in, GAMES tab, Don't Starve Together, "Game Servers", "ADD NEW SERVER", copy the token (or "Download Settings" zip containing a ready cluster folder). Sources: https://kleiforums.com/forums/topic/64212-dedicated-server-quick-setup-guide/ [KLEI-DEV]; wiki above. Dedicated servers are not supported for the Xbox/PlayStation versions (Klei guide).
  2. In the game client, open the console with the tilde key and run `TheNet:GenerateClusterToken()`; it writes `cluster_token.txt` to `%USERPROFILE%\Documents\Klei\DoNotStarveTogether\` on Windows. Sources: wiki above; https://dontstarve.wiki.gg/wiki/Guides/Simple_Dedicated_Server_Setup
- Where the file goes: inside the cluster folder (`<cluster>\cluster_token.txt`). Klei's Windows guide checklist lists `...\MyDediServer\cluster_token.txt`; FireDaemon says copy it to the cluster folder (default `Cluster_1`). Sources as above.
- Token is a single long string; an `E_EXPIRED_TOKEN` error usually means extra (even invisible) characters at the end of the file, so write it with no trailing newline/BOM issues. Source: wiki. An `E_INVALID_TOKEN` error (log line `[200] account failed (6): "E_INVALID_TOKEN"`) is reported when the token is wrong: https://kleiforums.com/forums/topic/64212-dedicated-server-quick-setup-guide/ (user post).
- Format: one hosting guide says it starts with `pds-`; I could not confirm this on a Klei page. UNVERIFIED (do not validate by prefix).
- Expired servers on the Klei account page are shown in red and should be deleted (Klei guide step 4). How long a token stays valid is not stated: UNVERIFIED.
- Treat the token as a secret; it links the server to the owner's Klei account (wiki Simple Dedicated Server Setup guide: "Keep the token private").
- Admin default: for an online server the token owner becomes admin if `adminlist.txt` is empty. Source: wiki Dedicated_Server page.

## 4. Where files live and the cluster folder layout

User data root (config, saves, logs), default: Windows `%USERPROFILE%\Documents\Klei\`, Linux `~/.klei`, macOS `~/Documents/Klei`. Then a config-dir folder, default `DoNotStarveTogether`, then the cluster folder, default `Cluster_1`, then the shard folder, default `Master`. Source: wiki option table (`-persistent_storage_root`, `-conf_dir`, `-cluster`, `-shard`) https://dontstarve.wiki.gg/wiki/Dedicated_Server

So the default Windows path of a cluster is `%USERPROFILE%\Documents\Klei\DoNotStarveTogether\Cluster_1\`. All of this can be moved with `-persistent_storage_root <absolute path>` and `-conf_dir <name>`. A Pterodactyl egg confirms the resulting layout: `-persistent_storage_root /home/container/DoNotStarveTogether -conf_dir config -cluster server` gives `DoNotStarveTogether/config/server/cluster.ini` and `.../Master/server.ini`, `.../Caves/server.ini`. Source: https://github.com/pterodactyl/game-eggs/blob/main/dont_starve/egg-don-t-starve-together.json (raw: `research\dst\raw\egg_egg-don-t-starve-together.json`) [COMM]

Layout (wiki):
```
<cluster>/                 e.g. Cluster_1
  cluster.ini              shared settings, mandatory
  cluster_token.txt        online servers only
  adminlist.txt            optional, one KU_ id per line
  whitelist.txt            optional (known bug: only last id respected, per wiki)
  blocklist.txt            optional
  Master/                  overworld ("Forest") shard
    server.ini             mandatory, per shard
    worldgenoverride.lua   optional
    leveldataoverride.lua  optional (wins over worldgenoverride.lua)
    modoverrides.lua       optional, per shard
    save/                  created by the game (saveindex + session/)
  Caves/                   second shard, same file types
```
Sources: https://dontstarve.wiki.gg/wiki/Dedicated_Server ; the `save/` folder (with `saveindex` and `session` subfolder) and "Master/save and Caves/save must be backed up as a pair, stop the server first" from https://emeraldhost.de/docs-redirect/en/gameserver/dont-starve-together/download-savegame [COMM].

Mods setup file (not per cluster): `dedicated_server_mods_setup.lua` in the game install's `mods/` folder (Docker guide lists it under the cluster as `Cluster_1/mods/`, which conflicts; mods are another research step). Wiki: https://dontstarve.wiki.gg/wiki/Dedicated_Server

Minimum to start per Klei: `cluster.ini` and each shard's `server.ini` are mandatory (wiki). Whether the server creates defaults when they are missing is UNVERIFIED (the egg downloads default files itself when missing, which suggests the panel should write them).

### Files seen in working examples (sources for what a panel would write)
- Klei-account "Download Settings" zip (MyDediServer): contents not seen. UNVERIFIED.
- Wiki Simple Dedicated Server Setup (https://dontstarve.wiki.gg/wiki/Guides/Simple_Dedicated_Server_Setup):
  cluster.ini: `[GAMEPLAY] pause_when_empty = true, game_mode = survival` / `[NETWORK] cluster_password=, cluster_name=, cluster_description=, autosaver_enabled = true` / `[SHARD] shard_enabled = true, cluster_key = defaultPass1`.
  Master/server.ini: `[NETWORK] server_port = 10998`, `[SHARD] is_master = true, name = Master, id = 1`, `[STEAM] master_server_port = 27016, authentication_port = 8766`, `[ACCOUNT] encode_user_path = true`.
  Caves/server.ini: `server_port = 10999`, `is_master = false, name = Caves, id = 2`, `master_server_port = 12346, authentication_port = 10166`, `encode_user_path = true`.
- Pterodactyl egg files (raw in `research\dst\raw\egg_server.*.ini`): cluster.ini with `[GAMEPLAY] game_mode, max_players, pvp, pause_when_empty`, `[NETWORK] cluster_name, cluster_description, cluster_password, cluster_intention, autosaver_enabled, enable_vote_kick`, `[MISC] console_enabled = true`, `[SHARD] shard_enabled = true, bind_ip = 127.0.0.1, master_ip = 127.0.0.1, master_port = 11001, cluster_key = dst`; Master/server.ini `server_port = 10999`, `is_master = true`; Caves/server.ini `server_port = 11000`, `is_master = false`, `name = Caves`, `id = <number>`.
- XGamingServer: Master server_port 10999, auth 8766, master_server_port 27018; Caves 11000, auth 8768, master_server_port 27019; cluster master_port 11001. https://xgamingserver.com/docs/dont-starve-together/caves-shard-setup [COMM]

## 5. Ports (all UDP)

| Port | Setting (file) | Default | Role | Source |
|---|---|---|---|---|
| Master game | `[NETWORK] server_port` (server.ini), or `-port` | 10999 | Players connect here. Must be 1024-65535 online; 10998-11018 if LAN players should see it in their list | Klei dev guide https://kleiforums.com/forums/topic/64552-dedicated-server-settings-guide/ ; wiki |
| Caves game | `[NETWORK] server_port` (Caves/server.ini) | no default beyond 10999; must differ from every other shard on the machine. Examples: 11000 (egg, XGaming, Docker), 10999 with Master 10998 (wiki guide) | Caves shard listening port | Klei dev guide ("must be different for each server on the same machine") |
| Shard link | `[SHARD] master_port` (cluster.ini or server.ini) | 10888 | UDP port the Master listens on, and the one other shards connect to. Same value for all shards. Must differ from any shard's server_port on that machine | Klei dev guide |
| Steam auth | `[STEAM] authentication_port` (server.ini), or `-steam_authentication_port` | 8766 | "Internal port used by steam"; must differ per shard on one machine | Klei dev guide; wiki |
| Steam master updater | `[STEAM] master_server_port` (server.ini), or `-steam_master_server_port` | 27016 | "Internal port used by steam"; must differ per shard on one machine | Klei dev guide; wiki |

Notes with sources:
- Shard communication: Master listens on `bind_ip:master_port`; other shards connect to `master_ip:master_port` with the shared `cluster_key` as password. Required: `shard_enabled = true` in cluster.ini; `bind_ip` required on the master when sharding (default 127.0.0.1; use 0.0.0.0 only if shards run on different machines); `master_ip` required on non-master shards (127.0.0.1 if same machine); `cluster_key` required, must match everywhere; exactly one shard has `is_master = true` and the rest `false`; non-master shards need a `name`. Source: Klei dev settings guide https://kleiforums.com/forums/topic/64552-dedicated-server-settings-guide/
- `master_port` is not exposed to the internet, no forwarding needed: CarlZalph in https://kleiforums.com/forums/topic/130222-what-is-the-master_port-for/ [COMM, forum regular]. Docker image calls it "UDP 10998 (listen on localhost) for communication between cluster servers" https://hub.docker.com/r/tws101/docker-dst-server (so the community uses 10888, 10998 and 11001 as the master port, depending on the guide; the real default is 10888 per Klei).
- A hosting guide warns not to reuse master_port as a game port (search summary of https://supercraft.host/wiki/dont-starve-together/dedicated_server_caves/ ; I could not open that page, treat as consistent with the Klei rule above).
- What must be forwarded/open to the internet:
  - Klei developer "nome" (2016, single-shard era): "I've only ever had to open inbound connectivity on 10999"; SteamCMD only needs outbound. https://kleiforums.com/forums/topic/57139-what-are-all-the-ports-that-actually-need-to-be-open/
  - For a caves cluster the sources DISAGREE: Pterodactyl egg README says only the Master port is needed because "All network communications are proxied through the master"; the Docker image says forward both 10999 and 11000 and not to NAT them to other numbers. A forum poster says players contact 10999 and 10998 directly (same master_port thread). I found no Klei statement. Which is true is UNVERIFIED; the safe panel default is to open both game ports.
- Several servers on one PC: every shard needs a unique server_port, authentication_port and master_server_port. Source: Klei dev guide; wiki ("Running multiple servers on one machine requires unique ports for each").
- Other cluster.ini network knobs: `lan_only_cluster`, `offline_cluster`, `tick_rate` (default 15; Klei: leave it), `whitelist_slots`. Source: Klei dev guide.

## 6. Start command

Klei's own Windows batch file (developer V2C; x64 edit 2021), from https://kleiforums.com/forums/topic/64212-dedicated-server-quick-setup-guide/:
```
c:\steamcmd\steamcmd.exe +login anonymous +app_update 343050 validate +quit
cd /D "c:\steamcmd\steamapps\common\Don't Starve Together Dedicated Server\bin64"
start dontstarve_dedicated_server_nullrenderer_x64 -console -cluster MyDediServer -shard Master
start dontstarve_dedicated_server_nullrenderer_x64 -console -cluster MyDediServer -shard Caves
```
(Klei's batch file is a template: the user keeps the cluster folder in `Documents\Klei\DoNotStarveTogether\MyDediServer`.)

Minimal working form per shard (wiki): `dontstarve_dedicated_server_nullrenderer_x64.exe -persistent_storage_root <abs path> -conf_dir <name> -cluster <name> -shard <name>` run from `bin64`. `-persistent_storage_root` and `-conf_dir` can be omitted for the defaults. Source: https://dontstarve.wiki.gg/wiki/Dedicated_Server

Single shard (no caves): run only `-shard Master` and omit `shard_enabled` (Klei guide: "For single-level servers, it can be omitted"). Source: Klei dev settings guide. A fully sharded layout can also run only the Master, but the Master will not have caves; the egg's default is always two processes.

Command-line options (wiki table, https://dontstarve.wiki.gg/wiki/Dedicated_Server): `-persistent_storage_root <path>`, `-conf_dir <name>`, `-cluster <name>`, `-shard <name>`, `-bind_ip <ip>`, `-port <port>` (overrides server_port), `-steam_master_server_port`, `-steam_authentication_port`, `-tick <15-60>`, `-players <1-64>` (overrides max_players), `-ugc_directory <path>` (V2 mods, default `ugc_mods/<cluster>/<shard>`), `-console`, `-lan`, `-disabledatacollection`, `-backup_logs`, `-skip_update_server_mods`, `-only_update_server_mods`. Full per-flag treatment belongs to the launch-args step.

Console flag history: a 2016 Klei forum user reports the log line "`-console` has been deprecated: Use the [MISC] / console_enabled setting instead" and that the console is on by default (https://kleiforums.com/forums/topic/64552-dedicated-server-settings-guide/, user post) and Klei's dev guide lists `[MISC] console_enabled`, default true. Yet Klei's 2021-edited Windows batch and the wiki still pass `-console`. Passing `-console` and setting `console_enabled = true` are both harmless to include. The effect of the console being on matters for stopping (below).

Max players: Klei guide default 16; wiki says `-players` takes 1-64; Pterodactyl egg variable allows 1-31. Source conflict, UNVERIFIED which upper bound the game really enforces.

How to know it is up: the Pterodactyl egg treats the log line `Setting breakpad minidump AppID` as "server started" (egg `config.startup.done`), and XGamingServer says to wait for "Caves shard ready" in the console (https://xgamingserver.com/docs/dont-starve-together/caves-shard-setup). Neither is a Klei statement; the exact ready line is UNVERIFIED.

`-monitor_parent_process <pid>`: used in Klei's Linux script so each shard follows its parent (https://kleiforums.com/forums/topic/64441-dedicated-server-quick-setup-guide-linux/). Not in the wiki table; Windows behaviour UNVERIFIED.

## 7. First run, saves and naming

- The game creates the world on first start from the shard's `worldgenoverride.lua` preset (or defaults). Presets named in the wiki: Master `SURVIVAL_TOGETHER`, `SURVIVAL_TOGETHER_CLASSIC`, `SURVIVAL_DEFAULT_PLUS`, `COMPLETE_DARKNESS`, `TERRARIA`; Caves `DST_CAVE`, `DST_CAVE_PLUS`, `TERRARIA_CAVE`. `leveldataoverride.lua` overrides it if both exist. Source: https://dontstarve.wiki.gg/wiki/Guides/Simple_Dedicated_Server_Setup and Dedicated_Server pages. (Caves worldgen needs `worldgenoverride.lua` with `DST_CAVE`, per XGamingServer; the wiki guide includes it for Caves.) Detailed settings are another step.
- Saves: `<cluster>\Master\save\` (and `Caves\save\`) containing `saveindex` and a `session` subfolder. The world has no user-chosen name file; the world is identified by cluster folder + shard folder. Server name shown to players is `cluster_name` in cluster.ini. Source: emeraldhost save doc; Klei dev guide for cluster_name.
- Autosave: `autosaver_enabled` (default true) "saves at the end of each day"; the game "will still save on shutdown, and can be manually saved using c_save()". Klei dev guide. `max_snapshots` (default 6) snapshots kept for rollback. Same guide.
- `pause_when_empty` default false in the Klei guide (the Klei wiki-guide examples set it true). Same guide.
- Backups: stop the server first and copy both `save` folders together. emeraldhost doc.
- Logs: `-backup_logs` backs up previous logs on each run (wiki). Log file names/locations: UNVERIFIED (not found in the sources opened).

## 8. Stopping gracefully

- The server has a console; typing a Lua command there runs it on that shard: "There's the option for dedicated servers to take console commands from their console (on Windows at least)" (rezecib, 2015) and Klei dev Ipsquiggle (Dec 2015): "If from the console, the server has to be started with the -console flag for it to accept input". https://kleiforums.com/forums/topic/51535-stopping-dedicated-server-gracefully/ [KLEI-DEV]
- Graceful stop = `c_shutdown()` (or `c_shutdown(true)`). `true`/no argument saves first; `c_shutdown(false)` exits without saving. https://dontstarve.wiki.gg/wiki/Console/Don%27t_Starve_Together_Commands ; the function body (saves players and SaveGameIndex, then Shutdown) quoted by rezecib in the Klei thread above.
- Killing the process does NOT save: a Linux user reports Ctrl+C did not write the world, only `cl_shutdown(true)` / `c_shutdown()` did (same Klei thread; 2015). A 2021 forum comment says Ctrl+C is hooked as SIGINT on Linux/Mac and saves, and calls Windows "untested" (found via search summary; thread not opened, so UNVERIFIED). Therefore the panel must not rely on a Ctrl+C or a kill for a clean save.
- Pipe the command into the shard's stdin: "Pipe a `c_shutdown()` into the console of the process to have it save gracefully. You'll need to do it on all shards." (CarlZalph) https://kleiforums.com/forums/topic/136795-how-to-schedule-a-shutdown-for-a-dedicated-steam-server/ . The Pterodactyl egg stop command is `c_shutdown()` and its start line sends `echo 'c_shutdown()'` into the Caves process after the Master exits. https://github.com/pterodactyl/game-eggs/blob/main/dont_starve/egg-don-t-starve-together.json . That proves stdin works on Linux; stdin writing from a Windows parent process (Node `child.stdin.write("c_shutdown()\n")`) is UNVERIFIED.
- Multi-shard effect: a Steam-guide author using Docker says running `c_shutdown()` on the Master shuts down all shards, while on Caves only the Caves shard stops (https://steamcommunity.com/sharedfiles/filedetails/?id=1206742951 [COMM]). Another guide tells you to type it in both consoles (https://steamcommunity.com/sharedfiles/filedetails/?id=2591712977). The wiki does not say which shards are affected. Safest: send it to Caves first, wait, then to Master (the egg stops Master first and then Caves); both orders are used by sources.
- Time to exit: the Docker image says shutdown can take up to about 5 minutes while the map saves (https://hub.docker.com/r/tws101/docker-dst-server) [COMM]. A panel should wait a generous period before force-killing (typical size for a small world is UNVERIFIED).
- Announce before a restart: `c_announce("text")`. Wiki command page. Admin console commands also work in-game for admins with `c_` / `remote:` forms (adminlist.txt).
- RCON: none found for DST. No REST. No Windows service integration shipped by Klei (FireDaemon article shows a third-party service wrapper with "Forceful Termination", which does not save).

## 9. Query protocol / seeing players

- GameDig lists DST (id `dst`) as "Valve Protocol" (Steam A2S) but gives no default port in the list I opened. Source: https://github.com/gamedig/node-gamedig/blob/master/GAMES_LIST.md . Which port answers A2S, whether it reports the live player count, and whether it works for LAN/offline clusters are UNVERIFIED. Candidate port: `master_server_port` (27016 default) because it is the Steam server port; one hosting guide calls 27016 the "query port" (https://gamecp.com/en/games/dont-starve-together/hosting-guide/, not opened, only a search summary).
- Alternative the panel can implement without any query: tail the console output of each shard (the server prints join/leave announcements; exact line format UNVERIFIED), or send `c_listallplayers()` through stdin (the wiki says that command "seems to not work so well anymore", with a workaround `for i, v in ipairs(AllPlayers) do TheNet:SystemMessage(...)` which prints to chat, not back to the console).

## 10. Resources

- Disk: about 4.45 GB (depot size) plus world saves. Source: api.steamcmd.net.
- RAM/CPU: no figure from Klei. Pterodactyl egg README: "around 512mb for a single user" minimum https://github.com/pterodactyl/game-eggs/blob/main/dont_starve/README.md . A 2016 forum user ran two shards on a 700 MB VPS but saw lag above 6 players (https://kleiforums.com/forums/topic/64552-dedicated-server-settings-guide/, user post). Hosting vendors' search summaries recommend about 2 GB for overworld only and about 4 GB for overworld plus caves with 6-10 players. Those are vendor estimates: treat as UNVERIFIED rough figures, each shard is its own process with its own memory.
- Single threaded, tick rate 15 by default (Klei guide); CPU needs UNVERIFIED.

## 11. Windows pitfalls

- Save and config go to the user's Documents by default (`%USERPROFILE%\Documents\Klei\DoNotStarveTogether`). If the panel runs as a different user or a service, that is a different profile; use `-persistent_storage_root` to pin the location. Source: wiki option table and Klei guide.
- The cluster token via `TheNet:GenerateClusterToken()` is written into the Documents folder of the account that ran the game client (wiki).
- Two console windows: each shard opens its own console window when started with `start ...` (Klei batch). Whether the console can be hidden/redirected on Windows is UNVERIFIED (the panel's Node spawn with piped stdio is the open question above).
- Windows Firewall prompt on first run, UPnP behaviour, Visual C++ redistributable needs: not mentioned in any source opened. UNVERIFIED.
- Mods in V2 format are downloaded to `ugc_mods/<cluster>/<shard>` under the server folder by default; with two shards each downloads its own copy unless `-ugc_directory` is shared; update first with `-only_update_server_mods`, then start shards with `-skip_update_server_mods`. Source: wiki page tips.
- Windows-only gotcha reported on Klei forums: "Windows cannot find..." errors usually mean wrong exe path (search summary), x64 exe lives in `bin64`.

## 12. Updates

- Update = run the SteamCMD `app_update 343050` again while the server is stopped (wiki: "Use the same commands to update"). Don't use `validate` if mods are installed. Mods (workshop) are updated at server start unless `-skip_update_server_mods`.
- Back up the cluster folder before updating and never update only one shard while another runs an older build: from the emeraldhost doc/search summary, UNVERIFIED as a Klei rule (flagged because I did not open the page that said it).
- Required build match between client and server (a stale server shows as "out of date" to players) is widely reported but I did not find a source page: UNVERIFIED.

## What a panel must NOT do

- Never kill by image name (`taskkill /IM dontstarve_dedicated_server_nullrenderer_x64.exe`): the Master and Caves shards share the same exe name, so that would also kill the shard of other clusters or the other shard mid-save. Track PIDs per shard.
- Never stop with a plain kill/terminate for the normal path; use `c_shutdown()` on stdin (killing does not save: Klei forum thread 51535). FireDaemon's "Forceful Termination" is the opposite of graceful.
- Do not give two shards (of one cluster or of different clusters on the same PC) the same `server_port`, `authentication_port`, `master_server_port` or `master_port` (Klei dev guide).
- Do not set `master_port` equal to any shard's `server_port` on the same machine (Klei dev guide).
- Do not put the cluster token or `cluster_key` into logs or the UI; do not store trailing characters in `cluster_token.txt`.
- Do not use `validate` on update when mods are installed (wiki).
- Do not start the Caves shard first and expect it to be usable before the Master is up: the Master is the listener at `master_port`; the order is not documented by Klei, so start Master first. Sources do both orders (Klei's batch starts Master then Caves; the egg starts Caves as coprocess first). The retry behaviour of a non-master shard whose master is not up yet is UNVERIFIED.

## Panel template suggestions (for the implementer, derived from the above)

- `updateAppId` 343050, `storeAppId` 322330, anonymous login OK, `method`: `process` (no RCON/REST); graceful stop via stdin `c_shutdown()` (needs Windows stdin test).
- Process name: `dontstarve_dedicated_server_nullrenderer_x64.exe` (one per shard, same name).
- Ports list: Master game 10999, Caves game 11000 (suggested, wiki guide uses 10999 for Caves with Master 10998, pick one scheme and write it into both server.ini), `master_port` default 10888 (internal), Steam ports as implicit ports with per-shard offsets (Master 8766/27016 defaults, Caves needs different values, e.g. 8767/27017: values are the implementer's choice; the sources only require uniqueness).
- Fields: sessionName -> `cluster_name`, serverPassword -> `cluster_password`, cluster token as a secret field (the token needs its own input; it is not one of the standard fields).

## UNVERIFIED list

1. No real install was run: shipped default files, `-help` output, and the exact files the server writes on first run are unchecked.
2. Whether the server auto-creates `cluster.ini`/`server.ini` when missing.
3. Whether a cluster token placed at the `DoNotStarveTogether` root (not inside the cluster) is picked up.
4. Token format (`pds-` prefix claim) and token lifetime/expiry.
5. Whether players connect to the Caves port directly (forward both) or only through the Master (egg README says proxied).
6. Which port answers Steam A2S and whether it shows the real player count; whether GameDig `dst` works against it.
7. Windows: writing `c_shutdown()` to a spawned shard's stdin from Node; whether Ctrl+C/CTRL_BREAK saves on Windows.
8. Whether `c_shutdown()` on the Master stops the Caves too (Docker guide says yes; no Klei source).
9. Maximum seconds a clean shutdown takes (Docker says up to ~5 minutes).
10. Exact "server is ready" log line (candidates: `Setting breakpad minidump AppID`, `Caves shard ready`).
11. Real-world RAM/CPU per shard; only vendor estimates and the 512 MB egg minimum.
12. Windows Firewall prompt, UPnP, redistributables.
13. `-monitor_parent_process` behaviour on Windows; whether `-console` is still required in current builds (deprecated per 2016 forum log line).
14. Max players upper bound (wiki 64, egg 31).
15. x64 build with Workshop/UGC mods (conflicting forum reports).
16. Log file names/locations.
17. Contents of the Klei-account "Download Settings" zip.
18. Whether SteamCMD `force_install_dir` placement relative to `login` matters for this app.
19. Whether the server rejects out-of-date clients / needs matching build and what happens when only one shard is updated.
20. Whether the shard start order matters (non-master shard retry when Master not yet up).

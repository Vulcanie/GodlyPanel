# StarRupture dedicated server: basics (researched 2026-10-14)

Build the facts are for: Steam server app 3809400, public branch buildid 25642172, depot 3809401 manifest gid 3659990775896995763 (Steam metadata `timeupdated` 1791183334 = 2026-10-05 06:55 UTC; `timebuildupdated` 1790818733 = 2026-10-01). Game is in Early Access (store release 2026-01-06) and the server is officially labelled "Experimental". Source for build data: https://api.steamcmd.net/v1/info/3809400

Source reliability legend: [OFFICIAL] = Creepy Jar support article or Steam metadata. [COMMUNITY-MOD] = AlienXAXS modloader/plugin author (widely used, has read the game binary). [HOST] = hosting company or Docker image README, not verified against the game. Almost everything beyond the first-line launch command is [HOST] or [COMMUNITY-MOD]; Creepy Jar's own docs are very thin.

## Identity and app ids
- Store app 1631270 "StarRupture" (Creepy Jar), type Game, Windows only, launch exe `StarRuptureGameSteam.exe`, main depot 1631272 (~49.2 GB). https://api.steamcmd.net/v1/info/1631270
- Dedicated server app 3809400 "StarRupture Dedicated Server (Experimental)", type Tool, `freetodownload=1`, oslist windows, parent 1631270, installdir "StarRupture Dedicated Server", osarch 64. https://api.steamcmd.net/v1/info/3809400
- There is no Linux server build on the public depot; Linux hosts run the Windows files under Wine/Proton. https://xgamingserver.com/blog/starrupture-dedicated-server-configuration-guide/ ("Windows 10/11 64-bit only... No official Linux server"), Pterodactyl egg uses wine https://eggs.pterodactyl.io/egg/games-starrupture-wine
- Another id 4225260 was tried by a forum user and returned "No subscription": it is not the server. https://steamcommunity.com/app/1631270/discussions/0/695375725078790998/

## SteamCMD command, anonymous login
- Official article gives both forms, anonymous explicitly: `steamcmd.exe +force_install_dir C:\StarRuptureDS\ +login anonymous +app_update 3809400 validate +quit` (Option B). https://creepyjar.theymes.com/hc/en/starrupture/articles/setting-up-a-star-rupture-dedicated-server-experimental-feature-using-the-steam-app-34
- Steam metadata: a single depot (3809401, Windows 64-bit) plus shared depot 228989 (from app 228980), `freetodownload=1`. https://api.steamcmd.net/v1/info/3809400
- The Pterodactyl egg install script defaults to anonymous when no Steam user is set (on Linux it also adds `+@sSteamCmdForcePlatformType windows`; irrelevant on a Windows host). https://eggs.pterodactyl.io/egg/games-starrupture-wine
- Caveat: at the January 2026 launch, anonymous login sometimes failed with "subscription" errors while files were being pushed. https://xgamingserver.com/blog/starrupture-dedicated-server-configuration-guide/ (stale by now, not re-tested here).
- Size: installed depot 21,349,240,119 bytes (~21.3 GB), download 2,653,127,216 bytes (~2.65 GB). https://api.steamcmd.net/v1/info/3809400 (Hosts recommend 30 to 50 GB free disk: https://github.com/indifferentbroccoli/starrupture-server-docker , https://allthings.how/how-to-host-a-starrupture-dedicated-server-on-pc-without-breaking-your-save/)
- Updating = rerun the same `+app_update 3809400 validate`. The official article warns `SRServerWithLog.bat` arguments may reset after each game update. https://creepyjar.theymes.com/hc/en/starrupture/articles/setting-up-a-star-rupture-dedicated-server-experimental-feature-using-the-steam-app-34
- Steam-client route (install under Library > Tools): one Steam session per account, so it fails if the game is running on another PC under the same account; running the .bat without the Steam client avoids it. Same official article.

## Install folder layout
- Server root (the folder SteamCMD installs into) contains `StarRuptureServerEOS.exe` and `SRServerWithLog.bat` (the .bat appears after anonymous install per the official article). https://creepyjar.theymes.com/hc/en/starrupture/articles/setting-up-a-star-rupture-dedicated-server-experimental-feature-using-the-steam-app-34
- The real UE shipping binary lives at `StarRupture\Binaries\Win64\StarRuptureServerEOS-Win64-Shipping.exe`. [HOST/forum] Pterodactyl egg startup command https://eggs.pterodactyl.io/egg/games-starrupture-wine ; forum post https://steamcommunity.com/app/1631270/discussions/0/695375725078790998/
- Game content and saves under `StarRupture\Saved\` in the server root (Config, Logs, SaveGames). https://hub.docker.com/r/rhavinx/starrupture (volumes section), https://low.ms/knowledgebase/starrupture-server-settings-guide
- Steam's launch metadata for the server: single entry, executable `StarRuptureServerEOS.exe`, arguments `-Log`, type server, windows. https://api.steamcmd.net/v1/info/3809400

## Executable and process names
- Launcher/entry: `StarRuptureServerEOS.exe` (Steam launch entry, what the official .bat starts, what hosts tell you to firewall). https://api.steamcmd.net/v1/info/3809400 ; https://allthings.how/how-to-host-a-starrupture-dedicated-server-on-pc-without-breaking-your-save/
- Shipping process: `StarRuptureServerEOS-Win64-Shipping.exe` (the egg runs this directly under Wine, log at `StarRupture/Saved/Logs/StarRupture.log`, "running" when console shows `OnUpdateSessionComplete`). https://eggs.pterodactyl.io/egg/games-starrupture-wine
- The AlienX modloader README refers to `StarRuptureGameSteam-Win64-Shipping.exe` in `Binaries\Win64` and says the dedicated-server zip goes beside it. This looks like the client/Steam binary name and conflicts with the server name above; the same README says server builds are "dedicated server only". https://github.com/AlienXAXS/StarRupture-ModLoader , https://github.com/AlienXAXS/StarRupture-Plugin-ServerUtility
- **Which exe stays running on Windows (launcher vs shipping) was not documented anywhere I could open.** The official .bat uses `start .\StarRuptureServerEOS.exe`, so the launcher is detached. UNVERIFIED, needs a real install check (a panel must probably match `StarRuptureServerEOS-Win64-Shipping.exe`, and must not kill by image name `StarRuptureServerEOS*`).

## Ports and protocols
- Game port: default 7777, set with `-port=7777` (case in docs: `-port=`, `-Port=`; UE parsing is case-insensitive in practice, but see UNVERIFIED). Official article. UDP for gameplay: https://hub.docker.com/r/struppinet/starrupture-dedicated-server , https://low.ms/knowledgebase/starrupture-server-settings-guide ("UDP 7777").
- The same game port **also serves TCP for the in-game "Manage Server" flow** ("gameplay will use UDP, the manage server functionality will use TCP"). https://hub.docker.com/r/struppinet/starrupture-dedicated-server ; https://github.com/indifferentbroccoli/starrupture-server-docker ; https://allthings.how/how-to-host-a-starrupture-dedicated-server-on-pc-without-breaking-your-save/
- SECURITY: that TCP management endpoint (the game's built-in HTTP server) has an unauthenticated remote code execution flaw per the AlienX plugin README ("Blocks an exploit in the game's built-in HTTP server that allows unauthenticated remote code execution"). https://github.com/AlienXAXS/StarRupture-Plugin-ServerUtility . The Docker images (rhavinx 8 Feb 2026 changelog) disabled the in-game manager and say to forward only UDP 7777. https://hub.docker.com/r/rhavinx/starrupture , https://github.com/indifferentbroccoli/starrupture-server-docker . The vendor-side fix status is UNVERIFIED (the announcement page https://wiki.starrupture-utilities.com/en/dedicated-server/Vulnerability-Announcement is client-rendered and returned only a title).
- Query port 27015: appears as `-QueryPort=`/`SR_QUERY_PORT` default in a Docker image and in host guides, but the XGamingServer article itself says it "is not in the official guide". The AlienX plugin makes 27015 (UDP A2S + TCP RCON, `-RconPort`) work only when that mod is installed. https://hub.docker.com/r/nitje/starrupture_dedicated_server ; https://xgamingserver.com/blog/starrupture-dedicated-server-configuration-guide/ ; https://github.com/AlienXAXS/StarRupture-Plugin-ServerUtility . LOW.MS says `-QueryPort=` exists "only when changing ports" https://low.ms/knowledgebase/starrupture-server-settings-guide (host claim). Whether the vanilla server opens any query port: UNVERIFIED.
- 30010/TCP: appears as `SR_MANAGER_PORT` in one Docker compose (nitje). 30010 is also the Unreal Remote Control web API default (https://dev.epicgames.com/documentation/unreal-engine/remote-control-quick-start-for-unreal-engine ), and the egg starts with `-RCWebControlDisable -RCWebInterfaceDisable` (the opposite of Epic's `-RCWebControlEnable -RCWebInterfaceEnable`). Whether StarRupture really uses 30010 for Manage Server: UNVERIFIED.
- EOS ports 27031-27036 UDP: one blog only; UNVERIFIED, do not use. https://xgamingserver.com/blog/starrupture-dedicated-server-configuration-guide/
- `-multihome=<ip>` (also `-MULTIHOME=0.0.0.0`) to bind an interface: from forum and host guides. https://steamcommunity.com/app/1631270/discussions/0/695375725078790998/ , https://allthings.how/how-to-host-a-starrupture-dedicated-server-on-pc-without-breaking-your-save/
- Conflicting claim "UDP 27015 game, 27016 query" (supercraft/other host) is contradicted by every other source; ignore. (Seen via search summary, page not opened: https://supercraft.host/wiki/starrupture/dedicated-server-setup )
- Router: no hairpin NAT means local players cannot join via the public IP; "does not support local-address connections". https://github.com/indifferentbroccoli/starrupture-server-docker

## Minimal working start command
Official: `start .\StarRuptureServerEOS.exe -Log -port=7777` (first line of `SRServerWithLog.bat`; `-Log` = log window, `-port` = network port). https://creepyjar.theymes.com/hc/en/starrupture/articles/setting-up-a-star-rupture-dedicated-server-experimental-feature-using-the-steam-app-34

Hardened variant used by the Pterodactyl egg (Wine): `-Log -Port=7777 -RCWebControlDisable -RCWebInterfaceDisable`. https://eggs.pterodactyl.io/egg/games-starrupture-wine . Whether these two flags are honoured by StarRupture and close the TCP hole: UNVERIFIED. The community-mod route is `-SessionName="X" -SaveGameInterval=N [-RconPort= -RconPassword=]` which bypasses DSSettings.txt. https://github.com/AlienXAXS/StarRupture-Plugin-ServerUtility

Other args seen (single-source, treat as optional): `-ServerName="..."` (allthings.how, UNVERIFIED), `-multihome=<ip>`, map name `/Game/Chimera/Maps/DedicatedServerStart` (forum Wine post).

## First-run behaviour and the DSSettings.txt file
- Starting the exe with nothing configured gives an idle server with **no world**. A world is created either (a) from a game client: main menu > **Manage Server** > enter IP:port > set management password > New Game / Load Game > Start Game, then players use Join Game > Dedicated Server, or (b) via `DSSettings.txt`. https://low.ms/knowledgebase/starrupture-getting-started ; https://allthings.how/how-to-host-a-starrupture-dedicated-server-on-pc-without-breaking-your-save/ ; https://xgamingserver.com/blog/starrupture-dssettings-txt-configuration-guide/
- After a restart or crash the server returns to idle unless DSSettings autoloads a save. https://allthings.how/how-to-host-a-starrupture-dedicated-server-on-pc-without-breaking-your-save/
- `DSSettings.txt` is a JSON file in the **server root next to `StarRuptureServerEOS.exe`**; the user creates it (the Pterodactyl installer writes one; whether the server writes it by itself on first run is UNVERIFIED). Default content shown by hosts (all values are strings): `{"SessionName":"MySaveGame","SaveGameInterval":"300","StartNewGame":"false","LoadSavedGame":"true","SaveGameName":"AutoSave0.sav"}`. https://xgamingserver.com/blog/starrupture-dssettings-txt-configuration-guide/ ; https://low.ms/knowledgebase/starrupture-server-settings-guide ; egg default uses SessionName "StarRuptureServer" https://eggs.pterodactyl.io/egg/games-starrupture-wine
- Behaviour: new world = `StartNewGame:"true"`, `LoadSavedGame:"false"`; afterwards flip to `"false"`/`"true"` or the world is recreated on each start. `SaveGameInterval` seconds (hosts suggest 180 to 600). `SaveGameName` case-sensitive, includes `.sav`. SessionName names the save folder (docker readme says max 20 characters). Sources: same two hosts + https://github.com/indifferentbroccoli/starrupture-server-docker . (Full key list is the next research step; this file only records existence.)
- The AlienX plugin states the save name on the command-line route is always `AutoSave0.sav`. https://github.com/AlienXAXS/StarRupture-Plugin-ServerUtility
- Known issue: after loading a save there may be no popup that the server started (official article); "Web Remote Call deserialization error ... DedicatedServerSettingsComp does not exist" when Start is clicked more than once (forum, user reports). https://steamcommunity.com/app/1631270/discussions/0/695375725078790998/

## Passwords
- Two files in the server root: `Password.json` (admin / Manage Server) and `PlayerPassword.json` (join password). The server will not read plain text; the value is generated by a third-party site (https://starrupture-utilities.com/passwords/, RSA/OpenSSL based, by AlienX, not affiliated with Creepy Jar). Format reported: single JSON object with a "Hash" key, `{ "Hash": "..." }`. Sources: https://pingplayers.com/knowledgebase/starrupture/how-to-set-admin-and-player-passwords-on-your-starrupture-server , https://www.4netplayers.com/en/wiki/starrupture/set-password/ , https://starrupture-utilities.com/passwords/ (the Docker image writes `{password: ...}` instead, so the exact JSON key is inconsistent: UNVERIFIED).
- Admin password min 6 characters (pingplayers/4netplayers); forum user says 8 characters (UNVERIFIED which is right for the in-game dialog).
- Deleting either file resets that password and does not delete the save. https://low.ms/knowledgebase/reset-change-starrupture-passwords-management-join
- Without `PlayerPassword.json` players can join without a password. https://pingplayers.com/knowledgebase/starrupture/how-to-set-admin-and-player-passwords-on-your-starrupture-server
- Panel implication: setting a join password from the panel requires calling that third-party site or reimplementing its RSA scheme (not documented). UNVERIFIED how the hash is produced.

## Where saves go
- `<server root>\StarRupture\Saved\SaveGames\<SessionName>\AutoSave0.sav` plus matching `AutoSave0.met` (both needed; autosaves rotate AutoSave0, AutoSave1 ... per low.ms). Also a `SaveGames\SaveData.dat` file in the Pterodactyl backup ignore list. https://low.ms/pt/knowledgebase/managing-starrupture-server-saves ; https://low.ms/knowledgebase/starrupture-server-settings-guide ; https://eggs.pterodactyl.io/egg/games-starrupture-wine
- Windows standalone example `C:\servers\StarRupture\StarRupture\Saved\SaveGames\` (search-result summary of an xgamingserver page, page not opened directly). Single-player client saves: `%LOCALAPPDATA%\StarRupture\Saved\SaveGames\` (same summary) or Steam Cloud `userdata\<id>\1631270\remote\Saved\SaveGames` (low.ms managing-saves page). Local saves are numbered AutoSave1.. while the server loads AutoSave0. https://low.ms/pt/knowledgebase/managing-starrupture-server-saves
- Do not copy/upload saves while the server runs (corruption risk). Same page.
- Saves go in the server's own install folder, not a user-profile folder (from the paths above; not seen on a real Windows server by me: UNVERIFIED for Windows).

## Stopping gracefully and saving on exit
- Official article: "does not describe how to save or stop". 
- The Pterodactyl egg stop command is SIGINT (`^C`), i.e. Ctrl+C. https://eggs.pterodactyl.io/egg/games-starrupture-wine . Whether Ctrl+C/closing the window saves first: UNVERIFIED. Autosave runs at `SaveGameInterval`.
- Docker README: "press ESC in the client and click Save, then disconnect before stopping the container" to write a save. https://hub.docker.com/r/rhavinx/starrupture
- With the AlienX ServerUtility plugin + RCON: `save` (forces an immediate save, returns after completion), `stop`/`shutdown` (graceful save-and-shutdown), `stop force`, `players`. https://github.com/AlienXAXS/StarRupture-Plugin-ServerUtility/blob/main/src/RCON_README.md . Requires the mod loader (see below); not vanilla.
- allthings.how says "closing the console window" stops cleanly; unsupported claim: UNVERIFIED. The Docker file sets a 30 s stop grace period (indifferentbroccoli).

## Query protocol / seeing player count
- Vanilla: none documented. No A2S, RCON or REST usable by a panel was found for the unmodded server. (The in-game Manage Server uses an HTTP-style TCP interface on the game port, which is the security hole above; do not build a panel on it. Its API shape is UNVERIFIED anyway.)
- With the AlienX ServerUtility plugin: Source RCON over TCP and Steam A2S over UDP, both on `-RconPort` (default 27015); RCON only starts if both `-RconPort` and `-RconPassword` are given. A2S reports player count, server name, map. https://github.com/AlienXAXS/StarRupture-Plugin-ServerUtility
- Also an optional Admin HTTP JSON API in that plugin (`AdminPanelEnabled=1`, `ApiKey=` in `Plugins\config\ServerUtility.ini`). Same README.

## Mods (short note for step D; details belong to the mods step)
- AlienX StarRupture-ModLoader: server zip extracted into `StarRupture\Binaries\Win64\` (adds `dwmapi.dll` proxy and `ModLoader\` folder); plugins in `ModLoader\Plugins\`, disabled until `Enabled=1` in `Plugins\config\<plugin>.ini`; server console with `-console`. https://github.com/AlienXAXS/StarRupture-ModLoader . ServerUtility plugin install notes: https://github.com/AlienXAXS/StarRupture-Plugin-ServerUtility . Pak mods / UE4SS also mentioned at https://www.gameserverkings.com/knowledge-base/starrupture/starrupture-mods/ (not opened).

## Memory and CPU
- No official figure (official article silent; xgamingserver says no RAM/CPU requirements published). Hosts: minimum 4 cores / 8 GB RAM, recommended 4+ cores / 16 GB (indifferentbroccoli, https://github.com/indifferentbroccoli/starrupture-server-docker ); Pterodactyl and low.ms standard plan 10 GB RAM / 2 threads (https://low.ms/knowledgebase/starrupture-getting-started ). One forum user saw ~22 GB RAM use on an unoptimised server (https://steamcommunity.com/app/1631270/discussions/0/695375725078790998/). Treat as: 8 GB minimum, 16 GB comfortable. Not officially verified.
- Player limit: officially 4 players (host + 3) for co-op per xgamingserver https://xgamingserver.com/blog/starrupture-dedicated-server-configuration-guide/ ; a claim of 8 players "causes desync and crashes" in the same article. Official source for the limit: UNVERIFIED.

## Windows pitfalls
- Windows Firewall: first launch will prompt for `StarRuptureServerEOS.exe`; hosts recommend explicit inbound rules for UDP 7777 only (TCP 7777 only if you accept the Manage Server exposure). https://allthings.how/how-to-host-a-starrupture-dedicated-server-on-pc-without-breaking-your-save/ , https://hub.docker.com/r/rhavinx/starrupture
- Steam must not be running under the same account as the game on another machine/session; official article also says to log out of Steam or close it, "or you won't be able to manage the server in-game". 
- Server needs internet connectivity (docker readme). Redistributable requirements: not documented in any source I opened (UNVERIFIED; UE5 usually needs VC++ runtime, `Engine\Extras\Redist` not confirmed).
- Windows-only; no UPnP info found.

## What a panel must NOT do
- Do not kill by image name `StarRuptureServerEOS.exe` or `*Shipping*` blindly (two-process layout unverified; users may run the game client `StarRuptureGameSteam.exe` on the same PC).
- Do not recommend forwarding TCP 7777 or exposing Manage Server to the internet (unauthenticated RCE reported); prefer DSSettings.txt + UDP 7777 only.
- Do not leave `StartNewGame:"true"` in DSSettings.txt after first creation (recreates world).
- Do not copy or replace save files while running; always handle `.sav` + `.met` as a pair.
- Do not send admin/join passwords to starrupture-utilities.com on a user's behalf without them knowing (the Docker/egg installers do it silently).

## UNVERIFIED list
1. Which Windows process stays running: `StarRuptureServerEOS.exe` (launcher) vs `StarRuptureServerEOS-Win64-Shipping.exe`; exact process name the panel must match.
2. Whether vanilla server opens a Steam query/A2S port (27015) at all, and whether `-QueryPort=` is a real vanilla argument.
3. Whether 30010/TCP is used by Manage Server; whether `-RCWebControlDisable -RCWebInterfaceDisable` are honoured and close the hole.
4. Vendor-side status/details of the remote-code-execution vulnerability (announcement page not readable).
5. Case sensitivity/validity of `-port=` vs `-Port=`, `-multihome`, `-ServerName` (only host/forum sources).
6. Whether the server writes a default `DSSettings.txt` on first run, and the full list/valid values of its keys.
7. Whether DSSettings.txt can be used with a join password, and the exact JSON shape/hash scheme of `Password.json` / `PlayerPassword.json` (`{ "Hash": ... }` vs `{ "password": ... }`), plus admin password minimum length (6 vs 8).
8. Graceful stop on vanilla Windows (does Ctrl+C / closing the console / `taskkill` without /f save?), and whether a final save happens on exit.
9. Real Windows save location on a vanilla Windows server (inferred from Linux/hosted paths) and whether anything is stored in the user profile.
10. Official RAM/CPU requirements and official player cap (4 vs 8).
11. Required Windows redistributables and UPnP behaviour.
12. Current anonymous-login behaviour (all anonymous evidence is from the official article and metadata, not a fresh SteamCMD run; no install was performed in this research).
13. EOS ports (27031-27036) claim.

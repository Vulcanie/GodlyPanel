# New games: research and status

> Browse this folder as a vault starting at [INDEX.md](INDEX.md); every game has a `00-overview.md`.

How each game was added: for every game, separate research passes (server basics, config files, launch arguments, mods) each wrote a
sourced dossier (`01-basics.md` to `04-mods.md` in the game's folder here), then a build pass turned it into a server module
(`src/server/data/games/<id>.js`) and an interface module (`ui/src/catalog/games/<type>.js`), with tests. `05-implementation-notes.md` lists
what was left out and what has to be checked on a real install. `CONVENTIONS.md` is the brief every pass worked from; `candidates.md` is the
ranked list of 20 popular 2026 games with dedicated servers (Steam ids, whether the download is anonymous, sources) the first six came from.

Rule used throughout: a setting, default, dropdown value or argument goes in only if the dossier cites a source for it. Anything unconfirmed
is left unexplained rather than guessed.

## Status (batch 1, 2026-10-14)

| Game | Settings | Launch args | Mods | Run against a real install |
|---|---|---|---|---|
| Unturned | 17 (`Commands.dat`, `WorkshopDownloadConfig.json`) | none (the server id must stay last on the line) | Workshop IDs field | **Yes**: created by the panel, `Commands.dat` applied (name, map, port, password), runs, Stop saves and exits cleanly |
| Abiotic Factor | 50 (`SandboxSettings.ini` 48, `Admin.ini` 2) | 18 | none supported | **Yes**: the game reads the panel's sandbox file (`-SandboxIniPath`), both UDP ports bind, `Admin.ini` is created, Stop is a clean console exit |
| Don't Starve Together | 18 (`cluster.ini`) | 18 | Workshop IDs written to the two Lua files | **Partly**: runs offline (no token), the panel's port flags are used, Stop shuts down cleanly. Not tried with a real cluster token; with no token a game port outside 10998 to 11018 does not bind (the creation warning says so) |
| SCUM | 409 | 5 | none supported | **Yes**, 5 problems found and fixed: the server asks for administrator rights (now started un-elevated so the panel can see and stop it), wrong port list (now `-QueryPort` and a TCP port at +2), first start discards the panel-written settings file (warning added), clean exit needs about 15 s (30 s grace), password appears in its own log (noted) |
| Icarus | 12 | 11 | none supported | **Yes**: the Shipping exe stays running, the game reads the pre-written settings file, the query port answers Steam queries (player counts), the game saves inside the install. Stop ends the process without a shutdown line in the game log |
| StarRupture | 5 | 5 | none supported | **Mostly**: both executables run, settings read from the install root, Stop is clean, spaces in names work. Save location and save-on-stop could not be tested without a game client |

Known limits of the panel for these games: it runs one process per server, so DST has the overworld only (no Caves shard); Stop asks the
window to close and then forces it after 15 seconds (30 for Satisfactory), so DST's `c_shutdown()` and Icarus's slow save are not used.

## Status (batch 2, 2026-10-15)

| Game | Settings | Launch args | Mods | Run against a real install |
|---|---|---|---|---|
| Soulmask | none (its rates file has no explanation anywhere) | 28 | Workshop IDs (`-mod`) | **Yes**: the Shipping exe stays running, not elevated, the local console answers `saveworld 1`. Closing the window alone does not save, so the panel now sends `saveworld 1` before a stop (`telnetSaveCommand`) |
| Garry's Mod | 145 (`server.cfg`) + 2 (`autoexec.cfg`) | 19 | one Workshop collection | **Mostly**: `srcds.exe` stays running, `server.cfg` runs, Stop is clean. Fixed: the console log is `console.log`, not `console.txt` |
| Barotrauma | none (its settings are XML attributes no parser reads) | 15 | manual (`LocalMods`) | No |
| Space Engineers | none | 11 | none | **Yes** (2026-10-17): the panel writes a small config pointing at the game's own premade "Star System" world; the game reports ready for players in about 20 s and answers Steam queries. No real client join tried. Stop force-kills (no save on stop; autosave every 5 minutes) |
| Necesse | none (its config shape fits no parser) | 16 | jar files in a mods folder | No. No graceful stop: its `quit` command cannot be sent |
| Left 4 Dead 2 | 110 (`server.cfg`) | 15 | Workshop addon ids | No |

## Status (batch 3, 2026-10-16)

Research for batch 3 used a cheaper two-stage process: a small model found the authoritative pages (`SOURCES.md` → `sources.md` per game) and then copied facts out of exactly those pages into fixed tables (`EXTRACT.md`), with `NOT FOUND` for gaps instead of guesses. The build step reads the same pages.

| Game | Settings | Launch args | Mods | Run against a real install |
|---|---|---|---|---|
| Squad | none (its `Server.cfg` has comment lines the parser would show as settings) | 14 | Workshop IDs, fetched once at creation | No |
| Arma Reforger | 40 (`server-config.json`) | 26 | none yet (mods go in `game.mods`) | No |
| VEIN | 16 (`Game.ini`) + 39 (`Engine.ini` `vein.*`) | 6 | none (no official support) | No |
| Terraria / tModLoader | 26 (`serverconfig.txt`) | 17 | Workshop ids (SteamCMD) | **Yes** (2026-10-17): installed from the tModLoader GitHub release zip (new install step: consent, GitHub-published SHA-256 required, GitHub hosts only, safe unpack), first start downloads .NET, generates a world and listens on its TCP port. Stop force-kills (`exit` cannot be sent) |

## Research-only dossiers (batch 4, 2026-10-20)

Nothing here is implemented. These are sourced dossiers (`sources.md` plus `01-basics.md` to `04-mods.md` per game, page copies in `raw/`) written by a cheaper model with `NOT FOUND` for gaps, to implement from later. None has been reviewed for accuracy or tried against a real install. Candidate selection: [candidates-batch4.md](candidates-batch4.md); plan: `docs/plans/GAMES_BATCH_4_PLAN.md`.

| Game | Folder | Caveats to resolve before implementing |
|---|---|---|
| Minecraft (vanilla) | `minecraft-vanilla` | Verified-partial on a real install (2026-10-23): install, start, port, status and Stop work; clean save unproven |
| Terraria (vanilla) | `terraria-vanilla` | Verified-partial (2026-10-23): needs XNA Framework 4.0 installed first; start, world, port, Stop work; Stop save unproven |
| The Forest | `theforest` | Verified-partial (2026-10-23): install, config, start, ports, status work; the window close crashes the game and Stop force-kills after 15 s; save unproven |
| Starbound | `starbound` | Built, not registered: app 533830 gives "No subscription" to an anonymous login (needs a Steam account that owns the game) |
| Stormworks | `stormworks` | Built, not registered: app 1247090 is a stub that points to the base game (573090), which needs an owning account |
| Wurm Unlimited | `wurmunlimited` | Verified-partial (2026-10-23): install, world seeded from dist on first start, start, TCP 8070 and UDP 8073, status, wurm.ini read, Stop work; save and players unproven |
| Astroneer | `astroneer` | |
| Eco | `eco` | Wiki blocked; config value types are inferred from defaults |
| Killing Floor 2 | `killingfloor2` | Wiki blocked |
| Stationeers | `stationeers` | Wiki blocked; most `NOT FOUND` |
| Counter-Strike 2 | `counterstrike2` | Built-unverified (2026-10-23): install is 60+ GB, over the test cap; GSLT needed for public listing |
| Team Fortress 2 | `teamfortress2` | Verified-partial (2026-10-23): anonymous install, start without token, TCP+UDP port, config read-back, graceful Stop; srcds also binds UDP 27005; hostname and saves unproven |
| Mount & Blade II: Bannerlord | `bannerlord` | Built, not verified: installs and starts, but no port opens without the token |
| Mordhau | `mordhau` | Verified-partial (2026-10-23): Windows binary and WindowsServer config (not Linux); install, config, start, status, Stop work; query port never bound, save unproven |
| The Isle (Evrima) | `theisle` | Built, unverified (2026-10-23): evrima install works, but the server exits without Epic Online Services credentials |
| Insurgency: Sandstorm | `insurgencysandstorm` | Verified-partial 2026-10-23: starts with no GSLT, map loads |
| Left 4 Dead | `l4d` | Verified-partial 2026-10-23: install, start, hostname and map via A2S, graceful Stop; co-op cap 4 players overrides `+maxplayers 8` |
| No More Room in Hell | `nmrih` | Verified-partial 2026-10-23: install, start, hostname and map via A2S, graceful Stop; also binds UDP 27005 and 27020 |
| Day of Defeat: Source | `dods` | Verified-partial 2026-10-23: install, start, hostname and map via A2S, graceful Stop |
| Fistful of Frags | `fof` | Verified-partial 2026-10-23: `server.cfg` is the file read (hostname proves it), graceful Stop |
| Zombie Panic! Source | `zps` | Verified-partial 2026-10-23: install, start, hostname and map via A2S, graceful Stop |
| BrainBread 2 | `brainbread2` | Verified-partial 2026-10-23: runs on port 8072 (the 27015-27020 limit does not apply), graceful Stop |
| Empires | `empires` | Verified-partial 2026-10-23: the researched default map did not exist; fixed to `con_district402`; start, A2S, graceful Stop |
| Double Action: Boogaloo | `doubleaction` | Verified-partial 2026-10-23: `dab\cfg\server.cfg` is read, start, A2S, graceful Stop |
| Dystopia | `dystopia` | Verified-partial 2026-10-23: starts from `bin\win32` with `-game ..\..\dystopia`, A2S, graceful Stop |
| Insurgency (2014) | `insurgency` | Verified-partial 2026-10-23: `insurgency\cfg\server.cfg` is read, start, A2S, graceful Stop |
| Pirates, Vikings, and Knights II | `pvkii` | Verified-partial 2026-10-23: runs as `srcds_win64.exe` (the `srcds.exe` launcher blocks a graceful Stop), A2S, config read |
| Half-Life Dedicated Server (CS 1.6) | `hlds` | Verified-partial 2026-10-23: install needs the `cstrike` mod step (`updateMod`), config is `cstrike\server.cfg` (not `cfg\`), A2S; no graceful Stop; first start shows a Windows Firewall prompt |
| Black Mesa | `blackmesa` | Verified-partial 2026-10-23: runs as `srcds.exe` (no `srcds_win64.exe`), A2S, config read, graceful Stop |
| Military Conflict: Vietnam | `militaryconflictvietnam` | Verified-partial 2026-10-23: `srcds_x64.exe` confirmed, A2S, config read, graceful Stop |
| SCP: Secret Laboratory | `scpsl` | Verified-partial 2026-10-23: LocalAdmin start line needs `--acceptEULA --useDefault`, A2S, graceful Stop; launch form off |
| Eco | `eco` | Built-unverified 2026-10-23: needs a Strange Loop account to start; not registered |
| Colony Survival | `colonysurvival` | Verified-partial 2026-10-23: config is nested NewOptions/ServerSettings, TCP game port, graceful Stop |
| Rising World | `risingworld` | Verified-partial 2026-10-23: Unity exe (not Java), capitalised property keys, query port = game port - 1, A2S, graceful Stop |
| Warfork | `warfork` | Verified-partial 2026-10-23: wf_server_x64.exe, +set overrides, fs_usehomedir 0, A2S, graceful Stop |
| Natural Selection 2 | `ns2` | Verified-partial 2026-10-23: x64\Server.exe, A2S on port+1, config and log kept in the install, Stop is force-end |
| Chivalry: Medieval Warfare | `chivalry` | Verified-partial 2026-10-23: anonymous install, both UDP ports, graceful Stop; no A2S |
| Hurtworld | `hurtworld` | Verified-partial 2026-10-23: anonymous install, A2S on query port, Stop is force-end |
| Euro Truck Simulator 2 | `ets2` | Verified-partial 2026-10-23: anonymous install, config in data\Euro Truck Simulator 2; needs server_packages from a game copy to start |
| American Truck Simulator | `ats` | Verified-partial 2026-10-23: same as ETS2 |
| Medieval Engineers | `medievalengineers` | Verified-partial 2026-10-23: DedicatedServer64, -console -path, A2S, Stop is force-end |
| PixARK | `pixark` | Verified-partial 2026-10-23: anonymous install 3.7 GB, A2S on query port after about 4 min, graceful Stop |
| Stationeers | `stationeers` | Verified-partial 2026-10-23: headless -LOAD Panel <World>, saves and setting.xml, graceful Stop, no A2S |
| Wreckfest | `wreckfest` | Verified-partial 2026-10-23: Wreckfest_x64.exe in root, -server_set ports, log.txt, savestemp, clean Stop |
| Rising Storm 2: Vietnam | `risingstorm2` | Verified-partial 2026-10-23: needs VC++ 2012 x64 runtime, -log, A2S, graceful Stop; 20 GB install |
| Operation: Harsh Doorstop | `ohd` | Verified-partial 2026-10-23: current maps like Jaziira_AASSmall, A2S, Stop is a force-end |
| Miscreated | `miscreated` | Verified-partial 2026-10-23: start-line path bug fixed, A2S on game port + 2, hosting.cfg, server.log, graceful Stop |
| Craftopia | `craftopia` | Verified-partial 2026-10-23: ServerSetting.ini, saves, graceful Stop, no A2S; log is outside the server folder |
| Ballistic Overkill | `ballisticoverkill` | Verified-partial 2026-10-23: BODS.exe, config.txt, A2S on the query port, graceful Stop |
| Assetto Corsa Competizione | `acc` | Built, not registered: app 1430110 gives No subscription to an anonymous login |
| Assetto Corsa | `assettocorsa` | Built, not registered: app 302550 gives No subscription to an anonymous login |
| Killing Floor | `killingfloor` | Built, not registered: app 215350 gives No subscription to an anonymous login |
| Red Orchestra: Ostfront 41-45 | `redorchestra` | Built, not registered: app 223240 gives No subscription to an anonymous login |
| Blade Symphony | `bladesymphony` | Built, not registered: the anonymous install has only binaries; content needs the base game |
| Age of Chivalry | `ageofchivalry` | Verified-partial 2026-10-23: srcds line, aoc_siege loads, graceful Stop; A2S blocked by a Windows rule |
| HumanitZ | `humanitz` | Verified-partial 2026-10-23: launcher exe, ini from the reference, log path; A2S blocked by a Windows rule |
| Survive the Nights | `survivethenights` | Verified-partial 2026-10-23: panel writes Config/ServerConfig.txt (port, UPnP off) |
| Tower Unite | `towerunite` | Verified-partial 2026-10-23: root launcher exe fixed; stalls at Steam init without login tokens |
| RuneScape: Dragonwilds | `runescapedragonwilds` | Duplicate: already the panel template `dragonwilds` |
| The Front | `thefront` | Verified-partial 2026-10-23: TheFrontServer.exe holds 4 ports, A2S on game port +2 |
| Day of Dragons | `dayofdragons` | Verified-partial 2026-10-23: only -QueryPort is honoured, no game port |
| HYPERCHARGE: Unboxed | `hyperchargeunboxed` | Verified-partial 2026-10-23: runs via PlayFab, ports not honoured |
| Day of Infamy | `dayofinfamy` | Verified-partial 2026-10-23: srcds_x64.exe, ports bound, A2S blocked by a Windows rule |
| Killing Floor 2 | `killingfloor2` | Verified-partial 2026-10-23: needs the VC++ 2012 runtime, otherwise idle with no port |
| Empyrion | `empyrion` | Verified-partial 2026-10-23: dedicated.yaml read from the install root, ports honoured |
| Arma 3 | `arma3` | Built, not registered: anonymous install fails (No subscription) |
| ATLAS | `atlas` | Verified-partial 2026-10-23: 33 GB, binds only the query port without a seamless-grid setup |
| Motor Town | `motortown` | Built, not registered: needs an owning account plus beta code |
| Pavlov VR | `pavlovvr` | Not built: Linux-only server |
| Quake Live | `quakelive` | Not built: Linux-only server |
| IOSoccer | `iosoccer` | Verified-partial 2026-10-23: runs as `srcds_win64.exe` (no `srcds.exe` in the install), A2S, config read, graceful Stop |
| BATTALION: Legacy | `battalionlegacy` | Verified-partial 2026-10-23: exe is in the install root (a launcher), `-Port` sets the game port, A2S on the query port; no graceful Stop |
| Nuclear Dawn | `nucleardawn` | Built, not registered: the anonymous install has no Windows server (no `ndsrv.exe`) |
| Team Fortress 2 Classified | `tf2classified` | Built, not registered: installs, but the server exits at once ("No SteamApps connection.") |
| Pavlov VR | `pavlovvr` | Linux-only server; wiki read through summaries; conflicts on RefreshListTime, `-PORT`, RCON location |
| Motor Town | `motortown` | Server exe, anonymous SteamCMD install, Windows depot and config keys all unverified |

No dedicated-server app was found for Ready or Not, Hell Let Loose or Medieval Dynasty, so they have no dossier. DayZ needs a Steam login.

## Research-only dossiers (batch 5, 2026-10-20)

Same method and caveats as batch 4: nothing implemented, nothing reviewed or tried on a real install. The 20 games, their platform and confidence are listed in [INDEX.md](INDEX.md#researched-not-implemented-batch-5-2026-10-20); candidate selection in [candidates-batch5.md](candidates-batch5.md). Folders: `css`, `dods`, `hl2dm`, `ns2`, `nmrih`, `svencoop`, `empyrion`, `avorion`, `starbound`, `stormworks`, `chivalry`, `dayofinfamy`, `hurtworld`, `miscreated`, `wurmunlimited`, `medievalengineers`, `colonysurvival`, `atlas`, `risingstorm2`, `killingfloor`. Resolve the conflicts listed in each overview before building (notably Killing Floor's server app id, Stormworks' app id, and anonymous login for Starbound, Hurtworld and Killing Floor).

## Research-only dossiers (batch 6, 2026-10-21)

Same method and caveats as batches 4 and 5: nothing implemented, nothing reviewed or tried on a real install. The 20 games, their platform and confidence are listed in [INDEX.md](INDEX.md#researched-not-implemented-batch-6-2026-10-21); candidate selection in [candidates-batch6.md](candidates-batch6.md). Folders: `arma3`, `insurgency`, `hlds`, `l4d`, `blackmesa`, `zps`, `fof`, `nucleardawn`, `quakelive`, `acc`, `ets2`, `ats`, `risingworld`, `pvkii`, `pixark`, `ageofchivalry`, `warfork`, `wreckfest`, `brainbread2`, `assettocorsa`. Resolve the conflicts listed in each overview before building (notably the Left 4 Dead server app id, anonymous login for Age of Chivalry, BrainBread 2 and Assetto Corsa, and Wreckfest's save-dir switch).

## Research-only dossiers (batch 7, 2026-10-21)

Same method and caveats as batches 4 to 6: nothing implemented, nothing reviewed or tried on a real install. The 20 games, their platform and confidence are listed in [INDEX.md](INDEX.md#researched-not-implemented-batch-7-2026-10-21); candidate selection in [candidates-batch7.md](candidates-batch7.md). Folders: `scpsl`, `ohd`, `redorchestra`, `dystopia`, `empires`, `humanitz`, `survivethenights`, `thefront`, `towerunite`, `craftopia`, `ballisticoverkill`, `bladesymphony`, `battalionlegacy`, `doubleaction`, `hyperchargeunboxed`, `iosoccer`, `militaryconflictvietnam`, `runescapedragonwilds`, `dayofdragons`, `tf2classified`. Several server app ids are unconfirmed or conflict (HYPERCHARGE: Unboxed, IOSoccer, Day of Dragons, TF2 Classified, Blade Symphony); resolve them against a live Steam page before building.

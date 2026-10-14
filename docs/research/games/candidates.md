# GodlyPanel game candidates (researched 2026-10-14)

How the data was gathered
- Server app ids, Windows/Linux, depot sizes, `freetodownload` flag: Steam's own app metadata via https://api.steamcmd.net/v1/info/<appid> (mirror of the Steam PICS/appinfo data). SteamDB and the Valve wiki returned HTTP 403, so SteamDB was not used directly.
- "Anonymous" = the server app is a Steam "Tool" with `freetodownload=1` AND at least one doc/guide shows `+login anonymous`. Where only the metadata says it, that is stated.
- Popularity: monthly peak concurrent players from https://steamcharts.com/app/<storeAppId> (Jan to Sep 2026 rows, which were live as of this research). Peaks are monthly maxima, so the date is a month, not a day.
- Sizes are the Windows depot manifest sizes (uncompressed install) from Steam. RAM figures are mostly from community/hosting guides unless stated, so treat them as rough.
- Anything not confirmed is marked UNVERIFIED.

## Ranked table (suitability = popularity AND ease: anonymous, Windows binary, plain config files)

| # | Game | Store app id | Server app id | Anonymous? | Win binary | Install size | 2026 peak (month) | Mods for server |
|---|------|-------------|---------------|-----------|-----------|-------------|-------------------|-----------------|
| 1 | Don't Starve Together | 322330 | 343050 | Yes | Yes | ~4.5 GB | 121,538 (Jun 2026, also all-time) | Yes, Workshop via lua file |
| 2 | Terraria (tModLoader server) | 105600 (tModLoader 1281930) | 1281930 (tModLoader, free app) | Likely yes (UNVERIFIED, see notes) | Yes | ~0.2 GB (tML) | 226,559 (Feb 2026) | Yes, Workshop mods via modpack |
| 3 | Unturned | 304930 | 1110390 | Yes | Yes | ~1.3-2.9 GB | 27,544 (May 2026) | Yes, Workshop IDs in json |
| 4 | Abiotic Factor | 427410 | 2857200 | Yes | Yes (Windows-only officially) | ~3.0 GB | 10,602 (May 2026); all-time 29,195 (Jul 2025) | UNVERIFIED |
| 5 | Icarus | 1149460 | 2089300 | Yes (official wiki: no license needed) | Yes | ~10.4 GB | 44,023 (Jan 2026) | UNVERIFIED |
| 6 | Left 4 Dead 2 | 550 | 222860 | Yes | Yes (srcds.exe) | ~9.7 GB | 45,681 (Jul 2026) | Yes via SourceMod/Metamod; Workshop UNVERIFIED |
| 7 | SCUM | 513710 | 3792580 | Yes | Yes (Windows-only) | ~15.4 GB | 22,475 (Jan 2026) | UNVERIFIED |
| 8 | Squad | 393380 | 403240 | Yes | Yes | ~14.9 GB | 23,804 (May 2026) | Yes (Workshop), details UNVERIFIED |
| 9 | Arma Reforger | 1874880 | 1874900 | Yes | Yes | ~10.2 GB | 24,632 (Mar 2026, all-time) | Yes, Workshop mods in JSON config |
| 10 | StarRupture | 1631270 | 3809400 | Yes | Yes (Windows-only tool) | ~21.3 GB (Steam reports ~2.65 GB download) | 27,974 (Jan 2026, all-time) | Not mentioned |
| 11 | Garry's Mod | 4000 | 4020 | Yes | Yes | ~6.9 GB | 39,188 (May 2026) | Yes, Workshop collection |
| 12 | VEIN | 1857950 | 2131400 | Yes | Yes | ~11.2 GB | 3,742 (Jan 2026); all-time 11,042 (Nov 2025) | Some (UNVERIFIED) |
| 13 | Necesse | 1169040 | 1169370 | Yes | Yes (bundled Java) | ~0.2 GB | 11,207 (Aug 2026); all-time 29,192 (Sep 2025) | UNVERIFIED |
| 14 | Barotrauma | 602960 | 1026340 | Yes | Yes | ~0.16 GB (plus game data, see notes) | 8,841 (May 2026) | Yes, Workshop |
| 15 | Space Engineers | 244850 | 298740 | Yes | Yes (Windows-only) | ~8.4 GB | 7,827 (May 2026) | Yes, Workshop IDs in cfg; Torch plugins |
| 16 | The Forest | 242760 | 556450 | Yes | Yes (Windows-only) | ~1.7 GB | 19,789 (Jan 2026) | No (UNVERIFIED) |
| 17 | Soulmask | 2646460 | 3017310 (Windows), 3017300 (Linux) | Yes (metadata); guides agree | Yes | ~5.6 GB | 43,852 (Apr 2026) | UNVERIFIED |
| 18 | DayZ | 221100 | 223350 | NO (needs a Steam login; see notes) | Yes | ~4 GB | 74,297 (Apr 2026) | Yes, Workshop |
| 19 | Insurgency: Sandstorm | 581320 | 581330 | Yes | Yes | ~4.9 GB | 2,595 (May 2026) | Yes (mod.io) |
| 20 | Dune: Awakening (self-hosted) | 1172710 | "Dune: Awakening Self-Hosted Server" Steam tool, id UNVERIFIED | NO (Steam account + game + Funcom token) | Windows only, needs Windows Pro + Hyper-V | ~100 GB SSD recommended | 23,250 (Sep 2026); all-time 189,126 (Jun 2025) | UNVERIFIED |

Verdict on ranking: #1-#10 are the best fits (anonymous, Windows binary, plain text/ini/json/lua/bat config). #11-#17 are fine but have smaller 2026 audiences, or heavier setup. #18-#20 have friction (login required, VM requirement).

### Also checked, not in the 20
- Counter-Strike 2 (730): the server is the game app itself, anonymous works for the dedicated server on the CS2 app via `-dedicated`; huge audience but "server" hosting needs a GSLT token and is mostly Linux/community-plugin driven. UNVERIFIED as a server tool.
- Factorio (427520): peak 31,246 (Jan 2026). The headless server is NOT on Steam, it is downloaded from factorio.com. Needs HTTP download support, not SteamCMD. Strong candidate if GodlyPanel gets a non-Steam installer.
- Hytale: released Jan 2026 per hosting guides; server is a jar + Assets.zip from the official Hytale Downloader, needs Java 25 and a Hytale account auth, UDP 5520 (QUIC). NOT on Steam, so no SteamCMD. Peak players UNVERIFIED. Third-party sources only: https://low.ms/blog/how-to-host-a-hytale-dedicated-server , https://dathost.com/blog/how-to-host-a-hytale-dedicated-server-easy
- Subnautica 2 (EA launched 14 May 2026, ~450k to 650k peak per press, sources disagree): NO official dedicated server as of the latest source found (June to Aug 2026). Co-op is host-based. Not a candidate yet. Re-check later.
- Wardogs (EA, ~400k peak 12 Sep 2026, source comicbook.com): no mention of dedicated or self-hosted servers. UNVERIFIED, probably no.
- Astroneer: server 728470 anonymous, Windows, ~2.6 GB, but 2026 peak only 7,150 (Apr 2026).
- Motor Town: Behind the Wheel: server 2223650, Windows, but 2026 peak only 2,864 (May 2026).
- Eco (server 739590), Stationeers (600760), Sunkenland, ASKA, Nightingale: all under ~3k peak in 2026, anonymous Windows servers exist for Eco and Stationeers.
- Ready or Not (peak 37,623 Mar 2026), Hell Let Loose (10,639 Mar 2026), Medieval Dynasty (7,384 Jan 2026), Mount & Blade II Bannerlord (50,302 Aug 2026): server app ids NOT verified in this pass (search returned nothing). Worth a follow-up.
- Schedule I (peak 42,132 Jan 2026): no dedicated server verified.

## Top-10 detail sections

### 1. Don't Starve Together
- Store app id: 322330. Server: "Don't Starve Together Dedicated Server", app 343050 (Steam Tool, freetodownload=1).
- Anonymous: YES. Klei wiki shows `login anonymous` + `app_update 343050 validate` (omit `validate` if you have mods, it deletes them). Owning the game is only needed for the cluster token (an online server needs `cluster_token.txt` from the Klei account, generated on Klei's site or with `TheNet:GenerateClusterToken()`).
- Windows: yes (`bin64/dontstarve_dedicated_server_nullrenderer_x64.exe`, also 32-bit build).
- Size: ~4.45 GB Windows depot. RAM: not stated officially, UNVERIFIED (small, roughly 1-2 GB per shard; with a Caves shard you run two processes).
- Config: `cluster.ini`, `cluster_token.txt`, per-shard `server.ini`, `worldgenoverride.lua`, `modoverrides.lua`, `adminlist.txt`. Ports: UDP 10999 default (set in server.ini), plus master_server_port/authentication_port when running multiple shards.
- Popularity: peak 121,538 on Jun 2026 (steamcharts; also all-time peak), 100,058 in Jul 2026, avg 24k-40k.
- Mods: yes. `dedicated_server_mods_setup.lua` (Workshop IDs or collections) + `modoverrides.lua`.
- Sources: https://dontstarve.wiki.gg/wiki/Dedicated_Server , https://dontstarve.wiki.gg/wiki/Guides/Simple_Dedicated_Server_Setup , https://api.steamcmd.net/v1/info/343050 (and https://steamcharts.com/app/322330 for the numbers)

### 2. Terraria / tModLoader
- Store app id: 105600 (Terraria). tModLoader: app 1281930 (type Game, parent 105600, `isfreeapp=1`, windows/linux/macos, ~207 MB Windows depot, Workshop visible).
- Vanilla Terraria server is not a separate Steam tool (Steam metadata for 105600 has no server app). Vanilla dedicated server zip comes from terraria.org/wiki (UNVERIFIED from here); the Steam-route server is tModLoader.
- Anonymous: the app is free, and third-party guides show `+login anonymous +app_update 1281930`. The OFFICIAL tModLoader readme instead shows `install-tml --username <steam user>` and does not say whether anonymous works, and it only documents Linux/Docker. So: UNVERIFIED for anonymous, plausible. Test with a real SteamCMD run before building on it.
- Windows: tModLoader ships `start-tModLoader.bat` (Windows launch entry); third-party guides run `TerrariaServer.exe -config serverconfig.txt`.
- RAM: UNVERIFIED (modded worlds commonly 2-4 GB+).
- Config: `serverconfig.txt` (world, worldname, autocreate, port 7777, maxplayers, password), mods via `Mods/enabled.json` + `install.txt` made from a Workshop modpack.
- Popularity: peak 226,559 in Feb 2026 and 220,557 in Jan 2026 (steamcharts, game launch of a big 1.4.5 era update is the likely cause, UNVERIFIED), 75,592 in Sep 2026.
- Mods: yes, large tModLoader Workshop ecosystem.
- Sources: https://docs.tmodloader.net/docs/stable/md__github_workspace_src_t_mod_loader__terraria_release_extras__dedicated_server_utils__r_e_a_d_m_e.html , https://github.com/tModLoader/tModLoader/wiki/Starting-a-modded-server , https://api.steamcmd.net/v1/info/1281930

### 3. Unturned
- Store app id: 304930. Server: "Unturned Dedicated Server", app 1110390 (Tool, freetodownload=1, windows+linux, parent 304930).
- Anonymous: YES per Steam metadata (no ownership flags). Official docs page only says SteamCMD is an option and does not show the login line. Also available through the Steam Tools list or the `ServerHelper.bat` launcher.
- Windows: yes (`ServerHelper.bat`).
- Size: Windows depot ~1.24 GB plus common depots ~1.6 GB, so roughly 1.3-2.9 GB. RAM: not stated, UNVERIFIED (small, ~1-2 GB).
- Config: `Commands.dat` (map, password, max players), `Config.txt` (difficulty/advanced), `WorkshopDownloadConfig.json` (mods). Port example 27015. Servers live under `...\U3DS\Servers\`.
- Popularity: peak 27,544 in May 2026, ~13k-21k most other months (steamcharts). Free to play, old but steady.
- Mods: yes, Workshop file IDs in `WorkshopDownloadConfig.json`, server downloads and updates them at startup.
- Sources: https://docs.smartlydressedgames.com/en/stable/servers/server-hosting.html , https://api.steamcmd.net/v1/info/1110390 , https://steamcharts.com/app/304930

### 4. Abiotic Factor
- Store app id: 427410. Server: "Abiotic Factor Dedicated Server", app 2857200 (Tool, freetodownload=1, Windows 64-bit, parent 427410).
- Anonymous: YES. Official dedicated-server wiki (DFJacob) shows `login anonymous` + `app_update 2857200 validate`.
- Windows: yes, officially Windows-only ("Dedicated Server is currently available for Windows Only"). Executable `AbioticFactorServer.exe`, launch args `-log -newconsole`.
- Size ~3.0 GB. RAM: only a hosting-vendor figure (IONOS: at least 2-3 GB RAM, 4 cores). UNVERIFIED officially. Official docs advise max 6 players (flag allows 1-24).
- Config: launch parameters `-PORT=7777 -QueryPort=27015 -ServerPassword= -AdminPassword= -MaxServerPlayers= -SteamServerName= -WorldSaveName=Cascade`; `Admin.ini` (Moderators by SteamID) in `AbioticFactor\Saved\SaveGames\Server\`; `SandboxSettings.ini` in `Saved\SaveGames\Server\Worlds\<World>\`.
- Popularity: 2026 peaks 10,602 (May), 7,778 (Jan); all-time peak 29,195 (Jul 2025). Smaller than DST/Terraria but very active hosting community.
- Mods: UNVERIFIED (not mentioned in official quickstart).
- Sources: https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki , https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki/Technical-%E2%80%90-Launch-Parameters , https://abioticfactor.wiki.gg/wiki/Sandbox_Settings

### 5. Icarus
- Store app id: 1149460. Server: "Icarus Dedicated Server", app 2089300 (Tool, parent 1149460).
- Anonymous: YES. RocketWerkz's official server wiki: `login anonymous`, `app_update 2089300 validate`, "doesn't require an Icarus license".
- Windows: yes (`IcarusServer.exe`; docs are Windows-first).
- Size ~10.4 GB (public branch manifest). RAM: not in the official page, UNVERIFIED.
- Config: `ServerSettings.ini` in `Icarus\Saved\Config\WindowsServer\`, launch params `-Log -PORT=17777 -QueryPort=27015`; admin/join passwords not set by default.
- Popularity: 2026 peaks 44,023 (Jan), 28,579 (Mar), 23,190 (Jul), 15,717 (Sep) (steamcharts).
- Mods: UNVERIFIED (not mentioned).
- Sources: https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Server-Setup , https://github.com/RocketWerkz/IcarusDedicatedServer/wiki , https://api.steamcmd.net/v1/info/2089300

### 6. Left 4 Dead 2
- Store app id: 550. Server: "Left 4 Dead 2 Dedicated Server", app 222860 (Tool, freetodownload=1).
- Anonymous: YES (guides show `+login anonymous +app_update 222860 validate`). Caveat: a Steam forum thread reports an "Invalid platform" error with anonymous on non-Windows hosts; on Windows it is fine.
- Windows: yes, `srcds.exe`. Size ~9.7 GB (9.55 GB common + 0.16 GB Windows).
- RAM: UNVERIFIED, tiny by modern standards (1-2 GB).
- Config: `left4dead2/cfg/server.cfg` (hostname, rcon_password, sv_lan 0), port UDP 27015 (range 27015-27050). SourceMod + Metamod optional.
- Popularity: peaks 45,681 (Jul 2026), 43,087 (Jun 2026), 39k-42k most months.
- Mods: SourceMod/Metamod plugins and addons; Workshop loading details UNVERIFIED.
- Sources: https://kb.firedaemon.com/support/solutions/articles/4000086975-left-4-dead-2-source , https://zap-hosting.com/guides/docs/dedicated-windows-l4d2 , https://api.steamcmd.net/v1/info/222860

### 7. SCUM
- Store app id: 513710. Server: "SCUM Server", app 3792580 (Tool, freetodownload=1, Windows 64-bit, parent 513710). (An old 2018 Steam thread cites 911460, which is outdated, ignore.)
- Anonymous: YES. SCUM community wiki: `steamcmd +force_install_dir <dir> +login anonymous +app_update 3792580 +quit`.
- Windows: yes, Windows-only (`SCUM\Binaries\Win64\SCUMServer.exe`, arg `-log`; needs VC++ 2012/2013/2015-2022 redists and DirectX runtime).
- Size ~15.4 GB installed (about 7.1 GB download). RAM: at least 8 GB to start (community wiki), rises with players/mods. Disk: 15 GB free.
- Config: `ServerSettings.ini`, `-MaxPlayers` launch arg overrides; ports UDP 7777/7778/7779 (+ optional TCP 7777 RCON). Another guide lists 27165/27167, conflict, check.
- Popularity: peaks 22,475 (Jan 2026), 19,154 (Feb), 18,567 (Jun); 15,708 (Sep).
- Mods: UNVERIFIED (wiki says only that some mods increase RAM).
- Sources: https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup , https://api.steamcmd.net/v1/info/3792580 , https://steamcharts.com/app/513710

### 8. Squad
- Store app id: 393380. Server: "Squad Dedicated Server", app 403240 (Tool, freetodownload=1, windows+linux).
- Anonymous: YES (Steam metadata; third-party guides show `+login anonymous ... +app_update 403240 validate`). Official Offworld wiki page itself was not reachable (HTTP 402).
- Windows: yes, `SquadServer.exe`. Size ~14.9 GB.
- RAM: no figure found, UNVERIFIED. Strong CPU recommended for 80-100 players.
- Config (third-party): `ServerConfig/Server.cfg`, `Admins.cfg`, `Rcon.cfg`, map rotation; ports UDP 7787 game, UDP 27165 query, TCP 21114 RCON.
- Popularity: 2026 peaks 17,639-23,804 every month, steady (steamcharts); all-time 38,573 (Sep 2024).
- Mods: Workshop mods exist, server details UNVERIFIED.
- Sources: https://api.steamcmd.net/v1/info/403240 , https://esagames.ro/how-to-make-a-squad-server.php , https://steamcharts.com/app/393380 (official docs not retrieved)

### 9. Arma Reforger
- Store app id: 1874880. Server: "Arma Reforger Server", app 1874900 (Tool, freetodownload=1, windows+linux).
- Anonymous: YES (metadata; guides show anonymous login, no paid account needed).
- Windows: yes (`ArmaReforgerServer`, JSON config passed at launch). Size ~10.2 GB.
- RAM: guides disagree: GameCP 6 GB (small) to 12 GB (64-128 players); XGamingServer 8 GB minimum; one guide says 2-4 GB for a small vanilla server. Conservative: 8 GB, 4 cores, 20 GB disk.
- Config: JSON server config; ports UDP 2001 game, 17777 query.
- Popularity: all-time peak 24,632 in Mar 2026; 19,952-24,632 every month of 2026. One of the strongest steady 2026 audiences.
- Mods: yes, Workshop mods listed in the JSON config (disk usage grows).
- Sources: https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting (official, returned 403 to the fetch tool; reachable in a browser) , https://api.steamcmd.net/v1/info/1874900 , https://gamecp.com/games/arma-reforger/hosting-guide

### 10. StarRupture
- Store app id: 1631270 (Creepy Jar). Server: "StarRupture Dedicated Server (Experimental)", app 3809400 (Tool, freetodownload=1, Windows only, parent 1631270).
- Anonymous: YES. Official Creepy Jar support article: install via Steam "Tools" or SteamCMD "with a Steam login or anonymous login"; guides show `+login anonymous +app_update 3809400 validate`. Running the tool from the Steam client on another PC with the same account as the game does not work, run the `.bat` instead.
- Windows: yes, `StarRuptureServerEOS.exe -Log`, launcher `SRServerWithLog.bat` (edit the first line for args like `-Port=7777 -QueryPort=27015`, may reset after updates).
- Size 21.3 GB installed (Steam reports ~2.65 GB download value). RAM: not listed on the official page, UNVERIFIED.
- Popularity: launch EA Jan 2026, peak 27,974 in Jan 2026, then 13,101 (Feb), 9,756 (Apr), 2,960 (Sep 2026). Hype faded, but update-driven spikes are likely.
- Mods: not mentioned.
- Sources: https://creepyjar.theymes.com/hc/en/starrupture/articles/setting-up-a-star-rupture-dedicated-server-experimental-feature-using-the-steam-app-34 , https://api.steamcmd.net/v1/info/3809400 , https://steamcharts.com/app/1631270

## Notes for #11-#20 (shorter)

- 11 Garry's Mod: app 4020, ~6.9 GB, anonymous per official Facepunch wiki (https://wiki.facepunch.com/gmod/Downloading_a_Dedicated_Server). `garrysmod/cfg/server.cfg`, workshop via `+host_workshop_collection`, public listing needs a GSLT token. Peak 39,188 (May 2026).
- 12 VEIN: app 2131400, ~11.2 GB, anonymous, UDP 7777/27015, `Game.ini`/`Engine.ini`, RAM 8 GB min / 16 GB suggested (Supercraft, unofficial). Wiki: https://vein.wiki.gg/wiki/Vein_Dedicated_Server_Setup . Peak only 3,742 in 2026 (11,042 all-time Nov 2025). Early access, settings change often.
- 13 Necesse: app 1169370, ~180 MB, Java with bundled JRE (`-jar Server.jar -nogui -world "X"`), UDP 14159, RAM ~1-2 GB (esagames, unofficial). Peak 11,207 (Aug 2026), all-time 29,192 (Sep 2025, 1.0 launch Oct 2025 per wasdland list).
- 14 Barotrauma: app 1026340, tiny Windows depot (~156 MB) because the game content depot is shared with the base app; official wiki https://barotraumagame.com/wiki/Hosting_a_Dedicated_Server ; `serversettings.xml`; `app_run 1026340`; UDP 27015/27016. Peak 8,841 (May 2026). Workshop mods supported (details UNVERIFIED).
- 15 Space Engineers: app 298740, Windows-only, ~8.4 GB, run `DedicatedServer64\SpaceEngineersDedicated.exe`, config `SpaceEngineers-Dedicated.cfg`/`Sandbox.sbc`, ~6 GB RAM (Pterodactyl egg), Torch plugin manager for management. Wiki: https://spaceengineers.wiki.gg/wiki/Dedicated_Server . Peak 7,827 (May 2026).
- 16 The Forest: app 556450, Windows only, ~1.7 GB, ports 8766/27015/27016. Config path conflicts between guides (`config.cfg` vs `Server.cfg`), so check after first run. Peak 19,789 (Jan 2026), spikes tied to Sons of the Forest news (UNVERIFIED).
- 17 Soulmask: Windows tool app 3017310 "Soulmask Dedicated Server For Windows", ~5.6 GB, exe `WSServer.exe`; guides: ports 8777/27015 UDP, RAM 12-16 GB+ (unofficial). Peak 43,852 (Apr 2026, a big update), 46,807 all-time (Jun 2024), only ~2-4k other months.
- 18 DayZ: server app 223350 (Windows depots, `DayZServer_x64.exe`), NOT free-to-download in metadata. Multiple guides: `+login anonymous` does not work, need a Steam account that owns DayZ; a Pterodactyl egg claims any valid (non-anonymous) account works. GodlyPanel would need to store Steam credentials. Peak 74,297 (Apr 2026); one of the biggest survival audiences. Workshop mods are the norm.
- 19 Insurgency: Sandstorm: server 581330, ~4.9 GB, anonymous, Windows depot exists (`InsurgencyServer.exe`), mods via mod.io. Peak only 2,595 in 2026 (14,474 all-time 2019).
- 20 Dune: Awakening self-hosted: Steam tool "Dune: Awakening Self-Hosted Server" (app id UNVERIFIED), needs Windows Pro + Hyper-V + AVX2 CPU + ~20 GB RAM + 100 GB SSD, a Steam account that owns the game, and a Funcom token from Dune Account Management; setup via `battlegroup.bat` inside a Kubernetes VM, experimental. Not panel-friendly. Sources: https://duneawakening.com/self-hosted-servers/ , https://hub.tcno.co/games/dune-awakening/self-hosted-server/ . Peak 23,250 (Sep 2026).

## Caveats
- Popularity numbers are steamcharts monthly peaks. Some third-party aggregator pages fetched in this pass had obvious errors (wrong dates, mislabeled releases), so they were only used for context, not for numbers.
- Steam's "freetodownload=1" on a Tool means the server can be installed without owning the game, but it is not a guarantee that SteamCMD `+login anonymous` works for every depot. Verify with a real `steamcmd +login anonymous +app_update <id>` before shipping each game.
- Several top-10 entries lack an official RAM number. Do real-install checks for RAM before putting figures in the UI.

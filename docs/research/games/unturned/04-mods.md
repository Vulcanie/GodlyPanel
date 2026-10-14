# Unturned: modded servers (STEP-mods, conventions section D)

Researched 2026-10-14. Build facts: dedicated server app 1110390, game/server version **3.26.3.13**, Unity 2022.3.62f3 (from the first lines of every probe log, `raw\Server_Probe.*.log`).
Evidence types used: (P) = read from the real server install and its logs under `...\research\unturned\server\` and `...\raw\` (another agent ran it before this task; I did not start anything), (C) = game C# source in the public Unturned-Datamining mirror (`https://github.com/Unturned-Datamining/Unturned-Datamining/blob/linux-client-preview/Assembly-CSharp/...`, a decompile of the same game, branch name says preview, treat as very likely but not guaranteed identical to the live build), (D) = official SDG docs (https://unturned-docs.readthedocs.io/en/latest/ = https://docs.smartlydressedgames.com/en/stable/, raw `.rst.txt` sources), (W) = other web pages.

## 0. Summary for the panel

- Unturned has **official, first-class mod support through the Steam Workshop**, driven by one JSON file on the server: `Servers\<ServerID>\WorkshopDownloadConfig.json`, key `File_IDs`. The server downloads and updates the items itself at startup (anonymous SteamCMD is not involved), and players download the same items automatically when they join. No loader to install. Workshop maps are included (set the `Map` command to the level name).
- Server-side **plugin frameworks** exist and are optional: **Rocket (LDM)**, maintained by the game developers and **shipped inside the server install** (`Extras\Rocket.Unturned`, version 4.9.3.18, runs on 3.26.3.13), and **OpenMod** (community, last release 3.8.10 on 2024-07-10, also ran on 3.26.3.13). Both are "modules" with role Server, so **players install nothing**.
- Recommendation (details in section 9): offer a **Workshop ID list** field (write `File_IDs`) plus a map name; later offer a one-click "Rocket (plugins)" install that is just a folder copy. Do not build OpenMod in the first version.

## 1. Steam Workshop: how a dedicated server gets mods

### 1.1 The config file
- File: `<install>\Servers\<ServerID>\WorkshopDownloadConfig.json` (server folder root, next to `Config.txt`). Source: (D) server-hosting page "Steam Workshop Mods" (https://unturned-docs.readthedocs.io/en/latest/_sources/servers/server-hosting.rst.txt) and (P) `server\Servers\Probe\WorkshopDownloadConfig.json`.
- The game writes it on first run with these exact defaults (P, `raw\WorkshopDownloadConfig.default.json`, identical to the class constructor in (C) `SDG.Unturned/WorkshopDownloadConfig.cs`):

```json
{
  "File_IDs": [],
  "Ignore_Children_File_IDs": [],
  "Query_Cache_Max_Age_Seconds": 600,
  "Max_Query_Retries": 2,
  "Use_Cached_Downloads": true,
  "Should_Monitor_Updates": true,
  "Shutdown_Update_Detected_Timer": 600,
  "Shutdown_Update_Detected_Message": "Workshop file update detected, shutdown in: {0}",
  "Shutdown_Kick_Message": "Shutdown for Workshop file update."
}
```
- When the Hawaii map was added the file looked the same with `"File_IDs": [ 1753134636 ]` (P). The panel can create or merge this JSON itself; only `File_IDs` really needs to change. (Whether the game rewrites/normalises the file at shutdown was not tested.)
- Key meanings (from the code comments in (C) WorkshopDownloadConfig.cs):

| Key | Type | Default | Plain meaning |
|---|---|---|---|
| `File_IDs` | list of numbers | empty | Steam Workshop file IDs to install. Collections are accepted: the code queues the children of a collection (C DedicatedUGC.cs). |
| `Ignore_Children_File_IDs` | list of numbers | empty | For these IDs, do not auto-install the items they list as dependencies ("useful if the author lists dependencies as a way of advertising"). |
| `Query_Cache_Max_Age_Seconds` | whole number | 600 | How old a cached Steam answer may be (0 disables the cache). Balances noticing updates quickly against surviving a failed query. |
| `Max_Query_Retries` | whole number | 2 | How many times a failed Steam query is retried. After that the **server quits** ("Reached maximum workshop query retry count!", C DedicatedUGC.cs). |
| `Use_Cached_Downloads` | true/false | true | Load already-installed items instead of re-downloading unchanged ones. |
| `Should_Monitor_Updates` | true/false | true | Watch the used items for updates while running. |
| `Shutdown_Update_Detected_Timer` | seconds | 600 | Countdown before the server shuts itself down after an update was found (so a restart script can pick it up). |
| `Shutdown_Update_Detected_Message` | text | see above | Chat broadcast when the countdown starts. `{0}` is the time. |
| `Shutdown_Kick_Message` | text | see above | Message shown to players when kicked at the end of the countdown. |

- Doc example (D): add the number from the Workshop URL (`https://steamcommunity.com/sharedfiles/filedetails/?id=1753134636`, File ID 1753134636) to `File_IDs`; several IDs are comma-separated, e.g. `1753134636, 1702240229`. "During server startup, any specified mods (and their dependencies) will be installed and updated. Players will automatically begin downloading any mods while connecting to the server."
- The update monitor (D https://unturned-docs.readthedocs.io/en/latest/_sources/servers/dedicated-workshop-update-monitor.rst.txt): "By default the game monitors for changes to the hosted map. When a change is detected it notifies players via chat and shuts down the server after a timer." Maps carry their own version numbers that the server list uses for compatibility checks before players connect. **A panel that wants these updates to take effect needs to restart the server after it exits** (auto-restart / "restart on exit"), otherwise the server just stops 10 minutes after a mod update.

### 1.2 What actually happens at startup (P, `raw\Server_Probe.hawaii.log`, with `File_IDs` = [1753134636], server 3.26.3.13, 2026-10-14)
1. `Workshop install folder: ...\Servers/Probe/Workshop/Steam` then `1 workshop item(s) requested`, a Steam query, then `1753134636 'Hawaii' queued for download`, `'Hawaii' has 1 children`, child `1753131903`, queued as `'Hawaii Assets'`. **Dependencies are pulled in automatically** (this is why the docs table lists both "Hawaii" and "Hawaii Assets").
2. Download 8 s for the map (313,092,160 B) and 24 s for the assets (72,622,051 B) on this PC; total on disk 385,714,211 B (`Workshop\Steam\appworkshop_304930.acf` `SizeOnDisk`). Then `Installed workshop item`, `Discovered level "Hawaii" at "...\Workshop\Steam\content\304930\1753134636\Hawaii"`, `Monitoring workshop map "Hawaii" (1753134636) for changes`, level loaded to 100% and a Server Code printed.
3. Second start: items were found in cache and not re-downloaded (`Loaded workshop items ... (2 installed, 2 needed)`; `raw\Server_Probe.rocket.log` says `Workshop item found in cache: 1753134636`). The Steam log line `Item change feed returned Access Denied` / `Updating workshop item details failed with Access Denied` appears on every start in `Logs\workshop_log.txt` and did no harm (anonymous server).
4. First start needs internet for the Steam query (and each later start also queries Steam). `-OfflineOnly` (C Dedicator.cs) switches to cache-only (`DedicatedUGC.beginInstallingItems(Dedicator.offlineOnly)`).
5. Items that are private, banned, or restricted by an IP list are skipped with a warning: `Workshop file is private`, `Workshop file is banned`, `Not authorized in the IP whitelist` (C DedicatedUGC.cs / WorkshopDownloadRestrictions.cs; authors can set an `allowed_ips` tag). The log prints `This server's allowed IP for Workshop downloads: [redacted]` (P).

### 1.3 Folder layout on the server (all observed in P under `server\`)
```
<install>\                                   (U3DS)
  Modules\                                   (plugin frameworks go here, section 3)
  Extras\Rocket.Unturned\ , Extras\Install Rocket.bat   (bundled Rocket)
  Maps\                                      (official maps shipped with the game: Alpha Valley, Destruction, Germany,
                                              Monolith, PEI, Paintball_Arena_0, Russia, Tutorial, Washington, Yukon)
  Bundles\Workshop\Content\ , Bundles\Workshop\Maps\   (legacy "all servers" manual folders; exist but empty)
  Servers\<ServerID>\
    Config.txt
    WorkshopDownloadConfig.json
    Server\Commands.dat
    Maps\                  (legacy per-server manual maps; empty)
    Bundles\               (legacy per-server manual assets; empty)
    Workshop\Content\      (legacy per-server manual assets; empty)
    Workshop\Maps\         (legacy per-server manual maps; empty)
    Workshop\Steam\                           (REAL Workshop downloads, one folder per server)
      appworkshop_304930.acf                  (Steam's record of installed items: id, size, timeupdated, manifest)
      content\304930\<WorkshopID>\...         (the item exactly as published)
      downloads\ , temp\
```
- A **map** item contains `Map.meta` at its root and the level folder inside it, e.g. `content\304930\1753134636\Map.meta` and `...\1753134636\Hawaii\{Level.dat, Config.json, Terrain, Spawns, ...}` (P). An **asset-pack** item contains `Object.meta`, `MasterBundle.dat`, `*.masterbundle`, `Items\`, `Objects\`, `NPCs\`, ... (P, item 1753131903). Source for how the game classifies items by `*.meta` file and how it finds the map's nested `Bundles`/`Content`: (C) `SDG.Unturned/WorkshopTool.cs`.
- Because downloads are **per server folder**, two servers using the same map each download their own copy (and the Hawaii pair is about 368 MiB). Curated maps are larger: file sizes reported by the Steam API: Buak 1,032,227,550 B, France 748,408,297 B, Ireland 641,785,798 B, Elver 543,763,986 B, Rio de Janeiro 531,962,529 B, Arid 409,929,929 B (see section 5, API `GetPublishedFileDetails`).
- **Manual / legacy mod folders** (a map or assets you downloaded yourself instead of via Steam): the game scans these on a dedicated server: `<install>\Maps\*`, `<install>\Bundles\Workshop\Maps\*`, `<install>\Servers\<ID>\Workshop\Maps\*`, `<install>\Servers\<ID>\Maps\*` for levels (C `SDG.Unturned/Level.cs`, the `else` branch with "legacy" log texts), and for non-map assets `<install>\Bundles\Workshop\Content`, `<install>\Servers\<ID>\Workshop\Content`, `<install>\Servers\<ID>\Bundles` (C `SDG.Unturned/Assets.cs`, `AddDedicatedServerUgcSearchLocations`). Probe log confirms the four asset locations being registered (P `raw\Server_Probe.vanilla.log` lines "Server Common (Legacy)", "Per-Server (Legacy)"). The panel does not need to manage these; mention them only as an "advanced: drop files here" note. Players do not get legacy-folder content automatically (the docs only promise auto-download for Workshop items), so clients would need the same files; this is **not tested** (UNVERIFIED #6).

### 1.4 Workshop maps
- The `Map` command lives in `Servers\<ID>\Server\Commands.dat` (`Map PEI` in the generated example; P and D server-hosting page). Docs comment inside the example: "Use the WorkshopDownloadConfig.json file to download Workshop maps." (D)
- Rule: put the map's **Workshop ID in `File_IDs`** (and its assets item, if it has one) and set `Map <LevelName>` where **LevelName is the level folder name inside the item**, which is the name in the log line `Discovered level "<name>"`. For Hawaii the Workshop title, the level folder and the name in the log are all `Hawaii` (P). For other curated maps the internal name is **not verified** (FreakHosting says "use the exact internal name (e.g. `map Buak`)" and notes the internal name can differ from the title: https://help.freakhosting.com/games/unturned/popular-curated-maps-list.md and https://help.freakhosting.com/games/unturned/how-to-add-workshop-maps-to-unturned, summary only) - UNVERIFIED #1.
- The probe's Commands.dat (`Map PEI` when I read it) and log (`Successfully set map to Hawaii!` while running the Hawaii test) show the map is set before the Workshop download finishes, and the level only needs to exist by the time the level loads (P). If `Map` names a workshop map whose ID is not in `File_IDs`, expect the level to be missing (not tested, UNVERIFIED #7).
- The official docs list the curated and Workshop-only arena maps with IDs (D server-hosting page "Steam Workshop Mods" table; the table itself is in `/img/WorkshopMapIDs.csv`, read here through a page summary of https://docs.smartlydressedgames.com/en/stable/servers/server-hosting.html). I then checked **every ID with the Steam Web API** (`ISteamRemoteStorage/GetPublishedFileDetails`, no key needed, run 2026-10-14). All 26 resolved to the expected Unturned (app 304930) items:

| Title (Steam) | File ID | Last updated | Subscribers | Size (bytes) |
|---|---|---|---|---|
| Elver | 2136497468 | 2024-11-08 | 6,579,029 | 543,763,986 |
| Arid | 2683620106 | 2024-09-06 | 5,113,284 | 409,929,929 |
| Buak | 3000549606 | 2024-09-19 | 4,345,103 | 1,032,227,550 |
| Kuwait | 2483365750 | 2024-11-25 | 4,073,652 | 367,445,080 |
| Escalation | 3251926587 | 2026-07-31 | 3,497,166 | 530,265,073 |
| A6 Polaris | 2898548949 | 2024-11-14 | 3,347,928 | 99,363,075 |
| Rio de Janeiro | 3416057692 | 2025-11-03 | 2,092,689 | 531,962,529 |
| [Official] France | 1975500516 | 2026-01-28 | 1,007,586 | 748,408,297 |
| California 2 | 3707778928 | 2026-09-14 | 735,351 | 410,513,919 |
| California Legacy ("California") | 1905768396 | 2024-02-23 | 661,068 | 143,710,120 |
| Easter Island | 1983200271 | 2026-04-01 | 632,964 | 100,901,729 |
| Greece | 1702240229 | 2022-05-28 | 611,811 | 480,422,907 |
| Hawaii (map) | 1753134636 | 2022-11-14 | 598,354 | 313,092,160 |
| Hawaii Assets (needed by Hawaii) | 1753131903 | 2022-05-28 | 975,588 | 72,622,051 |
| Ireland | 1411633953 | 2023-06-27 | 265,874 | 641,785,798 |
| Rio de Janeiro Legacy | 1821848824 | 2026-01-30 | 471,709 | 278,614,884 |
| [OFFICIAL] Belgium | 1727125581 | 2023-03-19 | 229,821 | 60,929,050 |
| [Official] Carpat | 1497352180 | 2022-12-02 | 234,609 | 85,653,369 |
| Dango (arena) | 1850228333 | 2023-04-15 | 400,927 | 102,545,193 |
| Canyon Arena | 1850209768 | 2022-07-07 | 313,144 | 178,107,757 |
| Athens Arena | 1454125991 | 2022-05-01 | 152,786 | 131,355,657 |
| Cyprus Survival / Cyprus Arena | 1647986053 / 1647991167 | 2019-02-07 | 145,424 / 89,800 | 15,994,009 / 14,739,950 |
| Bunker Arena | 1257784170 | 2018-01-06 | 192,619 | 55,208,790 |
| PEI Arena / Washington Arena | 2396897717 / 2404652624 | 2021-02 | 1,001 / 687 | 67,274,161 / 124,371,108 |

  Two IDs given by FreakHosting do not exist (Steam result 9 for Buak `3000540166` and Ireland `1311025539`); use the official docs IDs above. Note the Steam titles for California are "California Legacy" and "California 2": the unversioned name in the docs table is "California" for 1905768396.
- Curated-map program: "The traditional curated system came to an end with the release of California 2 on April 30th, 2026"; new curated maps are Workshop-only (https://unturned.wiki.gg/wiki/Maps). So in 2026 map = Workshop item, not a game-file map.
- Some maps are two Workshop items, a terrain item plus an asset-pack item (Hawaii is the proven example; FreakHosting says "many curated maps"). Listing the map item is enough when the author lists the pack as a dependency (as happened here: "has 1 children"); the panel should still let the user add any extra ID by hand.

### 1.5 Client side (Workshop)
- Players need to do nothing in advance: they auto-download the items while connecting (D). The server also registers every installed item with the version stamp (`Provider.registerServerUsingWorkshopFileId(fileId, timestamp)`, `Workshop file 1753134636 requiring timestamp 11/14/2022 ...` in P) so a client with a stale copy is told to update.
- Client-side cost: the first join to a modded server downloads the whole set (see sizes above). Mention in the UI that big maps (Buak about 1.0 GB) make the first join slow.

## 2. Windows-specific trap found in the probe: long folder paths break Workshop assets and OpenMod
This is a real, reproduced problem (P):
- `raw\Server_Probe.hawaii.log`: **14 times** `Caught exception reading asset definition at: ...\content\304930\1753131903\NPCs\Hawaii NPCs\Dialogues\...\Asset.dat` with `Could not find a part of the path`. The install was under `C:\Users\vulca\AppData\Local\Temp\claude\c--GodlyPanel\...\research\unturned\server` (127 characters), so the full file paths were 258 to about 264 characters, over the classic Windows 260-character limit. Some NPC dialogues from the Hawaii pack were therefore silently not loaded; the map still loaded to 100%.
- `raw\Server_Probe.openmod.log`: OpenMod's first-run NuGet install died with `Could not find a part of the path ".../Servers/Probe/OpenMod/packages/Microsoft.Extensions.DependencyInjection.Abstractions.8.0.1/....nupkg"` (284 characters) and `Caught exception while initializing module "OpenMod.Unturned"`. OpenMod did not start.
- Control: the same install mapped to a short path (a `U:` drive letter, `raw\Server_Probe.openmod-shortpath.log`) gave **0** such exceptions, OpenMod initialised (about 20 s on first run) and the Hawaii map loaded cleanly.
- The longest file OpenMod writes in the working install was 160 characters counted from the install root (`Servers\Probe\OpenMod\packages\Microsoft.Extensions.Configuration.EnvironmentVariables.8.0.0\...nupkg`, P) and the longest Hawaii file was 140 characters from the install root. With a 5-letter ServerID that gives roughly: install-folder path + ServerID length must stay **under about 103 characters** for the OpenMod files seen (260 limit minus 160 minus separators; more plugins add longer paths) and under about 123 for the Hawaii files. Panel advice: warn (or refuse OpenMod) if `len(installDir) + len(serverId)` is above about 90 to keep a safety margin. (Whether Windows "long paths" support would help was not tested; Unity/Mono apps generally ignore it, UNVERIFIED #3.)
- The panel's install folder is normally short, so this mostly matters for people who point the server folder at a deep path.

## 3. Plugin frameworks (server-side "modules")

### 3.1 How the game loads modules (C `SDG.Framework.Modules/ModuleHook.cs`, `SDG.Unturned/Dedicator.cs`; P)
- A module is a folder in `<install>\Modules\<Name>\` with a `<Name>.module` JSON file listing assemblies and a **Role**. The server prints `Looking for module files in: ...\Modules`, `Found 1 module(s): 0: "Rocket.Unturned"` (P).
- A dedicated server **always loads modules** (`shouldLoadModules` returns true for `Dedicator.IsDedicatedServer`). Assemblies whose role is `Client` are dropped on a server; role `Server` is dropped on clients. Only modules with role `Both_Required` have to exist on the client too (`getRequiredModules`).
- Both frameworks ship with `"Role": "Server"` (P: `Extras\Rocket.Unturned\Rocket.Unturned.module`, `Modules\OpenMod.Unturned\OpenMod.Unturned.module`). **Players install nothing** and see nothing, apart from OpenMod's `advertisePlugins: true` setting which shows installed plugin names when joining (P `openmod.unturned.yaml`).
- BattlEye: the client only skips modules when the client itself is started with `-BattlEye` (C Dedicator.cs: `_hasThirdpartyAntiCheat = CommandLine ... "-BattlEye"`); wiki: "Third-party modules cannot be loaded with BattlEye enabled." (https://unturned.wiki.gg/wiki/Modules). That limits **client**-side modules, not server plugins. Server-side BattlEye (`BattlEye_Secure`, default True in `Config.txt`, P `raw\Config.default.txt`) only starts for **Internet** servers with `VAC_Secure` on (C Provider.cs `openGameServer`: `ESecurityMode.SECURE` required). The probe logs have no BattlEye lines, so the probe never started BattlEye; whether Rocket/OpenMod run fine beside the BattlEye server component on an Internet server is not shown in these logs (UNVERIFIED #2), though nothing in the module loader blocks it and a hosting vendor summary also says Rocket/OpenMod are the normal route (W https://www.gameserverkings.com/knowledge-base/unturned/plugins/, summary only).
- Modules cannot be installed from the Steam Workshop "for security reasons" (wiki.gg Modules page above), which is why a panel has to do the file copy itself.

### 3.2 Rocket, the "LDM" fork (official)
- What: SDG's maintained fork of the old community Rocket (which stopped on 2019-12-20), named Legally Distinct Missile. "Using this fork is recommended because it preserves compatibility, and has fixes for important legacy Rocket issues like multithreading exceptions and teleportation exploits." Source: (D) https://unturned-docs.readthedocs.io/en/latest/_sources/servers/rocket.rst.txt and https://github.com/SmartlyDressedGames/Legally-Distinct-Missile
- Status 2026: GitHub releases v4.9.3.18 (2024-12-14), v4.9.3.17 (2024-07-04); last commits 2025-10-20 and 2025-10-23 ("Revise assembly versioning to first prefer exact match", "Handle assemblies with null version"); repo not archived. The server install **already contains v4.9.3.18** and the log says `Rocket Unturned v4.9.3.18 for Unturned v3.26.3.13` (P). The README says "Issues are monitored and will be discussed, but pull requests will not be directly merged."
- **Install (no download, no internet):** copy the folder `<install>\Extras\Rocket.Unturned\` to `<install>\Modules\Rocket.Unturned\` (the folder, not its contents). The install ships `Extras\Install Rocket.bat` whose only line is `xcopy /y/i "%~dp0Rocket.Unturned" "%~dp0..\Modules\Rocket.Unturned"` (P). Module folder content: `Rocket.API.dll, Rocket.Core.dll, Rocket.Unturned.dll, Rocket.Unturned.module (Version 4.9.3.18), English.dat, LICENSE.md, README.md`. The panel can do that copy in Node.
- **What it creates on first start** (P, `server\Servers\Probe\Rocket\`): `Rocket.config.xml, Rocket.Unturned.config.xml, Commands.config.xml, Permissions.config.xml, Rocket.en.translation.xml, Rocket.Unturned.en.translation.xml, Plugins\, Libraries\, Logs\`. This is inside the **server folder** (`Servers\<ID>\Rocket`).
- **Plugins:** a plugin is a `.dll` (plus its own settings). Put them under `Servers\<ID>\Rocket\Plugins\` and shared helper DLLs in `Rocket\Libraries\`; restart. Source for the load rule: LDM source `Rocket.Core/Plugins/RocketPluginManager.cs` scans `Plugins` and `Libraries` with `SearchOption.AllDirectories` (https://github.com/SmartlyDressedGames/Legally-Distinct-Missile/blob/master/Rocket/Rocket.Core/Plugins/RocketPluginManager.cs), so both "a folder per plugin" (https://www.gameserverkings.com/knowledge-base/unturned/how-to-install-rocketmod-plugins-for-unturned.md) and "DLLs directly in Plugins" (https://hosthavoc.com/wiki/game-servers/unturned/install-plugins-rocket) work. Each plugin generates its own XML config on first load (host guides: `Configuration.xml` in the plugin's folder; plugin-specific). Permissions are edited in `Rocket\Permissions.config.xml` (P default groups `default` and `vip`).
- **Behaviour changes worth telling the user (P defaults):**
  - `Rocket.Unturned.config.xml`: `<AutomaticSave Enabled="true" Interval="1800" />` and the log line `This server will automatically save every 1800 seconds`. Vanilla Unturned has **no autosave** (see 01-basics.md), so installing Rocket adds a 30-minute autosave.
  - `Rocket.config.xml`: `<RCON Enabled="false" Port="27115" Password="changeme" ...>` (so RCON is **off** by default, port 27115, not game port + 2 as one host guide claimed in 01-basics.md), `<AutomaticShutdown Enabled="false" Interval="86400" />`, `<LanguageCode>en</LanguageCode>`, `<MaxFrames>60</MaxFrames>`.
  - Rocket adds its own chat commands (`/admin, /give, /tp, /heal, /vanish, ...`, 25-ish listed in `Rocket.log`) and a command whitelist file `Commands.config.xml`; the `admin` mapping is disabled (`Enabled="false"`) there by default.
  - `Rocket.Unturned.config.xml` has `RocketModObservatory KickLimitedAccounts="true" KickTooYoungAccounts="true" MinimumAge="604800"`: with these defaults Steam accounts that are limited or younger than 7 days are kicked. This is the default shipped in the file (P); not tested with a player. Mention it because friends with brand-new Steam accounts could be refused.
- **Plugins sources:** the original plugin list is archived on Reddit (https://www.reddit.com/r/rocketmod/comments/ek4i7b/); the old RocketMod GitHub org is archived. Plugins are third-party downloads; there is no central official catalogue. Compatibility of old plugins with 3.26 is plugin by plugin (UNVERIFIED #4; no plugin was loaded in the probe: `Rocket/Plugins` was empty).

### 3.3 OpenMod (community framework)
- What: "a spiritual successor to Rocket"; has its own plugin API and also works with Rocket/LDM plugins; "can run alongside RocketMod" (D https://unturned-docs.readthedocs.io/en/latest/_sources/servers/openmod.rst.txt as summarised; repo https://github.com/openmod/openmod).
- Status 2026: repo `openmod/openmod` not archived, latest GitHub **release 3.8.5 (2024-05-22)** (assets `OpenMod.Unturned.Module.zip` and standalone zips); NuGet `OpenMod.Unturned` latest **3.8.10 (2024-07-10)**, 197.2K downloads, 187 dependent packages (https://www.nuget.org/packages/OpenMod.Unturned); last repo commit 2026-03-04 "Update unturned redist (#857)", before that 2025-08-21 "Update Unturned Redist to 3.25.7.2". Open issues in 2026 include "connection problem" (2026-05-10) and "The unturned module, when using /om reload, continues to handle events after the services are disposed of" (2026-05-23); older: "nuget fails to download newly indexed packages" (2025-05-04) (https://github.com/openmod/openmod/issues). The companion RocketMod installer plugin repo (`OpenMod.Installer.RocketMod`) is **archived** (last release 1.0.0-beta4, 2023-11-28), so the manual module install is the current route.
- **Proven to start on today's game** (P): module 3.8.5 + packages 3.8.10 on game 3.26.3.13: `OpenMod v3.8.10 is starting... OpenMod for Unturned is ready ... > 0 plugins loaded`, level loaded to 100%, no WRN/ERR lines in `Servers\Probe\OpenMod\logs\openmod-2026-10-14-12-56-13.log` (short-path run).
- **Install:** download `OpenMod.Unturned.Module.zip` from https://github.com/openmod/openmod/releases (3.8.5 here), copy the folder `OpenMod.Unturned` (as in its `Readme.txt`: "Copy the "OpenMod.Unturned" folder to /Unturned/Modules (copy the folder, not it's content)") to `<install>\Modules\`. Source: P `server\Modules\Readme.txt`; docs https://openmod.github.io/openmod-docs/userdoc/installation/unturned.html. Zip size 3,768,750 bytes, identical to the GitHub 3.8.5 release asset size (P and releases API).
- **First start downloads 89 NuGet packages** (89 folders in `Servers\<ID>\OpenMod\packages`) from `https://api.nuget.org/v3/index.json` (P `OpenMod\packages\NuGet.Config`, `packages.yaml` lists `OpenMod.UnityEngine` and `OpenMod.Unturned` version `3.8.10+a033121c`). It took about 20 s here and needs internet and a short path (section 2). It creates `Servers\<ID>\OpenMod\{openmod.yaml, openmod.unturned.yaml, openmod.users.yaml, openmod.roles.yaml, openmod.commands.yaml, autoexec.yaml, logging.yaml, plugins\, packages\, logs\, .schemas\}`.
- **Plugins:** console command `openmod install <package id>` (example `Kr4ken.NewEssentials`; `@version`, `-Pre`), then `openmod reload`; or drop DLL + libraries into `Servers\<ID>\OpenMod\plugins\` (docs say "openmod/plugins"). `openmod remove <id>` removes. Source: https://openmod.github.io/openmod-docs/userdoc/concepts/plugins.html (summary). Most-installed plugin packages on NuGet (dependents of OpenMod.Unturned): Kr4ken.NewEssentials (32.3K downloads), LvmServers.ScoreBoardPlugin (28.0K), UnturnedDiscordBridge (21.0K), Pustalorc.PlayerInfoLib.Unturned (19.9K), SilK.Unturned.Extras (19.0K) (NuGet page, 2026-10-14). By default `openmod install` only works from console/RCON, not in-game (P `openmod.yaml` comment).
- **Panel-relevant OpenMod defaults (P):**
  - `autoexec.yaml` job "OpenMod Auto Update" `enabled: true`, runs `openmod upgrade` **every Sunday 00:00** (schedule `0 0 * * 0`) - this can change the framework version behind the user's back; "Auto Restart" (3 AM daily) and "Auto save" (every 5 min) jobs exist but are `enabled: false`.
  - `openmod.yaml` RCON accounts have placeholder password `ChangeThisToEnableRcon`; RCON protocols are all `enabled: false`: Minecraft-style port 25575, srcds-style port 27017, and in `openmod.unturned.yaml` the Rocket-compatible one on port 27115. `bind: 0.0.0.0` (all interfaces) if enabled.
  - `hotreloading: true`, `advertisePlugins: true`, `grantAdminsAllPerms: true` (Unturned admins get every permission).
  - `openmod.users.yaml` default user `root` of type `rcon` with permission `*`.
  - OpenMod's own logs are in `Servers\<ID>\OpenMod\logs\openmod-<date>.log` and also echoed into the normal server log.

### 3.4 Other built-in extension points (no loader needed)
- The game itself is moddable with Unity asset bundles (`.masterbundle`) and plain `.dat` asset files; this is what Workshop items are. Official how-to is the legacy Steam guide "Uploading Mods to the Steam Workshop" and the docs repo (https://unturned-docs.readthedocs.io/en/latest/ index page links the legacy Steam guides). Nothing for the panel to do.
- Plugin API note from the docs: you can replace the default update monitor with code in a module (`IDedicatedWorkshopUpdateMonitor`, `DedicatedWorkshopUpdateMonitorFactory.onCreateForLevel`) (D dedicated-workshop-update-monitor page). Plugin authors only.

## 4. How clients must match (summary)
| What the server has | What players must do | Source |
|---|---|---|
| Workshop items in `File_IDs` | Nothing; the game downloads them on join (and updates stale ones) | D server-hosting; P timestamps in log |
| A Workshop map | Nothing extra; map version is checked before connecting | D update monitor page |
| Rocket (LDM) or OpenMod and their plugins | Nothing (role Server) | P `.module` files; C ModuleHook |
| Plugins that add UI/effects using Workshop items | Those items must be in `File_IDs` so clients get them | inference from the above, UNVERIFIED |
| Files only in legacy folders (`Bundles\Workshop\Content`, `Servers\<ID>\Bundles`...) | Probably must already have the same files; not tested | C Assets.cs; UNVERIFIED #6 |

## 5. Popular loaders and content (2026)
- Loaders: **Rocket/LDM** (official, bundled, still maintained) and **OpenMod** (community, stable since mid-2024). That is all; there is no Thunderstore/Nexus/CurseForge/mod.io ecosystem for Unturned server mods. (My search results did not show one; absence of evidence only.)
- Maps (2026 subscribers, Steam API, table in 1.4): Elver, Arid, Buak, Kuwait, Escalation, A6 Polaris are the most subscribed; California 2 (released 2026-04-30) is the newest. Hosting-vendor guides name Arid, Elver, Polaris, Buak, Ireland as the popular curated maps (https://help.freakhosting.com/games/unturned/popular-curated-maps-list.md).
- Plugin categories (from the OpenMod dependents list and host guides, not a ranking): admin/essentials (home, teleport, kits), scoreboard, Discord bridge, player info/stat libraries, economy/shops (Uconomy, in Rocket world), anti-grief/land claims. Treat as examples only; popularity of Rocket plugins could not be measured (the old plugin list is on Reddit, not machine-readable).

## 6. Risks
- Plugins run arbitrary code on the user's PC with the server's permissions; install only from sources the user trusts (OpenMod's own config calls this out: `openmod install` is limited to console/RCON "dangerous as your admins could use it to install any plugins including malicious ones", P `openmod.yaml`).
- Saves: Unturned world and player saves live in the server folder; Workshop content is separate (`Workshop\Steam`). Removing a map from `File_IDs` while the world on disk was built for it will break that world (inference; not tested, UNVERIFIED #8). Changing `Map` makes the game create a new `Level\<MapName>` save folder (layout in 01-basics.md section 2).
- Updates: Workshop item updates shut the server down after `Shutdown_Update_Detected_Timer` seconds (default 10 minutes) with a chat warning; a restart wrapper is needed. Game updates can break old Rocket plugins; Rocket itself is bundled and updates with the server (the bundled `Extras\Rocket.Unturned` is part of the Steam depot and presumably refreshed by `app_update`; the copy in `Modules\` is a separate copy, so the panel should re-copy after a game update; UNVERIFIED #5).
- RCON ports (27115 Rocket, 25575/27017 OpenMod) are all off by default. If a panel enables RCON it must also set a real password; never leave `changeme` / `ChangeThisToEnableRcon`.
- `app_update 1110390 validate` after adding the Rocket module: the module copy sits outside the original depot manifest; whether `validate` deletes extra folders in `Modules\` is not documented and was not tested.

## 7. Settings the panel could expose later (Config.txt entries relevant to mods)
Only two, both default True when the value is empty, shown in the generated `Config.txt` (P `raw\Config.default.txt`): `Server { VAC_Secure }` ("Whether to enable Valve Anti-Cheat.") and `Server { BattlEye_Secure }` ("Whether to enable BattlEye Anti-Cheat."). Turning either off is not required for Workshop mods or server-side plugins. The format of `Config.txt` is covered in `02-config.md`.

## 8. Commands relevant to mods (for the console, not for the form)
- Rocket: a `/rocket` command is registered (P `Rocket.log`; its sub-commands were not checked); the loaded module list is shown by the console command `Modules` (host guide, W https://www.gameserverkings.com/knowledge-base/unturned/how-to-install-rocketmod-plugins-for-unturned.md; not run here).
- OpenMod: `openmod install|remove|reload|upgrade|purge` (autoexec.yaml comments and docs above).

## 9. Recommendation for GodlyPanel
1. **First version: a "mods" field = list of Steam Workshop file IDs** (numbers, one per line or comma separated). On create/save, write or merge `Servers\<ID>\WorkshopDownloadConfig.json` keeping the game's other keys and defaults, only replacing `File_IDs`. This is exactly what the game documents. Show a hint "Copy the number from the Workshop page address (...?id=1234567890)".
2. **Add a map field** that sets `Map <name>` in `Server\Commands.dat`, with the official five maps as a dropdown (PEI, Washington, Yukon, Russia, Germany per the docs' own comment; other maps in the install: Alpha Valley, Destruction, Monolith, Paintball_Arena_0, Tutorial are present as folders) and a "Workshop map" choice that asks for the Workshop ID **and** the level name. Offer a short list of curated maps with verified IDs (table 1.4) but mark the level name as "check the server log line `Discovered level`" until names are confirmed (UNVERIFIED #1).
3. **Make sure the panel restarts the server after it exits on its own** (Workshop update shutdown, scheduled shutdown) or it will look like a crash.
4. **Rocket as an optional toggle (second step):** one button "Install plugin support (Rocket)" that copies `Extras\Rocket.Unturned` to `Modules\Rocket.Unturned` (no download), and a way to upload plugin DLLs into `Servers\<ID>\Rocket\Plugins\`. Explain: adds 30-minute autosave, players need nothing, plugin permissions in `Rocket\Permissions.config.xml`, RCON stays off. Re-copy after each game update.
5. **OpenMod: do not automate in the first release.** If offered, it is a download of the GitHub zip, a first start with internet access, a path-length pre-check (section 2), and the weekly auto-upgrade job needs a decision. Show it as "advanced: do it manually" with the doc link.
6. **Path-length pre-check** on creating any Unturned server: warn if `len(installDir) + len(serverId)` is above about 90 characters (section 2), because Workshop NPC assets and OpenMod fail silently or at start.
7. No Thunderstore/CurseForge/Nexus integration is needed for this game.

## Sources used (all opened unless marked summary)
- Probe install and logs listed under (P): `server\Servers\Probe\{WorkshopDownloadConfig.json, Workshop\..., Rocket\*.xml, OpenMod\*.yaml, OpenMod\logs}`, `server\Modules\*`, `server\Extras\*`, `server\ExampleServer.bat`, `server\ServerHelper.bat`, `raw\Server_Probe.{vanilla,hawaii,rocket,openmod,openmod-shortpath}.log`, `raw\Config.default.txt`, `raw\WorkshopDownloadConfig.default.json`, `raw\workshop_log.hawaii.txt`, `server\Logs\workshop_log.txt`.
- Official docs: https://unturned-docs.readthedocs.io/en/latest/_sources/servers/{server-hosting,rocket,openmod,dedicated-workshop-update-monitor,server-configuration,command-io}.rst.txt (raw copies in `raw\web\`), https://docs.smartlydressedgames.com/en/stable/servers/server-hosting.html (curated map table, summary).
- Game source (decompile mirror): `.../SDG.Unturned/{WorkshopDownloadConfig,DedicatedUGC,WorkshopDownloadRestrictions,WorkshopTool,Level,Assets,Provider,Dedicator}.cs`, `.../SDG.Framework.Modules/ModuleHook.cs` (copies in `raw\web\`).
- https://github.com/SmartlyDressedGames/Legally-Distinct-Missile (README, releases API, commits API, `Rocket.Core/Plugins/RocketPluginManager.cs`); https://github.com/openmod/openmod (releases API, commits API, issues API); https://github.com/openmod/OpenMod.Installer.RocketMod (repo API); https://www.nuget.org/packages/OpenMod.Unturned and the NuGet flat-container index (versions up to 3.8.10); https://openmod.github.io/openmod-docs/userdoc/installation/unturned.html and .../concepts/plugins.html (summaries).
- Steam Web API `ISteamRemoteStorage/GetPublishedFileDetails` (anonymous POST, 28 IDs, 2026-10-14; saved `raw\web\pfd.json`).
- https://unturned.wiki.gg/wiki/Modules , https://unturned.wiki.gg/wiki/Maps (summaries).
- Hosting-vendor guides (secondary, summaries): https://www.gameserverkings.com/knowledge-base/unturned/how-to-install-rocketmod-plugins-for-unturned.md , https://hosthavoc.com/wiki/game-servers/unturned/install-plugins-rocket , https://help.freakhosting.com/games/unturned/popular-curated-maps-list.md , search summary of https://www.gameserverkings.com/knowledge-base/unturned/plugins/ .

## Corrections for 01-basics.md found while doing this (from the same probe install)
- `ServerHelper.bat` today is `start "" "%~dp0Unturned.exe" -batchmode -nographics %*` then `exit` (P), resolving 01-basics UNVERIFIED #3 for ServerHelper (the 2019 forum copy was right in effect). `ExampleServer.bat` is `start "" "%~dp0ServerHelper.bat" +LanServer/Example` then `exit` (P). Its comments say CLI form for commands is `-CommandName/Arg0/Arg1` before `+InternetServer/...` e.g. `-Port/27019`, and that `Port` first port is for server list queries, second for in-game traffic (P).
- Rocket RCON default port is 27115 (`Rocket.config.xml`), not game port + 2.
- In the probe the game server log said `Server listen socket bound to [::]:27016`. That fits the docs ("second port for in-game traffic"), but the same logs show `Did not match "Port/27999" with any commands`, so the custom port was NOT applied by that launch (how exactly the earlier agent wrote the argument is not recorded in the files I read). For the start script, use the form documented in ExampleServer.bat, `-Port/<n>` before `+InternetServer/...`, and check the bound port in the log.

## UNVERIFIED
1. Internal map (level) names for the curated Workshop maps other than Hawaii; only the log line `Discovered level "<name>"` after the first download confirms them. Need a download of each map (not done: no installs).
2. Rocket/OpenMod together with the **BattlEye server component on an Internet server with a GSLT** (probe logs show BattlEye never started, so this combination was not exercised); no code in the module loader blocks it.
3. Whether Windows long-path support (registry/manifest) fixes the 260-character failures for Unity/Mono and OpenMod; only the short-path workaround was tested (by the earlier agent).
4. Any real third-party Rocket plugin or OpenMod plugin running on game 3.26.3.13 (no plugin was installed in the probe; only the frameworks were loaded).
5. Whether `app_update ... validate` removes or overwrites `Modules\Rocket.Unturned`, and whether the copy in `Modules\` is refreshed by a game update (the `Extras` copy is).
6. Whether players joining get content that only exists in legacy manual folders (`Bundles\Workshop\Content`, etc.) without having the files; docs promise automatic download only for Workshop items.
7. Behaviour when `Map` names a Workshop map that is not in `File_IDs` (expected: level missing / fallback; not run).
8. What happens to an existing world save when a Workshop map or asset pack is removed from `File_IDs`; whether removed items' folders under `Workshop\Steam\content` are cleaned up.
9. Whether the game rewrites/normalises `WorkshopDownloadConfig.json` at runtime or shutdown (the file looked unchanged between the `.json` and `.json~` copies in the probe, which suggests a backup copy is made at start, but the meaning of the `~` file is not documented).
10. Whether the Steam Workshop query works for an anonymous LAN-mode server without a GSLT in every case: it did in the probe (server was `Not using login token`), but the probe's launch mode (LAN vs Internet) is not recorded in the files I read.
11. Popularity ranking of Rocket/OpenMod plugins and non-map Workshop mods; only NuGet download counts for OpenMod plugins were available (no Workshop browse API without a key).
12. The `RocketModObservatory` account-age kick actually fires with the default settings on today's Steam (value read from the default file only).
13. The complete curated-map table in the official docs is from a page summary; the 26 IDs in it were each checked against Steam, but a row could be missing from the summary. Also the claim "no other mod ecosystem (Thunderstore etc.) exists for Unturned" is based on search results only.

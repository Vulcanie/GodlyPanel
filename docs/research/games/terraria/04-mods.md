# Terraria / tModLoader: modded server (conventions section D)

Researched 2026-10-15. Read-only web research; nothing was installed or run. Facts are for tModLoader stable
**v2026.08.3.0** (GitHub release published 2026-10-01, `tModLoader.zip` 61,142,677 bytes), which per the official player guide is
"based on Terraria 1.4.4.9 content". Branch names on Steam app 1281930: `public`, `preview-v2026.07`, `preview-v2026.08`,
`preview-v2026.09`, `1.4.3-legacy`, `1.3-legacy`.

Local copies of the sources I read (scratch, not part of the deliverable): `...\scratchpad\dl-tml\` (script, wiki clone, C# files)
and `...\scratchpad\dl-tml-zip\extract\` (files taken out of the release zip).

## 1. Is there a supported server mod path? YES

tModLoader IS the modded server. Vanilla Terraria clients cannot join it and tModLoader clients cannot join a vanilla server.
- "tModloader will not connect to non-tModLoader Terraria servers. ... Think of them as 2 completely separate games."
  Source: https://github.com/tModLoader/tModLoader/wiki/Basic-tModLoader-Usage-Guide (wiki repo cloned from
  https://github.com/tModLoader/tModLoader.wiki.git, file `Basic-tModLoader-Usage-Guide.md`)
- The server's code kicks unmodded clients with "You cannot connect to a tModLoader Server with an unmodded client".
  Source: `ModNet.IsClientCompatible`, https://raw.githubusercontent.com/tModLoader/tModLoader/1.4.4/patches/tModLoader/Terraria/ModLoader/ModNet.cs
- A tModLoader server with NO mods is still a tModLoader server (vanilla clients cannot join it). So "modded" is a different game
  mode in the panel, not a plug-in on a vanilla server.

Official server documentation (the wiki page itself says it is outdated for 1.4.4 and points to the README):
- https://github.com/tModLoader/tModLoader/tree/1.4.4/patches/tModLoader/Terraria/release_extras/DedicatedServerUtils (README.md, manage-tModLoaderServer.sh, Dockerfile, docker-compose.yml)
- https://github.com/tModLoader/tModLoader/wiki/Starting-a-modded-server (also `Starting-a-modded-server.md` in the wiki repo)
- https://github.com/tModLoader/tModLoader/wiki/Command-Line

No anti-cheat. The only "protection" is the vanilla `-secure` / `secure=1` option, "Adds addition cheat protection"
(shipped `serverconfig.txt` in the release zip). No other server-side anti-cheat is documented anywhere I read.

## 2. How tModLoader gets and stores mods (three sources, all read from code)

`ModOrganizer.FindMods` (https://raw.githubusercontent.com/tModLoader/tModLoader/1.4.4/patches/tModLoader/Terraria/ModLoader/Core/ModOrganizer.cs) collects `.tmod` files from:
1. the active mod pack folder, if a pack is active (`-modpack`);
2. the **local Mods folder** (`modPath`, `*.tmod`, top directory only);
3. **Workshop folders** (every `*.tmod` found recursively under the Workshop folder returned by `GetWorkshopFolder`).

Which of them is actually LOADED is decided by `Mods/enabled.json` (see section 4); mods that are present but not in it stay off.

### Workshop folder location on a server
`WorkshopHelper.GetWorkshopFolder` (https://raw.githubusercontent.com/tModLoader/tModLoader/1.4.4/patches/tModLoader/Terraria/Social/Steam/WorkshopHelper.TML.cs):
- `-steamworkshopfolder <dir>` wins if that directory exists (else it logs a warning and falls through).
- If there is no Steam client and `-nosteam` is passed, the folder is the relative path `steamapps/workshop` (relative to the server's working directory = the tModLoader install folder).
- Without `-nosteam` and without a running Steam client it uses `<cwd>/../../workshop` only if that directory exists, else `steamapps/workshop`.
- The official management script always passes `-steamworkshopfolder "$folder/steamapps/workshop"` (manage-tModLoaderServer.sh, `start` command).

Inside that folder, SteamCMD stores each item as `steamapps/workshop/content/1281930/<workshopId>/...`. The player wiki confirms the client uses `...\steamapps\workshop\content\1281930` (Basic-tModLoader-Usage-Guide.md, "Mods" paragraph). The exact sub-layout inside an item folder is per tML version: the code expects a folder named like `2026.8` (regex `[/|\\]([0-9]{4}[.][0-9]{1,2})[/|\\]` in ModOrganizer.cs) and `GetActiveTmodInRepo` picks the newest `.tmod` whose tML version is <= the running tML ("recommendedTmod = ... t.tModVersion <= BuildInfo.tMLVersion ... OrderByDescending"). So one Workshop download holds several tML-version builds and the server picks the one that fits. If none fits it logs "No .tMods found for this version ... Defaulting to show newest".

## 3. Installing mods on a dedicated server (the exact official procedure)

### 3a. Download Workshop mods with SteamCMD (anonymous login, confirmed in the official script)
From `install_workshop_mods` in https://raw.githubusercontent.com/tModLoader/tModLoader/1.4.4/patches/tModLoader/Terraria/release_extras/DedicatedServerUtils/manage-tModLoaderServer.sh (copy read: `dl-tml\manage.sh`, lines 219-250):

```
# for each line of Mods/install.txt:
steamcmd_command="$steamcmd_command +workshop_download_item 1281930 $line"
...
eval "'$steam_cmd' +force_install_dir '$folder' +login anonymous$steamcmd_command +quit"
```
- `1281930` is the tModLoader app id, each `$line` is one Workshop item id (one per line in `install.txt`).
- The login is `anonymous` and the script's own help says `--username` is "Not required to download mods" (line 266 of the script). The SteamCMD login is only required by the script for installing tModLoader itself through Steam (section 3b).
- `+force_install_dir` is the folder that contains `Mods/`, `Worlds/` (not the `server/` subfolder), so mods end up in `<folder>/steamapps/workshop/content/1281930/<id>/`.
- The script does NOT check SteamCMD's exit status and prints "Installed N mods" from the line count only, so a failed download is silent. The panel must verify that the `.tmod` files exist afterwards.
- SteamCMD downloads exactly the ids it is given. **Dependencies are not pulled in.** Steam lists "Required items" per mod (see section 7, e.g. Calamity Mod lists Calamity Mod Music), but `workshop_download_item` does not follow them. Each dependency must be its own line in `install.txt`. tModLoader's own mod pack export lists them because it saves the enabled set.

### 3b. Installing tModLoader itself (3 paths)
1. **GitHub release zip (no Steam account at all).** `./manage-tModLoaderServer.sh install-tml --github`; "installs the latest GitHub release, which is the same version as released on Steam" (README.md). The Docker image does exactly this (`RUN ISDOCKER=1 ./manage-tModLoaderServer.sh install-tml --github` in the official Dockerfile), so a Terraria-less machine is supported. Direct URL pattern used by the script: `https://github.com/tModLoader/tModLoader/releases/download/<tag>/tModLoader.zip`. Specific version: `TMLVERSION` env var or `Mods/tmlversion.txt`, e.g. `v2022.06.96.4`. Latest tag from `https://api.github.com/repos/tModLoader/tModLoader/releases/latest` (today: `v2026.08.3.0`).
   - I downloaded `tModLoader.zip` v2026.08.3.0 and listed it (not run). Top level: `start-tModLoaderServer.bat`, `start-tModLoaderServer.sh`, `start-tModLoader.bat/.sh`, `serverconfig.txt`, `tModLoader.dll`, `tModLoader.runtimeconfig.json` (target `net8.0`, `Microsoft.NETCore.App` 8.0.0), `LaunchUtils/` (busybox64.exe, busybox-sh.bat, ScriptCaller.sh, InstallDotNet.sh, ...), `Libraries/` (including `steamworks.net.anycpu/.../win-x64/native/steam_api64.dll`). **It has no `dotnet/` folder**; `ScriptCaller.sh` runs `InstallDotNet.sh` and then `exec "$dotnet_dir/dotnet" tModLoader.dll ...` so the .NET 8 runtime is downloaded on the first launch (needs internet; whether that is fully unattended on Windows: UNVERIFIED).
2. **SteamCMD with a real Steam login:** `./manage-tModLoaderServer.sh install-tml --username <steam user>` which runs `steamcmd +force_install_dir $folder/server +login <user> +app_update 1281930 +quit` (script line 175). Official README: "SteamCMD (recommended)". Prompts for password / 2FA.
3. **SteamCMD anonymous for app 1281930: UNVERIFIED.** The official script never does it. Steam metadata (https://api.steamcmd.net/v1/info/1281930) says: type Game (not Tool), `isfreeapp=1`, `mustownapptopurchase=105600` (Terraria), parent 105600, windows depot 1281932 ~207 MB (plus four Terraria depots 228988, 228990, 229004, 229012 flagged windows). A 2022 Steam forum post claims the server script needed a Steam login (https://steamcommunity.com/app/1281930/discussions/0/5696507684084547720), and one post says anonymous was required; both are anecdotes. Needs a real `steamcmd +login anonymous +app_update 1281930` test by someone allowed to run it. **Recommendation: use the GitHub zip (path 1) as the primary installer.**

### 3c. Where things live (official layout, README.md "Preinstall Folder Structure")
```
tModLoader/
  Mods/            localmod.tmod, enabled.json, install.txt
  Worlds/          world1.wld + world1.twld
  server/          (script version only) the tModLoader install
  steamapps/       (auto) Steam Workshop mods
  serverconfig.txt (optional)
  tmlversion.txt   (optional)
```
- The script launches with `-tmlsavedirectory "$folder"` so `Mods/` and `Worlds/` sit directly in `<folder>`. `-tmlsavedirectory` = "Same as savedirectory above except /tModLoader won't automatically be appended"; `-savedirectory` appends `/tModLoader` (Command-Line.md in the wiki repo). On a normal Windows client the saves are under `Documents\My Games\Terraria\tModLoader\`.
- `install.txt` / `enabled.json` "are needed only for Steam Workshop mods"; "If `install.txt` is missing, no mods are installed. If `enabled.json` is missing, no mods are enabled." "You will need a `Mods/enabled.json` to contain all Mods that you want enabled, including local mods." (README.md)
- Manually installed `.tmod` files (any source) go straight in `Mods/` and do not auto-update ("will appear as purple in the mods menu", Usage Guide).

## 4. Files: exact formats

### enabled.json
- Code: `ModOrganizer.LoadEnabledMods` reads `<modPath>/enabled.json` via `JsonConvert.DeserializeObject<HashSet<string>>`; `SaveEnabledMods` writes `JsonConvert.SerializeObject(EnabledMods, Formatting.Indented)`. So it is a JSON **array of internal mod names** (not Workshop ids, no `.tmod`). Example shape (names are the mods' internal names, see section 5 for how to get them): `["ModNameA", "ModNameB"]`. If the file is missing it logs `Did not find enabled.json file` and loads nothing. (ModOrganizer.cs lines 760-780.)
- A Hostinger tutorial also describes it as "a JSON array of mod names with the .tmod extension dropped" (secondary; https://www.hostinger.com/tutorials/how-to-mod-terraria).

### install.txt
- From the script: one Workshop item id per line, nothing else (each line is passed verbatim after `+workshop_download_item 1281930`; blank lines are not skipped and would produce a malformed command). Format is not otherwise documented; "install.txt ... listing all the workshop publish ids" (player guide, Export Pack Instance).

### tmlversion.txt
- Written by the client's "Export Pack Instance" ("a tmlversion.txt labelling the tml version to use"). The script reformats it: `sed -E 's/\.([0-9])\./\.0\1\./g'` and prefixes `v` ("it is missing padded 0's on months/days"). Only used by the GitHub install path.

### How to produce install.txt + enabled.json (official method, needs a client)
README.md: tModLoader main menu, Workshop, Mod Packs, "Save Enabled as New Mod Pack", "Open Mod Pack Folder", open the pack's folder, create a `Mods` folder, copy `install.txt` and `enabled.json` into it. Player guide: "Export Pack Instance - Exports a copy of the ModConfigs and <ModPackName>/Mods folder to InstallDirectory/<ModPackName> so that you can ... quickly setup a server with the pack. Check InstallDirectory/<ModPackName>/SaveData/Mods for an install.txt file listing all the workshop publish ids and a tmlversion.txt".

## 5. Getting the internal mod name from a Workshop id (needed if the panel wants to build enabled.json itself)
The Workshop API gives a display title ("Calamity Mod"), not the internal name that `enabled.json` needs. But the downloaded `.tmod` file starts with a fixed header (`TmodFile.Read`, https://raw.githubusercontent.com/tModLoader/tModLoader/1.4.4/patches/tModLoader/Terraria/ModLoader/Core/TmodFile.cs lines 315-345):
`"TMOD"` (4 ASCII bytes), tML version as a .NET BinaryWriter string, 20-byte hash, 256-byte signature, int32 data length, then the **mod name** (BinaryWriter string) and the mod version (BinaryWriter string). A BinaryWriter string is a 7-bit-encoded length followed by UTF-8 bytes. So a panel can read the name straight from any downloaded `.tmod`. (I did not execute any parser; this is read from the source.)
Alternative that needs no parsing: let the user paste the `enabled.json` + `install.txt` made by the client (section 4), which is the officially documented route.

## 6. Launch and server config for mods (Windows)

`start-tModLoaderServer.bat` (85 bytes, in the zip):
```
@echo off
cd /D "%~dp0"
LaunchUtils/busybox-sh.bat ./start-tModLoaderServer.sh %*
```
`start-tModLoaderServer.sh` adds `-server`, defaults to `-config serverconfig.txt`, and **prompts** "Use steam server (y/n)" and the lobby type unless `-steam`/`-nosteam` (and `-lobby`) are given. Headless start therefore needs two things (wiki, Starting-a-modded-server.md): a Steam mode and a world.
- Steam mode: `-nosteam`, or `-steam -lobby friends`, `-steam -lobby friends -friendsoffriends`, `-steam -lobby private`.
- World: `-world "full\path\World.wld"` or `world=` in the config file ("no quotes, and remove the leading #").
- Mod related arguments, from Command-Line.md and the wiki: `-tmlsavedirectory <dir>`, `-savedirectory <dir>`, `-modpath <dir>` ("Specifies the folder to look for .tmod files. Useful for hosted servers"; also a config setting `modpath=`), `-modpack <name>` ("The mods specified in the modpack (and only them) will be loaded"; also `modpack=`), `-steamworkshopfolder <dir>` (listed in the wiki's TOBEADDEDLIST with no description; behaviour read from `WorkshopHelper.GetWorkshopFolder` above), `-config <file>`.
- The shipped `serverconfig.txt` comments (verbatim): `#modpath=C:\Users\YOUR_USERNAME_HERE\My Documents\My Games\Terraria\tModLoader\Mods\` and `#modpack=MyModpack`. `-modpack` takes a pack name from the client-side `ModPacks` folder (`CommandLineModPackOverride` appends `.json`); a server rarely has that folder, so `enabled.json` is the normal way.
- Dedicated hosts: "Make sure the host launches tModLoaderServer with a Mods path (-modpath or modpath= in the config). A relative path like modpath=./Mods may work. Add -savedirectory ./ to the launch command." (wiki). Wiki also says some mods write into the save directory, hence `-savedirectory`.
- Port 7777 is the Docker `EXPOSE 7777` and the default in `serverconfig.txt` (`#port=7777`). Terraria ports/protocol are covered by the other research files.
- Console command run in the Docker image: `docker exec -it tml execute "say Hello World!"` (README). Graceful stop through the console (`exit`) is covered elsewhere (UNVERIFIED here).

Minimal unattended Windows launch built only from the documented pieces (design suggestion, not a quoted command):
`start-tModLoaderServer.bat -nosteam -config serverconfig.txt -tmlsavedirectory "<folder>" -steamworkshopfolder "<folder>\steamapps\workshop"` with `world=` / `autocreate=` / `worldname=` in `serverconfig.txt`. Each piece appears in the sources above; the combination was not run.

## 7. Version matching between client and server

### tModLoader version
- Server compatibility rule in code (`ModNet.IsClientCompatible`/`NetVersionString`): the client must send the same `versionedName`, OR (for stable/preview builds) the same "network compatibility version": `StableNetVersion = BuildInfo.tMLVersion.MajorMinorBuild()` (year.month.build, i.e. the first three numbers; the last number is ignored), with `IncompatiblePatchVersion = 2022.1.1.1` as a special case when major.minor equals 2022.1. Otherwise kick message: `You are on <client>, server is on <server>`.
- Wiki, Debugging-Multiplayer-Usage-Issues.md: "Verify that the tModLoader version of the Client and the Server match exactly. If not, reinstall the latest tModLoader." and the join error text is "You are not using the same version as this server".
- tModLoader releases monthly and "sometimes those updates will break mods" (Basic-tModLoader-Usage-FAQ.md). A mod that is not updated for the new month can stop working; the old build is on GitHub releases ("stable" releases page) and via the Steam branches. So pinning the server version matters: install by tag, not "latest", once a pack works.
- Steam branch for clients: `None` (stable), `preview-v2026.X`, `1.4.3-legacy`, `1.3-legacy` (player guide; branch names from https://api.steamcmd.net/v1/info/1281930). Thorium's Workshop page says "Make sure you're on the stable version of 1.4.4 ... It won't work on the preview version!".

### Mods
- Every mod with side != Server is synced: `AssignNetIDs` uses `ModLoader.Mods.Where(mod => mod.Side != ModSide.Server)`. The server sends a header list (name, version, 20-byte hash); the client compares `ModHeader.Matches`: name AND version AND hash (ModNet.cs). Mismatch causes a reload with the server's set.
- **Clients download missing mods automatically** (`downloadModsFromServers = true`, ModNet.cs) after showing a "reload required" screen; the downloader checks the Workshop (`TryGetModDownloadItem`) and shows a risk state: not on Workshop, banned, fewer than 1000 downloads (`Downloads < 1000` => LowSubscriberCount), available, unable to verify. The client setting can disable the download, in which case the mod is on a blocked list. Also: "You can test multiplayer by hosting a server and having others join your server. The mod should automatically be synced from your computer to them" (Basic-Netcode.md).
- Server-only mods (`ModSide.Server`) are not synced to the client; client-only mods are not loaded on the server (`LoadSide` returns `side != (Main.dedServ ? ModSide.Client : ModSide.Server)`, ModOrganizer.cs line 438). Workshop tags show a mod's side as "Both", "Client", "Server" or "NoSync"; all popular mods below are tagged "Both" (Steam Workshop API tags).
- Mod load order does not need matching by the player; the server's enabled set decides. (One third-party hosting guide says order can matter; not confirmed in official sources: UNVERIFIED.)
- Config values: server-side ModConfig values are sent to clients (`pendingConfigs`, ModNet.cs), which may force a reload.

## 8. Popular mods (Steam Workshop, queried 2026-10-15)

How: the Workshop browse page for app 1281930 sorted by total unique subscribers
(`https://steamcommunity.com/workshop/browse/?appid=1281930&browsesort=totaluniquesubscribers&section=readytouseitems&actualsort=totaluniquesubscribers&p=1&days=-1`), then
`POST https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/` (public, no key) for titles, sizes, subscriptions and update dates. "Required items" read from each item's page `https://steamcommunity.com/sharedfiles/filedetails/?id=<id>`. Workshop id is also the `install.txt` line. Sizes are the Workshop file size (the download).

| Workshop id | Title | Lifetime subs | Size | Updated | Required items (from its page) |
|---|---|---|---|---|---|
| 2824688072 | Calamity Mod | 10.42 M | 404 MB | 2026-08-10 | Calamity Mod Music 2824688266 |
| 2824688266 | Calamity Mod Music | 9.91 M | 697 MB | 2026-02-06 | |
| 2619954303 | Recipe Browser | 8.95 M | 1.4 MB | 2026-09-05 | |
| 2669644269 | Boss Checklist | 8.77 M | 3.3 MB | 2026-05-10 | |
| 2563309347 | Magic Storage | 7.80 M | 5.6 MB | 2025-09-22 | absoluteAquarian Utilities (SerousCommonLib) 2908170107 |
| 2908170107 | absoluteAquarian Utilities (SerousCommonLib) | 7.25 M | 0.3 MB | 2025-08-04 | |
| 2599842771 | AlchemistNPC Lite | 6.20 M | 1.6 MB | 2025-12-28 | |
| 2785100219 | Subworld Library | 5.69 M | 0.2 MB | 2026-08-21 | |
| 2565639705 | Ore Excavator (Veinminer) | 5.65 M | 0.9 MB | 2024-08-14 | |
| 3222493606 | Luminance | 4.99 M | 13.9 MB | 2026-06-13 | |
| 2570931073 | Fargo's Mutant Mod | 4.91 M | 4.2 MB | 2026-04-10 | |
| 2797518634 | Quality of Terraria | 4.73 M | 31 MB | 2026-05-23 | |
| 2824688804 | Calamity's Vanities | 4.33 M | 46 MB | 2026-08-08 | |
| 2838015851 | Catalyst Mod | 3.35 M | 103 MB | 2026-08-08 | Calamity Mod |
| 2995193002 | Calamity: Wrath of the Gods | 3.07 M | 532 MB | 2026-06-13 | Calamity Mod, Luminance, Subworld Library, DAYBREAK 3478363753 |
| 2909886416 | Thorium Mod | 3.07 M | 144 MB | 2026-08-01 | none listed |
| 2815540735 | Fargo's Souls Mod | 3.06 M | 236 MB | 2026-05-10 | Fargo's Mutant Mod, Luminance |
| 2563784437 | Cheat Sheet | 2.85 M | 0.6 MB | 2026-09-03 | |
| 2564645933 | HERO's Mod | 2.77 M | 1.0 MB | 2026-09-03 | |
| 3459129920 | Calamity Mod Infernum Mode | 2.40 M | 188 MB | 2026-08-08 | Calamity Mod, Luminance, Subworld Library |
| 2565540604 | Auto Trash | 2.61 M | 0.3 MB | 2026-09-03 | |
| 2687866031 | Census - Town NPC Checklist | 3.16 M | 0.2 MB | 2026-09-03 | |
| 3478363753 | DAYBREAK | 2.54 M | 1.3 MB | 2026-06-13 | |

Notes (sources: the Workshop descriptions via the details API):
- **Calamity Mod**: "this mod REQUIRES Calamity's soundtrack! You will need to download the music mod" (so 404 MB + 697 MB, ~1.1 GB, to every player and the server). Adds bosses, difficulty modes, 2000+ items, reworks reforging and Hardmode progression. Fargo's Souls page: "If you intend to use this mod with the Calamity Mod, use the official Fargo's Souls DLC addon mod" (id 3044249615 as linked there; I did not read that item's page).
- **Thorium Mod**: "Vanilla+" content pack, "Current Version: 1.7.2.8", 3 new classes; must be on stable 1.4.4 (or 1.4.3-legacy), not preview. Page shows no required items.
- **Fargo's Souls Mod** needs Fargo's Mutant Mod and Luminance. **Infernum** needs Calamity, Luminance and Subworld Library. **Wrath of the Gods** needs Calamity, Luminance, Subworld Library and DAYBREAK.
- Library mods (SerousCommonLib, Luminance, Subworld Library, DAYBREAK) have huge counts only because other mods depend on them.
- Categories seen in the top 30: big content overhauls (Calamity, Thorium, Fargo's, Catalyst), QoL/info (Recipe Browser, Boss Checklist, Census, Boss Cursor, Auto Trash, Quality of Terraria), storage/crafting (Magic Storage, AlchemistNPC Lite), cheats/admin (Cheat Sheet, HERO's Mod, Structure Helper), libraries (listed above). I did not read each description for server relevance beyond the table.
- Dependencies matter: `enabled.json` must list every dependency by internal name, and `install.txt` every dependency's id. The client's "Save Enabled as New Mod Pack" export covers this because it saves what is currently enabled.

## 9. Risks

- **Save compatibility.** Mod data lives in `<World>.twld` next to `<World>.wld` (README folder tree). The tModLoader player guide warns that bugs can corrupt saves and says tModLoader keeps backups (`Terraria\...\Worlds\Backups`, zip per world) and "If you can't get backups to load, your issue is likely a broken mod." Removing a mod or changing a major mod version in an existing world is not documented as safe; I did not find a statement either way. Treat as risky: UNVERIFIED. Also worlds migrated from a newer Terraria version show "(LaterVersion)" (FAQ).
- **Monthly tML updates can break mods** (FAQ). Pin versions and take a world backup before updating mods or tML.
- **Bad mods can disable themselves or the whole set on join**: "When I join my own server, mods get disabled ... caused by bad mods. You must view the `server.log`" (Debugging-Multiplayer-Usage-Issues.md). Logs: `tModLoader-Logs/server.log` in the install folder (Usage Guide "Logs"); the panel should expose it.
- **No ARM support** for tML or the dedicated server (README). Windows x64 is fine.
- **Windows Defender / Controlled Folder Access** can block the launch (`ControlledFolderAccessSupport` message in Program.TML.cs: add the process to the allowed apps).
- Firewall: allow `dotnet.exe` from the install folder, port 7777 (wiki; "unblock the [install folder]/dotnet/dotnet.exe file on the Windows Firewall").
- Size and load time: Calamity + Music alone are ~1.1 GB of downloads for each client the first time; Workshop download for clients happens when they join (section 7). Memory use of modded servers: no official figure found (UNVERIFIED; the candidates note says 2-4 GB+ is common, unsourced).
- Steam Workshop items can be removed/banned; ModNet marks `BannedOnWorkshop` and `NotOnWorkshop`.

## 10. Recommendation for GodlyPanel

Offer a **separate game entry "Terraria (tModLoader, modded)"**, not a mods field on a vanilla Terraria entry, because vanilla and tModLoader clients cannot join each other's servers.

1. **Installer:** download `tModLoader.zip` from GitHub releases (no Steam account), default = latest tag from the GitHub API, with a version field so a working pack can be pinned (`v2026.08.3.0` today). Optional second installer `steamcmd ... +login anonymous +app_update 1281930` only after someone confirms it works (UNVERIFIED). First launch downloads .NET 8 through `InstallDotNet.sh` (verify on a real install).
2. **Mods field = a Workshop id list** (one id per line) that the panel writes to `Mods/install.txt` and installs with the documented command: `steamcmd +force_install_dir <folder> +login anonymous +workshop_download_item 1281930 <id> ... +quit`. Check afterwards that each `steamapps/workshop/content/1281930/<id>` contains a `.tmod` (the official script does not).
3. **enabled.json:** accept an uploaded `enabled.json` (best, from the user's own "Save Enabled as New Mod Pack"), or auto-build it by reading the internal names from the downloaded `.tmod` headers (format in section 5). Warn that dependencies must be in both lists. A "paste the two files from your client's mod pack folder" import is the most reliable UX.
4. **Config file:** `serverconfig.txt` (starts from the file shipped in the zip) with `world`, `autocreate`, `worldname`, `maxplayers`, `port`, `password`, `modpath`/`modpack` as in section 6; start script uses `-nosteam` (or an explicit `-steam -lobby ...`) so it never prompts, plus `-tmlsavedirectory` and `-steamworkshopfolder`.
5. **UI warnings:** clients need the same tModLoader version (first three numbers) and will download the mods on join; big packs (Calamity ~1.1 GB) take time; take a world backup before changing mods; show `server.log` for failures.
6. A "Mod update" button = re-run the same `workshop_download_item` list and restart (the official script's update path does the same; it does not check versions).

## UNVERIFIED (count: 11)
1. Whether `steamcmd +login anonymous +app_update 1281930` installs tModLoader (the official script only uses a real login; anecdotes conflict).
2. Whether the Steam depot (1281932, 207 MB) bundles `dotnet/` while the 61 MB GitHub zip does not (inferred from sizes only), and whether the first-launch .NET 8 download via `InstallDotNet.sh` works fully unattended on Windows.
3. The exact folder layout inside a Workshop item folder produced by `workshop_download_item` (version sub-folders like `2026.8` are expected from the regex in `ModOrganizer.cs`; I did not look at a real download).
4. Whether the combined Windows command in section 6 (`-nosteam -config ... -tmlsavedirectory ... -steamworkshopfolder ...`) runs headless without any prompt (each part is sourced; the combination was not run).
5. Graceful stop of the tModLoader server from the console (`exit`) and via stdin when launched through `busybox-sh.bat` (not researched here).
6. RAM needs of modded servers (no official or sourced figure).
7. Whether adding or removing mods in an existing world is safe, per mod (no statement found; general backup warnings only).
8. Whether mod load order can matter for joining (third-party claim only).
9. Whether Calamity Mod Music must also be loaded by the dedicated server (it is a listed required item and the music mod is side "Both"/synced to clients, but I did not check its side tag or whether the server skips it).
10. The Fargo's Souls DLC for Calamity (id from a link in Fargo's description, 3044249615) was not opened.
11. Which exact tModLoader build number the "1.4.5 era" popularity spike in `candidates.md` corresponds to; this file only establishes that stable is v2026.08.3.0 on Terraria 1.4.4.9 content per the wiki.

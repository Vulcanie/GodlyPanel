# Icarus: modded dedicated servers (conventions section D)

Researched 2026-10-14. Game store app 1149460, dedicated server app 2089300. Game build: weekly-patched live build (exact build number not captured, UNVERIFIED). All mod-path facts below come from third-party hosting guides and mod-tool READMEs. Neither RocketWerkz's server wiki nor icarus.wiki.gg mentions mods.

## Short answer
There is NO official/supported mod path for the Icarus dedicated server. There is no Steam Workshop, no mod loader to install, and no modlist or launch argument that enables mods. Community mods are `.pak` files that the game loads from a lowercase `mods` folder inside `Content\Paks`. Mod authors build those paks on a PC with a community tool. The server only needs the finished pak(s) copied into the folder, and every player needs the same pak(s).

## 1. Official position / what is NOT supported
- RocketWerkz server wiki sidebar has 8 pages (Home, Connecting to Servers, Console RCON Commands, Migrating prospect from local Icarus, Prospect Names, Server Config & Launch Parameters, Server Setup, Updating Dedicated Server and Running your Server). Fetched Home, Server Setup, Updating, Connecting, and Server Config pages: none mention mods, pak, workshop or anti-cheat. https://github.com/RocketWerkz/IcarusDedicatedServer/wiki (and the sub-pages, e.g. /wiki/Server-Setup, /wiki/Server-Config-&-Launch-Parameters)
- icarus.wiki.gg Dedicated Servers page: no mention of mods, pak, workshop, anti-cheat, EAC. https://icarus.wiki.gg/wiki/Dedicated_Servers
- Steam app metadata for 1149460 (https://api.steamcmd.net/v1/info/1149460): type "Game"; the returned record has no `workshop_visible` or workshop-id field. Categories returned: 1, 2, 9, 22, 23, 29, 38, 45, 46, 62. I did not confirm the Steam category-30 (Workshop) meaning from an opened source, so treat "category 30 absent means no Workshop" as a weaker inference. The absence of a workshop field is what was read.
- Statements of "no official support / no Steam Workshop":
  - GameServerKings: "RocketWerkz doesn't officially support mods and its dedicated-server documentation doesn't mention them"; "The game loads them from Icarus/Content/Paks/mods, with no mod loader and no Steam Workshop." https://www.gameserverkings.com/knowledge-base/icarus/icarus-mods/
  - Nodecraft: Icarus "does not natively support mods through platforms like the Steam Workshop"; recommends Nexus Mods and community Discords. https://nodecraft.com/support/games/icarus/how-to-install-mods-to-your-icarus-server
  - Supercraft: "there is no Steam Workshop support for servers yet." https://supercraft.host/wiki/icarus/modding_basics/
- A search summary claimed one Supercraft best-mods page tells readers to subscribe on Steam Workshop (while also saying dedicated servers need manual .pak copying). That page timed out twice and I could not open it, so that claim is UNVERIFIED and contradicts the three sources above plus the Steam metadata.
- Console Edition does not support mods (one hosting guide, via a search-result summary; page not opened). UNVERIFIED, irrelevant to PC dedicated servers.
- Unrelated: the in-game "alterations"/"mod making and mod attaching workstations" (Week 33 news) are an equipment-modification gameplay feature, not community mods. https://eip.gg/icarus/news/week-33-update-new-time-pressure-mission-future-equipment-alteration-and-dedicated-servers/

## 2. Where mod files go on the server
- Folder: `<server install>\Icarus\Content\Paks\mods\` (create it; it does not exist by default). Corroborated by: GameServerKings (`/home/container/Icarus/Content/Paks/mods/` on their Linux/Wine host, i.e. `Icarus/Content/Paks/mods`), Nodecraft (`/Icarus/Content/Paks` then create `mods`), Sparked Host (navigate to "Icarus/Content/Paks", create directory "mods"), Supercraft (`Icarus/Content/Paks/mods/`). https://help.sparkedhost.com/en/article/how-to-install-mods-on-an-icarus-dedicated-server-fz2z67/
- Name case: Supercraft says the folder name must be lowercase ("lowercase is critical") and `~mods`/`Mods` may not work. CrystalFerrai's manager README refers to `Icarus\Content\Paks\Mods` (capital M) for the client. The sources conflict. Windows folders are case-insensitive, so create it as lowercase `mods` and the conflict does not matter on Windows. Whether the game itself is case-sensitive is UNVERIFIED.
- The install root contains an `Icarus` folder: RocketWerkz documents `[ServerInstallDirectory]\Icarus\Saved\Config\WindowsServer\` for config, and the exe is `IcarusServer.exe`. So the mods folder relative to the install root is `Icarus\Content\Paks\mods`. Content\Paks existence in a fresh server install is implied by all the guides but I did not see a listing of it (UNVERIFIED as a listing). Source: https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Server-Setup
- Install steps used by hosts: stop the server, create `mods`, upload the `.pak` file(s) (and for IMM, also the list file), start the server. Sources: GameServerKings, Nodecraft, Sparked Host above. Sparked Host's guide uploads a mod ZIP and extracts it in the folder; it says "This guide is for .pak mod files only."
- Some mods also need edits to `Game.ini` or `Engine.ini` in `Icarus\Saved\Config\WindowsServer\` (Nodecraft). This is mod-specific, not a general enable switch.

## 3. How mods are made (the "loader" question)
No loader install step exists for ordinary pak mods (GameServerKings: "no mod loader"; CrystalFerrai README: "not requiring a mod loader"). There are two unrelated community tools, and their mods are not interchangeable:
1. JimK72's Icarus Mod Manager (IMM), repo `Jimk72/Icarus_Software` (https://github.com/Jimk72/Icarus_Software). README: edits/extracts/merges/packs mods; mods are `EXMod` single files holding modified JSON (and a zipped `EXMODZ` variant); merge output is `IMM_Merged_Mod_P.pak` plus `IMM_Merged_Mod.txt` (list of merged mods) in the game's mods folder. README on servers: the list file "is for servers so you can copy both files to your servers mods folder." The README warns the tool's data folder must match the version of the mod being imported. GameServerKings adds it needs UnrealPak (IMM offers to download it) and quotes IMM notes: "UASSET files may cause dedicated server issues".
2. CrystalFerrai's IcarusModManager (https://github.com/CrystalFerrai/IcarusModManager). README: GUI app; mods in Zip format (Pak supported with fewer features); handles data-table (JSON) mods, blueprint mods and both; needs .NET 8 Desktop Runtime x64; game must be closed when installing; settings in `%localappdata%\IcarusModManager`; README has no dedicated-server instructions. It says it works only with mods built for it.
Both are Windows desktop tools run on the player's PC. The server never runs them. Nothing for GodlyPanel to install.

## 4. Client matching
- Everyone must have the same mods. Nodecraft: "install the mods onto your game client" so it matches the server. Supercraft: content mods (items, textures, assets) require matching installs ("every player must install the same mod"), server-side-only logic mods need no client install. GameServerKings: give every player the server's exact pak; mismatches cause vanishing items, conflicting recipes, desyncs; "Neither manager nor RocketWerkz documents what happens when client and server differ." Sparked Host: "Some mods also require you to install them on both the server and the client."
- A search summary said the server "will reject players who lack the same .pak" (one source). Contradicts GameServerKings (undocumented). UNVERIFIED which happens.
- The mod-installed title-screen notice "added in Week 94" is a single source (GameServerKings) and I could not find Week 94 patch notes. UNVERIFIED.

## 5. Config lines / launch arguments
- No config key or launch argument turns mods on. The server `ServerSettings.ini` key list (SessionName, JoinPassword, MaxPlayers, AdminPassword, ResumeProspect, LastProspectName, LoadProspect, CreateProspect, ShutdownIfNotJoinedFor, ShutdownIfEmptyFor, AllowNonAdminsToLaunchProspects, AllowNonAdminsToDeleteProspects) and the launch args (-SteamServerName, -UserDir, -saveddirsuffix, -LOG, -ABSLOG, -PORT, -QueryPort, -MULTIHOME, -ResumeProspect, -LoadProspect, -CreateProspect) contain nothing mod-related. Source: https://github.com/RocketWerkz/IcarusDedicatedServer/wiki/Server-Config-&-Launch-Parameters
- GameServerKings also found no mod-specific settings.

## 6. Popular loaders and mod categories (2026)
- Tools: JimK72's IMM and CrystalFerrai's IcarusModManager (above). A UE4SS-based mod ("Icarus Configuration Mod", Nexus mod 244) also exists; it is a script-injector approach, not the pak path, and Nexus flagged "some suspicious files" per a search summary. UE4SS server-side use: UNVERIFIED.
- Distribution site: Nexus Mods Icarus section (https://www.nexusmods.com/icarus/mods/). Direct fetches of Nexus and ProGameGuides returned HTTP 403, so I have NO download counts or popularity ranking. UNVERIFIED which mods are the most used.
- Categories seen via search-result summaries of Nexus pages (not opened directly): inventory stack size and weight tweaks (Nexus mod 44 "max stack 5000", mod 248 "Balanced Stack & Weight", mod 317 "Deyvid Mods All-in-One" 20-in-1 pak with 2x or 10x stack variants), a broad quality-of-life tweak tool driven by an INI (Nexus mod 141: XP, talent points, stack sizes, inventory slots). Stack-size/QoL tweaks are the dominant category. Maps/admin tools: none found. Summaries only, treat as indicative.

## 7. Risks
- Weekly patches (Thursdays): mods built for an older `Data.pak` can break or restore stale data; remove/rebuild mods after each patch. GameServerKings: `AUTO_UPDATE` boot-updates skip validation and leave the mods folder; RocketWerkz has "blamed leftover mod files for some post-update crashes"; since Week 244 the server browser only shows matching-version servers by default. Nodecraft and Supercraft also warn of post-update breakage. "Week 244" and the "blamed" statement are single-source (GameServerKings): UNVERIFIED.
- `.uasset` mods (new items/meshes/blueprints) are the riskiest on a dedicated server (IMM note quoted by GameServerKings).
- A mod that crashes the client also crashes the server (GameServerKings, single source).
- Save compatibility: GameServerKings says items added by a mod stay in saves and removing the mod later can make them disappear or break the prospect; backup `Icarus/Saved/PlayerData/DedicatedServer/Prospects/` first. Supercraft says (via search summary) mod-aware saves do not load on vanilla servers; its modding page does not address saves. Treat as plausible, single-source each.
- Anti-cheat: no source states Icarus uses Easy Anti-Cheat or any anti-cheat; Steam metadata shows no EAC hint; none of the opened docs mention it. So no documented ban risk, but also no confirmation: UNVERIFIED.
- Does SteamCMD `app_update 2089300 validate` delete extra files such as `Content\Paks\mods`? GameServerKings says a boot-time update leaves the folder, but that is not the same as a SteamCMD validate. UNVERIFIED. (For comparison, the DST wiki warns validate deletes mods for that game.)

## UNVERIFIED list
1. Whether the game's mods folder name is case-sensitive (sources conflict: `mods` vs `Mods`); on Windows irrelevant.
2. What happens when a client lacks the server's mods (reject vs desync vs nothing).
3. Whether `app_update 2089300 validate` removes `Icarus\Content\Paks\mods` or the pak files in it.
4. Whether `Icarus\Content\Paks` exists in a fresh Windows server install (implied by guides, no file listing seen).
5. Week 94 title-screen mod notice; Week 244 server-browser version filter; RocketWerkz blaming leftover mod files (single-source).
6. Whether Icarus uses an anti-cheat and how it treats mods.
7. A claimed Steam Workshop route (single unopened Supercraft page); contradicted by three sources and Steam metadata.
8. Most-used mods and download counts on Nexus (pages returned 403).
9. UE4SS-based mods on a dedicated server.
10. Console Edition having no mod support (irrelevant to PC).
11. The exact Icarus build the facts are for.
12. Steam category 30 = Workshop mapping (not opened from a source).

## Recommendation for GodlyPanel
- Do NOT add a `mods` field to the Icarus create form (no id list, no config key to write) and do NOT add a loader install step or Workshop-id support: none exists.
- Offer a manual-only path: a plain-language note in the Mods area for Icarus ("Icarus has no official mod support. Mods are .pak files placed in Icarus\Content\Paks\mods; every player needs the same files; mods often break after the weekly Thursday update"), plus a one-click "open mods folder" (creating `Icarus\Content\Paks\mods` if missing) if the panel has a file-open feature. Optionally an "upload .pak" helper that drops files into that folder.
- Make the panel's update routine (SteamCMD `app_update 2089300 validate`) not delete `Icarus\Content\Paks\mods`: either back it up and restore, or test once on a real install (UNVERIFIED #3). Warn before updating that mods may need rebuilding, and offer a "disable mods" toggle that renames `mods` to `mods-off` (a recovery step from GameServerKings) for crash-after-patch situations.
- Priority is low; treat Icarus as a vanilla-first game template.

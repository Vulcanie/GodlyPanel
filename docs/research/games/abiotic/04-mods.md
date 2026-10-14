# Abiotic Factor (server app 2857200) - Modded servers (conventions section D)

Researched 2026-10-14. Build the facts apply to: v1.4.0.28206, Community Update #4 hotfix (27 July 2026), still the newest build as of 27 Sep 2026 per GameServerKings. Fetch limits: Nexus Mods returned HTTP 403 (pages seen only through search summaries), the official Modding FAQ link was not retrievable, so most details below are from hosting-provider guides, not from Deep Field.

## 1. Bottom line

- There is NO official, supported mod path for dedicated servers today. Deep Field's patch notes (quoted by GameServerKings): "use mods at your own risk. We offer no support or protection if you break your game or world saves with mods."
- Official mod support (mod.io, in-game browser, free Mod Editor) is announced as "Community Update #5 - The Modding Update". No release date. Deep Field says existing mods will likely ALL break when it ships. How dedicated servers will load mod.io mods has not been stated.
- Today's unofficial path: manual file drops (pak mods, UE4SS Lua mods). Works on a self-hosted Windows server, but server-side behaviour is mod-by-mod and uneven.
- There is no Steam Workshop and no Thunderstore for this game. Nexus Mods is the main unofficial site (about 250 mods per GameServerKings).

## 2. Official mod support status (sources)

- Steam announcement "Entropic Break Development Update" (16 Sep 2026): official mod support in Community Update #5 with integrated mod.io; modding support and tools "will activate on or around the update's release"; Mod Editor is a free separate Windows download and does not require owning the game; PC, Xbox, PS5; existing mods will likely break, uninstall them first; expansion delayed to Q1 2027. Source: Steam community hub, https://steamcommunity.com/app/427410 (fetch summary; year not shown on page, the doomhosting post dates the dev update 17 Sep 2026; sources disagree 16 vs 17 Sep).
- Steam post "SR #25: First Look at Community Update #5 and Mod Support!" (25 Sep): Mod Editor built with mod.io, free separate PC app, in-game mod menu on each platform. Same source URL.
- Secondary coverage of the FAQ: in-game mod browser, mod collections on day one, automatic mod sync when joining a modded server, mods can NOT add levels/portal worlds, edit existing levels, add sandbox/gameplay settings or keybindings, no localization. https://www.doomhosting.com/blog/abiotic-factor-entropic-break-delay-mod-support-2027 and https://www.gameserverkings.com/knowledge-base/abiotic-factor/abiotic-factor-mods/
- Dedicated servers under the official system: Deep Field "hasn't said"; GameServerKings calls any server-side setup details guesswork until the official guide exists. Mod sync for clients is reported as automatic (third-party, unconfirmed by primary source).
- Existing saves: should be compatible by default with the official system, some mods may need a new playthrough (doomhosting, GameServerKings).

## 3. Unofficial path today (what works on a self-hosted Windows server)

Two mod types (https://www.gameserverkings.com/knowledge-base/abiotic-factor/abiotic-factor-mods/ , https://xgamingserver.com/docs/abiotic-factor/mod-setup , GTXGaming https://www.gtxgaming.co.uk/clientarea/index.php?rp=%2Fknowledgebase%2F970%2FHow-to-Install-Mods-on-Your-Abiotic-Factor-Dedicated-Server.html ):

| Type | Files | Server location (relative to install root) | Loader needed |
|---|---|---|---|
| Pak mod | `.pak` + `.ucas` + `.utoc`, names end `_P` (patch pak) | `AbioticFactor/Content/Paks/` | none |
| UE4SS Lua mod | folder containing `Scripts/` (+ `enabled.txt`) | `AbioticFactor/Binaries/Win64/ue4ss/Mods/<ModName>/` | UE4SS |
| Blueprint "LogicMods" UE4SS mod | pak files | `AbioticFactor/Content/Paks/LogicMods/` (GTXGaming only) | UE4SS |

- Pak notes: do not touch the game's own `pakchunk0-WindowsServer` and `global` files (GTX). Two pak mods editing the same table conflict. Pak packing details (UE 5.4, `_P` suffix, FModel, `GAME_UE5_4`): https://hackmd.io/@Swept/abioticfactormodding (this guide does not cover dedicated servers).
- UE4SS install (hosting guides, Windows): stop server; put `dwmapi.dll` (XGamingServer says `dwmapi.dll` or `version.dll` depending on UE4SS version) and the `ue4ss/` folder into `AbioticFactor/Binaries/Win64/` (next to the Win64 shipping exe); XGamingServer says use the standard release, not the debug or "dedicated server" build. Folder layout differs by build: the community "UE4SS for Abiotic Factor" bundle (Nexus mod 35, page not fetchable, summary via search) uses a `ue4ss/` subfolder with `ue4ss/Mods/`; upstream UE4SS v3.0.1 puts `dwmapi.dll` and `Mods/` directly in `Win64/`. Follow the bundle's own instructions (GameServerKings).
- Enabling a UE4SS mod: either an `enabled.txt` file in the mod folder, or a line `FolderName : 1` in `ue4ss/Mods/mods.txt` (name must match the folder; `0` disables). Source: XGamingServer, GTXGaming.
- No launch arguments or server config lines are needed to turn mods on. Nothing in the sources mentions a launch arg or ini key for mods. (The official DFJacob wiki lists 5 pages and mentions no mods: https://github.com/DFJacob/AbioticFactorDedicatedServer/wiki ; only the home page loaded in the fetch.)
- UE4SS on hosted servers: GameServerKings says UE4SS does not load on its Proton/Linux-based hosts (no `UE4SS.log` on a 28 Sep 2026 test). XGamingServer and GTXGaming say it works on theirs. Native Windows self-host: not confirmed by any source I could open that a test was done on a real dedicated install; UNVERIFIED but the XGaming/GTX guides describe the same file layout.

## 4. Client matching

- XGamingServer: most mods must be installed on the server and on every connecting player, mismatches cause connection failures; players install UE4SS into `Steam/steamapps/common/Abiotic Factor/AbioticFactor/Binaries/Win64/`, pak mods into `Content/Paks/`, UE4SS mods into `ue4ss/Mods/`.
- GTXGaming: check each mod's page: server-side only mods need nothing from players; client or "both" mods must match the server version, otherwise crash or desync.
- GameServerKings per-mod examples: Better Backpacks works server-only but clients see wrong descriptions unless they install it; Instant Fishing is client-only ("Don't install the mod on a dedicated server"); ResourceMultiplier is a server-side UE4SS mod; Infinite Leyak Containment is host-only or needs UE4SS on the dedicated server. Safe default if a page is silent: everyone has same files and version.
- Implication: there is no automatic sync today; players do it by hand.

## 5. Loaders and popular mods

- Most-used loader: UE4SS (Unreal 4/5 Scripting System), a Nexus-hosted Abiotic Factor build exists (Nexus mod 35, https://www.nexusmods.com/abioticfactor/mods/35, 403 to fetch; seen via search). No Thunderstore/BepInEx (Unity-only anyway; UNVERIFIED that no Thunderstore community exists). Pak patching needs no loader.
- Popular/notable mods named by sources: Better Backpacks, ResourceMultiplier, Infinite Leyak Containment, Instant Fishing, Better Sandbox Setting Ranges, "Cheat Console Commands" (UE4SS, admin tool), RandomDay (UE4SS server Lua mod, cycles 17 sandbox profiles, `Win64/ue4ss/Mods/RandomDay/`, enabled via `mods.txt`; https://www.nexusmods.com/abioticfactor/mods/212 via search summary). Categories: QoL (backpack/storage/speed), sandbox/admin tools (cheat console, multipliers, sandbox ranges), cheats/convenience (instant fishing). No reliable ranking by downloads was retrievable (UNVERIFIED).

## 6. Risks

- Crashes and corrupted saves: Deep Field's first step after a Fatal Error is to remove mods; uninstalled mods can leave files behind on clients (fix: clear files / reinstall) - GameServerKings. Back up `Saved/SaveGames/Server` first (path from DFJacob/candidates, not re-verified here).
- Official-update breakage: expect every current mod to break at Community Update #5.
- Game updates break mods; confirm mod matches game version (GTXGaming).
- Sandbox: one owner reported the dedicated server kept vanilla maximums even with Better Sandbox Setting Ranges (unanswered report) - GameServerKings.
- Anti-cheat: no source states the game or dedicated server has anti-cheat that blocks mods. A Steam group comment says the game was listed on "Are We Anti-Cheat Yet?" as a possible EAC user and questions it with no proof (https://steamcommunity.com/groups/NoToEAC/comments). Treat as UNVERIFIED. Cheat-style mods are usually server-side admin tools; XGamingServer recommends cheats off on public servers.

## UNVERIFIED

1. Whether UE4SS loads on a native Windows dedicated server install (only hosting-guide claims; GameServerKings reports failure on Proton).
2. Exact UE4SS version/bundle that matches the current build and its exact folder layout (varies by bundle; Nexus pages were 403).
3. How dedicated servers will load mod.io mods, config lines, folders, or launch args under Community Update #5 (Deep Field has not said).
4. Whether mod.io sync works for clients joining a server (third-party reports only; official FAQ not opened).
5. Release date of Community Update #5 ("not too far away", no date).
6. Whether the game uses any anti-cheat.
7. Most-downloaded mod ranking and whether a Thunderstore community exists.
8. Save folder path and whether pak/UE4SS mods write to saves (not opened here).

## Recommendation for GodlyPanel

- Do NOT build a mods field, loader installer, or mod list for Abiotic Factor now. There is no supported mechanism, no config/launch-arg hook, and Deep Field says all current mods will break at Community Update #5, with the dedicated-server mechanism still unknown.
- Offer: leave `fields.mods` off; show a short note in the create form/docs: "Mods are unsupported by the developer; you can drop pak files into `AbioticFactor\Content\Paks` while the server is stopped, every player needs the same files, back up your world first." Optionally a "open server folder" shortcut if the panel has one.
- Revisit after Community Update #5 ships: re-read the official Modding FAQ and the DFJacob wiki for the server-side mod.io mechanism, then decide on a mods field (likely an ID list or collection) at that time.

# Soulmask (store app 2646460, Windows server tool app 3017310) - Modded servers (conventions section D)

Researched 2026-10-14, read-only web research (no server installed or run). Build the facts apply to: Soulmask 1.0 (released 10 Apr 2026) with Patch #20 "Beyond Gravity" (17 Sep 2026), per GameServerKings (data snapshot 28 Sep 2026). Fetch limits: the fandom wiki (soulmask.fandom.com, which hosts the "Modkits Overview" page) returned HTTP 402 for every fetch; web.archive.org is blocked in this tool; the Steam Workshop discussion page hit 429. So the original Modkits text was seen only through search-engine summaries, and almost everything below is from hosting-provider guides plus two Steam forum threads. No page I could open was written by the developer (CampFire Studio) itself.

## 1. Bottom line

- YES, supported. Soulmask has Steam Workshop mods, and a dedicated server loads them by Workshop ID from a launch argument: `-mod="ID1,ID2,..."`. The server downloads the Workshop items itself at startup (GameServerKings, citing "the official Modkits guide"; GHOSTCAP: "Steam Workshop mods are only downloaded when the server starts").
- Workshop opened Sept 2024; the Modkits (free Unreal Engine 4.27 editor, mods are `.pak` files) was released to everyone Dec 2024 (GameServerKings, https://www.gameserverkings.com/knowledge-base/soulmask/soulmask-mods.md ).
- No mod loader (BepInEx/UE4SS etc.) is needed or mentioned by any source for the Workshop route. Nexus/other-site mods are not on the Workshop, so the server cannot fetch them (GameServerKings).
- Players must have the SAME mods subscribed and enabled, otherwise the server refuses them and prompts them to subscribe (GameServerKings, XGamingServer, Nodecraft; GameServerKings attributes this to the official Modkits guide).
- Big caution: Soulmask 1.0 (10 Apr 2026) broke many older mods; a broken mod can crash the server at startup, and the start command keeps asking for it until the ID is removed (GameServerKings).

## 2. How a server gets mods (launch argument)

| Item | Fact | Source |
|---|---|---|
| Argument | `-mod="ID1,ID2,ID3"` (digits and commas only, no spaces; quotes around the whole list) | GameServerKings https://www.gameserverkings.com/knowledge-base/soulmask/soulmask-mods.md ; Nodecraft https://nodecraft.com/support/games/soulmask/how-to-add-steam-workshop-mods-to-your-soulmask-server.md ; XGamingServer https://xgamingserver.com/docs/soulmask/mod-setup ; Steam forum thread (Nov 2024) https://steamcommunity.com/app/2646460/discussions/0/4629231855272470948/ ("-mod=" example `-mod="3331511657,3325592770,3350049311"`, original poster said it worked) |
| Where IDs come from | The number after `?id=` in the item's Workshop URL | GameServerKings, Nodecraft |
| Load order | The order in the list is the load order; put framework/library mods before mods that depend on them | GameServerKings (one source only) |
| Windows start script | A Steam forum post (26 Sep 2024) says to add the Workshop mod ID in `start.bat`; it is a hosting-provider quote, with no syntax. | https://steamcommunity.com/app/2646460/discussions/0/4842022494094922413/ |
| Download | Server downloads the Workshop mods on startup. First boot with a big mod can take longer (GameServerKings); PingPlayers says up to 15 to 20 minutes delay. GameServerKings notes automatic download "hasn't been tested with every mod". | links above, plus https://pingplayers.com/knowledgebase/soulmask/how-to-add-mods-to-your-server |
| Where on disk | `WS/Mods/` under the server install (GameServerKings, GHOSTCAP: "/WS/Mods"). Those are Linux-host paths; the Windows server layout `WS\Mods\` follows from the same `WS` project folder (`WS\Saved\...` is confirmed for Windows by low.ms for GameXishu.json) but no source opened actually shows a Windows server `WS\Mods` after a Workshop download - UNVERIFIED. | https://www.ghostcap.com/guides/games/soulmask/install-mods , https://www.gameserverkings.com/knowledge-base/soulmask/getting-started-with-your-server/ |
| Manual fallback | Copy the mod folder from a PC's `<Soulmask install>\WS\Mods\` into the server's `WS/Mods/` and still keep the ID in `-mod` | GameServerKings |
| Does the Windows server need anything for Steam download? | A Steam forum user reported "Steam API failed to initialize" / `-NOSTEAM` errors on the Windows server and an unofficial workaround of copying `steamclient64.dll`, `tier0_s64.dll`, `vstdlib_s64.dll` into the server's Win64 folder. Unclear whether this affects Workshop download. | https://steamcommunity.com/app/2646460/discussions/0/4330853251139833199/?ctp=3 |
| Collection IDs | OxygenServ describes a "Workshop Collection ID" field, but that is a panel feature of one host (dated 16 Oct 2025, no command-line flag given). No other source mentions collections. Do not offer collections. | https://www.oxygenserv.com/en/how-to-install-mods-on-a-soulmask-server |
| Config-file way | None found. A Steam thread poster noted the .ini files were empty and there was no ini place for mod IDs (Nov 2024). | Steam thread above |

Related (not mod-specific) launch flags shown by low.ms (12 Sep 2026): `-adminpsw=`, `-MaxPlayers=` (default 20), `-pvp`/`-pve` (bare flags), `-saving=` (seconds, default 600), `-backup=` (seconds, default 900); default game port 8777. https://low.ms/knowledgebase/soulmask-getting-started (belongs to the launch step, not verified here).

## 3. Client matching

- Mismatch = refused with a prompt to subscribe to the right mods (GameServerKings, XGamingServer).
- Players must subscribe on Steam Workshop, let Steam finish downloading, enable the same mods in the in-game Mods menu (main menu "Mods" button) and click Apply before joining (GameServerKings). Mods live on a PC at `<Soulmask install>\WS\Mods\`.
- After an author updates a mod, restart the server so it loads the new version; version mismatch between client and server is "the most common cause of suddenly can't join" (GameServerKings).
- After a big patch the game disables incompatible mods on clients; the player re-enables them once the author updates (GameServerKings, search summaries).
- PingPlayers: you can see the mods by selecting the server in the in-game list (one source).

## 4. Loaders and popular mods

- No third-party loader is used. The "loader" is the game's own Workshop/Modkits system. UNVERIFIED that no UE4SS/pak-only community path exists for this game (not searched beyond the Workshop route).
- Named by GameServerKings: a "Tasty" framework and admin mods (last updated Jan 2025, so likely stale), and example ID lists in guides (`3325143163,3350047118,3325592770`, `3324057706,3330908154,3332634339`); what these mods ARE was not retrievable (Steam Workshop pages not fetched). I did not get a ranked "most subscribed" list. Categories: UNVERIFIED (framework libraries, admin tools, QoL are the only ones hinted at by GameServerKings).
- GameServerKings advises using native `GameXishu.json` settings for rates and limits (they survive patches) instead of mods for such changes. The file is `WS/Saved/GameplaySettings/GameXishu.json`, generated on first boot (GameServerKings getting-started; low.ms confirms the path).

## 5. Risks

- Version: mods not updated since 10 Apr 2026 are "a gamble"; check the Workshop "Updated" date (GameServerKings). A broken mod can crash the server during startup, and the start command keeps requesting it until the list is edited. If the server won't start, remove the most recently updated mods first.
- Saves: removing a mod that added items, buildings or creatures can leave those objects missing or broken in the save (GameServerKings, XGamingServer). Back up first.
- Wrong IDs/syntax: mod ignored or server crash at boot (PingPlayers).
- Anti-cheat: no page I opened mentions anti-cheat for Soulmask servers or mods (GameServerKings getting-started: "Anti-cheat: Not mentioned"). UNVERIFIED either way.
- Mods are not Linux/Windows specific because they are `.pak` data; whether a mod needs a particular platform is not stated by any source.

## UNVERIFIED

1. The exact wording of the developer's Modkits guide (fandom "Modkits Overview", blocked) - including whether it says anything about "anonymous" Workshop download for the server. Only one search-engine summary mentioned "enabling anonymous downloads" on official servers; no page I opened confirms it.
2. That a Windows dedicated server (tool app 3017310) actually downloads Workshop items into `WS\Mods\` on first start with `-mod=`. All "server downloads itself" claims are from hosting guides (Linux-based panels).
3. Whether the `-mod` list can be given on a Windows `.bat` with the same quoting (quote form is shown only on the Steam thread, where Steam's forum reformats quotes; GameServerKings/Nodecraft show straight quotes).
4. Which Workshop mods are the most used in 2026 and their categories (no ranking retrieved).
5. Anti-cheat presence or absence.
6. Whether a collection ID works with `-mod` (no).
7. Whether the Steam DLL workaround affects Workshop downloads.

## Recommendation for GodlyPanel

- Offer a "mods" field on the create form (and a Settings/Launch entry): a comma-separated list of Workshop item IDs (digits and commas only), written into the start script as `-mod="ID1,ID2"` only when the field is non-empty. Order matters; keep user order.
- No loader install step and no separate download step is needed (the server fetches at startup); show a plain note that players must subscribe to and enable the same mods, that first startup with mods can be slow, and to back up the world before adding/removing mods and after a game patch to remove mods whose "Updated" date is older than 10 Apr 2026.
- Before shipping, test once on a real Windows install with one small mod to confirm where it downloads (`WS\Mods\`) and that `-mod="..."` in a .bat works.

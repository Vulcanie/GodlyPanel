# Don't Starve Together - modded servers (research 2026-10-14)

Game: Don't Starve Together (store app 322330). Dedicated server: app 343050 "Don't Starve Together Dedicated Server" (Steam Tool, freetodownload=1, installdir `Don't Starve Together Dedicated Server`). Facts are for the current public build as of 2026-10-14 (build number not recorded; UNVERIFIED).

Source key (opened this session):
- [W1] https://dontstarve.wiki.gg/wiki/Dedicated_Server (page title "Guides/Don't Starve Together Dedicated Servers"; fetched also via `?action=raw` variant). Klei-community wiki, the main reference.
- [W2] https://dontstarve.wiki.gg/wiki/Guides/Simple_Dedicated_Server_Setup (covers only cluster/shard basics, no mods).
- [W3] https://dontstarve.wiki.gg/wiki/Mods (client-only / server-only / all-clients explanation).
- [S1] Steam Web API, public, no key: `ISteamRemoteStorage/GetPublishedFileDetails` and `GetCollectionDetails` (called 2026-10-14; raw JSON saved in `dst/raw/workshop_details.json`, `dst/raw/coll.json`).
- [S2] https://api.steamcmd.net/v1/info/343050 (Steam app metadata mirror; saved `dst/raw/info343050.json`).
- [T1] https://xgamingserver.com/blog/how-to-install-mods-on-a-dont-starve-together-dst-server/ (hosting vendor, third party)
- [T2] https://xgamingserver.com/docs/dont-starve-together/mod-configuration (third party)
- [T3] https://help.akliz.net/docs/install-mods-on-a-dont-starve-together-server (hosting vendor, third party)
- [T4] https://hub.docker.com/r/superjump22/dontstarvetogether (community Docker image docs)
- [T5] Steam Workshop pages, e.g. https://steamcommunity.com/sharedfiles/filedetails/?id=376333686 (author's description)

## 1. Is there a supported server mod path?

Yes. DST dedicated servers run Steam Workshop mods natively, no mod loader needed. Two Lua text files control it [W1]:

1. `dedicated_server_mods_setup.lua` = what to DOWNLOAD (install). One file for the whole server install, "global to every dedicated server install" [W1].
2. `modoverrides.lua` = what to ENABLE and CONFIGURE. One file per shard (Master, Caves) [W1].

A mod must be in both to run (download + enable) [T1, T2; consistent with W1 "installed once per server install, then enabled separately for each shard"].

There is no Thunderstore/Nexus/CurseForge route. Non-Workshop mods can be dropped in by hand (see 5).

## 2. `dedicated_server_mods_setup.lua` (ServerModSetup)

Syntax [W1, quoted]:
```lua
ServerModSetup("350811795")
ServerModCollectionSetup("379114180")
```
- `ServerModSetup("<workshopId>")` installs one Workshop mod; ID is a string. `ServerModCollectionSetup("<collectionId>")` installs every mod in a Workshop collection [W1]. Lines starting with `--` are comments [T1] (standard Lua).
- Every mod installed this way is named `workshop-<ITS OWN ID>`, individually or via a collection [W1].
- On every start the server downloads/updates all listed mods (skip with `-skip_update_server_mods`); a mod re-downloads only when its Workshop version changed [W1].
- Location: `<server install>/mods/dedicated_server_mods_setup.lua`. Sources: [T3] `/dont-starve-together/mods/dedicated_server_mods_setup.lua`, [T4] file lives in the install's `mods` dir, [T1] "/mods/dedicated_server_mods_setup.lua inside the SteamCMD install directory". Note [W1] itself does NOT give the path of this file (only that manual mods go in `mods/`). Windows install root would be `<force_install_dir>\` (SteamCMD app folder); launch working dir is `bin64` per [S2] (`executable: bin64/dontstarve_dedicated_server_nullrenderer_x64.exe`, `workingdir: bin64`), so the file is `..\mods\dedicated_server_mods_setup.lua` relative to the exe. Whether the file ships pre-created with example comments in the Windows build: UNVERIFIED ([T3] implies it exists with a "list" to add lines to; [T4] says create it empty).
- A syntax error in this file can stop the server booting [search result summary of third-party guides; UNVERIFIED as primary fact].
- The collection example ID `379114180` is a real Klei test collection ("Peter's Collection", "A test collection of the various example mods", 6 children: 353875384, 336882447, 344071294, 350811795, 361336115, 346479579) [S1]. It confirms the API below works.
- A collection only DOWNLOADS its members. Whether you must still add each member under `["workshop-<id>"]` in modoverrides.lua: [T1] says yes ("You still enable each mod individually in modoverrides.lua"). [W1] says nothing explicit. Treat as yes (only [T1]).
- `GetCollectionDetails` ([S1]) returns the member Workshop IDs of any public collection with no API key. A panel can use it to expand a collection into per-mod `enabled = true` lines. (Nested collections: filetype field exists in the response, behaviour UNVERIFIED.)

## 3. `modoverrides.lua` (per-mod configuration)

Location: in each shard folder: `<persistent_storage_root>/<conf_dir>/<cluster>/<shard>/modoverrides.lua` [W1]. Defaults [W1]: root `%USERPROFILE%/Documents/Klei` (Windows), conf_dir `DoNotStarveTogether`, cluster `Cluster_1`, shard `Master`. All overridable on the command line: `-persistent_storage_root` (must be absolute), `-conf_dir`, `-cluster`, `-shard` [W1]. The file is optional; omitting it enables no mods for that shard [W1 / the Dedicated_Server fetch].

Syntax [W1, quoted example]:
```lua
return {
  -- Global Positions (-Remapped)
  ["workshop-2902364746"] = {
    enabled = true,
    configuration_options = {
      mode = "Eassy Cartography"
    },
  },
}
```
- Keys: `"workshop-<ID>"`. Values: table with boolean `enabled` and optional `configuration_options` table [W1].
- Enable with defaults: `["workshop-<ID>"] = { enabled = true },` [W1].
- Warning in [W1]: server and client accept config values the in-game GUI does not offer, which may cause malfunctions.
- Master AND Caves each need their own copy if the mod should run in both worlds; a mod enabled in one shard only runs in that world [T1, T2]. [W1]: "Most clusters should enable the same mods on every shard."
- Option names come from the mod's own `modinfo.lua` `configuration_options` list (`name`, `default`, `options[].data`); names are case-sensitive and a wrong key is ignored [T1, T2, third party]. Value types: strings quoted, numbers bare, booleans `true/false` [T2]. Where `modinfo.lua` ends up: V1 mods `mods/workshop-<ID>/modinfo.lua` [W1 + T2]; V2 mods under `ugc_mods/<cluster>/<shard>/...` and the exact inner path is UNVERIFIED (a forum post only says V2 dirs are "simply named by the id"; no official layout found).
- `enabled = false` keeps the mod downloaded but off [T2].
- The panel cannot present a mod's setting form until the mod is downloaded (names/choices live inside the downloaded mod). Workshop API does not expose configuration_options.

## 4. Where mods are stored (V1 vs V2) and shard races

From [W1]:
- V1 mods: `<server dir>/mods/workshop-<WORKSHOP_ID>`.
- V2 mods (the default): `<server dir>/ugc_mods/<cluster>/<shard>`, so each shard downloads its own copy. Override with `-ugc_directory`. The page suggests `-ugc_directory ../ugc_mods` so all shards share one copy, but warns of possible race conditions and recommends running `-only_update_server_mods` first, then launching each shard with `-skip_update_server_mods`.
- Client-hosted (not dedicated): V2 mods go to `<Steam>/steamapps/workshop/content/322330`.
- How to tell whether a given Workshop mod is V1 or V2: not stated anywhere I found. UNVERIFIED.

Mod-related launch arguments [W1]: `-skip_update_server_mods` (skip mod check/update, start the world), `-only_update_server_mods` (update mods then exit; "do not start world" per [T4]), `-ugc_directory <path>`.

Maintenance cautions:
- Do not use `validate` in `app_update 343050 validate` if mods are installed manually; [W1]: "Omitting this option may be desirable if mods have been installed, since Steam would remove them during this process." Whether Workshop-downloaded mods in `mods/` also get removed: UNVERIFIED (the quote is about mods in general).
- A 2016 Klei forum thread reported mods setup files overwritten on start (search-result snippet only, no confirmed cause; thread not readable, 403): https://kleiforums.com/forums/topic/71228-lua-files-for-mods-overwritten-on-server-startup/ . UNVERIFIED relevance to the current build.
- Troubleshooting from [W1]: log lines "Staging library folder not found" and "ODPF failed entirely: 16" with no mods downloading = broken `steamclient.so` (Linux fix, copy from SteamCMD into the server `bin` folders). Not relevant to Windows.
- `modsettings.lua` (with `ForceEnableMod("workshop-<id>")`) is mentioned by third-party guides but described as mainly a client-side/legacy mechanism; `modoverrides.lua` is the standard dedicated-server route [search results; T1]. [T4] still creates an empty `modsettings.lua` next to the setup file. The panel should not rely on it (role UNVERIFIED).

## 5. Manual (non-Workshop) mods
Create a folder under `<server install>/mods/<anyName>`; the folder name becomes the mod name used in `modoverrides.lua`; it must contain `modmain.lua` and `modinfo.lua` [W1]. Low value for a hobbyist panel.

## 6. Client side: what players need

From [W3] (three kinds of DST mod):
- Client-only: each player enables them in their own game; they work on any server; the server needs nothing. [W3] "enabled by each player individually and used on any server".
- Server-only: the host enables them; joining players need nothing.
- All-clients ("all players on a server need to have" them): the Steam Workshop "automatically handles downloading and enabling these" when players join [W3]. So friends do not install anything by hand for these.

How the type is declared: Workshop tags `client_only_mod`, `all_clients_require_mod`, `server_only_mod` appear in the API for the mods checked [S1] (see table). That the Workshop tag mirrors the `modinfo.lua` variables of the same names is likely but not proved here: UNVERIFIED. A Klei developer reportedly stated the two modinfo flags are mutually exclusive (search snippet from https://forums.kleientertainment.com/forums/topic/102425-how-do-i-set-up-my-modmain-and-modinfo/ , page itself 403, so second-hand: UNVERIFIED).

Consequences for the panel:
- Most-subscribed mods are CLIENT-ONLY (Combined Status, Minimap HUD, Geometric Placement, Craft Pot...). Adding those to the server does nothing for players; each player must subscribe and enable in their own Mods menu. [W3]. Do not tell users to put them in the server lists. Effect of putting a client-only mod in server `modoverrides.lua`: UNVERIFIED.
- [T2] states players who lack a required mod get a "missing mods" prompt and must accept. Third-party; UNVERIFIED.
- Mod names listed on the server browser / whether the panel's friends can join a modded server by IP: not addressed in [W1]/[W3]. UNVERIFIED.
- Subscribing in Steam only affects your own game, not the server [T1].

## 7. Most-used mods (Steam Workshop, DST app 322330)

Data: [S1] `GetPublishedFileDetails`, 2026-10-14. "Lifetime subs" = `lifetime_subscriptions`; "Current subs" = `subscriptions`. The Workshop browse page sorted by unique subscribers (https://steamcommunity.com/workshop/browse/?appid=322330&browsesort=totaluniquesubscribers&section=readytouseitems&actualsort=totaluniquesubscribers&p=1&days=-1) returned this same top-30 order; I only queried the first 24 IDs via the API. Tags are Workshop tags set by the authors. Server needs it? derived from tags only.

| Mod | Workshop ID | Lifetime subs | Last update (API) | Type tag | Server needs it? |
|---|---|---|---|---|---|
| Combined Status | 376333686 | 11,401,489 | 2026-08-22 | client_only_mod | No, each player |
| Global Positions | 378160973 | 9,507,196 | 2026-04-19 | all_clients_require_mod | Yes (host settings apply to most options per [T5]) |
| Minimap HUD | 345692228 | 9,270,188 | 2022-07-12 | client_only_mod | No |
| Geometric Placement | 351325790 | 8,307,072 | 2023-08-02 | client_only_mod | No |
| Craft Pot [DS, ROG, SW, DST] | 727774324 | 6,003,605 | 2023-08-27 | client_only_mod | No |
| Simple Health Bar DST | 1207269058 | 5,949,036 | 2022-09-17 | all_clients_require_mod | Yes (description says "server-side mod" [T5]) |
| Health Info | 375859599 | 5,670,327 | 2025-03-21 | all_clients_require_mod | Yes |
| Extra Equip Slots | 375850593 | 4,792,057 | 2016-04-20 | all_clients_require_mod | Yes |
| Display Food Values | 347079953 | 4,358,261 | 2016-03-26 | all_clients_require_mod | Yes |
| Wormhole Marks [DST] | 362175979 | 4,152,747 | 2016-02-01 | all_clients_require_mod | Yes |
| Epic Healthbar | 1185229307 | 4,096,107 | 2026-08-14 | all_clients_require_mod | Yes |
| Show Me (Origin) | 666155465 | 3,959,602 | 2022-01-08 | all_clients_require_mod | Yes |
| Increased Stack size | 374550642 | 3,460,924 | 2026-03-03 | all_clients_require_mod | Yes |
| Don't Drop Everything | 661253977 | 3,425,027 | 2020-08-10 | server_only_mod | Yes, players need nothing |
| Show Me (New) | 2287303119 | 3,074,777 | 2026-08-31 | all_clients_require_mod | Yes |
| Quick Pick | 501385076 | 2,987,430 | 2020-10-14 | server_only_mod | Yes, players need nothing |
| Gesture Wheel | 352373173 | 2,976,709 | 2022-03-26 | client_only_mod | No |
| Display Attack Range | 2078243581 | 2,686,081 | 2020-05-03 | all_clients_require_mod | Yes |
| Smarter Crock Pot | 365119238 | 2,681,869 | 2015-09-03 | client_only_mod | No |
| Boss Indicators | 1120124958 | 2,448,208 | 2017-09-02 | client_only_mod | No |
| Item Info | 836583293 | 2,400,080 | 2026-08-24 | client_only_mod | No |
| ActionQueue Reborn | 1608191708 | 2,386,907 | 2020-02-03 | client_only_mod | No |
| Fast Travel | 458587300 | 2,094,541 | 2016-04-13 | all_clients_require_mod | Yes |
| 45 Inventory Slots | 786556008 | 1,942,766 | 2016-11-12 | all_clients_require_mod | Yes |

Categories (my grouping from the titles/tags, not a source claim): interface/HUD info (Combined Status, health bars, Show Me, Item Info), map/travel (Global Positions, Minimap HUD, Wormhole Marks, Fast Travel), cooking/crafting aids (Craft Pot, Display Food Values), inventory/QoL (Extra Equip Slots, 45 Inventory Slots, Increased Stack size, Don't Drop Everything, Quick Pick, ActionQueue Reborn). The 2022-2023-era updates of several top mods and 2016-era tags mean "works in the current build" is UNVERIFIED for old ones (last-update dates above are the only evidence).
Notes: the Workshop web pages showed "removed from the community" and "incompatible with DST" banners for several of these when fetched, but the API returned `banned: 0, visibility: 0` for all 24, so I treat the banners as page-render noise; UNVERIFIED either way. The Workshop's own Global Positions page shows description text "Most options are only used by the host" [T5]. A third-party list (https://gamersdecide.com/articles/dont-starve-together-best-mods-2) also names Combined Status, Global Positions, Craft Pot, Geometric Placement; the subscriber ranking above is the better evidence.
Mod loaders: none (Workshop is the only route). Anti-cheat: none found/mentioned in sources; UNVERIFIED. Save compatibility: removing a mod after use can break a world; "after a game update mods may be incompatible and cause crashes; back up the world first" is third-party advice (search summary) so UNVERIFIED as a primary fact; the Caves/Master must run the same mod list or the worlds differ (see 3).

## 8. Recommendation for GodlyPanel

Offer a modest, safe feature, not a loader step:
1. Add a `mods` field to the DST create form: a list of Workshop mod IDs (and optionally collection IDs), one per line. Accept pasted Workshop URLs and pull the number after `?id=`. Validate each ID with `GetPublishedFileDetails` (shows title, last update, tags, and flags `client_only_mod` mods so the panel can say "players install this themselves; the server does not need it").
2. Write `<install>\mods\dedicated_server_mods_setup.lua` with one `ServerModSetup("<id>")` per mod (and `ServerModCollectionSetup("<id>")` for collections), then write the SAME `modoverrides.lua` with `["workshop-<id>"] = { enabled = true }` into both `Master\` and `Caves\` (only if Caves is used). For a collection, expand members via `GetCollectionDetails` to create the enable lines.
3. Keep the form for per-mod options as a later step: the option names exist only inside the downloaded `modinfo.lua`; the panel could parse them after the first start. Until then, offer a plain text editor for `modoverrides.lua` (config values entered by hand per [W1]'s caution).
4. Start-up: pass `-ugc_directory ../ugc_mods` shared by shards, run `-only_update_server_mods` once for the Master shard, then start shards with `-skip_update_server_mods` (as [W1] recommends to avoid races). A first-run download needs network and takes time before the world appears.
5. Updates: do not use `validate` on `app_update 343050` when mods exist ([W1]).
6. UI text for friends: "Mods marked 'everyone needs it' download automatically when a friend joins; 'only you' mods are installed by each player in their own Mods menu" (sources [W3]; the auto-download wording relies on [W3] only).
7. A Workshop-API listing of "popular mods" with a client-only warning is a nice default list; keep it optional and default to no mods.

## UNVERIFIED list (count: 14)
1. Server build number these facts apply to (wiki pages carry no build stamp).
2. Whether `dedicated_server_mods_setup.lua` ships pre-created in the Windows install, and its shipped example text ([W1] never states the file path; path comes from third parties [T1, T3, T4]).
3. Whether `modsettings.lua` has any role on a dedicated server today.
4. How to tell V1 vs V2 mods, and the exact inner folder layout of `ugc_mods/<cluster>/<shard>/` (where `modinfo.lua` ends up for V2).
5. Whether collection members must also be individually listed in `modoverrides.lua` (only [T1] says yes; [W1] silent); whether nested collections expand.
6. Whether Workshop-downloaded mods in `mods/` survive `app_update ... validate` (the wiki only says "mods").
7. Whether the Workshop tags `client_only_mod` / `all_clients_require_mod` / `server_only_mod` exactly mirror the `modinfo.lua` variables, and that the two modinfo flags are mutually exclusive (second-hand search snippet).
8. What happens when a client-only mod is put in server `modoverrides.lua`.
9. Exact client behaviour when joining a server with required mods (auto-download prompt) - [W3] says Workshop handles it; [T2] says players are prompted and must accept; no primary source for the dialog.
10. Whether the server list shows the mod list / whether direct-IP joining works with mods (not addressed).
11. Anti-cheat on modded DST servers (none mentioned anywhere found).
12. Save compatibility when mods are added/removed mid-world (only third-party advice).
13. Whether the older 2016-2020 top mods (Extra Equip Slots, Display Food Values, Wormhole Marks, Fast Travel, 45 Inventory Slots) still work in the current build; only last-update dates known. Banners on their Workshop pages ("incompatible with DST", "removed") not confirmed by the API.
14. Whether a syntax error in `dedicated_server_mods_setup.lua` blocks boot (single third-party statement).

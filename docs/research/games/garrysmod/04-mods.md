# Garry's Mod (store 4000, server 4020) - modded servers (DRAFT, researched 2026-10-14)

Facts are for the current public branch of the server as of Oct 2026 (wiki references server version 2026.09.22). No server was installed or run.

## 1. Verdict
Garry's Mod has first-class server mod support: Steam Workshop collection (launch arg `+host_workshop_collection <id>`), plus a manual addons folder, plus gamemodes/maps. No mod loader needed.

## 2. Workshop collection (the main path)
- Launch arg `+host_workshop_collection WORKSHOPID`; "The server downloads the collection at startup and mounts the addons". Example from wiki: `srcds.exe +maxplayers 20 -console +host_workshop_collection 157384458 +gamemode zombiesurvival +map zs_cleanoffice_v2`. Source: https://wiki.facepunch.com/gmod/Workshop_for_Dedicated_Servers
- Collection must be Public or Unlisted (private = srcds cannot read it). Nested sub-collections are downloaded too. Same source.
- Collection id = the `?id=` number in the Workshop collection URL (Workshop of app 4000). Source: https://www.gameserverkings.com/knowledge-base/garrys-mod/workshop-and-fastdl/ (third party, updated 2026-09-28)
- Alternative/additional: hand-made `garrysmod/cfg/srcds_workshop_ids.txt` ("new with version 2026.09.22 or newer"), format as shown on the wiki page:
```
"my_workshop_addons" { "1" { "wsid" "123277559" } "2" { "wsid" "111412589" } }
```
  (single-line rendering of the wiki example; the wiki page says the collection arg can be used on its own, with the file, or alongside it). Exact on-disk layout/line breaks and whether the path is `cfg/` relative to `garrysmod/`: the wiki says "`cfg/srcds_workshop_ids.txt`" - treat as `garrysmod/cfg/` (UNVERIFIED, inferred).
- `host_workshop_autoupdate 0` disables content auto-update at server start; wiki warns it can cause problems such as an old map blocking players from joining. Same wiki source.
- Map auto-send: if the running map's .bsp name matches a map in the collection, clients are told to download it ("Making workshop map available for client download."). Gamemode: if the gamemode's `<gamemode name>.txt` has a workshop id, clients are told to download it. Same wiki source.
- `-noworkshop` temporarily disables Workshop addons; `-noaddons` disables folder (legacy) addons. Source: https://wiki.facepunch.com/gmod/Command_Line_Parameters

## 3. -authkey (Steam Web API key)
- The first-party wiki pages Workshop_for_Dedicated_Servers and Downloading_a_Dedicated_Server do NOT mention `-authkey` or an API key; the only access requirement stated is a Public/Unlisted collection.
- GameServerKings (2026) says no key is needed since the April 2017 update, `-authkey` is ignored, and the console prints "-authkey is no longer required by Garry's Mod". https://www.gameserverkings.com/knowledge-base/garrys-mod/workshop-and-fastdl/
- Facepunch April 2017 post says only "Switched SRCDS Steam Workshop to ISteamUGC API." (does not mention authkey). https://gmod.facepunch.com/blog/april-2017-update/
- Some hosts' guides (HostHavoc, June 2026) still tell users to get an API key from steamcommunity.com/dev/apikey and pass `-authkey API_KEY`. https://hosthavoc.com/wiki/game-servers/garrys-mod/add-workshop-collection
- Conclusion: key almost certainly not needed; first-party statement not found -> UNVERIFIED (see list). Do not ask the user for one.

## 4. addons folder (manual / legacy)
- Legacy addons go in `garrysmod/addons/<anyname>/` with `lua/`, `materials/`, `models/`, `maps/`, `gamemodes/`, `sound/`, `particles/` directly inside the addon folder. Folder name can be anything. Source: https://wiki.facepunch.com/gmod/Workshop_Addon_Creation ; "a folder nested one level too deep won't load" per GameServerKings.
- Workshop-downloaded GMA files are mounted automatically; they are not placed in addons/. (where the cache lives on disk: UNVERIFIED)
- A gamemode lives in `garrysmod/gamemodes/<name>/` (own `gamemode/`, `entities/`, `content/`). Same wiki page.
- Maps: `.bsp` in `garrysmod/maps/`. Same wiki page.
- Lua-only addons are server-side only; clients do not need a download.

## 5. Client downloads: resource.AddWorkshop / FastDL
Wiki table (https://wiki.facepunch.com/gmod/Serving_Content): WorkshopDL fastest, "up to ~2gb (gma) at once", needs content on Workshop and `resource.AddWorkshop`; FastDL = own web server, file by file, files not re-checked for changes; ServerDL (`sv_allowdownload 1` + `resource.AddFile`) "obsolete", 64kb/s, exploit risk.
- `garrysmod/lua/autorun/server/workshop.lua` containing `resource.AddWorkshop("150455514")` (takes an ADDON id, not a collection id). Source: Serving_Content wiki + GameServerKings.
- Limit 8,192 downloadable files across all resource.Add* calls (GameServerKings only; third party).
- FastDL: `sv_downloadurl "https://mycoolwebsite.com"` (in server.cfg), mirror garrysmod/ folder structure, clients try `file.bz2` first then plain file. Wiki Serving_Content.
- IMPORTANT: a collection given to `+host_workshop_collection` is mounted on the server; clients only download content for addons that are marked with resource.AddWorkshop (or the map/gamemode auto-send above). So a collection alone does NOT make players download its content. (Inference from the wiki table + GameServerKings "used to make joining players download addons the server mounts"; wording of the client side behaviour partly UNVERIFIED.)

## 6. Popular gamemodes/addons
(see next section - to be completed)

## UNVERIFIED (draft)
1. Whether -authkey is ignored/needed (first-party statement missing).
2. Exact file layout of srcds_workshop_ids.txt (multi-line) and that it sits in garrysmod/cfg.
3. On-disk location of downloaded workshop GMAs.

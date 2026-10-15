# Necesse - modded servers (conventions section D)
Researched 2026-10-15, read-only web research (no server installed or run). Game store app 1169040, dedicated server tool app 1169370.
Build context: steamcmd.net shows the server tool public buildid 24926481, last updated about 2026-08-24 (source S1). Third-party pages put the current game release at 1.3 "Rust & Romance" (30 July 2026) (S12, S15); the wiki Version History page still showed 1.2.0 (2026-04-09) as newest, so it lags (S13). Mod titles on the Workshop mention "Necesse 1.3.3" (S5), so the live game is at least 1.3.3 (title-only evidence).

## 1. Is there a supported server mod path? YES, via jar files
Necesse mods are single `.jar` files (S2). There is no separate mod loader (no BepInEx / Forge-style install step): the game itself loads jars from a mods folder (S2). Mods are published on the Steam Workshop (S2); many authors also link a direct jar download on the Workshop page (S2).
Official wiki text for a Windows SteamCMD server (S2, https://necessewiki.com/Modding):
- "Install your server as usual with steamcmd with the AppID 1169370."
- "Then copy your .jar mod files downloaded over the steam workshop ... into the mods folder."
- "The server will recognize on startup the mods in the folder and loads them."
- Create a `mods` folder in the server install directory; in `startserver-nogui.bat` the default line is `start jre\bin\java.exe -jar Server.jar -nogui %*`; the wiki says to add `-datadir .\data -mod .\mods` to it.

## 2. Where the mods folder is
- Client (game) folders per the wiki (S2): Windows `%APPDATA%/Necesse/mods/`, Linux `~/.config/Necesse/mods`, macOS `~/Library/Application Support/Necesse/mods/`. "If the folder doesn't exist, you can create it yourself."
- Server: the wiki's recipe is a `mods` folder inside the server install, pointed to with `-mod .\mods` (S2). Host guides use `/mods/` (EmeraldHost, S3; GameHostBros, S9) or `/Server/mods/` (PingPlayers, S4).
- EmeraldHost: files must sit directly in `mods` with no subfolders; the server only reads the folder if the start command contains `-mod ./mods`; without it "mods aren't loaded" (S3). Folder name lowercase `mods` (Linux is case sensitive; irrelevant on Windows but harmless).
- Mod config files: PingPlayers says to check `/Server/cfg/mods/` after the first restart for new config files (S4). Only that one host states this; the path is relative to their layout.
- A third-party Docker guide copies jars to `.config/Necesse/mods` (the data-dir mods folder) and launches `java -jar Server.jar -nogui` with NO `-mod` argument (S8). That suggests the server also reads `<datadir>/mods` by default, i.e. `-mod` may be unnecessary when jars are in `%APPDATA%\Necesse\mods` or `<datadir>\mods`. This is inference from a third-party script, see UNVERIFIED.

## 3. The `-mod` launch argument
- Wiki: `-mod` "points the game to the folder containing mod jars" and the wiki uses `-mod .\mods` for the server (S2). The wiki's Multiplayer page launch-argument table (it says the list lives in `DesktopServerWrapper.class` inside `Necesse.jar`) lists `-nogui -world -port -slots -owner -password -settings -localdir -datadir -ignoreseasons`, and does NOT list `-mod` (S6). So `-mod` is a game-level option, documented only on the Modding page. The developer says to run the server with `-help` to see the launch options (S7, Steam thread, "Fair", 2022-09-29).
- `-datadir <path>`: "Sets where cache, logs, and saves are stored"; `-localdir`: "Same as -datadir, but uses the local directory the server is launched from" (S6).
- Windows server start scripts per steamcmd.net: `jre\bin\java.exe -jar Server.jar -nogui` (S1).

## 4. Does the server download Workshop mods by itself? NO (not in the base server)
- EmeraldHost: "The server can't download Workshop mods itself. You upload each `.jar` manually" (S3).
- steamcmd.net data for app 1169370 shows no workshop-related keys (no workshopdepot) (S1) - consistent with no built-in Workshop download.
- Several hosts (MintServers S10, GameHostBros S9, Kinetic S11) offer a "Steam Workshop Mods" field with comma-separated IDs, e.g. `3574352062,3549799893,3507626499`, downloading at server start (S9, S10). That is their panel tooling, not a game feature.
- How a third party does it (S8, gamepretty Docker guide): `steamcmd +login "$STEAM_USER" "$STEAM_PASSWORD" +force_install_dir $HOME +workshop_download_item 1169040 <id> +quit`, then `mv steamapps/workshop/content/**/**/*.jar .config/Necesse/mods`. Note the guide logs in with a Steam account for mod downloads, and anonymous only for the server itself (`+login anonymous ... +app_update 1169370`). Workshop item app id is 1169040 (the base game). Whether anonymous can download Necesse Workshop items is not shown (UNVERIFIED).
- Manual way: subscribe in the Steam client and copy jars from `C:\Program Files (x86)\Steam\steamapps\workshop\content\1169040\<workshopId>\` (S4, S10, S12 Citadel) or from `%appdata%\Necesse\mods` after launching the game once (S3).
- Also: a community Docker image offers Workshop mods from a collection (S6 Linux wiki page mention), mechanism not read.

## 5. How clients must match
- Every mod not marked client-side must be on the server and on every player in the same version; a missing or mismatched mod makes joining fail (EmeraldHost S3; PingPlayers "Mod Mismatch" error S4; MintServers "blocks the connection or shows a mod mismatch warning" S10). These are host guides; no official Necesse statement of the error text was found.
- `clientside` in `mod.info` (default false) marks a client-only mod; per the wiki this lets clients connect to servers without it and vice versa (S2). The Workshop has a "Client mods" category with 100 items (S14).
- Players get mods by subscribing on the Workshop and enabling them in the in-game Mods menu (main menu button appears after subscribing; load order and enable/disable there) (S2, S3). A Workshop Collection is suggested to share the list (S4, S10).
- Dependencies: library mods must be on the server and subscribed by players (S4); `mod.info` lists dependencies and optionalDependencies, used to build load order (S2).
- No built-in auto-download of server mods to joining clients was found. Citadel Servers says that on joining "the server prompts you about Mod Lists, and you should select 'Use Server Mods'" (S12); I could not corroborate that prompt elsewhere (UNVERIFIED).
- Joining a modded server with a vanilla client: SurvivalServers search snippet says Workshop mods on a dedicated server lock out vanilla clients (S16, snippet only; page returned 403).

## 6. Version compatibility and risks
- `mod.info` has `version` and `gameVersion` (S2). A mod built for another game version can prevent server start (EmeraldHost S3); after game updates mods may break startup, update or temporarily remove them (S3).
- Troubleshoot an unstartable server by deleting the newest jar from `mods` and restarting (S4).
- Removing a mod that added blocks/items/enemies deletes that content from the world; restore a backup if unsure (S3). Back up saves first.
- Workshop hub itself: "Modding is still in the early stages, so remember to back up your saves" (S14).
- Dedicated servers do not load client resources at startup, so mods must ship their resources for the server (S2, Testing section).
- No anti-cheat was found for Necesse (nothing in any source; absence only).
- Mod-specific warning: RPG Mod REBORN changelog warns that joining a world without the mod enabled can reset mod data (search snippet, S17).
- Some popular mods are abandoned, e.g. Necesse Expanded's page says it is no longer worked on (search snippet, S17).

## 7. Popular mods and categories (Workshop, 2026-10-15)
Workshop hub categories (counts of items): Tweaks 272, New features 242, New content 213, Miscellaneous 198, Interface 107, Texture packs 31, Translations 23, Client mods 100 (S14). Browse listing: 572 entries (S5).
First page of the Workshop "trending" sort, all time, with file ids (S5; ordering is Steam's trend ranking, no subscriber counts shown, so this is not a subscriber ranking):
1. More Trinket Slots 3052859125; 2. Aphorea Mod 3268603061; 3. Extended Range 3417452007; 4. RPG Mod v0.7 3534267732; 5. Increased Stack Size 2827931647; 6. Mod Settings Lib 3558238376 (library); 7. Ambience and Footsteps 3389136731; 8. Ultra Storage 3397986280; 9. Summoner Expansion 3346523716; 13. Necesse Expanded 3546316000; 14. Ore Excavator 3307863995; 16. Quick Recipes Menu 3373425817; 26. Defense Tower 2830717128; 27. Max Stack Plus 3507626499.
WabbaNode's beginner list (S18): Increased Stack Size (raises stack limits, configurable), Ore Excavator (mine a whole vein at once), More Trinket Slots (up to 8, configurable), Chests Expanded 2837915240, Boss Fight Summary 2824816332, Aphorea Mod (170+ items, 10+ mobs, 2 bosses, new biome), Necesse Expanded (all-in-one; says it works with Aphorea). Page does not say server/client side per mod.
Typical categories: quality of life (stack size, ore excavator, trinket slots), content expansions (Aphorea, RPG mods), interface, texture packs, translations.

## 8. Recommendation for GodlyPanel
Offer a modest "mods" feature, jar-based, no loader:
1. Create a `mods` folder in the server install and add `-mod .\mods` to the start line (documented in S2; harmless if already default). Optionally also keep `-datadir`/`-localdir` behavior as designed in 03-launch-args.
2. A "Mods" tab with: list of jars in `mods` (upload / delete), with a warning that stop is required and players need identical mods. This works with zero Steam login.
3. Optional later: a "Workshop IDs" list that runs SteamCMD `+workshop_download_item 1169040 <id>` and copies the jar into `mods`. Do not ship until anonymous download is tested on a real install (host Docker example used a real account); if it needs an account, skip it and tell the user to copy jars from their own Steam workshop folder (path in section 4).
4. Show the mod ids/links of popular mods as suggestions only after checking they target the current game version.
5. Do not offer a loader install step; none exists. Reuse the generic fields: `mods` could be a plain "mods folder enabled" boolean at creation time.

## Sources
- S1 https://api.steamcmd.net/v1/info/1169370 (app info: Tool "Necesse Dedicated Server", freetodownload 1, launch args, no workshop keys)
- S2 https://necessewiki.com/Modding (official community wiki; mods folder, `-mod`, `clientside`, dedicated server setup)
- S3 https://emeraldhost.de/docs-redirect/en/gameserver/necesse/add-mods (original docs.emeraldhost.de/en/gameserver/necesse/add-mods)
- S4 https://pingplayers.com/knowledgebase/necesse/how-to-add-mods-to-your-necesse-server
- S5 https://steamcommunity.com/workshop/browse/?appid=1169040&browsesort=trend&section=readytouseitems&actualsort=trend&p=1&days=-1 (and the mostrecent sort, 572 entries)
- S6 https://necessewiki.com/Multiplayer (launch-argument table) and https://necessewiki.com/Multiplayer-Linux (-localdir, -world, Docker image mention)
- S7 https://steamcommunity.com/app/1169040/discussions/0/3344417177391663363/?ctp=2 (developer "Fair": run with -help; Fizz 2022 asking how to add mods)
- S8 https://gamepretty.com/necesse-dedicated-server-in-docker/ (third-party Docker entrypoint)
- S9 https://www.gamehostbros.com/guides/games/necesse/install-mods
- S10 https://mintservers.com/knowledgebase/how-to-install-necesse-mods
- S11 https://www.kinetichosting.com/articles/necesse/basics/how-to-mod-your-necesse-server
- S12 https://citadelservers.com/client/knowledgebase/567/How-to-Install-Mods-on-your-Necesse-Server.html
- S13 https://necessewiki.com/Version_History
- S14 https://steamcommunity.com/app/1169040/workshop/
- S15 https://supercraft.host/article/necesse-roadmap-2026/ (search snippet only)
- S16 https://www.survivalservers.com/news/necesse-dedicated-server-mods/ (search snippet only, page 403)
- S17 Workshop pages RPG Mod REBORN https://steamcommunity.com/workshop/filedetails/?id=3705415156 and Necesse Expanded https://steamcommunity.com/sharedfiles/filedetails/?id=3546316000 (search snippets only)
- S18 https://wabbanode.com/help/necesse/best-necesse-server-mods-for-beginners

## UNVERIFIED
1. Whether the server reads `<datadir>/mods` (e.g. `%APPDATA%\Necesse\mods`) without `-mod` (only a third-party Docker script implies it; no official text).
2. Whether `-mod` appears in the server's own `-help` output (not run; not in the Multiplayer wiki table).
3. Whether SteamCMD `+login anonymous` can `workshop_download_item 1169040` (the only example used a real account).
4. Exact join-failure text and whether a client "Use Server Mods" prompt exists (Citadel only).
5. Whether clients can auto-download or auto-enable server mods (none found).
6. Subscriber counts / true all-time most popular mods (Steam page did not show them; 429 on item pages).
7. Which listed mods are server-required vs client-only (WabbaNode does not say).
8. Current exact game version and which popular mods still work on it.
9. `cfg/mods/` mod-config folder location outside PingPlayers' layout.
10. Behavior with `-datadir` set and a mods folder relative to it.
11. The community Docker `MODS_COLLECTION` mechanism (page not read).
12. Anti-cheat absence (inferred from silence only).
13. Wiki claim that `-datadir .\data -mod .\mods` is the intended pair was read from the wiki via a summarising fetch tool, not raw text.

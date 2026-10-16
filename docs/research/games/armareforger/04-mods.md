# Arma Reforger: MODS (extract, stage B)

Source list: `sources.md` MODS section (5 URLs). Copies kept in `raw\`:
- `raw\xgamingserver_com_docs_arma-reforger_mod-setup.txt` (xgamingserver mod-setup)
- `raw\xgamingserver_com_blog_how-to-install-mods-on-arma-reforger-server_.txt` (xgamingserver blog)
- `raw\www_gameserverkings_com_knowledge-base_arma-reforger_arma-reforger-mods_.txt` (gameserverkings)
- `raw\xgamingserver-server-config-reference.txt` (xgamingserver server-config-reference)
- `raw\bi-wiki-server-hosting.txt` (BI wiki Server Hosting, read with the browser)

Pages 1 to 4 were read with WebFetch (summaries) and checked against the saved text where noted. Page 5 (BI wiki) was read with the browser.

## MODS facts

- Does the dedicated server support mods: Yes. The mod list is read at server start. (https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/ ; https://xgamingserver.com/docs/arma-reforger/mod-setup)
- How mods are added: a `mods` array in the `game` block of the server config JSON, one entry per mod with `modId` (Workshop GUID). Each entry: `modId` (required), `name` (optional, label only), `version` (optional, pins a release, omit for latest), `required` (optional). (https://xgamingserver.com/docs/arma-reforger/mod-setup ; https://xgamingserver.com/docs/arma-reforger/server-config-reference)
- Mods are not added by launch argument: "Arma Reforger has no separate mod loader and no `-mod` launch parameter for dedicated servers" (https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/). Same point on https://xgamingserver.com/docs/arma-reforger/mod-setup ("no -mod launch argument" stated in its text; server exe shown there only with `-config` and `-maxFPS 60`).
- Mod files are not uploaded to the server folder: "You don't upload mod files to the server." Server downloads from the Workshop at start (https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/ ; https://www.gameserverkings.com/knowledge-base/arma-reforger/arma-reforger-mods/ says mods are downloaded from the Workshop when the server starts).
- Folder paths: downloaded mods are stored in the `addons` folder inside `profile/` (exact nesting depends on server version) (https://www.gameserverkings.com/knowledge-base/arma-reforger/arma-reforger-mods/ ; https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/ says "inside an addons folder whose exact nesting depends on the server version"). Temp download folder: `-addonTempDir ./tmp` (xgamingserver blog); BI wiki Docker note: "you might need to set -addonTempDir ./tmp or some other location where the container has write permissions" (https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting, file raw\bi-wiki-server-hosting.txt).
- Config file name and location: `config.json` in the server root or the path passed with `-config` (https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/ ; https://xgamingserver.com/docs/arma-reforger/mod-setup says `config.json` in the server root or via SFTP). BI wiki example uses `-config ".\Configs\Campaign_SWCoast.json"` (https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting).
- Global default key: `modsRequiredByDefault` in the `game` block, default `true`. Quoted from https://xgamingserver.com/docs/arma-reforger/server-config-reference: "Override default `required` value for all mods. Default: `true`." Setting it `false` makes mods optional unless an entry sets `required: true` (https://xgamingserver.com/docs/arma-reforger/mod-setup). Per-entry `required` defaults to the global value (https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/).
- Do clients need the same mods: Yes for required mods. "Players automatically download required mods when they connect" (https://xgamingserver.com/docs/arma-reforger/mod-setup). Server-config-reference: the `mods` array is "Array of mods required by clients, automatically downloaded on join." Client needs no separate mod list ("no separate client-only mod list", https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/).
- Loader or framework needed: No separate loader. "No framework or loader is required beyond the Workshop download" (https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/). Dependencies must be listed as their own entries, e.g. "Put every dependency in your list as its own entry, rather than relying on the server to find them for you" (https://www.gameserverkings.com/knowledge-base/arma-reforger/arma-reforger-mods/).
- Restart: the mod list is read only at server startup; `#restart` does not reload mods (https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/ ; mod-setup says the first start downloads mods).
- Getting the ID: a 16-character hex GUID from the Workshop URL, e.g. `reforger.armaplatform.com/workshop/5D6EBC81EB1842EF-EnfusionPersistenceFramework` (https://www.gameserverkings.com/knowledge-base/arma-reforger/arma-reforger-mods/ and blog). The GUID is not the mod name or a Steam numeric id (https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/).
- Players on consoles: mod-setup page says "Console players (Xbox/PlayStation) can't install mods, so modded servers reject them." Blog says: "PlayStation players cannot join any modded server"; Xbox stays only if every mod is console-certified (https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/). The two xgamingserver pages are not fully consistent on Xbox.
- Player-hosted: the in-game host screen has a Mods tab that enables or disables local mods; Workshop is reachable from there (BI wiki, https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting, raw\bi-wiki-server-hosting.txt).
- Local testing mods: `-server "worlds/MP/MPTest.ent" -addonsDir "C:\MyModsDir" -addons MyCustomMod`. "Server parameter can be combined with addons and addonsDir parameters to start a server with local mods." When `-server` is used, `-config` is ignored (BI wiki, https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting).
- Load order: array order, top to bottom; no priority field; later mods generally override earlier ones (https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/).
- Game version: "the dedicated server must run the same build as your clients"; after a patch run `app_update 1874900 validate` in SteamCMD and check pinned mod versions (blog). Server app id 1874900 is from the BI wiki (stable) and experimental 1890870.

### 5 most popular mods or frameworks named on the pages (with ids)
1. Enfusion Persistence Framework: `5D6EBC81EB1842EF` (https://www.gameserverkings.com/knowledge-base/arma-reforger/arma-reforger-mods/ ; also https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/ ). It is a dependency of Freedom Fighters in the same source.
2. Enfusion Database Framework: `5D6EA74A94173EDF` (https://www.gameserverkings.com/knowledge-base/arma-reforger/arma-reforger-mods/ ; blog lists it as a dependency of Persistence Framework).
3. Freedom Fighters (example entry, version `0.70.1` in blog): `CAFEBEEFF0CACC1A` (https://www.gameserverkings.com/knowledge-base/arma-reforger/arma-reforger-mods/ ; blog). Scenario ID example: `{64B2F8D8059EE270}Missions/FreedomFighters/Everon.conf` (blog).
4. Server Admin Tools: `59672945D69497A0`, version `1.0.5` in the blog's example entry (https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/). Named as an example, not as a recommendation.
5. WeaponSwitching: `59727DAE364DEADB`, version `1.0.1` (https://xgamingserver.com/docs/arma-reforger/server-config-reference). Shown only as an example entry.

Example-only IDs that appear on the pages (do not treat as popular mods): "My Mod" `597D72161FD1ED1D` (https://xgamingserver.com/docs/arma-reforger/mod-setup, placeholder) and "Example Optional Mod" `5972D43D44FCABDD` (blog, `required: false`).

## Conflicts (both values kept, not picked)
- Console access: https://xgamingserver.com/docs/arma-reforger/mod-setup says console players "can't install mods, so modded servers reject them"; https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/ says Xbox access stays only if every mod is console-certified. Different wording on Xbox.
- Mod folder path wording: blog says mods are stored in "an addons folder whose exact nesting depends on the server version" inside the profile folder; gameserverkings says the same ("addons folder inside profile/"). No conflict in substance; exact path not given by any page.
- sources.md said the modsRequiredByDefault default was disputed between sources. The three fetched pages all say the default is `true` (server-config-reference, mod-setup, blog). The gameserverkings text was not checked for this value in the full text. No page disputes it in the text fetched here.

## NOT FOUND / UNSURE
- Exact mod folder path on disk: NOT FOUND (pages say "addons folder inside profile/" with nesting that depends on version).
- Whether `-mod` or any mod launch argument exists for dedicated servers: the blog says none exists; the BI wiki page lists only `-addons` and `-addonsDir` in the local-server example, not a mod argument for dedicated servers. Treated as NOT FOUND for dedicated-server mod loading.
- Whether clients need an identical full mod list (including optional mods): NOT FOUND (mod-setup and blog cover required mods only).
- Whether the `-addons` argument applies to the dedicated server (not local `-server` mode): NOT FOUND.
- Whether a mod can be upgraded without restart: NOT FOUND beyond "the mod list is read only at server startup".
- Full list of console-certified mods: NOT FOUND.
- The 5 "popular" mods are only the names that appear on these pages, not a ranking. Real popularity: NOT FOUND.

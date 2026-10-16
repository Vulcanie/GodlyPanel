# Arma Reforger sources
Server exe: ArmaReforgerServer.exe (https://www.ionos.com/digitalguide/server/know-how/arma-reforger-server.md, COMMUNITY; also named in the Unraid/Docker and GameCP guides. BI wiki not readable, see notes)
Server app id: 1874900 (https://steamdb.info/app/1874900/ and https://www.ionos.com/digitalguide/server/know-how/arma-reforger-server.md; SteamDB returned 403, so not checked directly. BI wiki search snippet also lists it as stable, experimental = 1890870. Store app 1874880 confirmed on https://store.steampowered.com/app/1874880/Arma_Reforger/ as the game itself, not the server tool)

## BASICS
1. https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting | WIKI | Server Hosting – Arma Reforger | Official BI community wiki page on hosting. Fetch returned 403 (blocked); seen only in search snippets, so NOT verified. Likely the best source once readable.
2. https://store.steampowered.com/app/1874880/Arma_Reforger/ | OFFICIAL | Arma Reforger (Steam store) | Store page for the game, app 1874880, fetched and confirmed. No server tool info on the page.
3. https://www.ionos.com/digitalguide/server/know-how/arma-reforger-server.md | COMMUNITY | How to set up a Arma Reforger server | Fetched. Gives app 1874900, ArmaReforgerServer.exe, UDP 2001 (game) and 17777 (Steam query), config.json, startup batch example.
4. https://gamecp.com/games/arma-reforger/hosting-guide | COMMUNITY | GameCP Arma Reforger hosting guide | Search snippet only, not fetched. SteamCMD install of app 1874900, ports 2001 and 17777.
5. https://ca.unraid.net/apps/armareforger-0kafzgh0use7i5 | COMMUNITY | armareforger (Unraid app template) | Search snippet only. SteamCMD install, GAME_ID 1874900, restart to update.
6. https://low.ms/knowledgebase/setting-up-your-arma-reforger-server | COMMUNITY | Setting up your Arma Reforger server | Search snippet only, not fetched.

## CONFIG
1. https://community.bistudio.com/wiki/Arma_Reforger:Server_Config | WIKI | Server Config – Arma Reforger | Official BI page on the JSON config (template at bottom). Fetch returned 403; NOT verified. Search snippet only mentions bindAddress, bindPort (default 2001), publicAddress, and the old name gameHostBindAddress before 0.9.8.73.
2. https://xgamingserver.com/docs/arma-reforger/server-config-reference | COMMUNITY | Arma Reforger Server Config JSON Reference | Fetched. Full default template JSON (dedicatedServerId, region, bindAddress, bindPort 2001, publicAddress, a2s port 17777, rcon port 19999, game block with scenarioId, maxPlayers, crossPlatform, supportedPlatforms, modsRequiredByDefault, gameProperties, mods, operating block). Does not cite BI wiki; labels the file server-config.json.
3. https://loafhosts.com/guides/arma-reforger/arma-reforger-server-config-json | COMMUNITY | Arma Reforger server config json | Search snippet only, not fetched.
4. https://www.survivalservers.com/wiki/index.php/Arma_Reforger_Server_Configuration | COMMUNITY | Arma Reforger Server Configuration | Search snippet only, not fetched.

## LAUNCH
1. https://xgamingserver.com/docs/arma-reforger/startup-parameters | COMMUNITY | Server Startup Parameters | Fetched. Table of 25 flags (-config, -maxFPS, -bindIP, -bindPort, -a2sIpAddress, -a2sPort, -logStats, -logLevel, -listScenarios, -addons, -profile, -aiLimit, -loadSessionSave, and others). Says flags are case-insensitive; cites no BI source.
2. https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting | WIKI | Server Hosting – Arma Reforger | Same BI page as BASICS 1. Search snippet says -maxFPS is heavily recommended (60-120). Not verified.
3. https://xgamingserver.com/blog/arma-reforger-startup-parameters/ | COMMUNITY | Arma Reforger Startup Parameters Explained (-config, -maxFPS) | Search snippet only, not fetched.

## MODS
1. https://xgamingserver.com/docs/arma-reforger/mod-setup | COMMUNITY | How to Add Workshop Mods to Your Arma Reforger Server | Search snippet only, not fetched.
2. https://xgamingserver.com/docs/arma-reforger/server-config-reference | COMMUNITY | Arma Reforger Server Config JSON Reference | Fetched (see CONFIG 2). Mods are an array in game.mods with modId (Workshop GUID), optional version, optional required; modsRequiredByDefault top-level flag.
3. https://www.gameserverkings.com/knowledge-base/arma-reforger/arma-reforger-mods/ | COMMUNITY | arma reforger mods | Search snippet only. Says mods go in game.mods of config.json; the modsRequiredByDefault default is disputed between sources.
4. https://xgamingserver.com/blog/how-to-install-mods-on-arma-reforger-server/ | COMMUNITY | How to Install Mods on Arma Reforger Server | Search snippet only, not fetched.
5. https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting | WIKI | Server Hosting – Arma Reforger | Same BI page; mod section not verified.

## Notes for the stage B writer
- No official GitHub repo for the Arma Reforger server was found. Community Docker options seen: Jamxx's Unraid/Docker template (uses default-config.json, env vars override it; GAME_ID 1874900), and https://hub.docker.com/r/rouhim/arma-reforger-server (search result only, not fetched, unclear if it matches). Neither was opened.
- Both BI wiki pages returned 403 to WebFetch (and the r.jina.ai and archive.org mirrors failed too). Every BI-wiki claim above comes from search snippets, so check them in a browser before relying on them.
- Conflict: IONOS Spanish page says game port 2011, English page says 2001. Other sources say 2001.
- Conflict: the xgamingserver blog says Workshop uses the same app id as the server, which contradicts the BI wiki snippet. Not resolved.
- Store app 1874880 is confirmed as the game. Server app 1874900 is consistent across several sources but not checked against SteamDB.

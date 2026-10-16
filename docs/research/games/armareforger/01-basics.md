# Arma Reforger: BASICS (stage B extract)

Pages read: BI wiki Server Hosting (browser, full text saved in `raw\bi-wiki-server-hosting.txt`); IONOS, GameCP, Unraid (WebFetch extraction, saved in `raw\community-pages-fetch-results.txt`); Steam store page (age gate only); low.ms (HTTP 404). Verbatim BI text is the only fully verbatim source.

Abbreviations: BI = https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting ; IONOS = https://www.ionos.com/digitalguide/server/know-how/arma-reforger-server.md ; GCP = https://gamecp.com/games/arma-reforger/hosting-guide ; UNR = https://ca.unraid.net/apps/armareforger-0kafzgh0use7i5

## Facts

- Steam app id (stable): 1874900 (BI: "stable is app id: 1874900 - https://steamdb.info/app/1874900/"; IONOS: "1874900"; GCP: "App ID: 1874900"; UNR: GAME_ID "1874900") (BI, IONOS, GCP, UNR)
- Steam app id (experimental): 1890870 (BI: "experimental: 1890870 - https://steamdb.info/app/1890870/"; BI SteamCMD: "1890870 for experimental version") (BI)
- Game store app id (not the server): 1874880. Store page has no server info. (https://store.steampowered.com/app/1874880/Arma_Reforger/)
- Anonymous login works?: Yes. BI SteamCMD steps: "Login as anonymous - type in login anonymous" and "Download and install the server app_update 1874900". (BI)
- Install size: NOT FOUND for the server files. GCP gives "~15 GB storage" for all tiers, in a hosting-plan table, not a file-size statement. (GCP)
- Server exe name: ArmaReforgerServer.exe (Windows). BI: "ArmaReforgerServer.exe -config ..."; Linux: "./ArmaReforgerServer" (BI). IONOS: "ArmaReforgerServer.exe -maxFPS 60 -config ".\config.json"" (IONOS).
- Server exe: which stays running: NOT FOUND (no page says which process stays resident or whether a launcher spawns a child).
- Ports, game: UDP 2001 (IONOS: "UDP ports 2001 (game port)"; GCP: "2001/UDP (PORT)"; UNR: "GAME_PORT" UDP 2001). Note: BI says only "Connection fails from the outside if the door is closed" and that Port Forwarding must be used; BI does not state the number. (IONOS, GCP, UNR)
- Ports, Steam query (A2S): UDP 17777 (IONOS: "17777 (port for Steam queries)"; GCP: "17777/UDP (QUERY_PORT)"; UNR: "A2S_PORT" UDP 17777). (IONOS, GCP, UNR)
- Ports, RCON: UDP 19999 (UNR: "RCON port (UDP): 19999, set via RCON_PORT"). Only UNR gives this. Its config is not in BI. (UNR)
- Ports, BattlEye RCon: BI gives an example only, not a default: "RConPort 5678" and "RConPassword myNewBEPassword" appended to Arma Reforger\BattlEye\BEServer_x64.cfg. The BI example value 5678 must not be read as the default. (BI)
- Port conflict: IONOS English page says game port 2001. The earlier note says the IONOS Spanish page says 2011. Not re-checked here. No conflict found in the pages read this time.
- Minimal start command: BI: "ArmaReforgerServer.exe -maxFPS 60" (BI, Startup Parameters section). IONOS: "ArmaReforgerServer.exe -maxFPS 60 -config ".\config.json"" (IONOS, Step 6, in start.bat). BI full example: "ArmaReforgerServer.exe -config ".\Configs\Campaign_SWCoast.json"" (BI).
- Start command with -config: "-config" is the flag that picks the config file. BI: "The Server exe uses the -config startup parameter to target the configuration file." (BI)
- Config files, location: BI: the path given to -config, example "Campaign_SWCoast.json" is "expected to be locted in Configs folder next to the exe" (BI, typo "locted" is on the page). IONOS: folder "config" in the server directory, file "config.json" (IONOS, Step 5). UNR: "default-config.json, located in the server installation directory"; env vars override it (UNR). Linux example from BI: /home/<username>/.config/ArmaReforgerServer/config.json (BI).
- Config files: BI Docker example: "-config Configs/ServerConfig/Campaign.json" (BI).
- Saves, location (world or session saves): NOT FOUND.
- Saves/profile: BI: "Console logs etc can be found in above mentioned profile folder, addons will also install there by default, you can again change that." Profile is set by "-profile". Default profile folder: NOT FOUND. (BI)
- Profile flag example: BI "-profile /home/<username>/.config/ArmaReforgerServer" (BI); GCP "-profile ./profile" (GCP).
- How to stop: NOT FOUND for the server process. BI "Quit SteamCMD quit" is for SteamCMD only. UNR: "Simply restart the container if a newer version of the game is available" (update only). BI LinuxGSM: "Should the server go offline LinuxGSM can restart the server". (BI, UNR)
- Query/RCON options: Query on UDP 17777 (IONOS, GCP, UNR). RCON: BattlEye RCon via BEServer_x64.cfg (BI); RCON port UDP 19999 via RCON_PORT (UNR). RCON password default: NOT FOUND.
- RAM/CPU: BI Docker example (Windows Docker Desktop): "CPU: 4 cores", "Memory: 6 GB" (BI, Docker Setup). GCP (labels run together in source): Economy (1-16 players) "CPU3 cores", "RAM6 GB"; Standard (16-64) "CPU3.5 cores", "RAM8 GB"; Pro (64-128) "CPU4.5 cores", "RAM12 GB" (GCP). IONOS: no numeric minimums (IONOS). UNR: NOT FOUND.
- Memory minimum (official): NOT FOUND.
- First-run behaviour: IONOS: the server log lines "DEFAULT: Entered online game state." and "ENGINE: Game successfully created." show it is ready for players (IONOS, Step 6). GCP: "GameCP handles SteamCMD (App ID: 1874900), ports, startup commands, and all configuration automatically" and its start command runs sed to change the quoted "true"/"false" in config.json to bare booleans (GCP). BI: "curl error ... code: 23 when downloading large mods in a docker container, you might need to set -addonTempDir ./tmp" (BI). BI SteamCMD: the server app is downloaded with app_update 1874900 validate. (BI)
- Config value note: IONOS: "fastValidation" "always has to have the value 'true' for public servers (Version 0.9.5)." (IONOS). Not checked against a second source.
- Config template: IONOS template has "mods": []. (IONOS)

## Panel must not (from the pages)

- Must not edit existing lines in BEServer_x64.cfg. BI: "make sure to append new settings to it and not erase or even edit existing information". Missing or changed values kick players ("Missing GameID/MasterPort server config settings") or break BattlEye. (BI)
- Must not run the server without -maxFPS. BI: "heavily recommended ... set to a value in the 60..120 range; otherwise, the server can try to use all the available resources!" (BI)
- Must not pass -config when using -server. BI: "When this parameter is used, config is ignored." (BI, server parameter section; the -server parameter is not in the BASICS list, copied because it is on the same page.)
- Docker or Linux container: the server registers the container IP by default, which causes failed client connections. BI fix: IP Connect in the server browser, or a custom config with "gameHostRegisterBindAddress" and "gameHostRegisterPort", or "ClientConnectAddress". (BI)
- Must not change the BI BattlEye file except by appending lines. (BI, above)

## NOT FOUND / UNSURE

- Install size of the server files: NOT FOUND (GCP's "~15 GB storage" is a plan figure).
- Which server process stays running: NOT FOUND.
- Save file location (world, session saves): NOT FOUND.
- Default profile folder when -profile is not given: NOT FOUND.
- How to stop the server (clean shutdown, signal, or save before stop): NOT FOUND.
- RCON default port and password: NOT FOUND (BI shows only an example port 5678 for BattlEye RCon; UNR gives 19999 for RCON_PORT, from a template).
- Official RAM/CPU minimums: NOT FOUND (only GCP tier table and BI Docker example).
- Game port: IONOS English 2001 vs earlier note of IONOS Spanish 2011. Not re-checked on the Spanish page.
- The BI page says "Server Config" and "Startup Parameters - Hosting" are on separate pages; those are not in this topic and were not opened.
- The community Docker image linked from BI (https://github.com/acemod/docker-reforger) was not opened (not in BASICS list).
- low.ms page: HTTP 404, not read.
- Steam store page: age gate only, no server info.
- GCP and UNR and IONOS facts come from WebFetch extraction, not verbatim text. Re-check them before quoting exact wording.
- Date on BI page: last edited 24 May 2025 (BI). Current game version: NOT FOUND.

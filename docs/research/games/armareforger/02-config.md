# Arma Reforger: CONFIG (copied from pages)

Primary source: BI wiki, read with the browser (https://community.bistudio.com/wiki/Arma_Reforger:Server_Config). Saved copy: `C:\Users\vulca\AppData\Local\Temp\claude\c--GodlyPanel\5e664e5d-9cf5-48e8-83cd-427e6c66bc6d\scratchpad\research\armareforger\raw\bi-wiki-server-config.txt`.
Second source (community, key list and template only): https://xgamingserver.com/docs/arma-reforger/server-config-reference. Saved copies: `...\armareforger\raw\xgamingserver-server-config-reference.html` and `...\raw\xgamingserver-server-config-reference.txt`.

Dotted paths are used throughout. Arrays of objects are written as `game.mods[].modID`.

## File

- File name: not fixed by the game. The server reads whatever file is passed with the `-config` startup parameter (BI: "The Server exe uses the -config startup parameter to target the configuration file."). Example names on the pages: `Campaign_SWCoast.json` (BI), `config.json` (BI Linux example), `server-config.json` (xgaming template label), `Configs/ServerConfig/Campaign.json` (BI Docker example). (https://community.bistudio.com/wiki/Arma_Reforger:Server_Config ; https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting ; https://xgamingserver.com/docs/arma-reforger/server-config-reference)
- Location: BI example puts it in a `Configs` folder next to the exe (`ArmaReforgerServer.exe -config ".\Configs\Campaign_SWCoast.json"`). (https://community.bistudio.com/wiki/Arma_Reforger:Server_Hosting)
- Format: JSON. "Arma Reforger servers uses JSON configuration format." "Parameters inside the JSON file are case-sensitive!" "Values are strings, unless mentioned otherwise." (https://community.bistudio.com/wiki/Arma_Reforger:Server_Config)
- Does the game create it: NOT FOUND (no page says so).

## Table 1: BI wiki (primary)

key | type | default | allowed values | description (page's words) | url

| key | type | default | allowed values | description | url |
|---|---|---|---|---|---|
| bindAddress | string (IP) | left out or empty = 0.0.0.0 | IP address; IPv6 not supported | "IP address to which the server socket will be bound. In most cases, this should be left empty." Page warns: "This entry should generally be left out of server config to use default value". Was gameHostBindAddress before 0.9.8.73. | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| bindPort | number | 2001 | 1..65535 | "UDP port to which the server socket will be bound." Page: "should generally be left out of server config so that it automatically uses same value as publicPort." Was gameHostBindPort before 0.9.8.73. | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| publicAddress | string (IP) | missing or empty = auto-detected by backend | IP address; keyword "local" | "IP address registered in backend." Page: "It is possible to use the \"local\" keyword to automatically detect the local address of the network card." Was gameHostRegisterBindAddress before 0.9.8.73. | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| publicPort | number | 2001 | 1..65535 | "UDP port registered in backend. If the server itself has a public IP address, this should be the same value as in bindPort." Was gameHostRegisterPort before 0.9.8.73. | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| a2s.address | string (IP) | required (no default stated) | IP address | "IP address to which A2S socket will be bound. It can be used to restrict A2S queries to a particular network interface." (0.9.9.31) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| a2s.port | number | 17777 | 1..65535 | "Change Steam Query UDP port on which game listens to A2S requests" (0.9.9.31; before 0.9.9 it was steamQueryPort) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| rcon.address | string (IP) | required (no default stated) | IP address | "IP address to which the RCON socket will be bound. It can be used to restrict connection to a particular network interface." (1.0.0) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| rcon.port | number | 19999 | 1..65535 | "RCON protocol port on which the game listens" | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| rcon.password | string | none stated (required for RCON to start) | no spaces; at least 3 characters | "The password: is required for RCON to start; does not support spaces; must be at least 3 characters long" | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| rcon.maxClients | number | 16 | 1..16 | "The maximum number of clients that can connect to RCON at the same time." (1.1.0) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| rcon.permission | string | not stated in text; template value "monitor" | admin, monitor | "Permission for all RCON clients." admin: "The admin can perform any command." monitor: "The monitor can only perform commands which do not change the server's state." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| rcon.blacklist | array | [] | list of command names | "A list of commands excluded from execution." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| rcon.whitelist | array | [] | list of command names | "If defined, it specifies the list of commands that can be executed, and no other command is allowed." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.name | string | none stated | length 0..100 characters | (no description text on page) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.password | string | none stated | length 0..x characters (page says "x") | "Password required to join the server." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.passwordAdmin | string | none stated | length 0..x characters (page says "x"); no spaces | "Defines the server's admin password, allows a server administrator to login and control the server, to access this either open the chat input box by pressing C in the lobby or Return in-game followed by: #login [the admin password]" "This password does not support spaces in it." Was root/passwordAdmin before 0.9.8.73. | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.admins | array | none stated | "array value of IdentityIds and/or steamIds" | "List players as server admins - they can be checked in script using BackendApi.IsListedServerAdmin(int playerId) regardless of their logged-in state." (0.9.9.31). 1.0.0: "Listed users can #login without a password." 1.3.0: "list is now limited to only 20 unique IDs"; "admins specified by their SteamId are not currently supported for priority queue" | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.scenarioId | string | none stated | path to a scenario .conf file | "The scenario's .conf file path is defined here. See the listScenarios startup parameter to list available scenarios and obtain their .conf file path." "Only one scenario can be defined - Arma Reforger does not allow for mission rotation as of v0.9.8." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.maxPlayers | number | 64 | 1..128 | "Set the maximum amount of players on the server." Was playerCountLimit before 0.9.8.73. | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.visible | bool | true (since 0.9.8.73) | true, false | "Set the visibility of the server in the Server Browser." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.crossPlatform | bool | false | true, false | "Accept all platforms if set to true, use supportedPlatforms if set to false." "It is recommended to use crossPlatform only, leaving supportedPlatforms undefined." (0.9.9) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.supportedPlatforms | array | ["PLATFORM_PC"] | PLATFORM_PC (PC), PLATFORM_XBL (Xbox console), PLATFORM_PSN (PlayStation console, since Arma Reforger 1.2.1.169) | "Define the platforms which the server accepts, allowing crossplay." Page: crossPlatform = true is "equivalent to" the three-platform array; crossPlatform = false is "equivalent to" ["PLATFORM_PC"]; "These two being the only valid combinations." Was supportedGameClientTypes before 0.9.8.73. | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.modsRequiredByDefault | bool | true | true, false | "Overrides default value for required for all mods." (1.2.1). Parent object not shown in the BI text; see NOT FOUND / UNSURE. | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.mods | array | [] (template) | list of mod objects | "The list of mods required by the client that will automatically be downloaded and activated on join." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.mods[].modID | string (GUID) | none stated | GUID | "GUID of the mod. Single GUID can be obtained from Workshop webpage" Alternatively from Workbench options or the gproj file. | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.mods[].name | string | none stated | any | "This parameter does not do anything and is only used as sort of comment, with human readable name of the mod." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.mods[].version | string | optional; latest mod version used if missing | version string | "The version mod parameter is optional. If it missing, the latest mod version will be used." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.mods[].required | bool | true, or value of modsRequiredByDefault | true, false | "Is optional parameter to specify if this addon is required for server to start. If set to false then addon will be automatically removed from list with warning in logs if it cannot be for some reason downloaded from the Workshop." (1.2.1) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.serverMaxViewDistance | number | 1600 | 500..10000 | none stated (page gives only the range) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.serverMinGrassDistance | number | 0 | 0 or 50..150 | "Minimum grass distance in meters. If set to 0 no distance is forced upon clients." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.fastValidation | bool | true (since 0.9.6) | true, false | "Validation of map entities and components loaded on client when it joins, ensuring things match with initial server state." "Always set this value to true for a public server!" | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.networkViewDistance | number | 1500 | 500..5000 | "Maximum network streaming range of replicated entities." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.battlEye | bool | true (since 0.9.8.73) | true, false | "true to enable BattlEye, false to disable it." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.disableThirdPerson | bool | false | true, false | "Force clients to use the first-person view." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.VONDisableUI | bool | false | true, false | "Force clients to not have VON (Voice Over Network) UI." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.VONDisableDirectSpeechUI | bool | false | true, false | "Force clients to not have VON (Voice Over Network) Direct Speech UI." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.VONCanTransmitCrossFaction | bool | false (1.0.0) | true, false | "Option to allow players to transmit on other factions radios. true is allow to communicate, false is listen-only" | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.missionHeader | object | none stated (overrides the scenario header) | sub-keys listed below | "This property overwrites the scenario's header, allowing to e.g change the scenario's displayed name." Full property list is in expandable "Show text" sections on the page (not read). | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.missionHeader.m_sName | string | scenario's own name | any | example value on page: "My Very Own Hosted Conflict" | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.missionHeader.m_sDetails | string | scenario's own text | any | example value on page: "If you teamkill or commit war crimes, you WILL be banned!" | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.missionHeader.m_iStartingHours | number | not stated | any | example value on page: 7 | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.missionHeader.m_iStartingMinutes | number | not stated | any | example value on page: 30 | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.missionHeader.m_bRandomStartingWeather | bool | not stated | true, false | example value on page: true | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.missionHeader.m_eSaveTypes | number | not stated | 0 disables persistence | "To disable persistence entirely, set the enabled save types in game->gameProperties->missionHeader to 0" (example: "m_eSaveTypes": 0) (1.6.0) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.persistence.autoSaveInterval | number | 10 | 0..60 | "Interval (in minutes) at which automatic saves are created, if possible for the current mission. Disabled if set to 0." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.persistence.saveRetention | number | 10 | 1..128 | "Number of save points to keep for the current mission." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.persistence.loadSessionSave | bool | true | true, false | "Automatically load the latest available save point on first startup." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.persistence.keepSessionSave | bool | false | true, false | "Keep the playthrough save points after the mission is finished." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.persistence.hiveId | number | 0 | 0..16383 | "Number identifying each hive (server) when they share the same persistence database. Used for separating UUIDs for save game data." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.persistence.databases | object | not stated | case-insensitive named objects; child keys "preset" and "options" | "named objects representing an override of the system configuration provided databases or the addition of a new one." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| game.gameProperties.persistence.storages | object | not stated | case-insensitive named objects; child key "database" | "named objects representing an override of the system configuration-provided storages." "database" must match a name in databases or "main". | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| operating.lobbyPlayerSynchronise | bool | true (since 0.9.8.73) | true, false | "If enabled, the list of player identities present on server is sent to the GameAPI along with the server's heartbeat." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| operating.disableCrashReporter | bool | false | true, false | "If enabled, the automatic server-side Crash Report is disabled. Has the same effect as -disableCrashReporter." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| operating.disableNavmeshStreaming | bool (1.0.0) / array (1.2.0+) | undefined (array form) | 1.0.0: true/false; 1.2.0+: array of navmesh names | "A disabled navmesh streaming loads the entire navmesh in memory." 1.2.0: "if provided empty, streaming of all navmeshes is disabled; if filled, only disables provided navmeshes's streaming". "was bool before 1.2.0" | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| operating.disableServerShutdown | bool | false | true, false | "If enabled, the server will not automatically shutdown if connection to backend is lost." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| operating.disableAI | bool | false | true, false | "If enabled, the server will prevent initialization and ticking of AIWorld and its components. Will completely disable AI functionality on the server." (1.1.0) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| operating.playerSaveTime | number | 120 | not stated | "Default period in seconds for saving players for both Online and Local storage (player save can still be requested on demand)." | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| operating.aiLimit | number | -1 | any number; negative is ignored | "Sets the top limit of AIs." "A negative number is not considered as valid value and is then ignored - limit is not applied." "This param is overridden by the -aiLimit startup parameter." (0.9.8.64) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| operating.slotReservationTimeout | number | 60 | 5..300 | "Sets the duration (in seconds) for how long will the backend and server reserve a slot for kicked player." (0.9.9.31) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |
| operating.joinQueue.maxSize | number | 0 (disabled) | 0..50 | "Sets maximum size of how many people can be at one time in join queue to the server." (1.2.1) | https://community.bistudio.com/wiki/Arma_Reforger:Server_Config |

Page notes that apply to this table: the BI page says "Keep fastValidation to true" and "Limit max FPS with the -maxFPS startup parameter" (https://community.bistudio.com/wiki/Arma_Reforger:Server_Config).

## Table 2: keys on the xgamingserver page only (not on the BI page text)

Source: https://xgamingserver.com/docs/arma-reforger/server-config-reference. The BI text does not list these two keys.

key | type | default | allowed values | description (page's words) | url

| key | type | default | allowed values | description | url |
|---|---|---|---|---|---|
| dedicatedServerId | string | "" in template; example value "ar-gm-myserver" | not stated | "Unique server identifier linked to your Bohemia Interactive account. Used for backend registration and server identity." | https://xgamingserver.com/docs/arma-reforger/server-config-reference |
| region | string | "" in template | US (United States), EU (Europe), AS (Asia), AU (Australia), SA (South America), AF (Africa) | "Geographic region for matchmaking. Helps players find servers in their area." | https://xgamingserver.com/docs/arma-reforger/server-config-reference |

The xgamingserver page lists the mod entry key as `modId` (see Conflicts below).

## Conflicts between pages (both values kept, not resolved)

1. Mod GUID key name: BI wiki writes `modID` (game.mods[].modID, https://community.bistudio.com/wiki/Arma_Reforger:Server_Config). xgamingserver writes `modId` in its example and table (game.mods[].modId, https://xgamingserver.com/docs/arma-reforger/server-config-reference). Keys are case-sensitive, so the exact spelling matters.
2. Parent of modsRequiredByDefault: sources.md says top-level. The xgamingserver template places it inside the `game` object, after `supportedPlatforms` (https://xgamingserver.com/docs/arma-reforger/server-config-reference). The BI text does not show a parent in its template (it lists the key under the game section heading only). Written here as game.modsRequiredByDefault.
3. Persistence keys: xgamingserver lists only autoSaveInterval, hiveId, databases and storages under persistence (https://xgamingserver.com/docs/arma-reforger/server-config-reference). BI also lists saveRetention, loadSessionSave and keepSessionSave (https://community.bistudio.com/wiki/Arma_Reforger:Server_Config). Both kept above.
4. Scope of persistence and missionHeader: xgamingserver puts missionHeader and persistence inside gameProperties (https://xgamingserver.com/docs/arma-reforger/server-config-reference). BI also puts them under gameProperties (its section headings), so the paths above are game.gameProperties.*.

## Template layout (BI page, with a syntax note)

BI template (https://community.bistudio.com/wiki/Arma_Reforger:Server_Config, bottom of page): root keys bindAddress, bindPort, publicAddress, publicPort, a2s, rcon, game, operating. The `game` object holds name, password, passwordAdmin, admins, scenarioId, maxPlayers, visible, gameProperties, mods (no crossPlatform, supportedPlatforms or modsRequiredByDefault in the template). The template text shows no comma between the closing brace of `game` and `"operating"`. Copied as the page has it.

## NOT FOUND / UNSURE

- Whether the game creates the config file on first start: NOT FOUND on BI or xgaming.
- Defaults not stated on BI page for: game.name, game.password, game.passwordAdmin, game.admins, game.scenarioId, a2s.address, rcon.address, rcon.password, rcon.permission (only the template value "monitor"), game.mods[].modID, game.gameProperties.missionHeader.* and persistence.databases / storages. Written as "none stated" or "not stated".
- Full missionHeader property list (SCR_MissionHeader and SCR_MissionHeaderCampaign) and the full persistence "Show possible options" list: in expandable sections, not read.
- The BI example configuration ("Show Example Configuration"): collapsed, not read.
- game.gameProperties.serverMaxViewDistance: the page gives only the range; no description text.
- game.name, game.password, game.passwordAdmin: the page gives length ranges as "0..100" and "0..x" (the "x" is on the page as written).
- Community sources not read:
  - https://loafhosts.com/guides/arma-reforger/arma-reforger-server-config-json: direct fetch returned a 404 "Page Not Found" page. No archive.org or r.jina.ai retry was made for it.
  - https://www.survivalservers.com/wiki/index.php/Arma_Reforger_Server_Configuration: direct fetch returned a Cloudflare "Just a moment..." page. No browser or archive.org retry was made for it.
- BI wiki edit date on the page: "22 September 2026". Page versions differ, so the version numbers in the notes are as stated on the page.

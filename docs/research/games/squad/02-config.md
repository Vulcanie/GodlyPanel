# Squad - 02 config files and settings

Researched 2026-10-15 for Squad Dedicated Server (Steam app 403240). Build number: not stated by any source (the wiki mentions release 2.0 terminology and "v8.0" layer sheet, so the pages are from the current v8.x era; shipped-file copies from GameServerManagers are older, "v2.0" headers).

## Sources (keys used in the tables)
- **[WCFG]** Official Squad Wiki, Server Configuration: https://squad.fandom.com/wiki/Server_Configuration (page wikitext read through the wiki's MediaWiki API, `https://squad.fandom.com/api.php?action=parse&page=Server_Configuration&prop=wikitext&format=json`; normal page fetch gives HTTP 402). Contains the current Server.cfg, Rcon.cfg, VoteConfig.cfg, CustomOptions.cfg templates and the Admins.cfg permission list. Local copy: `raw\wiki-Server_Configuration.txt`.
- **[WADM]** Official wiki, Server Administration: https://squad.fandom.com/wiki/Server_Administration (admin access levels, console commands). Local: `raw\w2-Server_Administration.txt`.
- **[WINST]** Official wiki, Server Installation: https://squad.fandom.com/wiki/Server_Installation (config folder, file list, ports). Local: `raw\w2-Server_Installation.txt`.
- **[WLIC]** Official wiki, Server licensing: https://squad.fandom.com/wiki/Server_licensing
- **[WTRB]** Official wiki, Unable to Find Server: https://squad.fandom.com/wiki/Unable_to_Find_Server
- **[GSM]** Copies of the files as Squad ships them (older, "v2.0"): https://github.com/GameServerManagers/Game-Server-Configs/tree/master/Squad (raw files in `raw\*.cfg`). Used for Admins.cfg (current default groups and the permission comment block), Rcon.cfg (extra keys) and the other small files. Older than the wiki, so where they differ the wiki wins and the difference is noted.
- **[XG]** https://xgamingserver.com/docs/squad/server-cfg-reference and https://xgamingserver.com/configs/squad (hosting company, third-party; lists a newer shipped Server.cfg/Rcon.cfg/VoteConfig.cfg set). Used only to cross-check or when marked.
- **[LOWMS]** https://low.ms/knowledgebase/squad-server-configuration (hosting company, third-party).
- **[GHB]** https://www.gamehostbros.com/guides/games/squad-44/configure-your-server (hosting company; note: the page is for "Squad 44", a different game; used only as a weak cross-check).

Where the config folder is: `<install>\SquadGame\ServerConfig\` [WCFG][WINST]. Files there are NOT overwritten by updates ("we do not overwrite config files", [WCFG]); new settings must be added by hand. Whether the files exist right after SteamCMD install or only after first start is UNVERIFIED (a docker image edits an existing Server.cfg, which suggests they ship with the install; not proven).

## File list [WINST][WCFG]
Admins.cfg, Bans.cfg, CustomOptions.cfg, ExcludedFactions.cfg, ExcludedFactionSetups.cfg (removed with layer voting [WCFG]), ExcludedLayers.cfg, ExcludedLevels.cfg, LayerRotation.cfg, LevelRotation.cfg, LayerVoting.cfg, LayerVotingLowPlayers.cfg, LayerVotingNight.cfg, License.cfg, Motd.cfg (optional; wiki says the name must be uppercase `MOTD.cfg` for Linux), Rcon.cfg, RemoteAdminListHosts.cfg, RemoteBanListHosts.cfg, Server.cfg, ServerMessages.cfg, VoteConfig.cfg. All are plain text. **There is no file called MapRotation.cfg in the current game**; the old wiki (per the README in [GSM]) described one, but the current files are LayerRotation.cfg and LevelRotation.cfg.

Format of all `.cfg` files: one `Key=Value` per line (Server.cfg, Rcon.cfg, VoteConfig.cfg), or one entry per line (rotation/exclusion/message/ban lists). Comment lines start with `//` (and `#` in some files). Wiki warning: "in-line comments will not work" in the rotation/exclusion files; put comments on their own lines [GSM header comments]. In Server.cfg, `ServerName` must be wrapped in double quotes or the server may not become visible [WTRB].

---

## 1. Server.cfg (key=value) - `SquadGame\ServerConfig\Server.cfg`
Defaults below are the values printed as the shipped default in [WCFG] (the wiki says this is the general server config; "Each variable should be on its own line"). Config is read at server start; restart after edits (one hosting guide claims reload on map change/`AdminReloadServerConfig`: UNVERIFIED, not in the official wiki).

| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| ServerName | Server name | The name shown in the in-game server browser. Keep the double quotes. If special characters show as "????", paste them from a word processor. | Basics | "Squad Dedicated Server" (wiki) / "SERVERNAME" ([GSM] older file) | text in double quotes | any text | [WCFG][WTRB] |
| ShouldAdvertise | Show in server browser | If true, your server is listed in the in-game browser. Set to false for a private or test server (players then need to find it by IP). | Basics | true | bool | true / false | [WCFG][WTRB] |
| IsLANMatch | LAN only | If true, the server runs in LAN mode. Keep false for an internet server (the wiki's troubleshooting page says it must be false for the server to show in the public list). | Basics | false | bool | true / false | [WCFG][WTRB] |
| MaxPlayers | Max players | The most players that can be on the server at once. | Basics | 100 | integer | whole number (the launch argument FIXEDMAXPLAYERS also caps it, see 03-launch-args) | [WCFG] (hosting guides show 80 as a default; wiki sample says 100) |
| NumReservedSlots | Reserved slots | How many of the player slots are kept free for admins/members who have the `reserve` permission in Admins.cfg. | Basics | 0 | integer | 0 or more | [WCFG] |
| PublicQueueLimit | Join queue size | How many regular players may wait in the queue when the server is full. 0 means no queue; -1 means unlimited. | Basics | 25 | integer | 0, -1, or a positive number | [WCFG] (explicit note under the file) |
| Tags | Browser tags | Space-separated tags that help players filter the server list (language, game mode, play style...). See the tag list at the end of this file. | Server browser | (empty) | space-separated list | tags from the Tag System tables | [WCFG] |
| Rules | Rule tags | Space-separated rule tags shown on the server preview card (only shown there, not used for filtering). See the list below. | Server browser | (empty) | space-separated list | rule_* tags | [WCFG] |
| MapRotationMode | Map rotation mode | How the next map/layer is chosen: LevelList = maps in the order of LevelRotation.cfg (game picks the mode); LayerList = layers in the order of LayerRotation.cfg; LayerList_Vote = players vote on the next layer at the end of a match (uses LayerVoting.cfg and VoteConfig.cfg); the _Randomized versions shuffle the list. | Map rotation | LayerList (in the wiki's printed sample); the wiki text also says a fresh install defaults to layer voting | dropdown | LevelList, LayerList, LayerList_Vote, LevelList_Randomized, LayerList_Randomized | [WCFG] |
| RandomizeAtStart | Shuffle rotation at start | Whether the rotation list is shuffled when the server starts. | Map rotation | true | bool | true / false | [WCFG] |
| UseVoteFactions | Vote for factions | Whether players vote for the factions on generic layers. If false, factions are chosen randomly. | Map rotation | false | bool | true / false | [WCFG] |
| UseVoteLevel | Vote for next map | Whether the next map is voted on at the end of the round. | Map rotation | false | bool | true / false | [WCFG] |
| UseVoteLayer | Vote for next layer | Whether the next layer is voted on at the end of the round. | Map rotation | false | bool | true / false | [WCFG] |
| AllowTeamChanges | Allow team changes | Completely allow or forbid team changes for all players. Only admins with the `balance` permission can bypass it. | Team balance | true | bool | true / false | [WCFG] |
| PreventTeamChangeIfUnbalanced | Block unbalancing team switches | If false, players can change teams no matter how the sides are filled. If true, the NumPlayersDiffForTeamChanges limit is used. | Team balance | true | bool | true / false | [WCFG] |
| NumPlayersDiffForTeamChanges | Max team size difference | Largest allowed difference in player count between the two teams for a switch; it counts both the team the player leaves and the one they join. | Team balance | 3 | integer | whole number | [WCFG] |
| RejoinSquadDelayAfterKick | Squad rejoin delay | Seconds a player must wait before joining a squad again after being kicked from one. The wiki does not state the unit; seconds is from a hosting guide ([GHB]). | Moderation | 180 | integer (seconds, unit from [GHB]) | whole number | [WCFG] (value) / [GHB] (unit, UNVERIFIED in official) |
| RecordDemos | Record server demos | Record each match on the server as a replay demo. The wiki's admin list says server-side demos are "currently broken". | Recording | false | bool | true / false | [WCFG][WADM] |
| AllowPublicClientsToRecord | Players may record | Whether ordinary players may record client-side replays. If off, you can still give chosen admins the `clientdemos` permission. | Recording | false | bool | true / false | [WCFG] |
| ServerMessageInterval | Message interval | How often the next line of ServerMessages.cfg is shown, in seconds ("rotate server messages every x seconds"). | Messages | 300 | integer (seconds) | whole number | [WCFG] (ServerMessages section) |
| ForceNonSeamlessTravelIntervalSeconds | Forced reconnect map change | Commented out by default. If set, the server does a disconnecting (non-seamless) map change every X seconds. The wiki example is 43200 (12 hours). | Advanced | (commented out) | integer (seconds) | whole number | [WCFG] |
| TKAutoKickEnabled | Auto-kick team killers | Automatically kick players who team-kill too much. Marked "required for licensed servers, but can be changed for non-licensed servers". | Moderation | true | bool | true / false | [WCFG] |
| AutoTKBanNumberTKs | Team kills before ban | Number of team kills after which a player is auto-banned (wiki text: "after 7 teamkills"). | Moderation | 7 | integer | whole number | [WCFG] |
| AutoTKBanTime | Team-kill ban length | How long the automatic team-kill ban lasts, in seconds (example in the wiki: 1209600 = 14 days). | Moderation | 300 | integer (seconds) | whole number | [WCFG] |
| VehicleKitRequirementDisabled | No kit needed for vehicles | If true, players do not need the matching kit to use vehicles. Required false on licensed servers. | Gameplay | false | bool | true / false | [WCFG] |
| AllowCommunityAdminAccess | Developer admin access | Lets Offworld developers use admin tools on your server. Comment in file: required on licensed servers; the wiki licensing page says licensed servers have developer/QA admin and debug access enabled. | Advanced | true | bool | true / false | [WCFG][WLIC] |
| TimeBetweenMatches | Time between matches | Seconds of end-of-round time before moving to the next match when voting is off. Appears in the wiki template. | Match timing | 60 | integer (seconds) | whole number | [WCFG] (unit from "timer", seconds by [XG]) |
| TimeBeforeVote | End screen time | How long the end screen is shown before the vote starts. | Match timing | 60 | integer (seconds) | whole number | [WCFG] (unit by [XG]) |
| AllowDevProfiling | Developer profiling | Comment in file: "Only Offworld Industries developers are admins". Lets developers profile server performance. | Advanced | true | bool | true / false | [WCFG] |
| AllowQA | QA access | Lets Offworld QA staff in. The wiki gives no explanation of this one. | Advanced | true | bool | true / false | [WCFG] (no description; UNVERIFIED meaning) |
| VehicleClaimingDisabled | Disable vehicle claiming | If true, the vehicle-claiming system is switched off. "Optional for all servers". | Gameplay | false | bool | true / false | [WCFG] |

Tag lists [WCFG "Tag System"] (space-separated in `Tags=`; limits stated by the wiki):
- Language (up to 2, ISO-639-1): language_en, language_zh, language_ru, language_de, language_tr, language_uk, language_fr, language_pt, language_pl, language_sv, language_th, language_nl, language_fi, language_ko, language_es, language_no, language_ja, language_da, language_it, language_cs, language_tl, language_id, language_kk, language_ar, language_he.
- Game mode (up to 3): mode_invasion, mode_aas, mode_raas, mode_destruction, mode_tc (Territory Control), mode_insurgency, mode_seed, mode_skirmish, mode_training.
- Play style (1): playstyle_relaxed, playstyle_focused, playstyle_milsim.
- Experience (1): exp_newplayer, exp_experience.
- Map rotation (1): maprot_rotation, maprot_voting (voting tag is for servers with their own voting system).
- Rule tags (`Rules=`): rule_vehicle_name_claim (name your squad properly to claim vehicles), rule_vehicle_fcfs (vehicles first come first served), rule_play_objective, rule_no_main_camping, rule_no_soloing_vehicle (no soloing armor), rule_mech_inf_restrictions (infantry squads cannot include armor/helicopters or a Crewman SL), rule_lock_restrictions (locking squads restricted by player count/squad type).

### Server.cfg keys seen only in third-party sources (not in the official wiki file) - see UNVERIFIED
ServerPassword, EnforceTeamBalance, JoiningPlayerTimeout, AllianceEnabled, AllowFireteamLayersInRotation, ShouldLog, NumRconBackupThreads, PublicPort/QueryPort/RCONPort, IsLicensedServer, LicenseKey.

---

## 2. Admins.cfg - `SquadGame\ServerConfig\Admins.cfg`
Line syntax [GSM shipped comments][WCFG]:
- Group line: `Group=<GroupName>:<permission1>,<permission2>,...` (example from the shipped file: `Group=MyGroup: pause, demos, changemap`; spaces after the comma appear in that example).
- Admin line: `Admin=<SteamID64>:<GroupName>` with an optional trailing `//comment`, e.g. `Admin=76561198000000001:Admin // Adam`. The wiki says it needs to be SteamID64 (the shipped file's comment says just "Steam ID #"). Players can be listed in several groups by repeating lines (the wiki's remote list text says permissions are combined when a player is in several files).
- Default groups in the shipped file [GSM]: `Group=Admin:kick,ban,changemap` and `Group=Moderator:kick,ban`. No Admin lines by default.
- Wiki example groups [WCFG]: `Group=SuperAdmin:changemap,cheat,private,balance,chat,kick,ban,config,cameraman,debug,pause`, `Group=Admin:changemap,balance,chat,kick,ban,cameraman,pause`, `Group=Moderator:changemap,chat,kick,ban`, `Group=Whitelist:reserve` (a Whitelist group of only `reserve` gives a reserved slot).
- Edits: the wiki does not state when Admins.cfg is re-read (restart to be safe: UNVERIFIED).

Permission names (shipped comment block [GSM] and wiki [WCFG][WADM]), plain-language:

| permission | label | description | source |
|---|---|---|---|
| changemap | Change map | Switch to another map/layer. | [GSM][WCFG] |
| pause | Pause/match control | Pause the game and use match commands (end match etc.). | [GSM][WADM] |
| cheat | Cheats | Use server cheat commands (e.g. AdminSlomo). Give to as few people as possible. | [GSM][WADM] |
| private | Set password | Password-protect the server (AdminSetServerPassword). | [GSM][WADM] |
| balance | Ignore team balance | Can switch teams regardless of team sizes. | [GSM][WADM] |
| chat | Admin chat and broadcasts | Use admin chat and server broadcast. | [GSM] |
| kick | Kick | Kick players. | [GSM] |
| ban | Ban | Ban players. | [GSM] |
| config | Change server config | Change server settings (e.g. AdminSetMaxNumPlayers). | [GSM][WADM] |
| cameraman | Spectator camera | Free admin spectate camera. | [GSM][WADM] |
| immune | Immune | Cannot be kicked or banned. | [GSM][WADM] |
| manageserver | Manage server | "Shutdown server" / "Manage server / kill server". | [GSM][WADM] |
| featuretest | Feature test | Any features added for testing by the developers (e.g. vehicle spawner). | [GSM][WADM] |
| reserve | Reserved slot | Can join using a reserved slot when the public slots are full. | [GSM] |
| demos | Server demos | Record server-side demos via admin commands. Wiki says currently broken. | [GSM][WADM] |
| clientdemos | Client demos | Record demos on the player's own PC via commands or the replay UI. | [GSM] |
| debug | Debug | Show the admin stats command and other debug info. | [GSM] |
| teamchange | Free team change | No timer limits on team change. | [GSM] |
| forceteamchange | Force team change | Can use the ForceTeamChange commands. | [GSM] |
| canseeadminchat | See admin chat | Can see the admin chat and teamkill/admin-join notifications. | [GSM] |
| startvote | (unused) | "not used". | [GSM] |

Permission names are written lower case in every source; whether case matters is UNVERIFIED.

### RemoteAdminListHosts.cfg
One URL per line pointing to an admin list in the same format as Admins.cfg; lets several servers share one list; permissions are combined [WCFG]. Shipped empty [GSM].

---

## 3. Rcon.cfg (key=value) - `SquadGame\ServerConfig\Rcon.cfg`
The wiki template [WCFG] has IP, Port, Password, MaxConnections, SecondsBeforeTimeoutCheck. The shipped file in [GSM] (older but with more keys, each with an argument-form comment) also has ConnectionTimeout and AuthenticationTimeout. Every key can also be given on the server command line (shipped comments).

| key | label | description | group | default | type | allowed values | launch-arg equivalent | source |
|---|---|---|---|---|---|---|---|---|
| IP | RCON bind address | IP the RCON listener binds to. 0.0.0.0 binds to the default public IP; set it if the machine has several IPs. | RCON | 0.0.0.0 | text (IP) | IP address | RCONIP=0.0.0.0 | [WCFG][GSM] |
| Port | RCON port | TCP port for remote console (RCON). | RCON | 21114 | integer | port number | RCONPORT=21114 | [WCFG][GSM]; TCP per [GHB]/[LOWMS], wiki firewall list says UDP and TCP |
| Password | RCON password | Password to log in to RCON. Leaving it empty keeps RCON turned off. | RCON | empty in wiki; `Password1` in the older shipped file [GSM] | password | any text, no spaces advised by [LOWMS] | RCONPASSWORD=MyPassword | [WCFG][GSM] |
| MaxConnections | Max RCON connections | Maximum simultaneous RCON connections. | RCON | 5 | integer | whole number | RCONMAXCONNECTIONS=5 | [WCFG][GSM] |
| SecondsBeforeTimeoutCheck | Idle seconds before keepalive | Seconds without contact from a console before the server sends a TCP keepalive to see if it is still connected. Wiki: 30 to 3600; the older shipped file also says 30 to 3600. | RCON | 120 | integer (seconds) | 30 - 3600 | RCONSECONDSBEFORETIMEOUTCHECK=120 | [WCFG][GSM] |
| ConnectionTimeout | Idle seconds before session check | (Older shipped file only.) Seconds without contact before the server checks whether the session is still alive; 0 to 86400 (1 day); 0 disables. | RCON | 300 | integer (seconds) | 0 - 86400 | RCONCONNECTIONTIMEOUT=300 | [GSM] only (not in current wiki) |
| AuthenticationTimeout | Login timeout | (Older shipped file only.) Seconds the server waits for the console to log in after connecting; 0 to 3600; 0 disables. The shipped comment shows the wrong launch-arg name (copy of the one above). | RCON | 5 | integer (seconds) | 0 - 3600 | not reliable (UNVERIFIED) | [GSM] only |

---

## 4. LayerRotation.cfg / LevelRotation.cfg (list files, replace the old "MapRotation.cfg")
- **LayerRotation.cfg**: used when `MapRotationMode` is `LayerList` or `LayerList_Randomized`. One layer ID per line, e.g. `Belaya_AAS_v1` (IDs, not display names; the shipped header says "Belaya_AAS_v1" is correct, "Belaya AAS v1" is not) [GSM][WCFG]. Optional factions on the same line: `Anvil_AAS_v1` loads the layer with its predefined factions; `Anvil_AAS_v1 USA RDF` sets Team 1 = USA, Team 2 = RDF. You cannot play a faction against itself or against a faction in the same alliance (exception: independent factions). Invalid setups: the server changes the second team to a valid faction [WCFG]. Unit-specific form `BAF+Mechanized INS` appears in command examples [WCFG]. Layers that were removed from the game are ignored/excluded [WCFG].
- **LevelRotation.cfg**: used when `MapRotationMode` is `LevelList` or `LevelList_Randomized`. One level (map) ID per line, e.g. `AlBasrah`, `Belaya`, `Chora`, `FoolsRoad`, `Gorodok`; the game picks the mode [GSM][WCFG].
- Faction IDs in the current wiki [WCFG]: REDFOR: VDV, RDF; BLUFOR: AFU, ADF, BAF, CAF, USA, USMC; PAC: PLA, PLANMC, PLAAGF; independent: GFI, TLF, MEI, IMF, WPMC. Unit types: Combined Arms, AirAssault, Armored, LightInfantry, Mechanized, Motorized, Support (and amphibious assault per the wiki text).
- Comment lines (`//`) must be on their own line. A typo in a layer name stops it loading [WTRB index].
- Voting rotation uses **LayerVoting.cfg**, **LayerVotingLowPlayers.cfg**, **LayerVotingNight.cfg**: one layer entry per line (same structure); a faction or unit written in a voting line is EXCLUDED, "Faction+Unit" excludes that unit, "+Unit" excludes all units of that type [WCFG]. Needs `MapRotationMode=LayerList_Vote`. If LayerVotingLowPlayers.cfg is empty only LayerVoting.cfg is used [WCFG].

### ExcludedLevels.cfg / ExcludedLayers.cfg / ExcludedFactions.cfg
Lists of IDs, one per line, that must never load, in any rotation. Shipped examples: levels TutorialInfantry, TutorialHelicopter, JensensRange; layers e.g. AlBasrah_TA_v1 (Track Attack), Tutorial_Helicopter, Tutorial_Infantry [WCFG][GSM]. ExcludedFactions: faction IDs, units, setups, same rules as above [WCFG]. Not for users who do not need it; the panel can leave these alone.

---

## 5. VoteConfig.cfg (key=value; layer voting) [WCFG, current default file]
Applies when `MapRotationMode=LayerList_Vote`. (The older shipped file in [GSM] has a different key set - LevelCountPerVote, LayerVote_Duration, ..._AccessFilter - which belongs to the old vote system; do not use both.)

| key | label | description | default | type / range | source |
|---|---|---|---|---|---|
| LayerOptionsNumber | Layers per vote | How many layers from your list are offered in each layer vote. | 6 | integer 2-6 | [WCFG] |
| LayerVoteDuration | Layer vote time | Seconds of the voting phase for the next layer (wiki prose: 20-90). | 90 | seconds | [WCFG] |
| TeamVote_Duration | Faction vote time | Seconds of the faction/unit vote per team (prose: 20-60). | 60 | seconds | [WCFG] |
| TeamVoteOptionsNumber | Faction options | How many options appear on the faction/unit selection screen. | 6 | integer 2-6 | [WCFG] |
| LowPlayerCountThreshold | Low population threshold | If fewer players than this are online when the match ends, the next vote uses the low-population pool (LayerVotingLowPlayers.cfg), e.g. seeding or skirmish layers. | 30 | players | [WCFG] |
| MapSkipRounds | Skip repeat map | Rounds before the last played map can be offered again. | 1 | rounds | [WCFG] |
| MapBiomeSkipRounds | Skip repeat biome | Same for the last played biome. | 0 | rounds | [WCFG] |
| LayerSizeSkipRounds | Skip repeat layer size | Same for the last layer size. | 0 | rounds | [WCFG] |
| GameModeSkipRounds | Skip repeat game mode | Delay per game mode, as `Mode N` pairs: `AAS 0, RAAS 0, Invasion 0, Seed 0, Skirmish 0, TerritoryControl 0, Insurgency 0, Destruction 0, TrackAttack 0`. | all 0 | list | [WCFG] |
| LayerSkipRounds | Skip repeat layer | Rounds before the same layer is offered again. | 1 | rounds | [WCFG] |
| FactionSkipRounds | Skip repeat faction | Same for factions. | 1 | rounds | [WCFG] |
| FactionSetupSkipRounds | Skip repeat unit | Same for the specific faction unit. | 1 | rounds | [WCFG] |
| CanRegenerateLayerList | Allow re-roll layers | One-time vote option to regenerate the layer list. | true | bool | [WCFG] |
| CanRegenerateFactionList | Allow re-roll factions | One-time vote option to regenerate the faction list. | true | bool | [WCFG] |
| DisplayVotes | Show vote counts | If false, vote counts are hidden during the vote. | true | bool | [WCFG] |
| DisplayEnemyInfo | Show enemy info | Show detailed enemy info during voting. | true | bool | [WCFG] |
| SymmetricalMatchUp | Mirror unit types | The second team's unit types are the same as the first team's choice. | false | bool | [WCFG] |
| GameModeChoices | Choices per game mode | How many choices of each game mode appear on the layer vote; 0 is unlimited; earlier-listed modes win when the sum exceeds LayerOptionsNumber. Same `Mode N` list form. | all 0 | list | [WCFG] |
| UniqueMap | One layer per map | Only unique maps (random game mode) appear in the vote. | true | bool | [WCFG] |
| AutoSelectFactions | Auto-pick factions | After the layer vote, factions are chosen by other rules. | false | bool | [WCFG] |
| NightTime | Night window | Time range such as `18:00-04:00` (server system time) during which LayerVotingNight.cfg is used; low-population pool has priority. | (empty) | time range | [WCFG] |
| FirstLayer | First layer | Layer loaded every time the server starts in vote mode; if empty the first line of LayerVoting.cfg is used. | (empty) | layer ID | [WCFG] |

---

## 6. ServerMessages.cfg, MOTD.cfg, Bans.cfg, License.cfg, CustomOptions.cfg, remote lists
- **ServerMessages.cfg** [WCFG]: one message per line; the game rotates through them every `ServerMessageInterval` seconds from Server.cfg ("This should be used to display server rules and contact information"). Shipped content is two sample lines about joinsquad.com [GSM]. (A hosting guide shows a `TimeBetweenMessages=300` line in some versions: UNVERIFIED, not in the official wiki.)
- **MOTD.cfg** [WCFG]: optional; shows a small text box to each player on joining; the text does not wrap in game; file name must be upper case on Linux. Supported HTML: `<a> Yellow Text</a>` and `<a href="link.com"> YELLOW LINK</a>`.
- **Bans.cfg** [WCFG]: one ban per line: `<steamid>:<unix timestamp of ban expiry>`; 0 = permanent. In-game and RCON bans add the long form `<admin nick> [SteamID <admin steamid>] Banned:<steamid>:<timestamp> //<comment>`. File must end with a newline when edited by hand. Shipped empty [GSM]. (A hosting guide describes a different `SteamID:Duration:Reason` form: contradicts the wiki, not used.)
- **RemoteBanListHosts.cfg** [WCFG][GSM]: one URL per line to a ban file in the same format.
- **License.cfg** [WLIC]: holds the license key Offworld issues to licensed communities ("a key which needs to be listed in the server's config files"). Shipped empty [GSM]. Exact line format of the key: UNVERIFIED. Licensing needs: at least 60 slots and 10 admins to be accepted [WLIC]; unlicensed servers appear in the Custom server browser [WINST]. Not needed for a friends server.
- **CustomOptions.cfg** [WCFG]: for mod settings, and for the seeding game mode. Lines start with `#` to disable; remove the `#` to activate. Keys (defaults apply when absent):

| key | description | default | type | source |
|---|---|---|---|---|
| SeedPlayersThreshold | Players needed to start the pre-live countdown. | 50 | integer | [WCFG] |
| SeedMinimumPlayersToLive | After the threshold was reached, if players drop but stay at or above this, the countdown does not stop. Must be above 0 and below SeedPlayersThreshold to be active. | 45 | integer | [WCFG] |
| SeedMatchLengthSeconds | Match length in seconds. | 21600 (6 h) | integer | [WCFG] |
| SeedAllKitsAvailable | All kits available during seeding (0 or 1). | 1 | bool as 0/1 | [WCFG] |
| SeedInitialTickets | Starting tickets for both teams. | 100 | integer | [WCFG] |
| SeedSecondsBeforeLive | Length of the pre-live countdown. | 60.0 | float | [WCFG] |

---

## 7. Game.ini / Engine.ini (Unreal ini, `SquadGame\Saved\Config\WindowsServer\`)
The official wiki documents only two uses; the files are created by the game after the first run ("run the server instance at least once to generate the necessary file" [WCFG]). Linux path shown in [WADM] is `SquadGame/Saved/Config/LinuxServer/Engine.ini`; Windows folder `WindowsServer` is from [WCFG] ("\Saved\Config\WindowsServer"). Nothing else needs editing for a normal server; the panel should not need to manage these.

| file | section | key | description | default | allowed | source |
|---|---|---|---|---|---|---|
| Game.ini | [/Script/Squad.SQGameMode] | bTournamentMode | Turns on tournament mode, which limits which client graphics settings players may use (so nobody gains a visibility advantage). Needs a server restart. | not present (off) | true | [WCFG] |
| Game.ini | [/Script/Squad.SQTournamentModeRuleset] | Restrictions=(Setting="r.ShadowQuality", Min=1, Max=5) | One line per restricted client graphics console variable with an allowed range. Current wiki list: r.ShadowQuality 1-5, r.ViewDistanceQuality 3-4, r.ViewDistanceScale 1-4, grass.MaxUpdateFrequency 10-40 ("V15 compatible version"). | none | Setting/Min/Max | [WCFG] |
| Engine.ini | [CrashReportClient] | bAgreeToCrashUpload | Wiki "Getting crash dumps" (Linux section): set to true to allow crash upload so crash reports are produced. | not present | true | [WADM] |

Not documented by any source found: `Rcon` settings in Game.ini/Engine.ini, tick rate or net-speed ini settings (launch argument FIXEDMAXTICKRATE exists, see 03-launch-args).

---

## 8. Server password
No Server.cfg key for a join password is in the official wiki's Server.cfg. The official way is the console/RCON command `AdminSetServerPassword <Password>` (use `""` to remove) with the `private` permission [WADM]; this sets the password on a running server. Third-party sources ([GSM] README, [LOWMS]) show `ServerPassword=` in Server.cfg; this is in the UNVERIFIED list. Do not claim it works until tested on a real install.

---

## UNVERIFIED (count: 17)
1. `ServerPassword` as a Server.cfg key (only third-party [GSM README example], [LOWMS]; absent from the official Server.cfg).
2. `EnforceTeamBalance` (third-party [GHB][GSM squadserver.cfg]; not in the official file) - meaning is "forces teams to rebalance" per hosting guides only.
3. `JoiningPlayerTimeout`, `AllianceEnabled`, `AllowFireteamLayersInRotation` (only [XG]).
4. `ShouldLog`, `NumRconBackupThreads` ([LOWMS] only, no description).
5. `PublicPort` / `QueryPort` / `RCONPort` / `IsLicensedServer` / `LicenseKey` as Server.cfg keys ([LOWMS] only; ports are known launch arguments).
6. `AllowQA` meaning (no description anywhere official).
7. Unit of `RejoinSquadDelayAfterKick`, `TimeBetweenMatches`, `TimeBeforeVote` (official gives no unit; seconds from hosting guides/[GHB]); `AutoTKBanTime` unit seconds is official (the "1209600 = 14 days" example), but whether 0 means permanent is not stated officially ([XG] claims it).
8. Whether `MapRotationMode` default on a brand-new install is `LayerList` (wiki template) or `LayerList_Vote` (wiki prose and [XG]). Needs a first-run look at the installed Server.cfg.
9. Whether Server.cfg, Rcon.cfg etc. exist immediately after SteamCMD install or are created on first start.
10. When Admins.cfg and other cfg files are re-read (restart assumed).
11. Whether permission names and Server.cfg values are case-sensitive.
12. Exact line format of the key in License.cfg.
13. Current (v8) shipped Rcon.cfg content: wiki template lacks ConnectionTimeout/AuthenticationTimeout (present in the older shipped file); default Password value (empty in wiki, `Password1` in the older file).
14. Exact current shipped LayerRotation.cfg/LevelRotation.cfg layer IDs (the [GSM] copies are old, "v2.0"; the wiki says 203 layers now).
15. `TimeBetweenMessages` in ServerMessages.cfg (hosting guide only).
16. Whether `bTournamentMode` and the Windows Game.ini folder `Saved\Config\WindowsServer` is created on a fresh Windows install (only the wiki sentence).
17. Which Game.ini/Engine.ini settings exist for server tick/net performance (none found).

## Settings found but not confidently explainable
AllowQA; AllowDevProfiling and AllowCommunityAdminAccess exact effects beyond the in-file comment; EnforceTeamBalance; ShouldLog; NumRconBackupThreads; LOWMS-only Rcon keys `SecondsToTimeoutForUnAuth`, `ClientDisconnectWaitTime`, `SessionTimeout`; permission `startvote` (not used); `demos`/`clientdemos` behaviour (wiki says broken); VoteConfig old-style keys from the older shipped file (LevelCountPerVote etc.).

## Notes for the panel
- Suggested first config to write: Server.cfg with ServerName in double quotes, MaxPlayers, ShouldAdvertise, and Rcon.cfg with Password and Port (the panel needs RCON for management). Passwords must not be stored/printed in logs.
- Admins.cfg is the main "who is admin" control; the form needs a Group editor plus an Admin list of SteamID64:Group.
- Rotation: MapRotationMode dropdown plus a text editor for LayerRotation.cfg / LevelRotation.cfg (layer IDs one per line).

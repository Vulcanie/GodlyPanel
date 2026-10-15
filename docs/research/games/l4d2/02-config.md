# Left 4 Dead 2 - 02-config: server.cfg and server convars

Researched 2026-10-15. Dedicated server app 222860 (store app 550). Read-only web research; nothing was installed or run.

## Abbreviations and source quality
- **WIKI** = Valve Developer Community, "List of Left 4 Dead 2 console commands and variables" (canonical URL https://developer.valvesoftware.com/wiki/List_of_Left_4_Dead_2_console_commands_and_variables , redirect from List_of_L4D2_Cvars). The live site returns HTTP 403 / a bot wall to automated fetches, so it was read from the Wayback Machine copy https://web.archive.org/web/2024/https://developer.valvesoftware.com/wiki/List_of_L4D2_Cvars . The page itself states: "Retrieved October 7, 2021 16:20:36 UTC, Version 2.2.2.1" and "Descriptions with ** denote community modified descriptions and may not be entirely accurate." So the defaults and descriptions are a 2021 dump of game version 2.2.2.1, not checked against the 2026 build. The wiki's own "Parameters" column (quoted strings such as "sv", "cheat", "rep", "nf", "a", "launcher") is reproduced in the source column as "wiki flags"; the page does not define them (by Source convention "cheat" marks cheat-protected cvars, UNVERIFIED for L4D2).
- Other pages actually opened: https://kb.firedaemon.com/support/solutions/articles/4000086975-left-4-dead-2-source (FireDaemon, sample server.cfg and launch line), https://pingperfect.com/knowledgebase/534/Left-for-Dead-2-LFD2--Server-Configuration.html (hosting provider, annotated sample cfg; the fetch tool summarised it), https://xgamingserver.com/configs/l4d2 and https://xgamingserver.com/docs/left-4-dead-2/server-config (hosting provider), https://raw.githubusercontent.com/GameServerManagers/Game-Server-Configs/main/l4d2/server.cfg (LinuxGSM sample, dated 26/04/2026), https://esagames.ro/how-to-make-a-left-4-dead-2-server.php , https://steamcommunity.com/app/550/discussions/0/1621724904371115456 (Steam forum config thread), https://developer.valvesoftware.com/wiki/Master_Server_Query_Protocol (region codes, via Wayback), https://developer.valvesoftware.com/wiki/Mutation_Gametype (via Wayback), https://developer.valvesoftware.com/wiki/Command_Line_Options (via Wayback).
- The game's OWN shipped config could not be read. No source says what is in `left4dead2/cfg/` of a fresh server install. FireDaemon states for server.cfg: "The file is not included by default and must be created." So there is no shipped default server.cfg to quote (anything beyond that one statement is UNVERIFIED). The defaults in the tables are the WIKI (version 2.2.2.1) values, not values from a shipped file.

## The config file
| item | value | source |
|---|---|---|
| file | `left4dead2/cfg/server.cfg` (relative to the game folder inside the install; FireDaemon example path `C:\L4D2\left4dead2\left4dead2\cfg\server.cfg` where `C:\L4D2` is the install dir) | FireDaemon KB |
| format | Source console script: one command per line, `name value` (text values in double quotes), `//` comments, other files can be pulled in with `exec <file>` | GSM sample, FireDaemon sample |
| created by game on first run? | No: "The file is not included by default and must be created." (whether a first run creates one: UNVERIFIED) | FireDaemon KB |
| when executed | only if the start line has `+exec server.cfg` (FireDaemon). LinuxGSM instead passes `+servercfgfile server.cfg` (the wiki lists `servercfgfile`, default "server.cfg", with no description) | FireDaemon KB; https://raw.githubusercontent.com/GameServerManagers/LinuxGSM/master/lgsm/config-default/config-lgsm/l4d2server/_default.cfg |

Launch-line items people confuse with server.cfg (for the launch-args step, not settings): `-game left4dead2 -port 27015 +map c1m1_hotel +maxplayers 4 +exec server.cfg -console -secure` (FireDaemon); `+sv_gametypes coop` (esagames); LinuxGSM default `-game left4dead2 -strictportbind -ip ${ip} -port ${port} +clientport ${clientport} +map ${defaultmap} +servercfgfile ${servercfg} -maxplayers ${maxplayers}` with port 27015, clientport 27005, defaultmap c5m1_waterfront, maxplayers 8. `maxplayers` is a console command in the wiki ("Change the maximum number of players allowed on this server"), not a stored convar. Vanilla caps: 4 in Co-op, 8 in Versus (FireDaemon).

### Minimal sensible server.cfg (every key appears in the tables below)
```
hostname "My L4D2 Server"
rcon_password "CHANGE-ME"
sv_password ""
sv_lan 0
sv_region 255
sv_allow_lobby_connect_only 0
mp_gamemode coop
z_difficulty Normal
sv_logfile 1
sv_logbans 1
sv_voiceenable 1
sv_alltalk 0
```
Basis: GSM sample (hostname, rcon_password, sv_password, sv_lan, sv_logfile, sv_logbans, sv_voiceenable, sv_alltalk), FireDaemon sample (sv_region, sv_allow_lobby_connect_only 0), xgamingserver (mp_gamemode coop, z_difficulty Normal), pingperfect (sv_region 255 = world).

### Commands (not variables) that appear in sample server.cfg files
`exec banned_user.cfg` and `exec banned_ip.cfg` (reload ban lists; wiki: `writeid` writes banned_user.cfg, `writeip` writes banned_ip.cfg), `heartbeat` ("Force heartbeat of master servers"), `setmaster add <addr>` (pingperfect sample, relevance for the current build UNVERIFIED), `mp_disable_autokick <userid>` (wiki: a command, "Prevents a userid from being auto-kicked"; sample configs list it like a setting, so do not offer it as a setting), `map <name> [mode]`, `changelevel`, `kickid`, `banid`, `status`, `users` (wiki, all type cmd).

## Settings
Defaults come from WIKI (2021, v2.2.2.1). "bool" fields take 0 or 1. Where the wiki gives no description and the meaning is inferred from the name, the row says so and the key is also on the UNVERIFIED list.

### General

| key | label | description | group | default | type | allowed values | source URL |
|---|---|---|---|---|---|---|---|
| hostname | Server name | The name shown in the server browser and in the server list. | General | (empty; wiki's default cell says 'step', which looks like a page error) | string | any text | WIKI |
| sv_password | Join password | Password players must enter to join. Leave empty so anyone can join. | General | (empty) | string | any text; empty = no password | WIKI (wiki flags: nf, prot, norecord) |
| rcon_password | Remote console (RCON) password | Password for remote admin access to the server console. Choose a long one; anyone with it controls the server. | General | (empty) | string | any text (UNVERIFIED whether empty disables RCON) | WIKI (wiki flags: norecord) |
| sv_contact | Contact email | Email address of the person running the server, shown to people looking at the server details. | General | (empty) | string | any text | WIKI (wiki flags: nf) |
| sv_tags | Server tags | Extra labels shown to players browsing for servers. Separate several with commas. | General | (empty) | string | comma-separated words | WIKI (wiki flags: nf) |
| motd_enabled | Show message of the day | Show the message of the day to players when they connect. | General | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv) |
| motdfile | Message-of-the-day file | Name of the file that holds the message of the day. | General | motd.txt | string | file name | WIKI (wiki flags: sv) |
| mapcyclefile | Map cycle file | Name of the text file that lists the maps the server rotates through. | General | mapcycle.txt | string | file name, e.g. mapcycle.txt | WIKI (wiki flags: sv, launcher); https://raw.githubusercontent.com/GameServerManagers/Game-Server-Configs/main/l4d2/server.cfg (sample uses mapcycle.txt) |

### Joining and server listing

| key | label | description | group | default | type | allowed values | source URL |
|---|---|---|---|---|---|---|---|
| sv_lan | LAN-only server | Makes the server visible only on the local network (no Steam listing, no authentication). Keep 0 for a server friends join over the internet. | Joining | 0 | bool | 0 = internet, 1 = LAN only | WIKI |
| sv_allow_lobby_connect_only | Only allow joining through a lobby | When 1, players can only join through matchmaking (a lobby) and cannot connect directly. Set 0 so friends can join from the server browser or the console connect command. | Joining | 1 | bool | 0 = direct join allowed, 1 = lobby only | WIKI; https://pingperfect.com/knowledgebase/534/Left-for-Dead-2-LFD2--Server-Configuration.html ("0 allows browser joins") |
| sv_region | Server region | The part of the world the server reports itself in, used for finding nearby servers. | Joining | -1 | enum | -1 = not set (default); 0 US East coast; 1 US West coast; 2 South America; 3 Europe; 4 Asia; 5 Australia; 6 Middle East; 7 Africa; 255 Rest of the world | WIKI; codes: https://developer.valvesoftware.com/wiki/Master_Server_Query_Protocol (region codes table; UNVERIFIED that sv_region uses exactly this table, but sv_region 3 = Europe in https://kb.firedaemon.com/support/solutions/articles/4000086975-left-4-dead-2-source and 0..255 range in the pingperfect page) |
| sv_steamgroup | Steam group ID | ID of a Steam group the server belongs to. The ID is on the group admin profile page on the Steam community site. | Joining | (empty) | string (group ID number) | a Steam group ID; empty = none | WIKI (wiki flags: nf) |
| sv_steamgroup_exclusive | Steam group priority | If set, only members of the Steam group can join while the server is empty; anyone can join once it has players. | Joining | 0 | bool | 0 = off, 1 = on | WIKI |
| sv_search_key | Lobby search key | When a lobby looks for a dedicated server, it only matches servers that have the same key. Use it to reserve a server for your own lobbies. | Joining | (empty) | string | any text | WIKI |
| sv_gametypes | Allowed game modes | Comma-separated list of the game modes the server accepts. The wiki says it is usually set on the launch command line. | Joining | coop,realism,survival,versus,scavenge,dash,holdout,shootzones | string (comma list) | values in the default: coop, realism, survival, versus, scavenge, dash, holdout, shootzones; a Steam forum config also puts mutation in it (sv_gametypes "coop, versus, mutation") | WIKI (wiki flags: sv); https://steamcommunity.com/app/550/discussions/0/1621724904371115456 |
| sv_visiblemaxplayers | Player slots shown to browsers | Overrides the maximum number of players reported to people looking at the server list. -1 shows the real value. | Joining | -1 | int | -1 or a number | WIKI |
| sv_reservation_timeout | Lobby reservation time | Seconds a lobby reservation on the server lasts before it expires. | Joining | 120 | int (seconds) | number | WIKI |

### Game rules

| key | label | description | group | default | type | allowed values | source URL |
|---|---|---|---|---|---|---|---|
| mp_gamemode | Game mode | The game mode being played. The wiki notes it changes when you use the map command (map <name> <mode>), so a lobby or map change can override it. | Gameplay | coop | enum | coop, realism, versus, survival, scavenge, holdout (wiki list); a hosting guide also lists mutation modes (UNVERIFIED which names) | WIKI (wiki flags: rep, cl, launcher); https://xgamingserver.com/docs/left-4-dead-2/server-config ; override note: https://steamcommunity.com/app/550/discussions/0/1621724904371115456 |
| z_difficulty | Difficulty | Difficulty of the current game. | Gameplay | Normal | enum | Easy; Normal; Hard (called Advanced in-game per one guide); Impossible (called Expert) | WIKI (wiki flags: rep, cl); labels: https://xgamingserver.com/docs/left-4-dead-2/server-config |
| survivor_limit | Maximum survivors | Maximum number of survivors. Vanilla co-op servers are limited to 4 players (8 in Versus); more needs add-ons. | Gameplay | 4 | int | number | WIKI (wiki flags: sv, nf, launcher); cap: https://kb.firedaemon.com/support/solutions/articles/4000086975-left-4-dead-2-source |
| z_max_player_zombies | Max player-controlled infected | Maximum number of humans who can play the infected team at the same time. | Gameplay | 4 | int | number | WIKI (wiki flags: rep, cl, launcher) |
| sv_alltalk | All-talk voice | Players hear every other player over voice chat, with no team restriction. | Gameplay | 0 | bool | 0 = team only, 1 = everyone hears everyone | WIKI (wiki flags: sv, nf) |
| sv_voiceenable | Voice chat | Turns in-game voice chat on or off for the whole server. | Gameplay | 1 | bool | 0 = off, 1 = on | WIKI (wiki flags: a, nf); meaning: https://pingperfect.com/knowledgebase/534/Left-for-Dead-2-LFD2--Server-Configuration.html (wiki description empty) |
| sv_cheats | Allow cheat commands | Allows cheat commands on the server. Keep 0 on a server other people play on. | Gameplay | 0 | bool | 0 = off, 1 = on | WIKI (wiki flags: nf, rep) |
| sv_pausable | Allow pausing | Whether the game can be paused on the server. | Gameplay | 0 | bool | 0 = no, 1 = yes | WIKI |
| sv_rescue_disabled | Disable rescuing dead survivors | If 1, dead survivors can never be rescued. | Gameplay | 0 | bool | 0 = rescue possible, 1 = never | WIKI (wiki flags: sv, launcher) |
| sv_permawipe | Restart campaign on wipe | If set, the campaign restarts fully if the survivors die. | Gameplay | 0 | bool | 0 = off, 1 = on | WIKI (wiki flags: sv, cheat) |
| survivor_respawn_with_guns | Weapons after being rescued | What a rescued survivor carries. | Gameplay | 1 | enum | 0 = just a pistol; 1 = a downgrade of the last primary weapon; 2 = the last primary weapon | WIKI (wiki flags: sv, launcher) |
| survivor_max_incapacitated_count | Times you can be downed | How many times a survivor can be incapacitated instead of killed between health kits. | Difficulty | 2 | int | number | WIKI (wiki flags: sv, cheat) |
| survivor_revive_health | Health after revive | Temporary health a survivor has after being revived. | Difficulty | 30 | int (HP) | number | WIKI (wiki flags: sv, cheat) |
| first_aid_heal_percent | First-aid kit heal amount | Fraction of the injuries a first-aid kit heals (0.8 = 80 percent). | Difficulty | 0.8 | float | 0 to 1 | WIKI (wiki flags: sv, cheat) |
| pain_pills_health_threshold | Pills usable below this health | Pain pills cannot be used unless the survivor total health is less than this. | Difficulty | 99 | int | number | WIKI (wiki flags: cheat, rep, cl) |
| survivor_friendly_fire_factor_easy | Friendly fire, Easy | Friendly-fire damage multiplier on Easy. (Wiki gives no description; meaning inferred from the name, UNVERIFIED.) | Difficulty | 0 | float | 0 = no friendly-fire damage | WIKI (wiki flags: sv, cheat) |
| survivor_friendly_fire_factor_normal | Friendly fire, Normal | Same, for Normal. (Inferred from the name, UNVERIFIED.) | Difficulty | 0.1 | float | 0 = none | WIKI (wiki flags: sv, cheat) |
| survivor_friendly_fire_factor_hard | Friendly fire, Hard (Advanced) | Same, for Hard. (Inferred from the name, UNVERIFIED.) | Difficulty | 0.3 | float | 0 = none | WIKI (wiki flags: sv, cheat) |
| survivor_friendly_fire_factor_expert | Friendly fire, Impossible (Expert) | Same, for Impossible. (Inferred from the name, UNVERIFIED.) | Difficulty | 0.5 | float | 0 = none | WIKI (wiki flags: sv, cheat) |
| z_health | Common infected health | Maximum health of a common zombie. | Difficulty | 50 | int (HP) | number | WIKI (wiki flags: sv, cheat) |
| z_tank_health | Tank health | Maximum health of a Tank. | Difficulty | 4000 | int (HP) | number | WIKI (wiki flags: sv, cheat) |
| z_witch_health | Witch health | Maximum health of a Witch. | Difficulty | 1000 | int (HP) | number | WIKI (wiki flags: sv, cheat) |

### Director (zombie spawning and pacing)

| key | label | description | group | default | type | allowed values | source URL |
|---|---|---|---|---|---|---|---|
| z_common_limit | Common infected at once | How many common infected can exist at the same time. Higher is harder and costs CPU. | Director | 30 | int | number | WIKI (wiki flags: sv, cheat) |
| z_mob_spawn_min_size | Horde size, minimum | Smallest size of a normal horde. (Wiki gives no description; inferred from the name, UNVERIFIED.) | Director | 10 | int | number | WIKI (wiki flags: sv, cheat) |
| z_mob_spawn_max_size | Horde size, maximum | Largest size of a normal horde. (Inferred from the name, UNVERIFIED.) | Director | 30 | int | number | WIKI (wiki flags: sv, cheat) |
| z_special_spawn_interval | Special infected spawn interval | Interval for spawning special infected. | Director | 45 | int (units not stated; seconds UNVERIFIED) | number | WIKI (wiki flags: sv, cheat) |
| director_no_bosses | No Tanks or Witches | Disables boss spawns (Tank and Witch). | Director | 0 | bool | 0 = bosses on, 1 = off | WIKI (wiki flags: sv, cheat) |
| director_no_mobs | No hordes | Disables horde rushes. | Director | 0 | bool | 0 = hordes on, 1 = off | WIKI (wiki flags: sv, cheat) |
| director_no_specials | No special infected | Disables special-infected spawns. | Director | 0 | bool | 0 = on, 1 = off | WIKI (wiki flags: sv, cheat) |
| director_no_survivor_bots | No survivor bots | Disables filling the survivor team with bots. | Director | 0 | bool | 0 = fill with bots, 1 = no bots | WIKI (wiki flags: sv, cheat) |
| director_panic_forever | Endless panic events | Panic events (horde waves) never end. | Director | 0 | bool | 0 = off, 1 = on | WIKI (wiki flags: sv, cheat) |
| director_allow_infected_bots | Infected bots fill empty slots | Allow bots to fill empty slots on the infected team. | Director | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, launcher) |
| director_afk_timeout | Idle kick to spectator | Humans idle longer than this many seconds are forced to spectator mode. | Director | 45 | int (seconds) | number | WIKI (wiki flags: sv, nf, launcher) |
| director_min_start_players | Players needed to start | Freezes players until this number of players has joined, then starts the mission. | Director | 1 | int | number | WIKI (wiki flags: sv, launcher) |
| director_ready_duration | Ready-up time | If not zero, the survivor team has this much time to get ready before starting out. | Director | 60 | int (seconds) | 0 = off | WIKI (wiki flags: sv, cheat) |
| director_unfreeze_time | Unfreeze time | Seconds to wait to unfreeze a team after the first player has connected. | Director | 55 | int (seconds) | number | WIKI (wiki flags: sv, cheat) |
| director_transition_timeout | Map transition wait | Seconds to wait for survivors to cross a changelevel. | Director | 120 | int (seconds) | number | WIKI (wiki flags: sv, cheat) |
| director_convert_pills | Pills become kits (non-Expert) | Allows pills to be converted to health kits or defibrillators in non-Expert difficulties. (Wiki marks this description as community-written.) | Director | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, cheat) |
| director_vs_convert_pills | Pills become kits (Versus) | What fraction of pain pills are converted to health kits in versus mode. | Director | 0.5 | float | 0 to 1 | WIKI (wiki flags: sv, launcher) |
| director_survival_setup_time | Survival setup time | Time limit to set up before the round auto-starts. | Director | 0 | int (seconds) | 0 = none | WIKI (wiki flags: sv, launcher) |
| allow_all_bot_survivor_team | Allow all-bot survivor team | Allow a survivor team of nothing but bots. A human player is still needed for the game to be active. | Director | 0 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, launcher) |
| sb_all_bot_game | Allow server of only bots | Allow a server of nothing but bots. | Director | 0 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, cheat) |
| sb_allow_leading | Survivor bots may lead | If not zero, survivor bots can take the lead and will not always wait behind the lead human player. | Director | 0 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, launcher) |
| sb_friendlyfire | Survivor bot friendly fire | Should survivor-bot bullets hurt other survivors? (Wiki marks this description as community-written.) | Director | 0 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, cheat) |

### Versus, Survival and Scavenge

| key | label | description | group | default | type | allowed values | source URL |
|---|---|---|---|---|---|---|---|
| versus_force_start_time | Versus force-start time | Starts a Versus game after this long even if survivors are still inside the safe room. | Versus | 90 | int (seconds) | number | WIKI (wiki flags: sv, launcher) |
| versus_tank_chance | Versus Tank chance | Chance of a Tank spawning within a regular versus map. | Versus | 0.75 | float | 0 to 1 | WIKI (wiki flags: sv, cheat) |
| versus_witch_chance | Versus Witch chance | Chance of a Witch spawning within a regular versus map. | Versus | 0.75 | float | 0 to 1 | WIKI (wiki flags: sv, cheat) |
| versus_winning_team_goes_last | Losing team plays survivors first | In versus mode, the team that is losing plays as survivors first. | Versus | 1 | bool | 0 = off, 1 = on | WIKI (wiki flags: sv, cheat) |
| survival_max_specials | Survival: max specials alive | Maximum number of special infected alive at one time in Survival. | Survival | 8 | int | number | WIKI (wiki flags: sv, cheat, launcher) |
| survival_horde_stage_interval | Survival: seconds between hordes | Seconds between horde attacks in Survival. | Survival | 60 | int (seconds) | number | WIKI (wiki flags: sv, cheat, launcher) |
| survival_special_spawn_interval | Survival: special spawn interval | Seconds between special-infected spawn waves in Survival. | Survival | 20 | int (seconds) | number | WIKI (wiki flags: sv, cheat, launcher) |
| survival_tank_stage_interval | Survival: seconds between Tanks | Seconds between Tank attacks in Survival. | Survival | 80 | int (seconds) | number | WIKI (wiki flags: sv, cheat, launcher) |
| survival_round_restart_delay | Survival: restart delay | After a loss, the round restarts after this many seconds. | Survival | 15 | int (seconds) | number | WIKI (wiki flags: sv, cheat, launcher) |
| scavenge_round_setup_time | Scavenge: setup time | Setup time before a Scavenge round starts. | Scavenge | 45 | int (seconds) | number | WIKI (wiki flags: sv, cheat, launcher) |
| scavenge_round_initial_time | Scavenge: starting clock | Initial time on the clock when a Scavenge round starts. | Scavenge | 90 | int (seconds) | number | WIKI (wiki flags: sv, cheat, launcher) |
| scavenge_score_bonus_time | Scavenge: time per can | Time added to the clock every time a team scores. | Scavenge | 20 | int (seconds) | number | WIKI (wiki flags: sv, cheat, launcher) |
| scavenge_item_respawn_delay | Scavenge: can respawn delay | After being destroyed, time until a scavenge item respawns. | Scavenge | 20 | int (seconds) | number | WIKI (wiki flags: sv, cheat) |

### Voting

| key | label | description | group | default | type | allowed values | source URL |
|---|---|---|---|---|---|---|---|
| sv_allow_votes | Allow voting | Allow players to hold votes. (Wiki: requires mod support first.) | Voting | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, launcher) |
| sv_vote_issue_kick_allowed | Votes to kick players | Can people hold votes to kick players from the server? | Voting | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, launcher) |
| sv_vote_kick_ban_duration | Vote-kick ban length | How long a kick vote bans someone from the server. | Voting | 5 | int (minutes) | number | WIKI (wiki flags: sv, launcher) |
| sv_vote_issue_change_difficulty_allowed | Votes to change difficulty | Can people hold votes to change the difficulty? | Voting | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, launcher) |
| sv_vote_issue_change_map_now_allowed | Votes to change map now | Can people hold votes to immediately change the map? | Voting | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, launcher) |
| sv_vote_issue_change_map_later_allowed | Votes to change map after round | Can people hold votes to change the map after this round? | Voting | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, launcher) |
| sv_vote_issue_change_mission_allowed | Votes to change campaign | Can people hold votes to change missions (campaigns)? | Voting | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, launcher) |
| sv_vote_issue_restart_game_allowed | Votes to restart | Can people hold votes to restart the game? | Voting | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: sv, launcher) |
| sv_vote_creation_timer | Time between votes (per player) | How often someone can individually call a vote. | Voting | 180 | int (seconds) | number | WIKI (wiki flags: sv, cheat, rep) |
| sv_vote_failure_timer | Cooldown after failed vote | A vote that fails cannot be re-submitted for this long. | Voting | 0 | int (seconds) | number | WIKI (wiki flags: sv, launcher) |
| sv_vote_plr_map_limit | Failed votes per map | Number of failed votes a user can call per map. | Voting | 3 | int | number | WIKI (wiki flags: sv, cheat, rep) |
| sv_vote_timer_duration | Vote length | How long voting on an issue stays open. | Voting | 15 | int (seconds) | number | WIKI (wiki flags: sv, launcher) |
| sv_vote_command_delay | Delay before a passed vote acts | How long after a vote passes until the action happens. | Voting | 2 | int (seconds, UNVERIFIED) | number | WIKI (wiki flags: sv, launcher) |
| sv_vote_show_caller | Show who called the vote | Show the name of the person who called the vote. | Voting | 1 | bool | 1 = yes, 0 = no | WIKI (wiki flags: sv, cheat, rep) |

### Files and consistency

| key | label | description | group | default | type | allowed values | source URL |
|---|---|---|---|---|---|---|---|
| sv_consistency | File consistency check | Whether the server enforces file consistency for critical files. A Steam forum user reports that 0 lets players join without the host custom add-ons (anecdotal). | Files | 1 | bool | 0 = off, 1 = on | WIKI (wiki flags: rep); https://steamcommunity.com/app/550/discussions/0/1621724904371115456 (anecdote); web search summary of a second forum thread, not opened |
| sv_pure_kick_clients | Kick on file mismatch | If 1, the server kicks clients with mismatching files; otherwise it only warns the client. | Files | 1 | bool | 0 = warn, 1 = kick | WIKI |
| sv_allowdownload | Allow downloads | Allow clients to download files from the server. | Files | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: launcher) |
| sv_allowupload | Allow uploads | Allow clients to upload customization files. | Files | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: launcher) |
| sv_downloadurl | Fast download URL | Web address from which clients can download missing files (a fast-download web server). | Files | (empty) | string | URL; empty = none | WIKI (wiki flags: rep) |
| net_maxfilesize | Max upload size | Maximum allowed file size for uploading, in MB. | Files | 16 | int (MB) | number | WIKI (wiki flags: launcher) |

### Network and performance

| key | label | description | group | default | type | allowed values | source URL |
|---|---|---|---|---|---|---|---|
| sv_minrate | Minimum client rate | Minimum bandwidth rate allowed on the server. 0 means unlimited. | Network | 5000 | int (bytes/s) | 0 = unlimited | WIKI (wiki flags: rep) |
| sv_maxrate | Maximum client rate | Maximum bandwidth rate allowed on the server. 0 means unlimited. | Network | 0 | int (bytes/s) | 0 = unlimited | WIKI (wiki flags: rep) |
| sv_minupdaterate | Minimum update rate | Minimum updates per second the server allows. | Network | 10 | int | number | WIKI (wiki flags: rep, launcher) |
| sv_maxupdaterate | Maximum update rate | Maximum updates per second the server allows. | Network | 60 | int | number | WIKI (wiki flags: rep, launcher) |
| sv_mincmdrate | Minimum command rate | Sets the minimum value for cl_cmdrate (packets clients send per second). 0 means unlimited. | Network | 0 | int | 0 = unlimited | WIKI (wiki flags: rep) |
| sv_maxcmdrate | Maximum command rate | If sv_mincmdrate is above 0, this sets the maximum value for cl_cmdrate. | Network | 40 | int | number | WIKI (wiki flags: rep) |
| sv_client_min_interp_ratio | Minimum interp ratio | Limits cl_interp_ratio for connected clients. -1 lets clients set it to anything; any other value is the minimum. | Network | 1 | float | -1 or number | WIKI (wiki flags: rep, launcher) |
| sv_client_max_interp_ratio | Maximum interp ratio | Limits cl_interp_ratio for connected clients. No effect while sv_client_min_interp_ratio is -1. | Network | 5 | float | number | WIKI (wiki flags: rep, launcher) |
| sv_client_predict | Force client prediction | Can force cl_predict for connected clients. | Network | -1 | int | -1 = clients choose; 0 = force 0; 1 = force 1 | WIKI (wiki flags: rep, launcher) |
| sv_client_cmdrate_difference | cmdrate vs updaterate gap | cl_cmdrate is moved to within this many units of cl_updaterate before it is limited to the min/max command rate. | Network | 20 | int | number | WIKI (wiki flags: rep, launcher) |
| sv_timeout | Client timeout | Seconds without a message from a client before the client is dropped. | Network | 65 | int (seconds) | number | WIKI (wiki flags: launcher) |
| sv_unlag | Lag compensation | Enables player lag compensation. | Network | 1 | bool | 0 = off, 1 = on | WIKI (wiki flags: sv, launcher) |
| sv_maxunlag | Max lag compensation | Maximum lag compensation in seconds. | Network | 1.0 | float (seconds) | number | WIKI (wiki flags: sv, launcher) |
| sv_alternateticks | Simulate every other tick | If set, the server only simulates entities on even-numbered ticks. | Network | 0 | bool | 0 = off, 1 = on | WIKI (wiki flags: sp) |
| sv_hibernate_when_empty | Sleep when empty | Puts the server into an extremely low CPU usage mode when no clients are connected. | Network | 1 | bool | 0 = off, 1 = on | WIKI (wiki flags: launcher) |
| sv_hibernate_postgame_delay | Delay before sleeping | Seconds to wait after the final client leaves before hibernating. | Network | 5 | int (seconds) | number | WIKI (wiki flags: launcher) |
| sv_max_queries_sec | Max queries per IP | Maximum server-list queries per second answered for one IP address. | Network | 3.0 | float | number | WIKI (wiki flags: launcher) |
| sv_max_queries_sec_global | Max queries total | Maximum server-list queries per second answered from anywhere. | Network | 60 | int | number | WIKI (wiki flags: launcher) |
| fps_max | Frame rate limit | Frame rate limiter. | Network | 300 | int | number | WIKI |

### Logging, bans and remote console protection

| key | label | description | group | default | type | allowed values | source URL |
|---|---|---|---|---|---|---|---|
| sv_logfile | Write log file | Log server information in the log file. | Logging | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: a) |
| sv_log_onefile | One log file | Log server information to only one file. | Logging | 0 | bool | 0 = no, 1 = yes | WIKI (wiki flags: a) |
| sv_logbans | Log bans | Log server bans in the server logs. | Logging | 0 | bool | 0 = no, 1 = yes | WIKI (wiki flags: a) |
| sv_logecho | Echo log to console | Echo log information to the console. | Logging | 1 | bool | 0 = no, 1 = yes | WIKI (wiki flags: a) |
| sv_logflush | Flush log every write | Flush the log file to disk on each write (slow). | Logging | 0 | bool | 0 = no, 1 = yes | WIKI (wiki flags: a) |
| sv_logsdir | Log folder | Folder in the game directory where server logs are stored. | Logging | logs | string | folder name | WIKI (wiki flags: a) |
| sv_rcon_log | Log RCON use | Enable or disable RCON logging. | Logging | 1 | bool | 0 = no, 1 = yes | WIKI |
| sv_rcon_banpenalty | RCON ban length | Minutes to ban users who fail RCON authentication. | Security | 0 | int (minutes) | number | WIKI |
| sv_rcon_maxfailures | RCON max failures | Maximum times a user can fail RCON authentication before being banned. | Security | 10 | int | number | WIKI |
| sv_rcon_minfailures | RCON failures in window | Times a user can fail RCON authentication within sv_rcon_minfailuretime before being banned. | Security | 5 | int | number | WIKI |
| sv_rcon_minfailuretime | RCON failure window | Seconds over which failed RCON authentications are tracked. | Security | 30 | int (seconds) | number | WIKI |
| sv_filterban | IP filter mode | Sets packet filtering by IP mode. | Security | 1 | int | number (meaning of values UNVERIFIED) | WIKI (wiki flags: launcher) |
| sv_banid_enabled | Allow banid command | Whether the server supports the banid command. | Security | 1 | bool | 0 = no, 1 = yes | WIKI |

### SourceTV (spectator broadcast)

| key | label | description | group | default | type | allowed values | source URL |
|---|---|---|---|---|---|---|---|
| tv_enable | Enable SourceTV | Activates SourceTV on the server. | SourceTV | 0 | bool | 0 = off, 1 = on | WIKI (wiki flags: nf, launcher) |
| tv_name | SourceTV name | SourceTV host name. | SourceTV | SourceTV | string | any text | WIKI (wiki flags: launcher) |
| tv_port | SourceTV port | Port SourceTV listens on. | SourceTV | 27020 | int | port number | WIKI |
| tv_password | SourceTV password | SourceTV password for all clients. | SourceTV | (empty) | string | any text | WIKI (wiki flags: nf, prot, norecord, launcher) |
| tv_maxclients | SourceTV max viewers | Maximum client number on the SourceTV server. | SourceTV | 128 | int | number | WIKI (wiki flags: launcher) |
| tv_delay | SourceTV delay | SourceTV broadcast delay in seconds. | SourceTV | 30 | int (seconds) | number | WIKI (wiki flags: sv, launcher) |
| tv_autorecord | SourceTV auto-record | Automatically records all games as SourceTV demos. | SourceTV | 0 | bool | 0 = no, 1 = yes | WIKI (wiki flags: launcher) |

## Notes on how settings behave (sourced)
- `mp_gamemode`: the wiki says "changed using map command, eg: map mapname versus". A Steam forum answerer (thread above) advises against setting `mp_gamemode` in server.cfg because mp_ cvars are "only based on the current game" and a map change or lobby can override them, and uses `sv_gametypes` instead. Hosting guides disagree on which one to set (xgamingserver sets mp_gamemode coop, esagames passes +sv_gametypes coop, pingperfect sets both). Most defensible approach from the sources: set both to the same mode and give the mode on the start-map line (the Steam thread suggests adding the mode after the map command). Not tested on a real server.
- Mutation modes: `map <map> <mode name>`, for example `map c1m1_hotel mutation13` (Mutation Gametype page). A mutation is a game-mode definition file `left4dead2/modes/<modename>.txt`; its `maxplayers` is documented there as allowed values 1, 4 and 8.
- `sv_allow_lobby_connect_only` defaults to 1 on the wiki; FireDaemon, pingperfect and the Steam thread configs set 0 so the server browser and the console connect command work.
- Cheat-flagged cvars: the wiki flags most Director and difficulty-tuning cvars as "cheat". Mutation mode files can set cheat-flagged cvars (Mutation Gametype page), but the sources do not say whether lines in server.cfg are applied for them. Plugin-based servers use `sm_cvar` (pingperfect and Steam thread samples), which needs SourceMod and Metamod.
- `sv_hibernate_when_empty` (default 1) puts an empty server into a very low CPU mode (wiki).

## UNVERIFIED
1. The shipped default `server.cfg`, or anything in a fresh `left4dead2/cfg/` of the dedicated server: no source found; only "server.cfg is not included by default" (FireDaemon).
2. Whether defaults and descriptions from the 2021 wiki dump (v2.2.2.1) still match the 2026 server build.
3. `hostname` default: the wiki default cell reads "step", almost certainly a page error. The real default name is not documented in any source opened.
4. Whether an empty `rcon_password` disables RCON.
5. Whether `sv_region` accepts exactly the Master Server Query Protocol region codes (0-7, 255) and what -1 does. Only indirect support: FireDaemon sample comment "sv_region 3 (Europe)", pingperfect "from 0 (east coast) to 255 (world)", and the codes table of the query-protocol page.
6. Extra `mp_gamemode` / `sv_gametypes` values for mutations (names, and whether "mutation" is accepted in sv_gametypes). A Steam forum config uses sv_gametypes "coop, versus, mutation"; pingperfect lists `teamversus` and `teamscavenge` for sv_gametypes; xgamingserver lists `mutation*`. None confirmed on a real server.
7. In-game names for z_difficulty values (Hard = Advanced, Impossible = Expert) come from one hosting guide (xgamingserver). Whether z_difficulty is case-sensitive: the wiki capitalises Easy, Normal, Hard, Impossible; pingperfect shows lowercase.
8. Meaning of the wiki flag strings ("sv", "cheat", "rep", "nf", "a", "launcher", "cl", "prot", "norecord").
9. Inferred from names, no wiki description: survivor_friendly_fire_factor_easy/normal/hard/expert, z_mob_spawn_min_size, z_mob_spawn_max_size; also the units of z_special_spawn_interval.
10. Meaning of `sv_filterban` values.
11. Whether SourceTV (`tv_*`) works on the L4D2 dedicated server; only the wiki listing (tv_port 27020) supports it.
12. How `sv_consistency` and `sv_pure_kick_clients` interact; only the wiki descriptions and one forum anecdote exist.
13. Whether `survivor_limit` above 4 or `maxplayers` above the vanilla caps works without add-ons (esagames says a mutation, SourceMod or plugin is needed, and mentions `sv_maxplayers`, which is NOT in the wiki list).
14. Whether the Director, Difficulty, Versus, Survival and Scavenge tuning rows take effect from server.cfg (cheat-flag note above).
15. Where `srcds.exe` sits relative to the `left4dead2` folder: FireDaemon lists it at `C:\L4D2\left4dead2\srcds.exe` with config at `C:\L4D2\left4dead2\left4dead2\cfg\server.cfg`, which looks like a double `left4dead2` folder. Other sources only say `left4dead2/cfg/server.cfg`. Confirm on a real install (belongs to the template step).

## Settings found but not confidently explainable (no description on the wiki or any other source opened; wiki defaults in brackets)
`servercfgfile` (server.cfg), `sv_hosting_lobby` (0), `survivor_incap_health` (300), `survivor_ledge_grab_health` (300), `survivor_revive_duration` (5), `z_wandering_density` (0.03), `z_mega_mob_size` (50), `z_mega_mob_spawn_min_interval` (420), `z_mega_mob_spawn_max_interval` (900), `z_mob_spawn_min_interval_normal` (90), `z_mob_spawn_max_interval_normal` (180) and the _easy/_hard/_expert variants, `z_hunter_limit` / `z_smoker_limit` / `z_boomer_limit` / `z_charger_limit` / `z_jockey_limit` / `z_spitter_limit` (each 1), `z_minion_limit` (3), `z_versus_*_limit` (each 1), `director_tank_min_interval` (350), `director_tank_max_interval` (500), `director_special_respawn_interval` (45), `director_special_initial_spawn_delay_min` (30) and `_max` (60), `versus_round_restarttimer` (15), `sv_maxclientframes` (128), `sv_forcepreload` ("Force server side preloading.", 0, purpose unclear), `sv_clockcorrection_msecs` (60). The names suggest tuning knobs but none was confirmed, so the panel should omit them or show them without a description.

## Cvars deliberately left out
Debug and client-only ones (`cl_*`, `r_*`, `snd_*`), other-game leftovers present in the shared wiki dump (for example `mp_buytime`, `mp_startmoney`, `mp_c4timer` and the capture-point `mp_cap*` settings, which look like they belong to other Source games; whether they do anything in L4D2 is UNVERIFIED), per-special physics tuning (`hunter_*`, `tank_*`, `nb_*`, `sb_*` internals), `survival_*` / `scavenge_*` / `versus_*` knobs beyond the ones listed, `director_*` density and debug values, and `sv_` internals the wiki marks as cheat/testing (`sv_showhitboxes`, `sv_zoo_*`, `sv_benchmark_*`, ...).

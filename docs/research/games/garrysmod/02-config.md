# Garry's Mod dedicated server: config files and settings (researched 2026-10-15)

Game: Garry's Mod, store app 4000, dedicated server app 4020 (public branch; wiki mentions server version 2026.09.22). No server was installed or run: everything below comes from documents and source files read on 2026-10-15.

## Source key (what each short name means)
| short | URL / what it is | trust |
|---|---|---|
| GM-CV | https://wiki.facepunch.com/gmod/ConVars_In_Garrysmod (official Garry's Mod wiki; saved as raw/convars.txt). Has a short hand-written table (sv_allowcslua, sv_kickerrornum, gmod_maxammo...) and a big "cvarlist dump" section | The dump says itself: "updated very infrequently, and is most likely out of date". It was captured from a running game that was not a clean dedicated server (e.g. it lists `sv_cheats` as 1, `gmod_maxammo` as 9999 where the hand-written table says 0), so **defaults taken from the dump are marked "(dump)" and are less reliable than names/descriptions** |
| VDC-CCL | https://developer.valvesoftware.com/wiki/Console_Command_List (Valve Developer Community; read via web.archive.org snapshot of 2024, because the live site shows a bot check; saved as raw2/v_Console_Command_List.txt). Generic Source-engine defaults, not Garry's Mod specific | good for names and meaning, defaults are generic Source (they differ from Garry's Mod in places, shown below) |
| VDC-SDS | https://developer.valvesoftware.com/wiki/Source_Dedicated_Server (archive snapshot, page last edited 2024-10-02) | official Valve doc |
| GM-DL | https://wiki.facepunch.com/gmod/Downloading_a_Dedicated_Server (the page I fetched is titled "Downloading and Hosting a Dedicated Server"; raw/dl.txt) | official |
| GM-SC | https://wiki.facepunch.com/gmod/Serving_Content | official |
| GM-GSLT | https://wiki.facepunch.com/gmod/Steam_Game_Server_Accounts | official |
| GM-WS | https://wiki.facepunch.com/gmod/Workshop_for_Dedicated_Servers | official |
| GH | https://github.com/Facepunch/garrysmod (Facepunch's public repo of the game's shipped Lua and cfg files, master branch read 2026-10-15; local copies in raw2/gh/) | the game's own shipped files = ground truth for what ships and for Lua-created convars |
| GM-SOR | https://wiki.facepunch.com/gmod/Server_Operator_Rules | official rules (last updated 2023-10-09) |

## 1. Config files and folders

All paths are relative to the server install folder (the one that holds `srcds.exe`), i.e. `garrysmod\` is the game folder.

| file | location | format | does the game create it? | source |
|---|---|---|---|---|
| server.cfg | `garrysmod/cfg/server.cfg` | Source console script: one command per line, `name value` (strings in quotes), `//` starts a comment | The game ships it, **empty** (the repo copy is just two blank lines). The user edits it. VDC-SDS: "Edit the main configuration file: `<game>/cfg/server.cfg`. Change the hostname line..." | GH https://github.com/Facepunch/garrysmod/blob/master/garrysmod/cfg/server.cfg ; VDC-SDS |
| autoexec.cfg | `garrysmod/cfg/autoexec.cfg` | same | NOT shipped (not in the repo's cfg folder); the user creates it. The shipped startup script `cfg/valve.rc` runs it: `exec autoexec.cfg` ("run a user script file if present"), after `exec network.cfg` and before `stuffcmds` (which applies the command-line `+commands`) and `exec skill.cfg` | GH https://github.com/Facepunch/garrysmod/blob/master/garrysmod/cfg/valve.rc |
| mapcycle.txt | shipped at `garrysmod/cfg/mapcycle.txt`; the convar `mapcyclefile` names the file (generic default `mapcycle.txt`). Valve says to place it in the game's root folder | one map name per line (Valve) | The shipped file contains only comments saying: "It is empty because Garry's Mod does not use mapcycle.txt. It only exists so that mapcycle.txt from mountable games (Portal 2) does not load and spam the console with errors". So Garry's Mod itself does not cycle maps from it. See UNVERIFIED U1 | GH https://github.com/Facepunch/garrysmod/blob/master/garrysmod/cfg/mapcycle.txt ; VDC-CCL (mapcyclefile) ; https://developer.valvesoftware.com/wiki/Mapcycle.txt |
| users.txt | `garrysmod/settings/users.txt` | Valve KeyValues: `"Users" { "superadmin" { "name" "STEAM_0:x:y" } "admin" { ... } }` | Shipped with both sections empty (example lines are commented out: `//"garry" "STEAM_0:1:7099"`). Its own comment: "You can use this file to add people as admins on your server. Add them to the relevant section. If you're a Lua coder you can add your own sections and use them in your script by doing pl:IsUserGroup( "admin" ) etc" | GH https://github.com/Facepunch/garrysmod/blob/master/garrysmod/settings/users.txt |
| srcds_workshop_ids.txt | `garrysmod/cfg/srcds_workshop_ids.txt` | KeyValues list of `"wsid"` numbers | Not created by the game ("needs to be created manually"); "new with version 2026.09.22 or newer". Details in 04-mods.md | GM-WS |
| banned_user.cfg / banned_ip.cfg | game folder / cfg (location UNVERIFIED, see U6) | console commands (`banid ...`, `banip ...`) | Written by the commands `writeid` / `writeip` ("Writes a list of permanently-banned user IDs to banned_user.cfg", "Save the ban list to banned_ip.cfg") | VDC-CCL |
| skill.cfg, skill1-3.cfg, skill_manifest.cfg | `garrysmod/cfg/` | console script with `sk_*` values (NPC health/damage for the Half-Life 2 style NPCs). `valve.rc` runs `exec skill.cfg`. | shipped | GH https://github.com/Facepunch/garrysmod/blob/master/garrysmod/cfg/skill.cfg . Not documented per key here (hundreds of NPC damage numbers; see section 9) |
| game.cfg, network.cfg, listenserver.cfg | `garrysmod/cfg/` | console script | shipped. `network.cfg` contents: `cl_cmdrate 66`, `cl_updaterate 66`, `sv_rollangle 0`, `mp_flashlight 1`, `sv_noclipspeed 5`, `sv_noclipaccelerate 5` (so **`mp_flashlight` ends up 1** at startup, not 0 as the wiki dump shows). `listenserver.cfg` is the same empty file as server.cfg (same blob hash in GitHub) | GH https://github.com/Facepunch/garrysmod/blob/master/garrysmod/cfg/network.cfg |
| persist/<map>_<name>.txt | `garrysmod/data/persist/` | Garry's Mod data file | Written by Sandbox when `sbox_persist` is set (file name `persist/<map>_<sbox_persist value>.txt`, relative to the data folder) | GH gamemodes/sandbox/gamemode/persistence.lua lines 38/46 |

Config load order facts that are documented: Valve `valve.rc` order (network.cfg, autoexec.cfg, stuffcmds = command-line +commands, skill.cfg) from the GH file above. When `server.cfg` is executed (at every map load or only once) is not documented in any source I could open: UNVERIFIED U2.

### Not settable in server.cfg (launch arguments / one-time)
These are in GM-DL as command-line items; the panel's launch-argument step owns them: `+maxplayers N`, `+gamemode <folder>`, `+map <map>`, `+sv_setsteamaccount <token>` (GSLT, never store), `+host_workshop_collection <id>`, `-p2p`, `-console`. `hostport` ("Host game server port", generic default 27015) and `ip` ("Overrides IP for multihomed hosts") are listed by VDC-CCL as convars, but Valve's SDS page says the port is changed "using -port on startup".

## 2. Settings table: server identity and access (server.cfg)

Columns: key | label | description | group | default | type | allowed values | source URL. "dump" = taken from the GM-CV cvarlist dump; "generic" = from VDC-CCL (generic Source).

| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `hostname` | Server name | The name shown in the in-game server browser. | Identity | empty ("0" in both lists = unset) | string | any text | VDC-CCL "Hostname for server"; GM-CV dump |
| `sv_password` | Join password | Players must type this to join. Leave empty for a public server. | Access | empty | string | any text, no spaces recommended (UNVERIFIED rule, only that quoting is standard) | VDC-CCL "Server password for entry into multiplayer games"; GM-CV dump |
| `rcon_password` | Remote console password | Password for remote administration (RCON). If it is empty, RCON logins are refused. Changing it while the server runs disconnects every logged-in RCON session. | Admin | empty | string | any text | VDC-CCL "remote console password"; https://developer.valvesoftware.com/wiki/Rcon (Source RCON Protocol, archive snapshot; raw2/v_Rcon.txt): "If the rcon_password cvar is not set, or if it is set to empty string, all SERVERDATA_AUTH requests will be refused"; "If the rcon_password cvar is written to for any reason, the server will immediately close all authenticated RCON connections" |
| `sv_location` | Country flag | Two-letter country code that picks the flag next to your server in the browser (gb, us, de ... or `eu`). Must be honest: lying about it is against the server rules. | Identity | empty | string | an ISO 3166-1 alpha-2 code matching a file in materials/flags16 (max length 5 chars) | GM-DL "Location flag"; GM-SOR |
| `sv_region` | Server region | World region the server reports to the master list. | Identity | -1 (world/not set; meaning of the other numbers UNVERIFIED U3) | int | -1 and other region codes (U3) | VDC-CCL; GM-CV dump "The region of the world to report this server in." |
| `sv_steamgroup` | Steam group | Ties the server to a Steam group (group ID from the group's admin profile page). | Identity | empty | string/number | a Steam group ID | GM-CV dump "The ID of the steam group that this server belongs to. You can find your group's ID on the admin profile page in the steam community." |
| `sv_contact` | Contact email | Contact email of the server admin (shown in server info). | Identity | empty | string | email | VDC-CCL "Contact email for server sysop" |
| `sv_lan` | LAN only | 1 = a LAN server: no Steam authentication, not listed on the internet, only local-type addresses. Keep 0 for internet play. | Access | 0 | bool (0/1) | 0, 1 | VDC-CCL "Server is a lan server ( no heartbeat, no authentication, no non-class C addresses...)"; GM-CV dump |
| `hide_server` | Hide from server list | 1 hides the server from the in-game browser (players can still join by IP). | Access | 0 | bool | 0, 1 | GM-DL "Hiding Your Server"; GM-GSLT |
| `sv_visiblemaxplayers` | Shown player limit | Overrides the max player count shown to people browsing. -1 = show the real value. | Identity | -1 | int | -1 or a number | VDC-CCL; GM-CV dump |
| `sv_gamename_override` | Gamemode name shown | If not empty, replaces the gamemode name the server reports to Steam. | Identity | empty | string | any text | GM-CV dump "If not empty, overrides the gamemode name reported by the server to Steam." |
| `sv_loadingurl` | Loading screen web page | Web page players see while joining. Must start with `http://` or `https://`. | Identity | empty | string (URL) | http/https URL | GM-CV dump "URL to show to clients while joining the server. Must start with http:// or https://" |
| `sv_timeout` | Idle disconnect time | Seconds without any message from a player before they are dropped. | Network | 180 (dump); generic Source list says 65 | int, seconds | number | GM-CV dump; VDC-CCL |
| `sv_timeout_signon` | Connecting timeout | Same, but for players still connecting. | Network | 300 (dump) | int, seconds | number | GM-CV dump |
| `sv_pausable` | Players can pause | Whether the server can be paused. | Gameplay | 0 | bool | 0, 1 | VDC-CCL "Is the server pausable."; GM-CV dump |
| `sv_cheats` | Allow cheat commands | Lets players use cheat commands. Keep 0 on a normal server. | Gameplay | 0 (VDC-CCL; the GM-CV dump shows 1, see U4) | bool | 0, 1 | VDC-CCL "Allow cheats on server if set to 1" |
| `sv_namechange_cooldown_seconds` | Name change cooldown | Seconds a player must wait before changing their name again. | Gameplay | 20 (dump) | int | number | GM-CV dump |

## 3. Players, voice, movement and physics (server.cfg)

| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `sv_alltalk` | Everyone hears everyone | 1 = all players hear every other player's voice, no team limits. | Voice | 0 | bool | 0, 1 | VDC-CCL; GM-CV dump "Players can hear all other players, no team restrictions"; also read by the base gamemode (GH gamemodes/base/gamemode/player.lua line 745) |
| `sv_voiceenable` | Voice chat on | Turns voice chat on or off for the server. | Voice | 1 | bool | 0, 1 | VDC-CCL; GM-CV dump |
| `sv_use_steam_voice` | Use Steam voice | Use Steam Voice instead of the old voice codec. | Voice | 1 (dump) | bool | 0, 1 | GM-CV dump "Enable/disable using Steam Voice instead of the old voice codec (if enabled, voice_inputfromfile will no longer function)." |
| `sv_allow_voice_from_file` | Allow voice from file | Whether players may feed voice chat from a recorded file (`voice_inputfromfile`). | Voice | 0 (dump) | bool | 0, 1 | GM-CV dump |
| `sv_gravity` | Gravity | World gravity. | Physics | 600 (both lists) | float | number | VDC-CCL; GM-CV dump |
| `sv_friction` | Ground friction | How much players slide on the ground. | Physics | 8 (dump); generic Source says 4 | float | number | GM-CV dump; VDC-CCL |
| `sv_accelerate` | Ground acceleration | How fast players speed up on the ground. | Physics | 10 | float | number | VDC-CCL; GM-CV dump |
| `sv_airaccelerate` | Air acceleration | How much players can steer in the air. | Physics | 10 | float | number | VDC-CCL; GM-CV dump |
| `sv_maxspeed` | Max player speed | Upper limit on player speed. | Physics | 10000 (dump); generic Source says 320 | float | number | GM-CV dump; VDC-CCL |
| `sv_stopspeed` | Minimum stopping speed | Minimum stopping speed when on the ground. | Physics | 10 (dump); generic says 100 | float | number | GM-CV dump "Minimum stopping speed when on ground."; VDC-CCL |
| `sv_maxvelocity` | Max object speed | Maximum speed any flying/moving object may reach per axis. | Physics | 3500 | float | number | VDC-CCL; GM-CV dump |
| `sv_noclipspeed` | Noclip speed | Speed multiplier while flying with noclip. | Gameplay | 5 | float | number | VDC-CCL; GM-CV dump; set to 5 by shipped network.cfg |
| `sv_footsteps` | Footstep sounds | Play footstep sounds for players. | Gameplay | 1 | bool | 0, 1 | VDC-CCL |
| `sv_playerpickupallowed` | Allow USE pickup | Players can pick up things with the Use key. | Gameplay | 1 (dump) | bool | 0, 1 | GM-CV dump |
| `sv_allowcslua` | Allow client-side Lua | Lets players run their own Lua on their own game (lua_openscript_cl, lua_run_cl; i.e. cheat scripts). Set 0 to block. "This will override any gamemode setting!" | Security | 1 | bool | 0, 1 | GM-CV https://wiki.facepunch.com/gmod/ConVars_In_Garrysmod (hand-written table: default 1, "Allow clients on the server to run lua_openscript_cl and lua_run_cl"; dump: "Allow clients to run clientside addons. This will override any gamemode setting!") |
| `sv_kickerrornum` | Kick on Lua errors | Kick a player when they have caused this many client-side Lua errors. 0 = never. | Security | 0 | int | 0 or a number | GM-CV (both the table and the dump) |
| `sv_crazyphysics_defuse` | Fix crazy physics | Resets objects whose physics go wild. Turning this off "should be a LAST RESORT" and "will allow people to crash sandbox mode using various physics exploits". | Physics | 1 (dump) | bool | 0, 1 | GM-CV dump |
| `sv_crazyphysics_remove` | Remove crazy physics objects | Removes entities whose physics go wild (same warning as above). | Physics | 1 (dump) | bool | 0, 1 | GM-CV dump |
| `sv_crazyphysics_warning` | Log crazy physics | Print warnings to the console when crazy-physics entities are found. | Physics | 1 (dump) | bool | 0, 1 | GM-CV dump |
| `sv_crazyphysics_vehicles` | Check vehicles | Crazy-physics detection for vehicles. | Physics | 1 (dump) | bool | 0, 1 | GM-CV dump |
| `sv_crazyphysics_wheels` | Check vehicle wheels | Crazy-physics detection for vehicle wheels. | Physics | 0 (dump) | bool | 0, 1 | GM-CV dump |
| `physgun_limited` | Limit the physics gun | 1 = physics gun can only pick up certain things (props and ragdolls). The Sandbox gamemode creates this convar itself as `physgun_limited` default 0: "Prevent the Physics Gun from picking up certain map entities." | Gameplay | 0 | bool | 0, 1 | GH gamemodes/sandbox/gamemode/shared.lua line 45; GM-CV |
| `physgun_maxrange` | Physics gun range | Maximum reach of the physics gun. | Gameplay | 4096 (dump) | float | number | GM-CV dump |
| `gmod_maxammo` | Max ammo | If above 0, overrides max ammo carried for all ammo types; 0 = each ammo type's own max. | Gameplay | 0 (GM-CV hand-written table; dump says 9999 - see U4) | int | 0 or a number | GM-CV |
| `gmod_suit` | HL2 suit power | Non-zero turns on Half-Life 2 aux suit power (sprint/oxygen bar). | Gameplay | 0 | bool | 0, non-zero | GM-CV |
| `gmod_sneak_attack` | HL2 sneak attack | 0 disables Half-Life 2's instant-kill headshot on NPCs that have not seen the player. | Gameplay | 1 | bool | 0, 1 | GM-CV |
| `mp_falldamage` | Fall damage | Enables "realistic" fall damage. | Gameplay | 0 | int/bool | 0, 1 (other values UNVERIFIED) | GM-CV dump "Enables realistic fall damage."; VDC-CCL |
| `mp_flashlight` | Allow flashlight | Allow the flashlight in multiplayer. | Gameplay | 1 (set by shipped network.cfg; Valve generic list says 0) | bool | 0, 1 | GH cfg/network.cfg; VDC-CCL "If 1, enable Flashlight on multiplayer mode." |
| `mp_footsteps` | Footsteps (mp) | Footstep sounds, multiplayer setting. | Gameplay | 1 | bool | 0, 1 | VDC-CCL; GM-CV dump (U5: relation to sv_footsteps not documented) |
| `mp_weaponstay` | Weapons stay | Players cannot pick up a weapon they already carry. | Gameplay | 0 | bool | 0, 1 | GM-CV dump "Disallows players to pick up weapons that they already carry in their inventory." |
| `mp_weaponrespawn` | Map weapons respawn | Makes map-spawned weapons/items (HL2:DM style) respawn after pickup. | Gameplay | 0 | bool | 0, 1 | GM-CV table: "Enables Half-Life 2 Deathmatch pickup respawn event. Weapons and other pickups will respawn after being picked up..." |
| `sv_hl2mp_weapon_respawn_time` | Weapon respawn time | Seconds before a picked-up map weapon returns (needs mp_weaponrespawn). | Gameplay | 20 (dump) | int | number | GM-CV dump + table text |
| `sv_hl2mp_item_respawn_time` | Item respawn time | Seconds before a picked-up item returns (needs mp_weaponrespawn). | Gameplay | 30 (dump) | int | number | GM-CV dump + table text |
| `mp_forcecamera` | Restrict spectating | Restricts spectator modes for dead players. | Gameplay | 0 | int | 0 and above (exact values UNVERIFIED) | VDC-CCL; GM-CV dump |
| `mp_show_voice_icons` | Voice icons overhead | Shows the speaker icon above players who are talking. | Voice | 1 | bool | 0, 1 | GM-CV dump |
| `mp_teamplay` | Team play | Turns team play on. | Gameplay | 0 | bool | 0, 1 | GM-CV dump / VDC-CCL (no help text; U5) |
| `mp_timelimit` | Map time limit | Game time per map in minutes. 0 = no limit. Whether Garry's Mod gamemodes act on it is UNVERIFIED (U1). | Gameplay | 0 | int, minutes | number | VDC-CCL "Game time per map in minutes."; GM-CV dump |
| `mp_mapcycle_empty_timeout_seconds` | Cycle empty map | If non-zero, the server moves to the next map after being empty on the current map for this many seconds. | Gameplay | 0 | int, seconds | number | GM-CV dump |
| `mp_decals` | Decal limit | Sets the decal (bullet hole/paint) limit for multiplayer. | Performance | 4096 (dump); generic says 200 | int | number | GM-CV dump; VDC-CCL |
| `decalfrequency` | Spray delay | Delay between player sprays (seconds - unit UNVERIFIED). | Gameplay | 10 | int | number | VDC-CCL (no help text); GM-CV dump |
| `g_ragdoll_maxcount` | Max ragdolls | Maximum number of ragdoll "gibs" allowed at the same time. | Performance | 32 (dump) | int | number | GM-CV dump |
| `ai_serverragdolls` | Solid ragdolls | 1 = NPC ragdolls are solid by default. | Gameplay | 0 (dump) | bool | 0, 1 | GM-CV dump |
| `gmod_physiterations` | Constraint solver passes | Extra physics solver passes make constraint systems (welds, ropes) more stable but cost CPU. Created by the game's constraint module. | Physics | 4 | int | number | GH lua/includes/modules/constraint.lua line 8 ("Additional solver iterations make constraint systems more stable.") |
| `host_timescale` | Game speed | Scale the game clock (1 = normal). | Gameplay | 1 (dump) | float | number | GM-CV dump "Prescale the clock by this amount." (cheat-level in some engines: U5) |
| `phys_timescale` | Physics speed | Scales physics time. | Physics | 1 (dump) | float | number | GM-CV dump |

## 4. Network, performance, downloads (server.cfg)

| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `sv_maxrate` | Max bandwidth per player | Maximum bandwidth rate allowed per player; 0 = unlimited. | Network | 0 | int | 0 or a number | VDC-CCL; GM-CV dump |
| `sv_minrate` | Min bandwidth per player | Minimum bandwidth rate allowed; 0 = unlimited. | Network | 3500 (dump); generic says 0 | int | number | GM-CV dump; VDC-CCL |
| `sv_maxupdaterate` | Max updates per second | Maximum updates per second the server will send each player. | Network | 66 (dump); generic says 60 | int | number | GM-CV dump; VDC-CCL |
| `sv_minupdaterate` | Min updates per second | Minimum updates per second the server will allow. | Network | 10 | int | number | VDC-CCL; GM-CV dump |
| `sv_maxcmdrate` | Max command rate | Upper bound for each client's `cl_cmdrate` (applies if sv_mincmdrate is above 0). | Network | 66 (dump) | int | number | GM-CV dump |
| `sv_mincmdrate` | Min command rate | Lower bound for client `cl_cmdrate`; 0 = unlimited. | Network | 10 (dump) | int | number | GM-CV dump |
| `sv_maxunlag` | Max lag compensation | Maximum lag compensation in seconds. | Network | 1 | float, seconds | number | VDC-CCL; GM-CV dump |
| `net_maxfilesize` | Max upload size | Maximum file size (MB) players may upload (e.g. sprays) / server may transfer. | Network | 16 | int, MB | number | VDC-CCL "Max filesize server can transfer to clients."; GM-CV dump "Maximum allowed file size for uploading in MB" (the two lists describe the direction differently: U7) |
| `sv_allowupload` | Allow player uploads | Players may upload customization files (sprays). | Downloads | 1 | bool | 0, 1 | VDC-CCL; GM-CV dump |
| `sv_allowdownload` | Allow file downloads from server | Lets players download files straight from the game server. GM-SC: this "ServerDL" path is "incredibly slow at 64kb/s", "obsolete", and "opens you up to exploits" (modified clients can spam file requests). | Downloads | 1 | bool | 0, 1 | VDC-CCL; GM-CV dump; GM-SC https://wiki.facepunch.com/gmod/Serving_Content |
| `sv_downloadurl` | Fast download web address | Address of a web server holding your custom files so players download from it instead of the game server (FastDL). Tries `<url>/<file>.bz2` first, then `<url>/<file>`. Files must also be marked in Lua with resource.AddFile. | Downloads | empty | string (URL) | e.g. `https://mycoolwebsite.com` | GM-SC "FastDL"; VDC-CCL "Allows Downloading of files via a webserver"; GM-CV dump "Location from which clients can download missing files" |
| `sv_pure` | File consistency check | (Command in the dump: "Show user data.") No settable meaning documented here. | Security | - | - | - | GM-CV dump lists `sv_pure_kick_clients` (1: "the server will kick clients with mismatching files. Otherwise, it will issue a warning to the client.") and `sv_pure_*`; see U8 for how sv_pure is actually enabled |
| `host_workshop_collection` | Workshop collection | Steam Workshop collection ID downloaded on startup. Normally given as a launch argument. | Workshop | empty | number | collection ID | GM-CV dump "Set to a Steam Workshop Collection ID, and the dedicated server will download Workshop items from given collection on start up."; GM-WS |
| `host_workshop_autoupdate` | Update Workshop items on start | 0 stops addons auto-updating at server start (protects against malicious updates; a stale map can stop players joining). | Workshop | 1 | bool | 0, 1 | GM-WS; GM-CV dump |
| `fps_max` | Server frame cap | Frame rate limiter. | Performance | 150 (dump); VDC generic says 300 | int | number | GM-CV dump; VDC-CCL (meaning on a dedicated server UNVERIFIED U5; the tick rate is a launch argument `-tickrate`, not a server.cfg setting) |
| `sv_memlimit` | Restart when empty and big | If set, whenever the server is empty and it uses more than this many MB of memory, it exits (so a restart script can bring it back). | Performance | 0 (off) | int, MB | 0 or a number | GM-CV dump |
| `sv_hibernate_think` | Think while empty | Forces the server to keep processing even when hibernating (empty). | Performance | 0 | bool | 0, 1 | GM-CV dump |
| `sv_hibernate_drop_bots` | Kick bots on hibernate | Kicks bots when the server goes to sleep. | Performance | 1 | bool | 0, 1 | GM-CV dump |
| `sv_nomap_timeout` | Close if no map | Seconds with no map running before the dedicated server closes; 0 or below = off. | Performance | 0 | int, seconds | number | GM-CV dump |
| `sv_max_connects_sec` | Connection rate limit | Maximum connection attempts per second answered per IP address. | Security | 2 (dump) | int | number | GM-CV dump |
| `sv_max_queries_sec` | Query rate limit | Maximum server-browser queries per second answered per IP. | Security | 3 (dump) | int | number | GM-CV dump |
| `sv_max_queries_sec_global` | Global query limit | Maximum queries per second from anywhere. | Security | 3000 (dump) | int | number | GM-CV dump |
| `sv_quota_stringcmdspersecond` | Console-command rate limit | How many string commands per second a player may send; 0 = none allowed. | Security | 256 (dump) | int | number | GM-CV dump |
| `sv_quota_stringcmd_kick` | Kick for command spam | If above 0, kick a player who exceeds the rate above. | Security | 0 | int | number | GM-CV dump |
| `sv_maxvoicepacketsperframe` | Voice packet limit | Voice packets accepted per player per tick before the player is kicked; 0 = off. Higher values make the server easier to attack with floods. | Security | 48 (dump) | int | number | GM-CV dump |
| `sv_max_userinfo` | Max userinfo | Max userinfo convars a player may send. | Security | 4096 (dump) | int | number | GM-CV dump |
| `sv_enableoldqueries` | Old-style queries | Support for old (HL1) server queries. | Network | 0 | bool | 0, 1 | GM-CV dump |
| `sv_master_share_game_socket` | Master server socket | Use the game's socket to talk to the master server; if 0 it opens a socket on `-steamport` + 1. | Network | 1 | bool | 0, 1 | GM-CV dump |

## 5. Remote console (RCON) protection and bans

| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `sv_rcon_maxfailures` | RCON max failures | Max times someone can fail RCON login before being banned. | RCON | 10 | int | number | VDC-CCL; GM-CV dump |
| `sv_rcon_minfailures` | RCON failures window count | Failed logins within `sv_rcon_minfailuretime` before a ban. | RCON | 5 | int | number | VDC-CCL; GM-CV dump |
| `sv_rcon_minfailuretime` | RCON failure window | Seconds over which failed logins are counted. | RCON | 30 | int, seconds | number | VDC-CCL; GM-CV dump |
| `sv_rcon_banpenalty` | RCON ban length | Minutes to ban someone who fails RCON login. | RCON | 0 | int, minutes | number (0 behavior UNVERIFIED U5) | VDC-CCL; GM-CV dump |
| `sv_rcon_whitelist_address` | RCON never-ban address | A failed login from this address never causes a ban (e.g. `127.0.0.1`). Useful so the panel itself can't lock itself out. | RCON | empty | string (IP) | IP address | GM-CV dump "When set, rcon failed authentications will never ban this address, e.g. '127.0.0.1'" |
| `sv_rcon_log` | RCON logging | Enable/disable RCON logging. | RCON | 1 | bool | 0, 1 | GM-CV dump |
| `sv_rcon_maxpacketsize` | RCON max packet | Max bytes in an RCON command packet. | RCON | 1024 | int | number | GM-CV dump |
| `sv_rcon_maxpacketbans` | RCON oversize-packet ban | Ban IPs that send packets bigger than the size above. | RCON | 1 | bool | 0, 1 | GM-CV dump |
| `sv_filterban` | IP filter mode | Set packet filtering by IP mode (1 = banned IPs are blocked from connecting at network level). | Bans | 1 | int | 0, 1 (exact modes UNVERIFIED U5) | VDC-CCL "Set packet filtering by IP mode"; GM-CV dump |
| `sv_logbans` | Log bans | Write bans to the server log. | Bans | 0 | bool | 0, 1 | VDC-CCL; GM-CV dump |

Related commands (not settings): `banid`, `banip`, `addip`, `removeip`, `removeid`, `listid`, `listip`, `writeid`, `writeip`, `kick`, `kickid`, `kickall` (VDC-CCL / GM-CV dump).

## 6. Logging

| key | label | description | group | default | type | allowed values | source |
|---|---|---|---|---|---|---|---|
| `log` | Server logging | Command (not a variable): "Enables logging to file, console, and udp < on | off >" (GM-CV dump); "Enables standard log file <0/1>" (VDC-CCL). | Logging | - | on/off | VDC-CCL; GM-CV dump |
| `sv_logfile` | Write log file | Log server information in the log file. | Logging | 1 | bool | 0, 1 | GM-CV dump |
| `sv_logecho` | Echo log to console | Echo log information to the console. | Logging | 1 | bool | 0, 1 | GM-CV dump |
| `sv_log_onefile` | One log file | Log to a single file only. | Logging | 0 | bool | 0, 1 | GM-CV dump |
| `sv_logsdir` | Log folder | Folder in the game directory where logs are stored. Must start with `logs/`. | Logging | empty (-> logs) | string | `logs/...` | GM-CV dump |
| `sv_logfilecompress` | Compress logs | Gzip-compress the log file and rename it to .log.gz on close. | Logging | 0 | bool | 0, 1 | GM-CV dump |
| `sv_logflush` | Flush log each write | Writes to disk on each line (slow). | Logging | 0 | bool | 0, 1 | GM-CV dump |
| `sv_log_client_errors` | Log player Lua errors | Above 0: log clients' Lua errors to `clientside_errors.txt`. 0: console only. Below 0: do not even print them. | Logging | 1 | int | negative, 0, positive | GM-CV dump |
| `sv_logblocks` | Log blocked queries | Log when a query is blocked (can make very large log files). | Logging | 0 | bool | 0, 1 | GM-CV dump |

## 7. Sandbox gamemode rules (sbox_*)

The `sbox_*` variables are not created in the Lua files in the GH repo (they are created by the engine/game binary), so **names, defaults and descriptions come only from the GM-CV dump** (flags there: server-side "a" (admin/archive), "nf", "rep" (replicated), "lua_server"). Per-player limits apply to each single player, not the whole server. Source for every row: https://wiki.facepunch.com/gmod/ConVars_In_Garrysmod (cvarlist dump). Their use is confirmed in the shipped Lua for `sbox_godmode`, `sbox_playershurtplayers` (GH gamemodes/sandbox/gamemode/init.lua lines 87/91), `sbox_persist` (persistence.lua) and `sbox_search_maxresults`.

| key | label | description | group | default | type | allowed values |
|---|---|---|---|---|---|---|
| `sbox_maxprops` | Max props per player | Maximum props one player can create. | Sandbox limits | 500 | int | 0 and up |
| `sbox_maxragdolls` | Max ragdolls per player | Maximum ragdolls one player can create. | Sandbox limits | 10 | int | number |
| `sbox_maxnpcs` | Max NPCs per player | Maximum NPCs one player can create. | Sandbox limits | 5 | int | number |
| `sbox_maxvehicles` | Max vehicles per player | Maximum vehicles one player can create. | Sandbox limits | 5 | int | number |
| `sbox_maxeffects` | Max effects per player | Maximum effect props one player can create. | Sandbox limits | 200 | int | number |
| `sbox_maxsents` | Max entities per player | Maximum scripted entities (spawnmenu "Entities") one player can create. | Sandbox limits | 50 | int | number |
| `sbox_maxballoons` | Max balloons | Maximum balloons one player can create. | Sandbox limits | 50 | int | number |
| `sbox_maxbuttons` | Max buttons | Maximum buttons one player can create. | Sandbox limits | 25 | int | number |
| `sbox_maxcameras` | Max cameras | Maximum cameras one player can create. | Sandbox limits | 10 | int | number |
| `sbox_maxdynamite` | Max dynamite | Maximum dynamites one player can create. | Sandbox limits | 10 | int | number |
| `sbox_maxemitters` | Max emitters | Maximum emitters one player can create. | Sandbox limits | 5 | int | number |
| `sbox_maxhoverballs` | Max hoverballs | Maximum hoverballs one player can create. | Sandbox limits | 15 | int | number |
| `sbox_maxlamps` | Max lamps | Maximum lamps one player can create. | Sandbox limits | 5 | int | number |
| `sbox_maxlights` | Max lights | Maximum lights one player can create. | Sandbox limits | 10 | int | number |
| `sbox_maxthrusters` | Max thrusters | Maximum thrusters one player can create. | Sandbox limits | 50 | int | number |
| `sbox_maxwheels` | Max wheels | Maximum wheels one player can create. | Sandbox limits | 25 | int | number |
| `sbox_maxconstraints` | Max constraints | Maximum non-rope constraints (welds etc.) one player can create. | Sandbox limits | 2000 | int | number |
| `sbox_maxropeconstraints` | Max rope constraints | Maximum rope-based constraints one player can create. | Sandbox limits | 1000 | int | number |
| `sbox_godmode` | Everyone invincible | If enabled, all players are invincible. | Sandbox rules | 0 | bool | 0, 1 |
| `sbox_playershurtplayers` | Players can hurt players | If enabled, players can hurt each other (0 = no player-vs-player damage). | Sandbox rules | 1 | bool | 0, 1 |
| `sbox_noclip` | Allow noclip | If enabled, players can use noclip (fly through walls). | Sandbox rules | 1 | bool | 0, 1 |
| `sbox_weapons` | Spawn with HL2 weapons | If enabled, each player receives the default Half-Life 2 weapons on every spawn. | Sandbox rules | 0 | bool | 0, 1 |
| `sbox_bonemanip_misc` | Bone manipulation: other entities | If enabled, manipulating the bones of other entities (props) is allowed. | Sandbox rules | 0 | bool | 0, 1 |
| `sbox_bonemanip_npc` | Bone manipulation: NPCs | If enabled, manipulating NPC bones is allowed. | Sandbox rules | 0 | bool | 0, 1 |
| `sbox_bonemanip_player` | Bone manipulation: players | If enabled, manipulating player bones is allowed. | Sandbox rules | 0 | bool | 0, 1 |
| `sbox_persist` | Persistent props save name | If not empty, enables "Make Persistent" (right-click a prop while holding C) so props survive restarts. "Changing this convar will save existing persistent props, cleanup the whole map and load props from given file." Saved to `garrysmod/data/persist/<map>_<value>.txt`. Props marked persistent are protected from being removed by players (GH sandbox/gamemode/init.lua line 52). | Sandbox rules | empty (dump shows 0) | string | any name (letters/numbers; invalid file-name characters UNVERIFIED) |
| `toolmode_allow_<toolname>` | Allow a tool | Per-tool switch created for every Sandbox tool: set to 0 to stop players using that tool (e.g. `toolmode_allow_rope 0`). Flags: notify, replicated. Tool names are the folder/file names in `gamemodes/sandbox/entities/weapons/gmod_tool/stools/` (balloon, button, camera, dynamite, emitter, hoverball, lamp, light, thruster...). | Sandbox rules | 1 | bool | 0, 1 |
| `sbox_search_maxresults` | Spawnmenu search results | Used by the tool search (`GetConVarNumber("sbox_search_maxresults") / 32` results). Not in the wiki dump, so name only; meaning UNVERIFIED (U9). | Sandbox | UNVERIFIED | int | UNVERIFIED |

`toolmode_allow_<tool>` source: GH https://github.com/Facepunch/garrysmod/blob/master/garrysmod/gamemodes/sandbox/entities/weapons/gmod_tool/stool.lua line 37: `CreateConVar( "toolmode_allow_" .. mode, "1", { FCVAR_NOTIFY, FCVAR_REPLICATED }, "Set to 0 to disallow players being able to use the \"" .. mode .. "\" tool." )`.

## 8. Trouble in Terrorist Town (gamemode folder `terrortown`) - the other gamemode that ships with the game

The game ships three gamemode folders: `base`, `sandbox`, `terrortown` (GH https://github.com/Facepunch/garrysmod/tree/master/garrysmod/gamemodes). TTT's server settings are created in its Lua. Defaults below are the literal defaults in `CreateConVar` calls in GH `gamemodes/terrortown/gamemode/*.lua`; descriptions are plain-language readings of the code and the section comments in `init.lua` (the file has no help-text strings, so every description comes from the variable name + the code that reads it, not from a doc). Selected with `+gamemode terrortown`. Source for every row: https://github.com/Facepunch/garrysmod/blob/master/garrysmod/gamemodes/terrortown/gamemode/init.lua (and karma.lua / shared.lua where noted).

| key | label | description | group | default | type |
|---|---|---|---|---|---|
| `ttt_roundtime_minutes` | Round length | Minutes of the main round. (init.lua comment: "Round times") | TTT rounds | 10 | int, minutes |
| `ttt_preptime_seconds` | Prep time | Seconds of preparation before each round. | TTT rounds | 30 | int, seconds |
| `ttt_firstpreptime` | First prep time | Seconds of preparation before the first round after a map change. | TTT rounds | 60 | int, seconds |
| `ttt_posttime_seconds` | Post-round time | Seconds the end-of-round screen lasts before the next round. | TTT rounds | 30 | int, seconds |
| `ttt_round_limit` | Rounds per map | Number of rounds before the map changes (stored in `ttt_rounds_left`). | TTT rounds | 6 | int |
| `ttt_time_limit_minutes` | Map time limit | Total minutes per map before a map change. | TTT rounds | 75 | int, minutes |
| `ttt_minimum_players` | Minimum players | Players needed to start a round. | TTT rounds | 2 | int |
| `ttt_haste` | Haste mode | Haste mode on: each death adds time to the round. (shared.lua) | TTT rounds | 1 | bool |
| `ttt_haste_starting_minutes` | Haste starting time | Starting minutes of the round in haste mode. | TTT rounds | 5 | int, minutes |
| `ttt_haste_minutes_per_death` | Haste time per death | Minutes added per death in haste mode (code multiplies by 60). | TTT rounds | 0.5 | float, minutes |
| `ttt_postround_dm` | Deathmatch after round | Allow free-for-all fighting in the post-round period. | TTT rounds | 0 | bool |
| `ttt_spawn_wave_interval` | Respawn waves | Seconds between spawn waves; 0 = off (spawn immediately). | TTT rounds | 0 | float, seconds |
| `ttt_traitor_pct` | Traitor share | Fraction of players who are traitors: `floor(players * pct)` (0.25 = a quarter). | TTT roles | 0.25 | float 0-1 |
| `ttt_traitor_max` | Max traitors | Cap on the traitor count. | TTT roles | 32 | int |
| `ttt_detective_pct` | Detective share | Fraction of players who are detectives. | TTT roles | 0.13 | float 0-1 |
| `ttt_detective_max` | Max detectives | Cap on detectives. | TTT roles | 32 | int |
| `ttt_detective_min_players` | Players needed for detectives | No detectives if fewer players than this. | TTT roles | 8 | int |
| `ttt_detective_karma_min` | Detective karma minimum | Players below this karma are not picked as detective. | TTT roles | 600 | int |
| `ttt_sherlock_mode` | Detective mode | "DetectiveMode()" - detectives enabled. | TTT roles | 1 | bool |
| `ttt_credits_starting` | Traitor start credits | Equipment credits each traitor starts with. | TTT credits | 2 | int |
| `ttt_credits_award_pct` | Credit award threshold | Share of innocents dead that earns traitors a credit award (code: `pct >= ttt_credits_award_pct`). | TTT credits | 0.35 | float |
| `ttt_credits_award_size` | Credits per award | Credits given each time. | TTT credits | 1 | int |
| `ttt_credits_award_repeat` | Repeat awards | Whether the award repeats at each further threshold. | TTT credits | 1 | bool |
| `ttt_credits_detectivekill` | Credit for killing a detective | Credits traitors get for killing a detective. | TTT credits | 1 | int |
| `ttt_credits_alonebonus` | Last-traitor bonus | Extra credits when a traitor is alone. | TTT credits | 1 | int |
| `ttt_det_credits_starting` | Detective start credits | Credits detectives start with. | TTT credits | 1 | int |
| `ttt_det_credits_traitorkill` | Detective credit per traitor kill | Credits to detectives when a traitor is killed. | TTT credits | 0 | int |
| `ttt_det_credits_traitordead` | Detective credit per traitor death | Credits when a traitor dies. | TTT credits | 1 | int |
| `ttt_karma` | Karma system | Karma on/off (penalises team-killing; low karma deals less damage and can lead to kicks). | TTT karma | 1 | bool |
| `ttt_karma_strict` | Strict karma | (karma.lua; meaning UNVERIFIED U10) | TTT karma | 1 | bool |
| `ttt_karma_starting` / `ttt_karma_max` | Starting / max karma | Karma a player starts with / can reach. | TTT karma | 1000 / 1000 | int |
| `ttt_karma_kill_penalty` | Karma loss per team kill | Karma subtracted per wrongful kill. | TTT karma | 15 | int |
| `ttt_karma_round_increment` | Karma gain per round | Karma regained each round. | TTT karma | 5 | int |
| `ttt_karma_clean_bonus` | Clean-round bonus | Extra karma for a round without teamkills. | TTT karma | 30 | int |
| `ttt_karma_traitorkill_bonus` | Traitor kill bonus | Karma for killing a traitor. | TTT karma | 40 | int |
| `ttt_karma_persist` | Remember karma | Keep karma across map changes. | TTT karma | 0 | bool |
| `ttt_karma_low_autokick` | Auto-kick low karma | Kick players whose karma falls below `ttt_karma_low_amount`. | TTT karma | 1 | bool |
| `ttt_karma_low_amount` | Low karma line | Karma value that triggers the kick/ban. | TTT karma | 450 | int |
| `ttt_karma_low_ban` | Ban instead of kick | Ban low-karma players. | TTT karma | 1 | bool |
| `ttt_karma_low_ban_minutes` | Karma ban length | Minutes of the ban. | TTT karma | 60 | int, minutes |
| `ttt_idle_limit` | Idle kick | Seconds idle before a player is moved to spectator (client popup says the number; <=0 disables). | TTT players | 180 | int, seconds |
| `ttt_namechange_kick` / `ttt_namechange_bantime` | Name-change punishment | Kick players who change name during a round / ban minutes. | TTT players | 1 / 10 | bool / int |
| `ttt_voice_drain*` | Voice meter | `ttt_voice_drain` 0, `_normal` 0.2, `_admin` 0, `_recharge` 0.05: limited-talk meter. | TTT players | see left | bool / float |
| `ttt_limit_spectator_chat` / `ttt_limit_spectator_voice` | Limit spectators | Dead players can't talk to the living. | TTT players | 1 / 1 | bool |
| `ttt_locational_voice` | Locational voice | Voice is heard by distance. | TTT players | 0 | bool |
| `ttt_bots_are_spectators` | Bots as spectators | Bots start as spectators. | TTT players | 0 | bool |
| `ttt_lang_serverdefault` | Default language | Server default language. | TTT | english | string |
| `ttt_weapon_spawn_count` | Map weapon count | Number of weapons spawned on the map (ent_replace.lua); 0 = automatic (UNVERIFIED reading). | TTT items | 0 | int |
| `ttt_use_weapon_spawn_scripts` | Use weapon spawn scripts | | TTT items | 1 | bool |
| `ttt_ban_type` | Ban method | Default "autodetect"; (admin.lua) which ban system TTT's bans use. | TTT admin | autodetect | string |
| `ttt_damagelog_save` / `ttt_log_damage_for_console` | Damage log | Save damage log / show in console. | TTT admin | 0 / 1 | bool |
| `ttt_highlight_admins` | Highlight admins | Show admins in the scoreboard. | TTT admin | 1 | bool |

More TTT variables exist (crowbar, ragdoll carrying, spectator prop control, crosshair, ironsights, etc.) with defaults visible in the GH source; they are listed under "found but not documented" below.

## 9. Not documented here (by design)
- Hundreds of `sk_*` NPC health/damage values (shipped in `cfg/skill*.cfg`); `ai_*` and `g_debug_*` debug variables; client-only variables (`cl_*`, `gm_*`, `vgui_*`); `tv_*` SourceTV settings (SourceTV is off by default: `tv_enable 0`; port `tv_port` 27020 per GM-CV dump and VDC-SDS).
- Third-party gamemodes (DarkRP, Murder, Prop Hunt etc.) keep their own settings in Lua files inside their addon folders; the cached wiki pages for those names do not exist (404), so nothing is documented. See U11.

## UNVERIFIED list
- U1. Whether any shipped gamemode (sandbox / terrortown) uses `mapcycle.txt` or `mp_timelimit` to rotate maps. The shipped `mapcycle.txt` says Garry's Mod does not use it; TTT has its own `ttt_round_limit` / `ttt_time_limit_minutes` (those are in code, so verified for TTT). No source for map rotation in Sandbox. Do not offer a mapcycle editor as working until tested.
- U2. When `server.cfg` runs (once at start, or on every map change) - no source opened. Only the file's location and purpose (VDC-SDS) are verified.
- U3. Valid `sv_region` numbers (only the default -1 and the help text are documented).
- U4. True dedicated-server defaults for items where the two lists disagree: `sv_cheats` (VDC says 0; GM-CV dump 1), `gmod_maxammo` (GM-CV table 0; dump 9999), `sv_friction`, `sv_maxspeed`, `sv_stopspeed`, `sv_timeout`, `sv_minrate`, `sv_maxupdaterate`, `fps_max`, `mp_decals`. The panel should show the field as empty ("game default") rather than writing these.
- U5. Exact meaning/units of: `decalfrequency`, `mp_teamplay`, `mp_footsteps` vs `sv_footsteps`, `mp_forcecamera` values, `mp_falldamage` values beyond 0/1, `sv_filterban` modes, `sv_rcon_banpenalty` 0, `host_timescale` cheat status, `fps_max` on a dedicated server. No help text in either source.
- U6. Location/load behavior of `banned_user.cfg` / `banned_ip.cfg` in Garry's Mod.
- U7. Direction of `net_maxfilesize` (upload vs transfer to clients; VDC and GM-CV word it differently).
- U8. How `sv_pure` is switched on (only the `sv_pure_*` sub-variables are in the dump).
- U9. `sbox_search_maxresults`: default and meaning (used in tool search code only).
- U10. `ttt_karma_strict` meaning, and the other uncommented TTT variables listed below.
- U11. Settings for DarkRP, Murder, Prop Hunt (no valid wiki pages found at the guessed names: the page names 404'd).
- U12. `motdfile` / `motdfile_text` (listed in the dump as "The MOTD file to load." / "The text-only MOTD file...") - default file name and whether Garry's Mod shows an MOTD at all are not documented; the task mentioned "motd" but no shipped `motd.txt` is in the GH repo.
- U13. Value rules for `sv_password` / `hostname` (quoting, length, special characters).
- U14. Whether `sv_tags` exists/works in this game (not in either list; not documented).
- U15. The `sv_location` allowed list beyond "files in materials/flags16" (flag file list not opened).

## Settings found but not confidently explained
`sv_pure` (command only), `sv_alternateticks`, `sv_allow_color_correction`, `sv_stressbots`, `sv_lagcompensateself`, `sv_clockcorrection_msecs`, `sv_parallel_packentities` / `sv_parallel_sendsnapshot`, `sv_cacheencodedents`, `sv_lowedict_action` / `sv_lowedict_threshold` (text exists: "0 - no action, 1 - warn to log file, 2 - attempt to restart the game, 3 - restart the map, 4 - go to the next map in the map cycle"; edict-limit tuning is too advanced for a form), `gmod_mcore_test` (the wiki says "don't go around enabling it"), `gmod_uncache_test` / `gmod_unload_test` ("Unstable. Use at your own risk"), `lua_strict`, `lua_networkvar_bytespertick` (256: "controls how many bytes are networked each tick"), `ttt_ragdoll_*`, `ttt_crowbar_*`, `ttt_spec_prop_*`, `ttt_karma_ratio`, `ttt_karma_traitordmg_ratio`, `ttt_karma_clean_half`, `ttt_killer_dna_*`, `ttt_dyingshot`, `ttt_weapon_carrying*`, `ttt_prop_carrying_force`.

## Suggested panel scope (for the implementer)
A sensible first catalog: Identity (hostname, sv_password, rcon_password, sv_location, sv_region, hide_server), Access/Security (sv_lan, sv_allowcslua, sv_kickerrornum, sv_cheats, sv_allowdownload, sv_downloadurl, sv_loadingurl), Voice (sv_alltalk, sv_voiceenable), Physics (sv_gravity, sv_friction ...), the sbox_* group, and the TTT group. Write only keys the user changed, because defaults conflict between sources (U4). The two panel-managed values (`rcon_password`, `sv_password`) should be passed on the command line or written to server.cfg by the panel, not both (a hosting provider cited by a web search warns settings in two places conflict; that source is third-party and only informational).

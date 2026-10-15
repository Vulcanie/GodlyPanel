import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Garry's Mod (srcds). Its settings are "convars": Source console variables, written one per line as `name value` in a .cfg file,
// the same shape as Rust's server.cfg, so the panel's convar reader handles both files. Two files are offered:
//   autoexec.cfg  the server's name and password. The panel writes it. It is not a file the game ships, so a SteamCMD update
//                 (the panel updates with `validate`, which puts shipped files back as they were) does not wipe it, and the shipped
//                 valve.rc runs it at start-up.
//   server.cfg    everything else. The game ships it empty, and the user fills in the lines they change.
// Source of every name and description: the research dossier (research/garrysmod/02-config.md): the Facepunch wiki's ConVars page
// (names and help texts; its defaults come from a dump that says it is out of date, so defaults are only stated here where the shipped
// Lua or two lists agree), Valve's Console Command List, and the game's own Lua files in Facepunch's GitHub repo (the Trouble in
// Terrorist Town and Sandbox variables). Settings the dossier could not explain are not listed.
//
// Not in the forms, on purpose:
//   - the Sandbox "toolmode_allow_<tool>" switches: one exists per tool and the list of tools is not in the research;
//   - the Trouble in Terrorist Town variables the code does not explain, and the settings of DarkRP, Murder, Prop Hunt and other
//     community gamemodes (each keeps its own, in its own Lua files);
//   - sv_region (its allowed numbers are not documented), fps_max (its meaning on a dedicated server is not), sv_pure.

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const garrysmodAutoexecSettings = withChoices(
	rows([
		["hostname", "Server name", "The name shown in the in-game server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
	]),
	{},
);

export const garrysmodAutoexecGroupOrder = ["Server"];

export const garrysmodServerSettings = withChoices(
	rows([
		// Server
		["sv_location", "Country flag", "A two-letter country code (gb, us, de ... or eu for the European Union) that picks the flag next to your server in the server browser. It has to be the country the server really is in.", "Server"],
		["sv_contact", "Contact email", "The administrator's email address, shown in the server's information.", "Server"],
		["sv_loadingurl", "Loading screen web page", "A web page players see while they join. It has to start with http:// or https://.", "Server"],
		["sv_steamgroup", "Steam group", "The number of a Steam group to tie the server to. The group's number is on the group's admin profile page.", "Server"],
		["sv_gamename_override", "Gamemode name shown", "If it is not empty, this text replaces the gamemode name the server tells Steam.", "Server"],
		["sv_visiblemaxplayers", "Shown player limit", "Changes the player limit that people browsing the server list see. -1 shows the real limit.", "Server"],
		["hide_server", "Hide from the server list", "On hides the server from the in-game server browser; players can still join by typing its address. Handy while you are still setting it up.", "Server"],
		["sv_lan", "Local network only", "On makes a LAN server: no Steam sign-in, not listed on the internet, and only local-type addresses can join. Keep it off for a server friends join over the internet.", "Server"],

		// Access and security
		["sv_allowcslua", "Allow players to run their own Lua", "Lets players run their own Lua scripts in their own game (lua_openscript_cl and lua_run_cl), which is how cheat scripts work. Turn it off to block them. This overrides any gamemode's setting.", "Access and security"],
		["sv_kickerrornum", "Kick on Lua errors", "Kicks a player once they have caused this many Lua errors on their own computer. 0 never kicks.", "Access and security"],
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands. Keep it off on a normal server.", "Access and security"],
		["sv_max_connects_sec", "Connection attempts per second", "The most connection attempts per second the server answers from one address. A low number makes flooding the server harder.", "Access and security"],
		["sv_max_queries_sec", "Server-list queries per second", "The most server-browser queries per second the server answers from one address.", "Access and security"],
		["sv_max_queries_sec_global", "Server-list queries per second, total", "The most server-browser queries per second the server answers from all addresses together.", "Access and security"],
		["sv_quota_stringcmdspersecond", "Console commands per second", "How many console commands per second one player may send. 0 allows none.", "Access and security"],
		["sv_quota_stringcmd_kick", "Kick for command spam", "If above 0, a player who sends more console commands than the limit above is kicked.", "Access and security"],
		["sv_maxvoicepacketsperframe", "Voice packets per tick", "How many voice packets a player may send in one server tick before being kicked. 0 turns the check off. Higher numbers make the server easier to flood.", "Access and security"],
		["sv_logbans", "Log bans", "Writes bans to the server log.", "Access and security"],

		// Voice
		["sv_alltalk", "Everyone hears everyone", "On lets every player hear every other player's voice, whatever team they are on.", "Voice"],
		["sv_voiceenable", "Voice chat", "Turns voice chat on or off for the whole server.", "Voice"],
		["sv_use_steam_voice", "Use Steam voice", "Uses Steam Voice instead of the old voice codec. With it on, voice input from a file no longer works.", "Voice"],
		["sv_allow_voice_from_file", "Allow voice from a file", "Whether players may feed a recorded file into voice chat (voice_inputfromfile).", "Voice"],
		["mp_show_voice_icons", "Voice icons overhead", "Shows a speaker icon above players who are talking.", "Voice"],

		// Gameplay
		["sv_pausable", "Players can pause", "Whether the server can be paused from the game.", "Gameplay"],
		["sv_noclipspeed", "Noclip speed", "How fast players fly with noclip (a multiplier).", "Gameplay"],
		["sv_footsteps", "Footstep sounds", "Plays footstep sounds for players.", "Gameplay"],
		["sv_playerpickupallowed", "Pick things up with the Use key", "Lets players pick up objects with the Use key.", "Gameplay"],
		["sv_namechange_cooldown_seconds", "Name change cooldown (seconds)", "How many seconds a player has to wait before they can change their name again.", "Gameplay"],
		["physgun_limited", "Limit the physics gun", "On means the physics gun can only pick up certain things (props and ragdolls), not map objects. Sandbox sets this to off unless you change it.", "Gameplay"],
		["physgun_maxrange", "Physics gun range", "How far away the physics gun can reach.", "Gameplay"],
		["gmod_maxammo", "Max ammo", "If above 0, every ammo type uses this as its carrying limit. 0 leaves each ammo type with its own limit.", "Gameplay"],
		["gmod_suit", "Half-Life 2 suit power", "Anything other than 0 turns on the Half-Life 2 suit power bar (sprint and oxygen).", "Gameplay"],
		["gmod_sneak_attack", "Half-Life 2 sneak attack", "0 turns off the instant-kill headshot Half-Life 2 gives against NPCs that have not seen the player.", "Gameplay"],
		["mp_falldamage", "Realistic fall damage", "On turns on realistic fall damage.", "Gameplay"],
		["mp_flashlight", "Flashlight", "Whether players can use their flashlight. The game's own network.cfg turns it on when the server starts.", "Gameplay"],
		["mp_weaponstay", "Weapons stay", "On stops a player picking up a weapon they already carry.", "Gameplay"],
		["ai_serverragdolls", "Solid NPC ragdolls", "On makes NPC ragdolls solid by default.", "Gameplay"],

		// Physics
		["sv_gravity", "Gravity", "How strongly things are pulled down. 600 is the normal value.", "Physics"],
		["sv_friction", "Ground friction", "How much players slide on the ground. Higher numbers stop them sooner.", "Physics"],
		["sv_accelerate", "Ground acceleration", "How fast players speed up on the ground.", "Physics"],
		["sv_airaccelerate", "Air acceleration", "How much players can steer while in the air.", "Physics"],
		["sv_maxspeed", "Top player speed", "The fastest a player is allowed to move.", "Physics"],
		["sv_stopspeed", "Minimum stopping speed", "The minimum speed used when a player slows down on the ground.", "Physics"],
		["sv_maxvelocity", "Top object speed", "The fastest any moving object may go, along each direction.", "Physics"],
		["sv_crazyphysics_defuse", "Fix crazy physics", "Resets objects whose physics go wild. The game says turning this off should be a last resort, because it lets people crash a Sandbox server with physics tricks.", "Physics"],
		["sv_crazyphysics_remove", "Remove crazy-physics objects", "Removes objects whose physics go wild (the same warning as above).", "Physics"],
		["gmod_physiterations", "Constraint solver passes", "Extra physics passes make welds, ropes and other constraints more stable, at the cost of server CPU.", "Physics"],
		["phys_timescale", "Physics speed", "Scales how fast physics runs. 1 is normal.", "Physics"],

		// Network and performance
		["sv_timeout", "Idle disconnect time (seconds)", "How many seconds without any message from a player before they are dropped.", "Network and performance"],
		["sv_timeout_signon", "Connecting timeout (seconds)", "The same, for a player who is still connecting.", "Network and performance"],
		["sv_maxrate", "Max data per player", "The most data per second the server sends one player. 0 means no limit.", "Network and performance"],
		["sv_minrate", "Min data per player", "The least data per second the server allows for one player. 0 means no minimum.", "Network and performance"],
		["sv_maxupdaterate", "Max updates per second", "The most updates per second the server sends each player.", "Network and performance"],
		["sv_minupdaterate", "Min updates per second", "The fewest updates per second the server allows for each player.", "Network and performance"],
		["sv_maxunlag", "Max lag compensation (seconds)", "The longest delay, in seconds, the server will make up for when checking a hit.", "Network and performance"],
		["sv_memlimit", "Restart when empty and large (MB)", "If set, the server exits whenever it is empty and using more memory than this many MB, so it can be started fresh. 0 turns it off.", "Network and performance"],
		["sv_hibernate_think", "Keep working when empty", "On makes the server keep running its game logic even when nobody is on.", "Network and performance"],

		// Downloads and Workshop
		["sv_allowupload", "Allow player uploads", "Lets players upload custom files such as sprays.", "Downloads and Workshop"],
		["sv_allowdownload", "Players download from the game server", "Lets players download files straight from the game server. The Facepunch wiki calls this the slowest way (64 kilobytes a second), says it is obsolete, and warns that it opens the server to players spamming file requests.", "Downloads and Workshop"],
		["sv_downloadurl", "Fast download web address", "The address of a web server that holds your custom files, so players download from it instead of from the game server. Players try the file with .bz2 added first, then the plain file. The files still have to be marked for download in a Lua file.", "Downloads and Workshop"],
		["host_workshop_autoupdate", "Update Workshop items at start", "0 stops Workshop addons from updating when the server starts. That protects against a bad update, but an old map can keep players from joining.", "Downloads and Workshop"],

		// Remote console
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON). While it is empty, every remote login is refused. The panel does not use the remote console for this server. Changing it while the server runs disconnects everyone logged in remotely.", "Remote console"],
		["sv_rcon_maxfailures", "Remote login failures before a ban", "How many wrong remote console passwords one address may try before it is banned.", "Remote console"],
		["sv_rcon_minfailures", "Failures in the window", "How many wrong remote console passwords within the time window below lead to a ban.", "Remote console"],
		["sv_rcon_minfailuretime", "Failure window (seconds)", "The number of seconds over which wrong remote console passwords are counted.", "Remote console"],
		["sv_rcon_banpenalty", "Remote login ban length (minutes)", "How many minutes someone who fails the remote console login is banned for.", "Remote console"],
		["sv_rcon_whitelist_address", "Address that is never banned", "A wrong remote console password from this address never causes a ban (for example 127.0.0.1).", "Remote console"],

		// Logging
		["sv_logfile", "Write a log file", "Writes server information to the server's log file.", "Logging"],
		["sv_logecho", "Show the log in the console", "Also prints the log information in the server console.", "Logging"],
		["sv_log_onefile", "One log file", "Logs to a single file only instead of a new one each time.", "Logging"],
		["sv_logfilecompress", "Compress old logs", "Compresses the log file (gzip, ending in .log.gz) when it is closed.", "Logging"],
		["sv_log_client_errors", "Log players' Lua errors", "Above 0 writes the Lua errors from players' computers to clientside_errors.txt. 0 only prints them in the console; below 0 does not even print them.", "Logging"],

		// Sandbox limits
		["sbox_maxprops", "Props per player", "The most props one player can have spawned at once.", "Sandbox limits"],
		["sbox_maxragdolls", "Ragdolls per player", "The most ragdolls one player can have spawned at once.", "Sandbox limits"],
		["sbox_maxnpcs", "NPCs per player", "The most NPCs one player can have spawned at once.", "Sandbox limits"],
		["sbox_maxvehicles", "Vehicles per player", "The most vehicles one player can have spawned at once.", "Sandbox limits"],
		["sbox_maxeffects", "Effects per player", "The most effect props one player can have spawned at once.", "Sandbox limits"],
		["sbox_maxsents", "Scripted entities per player", "The most scripted entities (the Entities tab of the spawn menu) one player can have spawned at once.", "Sandbox limits"],
		["sbox_maxballoons", "Balloons per player", "The most balloons one player can have at once.", "Sandbox limits"],
		["sbox_maxbuttons", "Buttons per player", "The most buttons one player can have at once.", "Sandbox limits"],
		["sbox_maxcameras", "Cameras per player", "The most cameras one player can have at once.", "Sandbox limits"],
		["sbox_maxdynamite", "Dynamite per player", "The most dynamite one player can have at once.", "Sandbox limits"],
		["sbox_maxemitters", "Emitters per player", "The most emitters one player can have at once.", "Sandbox limits"],
		["sbox_maxhoverballs", "Hoverballs per player", "The most hoverballs one player can have at once.", "Sandbox limits"],
		["sbox_maxlamps", "Lamps per player", "The most lamps one player can have at once.", "Sandbox limits"],
		["sbox_maxlights", "Lights per player", "The most lights one player can have at once.", "Sandbox limits"],
		["sbox_maxthrusters", "Thrusters per player", "The most thrusters one player can have at once.", "Sandbox limits"],
		["sbox_maxwheels", "Wheels per player", "The most wheels one player can have at once.", "Sandbox limits"],
		["sbox_maxconstraints", "Constraints per player", "The most welds and other constraints (not ropes) one player can make.", "Sandbox limits"],
		["sbox_maxropeconstraints", "Rope constraints per player", "The most rope-based constraints one player can make.", "Sandbox limits"],

		// Sandbox rules
		["sbox_godmode", "Everyone is invincible", "On makes every player invincible.", "Sandbox rules"],
		["sbox_playershurtplayers", "Players can hurt players", "Off stops players damaging each other.", "Sandbox rules"],
		["sbox_noclip", "Allow noclip", "On lets players use noclip (flying through walls).", "Sandbox rules"],
		["sbox_weapons", "Spawn with Half-Life 2 weapons", "On gives each player the default Half-Life 2 weapons every time they spawn.", "Sandbox rules"],
		["sbox_bonemanip_misc", "Bone manipulation: other objects", "On lets players move the bones of other objects such as props.", "Sandbox rules"],
		["sbox_bonemanip_npc", "Bone manipulation: NPCs", "On lets players move the bones of NPCs.", "Sandbox rules"],
		["sbox_bonemanip_player", "Bone manipulation: players", "On lets players move the bones of other players.", "Sandbox rules"],
		["sbox_persist", "Persistent props save name", "If not empty, players can right-click a prop while holding C and choose Make Persistent, so it survives restarts. The props are kept in garrysmod/data/persist under this name. Changing the name saves the persistent props, clears the map and loads the ones saved under the new name.", "Sandbox rules"],

		// Trouble in Terrorist Town: rounds
		["ttt_roundtime_minutes", "Round length (minutes)", "How long the main part of a round lasts. Starts at 10.", "TTT rounds"],
		["ttt_preptime_seconds", "Preparation time (seconds)", "How long players prepare before each round. Starts at 30.", "TTT rounds"],
		["ttt_firstpreptime", "First preparation time (seconds)", "How long players prepare before the first round after a map change. Starts at 60.", "TTT rounds"],
		["ttt_posttime_seconds", "After-round time (seconds)", "How long the end-of-round screen lasts before the next round. Starts at 30.", "TTT rounds"],
		["ttt_round_limit", "Rounds per map", "How many rounds are played before the map changes. Starts at 6.", "TTT rounds"],
		["ttt_time_limit_minutes", "Map time limit (minutes)", "The total time on one map before the map changes. Starts at 75.", "TTT rounds"],
		["ttt_minimum_players", "Players needed to start", "How many players are needed before a round starts. Starts at 2.", "TTT rounds"],
		["ttt_haste", "Haste mode", "On adds time to the round every time someone dies, so a slow round ends sooner. Starts on.", "TTT rounds"],
		["ttt_haste_starting_minutes", "Haste starting time (minutes)", "The time a round starts with in haste mode. Starts at 5.", "TTT rounds"],
		["ttt_haste_minutes_per_death", "Haste time per death (minutes)", "The minutes added to the round for each death in haste mode. Starts at 0.5.", "TTT rounds"],
		["ttt_postround_dm", "Fighting after the round", "On lets everyone fight freely after the round has ended. Starts off.", "TTT rounds"],
		["ttt_spawn_wave_interval", "Respawn wave interval (seconds)", "The seconds between spawn waves. 0 spawns players straight away. Starts at 0.", "TTT rounds"],

		// TTT roles
		["ttt_traitor_pct", "Share of traitors", "The fraction of players who become traitors: 0.25 is a quarter. Starts at 0.25.", "TTT roles"],
		["ttt_traitor_max", "Most traitors", "The most traitors there can be in a round. Starts at 32.", "TTT roles"],
		["ttt_detective_pct", "Share of detectives", "The fraction of players who become detectives. Starts at 0.13.", "TTT roles"],
		["ttt_detective_max", "Most detectives", "The most detectives there can be in a round. Starts at 32.", "TTT roles"],
		["ttt_detective_min_players", "Players needed for detectives", "With fewer players than this there are no detectives. Starts at 8.", "TTT roles"],
		["ttt_detective_karma_min", "Karma needed to be a detective", "Players with less karma than this are not picked as a detective. Starts at 600.", "TTT roles"],

		// TTT credits
		["ttt_credits_starting", "Traitor starting credits", "The equipment credits each traitor starts with. Starts at 2.", "TTT credits"],
		["ttt_credits_award_pct", "Credit award threshold", "The share of innocent players that must be dead before the traitors earn a credit award: 0.35 is just over a third. Starts at 0.35.", "TTT credits"],
		["ttt_credits_award_size", "Credits per award", "How many credits each award gives. Starts at 1.", "TTT credits"],
		["ttt_credits_award_repeat", "Repeat the award", "Whether the award is given again each time the threshold is passed again. Starts on.", "TTT credits"],
		["ttt_credits_detectivekill", "Credits for killing a detective", "The credits traitors get for killing a detective. Starts at 1.", "TTT credits"],
		["ttt_credits_alonebonus", "Last traitor bonus", "The extra credits a traitor gets when they are alone. Starts at 1.", "TTT credits"],
		["ttt_det_credits_starting", "Detective starting credits", "The equipment credits each detective starts with. Starts at 1.", "TTT credits"],
		["ttt_det_credits_traitorkill", "Detective credits for a traitor kill", "The credits detectives get when a traitor is killed. Starts at 0.", "TTT credits"],
		["ttt_det_credits_traitordead", "Detective credits for a traitor death", "The credits detectives get when a traitor dies. Starts at 1.", "TTT credits"],

		// TTT karma
		["ttt_karma", "Karma system", "On turns karma on. Karma goes down when you kill your own side, and a player with low karma does less damage and can be kicked. Starts on.", "TTT karma"],
		["ttt_karma_starting", "Starting karma", "The karma every player starts with. Starts at 1000.", "TTT karma"],
		["ttt_karma_max", "Highest karma", "The most karma a player can have. Starts at 1000.", "TTT karma"],
		["ttt_karma_kill_penalty", "Karma lost per wrongful kill", "The karma taken away for killing a player on your own side. Starts at 15.", "TTT karma"],
		["ttt_karma_round_increment", "Karma gained each round", "The karma every player gets back at the end of each round. Starts at 5.", "TTT karma"],
		["ttt_karma_clean_bonus", "Clean round bonus", "The extra karma for a round without wrongful kills. Starts at 30.", "TTT karma"],
		["ttt_karma_traitorkill_bonus", "Karma for killing a traitor", "The karma gained for killing a traitor. Starts at 40.", "TTT karma"],
		["ttt_karma_persist", "Remember karma", "On keeps each player's karma when the map changes. Starts off.", "TTT karma"],
		["ttt_karma_low_autokick", "Kick players with low karma", "On kicks (or bans, see below) players whose karma falls below the low karma line. Starts on.", "TTT karma"],
		["ttt_karma_low_amount", "Low karma line", "The karma value below which a player is kicked or banned. Starts at 450.", "TTT karma"],
		["ttt_karma_low_ban", "Ban instead of kick", "On bans players with low karma instead of just kicking them. Starts on.", "TTT karma"],
		["ttt_karma_low_ban_minutes", "Low karma ban length (minutes)", "How long the ban for low karma lasts. Starts at 60.", "TTT karma"],

		// TTT players
		["ttt_idle_limit", "Idle time before spectating (seconds)", "How many seconds a player can do nothing before they are moved to spectator. 0 or less turns it off. Starts at 180.", "TTT players"],
		["ttt_namechange_kick", "Kick for changing name mid-round", "On kicks players who change their name during a round. Starts on.", "TTT players"],
		["ttt_namechange_bantime", "Name change ban length (minutes)", "How long the ban for changing name lasts. Starts at 10.", "TTT players"],
		["ttt_limit_spectator_chat", "Dead players can't text-chat with the living", "On stops dead players' chat reaching living players. Starts on.", "TTT players"],
		["ttt_limit_spectator_voice", "Dead players can't talk to the living", "On stops dead players' voice reaching living players. Starts on.", "TTT players"],
		["ttt_locational_voice", "Voice heard by distance", "On makes players hear each other's voice only when close. Starts off.", "TTT players"],
		["ttt_bots_are_spectators", "Bots start as spectators", "On makes bots join as spectators. Starts off.", "TTT players"],
		["ttt_highlight_admins", "Highlight admins", "On shows admins in the scoreboard. Starts on.", "TTT players"],
	]),
	{
		hide_server: BOOL,
		sv_lan: BOOL,
		sv_allowcslua: BOOL,
		sv_cheats: BOOL,
		sv_logbans: BOOL,
		sv_alltalk: BOOL,
		sv_voiceenable: BOOL,
		sv_use_steam_voice: BOOL,
		sv_allow_voice_from_file: BOOL,
		mp_show_voice_icons: BOOL,
		sv_pausable: BOOL,
		sv_footsteps: BOOL,
		sv_playerpickupallowed: BOOL,
		physgun_limited: BOOL,
		gmod_sneak_attack: BOOL,
		mp_flashlight: BOOL,
		mp_weaponstay: BOOL,
		ai_serverragdolls: BOOL,
		sv_crazyphysics_defuse: BOOL,
		sv_crazyphysics_remove: BOOL,
		sv_hibernate_think: BOOL,
		sv_allowupload: BOOL,
		sv_allowdownload: BOOL,
		host_workshop_autoupdate: BOOL,
		sv_logfile: BOOL,
		sv_logecho: BOOL,
		sv_log_onefile: BOOL,
		sv_logfilecompress: BOOL,
		sbox_godmode: BOOL,
		sbox_playershurtplayers: BOOL,
		sbox_noclip: BOOL,
		sbox_weapons: BOOL,
		sbox_bonemanip_misc: BOOL,
		sbox_bonemanip_npc: BOOL,
		sbox_bonemanip_player: BOOL,
		ttt_haste: BOOL,
		ttt_postround_dm: BOOL,
		ttt_credits_award_repeat: BOOL,
		ttt_karma: BOOL,
		ttt_karma_persist: BOOL,
		ttt_karma_low_autokick: BOOL,
		ttt_karma_low_ban: BOOL,
		ttt_namechange_kick: BOOL,
		ttt_limit_spectator_chat: BOOL,
		ttt_limit_spectator_voice: BOOL,
		ttt_locational_voice: BOOL,
		ttt_bots_are_spectators: BOOL,
		ttt_highlight_admins: BOOL,
		// The dossier only documents 0 and 1; the game may take other values.
		mp_falldamage: { choices: BOOL, allowCustom: true },
	},
);

export const garrysmodServerGroupOrder = [
	"Server",
	"Access and security",
	"Voice",
	"Gameplay",
	"Physics",
	"Network and performance",
	"Downloads and Workshop",
	"Remote console",
	"Logging",
	"Sandbox limits",
	"Sandbox rules",
	"TTT rounds",
	"TTT roles",
	"TTT credits",
	"TTT karma",
	"TTT players",
];

const launch = {
	title: "Garry's Mod",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Garry's Mod is started with `+word value` console commands (the map, the gamemode, the player limit) and `-word` launch options (the port, the console). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "garrysmod", description: "Tells srcds which game to run. For Garry's Mod this has to be garrysmod. The Facepunch examples for Windows leave it out, but the Linux example and the community guides include it, so the panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "27145", description: "The port the server listens on and tells players to connect to (UDP). Source's remote console would use the same number over TCP. Change it from the server's Ports section so the panel can check for clashes." }),
		FLAG({ flag: "-strictportbind", label: "Stop if the port is taken", group: "Network", managed: true, description: "If the port is already in use, the server quits with an error instead of quietly using another port. Without it a second server would take the next free port and players would not find it." }),
		A({ flag: "-ip", style: "space", label: "Listen address", group: "Network", example: "0.0.0.0", description: "The network address the server listens on. It has to be an address of this PC, or 0.0.0.0 for all of them. Only needed with several network cards; it has nothing to do with the address players use from outside." }),
		A({ flag: "-tickrate", style: "space", label: "Tick rate", group: "Performance", example: "66", description: "How many times a second the server updates the game. Facepunch recommends 30 to 128 and says the default is about 66.67. Higher is smoother and uses more CPU." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "16", description: "The number of player slots. The most the game allows is set by the game and gamemode; the Facepunch examples use 12 to 32." }),
		A({ flag: "+gamemode", label: "Gamemode", group: "Server", managed: true, example: "sandbox", options: ["sandbox", "terrortown"], allowCustom: true, description: "The gamemode the server starts with, named by its folder in garrysmod/gamemodes (or in an addon). Sandbox and terrortown (Trouble in Terrorist Town) come with the game; a gamemode from the Workshop is named by its folder." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "gm_construct", description: "The map the server starts on: the map file's name without .bsp, from garrysmod/maps or from an addon. For a Workshop map, use the file name given on its Workshop page." }),
		A({ flag: "+sv_setsteamaccount", label: "Game Server Login Token", group: "Server", example: "…", description: "The Game Server Login Token for this server. Facepunch says every server should have one: without it the server ranks very low in the server list, and an invalid or expired one stops the server from starting. Create one at steamcommunity.com/dev/managegameservers with app ID 4000, one token per server. Treat it like a password." }),
		A({ flag: "+host_workshop_collection", label: "Workshop collection", group: "Mods", managed: true, example: "157384458", description: "The id of a Steam Workshop collection. The server downloads it and mounts all its addons every time it starts. The collection has to be Public or Unlisted. Players only download an addon's content from your server if it is marked for download in a Lua file." }),
		FLAG({ flag: "-condebug", label: "Write the console to a file", edit: false, managed: true, group: "Saves and logs", description: "Writes everything the console prints to console.txt in the garrysmod folder. The Logs tab reads that file." }),
		FLAG({ flag: "-disableluarefresh", label: "No Lua auto-refresh", group: "Performance", description: "Stops the server reloading Lua files when they change on disk." }),
		FLAG({ flag: "-noworkshop", label: "Ignore Workshop addons", group: "Troubleshooting", description: "Starts without the Workshop addons, to find out whether one of them is the problem." }),
		FLAG({ flag: "-noaddons", label: "Ignore hand-made addons", group: "Troubleshooting", description: "Starts without the addons in the garrysmod/addons folder, to find out whether one of them is the problem." }),
		FLAG({ flag: "-noconclr", label: "No console colours", group: "Troubleshooting", description: "Turns off the colour codes in the server console, so a program that shows its text does not show strange characters." }),
		FLAG({ flag: "-allowlocalhttp", label: "Allow web requests to the local network", group: "Advanced", description: "Lets Lua scripts on the server fetch web pages from addresses like 192.168.x.x. Only for addons that need to talk to another program on your network." }),
		FLAG({ flag: "-nocrashdialog", label: "No crash message boxes", group: "Advanced", description: "Stops some of the error message boxes Windows would show if the server crashes, so an unattended server is not left waiting for someone to click." }),
		FLAG({ flag: "-insecure", label: "Turn off Valve Anti-Cheat", group: "Advanced", description: "Starts the server without Valve Anti-Cheat (VAC). Servers run with it unless this is on the line." }),
	],
};

const guide = {
	name: "Garry's Mod",
	short: "Garry's Mod",
	summary:
		"Garry's Mod is set up with console variables (\"convars\"): lines of a name and a value in `.cfg` files in the `garrysmod\\cfg` folder of the server. The panel writes the server's name and password in `autoexec.cfg`, and everything else you change goes in `server.cfg`, which the game ships empty. The map, gamemode, player limit and port are on the launch line.",
	files: {
		"autoexec.cfg": "The server's name and password. The panel writes this file when it creates the server.",
		"server.cfg": "Every other setting: access, voice, physics, downloads, Sandbox limits and the Trouble in Terrorist Town rules. Only the lines you set are in the file.",
	},
	notes: [
		"The game reads these files when it starts, so stop and start the server after changing a setting.",
		"The name and password are in `autoexec.cfg` and not in `server.cfg` on purpose: the panel updates the game with SteamCMD's `validate`, which puts files the game ships (including the empty `server.cfg`) back as they were, so anything the panel had written in `server.cfg` would be gone after an update. If you put the same setting in both files, the later one wins; the research could not confirm which runs later.",
		"Facepunch says every server should have a Game Server Login Token (steamcommunity.com/dev/managegameservers, app ID 4000). Without one the server ranks very low in the server list, and an invalid or expired one stops the server from starting. Add it with the Game Server Login Token argument in Launch options. It is a secret: do not share it.",
		"Mods are Steam Workshop addons. Put them in a Workshop collection (Public or Unlisted), then give its id in the Workshop collection argument; the server downloads and mounts the collection every time it starts. Players only download an addon's content from your server if the addon is marked for download by a Lua file (`resource.AddWorkshop`, in `garrysmod\\lua\\autorun\\server`), or is the current map or gamemode. The panel does not write that file.",
		"Source games have a remote console (RCON) on the game port over TCP, with the password set by `rcon_password`. The panel does not use it for this server, so Stop closes the server's window and, after 15 seconds, ends the program. Whether that gives the game time to save its data (Sandbox's persistent props are saved when the server shuts down) was not tested.",
		"Settings of community gamemodes (DarkRP, Murder, Prop Hunt and others), the Sandbox `toolmode_allow_<tool>` switches, the NPC damage files (`skill.cfg`) and the map cycle are not in the form. The shipped `mapcycle.txt` says Garry's Mod does not use it.",
		"The values of the Sandbox rules and limits come from the Facepunch wiki's list, which says it is rarely updated. A setting the file has that the panel does not explain is still shown.",
	],
};

export default {
	type: "garrysmod",
	title: "Garry's Mod",
	files: {
		"autoexec.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: garrysmodAutoexecSettings,
			groupOrder: garrysmodAutoexecGroupOrder,
			mayBeMissing: "The panel writes autoexec.cfg in the garrysmod\\cfg folder when it creates the server. If it is missing, create it there: each line is a setting name and its value, such as hostname \"My Server\".",
		},
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: garrysmodServerSettings,
			groupOrder: garrysmodServerGroupOrder,
			mayBeMissing: "The game ships server.cfg empty in the garrysmod\\cfg folder. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as sv_gravity 600.",
		},
	},
	launch,
	guide,
};

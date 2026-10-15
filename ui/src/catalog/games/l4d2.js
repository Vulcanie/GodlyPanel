import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Left 4 Dead 2 (srcds). Its settings are "convars": Source console variables, written one per line as `name value` in a .cfg file,
// the same shape as Rust's server.cfg and Garry's Mod's, so the panel's convar reader handles all of them. One file is offered:
//   server.cfg  everything. The game does not ship one ("not included by default and must be created", FireDaemon), so the panel
//               writes it with the server's name, the password and sv_allow_lobby_connect_only 0 when it creates the server, and the
//               launch line runs it with `+exec server.cfg`. Because it is not a shipped file, SteamCMD's `validate` does not put it
//               back, so unlike Garry's Mod there is no second autoexec.cfg here.
// Source of every name and description: the research dossier (research/l4d2/02-config.md): Valve's "List of Left 4 Dead 2 console
// commands and variables" (a dump of game version 2.2.2.1 from October 2021, so a few defaults may have changed; defaults are therefore
// not stated here), plus the hosting guides it names. Settings the dossier could not explain are not listed.
//
// Not in the form, on purpose:
//   - the friendly-fire factors, the horde sizes and intervals, the per-special limits, the special-infected spawn interval (no unit)
//     and similar Director knobs: the list gives no description for them, or none the research could confirm;
//   - sv_region (the numbers are not documented by Valve), sv_filterban (its values are not), fps_max, sv_alternateticks,
//     mapcyclefile / motd settings (not shown to be used by this game), SourceTV (tv_*; not shown to work on this server) and the
//     other-game leftovers in Valve's shared list (mp_buytime, mp_c4timer ...);
//   - sv_gametypes: it is a launch option (see the launch arguments), so it is not offered in two places.

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const l4d2ServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name shown in the server browser and the server list. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["sv_contact", "Contact email", "The email address of the person running the server, shown with the server's details.", "Server"],
		["sv_tags", "Server tags", "Extra labels shown to players browsing for servers. Separate several with commas.", "Server"],

		// Joining and the server list
		["sv_lan", "Local network only", "On makes a LAN server: it is not announced to Steam, players are not checked against Steam and only local addresses can join. Keep it off for a server friends join over the internet.", "Joining"],
		["sv_allow_lobby_connect_only", "Only allow joining through a lobby", "On means players can only arrive through matchmaking (a lobby) and cannot connect directly. The game starts with this on; the panel writes it off, so friends can join with the console command connect or from the server browser.", "Joining"],
		["sv_steamgroup", "Steam group", "The number of a Steam group to tie the server to. The group's number is on the group's admin profile page on the Steam community site.", "Joining"],
		["sv_steamgroup_exclusive", "Steam group first", "On means that while the server is empty only members of the Steam group can join; anyone can join once it has players.", "Joining"],
		["sv_search_key", "Lobby search key", "When a lobby looks for a dedicated server it only takes servers with the same key. Use it to keep the server for your own lobbies.", "Joining"],
		["sv_visiblemaxplayers", "Shown player limit", "Changes the player limit that people browsing the server list see. -1 shows the real limit.", "Joining"],
		["sv_reservation_timeout", "Lobby reservation time (seconds)", "How many seconds a lobby's reservation of the server lasts before it runs out.", "Joining"],

		// Game rules
		["mp_gamemode", "Game mode", "The mode being played. Valve's list notes it is changed by the map command (map <name> <mode>), so a map change or a lobby can override what is written here.", "Game rules"],
		["z_difficulty", "Difficulty", "How hard the game is. The game's menu calls Hard \"Advanced\" and Impossible \"Expert\".", "Game rules"],
		["survivor_limit", "Maximum survivors", "The most survivors there can be. Vanilla co-op servers hold 4 players (8 in Versus); more needs add-ons.", "Game rules"],
		["z_max_player_zombies", "Most player-controlled infected", "The most humans who can play the infected team at the same time.", "Game rules"],
		["survivor_respawn_with_guns", "Weapons after a rescue", "What a rescued survivor is carrying when they come back.", "Game rules"],
		["sv_rescue_disabled", "Disable rescuing dead survivors", "On means dead survivors can never be rescued.", "Game rules"],
		["sv_permawipe", "Restart the campaign on a wipe", "On restarts the campaign from the start if all the survivors die.", "Game rules"],
		["sv_pausable", "Players can pause", "Whether the game can be paused on the server.", "Game rules"],
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands. Keep it off on a server other people play on.", "Game rules"],

		// Voice
		["sv_alltalk", "Everyone hears everyone", "On lets every player hear every other player's voice, whatever team they are on.", "Voice"],
		["sv_voiceenable", "Voice chat", "Turns voice chat on or off for the whole server.", "Voice"],

		// Difficulty tuning
		["survivor_max_incapacitated_count", "Times a survivor can be downed", "How many times a survivor can be incapacitated, instead of killed, before they need a health kit.", "Difficulty tuning"],
		["survivor_revive_health", "Health after being revived", "The temporary health a survivor has after being revived.", "Difficulty tuning"],
		["first_aid_heal_percent", "First-aid kit healing", "The share of a survivor's injuries a first-aid kit heals: 0.8 is 80 percent. Use a number from 0 to 1.", "Difficulty tuning"],
		["pain_pills_health_threshold", "Pills only below this health", "Pain pills cannot be used unless the survivor's total health is below this number.", "Difficulty tuning"],
		["z_health", "Common infected health", "The maximum health of an ordinary zombie.", "Difficulty tuning"],
		["z_tank_health", "Tank health", "The maximum health of a Tank.", "Difficulty tuning"],
		["z_witch_health", "Witch health", "The maximum health of a Witch.", "Difficulty tuning"],

		// Director
		["z_common_limit", "Common infected at once", "How many ordinary zombies can exist at the same time. More is harder and costs the server more CPU.", "Director"],
		["director_no_bosses", "No Tanks or Witches", "On stops Tanks and Witches from spawning.", "Director"],
		["director_no_mobs", "No hordes", "On stops horde rushes.", "Director"],
		["director_no_specials", "No special infected", "On stops special infected from spawning.", "Director"],
		["director_no_survivor_bots", "No survivor bots", "On stops the survivor team being filled up with bots.", "Director"],
		["director_panic_forever", "Endless panic events", "On makes panic events (waves of zombies) never end.", "Director"],
		["director_allow_infected_bots", "Infected bots fill empty slots", "Lets bots fill empty places on the infected team.", "Director"],
		["director_afk_timeout", "Idle time before spectating (seconds)", "Players who do nothing for longer than this are moved to spectator mode.", "Director"],
		["director_min_start_players", "Players needed to start", "Players are frozen until this many have joined; then the mission starts.", "Director"],
		["director_ready_duration", "Ready-up time (seconds)", "If not 0, the survivor team has this long to get ready before starting out.", "Director"],
		["director_unfreeze_time", "Unfreeze time (seconds)", "How many seconds to wait, after the first player has connected, before a team is unfrozen.", "Director"],
		["director_transition_timeout", "Map transition wait (seconds)", "How many seconds the game waits for the survivors to cross into the next map.", "Director"],
		["director_convert_pills", "Pills become kits (not Expert)", "Lets pain pills be turned into health kits or defibrillators on difficulties below Expert.", "Director"],
		["director_vs_convert_pills", "Pills become kits (Versus)", "What share of the pain pills become health kits in Versus: 0.5 is half. Use a number from 0 to 1.", "Director"],
		["director_survival_setup_time", "Survival setup time (seconds)", "The time allowed to set up before a Survival round starts by itself. 0 means none.", "Director"],
		["allow_all_bot_survivor_team", "Allow an all-bot survivor team", "Allows a survivor team made only of bots. A human player is still needed for the game to be active.", "Director"],
		["sb_all_bot_game", "Allow a server of only bots", "Allows a game with no human players at all.", "Director"],
		["sb_allow_leading", "Survivor bots may lead", "If not 0, survivor bots can lead the way and do not always wait behind the human leader.", "Director"],
		["sb_friendlyfire", "Survivor bots hurt other survivors", "Whether a survivor bot's bullets hurt the other survivors.", "Director"],

		// Versus
		["versus_force_start_time", "Versus force-start time (seconds)", "A Versus game is started after this long even if survivors are still inside the safe room.", "Versus"],
		["versus_tank_chance", "Versus Tank chance", "The chance of a Tank in a regular Versus map: 0.75 is 75 percent. Use a number from 0 to 1.", "Versus"],
		["versus_witch_chance", "Versus Witch chance", "The chance of a Witch in a regular Versus map: 0.75 is 75 percent. Use a number from 0 to 1.", "Versus"],
		["versus_winning_team_goes_last", "Losing team plays survivors first", "On means the team that is losing plays as the survivors first.", "Versus"],

		// Survival
		["survival_max_specials", "Most special infected alive", "The most special infected alive at one time in Survival.", "Survival"],
		["survival_horde_stage_interval", "Seconds between hordes", "The seconds between horde attacks in Survival.", "Survival"],
		["survival_special_spawn_interval", "Seconds between special infected", "The seconds between waves of special infected in Survival.", "Survival"],
		["survival_tank_stage_interval", "Seconds between Tanks", "The seconds between Tank attacks in Survival.", "Survival"],
		["survival_round_restart_delay", "Restart delay (seconds)", "After a loss, the round restarts after this many seconds.", "Survival"],

		// Scavenge
		["scavenge_round_setup_time", "Setup time (seconds)", "The setup time before a Scavenge round starts.", "Scavenge"],
		["scavenge_round_initial_time", "Starting clock (seconds)", "The time on the clock when a Scavenge round starts.", "Scavenge"],
		["scavenge_score_bonus_time", "Time added per can (seconds)", "The time added to the clock every time a team scores.", "Scavenge"],
		["scavenge_item_respawn_delay", "Can respawn delay (seconds)", "After a scavenge item is destroyed, how many seconds until it comes back.", "Scavenge"],

		// Voting
		["sv_allow_votes", "Allow voting", "Lets players hold votes. Valve's list says the game's mod support is needed first.", "Voting"],
		["sv_vote_issue_kick_allowed", "Votes to kick players", "Whether players can hold votes to kick other players.", "Voting"],
		["sv_vote_kick_ban_duration", "Vote-kick ban length (minutes)", "How long a player who was voted out stays banned from the server.", "Voting"],
		["sv_vote_issue_change_difficulty_allowed", "Votes to change difficulty", "Whether players can hold votes to change the difficulty.", "Voting"],
		["sv_vote_issue_change_map_now_allowed", "Votes to change map now", "Whether players can hold votes to change the map immediately.", "Voting"],
		["sv_vote_issue_change_map_later_allowed", "Votes to change map after the round", "Whether players can hold votes to change the map after this round.", "Voting"],
		["sv_vote_issue_change_mission_allowed", "Votes to change campaign", "Whether players can hold votes to change the campaign (mission).", "Voting"],
		["sv_vote_issue_restart_game_allowed", "Votes to restart", "Whether players can hold votes to restart the game.", "Voting"],
		["sv_vote_creation_timer", "Time between one player's votes (seconds)", "How often one player can call a vote.", "Voting"],
		["sv_vote_failure_timer", "Cooldown after a failed vote (seconds)", "A vote that fails cannot be called again for this long.", "Voting"],
		["sv_vote_plr_map_limit", "Failed votes per player per map", "The number of failed votes one player can call on each map.", "Voting"],
		["sv_vote_timer_duration", "How long a vote stays open (seconds)", "How long voting on an issue stays open.", "Voting"],
		["sv_vote_command_delay", "Delay before a passed vote acts", "How long after a vote passes until the action happens.", "Voting"],
		["sv_vote_show_caller", "Show who called the vote", "Shows the name of the person who called the vote.", "Voting"],

		// Files and downloads
		["sv_consistency", "File consistency check", "Whether the server makes players' critical game files match its own. One Steam forum user reports that turning it off lets players join without the server's custom addons; that is not confirmed by Valve.", "Files and downloads"],
		["sv_pure_kick_clients", "Kick for mismatched files", "On kicks players whose files do not match; off only warns them.", "Files and downloads"],
		["sv_allowdownload", "Players can download from the server", "Lets players download files from the game server.", "Files and downloads"],
		["sv_allowupload", "Players can upload files", "Lets players upload their custom files, such as sprays.", "Files and downloads"],
		["sv_downloadurl", "Fast download web address", "The address of a web server that holds files players are missing, so they can fetch them from there. Whether it serves the addons in left4dead2/addons was not confirmed.", "Files and downloads"],
		["net_maxfilesize", "Largest upload (MB)", "The largest file, in megabytes, a player may upload.", "Files and downloads"],

		// Network and performance
		["sv_minrate", "Minimum data per player", "The least data per second the server allows for one player. 0 means unlimited.", "Network and performance"],
		["sv_maxrate", "Maximum data per player", "The most data per second the server allows for one player. 0 means unlimited.", "Network and performance"],
		["sv_minupdaterate", "Minimum updates per second", "The fewest updates per second the server allows for each player.", "Network and performance"],
		["sv_maxupdaterate", "Maximum updates per second", "The most updates per second the server allows for each player.", "Network and performance"],
		["sv_mincmdrate", "Minimum command rate", "Sets the lowest value for the number of packets per second a player's game sends. 0 means unlimited.", "Network and performance"],
		["sv_maxcmdrate", "Maximum command rate", "If the minimum command rate is above 0, this sets the highest value for the number of packets per second a player's game sends.", "Network and performance"],
		["sv_client_min_interp_ratio", "Minimum interpolation ratio", "Limits the players' cl_interp_ratio from below. -1 lets players set it to anything.", "Network and performance"],
		["sv_client_max_interp_ratio", "Maximum interpolation ratio", "Limits the players' cl_interp_ratio from above. It has no effect while the minimum is -1.", "Network and performance"],
		["sv_client_predict", "Force client prediction", "Can force the players' cl_predict setting: -1 lets each player choose, 0 forces it off, 1 forces it on.", "Network and performance"],
		["sv_timeout", "Idle disconnect time (seconds)", "How many seconds without any message from a player before they are dropped.", "Network and performance"],
		["sv_unlag", "Lag compensation", "Turns on lag compensation for players.", "Network and performance"],
		["sv_maxunlag", "Longest lag compensation (seconds)", "The longest delay, in seconds, the server will make up for when checking a hit.", "Network and performance"],
		["sv_hibernate_when_empty", "Sleep when empty", "On puts the server into a very low CPU mode while nobody is connected.", "Network and performance"],
		["sv_hibernate_postgame_delay", "Delay before sleeping (seconds)", "How many seconds to wait after the last player leaves before the server goes to sleep.", "Network and performance"],
		["sv_max_queries_sec", "Server-list queries per second", "The most server-browser queries per second the server answers from one address.", "Network and performance"],
		["sv_max_queries_sec_global", "Server-list queries per second, total", "The most server-browser queries per second the server answers from all addresses together.", "Network and performance"],

		// Logging
		["sv_logfile", "Write a log file", "Writes the server's information to its log file.", "Logging"],
		["sv_log_onefile", "One log file", "Logs to a single file instead of a new one each time.", "Logging"],
		["sv_logbans", "Log bans", "Writes the server's bans to its log.", "Logging"],
		["sv_logecho", "Show the log in the console", "Also prints the log information in the server's console.", "Logging"],
		["sv_logflush", "Write the log at every line", "Writes the log to the disk at every line. It is slow.", "Logging"],
		["sv_logsdir", "Log folder", "The folder, inside the game folder, where the server's logs are kept.", "Logging"],
		["sv_rcon_log", "Log remote console use", "Writes a log of remote console (RCON) use.", "Logging"],

		// Remote console and bans
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON). Choose a long one: anyone with it controls the server. The panel does not use the remote console for this server. Changing it while the server runs disconnects everyone logged in remotely.", "Remote console and bans"],
		["sv_rcon_maxfailures", "Wrong passwords before a ban", "How many times one address may get the remote console password wrong before it is banned.", "Remote console and bans"],
		["sv_rcon_minfailures", "Wrong passwords in the window", "How many wrong remote console passwords within the time window below lead to a ban.", "Remote console and bans"],
		["sv_rcon_minfailuretime", "Window for wrong passwords (seconds)", "The number of seconds over which wrong remote console passwords are counted.", "Remote console and bans"],
		["sv_rcon_banpenalty", "Remote login ban length (minutes)", "How many minutes someone who fails the remote console login is banned for.", "Remote console and bans"],
		["sv_banid_enabled", "Allow the banid command", "Whether the server supports the banid command for banning players.", "Remote console and bans"],
	]),
	{
		sv_lan: BOOL,
		sv_allow_lobby_connect_only: [
			["0", "Direct joining allowed"],
			["1", "Lobby only"],
		],
		sv_steamgroup_exclusive: BOOL,
		// Valve's list names these six; a hosting guide also names mutation modes, so a typed name is accepted.
		mp_gamemode: {
			choices: [
				["coop", "Co-op"],
				["realism", "Realism"],
				["versus", "Versus"],
				["survival", "Survival"],
				["scavenge", "Scavenge"],
				["holdout", "Holdout"],
			],
			allowCustom: true,
		},
		z_difficulty: [
			["Easy", "Easy"],
			["Normal", "Normal"],
			["Hard", "Hard"],
			["Impossible", "Impossible"],
		],
		survivor_respawn_with_guns: [
			["0", "Just a pistol"],
			["1", "A weaker version of the last main weapon"],
			["2", "The last main weapon"],
		],
		sv_rescue_disabled: BOOL,
		sv_permawipe: BOOL,
		sv_pausable: BOOL,
		sv_cheats: BOOL,
		sv_alltalk: BOOL,
		sv_voiceenable: BOOL,
		director_no_bosses: BOOL,
		director_no_mobs: BOOL,
		director_no_specials: BOOL,
		director_no_survivor_bots: BOOL,
		director_panic_forever: BOOL,
		director_allow_infected_bots: BOOL,
		director_convert_pills: BOOL,
		allow_all_bot_survivor_team: BOOL,
		sb_all_bot_game: BOOL,
		sb_allow_leading: BOOL,
		sb_friendlyfire: BOOL,
		versus_winning_team_goes_last: BOOL,
		sv_allow_votes: BOOL,
		sv_vote_issue_kick_allowed: BOOL,
		sv_vote_issue_change_difficulty_allowed: BOOL,
		sv_vote_issue_change_map_now_allowed: BOOL,
		sv_vote_issue_change_map_later_allowed: BOOL,
		sv_vote_issue_change_mission_allowed: BOOL,
		sv_vote_issue_restart_game_allowed: BOOL,
		sv_vote_show_caller: BOOL,
		sv_consistency: BOOL,
		sv_pure_kick_clients: [
			["0", "Only warn"],
			["1", "Kick"],
		],
		sv_allowdownload: BOOL,
		sv_allowupload: BOOL,
		sv_client_predict: [
			["-1", "Each player chooses"],
			["0", "Force off"],
			["1", "Force on"],
		],
		sv_unlag: BOOL,
		sv_hibernate_when_empty: BOOL,
		sv_logfile: BOOL,
		sv_log_onefile: BOOL,
		sv_logbans: BOOL,
		sv_logecho: BOOL,
		sv_logflush: BOOL,
		sv_rcon_log: BOOL,
		sv_banid_enabled: BOOL,
	},
);

export const l4d2ServerGroupOrder = [
	"Server",
	"Joining",
	"Game rules",
	"Voice",
	"Difficulty tuning",
	"Director",
	"Versus",
	"Survival",
	"Scavenge",
	"Voting",
	"Files and downloads",
	"Network and performance",
	"Logging",
	"Remote console and bans",
];

const launch = {
	title: "Left 4 Dead 2",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Left 4 Dead 2 is started with `+word value` console commands (the map, the player limit) and `-word` launch options (the port, the console). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "left4dead2", description: "Tells srcds which game to run. For Left 4 Dead 2 this has to be left4dead2. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "27245", description: "The port the server listens on and tells players to connect to (UDP). Source's remote console would use the same number over TCP. Change it from the server's Ports section so the panel can check for clashes." }),
		FLAG({ flag: "-strictportbind", label: "Stop if the port is taken", group: "Network", managed: true, description: "If the port is already in use, the server quits with an error instead of quietly using another port. Without it a second server would take another port and players would not find it." }),
		A({ flag: "-ip", style: "space", label: "Listen address", group: "Network", example: "0.0.0.0", description: "The network address the server listens on. It has to be an address of this PC, or 0.0.0.0 for all of them. Only needed with several network cards; it has nothing to do with the address players use from outside." }),
		FLAG({ flag: "-nohltv", label: "No SourceTV", group: "Network", description: "Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020." }),
		FLAG({ flag: "-nomaster", label: "Hide from the server list", group: "Network", description: "Keeps the server out of the master server list, so it does not show in the server browser. Players can still connect by address." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "4", description: "The number of player slots. The game supports 4 in Co-op and 8 in Versus; set 8 for Versus or Scavenge. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "c1m1_hotel", description: "The map the server starts on: the first map of a campaign, such as c1m1_hotel (Dead Center) or c8m1_apartments (No Mercy), or the name of a map from an addon." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the left4dead2\\cfg folder. The panel writes it, and the Settings tab edits it." }),
		A({ flag: "+sv_gametypes", label: "Allowed game modes", group: "Server", example: "coop,versus", description: "The game modes lobbies and players may start on this server, separated by commas without spaces. Valve's default list is coop, realism, survival, versus, scavenge, dash, holdout, shootzones. Leave it out to keep the default." }),
		A({ flag: "+sv_setsteamaccount", label: "Steam login token", group: "Server", example: "…", description: "A Steam Game Server Login Token for this server. It is optional: third-party guides say the server runs and accepts players without one, but without a valid one it may not be listed or may not use VAC. Create one at steamcommunity.com/dev/managegameservers with app ID 550, one token per server. Treat it like a password." }),
		FLAG({ flag: "-condebug", label: "Write the console to a file", edit: false, managed: true, group: "Saves and logs", description: "Writes everything the console prints to console.log in the left4dead2 folder. The Logs tab reads that file." }),
		FLAG({ flag: "-conclearlog", label: "Start console.log afresh", group: "Saves and logs", description: "Empties console.log every time the server starts. It only works together with the option above." }),
		FLAG({ flag: "-insecure", label: "Turn off Valve Anti-Cheat", group: "Advanced", description: "Starts the server without Valve Anti-Cheat (VAC). Servers run with it unless this is on the line." }),
	],
};

const guide = {
	name: "Left 4 Dead 2",
	short: "Left 4 Dead 2",
	summary:
		"Left 4 Dead 2 is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `left4dead2\\cfg` folder of the server. The game does not ship that file, so the panel writes it with the server's name, the password and the setting that lets friends join directly. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "Every setting of the server: its name and password, who can join, the rules, the difficulty and Director tuning, voting, downloads, network limits, logging and the remote console. Only the lines you set are in the file.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`. They must not use the matchmaking menu, because the game starts with `sv_allow_lobby_connect_only` on, which lets nobody in except through a lobby. The panel writes it off. If a friend gets a lobby error, they used matchmaking instead of `connect`.",
		"There is no world or save to back up: a round starts again from the campaign's first map. The backup keeps the settings, the ban lists and the addons folder.",
		"Many of the Difficulty tuning and Director settings are marked as cheat commands on Valve's list. Whether a line in `server.cfg` changes them was not tested, so a value you set there may have no effect. The mode of a map can also be changed by the map command or a lobby, whatever `mp_gamemode` says.",
		"The Steam login token is optional. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.",
		"Mods: Steam Workshop addons given when the server is created are downloaded once into `left4dead2\\addons` as `.vpk` files. Collections are not followed: give the addons' own ids. Every player needs the same addons or is refused. To add more later, copy their `.vpk` files into that folder. SourceMod and Metamod, the usual plugin tools, are not installed by the panel.",
		"The port in the Ports section is the game port: UDP for players and TCP for the remote console. The game also uses UDP 27020 (SourceTV and the Steam client). Two Source servers on one PC both want it, so the second one may take another number.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The game has nothing to save, so that is safe. Valve does not document a close command; the research found only indirect evidence that `quit` works.",
		"The Valve list that the settings come from is a 2021 dump of game version 2.2.2.1. The form leaves out the settings that list does not explain. A setting the file has that the panel does not explain is still shown.",
	],
};

export default {
	type: "l4d2",
	title: "Left 4 Dead 2",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: l4d2ServerSettings,
			groupOrder: l4d2ServerGroupOrder,
			mayBeMissing: "The game does not ship server.cfg and the panel writes it in the left4dead2\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// IOSoccer (Source engine). Its settings are "convars": console variables, written one per line as `name value` in a .cfg file, the same
// shape as Day of Defeat: Source's, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in iosoccer\cfg. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server, and the
//               launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/iosoccer/02-config.md, 03-launch-args.md). The
// descriptions are the dossier's own words (the SteamAH console-command page and the XGamingServer sample), in plainer English. Keys the
// dossier lists without a description or a unit (mp_timelimit_*, mp_pitchtexture, sv_restart ...) are not offered. Two names the sources
// disagree on (mp_chat_match_captain(s)_only, mp_captaincy_home) and the per-side mp_maxplayers are left out for the same reason.

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const iosoccerServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it.", "Server"],
		["sv_lan", "Local network only", "On makes a LAN server: no heartbeat, no authentication and no public listing, so only players on your local network can join. Keep it off for a server friends join over the internet.", "Server"],

		// Match
		["mp_extratime", "Extra time", "Turns extra time on or off when a match is level at full time.", "Match"],
		["mp_penalties", "Penalty shootout", "Turns the penalty shootout on or off when a match is still level after extra time.", "Match"],
		["mp_offside", "Offside rule", "Turns the offside ruling on or off.", "Match"],
		["mp_botkeepers", "Goalkeepers", "Whether the keepers are AI bots (1) or human players (0).", "Match"],
		["mp_captaincy_away", "Away captain", "Lets players take over as captain of the away team. Off means nobody can pick up that role.", "Match"],
		["mp_shield_block_opponent_half", "Cross the mid-line in warm-up", "Lets players cross the middle line during the warm-up. Off keeps each side on its own half.", "Match"],
		["sv_ball_kickoff_chargeblock", "Block charged kicks at kick-off", "Blocks the right mouse button (secondary attack) at kick-off, so players cannot charge a kick straight away. Turn it off to allow it.", "Match"],
		["sv_ball_player_banduration", "Red card ban (minutes)", "How many in-game minutes a player is banned for after a red card.", "Match"],

		// Voice and chat
		["sv_voiceenable", "Voice chat", "Turns voice communication between players on or off.", "Voice and chat"],
		["sv_alltalk", "Everyone hears everyone", "On lets players hear all other players, including the other team. Off keeps voice to each team.", "Voice and chat"],

		// Downloads
		["sv_allowupload", "Players may upload files", "Lets players upload customisation files to the server.", "Downloads"],
		["sv_allowdownload", "Players may download files", "Lets players download files from the server that they are missing.", "Downloads"],

		// Logging
		["sv_logfile", "Write logs to a file", "Writes server information to the log file.", "Logging"],
		["sv_logbans", "Log bans", "Writes the server's bans into the server log.", "Logging"],
	]),
	{
		sv_lan: BOOL,
		mp_extratime: BOOL,
		mp_penalties: BOOL,
		mp_offside: BOOL,
		mp_botkeepers: [
			["1", "AI keepers"],
			["0", "Human keepers"],
		],
		mp_captaincy_away: BOOL,
		mp_shield_block_opponent_half: BOOL,
		sv_ball_kickoff_chargeblock: BOOL,
		sv_voiceenable: BOOL,
		sv_alltalk: BOOL,
		sv_allowupload: BOOL,
		sv_allowdownload: BOOL,
		sv_logfile: BOOL,
		sv_logbans: BOOL,
	},
);

export const iosoccerServerGroupOrder = ["Server", "Match", "Voice and chat", "Downloads", "Logging"];

const launch = {
	title: "IOSoccer",
	program: /\bsrcds(?:_win64)?(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds_win64.exe` line of the server's start script",
	intro: "IOSoccer is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "iosoccer", description: "Tells srcds which game to run. For IOSoccer this is iosoccer. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25948", description: "The port the server uses and players connect to. Change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "32", description: "The number of player slots on the server, from 2 to 33 (spectators included, per a hosting guide). It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "8v8_vienna", description: "The map the server starts on, such as 8v8_vienna. Give the map's name, without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the iosoccer\\cfg folder. The panel writes it, and the Settings tab edits it." }),
	],
};

const guide = {
	name: "IOSoccer",
	short: "IOSoccer",
	summary:
		"IOSoccer is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `iosoccer\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, whether it is local-network only, and the match rules: extra time, penalties, offside, keepers and captains. It also has the voice chat, file download settings and logging. Only the lines you set are in the file.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no stop command the panel can send.",
		"No mod support is set up. The hosting guides install Metamod:Source and SourceMod by hand, and custom maps and team kits need a download server; none of that is covered here. Server-side plugins and custom maps change how the server is run, so check the server after each game update.",
		"Not in the form: the per-side player limit (mp_maxplayers, 1 to 11) and the time settings for breaks between halves, because the sources give different names or no units for them. Set them by hand in the server's cfg folder if you need them.",
	],
};

export default {
	type: "iosoccer",
	title: "IOSoccer",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: iosoccerServerSettings,
			groupOrder: iosoccerServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the iosoccer\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Black Mesa (Source). Its settings are "convars": Source console variables, one per line as `name value` in a .cfg file, so the panel's
// convar reader handles them. One file is offered:
//   server.cfg  in bms\cfg. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server, and the
//               launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/blackmesa/02-config.md, 03-launch-args.md). Keys whose
// description or allowed values the dossier could not confirm are left out or are text boxes. Only the 0/1 choices that the LINODE guide
// gives are offered as dropdowns (sv_lan, sv_logfile, sv_logecho, mp_forcerespawn, mp_friendlyfire, mp_flashlight).

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const blackmesaServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it.", "Server"],
		["mapcyclefile", "Map rotation file", "The name of the text file that lists the maps the server cycles through, one map per line. The guides use mapcycle.txt, kept in the bms\\cfg folder.", "Server"],

		// Joining
		["sv_lan", "Local network only", "On makes a LAN server: no heartbeat, no authentication, and only local addresses. Keep it off for a server friends join over the internet.", "Joining"],
		["sv_allowupload", "Players may upload files", "Lets players upload customisation files to the server. The guides' example turns it on.", "Joining"],
		["sv_allowdownload", "Players may download files", "Lets players download files they are missing from the server. The guides' example turns it on.", "Joining"],
		["sv_downloadurl", "Download web address", "A web address players can download missing files from. Leave it empty to download from the server itself.", "Joining"],
		["mp_allowspectators", "Allow spectators", "Lets people watch a match without playing. The guides' examples differ, so check it once the server runs.", "Joining"],

		// Game rules
		["mp_fraglimit", "Kills to end the map", "The number of kills that ends the map. 0 turns this off. The guides' examples use 30 and 45.", "Game rules"],
		["mp_mapcycle_empty_timeout_seconds", "Seconds empty before a map change", "If the server stays empty on one map for this many seconds, it moves to the next map in the rotation. 0 turns this off. The guide's example is 900.", "Game rules"],
		["mp_teamplay", "Team play", "Turns on team games (marines against scientists). 0 is free-for-all deathmatch, where every player is on their own.", "Game rules"],
		["mp_friendlyfire", "Friendly fire", "On lets team members hurt their own team. Off keeps teammates safe from each other.", "Game rules"],
		["mp_forcerespawn", "Respawn without asking", "On respawns players straight away, without the respawn prompt. Off lets each player choose when to respawn.", "Game rules"],
		["mp_falldamage", "Fall damage", "On lets players take damage from falls. Off makes falls harmless.", "Game rules"],
		["mp_flashlight", "Flashlight", "On allows players to use the flashlight.", "Game rules"],
		["mp_warmup_time", "Warm-up time (seconds)", "How long the warm-up round lasts, in seconds, before the match starts.", "Game rules"],
		["mp_chattime", "Chat time after a map (seconds)", "How many seconds players can chat after the map ends, before the next one starts.", "Game rules"],
		["sv_voiceenable", "Voice chat", "Lets players talk to each other by microphone.", "Game rules"],
		["sv_alltalk", "Everyone hears everyone", "On lets all players hear each other's voice chat, not only their team's.", "Game rules"],

		// Logging
		["sv_logfile", "Write logs to a file", "Writes the server's information into a log file. Where the file is saved is not stated in the guides.", "Logging"],
		["sv_logecho", "Show log lines in the console", "Shows the log information in the server console as well.", "Logging"],
		["sv_logbans", "Log bans", "Writes the server's bans into the server log.", "Logging"],
	]),
	{
		sv_lan: BOOL,
		sv_allowupload: BOOL,
		sv_allowdownload: BOOL,
		mp_forcerespawn: BOOL,
		mp_friendlyfire: BOOL,
		mp_flashlight: BOOL,
		sv_logfile: BOOL,
		sv_logecho: BOOL,
	},
);

export const blackmesaServerGroupOrder = ["Server", "Joining", "Game rules", "Logging"];

const launch = {
	title: "Black Mesa",
	program: /\bsrcds(?:_win64)?(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Black Mesa is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "bms", description: "Tells srcds which game to run. For Black Mesa this is bms, and the guides say not to change it. The panel always writes it." }),
		FLAG({ flag: "-strictportbind", label: "Stop if the port is taken", group: "Network", description: "Makes the server quit with an error if it cannot use its port, rather than starting on another one. Keeps a clash visible." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25916", description: "The port the server uses and players connect to. The panel's Ports section sets it, so the panel can check for clashes." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "24", description: "The number of player slots on the server. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "dm_crossfire", description: "The map the server starts on, such as dm_crossfire. Give the map's file name without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the bms\\cfg folder. The panel writes it, and the Settings tab edits it." }),
	],
};

const guide = {
	name: "Black Mesa",
	short: "Black Mesa",
	summary:
		"Black Mesa is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `bms\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, whether it is listed on the internet, the download settings, the deathmatch rules such as kills to end a map and friendly fire, and the logging. Only the lines you set are in the file.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The guides give `quit` as the console's stop command, but the panel cannot send it.",
		"No Steam login token is asked for. The guides do not say whether this server needs one for the public server list.",
		"Maps and add-ons are not set up here: they are copied into the bms folders by hand and listed in bms\\addonlist.txt, which the panel does not do.",
	],
};

export default {
	type: "blackmesa",
	title: "Black Mesa",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: blackmesaServerSettings,
			groupOrder: blackmesaServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the bms\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

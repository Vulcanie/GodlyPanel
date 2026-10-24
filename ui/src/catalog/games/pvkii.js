import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Pirates, Vikings, and Knights II (srcds). Its settings are "convars": Source console variables, one per line as `name value` in a .cfg
// file, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in pvkii\cfg. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server, and the
//               launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/pvkii/02-config.md, 03-launch-args.md). The keys and
// their comments come from the repository's server.cfg for PVKII (GameServerManagers), with defaults where its "Default:" comments
// give them. Keys whose allowed values the dossier could not confirm are left as text boxes; the on/off keys offer 0 and 1, which the
// dossier's table lists for them.

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const pvkiiServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it.", "Server"],
		["sv_contact", "Admin email", "The server admin's email address, the server's contact. The page's example is email@example.com; use an address you are happy to share.", "Server"],
		["sv_tags", "Browser tags", "Words, separated by commas, that help players filter the server in the in-game browser. The page's examples are vanilla and custom.", "Server"],

		// Joining
		["sv_lan", "Local network only", "On makes a LAN server: it is not listed on the internet. Keep it off for a server friends join over the internet.", "Joining"],
		["sv_allowdownload", "Players may download maps", "Lets players download custom maps and textures from the server, at the slow speed the page gives (20 kbps). Turn it off to stop that.", "Joining"],
		["sv_downloadurl", "Download web address", "A web address players can download custom maps and textures from, with no transfer limit. The page's example is http://example.com/custom.", "Joining"],

		// Game rules
		["mp_timelimit", "Minutes per map", "How many minutes one map is played before the game moves to the next one. The file's example uses 20.", "Game rules"],
		["mp_timelimit_waitroundend", "Wait for round end before changing map", "When the map time is up, wait for the current round to end before changing map.", "Game rules"],
		["mp_roundtime", "Round length (minutes)", "How long one round lasts, in minutes. The page's default is 3.", "Game rules"],
		["mp_roundlimit", "Rounds per map", "How many rounds are played on a map before it changes. The page's default is 0.", "Game rules"],
		["mp_winlimit", "Wins to end the game", "How many round wins end the game. The page's default is 0.", "Game rules"],
		["mp_friendlyfire", "Friendly fire", "On lets team members hurt their own team. Off keeps teammates safe from each other.", "Game rules"],
		["sv_voiceenable", "Voice chat", "Lets players talk to each other by microphone. The page's default is on.", "Game rules"],
		["sv_alltalk", "Everyone hears everyone", "On lets all players hear each other's voice chat, not only their team's.", "Game rules"],

		// Logging
		["log", "Write server logs", "Turns the server's logging on or off. The page's description covers logging to a file, the console and over the network.", "Logging"],
		["sv_logbans", "Log bans", "Writes the server's bans into the server log. The page's default is on.", "Logging"],
		["sv_logecho", "Show log lines in the console", "Shows the log information in the server console as well. The page's default is on.", "Logging"],
		["sv_logfile", "Write logs to a file", "Writes the log information to a file. The page's default is on.", "Logging"],
		["sv_log_onefile", "Use one log file", "Writes the log into a single file instead of separate files. The page's default is off.", "Logging"],
	]),
	{
		sv_lan: BOOL,
		sv_allowdownload: BOOL,
		mp_timelimit_waitroundend: BOOL,
		mp_friendlyfire: BOOL,
		sv_voiceenable: BOOL,
		sv_alltalk: BOOL,
		sv_logbans: BOOL,
		sv_logecho: BOOL,
		sv_logfile: BOOL,
		sv_log_onefile: BOOL,
		log: [
			["on", "On"],
			["off", "Off"],
		],
	},
);

export const pvkiiServerGroupOrder = ["Server", "Joining", "Game rules", "Logging"];

const launch = {
	title: "Pirates, Vikings, and Knights II",
	program: /\bsrcds(?:_win64)?(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds_win64.exe` line of the server's start script",
	intro: "Pirates, Vikings, and Knights II is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "pvkii", description: "Tells srcds which game to run. For Pirates, Vikings, and Knights II this is pvkii. The panel always writes it." }),
		FLAG({ flag: "-strictportbind", label: "Stop if the port is taken", group: "Network", description: "Makes the server quit with an error if it cannot use its port, rather than starting on another one. Keeps a clash visible." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25922", description: "The port the server uses and players connect to. The panel's Ports section sets it, so the panel can check for clashes." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "24", description: "The number of player slots on the server. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "bt_island", description: "The map the server starts on, such as bt_island. Give the map's name, with or without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the pvkii\\cfg folder. The panel writes it, and the Settings tab edits it." }),
	],
};

const guide = {
	name: "Pirates, Vikings, and Knights II",
	short: "Pirates, Vikings, and Knights II",
	summary:
		"Pirates, Vikings, and Knights II is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `pvkii\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, whether it is listed on the internet, the download settings, the round and map timing, the friendly-fire and voice settings, and the logging. Only the lines you set are in the file.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no developer statement of a quit command.",
		"No Steam login token is asked for. The research could not say whether this game needs one for the public server list.",
		"SourceMod plugins are not set up here: a host guide copies them into the folders by hand, which the panel does not do.",
	],
};

export default {
	type: "pvkii",
	title: "Pirates, Vikings, and Knights II",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: pvkiiServerSettings,
			groupOrder: pvkiiServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the pvkii\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

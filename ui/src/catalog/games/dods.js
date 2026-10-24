import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Day of Defeat: Source (srcds). Its settings are "convars": Source console variables, written one per line as `name value` in a .cfg
// file, the same shape as Counter-Strike: Source's, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in dod\cfg. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server, and the
//               launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/dods/02-config.md, 03-launch-args.md). The dossier
// gives a description for these keys in GameServerManagers' server.cfg and Citadel's config page (hostname, rcon_password, sv_password);
// the rest are explained in the words of the dossier's own rows. sv_lan's description is the Valve command-line page's, quoted in the
// Fistful of Frags and No More Room in Hell dossiers, because the DoD:S dossier has none. Keys the dossier only lists with no
// description (mp_friendlyfire, mp_autoteambalance ...) are not offered: the form stays short on purpose.
// sv_pausable and pausable: the two dossiers disagree on the name; `pausable` is GameServerManagers' spelling and is used here.

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const dodsServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it.", "Server"],

		// Joining
		["sv_lan", "Local network only", "On makes a LAN server: only players on your local network can see and join it. Keep it off for a server friends join over the internet.", "Joining"],

		// Game rules
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on.", "Game rules"],
		["sv_aim", "Autoaim help", "Turns on autoaim assistance, which helps players aim. The host example file turns it off.", "Game rules"],
		["pausable", "Allow pausing", "Lets players pause the game. The host example file turns it off.", "Game rules"],
		["sv_maxspeed", "Maximum movement speed", "The fastest a player can move. One host's example file sets 320; changing it changes how fast everyone runs.", "Game rules"],
		["mp_timelimit", "Round time limit (minutes)", "How long a round or map lasts, in minutes, before the next one starts. Two host examples use 20 and 30.", "Game rules"],

		// Logging
		["log", "Write server logs", "Turns the server's log output on or off. The guides suggest on, because it makes errors easier to track down.", "Logging"],
		["sv_logbans", "Log bans", "Writes the server's bans into the server log.", "Logging"],
		["sv_logecho", "Show log lines in the console", "Shows the log information in the server console as well.", "Logging"],
		["sv_logfile", "Write logs to a file", "Writes the log information to a file.", "Logging"],
		["sv_log_onefile", "Use one log file", "Writes the log into a single rolling file instead of separate files.", "Logging"],
	]),
	{
		sv_lan: BOOL,
		sv_cheats: BOOL,
		sv_aim: BOOL,
		pausable: BOOL,
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

export const dodsServerGroupOrder = ["Server", "Joining", "Game rules", "Logging"];

const launch = {
	title: "Day of Defeat: Source",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Day of Defeat: Source is started with `-word` launch options (the game folder, the port, VAC) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "dod", description: "Tells srcds which game to run. For Day of Defeat: Source this is dod. The panel always writes it." }),
		FLAG({ flag: "-secure", label: "Valve Anti-Cheat (VAC)", group: "Security", description: "Runs the server with Valve Anti-Cheat (VAC) protection. The guides say to remove it only if you do not want VAC." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25965", description: "The port the server uses and players connect to. The guides allow 27015 to 27020; change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "32", description: "The number of player slots on the server. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "dod_anzio", description: "The map the server starts on, such as dod_anzio. Give the map's name, with or without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the dod\\cfg folder. The panel writes it, and the Settings tab edits it." }),
		A({ flag: "+sv_setsteamaccount", label: "Steam login token", group: "Server", example: "…", description: "A Steam Game Server Login Token for this server, which other players need to find it in the public list. Create one at steamcommunity.com/dev/managegameservers for game id 232290. Treat it like a password." }),
	],
};

const guide = {
	name: "Day of Defeat: Source",
	short: "Day of Defeat: Source",
	summary:
		"Day of Defeat: Source is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `dod\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, whether it is local-network only, whether cheats are allowed, the logging, and a few round and movement settings. Only the lines you set are in the file. Other game rules are not in the form because the research did not describe them.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The Steam login token is needed for other players to find the server in the public list. Create it for game id 232290 and add it with the Steam login token argument in Launch options. It is a secret: do not share it.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command.",
		"No mod support is set up. The guides install SourceMod and MetaMod by hand; that is not covered here. A game update through the panel could reset a `server.cfg` that the game ships, so check the name and password after updating.",
		"The guides disagree on whether the game uses the port range 27015 to 27020 or a port of 2456 for players to connect. The panel uses the port set in the Ports section.",
	],
};

export default {
	type: "dods",
	title: "Day of Defeat: Source",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: dodsServerSettings,
			groupOrder: dodsServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the dod\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

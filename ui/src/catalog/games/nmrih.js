import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// No More Room in Hell (srcds). Its settings are "convars": Source console variables, written one per line as `name value` in a .cfg
// file, the same shape as Counter-Strike: Source's, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in nmrih\cfg. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server, and the
//               launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/nmrih/02-config.md, 03-launch-args.md). The descriptions
// are the words of XGamingServer's sample file and setup guide, as the dossier cites them; no developer reference was found. Two keys
// are in that sample with a conflicting default (sv_alltalk); its description is the same either way. The map rotation file is not
// offered: its name and folder are only from the host guides.

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const nmrihServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console. Anyone with it can run server commands, so choose a long one. The panel does not use it.", "Server"],
		["sv_tags", "Browser tags", "Words that show in the server browser so players can filter servers: vanilla for the default rules, custom for custom gameplay or mods.", "Server"],
		["sv_setsteamaccount", "Steam login token", "The Steam Game Server Login Token, which other players need to join the server. Create one at steamcommunity.com/dev/managegameservers for game id 317670. Treat it like a password.", "Server"],

		// Joining
		["sv_lan", "Local network only", "On makes the server local-network only: it will not show on the internet, and only players on your network can join. Keep it off for a server friends join over the internet.", "Joining"],

		// Game rules
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on.", "Game rules"],
		["sv_difficulty", "Difficulty", "The server's difficulty, casual or classic. The guide does not say what each one changes.", "Game rules"],
		["mp_friendlyfire", "Friendly fire", "Lets players hurt their own team. Off keeps teammates from injuring each other.", "Game rules"],
		["mp_timelimit", "Map time limit (minutes)", "Minutes on one map before the server moves to the next map by itself. The guide's example uses 45.", "Game rules"],
		["mp_maxrounds", "Rounds per map", "The number of rounds played on one map before the server moves to the next. The guide's example uses 2.", "Game rules"],
		["sv_alltalk", "Everyone hears everyone", "Lets players hear all other players, whatever team they are on.", "Game rules"],

		// Voice and downloads
		["sv_voiceenable", "Voice chat", "Lets players talk to each other through a microphone.", "Voice and downloads"],
		["sv_allowdownload", "Players may download files", "Lets players download custom files, such as maps, from the server. It is slow; a web address is faster (see below).", "Voice and downloads"],
		["sv_downloadurl", "Download web address", "A web address players download custom files from, if you host them on a web server. Leave it empty to use the server.", "Voice and downloads"],

		// Logging
		["log", "Write server logs", "Turns the server's log output on or off. The guides suggest on, because it makes errors easier to track down.", "Logging"],
		["sv_logbans", "Log bans", "Writes the server's bans into the server log.", "Logging"],
		["sv_logecho", "Show log lines in the console", "Shows the log information in the server console as well.", "Logging"],
		["sv_logfile", "Write logs to a file", "Writes the log information to a file.", "Logging"],
	]),
	{
		sv_lan: BOOL,
		sv_cheats: BOOL,
		mp_friendlyfire: BOOL,
		sv_alltalk: BOOL,
		sv_voiceenable: BOOL,
		sv_allowdownload: BOOL,
		sv_logbans: BOOL,
		sv_logecho: BOOL,
		sv_logfile: BOOL,
		sv_difficulty: [
			["casual", "Casual"],
			["classic", "Classic"],
		],
		log: [
			["on", "On"],
			["off", "Off"],
		],
	},
);

export const nmrihServerGroupOrder = ["Server", "Joining", "Game rules", "Voice and downloads", "Logging"];

const launch = {
	title: "No More Room in Hell",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "No More Room in Hell is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "nmrih", description: "Tells srcds which game to run. For No More Room in Hell this is nmrih. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25985", description: "The port the server uses and players connect to. The generic default is 27015; change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "8", description: "The number of player slots on the server. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "nmo_broadway", description: "The map the server starts on, such as nmo_broadway. Give the map's name, with or without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the nmrih\\cfg folder. The panel writes it, and the Settings tab edits it." }),
		A({ flag: "+sv_setsteamaccount", label: "Steam login token", group: "Server", example: "…", description: "A Steam Game Server Login Token for this server, which other players need to join. Create one at steamcommunity.com/dev/managegameservers for game id 317670. Treat it like a password." }),
	],
};

const guide = {
	name: "No More Room in Hell",
	short: "No More Room in Hell",
	summary:
		"No More Room in Hell is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `nmrih\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, the remote console password, the browser tags, the difficulty, the round and map rules, friendly fire, voice and downloads, and the logging. Only the lines you set are in the file.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The install may need a Steam account that owns the game, and one source says anonymous login does not work for this server. If the install fails, the install step is the thing to check first.",
		"The Steam login token is needed for other players to join. It is a secret: do not share it.",
		"The guides disagree on the port players use: the generic 27015, or 2456 in one host guide. The panel uses the port set in the Ports section.",
		"The guides disagree on the start map (nmo_broadway or de_dust). The panel starts nmo_broadway; change it in the Launch options if it does not load.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. No quit command was found.",
		"Map rotation (mapcycle.txt) and plugins (Metamod:Source and SourceMod) are not set up by the panel. Custom maps go in the nmrih\\maps folder, and players need them too.",
	],
};

export default {
	type: "nmrih",
	title: "No More Room in Hell",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: nmrihServerSettings,
			groupOrder: nmrihServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the nmrih\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

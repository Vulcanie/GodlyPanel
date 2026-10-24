import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Fistful of Frags (srcds). Its settings are "convars": Source console variables, written one per line as `name value` in a .cfg file,
// the same shape as Counter-Strike: Source's, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in fof\cfg. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server, and the
//               launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/fof/02-config.md, 03-launch-args.md). The descriptions
// are the words of XGamingServer's template (its file comments) and the Pingperfect and EmeraldHost guides, as the dossier cites them;
// no developer reference was found. Left out on purpose: fof_sv_currentmode (the sources disagree on what its numbers mean), mapcyclefile
// (the sources disagree on the folder), sv_log_onefile (its own comments contradict each other) and -ip (its meaning is disputed).

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const fofServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console. Anyone with it can run server commands, so choose a long one. The panel does not use it.", "Server"],
		["sv_tags", "Browser tags", "Words that show in the server browser so players can filter servers, such as vanilla or custom.", "Server"],
		["sv_setsteamaccount", "Steam login token", "The Steam Game Server Login Token, which other players need to find the server in the public list. Create one at steamcommunity.com/dev/managegameservers for game id 295230. Treat it like a password.", "Server"],

		// Joining
		["sv_lan", "Local network only", "On makes the server local-network only: it will not show on the internet, and only players on your network can join. Keep it off for a server friends join over the internet.", "Joining"],

		// Game rules
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on.", "Game rules"],
		["mp_teamplay", "Team play", "Free-for-all puts every player against every other. Teams splits players into teams in the team modes.", "Game rules"],
		["fof_sv_maxteams", "Number of teams", "How many teams the server uses, from 2 to 4. The guide lists the team names for each number.", "Game rules"],
		["mp_friendlyfire", "Friendly fire", "Lets players hurt their own team. Off keeps teammates from injuring each other.", "Game rules"],
		["mp_timelimit", "Map time limit (minutes)", "Minutes on one map before the server moves to the next map by itself. 0 turns the limit off. One host example uses 45.", "Game rules"],
		["sv_alltalk", "Everyone hears everyone", "Lets players hear all other players, whatever team they are on.", "Game rules"],

		// Bots
		["fof_sv_bot_dynamicjoin", "Let bots join", "Allows bots to join the server to fill its slots.", "Bots"],
		["fof_sv_bot_slotpct", "Bot share of slots", "The share of the server's slots bots may take, written as the guide does: 0.40 in the example.", "Bots"],

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
		fof_sv_bot_dynamicjoin: BOOL,
		sv_voiceenable: BOOL,
		sv_allowdownload: BOOL,
		sv_logbans: BOOL,
		sv_logecho: BOOL,
		sv_logfile: BOOL,
		mp_teamplay: [
			["0", "Free-for-all"],
			["1", "Teams"],
		],
		fof_sv_maxteams: [
			["2", "2 teams"],
			["3", "3 teams"],
			["4", "4 teams"],
		],
		log: [
			["on", "On"],
			["off", "Off"],
		],
	},
);

export const fofServerGroupOrder = ["Server", "Joining", "Game rules", "Bots", "Voice and downloads", "Logging"];

const launch = {
	title: "Fistful of Frags",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Fistful of Frags is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "fof", description: "Tells srcds which game to run. For Fistful of Frags this is fof. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25975", description: "The port the server uses and players connect to. The guides use 27015 as the default; change it from the server's Ports section so the panel can check for clashes." }),
		FLAG({ flag: "-insecure", label: "Turn off Valve Anti-Cheat", group: "Security", description: "Starts the server without Valve Anti-Cheat (VAC). Only use it if you know why you want that." }),
		FLAG({ flag: "-norestart", label: "Do not restart on a crash", group: "Advanced", description: "Stops the server from trying to restart itself after it fails." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "16", description: "The number of player slots on the server. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "fof_fistful", description: "The map the server starts on, such as fof_fistful or fof_revenge. Give the map's name, with or without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the fof\\cfg folder. The panel writes it, and the Settings tab edits it." }),
	],
};

const guide = {
	name: "Fistful of Frags",
	short: "Fistful of Frags",
	summary:
		"Fistful of Frags is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `fof\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, the remote console password, the browser tags, the team and friendly-fire rules, bots, voice and downloads, and the logging. Only the lines you set are in the file.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`, or the link `steam://connect/<address>:<port>`. The developer console must be on to type it.",
		"The guides disagree on the file name. This panel writes and edits `server.cfg`. One host guide says the server only reads `fofserver.cfg`; if your server ignores your changes, check which file it reads.",
		"The Steam login token is written into `server.cfg` as `sv_setsteamaccount`, the host guide's place for it. The research could not say whether public listing needs one. It is a secret: do not share it.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The guides disagree on whether the game answers a graceful shutdown.",
		"Plugins (Metamod:Source and SourceMod) are installed by hand; the panel does not set them up. Map files (.bsp) go in the fof\\maps folder, and players need custom maps too.",
		"The game-mode setting (fof_sv_currentmode) is not in the form: the sources give different meanings for its numbers. A setting the file has that the panel does not explain is still shown.",
	],
};

export default {
	type: "fof",
	title: "Fistful of Frags",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: fofServerSettings,
			groupOrder: fofServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the fof\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

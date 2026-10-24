import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Dystopia (srcds). Its settings are "convars": Source console variables, one per line as `name value` in a .cfg file, so the panel's
// convar reader handles them. One file is offered:
//   server.cfg  in dystopia\cfg. The panel writes it with the server's name, the password, sv_lan 0 and log on when it creates the
//               server, and the launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/dystopia/02-config.md, 03-launch-args.md). Most come
// from the GameServerManagers sample server.cfg for Dystopia, whose comments give the descriptions. The dossier's table gives 0 and 1
// as the values for the on/off keys; sv_lan and the sv_log* keys are offered the same way, which no page read confirmed for them.
// mp_startdelay is left out: its two sources give different values (60 and 40).

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const dystopiaServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it.", "Server"],
		["sv_contact", "Admin email", "The server admin's email address, as the server's contact. The guide's example is email@example.com.", "Server"],

		// Joining
		["sv_lan", "Local network only", "On makes a LAN server: the server does not show on the internet. Keep it off for a server friends join over the internet.", "Joining"],
		["sv_alltalk", "Everyone hears everyone", "On lets all players hear each other's voice chat, not only their team's.", "Joining"],

		// Game rules
		["mp_timelimit", "Minutes per round", "How long a round lasts, in minutes, before the next one starts. The file says the usual value for Dystopia is 20.", "Game rules"],
		["mp_rounds", "Rounds per map", "How many rounds are played before the map changes. Setting it to 0 is the same as 1, the file says.", "Game rules"],
		["mp_stopwatch", "Stopwatch mode", "On gives twice the number of rounds set by Rounds per map on each map, as Stopwatch play does.", "Game rules"],
		["mp_friendlyfire", "Friendly fire", "On lets players hurt their own team. Off keeps teammates safe from each other.", "Game rules"],
		["mp_autoteambalance", "Keep teams even", "On lets the server move players automatically so the teams stay even.", "Game rules"],
		["mp_chattime", "Chat time after a round (seconds)", "How many seconds players can chat after a round ends, before the next one starts.", "Game rules"],
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on.", "Game rules"],
		["sv_idlekick", "Kick idle players", "What happens to players who sit idle: 0 never kicks them, 1 kicks non-spectators, 2 kicks any player.", "Game rules"],
		["mp_punishvotes", "Team-kill punish votes", "How many punish votes against a team-killer ban him from the server. The file says 0 turns this off.", "Game rules"],

		// Voting
		["mp_allowvoting", "Players may call votes", "On lets players start votes at all. The other vote settings only matter when this is on.", "Voting"],
		["mp_allowvoting_map", "Vote to change map", "On lets players vote to change the map.", "Voting"],
		["mp_allowvoting_maprestart", "Vote to restart map", "On lets players vote to restart the map.", "Voting"],
		["mp_allowvoting_balanceteams", "Vote to balance teams", "On lets players vote to balance the teams.", "Voting"],
		["mp_allowvoting_kick", "Vote to kick players", "On lets players vote to kick or ban another player.", "Voting"],
		["mp_votekick_bantime", "Vote-ban length (minutes)", "How long a player banned by a vote stays banned, in minutes. 0 means a vote only kicks the player out.", "Voting"],
		["mp_votepct", "Votes needed to pass (percent)", "The share of players, as a percentage, needed for a vote to pass. The file's example is 51.", "Voting"],
		["mp_allowvoting_stopwatch", "Vote to toggle Stopwatch", "On lets players vote to switch Stopwatch mode on or off.", "Voting"],
		["mp_allowvoting_forcespec", "Vote to move a player to spectators", "On lets players vote to move another player onto the spectators' team.", "Voting"],

		// Logging
		["log", "Write server logs", "Turns the server's logging on or off. The panel writes log on, which the guides recommend.", "Logging"],
		["sv_logbans", "Log bans", "Writes the server's bans into the server log.", "Logging"],
		["sv_logecho", "Show log lines in the console", "Shows the log information in the server console as well.", "Logging"],
		["sv_logfile", "Write logs to a file", "Writes the log information to a file.", "Logging"],
		["sv_log_onefile", "Use one log file", "Writes the log into a single file instead of separate files.", "Logging"],
	]),
	{
		sv_lan: BOOL,
		sv_alltalk: BOOL,
		sv_cheats: BOOL,
		mp_stopwatch: BOOL,
		mp_friendlyfire: BOOL,
		mp_autoteambalance: BOOL,
		sv_idlekick: [
			["0", "Never"],
			["1", "Non-spectators"],
			["2", "Anyone"],
		],
		mp_allowvoting: BOOL,
		mp_allowvoting_map: BOOL,
		mp_allowvoting_maprestart: BOOL,
		mp_allowvoting_balanceteams: BOOL,
		mp_allowvoting_kick: BOOL,
		mp_allowvoting_stopwatch: BOOL,
		mp_allowvoting_forcespec: BOOL,
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

export const dystopiaServerGroupOrder = ["Server", "Joining", "Game rules", "Voting", "Logging"];

const launch = {
	title: "Dystopia",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Dystopia is started with `-word` launch options (the console window, the game folder, the port, VAC) and `+word value` console commands (the map, the settings file). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "..\\..\\dystopia", description: "Tells srcds where the game's folder is, relative to the server's bin\\win32 folder. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25924", description: "The port the server uses and players connect to. The panel's Ports section sets it, so the panel can check for clashes." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "dys_vaccine", description: "The map the server starts on, such as dys_vaccine. Give the map's name, with or without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the dystopia\\cfg folder. The panel writes it, and the Settings tab edits it." }),
		FLAG({ flag: "-insecure", label: "Run without Valve Anti-Cheat", group: "Security", description: "Starts the server without Valve Anti-Cheat (VAC). Leave it off unless you know you need it; the Valve page only describes what the flag does." }),
		FLAG({ flag: "-nobots", label: "No bots", group: "Server", description: "Turns bots off on the server, so only real players fill the slots." }),
		FLAG({ flag: "-nohltv", label: "No SourceTV", group: "Network", description: "Turns off SourceTV, the spectator broadcast, and closes its port (usually 27020)." }),
	],
};

const guide = {
	name: "Dystopia",
	short: "Dystopia",
	summary:
		"Dystopia is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `dystopia\\cfg` folder of the server. The panel writes that file with the server's name, the password, `sv_lan 0` and `log on`. The map and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, whether it shows on the internet, the round and map timing, the friendly-fire and team settings, the vote settings, and the logging. Only the lines you set are in the file.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join from the in-game console with `connect <your address>:<port>`.",
		"No Steam login token is asked for: the guides say a server without one still shows in the server browser.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented quit command.",
		"The map list (cfg\\mapcycle.txt) is not offered: the research did not find its format.",
		"No mod support is set up. The research found no server-side mod install method for Dystopia.",
	],
};

export default {
	type: "dystopia",
	title: "Dystopia",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: dystopiaServerSettings,
			groupOrder: dystopiaServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the dystopia\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

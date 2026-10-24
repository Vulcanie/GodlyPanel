import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Nuclear Dawn (Source engine). Its settings are convars: one per line as `name value` in a .cfg file, the same shape as Day of Defeat's,
// so the panel's convar reader handles them. One file is offered:
//   server.cfg  in nucleardawn\cfg (UNVERIFIED: no fetched page gives the folder). The panel writes it with the server's name, the password and
//               sv_lan 0 when it creates the server, and the launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/nucleardawn/02-config.md, 03-launch-args.md). Only one
// third-party sample (XGamingServer) lists these names, so only the keys whose sample wording and quick-reference wording agree are offered.
// Keys the sample and its quick reference disagree on (sv_region, sv_alltalk, mp_limitteams, mp_autoteambalance, mp_timelimit, sv_log_onefile)
// and the RCON keys are left out on purpose.

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const nucleardawnServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server. Keep it under 64 characters.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],

		// Joining
		["sv_lan", "Local network only", "LAN mode: when on, the server does not show on the internet. Keep it off for a server friends join over the internet.", "Joining"],
		["sv_voiceenable", "Voice chat", "Turns in-game voice chat on or off for the whole server.", "Joining"],
		["mp_allowspectators", "Allow spectators", "Lets players join as spectators, watching the game without playing.", "Joining"],
		["mp_force_autoassign", "Assign teams automatically", "Puts players on a team when they join, instead of letting them choose one.", "Joining"],

		// Rounds
		["mp_roundtime", "Round length (minutes)", "How long one round lasts, in minutes. The sample file uses 35.", "Rounds"],
		["mp_maxrounds", "Rounds per match", "The number of rounds in a match before the map changes. The sample file uses 2.", "Rounds"],

		// Logging
		["log", "Write server logs", "Turns the server's log output on or off. When on, the server writes its log to the logs folder.", "Logging"],
		["sv_logfile", "Write logs to a file", "Logs server information to a file.", "Logging"],
		["sv_logecho", "Show log lines in the console", "Repeats the log lines in the server console as well.", "Logging"],
	]),
	{
		sv_lan: BOOL,
		sv_voiceenable: BOOL,
		mp_allowspectators: BOOL,
		mp_force_autoassign: BOOL,
		sv_logfile: BOOL,
		sv_logecho: BOOL,
		log: [
			["on", "On"],
			["off", "Off"],
		],
	},
);

export const nucleardawnServerGroupOrder = ["Server", "Joining", "Rounds", "Logging"];

const launch = {
	title: "Nuclear Dawn",
	program: /\bndsrv(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `ndsrv.exe` line of the server's start script",
	intro: "Nuclear Dawn is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map, the settings file). They are read when the server starts, so changes apply the next time it starts.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "nucleardawn", description: "Tells the server which game to run. For Nuclear Dawn this is nucleardawn. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25961", description: "The port the server uses and players connect to. The default in the guides is 27015; change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "32", description: "The number of player slots on the server. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "downtown", description: "The map the server starts on, such as downtown. Give the map's name without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the nucleardawn\\cfg folder. The panel writes it, and the Settings tab edits it." }),
	],
};

const guide = {
	name: "Nuclear Dawn",
	short: "Nuclear Dawn",
	summary:
		"Nuclear Dawn's settings are lines of a name and a value in `server.cfg`. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, whether it is local-network only, voice chat, spectators, team assignment, round and logging settings. Only the lines you set are in the file.",
	},
	notes: [
		"The settings are in server.cfg. Its folder is not confirmed by the research: the panel uses nucleardawn\\cfg, and if the game does not read the file there, check the server's log.",
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"Some guides say Nuclear Dawn ignores a graceful shutdown. The panel asks the window to close and, after 15 seconds, ends the program, so the server may not save its state cleanly. The research found no documented close command.",
		"The panel has no way to type into this server's console.",
	],
};

export default {
	type: "nucleardawn",
	title: "Nuclear Dawn",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: nucleardawnServerSettings,
			groupOrder: nucleardawnServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the nucleardawn\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

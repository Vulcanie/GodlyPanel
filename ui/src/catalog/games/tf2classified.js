import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Team Fortress 2 Classified (srcds_win64.exe, game folder tf2classified). Its settings are "convars": Source console variables, one
// `name value` per line in a .cfg file, the same shape as the other Source games here. One file is offered:
//   server.cfg  in tf2classified\cfg. The panel writes it with the server's name and the password when it creates the server, and the
//               launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/tf2classified/02-config.md, 03-launch-args.md). The
// dossier names only three settings, and gives no type, default or allowed value for any of them: hostname and sv_password are the
// engine's own names used by every Source game here; mp_timelimit is the dossier's example line. Nothing else is offered.

export const tf2cServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],

		// Game rules
		["mp_timelimit", "Time limit (minutes)", "How long each map lasts, in minutes. The research's example sets 30.", "Game rules"],
	]),
	{},
);

export const tf2cServerGroupOrder = ["Server", "Game rules"];

const launch = {
	title: "Team Fortress 2 Classified",
	program: /\bsrcds(?:_win64)?(?:\.exe)?\b/i,
	// `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds_win64.exe` line of the server's start script",
	intro: "Team Fortress 2 Classified is started with `-word` launch options (the Steam option, the game folder, the port, the console) and `+word value` console commands. They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-steam", label: "Steam mode", edit: false, managed: true, group: "Required", description: "Tells the server to run with Steam. It is the one server option on the research's SteamCMD listing, so the panel always writes it." }),
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "tf2classified", description: "Tells the server which game folder to run. For Team Fortress 2 Classified this is tf2classified. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25930", description: "The port the server listens on and tells players to connect to. Change it from the server's Ports section so the panel can check for clashes. The research found no port on any page for this game." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the tf2classified\\cfg folder. The panel writes it, and the Settings tab edits it." }),
		A({ flag: "+map", label: "Start map", group: "World", example: "a map name", description: "The map the server starts on. The research names no map for this game, so give a map name you know exists. Left out, the server picks its own start map." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", example: "a number", description: "How many players can be on the server at once. The research names no default or limit for this game, so give a number you have checked. Left out, the server uses its own limit." }),
	],
};

const guide = {
	name: "Team Fortress 2 Classified",
	short: "TF2 Classified",
	summary:
		"Team Fortress 2 Classified is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `tf2classified\\cfg` folder of the server. The panel writes that file with the server's name and the password. The port is on the launch line, with the Steam option and the game folder.",
	files: {
		"server.cfg": "The server's name, the join password and the time limit of each map. Only the lines you set are in the file. The research could not find the other settings for this game, so the form is short.",
	},
	notes: [
		"The research could not reach the game's wiki or the Valve command-line page, so the form is short. You can type other settings as new lines in `server.cfg` (a setting the panel does not explain is still shown).",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command, so a save may not finish.",
		"The map and the player limit are not set by default: the research names no default for either. Use the Launch options form to set them, and check the names against the game.",
		"No mods are set up by the panel. The research says the game supports mods, but found no install method.",
	],
};

export default {
	type: "tf2classified",
	title: "Team Fortress 2 Classified",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: tf2cServerSettings,
			groupOrder: tf2cServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the tf2classified\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

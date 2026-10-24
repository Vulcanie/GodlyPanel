import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Military Conflict: Vietnam (srcds). Its settings are "convars": Source console variables, one per line as `name value` in a .cfg
// file, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in vietnam\cfg. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server, and the
//               launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/militaryconflictvietnam/02-config.md, 03-launch-args.md),
// which quotes the host's console-commands page. Keys whose values the dossier could not confirm are plain text boxes, not dropdowns.

export const mcvServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console. Anyone with it can run server commands, so choose a long one. The panel does not use it.", "Server"],
		["sv_downloadurl", "Download web address", "A web address players can download custom maps and files from. The host's FastDL page says it adds this line for you when FastDL is on.", "Server"],

		// Game rules
		["mp_timelimit", "Minutes per map", "How many minutes of game time one map is played for. The host's page gives 15 as the default.", "Game rules"],
		["mp_roundtime", "Round length (minutes)", "How many minutes one round runs for. The host's page gives 2 as the default.", "Game rules"],
		["mp_friendlyfire", "Friendly fire", "Lets players damage their own teammates. The host's page gives 0 (off) as the default.", "Game rules"],
		["mp_autoteambalance", "Balance teams automatically", "Evens up the teams automatically when they drift apart. The host's page gives 0 (off) as the default.", "Game rules"],
		["bot_quota", "Bots", "How many bots fill out the server. The host's page gives 0 as the default, which is none.", "Game rules"],
		["sv_alltalk", "Everyone hears everyone", "Lets both teams hear each other on voice chat. The host's page gives 1 (on) as the default.", "Game rules"],
		["sv_gravity", "World gravity", "Sets how strongly things fall in the world. The host's page gives 800 as the default.", "Game rules"],

		// Cheats
		["sv_cheats", "Allow cheat commands", "Allows cheat commands to be used on the server. The host's page gives 0 (off) as the default; leave it off unless you know you need it.", "Cheats"],
	]),
	{},
);

export const mcvServerGroupOrder = ["Server", "Game rules", "Cheats"];

const launch = {
	title: "Military Conflict: Vietnam",
	program: /\bsrcds(?:_x64|_win64)?(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds_x64.exe` line of the server's start script",
	intro: "Military Conflict: Vietnam is started with `-word` launch options (the game folder, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "vietnam", description: "Tells srcds which game folder to run. For Military Conflict: Vietnam this is vietnam. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25970", description: "The port the server uses and players connect to. The panel's Ports section sets it, so the panel can check for clashes." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "24", description: "The number of player slots on the server. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "mcv_bridge", description: "The map the server starts on, such as mcv_bridge. Give the map's name, without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the vietnam\\cfg folder. The panel writes it, and the Settings tab edits it." }),
	],
};

const guide = {
	name: "Military Conflict: Vietnam",
	short: "Military Conflict: Vietnam",
	summary:
		"Military Conflict: Vietnam is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `vietnam\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map and the player limit are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, the download address, the round and map timing, the friendly-fire and team settings, the bots and cheats. Only the lines you set are in the file.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"Game type and game mode (for example Classic and TeamDeathmatch) are not offered here: the research found no launch argument or file key for them, and the host's guide sets them in its own panel.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no developer statement of a quit command.",
		"No Steam login token is asked for. The research could not say whether this game needs one for the public server list.",
		"SourceMod and Metamod plugins are not set up here: a host guide copies them into the folders by hand, which the panel does not do.",
	],
};

export default {
	type: "militaryconflictvietnam",
	title: "Military Conflict: Vietnam",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: mcvServerSettings,
			groupOrder: mcvServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the vietnam\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

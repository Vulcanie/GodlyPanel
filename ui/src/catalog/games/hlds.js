import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Half-Life Dedicated Server (GoldSrc, running Counter-Strike 1.6 from the cstrike folder). Its settings are console variables, one per line
// as `name value` in a .cfg file, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in cstrike. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server, and the
//               launch line runs it with `-exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/hlds/02-config.md, 03-launch-args.md). The names come
// from Valve's and GameHostBros' pages and from the Docker example's server.cfg, and each description is the words of that source. Keys
// the dossier only lists with no description, or only as ReHLDS-only engine cvars, are not offered.
// sv_password is not on any fetched page for this game; it is the join password the form needs, and it is listed for real-install checking.

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const hldsServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],

		// Joining
		["sv_lan", "Local network only", "On makes a LAN server: only players on your local network can see and join it. Keep it off for a server friends join over the internet.", "Joining"],

		// Game rules
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands. The example server file turns them off; keep them off on a server other people play on.", "Game rules"],
		["sv_maxspeed", "Maximum movement speed", "The fastest a player can move. One example file sets 320; changing it changes how fast everyone runs.", "Game rules"],
		["mp_timelimit", "Map time limit (minutes)", "How many minutes a map lasts before it changes. The example server file uses 20.", "Game rules"],
		["mp_maxrounds", "Rounds before map change", "The number of rounds played before the map changes.", "Game rules"],
	]),
	{
		sv_lan: BOOL,
		sv_cheats: BOOL,
	},
);

export const hldsServerGroupOrder = ["Server", "Joining", "Game rules"];

const launch = {
	title: "Half-Life Dedicated Server",
	program: /\bhlds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `hlds.exe` line of the server's start script",
	intro: "Half-Life Dedicated Server is started with `-word` launch options (the game folder, the port, the settings file) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode, a text window you can type commands into. The guide says this works on Windows; the panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "cstrike", description: "Tells the server which game to run. cstrike is Counter-Strike 1.6. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25944", description: "The port the server uses and players connect to. The default in the guides is 27015; change it from the server's Ports section so the panel can check for clashes." }),
		FLAG({ flag: "-nomaster", label: "Hide from the server browser", group: "Network", description: "Keeps the server out of the public server browser. Its guide also says it turns off server queries." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "32", description: "The number of player slots on the server. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "de_dust2", description: "The map the server starts on, such as de_dust2. Give the map's name without .bsp." }),
		A({ flag: "-exec", style: "space", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the cstrike folder. The panel writes it, and the Settings tab edits it." }),
	],
};

const guide = {
	name: "Half-Life Dedicated Server",
	short: "Half-Life (GoldSrc) server",
	summary:
		"This server runs Counter-Strike 1.6 from the `cstrike` folder. Its settings are lines of a name and a value in `server.cfg`, in the `cstrike` folder of the server (it replaces the stock one). The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, whether it is local-network only, whether cheats are allowed, and a few round and movement settings. Only the lines you set are in the file.",
	},
	notes: [
		"The server runs Counter-Strike 1.6 from the cstrike folder. Other games that use this program need other folders and are not set up here.",
		"The settings are in server.cfg. The game reads it when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"Valve no longer updates this server, and the guides suggest ReHLDS for a newer engine. This panel does not install ReHLDS or any mod.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command.",
	],
};

export default {
	type: "hlds",
	title: "Half-Life Dedicated Server",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: hldsServerSettings,
			groupOrder: hldsServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the cstrike folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

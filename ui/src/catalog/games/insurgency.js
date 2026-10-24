import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Insurgency (2014) (srcds). Its settings are "convars": Source console variables, one per line as `name value` in a .cfg file, so the
// panel's convar reader handles them. One file is offered:
//   server.cfg  in insurgency\cfg. The panel writes it with the server's name and password when it creates the server, and the launch
//               line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/insurgency/02-config.md, 03-launch-args.md), which
// rests on Valve's developer wiki page for the 2014 dedicated server. That page gives a description for hostname, rcon_password,
// sv_password, sv_minrate and the map-cycle file names. Keys it lists without a description (the sv_log* keys, log, sv_downloadurl) are
// not offered. sv_playlist is left out: the sources disagree on its values (see the dossier's Conflicts).

const MAP_CYCLES = [
	["mapcycle.txt", "Mostly the popular modes (mapcycle.txt, the default)"],
	["mapcycle_all.txt", "Every PvP map and mode combination (mapcycle_all.txt)"],
	["mapcycle_ambush.txt", "Ambush (VIP) mode only (mapcycle_ambush.txt)"],
	["mapcycle_attackdefend.txt", "A mix of attack and defend modes (mapcycle_attackdefend.txt)"],
	["mapcycle_cooperative.txt", "Cooperative: checkpoint, outpost and hunt (mapcycle_cooperative.txt)"],
	["mapcycle_firefight.txt", "All Firefight maps (mapcycle_firefight.txt)"],
	["mapcycle_flashpoint.txt", "All Flashpoint maps (mapcycle_flashpoint.txt)"],
	["mapcycle_infiltrate.txt", "All Infiltrate (capture the flag) maps (mapcycle_infiltrate.txt)"],
	["mapcycle_objrespawn.txt", "Modes with respawns for completing objectives (mapcycle_objrespawn.txt)"],
	["mapcycle_occupy.txt", "All Occupy maps (mapcycle_occupy.txt)"],
	["mapcycle_push.txt", "All Push maps (mapcycle_push.txt)"],
	["mapcycle_singlelife.txt", "A mix of the single-life modes (mapcycle_singlelife.txt)"],
	["mapcycle_skirmish.txt", "All Skirmish maps (mapcycle_skirmish.txt)"],
	["mapcycle_workshop.txt", "The Workshop rotation (mapcycle_workshop.txt)"],
];

export const insurgencyServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it.", "Server"],

		// Network
		["sv_minrate", "Minimum data rate", "The lowest data rate, in bytes per second, a player's connection may be set to. The Valve page's example uses 30000; the page gives no default.", "Network"],

		// Maps
		["mapcyclefile", "Map rotation file", "The file that lists the maps the server cycles through. The Valve page names the files below; mapcycle.txt holds the most popular options.", "Maps"],
	]),
	{
		mapcyclefile: { choices: MAP_CYCLES },
	},
);

export const insurgencyServerGroupOrder = ["Server", "Network", "Maps"];

const launch = {
	title: "Insurgency (2014)",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Insurgency (2014) is started with `-word` launch options (the console window, the port) and `+word value` console commands (the player limit, the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25934", description: "The port the server uses and players connect to. The panel's Ports section sets it, so the panel can check for clashes." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "32", description: "The number of player slots on the server. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "market_coop", description: "The map the server starts on, such as market_coop. Give the map's name, with or without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the insurgency\\cfg folder. The panel writes it, and the Settings tab edits it." }),
		FLAG({ flag: "-insecure", label: "Run without Valve Anti-Cheat", group: "Security", description: "Starts the server without Valve Anti-Cheat (VAC). Leave it off unless you know you need it; the Valve page only describes what the flag does." }),
		FLAG({ flag: "-nobots", label: "No bots", group: "Server", description: "Turns bots off on the server, so only real players fill the slots." }),
		FLAG({ flag: "-nohltv", label: "No SourceTV", group: "Network", description: "Turns off SourceTV, the spectator broadcast, and closes its port (usually 27020)." }),
	],
};

const guide = {
	name: "Insurgency (2014)",
	short: "Insurgency (2014)",
	summary:
		"Insurgency (2014) is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `insurgency\\cfg` folder of the server. The panel writes that file with the server's name and password. The map and the player limit are on the launch line.",
	files: {
		"server.cfg": "The server's name, its join password, the remote console password, the minimum data rate and the map-rotation file. Only the lines you set are in the file. Other settings are not in the form because the research did not describe them clearly enough to explain them.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join from the in-game console with `connect <your address>:<port>`.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented quit command.",
		"Matchmaking playlists (sv_playlist) are not offered: the sources disagree on the values they take.",
		"No mod support is set up: the research could not confirm how Workshop content is installed.",
	],
};

export default {
	type: "insurgency",
	title: "Insurgency (2014)",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: insurgencyServerSettings,
			groupOrder: insurgencyServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the insurgency\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

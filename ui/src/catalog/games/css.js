import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Counter-Strike: Source (srcds). Its settings are "convars": Source console variables, written one per line as `name value` in a .cfg
// file, the same shape as Left 4 Dead 2's and Garry's Mod's, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in cstrike\cfg. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server, and
//               the launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/css/02-config.md, 03-launch-args.md): Valve's
// "Command line options" ("Useful console commands": sv_lan, sv_cheats) and "Source Dedicated Server" (hostname) pages. The dossier
// lists NO other server.cfg setting for this game, so the form is short on purpose: a CS:S rule (friendly fire, round time, buy time ...)
// is not offered because nothing researched names it. A setting the file has that the panel does not explain is still shown.
//
// sv_password and rcon_password are not in the CS:S dossier; they are the engine's own names, taken from the Garry's Mod and Left 4 Dead 2
// dossiers (and sv_password/hostname were seen to work in server.cfg on a real Garry's Mod install).

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const cssServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON), which Valve says shares the game port. Choose a long one: anyone with it controls the server. The panel does not use the remote console for this server.", "Server"],

		// Joining
		["sv_lan", "Local network only", "On makes a LAN server, useful to stop players joining from the internet: only players on your local network can join. Keep it off for a server friends join over the internet.", "Joining"],

		// Game rules
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on.", "Game rules"],
	]),
	{
		sv_lan: BOOL,
		sv_cheats: BOOL,
	},
);

export const cssServerGroupOrder = ["Server", "Joining", "Game rules"];

const launch = {
	title: "Counter-Strike: Source",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Counter-Strike: Source is started with `+word value` console commands (the map, the player limit) and `-word` launch options (the port, the console). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "cstrike", description: "Tells srcds which game to run. For Counter-Strike: Source this is cstrike. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "27515", description: "The port the server listens on and tells players to connect to. Valve's page says Source also uses it for the remote console. Change it from the server's Ports section so the panel can check for clashes." }),
		FLAG({ flag: "-strictportbind", label: "Stop if the port is taken", group: "Network", managed: true, description: "If the port is already in use, the server quits with an error instead of quietly using another port. Without it a second server would take another port and players would not find it." }),
		A({ flag: "-ip", style: "space", label: "Listen address", group: "Network", example: "0.0.0.0", description: "The network address the server listens on, so players can reach it. It has to be an address of this PC. Only needed with several network cards; it has nothing to do with the address players use from outside." }),
		FLAG({ flag: "-nohltv", label: "No SourceTV", group: "Network", description: "Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "10", description: "The number of player slots on the server. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "de_dust2", description: "The map the server starts on, such as de_dust2. Give the map's name, with or without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the cstrike\\cfg folder. The panel writes it, and the Settings tab edits it." }),
		A({ flag: "+sv_setsteamaccount", label: "Steam login token", group: "Server", example: "…", description: "A Steam Game Server Login Token for this server. Valve's page says you need one if the server stops with the Steam connection error 18 or 106. Create one at steamcommunity.com/dev/managegameservers; the account must own the game. Treat it like a password." }),
		FLAG({ flag: "-nobots", label: "No bots", group: "Game", description: "Turns bots off for the whole server, which also saves CPU time on a weak PC." }),
		FLAG({ flag: "-condebug", label: "Write the console to a file", edit: false, managed: true, group: "Saves and logs", description: "Writes everything the console prints to console.log in the cstrike folder. The Logs tab reads that file." }),
		FLAG({ flag: "-conclearlog", label: "Start console.log afresh", group: "Saves and logs", description: "Empties console.log every time the server starts. It only works together with the option above." }),
		FLAG({ flag: "-insecure", label: "Turn off Valve Anti-Cheat", group: "Advanced", description: "Starts the server without Valve Anti-Cheat (VAC). Servers run with it unless this is on the line." }),
	],
};

const guide = {
	name: "Counter-Strike: Source",
	short: "Counter-Strike: Source",
	summary:
		"Counter-Strike: Source is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `cstrike\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, the remote console password, whether it is local-network only and whether cheats are allowed. Only the lines you set are in the file. The research found no other setting for this game, so the game's rules are not in the form.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The form is short because the research found only a handful of named settings. Game rules such as friendly fire or round time still work by typing the setting name and its value as a new line in `server.cfg` (a setting the panel does not explain is still shown), but the panel cannot explain them yet.",
		"The Steam login token is optional. Valve says it is only needed when the server stops with error 18 or 106. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command.",
		"No mod support is set up: the research found no install method. A game update through the panel could reset a `server.cfg` that the game itself ships, so check the name and password after updating.",
		"The port in the Ports section is the game port. The game also uses UDP 27020 (SourceTV). Two Source servers on one PC both want it, so the second one may take another number. `-nohltv` turns it off.",
	],
};

export default {
	type: "css",
	title: "Counter-Strike: Source",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: cssServerSettings,
			groupOrder: cssServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the cstrike\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

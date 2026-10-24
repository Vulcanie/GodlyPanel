import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Left 4 Dead (srcds). Its settings are "convars": Source console variables, written one per line as `name value` in a .cfg file, the
// same shape as Counter-Strike: Source's, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in left4dead\cfg. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server,
//               and the launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/l4d/02-config.md, 03-launch-args.md): Valve's
// "List of Left 4 Dead console commands and variables" and "Command line options" pages, and the XGamingServer page (community).
// Where those two disagree on a default, the setting is not offered (mp_friendlyfire, sv_alltalk, sv_region, the rate settings are
// left out for that reason, see the notes in docs/research/games/l4d/05-implementation-notes.md). Settings the file has that the panel
// does not explain are still shown.

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const l4dServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["sv_contact", "Admin contact", "An email address or other contact for the person running the server. Shown to people who look at the server's details.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console, which Valve says shares the game port. Choose a long one: anyone with it controls the server. The panel does not use the remote console for this server.", "Server"],

		// Joining
		["sv_lan", "Local network only", "On makes a LAN server, useful to stop players joining from the internet: only players on your local network can join. Keep it off for a server friends join over the internet.", "Joining"],

		// Game rules
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on.", "Game rules"],
		["sv_pausable", "Allow pausing", "Lets players pause the game. Off means nobody can pause it.", "Game rules"],

		// Network
		["sv_maxrate", "Most data per player", "The most data, in bytes per second, the server sends to one player. 0 means no limit. Valve's page calls 0 unlimited.", "Network"],
	]),
	{
		sv_lan: BOOL,
		sv_cheats: BOOL,
		sv_pausable: BOOL,
	},
);

export const l4dServerGroupOrder = ["Server", "Joining", "Game rules", "Network"];

const launch = {
	title: "Left 4 Dead",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Left 4 Dead is started with `+word value` console commands (the map, the player limit) and `-word` launch options (the port, the console). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "left4dead", description: "Tells srcds which game to run. For Left 4 Dead this is left4dead. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25950", description: "The port the server listens on and tells players to connect to. Valve's page says Source also uses it for the remote console. Change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "-ip", style: "space", label: "Listen address", group: "Network", example: "0.0.0.0", description: "The network address the server listens on. Valve's page allows an address of this PC or 0.0.0.0 for all of them. Only needed with several network cards." }),
		FLAG({ flag: "-nohltv", label: "No SourceTV", group: "Network", description: "Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "8", description: "The number of player slots on the server. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "l4d_hospital01_apartment", description: "The map the server starts on, such as l4d_hospital01_apartment. Give the map's name, with or without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the left4dead\\cfg folder. The panel writes it, and the Settings tab edits it." }),
		A({ flag: "+sv_setsteamaccount", label: "Steam login token", group: "Server", example: "…", description: "A Steam Game Server Login Token for this server. Valve's page says you need one if the server stops with the Steam connection error 18 or 106. Create one at steamcommunity.com/dev/managegameservers; the account must own the game. Treat it like a password." }),
		FLAG({ flag: "-nobots", label: "No bots", group: "Game", description: "Turns bots off for the whole server, which also saves CPU time on a weak PC." }),
		FLAG({ flag: "-insecure", label: "Turn off Valve Anti-Cheat", group: "Advanced", description: "Starts the server without Valve Anti-Cheat (VAC). Valve's page says this is what the option does; leave it off unless you know you need it." }),
	],
};

const guide = {
	name: "Left 4 Dead",
	short: "Left 4 Dead",
	summary:
		"Left 4 Dead is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `left4dead\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name, password and contact, the remote console password, whether it is local-network only, whether cheats and pausing are allowed, and the most data sent to one player. Only the lines you set are in the file.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The form is short because the research found only a handful of settings that two sources agree on. Other settings still work by typing the name and its value as a new line in `server.cfg` (a setting the panel does not explain is still shown), but the panel cannot explain them yet.",
		"Add-ons (custom campaigns) are .vpk files in the `left4dead\\addons` folder, put there by hand. Valve's page says to run `update_addon_paths;mission_reload` in the server console, or to restart the server. The panel has no console, so restart the server after adding one. The research found no Steam Workshop for this game.",
		"The Steam login token is optional. Valve says it is only needed when the server stops with error 18 or 106. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command.",
		"The port in the Ports section is the game port. The game also uses UDP 27020 (SourceTV). Two Source servers on one PC both want it, so the second one may take another number. `-nohltv` turns it off.",
	],
};

export default {
	type: "l4d",
	title: "Left 4 Dead",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: l4dServerSettings,
			groupOrder: l4dServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the left4dead\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

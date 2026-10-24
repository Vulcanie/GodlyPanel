import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// BrainBread 2 (srcds). Its settings are "convars": Source console variables, written one per line as `name value` in a .cfg file, the
// same shape as the other Source games' here, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in brainbread2\cfg. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server,
//               and the launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/brainbread2/02-config.md, 03-launch-args.md): the
// XGamingServer config page (community: its server.cfg, and its server.cfg.orig, whose hint on cheats is the page's own) and the
// FireDaemon setup guide's launch line. The gameplay rules in the XGamingServer page's server_core.cfg and server_game.cfg are NOT
// offered: that file chain (server.cfg running them) is not confirmed for the game, so they are not part of this form.
// Settings the file has that the panel does not explain are still shown.

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const brainbread2ServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console. Anyone who enters it can run every server command, so choose a long one. The panel does not use the remote console for this server.", "Server"],

		// Joining
		["sv_lan", "Local network only", "Makes a LAN server, which has no heartbeat to the server list and no authentication. Keep it off for a server friends join over the internet.", "Joining"],
		["mp_allowspectators", "Allow spectators", "Lets people join as spectators, who watch the game without playing.", "Joining"],

		// Game rules
		["sv_cheats", "Allow cheat commands", "Allows cheats on the server. It also disables Steam stats and achievements, the page's own note says. Keep it off on a server other people play on.", "Game rules"],
		["mp_friendlyfire", "Friendly fire", "Lets team members injure members of their own team.", "Game rules"],

		// Players and downloads
		["sv_voiceenable", "Voice chat", "Enables voice communication between players.", "Players and downloads"],
		["sv_allowdownload", "Players can download files", "Lets players download files, such as custom maps, from the server when they join.", "Players and downloads"],
	]),
	{
		sv_lan: BOOL,
		sv_cheats: BOOL,
		mp_friendlyfire: BOOL,
		mp_allowspectators: BOOL,
		sv_voiceenable: BOOL,
		sv_allowdownload: BOOL,
	},
);

export const brainbread2ServerGroupOrder = ["Server", "Joining", "Game rules", "Players and downloads"];

const launch = {
	title: "BrainBread 2",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "BrainBread 2 is started with `-word value` launch options (the game, the port, the console) and `+word value` console commands (the map, the player limit, the address). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode, a text window. The vendor guide says the server can only restart automatically in this mode. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "BrainBread2", description: "Tells srcds which game to run. For BrainBread 2 this is BrainBread2. The panel always writes it." }),
		FLAG({ flag: "-secure", label: "Turn on Valve Anti-Cheat", group: "Advanced", description: "Turns Valve Anti-Cheat (VAC) protection on for the server. The vendor guide says you can remove it if you do not want VAC." }),
		A({ flag: "+map", label: "Start map", group: "World", edit: true, managed: true, example: "bbc_termoil", description: "The map the server starts on, such as bbc_termoil. The vendor guide says this command should not be removed. Give the map's name, with or without .bsp." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "12", description: "The number of player slots on the server. It is only read when the server starts." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25954", description: "The port the server listens on. The vendor guide says it can be changed to anywhere from 27015 to 27020, and the panel's default is outside that range: test a server before relying on it (see the guide)." }),
		A({ flag: "+ip", label: "Server address", group: "Network", example: "0.0.0.0", description: "The address the server listens on. The vendor guide says to use this PC's own address, not 127.0.0.1. 0.0.0.0 means all of this PC's addresses; the guide's advice is not confirmed for the panel's default." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the brainbread2\\cfg folder. The panel writes it, and the Settings tab edits it." }),
		A({ flag: "+sv_setsteamaccount", label: "Steam login token", group: "Server", example: "…", description: "A Steam Game Server Login Token for this server. Create one at steamcommunity.com/dev/managegameservers; the account must own the game. Treat it like a password." }),
	],
};

const guide = {
	name: "BrainBread 2",
	short: "BrainBread 2",
	summary:
		"BrainBread 2 is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `brainbread2\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit, the port and the address are on the launch line.",
	files: {
		"server.cfg": "The server's name, password and remote console password, whether it is local-network only, spectators, cheats, friendly fire, voice chat and file downloads. Only the lines you set are in the file.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The port is the one thing to test first. The FireDaemon guide says it can be changed to anywhere from 27015 to 27020. The panel's default is 25954, outside that range, so a server on it may not be reachable as the guide describes. If it does not work, change the port in the Ports section to 27015, 27016, 27017, 27018, 27019 or 27020 and make sure no other server uses it.",
		"The `+ip` argument is 0.0.0.0 (all addresses). The guide says to use this PC's own address; that has not been tested with the panel.",
		"The form is short on purpose. The gameplay rules the XGamingServer page lists (zombie counts, round times, votes, scaling) are in files it runs from `server.cfg`; the research could not confirm that the game runs them, so they are not offered. Other settings still work by typing the name and its value as a new line in `server.cfg`, but the panel cannot explain them yet.",
		"Custom maps and content are files a person adds by hand: `.bsp` and `.nav` in `brainbread2\\maps`, models, materials and sounds in their folders, and custom content under `brainbread2\\custom`. The panel does not manage them. The Steam Workshop lines in `gameinfo.txt` may be removed if the server will not start, according to the guide.",
		"The Steam login token is optional. Valve's generic page says one is only needed when the server stops with error 18 or 106. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no console stop command for this game.",
	],
};

export default {
	type: "brainbread2",
	title: "BrainBread 2",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: brainbread2ServerSettings,
			groupOrder: brainbread2ServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the brainbread2\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

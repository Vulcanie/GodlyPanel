import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Double Action: Boogaloo (srcds, mod "dab"). Its settings are "convars": Source console variables, one `name value` per line in a .cfg
// file, the same shape as the other Source games here, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in dab\cfg (UNVERIFIED: the dossier found no folder). The panel writes it with the server's name, the password and
//               sv_lan 0 when it creates the server, and the launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/doubleaction/02-config.md, 03-launch-args.md). The
// names and sample values come from a hosting company's sample server.cfg (xgamingserver), which gives no types, defaults or allowed
// values. So no dropdown is offered: each value is typed in, as the sample has it. Its descriptions are the sample's own words, put in
// plain language. Settings the sample gives no comment for are not offered.

export const dabServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it.", "Server"],

		// Joining
		["sv_lan", "Local network only", "Set 0 for a server friends join over the internet. 1 keeps it off the internet: no listing and no Steam connection, so only players on your local network can join.", "Joining"],
		["sv_allow_votes", "Allow votes", "Lets players vote on things such as changing the map. Set 1 to allow votes, 0 to stop them.", "Joining"],
		["mp_allowspectators", "Allow spectators", "Lets players watch the game without playing. Set 1 to allow spectators, 0 to stop them.", "Joining"],

		// Game rules
		["mp_teamplay", "Team play", "Turns on team-based play, where players fight in teams. Set 0 for free-for-all.", "Game rules"],
		["mp_friendlyfire", "Friendly fire", "Lets team members injure each other. Set 1 to allow it, 0 to protect teammates.", "Game rules"],
		["mp_falldamage", "Fall damage", "Players take damage from long falls. Set 1 to turn it on, 0 to turn it off.", "Game rules"],
		["mp_forcerespawn", "Force respawn", "Makes every player respawn when they die, so nobody waits to come back. Set 1 to turn it on, 0 to turn it off.", "Game rules"],
		["mp_fraglimit", "Kill limit", "The number of kills at which the map ends. Set 0 for no kill limit.", "Game rules"],
		["mp_timelimit", "Time limit (minutes)", "How long each map lasts, in minutes. The sample uses 20. Set 0 for no time limit.", "Game rules"],
		["mp_limitteams", "Team size difference", "The most players one team can have over the other before players are blocked from joining it. Set 0 to turn the check off.", "Game rules"],

		// Voice and chat
		["sv_voiceenable", "Voice chat", "Turns voice chat on (1) or off (0) for players.", "Voice and chat"],
		["sv_alltalk", "Everyone hears everyone", "Lets players hear all other players, whatever team they are on. Set 1 to allow it, 0 to keep teams apart.", "Voice and chat"],

		// Downloads
		["sv_allowdownload", "Allow downloads", "Lets players download files they are missing, such as maps or models, from the server. It is slow, so a download site (below) is better.", "Downloads"],
		["sv_allowupload", "Allow uploads", "Lets players upload their own customisation files to the server.", "Downloads"],
		["sv_downloadurl", "Download website", "The web address players can get missing files from, instead of the server itself. Leave it empty if you do not have one.", "Downloads"],

		// Bots
		["bot_quota", "Number of bots", "How many bots the server tries to keep in the game. The sample uses 2.", "Bots"],
	]),
	{},
);

export const dabServerGroupOrder = ["Server", "Joining", "Game rules", "Voice and chat", "Downloads", "Bots"];

const launch = {
	title: "Double Action: Boogaloo",
	program: /\bsrcds(?:\.exe)?\b/i,
	// `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Double Action is started with `-word` launch options (the game folder, the port, the console) and `+word value` console commands (the map, the player limit). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "dab", description: "Tells srcds which game to run. For Double Action this is dab. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25928", description: "The port the server listens on and tells players to connect to. Change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "10", description: "How many players can be on the server at once. It is only read when the server starts. The research's largest figure is 24." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "da_rooftops", description: "The map the server starts on, such as da_rooftops. Give the map's name, without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts. The panel writes it, and the Settings tab edits it." }),
		A({ flag: "+ip", label: "Listen address", group: "Network", example: "0.0.0.0", description: "The network address of this PC the server listens on. Only needed with several network cards. It has to be an address of this PC, not 127.0.0.1." }),
		FLAG({ flag: "-nohltv", label: "No SourceTV", group: "Network", description: "Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020." }),
		FLAG({ flag: "-insecure", label: "Turn off Valve Anti-Cheat", group: "Advanced", description: "Starts the server without Valve Anti-Cheat (VAC). Servers run with VAC on unless this is on the line." }),
		FLAG({ flag: "-ignoresigint", label: "Ignore Ctrl+C", group: "Advanced", description: "Stops Ctrl+C from quitting the server (Valve's list says it prevents Ctrl+C quitting). Not confirmed for this game." }),
	],
};

const guide = {
	name: "Double Action: Boogaloo",
	short: "Double Action",
	summary:
		"Double Action is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `dab\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, the remote console password, whether it is local-network only, votes, teams, friendly fire and downloads. Only the lines you set are in the file. The values are typed in, since the research found no list of allowed values.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The game does not respond to a graceful shutdown, according to its vendor. The panel's Stop closes the window and, after 15 seconds, ends the program, so changes that are only in memory may be lost. Stop the server before an update.",
		"The folder of the settings file (dab\\cfg) and the port protocol are not confirmed by the research. Check that the server reads the file the panel writes.",
		"The Steam store page says the dedicated server is no longer on the store. The install still comes from SteamCMD, according to the vendor guides, but that may change.",
		"No mods are set up by the panel: the research found no server mod method.",
	],
};

export default {
	type: "doubleaction",
	title: "Double Action: Boogaloo",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: dabServerSettings,
			groupOrder: dabServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the dab\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

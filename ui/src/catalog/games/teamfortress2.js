import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Team Fortress 2 (srcds). Its settings are "convars": Source console variables, one `name value` per line in a .cfg file, the shape
// Counter-Strike: Source's and Left 4 Dead 2's use, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in tf\cfg. The panel writes the server's name and password when it creates the server; the launch line runs it with
//               `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/teamfortress2/02-config.md, 03-launch-args.md): the
// TF Wiki's Linux and Windows dedicated-server pages, its "Dedicated server configuration" page, and Valve's command-line options page.
// Those were read as summarised text. Only the settings the dossier explains are here; a setting whose meaning the dossier does not
// state (the many "example value" rows) is left out rather than guessed. The map rotation (mapcycle.txt) and motd.txt are not offered
// because the dossier gives no format for them.

const SV_PURE = [
	["-1", "No file restrictions"],
	["0", "Minimal rules (the game's default)"],
	["1", "Full rules, plus the whitelist file"],
	["2", "Steam's own content only"],
];

export const teamfortress2ServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password that lets a remote console connect to the server (RCON). Choose a long one: anyone with it controls the server. The panel does not use the remote console for this server.", "Server"],
		["sv_contact", "Contact address", "An e-mail address or other contact shown to players who look at the server's details, so they can reach whoever runs it.", "Server"],

		// Custom content
		["sv_pure", "Custom content rules", "Decides which custom skins, models and sprites players may use. The game's default is the minimal rules. Full rules (1) also read the whitelist file, pure_server_whitelist.txt, which the panel does not write: a server set to 1 without that file will not run as the rules say. Steam's own content only (2) blocks all custom content.", "Custom content"],
	]),
	{
		sv_pure: { choices: SV_PURE, allowCustom: false },
	},
);

export const teamfortress2ServerGroupOrder = ["Server", "Custom content"];

const launch = {
	title: "Team Fortress 2",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Team Fortress 2 is started with `+word value` console commands (the map, the player limit) and `-word` launch options (the port, the console). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "tf", description: "Tells srcds which game to run. For Team Fortress 2 this is tf. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "27615", description: "The port the server listens on and tells players to connect to. The remote console uses the same number over TCP. Change it from the server's Ports section so the panel can check for clashes." }),
		FLAG({ flag: "-strictportbind", label: "Stop if the port is taken", group: "Network", managed: true, description: "If the port is already in use, the server quits with an error instead of quietly using another port. Without it a second server would take another port and players would not find it." }),
		A({ flag: "-ip", style: "space", label: "Listen address", group: "Network", example: "0.0.0.0", description: "The network address the server binds to. Only needed with several network cards or to pick one address of this PC. It is not the address players use from outside." }),
		FLAG({ flag: "-nohltv", label: "No SourceTV", group: "Network", description: "Turns SourceTV (the spectator broadcast) off and closes its port, which is usually UDP 27020." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "24", description: "The number of player slots on the server, up to 32. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "ctf_2fort", description: "The map the server starts on, such as ctf_2fort. Give the map's name, with or without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the tf\\cfg folder. The panel writes it, and the Settings tab edits it." }),
		A({ flag: "+sv_setsteamaccount", label: "Steam login token", group: "Server", example: "…", description: "A Steam Game Server Login Token for this server. The dossier says one is needed to show in the public server browser; without it the server still runs. Create one at steamcommunity.com/dev/managegameservers (Team Fortress 2 is app 440). Treat it like a password." }),
		FLAG({ flag: "-condebug", label: "Write the console to a file", edit: false, managed: true, group: "Saves and logs", description: "Writes everything the console prints to console.log in the game's folder. The Logs tab reads that file." }),
		FLAG({ flag: "-conclearlog", label: "Start console.log afresh", group: "Saves and logs", description: "Empties console.log every time the server starts. It only works together with the option above." }),
		FLAG({ flag: "-insecure", label: "Turn off Valve Anti-Cheat", group: "Advanced", description: "Starts the server without Valve Anti-Cheat (VAC). VAC is on unless this is on the line." }),
	],
};

const guide = {
	name: "Team Fortress 2",
	short: "Team Fortress 2",
	summary:
		"Team Fortress 2 is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `tf\\cfg` folder of the server. The panel writes that file with the server's name and password. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, the remote console password, a contact address and the custom-content rules. Only the lines you set are in the file. The research found no other setting explained for this game, so the rest of the game's rules are not in the form.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join from the in-game console with `connect <your address>:<port>`, using the Game Port in the Ports section.",
		"The Steam login token is optional in GodlyPanel. The research says a token is needed to appear in the public server browser; without one the server still runs and can be joined by address. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command.",
		"Custom content: rules 1 need a whitelist file, pure_server_whitelist.txt, in tf\\cfg, which the panel does not write. Add it yourself if you use rules 1.",
		"No mod support is set up: the research found no mod loader and no install method. A game update through the panel could reset files the game ships, so check the name and password after updating.",
		"The port in the Ports section is the game port (UDP for players, TCP for the remote console). The engine also uses UDP 27020 (SourceTV), UDP 27005 (client) and UDP 26900 (Steam). Two Source servers on one PC may clash on those; `-nohltv` turns SourceTV off.",
	],
};

export default {
	type: "teamfortress2",
	title: "Team Fortress 2",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: teamfortress2ServerSettings,
			groupOrder: teamfortress2ServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the tf\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

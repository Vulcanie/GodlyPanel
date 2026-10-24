import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Empires (srcds). Its settings are "convars": Source console variables, written one per line as `name value` in a .cfg file, the
// same shape as Counter-Strike: Source's, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in empires\cfg. The panel writes it with the server's name and the password when it creates the server, and the
//               launch line runs it with `+exec server.cfg`.
// Source of every name and description: the research dossier (docs/research/games/empires/02-config.md, 03-launch-args.md). Its
// setting names come from a hosting company's sample server.cfg (xgamingserver) and the host guides; the official setup page was
// unreachable. Settings the sample lists with no description (sv_alltalk, tv_*, sv_contact) are not offered: the form stays short.

export const empiresServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The host guide says 8 to 32 letters, numbers, dashes or underscores. The panel does not use it.", "Server"],

		// Game rules
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands. The sample server.cfg has it at 0 (off). Keep it off on a server other people play on.", "Game rules"],
	]),
	{},
);

export const empiresServerGroupOrder = ["Server", "Game rules"];

const launch = {
	title: "Empires",
	program: /\bsrcds(?:\.exe)?\b/i,
	// `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Empires is started with `-word` launch options (the game folder, the port, the console) and `+word value` console commands (the map, the player limit). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "empires", description: "Tells srcds which game to run. For Empires this is empires. The panel always writes it." }),
		FLAG({ flag: "-toconsole", label: "Send output to the console", group: "Saves and logs", description: "Sends the server's output to its console window, where the panel's window shows it. Kept from the research's example launch line." }),
		FLAG({ flag: "-secure", label: "Use Valve Anti-Cheat", group: "Advanced", description: "Starts the server with Valve Anti-Cheat (VAC) protection. It came from the research's example launch line; the research could not confirm it on the current build." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25926", description: "The port the server listens on and tells players to connect to. Change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "62", description: "How many people can be on the server at once, from 1 to 64. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "con_district402", description: "The map the server starts on, such as con_district402. Give the map's name, without .bsp." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs when it starts, from the empires\\cfg folder. The panel writes it, and the Settings tab edits it." }),
	],
};

const guide = {
	name: "Empires",
	short: "Empires",
	summary:
		"Empires is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `empires\\cfg` folder of the server. The panel writes that file with the server's name and the password. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name, the join password, the remote console password and whether cheat commands are allowed. Only the lines you set are in the file. The research found no other setting names for this game with a description, so the rest of the game's rules are not in the form.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The form is short because the research found only a handful of named settings. A setting the file has that the panel does not explain is still shown, and you can type a new one as a line in `server.cfg`.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command, so a save may not finish.",
		"Mods (SourceMod and Metamod plugins) are not set up by the panel. They are copied into the server's folders by hand, and players must run the same Empires version as the server. Keep updates on.",
		"The map and player limit come from the research's example launch line. Check the map name against the game's own maps before you rely on it.",
	],
};

export default {
	type: "empires",
	title: "Empires",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: empiresServerSettings,
			groupOrder: empiresServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the empires\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Age of Chivalry (dossier: docs/research/games/ageofchivalry/, confidence low). The settings are the Source console commands in
// ageofchivalry/cfg/server.cfg, one per line, with // comments. The keys and their descriptions are the ones the dossier's one
// community config file names (GameServerManagers' aoc/server.cfg); the game's own list was not found. The panel writes the server
// name, sv_lan and log when it creates the server.

const settingRows = withChoices(
	rows([
		["hostname", "Server name", "The name shown in the server browser. The panel sets it from the Server Name you typed when it creates the server.", "Server"],
		["sv_contact", "Admin email", "The server admin's email address, as the config file's example shows it. Leave it empty to show nothing.", "Server"],
		["sv_password", "Join password", "The password players must type to join. Leave it empty for a server anyone can join.", "Access"],
		["sv_lan", "Hide from the internet", "On: the server does not show on the internet, so only players on this network can find it. Off is the default.", "Network"],
		["mp_timelimit", "Map time limit (minutes)", "How many minutes a map is played before the server switches to the next map by itself.", "Rules"],
		["mp_friendlyfire", "Team damage", "On: players can hurt their own team. Off: they cannot.", "Rules"],
		["log", "Logging", "Turns on logging to a file, the console and the network. The config file's own recommendation is on.", "Logs"],
	]),
	{
		sv_lan: [
			["0", "Off"],
			["1", "On"],
		],
		mp_friendlyfire: [
			["0", "Off"],
			["1", "On"],
		],
		log: [
			["on", "On"],
			["off", "Off"],
		],
	},
);

const settingsGroupOrder = ["Server", "Access", "Network", "Rules", "Logs"];

// The start script's line, as the panel writes it (the dossier's FireDaemon example with -autoupdate left out).
const launch = {
	title: "Age of Chivalry",
	program: /srcds\.exe/i,
	style: "space",
	editable: false,
	where: "the `srcds.exe` line of the server's start script",
	intro:
		"The panel starts the server with these arguments. Every one is written by the panel, so none can be changed from this form. The server name and the game port come from the server's own settings, and the rest of the settings are in server.cfg.",
	args: [
		FLAG({
			flag: "-console",
			label: "Console window",
			group: "Required",
			edit: false,
			managed: true,
			description: "Runs the server as text in its own console window, the form the dossier's guide uses. The panel needs it to read the output.",
		}),
		A({
			flag: "-game",
			label: "Game folder",
			group: "Required",
			edit: false,
			managed: true,
			example: "ageofchivalry",
			description: "Tells srcds which mod to run. For Age of Chivalry this is ageofchivalry. The panel always writes it.",
		}),
		FLAG({
			flag: "-secure",
			label: "VAC protection",
			group: "Server",
			edit: false,
			managed: true,
			description: "Turns on Valve Anti-Cheat for the server, as the dossier's guide has it. The panel always writes it.",
		}),
		A({
			flag: "+map",
			style: "plus",
			label: "Starting map",
			group: "World",
			edit: false,
			managed: true,
			example: "aoc_siege",
			description: "The map the server loads when it starts. The panel writes aoc_siege, the map the guides use. Other map names are not listed in the dossier.",
		}),
		FLAG({
			flag: "+log",
			style: "plus",
			label: "Logging on",
			group: "Logs",
			edit: false,
			managed: true,
			example: "on",
			description: "Prints the server's output to the screen, which the guides say makes errors easier to find. The panel writes on.",
		}),
		A({
			flag: "+maxplayers",
			style: "plus",
			label: "Max players",
			group: "Server",
			edit: false,
			managed: true,
			example: "32",
			description: "The most players the server takes. It can only be set when the server starts. The panel writes 32, the figure the guides use.",
		}),
		A({
			flag: "-port",
			label: "Game port",
			group: "Network",
			edit: false,
			managed: true,
			example: "27030",
			description: "The port the server listens on. The panel writes it from the Ports section when the server is created. Each server on one address needs its own port.",
		}),
		A({
			flag: "+ip",
			style: "plus",
			label: "Listen address",
			group: "Network",
			edit: false,
			managed: true,
			example: "0.0.0.0",
			description: "The address the server listens on. The panel writes 0.0.0.0, which means every address on this PC. The guides ask for the PC's own address instead, which the panel does not know.",
		}),
		A({
			flag: "+exec",
			style: "plus",
			label: "Settings file",
			group: "Files",
			edit: false,
			managed: true,
			example: "server.cfg",
			description: "The file in the cfg folder that the server reads its settings from when it starts. The panel writes server.cfg.",
		}),
	],
};

const guide = {
	name: "Age of Chivalry",
	short: "Age of Chivalry",
	summary:
		"Age of Chivalry's server is srcds.exe in the server's install folder, and the mod is the ageofchivalry folder inside it. Its settings are in ageofchivalry/cfg/server.cfg, one command per line. The panel writes the start line and the first few settings.",
	files: {
		"server.cfg": "The server's settings as console commands: the name, the join password, the admin email, LAN visibility, the time per map and team damage.",
	},
	notes: [
		"Not checked on a real install. Before relying on this server, run it once and check the items in the server's implementation notes.",
		"Stopping: the panel closes the server's window and, after 15 seconds, ends it. The guides say Age of Chivalry does not respond to a normal shutdown, and no console command to quit was found, so the last few minutes of play may not be saved.",
		"Anonymous install: the panel installs the server with an anonymous SteamCMD login. The Valve list and a community tool say that works, but the FireDaemon guide logs in with a Steam account. If the install fails, that is the first thing to check.",
		"Mods: the guides say nothing about how a dedicated server loads mods, so the panel adds no mod setting.",
		"Ports: the game uses the port you chose. The guides also mention SourceTV and a client port, which the panel does not set; if another server is using those ports, it may fail to start.",
		"Updates: the Windows build of the server does not update itself, so the panel's SteamCMD update runs when you ask it to. Stop the server first.",
	],
};

export default {
	type: "ageofchivalry",
	title: "Age of Chivalry",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: settingRows,
			groupOrder: settingsGroupOrder,
			mayBeMissing: "The panel writes this file when it creates the server. If it has been deleted, write it here: each line is a setting, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

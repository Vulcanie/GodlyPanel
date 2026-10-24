import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Zombie Panic! Source (srcds). Its settings are "convars": Source console variables, written one per line as `name value` in a .cfg
// file, the same shape as Counter-Strike: Source's and Left 4 Dead's, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in zps\cfg. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server. The game
//               runs it by itself at start (the dossier names no other file for it).
// Source of every name and description: the research dossier (docs/research/games/zps/02-config.md, 03-launch-args.md): the two
// community config pages (XGamingServer, PingPerfect) and the Linux guide's launch line. Where those pages disagree on a value (the
// mp_timelimit example, sv_alltalk's description, sv_lan's "do not change") the setting is either left out or the disagreement is said
// in the guide notes. Settings the file has that the panel does not explain are still shown.

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

// The region codes both pages list (PingPerfect, which also gives 255 as the default).
const REGIONS = [
	["0", "US East"],
	["1", "US West"],
	["2", "South America"],
	["3", "Europe"],
	["4", "Asia"],
	["5", "Australia"],
	["6", "Middle East"],
	["7", "Africa"],
	["255", "World (the default)"],
];

export const zpsServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["sv_contact", "Admin contact", "A contact email or other way to reach the person running the server. Shown to people who look at the server's details.", "Server"],
		["sv_region", "Server region", "The part of the world the server is listed in the browser for. 255 means the whole world, which is the default.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console. Anyone who enters it can run every server command, so choose a long one. The panel does not use the remote console for this server.", "Server"],

		// Joining
		["sv_lan", "Local network only", "LAN-only mode, which hides the server from the internet, so only players on your local network can join. Keep it off for a server friends join over the internet.", "Joining"],

		// Game rules
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands, and turns off Steam achievements and stats for the server. Keep it off on a server other people play on.", "Game rules"],
		["mp_friendlyfire", "Friendly fire", "Lets players hurt their own team. Off by default; turn it on for team damage.", "Game rules"],

		// Players and downloads
		["sv_voiceenable", "Voice chat", "Microphone voice chat between players. Off turns it off for the whole server.", "Players and downloads"],
		["sv_allowdownload", "Players can download files", "Lets players download custom files, such as maps or sounds, from the server when they join.", "Players and downloads"],
	]),
	{
		sv_lan: BOOL,
		sv_cheats: BOOL,
		mp_friendlyfire: BOOL,
		sv_voiceenable: BOOL,
		sv_allowdownload: BOOL,
		sv_region: REGIONS,
	},
);

export const zpsServerGroupOrder = ["Server", "Joining", "Game rules", "Players and downloads"];

const launch = {
	title: "Zombie Panic! Source",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Zombie Panic! Source is started with `-word value` launch options (the game, the port, the player limit) and `+word value` console commands (the map). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "zps", description: "Tells srcds which game to run. For Zombie Panic! Source this is zps. The panel always writes it." }),
		FLAG({ flag: "-dedicated", label: "Dedicated server", edit: false, managed: true, group: "Required", description: "Starts the program as a dedicated server. The panel always writes it, as the community's Windows start line does." }),
		FLAG({ flag: "-secure", label: "Turn on Valve Anti-Cheat", group: "Advanced", description: "Turns Valve Anti-Cheat (VAC) on. The ZPS guide says servers without VAC are hidden from the server browser's list but still show in Steam's. Remove it from the line to start without VAC." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "25952", description: "The port the server listens on and tells players to connect to. Valve's page says Source also uses it for the remote console. Change it from the server's Ports section so the panel can check for clashes." }),
		FLAG({ flag: "-strictportbind", label: "Stop if the port is taken", group: "Network", description: "If the port is already in use, the server quits with an error instead of quietly using another port. Without it a second server would take another port and players would not find it." }),
		A({ flag: "-maxplayers", style: "space", label: "Max players", group: "Server", managed: true, example: "20", description: "The number of player slots on the server. The ZPS guide says 24 is the most ZPS supports. It is only read when the server starts." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "zpo_biotec", description: "The map the server starts on, such as zpo_biotec. Give the map's name, with or without .bsp." }),
		A({ flag: "+sv_setsteamaccount", label: "Steam login token", group: "Server", example: "…", description: "A Steam Game Server Login Token for this server. Valve's page says you need one if the server stops with the Steam connection error 18 or 106. Create one at steamcommunity.com/dev/managegameservers; the account must own the game. Treat it like a password." }),
		FLAG({ flag: "-nobots", label: "No bots", group: "Game", description: "Turns bots off for the whole server, which also saves CPU time on a weak PC." }),
		FLAG({ flag: "-nohltv", label: "No SourceTV", group: "Network", description: "Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020." }),
	],
};

const guide = {
	name: "Zombie Panic! Source",
	short: "Zombie Panic! Source",
	summary:
		"Zombie Panic! Source is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `zps\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name, password and contact, the remote console password, the browser region, whether it is local-network only, cheats, friendly fire, voice chat and file downloads. Only the lines you set are in the file.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The form is short on purpose. The research found the settings above on two community pages, and the Valve pages for this game could not be read. Other settings still work by typing the name and its value as a new line in `server.cfg` (a setting the panel does not explain is still shown). The two pages disagree on some values, so those are not offered.",
		"Workshop items (`zps\\data\\collection.txt`), AngelScript plugins (`zps\\default_plugins.json`), admin lists (`zps\\data`) and map lists (`zps\\mapcycle.txt`, `zps\\maplist.txt`) are edited by hand; the panel does not manage them. The ZPS guide warns that a SteamCMD validate overwrites the admin, plugin and server configuration files, so keep a copy before an update.",
		"The Steam login token is optional. Valve says it is only needed when the server stops with error 18 or 106. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The guide's way to stop the server is typing `quit` into the console, which the panel cannot do yet.",
		"The port in the Ports section is the game port. The game also uses UDP 27020 (SourceTV). Two Source servers on one PC both want it, so the second one may take another number. `-nohltv` turns it off.",
		"The first start downloads more game files and can take a long time (the Unraid template's note, from the research).",
	],
};

export default {
	type: "zps",
	title: "Zombie Panic! Source",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: zpsServerSettings,
			groupOrder: zpsServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the zps\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

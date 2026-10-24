import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Counter-Strike 2 (cs2.exe, -dedicated). Its settings are "convars": Source console variables, written one per line as `name value`
// in a .cfg file, the same shape as Counter-Strike: Source's and Half-Life 2: Deathmatch's, so the panel's convar reader handles them.
// Two files are offered, both in game\csgo\cfg:
//   server.cfg                        the panel writes it (name, password, sv_lan 0); the launch line runs it with `+exec server.cfg`.
//   gamemode_competitive_server.cfg   the file the competitive mode reads (the Docker image's notes name it). The panel does not write it.
// Source of every name, default and description: the research dossier (docs/research/games/counterstrike2/02-config.md,
// 03-launch-args.md): Valve's "Counter-Strike 2 Dedicated Servers" page, XGaming's server-config page (which gives the defaults of the
// gameplay convars) and joedwards32's Docker image (CS2). The dossier gives no type for any convar, so the free-text settings are not
// given a dropdown; a 0/1 dropdown is offered only where the dossier names the two values.

const ON_OFF = [
	["0", "Off"],
	["1", "On"],
];

export const cs2ServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON). The panel does not use it, but anyone who knows it can control the server, so choose a long one.", "Server"],

		// Joining
		["sv_lan", "Who can join", "Internet lets anyone join over the internet. LAN only restricts the server to players on your local network, so keep Internet for a server friends join from home.", "Joining"],

		// Game rules
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on.", "Game rules"],

		// Performance
		["sv_hibernate_when_empty", "Sleep when empty", "When no one is connected, the server uses very little processor time. The Docker image's notes say this has been seen to crash servers, so leave it off unless you need it.", "Performance"],

		// Network
		["sv_maxrate", "Highest bandwidth per player", "The most data the server sends one player. 0 means no limit.", "Network"],
	]),
	{
		sv_lan: [
			["0", "Internet"],
			["1", "LAN only"],
		],
		sv_cheats: ON_OFF,
		sv_hibernate_when_empty: ON_OFF,
	},
);

export const cs2ServerGroupOrder = ["Server", "Joining", "Game rules", "Performance", "Network"];

export const cs2ModeSettings = rows([
	// Rounds
	["mp_maxrounds", "Most rounds per match", "The number of rounds a match can run before it ends. The server's default is 24.", "Rounds"],
	["mp_roundtime", "Round time (minutes)", "How many minutes a round lasts. The server's default is 1.92.", "Rounds"],
	["mp_freezetime", "Freeze time at round start", "How long players are held still at the start of a round, before they can move. The server's default is 15.", "Rounds"],

	// Money and time
	["mp_buytime", "Buy time (seconds)", "How many seconds at the start of a round players can spend money on weapons. The server's default is 20.", "Money and time"],
	["mp_startmoney", "Starting money", "How much money each player starts a match with. The server's default is 800.", "Money and time"],
	["mp_warmuptime", "Warm-up length", "How long the warm-up before a match lasts. The server's default is 60.", "Money and time"],

	// Teams and damage
	["mp_friendlyfire", "Friendly fire", "Whether teammates can hurt each other. 1 turns it on and 0 turns it off; the server's default is 1.", "Teams and damage"],
	["mp_autoteambalance", "Balance teams automatically", "Moves players between teams so the sides stay even. 1 turns it on and 0 turns it off; the server's default is 1.", "Teams and damage"],
]);

export const cs2ModeGroupOrder = ["Rounds", "Money and time", "Teams and damage"];

const launch = {
	title: "Counter-Strike 2",
	program: /\bcs2(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `cs2.exe` line of the server's start script",
	intro: "Counter-Strike 2 is started with `-word` launch options (the port, the player limit) and `+word value` console commands (the map, the settings file). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-dedicated", label: "Dedicated server", edit: false, managed: true, group: "Required", description: "Runs the game as a dedicated server with no game window. Without it the game opens as a normal player program. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "27065", description: "The UDP port players connect to and the server list uses. Change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "-ip", style: "space", label: "Listen address", group: "Network", example: "0.0.0.0", description: "The address the server binds to, when this PC has several network cards and the server must use one of them. Leave it out otherwise." }),
		A({ flag: "-maxplayers", style: "space", label: "Max players", group: "Server", managed: true, example: "10", description: "The number of player slots on the server. It is read when the server starts." }),
		A({ flag: "+sv_setsteamaccount", label: "Steam login token", group: "Server", example: "…", description: "A Game Server Login Token (GSLT) for this server, from steamcommunity.com/dev/managegameservers with app ID 730. Without one the server is LAN-only and is not listed publicly. Each token belongs to one server, and it is a secret: do not share it." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "de_dust2", description: "The map the server starts on, such as de_dust2." }),
		A({ flag: "+game_alias", label: "Game mode", group: "World", example: "casual", description: "The game mode the server starts in: competitive (the game's default), wingman, casual, deathmatch or custom. The Settings tab's mode file is the competitive one." }),
		A({ flag: "+exec", label: "Settings file", group: "Server", edit: false, managed: true, example: "server.cfg", description: "The settings file the server runs at start-up, from the game's cfg folder. The panel writes it, and the Settings tab edits it." }),
		FLAG({ flag: "-insecure", label: "Turn off Valve Anti-Cheat", group: "Advanced", description: "Starts the server with Valve Anti-Cheat (VAC) turned off. Leave it off unless you have a reason to change it." }),
	],
};

const guide = {
	name: "Counter-Strike 2",
	short: "Counter-Strike 2",
	summary:
		"Counter-Strike 2 is set up with console variables (\"convars\"): lines of a name and a value. `server.cfg` in the `game\\csgo\\cfg` folder holds the server's name, its password and whether it is LAN-only. The competitive mode's settings are in `gamemode_competitive_server.cfg` in the same folder. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name, its join password, the remote console password, who can join, whether cheats are allowed, sleep-when-empty and the bandwidth limit. Only the lines you set are in the file.",
		"gamemode_competitive_server.cfg": "The rules of the competitive mode: rounds, round and buy times, starting money, warm-up, friendly fire and team balancing. A setting you leave out keeps the game's own value.",
	},
	notes: [
		"The game reads the files when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The Steam login token is optional. Without one the server still starts, but it runs as LAN-only and is not listed publicly. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.",
		"Create the token at steamcommunity.com/dev/managegameservers with app ID 730. The research found the account rules (a registered phone number and no community ban) on one host's page, not on Valve's; check them there.",
		"The game is a large download (about 60 GB). A game update through the panel is only effective when the server is updated too: stop every server first.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented command to stop the server cleanly, so a match in progress may not be saved.",
		"Mods are not set up here. The plugin route is Metamod:Source with CounterStrikeSharp, but the research found no install steps, so plugins have to be added by hand under the server's addons folder.",
		"The competitive mode's file is only read in competitive mode. Starting the server in another mode with the Game mode argument uses that mode's own file, which this panel does not edit.",
		"The game port is UDP for players and the server list. SourceTV (UDP 27020) is off unless a setting turns it on, and the panel does not turn it on.",
	],
};

export default {
	type: "counterstrike2",
	title: "Counter-Strike 2",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: cs2ServerSettings,
			groupOrder: cs2ServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the game\\csgo\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
		"gamemode_competitive_server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Competitive mode" },
			settings: cs2ModeSettings,
			groupOrder: cs2ModeGroupOrder,
			mayBeMissing: "The panel does not write this file. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as mp_maxrounds 24.",
		},
	},
	launch,
	guide,
};

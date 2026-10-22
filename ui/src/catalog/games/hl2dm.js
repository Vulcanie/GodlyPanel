import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Half-Life 2: Deathmatch (srcds, -game hl2mp). Its settings are "convars": Source console variables, written one per line as
// `name value` in a .cfg file, the same shape as Counter-Strike: Source's and Garry's Mod's, so the panel's convar reader handles them.
// One file is offered:
//   server.cfg  in hl2mp\cfg. The game does not ship it; the panel writes it with the server's name, the password and sv_lan 0 when it
//               creates the server. Per Linode's guide a server.cfg that exists overrides the launch line, so the launch line has no
//               `+exec` for it.
// Source of every name and description: the research dossier (docs/research/games/hl2dm/02-config.md, 03-launch-args.md): Linode's
// HL2DM install guide (its sample server.cfg and the comments on each line), Valve's "Half-Life 2: Deathmatch" and "Source Dedicated
// Server" wiki pages, GameHostBros' config-files guide. The dossier gives no type or allowed values for any key; the 0/1 dropdowns
// are for settings whose wording is plainly on/off and whose sample values are 0 and 1. mapcycle.txt is a plain list of map names with no
// parser, so it is not offered here (see the notes).

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const hl2dmServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["sv_lan", "Local network only", "On makes a LAN server: only players on your local network can join. Keep it off for a server friends join over the internet.", "Joining"],
		["sv_timeout", "Drop silent players after (seconds)", "How many seconds a player can send nothing before the server disconnects them. 0 turns the check off. Linode's sample uses 65.", "Joining"],

		// Match rules
		["mp_teamplay", "Team deathmatch", "Off is free-for-all deathmatch. On is Combine versus Rebels team deathmatch.", "Match rules"],
		["mp_fraglimit", "Frag limit", "How many frags (kills) a player needs to end the match, after which the map changes. 0 means no limit.", "Match rules"],
		["mp_timelimit", "Time limit (minutes)", "How many minutes a map lasts before the server changes it. 0 means no limit.", "Match rules"],
		["mp_friendlyfire", "Friendly fire", "On lets teammates hurt each other. It only matters in team deathmatch.", "Match rules"],
		["mp_forcerespawn", "Respawn automatically", "On brings a player back to life on their own after they die. Off makes them press a key to respawn.", "Match rules"],
		["mp_allowspectators", "Allow spectators", "On lets players watch the match without playing.", "Match rules"],
		["mp_falldamage", "Fall damage", "The amount of damage a fall does. Linode's sample sets 10 and lists 0 as the default.", "Match rules"],
		["mp_footsteps", "Footstep sounds", "On plays the sound of players' footsteps.", "Match rules"],
		["mp_flashlight", "Flashlight", "On lets players use their flashlight.", "Match rules"],
		["hl2mp_allow_pickup", "Pick up props with the use key", "On lets players pick up physics objects they can carry by pressing the use key on them. Valve lists it as off by default.", "Match rules"],
		["sv_cheats", "Allow cheat commands", "Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on.", "Match rules"],
		["mapcyclefile", "Map rotation file", "The name of the file that lists the maps the server rotates through, instead of mapcycle.txt. If the file is missing the server uses the game's default rotation list.", "Match rules"],

		// Weapons and items
		["sv_hl2mp_weapon_respawn_time", "Weapon respawn time (seconds)", "How many seconds before a weapon that was picked up appears again. Linode lists 20 as the default.", "Weapons and items"],
		["sv_hl2mp_item_respawn_time", "Item respawn time (seconds)", "How many seconds before health, energy, ammo and props that were picked up appear again. Linode lists 30 as the default.", "Weapons and items"],

		// Voice
		["sv_voiceenable", "Voice chat", "On lets players talk to each other with their microphones.", "Voice"],
		["sv_alltalk", "Everyone hears everyone", "On lets all players hear each other. Off lets players hear only their own team.", "Voice"],

		// Downloads
		["sv_allowupload", "Allow sprays", "On lets players upload their custom spray images to the server.", "Downloads"],
		["sv_allowdownload", "Allow downloads", "On lets players download sprays, custom maps and other extra content from your server. Linode lists it as on by default; a player without your custom map gets it this way.", "Downloads"],

		// Network
		["sv_maxrate", "Highest bandwidth per player", "The most bandwidth the server lets one player use. 0 means no limit.", "Network"],
		["sv_minrate", "Lowest bandwidth per player", "The least bandwidth the server lets one player use. Linode lists 3500 as the default. 0 means no limit.", "Network"],
		["sv_maxupdaterate", "Highest updates per second", "The most updates per second the server will send a player. Linode lists 66 as the default and uses 300 in its sample.", "Network"],
		["sv_minupdaterate", "Lowest updates per second", "The fewest updates per second the server allows a player. Linode lists 10 as the default.", "Network"],
	]),
	{
		sv_lan: BOOL,
		sv_cheats: BOOL,
		mp_teamplay: BOOL,
		mp_friendlyfire: BOOL,
		mp_forcerespawn: BOOL,
		mp_allowspectators: BOOL,
		mp_footsteps: BOOL,
		mp_flashlight: BOOL,
		hl2mp_allow_pickup: BOOL,
		sv_voiceenable: BOOL,
		sv_alltalk: BOOL,
		sv_allowupload: BOOL,
		sv_allowdownload: BOOL,
	},
);

export const hl2dmServerGroupOrder = ["Server", "Joining", "Match rules", "Weapons and items", "Voice", "Downloads", "Network"];

const launch = {
	title: "Half-Life 2: Deathmatch",
	program: /\bsrcds(?:\.exe)?\b/i,
	// Both forms are used: `+word value` is a console command run at start-up, `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro: "Half-Life 2: Deathmatch is started with `+word value` console commands (the map, the player limit) and `-word` launch options (the port, the console). They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. The panel always writes it." }),
		A({ flag: "-game", style: "space", label: "Game folder", edit: false, managed: true, group: "Required", example: "hl2mp", description: "Tells srcds which game to run. For Half-Life 2: Deathmatch this is hl2mp. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "27435", description: "The port the server listens on and tells players to connect to. Valve's page says Source also uses it for the remote console. Change it from the server's Ports section so the panel can check for clashes." }),
		FLAG({ flag: "-strictportbind", label: "Stop if the port is taken", group: "Network", managed: true, description: "If the port is already in use, the server quits with an error instead of quietly using another port. Without it a second server would take another port and players would not find it." }),
		A({ flag: "-ip", style: "space", label: "Listen address", group: "Network", example: "0.0.0.0", description: "The network address the server listens on, so players can reach it. It has to be an address of this PC. Only needed with several network cards; it has nothing to do with the address players use from outside." }),
		FLAG({ flag: "-nohltv", label: "No SourceTV", group: "Network", description: "Turns SourceTV (the spectator broadcast) off and closes its port, which is usually 27020." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "16", description: "The number of player slots on the server. It is only read when the server starts. Valve's examples use 24, while Linode's guide says the game officially supports 16." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "dm_lockdown", description: "The map the server starts on, such as dm_lockdown. Give the map's name without .bsp." }),
		A({ flag: "+sv_setsteamaccount", label: "Steam login token", group: "Server", example: "…", description: "A Steam Game Server Login Token for this server. Valve's page says you need one if the server stops with the Steam connection error 18 or 106. Create one at steamcommunity.com/dev/managegameservers; the account must own the game. Treat it like a password." }),
		FLAG({ flag: "-condebug", label: "Write the console to a file", edit: false, managed: true, group: "Saves and logs", description: "Writes everything the console prints to console.log in the hl2mp folder. The Logs tab reads that file." }),
		FLAG({ flag: "-insecure", label: "Turn off Valve Anti-Cheat", group: "Advanced", description: "Starts the server without Valve Anti-Cheat (VAC). Servers run with it unless this is on the line." }),
	],
};

const guide = {
	name: "Half-Life 2: Deathmatch",
	short: "Half-Life 2: Deathmatch",
	summary:
		"Half-Life 2: Deathmatch is set up with console variables (\"convars\"): lines of a name and a value in `server.cfg`, in the `hl2mp\\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "The server's name and password, the match rules (team play, frag and time limits, respawn times), voice, downloads and network limits. Only the lines you set are in the file; a setting you leave out keeps the game's own value. When the file exists, what it says overrides the launch line.",
	},
	notes: [
		"The game reads the file when it starts, so stop and start the server after changing a setting.",
		"Friends join with the console command `connect <your address>:<port>`.",
		"The game does not come with a `server.cfg`; the panel writes one. The map rotation is a separate file, `hl2mp\\cfg\\mapcycle.txt`, with one map name per line. The panel cannot edit it yet. Copy `mapcycle_default.txt` to `mapcycle.txt` and change the copy, never the default file.",
		"Custom maps go in `hl2mp\\custom` (or `hl2mp\\custom\\maps`). Players who do not have your map download it from the server while Downloads are allowed.",
		"The Steam login token is optional. Valve says it is only needed when the server stops with error 18 or 106. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.",
		"The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The only stop method the research found is pressing CTRL+C in the console window.",
		"No mod support is set up: the research found no install method for plugins such as SourceMod and no Steam Workshop for this game.",
		"The port in the Ports section is the game port. The game also uses UDP 27020 (SourceTV). Two Source servers on one PC both want it, so the second one may take another number. `-nohltv` turns it off.",
		"Valve's examples start the server with 24 players, while Linode's guide says the game officially supports 16. The panel starts with 16; raise it with the Max players argument if you want to try more.",
	],
};

export default {
	type: "hl2dm",
	title: "Half-Life 2: Deathmatch",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: hl2dmServerSettings,
			groupOrder: hl2dmServerGroupOrder,
			mayBeMissing: "The game does not come with server.cfg. The panel writes it in the hl2mp\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Natural Selection 2 (x64\Server.exe, Steam app 4940). No source lists serverconfig.json's keys, and the only config file whose keys are
// documented is MapCycle.json (the map rotation), from the Game Host Bros map rotation guide and the Citadel mods guide. The form offers
// that file only. serverconfig.json and serveradmin.json are not in the form because their keys are not documented. Start, queries and
// the config and log folders were checked on a real install (docs/research/games/ns2/06-verification.md).

const mapcycleSettings = withChoices(
	rows([
		["mode", "Map order", "How the server picks the next map: order plays the maps in the list in turn, random shuffles them. Read when the server starts.", "Rotation"],
		["time", "Minutes per map", "How many minutes each map is played before the server switches, counted from when the round ends. The community guide's example is 30.", "Rotation"],
		["maps", "Maps", "The map names in the order they are played, as a JSON list such as [\"ns2_summit\", \"ns2_veil\"]. Map names are case sensitive. Do not list the same map twice when the order is set to order.", "Maps"],
		["mods", "Mods for every map", "Workshop mod IDs in hexadecimal, as a JSON list such as [\"706D242\"]. The server keeps using these mods on every map.", "Mods"],
	]),
	{
		mode: ["order", "random"],
	},
);

const mapcycleOrder = ["Rotation", "Maps", "Mods"];

const launch = {
	title: "Natural Selection 2",
	program: /Server\.exe/i,
	style: "space",
	editable: true,
	where: "the `Server.exe` line of the server's start script",
	intro:
		"The panel writes the name, the map, the player limit, the port and the config folder. Map and player limit can be changed here. Workshop mods go in with -mods and are added at the end of the line.",
	args: [
		A({
			flag: "-name",
			style: "space",
			label: "Server name",
			group: "Required",
			edit: false,
			managed: true,
			description: "The name shown in the server list. The panel writes it from the Server Name you typed when you created the server.",
		}),
		A({
			flag: "-map",
			style: "space",
			label: "Start map",
			group: "World",
			managed: true,
			example: "ns2_summit",
			description: "The map the server starts on. The name is case sensitive, such as ns2_summit. The server then follows MapCycle.json.",
		}),
		A({
			flag: "-limit",
			style: "space",
			label: "Player limit",
			group: "Players",
			managed: true,
			example: "20",
			description: "The most players who can join at once. The dossier's example is 20; the game's own default is not in the sources.",
		}),
		A({
			flag: "-port",
			style: "space",
			label: "Game port",
			group: "Network",
			managed: true,
			example: "27040",
			description: "The port the server listens on and players connect to. Change it from the server's Ports section so the panel can check for clashes.",
		}),
		A({
			flag: "-config_path",
			style: "space",
			label: "Config folder",
			group: "Files",
			edit: false,
			managed: true,
			description: "The folder the server reads its config files from. The panel points it at the config folder inside the server's folder, so the settings can be edited here.",
		}),
		A({
			flag: "-logdir",
			style: "space",
			label: "Log folder",
			group: "Files",
			edit: false,
			managed: true,
			description: "The folder the server writes its log to. The panel points it at the serverlogs folder inside the server's folder so the Logs tab can show it.",
		}),
		A({
			flag: "-mods",
			style: "space",
			label: "Workshop mods",
			group: "Mods",
			example: "706d242 812f004",
			description: "Steam Workshop IDs of mods to load, in hexadecimal, separated by spaces. The server downloads them when it starts. Remove the flag to run without mods.",
		}),
	],
};

const guide = {
	name: "Natural Selection 2",
	short: "Natural Selection 2",
	summary:
		"Natural Selection 2's server is x64\\Server.exe, installed from Steam app 4940. The panel starts it with a name, a map, a player limit, a port, and a config and log folder inside the server's folder. The game writes its config files on the first start; the panel's form covers the map rotation file, MapCycle.json.",
	files: {
		"mapcycle.json": "The map rotation: which maps the server plays, in what order, how many minutes each lasts, and the Workshop mods it keeps using. Written by the game (or by you) in the config folder.",
	},
	notes: [
		"The panel stops this server by closing its window, then ending the program after 15 seconds. The game has no clean stop command the panel uses. Stop the server before you update it, and back up first.",
		"The server's own settings (serverconfig.json) and admin list (serveradmin.json) are in the config folder, but this panel does not show their settings: the game's keys are not documented in the sources the panel was built from. Edit them with a text editor while the server is stopped, and keep them valid JSON, since bad JSON stops the server.",
		"The game port is 27040 by default in this panel, not the 27015 the sources name, because another template already uses 27015. The game may also use the port above it, so keep that one free.",
		"Workshop mods listed with -mods are downloaded when the server starts. Mods listed in mapcycle.json are kept for every map.",
		"The panel starts the server with -logdir, so the log is serverlogs\\log-Server.txt in the server's folder, and the Logs tab shows it. Workshop mods are still stored under AppData\\Roaming\\Natural Selection 2\\workshop.",
		"The server answers status queries on the port after the game port (27041 by default), so keep it free.",
	],
};

export default {
	type: "ns2",
	title: "Natural Selection 2",
	files: {
		"mapcycle.json": {
			parser: "json",
			excludePaths: [],
			structuredPaths: [],
			sectionLabels: {},
			settings: mapcycleSettings,
			groupOrder: mapcycleOrder,
			mayBeMissing:
				"The panel does not write mapcycle.json. The game creates the config files on the server's first start, so start the server once, then reload this page. If the file is still missing, create config\\mapcycle.json in the server's folder with the maps you want, then reload.",
		},
	},
	launch,
	guide,
};

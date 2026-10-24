import { rows, withChoices } from "../rows.js";

// Mount & Blade II: Bannerlord. One file is offered: ds_config_server.txt, in the Modules\Native folder of the server's install. The
// panel writes it when the server is created, with the server name, the game mode, the admin password (only if set) and the line
// start_game_and_mission. Its format is one command or setting per line, the name then the value (no quotes in the official example).
// The parser is the console-variable one, which reads that shape; a value with a space is written in quotes when edited here.
//
// Source of every name and description: the research dossier (docs/research/games/bannerlord/02-config.md), which cites the official
// hosting page (moddocs.bannerlord.com) for these three keys and the game modes. The page gives no defaults or value ranges for them,
// so none are stated. The many other keys in community guides come from a mod build, not the official one, and are left out.
// The launch line has no form: see the implementation notes.

const GAME_TYPES = [
	["Siege", "Siege"],
	["TeamDeathmatch", "Team deathmatch"],
	["Captain", "Captain"],
	["Skirmish", "Skirmish"],
	["Duel", "Duel"],
	["Battle", "Battle"],
];

export const bannerlordSettings = withChoices(
	rows([
		["ServerName", "Server name", "The name players see in the multiplayer server list. The official page's example is a plain sentence, so spaces are fine.", "Server"],
		["GameType", "Game mode", "The mode the server plays: the official page lists Siege, Team deathmatch, Captain, Skirmish, Duel and Battle. The page does not say what each one plays like, and the panel does not check the mode against the game's maps.", "Server"],
		["AdminPassword", "Admin password", "The password that protects the server's web admin panel. The official page says it is blank by default and says to set a strong one before the panel is reachable from outside your network.", "Access"],
	]),
	{
		GameType: { choices: GAME_TYPES, allowCustom: false },
	},
);

export const bannerlordGroupOrder = ["Server", "Access"];

const guide = {
	name: "Mount & Blade II: Bannerlord",
	short: "Bannerlord",
	summary:
		"Bannerlord's server reads its settings from `ds_config_server.txt` in the game's `Modules\\Native` folder. The panel writes that file when it creates the server, with the name and the game mode. The login token, which players need to find the server in the public list, is typed into the server's creation form and sits in the start script.",
	files: {
		"ds_config_server.txt":
			"The server's name, its game mode and the admin password for the web admin panel. The file also ends with the command that starts the server and its first mission, so the server does not wait in the intermission state. Only the lines the panel needs are in it.",
	},
	notes: [
		"**The panel cannot stop the server cleanly.** The official page gives no stop command. Stop closes the server's window and ends the process after 15 seconds. Keep the window (it is minimized), and close it yourself first if you can.",
		"**The login token is a secret.** It is made in the game's multiplayer lobby with the console command `customserver.gettoken` (press the tilde key). It expires after 3 months, and the official page asks you to keep it private. The panel writes it into the start script.",
		"**Players need the same modules as the server.** Bannerlord's server takes mods as module folders, and the official page says players must load the same ones. The panel adds no mods.",
		"**No map is set by the panel.** The official page says maps must be registered in the config with commands such as `add_map_to_usable_maps`, and the research found no map names for the official build. Add maps by hand with the server stopped.",
		"**Ports.** The game port (25910) is UDP. The official page also gives TCP on the same number for the web admin panel and map downloads, which this panel has not checked.",
		"**Logs.** The panel starts the server with its log folder inside the server's folder, so the Logs tab can read them.",
	],
};

export default {
	type: "bannerlord",
	title: "Mount & Blade II: Bannerlord",
	files: {
		"ds_config_server.txt": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: bannerlordSettings,
			groupOrder: bannerlordGroupOrder,
			mayBeMissing: "The panel writes this file in the Modules\\Native folder when it creates the server. If it has been deleted, the game will not start the server's first mission until start_game_and_mission is put back at the end of the file.",
		},
	},
	launch: null,
	guide,
};

import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Don't Starve Together. The panel runs one shard (the overworld, called Master), so the settings it shows are the cluster's
// cluster.ini, in data\DoNotStarveTogether\Cluster_1 inside the server's folder. Plain INI, [SECTION] headings and key = value.
// Source for every key: Klei's Dedicated Server Settings Guide (kleiforums.com topic 64552), checked against the DST wiki page
// "Dedicated Server" and the game's own scripts (shardindex.lua, gamemodes.lua). Only keys that source explains are listed; the
// shard link keys (the [SHARD] section) are hidden because this version has no second shard.
//
// Not in the form, on purpose:
//   - Master\server.ini: its ports are on the launch line (the line wins over the file), so it has nothing left to edit.
//   - worldgenoverride.lua and modoverrides.lua: Lua tables, and the panel has no reader for Lua.

const S = (section, list) => rows(list.map(([key, ...rest]) => [`${section}::${key}`, ...rest]));

export const dstSettings = withChoices(
	{
		...S("NETWORK", [
			["cluster_name", "Server name", "The name shown in the in-game server list. Do not leave it empty on an online server.", "Server"],
			["cluster_description", "Description", "Text shown in the server's details panel in the server list.", "Server"],
			["cluster_password", "Password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		]),
		...S("GAMEPLAY", [
			["max_players", "Max players", "The most players connected at once. The game accepts 1 to 64; its own default is 16, and the panel starts a new server at 8.", "Server"],
			["game_mode", "Game mode", "How death works. Survival is the normal game: a player who dies becomes a ghost that friends can revive. The older Endless and Wilderness modes are now part of the world rules instead, and the game turns them into Survival.", "Gameplay"],
			["pvp", "Players can hurt each other", "Lets players damage each other.", "Gameplay"],
			["pause_when_empty", "Pause when nobody is on", "Freezes the world while no one is connected, so no game time passes while everyone is away. The game's own default is off; the panel turns it on for a new server.", "Gameplay"],
			["vote_enabled", "Player votes", "Lets players start votes in the game, such as kicking someone or rolling the world back.", "Gameplay"],
		]),
		...S("NETWORK", [
			["autosaver_enabled", "Autosave each day", "Saves the world at the end of every in-game day. Stopping the server from the panel does not use the game's own shutdown command, so this autosave is what keeps your progress: leave it on.", "Saving"],
			["offline_cluster", "Offline server", "Not listed in the server list; only players on your own network can join, and Steam features do not work. An offline server needs no cluster token. To go online, turn this off and put your Klei cluster token (a single line of text) in a file named cluster_token.txt in this server's data\\DoNotStarveTogether\\Cluster_1 folder.", "Network"],
			["lan_only_cluster", "Local network only", "Only machines on the same local network can join.", "Network"],
			["tick_rate", "Network updates per second", "How many times a second the server sends updates to players. The game's default is 15 and Klei says to leave it; if you change it, use a number that divides 60 evenly (15, 20 or 30) and only for games on a local network. 15 to 60 is accepted.", "Network"],
			["whitelist_slots", "Slots kept for the whitelist", "How many places are kept free for the players listed in whitelist.txt. It does not make the server whitelist-only; use a password for that.", "Network"],
		]),
		...S("MISC", [
			["max_snapshots", "Rollback snapshots kept", "How many save snapshots are kept so the world can be rolled back. One is made at every save.", "Saving"],
			["console_enabled", "Server console", "Lets Lua commands be typed into the server's console window. The panel also starts the game with the -console argument.", "Advanced"],
		]),
		...S("STEAM", [
			["steam_group_only", "Steam group members only", "Only members of the Steam group named below may join.", "Steam group"],
			["steam_group_id", "Steam group id", "The number of the Steam group the two settings around it use.", "Steam group"],
			["steam_group_admins", "Steam group admins are server admins", "Lets the admins of that Steam group be admins on this server too.", "Steam group"],
		]),
	},
	{
		// The game rewrites the two older modes to survival, so survival is the one real value; others are still accepted.
		"GAMEPLAY::game_mode": { choices: [["survival", "Survival"]], allowCustom: true },
	},
);

export const dstGroupOrder = ["Server", "Gameplay", "Saving", "Network", "Steam group", "Advanced"];

const launch = {
	title: "Don't Starve Together",
	program: /\bdontstarve_dedicated_server_nullrenderer_x64(?:\.exe)?\b/i,
	style: "space",
	editable: true,
	where: "the `dontstarve_dedicated_server_nullrenderer_x64.exe` line of the server's start script",
	intro: "The panel runs one Don't Starve Together world (the overworld, called the Master shard): no Caves. The server's name, password and rules are in `cluster.ini` (the Settings tab); the launch line says where the data is kept and which ports are used. Changes apply the next time the server starts.",
	args: [
		FLAG({ flag: "-console", label: "Server console", edit: false, managed: true, group: "Required", description: "Lets Lua commands be typed into the server's console window. The game says this argument is deprecated in favour of the console_enabled setting, but still accepts it, and Klei's own start scripts still use it." }),
		A({ flag: "-persistent_storage_root", label: "Data folder", edit: false, managed: true, group: "Files", example: '"%~dp0data"', description: "The base folder where the server keeps its settings, saves and logs. It has to be an absolute path. The panel keeps it inside the server's own folder so two servers never share one." }),
		A({ flag: "-conf_dir", label: "Config folder name", edit: false, managed: true, group: "Files", example: "DoNotStarveTogether", description: "The folder name under the data folder that holds the clusters. One folder name, no slashes. The panel's backups and logs look here." }),
		A({ flag: "-cluster", label: "Cluster folder", edit: false, managed: true, group: "Files", example: "Cluster_1", description: "The folder with cluster.ini and the shard folders. One cluster is one world with its shards. The panel's settings, backups and logs look in this folder." }),
		A({ flag: "-shard", label: "Shard folder", edit: false, managed: true, group: "Files", example: "Master", description: "Which shard of the cluster this program runs; it is the name of the shard's folder. The panel runs only the Master (the overworld)." }),
		A({ flag: "-port", label: "Game port", group: "Network", managed: true, example: "8930", description: "The UDP port players connect to. It overrides server_port in server.ini. The game accepts 1024 to 65535 for online servers; for an offline server on your own network it documents 10998 to 11018. Change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "-steam_master_server_port", label: "Steam server port", group: "Network", managed: true, example: "27016", description: "An internal port Steam uses (UDP). It must be different for every Don't Starve Together server on this PC. Change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "-steam_authentication_port", label: "Steam login port", group: "Network", managed: true, example: "8766", description: "An internal port Steam uses to check players in (UDP). It must be different for every Don't Starve Together server on this PC. The panel keeps it two above the game port; if you change the game port, change this one to match." }),
		A({ flag: "-bind_ip", label: "Listen address", group: "Network", example: "0.0.0.0", description: "The network address the server listens on for players. Advanced; most people never need it. It is not the same setting as the shard link address in cluster.ini." }),
		A({ flag: "-backup_log_count", label: "Old log files to keep", group: "Files", example: "10", description: "How many of the previous runs' log files the game keeps in the shard's backup folder. The game does not document its own default." }),
		A({ flag: "-ugc_directory", label: "Mod download folder", group: "Files", example: "../ugc_mods", description: "Where Steam Workshop mods are downloaded. By default each shard keeps its own copy under ugc_mods in the server's folder. A relative path starts from the bin64 folder." }),
		FLAG({ flag: "-skip_update_server_mods", label: "Skip mod updates at start", group: "Advanced", description: "Starts without checking for or downloading Workshop mod updates. The server normally updates its mods every time it starts, which can make a start slower." }),
		FLAG({ flag: "-only_update_server_mods", label: "Only update the mods", edit: false, group: "Advanced", description: "Downloads and updates the mods, then quits without starting the world. It is not offered in the form: left on the line, the server would never start." }),
		FLAG({ flag: "-offline", label: "Offline", edit: false, group: "Network", description: "Starts the server offline: not in the server list, local network only, no cluster token needed. Use the Offline server setting in cluster.ini instead, so it shows on the Settings tab." }),
		A({ flag: "-players", label: "Max players", edit: false, group: "Server", example: "8", description: "The most players allowed to join, 1 to 64. It overrides max_players in cluster.ini, so the panel leaves it off and uses that setting." }),
		A({ flag: "-tick", label: "Network tick rate", edit: false, group: "Network", example: "15", description: "How many times a second the server sends updates to players, 15 to 60. It overrides tick_rate in cluster.ini; the panel leaves it off." }),
		FLAG({ flag: "-disabledatacollection", label: "Turn off data collection", edit: false, group: "Advanced", description: "Stops the server sending the data Klei collects. Klei says the online services need that data, so the server can then only run offline." }),
		A({ flag: "-monitor_parent_process", label: "Exit with the program that started it", edit: false, group: "Advanced", example: "1234", description: "The process id of the program that started the server. Klei's Linux start script passes its own id here; the game does not document what it does with it, so the panel does not use it." }),
	],
};

const guide = {
	name: "Don't Starve Together",
	short: "Don't Starve Together",
	summary: "Don't Starve Together keeps the server's shared settings in `cluster.ini`, in `data\\DoNotStarveTogether\\Cluster_1` inside the server's folder. This version of the panel runs a single overworld (the Master shard): there is no Caves shard, because the panel runs one program per server and a cluster with caves is two.",
	files: { "cluster.ini": "The server's name, password, player limit, game mode, saving, and whether it is online or offline." },
	notes: [
		"An online server needs a **cluster token** from your Klei account (accounts.klei.com, Games, Don't Starve Together, Game Servers). Paste it into the create form; the panel writes it to `cluster_token.txt` in the cluster folder. Without one the server is made offline (your own network only). A token can be added later by putting it alone in that file and turning off **Offline server**.",
		"The server's ports are on the launch line, not in `Master\\server.ini`, so they can be changed from the server's Ports section. The game port is the one players connect to (UDP); the two Steam ports are internal.",
		"The world itself (seasons, resources, how hard it is) is set in `worldgenoverride.lua` in the `Master` folder, and mods are set in `modoverrides.lua` there. Both are Lua files, which the Settings tab does not edit. The game builds the world from its default preset when no override file is there.",
		"Stopping the server from the panel closes the program without the game's own shutdown command (`c_shutdown()`), so the world is saved only by the autosave at the end of each in-game day. Anything since the last day change is lost.",
		"Mods are Steam Workshop mods listed when the server is created. The server downloads them when it starts. Mods marked client-only are installed by each player in their own game and do not belong on the server.",
	],
};

export default {
	type: "dst",
	title: "Don't Starve Together",
	files: {
		"cluster.ini": {
			parser: "ini",
			// The [SHARD] section only holds the link between shards; with one shard it is not something to change.
			excludeSections: ["SHARD"],
			sectionLabels: { GAMEPLAY: "Gameplay", NETWORK: "Network", MISC: "Advanced", STEAM: "Steam group" },
			settings: dstSettings,
			groupOrder: dstGroupOrder,
			mayBeMissing: "The panel writes cluster.ini when it creates the server. If it is missing, the game's data folder is not where the panel expects: look in data\\DoNotStarveTogether\\Cluster_1 inside the server's folder, then reload this page.",
		},
	},
	launch,
	guide,
};

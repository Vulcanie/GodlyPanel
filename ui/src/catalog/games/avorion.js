import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Avorion. Two places hold the settings:
//   server.ini    inside the galaxy folder (galaxy\<name> in the server's install folder). The SERVER makes it on its first run, OVERWRITES
//                 IT AT EVERY START, and rebuilds it with defaults and a new seed after a single mistake in it. Edit it with the server
//                 stopped, and make a backup first. The panel writes none.
//   launch line   the name, ports, player limit and admin, plus a set of optional arguments the Settings tab can add.
// There is no official (Boxelware) document: the names, defaults and sections are from the Avorion wiki (avorion.fandom.com/wiki/Server),
// XGamingServer's server.ini reference and Nodecraft's and the Pterodactyl egg's argument lists; nothing was run on a real install.
// Choices are given only where a source states the values: Scenario (XG: 0 Creative, 1 Normal), accessListMode (Blacklist or Whitelist,
// XG) and the difficulty (-3 to 3).
//
// Left out of the file form, on purpose:
//  - Seed: changing it on an existing galaxy breaks the saves (XG). The launch line has --seed for the first start.
//  - Difficulty: the wiki says older files spell it "Difficulty" with a typo and Nodecraft lists "Difficulity", so which spelling this
//    version writes is not known. The launch line has --difficulty, whose spelling is not in doubt.
//  - name, maxPlayers and port: the panel's launch line already carries them, and which of the two wins is not documented.
//  - the galaxy-generation settings (MapFactions, Rifts, Barrier, PermaDestruction, ExplicitCallables): they shape the galaxy when it is
//    made, no source says they apply to an existing one, and the file does not exist before that first start.
//  - the keys the wiki marks "currently unused" or deprecated, steamIdOverride, Version, startUpScript and startSectorScript.

const rowsGame = rows([
	// Rules
	["Game::Scenario", "Game mode", "The galaxy's mode: Normal is the regular game, Creative is the build-anything mode. The default is Normal. It is set when the galaxy is made; no source says whether changing it later has an effect.", "Rules"],
	["Game::HardcoreEnabled", "Hardcore (perma-destruction)", "Turns hardcore mode on for the whole server: a player's ship, once destroyed, cannot be rebuilt at a repair dock and its turrets and upgrades are lost. The wiki says the default depends on the difficulty the galaxy was made with; another site says it is off.", "Rules"],
	["Game::InfiniteResources", "Infinite resources", "Gives every player unlimited resources (the game's \"creative mode\"). The default is off.", "Rules"],
	["Game::CollisionDamage", "Collision damage", "A multiplier for the damage objects take when they collide. 0 is no damage and 1 is full damage; a number like 0.5 is half. The default is 1.", "Rules"],
	["Game::Storyline", "Story missions", "Whether the story missions are enabled. The default is on.", "Rules"],
	["Game::DamageMultiplier", "NPC damage", "A multiplier for the damage non-player ships deal. 1 is normal; the default is 1.", "Rules"],
	["Game::EventsFactor", "Random events", "A multiplier for how often random events happen. 1 is normal; the default is 1.", "Rules"],
	["Game::RelationGainFactor", "Relation gain speed", "A multiplier for how fast relations with factions improve. 1 is normal; the default is 1.", "Rules"],
	["Game::RelationLossFactor", "Relation loss speed", "A multiplier for how fast relations with factions get worse. 1 is normal; the default is 1.", "Rules"],
	["Game::InitialRelations", "Starting relations", "How factions feel about new players at the start, from -3 (friendly) to 3 (hostile). The default is 0.", "Rules"],
	["Game::PreciseAIAim", "Precise NPC aim", "When on, non-player ships aim more accurately. The default is off.", "Rules"],
	["Game::BoardingAllowed", "Allow boarding", "Whether ships can be boarded. The default is on.", "Rules"],
	["Game::FullBuildingUnlocked", "All building materials", "Makes every building material available from the start. The default is off.", "Rules"],

	// Players
	["Game::PlayerToPlayerDamage", "Player-versus-player damage", "Whether players can damage each other's ships, for the whole server. The default is on.", "Players"],
	["Game::LogoutInvincibility", "Ships safe while offline", "A player's ships cannot be destroyed while that player is offline. The default is on.", "Players"],
	["Game::LogoutInvincibilityDelay", "Offline safety delay (seconds)", "How long a player must be offline before their ships become invincible, in seconds. The default is 30.", "Players"],
	["Game::sameStartSector", "Same start sector", "When on, every new player starts in the same sector. When off, each new player gets a random empty sector on the outer rim as their home sector. The default is on.", "Players"],
	["Game::SafePlayerInput", "Double-check player input", "Experimental. Checks the updates players send to the server and accepts only control input, to stop cheating. The wiki says turning it off gives much smoother performance and turning it on can be very slow over a slow network. The default is off.", "Players"],

	// Spawn and resources
	["Game::StartingResources", "Starting resources", "How generous the start is, from -4 (quick start, more resources) to 0 (normal). The default is 0.", "Spawn and resources"],
	["Game::ResourceAsteroidFactor", "Resource asteroid density", "A multiplier for how many resource asteroids there are. 1 is normal; the default is 1.", "Spawn and resources"],
	["Game::ResourceWreckageFactor", "Wreckage resources", "A multiplier for the resources found in wreckage. 1 is normal; the default is 1.", "Spawn and resources"],

	// Wreckage
	["Game::BigWreckageDespawnTime", "Big wreckage lasts (seconds)", "How long new large wreckage (more than 15 blocks) made during play, such as in combat, stays before it disappears, in seconds. The default is 1800.", "Wreckage"],
	["Game::SmallWreckageDespawnTime", "Small wreckage lasts (seconds)", "How long new small wreckage (15 blocks or less) made during play stays before it disappears, in seconds. The default is 900.", "Wreckage"],

	// Limits
	["Game::MaximumFightersPerSectorAndPlayer", "Fighters per sector and player", "The most fighters one player can have in one sector at once. -1 means no limit, which is the default.", "Limits"],
	["Game::MaximumBlocksPerCraft", "Blocks per ship", "The most blocks any ship can be made of. -1 means no limit, which is the default.", "Limits"],
	["Game::MaximumVolumePerShip", "Volume per ship", "The most volume a ship can reach. -1 means no limit, which is the default.", "Limits"],
	["Game::MaximumVolumePerStation", "Volume per station", "The most volume a station can reach. -1 means no limit, which is the default.", "Limits"],
	["Game::MaximumPlayerShips", "Ships per player", "The most ships one player can own at a time. -1 means no limit, which is the default.", "Limits"],
	["Game::MaximumPlayerStations", "Stations per player", "The most stations one player can own at a time. -1 means no limit, which is the default.", "Limits"],
	["Game::MaximumStationsPerSector", "Stations per sector", "The most stations that can be in one sector. -1 means no limit, which is the default.", "Limits"],
	["Game::MaximumAllianceShips", "Ships per alliance", "The most ships one alliance can own. -1 means no limit, which is the default.", "Limits"],
	["Game::MaximumAllianceStations", "Stations per alliance", "The most stations one alliance can own. -1 means no limit, which is the default.", "Limits"],
	["Game::MaximumBlocksPerTurret", "Blocks per turret", "The most blocks one turret can be made of. The default is 250.", "Limits"],
	["Game::PlayerInventorySlots", "Player inventory slots", "How many inventory slots each player has. The default is 1000.", "Limits"],
	["Game::AllianceInventorySlots", "Alliance inventory slots", "How many inventory slots each alliance has. The default is 1000.", "Limits"],

	// Performance
	["System::workerThreads", "Sector update threads", "How many threads update the sectors at once (the same as the Threads setting in the game). Keep it at or below the number of processor cores. Sources disagree on the default (1 and 25).", "Performance"],
	["System::generatorThreads", "Sector generator threads", "How many threads make new sectors while players are calculating routes. The default is 2.", "Performance"],
	["System::scriptBackgroundThreads", "Script background threads", "How many threads run heavy script work during play, such as building new ship models. The default is 2.", "Performance"],
	["System::aliveSectorsPerPlayer", "Sectors kept alive per player", "How many sectors stay active for each player and alliance that has ships in them. The wiki says 5 on a multiplayer server.", "Performance"],
	["System::sectorUpdateTimeLimit", "Keep idle sectors (seconds)", "How long sectors that cannot be simulated from a distance stay in memory, in seconds. The default is 300.", "Performance"],
	["System::emptySectorUpdateInterval", "Empty sector update step (seconds)", "The time between update steps for sectors with no players, in seconds. The default is 0.5.", "Performance"],
	["System::weakUpdate", "Fast sector simulation", "Simulates sectors without players with a faster, less accurate update. The default is on.", "Performance"],
	["System::hangDetection", "Hang detection", "Watches for a hung or crashed server. The default is on.", "Performance"],

	// Saves
	["System::saveInterval", "Save every (seconds)", "How often the server saves the galaxy, in seconds. The default in this file is 600 (10 minutes). The --save-interval launch option is a separate setting with a default of 300.", "Saves"],
	["System::backups", "Hourly backups", "Whether the server makes its own backup every hour. The default is on.", "Saves"],
	["System::backupsPath", "Backup folder", "Where the server's own backups go. Empty uses the server's default place.", "Saves"],

	// Network and privacy
	["Networking::isPublic", "Public", "A privacy setting, the same as the --public launch option. The wiki says that when on, only one administrator is allowed and the server does not show up in the LAN menu. The default is on.", "Network and privacy"],
	["Networking::isListed", "List publicly", "Shows the server in the public server list when Steam networking is also on. The default is off.", "Network and privacy"],
	["Networking::isAuthenticated", "Check players with Steam", "Whether players are checked with Steam when they join (the \"Authenticate Users\" setting in the game). The default is on.", "Network and privacy"],
	["Networking::useSteam", "Use Steam networking", "Lets players join through Steam, for example with \"join game\". Joining by IP and a port other than 27000 needs this. The default is on.", "Network and privacy"],
	["Networking::vacSecure", "VAC anti-cheat", "Whether Valve's anti-cheat protects the server. The default is on.", "Network and privacy"],
	["Networking::broadcastInterval", "Update broadcast (seconds)", "The time between the server's mass update broadcasts, in seconds. The default is 5.", "Network and privacy"],
	["Networking::sendStatsToAdmins", "Send stats to admins", "Sends server statistics to the administrator. The default is on.", "Network and privacy"],

	// Remote console
	["Networking::rconPassword", "Remote console password", "The password the remote console (RCON) needs. Empty turns the remote console off, which is the default. The panel does not use it.", "Remote console"],
	["Networking::rconPort", "Remote console port (TCP)", "The TCP port of the remote console, when it is on. The default is 27015.", "Remote console"],
	["Networking::rconIp", "Remote console address", "The IP address the remote console listens on. Empty listens on all addresses, which is the default.", "Remote console"],

	// Server info
	["Administration::description", "Server description", "A description shown in the server list. The wiki's default is \"An Avorion Server\".", "Server info"],
	["Administration::password", "Join password", "What players must type to join; a wrong one kicks them. Empty means anyone can join, which is the default. Set it after the first start, once the server has made this file.", "Server info"],
	["Administration::accessListMode", "Access list", "Whether the server uses a blacklist (everyone can join except those on it) or a whitelist (only those on it can join). The default is Blacklist.", "Server info"],
	["Administration::pausable", "Allow pausing", "Lets the server be paused. The default is off.", "Server info"],
	["Game::motd", "Message of the day", "A message shown to players when they join. Empty shows none, which is the default.", "Server info"],

	// Advanced
	["Game::DevMode", "Developer mode", "Turns on the game's developer mode. Leave it off on a normal server. The default is off.", "Advanced"],
	["System::profiling", "Profiling", "Records performance and memory details so the /status command prints a lot more; the server may run slightly slower. The default is off.", "Advanced"],
	["System::sendCrashReports", "Send crash reports", "Whether the server sends crash reports. The default is on.", "Advanced"],
]);

const settings = withChoices(rowsGame, {
	"Game::Scenario": [["0", "Creative"], ["1", "Normal"]],
	"Administration::accessListMode": [["Blacklist", "Blacklist (everyone but those listed)"], ["Whitelist", "Whitelist (only those listed)"]],
});

const groupOrder = ["Rules", "Players", "Spawn and resources", "Wreckage", "Limits", "Performance", "Saves", "Network and privacy", "Remote console", "Server info", "Advanced"];

const TRUE_FALSE = [["true", "Yes"], ["false", "No"]];

// Launch line: every Avorion argument is written `--name value`.
const launch = {
	title: "Avorion",
	program: /\bbin\\AvorionServer(?:\.exe)?/i,
	style: "space",
	editable: true,
	where: "the `bin\\AvorionServer.exe` line of the server's start script",
	intro:
		"Avorion's galaxy, ports, name, player limit and admin are given on the command that starts it. The rest of its settings are in the galaxy's server.ini (the Settings tab). Whether a launch argument beats the same setting in server.ini is not documented. Changes apply the next time the server starts.",
	args: [
		A({ flag: "--galaxy-name", label: "Galaxy name", edit: false, managed: true, group: "Required", example: '"Avorion"', description: "The galaxy to load or create. It is the folder name under galaxy, so a new name makes a new galaxy and keeps the old one. Changing it also moves where the panel looks for server.ini." }),
		A({ flag: "--datapath", label: "Galaxies folder", edit: false, managed: true, group: "Required", example: "galaxy", description: "The folder the galaxies are kept in, counted from the server's folder. The panel's backups and Settings tab expect it to be galaxy, so leave it." }),
		A({ flag: "--server-name", label: "Server name", managed: true, group: "Server", example: '"My Avorion Server"', description: "The name shown when the server is queried and in the server list." }),
		A({ flag: "--admin", label: "Admin Steam ID", managed: true, group: "Server", example: "76561198000000000", description: "The 17-digit Steam64 id of the player who is the server's administrator. Without it nobody is admin. The wiki says the argument takes the id of the administrators; how to give several was not found." }),
		A({ flag: "--max-players", label: "Max players", managed: true, group: "Server", example: "10", description: "The most players that can be online at once. The default is 10." }),
		A({ flag: "--port", label: "Game port", managed: true, group: "Network", example: "27000", description: "The port players connect to, UDP and TCP. The default is 27000, and a direct-IP join works only on that port. The panel's Ports section does not rewrite this argument: change it here and in the Ports section together." }),
		A({ flag: "--query-port", label: "Query port", managed: true, group: "Network", example: "27004", description: "The UDP port used to answer server queries. Only the Pterodactyl egg uses this argument and no page describes it; the panel sets it to the game port plus 4." }),
		A({ flag: "--steam-query-port", label: "Steam query port", managed: true, group: "Network", example: "27002", description: "The UDP port for Steam's server browser. Only the Pterodactyl egg uses this argument and no page describes it; the panel sets it to the game port plus 2." }),
		A({ flag: "--steam-master-port", label: "Steam master port", managed: true, group: "Network", example: "27003", description: "The UDP port for Steam networking. Only the Pterodactyl egg uses this argument and no page describes it; the panel sets it to the game port plus 3." }),
		A({
			flag: "--difficulty",
			label: "Difficulty",
			group: "Rules",
			example: "0",
			options: [["-3", "-3 Beginner"], ["-2", "-2 Easy"], ["-1", "-1 Normal"], ["0", "0 Veteran"], ["1", "1 Expert"], ["2", "2 Hardcore"], ["3", "3 Insane"]],
			description: "The difficulty of a new galaxy, from -3 to 3. The default is 0. The names come from one hosting site; the wiki gives only the numbers.",
		}),
		A({ flag: "--seed", label: "Seed", group: "Rules", example: "MySeed1", description: "The seed a new galaxy is made from (letters and numbers). Only used when the galaxy is first made; changing it for an existing galaxy breaks its saves." }),
		A({ flag: "--infinite-resources", label: "Infinite resources", group: "Rules", example: "true", options: TRUE_FALSE, description: "Gives all players unlimited resources. The wiki's table gives no default; the server.ini setting is off by default." }),
		A({ flag: "--collision-damage", label: "Collision damage", group: "Rules", example: "1", description: "How much damage objects take when they collide, from 0 (none) to 1 (full). The default is 1." }),
		A({ flag: "--same-start-sector", label: "Same start sector", group: "Rules", example: "true", options: TRUE_FALSE, description: "Whether all players start in the same sector. When false, each new player gets a random empty sector on the outer rim." }),
		A({ flag: "--save-interval", label: "Save every (seconds)", group: "Saves", example: "300", description: "The time between automatic saves, in seconds. The default is 300 (5 minutes). The server.ini setting of the same purpose has a default of 600." }),
		A({ flag: "--threads", label: "Sector update threads", group: "Performance", example: "4", description: "How many threads update the sectors. Keep it at or below the number of processor cores." }),
		A({ flag: "--public", label: "Public", group: "Network", example: "true", options: TRUE_FALSE, description: "Whether the server lets other players join." }),
		A({ flag: "--listed", label: "List publicly", group: "Network", example: "true", options: TRUE_FALSE, description: "Whether the server shows up in the public server lists. It also needs Steam networking." }),
		A({ flag: "--use-steam-networking", label: "Use Steam networking", group: "Network", example: "true", options: TRUE_FALSE, description: "Whether players join and are checked through Steam. A direct-IP join on a port other than 27000 needs this." }),
		FLAG({ flag: "--exit-on-last-admin-logout", label: "Shut down when the last admin logs out", group: "Advanced", description: "Shuts the server down when the last administrator leaves. The panel does not restart it, and the world is not saved by the panel on the way." }),
		FLAG({ flag: "--stderr-to-log", label: "Error output to the log file", group: "Saves", description: "Sends the console's error output to the log file instead of the console window." }),
		FLAG({ flag: "--stdout-to-log", label: "Console output to the log file", group: "Saves", description: "Sends the console's normal output to the log file instead of the console window. The window then shows nothing, but /save and /stop can still be typed into it." }),
	],
};

const guide = {
	name: "Avorion",
	short: "Avorion",
	summary:
		"Avorion's server is `bin\\AvorionServer.exe` in the server's install folder. A galaxy is a folder under `galaxy`, holding its save, its settings file `server.ini` and the mod list `modconfig.lua`. The name, ports, player limit and admin are given on the command that starts the server (the **Launch options** on the Settings tab); the rest of the rules are in `server.ini`.",
	files: {
		"server.ini": "The galaxy's rules, limits, performance, saving, privacy and server information. The server makes it on its first run, so it appears after the first start.",
		"modconfig.lua": "The list of Steam Workshop mods the server downloads at its next start. The panel writes it when Workshop ids are given in the create form; edit it by hand otherwise.",
	},
	notes: [
		"**The panel cannot stop the server cleanly.** The server is stopped by typing `/save` and then `/stop` into its own console window; killing it is not recommended. The panel has no way to type into a console, so Stop asks the process to close and ends it after 15 seconds, and the galaxy keeps only what the server saved before. Before you press Stop (or update, or restart), open the server's window, which the panel keeps minimized on the taskbar rather than hidden, type `/save`, then `/stop`, and wait for the window to close.",
		"**Stop the server before editing `server.ini`, and back it up first.** The server overwrites the file at every start, and a single mistake in it makes the server rebuild the whole file with default settings and a new seed. The file does not exist until the server has run once.",
		"**The join password is in `server.ini`**, as Password under Administration (the Server info group). Set it after the first start, then restart the server. It is empty by default, so anyone can join until you do.",
		"**Nobody is an admin until you give a Steam ID.** The `--admin` launch option takes a player's 17-digit Steam64 id. The create form has a field for it.",
		"**Ports.** The game port (27000 by default) is used for both UDP and TCP, and the panel also uses the next four ports (Steam query, Steam master and query). Forward the game port for UDP and TCP on your router; the panel's firewall check opens UDP only, so allow the TCP port in Windows Firewall yourself. Joining by IP works only on port 27000; another port needs Steam networking. If you change the port in the panel's Ports section, also change `--port` in Launch options, because the panel does not rewrite it.",
		"**Mods** are Steam Workshop ids in `modconfig.lua` in the galaxy folder; the server downloads them the next time it starts, and players are offered the same ones when they join. Put `--` at the start of a line to turn it off, but disabling a mod can corrupt saves, so back up the galaxy first. Mods that are not on the Workshop have to be copied into the galaxy's `mods` folder and listed by hand.",
		"The panel's Launch options reader needs a word that starts with a single dash on the line, and every Avorion argument starts with two, so the start script's window title ends in `-Avorion`. Leave that part of the title alone.",
		"Use only plain English letters in paths and names: the server supports ASCII characters only, in paths and in its log. The server's own log is `serverlog.txt` in `%appdata%\\Avorion`, which the Logs tab cannot read.",
	],
};

export default {
	type: "avorion",
	title: "Avorion",
	files: {
		"server.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: { Game: "Game", System: "System", Networking: "Networking", Administration: "Administration" },
			settings,
			groupOrder,
			mayBeMissing: "The server makes this file the first time it runs, inside the galaxy folder (galaxy\\<name> in the server's folder). Start the server once, type /save and /stop in its window, then come back.",
		},
	},
	launch,
	guide,
};

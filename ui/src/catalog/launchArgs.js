// Games that are set up (wholly or partly) by arguments on the command that starts them. For each one this lists the arguments that
// can be used and what they do. It drives three things:
//   - the "Launch options" form on a server's Settings tab, for the arguments marked `edit` (read from the start script's launch
//     line and written back into it, leaving everything else in the script alone);
//   - the "All launch arguments" list beside it, which explains every argument, editable here or not;
//   - the launch arguments guide in docs/, which is generated from this file.
//
// An argument:
//   flag         as it is written on the line, e.g. "-port" or "+server.hostname"
//   key          the name the form uses for it (default: the flag without its - or +)
//   kind         "value" (takes a value), "bool" (stands alone), or "attached" (the value follows the flag directly, like -Xmx4g)
//   style        how the value is joined to the flag: "space" (-port 2456), "equals" (-Port=7777); default is the game's own
//   label        the name in the form
//   description  what it does
//   group        the heading it sits under in the form
//   options      the few values it accepts: becomes a dropdown (see ../catalog/rows.js)
//   edit         false for an argument that is explained but not offered in the form (the panel manages it, or it is rarely
//                needed). An argument the panel writes itself is marked `managed`.
//   managed      the panel puts this on the line when it creates the server: changing it can break things
//   example      a typical value, shown in the list

/** @typedef {{ flag: string, key?: string, kind?: "value"|"bool"|"attached", style?: "space"|"equals", label: string, description: string, group: string, options?: Array<string|[string,string]>, allowCustom?: boolean, edit?: boolean, managed?: boolean, example?: string }} LaunchArg */
/** @typedef {{ title: string, program: RegExp, style: "space"|"plus"|"equals", where: string, intro: string, args: LaunchArg[], editable: boolean }} LaunchDef */


import { A, FLAG } from "./launchHelpers.js";
import { GAME_UI_MODULES } from "./games/index.js";

/** @type {Record<string, LaunchDef>} */
export const LAUNCH_ARGS = {
	// ──────────────────────────────── Valheim ────────────────────────────────
	valheim: {
		title: "Valheim",
		program: /\bvalheim_server(?:\.exe)?\b/i,
		style: "space",
		editable: true,
		where: "the `valheim_server` line of the server's start script",
		intro: "Valheim has no settings file: a dedicated server is set up entirely by the arguments on the command that starts it. Changes apply the next time the server starts.",
		args: [
			FLAG({ flag: "-nographics", label: "No graphics", edit: false, managed: true, group: "Required", description: "Runs without a graphics window. A dedicated server needs this, together with -batchmode." }),
			FLAG({ flag: "-batchmode", label: "Batch mode", edit: false, managed: true, group: "Required", description: "Runs without a user interface so it can run in the background. A dedicated server needs this, together with -nographics." }),
			A({ flag: "-name", label: "Server name", group: "Server", example: '"My Valheim"', description: "The name shown in the server list. The password can't be part of it." }),
			A({ flag: "-port", label: "Game port", group: "Server", example: "2456", description: "The UDP port players connect to. The game also uses the next two ports, so keep 2456 to 2458 free. Change it from the server's Ports section so the panel can check for clashes." }),
			A({ flag: "-world", label: "World name", group: "Server", example: '"Dedicated"', description: "Which world file to load or create. A new name makes a new world; the old one is kept." }),
			A({ flag: "-password", label: "Password", group: "Server", example: '"secret"', description: "What players type to join. At least 5 characters, and it can't be part of the server name. Valheim refuses to list a public server without one." }),
			A({ flag: "-public", label: "Listed publicly", group: "Server", example: "1", options: [["1", "Listed in the server browser"], ["0", "Not listed (join by IP or code)"]], description: "Whether the server appears in Valheim's server browser. Without this argument the default is 1 (listed)." }),
			FLAG({ flag: "-crossplay", label: "Crossplay", group: "Server", description: "Lets Xbox and Microsoft Store players join through PlayFab. Changes which ports are used for joining." }),
			A({ flag: "-savedir", label: "Save folder", group: "Saves and logs", example: '"D:\\Valheim\\saves"', description: "Where worlds and the admin, ban and permitted lists are kept. Without it they go in the Windows user's profile, shared with every other Valheim server on this PC." }),
			A({ flag: "-logFile", label: "Log file", group: "Saves and logs", example: '"valheim_server.log"', description: "Where the server writes its log. The Logs tab reads this file, and the panel needs it to show who is connected, because Valheim's server query reports players without names." }),
			A({ flag: "-saveinterval", label: "Save every (seconds)", group: "Saves and logs", example: "1800", description: "How often the world is saved. The default is 1800 (30 minutes)." }),
			A({ flag: "-backups", label: "Automatic backups to keep", group: "Saves and logs", example: "4", description: "How many of the game's own automatic backups are kept. The default is 4." }),
			A({ flag: "-backupshort", label: "First backup after (seconds)", group: "Saves and logs", example: "7200", description: "The time before the game's first automatic backup. The default is 7200 (2 hours)." }),
			A({ flag: "-backuplong", label: "Then a backup every (seconds)", group: "Saves and logs", example: "43200", description: "The time between the game's later automatic backups. The default is 43200 (12 hours)." }),
			A({ flag: "-instanceid", label: "Instance ID", group: "Saves and logs", example: "server1", description: "Tells two servers that share a save folder apart." }),
			A({
				flag: "-preset",
				label: "Difficulty preset",
				group: "World modifiers",
				example: "hard",
				options: [["normal", "Normal"], ["casual", "Casual"], ["easy", "Easy"], ["hard", "Hard"], ["hardcore", "Hardcore"], ["immersive", "Immersive"], ["hammer", "Hammer: build anywhere, no combat"]],
				description: "Applies a whole set of world modifiers at once. Individual modifiers (-modifier, -setkey) are applied after it.",
			}),
			A({ flag: "-modifier combat", key: "combat", label: "Combat", group: "World modifiers", example: "-modifier combat hard", options: ["veryeasy", "easy", "hard", "veryhard"], description: "How tough fights are. Written -modifier combat <value>. Leave it out for the default." }),
			A({ flag: "-modifier deathpenalty", key: "deathpenalty", label: "Death penalty", group: "World modifiers", example: "-modifier deathpenalty casual", options: ["casual", "veryeasy", "easy", "hard", "hardcore"], description: "What a death costs. Written -modifier deathpenalty <value>. Leave it out for the default." }),
			A({ flag: "-modifier resources", key: "resources", label: "Resources", group: "World modifiers", example: "-modifier resources more", options: ["muchless", "less", "more", "muchmore", "most"], description: "How much you get from gathering. Written -modifier resources <value>. Leave it out for the default." }),
			A({ flag: "-modifier raids", key: "raids", label: "Raids", group: "World modifiers", example: "-modifier raids less", options: ["none", "muchless", "less", "more", "muchmore"], description: "How often raids happen. Written -modifier raids <value>. Leave it out for the default." }),
			A({ flag: "-modifier portals", key: "portals", label: "Portals", group: "World modifiers", example: "-modifier portals casual", options: ["casual", "hard", "veryhard"], description: "How restricted portals are: casual lets more through, hard and veryhard make them more restrictive. Written -modifier portals <value>. Leave it out for the default." }),
			FLAG({ flag: "-setkey nobuildcost", key: "setkey nobuildcost", label: "No build cost", group: "World modifiers", description: "Building is free. Written -setkey nobuildcost." }),
			FLAG({ flag: "-setkey playerevents", key: "setkey playerevents", label: "Player-based events", group: "World modifiers", description: "Raids depend on what players have done. Written -setkey playerevents." }),
			FLAG({ flag: "-setkey passivemobs", key: "setkey passivemobs", label: "Passive creatures", group: "World modifiers", description: "Creatures don't attack. Written -setkey passivemobs." }),
			FLAG({ flag: "-setkey nomap", key: "setkey nomap", label: "No map", group: "World modifiers", description: "The map doesn't show where you have been. Written -setkey nomap." }),
		],
	},

	// ──────────────────────────────── Rust ────────────────────────────────
	rust: {
		title: "Rust",
		program: /\bRustDedicated(?:\.exe)?\b/i,
		style: "plus",
		editable: true,
		where: "the `RustDedicated.exe` line of the server's start script",
		intro: "Rust is set up with console variables (\"convars\"). Written as +name value on the launch line, they win over the same setting in `server\\<identity>\\cfg\\server.cfg`. Changes apply the next time the server starts.",
		args: [
			FLAG({ flag: "-batchmode", label: "Batch mode", edit: false, managed: true, group: "Required", description: "Runs without a user interface so it can run in the background." }),
			FLAG({ flag: "-nographics", label: "No graphics", edit: false, managed: true, group: "Required", description: "Runs without a graphics window." }),
			A({ flag: "-logfile", style: "space", key: "logfile", label: "Log file", group: "Saves and logs", example: '"rustserver.log"', description: "Where the server writes its log. The Logs tab reads this file." }),
			A({ flag: "+server.hostname", label: "Server name", group: "Server", example: '"My Rust Server"', description: "The name shown in the in-game server browser." }),
			A({ flag: "+server.description", label: "Description", group: "Server", example: '"Welcome!"', description: "The text under the name in the server browser. Write \\n for a new line." }),
			A({ flag: "+server.url", label: "Website", group: "Server", example: '"https://example.com"', description: "A web address shown on the server's page in the browser." }),
			A({ flag: "+server.headerimage", label: "Banner image", group: "Server", example: '"https://example.com/banner.png"', description: "The web address of a picture (512 by 256 pixels works best) shown at the top of the server's page." }),
			A({ flag: "+server.maxplayers", label: "Max players", group: "Server", example: "50", description: "The most players that can be on at once." }),
			A({ flag: "+server.identity", label: "Identity (folder name)", group: "Server", managed: true, example: '"server"', description: "The name of the folder under server\\ that holds this server's world and settings. Changing it makes a fresh server in a new folder." }),
			A({ flag: "+server.pve", label: "PvE", group: "Server", example: "true", options: ["true", "false"], description: "Stops players from damaging each other." }),
			A({ flag: "+server.ip", label: "Bind address", group: "Network", managed: true, example: "0.0.0.0", description: "The network address the server listens on. 0.0.0.0 means every address on this PC." }),
			A({ flag: "+server.port", label: "Game port", group: "Network", managed: true, example: "28015", description: "The port players connect to (UDP). Change it from the server's Ports section so the panel can check for clashes." }),
			A({ flag: "+server.queryport", label: "Query port", group: "Network", managed: true, example: "28017", description: "The port the server list asks for details on (UDP)." }),
			A({ flag: "+rcon.ip", label: "Remote console address", group: "Network", managed: true, example: "127.0.0.1", description: "The address the remote console listens on. 127.0.0.1 keeps it to this PC, which is what GodlyPanel needs." }),
			A({ flag: "+rcon.port", label: "Remote console port", group: "Network", managed: true, example: "28018", description: "The port of the remote console (TCP). Only for the panel on this PC; never open it in your router." }),
			A({ flag: "+rcon.password", label: "Remote console password", group: "Network", managed: true, example: '"…"', description: "The remote console's password. Change it from the server's Automation tab so the panel stays in step." }),
			A({ flag: "+rcon.web", label: "Remote console type", group: "Network", managed: true, example: "0", options: [["0", "Classic (what GodlyPanel uses)"], ["1", "WebSocket"]], description: "0 is the classic remote console GodlyPanel talks to; 1 is the WebSocket one." }),
			A({ flag: "+app.port", label: "Rust+ app port", group: "Network", managed: true, example: "-1", description: "The port of the Rust+ phone app. -1 turns the app off." }),
			A({ flag: "+server.worldsize", label: "Map size", group: "World", example: "3000", description: "The size of the map in metres, from 1000 to 6000. Bigger maps take longer to make and use more memory." }),
			A({ flag: "+server.seed", label: "Map seed", group: "World", example: "1337", description: "A number that decides what the map looks like. The same seed and size always give the same map." }),
			A({ flag: "+server.level", label: "Map type", group: "World", example: '"Procedural Map"', description: "Procedural Map makes a new map from the seed and size; the others are the game's fixed maps." }),
			A({ flag: "+server.saveinterval", label: "Save every (seconds)", group: "World", example: "300", description: "How often the world is saved on its own." }),
		],
	},

	// ──────────────────────────────── Core Keeper ────────────────────────────────
	corekeeper: {
		title: "Core Keeper",
		program: /\bCoreKeeperServer(?:\.exe)?\b/i,
		style: "space",
		editable: true,
		where: "the `CoreKeeperServer.exe` line of the server's start script",
		intro: "Core Keeper's dedicated server is set up by arguments on the command that starts it. Changes apply the next time the server starts.",
		args: [
			FLAG({ flag: "-batchmode", label: "Batch mode", edit: false, managed: true, group: "Required", description: "Runs without a user interface so it can run in the background." }),
			A({ flag: "-logfile", label: "Log file", group: "Saves and logs", example: "CoreKeeperServerLog.txt", description: "Where the server writes its log. The Logs tab reads this file." }),
			A({ flag: "-datapath", label: "Data folder", group: "Saves and logs", managed: true, example: '"D:\\CoreKeeper\\data"', description: "Where worlds and settings are kept. Without it they go in the Windows user's profile, shared with every other Core Keeper server on this PC." }),
			A({ flag: "-port", label: "Game port", group: "Server", managed: true, example: "27015", description: "The UDP port players connect to directly. Without a port the server is only reachable through Steam's relay with a game ID. Change it from the server's Ports section." }),
			A({ flag: "-worldname", label: "World name", group: "Server", example: '"My World"', description: "The name players see for the world." }),
			A({ flag: "-world", label: "World slot", group: "Server", example: "0", description: "Which of the server's world slots to load (starting at 0)." }),
			A({ flag: "-password", label: "Password", group: "Server", example: '"secret"', description: "What players type to join. Leave it off for a server anyone can join." }),
			A({ flag: "-maxplayers", label: "Max players", group: "Server", example: "8", description: "The most players that can be on at once." }),
			A({ flag: "-worldseed", label: "World seed", group: "World", example: "0", description: "Any text or number that decides what a new world looks like; the same seed always makes the same world. Leave it off for a random one." }),
			A({ flag: "-worldmode", label: "World mode", group: "World", example: "0", options: [["0", "Normal"], ["1", "Hard"]], allowCustom: true, description: "How hard a new world is. It's chosen once, when the world is made." }),
			A({ flag: "-gameid", label: "Game ID", group: "Server", example: "ABCDEFGHJKLMNPQRSTUVWXYZ2345", description: "A code players can join with through Steam's relay. It must be 28 letters and numbers (a code of another length is ignored and a random one is made). Leave it off to have one made." }),
			A({ flag: "-season", label: "Season", group: "World", example: "0", description: "Forces a seasonal event to be on, by number. Leave it off for the current date's season." }),
			A({ flag: "-ip", label: "Bind address", group: "Network", example: "0.0.0.0", description: "The network address the server listens on. Leave it off to use every address." }),
		],
	},

	// ──────────────────────────────── Satisfactory ────────────────────────────────
	satisfactory: {
		title: "Satisfactory",
		program: /\bFactoryServer(?:\.exe)?\b/i,
		style: "equals",
		editable: true,
		where: "the `FactoryServer.exe` line of the server's start script",
		intro: "Satisfactory's server is set up from inside the game (the Server Manager screen, with the server's address and port) and by a few launch arguments. Changes apply the next time the server starts.",
		args: [
			A({ flag: "-Port", label: "Game port", group: "Network", managed: true, example: "7777", description: "The port players connect to, both UDP and TCP. Change it from the server's Ports section so the panel can check for clashes." }),
			A({ flag: "-ReliablePort", label: "Reliable messaging port", group: "Network", managed: true, example: "8888", description: "The TCP port the game uses for messages that must arrive. Change it from the server's Ports section." }),
			A({ flag: "-multihome", label: "Bind address", group: "Network", example: "192.168.1.20", description: "The network address the server listens on, for a PC with more than one. Leave it off to use them all." }),
			A({ flag: "-ServerQueryPort", label: "Query port", group: "Network", example: "15777", description: "The port the server's status is asked for on. Leave it off for the game's default." }),
			A({ flag: "-BeaconPort", label: "Beacon port", group: "Network", example: "15000", description: "The port the game uses to find the server on a network. Leave it off for the game's default." }),
			FLAG({ flag: "-log", label: "Write a log", group: "Saves and logs", managed: true, description: "Writes the server's log, which the Logs tab reads." }),
			FLAG({ flag: "-unattended", label: "Unattended", group: "Required", managed: true, description: "Runs without asking anything, so it can run in the background." }),
		],
	},

	// ──────────────────────────────── 7 Days to Die ────────────────────────────────
	"7days": {
		title: "7 Days to Die",
		program: /\b7DaysToDieServer(?:\.exe)?\b/i,
		style: "equals",
		editable: true,
		where: "the `7DaysToDieServer` line of the server's start script",
		intro: "Almost everything about a 7 Days to Die server is in `serverconfig.xml` (see the Settings tab). The launch line only says where that file is, where the saves go and how the program runs. Changes apply the next time the server starts.",
		args: [
			A({ flag: "-configfile", label: "Settings file", group: "Files", managed: true, example: "serverconfig.xml", description: "The settings file to read. The panel's Settings tab edits this file." }),
			A({ flag: "-UserDataFolder", label: "Save folder", group: "Files", managed: true, example: "%~dp0userdata", description: "Where saves and generated worlds are kept. Without it they go in the Windows user's profile, shared with every other 7 Days to Die server on this PC." }),
			A({ flag: "-logfile", style: "space", label: "Log file", group: "Files", managed: true, example: '"output_log.txt"', description: "Where the server writes its log. The Logs tab reads this file." }),
			FLAG({ flag: "-dedicated", label: "Dedicated server", edit: false, managed: true, group: "Required", description: "Starts the game as a server rather than a client. Keep it on the line." }),
			FLAG({ flag: "-batchmode", label: "Batch mode", edit: false, managed: true, group: "Required", description: "Runs without a user interface so it can run in the background." }),
			FLAG({ flag: "-nographics", label: "No graphics", edit: false, managed: true, group: "Required", description: "Runs without a graphics window." }),
			FLAG({ flag: "-quit", label: "Quit when done", edit: false, managed: true, group: "Required", description: "Makes the launcher close once the server is running." }),
		],
	},

	// ──────────────────────────────── V Rising ────────────────────────────────
	vrising: {
		title: "V Rising",
		program: /\bVRisingServer(?:\.exe)?\b/i,
		style: "space",
		editable: true,
		where: "the `VRisingServer.exe` line of the server's start script",
		intro: "V Rising's settings are in `ServerHostSettings.json` (the Settings tab); a few arguments on the launch line say where its data goes and override the name and save. Changes apply the next time the server starts.",
		args: [
			A({ flag: "-persistentDataPath", label: "Data folder", group: "Files", managed: true, example: '".\\save-data"', description: "Where saves and the settings files are kept. The panel keeps it inside the server's own folder." }),
			A({ flag: "-serverName", label: "Server name", group: "Server", managed: true, example: '"My V Rising"', description: "The name shown in the server list. It overrides the name in the settings file." }),
			A({ flag: "-saveName", label: "Save name", group: "Server", managed: true, example: '"world1"', description: "The save folder to use. A new name starts a new world; the old one is kept." }),
			A({ flag: "-logFile", label: "Log file", group: "Files", managed: true, example: '".\\logs\\VRisingServer.log"', description: "Where the server writes its log. The Logs tab reads this file." }),
		],
	},

	// ──────────────────────────────── Sons of the Forest ────────────────────────────────
	sotf: {
		title: "Sons of the Forest",
		program: /\bSonsOfTheForestDS(?:\.exe)?\b/i,
		style: "space",
		editable: true,
		where: "the `SonsOfTheForestDS.exe` line of the server's start script",
		intro: "Sons of the Forest is set up in `userdata\\dedicatedserver.cfg` (the Settings tab). The launch line only says where that data lives and how the program runs. Changes apply the next time the server starts.",
		args: [
			A({ flag: "-userdatapath", label: "Data folder", group: "Files", managed: true, example: '"%~dp0userdata"', description: "Where settings, saves and logs are kept. The panel keeps it inside the server's own folder so two servers don't share them." }),
			FLAG({ flag: "-batchmode", label: "Batch mode", edit: false, managed: true, group: "Required", description: "Runs without a user interface so it can run in the background." }),
			FLAG({ flag: "-nographics", label: "No graphics", edit: false, managed: true, group: "Required", description: "Runs without a graphics window." }),
		],
	},

	// ──────────────────────────────── Project Zomboid ────────────────────────────────
	zomboid: {
		title: "Project Zomboid",
		program: /\bjava(?:\.exe)?"?/i,
		style: "space",
		editable: true,
		where: "the `java.exe` line of the server's start script",
		intro: "Project Zomboid runs on Java, so the memory it may use is set here, along with where its data goes and the admin password. The server's own options are in `<name>.ini` (the Settings tab). Changes apply the next time the server starts.",
		args: [
			A({ flag: "-Xms", kind: "attached", label: "Starting memory", group: "Memory", managed: true, example: "4g", description: "How much memory Java takes when the server starts. Use a number and g for gigabytes (4g). Setting it equal to the maximum avoids pauses while Java grows." }),
			A({ flag: "-Xmx", kind: "attached", label: "Maximum memory", group: "Memory", managed: true, example: "4g", description: "The most memory Java may use. More players and mods need more; 4g to 8g suits most servers. Never more than the PC has free." }),
			A({ flag: "-servername", label: "Settings name", group: "Server", managed: true, example: "servertest", description: "Which settings file to use: servertest means Server\\servertest.ini. It also names the world's save folder." }),
			A({ flag: "-adminpassword", label: "Admin password", group: "Server", managed: true, example: '"…"', description: "The password of the built-in admin account. Used the first time the server runs to make that account." }),
			A({ flag: "-cachedir", style: "equals", label: "Data folder", group: "Files", managed: true, example: '"%~dp0zomboid"', description: "Where settings, saves and logs are kept. Without it they go in the Windows user's profile, shared with every other Zomboid server on this PC." }),
			A({ flag: "-port", label: "Game port override", group: "Network", example: "16261", description: "Overrides DefaultPort from the settings file. Leave it off and change the port from the server's Ports section." }),
			A({ flag: "-udpport", label: "Direct connection port override", group: "Network", example: "16262", description: "Overrides UDPPort from the settings file." }),
			A({ flag: "-ip", label: "Bind address", group: "Network", example: "0.0.0.0", description: "The network address the server listens on. Leave it off to use every address." }),
			A({ flag: "-steamvac", label: "Valve Anti-Cheat", group: "Network", example: "true", options: ["true", "false"], description: "Overrides the SteamVAC setting from the settings file." }),
			A({ flag: "-statistic", label: "Statistics interval", group: "Server", managed: true, example: "0", description: "How often, in seconds, the server prints statistics to its log. 0 turns them off." }),
			FLAG({ flag: "-nosteam", label: "Without Steam", group: "Server", description: "Runs the server without Steam features. Players can't join through the Steam server list." }),
			FLAG({ flag: "-debug", label: "Debug mode", group: "Server", description: "Prints extra detail to the log. Only for tracking down a problem." }),
		],
	},

	// ───────────── Reference only: set up mostly elsewhere, but these arguments exist ─────────────
	ark: {
		title: "ARK: Survival Ascended / Evolved",
		program: /\b(?:ArkAscendedServer|ShooterGameServer)(?:\.exe)?\b/i,
		style: "equals",
		editable: false,
		where: "the `ArkAscendedServer.exe` (or `ShooterGameServer.exe`) line of the server's start script",
		intro: "ARK is set up mostly in `GameUserSettings.ini` and `Game.ini` (the Settings tab). The launch line starts with the map name followed by ?Option=value settings, then dash arguments. Both can be changed in the start script (Edit Batch Files); the panel doesn't offer a form for them.",
		args: [
			{ flag: "<Map>?listen", label: "Map and options", kind: "value", edit: false, group: "Map and ?options", example: "TheIsland_WP?listen?SessionName=My ARK?Port=7777", description: "The first argument: the map to load, then ?Name=value options joined by question marks. Common options are SessionName, Port, QueryPort, RCONEnabled, RCONPort, ServerAdminPassword, ServerPassword, MaxPlayers and AltSaveDirectoryName (a separate save folder per map)." },
			{ flag: "-WinLiveMaxPlayers", label: "Max players", kind: "value", edit: false, group: "Dash arguments", example: "70", description: "The most players that can be on at once (ARK: Survival Ascended)." },
			{ flag: "-mods", label: "Mods", kind: "value", edit: false, group: "Dash arguments", example: "123456,789012", description: "The mod IDs to load, separated by commas. Add them from the Mods tab; mods have no explanations here." },
			{ flag: "-clusterid", label: "Cluster ID", kind: "value", edit: false, group: "Dash arguments", example: "mycluster", description: "Puts servers in a cluster so characters and dinos can travel between them. Every server in the cluster uses the same ID." },
			{ flag: "-ClusterDirOverride", label: "Cluster folder", kind: "value", edit: false, group: "Dash arguments", example: '"D:\\ARK\\cluster"', description: "The shared folder that holds what travels between servers in a cluster. Every server in the cluster points at the same folder." },
			{ flag: "-NoTransferFromFiltering", label: "No transfer filtering", kind: "bool", edit: false, group: "Dash arguments", description: "Lets characters and dinos come from any server, not only those in the same cluster." },
			{ flag: "-servergamelog", label: "Game log", kind: "bool", edit: false, group: "Dash arguments", description: "Writes the in-game log (chat and tribe events) to a file." },
			{ flag: "-NoBattlEye", label: "No BattlEye", kind: "bool", edit: false, group: "Dash arguments", description: "Turns BattlEye anti-cheat off. Players must then also start their game without it." },
			{ flag: "-log", label: "Log window", kind: "bool", edit: false, group: "Dash arguments", description: "Shows the server's log in its console window." },
		],
	},
	conan: {
		title: "Conan Exiles",
		program: /\bConanSandboxServer(?:-Win64-Shipping)?(?:\.exe)?\b/i,
		style: "equals",
		editable: false,
		where: "the `ConanSandboxServer.exe` line of the server's start script",
		intro: "Conan Exiles is set up in `ServerSettings.ini` (the Settings tab). The launch line only gives the ports and how the program runs. Both can be changed in the start script (Edit Batch Files).",
		args: [
			{ flag: "-Port", label: "Game port", kind: "value", edit: false, group: "Network", example: "7777", description: "The UDP port players connect to. Change it from the server's Ports section so the panel can check for clashes." },
			{ flag: "-QueryPort", label: "Query port", kind: "value", edit: false, group: "Network", example: "27015", description: "The UDP port the server list asks for details on." },
			{ flag: "-RconPort", label: "Remote console port", kind: "value", edit: false, group: "Network", example: "25575", description: "The TCP port of the remote console. Only for the panel on this PC; never open it in your router." },
			{ flag: "-MaxPlayers", label: "Max players", kind: "value", edit: false, group: "Server", example: "40", description: "The most players that can be on at once." },
			{ flag: "-nosteam", label: "Without Steam", kind: "bool", edit: false, group: "Server", description: "Runs without Steam, so the server isn't in the Steam list." },
			{ flag: "-log", label: "Log window", kind: "bool", edit: false, group: "Server", description: "Shows the server's log in its console window." },
		],
	},
	palworld: {
		title: "Palworld",
		program: /\bPalServer(?:-Win64-Shipping-Cmd)?(?:\.exe)?\b/i,
		style: "equals",
		editable: false,
		where: "the `PalServer.exe` line of the server's start script",
		intro: "Palworld is set up in `PalWorldSettings.ini` (the Settings tab). A few launch arguments change how the program runs; they're in the start script (Edit Batch Files).",
		args: [
			{ flag: "-publiclobby", label: "Community server", kind: "bool", edit: false, group: "Server", description: "Lists the server in the in-game community server list." },
			{ flag: "-port", label: "Game port", kind: "value", edit: false, group: "Network", example: "8211", description: "The UDP port players connect to." },
			{ flag: "-players", label: "Max players", kind: "value", edit: false, group: "Server", example: "32", description: "The most players that can be on at once. Overrides the setting in the settings file." },
			{ flag: "-publicip", label: "Public IP", kind: "value", edit: false, group: "Network", example: "203.0.113.9", description: "The public address of this PC, shown in the community list." },
			{ flag: "-publicport", label: "Public port", kind: "value", edit: false, group: "Network", example: "8211", description: "The public port, if your router maps a different one." },
			{ flag: "-useperfthreads", label: "Performance threads", kind: "bool", edit: false, group: "Performance", description: "Uses extra threads for better performance on a PC with many cores." },
			{ flag: "-NoAsyncLoadingThread", label: "No async loading thread", kind: "bool", edit: false, group: "Performance", description: "Loads assets on the main thread. Used together with -useperfthreads and -UseMultithreadForDS." },
			{ flag: "-UseMultithreadForDS", label: "Multithreaded server", kind: "bool", edit: false, group: "Performance", description: "Lets the server use several threads. Used together with -useperfthreads and -NoAsyncLoadingThread." },
			{ flag: "-NumberOfWorkerThreadsServer", label: "Worker threads", kind: "value", edit: false, group: "Performance", example: "8", description: "How many worker threads the server may use." },
			{ flag: "-logformat", label: "Log format", kind: "value", edit: false, group: "Saves and logs", example: "text", description: "text for plain lines or json for JSON, in the server's log." },
		],
	},
	minecraft: {
		title: "Minecraft (Java)",
		program: /\bjava(?:w)?(?:\.exe)?"?/i,
		style: "space",
		editable: false,
		where: "the `java` line of the server's start script",
		intro: "Minecraft is set up in `server.properties` (the Settings tab). The launch line is Java's own options, mostly how much memory it may use.",
		args: [
			{ flag: "-Xms", label: "Starting memory", kind: "attached", edit: false, group: "Memory", example: "4G", description: "How much memory Java takes when the server starts. Setting it equal to the maximum avoids pauses while Java grows." },
			{ flag: "-Xmx", label: "Maximum memory", kind: "attached", edit: false, group: "Memory", example: "8G", description: "The most memory Java may use. Modded servers need more; never more than the PC has free. The panel's Max Memory field sets this when the server is created." },
			{ flag: "-XX:+UseG1GC", label: "G1 garbage collector", kind: "bool", edit: false, group: "Memory", description: "The memory cleaner most Minecraft servers use. It keeps pauses short." },
			{ flag: "-jar", label: "Server jar", kind: "value", edit: false, group: "Files", example: "server.jar", description: "The server program to run." },
			{ flag: "nogui", label: "No window", kind: "bool", edit: false, group: "Files", description: "Starts the server without its small control window, since the panel shows the console." },
		],
	},
};

// Games added one module each (see games/index.js).
for (const m of GAME_UI_MODULES) if (m.launch) LAUNCH_ARGS[m.type] = m.launch;

const ALIASES = { palword: "palworld" };

/** The launch arguments of a game, by the `type` a server is recorded with; null for a game without any. */
export function launchDefFor(gameType) {
	const key = String(gameType ?? "").toLowerCase();
	return LAUNCH_ARGS[ALIASES[key] ?? key] ?? null;
}

/** The games with a form on the Settings tab: their arguments can be edited there. */
export const LAUNCH_EDITABLE_GAMES = Object.entries(LAUNCH_ARGS).filter(([, d]) => d.editable).map(([id]) => id);

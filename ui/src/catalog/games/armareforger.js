import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Arma Reforger (Bohemia Interactive). Everything is set in ONE JSON file, which the server reads from the path of its -config
// argument; the panel writes Configs\server-config.json before the first start. Keys are nested: game.name, game.gameProperties.battlEye,
// operating.joinQueue.maxSize ... and are written here as dotted paths, like the other JSON games.
//
// Sources: the research dossier (research/armareforger/01..04 and raw/), mainly Bohemia Interactive's wiki (Server Config, Server Hosting,
// Startup Parameters); XGamingServer's reference pages only for the wording of the two settings the wiki leaves without text
// (game.name, game.gameProperties.serverMaxViewDistance).
//
// Not explained here, on purpose (they show on the Settings tab as raw text if they are in the file): the lists game.mods, game.admins,
// game.supportedPlatforms, rcon.blacklist and rcon.whitelist; operating.disableNavmeshStreaming (a yes/no before game version 1.2.0 and a
// list after); game.gameProperties.missionHeader.* and persistence.databases / persistence.storages (the wiki's lists for them were not
// read); game.modsRequiredByDefault (the sources disagree about where it sits); dedicatedServerId and region (one community page only).
// How to add a mod or an admin is in the guide's notes.

const settings = withChoices(
	rows([
		// ── Server ──
		["game.name", "Server name", "The name shown in the in-game server browser. Up to 100 characters.", "Server"],
		["game.password", "Join password", "The password players must type to join. Leave it empty for a server anyone can join.", "Server"],
		[
			"game.passwordAdmin",
			"Admin password",
			"Lets a player take admin control of the server: in the lobby press C, or in the game press Return, then type #login followed by this password. It cannot contain spaces.",
			"Server",
		],
		[
			"game.scenarioId",
			"Scenario",
			"The scenario (mission) the server runs, written as the path of its .conf file. Only one can be set: Arma Reforger does not rotate missions. To see the paths, add the -listScenarios launch option and read the server's log.",
			"Server",
		],
		["game.maxPlayers", "Max players", "The most players that can be on the server at once, from 1 to 128. The default is 64.", "Server"],
		["game.visible", "Listed in the server browser", "Whether the server shows up in the in-game server browser. Turn it off for a private server that friends join by IP address. The default is on.", "Server"],

		// ── Players ──
		[
			"game.crossPlatform",
			"Allow Xbox and PlayStation players",
			"Yes lets players on PC, Xbox and PlayStation join; no accepts PC players only (the default). Console players cannot install mods, so a server with mods may turn them away.",
			"Players",
		],
		[
			"operating.joinQueue.maxSize",
			"Join queue size",
			"How many players can wait in line to join when the server is full, from 0 to 50. 0 turns the queue off, which is the default.",
			"Players",
		],
		[
			"operating.slotReservationTimeout",
			"Reserved slot after a kick (seconds)",
			"How long the server and the game's backend keep a slot free for a player who was kicked by the network system, so they can come back. From 5 to 300 seconds, default 60.",
			"Players",
		],

		// ── Rules ──
		["game.gameProperties.battlEye", "BattlEye anti-cheat", "Turns the BattlEye anti-cheat on or off for the server. It is on by default.", "Rules"],
		[
			"game.gameProperties.fastValidation",
			"Fast validation",
			"How the server checks that a joining player's copy of the map matches the server's. On exchanges the least data. The wiki says to keep it on for any server that people join over the internet; turn it off only when testing on one PC, to find exactly what differs after a mismatch.",
			"Rules",
		],
		["game.gameProperties.disableThirdPerson", "First person view only", "Forces every player to use the first-person view, with no third-person camera.", "Rules"],
		["game.gameProperties.VONDisableUI", "Hide the voice chat display", "Players do not see the voice chat (VON, voice over network) display on their screen.", "Rules"],
		["game.gameProperties.VONDisableDirectSpeechUI", "Hide the direct speech display", "Players do not see the voice chat display for direct speech, the talking to people next to you.", "Rules"],
		[
			"game.gameProperties.VONCanTransmitCrossFaction",
			"Talk on other factions' radios",
			"On lets players speak on the radios of other factions. Off, the default, lets them only listen to those.",
			"Rules",
		],

		// ── View distance ──
		["game.gameProperties.serverMaxViewDistance", "Farthest view distance", "The farthest distance players can see, set by the server. From 500 to 10000, default 1600.", "View distance"],
		["game.gameProperties.serverMinGrassDistance", "Smallest grass distance (meters)", "The minimum distance, in meters, at which players see grass. 0, the default, forces nothing on players. Otherwise use a value from 50 to 150.", "View distance"],
		[
			"game.gameProperties.networkViewDistance",
			"Network view distance",
			"The farthest range at which the server sends things (vehicles, people and so on) to a player. From 500 to 5000, default 1500. A larger range asks more of the server and the network.",
			"View distance",
		],

		// ── Saving ──
		[
			"game.gameProperties.persistence.autoSaveInterval",
			"Autosave every (minutes)",
			"How often the server saves the current mission on its own, when the mission supports it. From 0 to 60 minutes, default 10. 0 turns autosave off. If the server is ever stopped by force, up to this much play can be lost.",
			"Saving",
		],
		["game.gameProperties.persistence.saveRetention", "Saves to keep", "How many save points are kept for the current mission, from 1 to 128. The default is 10.", "Saving"],
		["game.gameProperties.persistence.loadSessionSave", "Continue from the latest save", "Loads the latest available save point automatically on the first start. The default is on.", "Saving"],
		["game.gameProperties.persistence.keepSessionSave", "Keep saves after the mission ends", "Keeps the save points of a playthrough after its mission is finished. The default is off.", "Saving"],
		[
			"game.gameProperties.persistence.hiveId",
			"Server number (hive id)",
			"A number from 0 to 16383 that tells servers apart when several share the same save database, so their saves do not mix. The default is 0, which is right for a single server.",
			"Saving",
		],
		["operating.playerSaveTime", "Save players every (seconds)", "How often players are saved, for both online and local storage. The default is 120 seconds. A player save can also be requested at any time.", "Saving"],

		// ── AI ──
		["operating.disableAI", "Turn off all AI", "The server does not run any AI at all, so no computer-controlled characters exist. It is off by default.", "AI"],
		[
			"operating.aiLimit",
			"Most AI characters",
			"The most AI characters that can exist at once. A negative number, the default of -1, means no limit. The -aiLimit launch option, if it is used, overrides this.",
			"AI",
		],

		// ── Network ──
		[
			"publicPort",
			"Game port (UDP)",
			"The UDP port registered for the server and the one players connect to. The default is 2001. If the server sits behind a router, this is the port forwarded to it. The Ports section does not change this file, so change the port in both places.",
			"Network",
		],
		["bindAddress", "Bind address", "The IP address of this PC the server listens on. The wiki says to leave it out of the file for almost everyone; left out or empty it listens on every address (0.0.0.0).", "Network"],
		["bindPort", "Bind port (UDP)", "The UDP port the server listens on. The wiki says to leave it out so it follows the game port above; only needed for special port forwarding.", "Network"],
		[
			"publicAddress",
			"Public address",
			"The IP address registered with the game's backend, which players use to reach the server. Left out or empty, the backend finds it itself, which is what the wiki recommends. The word local makes the server use the address of this PC's network card.",
			"Network",
		],
		["a2s.address", "Steam query address", "The IP address the Steam server-query service listens on. It can limit queries to one network card. 0.0.0.0 means every address.", "Network"],
		["a2s.port", "Steam query port (UDP)", "The UDP port the Steam server query (A2S) listens on. The game's own default is 17777; the panel gives a new server 17877 so it does not clash with another game. The Ports section does not change this file.", "Network"],

		// ── Remote console ──
		["rcon.address", "Remote console address", "The IP address the game's remote console listens on. Required when the remote console is used. The panel does not use this console.", "Remote console"],
		["rcon.port", "Remote console port (UDP)", "The UDP port the game's remote console listens on. The default is 19999.", "Remote console"],
		["rcon.password", "Remote console password", "The password for the remote console. The console does not start without it. It must have at least 3 characters and no spaces.", "Remote console"],
		["rcon.maxClients", "Remote console clients", "The most remote console clients connected at once, from 1 to 16. The default is 16. A client that quits stays counted for another 30 seconds.", "Remote console"],
		["rcon.permission", "Remote console rights", "What everyone who connects to the remote console may do.", "Remote console"],

		// ── Advanced ──
		[
			"operating.lobbyPlayerSynchronise",
			"Report the real player list",
			"Sends the list of players on the server to the game's backend with each heartbeat, so the player count in the server browser matches the real number. It is on by default.",
			"Advanced",
		],
		["operating.disableCrashReporter", "No crash reports", "Turns off the report the server sends automatically when it crashes. It has the same effect as the -disableCrashReporter launch option. Off by default.", "Advanced"],
		[
			"operating.disableServerShutdown",
			"Stay up when the backend is lost",
			"On, the server does not shut itself down when its connection to the game's backend is lost. Other causes, such as a broken settings file, still shut it down. Off by default.",
			"Advanced",
		],
	]),
	{
		"rcon.permission": [
			["admin", "Admin: can run any command"],
			["monitor", "Monitor: only commands that do not change the server"],
		],
	},
);

const groupOrder = ["Server", "Players", "Rules", "View distance", "Saving", "AI", "Network", "Remote console", "Advanced"];

const launch = {
	title: "Arma Reforger",
	program: /\bArmaReforgerServer(?:\.exe)?\b/i,
	style: "space",
	editable: true,
	where: "the `ArmaReforgerServer.exe` line of the server's start script",
	intro:
		"Arma Reforger's server is set up in its JSON file (the Settings tab); the launch line points it at that file and tunes how it runs. Arguments are written with a dash and a space before the value, like `-maxFPS 60`. Changes apply the next time the server starts.",
	args: [
		A({
			flag: "-config",
			label: "Settings file",
			edit: false,
			managed: true,
			group: "Required",
			example: '".\\Configs\\server-config.json"',
			description: "The JSON file the server reads all its settings from (the Settings tab edits it). With -server instead, the server would ignore this file, so that argument is not offered.",
		}),
		A({
			flag: "-maxFPS",
			label: "Frame rate limit",
			group: "Required",
			managed: true,
			example: "60",
			options: [["60", "60 (the usual)"], ["90", "90"], ["120", "120 (the most the wiki suggests)"]],
			allowCustom: true,
			description:
				"Limits how many times a second the server updates. The wiki says to always set it, to a value from 60 to 120: without it the server can try to use all the resources of the PC. Do not clear this.",
		}),
		A({
			flag: "-profile",
			label: "Profile folder",
			group: "Saves and logs",
			managed: true,
			example: '"C:\\Servers\\reforger\\profile"',
			description:
				"The folder where the server keeps its logs and, by default, the add-ons (mods) it downloads. Without it the game uses one folder in Documents shared by every Reforger server on this PC. The panel sets a folder inside this server's own folder, which its backups and Logs tab look in.",
		}),
		A({
			flag: "-logsDir",
			label: "Logs folder",
			group: "Saves and logs",
			example: "logs",
			description: "The folder, by name inside the profile folder or by full path, where the server keeps its logs, crash dumps and temporary files. The Logs tab looks in the profile folder, so change this only if you know why.",
		}),
		A({
			flag: "-keepNumOfLogs",
			label: "Logs to keep",
			group: "Saves and logs",
			example: "10",
			description: "The most log files the server keeps. The default is 10.",
		}),
		FLAG({ flag: "-logAppend", label: "Keep the log between starts", group: "Saves and logs", description: "The log is not emptied when the server starts, so the history of earlier runs stays in it." }),
		A({
			flag: "-logLevel",
			label: "Log detail",
			group: "Saves and logs",
			example: "warning",
			options: [
				["normal", "Normal: everything"],
				["warning", "Warnings and worse"],
				["error", "Errors and worse"],
				["fatal", "Only fatal problems"],
			],
			description: "How much the log says. Each level also includes the more serious ones below it: normal logs everything, fatal only the worst problems.",
		}),
		A({
			flag: "-logTime",
			label: "Time in log lines",
			group: "Saves and logs",
			example: "datetime",
			options: [
				["none", "No time"],
				["time", "Time of day (the default)"],
				["datetime", "Date and time"],
			],
			description: "What each log line starts with: nothing, the time of day, or the date and the time.",
		}),
		A({
			flag: "-logStats",
			label: "Log performance every (milliseconds)",
			group: "Saves and logs",
			example: "5000",
			description: "Writes performance numbers, such as the server's frame rate, to the log at this interval in milliseconds. Leave it empty to log none.",
		}),
		FLAG({ flag: "-logVoting", label: "Log votes", group: "Saves and logs", description: "Adds lines to the log about the voting system: who started a vote, who voted and against whom." }),
		FLAG({ flag: "-listScenarios", label: "List scenarios in the log", group: "Server", description: "Prints the .conf paths of the available scenarios in the log when the server starts, so you can copy one into the Scenario setting. Workshop scenarios are listed only if no scenario is being loaded." }),
		FLAG({ flag: "-backendFreshSession", label: "Start a new session", group: "Server", description: "Skips loading the server's earlier session, so it starts like a brand new one. Saves and loads that happen later work as usual." }),
		A({
			flag: "-playerLimits",
			label: "Players per faction",
			group: "Server",
			description: "Sets the most players each faction may have. Written as FactionKey:Number, with several entries separated by commas. This needs a recent game version (1.7.0).",
		}),
		A({
			flag: "-nds",
			label: "Network dynamic simulation",
			group: "Network tuning",
			example: "2",
			description:
				"The server sends each player only the things that matter to them. This number is how many cells wide that area is; the default is 2. A larger number gives a longer network view range but slower server performance. 0 turns the feature off.",
		}),
		A({
			flag: "-nwkResolution",
			label: "Network cell size (meters)",
			group: "Network tuning",
			example: "500",
			description: "The size of the cells used to decide what to send to a player, from 100 to 1000 meters. Smaller cells mean less pop-in but a shorter network view range. For a long view range use big cells with a small -nds.",
		}),
		A({
			flag: "-staggeringBudget",
			label: "Cells processed per tick",
			group: "Network tuning",
			example: "100",
			description: "How many stationary (not moving) cells may be processed in one server update, from 1 to 10201. Left out, it follows the -nds diameter.",
		}),
		A({
			flag: "-streamingBudget",
			label: "Streaming budget",
			group: "Network tuning",
			example: "1000",
			description: "The streaming budget shared equally by all connections. It cannot go below 100, so the system does not stall.",
		}),
		A({
			flag: "-streamsDelta",
			label: "Streams per player limit",
			group: "Network tuning",
			example: "100",
			description:
				"Limits how many streams are opened for a player. If the server has this many more streams open than the player has, it opens no more in that update. From 1 to 1000, default 100.",
		}),
		A({
			flag: "-rpl-timeout-ms",
			label: "Connection timeout (milliseconds)",
			group: "Network tuning",
			example: "10000",
			description: "The timeout of the connection between the server and a player's game, in milliseconds.",
		}),
		A({
			flag: "-addonTempDir",
			label: "Temporary folder for add-ons",
			group: "Mods",
			example: '"C:\\Temp\\reforger"',
			description: "Where add-ons (mods) are unpacked while they download. The wiki suggests setting it when downloading large mods fails with a curl error 23, so the server has a folder it may write to.",
		}),
		A({
			flag: "-addonDownloadDir",
			label: "Download folder for add-ons",
			group: "Mods",
			example: '"D:\\ReforgerMods"',
			description: "Where the server downloads add-ons (mods) from the Workshop to. They are stored in an addons folder inside it.",
		}),
		FLAG({ flag: "-addonsVerify", label: "Check the mods at start", group: "Mods", description: "Checks every installed add-on. If one is damaged, the server shuts down and writes the damaged files to the log." }),
		FLAG({ flag: "-addonsRepair", label: "Repair the mods at start", group: "Mods", description: "Checks every installed add-on and repairs a damaged one by itself. If the repair fails, the server shuts down." }),
		A({
			flag: "-freezeCheck",
			label: "Freeze detection (seconds)",
			group: "Troubleshooting",
			example: "300",
			description: "How many seconds the server may freeze before it is forced to crash, from 0 to 600. The default is 300. The wiki says this setting can also switch the detection off completely.",
		}),
		A({
			flag: "-freezeCheckMode",
			label: "When the server freezes",
			group: "Troubleshooting",
			example: "crash",
			options: [
				["crash", "Crash the server on purpose"],
				["minidump", "Save a crash dump and keep running (Windows only)"],
				["kill", "Kill the server without any report"],
			],
			description: "What happens when freezing is detected. Kill is more reliable than crash but gives no information about the freeze.",
		}),
		FLAG({ flag: "-noThrow", label: "No error pop-ups", group: "Troubleshooting", description: "Turns off all error message windows: script errors, failed checks and crashes." }),
	],
};

export default {
	type: "armareforger",
	title: "Arma Reforger",
	files: {
		"server-config.json": {
			parser: "json",
			excludePaths: [],
			structuredPaths: [],
			sectionLabels: {
				game: "More server settings (mods and admins)",
				operating: "Advanced",
				a2s: "Network",
				rcon: "Remote console",
			},
			settings,
			groupOrder,
			mayBeMissing:
				"The panel writes this file (Configs\\server-config.json) before the first start. Change settings while the server is stopped, then start it again: the game reads the file only when it starts.",
		},
	},
	launch,
	guide: {
		name: "Arma Reforger",
		short: "Reforger",
		summary:
			"Arma Reforger keeps everything in one JSON file, `Configs\\server-config.json` in the server's folder: the name, passwords, scenario, player limit, rules, saving and the mod list. The server finds it from the `-config` argument on the launch line, which also sets the frame rate limit and the profile folder.",
		files: { "server-config.json": "The server's name, passwords, scenario, player limit, rules, autosave, network ports and mod list." },
		notes: [
			"Players join through the in-game server browser, or by IP address and the game port (UDP 2001 by default). Forward the game port and the Steam query port on the router.",
			"Mods are not a launch argument. They are the `game.mods` list in the JSON file, one entry per mod with its Workshop id, for example `[{\"modID\": \"5D6EBC81EB1842EF\", \"name\": \"Enfusion Persistence Framework\"}]`. The id is the 16-letter code in the mod's Workshop web address, not a Steam number. The Bohemia wiki spells the key `modID`; another site writes `modId`, and the key is case-sensitive, so use the wiki's. A mod's own dependencies must be listed as their own entries. The server downloads the mods itself the next time it starts, and players get them when they join. `#restart` in the game does not reload the list.",
			"Admins are the `game.admins` list: player identity ids or Steam ids, up to 20. A listed admin can type `#login` without a password. Everyone else uses `#login` and the admin password.",
			"The scenario is one `.conf` path. To see the paths, add the -listScenarios launch option, start the server once and read its log.",
			"The server has no known clean way to be stopped from the panel: Stop closes its window and, after 15 seconds, ends it. It autosaves every 10 minutes by default (Saving group), so a forced stop can lose that much play.",
			"The game also has a remote console (UDP port 19999, set up in the `rcon` part of the file, needs a password of 3 or more letters). The panel does not use it and the file the panel writes has none.",
			"The BattlEye file `BattlEye\\BEServer_x64.cfg` in the server's folder must only ever have lines added to it, never edited, or BattlEye stops working. The panel does not touch it.",
			"Change `publicPort` and `a2s.port` here if you move the ports: the Ports section changes the panel's own record but not this file.",
		],
	},
};

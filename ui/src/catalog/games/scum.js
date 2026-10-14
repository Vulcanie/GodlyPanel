import { withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";
import { scumServerSettings, scumGroupOrder } from "./scumServerSettings.js";

// SCUM (Gamepires). Settings are in SCUM\Saved\Config\WindowsServer\ServerSettings.ini (409 settings, see scumServerSettings.js); the
// launch line has only four arguments. The server's name, password and player limit are in the ini file, not on the command line.
// The other files the server uses (AdminUsers.ini, ExclusiveUsers.ini, EconomyOverride.json, RaidTimes.json, Notifications.json, the Loot
// folder) are lists of Steam IDs or JSON the Settings tab has no editor for, so they are not offered here.

const settings = withChoices(
	{ ...scumServerSettings },
	{
		"scum.ArmedNPCDifficultyLevel": [["1", "Easy"], ["2", "Medium"], ["3", "Hard"]],
		"scum.RaidProtectionType": [
			["0", "Off"],
			["1", "Offline: protected while everyone is offline"],
			["2", "Flag-specific: each flag sets its own protection"],
			["3", "Global: one schedule for the whole server (RaidTimes.json)"],
		],
	},
);

export default {
	type: "scum",
	title: "SCUM",
	files: {
		"ServerSettings.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: {},
			settings,
			groupOrder: scumGroupOrder,
			mayBeMissing:
				"The server writes this file itself when it starts. The panel puts one in place with the server's name, password and player limit before the first start, and the game fills in the rest. Change settings while the server is stopped: the game reads the file only when it starts, and a running server can write over your changes.",
		},
	},
	launch: {
		title: "SCUM",
		program: /\bSCUMServer(?:\.exe)?\b/i,
		style: "equals",
		editable: true,
		where: "the `SCUMServer.exe` line of the server's start script",
		intro:
			"SCUM's settings are in `ServerSettings.ini` (the Settings tab). The launch line only gives the game port, the player limit and a few switches. Changes apply the next time the server starts.",
		args: [
			FLAG({ flag: "-log", label: "Show the log window", edit: false, managed: true, group: "Saves and logs", description: "Makes the server show its log in its console window. Steam's own launch entry for the server includes it." }),
			A({
				flag: "-port",
				label: "Game port",
				group: "Network",
				managed: true,
				example: "7780",
				description:
					"The UDP port players connect on. The game also takes the next two ports (a raw socket at +1 and the Steam server list query at +2), so keep three ports in a row free. Change it from the server's Ports section so the panel can check for clashes.",
			}),
			A({
				flag: "-MaxPlayers",
				label: "Max players",
				group: "Server",
				managed: true,
				example: "64",
				description: "The most players that can be online at once. It overrides the player limit in ServerSettings.ini. The SCUM wiki's example uses 64; sources disagree on the real upper limit.",
			}),
			FLAG({
				flag: "-nobattleye",
				label: "Turn off anti-cheat (BattlEye)",
				group: "Advanced",
				description: "Starts the server without the BattlEye anti-cheat. The SCUM wiki marks this as not recommended. Leave it off unless you know you need it.",
			}),
		],
	},
	guide: {
		name: "SCUM",
		short: "SCUM",
		summary:
			"SCUM keeps its settings in `SCUM\\Saved\\Config\\WindowsServer\\ServerSettings.ini` inside the server's install folder. Every setting is a `scum.<Name>=<value>` line under one of six sections (General, World, Respawn, Vehicles, Damage, Features). The launch line only gives the game port, the player limit and a few switches.",
		files: { "ServerSettings.ini": "The server's name, password, player limit and the rules of the world: zombies, animals, loot, respawn, vehicles, damage, base building, raid protection, skills and quests." },
		notes: [
			"The game reads the file only when it starts, and a running server can write over changes made to it, so stop the server before editing.",
			"The player and admin lists (`AdminUsers.ini`, `ExclusiveUsers.ini`, `WhitelistedUsers.ini`, `BannedUsers.ini`), the trader prices (`EconomyOverride.json`), the raid windows (`RaidTimes.json`), the scheduled messages (`Notifications.json`) and the `Loot` folder are in the same folder. The Settings tab does not edit them.",
			"SCUM has no official mod support (the developer said on 30 September 2026 that it will not arrive in 2026). Loot, trader and raid-time changes are made with those files.",
			"The game changes its list of settings about once a month. A setting the file has that the panel does not explain is still shown.",
		],
	},
};

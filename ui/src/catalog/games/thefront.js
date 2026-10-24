import { rows } from "../rows.js";
import { A } from "../launchHelpers.js";

// The Front (dossier: docs/research/games/thefront/, confidence low). The manager's settings file is ServerConfig_.ini in the
// TheFrontManager folder, with one [BaseServerConfig] section of Key=Value lines. Only the keys the dossier names with a description
// are offered here. The keys whose values the sources do not document (ServerFightModeType's numbers, IsCanChat, IsCanMail, the
// self-damage key) are left out until they are checked on a real install. The port keys are not offered: the launch line carries them.

const SECTION = "BaseServerConfig";

const settings = rows([
	["ServerName", "Server name", "The name shown in the server browser. Make it easy to search for.", "Server"],
	["ServerTitle", "Server title", "A short description shown under the name in the server list.", "Server"],
	["QueueThreshold", "Player cap", "The most players that can be on the server at once. The guides use 8.", "Server"],
	["ServerPassword", "Join password", "What players type to join. Leave it empty for a public server. A host guide advises plain letters and numbers.", "Access"],
	["ServerAdminAccounts", "Admin Steam IDs", "The Steam64 IDs of the people who get admin commands, separated by semicolons (;). Restart the server after you change it.", "Access"],
	["UseACE", "Anti-cheat", "Turns the anti-cheat on. A host guide says to set it to true and leave it on.", "Access"],
	["ServerFightModeType", "Fight mode", "Sets PvP (players fight players) or PvE (players fight the environment). The guides do not list the values, so type the number the game uses; the sample uses 1.", "Gameplay"],
	["PlayerAddExpRate", "Experience rate", "A multiplier for how fast players gain experience. 1 is normal, 2 is double, 0.5 is half, and 0 turns it off.", "Gameplay"],
	["SaveWorldInterval", "Save interval (seconds)", "How often the world is saved on its own, in seconds. The default is 300 (every five minutes); some hosts use 120.", "Saving"],
	["WelcomeMessage", "Welcome message", "Text shown to players when they join. One line is plenty.", "Messages"],
]);

const prefixed = Object.fromEntries(Object.entries(settings).map(([key, meta]) => [`${SECTION}::${key}`, meta]));

const launch = {
	title: "The Front",
	program: /TheFrontServer\.exe/i,
	style: "space",
	editable: false,
	where: "the `TheFrontServer.exe` line of the server's start script",
	intro:
		"The panel starts the server with the ports, the server name and the player cap. Every argument here is written by the panel, so none can be changed from this form. Other settings are in TheFrontManager\\ServerConfig_.ini, which the Settings tab edits.",
	args: [
		A({
			flag: "-port",
			style: "equals",
			label: "Game port",
			group: "Network",
			edit: false,
			managed: true,
			example: "7900",
			description:
				"The UDP port players connect to. The beacon, query and shutdown service ports are the three numbers above it. The panel writes it from the Ports section when the server is created.",
		}),
		A({
			flag: "-ServerName",
			style: "equals",
			label: "Server name",
			group: "Server",
			edit: false,
			managed: true,
			example: '"My Server"',
			description: "The name shown in the server browser. The panel writes it from the Server Name you typed.",
		}),
		A({
			flag: "-QueueThreshold",
			style: "equals",
			label: "Player cap",
			group: "Server",
			edit: false,
			managed: true,
			example: "8",
			description: "The most players that can be on the server at once. The panel writes 8, the value the host guide uses.",
		}),
	],
};

const guide = {
	name: "The Front",
	short: "The Front",
	summary:
		"The Front's server is TheFrontServer.exe in ProjectWar\\Binaries\\Win64, started by the panel's start script with the game port and the server name. The settings the game reads are in TheFrontManager\\ServerConfig_.ini, which this tab edits. Most of the settings are not documented by the sources the panel was built from, so only the documented ones are shown.",
	files: {
		"ServerConfig_.ini": "The server's settings, in one [BaseServerConfig] section of Key=Value lines. The panel writes the server name and join password when it creates the server.",
	},
	notes: [
		"Stop: the panel closes the server's window to stop it. The dossier found no console or RCON command for a clean save, so progress since the last automatic save (Save interval) may be lost.",
		"Backups: the panel backs up the settings file only. The world is kept in a database and files whose folders the sources do not name, so copy the world by hand until its location is known.",
		"Logs: no log file is known for this server, so the Logs tab is empty.",
		"A host guide says the settings file overrides the launch line, so change a value in this tab rather than on the start script.",
		"Not shown: the fight mode values, the chat and mail switches and the self-damage switch. The sources do not give their values, so type a value only after you have checked it in the game.",
		"Version: the server and the game client must run the same version. After an update, check that the server still starts before you tell players.",
		"Mods: no official mod support was found for the dedicated server, so the panel does not offer a mods field.",
	],
};

export default {
	type: "thefront",
	title: "The Front",
	files: {
		"ServerConfig_.ini": {
			parser: "ini",
			sectionLabels: { [SECTION]: "Server" },
			settings: prefixed,
			groupOrder: ["Server", "Access", "Gameplay", "Saving", "Messages"],
		},
	},
	launch,
	guide,
};

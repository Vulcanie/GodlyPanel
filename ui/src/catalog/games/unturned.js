import { rows, withChoices } from "../rows.js";

// Unturned. Two settings files are shown: Commands.dat (the server's start-up commands) and WorkshopDownloadConfig.json (which
// Steam Workshop items the server installs). Sources: the official SDG docs (servers/server-hosting, game-server-login-tokens,
// steamcmd), the game's own C# source (CommandMode, CommandMap, CommandMaxPlayers, CommandCamera, CommandQueue, CommandTimeout,
// WorkshopDownloadConfig) and the unturned.wiki.gg Commands page, checked against a real install of server 3.26.3.13.
//
// Commands.dat is read with the "convar" reader: one `Name value` per line, `//` comments. That reader writes a value with a space
// in it inside quotation marks, and the game's handling of quotation marks in this file is not documented, so the settings whose
// value is normally text with spaces (the server name, the welcome message) are not in the form.
//
// Not in the form, on purpose:
//   - Config.txt (the gameplay rules): the game makes it on its first run in a block format ({ } sections, the same key name in
//     several sections) that none of the panel's file readers handle. The difficulty, which picks the rules, is the Mode line below.
//   - Cheats and PvE in Commands.dat: they are lines with no value, and this reader would write `Cheats true`, a form the research
//     did not confirm. Edit those lines by hand.
//   - The launch line: the server's folder name (`+InternetServer/<name>`) has to be the last word on it and the panel's launch-line
//     editor adds new arguments at the end, so this game has no launch form. The full list of arguments is in the notes.

export const unturnedSettings = withChoices(
	rows([
		["Mode", "Difficulty", "Which difficulty the server runs. It picks the starting values of the game rules in Config.txt (hunger, loot, zombies and so on) for settings you have not changed there. Changes apply when the server starts.", "Rules"],
		["Map", "Map", "Which map the server loads. Give the name of the map's folder. For a Steam Workshop map, add its id to the Workshop items file (WorkshopDownloadConfig.json) and type its folder name here (the server log says Discovered level \"...\" once it has downloaded it). A name with a space in it cannot be written by this form; edit the file by hand for those.", "World"],
		["MaxPlayers", "Max players", "The most players connected at once, from 1 to 200 (the game's limit). The game's own default is 8.", "Players"],
		["Queue_Size", "Join queue size", "How many players may wait in line to join when the server is full, from 0 to 64.", "Players"],
		["Perspective", "Camera views allowed", "Which camera views players may use. The game accepts First, Third, Both and Vehicle.", "Rules"],
		["Timeout", "Ping limit before a kick", "Players whose ping is above this many milliseconds are kicked. The game accepts 50 to 10000; the Unturned wiki gives 750 as the default.", "Players"],
		["Password", "Password", "What players type to join. Leave the line out for a server anyone can join. Avoid spaces: this form puts a value with spaces inside quotation marks, and whether the game reads those as part of the password is not documented.", "Players"],
		["GSLT", "Steam login token", "A Game Server Login Token for Unturned (app 304930) from steamcommunity.com/dev/managegameservers. Without one the game does not list the server in the Internet server list. It is secret: treat it like a password.", "Network"],
	]),
	{
		Mode: [
			["Easy", "Easy"],
			["Normal", "Normal"],
			["Hard", "Hard"],
		],
		Map: { choices: [["PEI", "PEI"], ["Washington", "Washington"], ["Yukon", "Yukon"], ["Russia", "Russia"], ["Germany", "Germany"]], allowCustom: true },
		Perspective: [
			["First", "First person only"],
			["Third", "Third person only"],
			["Both", "First or third person"],
			["Vehicle", "Vehicle"],
		],
	},
);

export const unturnedGroupOrder = ["Rules", "World", "Players", "Network"];

// WorkshopDownloadConfig.json. The keys and defaults are the game's own (WorkshopDownloadConfig.cs); the meanings are its code comments.
export const unturnedWorkshopSettings = rows([
	["File_IDs", "Workshop items to install", "The Steam Workshop file ids the server installs and keeps updated every time it starts, as a list in square brackets such as [1753134636, 1702240229]. The id is the number after ?id= in the item's Workshop address. Dependencies are installed too, and a collection's id installs its items. Players download them when they join.", "Items"],
	["Ignore_Children_File_IDs", "Skip the dependencies of these items", "For the ids in this list, the items they name as dependencies are not installed automatically. Useful when an author lists other items only to advertise them. An empty list [] skips nothing.", "Items"],
	["Use_Cached_Downloads", "Reuse items already downloaded", "Loads items that are already installed instead of downloading them again when they have not changed. Leave on unless you are chasing a corrupt download.", "Downloads"],
	["Query_Cache_Max_Age_Seconds", "How long Steam answers are reused", "How old a saved answer from Steam may be, in seconds, before the server asks again. 0 turns the saving off. A higher number notices updates later but survives a failed query better.", "Downloads"],
	["Max_Query_Retries", "Steam query retries", "How many times a failed question to Steam is tried again. After that the server quits, so a very low number can stop the server over a short internet problem.", "Downloads"],
	["Should_Monitor_Updates", "Watch the items for updates", "Checks the installed items for updates while the server runs. When one is found the server counts down and shuts itself down so that it can be started again with the new version.", "Updates"],
	["Shutdown_Update_Detected_Timer", "Countdown after an update", "How many seconds the server waits after finding an update before it shuts down (600 is ten minutes). The server has to be started again afterwards, so set the panel to restart it when it stops on its own.", "Updates"],
	["Shutdown_Update_Detected_Message", "Update warning in chat", "The message players see in chat when the countdown starts. {0} is replaced by the time left.", "Updates"],
	["Shutdown_Kick_Message", "Message when kicked for an update", "The message shown to players who are still connected when the server shuts down for an update.", "Updates"],
]);

export const unturnedWorkshopGroupOrder = ["Items", "Downloads", "Updates"];

const guide = {
	name: "Unturned",
	short: "Unturned",
	summary: "Unturned's server keeps its start-up commands in `Commands.dat`, in the `Servers\\<name>\\Server` folder inside the server's folder, and the Steam Workshop items it installs in `WorkshopDownloadConfig.json` next to the server's `Config.txt`. The panel starts `Unturned.exe` with `-batchmode -nographics +InternetServer/<name>`, where `<name>` is the server's folder name under `Servers`.",
	files: {
		"Commands.dat": "The server's start-up commands, one per line: name, map, player limit, port, difficulty, password and Steam login token.",
		"WorkshopDownloadConfig.json": "Which Steam Workshop items (maps and other mods) the server downloads and keeps updated when it starts.",
	},
	notes: [
		"The game rules (zombies, loot, hunger, damage and so on) are in `Config.txt`, which the game makes the first time the server runs. The Settings tab does not edit it, because its block format is not one the panel can read safely: open it in a text editor. The **Difficulty** setting (`Mode` in Commands.dat) chooses which starting values the rules use, and a value you type in Config.txt wins. Settings are best changed while the server is stopped.",
		"The server's name, port and the `Cheats` and `PvE` lines are in Commands.dat too, but not in the form: a name usually has spaces, which the form would wrap in quotation marks, `Cheats` and `PvE` are lines with no value, and the port is chosen when the server is created.",
		"There is no launch-options form for this game. The game takes the server's folder name from the end of the launch line (`+InternetServer/<name>`), and the form adds new arguments at the end, which would become part of that name.",
		"**Save before you stop.** Unturned has no autosave. It saves when it gets its `Shutdown` command, and, according to its code, when its console window is closed. The panel closes the window and ends the process after a short wait, so check on your own server that a Stop keeps your progress (stop it, start it again, see whether your last changes are there).",
		"To be listed in the Internet server list the server needs a **Steam login token** (a GSLT) for Unturned, app 304930, from steamcommunity.com/dev/managegameservers. Without one the game still prints a 17-digit Server Code in its log.",
		"Players do not install anything for Workshop items: they download them when they join. A big map (Buak is about 1 GB) makes the first join slow. When an item is updated the server counts down (ten minutes by default) and shuts itself down so it can restart on the new version, so set the panel to restart the server when it stops on its own.",
		"Keep the server's folder path short. Windows stops at 260 characters for a whole file path, and Workshop maps and plugins create long ones. The game then silently skips part of a map and the OpenMod plugin framework fails to start. The log says \"Could not find a part of the path\" when this happens.",
		"The server uses two UDP ports: the one shown, and the next one up. Forward both if players join by address from outside your network.",
	],
};

export default {
	type: "unturned",
	title: "Unturned",
	files: {
		"Commands.dat": {
			parser: "convar",
			excludeSections: [],
			// The server's own address and name, the extra view of the world and the lines the form cannot write safely (see the top of this file).
			excludeKeys: ["Name", "Port", "Cheats", "PvE", "Owner", "Welcome", "Bind"],
			sectionLabels: { root: "Server" },
			settings: unturnedSettings,
			groupOrder: unturnedGroupOrder,
			mayBeMissing: "The panel writes Commands.dat when it creates the server, in the Servers folder inside the server's folder (Servers\\<name>\\Server). If it is missing, start the server once so the game makes its folder, then reload this page.",
		},
		"WorkshopDownloadConfig.json": {
			parser: "json",
			excludePaths: [],
			structuredPaths: [],
			sectionLabels: {},
			settings: unturnedWorkshopSettings,
			groupOrder: unturnedWorkshopGroupOrder,
			mayBeMissing: "The panel writes WorkshopDownloadConfig.json when it creates the server, and the game makes it on its first run if it is not there. Start the server once, then reload this page.",
		},
	},
	launch: null,
	guide,
};

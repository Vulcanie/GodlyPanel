import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// StarRupture. The server has one settings file, DSSettings.txt in the server's folder, next to StarRuptureServerEOS.exe. It is
// JSON and holds five settings, every value written as text (even the numbers and the yes/no ones). The game never creates it:
// the panel writes it when it makes the server. Read from the game's own program and a run of a real install.

const dsSettings = withChoices(
	rows([
		["SessionName", "World name", "The name of your world. It is also the name of the folder the world is saved in (StarRupture\\Saved\\SaveGames), so a new name starts a new, empty world and the old one stays on disk. Keep it short: 20 characters is the longest one server setup documents.", "World"],
		["StartNewGame", "Create a new world on start", "Yes builds a brand-new world every time the server starts. Use it once for the first start, then change it to No, and set \"Load the saved world on start\" to Yes, or the world is made again at every start. Do not switch it off before a save exists: with nothing to load, the server keeps running with no world at all.", "World"],
		["LoadSavedGame", "Load the saved world on start", "Yes loads the save named below when the server starts, so your world comes back after a restart or a crash. With No the server loads nothing: it waits with no world, or builds a new one if \"Create a new world on start\" is Yes.", "World"],
		["SaveGameName", "Save file to load", "The file inside the world's save folder to load, including .sav. It is case-sensitive. The server's own autosave is AutoSave0.sav; older autosaves are numbered after it.", "World"],
		["SaveGameInterval", "Autosave every (seconds)", "How often the world is saved by itself, in seconds. Server hosts suggest 180 to 600 (3 to 10 minutes); a very short time can cause lag each time the save is written.", "Saving"],
	]),
	{
		StartNewGame: [["true", "Yes: create a new world"], ["false", "No: keep the existing world"]],
		LoadSavedGame: [["true", "Yes: load the saved world"], ["false", "No: do not load a save"]],
	},
);

const dsSettingsOrder = ["World", "Saving"];

const launch = {
	title: "StarRupture",
	program: /\bStarRuptureServerEOS(?:\.exe)?\b/i,
	style: "equals",
	editable: true,
	where: "the `StarRuptureServerEOS.exe` line of the server's start script",
	intro: "StarRupture's server is started by a few arguments on the command that starts it. Everything about the world itself is in DSSettings.txt instead. Changes apply the next time the server starts.",
	args: [
		FLAG({ flag: "-Log", label: "Show the log window", edit: false, managed: true, group: "Required", description: "Opens a console window with the server's log. The game's own start script uses it too." }),
		A({ flag: "-Port", label: "Game port", group: "Network", managed: true, example: "7780", description: "The port players connect to. The game uses it for gameplay over UDP; forward UDP only. Change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "-multihome", label: "Bind address", group: "Network", example: "192.168.1.20", description: "Makes the server listen on one network adapter's address, for a PC with a VPN, ZeroTier or several network cards. Leave it off to use them all." }),
		FLAG({ flag: "-RCWebControlDisable", label: "Turn off the built-in web remote control", group: "Security", managed: true, description: "Switches off the web remote-control service built into the game's engine. Community server setups add this and the next argument as a precaution, because the game's built-in web server on the game port has a reported security hole." }),
		FLAG({ flag: "-RCWebInterfaceDisable", label: "Turn off the built-in web remote screen", group: "Security", managed: true, description: "The partner of the argument above: it switches off the web page of the same remote-control service." }),
	],
};

const guide = {
	name: "StarRupture",
	short: "StarRupture",
	summary: "StarRupture keeps its server settings in `DSSettings.txt` in the server's install folder, next to `StarRuptureServerEOS.exe`. The panel writes it when it creates the server, because the game never makes it. It is JSON with five settings, and every value is written as text.",
	files: { "DSSettings.txt": "The world's name, whether to create a new world or load the saved one at start, which save to load, and how often to autosave." },
	notes: [
		"The first start builds the world (\"Create a new world on start\" is Yes). After that, set it to **No** and \"Load the saved world on start\" to **Yes**, or the world is made again at every start.",
		"The game fixes the player limit at 4. It has no difficulty or rules settings in any file.",
		"Passwords are not set by the panel. The game reads them from `Password.json` (admin) and `PlayerPassword.json` (join) in the server folder, and will only accept a value made by a website (starrupture-utilities.com), not the password typed in plain text. Without `PlayerPassword.json` anyone who knows the address can join.",
		"Forward UDP only for the game port. The same number can also answer on TCP for the in-game Manage Server screen, which has a reported security hole (the panel turns that web interface off in the start script), so leave TCP closed.",
	],
};

export default {
	type: "starrupture",
	title: "StarRupture",
	files: {
		"DSSettings.txt": {
			parser: "json",
			excludePaths: [],
			structuredPaths: [],
			sectionLabels: {},
			settings: dsSettings,
			groupOrder: dsSettingsOrder,
			mayBeMissing: "The game never creates this file; the panel writes it when it makes the server. If it is missing, create DSSettings.txt in the server's folder, next to StarRuptureServerEOS.exe, then reload this page.",
		},
	},
	launch,
	guide,
};

import { rows, withChoices } from "./rows.js";
import { VRISING_CHOICES } from "./enums.js";

// V Rising: save-data\Settings\ServerHostSettings.json. What the file doesn't list keeps the game's own default. (The rules of the
// world itself are in ServerGameSettings.json, which the game makes the first time it runs.)

export const vrisingSettings = withChoices(
	rows([
		["Name", "Server name", "The name shown in the in-game server list.", "Server"],
		["Description", "Description", "A few lines shown under the name in the server list.", "Server"],
		["Password", "Password", "What players type to join. Leave empty for a server anyone can join.", "Server"],
		["MaxConnectedUsers", "Max players", "The most players that can be on at once.", "Server"],
		["MaxConnectedAdmins", "Admin slots", "Extra slots above the max players that only admins can use.", "Server"],
		["SaveName", "Save name", "The folder the world is saved in. A new name starts a new world; the old one is kept.", "Server"],
		["ListOnSteam", "List on Steam", "Shows the server in the Steam server list.", "Server"],
		["ListOnEOS", "List on Epic", "Shows the server in the Epic Online Services server list, so other platforms can find it.", "Server"],
		["Secure", "Anti-cheat", "Turns anti-cheat on. Players need it on to join.", "Server"],

		["Port", "Game port", "The port players connect to (UDP). Change it from the server's Ports section so the panel can check for clashes.", "Network"],
		["QueryPort", "Query port", "The port the server list asks for details on (UDP).", "Network"],
		["BindIpAddress", "Bind address", "The network address the server listens on. Leave empty to use every address.", "Network"],
		["ServerFps", "Server speed (ticks/sec)", "How many times a second the game world updates. Higher is smoother but heavier on the CPU.", "Network"],

		["GameSettingsPreset", "Game rules preset", "A named set of world rules from the game, such as StandardPvP. Leave empty to use the game's default.", "World"],
		["GameDifficultyPreset", "Difficulty preset", "A named difficulty from the game. Leave empty for the game's default.", "World"],
		["AdminOnlyDebugEvents", "Debug events: admins only", "Only admins may trigger debug events.", "World"],
		["DisableDebugEvents", "Debug events: off", "Turns debug events off for everybody.", "World"],

		["AutoSaveCount", "Autosaves to keep", "How many autosaves are kept before the oldest is overwritten.", "Saving"],
		["AutoSaveInterval", "Autosave every (seconds)", "How often the world is saved on its own.", "Saving"],
		["CompressSaveFiles", "Compress saves", "Makes the save files smaller, at a little extra CPU cost when saving.", "Saving"],

		["Rcon.Enabled", "Remote console", "Turns on the game's remote console. GodlyPanel does not use it for V Rising (the game has no stop command on it), so leave it off unless you have another tool.", "Remote console"],
		["Rcon.Port", "Remote console port", "The port of the remote console.", "Remote console"],
		["Rcon.Password", "Remote console password", "The remote console's password.", "Remote console"],
		["API.Enabled", "Web API", "Turns on the game's web API for metrics.", "Remote console"],
	]),
	VRISING_CHOICES,
);

export const vrisingGroupOrder = ["Server", "Network", "World", "Saving", "Remote console"];

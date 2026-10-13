import { rows, withChoices } from "./rows.js";
import { SOTF_CHOICES } from "./enums.js";

// Sons of the Forest: userdata\dedicatedserver.cfg. The file is JSON even though it is called .cfg.

export const sotfSettings = withChoices(
	rows([
		["ServerName", "Server name", "The name shown in the in-game server list.", "Server"],
		["Password", "Password", "What players type to join. Leave empty for a server anyone can join.", "Server"],
		["MaxPlayers", "Max players", "The most players that can be on at once.", "Server"],
		["LanOnly", "Local network only", "Only players on your own network can find and join. Turn off to play over the internet.", "Server"],

		["IpAddress", "Bind address", "The network address the server listens on. 0.0.0.0 means every address on this PC.", "Network"],
		["GamePort", "Game port", "The port players connect to (UDP). Change it from the server's Ports section so the panel can check for clashes.", "Network"],
		["QueryPort", "Query port", "The port the server list asks for details on (UDP).", "Network"],
		["BlobSyncPort", "Blob sync port", "A third port the game uses to send world data to players (UDP). The panel keeps it two above the game port.", "Network"],
		["SkipNetworkAccessibilityTest", "Skip the reachability test", "The game normally checks the server can be reached from the internet before it starts listening. Skipping it lets the server start on a network where that check fails.", "Network"],

		["GameMode", "Game mode", "The rules for a new world. Custom uses the custom settings in this file.", "Game"],
		["SaveMode", "On start", "Whether the server continues the existing save or begins a new one.", "Game"],
		["SaveSlot", "Save slot", "Which of the save slots (1 to 30) the server uses.", "Game"],
		["SaveInterval", "Autosave every (seconds)", "How often the world is saved on its own.", "Game"],
		["IdleDayCycleSpeed", "Day speed while empty", "How fast the in-game day passes while nobody is connected. 0 freezes time.", "Game"],
		["IdleTargetFramerate", "Frame rate while empty", "How many updates a second the server runs while nobody is connected. Lower saves CPU.", "Game"],
		["ActiveTargetFramerate", "Frame rate while in use", "How many updates a second the server runs while players are connected.", "Game"],

		["LogFilesEnabled", "Write log files", "Writes the server's log to a file, which the panel's Logs tab reads.", "Logs"],
		["TimestampLogFilenames", "Timestamp in log names", "Puts the date and time in each log file's name, so every run gets its own file.", "Logs"],
		["TimestampLogEntries", "Timestamp on each line", "Puts the time at the start of every log line.", "Logs"],
	]),
	SOTF_CHOICES,
);

export const sotfGroupOrder = ["Server", "Network", "Game", "Logs"];

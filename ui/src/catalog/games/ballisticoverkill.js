import { rows, withChoices } from "../rows.js";

// Ballistic Overkill. Its settings are Key=value lines in config.txt, in the server's folder (the "properties" parser reads them).
// Source of every name, value and description: the research dossier (research/ballisticoverkill/02-config.md), whose source for the keys
// is the repo copy of the game's example config.txt (Game-Server-Configs, bo/config.txt), with the same values on xgamingserver.com.
// Those are example values, not the game's defaults, and no page says what the game writes on first run.
//
// Not in the form, on purpose:
//   - ServerPort and QueryPort: the panel writes both from the server's Ports section, so the file and the server's entry cannot disagree
//     (the same choice the Minecraft module makes for its port);
//   - Rounds, RoundTime and MaxSpectators: the dossier has only the bare key name for them, with no explanation;
//   - DedicatedBroadcast: the example file and a 2017 comment describe its three values differently (see the dossier's conflicts);
//   - the keys the dossier does not explain (none of them has a value list or a description beyond its name).
// A key the file has that is not here is kept as it is.

const ON_OFF = { choices: [["0", "Off"], ["1", "On"]] };

export const ballisticServerSettings = withChoices(
	rows([
		// Server
		["ServerName", "Server name", "The name shown in the server browser. The panel writes it when it creates the server.", "Server"],
		["Password", "Join password", "Only players who type this password can enter the match. Leave it empty for an open server.", "Server"],
		["MaxPlayers", "Max players", "The most players allowed on the server, from 2 to 16 (the example file's own note).", "Server"],
		["MaxPing", "Max ping (milliseconds)", "A player whose ping is above this many milliseconds is kicked from the server. 0 turns the check off.", "Server"],
		["OwnerId", "Owner Steam ID", "The SteamID64 of the server's owner. Only that player can send special commands from chat. The dossier does not list those commands.", "Server"],

		// Match
		["GameMap", "Start map", "The map the server starts on, by its number in the example file's list.", "Match"],
		["GameMode", "Game mode", "The mode the matches are played in, by its number in the example file's list.", "Match"],
		["MatchTime", "Match time (minutes)", "How long a match lasts, in minutes.", "Match"],
		["Rounds", "Rounds", "How many rounds are played (the file gives no further detail).", "Match"],
		["RoundTime", "Round time", "How long each round lasts (the file gives no unit or further detail).", "Match"],
		["WarmUpTime", "Warm-up time (seconds)", "The wait between one match and the next, in seconds, before players spawn into the next match.", "Match"],
		["Autobalance", "Balance teams automatically", "Whether the two teams are kept even as players join and leave.", "Match"],

		// Login banner
		["BannerURL", "Login banner image", "The image shown while players log into the server. Use a JPG or PNG that is 328 by 82 pixels.", "Login banner"],
		["ClickURL", "Banner link", "The web address that opens when a player clicks the login banner.", "Login banner"],
	]),
	{
		GameMap: [
			["1", "Sunnsquare Mall"],
			["2", "Corporate Park"],
			["3", "Hollow"],
			["4", "Nox Museum"],
			["5", "Overhead"],
			["6", "Citadel"],
			["7", "Hakim"],
			["8", "Blackfield"],
			["9", "Wonderdome"],
			["10", "Reinstate"],
		],
		// The example file's own spelling of the first mode is "Deatchmatch"; the label here is the plain word.
		GameMode: [
			["1", "Team Deathmatch"],
			["2", "Conquest"],
			["3", "King of the Hill"],
			["4", "Rounds"],
			["5", "Free for all"],
		],
		Autobalance: ON_OFF,
	},
);

export const ballisticGroupOrder = ["Server", "Match", "Login banner"];

const guide = {
	name: "Ballistic Overkill",
	short: "Ballistic Overkill",
	summary:
		"Ballistic Overkill keeps its settings in config.txt, one Key=value per line, in the server's folder. The panel writes the name, the two ports and the password when it creates the server; the rest is on the Settings tab.",
	files: {
		"config.txt": "The server's settings: its name and password, the match rules (map, mode, time, teams) and the login banner. The panel writes the name, the ports and the password; the game's own defaults apply to the rest.",
	},
	notes: [
		"Changing a setting takes effect when the server restarts (the example file says so). Stop the server from the panel, then start it again.",
		"The ports are not on this page: the panel sets them from the server's Ports section, and it writes them into config.txt when the server is created. If you change a port later, change it in the file too, or the server will not match the panel's record.",
		"Stopping: no quit command or remote console is documented for this game. The panel's Stop asks the server window to close and, after 15 seconds, ends the program.",
		"Checked on a real install: the anonymous install works without the base game, BODS.exe starts with the settings from config.txt, answers the Steam query on the query port and the panel's Stop closes it gracefully. The game keeps no log in the server folder, so the Logs tab is empty.",
		"Not in the form: the number of rounds and the round time (the dossier gives only their names), the broadcast mode (its sources disagree) and the game's mod support, which the dossier did not find.",
	],
};

export default {
	type: "ballisticoverkill",
	title: "Ballistic Overkill",
	files: {
		"config.txt": {
			parser: "properties",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: ballisticServerSettings,
			groupOrder: ballisticGroupOrder,
			mayBeMissing:
				"The panel writes config.txt in the server's folder when it creates the server. If it is missing, create it there with one Key=value line per setting, such as ServerName=My Server. The dossier does not say whether the game writes this file on its first run.",
		},
	},
	// No launch-argument form: the panel writes the program's flags, and the dossier names no other argument the game accepts.
	launch: null,
	guide,
};

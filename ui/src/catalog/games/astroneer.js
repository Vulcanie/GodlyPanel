import { rows } from "../rows.js";

// Astroneer: two ini files in Astro\Saved\Config\WindowsServer\ inside the server's install folder.
//  - AstroServerSettings.ini, section [/Script/Astro.AstroServerSettings]: the descriptions come from xgamingserver's settings
//    reference (https://xgamingserver.com/docs/astroneer/server-settings), Nodecraft's listing of the file the game makes
//    (https://nodecraft.com/support/games/astroneer/general-settings-overview) and GameServerKings'
//    guide (https://www.gameserverkings.com/knowledge-base/astroneer/astroneer-dedicated-server/);
//  - Engine.ini, section [URL]: the game port.
// Six keys of the first file (bLoadAutoSave, bWaitForPlayersBeforeShutdown, ServerGuid, bDisableServerTravel, VerbosePlayerProperties,
// ShareCode) are in the file the panel writes but no page says what they do, so they are not explained here. The player limit is
// left out too: pages disagree on its name (MaxPlayerCount or MaximumPlayerCount) and none is in the game's own file.
//
// Astroneer takes no command-line argument that any page documents, so there is no launch form (launch: null).

export const ASTRONEER_SECTION = "/Script/Astro.AstroServerSettings";
export const ENGINE_SECTION = "URL";

const settingRows = rows([
	["ServerName", "Server name", "The name shown in the server browser. The hosting panels allow 60 characters at most.", "Server"],
	["ServerAdvertisedName", "Advertised name", "If set, this is shown in the server browser instead of the server name. Leave empty to show the server name.", "Server"],
	["PublicIP", "Public IP address", "The address players use to join, without a port. The server registers itself with it, so it must be the address players actually type. The server does not start if this is empty.", "Server"],

	["ServerPassword", "Join password", "What players type to join. Letters, numbers, dashes and underscores only. Leave empty for a server anyone can join.", "Access"],
	["OwnerName", "Owner's Steam name", "The server owner's Steam name, spelled exactly the way other players see it. The server does not start if this is empty.", "Access"],
	["OwnerGuid", "Owner's SteamID64", "The owner's 17-digit SteamID64. Write 0 and the game fills it in when the owner first joins. The server does not start if this is empty.", "Access"],
	["DenyUnlistedPlayers", "Allowed players only", "On: only players already listed in the server's player list can join. Off: anyone with the password (if any) can join.", "Access"],
	["ConsolePassword", "Remote console password", "The password the game's remote console asks for. A hosting guide recommends setting a long random one. The panel does not use the remote console.", "Access"],

	["ActiveSaveFileDescriptiveName", "Save file name", "The name of the save the server loads and writes to, without the .savegame ending. The saves are in Astro\\Saved\\SaveGames.", "Saves"],
	["AutoSaveGameInterval", "Auto-save every (seconds)", "How often the game saves the world by itself. 900 is 15 minutes. The panel can only close the server, not ask it to save, so the world since the last save can be lost when the server is stopped.", "Saves"],
	["BackupSaveGamesInterval", "Save backup every (seconds)", "How often the game makes a backup copy of the save. 7200 is 2 hours.", "Saves"],

	["PlayerActivityTimeout", "Kick idle players after (seconds)", "Players who do nothing for this many seconds are removed. 0 turns this off.", "Performance"],
	["MaxServerFramerate", "Server frame rate (players on)", "How many times a second the server updates the world while players are connected. 30 is the default. A higher number such as 60 can feel smoother but uses more of the processor.", "Performance"],
	["MaxServerIdleFramerate", "Server frame rate (nobody on)", "How many times a second the server updates the world when nobody is connected. It is kept low on purpose to save processor time, so leave it low.", "Performance"],
]);

const settings = Object.fromEntries(Object.entries(settingRows).map(([key, meta]) => [`${ASTRONEER_SECTION}::${key}`, meta]));

const engineRows = rows([
	["Port", "Game port", "The port players connect to. Change it from the server's Ports section so the panel can check for clashes and open the firewall. Two servers on one PC need different ports.", "Network"],
]);

const engineSettings = Object.fromEntries(Object.entries(engineRows).map(([key, meta]) => [`${ENGINE_SECTION}::${key}`, meta]));

export default {
	type: "astroneer",
	title: "Astroneer",
	files: {
		"AstroServerSettings.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: { [ASTRONEER_SECTION]: "Server settings" },
			settings,
			groupOrder: ["Server", "Access", "Saves", "Performance"],
			mayBeMissing: "The panel writes this file when it creates the server. If it has been deleted, the game makes a new one when the server first runs, and it will not start until the public IP address and the owner are filled in again.",
		},
		"Engine.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: { [ENGINE_SECTION]: "Network" },
			settings: engineSettings,
			groupOrder: ["Network"],
			mayBeMissing: "The panel writes this file when it creates the server. If it has been deleted, the game makes a new one when the server first runs, with its own port.",
		},
	},
	launch: null,
	guide: {
		name: "Astroneer",
		short: "Astroneer",
		summary: "Astroneer keeps the server's options in two files in `Astro\\Saved\\Config\\WindowsServer` inside the server's install folder. The program takes no launch options.",
		files: {
			"AstroServerSettings.ini": "The server name, join password, the owner (who becomes the server's admin), the public IP address, saving and the server's speed.",
			"Engine.ini": "The game port.",
		},
		notes: [
			"The server will not start if the public IP address, the owner's Steam name or the owner's SteamID64 is empty. The panel asks for them when it creates the server.",
			"Every player must set `net.AllowEncryption=False` under `[SystemSettings]` in their own `%LocalAppData%\\Astro\\Saved\\Config\\WindowsNoEditor\\Engine.ini` before joining, as the server guides say. On Windows the server itself needs no change.",
			"Edit these files only while the server is stopped: the game's own notice is that changes made while it runs are lost.",
			"The panel stops the server by closing it, and Astroneer has no documented way to save first. The world since the last auto-save can be lost, so keep the auto-save interval short.",
			"Mods are `.pak` files put in `Astro\\Saved\\Paks`. That has not been tested on a server, so the panel adds nothing for them.",
		],
	},
};

import { rows } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Icarus: Icarus\Saved\Config\WindowsServer\ServerSettings.ini, one section, twelve settings (the list in RocketWerkz's own
// ServerSettings.ini and their wiki: https://github.com/RocketWerkz/IcarusDedicatedServer/wiki). The panel writes the file when it
// creates the server, because the game only makes it once the server has reached its lobby.
//
// Difficulty and hardcore are not settings of any file. They are part of the world ("prospect") when it is created: the
// "<Type> <Difficulty 1-4> <Hardcore> <SaveName>" text of CreateProspect, or the choices made in the in-game lobby.

export const ICARUS_SECTION = "/Script/Icarus.DedicatedServerSettings";

const settingRows = rows([
	["SessionName", "Session name (does not work)", "Meant to be the server's name in the server browser, but the developers say it currently does nothing. The name comes from the -SteamServerName launch argument instead (Launch options).", "Server"],
	["MaxPlayers", "Max players", "The most players that can be on the server at once. The official guide documents 1 to 8. A higher number may be accepted, but that has not been confirmed, and more players make the server heavier.", "Server"],

	["JoinPassword", "Join password", "What players type to join. Leave empty for a server anyone can join.", "Access"],
	["AdminPassword", "Admin password", "Players type /AdminLogin followed by this password in the game's chat to become admin and use the kick, ban and return-to-lobby commands. If it is empty, anyone can become admin, so set one.", "Access"],

	["ShutdownIfNotJoinedFor", "Back to lobby if nobody joins (seconds)", "After a world starts, if no player joins within this many seconds the world is closed and the server goes back to its lobby (the game is paused meanwhile). A negative number never does this and 0 does it at once. 300 is 5 minutes.", "Idle behaviour"],
	["ShutdownIfEmptyFor", "Back to lobby when empty (seconds)", "After the last player leaves, the server waits this many seconds, then closes the world and goes back to its lobby (the game is paused meanwhile). A negative number never does this and 0 does it at once. 300 is 5 minutes.", "Idle behaviour"],

	["AllowNonAdminsToLaunchProspects", "Anyone can start worlds", "On: anyone in the lobby can create a new world or open a saved one. Off: only players who have signed in as admin can.", "Lobby permissions"],
	["AllowNonAdminsToDeleteProspects", "Anyone can delete worlds", "On: anyone in the lobby can delete saved worlds from the server. Off: only players who have signed in as admin can.", "Lobby permissions"],

	["ResumeProspect", "Resume the last world at start", "On: when the server starts it reopens the last world it ran (the one named under 'Last world used') and skips the lobby. Off: it waits in the lobby for someone to pick a world.", "World at startup"],
	["LoadProspect", "Open this saved world at start", "The name of a saved world to open when the server starts. It is looked up among the server's saved worlds. Leave empty to not force one.", "World at startup"],
	["CreateProspect", "Create this world at start", "Makes and starts a brand-new world when the server starts. Written as four parts separated by spaces: world type, difficulty (1 easy to 4 extreme), hardcore (true or false, true means no respawns) and a save name, for example Tier1_Forest_Recon_0 3 false MyWorld. The save name is required for outposts. The server handles LoadProspect first, then ResumeProspect, then this; a hosting guide warns that leaving it set can make a fresh world each time the server starts, so clear it after the first start.", "World at startup"],
	["LastProspectName", "Last world used", "The world that ran most recently. The server fills this in itself, and 'Resume the last world at start' reads it. Only change it while the server is stopped, and only to the name of a saved world that exists.", "World at startup"],
]);

const settings = Object.fromEntries(Object.entries(settingRows).map(([key, meta]) => [`${ICARUS_SECTION}::${key}`, meta]));

const groupOrder = ["Server", "Access", "Idle behaviour", "Lobby permissions", "World at startup"];

// The arguments on the launch line. Source: the Server Config & Launch Parameters and Server Setup pages of the official wiki.
// -CreateProspect and -LoadProspect are explained but not offered in the form: the editor adds a value with spaces as
// "-Name=value with spaces" in one quoted piece, and Unreal reads -Name="value with spaces", so the same two settings are
// offered as CreateProspect and LoadProspect in ServerSettings.ini instead.
const launch = {
	title: "Icarus",
	program: /\bIcarusServer-Win64-Shipping(?:\.exe)?"?/i,
	style: "equals",
	editable: true,
	where: "the `IcarusServer-Win64-Shipping.exe` line of the server's start script",
	intro: "Icarus' server name and ports are given on the command that starts it; the rest of its options are in `ServerSettings.ini` (the Settings tab). Difficulty is not in any file: it is part of the world, chosen when the world is created. Changes apply the next time the server starts.",
	args: [
		FLAG({ flag: "-Log", label: "Show server window", edit: false, managed: true, group: "Required", description: "Opens a window that shows the server's log while it runs; the official guide says nothing is visible without it. Written -Log. (-LOG=<file> is a different argument that sends the log to another file under Saved\\Logs; the Logs tab reads Saved\\Logs\\Icarus.log, so leave that one alone.)" }),
		A({ flag: "-SteamServerName", label: "Server name", group: "Server", managed: true, example: '"My Icarus Server"', description: "The name shown in the in-game server browser, 64 characters at most. This is the only way to set it: SessionName in the settings file does nothing." }),
		A({ flag: "-PORT", label: "Game port", group: "Network", managed: true, example: "17777", description: "The UDP port players connect to. Change it from the server's Ports section so the panel can check for clashes and open the firewall. Two servers on one PC need different ports." }),
		A({ flag: "-QueryPort", label: "Query port", group: "Network", managed: true, example: "27015", description: "The UDP port Steam asks for the server's details on. Change it from the server's Ports section. Two servers on one PC need different query ports." }),
		A({ flag: "-MULTIHOME", label: "Bind address", group: "Network", example: "192.168.1.20", description: "Makes the server use one specific IP address of this PC. Only useful on a PC with several network cards or addresses; leave it off to use them all." }),
		FLAG({ flag: "-ResumeProspect", label: "Resume the last world", group: "World at startup", description: "Reopens the last world the server ran when it starts. The settings file already does this unless its ResumeProspect is turned off." }),
		A({ flag: "-LoadProspect", label: "Open a saved world", edit: false, group: "World at startup", example: "MyWorld", description: "Opens a saved world by its name when the server starts. Set it as LoadProspect in ServerSettings.ini instead." }),
		A({ flag: "-CreateProspect", label: "Create a world", edit: false, group: "World at startup", example: '"Tier1_Forest_Recon_0 3 false MyWorld"', description: "Makes and starts a new world when the server starts: world type, difficulty (1 easy to 4 extreme), hardcore (true or false) and save name, in one quoted piece. Leaving it on the line can make a new world on every start. Set it as CreateProspect in ServerSettings.ini instead." }),
		A({ flag: "-UserDir", label: "Data folder", edit: false, group: "Saves and logs", example: '"D:\\IcarusData"', description: "Moves the Saved folder (settings, saved worlds, logs) somewhere else. The panel looks for them inside the server's own folder, so leave it off." }),
		A({ flag: "-saveddirsuffix", label: "Saved folder suffix", edit: false, group: "Saves and logs", example: "player2", description: "Adds a suffix to the Saved folder's name, to keep two servers from sharing saves. The panel looks for the plain Saved folder, so leave it off." }),
		A({ flag: "-ABSLOG", label: "Log file (full path)", edit: false, group: "Saves and logs", example: '"C:\\Logs\\icarus.log"', description: "Writes the log to a file at this full path. The Logs tab reads Saved\\Logs, so it would then show nothing." }),
	],
};

export default {
	type: "icarus",
	title: "Icarus",
	files: {
		"ServerSettings.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: { [ICARUS_SECTION]: "Server settings" },
			settings,
			groupOrder,
			mayBeMissing: "The panel writes this file when it creates the server. If it has been deleted, the game makes a new one the first time the server reaches its lobby.",
		},
	},
	launch,
	guide: {
		name: "Icarus",
		short: "Icarus",
		summary: "Icarus keeps the server's options in `Icarus\\Saved\\Config\\WindowsServer\\ServerSettings.ini` inside the server's install folder. The server's name and ports are given on the command that starts it (the **Launch options**).",
		files: { "ServerSettings.ini": "The join and admin passwords, the player limit, when an idle server goes back to its lobby, who may start and delete worlds, and which world opens at start." },
		notes: [
			"Difficulty and hardcore are not in any file. They belong to a world and are chosen when it is created: in the game's lobby, or in the `CreateProspect` setting (`<world type> <difficulty 1-4> <hardcore true/false> <save name>`).",
			"The server's name is set by the `-SteamServerName` launch argument. `SessionName` in the settings file is documented as doing nothing.",
			"Icarus has no remote console the panel can use. Admin commands (kick, ban, return to lobby) are typed in the game's chat after `/AdminLogin <password>`.",
		],
	},
};

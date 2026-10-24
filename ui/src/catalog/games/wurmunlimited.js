import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Wurm Unlimited. Two places hold the server's settings:
//   wurm.ini      the world folder (<install>\<world>\wurm.ini), Java Properties syntax (KEY=value lines). Read at start (Wurmpedia). The
//                 panel does not create it; the list below has only the keys the research describes in plain words. Keys with no
//                 description, type or default in any source are left out.
//   launch line   the world, the ports, the player limit, the name and the passwords, plus a few optional arguments below. The panel writes
//                 the managed ones when the server is created.
// Names and defaults come from Wurmpedia's key list and command-line list (last edited 2016), XGamingServer's sample and the Pterodactyl egg.
// Nothing was run on a real install. Where a source says a default, it is given; where none does, none is given.
// The key names are as Wurmpedia writes them (all capitals, with underscores).

const TRUE_FALSE = [["true", "Yes"], ["false", "No"]];

const wurmRows = rows([
	// Map
	["CAVEIMG", "Save an ore picture", "When on, the ores on the map are saved to a file called Ore.png in the server's folder each time the server starts. The default is off.", "Map"],
	["CREATESEEDS", "Random forage and botanize spots", "When on, the server places forage and botanize resources on random tiles each time it starts. The default is off.", "Map"],
	["PROSPECT", "Random hidden ores", "When on, the server randomly changes ores hidden in the rock layer. It turns itself off again when the file is saved. The default is off.", "Map"],

	// Access
	["MAINTAINING", "Maintenance mode", "When on, only players with a power level above 0 can log in, so you can work on the server without players. The default is off.", "Access"],
	["IS_GAME_SERVER", "Allow direct login", "Whether players can log in directly to this server. The default is on. Turn it off only for a server meant to be used through another server.", "Access"],

	// Logs
	["PLAYERLOG", "Player statistics log", "The file that player statistics are written to at regular intervals. It must end in .log and be writable, or the default is used. The default is numplayers.log in the server's folder.", "Logs"],

	// Advanced
	["DEVMODE", "Developer mode", "Turns on extra logging and turns off sending email. Leave it off on a normal server. The default is off.", "Advanced"],
	["LAG_THRESHOLD", "Slow operation log (milliseconds)", "Long-running operations that take longer than this many milliseconds are written to the log. The default is 1000.", "Advanced"],

	// Performance
	["PLAYER_CONN_MILLIS", "Wait between player connections (milliseconds)", "How long the server waits between accepting one player's connection and the next, in milliseconds. The default is 1000.", "Performance"],
]);

const wurmSettings = withChoices(wurmRows, {
	CAVEIMG: TRUE_FALSE,
	CREATESEEDS: TRUE_FALSE,
	PROSPECT: TRUE_FALSE,
	MAINTAINING: TRUE_FALSE,
	IS_GAME_SERVER: TRUE_FALSE,
	DEVMODE: TRUE_FALSE,
});

// The properties parser names every key's section "root", so the catalog keys are written root::KEY (as the Minecraft entry does).
const prefixRoot = (map) => Object.fromEntries(Object.entries(map).map(([key, meta]) => [`root::${key}`, meta]));

// Launch line: Wurm's arguments are written key=value with no dash in front (ip=0.0.0.0, start=Creative).
const launch = {
	title: "Wurm Unlimited",
	program: /\bWurmServerLauncher(?:\.exe)?\b/i,
	style: "equals",
	editable: true,
	where: "the `WurmServerLauncher.exe` line of the server's start script",
	intro:
		"Wurm Unlimited's launcher is started with arguments written `name=value`, with no dash in front. The world, ports, name, player limit and passwords are written by the panel when the server is created. The optional arguments below can be added here. Changes apply the next time the server starts.",
	args: [
		A({ flag: "start", label: "World", edit: false, managed: true, group: "Required", example: "Creative", description: "The world the server loads: the name of a folder in the server's folder, made first with the game's own launcher. Creative and Adventure are the names the research gives." }),
		A({ flag: "externalport", label: "Game port (TCP)", edit: false, managed: true, group: "Network", example: "3724", description: "The TCP port players connect through. The default is 3724. The panel's Ports section does not rewrite this argument: change it here and in the Ports section together." }),
		A({ flag: "queryport", label: "Steam query port (UDP)", edit: false, managed: true, group: "Network", example: "27020", description: "The UDP port the Steam server browser asks for the server's details on. The research gives the range 27016 to 27030 for it." }),
		A({ flag: "maxplayers", label: "Max players", edit: false, managed: true, group: "Server", example: "25", description: "The most players that can be online at once. The panel writes the number chosen when the server is created." }),
		A({ flag: "servername", label: "Server name", edit: false, managed: true, group: "Server", example: '"My Wurm Server"', description: "The name shown in the server browser, in quotes. The research gives a limit of 64 characters." }),
		A({ flag: "serverpassword", label: "Server password", edit: false, managed: true, group: "Server", example: "(your password)", description: "The password players must enter to join. Set when the server is created; it is not shown here so it stays out of view." }),
		A({ flag: "adminpwd", label: "Admin password", edit: false, managed: true, group: "Server", example: "(your password)", description: "The password that unlocks the in-game admin commands. Set when the server is created; it is not shown here so it stays out of view." }),
		A({ flag: "ip", label: "Listen address", group: "Network", example: "0.0.0.0", description: "The IP address the server binds to. Leave it out unless the server's default network address is not the one players should use." }),
		A({
			flag: "homekingdom",
			label: "Home kingdom",
			group: "Server",
			example: "4",
			options: [["0", "0 No kingdom"], ["1", "1 Jenn-Kellon"], ["2", "2 Mol-Rehan"], ["3", "3 Horde of the Summoned"], ["4", "4 Freedom"]],
			description: "The kingdom the server belongs to, when it is a home server. The numbers are the ones the game's own launcher lists.",
		}),
		A({ flag: "homeserver", label: "Home server", group: "Server", example: "true", options: TRUE_FALSE, description: "Whether the server is a home server, which belongs to a single kingdom. The research gives no default." }),
		A({ flag: "pvp", label: "Player versus player", group: "Rules", example: "true", options: TRUE_FALSE, description: "Turns player-versus-player fighting on or off on the server. The research gives no default." }),
		A({ flag: "epicsettings", label: "Epic settings", group: "Rules", example: "false", options: TRUE_FALSE, description: "When on, the server follows the rules of the official Epic servers, for example the skill curve. The research gives no default." }),
		A({ flag: "loginserver", label: "Login server", group: "Network", example: "true", options: TRUE_FALSE, description: "Whether this server acts as a login server. The default is on. Turn it off only if another server is meant to act as the login server." }),
	],
};

const guide = {
	name: "Wurm Unlimited",
	short: "Wurm Unlimited",
	summary:
		"Wurm Unlimited's server runs from `WurmServerLauncher.exe` in the server's folder. Each world is a folder in that folder, made first with the game's own launcher. The name, ports, player limit and passwords are on the start command (the **Launch options** on the Settings tab); the rest of the settings are in `wurm.ini` in the world's folder.",
	files: {
		"wurm.ini": "The map, access, logging and performance settings the research describes. The panel does not create this file; it appears once the game has written it.",
	},
	notes: [
		"**The panel cannot stop the server cleanly.** Use **Shutdown server** in the launcher's window first (it asks for a number of seconds and a reason). The panel has no way to press it, so Stop closes the window and ends the process after 15 seconds. Open the server's window, which the panel keeps minimized on the taskbar, use Shutdown server, wait for the window to close, and only then press Stop or update.",
		"**The world is made on the first start.** The start script copies the template that ships with the server (the Creative or Adventure folder under dist) into the server folder if the world is not there yet. A world with another name has to be made with the game's own launcher.",
		"**Ports.** The game port (3724, TCP) is what players connect through, and the Steam query port (UDP) is used by the server browser. The panel's firewall check opens UDP only, so allow the game port's TCP in Windows Firewall and forward it on your router. Change a port in the Ports section and also on the start command, because the panel does not rewrite it from the Ports section.",
		"**Admin commands** are unlocked by the admin password on the start command. Without it nobody has the in-game admin commands.",
		"**Mods are not managed.** Wurm Unlimited's mods need a community modloader, and the research found no safe path for the panel to set it up. Install a modloader and its mods by hand with the server stopped, and back up first.",
		"**Remote control is not used.** The game's remote control (RMI) is off unless `USE_INCOMING_RMI=true` is set in `wurm.ini`, and the research advises against turning it on without securing the server's ports. The panel does not use it.",
		"Use plain English letters and digits in names and passwords. The panel refuses quotes, spaces in passwords, and the characters the Windows command line acts on.",
	],
};

export default {
	type: "wurmunlimited",
	title: "Wurm Unlimited",
	files: {
		"wurm.ini": {
			parser: "properties",
			excludeSections: [],
			sectionLabels: { root: "Wurm Unlimited settings" },
			settings: prefixRoot(wurmSettings),
			groupOrder: ["Map", "Access", "Logs", "Performance", "Advanced"],
			mayBeMissing: "The server reads wurm.ini from the world's folder when it starts. The first start copies it in from the shipped world template, so it appears here after that. Stop the server before editing it.",
		},
	},
	launch,
	guide,
};

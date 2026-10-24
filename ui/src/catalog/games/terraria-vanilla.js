import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Terraria, the vanilla dedicated server (id and type `terraria-vanilla`; the tModLoader server is `terraria`). Two things are edited here:
//   serverconfig.txt  in the server's platform folder (1458\Windows): `key=value` lines, `#` starts a comment line. That is the shape of
//                     the panel's "properties" reader, so the Settings tab edits it. The panel writes a small file of its own (world,
//                     autocreate, worldname, password) and the rest is added from this list.
//                     A commented-out line is not seen by the reader, so a setting that is not in the file yet is offered to add.
//   Launch options    the line of Start_Terraria.bat that starts TerrariaServer.exe. The game port and the player limit are given there
//                     and only there, so `port` and `maxplayers` are left out of the file's catalog (a second copy could disagree).
// Sources: research/terraria-vanilla/02-config.md and 03-launch-args.md (the Terraria wiki's Server, Command-line parameters and Setting up
// a server pages, read through a mirror). Where the wiki's sample file and its server page disagree, the wording is said in the text.
//
// Left out because the research could not explain them with confidence or they do not apply to this server:
//  - journeypermission_increaseplacementrange, journeypermission_setdifficulty, journeypermission_biomespread_setfrozen and
//    journeypermission_setspawnrate: the wiki gives no description for them; only the key name is known;
//  - -steam, -lobby (Steam lobbies and friends-only joins; the panel does not use Steam for this server);
//  - -pass, -motd, -world, -worldname, -autocreate, -seed, -banlist, -secure: they are in serverconfig.txt, so two copies could disagree;
//  - -forcepriority: its allowed values are not on its row of the wiki, and the Settings tab's priority setting covers the same thing;
//  - the client-only arguments on the wiki's list (-savedirectory, -logfile and the rest): the wiki says they belong to the desktop game.

const WORLD = "World";
const CREATION = "New world";
const SERVER = "Server";
const NETWORK = "Network";
const PERFORMANCE = "Performance";
const JOURNEY = "Journey permissions";

const worldRows = rows([
	["world", "World file", "The full path of the world to load: the .wld file, written without quotes. The panel fills this in with a file named after the world in the server's Worlds folder. If that file does not exist, a new world is made there (see 'Create world if missing').", WORLD],
	["worldpath", "World folder", "The folder world files are stored in. The world line above is a full path, so this is only needed if you keep worlds somewhere else on purpose. Leave it out otherwise, so the backups find the worlds.", WORLD],
	["autocreate", "Create world if missing", "If the file named on the world line does not exist, the server makes a new world of this size there. It does nothing for a world that already exists.", CREATION],
	["worldname", "New world name", "The name a newly made world is given. It has no effect on a world that already exists.", CREATION],
	["seed", "World seed", "The seed a newly made world is generated from. Only used when a new world is made, the same as the size and name above.", CREATION],
	["difficulty", "World difficulty", "The game mode of a newly made world. The wiki's server page gives 0 as Normal; its sample file calls 0 Classic, so the name shown in the game may differ. Mobile servers add 1 to each value, the wiki says. It only applies to a new world.", CREATION],
]);

withChoices(worldRows, {
	autocreate: [
		["1", "Small"],
		["2", "Medium"],
		["3", "Large"],
	],
	difficulty: [
		["0", "Normal"],
		["1", "Expert"],
		["2", "Master"],
		["3", "Journey"],
	],
});

const serverRows = rows([
	["password", "Server password", "What players type to join. Leave the line out for a server anyone can join. The panel writes it when it makes the server.", SERVER],
	["motd", "Message of the day", "A message shown to players when they join.", SERVER],
	["banlist", "Ban list file", "The file that keeps banned players. Without this line the server uses banlist.txt in the folder it runs from, which is the platform folder.", SERVER],
	["secure", "Extra cheat protection", "Turns on additional cheat protection on the server (the wiki's words: adds additional cheat protection). The wiki's example shows 1 and gives no other value.", SERVER],
	["language", "Server language", "Sets the server's language from its code. The wiki lists the codes offered here.", SERVER],
]);

withChoices(serverRows, {
	secure: { choices: [["1", "On"], ["0", "Off"]], allowCustom: true },
	language: [
		["en-US", "English"],
		["de-DE", "German"],
		["it-IT", "Italian"],
		["fr-FR", "French"],
		["es-ES", "Spanish"],
		["ru-RU", "Russian"],
		["zh-Hans", "Chinese"],
		["pt-BR", "Portuguese"],
		["pl-PL", "Polish"],
	],
});

const networkRows = rows([
	["upnp", "Auto port-forward (UPnP)", "Asks your router to forward the game port by itself when the server starts. The wiki says this does not always work, so forward the port by hand if friends cannot join. The wiki's example shows 1 and gives no other value.", NETWORK],
	["npcstream", "Enemy smoothing", "Reduces enemies skipping for players, at the cost of more data sent. The lower the number, the less skipping and the more data; 0 turns it off. The wiki's example uses 60.", NETWORK],
]);

withChoices(networkRows, { upnp: { choices: [["1", "On"], ["0", "Off"]], allowCustom: true } });

const performanceRows = rows([
	["priority", "Process priority", "How much processor time Windows gives the server compared with other programs: 0 Realtime, 1 High, 2 Above normal, 3 Normal, 4 Below normal, 5 Idle. The wiki's sample file uses 1 (High). The panel does not set it.", PERFORMANCE],
]);

withChoices(performanceRows, {
	priority: [
		["0", "Realtime"],
		["1", "High"],
		["2", "Above normal"],
		["3", "Normal"],
		["4", "Below normal"],
		["5", "Idle"],
	],
});

// Who may use each Journey power: 0 locked for everyone, 1 only the host, 2 anyone (the wiki's Server page).
const PERMISSION = "Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. The wiki gives the values 0 (locked for everyone), 1 (only the host) and 2 (anyone).";
const journeyRows = rows([
	["journeypermission_time_setfrozen", "Freeze time", `Who may freeze the day and night clock. ${PERMISSION}`, JOURNEY],
	["journeypermission_time_setdawn", "Set time to dawn", `Who may jump the time to dawn. ${PERMISSION}`, JOURNEY],
	["journeypermission_time_setnoon", "Set time to noon", `Who may jump the time to noon. ${PERMISSION}`, JOURNEY],
	["journeypermission_time_setdusk", "Set time to dusk", `Who may jump the time to dusk. ${PERMISSION}`, JOURNEY],
	["journeypermission_time_setmidnight", "Set time to midnight", `Who may jump the time to midnight. ${PERMISSION}`, JOURNEY],
	["journeypermission_time_setspeed", "Time speed", `Who may change how fast time passes. ${PERMISSION}`, JOURNEY],
	["journeypermission_godmode", "God mode", `Who may turn on god mode. ${PERMISSION}`, JOURNEY],
	["journeypermission_wind_setstrength", "Wind strength", `Who may set the wind strength. ${PERMISSION}`, JOURNEY],
	["journeypermission_wind_setfrozen", "Freeze wind", `Who may freeze the wind. ${PERMISSION}`, JOURNEY],
	["journeypermission_rain_setstrength", "Rain strength", `Who may set the rain strength. ${PERMISSION}`, JOURNEY],
	["journeypermission_rain_setfrozen", "Freeze rain", `Who may freeze the rain. ${PERMISSION}`, JOURNEY],
]);

withChoices(
	journeyRows,
	Object.fromEntries(Object.keys(journeyRows).map((key) => [key, [["0", "Locked for everyone"], ["1", "Only the host"], ["2", "Anyone"]]])),
);

const inRoot = (list) => Object.fromEntries(Object.entries(list).map(([key, meta]) => [`root::${key}`, meta]));

const settings = {
	...inRoot(worldRows),
	...inRoot(serverRows),
	...inRoot(networkRows),
	...inRoot(performanceRows),
	...inRoot(journeyRows),
};

const launch = {
	title: "Terraria (vanilla)",
	program: /\bTerrariaServer(?:\.exe)?\b/i,
	style: "space",
	editable: true,
	where: "the `TerrariaServer.exe` line of the server's start script",
	intro:
		"The game port and the player limit are given on the command that starts the server, and only there. The world, its name and the password are in serverconfig.txt. Changes apply the next time the server starts.",
	args: [
		A({
			flag: "-config",
			label: "Settings file",
			edit: false,
			managed: true,
			group: "Required",
			example: "serverconfig.txt",
			description: "The text file with the world, the password and the other settings. The Settings tab edits serverconfig.txt in the server's folder. The panel always writes it.",
		}),
		A({
			flag: "-port",
			label: "Game port",
			managed: true,
			group: "Network",
			example: "7790",
			description: "The TCP port players connect to. The game's own default is 7777, which two other servers here use, so this server starts at 7790. Change it from the server's Ports section so the panel can check for clashes.",
		}),
		A({
			flag: "-maxplayers",
			label: "Max players",
			managed: true,
			group: "Server",
			example: "16",
			description: "The most players that can be on the server at once, from 1 to 255. The wiki's default is 16 when this is left out, and more players need more memory.",
		}),
		A({
			flag: "-ip",
			label: "Bind address",
			group: "Network",
			example: "192.168.1.20",
			description: "Makes the server listen only on one IP address of this PC. Only useful on a PC with several network cards or addresses; leave it off to use them all.",
		}),
		FLAG({
			flag: "-noupnp",
			label: "No auto port-forward",
			group: "Network",
			description: "Turns off the automatic port-forwarding attempt (UPnP) when the server starts. Useful if you forward the port by hand.",
		}),
		FLAG({
			flag: "-disableannouncementbox",
			label: "No announcement boxes",
			group: "Advanced",
			description: "Stops the Announcement Box from sending its text messages when wire triggers it.",
		}),
		A({
			flag: "-announcementboxrange",
			label: "Announcement box range",
			group: "Advanced",
			example: "-1",
			description: "How far, in pixels, an Announcement Box's message reaches. -1 sends it to the whole server.",
		}),
	],
};

const guide = {
	name: "Terraria (vanilla)",
	short: "Terraria vanilla",
	summary:
		"This is the plain Terraria dedicated server from terraria.org, a console program (`TerrariaServer.exe`) in the server's platform folder. The world, its name and the password are in `serverconfig.txt`; the game port and the player limit are the **Launch options**. The panel installs it once, when the server is made.",
	files: {
		"serverconfig.txt": "The world to load, how a new one is made (size, name, seed, difficulty), the password and message of the day, and a few network and rule settings. One `key=value` per line; a line starting with `#` is ignored.",
	},
	notes: [
		"**The panel cannot stop the server cleanly.** The world is saved when `exit` is typed into the server's own console window. The panel has no way to type into a console, so Stop asks the window to close and ends the process after 15 seconds, and the world keeps only what the server saved before. The server also saves at dawn, about every 24 minutes, and the wiki warns that items moved between chests can be lost if the window is closed without `exit`. Before you press Stop, update or restart, open the server's window (the panel keeps it minimized on the taskbar), type `exit` and wait for it to close. `exit-nosave` shuts down without saving, so do not use it by mistake.",
		"**XNA Framework.** The Windows server needs Microsoft XNA Framework 4.0, which the Terraria download does not include. When you create the server the panel asks, then fetches Microsoft's XNA Redistributable itself, checks its checksum and Microsoft signature, and unpacks the DLLs next to `TerrariaServer.exe`. Nothing is installed on your PC. If the server's window closes straight away or shows an error about `Microsoft.Xna.Framework`, check that the `Microsoft.Xna.Framework*.dll` files are in the server's folder.",
		"**Port.** The game port is TCP. The wiki says UDP is only needed for cloud hosts. Open the port in Windows Firewall and forward it on your router. There is no query port, so the panel knows the server is running but not how many players are on.",
		"**Settings.** Stop the server before editing `serverconfig.txt`; it is read when the server starts. A line that starts with `#` is ignored. The game port and the player limit are on the launch line, not in this file. The world, its size, name, seed and difficulty only matter when a new world is made.",
		"**Worlds.** The panel keeps worlds in the `Worlds` folder of the server's platform folder, and the world line points there. To use a world made in the game, copy its `.wld` file into that folder and put its full path on the world line.",
		"**Mods.** This is the server without a mod loader. Mods for tModLoader are a different server (the Terraria (tModLoader) entry).",
		"**Updates.** The panel installs Terraria once, when the server is made, and does not update it afterwards. To change the version, make a new server.",
	],
};

export default {
	type: "terraria-vanilla",
	title: "Terraria (vanilla)",
	files: {
		"serverconfig.txt": {
			parser: "properties",
			excludeSections: [],
			sectionLabels: { root: "Server settings" },
			settings,
			groupOrder: [WORLD, CREATION, SERVER, NETWORK, PERFORMANCE, JOURNEY],
			mayBeMissing:
				"The panel writes this file when it makes the server. If it is missing, create serverconfig.txt in the server's platform folder (next to TerrariaServer.exe) and put a line such as world=C:\\path\\to\\World.wld in it, then reload this page.",
		},
	},
	launch,
	guide,
};

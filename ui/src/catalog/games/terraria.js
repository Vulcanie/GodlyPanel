import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Terraria with tModLoader. Two things are edited here:
//   serverconfig.txt  in the server's folder: `key=value` lines, `#` starts a comment line. That is exactly the shape of the panel's
//                     "properties" reader, so the Settings tab edits it. The panel writes a small file of its own (world, autocreate,
//                     worldname, password) in place of the shipped example, which has every line but `priority=1` commented out.
//                     A commented-out line is not seen by the reader, so a setting that is not in the file yet is offered to add.
//                     Sources: the shipped serverconfig.txt of tModLoader's repository, the Terraria wiki's Server page and tModLoader's
//                     Command-Line wiki page (research/terraria/02-config.md).
//   Launch options   the line of Start_Terraria.bat that starts tModLoader. The game port and the player limit are given there and
//                     only there, so `port` and `maxplayers` are left out of the file's catalog (a second copy could disagree).
//
// Left out because the research could not explain them with confidence:
//  - journeypermission_increaseplacementrange, journeypermission_setdifficulty, journeypermission_biomespread_setfrozen and
//    journeypermission_setspawnrate: the wiki gives no description, and the only evidence for what they do is the key name;
//  - worldrollbackstokeep: the game's wiki writes the key as WorldRollbacksToKeep, so the spelling in this file is not known (the launch
//    line argument of the same name is offered instead);
//  - the evil biome of a new world (Corruption or Crimson): no key or argument for it exists in any source;
//  - -pass, -world, -worldname, -autocreate, -seed on the launch line: they are in serverconfig.txt, and the shipped start script splits a
//    value with a space in it (a world or password with a space) into pieces, which a config file does not;
//  - -steam, -lobby and -friendsoffriends: the panel starts the server with -nosteam, so there is no Steam lobby.

// The launch line values are single words: see the notes in the guide.
const SPACES = "No spaces: the start script that tModLoader ships splits a value with a space in it into two.";

const WORLD = "World";
const CREATION = "New world";
const SERVER = "Server";
const NETWORK = "Network";
const PERFORMANCE = "Performance";
const MODS = "Mods";
const JOURNEY = "Journey permissions";

const worldRows = rows([
	["world", "World file", "The full path of the world to load (the .wld file, never the .twld next to it), written without quotes. The panel fills this in with a file named after the world in the server's tmldata\\Worlds folder. If the file does not exist, a new world is made there (see 'Create world if missing').", WORLD],
	["autocreate", "Create world if missing", "If the file named on the world line does not exist, the server makes a new world of this size there. It does nothing for a world that already exists.", CREATION],
	["worldname", "New world name", "The name a newly made world is given. It has no effect on a world that already exists. The game's world-creation menu limits names to 27 characters.", CREATION],
	["seed", "World seed", "Text the new world is generated from: the same seed gives (almost) the same world. Only used when the world is made. The game also has special seed words, such as 5162020 for a world with both Corruption and Crimson; whether the server's seed line recognises them the way the in-game box does was not tested.", CREATION],
	["difficulty", "World difficulty", "The game mode of a newly made world; it cannot be changed afterwards. Journey is a creative-style mode, and only Journey characters can join a Journey world. The shipped example lists only Classic and Expert; Master and Journey are on the Terraria wiki's server page and are expected to work with tModLoader but were not tested. Without this line the game decides, which was not tested either.", CREATION],
]);

withChoices(worldRows, {
	autocreate: [["1", "Small"], ["2", "Medium"], ["3", "Large"]],
	difficulty: [["0", "Classic"], ["1", "Expert"], ["2", "Master"], ["3", "Journey"]],
});

const serverRows = rows([
	["password", "Server password", "What players type to join. Leave the line out for a server anyone can join. The panel writes it when it makes the server.", SERVER],
	["motd", "Message of the day", "A message shown to players when they join.", SERVER],
	["secure", "Extra cheat protection", "Turns on additional server-side checks against cheating (the game's description: 'adds additional cheat protection to the server'). The example file only shows 1, so anything else is expected to mean off.", SERVER],
	["language", "Server language", "The language of the server's own console messages. It does not change what players see.", SERVER],
	["banlist", "Ban list file", "The file that keeps banned players. Without this line the server uses banlist.txt in its folder. The ban and kick commands are typed into the server's console.", SERVER],
]);

withChoices(serverRows, {
	secure: [["1", "On"], ["0", "Off"]],
	language: [["en-US", "English"], ["de-DE", "German"], ["it-IT", "Italian"], ["fr-FR", "French"], ["es-ES", "Spanish"], ["ru-RU", "Russian"], ["zh-Hans", "Chinese"], ["pt-BR", "Portuguese"], ["pl-PL", "Polish"]],
});

const networkRows = rows([
	["upnp", "Auto port-forward (UPnP)", "Asks your router to open the game port by itself when the server starts. The Terraria wiki says it does not always work, so forward the port by hand if friends cannot join. The example file only shows 1, so anything else is expected to mean off.", NETWORK],
	["npcstream", "Enemy smoothing", "Reduces enemies skipping or teleporting for players, at the cost of more network traffic. A lower number is smoother but sends more data; 0 turns it off. The example file uses 60, and tModLoader's own wiki suggests a number around 2 to 6 for a smoother result.", NETWORK],
]);

withChoices(networkRows, { upnp: [["1", "On"], ["0", "Off"]] });

const performanceRows = rows([
	["priority", "Process priority", "How much of the PC's processor time Windows gives the server compared with other programs. The panel does not set it; the game's own example file uses High. A launch argument for the same thing, if you give one, wins.", PERFORMANCE],
]);

withChoices(performanceRows, {
	priority: [["0", "Realtime"], ["1", "High"], ["2", "Above normal"], ["3", "Normal"], ["4", "Below normal"], ["5", "Idle"]],
});

const modRows = rows([
	["modpath", "Mods folder", "The folder tModLoader looks in for .tmod files and for the list of enabled mods (enabled.json). Without this line it is the Mods folder inside the server's tmldata folder, where the panel's backups look; change it only if you keep mods somewhere else on purpose.", MODS],
	["modpack", "Mod pack to load", "Loads only the mods in this named mod pack, instead of the list in enabled.json. Mod packs are made in the tModLoader game and are looked up by name in a ModPacks folder next to the mods folder; the server stops with an error if the pack is missing.", MODS],
]);

// Who may use each Journey power: 0 locked for everyone, 1 only the host, 2 anyone (the Terraria wiki's Server page).
const PERMISSION = "Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. Whether tModLoader honours the Journey permission lines was not tested.";
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

const settings = { ...inRoot(worldRows), ...inRoot(serverRows), ...inRoot(networkRows), ...inRoot(performanceRows), ...inRoot(modRows), ...inRoot(journeyRows) };

const launch = {
	title: "Terraria (tModLoader)",
	// The shipped bash script the line starts, which adds -server and runs tModLoader.dll.
	program: /\bstart-tModLoaderServer\.sh\b/i,
	style: "space",
	editable: true,
	where: "the `busybox64.exe` line of the server's start script",
	intro:
		`The game port and the player limit are given on the command that starts the server, and only there. The world, its name and the password are in serverconfig.txt. The line starts tModLoader's own start script, which cannot take a value with a space in it, so keep every value here to one word. Changes apply the next time the server starts.`,
	args: [
		FLAG({
			flag: "-nosteam",
			label: "No Steam",
			edit: false,
			managed: true,
			group: "Required",
			description: "Tells tModLoader's start script not to use Steam and not to ask about it. Without it the script stops and waits for an answer typed into the console, which the panel cannot give.",
		}),
		A({
			flag: "-config",
			label: "Settings file",
			edit: false,
			managed: true,
			group: "Required",
			example: "serverconfig.txt",
			description: "The text file with the world, password and the other settings. The Settings tab edits serverconfig.txt in the server's folder.",
		}),
		A({
			flag: "-tmlsavedirectory",
			label: "Data folder",
			edit: false,
			managed: true,
			group: "Required",
			example: "tmldata",
			description: "Where worlds, mods and each mod's settings are kept: a Worlds, a Mods and a ModConfigs folder below it. The panel keeps it in the server's own folder, so its backups find them. Changing it hides the existing worlds.",
		}),
		A({
			flag: "-port",
			label: "Game port",
			managed: true,
			group: "Network",
			example: "7878",
			description: "The TCP port players connect to; the game's own default is 7777, which other servers here use. Change it from the server's Ports section so the panel can check for clashes and open the firewall. Two servers on one PC need different ports.",
		}),
		A({
			flag: "-players",
			label: "Max players",
			managed: true,
			group: "Server",
			example: "8",
			description: "The most players that can be on the server at once, from 1 to 255. More players need more memory and a faster PC. (The game also accepts -maxplayers for the same thing.)",
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
			flag: "-secure",
			label: "Extra cheat protection",
			group: "Server",
			description: "Adds additional cheat protection to the server (the game's description of it). The same setting can be turned on in serverconfig.txt.",
		}),
		A({
			flag: "-banlist",
			label: "Ban list file",
			group: "Saves and logs",
			example: "banlist.txt",
			description: `The file that keeps banned players; banlist.txt in the server's folder if left off. ${SPACES}`,
		}),
		A({
			flag: "-worldrollbackstokeep",
			label: "Rolling world backups to keep",
			group: "Saves and logs",
			example: "2",
			description: "How many automatic rolling backup copies of the world the game keeps; tModLoader's own menu starts its servers with 2. Not listed on the Terraria wiki, so whether a value given here is honoured was not tested. The copies are in the Worlds folder's Backups.",
		}),
		A({
			flag: "-language",
			label: "Server language",
			group: "Server",
			example: "en-US",
			options: [["en-US", "English"], ["de-DE", "German"], ["it-IT", "Italian"], ["fr-FR", "French"], ["es-ES", "Spanish"], ["ru-RU", "Russian"], ["zh-Hans", "Chinese"], ["pt-BR", "Portuguese"], ["pl-PL", "Polish"]],
			description: "The language of the server's own console messages. The same setting is a line in serverconfig.txt.",
		}),
		FLAG({
			flag: "-disableannouncementbox",
			label: "No announcement boxes",
			group: "Advanced",
			description: "Stops the Announcement Box block from sending text messages to players when wire triggers it.",
		}),
		A({
			flag: "-announcementboxrange",
			label: "Announcement box range",
			group: "Advanced",
			example: "-1",
			description: "How far, in pixels, an Announcement Box's message reaches. -1 means the whole server.",
		}),
		A({
			flag: "-modpack",
			label: "Mod pack",
			group: "Mods",
			example: "friendsplaythrough",
			description: `Loads only the mods in this named mod pack instead of the list in enabled.json. ${SPACES}`,
		}),
		A({
			flag: "-modpath",
			label: "Mods folder",
			edit: false,
			group: "Mods",
			example: "D:\\Mods",
			description: "The folder tModLoader loads .tmod files from. The panel leaves it at the Mods folder inside the data folder, where its backups look.",
		}),
		A({
			flag: "-steamworkshopfolder",
			label: "Workshop mods folder",
			group: "Mods",
			example: "steamapps/workshop",
			description: "Where Steam Workshop mods downloaded with SteamCMD are read from. The panel adds it when Workshop mods were asked for at creation. Use forward slashes and no spaces.",
		}),
		A({
			flag: "-savedirectory",
			label: "Data folder (adds tModLoader)",
			edit: false,
			group: "Advanced",
			example: "D:\\srv",
			description: "Like the data folder above, but tModLoader is added to the end of the path. The panel uses -tmlsavedirectory instead; leave this off.",
		}),
	],
};

export default {
	type: "terraria",
	title: "Terraria (tModLoader)",
	files: {
		"serverconfig.txt": {
			parser: "properties",
			excludeSections: [],
			sectionLabels: { root: "Server settings" },
			settings,
			groupOrder: [WORLD, CREATION, SERVER, NETWORK, PERFORMANCE, MODS, JOURNEY],
			mayBeMissing: "The panel writes this file when it makes the server. If it is missing, create serverconfig.txt in the server's folder (next to tModLoader.dll) and put a line such as world=C:\\path\\to\\MyWorld.wld in it, then reload this page.",
		},
	},
	launch,
	guide: {
		name: "Terraria (tModLoader)",
		short: "Terraria",
		summary:
			"This is Terraria running on tModLoader, the mod loader, which is the only Terraria server the panel can install without a Steam account. It is a .NET program (`tModLoader.dll`, with its .NET runtime in the `dotnet` folder) in the server's install folder. The world, its name and the password are in `serverconfig.txt`; the game port and the player limit are the **Launch options**. Players need tModLoader (free on Steam), not plain Terraria.",
		files: {
			"serverconfig.txt": "The world to load, how a new one is made (size, name, seed, difficulty), the password and message of the day, and a few network and mod settings. One `key=value` per line; a line starting with `#` is ignored.",
		},
		notes: [
			"**The panel cannot stop the server cleanly.** The world is saved when `exit` is typed into the server's own console window; the Terraria wiki says the server saves on shutdown only with that command. The panel has no way to type into a console, so Stop asks the window to close and ends the process after 15 seconds, and the world keeps only what the server saved before (it also saves from time to time, how often is not documented). Before you press Stop, update or restart, open the server's window, which the panel keeps minimized on the taskbar rather than hidden, type `exit` and wait for it to close. `exit-nosave` throws the changes away.",
			"**Only tModLoader players can join, and they need the same mods.** Plain Terraria cannot join, even with no mods on the server, and a tModLoader player cannot join a plain Terraria server. The player's tModLoader version has to match too (the first three numbers of its version). The game offers to download any missing mods when a player joins.",
			"**The first start takes a few minutes.** The panel installs tModLoader from its GitHub release, which does not include the .NET runtime; the first time the server starts, tModLoader's own script downloads it into the `dotnet` folder, so the PC needs internet. The server shows as stopped until it has finished. Windows may ask to allow `dotnet.exe` through the firewall: allow it. If a first start fails half way, start it again; if it keeps failing, stop the server, delete the `dotnet` folder and start again.",
			"**Port.** The game port is TCP (7878 here, because 7777 is the default of Valheim and Satisfactory, which the panel also hosts); players type it after your address. Open it in Windows Firewall and forward it on your router. There is no query port, so the panel can tell that the server is running but not how many players are on.",
			"**Settings.** Stop the server before editing `serverconfig.txt`; it is read when the server starts. A line that starts with `#` is ignored, which is how the game's example file switches settings off. The game port and the player limit are on the launch line, not in this file. The world, size, name, seed and difficulty only matter when a new world is made. There is no setting for Corruption or Crimson; to choose, make the world in the game and copy its `.wld` and `.twld` files into `tmldata\\Worlds`, then put the `.wld` path on the `world=` line.",
			"**Values with a space on the launch line break.** The start script that tModLoader ships joins its arguments into one string and splits it on spaces again, so a launch option such as a folder with a space in it falls apart. Keep launch values to one word; the world's name, path and the password are in `serverconfig.txt`, where spaces are fine.",
			"**Mods** are Steam Workshop items of tModLoader. Mods you list when creating the server are downloaded once with SteamCMD into `steamapps\\workshop`, and their internal names are written to `tmldata\\Mods\\enabled.json`, which is what decides which mods load. Steam does not download the mods a mod needs, so look at the 'Required items' on its Workshop page and list those too. A `.tmod` file copied into `tmldata\\Mods` by hand also needs its internal name added to `enabled.json`. Each mod's own settings are files in `tmldata\\ModConfigs`. The panel does not download or update mods later: a monthly tModLoader release can break mods, so back up before changing either. Removing a mod from an existing world may lose what it added; no source says that is safe.",
			"**Updates.** The panel installs the newest tModLoader once, when the server is created, and does not update it afterwards. To update, make a new server with the same world files, or replace the files from a newer `tModLoader.zip` by hand while the server is stopped (keep `serverconfig.txt`, `tmldata`, `steamapps` and `dotnet`).",
			"If a mod stops the server from starting or kicks players, read the log: the Logs tab shows `server.log` in the `tModLoader-Logs` folder. Remove the newest mod from `enabled.json` to recover.",
		],
	},
};

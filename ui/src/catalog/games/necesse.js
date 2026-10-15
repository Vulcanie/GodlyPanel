import { A, FLAG } from "../launchHelpers.js";

// Necesse. The server keeps its options in cfg\server.cfg (with -localdir, next to Server.jar), but the panel neither writes nor edits it:
//  - server.cfg is a Lua-like block, `SERVER = { port = 14159, // comment ... }`, with a comma after every entry but the last, `//`
//    comments, quoted or bare words and a possibly empty `MOTD =`. The panel's "properties" reader (key=value lines) and its convar reader
//    do not read that shape, so the file would be shown wrongly or written back damaged.
//  - the server fills it with its own defaults and writes it again when it stops. A launch argument wins over it ("parameters not given
//    will be loaded from server settings file"), so the settings that matter most are given as launch arguments, which the Settings tab edits.
//  - worldSettings.cfg (difficulty, death penalty, raids, hunger, ...) is INSIDE each world's save, a .zip. It is not touched: it would
//    have to be unzipped, edited and zipped again with the server stopped. The same settings can be changed in the running game with
//    the admin commands /difficulty, /deathpenalty and /raids (and /settings).
// So the Settings tab offers the launch line only.
//
// The arguments are the ones the Necesse Wiki lists (necessewiki.com/Multiplayer, taken by the wiki from DesktopServerWrapper in
// Necesse.jar) plus -mod from its Modding page. Left out because the research could not explain them with confidence:
//  - -giveclientspower: the server's help says "if the server should check client actions, a kind of anti-cheat ... Defaults off" while
//    server.cfg calls the same setting "clients will have much more power over what hits them", and the Docker image defaults it to 1;
//  - -zipsaves: server.cfg's comment says "true will create new saves uncompressed", the wiki says 1 compresses (default 1);
//  - -language: only "used for occasional messages in the log"; which values it accepts was not found;
//  - -help: prints the list and exits, which is no use in a start script.

const launch = {
	title: "Necesse",
	program: /\bServer\.jar\b/i,
	style: "space",
	editable: true,
	where: "the `java.exe` line of the server's start script",
	intro:
		"Necesse's world, port, player limit and password are given on the command that starts it, and they win over the same settings in `cfg\\server.cfg`. That file is written by the server itself and is not offered here. The world's rules (difficulty, death penalty, raids) are in the world's save and are changed in the game with the admin commands. Changes apply the next time the server starts.",
	args: [
		FLAG({
			flag: "-nogui",
			label: "Text console",
			edit: false,
			managed: true,
			group: "Required",
			description: "Runs the server as a text console instead of opening the server's own graphical window. A server run from a start script needs this.",
		}),
		FLAG({
			flag: "-localdir",
			label: "Keep data in the server's folder",
			edit: false,
			managed: true,
			group: "Required",
			description: "Keeps the server's settings, saves and logs in the server's own folder instead of the Windows user's AppData\\Roaming\\Necesse, so each server on this PC has its own. The panel's backups and Logs tab read them there, so leave it on.",
		}),
		A({
			flag: "-mod",
			label: "Mods folder",
			edit: false,
			managed: true,
			group: "Required",
			example: ".\\mods",
			description: "The folder the server loads mod .jar files from. The panel makes a mods folder in the server's folder; copy mods into it while the server is stopped. Players need the same mods.",
		}),
		A({
			flag: "-world",
			label: "World name",
			managed: true,
			group: "Server",
			example: '"MyWorld"',
			description: "Which saved world to load. If there is none with that name, a new one is made. A new name starts a new world and keeps the old one. Without this argument the server stops at start and asks questions in its console.",
		}),
		A({
			flag: "-slots",
			label: "Player slots",
			group: "Server",
			example: "10",
			description: "The most players that can be on the server at once, from 1 to 250. More players need more memory and a faster PC.",
		}),
		A({
			flag: "-password",
			label: "Server password",
			group: "Server",
			example: '"secret"',
			description: "What players type to join. Take the argument off the line for a server anyone can join. The owner can also change it in the game with /password.",
		}),
		A({
			flag: "-owner",
			label: "Owner player name",
			group: "Server",
			example: "Alex",
			description: "Anyone who joins using exactly this player name gets the owner's full rights (admin commands, giving others permissions with /permissions). It is a player name, not an account, so anyone who types it can claim it: set a password.",
		}),
		A({
			flag: "-motd",
			label: "Message of the day",
			group: "Server",
			example: '"Welcome!"',
			description: "The message shown to players when they join. Write \\n for a new line. An admin can change it in the game with /motd.",
		}),
		A({
			flag: "-port",
			label: "Game port",
			managed: true,
			group: "Network",
			example: "14159",
			description: "The UDP port players connect to; 14159 is the game's own default. Change it from the server's Ports section so the panel can check for clashes and open the firewall. Two servers on one PC need different ports.",
		}),
		A({
			flag: "-ip",
			label: "Bind address",
			group: "Network",
			example: "192.168.1.20",
			description: "Makes the server listen only on one IP address of this PC. Only useful on a PC with several network cards or addresses; leave it off to use them all.",
		}),
		A({
			flag: "-pausewhenempty",
			label: "Pause when empty",
			group: "Performance",
			example: "1",
			options: [["1", "Pause the world while nobody is online"], ["0", "Keep the world running"]],
			description: "When on, the world stands still while nobody is online, so crops, settlers and timers do not run with no one there. Not on the line by default: the server then uses the value in its server.cfg (the game's own default file has it on).",
		}),
		A({
			flag: "-logging",
			label: "Write log files",
			group: "Saves and logs",
			example: "1",
			options: [["1", "Write a log file for each start"], ["0", "Do not write log files"]],
			description: "Whether the server writes a log file each time it starts. On by default. The Logs tab reads the logs folder, so it shows nothing with this off.",
		}),
		A({
			flag: "-logs",
			label: "Log folder",
			edit: false,
			group: "Saves and logs",
			example: "C:\\necesse\\logs",
			description: "Moves the log files to another folder. The Logs tab reads the logs folder in the server's folder, so it would then show nothing.",
		}),
		A({
			flag: "-datadir",
			label: "Data folder",
			edit: false,
			group: "Saves and logs",
			example: ".\\data",
			description: "Sets the folder where the server keeps its cache, logs and saves. The panel uses -localdir instead, so its backups and Logs tab find them; leave this off.",
		}),
		A({
			flag: "-settings",
			label: "Settings file",
			edit: false,
			group: "Saves and logs",
			example: "C:\\necesse\\server.cfg",
			description: "A different file to read the server's settings from, instead of cfg\\server.cfg. Anything given on the launch line still wins over it.",
		}),
		FLAG({
			flag: "-ignoreseasons",
			label: "No seasonal content",
			group: "Advanced",
			description: "Turns off seasonal content, such as the Christmas Present and Christmas Hat.",
		}),
	],
};

export default {
	type: "necesse",
	title: "Necesse",
	// No settings file in the form: see the top of this file.
	files: {},
	launch,
	guide: {
		name: "Necesse",
		short: "Necesse",
		summary:
			"Necesse's server is a Java program (`Server.jar`, with its own Java in the `jre` folder) in the server's install folder. Its world, port, player limit and password are given on the command that starts it, and those are the **Launch options** on the Settings tab. The server's other options are in `cfg\\server.cfg`, which it writes itself.",
		files: {},
		notes: [
			"**The panel cannot stop the server cleanly.** The server saves the world when `quit` is typed into its own console window, and it does not save when it is simply closed or ended. The panel has no way to type into a console, so Stop asks the process to close and ends it after 15 seconds. Before you press Stop (or update, or restart), open the server's window, which the panel keeps minimized on the taskbar rather than hidden, type `quit` and wait for the window to close.",
			"**The panel does not write or edit `cfg\\server.cfg`.** It is a block of `key = value,` lines with `//` comments that the panel's file readers cannot handle, and the server writes it again when it stops. Open it in a text editor with the server stopped. Settings given on the launch line (port, slots, password, ...) win over the file. Other keys in it include `maxClientLatencySeconds` (how long a laggy player is tolerated), `worldBorderSize` (-1 for none), `droppedItemsLifeMinutes` (0 for forever) and `MOTD`.",
			"**The world's rules are not in a file you can edit while it runs.** Difficulty, death penalty, raid frequency, hunger and the like are stored in `worldSettings.cfg` inside the world's `.zip` in the `saves` folder, which the panel does not touch. Change them in the game as the owner or an admin with the `/difficulty`, `/deathpenalty` and `/raids` commands (and `/settings`), or unzip the save with the server stopped, edit the file and zip it again under its exact original name.",
			"**Nobody is an admin until you add `-owner <your player name>`** in the Launch options. Anyone who joins with exactly that name gets the owner's full rights, so keep a password on the server. Other players can be given rights in the game with `/permissions`.",
			"There is no query port, so the panel can tell that the server is running but not how many players are on. Players join by direct IP and the game port (UDP 14159 by default) from the game's Multiplayer menu. Open that port in Windows Firewall and on your router.",
			"**Mods** are plain `.jar` files. Copy them into the `mods` folder in the server's install folder while the server is stopped (the launch line points at it with `-mod .\\mods`). The server does not download Steam Workshop mods itself: subscribe in your own Steam client and copy the jars from `steamapps\\workshop\\content\\1169040\\<item id>`. Players need the same mods, and a mod built for another game version can stop the server from starting; delete the newest jar to recover. Back up the saves before adding or removing mods.",
		],
	},
};

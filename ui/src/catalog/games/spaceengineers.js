import { A, FLAG } from "../launchHelpers.js";

// Space Engineers. Sources: Keen's dedicated server page, the community-run Space Engineers wiki ("Setting up a Space Engineers
// Dedicated Server", Command Line Tool section) and Keen's published source (2022), as collected in research/spaceengineers.
//
// No settings file is offered. The server keeps its options in SpaceEngineers-Dedicated.cfg and, for each world, in Sandbox_config.sbc.
// Both are XML whose settings are plain child elements (<MaxPlayers>8</MaxPlayers>), not the <property name= value=> shape the
// panel's XML reader handles, and the panel has no reader for them. So the Settings tab shows the launch arguments only.
//
// Left out of the arguments: -selectInstance, -checkAlive and -start (on the wiki with no description, and not in Keen's source),
// and -report (the game's own crash-report helper).

const launch = {
	title: "Space Engineers",
	program: /\bSpaceEngineersDedicated(?:\.exe)?"?/i,
	style: "space",
	editable: true,
	where: "the `SpaceEngineersDedicated.exe` line of the server's start script",
	intro: "Space Engineers' dedicated server takes its game port, player limit and data folder from the command that starts it. Its other options (name, Steam port, admins, password, world rules, mods) are in the server's own config file and worlds, which the panel does not edit. Changes apply the next time the server starts.",
	args: [
		FLAG({ flag: "-console", label: "Console mode", edit: false, managed: true, group: "Required", description: "Starts the server straight away in a console window. Without this (or -noconsole) the game opens its setup window and waits for someone to press Start, so a panel-run server would never come up. The console window is also what the panel closes to stop the server." }),
		A({ flag: "-path", label: "Data folder", edit: false, managed: true, group: "Required", example: '"D:\\Servers\\space\\Data"', description: "The folder the server keeps its config file (SpaceEngineers-Dedicated.cfg), worlds, mods and logs in. It has to exist: the game quits at once, without a message, when it does not. The panel's backups and Logs tab look in the Data folder of the server, so leave it as it is." }),
		A({ flag: "-port", label: "Game port", group: "Network", managed: true, example: "27116", description: "The UDP port players connect to. It replaces the port in the config file. Change it from the server's Ports section so the panel can check for clashes and open the firewall. Two servers on one PC need different ports." }),
		A({ flag: "-maxPlayers", label: "Max players", group: "Server", example: "8", description: "The most players that can be on the server at once. It replaces the limit stored in the world's settings. A whole number, written with a capital P." }),
		A({ flag: "-ip", label: "Listen address", group: "Network", example: "192.168.1.20", description: "Makes the server use one specific IP address of this PC, instead of the one in the config file (0.0.0.0, which is all of them). Only useful on a PC with several network cards or addresses. A value that is not an IP address is ignored." }),
		FLAG({ flag: "-ignorelastsession", label: "Ignore the last session", group: "Saves and logs", description: "By default the server starts the world it ran last. With this, it uses the world named in the config file (LoadWorld) instead. The panel's config file names none, so turning this on without setting LoadWorld may make the server start a new world instead of continuing yours." }),
		A({ flag: "-session:", key: "session", kind: "attached", edit: false, label: "Load this world", group: "Saves and logs", example: "-session:D:\\Servers\\space\\Data\\Saves\\MyWorld", description: "Starts the world in the given folder instead of the last one. Only the wiki documents it (Keen's source has no such argument), so how it treats quotes and spaces is not known. Set LoadWorld in the config file instead." }),
		FLAG({ flag: "-noconsole", label: "No console window", edit: false, group: "Advanced", description: "Used instead of -console, to run without the console window. Not offered: the panel then has no window to ask to close, so a Stop may end the server without saving the world. The line needs one of -console and -noconsole, never both." }),
		A({ flag: "-plugin", label: "Plugin file", edit: false, group: "Advanced", example: "C:\\plugins\\Example.dll", description: "Loads a plugin (.dll) into the server. Keen does not support plugins and any plugin has full access to this PC, so only use one you trust. The wiki adds that game clients then need a password; what that means is not explained. The line may hold several." }),
		FLAG({ flag: "-eos", label: "Epic Online Services network", edit: false, group: "Network", description: "Makes the server use Epic's online network layer instead of Steam's. The wiki lists it with no further explanation, so what it does for a normal Steam server is not known." }),
		A({ flag: "-np", label: "Epic network parameter", edit: false, group: "Network", example: "globalMaxUpload:1000", description: "Sets one network setting of the Epic layer, written as name:value, and repeated for each. The wiki names globalMaxUpload and peerMaxUpload (600 by default), and statWindow and peakStatWindow (60 seconds). It only matters with -eos." }),
	],
};

export default {
	type: "spaceengineers",
	title: "Space Engineers",
	// No settings file: see the top of this file.
	files: {},
	launch,
	guide: {
		name: "Space Engineers",
		short: "Space Engineers",
		summary: "Space Engineers' dedicated server keeps its options in `SpaceEngineers-Dedicated.cfg` and in each world's `Sandbox_config.sbc`, inside the `Data` folder in the server's install folder. The panel starts the server with `-console -path` and the game port; those, the player limit and a few more are the **Launch options** on the Settings tab.",
		files: {},
		notes: [
			"**The panel does not write the config file or a world.** It makes the empty `Data` folder only. Put a `SpaceEngineers-Dedicated.cfg` in it and your world in `Data\\Saves\\<world name>` (each world folder holds a `Sandbox.sbc` and a `Sandbox_config.sbc`; a world made on your own PC is in `%AppData%\\SpaceEngineers\\Saves\\<your Steam ID>`). In the config, `LoadWorld` has to be the world folder's full path, with the drive letter. The game's own setup window can make the config file: start `DedicatedServer64\\SpaceEngineersDedicated.exe` by hand without `-console` (the window writes the file into the data folder it uses, which is `%AppData%\\SpaceEngineersDedicated` unless `-path` is given), then copy the file into `Data`. How that works on a SteamCMD install has not been checked.",
			"The server's name, its Steam port, the admin, ban and reserved-slot lists and the join password are settings of that config file, and the world's rules (game mode, multipliers, oxygen, trash removal, mods) are in the world's `Sandbox_config.sbc`. Both are XML in a form the Settings tab cannot edit, so open them in a text editor, with the server stopped: the game rewrites them when it shuts down. The join password is stored as a hash with a salt, made by the game's setup window; it cannot be typed in.",
			"The game's port is given on the launch line, and replaces `ServerPort` in the config. The Steam port (`SteamPort`, 8766 by default) is only in the config. Sons of the Forest uses 8766 too, so give one of them a different Steam port if both run on one PC.",
			"Mods are Steam Workshop items listed in the world's `Sandbox_config.sbc` (and, in older guides, in the config file). The server downloads them when it starts and players get them when they join. Take a backup before removing a mod that added blocks: grids built with them can be damaged.",
			"**Stopping.** The game saves the world when its console window is closed or the process is asked to close; forcing it to end does not save. The panel closes the window first and ends the process after a short wait, so check on your own server that a Stop keeps your latest changes.",
			"This is the plain game server from Keen. The Torch wrapper (a separate community program with plugins, which runs the game inside its own `Torch.Server.exe`) is not supported by the panel.",
		],
	},
};

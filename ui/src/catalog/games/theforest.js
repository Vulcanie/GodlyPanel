import { A, FLAG } from "../launchHelpers.js";

// The Forest. Two places hold the server's settings:
//   config.cfg    TheForestDedicatedServer_Data\forest\config\ in the server's folder. The panel writes it when the server is created. It is
//                 `key value` lines with spaces (serverName My Server). The panel has no parser for that format, so it is not shown here:
//                 edit it by hand with the server stopped. Its location is not settled between sources; see the notes.
//   launch line   the start command: the save folder, the config file's path, the admin password and the first-start setting. The form
//                 below shows the ones that can be changed.
// Names, defaults and flags come from the Pterodactyl egg, Game Server Kings' guide and the dossier's notes (research/theforest). Nothing was
// run on a real install.

const TRUE_FALSE = [["true", "Yes"], ["false", "No"]];

// Launch line: the program, then `-name value` or `-name` arguments, in the order the egg writes them.
const launch = {
	title: "The Forest",
	program: /\bTheForestDedicatedServer\.exe/i,
	style: "space",
	editable: true,
	where: "the `TheForestDedicatedServer.exe` line of the server's start script",
	intro:
		"The arguments that start The Forest's server. The panel writes them when the server is created, and the first two are the ones the game needs to find its files. Changes apply the next time the server starts.",
	args: [
		FLAG({ flag: "-batchmode", label: "Batch mode", group: "Required", edit: false, managed: true, description: "Runs the server without a game window, as the egg does. The panel always writes it." }),
		FLAG({ flag: "-nographics", label: "No graphics", group: "Required", edit: false, managed: true, description: "Starts the server without drawing graphics, which a server does not need. The panel always writes it." }),
		FLAG({ flag: "-nosteamclient", label: "No Steam client", group: "Required", edit: false, managed: true, description: "Runs the server without the Steam client, as the egg does. The panel always writes it." }),
		A({ flag: "-serverPasswordAdmin", label: "Admin password", group: "Required", edit: false, managed: true, example: "(your password)", description: "The password that unlocks the in-game admin commands. Set when the server is created; it is not shown here so it stays out of view." }),
		A({
			flag: "-inittype",
			label: "Start type",
			group: "Save",
			example: "New",
			options: [["New", "New (start a new world)"], ["Continue", "Continue (load the saved world)"]],
			description: "New starts a new world. Continue loads the one already saved in the save folder. The dossier gives the two values only; what a New start does to an existing save is not known.",
		}),
		A({ flag: "-savefolderpath", label: "Save folder", group: "Folders", edit: false, managed: true, example: "TheForestDedicatedServer_Data", description: "The folder the saves are kept in, counted from the server's folder. The panel writes the same folder it backs up." }),
		A({ flag: "-configfilepath", label: "Config file", group: "Folders", edit: false, managed: true, example: "TheForestDedicatedServer_Data\\forest\\config\\config.cfg", description: "The config file the server reads, counted from the server's folder. The panel writes config.cfg at this path. Whether the game reads this path is not verified." }),
	],
};

const guide = {
	name: "The Forest",
	short: "The Forest",
	summary:
		"The Forest's server runs from `TheForestDedicatedServer.exe` in the server's folder. Its name, password and ports are in `config.cfg`, which the panel writes when the server is created and which you edit by hand. The admin password and the start type are on the start command (the **Launch options** on the Settings tab).",
	files: {
		"config.cfg": "The server's name, password, ports, player limit, save interval, difficulty and the game's rules, as `key value` lines. The panel writes it at creation; the Settings tab does not read it, so edit it by hand with the server stopped.",
	},
	notes: [
		"**The panel cannot stop the server cleanly.** The game stops with ^C in its own console window. The panel has no way to type into a console, so Stop closes the window and ends the process after 15 seconds. Before you press Stop (or update), open the server's window, which the panel keeps minimized on the taskbar rather than hidden, press Ctrl+C, and wait for it to close.",
		"**Where config.cfg is read is not settled.** Sources name `TheForestDedicatedServer_Data\\forest\\config\\config.cfg` (the egg and Game Server Kings), a `Server.cfg` under AppData\\LocalLow, and a `config.cfg` in the server's root. The panel writes the first and passes the same path on the start command. Check on the first start that the server takes it.",
		"**The config format is `key value` lines with spaces**, for example `serverName My Server`. Write a value without a line break and without two slashes in a row.",
		"**Ports.** The game port (27455 by default) is used for UDP and TCP, the query port (27457) is the one players connect through, and the Steam port (8770) is for the server browser. The panel's firewall check opens UDP only, so allow the TCP ports in Windows Firewall yourself. Change a port in the Ports section and also in config.cfg, because the file is not rewritten from the Ports section.",
		"**The admin password is on the start command.** Without it nobody has the admin commands. It is not shown in the Settings tab.",
		"**Mods are not managed.** The community ModAPI launcher is a client-side tool; the dossier finds no server-side mod path or switch.",
	],
};

export default {
	type: "theforest",
	title: "The Forest",
	// No settings file has a parser here: config.cfg is `key value` lines with spaces, which the panel does not read.
	files: {},
	launch,
	guide,
};

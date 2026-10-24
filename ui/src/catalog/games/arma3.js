import { A, FLAG } from "../launchHelpers.js";

// Arma 3 (dossier: docs/research/games/arma3/, confidence medium). The server's settings file, server.cfg, is written by the panel
// when it creates the server, but its format (SQF-style "key = value;" lines with arrays and classes) has no editor here, so the
// Settings tab offers only the launch arguments. The arguments are the wiki's, from its Startup Parameters page (2025 snapshot).

const GROUP_SERVER = "Server";
const GROUP_FILES = "Files";
const GROUP_MODS = "Mods";
const GROUP_WORLD = "World";
const GROUP_LOGS = "Logs and startup";

export default {
	type: "arma3",
	title: "Arma 3",
	// No settings file: see the note above.
	files: {},
	launch: {
		title: "Arma 3",
		program: /\barma3server(?:_x64)?(?:\.exe)?\b/i,
		style: "equals",
		editable: true,
		where: "the `arma3server.exe` line of the server's start script",
		intro:
			"Arma 3's server takes its settings from server.cfg and from these arguments on the command that starts it. The panel sets the port, the config file and the profile folder itself, so those are shown but not offered. Changes apply the next time the server starts.",
		args: [
			A({ flag: "-port", label: "Game port", group: GROUP_SERVER, managed: true, edit: false, example: "2302", description: "The UDP port players connect to. The panel sets it from the server's Ports section; the four ports above it are the game's own." }),
			A({ flag: "-config", label: "Settings file", group: GROUP_FILES, managed: true, edit: false, example: "server.cfg", description: "The file with the server's name, passwords and rules. The panel writes server.cfg here when it creates the server." }),
			A({ flag: "-profiles", label: "Profile folder", group: GROUP_FILES, managed: true, edit: false, example: "profiles", description: "The folder for the server's own profile and player files. The panel puts it inside the server's folder, so two servers on one PC do not share it." }),
			A({ flag: "-world", label: "Starting world", group: GROUP_WORLD, example: "empty", description: "The world loaded when the server starts. empty loads none, the same as the wiki's example; a world name such as Utes loads that one." }),
			A({ flag: "-mod", label: "Mods players need", group: GROUP_MODS, example: "@mymod;@othermod", description: "Mod folders in the server's folder that players also run, separated by semicolons. Every player has to run the same mods. The wiki says Workshop mods need a Steam account that owns Arma 3." }),
			A({ flag: "-serverMod", label: "Server-only mods", group: GROUP_MODS, example: "@myservermod", description: "Mod folders that only the server runs; they are not sent to players. Written this way as on the wiki's page (a guide writes it -servermod)." }),
			FLAG({ flag: "-noSplash", label: "Skip splash screens", group: GROUP_LOGS, description: "Skips the splash screens when the server starts. The wiki says the time saved is small." }),
			FLAG({ flag: "-noLogs", label: "Leave out error details", group: GROUP_LOGS, description: "Errors are not written to the report file (arma3.rpt). Crash details are still saved. Leave it off so the report can help when something goes wrong." }),
		],
	},
	guide: {
		name: "Arma 3",
		short: "Arma 3",
		summary:
			"Arma 3's server reads server.cfg, which the panel writes when it creates the server (the server's name, the join and admin passwords, and the wiki's security settings). The Settings tab offers the launch arguments, because server.cfg's format has no editor here yet.",
		files: {
			"server.cfg": "The server's name, passwords and rules. The panel writes it when it creates the server. Stop the server before you edit it by hand.",
		},
		notes: [
			"Not checked on a real install. Before relying on this server, run it once and check the items in the server's implementation notes.",
			"Install: the server app may not download without a Steam account that owns Arma 3. If the install says 'No subscription', this server cannot be made from the panel.",
			"Admin password: the wiki says it must be set. Use it in the game with #login followed by the password.",
			"Port: the game uses the port the panel shows, and also the four ports above it (Steam query, Steam master, VON, BattlEye). Keep them open in your firewall.",
			"Stop: the wiki documents a clean stop only on Linux. On Windows the panel closes the server's window and, after 15 seconds, ends it, so the last few minutes may not be saved.",
			"Mods: add them with the mod launch arguments, and copy the mod folders into the server's folder yourself. Workshop downloads need a Steam account that owns Arma 3.",
		],
	},
};

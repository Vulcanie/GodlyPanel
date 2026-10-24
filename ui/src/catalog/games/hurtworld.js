import { A, FLAG } from "../launchHelpers.js";

// Hurtworld (dossier: docs/research/games/hurtworld/, confidence low). The settings the panel uses are on the start script's launch
// line, which the panel writes itself: the ports and the server name go in the -exec string, and -logfile names the log. The game's
// own settings (autoexec.cfg) have no known folder and no parser here, so there is no settings file in this form.

const launch = {
	title: "Hurtworld",
	program: /Hurtworld\.exe/i,
	style: "space",
	editable: false,
	where: "the `Hurtworld.exe` line of the server's start script",
	intro:
		"The panel starts the server headless and passes the ports and the server name in one -exec string. Every flag here is written by the panel, so none can be changed from this form.",
	args: [
		FLAG({
			flag: "-batchmode",
			label: "Run without a window",
			group: "Required",
			edit: false,
			managed: true,
			description: "Starts the game in batch mode, with no interactive window. The panel always writes it.",
		}),
		FLAG({
			flag: "-nographics",
			label: "No graphics",
			group: "Required",
			edit: false,
			managed: true,
			description: "Tells the game not to start a graphics device, which a server does not have. The panel always writes it.",
		}),
		A({
			flag: "-exec",
			label: "Startup commands",
			group: "Server",
			edit: false,
			managed: true,
			example: '"host 12871;queryport 12881;servername My Server"',
			description:
				"A quoted list of commands separated by semicolons. The panel writes the game port (host), the query port and the server name from the Ports and Server Name fields.",
		}),
		A({
			flag: "-logfile",
			label: "Log file",
			group: "Logs",
			edit: false,
			managed: true,
			example: '"gamelog.txt"',
			description: "The file the server writes its log to, in the server's folder. The panel reads it for the Logs tab.",
		}),
	],
};

const guide = {
	name: "Hurtworld",
	short: "Hurtworld",
	summary:
		"Hurtworld's server is Hurtworld.exe, started by the panel's start script headless. The panel passes the game port, the query port and the server name in a -exec string, so there is no settings file to edit here.",
	files: {},
	notes: [
		"The game port and the query port are both listed as UDP by one source and as UDP and TCP by another. Keep both free and forward them if players are outside your network.",
		"The server's settings beyond the name and the ports are set through commands in its autoexec.cfg. The panel does not write that file, because its folder and whether the game creates it are not known yet.",
		"Admins are added with the game's addadmin command, which needs a 64-bit Steam ID. This panel does not ask for one, so set admins by hand once the game's settings file is known.",
		"The panel's Stop closes the server window. The game's own clean stop is the console command `quit` (sent over RCON, which this panel does not set up), so back up the world before you stop, update or copy the server.",
		"Where the world is saved is not known yet, so the panel's backup keeps nothing. Copy the save folder by hand before you update the server.",
		"Mods are loaded with loadmod lines in autoexec.cfg, or as Oxide plugins. This panel does not manage either.",
	],
};

export default {
	type: "hurtworld",
	title: "Hurtworld",
	files: {},
	launch,
	guide,
};

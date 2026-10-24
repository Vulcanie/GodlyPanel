import { A } from "../launchHelpers.js";

// American Truck Simulator (dossier: docs/research/games/ats/, confidence medium). The panel writes the server's settings file
// (server_config.sii) and its start line. The file is SiiNunit, which no settings parser here reads, so the Settings tab has no form for
// it; the one flag on the start line is the only launch argument the panel lists.

const launch = {
	title: "American Truck Simulator",
	program: /amtrucks_server\.exe/i,
	style: "space",
	editable: false,
	where: "the `amtrucks_server.exe` line of the server's start script",
	intro:
		"The panel starts the server with one flag: the folder that holds its settings, package files and log. Nothing else on that line is set from here, so it cannot be changed in this form.",
	args: [
		A({
			flag: "-homedir",
			label: "Server home folder",
			group: "Files",
			edit: false,
			managed: true,
			example: '"C:\\Servers\\ats\\data"',
			description:
				"The folder the server keeps its server_config.sii, its package files and its log in. The panel sets it to the data folder inside the server's folder.",
		}),
	],
};

const guide = {
	name: "American Truck Simulator",
	short: "American Truck Simulator",
	summary:
		"American Truck Simulator's server is amtrucks_server.exe, started by the panel's start script. The panel writes the server's settings file (server_config.sii) with the name and the two ports, so there is no settings form in this panel.",
	files: {},
	notes: [
		"Before the first start, copy server_packages.sii and server_packages.dat into the server's data folder. The server does not start without them. The game makes them: open a copy of the game with a map loaded, open the console, and run export_server_packages. The panel cannot make them.",
		"The settings are in data\\American Truck Simulator\\server_config.sii inside the server's folder. The panel writes the name, the two ports and the player limit. To change the rest, stop the server first, then edit the file by hand. The defaults are not confirmed by an official page.",
		"The panel's Stop closes the server window and, after 15 seconds, ends the program. The dossier names Ctrl + C as the only way to stop the server, so there is no clean save. Back up the data folder before you stop or update.",
		"Public listing: a persistent logon token is needed to be listed by the Steam server browser. This panel does not ask for a token, so the server uses an anonymous ID. Direct search still works.",
		"Moderators are added in server_config.sii by Steam ID, which this panel does not ask for.",
		"Mods are not read from mod folders. Exported package files carry them. This panel does not manage those files.",
	],
};

export default {
	type: "ats",
	title: "American Truck Simulator",
	files: {},
	launch,
	guide,
};

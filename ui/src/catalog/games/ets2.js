import { A } from "../launchHelpers.js";

// Euro Truck Simulator 2 (dossier: docs/research/games/ets2/, confidence medium). The panel writes the server's settings file
// (server_config.sii) and its start line. The file is SiiNunit, which no settings parser here reads, so the Settings tab has no form for
// it; the one flag on the start line is the only launch argument the panel lists. The program name was checked on a real install.

const launch = {
	title: "Euro Truck Simulator 2",
	program: /eurotrucks2_server\.exe/i,
	style: "space",
	editable: false,
	where: "the `eurotrucks2_server.exe` line of the server's start script",
	intro:
		"The panel starts the server with one flag: the folder that holds its settings, package files and log. Nothing else on that line is set from here, so it cannot be changed in this form.",
	args: [
		A({
			flag: "-homedir",
			label: "Server home folder",
			group: "Files",
			edit: false,
			managed: true,
			example: '"C:\\Servers\\ets2\\data"',
			description:
				"The folder the server keeps its server_config.sii, its package files and its log in. The panel sets it to the data folder inside the server's folder.",
		}),
	],
};

const guide = {
	name: "Euro Truck Simulator 2",
	short: "Euro Truck Simulator 2",
	summary:
		"Euro Truck Simulator 2's server is started by the panel's start script with the program bin\\win_x64\\eurotrucks2_server.exe. That program name is not confirmed by any source yet. The panel writes the server's settings file (server_config.sii) with the name and the two ports, so there is no settings form in this panel.",
	files: {},
	notes: [
		"The server program's name is not confirmed. The start script uses eurotrucks2_server.exe, inferred from the American Truck Simulator server. Check the server folder's bin\\win_x64 for the real name and make sure the server starts before you rely on it.",
		"Before the first start, copy server_packages.sii and server_packages.dat into the server's data folder. The server does not start without them. The game makes them: open a copy of the game with a map loaded, open the console, and run export_server_packages. The panel cannot make them.",
		"The settings are in data\\Euro Truck Simulator 2\\server_config.sii inside the server's folder. The panel writes the name, the two ports and the player limit. To change the rest, stop the server first, then edit the file by hand. The defaults conflict between sources, so the panel leaves the timezone to the game.",
		"The panel's Stop closes the server window and, after 15 seconds, ends the program. The dossier names Ctrl + C as the only way to stop the server, so there is no clean save. Back up the data folder before you stop or update.",
		"Public listing: a persistent logon token may be needed to be listed by the Steam server browser. This panel does not ask for a token, so the server uses an anonymous ID. Direct search still works.",
		"Moderators are added in server_config.sii by Steam ID, which this panel does not ask for.",
	],
};

export default {
	type: "ets2",
	title: "Euro Truck Simulator 2",
	files: {},
	launch,
	guide,
};

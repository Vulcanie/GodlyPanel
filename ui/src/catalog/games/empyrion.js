import { A, FLAG } from "../launchHelpers.js";

// Empyrion - Galactic Survival (dossier: docs/research/games/empyrion/, confidence medium). The server's settings are in dedicated.yaml,
// which the panel writes when it creates the server. The format has no editor here, so the Settings tab offers only the launch
// arguments. The arguments are the ones the Pterodactyl egg and the FireDaemon guide use; the dossier has no full list.

const GROUP_REQUIRED = "Required";
const GROUP_LOGS = "Logs";

export default {
	type: "empyrion",
	title: "Empyrion - Galactic Survival",
	// No settings file: see the note above.
	files: {},
	launch: {
		title: "Empyrion - Galactic Survival",
		program: /\bEmpyrionDedicated(?:\.exe)?\b/i,
		style: "space",
		editable: true,
		where: "the `EmpyrionDedicated.exe` line of the server's start script",
		intro:
			"Empyrion's dedicated server is started with these arguments on the command that starts it. The server's name, ports and passwords are in dedicated.yaml, which the panel writes. Changes apply the next time the server starts.",
		args: [
			FLAG({ flag: "-batchmode", label: "Batch mode", edit: false, managed: true, group: GROUP_REQUIRED, description: "Runs the server without a user interface, so it can run in the background." }),
			FLAG({ flag: "-nographics", label: "No graphics", edit: false, managed: true, group: GROUP_REQUIRED, description: "Runs the server without drawing anything on screen. The panel sets it with batch mode." }),
			A({ flag: "-logFile", label: "Log file", group: GROUP_LOGS, example: '"../Logs/server/server.log"', description: "Where the server writes its log. The Logs tab reads the default file, so change this only if you do not need the Logs tab." }),
		],
	},
	guide: {
		name: "Empyrion - Galactic Survival",
		short: "Empyrion",
		summary:
			"Empyrion's server reads dedicated.yaml, which the panel writes when it creates the server (the server's name, the join password, the ports and the save name). The Settings tab offers the launch arguments, because the file's format has no editor here yet.",
		files: {
			"dedicated.yaml": "The server's name, passwords, ports and save name, written by the panel. Stop the server before you edit it by hand: the game overwrites changes made while it runs.",
		},
		notes: [
			"Not checked on a real install. Before relying on this server, run it once and check the items in the server's implementation notes.",
			"Windows only: the game has no Linux server, so a Linux host needs Wine, which the panel does not set up.",
			"Stop: the panel asks the server to save and exit through its telnet console, then closes the window. The save has not been checked on a real install, so the last few minutes may not be saved.",
			"Telnet: the telnet console has no password and is for this PC only. Do not open its port in your router or firewall.",
			"Ports: the game port and the three ports after it must be open. The telnet port stays on this PC.",
			"Settings: only the name, the join password and the ports are set from the panel. Other settings in dedicated.yaml take the game's own defaults.",
			"Mods: the game's mods are scenarios (folders in Content/Scenarios). The panel does not install them, so set the scenario by hand.",
		],
	},
};

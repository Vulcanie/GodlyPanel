import { A, FLAG } from "../launchHelpers.js";

// SCP: Secret Laboratory. The server's own settings (config_gameplay.txt, config_remoteadmin.txt) are kept in
// %APPDATA%\SCP Secret Laboratory\config\<port>\ and are "key: value" text (the dossier's UNSURE on the exact format). No parser the panel
// has reads that shape, so the Settings tab offers no file: the panel neither writes nor edits them, and the guide says where they are.
// The source of every name and description below is the research dossier (docs/research/games/scpsl/03-launch-args.md), whose sources are
// the LocalAdmin V2 README (https://github.com/northwood-studios/LocalAdmin-V2/blob/master/README.md) and the TechWiki launch options page.
//
// Not in the form, on purpose: the port (LocalAdmin's first argument, which the Ports section sets), and the client-only flags (-steam,
// -discord, --doh and the rest), which do not belong on a server's start line.

const launch = {
	title: "SCP: Secret Laboratory",
	program: /\bLocalAdmin(?:\.exe)?\b/i,
	// The dossier gives the README's syntax with a space between an option and its value (`--restartsLimit`, then the number). Whether
	// `=` is also accepted is not documented, so the space form is used. Needs checking on a real install.
	style: "space",
	editable: false,
	where: "the `LocalAdmin.exe` line of the server's start script",
	intro:
		"LocalAdmin starts the game and keeps it running. Its options are written after the port on the start line. They are read when the server starts, so a change applies the next time the server starts. The two options marked as always written are set by the panel so the server starts without stopping to ask a question.",
	args: [
		FLAG({
			flag: "--acceptEULA",
			label: "Accept the end user licence",
			group: "Required",
			edit: false,
			managed: true,
			description: "Accepts the game's end user licence agreement, so LocalAdmin does not stop to ask. The panel always writes it.",
		}),
		FLAG({
			flag: "--useDefault",
			label: "Use the default settings",
			group: "Required",
			edit: false,
			managed: true,
			description: "If LocalAdmin has no configuration yet, it uses the default one instead of asking questions in its window. The panel always writes it.",
		}),
		A({
			flag: "--restartsLimit",
			label: "Automatic restart limit",
			group: "Restarts",
			example: "4",
			description: "How many times LocalAdmin restarts the game within the time window below. 0 turns automatic restarts off, and -1 removes the limit. The default is 4.",
		}),
		A({
			flag: "--restartsTimeWindow",
			label: "Restart time window (seconds)",
			group: "Restarts",
			example: "480",
			description: "The length of the time, in seconds, that the restart limit counts over. 0 stops the count from ever resetting. The default is 480.",
		}),
		A({
			flag: "--logLengthLimit",
			label: "Log size limit",
			group: "Logs",
			example: "25G",
			description: "The most characters LocalAdmin's own log file can hold. The suffixes k, M, G and T are allowed, and 0 removes the limit. The default is 25G.",
		}),
		A({
			flag: "--logEntriesLimit",
			label: "Log entry limit",
			group: "Logs",
			example: "10G",
			description: "The most entries LocalAdmin's own log file can hold. The same suffixes are allowed, and 0 removes the limit. The default is 10G.",
		}),
		FLAG({
			flag: "--noLogs",
			label: "Turn off LocalAdmin's logs",
			group: "Logs",
			description: "Stops LocalAdmin writing its own log files. The game's own output is not affected by this option.",
		}),
	],
};

export default {
	type: "scpsl",
	title: "SCP: Secret Laboratory",
	// No file: see the header. The guide below says where the files are and what each one holds.
	files: {},
	launch,
	guide: {
		name: "SCP: Secret Laboratory",
		short: "SCP:SL",
		summary:
			"The server's settings are text files in `%APPDATA%\SCP Secret Laboratory\config\<port>\`, in a folder named for the server's port. The panel does not edit them yet. Stop the server before you change them, because the server may write its own copy when it stops.",
		files: {
			"config_gameplay.txt": "The gameplay settings: the server's name, the player limit, the round rules, the ticket system, the friendly-fire detector and the anti-cheat options.",
			"config_remoteadmin.txt": "Who can use the in-game remote admin tools, and what each role is allowed to do.",
		},
		notes: [
			"The panel does not write the settings files. The server name, the join password and every gameplay setting are set by hand in `config_gameplay.txt` in the folder above. Whether the server creates these files on its first start is not documented, so look in the folder after the first start.",
			"The panel stops the server by closing its window and, after 15 seconds, ending the process. SCP: Secret Laboratory has no documented console command or remote command to stop cleanly, so a round in progress may be lost.",
			"The launch line sets the port, the EULA acceptance and the default-settings option. The game keys the settings folder by port, so after a port change the settings are found in a different folder.",
			"Server plugins (LabAPI, which ships with the server, and EXILED, installed separately) are not managed by the panel. Their folders are not confirmed.",
		],
	},
};

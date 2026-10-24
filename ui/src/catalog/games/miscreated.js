import { A, FLAG } from "../launchHelpers.js";

// Miscreated (dossier: docs/research/games/miscreated/, confidence low). The arguments the panel uses are on the start script's launch
// line, which the panel writes itself. The game's own settings are in hosting.cfg, written as key="value" lines; no parser here reads
// the quotes, so there is no settings file in this form.

const launch = {
	title: "Miscreated",
	program: /MiscreatedServer\.exe/i,
	style: "space",
	editable: false,
	where: "the `MiscreatedServer.exe` line of the server's start script",
	intro:
		"The panel starts the server with the game port and the server name. Every argument here is written by the panel, so none can be changed from this form. Other settings are in hosting.cfg, which the panel does not edit.",
	args: [
		A({
			flag: "-mis_gameserverid",
			label: "Game server ID",
			group: "Server",
			edit: false,
			managed: true,
			example: "1337",
			description:
				"An ID for the server's database, set to a fixed number. The panel writes 1337. Changing it on a server that already has a world wipes that world.",
		}),
		A({
			flag: "-sv_port",
			label: "Game port",
			group: "Network",
			edit: false,
			managed: true,
			example: "27960",
			description: "The port the server listens on. The panel writes it from the Ports field when the server is created.",
		}),
		A({
			flag: "+sv_servername",
			label: "Server name",
			group: "Server",
			edit: false,
			managed: true,
			example: '"My Server"',
			description: "The name shown in the server browser. The panel writes it from the Server Name you typed.",
		}),
	],
};

const guide = {
	name: "Miscreated",
	short: "Miscreated",
	summary:
		"Miscreated's server is MiscreatedServer.exe in the Bin64_dedicated folder, started by the panel's start script. The panel sets the game port and the server name on the launch line. The rest of the settings are in hosting.cfg, which the panel leaves for you to edit by hand.",
	files: {
		"hosting.cfg": "The server's settings, one key=\"value\" line each (for example the MOTD and the AI and loot settings). The panel does not edit it; it is backed up with the world.",
	},
	notes: [
		"Checked on a real install: the server starts, answers the Steam query on the game port plus 2, and Stop closes it gracefully. The Logs tab shows server.log. hosting.cfg is not created by the game; make it in the server folder to override the shipped dedicated.cfg.",
		"-sv_bind: the Docker guide says the server fails to start on the newest build without -sv_bind and the public IP address, and says to leave it out when Steam Workshop mods are used. The panel does not write it, because it does not know the public address. If the server does not start, this is the first thing to check.",
		"RCON: the panel does not open the RCON service. The guides say it has no password unless http_password is set in hosting.cfg, so set that by hand if you use it.",
		"Mods: Workshop mods are added by hand, by putting their numeric IDs on the steam_ugc line of hosting.cfg, separated by commas. The panel does not manage this line.",
		"Keep the -mis_gameserverid value fixed. Changing it on a server that already has a world wipes that world.",
		"Back up miscreated.db, the world database, before you update the server. The panel's backup copies it.",
	],
};

export default {
	type: "miscreated",
	title: "Miscreated",
	files: {},
	launch,
	guide,
};

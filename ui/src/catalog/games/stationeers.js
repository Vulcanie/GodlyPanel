import { A, FLAG } from "../launchHelpers.js";

// Stationeers (dossier: docs/research/games/stationeers/, confidence low). Every setting the panel uses is on the start script's
// launch line, which the panel writes itself: the world type, the name, the ports and the password go in -settings pairs. The game's
// setting.xml has no known folder and no known key list, so there is no settings file in this form.

const launch = {
	title: "Stationeers",
	program: /rocketstation_DedicatedServer\.exe/i,
	style: "space",
	editable: false,
	where: "the `rocketstation_DedicatedServer.exe` line of the server's start script",
	intro:
		"The panel starts the dedicated server headless with a save called Panel (made the first time from the world type you pick, then loaded on every start), and passes the name, the ports, the visibility and the password on one -settings line. Every flag here is written by the panel, so none can be changed from this form.",
	args: [
		A({
			flag: "-LOAD",
			label: "Save and world type",
			group: "World",
			edit: false,
			managed: true,
			example: "Panel Mars2",
			description:
				"The save name (always Panel) and the world type from the World Type field: Mars2, Europa3, Lunar, MimasHerschel, Venus or Vulcan2. The first start creates the save; every later start loads it, so the world survives restarts.",
		}),
		A({
			flag: "-settings",
			label: "Settings",
			group: "Server",
			edit: false,
			managed: true,
			example: 'ServerName "My Station" ServerVisible true GamePort 27816 UpdatePort 27818',
			description:
				"The server's settings as Name value pairs: the server name, whether it is listed, the two ports, and the password if one is set. The panel writes them from the create form.",
		}),
	],
};

const guide = {
	name: "Stationeers",
	short: "Stationeers",
	summary:
		"Stationeers' dedicated server is rocketstation_DedicatedServer.exe, started by the panel's start script. The panel passes the world type, the server name, the ports and the password on the launch line, so there is no settings file to edit here.",
	files: {},
	notes: [
		"On a restart the server loads the Panel save, and changing the world type in the script does not make a new world, and the world type only matters the first time; delete saves\\Panel to start over.",
		"The panel's Stop closes the server gracefully. Back up the world before you update or copy the server anyway.",
		"The world is saved in saves\\Panel and the game keeps its own settings in setting.xml, both in the server folder. The panel backs both up but does not edit setting.xml. The server log is server.log.",
		"Ports and the password are only read from the launch line, according to one guide, so change them by recreating the server rather than editing a file.",
		"Mods are installed through the Steam Workshop and a plugin loader (BepInEx or StationeersLaunchPad). This panel does not manage them. Every player needs the same mods as the server.",
	],
};

export default {
	type: "stationeers",
	title: "Stationeers",
	files: {},
	launch,
	guide,
};

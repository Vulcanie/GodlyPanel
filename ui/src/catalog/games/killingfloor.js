import { rows } from "../rows.js";
import { A } from "../launchHelpers.js";

// Killing Floor (2009) (dossier: docs/research/games/killingfloor/, confidence low; NOT checked on a real install). The settings file is
// System\KillingFloor.ini. Only the settings the dossier's own pages explain are offered here: their keys and example values come from
// hosting-provider example configs, and the keys for difficulty, waves and monsters are not listed on any page the dossier could read.

const URL_SECTION = "URL";
const SERVER = "Engine.GameReplicationInfo";
const ACCESS = "Engine.AccessControl";
const WEB = "UWeb.WebServer";

const settings = rows([
	[`${URL_SECTION}::Port`, "Game port", "The UDP port players connect to, 7707 in the example file. The panel sets it from the Game Port you chose, so change it there.", "Network"],
	[`${SERVER}::ServerName`, "Server name", "The full name shown in the server browser. The panel writes the Server Name you typed when it creates the server.", "Server"],
	[`${SERVER}::ShortName`, "Short server name", "A shorter version of the server name, for places where the full name does not fit.", "Server"],
	[`${SERVER}::MessageOfTheDay`, "Welcome message", "The message players see when they join. Leave it empty for none.", "Server"],
	[`${SERVER}::AdminName`, "Admin name", "The name of the person running the server, shown to players. The example file has a sample name to replace.", "Admin"],
	[`${SERVER}::AdminEmail`, "Admin e-mail", "A contact e-mail address for the person running the server. The example file has a sample address to replace.", "Admin"],
	[`${ACCESS}::AdminPassword`, "Admin password", "The password an admin uses to log in to the server. The example file has a placeholder, so set your own.", "Admin"],
	[`${ACCESS}::GamePassword`, "Password to join", "The password players must type to join. Leave it empty and anyone can join.", "Access"],
	[`${WEB}::bEnabled`, "Web admin page", "Turns on the browser admin page (WebAdmin, TCP port 8075). The sources say it must be set to True to work; the panel leaves it as the file has it.", "Web admin"],
]);

const order = ["Network", "Server", "Admin", "Access", "Web admin"];

const launch = {
	title: "Killing Floor",
	program: /\bucc(?:\.exe)?\b/i,
	style: "space",
	editable: false,
	where: "the `ucc.exe server` line of the server's start script",
	intro:
		"The panel starts the server with the map, the game's options after the map, and a log file. The map options are written by the panel from the Map and the other settings, so none can be changed from this form.",
	args: [
		A({
			flag: "-log",
			key: "log",
			style: "equals",
			label: "Log file",
			group: "Logs",
			edit: false,
			managed: true,
			example: "server.log",
			description: "The file the server writes its log to, in the System folder. The Logs tab reads it. The name comes from the example start line in the dossier.",
		}),
	],
};

const guide = {
	name: "Killing Floor",
	short: "Killing Floor",
	summary:
		"Killing Floor (2009) runs as ucc.exe from its System folder. The panel writes the map and the other game options on the start line, and writes the server name, the join password and the game port into System\\KillingFloor.ini.",
	files: {
		"KillingFloor.ini": "The server's settings file. The game makes it the first time the server starts; the panel also writes the three settings above.",
	},
	notes: [
		"Not checked on a real install. The Windows server's program name (ucc.exe) and the process the panel watches are the most-evidenced names in the sources, not confirmed.",
		"The game port is 7707 by default and the game also uses 7708 beside it. Forward both (UDP) if players are outside your network.",
		"The server does not respond to a graceful shutdown, so the panel ends it after about 15 seconds. Back up the server before you stop, update or copy it.",
		"Settings for difficulty, waves, starting cash and monsters are in the same file in the game's own keys, but no page the sources could read lists them with confirmed names, so the panel does not offer them.",
		"The sources disagree on whether the server downloads with an anonymous Steam login. The panel uses the anonymous login; if the install stops with \"No subscription\", the server needs a Steam account that owns the game.",
		"Mods are not managed by the panel: the sources do not confirm how a dedicated server loads them.",
	],
};

export default {
	type: "killingfloor",
	title: "Killing Floor",
	files: {
		"KillingFloor.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: {
				[URL_SECTION]: "Network",
				[SERVER]: "Server",
				[ACCESS]: "Access",
				[WEB]: "Web admin",
			},
			settings,
			groupOrder: order,
			mayBeMissing: "The panel writes this file when it makes the server. If it is missing, the game makes it the first time the server starts. Start the server once, then come back.",
		},
	},
	launch,
	guide,
};

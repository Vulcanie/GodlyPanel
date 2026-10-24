import { A, FLAG } from "../launchHelpers.js";

// Operation: Harsh Doorstop (dossier: docs/research/games/ohd/, confidence low; NOT checked on a real install). The panel writes the
// server name, the ports and the map on the start script's launch line. The game's own settings files (Game.ini, Engine.ini) have no
// confirmed Windows folder and conflicting key names between sources, so no settings file is offered here.

const launch = {
	title: "Operation: Harsh Doorstop",
	program: /HarshDoorstopServer-Win64-Shipping\.exe/i,
	style: "space",
	editable: false,
	where: "the `HarshDoorstopServer-Win64-Shipping.exe` line of the server's start script",
	intro:
		"The panel starts the server with the map, the server name and the ports. Every flag here is written by the panel, so none can be changed from this form. The flags are the ones the community start line uses; their meaning is only partly documented.",
	args: [
		A({
			flag: "-SteamServerName",
			label: "Server name",
			group: "Server",
			edit: false,
			managed: true,
			example: '"Friends Server"',
			description: "The name shown in the server browser. The panel writes it from the Server Name you typed, in quotes.",
		}),
		A({
			flag: "-Port",
			label: "Game port",
			group: "Network",
			edit: false,
			managed: true,
			example: "27050",
			description: "The port players connect to. The panel writes the Game Port you set. Its protocol (TCP or UDP) is not confirmed.",
		}),
		FLAG({
			flag: "-MULTIHOME",
			label: "Listen address",
			group: "Network",
			edit: false,
			managed: true,
			description: "The address the server listens on, given as 0.0.0.0 (all addresses), as the community start line gives it. The panel always writes it.",
		}),
		A({
			flag: "-QueryPort",
			label: "Steam query port",
			group: "Network",
			edit: false,
			managed: true,
			example: "27052",
			description: "The port the Steam server browser asks for the server's details on. The panel writes the Steam Query Port you set.",
		}),
	],
};

const guide = {
	name: "Operation: Harsh Doorstop",
	short: "Harsh Doorstop",
	summary:
		"Operation: Harsh Doorstop's server is an Unreal Engine program in HarshDoorstop\\Binaries\\Win64. The panel starts it with the map, the server name and two ports on the launch line. The settings are not written by the panel yet.",
	files: {},
	notes: [
		"Checked on a real install: the server starts, answers the Steam query on the query port and sets its name and player count from the start script.",
		"The panel's Game Port and Steam Query Port are its own picks (27050 and 27052), not the game's published defaults. Forward both if players are outside your network.",
		"Settings such as the round time, the friendly fire and the admins are in the game's Game.ini file, but the sources disagree on key names, so the panel does not offer them.",
		"Mods: the sources disagree on how they reach a server (a Workshop list in a host panel, or files copied in by hand). The panel does not manage mods.",
		"The server does not close on the panel's Stop request, so the panel force-ends it after about 15 seconds. Back up the server before you stop, update or copy it. The panel's backup keeps the WindowsServer config folder, and the Logs tab shows HarshDoorstop.log.",
		"The map names are case-sensitive. Jaziira_AASSmall is the one the panel uses by default and the one checked on a real server. The older names from host pages (Anviloy, Khafji, Salhan and so on) do not exist in the current build: the server then falls back to the AAS-TestMap test map. Other maps in the files are named like Jaziira_AASLarge.",
	],
};

export default {
	type: "ohd",
	title: "Operation: Harsh Doorstop",
	files: {},
	launch,
	guide,
};

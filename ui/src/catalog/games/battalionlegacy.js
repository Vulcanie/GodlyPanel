import { A } from "../launchHelpers.js";

// BATTALION: Legacy (Unreal Engine). The server has no settings file the panel can read: the research dossier gives no location for the
// example Game.ini on any page, and its forum reports that edits to the packaged file often did nothing. So the Settings tab offers the
// launch line only, which holds the query port, the name and the admin password (the Pterodactyl egg's arguments, `-Name=value`).
// Source of every name and description: the research dossier (docs/research/games/battalionlegacy/03-launch-args.md), the egg's start
// line and a 2022 forum guide. No official list of arguments exists, so the rows say what the sources say and no more.

const launch = {
	title: "BATTALION: Legacy",
	program: /\bBattalionServer(?:\.exe)?\b/i,
	style: "equals",
	editable: true,
	where: "the `BattalionServer.exe` line of the server's start script",
	intro:
		"The arguments that start BATTALION: Legacy's server. The panel writes them when the server is created, and the Launch options form can add more at the end of the line. Changes apply the next time the server starts.",
	args: [
		A({
			flag: "-Port",
			label: "Game port",
			group: "Network",
			managed: true,
			example: "25956",
			description: "The UDP port players connect to. The server also opens the port above it. The panel writes it when the server is created. Change it from the server's Ports section so the panel can check for clashes.",
		}),
		A({
			flag: "-QueryPort",
			label: "Query port",
			group: "Network",
			managed: true,
			example: "25958",
			description: "The UDP port the server browser asks for the server's details. The panel writes it when the server is created. Change it from the server's Ports section so the panel can check for clashes.",
		}),
		A({
			flag: "-SteamServerName",
			label: "Server name",
			group: "Server",
			managed: true,
			example: '"My Battle Server"',
			description: "The name shown in the server browser. Up to 60 characters, the limit the Pterodactyl egg for this game uses. Written with quotes around it.",
		}),
		A({
			flag: "-AdminPassword",
			label: "Admin password",
			group: "Access",
			managed: true,
			example: '"secret"',
			description: "The password a player types in the game's console, with Server.Login followed by it, to get admin commands. Up to 20 characters, the limit the Pterodactyl egg uses. It is kept on the start command, so anyone who can read the start script can see it.",
		}),
	],
};

const guide = {
	name: "BATTALION: Legacy",
	short: "BATTALION: Legacy",
	summary:
		"BATTALION: Legacy's server has no settings file the panel edits. Its name, its admin password and its query port are on the start command, which the panel writes when the server is created; the **Launch options** on the Settings tab can add to that line.",
	files: {},
	notes: [
		"**No settings file.** The example Game.ini in the community's configuration repository has the name and admin password as keys, but no page says where the server reads it, and a forum report says edits did nothing. The panel therefore writes no file, and the name and the admin password go on the start command instead.",
		"**The panel cannot stop the server cleanly.** The game stops with Ctrl+C in its own console window. The panel has no way to type into a console, so Stop closes the window and ends the process after 15 seconds. Open the server's window (kept minimized on the taskbar), press Ctrl+C, wait for it to close, and only then press Stop or update.",
		"**Two ports, plus one.** The game port (`-Port`) is where players connect and the query port (`-QueryPort`) answers the server browser. The server also opens the port just above the game port, so leave that one free.",
		"**No join password.** The forum's `-Password` flag conflicts with the egg, which does not use it, so the form does not offer a join password.",
		"**No mods.** No official mod path was found, so none is managed. The hosting guides describe a file-manager upload that is not a documented mod method.",
		"**Updates.** The server checks Steam for a new version every time it starts, and players can only join a server running the same version as their game.",
	],
};

export default {
	type: "battalionlegacy",
	title: "BATTALION: Legacy",
	// No settings file: see the top of this file.
	files: {},
	launch,
	guide,
};

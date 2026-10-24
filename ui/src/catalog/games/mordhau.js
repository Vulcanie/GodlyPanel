import { rows } from "../rows.js";
import { A } from "../launchHelpers.js";

// Mordhau. Two places hold the server's settings:
//   Game.ini      Mordhau\Saved\Config\WindowsServer\ in the server's folder. The panel writes it when the server is created, with the
//                 name and the two passwords, in [/Script/Mordhau.MordhauGameSession]. The game rewrites it when the server shuts
//                 down, so change it only with the server stopped.
//   launch line   the start command: the map, the player limit and the ports. The panel writes the ports, and the form shows the
//                 player limit.
// Names and descriptions come from the research dossier (docs/research/games/mordhau): the Pterodactyl egg, Mintservers' and
// XGamingServer's guides, and the ESAGAMES page; the program and the settings folder were checked on a real Windows install (2026-10-23).

export const MORDHAU_SECTION = "/Script/Mordhau.MordhauGameSession";

const gameIniRows = rows([
	["ServerName", "Server name", "The name players see in the in-game server browser. Up to 40 characters, the limit the Pterodactyl egg for this game uses. Changes apply the next time the server starts.", "Server"],
	["ServerPassword", "Join password", "The password players must type to join. Leave it empty for a public server that anyone can join. Up to 20 characters, the limit the Pterodactyl egg uses.", "Access"],
	["AdminPassword", "Admin password", "A player who types AdminLogin in the in-game console, followed by this password, becomes an admin. Admins can add more admins, so share it only with people you fully trust. Up to 20 characters.", "Access"],
]);

const settings = Object.fromEntries(Object.entries(gameIniRows).map(([key, meta]) => [`${MORDHAU_SECTION}::${key}`, meta]));

const groupOrder = ["Server", "Access"];

// The launch line: the program, then the map, then `-Name=value` arguments (the game's own spelling: the egg writes them this way).
const launch = {
	title: "Mordhau",
	program: /\bMordhauServer(?:\.exe)?\b/i,
	style: "equals",
	editable: true,
	where: "the `MordhauServer.exe` line of the server's start script",
	intro:
		"The arguments that start Mordhau's server. The map is the first word after the program and is not in this form; to change it, edit the start script by hand. The panel writes the ports when the server is created. Changes apply the next time the server starts.",
	args: [
		A({
			flag: "-MaxSlots",
			label: "Max players",
			group: "Server",
			example: "48",
			description: "The most players that can be on the server at once. The Pterodactyl egg's example is 48. A hosting guide says going much past 64 tends to hurt performance.",
		}),
		A({ flag: "-Port", label: "Game port", group: "Network", edit: false, managed: true, example: "25900", description: "The UDP port players connect to. Written by the panel when the server is created. The form does not change it: edit the start script by hand and keep the flag." }),
		A({ flag: "-queryport", label: "Query port", group: "Network", edit: false, managed: true, example: "25902", description: "The UDP port the server browser asks for the server's details. Written by the panel when the server is created; change it by editing the start script by hand." }),
		A({ flag: "-beaconport", label: "Beacon port", group: "Network", edit: false, managed: true, example: "25903", description: "The UDP port the server's beacon uses, one per server on a PC. Written by the panel when the server is created; change it by editing the start script by hand." }),
	],
};

const guide = {
	name: "Mordhau",
	short: "Mordhau",
	summary:
		"Mordhau's server keeps its name and passwords in `Mordhau\\Saved\\Config\\WindowsServer\\Game.ini`, which the panel writes when the server is created and which the Settings tab edits. The player limit is on the start command (the **Launch options** on the Settings tab). The game rewrites Game.ini when it shuts down, so edit it only with the server stopped.",
	files: {
		"Game.ini": "The server's name and passwords, in the server's session section. The game keeps its own settings for the rest, and rewrites the file when it shuts down.",
		"Engine.ini": "Network settings such as the tick rate. The panel does not read or write this file; edit it by hand with the server stopped.",
	},
	notes: [
		"**The panel cannot stop the server cleanly.** The game stops with ^C in its own console window. The panel has no way to type into a console, so Stop closes the window and ends the process after 15 seconds. Before you press Stop (or update), open the server's window, which the panel keeps minimized on the taskbar, press Ctrl+C, and wait for it to close.",
		"**Two programs run.** The panel starts `MordhauServer.exe`, which starts `Mordhau\\Binaries\\Win64\\MordhauServer-Win64-Shipping.exe`; the second one holds the ports.",
		"**The map is not in the form.** The start command uses the egg's first map, `/Game/Mordhau/Maps/Grad/FL_Grad`, as the first word after the program. Other maps are named as `MAPNAME/TYPE_NAME` in the egg's readme; change the map by editing the start script by hand.",
		"**Ports.** The game port (25900) is for UDP, the query port (25902) is the one the server browser asks, and the beacon port (25903) is one per server. The panel's firewall check opens UDP only. Change a port by editing the start script by hand, because the form does not rewrite the ports.",
		"**Map rotation and admins are not in the form.** Game.ini can list maps to rotate (MapRotation) and admins by SteamID, one line per entry. The sources disagree on which section holds MapRotation, so the panel does not offer them. Add them by hand only after you have checked the section on a real install.",
		"**Mods are not managed.** Mordhau's mods come from mod.io, not the Steam Workshop. The sources give the Mods= lines in Game.ini and a -ModDownload start flag, but they disagree on the section, so the panel does not set either.",
		"**Engine.ini is not in the Settings tab.** Its tick-rate keys come from one guide, which gives no defaults or allowed values. Edit it by hand only if you know what you want, with the server stopped.",
	],
};

export default {
	type: "mordhau",
	title: "Mordhau",
	files: {
		"Game.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: { [MORDHAU_SECTION]: "Server settings" },
			settings,
			groupOrder,
			mayBeMissing: "The panel writes this file when it creates the server. If it has been deleted, the game makes a new one the first time the server starts.",
		},
	},
	launch,
	guide,
};

import { rows } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Blade Symphony (a Source-engine server). Its settings are console variables, one per line, in berimbau\cfg\server.cfg. The panel's
// convar reader handles that shape (the same as Sven Co-op's and Counter-Strike 2's files).
// Source of every name and description: the research dossier (research/bladesymphony/02-config.md and 03-launch-args.md). The main source
// is the game's official server guide, dated 2013. Its page names only five settings, and it gives no defaults or value lists for any of
// them, so this form offers those five and nothing more. The community guides name more keys, but their descriptions come from other games.
//
// Not in the form, on purpose:
//   - the community keys (sv_alltalk, sv_cheats, log and the rest): the dossier found them only in a hosting sample for another Source game
//     and in a 2014 post, so their meanings are not confirmed for this game;
//   - the Steam login token (GSLT), which the sources disagree on (see the dossier's conflicts).

export const bladeServerSettings = rows([
	// Server
	["hostname", "Server name", "The name shown to players in the server browser. The panel writes it when it creates the server.", "Server"],
	["sv_password", "Join password", "The password players type to join. Leave it empty for a public server.", "Server"],
	["rcon_password", "Remote console password", "The password for remote console commands run from a player's game console. The official guide says to replace the placeholder with your own. The panel does not use the remote console.", "Server"],

	// Map time
	["mp_timelimit", "Map time limit (minutes)", "The time in minutes before the game tries to change the map. The official guide says the timer can run longer while duels are going on.", "Map time"],

	// Maps
	["mapcyclefile", "Map cycle file", "The file that lists the maps to cycle through automatically. The official guide names it but does not say what it must be called; the panel does not create this file.", "Maps"],
]);

export const bladeServerGroupOrder = ["Server", "Map time", "Maps"];

const launch = {
	title: "Blade Symphony",
	// The official guide writes srcds.exe for Windows; the generic Source pages also name srcds_run.
	program: /\bsrcds(?:_run)?(?:\.exe|\.sh)?\b/i,
	// `+word value` is a console command run at start-up (the map, the player limit), `-word value` a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `srcds.exe` line of the server's start script",
	intro:
		"Blade Symphony is started with the official guide's arguments: -console, +maxplayers and +map. The panel also adds -port, so the port it chose is the one the server uses. Arguments are read when the server starts, so changes apply the next time it starts.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode. The official guide's start line uses it, so the panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "27034", description: "The UDP port the server listens on. Source servers use this option; the official guide does not list it, so check that the server uses this port. Change it from the server's Ports section." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "16", description: "The most players on the server at one time. The official guide starts with 16; the range is not given on any page the research read." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "duel_winter", description: "The map the server starts on, by its file name without .bsp. The official guide uses duel_winter." }),
	],
};

const guide = {
	name: "Blade Symphony",
	short: "Blade Symphony",
	summary:
		"Blade Symphony keeps its settings in berimbau\\cfg\\server.cfg, one setting and its value per line. The panel writes the server's name and password when it creates the server; the map and the player count are on the launch line.",
	files: {
		"server.cfg": "The server's settings: its name, its join password, the remote console password, the map time limit and the map cycle file. Only the lines you set are in the file.",
	},
	notes: [
		"The official guide is from 2013. Some settings may have changed, and most settings the community guides name are not in this form because their meanings are not confirmed for Blade Symphony.",
		"Stopping: no in-game quit command is documented. The panel's Stop asks the server window to close and, after 15 seconds, ends the program.",
		"Custom maps are .bsp files that go in the berimbau\\maps folder by hand. The backup keeps that folder. Players download the maps from the server when they join, which is faster with a fast-download web address; the dossier did not confirm the setting name for it on this game.",
		"The Steam login token is not used. The sources disagree on whether a server needs one to appear in Steam's public list.",
		"Mods are not supported by the panel: the official guide does not describe a mod system.",
	],
};

export default {
	type: "bladesymphony",
	title: "Blade Symphony",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: bladeServerSettings,
			groupOrder: bladeServerGroupOrder,
			mayBeMissing:
				"The panel writes server.cfg in berimbau\\cfg when it creates the server. If it is missing, create it there: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	launch,
	guide,
};

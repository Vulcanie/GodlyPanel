// HYPERCHARGE: Unboxed (dossier: docs/research/games/hyperchargeunboxed/, confidence low). The server side is in
// src/server/data/games/hyperchargeunboxed.js. Checked on a real install? No: see the implementation notes.
//
// No settings file and no launch-arguments form. The dossier has no settings file. Its game options (the mode, the difficulty,
// the player limit) follow the map name in the start line, which the panel's form cannot add to, and the 2020 guide gives no
// verified value form for them. The start line is fixed in the server module: the Garage map, co-op mode, and the two ports.

export default {
	type: "hyperchargeunboxed",
	title: "HYPERCHARGE: Unboxed",
	files: {},
	launch: null,
	guide: {
		name: "HYPERCHARGE: Unboxed",
		short: "HYPERCHARGE: Unboxed",
		summary:
			"HYPERCHARGE: Unboxed's server is installed with SteamCMD and started by the panel's start script, which runs UnboxedServer.exe on the Garage map in co-op mode, with the game port and the query port. The game's other options are not set from the panel.",
		files: {},
		notes: [
			"Not checked on a real install. The program name, the start line and the install id all come from a 2020 community guide and a Steam lookup. Before relying on this server, run it once and check the items in the server's implementation notes.",
			"Ports: the panel passes the game port and the query port to the server as -Port and -QueryPort. The guide gives these flags as examples only, and on a real install the server did not listen on them: it uses PlayFab (an invite code appears in its log), so no port needs opening.",
			"Settings: the game's options, such as the mode, the difficulty and the player limit, are not in a settings file, and the panel does not set them. The map and mode are fixed in the start script: the Garage map in co-op mode.",
			"Stop: no quit command or RCON is documented. The panel closes the server's window and, after 15 seconds, ends it, so the last few minutes may not be saved.",
			"Mods: no mod support is documented for this game, so the panel adds no mod setting.",
		],
	},
};

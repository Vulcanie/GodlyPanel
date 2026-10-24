// Survive the Nights (dossier: docs/research/games/survivethenights/, confidence low). The server side is in
// src/server/data/games/survivethenights.js. Checked on a real install, see the verification note.
//
// No settings file and no launch arguments are offered. The game's settings are in Config/ServerConfig.txt (Key=Value lines with //
// comments); the panel writes the name, port and UPnP off before the first start, and there is no parser for the // comments.

export default {
	type: "survivethenights",
	title: "Survive the Nights",
	files: {},
	launch: null,
	guide: {
		name: "Survive the Nights",
		short: "Survive the Nights",
		summary:
			"Survive the Nights' server is installed with SteamCMD and started by the panel's start script, which runs STN_Dedicated_Server.exe with no arguments. The panel writes the server name, the game port and UPnP off into Config/ServerConfig.txt before the first start. The other settings are in that file.",
		files: {
			"Config/ServerConfig.txt":
				"The server's settings, as Key=Value lines (for example the day length, the weather and the zombie amount). Lines starting with // are comments. The panel writes ServerName, ServerPort and UseUpnp=False once, before the first start; edit the rest by hand.",
		},
		notes: [
			"Checked on a real install: the server starts with no arguments and listens on the port the panel wrote. The panel's Stop may not save the world first.",
			"Port: the game's own default is 7950 (UDP) with UPnP on. The panel writes the port you chose and turns UPnP off, so the game does not open ports on your router by itself.",
			"Settings: Config/ServerConfig.txt holds the settings (owner, name, password, day length, weather, zombies, loot). The panel does not show them.",
			"Saves: the world is in .stn-server-V8.db in the server folder; the panel's backup covers it and the Config folder.",
			"Mods: the dossier finds no developer statement on mods. Hosting sites say Steam Workshop is supported, but no mod folder or ID is documented, so the panel adds nothing for mods.",
		],
	},
};

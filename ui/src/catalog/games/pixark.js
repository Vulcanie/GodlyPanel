import { rows, withChoices } from "../rows.js";

// PixARK. Two places hold its settings:
//   the start line     the server's name, player limit, game, query, RCON and cube ports, and the passwords are inside one quoted
//                      URL on the line the panel writes. The Launch options form cannot read inside the quotes, so it is not offered.
//   GameUserSettings.ini  the rules of the server. Only ServerPVE is offered here: the Nodecraft guide and a 2018 forum post both name
//                      its section ([ServerSettings]). The other keys on the Nodecraft settings page are not shown with a section, and
//                      the dossier does not confirm where they go, so they are left out.
// The file is in ShooterGame\Saved\Config\WindowsServer. The dossier does not say the game creates it on the first start.

const SERVER = "ServerSettings";

const serverRows = rows([
	[`${SERVER}::ServerPVE`, "PvE mode", "Turns the server's PvE (player versus environment) mode on or off. The Nodecraft settings page says true is creative and false is Fury (survival); a 2018 forum post calls true Pioneering. Check how the server plays after changing it, because the modes differ between game versions.", "Server"],
]);

withChoices(serverRows, {
	[`${SERVER}::ServerPVE`]: [
		["true", "On (PvE: creative, or Pioneering)"],
		["false", "Off (survival: Fury)"],
	],
});

export default {
	type: "pixark",
	title: "PixARK",
	files: {
		"GameUserSettings.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: { [SERVER]: "Server" },
			settings: { ...serverRows },
			groupOrder: ["Server"],
			mayBeMissing:
				"The panel does not make this file, and the dossier does not say when the game makes it. Start the server once and then come back; if it still is not there, the game may not write it on this build.",
		},
	},
	launch: null,
	guide: {
		name: "PixARK",
		short: "PixARK",
		summary:
			"PixARK's server is `ShooterGame\\Binaries\\Win64\\PixARKServer.exe`, started by the panel's start script. The name, player limit, ports and passwords are written into the start line, and the server's rules are in `GameUserSettings.ini` (ShooterGame\\Saved\\Config\\WindowsServer), which the Settings tab shows for the one setting it offers.",
		files: {
			"GameUserSettings.ini": "The server's rules. Only the PvE switch is shown here; the file holds many more settings, which you can edit by hand while the server is stopped.",
		},
		notes: [
			"**Ports.** The game and query ports are UDP, and the cube port (which sends terrain to players) is TCP. The RCON port is written on the line but RCON is off, so it is only reserved. The panel starts them at 27730, 27740, 27750 and 27760, away from the defaults other servers here use. Forward the game and query ports on your router.",
			"**Passwords.** The join and admin passwords go into the start line, so only letters, numbers and `- _ . @ # $ * + ~` are allowed. A password left blank is not passed, which makes the server public.",
			"**Settings on the line are overridden by the config file.** The dossier says the file wins where the two disagree. The Settings tab edits only the PvE switch in the file.",
			"**Mods are copied in by hand.** The server cannot download Workshop mods. You subscribe on a PC, run the game once to unpack them, then copy each mod's folder and its `<ModID>.mod` file into `ShooterGame\\Content\\Mods` on the server. Players need the same mods, and a mod that is missing from the server may stop it from starting. Back up before you add one.",
			"**Stop does not save.** The game has no save or stop command the panel can send; its own guide uses Ctrl+C. The panel closes the window and, if the game does not exit within 15 seconds, ends it. Back up before you stop or update.",
		],
	},
};

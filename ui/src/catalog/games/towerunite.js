// Tower Unite (dossier: docs/research/games/towerunite/, confidence medium). The server side is in src/server/data/games/towerunite.js.
// Checked on a real install, see the verification note.
//
// The settings file is TowerServer.ini, an INI file with one section per group of keys. Its Windows location is not confirmed by the
// official pages; the panel writes it where the Linux guide's layout and the Windows folder names suggest (see the server module).
// The launch line is written by the panel, so no launch arguments are offered here.

const SECTION = "/script/towernetworking.dedicatedserveroptions";
const BOOL_CHOICES = [
	{ value: "True", label: "On" },
	{ value: "False", label: "Off" },
];

const settings = {
	[`${SECTION}::ServerTitle`]: {
		label: "Condo title",
		description: "The name of the condo server. It is the title shown for the server, and the panel sets it when the server is created.",
		group: "Server",
	},
	[`${SECTION}::MaxPlayers`]: {
		label: "Max players",
		description: "How many players can be on the server at once. The game allows 2 to 64, and its default is 32.",
		group: "Server",
	},
	[`${SECTION}::SteamLoginToken`]: {
		label: "Steam login token",
		description:
			"A token from Steam that gives this server a fixed Steam ID. The condo cannot be listed without it. Treat it like a password: the official guides say never to share it.",
		group: "Login tokens",
	},
	[`${SECTION}::TowerLoginToken`]: {
		label: "Tower login token",
		description:
			"A token from Tower Unite's server site that lets the condo join the public server list. Treat it like a password: the official guides say never to share it.",
		group: "Login tokens",
	},
	"Administration::AdminSteamID": {
		label: "Admin Steam ID",
		description: "The 64-bit Steam ID (a number) of one admin. For more admins, add another AdminSteamID line for each one.",
		group: "Admins",
	},
	"DedicatedCondoOptions::CondoAutoSave": {
		label: "Auto-save the condo",
		description: "Saves the condo on its own after changes have been made, so a crash loses less of the work.",
		group: "Condo",
		options: BOOL_CHOICES,
	},
	"DedicatedCondoOptions::CondoBackupsEnabled": {
		label: "Keep a backup on each save",
		description: "Makes a backup copy of the condo each time it is saved, so an earlier save can be restored.",
		group: "Condo",
		options: BOOL_CHOICES,
	},
};

export default {
	type: "towerunite",
	title: "Tower Unite",
	files: {
		"TowerServer.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: {},
			settings,
			groupOrder: ["Server", "Login tokens", "Admins", "Condo"],
			mayBeMissing:
				"The panel makes this file when the server is created. If it is missing, create it in Tower/Saved/Config/WindowsServer/ with the same sections and keys as the examples in the guide.",
		},
	},
	launch: null,
	guide: {
		name: "Tower Unite",
		short: "Tower Unite",
		summary:
			"Tower Unite's dedicated server hosts one condo. The panel starts TowerServer.exe with the official map and arguments, and writes the settings file TowerServer.ini. The login tokens are needed to list the condo, and the panel does not write them: add them on the Settings tab.",
		files: {
			"TowerServer.ini":
				"The condo's settings: its title, the number of players, the two login tokens, the admins (one Steam ID per line) and the save options. The panel writes the title and leaves the tokens empty.",
		},
		notes: [
			"Login tokens: the official guides say both tokens are required to list the condo on the server list. Get the Steam token from the Steam game server management page (App ID 394690) and the Tower token from Tower Unite's server management page. Never share them.",
			"Ports: the panel uses game port 7800 (UDP), because the game's default port 7777 is used by other games in the panel. The query port is fixed at 27016 on the launch line, as the official guide asks. Port 27016 is also the default of Sons of the Forest here, so do not run both with that default.",
			"Stop: the panel closes the server window. The guides name no command that saves the condo before the server stops, so the last changes may not be saved if the server is stopped while players are on it.",
			"Program: TowerServer.exe in the install root starts the real server, Tower/Binaries/Win64/TowerServer-Win64-Shipping.exe.",
			"Bans: the ban list is Tower/Saved/Config/WindowsServer/TowerBans.ini. The guides say to edit it by hand; the panel does not show it.",
			"Condo maps: the panel starts the condo C_Condo. Other maps (such as C_House and C_Studio) are named in the official guide, and their save files go in Tower/Condos/<map name>/.",
		],
	},
};

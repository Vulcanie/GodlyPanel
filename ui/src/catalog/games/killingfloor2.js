import { rows, withChoices } from "../rows.js";

// Killing Floor 2 (Unreal Engine 3). Its settings are INI keys, written `[Section]` then `Key=Value` in KFGame\Config. One file is offered:
//   PCServer-KFGame.ini  the Windows server's game settings. The game writes it itself the first time the server runs, so the panel
//                        does not create it: the form reads it once it exists. The name and the password are written here too.
// Every section name, key, default and choice is from the research dossier (docs/research/games/killingfloor2/02-config.md, 03-launch-args.md),
// whose sources are community guides (XGamingServer's configure page for the Windows keys, Pterodactyl's egg and LinuxGSM for the rest).
// The dossier gives NO engine default or type for any key except as the examples on those pages, so none is written as a default here.
// The Linux files (LinuxServer-KFGame.ini) are not offered: this server is the Windows one.

const BOOL = [
	["false", "No"],
	["true", "Yes"],
];

export const killingfloor2ServerSettings = withChoices(
	rows([
		// Server
		["Engine.GameReplicationInfo::ServerName", "Server name", "The name shown to all players in the server browser.", "Server"],
		["Engine.GameReplicationInfo::ShortName", "Short name", "A shortened name for the server, shown where there is little room.", "Server"],
		["Engine.AccessControl::GamePassword", "Join password", "The password players need to join. Leave it empty for a server anyone can join.", "Server"],
		["Engine.AccessControl::AdminPassword", "Admin password", "The password for logging in as an admin, such as through the web admin page. Choose a long one, and do not use the join password here.", "Server"],

		// Difficulty and waves
		["KFGame.KFGameInfo::GameDifficulty", "Difficulty", "How hard the zombies are. Normal is the easiest.", "Difficulty and waves"],
		["KFGame.KFGameInfo::GameLength", "Game length", "How many waves a game lasts before the players win.", "Difficulty and waves"],

		// Players and lobby
		["KFGame.KFGameInfo::MaxPlayers", "Maximum players", "How many players can join. The research gives 1 to 6 for Survival and 1 to 12 for Versus Survival.", "Players and lobby"],
		["KFGame.KFGameInfo::bDisableKickVote", "Turn off kick votes", "When Yes, players cannot vote to kick someone out of the game.", "Players and lobby"],
		["KFGame.KFGameInfo::bDisableMapVote", "Turn off map votes", "When Yes, players cannot vote on the next map between rounds.", "Players and lobby"],

		// Listing
		["KFGame.KFGameInfo::bDisablePublish", "Hide from the server browser", "When Yes, the server does not appear in the server browser, so only people with its address can find it.", "Listing"],
	]),
	{
		"KFGame.KFGameInfo::GameDifficulty": [
			["0", "Normal"],
			["1", "Hard"],
			["2", "Suicidal"],
			["3", "Hell on Earth"],
		],
		"KFGame.KFGameInfo::GameLength": [
			["0", "Short (4 waves)"],
			["1", "Medium (7 waves)"],
			["2", "Long (10 waves)"],
		],
		"KFGame.KFGameInfo::bDisableKickVote": BOOL,
		"KFGame.KFGameInfo::bDisableMapVote": BOOL,
		"KFGame.KFGameInfo::bDisablePublish": BOOL,
	},
);

export const killingfloor2ServerGroupOrder = ["Server", "Difficulty and waves", "Players and lobby", "Listing"];

const guide = {
	name: "Killing Floor 2",
	short: "Killing Floor 2",
	summary:
		"Killing Floor 2 keeps its settings in `PCServer-KFGame.ini` in the `KFGame\\Config` folder of the server. The game makes that file the first time the server runs, so the form is available after the first start. The map and the two ports are set when the server is created.",
	files: {
		"PCServer-KFGame.ini": "The server's name, its join and admin passwords, the difficulty and wave count, the player limit, the votes and whether the server is listed in the server browser.",
	},
	notes: [
		"Start the server once before changing anything here: the game writes this file on its first run, and the research advises against creating it by hand first. Stop the server before you save a change, or the game may overwrite it when it stops.",
		"The server's executable name for Windows (KFServer.exe) is not confirmed by any page the research read. If the server does not start, check the name in the Binaries\\Win64 folder.",
		"The panel has no way to type into the server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no safe stop command for Windows.",
		"Workshop maps and the web admin page are not set up by this form. The research found the Workshop settings in two different files, so they are not offered.",
		"Several settings the research named have no stated default or range. They are not in the form; a value you type in the file by hand is kept.",
	],
};

export default {
	type: "killingfloor2",
	title: "Killing Floor 2",
	files: {
		"PCServer-KFGame.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: {
				"Engine.GameReplicationInfo": "Server name",
				"Engine.AccessControl": "Passwords",
				"KFGame.KFGameInfo": "Game rules",
			},
			settings: killingfloor2ServerSettings,
			groupOrder: killingfloor2ServerGroupOrder,
			mayBeMissing: "The game makes PCServer-KFGame.ini the first time the server runs. Start the server once; until then this file is not there, and the form has nothing to show.",
		},
	},
	// The start line is written by the panel, so there is no Launch options form.
	launch: null,
	guide,
};

import { rows, withChoices } from "../rows.js";

// Assetto Corsa, the stock dedicated server (dossier: docs/research/games/assettocorsa/, confidence low). The settings are the key=value
// lines of cfg\server_cfg.ini, under [SERVER], [ASSIST_RULES] and [REALISM]. Key names come from the sources' tables. No source is
// official, and the sources disagree on several defaults, so no default is shown and the conflicting keys (ABS, the dynamic track,
// the session times, the pickup mode defaults) are left out. The session sections and the car slots (entry_list.ini) are not in this form.

const settings = withChoices(
	rows([
		["SERVER::NAME", "Server name", "The name shown in the server browser. The panel writes it from the Server Name you typed when you created the server.", "Server"],
		["SERVER::PASSWORD", "Join password", "The password players type to join. Leave it empty for a public server.", "Server"],
		["SERVER::ADMIN_PASSWORD", "Admin password", "The password a player types in the game to get admin commands. Leave it empty to turn admin commands off.", "Server"],
		["SERVER::REGISTER_TO_LOBBY", "Show in the server browser", "Whether the server is listed in the public server browser. 1 lists it; 0 keeps it hidden.", "Server"],
		["SERVER::TRACK", "Track", "The track folder name the server races on, such as monza. The name must match a track installed in the server's content folder.", "Server"],
		["SERVER::CONFIG_TRACK", "Track layout", "The layout of the track, if the track has more than one. Leave it empty for the default layout.", "Server"],
		["SERVER::SUN_ANGLE", "Time of day", "The sun's angle, from -80 to 80. Higher values give a later time of day; about 16 is afternoon.", "Server"],
		["SERVER::MAX_CLIENTS", "Most players", "The most players who can be on the server at once. The sources advise 24 or fewer, and say it must match the number of car slots in entry_list.ini.", "Players"],
		["SERVER::PICKUP_MODE_ENABLED", "Pick up any free car", "Whether any player can take any free car slot of a matching model. 1 allows it; 0 locks each slot to its own entry.", "Players"],
		["SERVER::UDP_PORT", "Game port (UDP)", "The UDP port the server uses for the game. It must match the port you forward, and the panel's Game Port.", "Network"],
		["SERVER::TCP_PORT", "Game port (TCP)", "The TCP port the server uses for the game. The sources say it must be the same number as the UDP port.", "Network"],
		["SERVER::HTTP_PORT", "HTTP port (TCP)", "The TCP port the server's HTTP side uses. The panel's HTTP Port. The sources disagree on what it is for, but agree on the number.", "Network"],
		["SERVER::LOOP_MODE", "Restart after the race", "Whether sessions restart after the race. 1 restarts the sessions; 0 closes the server after the race.", "Race"],
		["SERVER::RACE_OVER_TIME", "Time after the winner (seconds)", "How many seconds the others have after the winner finishes before the race ends for them.", "Race"],
		["SERVER::ALLOWED_TYRES_OUT", "Wheels allowed off track", "How many wheels may be off the track before a penalty, from 0 to 4. -1 means no limit.", "Race"],
		["SERVER::VOTING_QUORUM", "Vote needed to pass (%)", "The percentage of players who must vote for a vote to pass.", "Votes"],
		["SERVER::VOTE_DURATION", "Vote length (seconds)", "How many seconds a vote stays open.", "Votes"],
		["SERVER::KICK_QUORUM", "Vote needed to kick (%)", "The percentage of players who must vote for a kick to pass.", "Votes"],
		["ASSIST_RULES::TC_ALLOWED", "Traction control", "Which traction control players may use: off, factory settings only, or any setting.", "Assists"],
		["ASSIST_RULES::STABILITY_ALLOWED", "Stability control", "Whether stability control is allowed. 1 allows it; 0 turns it off.", "Assists"],
		["ASSIST_RULES::AUTOCLUTCH_ALLOWED", "Automatic clutch", "Whether the automatic clutch is allowed. 1 allows it; 0 turns it off.", "Assists"],
		["REALISM::TYRE_WEAR_RATE", "Tyre wear (%)", "How fast tyres wear: 0 for no wear, 100 for realistic wear.", "Realism"],
		["REALISM::FUEL_RATE", "Fuel use (%)", "How fast fuel is used: 0 for no fuel use, 100 for realistic use.", "Realism"],
		["REALISM::DAMAGE_MULTIPLIER", "Damage (%)", "How much damage cars take: 0 for none, 100 for realistic damage.", "Realism"],
	]),
	{
		"SERVER::REGISTER_TO_LOBBY": [["0", "Hidden"], ["1", "Listed"]],
		"SERVER::PICKUP_MODE_ENABLED": [["0", "Locked slots"], ["1", "Any free car"]],
		"SERVER::LOOP_MODE": [["0", "Close after the race"], ["1", "Restart sessions"]],
		"ASSIST_RULES::TC_ALLOWED": [["0", "Off"], ["1", "Factory settings only"], ["2", "Any setting"]],
		"ASSIST_RULES::STABILITY_ALLOWED": [["0", "Not allowed"], ["1", "Allowed"]],
		"ASSIST_RULES::AUTOCLUTCH_ALLOWED": [["0", "Not allowed"], ["1", "Allowed"]],
	},
);

const groupOrder = ["Server", "Players", "Network", "Race", "Votes", "Assists", "Realism"];

const guide = {
	name: "Assetto Corsa",
	short: "Assetto Corsa",
	summary:
		"Assetto Corsa's stock server is acServer.exe, started by the panel's start script with no arguments. Its settings are in cfg\server_cfg.ini, which the panel writes with the name and the ports, then this form edits.",
	files: {
		"server_cfg.ini": "The server's settings: the name, the track, the ports, the rules, the assists and the realism settings. The [SERVER] section is the one the panel starts from.",
	},
	notes: [
		"The panel writes only the name, the two game ports, the HTTP port, and a few other [SERVER] keys when it creates the server. The other keys are at the game's own defaults, which the sources do not agree on.",
		"The car slots are in cfg\entry_list.ini, which the panel does not write or show. Without a slot for each car, players may not be able to join: check this on your server, and add the cars by hand (the sources name the MODEL key, with the car's folder name).",
		"The session times (practice, qualifying, race) are in the same file under their own sections, which this form does not show. The sources' sample file has them, so add them by hand if the server does not start a session.",
		"The cars and tracks are folders in the server's content folder. The server does not include them; copy them from a licensed copy of the game. Every player needs the same cars and track.",
		"The panel's Stop closes the server window. The game's own stop is not documented, so back up the cfg folder before you stop or update.",
		"Not confirmed: whether the Steam server install works without an account that owns the game. The sources say the account must own it.",
	],
};

export default {
	type: "assettocorsa",
	title: "Assetto Corsa",
	files: {
		"server_cfg.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: {
				SERVER: "Server",
				ASSIST_RULES: "Assists",
				REALISM: "Realism",
			},
			settings,
			groupOrder,
			mayBeMissing:
				"The panel writes cfg\server_cfg.ini in the server's folder when it creates the server. If it is missing, start the server once, or create the file with a [SERVER] section, then reload this page.",
		},
	},
	launch: null,
	guide,
};

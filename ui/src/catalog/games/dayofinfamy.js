import { rows, withChoices } from "../rows.js";

// Day of Infamy (Source engine). Its settings are "convars": Source console variables, one `name value` per line in a .cfg file, the
// same shape as Counter-Strike: Source's, so the panel's convar reader handles them. One file is offered:
//   server.cfg  in doi\cfg. The panel writes it with the server's name, the password and sv_lan 0 when it creates the server. Where the
//               game reads it from is UNVERIFIED (see docs/research/games/dayofinfamy/05-implementation-notes.md).
// Source of every name and description: the sample server.cfg the dossier cites (GameServerManagers' doi/server.cfg,
// docs/research/games/dayofinfamy/02-config.md). Its descriptions are the sample's own words, made plainer. The sample gives no type,
// range or engine default for any key, so none is written here; the sample's values are not engine defaults.

const BOOL = [
	["0", "Off"],
	["1", "On"],
];

export const dayofinfamyServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name people see in the server browser. The panel writes it when it creates the server.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a server anyone can join.", "Server"],
		["sv_lan", "Local network only", "Makes this a LAN server: the server does not list itself online and does not check players' accounts. Keep it off for a server friends join over the internet.", "Server"],
		["doi_bot_quota", "Bots per team when empty", "How many bots to place on each team when no players are present.", "Server"],

		// Voice and spectating
		["sv_voiceenable", "Voice chat", "Turns voice communication between players on or off.", "Voice and spectating"],
		["sv_alltalk", "Everyone hears everyone", "When on, players can hear all other players, with no team restrictions.", "Voice and spectating"],
		["mp_allowspectators", "Allow spectators", "Turns spectator mode on or off, so people can watch without playing.", "Voice and spectating"],

		// Team rules
		["mp_teamplay", "Team play", "Turns team-based play on or off.", "Team rules"],
		["mp_autoteambalance", "Balance teams automatically", "Lets the game balance the two teams by itself in team play: when on, it moves players so the sides stay even.", "Team rules"],
		["mp_friendlyfire", "Friendly fire", "Lets team members injure each other. Leave it off for a friendly server.", "Team rules"],

		// Player rules
		["mp_falldamage", "Fall damage", "Turns damage from falls on or off.", "Player rules"],
		["mp_forcerespawn", "Force respawn", "Makes every player respawn when they die, so nobody waits to come back.", "Player rules"],

		// Map and timers
		["mp_timelimit", "Time per map (minutes)", "Game time per map, in minutes, before the map ends.", "Map and timers"],
		["mp_fraglimit", "Kill limit", "The number of kills at which the map ends.", "Map and timers"],
		["mp_timer_preround", "Pre-round timer (seconds)", "How long the countdown lasts before each round starts, in seconds.", "Map and timers"],
		["mp_timer_postround", "Post-round timer (seconds)", "How long the screen waits after a round ends before the next one, in seconds.", "Map and timers"],
	]),
	{
		sv_lan: BOOL,
		sv_voiceenable: BOOL,
		sv_alltalk: BOOL,
		mp_allowspectators: BOOL,
		mp_teamplay: BOOL,
		mp_autoteambalance: BOOL,
		mp_friendlyfire: BOOL,
		mp_falldamage: BOOL,
		mp_forcerespawn: BOOL,
	},
);

export const dayofinfamyServerGroupOrder = ["Server", "Voice and spectating", "Team rules", "Player rules", "Map and timers"];

const guide = {
	name: "Day of Infamy",
	short: "Day of Infamy",
	summary:
		"Day of Infamy's settings are console lines (`name value`) in `server.cfg`. The panel writes that file with the server's name, the password and `sv_lan 0` when it creates the server, and the launch line points the server at it. The map and the game port are set when the server is created.",
	files: {
		"server.cfg": "The server's name and password, whether it is a LAN server, voice and spectating, team and player rules, and the time limits. Only the lines you set are in the file.",
	},
	notes: [
		"The file's location and whether the game reads it from there are not confirmed: the research found no page that says where the dedicated server reads its settings. Check after the first start that a change you make here takes effect.",
		"The research found no engine defaults for these settings, and the sample file they come from uses its own values. The form does not show a default.",
		"The panel has no way to type into the server's console, so Stop closes its window and, after 15 seconds, ends the program. No stop command is documented.",
		"Mods are not set up: the research did not find a way for a dedicated server to load Workshop mods.",
		"The map and the game mode are the ones the panel starts with (sicily, frontline). Other maps are not offered in the form.",
	],
};

export default {
	type: "dayofinfamy",
	title: "Day of Infamy",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: dayofinfamyServerSettings,
			groupOrder: dayofinfamyServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the doi\\cfg folder when it creates the server. If it is missing, it is made when you save a setting here: each line is a setting name and its value, such as hostname \"My Server\".",
		},
	},
	// The start line is written by the panel, so there is no Launch options form.
	launch: null,
	guide,
};

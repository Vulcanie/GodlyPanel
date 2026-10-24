import { rows, withChoices } from "../rows.js";

// Day of Dragons (dossier: docs/research/games/dayofdragons/, confidence medium). The settings are the keys of the developer's own
// post, which the dossier quotes (02-config.md). Keys whose sources disagree on the name or the default are left out: the whitelist
// and ban list keys, bUseFriendsList and bChatShowClanTags (their defaults conflict), bForceLAN (the developer marks it untested),
// and sServerMOTD and sServerDiscord (the game wants them in quotes, and the form's quoting is not verified). Also left out:
// sServerFriends, sServerAdmins, sServerBanned and sChatFilter (repeated lines the form does not handle).

const TRUE_FALSE = [
	["False", "Off"],
	["True", "On"],
];

const SECTION = "/game/_dev/runtime/classes/dragonsgi.dragonsgi_c";
const GROUP_RULES = "Game rules";
const GROUP_PLAYERS = "Players and clans";
const GROUP_TIME = "Corpses, saves and restarts";
const GROUP_ACCESS = "Access and chat";

const settingRows = rows([
	["iServerType", "Server type", "What kind of fighting is allowed: 0 is PvP (players can fight anyone), 1 is PvE (no player fighting), 2 is DvE (only faction PvP), 3 is CvC (only faction and clan PvP).", GROUP_RULES],
	["sMap", "Map", "The map the server loads. The developer lists sv_Forest, the Forgotten Forest survival map, and test, a map with a PvP arena for deathmatch.", GROUP_RULES],
	["iGrowthRateMultiplier", "Growth speed", "How fast young dragons grow. This only applies when growth is on (Disable growth is off).", GROUP_RULES],
	["bDisableGrowth", "Disable growth", "When on, growth is turned off and every egg hatches into an adult-sized dragon.", GROUP_RULES],
	["bForceNormalizedEggStats", "Normal egg stats", "When on, every egg spawns with the same stats, so no player gets a random genetic advantage when they start.", GROUP_RULES],
	["bDisableNesting", "Disable nesting", "When on, players cannot nest to get skins or to raise their stats.", GROUP_RULES],
	["bForceSameSpeciesGroups", "Same species groups only", "When on, only dragons of the same species can group together. The developer says this does not work on CvC servers.", GROUP_RULES],
	["bFlagHatchlingKillers", "Flag hatchling killers", "When on, an adult or elder dragon that kills a hatchling gets red glowing eyes for 20 minutes. Works only on PvP servers.", GROUP_RULES],
	["bEnableGroupDamage", "Group members can hurt each other", "When on, members of the same group can damage each other, if they are in PvP or flagged.", GROUP_RULES],
	["bDisableGlobalChat", "Disable global chat", "When on, players who are not admins cannot use the global chat.", GROUP_RULES],
	["iMaxPlayers", "Max players", "The most players who can be on the server at once. The developer's range is 1 to 200, and recommends no more than 100 for the best performance.", GROUP_PLAYERS],
	["iMaxClans", "Max clans", "How many clans the server allows. 0 turns clan creation off; the developer's range is 2 to 255.", GROUP_PLAYERS],
	["iMaxClanMembers", "Max clan members", "The most members one clan may have. This needs Max clans to be above 0. The developer's range is 10 to 1000.", GROUP_PLAYERS],
	["iMaxLatencyMS", "Max ping (ms)", "The highest ping a player may have, in milliseconds, before the server kicks them. 0 turns the check off; otherwise the range is 120 to 800.", GROUP_PLAYERS],
	["bAlwaysShowPlayerTags", "Always show name tags", "When on, every player's name tag shows, not only the tags of players in your group or clan.", GROUP_PLAYERS],
	["bAlwaysShowAdminTags", "Always show admin tags", "When on, admin tags show to every player on the server.", GROUP_PLAYERS],
	["bRoleplay", "Roleplay tag", "When on, the server is listed with the RP tag in the server browser, and the roleplay features, such as custom names, are turned on.", GROUP_PLAYERS],
	["iCorpseDespawnTime", "Corpse removal time (seconds)", "How long a corpse stays on the server before it is removed. The developer's range is 60 to 1500 seconds; hosting guides quote a much larger maximum.", GROUP_TIME],
	["iAutoSaveSeconds", "Save every (seconds)", "How often the server saves, in seconds. The developer's range is 60 to 3600.", GROUP_TIME],
	["iDailyRestartHour", "Daily restart hour (UTC)", "The hour, in UTC, when the server restarts each day. 0 turns the daily restart off; 1 to 24 pick the hour.", GROUP_TIME],
	["sServerPassword", "Server password", "The password players must type to join. Empty means no password. With a password set, admins use /admin password to reach the admin panel.", GROUP_ACCESS],
]);

const choices = withChoices(settingRows, {
	iServerType: [
		["0", "PvP"],
		["1", "PvE"],
		["2", "DvE (faction PvP only)"],
		["3", "CvC (faction and clan PvP only)"],
	],
	sMap: { choices: [["sv_Forest", "Forgotten Forest (survival)"], ["test", "Test map (PvP arena)"]], allowCustom: true },
	iGrowthRateMultiplier: [
		["0", "0.5x"],
		["1", "1.0x (default)"],
		["2", "1.5x"],
		["3", "2.0x"],
	],
	bDisableGrowth: TRUE_FALSE,
	bForceNormalizedEggStats: TRUE_FALSE,
	bDisableNesting: TRUE_FALSE,
	bForceSameSpeciesGroups: TRUE_FALSE,
	bFlagHatchlingKillers: TRUE_FALSE,
	bEnableGroupDamage: TRUE_FALSE,
	bDisableGlobalChat: TRUE_FALSE,
	bAlwaysShowPlayerTags: TRUE_FALSE,
	bAlwaysShowAdminTags: TRUE_FALSE,
	bRoleplay: TRUE_FALSE,
});

const settings = {};
for (const [key, meta] of Object.entries(choices)) settings[`${SECTION}::${key}`] = meta;

export default {
	type: "dayofdragons",
	title: "Day of Dragons",
	files: {
		"Game.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: { [SECTION]: "Server settings" },
			settings,
			groupOrder: [GROUP_RULES, GROUP_PLAYERS, GROUP_TIME, GROUP_ACCESS],
			mayBeMissing:
				"The panel creates this file with the section header when it creates the server. If it is missing, the panel writes it again with the header the developer gives; the game's own defaults apply to every other key.",
		},
	},
	launch: null,
	guide: {
		name: "Day of Dragons",
		short: "Day of Dragons",
		summary:
			"Day of Dragons' settings are in Game.ini, under the developer's section header. The panel creates the file with that header when it creates the server, and the Settings tab edits the keys the developer documents. The server's name is set at start with -SteamServerName.",
		files: {
			"Game.ini": "The server's settings, under one section header. Stop the server before you edit it, so the running game cannot overwrite your change.",
		},
		notes: [
			"Not checked on a real install. Before relying on this server, run it once and check the items in the server's implementation notes.",
			"Port: the panel passes it as -QueryPort. The server opens no game port of its own (players connect through Steam), so this is the port the server list and the online check use.",
			"Stop: no quit command or RCON is documented. The panel closes the server's window and, after 15 seconds, ends it, so the last few minutes may not be saved.",
			"Settings the developer documents are in the Settings tab. Keys from other hosting guides are left out, because their names and defaults conflict with the developer's.",
			"Mods: no mod support is documented for the dedicated server, so the panel adds no mod setting.",
		],
	},
};

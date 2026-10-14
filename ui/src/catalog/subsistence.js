import { rows, withChoices } from "./rows.js";

// Subsistence: UDKGame\Config\UDKDedServerSettings.ini. The game writes the file itself the first time the server starts, with a
// comment above every setting; the wording below follows those comments. Everything is under one section.

export const SUBSISTENCE_SECTION = "ColdGame.ColdDedServerSettings";

export const subsistenceSettings = withChoices(
	rows([
		["ServerName", "Server name", "The name shown in the in-game server list. 64 characters at most.", "Server"],
		["ServerDescription", "Description", "A short text shown when a player clicks the server in the list. 256 characters at most.", "Server"],
		["HostedByName", "Hosted by", "The name shown in the server list as the one running the server. 64 characters at most.", "Server"],
		["Password", "Password", "What players must type to join. Leave empty to let anyone join.", "Server"],
		["AdminPassword", "Admin password", "The password admins use to sign in to the server from inside the game.", "Server"],
		["MaxPlayers", "Max players", "The most players that can be on at once, from 1 to 32.", "Server"],
		["ProfileId", "Save slot", "The server can keep five separate saves; this picks which one it uses, from 1 to 5.", "Server"],
		["Mods", "Mods", "The mods to run, separated by commas. Each is either a mod's id or a Steam Workshop item number (the number at the end of its Workshop page address). Workshop mods are downloaded and updated every time the server starts.", "Server"],

		["Difficulty", "Difficulty", "How hard the game is.", "World"],
		["DaysPerYear", "Days per year", "How many in-game days make a year. Fewer means the seasons change faster.", "World"],
		["MonthOverride", "Start month", "Starts the server in a particular month instead of the one stored in the save. The game puts this back to -1 after it starts, and uses the save's month from then on.", "World"],
		["HuntersEnabled", "Hunters", "Turns on the hunters, the enemies that go after players.", "World"],
		["HunterAttacks", "Hunter attacks", "How often the hunters attack.", "World"],

		["PvPDamage", "Players can hurt each other", "Lets players damage other players.", "Players and bases"],
		["PlayersCanDamagePlayerBases", "Players can damage other bases", "Lets players damage buildings other players placed.", "Players and bases"],
		["PlayersCanAccessEnemyPlayerBaseItems", "Players can open other bases' storage", "Lets players use another base's storage chests, refineries and similar items. Doors and windows are not affected.", "Players and bases"],
		["OfflineBaseProtection", "Protect bases while their owners are offline", "Keeps a base from taking damage while nobody from it is online (within range of a base control unit or range extender). Protection starts 10 minutes after the last member signs off. It does not stop base decay.", "Players and bases"],
		["NumPlayerOfflineHoursBeforeBaseDecay", "Hours offline before a base decays", "How many real hours a player and their team can be away before their base starts to decay. 0 means bases never decay. 96 is four days. A limit is recommended for public servers so old bases get cleared.", "Players and bases"],
		["AllowBuildableClipping", "Allow buildings to overlap", "Lets players place buildings so they clip through each other.", "Players and bases"],
	]),
	{
		Difficulty: [["easy", "Easy"], ["normal", "Normal"], ["hardcore", "Hardcore"]],
		HunterAttacks: [["0", "Normal attacks"], ["1", "Revenge attacks only"], ["2", "No attacks"]],
		DaysPerYear: { choices: ["12", "24", "36", "48", "60", "90", "120", "200", "365"], allowCustom: true },
		MonthOverride: [["-1", "Use the save's month"], ["0", "January"], ["1", "February"], ["2", "March"], ["3", "April"], ["4", "May"], ["5", "June"], ["6", "July"], ["7", "August"], ["8", "September"], ["9", "October"], ["10", "November"], ["11", "December"]],
	},
);

export const subsistenceGroupOrder = ["Server", "World", "Players and bases"];

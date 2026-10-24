import { rows } from "../rows.js";

// The Isle (Evrima branch): one Unreal .ini file, Game.ini, in TheIsle\Saved\Config\WindowsServer inside the server's install folder.
// The keys and their defaults come from the research dossier (docs/research/games/theisle/02-config.md), whose sources are community
// guides (xgamingserver, supercraft, physgun, gamehostbros); no official page was read. The descriptions are the dossier's, in plain
// words. Left out, on purpose:
//  - the keys whose sources disagree (bQueueEnabled, QueuePort, RconPort) and the AllowedClasses lines (their section is disputed);
//  - the RCON keys: the game's RCON uses a custom protocol, and the panel does not speak it;
//  - the admin, whitelist and VIP lists (AdminsSteamIDs, WhitelistIDs, VIPs): they take one line per SteamID64 and are under a second
//    section header that the sources write in two different cases. The guide says how to add them by hand;
//  - Engine.ini: the Epic Online Services credentials are needed for the server to show in the browser, but the dossier gives no value
//    it can stand behind, so the panel does not offer that file (the guide explains the step).
// The game's launch line has no settings the form should change (the panel writes ?Port= and -log), so there is no Launch options form.

export const SESSION_SECTION = "/Script/TheIsle.TIGameSession";

const TRUE_FALSE = [
	["true", "Yes"],
	["false", "No"],
];

const settingRows = rows([
	["ServerName", "Server name", "The name players see in the in-game server browser. The panel fills it in when it creates the server.", "Server"],
	["MaxPlayerCount", "Player limit", "The most players that can be on the server at once. The game's default is 100. More players need more memory and processor.", "Server"],
	["MapName", "Map", "The map the server loads. Gateway is the only official Evrima map, so leave it as Gateway unless you know another map name is installed.", "Server"],
	["Discord", "Discord invite", "A Discord invite link that players see. Leave it empty if you have none.", "Server"],

	["bServerPassword", "Require a join password", "Turns on the join password below. Off means anyone can join.", "Access"],
	["ServerPassword", "Join password", "The password players type to join. It is only used when the setting above is on.", "Access"],
	["bServerWhitelist", "Whitelist only", "Only the Steam accounts on the server's whitelist can join. Add the IDs by hand, as the guide explains.", "Access"],

	["GrowthMultiplier", "Dinosaur growth speed", "How fast young dinosaurs grow up. 1 is the game's normal speed. The guide says to keep it below 20, because higher numbers break growth.", "Gameplay"],
	["CorpseDecayMultiplier", "Corpse decay speed", "How fast dead bodies disappear. 1 is the default; a higher number makes them disappear sooner.", "Gameplay"],
	["bEnableHumans", "Allow human characters", "Lets players play as humans as well as dinosaurs. Off by default.", "Gameplay"],
	["bEnableDiets", "Diet system", "Turns on the diet system, which decides what herbivores and carnivores can eat. On by default.", "Gameplay"],
	["bEnableMutations", "Mutations", "Turns on the mutation system, which gives dinosaurs random traits. On by default.", "Gameplay"],
	["bAllowReplay", "Allow replays", "Lets players record replays on the server. Off by default.", "Gameplay"],
	["bUseRegionSpawning", "Region spawning", "Limits where players can spawn to certain regions of the map. Off by default.", "Gameplay"],

	["bSpawnAI", "Spawn AI creatures", "Spawns the AI creatures that carnivores hunt for food. On by default.", "Wildlife"],
	["AIDensity", "AI creature density", "How many AI creatures spawn, as a multiplier of the default. 1 is the default.", "Wildlife"],
	["AISpawnInterval", "AI spawn check (seconds)", "Seconds between checks for spawning AI creatures. The default is 40.", "Wildlife"],
	["bSpawnPlants", "Spawn plants", "Spawns the plants that herbivores eat. On by default.", "Wildlife"],
	["PlantSpawnMultiplier", "Plant density", "How many plants grow, as a multiplier of the default. 1 is the default.", "Wildlife"],

	["ServerDayLengthMinutes", "Day length (minutes)", "How long the daytime lasts, in real minutes. The default is 45.", "Time and weather"],
	["ServerNightLengthMinutes", "Night length (minutes)", "How long the night lasts, in real minutes. The default is 20, shorter than the day on purpose.", "Time and weather"],
	["bServerDynamicWeather", "Changing weather", "Changes the weather over time. On by default.", "Time and weather"],
	["MinWeatherVariationInterval", "Shortest time between weather changes (seconds)", "The shortest time, in seconds, before the weather changes. The default is 600.", "Time and weather"],
	["MaxWeatherVariationInterval", "Longest time between weather changes (seconds)", "The longest time, in seconds, before the weather changes. The default is 900.", "Time and weather"],

	["bEnableMigration", "Migration zones", "Turns on the migration zones, where herds move around the map. On by default.", "Migration and patrols"],
	["MaxMigrationTime", "Migration zone duration (seconds)", "How long a migration zone stays active, in seconds. The default is 5400 (1.5 hours).", "Migration and patrols"],
	["bEnableMassMigration", "Mass migrations", "Turns on the larger migration events that happen every so often. On by default.", "Migration and patrols"],
	["MassMigrationTime", "Time between mass migrations (seconds)", "Seconds between mass migration events. The default is 43200 (12 hours).", "Migration and patrols"],
	["bEnablePatrolZones", "Carnivore patrol zones", "Turns on the zones where carnivores patrol. On by default.", "Migration and patrols"],
]);

// Booleans: every setting whose key starts with b is a Yes/No choice.
for (const [key, meta] of Object.entries(settingRows)) {
	if (/^b[A-Z]/.test(key)) meta.options = TRUE_FALSE.map(([value, label]) => ({ value, label }));
}

const settings = Object.fromEntries(Object.entries(settingRows).map(([key, meta]) => [`${SESSION_SECTION}::${key}`, meta]));

export default {
	type: "theisle",
	title: "The Isle (Evrima)",
	files: {
		"Game.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: { [SESSION_SECTION]: "Server settings" },
			settings,
			groupOrder: ["Server", "Access", "Gameplay", "Wildlife", "Time and weather", "Migration and patrols"],
			mayBeMissing:
				"The panel writes this file when it creates the server. The game makes its own Game.ini on its first start, and the dossier does not say whether it keeps one written before that. If the file is gone, start the server once, stop it, and fill the settings in again.",
		},
	},
	launch: null,
	guide: {
		name: "The Isle (Evrima)",
		short: "The Isle",
		summary:
			"The Isle (Evrima) keeps its settings in `TheIsle\\Saved\\Config\\WindowsServer\\Game.ini`, inside the server's folder. The panel writes the name and join password when it creates the server, and the Settings tab edits the rest. Changes apply the next time the server starts.",
		files: {
			"Game.ini": "The server's name, map, join password, dinosaur growth and wildlife, day and night, weather and migration. The settings are in the `[/Script/TheIsle.TIGameSession]` section.",
		},
		notes: [
			"**Stop the server before you edit.** The game writes its settings again when it shuts down, so changes made while it runs are lost. The panel stops the server by closing its window; the game documents no save command, so a stop may lose the time since the game last saved.",
			"**The server does not start without Epic Online Services credentials.** It exits within seconds with \"Unable to initialize EOS platform\" until they are in `Engine.ini`. Add a `[EpicOnlineServices]` section to `Engine.ini` in the same folder, with `DedicatedServerClientId` and `DedicatedServerClientSecret`. The panel does not write them. The sources disagree on whether these values are shared by every server or set for each host, so take them from your own host or template, not from a guide.",
			"**Admins and the whitelist are not in the Settings tab.** Put Steam64 IDs, one per line, under `AdminsSteamIDs`, `WhitelistIDs` or `VIPs` in a `[/Script/TheIsle.TIGameStateBase]` section of `Game.ini` (the guides write that section name in lower case, which the dossier leaves unresolved). Put these IDs in that section, not in the game session section, or the game ignores them.",
			"**Players must be on the same beta branch.** A player on the default (Legacy) build cannot see an Evrima server. The panel installs and updates the server on the `evrima` beta, so do not change that by hand.",
			"**Mods** are not set up by the panel. The sources describe PAK and SIG files in the game's `Content\\Paks` folder, and UE4SS mods on a Windows server, but they disagree on the folder. Steam Workshop mod IDs no longer work. Every player needs the same mods.",
			"**Ports:** the server listens on the game port (UDP) the panel gives it, and the guides say the query uses the same port. Some guides suggest also opening 7778 and 7779, and the game's queue and RCON ports are chosen by the server, so a second server on this PC may need its own range of ports.",
			"The research could not confirm which process stays running after `TheIsleServer.exe` starts, that a pre-written `Game.ini` survives the first start, or where the saves are kept.",
		],
	},
};

import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// HumanitZ (dossier: docs/research/games/humanitz/, confidence medium). The settings are GameServerSettings.ini, with the sections
// [Host Settings] and [World Settings]. Descriptions are the shipped REF_GameServerSettings.ini's own comments, from the wiki's
// configuration page, in plain words; the few keys with no comment there use the XGamingServer or Supercraft wording the dossier cites.
// Left out on purpose: SaveName and RCON (no page explains them well enough; the panel does not use RCON, and RCONPass would be
// stored in plain text), Version (the build ID, which the game updates itself), the map segment sizes (performance tuning the wiki
// says to leave alone), and the weather odds (no page says what the numbers mean).

const TRUE_FALSE = [
	["false", "Off"],
	["true", "On"],
];
const DIFFICULTY = [
	["0", "Very easy"],
	["1", "Easy"],
	["2", "Default"],
	["3", "Hard"],
	["4", "Very hard"],
	["5", "Nightmare"],
];
const RARITY = [
	["0", "Scarce"],
	["1", "Low"],
	["2", "Default"],
	["3", "Plentiful"],
	["4", "Abundant"],
];
const RARITY_NOTE = "How much of this kind of loot there is: 0 scarce, 1 low, 2 default, 3 plentiful, 4 abundant.";

const hostRows = rows([
	["ServerName", "Server name", "The name shown in the server browser. Avoid the word \"Official\" in it, or the server may not start or show up in the list.", "Server"],
	["SearchID", "Search group", "A tag that puts the server in a group players can search for. Changing it hides the server from the default list, so players must search for this tag.", "Server"],
	["MaxPlayers", "Max players", "The most players who can be on at once. The game's default is 16.", "Players"],
	["ReserveSlots", "Reserved slots", "How many places are kept for certain players, listed by their NetID in F_ReservedSlots.txt. 0 turns reserved slots off.", "Players"],
	["Password", "Join password", "The password players must type to join. Leave it empty for a public server.", "Access"],
	["AdminPass", "Admin password", "The password an admin types in the game (with /adminaccess) to use the admin commands.", "Access"],
	["UseGlobalBanList", "Use the global ban list", "When on, the server turns away players the game has banned from its official servers.", "Access"],
	["NoDeathFeedback", "Hide death notices", "When on, players do not get a notice when someone dies. Admins still see them.", "Messages"],
	["NoJoinFeedback", "Hide join and leave notices", "When on, players do not get a notice when someone joins or leaves. Admins still see them.", "Messages"],
	["LimitedSpawns", "Limited spawn points", "When on, players only spawn at the random coast spawns and the spawn point, if there is one.", "Messages"],
]);

const hostSettings = withChoices(hostRows, {
	UseGlobalBanList: TRUE_FALSE,
	NoDeathFeedback: TRUE_FALSE,
	NoJoinFeedback: TRUE_FALSE,
	LimitedSpawns: TRUE_FALSE,
});

const worldRows = rows([
	["XpMultiplier", "Experience multiplier", "How fast players gain experience. 1 is the default, 2 is twice as fast, 0.5 is half as fast.", "Progress"],
	["PermaDeath", "Permanent death", "When on, a player who dies loses the character and must make a new one.", "Progress"],
	["OnDeath", "What you lose when you die", "What a player loses on death: 0 nothing, 1 the backpack and the weapon in hand, 2 also the pockets and backpack, 3 also the equipment.", "Progress"],
	["RespawnTimer", "Respawn wait (seconds)", "How long a player waits after dying before they can spawn again.", "Progress"],
	["LogoutTimer", "Logout wait (seconds)", "How long a player must wait before they can log out, when PvP is on. 0 turns the wait off.", "Progress"],
	["PVP", "PvP", "On: players can hurt each other. This also decides whether players can interact with other players' items, such as cars and containers.", "Combat"],
	["AirDrop", "Air drops", "When on, air drops with loot land on the map.", "Loot"],
	["AirDropInterval", "Air drop interval (game days)", "How many game days pass between air drops.", "Loot"],
	["WeaponBreak", "Weapons break", "When on, a weapon breaks and is removed from the inventory when its durability reaches 0%. Off turns weapon breaking off.", "Combat"],
	["MaxOwnedCars", "Cars a player can own", "How many cars a player may claim. Cars that nobody has claimed cannot be driven, but they can be looted.", "Combat"],
	["ZombieDiffHealth", "Zombie health", "How tough the zombies are: 0 very easy to 5 nightmare, 2 is the default.", "Difficulty"],
	["ZombieDiffSpeed", "Zombie speed", "How fast the zombies move: 0 very easy to 5 nightmare, 2 is the default.", "Difficulty"],
	["ZombieDiffDamage", "Zombie damage", "How hard the zombies hit: 0 very easy to 5 nightmare, 2 is the default.", "Difficulty"],
	["HumanHealth", "Bandit health", "How tough the human bandits are: 0 very easy to 5 nightmare, 2 is the default.", "Difficulty"],
	["HumanSpeed", "Bandit speed", "How fast the human bandits move: 0 very easy to 5 nightmare, 2 is the default.", "Difficulty"],
	["HumanDamage", "Bandit damage", "How hard the human bandits hit: 0 very easy to 5 nightmare, 2 is the default.", "Difficulty"],
	["ZombieAmountMulti", "Zombie amount", "Multiplies the number of zombies. 2 is twice as many, 0.5 is half.", "Population"],
	["HumanAmountMulti", "Bandit amount", "Multiplies the number of human bandits. 2 is twice as many, 0.5 is half.", "Population"],
	["ZombieDogMulti", "Zombie dog amount", "Multiplies the number of zombie dogs, which mainly appear at night. 2 is twice as many, 0.5 is half.", "Population"],
	["AnimalMulti", "Animal amount", "Multiplies the number of animals. The default is 1.", "Population"],
	["ZombieRespawnTimer", "Zombie respawn (minutes)", "How long it takes zombies to respawn. 0 turns zombie respawning off.", "Population"],
	["HumanRespawnTimer", "Bandit respawn (minutes)", "How long it takes human bandits to respawn. 0 turns bandit respawning off.", "Population"],
	["AnimalRespawnTimer", "Animal respawn (minutes)", "How long it takes animals to respawn. 0 turns animal respawning off.", "Population"],
	["AIEvent", "Raids and AI events", "How often the game sends zombies or bandits to raid where you are: 0 off, 1 low, 2 default, 3 high, 4 insane.", "Population"],
	["DogEnabled", "Companion dogs can be found", "When on, you can find dogs in the world that you can recruit as companions.", "Companions"],
	["RecruitDog", "Companion dogs can be recruited", "When on, players can recruit companion dogs by dropping food and claiming the dog.", "Companions"],
	["DogNum", "Most companion dogs in the world", "The most companion dogs that can be found in the world. Dogs respawn when they are needed.", "Companions"],
	["CompanionHealth", "Companion dog health", "How healthy companion dogs are: 0 low, 1 default, 2 high. This is a fixed level, not a multiplier.", "Companions"],
	["CompanionDmg", "Companion dog damage", "How hard companion dogs hit: 0 low, 1 default, 2 high. This is a fixed level, not a multiplier.", "Companions"],
	["LootRespawn", "Loot respawns", "When on, loot containers and pickups come back. When off, they never respawn.", "Loot"],
	["LootRespawnTimer", "Loot container respawn (minutes)", "If loot respawns, how long a loot container takes to come back.", "Loot"],
	["PickupRespawnTimer", "Pickup respawn (minutes)", "If loot respawns, how long a dropped pickup takes to come back.", "Loot"],
	["PickupCleanup", "Dropped item cleanup (game days)", "How many game days a dropped item lasts before it is removed. 0 keeps them for good.", "Loot"],
	["RarityFood", "Food rarity", `${RARITY_NOTE} Applies to food.`, "Loot"],
	["RarityDrink", "Drink rarity", `${RARITY_NOTE} Applies to drinks.`, "Loot"],
	["RarityMelee", "Melee weapon rarity", `${RARITY_NOTE} Applies to melee weapons.`, "Loot"],
	["RarityRanged", "Ranged weapon rarity", `${RARITY_NOTE} Applies to guns and bows.`, "Loot"],
	["RarityAmmo", "Ammo rarity", `${RARITY_NOTE} Applies to ammunition.`, "Loot"],
	["RarityArmor", "Armour rarity", `${RARITY_NOTE} Applies to armour.`, "Loot"],
	["RarityResources", "Resource rarity", `${RARITY_NOTE} Applies to crafting resources.`, "Loot"],
	["RarityOther", "Other item rarity", `${RARITY_NOTE} Applies to everything else.`, "Loot"],
	["SaveIntervalSec", "Save every (seconds)", "How often the server saves the world. 0 turns automatic saving off.", "Saves"],
	["FreezeTime", "Freeze time when empty", "When on, the game clock stops while no one is on the server.", "Time and weather"],
	["DayDur", "Day length (minutes)", "How long a game day lasts, in real minutes.", "Time and weather"],
	["NightDur", "Night length (minutes)", "How long a game night lasts, in real minutes.", "Time and weather"],
	["DaysPerSeason", "Days per season", "How many game days each season lasts.", "Time and weather"],
	["StartingSeason", "Starting season", "The season a new world starts in.", "Time and weather"],
	["MultiplayerSleep", "Shared sleep passes time", "When on, time passes if everyone sleeps at the same time. When off, sleeping together does not pass time.", "Time and weather"],
	["Sleep", "Sleep deprivation", "When on, staying awake too long has an effect on the player.", "Time and weather"],
	["VitalDrain", "Hunger and thirst speed", "How fast a player's vitals drain: 0 slow, 1 normal, 2 fast.", "Survival"],
	["FoodDecay", "Food decay speed", "How fast food goes off. 1 is the default, 0 turns decay off, 0.5 is half speed and values above 1 speed it up.", "Survival"],
	["GenFuel", "Generator fuel use", "How fast a house generator uses fuel. 1 is the default; less than 1 uses it more slowly. Between 0.01 and 4.", "Survival"],
	["AllowDismantle", "Players can dismantle their buildings", "When on, players can take apart the buildings they made.", "Building"],
	["AllowHouseDismantle", "Players can dismantle house props", "When on, players can take apart the props inside houses.", "Building"],
	["BuildingHealth", "Building health", "How healthy the buildings players make are. A multiplier: 1 is the default.", "Building"],
	["Territory", "Territory", "When on, players cannot build in someone's spawn area. Clan members who are not recruits can.", "Building"],
	["NoBuildZone", "No-build zones", "When on, players cannot build in certain zones.", "Building"],
	["FreeBuild", "Free building (experimental)", "When off, some buildings need a foundation, which cuts down on floating buildings. The game's developers call this experimental.", "Building"],
	["Decay", "Spawn point decay (real days)", "How many real days a spawn point takes to go from full health to destroyed. Player buildings start to decay once it is gone.", "Building"],
	["BuildingDecay", "Building decay (real days)", "How many real days a player building takes to decay fully. 0 turns decay off. No decay happens inside a spawn point's protection.", "Building"],
	["FakeBuildingCleanup", "Blueprint cleanup (minutes)", "How long the white blueprint of an unfinished building lasts before it is removed. 0 keeps it.", "Building"],
	["RecycleCar", "Claimed car recycling (real days)", "After how many real days a claimed car goes back into the pool and spawns somewhere else. 0 turns recycling off.", "Building"],
	["Voip", "Voice chat", "When on, players can talk to each other with voice chat.", "Other"],
]);

const worldChoices = {
	OnDeath: [
		["0", "Nothing"],
		["1", "Backpack and weapon in hand"],
		["2", "Also pockets and backpack"],
		["3", "Also equipment"],
	],
	ZombieDiffHealth: DIFFICULTY,
	ZombieDiffSpeed: DIFFICULTY,
	ZombieDiffDamage: DIFFICULTY,
	HumanHealth: DIFFICULTY,
	HumanSpeed: DIFFICULTY,
	HumanDamage: DIFFICULTY,
	AIEvent: [
		["0", "Off"],
		["1", "Low"],
		["2", "Default"],
		["3", "High"],
		["4", "Insane"],
	],
	CompanionHealth: [
		["0", "Low"],
		["1", "Default"],
		["2", "High"],
	],
	CompanionDmg: [
		["0", "Low"],
		["1", "Default"],
		["2", "High"],
	],
	RarityFood: RARITY,
	RarityDrink: RARITY,
	RarityMelee: RARITY,
	RarityRanged: RARITY,
	RarityAmmo: RARITY,
	RarityArmor: RARITY,
	RarityResources: RARITY,
	RarityOther: RARITY,
	StartingSeason: [
		["0", "Summer"],
		["1", "Autumn"],
		["2", "Winter"],
		["3", "Spring"],
	],
	VitalDrain: [
		["0", "Slow"],
		["1", "Normal"],
		["2", "Fast"],
	],
	PVP: TRUE_FALSE,
	PermaDeath: TRUE_FALSE,
	LootRespawn: TRUE_FALSE,
	MultiplayerSleep: TRUE_FALSE,
	Sleep: TRUE_FALSE,
	FreezeTime: TRUE_FALSE,
	AirDrop: TRUE_FALSE,
	WeaponBreak: TRUE_FALSE,
	DogEnabled: TRUE_FALSE,
	RecruitDog: TRUE_FALSE,
	AllowDismantle: TRUE_FALSE,
	AllowHouseDismantle: TRUE_FALSE,
	Territory: TRUE_FALSE,
	FreeBuild: TRUE_FALSE,
	NoBuildZone: TRUE_FALSE,
	Voip: TRUE_FALSE,
};

const worldSettings = withChoices(worldRows, worldChoices);

const settings = {};
for (const [key, meta] of Object.entries(hostSettings)) settings[`Host Settings::${key}`] = meta;
for (const [key, meta] of Object.entries(worldSettings)) settings[`World Settings::${key}`] = meta;

const LAUNCH_NOTE =
	"The panel writes these three arguments when it creates the server, and their values come from the Ports section.";

const launch = {
	title: "HumanitZ",
	program: /HumanitZServer\.exe/i,
	style: "equals",
	editable: false,
	where: "the `HumanitZServer.exe` line of the server's start script",
	intro: `The panel starts the server with three arguments. ${LAUNCH_NOTE} Nothing here can be changed from this form. The server name, passwords and the other settings are in GameServerSettings.ini.`,
	args: [
		FLAG({
			flag: "-log",
			label: "Console window",
			group: "Required",
			edit: false,
			managed: true,
			description: "Opens a console window and shows the server's output in it. The panel uses it to read the server's log.",
		}),
		A({
			flag: "-port",
			style: "equals",
			label: "Game port",
			group: "Network",
			edit: false,
			managed: true,
			example: "27090",
			description: "The UDP port the server listens on, which players connect to. The panel writes it from the Game Port you set when the server was created.",
		}),
		A({
			flag: "-queryport",
			style: "equals",
			label: "Steam query port",
			group: "Network",
			edit: false,
			managed: true,
			example: "27092",
			description: "The UDP port the server browser asks for the server's details. The panel writes it from the Steam Query Port you set when the server was created.",
		}),
	],
};

const guide = {
	name: "HumanitZ",
	short: "HumanitZ",
	summary:
		"HumanitZ's settings are in GameServerSettings.ini in the HumanitZServer folder, in two sections: Host settings (the name, passwords and player limit) and World settings (the difficulty, loot, time and building rules). The panel copies the game's own default file there the first time, and the game reads it when the server starts.",
	files: {
		"GameServerSettings.ini": "Every setting of the server: the host settings in [Host Settings] and the world's rules in [World Settings].",
	},
	notes: [
		"Not checked on a real install. Before relying on this server, run it once and check the items in the server's implementation notes.",
		"Stop the server before you change the settings file. The game reads it when the server starts, so a change made while it runs is lost or not used.",
		"Stopping: the panel closes the server's window and, after 15 seconds, ends it. The developers' RCON shutdown is not used by the panel, and no Windows stop command was found, so the last few minutes may not be saved.",
		"Mods: HumanitZ has no official mod support yet. The developer advises against unofficial mods until version 1.0, because they can damage saves. The panel adds no mod setting.",
		"Server name: the name is ServerName in the Settings tab. Do not use the word Official in it.",
		"Versions: the settings file the panel copies is the one shipped with the install. Some values on the guides' websites disagree with it, and the file's own values are the ones used here.",
	],
};

export default {
	type: "humanitz",
	title: "HumanitZ",
	files: {
		"GameServerSettings.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: {
				"Host Settings": "Host settings",
				"World Settings": "World settings",
			},
			settings,
			groupOrder: ["Server", "Access", "Players", "Messages", "Progress", "Combat", "Difficulty", "Population", "Companions", "Loot", "Saves", "Survival", "Building", "Time and weather", "Other"],
			mayBeMissing: "The panel copies the game's default file when it creates the server. If it has been deleted, the game makes a new one with its defaults the next time the server starts.",
		},
	},
	launch,
	guide,
};

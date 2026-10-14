// The choices for settings that only have a few, per game. Used to turn a text box into a dropdown.
// A value the file already holds that isn't listed here is still shown (as "Custom: …") and never lost.
//
// `allowCustom` marks lists a game may grow with an update or a mod, where the dropdown also accepts a typed value.

export const MINECRAFT_CHOICES = {
	difficulty: [["peaceful", "Peaceful: no hostile mobs"], ["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"]],
	gamemode: [["survival", "Survival"], ["creative", "Creative"], ["adventure", "Adventure"], ["spectator", "Spectator"]],
	"level-type": {
		choices: [
			["minecraft:normal", "Normal"],
			["minecraft:flat", "Superflat"],
			["minecraft:large_biomes", "Large biomes"],
			["minecraft:amplified", "Amplified (tall terrain)"],
			["minecraft:single_biome_surrounds", "Single biome"],
		],
		allowCustom: true,
	},
	"region-file-compression": [["deflate", "Deflate (default)"], ["lz4", "LZ4 (faster, larger)"], ["none", "None"]],
	"op-permission-level": [["1", "1: bypass spawn protection"], ["2", "2: use cheat commands (/gamemode, /give)"], ["3", "3: manage players (/op, /ban)"], ["4", "4: everything, including /stop"]],
	"function-permission-level": [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]],
};

export const CONAN_CHOICES = {
	serverRegion: [["0", "Europe"], ["1", "North America"], ["2", "Asia"], ["3", "Australia"], ["4", "South America"], ["5", "Japan"]],
	MaxNudity: [["0", "None"], ["1", "Partial"], ["2", "Full"]],
	ServerCommunity: [["0", "None"], ["1", "Purist"], ["2", "Relaxed"], ["3", "Hard Core"], ["4", "Role Playing"], ["5", "Experimental"]],
};

export const ENSHROUDED_TOP_CHOICES = {
	voiceChatMode: [["Proximity", "Proximity: players hear nearby players"], ["Global", "Global: everyone hears everyone"]],
	gameSettingsPreset: { choices: ["Default", "Relaxed", "Hard", "Survival", "Custom"], allowCustom: true },
};

export const ENSHROUDED_GAME_CHOICES = {
	tombstoneMode: { choices: [["AddBackpackMaterials", "Keep backpack contents as materials"], ["Everything", "Drop everything"], ["NoTombstone", "No tombstone (items are kept)"]], allowCustom: true },
	weatherFrequency: { choices: ["Disabled", "Rare", "Normal", "Often"], allowCustom: true },
	fishingDifficulty: { choices: ["VeryEasy", "Easy", "Normal", "Hard", "VeryHard"], allowCustom: true },
	curseModifier: { choices: ["Easy", "Normal", "Hard"], allowCustom: true },
	randomSpawnerAmount: { choices: ["Few", "Normal", "Many", "Extreme"], allowCustom: true },
	aggroPoolAmount: { choices: ["Few", "Normal", "Many", "Extreme"], allowCustom: true },
	tamingStartleRepercussion: { choices: ["KeepProgress", "LoseSomeProgress", "LoseAllProgress"], allowCustom: true },
};

export const PALWORLD_CHOICES = {
	Difficulty: { choices: ["None", "Casual", "Normal", "Hard"], allowCustom: true },
	DeathPenalty: [["None", "None: lose nothing"], ["Item", "Drop items (not equipment)"], ["ItemAndEquipment", "Drop items and equipment"], ["All", "Drop everything, including Pals"]],
	LogFormatType: [["Text", "Plain text"], ["Json", "JSON"]],
	RandomizerType: { choices: ["None", "Region", "All"], allowCustom: true },
};

export const SEVEN_DAYS_CHOICES = {
	ServerVisibility: [["0", "Not listed"], ["1", "Friends only"], ["2", "Public"]],
	GameDifficulty: [["0", "0: Scavenger"], ["1", "1: Adventurer"], ["2", "2: Nomad"], ["3", "3: Warrior"], ["4", "4: Survivalist"], ["5", "5: Insane"]],
	DeathPenalty: [["0", "Nothing: respawn with everything"], ["1", "Default: classic XP penalty"], ["2", "Injured: respawn injured"], ["3", "Permanent death: character deleted"]],
	DropOnDeath: [["0", "Nothing"], ["1", "Everything"], ["2", "Toolbelt only"], ["3", "Backpack only"], ["4", "Delete everything"]],
	DropOnQuit: [["0", "Nothing"], ["1", "Everything"], ["2", "Toolbelt only"], ["3", "Backpack only"]],
	PlayerKillingMode: [["0", "No player killing"], ["1", "Kill allies only"], ["2", "Kill strangers only"], ["3", "Kill everyone"]],
	LandClaimDecayMode: [["0", "Slow: linear decay"], ["1", "Fast: exponential decay"], ["2", "None: no decay, stays protected"]],
	CameraRestrictionMode: [["0", "Free: first or third person"], ["1", "First person only"], ["2", "Third person only"]],
	ZombieFeralSense: [["0", "Off"], ["1", "Day only"], ["2", "Night only"], ["3", "All the time"]],
	ZombieMove: [["0", "Walk"], ["1", "Jog"], ["2", "Run"], ["3", "Sprint"], ["4", "Nightmare"]],
	ZombieMoveNight: [["0", "Walk"], ["1", "Jog"], ["2", "Run"], ["3", "Sprint"], ["4", "Nightmare"]],
	ZombieFeralMove: [["0", "Walk"], ["1", "Jog"], ["2", "Run"], ["3", "Sprint"], ["4", "Nightmare"]],
	ZombieBBMove: [["0", "Walk"], ["1", "Jog"], ["2", "Run"], ["3", "Sprint"], ["4", "Nightmare"]],
	Region: {
		choices: ["NorthAmericaEast", "NorthAmericaWest", "CentralAmerica", "SouthAmerica", "Europe", "Russia", "Asia", "MiddleEast", "Africa", "Oceania"],
		allowCustom: true,
	},
};

export const RUST_CHOICES = {
	"server.level": { choices: ["Procedural Map", "Barren", "HapisIsland", "CraggyIsland", "SavasIsland", "SavasIsland_koth"], allowCustom: true },
	"server.secure": [["true", "On (Easy Anti-Cheat)"], ["false", "Off"]],
};

export const SOTF_CHOICES = {
	SaveMode: [["Continue", "Continue the existing save"], ["New", "Start a new save"]],
	GameMode: [["Normal", "Normal"], ["Hard", "Hard"], ["HardSurvival", "Hard survival"], ["Peaceful", "Peaceful"], ["Custom", "Custom (uses the custom settings)"]],
};

export const VRISING_CHOICES = {
	// The presets the game ships in VRisingServer_Data\StreamingAssets (checked against server version 1.1).
	GameDifficultyPreset: { choices: [["Difficulty_Easy", "Easy"], ["Difficulty_Normal", "Normal"], ["Difficulty_Brutal", "Brutal"]], allowCustom: true },
	GameSettingsPreset: { choices: [["", "None (the game's default rules)"], ["StandardPvE", "Standard PvE"], ["StandardPvP", "Standard PvP"], ["StandardPvP_NoSiege", "Standard PvP No Siege"], ["StandardPvP_WeekendSiege", "Standard PvP Weekend Siege"], ["StandardPvP_DailySiege", "Standard PvP Daily Siege"], ["SoloPvP", "Solo PvP"], ["DuoPvP", "Duo PvP"], ["DuoPvP_NoSiege", "Duo PvP No Siege"], ["DuoPvP_WeekendSiege", "Duo PvP Weekend Siege"], ["DuoPvP_DailySiege", "Duo PvP Daily Siege"], ["TrioPvP", "Trio PvP"], ["TrioPvP_NoSiege", "Trio PvP No Siege"], ["TrioPvP_WeekendSiege", "Trio PvP Weekend Siege"], ["TrioPvP_DailySiege", "Trio PvP Daily Siege"], ["HardcorePvP", "Hardcore PvP"], ["HardcoreDuoPvP", "Hardcore Duo PvP"], ["HardcoreTrioPvP", "Hardcore Trio PvP"], ["Level30PvE", "Level 30 PvE"], ["Level30PvP", "Level 30 PvP"], ["Level40PvE", "Level 40 PvE"], ["Level40PvP", "Level 40 PvP"], ["Level50PvE", "Level 50 PvE"], ["Level50PvP", "Level 50 PvP"], ["Level60PvE", "Level 60 PvE"], ["Level60PvP", "Level 60 PvP"], ["Level70PvE", "Level 70 PvE"], ["Level70PvP", "Level 70 PvP"], ["Level80PvE", "Level 80 PvE"], ["Level80PvP", "Level 80 PvP"], ["Level90PvE", "Level 90 PvE"], ["Level90PvP", "Level 90 PvP"]], allowCustom: true },
};

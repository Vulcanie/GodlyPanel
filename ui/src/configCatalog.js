import { prettifyKey } from "./utils/prettifyKey.js";
import { rows, withChoices } from "./catalog/rows.js";
import {
	CONAN_CHOICES,
	ENSHROUDED_GAME_CHOICES,
	ENSHROUDED_TOP_CHOICES,
	MINECRAFT_CHOICES,
	PALWORLD_CHOICES,
} from "./catalog/enums.js";
import { sevenDaysSettings, sevenDaysGroupOrder } from "./catalog/sevenDays.js";
import { vrisingSettings, vrisingGroupOrder } from "./catalog/vrising.js";
import { vrisingWorldSettings, vrisingWorldGroupOrder } from "./catalog/vrisingWorld.js";
import { sotfSettings, sotfGroupOrder } from "./catalog/sotf.js";
import { rustSettings, rustGroupOrder } from "./catalog/rust.js";
import { subsistenceSettings, subsistenceGroupOrder, SUBSISTENCE_SECTION } from "./catalog/subsistence.js";
import { zomboidSettings, zomboidGroupOrder } from "./catalog/zomboid.js";
import { LAUNCH_ARGS, launchDefFor } from "./catalog/launchArgs.js";

// ───────────────────────── ARK: Survival Ascended / Evolved ─────────────────────────

const arkServerSettings = rows([
	["DifficultyOffset", "Difficulty Offset", "Overall difficulty (0-1). Raises the level range of wild dinos and loot quality as it increases.", "General"],
	["OverrideOfficialDifficulty", "Max Difficulty Multiplier", "Caps how high wild dino levels and loot quality can scale, independent of Difficulty Offset.", "General"],
	["ServerAdminPassword", "Admin Password", "Password required to use admin commands in-game.", "General"],
	["ImplantSuicideCD", "Implant Suicide Cooldown (s)", "How many seconds a player must wait between uses of the implant's suicide option. The default is 28800 (8 hours).", "General"],
	["ServerPassword", "Server Password", "Password players must enter to join the server. Leave blank for a public server.", "General"],
	["ServerPVE", "PvE Mode", "When enabled, players cannot damage each other or each other's structures.", "General"],
	["ShowMapPlayerLocation", "Show Player Location On Map", "Shows each player's position on the in-game map at all times.", "General"],
	["AllowThirdPersonPlayer", "Allow Third-Person Camera", "Lets players use the third-person camera view.", "General"],
	["ServerCrosshair", "Show Crosshair", "Shows a crosshair in the center of the screen.", "General"],
	["ShowFloatingDamageText", "Show Floating Damage Numbers", "Shows floating combat text with damage numbers.", "General"],
	["AllowHitMarkers", "Show Hit Markers", "Shows a marker on screen when you land a hit.", "General"],
	["StartTimeHour", "Start Time (Hour)", "In-game hour the server's day/night cycle starts at when the world is first created. -1 uses the default.", "General"],
	["ClampItemStats", "Clamp Item Stats to Official Values", "Prevents item stats from exceeding official-server maximums, even with boosted loot settings.", "General"],
	["PreventTribeAlliances", "Disable Tribe Alliances", "Prevents tribes from forming alliances with each other.", "General"],
	["TribeNameChangeCooldown", "Tribe Rename Cooldown (hrs)", "Hours a tribe must wait between renaming itself.", "General"],
	["TribeLogDestroyedEnemyStructures", "Log Enemy Structure Destruction", "Adds destroyed enemy structures to the tribe log.", "General"],
	["TribeLogMaxEntries", "Tribe Log Max Entries", "Maximum number of entries kept in each tribe's log.", "General"],
	["bJoinNotifications", "Show Join/Leave Notifications", "Shows a notification when players join or leave the server.", "General"],
	["bShowStatusNotificationMessages", "Show Status Notifications", "Shows on-screen notifications for status changes (taming complete, etc).", "General"],

	["TamingSpeedMultiplier", "Taming Speed Multiplier", "Multiplies how fast dinos are tamed.", "Taming & Breeding"],
	["AllowAnyoneBabyImprintCuddle", "Allow Anyone to Imprint Babies", "Lets any tribe member (not just the imprinted player) cuddle/care for a baby.", "Taming & Breeding"],
	["DisableImprintDinoBuff", "Disable Imprint Stat Bonus", "Removes the stat bonus dinos normally get from being well-imprinted.", "Taming & Breeding"],

	["HarvestAmountMultiplier", "Harvest Amount Multiplier", "Multiplies the amount of resources gathered per harvest action.", "Harvesting & Resources"],
	["ResourcesRespawnPeriodMultiplier", "Resource Respawn Time Multiplier", "Multiplies how long it takes harvested resource nodes to respawn.", "Harvesting & Resources"],
	["ItemStackSizeMultiplier", "Item Stack Size Multiplier", "Multiplies the max stack size for stackable items.", "Harvesting & Resources"],
	["ClampItemSpoilingTimes", "Clamp Spoiling Times to Official Values", "Prevents item spoil timers from exceeding official-server maximums.", "Harvesting & Resources"],

	["MaxTamedDinos", "Max Tamed Dinos (Server)", "Maximum number of tamed dinos allowed on the whole server.", "Dinos & Wild Population"],
	["MaxTamedDinos_SoftTameLimit", "Soft Tame Limit", "Tamed dino count at which the server starts warning/preventing further taming.", "Dinos & Wild Population"],
	["MaxTamedDinos_SoftTameLimit_CountdownForDeletionDuration", "Soft Limit Deletion Countdown (sec)", "Seconds of grace given once over the soft tame limit before excess dinos are removed.", "Dinos & Wild Population"],
	["AutoDestroyDecayedDinos", "Auto-Destroy Decayed Dinos", "Automatically deletes tamed dinos whose owning tribe has been offline long enough to fully decay.", "Dinos & Wild Population"],
	["ForceGachaUnhappyInCaves", "Force Gacha Unhappy In Caves", "Forces Gacha creatures to be unhappy (and stop producing) while inside caves.", "Dinos & Wild Population"],
	["RaidDinoCharacterFoodDrainMultiplier", "Raid Dino Food Drain Multiplier", "Multiplies how fast summoned raid/boss creatures drain food.", "Dinos & Wild Population"],
	["PvEDinoDecayPeriodMultiplier", "PvE Dino Decay Period Multiplier", "Multiplies how long an offline tribe's tamed dinos take to decay in PvE.", "Dinos & Wild Population"],
	["AllowRaidDinoFeeding", "Allow Feeding Raid Dinos", "Allows players to feed and heal summoned raid/boss creatures.", "Dinos & Wild Population"],
	["OxygenSwimSpeedStatMultiplier", "Oxygen Swim Speed Multiplier", "Multiplies how much the Oxygen stat affects swim speed.", "Dinos & Wild Population"],
	["AllowFlyingStaminaRecovery", "Allow Flyer Stamina Recovery While Flying", "Lets flying dinos regenerate stamina while airborne instead of only when landed.", "Dinos & Wild Population"],
	["AllowFlyerSpeedLeveling", "Allow Flyer Speed Leveling", "Lets players put levels into a flying dino's speed stat.", "Dinos & Wild Population"],
	["AllowFlyerCarryPvE", "Allow Flyers to Carry Players in PvE", "Lets flying dinos pick up and carry other players in PvE.", "Dinos & Wild Population"],
	["PreventDiseases", "Disable Diseases", "Turns off wild-dino diseases entirely.", "Dinos & Wild Population"],
	["NonPermanentDiseases", "Non-Permanent Diseases", "Diseases can be cured instead of being permanent.", "Dinos & Wild Population"],

	["PvPDinoDecay", "PvP Dino Decay", "Enables decay/removal of tamed dinos left unattended in PvP.", "PvP & Structures"],
	["PvPStructureDecay", "PvP Structure Decay", "Enables decay/removal of structures left unattended in PvP.", "PvP & Structures"],
	["PreventOfflinePvP", "Prevent Offline Raiding", "Grants raid protection to tribes/structures while all members are offline.", "PvP & Structures"],
	["PreventOfflinePvPInterval", "Offline PvP Protection Delay (sec)", "Seconds after a tribe's last member logs off before offline raid protection kicks in.", "PvP & Structures"],
	["AllowMultipleAttachedC4", "Allow Multiple Attached C4", "Allows more than one C4 charge to be attached to the same structure/dino at once.", "PvP & Structures"],
	["AllowTeslaCoilCaveBuildingPVP", "Allow Tesla Coil Cave Building in PvP", "Allows placing Tesla Coils inside caves in PvP.", "PvP & Structures"],
	["IgnorePVPMountedWeaponryRestriction", "Ignore Mounted Weaponry PvP Restriction", "Removes the restriction on mounted turret weaponry usage in PvP.", "PvP & Structures"],
	["FastDecayUnsnappedCoreStructures", "Fast-Decay Unsnapped Core Structures", "Makes structures that aren't snapped to a foundation/pillar decay quickly.", "PvP & Structures"],
	["OverrideStructurePlatformPrevention", "Override Platform Structure Prevention", "Disables the restriction on certain structures being placed on platform saddles/rafts.", "PvP & Structures"],
	["OnlyAutoDestroyCoreStructures", "Only Auto-Destroy Core Structures", "Limits structure auto-destroy to core (foundation/pillar) pieces only.", "PvP & Structures"],
	["TheMaxStructuresInRange", "Max Structures In Range", "Maximum number of structures allowed within the engine's structure-count radius.", "PvP & Structures"],
	["StructurePreventResourceRadiusMultiplier", "Structure Resource-Block Radius Multiplier", "Multiplies the radius around structures that blocks resource node respawns.", "PvP & Structures"],
	["PerPlatformMaxStructuresMultiplier", "Per-Platform Max Structures Multiplier", "Multiplies the max structure count allowed on a single platform saddle/raft.", "PvP & Structures"],
	["PlatformSaddleBuildAreaBoundsMultiplier", "Platform Build Area Multiplier", "Multiplies the buildable area bounds on platform saddles.", "PvP & Structures"],
	["AlwaysAllowStructurePickup", "Always Allow Structure Pickup", "Lets players pick structures back up regardless of the normal time limit.", "PvP & Structures"],
	["StructurePickupTimeAfterPlacement", "Structure Pickup Time Limit (sec)", "Seconds after placement a structure can still be picked back up.", "PvP & Structures"],
	["StructurePickupHoldDuration", "Structure Pickup Hold Duration (sec)", "Seconds you must hold the pickup action to pick up a structure.", "PvP & Structures"],
	["EnableExtraStructurePreventionVolumes", "Enable Extra Build-Prevention Volumes", "Enables additional zones (near obelisks/terminals) where building is blocked.", "PvP & Structures"],
	["AllowCrateSpawnsOnTopOfStructures", "Allow Crate Spawns On Structures", "Lets supply/loot crates spawn on top of player structures.", "PvP & Structures"],
	["AutoDestroyOldStructuresMultiplier", "Auto-Destroy Old Structures Multiplier", "Multiplies the decay timer used to auto-destroy old abandoned structures.", "PvP & Structures"],
	["StructureLoadDistanceMultiplier", "Structure Load Distance Multiplier", "Multiplies the distance at which structures are streamed in/rendered.", "PvP & Structures"],
	["LimitBunkersPerTribe", "Limit Bunkers Per Tribe", "Caps how many underground bunkers a single tribe can build.", "PvP & Structures"],
	["LimitBunkersPerTribeNum", "Max Bunkers Per Tribe", "Maximum number of bunkers allowed per tribe when the limit is enabled.", "PvP & Structures"],
	["AllowRidingDinosInsideBunkers", "Allow Ridden Dinos Inside Bunkers", "Lets players bring ridden dinos inside bunkers.", "PvP & Structures"],
	["AllowDinoAIInsideBunkers", "Allow Dino AI Inside Bunkers", "Lets non-ridden dinos with AI enabled enter bunkers.", "PvP & Structures"],
	["MinDistanceBetweenBunkers", "Min Distance Between Bunkers", "Minimum distance required between separate bunkers.", "PvP & Structures"],
	["EnemyAccessBunkerHPThreshold", "Enemy Bunker Access HP Threshold", "Structure health percentage below which enemies can access a bunker's interior.", "PvP & Structures"],
	["BunkerUnderHPThresholdDmgMultiplier", "Bunker Damage Multiplier Under Threshold", "Extra damage multiplier applied to bunker structures once under the HP access threshold.", "PvP & Structures"],
	["NeedsPowerToActivateAquaticCompartments", "Aquatic Compartments Need Power", "Requires aquatic base compartments to be powered to function.", "PvP & Structures"],
	["PvEAllowStructuresAtSupplyDrops", "Allow Structures At Supply Drop Zones", "Lets players build structures at supply-drop landing zones in PvE.", "PvP & Structures"],

	["RCONEnabled", "Enable RCON", "Enables the remote console (RCON) interface used by this dashboard to query/control the server.", "Admin & Performance"],
	["RCONPort", "RCON Port", "Network port the RCON interface listens on.", "Admin & Performance"],
	["RCONServerGameLogBuffer", "RCON Log Buffer Size", "Number of lines of server log kept in the buffer available over RCON.", "Admin & Performance"],
	["AllowHideDamageSourceFromLogs", "Hide Damage Source From Logs", "Omits the source of damage events from the server log.", "Admin & Performance"],
	["KickIdlePlayersPeriod", "Idle Player Kick Timer (sec)", "Seconds of inactivity before an idle player is kicked.", "Admin & Performance"],
	["AutoSavePeriodMinutes", "Auto-Save Interval (min)", "Minutes between automatic world saves.", "Admin & Performance"],
	["PreventSpawnAnimations", "Disable Spawn Animations", "Skips dino spawn animations for a small performance gain.", "Admin & Performance"],
	["EnableExtraPerformanceMode", "Enable Extra Performance Mode", "Trades some visual/AI fidelity for improved server performance.", "Admin & Performance"],
	["EnableMultiThreadedRendering", "Enable Multi-Threaded Rendering", "Lets the server use multiple threads for rendering-adjacent work.", "Admin & Performance"],
	["UseOptimizedNetwork", "Use Optimized Networking", "Enables an optimized networking code path.", "Admin & Performance"],
	["UseOptimizedHarvesting", "Use Optimized Harvesting", "Enables an optimized harvesting code path.", "Admin & Performance"],
	["UseStructureStaggering", "Use Structure Staggering", "Staggers structure updates across ticks to reduce load spikes.", "Admin & Performance"],
	["UseClientCatchupTime", "Use Client Catch-Up Time", "Allows clients extra time to catch up after a hitch/lag spike.", "Admin & Performance"],
	["ServerThreadTickRate", "Server Tick Rate", "Target ticks-per-second the server thread runs at.", "Admin & Performance"],

	["CryoHospitalHoursToRegenHP", "Cryo Hospital: Hours To Regen HP", "Hours a freshly-uncryoed dino needs at a Cryo Hospital to fully regen HP.", "Cryo & Data Transfer"],
	["CryoHospitalHoursToRegenFood", "Cryo Hospital: Hours To Regen Food", "Hours a freshly-uncryoed dino needs at a Cryo Hospital to fully regen food.", "Cryo & Data Transfer"],
	["CryoHospitalHoursToDrainTorpor", "Cryo Hospital: Hours To Drain Torpor", "Hours a freshly-uncryoed dino needs at a Cryo Hospital to fully drain torpor.", "Cryo & Data Transfer"],
	["CryoHospitalMatingCooldownReduction", "Cryo Hospital: Mating Cooldown Reduction", "Mating cooldown reduction granted by resting at a Cryo Hospital.", "Cryo & Data Transfer"],
	["EnableCryopodNerf", "Enable Cryopod Nerf", "Applies a temporary debuff to dinos right after being released from a cryopod.", "Cryo & Data Transfer"],
	["CryopodNerfDuration", "Cryopod Nerf Duration (sec)", "How long the post-uncryo debuff lasts.", "Cryo & Data Transfer"],
	["CryopodNerfDamageMult", "Cryopod Nerf Outgoing Damage Multiplier", "Outgoing damage multiplier applied to a dino during the cryopod nerf window.", "Cryo & Data Transfer"],
	["CryopodNerfIncomingDamageMultPercent", "Cryopod Nerf Incoming Damage %", "Extra incoming damage percentage applied during the cryopod nerf window.", "Cryo & Data Transfer"],
	["EnableCryoSicknessPVE", "Enable Cryo Sickness In PvE", "Applies cryo sickness debuff to uncryoed dinos in PvE too (normally PvP only).", "Cryo & Data Transfer"],
	["DisableCryopodEnemyCheck", "Disable Cryopod Enemy Check", "Lets players throw cryopods even with enemies nearby.", "Cryo & Data Transfer"],
	["DisableCryopodFridgeRequirement", "Disable Cryofridge Requirement", "Lets Cryopods be crafted/recharged without needing a nearby Cryofridge.", "Cryo & Data Transfer"],
	["AllowCryoFridgeOnSaddle", "Allow Cryofridge On Saddle", "Lets a Cryofridge be placed on platform saddles.", "Cryo & Data Transfer"],
	["CrossARKAllowForeignDinoDownloads", "Allow Cross-ARK Dino Downloads", "Allows dinos uploaded from other servers/maps to be downloaded here.", "Cryo & Data Transfer"],
	["PreventDownloadSurvivors", "Block Survivor Downloads", "Prevents survivor data from being downloaded to this server.", "Cryo & Data Transfer"],
	["PreventDownloadItems", "Block Item Downloads", "Prevents item data from being downloaded to this server.", "Cryo & Data Transfer"],
	["PreventDownloadDinos", "Block Dino Downloads", "Prevents dino data from being downloaded to this server.", "Cryo & Data Transfer"],
	["PreventUploadSurvivors", "Block Survivor Uploads", "Prevents survivor data from being uploaded off this server.", "Cryo & Data Transfer"],
	["PreventUploadItems", "Block Item Uploads", "Prevents item data from being uploaded off this server.", "Cryo & Data Transfer"],
	["PreventUploadDinos", "Block Dino Uploads", "Prevents dino data from being uploaded off this server.", "Cryo & Data Transfer"],

	["MaxCosmoWeaponAmmo", "Max Cosmo Weapon Ammo", "Maximum ammo capacity for Cosmo-tier weapons. -1 uses the default.", "Misc / ASA Features"],
	["CosmoWeaponAmmoReloadAmount", "Cosmo Weapon Reload Amount", "Ammo restored per reload for Cosmo-tier weapons. -1 uses the default.", "Misc / ASA Features"],
	["WorldBossKingKaijuSpawnTime", "King Kaiju Spawn Time", "Time of day the King Kaiju world boss spawns.", "Misc / ASA Features"],
	["ArmadoggoDeathCooldown", "Armadoggo Death Cooldown (sec)", "Cooldown before a summoned Armadoggo companion can be resummoned after dying.", "Misc / ASA Features"],
	["OverrideSecondsUntilBuriedTreasureAutoReveals", "Buried Treasure Auto-Reveal Time (sec)", "Seconds before an undiscovered buried treasure location is automatically revealed.", "Misc / ASA Features"],
	["BloodforgeReinforceExtraDurability", "Bloodforge: Extra Durability", "Extra durability percentage granted by Bloodforge item reinforcement.", "Misc / ASA Features"],
	["BloodforgeReinforceResourceCostMultiplier", "Bloodforge: Resource Cost Multiplier", "Multiplies the resource cost of Bloodforge item reinforcement.", "Misc / ASA Features"],
	["BloodforgeReinforceSpeedMultiplier", "Bloodforge: Reinforce Speed Multiplier", "Multiplies how fast Bloodforge item reinforcement completes.", "Misc / ASA Features"],
	["OutpostSigilRewardMultiplier", "Outpost Sigil Reward Multiplier", "Multiplies rewards earned from capturing/holding outposts.", "Misc / ASA Features"],
]);

const arkSessionSettings = rows([
	["SessionName", "Session Name", "The name shown for this server in the in-game server browser.", "Session"],
]);

const arkMotdSettings = rows([
	["Message", "Message of the Day", "Text shown to players in a banner when they join the server.", "Session"],
	["Duration", "MOTD Duration (sec)", "How many seconds the message-of-the-day banner stays on screen.", "Session"],
]);

const arkGameSessionSettings = rows([
	["MaxPlayers", "Max Players", "Maximum number of concurrent players allowed on the server.", "Session"],
]);

const arkGameSettings = rows([
	["KillXPMultiplier", "Kill XP Multiplier", "Multiplies experience earned from killing creatures.", "XP"],
	["HarvestXPMultiplier", "Harvest XP Multiplier", "Multiplies experience earned from harvesting.", "XP"],
	["CraftXPMultiplier", "Craft XP Multiplier", "Multiplies experience earned from crafting.", "XP"],
	["GenericXPMultiplier", "Generic XP Multiplier", "Multiplies experience earned from general actions not covered by other multipliers.", "XP"],
	["SpecialXPMultiplier", "Special XP Multiplier", "Multiplies experience earned from special/unique actions.", "XP"],
	["ExplorerNoteXPMultiplier", "Explorer Note XP Multiplier", "Multiplies experience earned from finding explorer notes.", "XP"],
	["BossKillXPMultiplier", "Boss Kill XP Multiplier", "Multiplies experience earned from killing boss creatures.", "XP"],
	["AlphaKillXPMultiplier", "Alpha Kill XP Multiplier", "Multiplies experience earned from killing Alpha creatures.", "XP"],
	["WildKillXPMultiplier", "Wild Kill XP Multiplier", "Multiplies experience earned from killing wild creatures.", "XP"],
	["CaveKillXPMultiplier", "Cave Kill XP Multiplier", "Multiplies experience earned from kills made inside caves.", "XP"],
	["TamedKillXPMultiplier", "Tamed Kill XP Multiplier", "Multiplies experience earned from a tamed dino's kills.", "XP"],
	["UnclaimedKillXPMultiplier", "Unclaimed Dino Kill XP Multiplier", "Multiplies experience earned from killing unclaimed/wandering tamed dinos.", "XP"],
	["OverrideMaxExperiencePointsPlayer", "Player XP Cap Override", "Overrides the maximum experience points a player can earn. 0 uses the default.", "XP"],
	["OverrideMaxExperiencePointsDino", "Dino XP Cap Override", "Overrides the maximum experience points a tamed dino can earn. 0 uses the default.", "XP"],

	["BabyImprintingStatScaleMultiplier", "Imprint Stat Bonus Multiplier", "Multiplies the stat bonus a dino gets per percent of imprint quality.", "Taming & Breeding"],
	["BabyImprintAmountMultiplier", "Imprint Gain Per Cuddle Multiplier", "Multiplies how much imprint percentage is gained per successful cuddle.", "Taming & Breeding"],
	["BabyCuddleIntervalMultiplier", "Baby Cuddle Interval Multiplier", "Multiplies the time between required imprint cuddle events (lower = more frequent).", "Taming & Breeding"],
	["BabyCuddleGracePeriodMultiplier", "Baby Cuddle Grace Period Multiplier", "Multiplies the grace period allowed before a missed cuddle hurts imprint quality.", "Taming & Breeding"],
	["BabyCuddleLoseImprintQualitySpeedMultiplier", "Imprint Quality Loss Speed Multiplier", "Multiplies how fast imprint quality drops after a missed cuddle.", "Taming & Breeding"],
	["MatingIntervalMultiplier", "Mating Interval Multiplier", "Multiplies the cooldown between a dino's mating attempts (lower = more frequent).", "Taming & Breeding"],
	["EggHatchSpeedMultiplier", "Egg Hatch Speed Multiplier", "Multiplies how fast fertilized eggs hatch.", "Taming & Breeding"],
	["BabyMatureSpeedMultiplier", "Baby Maturation Speed Multiplier", "Multiplies how fast baby dinos grow to adulthood.", "Taming & Breeding"],
	["BabyFoodConsumptionSpeedMultiplier", "Baby Food Consumption Multiplier", "Multiplies how fast baby dinos consume food.", "Taming & Breeding"],
	["LayEggIntervalMultiplier", "Egg Laying Interval Multiplier", "Multiplies the interval between a female dino laying eggs.", "Taming & Breeding"],
	["EngramEntryAutoUnlocks", "Auto-Unlock Engram", "An engram that's automatically unlocked once a player reaches the given level (repeatable entry).", "Taming & Breeding"],

	["GlobalSpoilingTimeMultiplier", "Spoiling Time Multiplier", "Multiplies how long perishable items take to spoil.", "Harvesting & Resources"],
	["GlobalItemDecompositionTimeMultiplier", "Dropped Item Decay Multiplier", "Multiplies how long dropped items last before disappearing.", "Harvesting & Resources"],
	["GlobalCorpseDecompositionTimeMultiplier", "Corpse Decay Multiplier", "Multiplies how long corpses last before disappearing.", "Harvesting & Resources"],
	["ResourceNoReplenishRadiusPlayers", "No-Respawn Radius Around Players", "Multiplies the radius around players where resources won't respawn.", "Harvesting & Resources"],
	["ResourceNoReplenishRadiusStructures", "No-Respawn Radius Around Structures", "Multiplies the radius around structures where resources won't respawn.", "Harvesting & Resources"],
	["CropGrowthSpeedMultiplier", "Crop Growth Speed Multiplier", "Multiplies how fast planted crops grow.", "Harvesting & Resources"],
	["CropDecaySpeedMultiplier", "Crop Decay Speed Multiplier", "Multiplies how fast unharvested crops decay.", "Harvesting & Resources"],
	["PoopIntervalMultiplier", "Poop Interval Multiplier", "Multiplies how often creatures produce feces.", "Harvesting & Resources"],
	["FuelConsumptionIntervalMultiplier", "Fuel Consumption Multiplier", "Multiplies how quickly fuel is consumed by generators/forges/etc.", "Harvesting & Resources"],
	["SupplyCrateLootQualityMultiplier", "Supply Crate Loot Quality Multiplier", "Multiplies the quality of items found in supply crate drops.", "Harvesting & Resources"],
	["FishingLootQualityMultiplier", "Fishing Loot Quality Multiplier", "Multiplies the quality of items caught while fishing.", "Harvesting & Resources"],
	["CraftingSkillBonusMultiplier", "Crafting Skill Bonus Multiplier", "Multiplies the quality bonus from the crafter's crafting skill.", "Harvesting & Resources"],
	["CustomRecipeEffectivenessMultiplier", "Custom Recipe Effectiveness Multiplier", "Multiplies the effectiveness of player-crafted custom recipes (cooking).", "Harvesting & Resources"],
	["CustomRecipeSkillMultiplier", "Custom Recipe Skill Multiplier", "Multiplies the crafting-skill bonus applied to custom recipes.", "Harvesting & Resources"],
	["bAllowCustomRecipes", "Allow Custom Recipes", "Allows players to create custom cooking recipes.", "Harvesting & Resources"],

	["BaseHexagonRewardMultiplier", "Hexagon Reward Multiplier", "Multiplies Hexagon (Genesis currency) rewards earned.", "PvP, Hex & Turrets"],
	["HexagonCostMultiplier", "Hexagon Store Cost Multiplier", "Multiplies the Hexagon cost of items in the Hexagon store.", "PvP, Hex & Turrets"],
	["PvPZoneStructureDamageMultiplier", "PvP Zone Structure Damage Multiplier", "Multiplies structure damage dealt within PvP zones.", "PvP, Hex & Turrets"],
	["StructureDamageRepairCooldown", "Structure Repair Cooldown After Damage (sec)", "Cooldown before a damaged structure can be repaired again.", "PvP, Hex & Turrets"],
	["IncreasePvPRespawnIntervalCheckPeriod", "PvP Respawn Interval Check Period (sec)", "How often the server checks whether a player's PvP respawn cooldown should increase.", "PvP, Hex & Turrets"],
	["IncreasePvPRespawnIntervalMultiplier", "PvP Respawn Interval Growth Multiplier", "Multiplies how quickly the repeated-death respawn cooldown grows.", "PvP, Hex & Turrets"],
	["IncreasePvPRespawnIntervalBaseAmount", "PvP Respawn Interval Base (sec)", "Base seconds added to respawn cooldown after repeated deaths.", "PvP, Hex & Turrets"],
	["bIncreasePvPRespawnInterval", "Increase Respawn Interval on Repeated Death", "Enables an increasing respawn cooldown for players who die repeatedly in a short time.", "PvP, Hex & Turrets"],
	["DinoTurretDamageMultiplier", "Dino Damage To Turrets Multiplier", "Multiplies damage tamed dinos deal to turrets.", "PvP, Hex & Turrets"],
	["DinoHarvestingDamageMultiplier", "Dino Harvesting Damage Multiplier", "Multiplies damage tamed dinos deal while harvesting.", "PvP, Hex & Turrets"],
	["PlayerHarvestingDamageMultiplier", "Player Harvesting Damage Multiplier", "Multiplies damage players deal while harvesting.", "PvP, Hex & Turrets"],
	["bPassiveDefensesDamageRiderlessDinos", "Turrets Damage Riderless Dinos", "Lets automated turrets target and damage unridden wild/tamed dinos.", "PvP, Hex & Turrets"],
	["bDisableFriendlyFire", "Disable Friendly Fire", "Prevents tribe members from damaging each other and each other's dinos.", "PvP, Hex & Turrets"],
	["bHardLimitTurretsInRange", "Hard-Limit Turrets In Range", "Enforces a hard cap on the number of turrets active within range of each other.", "PvP, Hex & Turrets"],

	["bDisableStructurePlacementCollision", "Disable Structure Placement Collision", "Allows structures to be placed overlapping each other.", "Structures"],
	["bAllowPlatformSaddleMultiFloors", "Allow Multi-Floor Platform Saddles", "Allows building multiple floors on platform saddles.", "Structures"],
	["bFlyerPlatformAllowUnalignedDinoBasing", "Allow Unaligned Dino Basing On Flyer Platforms", "Allows dinos not aligned to the platform's grid to still be considered 'based' on a flyer platform.", "Structures"],
	["PhotoModeRangeLimit", "Photo Mode Range Limit", "Maximum camera distance allowed while using photo mode.", "Structures"],
	["bDisablePhotoMode", "Disable Photo Mode", "Disables the in-game photo mode entirely.", "Structures"],

	["MaxDifficulty", "Force Max Difficulty", "Forces the server to always use maximum difficulty scaling.", "General"],
	["bUseSingleplayerSettings", "Use Singleplayer Settings", "Applies singleplayer-balance settings instead of standard multiplayer balance. Not recommended for dedicated servers.", "General"],
	["bDisableDinoRiding", "Disable Dino Riding", "Prevents players from riding any dinos.", "General"],
	["bDisableDinoTaming", "Disable Dino Taming", "Prevents players from taming any dinos.", "General"],
	["bAllowUnlimitedRespecs", "Allow Unlimited Mindwipes", "Allows unlimited use of Mindwipe Tonics to respec engram points.", "General"],
	["bAllowSpeedLeveling", "Allow Speed Leveling (Players)", "Lets players put levels into their movement speed stat.", "General"],
	["bAllowFlyerSpeedLeveling", "Allow Flyer Speed Leveling", "Lets players put levels into a flying dino's speed stat.", "General"],
	["bDisableLootCrates", "Disable Loot Crates", "Turns off world loot crate spawns (green/blue/etc drops).", "General"],
	["bShowCreativeMode", "Show Creative Mode Option", "Shows the creative mode toggle to admins.", "General"],
	["bUseCorpseLocator", "Use Corpse Locator", "Shows a beam of light marking the location of your last death.", "General"],
	["bPvEAllowTribeWar", "Allow Tribe Wars in PvE", "Lets tribes declare war on each other in PvE to allow temporary PvP.", "General"],
	["bPvEAllowTribeWarCancel", "Allow Canceling Tribe Wars in PvE", "Lets tribes cancel an active tribe war in PvE.", "General"],
	["MaxNumberOfPlayersInTribe", "Max Players Per Tribe", "Maximum number of players allowed in a single tribe. 0 = unlimited.", "General"],
	["AutoPvEStartTimeSeconds", "Auto-PvE Start Time (sec)", "Time of day (seconds) that scheduled PvE mode starts, if auto-PvE timer is enabled.", "General"],
	["AutoPvEStopTimeSeconds", "Auto-PvE Stop Time (sec)", "Time of day (seconds) that scheduled PvE mode ends, if auto-PvE timer is enabled.", "General"],
	["bAutoPvETimer", "Enable Scheduled PvE Timer", "Automatically switches between PvE and PvP on a daily schedule.", "General"],
	["bAutoPvEUseSystemTime", "Use System Time For PvE Timer", "Uses the server's real-world clock instead of in-game time for the scheduled PvE timer.", "General"],
]);

// ───────────────────────── Conan Exiles ─────────────────────────

const conanSettings = withChoices(
	rows([
	["ServerName", "Server Name", "The name shown for this server in the in-game server browser.", "Server Info"],
	["ServerPassword", "Server Password", "Password players must enter to join the server. Leave blank for a public server.", "Server Info"],
	["AdminPassword", "Admin Password", "Password required to gain admin privileges in-game.", "Server Info"],
	["ServerMessageOfTheDay", "Message of the Day", "Text shown to players when they join the server.", "Server Info"],
	["serverRegion", "Server Region", "Region code shown for this server in the server browser.", "Server Info"],
	["ServerModList", "Server Mod List", "File listing the mods this server runs, sent to clients so they can auto-download matching mods.", "Server Info"],
	["MaxNudity", "Max Nudity Level", "Maximum nudity level allowed for character customization on this server.", "Server Info"],

	["PVPEnabled", "PvP Enabled", "Turns on player-vs-player combat server-wide.", "PvP Rules & Schedule"],
	["PVPEnabledMonday", "PvP on Monday", "Allows player-versus-player combat on Monday when PvP is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPTimeMondayStart", "PvP starts on Monday", "The time PvP starts on Monday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPTimeMondayEnd", "PvP ends on Monday", "The time PvP ends on Monday, written the same way (2200 is 10 pm).", "PvP Rules & Schedule"],
	["PVPEnabledTuesday", "PvP on Tuesday", "Allows player-versus-player combat on Tuesday when PvP is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPTimeTuesdayStart", "PvP starts on Tuesday", "The time PvP starts on Tuesday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPTimeTuesdayEnd", "PvP ends on Tuesday", "The time PvP ends on Tuesday, written the same way (2200 is 10 pm).", "PvP Rules & Schedule"],
	["PVPEnabledWednesday", "PvP on Wednesday", "Allows player-versus-player combat on Wednesday when PvP is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPTimeWednesdayStart", "PvP starts on Wednesday", "The time PvP starts on Wednesday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPTimeWednesdayEnd", "PvP ends on Wednesday", "The time PvP ends on Wednesday, written the same way (2200 is 10 pm).", "PvP Rules & Schedule"],
	["PVPEnabledThursday", "PvP on Thursday", "Allows player-versus-player combat on Thursday when PvP is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPTimeThursdayStart", "PvP starts on Thursday", "The time PvP starts on Thursday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPTimeThursdayEnd", "PvP ends on Thursday", "The time PvP ends on Thursday, written the same way (2200 is 10 pm).", "PvP Rules & Schedule"],
	["PVPEnabledFriday", "PvP on Friday", "Allows player-versus-player combat on Friday when PvP is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPTimeFridayStart", "PvP starts on Friday", "The time PvP starts on Friday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPTimeFridayEnd", "PvP ends on Friday", "The time PvP ends on Friday, written the same way (2200 is 10 pm).", "PvP Rules & Schedule"],
	["PVPEnabledSaturday", "PvP on Saturday", "Allows player-versus-player combat on Saturday when PvP is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPTimeSaturdayStart", "PvP starts on Saturday", "The time PvP starts on Saturday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPTimeSaturdayEnd", "PvP ends on Saturday", "The time PvP ends on Saturday, written the same way (2200 is 10 pm).", "PvP Rules & Schedule"],
	["PVPEnabledSunday", "PvP on Sunday", "Allows player-versus-player combat on Sunday when PvP is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPTimeSundayStart", "PvP starts on Sunday", "The time PvP starts on Sunday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPTimeSundayEnd", "PvP ends on Sunday", "The time PvP ends on Sunday, written the same way (2200 is 10 pm).", "PvP Rules & Schedule"],
	["PVPBuildingDamageEnabledMonday", "Building damage on Monday", "Allows players to damage each other's buildings on Monday when building damage is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeMondayStart", "Building damage starts on Monday", "The time building damage starts on Monday, written as hours and minutes without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeMondayEnd", "Building damage ends on Monday", "The time building damage ends on Monday, written the same way.", "PvP Rules & Schedule"],
	["PVPBuildingDamageEnabledTuesday", "Building damage on Tuesday", "Allows players to damage each other's buildings on Tuesday when building damage is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeTuesdayStart", "Building damage starts on Tuesday", "The time building damage starts on Tuesday, written as hours and minutes without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeTuesdayEnd", "Building damage ends on Tuesday", "The time building damage ends on Tuesday, written the same way.", "PvP Rules & Schedule"],
	["PVPBuildingDamageEnabledWednesday", "Building damage on Wednesday", "Allows players to damage each other's buildings on Wednesday when building damage is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeWednesdayStart", "Building damage starts on Wednesday", "The time building damage starts on Wednesday, written as hours and minutes without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeWednesdayEnd", "Building damage ends on Wednesday", "The time building damage ends on Wednesday, written the same way.", "PvP Rules & Schedule"],
	["PVPBuildingDamageEnabledThursday", "Building damage on Thursday", "Allows players to damage each other's buildings on Thursday when building damage is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeThursdayStart", "Building damage starts on Thursday", "The time building damage starts on Thursday, written as hours and minutes without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeThursdayEnd", "Building damage ends on Thursday", "The time building damage ends on Thursday, written the same way.", "PvP Rules & Schedule"],
	["PVPBuildingDamageEnabledFriday", "Building damage on Friday", "Allows players to damage each other's buildings on Friday when building damage is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeFridayStart", "Building damage starts on Friday", "The time building damage starts on Friday, written as hours and minutes without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeFridayEnd", "Building damage ends on Friday", "The time building damage ends on Friday, written the same way.", "PvP Rules & Schedule"],
	["PVPBuildingDamageEnabledSaturday", "Building damage on Saturday", "Allows players to damage each other's buildings on Saturday when building damage is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeSaturdayStart", "Building damage starts on Saturday", "The time building damage starts on Saturday, written as hours and minutes without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeSaturdayEnd", "Building damage ends on Saturday", "The time building damage ends on Saturday, written the same way.", "PvP Rules & Schedule"],
	["PVPBuildingDamageEnabledSunday", "Building damage on Sunday", "Allows players to damage each other's buildings on Sunday when building damage is limited to the schedule.", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeSundayStart", "Building damage starts on Sunday", "The time building damage starts on Sunday, written as hours and minutes without a colon (1800 is 6 pm).", "PvP Rules & Schedule"],
	["PVPBuildingDamageTimeSundayEnd", "Building damage ends on Sunday", "The time building damage ends on Sunday, written the same way.", "PvP Rules & Schedule"],
	["AvatarSummoningTimeWeekdayStart", "Avatar summoning opens on weekdays", "The time of day the avatars can be summoned from on weekdays, written as hours and minutes without a colon. 0 for both start and end means no limit.", "Gameplay"],
	["AvatarSummoningTimeWeekdayEnd", "Avatar summoning closes on weekdays", "The time of day the avatars can be summoned until on weekdays, written as hours and minutes without a colon. 0 for both start and end means no limit.", "Gameplay"],
	["AvatarSummoningTimeWeekendStart", "Avatar summoning opens at weekends", "The time of day the avatars can be summoned from on weekends, written as hours and minutes without a colon. 0 for both start and end means no limit.", "Gameplay"],
	["AvatarSummoningTimeWeekendEnd", "Avatar summoning closes at weekends", "The time of day the avatars can be summoned until on weekends, written as hours and minutes without a colon. 0 for both start and end means no limit.", "Gameplay"],
	["RestrictPVPTime", "Restrict PvP to Scheduled Hours", "Limits PvP combat to the weekly schedule set below.", "PvP Rules & Schedule"],
	["RestrictPVPBuildingDamageTime", "Restrict Building Damage to Scheduled Hours", "Limits PvP structure damage to the weekly schedule set below.", "PvP Rules & Schedule"],
	["DisableBuildingDuringTimeRestrictedPVP", "Disable Building During Restricted PvP", "Prevents construction while scheduled PvP building-damage hours are active.", "PvP Rules & Schedule"],
	["CombatModeModifier", "Combat Mode Modifier", "Adjusts combat mode behavior/stance rules server-wide.", "PvP Rules & Schedule"],
	["FriendlyFireDamageMultiplier", "Friendly Fire Damage Multiplier", "Multiplies damage dealt between clan/guild members.", "PvP Rules & Schedule"],
	["PvPMountEnduranceDamageMultiplier", "Mounted PvP Endurance Damage Multiplier", "Multiplies endurance/stamina damage dealt to mounted players in PvP.", "PvP Rules & Schedule"],
	["MaxAggroRange", "Max NPC Aggro Range", "Maximum distance at which NPCs will notice and aggro onto players.", "PvP Rules & Schedule"],
	["ThrallExclusionRadius", "Thrall Exclusion Radius", "Radius around player bases where wild thralls won't spawn.", "PvP Rules & Schedule"],
	["AmbientLifeEnabled", "Ambient Wildlife Enabled", "Enables passive ambient wildlife spawns.", "PvP Rules & Schedule"],
	["DogsOfTheDesertSpawnWithDogs", "Dogs of the Desert Spawn With Dogs", "Enables the Dogs of the Desert NPC faction spawning with their dog companions.", "PvP Rules & Schedule"],
	["CrossDesertOnce", "Cross Desert Once", "Limits certain desert-crossing world events/spawns to occur only once.", "PvP Rules & Schedule"],
	["AvatarDomeDurationMultiplier", "Avatar Dome Duration Multiplier", "Multiplies how long a summoned Avatar's protective dome lasts.", "PvP Rules & Schedule"],
	["AvatarDomeDamageMultiplier", "Avatar Dome Damage Multiplier", "Multiplies damage dealt by a summoned Avatar's dome effect.", "PvP Rules & Schedule"],
	["AvatarsDisabled", "Disable Avatars", "Disables summoning of religion Avatars entirely.", "PvP Rules & Schedule"],
	["RestrictAvatarSummoningTime", "Restrict Avatar Summoning to Scheduled Hours", "Limits Avatar summoning to specific hours.", "PvP Rules & Schedule"],
	["AvatarLifetime", "Avatar Lifetime (sec)", "How long a summoned Avatar remains active.", "PvP Rules & Schedule"],
	["AvatarSummonTime", "Avatar Summon Cast Time (sec)", "Time required to complete the Avatar summoning ritual.", "PvP Rules & Schedule"],

	["PlayerDamageMultiplier", "Player Damage Dealt Multiplier", "Multiplies damage dealt by players.", "Player Stats & Combat"],
	["PlayerDamageTakenMultiplier", "Player Damage Taken Multiplier", "Multiplies damage taken by players.", "Player Stats & Combat"],
	["PlayerKnockbackMultiplier", "Player Knockback Multiplier", "Multiplies knockback force applied to players.", "Player Stats & Combat"],
	["PlayerEncumbranceMultiplier", "Player Carry Weight Multiplier", "Multiplies how much weight a player can carry before being encumbered.", "Player Stats & Combat"],
	["PlayerEncumbrancePenaltyMultiplier", "Encumbrance Penalty Multiplier", "Multiplies the movement penalty applied while overencumbered.", "Player Stats & Combat"],
	["PlayerMovementSpeedScale", "Player Movement Speed Scale", "Multiplies base player movement speed.", "Player Stats & Combat"],
	["PlayerSprintSpeedScale", "Player Sprint Speed Scale", "Multiplies player sprinting speed.", "Player Stats & Combat"],
	["PlayerStaminaCostSprintMultiplier", "Sprint Stamina Cost Multiplier", "Multiplies stamina consumed while sprinting.", "Player Stats & Combat"],
	["PlayerStaminaCostMultiplier", "Stamina Cost Multiplier", "Multiplies stamina consumed by actions in general.", "Player Stats & Combat"],
	["PlayerStaminaRegenSpeedScale", "Stamina Regen Speed Scale", "Multiplies how fast player stamina regenerates.", "Player Stats & Combat"],
	["StaminaRegenerationTime", "Stamina Regeneration Time", "Base time for stamina to fully regenerate.", "Player Stats & Combat"],
	["StaminaExhaustionTime", "Stamina Exhaustion Time", "Base time before stamina becomes fully exhausted under continuous use.", "Player Stats & Combat"],
	["StaminaStaticRegenRateMultiplier", "Stamina Regen (Standing Still) Multiplier", "Multiplies stamina regen rate while standing still.", "Player Stats & Combat"],
	["StaminaMovingRegenRateMultiplier", "Stamina Regen (Moving) Multiplier", "Multiplies stamina regen rate while moving.", "Player Stats & Combat"],
	["StaminaOnConsumeRegenPause", "Stamina Regen Pause After Use (sec)", "Seconds stamina regen is paused after consuming stamina.", "Player Stats & Combat"],
	["StaminaOnExhaustionRegenPause", "Stamina Regen Pause After Exhaustion (sec)", "Seconds stamina regen is paused after becoming fully exhausted.", "Player Stats & Combat"],
	["PlayerHealthRegenSpeedScale", "Health Regen Speed Scale", "Multiplies how fast player health regenerates.", "Player Stats & Combat"],
	["UnconsciousTimeSeconds", "Unconscious Duration (sec)", "How long a knocked-out player/thrall stays unconscious.", "Player Stats & Combat"],
	["ConciousnessDamageMultiplier", "Knockout Damage Multiplier", "Multiplies knockout (consciousness) damage dealt.", "Player Stats & Combat"],
	["PlayerXPRateMultiplier", "Player XP Rate Multiplier", "Multiplies overall experience gained by players.", "Player Stats & Combat"],
	["PlayerXPKillMultiplier", "XP From Kills Multiplier", "Multiplies experience gained from kills.", "Player Stats & Combat"],
	["PlayerXPHarvestMultiplier", "XP From Harvesting Multiplier", "Multiplies experience gained from harvesting.", "Player Stats & Combat"],
	["PlayerXPCraftMultiplier", "XP From Crafting Multiplier", "Multiplies experience gained from crafting.", "Player Stats & Combat"],
	["PlayerXPTimeMultiplier", "XP Over Time Multiplier", "Multiplies passive experience gained over time.", "Player Stats & Combat"],
	["PlayerCorruptionGainMultiplier", "Corruption Gain Multiplier", "Multiplies how fast players accumulate corruption.", "Player Stats & Combat"],
	["PlayerCorruptionGainFromSorceryMultiplier", "Corruption From Sorcery Multiplier", "Multiplies corruption gained specifically from using sorcery.", "Player Stats & Combat"],
	["EnableTargetLock", "Enable Target Lock", "Allows players to lock onto a target in combat.", "Player Stats & Combat"],
	["EnableFatalities", "Enable Fatalities", "Allows finishing-move fatalities on knocked-out targets.", "Player Stats & Combat"],
	["EnableClanMarkers", "Enable Clan Map Markers", "Shows clan member positions as markers on the map.", "Player Stats & Combat"],
	["EventLogPvPCauserPrivacy", "PvP Event Log Privacy", "Controls how much attacker identity detail is shown in the PvP combat log.", "Player Stats & Combat"],
	["EventLogPvECauserPrivacy", "PvE Event Log Privacy", "Controls how much attacker identity detail is shown in the PvE combat log.", "Player Stats & Combat"],
	["serverVoiceChat", "Voice Chat Mode", "Controls whether/how proximity voice chat is enabled on the server.", "Player Stats & Combat"],
	["ItemRepairMinimumDurability", "Item Repair Minimum Durability", "Minimum durability fraction an item can be repaired to before requiring full replacement.", "Player Stats & Combat"],
	["ItemRepairDurabilityLossByRepairkitTier", "Repair Kit Durability Loss By Tier", "Max-durability loss applied per repair, indexed by repair kit tier.", "Player Stats & Combat"],
	["ItemRepairDurabilityLossPenaltyChance", "Repair Durability Loss Chance", "Chance that a repair incurs the max-durability loss penalty.", "Player Stats & Combat"],
	["ItemConvertionMultiplier", "Item Conversion Multiplier", "Multiplies output from item conversion (e.g. altar conversions).", "Player Stats & Combat"],
	["FuelBurnTimeMultiplier", "Fuel Burn Time Multiplier", "Multiplies how long fuel lasts in furnaces/campfires/etc.", "Player Stats & Combat"],
	["CraftingCostMultiplier", "Crafting Resource Cost Multiplier", "Multiplies the resource cost of crafting recipes.", "Player Stats & Combat"],
	["CraftFromStorageRadius", "Craft From Storage Radius", "Radius within which nearby storage containers can supply crafting materials.", "Player Stats & Combat"],
	["BuildFromStorageRadius", "Build From Storage Radius", "Radius within which nearby storage containers can supply building materials.", "Player Stats & Combat"],
	["PersonalCraftFromStorageRadius", "Personal Craft From Storage Radius", "Radius within which storage can supply materials for personal (non-station) crafting.", "Player Stats & Combat"],
	["MaxAllowedPing", "Max Allowed Ping (ms)", "Disconnects/blocks players whose connection ping exceeds this. 0 = no limit.", "Player Stats & Combat"],
	["AllowFamilySharedAccount", "Allow Family Shared Accounts", "Allows players using Steam Family Sharing to join.", "Player Stats & Combat"],

	["NPCRespawnMultiplier", "NPC Respawn Rate Multiplier", "Multiplies how quickly killed NPCs respawn.", "NPCs & Thralls"],
	["NPCHealthMultiplier", "NPC Health Multiplier", "Multiplies NPC health.", "NPCs & Thralls"],
	["NPCDamageMultiplier", "NPC Damage Dealt Multiplier", "Multiplies damage dealt by NPCs.", "NPCs & Thralls"],
	["NPCDamageTakenMultiplier", "NPC Damage Taken Multiplier", "Multiplies damage taken by NPCs.", "NPCs & Thralls"],
	["NPCKnockbackMultiplier", "NPC Knockback Multiplier", "Multiplies knockback force applied to NPCs.", "NPCs & Thralls"],
	["NPCMindReadingMode", "NPC Mind Reading Mode", "Controls whether/how NPCs 'know' about threats without direct detection.", "NPCs & Thralls"],
	["NPCMaxSpawnCapMultiplier", "NPC Max Spawn Cap Multiplier", "Multiplies the server's overall NPC population cap.", "NPCs & Thralls"],
	["NPCCorpseLifeTime", "NPC Corpse Lifetime (sec)", "How long NPC corpses remain before disappearing.", "NPCs & Thralls"],
	["MinionDamageMultiplier", "Thrall/Pet Damage Dealt Multiplier", "Multiplies damage dealt by thralls and pets.", "NPCs & Thralls"],
	["MinionDamageTakenMultiplier", "Thrall/Pet Damage Taken Multiplier", "Multiplies damage taken by thralls and pets.", "NPCs & Thralls"],
	["MinionPopulationBaseValue", "Thrall Population Base", "Base number of followers a player can have before per-player scaling.", "NPCs & Thralls"],
	["MinionPopulationPerPlayer", "Thrall Population Per Player", "Additional follower slots granted per online player, if population limiting is on.", "NPCs & Thralls"],
	["UseMinionPopulationLimit", "Enable Thrall Population Limit", "Enables a server-wide cap on the number of active thralls/pets.", "NPCs & Thralls"],
	["MinionOverpopulationCleanup", "Thrall Overpopulation Cleanup Interval", "How often the server checks for and removes excess thralls over the population limit.", "NPCs & Thralls"],
	["MinionOverpopulationAllowed", "Thrall Overpopulation Grace Amount", "How far over the population limit thralls are allowed before cleanup triggers.", "NPCs & Thralls"],
	["EnableFollowerDbno", "Enable Follower Knockout State", "Allows followers to be knocked unconscious instead of always dying outright.", "NPCs & Thralls"],
	["EnableFollowerRescueOnLandClaimOnly", "Restrict Follower Rescue to Land Claim", "Only allows rescuing downed followers within your own land claim.", "NPCs & Thralls"],
	["EnableFollowerRescueInBuildExclusionZone", "Allow Follower Rescue In Build Exclusion Zones", "Allows rescuing downed followers even inside build-exclusion zones.", "NPCs & Thralls"],
	["FollowerRescueCooldown", "Follower Rescue Cooldown (sec)", "Cooldown before a downed follower can be rescued again.", "NPCs & Thralls"],
	["DamageCooldownBeforeRescue", "Damage Cooldown Before Rescue (sec)", "Time after taking damage before a downed follower becomes rescuable.", "NPCs & Thralls"],
	["ThrallDamageToPlayersMultiplier", "Thrall Damage To Players Multiplier", "Multiplies damage thralls deal to players.", "NPCs & Thralls"],
	["ThrallDamageToNPCsMultiplier", "Thrall Damage To NPCs Multiplier", "Multiplies damage thralls deal to NPCs.", "NPCs & Thralls"],
	["ThrallConversionMultiplier", "Thrall Conversion Speed Multiplier", "Multiplies how fast captured thralls convert to your side.", "NPCs & Thralls"],
	["ThrallCorruptionRemovalMultiplier", "Thrall Corruption Removal Multiplier", "Multiplies how effectively corruption is removed from thralls.", "NPCs & Thralls"],
	["ThrallScoutingTimeMinutes", "Thrall Scouting Time (min)", "How long a scouting thrall takes to return with information.", "NPCs & Thralls"],
	["ThrallMinDistanceAwayFromHome", "Thrall Min Distance From Home", "Minimum distance a thrall must travel from its home base while scouting/following.", "NPCs & Thralls"],
	["ThrallTeleportingCooldown", "Thrall Teleport Cooldown (sec)", "Cooldown before a stuck thrall auto-teleports back to you.", "NPCs & Thralls"],
	["ThrallDecayTime", "Thrall Decay Time (sec)", "Time before an unattended thrall structure/follower decays.", "NPCs & Thralls"],
	["DisableThrallDecay", "Disable Thrall Decay", "Prevents thralls from decaying while their owner is offline.", "NPCs & Thralls"],

	["ContainersIgnoreOwnership", "Containers Ignore Ownership", "Lets anyone access storage containers regardless of clan ownership.", "Building & Decay"],
	["LandClaimRadiusMultiplier", "Land Claim Radius Multiplier", "Multiplies the protected radius granted by land claim structures.", "Building & Decay"],
	["CachedLandClaimRadiusMultiplier", "Cached Land Claim Radius Multiplier", "Internal cached copy of the land claim radius multiplier used by the server.", "Building & Decay"],
	["DisableLandclaimNotifications", "Disable Land Claim Notifications", "Suppresses notifications when land claim status changes.", "Building & Decay"],
	["BuildingPreloadRadius", "Building Preload Radius", "Radius around players within which structures are preloaded.", "Building & Decay"],
	["CanDamagePlayerOwnedStructures", "Can Damage Player Structures", "Allows any damage source to affect player-owned structures (independent of PvP).", "Building & Decay"],
	["DynamicBuildingDamage", "Enable Dynamic Building Damage", "Scales building damage dynamically based on server conditions/time.", "Building & Decay"],
	["DynamicBuildingDamagePeriod", "Dynamic Building Damage Period (sec)", "Interval at which dynamic building damage scaling is recalculated.", "Building & Decay"],
	["CreativeModeServer", "Creative Mode Server", "Runs the server in creative/building mode (no survival restrictions).", "Building & Decay"],
	["BuildingReplicationDistance", "Building Replication Distance", "Distance at which building data replicates to clients. 0 uses the default.", "Building & Decay"],
	["CachedBuildingReplicationDistance", "Cached Building Replication Distance", "Internal cached copy of the building replication distance.", "Building & Decay"],
	["DisableBuildingAbandonment", "Disable Building Abandonment", "Prevents structures from ever being marked abandoned/decayed.", "Building & Decay"],
	["MaxBuildingDecayTime", "Max Building Decay Time (sec)", "Maximum time an unattended building can stand before being fully decayed.", "Building & Decay"],
	["MaxDecayTimeToAutoDemolish", "Max Decay Time To Auto-Demolish (sec)", "Time after full decay before a structure is automatically demolished.", "Building & Decay"],
	["BuildingDecayTimePerScore", "Building Decay Time Per Score", "Decay time granted per point of a structure's building score.", "Building & Decay"],
	["BuildingDecayTimeMultiplier", "Building Decay Time Multiplier", "Multiplies overall building decay time.", "Building & Decay"],
	["DecayCleanupTimeMultiplier", "Decay Cleanup Time Multiplier", "Multiplies the delay before fully-decayed structures are cleaned up.", "Building & Decay"],
	["DecayBonusTimeRate", "Decay Bonus Time Rate", "Rate at which bonus decay time accrues (e.g. from being online).", "Building & Decay"],
	["DecayShowBuildingScore", "Show Building Score In Decay UI", "Displays the numeric building score in the decay/stability UI.", "Building & Decay"],
	["StabilityLossMultiplier", "Structural Stability Loss Multiplier", "Multiplies how quickly structures lose stability when unsupported.", "Building & Decay"],
	["BuildingDamageMultiplier", "Building Damage Multiplier", "Multiplies damage dealt to structures.", "Building & Decay"],
	["StructureHealthMultiplier", "Structure Health Multiplier", "Multiplies structure max health.", "Building & Decay"],
	["StructureDamageMultiplier", "Structure Damage Multiplier", "Multiplies damage structures deal (e.g. traps).", "Building & Decay"],
	["BuildingValidationEnabled", "Enable Building Validation", "Enables server-side validation of building placement rules.", "Building & Decay"],
	["AllowBuildingAnywhere", "Allow Building Anywhere", "Disables normal terrain/zone restrictions on where structures can be placed.", "Building & Decay"],
	["BuildingPickupEnabled", "Enable Building Pickup", "Allows recently-placed structures to be picked back up.", "Building & Decay"],
	["PoiProtectionEnabled", "Enable POI Protection", "Prevents building inside protected points of interest.", "Building & Decay"],
	["EventSystemEnabled", "Enable World Event System", "Enables scripted world events.", "Building & Decay"],
	["CampsIgnoreLandclaim", "Camps Ignore Land Claim", "Lets NPC camps spawn/exist inside player land claims.", "Building & Decay"],
	["OfflinePlayersUnconsciousBodiesHours", "Offline Body Despawn Time (hrs)", "Hours before an offline player's knocked-out body is removed.", "Building & Decay"],
	["CorpsesPerPlayer", "Max Corpses Per Player", "Maximum number of your own death corpses kept on the map at once.", "Building & Decay"],
	["PlayerCorpseLifeTime", "Player Corpse Lifetime (sec)", "How long a player death corpse remains before disappearing.", "Building & Decay"],
	["AnimalPenCraftingTimeMultiplier", "Animal Pen Crafting Time Multiplier", "Multiplies how long animal pen breeding/crafting takes.", "Building & Decay"],
	["FeedBoxRangeMultiplier", "Feed Box Range Multiplier", "Multiplies the range a feed box can supply food to nearby pets/pens.", "Building & Decay"],


	["KickAFKPercentage", "AFK Kick CPU Threshold %", "Server load percentage above which AFK players start getting kicked to free resources.", "Admin & Misc"],
	["KickAFKTime", "AFK Kick Time (sec)", "How long a player can be inactive before being kicked as AFK.", "Admin & Misc"],
	["ShowOnlinePlayers", "Show Online Player Count", "Shows the online player count in the server browser.", "Admin & Misc"],
	["DisableChatFormatting", "Disable Chat Formatting", "Disables rich text formatting in chat messages.", "Admin & Misc"],
	["EnableLoginQueue", "Enable Login Queue", "Queues incoming connections when the server is full instead of rejecting them outright.", "Admin & Misc"],
	["DisconnectionGraceTime", "Disconnection Grace Time (sec)", "Time a disconnected player's character remains in the world before being removed.", "Admin & Misc"],
	["IsBattlEyeEnabled", "Enable BattlEye", "Enables the BattlEye anti-cheat system.", "Admin & Misc"],
	["ServerTransferEnabled", "Enable Server Transfers", "Allows players to transfer their character between servers.", "Admin & Misc"],
	["ServerTransferServersWhitelist", "Server Transfer Whitelist", "Comma-separated list of servers players are allowed to transfer to/from.", "Admin & Misc"],
	["ServerMergeOutgoingTime", "Server Merge Outgoing Time", "Scheduled time for an outgoing server merge, if configured.", "Admin & Misc"],
	["ServerMergeDestination", "Server Merge Destination", "Target server address for an outgoing server merge, if configured.", "Admin & Misc"],
	["ServerRetirementTime", "Server Retirement Time", "Scheduled time this server is set to retire/shut down, if configured.", "Admin & Misc"],
	["RegionAllowAfrica", "Allow Players From Africa", "Allows players connecting from the Africa region.", "Admin & Misc"],
	["RegionAllowAsia", "Allow Players From Asia", "Allows players connecting from the Asia region.", "Admin & Misc"],
	["RegionAllowCentralEurope", "Allow Players From Central Europe", "Allows players connecting from the Central Europe region.", "Admin & Misc"],
	["RegionAllowEasternEurope", "Allow Players From Eastern Europe", "Allows players connecting from the Eastern Europe region.", "Admin & Misc"],
	["RegionAllowWesternEurope", "Allow Players From Western Europe", "Allows players connecting from the Western Europe region.", "Admin & Misc"],
	["RegionAllowNorthAmerica", "Allow Players From North America", "Allows players connecting from the North America region.", "Admin & Misc"],
	["RegionAllowOceania", "Allow Players From Oceania", "Allows players connecting from the Oceania region.", "Admin & Misc"],
	["RegionAllowSouthAmerica", "Allow Players From South America", "Allows players connecting from the South America region.", "Admin & Misc"],
	["RegionBlockList", "Region Block List", "Comma-separated list of regions to explicitly block.", "Admin & Misc"],
	["MaxDeathMapMarkers", "Max Death Map Markers", "Maximum number of death location markers kept on the map per player.", "Admin & Misc"],
	["HealthbarVisibilityDistance", "Health Bar Visibility Distance", "Maximum distance at which enemy health bars are visible.", "Admin & Misc"],
	["BuildingPVPWhitelist", "Building PvP Whitelist", "List of structure/item IDs exempt from normal PvP building damage rules.", "Admin & Misc"],
	["ValidatePhysNavWalkWithRaycast", "Validate Pathing With Raycast", "Enables extra raycast validation for NPC pathing/navigation.", "Admin & Misc"],
	["ValidatePlayerStats", "Validate Player Stats", "Enables server-side validation of player stat values to catch tampering.", "Admin & Misc"],
	["bUndermeshDetectionEnabled", "Enable Undermesh Detection", "Detects and acts on players/structures found outside the normal collision mesh.", "Admin & Misc"],
	["AllowedTimeUndermesh", "Allowed Time Undermesh (sec)", "Grace period allowed underneath the mesh before undermesh detection acts.", "Admin & Misc"],
	["CapCharacterLayoutScalarParams", "Cap Character Scaling Params", "Clamps character body-scaling parameters to prevent extreme/exploited values.", "Admin & Misc"],
	["PathFollowingSendsAngularVelocity", "Path Following Sends Angular Velocity", "Includes angular velocity data in NPC path-following network updates.", "Admin & Misc"],

	]),
	CONAN_CHOICES,
);

// ───────────────────────── Minecraft (server.properties) ─────────────────────────

const minecraftSettings = withChoices(
	rows([
	["motd", "Message of the Day", "The line of text shown for this server in the multiplayer server list.", "Server Info"],
	["max-players", "Max Players", "Maximum number of players allowed on the server at once.", "Server Info"],
	["difficulty", "Difficulty", "World difficulty: peaceful, easy, normal, or hard.", "Gameplay"],
	["gamemode", "Default Game Mode", "Game mode new players join in: survival, creative, adventure, or spectator.", "Gameplay"],
	["hardcore", "Hardcore Mode", "Players are banned instead of respawning when they die.", "Gameplay"],
	["pvp", "PvP Enabled", "Allows players to fight and damage each other.", "Gameplay"],
	["force-gamemode", "Force Default Game Mode", "Forces players into the default game mode on join, overriding their saved mode.", "Gameplay"],
	["spawn-monsters", "Spawn Monsters", "Allows hostile mobs to spawn in the world.", "Gameplay"],
	["spawn-animals", "Spawn Animals", "Allows passive animals to spawn in the world.", "Gameplay"],
	["spawn-npcs", "Spawn Villagers", "Allows villager NPCs to spawn.", "Gameplay"],
	["generate-structures", "Generate Structures", "Allows structures (villages, temples, etc) to generate in new chunks.", "Gameplay"],
	["allow-nether", "Allow Nether", "Allows players to travel to the Nether dimension.", "Gameplay"],
	["allow-flight", "Allow Flight", "Allows players to fly in survival mode without being kicked for flying (needed for some mods).", "Gameplay"],
	["level-name", "World Folder Name", "The folder name used to store this world's data.", "World"],
	["level-seed", "World Seed", "Seed used to generate a new world. Leave blank for a random seed.", "World"],
	["level-type", "World Type", "Type of world to generate (default, flat, large biomes, amplified, etc).", "World"],
	["generator-settings", "World Generator Settings", "Advanced JSON settings passed to the world generator (used for flat worlds, etc).", "World"],
	["max-world-size", "Max World Size", "Maximum radius, in blocks, the world border can grow to.", "World"],
	["max-build-height", "Max Build Height", "Maximum height players can build to.", "World"],
	["view-distance", "View Distance (chunks)", "How many chunks in each direction the server sends to clients.", "World"],
	["simulation-distance", "Simulation Distance (chunks)", "How many chunks around each player are actively simulated (mobs, redstone, etc).", "World"],
	["entity-broadcast-range-percentage", "Entity Visibility Range (%)", "How far away players are sent mobs and other entities, as a percentage of normal. Lower saves bandwidth and CPU.", "World"],
	["spawn-protection", "Spawn Protection Radius", "Radius around the world spawn point that only operators can build in.", "World"],

	["white-list", "Enable Whitelist", "Restricts joining to players on the whitelist.", "Access Control"],
	["enforce-whitelist", "Enforce Whitelist Live", "Immediately kicks players removed from the whitelist instead of waiting for their next join.", "Access Control"],
	["enable-code-of-conduct", "Show Code of Conduct", "Shows players the server's code of conduct, from its codeofconduct folder, before they join.", "Access Control"],
	["online-mode", "Online Mode", "Verifies players against Mojang/Microsoft accounts. Turning this off allows unauthenticated (cracked) clients.", "Access Control"],
	["enforce-secure-profile", "Enforce Secure Chat Profile", "Requires players to have a Mojang-signed chat profile to join.", "Access Control"],
	["prevent-proxy-connections", "Prevent Proxy Connections", "Blocks connections detected as coming through a proxy/VPN.", "Access Control"],
	["player-idle-timeout", "Player Idle Timeout (min)", "Minutes of inactivity before an idle player is kicked. 0 disables.", "Access Control"],
	["op-permission-level", "Operator Permission Level", "Permission level (1-4) granted to server operators.", "Access Control"],
	["function-permission-level", "Function Permission Level", "Default permission level used when running functions.", "Access Control"],
	["hide-online-players", "Hide Online Players From Query", "Excludes the online player list from server list ping/query responses.", "Access Control"],

	["enable-command-block", "Enable Command Blocks", "Allows command blocks to run commands.", "Admin & Networking"],
	["enable-rcon", "Enable RCON", "Enables the RCON remote console interface used by this dashboard to query/control the server.", "Admin & Networking"],
	["rcon.port", "RCON Port", "Network port the RCON interface listens on.", "Admin & Networking"],
	["rcon.password", "RCON Password", "Password required to authenticate to the RCON interface.", "Admin & Networking"],
	["pause-when-empty-seconds", "Pause When Empty (seconds)", "How many seconds the server waits with nobody on before it pauses the world to save resources. 0 never pauses.", "Admin & Networking"],
	["management-server-enabled", "Enable Management Server", "Turns on the server's management interface, a remote connection other tools can use to run the server. GodlyPanel doesn't need it.", "Admin & Networking"],
	["management-server-host", "Management Server Address", "The address the management interface listens on. localhost keeps it to this PC.", "Admin & Networking"],
	["management-server-port", "Management Server Port", "The port the management interface listens on. 0 lets the game pick one.", "Admin & Networking"],
	["management-server-secret", "Management Server Secret", "The secret a tool must give to use the management interface. Keep it private.", "Admin & Networking"],
	["management-server-tls-enabled", "Management Server Encryption", "Encrypts the management connection (TLS). Leave it on unless a tool you use can't cope with it.", "Admin & Networking"],
	["management-server-tls-keystore", "Management Server Keystore", "The keystore file holding the certificate for the encrypted management connection.", "Admin & Networking"],
	["management-server-tls-keystore-password", "Management Server Keystore Password", "The password of that keystore. Keep it private.", "Admin & Networking"],
	["management-server-allowed-origins", "Management Server Allowed Origins", "Web addresses allowed to talk to the management interface from a browser. Leave empty for none.", "Admin & Networking"],
	["enable-query", "Enable Query Protocol", "Enables the GameSpy4 query protocol used by some server-list tools.", "Admin & Networking"],
	["query.port", "Query Port", "Network port the query protocol listens on.", "Admin & Networking"],
	["enable-status", "Enable Server List Ping", "Allows the server to respond to the multiplayer server-list ping.", "Admin & Networking"],
	["server-ip", "Bind IP Address", "Network interface IP the server binds to. Leave blank/0.0.0.0 to bind all interfaces.", "Admin & Networking"],
	["server-port", "Server Port", "Network port the server listens on for player connections.", "Admin & Networking"],
	["network-compression-threshold", "Network Compression Threshold", "Packet size, in bytes, above which network traffic is compressed.", "Admin & Networking"],
	["use-native-transport", "Use Native Transport", "Uses Linux-native network optimizations when available.", "Admin & Networking"],
	["rate-limit", "Packet Rate Limit", "Maximum packets per second accepted from a single connection. 0 disables the limit.", "Admin & Networking"],
	["broadcast-console-to-ops", "Broadcast Console Commands to Ops", "Shows command output run from the server console to online operators.", "Admin & Networking"],
	["broadcast-rcon-to-ops", "Broadcast RCON Commands to Ops", "Shows command output run over RCON to online operators.", "Admin & Networking"],
	["log-ips", "Log Player IP Addresses", "Includes player IP addresses in the server log.", "Admin & Networking"],
	["enable-jmx-monitoring", "Enable JMX Monitoring", "Exposes server metrics over JMX for external monitoring tools.", "Admin & Networking"],
	["sync-chunk-writes", "Synchronous Chunk Writes", "Writes chunk data to disk synchronously, trading performance for extra save safety.", "Admin & Networking"],
	["max-tick-time", "Max Tick Time (ms)", "How long a single tick can take before the server force-kills itself as watchdog protection.", "Admin & Networking"],
	["max-chained-neighbor-updates", "Max Chained Neighbor Updates", "Caps how many block updates can chain together (redstone/piston spam protection).", "Admin & Networking"],
	["snooper-enabled", "Enable Snooper", "Sends anonymous usage statistics to Mojang.", "Admin & Networking"],
	["region-file-compression", "Region File Compression", "Compression algorithm used for saved chunk region files.", "Admin & Networking"],
	["accepts-transfers", "Accept Server Transfers", "Allows players to be transferred in from another server via the transfer packet.", "Admin & Networking"],
	["bug-report-link", "Bug Report Link", "URL shown to players for reporting bugs, if set.", "Admin & Networking"],

	["require-resource-pack", "Require Resource Pack", "Forces players to accept the server resource pack to play.", "Resource Pack"],
	["resource-pack", "Resource Pack URL", "URL of the resource pack sent to joining players.", "Resource Pack"],
	["resource-pack-id", "Resource Pack UUID", "UUID identifying the resource pack.", "Resource Pack"],
	["resource-pack-prompt", "Resource Pack Prompt Text", "Custom message shown to players when prompted to download the resource pack.", "Resource Pack"],
	["resource-pack-sha1", "Resource Pack SHA-1", "SHA-1 checksum used to verify the resource pack download.", "Resource Pack"],
	["text-filtering-config", "Text Filtering Config", "Path to a chat text-filtering configuration, if used.", "Resource Pack"],
	["initial-enabled-packs", "Initially Enabled Data Packs", "Comma-separated data packs enabled when the world is first created.", "Resource Pack"],
	["initial-disabled-packs", "Initially Disabled Data Packs", "Comma-separated data packs disabled when the world is first created.", "Resource Pack"],

	]),
	MINECRAFT_CHOICES,
);

// ───────────────────────── Enshrouded ─────────────────────────

const enshroudedTop = withChoices(
	rows([
	["name", "Server Name", "The name shown for this server in the in-game server browser.", "Server Info"],
	["ip", "Bind IP Address", "Network interface IP the server binds to.", "Networking"],
	["queryPort", "Query Port", "Network port used for the server browser query.", "Networking"],
	["slotCount", "Max Players", "Maximum number of players allowed on the server.", "Server Info"],
	["voiceChatMode", "Voice Chat Mode", "How proximity voice chat behaves (e.g. Proximity, Global, Off).", "Server Info"],
	["enableVoiceChat", "Enable Voice Chat", "Turns proximity voice chat on or off.", "Server Info"],
	["enableTextChat", "Enable Text Chat", "Turns in-game text chat on or off.", "Server Info"],
	["gameSettingsPreset", "Game Settings Preset", "Named difficulty/rules preset the gameSettings below were based on.", "Server Info"],
	["saveDirectory", "Save Directory", "Folder path where world save data is stored.", "Advanced"],
	["logDirectory", "Log Directory", "Folder path where server logs are written.", "Advanced"],

	]),
	ENSHROUDED_TOP_CHOICES,
);

const enshroudedGameSettings = withChoices(
	rows([
	["playerHealthFactor", "Player Health Factor", "Multiplies player max health.", "Player"],
	["playerManaFactor", "Player Mana Factor", "Multiplies player max mana.", "Player"],
	["playerStaminaFactor", "Player Stamina Factor", "Multiplies player max stamina.", "Player"],
	["playerBodyHeatFactor", "Player Body Heat Factor", "Multiplies how well players retain body heat in cold areas.", "Player"],
	["playerDivingTimeFactor", "Player Diving Time Factor", "Multiplies how long players can hold their breath underwater.", "Player"],
	["enableDurability", "Enable Item Durability", "Turns equipment durability loss on or off.", "Player"],
	["enableStarvingDebuff", "Enable Starving Debuff", "Applies a debuff to players when their food/hunger runs out.", "Player"],
	["foodBuffDurationFactor", "Food Buff Duration Factor", "Multiplies how long food buffs last.", "Player"],
	["fromHungerToStarving", "Time From Hungry To Starving", "Time (nanoseconds) it takes a hungry player to become starving.", "Player"],
	["tombstoneMode", "Tombstone Mode", "What happens to your items on death (e.g. drop everything, keep backpack materials).", "Player"],

	["shroudTimeFactor", "Shroud Time Factor", "Multiplies how long players can survive inside the Shroud before taking effect damage.", "World"],
	["enableGliderTurbulences", "Enable Glider Turbulence", "Enables turbulence effects while gliding.", "World"],
	["weatherFrequency", "Weather Frequency", "How often weather changes occur.", "World"],
	["fishingDifficulty", "Fishing Difficulty", "Difficulty of the fishing minigame.", "World"],
	["dayTimeDuration", "Day Length", "Length of in-game daytime, in nanoseconds.", "World"],
	["nightTimeDuration", "Night Length", "Length of in-game nighttime, in nanoseconds.", "World"],
	["curseModifier", "Curse Modifier", "Adjusts the strength/frequency of the Shroud's curse effects.", "World"],

	["miningDamageFactor", "Mining Damage Factor", "Multiplies damage dealt to mineable terrain/resources.", "Resources"],
	["plantGrowthSpeedFactor", "Plant Growth Speed Factor", "Multiplies how fast farmed plants grow.", "Resources"],
	["resourceDropStackAmountFactor", "Resource Drop Amount Factor", "Multiplies the quantity of resources dropped when gathering.", "Resources"],
	["factoryProductionSpeedFactor", "Factory Production Speed Factor", "Multiplies crafting/production speed at factory stations.", "Resources"],
	["perkUpgradeRecyclingFactor", "Perk Upgrade Recycling Factor", "Fraction of resources refunded when re-speccing/recycling perk upgrades.", "Resources"],
	["perkCostFactor", "Perk Cost Factor", "Multiplies the resource cost of unlocking perks.", "Resources"],

	["experienceCombatFactor", "Combat XP Factor", "Multiplies experience gained from combat.", "Enemies & Bosses"],
	["experienceMiningFactor", "Mining XP Factor", "Multiplies experience gained from mining.", "Enemies & Bosses"],
	["experienceExplorationQuestsFactor", "Exploration/Quest XP Factor", "Multiplies experience gained from exploration and quests.", "Enemies & Bosses"],
	["randomSpawnerAmount", "Random Enemy Spawn Amount", "How many enemies spawn from random world spawners.", "Enemies & Bosses"],
	["aggroPoolAmount", "Enemy Aggro Pool Amount", "How many enemies can be aggroed onto players at once.", "Enemies & Bosses"],
	["enemyDamageFactor", "Enemy Damage Factor", "Multiplies damage dealt by enemies.", "Enemies & Bosses"],
	["enemyHealthFactor", "Enemy Health Factor", "Multiplies enemy max health.", "Enemies & Bosses"],
	["enemyStaminaFactor", "Enemy Stamina Factor", "Multiplies enemy stamina.", "Enemies & Bosses"],
	["enemyPerceptionRangeFactor", "Enemy Perception Range Factor", "Multiplies the distance at which enemies notice players.", "Enemies & Bosses"],
	["bossDamageFactor", "Boss Damage Factor", "Multiplies damage dealt by boss enemies.", "Enemies & Bosses"],
	["bossHealthFactor", "Boss Health Factor", "Multiplies boss max health.", "Enemies & Bosses"],
	["threatBonus", "Threat Bonus", "Multiplies threat/aggro generation.", "Enemies & Bosses"],
	["pacifyAllEnemies", "Pacify All Enemies", "Makes all enemies passive and non-hostile.", "Enemies & Bosses"],
	["tamingStartleRepercussion", "Taming Startle Repercussion", "What happens to taming progress if the creature being tamed is startled.", "Enemies & Bosses"],

	]),
	ENSHROUDED_GAME_CHOICES,
);

// ───────────────────────── RuneScape: Dragonwilds ─────────────────────────

const runeSettings = rows([
	["ServerName", "Server Name", "The name shown for this server in the in-game server browser.", "General"],
	["WorldPassword", "World Password", "Password players must enter to join the server. Leave blank for a public server.", "General"],
	["AdminPassword", "Admin Password", "Password required to gain admin privileges in-game.", "General"],
	["DefaultWorldName", "Default World/Save Name", "Name of the save file this server loads/creates.", "General"],
	["PlatformPolicy", "Who can join", "Which platforms' players may join. Crossplay lets players from every platform in.", "General"],
	["bAllowSendingCrashDumps", "Send crash reports", "Lets the server send a crash report to the game's makers when it crashes.", "General"],
]);

// ───────────────────────── Windrose ─────────────────────────

const windroseSettings = rows([
	["ServerName", "Server Name", "The name shown for this server in the in-game server browser.", "General"],
	["IsPasswordProtected", "Password Protected", "Requires players to enter a password to join.", "General"],
	["Password", "Server Password", "Password players must enter to join, when password protection is enabled.", "General"],
	["MaxPlayerCount", "Max Players", "Maximum number of players allowed on the server.", "General"],
	["UserSelectedRegion", "Server Region", "Region selected for this server, used for matchmaking/latency.", "General"],
	["AutoLoadLatestBackupIfHasBroken", "Auto-Load Latest Backup If Save Is Broken", "Automatically restores the most recent backup if the current save fails to load.", "General"],
	["InviteCode", "Invite code", "The code players type into the game to find and join this server. The game makes it; leave it as it is.", "General"],
	["CanLaunchMultipleServerInstances", "Allow several servers from one install", "Lets more than one copy of the server run from the same install at the same time.", "General"],
	["P2pProxyAddress", "P2P Proxy Address", "Address of the peer-to-peer relay/proxy used for NAT traversal.", "Networking"],
	["UseDirectConnection", "Use Direct Connection", "Connects players directly to this server's address instead of relaying through the P2P proxy.", "Networking"],
	["DirectConnectionServerAddress", "Direct Connection Address", "Public address players connect to directly, when direct connection is enabled.", "Networking"],
	["DirectConnectionServerPort", "Direct Connection Port", "Port players connect to directly, when direct connection is enabled.", "Networking"],
	["DirectConnectionProxyAddress", "Direct Connection Proxy Address", "Proxy address used as a fallback for direct connections.", "Networking"],
]);

// ───────────────────────── Palworld ─────────────────────────

const palworldSettings = withChoices(
	rows([
	["RandomizerType", "Randomizer Mode", "Shuffles which pals appear where, and what they are. None leaves the world as normal.", "Gameplay"],
	["RandomizerSeed", "Randomizer Seed", "The text that decides how the randomizer shuffles. The same seed gives the same shuffle.", "Gameplay"],
	["bIsRandomizerPalLevelRandom", "Randomize Pal Levels", "Gives randomized pals random levels too.", "Gameplay"],
	["PalStomachDecreaceRate", "Pal Hunger Rate", "How fast pals get hungry. 1 is normal; lower is slower.", "Gameplay"],
	["PalStaminaDecreaceRate", "Pal Stamina Drain Rate", "How fast pals use up stamina. 1 is normal; lower is slower.", "Gameplay"],
	["PalAutoHPRegeneRate", "Pal Health Regeneration", "How fast pals heal on their own. 1 is normal.", "Gameplay"],
	["PalAutoHpRegeneRateInSleep", "Pal Health Regeneration While Sleeping", "How fast pals heal while sleeping in their bed. 1 is normal.", "Gameplay"],
	["BuildObjectHpRate", "Structure Health Multiplier", "Multiplies how much damage structures can take before they break. 1 is normal.", "Gameplay"],
	["PhysicsActiveDropItemMaxNum", "Dropped Items With Physics", "How many dropped items may use physics at once. -1 means no limit.", "Admin"],
	["DropItemMaxNum_UNKO", "Droppings Limit", "The most pal droppings that may lie in the world at once.", "Admin"],
	["BaseCampMaxNumInGuild", "Bases Per Guild", "The most bases one guild may have.", "Gameplay"],
	["PalEggDefaultHatchingTime", "Egg Hatching Time (hours)", "How long the biggest eggs take to hatch, in hours. Smaller eggs take less. 0 hatches them at once.", "Gameplay"],
	["bCanPickupOtherGuildDeathPenaltyDrop", "Pick Up Other Guilds' Death Drops", "Lets players pick up what members of another guild dropped when they died.", "Gameplay"],
	["bEnableNonLoginPenalty", "Penalty For Staying Away", "Applies a penalty to a player's pals and base while they have not logged in for a long time.", "Gameplay"],
	["bEnableFastTravel", "Fast Travel", "Lets players fast travel between map points.", "Gameplay"],
	["bEnableFastTravelOnlyBaseCamp", "Fast Travel To Bases Only", "Limits fast travel to a player's own bases.", "Gameplay"],
	["bIsStartLocationSelectByMap", "Choose Start Location On The Map", "Lets new players pick where they start on the map.", "Gameplay"],
	["bExistPlayerAfterLogout", "Characters Stay In The World After Logging Out", "A player's character stays in the world after they log out, where others can attack it.", "Gameplay"],
	["bInvisibleOtherGuildBaseCampAreaFX", "Hide Other Guilds' Base Borders", "Hides the visual border around bases that belong to other guilds.", "Gameplay"],
	["bAllowClientMod", "Allow Client Mods", "Lets players join with mods installed on their own game.", "Admin"],
	["Region", "Region", "The region the server is listed under. Leave empty for the default.", "General"],
	["bUseAuth", "Check Player Accounts", "Checks that players are signed in to their platform account. Leave it on for a public server.", "Admin"],
	["BanListURL", "Ban List Address", "Where the server downloads its list of globally banned players from.", "Admin"],
	["RESTAPIEnabled", "Enable REST API", "Turns on the server's REST API, a web interface other tools use to run the server. The panel does not need it.", "Admin"],
	["RESTAPIPort", "REST API Port", "The port the REST API listens on. Keep it closed in your router unless you really need it.", "Admin"],
	["bIsShowJoinLeftMessage", "Show Join And Leave Messages", "Shows a message in chat when players join or leave.", "Gameplay"],
	["ItemCorruptionMultiplier", "Item Spoil Speed", "Multiplies how fast food and other items spoil. 1 is normal.", "Gameplay"],
	["MonsterFarmActionSpeedRate", "Ranch Work Speed", "Multiplies how fast pals work at the ranch. 1 is normal.", "Gameplay"],
	["FishingDifficultyRate", "Fishing Difficulty", "How hard fishing is. 1 is normal; higher is harder.", "Gameplay"],
	["DenyTechnologyList", "Locked Technologies", "Technologies players can't unlock, written as a list of their names.", "Gameplay"],
	["GuildRejoinCooldownMinutes", "Guild Rejoin Cooldown (minutes)", "How long a player must wait before joining a guild again after leaving one.", "Gameplay"],
	["AutoTransferMasterThresholdDays", "Guild Leader Away Limit (days)", "How many days a guild leader may be away before leadership passes to another member.", "Gameplay"],
	["bDisplayPvPItemNumOnWorldMap_BaseCamp", "Show PvP Items At Bases On The Map", "Shows how many PvP items each base holds on the world map.", "Gameplay"],
	["bDisplayPvPItemNumOnWorldMap_Player", "Show PvP Items Carried By Players On The Map", "Shows how many PvP items each player carries on the world map.", "Gameplay"],
	["AdditionalDropItemWhenPlayerKillingInPvPMode", "Extra Item Dropped On A PvP Kill", "The item a player drops in addition to their own when they are killed by another player.", "Gameplay"],
	["AdditionalDropItemNumWhenPlayerKillingInPvPMode", "Extra Item Count On A PvP Kill", "How many of that item are dropped.", "Gameplay"],
	["bAdditionalDropItemWhenPlayerKillingInPvPMode", "Drop An Extra Item On A PvP Kill", "Makes a player who is killed by another player drop the extra item below as well.", "Gameplay"],
	["bEnableVoiceChat", "Voice Chat", "Turns on in-game voice chat.", "Gameplay"],
	["VoiceChatMaxVolumeDistance", "Voice Chat Full Volume Distance", "How close players must be to hear each other at full volume.", "Gameplay"],
	["VoiceChatZeroVolumeDistance", "Voice Chat Silence Distance", "How far apart players must be before they can't hear each other at all.", "Gameplay"],
	["bAllowEnhanceStat_Health", "Allow Upgrading Health", "Lets players spend points on health.", "Gameplay"],
	["bAllowEnhanceStat_Attack", "Allow Upgrading Attack", "Lets players spend points on attack.", "Gameplay"],
	["bAllowEnhanceStat_Stamina", "Allow Upgrading Stamina", "Lets players spend points on stamina.", "Gameplay"],
	["bAllowEnhanceStat_Weight", "Allow Upgrading Carry Weight", "Lets players spend points on how much they can carry.", "Gameplay"],
	["bAllowEnhanceStat_WorkSpeed", "Allow Upgrading Work Speed", "Lets players spend points on work speed.", "Gameplay"],
	["bEnableBuildingPlayerUIdDisplay", "Show Who Built A Structure", "Shows which player built a structure.", "Gameplay"],
	["bAllowEnemyCampSpawnNearBaseCamp", "Enemy Camps Near Bases", "Lets enemy camps appear near players' bases.", "Gameplay"],
	["ServerName", "Server Name", "The name shown for this server in the in-game server browser.", "General"],
	["ServerDescription", "Server Description", "Short description shown in the server browser.", "General"],
	["ServerPassword", "Server Password", "Password players must enter to join the server.", "General"],
	["AdminPassword", "Admin Password", "Password required to gain admin privileges in-game.", "General"],
	["PublicIP", "Public IP", "Public IP address advertised for this server.", "General"],
	["PublicPort", "Public Port", "Public port advertised for this server.", "General"],
	["ServerPlayerMaxNum", "Max Players", "Maximum number of players allowed on the server.", "General"],
	["CoopPlayerMaxNum", "Max Co-op Players", "Maximum players allowed in a single co-op guild/base.", "General"],
	["RCONEnabled", "Enable RCON", "Enables the remote console (RCON) interface.", "General"],
	["RCONPort", "RCON Port", "Network port the RCON interface listens on.", "General"],

	["Difficulty", "Difficulty", "Overall server difficulty preset.", "Gameplay"],
	["DayTimeSpeedRate", "Day Speed Rate", "Multiplies how fast in-game daytime passes.", "Gameplay"],
	["NightTimeSpeedRate", "Night Speed Rate", "Multiplies how fast in-game nighttime passes.", "Gameplay"],
	["ExpRate", "Experience Rate", "Multiplies experience gained by players.", "Gameplay"],
	["PalCaptureRate", "Pal Capture Rate", "Multiplies the chance of successfully capturing a Pal.", "Gameplay"],
	["PalSpawnNumRate", "Pal Spawn Rate", "Multiplies how many Pals spawn in the world.", "Gameplay"],
	["PalDamageRateAttack", "Pal Damage Dealt Rate", "Multiplies damage dealt by Pals.", "Gameplay"],
	["PalDamageRateDefense", "Pal Damage Taken Rate", "Multiplies damage taken by Pals.", "Gameplay"],
	["PlayerDamageRateAttack", "Player Damage Dealt Rate", "Multiplies damage dealt by players.", "Gameplay"],
	["PlayerDamageRateDefense", "Player Damage Taken Rate", "Multiplies damage taken by players.", "Gameplay"],
	["PlayerStomachDecreaceRate", "Player Hunger Decrease Rate", "Multiplies how fast player hunger depletes.", "Gameplay"],
	["PlayerStaminaDecreaceRate", "Player Stamina Decrease Rate", "Multiplies how fast player stamina depletes.", "Gameplay"],
	["PlayerAutoHPRegeneRate", "Player HP Regen Rate", "Multiplies how fast player health regenerates.", "Gameplay"],
	["PlayerAutoHpRegeneRateInSleep", "Player HP Regen Rate (Sleeping)", "Multiplies how fast player health regenerates while sleeping.", "Gameplay"],
	["BuildObjectDamageRate", "Base Damage Rate", "Multiplies damage dealt to player bases/structures.", "Gameplay"],
	["BuildObjectDeteriorationDamageRate", "Base Deterioration Rate", "Multiplies how fast unmaintained base structures deteriorate.", "Gameplay"],
	["CollectionDropRate", "Gathering Drop Rate", "Multiplies resources gathered from collectible nodes.", "Gameplay"],
	["CollectionObjectHpRate", "Gathering Node Health Rate", "Multiplies the health of gatherable resource nodes.", "Gameplay"],
	["CollectionObjectRespawnSpeedRate", "Gathering Node Respawn Rate", "Multiplies how fast gathered resource nodes respawn.", "Gameplay"],
	["EnemyDropItemRate", "Enemy Drop Rate", "Multiplies item drop chance from defeated enemies.", "Gameplay"],
	["DeathPenalty", "Death Penalty", "What players lose on death (none, item, all, everything including base).", "Gameplay"],
	["bEnablePlayerToPlayerDamage", "Enable Player vs Player Damage", "Allows players to damage each other.", "Gameplay"],
	["bEnableFriendlyFire", "Enable Friendly Fire", "Allows guild members to damage each other.", "Gameplay"],
	["bEnableInvaderEnemy", "Enable Invader Enemies", "Enables random hostile invasions of player bases.", "Gameplay"],
	["bActiveUNKO", "Enable Poop Pals", "Enables the poop-producing Pal mechanic (UNKO).", "Gameplay"],
	["bEnableAimAssistPad", "Enable Aim Assist (Controller)", "Enables aim assist for controller/gamepad players.", "Gameplay"],
	["bEnableAimAssistKeyboard", "Enable Aim Assist (Keyboard)", "Enables aim assist for keyboard/mouse players.", "Gameplay"],
	["DropItemMaxNum", "Max Dropped Items", "Maximum number of dropped items kept in the world at once.", "Gameplay"],
	["DropItemAliveMaxHours", "Dropped Item Lifetime (hrs)", "Hours a dropped item remains before disappearing.", "Gameplay"],
	["BaseCampMaxNum", "Max Base Camps", "Maximum number of base camps allowed server-wide.", "Gameplay"],
	["BaseCampWorkerMaxNum", "Max Pal Workers Per Base", "Maximum number of Pals that can work at a single base camp.", "Gameplay"],
	["GuildPlayerMaxNum", "Max Players Per Guild", "Maximum number of players allowed in a single guild.", "Gameplay"],
	["bAutoResetGuildNoOnlinePlayers", "Auto-Reset Guilds With No Online Players", "Automatically disbands/resets guilds that have had no online members for a while.", "Gameplay"],
	["AutoResetGuildTimeNoOnlinePlayers", "Auto-Reset Guild Timer (hrs)", "Hours with no online guild members before an auto-reset triggers.", "Gameplay"],
	["WorkSpeedRate", "Pal Work Speed Rate", "Multiplies how fast working Pals complete tasks.", "Gameplay"],
	["AutoSaveSpan", "Auto-Save Interval (min)", "Minutes between automatic world saves.", "Gameplay"],
	["bIsMultiplay", "Multiplayer Enabled", "Enables multiplayer on this server (should stay on for a dedicated server).", "Gameplay"],
	["bIsPvP", "PvP Enabled", "Turns on player-vs-player combat server-wide.", "Gameplay"],
	["bHardcore", "Hardcore Mode", "Enables permadeath-style hardcore rules.", "Gameplay"],
	["bPalLost", "Pals Can Be Lost On Death", "Allows Pals to be permanently lost if their owner dies.", "Gameplay"],
	["bCharacterRecreateInHardcore", "Allow Character Recreation In Hardcore", "Allows creating a new character after a hardcore death instead of being locked out.", "Gameplay"],
	["bBuildAreaLimit", "Enable Build Area Limit", "Restricts building to a limited area around base camps.", "Gameplay"],
	["ItemWeightRate", "Item Weight Rate", "Multiplies the carry weight of items.", "Gameplay"],
	["MaxBuildingLimitNum", "Max Building Count", "Maximum number of buildable objects allowed server-wide.", "Gameplay"],
	["ServerReplicatePawnCullDistance", "Pawn Network Cull Distance", "Distance beyond which characters/creatures stop being networked to a client, for performance.", "Gameplay"],
	["bAllowGlobalPalboxExport", "Allow Global Palbox Export", "Allows exporting Pals from any Palbox to any other, server-wide.", "Gameplay"],
	["bAllowGlobalPalboxImport", "Allow Global Palbox Import", "Allows importing Pals into any Palbox from any other, server-wide.", "Gameplay"],
	["EquipmentDurabilityDamageRate", "Equipment Durability Damage Rate", "Multiplies how fast equipment durability depletes.", "Gameplay"],
	["ItemContainerForceMarkDirtyInterval", "Item Container Sync Interval", "How often item containers are force-synced to prevent desync, in seconds.", "Gameplay"],

	["bShowPlayerList", "Show Player List", "Shows the connected player list to clients.", "Admin"],
	["ChatPostLimitPerMinute", "Chat Messages Per Minute Limit", "Maximum chat messages a player can send per minute (spam protection).", "Admin"],
	["CrossplayPlatforms", "Allowed Crossplay Platforms", "Platforms allowed to crossplay together on this server.", "Admin"],
	["bIsUseBackupSaveData", "Use Backup Save Data", "Falls back to a backup save if the primary save fails to load.", "Admin"],
	["LogFormatType", "Log Format", "Output format used for server logs.", "Admin"],
	["SupplyDropSpan", "Supply Drop Interval (min)", "Minutes between scheduled supply drop events.", "Admin"],
	["EnablePredatorBossPal", "Enable Predator Boss Pals", "Enables the special Predator boss Pal variants.", "Admin"],
	["MaxBuildingLimitNumPerPlayer", "Max Buildings Per Player", "The most structures one player may build. 0 means no limit.", "Admin"],

	]),
	PALWORLD_CHOICES,
);

// ───────────────────────── Catalog ─────────────────────────
//
// Per game, per file:
//   parser         how the file is read (see ConfigPage's PARSERS)
//   settings       what each setting is called and does, keyed by "Section::Key" (or the bare key, or a JSON path)
//   groupOrder     the order the groups are listed in (a group not named goes after, in file order)
//   launch         true for the "Launch options" file, which is the start script's launch line
//   excludeSections/excludeKeys/excludePaths   things in the file that are never shown
// Settings are listed in the order they are written below, which is the order the form shows them in.

/** The settings of a game's launch line, as catalog entries keyed like the form's fields. */
function launchSettings(def) {
	const out = {};
	for (const arg of def.args) {
		if (arg.edit === false || /\s/.test(arg.flag) && !arg.key) continue;
		const key = arg.key ?? arg.flag.replace(/^[-+]+/, "");
		out[key] = {
			label: arg.label,
			description: arg.managed ? `${arg.description} (GodlyPanel puts this on the line when it creates the server; change it with care.)` : arg.description,
			group: arg.group,
			placeholder: arg.example,
			type: arg.kind === "bool" ? "boolean" : /^-?\d+(\.\d+)?$/.test(arg.example ?? "") ? "number" : "text",
			...(arg.options ? { options: arg.options.map((o) => (Array.isArray(o) ? { value: o[0], label: o[1] } : { value: o, label: o })), ...(arg.allowCustom ? { allowCustom: true } : {}) } : {}),
		};
	}
	return out;
}

const launchFile = (game) => ({
	parser: "launchArgs",
	launch: true,
	excludeSections: [],
	sectionLabels: {},
	settings: launchSettings(LAUNCH_ARGS[game]),
	groupOrder: ["Server", "World", "Network", "Memory", "Saves and logs", "Files"],
});

export const CONFIG_CATALOG = {
	ark: {
		files: {
			"GameUserSettings.ini": {
				parser: "ini",
				excludeSections: [
					"Startup",
					"ScalabilityGroups",
					"SystemSettings",
					"/Script/Engine.GameUserSettings",
					"/Script/ShooterGame.ShooterGameUserSettings",
				],
				sectionLabels: {
					ServerSettings: "Server Settings",
					SessionSettings: "Session",
					MessageOfTheDay: "Message of the Day",
					"/Script/Engine.GameSession": "Session Limits",
				},
				settings: {
					...prefixKeys("SessionSettings", arkSessionSettings),
					...prefixKeys("/Script/Engine.GameSession", arkGameSessionSettings),
					...prefixKeys("MessageOfTheDay", arkMotdSettings),
					...prefixKeys("ServerSettings", arkServerSettings),
				},
				groupOrder: ["Session", "General", "Taming & Breeding", "Harvesting & Resources", "Dinos & Wild Population", "PvP & Structures", "Admin & Performance", "Cryo & Data Transfer", "Misc / ASA Features"],
			},
			"Game.ini": {
				parser: "ini",
				excludeSections: [],
				sectionLabels: {
					"/Script/ShooterGame.ShooterGameMode": "Gameplay Multipliers",
					ShooterGameMode_TEMPOverrides: "Temporary Overrides",
				},
				settings: {
					...prefixKeys("/Script/ShooterGame.ShooterGameMode", arkGameSettings),
				},
			},
		},
	},
	conan: {
		files: {
			"ServerSettings.ini": {
				parser: "ini",
				excludeSections: [],
				sectionLabels: { ServerSettings: "Server Settings" },
				settings: { ...prefixKeys("ServerSettings", conanSettings) },
			},
		},
	},
	minecraft: {
		files: {
			"server.properties": {
				parser: "properties",
				excludeSections: [],
				sectionLabels: { root: "Server Properties" },
				settings: { ...prefixKeys("root", minecraftSettings) },
				groupOrder: ["Server Info", "Gameplay", "World", "Access Control", "Admin & Networking", "Resource Pack"],
			},
		},
	},
	enshrouded: {
		files: {
			"enshrouded_server.json": {
				parser: "json",
				excludePaths: [],
				structuredPaths: ["userGroups"],
				sectionLabels: { "": "Server Info", gameSettings: "Game Settings", userGroups: "User Groups" },
				settings: {
					...prefixJson("", enshroudedTop),
					...prefixJson("gameSettings", enshroudedGameSettings),
				},
				groupOrder: ["Server Info", "Networking", "Player", "World", "Resources", "Enemies & Bosses", "Advanced"],
			},
		},
	},
	"7days": {
		files: {
			"serverconfig.xml": {
				parser: "xml",
				excludeSections: [],
				sectionLabels: {},
				settings: { ...sevenDaysSettings },
				groupOrder: sevenDaysGroupOrder,
			},
			"Launch options": launchFile("7days"),
		},
	},
	subsistence: {
		files: {
			"UDKDedServerSettings.ini": {
				parser: "ini",
				excludeSections: ["IniVersion", "Configuration"],
				sectionLabels: { [SUBSISTENCE_SECTION]: "Server settings" },
				settings: { ...prefixKeys(SUBSISTENCE_SECTION, subsistenceSettings) },
				groupOrder: subsistenceGroupOrder,
			},
		},
	},
	rune: {
		files: {
			"DedicatedServer.ini": {
				parser: "ini",
				excludeSections: [],
				excludeKeys: ["OwnerId", "ServerGuid"],
				sectionLabels: { "/Script/Dominion.DedicatedServerSettings": "General" },
				settings: {
					...prefixKeys("/Script/Dominion.DedicatedServerSettings", runeSettings),
				},
			},
		},
	},
	windrose: {
		files: {
			"ServerDescription.json": {
				parser: "json",
				excludePaths: [
					"Version",
					"DeploymentId",
					"ServerDescription_Persistent.PersistentServerId",
					"ServerDescription_Persistent.WorldIslandId",
				],
				structuredPaths: [],
				sectionLabels: { ServerDescription_Persistent: "General" },
				settings: {
					...prefixJson("ServerDescription_Persistent", windroseSettings),
				},
			},
		},
	},
	// Valheim has no settings file: the server is set up by the arguments on the line of its start script that launches it.
	valheim: {
		files: {
			"Launch options": {
				parser: "valheimLaunch",
				launch: true,
				excludeSections: [],
				sectionLabels: {},
				settings: launchSettings(LAUNCH_ARGS.valheim),
				groupOrder: ["Server", "World modifiers", "Saves and logs"],
			},
		},
	},
	palword: {
		files: {
			"PalWorldSettings.ini": {
				parser: "palworld",
				excludeSections: [],
				sectionLabels: {},
				settings: { ...palworldSettings },
				groupOrder: ["General", "Gameplay", "Admin"],
			},
		},
	},
	rust: {
		files: {
			"server.cfg": {
				parser: "convar",
				excludeSections: [],
				sectionLabels: { root: "Server" },
				settings: { ...rustSettings },
				groupOrder: rustGroupOrder,
				// The game doesn't make this file until it is asked to, so it may not be there yet.
				mayBeMissing: "Rust does not make server.cfg itself: `server.writecfg` in the console saves its settings to serverauto.cfg, a different file, which is not shown here. You can write a server.cfg here: each line is a setting name and its value, such as server.hostname \"My Server\". A setting on the launch line wins over one in this file.",
			},
			"Launch options": launchFile("rust"),
		},
	},
	zomboid: {
		files: {
			"servertest.ini": {
				parser: "ini",
				excludeSections: [],
				sectionLabels: { root: "Server" },
				settings: { ...zomboidSettings },
				groupOrder: zomboidGroupOrder,
				mayBeMissing: "The game makes this file the first time the server starts. Start the server once, then come back.",
			},
			"Launch options": launchFile("zomboid"),
		},
	},
	vrising: {
		files: {
			"ServerHostSettings.json": {
				parser: "json",
				excludePaths: [],
				structuredPaths: [],
				sectionLabels: {},
				settings: { ...vrisingSettings },
				groupOrder: vrisingGroupOrder,
			},
			"ServerGameSettings.json": {
				parser: "json",
				excludePaths: [],
				structuredPaths: [],
				sectionLabels: {},
				settings: { ...vrisingWorldSettings },
				groupOrder: vrisingWorldGroupOrder,
				mayBeMissing: "V Rising uses the rules it ships with until this file is in the save folder. Copy VRisingServer_Data\\StreamingAssets\\Settings\\ServerGameSettings.json to save-data\\Settings\\ in the server's folder, then reload this page.",
			},
			"Launch options": launchFile("vrising"),
		},
	},
	sotf: {
		files: {
			"dedicatedserver.cfg": {
				parser: "json",
				excludePaths: [],
				structuredPaths: [],
				sectionLabels: { "": "Server", GameSettings: "Game rules (advanced)", CustomGameModeSettings: "Custom game mode rules" },
				settings: { ...sotfSettings },
				groupOrder: sotfGroupOrder,
			},
			"Launch options": launchFile("sotf"),
		},
	},
	corekeeper: { files: { "Launch options": launchFile("corekeeper") } },
	satisfactory: { files: { "Launch options": launchFile("satisfactory") } },
};

function prefixKeys(section, settingsMap) {
	const out = {};
	for (const [key, meta] of Object.entries(settingsMap)) {
		out[`${section}::${key}`] = meta;
	}
	return out;
}

function prefixJson(basePath, settingsMap) {
	const out = {};
	for (const [key, meta] of Object.entries(settingsMap)) {
		out[basePath ? `${basePath}.${key}` : key] = meta;
	}
	return out;
}

// The backend reports a game's settings files by name only where a server records several (ARK's two). For a game with one
// settings file it calls that file "config", and the "Launch options" file (the start script) goes by its own name. So "config"
// means the game's first file that isn't the launch line.
function resolveFileCatalog(gameCatalog, fileName) {
	if (!gameCatalog) return null;
	if (gameCatalog.files[fileName]) return gameCatalog.files[fileName];

	if (fileName === "config") {
		const own = Object.values(gameCatalog.files).filter((f) => !f.launch);
		if (own.length === 1) return own[0];
	}
	return null;
}

function lookupId(entry) {
	if (entry.path !== undefined) return entry.path;
	return `${entry.section}::${entry.key}`;
}

function findMeta(fileCatalog, entry) {
	const id = lookupId(entry);
	return fileCatalog.settings[id] || fileCatalog.settings[entry.key] || null;
}

function isExcluded(fileCatalog, entry) {
	if (fileCatalog.excludeSections?.includes(entry.section)) return true;
	if (fileCatalog.excludeKeys?.includes(entry.key)) return true;
	if (fileCatalog.excludePaths) {
		for (const p of fileCatalog.excludePaths) {
			if (entry.path === p) return true;
		}
	}
	return false;
}

function groupFor(fileCatalog, entry, meta) {
	if (meta?.group) return meta.group;
	if (entry.section !== undefined) {
		return fileCatalog.sectionLabels?.[entry.section] || entry.section;
	}
	const top = entry.topLevel || "";
	return fileCatalog.sectionLabels?.[top] || prettifyKey(top || "General");
}

const NO_FILE = { excludeSections: [], sectionLabels: {}, settings: {} };

/** The catalog of one settings file, or null for a game or file the panel knows nothing about. */
export function getFileCatalog(gameType, fileName) {
	const gameCatalog = CONFIG_CATALOG[(gameType || "").toLowerCase()];
	return resolveFileCatalog(gameCatalog, fileName);
}

/**
 * Turns flat parser entries into { groups: [{ name, settings }] } for ConfigForm: applies the catalog's exclusions, labels,
 * explanations and choices, puts the groups and the settings in the catalog's order (what the file lists that the catalog doesn't
 * know goes after, in file order), and falls back to a prettified key name for anything not in the catalog.
 *
 * `undocumented` counts the settings that have no explanation: ones from mods, or from a newer version of the game than the
 * catalog was written for. The form says so, since mods are not explained.
 */
export function annotateEntries(gameType, fileName, entries) {
	const fileCatalog = getFileCatalog(gameType, fileName) || NO_FILE;
	const position = new Map(Object.keys(fileCatalog.settings).map((key, i) => [key, i]));
	const groupRank = new Map((fileCatalog.groupOrder ?? []).map((name, i) => [name, i]));

	const groupsMap = new Map();
	let undocumented = 0;

	entries.forEach((entry, fileIndex) => {
		if (isExcluded(fileCatalog, entry)) return;

		const meta = findMeta(fileCatalog, entry);
		const label =
			meta?.label ||
			prettifyKey(entry.key) +
				(entry.repeatCount > 1 ? ` (#${entry.occurrence + 1})` : "");
		const description = meta?.description || entry.comment || "";
		if (!meta?.description && !entry.comment) undocumented += 1;
		const groupName = groupFor(fileCatalog, entry, meta);
		const metaKey = fileCatalog.settings[lookupId(entry)] ? lookupId(entry) : entry.key;
		const rank = meta ? (position.get(metaKey) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;

		if (!groupsMap.has(groupName)) groupsMap.set(groupName, []);
		groupsMap.get(groupName).push({
			...entry,
			label,
			description,
			documented: Boolean(meta?.description || entry.comment),
			options: meta?.options,
			allowCustom: meta?.allowCustom,
			placeholder: meta?.placeholder,
			type: meta?.type,
			clearable: Boolean(fileCatalog.launch),
			_rank: rank,
			_file: fileIndex,
		});
	});

	const groups = Array.from(groupsMap.entries()).map(([name, settings], appearance) => ({
		name,
		appearance,
		settings: settings.sort((a, b) => a._rank - b._rank || a._file - b._file).map(({ _rank, _file, ...rest }) => rest),
	}));
	groups.sort((a, b) => (groupRank.get(a.name) ?? 1000) - (groupRank.get(b.name) ?? 1000) || a.appearance - b.appearance);

	return {
		groups: groups.map(({ appearance, ...group }) => group),
		structuredPaths: fileCatalog.structuredPaths || [],
		undocumented,
	};
}

export function getStructuredPaths(gameType, fileName) {
	return getFileCatalog(gameType, fileName)?.structuredPaths || [];
}

/** The names of every setting the catalog explains for a file, so a parser can offer ones the file doesn't have yet. */
export function getCatalogKeys(gameType, fileName) {
	return Object.keys(getFileCatalog(gameType, fileName)?.settings ?? {});
}

/** What to tell the person when the file may not exist yet, or null. */
export function getMissingFileNote(gameType, fileName) {
	return getFileCatalog(gameType, fileName)?.mayBeMissing ?? null;
}

export function getFileParser(gameType, fileName) {
	const fileCatalog = getFileCatalog(gameType, fileName);
	if (fileCatalog?.parser) return fileCatalog.parser;

	if (fileName === "Launch options") return "launchArgs";
	if (fileName.endsWith(".json")) return "json";
	if (fileName.endsWith(".xml")) return "xml";
	if (fileName === "server.properties") return "properties";
	return "ini";
}

/** The launch-argument definition behind a game's "Launch options" file, if it has one. */
export function getLaunchDef(gameType) {
	return launchDefFor(gameType);
}

/** The name of a game's own settings file (the first one that isn't the launch line), or null. */
export function getPrimaryFileName(gameType) {
	const game = CONFIG_CATALOG[(gameType || "").toLowerCase()];
	return game ? (Object.entries(game.files).find(([, f]) => !f.launch)?.[0] ?? null) : null;
}

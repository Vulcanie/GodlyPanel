import { prettifyKey } from "./utils/prettifyKey";

function rows(list) {
	const map = {};
	for (const [key, label, description, group] of list) {
		map[key] = { label, description, group };
	}
	return map;
}

// ───────────────────────── ARK: Survival Ascended / Evolved ─────────────────────────

const arkServerSettings = rows([
	["DifficultyOffset", "Difficulty Offset", "Overall difficulty (0-1). Raises the level range of wild dinos and loot quality as it increases.", "General"],
	["OverrideOfficialDifficulty", "Max Difficulty Multiplier", "Caps how high wild dino levels and loot quality can scale, independent of Difficulty Offset.", "General"],
	["ServerAdminPassword", "Admin Password", "Password required to use admin commands in-game.", "General"],
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
	["MatingIntervalMultiplier", "Mating Interval Multiplier", "Multiplies the cooldown between a dino's mating attempts (lower = more frequent).", "Taming & Breeding"],
	["EggHatchSpeedMultiplier", "Egg Hatch Speed Multiplier", "Multiplies how fast fertilized eggs hatch.", "Taming & Breeding"],
	["BabyMatureSpeedMultiplier", "Baby Maturation Speed Multiplier", "Multiplies how fast baby dinos grow to adulthood.", "Taming & Breeding"],
	["BabyFoodConsumptionSpeedMultiplier", "Baby Food Consumption Multiplier", "Multiplies how fast baby dinos consume food.", "Taming & Breeding"],
	["BabyCuddleIntervalMultiplier", "Baby Cuddle Interval Multiplier", "Multiplies the time between required imprint cuddle/care events (lower = more frequent).", "Taming & Breeding"],
	["BabyCuddleGracePeriodMultiplier", "Baby Cuddle Grace Period Multiplier", "Multiplies the grace period allowed before a missed cuddle hurts imprint quality.", "Taming & Breeding"],
	["BabyCuddleLoseImprintQualitySpeedMultiplier", "Imprint Quality Loss Speed Multiplier", "Multiplies how fast imprint quality drops after a missed cuddle.", "Taming & Breeding"],
	["BabyImprintingStatScaleMultiplier", "Imprint Stat Bonus Multiplier", "Multiplies the stat bonus a dino gets per percent of imprint quality.", "Taming & Breeding"],
	["BabyImprintAmountMultiplier", "Imprint Gain Per Cuddle Multiplier", "Multiplies how much imprint percentage is gained per successful cuddle.", "Taming & Breeding"],
	["LayEggIntervalMultiplier", "Egg Laying Interval Multiplier", "Multiplies the interval between a female dino laying eggs.", "Taming & Breeding"],

	["HarvestAmountMultiplier", "Harvest Amount Multiplier", "Multiplies the amount of resources gathered per harvest action.", "Harvesting & Resources"],
	["ResourcesRespawnPeriodMultiplier", "Resource Respawn Time Multiplier", "Multiplies how long it takes harvested resource nodes to respawn.", "Harvesting & Resources"],
	["ItemStackSizeMultiplier", "Item Stack Size Multiplier", "Multiplies the max stack size for stackable items.", "Harvesting & Resources"],
	["ClampItemSpoilingTimes", "Clamp Spoiling Times to Official Values", "Prevents item spoil timers from exceeding official-server maximums.", "Harvesting & Resources"],
	["GlobalSpoilingTimeMultiplier", "Spoiling Time Multiplier", "Multiplies how long perishable items take to spoil.", "Harvesting & Resources"],
	["GlobalItemDecompositionTimeMultiplier", "Dropped Item Decay Multiplier", "Multiplies how long dropped items last before disappearing.", "Harvesting & Resources"],
	["GlobalCorpseDecompositionTimeMultiplier", "Corpse Decay Multiplier", "Multiplies how long corpses last before disappearing.", "Harvesting & Resources"],
	["ResourceNoReplenishRadiusPlayers", "No-Respawn Radius Around Players", "Multiplies the radius around players where resources won't respawn.", "Harvesting & Resources"],
	["ResourceNoReplenishRadiusStructures", "No-Respawn Radius Around Structures", "Multiplies the radius around structures where resources won't respawn.", "Harvesting & Resources"],
	["CropGrowthSpeedMultiplier", "Crop Growth Speed Multiplier", "Multiplies how fast planted crops grow.", "Harvesting & Resources"],
	["CropDecaySpeedMultiplier", "Crop Decay Speed Multiplier", "Multiplies how fast unharvested crops decay.", "Harvesting & Resources"],
	["FuelConsumptionIntervalMultiplier", "Fuel Consumption Multiplier", "Multiplies how quickly fuel is consumed by generators/forges/etc.", "Harvesting & Resources"],
	["SupplyCrateLootQualityMultiplier", "Supply Crate Loot Quality Multiplier", "Multiplies the quality of items found in supply crate drops.", "Harvesting & Resources"],
	["FishingLootQualityMultiplier", "Fishing Loot Quality Multiplier", "Multiplies the quality of items caught while fishing.", "Harvesting & Resources"],

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

const conanSettings = rows([
	["ServerName", "Server Name", "The name shown for this server in the in-game server browser.", "Server Info"],
	["ServerPassword", "Server Password", "Password players must enter to join the server. Leave blank for a public server.", "Server Info"],
	["AdminPassword", "Admin Password", "Password required to gain admin privileges in-game.", "Server Info"],
	["ServerMessageOfTheDay", "Message of the Day", "Text shown to players when they join the server.", "Server Info"],
	["serverRegion", "Server Region", "Region code shown for this server in the server browser.", "Server Info"],
	["ServerModList", "Server Mod List", "File listing the mods this server runs, sent to clients so they can auto-download matching mods.", "Server Info"],
	["MaxNudity", "Max Nudity Level", "Maximum nudity level allowed for character customization on this server.", "Server Info"],

	["PVPEnabled", "PvP Enabled", "Turns on player-vs-player combat server-wide.", "PvP Rules & Schedule"],
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

	["LandClaimCount", "Max Land Claims Per Player", "Maximum number of land claim keystones a single player can place.", "Land Claims"],
	["LandClaimSize", "Land Claim Size (blocks)", "Radius protected by a single land claim keystone.", "Land Claims"],
	["LandClaimDeadZone", "Land Claim Dead Zone", "Minimum distance required between keystones placed by non-allied players.", "Land Claims"],
	["LandClaimExpiryTime", "Land Claim Expiry Time (days)", "Real-world days a player can be offline before their land claims expire.", "Land Claims"],
	["LandClaimDecayMode", "Land Claim Decay Mode", "Controls how offline land claim protection decays: slow linear, fast exponential, or none.", "Land Claims"],
	["LandClaimOnlineDurabilityModifier", "Land Claim Durability Multiplier (Online)", "Multiplies protected block hardness while the owner is online.", "Land Claims"],
	["LandClaimOfflineDurabilityModifier", "Land Claim Durability Multiplier (Offline)", "Multiplies protected block hardness while the owner is offline.", "Land Claims"],
	["LandClaimOfflineDelay", "Land Claim Offline Delay (min)", "Minutes after logout before offline durability modifiers take effect.", "Land Claims"],
	["DynamicMeshEnabled", "Enable Dynamic Mesh", "Enables the dynamic mesh (destructible terrain smoothing) system.", "Land Claims"],
	["DynamicMeshLandClaimOnly", "Dynamic Mesh: Land Claims Only", "Restricts the dynamic mesh system to only apply within land claims.", "Land Claims"],
	["DynamicMeshLandClaimBuffer", "Dynamic Mesh Land Claim Buffer", "Chunk radius around land claims included in dynamic mesh processing.", "Land Claims"],
	["DynamicMeshMaxItemCache", "Dynamic Mesh Max Item Cache", "How many items dynamic mesh processing can cache concurrently. Higher uses more RAM.", "Land Claims"],

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
	["TwitchServerPermission", "Twitch Integration Permission Level", "Permission level required to use Twitch integration commands.", "Admin & Misc"],
	["TwitchBloodMoonAllowed", "Allow Twitch Blood Moon Trigger", "Allows Twitch viewers to trigger a Blood Moon event via integration.", "Admin & Misc"],
	["MaxDeathMapMarkers", "Max Death Map Markers", "Maximum number of death location markers kept on the map per player.", "Admin & Misc"],
	["PartySharedKillRange", "Party Shared Kill XP Range", "Distance within which party members share kill XP and quest credit.", "Admin & Misc"],
	["PlayerKillingMode", "Player Killing Mode", "Controls who players are allowed to kill: no one, allies only, strangers only, or everyone.", "Admin & Misc"],
	["HealthbarVisibilityDistance", "Health Bar Visibility Distance", "Maximum distance at which enemy health bars are visible.", "Admin & Misc"],
	["BuildingPVPWhitelist", "Building PvP Whitelist", "List of structure/item IDs exempt from normal PvP building damage rules.", "Admin & Misc"],
	["ValidatePhysNavWalkWithRaycast", "Validate Pathing With Raycast", "Enables extra raycast validation for NPC pathing/navigation.", "Admin & Misc"],
	["ValidatePlayerStats", "Validate Player Stats", "Enables server-side validation of player stat values to catch tampering.", "Admin & Misc"],
	["bUndermeshDetectionEnabled", "Enable Undermesh Detection", "Detects and acts on players/structures found outside the normal collision mesh.", "Admin & Misc"],
	["AllowedTimeUndermesh", "Allowed Time Undermesh (sec)", "Grace period allowed underneath the mesh before undermesh detection acts.", "Admin & Misc"],
	["CapCharacterLayoutScalarParams", "Cap Character Scaling Params", "Clamps character body-scaling parameters to prevent extreme/exploited values.", "Admin & Misc"],
	["PathFollowingSendsAngularVelocity", "Path Following Sends Angular Velocity", "Includes angular velocity data in NPC path-following network updates.", "Admin & Misc"],
]);

// ───────────────────────── Minecraft (server.properties) ─────────────────────────

const minecraftSettings = rows([
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
	["spawn-protection", "Spawn Protection Radius", "Radius around the world spawn point that only operators can build in.", "World"],

	["white-list", "Enable Whitelist", "Restricts joining to players on the whitelist.", "Access Control"],
	["enforce-whitelist", "Enforce Whitelist Live", "Immediately kicks players removed from the whitelist instead of waiting for their next join.", "Access Control"],
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
]);

// ───────────────────────── Enshrouded ─────────────────────────

const enshroudedTop = rows([
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
]);

const enshroudedGameSettings = rows([
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
]);

// ───────────────────────── RuneScape: Dragonwilds ─────────────────────────

const runeSettings = rows([
	["ServerName", "Server Name", "The name shown for this server in the in-game server browser.", "General"],
	["WorldPassword", "World Password", "Password players must enter to join the server. Leave blank for a public server.", "General"],
	["AdminPassword", "Admin Password", "Password required to gain admin privileges in-game.", "General"],
	["DefaultWorldName", "Default World/Save Name", "Name of the save file this server loads/creates.", "General"],
]);

// ───────────────────────── Windrose ─────────────────────────

const windroseSettings = rows([
	["ServerName", "Server Name", "The name shown for this server in the in-game server browser.", "General"],
	["IsPasswordProtected", "Password Protected", "Requires players to enter a password to join.", "General"],
	["Password", "Server Password", "Password players must enter to join, when password protection is enabled.", "General"],
	["MaxPlayerCount", "Max Players", "Maximum number of players allowed on the server.", "General"],
	["UserSelectedRegion", "Server Region", "Region selected for this server, used for matchmaking/latency.", "General"],
	["AutoLoadLatestBackupIfHasBroken", "Auto-Load Latest Backup If Save Is Broken", "Automatically restores the most recent backup if the current save fails to load.", "General"],
	["P2pProxyAddress", "P2P Proxy Address", "Address of the peer-to-peer relay/proxy used for NAT traversal.", "Networking"],
	["UseDirectConnection", "Use Direct Connection", "Connects players directly to this server's address instead of relaying through the P2P proxy.", "Networking"],
	["DirectConnectionServerAddress", "Direct Connection Address", "Public address players connect to directly, when direct connection is enabled.", "Networking"],
	["DirectConnectionServerPort", "Direct Connection Port", "Port players connect to directly, when direct connection is enabled.", "Networking"],
	["DirectConnectionProxyAddress", "Direct Connection Proxy Address", "Proxy address used as a fallback for direct connections.", "Networking"],
]);

// ───────────────────────── Palworld ─────────────────────────

const palworldSettings = rows([
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
	["AdminRconPassword", "RCON Admin Password", "Password required to authenticate to the RCON interface.", "General"],

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
	["AutoResetGuildNoOnlinePlayers", "Auto-Reset Guilds With No Online Players", "Automatically disbands/resets guilds that have had no online members for a while.", "Gameplay"],
	["AutoResetGuildTimeNoOnlinePlayers", "Auto-Reset Guild Timer (hrs)", "Hours with no online guild members before an auto-reset triggers.", "Gameplay"],
	["WorkSpeedRate", "Pal Work Speed Rate", "Multiplies how fast working Pals complete tasks.", "Gameplay"],
	["AutoSaveSpan", "Auto-Save Interval (min)", "Minutes between automatic world saves.", "Gameplay"],
	["bIsMultiplay", "Multiplayer Enabled", "Enables multiplayer on this server (should stay on for a dedicated server).", "Gameplay"],
	["bIsPvP", "PvP Enabled", "Turns on player-vs-player combat server-wide.", "Gameplay"],
	["bHardcore", "Hardcore Mode", "Enables permadeath-style hardcore rules.", "Gameplay"],
	["bPalLost", "Pals Can Be Lost On Death", "Allows Pals to be permanently lost if their owner dies.", "Gameplay"],
	["CharacterRecreateInHardcore", "Allow Character Recreation In Hardcore", "Allows creating a new character after a hardcore death instead of being locked out.", "Gameplay"],
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
	["MaxBuildingLimitNumRate", "Max Building Limit Rate", "Multiplies the server-wide building count limit.", "Admin"],
]);

// ───────────────────────── Catalog ─────────────────────────

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
					...prefixKeys("ServerSettings", arkServerSettings),
					...prefixKeys("SessionSettings", arkSessionSettings),
					...prefixKeys("MessageOfTheDay", arkMotdSettings),
					...prefixKeys("/Script/Engine.GameSession", arkGameSessionSettings),
				},
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
			},
		},
	},
	"7days": {
		files: {
			"serverconfig.xml": {
				parser: "xml",
				excludeSections: [],
				sectionLabels: {},
				settings: {},
			},
		},
	},
	subsistence: {
		files: {
			"UDKDedServerSettings.ini": {
				parser: "ini",
				excludeSections: ["IniVersion"],
				sectionLabels: {},
				settings: {},
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
	palword: {
		files: {
			"PalWorldSettings.ini": {
				parser: "palworld",
				excludeSections: [],
				sectionLabels: {},
				settings: { ...palworldSettings },
			},
		},
	},
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

// The backend only reports real per-game filenames for servers whose
// ServerData entry uses `configPaths` (a named map) — that's ARK only today.
// Every other game uses a single `configPath` and the API collapses its
// (only) file down to the generic name "config". When that happens, and the
// game's catalog only defines one file, resolve to that file instead of
// failing the lookup.
function resolveFileCatalog(gameCatalog, fileName) {
	if (!gameCatalog) return null;
	if (gameCatalog.files[fileName]) return gameCatalog.files[fileName];

	const names = Object.keys(gameCatalog.files);
	if (fileName === "config" && names.length === 1) {
		return gameCatalog.files[names[0]];
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

// Turns flat parser entries into { groups: [{ name, settings }] } for ConfigForm,
// applying catalog exclusions/labels/descriptions and falling back to a
// prettified key name for anything not in the catalog.
export function annotateEntries(gameType, fileName, entries) {
	const gameCatalog = CONFIG_CATALOG[(gameType || "").toLowerCase()];
	const fileCatalog = resolveFileCatalog(gameCatalog, fileName) || {
		excludeSections: [],
		sectionLabels: {},
		settings: {},
	};

	const groupsMap = new Map();

	for (const entry of entries) {
		if (isExcluded(fileCatalog, entry)) continue;

		const meta = findMeta(fileCatalog, entry);
		const label =
			meta?.label ||
			prettifyKey(entry.key) +
				(entry.repeatCount > 1 ? ` (#${entry.occurrence + 1})` : "");
		const description = meta?.description || entry.comment || "";
		const groupName = groupFor(fileCatalog, entry, meta);

		if (!groupsMap.has(groupName)) groupsMap.set(groupName, []);
		groupsMap.get(groupName).push({ ...entry, label, description });
	}

	return {
		groups: Array.from(groupsMap.entries()).map(([name, settings]) => ({
			name,
			settings,
		})),
		structuredPaths: fileCatalog.structuredPaths || [],
	};
}

export function getStructuredPaths(gameType, fileName) {
	const gameCatalog = CONFIG_CATALOG[(gameType || "").toLowerCase()];
	return resolveFileCatalog(gameCatalog, fileName)?.structuredPaths || [];
}

export function getFileParser(gameType, fileName) {
	const gameCatalog = CONFIG_CATALOG[(gameType || "").toLowerCase()];
	const fileCatalog = resolveFileCatalog(gameCatalog, fileName);
	if (fileCatalog?.parser) return fileCatalog.parser;

	if (fileName.endsWith(".json")) return "json";
	if (fileName.endsWith(".xml")) return "xml";
	if (fileName === "server.properties") return "properties";
	return "ini";
}

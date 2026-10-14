<!-- Generated from the help text in the interface (ui/src/help). Edit it there, then run `npm run build:guides`. -->

# Game settings guide

What the settings on a server's **Settings** tab mean, game by game. Each game has the file its settings are kept in, where that file is, and a table of every setting the panel explains: the label you see on screen, the name the setting has in the file, and what it does. The settings are grouped the way the Settings tab groups them.

The panel explains the game's own settings. **Mods will not have explanations.** Mods and plugins add settings of their own, and so do game updates newer than this panel, so a setting the panel does not know appears on the Settings tab with no explanation, and the form says how many there are. Look those up in the mod's or the game's own documentation.

A setting that is not listed in the file keeps the game's own default. Some games only write a setting to the file after you change it, so a setting in these tables may not be in your file yet.

Some games are set up by the arguments on the command that starts them, not by a file. Those are in the [launch arguments guide](LAUNCH_ARGUMENTS.md). For the controls on the server's page itself (ports, backups, schedules and so on), see the [server options guide](SERVER_OPTIONS.md).

## Contents

- [ARK: Survival Ascended / Evolved](#ark-survival-ascended--evolved)
- [Conan Exiles](#conan-exiles)
- [Minecraft (Java)](#minecraft-java)
- [Enshrouded](#enshrouded)
- [7 Days to Die](#7-days-to-die)
- [Subsistence](#subsistence)
- [RuneScape: Dragonwilds](#runescape-dragonwilds)
- [Windrose](#windrose)
- [Valheim](#valheim)
- [Palworld](#palworld)
- [Rust](#rust)
- [Project Zomboid](#project-zomboid)
- [V Rising](#v-rising)
- [Sons of the Forest](#sons-of-the-forest)
- [Core Keeper](#core-keeper)
- [Satisfactory](#satisfactory)

## ARK: Survival Ascended / Evolved

ARK is set up in two files that both live in `ShooterGame\Saved\Config\WindowsServer\` inside the server's install folder. The panel's Settings tab shows both. The game makes them the first time it runs.

- `GameUserSettings.ini`: The server's name, passwords, player and tribe rules, taming, harvesting, structures, performance and admin options. The settings are in the `[ServerSettings]` section, plus the session name, the message of the day and the player limit.
- `Game.ini`: The gameplay multipliers in the `[/Script/ShooterGame.ShooterGameMode]` section: experience, taming, harvesting, PvP and structures.
- Launch arguments: they are in the start script. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#ark-survival-ascended--evolved).

ARK has far more options than are listed here. In particular `Game.ini` also holds engram, crafting, spawn and level overrides, which are long and specialised. Anything the panel does not have an explanation for is still shown, without one.

### ARK (GameUserSettings.ini): Session

4 settings in `GameUserSettings.ini`, shown under **Session** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Session Name | `SessionName` in `[SessionSettings]` | The name shown for this server in the in-game server browser. |
| Max Players | `MaxPlayers` in `[/Script/Engine.GameSession]` | Maximum number of concurrent players allowed on the server. |
| Message of the Day | `Message` in `[MessageOfTheDay]` | Text shown to players in a banner when they join the server. |
| MOTD Duration (sec) | `Duration` in `[MessageOfTheDay]` | How many seconds the message-of-the-day banner stays on screen. |

### ARK (GameUserSettings.ini): General

19 settings in `GameUserSettings.ini`, shown under **General** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Difficulty Offset | `DifficultyOffset` in `[ServerSettings]` | Overall difficulty (0-1). Raises the level range of wild dinos and loot quality as it increases. |
| Max Difficulty Multiplier | `OverrideOfficialDifficulty` in `[ServerSettings]` | Caps how high wild dino levels and loot quality can scale, independent of Difficulty Offset. |
| Admin Password | `ServerAdminPassword` in `[ServerSettings]` | Password required to use admin commands in-game. |
| Implant Suicide Cooldown (s) | `ImplantSuicideCD` in `[ServerSettings]` | How many seconds a player must wait between uses of the implant's suicide option. The default is 28800 (8 hours). |
| Server Password | `ServerPassword` in `[ServerSettings]` | Password players must enter to join the server. Leave blank for a public server. |
| PvE Mode | `ServerPVE` in `[ServerSettings]` | When enabled, players cannot damage each other or each other's structures. |
| Show Player Location On Map | `ShowMapPlayerLocation` in `[ServerSettings]` | Shows each player's position on the in-game map at all times. |
| Allow Third-Person Camera | `AllowThirdPersonPlayer` in `[ServerSettings]` | Lets players use the third-person camera view. |
| Show Crosshair | `ServerCrosshair` in `[ServerSettings]` | Shows a crosshair in the center of the screen. |
| Show Floating Damage Numbers | `ShowFloatingDamageText` in `[ServerSettings]` | Shows floating combat text with damage numbers. |
| Show Hit Markers | `AllowHitMarkers` in `[ServerSettings]` | Shows a marker on screen when you land a hit. |
| Start Time (Hour) | `StartTimeHour` in `[ServerSettings]` | In-game hour the server's day/night cycle starts at when the world is first created. -1 uses the default. |
| Clamp Item Stats to Official Values | `ClampItemStats` in `[ServerSettings]` | Prevents item stats from exceeding official-server maximums, even with boosted loot settings. |
| Disable Tribe Alliances | `PreventTribeAlliances` in `[ServerSettings]` | Prevents tribes from forming alliances with each other. |
| Tribe Rename Cooldown (hrs) | `TribeNameChangeCooldown` in `[ServerSettings]` | Hours a tribe must wait between renaming itself. |
| Log Enemy Structure Destruction | `TribeLogDestroyedEnemyStructures` in `[ServerSettings]` | Adds destroyed enemy structures to the tribe log. |
| Tribe Log Max Entries | `TribeLogMaxEntries` in `[ServerSettings]` | Maximum number of entries kept in each tribe's log. |
| Show Join/Leave Notifications | `bJoinNotifications` in `[ServerSettings]` | Shows a notification when players join or leave the server. |
| Show Status Notifications | `bShowStatusNotificationMessages` in `[ServerSettings]` | Shows on-screen notifications for status changes (taming complete, etc). |

### ARK (GameUserSettings.ini): Taming & Breeding

3 settings in `GameUserSettings.ini`, shown under **Taming & Breeding** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Taming Speed Multiplier | `TamingSpeedMultiplier` in `[ServerSettings]` | Multiplies how fast dinos are tamed. |
| Allow Anyone to Imprint Babies | `AllowAnyoneBabyImprintCuddle` in `[ServerSettings]` | Lets any tribe member (not just the imprinted player) cuddle/care for a baby. |
| Disable Imprint Stat Bonus | `DisableImprintDinoBuff` in `[ServerSettings]` | Removes the stat bonus dinos normally get from being well-imprinted. |

### ARK (GameUserSettings.ini): Harvesting & Resources

4 settings in `GameUserSettings.ini`, shown under **Harvesting & Resources** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Harvest Amount Multiplier | `HarvestAmountMultiplier` in `[ServerSettings]` | Multiplies the amount of resources gathered per harvest action. |
| Resource Respawn Time Multiplier | `ResourcesRespawnPeriodMultiplier` in `[ServerSettings]` | Multiplies how long it takes harvested resource nodes to respawn. |
| Item Stack Size Multiplier | `ItemStackSizeMultiplier` in `[ServerSettings]` | Multiplies the max stack size for stackable items. |
| Clamp Spoiling Times to Official Values | `ClampItemSpoilingTimes` in `[ServerSettings]` | Prevents item spoil timers from exceeding official-server maximums. |

### ARK (GameUserSettings.ini): Dinos & Wild Population

14 settings in `GameUserSettings.ini`, shown under **Dinos & Wild Population** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Max Tamed Dinos (Server) | `MaxTamedDinos` in `[ServerSettings]` | Maximum number of tamed dinos allowed on the whole server. |
| Soft Tame Limit | `MaxTamedDinos_SoftTameLimit` in `[ServerSettings]` | Tamed dino count at which the server starts warning/preventing further taming. |
| Soft Limit Deletion Countdown (sec) | `MaxTamedDinos_SoftTameLimit_CountdownForDeletionDuration` in `[ServerSettings]` | Seconds of grace given once over the soft tame limit before excess dinos are removed. |
| Auto-Destroy Decayed Dinos | `AutoDestroyDecayedDinos` in `[ServerSettings]` | Automatically deletes tamed dinos whose owning tribe has been offline long enough to fully decay. |
| Force Gacha Unhappy In Caves | `ForceGachaUnhappyInCaves` in `[ServerSettings]` | Forces Gacha creatures to be unhappy (and stop producing) while inside caves. |
| Raid Dino Food Drain Multiplier | `RaidDinoCharacterFoodDrainMultiplier` in `[ServerSettings]` | Multiplies how fast summoned raid/boss creatures drain food. |
| PvE Dino Decay Period Multiplier | `PvEDinoDecayPeriodMultiplier` in `[ServerSettings]` | Multiplies how long an offline tribe's tamed dinos take to decay in PvE. |
| Allow Feeding Raid Dinos | `AllowRaidDinoFeeding` in `[ServerSettings]` | Allows players to feed and heal summoned raid/boss creatures. |
| Oxygen Swim Speed Multiplier | `OxygenSwimSpeedStatMultiplier` in `[ServerSettings]` | Multiplies how much the Oxygen stat affects swim speed. |
| Allow Flyer Stamina Recovery While Flying | `AllowFlyingStaminaRecovery` in `[ServerSettings]` | Lets flying dinos regenerate stamina while airborne instead of only when landed. |
| Allow Flyer Speed Leveling | `AllowFlyerSpeedLeveling` in `[ServerSettings]` | Lets players put levels into a flying dino's speed stat. |
| Allow Flyers to Carry Players in PvE | `AllowFlyerCarryPvE` in `[ServerSettings]` | Lets flying dinos pick up and carry other players in PvE. |
| Disable Diseases | `PreventDiseases` in `[ServerSettings]` | Turns off wild-dino diseases entirely. |
| Non-Permanent Diseases | `NonPermanentDiseases` in `[ServerSettings]` | Diseases can be cured instead of being permanent. |

### ARK (GameUserSettings.ini): PvP & Structures

30 settings in `GameUserSettings.ini`, shown under **PvP & Structures** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| PvP Dino Decay | `PvPDinoDecay` in `[ServerSettings]` | Enables decay/removal of tamed dinos left unattended in PvP. |
| PvP Structure Decay | `PvPStructureDecay` in `[ServerSettings]` | Enables decay/removal of structures left unattended in PvP. |
| Prevent Offline Raiding | `PreventOfflinePvP` in `[ServerSettings]` | Grants raid protection to tribes/structures while all members are offline. |
| Offline PvP Protection Delay (sec) | `PreventOfflinePvPInterval` in `[ServerSettings]` | Seconds after a tribe's last member logs off before offline raid protection kicks in. |
| Allow Multiple Attached C4 | `AllowMultipleAttachedC4` in `[ServerSettings]` | Allows more than one C4 charge to be attached to the same structure/dino at once. |
| Allow Tesla Coil Cave Building in PvP | `AllowTeslaCoilCaveBuildingPVP` in `[ServerSettings]` | Allows placing Tesla Coils inside caves in PvP. |
| Ignore Mounted Weaponry PvP Restriction | `IgnorePVPMountedWeaponryRestriction` in `[ServerSettings]` | Removes the restriction on mounted turret weaponry usage in PvP. |
| Fast-Decay Unsnapped Core Structures | `FastDecayUnsnappedCoreStructures` in `[ServerSettings]` | Makes structures that aren't snapped to a foundation/pillar decay quickly. |
| Override Platform Structure Prevention | `OverrideStructurePlatformPrevention` in `[ServerSettings]` | Disables the restriction on certain structures being placed on platform saddles/rafts. |
| Only Auto-Destroy Core Structures | `OnlyAutoDestroyCoreStructures` in `[ServerSettings]` | Limits structure auto-destroy to core (foundation/pillar) pieces only. |
| Max Structures In Range | `TheMaxStructuresInRange` in `[ServerSettings]` | Maximum number of structures allowed within the engine's structure-count radius. |
| Structure Resource-Block Radius Multiplier | `StructurePreventResourceRadiusMultiplier` in `[ServerSettings]` | Multiplies the radius around structures that blocks resource node respawns. |
| Per-Platform Max Structures Multiplier | `PerPlatformMaxStructuresMultiplier` in `[ServerSettings]` | Multiplies the max structure count allowed on a single platform saddle/raft. |
| Platform Build Area Multiplier | `PlatformSaddleBuildAreaBoundsMultiplier` in `[ServerSettings]` | Multiplies the buildable area bounds on platform saddles. |
| Always Allow Structure Pickup | `AlwaysAllowStructurePickup` in `[ServerSettings]` | Lets players pick structures back up regardless of the normal time limit. |
| Structure Pickup Time Limit (sec) | `StructurePickupTimeAfterPlacement` in `[ServerSettings]` | Seconds after placement a structure can still be picked back up. |
| Structure Pickup Hold Duration (sec) | `StructurePickupHoldDuration` in `[ServerSettings]` | Seconds you must hold the pickup action to pick up a structure. |
| Enable Extra Build-Prevention Volumes | `EnableExtraStructurePreventionVolumes` in `[ServerSettings]` | Enables additional zones (near obelisks/terminals) where building is blocked. |
| Allow Crate Spawns On Structures | `AllowCrateSpawnsOnTopOfStructures` in `[ServerSettings]` | Lets supply/loot crates spawn on top of player structures. |
| Auto-Destroy Old Structures Multiplier | `AutoDestroyOldStructuresMultiplier` in `[ServerSettings]` | Multiplies the decay timer used to auto-destroy old abandoned structures. |
| Structure Load Distance Multiplier | `StructureLoadDistanceMultiplier` in `[ServerSettings]` | Multiplies the distance at which structures are streamed in/rendered. |
| Limit Bunkers Per Tribe | `LimitBunkersPerTribe` in `[ServerSettings]` | Caps how many underground bunkers a single tribe can build. |
| Max Bunkers Per Tribe | `LimitBunkersPerTribeNum` in `[ServerSettings]` | Maximum number of bunkers allowed per tribe when the limit is enabled. |
| Allow Ridden Dinos Inside Bunkers | `AllowRidingDinosInsideBunkers` in `[ServerSettings]` | Lets players bring ridden dinos inside bunkers. |
| Allow Dino AI Inside Bunkers | `AllowDinoAIInsideBunkers` in `[ServerSettings]` | Lets non-ridden dinos with AI enabled enter bunkers. |
| Min Distance Between Bunkers | `MinDistanceBetweenBunkers` in `[ServerSettings]` | Minimum distance required between separate bunkers. |
| Enemy Bunker Access HP Threshold | `EnemyAccessBunkerHPThreshold` in `[ServerSettings]` | Structure health percentage below which enemies can access a bunker's interior. |
| Bunker Damage Multiplier Under Threshold | `BunkerUnderHPThresholdDmgMultiplier` in `[ServerSettings]` | Extra damage multiplier applied to bunker structures once under the HP access threshold. |
| Aquatic Compartments Need Power | `NeedsPowerToActivateAquaticCompartments` in `[ServerSettings]` | Requires aquatic base compartments to be powered to function. |
| Allow Structures At Supply Drop Zones | `PvEAllowStructuresAtSupplyDrops` in `[ServerSettings]` | Lets players build structures at supply-drop landing zones in PvE. |

### ARK (GameUserSettings.ini): Admin & Performance

14 settings in `GameUserSettings.ini`, shown under **Admin & Performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Enable RCON | `RCONEnabled` in `[ServerSettings]` | Enables the remote console (RCON) interface used by this dashboard to query/control the server. |
| RCON Port | `RCONPort` in `[ServerSettings]` | Network port the RCON interface listens on. |
| RCON Log Buffer Size | `RCONServerGameLogBuffer` in `[ServerSettings]` | Number of lines of server log kept in the buffer available over RCON. |
| Hide Damage Source From Logs | `AllowHideDamageSourceFromLogs` in `[ServerSettings]` | Omits the source of damage events from the server log. |
| Idle Player Kick Timer (sec) | `KickIdlePlayersPeriod` in `[ServerSettings]` | Seconds of inactivity before an idle player is kicked. |
| Auto-Save Interval (min) | `AutoSavePeriodMinutes` in `[ServerSettings]` | Minutes between automatic world saves. |
| Disable Spawn Animations | `PreventSpawnAnimations` in `[ServerSettings]` | Skips dino spawn animations for a small performance gain. |
| Enable Extra Performance Mode | `EnableExtraPerformanceMode` in `[ServerSettings]` | Trades some visual/AI fidelity for improved server performance. |
| Enable Multi-Threaded Rendering | `EnableMultiThreadedRendering` in `[ServerSettings]` | Lets the server use multiple threads for rendering-adjacent work. |
| Use Optimized Networking | `UseOptimizedNetwork` in `[ServerSettings]` | Enables an optimized networking code path. |
| Use Optimized Harvesting | `UseOptimizedHarvesting` in `[ServerSettings]` | Enables an optimized harvesting code path. |
| Use Structure Staggering | `UseStructureStaggering` in `[ServerSettings]` | Staggers structure updates across ticks to reduce load spikes. |
| Use Client Catch-Up Time | `UseClientCatchupTime` in `[ServerSettings]` | Allows clients extra time to catch up after a hitch/lag spike. |
| Server Tick Rate | `ServerThreadTickRate` in `[ServerSettings]` | Target ticks-per-second the server thread runs at. |

### ARK (GameUserSettings.ini): Cryo & Data Transfer

19 settings in `GameUserSettings.ini`, shown under **Cryo & Data Transfer** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Cryo Hospital: Hours To Regen HP | `CryoHospitalHoursToRegenHP` in `[ServerSettings]` | Hours a freshly-uncryoed dino needs at a Cryo Hospital to fully regen HP. |
| Cryo Hospital: Hours To Regen Food | `CryoHospitalHoursToRegenFood` in `[ServerSettings]` | Hours a freshly-uncryoed dino needs at a Cryo Hospital to fully regen food. |
| Cryo Hospital: Hours To Drain Torpor | `CryoHospitalHoursToDrainTorpor` in `[ServerSettings]` | Hours a freshly-uncryoed dino needs at a Cryo Hospital to fully drain torpor. |
| Cryo Hospital: Mating Cooldown Reduction | `CryoHospitalMatingCooldownReduction` in `[ServerSettings]` | Mating cooldown reduction granted by resting at a Cryo Hospital. |
| Enable Cryopod Nerf | `EnableCryopodNerf` in `[ServerSettings]` | Applies a temporary debuff to dinos right after being released from a cryopod. |
| Cryopod Nerf Duration (sec) | `CryopodNerfDuration` in `[ServerSettings]` | How long the post-uncryo debuff lasts. |
| Cryopod Nerf Outgoing Damage Multiplier | `CryopodNerfDamageMult` in `[ServerSettings]` | Outgoing damage multiplier applied to a dino during the cryopod nerf window. |
| Cryopod Nerf Incoming Damage % | `CryopodNerfIncomingDamageMultPercent` in `[ServerSettings]` | Extra incoming damage percentage applied during the cryopod nerf window. |
| Enable Cryo Sickness In PvE | `EnableCryoSicknessPVE` in `[ServerSettings]` | Applies cryo sickness debuff to uncryoed dinos in PvE too (normally PvP only). |
| Disable Cryopod Enemy Check | `DisableCryopodEnemyCheck` in `[ServerSettings]` | Lets players throw cryopods even with enemies nearby. |
| Disable Cryofridge Requirement | `DisableCryopodFridgeRequirement` in `[ServerSettings]` | Lets Cryopods be crafted/recharged without needing a nearby Cryofridge. |
| Allow Cryofridge On Saddle | `AllowCryoFridgeOnSaddle` in `[ServerSettings]` | Lets a Cryofridge be placed on platform saddles. |
| Allow Cross-ARK Dino Downloads | `CrossARKAllowForeignDinoDownloads` in `[ServerSettings]` | Allows dinos uploaded from other servers/maps to be downloaded here. |
| Block Survivor Downloads | `PreventDownloadSurvivors` in `[ServerSettings]` | Prevents survivor data from being downloaded to this server. |
| Block Item Downloads | `PreventDownloadItems` in `[ServerSettings]` | Prevents item data from being downloaded to this server. |
| Block Dino Downloads | `PreventDownloadDinos` in `[ServerSettings]` | Prevents dino data from being downloaded to this server. |
| Block Survivor Uploads | `PreventUploadSurvivors` in `[ServerSettings]` | Prevents survivor data from being uploaded off this server. |
| Block Item Uploads | `PreventUploadItems` in `[ServerSettings]` | Prevents item data from being uploaded off this server. |
| Block Dino Uploads | `PreventUploadDinos` in `[ServerSettings]` | Prevents dino data from being uploaded off this server. |

### ARK (GameUserSettings.ini): Misc / ASA Features

9 settings in `GameUserSettings.ini`, shown under **Misc / ASA Features** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Max Cosmo Weapon Ammo | `MaxCosmoWeaponAmmo` in `[ServerSettings]` | Maximum ammo capacity for Cosmo-tier weapons. -1 uses the default. |
| Cosmo Weapon Reload Amount | `CosmoWeaponAmmoReloadAmount` in `[ServerSettings]` | Ammo restored per reload for Cosmo-tier weapons. -1 uses the default. |
| King Kaiju Spawn Time | `WorldBossKingKaijuSpawnTime` in `[ServerSettings]` | Time of day the King Kaiju world boss spawns. |
| Armadoggo Death Cooldown (sec) | `ArmadoggoDeathCooldown` in `[ServerSettings]` | Cooldown before a summoned Armadoggo companion can be resummoned after dying. |
| Buried Treasure Auto-Reveal Time (sec) | `OverrideSecondsUntilBuriedTreasureAutoReveals` in `[ServerSettings]` | Seconds before an undiscovered buried treasure location is automatically revealed. |
| Bloodforge: Extra Durability | `BloodforgeReinforceExtraDurability` in `[ServerSettings]` | Extra durability percentage granted by Bloodforge item reinforcement. |
| Bloodforge: Resource Cost Multiplier | `BloodforgeReinforceResourceCostMultiplier` in `[ServerSettings]` | Multiplies the resource cost of Bloodforge item reinforcement. |
| Bloodforge: Reinforce Speed Multiplier | `BloodforgeReinforceSpeedMultiplier` in `[ServerSettings]` | Multiplies how fast Bloodforge item reinforcement completes. |
| Outpost Sigil Reward Multiplier | `OutpostSigilRewardMultiplier` in `[ServerSettings]` | Multiplies rewards earned from capturing/holding outposts. |

### ARK (Game.ini): XP

14 settings in `Game.ini`, shown under **XP** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Kill XP Multiplier | `KillXPMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies experience earned from killing creatures. |
| Harvest XP Multiplier | `HarvestXPMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies experience earned from harvesting. |
| Craft XP Multiplier | `CraftXPMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies experience earned from crafting. |
| Generic XP Multiplier | `GenericXPMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies experience earned from general actions not covered by other multipliers. |
| Special XP Multiplier | `SpecialXPMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies experience earned from special/unique actions. |
| Explorer Note XP Multiplier | `ExplorerNoteXPMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies experience earned from finding explorer notes. |
| Boss Kill XP Multiplier | `BossKillXPMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies experience earned from killing boss creatures. |
| Alpha Kill XP Multiplier | `AlphaKillXPMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies experience earned from killing Alpha creatures. |
| Wild Kill XP Multiplier | `WildKillXPMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies experience earned from killing wild creatures. |
| Cave Kill XP Multiplier | `CaveKillXPMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies experience earned from kills made inside caves. |
| Tamed Kill XP Multiplier | `TamedKillXPMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies experience earned from a tamed dino's kills. |
| Unclaimed Dino Kill XP Multiplier | `UnclaimedKillXPMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies experience earned from killing unclaimed/wandering tamed dinos. |
| Player XP Cap Override | `OverrideMaxExperiencePointsPlayer` in `[/Script/ShooterGame.ShooterGameMode]` | Overrides the maximum experience points a player can earn. 0 uses the default. |
| Dino XP Cap Override | `OverrideMaxExperiencePointsDino` in `[/Script/ShooterGame.ShooterGameMode]` | Overrides the maximum experience points a tamed dino can earn. 0 uses the default. |

### ARK (Game.ini): Taming & Breeding

11 settings in `Game.ini`, shown under **Taming & Breeding** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Imprint Stat Bonus Multiplier | `BabyImprintingStatScaleMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the stat bonus a dino gets per percent of imprint quality. |
| Imprint Gain Per Cuddle Multiplier | `BabyImprintAmountMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how much imprint percentage is gained per successful cuddle. |
| Baby Cuddle Interval Multiplier | `BabyCuddleIntervalMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the time between required imprint cuddle events (lower = more frequent). |
| Baby Cuddle Grace Period Multiplier | `BabyCuddleGracePeriodMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the grace period allowed before a missed cuddle hurts imprint quality. |
| Imprint Quality Loss Speed Multiplier | `BabyCuddleLoseImprintQualitySpeedMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how fast imprint quality drops after a missed cuddle. |
| Mating Interval Multiplier | `MatingIntervalMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the cooldown between a dino's mating attempts (lower = more frequent). |
| Egg Hatch Speed Multiplier | `EggHatchSpeedMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how fast fertilized eggs hatch. |
| Baby Maturation Speed Multiplier | `BabyMatureSpeedMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how fast baby dinos grow to adulthood. |
| Baby Food Consumption Multiplier | `BabyFoodConsumptionSpeedMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how fast baby dinos consume food. |
| Egg Laying Interval Multiplier | `LayEggIntervalMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the interval between a female dino laying eggs. |
| Auto-Unlock Engram | `EngramEntryAutoUnlocks` in `[/Script/ShooterGame.ShooterGameMode]` | An engram that's automatically unlocked once a player reaches the given level (repeatable entry). |

### ARK (Game.ini): Harvesting & Resources

15 settings in `Game.ini`, shown under **Harvesting & Resources** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Spoiling Time Multiplier | `GlobalSpoilingTimeMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how long perishable items take to spoil. |
| Dropped Item Decay Multiplier | `GlobalItemDecompositionTimeMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how long dropped items last before disappearing. |
| Corpse Decay Multiplier | `GlobalCorpseDecompositionTimeMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how long corpses last before disappearing. |
| No-Respawn Radius Around Players | `ResourceNoReplenishRadiusPlayers` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the radius around players where resources won't respawn. |
| No-Respawn Radius Around Structures | `ResourceNoReplenishRadiusStructures` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the radius around structures where resources won't respawn. |
| Crop Growth Speed Multiplier | `CropGrowthSpeedMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how fast planted crops grow. |
| Crop Decay Speed Multiplier | `CropDecaySpeedMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how fast unharvested crops decay. |
| Poop Interval Multiplier | `PoopIntervalMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how often creatures produce feces. |
| Fuel Consumption Multiplier | `FuelConsumptionIntervalMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how quickly fuel is consumed by generators/forges/etc. |
| Supply Crate Loot Quality Multiplier | `SupplyCrateLootQualityMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the quality of items found in supply crate drops. |
| Fishing Loot Quality Multiplier | `FishingLootQualityMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the quality of items caught while fishing. |
| Crafting Skill Bonus Multiplier | `CraftingSkillBonusMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the quality bonus from the crafter's crafting skill. |
| Custom Recipe Effectiveness Multiplier | `CustomRecipeEffectivenessMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the effectiveness of player-crafted custom recipes (cooking). |
| Custom Recipe Skill Multiplier | `CustomRecipeSkillMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the crafting-skill bonus applied to custom recipes. |
| Allow Custom Recipes | `bAllowCustomRecipes` in `[/Script/ShooterGame.ShooterGameMode]` | Allows players to create custom cooking recipes. |

### ARK (Game.ini): PvP, Hex & Turrets

14 settings in `Game.ini`, shown under **PvP, Hex & Turrets** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Hexagon Reward Multiplier | `BaseHexagonRewardMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies Hexagon (Genesis currency) rewards earned. |
| Hexagon Store Cost Multiplier | `HexagonCostMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies the Hexagon cost of items in the Hexagon store. |
| PvP Zone Structure Damage Multiplier | `PvPZoneStructureDamageMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies structure damage dealt within PvP zones. |
| Structure Repair Cooldown After Damage (sec) | `StructureDamageRepairCooldown` in `[/Script/ShooterGame.ShooterGameMode]` | Cooldown before a damaged structure can be repaired again. |
| PvP Respawn Interval Check Period (sec) | `IncreasePvPRespawnIntervalCheckPeriod` in `[/Script/ShooterGame.ShooterGameMode]` | How often the server checks whether a player's PvP respawn cooldown should increase. |
| PvP Respawn Interval Growth Multiplier | `IncreasePvPRespawnIntervalMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies how quickly the repeated-death respawn cooldown grows. |
| PvP Respawn Interval Base (sec) | `IncreasePvPRespawnIntervalBaseAmount` in `[/Script/ShooterGame.ShooterGameMode]` | Base seconds added to respawn cooldown after repeated deaths. |
| Increase Respawn Interval on Repeated Death | `bIncreasePvPRespawnInterval` in `[/Script/ShooterGame.ShooterGameMode]` | Enables an increasing respawn cooldown for players who die repeatedly in a short time. |
| Dino Damage To Turrets Multiplier | `DinoTurretDamageMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies damage tamed dinos deal to turrets. |
| Dino Harvesting Damage Multiplier | `DinoHarvestingDamageMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies damage tamed dinos deal while harvesting. |
| Player Harvesting Damage Multiplier | `PlayerHarvestingDamageMultiplier` in `[/Script/ShooterGame.ShooterGameMode]` | Multiplies damage players deal while harvesting. |
| Turrets Damage Riderless Dinos | `bPassiveDefensesDamageRiderlessDinos` in `[/Script/ShooterGame.ShooterGameMode]` | Lets automated turrets target and damage unridden wild/tamed dinos. |
| Disable Friendly Fire | `bDisableFriendlyFire` in `[/Script/ShooterGame.ShooterGameMode]` | Prevents tribe members from damaging each other and each other's dinos. |
| Hard-Limit Turrets In Range | `bHardLimitTurretsInRange` in `[/Script/ShooterGame.ShooterGameMode]` | Enforces a hard cap on the number of turrets active within range of each other. |

### ARK (Game.ini): Structures

5 settings in `Game.ini`, shown under **Structures** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Disable Structure Placement Collision | `bDisableStructurePlacementCollision` in `[/Script/ShooterGame.ShooterGameMode]` | Allows structures to be placed overlapping each other. |
| Allow Multi-Floor Platform Saddles | `bAllowPlatformSaddleMultiFloors` in `[/Script/ShooterGame.ShooterGameMode]` | Allows building multiple floors on platform saddles. |
| Allow Unaligned Dino Basing On Flyer Platforms | `bFlyerPlatformAllowUnalignedDinoBasing` in `[/Script/ShooterGame.ShooterGameMode]` | Allows dinos not aligned to the platform's grid to still be considered 'based' on a flyer platform. |
| Photo Mode Range Limit | `PhotoModeRangeLimit` in `[/Script/ShooterGame.ShooterGameMode]` | Maximum camera distance allowed while using photo mode. |
| Disable Photo Mode | `bDisablePhotoMode` in `[/Script/ShooterGame.ShooterGameMode]` | Disables the in-game photo mode entirely. |

### ARK (Game.ini): General

17 settings in `Game.ini`, shown under **General** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Force Max Difficulty | `MaxDifficulty` in `[/Script/ShooterGame.ShooterGameMode]` | Forces the server to always use maximum difficulty scaling. |
| Use Singleplayer Settings | `bUseSingleplayerSettings` in `[/Script/ShooterGame.ShooterGameMode]` | Applies singleplayer-balance settings instead of standard multiplayer balance. Not recommended for dedicated servers. |
| Disable Dino Riding | `bDisableDinoRiding` in `[/Script/ShooterGame.ShooterGameMode]` | Prevents players from riding any dinos. |
| Disable Dino Taming | `bDisableDinoTaming` in `[/Script/ShooterGame.ShooterGameMode]` | Prevents players from taming any dinos. |
| Allow Unlimited Mindwipes | `bAllowUnlimitedRespecs` in `[/Script/ShooterGame.ShooterGameMode]` | Allows unlimited use of Mindwipe Tonics to respec engram points. |
| Allow Speed Leveling (Players) | `bAllowSpeedLeveling` in `[/Script/ShooterGame.ShooterGameMode]` | Lets players put levels into their movement speed stat. |
| Allow Flyer Speed Leveling | `bAllowFlyerSpeedLeveling` in `[/Script/ShooterGame.ShooterGameMode]` | Lets players put levels into a flying dino's speed stat. |
| Disable Loot Crates | `bDisableLootCrates` in `[/Script/ShooterGame.ShooterGameMode]` | Turns off world loot crate spawns (green/blue/etc drops). |
| Show Creative Mode Option | `bShowCreativeMode` in `[/Script/ShooterGame.ShooterGameMode]` | Shows the creative mode toggle to admins. |
| Use Corpse Locator | `bUseCorpseLocator` in `[/Script/ShooterGame.ShooterGameMode]` | Shows a beam of light marking the location of your last death. |
| Allow Tribe Wars in PvE | `bPvEAllowTribeWar` in `[/Script/ShooterGame.ShooterGameMode]` | Lets tribes declare war on each other in PvE to allow temporary PvP. |
| Allow Canceling Tribe Wars in PvE | `bPvEAllowTribeWarCancel` in `[/Script/ShooterGame.ShooterGameMode]` | Lets tribes cancel an active tribe war in PvE. |
| Max Players Per Tribe | `MaxNumberOfPlayersInTribe` in `[/Script/ShooterGame.ShooterGameMode]` | Maximum number of players allowed in a single tribe. 0 = unlimited. |
| Auto-PvE Start Time (sec) | `AutoPvEStartTimeSeconds` in `[/Script/ShooterGame.ShooterGameMode]` | Time of day (seconds) that scheduled PvE mode starts, if auto-PvE timer is enabled. |
| Auto-PvE Stop Time (sec) | `AutoPvEStopTimeSeconds` in `[/Script/ShooterGame.ShooterGameMode]` | Time of day (seconds) that scheduled PvE mode ends, if auto-PvE timer is enabled. |
| Enable Scheduled PvE Timer | `bAutoPvETimer` in `[/Script/ShooterGame.ShooterGameMode]` | Automatically switches between PvE and PvP on a daily schedule. |
| Use System Time For PvE Timer | `bAutoPvEUseSystemTime` in `[/Script/ShooterGame.ShooterGameMode]` | Uses the server's real-world clock instead of in-game time for the scheduled PvE timer. |

## Conan Exiles

Conan Exiles keeps its settings in `ConanSandbox\Saved\Config\WindowsServer\ServerSettings.ini` inside the server's install folder.

- `ServerSettings.ini`: Everything in the `[ServerSettings]` section: names, passwords, rates, building and combat rules.
- Launch arguments: they are in the start script. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#conan-exiles).

The remote console (RCON) settings are in `Game.ini` beside it. The panel manages that file itself, so it is not part of this list.

### Conan Exiles: Server Info

7 settings in `ServerSettings.ini`, shown under **Server Info** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server Name | `ServerName` in `[ServerSettings]` | The name shown for this server in the in-game server browser. |
| Server Password | `ServerPassword` in `[ServerSettings]` | Password players must enter to join the server. Leave blank for a public server. |
| Admin Password | `AdminPassword` in `[ServerSettings]` | Password required to gain admin privileges in-game. |
| Message of the Day | `ServerMessageOfTheDay` in `[ServerSettings]` | Text shown to players when they join the server. |
| Server Region | `serverRegion` in `[ServerSettings]` | Region code shown for this server in the server browser. Choices: `0` (Europe), `1` (North America), `2` (Asia), `3` (Australia), `4` (South America), `5` (Japan). |
| Server Mod List | `ServerModList` in `[ServerSettings]` | File listing the mods this server runs, sent to clients so they can auto-download matching mods. |
| Max Nudity Level | `MaxNudity` in `[ServerSettings]` | Maximum nudity level allowed for character customization on this server. Choices: `0` (None), `1` (Partial), `2` (Full). |

### Conan Exiles: PvP Rules & Schedule

18 settings in `ServerSettings.ini`, shown under **PvP Rules & Schedule** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| PvP Enabled | `PVPEnabled` in `[ServerSettings]` | Turns on player-vs-player combat server-wide. |
| Restrict PvP to Scheduled Hours | `RestrictPVPTime` in `[ServerSettings]` | Limits PvP combat to the weekly schedule set below. |
| Restrict Building Damage to Scheduled Hours | `RestrictPVPBuildingDamageTime` in `[ServerSettings]` | Limits PvP structure damage to the weekly schedule set below. |
| Disable Building During Restricted PvP | `DisableBuildingDuringTimeRestrictedPVP` in `[ServerSettings]` | Prevents construction while scheduled PvP building-damage hours are active. |
| Combat Mode Modifier | `CombatModeModifier` in `[ServerSettings]` | Adjusts combat mode behavior/stance rules server-wide. |
| Friendly Fire Damage Multiplier | `FriendlyFireDamageMultiplier` in `[ServerSettings]` | Multiplies damage dealt between clan/guild members. |
| Mounted PvP Endurance Damage Multiplier | `PvPMountEnduranceDamageMultiplier` in `[ServerSettings]` | Multiplies endurance/stamina damage dealt to mounted players in PvP. |
| Max NPC Aggro Range | `MaxAggroRange` in `[ServerSettings]` | Maximum distance at which NPCs will notice and aggro onto players. |
| Thrall Exclusion Radius | `ThrallExclusionRadius` in `[ServerSettings]` | Radius around player bases where wild thralls won't spawn. |
| Ambient Wildlife Enabled | `AmbientLifeEnabled` in `[ServerSettings]` | Enables passive ambient wildlife spawns. |
| Dogs of the Desert Spawn With Dogs | `DogsOfTheDesertSpawnWithDogs` in `[ServerSettings]` | Enables the Dogs of the Desert NPC faction spawning with their dog companions. |
| Cross Desert Once | `CrossDesertOnce` in `[ServerSettings]` | Limits certain desert-crossing world events/spawns to occur only once. |
| Avatar Dome Duration Multiplier | `AvatarDomeDurationMultiplier` in `[ServerSettings]` | Multiplies how long a summoned Avatar's protective dome lasts. |
| Avatar Dome Damage Multiplier | `AvatarDomeDamageMultiplier` in `[ServerSettings]` | Multiplies damage dealt by a summoned Avatar's dome effect. |
| Disable Avatars | `AvatarsDisabled` in `[ServerSettings]` | Disables summoning of religion Avatars entirely. |
| Restrict Avatar Summoning to Scheduled Hours | `RestrictAvatarSummoningTime` in `[ServerSettings]` | Limits Avatar summoning to specific hours. |
| Avatar Lifetime (sec) | `AvatarLifetime` in `[ServerSettings]` | How long a summoned Avatar remains active. |
| Avatar Summon Cast Time (sec) | `AvatarSummonTime` in `[ServerSettings]` | Time required to complete the Avatar summoning ritual. |

### Conan Exiles: Player Stats & Combat

43 settings in `ServerSettings.ini`, shown under **Player Stats & Combat** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Player Damage Dealt Multiplier | `PlayerDamageMultiplier` in `[ServerSettings]` | Multiplies damage dealt by players. |
| Player Damage Taken Multiplier | `PlayerDamageTakenMultiplier` in `[ServerSettings]` | Multiplies damage taken by players. |
| Player Knockback Multiplier | `PlayerKnockbackMultiplier` in `[ServerSettings]` | Multiplies knockback force applied to players. |
| Player Carry Weight Multiplier | `PlayerEncumbranceMultiplier` in `[ServerSettings]` | Multiplies how much weight a player can carry before being encumbered. |
| Encumbrance Penalty Multiplier | `PlayerEncumbrancePenaltyMultiplier` in `[ServerSettings]` | Multiplies the movement penalty applied while overencumbered. |
| Player Movement Speed Scale | `PlayerMovementSpeedScale` in `[ServerSettings]` | Multiplies base player movement speed. |
| Player Sprint Speed Scale | `PlayerSprintSpeedScale` in `[ServerSettings]` | Multiplies player sprinting speed. |
| Sprint Stamina Cost Multiplier | `PlayerStaminaCostSprintMultiplier` in `[ServerSettings]` | Multiplies stamina consumed while sprinting. |
| Stamina Cost Multiplier | `PlayerStaminaCostMultiplier` in `[ServerSettings]` | Multiplies stamina consumed by actions in general. |
| Stamina Regen Speed Scale | `PlayerStaminaRegenSpeedScale` in `[ServerSettings]` | Multiplies how fast player stamina regenerates. |
| Stamina Regeneration Time | `StaminaRegenerationTime` in `[ServerSettings]` | Base time for stamina to fully regenerate. |
| Stamina Exhaustion Time | `StaminaExhaustionTime` in `[ServerSettings]` | Base time before stamina becomes fully exhausted under continuous use. |
| Stamina Regen (Standing Still) Multiplier | `StaminaStaticRegenRateMultiplier` in `[ServerSettings]` | Multiplies stamina regen rate while standing still. |
| Stamina Regen (Moving) Multiplier | `StaminaMovingRegenRateMultiplier` in `[ServerSettings]` | Multiplies stamina regen rate while moving. |
| Stamina Regen Pause After Use (sec) | `StaminaOnConsumeRegenPause` in `[ServerSettings]` | Seconds stamina regen is paused after consuming stamina. |
| Stamina Regen Pause After Exhaustion (sec) | `StaminaOnExhaustionRegenPause` in `[ServerSettings]` | Seconds stamina regen is paused after becoming fully exhausted. |
| Health Regen Speed Scale | `PlayerHealthRegenSpeedScale` in `[ServerSettings]` | Multiplies how fast player health regenerates. |
| Unconscious Duration (sec) | `UnconsciousTimeSeconds` in `[ServerSettings]` | How long a knocked-out player/thrall stays unconscious. |
| Knockout Damage Multiplier | `ConciousnessDamageMultiplier` in `[ServerSettings]` | Multiplies knockout (consciousness) damage dealt. |
| Player XP Rate Multiplier | `PlayerXPRateMultiplier` in `[ServerSettings]` | Multiplies overall experience gained by players. |
| XP From Kills Multiplier | `PlayerXPKillMultiplier` in `[ServerSettings]` | Multiplies experience gained from kills. |
| XP From Harvesting Multiplier | `PlayerXPHarvestMultiplier` in `[ServerSettings]` | Multiplies experience gained from harvesting. |
| XP From Crafting Multiplier | `PlayerXPCraftMultiplier` in `[ServerSettings]` | Multiplies experience gained from crafting. |
| XP Over Time Multiplier | `PlayerXPTimeMultiplier` in `[ServerSettings]` | Multiplies passive experience gained over time. |
| Corruption Gain Multiplier | `PlayerCorruptionGainMultiplier` in `[ServerSettings]` | Multiplies how fast players accumulate corruption. |
| Corruption From Sorcery Multiplier | `PlayerCorruptionGainFromSorceryMultiplier` in `[ServerSettings]` | Multiplies corruption gained specifically from using sorcery. |
| Enable Target Lock | `EnableTargetLock` in `[ServerSettings]` | Allows players to lock onto a target in combat. |
| Enable Fatalities | `EnableFatalities` in `[ServerSettings]` | Allows finishing-move fatalities on knocked-out targets. |
| Enable Clan Map Markers | `EnableClanMarkers` in `[ServerSettings]` | Shows clan member positions as markers on the map. |
| PvP Event Log Privacy | `EventLogPvPCauserPrivacy` in `[ServerSettings]` | Controls how much attacker identity detail is shown in the PvP combat log. |
| PvE Event Log Privacy | `EventLogPvECauserPrivacy` in `[ServerSettings]` | Controls how much attacker identity detail is shown in the PvE combat log. |
| Voice Chat Mode | `serverVoiceChat` in `[ServerSettings]` | Controls whether/how proximity voice chat is enabled on the server. |
| Item Repair Minimum Durability | `ItemRepairMinimumDurability` in `[ServerSettings]` | Minimum durability fraction an item can be repaired to before requiring full replacement. |
| Repair Kit Durability Loss By Tier | `ItemRepairDurabilityLossByRepairkitTier` in `[ServerSettings]` | Max-durability loss applied per repair, indexed by repair kit tier. |
| Repair Durability Loss Chance | `ItemRepairDurabilityLossPenaltyChance` in `[ServerSettings]` | Chance that a repair incurs the max-durability loss penalty. |
| Item Conversion Multiplier | `ItemConvertionMultiplier` in `[ServerSettings]` | Multiplies output from item conversion (e.g. altar conversions). |
| Fuel Burn Time Multiplier | `FuelBurnTimeMultiplier` in `[ServerSettings]` | Multiplies how long fuel lasts in furnaces/campfires/etc. |
| Crafting Resource Cost Multiplier | `CraftingCostMultiplier` in `[ServerSettings]` | Multiplies the resource cost of crafting recipes. |
| Craft From Storage Radius | `CraftFromStorageRadius` in `[ServerSettings]` | Radius within which nearby storage containers can supply crafting materials. |
| Build From Storage Radius | `BuildFromStorageRadius` in `[ServerSettings]` | Radius within which nearby storage containers can supply building materials. |
| Personal Craft From Storage Radius | `PersonalCraftFromStorageRadius` in `[ServerSettings]` | Radius within which storage can supply materials for personal (non-station) crafting. |
| Max Allowed Ping (ms) | `MaxAllowedPing` in `[ServerSettings]` | Disconnects/blocks players whose connection ping exceeds this. 0 = no limit. |
| Allow Family Shared Accounts | `AllowFamilySharedAccount` in `[ServerSettings]` | Allows players using Steam Family Sharing to join. |

### Conan Exiles: NPCs & Thralls

29 settings in `ServerSettings.ini`, shown under **NPCs & Thralls** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| NPC Respawn Rate Multiplier | `NPCRespawnMultiplier` in `[ServerSettings]` | Multiplies how quickly killed NPCs respawn. |
| NPC Health Multiplier | `NPCHealthMultiplier` in `[ServerSettings]` | Multiplies NPC health. |
| NPC Damage Dealt Multiplier | `NPCDamageMultiplier` in `[ServerSettings]` | Multiplies damage dealt by NPCs. |
| NPC Damage Taken Multiplier | `NPCDamageTakenMultiplier` in `[ServerSettings]` | Multiplies damage taken by NPCs. |
| NPC Knockback Multiplier | `NPCKnockbackMultiplier` in `[ServerSettings]` | Multiplies knockback force applied to NPCs. |
| NPC Mind Reading Mode | `NPCMindReadingMode` in `[ServerSettings]` | Controls whether/how NPCs 'know' about threats without direct detection. |
| NPC Max Spawn Cap Multiplier | `NPCMaxSpawnCapMultiplier` in `[ServerSettings]` | Multiplies the server's overall NPC population cap. |
| NPC Corpse Lifetime (sec) | `NPCCorpseLifeTime` in `[ServerSettings]` | How long NPC corpses remain before disappearing. |
| Thrall/Pet Damage Dealt Multiplier | `MinionDamageMultiplier` in `[ServerSettings]` | Multiplies damage dealt by thralls and pets. |
| Thrall/Pet Damage Taken Multiplier | `MinionDamageTakenMultiplier` in `[ServerSettings]` | Multiplies damage taken by thralls and pets. |
| Thrall Population Base | `MinionPopulationBaseValue` in `[ServerSettings]` | Base number of followers a player can have before per-player scaling. |
| Thrall Population Per Player | `MinionPopulationPerPlayer` in `[ServerSettings]` | Additional follower slots granted per online player, if population limiting is on. |
| Enable Thrall Population Limit | `UseMinionPopulationLimit` in `[ServerSettings]` | Enables a server-wide cap on the number of active thralls/pets. |
| Thrall Overpopulation Cleanup Interval | `MinionOverpopulationCleanup` in `[ServerSettings]` | How often the server checks for and removes excess thralls over the population limit. |
| Thrall Overpopulation Grace Amount | `MinionOverpopulationAllowed` in `[ServerSettings]` | How far over the population limit thralls are allowed before cleanup triggers. |
| Enable Follower Knockout State | `EnableFollowerDbno` in `[ServerSettings]` | Allows followers to be knocked unconscious instead of always dying outright. |
| Restrict Follower Rescue to Land Claim | `EnableFollowerRescueOnLandClaimOnly` in `[ServerSettings]` | Only allows rescuing downed followers within your own land claim. |
| Allow Follower Rescue In Build Exclusion Zones | `EnableFollowerRescueInBuildExclusionZone` in `[ServerSettings]` | Allows rescuing downed followers even inside build-exclusion zones. |
| Follower Rescue Cooldown (sec) | `FollowerRescueCooldown` in `[ServerSettings]` | Cooldown before a downed follower can be rescued again. |
| Damage Cooldown Before Rescue (sec) | `DamageCooldownBeforeRescue` in `[ServerSettings]` | Time after taking damage before a downed follower becomes rescuable. |
| Thrall Damage To Players Multiplier | `ThrallDamageToPlayersMultiplier` in `[ServerSettings]` | Multiplies damage thralls deal to players. |
| Thrall Damage To NPCs Multiplier | `ThrallDamageToNPCsMultiplier` in `[ServerSettings]` | Multiplies damage thralls deal to NPCs. |
| Thrall Conversion Speed Multiplier | `ThrallConversionMultiplier` in `[ServerSettings]` | Multiplies how fast captured thralls convert to your side. |
| Thrall Corruption Removal Multiplier | `ThrallCorruptionRemovalMultiplier` in `[ServerSettings]` | Multiplies how effectively corruption is removed from thralls. |
| Thrall Scouting Time (min) | `ThrallScoutingTimeMinutes` in `[ServerSettings]` | How long a scouting thrall takes to return with information. |
| Thrall Min Distance From Home | `ThrallMinDistanceAwayFromHome` in `[ServerSettings]` | Minimum distance a thrall must travel from its home base while scouting/following. |
| Thrall Teleport Cooldown (sec) | `ThrallTeleportingCooldown` in `[ServerSettings]` | Cooldown before a stuck thrall auto-teleports back to you. |
| Thrall Decay Time (sec) | `ThrallDecayTime` in `[ServerSettings]` | Time before an unattended thrall structure/follower decays. |
| Disable Thrall Decay | `DisableThrallDecay` in `[ServerSettings]` | Prevents thralls from decaying while their owner is offline. |

### Conan Exiles: Building & Decay

34 settings in `ServerSettings.ini`, shown under **Building & Decay** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Containers Ignore Ownership | `ContainersIgnoreOwnership` in `[ServerSettings]` | Lets anyone access storage containers regardless of clan ownership. |
| Land Claim Radius Multiplier | `LandClaimRadiusMultiplier` in `[ServerSettings]` | Multiplies the protected radius granted by land claim structures. |
| Cached Land Claim Radius Multiplier | `CachedLandClaimRadiusMultiplier` in `[ServerSettings]` | Internal cached copy of the land claim radius multiplier used by the server. |
| Disable Land Claim Notifications | `DisableLandclaimNotifications` in `[ServerSettings]` | Suppresses notifications when land claim status changes. |
| Building Preload Radius | `BuildingPreloadRadius` in `[ServerSettings]` | Radius around players within which structures are preloaded. |
| Can Damage Player Structures | `CanDamagePlayerOwnedStructures` in `[ServerSettings]` | Allows any damage source to affect player-owned structures (independent of PvP). |
| Enable Dynamic Building Damage | `DynamicBuildingDamage` in `[ServerSettings]` | Scales building damage dynamically based on server conditions/time. |
| Dynamic Building Damage Period (sec) | `DynamicBuildingDamagePeriod` in `[ServerSettings]` | Interval at which dynamic building damage scaling is recalculated. |
| Creative Mode Server | `CreativeModeServer` in `[ServerSettings]` | Runs the server in creative/building mode (no survival restrictions). |
| Building Replication Distance | `BuildingReplicationDistance` in `[ServerSettings]` | Distance at which building data replicates to clients. 0 uses the default. |
| Cached Building Replication Distance | `CachedBuildingReplicationDistance` in `[ServerSettings]` | Internal cached copy of the building replication distance. |
| Disable Building Abandonment | `DisableBuildingAbandonment` in `[ServerSettings]` | Prevents structures from ever being marked abandoned/decayed. |
| Max Building Decay Time (sec) | `MaxBuildingDecayTime` in `[ServerSettings]` | Maximum time an unattended building can stand before being fully decayed. |
| Max Decay Time To Auto-Demolish (sec) | `MaxDecayTimeToAutoDemolish` in `[ServerSettings]` | Time after full decay before a structure is automatically demolished. |
| Building Decay Time Per Score | `BuildingDecayTimePerScore` in `[ServerSettings]` | Decay time granted per point of a structure's building score. |
| Building Decay Time Multiplier | `BuildingDecayTimeMultiplier` in `[ServerSettings]` | Multiplies overall building decay time. |
| Decay Cleanup Time Multiplier | `DecayCleanupTimeMultiplier` in `[ServerSettings]` | Multiplies the delay before fully-decayed structures are cleaned up. |
| Decay Bonus Time Rate | `DecayBonusTimeRate` in `[ServerSettings]` | Rate at which bonus decay time accrues (e.g. from being online). |
| Show Building Score In Decay UI | `DecayShowBuildingScore` in `[ServerSettings]` | Displays the numeric building score in the decay/stability UI. |
| Structural Stability Loss Multiplier | `StabilityLossMultiplier` in `[ServerSettings]` | Multiplies how quickly structures lose stability when unsupported. |
| Building Damage Multiplier | `BuildingDamageMultiplier` in `[ServerSettings]` | Multiplies damage dealt to structures. |
| Structure Health Multiplier | `StructureHealthMultiplier` in `[ServerSettings]` | Multiplies structure max health. |
| Structure Damage Multiplier | `StructureDamageMultiplier` in `[ServerSettings]` | Multiplies damage structures deal (e.g. traps). |
| Enable Building Validation | `BuildingValidationEnabled` in `[ServerSettings]` | Enables server-side validation of building placement rules. |
| Allow Building Anywhere | `AllowBuildingAnywhere` in `[ServerSettings]` | Disables normal terrain/zone restrictions on where structures can be placed. |
| Enable Building Pickup | `BuildingPickupEnabled` in `[ServerSettings]` | Allows recently-placed structures to be picked back up. |
| Enable POI Protection | `PoiProtectionEnabled` in `[ServerSettings]` | Prevents building inside protected points of interest. |
| Enable World Event System | `EventSystemEnabled` in `[ServerSettings]` | Enables scripted world events. |
| Camps Ignore Land Claim | `CampsIgnoreLandclaim` in `[ServerSettings]` | Lets NPC camps spawn/exist inside player land claims. |
| Offline Body Despawn Time (hrs) | `OfflinePlayersUnconsciousBodiesHours` in `[ServerSettings]` | Hours before an offline player's knocked-out body is removed. |
| Max Corpses Per Player | `CorpsesPerPlayer` in `[ServerSettings]` | Maximum number of your own death corpses kept on the map at once. |
| Player Corpse Lifetime (sec) | `PlayerCorpseLifeTime` in `[ServerSettings]` | How long a player death corpse remains before disappearing. |
| Animal Pen Crafting Time Multiplier | `AnimalPenCraftingTimeMultiplier` in `[ServerSettings]` | Multiplies how long animal pen breeding/crafting takes. |
| Feed Box Range Multiplier | `FeedBoxRangeMultiplier` in `[ServerSettings]` | Multiplies the range a feed box can supply food to nearby pets/pens. |

### Conan Exiles: Land Claims

12 settings in `ServerSettings.ini`, shown under **Land Claims** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Max Land Claims Per Player | `LandClaimCount` in `[ServerSettings]` | Maximum number of land claim keystones a single player can place. |
| Land Claim Size (blocks) | `LandClaimSize` in `[ServerSettings]` | Radius protected by a single land claim keystone. |
| Land Claim Dead Zone | `LandClaimDeadZone` in `[ServerSettings]` | Minimum distance required between keystones placed by non-allied players. |
| Land Claim Expiry Time (days) | `LandClaimExpiryTime` in `[ServerSettings]` | Real-world days a player can be offline before their land claims expire. |
| Land Claim Decay Mode | `LandClaimDecayMode` in `[ServerSettings]` | Controls how offline land claim protection decays: slow linear, fast exponential, or none. |
| Land Claim Durability Multiplier (Online) | `LandClaimOnlineDurabilityModifier` in `[ServerSettings]` | Multiplies protected block hardness while the owner is online. |
| Land Claim Durability Multiplier (Offline) | `LandClaimOfflineDurabilityModifier` in `[ServerSettings]` | Multiplies protected block hardness while the owner is offline. |
| Land Claim Offline Delay (min) | `LandClaimOfflineDelay` in `[ServerSettings]` | Minutes after logout before offline durability modifiers take effect. |
| Enable Dynamic Mesh | `DynamicMeshEnabled` in `[ServerSettings]` | Enables the dynamic mesh (destructible terrain smoothing) system. |
| Dynamic Mesh: Land Claims Only | `DynamicMeshLandClaimOnly` in `[ServerSettings]` | Restricts the dynamic mesh system to only apply within land claims. |
| Dynamic Mesh Land Claim Buffer | `DynamicMeshLandClaimBuffer` in `[ServerSettings]` | Chunk radius around land claims included in dynamic mesh processing. |
| Dynamic Mesh Max Item Cache | `DynamicMeshMaxItemCache` in `[ServerSettings]` | How many items dynamic mesh processing can cache concurrently. Higher uses more RAM. |

### Conan Exiles: Admin & Misc

34 settings in `ServerSettings.ini`, shown under **Admin & Misc** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| AFK Kick CPU Threshold % | `KickAFKPercentage` in `[ServerSettings]` | Server load percentage above which AFK players start getting kicked to free resources. |
| AFK Kick Time (sec) | `KickAFKTime` in `[ServerSettings]` | How long a player can be inactive before being kicked as AFK. |
| Show Online Player Count | `ShowOnlinePlayers` in `[ServerSettings]` | Shows the online player count in the server browser. |
| Disable Chat Formatting | `DisableChatFormatting` in `[ServerSettings]` | Disables rich text formatting in chat messages. |
| Enable Login Queue | `EnableLoginQueue` in `[ServerSettings]` | Queues incoming connections when the server is full instead of rejecting them outright. |
| Disconnection Grace Time (sec) | `DisconnectionGraceTime` in `[ServerSettings]` | Time a disconnected player's character remains in the world before being removed. |
| Enable BattlEye | `IsBattlEyeEnabled` in `[ServerSettings]` | Enables the BattlEye anti-cheat system. |
| Enable Server Transfers | `ServerTransferEnabled` in `[ServerSettings]` | Allows players to transfer their character between servers. |
| Server Transfer Whitelist | `ServerTransferServersWhitelist` in `[ServerSettings]` | Comma-separated list of servers players are allowed to transfer to/from. |
| Server Merge Outgoing Time | `ServerMergeOutgoingTime` in `[ServerSettings]` | Scheduled time for an outgoing server merge, if configured. |
| Server Merge Destination | `ServerMergeDestination` in `[ServerSettings]` | Target server address for an outgoing server merge, if configured. |
| Server Retirement Time | `ServerRetirementTime` in `[ServerSettings]` | Scheduled time this server is set to retire/shut down, if configured. |
| Allow Players From Africa | `RegionAllowAfrica` in `[ServerSettings]` | Allows players connecting from the Africa region. |
| Allow Players From Asia | `RegionAllowAsia` in `[ServerSettings]` | Allows players connecting from the Asia region. |
| Allow Players From Central Europe | `RegionAllowCentralEurope` in `[ServerSettings]` | Allows players connecting from the Central Europe region. |
| Allow Players From Eastern Europe | `RegionAllowEasternEurope` in `[ServerSettings]` | Allows players connecting from the Eastern Europe region. |
| Allow Players From Western Europe | `RegionAllowWesternEurope` in `[ServerSettings]` | Allows players connecting from the Western Europe region. |
| Allow Players From North America | `RegionAllowNorthAmerica` in `[ServerSettings]` | Allows players connecting from the North America region. |
| Allow Players From Oceania | `RegionAllowOceania` in `[ServerSettings]` | Allows players connecting from the Oceania region. |
| Allow Players From South America | `RegionAllowSouthAmerica` in `[ServerSettings]` | Allows players connecting from the South America region. |
| Region Block List | `RegionBlockList` in `[ServerSettings]` | Comma-separated list of regions to explicitly block. |
| Twitch Integration Permission Level | `TwitchServerPermission` in `[ServerSettings]` | Permission level required to use Twitch integration commands. |
| Allow Twitch Blood Moon Trigger | `TwitchBloodMoonAllowed` in `[ServerSettings]` | Allows Twitch viewers to trigger a Blood Moon event via integration. |
| Max Death Map Markers | `MaxDeathMapMarkers` in `[ServerSettings]` | Maximum number of death location markers kept on the map per player. |
| Party Shared Kill XP Range | `PartySharedKillRange` in `[ServerSettings]` | Distance within which party members share kill XP and quest credit. |
| Player Killing Mode | `PlayerKillingMode` in `[ServerSettings]` | Controls who players are allowed to kill: no one, allies only, strangers only, or everyone. |
| Health Bar Visibility Distance | `HealthbarVisibilityDistance` in `[ServerSettings]` | Maximum distance at which enemy health bars are visible. |
| Building PvP Whitelist | `BuildingPVPWhitelist` in `[ServerSettings]` | List of structure/item IDs exempt from normal PvP building damage rules. |
| Validate Pathing With Raycast | `ValidatePhysNavWalkWithRaycast` in `[ServerSettings]` | Enables extra raycast validation for NPC pathing/navigation. |
| Validate Player Stats | `ValidatePlayerStats` in `[ServerSettings]` | Enables server-side validation of player stat values to catch tampering. |
| Enable Undermesh Detection | `bUndermeshDetectionEnabled` in `[ServerSettings]` | Detects and acts on players/structures found outside the normal collision mesh. |
| Allowed Time Undermesh (sec) | `AllowedTimeUndermesh` in `[ServerSettings]` | Grace period allowed underneath the mesh before undermesh detection acts. |
| Cap Character Scaling Params | `CapCharacterLayoutScalarParams` in `[ServerSettings]` | Clamps character body-scaling parameters to prevent extreme/exploited values. |
| Path Following Sends Angular Velocity | `PathFollowingSendsAngularVelocity` in `[ServerSettings]` | Includes angular velocity data in NPC path-following network updates. |

## Minecraft (Java)

Minecraft keeps its settings in `server.properties` in the server's install folder: one `name=value` line per setting.

- `server.properties`: The whole server: name, gameplay, world generation, who can join, networking and the resource pack.
- Launch arguments: they are in the start script. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#minecraft-java).

Mods and plugins add settings in files of their own (a `config` folder, a plugin's folder). The panel does not explain those.

### Minecraft: Server Info

2 settings in `server.properties`, shown under **Server Info** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Message of the Day | `motd` in `[root]` | The line of text shown for this server in the multiplayer server list. |
| Max Players | `max-players` in `[root]` | Maximum number of players allowed on the server at once. |

### Minecraft: Gameplay

11 settings in `server.properties`, shown under **Gameplay** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Difficulty | `difficulty` in `[root]` | World difficulty: peaceful, easy, normal, or hard. Choices: `peaceful` (Peaceful: no hostile mobs), `easy` (Easy), `normal` (Normal), `hard` (Hard). |
| Default Game Mode | `gamemode` in `[root]` | Game mode new players join in: survival, creative, adventure, or spectator. Choices: `survival` (Survival), `creative` (Creative), `adventure` (Adventure), `spectator` (Spectator). |
| Hardcore Mode | `hardcore` in `[root]` | Players are banned instead of respawning when they die. |
| PvP Enabled | `pvp` in `[root]` | Allows players to fight and damage each other. |
| Force Default Game Mode | `force-gamemode` in `[root]` | Forces players into the default game mode on join, overriding their saved mode. |
| Spawn Monsters | `spawn-monsters` in `[root]` | Allows hostile mobs to spawn in the world. |
| Spawn Animals | `spawn-animals` in `[root]` | Allows passive animals to spawn in the world. |
| Spawn Villagers | `spawn-npcs` in `[root]` | Allows villager NPCs to spawn. |
| Generate Structures | `generate-structures` in `[root]` | Allows structures (villages, temples, etc) to generate in new chunks. |
| Allow Nether | `allow-nether` in `[root]` | Allows players to travel to the Nether dimension. |
| Allow Flight | `allow-flight` in `[root]` | Allows players to fly in survival mode without being kicked for flying (needed for some mods). |

### Minecraft: World

10 settings in `server.properties`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| World Folder Name | `level-name` in `[root]` | The folder name used to store this world's data. |
| World Seed | `level-seed` in `[root]` | Seed used to generate a new world. Leave blank for a random seed. |
| World Type | `level-type` in `[root]` | Type of world to generate (default, flat, large biomes, amplified, etc). Choices: `minecraft:normal` (Normal), `minecraft:flat` (Superflat), `minecraft:large_biomes` (Large biomes), `minecraft:amplified` (Amplified (tall terrain)), `minecraft:single_biome_surrounds` (Single biome). Another value can be typed. |
| World Generator Settings | `generator-settings` in `[root]` | Advanced JSON settings passed to the world generator (used for flat worlds, etc). |
| Max World Size | `max-world-size` in `[root]` | Maximum radius, in blocks, the world border can grow to. |
| Max Build Height | `max-build-height` in `[root]` | Maximum height players can build to. |
| View Distance (chunks) | `view-distance` in `[root]` | How many chunks in each direction the server sends to clients. |
| Simulation Distance (chunks) | `simulation-distance` in `[root]` | How many chunks around each player are actively simulated (mobs, redstone, etc). |
| Entity Visibility Range (%) | `entity-broadcast-range-percentage` in `[root]` | How far away players are sent mobs and other entities, as a percentage of normal. Lower saves bandwidth and CPU. |
| Spawn Protection Radius | `spawn-protection` in `[root]` | Radius around the world spawn point that only operators can build in. |

### Minecraft: Access Control

10 settings in `server.properties`, shown under **Access Control** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Enable Whitelist | `white-list` in `[root]` | Restricts joining to players on the whitelist. |
| Enforce Whitelist Live | `enforce-whitelist` in `[root]` | Immediately kicks players removed from the whitelist instead of waiting for their next join. |
| Show Code of Conduct | `enable-code-of-conduct` in `[root]` | Shows players the server's code of conduct, from its codeofconduct folder, before they join. |
| Online Mode | `online-mode` in `[root]` | Verifies players against Mojang/Microsoft accounts. Turning this off allows unauthenticated (cracked) clients. |
| Enforce Secure Chat Profile | `enforce-secure-profile` in `[root]` | Requires players to have a Mojang-signed chat profile to join. |
| Prevent Proxy Connections | `prevent-proxy-connections` in `[root]` | Blocks connections detected as coming through a proxy/VPN. |
| Player Idle Timeout (min) | `player-idle-timeout` in `[root]` | Minutes of inactivity before an idle player is kicked. 0 disables. |
| Operator Permission Level | `op-permission-level` in `[root]` | Permission level (1-4) granted to server operators. Choices: `1` (1: bypass spawn protection), `2` (2: use cheat commands (/gamemode, /give)), `3` (3: manage players (/op, /ban)), `4` (4: everything, including /stop). |
| Function Permission Level | `function-permission-level` in `[root]` | Default permission level used when running functions. Choices: `1`, `2`, `3`, `4`. |
| Hide Online Players From Query | `hide-online-players` in `[root]` | Excludes the online player list from server list ping/query responses. |

### Minecraft: Admin & Networking

32 settings in `server.properties`, shown under **Admin & Networking** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Enable Command Blocks | `enable-command-block` in `[root]` | Allows command blocks to run commands. |
| Enable RCON | `enable-rcon` in `[root]` | Enables the RCON remote console interface used by this dashboard to query/control the server. |
| RCON Port | `rcon.port` in `[root]` | Network port the RCON interface listens on. |
| RCON Password | `rcon.password` in `[root]` | Password required to authenticate to the RCON interface. |
| Pause When Empty (seconds) | `pause-when-empty-seconds` in `[root]` | How many seconds the server waits with nobody on before it pauses the world to save resources. 0 never pauses. |
| Enable Management Server | `management-server-enabled` in `[root]` | Turns on the server's management interface, a remote connection other tools can use to run the server. GodlyPanel doesn't need it. |
| Management Server Address | `management-server-host` in `[root]` | The address the management interface listens on. localhost keeps it to this PC. |
| Management Server Port | `management-server-port` in `[root]` | The port the management interface listens on. 0 lets the game pick one. |
| Management Server Secret | `management-server-secret` in `[root]` | The secret a tool must give to use the management interface. Keep it private. |
| Management Server Encryption | `management-server-tls-enabled` in `[root]` | Encrypts the management connection (TLS). Leave it on unless a tool you use can't cope with it. |
| Management Server Keystore | `management-server-tls-keystore` in `[root]` | The keystore file holding the certificate for the encrypted management connection. |
| Management Server Keystore Password | `management-server-tls-keystore-password` in `[root]` | The password of that keystore. Keep it private. |
| Management Server Allowed Origins | `management-server-allowed-origins` in `[root]` | Web addresses allowed to talk to the management interface from a browser. Leave empty for none. |
| Enable Query Protocol | `enable-query` in `[root]` | Enables the GameSpy4 query protocol used by some server-list tools. |
| Query Port | `query.port` in `[root]` | Network port the query protocol listens on. |
| Enable Server List Ping | `enable-status` in `[root]` | Allows the server to respond to the multiplayer server-list ping. |
| Bind IP Address | `server-ip` in `[root]` | Network interface IP the server binds to. Leave blank/0.0.0.0 to bind all interfaces. |
| Server Port | `server-port` in `[root]` | Network port the server listens on for player connections. |
| Network Compression Threshold | `network-compression-threshold` in `[root]` | Packet size, in bytes, above which network traffic is compressed. |
| Use Native Transport | `use-native-transport` in `[root]` | Uses Linux-native network optimizations when available. |
| Packet Rate Limit | `rate-limit` in `[root]` | Maximum packets per second accepted from a single connection. 0 disables the limit. |
| Broadcast Console Commands to Ops | `broadcast-console-to-ops` in `[root]` | Shows command output run from the server console to online operators. |
| Broadcast RCON Commands to Ops | `broadcast-rcon-to-ops` in `[root]` | Shows command output run over RCON to online operators. |
| Log Player IP Addresses | `log-ips` in `[root]` | Includes player IP addresses in the server log. |
| Enable JMX Monitoring | `enable-jmx-monitoring` in `[root]` | Exposes server metrics over JMX for external monitoring tools. |
| Synchronous Chunk Writes | `sync-chunk-writes` in `[root]` | Writes chunk data to disk synchronously, trading performance for extra save safety. |
| Max Tick Time (ms) | `max-tick-time` in `[root]` | How long a single tick can take before the server force-kills itself as watchdog protection. |
| Max Chained Neighbor Updates | `max-chained-neighbor-updates` in `[root]` | Caps how many block updates can chain together (redstone/piston spam protection). |
| Enable Snooper | `snooper-enabled` in `[root]` | Sends anonymous usage statistics to Mojang. |
| Region File Compression | `region-file-compression` in `[root]` | Compression algorithm used for saved chunk region files. Choices: `deflate` (Deflate (default)), `lz4` (LZ4 (faster, larger)), `none` (None). |
| Accept Server Transfers | `accepts-transfers` in `[root]` | Allows players to be transferred in from another server via the transfer packet. |
| Bug Report Link | `bug-report-link` in `[root]` | URL shown to players for reporting bugs, if set. |

### Minecraft: Resource Pack

8 settings in `server.properties`, shown under **Resource Pack** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Require Resource Pack | `require-resource-pack` in `[root]` | Forces players to accept the server resource pack to play. |
| Resource Pack URL | `resource-pack` in `[root]` | URL of the resource pack sent to joining players. |
| Resource Pack UUID | `resource-pack-id` in `[root]` | UUID identifying the resource pack. |
| Resource Pack Prompt Text | `resource-pack-prompt` in `[root]` | Custom message shown to players when prompted to download the resource pack. |
| Resource Pack SHA-1 | `resource-pack-sha1` in `[root]` | SHA-1 checksum used to verify the resource pack download. |
| Text Filtering Config | `text-filtering-config` in `[root]` | Path to a chat text-filtering configuration, if used. |
| Initially Enabled Data Packs | `initial-enabled-packs` in `[root]` | Comma-separated data packs enabled when the world is first created. |
| Initially Disabled Data Packs | `initial-disabled-packs` in `[root]` | Comma-separated data packs disabled when the world is first created. |

## Enshrouded

Enshrouded keeps its settings in `enshrouded_server.json` in the server's install folder.

- `enshrouded_server.json`: The server's name, ports, slot count and the rules of the world (`gameSettings`). The player groups with their passwords (`userGroups`) are listed separately from these simple settings.

### Enshrouded: Server Info

6 settings in `enshrouded_server.json`, shown under **Server Info** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server Name | `name` | The name shown for this server in the in-game server browser. |
| Max Players | `slotCount` | Maximum number of players allowed on the server. |
| Voice Chat Mode | `voiceChatMode` | How proximity voice chat behaves (e.g. Proximity, Global, Off). Choices: `Proximity` (Proximity: players hear nearby players), `Global` (Global: everyone hears everyone). |
| Enable Voice Chat | `enableVoiceChat` | Turns proximity voice chat on or off. |
| Enable Text Chat | `enableTextChat` | Turns in-game text chat on or off. |
| Game Settings Preset | `gameSettingsPreset` | Named difficulty/rules preset the gameSettings below were based on. Choices: `Default`, `Relaxed`, `Hard`, `Survival`, `Custom`. Another value can be typed. |

### Enshrouded: Networking

2 settings in `enshrouded_server.json`, shown under **Networking** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Bind IP Address | `ip` | Network interface IP the server binds to. |
| Query Port | `queryPort` | Network port used for the server browser query. |

### Enshrouded: Player

10 settings in `enshrouded_server.json`, shown under **Player** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Player Health Factor | `gameSettings.playerHealthFactor` | Multiplies player max health. |
| Player Mana Factor | `gameSettings.playerManaFactor` | Multiplies player max mana. |
| Player Stamina Factor | `gameSettings.playerStaminaFactor` | Multiplies player max stamina. |
| Player Body Heat Factor | `gameSettings.playerBodyHeatFactor` | Multiplies how well players retain body heat in cold areas. |
| Player Diving Time Factor | `gameSettings.playerDivingTimeFactor` | Multiplies how long players can hold their breath underwater. |
| Enable Item Durability | `gameSettings.enableDurability` | Turns equipment durability loss on or off. |
| Enable Starving Debuff | `gameSettings.enableStarvingDebuff` | Applies a debuff to players when their food/hunger runs out. |
| Food Buff Duration Factor | `gameSettings.foodBuffDurationFactor` | Multiplies how long food buffs last. |
| Time From Hungry To Starving | `gameSettings.fromHungerToStarving` | Time (nanoseconds) it takes a hungry player to become starving. |
| Tombstone Mode | `gameSettings.tombstoneMode` | What happens to your items on death (e.g. drop everything, keep backpack materials). Choices: `AddBackpackMaterials` (Keep backpack contents as materials), `Everything` (Drop everything), `NoTombstone` (No tombstone (items are kept)). Another value can be typed. |

### Enshrouded: World

7 settings in `enshrouded_server.json`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Shroud Time Factor | `gameSettings.shroudTimeFactor` | Multiplies how long players can survive inside the Shroud before taking effect damage. |
| Enable Glider Turbulence | `gameSettings.enableGliderTurbulences` | Enables turbulence effects while gliding. |
| Weather Frequency | `gameSettings.weatherFrequency` | How often weather changes occur. Choices: `Disabled`, `Rare`, `Normal`, `Often`. Another value can be typed. |
| Fishing Difficulty | `gameSettings.fishingDifficulty` | Difficulty of the fishing minigame. Choices: `VeryEasy`, `Easy`, `Normal`, `Hard`, `VeryHard`. Another value can be typed. |
| Day Length | `gameSettings.dayTimeDuration` | Length of in-game daytime, in nanoseconds. |
| Night Length | `gameSettings.nightTimeDuration` | Length of in-game nighttime, in nanoseconds. |
| Curse Modifier | `gameSettings.curseModifier` | Adjusts the strength/frequency of the Shroud's curse effects. Choices: `Easy`, `Normal`, `Hard`. Another value can be typed. |

### Enshrouded: Resources

6 settings in `enshrouded_server.json`, shown under **Resources** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Mining Damage Factor | `gameSettings.miningDamageFactor` | Multiplies damage dealt to mineable terrain/resources. |
| Plant Growth Speed Factor | `gameSettings.plantGrowthSpeedFactor` | Multiplies how fast farmed plants grow. |
| Resource Drop Amount Factor | `gameSettings.resourceDropStackAmountFactor` | Multiplies the quantity of resources dropped when gathering. |
| Factory Production Speed Factor | `gameSettings.factoryProductionSpeedFactor` | Multiplies crafting/production speed at factory stations. |
| Perk Upgrade Recycling Factor | `gameSettings.perkUpgradeRecyclingFactor` | Fraction of resources refunded when re-speccing/recycling perk upgrades. |
| Perk Cost Factor | `gameSettings.perkCostFactor` | Multiplies the resource cost of unlocking perks. |

### Enshrouded: Enemies & Bosses

14 settings in `enshrouded_server.json`, shown under **Enemies & Bosses** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Combat XP Factor | `gameSettings.experienceCombatFactor` | Multiplies experience gained from combat. |
| Mining XP Factor | `gameSettings.experienceMiningFactor` | Multiplies experience gained from mining. |
| Exploration/Quest XP Factor | `gameSettings.experienceExplorationQuestsFactor` | Multiplies experience gained from exploration and quests. |
| Random Enemy Spawn Amount | `gameSettings.randomSpawnerAmount` | How many enemies spawn from random world spawners. Choices: `Few`, `Normal`, `Many`, `Extreme`. Another value can be typed. |
| Enemy Aggro Pool Amount | `gameSettings.aggroPoolAmount` | How many enemies can be aggroed onto players at once. Choices: `Few`, `Normal`, `Many`, `Extreme`. Another value can be typed. |
| Enemy Damage Factor | `gameSettings.enemyDamageFactor` | Multiplies damage dealt by enemies. |
| Enemy Health Factor | `gameSettings.enemyHealthFactor` | Multiplies enemy max health. |
| Enemy Stamina Factor | `gameSettings.enemyStaminaFactor` | Multiplies enemy stamina. |
| Enemy Perception Range Factor | `gameSettings.enemyPerceptionRangeFactor` | Multiplies the distance at which enemies notice players. |
| Boss Damage Factor | `gameSettings.bossDamageFactor` | Multiplies damage dealt by boss enemies. |
| Boss Health Factor | `gameSettings.bossHealthFactor` | Multiplies boss max health. |
| Threat Bonus | `gameSettings.threatBonus` | Multiplies threat/aggro generation. |
| Pacify All Enemies | `gameSettings.pacifyAllEnemies` | Makes all enemies passive and non-hostile. |
| Taming Startle Repercussion | `gameSettings.tamingStartleRepercussion` | What happens to taming progress if the creature being tamed is startled. Choices: `KeepProgress`, `LoseSomeProgress`, `LoseAllProgress`. Another value can be typed. |

### Enshrouded: Advanced

2 settings in `enshrouded_server.json`, shown under **Advanced** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Save Directory | `saveDirectory` | Folder path where world save data is stored. |
| Log Directory | `logDirectory` | Folder path where server logs are written. |

## 7 Days to Die

7 Days to Die keeps almost all of its settings in `serverconfig.xml` in the server's install folder. Each is a `<property name="..." value="..."/>` line. The launch line only says where that file is and where saves go.

- `serverconfig.xml`: Everything about the server and the world: name, ports, difficulty, day length, loot, blood moon, land claims and more.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#7-days-to-die).

A setting the file does not list keeps the game's own default. To use another value, add its line to the file.

### 7 Days to Die: Server

13 settings in `serverconfig.xml`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` | The name shown in the in-game server list. |
| Description | `ServerDescription` | A line or two shown under the name in the server list. |
| Website | `ServerWebsiteURL` | A web address shown to players in the server list. |
| Password | `ServerPassword` | What players must type to join. Leave empty for a server anyone can join. |
| Login message | `ServerLoginConfirmationText` | Text players must read and accept every time they join (rules, for example). Leave empty for none. |
| Region | `Region` | Where the server is, used to sort it in the server list. Choices: `NorthAmericaEast`, `NorthAmericaWest`, `CentralAmerica`, `SouthAmerica`, `Europe`, `Russia`, `Asia`, `MiddleEast`, `Africa`, `Oceania`. Another value can be typed. |
| Language | `Language` | The language of the server, shown in the list. Use the English name, for example English or German. |
| Who can see it | `ServerVisibility` | Public servers are in the server list for everyone; friends-only ones show to Steam friends; unlisted ones can only be joined by address. Choices: `0` (Not listed), `1` (Friends only), `2` (Public). |
| Max players | `ServerMaxPlayerCount` | The most players that can be on at once. |
| Reserved slots | `ServerReservedSlots` | Slots held back for players with the permission level below, so they can always get in on a full server. |
| Reserved slots: permission level | `ServerReservedSlotsPermission` | The permission level a player needs to use a reserved slot (lower numbers are more powerful). |
| Admin slots | `ServerAdminSlots` | Extra slots above the max players that only admins can use. |
| Admin slots: permission level | `ServerAdminSlotsPermission` | The permission level needed to use an admin slot. |

### 7 Days to Die: Network

8 settings in `serverconfig.xml`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game port | `ServerPort` | The port players connect to. The game also uses the next few ports, so keep them free. Change it from the server's Ports section so the panel can check for clashes. |
| Turn off network protocols | `ServerDisabledNetworkProtocols` | Protocols to disable. Turning off SteamNetworking hides the server from Steam, so players join by address instead. |
| World download speed (KiB/s) | `ServerMaxWorldTransferSpeedKiBs` | How fast the world is sent to a joining player. Lower it if joins make everyone lag. |
| Allow crossplay | `ServerAllowCrossplay` | Lets console players join. Needs a public server and all the crossplay requirements to be met. |
| Easy Anti-Cheat | `EACEnabled` | Turns Easy Anti-Cheat on. Players must run the game with anti-cheat on to join, and mods that change the client need it off. |
| Ignore Epic sanctions | `IgnoreEOSSanctions` | Lets players who are sanctioned by Epic join anyway. |
| Mesh layers queued | `MaxQueuedMeshLayers` | How many chunk meshes the server may queue. Lower uses less memory but loads chunks more slowly. |
| Max view distance | `ServerMaxAllowedViewDistance` | The furthest view distance (in chunks) a player may ask for. Lower it to save memory and CPU. |

### 7 Days to Die: World

11 settings in `serverconfig.xml`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| World | `GameWorld` | Navezgane is the fixed map. RWG makes a random world from the seed and size below. You can also name a downloaded world. |
| World seed | `WorldGenSeed` | The text that decides what a random world (RWG) looks like. The same seed and size always give the same world. |
| World size | `WorldGenSize` | How large a random world is, in blocks. Bigger worlds take far longer to make and use more memory. |
| Save name | `GameName` | The name of the save. Each name keeps its own game, so changing it starts a new game. |
| Difficulty and rules code | `SandboxCode` | In newer versions of the game, the difficulty, day length, loot, zombie, blood moon and similar rules are one code instead of separate settings. To change it, open the game's new-game screen, press Sandbox options, adjust them, press Copy code and paste the result here. |
| Game mode | `GameMode` | The rules of the game. GameModeSurvival is the normal game. |
| Real minutes per game day | `DayNightLength` | How long a whole in-game day lasts in real minutes. |
| Daylight hours | `DayLightLength` | How many of the 24 in-game hours are daylight. The rest is night. |
| Biome progression | `BiomeProgression` | Makes the harder biomes more dangerous to survive in, so players move on gradually. |
| Storm frequency | `StormFreq` | How often weather storms happen, as a percentage. 0 turns them off. |
| Keep player profiles | `PersistentPlayerProfiles` | Keeps a player's character when they come back, instead of always starting a new one. |

### 7 Days to Die: Gameplay

23 settings in `serverconfig.xml`, shown under **Gameplay** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Difficulty | `GameDifficulty` | How hard the game is overall. Raises enemy damage and health and lowers yours. Choices: `0` (0: Scavenger), `1` (1: Adventurer), `2` (2: Nomad), `3` (3: Warrior), `4` (4: Survivalist), `5` (5: Insane). |
| Block damage: players (%) | `BlockDamagePlayer` | How much damage players do to blocks, as a percentage. |
| Block damage: zombies (%) | `BlockDamageAI` | How much damage zombies do to blocks, as a percentage. |
| Block damage: blood moon zombies (%) | `BlockDamageAIBM` | How much damage zombies do to blocks during a blood moon, as a percentage. |
| XP multiplier (%) | `XPMultiplier` | How much experience players earn, as a percentage. 100 is normal. |
| New player safe zone: level | `PlayerSafeZoneLevel` | Players up to this level are protected from zombies spawning near them. |
| New player safe zone: hours | `PlayerSafeZoneHours` | How many in-game hours a new player is protected for after spawning. |
| Creative mode building | `BuildCreate` | Lets players build freely with no limits (creative mode). Turns off achievements. |
| Bedroll dead zone | `BedrollDeadZoneSize` | How far around a bedroll zombies can't spawn, in blocks. |
| Bedroll expiry (days) | `BedrollExpiryTime` | How many real days a bedroll counts as a spawn point after its owner was last on. |
| Spawn near friends | `AllowSpawnNearFriend` | Whether a player who is new or just died can spawn next to a friend. |
| Camera | `CameraRestrictionMode` | Whether players may use first person, third person or either. Choices: `0` (Free: first or third person), `1` (First person only), `2` (Third person only). |
| Jar refund (%) | `JarRefund` | How much of a jar is given back when a canned item is eaten, as a percentage. |
| Death penalty | `DeathPenalty` | What happens to a character that dies. Choices: `0` (Nothing: respawn with everything), `1` (Default: classic XP penalty), `2` (Injured: respawn injured), `3` (Permanent death: character deleted). |
| Items dropped on death | `DropOnDeath` | Which of a player's items are dropped when they die. Choices: `0` (Nothing), `1` (Everything), `2` (Toolbelt only), `3` (Backpack only), `4` (Delete everything). |
| Items dropped on quitting | `DropOnQuit` | Which of a player's items are dropped when they leave the game. Choices: `0` (Nothing), `1` (Everything), `2` (Toolbelt only), `3` (Backpack only). |
| Player killing | `PlayerKillingMode` | Whether players may hurt each other, and whom. Choices: `0` (No player killing), `1` (Kill allies only), `2` (Kill strangers only), `3` (Kill everyone). |
| Party shared XP range | `PartySharedKillRange` | How close party members must be to share XP from a kill, in blocks. |
| Daily quest limit | `QuestProgressionDailyLimit` | How many quests a player can complete in a day before quests wait for the next day. -1 for no limit. |
| Loot abundance (%) | `LootAbundance` | How much loot is in containers, as a percentage. 100 is normal. |
| Loot respawn (days) | `LootRespawnDays` | How many in-game days before loot in containers comes back. |
| Airdrop frequency (hours) | `AirDropFrequency` | How many in-game hours between airdrops. 0 turns them off. |
| Airdrop map marker | `AirDropMarker` | Shows the airdrop on every player's map. |

### 7 Days to Die: Zombies

13 settings in `serverconfig.xml`, shown under **Zombies** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Enemy spawning | `EnemySpawnMode` | Turns zombies and animals spawning on or off. |
| Enemy difficulty | `EnemyDifficulty` | 0 is normal; 1 makes the enemies feral (stronger and faster). |
| Max zombies | `MaxSpawnedZombies` | The most zombies that can be alive at once. A high number can slow the server. |
| Max animals | `MaxSpawnedAnimals` | The most animals that can be alive at once. |
| Zombie speed (day) | `ZombieMove` | How fast ordinary zombies move in daytime. Choices: `0` (Walk), `1` (Jog), `2` (Run), `3` (Sprint), `4` (Nightmare). |
| Zombie speed (night) | `ZombieMoveNight` | How fast ordinary zombies move at night. Choices: `0` (Walk), `1` (Jog), `2` (Run), `3` (Sprint), `4` (Nightmare). |
| Zombie speed (feral) | `ZombieFeralMove` | How fast feral zombies move. Choices: `0` (Walk), `1` (Jog), `2` (Run), `3` (Sprint), `4` (Nightmare). |
| Zombie speed (blood moon) | `ZombieBBMove` | How fast zombies move during a blood moon. Choices: `0` (Walk), `1` (Jog), `2` (Run), `3` (Sprint), `4` (Nightmare). |
| Feral sense | `ZombieFeralSense` | When zombies can sense a player through walls. Choices: `0` (Off), `1` (Day only), `2` (Night only), `3` (All the time). |
| Blood moon frequency (days) | `BloodMoonFrequency` | Days between blood moons. 0 turns them off. |
| Blood moon random range (days) | `BloodMoonRange` | How many days a blood moon can come early or late, at random. |
| Blood moon warning (hour) | `BloodMoonWarning` | The in-game hour the blood moon warning appears. -1 for never. |
| Blood moon enemy count | `BloodMoonEnemyCount` | How many zombies a blood moon sends at each player at once. |

### 7 Days to Die: Land claims

8 settings in `serverconfig.xml`, shown under **Land claims** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Land claims per player | `LandClaimCount` | How many land claim blocks one player can place. |
| Land claim size | `LandClaimSize` | How big the area is that a land claim block protects, in blocks. |
| Land claim dead zone | `LandClaimDeadZone` | How close another player's land claim can be to yours, in blocks. |
| Land claim expiry (days) | `LandClaimExpiryTime` | How many real days a land claim stays protected after its owner was last on. |
| Land claim decay | `LandClaimDecayMode` | How a land claim loses its protection once its owner has been away. Choices: `0` (Slow: linear decay), `1` (Fast: exponential decay), `2` (None: no decay, stays protected). |
| Claim durability: owner online | `LandClaimOnlineDurabilityModifier` | How strong claimed blocks are while the owner is online. 0 makes them indestructible. |
| Claim durability: owner offline | `LandClaimOfflineDurabilityModifier` | How strong claimed blocks are while the owner is offline. 0 makes them indestructible. |
| Claim offline delay (minutes) | `LandClaimOfflineDelay` | How long after the owner leaves before the offline durability starts to apply. |

### 7 Days to Die: Performance

7 settings in `serverconfig.xml`, shown under **Performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Dynamic mesh | `DynamicMeshEnabled` | Keeps far-away buildings visible while their chunks are unloaded. Uses more memory. |
| Dynamic mesh: land claims only | `DynamicMeshLandClaimOnly` | Only builds the dynamic mesh around land claims, which saves memory. |
| Dynamic mesh: claim buffer | `DynamicMeshLandClaimBuffer` | How many chunks around a land claim the dynamic mesh covers. |
| Dynamic mesh: item cache | `DynamicMeshMaxItemCache` | How many mesh items the server keeps ready. More is faster but uses more memory. |
| Map chunks per player | `MaxUncoveredMapChunksPerPlayer` | How many map chunks one player may uncover. Lower it to keep the save small. |
| Reset unvisited chunks (days) | `MaxChunkAge` | How many in-game days an area must go unvisited before it returns to its original state. Land claims and bedrolls nearby protect it. -1 never resets it. |
| Save size limit (MB) | `SaveDataLimit` | The most disk space one world's save may use. -1 for no limit. |

### 7 Days to Die: Remote console

17 settings in `serverconfig.xml`, shown under **Remote console** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Telnet | `TelnetEnabled` | Turns on the remote console GodlyPanel uses to save and stop the game. Keep it on. |
| Telnet port | `TelnetPort` | The port of the remote console. It is only for the panel on this PC, so never open it in your router. |
| Telnet password | `TelnetPassword` | The remote console's password. Leave it empty if the console is not reachable from outside this PC. |
| Telnet failed logins allowed | `TelnetFailedLoginLimit` | How many wrong passwords are allowed before the sender is blocked. |
| Telnet block time (seconds) | `TelnetFailedLoginsBlocktime` | How long a sender is blocked after too many wrong passwords. |
| Web dashboard | `WebDashboardEnabled` | Turns on the game's own web page for watching and running the server. GodlyPanel doesn't need it. Newer versions of the game; older ones call it the web control panel. |
| Web dashboard port | `WebDashboardPort` | The port of the game's web page. Open it in your router only if you want people outside this PC to reach it. |
| Web dashboard address | `WebDashboardUrl` | The full address people use to reach the web dashboard (for example https://example.com:1234/), when it sits behind a reverse proxy. Leave empty to use the server's own address and the port above. |
| Draw the map for the web dashboard | `EnableMapRendering` | Makes the game turn the parts of the map players explore into pictures, which the web dashboard shows. It costs some CPU and disk, so leave it off if you don't use the dashboard. |
| Web control panel (older game versions) | `ControlPanelEnabled` | Turns on the game's own web page for running the server. GodlyPanel doesn't need it. Newer versions of the game use the web dashboard instead. |
| Web control panel port (older game versions) | `ControlPanelPort` | The port of the game's web page. |
| Web control panel password (older game versions) | `ControlPanelPassword` | The password of the game's web page. |
| Console window | `TerminalWindowEnabled` | Shows the game's own console window. Leave it off when the panel hides the window. |
| Admin file | `AdminFileName` | The file that lists the admins, in the save folder. |
| Hide command log | `HideCommandExecutionLog` | How much of the commands run in the console are kept out of the log. |
| Twitch permission level | `TwitchServerPermission` | The permission level a player needs to run Twitch integration. |
| Twitch during blood moons | `TwitchBloodMoonAllowed` | Whether Twitch actions may happen during a blood moon. |

## Subsistence

Subsistence keeps its settings in `UDKGame\Config\UDKDedServerSettings.ini` inside the server's install folder.

- `UDKDedServerSettings.ini`: The server's own options. The panel does not have explanations for this file yet.

Subsistence has no documented settings in the panel yet. The Settings tab shows what is in the file, using any comment the game wrote beside a line as its explanation, but nothing here is explained by the panel.

### Subsistence: Server

8 settings in `UDKDedServerSettings.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` in `[ColdGame.ColdDedServerSettings]` | The name shown in the in-game server list. 64 characters at most. |
| Description | `ServerDescription` in `[ColdGame.ColdDedServerSettings]` | A short text shown when a player clicks the server in the list. 256 characters at most. |
| Hosted by | `HostedByName` in `[ColdGame.ColdDedServerSettings]` | The name shown in the server list as the one running the server. 64 characters at most. |
| Password | `Password` in `[ColdGame.ColdDedServerSettings]` | What players must type to join. Leave empty to let anyone join. |
| Admin password | `AdminPassword` in `[ColdGame.ColdDedServerSettings]` | The password admins use to sign in to the server from inside the game. |
| Max players | `MaxPlayers` in `[ColdGame.ColdDedServerSettings]` | The most players that can be on at once, from 1 to 32. |
| Save slot | `ProfileId` in `[ColdGame.ColdDedServerSettings]` | The server can keep five separate saves; this picks which one it uses, from 1 to 5. |
| Mods | `Mods` in `[ColdGame.ColdDedServerSettings]` | The mods to run, separated by commas. Each is either a mod's id or a Steam Workshop item number (the number at the end of its Workshop page address). Workshop mods are downloaded and updated every time the server starts. |

### Subsistence: World

5 settings in `UDKDedServerSettings.ini`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Difficulty | `Difficulty` in `[ColdGame.ColdDedServerSettings]` | How hard the game is. Choices: `easy` (Easy), `normal` (Normal), `hardcore` (Hardcore). |
| Days per year | `DaysPerYear` in `[ColdGame.ColdDedServerSettings]` | How many in-game days make a year. Fewer means the seasons change faster. Choices: `12`, `24`, `36`, `48`, `60`, `90`, `120`, `200`, `365`. Another value can be typed. |
| Start month | `MonthOverride` in `[ColdGame.ColdDedServerSettings]` | Starts the server in a particular month instead of the one stored in the save. The game puts this back to -1 after it starts, and uses the save's month from then on. Choices: `-1` (Use the save's month), `0` (January), `1` (February), `2` (March), `3` (April), `4` (May), `5` (June), `6` (July), `7` (August), `8` (September), `9` (October), `10` (November), `11` (December). |
| Hunters | `HuntersEnabled` in `[ColdGame.ColdDedServerSettings]` | Turns on the hunters, the enemies that go after players. |
| Hunter attacks | `HunterAttacks` in `[ColdGame.ColdDedServerSettings]` | How often the hunters attack. Choices: `0` (Normal attacks), `1` (Revenge attacks only), `2` (No attacks). |

### Subsistence: Players and bases

6 settings in `UDKDedServerSettings.ini`, shown under **Players and bases** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Players can hurt each other | `PvPDamage` in `[ColdGame.ColdDedServerSettings]` | Lets players damage other players. |
| Players can damage other bases | `PlayersCanDamagePlayerBases` in `[ColdGame.ColdDedServerSettings]` | Lets players damage buildings other players placed. |
| Players can open other bases' storage | `PlayersCanAccessEnemyPlayerBaseItems` in `[ColdGame.ColdDedServerSettings]` | Lets players use another base's storage chests, refineries and similar items. Doors and windows are not affected. |
| Protect bases while their owners are offline | `OfflineBaseProtection` in `[ColdGame.ColdDedServerSettings]` | Keeps a base from taking damage while nobody from it is online (within range of a base control unit or range extender). Protection starts 10 minutes after the last member signs off. It does not stop base decay. |
| Hours offline before a base decays | `NumPlayerOfflineHoursBeforeBaseDecay` in `[ColdGame.ColdDedServerSettings]` | How many real hours a player and their team can be away before their base starts to decay. 0 means bases never decay. 96 is four days. A limit is recommended for public servers so old bases get cleared. |
| Allow buildings to overlap | `AllowBuildableClipping` in `[ColdGame.ColdDedServerSettings]` | Lets players place buildings so they clip through each other. |

## RuneScape: Dragonwilds

RuneScape: Dragonwilds keeps its settings in `RSDragonwilds\Saved\Config\WindowsServer\DedicatedServer.ini` inside the server's install folder.

- `DedicatedServer.ini`: The server's name, the world password, the admin password and the world's save name.

The file also holds an owner ID and a server GUID. The game makes them itself on its first start, so the panel hides them. Only four settings are explained so far.

### Dragonwilds: General

4 settings in `DedicatedServer.ini`, shown under **General** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server Name | `ServerName` in `[/Script/Dominion.DedicatedServerSettings]` | The name shown for this server in the in-game server browser. |
| World Password | `WorldPassword` in `[/Script/Dominion.DedicatedServerSettings]` | Password players must enter to join the server. Leave blank for a public server. |
| Admin Password | `AdminPassword` in `[/Script/Dominion.DedicatedServerSettings]` | Password required to gain admin privileges in-game. |
| Default World/Save Name | `DefaultWorldName` in `[/Script/Dominion.DedicatedServerSettings]` | Name of the save file this server loads/creates. |

## Windrose

Windrose keeps its settings in `R5\ServerDescription.json` inside the server's install folder.

- `ServerDescription.json`: The server's name, password, player limit, region and how players connect.

The file also holds identifiers the game makes itself (a version, a deployment, a persistent server ID and a world island ID). The panel hides them so they are not changed by accident.

### Windrose: General

6 settings in `ServerDescription.json`, shown under **General** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server Name | `ServerDescription_Persistent.ServerName` | The name shown for this server in the in-game server browser. |
| Password Protected | `ServerDescription_Persistent.IsPasswordProtected` | Requires players to enter a password to join. |
| Server Password | `ServerDescription_Persistent.Password` | Password players must enter to join, when password protection is enabled. |
| Max Players | `ServerDescription_Persistent.MaxPlayerCount` | Maximum number of players allowed on the server. |
| Server Region | `ServerDescription_Persistent.UserSelectedRegion` | Region selected for this server, used for matchmaking/latency. |
| Auto-Load Latest Backup If Save Is Broken | `ServerDescription_Persistent.AutoLoadLatestBackupIfHasBroken` | Automatically restores the most recent backup if the current save fails to load. |

### Windrose: Networking

5 settings in `ServerDescription.json`, shown under **Networking** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| P2P Proxy Address | `ServerDescription_Persistent.P2pProxyAddress` | Address of the peer-to-peer relay/proxy used for NAT traversal. |
| Use Direct Connection | `ServerDescription_Persistent.UseDirectConnection` | Connects players directly to this server's address instead of relaying through the P2P proxy. |
| Direct Connection Address | `ServerDescription_Persistent.DirectConnectionServerAddress` | Public address players connect to directly, when direct connection is enabled. |
| Direct Connection Port | `ServerDescription_Persistent.DirectConnectionServerPort` | Port players connect to directly, when direct connection is enabled. |
| Direct Connection Proxy Address | `ServerDescription_Persistent.DirectConnectionProxyAddress` | Proxy address used as a fallback for direct connections. |

## Valheim

Valheim has no settings file. A dedicated server is set up entirely by the arguments on the command that starts it, so its settings are on the Settings tab under **Launch options**.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#valheim).

## Palworld

Palworld keeps its settings in `Pal\Saved\Config\WindowsServer\PalWorldSettings.ini` inside the server's install folder. The file holds them all on one `OptionSettings=(...)` line; the panel shows each option as its own setting and writes the line back together.

- `PalWorldSettings.ini`: The server's name, passwords, ports, rates and rules.
- Launch arguments: they are in the start script. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#palworld).

Palworld has many more options than are listed here. Anything without an explanation is still shown.

### Palworld: General

11 settings in `PalWorldSettings.ini`, shown under **General** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server Name | `ServerName` | The name shown for this server in the in-game server browser. |
| Server Description | `ServerDescription` | Short description shown in the server browser. |
| Server Password | `ServerPassword` | Password players must enter to join the server. |
| Admin Password | `AdminPassword` | Password required to gain admin privileges in-game. |
| Public IP | `PublicIP` | Public IP address advertised for this server. |
| Public Port | `PublicPort` | Public port advertised for this server. |
| Max Players | `ServerPlayerMaxNum` | Maximum number of players allowed on the server. |
| Max Co-op Players | `CoopPlayerMaxNum` | Maximum players allowed in a single co-op guild/base. |
| Enable RCON | `RCONEnabled` | Enables the remote console (RCON) interface. |
| RCON Port | `RCONPort` | Network port the RCON interface listens on. |
| RCON Admin Password | `AdminRconPassword` | Password required to authenticate to the RCON interface. |

### Palworld: Gameplay

50 settings in `PalWorldSettings.ini`, shown under **Gameplay** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Difficulty | `Difficulty` | Overall server difficulty preset. Choices: `None`, `Casual`, `Normal`, `Hard`. Another value can be typed. |
| Day Speed Rate | `DayTimeSpeedRate` | Multiplies how fast in-game daytime passes. |
| Night Speed Rate | `NightTimeSpeedRate` | Multiplies how fast in-game nighttime passes. |
| Experience Rate | `ExpRate` | Multiplies experience gained by players. |
| Pal Capture Rate | `PalCaptureRate` | Multiplies the chance of successfully capturing a Pal. |
| Pal Spawn Rate | `PalSpawnNumRate` | Multiplies how many Pals spawn in the world. |
| Pal Damage Dealt Rate | `PalDamageRateAttack` | Multiplies damage dealt by Pals. |
| Pal Damage Taken Rate | `PalDamageRateDefense` | Multiplies damage taken by Pals. |
| Player Damage Dealt Rate | `PlayerDamageRateAttack` | Multiplies damage dealt by players. |
| Player Damage Taken Rate | `PlayerDamageRateDefense` | Multiplies damage taken by players. |
| Player Hunger Decrease Rate | `PlayerStomachDecreaceRate` | Multiplies how fast player hunger depletes. |
| Player Stamina Decrease Rate | `PlayerStaminaDecreaceRate` | Multiplies how fast player stamina depletes. |
| Player HP Regen Rate | `PlayerAutoHPRegeneRate` | Multiplies how fast player health regenerates. |
| Player HP Regen Rate (Sleeping) | `PlayerAutoHpRegeneRateInSleep` | Multiplies how fast player health regenerates while sleeping. |
| Base Damage Rate | `BuildObjectDamageRate` | Multiplies damage dealt to player bases/structures. |
| Base Deterioration Rate | `BuildObjectDeteriorationDamageRate` | Multiplies how fast unmaintained base structures deteriorate. |
| Gathering Drop Rate | `CollectionDropRate` | Multiplies resources gathered from collectible nodes. |
| Gathering Node Health Rate | `CollectionObjectHpRate` | Multiplies the health of gatherable resource nodes. |
| Gathering Node Respawn Rate | `CollectionObjectRespawnSpeedRate` | Multiplies how fast gathered resource nodes respawn. |
| Enemy Drop Rate | `EnemyDropItemRate` | Multiplies item drop chance from defeated enemies. |
| Death Penalty | `DeathPenalty` | What players lose on death (none, item, all, everything including base). Choices: `None` (None: lose nothing), `Item` (Drop items (not equipment)), `ItemAndEquipment` (Drop items and equipment), `All` (Drop everything, including Pals). |
| Enable Player vs Player Damage | `bEnablePlayerToPlayerDamage` | Allows players to damage each other. |
| Enable Friendly Fire | `bEnableFriendlyFire` | Allows guild members to damage each other. |
| Enable Invader Enemies | `bEnableInvaderEnemy` | Enables random hostile invasions of player bases. |
| Enable Poop Pals | `bActiveUNKO` | Enables the poop-producing Pal mechanic (UNKO). |
| Enable Aim Assist (Controller) | `bEnableAimAssistPad` | Enables aim assist for controller/gamepad players. |
| Enable Aim Assist (Keyboard) | `bEnableAimAssistKeyboard` | Enables aim assist for keyboard/mouse players. |
| Max Dropped Items | `DropItemMaxNum` | Maximum number of dropped items kept in the world at once. |
| Dropped Item Lifetime (hrs) | `DropItemAliveMaxHours` | Hours a dropped item remains before disappearing. |
| Max Base Camps | `BaseCampMaxNum` | Maximum number of base camps allowed server-wide. |
| Max Pal Workers Per Base | `BaseCampWorkerMaxNum` | Maximum number of Pals that can work at a single base camp. |
| Max Players Per Guild | `GuildPlayerMaxNum` | Maximum number of players allowed in a single guild. |
| Auto-Reset Guilds With No Online Players | `AutoResetGuildNoOnlinePlayers` | Automatically disbands/resets guilds that have had no online members for a while. |
| Auto-Reset Guild Timer (hrs) | `AutoResetGuildTimeNoOnlinePlayers` | Hours with no online guild members before an auto-reset triggers. |
| Pal Work Speed Rate | `WorkSpeedRate` | Multiplies how fast working Pals complete tasks. |
| Auto-Save Interval (min) | `AutoSaveSpan` | Minutes between automatic world saves. |
| Multiplayer Enabled | `bIsMultiplay` | Enables multiplayer on this server (should stay on for a dedicated server). |
| PvP Enabled | `bIsPvP` | Turns on player-vs-player combat server-wide. |
| Hardcore Mode | `bHardcore` | Enables permadeath-style hardcore rules. |
| Pals Can Be Lost On Death | `bPalLost` | Allows Pals to be permanently lost if their owner dies. |
| Allow Character Recreation In Hardcore | `CharacterRecreateInHardcore` | Allows creating a new character after a hardcore death instead of being locked out. |
| Allow Character Recreation In Hardcore | `bCharacterRecreateInHardcore` | Allows creating a new character after a hardcore death instead of being locked out. |
| Enable Build Area Limit | `bBuildAreaLimit` | Restricts building to a limited area around base camps. |
| Item Weight Rate | `ItemWeightRate` | Multiplies the carry weight of items. |
| Max Building Count | `MaxBuildingLimitNum` | Maximum number of buildable objects allowed server-wide. |
| Pawn Network Cull Distance | `ServerReplicatePawnCullDistance` | Distance beyond which characters/creatures stop being networked to a client, for performance. |
| Allow Global Palbox Export | `bAllowGlobalPalboxExport` | Allows exporting Pals from any Palbox to any other, server-wide. |
| Allow Global Palbox Import | `bAllowGlobalPalboxImport` | Allows importing Pals into any Palbox from any other, server-wide. |
| Equipment Durability Damage Rate | `EquipmentDurabilityDamageRate` | Multiplies how fast equipment durability depletes. |
| Item Container Sync Interval | `ItemContainerForceMarkDirtyInterval` | How often item containers are force-synced to prevent desync, in seconds. |

### Palworld: Admin

8 settings in `PalWorldSettings.ini`, shown under **Admin** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Show Player List | `bShowPlayerList` | Shows the connected player list to clients. |
| Chat Messages Per Minute Limit | `ChatPostLimitPerMinute` | Maximum chat messages a player can send per minute (spam protection). |
| Allowed Crossplay Platforms | `CrossplayPlatforms` | Platforms allowed to crossplay together on this server. |
| Use Backup Save Data | `bIsUseBackupSaveData` | Falls back to a backup save if the primary save fails to load. |
| Log Format | `LogFormatType` | Output format used for server logs. Choices: `Text` (Plain text), `Json` (JSON). |
| Supply Drop Interval (min) | `SupplyDropSpan` | Minutes between scheduled supply drop events. |
| Enable Predator Boss Pals | `EnablePredatorBossPal` | Enables the special Predator boss Pal variants. |
| Max Building Limit Rate | `MaxBuildingLimitNumRate` | Multiplies the server-wide building count limit. |

## Rust

Rust is set up with console variables ("convars"), named like `server.hostname`. The panel's start script puts some of them on the launch line, and the rest can go in `server\<identity>\cfg\server.cfg` (inside the server's install folder), one per line. A value on the launch line wins over the same one in `server.cfg`.

- `server.cfg`: Any console variable, one per line: its name, then its value (in quotes when it has spaces).
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#rust).

Rust does not make `server.cfg` until it is asked to (`server.writecfg` in the console), so the file may not exist yet. You can write one from the Settings tab.

### Rust: Server

9 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `server.hostname` | The name shown in the in-game server browser. |
| Description | `server.description` | The text under the name in the server browser. Write \n where you want a new line. |
| Website | `server.url` | A web address shown on the server's page in the browser. |
| Banner image | `server.headerimage` | The web address of a picture (512 by 256 pixels works best) shown at the top of the server's page. |
| Max players | `server.maxplayers` | The most players that can be on at once. |
| PvE (players can't hurt each other) | `server.pve` | Stops players from damaging each other. |
| Anti-cheat | `server.secure` | Easy Anti-Cheat. Leave it on for a public server. Choices: `true` (On (Easy Anti-Cheat)), `false` (Off). |
| Global chat | `server.globalchat` | Lets everyone read global chat. Turn off to make chat team-only. |
| Identity (folder name) | `server.identity` | The name of the folder this server keeps its world and settings in, under server\. Don't change it unless you also move the folder. |

### Rust: World

4 settings in `server.cfg`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Map size | `server.worldsize` | The size of the map in metres, from 1000 to 6000. Bigger maps take longer to make and use more memory. With the seed it decides what the map looks like. |
| Map seed | `server.seed` | A number that decides what the map looks like. The same seed and size always give the same map. |
| Map type | `server.level` | Procedural Map makes a new map from the seed and size. The others are the game's fixed maps. Choices: `Procedural Map`, `Barren`, `HapisIsland`, `CraggyIsland`, `SavasIsland`, `SavasIsland_koth`. Another value can be typed. |
| Save every (seconds) | `server.saveinterval` | How often the world is saved on its own. Players lose at most this much if the server crashes. |

### Rust: Rules

6 settings in `server.cfg`, shown under **Rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Decay speed | `decay.scale` | How fast bases decay. 1 is normal; 0 turns decay off; 0.5 is half speed. |
| Upkeep | `decay.upkeep` | Bases need materials in a tool cupboard to keep from decaying. Turn off for no upkeep. |
| Building stability | `server.stability` | Buildings fall down if they aren't supported. Turn off to build anything anywhere. |
| Radiation | `server.radiation` | Turns radiation zones on or off. |
| Dropped item lifetime (seconds) | `server.itemdespawn` | How long an item left on the ground lasts before it disappears. |
| Instant crafting | `craft.instant` | Everything is made at once, with no waiting. |

### Rust: Network

8 settings in `server.cfg`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Bind address | `server.ip` | The network address the server listens on. 0.0.0.0 means every address on this PC. |
| Game port | `server.port` | The port players connect to (UDP). Change it from the server's Ports section so the panel can check for clashes. |
| Query port | `server.queryport` | The port the server list asks for details on (UDP). |
| Remote console address | `rcon.ip` | The address the remote console listens on. 127.0.0.1 keeps it to this PC, which is what GodlyPanel needs. |
| Remote console port | `rcon.port` | The port of the remote console (TCP). It is only for the panel on this PC, so never open it in your router. |
| Remote console password | `rcon.password` | The remote console's password. The panel keeps it in step when you change it from the server's Automation tab. |
| Remote console type | `rcon.web` | 1 uses the WebSocket remote console, 0 the classic one. GodlyPanel needs 0. |
| Rust+ app port | `app.port` | The port of the Rust+ phone app. -1 turns the app off. |

### Rust: Performance

1 setting in `server.cfg`, shown under **Performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server frame rate limit | `fps.limit` | The most updates a second the server runs. 30 to 60 is plenty; lower it to save CPU. |

## Project Zomboid

Project Zomboid keeps the server's options in `zomboid\Server\<name>.ini` inside the server's install folder, where `<name>` is the server's settings name (`servertest` by default). The game makes the file the first time the server starts.

- `servertest.ini`: The server's name, passwords, ports, gameplay rules, loot and building, safehouses, factions, saving, voice chat, Discord, moderation and mods.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#project-zomboid).

How the world itself plays (zombie numbers, loot, the speed of the seasons) is in `<name>_SandboxVars.lua`, which the Settings tab does not edit. Mods add their own options, which are not explained.

### Project Zomboid: Server

18 settings in `servertest.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `PublicName` | The name shown in the in-game server browser. |
| Description | `PublicDescription` | The text under the name in the server browser. Write \n where you want a new line. |
| Password | `Password` | What players type to join. Leave empty for a server anyone can join. |
| Max players | `MaxPlayers` | The most players that can be on at once. Each player uses a lot of memory, so raise it with care. |
| Open to anyone | `Open` | Anyone can join and a new account is made for them. Turn off to let only players you've added to the whitelist in. |
| List in the server browser | `Public` | Shows the server in the in-game server list. Off means players join by address. |
| Welcome message | `ServerWelcomeMessage` | A message shown to players when they join. Write `<LINE>` for a new line. |
| Add new players to the whitelist | `AutoCreateUserInWhiteList` | When the server isn't open, anyone who tries to join is added to the whitelist so you can approve them. |
| Accounts per Steam user | `MaxAccountsPerUser` | How many characters one Steam account may have on the server. 0 means no limit. |
| Allow special characters in names | `AllowNonAsciiUsername` | Lets usernames use letters outside the English alphabet. |
| Map | `Map` | The map(s) the server loads, separated by semicolons. Muldraugh, KY is the main map. |
| World seed | `Seed` | The seed the world is generated from. To change it for an existing world, put the new value here and delete map_worldgen.bin in the save folder. |
| Show coordinates | `ShowCoordinates` | Shows each player's coordinates in the lower right corner of their screen. |
| Turn off the scoreboard | `DisableScoreboard` | Turns off the players scoreboard. |
| Steam names on the scoreboard | `SteamScoreboard` | Shows players' Steam names and pictures in the players list. |
| Hide admins in the player list | `HideAdminsInPlayerList` | Keeps admins out of the list of players. |
| Reset ID (do not change) | `ResetID` | Tells the server whether it has had a soft reset. If it no longer matches a player's saved copy, they must make a new character. Back it up and leave it alone. |
| Server player ID (do not change) | `ServerPlayerID` | Tells a character apart from one made on another server or in single player. If it no longer matches, the player must make a new character. Back it up and leave it alone. |

### Project Zomboid: Network

18 settings in `servertest.ini`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game port | `DefaultPort` | The port players connect to (UDP). Change it from the server's Ports section so the panel can check for clashes. |
| Direct connection port | `UDPPort` | A second UDP port the game uses. Keep it one above the game port. |
| Steam port 1 | `SteamPort1` | A port Steam uses for its server list. The panel keeps it two above the game port. |
| Steam port 2 | `SteamPort2` | A second port Steam uses for its server list. The panel keeps it three above the game port. |
| Remote console port | `RCONPort` | The port of the remote console (TCP). It is only for the panel on this PC, so never open it in your router. |
| Remote console password | `RCONPassword` | The remote console's password. The panel keeps it in step when you change it from the server's Automation tab. |
| Open ports automatically (UPnP) | `UPnP` | Asks the router to open the server's ports. Many routers refuse, so open them yourself. |
| Valve Anti-Cheat | `SteamVAC` | Turns Valve Anti-Cheat on. |
| Ping limit | `PingLimit` | Players with a higher ping are removed. 0 means no limit. |
| Speed limit | `SpeedLimit` | The fastest a player may move before the server assumes they are cheating, from 10 to 150. The default is 70. |
| Kick fast players | `KickFastPlayers` | Removes players who move faster than the speed limit. |
| Check game files match | `DoLuaChecksum` | Removes players whose game files don't match the server's, which blocks most cheats and mismatched mods. |
| Refuse joins when overloaded | `DenyLoginOnOverloadedServer` | Turns players away while the server is struggling to keep up. |
| Login queue | `LoginQueueEnabled` | Lines players up to join one at a time, which keeps a busy server from stalling. |
| Login queue timeout (seconds) | `LoginQueueConnectTimeout` | How long a player at the front of the queue has to finish connecting. |
| Announced address | `server_browser_announced_ip` | The address shown in the server browser, for servers behind a router that has a different outside address. |
| Packets per player per second | `MaxPacketsPerSecond` | The most network packets the server will handle from each player each second, from 100 to 1000. Lower protects against floods, but too low kicks honest players. |
| Statistics update period (seconds) | `MultiplayerStatisticsPeriod` | How often the server updates its multiplayer statistics, from 0 to 10. 0 turns them off. |

### Project Zomboid: Gameplay

35 settings in `servertest.ini`, shown under **Gameplay** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Players can hurt each other (PvP) | `PVP` | Lets players injure and kill each other. |
| Pause when empty | `PauseEmpty` | Stops the game clock while nobody is connected, so the world waits for the next player. |
| Global chat | `GlobalChat` | Lets everyone read the global chat channel. |
| Chat channels | `ChatStreams` | The chat channels players can use, separated by commas. s is say, r is radio, a is admin, w is whisper, y is yell, sh is shout, f is faction, all is global. |
| Safety system | `SafetySystem` | Players can switch their own PvP on and off (their "safety"). Someone with their safety on can't be hurt by other players. |
| Show safety status | `ShowSafety` | Shows other players whether someone's safety is on. |
| Safety toggle time (seconds) | `SafetyToggleTimer` | How long a player must wait for their safety to change after they switch it. |
| Safety cooldown (seconds) | `SafetyCooldownTimer` | How long a player must wait before switching their safety again. |
| Spawn point | `SpawnPoint` | Where new characters appear, as x,y,z. 0,0,0 lets players pick. |
| Starting items | `SpawnItems` | Items given to a new character, separated by commas. |
| No fire | `NoFire` | Turns off fire, so nothing can burn. |
| Announce deaths | `AnnounceDeath` | Tells everyone in chat when a player dies. |
| Allow split screen | `AllowCoop` | Lets two players share one computer. |
| Sleeping allowed | `SleepAllowed` | Lets players sleep. |
| Sleeping needed | `SleepNeeded` | Players get tired and must sleep. |
| Knock-downs | `KnockedDownAllowed` | Lets a hit knock a player down. |
| Sneaking hides from players | `SneakModeHideFromOtherPlayers` | Players who sneak can't be seen by others at a distance. |
| Respawn at your own base | `PlayerRespawnWithSelf` | A dead player can come back at the place they last lived. |
| Respawn at a friend's base | `PlayerRespawnWithOther` | A dead player can come back at another player's place. |
| Players can bump | `PlayerBumpPlayer` | Players are knocked over when they run into each other. |
| Fast forward speed | `FastForwardMultiplier` | How fast time runs while every player is sleeping. |
| Show names on hover | `MouseOverToSeeDisplayName` | Players must point at someone to see their name. |
| Show usernames | `DisplayUserName` | Shows each player's username over their head. |
| Show character names | `ShowFirstAndLastName` | Shows each character's first and last name over their head. |
| Hide players behind you | `HidePlayersBehindYou` | Hides players who are out of your line of sight. |
| PvP melee damage (%) | `PVPMeleeDamageModifier` | How much damage melee attacks do to other players, as a percentage. |
| PvP firearm damage (%) | `PVPFirearmDamageModifier` | How much damage guns do to other players, as a percentage. |
| Melee while being hit | `PVPMeleeWhileHitReaction` | Lets a player hit again while they are staggering from being struck by another player. |
| Vehicle noise attraction | `CarEngineAttractionModifier` | How strongly engine noise draws zombies. 1 is normal. |
| Players on the map | `MapRemotePlayerVisibility` | Whether, and which, other players show on each player's in-game map. Choices: `1` (Hidden), `2` (Friends), `3` (Friends and nearby players), `4` (Everyone). |
| Safety disconnect delay (seconds) | `SafetyDisconnectDelay` | How long a player's character stays in the world after they disconnect while the safety system is on, from 0 to 60. |
| Move zombie control between players | `SwitchZombiesOwnershipEachUpdate` | Hands control of zombies to a different nearby player on every update, to spread the work between players. |
| Fast-forward leaves animals alone | `UltraSpeedDoesnotAffectToAnimals` | Keeps animals at normal speed when an admin speeds up the game. |
| Physics hit reactions | `UsePhysicsHitReaction` | Uses the physics hit reaction when a character is hit. |
| Mute invisible players on radio | `DisableRadioInvisible` | Stops radio transmissions from invisible players. |

### Project Zomboid: Loot and building

12 settings in `servertest.ini`, shown under **Loot and building** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Loot respawn (hours) | `HoursForLootRespawn` | How many hours before loot in containers is refilled. 0 means never. |
| Loot respawn: busy limit | `MaxItemsForLootRespawn` | Containers with more items than this aren't refilled. |
| Building stops loot respawn | `ConstructionPreventsLootRespawn` | Containers inside player buildings aren't refilled. |
| Items per container | `ItemNumbersLimitPerContainer` | The most items one container may hold. 0 means no limit. |
| Trash removes everything | `TrashDeleteAll` | Right-click Remove on trash deletes the whole pile, not just one item. |
| Remove corpses with cleanup | `RemovePlayerCorpsesOnCorpseRemoval` | Player corpses are removed along with zombie corpses. |
| Sledgehammers destroy buildings | `AllowDestructionBySledgehammer` | Lets players tear down walls and furniture with a sledgehammer. |
| Sledgehammers only in safehouses | `SledgehammerOnlyInSafehouse` | Players can only use the sledgehammer inside a safehouse they belong to. |
| Blood stain lifetime (days) | `BloodSplatLifespanDays` | How many days blood stains last. 0 means they stay forever. |
| No vehicle towing | `DisableVehicleTowing` | Turns off towing vehicles. |
| No trailer towing | `DisableTrailerTowing` | Turns off towing trailers. |
| No towing burnt vehicles | `DisableBurntTowing` | Turns off towing burnt-out vehicles. |

### Project Zomboid: Safehouses

14 settings in `servertest.ini`, shown under **Safehouses** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Players can claim safehouses | `PlayerSafehouse` | Lets any player claim a building as their safehouse. |
| Only admins claim safehouses | `AdminSafehouse` | Only admins can claim safehouses. |
| Others may enter | `SafehouseAllowTrepass` | People who aren't members can walk into a safehouse. |
| Fire in safehouses | `SafehouseAllowFire` | Fire can start and spread inside a safehouse. |
| Others may loot | `SafehouseAllowLoot` | People who aren't members can take things from a safehouse. |
| Respawn in a safehouse | `SafehouseAllowRespawn` | Members can choose to respawn in their safehouse after dying. |
| Days survived to claim | `SafehouseDaySurvivedToClaim` | How many days a character must have survived before they can claim a safehouse. |
| Safehouse expiry (hours) | `SafeHouseRemovalTime` | A player is removed from a safehouse they haven't visited for this many real hours. The default is 144 (six days). |
| Protect only while the owner is away | `DisableSafehouseWhenPlayerConnected` | A safehouse's protection only applies while its members are offline. |
| Safehouses stop loot respawning | `SafehousePreventsLootRespawn` | Items don't respawn inside buildings players have claimed as a safehouse. |
| Claim non-residential buildings | `SafehouseAllowNonResidential` | Lets players claim buildings that aren't homes, such as shops. |
| Disguises don't work in safehouses | `SafehouseDisableDisguises` | Turns off name disguises inside safehouses. |
| Biggest safehouse area | `MaxSafezoneSize` | The largest area, in squares, a safehouse may cover. The default is 20000. |
| Safehouse is ordinary while its owner is on | `DisableSafehouseWhenOwnerConnected` | While an owner of the safehouse is connected it acts like a normal house, so it is only secure when its owners are offline. |

### Project Zomboid: Factions

7 settings in `servertest.ini`, shown under **Factions** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Factions | `Faction` | Lets players form factions. |
| Days survived to start a faction | `FactionDaySurvivedToCreate` | How many days a character must have survived before they can make a faction. |
| Players needed for a faction tag | `FactionPlayersRequiredForTag` | How many members a faction needs before it may show a tag over their heads. |
| War | `War` | Turns on the war feature between factions. |
| War start delay (seconds) | `WarStartDelay` | How long before a war starts, at least 60. |
| War length (seconds) | `WarDuration` | How long a war lasts, at least 60. |
| Safehouse hit points in a war | `WarSafehouseHitPoints` | The limit of hit points a safehouse has during a war. |

### Project Zomboid: Saving

5 settings in `servertest.ini`, shown under **Saving** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Save every (minutes) | `SaveWorldEveryMinutes` | How often the world is saved on its own. 0 means only when the server stops. |
| Backups to keep | `BackupsCount` | How many of the game's own backups are kept. |
| Back up when the server starts | `BackupsOnStart` | Makes one of the game's own backups every time the server starts. |
| Back up after a game update | `BackupsOnVersionChange` | Makes one of the game's own backups when the game's version changes. |
| Back up every (minutes) | `BackupsPeriod` | How often the game makes its own backup. 0 means never. |

### Project Zomboid: Voice

4 settings in `servertest.ini`, shown under **Voice** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Voice chat | `VoiceEnable` | Turns in-game voice chat on. |
| Voice: full volume within | `VoiceMinDistance` | Players closer than this hear each other at full volume. |
| Voice: audible up to | `VoiceMaxDistance` | Players further apart than this can't hear each other. |
| Voice: sounds from where they are | `Voice3D` | Voices come from the direction of the speaker. |

### Project Zomboid: Discord

8 settings in `servertest.ini`, shown under **Discord** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Discord chat bridge | `DiscordEnable` | Sends the game's chat to a Discord channel. |
| Discord bot token | `DiscordToken` | The secret token of the Discord bot. |
| Discord channel name | `DiscordChannel` | The name of the channel the chat goes to. |
| Discord channel ID | `DiscordChannelID` | The ID of the channel the chat goes to. |
| Discord chat channel name | `DiscordChatChannel` | The name of the Discord channel the in-game chat is sent to. |
| Discord log channel name | `DiscordLogChannel` | The name of the Discord channel the server's logs are sent to. |
| Discord commands channel name | `DiscordCommandChannel` | The name of the Discord channel commands are taken from. |
| Slack webhook address | `WebhookAddress` | The Slack incoming webhook address the server posts to. |

### Project Zomboid: Moderation

22 settings in `servertest.ini`, shown under **Moderation** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allowed player commands | `ClientCommandFilter` | Commands players may use in chat, as a filter list. |
| Actions to log | `ClientActionLogs` | Which player actions are written to the admin log. |
| Log perk changes | `PerkLogs` | Writes players' perk changes to the admin log. |
| Announce kicks and bans | `BanKickGlobalSound` | Plays a sound for everyone when a player is kicked or banned. |
| Radios off for staff | `DisableRadioStaff` | Staff can't use radios. |
| Radios off for admins | `DisableRadioAdmin` | Admins can't use radios. |
| Radios off for game masters | `DisableRadioGM` | Game masters can't use radios. |
| Radios off for overseers | `DisableRadioOverseer` | Overseers can't use radios. |
| Radios off for moderators | `DisableRadioModerator` | Moderators can't use radios. |
| Radios off for observers | `DisableRadioObserver` | Observers can't use radios. |
| Log PVP to admin chat | `PVPLogToolChat` | Shows player-versus-player fights in the admins' chat. |
| Log PVP to a file | `PVPLogToolFile` | Writes player-versus-player fights to a log file. |
| Name disguises | `UsernameDisguises` | Lets players hide their name above their head with a mask or similar. |
| Hide disguised names | `HideDisguisedUserName` | Hides the name of a disguised player in the scoreboard and chat as well. |
| Remove from the whitelist on death | `DropOffWhiteListAfterDeath` | Takes a player's account off the whitelist when they die, so on a closed server they can't make a new character. |
| Announce animal deaths | `AnnounceAnimalDeath` | Posts a message in the chat every time an animal dies. |
| Banned words file | `BadWordListFile` | The file listing words that aren't allowed in chat, one per line. |
| Allowed words file | `GoodWordListFile` | The file listing words that are allowed even though they contain a banned word, one per line. |
| When someone uses a banned word | `BadWordPolicy` | What happens to a player who writes a banned word in chat. Choices: `1` (Ban them), `2` (Kick them), `3` (Only record it in the database), `4` (Mute them). |
| Banned word replacement | `BadWordReplacement` | The text shown in place of a banned word. |
| Longest chat message | `ChatMessageCharacterLimit` | The most characters a chat message may have, from 64 to 1024. |
| Chat slow mode (seconds) | `ChatMessageSlowModeTime` | How many seconds a player must wait between chat messages, from 1 to 30. |

### Project Zomboid: Anti-cheat

10 settings in `servertest.ini`, shown under **Anti-cheat** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Anti-cheat: safety system | `AntiCheatSafety` | How the server reacts to safety-system cheating. Leave at the game's default unless you know what a level does. |
| Anti-cheat: speed | `AntiCheatSpeed` | How the server reacts to a character moving too fast. Leave at the game's default unless you know what a level does. |
| Anti-cheat: walking through walls | `AntiCheatNoClip` | How the server reacts to a character passing through solid objects. Leave at the game's default unless you know what a level does. |
| Anti-cheat: hits | `AntiCheatHit` | How the server reacts to impossible hits. Leave at the game's default unless you know what a level does. |
| Anti-cheat: bad packets | `AntiCheatPacketException` | How the server reacts to broken network packets. Leave at the game's default unless you know what a level does. |
| Anti-cheat: permissions | `AntiCheatPermission` | How the server reacts to a player using powers they don't have. Leave at the game's default unless you know what a level does. |
| Anti-cheat: experience | `AntiCheatXP` | How the server reacts to impossible experience gains. Leave at the game's default unless you know what a level does. |
| Anti-cheat: safehouses | `AntiCheatSafeHouse` | How the server reacts to safehouse cheating. Leave at the game's default unless you know what a level does. |
| Anti-cheat: players | `AntiCheatPlayer` | How the server reacts to player-data cheating. Leave at the game's default unless you know what a level does. |
| Anti-cheat: file check | `AntiCheatChecksum` | How the server reacts to a player whose game files don't match. Leave at the game's default unless you know what a level does. |

### Project Zomboid: Mods

2 settings in `servertest.ini`, shown under **Mods** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Mods | `Mods` | The mod IDs the server uses, separated by semicolons. Mods have no explanations here. Add them under the Mods tab. |
| Steam Workshop items | `WorkshopItems` | The Workshop item numbers the server downloads, separated by semicolons. Mods have no explanations here. |

## V Rising

V Rising keeps the server's options in `save-data\Settings\ServerHostSettings.json` inside the server's install folder.

- `ServerHostSettings.json`: The server's name, passwords, ports, listing, saves and player limits.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#v-rising).

The rules of the world itself (clan size, blood drain, castle rules and similar) are in `ServerGameSettings.json`, which the game makes the first time it runs. The Settings tab does not edit that file.

### V Rising: Server

9 settings in `ServerHostSettings.json`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `Name` | The name shown in the in-game server list. |
| Description | `Description` | A few lines shown under the name in the server list. |
| Password | `Password` | What players type to join. Leave empty for a server anyone can join. |
| Max players | `MaxConnectedUsers` | The most players that can be on at once. |
| Admin slots | `MaxConnectedAdmins` | Extra slots above the max players that only admins can use. |
| Save name | `SaveName` | The folder the world is saved in. A new name starts a new world; the old one is kept. |
| List on Steam | `ListOnSteam` | Shows the server in the Steam server list. |
| List on Epic | `ListOnEOS` | Shows the server in the Epic Online Services server list, so other platforms can find it. |
| Anti-cheat | `Secure` | Turns anti-cheat on. Players need it on to join. |

### V Rising: Network

4 settings in `ServerHostSettings.json`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game port | `Port` | The port players connect to (UDP). Change it from the server's Ports section so the panel can check for clashes. |
| Query port | `QueryPort` | The port the server list asks for details on (UDP). |
| Bind address | `BindIpAddress` | The network address the server listens on. Leave empty to use every address. |
| Server speed (ticks/sec) | `ServerFps` | How many times a second the game world updates. Higher is smoother but heavier on the CPU. |

### V Rising: World

4 settings in `ServerHostSettings.json`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game rules preset | `GameSettingsPreset` | A named set of world rules from the game, such as StandardPvP. Leave empty to use the game's default. Choices: empty (the game's default), `StandardPvE` (Standard PvE), `StandardPvP` (Standard PvP), `StandardPvP_NoSiege` (Standard PvP No Siege), `StandardPvP_WeekendSiege` (Standard PvP Weekend Siege), `StandardPvP_DailySiege` (Standard PvP Daily Siege), `SoloPvP` (Solo PvP), `DuoPvP` (Duo PvP), `DuoPvP_NoSiege` (Duo PvP No Siege), `DuoPvP_WeekendSiege` (Duo PvP Weekend Siege), `DuoPvP_DailySiege` (Duo PvP Daily Siege), `TrioPvP` (Trio PvP), `TrioPvP_NoSiege` (Trio PvP No Siege), `TrioPvP_WeekendSiege` (Trio PvP Weekend Siege), `TrioPvP_DailySiege` (Trio PvP Daily Siege), `HardcorePvP` (Hardcore PvP), `HardcoreDuoPvP` (Hardcore Duo PvP), `HardcoreTrioPvP` (Hardcore Trio PvP), `Level30PvE` (Level 30 PvE), `Level30PvP` (Level 30 PvP), `Level40PvE` (Level 40 PvE), `Level40PvP` (Level 40 PvP), `Level50PvE` (Level 50 PvE), `Level50PvP` (Level 50 PvP), `Level60PvE` (Level 60 PvE), `Level60PvP` (Level 60 PvP), `Level70PvE` (Level 70 PvE), `Level70PvP` (Level 70 PvP), `Level80PvE` (Level 80 PvE), `Level80PvP` (Level 80 PvP), `Level90PvE` (Level 90 PvE), `Level90PvP` (Level 90 PvP). Another value can be typed. |
| Difficulty preset | `GameDifficultyPreset` | A named difficulty from the game. Leave empty for the game's default. Choices: `Difficulty_Easy` (Easy), `Difficulty_Normal` (Normal), `Difficulty_Brutal` (Brutal). Another value can be typed. |
| Debug events: admins only | `AdminOnlyDebugEvents` | Only admins may trigger debug events. |
| Debug events: off | `DisableDebugEvents` | Turns debug events off for everybody. |

### V Rising: Saving

3 settings in `ServerHostSettings.json`, shown under **Saving** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Autosaves to keep | `AutoSaveCount` | How many autosaves are kept before the oldest is overwritten. |
| Autosave every (seconds) | `AutoSaveInterval` | How often the world is saved on its own. |
| Compress saves | `CompressSaveFiles` | Makes the save files smaller, at a little extra CPU cost when saving. |

### V Rising: Remote console

4 settings in `ServerHostSettings.json`, shown under **Remote console** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Remote console | `Rcon.Enabled` | Turns on the game's remote console. GodlyPanel does not use it for V Rising (the game has no stop command on it), so leave it off unless you have another tool. |
| Remote console port | `Rcon.Port` | The port of the remote console. |
| Remote console password | `Rcon.Password` | The remote console's password. |
| Web API | `API.Enabled` | Turns on the game's web API for metrics. |

## Sons of the Forest

Sons of the Forest keeps its settings in `userdata\dedicatedserver.cfg` inside the server's install folder. The file is JSON even though it is called `.cfg`.

- `dedicatedserver.cfg`: The server's name, password, ports, saves and the rules of the game, including the custom game mode rules.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#sons-of-the-forest).

### Sons of the Forest: Server

4 settings in `dedicatedserver.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` | The name shown in the in-game server list. |
| Password | `Password` | What players type to join. Leave empty for a server anyone can join. |
| Max players | `MaxPlayers` | The most players that can be on at once. |
| Local network only | `LanOnly` | Only players on your own network can find and join. Turn off to play over the internet. |

### Sons of the Forest: Network

5 settings in `dedicatedserver.cfg`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Bind address | `IpAddress` | The network address the server listens on. 0.0.0.0 means every address on this PC. |
| Game port | `GamePort` | The port players connect to (UDP). Change it from the server's Ports section so the panel can check for clashes. |
| Query port | `QueryPort` | The port the server list asks for details on (UDP). |
| Blob sync port | `BlobSyncPort` | A third port the game uses to send world data to players (UDP). The panel keeps it two above the game port. |
| Skip the reachability test | `SkipNetworkAccessibilityTest` | The game normally checks the server can be reached from the internet before it starts listening. Skipping it lets the server start on a network where that check fails. |

### Sons of the Forest: Game

7 settings in `dedicatedserver.cfg`, shown under **Game** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game mode | `GameMode` | The rules for a new world. Custom uses the custom settings in this file. Choices: `Normal`, `Hard`, `HardSurvival` (Hard survival), `Peaceful`, `Custom` (Custom (uses the custom settings)). |
| On start | `SaveMode` | Whether the server continues the existing save or begins a new one. Choices: `Continue` (Continue the existing save), `New` (Start a new save). |
| Save slot | `SaveSlot` | Which of the save slots (1 to 30) the server uses. |
| Autosave every (seconds) | `SaveInterval` | How often the world is saved on its own. |
| Day speed while empty | `IdleDayCycleSpeed` | How fast the in-game day passes while nobody is connected. 0 freezes time. |
| Frame rate while empty | `IdleTargetFramerate` | How many updates a second the server runs while nobody is connected. Lower saves CPU. |
| Frame rate while in use | `ActiveTargetFramerate` | How many updates a second the server runs while players are connected. |

### Sons of the Forest: Logs

3 settings in `dedicatedserver.cfg`, shown under **Logs** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Write log files | `LogFilesEnabled` | Writes the server's log to a file, which the panel's Logs tab reads. |
| Timestamp in log names | `TimestampLogFilenames` | Puts the date and time in each log file's name, so every run gets its own file. |
| Timestamp on each line | `TimestampLogEntries` | Puts the time at the start of every log line. |

## Core Keeper

The panel sets Core Keeper up from the arguments on the command that starts it, so its settings on the Settings tab are the **Launch options**. It has no settings file in the panel yet.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#core-keeper).

## Satisfactory

Satisfactory is set up from inside the game (the Server Manager screen, with the server's address and port) and by a few launch arguments, which are the **Launch options** on the Settings tab. It has no settings file in the panel.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#satisfactory).

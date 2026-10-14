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
- [Abiotic Factor](#abiotic-factor)
- [Don't Starve Together](#dont-starve-together)
- [Icarus](#icarus)
- [SCUM](#scum)
- [StarRupture](#starrupture)
- [Unturned](#unturned)

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

60 settings in `ServerSettings.ini`, shown under **PvP Rules & Schedule** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| PvP Enabled | `PVPEnabled` in `[ServerSettings]` | Turns on player-vs-player combat server-wide. |
| PvP on Monday | `PVPEnabledMonday` in `[ServerSettings]` | Allows player-versus-player combat on Monday when PvP is limited to the schedule. |
| PvP starts on Monday | `PVPTimeMondayStart` in `[ServerSettings]` | The time PvP starts on Monday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm). |
| PvP ends on Monday | `PVPTimeMondayEnd` in `[ServerSettings]` | The time PvP ends on Monday, written the same way (2200 is 10 pm). |
| PvP on Tuesday | `PVPEnabledTuesday` in `[ServerSettings]` | Allows player-versus-player combat on Tuesday when PvP is limited to the schedule. |
| PvP starts on Tuesday | `PVPTimeTuesdayStart` in `[ServerSettings]` | The time PvP starts on Tuesday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm). |
| PvP ends on Tuesday | `PVPTimeTuesdayEnd` in `[ServerSettings]` | The time PvP ends on Tuesday, written the same way (2200 is 10 pm). |
| PvP on Wednesday | `PVPEnabledWednesday` in `[ServerSettings]` | Allows player-versus-player combat on Wednesday when PvP is limited to the schedule. |
| PvP starts on Wednesday | `PVPTimeWednesdayStart` in `[ServerSettings]` | The time PvP starts on Wednesday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm). |
| PvP ends on Wednesday | `PVPTimeWednesdayEnd` in `[ServerSettings]` | The time PvP ends on Wednesday, written the same way (2200 is 10 pm). |
| PvP on Thursday | `PVPEnabledThursday` in `[ServerSettings]` | Allows player-versus-player combat on Thursday when PvP is limited to the schedule. |
| PvP starts on Thursday | `PVPTimeThursdayStart` in `[ServerSettings]` | The time PvP starts on Thursday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm). |
| PvP ends on Thursday | `PVPTimeThursdayEnd` in `[ServerSettings]` | The time PvP ends on Thursday, written the same way (2200 is 10 pm). |
| PvP on Friday | `PVPEnabledFriday` in `[ServerSettings]` | Allows player-versus-player combat on Friday when PvP is limited to the schedule. |
| PvP starts on Friday | `PVPTimeFridayStart` in `[ServerSettings]` | The time PvP starts on Friday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm). |
| PvP ends on Friday | `PVPTimeFridayEnd` in `[ServerSettings]` | The time PvP ends on Friday, written the same way (2200 is 10 pm). |
| PvP on Saturday | `PVPEnabledSaturday` in `[ServerSettings]` | Allows player-versus-player combat on Saturday when PvP is limited to the schedule. |
| PvP starts on Saturday | `PVPTimeSaturdayStart` in `[ServerSettings]` | The time PvP starts on Saturday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm). |
| PvP ends on Saturday | `PVPTimeSaturdayEnd` in `[ServerSettings]` | The time PvP ends on Saturday, written the same way (2200 is 10 pm). |
| PvP on Sunday | `PVPEnabledSunday` in `[ServerSettings]` | Allows player-versus-player combat on Sunday when PvP is limited to the schedule. |
| PvP starts on Sunday | `PVPTimeSundayStart` in `[ServerSettings]` | The time PvP starts on Sunday, written as hours and minutes on a 24-hour clock without a colon (1800 is 6 pm). |
| PvP ends on Sunday | `PVPTimeSundayEnd` in `[ServerSettings]` | The time PvP ends on Sunday, written the same way (2200 is 10 pm). |
| Building damage on Monday | `PVPBuildingDamageEnabledMonday` in `[ServerSettings]` | Allows players to damage each other's buildings on Monday when building damage is limited to the schedule. |
| Building damage starts on Monday | `PVPBuildingDamageTimeMondayStart` in `[ServerSettings]` | The time building damage starts on Monday, written as hours and minutes without a colon (1800 is 6 pm). |
| Building damage ends on Monday | `PVPBuildingDamageTimeMondayEnd` in `[ServerSettings]` | The time building damage ends on Monday, written the same way. |
| Building damage on Tuesday | `PVPBuildingDamageEnabledTuesday` in `[ServerSettings]` | Allows players to damage each other's buildings on Tuesday when building damage is limited to the schedule. |
| Building damage starts on Tuesday | `PVPBuildingDamageTimeTuesdayStart` in `[ServerSettings]` | The time building damage starts on Tuesday, written as hours and minutes without a colon (1800 is 6 pm). |
| Building damage ends on Tuesday | `PVPBuildingDamageTimeTuesdayEnd` in `[ServerSettings]` | The time building damage ends on Tuesday, written the same way. |
| Building damage on Wednesday | `PVPBuildingDamageEnabledWednesday` in `[ServerSettings]` | Allows players to damage each other's buildings on Wednesday when building damage is limited to the schedule. |
| Building damage starts on Wednesday | `PVPBuildingDamageTimeWednesdayStart` in `[ServerSettings]` | The time building damage starts on Wednesday, written as hours and minutes without a colon (1800 is 6 pm). |
| Building damage ends on Wednesday | `PVPBuildingDamageTimeWednesdayEnd` in `[ServerSettings]` | The time building damage ends on Wednesday, written the same way. |
| Building damage on Thursday | `PVPBuildingDamageEnabledThursday` in `[ServerSettings]` | Allows players to damage each other's buildings on Thursday when building damage is limited to the schedule. |
| Building damage starts on Thursday | `PVPBuildingDamageTimeThursdayStart` in `[ServerSettings]` | The time building damage starts on Thursday, written as hours and minutes without a colon (1800 is 6 pm). |
| Building damage ends on Thursday | `PVPBuildingDamageTimeThursdayEnd` in `[ServerSettings]` | The time building damage ends on Thursday, written the same way. |
| Building damage on Friday | `PVPBuildingDamageEnabledFriday` in `[ServerSettings]` | Allows players to damage each other's buildings on Friday when building damage is limited to the schedule. |
| Building damage starts on Friday | `PVPBuildingDamageTimeFridayStart` in `[ServerSettings]` | The time building damage starts on Friday, written as hours and minutes without a colon (1800 is 6 pm). |
| Building damage ends on Friday | `PVPBuildingDamageTimeFridayEnd` in `[ServerSettings]` | The time building damage ends on Friday, written the same way. |
| Building damage on Saturday | `PVPBuildingDamageEnabledSaturday` in `[ServerSettings]` | Allows players to damage each other's buildings on Saturday when building damage is limited to the schedule. |
| Building damage starts on Saturday | `PVPBuildingDamageTimeSaturdayStart` in `[ServerSettings]` | The time building damage starts on Saturday, written as hours and minutes without a colon (1800 is 6 pm). |
| Building damage ends on Saturday | `PVPBuildingDamageTimeSaturdayEnd` in `[ServerSettings]` | The time building damage ends on Saturday, written the same way. |
| Building damage on Sunday | `PVPBuildingDamageEnabledSunday` in `[ServerSettings]` | Allows players to damage each other's buildings on Sunday when building damage is limited to the schedule. |
| Building damage starts on Sunday | `PVPBuildingDamageTimeSundayStart` in `[ServerSettings]` | The time building damage starts on Sunday, written as hours and minutes without a colon (1800 is 6 pm). |
| Building damage ends on Sunday | `PVPBuildingDamageTimeSundayEnd` in `[ServerSettings]` | The time building damage ends on Sunday, written the same way. |
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

### Conan Exiles: Gameplay

4 settings in `ServerSettings.ini`, shown under **Gameplay** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Avatar summoning opens on weekdays | `AvatarSummoningTimeWeekdayStart` in `[ServerSettings]` | The time of day the avatars can be summoned from on weekdays, written as hours and minutes without a colon. 0 for both start and end means no limit. |
| Avatar summoning closes on weekdays | `AvatarSummoningTimeWeekdayEnd` in `[ServerSettings]` | The time of day the avatars can be summoned until on weekdays, written as hours and minutes without a colon. 0 for both start and end means no limit. |
| Avatar summoning opens at weekends | `AvatarSummoningTimeWeekendStart` in `[ServerSettings]` | The time of day the avatars can be summoned from on weekends, written as hours and minutes without a colon. 0 for both start and end means no limit. |
| Avatar summoning closes at weekends | `AvatarSummoningTimeWeekendEnd` in `[ServerSettings]` | The time of day the avatars can be summoned until on weekends, written as hours and minutes without a colon. 0 for both start and end means no limit. |

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

### Conan Exiles: Admin & Misc

30 settings in `ServerSettings.ini`, shown under **Admin & Misc** on the Settings tab.

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
| Max Death Map Markers | `MaxDeathMapMarkers` in `[ServerSettings]` | Maximum number of death location markers kept on the map per player. |
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

6 settings in `DedicatedServer.ini`, shown under **General** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server Name | `ServerName` in `[/Script/Dominion.DedicatedServerSettings]` | The name shown for this server in the in-game server browser. |
| World Password | `WorldPassword` in `[/Script/Dominion.DedicatedServerSettings]` | Password players must enter to join the server. Leave blank for a public server. |
| Admin Password | `AdminPassword` in `[/Script/Dominion.DedicatedServerSettings]` | Password required to gain admin privileges in-game. |
| Default World/Save Name | `DefaultWorldName` in `[/Script/Dominion.DedicatedServerSettings]` | Name of the save file this server loads/creates. |
| Who can join | `PlatformPolicy` in `[/Script/Dominion.DedicatedServerSettings]` | Which platforms' players may join. Crossplay lets players from every platform in. |
| Send crash reports | `bAllowSendingCrashDumps` in `[/Script/Dominion.DedicatedServerSettings]` | Lets the server send a crash report to the game's makers when it crashes. |

## Windrose

Windrose keeps its settings in `R5\ServerDescription.json` inside the server's install folder.

- `ServerDescription.json`: The server's name, password, player limit, region and how players connect.

The file also holds identifiers the game makes itself (a version, a deployment, a persistent server ID and a world island ID). The panel hides them so they are not changed by accident.

### Windrose: General

8 settings in `ServerDescription.json`, shown under **General** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server Name | `ServerDescription_Persistent.ServerName` | The name shown for this server in the in-game server browser. |
| Password Protected | `ServerDescription_Persistent.IsPasswordProtected` | Requires players to enter a password to join. |
| Server Password | `ServerDescription_Persistent.Password` | Password players must enter to join, when password protection is enabled. |
| Max Players | `ServerDescription_Persistent.MaxPlayerCount` | Maximum number of players allowed on the server. |
| Server Region | `ServerDescription_Persistent.UserSelectedRegion` | Region selected for this server, used for matchmaking/latency. |
| Auto-Load Latest Backup If Save Is Broken | `ServerDescription_Persistent.AutoLoadLatestBackupIfHasBroken` | Automatically restores the most recent backup if the current save fails to load. |
| Invite code | `ServerDescription_Persistent.InviteCode` | The code players type into the game to find and join this server. The game makes it; leave it as it is. |
| Allow several servers from one install | `ServerDescription_Persistent.CanLaunchMultipleServerInstances` | Lets more than one copy of the server run from the same install at the same time. |

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
| Region | `Region` | The region the server is listed under. Leave empty for the default. |
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

### Palworld: Gameplay

88 settings in `PalWorldSettings.ini`, shown under **Gameplay** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Randomizer Mode | `RandomizerType` | Shuffles which pals appear where, and what they are. None leaves the world as normal. Choices: `None`, `Region`, `All`. Another value can be typed. |
| Randomizer Seed | `RandomizerSeed` | The text that decides how the randomizer shuffles. The same seed gives the same shuffle. |
| Randomize Pal Levels | `bIsRandomizerPalLevelRandom` | Gives randomized pals random levels too. |
| Pal Hunger Rate | `PalStomachDecreaceRate` | How fast pals get hungry. 1 is normal; lower is slower. |
| Pal Stamina Drain Rate | `PalStaminaDecreaceRate` | How fast pals use up stamina. 1 is normal; lower is slower. |
| Pal Health Regeneration | `PalAutoHPRegeneRate` | How fast pals heal on their own. 1 is normal. |
| Pal Health Regeneration While Sleeping | `PalAutoHpRegeneRateInSleep` | How fast pals heal while sleeping in their bed. 1 is normal. |
| Structure Health Multiplier | `BuildObjectHpRate` | Multiplies how much damage structures can take before they break. 1 is normal. |
| Bases Per Guild | `BaseCampMaxNumInGuild` | The most bases one guild may have. |
| Egg Hatching Time (hours) | `PalEggDefaultHatchingTime` | How long the biggest eggs take to hatch, in hours. Smaller eggs take less. 0 hatches them at once. |
| Pick Up Other Guilds' Death Drops | `bCanPickupOtherGuildDeathPenaltyDrop` | Lets players pick up what members of another guild dropped when they died. |
| Penalty For Staying Away | `bEnableNonLoginPenalty` | Applies a penalty to a player's pals and base while they have not logged in for a long time. |
| Fast Travel | `bEnableFastTravel` | Lets players fast travel between map points. |
| Fast Travel To Bases Only | `bEnableFastTravelOnlyBaseCamp` | Limits fast travel to a player's own bases. |
| Choose Start Location On The Map | `bIsStartLocationSelectByMap` | Lets new players pick where they start on the map. |
| Characters Stay In The World After Logging Out | `bExistPlayerAfterLogout` | A player's character stays in the world after they log out, where others can attack it. |
| Hide Other Guilds' Base Borders | `bInvisibleOtherGuildBaseCampAreaFX` | Hides the visual border around bases that belong to other guilds. |
| Show Join And Leave Messages | `bIsShowJoinLeftMessage` | Shows a message in chat when players join or leave. |
| Item Spoil Speed | `ItemCorruptionMultiplier` | Multiplies how fast food and other items spoil. 1 is normal. |
| Ranch Work Speed | `MonsterFarmActionSpeedRate` | Multiplies how fast pals work at the ranch. 1 is normal. |
| Fishing Difficulty | `FishingDifficultyRate` | How hard fishing is. 1 is normal; higher is harder. |
| Locked Technologies | `DenyTechnologyList` | Technologies players can't unlock, written as a list of their names. |
| Guild Rejoin Cooldown (minutes) | `GuildRejoinCooldownMinutes` | How long a player must wait before joining a guild again after leaving one. |
| Guild Leader Away Limit (days) | `AutoTransferMasterThresholdDays` | How many days a guild leader may be away before leadership passes to another member. |
| Show PvP Items At Bases On The Map | `bDisplayPvPItemNumOnWorldMap_BaseCamp` | Shows how many PvP items each base holds on the world map. |
| Show PvP Items Carried By Players On The Map | `bDisplayPvPItemNumOnWorldMap_Player` | Shows how many PvP items each player carries on the world map. |
| Extra Item Dropped On A PvP Kill | `AdditionalDropItemWhenPlayerKillingInPvPMode` | The item a player drops in addition to their own when they are killed by another player. |
| Extra Item Count On A PvP Kill | `AdditionalDropItemNumWhenPlayerKillingInPvPMode` | How many of that item are dropped. |
| Drop An Extra Item On A PvP Kill | `bAdditionalDropItemWhenPlayerKillingInPvPMode` | Makes a player who is killed by another player drop the extra item below as well. |
| Voice Chat | `bEnableVoiceChat` | Turns on in-game voice chat. |
| Voice Chat Full Volume Distance | `VoiceChatMaxVolumeDistance` | How close players must be to hear each other at full volume. |
| Voice Chat Silence Distance | `VoiceChatZeroVolumeDistance` | How far apart players must be before they can't hear each other at all. |
| Allow Upgrading Health | `bAllowEnhanceStat_Health` | Lets players spend points on health. |
| Allow Upgrading Attack | `bAllowEnhanceStat_Attack` | Lets players spend points on attack. |
| Allow Upgrading Stamina | `bAllowEnhanceStat_Stamina` | Lets players spend points on stamina. |
| Allow Upgrading Carry Weight | `bAllowEnhanceStat_Weight` | Lets players spend points on how much they can carry. |
| Allow Upgrading Work Speed | `bAllowEnhanceStat_WorkSpeed` | Lets players spend points on work speed. |
| Show Who Built A Structure | `bEnableBuildingPlayerUIdDisplay` | Shows which player built a structure. |
| Enemy Camps Near Bases | `bAllowEnemyCampSpawnNearBaseCamp` | Lets enemy camps appear near players' bases. |
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
| Auto-Reset Guilds With No Online Players | `bAutoResetGuildNoOnlinePlayers` | Automatically disbands/resets guilds that have had no online members for a while. |
| Auto-Reset Guild Timer (hrs) | `AutoResetGuildTimeNoOnlinePlayers` | Hours with no online guild members before an auto-reset triggers. |
| Pal Work Speed Rate | `WorkSpeedRate` | Multiplies how fast working Pals complete tasks. |
| Auto-Save Interval (min) | `AutoSaveSpan` | Minutes between automatic world saves. |
| Multiplayer Enabled | `bIsMultiplay` | Enables multiplayer on this server (should stay on for a dedicated server). |
| PvP Enabled | `bIsPvP` | Turns on player-vs-player combat server-wide. |
| Hardcore Mode | `bHardcore` | Enables permadeath-style hardcore rules. |
| Pals Can Be Lost On Death | `bPalLost` | Allows Pals to be permanently lost if their owner dies. |
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

15 settings in `PalWorldSettings.ini`, shown under **Admin** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Dropped Items With Physics | `PhysicsActiveDropItemMaxNum` | How many dropped items may use physics at once. -1 means no limit. |
| Droppings Limit | `DropItemMaxNum_UNKO` | The most pal droppings that may lie in the world at once. |
| Allow Client Mods | `bAllowClientMod` | Lets players join with mods installed on their own game. |
| Check Player Accounts | `bUseAuth` | Checks that players are signed in to their platform account. Leave it on for a public server. |
| Ban List Address | `BanListURL` | Where the server downloads its list of globally banned players from. |
| Enable REST API | `RESTAPIEnabled` | Turns on the server's REST API, a web interface other tools use to run the server. The panel does not need it. |
| REST API Port | `RESTAPIPort` | The port the REST API listens on. Keep it closed in your router unless you really need it. |
| Show Player List | `bShowPlayerList` | Shows the connected player list to clients. |
| Chat Messages Per Minute Limit | `ChatPostLimitPerMinute` | Maximum chat messages a player can send per minute (spam protection). |
| Allowed Crossplay Platforms | `CrossplayPlatforms` | Platforms allowed to crossplay together on this server. |
| Use Backup Save Data | `bIsUseBackupSaveData` | Falls back to a backup save if the primary save fails to load. |
| Log Format | `LogFormatType` | Output format used for server logs. Choices: `Text` (Plain text), `Json` (JSON). |
| Supply Drop Interval (min) | `SupplyDropSpan` | Minutes between scheduled supply drop events. |
| Enable Predator Boss Pals | `EnablePredatorBossPal` | Enables the special Predator boss Pal variants. |
| Max Buildings Per Player | `MaxBuildingLimitNumPerPlayer` | The most structures one player may build. 0 means no limit. |

## Rust

Rust is set up with console variables ("convars"), named like `server.hostname`. The panel's start script puts some of them on the launch line, and the rest can go in `server\<identity>\cfg\server.cfg` (inside the server's install folder), one per line. A value on the launch line wins over the same one in `server.cfg`.

- `server.cfg`: Any console variable, one per line: its name, then its value (in quotes when it has spaces).
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#rust).

Rust does not make `server.cfg` until it is asked to (`server.writecfg` in the console), so the file may not exist yet. You can write one from the Settings tab.

### Rust: Server

7 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `server.hostname` | The name shown in the in-game server browser. |
| Description | `server.description` | The text under the name in the server browser. Write \n where you want a new line. |
| Website | `server.url` | A web address shown on the server's page in the browser. |
| Banner image | `server.headerimage` | The web address of a picture (512 by 256 pixels works best) shown at the top of the server's page. |
| Max players | `server.maxplayers` | The most players that can be on at once. |
| PvE (players can't hurt each other) | `server.pve` | Stops players from damaging each other. |
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
- `ServerGameSettings.json`: Settings of the server.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#v-rising).

The rules of the world itself (clan size, blood drain, castle rules and similar) are in `ServerGameSettings.json`, which the game makes the first time it runs. The Settings tab does not edit that file.

### V Rising (ServerHostSettings.json): Server

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

### V Rising (ServerHostSettings.json): Network

4 settings in `ServerHostSettings.json`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game port | `Port` | The port players connect to (UDP). Change it from the server's Ports section so the panel can check for clashes. |
| Query port | `QueryPort` | The port the server list asks for details on (UDP). |
| Bind address | `BindIpAddress` | The network address the server listens on. Leave empty to use every address. |
| Server speed (ticks/sec) | `ServerFps` | How many times a second the game world updates. Higher is smoother but heavier on the CPU. |

### V Rising (ServerHostSettings.json): World

4 settings in `ServerHostSettings.json`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game rules preset | `GameSettingsPreset` | A named set of world rules from the game, such as StandardPvP. Leave empty to use the game's default. Choices: empty (the game's default), `StandardPvE` (Standard PvE), `StandardPvP` (Standard PvP), `StandardPvP_NoSiege` (Standard PvP No Siege), `StandardPvP_WeekendSiege` (Standard PvP Weekend Siege), `StandardPvP_DailySiege` (Standard PvP Daily Siege), `SoloPvP` (Solo PvP), `DuoPvP` (Duo PvP), `DuoPvP_NoSiege` (Duo PvP No Siege), `DuoPvP_WeekendSiege` (Duo PvP Weekend Siege), `DuoPvP_DailySiege` (Duo PvP Daily Siege), `TrioPvP` (Trio PvP), `TrioPvP_NoSiege` (Trio PvP No Siege), `TrioPvP_WeekendSiege` (Trio PvP Weekend Siege), `TrioPvP_DailySiege` (Trio PvP Daily Siege), `HardcorePvP` (Hardcore PvP), `HardcoreDuoPvP` (Hardcore Duo PvP), `HardcoreTrioPvP` (Hardcore Trio PvP), `Level30PvE` (Level 30 PvE), `Level30PvP` (Level 30 PvP), `Level40PvE` (Level 40 PvE), `Level40PvP` (Level 40 PvP), `Level50PvE` (Level 50 PvE), `Level50PvP` (Level 50 PvP), `Level60PvE` (Level 60 PvE), `Level60PvP` (Level 60 PvP), `Level70PvE` (Level 70 PvE), `Level70PvP` (Level 70 PvP), `Level80PvE` (Level 80 PvE), `Level80PvP` (Level 80 PvP), `Level90PvE` (Level 90 PvE), `Level90PvP` (Level 90 PvP). Another value can be typed. |
| Difficulty preset | `GameDifficultyPreset` | A named difficulty from the game. Leave empty for the game's default. Choices: `Difficulty_Easy` (Easy), `Difficulty_Normal` (Normal), `Difficulty_Brutal` (Brutal). Another value can be typed. |
| Debug events: admins only | `AdminOnlyDebugEvents` | Only admins may trigger debug events. |
| Debug events: off | `DisableDebugEvents` | Turns debug events off for everybody. |

### V Rising (ServerHostSettings.json): Saving

3 settings in `ServerHostSettings.json`, shown under **Saving** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Autosaves to keep | `AutoSaveCount` | How many autosaves are kept before the oldest is overwritten. |
| Autosave every (seconds) | `AutoSaveInterval` | How often the world is saved on its own. |
| Compress saves | `CompressSaveFiles` | Makes the save files smaller, at a little extra CPU cost when saving. |

### V Rising (ServerHostSettings.json): Remote console

4 settings in `ServerHostSettings.json`, shown under **Remote console** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Remote console | `Rcon.Enabled` | Turns on the game's remote console. GodlyPanel does not use it for V Rising (the game has no stop command on it), so leave it off unless you have another tool. |
| Remote console port | `Rcon.Port` | The port of the remote console. |
| Remote console password | `Rcon.Password` | The remote console's password. |
| Web API | `API.Enabled` | Turns on the game's web API for metrics. |

### V Rising (ServerGameSettings.json): Rules

23 settings in `ServerGameSettings.json`, shown under **Rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game mode | `GameModeType` | Whether players can fight each other. PvP is the normal game; PvE stops players hurting one another. Choices: `PvE` (PvE (players can't hurt each other)), `PvP`. |
| Difficulty | `GameDifficulty` | How hard the game is overall. Choices: `Easy`, `Normal`, `Brutal`. |
| When players can hurt each other | `PlayerDamageMode` | In PvP, whether players can always hurt each other or only in the hours set under the weekly PvP hours. Choices: `Always`, `TimeRestricted` (Only in the weekly PvP hours). Another value can be typed. |
| New player protection | `PvPProtectionMode` | How long a new vampire is protected from other players after they start. Choices: `Disabled` (None), `VeryShort` (Very short), `Short`, `Medium`, `Long`. Another value can be typed. |
| PvP respawn time | `PvPVampireRespawnModifier` | Multiplies how long a vampire waits to respawn after being killed by another player. |
| Biggest clan | `ClanSize` | The most players one clan may have. |
| Global chat | `AllowGlobalChat` | Lets everyone read and write in the global chat. Off leaves only clan and local chat. |
| All waypoints unlocked | `AllWaypointsUnlocked` | Gives every player every waypoint from the start. |
| Starting progression | `StartingProgressionLevel` | How far along the game's progression new vampires begin. 0 is the very start. |
| Stack size | `InventoryStacksModifier` | Multiplies how many items fit in one inventory stack. |
| Who can open a dead player's items | `DeathContainerPermission` | Who may take items from the container a player leaves behind when they die. Choices: `Anyone`, `ClanMembers` (Clan members only), `OnlySelf` (Only the player). Another value can be typed. |
| Loot other players' containers | `CanLootEnemyContainers` | Lets players loot containers that belong to other players. |
| Equipment stays with the player | `BloodBoundEquipment` | Bound equipment is kept by the player on death instead of dropping. |
| Bound items can be used to teleport | `TeleportBoundItems` | Lets players teleport with the items bound to them. |
| Bat form can carry bound items | `BatBoundItems` | Lets players keep bound items on them in bat form. |
| Bat form can carry soul shards | `BatBoundShards` | Lets players keep soul shards on them in bat form. |
| Remove inactive players' castles | `InactivityKillEnabled` | Lets the game remove the castles of players who have not played for a long time, so abandoned castles don't pile up. |
| Shortest time before an inactive castle goes (seconds) | `InactivityKillTimeMin` | The shortest time a player can be away before their castle may be removed. |
| Longest time before an inactive castle goes (seconds) | `InactivityKillTimeMax` | The time away after which a castle is removed whatever its level. |
| Extra safe time (seconds) | `InactivityKillSafeTimeAddition` | Extra time added before removal for a player with a well-equipped character. |
| Remove disconnected players who are down | `DisableDisconnectedDeadEnabled` | Removes a player who disconnects while downed, so they can't be farmed. |
| Time before they are removed (seconds) | `DisableDisconnectedDeadTimer` | How long a downed player who disconnected stays before being removed. |
| Sun protection after disconnecting (seconds) | `DisconnectedSunImmunityTime` | How long a vampire is safe from the sun after disconnecting. |

### V Rising (ServerGameSettings.json): Loot and resources

7 settings in `ServerGameSettings.json`, shown under **Loot and resources** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Loot drops | `DropTableModifier_General` | Multiplies how much enemies drop. |
| Stygian shard drops | `DropTableModifier_StygianShards` | Multiplies how many Stygian shards drop. |
| Mission rewards | `DropTableModifier_Missions` | Multiplies the rewards from missions. |
| Material yield | `MaterialYieldModifier_Global` | Multiplies how much material you get from gathering. |
| Blood essence yield | `BloodEssenceYieldModifier` | Multiplies how much blood essence enemies give. |
| Soul shard wear | `SoulShard_DurabilityLossRate` | How fast soul shards wear out. 0 means they never do. |
| Relic spawning | `RelicSpawnType` | Whether each soul shard relic exists once on the map or can appear more than once. Choices: `Unique` (Each relic once), `Plentiful`. Another value can be typed. |

### V Rising (ServerGameSettings.json): Survival

8 settings in `ServerGameSettings.json`, shown under **Survival** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Blood drain | `BloodDrainModifier` | Multiplies how fast a vampire's blood runs out. |
| Gear wear | `DurabilityDrainModifier` | Multiplies how fast equipment wears out. |
| Garlic strength | `GarlicAreaStrengthModifier` | Multiplies how strong garlic areas are. |
| Holy area strength | `HolyAreaStrengthModifier` | Multiplies how strong holy areas are. |
| Silver strength | `SilverStrengthModifier` | Multiplies how strong silver's effect is. |
| Sun damage | `SunDamageModifier` | Multiplies how much damage the sun does. |
| Gear wear on death | `Death_DurabilityFactorLoss` | The share of an item's durability lost when its owner dies. 0.125 is an eighth. |
| Gear lost as resources | `Death_DurabilityLossFactorAsResources` | The share of that lost durability given back as resources. |

### V Rising (ServerGameSettings.json): Castles

42 settings in `ServerGameSettings.json`, shown under **Castles** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Distance between castles | `CastleMinimumDistanceInFloors` | How many floors apart castle hearts must be. |
| Castle decay | `CastleDecayRateModifier` | Multiplies how fast castles decay when their blood runs out. |
| Castle blood essence use | `CastleBloodEssenceDrainModifier` | Multiplies how fast a castle heart uses up blood essence. |
| When castles can be damaged | `CastleDamageMode` | Whether other players can damage a castle: never, always, or only in the hours set under the weekly PvP hours. Choices: `Never`, `Always`, `TimeRestricted` (Only in the weekly PvP hours). |
| Castle heart damage | `CastleHeartDamageMode` | Who can damage or destroy a castle heart. Choices: `CanBeDestroyedOnlyWhenDecaying` (Only when the castle has decayed), `CanBeDestroyedByPlayers` (Players can destroy it), `CanBeSeizedOrDestroyedByPlayers` (Players can seize or destroy it). Another value can be typed. |
| Siege weapon health | `SiegeWeaponHealth` | How much damage siege weapons can take. Choices: `VeryLow` (Very low), `Low`, `Normal`, `High`, `VeryHigh` (Very high). Another value can be typed. |
| Siege time (seconds) | `CastleSiegeTimer` | How long a siege lasts. |
| Under-attack time (seconds) | `CastleUnderAttackTimer` | How long a castle counts as under attack after being hit. |
| Raid time (seconds) | `CastleRaidTimer` | How long a raid on a castle lasts. |
| Raid protection (seconds) | `CastleRaidProtectionTime` | How long a castle is protected after a raid ends. |
| Free claim delay (seconds) | `CastleExposedFreeClaimTimer` | How long an exposed castle waits before it can be claimed freely. |
| Castle move cooldown (seconds) | `CastleRelocationCooldown` | How long a player must wait before moving their castle again. |
| Castles can be moved | `CastleRelocationEnabled` | Lets players move their castle. |
| Announce siege weapons | `AnnounceSiegeWeaponSpawn` | Tells players when a siege weapon appears. |
| Show siege weapons on the map | `ShowSiegeWeaponMapIcon` | Shows siege weapons on the map. |
| Raid free castles | `FreeCastleRaid` | Lets players raid castles nobody owns. |
| Claim free castles | `FreeCastleClaim` | Lets players claim castles nobody owns. |
| Destroy free castles | `FreeCastleDestroy` | Lets players destroy castles nobody owns. |
| Castles per player | `CastleStatModifiers_Global.CastleLimit` | The most castles one player may own. |
| Tombs per castle | `CastleStatModifiers_Global.TombLimit` | The most tombs one castle may have. |
| Vermin nests per castle | `CastleStatModifiers_Global.VerminNestLimit` | The most vermin nests one castle may have. |
| Prison cells per castle | `CastleStatModifiers_Global.PrisonCellLimit` | The most prison cells one castle may have. |
| Nether gates per castle | `CastleStatModifiers_Global.NetherGateLimit` | The most nether gates one castle may have. |
| Thrones of Darkness per castle | `CastleStatModifiers_Global.ThroneOfDarknessLimit` | The most thrones of darkness one castle may have. |
| Arena stations per castle | `CastleStatModifiers_Global.ArenaStationLimit` | The most arena stations one castle may have. |
| Routing stations per castle | `CastleStatModifiers_Global.RoutingStationLimit` | The most routing stations one castle may have. |
| Who the castle limit counts | `CastleStatModifiers_Global.CastleHeartLimitType` | Whether the castle limit is per player or per clan. Choices: `User` (Per player), `Clan` (Per clan). Another value can be typed. |
| Castle level 1: floors | `CastleStatModifiers_Global.HeartLimits.Level1.FloorLimit` | The most floor tiles a level 1 castle heart allows. |
| Castle level 1: servants | `CastleStatModifiers_Global.HeartLimits.Level1.ServantLimit` | The most servants a level 1 castle heart allows. |
| Castle level 1: height | `CastleStatModifiers_Global.HeartLimits.Level1.HeightLimit` | How many storeys high a level 1 castle may be built. |
| Castle level 2: floors | `CastleStatModifiers_Global.HeartLimits.Level2.FloorLimit` | The most floor tiles a level 2 castle heart allows. |
| Castle level 2: servants | `CastleStatModifiers_Global.HeartLimits.Level2.ServantLimit` | The most servants a level 2 castle heart allows. |
| Castle level 2: height | `CastleStatModifiers_Global.HeartLimits.Level2.HeightLimit` | How many storeys high a level 2 castle may be built. |
| Castle level 3: floors | `CastleStatModifiers_Global.HeartLimits.Level3.FloorLimit` | The most floor tiles a level 3 castle heart allows. |
| Castle level 3: servants | `CastleStatModifiers_Global.HeartLimits.Level3.ServantLimit` | The most servants a level 3 castle heart allows. |
| Castle level 3: height | `CastleStatModifiers_Global.HeartLimits.Level3.HeightLimit` | How many storeys high a level 3 castle may be built. |
| Castle level 4: floors | `CastleStatModifiers_Global.HeartLimits.Level4.FloorLimit` | The most floor tiles a level 4 castle heart allows. |
| Castle level 4: servants | `CastleStatModifiers_Global.HeartLimits.Level4.ServantLimit` | The most servants a level 4 castle heart allows. |
| Castle level 4: height | `CastleStatModifiers_Global.HeartLimits.Level4.HeightLimit` | How many storeys high a level 4 castle may be built. |
| Castle level 5: floors | `CastleStatModifiers_Global.HeartLimits.Level5.FloorLimit` | The most floor tiles a level 5 castle heart allows. |
| Castle level 5: servants | `CastleStatModifiers_Global.HeartLimits.Level5.ServantLimit` | The most servants a level 5 castle heart allows. |
| Castle level 5: height | `CastleStatModifiers_Global.HeartLimits.Level5.HeightLimit` | How many storeys high a level 5 castle may be built. |

### V Rising (ServerGameSettings.json): Crafting

10 settings in `ServerGameSettings.json`, shown under **Crafting** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Building cost | `BuildCostModifier` | Multiplies what building costs. |
| Recipe cost | `RecipeCostModifier` | Multiplies what crafting recipes cost. |
| Crafting speed | `CraftRateModifier` | Multiplies how fast things are crafted. |
| Research cost | `ResearchCostModifier` | Multiplies what research costs. |
| Research time | `ResearchTimeModifier` | Multiplies how long research takes. |
| Refining cost | `RefinementCostModifier` | Multiplies what refining costs. |
| Refining speed | `RefinementRateModifier` | Multiplies how fast things are refined. |
| Resources from dismantling | `DismantleResourceModifier` | Multiplies the resources you get back from dismantling. |
| Servant converting speed | `ServantConvertRateModifier` | Multiplies how fast servants are converted. |
| Repair cost | `RepairCostModifier` | Multiplies what repairs cost. |

### V Rising (ServerGameSettings.json): Time

8 settings in `ServerGameSettings.json`, shown under **Time** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Length of a day (seconds) | `GameTimeModifiers.DayDurationInSeconds` | How many real seconds a whole in-game day lasts. |
| Day starts at (hour) | `GameTimeModifiers.DayStartHour` | The in-game hour daylight starts, on a 24-hour clock. |
| Day starts at (minute) | `GameTimeModifiers.DayStartMinute` | The minute past that hour. |
| Day ends at (hour) | `GameTimeModifiers.DayEndHour` | The in-game hour daylight ends, on a 24-hour clock. |
| Day ends at (minute) | `GameTimeModifiers.DayEndMinute` | The minute past that hour. |
| Fewest days between blood moons | `GameTimeModifiers.BloodMoonFrequency_Min` | The least number of days that pass between blood moons. |
| Most days between blood moons | `GameTimeModifiers.BloodMoonFrequency_Max` | The most days that pass between blood moons. |
| Blood moon bonus | `GameTimeModifiers.BloodMoonBuff` | How much stronger vampires are during a blood moon, as a fraction. 0.2 is 20%. |

### V Rising (ServerGameSettings.json): Players

13 settings in `ServerGameSettings.json`, shown under **Players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Player health | `VampireStatModifiers.MaxHealthModifier` | Multiplies players' maximum health. |
| Player physical power | `VampireStatModifiers.PhysicalPowerModifier` | Multiplies players' physical damage. |
| Player spell power | `VampireStatModifiers.SpellPowerModifier` | Multiplies players' spell damage. |
| Player gathering power | `VampireStatModifiers.ResourcePowerModifier` | Multiplies how well players gather resources. |
| Player siege power | `VampireStatModifiers.SiegePowerModifier` | Multiplies players' damage to castles. |
| Damage players take | `VampireStatModifiers.DamageReceivedModifier` | Multiplies the damage players receive. |
| Revive cancel delay (seconds) | `VampireStatModifiers.ReviveCancelDelay` | How long before a player's revive can be cancelled. |
| Equipment: health | `EquipmentStatModifiers_Global.MaxHealthModifier` | Multiplies the health that equipment gives. |
| Equipment: gathering | `EquipmentStatModifiers_Global.ResourceYieldModifier` | Multiplies the gathering bonus that equipment gives. |
| Equipment: physical power | `EquipmentStatModifiers_Global.PhysicalPowerModifier` | Multiplies the physical power that equipment gives. |
| Equipment: spell power | `EquipmentStatModifiers_Global.SpellPowerModifier` | Multiplies the spell power that equipment gives. |
| Equipment: siege power | `EquipmentStatModifiers_Global.SiegePowerModifier` | Multiplies the siege power that equipment gives. |
| Equipment: speed | `EquipmentStatModifiers_Global.MovementSpeedModifier` | Multiplies the movement speed that equipment gives. |

### V Rising (ServerGameSettings.json): Enemies

6 settings in `ServerGameSettings.json`, shown under **Enemies** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Enemy health | `UnitStatModifiers_Global.MaxHealthModifier` | Multiplies the health of every enemy. |
| Enemy damage | `UnitStatModifiers_Global.PowerModifier` | Multiplies the damage every enemy does. |
| Enemy extra levels | `UnitStatModifiers_Global.LevelIncrease` | Adds this many levels to every enemy. |
| Boss health | `UnitStatModifiers_VBlood.MaxHealthModifier` | Multiplies the health of the V Blood bosses. |
| Boss damage | `UnitStatModifiers_VBlood.PowerModifier` | Multiplies the damage the V Blood bosses do. |
| Boss extra levels | `UnitStatModifiers_VBlood.LevelIncrease` | Adds this many levels to the V Blood bosses. |

### V Rising (ServerGameSettings.json): Traders

3 settings in `ServerGameSettings.json`, shown under **Traders** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Trader stock | `TraderModifiers.StockModifier` | Multiplies how much traders have for sale. |
| Trader prices | `TraderModifiers.PriceModifier` | Multiplies what traders charge. |
| Trader restock time | `TraderModifiers.RestockTimerModifier` | Multiplies how long traders take to restock. |

### V Rising (ServerGameSettings.json): Weekly PvP hours

17 settings in `ServerGameSettings.json`, shown under **Weekly PvP hours** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Time zone for the weekly PvP hours | `PlayerInteractionSettings.TimeZone` | Which clock the weekly PvP hours below follow. Local is the server PC's own time. |
| Players can hurt each other on weekdays: starts (hour) | `PlayerInteractionSettings.VSPlayerWeekdayTime.StartHour` | The hour the period starts or ends on weekdays, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Players can hurt each other on weekdays: starts (minute) | `PlayerInteractionSettings.VSPlayerWeekdayTime.StartMinute` | The minute the period starts or ends on weekdays, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Players can hurt each other on weekdays: ends (hour) | `PlayerInteractionSettings.VSPlayerWeekdayTime.EndHour` | The hour the period starts or ends on weekdays, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Players can hurt each other on weekdays: ends (minute) | `PlayerInteractionSettings.VSPlayerWeekdayTime.EndMinute` | The minute the period starts or ends on weekdays, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Players can hurt each other on weekends: starts (hour) | `PlayerInteractionSettings.VSPlayerWeekendTime.StartHour` | The hour the period starts or ends on weekends, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Players can hurt each other on weekends: starts (minute) | `PlayerInteractionSettings.VSPlayerWeekendTime.StartMinute` | The minute the period starts or ends on weekends, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Players can hurt each other on weekends: ends (hour) | `PlayerInteractionSettings.VSPlayerWeekendTime.EndHour` | The hour the period starts or ends on weekends, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Players can hurt each other on weekends: ends (minute) | `PlayerInteractionSettings.VSPlayerWeekendTime.EndMinute` | The minute the period starts or ends on weekends, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Castles can be damaged on weekdays: starts (hour) | `PlayerInteractionSettings.VSCastleWeekdayTime.StartHour` | The hour the period starts or ends on weekdays, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Castles can be damaged on weekdays: starts (minute) | `PlayerInteractionSettings.VSCastleWeekdayTime.StartMinute` | The minute the period starts or ends on weekdays, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Castles can be damaged on weekdays: ends (hour) | `PlayerInteractionSettings.VSCastleWeekdayTime.EndHour` | The hour the period starts or ends on weekdays, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Castles can be damaged on weekdays: ends (minute) | `PlayerInteractionSettings.VSCastleWeekdayTime.EndMinute` | The minute the period starts or ends on weekdays, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Castles can be damaged on weekends: starts (hour) | `PlayerInteractionSettings.VSCastleWeekendTime.StartHour` | The hour the period starts or ends on weekends, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Castles can be damaged on weekends: starts (minute) | `PlayerInteractionSettings.VSCastleWeekendTime.StartMinute` | The minute the period starts or ends on weekends, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Castles can be damaged on weekends: ends (hour) | `PlayerInteractionSettings.VSCastleWeekendTime.EndHour` | The hour the period starts or ends on weekends, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |
| Castles can be damaged on weekends: ends (minute) | `PlayerInteractionSettings.VSCastleWeekendTime.EndMinute` | The minute the period starts or ends on weekends, 24-hour clock. It applies when the matching damage setting is "Only in the weekly PvP hours". |

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

## Abiotic Factor

Abiotic Factor has two small settings files in the server's install folder, under `AbioticFactor\Saved`. The rules of the world (difficulty, enemies, survival, items and more) are in `SandboxSettings.ini`, which the panel writes when it makes the server. The in-game admins are in `Admin.ini`, which the game writes the first time the server runs. The server's name, ports, passwords and player limit are arguments on the start script's launch line (**Launch options**).

- `SandboxSettings.ini`: The rules of the world: difficulty, hardcore mode, day and night, weather, survival needs, building, enemies, player damage, items, progression and what happens on death.
- `Admin.ini`: The Steam IDs of the in-game admins and of banned players.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#abiotic-factor).

The server reads `SandboxSettings.ini` when it starts, so restart the server after changing it. The panel's start script points the server at `AbioticFactor\Saved\Config\WindowsServer\SandboxSettings.ini` (with `-SandboxIniPath`) instead of the copy in the world's own folder.
Edit `Admin.ini` while the server is stopped; one report says the game can rewrite it when it starts. The form changes the lines already in the file. To add more admins, add more `Moderator=` lines to the file by hand.
Stopping the server asks its console window to close, which the game answers by shutting down. The game has no remote console and no stop command. It is not known whether a world is saved on the way out, so use the admin menu's Force World Save in the game before you stop it.
Forward the two UDP ports (game and query). The game has no TCP listener. The first time the server runs, Windows may ask whether to allow it through the firewall: if the prompt is dismissed Windows blocks it, and players outside the PC can not join until an Allow rule exists.
Mods are not supported by the developer on dedicated servers yet, and the panel adds nothing for them. If you drop mod files into `AbioticFactor\Content\Paks` while the server is stopped, every player needs the same files, and you should back up the world first. The developer says the next big update (official mod support) will probably break all current mods.
Leave the number of players at 6 or less: the game warns players before they join a bigger server. A new server uses about 1 GB of memory empty; plan for 4 GB or more with several players.

### Abiotic Factor (SandboxSettings.ini): Difficulty

3 settings in `SandboxSettings.ini`, shown under **Difficulty** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Difficulty | `GameDifficulty` in `[SandboxSettings]` | How many enemies appear in some areas, how aggressive they are and how fast they react. Anything above Normal also switches off the automatic extra difficulty the game adds when more players are present. Choices: `1` (Normal), `2` (Hard), `3` (Apocalyptic). |
| Hardcore mode | `HardcoreMode` in `[SandboxSettings]` | Characters get only one life, and the difficulty is forced to Apocalyptic. A dead scientist can spectate or quit; admins can revive them. |
| Allow the Iron Mode job | `AllowIronMode` in `[SandboxSettings]` | Only matters when Hardcore mode is on. Offers a very hard starting job called Iron Mode: few perk points, fewer perks, no health regeneration, and no recipes received from other players. |

### Abiotic Factor (SandboxSettings.ini): Time and weather

3 settings in `SandboxSettings.ini`, shown under **Time and weather** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Day and night | `DayNightCycleState` in `[SandboxSettings]` | Stops the day and night from changing. Time still passes, but the light stays fixed. Some things only happen by day or by night, so some items could become impossible to get. Choices: `0` (Normal day and night), `1` (Always day), `2` (Always night). |
| Day and night speed | `DayNightCycleSpeedMultiplier` in `[SandboxSettings]` | How fast the clock runs: higher means shorter days. It does not change cooldowns or respawn times. The wiki's range is 0.1 to 3; the default is 1.0. |
| Weather events | `WeatherFrequency` in `[SandboxSettings]` | How often weather events start. Even frequent weather still needs the right story progress before it happens. Choices: `1` (Never), `2` (Infrequent), `3` (Normal), `4` (Frequent), `5` (Daily). |

### Abiotic Factor (SandboxSettings.ini): Facility

3 settings in `SandboxSettings.ini`, shown under **Facility** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Resources respawn | `LootRespawnEnabled` in `[SandboxSettings]` | When on, resources slowly come back around the Facility (furniture does not). Handy on public servers, but objects can overlap or float and gathering matters less. |
| Power goes off at night | `PowerSocketsOffAtNight` in `[SandboxSettings]` | Normally the Facility's power, including power sockets, shuts off at night. Turn this off to keep the power on, which makes the game easier because batteries are not needed. You may need it off if the day and night setting is Always night. |
| Allow Home Worlds | `HomeWorlds` in `[SandboxSettings]` | When off, nobody can use the Home World portal worlds, including free and paid ones such as Torii. |

### Abiotic Factor (SandboxSettings.ini): Survival

10 settings in `SandboxSettings.ini`, shown under **Survival** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Hunger speed | `HungerSpeedMultiplier` in `[SandboxSettings]` | How fast hunger builds up: higher means players must eat more often. The wiki's range is 0.0 to 2.0; the default is 1.0. |
| Thirst speed | `ThirstSpeedMultiplier` in `[SandboxSettings]` | How fast thirst builds up: higher means players must drink more often. The wiki's range is 0.0 to 2.0; the default is 1.0. |
| Tiredness speed | `FatigueSpeedMultiplier` in `[SandboxSettings]` | How fast tiredness builds up: higher means players need to sleep more often. The wiki's range is 0.0 to 2.0; the default is 1.0. |
| Bathroom need speed | `ContinenceSpeedMultiplier` in `[SandboxSettings]` | How fast the need for the toilet builds up: higher means more trips. The wiki's range is 0.0 to 2.0; the default is 1.0. |
| Sink refill speed | `SinkRefillRate` in `[SandboxSettings]` | How fast sinks refill so players can drink from them: higher is faster. At 0 sinks never refill, which is much harder. The wiki's range is 0 to 10; the default is 1.0. |
| Food spoil speed | `FoodSpoilSpeedMultiplier` in `[SandboxSettings]` | How fast food rots: lower slows it down and 0 stops it. The wiki's range is 0.0 to 2.0; the default is 1.0. |
| Fridge strength | `RefrigerationEffectivenessMultiplier` in `[SandboxSettings]` | How well refrigeration keeps items fresh. It also changes how well hot items, such as a cup of coffee, stay warm in a warm place. The wiki's range is 0.0 to 2.0; the default is 1.0. |
| Hide the radiation effect | `InvisibleRadiation` in `[SandboxSettings]` | When on, radiation shows no effect on the screen, so players need Geiger counters to find it. Harder. |
| Tainted sink water | `TaintedSinkWater` in `[SandboxSettings]` | When on, sinks and similar sources that would give clean drinking water give tainted water instead. Harder. |
| Radiation hurts health | `RadiationDealsDamage` in `[SandboxSettings]` | When on, radiation damages health directly. Much harder. |

### Abiotic Factor (SandboxSettings.ini): Building and storage

4 settings in `SandboxSettings.ini`, shown under **Building and storage** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Containers limited by item type | `StorageByTag` in `[SandboxSettings]` | When off, containers stop limiting what goes in them. Normally a fridge, for example, only takes food. |
| Building support limit | `StructuralSupportLimit` in `[SandboxSettings]` | How much furniture and other placed objects can be stacked on each other before a limit is reached. A lower number limits tall builds. 0 removes the limit. The wiki does not say what the number counts; the default is 5. |
| Bridge support needed | `BridgeSupports` in `[SandboxSettings]` | How much support a bridge needs; lower it to let bridges work with little or no extra support. 0 means no support is needed. The default is 2. The wiki does not explain what 1 and 2 mean. |
| Furniture is destroyed at zero durability | `PlayerFurnitureDestruction` in `[SandboxSettings]` | When on, furniture players built is destroyed when its durability reaches zero. When off it just packs itself up, so it is easy to rebuild after an attack. |

### Abiotic Factor (SandboxSettings.ini): Enemies

8 settings in `SandboxSettings.ini`, shown under **Enemies** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Enemy respawn rate | `EnemySpawnRate` in `[SandboxSettings]` | How often enemies come back: lower means longer waits, higher means they return faster. The wiki's range is 0.5 to 3; the default is 1.0. |
| Enemy health | `EnemyHealthMultiplier` in `[SandboxSettings]` | Multiplies enemy health: lower makes them easier to kill, higher makes them tougher. The wiki's range is 0.75 to 3.0; the default is 1.0. |
| Enemy damage to players | `EnemyPlayerDamageMultiplier` in `[SandboxSettings]` | Multiplies the damage enemies do to players. The default is tuned to be fair: lower is easier, higher is deadlier. The wiki's range is 0.25 to 3.0. |
| Enemy damage to buildings | `EnemyDeployableDamageMultiplier` in `[SandboxSettings]` | Multiplies the damage enemies do to deployables such as furniture and base pieces. Lower makes bases tougher. The wiki's range is 0 to 5.0; the default is 1.0. |
| Enemy detection speed | `DetectionSpeedMultiplier` in `[SandboxSettings]` | How fast enemies notice players. Above 1 means they notice faster than normal. The wiki's range is 0.1 to 3.0; the default is 1.0. |
| Enemy accuracy | `EnemyAccuracy` in `[SandboxSettings]` | How accurate enemies are on average. Higher accuracy mainly means they group their shots more tightly on their target. Choices: `0` (Pathetic), `1` (Low), `2` (Default), `3` (High), `4` (Precise). |
| Apocalyptic abilities for all enemies | `ApocalypticAbilities` in `[SandboxSettings]` | When on, every enemy may use its Apocalyptic-difficulty abilities, even when the difficulty is lower. |
| Use every enemy spawn point | `MaximizeEnemySpawns` in `[SandboxSettings]` | When on, every enemy spawn point is turned on, whatever the difficulty or the number of players. |

### Abiotic Factor (SandboxSettings.ini): Players

4 settings in `SandboxSettings.ini`, shown under **Players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Player-versus-player damage | `DamageToAlliesMultiplier` in `[SandboxSettings]` | How much damage players do to each other, as a share of normal: 0.5 is half, 0.1 is a tenth. For real player-versus-player fights it needs to be 1.0 or more. The wiki's range is 0.0 to 3.0; the default is 0.5. |
| Show death messages | `ShowDeathMessages` in `[SandboxSettings]` | When off, players are not told when someone is killed. |
| Allow recipe sharing | `AllowRecipeSharing` in `[SandboxSettings]` | When off, players can not share item recipes with each other. |
| Allow pagers | `AllowPagers` in `[SandboxSettings]` | When off, pagers can not be used, either from the inventory or the emote wheel. That makes it harder to find other players. |

### Abiotic Factor (SandboxSettings.ini): Items

5 settings in `SandboxSettings.ini`, shown under **Items** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Stack size | `ItemStackSizeMultiplier` in `[SandboxSettings]` | Multiplies how many of an item fit in one inventory slot: an item that stacks to 5 stacks to 10 at 2. Items that do not stack are not affected. The wiki's range is 1.0 to 30; the default is 1.0. |
| Item weight | `ItemWeightMultiplier` in `[SandboxSettings]` | Multiplies how heavy items are: at 2 an item weighing 5 weighs 10. Below 1 makes items lighter. The wiki's range is 0.0 to 5.0; the default is 1.0. |
| Item durability | `ItemDurabilityMultiplier` in `[SandboxSettings]` | Multiplies how much durability items have: at 2 an item with 10 durability has 20. Below 1 makes items break faster. The wiki's range is 0.1 to 10.0; the default is 1.0. |
| Inventory slots without a backpack | `BaseInventorySize` in `[SandboxSettings]` | How many inventory slots a player has with no backpack on. A smaller number makes small backpacks less useful; a backpack's weight reduction still applies. The default is 12. |
| Allow armor appearance swap | `AllowTransmog` in `[SandboxSettings]` | When off, players can not change how their armor looks to match another piece. That limits customization but never lets someone disguise their gear as different gear. |

### Abiotic Factor (SandboxSettings.ini): Progression

5 settings in `SandboxSettings.ini`, shown under **Progression** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Bonus perk points | `BonusPerkPoints` in `[SandboxSettings]` | Extra perk points on top of the ones each chosen job gives. A negative number takes points away. The default is 0. |
| XP gain | `PlayerXPGainMultiplier` in `[SandboxSettings]` | How fast players earn XP: above 1 is faster, below 1 is slower, and 0 means skills can not level up at all. The wiki's range is 0.0 to 3; the default is 1.0. |
| Skip the research minigame | `DisableResearchMinigame` in `[SandboxSettings]` | When on, new recipes unlock at once, without the research minigame. |
| Starting weapon | `FirstTimeStartingWeapon` in `[SandboxSettings]` | The weapon a player gets the first time they spawn into the world, in addition to the items from their job. Choices: `0` (None), `1` (Shiv), `2` (Desk Leg), `3` (Kitchen Knife), `4` (Starter Baton), `5` (Pipe Club), `6` (Random). |
| Allow character reset | `AllowCharacterReset` in `[SandboxSettings]` | The game has ways to reset a character's jobs, skills and traits later on. When off, players can not change their minds. |

### Abiotic Factor (SandboxSettings.ini): Death and respawn

3 settings in `SandboxSettings.ini`, shown under **Death and respawn** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| What a player loses on death | `DeathPenalties` in `[SandboxSettings]` | What a player loses when they respawn after dying, or when they use the Unstick option. Choices: `0` (Keep all items), `1` (Keep equipped items and hotbar), `2` (Keep hotbar only), `3` (Keep equipped items only), `4` (Lose all items, including the hotbar), `5` (All items are destroyed). |
| Durability lost on death | `DurabilityLossOnDeathMultiplier` in `[SandboxSettings]` | How much durability weapons and carried items lose when a player respawns. The wiki's range is 0.0 to 1.0; the default is 0.1. |
| Host can open death bags | `HostAccessPlayerCorpses` in `[SandboxSettings]` | When on, the host can open the inventories in the Death Bags players drop when they die. This may depend on other settings. |

### Abiotic Factor (Admin.ini): Admins

1 setting in `Admin.ini`, shown under **Admins** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Admin (Steam ID) | `Moderator` in `[Moderators]` | Makes one Steam player an in-game admin: put their 17-digit Steam ID here (for example 76561198053306820). Replace the example lines the game writes. Only for Steam players; console players use the admin password launch option instead. |

### Abiotic Factor (Admin.ini): Bans

1 setting in `Admin.ini`, shown under **Bans** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Banned player (Steam ID) | `BannedPlayer` in `[BannedPlayers]` | The Steam ID of a player banned from this server. The game writes one example line; replace it with a real ID. |

## Don't Starve Together

Don't Starve Together keeps the server's shared settings in `cluster.ini`, in `data\DoNotStarveTogether\Cluster_1` inside the server's folder. This version of the panel runs a single overworld (the Master shard): there is no Caves shard, because the panel runs one program per server and a cluster with caves is two.

- `cluster.ini`: The server's name, password, player limit, game mode, saving, and whether it is online or offline.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#dont-starve-together).

An online server needs a **cluster token** from your Klei account (accounts.klei.com, Games, Don't Starve Together, Game Servers). Paste it into the create form; the panel writes it to `cluster_token.txt` in the cluster folder. Without one the server is made offline (your own network only). A token can be added later by putting it alone in that file and turning off **Offline server**.
The server's ports are on the launch line, not in `Master\server.ini`, so they can be changed from the server's Ports section. The game port is the one players connect to (UDP); the two Steam ports are internal.
The world itself (seasons, resources, how hard it is) is set in `worldgenoverride.lua` in the `Master` folder, and mods are set in `modoverrides.lua` there. Both are Lua files, which the Settings tab does not edit. The game builds the world from its default preset when no override file is there.
Stopping the server from the panel closes the program without the game's own shutdown command (`c_shutdown()`), so the world is saved only by the autosave at the end of each in-game day. Anything since the last day change is lost.
Mods are Steam Workshop mods listed when the server is created. The server downloads them when it starts. Mods marked client-only are installed by each player in their own game and do not belong on the server.

### Don't Starve Together: Server

4 settings in `cluster.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `cluster_name` in `[NETWORK]` | The name shown in the in-game server list. Do not leave it empty on an online server. |
| Description | `cluster_description` in `[NETWORK]` | Text shown in the server's details panel in the server list. |
| Password | `cluster_password` in `[NETWORK]` | What players type to join. Leave it empty for a server anyone can join. |
| Max players | `max_players` in `[GAMEPLAY]` | The most players connected at once. The game accepts 1 to 64; its own default is 16, and the panel starts a new server at 8. |

### Don't Starve Together: Gameplay

4 settings in `cluster.ini`, shown under **Gameplay** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game mode | `game_mode` in `[GAMEPLAY]` | How death works. Survival is the normal game: a player who dies becomes a ghost that friends can revive. The older Endless and Wilderness modes are now part of the world rules instead, and the game turns them into Survival. Choices: `survival` (Survival). Another value can be typed. |
| Players can hurt each other | `pvp` in `[GAMEPLAY]` | Lets players damage each other. |
| Pause when nobody is on | `pause_when_empty` in `[GAMEPLAY]` | Freezes the world while no one is connected, so no game time passes while everyone is away. The game's own default is off; the panel turns it on for a new server. |
| Player votes | `vote_enabled` in `[GAMEPLAY]` | Lets players start votes in the game, such as kicking someone or rolling the world back. |

### Don't Starve Together: Saving

2 settings in `cluster.ini`, shown under **Saving** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Autosave each day | `autosaver_enabled` in `[NETWORK]` | Saves the world at the end of every in-game day. Stopping the server from the panel does not use the game's own shutdown command, so this autosave is what keeps your progress: leave it on. |
| Rollback snapshots kept | `max_snapshots` in `[MISC]` | How many save snapshots are kept so the world can be rolled back. One is made at every save. |

### Don't Starve Together: Network

4 settings in `cluster.ini`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Offline server | `offline_cluster` in `[NETWORK]` | Not listed in the server list; only players on your own network can join, and Steam features do not work. An offline server needs no cluster token. To go online, turn this off and put your Klei cluster token (a single line of text) in a file named cluster_token.txt in this server's data\DoNotStarveTogether\Cluster_1 folder. |
| Local network only | `lan_only_cluster` in `[NETWORK]` | Only machines on the same local network can join. |
| Network updates per second | `tick_rate` in `[NETWORK]` | How many times a second the server sends updates to players. The game's default is 15 and Klei says to leave it; if you change it, use a number that divides 60 evenly (15, 20 or 30) and only for games on a local network. 15 to 60 is accepted. |
| Slots kept for the whitelist | `whitelist_slots` in `[NETWORK]` | How many places are kept free for the players listed in whitelist.txt. It does not make the server whitelist-only; use a password for that. |

### Don't Starve Together: Steam group

3 settings in `cluster.ini`, shown under **Steam group** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Steam group members only | `steam_group_only` in `[STEAM]` | Only members of the Steam group named below may join. |
| Steam group id | `steam_group_id` in `[STEAM]` | The number of the Steam group the two settings around it use. |
| Steam group admins are server admins | `steam_group_admins` in `[STEAM]` | Lets the admins of that Steam group be admins on this server too. |

### Don't Starve Together: Advanced

1 setting in `cluster.ini`, shown under **Advanced** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server console | `console_enabled` in `[MISC]` | Lets Lua commands be typed into the server's console window. The panel also starts the game with the -console argument. |

## Icarus

Icarus keeps the server's options in `Icarus\Saved\Config\WindowsServer\ServerSettings.ini` inside the server's install folder. The server's name and ports are given on the command that starts it (the **Launch options**).

- `ServerSettings.ini`: The join and admin passwords, the player limit, when an idle server goes back to its lobby, who may start and delete worlds, and which world opens at start.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#icarus).

Difficulty and hardcore are not in any file. They belong to a world and are chosen when it is created: in the game's lobby, or in the `CreateProspect` setting (`<world type> <difficulty 1-4> <hardcore true/false> <save name>`).
The server's name is set by the `-SteamServerName` launch argument. `SessionName` in the settings file is documented as doing nothing.
Icarus has no remote console the panel can use. Admin commands (kick, ban, return to lobby) are typed in the game's chat after `/AdminLogin <password>`.

### Icarus: Server

2 settings in `ServerSettings.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Session name (does not work) | `SessionName` in `[/Script/Icarus.DedicatedServerSettings]` | Meant to be the server's name in the server browser, but the developers say it currently does nothing. The name comes from the -SteamServerName launch argument instead (Launch options). |
| Max players | `MaxPlayers` in `[/Script/Icarus.DedicatedServerSettings]` | The most players that can be on the server at once. The official guide documents 1 to 8. A higher number may be accepted, but that has not been confirmed, and more players make the server heavier. |

### Icarus: Access

2 settings in `ServerSettings.ini`, shown under **Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Join password | `JoinPassword` in `[/Script/Icarus.DedicatedServerSettings]` | What players type to join. Leave empty for a server anyone can join. |
| Admin password | `AdminPassword` in `[/Script/Icarus.DedicatedServerSettings]` | Players type /AdminLogin followed by this password in the game's chat to become admin and use the kick, ban and return-to-lobby commands. If it is empty, anyone can become admin, so set one. |

### Icarus: Idle behaviour

2 settings in `ServerSettings.ini`, shown under **Idle behaviour** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Back to lobby if nobody joins (seconds) | `ShutdownIfNotJoinedFor` in `[/Script/Icarus.DedicatedServerSettings]` | After a world starts, if no player joins within this many seconds the world is closed and the server goes back to its lobby (the game is paused meanwhile). A negative number never does this and 0 does it at once. 300 is 5 minutes. |
| Back to lobby when empty (seconds) | `ShutdownIfEmptyFor` in `[/Script/Icarus.DedicatedServerSettings]` | After the last player leaves, the server waits this many seconds, then closes the world and goes back to its lobby (the game is paused meanwhile). A negative number never does this and 0 does it at once. 300 is 5 minutes. |

### Icarus: Lobby permissions

2 settings in `ServerSettings.ini`, shown under **Lobby permissions** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Anyone can start worlds | `AllowNonAdminsToLaunchProspects` in `[/Script/Icarus.DedicatedServerSettings]` | On: anyone in the lobby can create a new world or open a saved one. Off: only players who have signed in as admin can. |
| Anyone can delete worlds | `AllowNonAdminsToDeleteProspects` in `[/Script/Icarus.DedicatedServerSettings]` | On: anyone in the lobby can delete saved worlds from the server. Off: only players who have signed in as admin can. |

### Icarus: World at startup

4 settings in `ServerSettings.ini`, shown under **World at startup** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Resume the last world at start | `ResumeProspect` in `[/Script/Icarus.DedicatedServerSettings]` | On: when the server starts it reopens the last world it ran (the one named under 'Last world used') and skips the lobby. Off: it waits in the lobby for someone to pick a world. |
| Open this saved world at start | `LoadProspect` in `[/Script/Icarus.DedicatedServerSettings]` | The name of a saved world to open when the server starts. It is looked up among the server's saved worlds. Leave empty to not force one. |
| Create this world at start | `CreateProspect` in `[/Script/Icarus.DedicatedServerSettings]` | Makes and starts a brand-new world when the server starts. Written as four parts separated by spaces: world type, difficulty (1 easy to 4 extreme), hardcore (true or false, true means no respawns) and a save name, for example Tier1_Forest_Recon_0 3 false MyWorld. The save name is required for outposts. The server handles LoadProspect first, then ResumeProspect, then this; a hosting guide warns that leaving it set can make a fresh world each time the server starts, so clear it after the first start. |
| Last world used | `LastProspectName` in `[/Script/Icarus.DedicatedServerSettings]` | The world that ran most recently. The server fills this in itself, and 'Resume the last world at start' reads it. Only change it while the server is stopped, and only to the name of a saved world that exists. |

## SCUM

SCUM keeps its settings in `SCUM\Saved\Config\WindowsServer\ServerSettings.ini` inside the server's install folder. Every setting is a `scum.<Name>=<value>` line under one of six sections (General, World, Respawn, Vehicles, Damage, Features). The launch line only gives the game port, the player limit and a few switches.

- `ServerSettings.ini`: The server's name, password, player limit and the rules of the world: zombies, animals, loot, respawn, vehicles, damage, base building, raid protection, skills and quests.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#scum).

The game reads the file only when it starts, and a running server can write over changes made to it, so stop the server before editing.
The player and admin lists (`AdminUsers.ini`, `ExclusiveUsers.ini`, `WhitelistedUsers.ini`, `BannedUsers.ini`), the trader prices (`EconomyOverride.json`), the raid windows (`RaidTimes.json`), the scheduled messages (`Notifications.json`) and the `Loot` folder are in the same folder. The Settings tab does not edit them.
SCUM has no official mod support (the developer said on 30 September 2026 that it will not arrive in 2026). Loot, trader and raid-time changes are made with those files.
The game changes its list of settings about once a month. A setting the file has that the panel does not explain is still shown.

### SCUM: General: Server identity & access

7 settings in `ServerSettings.ini`, shown under **General: Server identity & access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `scum.ServerName` | The name shown in the server browser. The panel fills it in with the name you typed when it created the server. Default: SCUM Server. |
| Server password | `scum.ServerPassword` | The password players type to join. Leave it empty for a server anyone can join. |
| Max players | `scum.MaxPlayers` | The most players that can be connected at once. The -MaxPlayers launch option on the start line overrides this value, and the panel puts it there when it creates the server, so change it under Launch options as well. Default 64, range 1 to 128. |
| PlaySafe ID protection | `scum.PlaySafeIdProtection` | Allows only players who have verified their identity, linked their account, and are not currently banned on PlaySafe ID to join the server. |
| Welcome message | `scum.WelcomeMessage` | Message displayed on every server join. |
| Message of the day | `scum.MessageOfTheDay` | A message shown to players over and over, at the interval set by the message of the day cooldown. |
| Message of the day cooldown | `scum.MessageOfTheDayCooldown` | Interval at which the message of the day is displayed. Default 10 minutes, range 10 to 720 minutes. |

### SCUM: General: Performance & connection

5 settings in `ServerSettings.ini`, shown under **General: Performance & connection** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Min server tick rate | `scum.MinServerTickRate` | How many times a second the server updates the world while nobody is connected. Default 5 Hz, range 1 to 1000 Hz. |
| Max server tick rate | `scum.MaxServerTickRate` | How many times a second the server updates the world while at least one player is connected. Higher is smoother but uses more CPU. Default 30 in current guides (an older guide recommended up to 35), range 1 to 1000 Hz. |
| Max ping check enabled | `scum.MaxPingCheckEnabled` | Max Ping Value will be respected only if this is switched on. |
| Max ping | `scum.MaxPing` | Maximum ping before player is denied access to the server or kicked. Default 400 ms, range 10 to 999 ms. |
| Max number of consecutive high ping readings | `scum.MaxNumberOfConsecutiveHighPingReadings` | Number of consecutive high ping readings required before a player is kicked from the server. Default 5, range 1 to 100. |

### SCUM: General: Logout timers

3 settings in `ServerSettings.ini`, shown under **General: Logout timers** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Logout timer | `scum.LogoutTimer` | Time in seconds before player disappears from the game world when logging out. Default 60 seconds, range 1 to 600 seconds. |
| Logout timer while captured | `scum.LogoutTimerWhileCaptured` | Time in seconds before player disappears from the game world when logged out when tied up. Default 120 seconds, range 1 to 600 seconds. |
| Logout timer in bunker | `scum.LogoutTimerInBunker` | Time in seconds before player disappears from the game world when logging out if in the bunker. Default 30000 seconds, range 1 to 36000 seconds. |

### SCUM: General: Player options

13 settings in `ServerSettings.ini`, shown under **General: Player options** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow first person | `scum.AllowFirstPerson` | Whether first person view is allowed (on = allowed). |
| Allow third person | `scum.AllowThirdPerson` | Whether third person view is allowed (on = allowed). |
| Allow crosshair | `scum.AllowCrosshair` | Whether the crosshair is allowed (on = allowed). |
| Allow map screen | `scum.AllowMapScreen` | Whether players are allowed to view the map screen (on = allowed). |
| Allow kill claiming | `scum.AllowKillClaiming` | Whether BCU drop is allowed after a player is killed (on = allowed). |
| Allow coma | `scum.AllowComa` | Whether players can fall into a coma before death, for example, to be revived (on = allowed). |
| Allow mines and traps | `scum.AllowMinesAndTraps` | Whether mines or traps can be used (on = allowed). |
| Allow skill gain in safe zones | `scum.AllowSkillGainInSafeZones` | Whether experience points can be earned in safe zones (e.g., merchant zone) (on = allowed). |
| Allow events | `scum.AllowEvents` | Whether events are allowed on the server (on = allowed) (Event tab is still displayed when deactivated, but is empty). |
| Hide kill notification | `scum.HideKillNotification` | Switch on to hide the notification shown to players who kill each other. |
| Disable examine ghost | `scum.DisableExamineGhost` | Switch on to stop the ghost that can surprise players when they search item containers. |
| Disable timed gifts | `scum.DisableTimedGifts` | Whether time-based gifts should be deactivated (e.g. gifts at Christmas) (on = deactivated). |
| Enable spawn on ground | `scum.EnableSpawnOnGround` | When on, players skip the parachute jump and spawn on the ground. |

### SCUM: General: Voting

4 settings in `ServerSettings.ini`, shown under **General: Voting** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow voting | `scum.AllowVoting` | Whether players are allowed to participate in votes (on = allowed). |
| Voting duration | `scum.VotingDuration` | Duration for a vote. Default 60 seconds, range 30 to 600 seconds. |
| Minimum share of players who must vote | `scum.PlayerMinimalVotingInterest` | What percentage of online players must vote for a vote to be valid (0.5=50%). Default 0.5, range 0 to 1. |
| Share of yes votes needed | `scum.PlayerPositiveVotePercentage` | What proportion of votes must be yes for a referendum to be accepted (0.5=50%). Default 0.5, range 0 to 1. |

### SCUM: General: Chat

5 settings in `ServerSettings.ini`, shown under **General: Chat** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Limit global chat | `scum.LimitGlobalChat` | Whether the global chat can only be used by admins or by any player (on = admins only). |
| Allow global chat | `scum.AllowGlobalChat` | Whether the global chat is usable (on = usable). |
| Allow local chat | `scum.AllowLocalChat` | Whether the local chat is usable (on = usable). |
| Allow squad chat | `scum.AllowSquadChat` | Whether the Squad Chat is usable (on = usable). |
| Allow admin chat | `scum.AllowAdminChat` | Whether the admin chat is usable (on = usable). |

### SCUM: General: Cleanup & logging

8 settings in `ServerSettings.ini`, shown under **General: Cleanup & logging** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Rusty locks logging | `scum.RustyLocksLogging` | Enable log for rusty locks (10 second locks in the world) (on = log enabled). |
| Log suicides | `scum.LogSuicides` | Whether a log of suicides should be created (on = Create log). |
| Delete inactive users | `scum.DeleteInactiveUsers` | Whether inactive players should be automatically deleted after the following time at server start (on = Inactive players are deleted). |
| Days since last login to become inactive | `scum.DaysSinceLastLoginToBecomeInactive` | Days after which a player is considered inactive. Default 180 days, range 1 to 3600 days. |
| Delete banned users | `scum.DeleteBannedUsers` | Whether banned players should be deleted at server start (on = banned players are deleted). |
| Maximum time for chests in forbidden zones | `scum.MaximumTimeForChestsInForbiddenZones` | Time chests are allowed to exist in forbidden zones (e.g. merchants) (despawn is applied if no player is nearby). Default 02:00:00, range 00:00:00 to 2400:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Log chest ownership | `scum.LogChestOwnership` | Whether a log of chest owners should be kept (on = log is created). |
| Delete duplicate chests on server startup | `scum.DeleteDuplicateChestsOnServerStartup` | When on, duplicated chests are deleted each time the server starts. |

### SCUM: General: Base building rules

3 settings in `ServerSettings.ini`, shown under **General: Base building rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Use map base building restriction | `scum.UseMapBaseBuildingRestriction` | Restricts base building in certain map areas (for example near points of interest). Must be on for the building proximity restrictions to take effect. |
| Disable base building | `scum.DisableBaseBuilding` | Whether base building should be completely banned (on = banned). |
| Use building proximity restrictions | `scum.UseBuildingProximityRestrictions` | Stops structures being placed too close to each other or to restricted areas. Only works while the map base building restriction is on. |

### SCUM: General: Wipes

3 settings in `ServerSettings.ini`, shown under **General: Wipes** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Partial wipe | `scum.PartialWipe` | Switch on to run a partial wipe the next time the server starts: world progress is reset, character development is not. The server switches it back off by itself afterwards. Stop the server and back up before using it. |
| Gold wipe | `scum.GoldWipe` | Switch on to delete every player's gold the next time the server starts. The server switches it back off by itself afterwards. Stop the server and back up before using it. |
| Full wipe | `scum.FullWipe` | Switch on to run a full wipe the next time the server starts. The server switches it back off by itself afterwards. This cannot be undone, so stop the server and back up before using it. |

### SCUM: General: Fame

4 settings in `ServerSettings.ini`, shown under **General: Fame** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Fame gain multiplier | `scum.FameGainMultiplier` | Multiplier for earning fame points (>1=more fame, between 0 and 1 for less fame). Default 1, range 0 to 1000. 1 keeps the normal amount. |
| Fame point penalty on death | `scum.FamePointPenaltyOnDeath` | What percentage of fame points a player loses upon death (excluding PvP) (0.1=10% of his fame points). Default 0.1, range 0 to 1. |
| Fame point penalty on killed | `scum.FamePointPenaltyOnKilled` | What percentage of fame points a player loses when killed by another player (0.5=50% of his fame points). Default 0.5, range 0 to 1. |
| Fame point reward on kill | `scum.FamePointRewardOnKill` | What percentage of the killed player's fame points a player receives (0.25=25% of the killed player's fame points). Default 0.25, range 0 to 1. |

### SCUM: General: Settings file

1 setting in `ServerSettings.ini`, shown under **General: Settings file** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Settings file version (do not change) | `scum.ServerSettingsVersion` | The version number of this settings file, kept up to date by the game. Do not change it. Default 7. |

### SCUM: World: Puppets (zombies) & population caps

14 settings in `ServerSettings.ini`, shown under **World: Puppets (zombies) & population caps** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Max allowed characters | `scum.MaxAllowedCharacters` | The most characters (players, NPCs, mechs, animals and puppets) allowed in the world at once, not counting high-threat zones. -1 uses the game's own value, which is 128. Range -1 to 1024. |
| Max allowed puppets | `scum.MaxAllowedPuppets` | Maximum number of zombies that can exist at the same time. Range -1 to 1024. |
| Max allowed armed NPCs | `scum.MaxAllowedNPCs` | Maximum number of NPCs that can exist simultaneously (Armed NPCs). Range -1 to 512. |
| Max allowed drones | `scum.MaxAllowedDrones` | Maximum permitted drones in the world. Default 0, range 0 to 40. |
| Disable suicide puppet spawning | `scum.DisableSuicidePuppetSpawning` | Whether explosive puppets should be deactivated (on = no explosive puppets). |
| Disable loot puppet spawning | `scum.DisableLootPuppetSpawning` | Disables loot puppet spawning when switched on. |
| Enable loot puppet horde | `scum.EnableLootPuppetHorde` | Enables the horde that spawns when a loot puppet dies when switched on. |
| Puppets can open doors | `scum.PuppetsCanOpenDoors` | Whether zombies can open doors (on = Puppets can open doors). |
| Puppets can vault windows | `scum.PuppetsCanVaultWindows` | Whether zombies can jump through windows (on = Puppets can jump through windows). |
| Puppet health multiplier | `scum.PuppetHealthMultiplier` | Puppet health multiplier (higher values = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Puppet running speed multiplier | `scum.PuppetRunningSpeedMultiplier` | How fast puppets (zombies) run: above 1 is faster, below 1 is slower. Default 1, range 0.5 to 2. |
| Puppet cull distance override | `scum.PuppetCullDistanceOverride` | Specifies the maximum distance in meters at which puppets are rendered to connected clients. Range 0 to 1000 m. -1 usually means the game uses its own built-in value. |
| Puppet world encounter spawn weight multiplier | `scum.PuppetWorldEncounterSpawnWeightMultiplier` | Multiplier for the spawn weight of puppets in an encounter. Default 1, range 0 to 1000. |
| Puppet limping health threshold | `scum.PuppetLimpingHealthThreshold` | The health level below which puppets (zombies) start limping. -1 or 0 turns limping off, 0.2 limps below 20% health (the usual behaviour), 0.7 below 70%, and 1 means always limping. Replaces the old PuppetLimpingEnabled setting. Range -1 to 1. |

### SCUM: World: Dropships, mechs & base-building raids

14 settings in `ServerSettings.ini`, shown under **World: Dropships, mechs & base-building raids** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Disable sentry spawning | `scum.DisableSentrySpawning` | Whether Mech spawning should be disabled (on = no Mechs). |
| Enable sentry respawning | `scum.EnableSentryRespawning` | Whether mechs can respawn at POIs through dropship drops, but does not affect general respawning of mechs (on = respawn possible). |
| Dropship health multiplier | `scum.DropshipHealthMultiplier` | Dropship health multiplier (higher values = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Sentry health multiplier | `scum.SentryHealthMultiplier` | Mech Health Multiplier (Higher values = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Base building attacker sentry health multiplier | `scum.BaseBuildingAttackerSentryHealthMultiplier` | Multiplier for Mech health of the Mech that can be dropped from a dropship during base building (Higher values = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Dropship world encounter spawn weight multiplier | `scum.DropshipWorldEncounterSpawnWeightMultiplier` | Multiplier for the spawn weight of dropships in an encounter. Default 1, range 0 to 1000. |
| Base building encounter trigger chance | `scum.BaseBuildingEncounterTriggerChance` | Chance for a dropship spawn during base building (percent chance, -1 is default and means 7.5%). Range 0 to 100. |
| Base building encounter trigger time multiplier | `scum.BaseBuildingEncounterTriggerTimeMultiplier` | Multiplier of the time of player activity at the base before dropship encounter can happen (default value=900s player activity/ 1800s-2700s spawn after spawn fail/ 28800s-36000s cooldown after base building encounter). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Enable dropship base building encounter | `scum.EnableDropshipBaseBuildingEncounter` | Whether dropships can spawn during base building (on = spawn possible). |
| Base building raid: elements needed to start | `scum.BaseBuildingEncounterMinNumElementsToStart` | Total number of base building elements where a Dropship Encounter can start (-1=default value 100). Range 0 to 1000. |
| Base building raid: elements left to end | `scum.BaseBuildingEncounterMinNumElementsToEnd` | Total number of base building elements at which the Dropship Encounter ends (-1=default value 50). Range 0 to 1000. |
| Base building encounter damage percentage increase per squad member | `scum.BaseBuildingEncounterDamagePercentageIncreasePerSquadMember` | Increases the damage to base building elements in a Dropship Encounter by this percentage per squad member (except the first) (50=Dropship does 50% more damage to base building elements). Default 0, range 0 to 100. |
| Base building raid: days until it ends | `scum.BaseBuildingEncounterTimeToFullMinNumToEnd` | Time in days after which a base building Encounter finally ends when the minimum number of base building elements is reached (default -1 = 3 days). Range -1 to 30. |
| Base building raid: most reduction of elements to end | `scum.BaseBuildingEncounterMaximumMinToEndReduction` | Reduction of the minimum number of base building elements that must be destroyed at the beginning of a base building encounter (default = 0, so no reduction). Range -1 to 1000. |

### SCUM: World: Bunkers & keycards

16 settings in `ServerSettings.ini`, shown under **World: Bunkers & keycards** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Abandoned bunker commotion threshold | `scum.AbandonedBunkerCommotionThreshold` | Basic threshold for noise generated in the bunker, above which the bunker reacts (noises such as shaft rattling, etc.). Range 0 to 1000. -1 usually means the game uses its own built-in value. |
| Abandoned bunker commotion threshold per player extra | `scum.AbandonedBunkerCommotionThresholdPerPlayerExtra` | Additional threshold at which the bunker reacts, for noise generated per player in the bunker (except the first) (Base Threshold + Extra Threshold). Range 0 to 1000. -1 usually means the game uses its own built-in value. |
| Abandoned bunker enemy activation threshold | `scum.AbandonedBunkerEnemyActivationThreshold` | Base threshold for generated noise in the bunker, from which Razors spawn from the shafts. Range 0 to 1000. -1 usually means the game uses its own built-in value. |
| Abandoned bunker enemy activation threshold per player extra | `scum.AbandonedBunkerEnemyActivationThresholdPerPlayerExtra` | Additional threshold at which Razors spawn for noise generated per player in the bunker (except the first one) (Base Threshold + Extra Threshold). Range 0 to 1000. -1 usually means the game uses its own built-in value. |
| Abandoned bunker reset armory lockers on activation only | `scum.AbandonedBunkerResetArmoryLockersOnActivationOnly` | Armory rooms in abandoned bunkers are only reset when activated (naturally or by keycard) when this is switched on. |
| Enable dropship abandoned bunker encounter | `scum.EnableDropshipAbandonedBunkerEncounter` | Whether dropships can spawn at abandoned bunkers (on = spawn possible). |
| Dropship abandoned bunker encounter trigger chance | `scum.DropshipAbandonedBunkerEncounterTriggerChance` | Chance for a dropship spawn at Abandoned Bunker Alarms (percent chance, -1 is default and means 50%). Range 0 to 100. |
| Max allowed killbox keycards | `scum.MaxAllowedKillboxKeycards` | Maximum number of keycards that can be found in total (police stations + radiation zone). Default 4, range 0 to 1024. |
| Max allowed killbox keycards - police station | `scum.MaxAllowedKillboxKeycards_PoliceStation` | Maximum number of keycards that can be found in police stations. Default 3, range 0 to 1024. |
| Max allowed apex facility keycards | `scum.MaxAllowedApexFacilityKeycards` | Maximum number of Apex Facility keycards that can be found in total (police stations + Radiation Zone). Default 4, range 0 to 1024. |
| Max allowed apex facility keycards - police station | `scum.MaxAllowedApexFacilityKeycards_PoliceStation` | Maximum number of Apex Facility keycards that can be found in police stations. Default 3, range 0 to 1024. |
| Abandoned bunker max simultaneously active | `scum.AbandonedBunkerMaxSimultaneouslyActive` | Maximum number of abandoned bunkers that can be active at the same time. Default 2, range 1 to 4. |
| Abandoned bunker active duration hours | `scum.AbandonedBunkerActiveDurationHours` | Duration in hours that abandoned bunkers remain active after natural activation. Default 24, range 0 to 720. |
| Abandoned bunker key card active duration hours | `scum.AbandonedBunkerKeyCardActiveDurationHours` | Duration in hours that abandoned bunkers remain active after activation by keycard. Default 3, range 0 to 720. |
| Abandoned bunker BCU terminal cooldown | `scum.AbandonedBunkerBCUTerminalCooldown` | Modify the cooldown (in HH : MM : SS) of BCU terminals in abandoned bunkers. Default 24:00:00, range 00:00:01 to 2400:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Secret bunker key card active duration hours | `scum.SecretBunkerKeyCardActiveDurationHours` | Duration in hours that secret bunkers remain active after activation by keycard. Default 0.5, range 0 to 720. |

### SCUM: World: Armed NPCs

10 settings in `ServerSettings.ini`, shown under **World: Armed NPCs** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Armed NPC difficulty level | `scum.ArmedNPCDifficultyLevel` | How hard armed NPCs are: it changes their accuracy and how often they attack. Default 2 (medium). Choices: `1` (Easy), `2` (Medium), `3` (Hard). |
| Armed NPC health multiplier | `scum.ArmedNPCHealthMultiplier` | Armed NPC max health multiplier (higher values = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Armed NPC damage multiplier | `scum.ArmedNPCDamageMultiplier` | Armed NPC max damage multiplier (higher values = NPCs deal more damage). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Armed NPC spread multiplier | `scum.ArmedNPCSpreadMultiplier` | Armed NPC max spread multiplier (bullet spread of firearms, higher values=more spread). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Armed NPC running speed multiplier | `scum.ArmedNPCRunningSpeedMultiplier` | How fast armed NPCs run: above 1 is faster, below 1 is slower. Default 1, range 0.5 to 2. |
| Armed NPC net cull distance override | `scum.ArmedNPCNetCullDistanceOverride` | Armed NPC net cull distance in meters (rendering to connected clients). Range 0 to 1000 m. -1 usually means the game uses its own built-in value. |
| Probability for armed NPC to drop item from hands when searched | `scum.ProbabilityForArmedNPCToDropItemFromHandsWhenSearched` | Chance that an NPC drops the weapon in their hand (0.4=40% chance for drop). Default 1, range 0 to 1. |
| Minimum durability of armed NPCs dropped item from hands | `scum.MinimumDurabilityOfArmedNPCsDroppedItemFromHands` | Durability of an item dropped from hands by an armed NPC will be randomly picked from a minimum - maximum interval (can't be higher than max value). Default 0.2, range 0 to 1. |
| Maximum durability of armed NPCs dropped item from hands | `scum.MaximumDurabilityOfArmedNPCsDroppedItemFromHands` | Durability of an item dropped from hands by an armed NPC will be randomly picked from a minimum - maximum interval. Default 0.3, range 0 to 1. |
| Armed NPC limping health threshold | `scum.ArmedNPCLimpingHealthThreshold` | The health level below which armed NPCs start limping. -1 turns limping off. Replaces the old ArmedNPCLimpingEnabled setting. Range -1 to 1. |

### SCUM: World: Animals, fishing & radiation

27 settings in `ServerSettings.ini`, shown under **World: Animals, fishing & radiation** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Animal net cull distance override | `scum.AnimalNetCullDistanceOverride` | Sets animal net cull distance override in meters (rendering to connected clients). Range 0 to 1000 m. -1 usually means the game uses its own built-in value. |
| Bear max health multiplier | `scum.BearMaxHealthMultiplier` | Bear maximum health multiplier (higher value = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Boar max health multiplier | `scum.BoarMaxHealthMultiplier` | Wild boar maximum health multiplier (higher value = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Chicken max health multiplier | `scum.ChickenMaxHealthMultiplier` | Multiplier for the maximum health of chickens (higher value = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Deer max health multiplier | `scum.DeerMaxHealthMultiplier` | Deer maximum health multiplier (higher value = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Donkey max health multiplier | `scum.DonkeyMaxHealthMultiplier` | Donkey maximum health multiplier (higher value = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Goat max health multiplier | `scum.GoatMaxHealthMultiplier` | Goat maximum health multiplier (higher value = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Horse max health multiplier | `scum.HorseMaxHealthMultiplier` | Multiplier for maximum horse health (higher value = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Rabbit max health multiplier | `scum.RabbitMaxHealthMultiplier` | Rabbit maximum health multiplier (higher value = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Wolf max health multiplier | `scum.WolfMaxHealthMultiplier` | Multiplier for the maximum health of wolves (higher value = more health). Default 1, range 0.01 to 100. 1 keeps the normal amount. |
| Max allowed killbox keycards - radiation zone | `scum.MaxAllowedKillboxKeycards_RadiationZone` | Maximum number of keycards that can be found in the Radiation Zone. Default 1, range 0 to 1024. |
| Max allowed apex facility keycards - radiation zone | `scum.MaxAllowedApexFacilityKeycards_RadiationZone` | Maximum number of Apex Facility keycards that can be found in the Radiation Zone. Default 1, range 0 to 1024. |
| Radiation enabled | `scum.RadiationEnabled` | Enables or disables the radiation mechanic on the server. |
| Are animals allowed in world | `scum.AreAnimalsAllowedInWorld` | Enables or disables animal spawning in the world. |
| Animal global density multiplier | `scum.AnimalGlobalDensityMultiplier` | Global multiplier for how many animals live on the map. Guides disagree on the default (0.5 or 1), so check the value in your file. Range 0 to 25. |
| Max non-virtual animals in world | `scum.MaxNonVirtualAnimalsInWorld` | The most animals that can be physically present in the world at the same time (not counting animals the game keeps in a lightweight stored state). Guides disagree on the default (500 or 800), so check the value in your file. Range 0 to 2500. |
| Bear prevalence multiplier | `scum.BearPrevalenceMultiplier` | Multiplier for bear spawn prevalence relative to other animals. Default 1, range 0 to 100. |
| Boar prevalence multiplier | `scum.BoarPrevalenceMultiplier` | Multiplier for boar spawn prevalence relative to other animals. Default 1, range 0 to 100. |
| Chicken prevalence multiplier | `scum.ChickenPrevalenceMultiplier` | Multiplier for chicken spawn prevalence relative to other animals. Default 1, range 0 to 100. |
| Deer prevalence multiplier | `scum.DeerPrevalenceMultiplier` | Multiplier for deer spawn prevalence relative to other animals. Default 1, range 0 to 100. |
| Donkey prevalence multiplier | `scum.DonkeyPrevalenceMultiplier` | Multiplier for donkey spawn prevalence relative to other animals. Default 1, range 0 to 100. |
| Goat prevalence multiplier | `scum.GoatPrevalenceMultiplier` | Multiplier for goat spawn prevalence relative to other animals. Default 1, range 0 to 100. |
| Horse prevalence multiplier | `scum.HorsePrevalenceMultiplier` | Multiplier for horse spawn prevalence relative to other animals. Default 1, range 0 to 100. |
| Rabbit prevalence multiplier | `scum.RabbitPrevalenceMultiplier` | Multiplier for rabbit spawn prevalence relative to other animals. Default 1, range 0 to 100. |
| Wolf prevalence multiplier | `scum.WolfPrevalenceMultiplier` | Multiplier for wolf spawn prevalence relative to other animals. Default 1, range 0 to 100. |
| Fishing high activity zone rotation time | `scum.FishingHighActivityZoneRotationTime` | Time in hours to trigger the activation of a new set of fishing high activity zones. Activation happens on server restart. Range 0 to 8760 hours. -1 usually means the game uses its own built-in value. |
| Fishing high activity zone amount | `scum.FishingHighActivityZoneAmount` | The percentage of fishing zones that are active as high-activity zones at once. -1 uses the game default, about 10%. Range -1 to 100. |

### SCUM: World: Encounters & hordes

33 settings in `ServerSettings.ini`, shown under **World: Encounters & hordes** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Encounter base character amount multiplier | `scum.EncounterBaseCharacterAmountMultiplier` | Multiplies the base character count in an encounter with the standard number per zone (LTZ (low-threat zone):1-2, MTZ (medium-threat zone):2-3, HTZ (high-threat zone):4-5) Example: Multiplier 3 for MTZ: between 3*2 and 3*3 puppets. Default 1, range 0 to 3. 1 keeps the normal amount. |
| Encounter extra character per player multiplier | `scum.EncounterExtraCharacterPerPlayerMultiplier` | Increases base character count in an encounter according to the formula: Standard number + (number of players - 1) * Extra number per player * Multiplier. Default 1, range 0 to 3. 1 keeps the normal amount. |
| Encounter extra character player cap multiplier | `scum.EncounterExtraCharacterPlayerCapMultiplier` | From which number of players the characters are no longer increased in an encounter (e.g.: Set this to 3 = From 3 players on the numbers of puppets in an encounter will remain the same). Default 1, range 0 to 3. 1 keeps the normal amount. |
| Encounter character respawn time multiplier | `scum.EncounterCharacterRespawnTimeMultiplier` | Time between respawns according to the formula base value * multiplier (HTZ (high-threat zone) - From 0 to 0.5sec/MTZ (medium-threat zone) - From 60 to 120sec/LTZ (low-threat zone) - From 60 to 120sec). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Encounter character respawn batch size multiplier | `scum.EncounterCharacterRespawnBatchSizeMultiplier` | Multiplier for the size of respawn waves in an encounter according to the formula base value * multiplier (HTZ (high-threat zone) - 0 / MTZ (medium-threat zone) - From 1 to 2 entities per wave / LTZ (low-threat zone) - From 1 to 2 entities per wave). Default 1, range 0 to 3. 1 keeps the normal amount. |
| Encounter character aggressive spawn chance override | `scum.EncounterCharacterAggressiveSpawnChanceOverride` | Percentage of characters that already spawn aggressively and attack the player directly (50=half of the zombies spawn aggressively). Range -1 to 100. |
| Encounter character AI noise response radius multiplier | `scum.EncounterCharacterAINoiseResponseRadiusMultiplier` | Distance multiplier for puppets that hear the alarm like a zombie scream from other puppets according to the formula base value*multiplier (HTZ (high-threat zone) - 20m / MTZ (medium-threat zone)-20m/LTZ (low-threat zone)-30m). Default 1, range 0 to 100. |
| Encounter horde group extra character per player multiplier | `scum.EncounterHordeGroupExtraCharacterPerPlayerMultiplier` | Increases the number of characters in a horde wave according to the formula: Standard number + (number of players - 1) * Extra number per player * Multiplier. Default 1, range 0 to 3. 1 keeps the normal amount. |
| Encounter horde group extra character player cap multiplier | `scum.EncounterHordeGroupExtraCharacterPlayerCapMultiplier` | From which number of players the characters of a horde wave are no longer increased (e.g.: Set this to 3 = From 3 players on the numbers of puppets in a horde wave will remain the same). Default 1, range 0 to 3. 1 keeps the normal amount. |
| Encounter horde extra character per player multiplier | `scum.EncounterHordeExtraCharacterPerPlayerMultiplier` | Increases total horde size according to formula: Standard number + (number of players - 1) * Extra number per player * Multiplier. Default 1, range 0 to 3. 1 keeps the normal amount. |
| Encounter horde extra character player cap multiplier | `scum.EncounterHordeExtraCharacterPlayerCapMultiplier` | From which number of players the characters of a horde are no longer increased (e.g.: Set this to 3 = From 3 players on the total number of puppets in a horde will remain the same). Default 1, range 0 to 3. 1 keeps the normal amount. |
| Encounter horde activation chance multiplier | `scum.EncounterHordeActivationChanceMultiplier` | Multiplier for the chance that an action that makes noise triggers a horde. Default 1, range 0 to 10000. 1 keeps the normal amount. |
| Encounter horde noise check cooldown multiplier | `scum.EncounterHordeNoiseCheckCooldownMultiplier` | Cooldown multiplier for how often checks are made after Horde trigger (higher values = rare checks after Horde trigger). Default 1, range 0 to 10000. 1 keeps the normal amount. |
| Encounter horde should play activation sound | `scum.EncounterHordeShouldPlayActivationSound` | Whether a sound should be played when a horde is triggered (on = sound is played). |
| Encounter horde puppet horde activation scream override chance | `scum.EncounterHordePuppetHordeActivationScreamOverrideChance` | Chance that a Puppet's scream activates a Horde (-1=default value of 20%). Range -1 to 100. |
| Encounter can remove low priority characters | `scum.EncounterCanRemoveLowPriorityCharacters` | Removes inactive puppets further away from the player to spawn new ones when spawn limit is reached (on = inactive puppets are removed). |
| Encounter: cut size at the spawn limit | `scum.EncounterCanClampCharacterNumWhenOutOfResources` | Can set the puppet count of an encounter to the minimum value if the spawn limit has been reached (on = number can be reduced if the limit has been reached). |
| Encounter character spawn distance min override low-threat zone | `scum.EncounterCharacterSpawnDistanceMinOverrideLTZ` | Determines the minimal character spawn distance from players; this applies to all LTZ (low-threat zone) encounters. Range 0 to 1000 m. -1 usually means the game uses its own built-in value. |
| Encounter character spawn distance max override low-threat zone | `scum.EncounterCharacterSpawnDistanceMaxOverrideLTZ` | Determines maximum character spawn distance from players; this applies to all LTZ (low-threat zone) encounters. Range 0 to 1100 m. -1 usually means the game uses its own built-in value. |
| Encounter character spawn distance min override large POI | `scum.EncounterCharacterSpawnDistanceMinOverrideLargePOI` | Determines the minimal character spawn distance from players; this applies to all large POI encounters. Range 0 to 200 m. -1 usually means the game uses its own built-in value. |
| Encounter character spawn distance max override large POI | `scum.EncounterCharacterSpawnDistanceMaxOverrideLargePOI` | Determines maximum character spawn distance from players; this applies to all large POI encounters. Range 0 to 220 m. -1 usually means the game uses its own built-in value. |
| Encounter character respawn distance min override low-threat zone | `scum.EncounterCharacterRespawnDistanceMinOverrideLTZ` | Determines the minimal character respawn distance from players; this applies for all LTZ (low-threat zone) encounters. Range 0 to 1000 m. -1 usually means the game uses its own built-in value. |
| Encounter character respawn distance max override low-threat zone | `scum.EncounterCharacterRespawnDistanceMaxOverrideLTZ` | Determines the maximum character respawn distance from players; this applies to all LTZ (low-threat zone) encounters. Range 0 to 1100 m. -1 usually means the game uses its own built-in value. |
| Encounter character respawn distance min override large POI | `scum.EncounterCharacterRespawnDistanceMinOverrideLargePOI` | Determines the minimal character respawn distance from players; this applies to all large POI encounters. Range 0 to 200 m. -1 usually means the game uses its own built-in value. |
| Encounter character respawn distance max override large POI | `scum.EncounterCharacterRespawnDistanceMaxOverrideLargePOI` | Determines maximum character respawn distance from players; this applies for all large POI encounters. Range 0 to 220 m. -1 usually means the game uses its own built-in value. |
| Encounter low-threat zone radius multiplier | `scum.EncounterLTZRadiusMultiplier` | Multiplies the effective size of LTZ (low-threat zone) encounters; by changing this, you can change the size of the area the encounter covers, giving you more area/distance to keep the characters owned by the encounter spawned. Default 1, range 1 to 10. 1 keeps the normal amount. |
| Encounter medium-threat zone radius multiplier | `scum.EncounterMTZRadiusMultiplier` | Multiplies the effective size of MTZ (medium-threat zone) encounters; by changing this, you can change the size of the area the encounter covers, giving you more area/distance to keep the characters owned by the encounter spawned. Default 1, range 1 to 10. 1 keeps the normal amount. |
| Encounter high-threat zone radius multiplier | `scum.EncounterHTZRadiusMultiplier` | Encounter radius multiplier (applied to ALL newly spawned encounters in high threat zones). Default 1, range 1 to 10. 1 keeps the normal amount. |
| Encounter virtualized time override | `scum.EncounterVirtualizedTimeOverride` | Overrides the time an encounter spends in a virtualized state before being destroyed. Range 0 to 60 minutes. -1 usually means the game uses its own built-in value. |
| Encounter zone activation distance multiplier | `scum.EncounterZoneActivationDistanceMultiplier` | Controls the distance from the edges of encounter zones (cities, POIs, ...) where encounters start being triggered. Default 1, range 0.1 to 10. 1 keeps the normal amount. |
| Encounter global zone cooldown multiplier | `scum.EncounterGlobalZoneCooldownMultiplier` | Multiplier for the cooldown time after an encounter has ended before a new encounter can occur (higher values = longer time between encounters). Default 1. 1 keeps the normal amount. |
| Encounter: no spawns near a killed player | `scum.EncounterEnableSpawnPreventionAreaSpawnOnCharacterDeath` | Prevents characters from spawning near a killed player (on = prevented). |
| Encounter never respawn characters | `scum.EncounterNeverRespawnCharacters` | Whether characters should only spawn at the beginning of an encounter and not respawn (on = no respawn). |

### SCUM: World: Misc

5 settings in `ServerSettings.ini`, shown under **World: Misc** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Spawn encounters in threat zones ignoring base building | `scum.SpawnEncountersInThreatZonesIgnoringBaseBuilding` | Whether encounters are allowed to spawn in HTZ (high-threat zone) and MTZ (medium-threat zone) zones if base building is allowed there (in LTZ (low-threat zone), spawning is always prohibited if base building is allowed). |
| Enable encounter manager low player count mode | `scum.EnableEncounterManagerLowPlayerCountMode` | Spawn behavior more in the direction of a pre-encounter manager (larger threat zones and more character spawns). WARNING: High server load, designed for single player! (Tested: Server RAM increased from 2GB to 9GB with 1 player). |
| Should destroy entities outside map limits on restart | `scum.ShouldDestroyEntitiesOutsideMapLimitsOnRestart` | Whether objects outside the map boundaries should be destroyed on server restart (on = objects are destroyed). |
| Enable locked loot containers | `scum.EnableLockedLootContainers` | Whether the lockers in the world should be locked or open (on = lockers are locked). |
| Garage doors can be locked | `scum.DoorLockability.Garage` | Whether garage doors can be locked with locks (off = cannot be locked). |

### SCUM: World: Time & light

6 settings in `ServerSettings.ini`, shown under **World: Time & light** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Start time of day | `scum.StartTimeOfDay` | Time of day (ingame) the server starts after a wipe. Default 08:00:00, range 00:00:00 to 23:59:59. Written as hours:minutes:seconds (HH:MM:SS). |
| Time of day speed | `scum.TimeOfDaySpeed` | How fast the in-game clock runs: higher values make days shorter. The default (3.84) gives days of about 6 real-time hours. Range 0 to 12. |
| Nighttime darkness | `scum.NighttimeDarkness` | Darkness of the night (Lower values = brighter night). Default 0, range 0 to 1. |
| Sunrise time | `scum.SunriseTime` | Sunrise time. Default 06:00:00, range 00:00:00 to 23:59:59. Written as hours:minutes:seconds (HH:MM:SS). |
| Sunset time | `scum.SunsetTime` | Sunset time. Default 21:00:00, range 00:00:00 to 23:59:59. Written as hours:minutes:seconds (HH:MM:SS). |
| Enable fog | `scum.EnableFog` | Renders various fogs on the island if this is switched on. |

### SCUM: World: Custom map area

5 settings in `ServerSettings.ini`, shown under **World: Custom map area** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Custom map enabled | `scum.CustomMapEnabled` | Whether a custom map limit (only part of the map playable) should be applied (on = map limit applied). |
| Custom map center x coordinate | `scum.CustomMapCenterXCoordinate` | Center of your own map area X-coordinate. Default 0, range -922896 to 637685. |
| Custom map center y coordinate | `scum.CustomMapCenterYCoordinate` | Center of your own map area Y-coordinate. Default 0, range -922896 to 619200. |
| Custom map width | `scum.CustomMapWidth` | Width of your map in kilometers. Default 15.24 km, range 0 to 15.24 km. |
| Custom map height | `scum.CustomMapHeight` | Height of your map in kilometers. Default 15.24 km, range 0 to 15.24 km. |

### SCUM: World: Cargo drops

7 settings in `ServerSettings.ini`, shown under **World: Cargo drops** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Cargo drop cooldown minimum | `scum.CargoDropCooldownMinimum` | Minimum time in minutes that must pass before a new Cargo Drop can spawn. Default 90 minutes, range 1 to 720 minutes. |
| Cargo drop cooldown maximum | `scum.CargoDropCooldownMaximum` | Maximum time in minutes that can pass until a new Cargo Drop can spawn. Default 120 minutes, range 1 to 720 minutes. |
| Cargo drop fall delay | `scum.CargoDropFallDelay` | Time in seconds until a CargoDrop starts falling after the announcement. Default 540 seconds, range 1 to 600 seconds. |
| Cargo drop fall duration | `scum.CargoDropFallDuration` | Time in seconds that a CargoDrop takes to fall to the ground. Default 60 seconds, range 1 to 600 seconds. |
| Cargo drop selfdestruct time | `scum.CargoDropSelfdestructTime` | Time in seconds until a CargoDrop explodes after spawning. Default 1200 seconds, range 1 to 3600 seconds. |
| Cargo drop zombie encounter weight multiplier | `scum.CargoDropZombieEncounterWeightMultiplier` | Multiplier for the chance of encountering zombies during a CargoDrop (base value of 1=Zombies 90% and Dropship 10%). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Cargo drop dropship encounter weight multiplier | `scum.CargoDropDropshipEncounterWeightMultiplier` | Multiplier for the chance of encountering a dropship during a cargo drop (base value of 1=Zombies 90% and Dropship 10%). Default 1, range 0 to 100. 1 keeps the normal amount. |

### SCUM: Respawn: Rules

5 settings in `ServerSettings.ini`, shown under **Respawn: Rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow sector respawn | `scum.AllowSectorRespawn` | Whether it is allowed to spawn in the sector (with enough money depending on the settings). |
| Allow shelter respawn | `scum.AllowShelterRespawn` | Whether it is allowed to spawn at the hideout (with enough money depending on the settings). |
| Allow squadmate respawn | `scum.AllowSquadmateRespawn` | Whether it is allowed to spawn with other squad members (with enough money depending on the settings). |
| Permadeath threshold | `scum.PermadeathThreshold` | Limit of negative account balance at which the player is deleted (permadeath). Default -2500, range -1000000 to 2147483646. |
| Cloning sickness enabled | `scum.CloningSicknessEnabled` | Enables or disables cloning sickness. |

### SCUM: Respawn: Prices

7 settings in `ServerSettings.ini`, shown under **Respawn: Prices** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Random respawn price | `scum.RandomRespawnPrice` | Price to respawn at a random point. Default 250, range 0 to 100000. |
| Sector respawn price | `scum.SectorRespawnPrice` | Price to respawn in a specific sector. Default 1000. A plain number is money; a number followed by g is gold (for example 2g). |
| Shelter respawn price | `scum.ShelterRespawnPrice` | Price to respawn at the hideout. Default 1g. A plain number is money; a number followed by g is gold (for example 2g). |
| Shelter respawn price outside flag area | `scum.ShelterRespawnPriceOutsideFlagArea` | Determines the price for the respawn on the shelters outside the flag area. Default 2g. A plain number is money; a number followed by g is gold (for example 2g). |
| Random price per squadmate modifier | `scum.RandomPricePerSquadmateModifier` | Multiplier for the random respawn price per squad member (e.g. price is 100, 3 squad members and multiplier is 1, so 100*(3x1)=300). Default 0, range 0 to 10. |
| Sector price per squadmate modifier | `scum.SectorPricePerSquadmateModifier` | Multiplier for the sector respawn price per squad member (e.g. price is 100, 3 squad members and multiplier is 1 so 100*(3x1)=300). Default 0, range 0 to 10. |
| Shelter price per squadmate modifier | `scum.ShelterPricePerSquadmateModifier` | Multiplier for the hideout respawn price per squad member (e.g. price is 100, 3 squad members and multiplier is 1 so 100*(3x1)=300). Default 0, range 0 to 10. |

### SCUM: Respawn: Timers

12 settings in `ServerSettings.ini`, shown under **Respawn: Timers** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Random respawn initial time | `scum.RandomRespawnInitialTime` | Waiting time until random respawn is possible after the first death. Default 0 seconds, range 0 to 18000 seconds. |
| Sector respawn initial time | `scum.SectorRespawnInitialTime` | Waiting time until the sector respawn is possible after the first death. Default 60 seconds, range 0 to 18000 seconds. |
| Shelter respawn initial time | `scum.ShelterRespawnInitialTime` | Waiting time until the hideout respawn is possible after the first death. Default 60 seconds, range 0 to 18000 seconds. |
| Squad respawn initial time | `scum.SquadRespawnInitialTime` | Waiting time until the squad member respawn is possible after the first death. Default 60 seconds, range 0 to 18000 seconds. |
| Random respawn cooldown | `scum.RandomRespawnCooldown` | Cooldown time for random spawn after multiple deaths (added to the standard waiting time). Default 0 seconds, range 0 to 18000 seconds. |
| Sector respawn cooldown | `scum.SectorRespawnCooldown` | Cooldown time for the sector spawn after multiple deaths (added to the standard waiting time). Default 240 seconds, range 0 to 18000 seconds. |
| Shelter respawn cooldown | `scum.ShelterRespawnCooldown` | Cooldown time for the hideout spawn after multiple deaths (added to the standard waiting time). Default 240 seconds, range 0 to 18000 seconds. |
| Squad respawn cooldown | `scum.SquadRespawnCooldown` | Cooldown time for squad member spawn after multiple deaths (added to the standard waiting time). Default 60 seconds, range 0 to 18000 seconds. |
| Random cooldown reset multiplier | `scum.RandomCooldownResetMultiplier` | The cooldown time is multiplied by this to get the time after which the cooldown is reset to its default value for random respawn. Default 0, range 0 to 10. |
| Sector cooldown reset multiplier | `scum.SectorCooldownResetMultiplier` | The cooldown time is multiplied by this to get the time after which the cooldown is reset to its default value for the sector respawn. Default 3, range 0 to 10. |
| Shelter cooldown reset multiplier | `scum.ShelterCooldownResetMultiplier` | The cooldown time is multiplied by this to get the time after which the cooldown is reset to its default value for the hideout respawn. Default 3, range 0 to 10. |
| Squad cooldown reset multiplier | `scum.SquadCooldownResetMultiplier` | The cooldown time is multiplied by this to get the time after which the cooldown is reset to its default value for the squad member respawn. Default 2, range 0 to 10. |

### SCUM: Respawn: Suicide

3 settings in `ServerSettings.ini`, shown under **Respawn: Suicide** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Commit suicide initial time | `scum.CommitSuicideInitialTime` | Waiting time until suicide is available. Default 0 seconds, range 0 to 18000 seconds. |
| Commit suicide cooldown | `scum.CommitSuicideCooldown` | Cooldown time for suicide after use. Default 60 seconds, range 0 to 18000 seconds. |
| Commit suicide cooldown reset multiplier | `scum.CommitSuicideCooldownResetMultiplier` | Multiplier for cooldown time after multiple uses before cooldown is reset. Default 1.25, range 0 to 10. |

### SCUM: Vehicles: Fuel & battery

6 settings in `ServerSettings.ini`, shown under **Vehicles: Fuel & battery** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Fuel drain from engine multiplier | `scum.FuelDrainFromEngineMultiplier` | Multiplier for fuel consumption of all engines. Default 1, range 0 to 10. |
| Battery drain from engine multiplier | `scum.BatteryDrainFromEngineMultiplier` | Multiplier for battery consumption of all engines. Default 1, range 0 to 10. |
| Battery drain from devices multiplier | `scum.BatteryDrainFromDevicesMultiplier` | Multiplier for battery consumption of all electrical devices. Default 1, range 0 to 10. |
| Battery drain from inactivity multiplier | `scum.BatteryDrainFromInactivityMultiplier` | Multiplier for battery consumption due to inactivity of a device or motor. Default 1, range 0 to 10. |
| Battery charge with alternator multiplier | `scum.BatteryChargeWithAlternatorMultiplier` | Multiplier for battery charging rate by alternator. Default 1, range 0 to 10. |
| Battery charge with dynamo multiplier | `scum.BatteryChargeWithDynamoMultiplier` | Multiplier for battery charging rate by generators. Default 1, range 0 to 10. |

### SCUM: Vehicles: Counts per type

36 settings in `ServerSettings.ini`, shown under **Vehicles: Counts per type** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Kinglet duster max amount | `scum.KingletDusterMaxAmount` | Maximum number of aircraft. Default 2, range 0 to 128. |
| Dirtbike max amount | `scum.DirtbikeMaxAmount` | Maximum number of motorcycles (dirt bikes). Default 20, range 0 to 128. |
| Dirtbike max functional amount | `scum.DirtbikeMaxFunctionalAmount` | Maximum number of motorcycles (dirt bikes) that work (with engine). Default 15, range 0 to 128. |
| Dirtbike min purchased amount | `scum.DirtbikeMinPurchasedAmount` | Minimum number of motorcycles (dirt bikes) available for sale at the dealer. Default 5, range 0 to 128. |
| Laika max amount | `scum.LaikaMaxAmount` | Maximum number of Laika. Default 50, range 0 to 128. |
| Laika max functional amount | `scum.LaikaMaxFunctionalAmount` | Maximum number of Laika that work (with engine). Default 20, range 0 to 128. |
| Laika min purchased amount | `scum.LaikaMinPurchasedAmount` | Minimum number of Laika available for sale at the dealer. Default 5, range 0 to 128. |
| Motorboat max amount | `scum.MotorboatMaxAmount` | Maximum number of boats (motorboat). Default 11, range 0 to 128. |
| Motorboat min purchased amount | `scum.MotorboatMinPurchasedAmount` | Minimum number of boats (motorboats) available for sale at the dealer. Default 5, range 0 to 128. |
| Wheelbarrow max amount | `scum.WheelbarrowMaxAmount` | Maximum number of wheelbarrows. Default 20, range 0 to 128. |
| Wheelbarrow min purchased amount | `scum.WheelbarrowMinPurchasedAmount` | Minimum number of wheelbarrows available for sale at the dealer. Default 10, range 0 to 128. |
| Wolfswagen max amount | `scum.WolfswagenMaxAmount` | Maximum number of Wolfswagen. Default 50, range 0 to 128. |
| Wolfswagen max functional amount | `scum.WolfswagenMaxFunctionalAmount` | Maximum number of Wolfswagen that work (with engine). Default 20, range 0 to 128. |
| Wolfswagen min purchased amount | `scum.WolfswagenMinPurchasedAmount` | Minimum number of Wolfswagen available for sale at the dealer. Default 5, range 0 to 128. |
| Bicycle max amount | `scum.BicycleMaxAmount` | Maximum number of bicycles. Default 20, range 0 to 128. |
| Bicycle min purchased amount | `scum.BicycleMinPurchasedAmount` | Minimum number of bicycles available for sale at the dealer. Default 5, range 0 to 128. |
| Rager max amount | `scum.RagerMaxAmount` | Maximum number of ragers. Default 50, range 0 to 128. |
| Rager max functional amount | `scum.RagerMaxFunctionalAmount` | Maximum number of working ragers (with engine). Default 20, range 0 to 128. |
| Rager min purchased amount | `scum.RagerMinPurchasedAmount` | Minimum number of Ragers available for sale at the dealer. Default 5, range 0 to 128. |
| Cruiser max amount | `scum.CruiserMaxAmount` | Maximum number of cruisers. Default 30, range 0 to 128. |
| Cruiser max functional amount | `scum.CruiserMaxFunctionalAmount` | Maximum number of cruisers that work (with engine). Default 20, range 0 to 128. |
| Cruiser min purchased amount | `scum.CruiserMinPurchasedAmount` | Minimum number of cruisers available for sale at the dealer. Default 5, range 0 to 128. |
| RIS quad max amount | `scum.RisMaxAmount` | Maximum number of quads (RIS). Default 50, range 0 to 128. |
| RIS quad max working amount | `scum.RisMaxFunctionalAmount` | Maximum number of quads (RIS) that work (with engine). Default 20, range 0 to 128. |
| RIS quad min for sale | `scum.RisMinPurchasedAmount` | Minimum number of quads (RIS) available for sale at the dealer. Default 5, range 0 to 128. |
| Dinghy max amount | `scum.DinghyMaxAmount` | Maximum amount of dinghies on the server. Default 14, range 0 to 128. |
| Dinghy min purchased amount | `scum.DinghyMinPurchasedAmount` | Minimum amount of Dinghies or dinghy engines available to buy. Default 5, range 0 to 128. |
| SUP max amount | `scum.SUPMaxAmount` | Maximum number of SUPs. Default 20, range 0 to 128. |
| SUP min purchased amount | `scum.SUPMinPurchasedAmount` | Minimum number of SUPs available for sale at the dealer. Default 5, range 0 to 128. |
| Kinglet mariner max amount | `scum.KingletMarinerMaxAmount` | Maximum number of seaplanes (Kinglet Mariner). Default 1, range 0 to 128. |
| Kinglet mariner min purchased amount | `scum.KingletMarinerMinPurchasedAmount` | Minimum number of seaplanes (Kinglet Mariner) available for sale at the dealer. Default 0, range 0 to 128. |
| Tractor max amount | `scum.TractorMaxAmount` | Maximum number of tractors. Default 50, range 0 to 128. |
| Tractor min purchased amount | `scum.TractorMinPurchasedAmount` | Minimum number of tractors available for sale at the dealer. Default 5, range 0 to 128. |
| Sidecar bike max amount | `scum.SidecarBikeMaxAmount` | Maximum amount of Sidecar bikes on the server. Default 25, range 0 to 128. |
| Sidecar bike max functional amount | `scum.SidecarBikeMaxFunctionalAmount` | Maximum amount of functional Sidecar bikes spawning. Default 15, range 0 to 128. |
| Sidecar bike min purchased amount | `scum.SidecarBikeMinPurchasedAmount` | Minimum amount of Sidecar bikes or Sidecar bike engines available to buy. Default 5, range 0 to 128. |

### SCUM: Vehicles: Cleanup & logging

3 settings in `ServerSettings.ini`, shown under **Vehicles: Cleanup & logging** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Maximum time of vehicle inactivity | `scum.MaximumTimeOfVehicleInactivity` | Time until a vehicle is considered inactive and removed from the world. Default 240:00:00, range 00:00:00 to 2400:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Maximum time for vehicles in forbidden zones | `scum.MaximumTimeForVehiclesInForbiddenZones` | Time that vehicles may remain in prohibited zones (e.g. dealers) before they are removed. Default 02:00:00, range 00:00:00 to 2400:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Log vehicle destroyed | `scum.LogVehicleDestroyed` | Whether a log should be created about the destroyed vehicles (on = log is created). |

### SCUM: Damage: Player damage

4 settings in `ServerSettings.ini`, shown under **Damage: Player damage** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Human to human damage multiplier | `scum.HumanToHumanDamageMultiplier` | Multiplier for damage between two people (higher = more damage) (also affects NPCs). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Human to human armed melee damage multiplier | `scum.HumanToHumanArmedMeleeDamageMultiplier` | Multiplier for damage between two people with melee weapons (higher = more damage) (also affects NPCs). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Human to human unarmed melee damage multiplier | `scum.HumanToHumanUnarmedMeleeDamageMultiplier` | Multiplier for damage between two people with fists (higher = more damage). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Human to human throwing damage multiplier | `scum.HumanToHumanThrowingDamageMultiplier` | Multiplier for damage between two people with thrown objects (higher = more damage). Default 1, range 0 to 10. 1 keeps the normal amount. |

### SCUM: Damage: Mechs, dropships & puppets

11 settings in `ServerSettings.ini`, shown under **Damage: Mechs, dropships & puppets** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Sentry damage multiplier | `scum.SentryDamageMultiplier` | Multiplier for damage caused by the sentries (higher = more damage). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Sentry railgun damage multiplier | `scum.SentryRailgunDamageMultiplier` | Multiplier for damage that sentries cause with their railgun (higher = more damage). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Sentry grenade damage multiplier | `scum.SentryGrenadeDamageMultiplier` | Multiplier for damage caused by sentries' grenades (higher = more damage). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Base building attacker sentry damage multiplier | `scum.BaseBuildingAttackerSentryDamageMultiplier` | Multiplier for damage that base building elements receive in an encounter (higher = more damage). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Base building attacker sentry railgun damage multiplier | `scum.BaseBuildingAttackerSentryRailgunDamageMultiplier` | Multiplier for damage that Mechs inflict with the rail gun in the base building Encounter (higher = more damage). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Base building attacker sentry grenade damage multiplier | `scum.BaseBuildingAttackerSentryGrenadeDamageMultiplier` | Multiplier for damage caused by mechs with grenades in base building encounters (higher = more damage). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Sentry base building damage multiplier | `scum.SentryBaseBuildingDamageMultiplier` | Multiplier for damage caused by Mechs in base building Encounters (higher = more damage). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Dropship damage multiplier | `scum.DropshipDamageMultiplier` | Multiplier for damage that dropships cause to characters (higher = more damage). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Dropship railgun damage multiplier | `scum.DropshipRailgunDamageMultiplier` | Multiplier for damage caused by a dropship's rail gun (higher = more damage). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Dropship base building elements damage multiplier | `scum.DropshipBaseBuildingElementsDamageMultiplier` | Multiplier for damage that dropships cause to base building elements (higher = more damage). Default 1, range 0 to 100. 1 keeps the normal amount. |
| Zombie damage multiplier | `scum.ZombieDamageMultiplier` | Multiplier for damage caused by zombies (higher = more damage). Default 1, range 0 to 10. 1 keeps the normal amount. |

### SCUM: Damage: Decay & locks

4 settings in `ServerSettings.ini`, shown under **Damage: Decay & locks** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Item decay damage multiplier | `scum.ItemDecayDamageMultiplier` | Multiplier for the damage that items gradually receive (higher = items decay faster) (value 1.0= roughly 1.4% decay per 24 hours). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Food decay damage multiplier | `scum.FoodDecayDamageMultiplier` | Food decay multiplier (higher = food decays faster). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Weapon decay damage on firing | `scum.WeaponDecayDamageOnFiring` | Multiplier for the wear and tear of a weapon when firing (higher = weapons wear out faster). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Lock protection damage multiplier | `scum.LockProtectionDamageMultiplier` | Multiplier for the damage caused by locks (higher = more damage) (excluding killbox locks). Default 1, range 0 to 10. 1 keeps the normal amount. |

### SCUM: Features: Flags & base building

26 settings in `ServerSettings.ini`, shown under **Features: Flags & base building** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Flag overtake duration | `scum.FlagOvertakeDuration` | How long it takes to capture an enemy flag. Default 24:00:00, range 00:00:01 to 2400:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Maximum amount of elements per flag | `scum.MaximumAmountOfElementsPerFlag` | Maximum number of base elements that can be built per flag. Default 100, range 1 to 9999. |
| Extra elements per flag for additional squad member | `scum.ExtraElementsPerFlagForAdditionalSquadMember` | Additional elements that can be built per flag per squad member except the first. Default 25, range 1 to 100. |
| Maximum number of expanded elements per flag | `scum.MaximumNumberOfExpandedElementsPerFlag` | By how many elements the total number of possible elements can be expanded using base expansion kits. Default 75, range 1 to 500. |
| Allow multiple flags per player | `scum.AllowMultipleFlagsPerPlayer` | Whether players may build multiple flags or only one (on = multiple flags possible). |
| Allow flags on base building pieces | `scum.AllowFlagPlacementOnBBElements` | Whether flags may be built on base building elements (on = flags on base elements possible). |
| Chest acquisition duration | `scum.ChestAcquisitionDuration` | Time before an enemy chest becomes your property if it is in your flag area. Default 24, range 0 to 9999. |
| Weapon rack max amount per flag area | `scum.WeaponRackMaxAmountPerFlagArea` | Maximum number of weapon racks per flag area. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Weapon rack start decaying if flag area has more than | `scum.WeaponRackStartDecayingIfFlagAreaHasMoreThan` | Weapon racks start to decay faster when there are more than X per flag area. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Wall weapon rack max amount per flag area | `scum.WallWeaponRackMaxAmountPerFlagArea` | Maximum number of wall weapon racks per flag area. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Wall weapon rack start decaying if flag area has more than | `scum.WallWeaponRackStartDecayingIfFlagAreaHasMoreThan` | Wall weapon racks start to decay faster when there are more than X per flag area. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Well max amount per flag area | `scum.WellMaxAmountPerFlagArea` | Maximum number of wells per flag area. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Well start decaying if flag area has more than | `scum.WellStartDecayingIfFlagAreaHasMoreThan` | Wells begin to decay when there are more than X per flag area. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Turret max amount per flag area | `scum.TurretMaxAmountPerFlagArea` | Maximum number of turrets per flag area. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Turret start decaying if flag area has more than | `scum.TurretStartDecayingIfFlagAreaHasMoreThan` | Turrets start to decay faster if there are more than X per flag area. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Oven max amount per flag area | `scum.OvenMaxAmountPerFlagArea` | Determines the maximum number of ovens per flag area. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Oven start decaying if flag area has more than | `scum.OvenStartDecayingIfFlagAreaHasMoreThan` | Determines the maximum number of ovens per flag area before they start decaying at an increased pace. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Garden max amount per flag area | `scum.GardenMaxAmountPerFlagArea` | Maximum number of gardens per flag area. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Allow floor placement on half and low walls | `scum.AllowFloorPlacementOnHalfAndLowWalls` | Allows placing floors on half-height or low walls (on = allowed). |
| Allow wall placement on half and low walls | `scum.AllowWallPlacementOnHalfAndLowWalls` | Allows placing walls on half-height or low walls (on = allowed). |
| Base building destruction log damage threshold | `scum.BaseBuildingDestructionLogDamageThreshold` | Damage threshold for the base building destruction log, which outputs the last 10 instances of damage for each destroyed base building element. Only damage instances that would make more or the same damage as the threshold are logged. Default 20, range 0 to 999. |
| Number of allowed flags per player | `scum.NumberOfAllowedFlagsPerPlayer` | How many flags each player may place. Only used when multiple flags per player are allowed. Default 10, range 1 to 30. |
| Smoker max amount per flag area | `scum.SmokerMaxAmountPerFlagArea` | Maximum number of smokers per flag area. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Smoker start decaying if flag area has more than | `scum.SmokerStartDecayingIfFlagAreaHasMoreThan` | Maximum number of smokers per flag area before they start decaying at an increased pace. Range 0 to 10. -1 usually means the game uses its own built-in value. |
| Tombstone max amount per squad | `scum.TombstoneMaxAmountPerSquad` | The most tombstones one squad may have. -1 means no limit. Guides disagree on the default (-1 or 3), so check the value in your file. Range -1 to 100. |
| Base elements decay rate multiplier | `scum.BaseElementsDecayRateMultiplier` | Multiplier for the default base element decay rate of 672 hours. Setting 0 disables decay entirely. Values greater than 1 cause faster decay; values less than 1 cause slower decay. Default 1, range 0 to 10. 1 keeps the normal amount. |

### SCUM: Features: Raid protection

10 settings in `ServerSettings.ini`, shown under **Features: Raid protection** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Raid protection type | `scum.RaidProtectionType` | Which kind of raid protection the server uses: off, only while everyone is offline, set by each flag, or one schedule for the whole server (which reads RaidTimes.json). Default 0 (off). Choices: `0` (Off), `1` (Offline: protected while everyone is offline), `2` (Flag-specific: each flag sets its own protection), `3` (Global: one schedule for the whole server (RaidTimes.json)). |
| Raid protection enable log | `scum.RaidProtectionEnableLog` | Enables logging for raid protection events (on = active). |
| Raid protection flag specific change setting cooldown | `scum.RaidProtectionFlagSpecificChangeSettingCooldown` | Cooldown between setting new times for flag-specific raid protection. Default 120:00:00, range 00:00:00 to 240:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Raid protection flag specific change setting price | `scum.RaidProtectionFlagSpecificChangeSettingPrice` | Price to skip cooldown for flag-specific raid protection. Default 10g. A plain number is money; a number followed by g is gold (for example 2g). |
| Raid protection flag specific max protection time | `scum.RaidProtectionFlagSpecificMaxProtectionTime` | Maximum duration of flag-specific raid protection. Default 08:00:00, range 00:00:00 to 08:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Raid protection offline protection start delay | `scum.RaidProtectionOfflineProtectionStartDelay` | Time the base is still vulnerable after the last player has logged out. Default 00:30:00, range 00:00:00 to 23:59:59. Written as hours:minutes:seconds (HH:MM:SS). |
| Raid protection offline max protection time | `scum.RaidProtectionOfflineMaxProtectionTime` | Maximum protected time for offline raid protection. Range 00:00:00 to 2400:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Raid protection global should show raid times message | `scum.RaidProtectionGlobalShouldShowRaidTimesMessage` | Should clients be shown a message about the global raid time (on = yes). |
| Raid protection global should show raid announcement message | `scum.RaidProtectionGlobalShouldShowRaidAnnouncementMessage` | Should clients be shown a raid announcement message (on = yes). |
| Raid protection global should show raid start end messages | `scum.RaidProtectionGlobalShouldShowRaidStartEndMessages` | Should clients be shown a start and end message (on = yes). |

### SCUM: Features: Fuel & water supply

16 settings in `ServerSettings.ini`, shown under **Features: Fuel & water supply** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Water periodic max amount multiplier | `scum.WaterPeriodicMaxAmountMultiplier` | Multiplier for the maximum water quantity in base building water tanks (base building well). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Water periodic replenish amount multiplier | `scum.WaterPeriodicReplenishAmountMultiplier` | Multiplier for the amount of water that is refilled at certain intervals (base building well). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Water periodic replenish interval multiplier | `scum.WaterPeriodicReplenishIntervalMultiplier` | Multiplier for the intervals at which water is refilled (base building well). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Water proximity replenish amount multiplier | `scum.WaterProximityReplenishAmountMultiplier` | Multiplier for the amount of water refilled in wells around the world (World Wells). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Water proximity replenish chance multiplier | `scum.WaterProximityReplenishChanceMultiplier` | Multiplier for the chance that a world well is refilled (World Well). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Water proximity replenish timeout multiplier | `scum.WaterProximityReplenishTimeoutMultiplier` | Multiplier for the time between individual checks whether a world well is refilled (World Well). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Gasoline price per unit multiplier | `scum.GasolinePricePerUnitMultiplier` | Multiplier for the fuel price per liter at gas stations (1=approx. $15 per liter). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Gasoline periodic initial amount multiplier | `scum.GasolinePeriodicInitialAmountMultiplier` | Multiplier for the initial amount of fuel at petrol stations. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Gasoline periodic max amount multiplier | `scum.GasolinePeriodicMaxAmountMultiplier` | Multiplier for the maximum amount of fuel in petrol stations. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Gasoline periodic replenish amount multiplier | `scum.GasolinePeriodicReplenishAmountMultiplier` | Multiplier for the amount of fuel that is refilled at certain intervals in petrol stations. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Gasoline periodic replenish interval multiplier | `scum.GasolinePeriodicReplenishIntervalMultiplier` | Multiplier for the interval at which petrol stations are refilled with fuel. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Propane price per unit multiplier | `scum.PropanePricePerUnitMultiplier` | Multiplier for the propane price per liter at gas stations. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Propane periodic initial amount multiplier | `scum.PropanePeriodicInitialAmountMultiplier` | Multiplier for the initial amount of propane in propane tanks at gas stations. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Propane periodic max amount multiplier | `scum.PropanePeriodicMaxAmountMultiplier` | Multiplier for the maximum amount of propane in gas stations. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Propane periodic replenish amount multiplier | `scum.PropanePeriodicReplenishAmountMultiplier` | Multiplier for the amount of propane that is refilled at certain intervals in gas stations. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Propane periodic replenish interval multiplier | `scum.PropanePeriodicReplenishIntervalMultiplier` | Multiplier for the interval at which gas stations are refilled with propane. Default 1, range 0 to 10. 1 keeps the normal amount. |

### SCUM: Features: Loot spawning & farming

8 settings in `ServerSettings.ini`, shown under **Features: Loot spawning & farming** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Spawner probability multiplier | `scum.SpawnerProbabilityMultiplier` | Multiplier for the probability that a world item spawns (items that are lying around freely). Default 1, range 0.1 to 10. 1 keeps the normal amount. |
| Examine spawner probability multiplier | `scum.ExamineSpawnerProbabilityMultiplier` | Multiplier for the probability that a container you examine will spawn an item. Default 1, range 0.1 to 10. 1 keeps the normal amount. |
| Examine spawner expiration time multiplier | `scum.ExamineSpawnerExpirationTimeMultiplier` | Multiplier for the time without a player nearby (50m) after which a container decides whether it contains items (1=60min;0.5=30min). Default 1, range 0.1 to 10. 1 keeps the normal amount. |
| Spawner expiration time multiplier | `scum.SpawnerExpirationTimeMultiplier` | Multiplier for the time without players nearby (50m) after which a world spawner decides whether to spawn items (1=60min;0.5=30min). Default 1, range 0.1 to 10. 1 keeps the normal amount. |
| Enable item cooldown groups | `scum.EnableItemCooldownGroups` | Whether certain items should be grouped into cooldown groups to prevent item farming (cooldown when certain rare items are found, on the same group of items). |
| Item cooldown groups duration multiplier | `scum.ItemCooldownGroupsDurationMultiplier` | Multiplier for the time of cooldown groups before items from the group can be found again (higher values = higher cooldown). Default 1, range 0.1 to 10. 1 keeps the normal amount. |
| Plant harvest examine time multiplier | `scum.PlantHarvestExamineTimeMultiplier` | Multiplier for the expiration time of harvested products in plants after they have grown. Default 1, range 0.2 to 10. 1 keeps the normal amount. |
| First plant harvest additional chance | `scum.FirstPlantHarvestAdditionalChance` | Percent chance that harvest products spawn at the first plant harvest (1=100%). Default 1, range 0 to 1. |

### SCUM: Features: Squads

10 settings in `ServerSettings.ini`, shown under **Features: Squads** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Squad size at INT level 1 | `scum.SquadMemberCountAtIntLevel1` | Number of possible team members at INT level 1. Default 2, range 0 to 100. |
| Squad size at INT level 2 | `scum.SquadMemberCountAtIntLevel2` | Number of possible team members at INT level 2. Default 4, range 0 to 100. |
| Squad size at INT level 3 | `scum.SquadMemberCountAtIntLevel3` | Number of possible team members at INT level 3. Default 6, range 0 to 100. |
| Squad size at INT level 4 | `scum.SquadMemberCountAtIntLevel4` | Number of possible team members at INT level 4. Default 8, range 0 to 100. |
| Squad size at INT level 5 | `scum.SquadMemberCountAtIntLevel5` | Number of possible team members at INT level 5. Default 10, range 0 to 100. |
| Squad member count limit for punishment | `scum.SquadMemberCountLimitForPunishment` | Maximum number of squad mates for which prisoners will not receive a penalty. Default 2, range 0 to 64. |
| Squad probation duration | `scum.RTSquadProbationDuration` | Probationary period for a squad member who leaves and rejoins the squad. Default 1 day, range 0 to 100 days. |
| Squad money penalty per prev squad member | `scum.SquadMoneyPenaltyPerPrevSquadMember` | Money that prisoners have to pay per squad member in a former squad to join or form a new one. Default 0, range 0 to 100000. |
| Squad fame points penalty per prev squad member | `scum.SquadFamePointsPenaltyPerPrevSquadMember` | Fame points that must be lost per squad member in a former squad to join or form a new one. Default 0, range 0 to 1000. |
| Enable squad member name widget | `scum.EnableSquadMemberNameWidget` | Whether a widget with the name should be displayed above the heads of team members (on = Widget on). |

### SCUM: Features: Skills

22 settings in `ServerSettings.ini`, shown under **Features: Skills** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Archery skill multiplier | `scum.ArcherySkillMultiplier` | Multiplier for XP gain in archery (higher = more xp per action). Default 1, range 0 to 10. 1 keeps the normal amount. |
| Aviation skill multiplier | `scum.AviationSkillMultiplier` | Multiplier for XP gain when flying aircraft. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Awareness skill multiplier | `scum.AwarenessSkillMultiplier` | Multiplier for XP gain during perception training. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Brawling skill multiplier | `scum.BrawlingSkillMultiplier` | Multiplier for XP gain in fistfights. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Camouflage skill multiplier | `scum.CamouflageSkillMultiplier` | Multiplier for XP gain when camouflaging. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Cooking skill multiplier | `scum.CookingSkillMultiplier` | Multiplier for XP gain when cooking. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Demolition skill multiplier | `scum.DemolitionSkillMultiplier` | Multiplier for XP gain in explosives crafting. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Driving skill multiplier | `scum.DrivingSkillMultiplier` | Multiplier for XP gain when driving a car. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Endurance skill multiplier | `scum.EnduranceSkillMultiplier` | Multiplier for XP gain in endurance activities. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Engineering skill multiplier | `scum.EngineeringSkillMultiplier` | Multiplier for XP gain in engineering. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Farming skill multiplier | `scum.FarmingSkillMultiplier` | Multiplier for XP gain when farming. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Handgun skill multiplier | `scum.HandgunSkillMultiplier` | Multiplier for XP gain when shooting with a pistol. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Medical skill multiplier | `scum.MedicalSkillMultiplier` | Multiplier for XP gain from medical actions. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Melee weapons skill multiplier | `scum.MeleeWeaponsSkillMultiplier` | Multiplier for XP gain with melee weapons. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Motorcycle skill multiplier | `scum.MotorcycleSkillMultiplier` | Multiplier for XP gain when riding a motorcycle. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Rifles skill multiplier | `scum.RiflesSkillMultiplier` | Multiplier for XP gain when shooting rifles. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Running skill multiplier | `scum.RunningSkillMultiplier` | Multiplier for XP gain while running. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Sniping skill multiplier | `scum.SnipingSkillMultiplier` | Multiplier for XP gain during sniper training. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Stealth skill multiplier | `scum.StealthSkillMultiplier` | Multiplier for XP gain when sneaking. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Survival skill multiplier | `scum.SurvivalSkillMultiplier` | Multiplier for XP gain in survival training. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Thievery skill multiplier | `scum.ThieverySkillMultiplier` | Multiplier for XP gain when stealing. Default 1, range 0 to 10. 1 keeps the normal amount. |
| Enable selected skills promotion | `scum.EnableSelectedSkillsPromotion` | Enable or disable experience gain boosts from skills related to the current campaign. |

### SCUM: Features: Quests

8 settings in `ServerSettings.ini`, shown under **Features: Quests** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Quests enabled | `scum.QuestsEnabled` | Whether the quest system is active (on = active). |
| Quests global cycle duration | `scum.QuestsGlobalCycleDuration` | Duration of the quest cycle. Default 23:59:59, range 00:00:01 to 2400:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Max quests per cycle per trader | `scum.MaxQuestsPerCyclePerTrader` | Maximum number of quests that can be accepted per merchant per cycle. Default 3, range 1 to 64. |
| Max simultaneous quests per trader | `scum.MaxSimultaneousQuestsPerTrader` | Maximum number of quests accepted simultaneously per merchant. Default 1, range 1 to 64. |
| Quests trader refill cooldown | `scum.QuestsTraderRefillCooldown` | Cooldown for new quests from merchants. Default 03:00:00, range 00:00:01 to 2400:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Quests phone refill cooldown | `scum.QuestsPhoneRefillCooldown` | Cooldown for new quests on smartphones. Default 01:00:00, range 00:00:01 to 2400:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Quests notice board refill cooldown | `scum.QuestsNoticeBoardRefillCooldown` | Cooldown for new quests on notice boards. Default 02:00:00, range 00:00:01 to 2400:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Quest requirements block tradeable items | `scum.QuestRequirementsBlockTradeableItems` | Whether the purchase of quest-relevant items is blocked (on = blocked). |

### SCUM: Features: Turret targets

6 settings in `ServerSettings.ini`, shown under **Features: Turret targets** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Turrets attack prisoners | `scum.TurretsAttackPrisoners` | Whether gun turrets attack prisoners (on = yes). |
| Turrets attack puppets | `scum.TurretsAttackPuppets` | Whether turrets attack zombies (on = yes). |
| Turrets attack vehicles | `scum.TurretsAttackVehicles` | Whether turrets attack vehicles (on = yes). |
| Turrets attack sentries | `scum.TurretsAttackSentries` | Whether turrets attack Mechs (on = yes). |
| Turrets attack animals | `scum.TurretsAttackAnimals` | Whether gun turrets attack animals (on = yes). |
| Turrets attack armed NPCs | `scum.TurretsAttackArmedNPCs` | Whether turrets attack human NPCs (on = yes). |

### SCUM: Features: Player rules & HUD

19 settings in `ServerSettings.ini`, shown under **Features: Player rules & HUD** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Stamina drain on jump multiplier | `scum.StaminaDrainOnJumpMultiplier` | Multiplier for stamina costs when jumping (higher = more stamina costs). Default 1, range 0 to 5. 1 keeps the normal amount. |
| Stamina drain on climb multiplier | `scum.StaminaDrainOnClimbMultiplier` | Multiplier for stamina costs when climbing (higher = more stamina costs). Default 1, range 0 to 5. 1 keeps the normal amount. |
| Disable exhaustion | `scum.DisableExhaustion` | Whether exhaustion can be accumulated (on = disables exhaustion). |
| Body simulation speed multiplier | `scum.BodySimulationSpeedMultiplier` | Multiplier for body simulation speed (digestion, etc.). Default 3.84, range 0.1 to 8. |
| Maintain items expiration time | `scum.MaintainItemsExpirationTime` | Expiration time of maintenance items (beds, etc.) before they expire if no interaction has taken place. Default 360:00:00, range 00:00:01 to 2400:00:00. Written as hours:minutes:seconds (HH:MM:SS). |
| Killbox defuse failure bonus | `scum.KillboxDefuseFailureBonus` | Additional time in seconds for failed killbox defusing attempts. Default 0.2 seconds, range 0 to 5 seconds. |
| Bedroll visibility timer | `scum.BedrollVisibilityTimer` | Time a sleeping bag is visible to other players after a player logs out. Default 1 second, range 1 to 43200 seconds. |
| Enable BCU locking | `scum.EnableBCULocking` | Whether the BCU lock can be used (on = activated). |
| Name change cooldown | `scum.NameChangeCooldown` | Cooldown time before a character name change is possible again. Default 168 hours, range 0 to 720 hours. |
| Name change cost | `scum.NameChangeCost` | Price for changing the character's name. Default 1000, range 0 to 1000000000. |
| Enable new player protection | `scum.EnableNewPlayerProtection` | Enable or disable protection for new players (on = enabled). |
| New player protection duration | `scum.NewPlayerProtectionDuration` | Duration of protection for new players. Default 120 minutes, range 120 to 1140 minutes. |
| Allow automatic parachute opening | `scum.AllowAutomaticParachuteOpening` | Whether the parachute opens automatically shortly before the ground (on = automatic opening activated). |
| Hide quick access bar | `scum.HideQuickAccessBar` | Switch on to hide the quickbar slots in every player's HUD. |
| Hide life indicators | `scum.HideLifeIndicators` | Switch on to hide the character stats (health, stamina and so on) in every player's HUD. |
| Enable digital deluxe starter pack | `scum.EnableDigitalDeluxeStarterPack` | Whether the Deluxe Survival Pack (formerly Digital Deluxe Starter Pack) is usable (on = usable). |
| Enable digital deluxe free gold card | `scum.EnableDigitalDeluxeFreeGoldCard` | Whether the Free Gold Card from the Digital Deluxe Starter Pack can be received (on = can be received). |
| Net watchdog | `scum.EnableNetWatchdog` | Protects the server against players who get around the ping limits. Default off. |
| Enable network object logging | `scum.EnableNetworkObjectLogging` | Enables logging of active network objects to SaveFiles/Logs/network_objects. Useful for diagnosing network object leaks. May slightly reduce server performance and should be kept disabled unless a leak is being investigated. |

## StarRupture

StarRupture keeps its server settings in `DSSettings.txt` in the server's install folder, next to `StarRuptureServerEOS.exe`. The panel writes it when it creates the server, because the game never makes it. It is JSON with five settings, and every value is written as text.

- `DSSettings.txt`: The world's name, whether to create a new world or load the saved one at start, which save to load, and how often to autosave.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#starrupture).

The first start builds the world ("Create a new world on start" is Yes). After that, set it to **No** and "Load the saved world on start" to **Yes**, or the world is made again at every start.
The game fixes the player limit at 4. It has no difficulty or rules settings in any file.
Passwords are not set by the panel. The game reads them from `Password.json` (admin) and `PlayerPassword.json` (join) in the server folder, and will only accept a value made by a website (starrupture-utilities.com), not the password typed in plain text. Without `PlayerPassword.json` anyone who knows the address can join.
Forward UDP only for the game port. The same number also answers on TCP for the in-game Manage Server screen, which has a reported security hole, so leave TCP closed.

### StarRupture: World

4 settings in `DSSettings.txt`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| World name | `SessionName` | The name of your world. It is also the name of the folder the world is saved in (StarRupture\Saved\SaveGames), so a new name starts a new, empty world and the old one stays on disk. Keep it short: 20 characters is the longest one server setup documents. |
| Create a new world on start | `StartNewGame` | Yes builds a brand-new world every time the server starts. Use it once for the first start, then change it to No, and set "Load the saved world on start" to Yes, or the world is made again at every start. Choices: `true` (Yes: create a new world), `false` (No: keep the existing world). |
| Load the saved world on start | `LoadSavedGame` | Yes loads the save named below when the server starts, so your world comes back after a restart or a crash. With No the server loads nothing: it waits with no world, or builds a new one if "Create a new world on start" is Yes. Choices: `true` (Yes: load the saved world), `false` (No: do not load a save). |
| Save file to load | `SaveGameName` | The file inside the world's save folder to load, including .sav. It is case-sensitive. The server's own autosave is AutoSave0.sav; older autosaves are numbered after it. |

### StarRupture: Saving

1 setting in `DSSettings.txt`, shown under **Saving** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Autosave every (seconds) | `SaveGameInterval` | How often the world is saved by itself, in seconds. Server hosts suggest 180 to 600 (3 to 10 minutes); a very short time can cause lag each time the save is written. |

## Unturned

Unturned's server keeps its start-up commands in `Commands.dat`, in the `Servers\<name>\Server` folder inside the server's folder, and the Steam Workshop items it installs in `WorkshopDownloadConfig.json` next to the server's `Config.txt`. The panel starts `Unturned.exe` with `-batchmode -nographics +InternetServer/<name>`, where `<name>` is the server's folder name under `Servers`.

- `Commands.dat`: The server's start-up commands, one per line: name, map, player limit, port, difficulty, password and Steam login token.
- `WorkshopDownloadConfig.json`: Which Steam Workshop items (maps and other mods) the server downloads and keeps updated when it starts.

The game rules (zombies, loot, hunger, damage and so on) are in `Config.txt`, which the game makes the first time the server runs. The Settings tab does not edit it, because its block format is not one the panel can read safely: open it in a text editor. The **Difficulty** setting (`Mode` in Commands.dat) chooses which starting values the rules use, and a value you type in Config.txt wins. Settings are best changed while the server is stopped.
The server's name, port and the `Cheats` and `PvE` lines are in Commands.dat too, but not in the form: a name usually has spaces, which the form would wrap in quotation marks, `Cheats` and `PvE` are lines with no value, and the port is chosen when the server is created.
There is no launch-options form for this game. The game takes the server's folder name from the end of the launch line (`+InternetServer/<name>`), and the form adds new arguments at the end, which would become part of that name.
**Save before you stop.** Unturned has no autosave. It saves when it gets its `Shutdown` command, and, according to its code, when its console window is closed. The panel closes the window and ends the process after a short wait, so check on your own server that a Stop keeps your progress (stop it, start it again, see whether your last changes are there).
To be listed in the Internet server list the server needs a **Steam login token** (a GSLT) for Unturned, app 304930, from steamcommunity.com/dev/managegameservers. Without one the game still prints a 17-digit Server Code in its log.
Players do not install anything for Workshop items: they download them when they join. A big map (Buak is about 1 GB) makes the first join slow. When an item is updated the server counts down (ten minutes by default) and shuts itself down so it can restart on the new version, so set the panel to restart the server when it stops on its own.
Keep the server's folder path short. Windows stops at 260 characters for a whole file path, and Workshop maps and plugins create long ones. The game then silently skips part of a map and the OpenMod plugin framework fails to start. The log says "Could not find a part of the path" when this happens.
The server uses two UDP ports: the one shown, and the next one up. Forward both if players join by address from outside your network.

### Unturned (Commands.dat): Rules

2 settings in `Commands.dat`, shown under **Rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Difficulty | `Mode` | Which difficulty the server runs. It picks the starting values of the game rules in Config.txt (hunger, loot, zombies and so on) for settings you have not changed there. Changes apply when the server starts. Choices: `Easy`, `Normal`, `Hard`. |
| Camera views allowed | `Perspective` | Which camera views players may use. The game accepts First, Third, Both and Vehicle. Choices: `First` (First person only), `Third` (Third person only), `Both` (First or third person), `Vehicle`. |

### Unturned (Commands.dat): World

1 setting in `Commands.dat`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Map | `Map` | Which map the server loads. Give the name of the map's folder. For a Steam Workshop map, add its id to the Workshop items file (WorkshopDownloadConfig.json) and type its folder name here (the server log says Discovered level "..." once it has downloaded it). A name with a space in it cannot be written by this form; edit the file by hand for those. Choices: `PEI`, `Washington`, `Yukon`, `Russia`, `Germany`. Another value can be typed. |

### Unturned (Commands.dat): Players

4 settings in `Commands.dat`, shown under **Players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Max players | `MaxPlayers` | The most players connected at once, from 1 to 200 (the game's limit). The game's own default is 8. |
| Join queue size | `Queue_Size` | How many players may wait in line to join when the server is full, from 0 to 64. |
| Ping limit before a kick | `Timeout` | Players whose ping is above this many milliseconds are kicked. The game accepts 50 to 10000; the Unturned wiki gives 750 as the default. |
| Password | `Password` | What players type to join. Leave the line out for a server anyone can join. Avoid spaces: this form puts a value with spaces inside quotation marks, and whether the game reads those as part of the password is not documented. |

### Unturned (Commands.dat): Network

1 setting in `Commands.dat`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Steam login token | `GSLT` | A Game Server Login Token for Unturned (app 304930) from steamcommunity.com/dev/managegameservers. Without one the game does not list the server in the Internet server list. It is secret: treat it like a password. |

### Unturned (WorkshopDownloadConfig.json): Items

2 settings in `WorkshopDownloadConfig.json`, shown under **Items** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Workshop items to install | `File_IDs` | The Steam Workshop file ids the server installs and keeps updated every time it starts, as a list in square brackets such as [1753134636, 1702240229]. The id is the number after ?id= in the item's Workshop address. Dependencies are installed too, and a collection's id installs its items. Players download them when they join. |
| Skip the dependencies of these items | `Ignore_Children_File_IDs` | For the ids in this list, the items they name as dependencies are not installed automatically. Useful when an author lists other items only to advertise them. An empty list [] skips nothing. |

### Unturned (WorkshopDownloadConfig.json): Downloads

3 settings in `WorkshopDownloadConfig.json`, shown under **Downloads** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Reuse items already downloaded | `Use_Cached_Downloads` | Loads items that are already installed instead of downloading them again when they have not changed. Leave on unless you are chasing a corrupt download. |
| How long Steam answers are reused | `Query_Cache_Max_Age_Seconds` | How old a saved answer from Steam may be, in seconds, before the server asks again. 0 turns the saving off. A higher number notices updates later but survives a failed query better. |
| Steam query retries | `Max_Query_Retries` | How many times a failed question to Steam is tried again. After that the server quits, so a very low number can stop the server over a short internet problem. |

### Unturned (WorkshopDownloadConfig.json): Updates

4 settings in `WorkshopDownloadConfig.json`, shown under **Updates** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Watch the items for updates | `Should_Monitor_Updates` | Checks the installed items for updates while the server runs. When one is found the server counts down and shuts itself down so that it can be started again with the new version. |
| Countdown after an update | `Shutdown_Update_Detected_Timer` | How many seconds the server waits after finding an update before it shuts down (600 is ten minutes). The server has to be started again afterwards, so set the panel to restart it when it stops on its own. |
| Update warning in chat | `Shutdown_Update_Detected_Message` | The message players see in chat when the countdown starts. {0} is replaced by the time left. |
| Message when kicked for an update | `Shutdown_Kick_Message` | The message shown to players who are still connected when the server shuts down for an update. |

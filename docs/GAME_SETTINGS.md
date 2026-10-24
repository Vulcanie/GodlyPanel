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
- [Soulmask](#soulmask)
- [Garry's Mod](#garrys-mod)
- [Barotrauma](#barotrauma)
- [Necesse](#necesse)
- [Left 4 Dead 2](#left-4-dead-2)
- [Squad](#squad)
- [Arma Reforger](#arma-reforger)
- [VEIN](#vein)
- [Space Engineers](#space-engineers)
- [Terraria (tModLoader)](#terraria-tmodloader)
- [Sven Co-op](#sven-co-op)
- [Counter-Strike: Source](#counter-strike-source)
- [Half-Life 2: Deathmatch](#half-life-2-deathmatch)
- [Astroneer](#astroneer)
- [Avorion](#avorion)
- [Minecraft (vanilla)](#minecraft-vanilla)
- [Terraria (vanilla)](#terraria-vanilla)
- [The Forest](#the-forest)
- [Wurm Unlimited](#wurm-unlimited)
- [The Isle (Evrima)](#the-isle-evrima)
- [Mordhau](#mordhau)
- [Team Fortress 2](#team-fortress-2)
- [Counter-Strike 2](#counter-strike-2)
- [Mount & Blade II: Bannerlord](#mount--blade-ii-bannerlord)
- [Insurgency: Sandstorm](#insurgency-sandstorm)
- [Left 4 Dead](#left-4-dead)
- [Zombie Panic! Source](#zombie-panic-source)
- [BrainBread 2](#brainbread-2)
- [Day of Defeat: Source](#day-of-defeat-source)
- [Fistful of Frags](#fistful-of-frags)
- [No More Room in Hell](#no-more-room-in-hell)
- [Insurgency (2014)](#insurgency-2014)
- [Pirates, Vikings, and Knights II](#pirates-vikings-and-knights-ii)
- [Dystopia](#dystopia)
- [Empires](#empires)
- [Double Action: Boogaloo](#double-action-boogaloo)
- [Half-Life Dedicated Server](#half-life-dedicated-server)
- [IOSoccer](#iosoccer)
- [BATTALION: Legacy](#battalion-legacy)
- [Black Mesa](#black-mesa)
- [Military Conflict: Vietnam](#military-conflict-vietnam)
- [SCP: Secret Laboratory](#scp-secret-laboratory)
- [Colony Survival](#colony-survival)
- [Rising World](#rising-world)
- [Warfork](#warfork)
- [Natural Selection 2](#natural-selection-2)
- [Chivalry: Medieval Warfare](#chivalry-medieval-warfare)
- [Hurtworld](#hurtworld)
- [Euro Truck Simulator 2](#euro-truck-simulator-2)
- [American Truck Simulator](#american-truck-simulator)
- [Medieval Engineers](#medieval-engineers)
- [PixARK](#pixark)
- [Stationeers](#stationeers)
- [Wreckfest](#wreckfest)
- [Operation: Harsh Doorstop](#operation-harsh-doorstop)
- [Rising Storm 2: Vietnam](#rising-storm-2-vietnam)
- [Miscreated](#miscreated)
- [Craftopia](#craftopia)
- [Ballistic Overkill](#ballistic-overkill)
- [Age of Chivalry](#age-of-chivalry)
- [HumanitZ](#humanitz)
- [Survive the Nights](#survive-the-nights)
- [Tower Unite](#tower-unite)
- [The Front](#the-front)
- [Day of Dragons](#day-of-dragons)
- [HYPERCHARGE: Unboxed](#hypercharge-unboxed)
- [Day of Infamy](#day-of-infamy)
- [Killing Floor 2](#killing-floor-2)
- [Empyrion - Galactic Survival](#empyrion---galactic-survival)
- [ATLAS](#atlas)

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
SCUM writes the server password in plain text into its own log (`SCUM.log`), so do not post that log where others can read it.
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
Forward UDP only for the game port. The same number can also answer on TCP for the in-game Manage Server screen, which has a reported security hole (the panel turns that web interface off in the start script), so leave TCP closed.

### StarRupture: World

4 settings in `DSSettings.txt`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| World name | `SessionName` | The name of your world. It is also the name of the folder the world is saved in (StarRupture\Saved\SaveGames), so a new name starts a new, empty world and the old one stays on disk. Keep it short: 20 characters is the longest one server setup documents. |
| Create a new world on start | `StartNewGame` | Yes builds a brand-new world every time the server starts. Use it once for the first start, then change it to No, and set "Load the saved world on start" to Yes, or the world is made again at every start. Do not switch it off before a save exists: with nothing to load, the server keeps running with no world at all. Choices: `true` (Yes: create a new world), `false` (No: keep the existing world). |
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

## Soulmask

Soulmask is set up by the arguments on the command that starts it (the **Launch options**): the name, passwords, player limit, ports, PvE or PvP, the ban lists and how often the world is saved. The game keeps its saves in `WS\Saved` inside the server's folder, and its log in `WS\Saved\Logs\WS.log`.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#soulmask).

**Stop saves the world first.** The game saves safely only when told to through its local text console, so before it closes the server the panel sends `saveworld 1` to the Console Port (18888 by default; this PC only), waits a few seconds, and then closes the window. Closing the window alone does not save (checked on a real install). A crash or a power cut can still lose everything since the last write to disk, which happens every `-backup` seconds (900, 15 minutes, as the panel starts it): lower it in the Launch options to lose less.
The world rules (experience, drop and growth rates, raids, difficulty) are in `WS\Saved\GameplaySettings\GameXishu.json`, which the game makes on its first start. The panel does not offer a form for it, because nothing it could find explains what each setting does. The file holds every setting three times, in groups `0`, `1` and `2`; a dedicated server reads group `1`. Stop the server before editing it by hand. It is included in the panel's backups.
The server is started as a PvE server (`-pve`). For PvP, turn off **PvE mode** and turn on **PvP mode** in the Launch options. Both change some of the game's settings.
The server takes a few minutes to start (two to five) before it is listed. The first lines of `WS.log` should show `Game Server API initialized`; if Steam fails to start there, the three Steam DLLs the panel copied into `WS\Binaries\Win64` may be missing or out of date.
The admin password is made for you when you leave it empty, so the server is never open to anyone typing the admin command; look in the Launch options for it. In the game, press the `~` key and type `gm key` followed by the password.
Mods are Steam Workshop mods, listed by id when the server is created or in the Launch options (`-mod`). The server downloads them when it starts, which can make the first start slow, and every player needs the same mods subscribed and switched on. Mods made before the game's 1.0 release (10 April 2026) may no longer work and can stop the server from starting: take the newest-changed one off the list first. Back up the world before adding or removing mods.
Each Soulmask server needs its own game, query and console ports. The console port is not in the panel's Ports section, so the panel does not check it for clashes: change it in the Launch options if you add a second server by hand.
The game uses a lot of memory: at least 16 GB for one server is the wiki's figure, and the server's memory use is reported to grow over time, so a daily restart helps.

## Garry's Mod

Garry's Mod is set up with console variables ("convars"): lines of a name and a value in `.cfg` files in the `garrysmod\cfg` folder of the server. The panel writes the server's name and password in `autoexec.cfg`, and everything else you change goes in `server.cfg`, which the game ships empty. The map, gamemode, player limit and port are on the launch line.

- `autoexec.cfg`: The server's name and password. The panel writes this file when it creates the server.
- `server.cfg`: Every other setting: access, voice, physics, downloads, Sandbox limits and the Trouble in Terrorist Town rules. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#garrys-mod).

The game reads these files when it starts, so stop and start the server after changing a setting.
The name and password are in `autoexec.cfg` and not in `server.cfg` on purpose: the panel updates the game with SteamCMD's `validate`, which puts files the game ships (including the empty `server.cfg`) back as they were, so anything the panel had written in `server.cfg` would be gone after an update. If you put the same setting in both files, the later one wins; the research could not confirm which runs later.
Facepunch says every server should have a Game Server Login Token (steamcommunity.com/dev/managegameservers, app ID 4000). Without one the server ranks very low in the server list, and an invalid or expired one stops the server from starting. Add it with the Game Server Login Token argument in Launch options. It is a secret: do not share it.
Mods are Steam Workshop addons. Put them in a Workshop collection (Public or Unlisted), then give its id in the Workshop collection argument; the server downloads and mounts the collection every time it starts. Players only download an addon's content from your server if the addon is marked for download by a Lua file (`resource.AddWorkshop`, in `garrysmod\lua\autorun\server`), or is the current map or gamemode. The panel does not write that file.
Source games have a remote console (RCON) on the game port over TCP, with the password set by `rcon_password`. The panel does not use it for this server, so Stop closes the server's window and, after 15 seconds, ends the program. Whether that gives the game time to save its data (Sandbox's persistent props are saved when the server shuts down) was not tested.
Settings of community gamemodes (DarkRP, Murder, Prop Hunt and others), the Sandbox `toolmode_allow_<tool>` switches, the NPC damage files (`skill.cfg`) and the map cycle are not in the form. The shipped `mapcycle.txt` says Garry's Mod does not use it.
The values of the Sandbox rules and limits come from the Facepunch wiki's list, which says it is rarely updated. A setting the file has that the panel does not explain is still shown.

### Garry's Mod (autoexec.cfg): Server

2 settings in `autoexec.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name shown in the in-game server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |

### Garry's Mod (server.cfg): Server

8 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Country flag | `sv_location` | A two-letter country code (gb, us, de ... or eu for the European Union) that picks the flag next to your server in the server browser. It has to be the country the server really is in. |
| Contact email | `sv_contact` | The administrator's email address, shown in the server's information. |
| Loading screen web page | `sv_loadingurl` | A web page players see while they join. It has to start with http:// or https://. |
| Steam group | `sv_steamgroup` | The number of a Steam group to tie the server to. The group's number is on the group's admin profile page. |
| Gamemode name shown | `sv_gamename_override` | If it is not empty, this text replaces the gamemode name the server tells Steam. |
| Shown player limit | `sv_visiblemaxplayers` | Changes the player limit that people browsing the server list see. -1 shows the real limit. |
| Hide from the server list | `hide_server` | On hides the server from the in-game server browser; players can still join by typing its address. Handy while you are still setting it up. Choices: `0` (Off), `1` (On). |
| Local network only | `sv_lan` | On makes a LAN server: no Steam sign-in, not listed on the internet, and only local-type addresses can join. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |

### Garry's Mod (server.cfg): Access and security

10 settings in `server.cfg`, shown under **Access and security** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow players to run their own Lua | `sv_allowcslua` | Lets players run their own Lua scripts in their own game (lua_openscript_cl and lua_run_cl), which is how cheat scripts work. Turn it off to block them. This overrides any gamemode's setting. Choices: `0` (Off), `1` (On). |
| Kick on Lua errors | `sv_kickerrornum` | Kicks a player once they have caused this many Lua errors on their own computer. 0 never kicks. |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands. Keep it off on a normal server. Choices: `0` (Off), `1` (On). |
| Connection attempts per second | `sv_max_connects_sec` | The most connection attempts per second the server answers from one address. A low number makes flooding the server harder. |
| Server-list queries per second | `sv_max_queries_sec` | The most server-browser queries per second the server answers from one address. |
| Server-list queries per second, total | `sv_max_queries_sec_global` | The most server-browser queries per second the server answers from all addresses together. |
| Console commands per second | `sv_quota_stringcmdspersecond` | How many console commands per second one player may send. 0 allows none. |
| Kick for command spam | `sv_quota_stringcmd_kick` | If above 0, a player who sends more console commands than the limit above is kicked. |
| Voice packets per tick | `sv_maxvoicepacketsperframe` | How many voice packets a player may send in one server tick before being kicked. 0 turns the check off. Higher numbers make the server easier to flood. |
| Log bans | `sv_logbans` | Writes bans to the server log. Choices: `0` (Off), `1` (On). |

### Garry's Mod (server.cfg): Voice

5 settings in `server.cfg`, shown under **Voice** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Everyone hears everyone | `sv_alltalk` | On lets every player hear every other player's voice, whatever team they are on. Choices: `0` (Off), `1` (On). |
| Voice chat | `sv_voiceenable` | Turns voice chat on or off for the whole server. Choices: `0` (Off), `1` (On). |
| Use Steam voice | `sv_use_steam_voice` | Uses Steam Voice instead of the old voice codec. With it on, voice input from a file no longer works. Choices: `0` (Off), `1` (On). |
| Allow voice from a file | `sv_allow_voice_from_file` | Whether players may feed a recorded file into voice chat (voice_inputfromfile). Choices: `0` (Off), `1` (On). |
| Voice icons overhead | `mp_show_voice_icons` | Shows a speaker icon above players who are talking. Choices: `0` (Off), `1` (On). |

### Garry's Mod (server.cfg): Gameplay

14 settings in `server.cfg`, shown under **Gameplay** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Players can pause | `sv_pausable` | Whether the server can be paused from the game. Choices: `0` (Off), `1` (On). |
| Noclip speed | `sv_noclipspeed` | How fast players fly with noclip (a multiplier). |
| Footstep sounds | `sv_footsteps` | Plays footstep sounds for players. Choices: `0` (Off), `1` (On). |
| Pick things up with the Use key | `sv_playerpickupallowed` | Lets players pick up objects with the Use key. Choices: `0` (Off), `1` (On). |
| Name change cooldown (seconds) | `sv_namechange_cooldown_seconds` | How many seconds a player has to wait before they can change their name again. |
| Limit the physics gun | `physgun_limited` | On means the physics gun can only pick up certain things (props and ragdolls), not map objects. Sandbox sets this to off unless you change it. Choices: `0` (Off), `1` (On). |
| Physics gun range | `physgun_maxrange` | How far away the physics gun can reach. |
| Max ammo | `gmod_maxammo` | If above 0, every ammo type uses this as its carrying limit. 0 leaves each ammo type with its own limit. |
| Half-Life 2 suit power | `gmod_suit` | Anything other than 0 turns on the Half-Life 2 suit power bar (sprint and oxygen). |
| Half-Life 2 sneak attack | `gmod_sneak_attack` | 0 turns off the instant-kill headshot Half-Life 2 gives against NPCs that have not seen the player. Choices: `0` (Off), `1` (On). |
| Realistic fall damage | `mp_falldamage` | On turns on realistic fall damage. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Flashlight | `mp_flashlight` | Whether players can use their flashlight. The game's own network.cfg turns it on when the server starts. Choices: `0` (Off), `1` (On). |
| Weapons stay | `mp_weaponstay` | On stops a player picking up a weapon they already carry. Choices: `0` (Off), `1` (On). |
| Solid NPC ragdolls | `ai_serverragdolls` | On makes NPC ragdolls solid by default. Choices: `0` (Off), `1` (On). |

### Garry's Mod (server.cfg): Physics

11 settings in `server.cfg`, shown under **Physics** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Gravity | `sv_gravity` | How strongly things are pulled down. 600 is the normal value. |
| Ground friction | `sv_friction` | How much players slide on the ground. Higher numbers stop them sooner. |
| Ground acceleration | `sv_accelerate` | How fast players speed up on the ground. |
| Air acceleration | `sv_airaccelerate` | How much players can steer while in the air. |
| Top player speed | `sv_maxspeed` | The fastest a player is allowed to move. |
| Minimum stopping speed | `sv_stopspeed` | The minimum speed used when a player slows down on the ground. |
| Top object speed | `sv_maxvelocity` | The fastest any moving object may go, along each direction. |
| Fix crazy physics | `sv_crazyphysics_defuse` | Resets objects whose physics go wild. The game says turning this off should be a last resort, because it lets people crash a Sandbox server with physics tricks. Choices: `0` (Off), `1` (On). |
| Remove crazy-physics objects | `sv_crazyphysics_remove` | Removes objects whose physics go wild (the same warning as above). Choices: `0` (Off), `1` (On). |
| Constraint solver passes | `gmod_physiterations` | Extra physics passes make welds, ropes and other constraints more stable, at the cost of server CPU. |
| Physics speed | `phys_timescale` | Scales how fast physics runs. 1 is normal. |

### Garry's Mod (server.cfg): Network and performance

9 settings in `server.cfg`, shown under **Network and performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Idle disconnect time (seconds) | `sv_timeout` | How many seconds without any message from a player before they are dropped. |
| Connecting timeout (seconds) | `sv_timeout_signon` | The same, for a player who is still connecting. |
| Max data per player | `sv_maxrate` | The most data per second the server sends one player. 0 means no limit. |
| Min data per player | `sv_minrate` | The least data per second the server allows for one player. 0 means no minimum. |
| Max updates per second | `sv_maxupdaterate` | The most updates per second the server sends each player. |
| Min updates per second | `sv_minupdaterate` | The fewest updates per second the server allows for each player. |
| Max lag compensation (seconds) | `sv_maxunlag` | The longest delay, in seconds, the server will make up for when checking a hit. |
| Restart when empty and large (MB) | `sv_memlimit` | If set, the server exits whenever it is empty and using more memory than this many MB, so it can be started fresh. 0 turns it off. |
| Keep working when empty | `sv_hibernate_think` | On makes the server keep running its game logic even when nobody is on. Choices: `0` (Off), `1` (On). |

### Garry's Mod (server.cfg): Downloads and Workshop

4 settings in `server.cfg`, shown under **Downloads and Workshop** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow player uploads | `sv_allowupload` | Lets players upload custom files such as sprays. Choices: `0` (Off), `1` (On). |
| Players download from the game server | `sv_allowdownload` | Lets players download files straight from the game server. The Facepunch wiki calls this the slowest way (64 kilobytes a second), says it is obsolete, and warns that it opens the server to players spamming file requests. Choices: `0` (Off), `1` (On). |
| Fast download web address | `sv_downloadurl` | The address of a web server that holds your custom files, so players download from it instead of from the game server. Players try the file with .bz2 added first, then the plain file. The files still have to be marked for download in a Lua file. |
| Update Workshop items at start | `host_workshop_autoupdate` | 0 stops Workshop addons from updating when the server starts. That protects against a bad update, but an old map can keep players from joining. Choices: `0` (Off), `1` (On). |

### Garry's Mod (server.cfg): Remote console

6 settings in `server.cfg`, shown under **Remote console** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON). While it is empty, every remote login is refused. The panel does not use the remote console for this server. Changing it while the server runs disconnects everyone logged in remotely. |
| Remote login failures before a ban | `sv_rcon_maxfailures` | How many wrong remote console passwords one address may try before it is banned. |
| Failures in the window | `sv_rcon_minfailures` | How many wrong remote console passwords within the time window below lead to a ban. |
| Failure window (seconds) | `sv_rcon_minfailuretime` | The number of seconds over which wrong remote console passwords are counted. |
| Remote login ban length (minutes) | `sv_rcon_banpenalty` | How many minutes someone who fails the remote console login is banned for. |
| Address that is never banned | `sv_rcon_whitelist_address` | A wrong remote console password from this address never causes a ban (for example 127.0.0.1). |

### Garry's Mod (server.cfg): Logging

5 settings in `server.cfg`, shown under **Logging** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Write a log file | `sv_logfile` | Writes server information to the server's log file. Choices: `0` (Off), `1` (On). |
| Show the log in the console | `sv_logecho` | Also prints the log information in the server console. Choices: `0` (Off), `1` (On). |
| One log file | `sv_log_onefile` | Logs to a single file only instead of a new one each time. Choices: `0` (Off), `1` (On). |
| Compress old logs | `sv_logfilecompress` | Compresses the log file (gzip, ending in .log.gz) when it is closed. Choices: `0` (Off), `1` (On). |
| Log players' Lua errors | `sv_log_client_errors` | Above 0 writes the Lua errors from players' computers to clientside_errors.txt. 0 only prints them in the console; below 0 does not even print them. |

### Garry's Mod (server.cfg): Sandbox limits

18 settings in `server.cfg`, shown under **Sandbox limits** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Props per player | `sbox_maxprops` | The most props one player can have spawned at once. |
| Ragdolls per player | `sbox_maxragdolls` | The most ragdolls one player can have spawned at once. |
| NPCs per player | `sbox_maxnpcs` | The most NPCs one player can have spawned at once. |
| Vehicles per player | `sbox_maxvehicles` | The most vehicles one player can have spawned at once. |
| Effects per player | `sbox_maxeffects` | The most effect props one player can have spawned at once. |
| Scripted entities per player | `sbox_maxsents` | The most scripted entities (the Entities tab of the spawn menu) one player can have spawned at once. |
| Balloons per player | `sbox_maxballoons` | The most balloons one player can have at once. |
| Buttons per player | `sbox_maxbuttons` | The most buttons one player can have at once. |
| Cameras per player | `sbox_maxcameras` | The most cameras one player can have at once. |
| Dynamite per player | `sbox_maxdynamite` | The most dynamite one player can have at once. |
| Emitters per player | `sbox_maxemitters` | The most emitters one player can have at once. |
| Hoverballs per player | `sbox_maxhoverballs` | The most hoverballs one player can have at once. |
| Lamps per player | `sbox_maxlamps` | The most lamps one player can have at once. |
| Lights per player | `sbox_maxlights` | The most lights one player can have at once. |
| Thrusters per player | `sbox_maxthrusters` | The most thrusters one player can have at once. |
| Wheels per player | `sbox_maxwheels` | The most wheels one player can have at once. |
| Constraints per player | `sbox_maxconstraints` | The most welds and other constraints (not ropes) one player can make. |
| Rope constraints per player | `sbox_maxropeconstraints` | The most rope-based constraints one player can make. |

### Garry's Mod (server.cfg): Sandbox rules

8 settings in `server.cfg`, shown under **Sandbox rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Everyone is invincible | `sbox_godmode` | On makes every player invincible. Choices: `0` (Off), `1` (On). |
| Players can hurt players | `sbox_playershurtplayers` | Off stops players damaging each other. Choices: `0` (Off), `1` (On). |
| Allow noclip | `sbox_noclip` | On lets players use noclip (flying through walls). Choices: `0` (Off), `1` (On). |
| Spawn with Half-Life 2 weapons | `sbox_weapons` | On gives each player the default Half-Life 2 weapons every time they spawn. Choices: `0` (Off), `1` (On). |
| Bone manipulation: other objects | `sbox_bonemanip_misc` | On lets players move the bones of other objects such as props. Choices: `0` (Off), `1` (On). |
| Bone manipulation: NPCs | `sbox_bonemanip_npc` | On lets players move the bones of NPCs. Choices: `0` (Off), `1` (On). |
| Bone manipulation: players | `sbox_bonemanip_player` | On lets players move the bones of other players. Choices: `0` (Off), `1` (On). |
| Persistent props save name | `sbox_persist` | If not empty, players can right-click a prop while holding C and choose Make Persistent, so it survives restarts. The props are kept in garrysmod/data/persist under this name. Changing the name saves the persistent props, clears the map and loads the ones saved under the new name. |

### Garry's Mod (server.cfg): TTT rounds

12 settings in `server.cfg`, shown under **TTT rounds** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Round length (minutes) | `ttt_roundtime_minutes` | How long the main part of a round lasts. Starts at 10. |
| Preparation time (seconds) | `ttt_preptime_seconds` | How long players prepare before each round. Starts at 30. |
| First preparation time (seconds) | `ttt_firstpreptime` | How long players prepare before the first round after a map change. Starts at 60. |
| After-round time (seconds) | `ttt_posttime_seconds` | How long the end-of-round screen lasts before the next round. Starts at 30. |
| Rounds per map | `ttt_round_limit` | How many rounds are played before the map changes. Starts at 6. |
| Map time limit (minutes) | `ttt_time_limit_minutes` | The total time on one map before the map changes. Starts at 75. |
| Players needed to start | `ttt_minimum_players` | How many players are needed before a round starts. Starts at 2. |
| Haste mode | `ttt_haste` | On adds time to the round every time someone dies, so a slow round ends sooner. Starts on. Choices: `0` (Off), `1` (On). |
| Haste starting time (minutes) | `ttt_haste_starting_minutes` | The time a round starts with in haste mode. Starts at 5. |
| Haste time per death (minutes) | `ttt_haste_minutes_per_death` | The minutes added to the round for each death in haste mode. Starts at 0.5. |
| Fighting after the round | `ttt_postround_dm` | On lets everyone fight freely after the round has ended. Starts off. Choices: `0` (Off), `1` (On). |
| Respawn wave interval (seconds) | `ttt_spawn_wave_interval` | The seconds between spawn waves. 0 spawns players straight away. Starts at 0. |

### Garry's Mod (server.cfg): TTT roles

6 settings in `server.cfg`, shown under **TTT roles** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Share of traitors | `ttt_traitor_pct` | The fraction of players who become traitors: 0.25 is a quarter. Starts at 0.25. |
| Most traitors | `ttt_traitor_max` | The most traitors there can be in a round. Starts at 32. |
| Share of detectives | `ttt_detective_pct` | The fraction of players who become detectives. Starts at 0.13. |
| Most detectives | `ttt_detective_max` | The most detectives there can be in a round. Starts at 32. |
| Players needed for detectives | `ttt_detective_min_players` | With fewer players than this there are no detectives. Starts at 8. |
| Karma needed to be a detective | `ttt_detective_karma_min` | Players with less karma than this are not picked as a detective. Starts at 600. |

### Garry's Mod (server.cfg): TTT credits

9 settings in `server.cfg`, shown under **TTT credits** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Traitor starting credits | `ttt_credits_starting` | The equipment credits each traitor starts with. Starts at 2. |
| Credit award threshold | `ttt_credits_award_pct` | The share of innocent players that must be dead before the traitors earn a credit award: 0.35 is just over a third. Starts at 0.35. |
| Credits per award | `ttt_credits_award_size` | How many credits each award gives. Starts at 1. |
| Repeat the award | `ttt_credits_award_repeat` | Whether the award is given again each time the threshold is passed again. Starts on. Choices: `0` (Off), `1` (On). |
| Credits for killing a detective | `ttt_credits_detectivekill` | The credits traitors get for killing a detective. Starts at 1. |
| Last traitor bonus | `ttt_credits_alonebonus` | The extra credits a traitor gets when they are alone. Starts at 1. |
| Detective starting credits | `ttt_det_credits_starting` | The equipment credits each detective starts with. Starts at 1. |
| Detective credits for a traitor kill | `ttt_det_credits_traitorkill` | The credits detectives get when a traitor is killed. Starts at 0. |
| Detective credits for a traitor death | `ttt_det_credits_traitordead` | The credits detectives get when a traitor dies. Starts at 1. |

### Garry's Mod (server.cfg): TTT karma

12 settings in `server.cfg`, shown under **TTT karma** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Karma system | `ttt_karma` | On turns karma on. Karma goes down when you kill your own side, and a player with low karma does less damage and can be kicked. Starts on. Choices: `0` (Off), `1` (On). |
| Starting karma | `ttt_karma_starting` | The karma every player starts with. Starts at 1000. |
| Highest karma | `ttt_karma_max` | The most karma a player can have. Starts at 1000. |
| Karma lost per wrongful kill | `ttt_karma_kill_penalty` | The karma taken away for killing a player on your own side. Starts at 15. |
| Karma gained each round | `ttt_karma_round_increment` | The karma every player gets back at the end of each round. Starts at 5. |
| Clean round bonus | `ttt_karma_clean_bonus` | The extra karma for a round without wrongful kills. Starts at 30. |
| Karma for killing a traitor | `ttt_karma_traitorkill_bonus` | The karma gained for killing a traitor. Starts at 40. |
| Remember karma | `ttt_karma_persist` | On keeps each player's karma when the map changes. Starts off. Choices: `0` (Off), `1` (On). |
| Kick players with low karma | `ttt_karma_low_autokick` | On kicks (or bans, see below) players whose karma falls below the low karma line. Starts on. Choices: `0` (Off), `1` (On). |
| Low karma line | `ttt_karma_low_amount` | The karma value below which a player is kicked or banned. Starts at 450. |
| Ban instead of kick | `ttt_karma_low_ban` | On bans players with low karma instead of just kicking them. Starts on. Choices: `0` (Off), `1` (On). |
| Low karma ban length (minutes) | `ttt_karma_low_ban_minutes` | How long the ban for low karma lasts. Starts at 60. |

### Garry's Mod (server.cfg): TTT players

8 settings in `server.cfg`, shown under **TTT players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Idle time before spectating (seconds) | `ttt_idle_limit` | How many seconds a player can do nothing before they are moved to spectator. 0 or less turns it off. Starts at 180. |
| Kick for changing name mid-round | `ttt_namechange_kick` | On kicks players who change their name during a round. Starts on. Choices: `0` (Off), `1` (On). |
| Name change ban length (minutes) | `ttt_namechange_bantime` | How long the ban for changing name lasts. Starts at 10. |
| Dead players can't text-chat with the living | `ttt_limit_spectator_chat` | On stops dead players' chat reaching living players. Starts on. Choices: `0` (Off), `1` (On). |
| Dead players can't talk to the living | `ttt_limit_spectator_voice` | On stops dead players' voice reaching living players. Starts on. Choices: `0` (Off), `1` (On). |
| Voice heard by distance | `ttt_locational_voice` | On makes players hear each other's voice only when close. Starts off. Choices: `0` (Off), `1` (On). |
| Bots start as spectators | `ttt_bots_are_spectators` | On makes bots join as spectators. Starts off. Choices: `0` (Off), `1` (On). |
| Highlight admins | `ttt_highlight_admins` | On shows admins in the scoreboard. Starts on. Choices: `0` (Off), `1` (On). |

## Barotrauma

Barotrauma's server keeps its settings in `serversettings.xml` in the server's install folder, next to `DedicatedServer.exe`. The server's name, ports, player limit, password and whether it is listed publicly are given on the command that starts it, and those are the **Launch options** on the Settings tab.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#barotrauma).

**The panel does not write or edit `serversettings.xml`.** The server makes it the first time it starts. Every setting in it is an attribute of one `<serversettings>` element, which the Settings tab has no editor for, so open it in a text editor with the server stopped. The server writes the file again whenever an admin changes a setting in the game and when it shuts down, so a change made while it runs is lost. The server also drops any attribute it does not know when it writes the file.
**The panel cannot stop the server cleanly.** The server only takes its `exit`, `quit` or `close` command typed into its own console window, and it ignores input from other programs. Stop closes the window and then ends the process. A campaign is saved when it is created and at the end of every round, so stopping in the middle of a round loses that round. Stop between rounds, or type `exit` in the server's window yourself. What a closed window does to the settings file is not known.
**Saves are not in the server's folder.** Campaign saves are in `%LocalAppData%\Daedalic Entertainment GmbH\Barotrauma\Multiplayer` of the Windows user that runs the panel, shared with every other Barotrauma server on this PC and with the game itself. The panel's default backup keeps only the files in the server's folder (the settings, the player permissions, the ban list and the mods you added). To keep the saves too, set the server's backup folders yourself and include that folder.
A server that is not listed publicly has no query port open, so the panel can only tell that it is running, not how many players are on. Players join a server that is not listed by its IP address and game port.
Players and server must run the same game version. Update the server (the Update button) after the game updates.
Mods are Steam Workshop packages. The server downloads nothing by itself: copy each mod's folder (the one with a `filelist.xml` in it) into a `LocalMods` folder in the server's install folder, and list it in `config_player.xml` as `<package path="LocalMods/<folder>/filelist.xml" />` under `<regularpackages>`, in load order (a mod's required mods first), with the server stopped. Players need the same mods; with `AllowModDownloads` on (its default) they can fetch them from the server.
The player and admin permissions are in `Data\clientpermissions.xml`, also edited by hand with the server stopped.

## Necesse

Necesse's server is a Java program (`Server.jar`, with its own Java in the `jre` folder) in the server's install folder. Its world, port, player limit and password are given on the command that starts it, and those are the **Launch options** on the Settings tab. The server's other options are in `cfg\server.cfg`, which it writes itself.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#necesse).

**The panel cannot stop the server cleanly.** The server saves the world when `quit` is typed into its own console window, and it does not save when it is simply closed or ended. The panel has no way to type into a console, so Stop asks the process to close and ends it after 15 seconds. Before you press Stop (or update, or restart), open the server's window, which the panel keeps minimized on the taskbar rather than hidden, type `quit` and wait for the window to close.
**The panel does not write or edit `cfg\server.cfg`.** It is a block of `key = value,` lines with `//` comments that the panel's file readers cannot handle, and the server writes it again when it stops. Open it in a text editor with the server stopped. Settings given on the launch line (port, slots, password, ...) win over the file. Other keys in it include `maxClientLatencySeconds` (how long a laggy player is tolerated), `worldBorderSize` (-1 for none), `droppedItemsLifeMinutes` (0 for forever) and `MOTD`.
**The world's rules are not in a file you can edit while it runs.** Difficulty, death penalty, raid frequency, hunger and the like are stored in `worldSettings.cfg` inside the world's `.zip` in the `saves` folder, which the panel does not touch. Change them in the game as the owner or an admin with the `/difficulty`, `/deathpenalty` and `/raids` commands (and `/settings`), or unzip the save with the server stopped, edit the file and zip it again under its exact original name.
**Nobody is an admin until you add `-owner <your player name>`** in the Launch options. Anyone who joins with exactly that name gets the owner's full rights, so keep a password on the server. Other players can be given rights in the game with `/permissions`.
There is no query port, so the panel can tell that the server is running but not how many players are on. Players join by direct IP and the game port (UDP 14159 by default) from the game's Multiplayer menu. Open that port in Windows Firewall and on your router.
**Mods** are plain `.jar` files. Copy them into the `mods` folder in the server's install folder while the server is stopped (the launch line points at it with `-mod .\mods`). The server does not download Steam Workshop mods itself: subscribe in your own Steam client and copy the jars from `steamapps\workshop\content\1169040\<item id>`. Players need the same mods, and a mod built for another game version can stop the server from starting; delete the newest jar to recover. Back up the saves before adding or removing mods.

## Left 4 Dead 2

Left 4 Dead 2 is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `left4dead2\cfg` folder of the server. The game does not ship that file, so the panel writes it with the server's name, the password and the setting that lets friends join directly. The map, the player limit and the port are on the launch line.

- `server.cfg`: Every setting of the server: its name and password, who can join, the rules, the difficulty and Director tuning, voting, downloads, network limits, logging and the remote console. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#left-4-dead-2).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`. They must not use the matchmaking menu, because the game starts with `sv_allow_lobby_connect_only` on, which lets nobody in except through a lobby. The panel writes it off. If a friend gets a lobby error, they used matchmaking instead of `connect`.
There is no world or save to back up: a round starts again from the campaign's first map. The backup keeps the settings, the ban lists and the addons folder.
Many of the Difficulty tuning and Director settings are marked as cheat commands on Valve's list. Whether a line in `server.cfg` changes them was not tested, so a value you set there may have no effect. The mode of a map can also be changed by the map command or a lobby, whatever `mp_gamemode` says.
The Steam login token is optional. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.
Mods: Steam Workshop addons given when the server is created are downloaded once into `left4dead2\addons` as `.vpk` files. Collections are not followed: give the addons' own ids. Every player needs the same addons or is refused. To add more later, copy their `.vpk` files into that folder. SourceMod and Metamod, the usual plugin tools, are not installed by the panel.
The port in the Ports section is the game port: UDP for players and TCP for the remote console. The game also uses UDP 27020 (SourceTV and the Steam client). Two Source servers on one PC both want it, so the second one may take another number.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The game has nothing to save, so that is safe. Valve does not document a close command; the research found only indirect evidence that `quit` works.
The Valve list that the settings come from is a 2021 dump of game version 2.2.2.1. The form leaves out the settings that list does not explain. A setting the file has that the panel does not explain is still shown.

### Left 4 Dead 2: Server

4 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name shown in the server browser and the server list. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Contact email | `sv_contact` | The email address of the person running the server, shown with the server's details. |
| Server tags | `sv_tags` | Extra labels shown to players browsing for servers. Separate several with commas. |

### Left 4 Dead 2: Joining

7 settings in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | On makes a LAN server: it is not announced to Steam, players are not checked against Steam and only local addresses can join. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |
| Only allow joining through a lobby | `sv_allow_lobby_connect_only` | On means players can only arrive through matchmaking (a lobby) and cannot connect directly. The game starts with this on; the panel writes it off, so friends can join with the console command connect or from the server browser. Choices: `0` (Direct joining allowed), `1` (Lobby only). |
| Steam group | `sv_steamgroup` | The number of a Steam group to tie the server to. The group's number is on the group's admin profile page on the Steam community site. |
| Steam group first | `sv_steamgroup_exclusive` | On means that while the server is empty only members of the Steam group can join; anyone can join once it has players. Choices: `0` (Off), `1` (On). |
| Lobby search key | `sv_search_key` | When a lobby looks for a dedicated server it only takes servers with the same key. Use it to keep the server for your own lobbies. |
| Shown player limit | `sv_visiblemaxplayers` | Changes the player limit that people browsing the server list see. -1 shows the real limit. |
| Lobby reservation time (seconds) | `sv_reservation_timeout` | How many seconds a lobby's reservation of the server lasts before it runs out. |

### Left 4 Dead 2: Game rules

9 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game mode | `mp_gamemode` | The mode being played. Valve's list notes it is changed by the map command (map `<name>` `<mode>`), so a map change or a lobby can override what is written here. Choices: `coop` (Co-op), `realism` (Realism), `versus` (Versus), `survival` (Survival), `scavenge` (Scavenge), `holdout` (Holdout). Another value can be typed. |
| Difficulty | `z_difficulty` | How hard the game is. The game's menu calls Hard "Advanced" and Impossible "Expert". Choices: `Easy`, `Normal`, `Hard`, `Impossible`. |
| Maximum survivors | `survivor_limit` | The most survivors there can be. Vanilla co-op servers hold 4 players (8 in Versus); more needs add-ons. |
| Most player-controlled infected | `z_max_player_zombies` | The most humans who can play the infected team at the same time. |
| Weapons after a rescue | `survivor_respawn_with_guns` | What a rescued survivor is carrying when they come back. Choices: `0` (Just a pistol), `1` (A weaker version of the last main weapon), `2` (The last main weapon). |
| Disable rescuing dead survivors | `sv_rescue_disabled` | On means dead survivors can never be rescued. Choices: `0` (Off), `1` (On). |
| Restart the campaign on a wipe | `sv_permawipe` | On restarts the campaign from the start if all the survivors die. Choices: `0` (Off), `1` (On). |
| Players can pause | `sv_pausable` | Whether the game can be paused on the server. Choices: `0` (Off), `1` (On). |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands. Keep it off on a server other people play on. Choices: `0` (Off), `1` (On). |

### Left 4 Dead 2: Voice

2 settings in `server.cfg`, shown under **Voice** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Everyone hears everyone | `sv_alltalk` | On lets every player hear every other player's voice, whatever team they are on. Choices: `0` (Off), `1` (On). |
| Voice chat | `sv_voiceenable` | Turns voice chat on or off for the whole server. Choices: `0` (Off), `1` (On). |

### Left 4 Dead 2: Difficulty tuning

7 settings in `server.cfg`, shown under **Difficulty tuning** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Times a survivor can be downed | `survivor_max_incapacitated_count` | How many times a survivor can be incapacitated, instead of killed, before they need a health kit. |
| Health after being revived | `survivor_revive_health` | The temporary health a survivor has after being revived. |
| First-aid kit healing | `first_aid_heal_percent` | The share of a survivor's injuries a first-aid kit heals: 0.8 is 80 percent. Use a number from 0 to 1. |
| Pills only below this health | `pain_pills_health_threshold` | Pain pills cannot be used unless the survivor's total health is below this number. |
| Common infected health | `z_health` | The maximum health of an ordinary zombie. |
| Tank health | `z_tank_health` | The maximum health of a Tank. |
| Witch health | `z_witch_health` | The maximum health of a Witch. |

### Left 4 Dead 2: Director

19 settings in `server.cfg`, shown under **Director** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Common infected at once | `z_common_limit` | How many ordinary zombies can exist at the same time. More is harder and costs the server more CPU. |
| No Tanks or Witches | `director_no_bosses` | On stops Tanks and Witches from spawning. Choices: `0` (Off), `1` (On). |
| No hordes | `director_no_mobs` | On stops horde rushes. Choices: `0` (Off), `1` (On). |
| No special infected | `director_no_specials` | On stops special infected from spawning. Choices: `0` (Off), `1` (On). |
| No survivor bots | `director_no_survivor_bots` | On stops the survivor team being filled up with bots. Choices: `0` (Off), `1` (On). |
| Endless panic events | `director_panic_forever` | On makes panic events (waves of zombies) never end. Choices: `0` (Off), `1` (On). |
| Infected bots fill empty slots | `director_allow_infected_bots` | Lets bots fill empty places on the infected team. Choices: `0` (Off), `1` (On). |
| Idle time before spectating (seconds) | `director_afk_timeout` | Players who do nothing for longer than this are moved to spectator mode. |
| Players needed to start | `director_min_start_players` | Players are frozen until this many have joined; then the mission starts. |
| Ready-up time (seconds) | `director_ready_duration` | If not 0, the survivor team has this long to get ready before starting out. |
| Unfreeze time (seconds) | `director_unfreeze_time` | How many seconds to wait, after the first player has connected, before a team is unfrozen. |
| Map transition wait (seconds) | `director_transition_timeout` | How many seconds the game waits for the survivors to cross into the next map. |
| Pills become kits (not Expert) | `director_convert_pills` | Lets pain pills be turned into health kits or defibrillators on difficulties below Expert. Choices: `0` (Off), `1` (On). |
| Pills become kits (Versus) | `director_vs_convert_pills` | What share of the pain pills become health kits in Versus: 0.5 is half. Use a number from 0 to 1. |
| Survival setup time (seconds) | `director_survival_setup_time` | The time allowed to set up before a Survival round starts by itself. 0 means none. |
| Allow an all-bot survivor team | `allow_all_bot_survivor_team` | Allows a survivor team made only of bots. A human player is still needed for the game to be active. Choices: `0` (Off), `1` (On). |
| Allow a server of only bots | `sb_all_bot_game` | Allows a game with no human players at all. Choices: `0` (Off), `1` (On). |
| Survivor bots may lead | `sb_allow_leading` | If not 0, survivor bots can lead the way and do not always wait behind the human leader. Choices: `0` (Off), `1` (On). |
| Survivor bots hurt other survivors | `sb_friendlyfire` | Whether a survivor bot's bullets hurt the other survivors. Choices: `0` (Off), `1` (On). |

### Left 4 Dead 2: Versus

4 settings in `server.cfg`, shown under **Versus** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Versus force-start time (seconds) | `versus_force_start_time` | A Versus game is started after this long even if survivors are still inside the safe room. |
| Versus Tank chance | `versus_tank_chance` | The chance of a Tank in a regular Versus map: 0.75 is 75 percent. Use a number from 0 to 1. |
| Versus Witch chance | `versus_witch_chance` | The chance of a Witch in a regular Versus map: 0.75 is 75 percent. Use a number from 0 to 1. |
| Losing team plays survivors first | `versus_winning_team_goes_last` | On means the team that is losing plays as the survivors first. Choices: `0` (Off), `1` (On). |

### Left 4 Dead 2: Survival

5 settings in `server.cfg`, shown under **Survival** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Most special infected alive | `survival_max_specials` | The most special infected alive at one time in Survival. |
| Seconds between hordes | `survival_horde_stage_interval` | The seconds between horde attacks in Survival. |
| Seconds between special infected | `survival_special_spawn_interval` | The seconds between waves of special infected in Survival. |
| Seconds between Tanks | `survival_tank_stage_interval` | The seconds between Tank attacks in Survival. |
| Restart delay (seconds) | `survival_round_restart_delay` | After a loss, the round restarts after this many seconds. |

### Left 4 Dead 2: Scavenge

4 settings in `server.cfg`, shown under **Scavenge** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Setup time (seconds) | `scavenge_round_setup_time` | The setup time before a Scavenge round starts. |
| Starting clock (seconds) | `scavenge_round_initial_time` | The time on the clock when a Scavenge round starts. |
| Time added per can (seconds) | `scavenge_score_bonus_time` | The time added to the clock every time a team scores. |
| Can respawn delay (seconds) | `scavenge_item_respawn_delay` | After a scavenge item is destroyed, how many seconds until it comes back. |

### Left 4 Dead 2: Voting

14 settings in `server.cfg`, shown under **Voting** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow voting | `sv_allow_votes` | Lets players hold votes. Valve's list says the game's mod support is needed first. Choices: `0` (Off), `1` (On). |
| Votes to kick players | `sv_vote_issue_kick_allowed` | Whether players can hold votes to kick other players. Choices: `0` (Off), `1` (On). |
| Vote-kick ban length (minutes) | `sv_vote_kick_ban_duration` | How long a player who was voted out stays banned from the server. |
| Votes to change difficulty | `sv_vote_issue_change_difficulty_allowed` | Whether players can hold votes to change the difficulty. Choices: `0` (Off), `1` (On). |
| Votes to change map now | `sv_vote_issue_change_map_now_allowed` | Whether players can hold votes to change the map immediately. Choices: `0` (Off), `1` (On). |
| Votes to change map after the round | `sv_vote_issue_change_map_later_allowed` | Whether players can hold votes to change the map after this round. Choices: `0` (Off), `1` (On). |
| Votes to change campaign | `sv_vote_issue_change_mission_allowed` | Whether players can hold votes to change the campaign (mission). Choices: `0` (Off), `1` (On). |
| Votes to restart | `sv_vote_issue_restart_game_allowed` | Whether players can hold votes to restart the game. Choices: `0` (Off), `1` (On). |
| Time between one player's votes (seconds) | `sv_vote_creation_timer` | How often one player can call a vote. |
| Cooldown after a failed vote (seconds) | `sv_vote_failure_timer` | A vote that fails cannot be called again for this long. |
| Failed votes per player per map | `sv_vote_plr_map_limit` | The number of failed votes one player can call on each map. |
| How long a vote stays open (seconds) | `sv_vote_timer_duration` | How long voting on an issue stays open. |
| Delay before a passed vote acts | `sv_vote_command_delay` | How long after a vote passes until the action happens. |
| Show who called the vote | `sv_vote_show_caller` | Shows the name of the person who called the vote. Choices: `0` (Off), `1` (On). |

### Left 4 Dead 2: Files and downloads

6 settings in `server.cfg`, shown under **Files and downloads** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| File consistency check | `sv_consistency` | Whether the server makes players' critical game files match its own. One Steam forum user reports that turning it off lets players join without the server's custom addons; that is not confirmed by Valve. Choices: `0` (Off), `1` (On). |
| Kick for mismatched files | `sv_pure_kick_clients` | On kicks players whose files do not match; off only warns them. Choices: `0` (Only warn), `1` (Kick). |
| Players can download from the server | `sv_allowdownload` | Lets players download files from the game server. Choices: `0` (Off), `1` (On). |
| Players can upload files | `sv_allowupload` | Lets players upload their custom files, such as sprays. Choices: `0` (Off), `1` (On). |
| Fast download web address | `sv_downloadurl` | The address of a web server that holds files players are missing, so they can fetch them from there. Whether it serves the addons in left4dead2/addons was not confirmed. |
| Largest upload (MB) | `net_maxfilesize` | The largest file, in megabytes, a player may upload. |

### Left 4 Dead 2: Network and performance

16 settings in `server.cfg`, shown under **Network and performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Minimum data per player | `sv_minrate` | The least data per second the server allows for one player. 0 means unlimited. |
| Maximum data per player | `sv_maxrate` | The most data per second the server allows for one player. 0 means unlimited. |
| Minimum updates per second | `sv_minupdaterate` | The fewest updates per second the server allows for each player. |
| Maximum updates per second | `sv_maxupdaterate` | The most updates per second the server allows for each player. |
| Minimum command rate | `sv_mincmdrate` | Sets the lowest value for the number of packets per second a player's game sends. 0 means unlimited. |
| Maximum command rate | `sv_maxcmdrate` | If the minimum command rate is above 0, this sets the highest value for the number of packets per second a player's game sends. |
| Minimum interpolation ratio | `sv_client_min_interp_ratio` | Limits the players' cl_interp_ratio from below. -1 lets players set it to anything. |
| Maximum interpolation ratio | `sv_client_max_interp_ratio` | Limits the players' cl_interp_ratio from above. It has no effect while the minimum is -1. |
| Force client prediction | `sv_client_predict` | Can force the players' cl_predict setting: -1 lets each player choose, 0 forces it off, 1 forces it on. Choices: `-1` (Each player chooses), `0` (Force off), `1` (Force on). |
| Idle disconnect time (seconds) | `sv_timeout` | How many seconds without any message from a player before they are dropped. |
| Lag compensation | `sv_unlag` | Turns on lag compensation for players. Choices: `0` (Off), `1` (On). |
| Longest lag compensation (seconds) | `sv_maxunlag` | The longest delay, in seconds, the server will make up for when checking a hit. |
| Sleep when empty | `sv_hibernate_when_empty` | On puts the server into a very low CPU mode while nobody is connected. Choices: `0` (Off), `1` (On). |
| Delay before sleeping (seconds) | `sv_hibernate_postgame_delay` | How many seconds to wait after the last player leaves before the server goes to sleep. |
| Server-list queries per second | `sv_max_queries_sec` | The most server-browser queries per second the server answers from one address. |
| Server-list queries per second, total | `sv_max_queries_sec_global` | The most server-browser queries per second the server answers from all addresses together. |

### Left 4 Dead 2: Logging

7 settings in `server.cfg`, shown under **Logging** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Write a log file | `sv_logfile` | Writes the server's information to its log file. Choices: `0` (Off), `1` (On). |
| One log file | `sv_log_onefile` | Logs to a single file instead of a new one each time. Choices: `0` (Off), `1` (On). |
| Log bans | `sv_logbans` | Writes the server's bans to its log. Choices: `0` (Off), `1` (On). |
| Show the log in the console | `sv_logecho` | Also prints the log information in the server's console. Choices: `0` (Off), `1` (On). |
| Write the log at every line | `sv_logflush` | Writes the log to the disk at every line. It is slow. Choices: `0` (Off), `1` (On). |
| Log folder | `sv_logsdir` | The folder, inside the game folder, where the server's logs are kept. |
| Log remote console use | `sv_rcon_log` | Writes a log of remote console (RCON) use. Choices: `0` (Off), `1` (On). |

### Left 4 Dead 2: Remote console and bans

6 settings in `server.cfg`, shown under **Remote console and bans** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON). Choose a long one: anyone with it controls the server. The panel does not use the remote console for this server. Changing it while the server runs disconnects everyone logged in remotely. |
| Wrong passwords before a ban | `sv_rcon_maxfailures` | How many times one address may get the remote console password wrong before it is banned. |
| Wrong passwords in the window | `sv_rcon_minfailures` | How many wrong remote console passwords within the time window below lead to a ban. |
| Window for wrong passwords (seconds) | `sv_rcon_minfailuretime` | The number of seconds over which wrong remote console passwords are counted. |
| Remote login ban length (minutes) | `sv_rcon_banpenalty` | How many minutes someone who fails the remote console login is banned for. |
| Allow the banid command | `sv_banid_enabled` | Whether the server supports the banid command for banning players. Choices: `0` (Off), `1` (On). |

## Squad

Squad is set up by the files in `SquadGame\ServerConfig` (the name, player limit, map rotation, admins) and by a few arguments on the command that starts it, which are the **Launch options** on the Settings tab. The panel writes the server's name and player limit into `Server.cfg` when it creates the server. The other files are edited by hand with a text editor.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#squad).

**The settings files are not in the Settings tab.** They use `//` for comments, which the panel's file readers would show as settings, and `Server.cfg` keeps the name between double quotes. Edit them with a text editor while the server is stopped; the game reads them when it starts, and its updates do not overwrite them (new settings have to be added by hand). `Server.cfg` is `Key=value` per line: ServerName (keep the double quotes, or the server may not be visible), ShouldAdvertise, IsLANMatch, MaxPlayers, NumReservedSlots, PublicQueueLimit, MapRotationMode, team change and team-kill rules, and more. The wiki page Server Configuration lists them.
**Admins** are in `Admins.cfg`: a group line `Group=Admin:kick,ban,changemap` and then `Admin=<SteamID64>:Admin` for each person (the wiki asks for the 17-digit SteamID64). Permission names include changemap, kick, ban, balance, chat, cheat, private, config, reserve, immune and manageserver. A group with only `reserve` gives a reserved slot.
**There is no join password setting.** The game's own `Server.cfg` has no key for one (a `ServerPassword` line is mentioned only by third-party pages and was not confirmed). The wiki's way is the console command `AdminSetServerPassword <password>`, used by an admin with the `private` permission, and it sets the password on the running server.
**Maps:** the server starts with `RANDOM=NONE`, and what is played next is set by `MapRotationMode` in `Server.cfg`: `LevelList` and `LayerList` follow `LevelRotation.cfg` and `LayerRotation.cfg` (one name per line, comments on their own line); `LayerList_Vote` lets players vote and uses `LayerVoting.cfg` and `VoteConfig.cfg`. The wiki says a freshly installed server votes on layers. A layer name must be written exactly (`Belaya_AAS_v1`); a typo stops it loading.
**Stop:** the game's documented clean stop is Ctrl+C in its window. The panel closes the window and, after 15 seconds, ends the program. No source documents a saved world, so nothing is known to be lost, but players are disconnected and whether closing the window ends the server promptly was not tested. All Squad servers run as `SquadGameServer.exe`; the panel only closes the one that runs from this server's folder.
**No player count.** The game's remote console can report one, but the panel does not talk to it, so the Players page shows only whether the server is running. The remote console is off: the panel writes `Rcon.cfg` with an empty `Password`, which the wiki says keeps it off. To use an outside tool such as SquadJS, set a long `Password` in `Rcon.cfg` (and a different `Port` than 21114 for a second server on this PC).
**Ports:** game 7787 (and 7788), Steam query 27165 (and 27166), beacon 15000 (one per server) and, if turned on, the remote console 21114. The wiki opens each of them for both UDP and TCP. The panel keeps 7788 free but does not keep 27166 free or check the beacon port against other servers. The Ports section cannot rewrite this game's start script, so to change a port, edit `Start_Squad.bat` by hand (keep `Port=` first on the line) and stop and start the server.
**Before the first start:** close the Steam program on this PC (the wiki says the server will not start with it open), allow `SquadGameServer.exe` through the firewall, and install the Visual C++ 2013 and 2015 runtimes and the DirectX June 2010 runtime that the wiki lists. Playing on the same network as the server needs NAT loopback on the router, and playing on the server PC itself means starting the server before Steam. Third-party hosting guides, not the wiki, estimate 16 GB of memory at 50 players and 32 GB at 80.
**Mods:** Squad mods are Steam Workshop items. The ids given when the server is created are downloaded once, with SteamCMD, into `SquadGame\Plugins\Mods\<id>`; the server does not fetch them itself and there is no mod list in `Server.cfg` or on the launch line. Each mod's layers must be added to the rotation file by hand (the exact names are on its Workshop page), and some mods also need a line in `ModsConfig.cfg`, whose format the panel does not know. Every player needs the same mods. The panel does not update them later, a game update can stop a mod from working until its author updates it, and some are many gigabytes. To add a mod later, copy its Workshop download into that folder while the server is stopped.
**Licensing:** a server made here is unlicensed. The wiki says unlicensed servers appear only in the Custom Servers browser; licensed ones need at least 60 slots and 10 admins and a key from the game's makers placed in `License.cfg`. The panel does not handle a license.
The research could not confirm which program stays running after `SquadGameServer.exe` starts, the default ports the game uses when an argument is missing, or the files a fresh install ships. The first start on a real install should be checked against this guide.

## Arma Reforger

Arma Reforger keeps everything in one JSON file, `Configs\server-config.json` in the server's folder: the name, passwords, scenario, player limit, rules, saving and the mod list. The server finds it from the `-config` argument on the launch line, which also sets the frame rate limit and the profile folder.

- `server-config.json`: The server's name, passwords, scenario, player limit, rules, autosave, network ports and mod list.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#arma-reforger).

Players join through the in-game server browser, or by IP address and the game port (UDP 2001 by default). Forward the game port and the Steam query port on the router.
Mods are not a launch argument. They are the `game.mods` list in the JSON file, one entry per mod with its Workshop id, for example `[{"modID": "5D6EBC81EB1842EF", "name": "Enfusion Persistence Framework"}]`. The id is the 16-letter code in the mod's Workshop web address, not a Steam number. The Bohemia wiki spells the key `modID`; another site writes `modId`, and the key is case-sensitive, so use the wiki's. A mod's own dependencies must be listed as their own entries. The server downloads the mods itself the next time it starts, and players get them when they join. `#restart` in the game does not reload the list.
Admins are the `game.admins` list: player identity ids or Steam ids, up to 20. A listed admin can type `#login` without a password. Everyone else uses `#login` and the admin password.
The scenario is one `.conf` path. To see the paths, add the -listScenarios launch option, start the server once and read its log.
The server has no known clean way to be stopped from the panel: Stop closes its window and, after 15 seconds, ends it. It autosaves every 10 minutes by default (Saving group), so a forced stop can lose that much play.
The game also has a remote console (UDP port 19999, set up in the `rcon` part of the file, needs a password of 3 or more letters). The panel does not use it and the file the panel writes has none.
The BattlEye file `BattlEye\BEServer_x64.cfg` in the server's folder must only ever have lines added to it, never edited, or BattlEye stops working. The panel does not touch it.
Change `publicPort` and `a2s.port` here if you move the ports: the Ports section changes the panel's own record but not this file.

### Reforger: Server

6 settings in `server-config.json`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `game.name` | The name shown in the in-game server browser. Up to 100 characters. |
| Join password | `game.password` | The password players must type to join. Leave it empty for a server anyone can join. |
| Admin password | `game.passwordAdmin` | Lets a player take admin control of the server: in the lobby press C, or in the game press Return, then type #login followed by this password. It cannot contain spaces. |
| Scenario | `game.scenarioId` | The scenario (mission) the server runs, written as the path of its .conf file. Only one can be set: Arma Reforger does not rotate missions. To see the paths, add the -listScenarios launch option and read the server's log. |
| Max players | `game.maxPlayers` | The most players that can be on the server at once, from 1 to 128. The default is 64. |
| Listed in the server browser | `game.visible` | Whether the server shows up in the in-game server browser. Turn it off for a private server that friends join by IP address. The default is on. |

### Reforger: Players

3 settings in `server-config.json`, shown under **Players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow Xbox and PlayStation players | `game.crossPlatform` | Yes lets players on PC, Xbox and PlayStation join; no accepts PC players only (the default). Console players cannot install mods, so a server with mods may turn them away. |
| Join queue size | `operating.joinQueue.maxSize` | How many players can wait in line to join when the server is full, from 0 to 50. 0 turns the queue off, which is the default. |
| Reserved slot after a kick (seconds) | `operating.slotReservationTimeout` | How long the server and the game's backend keep a slot free for a player who was kicked by the network system, so they can come back. From 5 to 300 seconds, default 60. |

### Reforger: Rules

6 settings in `server-config.json`, shown under **Rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| BattlEye anti-cheat | `game.gameProperties.battlEye` | Turns the BattlEye anti-cheat on or off for the server. It is on by default. |
| Fast validation | `game.gameProperties.fastValidation` | How the server checks that a joining player's copy of the map matches the server's. On exchanges the least data. The wiki says to keep it on for any server that people join over the internet; turn it off only when testing on one PC, to find exactly what differs after a mismatch. |
| First person view only | `game.gameProperties.disableThirdPerson` | Forces every player to use the first-person view, with no third-person camera. |
| Hide the voice chat display | `game.gameProperties.VONDisableUI` | Players do not see the voice chat (VON, voice over network) display on their screen. |
| Hide the direct speech display | `game.gameProperties.VONDisableDirectSpeechUI` | Players do not see the voice chat display for direct speech, the talking to people next to you. |
| Talk on other factions' radios | `game.gameProperties.VONCanTransmitCrossFaction` | On lets players speak on the radios of other factions. Off, the default, lets them only listen to those. |

### Reforger: View distance

3 settings in `server-config.json`, shown under **View distance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Farthest view distance | `game.gameProperties.serverMaxViewDistance` | The farthest distance players can see, set by the server. From 500 to 10000, default 1600. |
| Smallest grass distance (meters) | `game.gameProperties.serverMinGrassDistance` | The minimum distance, in meters, at which players see grass. 0, the default, forces nothing on players. Otherwise use a value from 50 to 150. |
| Network view distance | `game.gameProperties.networkViewDistance` | The farthest range at which the server sends things (vehicles, people and so on) to a player. From 500 to 5000, default 1500. A larger range asks more of the server and the network. |

### Reforger: Saving

6 settings in `server-config.json`, shown under **Saving** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Autosave every (minutes) | `game.gameProperties.persistence.autoSaveInterval` | How often the server saves the current mission on its own, when the mission supports it. From 0 to 60 minutes, default 10. 0 turns autosave off. If the server is ever stopped by force, up to this much play can be lost. |
| Saves to keep | `game.gameProperties.persistence.saveRetention` | How many save points are kept for the current mission, from 1 to 128. The default is 10. |
| Continue from the latest save | `game.gameProperties.persistence.loadSessionSave` | Loads the latest available save point automatically on the first start. The default is on. |
| Keep saves after the mission ends | `game.gameProperties.persistence.keepSessionSave` | Keeps the save points of a playthrough after its mission is finished. The default is off. |
| Server number (hive id) | `game.gameProperties.persistence.hiveId` | A number from 0 to 16383 that tells servers apart when several share the same save database, so their saves do not mix. The default is 0, which is right for a single server. |
| Save players every (seconds) | `operating.playerSaveTime` | How often players are saved, for both online and local storage. The default is 120 seconds. A player save can also be requested at any time. |

### Reforger: AI

2 settings in `server-config.json`, shown under **AI** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Turn off all AI | `operating.disableAI` | The server does not run any AI at all, so no computer-controlled characters exist. It is off by default. |
| Most AI characters | `operating.aiLimit` | The most AI characters that can exist at once. A negative number, the default of -1, means no limit. The -aiLimit launch option, if it is used, overrides this. |

### Reforger: Network

6 settings in `server-config.json`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game port (UDP) | `publicPort` | The UDP port registered for the server and the one players connect to. The default is 2001. If the server sits behind a router, this is the port forwarded to it. The Ports section does not change this file, so change the port in both places. |
| Bind address | `bindAddress` | The IP address of this PC the server listens on. The wiki says to leave it out of the file for almost everyone; left out or empty it listens on every address (0.0.0.0). |
| Bind port (UDP) | `bindPort` | The UDP port the server listens on. The wiki says to leave it out so it follows the game port above; only needed for special port forwarding. |
| Public address | `publicAddress` | The IP address registered with the game's backend, which players use to reach the server. Left out or empty, the backend finds it itself, which is what the wiki recommends. The word local makes the server use the address of this PC's network card. |
| Steam query address | `a2s.address` | The IP address the Steam server-query service listens on. It can limit queries to one network card. 0.0.0.0 means every address. |
| Steam query port (UDP) | `a2s.port` | The UDP port the Steam server query (A2S) listens on. The game's own default is 17777; the panel gives a new server 17877 so it does not clash with another game. The Ports section does not change this file. |

### Reforger: Remote console

5 settings in `server-config.json`, shown under **Remote console** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Remote console address | `rcon.address` | The IP address the game's remote console listens on. Required when the remote console is used. The panel does not use this console. |
| Remote console port (UDP) | `rcon.port` | The UDP port the game's remote console listens on. The default is 19999. |
| Remote console password | `rcon.password` | The password for the remote console. The console does not start without it. It must have at least 3 characters and no spaces. |
| Remote console clients | `rcon.maxClients` | The most remote console clients connected at once, from 1 to 16. The default is 16. A client that quits stays counted for another 30 seconds. |
| Remote console rights | `rcon.permission` | What everyone who connects to the remote console may do. Choices: `admin` (Admin: can run any command), `monitor` (Monitor: only commands that do not change the server). |

### Reforger: Advanced

3 settings in `server-config.json`, shown under **Advanced** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Report the real player list | `operating.lobbyPlayerSynchronise` | Sends the list of players on the server to the game's backend with each heartbeat, so the player count in the server browser matches the real number. It is on by default. |
| No crash reports | `operating.disableCrashReporter` | Turns off the report the server sends automatically when it crashes. It has the same effect as the -disableCrashReporter launch option. Off by default. |
| Stay up when the backend is lost | `operating.disableServerShutdown` | On, the server does not shut itself down when its connection to the game's backend is lost. Other causes, such as a broken settings file, still shut it down. Off by default. |

## VEIN

VEIN keeps its settings in two files in the server's install folder, under `Vein\Saved\Config\WindowsServer`. `Game.ini` holds the name, join password, player limit, admins and whitelist. `Engine.ini` holds the rules of the world (PvP, zombies, loot, time) as console variables under `[ConsoleVariables]`. The game's ports are arguments on the start script's launch line (**Launch options**).

- `Game.ini`: The server's name and description, join password, player limit, admins (by Steam ID), the whitelist, the Steam VAC switch and the Discord chat links.
- `Engine.ini`: The rules of the world as `vein.*` console variables: PvP, zombies and hordes, time speed, loot, how long water and power last, and autosave.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#vein).

There is no admin password. A player becomes an admin only when their 17-digit Steam ID (SteamID64) is in `AdminSteamIDs` or `SuperAdminSteamIDs`. The panel writes no admin line, so add your own on the Settings tab, or in the file with 'Edit as text'. Every entry after the first needs a leading plus sign (`+AdminSteamIDs=`), or it replaces the one before it.
Stop the server before editing the files and restart it afterwards: VEIN does not apply file changes while it runs. The game removes lines that only repeat a default value, so a line you set to the default may vanish; nothing is broken.
The panel writes `Engine.ini` with only its `[ConsoleVariables]` header. To change a rule, add its line under that header with 'Edit as text', for example `vein.PvP=0`. The Settings tab explains the rules it knows, but the community lists of them are incomplete and out of date in places. Use 1 and 0 for on and off.
Stopping the server asks its console window to close. No source documents a safe shutdown, a stop command or a remote console (the old RCON port was removed in 0.019 Hotfix 2). It is not known whether the world is saved on the way out, so use the in-game admin menu's save button (Server section) before you stop it.
Forward the two UDP ports (game and query). If a Windows server does not show up in the server browser and its log says the Steam dedicated server API failed to start, Ramjet suggests running it with administrator rights. Players can also connect directly with the address and game port.
VEIN has no Steam Workshop and no official server mod support, and the panel adds nothing for mods. The server needs at least 8 GB of RAM to start, and more as players join.

### VEIN (Game.ini): Server

4 settings in `Game.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Max players | `MaxPlayers` in `[/Script/Engine.GameSession]` | The most players that can be on at once. Ramjet's example is 16 (the figure it treats as the default), the wiki's example is 64, and one host reports about 32 as a practical limit. More players need more memory: the server needs at least 8 GB of RAM just to start. |
| Server name | `ServerName` in `[/Script/Vein.VeinGameSession]` | The name shown in VEIN's server browser. One host limits it to 64 characters. |
| Server description | `ServerDescription` in `[/Script/Vein.VeinGameSession]` | Shown when a player selects your server in the browser. Use it for rules, the play style or a Discord link, like a message of the day. |
| Listed in the server browser | `bPublic` in `[/Script/Vein.VeinGameSession]` | False hides the server from the in-game browser. One host reports that this may not take effect on the current build, so also set a password if the server must stay private. Choices: `True` (Listed), `False` (Not listed). |

### VEIN (Game.ini): Access

2 settings in `Game.ini`, shown under **Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Join password | `Password` in `[/Script/Vein.VeinGameSession]` | What players type to join. Leave it empty for a server anyone can join. It is not an admin password. A host reports that passwords are case-sensitive and that letters, numbers, dashes and underscores are the safe characters. |
| Steam VAC anti-cheat | `bVACEnabled` in `[OnlineSubsystemSteam]` | Turns Valve's anti-cheat on (1) or off (0) for the server. Ramjet's example has it off. Choices: `0` (Off), `1` (On). |

### VEIN (Game.ini): Admins

4 settings in `Game.ini`, shown under **Admins** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Super admin (Steam ID) | `SuperAdminSteamIDs` in `[/Script/Vein.VeinGameSession]` | A super admin is an admin who can also promote and demote other admins from inside the game; it is enough to list yourself here. A Steam ID is the 17-digit SteamID64 (it starts with 7656); steamid.io looks it up from a profile link. Put the first one here and any more under 'Extra super admin'. |
| Extra super admin (Steam ID) | `+SuperAdminSteamIDs` in `[/Script/Vein.VeinGameSession]` | A second or later super admin. Every entry after the first has to start with a plus sign in the file, or it replaces the one before it. Add more of these lines in the file with 'Edit as text'. |
| Admin (Steam ID) | `AdminSteamIDs` in `[/Script/Vein.VeinGameSession]` | Makes one Steam player an admin, who can use the in-game console and admin menu. There is no admin password; admin comes only from the Steam ID. A new game file may carry the placeholder 1234, which you replace. A Steam ID is the 17-digit SteamID64 (it starts with 7656); steamid.io looks it up from a profile link. |
| Extra admin (Steam ID) | `+AdminSteamIDs` in `[/Script/Vein.VeinGameSession]` | A second or later admin. Every entry after the first has to start with a plus sign in the file, or it replaces the one before it and only the last counts. Add more of these lines in the file with 'Edit as text'. |

### VEIN (Game.ini): Whitelist

2 settings in `Game.ini`, shown under **Whitelist** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allowed player (Steam ID) | `WhitelistedPlayers` in `[/Script/Vein.VeinGameStateBase]` | A whitelist (VEIN 0.023 and later). If there is any entry, only these players can join. Leave the section out to let anyone join. A Steam ID is the 17-digit SteamID64 (it starts with 7656); steamid.io looks it up from a profile link. |
| Extra allowed player (Steam ID) | `+WhitelistedPlayers` in `[/Script/Vein.VeinGameStateBase]` | A second or later whitelisted player. Every entry after the first has to start with a plus sign in the file. Add more of these lines in the file with 'Edit as text'. |

### VEIN (Game.ini): Network

1 setting in `Game.ini`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Bind address | `BindAddr` in `[/Script/Vein.VeinGameSession]` | The IP address the server listens on. Normally it does not need to be set or changed; it matters only for a PC with several network addresses. |

### VEIN (Game.ini): Discord

2 settings in `Game.ini`, shown under **Discord** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Discord chat webhook | `DiscordChatWebhookURL` in `[/Script/Vein.ServerSettings]` | Sends the in-game global chat to a Discord channel. Make the webhook in Discord (channel settings, Integrations, Webhooks) and keep the web address in double quotes. |
| Discord admin reports webhook | `DiscordChatAdminWebhookURL` in `[/Script/Vein.ServerSettings]` | Sends admin reports to a separate Discord channel. Written the same way as the chat webhook, in the same section. |

### VEIN (Game.ini): Display

1 setting in `Game.ini`, shown under **Display** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Show admin badges on the scoreboard | `GS_ShowScoreboardBadges` in `[/Script/Vein.ServerSettings]` | Shows (1) or hides (0) the admin badges on the in-game scoreboard. Choices: `1` (Show), `0` (Hide). |

### VEIN (Engine.ini): Players and bases

7 settings in `Engine.ini`, shown under **Players and bases** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Players can hurt each other | `vein.PvP` in `[ConsoleVariables]` | Whether players can damage other players. The list gives 1 (on) as the default. Choices: `1` (On), `0` (Off). |
| Players can damage bases | `vein.BuildObjectPvP` in `[ConsoleVariables]` | Whether players can damage other players' bases. The list gives 1 (on) as the default. Choices: `1` (On), `0` (Off). |
| Base damage | `vein.BaseDamage` in `[ConsoleVariables]` | Turns damage to bases on or off. The list gives 1 (on) as the default. Choices: `1` (On), `0` (Off). |
| Bases decay over time | `vein.BuildObjectDecay` in `[ConsoleVariables]` | When on (1), bases slowly decay. The list gives 1 as the default and does not give the other allowed values. |
| Permadeath | `vein.Permadeath` in `[ConsoleVariables]` | When on (1), players can not respawn after they die. The list gives 0 (off) as the default. |
| Players always turn into zombies on death | `vein.AlwaysBecomeZombie` in `[ConsoleVariables]` | When on (1), a player who dies always becomes a zombie. The list gives 0 (off) as the default. |
| XP gain | `vein.Stats.XPMultiplier` in `[ConsoleVariables]` | How fast players earn experience. The list gives a range of 0.1 to 10 and a default of 1. |

### VEIN (Engine.ini): Zombies

8 settings in `Engine.ini`, shown under **Zombies** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Zombie health | `vein.Zombies.Health` in `[ConsoleVariables]` | How much health zombies have. The list gives a range of 0.1 to 100 and a default of 40. |
| Zombie speed | `vein.Zombies.SpeedMultiplier` in `[ConsoleVariables]` | How fast zombies move, as a multiplier. The list gives a range of 0.1 to 3 and a default of 1. |
| Zombie damage | `vein.Zombies.DamageMultiplier` in `[ConsoleVariables]` | How hard zombies hit, as a multiplier. The list gives a range of 0.1 to 5 and a default of 1. |
| Zombie hearing | `vein.Zombies.HearingMultiplier` in `[ConsoleVariables]` | How far zombies hear noise, as a multiplier. The list gives a range of 0.1 to 2 and a default of 1. |
| Zombie sight | `vein.Zombies.SightMultiplier` in `[ConsoleVariables]` | How far zombies see, as a multiplier. The list gives a range of 0.1 to 2 and a default of 1. |
| Zombies can climb | `vein.Zombies.CanClimb` in `[ConsoleVariables]` | Whether zombies can climb over obstacles. The list gives 1 (on) as the default and does not give the other allowed values. |
| Zombies only take headshot damage | `vein.Zombies.HeadshotOnly` in `[ConsoleVariables]` | When on (1), zombies only take damage from headshots. The list gives 0 (off) as the default. |
| Infection chance per hit | `vein.ZombieInfectionChance` in `[ConsoleVariables]` | The chance that a zombie hit infects the player. The list gives a range of 0 to 1 and a default of 0.01, which is 1 in 100. |

### VEIN (Engine.ini): Spawning and hordes

12 settings in `Engine.ini`, shown under **Spawning and hordes** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Zombies and animals spawn | `vein.AISpawner.Enabled` in `[ConsoleVariables]` | Turns AI spawning on or off. The list gives 1 (on) as the default. Choices: `1` (On), `0` (Off). |
| Spawn limit (all) | `vein.AISpawner.SpawnCapMultiplier` in `[ConsoleVariables]` | A multiplier for the most AI that can exist at once. The list gives a default of 1 and no range. |
| Spawn limit (zombies) | `vein.AISpawner.SpawnCapMultiplierZombie` in `[ConsoleVariables]` | A multiplier for the most zombies that can exist at once. The list gives a default of 1 and no range. |
| Share of zombies that walk | `vein.AISpawner.ZombieWalkerPercentage` in `[ConsoleVariables]` | The fraction of zombies that are walkers, from 0 to 1. The list gives a default of 0.7. |
| Share of zombies that crawl | `vein.AISpawner.ZombieCrawlerPercentage` in `[ConsoleVariables]` | The fraction of zombies that are crawlers, from 0 to 1. The list gives a default of 0.1. |
| Share of zombies that start asleep | `vein.AISpawner.ZombieLayerPercentage` in `[ConsoleVariables]` | The fraction of zombies that start lying down, asleep, from 0 to 1. The list gives a default of 0.1. |
| Horde mode | `vein.AISpawner.HordeMode` in `[ConsoleVariables]` | Turns horde attacks on or off. The list gives 0 (off) as the default. Choices: `1` (On), `0` (Off). |
| Horde spawning | `vein.AISpawner.Horde.Enabled` in `[ConsoleVariables]` | Turns horde spawning on or off. The list gives 1 (on) as the default and does not give the other allowed values. |
| Hordes per minute | `vein.AISpawner.Hordes.ChancePerMinute` in `[ConsoleVariables]` | The average number of hordes that start per minute. The list gives a default of 0.05. |
| Horde length (seconds) | `vein.AISpawner.Hordes.Duration` in `[ConsoleVariables]` | How long each horde event lasts, in seconds. The list gives a default of 120. |
| Horde chance from noise | `vein.AISpawner.Hordes.NoiseEffect` in `[ConsoleVariables]` | Higher means noise brings more hordes. The list gives a default of 0.1. |
| Horde chance from scent | `vein.AISpawner.Hordes.ScentEffect` in `[ConsoleVariables]` | Higher means scent brings more hordes. The list gives a default of 0.5. |

### VEIN (Engine.ini): Time

6 settings in `Engine.ini`, shown under **Time** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Time speed | `vein.Time.TimeMultiplier` in `[ConsoleVariables]` | How fast the game world's clock runs. The list gives a range of 1 to 16 and a default of 16. Lower is slower, which also slows hunger and thirst indirectly. |
| Night time speed | `vein.Time.NightTimeMultiplier` in `[ConsoleVariables]` | A multiplier for how fast time runs at night. The list gives a default of 3. |
| Night speed starts at (hour) | `vein.Time.NightTimeMultiplierStart` in `[ConsoleVariables]` | The hour of the day when the faster night time starts. The list gives a default of 20. |
| Night speed ends at (hour) | `vein.Time.NightTimeMultiplierEnd` in `[ConsoleVariables]` | The hour of the day when the faster night time ends. The list gives a default of 6. |
| Clock runs on an empty server | `vein.Time.ContinueWithNoPlayers` in `[ConsoleVariables]` | When on (1), game time keeps passing when nobody is online. The list gives 0 (off) as the default. |
| Start day offset | `vein.Time.StartOffsetDays` in `[ConsoleVariables]` | The day offset used for a new world. The list gives a default of 0. |

### VEIN (Engine.ini): Loot and the world

5 settings in `Engine.ini`, shown under **Loot and the world** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Loot scarcity | `vein.Scarcity.Difficulty` in `[ConsoleVariables]` | How much loot there is to find. The lists give a range of 0 to 4 with a default of 2, which they call standard. Choices: `0` (0 - None), `1` (1 - More loot), `2` (2 - Standard), `3` (3 - Less loot), `4` (4 - Impossible). |
| Loot containers refill | `vein.ContainersRespawn.Enabled` in `[ConsoleVariables]` | Whether loot containers refill after they are emptied. The list gives 1 (on) as the default. Choices: `1` (On), `0` (Off). |
| Container refill time (seconds) | `vein.ContainersRespawn.Interval` in `[ConsoleVariables]` | How long before emptied loot containers refill. The list gives a range of 600 to 43200 and a default of 10800, which is 3 hours. |
| Days until the water stops | `vein.Calendar.WaterShutoffTimeDays` in `[ConsoleVariables]` | How many game days until the water supply goes off. The list gives a range of 1 to 999 and a default of 30. |
| Days until the power stops | `vein.Calendar.ElectricalShutoffTimeDays` in `[ConsoleVariables]` | How many game days until the electricity goes off. The list gives a range of 1 to 999 and a default of 46. |

### VEIN (Engine.ini): Saving

1 setting in `Engine.ini`, shown under **Saving** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Autosave every (seconds) | `vein.Autosave.Interval` in `[ConsoleVariables]` | How often the server saves the world, in seconds. The list gives a default of 300, which is 5 minutes. |

## Space Engineers

Space Engineers' dedicated server keeps its options in `SpaceEngineers-Dedicated.cfg` and in each world's `Sandbox_config.sbc`, inside the `Data` folder in the server's install folder. The panel writes the first config file and starts the server with `-console -path` and the game port; those, the player limit and a few more are the **Launch options** on the Settings tab.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#space-engineers).

**What the panel set up.** When the server was created it wrote `Data\SpaceEngineers-Dedicated.cfg` with the server name you typed, "public", a limit of 8 players (or the number you chose), and a ready-made world from the game's own files (Star System: a star with planets and moons, which takes about 1.6 GB of memory once running). The game makes your world from it **the first time the server starts**, in `Data\Saves\<server name>`, which takes a few seconds longer than usual. The server is ready when its log (Logs tab) says `Game ready...`. If the config file is ever missing, the game starts but does nothing: it logs that it has no world and sits idle.
**Where the settings are.** The server's name is read from the config file at every start. The world's rules (game mode, player limit, multipliers, oxygen, trash removal, mods) are copied from the config into the world when it is made, and from then on they live in the world's own `Data\Saves\<world>\Sandbox_config.sbc`: change them there. Changing the rules in the config file later does nothing for a world that already exists. The admin, ban and reserved-slot lists are in the config file. Both are XML the Settings tab cannot edit, so open them in a text editor with the server stopped: the game rewrites them while it runs. The join password is stored as a hash with a salt, made by the game's setup window; it cannot be typed in.
**A different or fresh world.** The server continues the world it ran last. To start over, stop the server, take a backup, and delete the `Data\Saves` folder: the next start builds a new world from the config again (the config's server name is used as the world's name). To use a world of your own, copy its folder into `Data\Saves` and set `LoadWorld` in the config to the folder's full path, with the drive letter (the wiki's way; the panel has not tried it). A world made on your own PC is in `%AppData%\SpaceEngineers\Saves\<your Steam ID>`.
**Stop does not save.** The game ignores the panel's request to close, so after 15 seconds the panel ends it, and the game does not save when it is ended. It saves by itself every 5 minutes (the log says `Autosave`), so a Stop can lose up to the last 5 minutes of building. To lose nothing, press Stop right after an autosave. A world ended this way loaded normally on the next start.
The game port is on the launch line and is the only port to open (UDP). The game answers Steam's server-list queries on that same port, and its `SteamPort` setting is not used. The panel also switches the game's remote web API off in the config file.
Mods are Steam Workshop items listed in the world's `Sandbox_config.sbc` (and, in older guides, in the config file). The server downloads them when it starts and players get them when they join. Take a backup before removing a mod that added blocks: grids built with them can be damaged.
This is the plain game server from Keen. The Torch wrapper (a separate community program with plugins, which runs the game inside its own `Torch.Server.exe`) is not supported by the panel.

## Terraria (tModLoader)

This is Terraria running on tModLoader, the mod loader, which is the only Terraria server the panel can install without a Steam account. It is a .NET program (`tModLoader.dll`, with its .NET runtime in the `dotnet` folder) in the server's install folder. The world, its name and the password are in `serverconfig.txt`; the game port and the player limit are the **Launch options**. Players need tModLoader (free on Steam), not plain Terraria.

- `serverconfig.txt`: The world to load, how a new one is made (size, name, seed, difficulty), the password and message of the day, and a few network and mod settings. One `key=value` per line; a line starting with `#` is ignored.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#terraria-tmodloader).

**The panel cannot stop the server cleanly.** The world is saved when `exit` is typed into the server's own console window; the Terraria wiki says the server saves on shutdown only with that command. The panel has no way to type into a console, so Stop asks the window to close and ends the process after 15 seconds, and the world keeps only what the server saved before (it also saves from time to time, how often is not documented). Before you press Stop, update or restart, open the server's window, which the panel keeps minimized on the taskbar rather than hidden, type `exit` and wait for it to close. `exit-nosave` throws the changes away.
**Only tModLoader players can join, and they need the same mods.** Plain Terraria cannot join, even with no mods on the server, and a tModLoader player cannot join a plain Terraria server. The player's tModLoader version has to match too (the first three numbers of its version). The game offers to download any missing mods when a player joins.
**The first start takes a few minutes.** The panel installs tModLoader from its GitHub release, which does not include the .NET runtime; the first time the server starts, tModLoader's own script downloads it into the `dotnet` folder, so the PC needs internet. The server shows as stopped until it has finished. Windows may ask to allow `dotnet.exe` through the firewall: allow it. If a first start fails half way, start it again; if it keeps failing, stop the server, delete the `dotnet` folder and start again.
**Port.** The game port is TCP (7878 here, because 7777 is the default of Valheim and Satisfactory, which the panel also hosts); players type it after your address. Open it in Windows Firewall and forward it on your router. There is no query port, so the panel can tell that the server is running but not how many players are on.
**Settings.** Stop the server before editing `serverconfig.txt`; it is read when the server starts. A line that starts with `#` is ignored, which is how the game's example file switches settings off. The game port and the player limit are on the launch line, not in this file. The world, size, name, seed and difficulty only matter when a new world is made. There is no setting for Corruption or Crimson; to choose, make the world in the game and copy its `.wld` and `.twld` files into `tmldata\Worlds`, then put the `.wld` path on the `world=` line.
**Values with a space on the launch line break.** The start script that tModLoader ships joins its arguments into one string and splits it on spaces again, so a launch option such as a folder with a space in it falls apart. Keep launch values to one word; the world's name, path and the password are in `serverconfig.txt`, where spaces are fine.
**Mods** are Steam Workshop items of tModLoader. Mods you list when creating the server are downloaded once with SteamCMD into `steamapps\workshop`, and their internal names are written to `tmldata\Mods\enabled.json`, which is what decides which mods load. Steam does not download the mods a mod needs, so look at the 'Required items' on its Workshop page and list those too. A `.tmod` file copied into `tmldata\Mods` by hand also needs its internal name added to `enabled.json`. Each mod's own settings are files in `tmldata\ModConfigs`. The panel does not download or update mods later: a monthly tModLoader release can break mods, so back up before changing either. Removing a mod from an existing world may lose what it added; no source says that is safe.
**Updates.** The panel installs the newest tModLoader once, when the server is created, and does not update it afterwards. To update, make a new server with the same world files, or replace the files from a newer `tModLoader.zip` by hand while the server is stopped (keep `serverconfig.txt`, `tmldata`, `steamapps` and `dotnet`).
If a mod stops the server from starting or kicks players, read the log: the Logs tab shows `server.log` in the `tModLoader-Logs` folder. Remove the newest mod from `enabled.json` to recover.

### Terraria: World

1 setting in `serverconfig.txt`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| World file | `world` in `[root]` | The full path of the world to load (the .wld file, never the .twld next to it), written without quotes. The panel fills this in with a file named after the world in the server's tmldata\Worlds folder. If the file does not exist, a new world is made there (see 'Create world if missing'). |

### Terraria: New world

4 settings in `serverconfig.txt`, shown under **New world** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Create world if missing | `autocreate` in `[root]` | If the file named on the world line does not exist, the server makes a new world of this size there. It does nothing for a world that already exists. Choices: `1` (Small), `2` (Medium), `3` (Large). |
| New world name | `worldname` in `[root]` | The name a newly made world is given. It has no effect on a world that already exists. The game's world-creation menu limits names to 27 characters. |
| World seed | `seed` in `[root]` | Text the new world is generated from: the same seed gives (almost) the same world. Only used when the world is made. The game also has special seed words, such as 5162020 for a world with both Corruption and Crimson; whether the server's seed line recognises them the way the in-game box does was not tested. |
| World difficulty | `difficulty` in `[root]` | The game mode of a newly made world; it cannot be changed afterwards. Journey is a creative-style mode, and only Journey characters can join a Journey world. The shipped example lists only Classic and Expert; Master and Journey are on the Terraria wiki's server page and are expected to work with tModLoader but were not tested. Without this line the game decides, which was not tested either. Choices: `0` (Classic), `1` (Expert), `2` (Master), `3` (Journey). |

### Terraria: Server

5 settings in `serverconfig.txt`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server password | `password` in `[root]` | What players type to join. Leave the line out for a server anyone can join. The panel writes it when it makes the server. |
| Message of the day | `motd` in `[root]` | A message shown to players when they join. |
| Extra cheat protection | `secure` in `[root]` | Turns on additional server-side checks against cheating (the game's description: 'adds additional cheat protection to the server'). The example file only shows 1, so anything else is expected to mean off. Choices: `1` (On), `0` (Off). |
| Server language | `language` in `[root]` | The language of the server's own console messages. It does not change what players see. Choices: `en-US` (English), `de-DE` (German), `it-IT` (Italian), `fr-FR` (French), `es-ES` (Spanish), `ru-RU` (Russian), `zh-Hans` (Chinese), `pt-BR` (Portuguese), `pl-PL` (Polish). |
| Ban list file | `banlist` in `[root]` | The file that keeps banned players. Without this line the server uses banlist.txt in its folder. The ban and kick commands are typed into the server's console. |

### Terraria: Network

2 settings in `serverconfig.txt`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Auto port-forward (UPnP) | `upnp` in `[root]` | Asks your router to open the game port by itself when the server starts. The Terraria wiki says it does not always work, so forward the port by hand if friends cannot join. The example file only shows 1, so anything else is expected to mean off. Choices: `1` (On), `0` (Off). |
| Enemy smoothing | `npcstream` in `[root]` | Reduces enemies skipping or teleporting for players, at the cost of more network traffic. A lower number is smoother but sends more data; 0 turns it off. The example file uses 60, and tModLoader's own wiki suggests a number around 2 to 6 for a smoother result. |

### Terraria: Performance

1 setting in `serverconfig.txt`, shown under **Performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Process priority | `priority` in `[root]` | How much of the PC's processor time Windows gives the server compared with other programs. The panel does not set it; the game's own example file uses High. A launch argument for the same thing, if you give one, wins. Choices: `0` (Realtime), `1` (High), `2` (Above normal), `3` (Normal), `4` (Below normal), `5` (Idle). |

### Terraria: Mods

2 settings in `serverconfig.txt`, shown under **Mods** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Mods folder | `modpath` in `[root]` | The folder tModLoader looks in for .tmod files and for the list of enabled mods (enabled.json). Without this line it is the Mods folder inside the server's tmldata folder, where the panel's backups look; change it only if you keep mods somewhere else on purpose. |
| Mod pack to load | `modpack` in `[root]` | Loads only the mods in this named mod pack, instead of the list in enabled.json. Mod packs are made in the tModLoader game and are looked up by name in a ModPacks folder next to the mods folder; the server stops with an error if the pack is missing. |

### Terraria: Journey permissions

11 settings in `serverconfig.txt`, shown under **Journey permissions** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Freeze time | `journeypermission_time_setfrozen` in `[root]` | Who may freeze the day and night clock. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. Whether tModLoader honours the Journey permission lines was not tested. Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Set time to dawn | `journeypermission_time_setdawn` in `[root]` | Who may jump the time to dawn. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. Whether tModLoader honours the Journey permission lines was not tested. Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Set time to noon | `journeypermission_time_setnoon` in `[root]` | Who may jump the time to noon. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. Whether tModLoader honours the Journey permission lines was not tested. Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Set time to dusk | `journeypermission_time_setdusk` in `[root]` | Who may jump the time to dusk. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. Whether tModLoader honours the Journey permission lines was not tested. Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Set time to midnight | `journeypermission_time_setmidnight` in `[root]` | Who may jump the time to midnight. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. Whether tModLoader honours the Journey permission lines was not tested. Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Time speed | `journeypermission_time_setspeed` in `[root]` | Who may change how fast time passes. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. Whether tModLoader honours the Journey permission lines was not tested. Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| God mode | `journeypermission_godmode` in `[root]` | Who may turn on god mode. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. Whether tModLoader honours the Journey permission lines was not tested. Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Wind strength | `journeypermission_wind_setstrength` in `[root]` | Who may set the wind strength. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. Whether tModLoader honours the Journey permission lines was not tested. Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Freeze wind | `journeypermission_wind_setfrozen` in `[root]` | Who may freeze the wind. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. Whether tModLoader honours the Journey permission lines was not tested. Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Rain strength | `journeypermission_rain_setstrength` in `[root]` | Who may set the rain strength. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. Whether tModLoader honours the Journey permission lines was not tested. Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Freeze rain | `journeypermission_rain_setfrozen` in `[root]` | Who may freeze the rain. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. Whether tModLoader honours the Journey permission lines was not tested. Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |

## Sven Co-op

Sven Co-op is set up with console variables: lines of a name and a value in `server.cfg`, in the `svencoop` folder of the server. The panel writes the server's name and password in it when it creates the server, and you change the rest on the Settings tab. The map, the player limit and the port are on the launch line.

- `server.cfg`: Every server setting: name and password, rules, map time, voting, voice, network and downloads. Only the lines you set are in the file; a setting that is not there keeps the game's own value.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#sven-co-op).

The game reads this file when a map starts (its manual says changes you save while the server runs take effect on the next map), so stop and start the server, or wait for the next map, after changing a setting.
The wiki asks for `hostname` to be the first line of the file, so the server does not show up under its default name. The panel writes it there; keep it there if you edit the file by hand.
Stopping: the only way the manual describes to stop the server is closing its window. The research found no console command to quit, so the panel's Stop closes the server's window and, after 15 seconds, ends the program. Do not run an update while a server is running; the update fails.
The remote console (RCON) is on the game port over TCP, with the password set by `rcon_password`. The panel does not use it for this server.
Custom maps are not a panel feature. Extract a map's archive into the `svencoop_addons` folder (its `maps`, `models`, `sound`, `sprites` and WAD files), never into the `svencoop` folder; the manual says a `scripts` folder in an archive should hold only a `maps` folder, and that anything else is suspicious. Players download custom content from the server when `sv_allowdownload` is on; for speed, point `sv_downloadurl` at a web server that holds it.
AngelScript plugins are listed in `default_plugins.txt`, and the admin list is `admins.txt` (one Steam ID per line). Their formats, the map cycle, the map vote list, the skill file and the plugin packs Metamod and AMX Mod X are not in the form; the research did not find their syntax.
Settings the wiki marks as obsolete in Sven Co-op (allow_spectators, sv_alltalk, sv_spectalk, sv_spectator_password, mp_fraglimit) are not in the form. Leave `deathmatch` at 1 and do not use `coop`; the wiki says the game depends on it.
A setting the file has that the panel does not explain is still shown.

### Sven Co-op: Server

6 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name shown in the server browser. The panel writes it when it creates the server, as the first line of the file, which the wiki asks for so the server does not appear under its default name (Sven Co-op v5.0 server). About 40 characters is the most the wiki suggests. |
| Join password | `sv_password` | What players type to join. Leave it empty for a public server. |
| Contact email | `sv_contact` | The email address of whoever runs the server, so players have someone to contact when there is a problem. Empty by default. |
| Server region | `sv_region` | The region your server is in. It is used in Steam's server browser, so players can look for servers near them. The game starts at 255, International. Choices: `-1` (Do not list), `0` (USA, east coast), `1` (USA, west coast), `2` (South America), `3` (Europe), `4` (Asia), `5` (Australia (Oceania)), `6` (Middle East), `7` (Africa), `255` (International). |
| Local network only | `sv_lan` | On makes a server for a local area network only: players sign in with their IP address and can only join from the same subnet as the server. Keep it off for a server friends join over the internet. Starts off. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Allow spectator proxies (HLTV) | `sv_proxies` | On lets spectator proxies (HLTV) connect to your server. Starts off. Choices: `0` (Off), `1` (On). Another value can be typed. |

### Sven Co-op: Remote console and cheats

2 settings in `server.cfg`, shown under **Remote console and cheats** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON, over TCP on the game port). While it is empty, remote access is not available. The panel does not use the remote console for this server. |
| Cheat commands | `sv_cheats` | Who may use cheat commands: nobody, everyone, or administrators only. The wiki says that on an internet server the player slots must be 3 or fewer for ordinary players to use cheats. Starts at nobody. Choices: `0` (Nobody), `1` (Everyone), `2` (Administrators only). |

### Sven Co-op: Rules

23 settings in `server.cfg`, shown under **Rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Difficulty | `skill` | The default skill level of your server. Maps can override it in their own configuration. The game starts at Realistic. Choices: `0` (The map chooses), `1` (Easy), `2` (Hard), `3` (Realistic). |
| Classic Mode | `mp_classic_mode` | Allow or refuse Classic Mode on maps that support it. -1 lets the players vote. Starts at -1. Choices: `-1` (Players vote), `0` (Disabled), `1` (Enabled). |
| Killing allied NPCs | `mp_npckill` | What happens when someone kills an allied NPC. 0 disallows it, 1 allows it, and 2 allows it only for killers that are not players, not allied and not passive humans. Starts at 1. This replaces the old killnpc setting. Choices: `0` (Not allowed), `1` (Allowed), `2` (Only non-player, non-allied, non-human-passive killers). |
| Realistic fall damage | `mp_falldamage` | On uses realistic fall damage. Off means a player hurt by falling always loses 10 health points. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Flashlight | `mp_flashlight` | Whether players can use their flashlight. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Footstep sounds | `mp_footsteps` | Players make footstep sounds while running fast enough. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Telefragging | `mp_telefrag` | On means a player who is teleported inside someone kills them. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Players can drop weapons | `mp_dropweapons` | Lets players drop weapons and ammo. Miniguns and shock rifles can always be dropped. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Weapons stay | `mp_weaponstay` | On lets weapons be picked up several times, except miniguns. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| No akimbo uzis | `mp_no_akimbo_uzis` | On denies players akimbo uzis. Starts off. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Players can change model | `mp_modelselection` | Off stops players changing their model. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| More than one spawn point | `mp_multiplespawn` | Lets players use more than one spawn point. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Force respawn | `mp_forcerespawn` | Forces players to respawn after they die. The wiki recommends leaving it off, so players respawn when they are ready. Starts off. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Respawn delay (seconds) | `mp_respawndelay` | How many seconds a player must wait before respawning. Starts at 6. |
| Show monster information | `mp_allowmonsterinfo` | Lets players see information about the monsters they look at. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Banana bombs | `mp_banana` | Lets players throw banana bombs. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Grapple pulls the player | `mp_grapple_mode` | On pulls a grappled player towards monsters bigger than headcrabs, rather than pulling the monster to the player. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| No blast gibs | `mp_noblastgibs` | On stops monsters being gibbed (ripped apart) when killed with explosives. Starts off. Choices: `0` (Off), `1` (On). Another value can be typed. |
| No auto-climb | `mp_disable_autoclimb` | On denies players the auto-climb feature. Starts off. Choices: `0` (Off), `1` (On). Another value can be typed. |
| No skill auto-balancing | `mp_disable_pcbalancing` | On disables skill auto-balancing. Starts off. Choices: `0` (Off), `1` (On). Another value can be typed. |
| No Barnacle grapple on players | `mp_disable_player_rappel` | On denies players the use of the Barnacle grapple on each other. Starts off. Choices: `0` (Off), `1` (On). Another value can be typed. |
| No gauss jump | `mp_disablegaussjump` | On disables the vertical knock back caused by the gauss cannon's charge-up shot. Starts off. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Anyone can pause | `pausable` | Whether anyone on the server can pause the game. The wiki never recommends it on a public server. Starts off. Choices: `0` (Off), `1` (On). Another value can be typed. |

### Sven Co-op: Map time

3 settings in `server.cfg`, shown under **Map time** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Map time limit (minutes) | `mp_timelimit` | The map changes after this many minutes if it has not been completed already. 0 means no limit. Starts at 60. |
| Time limit when empty (minutes) | `mp_timelimit_empty` | The map changes after this many minutes when the server is empty, whatever the map's own time limit says. 0 turns this off. Starts at 10. |
| Ignore the map's time limit | `mp_notimelimit` | On disables a map's time limit (mp_timelimit). Starts off. Choices: `0` (Off), `1` (On). Another value can be typed. |

### Sven Co-op: Voting

10 settings in `server.cfg`, shown under **Voting** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Players can vote | `mp_voteallow` | Allows players to use the built-in voting system. The wiki suggests turning it off if you run plug-in packs such as AdminMod or AMX Mod X. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Votes needed to kick (%) | `mp_votekickrequired` | The percentage of players that must say yes for a kick vote to succeed. -1 disables it. Starts at 66. |
| Votes needed to ban (%) | `mp_votebanrequired` | The percentage of players that must say yes for a ban vote to succeed. -1 disables it, which is where it starts. |
| Votes needed to kill (%) | `mp_votekillrequired` | The percentage of players that must say yes for a kill (slay) vote to succeed. -1 disables it. Starts at 51. |
| Votes needed to change map (%) | `mp_votemaprequired` | The percentage of players that must say yes for a map vote to succeed. -1 disables it. Starts at 66. |
| Votes needed for Classic Mode (%) | `mp_voteclassicmoderequired` | The percentage of players that must say yes for a Classic Mode vote to succeed. -1 disables it. Starts at 51. |
| Wait before another poll (seconds) | `mp_playervotedelay` | How many seconds a player must wait before starting another poll. Starts at 300. |
| Wait between polls (seconds) | `mp_votetimebetween` | How many seconds must pass before a player other than the previous poll starter can start a new poll. Starts at 60. |
| Time to vote (seconds) | `mp_votetimecheck` | How many seconds players have to cast their vote. Starts at 20. |
| Respawn delay after a vote kill (seconds) | `mp_votekill_respawndelay` | How many seconds a player must wait before respawning after being killed by a vote. Starts at 15. |

### Sven Co-op: Voice

2 settings in `server.cfg`, shown under **Voice** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Voice chat | `sv_voiceenable` | Lets players use voice communication. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Voice codec | `sv_voicecodec` | The voice codec to use. Only voice_miles and voice_speex are available. Starts at voice_speex. (Only the game's manual lists this one.) Choices: `voice_speex` (Speex), `voice_miles` (Miles). |

### Sven Co-op: Network and performance

7 settings in `server.cfg`, shown under **Network and performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server frame rate | `sys_ticrate` | The most frames per second the server processes. The wiki warns that rates over 200 have a negative effect on physics and NPC movement. The sources disagree on the starting value (100 on the wiki and the manual's configuration page, 128 on the manual's basic page), so check yours. |
| Idle disconnect time (seconds) | `sv_timeout` | How many seconds a player can stop responding before the server counts them as having lost their connection. Starts at 60. |
| Max data per player (bytes/second) | `sv_maxrate` | The most data per second clients can talk to the server at in internet mode. Starts at 20000. |
| Min data per player (bytes/second) | `sv_minrate` | The least data per second clients can talk to the server at in internet mode. Starts at 0. |
| Max updates per second | `sv_maxupdaterate` | The most events per second the server can send to a client. The wiki says 50 is enough for 16 players. Starts at 50. |
| Min updates per second | `sv_minupdaterate` | The fewest events per second the server sends to a client. The wiki asks you not to change it, so players on slow connections can still join. Starts at 10. |
| Local network data rate (bytes/second) | `sv_lan_rate` | The rate clients are forced to talk to the server at in local network mode. Starts at 100000. |

### Sven Co-op: Downloads and sprays

7 settings in `server.cfg`, shown under **Downloads and sprays** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Players download from the server | `sv_allowdownload` | Lets players download custom content from your server. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Fast download web address | `sv_downloadurl` | The HTTP address where your server's custom content can be found, so players can download it very fast. The wiki says HTTPS is not supported. Empty by default. |
| Compress downloads | `sv_filetransfercompression` | Lets custom content be compressed on the fly for faster delivery. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Players upload sprays | `sv_allowupload` | Lets players send custom sprays to your server. Starts on. Choices: `0` (Off), `1` (On). Another value can be typed. |
| Spray delay (seconds) | `decalfrequency` | How many seconds a player must wait before making their spray again. 0 removes the delay, which is not recommended. Starts at 30. |
| Spray file size limit (MB) | `hpk_maxsize` | The size limit, in megabytes, of the file that stores uploaded sprays. Starts at 2. |
| Most decals | `mp_decals` | The most decals the server will render. Starts at 2048. |

## Counter-Strike: Source

Counter-Strike: Source is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `cstrike\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name and password, the remote console password, whether it is local-network only and whether cheats are allowed. Only the lines you set are in the file. The research found no other setting for this game, so the game's rules are not in the form.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#counter-strike-source).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The form is short because the research found only a handful of named settings. Game rules such as friendly fire or round time still work by typing the setting name and its value as a new line in `server.cfg` (a setting the panel does not explain is still shown), but the panel cannot explain them yet.
The Steam login token is optional. Valve says it is only needed when the server stops with error 18 or 106. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command.
No mod support is set up: the research found no install method. A game update through the panel could reset a `server.cfg` that the game itself ships, so check the name and password after updating.
The port in the Ports section is the game port. The game also uses UDP 27020 (SourceTV). Two Source servers on one PC both want it, so the second one may take another number. `-nohltv` turns it off.

### Counter-Strike: Source: Server

3 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON), which Valve says shares the game port. Choose a long one: anyone with it controls the server. The panel does not use the remote console for this server. |

### Counter-Strike: Source: Joining

1 setting in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | On makes a LAN server, useful to stop players joining from the internet: only players on your local network can join. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |

### Counter-Strike: Source: Game rules

1 setting in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on. Choices: `0` (Off), `1` (On). |

## Half-Life 2: Deathmatch

Half-Life 2: Deathmatch is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `hl2mp\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name and password, the match rules (team play, frag and time limits, respawn times), voice, downloads and network limits. Only the lines you set are in the file; a setting you leave out keeps the game's own value. When the file exists, what it says overrides the launch line.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#half-life-2-deathmatch).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The game does not come with a `server.cfg`; the panel writes one. The map rotation is a separate file, `hl2mp\cfg\mapcycle.txt`, with one map name per line. The panel cannot edit it yet. Copy `mapcycle_default.txt` to `mapcycle.txt` and change the copy, never the default file.
Custom maps go in `hl2mp\custom` (or `hl2mp\custom\maps`). Players who do not have your map download it from the server while Downloads are allowed.
The Steam login token is optional. Valve says it is only needed when the server stops with error 18 or 106. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The only stop method the research found is pressing CTRL+C in the console window.
No mod support is set up: the research found no install method for plugins such as SourceMod and no Steam Workshop for this game.
The port in the Ports section is the game port. The game also uses UDP 27020 (SourceTV). Two Source servers on one PC both want it, so the second one may take another number. `-nohltv` turns it off.
Valve's examples start the server with 24 players, while Linode's guide says the game officially supports 16. The panel starts with 16; raise it with the Max players argument if you want to try more.

### Half-Life 2: Deathmatch: Server

2 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |

### Half-Life 2: Deathmatch: Joining

2 settings in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | On makes a LAN server: only players on your local network can join. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |
| Drop silent players after (seconds) | `sv_timeout` | How many seconds a player can send nothing before the server disconnects them. 0 turns the check off. Linode's sample uses 65. |

### Half-Life 2: Deathmatch: Match rules

12 settings in `server.cfg`, shown under **Match rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Team deathmatch | `mp_teamplay` | Off is free-for-all deathmatch. On is Combine versus Rebels team deathmatch. Choices: `0` (Off), `1` (On). |
| Frag limit | `mp_fraglimit` | How many frags (kills) a player needs to end the match, after which the map changes. 0 means no limit. |
| Time limit (minutes) | `mp_timelimit` | How many minutes a map lasts before the server changes it. 0 means no limit. |
| Friendly fire | `mp_friendlyfire` | On lets teammates hurt each other. It only matters in team deathmatch. Choices: `0` (Off), `1` (On). |
| Respawn automatically | `mp_forcerespawn` | On brings a player back to life on their own after they die. Off makes them press a key to respawn. Choices: `0` (Off), `1` (On). |
| Allow spectators | `mp_allowspectators` | On lets players watch the match without playing. Choices: `0` (Off), `1` (On). |
| Fall damage | `mp_falldamage` | The amount of damage a fall does. Linode's sample sets 10 and lists 0 as the default. |
| Footstep sounds | `mp_footsteps` | On plays the sound of players' footsteps. Choices: `0` (Off), `1` (On). |
| Flashlight | `mp_flashlight` | On lets players use their flashlight. Choices: `0` (Off), `1` (On). |
| Pick up props with the use key | `hl2mp_allow_pickup` | On lets players pick up physics objects they can carry by pressing the use key on them. Valve lists it as off by default. Choices: `0` (Off), `1` (On). |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on. Choices: `0` (Off), `1` (On). |
| Map rotation file | `mapcyclefile` | The name of the file that lists the maps the server rotates through, instead of mapcycle.txt. If the file is missing the server uses the game's default rotation list. |

### Half-Life 2: Deathmatch: Weapons and items

2 settings in `server.cfg`, shown under **Weapons and items** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Weapon respawn time (seconds) | `sv_hl2mp_weapon_respawn_time` | How many seconds before a weapon that was picked up appears again. Linode lists 20 as the default. |
| Item respawn time (seconds) | `sv_hl2mp_item_respawn_time` | How many seconds before health, energy, ammo and props that were picked up appear again. Linode lists 30 as the default. |

### Half-Life 2: Deathmatch: Voice

2 settings in `server.cfg`, shown under **Voice** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Voice chat | `sv_voiceenable` | On lets players talk to each other with their microphones. Choices: `0` (Off), `1` (On). |
| Everyone hears everyone | `sv_alltalk` | On lets all players hear each other. Off lets players hear only their own team. Choices: `0` (Off), `1` (On). |

### Half-Life 2: Deathmatch: Downloads

2 settings in `server.cfg`, shown under **Downloads** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow sprays | `sv_allowupload` | On lets players upload their custom spray images to the server. Choices: `0` (Off), `1` (On). |
| Allow downloads | `sv_allowdownload` | On lets players download sprays, custom maps and other extra content from your server. Linode lists it as on by default; a player without your custom map gets it this way. Choices: `0` (Off), `1` (On). |

### Half-Life 2: Deathmatch: Network

4 settings in `server.cfg`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Highest bandwidth per player | `sv_maxrate` | The most bandwidth the server lets one player use. 0 means no limit. |
| Lowest bandwidth per player | `sv_minrate` | The least bandwidth the server lets one player use. Linode lists 3500 as the default. 0 means no limit. |
| Highest updates per second | `sv_maxupdaterate` | The most updates per second the server will send a player. Linode lists 66 as the default and uses 300 in its sample. |
| Lowest updates per second | `sv_minupdaterate` | The fewest updates per second the server allows a player. Linode lists 10 as the default. |

## Astroneer

Astroneer keeps the server's options in two files in `Astro\Saved\Config\WindowsServer` inside the server's install folder. The program takes no launch options.

- `AstroServerSettings.ini`: The server name, join password, the owner (who becomes the server's admin), the public IP address, saving and the server's speed.
- `Engine.ini`: The game port.

The server will not start if the public IP address, the owner's Steam name or the owner's SteamID64 is empty. The panel asks for them when it creates the server.
Every player must set `net.AllowEncryption=False` under `[SystemSettings]` in their own `%LocalAppData%\Astro\Saved\Config\WindowsNoEditor\Engine.ini` before joining, as the server guides say. On Windows the server itself needs no change.
Edit these files only while the server is stopped: the game's own notice is that changes made while it runs are lost.
The panel stops the server by closing it, and Astroneer has no documented way to save first. The world since the last auto-save can be lost, so keep the auto-save interval short.
Mods are `.pak` files put in `Astro\Saved\Paks`. That has not been tested on a server, so the panel adds nothing for them.

### Astroneer (AstroServerSettings.ini): Server

3 settings in `AstroServerSettings.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` in `[/Script/Astro.AstroServerSettings]` | The name shown in the server browser. The hosting panels allow 60 characters at most. |
| Advertised name | `ServerAdvertisedName` in `[/Script/Astro.AstroServerSettings]` | If set, this is shown in the server browser instead of the server name. Leave empty to show the server name. |
| Public IP address | `PublicIP` in `[/Script/Astro.AstroServerSettings]` | The address players use to join, without a port. The server registers itself with it, so it must be the address players actually type. The server does not start if this is empty. |

### Astroneer (AstroServerSettings.ini): Access

5 settings in `AstroServerSettings.ini`, shown under **Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Join password | `ServerPassword` in `[/Script/Astro.AstroServerSettings]` | What players type to join. Letters, numbers, dashes and underscores only. Leave empty for a server anyone can join. |
| Owner's Steam name | `OwnerName` in `[/Script/Astro.AstroServerSettings]` | The server owner's Steam name, spelled exactly the way other players see it. The server does not start if this is empty. |
| Owner's SteamID64 | `OwnerGuid` in `[/Script/Astro.AstroServerSettings]` | The owner's 17-digit SteamID64. Write 0 and the game fills it in when the owner first joins. The server does not start if this is empty. |
| Allowed players only | `DenyUnlistedPlayers` in `[/Script/Astro.AstroServerSettings]` | On: only players already listed in the server's player list can join. Off: anyone with the password (if any) can join. |
| Remote console password | `ConsolePassword` in `[/Script/Astro.AstroServerSettings]` | The password the game's remote console asks for. A hosting guide recommends setting a long random one. The panel does not use the remote console. |

### Astroneer (AstroServerSettings.ini): Saves

3 settings in `AstroServerSettings.ini`, shown under **Saves** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Save file name | `ActiveSaveFileDescriptiveName` in `[/Script/Astro.AstroServerSettings]` | The name of the save the server loads and writes to, without the .savegame ending. The saves are in Astro\Saved\SaveGames. |
| Auto-save every (seconds) | `AutoSaveGameInterval` in `[/Script/Astro.AstroServerSettings]` | How often the game saves the world by itself. 900 is 15 minutes. The panel can only close the server, not ask it to save, so the world since the last save can be lost when the server is stopped. |
| Save backup every (seconds) | `BackupSaveGamesInterval` in `[/Script/Astro.AstroServerSettings]` | How often the game makes a backup copy of the save. 7200 is 2 hours. |

### Astroneer (AstroServerSettings.ini): Performance

3 settings in `AstroServerSettings.ini`, shown under **Performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Kick idle players after (seconds) | `PlayerActivityTimeout` in `[/Script/Astro.AstroServerSettings]` | Players who do nothing for this many seconds are removed. 0 turns this off. |
| Server frame rate (players on) | `MaxServerFramerate` in `[/Script/Astro.AstroServerSettings]` | How many times a second the server updates the world while players are connected. 30 is the default. A higher number such as 60 can feel smoother but uses more of the processor. |
| Server frame rate (nobody on) | `MaxServerIdleFramerate` in `[/Script/Astro.AstroServerSettings]` | How many times a second the server updates the world when nobody is connected. It is kept low on purpose to save processor time, so leave it low. |

### Astroneer (Engine.ini): Network

1 setting in `Engine.ini`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game port | `Port` in `[URL]` | The port players connect to. Change it from the server's Ports section so the panel can check for clashes and open the firewall. Two servers on one PC need different ports. |

## Avorion

Avorion's server is `bin\AvorionServer.exe` in the server's install folder. A galaxy is a folder under `galaxy`, holding its save, its settings file `server.ini` and the mod list `modconfig.lua`. The name, ports, player limit and admin are given on the command that starts the server (the **Launch options** on the Settings tab); the rest of the rules are in `server.ini`.

- `server.ini`: The galaxy's rules, limits, performance, saving, privacy and server information. The server makes it on its first run, so it appears after the first start.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#avorion).

**The panel cannot stop the server cleanly.** The server is stopped by typing `/save` and then `/stop` into its own console window; killing it is not recommended. The panel has no way to type into a console, so Stop asks the process to close and ends it after 15 seconds, and the galaxy keeps only what the server saved before. Before you press Stop (or update, or restart), open the server's window, which the panel keeps minimized on the taskbar rather than hidden, type `/save`, then `/stop`, and wait for the window to close.
**Stop the server before editing `server.ini`, and back it up first.** The server overwrites the file at every start, and a single mistake in it makes the server rebuild the whole file with default settings and a new seed. The file does not exist until the server has run once.
**The join password is in `server.ini`**, as Password under Administration (the Server info group). Set it after the first start, then restart the server. It is empty by default, so anyone can join until you do.
**Nobody is an admin until you give a Steam ID.** The `--admin` launch option takes a player's 17-digit Steam64 id. The create form has a field for it.
**Ports.** The game port (27000 by default) is used for both UDP and TCP, and the panel also uses the next four ports (Steam query, Steam master and query). Forward the game port for UDP and TCP on your router; the panel's firewall check opens UDP only, so allow the TCP port in Windows Firewall yourself. Joining by IP works only on port 27000; another port needs Steam networking. If you change the port in the panel's Ports section, also change `--port` in Launch options, because the panel does not rewrite it.
**Mods** are Steam Workshop ids in `modconfig.lua` in the galaxy folder; the server downloads them the next time it starts, and players are offered the same ones when they join. Put `--` at the start of a line to turn it off, but disabling a mod can corrupt saves, so back up the galaxy first. Mods that are not on the Workshop have to be copied into the galaxy's `mods` folder and listed by hand.
The panel's Launch options reader needs a word that starts with a single dash on the line, and every Avorion argument starts with two, so the start script's window title ends in `-Avorion`. Leave that part of the title alone.
Use only plain English letters in paths and names: the server supports ASCII characters only, in paths and in its log. The server's own log is `serverlog.txt` in `%appdata%\Avorion`, which the Logs tab cannot read.

### Avorion: Rules

13 settings in `server.ini`, shown under **Rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game mode | `Scenario` in `[Game]` | The galaxy's mode: Normal is the regular game, Creative is the build-anything mode. The default is Normal. It is set when the galaxy is made; no source says whether changing it later has an effect. Choices: `0` (Creative), `1` (Normal). |
| Hardcore (perma-destruction) | `HardcoreEnabled` in `[Game]` | Turns hardcore mode on for the whole server: a player's ship, once destroyed, cannot be rebuilt at a repair dock and its turrets and upgrades are lost. The wiki says the default depends on the difficulty the galaxy was made with; another site says it is off. |
| Infinite resources | `InfiniteResources` in `[Game]` | Gives every player unlimited resources (the game's "creative mode"). The default is off. |
| Collision damage | `CollisionDamage` in `[Game]` | A multiplier for the damage objects take when they collide. 0 is no damage and 1 is full damage; a number like 0.5 is half. The default is 1. |
| Story missions | `Storyline` in `[Game]` | Whether the story missions are enabled. The default is on. |
| NPC damage | `DamageMultiplier` in `[Game]` | A multiplier for the damage non-player ships deal. 1 is normal; the default is 1. |
| Random events | `EventsFactor` in `[Game]` | A multiplier for how often random events happen. 1 is normal; the default is 1. |
| Relation gain speed | `RelationGainFactor` in `[Game]` | A multiplier for how fast relations with factions improve. 1 is normal; the default is 1. |
| Relation loss speed | `RelationLossFactor` in `[Game]` | A multiplier for how fast relations with factions get worse. 1 is normal; the default is 1. |
| Starting relations | `InitialRelations` in `[Game]` | How factions feel about new players at the start, from -3 (friendly) to 3 (hostile). The default is 0. |
| Precise NPC aim | `PreciseAIAim` in `[Game]` | When on, non-player ships aim more accurately. The default is off. |
| Allow boarding | `BoardingAllowed` in `[Game]` | Whether ships can be boarded. The default is on. |
| All building materials | `FullBuildingUnlocked` in `[Game]` | Makes every building material available from the start. The default is off. |

### Avorion: Players

5 settings in `server.ini`, shown under **Players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Player-versus-player damage | `PlayerToPlayerDamage` in `[Game]` | Whether players can damage each other's ships, for the whole server. The default is on. |
| Ships safe while offline | `LogoutInvincibility` in `[Game]` | A player's ships cannot be destroyed while that player is offline. The default is on. |
| Offline safety delay (seconds) | `LogoutInvincibilityDelay` in `[Game]` | How long a player must be offline before their ships become invincible, in seconds. The default is 30. |
| Same start sector | `sameStartSector` in `[Game]` | When on, every new player starts in the same sector. When off, each new player gets a random empty sector on the outer rim as their home sector. The default is on. |
| Double-check player input | `SafePlayerInput` in `[Game]` | Experimental. Checks the updates players send to the server and accepts only control input, to stop cheating. The wiki says turning it off gives much smoother performance and turning it on can be very slow over a slow network. The default is off. |

### Avorion: Spawn and resources

3 settings in `server.ini`, shown under **Spawn and resources** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Starting resources | `StartingResources` in `[Game]` | How generous the start is, from -4 (quick start, more resources) to 0 (normal). The default is 0. |
| Resource asteroid density | `ResourceAsteroidFactor` in `[Game]` | A multiplier for how many resource asteroids there are. 1 is normal; the default is 1. |
| Wreckage resources | `ResourceWreckageFactor` in `[Game]` | A multiplier for the resources found in wreckage. 1 is normal; the default is 1. |

### Avorion: Wreckage

2 settings in `server.ini`, shown under **Wreckage** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Big wreckage lasts (seconds) | `BigWreckageDespawnTime` in `[Game]` | How long new large wreckage (more than 15 blocks) made during play, such as in combat, stays before it disappears, in seconds. The default is 1800. |
| Small wreckage lasts (seconds) | `SmallWreckageDespawnTime` in `[Game]` | How long new small wreckage (15 blocks or less) made during play stays before it disappears, in seconds. The default is 900. |

### Avorion: Limits

12 settings in `server.ini`, shown under **Limits** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Fighters per sector and player | `MaximumFightersPerSectorAndPlayer` in `[Game]` | The most fighters one player can have in one sector at once. -1 means no limit, which is the default. |
| Blocks per ship | `MaximumBlocksPerCraft` in `[Game]` | The most blocks any ship can be made of. -1 means no limit, which is the default. |
| Volume per ship | `MaximumVolumePerShip` in `[Game]` | The most volume a ship can reach. -1 means no limit, which is the default. |
| Volume per station | `MaximumVolumePerStation` in `[Game]` | The most volume a station can reach. -1 means no limit, which is the default. |
| Ships per player | `MaximumPlayerShips` in `[Game]` | The most ships one player can own at a time. -1 means no limit, which is the default. |
| Stations per player | `MaximumPlayerStations` in `[Game]` | The most stations one player can own at a time. -1 means no limit, which is the default. |
| Stations per sector | `MaximumStationsPerSector` in `[Game]` | The most stations that can be in one sector. -1 means no limit, which is the default. |
| Ships per alliance | `MaximumAllianceShips` in `[Game]` | The most ships one alliance can own. -1 means no limit, which is the default. |
| Stations per alliance | `MaximumAllianceStations` in `[Game]` | The most stations one alliance can own. -1 means no limit, which is the default. |
| Blocks per turret | `MaximumBlocksPerTurret` in `[Game]` | The most blocks one turret can be made of. The default is 250. |
| Player inventory slots | `PlayerInventorySlots` in `[Game]` | How many inventory slots each player has. The default is 1000. |
| Alliance inventory slots | `AllianceInventorySlots` in `[Game]` | How many inventory slots each alliance has. The default is 1000. |

### Avorion: Performance

8 settings in `server.ini`, shown under **Performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Sector update threads | `workerThreads` in `[System]` | How many threads update the sectors at once (the same as the Threads setting in the game). Keep it at or below the number of processor cores. Sources disagree on the default (1 and 25). |
| Sector generator threads | `generatorThreads` in `[System]` | How many threads make new sectors while players are calculating routes. The default is 2. |
| Script background threads | `scriptBackgroundThreads` in `[System]` | How many threads run heavy script work during play, such as building new ship models. The default is 2. |
| Sectors kept alive per player | `aliveSectorsPerPlayer` in `[System]` | How many sectors stay active for each player and alliance that has ships in them. The wiki says 5 on a multiplayer server. |
| Keep idle sectors (seconds) | `sectorUpdateTimeLimit` in `[System]` | How long sectors that cannot be simulated from a distance stay in memory, in seconds. The default is 300. |
| Empty sector update step (seconds) | `emptySectorUpdateInterval` in `[System]` | The time between update steps for sectors with no players, in seconds. The default is 0.5. |
| Fast sector simulation | `weakUpdate` in `[System]` | Simulates sectors without players with a faster, less accurate update. The default is on. |
| Hang detection | `hangDetection` in `[System]` | Watches for a hung or crashed server. The default is on. |

### Avorion: Saves

3 settings in `server.ini`, shown under **Saves** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Save every (seconds) | `saveInterval` in `[System]` | How often the server saves the galaxy, in seconds. The default in this file is 600 (10 minutes). The --save-interval launch option is a separate setting with a default of 300. |
| Hourly backups | `backups` in `[System]` | Whether the server makes its own backup every hour. The default is on. |
| Backup folder | `backupsPath` in `[System]` | Where the server's own backups go. Empty uses the server's default place. |

### Avorion: Network and privacy

7 settings in `server.ini`, shown under **Network and privacy** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Public | `isPublic` in `[Networking]` | A privacy setting, the same as the --public launch option. The wiki says that when on, only one administrator is allowed and the server does not show up in the LAN menu. The default is on. |
| List publicly | `isListed` in `[Networking]` | Shows the server in the public server list when Steam networking is also on. The default is off. |
| Check players with Steam | `isAuthenticated` in `[Networking]` | Whether players are checked with Steam when they join (the "Authenticate Users" setting in the game). The default is on. |
| Use Steam networking | `useSteam` in `[Networking]` | Lets players join through Steam, for example with "join game". Joining by IP and a port other than 27000 needs this. The default is on. |
| VAC anti-cheat | `vacSecure` in `[Networking]` | Whether Valve's anti-cheat protects the server. The default is on. |
| Update broadcast (seconds) | `broadcastInterval` in `[Networking]` | The time between the server's mass update broadcasts, in seconds. The default is 5. |
| Send stats to admins | `sendStatsToAdmins` in `[Networking]` | Sends server statistics to the administrator. The default is on. |

### Avorion: Remote console

3 settings in `server.ini`, shown under **Remote console** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Remote console password | `rconPassword` in `[Networking]` | The password the remote console (RCON) needs. Empty turns the remote console off, which is the default. The panel does not use it. |
| Remote console port (TCP) | `rconPort` in `[Networking]` | The TCP port of the remote console, when it is on. The default is 27015. |
| Remote console address | `rconIp` in `[Networking]` | The IP address the remote console listens on. Empty listens on all addresses, which is the default. |

### Avorion: Server info

5 settings in `server.ini`, shown under **Server info** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server description | `description` in `[Administration]` | A description shown in the server list. The wiki's default is "An Avorion Server". |
| Join password | `password` in `[Administration]` | What players must type to join; a wrong one kicks them. Empty means anyone can join, which is the default. Set it after the first start, once the server has made this file. |
| Access list | `accessListMode` in `[Administration]` | Whether the server uses a blacklist (everyone can join except those on it) or a whitelist (only those on it can join). The default is Blacklist. Choices: `Blacklist` (Blacklist (everyone but those listed)), `Whitelist` (Whitelist (only those listed)). |
| Allow pausing | `pausable` in `[Administration]` | Lets the server be paused. The default is off. |
| Message of the day | `motd` in `[Game]` | A message shown to players when they join. Empty shows none, which is the default. |

### Avorion: Advanced

3 settings in `server.ini`, shown under **Advanced** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Developer mode | `DevMode` in `[Game]` | Turns on the game's developer mode. Leave it off on a normal server. The default is off. |
| Profiling | `profiling` in `[System]` | Records performance and memory details so the /status command prints a lot more; the server may run slightly slower. The default is off. |
| Send crash reports | `sendCrashReports` in `[System]` | Whether the server sends crash reports. The default is on. |

## Minecraft (vanilla)

Minecraft's own Java server. The settings are in `server.properties` in the server's folder, and the options for the server program are on the launch line of the start script. The panel makes the server, accepts Mojang's EULA for you when you tick the box, and writes the message and the port.

- `server.properties`: The server's settings: the message, the players allowed in, the game mode and difficulty, the world's name and type, and the distances the server works at. One `key=value` per line; the game fills in any key that is missing when it starts.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#minecraft-vanilla).

**Stopping.** Minecraft's own way to stop is the command `stop`, typed into the server's window. The panel cannot type into that window, so its Stop closes the window and, after 15 seconds, ends the java process. That skips the server's normal shutdown and its final save. Before you press Stop, update or restart, open the server's window (the panel keeps it minimized on the taskbar) and type `stop`, then wait for it to close.
**Java 21.** This version needs Java 21 or newer on the PC, and the start script runs `java`, so it must be on the Windows PATH. If the window closes straight away, Java is probably missing or not on the PATH.
**Memory.** The Max Memory field sets how much memory Java may use (`-Xmx`). The dossier suggests at least 2 GB for a small server and 4 GB or more for a bigger one. The panel's default is 4.
**Port.** The game port is TCP. The panel writes it into `server-port` in server.properties, so change it from the server's Ports section, not here; and open it in Windows Firewall and on your router.
**Settings** are read when the server starts: stop and start the server after a change. The game rewrites server.properties on each start and keeps your values.
**Whitelist and operators** are the files `whitelist.json` and `ops.json` in the server's folder. They are not in this form.
**Mods:** none for vanilla. Datapacks are not mods; they go in the world's `datapacks` folder, which the backup keeps with the world.
**Logs:** the dossier does not say where the server writes its log, so the Logs tab shows nothing for this server. The window shows the server's output.

### Minecraft vanilla: Server Info

4 settings in `server.properties`, shown under **Server Info** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server Message | `motd` | The line of text shown under this server's name in the multiplayer server list. Keep it to about 59 characters, or the list can show a communication error. Colour codes work. |
| Max Players | `max-players` | The most players allowed on the server at the same time. The default is 20. |
| Show in Server List | `enable-status` | Whether the server appears as online in the server list. Off makes it show as offline, but players can still connect. Choices: `true` (On), `false` (Off). |
| Hide Player List | `hide-online-players` | Hides the names of the players who are online from the server list. Choices: `true` (On), `false` (Off). |

### Minecraft vanilla: Gameplay

6 settings in `server.properties`, shown under **Gameplay** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Difficulty | `difficulty` | How hard the world is: how much damage monsters do, and how hunger and poison affect players. Choices: `peaceful` (Peaceful), `easy` (Easy), `normal` (Normal), `hard` (Hard). |
| Default Game Mode | `gamemode` | The game mode players join in. Unless Force Default Game Mode is on, players come back in the mode they left. Choices: `survival` (Survival), `creative` (Creative), `adventure` (Adventure), `spectator` (Spectator). |
| Force Default Game Mode | `force-gamemode` | Puts players into the default game mode each time they join, instead of the one they left in. Choices: `true` (On), `false` (Off). |
| Hardcore Mode | `hardcore` | Turns on hardcore mode for newly created worlds. Choices: `true` (On), `false` (Off). |
| Allow Flight | `allow-flight` | Lets players fly in survival mode without being kicked for it. With it on, griefers may become more common. Choices: `true` (On), `false` (Off). |
| Spawn Protection | `spawn-protection` | The size of the area around the spawn point that players cannot change. It is a square with a side of 2 times this number plus 1. 0 turns the protection off. The default is 16. |

### Minecraft vanilla: World

5 settings in `server.properties`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| World Folder Name | `level-name` | The name of the folder the world is saved in. The server loads that world if the folder holds one, and makes a new world there if not. The default is world. |
| World Seed | `level-seed` | The seed a new world is generated from. Leave it blank for a random seed. Only used when a world is made. |
| World Type | `level-type` | The kind of world made for a new world: normal, flat, large biomes, amplified (a higher build limit) or a single biome. Only used when a world is made. Choices: `minecraft:normal` (Normal), `minecraft:flat` (Flat), `minecraft:large_biomes` (Large Biomes), `minecraft:amplified` (Amplified), `minecraft:single_biome_surface` (Single Biome Surface). |
| Generate Structures | `generate-structures` | Whether villages and other structures are generated in new areas. Dungeons still generate when this is off. Choices: `true` (On), `false` (Off). |
| World Border Size | `max-world-size` | How far from the centre of the world the world border reaches, in blocks, from 1 to 29999984. The default is 29999984, and a higher number does nothing. |

### Minecraft vanilla: Players and Access

6 settings in `server.properties`, shown under **Players and Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Whitelist | `white-list` | Only players on the whitelist can join. Operators are always on it. Choices: `true` (On), `false` (Off). |
| Enforce Whitelist | `enforce-whitelist` | Kicks players who are not on the whitelist as soon as the server reloads the whitelist, not only when they try to join. Choices: `true` (On), `false` (Off). |
| Verify Player Accounts | `online-mode` | Lets in only players whose accounts Mojang verifies. Turn it off only for a server that is not on the Internet: fake accounts can then join. Choices: `true` (On), `false` (Off). |
| Require Signed Chat | `enforce-secure-profile` | Lets in only players with a key signed by Mojang. Off lets unsigned chat through, and unsigned chat cannot be reported. Choices: `true` (On), `false` (Off). |
| Idle Timeout (minutes) | `player-idle-timeout` | How many minutes a player can stay idle before being kicked. 0 means idle players are never kicked. |
| Pause When Empty (seconds) | `pause-when-empty-seconds` | How many seconds after the last player leaves before the server pauses. The default is 60. |

### Minecraft vanilla: Performance

3 settings in `server.properties`, shown under **Performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| View Distance (chunks) | `view-distance` | How far, in chunks, the server sends world data to each player. 10 is the default and the recommended value. Higher numbers show more of the world but cost more processing; 3 to 32. |
| Simulation Distance (chunks) | `simulation-distance` | How far, in chunks, from each player the server keeps mobs and growing crops active. 10 is the default and the recommended value; 3 to 32. |
| Entity Range (%) | `entity-broadcast-range-percentage` | How far away mobs and other entities are sent to players, as a percentage. 100 is the default. Higher lets players see them from farther away and can cause more lag; 10 to 1000. |

## Terraria (vanilla)

This is the plain Terraria dedicated server from terraria.org, a console program (`TerrariaServer.exe`) in the server's platform folder. The world, its name and the password are in `serverconfig.txt`; the game port and the player limit are the **Launch options**. The panel installs it once, when the server is made.

- `serverconfig.txt`: The world to load, how a new one is made (size, name, seed, difficulty), the password and message of the day, and a few network and rule settings. One `key=value` per line; a line starting with `#` is ignored.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#terraria-vanilla).

**The panel cannot stop the server cleanly.** The world is saved when `exit` is typed into the server's own console window. The panel has no way to type into a console, so Stop asks the window to close and ends the process after 15 seconds, and the world keeps only what the server saved before. The server also saves at dawn, about every 24 minutes, and the wiki warns that items moved between chests can be lost if the window is closed without `exit`. Before you press Stop, update or restart, open the server's window (the panel keeps it minimized on the taskbar), type `exit` and wait for it to close. `exit-nosave` shuts down without saving, so do not use it by mistake.
**XNA Framework.** The Windows server needs Microsoft XNA Framework 4.0, which the Terraria download does not include. When you create the server the panel asks, then fetches Microsoft's XNA Redistributable itself, checks its checksum and Microsoft signature, and unpacks the DLLs next to `TerrariaServer.exe`. Nothing is installed on your PC. If the server's window closes straight away or shows an error about `Microsoft.Xna.Framework`, check that the `Microsoft.Xna.Framework*.dll` files are in the server's folder.
**Port.** The game port is TCP. The wiki says UDP is only needed for cloud hosts. Open the port in Windows Firewall and forward it on your router. There is no query port, so the panel knows the server is running but not how many players are on.
**Settings.** Stop the server before editing `serverconfig.txt`; it is read when the server starts. A line that starts with `#` is ignored. The game port and the player limit are on the launch line, not in this file. The world, its size, name, seed and difficulty only matter when a new world is made.
**Worlds.** The panel keeps worlds in the `Worlds` folder of the server's platform folder, and the world line points there. To use a world made in the game, copy its `.wld` file into that folder and put its full path on the world line.
**Mods.** This is the server without a mod loader. Mods for tModLoader are a different server (the Terraria (tModLoader) entry).
**Updates.** The panel installs Terraria once, when the server is made, and does not update it afterwards. To change the version, make a new server.

### Terraria vanilla: World

2 settings in `serverconfig.txt`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| World file | `world` in `[root]` | The full path of the world to load: the .wld file, written without quotes. The panel fills this in with a file named after the world in the server's Worlds folder. If that file does not exist, a new world is made there (see 'Create world if missing'). |
| World folder | `worldpath` in `[root]` | The folder world files are stored in. The world line above is a full path, so this is only needed if you keep worlds somewhere else on purpose. Leave it out otherwise, so the backups find the worlds. |

### Terraria vanilla: New world

4 settings in `serverconfig.txt`, shown under **New world** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Create world if missing | `autocreate` in `[root]` | If the file named on the world line does not exist, the server makes a new world of this size there. It does nothing for a world that already exists. Choices: `1` (Small), `2` (Medium), `3` (Large). |
| New world name | `worldname` in `[root]` | The name a newly made world is given. It has no effect on a world that already exists. |
| World seed | `seed` in `[root]` | The seed a newly made world is generated from. Only used when a new world is made, the same as the size and name above. |
| World difficulty | `difficulty` in `[root]` | The game mode of a newly made world. The wiki's server page gives 0 as Normal; its sample file calls 0 Classic, so the name shown in the game may differ. Mobile servers add 1 to each value, the wiki says. It only applies to a new world. Choices: `0` (Normal), `1` (Expert), `2` (Master), `3` (Journey). |

### Terraria vanilla: Server

5 settings in `serverconfig.txt`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server password | `password` in `[root]` | What players type to join. Leave the line out for a server anyone can join. The panel writes it when it makes the server. |
| Message of the day | `motd` in `[root]` | A message shown to players when they join. |
| Ban list file | `banlist` in `[root]` | The file that keeps banned players. Without this line the server uses banlist.txt in the folder it runs from, which is the platform folder. |
| Extra cheat protection | `secure` in `[root]` | Turns on additional cheat protection on the server (the wiki's words: adds additional cheat protection). The wiki's example shows 1 and gives no other value. Choices: `1` (On), `0` (Off). Another value can be typed. |
| Server language | `language` in `[root]` | Sets the server's language from its code. The wiki lists the codes offered here. Choices: `en-US` (English), `de-DE` (German), `it-IT` (Italian), `fr-FR` (French), `es-ES` (Spanish), `ru-RU` (Russian), `zh-Hans` (Chinese), `pt-BR` (Portuguese), `pl-PL` (Polish). |

### Terraria vanilla: Network

2 settings in `serverconfig.txt`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Auto port-forward (UPnP) | `upnp` in `[root]` | Asks your router to forward the game port by itself when the server starts. The wiki says this does not always work, so forward the port by hand if friends cannot join. The wiki's example shows 1 and gives no other value. Choices: `1` (On), `0` (Off). Another value can be typed. |
| Enemy smoothing | `npcstream` in `[root]` | Reduces enemies skipping for players, at the cost of more data sent. The lower the number, the less skipping and the more data; 0 turns it off. The wiki's example uses 60. |

### Terraria vanilla: Performance

1 setting in `serverconfig.txt`, shown under **Performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Process priority | `priority` in `[root]` | How much processor time Windows gives the server compared with other programs: 0 Realtime, 1 High, 2 Above normal, 3 Normal, 4 Below normal, 5 Idle. The wiki's sample file uses 1 (High). The panel does not set it. Choices: `0` (Realtime), `1` (High), `2` (Above normal), `3` (Normal), `4` (Below normal), `5` (Idle). |

### Terraria vanilla: Journey permissions

11 settings in `serverconfig.txt`, shown under **Journey permissions** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Freeze time | `journeypermission_time_setfrozen` in `[root]` | Who may freeze the day and night clock. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. The wiki gives the values 0 (locked for everyone), 1 (only the host) and 2 (anyone). Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Set time to dawn | `journeypermission_time_setdawn` in `[root]` | Who may jump the time to dawn. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. The wiki gives the values 0 (locked for everyone), 1 (only the host) and 2 (anyone). Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Set time to noon | `journeypermission_time_setnoon` in `[root]` | Who may jump the time to noon. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. The wiki gives the values 0 (locked for everyone), 1 (only the host) and 2 (anyone). Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Set time to dusk | `journeypermission_time_setdusk` in `[root]` | Who may jump the time to dusk. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. The wiki gives the values 0 (locked for everyone), 1 (only the host) and 2 (anyone). Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Set time to midnight | `journeypermission_time_setmidnight` in `[root]` | Who may jump the time to midnight. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. The wiki gives the values 0 (locked for everyone), 1 (only the host) and 2 (anyone). Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Time speed | `journeypermission_time_setspeed` in `[root]` | Who may change how fast time passes. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. The wiki gives the values 0 (locked for everyone), 1 (only the host) and 2 (anyone). Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| God mode | `journeypermission_godmode` in `[root]` | Who may turn on god mode. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. The wiki gives the values 0 (locked for everyone), 1 (only the host) and 2 (anyone). Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Wind strength | `journeypermission_wind_setstrength` in `[root]` | Who may set the wind strength. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. The wiki gives the values 0 (locked for everyone), 1 (only the host) and 2 (anyone). Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Freeze wind | `journeypermission_wind_setfrozen` in `[root]` | Who may freeze the wind. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. The wiki gives the values 0 (locked for everyone), 1 (only the host) and 2 (anyone). Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Rain strength | `journeypermission_rain_setstrength` in `[root]` | Who may set the rain strength. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. The wiki gives the values 0 (locked for everyone), 1 (only the host) and 2 (anyone). Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |
| Freeze rain | `journeypermission_rain_setfrozen` in `[root]` | Who may freeze the rain. Who may use this Journey power in a Journey-mode world. It does nothing in other worlds. The wiki gives the values 0 (locked for everyone), 1 (only the host) and 2 (anyone). Choices: `0` (Locked for everyone), `1` (Only the host), `2` (Anyone). |

## The Forest

The Forest's server runs from `TheForestDedicatedServer.exe` in the server's folder. Its name, password and ports are in `config.cfg`, which the panel writes when the server is created and which you edit by hand. The admin password and the start type are on the start command (the **Launch options** on the Settings tab).

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#the-forest).

**The panel cannot stop the server cleanly.** The game stops with ^C in its own console window. The panel has no way to type into a console, so Stop closes the window and ends the process after 15 seconds. Before you press Stop (or update), open the server's window, which the panel keeps minimized on the taskbar rather than hidden, press Ctrl+C, and wait for it to close.
**Where config.cfg is read is not settled.** Sources name `TheForestDedicatedServer_Data\forest\config\config.cfg` (the egg and Game Server Kings), a `Server.cfg` under AppData\LocalLow, and a `config.cfg` in the server's root. The panel writes the first and passes the same path on the start command. Check on the first start that the server takes it.
**The config format is `key value` lines with spaces**, for example `serverName My Server`. Write a value without a line break and without two slashes in a row.
**Ports.** The game port (27455 by default) is used for UDP and TCP, the query port (27457) is the one players connect through, and the Steam port (8770) is for the server browser. The panel's firewall check opens UDP only, so allow the TCP ports in Windows Firewall yourself. Change a port in the Ports section and also in config.cfg, because the file is not rewritten from the Ports section.
**The admin password is on the start command.** Without it nobody has the admin commands. It is not shown in the Settings tab.
**Mods are not managed.** The community ModAPI launcher is a client-side tool; the dossier finds no server-side mod path or switch.

## Wurm Unlimited

Wurm Unlimited's server runs from `WurmServerLauncher.exe` in the server's folder. Each world is a folder in that folder, made first with the game's own launcher. The name, ports, player limit and passwords are on the start command (the **Launch options** on the Settings tab); the rest of the settings are in `wurm.ini` in the world's folder.

- `wurm.ini`: The map, access, logging and performance settings the research describes. The panel does not create this file; it appears once the game has written it.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#wurm-unlimited).

**The panel cannot stop the server cleanly.** Use **Shutdown server** in the launcher's window first (it asks for a number of seconds and a reason). The panel has no way to press it, so Stop closes the window and ends the process after 15 seconds. Open the server's window, which the panel keeps minimized on the taskbar, use Shutdown server, wait for the window to close, and only then press Stop or update.
**The world is made on the first start.** The start script copies the template that ships with the server (the Creative or Adventure folder under dist) into the server folder if the world is not there yet. A world with another name has to be made with the game's own launcher.
**Ports.** The game port (3724, TCP) is what players connect through, and the Steam query port (UDP) is used by the server browser. The panel's firewall check opens UDP only, so allow the game port's TCP in Windows Firewall and forward it on your router. Change a port in the Ports section and also on the start command, because the panel does not rewrite it from the Ports section.
**Admin commands** are unlocked by the admin password on the start command. Without it nobody has the in-game admin commands.
**Mods are not managed.** Wurm Unlimited's mods need a community modloader, and the research found no safe path for the panel to set it up. Install a modloader and its mods by hand with the server stopped, and back up first.
**Remote control is not used.** The game's remote control (RMI) is off unless `USE_INCOMING_RMI=true` is set in `wurm.ini`, and the research advises against turning it on without securing the server's ports. The panel does not use it.
Use plain English letters and digits in names and passwords. The panel refuses quotes, spaces in passwords, and the characters the Windows command line acts on.

### Wurm Unlimited: Map

3 settings in `wurm.ini`, shown under **Map** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Save an ore picture | `CAVEIMG` in `[root]` | When on, the ores on the map are saved to a file called Ore.png in the server's folder each time the server starts. The default is off. Choices: `true` (Yes), `false` (No). |
| Random forage and botanize spots | `CREATESEEDS` in `[root]` | When on, the server places forage and botanize resources on random tiles each time it starts. The default is off. Choices: `true` (Yes), `false` (No). |
| Random hidden ores | `PROSPECT` in `[root]` | When on, the server randomly changes ores hidden in the rock layer. It turns itself off again when the file is saved. The default is off. Choices: `true` (Yes), `false` (No). |

### Wurm Unlimited: Access

2 settings in `wurm.ini`, shown under **Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Maintenance mode | `MAINTAINING` in `[root]` | When on, only players with a power level above 0 can log in, so you can work on the server without players. The default is off. Choices: `true` (Yes), `false` (No). |
| Allow direct login | `IS_GAME_SERVER` in `[root]` | Whether players can log in directly to this server. The default is on. Turn it off only for a server meant to be used through another server. Choices: `true` (Yes), `false` (No). |

### Wurm Unlimited: Logs

1 setting in `wurm.ini`, shown under **Logs** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Player statistics log | `PLAYERLOG` in `[root]` | The file that player statistics are written to at regular intervals. It must end in .log and be writable, or the default is used. The default is numplayers.log in the server's folder. |

### Wurm Unlimited: Performance

1 setting in `wurm.ini`, shown under **Performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Wait between player connections (milliseconds) | `PLAYER_CONN_MILLIS` in `[root]` | How long the server waits between accepting one player's connection and the next, in milliseconds. The default is 1000. |

### Wurm Unlimited: Advanced

2 settings in `wurm.ini`, shown under **Advanced** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Developer mode | `DEVMODE` in `[root]` | Turns on extra logging and turns off sending email. Leave it off on a normal server. The default is off. Choices: `true` (Yes), `false` (No). |
| Slow operation log (milliseconds) | `LAG_THRESHOLD` in `[root]` | Long-running operations that take longer than this many milliseconds are written to the log. The default is 1000. |

## The Isle (Evrima)

The Isle (Evrima) keeps its settings in `TheIsle\Saved\Config\WindowsServer\Game.ini`, inside the server's folder. The panel writes the name and join password when it creates the server, and the Settings tab edits the rest. Changes apply the next time the server starts.

- `Game.ini`: The server's name, map, join password, dinosaur growth and wildlife, day and night, weather and migration. The settings are in the `[/Script/TheIsle.TIGameSession]` section.

**Stop the server before you edit.** The game writes its settings again when it shuts down, so changes made while it runs are lost. The panel stops the server by closing its window; the game documents no save command, so a stop may lose the time since the game last saved.
**The server does not start without Epic Online Services credentials.** It exits within seconds with "Unable to initialize EOS platform" until they are in `Engine.ini`. Add a `[EpicOnlineServices]` section to `Engine.ini` in the same folder, with `DedicatedServerClientId` and `DedicatedServerClientSecret`. The panel does not write them. The sources disagree on whether these values are shared by every server or set for each host, so take them from your own host or template, not from a guide.
**Admins and the whitelist are not in the Settings tab.** Put Steam64 IDs, one per line, under `AdminsSteamIDs`, `WhitelistIDs` or `VIPs` in a `[/Script/TheIsle.TIGameStateBase]` section of `Game.ini` (the guides write that section name in lower case, which the dossier leaves unresolved). Put these IDs in that section, not in the game session section, or the game ignores them.
**Players must be on the same beta branch.** A player on the default (Legacy) build cannot see an Evrima server. The panel installs and updates the server on the `evrima` beta, so do not change that by hand.
**Mods** are not set up by the panel. The sources describe PAK and SIG files in the game's `Content\Paks` folder, and UE4SS mods on a Windows server, but they disagree on the folder. Steam Workshop mod IDs no longer work. Every player needs the same mods.
**Ports:** the server listens on the game port (UDP) the panel gives it, and the guides say the query uses the same port. Some guides suggest also opening 7778 and 7779, and the game's queue and RCON ports are chosen by the server, so a second server on this PC may need its own range of ports.
The research could not confirm which process stays running after `TheIsleServer.exe` starts, that a pre-written `Game.ini` survives the first start, or where the saves are kept.

### The Isle: Server

4 settings in `Game.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` in `[/Script/TheIsle.TIGameSession]` | The name players see in the in-game server browser. The panel fills it in when it creates the server. |
| Player limit | `MaxPlayerCount` in `[/Script/TheIsle.TIGameSession]` | The most players that can be on the server at once. The game's default is 100. More players need more memory and processor. |
| Map | `MapName` in `[/Script/TheIsle.TIGameSession]` | The map the server loads. Gateway is the only official Evrima map, so leave it as Gateway unless you know another map name is installed. |
| Discord invite | `Discord` in `[/Script/TheIsle.TIGameSession]` | A Discord invite link that players see. Leave it empty if you have none. |

### The Isle: Access

3 settings in `Game.ini`, shown under **Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Require a join password | `bServerPassword` in `[/Script/TheIsle.TIGameSession]` | Turns on the join password below. Off means anyone can join. Choices: `true` (Yes), `false` (No). |
| Join password | `ServerPassword` in `[/Script/TheIsle.TIGameSession]` | The password players type to join. It is only used when the setting above is on. |
| Whitelist only | `bServerWhitelist` in `[/Script/TheIsle.TIGameSession]` | Only the Steam accounts on the server's whitelist can join. Add the IDs by hand, as the guide explains. Choices: `true` (Yes), `false` (No). |

### The Isle: Gameplay

7 settings in `Game.ini`, shown under **Gameplay** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Dinosaur growth speed | `GrowthMultiplier` in `[/Script/TheIsle.TIGameSession]` | How fast young dinosaurs grow up. 1 is the game's normal speed. The guide says to keep it below 20, because higher numbers break growth. |
| Corpse decay speed | `CorpseDecayMultiplier` in `[/Script/TheIsle.TIGameSession]` | How fast dead bodies disappear. 1 is the default; a higher number makes them disappear sooner. |
| Allow human characters | `bEnableHumans` in `[/Script/TheIsle.TIGameSession]` | Lets players play as humans as well as dinosaurs. Off by default. Choices: `true` (Yes), `false` (No). |
| Diet system | `bEnableDiets` in `[/Script/TheIsle.TIGameSession]` | Turns on the diet system, which decides what herbivores and carnivores can eat. On by default. Choices: `true` (Yes), `false` (No). |
| Mutations | `bEnableMutations` in `[/Script/TheIsle.TIGameSession]` | Turns on the mutation system, which gives dinosaurs random traits. On by default. Choices: `true` (Yes), `false` (No). |
| Allow replays | `bAllowReplay` in `[/Script/TheIsle.TIGameSession]` | Lets players record replays on the server. Off by default. Choices: `true` (Yes), `false` (No). |
| Region spawning | `bUseRegionSpawning` in `[/Script/TheIsle.TIGameSession]` | Limits where players can spawn to certain regions of the map. Off by default. Choices: `true` (Yes), `false` (No). |

### The Isle: Wildlife

5 settings in `Game.ini`, shown under **Wildlife** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Spawn AI creatures | `bSpawnAI` in `[/Script/TheIsle.TIGameSession]` | Spawns the AI creatures that carnivores hunt for food. On by default. Choices: `true` (Yes), `false` (No). |
| AI creature density | `AIDensity` in `[/Script/TheIsle.TIGameSession]` | How many AI creatures spawn, as a multiplier of the default. 1 is the default. |
| AI spawn check (seconds) | `AISpawnInterval` in `[/Script/TheIsle.TIGameSession]` | Seconds between checks for spawning AI creatures. The default is 40. |
| Spawn plants | `bSpawnPlants` in `[/Script/TheIsle.TIGameSession]` | Spawns the plants that herbivores eat. On by default. Choices: `true` (Yes), `false` (No). |
| Plant density | `PlantSpawnMultiplier` in `[/Script/TheIsle.TIGameSession]` | How many plants grow, as a multiplier of the default. 1 is the default. |

### The Isle: Time and weather

5 settings in `Game.ini`, shown under **Time and weather** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Day length (minutes) | `ServerDayLengthMinutes` in `[/Script/TheIsle.TIGameSession]` | How long the daytime lasts, in real minutes. The default is 45. |
| Night length (minutes) | `ServerNightLengthMinutes` in `[/Script/TheIsle.TIGameSession]` | How long the night lasts, in real minutes. The default is 20, shorter than the day on purpose. |
| Changing weather | `bServerDynamicWeather` in `[/Script/TheIsle.TIGameSession]` | Changes the weather over time. On by default. Choices: `true` (Yes), `false` (No). |
| Shortest time between weather changes (seconds) | `MinWeatherVariationInterval` in `[/Script/TheIsle.TIGameSession]` | The shortest time, in seconds, before the weather changes. The default is 600. |
| Longest time between weather changes (seconds) | `MaxWeatherVariationInterval` in `[/Script/TheIsle.TIGameSession]` | The longest time, in seconds, before the weather changes. The default is 900. |

### The Isle: Migration and patrols

5 settings in `Game.ini`, shown under **Migration and patrols** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Migration zones | `bEnableMigration` in `[/Script/TheIsle.TIGameSession]` | Turns on the migration zones, where herds move around the map. On by default. Choices: `true` (Yes), `false` (No). |
| Migration zone duration (seconds) | `MaxMigrationTime` in `[/Script/TheIsle.TIGameSession]` | How long a migration zone stays active, in seconds. The default is 5400 (1.5 hours). |
| Mass migrations | `bEnableMassMigration` in `[/Script/TheIsle.TIGameSession]` | Turns on the larger migration events that happen every so often. On by default. Choices: `true` (Yes), `false` (No). |
| Time between mass migrations (seconds) | `MassMigrationTime` in `[/Script/TheIsle.TIGameSession]` | Seconds between mass migration events. The default is 43200 (12 hours). |
| Carnivore patrol zones | `bEnablePatrolZones` in `[/Script/TheIsle.TIGameSession]` | Turns on the zones where carnivores patrol. On by default. Choices: `true` (Yes), `false` (No). |

## Mordhau

Mordhau's server keeps its name and passwords in `Mordhau\Saved\Config\WindowsServer\Game.ini`, which the panel writes when the server is created and which the Settings tab edits. The player limit is on the start command (the **Launch options** on the Settings tab). The game rewrites Game.ini when it shuts down, so edit it only with the server stopped.

- `Game.ini`: The server's name and passwords, in the server's session section. The game keeps its own settings for the rest, and rewrites the file when it shuts down.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#mordhau).

**The panel cannot stop the server cleanly.** The game stops with ^C in its own console window. The panel has no way to type into a console, so Stop closes the window and ends the process after 15 seconds. Before you press Stop (or update), open the server's window, which the panel keeps minimized on the taskbar, press Ctrl+C, and wait for it to close.
**Two programs run.** The panel starts `MordhauServer.exe`, which starts `Mordhau\Binaries\Win64\MordhauServer-Win64-Shipping.exe`; the second one holds the ports.
**The map is not in the form.** The start command uses the egg's first map, `/Game/Mordhau/Maps/Grad/FL_Grad`, as the first word after the program. Other maps are named as `MAPNAME/TYPE_NAME` in the egg's readme; change the map by editing the start script by hand.
**Ports.** The game port (25900) is for UDP, the query port (25902) is the one the server browser asks, and the beacon port (25903) is one per server. The panel's firewall check opens UDP only. Change a port by editing the start script by hand, because the form does not rewrite the ports.
**Map rotation and admins are not in the form.** Game.ini can list maps to rotate (MapRotation) and admins by SteamID, one line per entry. The sources disagree on which section holds MapRotation, so the panel does not offer them. Add them by hand only after you have checked the section on a real install.
**Mods are not managed.** Mordhau's mods come from mod.io, not the Steam Workshop. The sources give the Mods= lines in Game.ini and a -ModDownload start flag, but they disagree on the section, so the panel does not set either.
**Engine.ini is not in the Settings tab.** Its tick-rate keys come from one guide, which gives no defaults or allowed values. Edit it by hand only if you know what you want, with the server stopped.

### Mordhau: Server

1 setting in `Game.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` in `[/Script/Mordhau.MordhauGameSession]` | The name players see in the in-game server browser. Up to 40 characters, the limit the Pterodactyl egg for this game uses. Changes apply the next time the server starts. |

### Mordhau: Access

2 settings in `Game.ini`, shown under **Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Join password | `ServerPassword` in `[/Script/Mordhau.MordhauGameSession]` | The password players must type to join. Leave it empty for a public server that anyone can join. Up to 20 characters, the limit the Pterodactyl egg uses. |
| Admin password | `AdminPassword` in `[/Script/Mordhau.MordhauGameSession]` | A player who types AdminLogin in the in-game console, followed by this password, becomes an admin. Admins can add more admins, so share it only with people you fully trust. Up to 20 characters. |

## Team Fortress 2

Team Fortress 2 is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `tf\cfg` folder of the server. The panel writes that file with the server's name and password. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name and password, the remote console password, a contact address and the custom-content rules. Only the lines you set are in the file. The research found no other setting explained for this game, so the rest of the game's rules are not in the form.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#team-fortress-2).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join from the in-game console with `connect <your address>:<port>`, using the Game Port in the Ports section.
The Steam login token is optional in GodlyPanel. The research says a token is needed to appear in the public server browser; without one the server still runs and can be joined by address. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command.
Custom content: rules 1 need a whitelist file, pure_server_whitelist.txt, in tf\cfg, which the panel does not write. Add it yourself if you use rules 1.
No mod support is set up: the research found no mod loader and no install method. A game update through the panel could reset files the game ships, so check the name and password after updating.
The port in the Ports section is the game port (UDP for players, TCP for the remote console). The engine also uses UDP 27020 (SourceTV), UDP 27005 (client) and UDP 26900 (Steam). Two Source servers on one PC may clash on those; `-nohltv` turns SourceTV off.

### Team Fortress 2: Server

4 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password that lets a remote console connect to the server (RCON). Choose a long one: anyone with it controls the server. The panel does not use the remote console for this server. |
| Contact address | `sv_contact` | An e-mail address or other contact shown to players who look at the server's details, so they can reach whoever runs it. |

### Team Fortress 2: Custom content

1 setting in `server.cfg`, shown under **Custom content** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Custom content rules | `sv_pure` | Decides which custom skins, models and sprites players may use. The game's default is the minimal rules. Full rules (1) also read the whitelist file, pure_server_whitelist.txt, which the panel does not write: a server set to 1 without that file will not run as the rules say. Steam's own content only (2) blocks all custom content. Choices: `-1` (No file restrictions), `0` (Minimal rules (the game's default)), `1` (Full rules, plus the whitelist file), `2` (Steam's own content only). |

## Counter-Strike 2

Counter-Strike 2 is set up with console variables ("convars"): lines of a name and a value. `server.cfg` in the `game\csgo\cfg` folder holds the server's name, its password and whether it is LAN-only. The competitive mode's settings are in `gamemode_competitive_server.cfg` in the same folder. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name, its join password, the remote console password, who can join, whether cheats are allowed, sleep-when-empty and the bandwidth limit. Only the lines you set are in the file.
- `gamemode_competitive_server.cfg`: The rules of the competitive mode: rounds, round and buy times, starting money, warm-up, friendly fire and team balancing. A setting you leave out keeps the game's own value.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#counter-strike-2).

The game reads the files when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The Steam login token is optional. Without one the server still starts, but it runs as LAN-only and is not listed publicly. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.
Create the token at steamcommunity.com/dev/managegameservers with app ID 730. The research found the account rules (a registered phone number and no community ban) on one host's page, not on Valve's; check them there.
The game is a large download (about 60 GB). A game update through the panel is only effective when the server is updated too: stop every server first.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented command to stop the server cleanly, so a match in progress may not be saved.
Mods are not set up here. The plugin route is Metamod:Source with CounterStrikeSharp, but the research found no install steps, so plugins have to be added by hand under the server's addons folder.
The competitive mode's file is only read in competitive mode. Starting the server in another mode with the Game mode argument uses that mode's own file, which this panel does not edit.
The game port is UDP for players and the server list. SourceTV (UDP 27020) is off unless a setting turns it on, and the panel does not turn it on.

### Counter-Strike 2 (server.cfg): Server

3 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON). The panel does not use it, but anyone who knows it can control the server, so choose a long one. |

### Counter-Strike 2 (server.cfg): Joining

1 setting in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Who can join | `sv_lan` | Internet lets anyone join over the internet. LAN only restricts the server to players on your local network, so keep Internet for a server friends join from home. Choices: `0` (Internet), `1` (LAN only). |

### Counter-Strike 2 (server.cfg): Game rules

1 setting in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on. Choices: `0` (Off), `1` (On). |

### Counter-Strike 2 (server.cfg): Performance

1 setting in `server.cfg`, shown under **Performance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Sleep when empty | `sv_hibernate_when_empty` | When no one is connected, the server uses very little processor time. The Docker image's notes say this has been seen to crash servers, so leave it off unless you need it. Choices: `0` (Off), `1` (On). |

### Counter-Strike 2 (server.cfg): Network

1 setting in `server.cfg`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Highest bandwidth per player | `sv_maxrate` | The most data the server sends one player. 0 means no limit. |

### Counter-Strike 2 (gamemode_competitive_server.cfg): Rounds

3 settings in `gamemode_competitive_server.cfg`, shown under **Rounds** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Most rounds per match | `mp_maxrounds` | The number of rounds a match can run before it ends. The server's default is 24. |
| Round time (minutes) | `mp_roundtime` | How many minutes a round lasts. The server's default is 1.92. |
| Freeze time at round start | `mp_freezetime` | How long players are held still at the start of a round, before they can move. The server's default is 15. |

### Counter-Strike 2 (gamemode_competitive_server.cfg): Money and time

3 settings in `gamemode_competitive_server.cfg`, shown under **Money and time** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Buy time (seconds) | `mp_buytime` | How many seconds at the start of a round players can spend money on weapons. The server's default is 20. |
| Starting money | `mp_startmoney` | How much money each player starts a match with. The server's default is 800. |
| Warm-up length | `mp_warmuptime` | How long the warm-up before a match lasts. The server's default is 60. |

### Counter-Strike 2 (gamemode_competitive_server.cfg): Teams and damage

2 settings in `gamemode_competitive_server.cfg`, shown under **Teams and damage** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Friendly fire | `mp_friendlyfire` | Whether teammates can hurt each other. 1 turns it on and 0 turns it off; the server's default is 1. |
| Balance teams automatically | `mp_autoteambalance` | Moves players between teams so the sides stay even. 1 turns it on and 0 turns it off; the server's default is 1. |

## Mount & Blade II: Bannerlord

Bannerlord's server reads its settings from `ds_config_server.txt` in the game's `Modules\Native` folder. The panel writes that file when it creates the server, with the name and the game mode. The login token, which players need to find the server in the public list, is typed into the server's creation form and sits in the start script.

- `ds_config_server.txt`: The server's name, its game mode and the admin password for the web admin panel. The file also ends with the command that starts the server and its first mission, so the server does not wait in the intermission state. Only the lines the panel needs are in it.

**The panel cannot stop the server cleanly.** The official page gives no stop command. Stop closes the server's window and ends the process after 15 seconds. Keep the window (it is minimized), and close it yourself first if you can.
**The login token is a secret.** It is made in the game's multiplayer lobby with the console command `customserver.gettoken` (press the tilde key). It expires after 3 months, and the official page asks you to keep it private. The panel writes it into the start script.
**Players need the same modules as the server.** Bannerlord's server takes mods as module folders, and the official page says players must load the same ones. The panel adds no mods.
**No map is set by the panel.** The official page says maps must be registered in the config with commands such as `add_map_to_usable_maps`, and the research found no map names for the official build. Add maps by hand with the server stopped.
**Ports.** The game port (25910) is UDP. The official page also gives TCP on the same number for the web admin panel and map downloads, which this panel has not checked.
**Logs.** The panel starts the server with its log folder inside the server's folder, so the Logs tab can read them.

### Bannerlord: Server

2 settings in `ds_config_server.txt`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` | The name players see in the multiplayer server list. The official page's example is a plain sentence, so spaces are fine. |
| Game mode | `GameType` | The mode the server plays: the official page lists Siege, Team deathmatch, Captain, Skirmish, Duel and Battle. The page does not say what each one plays like, and the panel does not check the mode against the game's maps. Choices: `Siege`, `TeamDeathmatch` (Team deathmatch), `Captain`, `Skirmish`, `Duel`, `Battle`. |

### Bannerlord: Access

1 setting in `ds_config_server.txt`, shown under **Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Admin password | `AdminPassword` | The password that protects the server's web admin panel. The official page says it is blank by default and says to set a strong one before the panel is reachable from outside your network. |

## Insurgency: Sandstorm

Insurgency: Sandstorm keeps most of its server settings in `Insurgency\Saved\Config\WindowsServer\Game.ini`, which this Settings tab edits. The map, the scenario and the player limit are on the start command, which the Launch options form shows in part. The admin list is `Insurgency\Config\Server\Admins.txt`, which the panel creates empty.

- `Game.ini`: The game's settings, under the section headers the game reads. The Settings tab adds the ones listed here; the game keeps its own defaults for the rest.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#insurgency-sandstorm).

**The panel cannot stop the server cleanly.** The game stops with ^C in its own console window. The panel has no way to type into a console, so Stop closes the window and ends the process after 15 seconds. Before you press Stop (or update), open the server's window, which the panel keeps minimized on the taskbar, press Ctrl+C, and wait for it to close.
**The map and scenario are fixed.** The start command uses the mod.io guide's example, `Oilfield?Scenario=Scenario_Refinery_Push_Security`, and the player limit is 28. Change them by editing the start script by hand. A typo in the map or scenario name makes the game fall back to Farmhouse, per the guide.
**The join password is on the start command.** It is written after the map as `?Password=`, the form the mod.io guide shows. Changing it means editing the start script, or recreating the server.
**Ports.** The game port (25940) is UDP. The query port (25942) is UDP and TCP, per the mod.io guide. The dossier's usual 27102 and 27131 are not used.
**RCON is not set up, and the admin list is not in the form.** The RCON protocol and a stop command are not confirmed by the sources, so the panel does not use RCON. Edit Admins.txt by hand, with the server stopped.
**Mods are not supported.** Mods come from mod.io and need a login that changed in update 1.20; the panel has no way to do that step.
**Not confirmed on a real install.** Whether the server program is `InsurgencyServer.exe` in the install folder, and whether it is the process that stays running, are not confirmed by the sources. The Settings tab's keys and defaults come from the guide, not from the game's own files.

### Insurgency: Sandstorm: Kill feed

2 settings in `Game.ini`, shown under **Kill feed** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Kill feed | `bKillFeed` in `[/Script/Insurgency.INSGameMode]` | Shows who killed whom in a kill feed on screen. The game's default is off (False). Choices: `True` (Yes (True)), `False` (No (False)). |
| Killer shown to the victim | `bKillerInfo` in `[/Script/Insurgency.INSGameMode]` | When a player dies, tells the victim who killed them and with what. The game's default is on (True). Choices: `True` (Yes (True)), `False` (No (False)). |

### Insurgency: Sandstorm: Teams

5 settings in `Game.ini`, shown under **Teams** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Team kills before a kick | `TeamKillLimit` in `[/Script/Insurgency.INSGameMode]` | How many team kills one player can make before the server kicks them. The game's default is 3. |
| Friendly fire | `bAllowFriendlyFire` in `[/Script/Insurgency.INSMultiplayerMode]` | Lets players damage their own team. The game's default is on (True). Choices: `True` (Yes (True)), `False` (No (False)). |
| Friendly fire damage | `FriendlyFireModifier` in `[/Script/Insurgency.INSMultiplayerMode]` | How much damage a friendly hit does, as a fraction of normal damage (0.2 means a fifth). The game's default is 0.2. |
| Balance teams automatically | `bAutoBalanceTeams` in `[/Script/Insurgency.INSMultiplayerMode]` | Moves players between the two teams when one side has many more players. The game's default is on (True). Choices: `True` (Yes (True)), `False` (No (False)). |
| Players may switch teams | `bAllowPlayerTeamSelect` in `[/Script/Insurgency.INSMultiplayerMode]` | Lets a player switch to the other team. The game's default is on (True). Choices: `True` (Yes (True)), `False` (No (False)). |

### Insurgency: Sandstorm: Rounds and maps

4 settings in `Game.ini`, shown under **Rounds and maps** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Map voting after a game | `bMapVoting` in `[/Script/Insurgency.INSMultiplayerMode]` | Lets players vote for the next map at the end of each game. The game's default is on (True). Choices: `True` (Yes (True)), `False` (No (False)). |
| Use the map cycle | `bUseMapCycle` in `[/Script/Insurgency.INSMultiplayerMode]` | Keeps moving through the server's map cycle. If it is off, the current map repeats forever. The game's default is on (True). Choices: `True` (Yes (True)), `False` (No (False)). |
| Freeze time at round start (seconds) | `PreRoundTime` in `[/Script/Insurgency.INSMultiplayerMode]` | How long players are frozen at the start of each round, in seconds. The game's default is 10. |
| Intermission after a round (seconds) | `PostRoundTime` in `[/Script/Insurgency.INSMultiplayerMode]` | How long the screen between rounds stays up, in seconds. The game's default is 15. |

### Insurgency: Sandstorm: Players

3 settings in `Game.ini`, shown under **Players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Idle kick time (seconds) | `IdleLimit` in `[/Script/Insurgency.INSMultiplayerMode]` | How long a player can stand still before the server kicks them, in seconds. The game's default is 150. |
| Players needed per team to start | `MinimumPlayers` in `[/Script/Insurgency.INSMultiplayerMode]` | The fewest players each team needs before a game starts. The game's default is 1. |
| AI bots | `bBots` in `[/Script/Insurgency.INSMultiplayerMode]` | Turns on AI bots to fill the teams. The game's default is off (False). Choices: `True` (Yes (True)), `False` (No (False)). |

## Left 4 Dead

Left 4 Dead is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `left4dead\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name, password and contact, the remote console password, whether it is local-network only, whether cheats and pausing are allowed, and the most data sent to one player. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#left-4-dead).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The form is short because the research found only a handful of settings that two sources agree on. Other settings still work by typing the name and its value as a new line in `server.cfg` (a setting the panel does not explain is still shown), but the panel cannot explain them yet.
Add-ons (custom campaigns) are .vpk files in the `left4dead\addons` folder, put there by hand. Valve's page says to run `update_addon_paths;mission_reload` in the server console, or to restart the server. The panel has no console, so restart the server after adding one. The research found no Steam Workshop for this game.
The Steam login token is optional. Valve says it is only needed when the server stops with error 18 or 106. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command.
The port in the Ports section is the game port. The game also uses UDP 27020 (SourceTV). Two Source servers on one PC both want it, so the second one may take another number. `-nohltv` turns it off.

### Left 4 Dead: Server

4 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Admin contact | `sv_contact` | An email address or other contact for the person running the server. Shown to people who look at the server's details. |
| Remote console password | `rcon_password` | The password for the server's remote console, which Valve says shares the game port. Choose a long one: anyone with it controls the server. The panel does not use the remote console for this server. |

### Left 4 Dead: Joining

1 setting in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | On makes a LAN server, useful to stop players joining from the internet: only players on your local network can join. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |

### Left 4 Dead: Game rules

2 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on. Choices: `0` (Off), `1` (On). |
| Allow pausing | `sv_pausable` | Lets players pause the game. Off means nobody can pause it. Choices: `0` (Off), `1` (On). |

### Left 4 Dead: Network

1 setting in `server.cfg`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Most data per player | `sv_maxrate` | The most data, in bytes per second, the server sends to one player. 0 means no limit. Valve's page calls 0 unlimited. |

## Zombie Panic! Source

Zombie Panic! Source is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `zps\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name, password and contact, the remote console password, the browser region, whether it is local-network only, cheats, friendly fire, voice chat and file downloads. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#zombie-panic-source).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The form is short on purpose. The research found the settings above on two community pages, and the Valve pages for this game could not be read. Other settings still work by typing the name and its value as a new line in `server.cfg` (a setting the panel does not explain is still shown). The two pages disagree on some values, so those are not offered.
Workshop items (`zps\data\collection.txt`), AngelScript plugins (`zps\default_plugins.json`), admin lists (`zps\data`) and map lists (`zps\mapcycle.txt`, `zps\maplist.txt`) are edited by hand; the panel does not manage them. The ZPS guide warns that a SteamCMD validate overwrites the admin, plugin and server configuration files, so keep a copy before an update.
The Steam login token is optional. Valve says it is only needed when the server stops with error 18 or 106. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The guide's way to stop the server is typing `quit` into the console, which the panel cannot do yet.
The port in the Ports section is the game port. The game also uses UDP 27020 (SourceTV). Two Source servers on one PC both want it, so the second one may take another number. `-nohltv` turns it off.
The first start downloads more game files and can take a long time (the Unraid template's note, from the research).

### Zombie Panic! Source: Server

5 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Admin contact | `sv_contact` | A contact email or other way to reach the person running the server. Shown to people who look at the server's details. |
| Server region | `sv_region` | The part of the world the server is listed in the browser for. 255 means the whole world, which is the default. Choices: `0` (US East), `1` (US West), `2` (South America), `3` (Europe), `4` (Asia), `5` (Australia), `6` (Middle East), `7` (Africa), `255` (World (the default)). |
| Remote console password | `rcon_password` | The password for the server's remote console. Anyone who enters it can run every server command, so choose a long one. The panel does not use the remote console for this server. |

### Zombie Panic! Source: Joining

1 setting in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | LAN-only mode, which hides the server from the internet, so only players on your local network can join. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |

### Zombie Panic! Source: Game rules

2 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands, and turns off Steam achievements and stats for the server. Keep it off on a server other people play on. Choices: `0` (Off), `1` (On). |
| Friendly fire | `mp_friendlyfire` | Lets players hurt their own team. Off by default; turn it on for team damage. Choices: `0` (Off), `1` (On). |

### Zombie Panic! Source: Players and downloads

2 settings in `server.cfg`, shown under **Players and downloads** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Voice chat | `sv_voiceenable` | Microphone voice chat between players. Off turns it off for the whole server. Choices: `0` (Off), `1` (On). |
| Players can download files | `sv_allowdownload` | Lets players download custom files, such as maps or sounds, from the server when they join. Choices: `0` (Off), `1` (On). |

## BrainBread 2

BrainBread 2 is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `brainbread2\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit, the port and the address are on the launch line.

- `server.cfg`: The server's name, password and remote console password, whether it is local-network only, spectators, cheats, friendly fire, voice chat and file downloads. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#brainbread-2).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The port is the one thing to test first. The FireDaemon guide says it can be changed to anywhere from 27015 to 27020. The panel's default is 25954, outside that range, so a server on it may not be reachable as the guide describes. If it does not work, change the port in the Ports section to 27015, 27016, 27017, 27018, 27019 or 27020 and make sure no other server uses it.
The `+ip` argument is 0.0.0.0 (all addresses). The guide says to use this PC's own address; that has not been tested with the panel.
The form is short on purpose. The gameplay rules the XGamingServer page lists (zombie counts, round times, votes, scaling) are in files it runs from `server.cfg`; the research could not confirm that the game runs them, so they are not offered. Other settings still work by typing the name and its value as a new line in `server.cfg`, but the panel cannot explain them yet.
Custom maps and content are files a person adds by hand: `.bsp` and `.nav` in `brainbread2\maps`, models, materials and sounds in their folders, and custom content under `brainbread2\custom`. The panel does not manage them. The Steam Workshop lines in `gameinfo.txt` may be removed if the server will not start, according to the guide.
The Steam login token is optional. Valve's generic page says one is only needed when the server stops with error 18 or 106. Add it with the Steam login token argument in Launch options. It is a secret: do not share it.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no console stop command for this game.

### BrainBread 2: Server

3 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console. Anyone who enters it can run every server command, so choose a long one. The panel does not use the remote console for this server. |

### BrainBread 2: Joining

2 settings in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | Makes a LAN server, which has no heartbeat to the server list and no authentication. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |
| Allow spectators | `mp_allowspectators` | Lets people join as spectators, who watch the game without playing. Choices: `0` (Off), `1` (On). |

### BrainBread 2: Game rules

2 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow cheat commands | `sv_cheats` | Allows cheats on the server. It also disables Steam stats and achievements, the page's own note says. Keep it off on a server other people play on. Choices: `0` (Off), `1` (On). |
| Friendly fire | `mp_friendlyfire` | Lets team members injure members of their own team. Choices: `0` (Off), `1` (On). |

### BrainBread 2: Players and downloads

2 settings in `server.cfg`, shown under **Players and downloads** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Voice chat | `sv_voiceenable` | Enables voice communication between players. Choices: `0` (Off), `1` (On). |
| Players can download files | `sv_allowdownload` | Lets players download files, such as custom maps, from the server when they join. Choices: `0` (Off), `1` (On). |

## Day of Defeat: Source

Day of Defeat: Source is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `dod\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name and password, whether it is local-network only, whether cheats are allowed, the logging, and a few round and movement settings. Only the lines you set are in the file. Other game rules are not in the form because the research did not describe them.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#day-of-defeat-source).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The Steam login token is needed for other players to find the server in the public list. Create it for game id 232290 and add it with the Steam login token argument in Launch options. It is a secret: do not share it.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command.
No mod support is set up. The guides install SourceMod and MetaMod by hand; that is not covered here. A game update through the panel could reset a `server.cfg` that the game ships, so check the name and password after updating.
The guides disagree on whether the game uses the port range 27015 to 27020 or a port of 2456 for players to connect. The panel uses the port set in the Ports section.

### Day of Defeat: Source: Server

3 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it. |

### Day of Defeat: Source: Joining

1 setting in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | On makes a LAN server: only players on your local network can see and join it. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |

### Day of Defeat: Source: Game rules

5 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on. Choices: `0` (Off), `1` (On). |
| Autoaim help | `sv_aim` | Turns on autoaim assistance, which helps players aim. The host example file turns it off. Choices: `0` (Off), `1` (On). |
| Allow pausing | `pausable` | Lets players pause the game. The host example file turns it off. Choices: `0` (Off), `1` (On). |
| Maximum movement speed | `sv_maxspeed` | The fastest a player can move. One host's example file sets 320; changing it changes how fast everyone runs. |
| Round time limit (minutes) | `mp_timelimit` | How long a round or map lasts, in minutes, before the next one starts. Two host examples use 20 and 30. |

### Day of Defeat: Source: Logging

5 settings in `server.cfg`, shown under **Logging** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Write server logs | `log` | Turns the server's log output on or off. The guides suggest on, because it makes errors easier to track down. Choices: `on` (On), `off` (Off). |
| Log bans | `sv_logbans` | Writes the server's bans into the server log. Choices: `0` (Off), `1` (On). |
| Show log lines in the console | `sv_logecho` | Shows the log information in the server console as well. Choices: `0` (Off), `1` (On). |
| Write logs to a file | `sv_logfile` | Writes the log information to a file. Choices: `0` (Off), `1` (On). |
| Use one log file | `sv_log_onefile` | Writes the log into a single rolling file instead of separate files. Choices: `0` (Off), `1` (On). |

## Fistful of Frags

Fistful of Frags is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `fof\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name and password, the remote console password, the browser tags, the team and friendly-fire rules, bots, voice and downloads, and the logging. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#fistful-of-frags).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`, or the link `steam://connect/<address>:<port>`. The developer console must be on to type it.
The guides disagree on the file name. This panel writes and edits `server.cfg`. One host guide says the server only reads `fofserver.cfg`; if your server ignores your changes, check which file it reads.
The Steam login token is written into `server.cfg` as `sv_setsteamaccount`, the host guide's place for it. The research could not say whether public listing needs one. It is a secret: do not share it.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The guides disagree on whether the game answers a graceful shutdown.
Plugins (Metamod:Source and SourceMod) are installed by hand; the panel does not set them up. Map files (.bsp) go in the fof\maps folder, and players need custom maps too.
The game-mode setting (fof_sv_currentmode) is not in the form: the sources give different meanings for its numbers. A setting the file has that the panel does not explain is still shown.

### Fistful of Frags: Server

5 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console. Anyone with it can run server commands, so choose a long one. The panel does not use it. |
| Browser tags | `sv_tags` | Words that show in the server browser so players can filter servers, such as vanilla or custom. |
| Steam login token | `sv_setsteamaccount` | The Steam Game Server Login Token, which other players need to find the server in the public list. Create one at steamcommunity.com/dev/managegameservers for game id 295230. Treat it like a password. |

### Fistful of Frags: Joining

1 setting in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | On makes the server local-network only: it will not show on the internet, and only players on your network can join. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |

### Fistful of Frags: Game rules

6 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on. Choices: `0` (Off), `1` (On). |
| Team play | `mp_teamplay` | Free-for-all puts every player against every other. Teams splits players into teams in the team modes. Choices: `0` (Free-for-all), `1` (Teams). |
| Number of teams | `fof_sv_maxteams` | How many teams the server uses, from 2 to 4. The guide lists the team names for each number. Choices: `2` (2 teams), `3` (3 teams), `4` (4 teams). |
| Friendly fire | `mp_friendlyfire` | Lets players hurt their own team. Off keeps teammates from injuring each other. Choices: `0` (Off), `1` (On). |
| Map time limit (minutes) | `mp_timelimit` | Minutes on one map before the server moves to the next map by itself. 0 turns the limit off. One host example uses 45. |
| Everyone hears everyone | `sv_alltalk` | Lets players hear all other players, whatever team they are on. Choices: `0` (Off), `1` (On). |

### Fistful of Frags: Bots

2 settings in `server.cfg`, shown under **Bots** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Let bots join | `fof_sv_bot_dynamicjoin` | Allows bots to join the server to fill its slots. Choices: `0` (Off), `1` (On). |
| Bot share of slots | `fof_sv_bot_slotpct` | The share of the server's slots bots may take, written as the guide does: 0.40 in the example. |

### Fistful of Frags: Voice and downloads

3 settings in `server.cfg`, shown under **Voice and downloads** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Voice chat | `sv_voiceenable` | Lets players talk to each other through a microphone. Choices: `0` (Off), `1` (On). |
| Players may download files | `sv_allowdownload` | Lets players download custom files, such as maps, from the server. It is slow; a web address is faster (see below). Choices: `0` (Off), `1` (On). |
| Download web address | `sv_downloadurl` | A web address players download custom files from, if you host them on a web server. Leave it empty to use the server. |

### Fistful of Frags: Logging

4 settings in `server.cfg`, shown under **Logging** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Write server logs | `log` | Turns the server's log output on or off. The guides suggest on, because it makes errors easier to track down. Choices: `on` (On), `off` (Off). |
| Log bans | `sv_logbans` | Writes the server's bans into the server log. Choices: `0` (Off), `1` (On). |
| Show log lines in the console | `sv_logecho` | Shows the log information in the server console as well. Choices: `0` (Off), `1` (On). |
| Write logs to a file | `sv_logfile` | Writes the log information to a file. Choices: `0` (Off), `1` (On). |

## No More Room in Hell

No More Room in Hell is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `nmrih\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name and password, the remote console password, the browser tags, the difficulty, the round and map rules, friendly fire, voice and downloads, and the logging. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#no-more-room-in-hell).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The install may need a Steam account that owns the game, and one source says anonymous login does not work for this server. If the install fails, the install step is the thing to check first.
The Steam login token is needed for other players to join. It is a secret: do not share it.
The guides disagree on the port players use: the generic 27015, or 2456 in one host guide. The panel uses the port set in the Ports section.
The guides disagree on the start map (nmo_broadway or de_dust). The panel starts nmo_broadway; change it in the Launch options if it does not load.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. No quit command was found.
Map rotation (mapcycle.txt) and plugins (Metamod:Source and SourceMod) are not set up by the panel. Custom maps go in the nmrih\maps folder, and players need them too.

### No More Room in Hell: Server

5 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console. Anyone with it can run server commands, so choose a long one. The panel does not use it. |
| Browser tags | `sv_tags` | Words that show in the server browser so players can filter servers: vanilla for the default rules, custom for custom gameplay or mods. |
| Steam login token | `sv_setsteamaccount` | The Steam Game Server Login Token, which other players need to join the server. Create one at steamcommunity.com/dev/managegameservers for game id 317670. Treat it like a password. |

### No More Room in Hell: Joining

1 setting in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | On makes the server local-network only: it will not show on the internet, and only players on your network can join. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |

### No More Room in Hell: Game rules

6 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on. Choices: `0` (Off), `1` (On). |
| Difficulty | `sv_difficulty` | The server's difficulty, casual or classic. The guide does not say what each one changes. Choices: `casual` (Casual), `classic` (Classic). |
| Friendly fire | `mp_friendlyfire` | Lets players hurt their own team. Off keeps teammates from injuring each other. Choices: `0` (Off), `1` (On). |
| Map time limit (minutes) | `mp_timelimit` | Minutes on one map before the server moves to the next map by itself. The guide's example uses 45. |
| Rounds per map | `mp_maxrounds` | The number of rounds played on one map before the server moves to the next. The guide's example uses 2. |
| Everyone hears everyone | `sv_alltalk` | Lets players hear all other players, whatever team they are on. Choices: `0` (Off), `1` (On). |

### No More Room in Hell: Voice and downloads

3 settings in `server.cfg`, shown under **Voice and downloads** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Voice chat | `sv_voiceenable` | Lets players talk to each other through a microphone. Choices: `0` (Off), `1` (On). |
| Players may download files | `sv_allowdownload` | Lets players download custom files, such as maps, from the server. It is slow; a web address is faster (see below). Choices: `0` (Off), `1` (On). |
| Download web address | `sv_downloadurl` | A web address players download custom files from, if you host them on a web server. Leave it empty to use the server. |

### No More Room in Hell: Logging

4 settings in `server.cfg`, shown under **Logging** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Write server logs | `log` | Turns the server's log output on or off. The guides suggest on, because it makes errors easier to track down. Choices: `on` (On), `off` (Off). |
| Log bans | `sv_logbans` | Writes the server's bans into the server log. Choices: `0` (Off), `1` (On). |
| Show log lines in the console | `sv_logecho` | Shows the log information in the server console as well. Choices: `0` (Off), `1` (On). |
| Write logs to a file | `sv_logfile` | Writes the log information to a file. Choices: `0` (Off), `1` (On). |

## Insurgency (2014)

Insurgency (2014) is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `insurgency\cfg` folder of the server. The panel writes that file with the server's name and password. The map and the player limit are on the launch line.

- `server.cfg`: The server's name, its join password, the remote console password, the minimum data rate and the map-rotation file. Only the lines you set are in the file. Other settings are not in the form because the research did not describe them clearly enough to explain them.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#insurgency-2014).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join from the in-game console with `connect <your address>:<port>`.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented quit command.
Matchmaking playlists (sv_playlist) are not offered: the sources disagree on the values they take.
No mod support is set up: the research could not confirm how Workshop content is installed.

### Insurgency (2014): Server

3 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it. |

### Insurgency (2014): Network

1 setting in `server.cfg`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Minimum data rate | `sv_minrate` | The lowest data rate, in bytes per second, a player's connection may be set to. The Valve page's example uses 30000; the page gives no default. |

### Insurgency (2014): Maps

1 setting in `server.cfg`, shown under **Maps** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Map rotation file | `mapcyclefile` | The file that lists the maps the server cycles through. The Valve page names the files below; mapcycle.txt holds the most popular options. Choices: `mapcycle.txt` (Mostly the popular modes (mapcycle.txt, the default)), `mapcycle_all.txt` (Every PvP map and mode combination (mapcycle_all.txt)), `mapcycle_ambush.txt` (Ambush (VIP) mode only (mapcycle_ambush.txt)), `mapcycle_attackdefend.txt` (A mix of attack and defend modes (mapcycle_attackdefend.txt)), `mapcycle_cooperative.txt` (Cooperative: checkpoint, outpost and hunt (mapcycle_cooperative.txt)), `mapcycle_firefight.txt` (All Firefight maps (mapcycle_firefight.txt)), `mapcycle_flashpoint.txt` (All Flashpoint maps (mapcycle_flashpoint.txt)), `mapcycle_infiltrate.txt` (All Infiltrate (capture the flag) maps (mapcycle_infiltrate.txt)), `mapcycle_objrespawn.txt` (Modes with respawns for completing objectives (mapcycle_objrespawn.txt)), `mapcycle_occupy.txt` (All Occupy maps (mapcycle_occupy.txt)), `mapcycle_push.txt` (All Push maps (mapcycle_push.txt)), `mapcycle_singlelife.txt` (A mix of the single-life modes (mapcycle_singlelife.txt)), `mapcycle_skirmish.txt` (All Skirmish maps (mapcycle_skirmish.txt)), `mapcycle_workshop.txt` (The Workshop rotation (mapcycle_workshop.txt)). |

## Pirates, Vikings, and Knights II

Pirates, Vikings, and Knights II is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `pvkii\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name and password, whether it is listed on the internet, the download settings, the round and map timing, the friendly-fire and voice settings, and the logging. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#pirates-vikings-and-knights-ii).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no developer statement of a quit command.
No Steam login token is asked for. The research could not say whether this game needs one for the public server list.
SourceMod plugins are not set up here: a host guide copies them into the folders by hand, which the panel does not do.

### Pirates, Vikings, and Knights II: Server

5 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it. |
| Admin email | `sv_contact` | The server admin's email address, the server's contact. The page's example is email@example.com; use an address you are happy to share. |
| Browser tags | `sv_tags` | Words, separated by commas, that help players filter the server in the in-game browser. The page's examples are vanilla and custom. |

### Pirates, Vikings, and Knights II: Joining

3 settings in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | On makes a LAN server: it is not listed on the internet. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |
| Players may download maps | `sv_allowdownload` | Lets players download custom maps and textures from the server, at the slow speed the page gives (20 kbps). Turn it off to stop that. Choices: `0` (Off), `1` (On). |
| Download web address | `sv_downloadurl` | A web address players can download custom maps and textures from, with no transfer limit. The page's example is http://example.com/custom. |

### Pirates, Vikings, and Knights II: Game rules

8 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Minutes per map | `mp_timelimit` | How many minutes one map is played before the game moves to the next one. The file's example uses 20. |
| Wait for round end before changing map | `mp_timelimit_waitroundend` | When the map time is up, wait for the current round to end before changing map. Choices: `0` (Off), `1` (On). |
| Round length (minutes) | `mp_roundtime` | How long one round lasts, in minutes. The page's default is 3. |
| Rounds per map | `mp_roundlimit` | How many rounds are played on a map before it changes. The page's default is 0. |
| Wins to end the game | `mp_winlimit` | How many round wins end the game. The page's default is 0. |
| Friendly fire | `mp_friendlyfire` | On lets team members hurt their own team. Off keeps teammates safe from each other. Choices: `0` (Off), `1` (On). |
| Voice chat | `sv_voiceenable` | Lets players talk to each other by microphone. The page's default is on. Choices: `0` (Off), `1` (On). |
| Everyone hears everyone | `sv_alltalk` | On lets all players hear each other's voice chat, not only their team's. Choices: `0` (Off), `1` (On). |

### Pirates, Vikings, and Knights II: Logging

5 settings in `server.cfg`, shown under **Logging** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Write server logs | `log` | Turns the server's logging on or off. The page's description covers logging to a file, the console and over the network. Choices: `on` (On), `off` (Off). |
| Log bans | `sv_logbans` | Writes the server's bans into the server log. The page's default is on. Choices: `0` (Off), `1` (On). |
| Show log lines in the console | `sv_logecho` | Shows the log information in the server console as well. The page's default is on. Choices: `0` (Off), `1` (On). |
| Write logs to a file | `sv_logfile` | Writes the log information to a file. The page's default is on. Choices: `0` (Off), `1` (On). |
| Use one log file | `sv_log_onefile` | Writes the log into a single file instead of separate files. The page's default is off. Choices: `0` (Off), `1` (On). |

## Dystopia

Dystopia is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `dystopia\cfg` folder of the server. The panel writes that file with the server's name, the password, `sv_lan 0` and `log on`. The map and the port are on the launch line.

- `server.cfg`: The server's name and password, whether it shows on the internet, the round and map timing, the friendly-fire and team settings, the vote settings, and the logging. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#dystopia).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join from the in-game console with `connect <your address>:<port>`.
No Steam login token is asked for: the guides say a server without one still shows in the server browser.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented quit command.
The map list (cfg\mapcycle.txt) is not offered: the research did not find its format.
No mod support is set up. The research found no server-side mod install method for Dystopia.

### Dystopia: Server

4 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it. |
| Admin email | `sv_contact` | The server admin's email address, as the server's contact. The guide's example is email@example.com. |

### Dystopia: Joining

2 settings in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | On makes a LAN server: the server does not show on the internet. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |
| Everyone hears everyone | `sv_alltalk` | On lets all players hear each other's voice chat, not only their team's. Choices: `0` (Off), `1` (On). |

### Dystopia: Game rules

9 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Minutes per round | `mp_timelimit` | How long a round lasts, in minutes, before the next one starts. The file says the usual value for Dystopia is 20. |
| Rounds per map | `mp_rounds` | How many rounds are played before the map changes. Setting it to 0 is the same as 1, the file says. |
| Stopwatch mode | `mp_stopwatch` | On gives twice the number of rounds set by Rounds per map on each map, as Stopwatch play does. Choices: `0` (Off), `1` (On). |
| Friendly fire | `mp_friendlyfire` | On lets players hurt their own team. Off keeps teammates safe from each other. Choices: `0` (Off), `1` (On). |
| Keep teams even | `mp_autoteambalance` | On lets the server move players automatically so the teams stay even. Choices: `0` (Off), `1` (On). |
| Chat time after a round (seconds) | `mp_chattime` | How many seconds players can chat after a round ends, before the next one starts. |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands, which have no effect while this is off. Keep it off on a server other people play on. Choices: `0` (Off), `1` (On). |
| Kick idle players | `sv_idlekick` | What happens to players who sit idle: 0 never kicks them, 1 kicks non-spectators, 2 kicks any player. Choices: `0` (Never), `1` (Non-spectators), `2` (Anyone). |
| Team-kill punish votes | `mp_punishvotes` | How many punish votes against a team-killer ban him from the server. The file says 0 turns this off. |

### Dystopia: Voting

9 settings in `server.cfg`, shown under **Voting** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Players may call votes | `mp_allowvoting` | On lets players start votes at all. The other vote settings only matter when this is on. Choices: `0` (Off), `1` (On). |
| Vote to change map | `mp_allowvoting_map` | On lets players vote to change the map. Choices: `0` (Off), `1` (On). |
| Vote to restart map | `mp_allowvoting_maprestart` | On lets players vote to restart the map. Choices: `0` (Off), `1` (On). |
| Vote to balance teams | `mp_allowvoting_balanceteams` | On lets players vote to balance the teams. Choices: `0` (Off), `1` (On). |
| Vote to kick players | `mp_allowvoting_kick` | On lets players vote to kick or ban another player. Choices: `0` (Off), `1` (On). |
| Vote-ban length (minutes) | `mp_votekick_bantime` | How long a player banned by a vote stays banned, in minutes. 0 means a vote only kicks the player out. |
| Votes needed to pass (percent) | `mp_votepct` | The share of players, as a percentage, needed for a vote to pass. The file's example is 51. |
| Vote to toggle Stopwatch | `mp_allowvoting_stopwatch` | On lets players vote to switch Stopwatch mode on or off. Choices: `0` (Off), `1` (On). |
| Vote to move a player to spectators | `mp_allowvoting_forcespec` | On lets players vote to move another player onto the spectators' team. Choices: `0` (Off), `1` (On). |

### Dystopia: Logging

5 settings in `server.cfg`, shown under **Logging** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Write server logs | `log` | Turns the server's logging on or off. The panel writes log on, which the guides recommend. Choices: `on` (On), `off` (Off). |
| Log bans | `sv_logbans` | Writes the server's bans into the server log. Choices: `0` (Off), `1` (On). |
| Show log lines in the console | `sv_logecho` | Shows the log information in the server console as well. Choices: `0` (Off), `1` (On). |
| Write logs to a file | `sv_logfile` | Writes the log information to a file. Choices: `0` (Off), `1` (On). |
| Use one log file | `sv_log_onefile` | Writes the log into a single file instead of separate files. Choices: `0` (Off), `1` (On). |

## Empires

Empires is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `empires\cfg` folder of the server. The panel writes that file with the server's name and the password. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name, the join password, the remote console password and whether cheat commands are allowed. Only the lines you set are in the file. The research found no other setting names for this game with a description, so the rest of the game's rules are not in the form.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#empires).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The form is short because the research found only a handful of named settings. A setting the file has that the panel does not explain is still shown, and you can type a new one as a line in `server.cfg`.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command, so a save may not finish.
Mods (SourceMod and Metamod plugins) are not set up by the panel. They are copied into the server's folders by hand, and players must run the same Empires version as the server. Keep updates on.
The map and player limit come from the research's example launch line. Check the map name against the game's own maps before you rely on it.

### Empires: Server

3 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The host guide says 8 to 32 letters, numbers, dashes or underscores. The panel does not use it. |

### Empires: Game rules

1 setting in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands. The sample server.cfg has it at 0 (off). Keep it off on a server other people play on. |

## Double Action: Boogaloo

Double Action is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `dab\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name and password, the remote console password, whether it is local-network only, votes, teams, friendly fire and downloads. Only the lines you set are in the file. The values are typed in, since the research found no list of allowed values.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#double-action-boogaloo).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The game does not respond to a graceful shutdown, according to its vendor. The panel's Stop closes the window and, after 15 seconds, ends the program, so changes that are only in memory may be lost. Stop the server before an update.
The folder of the settings file (dab\cfg) and the port protocol are not confirmed by the research. Check that the server reads the file the panel writes.
The Steam store page says the dedicated server is no longer on the store. The install still comes from SteamCMD, according to the vendor guides, but that may change.
No mods are set up by the panel: the research found no server mod method.

### Double Action: Server

3 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it. |

### Double Action: Joining

3 settings in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | Set 0 for a server friends join over the internet. 1 keeps it off the internet: no listing and no Steam connection, so only players on your local network can join. |
| Allow votes | `sv_allow_votes` | Lets players vote on things such as changing the map. Set 1 to allow votes, 0 to stop them. |
| Allow spectators | `mp_allowspectators` | Lets players watch the game without playing. Set 1 to allow spectators, 0 to stop them. |

### Double Action: Game rules

7 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Team play | `mp_teamplay` | Turns on team-based play, where players fight in teams. Set 0 for free-for-all. |
| Friendly fire | `mp_friendlyfire` | Lets team members injure each other. Set 1 to allow it, 0 to protect teammates. |
| Fall damage | `mp_falldamage` | Players take damage from long falls. Set 1 to turn it on, 0 to turn it off. |
| Force respawn | `mp_forcerespawn` | Makes every player respawn when they die, so nobody waits to come back. Set 1 to turn it on, 0 to turn it off. |
| Kill limit | `mp_fraglimit` | The number of kills at which the map ends. Set 0 for no kill limit. |
| Time limit (minutes) | `mp_timelimit` | How long each map lasts, in minutes. The sample uses 20. Set 0 for no time limit. |
| Team size difference | `mp_limitteams` | The most players one team can have over the other before players are blocked from joining it. Set 0 to turn the check off. |

### Double Action: Voice and chat

2 settings in `server.cfg`, shown under **Voice and chat** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Voice chat | `sv_voiceenable` | Turns voice chat on (1) or off (0) for players. |
| Everyone hears everyone | `sv_alltalk` | Lets players hear all other players, whatever team they are on. Set 1 to allow it, 0 to keep teams apart. |

### Double Action: Downloads

3 settings in `server.cfg`, shown under **Downloads** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow downloads | `sv_allowdownload` | Lets players download files they are missing, such as maps or models, from the server. It is slow, so a download site (below) is better. |
| Allow uploads | `sv_allowupload` | Lets players upload their own customisation files to the server. |
| Download website | `sv_downloadurl` | The web address players can get missing files from, instead of the server itself. Leave it empty if you do not have one. |

### Double Action: Bots

1 setting in `server.cfg`, shown under **Bots** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Number of bots | `bot_quota` | How many bots the server tries to keep in the game. The sample uses 2. |

## Half-Life Dedicated Server

This server runs Counter-Strike 1.6 from the `cstrike` folder. Its settings are lines of a name and a value in `server.cfg`, in the `cstrike` folder of the server (it replaces the stock one). The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name and password, whether it is local-network only, whether cheats are allowed, and a few round and movement settings. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#half-life-dedicated-server).

The server runs Counter-Strike 1.6 from the cstrike folder. Other games that use this program need other folders and are not set up here.
The settings are in server.cfg. The game reads it when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
Valve no longer updates this server, and the guides suggest ReHLDS for a newer engine. This panel does not install ReHLDS or any mod.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no documented close command.

### Half-Life (GoldSrc) server: Server

2 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |

### Half-Life (GoldSrc) server: Joining

1 setting in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | On makes a LAN server: only players on your local network can see and join it. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |

### Half-Life (GoldSrc) server: Game rules

4 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow cheat commands | `sv_cheats` | Lets players use cheat commands. The example server file turns them off; keep them off on a server other people play on. Choices: `0` (Off), `1` (On). |
| Maximum movement speed | `sv_maxspeed` | The fastest a player can move. One example file sets 320; changing it changes how fast everyone runs. |
| Map time limit (minutes) | `mp_timelimit` | How many minutes a map lasts before it changes. The example server file uses 20. |
| Rounds before map change | `mp_maxrounds` | The number of rounds played before the map changes. |

## IOSoccer

IOSoccer is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `iosoccer\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name and password, whether it is local-network only, and the match rules: extra time, penalties, offside, keepers and captains. It also has the voice chat, file download settings and logging. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#iosoccer).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no stop command the panel can send.
No mod support is set up. The hosting guides install Metamod:Source and SourceMod by hand, and custom maps and team kits need a download server; none of that is covered here. Server-side plugins and custom maps change how the server is run, so check the server after each game update.
Not in the form: the per-side player limit (mp_maxplayers, 1 to 11) and the time settings for breaks between halves, because the sources give different names or no units for them. Set them by hand in the server's cfg folder if you need them.

### IOSoccer: Server

4 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it. |
| Local network only | `sv_lan` | On makes a LAN server: no heartbeat, no authentication and no public listing, so only players on your local network can join. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |

### IOSoccer: Match

8 settings in `server.cfg`, shown under **Match** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Extra time | `mp_extratime` | Turns extra time on or off when a match is level at full time. Choices: `0` (Off), `1` (On). |
| Penalty shootout | `mp_penalties` | Turns the penalty shootout on or off when a match is still level after extra time. Choices: `0` (Off), `1` (On). |
| Offside rule | `mp_offside` | Turns the offside ruling on or off. Choices: `0` (Off), `1` (On). |
| Goalkeepers | `mp_botkeepers` | Whether the keepers are AI bots (1) or human players (0). Choices: `1` (AI keepers), `0` (Human keepers). |
| Away captain | `mp_captaincy_away` | Lets players take over as captain of the away team. Off means nobody can pick up that role. Choices: `0` (Off), `1` (On). |
| Cross the mid-line in warm-up | `mp_shield_block_opponent_half` | Lets players cross the middle line during the warm-up. Off keeps each side on its own half. Choices: `0` (Off), `1` (On). |
| Block charged kicks at kick-off | `sv_ball_kickoff_chargeblock` | Blocks the right mouse button (secondary attack) at kick-off, so players cannot charge a kick straight away. Turn it off to allow it. Choices: `0` (Off), `1` (On). |
| Red card ban (minutes) | `sv_ball_player_banduration` | How many in-game minutes a player is banned for after a red card. |

### IOSoccer: Voice and chat

2 settings in `server.cfg`, shown under **Voice and chat** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Voice chat | `sv_voiceenable` | Turns voice communication between players on or off. Choices: `0` (Off), `1` (On). |
| Everyone hears everyone | `sv_alltalk` | On lets players hear all other players, including the other team. Off keeps voice to each team. Choices: `0` (Off), `1` (On). |

### IOSoccer: Downloads

2 settings in `server.cfg`, shown under **Downloads** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Players may upload files | `sv_allowupload` | Lets players upload customisation files to the server. Choices: `0` (Off), `1` (On). |
| Players may download files | `sv_allowdownload` | Lets players download files from the server that they are missing. Choices: `0` (Off), `1` (On). |

### IOSoccer: Logging

2 settings in `server.cfg`, shown under **Logging** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Write logs to a file | `sv_logfile` | Writes server information to the log file. Choices: `0` (Off), `1` (On). |
| Log bans | `sv_logbans` | Writes the server's bans into the server log. Choices: `0` (Off), `1` (On). |

## BATTALION: Legacy

BATTALION: Legacy's server has no settings file the panel edits. Its name, its admin password and its query port are on the start command, which the panel writes when the server is created; the **Launch options** on the Settings tab can add to that line.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#battalion-legacy).

**No settings file.** The example Game.ini in the community's configuration repository has the name and admin password as keys, but no page says where the server reads it, and a forum report says edits did nothing. The panel therefore writes no file, and the name and the admin password go on the start command instead.
**The panel cannot stop the server cleanly.** The game stops with Ctrl+C in its own console window. The panel has no way to type into a console, so Stop closes the window and ends the process after 15 seconds. Open the server's window (kept minimized on the taskbar), press Ctrl+C, wait for it to close, and only then press Stop or update.
**Two ports, plus one.** The game port (`-Port`) is where players connect and the query port (`-QueryPort`) answers the server browser. The server also opens the port just above the game port, so leave that one free.
**No join password.** The forum's `-Password` flag conflicts with the egg, which does not use it, so the form does not offer a join password.
**No mods.** No official mod path was found, so none is managed. The hosting guides describe a file-manager upload that is not a documented mod method.
**Updates.** The server checks Steam for a new version every time it starts, and players can only join a server running the same version as their game.

## Black Mesa

Black Mesa is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `bms\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map, the player limit and the port are on the launch line.

- `server.cfg`: The server's name and password, whether it is listed on the internet, the download settings, the deathmatch rules such as kills to end a map and friendly fire, and the logging. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#black-mesa).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The guides give `quit` as the console's stop command, but the panel cannot send it.
No Steam login token is asked for. The guides do not say whether this server needs one for the public server list.
Maps and add-ons are not set up here: they are copied into the bms folders by hand and listed in bms\addonlist.txt, which the panel does not do.

### Black Mesa: Server

4 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console (RCON). Anyone with it can run server commands, so choose a long one. The panel does not use it. |
| Map rotation file | `mapcyclefile` | The name of the text file that lists the maps the server cycles through, one map per line. The guides use mapcycle.txt, kept in the bms\cfg folder. |

### Black Mesa: Joining

5 settings in `server.cfg`, shown under **Joining** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Local network only | `sv_lan` | On makes a LAN server: no heartbeat, no authentication, and only local addresses. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |
| Players may upload files | `sv_allowupload` | Lets players upload customisation files to the server. The guides' example turns it on. Choices: `0` (Off), `1` (On). |
| Players may download files | `sv_allowdownload` | Lets players download files they are missing from the server. The guides' example turns it on. Choices: `0` (Off), `1` (On). |
| Download web address | `sv_downloadurl` | A web address players can download missing files from. Leave it empty to download from the server itself. |
| Allow spectators | `mp_allowspectators` | Lets people watch a match without playing. The guides' examples differ, so check it once the server runs. |

### Black Mesa: Game rules

11 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Kills to end the map | `mp_fraglimit` | The number of kills that ends the map. 0 turns this off. The guides' examples use 30 and 45. |
| Seconds empty before a map change | `mp_mapcycle_empty_timeout_seconds` | If the server stays empty on one map for this many seconds, it moves to the next map in the rotation. 0 turns this off. The guide's example is 900. |
| Team play | `mp_teamplay` | Turns on team games (marines against scientists). 0 is free-for-all deathmatch, where every player is on their own. |
| Friendly fire | `mp_friendlyfire` | On lets team members hurt their own team. Off keeps teammates safe from each other. Choices: `0` (Off), `1` (On). |
| Respawn without asking | `mp_forcerespawn` | On respawns players straight away, without the respawn prompt. Off lets each player choose when to respawn. Choices: `0` (Off), `1` (On). |
| Fall damage | `mp_falldamage` | On lets players take damage from falls. Off makes falls harmless. |
| Flashlight | `mp_flashlight` | On allows players to use the flashlight. Choices: `0` (Off), `1` (On). |
| Warm-up time (seconds) | `mp_warmup_time` | How long the warm-up round lasts, in seconds, before the match starts. |
| Chat time after a map (seconds) | `mp_chattime` | How many seconds players can chat after the map ends, before the next one starts. |
| Voice chat | `sv_voiceenable` | Lets players talk to each other by microphone. |
| Everyone hears everyone | `sv_alltalk` | On lets all players hear each other's voice chat, not only their team's. |

### Black Mesa: Logging

3 settings in `server.cfg`, shown under **Logging** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Write logs to a file | `sv_logfile` | Writes the server's information into a log file. Where the file is saved is not stated in the guides. Choices: `0` (Off), `1` (On). |
| Show log lines in the console | `sv_logecho` | Shows the log information in the server console as well. Choices: `0` (Off), `1` (On). |
| Log bans | `sv_logbans` | Writes the server's bans into the server log. |

## Military Conflict: Vietnam

Military Conflict: Vietnam is set up with console variables ("convars"): lines of a name and a value in `server.cfg`, in the `vietnam\cfg` folder of the server. The panel writes that file with the server's name, the password and `sv_lan 0`. The map and the player limit are on the launch line.

- `server.cfg`: The server's name and password, the download address, the round and map timing, the friendly-fire and team settings, the bots and cheats. Only the lines you set are in the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#military-conflict-vietnam).

The game reads the file when it starts, so stop and start the server after changing a setting.
Friends join with the console command `connect <your address>:<port>`.
Game type and game mode (for example Classic and TeamDeathmatch) are not offered here: the research found no launch argument or file key for them, and the host's guide sets them in its own panel.
The panel has no way to type into this server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no developer statement of a quit command.
No Steam login token is asked for. The research could not say whether this game needs one for the public server list.
SourceMod and Metamod plugins are not set up here: a host guide copies them into the folders by hand, which the panel does not do.

### Military Conflict: Vietnam: Server

4 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Remote console password | `rcon_password` | The password for the server's remote console. Anyone with it can run server commands, so choose a long one. The panel does not use it. |
| Download web address | `sv_downloadurl` | A web address players can download custom maps and files from. The host's FastDL page says it adds this line for you when FastDL is on. |

### Military Conflict: Vietnam: Game rules

7 settings in `server.cfg`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Minutes per map | `mp_timelimit` | How many minutes of game time one map is played for. The host's page gives 15 as the default. |
| Round length (minutes) | `mp_roundtime` | How many minutes one round runs for. The host's page gives 2 as the default. |
| Friendly fire | `mp_friendlyfire` | Lets players damage their own teammates. The host's page gives 0 (off) as the default. |
| Balance teams automatically | `mp_autoteambalance` | Evens up the teams automatically when they drift apart. The host's page gives 0 (off) as the default. |
| Bots | `bot_quota` | How many bots fill out the server. The host's page gives 0 as the default, which is none. |
| Everyone hears everyone | `sv_alltalk` | Lets both teams hear each other on voice chat. The host's page gives 1 (on) as the default. |
| World gravity | `sv_gravity` | Sets how strongly things fall in the world. The host's page gives 800 as the default. |

### Military Conflict: Vietnam: Cheats

1 setting in `server.cfg`, shown under **Cheats** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Allow cheat commands | `sv_cheats` | Allows cheat commands to be used on the server. The host's page gives 0 (off) as the default; leave it off unless you know you need it. |

## SCP: Secret Laboratory

The server's settings are text files in `%APPDATA%SCP Secret Laboratoryconfig<port>`, in a folder named for the server's port. The panel does not edit them yet. Stop the server before you change them, because the server may write its own copy when it stops.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#scp-secret-laboratory).

The panel does not write the settings files. The server name, the join password and every gameplay setting are set by hand in `config_gameplay.txt` in the folder above. Whether the server creates these files on its first start is not documented, so look in the folder after the first start.
The panel stops the server by closing its window and, after 15 seconds, ending the process. SCP: Secret Laboratory has no documented console command or remote command to stop cleanly, so a round in progress may be lost.
The launch line sets the port, the EULA acceptance and the default-settings option. The game keys the settings folder by port, so after a port change the settings are found in a different folder.
Server plugins (LabAPI, which ships with the server, and EXILED, installed separately) are not managed by the panel. Their folders are not confirmed.

## Colony Survival

Colony Survival keeps its server settings in `server.config.json`, in the server's folder next to `colonyserver.exe`. The panel writes that file when it creates the server, and the game reads it at each start. The settings here are the ones the setup guides explain.

- `server.config.json`: The server's name and password, the port it uses, the world it loads, the player limit, the difficulty and the remote console password. JSON, one key per setting.

Settings are read when the server starts: stop it and start it again after a change.
The panel stops the server by closing its window, which the guides do not describe as a clean save. Back up the world before updates or mod changes, and stop the server first when you copy it.
Mods are folders in `gamedata/mods/<ModName>/`, each with a `modInfo.json`, and are switched on in the world's `worldconfig.json`. The server cannot download Workshop mods by itself: subscribe on a PC, then copy the folder over. This panel does not manage mods.
The game's own list of settings is longer than the form, and the guides do not explain some of its entries, so those are left out on purpose.

### Colony Survival: Server

2 settings in `server.config.json`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerSettings.ServerName` | The name this server shows in the server list. The panel writes it when it creates the server, from the Server Name you typed. |
| Join password | `ServerSettings.ServerPassword` | The password players type to join. Leave it empty for an open server. |

### Colony Survival: Network

3 settings in `server.config.json`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Address to listen on | `ServerSettings.ServerIP` | The address the server listens on. 0.0.0.0 means every address the PC has, which is right unless the PC has several network connections and you want it on one of them. |
| Game port | `ServerSettings.ServerGamePort` | The port players connect to. The panel sets it when it creates the server, and the port beside it is kept free. |
| Network type | `ServerSettings.NetworkType` | How the server is reached. SteamOnline is the only value the setup guides name, and the panel writes it. Choices: `SteamOnline` (Steam online). Another value can be typed. |

### Colony Survival: Players

1 setting in `server.config.json`, shown under **Players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Most players | `ServerSettings.MaxPlayerCount` | The most players who can be online at once. The current guides give 10 as the template's number. |

### Colony Survival: World

1 setting in `server.config.json`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| World name | `NewOptions.WorldName` | The name of the world the server loads. Its saves are kept in the gamedata/savegames folder, in a folder with this name. |

### Colony Survival: Rules

1 setting in `server.config.json`, shown under **Rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Difficulty | `NewOptions.DifficultyKey` | How hard the game is, from Peaceful to Very High. The guides give the five levels and their numbers; they do not say exactly what each one changes. Choices: `0` (Peaceful), `1` (Low), `2` (Normal), `3` (High), `4` (Very High). |

### Colony Survival: Remote console

1 setting in `server.config.json`, shown under **Remote console** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Remote console password | `ServerSettings.RCONPassword` | The password for the game's remote console (RCON). Leave it empty if you do not need RCON, which this panel does not use. |

## Rising World

Rising World's server is a Unity program, `RisingWorldServer.exe`, started by the panel's start script with `-batchmode -nographics`. Its settings are in `server.properties`, which the panel writes with the name and the port; the game fills in every other key the first time it starts.

- `server.properties`: The server's settings, one `Key=Value` per line with a comment above each. The panel writes the name and the port; the game adds the rest on its first start. Key names are case sensitive: a lowercase name is ignored.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#rising-world).

The game port is UDP. The server's web and query port is the port just below it (TCP and UDP): with the default 4255 that is 4254. The panel holds the game port and the port above it, but not this one, so keep the port below free too, and forward both if players are outside your network.
Settings are read when the server starts, and the game rewrites server.properties on the first start to add every key with its comment. Edit it while the server is stopped.
The panel's Stop closed the server cleanly on a real install: the server saved, shut down and wrote the end of its log (the panel reported "closed gracefully"). The game's own clean stop is the console command `shutdown`; still back up the world before you copy or update the server.
Plugins go in the `Plugins` folder beside server.properties, and worlds are in `Worlds`. Both are in the panel's backup.
World settings such as the game mode and the seed apply only when a world is first created. Change `World_Name` to start a new world.

### Rising World: Server

5 settings in `server.properties`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `Server_Name` | The name shown in the server list. The panel writes it when it creates the server, from the Server Name you typed. |
| Join password | `Server_Password` | If set, players are asked for this password to join. Leave it empty for an open server. |
| Description | `Server_Description` | A text shown in the server browser when a player selects the server, up to 4096 characters. |
| Admins | `Server_Admins` | The IDs of the server's admins, separated by semicolons. |
| Show in the server list | `Server_Visible` | Whether the server appears in the server list. Remember to change the server name if it does. Choices: `True`, `False`. |

### Rising World: Players

2 settings in `server.properties`, shown under **Players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Most players | `Settings_MaxPlayers` | The most players who can be online at once. The game's default is 64. |
| Only whitelisted players | `Server_UseWhitelist` | If on, only players in the server's whitelist file can join. Choices: `True`, `False`. |

### Rising World: Network

3 settings in `server.properties`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game port | `Server_Port` | The port the server listens on, over UDP. The panel sets it when it creates the server, so change it from the server's Ports section. The web and query port is the port just below it. |
| Address to listen on | `Server_IP` | The address the server binds to. Leave it empty to listen on every address, which is right unless the PC has several network connections. |
| Web server | `Server_WebserverEnabled` | Whether the server's built-in web server runs. It is needed for the server list and for queries, and a server without it does not show up in the server list. Choices: `True`, `False`. |

### Rising World: World

3 settings in `server.properties`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| World name | `World_Name` | The name of the world to load. If it does not exist, the server creates it. Worlds are kept in the Worlds folder. |
| Game mode for a new world | `World_GameMode` | The game mode of a world when it is first created: Survival or Creative. It does not change a world that already exists. Choices: `Survival`, `Creative`. |
| World seed | `World_Seed` | The seed used when a new world is created. Leave it empty for a random seed. |

## Warfork

Warfork's server is `wf_server_x64.exe`, started by the panel's start script. The panel passes the server name and the ports on the launch line. Every other setting is in the shipped `basewfdedicated_autoexec.cfg`, which the panel does not show in the Settings tab.

**The name and ports come from the launch line, not from a file.** The start script passes `+set sv_hostname`, `+set sv_port` and `+set sv_http_port`, which override the shipped file. Names with a quote, a semicolon or a backslash are refused, because the game reads them as console text. A `basewfserver.cfg` is not read by this server.
**Other settings are edited by hand.** They are `set name "value"` console lines in `basewfdedicated_autoexec.cfg` (the password, rcon password, most players, public listing, gametypes and votes). Edit it while the server is stopped; the game never rewrites it. Changing the name or a port there has no effect, since the launch line wins.
**Ports:** the game port (44400 by default) is UDP and answers server queries. The port after it is a TCP port the server uses to send files to players. The panel moves both together, so keep the next port free.
**Files stay in the install.** The panel adds `+set fs_usehomedir 0`; without it the game would keep its log, demos and configs in Documents\My Games\Warfork 2.1, shared by every server on the PC. The log is `basewfwfconsole.log`.
**Stop** closes the server cleanly on a real install; if it does not exit within 15 seconds the panel ends the program.

## Natural Selection 2

Natural Selection 2's server is x64\Server.exe, installed from Steam app 4940. The panel starts it with a name, a map, a player limit, a port, and a config and log folder inside the server's folder. The game writes its config files on the first start; the panel's form covers the map rotation file, MapCycle.json.

- `mapcycle.json`: The map rotation: which maps the server plays, in what order, how many minutes each lasts, and the Workshop mods it keeps using. Written by the game (or by you) in the config folder.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#natural-selection-2).

The panel stops this server by closing its window, then ending the program after 15 seconds. The game has no clean stop command the panel uses. Stop the server before you update it, and back up first.
The server's own settings (serverconfig.json) and admin list (serveradmin.json) are in the config folder, but this panel does not show their settings: the game's keys are not documented in the sources the panel was built from. Edit them with a text editor while the server is stopped, and keep them valid JSON, since bad JSON stops the server.
The game port is 27040 by default in this panel, not the 27015 the sources name, because another template already uses 27015. The game may also use the port above it, so keep that one free.
Workshop mods listed with -mods are downloaded when the server starts. Mods listed in mapcycle.json are kept for every map.
The panel starts the server with -logdir, so the log is serverlogs\log-Server.txt in the server's folder, and the Logs tab shows it. Workshop mods are still stored under AppData\Roaming\Natural Selection 2\workshop.
The server answers status queries on the port after the game port (27041 by default), so keep it free.

### Natural Selection 2: Rotation

2 settings in `mapcycle.json`, shown under **Rotation** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Map order | `mode` | How the server picks the next map: order plays the maps in the list in turn, random shuffles them. Read when the server starts. Choices: `order`, `random`. |
| Minutes per map | `time` | How many minutes each map is played before the server switches, counted from when the round ends. The community guide's example is 30. |

### Natural Selection 2: Maps

1 setting in `mapcycle.json`, shown under **Maps** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Maps | `maps` | The map names in the order they are played, as a JSON list such as ["ns2_summit", "ns2_veil"]. Map names are case sensitive. Do not list the same map twice when the order is set to order. |

### Natural Selection 2: Mods

1 setting in `mapcycle.json`, shown under **Mods** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Mods for every map | `mods` | Workshop mod IDs in hexadecimal, as a JSON list such as ["706D242"]. The server keeps using these mods on every map. |

## Chivalry: Medieval Warfare

Chivalry's server is a UDK program, `UDK.exe`, in `Binaries\Win64`. The panel starts it with the map and its two UDP ports on the map name, and writes the server name and the admin password into `PCServer-UDKGame.ini`. The rest of that file is the game's own.

- `PCServer-UDKGame.ini`: The server's settings, in `[Section]` headers with `Key=Value` lines. The panel writes the server name and the admin password; the form changes those and a few more keys, and leaves the rest of the file alone.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#chivalry-medieval-warfare).

Not checked on a real install yet. The settings names, the start line and the ports come from the research notes and community sources; the first start should be watched closely (see the build notes for the checks).
The game port is UDP (default 7000) and the query port is UDP (default 7010). Forward both if players are outside your network. The panel keeps the port just above the game port free, but not the query port.
The admin password is required, because the Unraid template for the server says it can't be empty. Choose one you do not use elsewhere; it is written in the settings file in plain text.
The panel's Stop closes the server window. The game does not respond to a graceful shutdown request, so the server may not save the world on the way out. Make a backup before you stop it, and do not rely on Stop to save.
Mods come from the Steam Workshop. The panel does not download them and adds no mod setting. Workshop items have to be fetched with the game's own Workshop tool, and clients then download them automatically; the server and the clients must end up on the same versions.
Keys in the file that are not on the form are left as they are, so edits made in the file itself are kept.

### Chivalry: Server

2 settings in `PCServer-UDKGame.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` in `[Engine.GameReplicationInfo]` | The name shown in the in-game server browser. The panel writes it when it creates the server, from the Server Name you typed. |
| Admin password | `AdminPassword` in `[Engine.AccessControl]` | The password a player types in the game to get admin (cheat) commands. The panel writes it from the Admin Password you typed when creating the server. |

### Chivalry: Players

1 setting in `PCServer-UDKGame.ini`, shown under **Players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Most players | `MaxPlayers` in `[Engine.GameInfo]` | The most players who can be on the server at once. The example config uses 32; the game's own upper limit is not confirmed. |

### Chivalry: Votes

4 settings in `PCServer-UDKGame.ini`, shown under **Votes** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Vote to kick | `bEnableVoteKick` in `[AOC.AOCGame]` | Lets players start a vote to remove another player from the server. Choices: `True`, `False`. |
| Vote to change map | `bEnableVoteChangeMap` in `[AOC.AOCGame]` | Lets players start a vote to switch to another map. Choices: `True`, `False`. |
| Vote to restart map | `bEnableVoteResetMap` in `[AOC.AOCGame]` | Lets players start a vote to restart the current map. Choices: `True`, `False`. |
| Only admins start votes | `bOnlyAdminsCanInitiateVotes` in `[AOC.AOCGame]` | If on, only admins can start a vote. Players can still vote when one is started. Choices: `True`, `False`. |

### Chivalry: Maps

1 setting in `PCServer-UDKGame.ini`, shown under **Maps** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Leave out the SDK maps | `bDontAddSdkMapsToList` in `[AOC.AOCGame]` | If on, the game does not add its built-in SDK maps to the map list automatically. The sample file's own comment describes this setting. Choices: `True`, `False`. |

## Hurtworld

Hurtworld's server is Hurtworld.exe, started by the panel's start script headless. The panel passes the game port, the query port and the server name in a -exec string, so there is no settings file to edit here.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#hurtworld).

The game port and the query port are both listed as UDP by one source and as UDP and TCP by another. Keep both free and forward them if players are outside your network.
The server's settings beyond the name and the ports are set through commands in its autoexec.cfg. The panel does not write that file, because its folder and whether the game creates it are not known yet.
Admins are added with the game's addadmin command, which needs a 64-bit Steam ID. This panel does not ask for one, so set admins by hand once the game's settings file is known.
The panel's Stop closes the server window. The game's own clean stop is the console command `quit` (sent over RCON, which this panel does not set up), so back up the world before you stop, update or copy the server.
Where the world is saved is not known yet, so the panel's backup keeps nothing. Copy the save folder by hand before you update the server.
Mods are loaded with loadmod lines in autoexec.cfg, or as Oxide plugins. This panel does not manage either.

## Euro Truck Simulator 2

Euro Truck Simulator 2's server is started by the panel's start script with the program bin\win_x64\eurotrucks2_server.exe. That program name is not confirmed by any source yet. The panel writes the server's settings file (server_config.sii) with the name and the two ports, so there is no settings form in this panel.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#euro-truck-simulator-2).

The server program's name is not confirmed. The start script uses eurotrucks2_server.exe, inferred from the American Truck Simulator server. Check the server folder's bin\win_x64 for the real name and make sure the server starts before you rely on it.
Before the first start, copy server_packages.sii and server_packages.dat into the server's data folder. The server does not start without them. The game makes them: open a copy of the game with a map loaded, open the console, and run export_server_packages. The panel cannot make them.
The settings are in data\Euro Truck Simulator 2\server_config.sii inside the server's folder. The panel writes the name, the two ports and the player limit. To change the rest, stop the server first, then edit the file by hand. The defaults conflict between sources, so the panel leaves the timezone to the game.
The panel's Stop closes the server window and, after 15 seconds, ends the program. The dossier names Ctrl + C as the only way to stop the server, so there is no clean save. Back up the data folder before you stop or update.
Public listing: a persistent logon token may be needed to be listed by the Steam server browser. This panel does not ask for a token, so the server uses an anonymous ID. Direct search still works.
Moderators are added in server_config.sii by Steam ID, which this panel does not ask for.

## American Truck Simulator

American Truck Simulator's server is amtrucks_server.exe, started by the panel's start script. The panel writes the server's settings file (server_config.sii) with the name and the two ports, so there is no settings form in this panel.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#american-truck-simulator).

Before the first start, copy server_packages.sii and server_packages.dat into the server's data folder. The server does not start without them. The game makes them: open a copy of the game with a map loaded, open the console, and run export_server_packages. The panel cannot make them.
The settings are in data\American Truck Simulator\server_config.sii inside the server's folder. The panel writes the name, the two ports and the player limit. To change the rest, stop the server first, then edit the file by hand. The defaults are not confirmed by an official page.
The panel's Stop closes the server window and, after 15 seconds, ends the program. The dossier names Ctrl + C as the only way to stop the server, so there is no clean save. Back up the data folder before you stop or update.
Public listing: a persistent logon token is needed to be listed by the Steam server browser. This panel does not ask for a token, so the server uses an anonymous ID. Direct search still works.
Moderators are added in server_config.sii by Steam ID, which this panel does not ask for.
Mods are not read from mod folders. Exported package files carry them. This panel does not manage those files.

## Medieval Engineers

Medieval Engineers' server is `DedicatedServer64\MedievalEngineersDedicated.exe`, started by the panel's start script in console mode. The panel writes its first config file, `Data\MedievalEngineers-Dedicated.cfg`, with the server name, the world name and the port. The game's other settings are not offered in this panel: edit the file by hand while the server is stopped.

**What the panel set up.** The config file names the server and the world after the name you typed, uses 0.0.0.0 for the address and the game port you chose (UDP), and switches the remote web API off. It also names a scenario from the game's sample (`SafeAreaStart`). The data folder is `Data` in the server's folder; the game is told to keep its config and saves there.
**Checked on a real install.** The start line is `-console -path` (with dashes; the bare words the official page lists leave a process that never starts the game). The server starts, creates its world in `DataSaves`, lists under its name and answers status queries on the game port. The log is `DataMedievalEngineersDedicated.log`, shown in the Logs tab.
**Stop.** The panel closes the server's window and, if it does not exit within 15 seconds, ends it. The official guide says a normal `taskkill` saves the world and `taskkill /F` does not, so the panel's close request is probably the safe kind; the save was not checked.
**Mods are not set by the panel.** The sources disagree on where mods go (a Mods list in the config file, `<Mods>` in the world's `sandbox.sbc`, or the server's settings page). Add mods by hand only after a backup, and test one at a time.
**Admins and bans** are in the config file under the names the game documents (Administrators as Steam IDs, one per line). Edit them with the server stopped.

## PixARK

PixARK's server is `ShooterGame\Binaries\Win64\PixARKServer.exe`, started by the panel's start script. The name, player limit, ports and passwords are written into the start line, and the server's rules are in `GameUserSettings.ini` (ShooterGame\Saved\Config\WindowsServer), which the Settings tab shows for the one setting it offers.

- `GameUserSettings.ini`: The server's rules. Only the PvE switch is shown here; the file holds many more settings, which you can edit by hand while the server is stopped.

**Ports.** The game and query ports are UDP, and the cube port (which sends terrain to players) is TCP. The RCON port is written on the line but RCON is off, so it is only reserved. The panel starts them at 27730, 27740, 27750 and 27760, away from the defaults other servers here use. Forward the game and query ports on your router.
**Passwords.** The join and admin passwords go into the start line, so only letters, numbers and `- _ . @ # $ * + ~` are allowed. A password left blank is not passed, which makes the server public.
**Settings on the line are overridden by the config file.** The dossier says the file wins where the two disagree. The Settings tab edits only the PvE switch in the file.
**Mods are copied in by hand.** The server cannot download Workshop mods. You subscribe on a PC, run the game once to unpack them, then copy each mod's folder and its `<ModID>.mod` file into `ShooterGame\Content\Mods` on the server. Players need the same mods, and a mod that is missing from the server may stop it from starting. Back up before you add one.
**Stop does not save.** The game has no save or stop command the panel can send; its own guide uses Ctrl+C. The panel closes the window and, if the game does not exit within 15 seconds, ends it. Back up before you stop or update.

### PixARK: Server

1 setting in `GameUserSettings.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| PvE mode | `ServerPVE` in `[ServerSettings]` | Turns the server's PvE (player versus environment) mode on or off. The Nodecraft settings page says true is creative and false is Fury (survival); a 2018 forum post calls true Pioneering. Check how the server plays after changing it, because the modes differ between game versions. Choices: `true` (On (PvE: creative, or Pioneering)), `false` (Off (survival: Fury)). |

## Stationeers

Stationeers' dedicated server is rocketstation_DedicatedServer.exe, started by the panel's start script. The panel passes the world type, the server name, the ports and the password on the launch line, so there is no settings file to edit here.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#stationeers).

On a restart the server loads the Panel save, and changing the world type in the script does not make a new world, and the world type only matters the first time; delete saves\Panel to start over.
The panel's Stop closes the server gracefully. Back up the world before you update or copy the server anyway.
The world is saved in saves\Panel and the game keeps its own settings in setting.xml, both in the server folder. The panel backs both up but does not edit setting.xml. The server log is server.log.
Ports and the password are only read from the launch line, according to one guide, so change them by recreating the server rather than editing a file.
Mods are installed through the Steam Workshop and a plugin loader (BepInEx or StationeersLaunchPad). This panel does not manage them. Every player needs the same mods as the server.

## Wreckfest

Wreckfest's server is Wreckfest_x64.exe, started by the panel's start script with -s and the settings file server_config.cfg in the install folder. The game makes that file from initial_server_config.cfg the first time it starts; the panel adds nothing to it.

- `server_config.cfg`: The server's settings, one key=value per line; lines starting with # are comments. Edit it while the server is stopped; changes typed in the console are not saved to it.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#wreckfest).

The defaults for every setting are not in the sources we could read. The keys and descriptions here come from an example file of December 2019, so check the names against the file your server created.
The join password is left out: the example file gives it no explanation. Set one by editing server_config.cfg if you know the key, or by hand from the game.
The panel's Stop closes the server cleanly. Back up the server before you update it anyway.
The panel passes the game, query and Steam ports to the server with -server_set, so they override the ports in server_config.cfg.
The game keeps its save data in the savestemp folder and writes log.txt, both in the server folder. The panel's backup keeps server_config.cfg and savestemp, and the Logs tab shows log.txt.
Mods are copied into a mods folder by hand and named in the mods= setting, and every player needs the same mods. The panel does not manage either. A changed mod list takes effect only after the second restart.

### Wreckfest: Players

2 settings in `server_config.cfg`, shown under **Players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Most players | `max_players` | The most players who can be on the server at once. The example file uses 24, which the game's own notes give as its limit. |
| Bots at start | `bots` | How many computer-controlled bots the server starts with, from 0 to 24. |

### Wreckfest: Lobby

7 settings in `server_config.cfg`, shown under **Lobby** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Hidden from Quick Match | `exclude_from_quickplay` | Whether players who use Quick Match can be sent to this server. 0 leaves it open to Quick Match; 1 hides it from it. Choices: `0` (Visible to Quick Match), `1` (Hidden from Quick Match). |
| Clear old rights at start | `clear_users` | Whether the admin and moderator rights players had before are cleared each time the server starts. 0 keeps them; 1 clears them. Choices: `0` (Keep them), `1` (Clear them). |
| Owner rights for the first player | `owner_disabled` | Whether the first player to join gets owner rights. 0 gives them to the first player; 1 gives nobody owner rights. Choices: `0` (First player gets owner rights), `1` (Nobody gets owner rights). |
| Who starts the countdown | `admin_control` | Whether the countdown before a race starts by itself or when the admin readies up. 0 starts it automatically; 1 lets the admin start it. Choices: `0` (Starts automatically), `1` (Admin starts it). |
| Countdown length (seconds) | `lobby_countdown` | How many seconds the countdown before a race lasts, from 30 to 127. |
| Players ready for automatic countdown (%) | `ready_players_required` | The percentage of players who must be ready before the automatic countdown starts. |
| Track voting | `enable_track_vote` | Whether players vote for the next track after one ends. It needs event rotation set up, and players can start a vote with the console command startvote. Choices: `0` (Off), `1` (On). |

### Wreckfest: Admins

2 settings in `server_config.cfg`, shown under **Admins** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Admin Steam IDs | `admin_steam_ids` | The 64-bit Steam IDs of players who get admin rights automatically, separated by commas. |
| Moderator Steam IDs | `op_steam_ids` | The 64-bit Steam IDs of players who get moderator rights automatically, separated by commas. |

### Wreckfest: Race

7 settings in `server_config.cfg`, shown under **Race** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Track | `track` | The track to race on. The console command tracks lists the names. |
| Game mode | `gamemode` | The game mode, such as racing or derby. The console command gamemodes lists the names. |
| Laps | `laps` | How many laps a race has, from 1 to 60. |
| Time limit (minutes) | `time_limit` | The time limit of a deathmatch game, in minutes. |
| Number of teams | `num_teams` | The number of teams in team game modes, from 2 to 4. Choices: `2`, `3`, `4`. |
| Elimination interval | `elimination_interval` | For elimination races: how often a player is eliminated. 0 means after every lap; the other choices are seconds. Choices: `0` (After every lap), `20` (20 seconds), `30` (30 seconds), `45` (45 seconds), `60` (60 seconds), `90` (90 seconds), `120` (120 seconds). |
| Event weather | `weather` | The weather for events. The console command weathers lists the names. |

### Wreckfest: Vehicles

7 settings in `server_config.cfg`, shown under **Vehicles** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Vehicle damage | `vehicle_damage` | How much damage cars take: normal, intense or realistic. Choices: `normal`, `intense`, `realistic`. |
| Fastest car class allowed | `car_class_restriction` | Allows only cars up to a class, from class A (fastest) to class D. Choices: `a` (Class A (fastest)), `b` (Class B), `c` (Class C), `d` (Class D). |
| Only one car | `car_restriction` | Allows only one specific car when it is filled in. The console command cars lists the names. |
| Special vehicles off | `special_vehicles_disabled` | Whether special vehicles are not allowed. 0 allows them; 1 does not. Choices: `0` (Allowed), `1` (Not allowed). |
| Car resets off | `car_reset_disabled` | Whether players can reset their car. 0 allows resets; 1 turns them off. Choices: `0` (Allowed), `1` (Turned off). |
| Car reset delay (seconds) | `car_reset_delay` | The delay before a car reset takes effect: 0 for none, or 1 to 20 seconds. |
| Wrong-way speed limit off | `wrong_way_limiter_disabled` | Whether the speed limit for players driving the wrong way is turned off. 0 keeps it; 1 turns it off. Choices: `0` (Speed limit kept), `1` (Speed limit off). |

### Wreckfest: Network

1 setting in `server_config.cfg`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Update frequency | `frequency` | How often the server sends updates to players. Low uses less bandwidth but more processing on players' PCs; high is the other way round. Choices: `low` (Low), `high` (High). |

### Wreckfest: Logs

1 setting in `server_config.cfg`, shown under **Logs** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Log file | `log` | The file the server saves its messages to, in the server's folder, such as log.txt. |

## Operation: Harsh Doorstop

Operation: Harsh Doorstop's server is an Unreal Engine program in HarshDoorstop\Binaries\Win64. The panel starts it with the map, the server name and two ports on the launch line. The settings are not written by the panel yet.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#operation-harsh-doorstop).

Checked on a real install: the server starts, answers the Steam query on the query port and sets its name and player count from the start script.
The panel's Game Port and Steam Query Port are its own picks (27050 and 27052), not the game's published defaults. Forward both if players are outside your network.
Settings such as the round time, the friendly fire and the admins are in the game's Game.ini file, but the sources disagree on key names, so the panel does not offer them.
Mods: the sources disagree on how they reach a server (a Workshop list in a host panel, or files copied in by hand). The panel does not manage mods.
The server does not close on the panel's Stop request, so the panel force-ends it after about 15 seconds. Back up the server before you stop, update or copy it. The panel's backup keeps the WindowsServer config folder, and the Logs tab shows HarshDoorstop.log.
The map names are case-sensitive. Jaziira_AASSmall is the one the panel uses by default and the one checked on a real server. The older names from host pages (Anviloy, Khafji, Salhan and so on) do not exist in the current build: the server then falls back to the AAS-TestMap test map. Other maps in the files are named like Jaziira_AASLarge.

## Rising Storm 2: Vietnam

Rising Storm 2: Vietnam's server is VNGame.exe in Binaries\Win64 (Windows only). The panel starts it with the map and two ports, and writes the server name and the join password into ROGame\Config\ROGame.ini. The rest of that file is the game's.

- `ROGame.ini`: The server's rules and settings, in `[Section]` headers with `Key=Value` lines. The panel writes the server name and the join password when it creates the server; the form changes the keys listed here and leaves the rest of the file alone.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#rising-storm-2-vietnam).

Checked on a real install: the server starts, answers the Steam query on the query port and writes Launch.log. The setting keys come from the official wiki, which was partly copied from another game, so a key that does not change anything on a real server is possible. The wiki gives no default for any key, so none is shown.
The panel's Game Port and Steam Query Port are its own picks (27070 and 27072), not the game's published defaults. Forward both if players are outside your network.
Workshop items, the Green Army Men add-on and custom maps are not managed by the panel. Their sources disagree on the setup steps, and the add-on needs files copied from a game install.
The server needs the Visual C++ 2012 x64 redistributable (vcredist_x64 from Microsoft, version 11.0). Without it VNGame.exe stops at a hidden 'MSVCP110.dll was not found' message and opens no ports. Install it on the PC before the first start; the panel cannot do it for you.
The panel's Stop closes the server window, which the game handles cleanly. The panel starts it with -log, so the Logs tab shows ROGame\Logs\Launch.log.
Stop the server before you edit ROGame.ini. The wiki says changes made while the server runs can be overwritten at the next restart.
The map names use the GameMode-MapName form, such as VNSU-SongBe (Supremacy) or VNTE-CuChi (Territories). The panel's map box takes the name only.

### Rising Storm 2: Server

3 settings in `ROGame.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` in `[Engine.GameReplicationInfo]` | The name shown to players in the server browser and in the server. The panel writes it when it creates the server. |
| Admin contact | `AdminContact` in `[Engine.GameReplicationInfo]` | A contact shown in the server browser for whoever runs the server. The wiki's example is an email address. |
| LAN only | `bLANServer` in `[ROGame.ROGameInfo]` | On: the server is only visible on the same local network. Off: it is listed on the internet. Choices: `True` (On), `False` (Off). |

### Rising Storm 2: Access

1 setting in `ROGame.ini`, shown under **Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Join password | `GamePassword` in `[Engine.AccessControl]` | The password players must type to join the server. The panel writes it from the Join Password you typed when creating the server. |

### Rising Storm 2: Rounds

5 settings in `ROGame.ini`, shown under **Rounds** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Players needed to start | `MinNetPlayers` in `[ROGame.ROGameInfo]` | How many players must be on the server before a round starts (1 to 64). |
| Rounds per map | `RoundLimit` in `[ROGame.ROGameInfo]` | 0 uses the game mode's own setting, 1 is one round, 2 is two rounds, and 3 or more is best of that many. |
| Seconds before next map | `EndOfMapDelay` in `[ROGame.ROGameInfo]` | How long, in seconds, the server waits after a match before it loads the next map. |
| Ready-up system | `bUseReadySystem` in `[ROGame.ROGameInfo]` | On: players must ready up before the first round can start. Choices: `True` (On), `False` (Off). |
| Everyone must ready up | `bAllPlayersMustReadyUp` in `[ROGame.ROGameInfo]` | On: every player must ready up before the game starts. Off: a majority is enough. Only matters when the ready-up system is on. Choices: `True` (On), `False` (Off). |

### Rising Storm 2: Team balance

3 settings in `ROGame.ini`, shown under **Team balance** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Balance teams | `bBalanceTeams` in `[ROGame.ROGameInfo]` | On: the game keeps the two teams close in size. Choices: `True` (On), `False` (Off). |
| Largest team difference | `MaxTeamDifference` in `[ROGame.ROGameInfo]` | The most players one team may have more than the other (1 to 63). Only matters when team balance is on. |
| Balance teams on death | `bAutoBalanceTeamsOnDeath` in `[ROGame.ROGameInfo]` | On: players who die are moved to even the teams. Only matters when team balance is on. Choices: `True` (On), `False` (Off). |

### Rising Storm 2: Team damage

3 settings in `ROGame.ini`, shown under **Team damage** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Team damage scale | `FriendlyFireScale` in `[ROGame.ROGameInfo]` | How much damage a teammate's bullets do to you: 0 is none, 0.5 is half, 1 is full damage (0 to 1). |
| Punishment for team damage | `FriendlyFirePunishment` in `[ROGame.ROGameInfo]` | What happens to a player who goes over the team-damage or team-kill limits. Choices: `0` (Kick the player), `1` (Session ban), `2` (Permanent ban). |
| Allow forgiving team kills | `bEnableTeamKillForgiving` in `[ROGame.ROGameInfo]` | On: a player can forgive a team kill by typing NP in the chat after it. Choices: `True` (On), `False` (Off). |

### Rising Storm 2: Voting

4 settings in `ROGame.ini`, shown under **Voting** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Map voting | `bEnableMapVoting` in `[ROGame.ROGameInfo]` | On: players vote for the next map at the end of a match. Off: the map cycle moves on by itself. Choices: `True` (On), `False` (Off). |
| Map vote time (seconds) | `MapVotingTime` in `[ROGame.ROGameInfo]` | How long players have to vote for the next map, when map voting is on. |
| Kick voting | `bEnableKickVoting` in `[ROGame.ROGameInfo]` | On: players can start a vote to kick another player. Choices: `True` (On), `False` (Off). |
| Kick vote time (seconds) | `KickVotingTime` in `[ROGame.ROGameInfo]` | How long a kick vote has to gather enough votes before it fails. |

### Rising Storm 2: Chat

1 setting in `ROGame.ini`, shown under **Chat** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Voice chat | `bEnableVOIP` in `[ROGame.ROGameInfo]` | On: players can talk to each other by voice. Choices: `True` (On), `False` (Off). |

### Rising Storm 2: Messages

3 settings in `ROGame.ini`, shown under **Messages** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server message | `ServerAdvertisementMessages` in `[ROGame.ROGameInfo]` | A message the server prints for all players in the text chat area, repeated at the interval below. |
| Message interval (seconds) | `ServerAdvertisementInterval` in `[ROGame.ROGameInfo]` | How often, in seconds, the server message is sent to players. |
| Death messages | `KillMessageMode` in `[ROGame.ROGameInfo]` | Which death messages players see: none, their own deaths, their own kills, or all deaths. Choices: `ROKMM_None` (None), `ROKMM_OwnDeath` (Own deaths only), `ROKMM_Own` (Player's own kills), `ROKMM_ALL` (All deaths). |

## Miscreated

Miscreated's server is MiscreatedServer.exe in the Bin64_dedicated folder, started by the panel's start script. The panel sets the game port and the server name on the launch line. The rest of the settings are in hosting.cfg, which the panel leaves for you to edit by hand.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#miscreated).

Checked on a real install: the server starts, answers the Steam query on the game port plus 2, and Stop closes it gracefully. The Logs tab shows server.log. hosting.cfg is not created by the game; make it in the server folder to override the shipped dedicated.cfg.
-sv_bind: the Docker guide says the server fails to start on the newest build without -sv_bind and the public IP address, and says to leave it out when Steam Workshop mods are used. The panel does not write it, because it does not know the public address. If the server does not start, this is the first thing to check.
RCON: the panel does not open the RCON service. The guides say it has no password unless http_password is set in hosting.cfg, so set that by hand if you use it.
Mods: Workshop mods are added by hand, by putting their numeric IDs on the steam_ugc line of hosting.cfg, separated by commas. The panel does not manage this line.
Keep the -mis_gameserverid value fixed. Changing it on a server that already has a world wipes that world.
Back up miscreated.db, the world database, before you update the server. The panel's backup copies it.

## Craftopia

Craftopia's server is Craftopia.exe, started by the panel's start script with -batchmode -showlogs. Its settings are in ServerSetting.ini in the server folder: the panel writes the file with the world name and the port, and the game reads it when it starts.

- `ServerSetting.ini`: The server's settings, in sections such as [GameWorld] and [Host], written as key=value lines. The panel writes the name and the port when it creates the server.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#craftopia).

Version: one Steam forum thread says the dedicated server works only with the legacy build of Craftopia, and a later post says a trial was reopened. Check which build the server runs on, and which beta branch to install, before you rely on the server.
Checked on a real install: anonymous install works, the server starts on the port from ServerSetting.ini, creates DedicatedServerSave/Craftopia.db and a world, and the panel's Stop closes it gracefully. It does not answer the Steam query. The game's own log is Player log files in %USERPROFILE%/AppData/LocalLow/PocketPair/Craftopia/Logs_DS (outside the server folder, so the Logs tab cannot show it).
Password: the game takes only a number of up to 8 digits. Set Use a password and the Password on the Settings tab if you want one.
Save folder: the Steam news says the saves moved next to Craftopia.exe in a December update. The panel's backup reads the default folder, DedicatedServerSave. Some guides name Saves instead, so check where the saves are after the first start.
Ports: the game port is TCP and UDP. The guides also list Steam ports in the 27015 to 27037 range; the panel does not reserve those.
Changes to ServerSetting.ini are read when the server starts. Stop the server before you edit it.

### Craftopia: World

3 settings in `ServerSetting.ini`, shown under **World** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| World name | `name` in `[GameWorld]` | The name of the world, shown to players. The panel sets it from the Server Name you typed when it creates the server. |
| Difficulty | `difficulty` in `[GameWorld]` | How hard the monsters and dungeons are. Easy, Normal (the default), Hard or Very hard. Choices: `0` (Easy), `1` (Normal), `2` (Hard), `3` (Very hard). |
| Game mode | `gameMode` in `[GameWorld]` | The world's mode: Normal (the default, survival), Creative build, or Creative play. Choices: `1` (Normal (survival)), `2` (Creative build), `3` (Creative play). |

### Craftopia: Players

3 settings in `ServerSetting.ini`, shown under **Players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Most players | `maxPlayerNumber` in `[Host]` | The most players who can be online at once, from 1 to 127. The panel writes 7, the default in the file. |
| Use a password | `usePassword` in `[Host]` | Whether players must type a password to join. Off by default. The password itself is set in the file, as a number. Choices: `0` (Off), `1` (On). |
| Password | `serverPassword` in `[Host]` | A number of up to 8 digits that players type to join, if the password is on. The setup guides say only numbers work. |

### Craftopia: Network

3 settings in `ServerSetting.ini`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Game port | `port` in `[Host]` | The port the server listens on, over TCP and UDP. The panel writes it when it creates the server. Forward it on your router if players are outside your network. |
| Steam lobby | `isUseSteamLobby` in `[Host]` | Whether the server uses a Steam lobby. Leave it Off: the setup guide marks the Steam lobby as not supported. Choices: `0` (Off), `1` (On (not supported)). |
| Address to listen on | `bindAddress` in `[Host]` | The address the server binds to. 0.0.0.0 listens on every address, which is right unless the PC has several network connections. |

### Craftopia: Saves

3 settings in `ServerSetting.ini`, shown under **Saves** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Auto-save every (seconds) | `autoSaveSec` in `[Save]` | How often the world is saved, in seconds. Set -1 to turn automatic saving off. |
| Also save every hour | `autoSavePerHour` in `[Save]` | Whether the server also saves once an hour, in addition to the timed saves. Choices: `0` (Off), `1` (On). |
| Save folder | `savePath` in `[Save]` | Where the saved worlds are kept. A relative path is taken from the server's folder. The panel's backup reads the default folder, DedicatedServerSave. |

### Craftopia: Creative mode

10 settings in `ServerSetting.ini`, shown under **Creative mode** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Players cannot die | `noDeath` in `[CreativeModeSetting]` | When on, a player's character does not die. Applies to the creative settings. Choices: `0` (Off), `1` (On). |
| Players take no damage | `noDamage` in `[CreativeModeSetting]` | When on, a player's character takes no damage. Choices: `0` (Off), `1` (On). |
| No hunger | `noHunger` in `[CreativeModeSetting]` | When on, a player's character does not get hungry. Choices: `0` (Off), `1` (On). |
| Infinite stamina | `infinitStamina` in `[CreativeModeSetting]` | When on, a player's character has endless stamina. Choices: `0` (Off), `1` (On). |
| No building | `noBuild` in `[CreativeModeSetting]` | When on, players cannot place new buildings. Choices: `0` (Off), `1` (On). |
| Buildings take no damage | `buildingIgnoreDamage` in `[CreativeModeSetting]` | When on, buildings do not take damage. Choices: `0` (Off), `1` (On). |
| Craft without the item cost | `quickCraft` in `[CreativeModeSetting]` | When on, crafting does not check the cost of the items used. Choices: `0` (Off), `1` (On). |
| Fixed time of day | `forceDayTime` in `[CreativeModeSetting]` | Sets the world's time of day, from 0 to 24. Set -1 to turn the override off. |
| Island level override | `islandLevel` in `[CreativeModeSetting]` | Sets the level of monsters and dungeons on the islands. Set -1 to turn the override off. |
| Age level | `ageLevel` in `[CreativeModeSetting]` | The age level of the game world, which changes the crafting recipes. The file's default is 7. |

## Ballistic Overkill

Ballistic Overkill keeps its settings in config.txt, one Key=value per line, in the server's folder. The panel writes the name, the two ports and the password when it creates the server; the rest is on the Settings tab.

- `config.txt`: The server's settings: its name and password, the match rules (map, mode, time, teams) and the login banner. The panel writes the name, the ports and the password; the game's own defaults apply to the rest.

Changing a setting takes effect when the server restarts (the example file says so). Stop the server from the panel, then start it again.
The ports are not on this page: the panel sets them from the server's Ports section, and it writes them into config.txt when the server is created. If you change a port later, change it in the file too, or the server will not match the panel's record.
Stopping: no quit command or remote console is documented for this game. The panel's Stop asks the server window to close and, after 15 seconds, ends the program.
Checked on a real install: the anonymous install works without the base game, BODS.exe starts with the settings from config.txt, answers the Steam query on the query port and the panel's Stop closes it gracefully. The game keeps no log in the server folder, so the Logs tab is empty.
Not in the form: the number of rounds and the round time (the dossier gives only their names), the broadcast mode (its sources disagree) and the game's mod support, which the dossier did not find.

### Ballistic Overkill: Server

5 settings in `config.txt`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` | The name shown in the server browser. The panel writes it when it creates the server. |
| Join password | `Password` | Only players who type this password can enter the match. Leave it empty for an open server. |
| Max players | `MaxPlayers` | The most players allowed on the server, from 2 to 16 (the example file's own note). |
| Max ping (milliseconds) | `MaxPing` | A player whose ping is above this many milliseconds is kicked from the server. 0 turns the check off. |
| Owner Steam ID | `OwnerId` | The SteamID64 of the server's owner. Only that player can send special commands from chat. The dossier does not list those commands. |

### Ballistic Overkill: Match

7 settings in `config.txt`, shown under **Match** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Start map | `GameMap` | The map the server starts on, by its number in the example file's list. Choices: `1` (Sunnsquare Mall), `2` (Corporate Park), `3` (Hollow), `4` (Nox Museum), `5` (Overhead), `6` (Citadel), `7` (Hakim), `8` (Blackfield), `9` (Wonderdome), `10` (Reinstate). |
| Game mode | `GameMode` | The mode the matches are played in, by its number in the example file's list. Choices: `1` (Team Deathmatch), `2` (Conquest), `3` (King of the Hill), `4` (Rounds), `5` (Free for all). |
| Match time (minutes) | `MatchTime` | How long a match lasts, in minutes. |
| Rounds | `Rounds` | How many rounds are played (the file gives no further detail). |
| Round time | `RoundTime` | How long each round lasts (the file gives no unit or further detail). |
| Warm-up time (seconds) | `WarmUpTime` | The wait between one match and the next, in seconds, before players spawn into the next match. |
| Balance teams automatically | `Autobalance` | Whether the two teams are kept even as players join and leave. Choices: `0` (Off), `1` (On). |

### Ballistic Overkill: Login banner

2 settings in `config.txt`, shown under **Login banner** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Login banner image | `BannerURL` | The image shown while players log into the server. Use a JPG or PNG that is 328 by 82 pixels. |
| Banner link | `ClickURL` | The web address that opens when a player clicks the login banner. |

## Age of Chivalry

Age of Chivalry's server is srcds.exe in the server's install folder, and the mod is the ageofchivalry folder inside it. Its settings are in ageofchivalry/cfg/server.cfg, one command per line. The panel writes the start line and the first few settings.

- `server.cfg`: The server's settings as console commands: the name, the join password, the admin email, LAN visibility, the time per map and team damage.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#age-of-chivalry).

Not checked on a real install. Before relying on this server, run it once and check the items in the server's implementation notes.
Stopping: the panel closes the server's window and, after 15 seconds, ends it. The guides say Age of Chivalry does not respond to a normal shutdown, and no console command to quit was found, so the last few minutes of play may not be saved.
Anonymous install: the panel installs the server with an anonymous SteamCMD login. The Valve list and a community tool say that works, but the FireDaemon guide logs in with a Steam account. If the install fails, that is the first thing to check.
Mods: the guides say nothing about how a dedicated server loads mods, so the panel adds no mod setting.
Ports: the game uses the port you chose. The guides also mention SourceTV and a client port, which the panel does not set; if another server is using those ports, it may fail to start.
Updates: the Windows build of the server does not update itself, so the panel's SteamCMD update runs when you ask it to. Stop the server first.

### Age of Chivalry: Server

2 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name shown in the server browser. The panel sets it from the Server Name you typed when it creates the server. |
| Admin email | `sv_contact` | The server admin's email address, as the config file's example shows it. Leave it empty to show nothing. |

### Age of Chivalry: Access

1 setting in `server.cfg`, shown under **Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Join password | `sv_password` | The password players must type to join. Leave it empty for a server anyone can join. |

### Age of Chivalry: Network

1 setting in `server.cfg`, shown under **Network** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Hide from the internet | `sv_lan` | On: the server does not show on the internet, so only players on this network can find it. Off is the default. Choices: `0` (Off), `1` (On). |

### Age of Chivalry: Rules

2 settings in `server.cfg`, shown under **Rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Map time limit (minutes) | `mp_timelimit` | How many minutes a map is played before the server switches to the next map by itself. |
| Team damage | `mp_friendlyfire` | On: players can hurt their own team. Off: they cannot. Choices: `0` (Off), `1` (On). |

### Age of Chivalry: Logs

1 setting in `server.cfg`, shown under **Logs** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Logging | `log` | Turns on logging to a file, the console and the network. The config file's own recommendation is on. Choices: `on` (On), `off` (Off). |

## HumanitZ

HumanitZ's settings are in GameServerSettings.ini in the HumanitZServer folder, in two sections: Host settings (the name, passwords and player limit) and World settings (the difficulty, loot, time and building rules). The panel copies the game's own default file there the first time, and the game reads it when the server starts.

- `GameServerSettings.ini`: Every setting of the server: the host settings in [Host Settings] and the world's rules in [World Settings].
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#humanitz).

Not checked on a real install. Before relying on this server, run it once and check the items in the server's implementation notes.
Stop the server before you change the settings file. The game reads it when the server starts, so a change made while it runs is lost or not used.
Stopping: the panel closes the server's window and, after 15 seconds, ends it. The developers' RCON shutdown is not used by the panel, and no Windows stop command was found, so the last few minutes may not be saved.
Mods: HumanitZ has no official mod support yet. The developer advises against unofficial mods until version 1.0, because they can damage saves. The panel adds no mod setting.
Server name: the name is ServerName in the Settings tab. Do not use the word Official in it.
Versions: the settings file the panel copies is the one shipped with the install. Some values on the guides' websites disagree with it, and the file's own values are the ones used here.

### HumanitZ: Server

2 settings in `GameServerSettings.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` in `[Host Settings]` | The name shown in the server browser. Avoid the word "Official" in it, or the server may not start or show up in the list. |
| Search group | `SearchID` in `[Host Settings]` | A tag that puts the server in a group players can search for. Changing it hides the server from the default list, so players must search for this tag. |

### HumanitZ: Access

3 settings in `GameServerSettings.ini`, shown under **Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Join password | `Password` in `[Host Settings]` | The password players must type to join. Leave it empty for a public server. |
| Admin password | `AdminPass` in `[Host Settings]` | The password an admin types in the game (with /adminaccess) to use the admin commands. |
| Use the global ban list | `UseGlobalBanList` in `[Host Settings]` | When on, the server turns away players the game has banned from its official servers. Choices: `false` (Off), `true` (On). |

### HumanitZ: Players

2 settings in `GameServerSettings.ini`, shown under **Players** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Max players | `MaxPlayers` in `[Host Settings]` | The most players who can be on at once. The game's default is 16. |
| Reserved slots | `ReserveSlots` in `[Host Settings]` | How many places are kept for certain players, listed by their NetID in F_ReservedSlots.txt. 0 turns reserved slots off. |

### HumanitZ: Messages

3 settings in `GameServerSettings.ini`, shown under **Messages** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Hide death notices | `NoDeathFeedback` in `[Host Settings]` | When on, players do not get a notice when someone dies. Admins still see them. Choices: `false` (Off), `true` (On). |
| Hide join and leave notices | `NoJoinFeedback` in `[Host Settings]` | When on, players do not get a notice when someone joins or leaves. Admins still see them. Choices: `false` (Off), `true` (On). |
| Limited spawn points | `LimitedSpawns` in `[Host Settings]` | When on, players only spawn at the random coast spawns and the spawn point, if there is one. Choices: `false` (Off), `true` (On). |

### HumanitZ: Progress

5 settings in `GameServerSettings.ini`, shown under **Progress** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Experience multiplier | `XpMultiplier` in `[World Settings]` | How fast players gain experience. 1 is the default, 2 is twice as fast, 0.5 is half as fast. |
| Permanent death | `PermaDeath` in `[World Settings]` | When on, a player who dies loses the character and must make a new one. Choices: `false` (Off), `true` (On). |
| What you lose when you die | `OnDeath` in `[World Settings]` | What a player loses on death: 0 nothing, 1 the backpack and the weapon in hand, 2 also the pockets and backpack, 3 also the equipment. Choices: `0` (Nothing), `1` (Backpack and weapon in hand), `2` (Also pockets and backpack), `3` (Also equipment). |
| Respawn wait (seconds) | `RespawnTimer` in `[World Settings]` | How long a player waits after dying before they can spawn again. |
| Logout wait (seconds) | `LogoutTimer` in `[World Settings]` | How long a player must wait before they can log out, when PvP is on. 0 turns the wait off. |

### HumanitZ: Combat

3 settings in `GameServerSettings.ini`, shown under **Combat** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| PvP | `PVP` in `[World Settings]` | On: players can hurt each other. This also decides whether players can interact with other players' items, such as cars and containers. Choices: `false` (Off), `true` (On). |
| Weapons break | `WeaponBreak` in `[World Settings]` | When on, a weapon breaks and is removed from the inventory when its durability reaches 0%. Off turns weapon breaking off. Choices: `false` (Off), `true` (On). |
| Cars a player can own | `MaxOwnedCars` in `[World Settings]` | How many cars a player may claim. Cars that nobody has claimed cannot be driven, but they can be looted. |

### HumanitZ: Difficulty

6 settings in `GameServerSettings.ini`, shown under **Difficulty** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Zombie health | `ZombieDiffHealth` in `[World Settings]` | How tough the zombies are: 0 very easy to 5 nightmare, 2 is the default. Choices: `0` (Very easy), `1` (Easy), `2` (Default), `3` (Hard), `4` (Very hard), `5` (Nightmare). |
| Zombie speed | `ZombieDiffSpeed` in `[World Settings]` | How fast the zombies move: 0 very easy to 5 nightmare, 2 is the default. Choices: `0` (Very easy), `1` (Easy), `2` (Default), `3` (Hard), `4` (Very hard), `5` (Nightmare). |
| Zombie damage | `ZombieDiffDamage` in `[World Settings]` | How hard the zombies hit: 0 very easy to 5 nightmare, 2 is the default. Choices: `0` (Very easy), `1` (Easy), `2` (Default), `3` (Hard), `4` (Very hard), `5` (Nightmare). |
| Bandit health | `HumanHealth` in `[World Settings]` | How tough the human bandits are: 0 very easy to 5 nightmare, 2 is the default. Choices: `0` (Very easy), `1` (Easy), `2` (Default), `3` (Hard), `4` (Very hard), `5` (Nightmare). |
| Bandit speed | `HumanSpeed` in `[World Settings]` | How fast the human bandits move: 0 very easy to 5 nightmare, 2 is the default. Choices: `0` (Very easy), `1` (Easy), `2` (Default), `3` (Hard), `4` (Very hard), `5` (Nightmare). |
| Bandit damage | `HumanDamage` in `[World Settings]` | How hard the human bandits hit: 0 very easy to 5 nightmare, 2 is the default. Choices: `0` (Very easy), `1` (Easy), `2` (Default), `3` (Hard), `4` (Very hard), `5` (Nightmare). |

### HumanitZ: Population

8 settings in `GameServerSettings.ini`, shown under **Population** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Zombie amount | `ZombieAmountMulti` in `[World Settings]` | Multiplies the number of zombies. 2 is twice as many, 0.5 is half. |
| Bandit amount | `HumanAmountMulti` in `[World Settings]` | Multiplies the number of human bandits. 2 is twice as many, 0.5 is half. |
| Zombie dog amount | `ZombieDogMulti` in `[World Settings]` | Multiplies the number of zombie dogs, which mainly appear at night. 2 is twice as many, 0.5 is half. |
| Animal amount | `AnimalMulti` in `[World Settings]` | Multiplies the number of animals. The default is 1. |
| Zombie respawn (minutes) | `ZombieRespawnTimer` in `[World Settings]` | How long it takes zombies to respawn. 0 turns zombie respawning off. |
| Bandit respawn (minutes) | `HumanRespawnTimer` in `[World Settings]` | How long it takes human bandits to respawn. 0 turns bandit respawning off. |
| Animal respawn (minutes) | `AnimalRespawnTimer` in `[World Settings]` | How long it takes animals to respawn. 0 turns animal respawning off. |
| Raids and AI events | `AIEvent` in `[World Settings]` | How often the game sends zombies or bandits to raid where you are: 0 off, 1 low, 2 default, 3 high, 4 insane. Choices: `0` (Off), `1` (Low), `2` (Default), `3` (High), `4` (Insane). |

### HumanitZ: Companions

5 settings in `GameServerSettings.ini`, shown under **Companions** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Companion dogs can be found | `DogEnabled` in `[World Settings]` | When on, you can find dogs in the world that you can recruit as companions. Choices: `false` (Off), `true` (On). |
| Companion dogs can be recruited | `RecruitDog` in `[World Settings]` | When on, players can recruit companion dogs by dropping food and claiming the dog. Choices: `false` (Off), `true` (On). |
| Most companion dogs in the world | `DogNum` in `[World Settings]` | The most companion dogs that can be found in the world. Dogs respawn when they are needed. |
| Companion dog health | `CompanionHealth` in `[World Settings]` | How healthy companion dogs are: 0 low, 1 default, 2 high. This is a fixed level, not a multiplier. Choices: `0` (Low), `1` (Default), `2` (High). |
| Companion dog damage | `CompanionDmg` in `[World Settings]` | How hard companion dogs hit: 0 low, 1 default, 2 high. This is a fixed level, not a multiplier. Choices: `0` (Low), `1` (Default), `2` (High). |

### HumanitZ: Loot

14 settings in `GameServerSettings.ini`, shown under **Loot** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Air drops | `AirDrop` in `[World Settings]` | When on, air drops with loot land on the map. Choices: `false` (Off), `true` (On). |
| Air drop interval (game days) | `AirDropInterval` in `[World Settings]` | How many game days pass between air drops. |
| Loot respawns | `LootRespawn` in `[World Settings]` | When on, loot containers and pickups come back. When off, they never respawn. Choices: `false` (Off), `true` (On). |
| Loot container respawn (minutes) | `LootRespawnTimer` in `[World Settings]` | If loot respawns, how long a loot container takes to come back. |
| Pickup respawn (minutes) | `PickupRespawnTimer` in `[World Settings]` | If loot respawns, how long a dropped pickup takes to come back. |
| Dropped item cleanup (game days) | `PickupCleanup` in `[World Settings]` | How many game days a dropped item lasts before it is removed. 0 keeps them for good. |
| Food rarity | `RarityFood` in `[World Settings]` | How much of this kind of loot there is: 0 scarce, 1 low, 2 default, 3 plentiful, 4 abundant. Applies to food. Choices: `0` (Scarce), `1` (Low), `2` (Default), `3` (Plentiful), `4` (Abundant). |
| Drink rarity | `RarityDrink` in `[World Settings]` | How much of this kind of loot there is: 0 scarce, 1 low, 2 default, 3 plentiful, 4 abundant. Applies to drinks. Choices: `0` (Scarce), `1` (Low), `2` (Default), `3` (Plentiful), `4` (Abundant). |
| Melee weapon rarity | `RarityMelee` in `[World Settings]` | How much of this kind of loot there is: 0 scarce, 1 low, 2 default, 3 plentiful, 4 abundant. Applies to melee weapons. Choices: `0` (Scarce), `1` (Low), `2` (Default), `3` (Plentiful), `4` (Abundant). |
| Ranged weapon rarity | `RarityRanged` in `[World Settings]` | How much of this kind of loot there is: 0 scarce, 1 low, 2 default, 3 plentiful, 4 abundant. Applies to guns and bows. Choices: `0` (Scarce), `1` (Low), `2` (Default), `3` (Plentiful), `4` (Abundant). |
| Ammo rarity | `RarityAmmo` in `[World Settings]` | How much of this kind of loot there is: 0 scarce, 1 low, 2 default, 3 plentiful, 4 abundant. Applies to ammunition. Choices: `0` (Scarce), `1` (Low), `2` (Default), `3` (Plentiful), `4` (Abundant). |
| Armour rarity | `RarityArmor` in `[World Settings]` | How much of this kind of loot there is: 0 scarce, 1 low, 2 default, 3 plentiful, 4 abundant. Applies to armour. Choices: `0` (Scarce), `1` (Low), `2` (Default), `3` (Plentiful), `4` (Abundant). |
| Resource rarity | `RarityResources` in `[World Settings]` | How much of this kind of loot there is: 0 scarce, 1 low, 2 default, 3 plentiful, 4 abundant. Applies to crafting resources. Choices: `0` (Scarce), `1` (Low), `2` (Default), `3` (Plentiful), `4` (Abundant). |
| Other item rarity | `RarityOther` in `[World Settings]` | How much of this kind of loot there is: 0 scarce, 1 low, 2 default, 3 plentiful, 4 abundant. Applies to everything else. Choices: `0` (Scarce), `1` (Low), `2` (Default), `3` (Plentiful), `4` (Abundant). |

### HumanitZ: Saves

1 setting in `GameServerSettings.ini`, shown under **Saves** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Save every (seconds) | `SaveIntervalSec` in `[World Settings]` | How often the server saves the world. 0 turns automatic saving off. |

### HumanitZ: Survival

3 settings in `GameServerSettings.ini`, shown under **Survival** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Hunger and thirst speed | `VitalDrain` in `[World Settings]` | How fast a player's vitals drain: 0 slow, 1 normal, 2 fast. Choices: `0` (Slow), `1` (Normal), `2` (Fast). |
| Food decay speed | `FoodDecay` in `[World Settings]` | How fast food goes off. 1 is the default, 0 turns decay off, 0.5 is half speed and values above 1 speed it up. |
| Generator fuel use | `GenFuel` in `[World Settings]` | How fast a house generator uses fuel. 1 is the default; less than 1 uses it more slowly. Between 0.01 and 4. |

### HumanitZ: Building

10 settings in `GameServerSettings.ini`, shown under **Building** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Players can dismantle their buildings | `AllowDismantle` in `[World Settings]` | When on, players can take apart the buildings they made. Choices: `false` (Off), `true` (On). |
| Players can dismantle house props | `AllowHouseDismantle` in `[World Settings]` | When on, players can take apart the props inside houses. Choices: `false` (Off), `true` (On). |
| Building health | `BuildingHealth` in `[World Settings]` | How healthy the buildings players make are. A multiplier: 1 is the default. |
| Territory | `Territory` in `[World Settings]` | When on, players cannot build in someone's spawn area. Clan members who are not recruits can. Choices: `false` (Off), `true` (On). |
| No-build zones | `NoBuildZone` in `[World Settings]` | When on, players cannot build in certain zones. Choices: `false` (Off), `true` (On). |
| Free building (experimental) | `FreeBuild` in `[World Settings]` | When off, some buildings need a foundation, which cuts down on floating buildings. The game's developers call this experimental. Choices: `false` (Off), `true` (On). |
| Spawn point decay (real days) | `Decay` in `[World Settings]` | How many real days a spawn point takes to go from full health to destroyed. Player buildings start to decay once it is gone. |
| Building decay (real days) | `BuildingDecay` in `[World Settings]` | How many real days a player building takes to decay fully. 0 turns decay off. No decay happens inside a spawn point's protection. |
| Blueprint cleanup (minutes) | `FakeBuildingCleanup` in `[World Settings]` | How long the white blueprint of an unfinished building lasts before it is removed. 0 keeps it. |
| Claimed car recycling (real days) | `RecycleCar` in `[World Settings]` | After how many real days a claimed car goes back into the pool and spawns somewhere else. 0 turns recycling off. |

### HumanitZ: Time and weather

7 settings in `GameServerSettings.ini`, shown under **Time and weather** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Freeze time when empty | `FreezeTime` in `[World Settings]` | When on, the game clock stops while no one is on the server. Choices: `false` (Off), `true` (On). |
| Day length (minutes) | `DayDur` in `[World Settings]` | How long a game day lasts, in real minutes. |
| Night length (minutes) | `NightDur` in `[World Settings]` | How long a game night lasts, in real minutes. |
| Days per season | `DaysPerSeason` in `[World Settings]` | How many game days each season lasts. |
| Starting season | `StartingSeason` in `[World Settings]` | The season a new world starts in. Choices: `0` (Summer), `1` (Autumn), `2` (Winter), `3` (Spring). |
| Shared sleep passes time | `MultiplayerSleep` in `[World Settings]` | When on, time passes if everyone sleeps at the same time. When off, sleeping together does not pass time. Choices: `false` (Off), `true` (On). |
| Sleep deprivation | `Sleep` in `[World Settings]` | When on, staying awake too long has an effect on the player. Choices: `false` (Off), `true` (On). |

### HumanitZ: Other

1 setting in `GameServerSettings.ini`, shown under **Other** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Voice chat | `Voip` in `[World Settings]` | When on, players can talk to each other with voice chat. Choices: `false` (Off), `true` (On). |

## Survive the Nights

Survive the Nights' server is installed with SteamCMD and started by the panel's start script, which runs STN_Dedicated_Server.exe with no arguments. The panel writes the server name, the game port and UPnP off into Config/ServerConfig.txt before the first start. The other settings are in that file.

Checked on a real install: the server starts with no arguments and listens on the port the panel wrote. The panel's Stop may not save the world first.
Port: the game's own default is 7950 (UDP) with UPnP on. The panel writes the port you chose and turns UPnP off, so the game does not open ports on your router by itself.
Settings: Config/ServerConfig.txt holds the settings (owner, name, password, day length, weather, zombies, loot). The panel does not show them.
Saves: the world is in .stn-server-V8.db in the server folder; the panel's backup covers it and the Config folder.
Mods: the dossier finds no developer statement on mods. Hosting sites say Steam Workshop is supported, but no mod folder or ID is documented, so the panel adds nothing for mods.

## Tower Unite

Tower Unite's dedicated server hosts one condo. The panel starts TowerServer.exe with the official map and arguments, and writes the settings file TowerServer.ini. The login tokens are needed to list the condo, and the panel does not write them: add them on the Settings tab.

- `TowerServer.ini`: The condo's settings: its title, the number of players, the two login tokens, the admins (one Steam ID per line) and the save options. The panel writes the title and leaves the tokens empty.

Login tokens: the official guides say both tokens are required to list the condo on the server list. Get the Steam token from the Steam game server management page (App ID 394690) and the Tower token from Tower Unite's server management page. Never share them.
Ports: the panel uses game port 7800 (UDP), because the game's default port 7777 is used by other games in the panel. The query port is fixed at 27016 on the launch line, as the official guide asks. Port 27016 is also the default of Sons of the Forest here, so do not run both with that default.
Stop: the panel closes the server window. The guides name no command that saves the condo before the server stops, so the last changes may not be saved if the server is stopped while players are on it.
Program: TowerServer.exe in the install root starts the real server, Tower/Binaries/Win64/TowerServer-Win64-Shipping.exe.
Bans: the ban list is Tower/Saved/Config/WindowsServer/TowerBans.ini. The guides say to edit it by hand; the panel does not show it.
Condo maps: the panel starts the condo C_Condo. Other maps (such as C_House and C_Studio) are named in the official guide, and their save files go in Tower/Condos/<map name>/.

### Tower Unite: Server

2 settings in `TowerServer.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Condo title | `ServerTitle` in `[/script/towernetworking.dedicatedserveroptions]` | The name of the condo server. It is the title shown for the server, and the panel sets it when the server is created. |
| Max players | `MaxPlayers` in `[/script/towernetworking.dedicatedserveroptions]` | How many players can be on the server at once. The game allows 2 to 64, and its default is 32. |

### Tower Unite: Login tokens

2 settings in `TowerServer.ini`, shown under **Login tokens** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Steam login token | `SteamLoginToken` in `[/script/towernetworking.dedicatedserveroptions]` | A token from Steam that gives this server a fixed Steam ID. The condo cannot be listed without it. Treat it like a password: the official guides say never to share it. |
| Tower login token | `TowerLoginToken` in `[/script/towernetworking.dedicatedserveroptions]` | A token from Tower Unite's server site that lets the condo join the public server list. Treat it like a password: the official guides say never to share it. |

### Tower Unite: Admins

1 setting in `TowerServer.ini`, shown under **Admins** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Admin Steam ID | `AdminSteamID` in `[Administration]` | The 64-bit Steam ID (a number) of one admin. For more admins, add another AdminSteamID line for each one. |

### Tower Unite: Condo

2 settings in `TowerServer.ini`, shown under **Condo** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Auto-save the condo | `CondoAutoSave` in `[DedicatedCondoOptions]` | Saves the condo on its own after changes have been made, so a crash loses less of the work. Choices: `True` (On), `False` (Off). |
| Keep a backup on each save | `CondoBackupsEnabled` in `[DedicatedCondoOptions]` | Makes a backup copy of the condo each time it is saved, so an earlier save can be restored. Choices: `True` (On), `False` (Off). |

## The Front

The Front's server is TheFrontServer.exe in ProjectWar\Binaries\Win64, started by the panel's start script with the game port and the server name. The settings the game reads are in TheFrontManager\ServerConfig_.ini, which this tab edits. Most of the settings are not documented by the sources the panel was built from, so only the documented ones are shown.

- `ServerConfig_.ini`: The server's settings, in one [BaseServerConfig] section of Key=Value lines. The panel writes the server name and join password when it creates the server.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#the-front).

Stop: the panel closes the server's window to stop it. The dossier found no console or RCON command for a clean save, so progress since the last automatic save (Save interval) may be lost.
Backups: the panel backs up the settings file only. The world is kept in a database and files whose folders the sources do not name, so copy the world by hand until its location is known.
Logs: no log file is known for this server, so the Logs tab is empty.
A host guide says the settings file overrides the launch line, so change a value in this tab rather than on the start script.
Not shown: the fight mode values, the chat and mail switches and the self-damage switch. The sources do not give their values, so type a value only after you have checked it in the game.
Version: the server and the game client must run the same version. After an update, check that the server still starts before you tell players.
Mods: no official mod support was found for the dedicated server, so the panel does not offer a mods field.

### The Front: Server

3 settings in `ServerConfig_.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` in `[BaseServerConfig]` | The name shown in the server browser. Make it easy to search for. |
| Server title | `ServerTitle` in `[BaseServerConfig]` | A short description shown under the name in the server list. |
| Player cap | `QueueThreshold` in `[BaseServerConfig]` | The most players that can be on the server at once. The guides use 8. |

### The Front: Access

3 settings in `ServerConfig_.ini`, shown under **Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Join password | `ServerPassword` in `[BaseServerConfig]` | What players type to join. Leave it empty for a public server. A host guide advises plain letters and numbers. |
| Admin Steam IDs | `ServerAdminAccounts` in `[BaseServerConfig]` | The Steam64 IDs of the people who get admin commands, separated by semicolons (;). Restart the server after you change it. |
| Anti-cheat | `UseACE` in `[BaseServerConfig]` | Turns the anti-cheat on. A host guide says to set it to true and leave it on. |

### The Front: Gameplay

2 settings in `ServerConfig_.ini`, shown under **Gameplay** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Fight mode | `ServerFightModeType` in `[BaseServerConfig]` | Sets PvP (players fight players) or PvE (players fight the environment). The guides do not list the values, so type the number the game uses; the sample uses 1. |
| Experience rate | `PlayerAddExpRate` in `[BaseServerConfig]` | A multiplier for how fast players gain experience. 1 is normal, 2 is double, 0.5 is half, and 0 turns it off. |

### The Front: Saving

1 setting in `ServerConfig_.ini`, shown under **Saving** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Save interval (seconds) | `SaveWorldInterval` in `[BaseServerConfig]` | How often the world is saved on its own, in seconds. The default is 300 (every five minutes); some hosts use 120. |

### The Front: Messages

1 setting in `ServerConfig_.ini`, shown under **Messages** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Welcome message | `WelcomeMessage` in `[BaseServerConfig]` | Text shown to players when they join. One line is plenty. |

## Day of Dragons

Day of Dragons' settings are in Game.ini, under the developer's section header. The panel creates the file with that header when it creates the server, and the Settings tab edits the keys the developer documents. The server's name is set at start with -SteamServerName.

- `Game.ini`: The server's settings, under one section header. Stop the server before you edit it, so the running game cannot overwrite your change.

Not checked on a real install. Before relying on this server, run it once and check the items in the server's implementation notes.
Port: the panel passes it as -QueryPort. The server opens no game port of its own (players connect through Steam), so this is the port the server list and the online check use.
Stop: no quit command or RCON is documented. The panel closes the server's window and, after 15 seconds, ends it, so the last few minutes may not be saved.
Settings the developer documents are in the Settings tab. Keys from other hosting guides are left out, because their names and defaults conflict with the developer's.
Mods: no mod support is documented for the dedicated server, so the panel adds no mod setting.

### Day of Dragons: Game rules

10 settings in `Game.ini`, shown under **Game rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server type | `iServerType` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | What kind of fighting is allowed: 0 is PvP (players can fight anyone), 1 is PvE (no player fighting), 2 is DvE (only faction PvP), 3 is CvC (only faction and clan PvP). Choices: `0` (PvP), `1` (PvE), `2` (DvE (faction PvP only)), `3` (CvC (faction and clan PvP only)). |
| Map | `sMap` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | The map the server loads. The developer lists sv_Forest, the Forgotten Forest survival map, and test, a map with a PvP arena for deathmatch. Choices: `sv_Forest` (Forgotten Forest (survival)), `test` (Test map (PvP arena)). Another value can be typed. |
| Growth speed | `iGrowthRateMultiplier` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | How fast young dragons grow. This only applies when growth is on (Disable growth is off). Choices: `0` (0.5x), `1` (1.0x (default)), `2` (1.5x), `3` (2.0x). |
| Disable growth | `bDisableGrowth` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | When on, growth is turned off and every egg hatches into an adult-sized dragon. Choices: `False` (Off), `True` (On). |
| Normal egg stats | `bForceNormalizedEggStats` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | When on, every egg spawns with the same stats, so no player gets a random genetic advantage when they start. Choices: `False` (Off), `True` (On). |
| Disable nesting | `bDisableNesting` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | When on, players cannot nest to get skins or to raise their stats. Choices: `False` (Off), `True` (On). |
| Same species groups only | `bForceSameSpeciesGroups` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | When on, only dragons of the same species can group together. The developer says this does not work on CvC servers. Choices: `False` (Off), `True` (On). |
| Flag hatchling killers | `bFlagHatchlingKillers` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | When on, an adult or elder dragon that kills a hatchling gets red glowing eyes for 20 minutes. Works only on PvP servers. Choices: `False` (Off), `True` (On). |
| Group members can hurt each other | `bEnableGroupDamage` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | When on, members of the same group can damage each other, if they are in PvP or flagged. Choices: `False` (Off), `True` (On). |
| Disable global chat | `bDisableGlobalChat` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | When on, players who are not admins cannot use the global chat. Choices: `False` (Off), `True` (On). |

### Day of Dragons: Players and clans

7 settings in `Game.ini`, shown under **Players and clans** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Max players | `iMaxPlayers` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | The most players who can be on the server at once. The developer's range is 1 to 200, and recommends no more than 100 for the best performance. |
| Max clans | `iMaxClans` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | How many clans the server allows. 0 turns clan creation off; the developer's range is 2 to 255. |
| Max clan members | `iMaxClanMembers` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | The most members one clan may have. This needs Max clans to be above 0. The developer's range is 10 to 1000. |
| Max ping (ms) | `iMaxLatencyMS` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | The highest ping a player may have, in milliseconds, before the server kicks them. 0 turns the check off; otherwise the range is 120 to 800. |
| Always show name tags | `bAlwaysShowPlayerTags` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | When on, every player's name tag shows, not only the tags of players in your group or clan. Choices: `False` (Off), `True` (On). |
| Always show admin tags | `bAlwaysShowAdminTags` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | When on, admin tags show to every player on the server. Choices: `False` (Off), `True` (On). |
| Roleplay tag | `bRoleplay` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | When on, the server is listed with the RP tag in the server browser, and the roleplay features, such as custom names, are turned on. Choices: `False` (Off), `True` (On). |

### Day of Dragons: Corpses, saves and restarts

3 settings in `Game.ini`, shown under **Corpses, saves and restarts** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Corpse removal time (seconds) | `iCorpseDespawnTime` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | How long a corpse stays on the server before it is removed. The developer's range is 60 to 1500 seconds; hosting guides quote a much larger maximum. |
| Save every (seconds) | `iAutoSaveSeconds` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | How often the server saves, in seconds. The developer's range is 60 to 3600. |
| Daily restart hour (UTC) | `iDailyRestartHour` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | The hour, in UTC, when the server restarts each day. 0 turns the daily restart off; 1 to 24 pick the hour. |

### Day of Dragons: Access and chat

1 setting in `Game.ini`, shown under **Access and chat** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server password | `sServerPassword` in `[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]` | The password players must type to join. Empty means no password. With a password set, admins use /admin password to reach the admin panel. |

## HYPERCHARGE: Unboxed

HYPERCHARGE: Unboxed's server is installed with SteamCMD and started by the panel's start script, which runs UnboxedServer.exe on the Garage map in co-op mode, with the game port and the query port. The game's other options are not set from the panel.

Not checked on a real install. The program name, the start line and the install id all come from a 2020 community guide and a Steam lookup. Before relying on this server, run it once and check the items in the server's implementation notes.
Ports: the panel passes the game port and the query port to the server as -Port and -QueryPort. The guide gives these flags as examples only, and on a real install the server did not listen on them: it uses PlayFab (an invite code appears in its log), so no port needs opening.
Settings: the game's options, such as the mode, the difficulty and the player limit, are not in a settings file, and the panel does not set them. The map and mode are fixed in the start script: the Garage map in co-op mode.
Stop: no quit command or RCON is documented. The panel closes the server's window and, after 15 seconds, ends it, so the last few minutes may not be saved.
Mods: no mod support is documented for this game, so the panel adds no mod setting.

## Day of Infamy

Day of Infamy's settings are console lines (`name value`) in `server.cfg`. The panel writes that file with the server's name, the password and `sv_lan 0` when it creates the server, and the launch line points the server at it. The map and the game port are set when the server is created.

- `server.cfg`: The server's name and password, whether it is a LAN server, voice and spectating, team and player rules, and the time limits. Only the lines you set are in the file.

The file's location and whether the game reads it from there are not confirmed: the research found no page that says where the dedicated server reads its settings. Check after the first start that a change you make here takes effect.
The research found no engine defaults for these settings, and the sample file they come from uses its own values. The form does not show a default.
The panel has no way to type into the server's console, so Stop closes its window and, after 15 seconds, ends the program. No stop command is documented.
Mods are not set up: the research did not find a way for a dedicated server to load Workshop mods.
The map and the game mode are the ones the panel starts with (sicily, frontline). Other maps are not offered in the form.

### Day of Infamy: Server

4 settings in `server.cfg`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `hostname` | The name people see in the server browser. The panel writes it when it creates the server. |
| Join password | `sv_password` | What players type to join. Leave it empty for a server anyone can join. |
| Local network only | `sv_lan` | Makes this a LAN server: the server does not list itself online and does not check players' accounts. Keep it off for a server friends join over the internet. Choices: `0` (Off), `1` (On). |
| Bots per team when empty | `doi_bot_quota` | How many bots to place on each team when no players are present. |

### Day of Infamy: Voice and spectating

3 settings in `server.cfg`, shown under **Voice and spectating** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Voice chat | `sv_voiceenable` | Turns voice communication between players on or off. Choices: `0` (Off), `1` (On). |
| Everyone hears everyone | `sv_alltalk` | When on, players can hear all other players, with no team restrictions. Choices: `0` (Off), `1` (On). |
| Allow spectators | `mp_allowspectators` | Turns spectator mode on or off, so people can watch without playing. Choices: `0` (Off), `1` (On). |

### Day of Infamy: Team rules

3 settings in `server.cfg`, shown under **Team rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Team play | `mp_teamplay` | Turns team-based play on or off. Choices: `0` (Off), `1` (On). |
| Balance teams automatically | `mp_autoteambalance` | Lets the game balance the two teams by itself in team play: when on, it moves players so the sides stay even. Choices: `0` (Off), `1` (On). |
| Friendly fire | `mp_friendlyfire` | Lets team members injure each other. Leave it off for a friendly server. Choices: `0` (Off), `1` (On). |

### Day of Infamy: Player rules

2 settings in `server.cfg`, shown under **Player rules** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Fall damage | `mp_falldamage` | Turns damage from falls on or off. Choices: `0` (Off), `1` (On). |
| Force respawn | `mp_forcerespawn` | Makes every player respawn when they die, so nobody waits to come back. Choices: `0` (Off), `1` (On). |

### Day of Infamy: Map and timers

4 settings in `server.cfg`, shown under **Map and timers** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Time per map (minutes) | `mp_timelimit` | Game time per map, in minutes, before the map ends. |
| Kill limit | `mp_fraglimit` | The number of kills at which the map ends. |
| Pre-round timer (seconds) | `mp_timer_preround` | How long the countdown lasts before each round starts, in seconds. |
| Post-round timer (seconds) | `mp_timer_postround` | How long the screen waits after a round ends before the next one, in seconds. |

## Killing Floor 2

Killing Floor 2 keeps its settings in `PCServer-KFGame.ini` in the `KFGame\Config` folder of the server. The game makes that file the first time the server runs, so the form is available after the first start. The map and the two ports are set when the server is created.

- `PCServer-KFGame.ini`: The server's name, its join and admin passwords, the difficulty and wave count, the player limit, the votes and whether the server is listed in the server browser.

Start the server once before changing anything here: the game writes this file on its first run, and the research advises against creating it by hand first. Stop the server before you save a change, or the game may overwrite it when it stops.
The server's executable name for Windows (KFServer.exe) is not confirmed by any page the research read. If the server does not start, check the name in the Binaries\Win64 folder.
The panel has no way to type into the server's console, so Stop closes its window and, after 15 seconds, ends the program. The research found no safe stop command for Windows.
Workshop maps and the web admin page are not set up by this form. The research found the Workshop settings in two different files, so they are not offered.
Several settings the research named have no stated default or range. They are not in the form; a value you type in the file by hand is kept.

### Killing Floor 2: Server

4 settings in `PCServer-KFGame.ini`, shown under **Server** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Server name | `ServerName` in `[Engine.GameReplicationInfo]` | The name shown to all players in the server browser. |
| Short name | `ShortName` in `[Engine.GameReplicationInfo]` | A shortened name for the server, shown where there is little room. |
| Join password | `GamePassword` in `[Engine.AccessControl]` | The password players need to join. Leave it empty for a server anyone can join. |
| Admin password | `AdminPassword` in `[Engine.AccessControl]` | The password for logging in as an admin, such as through the web admin page. Choose a long one, and do not use the join password here. |

### Killing Floor 2: Difficulty and waves

2 settings in `PCServer-KFGame.ini`, shown under **Difficulty and waves** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Difficulty | `GameDifficulty` in `[KFGame.KFGameInfo]` | How hard the zombies are. Normal is the easiest. Choices: `0` (Normal), `1` (Hard), `2` (Suicidal), `3` (Hell on Earth). |
| Game length | `GameLength` in `[KFGame.KFGameInfo]` | How many waves a game lasts before the players win. Choices: `0` (Short (4 waves)), `1` (Medium (7 waves)), `2` (Long (10 waves)). |

### Killing Floor 2: Players and lobby

3 settings in `PCServer-KFGame.ini`, shown under **Players and lobby** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Maximum players | `MaxPlayers` in `[KFGame.KFGameInfo]` | How many players can join. The research gives 1 to 6 for Survival and 1 to 12 for Versus Survival. |
| Turn off kick votes | `bDisableKickVote` in `[KFGame.KFGameInfo]` | When Yes, players cannot vote to kick someone out of the game. Choices: `false` (No), `true` (Yes). |
| Turn off map votes | `bDisableMapVote` in `[KFGame.KFGameInfo]` | When Yes, players cannot vote on the next map between rounds. Choices: `false` (No), `true` (Yes). |

### Killing Floor 2: Listing

1 setting in `PCServer-KFGame.ini`, shown under **Listing** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Hide from the server browser | `bDisablePublish` in `[KFGame.KFGameInfo]` | When Yes, the server does not appear in the server browser, so only people with its address can find it. Choices: `false` (No), `true` (Yes). |

## Empyrion - Galactic Survival

Empyrion's server reads dedicated.yaml, which the panel writes when it creates the server (the server's name, the join password, the ports and the save name). The Settings tab offers the launch arguments, because the file's format has no editor here yet.

- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#empyrion---galactic-survival).

Not checked on a real install. Before relying on this server, run it once and check the items in the server's implementation notes.
Windows only: the game has no Linux server, so a Linux host needs Wine, which the panel does not set up.
Stop: the panel asks the server to save and exit through its telnet console, then closes the window. The save has not been checked on a real install, so the last few minutes may not be saved.
Telnet: the telnet console has no password and is for this PC only. Do not open its port in your router or firewall.
Ports: the game port and the three ports after it must be open. The telnet port stays on this PC.
Settings: only the name, the join password and the ports are set from the panel. Other settings in dedicated.yaml take the game's own defaults.
Mods: the game's mods are scenarios (folders in Content/Scenarios). The panel does not install them, so set the scenario by hand.

## ATLAS

ATLAS's server is ShooterGameServer.exe, started by the panel's start script on the Ocean seamless-grid map. Its rates and join password are in GameUserSettings.ini (ShooterGame\Saved\Config\WindowsServer), and the Workshop mod ids for a seamless grid are in ShooterGame\ServerGrid.json.

- `GameUserSettings.ini`: The server's rates and join password, under the [ServerSettings] section. Stop the server before you edit it.
- `ServerGrid.json`: The seamless grid's settings. The panel shows only the Workshop mod ids; the game's grid editor makes the rest of the file.
- Launch arguments: the **Launch options** file on the Settings tab edits them. See the [launch arguments guide](LAUNCH_ARGUMENTS.md#atlas).

Not checked on a real install. Before relying on this server, run it once and check the items in its implementation notes.
Ports: the panel uses 7400 for the game and 7402 for the query port, away from the guide defaults (7777 and 27015) that other servers here use. Forward both on your router. The guides' firewall table lists the game port for TCP and UDP, while the panel's firewall check opens UDP only, so allow TCP too.
The map: the server starts the Ocean seamless-grid map. A seamless grid normally needs a ServerGrid.json from the game's grid editor, which the panel does not make. Check that the server starts and lists itself before you rely on it.
Passwords: the admin password is written on the start line and the join password in GameUserSettings.ini. Only letters, numbers and the marks - _ . @ # $ * + ~ are allowed in either.
Stop: the developers document no quit command or RCON. The panel closes the window and, after 15 seconds, ends the server, so the last minutes may not be saved. Back up before you stop or update.
Mods: the guides give three places for Workshop ids (ServerGrid.json, a mod list in the grid editor, and ActiveMods in an ini file) and do not say which one wins. This panel offers the ServerGrid.json list only.

### ATLAS (GameUserSettings.ini): Rates

3 settings in `GameUserSettings.ini`, shown under **Rates** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Experience rate | `XPMultiplier` in `[ServerSettings]` | How fast players earn experience. 1.0 is the normal rate, 2.0 doubles it and 0.5 halves it. |
| Taming rate | `TamingSpeedMultiplier` in `[ServerSettings]` | How fast creatures are tamed. 1.0 is the normal rate, 2.0 doubles it and 0.5 halves it. |
| Gathering rate | `HarvestAmountMultiplier` in `[ServerSettings]` | How much players get from each resource they gather. 1.0 is the normal rate, 2.0 doubles it and 0.5 halves it. |

### ATLAS (GameUserSettings.ini): Access

1 setting in `GameUserSettings.ini`, shown under **Access** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Join password | `ServerPassword` in `[ServerSettings]` | The password players must type to join. Leave it empty for a server anyone can join. It is separate from the admin password, so a player who knows only this one cannot use admin commands. |

### ATLAS (ServerGrid.json): Mods

1 setting in `ServerGrid.json`, shown under **Mods** on the Settings tab.

| Setting | Name in the file | What it does |
| --- | --- | --- |
| Workshop mod ids | `ModIDs` | The Steam Workshop ids of the mods for this server, separated by commas, in the order they should load. Leave it empty for no mods. |

import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Abiotic Factor. The server has two small settings files and everything else (name, ports, passwords, player limit) is on the
// launch line.
//   SandboxSettings.ini  the rules of the world. The panel writes it with the game's defaults when it makes the server and points the
//                        server at it with -SandboxIniPath, because the game does not make it itself. Lines look like Key=Value, and
//                        true/false are written True/False. The server reads it when it starts.
//   Admin.ini            who is an in-game admin (and who is banned). The game makes it the first time the server runs.
// Every name, default, range and choice here is from the developer's dedicated-server wiki and the example SandboxSettings.ini
// they publish (DFJacob/AbioticFactorDedicatedServer), and a real run of the server for Admin.ini and the launch line.

const SANDBOX = "SandboxSettings";
const inSandbox = (list) => Object.fromEntries(Object.entries(list).map(([key, meta]) => [`${SANDBOX}::${key}`, meta]));

const sandboxRows = rows([
	// Difficulty
	["GameDifficulty", "Difficulty", "How many enemies appear in some areas, how aggressive they are and how fast they react. Anything above Normal also switches off the automatic extra difficulty the game adds when more players are present.", "Difficulty"],
	["HardcoreMode", "Hardcore mode", "Characters get only one life, and the difficulty is forced to Apocalyptic. A dead scientist can spectate or quit; admins can revive them.", "Difficulty"],
	["AllowIronMode", "Allow the Iron Mode job", "Only matters when Hardcore mode is on. Offers a very hard starting job called Iron Mode: few perk points, fewer perks, no health regeneration, and no recipes received from other players.", "Difficulty"],

	// Time and weather
	["DayNightCycleState", "Day and night", "Stops the day and night from changing. Time still passes, but the light stays fixed. Some things only happen by day or by night, so some items could become impossible to get.", "Time and weather"],
	["DayNightCycleSpeedMultiplier", "Day and night speed", "How fast the clock runs: higher means shorter days. It does not change cooldowns or respawn times. The wiki's range is 0.1 to 3; the default is 1.0.", "Time and weather"],
	["WeatherFrequency", "Weather events", "How often weather events start. Even frequent weather still needs the right story progress before it happens.", "Time and weather"],

	// Facility
	["LootRespawnEnabled", "Resources respawn", "When on, resources slowly come back around the Facility (furniture does not). Handy on public servers, but objects can overlap or float and gathering matters less.", "Facility"],
	["PowerSocketsOffAtNight", "Power goes off at night", "Normally the Facility's power, including power sockets, shuts off at night. Turn this off to keep the power on, which makes the game easier because batteries are not needed. You may need it off if the day and night setting is Always night.", "Facility"],
	["HomeWorlds", "Allow Home Worlds", "When off, nobody can use the Home World portal worlds, including free and paid ones such as Torii.", "Facility"],

	// Survival
	["HungerSpeedMultiplier", "Hunger speed", "How fast hunger builds up: higher means players must eat more often. The wiki's range is 0.0 to 2.0; the default is 1.0.", "Survival"],
	["ThirstSpeedMultiplier", "Thirst speed", "How fast thirst builds up: higher means players must drink more often. The wiki's range is 0.0 to 2.0; the default is 1.0.", "Survival"],
	["FatigueSpeedMultiplier", "Tiredness speed", "How fast tiredness builds up: higher means players need to sleep more often. The wiki's range is 0.0 to 2.0; the default is 1.0.", "Survival"],
	["ContinenceSpeedMultiplier", "Bathroom need speed", "How fast the need for the toilet builds up: higher means more trips. The wiki's range is 0.0 to 2.0; the default is 1.0.", "Survival"],
	["SinkRefillRate", "Sink refill speed", "How fast sinks refill so players can drink from them: higher is faster. At 0 sinks never refill, which is much harder. The wiki's range is 0 to 10; the default is 1.0.", "Survival"],
	["FoodSpoilSpeedMultiplier", "Food spoil speed", "How fast food rots: lower slows it down and 0 stops it. The wiki's range is 0.0 to 2.0; the default is 1.0.", "Survival"],
	["RefrigerationEffectivenessMultiplier", "Fridge strength", "How well refrigeration keeps items fresh. It also changes how well hot items, such as a cup of coffee, stay warm in a warm place. The wiki's range is 0.0 to 2.0; the default is 1.0.", "Survival"],
	["InvisibleRadiation", "Hide the radiation effect", "When on, radiation shows no effect on the screen, so players need Geiger counters to find it. Harder.", "Survival"],
	["TaintedSinkWater", "Tainted sink water", "When on, sinks and similar sources that would give clean drinking water give tainted water instead. Harder.", "Survival"],
	["RadiationDealsDamage", "Radiation hurts health", "When on, radiation damages health directly. Much harder.", "Survival"],

	// Building and storage
	["StorageByTag", "Containers limited by item type", "When off, containers stop limiting what goes in them. Normally a fridge, for example, only takes food.", "Building and storage"],
	["StructuralSupportLimit", "Building support limit", "How much furniture and other placed objects can be stacked on each other before a limit is reached. A lower number limits tall builds. 0 removes the limit. The wiki does not say what the number counts; the default is 5.", "Building and storage"],
	["BridgeSupports", "Bridge support needed", "How much support a bridge needs; lower it to let bridges work with little or no extra support. 0 means no support is needed. The default is 2. The wiki does not explain what 1 and 2 mean.", "Building and storage"],
	["PlayerFurnitureDestruction", "Furniture is destroyed at zero durability", "When on, furniture players built is destroyed when its durability reaches zero. When off it just packs itself up, so it is easy to rebuild after an attack.", "Building and storage"],

	// Enemies
	["EnemySpawnRate", "Enemy respawn rate", "How often enemies come back: lower means longer waits, higher means they return faster. The wiki's range is 0.5 to 3; the default is 1.0.", "Enemies"],
	["EnemyHealthMultiplier", "Enemy health", "Multiplies enemy health: lower makes them easier to kill, higher makes them tougher. The wiki's range is 0.75 to 3.0; the default is 1.0.", "Enemies"],
	["EnemyPlayerDamageMultiplier", "Enemy damage to players", "Multiplies the damage enemies do to players. The default is tuned to be fair: lower is easier, higher is deadlier. The wiki's range is 0.25 to 3.0.", "Enemies"],
	["EnemyDeployableDamageMultiplier", "Enemy damage to buildings", "Multiplies the damage enemies do to deployables such as furniture and base pieces. Lower makes bases tougher. The wiki's range is 0 to 5.0; the default is 1.0.", "Enemies"],
	["DetectionSpeedMultiplier", "Enemy detection speed", "How fast enemies notice players. Above 1 means they notice faster than normal. The wiki's range is 0.1 to 3.0; the default is 1.0.", "Enemies"],
	["EnemyAccuracy", "Enemy accuracy", "How accurate enemies are on average. Higher accuracy mainly means they group their shots more tightly on their target.", "Enemies"],
	["ApocalypticAbilities", "Apocalyptic abilities for all enemies", "When on, every enemy may use its Apocalyptic-difficulty abilities, even when the difficulty is lower.", "Enemies"],
	["MaximizeEnemySpawns", "Use every enemy spawn point", "When on, every enemy spawn point is turned on, whatever the difficulty or the number of players.", "Enemies"],

	// Players
	["DamageToAlliesMultiplier", "Player-versus-player damage", "How much damage players do to each other, as a share of normal: 0.5 is half, 0.1 is a tenth. For real player-versus-player fights it needs to be 1.0 or more. The wiki's range is 0.0 to 3.0; the default is 0.5.", "Players"],
	["ShowDeathMessages", "Show death messages", "When off, players are not told when someone is killed.", "Players"],
	["AllowRecipeSharing", "Allow recipe sharing", "When off, players can not share item recipes with each other.", "Players"],
	["AllowPagers", "Allow pagers", "When off, pagers can not be used, either from the inventory or the emote wheel. That makes it harder to find other players.", "Players"],

	// Items
	["ItemStackSizeMultiplier", "Stack size", "Multiplies how many of an item fit in one inventory slot: an item that stacks to 5 stacks to 10 at 2. Items that do not stack are not affected. The wiki's range is 1.0 to 30; the default is 1.0.", "Items"],
	["ItemWeightMultiplier", "Item weight", "Multiplies how heavy items are: at 2 an item weighing 5 weighs 10. Below 1 makes items lighter. The wiki's range is 0.0 to 5.0; the default is 1.0.", "Items"],
	["ItemDurabilityMultiplier", "Item durability", "Multiplies how much durability items have: at 2 an item with 10 durability has 20. Below 1 makes items break faster. The wiki's range is 0.1 to 10.0; the default is 1.0.", "Items"],
	["BaseInventorySize", "Inventory slots without a backpack", "How many inventory slots a player has with no backpack on. A smaller number makes small backpacks less useful; a backpack's weight reduction still applies. The default is 12.", "Items"],
	["AllowTransmog", "Allow armor appearance swap", "When off, players can not change how their armor looks to match another piece. That limits customization but never lets someone disguise their gear as different gear.", "Items"],

	// Progression
	["BonusPerkPoints", "Bonus perk points", "Extra perk points on top of the ones each chosen job gives. A negative number takes points away. The default is 0.", "Progression"],
	["PlayerXPGainMultiplier", "XP gain", "How fast players earn XP: above 1 is faster, below 1 is slower, and 0 means skills can not level up at all. The wiki's range is 0.0 to 3; the default is 1.0.", "Progression"],
	["DisableResearchMinigame", "Skip the research minigame", "When on, new recipes unlock at once, without the research minigame.", "Progression"],
	["FirstTimeStartingWeapon", "Starting weapon", "The weapon a player gets the first time they spawn into the world, in addition to the items from their job.", "Progression"],
	["AllowCharacterReset", "Allow character reset", "The game has ways to reset a character's jobs, skills and traits later on. When off, players can not change their minds.", "Progression"],

	// Death and respawn
	["DeathPenalties", "What a player loses on death", "What a player loses when they respawn after dying, or when they use the Unstick option.", "Death and respawn"],
	["DurabilityLossOnDeathMultiplier", "Durability lost on death", "How much durability weapons and carried items lose when a player respawns. The wiki's range is 0.0 to 1.0; the default is 0.1.", "Death and respawn"],
	["HostAccessPlayerCorpses", "Host can open death bags", "When on, the host can open the inventories in the Death Bags players drop when they die. This may depend on other settings.", "Death and respawn"],
]);

withChoices(sandboxRows, {
	GameDifficulty: [["1", "Normal"], ["2", "Hard"], ["3", "Apocalyptic"]],
	DayNightCycleState: [["0", "Normal day and night"], ["1", "Always day"], ["2", "Always night"]],
	WeatherFrequency: [["1", "Never"], ["2", "Infrequent"], ["3", "Normal"], ["4", "Frequent"], ["5", "Daily"]],
	EnemyAccuracy: [["0", "Pathetic"], ["1", "Low"], ["2", "Default"], ["3", "High"], ["4", "Precise"]],
	DeathPenalties: [
		["0", "Keep all items"],
		["1", "Keep equipped items and hotbar"],
		["2", "Keep hotbar only"],
		["3", "Keep equipped items only"],
		["4", "Lose all items, including the hotbar"],
		["5", "All items are destroyed"],
	],
	FirstTimeStartingWeapon: [["0", "None"], ["1", "Shiv"], ["2", "Desk Leg"], ["3", "Kitchen Knife"], ["4", "Starter Baton"], ["5", "Pipe Club"], ["6", "Random"]],
});

const sandboxOrder = ["Difficulty", "Time and weather", "Facility", "Survival", "Building and storage", "Enemies", "Players", "Items", "Progression", "Death and respawn"];

// Admin.ini, as the game writes it on its first start: [Moderators] and [BannedPlayers], each with two example lines to replace.
const adminRows = rows([
	["Moderators::Moderator", "Admin (Steam ID)", "Makes one Steam player an in-game admin: put their 17-digit Steam ID here (for example 76561198053306820). Replace the example lines the game writes. Only for Steam players; console players use the admin password launch option instead.", "Admins"],
	["BannedPlayers::BannedPlayer", "Banned player (Steam ID)", "The Steam ID of a player banned from this server. The game writes one example line; replace it with a real ID.", "Bans"],
]);

// Launch line: all of the game's own arguments are written -NAME=value.
const launch = {
	title: "Abiotic Factor",
	program: /\bAbioticFactorServer(?:-Win64-Shipping)?(?:\.exe)?\b/i,
	style: "equals",
	editable: true,
	where: "the `AbioticFactorServer-Win64-Shipping.exe` line of the server's start script",
	intro: "Abiotic Factor's server name, ports, passwords and player limit are arguments on the command that starts it; the rules of the world are in SandboxSettings.ini (the Settings tab). Changes apply the next time the server starts.",
	args: [
		FLAG({ flag: "-log", label: "Show the log window", edit: false, managed: true, group: "Required", description: "Shows the server's log in its own console window. Keep it: without it the server has no window at all, and the panel can then only force it to stop instead of asking it to close." }),
		A({ flag: "-PORT", label: "Game port", group: "Network", managed: true, example: "8950", description: "The port players connect to (UDP). Needs port forwarding. Change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "-QueryPort", label: "Query port", group: "Network", managed: true, example: "8952", description: "The port used to advertise the server on Steam and answer the server list (UDP). The developer calls it recommended but not strictly required. Each Abiotic Factor server on a PC needs its own, or the game can not start its Steam connection." }),
		A({ flag: "-SteamServerName", label: "Server name", group: "Server", managed: true, example: '"My Server"', description: "The name shown in the in-game server browser." }),
		A({ flag: "-ServerPassword", label: "Server password", group: "Server", managed: true, example: '"secret"', description: "What players type to join. Leave it off for a server anyone can join." }),
		A({ flag: "-AdminPassword", label: "Admin password", group: "Server", managed: true, example: '"adminpass"', description: "Lets a player become an admin in the game by typing this password. It is separate from the server password. Leave it off to turn password admin off; admins then have to be listed in Admin.ini by Steam ID, which works for Steam players only." }),
		A({ flag: "-MaxServerPlayers", label: "Max players", group: "Server", managed: true, example: "6", description: "The most players that can be on at once, from 1 to 24. More than 6 is not recommended: players get a warning pop-up before they join." }),
		A({ flag: "-WorldSaveName", label: "World save name", group: "Saves and logs", managed: true, example: "Cascade", description: "The name of the world's save folder (in AbioticFactor\\Saved\\SaveGames\\Server\\Worlds). A name that does not exist yet starts a new world, and the old one stays on disk and returns if you switch back. The game's own default is Cascade." }),
		A({ flag: "-SandboxIniPath", label: "Sandbox settings file", edit: false, managed: true, group: "Files", example: "Config/WindowsServer/SandboxSettings.ini", description: "Where the world rules file is read from, counted from the server's AbioticFactor\\Saved folder. The panel sets it so the Settings tab edits the file the server really reads. Without it the game looks in the world's own folder." }),
		A({ flag: "-AdminIniPath", label: "Admin list file", edit: false, group: "Files", example: "Config\\WindowsServer\\Server1Admin.ini", description: "Where the admin list (Admin.ini) is read from, counted from the server's AbioticFactor\\Saved folder. The panel leaves it off, so the game uses SaveGames\\Server\\Admin.ini, which is the file the Settings tab shows." }),
		A({
			flag: "-PlatformLimited",
			label: "Limit platforms (no crossplay)",
			group: "Network",
			example: "PC",
			options: [["PC", "Steam players only"], ["Playstation", "PlayStation players only"], ["Xbox", "Xbox and Microsoft Store players only"]],
			description: "Turns crossplay off and lets only one kind of player in. Leave it off for full crossplay between Steam, Xbox and PlayStation.",
		}),
		FLAG({ flag: "-LANOnly", label: "Local network only", group: "Network", description: "Runs the server for your local network. Players find it with the in-game server browser set to LAN Only. Port 14001 must not be blocked on your network, because it is used to find servers." }),
		A({ flag: "-MultiHome", label: "Bind address", group: "Network", example: "192.168.1.20", description: "Makes the server listen on one IP address, for a PC with more than one network card or address. The developer's issue tracker says it only takes effect together with -UseLocalIPs. Leave it off to use them all." }),
		FLAG({ flag: "-UseLocalIPs", label: "Also listen on local addresses", group: "Network", description: "Like the bind address, but without choosing one: the server also listens on local addresses. A fix to try if players on your own network cannot connect. It may stop players from the internet from joining, so take it off again if they can not." }),
		FLAG({ flag: "-useperfthreads", label: "Use performance threads", group: "Performance", managed: true, description: "Makes the server use the CPU's performance threads. Optional; the developer's example start file includes it and their wiki says it is currently recommended." }),
		FLAG({ flag: "-NoAsyncLoadingThread", label: "Pause to load new areas", group: "Performance", description: "Makes the server stop and load new areas in one go instead of gradually in the background. The developer's example start file includes it, but their wiki says it is not recommended after community feedback, so the panel leaves it off." }),
		FLAG({ flag: "-newconsole", label: "Open its own console window", edit: false, group: "Required", description: "Opens the server in a console window of its own. The developer's example start file uses it together with -log. The panel does not add it, because -log already gives the server a console window." }),
		FLAG({ flag: "-NOSTEAM", label: "Do not use", edit: false, group: "Do not use", description: "Never use this. The developer warns against it and the server logs that it will not work correctly with it." }),
	],
};

const guide = {
	name: "Abiotic Factor",
	short: "Abiotic Factor",
	summary:
		"Abiotic Factor has two small settings files in the server's install folder, under `AbioticFactor\\Saved`. The rules of the world (difficulty, enemies, survival, items and more) are in `SandboxSettings.ini`, which the panel writes when it makes the server. The in-game admins are in `Admin.ini`, which the game writes the first time the server runs. The server's name, ports, passwords and player limit are arguments on the start script's launch line (**Launch options**).",
	files: {
		"SandboxSettings.ini": "The rules of the world: difficulty, hardcore mode, day and night, weather, survival needs, building, enemies, player damage, items, progression and what happens on death.",
		"Admin.ini": "The Steam IDs of the in-game admins and of banned players.",
	},
	notes: [
		"The server reads `SandboxSettings.ini` when it starts, so restart the server after changing it. The panel's start script points the server at `AbioticFactor\\Saved\\Config\\WindowsServer\\SandboxSettings.ini` (with `-SandboxIniPath`) instead of the copy in the world's own folder.",
		"Edit `Admin.ini` while the server is stopped; one report says the game can rewrite it when it starts. The form changes the lines already in the file. To add more admins, add more `Moderator=` lines to the file by hand.",
		"Stopping the server asks its console window to close, which the game answers by shutting down. The game has no remote console and no stop command. It is not known whether a world is saved on the way out, so use the admin menu's Force World Save in the game before you stop it.",
		"Forward the two UDP ports (game and query). The game has no TCP listener. The first time the server runs, Windows may ask whether to allow it through the firewall: if the prompt is dismissed Windows blocks it, and players outside the PC can not join until an Allow rule exists.",
		"Mods are not supported by the developer on dedicated servers yet, and the panel adds nothing for them. If you drop mod files into `AbioticFactor\\Content\\Paks` while the server is stopped, every player needs the same files, and you should back up the world first. The developer says the next big update (official mod support) will probably break all current mods.",
		"Leave the number of players at 6 or less: the game warns players before they join a bigger server. A new server uses about 1 GB of memory empty; plan for 4 GB or more with several players.",
	],
};

export default {
	type: "abiotic",
	title: "Abiotic Factor",
	files: {
		"SandboxSettings.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: { [SANDBOX]: "World rules" },
			settings: inSandbox(sandboxRows),
			groupOrder: sandboxOrder,
			mayBeMissing: "The panel writes this file when it makes the server. If it is missing, create SandboxSettings.ini in the server's AbioticFactor\\Saved\\Config\\WindowsServer folder, starting with the line [SandboxSettings], then reload this page.",
		},
		"Admin.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: { Moderators: "Admins", BannedPlayers: "Bans" },
			settings: { ...adminRows },
			groupOrder: ["Admins", "Bans"],
			mayBeMissing: "The game makes this file the first time the server starts, with two example lines to replace. Start the server once, then come back.",
		},
	},
	launch,
	guide,
};

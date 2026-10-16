import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// VEIN (Ramjet Studios). Two settings files in the server's Vein\Saved\Config\WindowsServer folder, both Unreal-style ini files:
//   Game.ini    who may join and who is admin, the name and password, and the player limit. Sections have names like
//               [/Script/Vein.VeinGameSession]. Source: Ramjet's own Config page (https://ramjet.notion.site/Config-279f9ec29f178011a909f8ea9525936d)
//               for the sections and keys; the hosts' pages (GameServerKings, XGamingServer) for the whitelist, the Discord lines and the badge
//               switch. The panel writes the name, password and player limit when it makes the server.
//   Engine.ini  the rules of the world, as console variables (vein.*) under [ConsoleVariables]. The panel writes the header only. The
//               names, ranges and defaults are from Citadel's and GameServerKings' copies of Ramjet's console-variable list, which both
//               say it is incomplete and dated to the writing of the article. A line that only repeats the default is removed by the
//               game, so a rule you set to its default may vanish from the file; that is not a fault.
// A key that starts with + adds another entry to a list (Unreal's array syntax): the first admin is AdminSteamIDs=, every one after it
// is +AdminSteamIDs=. These are separate keys in the catalog for that reason.
//
// Left out because the sources disagree or give no explanation: the query port (GameServerQueryPort; 7778 or 27015 depending on the
// page, and the panel passes -QueryPort on the launch line anyway), the game port ([URL] Port in Engine.ini; the launch line sets it),
// HTTPPort (no section named), HeartbeatInterval (no explanation), vein.TimeMultiplier (one example spells it that way; the lists
// say vein.Time.TimeMultiplier), and every console variable whose purpose a source does not explain.

const GAME_SESSION = "/Script/Engine.GameSession";
const VEIN_SESSION = "/Script/Vein.VeinGameSession";
const VEIN_STATE = "/Script/Vein.VeinGameStateBase";
const VEIN_SERVER = "/Script/Vein.ServerSettings";
const STEAM = "OnlineSubsystemSteam";
const CVARS = "ConsoleVariables";

const inSection = (section, list) => Object.fromEntries(Object.entries(list).map(([key, meta]) => [`${section}::${key}`, meta]));

const ADMIN_NOTE = "A Steam ID is the 17-digit SteamID64 (it starts with 7656); steamid.io looks it up from a profile link.";

const gameSession = rows([["MaxPlayers", "Max players", "The most players that can be on at once. Ramjet's example is 16 (the figure it treats as the default), the wiki's example is 64, and one host reports about 32 as a practical limit. More players need more memory: the server needs at least 8 GB of RAM just to start.", "Server"]]);

const veinSession = rows([
	["ServerName", "Server name", "The name shown in VEIN's server browser. One host limits it to 64 characters.", "Server"],
	["ServerDescription", "Server description", "Shown when a player selects your server in the browser. Use it for rules, the play style or a Discord link, like a message of the day.", "Server"],
	["bPublic", "Listed in the server browser", "False hides the server from the in-game browser. One host reports that this may not take effect on the current build, so also set a password if the server must stay private.", "Server"],
	["BindAddr", "Bind address", "The IP address the server listens on. Normally it does not need to be set or changed; it matters only for a PC with several network addresses.", "Network"],
	["Password", "Join password", "What players type to join. Leave it empty for a server anyone can join. It is not an admin password. A host reports that passwords are case-sensitive and that letters, numbers, dashes and underscores are the safe characters.", "Access"],
	["SuperAdminSteamIDs", "Super admin (Steam ID)", `A super admin is an admin who can also promote and demote other admins from inside the game; it is enough to list yourself here. ${ADMIN_NOTE} Put the first one here and any more under 'Extra super admin'.`, "Admins"],
	["+SuperAdminSteamIDs", "Extra super admin (Steam ID)", "A second or later super admin. Every entry after the first has to start with a plus sign in the file, or it replaces the one before it. Add more of these lines in the file with 'Edit as text'.", "Admins"],
	["AdminSteamIDs", "Admin (Steam ID)", `Makes one Steam player an admin, who can use the in-game console and admin menu. There is no admin password; admin comes only from the Steam ID. A new game file may carry the placeholder 1234, which you replace. ${ADMIN_NOTE}`, "Admins"],
	["+AdminSteamIDs", "Extra admin (Steam ID)", "A second or later admin. Every entry after the first has to start with a plus sign in the file, or it replaces the one before it and only the last counts. Add more of these lines in the file with 'Edit as text'.", "Admins"],
]);

withChoices(veinSession, { bPublic: [["True", "Listed"], ["False", "Not listed"]] });

const veinState = rows([
	["WhitelistedPlayers", "Allowed player (Steam ID)", `A whitelist (VEIN 0.023 and later). If there is any entry, only these players can join. Leave the section out to let anyone join. ${ADMIN_NOTE}`, "Whitelist"],
	["+WhitelistedPlayers", "Extra allowed player (Steam ID)", "A second or later whitelisted player. Every entry after the first has to start with a plus sign in the file. Add more of these lines in the file with 'Edit as text'.", "Whitelist"],
]);

const veinServer = rows([
	["DiscordChatWebhookURL", "Discord chat webhook", "Sends the in-game global chat to a Discord channel. Make the webhook in Discord (channel settings, Integrations, Webhooks) and keep the web address in double quotes.", "Discord"],
	["DiscordChatAdminWebhookURL", "Discord admin reports webhook", "Sends admin reports to a separate Discord channel. Written the same way as the chat webhook, in the same section.", "Discord"],
	["GS_ShowScoreboardBadges", "Show admin badges on the scoreboard", "Shows (1) or hides (0) the admin badges on the in-game scoreboard.", "Display"],
]);

withChoices(veinServer, { GS_ShowScoreboardBadges: [["1", "Show"], ["0", "Hide"]] });

const steam = rows([["bVACEnabled", "Steam VAC anti-cheat", "Turns Valve's anti-cheat on (1) or off (0) for the server. Ramjet's example has it off.", "Access"]]);

withChoices(steam, { bVACEnabled: [["0", "Off"], ["1", "On"]] });

const gameSettings = {
	...inSection(GAME_SESSION, gameSession),
	...inSection(VEIN_SESSION, veinSession),
	...inSection(VEIN_STATE, veinState),
	...inSection(VEIN_SERVER, veinServer),
	...inSection(STEAM, steam),
};

const gameOrder = ["Server", "Access", "Admins", "Whitelist", "Network", "Discord", "Display"];

// Engine.ini: console variables. Defaults are as the community lists give them (October 2025 list), so they may differ on a newer build.
const onOff = [["1", "On"], ["0", "Off"]];

const cvarRows = rows([
	// Players and bases
	["vein.PvP", "Players can hurt each other", "Whether players can damage other players. The list gives 1 (on) as the default.", "Players and bases"],
	["vein.BuildObjectPvP", "Players can damage bases", "Whether players can damage other players' bases. The list gives 1 (on) as the default.", "Players and bases"],
	["vein.BaseDamage", "Base damage", "Turns damage to bases on or off. The list gives 1 (on) as the default.", "Players and bases"],
	["vein.BuildObjectDecay", "Bases decay over time", "When on (1), bases slowly decay. The list gives 1 as the default and does not give the other allowed values.", "Players and bases"],
	["vein.Permadeath", "Permadeath", "When on (1), players can not respawn after they die. The list gives 0 (off) as the default.", "Players and bases"],
	["vein.AlwaysBecomeZombie", "Players always turn into zombies on death", "When on (1), a player who dies always becomes a zombie. The list gives 0 (off) as the default.", "Players and bases"],
	["vein.Stats.XPMultiplier", "XP gain", "How fast players earn experience. The list gives a range of 0.1 to 10 and a default of 1.", "Players and bases"],

	// Zombies
	["vein.Zombies.Health", "Zombie health", "How much health zombies have. The list gives a range of 0.1 to 100 and a default of 40.", "Zombies"],
	["vein.Zombies.SpeedMultiplier", "Zombie speed", "How fast zombies move, as a multiplier. The list gives a range of 0.1 to 3 and a default of 1.", "Zombies"],
	["vein.Zombies.DamageMultiplier", "Zombie damage", "How hard zombies hit, as a multiplier. The list gives a range of 0.1 to 5 and a default of 1.", "Zombies"],
	["vein.Zombies.HearingMultiplier", "Zombie hearing", "How far zombies hear noise, as a multiplier. The list gives a range of 0.1 to 2 and a default of 1.", "Zombies"],
	["vein.Zombies.SightMultiplier", "Zombie sight", "How far zombies see, as a multiplier. The list gives a range of 0.1 to 2 and a default of 1.", "Zombies"],
	["vein.Zombies.CanClimb", "Zombies can climb", "Whether zombies can climb over obstacles. The list gives 1 (on) as the default and does not give the other allowed values.", "Zombies"],
	["vein.Zombies.HeadshotOnly", "Zombies only take headshot damage", "When on (1), zombies only take damage from headshots. The list gives 0 (off) as the default.", "Zombies"],
	["vein.ZombieInfectionChance", "Infection chance per hit", "The chance that a zombie hit infects the player. The list gives a range of 0 to 1 and a default of 0.01, which is 1 in 100.", "Zombies"],

	// Spawning and hordes
	["vein.AISpawner.Enabled", "Zombies and animals spawn", "Turns AI spawning on or off. The list gives 1 (on) as the default.", "Spawning and hordes"],
	["vein.AISpawner.SpawnCapMultiplier", "Spawn limit (all)", "A multiplier for the most AI that can exist at once. The list gives a default of 1 and no range.", "Spawning and hordes"],
	["vein.AISpawner.SpawnCapMultiplierZombie", "Spawn limit (zombies)", "A multiplier for the most zombies that can exist at once. The list gives a default of 1 and no range.", "Spawning and hordes"],
	["vein.AISpawner.ZombieWalkerPercentage", "Share of zombies that walk", "The fraction of zombies that are walkers, from 0 to 1. The list gives a default of 0.7.", "Spawning and hordes"],
	["vein.AISpawner.ZombieCrawlerPercentage", "Share of zombies that crawl", "The fraction of zombies that are crawlers, from 0 to 1. The list gives a default of 0.1.", "Spawning and hordes"],
	["vein.AISpawner.ZombieLayerPercentage", "Share of zombies that start asleep", "The fraction of zombies that start lying down, asleep, from 0 to 1. The list gives a default of 0.1.", "Spawning and hordes"],
	["vein.AISpawner.HordeMode", "Horde mode", "Turns horde attacks on or off. The list gives 0 (off) as the default.", "Spawning and hordes"],
	["vein.AISpawner.Horde.Enabled", "Horde spawning", "Turns horde spawning on or off. The list gives 1 (on) as the default and does not give the other allowed values.", "Spawning and hordes"],
	["vein.AISpawner.Hordes.ChancePerMinute", "Hordes per minute", "The average number of hordes that start per minute. The list gives a default of 0.05.", "Spawning and hordes"],
	["vein.AISpawner.Hordes.Duration", "Horde length (seconds)", "How long each horde event lasts, in seconds. The list gives a default of 120.", "Spawning and hordes"],
	["vein.AISpawner.Hordes.NoiseEffect", "Horde chance from noise", "Higher means noise brings more hordes. The list gives a default of 0.1.", "Spawning and hordes"],
	["vein.AISpawner.Hordes.ScentEffect", "Horde chance from scent", "Higher means scent brings more hordes. The list gives a default of 0.5.", "Spawning and hordes"],

	// Time
	["vein.Time.TimeMultiplier", "Time speed", "How fast the game world's clock runs. The list gives a range of 1 to 16 and a default of 16. Lower is slower, which also slows hunger and thirst indirectly.", "Time"],
	["vein.Time.NightTimeMultiplier", "Night time speed", "A multiplier for how fast time runs at night. The list gives a default of 3.", "Time"],
	["vein.Time.NightTimeMultiplierStart", "Night speed starts at (hour)", "The hour of the day when the faster night time starts. The list gives a default of 20.", "Time"],
	["vein.Time.NightTimeMultiplierEnd", "Night speed ends at (hour)", "The hour of the day when the faster night time ends. The list gives a default of 6.", "Time"],
	["vein.Time.ContinueWithNoPlayers", "Clock runs on an empty server", "When on (1), game time keeps passing when nobody is online. The list gives 0 (off) as the default.", "Time"],
	["vein.Time.StartOffsetDays", "Start day offset", "The day offset used for a new world. The list gives a default of 0.", "Time"],

	// Loot and the world
	["vein.Scarcity.Difficulty", "Loot scarcity", "How much loot there is to find. The lists give a range of 0 to 4 with a default of 2, which they call standard.", "Loot and the world"],
	["vein.ContainersRespawn.Enabled", "Loot containers refill", "Whether loot containers refill after they are emptied. The list gives 1 (on) as the default.", "Loot and the world"],
	["vein.ContainersRespawn.Interval", "Container refill time (seconds)", "How long before emptied loot containers refill. The list gives a range of 600 to 43200 and a default of 10800, which is 3 hours.", "Loot and the world"],
	["vein.Calendar.WaterShutoffTimeDays", "Days until the water stops", "How many game days until the water supply goes off. The list gives a range of 1 to 999 and a default of 30.", "Loot and the world"],
	["vein.Calendar.ElectricalShutoffTimeDays", "Days until the power stops", "How many game days until the electricity goes off. The list gives a range of 1 to 999 and a default of 46.", "Loot and the world"],

	// Saving
	["vein.Autosave.Interval", "Autosave every (seconds)", "How often the server saves the world, in seconds. The list gives a default of 300, which is 5 minutes.", "Saving"],
]);

withChoices(cvarRows, {
	"vein.PvP": onOff,
	"vein.BuildObjectPvP": onOff,
	"vein.BaseDamage": onOff,
	"vein.AISpawner.Enabled": onOff,
	"vein.AISpawner.HordeMode": onOff,
	"vein.ContainersRespawn.Enabled": onOff,
	"vein.Scarcity.Difficulty": [
		["0", "0 - None"],
		["1", "1 - More loot"],
		["2", "2 - Standard"],
		["3", "3 - Less loot"],
		["4", "4 - Impossible"],
	],
});

const cvarOrder = ["Players and bases", "Zombies", "Spawning and hordes", "Time", "Loot and the world", "Saving"];

// Launch line: VEIN's arguments are written -Name=value (the hosting pages stress the =).
const launch = {
	title: "VEIN",
	program: /\bVeinServer(?:-Win64-Test)?(?:\.exe)?\b/i,
	style: "equals",
	editable: true,
	where: "the `VeinServer-Win64-Test.exe` line of the server's start script",
	intro: "VEIN's ports are given on the command that starts it; its name, password, player limit and admins are in Game.ini and its world rules in Engine.ini (the Settings tab). The official wiki lists only a few launch arguments and says the rest are still pending testing. Changes apply the next time the server starts.",
	args: [
		FLAG({ flag: "-log", label: "Show the log window", edit: false, managed: true, group: "Required", description: "Gives the server a console window that shows its log. Keep it: the panel asks that window to close when it stops the server, and one host notes the server prints no console output without it." }),
		A({ flag: "-Port", label: "Game port", group: "Network", managed: true, example: "8960", description: "The UDP port players connect to (the game's own default is 7777). Change it from the server's Ports section so the panel can check for clashes and open the firewall. Written with an equals sign, -Port=8960." }),
		A({ flag: "-QueryPort", label: "Query port", group: "Network", managed: true, example: "8962", description: "The UDP port the Steam server browser asks for the server's details on. The wiki says to keep it at the game port plus 2 and not between 27020 and 27050, which Steam uses on a PC that runs Steam. Change it from the server's Ports section." }),
		A({ flag: "-multihome", label: "Bind address", group: "Network", example: "192.168.1.20", description: "Makes the server use one specific IP address of this PC. Only useful on a PC with several network cards or addresses; leave it off to use them all." }),
		FLAG({ flag: "-onethread", label: "Single-threaded", group: "Performance", description: "Runs the server on a single thread. A hosting guide says it is useful when one machine hosts several servers." }),
		A({ flag: "-MaxPlayers", label: "Max players", group: "Server", example: "16", description: "The most players that can be on at once. The wiki's example uses 64. The panel sets the limit in Game.ini (Max players on the Settings tab) instead; it is not documented which of the two wins, so set it in one place only." }),
	],
};

const guide = {
	name: "VEIN",
	short: "VEIN",
	summary:
		"VEIN keeps its settings in two files in the server's install folder, under `Vein\\Saved\\Config\\WindowsServer`. `Game.ini` holds the name, join password, player limit, admins and whitelist. `Engine.ini` holds the rules of the world (PvP, zombies, loot, time) as console variables under `[ConsoleVariables]`. The game's ports are arguments on the start script's launch line (**Launch options**).",
	files: {
		"Game.ini": "The server's name and description, join password, player limit, admins (by Steam ID), the whitelist, the Steam VAC switch and the Discord chat links.",
		"Engine.ini": "The rules of the world as `vein.*` console variables: PvP, zombies and hordes, time speed, loot, how long water and power last, and autosave.",
	},
	notes: [
		"There is no admin password. A player becomes an admin only when their 17-digit Steam ID (SteamID64) is in `AdminSteamIDs` or `SuperAdminSteamIDs`. The panel writes no admin line, so add your own on the Settings tab, or in the file with 'Edit as text'. Every entry after the first needs a leading plus sign (`+AdminSteamIDs=`), or it replaces the one before it.",
		"Stop the server before editing the files and restart it afterwards: VEIN does not apply file changes while it runs. The game removes lines that only repeat a default value, so a line you set to the default may vanish; nothing is broken.",
		"The panel writes `Engine.ini` with only its `[ConsoleVariables]` header. To change a rule, add its line under that header with 'Edit as text', for example `vein.PvP=0`. The Settings tab explains the rules it knows, but the community lists of them are incomplete and out of date in places. Use 1 and 0 for on and off.",
		"Stopping the server asks its console window to close. No source documents a safe shutdown, a stop command or a remote console (the old RCON port was removed in 0.019 Hotfix 2). It is not known whether the world is saved on the way out, so use the in-game admin menu's save button (Server section) before you stop it.",
		"Forward the two UDP ports (game and query). If a Windows server does not show up in the server browser and its log says the Steam dedicated server API failed to start, Ramjet suggests running it with administrator rights. Players can also connect directly with the address and game port.",
		"VEIN has no Steam Workshop and no official server mod support, and the panel adds nothing for mods. The server needs at least 8 GB of RAM to start, and more as players join.",
	],
};

export default {
	type: "vein",
	title: "VEIN",
	files: {
		"Game.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: {
				[GAME_SESSION]: "Session limits",
				[VEIN_SESSION]: "Server and admins",
				[VEIN_STATE]: "Whitelist",
				[VEIN_SERVER]: "Discord and display",
				[STEAM]: "Steam",
			},
			settings: gameSettings,
			groupOrder: gameOrder,
			mayBeMissing: "The panel writes this file when it makes the server. If it is missing, create Game.ini in the server's Vein\\Saved\\Config\\WindowsServer folder (create the folders too), starting with the line [/Script/Vein.VeinGameSession], then reload this page.",
		},
		"Engine.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: { [CVARS]: "World rules (console variables)" },
			settings: inSection(CVARS, cvarRows),
			groupOrder: cvarOrder,
			mayBeMissing: "The panel writes this file when it makes the server, with just a [ConsoleVariables] header. If it is missing, create Engine.ini in the server's Vein\\Saved\\Config\\WindowsServer folder starting with the line [ConsoleVariables], then reload this page.",
		},
	},
	launch,
	guide,
};

import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Insurgency: Sandstorm. Two places hold the server's settings:
//   Game.ini      Insurgency\Saved\Config\WindowsServer\ in the server's folder. The panel creates it as a comment only; the settings
//                 below are added here, each under the [section] header the dossier names. The game's own defaults apply to the rest.
//   launch line   the start command: the map and scenario, the player limit, the ports, the server name and the login token. The
//                 panel writes these when the server is created; the form below shows the extra dash options.
// Names, defaults and descriptions come from the research dossier (docs/research/games/insurgencysandstorm): the mod.io Server Admin
// Guide (the page the defaults come from), Nodecraft's config page and the Pterodactyl egg. Only the settings the dossier gives a
// default for are offered. Types and allowed values are NOT FOUND in the sources, so the on-off settings are offered as True and False,
// the way the guide's examples write them. The game is not yet checked on a real install.

export const GENERAL_SECTION = "/Script/Insurgency.INSGameMode";
export const MULTIPLAYER_SECTION = "/Script/Insurgency.INSMultiplayerMode";

const generalRows = rows([
	["bKillFeed", "Kill feed", "Shows who killed whom in a kill feed on screen. The game's default is off (False).", "Kill feed"],
	["bKillerInfo", "Killer shown to the victim", "When a player dies, tells the victim who killed them and with what. The game's default is on (True).", "Kill feed"],
	["TeamKillLimit", "Team kills before a kick", "How many team kills one player can make before the server kicks them. The game's default is 3.", "Teams"],
]);

const multiplayerRows = rows([
	["bAllowFriendlyFire", "Friendly fire", "Lets players damage their own team. The game's default is on (True).", "Teams"],
	["FriendlyFireModifier", "Friendly fire damage", "How much damage a friendly hit does, as a fraction of normal damage (0.2 means a fifth). The game's default is 0.2.", "Teams"],
	["bAutoBalanceTeams", "Balance teams automatically", "Moves players between the two teams when one side has many more players. The game's default is on (True).", "Teams"],
	["bAllowPlayerTeamSelect", "Players may switch teams", "Lets a player switch to the other team. The game's default is on (True).", "Teams"],
	["bMapVoting", "Map voting after a game", "Lets players vote for the next map at the end of each game. The game's default is on (True).", "Rounds and maps"],
	["bUseMapCycle", "Use the map cycle", "Keeps moving through the server's map cycle. If it is off, the current map repeats forever. The game's default is on (True).", "Rounds and maps"],
	["PreRoundTime", "Freeze time at round start (seconds)", "How long players are frozen at the start of each round, in seconds. The game's default is 10.", "Rounds and maps"],
	["PostRoundTime", "Intermission after a round (seconds)", "How long the screen between rounds stays up, in seconds. The game's default is 15.", "Rounds and maps"],
	["IdleLimit", "Idle kick time (seconds)", "How long a player can stand still before the server kicks them, in seconds. The game's default is 150.", "Players"],
	["MinimumPlayers", "Players needed per team to start", "The fewest players each team needs before a game starts. The game's default is 1.", "Players"],
	["bBots", "AI bots", "Turns on AI bots to fill the teams. The game's default is off (False).", "Players"],
]);

const settings = {};
for (const [key, meta] of Object.entries(generalRows)) settings[`${GENERAL_SECTION}::${key}`] = meta;
for (const [key, meta] of Object.entries(multiplayerRows)) settings[`${MULTIPLAYER_SECTION}::${key}`] = meta;

const ON_OFF = [
	["True", "Yes (True)"],
	["False", "No (False)"],
];
withChoices(settings, {
	[`${GENERAL_SECTION}::bKillFeed`]: ON_OFF,
	[`${GENERAL_SECTION}::bKillerInfo`]: ON_OFF,
	[`${MULTIPLAYER_SECTION}::bAllowFriendlyFire`]: ON_OFF,
	[`${MULTIPLAYER_SECTION}::bAutoBalanceTeams`]: ON_OFF,
	[`${MULTIPLAYER_SECTION}::bAllowPlayerTeamSelect`]: ON_OFF,
	[`${MULTIPLAYER_SECTION}::bMapVoting`]: ON_OFF,
	[`${MULTIPLAYER_SECTION}::bUseMapCycle`]: ON_OFF,
	[`${MULTIPLAYER_SECTION}::bBots`]: ON_OFF,
});

const groupOrder = ["Kill feed", "Teams", "Rounds and maps", "Players"];

// The launch line: the program, then the map address, then `-Name=value` arguments (the egg writes them this way). The panel writes
// the ports, the name and the token; the form only shows them so they are not mistaken for something to add.
const launch = {
	title: "Insurgency: Sandstorm",
	program: /\bInsurgencyServer(?:\.exe)?\b/i,
	style: "equals",
	editable: true,
	where: "the `InsurgencyServer.exe` line of the server's start script",
	intro:
		"The extra arguments that start Insurgency: Sandstorm's server. The map, the scenario and the player limit sit on the map address before the arguments, and the form does not change them: to change them, edit the start script by hand. The panel writes the ports, the server name and the login token when the server is created.",
	args: [
		FLAG({
			flag: "-log",
			label: "Log window",
			group: "Logging",
			description: "Opens the server's log window, which shows what the server prints. The guide describes it as enabling the log window; the panel starts the server with it on.",
		}),
		A({
			flag: "-ruleset",
			label: "Rule set",
			group: "Browser",
			example: "OfficialRules",
			description: "Set to OfficialRules to list the server under the browser's official-rules filter, which the mod.io guide gives as the way to opt in. Leave it out for a custom server.",
		}),
		A({
			flag: "-mutators",
			label: "Mutators (game variants)",
			group: "Game",
			example: "HeadshotOnly",
			description: "Turns on game variants such as HeadshotOnly or HotPotato. List several with commas and no spaces. Each variant's own settings are in Game.ini, which this form does not show.",
		}),
		A({
			flag: "-Port",
			label: "Game port",
			group: "Network",
			edit: false,
			managed: true,
			example: "25940",
			description: "The UDP port players connect to. Written by the panel when the server is created. Change it by editing the start script by hand.",
		}),
		A({
			flag: "-QueryPort",
			label: "Query port",
			group: "Network",
			edit: false,
			managed: true,
			example: "25942",
			description: "The port the server browser asks for the server's details (UDP and TCP). Written by the panel when the server is created; change it by editing the start script by hand.",
		}),
		A({
			flag: "-hostname",
			label: "Server name",
			group: "Server",
			edit: false,
			managed: true,
			description: "The name shown in the server browser. Written by the panel from the Server Name field when the server is created.",
		}),
		A({
			flag: "-GSLTToken",
			label: "Steam login token",
			group: "Access",
			edit: false,
			managed: true,
			description: "The Steam game-server login token, written from the form when the server is created. It is made for app 581320 at steamcommunity.com/dev/managegameservers.",
		}),
	],
};

const guide = {
	name: "Insurgency: Sandstorm",
	short: "Insurgency: Sandstorm",
	summary:
		"Insurgency: Sandstorm keeps most of its server settings in `Insurgency\\Saved\\Config\\WindowsServer\\Game.ini`, which this Settings tab edits. The map, the scenario and the player limit are on the start command, which the Launch options form shows in part. The admin list is `Insurgency\\Config\\Server\\Admins.txt`, which the panel creates empty.",
	files: {
		"Game.ini": "The game's settings, under the section headers the game reads. The Settings tab adds the ones listed here; the game keeps its own defaults for the rest.",
		"Admins.txt": "The admins, one 64-bit Steam ID per line. The panel creates it empty; edit it by hand with the server stopped.",
	},
	notes: [
		"**The panel cannot stop the server cleanly.** The game stops with ^C in its own console window. The panel has no way to type into a console, so Stop closes the window and ends the process after 15 seconds. Before you press Stop (or update), open the server's window, which the panel keeps minimized on the taskbar, press Ctrl+C, and wait for it to close.",
		"**The map and scenario are fixed.** The start command uses the mod.io guide's example, `Oilfield?Scenario=Scenario_Refinery_Push_Security`, and the player limit is 28. Change them by editing the start script by hand. A typo in the map or scenario name makes the game fall back to Farmhouse, per the guide.",
		"**The join password is on the start command.** It is written after the map as `?Password=`, the form the mod.io guide shows. Changing it means editing the start script, or recreating the server.",
		"**Ports.** The game port (25940) is UDP. The query port (25942) is UDP and TCP, per the mod.io guide. The dossier's usual 27102 and 27131 are not used.",
		"**RCON is not set up, and the admin list is not in the form.** The RCON protocol and a stop command are not confirmed by the sources, so the panel does not use RCON. Edit Admins.txt by hand, with the server stopped.",
		"**Mods are not supported.** Mods come from mod.io and need a login that changed in update 1.20; the panel has no way to do that step.",
		"**Not confirmed on a real install.** Whether the server program is `InsurgencyServer.exe` in the install folder, and whether it is the process that stays running, are not confirmed by the sources. The Settings tab's keys and defaults come from the guide, not from the game's own files.",
	],
};

export default {
	type: "insurgencysandstorm",
	title: "Insurgency: Sandstorm",
	files: {
		"Game.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: {
				[GENERAL_SECTION]: "General (all modes)",
				[MULTIPLAYER_SECTION]: "Multiplayer modes",
			},
			settings,
			groupOrder,
		},
	},
	launch,
	guide,
};

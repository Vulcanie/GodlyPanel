import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Sven Co-op (SvenDS). Its settings are console variables written one per line in server.cfg, which the panel's convar reader handles
// (the same shape as Rust's and Garry's Mod's config files). The panel writes the server's name and password into the file when it
// creates the server; the game is documented to ship only server_example.cfg, so the file is the panel's and the user's.
// Source of every name, default and description: the research dossier (research/svencoop/02-config.md), whose sources are the Sven Co-op
// wiki's "Running a server / Configuration" page and the official manual (server-basic, server-config). Each setting here is one the wiki lists
// with a meaning; the file syntax and the value types are not documented, so only the values the wiki spells out are offered as a fixed list.
//
// Not in the form, on purpose:
//   - the settings the wiki marks "currently obsolete in Sven Co-op" (allow_spectators, sv_alltalk, sv_spectalk, sv_spectator_password, mp_fraglimit);
//   - `deathmatch`, which the wiki says must stay 1 ("do not change this, and do not use the coop setting"), and `log`, which the launch line's
//     `+log on` already does;
//   - the settings that only name another file (servercfgfile, mapcyclefile, motdfile, adminsfile, bannedcfgfile, listipcfgfile, skillcfgfile,
//     mapvotecfgfile, mapchangecfgfile, plugin_list_file, logsdir): the panel's Settings tab and backup expect those files at their default names;
//   - sv_voicequality (its five levels are named but not numbered), sv_zmax (the wiki's explanation is cut off).

const BOOL = [
	["0", "Off"],
	["1", "On"],
];
// The wiki gives these settings a default of 0 or 1 and no list of allowed values, so a typed value is still accepted.
const ONOFF = { choices: BOOL, allowCustom: true };

export const svencoopServerSettings = withChoices(
	rows([
		// Server
		["hostname", "Server name", "The name shown in the server browser. The panel writes it when it creates the server, as the first line of the file, which the wiki asks for so the server does not appear under its default name (Sven Co-op v5.0 server). About 40 characters is the most the wiki suggests.", "Server"],
		["sv_password", "Join password", "What players type to join. Leave it empty for a public server.", "Server"],
		["sv_contact", "Contact email", "The email address of whoever runs the server, so players have someone to contact when there is a problem. Empty by default.", "Server"],
		["sv_region", "Server region", "The region your server is in. It is used in Steam's server browser, so players can look for servers near them. The game starts at 255, International.", "Server"],
		["sv_lan", "Local network only", "On makes a server for a local area network only: players sign in with their IP address and can only join from the same subnet as the server. Keep it off for a server friends join over the internet. Starts off.", "Server"],
		["sv_proxies", "Allow spectator proxies (HLTV)", "On lets spectator proxies (HLTV) connect to your server. Starts off.", "Server"],

		// Remote console and cheats
		["rcon_password", "Remote console password", "The password for the server's remote console (RCON, over TCP on the game port). While it is empty, remote access is not available. The panel does not use the remote console for this server.", "Remote console and cheats"],
		["sv_cheats", "Cheat commands", "Who may use cheat commands: nobody, everyone, or administrators only. The wiki says that on an internet server the player slots must be 3 or fewer for ordinary players to use cheats. Starts at nobody.", "Remote console and cheats"],

		// Rules
		["skill", "Difficulty", "The default skill level of your server. Maps can override it in their own configuration. The game starts at Realistic.", "Rules"],
		["mp_classic_mode", "Classic Mode", "Allow or refuse Classic Mode on maps that support it. -1 lets the players vote. Starts at -1.", "Rules"],
		["mp_npckill", "Killing allied NPCs", "What happens when someone kills an allied NPC. 0 disallows it, 1 allows it, and 2 allows it only for killers that are not players, not allied and not passive humans. Starts at 1. This replaces the old killnpc setting.", "Rules"],
		["mp_falldamage", "Realistic fall damage", "On uses realistic fall damage. Off means a player hurt by falling always loses 10 health points. Starts on.", "Rules"],
		["mp_flashlight", "Flashlight", "Whether players can use their flashlight. Starts on.", "Rules"],
		["mp_footsteps", "Footstep sounds", "Players make footstep sounds while running fast enough. Starts on.", "Rules"],
		["mp_telefrag", "Telefragging", "On means a player who is teleported inside someone kills them. Starts on.", "Rules"],
		["mp_dropweapons", "Players can drop weapons", "Lets players drop weapons and ammo. Miniguns and shock rifles can always be dropped. Starts on.", "Rules"],
		["mp_weaponstay", "Weapons stay", "On lets weapons be picked up several times, except miniguns. Starts on.", "Rules"],
		["mp_no_akimbo_uzis", "No akimbo uzis", "On denies players akimbo uzis. Starts off.", "Rules"],
		["mp_modelselection", "Players can change model", "Off stops players changing their model. Starts on.", "Rules"],
		["mp_multiplespawn", "More than one spawn point", "Lets players use more than one spawn point. Starts on.", "Rules"],
		["mp_forcerespawn", "Force respawn", "Forces players to respawn after they die. The wiki recommends leaving it off, so players respawn when they are ready. Starts off.", "Rules"],
		["mp_respawndelay", "Respawn delay (seconds)", "How many seconds a player must wait before respawning. Starts at 6.", "Rules"],
		["mp_allowmonsterinfo", "Show monster information", "Lets players see information about the monsters they look at. Starts on.", "Rules"],
		["mp_banana", "Banana bombs", "Lets players throw banana bombs. Starts on.", "Rules"],
		["mp_grapple_mode", "Grapple pulls the player", "On pulls a grappled player towards monsters bigger than headcrabs, rather than pulling the monster to the player. Starts on.", "Rules"],
		["mp_noblastgibs", "No blast gibs", "On stops monsters being gibbed (ripped apart) when killed with explosives. Starts off.", "Rules"],
		["mp_disable_autoclimb", "No auto-climb", "On denies players the auto-climb feature. Starts off.", "Rules"],
		["mp_disable_pcbalancing", "No skill auto-balancing", "On disables skill auto-balancing. Starts off.", "Rules"],
		["mp_disable_player_rappel", "No Barnacle grapple on players", "On denies players the use of the Barnacle grapple on each other. Starts off.", "Rules"],
		["mp_disablegaussjump", "No gauss jump", "On disables the vertical knock back caused by the gauss cannon's charge-up shot. Starts off.", "Rules"],
		["pausable", "Anyone can pause", "Whether anyone on the server can pause the game. The wiki never recommends it on a public server. Starts off.", "Rules"],

		// Map time
		["mp_timelimit", "Map time limit (minutes)", "The map changes after this many minutes if it has not been completed already. 0 means no limit. Starts at 60.", "Map time"],
		["mp_timelimit_empty", "Time limit when empty (minutes)", "The map changes after this many minutes when the server is empty, whatever the map's own time limit says. 0 turns this off. Starts at 10.", "Map time"],
		["mp_notimelimit", "Ignore the map's time limit", "On disables a map's time limit (mp_timelimit). Starts off.", "Map time"],

		// Voting
		["mp_voteallow", "Players can vote", "Allows players to use the built-in voting system. The wiki suggests turning it off if you run plug-in packs such as AdminMod or AMX Mod X. Starts on.", "Voting"],
		["mp_votekickrequired", "Votes needed to kick (%)", "The percentage of players that must say yes for a kick vote to succeed. -1 disables it. Starts at 66.", "Voting"],
		["mp_votebanrequired", "Votes needed to ban (%)", "The percentage of players that must say yes for a ban vote to succeed. -1 disables it, which is where it starts.", "Voting"],
		["mp_votekillrequired", "Votes needed to kill (%)", "The percentage of players that must say yes for a kill (slay) vote to succeed. -1 disables it. Starts at 51.", "Voting"],
		["mp_votemaprequired", "Votes needed to change map (%)", "The percentage of players that must say yes for a map vote to succeed. -1 disables it. Starts at 66.", "Voting"],
		["mp_voteclassicmoderequired", "Votes needed for Classic Mode (%)", "The percentage of players that must say yes for a Classic Mode vote to succeed. -1 disables it. Starts at 51.", "Voting"],
		["mp_playervotedelay", "Wait before another poll (seconds)", "How many seconds a player must wait before starting another poll. Starts at 300.", "Voting"],
		["mp_votetimebetween", "Wait between polls (seconds)", "How many seconds must pass before a player other than the previous poll starter can start a new poll. Starts at 60.", "Voting"],
		["mp_votetimecheck", "Time to vote (seconds)", "How many seconds players have to cast their vote. Starts at 20.", "Voting"],
		["mp_votekill_respawndelay", "Respawn delay after a vote kill (seconds)", "How many seconds a player must wait before respawning after being killed by a vote. Starts at 15.", "Voting"],

		// Voice
		["sv_voiceenable", "Voice chat", "Lets players use voice communication. Starts on.", "Voice"],
		["sv_voicecodec", "Voice codec", "The voice codec to use. Only voice_miles and voice_speex are available. Starts at voice_speex. (Only the game's manual lists this one.)", "Voice"],

		// Network and performance
		["sys_ticrate", "Server frame rate", "The most frames per second the server processes. The wiki warns that rates over 200 have a negative effect on physics and NPC movement. The sources disagree on the starting value (100 on the wiki and the manual's configuration page, 128 on the manual's basic page), so check yours.", "Network and performance"],
		["sv_timeout", "Idle disconnect time (seconds)", "How many seconds a player can stop responding before the server counts them as having lost their connection. Starts at 60.", "Network and performance"],
		["sv_maxrate", "Max data per player (bytes/second)", "The most data per second clients can talk to the server at in internet mode. Starts at 20000.", "Network and performance"],
		["sv_minrate", "Min data per player (bytes/second)", "The least data per second clients can talk to the server at in internet mode. Starts at 0.", "Network and performance"],
		["sv_maxupdaterate", "Max updates per second", "The most events per second the server can send to a client. The wiki says 50 is enough for 16 players. Starts at 50.", "Network and performance"],
		["sv_minupdaterate", "Min updates per second", "The fewest events per second the server sends to a client. The wiki asks you not to change it, so players on slow connections can still join. Starts at 10.", "Network and performance"],
		["sv_lan_rate", "Local network data rate (bytes/second)", "The rate clients are forced to talk to the server at in local network mode. Starts at 100000.", "Network and performance"],

		// Downloads and sprays
		["sv_allowdownload", "Players download from the server", "Lets players download custom content from your server. Starts on.", "Downloads and sprays"],
		["sv_downloadurl", "Fast download web address", "The HTTP address where your server's custom content can be found, so players can download it very fast. The wiki says HTTPS is not supported. Empty by default.", "Downloads and sprays"],
		["sv_filetransfercompression", "Compress downloads", "Lets custom content be compressed on the fly for faster delivery. Starts on.", "Downloads and sprays"],
		["sv_allowupload", "Players upload sprays", "Lets players send custom sprays to your server. Starts on.", "Downloads and sprays"],
		["decalfrequency", "Spray delay (seconds)", "How many seconds a player must wait before making their spray again. 0 removes the delay, which is not recommended. Starts at 30.", "Downloads and sprays"],
		["hpk_maxsize", "Spray file size limit (MB)", "The size limit, in megabytes, of the file that stores uploaded sprays. Starts at 2.", "Downloads and sprays"],
		["mp_decals", "Most decals", "The most decals the server will render. Starts at 2048.", "Downloads and sprays"],
	]),
	{
		sv_region: {
			choices: [
				["-1", "Do not list"],
				["0", "USA, east coast"],
				["1", "USA, west coast"],
				["2", "South America"],
				["3", "Europe"],
				["4", "Asia"],
				["5", "Australia (Oceania)"],
				["6", "Middle East"],
				["7", "Africa"],
				["255", "International"],
			],
		},
		sv_cheats: [
			["0", "Nobody"],
			["1", "Everyone"],
			["2", "Administrators only"],
		],
		skill: [
			["0", "The map chooses"],
			["1", "Easy"],
			["2", "Hard"],
			["3", "Realistic"],
		],
		mp_classic_mode: [
			["-1", "Players vote"],
			["0", "Disabled"],
			["1", "Enabled"],
		],
		mp_npckill: [
			["0", "Not allowed"],
			["1", "Allowed"],
			["2", "Only non-player, non-allied, non-human-passive killers"],
		],
		sv_voicecodec: [
			["voice_speex", "Speex"],
			["voice_miles", "Miles"],
		],
		sv_lan: ONOFF,
		sv_proxies: ONOFF,
		mp_falldamage: ONOFF,
		mp_flashlight: ONOFF,
		mp_footsteps: ONOFF,
		mp_telefrag: ONOFF,
		mp_dropweapons: ONOFF,
		mp_weaponstay: ONOFF,
		mp_no_akimbo_uzis: ONOFF,
		mp_modelselection: ONOFF,
		mp_multiplespawn: ONOFF,
		mp_forcerespawn: ONOFF,
		mp_allowmonsterinfo: ONOFF,
		mp_banana: ONOFF,
		mp_grapple_mode: ONOFF,
		mp_noblastgibs: ONOFF,
		mp_disable_autoclimb: ONOFF,
		mp_disable_pcbalancing: ONOFF,
		mp_disable_player_rappel: ONOFF,
		mp_disablegaussjump: ONOFF,
		pausable: ONOFF,
		mp_notimelimit: ONOFF,
		mp_voteallow: ONOFF,
		sv_voiceenable: ONOFF,
		sv_allowdownload: ONOFF,
		sv_filetransfercompression: ONOFF,
		sv_allowupload: ONOFF,
	},
);

export const svencoopServerGroupOrder = [
	"Server",
	"Remote console and cheats",
	"Rules",
	"Map time",
	"Voting",
	"Voice",
	"Network and performance",
	"Downloads and sprays",
];

const launch = {
	title: "Sven Co-op",
	// The manual and the wiki write SvenDS.exe, the manual's advanced page svends.exe; Windows file names do not care about case.
	program: /\bsvends(?:\.exe)?\b/i,
	// `+word value` is a console command run at start-up (the map, the player limit), `-word value` is a launch option the program reads itself.
	style: "plus",
	editable: true,
	where: "the `SvenDS.exe` line of the server's start script",
	intro: "Sven Co-op is started with `+word value` commands (the map, the player limit, the config file) and `-word` options (the port, the console). \"Arguments start with a hyphen and parameters start with a plus sign\", as the manual puts it. They are read when the server starts, so changes apply the next time it starts. None of them has to be last on the line.",
	args: [
		FLAG({ flag: "-console", label: "Console window", edit: false, managed: true, group: "Required", description: "Runs the server in console mode: a text window you can type commands into. Required, or the server starts in graphical mode. The panel always writes it." }),
		A({ flag: "-port", style: "space", label: "Game port", group: "Network", managed: true, example: "27355", description: "The port the server listens on and tells players to connect to (UDP). The manual also lists TCP on the same number for the remote console. Change it from the server's Ports section so the panel can check for clashes." }),
		A({ flag: "+ip", label: "Listen address", group: "Network", example: "0.0.0.0", description: "The network address the server listens on. Only needed if the computer has more than one IP address (virtual network cards such as VirtualBox, VMware and Hyper-V count) and you must choose which one to listen on." }),
		A({ flag: "-sport", style: "space", label: "Anti-cheat port", group: "Network", example: "26900", description: "The port for Valve Anti-Cheat (VAC) traffic. It starts at 26900 and, per the manual, moves up to the next free port if that one is taken, so it rarely needs setting." }),
		A({ flag: "+maxplayers", label: "Max players", group: "Server", managed: true, example: "12", description: "The most players on the server at one time, from 2 to 32. It is 12 if you do not give a number. The manual says most maps become overcrowded with more than 12 players." }),
		A({ flag: "+map", label: "Start map", group: "World", managed: true, example: "stadium4", description: "The map the server starts on: the map file's name without .bsp. Required: without it the server stays in a state nobody can connect to. A name that starts with a hyphen has to be put in quotes." }),
		A({ flag: "+servercfgfile", label: "Config file", edit: false, managed: true, group: "Required", example: "server.cfg", description: "The server's settings file, which the Settings tab edits. The wiki says it has to be named on the launch line to be used when the server starts. The panel always writes it." }),
		A({ flag: "+log", label: "Server log", group: "Saves and logs", managed: true, example: "on", options: ["on"], allowCustom: true, description: "Starts a log file for the server console. The manual recommends it. Only on is documented." }),
		A({ flag: "+logsdir", label: "Log folder", group: "Saves and logs", example: "logs", description: "The folder the server's logs are kept in. It starts as logs. Only useful with several servers sharing one install; the Logs tab looks in the svencoop\\logs folder." }),
		A({ flag: "-game", style: "space", label: "Game folder", group: "Advanced", example: "svencoop", description: "Only needed if you run a mod on Sven Co-op's engine; otherwise leave it out. How a mod is installed for the server is not described anywhere the research could find." }),
	],
};

const guide = {
	name: "Sven Co-op",
	short: "Sven Co-op",
	summary:
		"Sven Co-op is set up with console variables: lines of a name and a value in `server.cfg`, in the `svencoop` folder of the server. The panel writes the server's name and password in it when it creates the server, and you change the rest on the Settings tab. The map, the player limit and the port are on the launch line.",
	files: {
		"server.cfg": "Every server setting: name and password, rules, map time, voting, voice, network and downloads. Only the lines you set are in the file; a setting that is not there keeps the game's own value.",
	},
	notes: [
		"The game reads this file when a map starts (its manual says changes you save while the server runs take effect on the next map), so stop and start the server, or wait for the next map, after changing a setting.",
		"The wiki asks for `hostname` to be the first line of the file, so the server does not show up under its default name. The panel writes it there; keep it there if you edit the file by hand.",
		"Stopping: the only way the manual describes to stop the server is closing its window. The research found no console command to quit, so the panel's Stop closes the server's window and, after 15 seconds, ends the program. Do not run an update while a server is running; the update fails.",
		"The remote console (RCON) is on the game port over TCP, with the password set by `rcon_password`. The panel does not use it for this server.",
		"Custom maps are not a panel feature. Extract a map's archive into the `svencoop_addons` folder (its `maps`, `models`, `sound`, `sprites` and WAD files), never into the `svencoop` folder; the manual says a `scripts` folder in an archive should hold only a `maps` folder, and that anything else is suspicious. Players download custom content from the server when `sv_allowdownload` is on; for speed, point `sv_downloadurl` at a web server that holds it.",
		"AngelScript plugins are listed in `default_plugins.txt`, and the admin list is `admins.txt` (one Steam ID per line). Their formats, the map cycle, the map vote list, the skill file and the plugin packs Metamod and AMX Mod X are not in the form; the research did not find their syntax.",
		"Settings the wiki marks as obsolete in Sven Co-op (allow_spectators, sv_alltalk, sv_spectalk, sv_spectator_password, mp_fraglimit) are not in the form. Leave `deathmatch` at 1 and do not use `coop`; the wiki says the game depends on it.",
		"A setting the file has that the panel does not explain is still shown.",
	],
};

export default {
	type: "svencoop",
	title: "Sven Co-op",
	files: {
		"server.cfg": {
			parser: "convar",
			excludeSections: [],
			sectionLabels: { root: "Server" },
			settings: svencoopServerSettings,
			groupOrder: svencoopServerGroupOrder,
			mayBeMissing: "The panel writes server.cfg in the svencoop folder when it creates the server. If it is missing, create it there: each line is a setting name and its value, such as hostname \"My Server\", and the hostname line comes first.",
		},
	},
	launch,
	guide,
};

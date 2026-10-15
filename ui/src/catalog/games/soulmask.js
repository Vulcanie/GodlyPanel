import { A, FLAG } from "../launchHelpers.js";

// Soulmask: the server is set up by the arguments on its launch line, so the Settings tab has no settings file for it, only the
// "Launch options" form (the same as Core Keeper and Satisfactory).
//
// Why no form for WS\Saved\GameplaySettings\GameXishu.json (the game's rates and rules, JSON, made by the game on its first start and
// holding every setting three times under "0", "1" and "2", of which a dedicated server reads "1"): none of the sources in the research
// says what its settings do (the names are Chinese pinyin or short English, and the one copy found is a Docker image's default file).
// An unexplained setting is better left out than guessed, so it is not offered. It is part of the backups.
//
// Sources for the arguments: the dedicated-server guide on saraserenity.net (its parameter table, permissions, cluster and remote
// console pages) and the wiki https://soulmask.fandom.com/wiki/Private_Server ("Common Startup Parameters"). Values the sources
// disagree on or do not explain are left out: -forcepassword and -mapcycle appear in no source; -online=Steam and -SILENT are in
// Docker examples with no description; -gamedistindex is obsolete; the ?CustomGameMode and ?ND level suffixes are ignored or broken.

const launch = {
	title: "Soulmask",
	program: /\bWSServer-Win64-Shipping(?:\.exe)?"?/i,
	style: "equals",
	editable: true,
	where: "the `WSServer-Win64-Shipping.exe` line of the server's start script",
	intro: "Soulmask is set up by the arguments on the command that starts it: the name, the passwords, the player limit, the ports, PvE or PvP and how often the world is written to disk. The map's name comes first on the line (`Level01_Main` is the base game) and is not changed here. Changes apply the next time the server starts.",
	args: [
		FLAG({ flag: "-server", label: "Server mode", edit: false, managed: true, group: "Required", description: "Starts the game as a dedicated server. The guides call it required." }),
		FLAG({ flag: "-forcepassthrough", label: "Engine switch (required)", edit: false, managed: true, group: "Required", description: "The guides say this must be on the line and give no reason. Leave it as it is." }),
		FLAG({ flag: "-log", label: "Show server window", edit: false, managed: true, group: "Required", description: "Keeps the server in a visible console window and writes the log to WS\\Saved\\Logs\\WS.log. Without it the server runs in the background with no window at all, which also leaves the panel nothing to close." }),
		FLAG({ flag: "-UTF8Output", label: "Readable non-English log text", edit: false, managed: true, group: "Required", description: "Keeps log lines with non-Latin characters, such as some players' names, readable. The guide says to keep it." }),

		A({ flag: "-SteamServerName", label: "Server name", group: "Server", managed: true, example: '"My Soulmask"', description: "The name shown in the server list." }),
		A({ flag: "-MaxPlayers", label: "Player slots", group: "Server", managed: true, example: "20", description: "The most players allowed at once. The wiki's sample uses 20. Some guides say about 70 is the most, but that is not confirmed, and the guide warns that too many players hurts performance." }),
		A({ flag: "-PSW", label: "Join password", group: "Server", managed: true, example: '"friends"', description: "What players type to join. Take the argument off the line for a server anyone can join." }),
		A({ flag: "-adminpsw", label: "Admin password", group: "Server", managed: true, example: '"gmpass"', description: "The password for admin powers in the game: press the ~ key, type gm key followed by the password, and the admin panel opens. Anyone who has it has full admin, so keep it private and never leave it empty." }),
		FLAG({ flag: "-pve", label: "PvE mode (peaceful)", group: "Server", managed: true, description: "Runs the server by PvE rules. The guide says it also changes some of the game's settings, without listing which. Use this or -pvp, not both." }),
		FLAG({ flag: "-pvp", label: "PvP mode (players fight)", group: "Server", description: "Runs the server by PvP rules. The guide says it also changes some of the game's settings, without listing which. To use it, turn off -pve first: use one or the other." }),
		A({ flag: "-serverpm", label: "Ban and allow lists", group: "Server", managed: true, example: "2", description: "Which lists are switched on, as a number made by adding up: 1 only the accounts on the allow list may join, 2 accounts on the ban list are refused, 4 only the IP addresses on the allow list may join, 8 IP addresses on the ban list are refused, 16 the mute list. Without this argument every list is off after each restart, so bans do not last. 2 is the usual choice." }),
		A({ flag: "-GongHuiMaxMember", label: "Tribe size limit", group: "Server", example: "10", description: "The most players in one tribe. When it is on the line it replaces the tribe size set in the game's own settings at the next start." }),
		A({ flag: "-mod", label: "Workshop mods", group: "Server", managed: true, example: '"3331511657,3325592770"', description: "Steam Workshop mod ids, separated by commas with no spaces, in this order: put a mod other mods need before them. The server downloads them when it starts, and every player must have the same mods. A broken mod can stop the server from starting; take it off the list to recover. Keep the list inside quotation marks." }),

		A({ flag: "-PORT", label: "Game port", group: "Network", managed: true, example: "8777", description: "The UDP port players connect to. Change it from the server's Ports section so the panel can check for clashes and open the firewall. Two servers on one PC need different ports." }),
		A({ flag: "-QueryPort", label: "Query port", group: "Network", managed: true, example: "27015", description: "The UDP port the server list asks for the server's details on. Change it from the server's Ports section. Two servers on one PC need different query ports." }),
		A({ flag: "-EchoPort", label: "Console port", group: "Network", managed: true, example: "18888", description: "The TCP port of the server's local text console, which only this PC can reach. Do not open it in the firewall or the router. It is not in the panel's Ports section, so change it here, and give each server on this PC its own." }),
		A({ flag: "-MULTIHOME", label: "Listen address", group: "Network", example: "0.0.0.0", description: "Makes the server use one specific IP address of this PC. Only useful on a PC with several network cards; leave it off to use them all." }),
		A({ flag: "-rconpsw", label: "Remote console password", group: "Network", example: '"rconpass"', description: "Turns on the game's remote console (RCON) and sets its password. Without it RCON is off. The panel cannot use this RCON; it is for outside tools. It also needs -rconaddr or -MULTIHOME." }),
		A({ flag: "-rconaddr", label: "Remote console address", group: "Network", example: "127.0.0.1", description: "The IP address the remote console listens on. If it is not given the -MULTIHOME address is used, and if neither is given the remote console stays off." }),
		A({ flag: "-rconport", label: "Remote console port", group: "Network", example: "19000", description: "The TCP port the remote console listens on; 19000 when not given. Other PCs must also be listed under [Server.SafeIP] in WS\\Saved\\Config\\WindowsServer\\Engine.ini to connect. Do not open it to the internet without a strong password." }),

		A({ flag: "-saving", label: "World snapshot interval (seconds)", group: "Saves and backups", managed: true, example: "600", description: "How often the world is saved into the server's memory, ready to be written out. It is not on disk yet. The wiki's sample uses 600 (10 minutes); one guide says 300." }),
		A({ flag: "-backup", label: "Write to disk every (seconds)", group: "Saves and backups", managed: true, example: "900", description: "How often the world in memory is written to world.db on disk. This is what a Stop from the panel can lose: closing the window can roll the world back to the last write. The wiki's sample uses 900 (15 minutes); a smaller number loses less." }),
		FLAG({ flag: "-initbackup", label: "Back up the world at every start", group: "Saves and backups", description: "Makes a copy of world.db each time the server starts. The server never deletes these copies, so clear them out by hand now and then." }),
		A({ flag: "-backupinterval", label: "Extra backup copies (minutes)", group: "Saves and backups", example: "60", description: "Makes a backup copy of world.db on disk this often. The server never deletes the old copies, so clear them out by hand now and then to save disk space." }),

		A({ flag: "-coef", label: "Official settings template", edit: false, group: "Advanced", example: "PvE_10P_3x", description: "Loads a named settings template that matches an official server. The names are the GameXishu_Template_<name>.json files in WS\\Config\\GameplaySettings. The game then saves its settings to GameXishu_<name>.json instead of GameXishu.json. Add it by editing the start script." }),
		A({ flag: "-serverid", label: "Server number", edit: false, group: "Advanced", example: "1", description: "A whole number that identifies this server; each server in a cluster needs its own. Characters are tied to it: changing it after players have made characters makes them start over. Add it by editing the start script, and only before players join." }),
		A({ flag: "-mainserverport", label: "Cluster: main server port", edit: false, group: "Advanced", example: "20000", description: "Makes this the main server of a cluster of servers, listening on this TCP port. Never open that port to the internet. Adding or removing it on a server that already has players changes how their data is saved. Add it by editing the start script." }),
		A({ flag: "-clientserverconnect", label: "Cluster: join a main server", edit: false, group: "Advanced", example: "192.168.1.5:20000", description: "Makes this a member of the cluster whose main server is at this address and port. Adding or removing it on a server that already has players changes how their data is saved. Add it by editing the start script." }),
	],
};

const guide = {
	name: "Soulmask",
	short: "Soulmask",
	summary: "Soulmask is set up by the arguments on the command that starts it (the **Launch options**): the name, passwords, player limit, ports, PvE or PvP, the ban lists and how often the world is saved. The game keeps its saves in `WS\\Saved` inside the server's folder, and its log in `WS\\Saved\\Logs\\WS.log`.",
	files: {},
	notes: [
		"**Stopping can lose recent progress.** The game saves safely only when told to through its local text console: connect to `127.0.0.1` on the Console Port (18888 by default) with a Telnet client, type `saveworld 1`, then `quit 30`. The panel cannot send those commands. It closes the server's window and then ends the program, and the game's own guide warns that closing it directly may roll the world back to the last time it was written to disk. That is every `-backup` seconds (900, 15 minutes, as the panel starts it): lower it in the Launch options to lose less, or save by hand before stopping. Windows needs its optional Telnet client turned on for this.",
		"The world rules (experience, drop and growth rates, raids, difficulty) are in `WS\\Saved\\GameplaySettings\\GameXishu.json`, which the game makes on its first start. The panel does not offer a form for it, because nothing it could find explains what each setting does. The file holds every setting three times, in groups `0`, `1` and `2`; a dedicated server reads group `1`. Stop the server before editing it by hand. It is included in the panel's backups.",
		"The server is started as a PvE server (`-pve`). For PvP, turn off **PvE mode** and turn on **PvP mode** in the Launch options. Both change some of the game's settings.",
		"The server takes a few minutes to start (two to five) before it is listed. The first lines of `WS.log` should show `Game Server API initialized`; if Steam fails to start there, the three Steam DLLs the panel copied into `WS\\Binaries\\Win64` may be missing or out of date.",
		"The admin password is made for you when you leave it empty, so the server is never open to anyone typing the admin command; look in the Launch options for it. In the game, press the `~` key and type `gm key` followed by the password.",
		"Mods are Steam Workshop mods, listed by id when the server is created or in the Launch options (`-mod`). The server downloads them when it starts, which can make the first start slow, and every player needs the same mods subscribed and switched on. Mods made before the game's 1.0 release (10 April 2026) may no longer work and can stop the server from starting: take the newest-changed one off the list first. Back up the world before adding or removing mods.",
		"Each Soulmask server needs its own game, query and console ports. The console port is not in the panel's Ports section, so the panel does not check it for clashes: change it in the Launch options if you add a second server by hand.",
		"The game uses a lot of memory: at least 16 GB for one server is the wiki's figure, and the server's memory use is reported to grow over time, so a daily restart helps.",
	],
};

export default {
	type: "soulmask",
	title: "Soulmask",
	files: {},
	launch,
	guide,
};

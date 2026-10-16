import { A, FLAG } from "../launchHelpers.js";

// Squad (Offworld Industries). The server is started with arguments written KEY=value with NO leading dash (Port=7787, not -Port=7787),
// plus -log and -fullcrashdump, which do carry a dash. The panel's launch-line editor reads those in its "equals" form (the match is on
// "Port=" and so on, with or without a dash), so the Launch options form is offered.
//
// Why no settings files in the Settings tab (Server.cfg, Rcon.cfg, VoteConfig.cfg ...): they are Key=value files, but the panel's
// readers do not fit the real shape. The properties reader treats a `//` line as a setting whenever the comment has an `=` in it
// (Rcon.cfg's comments say "//   RCONIP=0.0.0.0" and Server.cfg has "// ForceNonSeamlessTravelIntervalSeconds=43200"), so it would show
// comment lines as settings; it also rewrites the file with bare line feeds, and Server.cfg keeps ServerName between double quotes,
// which it would show as part of the value. The convar reader splits at a space, not at "=". Admins.cfg and the rotation files are not
// Key=value at all. The panel therefore writes the name and player limit when it creates the server, and the guide below describes the
// files for editing by hand.
//
// Sources: the research dossier (research/squad/01..04): the official Squad wiki (Server Installation, Server Configuration, Server
// licensing, Uploading a mod to a dedicated server), the cm2network/squad Docker image and the hosting guides it names. PREFERPREPROCESSOR
// (the wiki marks it "UNTESTED" and gives no format) is left out; so is every Server.cfg key that only third-party pages mention.

const launch = {
	title: "Squad",
	program: /\bSquadGameServer(?:\.exe)?\b/i,
	// Every Squad argument but -log and -fullcrashdump is Name=value. A flag is written here as the game spells it, without a dash.
	style: "equals",
	editable: true,
	where: "the `SquadGameServer.exe` line of the server's start script",
	intro: "Squad is started with arguments written `Name=value` with no dash in front (`Port=7787`), plus `-log` and `-fullcrashdump`. The game's wiki writes them in this exact spelling, so keep it. The server's name and the other settings are in `SquadGame\\ServerConfig\\Server.cfg`, not here. Changes apply the next time the server starts.",
	args: [
		A({ flag: "Port", edit: false, managed: true, label: "Game port", group: "Network", example: "7787", description: "The port players connect to (UDP). The wiki's firewall list says the game uses the next port up too (7788), so keep both free. The panel writes it first on the line, on purpose: the other port arguments also end in \"port=\". To change it, edit the start script by hand and keep it first; the Ports section cannot rewrite this form of argument." }),
		A({ flag: "QueryPort", edit: false, managed: true, label: "Steam query port", group: "Network", example: "27165", description: "The port the Steam server list and query tools ask for the server's details on. The wiki's firewall list opens it and the next one up (27166) for both UDP and TCP. To change it, edit the start script by hand; the Ports section cannot rewrite this form of argument." }),
		A({ flag: "beaconport", edit: false, managed: true, label: "Beacon port", group: "Network", example: "15000", description: "Written in lower case, as the wiki spells it. Every server on the same PC must have its own beacon port; the wiki suggests spacing them 5 apart. It lists the port as open for UDP and TCP. The wiki does not explain what it is used for. To change it, edit the start script by hand." }),
		A({ flag: "MULTIHOME", label: "Bind IP address", group: "Network", example: "192.168.1.20", description: "Makes the server use one specific IP address of this PC. Only needed if the PC has several addresses; leave it off to use them all." }),
		A({ flag: "FIXEDMAXPLAYERS", managed: true, label: "Hard player limit", group: "Server", example: "80", description: "The most players that can be on the server, whatever else says. The panel also writes the same number as MaxPlayers in Server.cfg when it creates the server; the wiki does not say how the two interact, so keep them equal." }),
		A({
			flag: "RANDOM",
			label: "Shuffle the map rotation",
			group: "Server",
			example: "NONE",
			options: [
				["NONE", "Never shuffle"],
				["ALWAYS", "Always shuffle"],
				["FIRST", "FIRST (the wiki does not explain this choice)"],
			],
			description: "Whether the rotation of maps (layers) is shuffled. The panel starts the server with NONE, which every example in the wiki uses. Server.cfg also has its own settings for the rotation (MapRotationMode, RandomizeAtStart).",
		}),
		A({ flag: "FIXEDMAXTICKRATE", label: "Maximum tick rate", group: "Performance", example: "40", description: "The most server updates per second. A higher number is smoother but uses more of the CPU. The wiki's example is 40; leave it off to let the game choose." }),
		FLAG({ flag: "-log", edit: false, managed: true, group: "Saves and logs", description: "Opens a console window that shows the server log, and keeps the server in a window the panel can close. All the wiki's examples have it. The panel also needs it on the line to read the other arguments here.", label: "Show server window" }),
		FLAG({ flag: "-fullcrashdump", label: "Full crash dump", group: "Saves and logs", description: "If the server crashes, saves a full dump file for finding the cause. These files can get quite large." }),
		A({ flag: "RCONIP", label: "Remote console address", group: "Remote console", example: "0.0.0.0", description: "The IP address the remote console (RCON) listens on; 0.0.0.0 is the default public address. The same as IP in Rcon.cfg, according to the file's own comment." }),
		A({ flag: "RCONPORT", label: "Remote console port", group: "Remote console", example: "21114", description: "The port of the remote console. The same as Port in Rcon.cfg; the wiki's default there is 21114. A second server on this PC needs its own. The panel does not use the remote console." }),
		A({ flag: "RCONPASSWORD", label: "Remote console password", group: "Remote console", example: "…", description: "Turns on the remote console with this password; with no password it stays off. A password on the launch line can be read by anyone who can see the PC's running programs, so setting Password in Rcon.cfg is the safer way. Choose a long one: whoever has it can run admin commands." }),
		A({ flag: "RCONMAXCONNECTIONS", label: "Remote console connections", group: "Remote console", example: "5", description: "How many remote console sessions can be open at once. The same as MaxConnections in Rcon.cfg, where the wiki's default is 5." }),
		A({ flag: "RCONSECONDSBEFORETIMEOUTCHECK", label: "Remote console idle check (seconds)", group: "Remote console", example: "120", description: "Seconds without contact from a connected console before the server checks it is still there. The wiki says it takes 30 to 3600; the same as SecondsBeforeTimeoutCheck in Rcon.cfg (default 120)." }),
	],
};

const guide = {
	name: "Squad",
	short: "Squad",
	summary:
		"Squad is set up by the files in `SquadGame\\ServerConfig` (the name, player limit, map rotation, admins) and by a few arguments on the command that starts it, which are the **Launch options** on the Settings tab. The panel writes the server's name and player limit into `Server.cfg` when it creates the server. The other files are edited by hand with a text editor.",
	files: {},
	notes: [
		"**The settings files are not in the Settings tab.** They use `//` for comments, which the panel's file readers would show as settings, and `Server.cfg` keeps the name between double quotes. Edit them with a text editor while the server is stopped; the game reads them when it starts, and its updates do not overwrite them (new settings have to be added by hand). `Server.cfg` is `Key=value` per line: ServerName (keep the double quotes, or the server may not be visible), ShouldAdvertise, IsLANMatch, MaxPlayers, NumReservedSlots, PublicQueueLimit, MapRotationMode, team change and team-kill rules, and more. The wiki page Server Configuration lists them.",
		"**Admins** are in `Admins.cfg`: a group line `Group=Admin:kick,ban,changemap` and then `Admin=<SteamID64>:Admin` for each person (the wiki asks for the 17-digit SteamID64). Permission names include changemap, kick, ban, balance, chat, cheat, private, config, reserve, immune and manageserver. A group with only `reserve` gives a reserved slot.",
		"**There is no join password setting.** The game's own `Server.cfg` has no key for one (a `ServerPassword` line is mentioned only by third-party pages and was not confirmed). The wiki's way is the console command `AdminSetServerPassword <password>`, used by an admin with the `private` permission, and it sets the password on the running server.",
		"**Maps:** the server starts with `RANDOM=NONE`, and what is played next is set by `MapRotationMode` in `Server.cfg`: `LevelList` and `LayerList` follow `LevelRotation.cfg` and `LayerRotation.cfg` (one name per line, comments on their own line); `LayerList_Vote` lets players vote and uses `LayerVoting.cfg` and `VoteConfig.cfg`. The wiki says a freshly installed server votes on layers. A layer name must be written exactly (`Belaya_AAS_v1`); a typo stops it loading.",
		"**Stop:** the game's documented clean stop is Ctrl+C in its window. The panel closes the window and, after 15 seconds, ends the program. No source documents a saved world, so nothing is known to be lost, but players are disconnected and whether closing the window ends the server promptly was not tested. All Squad servers run as `SquadGameServer.exe`; the panel only closes the one that runs from this server's folder.",
		"**No player count.** The game's remote console can report one, but the panel does not talk to it, so the Players page shows only whether the server is running. The remote console is off: the panel writes `Rcon.cfg` with an empty `Password`, which the wiki says keeps it off. To use an outside tool such as SquadJS, set a long `Password` in `Rcon.cfg` (and a different `Port` than 21114 for a second server on this PC).",
		"**Ports:** game 7787 (and 7788), Steam query 27165 (and 27166), beacon 15000 (one per server) and, if turned on, the remote console 21114. The wiki opens each of them for both UDP and TCP. The panel keeps 7788 free but does not keep 27166 free or check the beacon port against other servers. The Ports section cannot rewrite this game's start script, so to change a port, edit `Start_Squad.bat` by hand (keep `Port=` first on the line) and stop and start the server.",
		"**Before the first start:** close the Steam program on this PC (the wiki says the server will not start with it open), allow `SquadGameServer.exe` through the firewall, and install the Visual C++ 2013 and 2015 runtimes and the DirectX June 2010 runtime that the wiki lists. Playing on the same network as the server needs NAT loopback on the router, and playing on the server PC itself means starting the server before Steam. Third-party hosting guides, not the wiki, estimate 16 GB of memory at 50 players and 32 GB at 80.",
		"**Mods:** Squad mods are Steam Workshop items. The ids given when the server is created are downloaded once, with SteamCMD, into `SquadGame\\Plugins\\Mods\\<id>`; the server does not fetch them itself and there is no mod list in `Server.cfg` or on the launch line. Each mod's layers must be added to the rotation file by hand (the exact names are on its Workshop page), and some mods also need a line in `ModsConfig.cfg`, whose format the panel does not know. Every player needs the same mods. The panel does not update them later, a game update can stop a mod from working until its author updates it, and some are many gigabytes. To add a mod later, copy its Workshop download into that folder while the server is stopped.",
		"**Licensing:** a server made here is unlicensed. The wiki says unlicensed servers appear only in the Custom Servers browser; licensed ones need at least 60 slots and 10 admins and a key from the game's makers placed in `License.cfg`. The panel does not handle a license.",
		"The research could not confirm which program stays running after `SquadGameServer.exe` starts, the default ports the game uses when an argument is missing, or the files a fresh install ships. The first start on a real install should be checked against this guide.",
	],
};

export default {
	type: "squad",
	title: "Squad",
	files: {},
	launch,
	guide,
};

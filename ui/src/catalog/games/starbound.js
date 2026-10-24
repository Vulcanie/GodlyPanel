import { rows, withChoices } from "../rows.js";

// Starbound. One settings file, storage\starbound_server.config in the install folder, written as JSON. The game makes it on its first
// start; the panel writes three keys when it creates the server (name, port, player limit). Source of every name, default and description:
// the research dossier (docs/research/games/starbound/02-config.md), whose sources are the Starbounder wiki's key table (server 1.3.3), the
// Game Server Kings configuration page and the iTechGuides and esagames pages. Nothing was run on a real install.
//
// Values are real JSON types (true/false, numbers, text): the settings tab keeps the type the file already has, so a yes/no is written as
// true or false.
//
// Left out of the form, on purpose:
//  - clearPlayerFiles and clearUniverseFiles: the dossier says they wipe every player file or every world file. A form switch that does that
//    would be a trap, so they are not offered.
//  - the RCON settings (runRconServer, rconServerPort, rconServerPassword, rconServerBind, rconServerTimeout): the panel does not use RCON
//    and the dossier names no command set.
//  - the query settings (runQueryServer, queryServerPort, queryServerBind): off by default and their protocol is not verified.
//  - serverUsers (the account list, with a password per account): it is an object of accounts, which a flat form cannot write safely.
//  - bannedIPs and bannedUuids (lists), and the script limits (scriptInstructionLimit and the rest): their meaning or type is not described.
//  - the keys the dossier lists with no description, or with the bind address that the sources disagree on (gameServerBind).

const YES_NO = [
	["true", "Yes"],
	["false", "No"],
];

const starboundSettings = withChoices(
	rows([
		// Server
		["serverName", "Server name", "The name shown in the server browser. The panel sets it when it creates the server; change it here later if you want a different one.", "Server"],
		["maxPlayers", "Max players", "The most players allowed on the server at one time. The panel starts it at 8, the dossier's default.", "Server"],
		["maxTeamSize", "Max party size", "The most players allowed in one party (team). The default is 4.", "Server"],
		["tutorialMessages", "Show tutorial messages", "Shows the game's tutorial messages to players. It starts on.", "Server"],

		// Network
		["gameServerPort", "Game port", "The port the server listens on. The panel writes the port it set up for this server, 21025 by default. Players connect to it, so forward it on your router, and keep it the same as the port shown in the panel.", "Network"],

		// Access
		["allowAnonymousConnections", "Let anyone join without an account", "Yes lets anyone with the address join without a Starbound account. No requires players to have an account listed in serverUsers, which this form does not edit. It starts on.", "Access"],
		["anonymousConnectionsAreAdmin", "Players without an account are admins", "Yes makes every player who joins without an account an admin, which gives them full control. Keep it off unless the server is private. It starts off.", "Access"],
		["allowAdminCommands", "Allow admin commands", "Lets admin commands run on the server. It starts on.", "Access"],
		["allowAdminCommandsFromAnyone", "Anyone can run admin commands", "Lets any player run admin commands, not only admins. Leave it off on any server you do not fully trust. It starts off.", "Access"],

		// Mods
		["allowAssetsMismatch", "Allow mismatched mod files", "Yes lets players whose mod files differ from the server's join anyway. It starts on, and mismatched mods can cause odd problems in the game.", "Mods"],
		["checkAssetsDigest", "Check that mod files match", "Yes compares each player's game files with the server's before they join. A host guide says turning it off is less strict and that mismatched assets can cause subtle issues. It starts off.", "Mods"],
		["safeScripts", "Restrict mod scripts", "Yes restricts what mod scripts can do. Turn it off only for mod sets you trust. It starts on.", "Mods"],

		// Players and saves
		["playerBackupFileCount", "Player file backups", "How many backups are kept of each player's file. It starts at 3.", "Players and saves"],
	]),
	{
		allowAnonymousConnections: [
			["true", "Yes: anyone can join"],
			["false", "No: accounts only"],
		],
		anonymousConnectionsAreAdmin: YES_NO,
		allowAdminCommands: YES_NO,
		allowAdminCommandsFromAnyone: YES_NO,
		allowAssetsMismatch: YES_NO,
		checkAssetsDigest: YES_NO,
		safeScripts: YES_NO,
		tutorialMessages: YES_NO,
	},
);

const starboundGroupOrder = ["Server", "Network", "Access", "Mods", "Players and saves"];

const guide = {
	name: "Starbound",
	short: "Starbound",
	summary:
		"Starbound's server keeps its settings in one JSON file, `storage\\starbound_server.config`, in the server's install folder. The panel writes the name, the port and the player limit when it creates the server; the rest are in the file, which this tab edits. The server makes the file on its first start, so it appears once the server has run.",
	files: {
		"starbound_server.config": "The server's name, port, player limit, who may join and the admin rules, and the mod checks. Only the keys shown here are in the form.",
	},
	notes: [
		"**Stop the server before you edit the settings file.** The game reads it when it starts. If the file has a syntax error, the game renames it to `starbound_server.config.old` and starts again with the defaults, so keep a copy first.",
		"**The panel cannot save and stop this server cleanly.** Its Stop closes the server's window and, after 15 seconds, ends the program. Starbound documents Ctrl+C on Linux and no equivalent on Windows, so the universe keeps only what the server saved before. Back up the `storage` folder before you update the server or change its settings.",
		"**Accounts.** With the first switch set to No, only players with an account in `serverUsers` can join. That list holds each account's password, so it is edited by hand in the file and kept out of this form on purpose.",
		"**Mods** are not managed by the panel. Subscribe to a mod on Steam, then copy each mod's `contents.pak` into the server's `mods` folder, giving each file a unique name. Restart the server afterwards, and give every player the same mods, or they cannot connect.",
		"**Clearing the saved players or the universe** is not offered here. The dossier says those switches wipe every player file or every world file, so use the game's own files and backups instead.",
		"**Ports.** Starbound's port is 21025 by default. A direct connection needs that port forwarded on your router. The sources disagree on whether players use TCP, UDP or both, so allow the port in Windows Firewall for both until that is checked on a real install.",
	],
};

export default {
	type: "starbound",
	title: "Starbound",
	files: {
		"starbound_server.config": {
			parser: "json",
			excludePaths: [],
			structuredPaths: [],
			sectionLabels: {},
			settings: starboundSettings,
			groupOrder: starboundGroupOrder,
			mayBeMissing: "The game makes this file the first time the server starts, inside the server's storage folder. Start the server once, stop it, then come back. The panel writes it when it creates the server, so it normally exists already.",
		},
	},
	// No documented launch arguments, so the start script has no launch line for a form.
	launch: null,
	guide,
};

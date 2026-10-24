import { rows, withChoices } from "../rows.js";
import { FLAG } from "../launchHelpers.js";

// Chivalry: Medieval Warfare. Built from the research dossier (docs/research/games/chivalry/), NOT checked on a real install.
// The settings file is PCServer-UDKGame.ini in UDKGame\Config. The panel writes the server name and the admin password when it creates
// the server; the rest of the file is the game's, and only the keys below are offered. Sources: the community sample file
// (https://xgamingserver.com/configs/cmw, names and sample values) and its quick reference (the descriptions of the server name, the
// admin password and the player cap). The vote and map descriptions come from the key names and the sample's own comment; see the notes.

const gameSettings = withChoices(
	rows([
		["Engine.GameReplicationInfo::ServerName", "Server name", "The name shown in the in-game server browser. The panel writes it when it creates the server, from the Server Name you typed.", "Server"],
		["Engine.AccessControl::AdminPassword", "Admin password", "The password a player types in the game to get admin (cheat) commands. The panel writes it from the Admin Password you typed when creating the server.", "Server"],
		["Engine.GameInfo::MaxPlayers", "Most players", "The most players who can be on the server at once. The example config uses 32; the game's own upper limit is not confirmed.", "Players"],
		["AOC.AOCGame::bEnableVoteKick", "Vote to kick", "Lets players start a vote to remove another player from the server.", "Votes"],
		["AOC.AOCGame::bEnableVoteChangeMap", "Vote to change map", "Lets players start a vote to switch to another map.", "Votes"],
		["AOC.AOCGame::bEnableVoteResetMap", "Vote to restart map", "Lets players start a vote to restart the current map.", "Votes"],
		["AOC.AOCGame::bOnlyAdminsCanInitiateVotes", "Only admins start votes", "If on, only admins can start a vote. Players can still vote when one is started.", "Votes"],
		["AOC.AOCGame::bDontAddSdkMapsToList", "Leave out the SDK maps", "If on, the game does not add its built-in SDK maps to the map list automatically. The sample file's own comment describes this setting.", "Maps"],
	]),
	{
		"AOC.AOCGame::bEnableVoteKick": ["True", "False"],
		"AOC.AOCGame::bEnableVoteChangeMap": ["True", "False"],
		"AOC.AOCGame::bEnableVoteResetMap": ["True", "False"],
		"AOC.AOCGame::bOnlyAdminsCanInitiateVotes": ["True", "False"],
		"AOC.AOCGame::bDontAddSdkMapsToList": ["True", "False"],
	},
);

const groupOrder = ["Server", "Players", "Votes", "Maps"];

const launch = {
	title: "Chivalry: Medieval Warfare",
	program: /UDK\.exe/i,
	style: "space",
	editable: false,
	where: "the `UDK.exe` line of the server's start script",
	intro:
		"The panel starts the server with the map, the ports and two flags the dossier says the server needs. The launch line is not editable yet: the game's full list of options is not confirmed.",
	args: [
		FLAG({
			flag: "-dedicated=true",
			label: "Dedicated server",
			group: "Required",
			edit: false,
			managed: true,
			description: "Tells the program to run as a dedicated server, with no player window. The panel always writes it.",
		}),
		FLAG({
			flag: "-seekfreeloadingserver",
			label: "Seek-free loading",
			group: "Required",
			edit: false,
			managed: true,
			description: "A flag the game's own setup asks for. Removing it can stop the server from starting, so the panel always writes it.",
		}),
	],
};

const guide = {
	name: "Chivalry: Medieval Warfare",
	short: "Chivalry",
	summary:
		"Chivalry's server is a UDK program, `UDK.exe`, in `Binaries\\Win64`. The panel starts it with the map and its two UDP ports on the map name, and writes the server name and the admin password into `PCServer-UDKGame.ini`. The rest of that file is the game's own.",
	files: {
		"PCServer-UDKGame.ini": "The server's settings, in `[Section]` headers with `Key=Value` lines. The panel writes the server name and the admin password; the form changes those and a few more keys, and leaves the rest of the file alone.",
	},
	notes: [
		"Not checked on a real install yet. The settings names, the start line and the ports come from the research notes and community sources; the first start should be watched closely (see the build notes for the checks).",
		"The game port is UDP (default 7000) and the query port is UDP (default 7010). Forward both if players are outside your network. The panel keeps the port just above the game port free, but not the query port.",
		"The admin password is required, because the Unraid template for the server says it can't be empty. Choose one you do not use elsewhere; it is written in the settings file in plain text.",
		"The panel's Stop closes the server window. The game does not respond to a graceful shutdown request, so the server may not save the world on the way out. Make a backup before you stop it, and do not rely on Stop to save.",
		"Mods come from the Steam Workshop. The panel does not download them and adds no mod setting. Workshop items have to be fetched with the game's own Workshop tool, and clients then download them automatically; the server and the clients must end up on the same versions.",
		"Keys in the file that are not on the form are left as they are, so edits made in the file itself are kept.",
	],
};

export default {
	type: "chivalry",
	title: "Chivalry: Medieval Warfare",
	files: {
		"PCServer-UDKGame.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: {
				"Engine.GameReplicationInfo": "Server",
				"Engine.AccessControl": "Access",
				"Engine.GameInfo": "Players",
				"AOC.AOCGame": "Game rules",
			},
			settings: gameSettings,
			groupOrder,
			mayBeMissing:
				"The panel writes PCServer-UDKGame.ini in UDKGame\\Config when it makes the server. If it is missing, create it in that folder with a [Engine.GameReplicationInfo] section holding ServerName=, then reload this page.",
		},
	},
	launch,
	guide,
};

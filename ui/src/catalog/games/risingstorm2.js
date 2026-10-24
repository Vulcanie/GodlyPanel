import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Rising Storm 2: Vietnam (dossier: docs/research/games/risingstorm2/, confidence low; NOT checked on a real install). The settings file
// is ROGame\Config\ROGame.ini. The panel writes the server name and the join password when it creates the server; the other keys are the
// game's, and only the keys below are offered. The keys and their descriptions come from the official wiki's tables
// (https://wiki.rs2vietnam.com/index.php?title=DedicatedServer, read through a mirror), which the dossier says was partly copied from
// Red Orchestra 2. No default value is published for any key, so none is shown.

const gameSettings = withChoices(
	rows([
		["Engine.GameReplicationInfo::ServerName", "Server name", "The name shown to players in the server browser and in the server. The panel writes it when it creates the server.", "Server"],
		["Engine.GameReplicationInfo::AdminContact", "Admin contact", "A contact shown in the server browser for whoever runs the server. The wiki's example is an email address.", "Server"],
		["Engine.AccessControl::GamePassword", "Join password", "The password players must type to join the server. The panel writes it from the Join Password you typed when creating the server.", "Access"],
		["ROGame.ROGameInfo::bLANServer", "LAN only", "On: the server is only visible on the same local network. Off: it is listed on the internet.", "Server"],
		["ROGame.ROGameInfo::ServerAdvertisementMessages", "Server message", "A message the server prints for all players in the text chat area, repeated at the interval below.", "Messages"],
		["ROGame.ROGameInfo::ServerAdvertisementInterval", "Message interval (seconds)", "How often, in seconds, the server message is sent to players.", "Messages"],
		["ROGame.ROGameInfo::MinNetPlayers", "Players needed to start", "How many players must be on the server before a round starts (1 to 64).", "Rounds"],
		["ROGame.ROGameInfo::RoundLimit", "Rounds per map", "0 uses the game mode's own setting, 1 is one round, 2 is two rounds, and 3 or more is best of that many.", "Rounds"],
		["ROGame.ROGameInfo::EndOfMapDelay", "Seconds before next map", "How long, in seconds, the server waits after a match before it loads the next map.", "Rounds"],
		["ROGame.ROGameInfo::bUseReadySystem", "Ready-up system", "On: players must ready up before the first round can start.", "Rounds"],
		["ROGame.ROGameInfo::bAllPlayersMustReadyUp", "Everyone must ready up", "On: every player must ready up before the game starts. Off: a majority is enough. Only matters when the ready-up system is on.", "Rounds"],
		["ROGame.ROGameInfo::bBalanceTeams", "Balance teams", "On: the game keeps the two teams close in size.", "Team balance"],
		["ROGame.ROGameInfo::MaxTeamDifference", "Largest team difference", "The most players one team may have more than the other (1 to 63). Only matters when team balance is on.", "Team balance"],
		["ROGame.ROGameInfo::bAutoBalanceTeamsOnDeath", "Balance teams on death", "On: players who die are moved to even the teams. Only matters when team balance is on.", "Team balance"],
		["ROGame.ROGameInfo::FriendlyFireScale", "Team damage scale", "How much damage a teammate's bullets do to you: 0 is none, 0.5 is half, 1 is full damage (0 to 1).", "Team damage"],
		["ROGame.ROGameInfo::FriendlyFirePunishment", "Punishment for team damage", "What happens to a player who goes over the team-damage or team-kill limits.", "Team damage"],
		["ROGame.ROGameInfo::bEnableTeamKillForgiving", "Allow forgiving team kills", "On: a player can forgive a team kill by typing NP in the chat after it.", "Team damage"],
		["ROGame.ROGameInfo::bEnableMapVoting", "Map voting", "On: players vote for the next map at the end of a match. Off: the map cycle moves on by itself.", "Voting"],
		["ROGame.ROGameInfo::MapVotingTime", "Map vote time (seconds)", "How long players have to vote for the next map, when map voting is on.", "Voting"],
		["ROGame.ROGameInfo::bEnableKickVoting", "Kick voting", "On: players can start a vote to kick another player.", "Voting"],
		["ROGame.ROGameInfo::KickVotingTime", "Kick vote time (seconds)", "How long a kick vote has to gather enough votes before it fails.", "Voting"],
		["ROGame.ROGameInfo::bEnableVOIP", "Voice chat", "On: players can talk to each other by voice.", "Chat"],
		["ROGame.ROGameInfo::KillMessageMode", "Death messages", "Which death messages players see: none, their own deaths, their own kills, or all deaths.", "Messages"],
	]),
	{
		"ROGame.ROGameInfo::bLANServer": [["True", "On"], ["False", "Off"]],
		"ROGame.ROGameInfo::bUseReadySystem": [["True", "On"], ["False", "Off"]],
		"ROGame.ROGameInfo::bAllPlayersMustReadyUp": [["True", "On"], ["False", "Off"]],
		"ROGame.ROGameInfo::bBalanceTeams": [["True", "On"], ["False", "Off"]],
		"ROGame.ROGameInfo::bAutoBalanceTeamsOnDeath": [["True", "On"], ["False", "Off"]],
		"ROGame.ROGameInfo::bEnableTeamKillForgiving": [["True", "On"], ["False", "Off"]],
		"ROGame.ROGameInfo::bEnableMapVoting": [["True", "On"], ["False", "Off"]],
		"ROGame.ROGameInfo::bEnableKickVoting": [["True", "On"], ["False", "Off"]],
		"ROGame.ROGameInfo::bEnableVOIP": [["True", "On"], ["False", "Off"]],
		"ROGame.ROGameInfo::FriendlyFirePunishment": [
			["0", "Kick the player"],
			["1", "Session ban"],
			["2", "Permanent ban"],
		],
		"ROGame.ROGameInfo::KillMessageMode": [
			["ROKMM_None", "None"],
			["ROKMM_OwnDeath", "Own deaths only"],
			["ROKMM_Own", "Player's own kills"],
			["ROKMM_ALL", "All deaths"],
		],
	},
);

const groupOrder = ["Server", "Access", "Rounds", "Team balance", "Team damage", "Voting", "Chat", "Messages"];

const launch = {
	title: "Rising Storm 2: Vietnam",
	program: /VNGame\.exe/i,
	style: "space",
	editable: false,
	where: "the `VNGame.exe` line of the server's start script",
	intro:
		"The panel starts the server with the map, the max player count and the two ports. The form below only shows the switches the panel writes; it cannot add others yet.",
	args: [
		A({
			flag: "-Port",
			label: "Game port",
			group: "Network",
			edit: false,
			managed: true,
			example: "27070",
			description: "The port players connect to. The panel writes the Game Port you set. The community guides say changing it also changes the query port by the same amount unless the query port is given too.",
		}),
		A({
			flag: "-QueryPort",
			label: "Steam query port",
			group: "Network",
			edit: false,
			managed: true,
			example: "27072",
			description: "The port the Steam server browser asks for the server's details on. The panel writes the Steam Query Port you set.",
		}),
	],
};

const guide = {
	name: "Rising Storm 2: Vietnam",
	short: "Rising Storm 2",
	summary:
		"Rising Storm 2: Vietnam's server is VNGame.exe in Binaries\\Win64 (Windows only). The panel starts it with the map and two ports, and writes the server name and the join password into ROGame\\Config\\ROGame.ini. The rest of that file is the game's.",
	files: {
		"ROGame.ini": "The server's rules and settings, in `[Section]` headers with `Key=Value` lines. The panel writes the server name and the join password when it creates the server; the form changes the keys listed here and leaves the rest of the file alone.",
	},
	notes: [
		"Checked on a real install: the server starts, answers the Steam query on the query port and writes Launch.log. The setting keys come from the official wiki, which was partly copied from another game, so a key that does not change anything on a real server is possible. The wiki gives no default for any key, so none is shown.",
		"The panel's Game Port and Steam Query Port are its own picks (27070 and 27072), not the game's published defaults. Forward both if players are outside your network.",
		"Workshop items, the Green Army Men add-on and custom maps are not managed by the panel. Their sources disagree on the setup steps, and the add-on needs files copied from a game install.",
		"The server needs the Visual C++ 2012 x64 redistributable (vcredist_x64 from Microsoft, version 11.0). Without it VNGame.exe stops at a hidden 'MSVCP110.dll was not found' message and opens no ports. Install it on the PC before the first start; the panel cannot do it for you.",
		"The panel's Stop closes the server window, which the game handles cleanly. The panel starts it with -log, so the Logs tab shows ROGame\\Logs\\Launch.log.",
		"Stop the server before you edit ROGame.ini. The wiki says changes made while the server runs can be overwritten at the next restart.",
		"The map names use the GameMode-MapName form, such as VNSU-SongBe (Supremacy) or VNTE-CuChi (Territories). The panel's map box takes the name only.",
	],
};

export default {
	type: "risingstorm2",
	title: "Rising Storm 2: Vietnam",
	files: {
		"ROGame.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: {
				"Engine.GameReplicationInfo": "Server",
				"Engine.AccessControl": "Access",
				"ROGame.ROGameInfo": "Game rules",
			},
			settings: gameSettings,
			groupOrder,
			mayBeMissing:
				"The panel writes ROGame.ini in ROGame\\Config when it makes the server. If it is missing, create it in that folder with a [Engine.GameReplicationInfo] section holding ServerName=, then reload this page.",
		},
	},
	launch,
	guide,
};

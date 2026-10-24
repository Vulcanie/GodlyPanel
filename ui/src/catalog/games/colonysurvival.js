import { rows, withChoices } from "../rows.js";

// Colony Survival (Pipliz). One settings file: server.config.json, in the server's folder next to colonyserver.exe. It is JSON in two objects,
// NewOptions (the world) and ServerSettings (the server), as the game's own template shows. The panel writes it when it makes the server, with the name, the port and the password it was given.
// Only the settings a guide explains are in the form. The guides name a few more (the Steam-listing flags ServerListPublicly,
// ServerListLAN and ServerListFriends, and the view and draw settings) without saying what they do, so they stay out of the form.
// Source of every name and default: the research dossier (docs/research/games/colonysurvival/02-config.md).

const serverSettings = withChoices(
	rows([
		["ServerSettings.ServerName", "Server name", "The name this server shows in the server list. The panel writes it when it creates the server, from the Server Name you typed.", "Server"],
		["ServerSettings.ServerPassword", "Join password", "The password players type to join. Leave it empty for an open server.", "Server"],
		["ServerSettings.ServerIP", "Address to listen on", "The address the server listens on. 0.0.0.0 means every address the PC has, which is right unless the PC has several network connections and you want it on one of them.", "Network"],
		["ServerSettings.ServerGamePort", "Game port", "The port players connect to. The panel sets it when it creates the server, and the port beside it is kept free.", "Network"],
		["ServerSettings.NetworkType", "Network type", "How the server is reached. SteamOnline is the only value the setup guides name, and the panel writes it.", "Network"],
		["ServerSettings.MaxPlayerCount", "Most players", "The most players who can be online at once. The current guides give 10 as the template's number.", "Players"],
		["NewOptions.WorldName", "World name", "The name of the world the server loads. Its saves are kept in the gamedata/savegames folder, in a folder with this name.", "World"],
		["NewOptions.DifficultyKey", "Difficulty", "How hard the game is, from Peaceful to Very High. The guides give the five levels and their numbers; they do not say exactly what each one changes.", "Rules"],
		["ServerSettings.RCONPassword", "Remote console password", "The password for the game's remote console (RCON). Leave it empty if you do not need RCON, which this panel does not use.", "Remote console"],
	]),
	{
		"NewOptions.DifficultyKey": [
			["0", "Peaceful"],
			["1", "Low"],
			["2", "Normal"],
			["3", "High"],
			["4", "Very High"],
		],
		"ServerSettings.NetworkType": { choices: [["SteamOnline", "Steam online"]], allowCustom: true },
	},
);

const serverSettingsOrder = ["Server", "Network", "Players", "World", "Rules", "Remote console"];

const guide = {
	name: "Colony Survival",
	short: "Colony Survival",
	summary:
		"Colony Survival keeps its server settings in `server.config.json`, in the server's folder next to `colonyserver.exe`. The panel writes that file when it creates the server, and the game reads it at each start. The settings here are the ones the setup guides explain.",
	files: {
		"server.config.json": "The server's name and password, the port it uses, the world it loads, the player limit, the difficulty and the remote console password. JSON, one key per setting.",
	},
	notes: [
		"Settings are read when the server starts: stop it and start it again after a change.",
		"The panel stops the server by closing its window, which the guides do not describe as a clean save. Back up the world before updates or mod changes, and stop the server first when you copy it.",
		"Mods are folders in `gamedata/mods/<ModName>/`, each with a `modInfo.json`, and are switched on in the world's `worldconfig.json`. The server cannot download Workshop mods by itself: subscribe on a PC, then copy the folder over. This panel does not manage mods.",
		"The game's own list of settings is longer than the form, and the guides do not explain some of its entries, so those are left out on purpose.",
	],
};

export default {
	type: "colonysurvival",
	title: "Colony Survival",
	files: {
		"server.config.json": {
			parser: "json",
			excludePaths: [],
			structuredPaths: [],
			sectionLabels: {},
			settings: serverSettings,
			groupOrder: serverSettingsOrder,
			mayBeMissing:
				"The panel writes server.config.json in the server's folder when it makes the server. If it is missing, create it in the server's folder with the settings you need, then reload this page.",
		},
	},
	launch: null,
	guide,
};

import { rows, withChoices } from "../rows.js";
import { FLAG } from "../launchHelpers.js";

// Craftopia (dossier: docs/research/games/craftopia/, confidence medium). The panel writes ServerSetting.ini with the world name and the
// port when it creates the server; the other keys are the dossier's defaults, from the Pterodactyl egg's file. Every key below is one
// that file names; the descriptions are that file's own comments, in plain words.

const settingsRows = withChoices(
	rows([
		["GameWorld::name", "World name", "The name of the world, shown to players. The panel sets it from the Server Name you typed when it creates the server.", "World"],
		["GameWorld::difficulty", "Difficulty", "How hard the monsters and dungeons are. Easy, Normal (the default), Hard or Very hard.", "World"],
		["GameWorld::gameMode", "Game mode", "The world's mode: Normal (the default, survival), Creative build, or Creative play.", "World"],
		["Host::maxPlayerNumber", "Most players", "The most players who can be online at once, from 1 to 127. The panel writes 7, the default in the file.", "Players"],
		["Host::usePassword", "Use a password", "Whether players must type a password to join. Off by default. The password itself is set in the file, as a number.", "Players"],
		["Host::serverPassword", "Password", "A number of up to 8 digits that players type to join, if the password is on. The setup guides say only numbers work.", "Players"],
		["Host::port", "Game port", "The port the server listens on, over TCP and UDP. The panel writes it when it creates the server. Forward it on your router if players are outside your network.", "Network"],
		["Host::isUseSteamLobby", "Steam lobby", "Whether the server uses a Steam lobby. Leave it Off: the setup guide marks the Steam lobby as not supported.", "Network"],
		["Host::bindAddress", "Address to listen on", "The address the server binds to. 0.0.0.0 listens on every address, which is right unless the PC has several network connections.", "Network"],
		["Save::autoSaveSec", "Auto-save every (seconds)", "How often the world is saved, in seconds. Set -1 to turn automatic saving off.", "Saves"],
		["Save::autoSavePerHour", "Also save every hour", "Whether the server also saves once an hour, in addition to the timed saves.", "Saves"],
		["Save::savePath", "Save folder", "Where the saved worlds are kept. A relative path is taken from the server's folder. The panel's backup reads the default folder, DedicatedServerSave.", "Saves"],
		["CreativeModeSetting::noDeath", "Players cannot die", "When on, a player's character does not die. Applies to the creative settings.", "Creative mode"],
		["CreativeModeSetting::noDamage", "Players take no damage", "When on, a player's character takes no damage.", "Creative mode"],
		["CreativeModeSetting::noHunger", "No hunger", "When on, a player's character does not get hungry.", "Creative mode"],
		["CreativeModeSetting::infinitStamina", "Infinite stamina", "When on, a player's character has endless stamina.", "Creative mode"],
		["CreativeModeSetting::noBuild", "No building", "When on, players cannot place new buildings.", "Creative mode"],
		["CreativeModeSetting::buildingIgnoreDamage", "Buildings take no damage", "When on, buildings do not take damage.", "Creative mode"],
		["CreativeModeSetting::quickCraft", "Craft without the item cost", "When on, crafting does not check the cost of the items used.", "Creative mode"],
		["CreativeModeSetting::forceDayTime", "Fixed time of day", "Sets the world's time of day, from 0 to 24. Set -1 to turn the override off.", "Creative mode"],
		["CreativeModeSetting::islandLevel", "Island level override", "Sets the level of monsters and dungeons on the islands. Set -1 to turn the override off.", "Creative mode"],
		["CreativeModeSetting::ageLevel", "Age level", "The age level of the game world, which changes the crafting recipes. The file's default is 7.", "Creative mode"],
	]),
	{
		"GameWorld::difficulty": [["0", "Easy"], ["1", "Normal"], ["2", "Hard"], ["3", "Very hard"]],
		"GameWorld::gameMode": [["1", "Normal (survival)"], ["2", "Creative build"], ["3", "Creative play"]],
		"Host::usePassword": [["0", "Off"], ["1", "On"]],
		"Host::isUseSteamLobby": [["0", "Off"], ["1", "On (not supported)"]],
		"Save::autoSavePerHour": [["0", "Off"], ["1", "On"]],
		"CreativeModeSetting::noDeath": [["0", "Off"], ["1", "On"]],
		"CreativeModeSetting::noDamage": [["0", "Off"], ["1", "On"]],
		"CreativeModeSetting::noHunger": [["0", "Off"], ["1", "On"]],
		"CreativeModeSetting::infinitStamina": [["0", "Off"], ["1", "On"]],
		"CreativeModeSetting::noBuild": [["0", "Off"], ["1", "On"]],
		"CreativeModeSetting::buildingIgnoreDamage": [["0", "Off"], ["1", "On"]],
		"CreativeModeSetting::quickCraft": [["0", "Off"], ["1", "On"]],
	},
);

const settingsOrder = ["World", "Players", "Network", "Saves", "Creative mode"];

const launch = {
	title: "Craftopia",
	program: /Craftopia\.exe/i,
	style: "space",
	editable: false,
	where: "the `Craftopia.exe` line of the server's start script",
	intro:
		"The panel starts the server with two flags from the setup guides. Every setting is in ServerSetting.ini, not on the launch line, so nothing here can be changed.",
	args: [
		FLAG({
			flag: "-batchmode",
			label: "Run without a window",
			group: "Required",
			edit: false,
			managed: true,
			description: "Starts the Unity program in batch mode, with no interactive window. The panel always writes it. The setup guides use it; they do not say what it does.",
		}),
		FLAG({
			flag: "-showlogs",
			label: "Show logs in the console",
			group: "Logs",
			edit: false,
			managed: true,
			description: "Prints the server's log to its console window, as the setup guides do. The panel always writes it. It does not write a log file.",
		}),
	],
};

const guide = {
	name: "Craftopia",
	short: "Craftopia",
	summary:
		"Craftopia's server is Craftopia.exe, started by the panel's start script with -batchmode -showlogs. Its settings are in ServerSetting.ini in the server folder: the panel writes the file with the world name and the port, and the game reads it when it starts.",
	files: {
		"ServerSetting.ini": "The server's settings, in sections such as [GameWorld] and [Host], written as key=value lines. The panel writes the name and the port when it creates the server.",
	},
	notes: [
		"Version: one Steam forum thread says the dedicated server works only with the legacy build of Craftopia, and a later post says a trial was reopened. Check which build the server runs on, and which beta branch to install, before you rely on the server.",
		"Checked on a real install: anonymous install works, the server starts on the port from ServerSetting.ini, creates DedicatedServerSave/Craftopia.db and a world, and the panel's Stop closes it gracefully. It does not answer the Steam query. The game's own log is Player log files in %USERPROFILE%/AppData/LocalLow/PocketPair/Craftopia/Logs_DS (outside the server folder, so the Logs tab cannot show it).",
		"Password: the game takes only a number of up to 8 digits. Set Use a password and the Password on the Settings tab if you want one.",
		"Save folder: the Steam news says the saves moved next to Craftopia.exe in a December update. The panel's backup reads the default folder, DedicatedServerSave. Some guides name Saves instead, so check where the saves are after the first start.",
		"Ports: the game port is TCP and UDP. The guides also list Steam ports in the 27015 to 27037 range; the panel does not reserve those.",
		"Changes to ServerSetting.ini are read when the server starts. Stop the server before you edit it.",
	],
};

export default {
	type: "craftopia",
	title: "Craftopia",
	files: {
		"ServerSetting.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: {
				GameWorld: "World",
				Host: "Server",
				Save: "Saves",
				CreativeModeSetting: "Creative mode",
			},
			settings: settingsRows,
			groupOrder: settingsOrder,
			mayBeMissing:
				"The panel writes ServerSetting.ini in the server's folder when it makes the server. If it is missing, start the server once so the game creates it, then reload this page.",
		},
	},
	launch,
	guide,
};

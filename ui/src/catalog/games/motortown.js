import { rows } from "../rows.js";

// Motor Town: Behind The Wheel (dossier: docs/research/games/motortown/, confidence low). Only the four keys the vendor guide names
// with a description are offered: ServerName, Password, MaxPlayers and ServerMessage (02-config.md). Their JSON types and defaults
// are not on any fetched page, so the form writes what the person types. Admins, the world-tuning keys (Rain, Fire, NPC densities)
// and the vehicle-mod switch are left out: their names, values or JSON shape are not confirmed.

const GROUP_SERVER = "Server";
const GROUP_PLAYERS = "Players";

const settingRows = rows([
	["ServerName", "Server name", "The name players see in the in-game server list.", GROUP_SERVER],
	["Password", "Join password", "The password players must type to join. Leave it empty for a public server that anyone can join.", GROUP_SERVER],
	["ServerMessage", "Welcome message", "A message shown to players after they connect. Use \\n in the text to start a new line.", GROUP_SERVER],
	["MaxPlayers", "Max players", "The most players who can be on the server at once. The vendor guide allows up to 100, and recommends about 20 on an average PC.", GROUP_PLAYERS],
]);

const settings = {};
for (const [key, meta] of Object.entries(settingRows)) settings[key] = meta;

export default {
	type: "motortown",
	title: "Motor Town: Behind The Wheel",
	files: {
		"DedicatedServerConfig.json": {
			parser: "json",
			excludePaths: [],
			sectionLabels: { "": "Server settings" },
			settings,
			groupOrder: [GROUP_SERVER, GROUP_PLAYERS],
			mayBeMissing:
				"The panel copies the game's DedicatedServerConfig_Sample.json to this name when it creates the server. If the file is missing, the server uses its own defaults until it is there. Only the keys shown here are offered; the game may have others.",
		},
	},
	launch: null,
	guide: {
		name: "Motor Town: Behind The Wheel",
		short: "Motor Town",
		summary:
			"Motor Town's server settings are in DedicatedServerConfig.json in the server's folder. The panel creates it from the game's sample file. The Settings tab edits the name, the join password, the welcome message and the player limit.",
		files: {
			"DedicatedServerConfig.json": "The server's settings. Stop the server before you edit it, so the running game cannot overwrite your change.",
		},
		notes: [
			"Not checked on a real install. Read the server's implementation notes before relying on it.",
			"Sign-in: the install needs a Steam account that owns the game, and the beta code motortowndedi. The panel cannot ask for these yet, so the install is expected to fail.",
			"Ports: the panel passes the game port and the Steam query port to the server. The query port is the one the server list uses, and it must be at least two above the game port.",
			"Stop: no quit command is documented. The panel closes the server's window and, after 15 seconds, ends it, so the last few minutes may not be saved.",
			"Mods: vehicle mods are .pak files in the game's Paks folder and need a setting the panel does not offer yet, so the panel adds no mod setting.",
		],
	},
};

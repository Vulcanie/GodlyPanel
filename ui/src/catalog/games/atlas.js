import { rows } from "../rows.js";
import { FLAG } from "../launchHelpers.js";

// ATLAS (dossier: docs/research/games/atlas/, confidence medium). The settings are the keys the dossier's community guides name in
// GameUserSettings.ini ([ServerSettings]) and the Ocean grid's ModIDs in ServerGrid.json. The rates are described with the guide's own
// wording for them (1.0 is normal). Left out: ActiveMods (the guides disagree on whether it is in Game.ini or GameUserSettings.ini),
// ServerAdminPassword (the start line carries it, and the ini copy would override it), and every key with no description on any page.

const SERVER = "ServerSettings";
const GROUP_RATES = "Rates";
const GROUP_ACCESS = "Access";
const GROUP_MODS = "Mods";

const RATE_NOTE = "1.0 is the normal rate, 2.0 doubles it and 0.5 halves it.";

const serverSettings = {
	[`${SERVER}::XPMultiplier`]: {
		label: "Experience rate",
		description: `How fast players earn experience. ${RATE_NOTE}`,
		group: GROUP_RATES,
	},
	[`${SERVER}::TamingSpeedMultiplier`]: {
		label: "Taming rate",
		description: `How fast creatures are tamed. ${RATE_NOTE}`,
		group: GROUP_RATES,
	},
	[`${SERVER}::HarvestAmountMultiplier`]: {
		label: "Gathering rate",
		description: `How much players get from each resource they gather. ${RATE_NOTE}`,
		group: GROUP_RATES,
	},
	[`${SERVER}::ServerPassword`]: {
		label: "Join password",
		description:
			"The password players must type to join. Leave it empty for a server anyone can join. It is separate from the admin password, so a player who knows only this one cannot use admin commands.",
		group: GROUP_ACCESS,
	},
};

// The grid file's Workshop ids. The panel does not make this file: the game's grid editor does.
const gridSettings = rows([
	[
		"ModIDs",
		"Workshop mod ids",
		"The Steam Workshop ids of the mods for this server, separated by commas, in the order they should load. Leave it empty for no mods.",
		GROUP_MODS,
	],
]);

const launch = {
	title: "ATLAS",
	program: /\bShooterGameServer(?:\.exe)?\b/i,
	style: "space",
	editable: false,
	where: "the `ShooterGameServer.exe` line of the server's start script",
	intro:
		"The panel starts ATLAS with the map and its settings on one long line (the map name, then ports and passwords joined by question marks), followed by a few flags. Nothing here can be changed from this form: the panel sets all of it.",
	args: [
		FLAG({
			flag: "-log",
			label: "Log output",
			group: "Required",
			edit: false,
			managed: true,
			description: "Set by the panel on every start, as in the guide examples. The developers do not describe this flag.",
		}),
		FLAG({
			flag: "-server",
			label: "Server mode",
			group: "Required",
			edit: false,
			managed: true,
			description: "Set by the panel on every start, as in the guide examples. The developers do not describe this flag.",
		}),
		FLAG({
			flag: "-NoBattlEye",
			label: "BattlEye off",
			group: "Required",
			edit: false,
			managed: true,
			description: "Starts the server with BattlEye anti-cheat turned off, as the guide examples do. The panel always sets it.",
		}),
		FLAG({
			flag: "-manualmanagedmods",
			label: "Manual mod updates",
			group: GROUP_MODS,
			description:
				"Turns off the automatic download and update of Workshop mods when the server starts. The developers' page gives this flag for that. Use it only if you manage the mod files yourself.",
		}),
	],
};

const guide = {
	name: "ATLAS",
	short: "ATLAS",
	summary:
		"ATLAS's server is ShooterGameServer.exe, started by the panel's start script on the Ocean seamless-grid map. Its rates and join password are in GameUserSettings.ini (ShooterGame\\Saved\\Config\\WindowsServer), and the Workshop mod ids for a seamless grid are in ShooterGame\\ServerGrid.json.",
	files: {
		"GameUserSettings.ini": "The server's rates and join password, under the [ServerSettings] section. Stop the server before you edit it.",
		"ServerGrid.json": "The seamless grid's settings. The panel shows only the Workshop mod ids; the game's grid editor makes the rest of the file.",
	},
	notes: [
		"Not checked on a real install. Before relying on this server, run it once and check the items in its implementation notes.",
		"Ports: the panel uses 7400 for the game and 7402 for the query port, away from the guide defaults (7777 and 27015) that other servers here use. Forward both on your router. The guides' firewall table lists the game port for TCP and UDP, while the panel's firewall check opens UDP only, so allow TCP too.",
		"The map: the server starts the Ocean seamless-grid map. A seamless grid normally needs a ServerGrid.json from the game's grid editor, which the panel does not make. Check that the server starts and lists itself before you rely on it.",
		"Passwords: the admin password is written on the start line and the join password in GameUserSettings.ini. Only letters, numbers and the marks - _ . @ # $ * + ~ are allowed in either.",
		"Stop: the developers document no quit command or RCON. The panel closes the window and, after 15 seconds, ends the server, so the last minutes may not be saved. Back up before you stop or update.",
		"Mods: the guides give three places for Workshop ids (ServerGrid.json, a mod list in the grid editor, and ActiveMods in an ini file) and do not say which one wins. This panel offers the ServerGrid.json list only.",
	],
};

export default {
	type: "atlas",
	title: "ATLAS",
	files: {
		"GameUserSettings.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: { [SERVER]: "Server" },
			settings: serverSettings,
			groupOrder: [GROUP_RATES, GROUP_ACCESS],
			mayBeMissing:
				"The panel writes this file with its [ServerSettings] section when it creates the server. The guides do not say the game makes it on the first start. If it is missing, the rates use the game's own defaults.",
		},
		"ServerGrid.json": {
			parser: "json",
			excludePaths: [],
			structuredPaths: [],
			sectionLabels: {},
			settings: gridSettings,
			groupOrder: [GROUP_MODS],
			mayBeMissing:
				"The panel does not make this file. It comes from the game's grid editor, and it is in the ShooterGame folder. Until it exists there is nothing to change here.",
		},
	},
	launch,
	guide,
};

import { rows, withChoices } from "../rows.js";
import { FLAG } from "../launchHelpers.js";

// Rising World (the Unity server, build 0.9.3.2). Its settings are in server.properties, key=value lines in the server's folder, with
// capitalised key names. The panel writes the name and the port when it creates the server, and the game fills in the rest, with a
// comment above each key, the first time it starts. The shipped server.example.properties lists every key; the form offers the ones a
// host usually changes. Source of every name, default and description: that file, checked on a real install
// (docs/research/games/risingworld/06-verification.md).

const propertiesSettings = withChoices(
	rows([
		["Server_Name", "Server name", "The name shown in the server list. The panel writes it when it creates the server, from the Server Name you typed.", "Server"],
		["Server_Password", "Join password", "If set, players are asked for this password to join. Leave it empty for an open server.", "Server"],
		["Server_Description", "Description", "A text shown in the server browser when a player selects the server, up to 4096 characters.", "Server"],
		["Server_Admins", "Admins", "The IDs of the server's admins, separated by semicolons.", "Server"],
		["Server_Visible", "Show in the server list", "Whether the server appears in the server list. Remember to change the server name if it does.", "Server"],
		["Settings_MaxPlayers", "Most players", "The most players who can be online at once. The game's default is 64.", "Players"],
		["Server_UseWhitelist", "Only whitelisted players", "If on, only players in the server's whitelist file can join.", "Players"],
		["Server_Port", "Game port", "The port the server listens on, over UDP. The panel sets it when it creates the server, so change it from the server's Ports section. The web and query port is the port just below it.", "Network"],
		["Server_IP", "Address to listen on", "The address the server binds to. Leave it empty to listen on every address, which is right unless the PC has several network connections.", "Network"],
		["Server_WebserverEnabled", "Web server", "Whether the server's built-in web server runs. It is needed for the server list and for queries, and a server without it does not show up in the server list.", "Network"],
		["World_Name", "World name", "The name of the world to load. If it does not exist, the server creates it. Worlds are kept in the Worlds folder.", "World"],
		["World_GameMode", "Game mode for a new world", "The game mode of a world when it is first created: Survival or Creative. It does not change a world that already exists.", "World"],
		["World_Seed", "World seed", "The seed used when a new world is created. Leave it empty for a random seed.", "World"],
	]),
	{
		Server_Visible: ["True", "False"],
		Server_UseWhitelist: ["True", "False"],
		Server_WebserverEnabled: ["True", "False"],
		World_GameMode: ["Survival", "Creative"],
	},
);

const propertiesOrder = ["Server", "Players", "Network", "World"];

const launch = {
	title: "Rising World",
	program: /RisingWorldServer\.exe/i,
	style: "space",
	editable: false,
	where: "the `RisingWorldServer.exe` line of the server's start script",
	intro:
		"The panel starts the server with the two flags a Unity server needs to run with no window. Everything else is set in server.properties, not on the launch line: the old Java server's `+serverport` and similar arguments are ignored by this build.",
	args: [
		FLAG({
			flag: "-batchmode",
			label: "Run without a window",
			group: "Required",
			edit: false,
			managed: true,
			description: "Starts the Unity program in batch mode, with no interactive window. The panel always writes it.",
		}),
		FLAG({
			flag: "-nographics",
			label: "No graphics",
			group: "Required",
			edit: false,
			managed: true,
			description: "Tells Unity not to start a graphics device, which a server does not have. The panel always writes it.",
		}),
	],
};

const guide = {
	name: "Rising World",
	short: "Rising World",
	summary:
		"Rising World's server is a Unity program, `RisingWorldServer.exe`, started by the panel's start script with `-batchmode -nographics`. Its settings are in `server.properties`, which the panel writes with the name and the port; the game fills in every other key the first time it starts.",
	files: {
		"server.properties": "The server's settings, one `Key=Value` per line with a comment above each. The panel writes the name and the port; the game adds the rest on its first start. Key names are case sensitive: a lowercase name is ignored.",
	},
	notes: [
		"The game port is UDP. The server's web and query port is the port just below it (TCP and UDP): with the default 4255 that is 4254. The panel holds the game port and the port above it, but not this one, so keep the port below free too, and forward both if players are outside your network.",
		"Settings are read when the server starts, and the game rewrites server.properties on the first start to add every key with its comment. Edit it while the server is stopped.",
		"The panel's Stop closed the server cleanly on a real install: the server saved, shut down and wrote the end of its log (the panel reported \"closed gracefully\"). The game's own clean stop is the console command `shutdown`; still back up the world before you copy or update the server.",
		"Plugins go in the `Plugins` folder beside server.properties, and worlds are in `Worlds`. Both are in the panel's backup.",
		"World settings such as the game mode and the seed apply only when a world is first created. Change `World_Name` to start a new world.",
	],
};

export default {
	type: "risingworld",
	title: "Rising World",
	files: {
		"server.properties": {
			parser: "properties",
			excludeSections: [],
			sectionLabels: { root: "Server Properties" },
			settings: propertiesSettings,
			groupOrder: propertiesOrder,
			mayBeMissing:
				"The panel writes server.properties in the server's folder when it makes the server. If it is missing, create it in the server's folder with Server_Name and Server_Port lines, then reload this page.",
		},
	},
	launch,
	guide,
};

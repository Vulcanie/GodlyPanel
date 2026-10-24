import { rows, withChoices } from "../rows.js";
import { FLAG } from "../launchHelpers.js";

// Wreckfest (dossier: docs/research/games/wreckfest/, confidence medium). The settings are the key=value lines of server_config.cfg,
// and the key names and descriptions come from the dossier's example file (a December 2019 hotfix). The dossier found no default for
// any key, so no default is shown. The current build may have renamed or dropped some keys: check them on your server.

const settings = withChoices(
	rows([
		["max_players", "Most players", "The most players who can be on the server at once. The example file uses 24, which the game's own notes give as its limit.", "Players"],
		["bots", "Bots at start", "How many computer-controlled bots the server starts with, from 0 to 24.", "Players"],
		["exclude_from_quickplay", "Hidden from Quick Match", "Whether players who use Quick Match can be sent to this server. 0 leaves it open to Quick Match; 1 hides it from it.", "Lobby"],
		["clear_users", "Clear old rights at start", "Whether the admin and moderator rights players had before are cleared each time the server starts. 0 keeps them; 1 clears them.", "Lobby"],
		["owner_disabled", "Owner rights for the first player", "Whether the first player to join gets owner rights. 0 gives them to the first player; 1 gives nobody owner rights.", "Lobby"],
		["admin_control", "Who starts the countdown", "Whether the countdown before a race starts by itself or when the admin readies up. 0 starts it automatically; 1 lets the admin start it.", "Lobby"],
		["lobby_countdown", "Countdown length (seconds)", "How many seconds the countdown before a race lasts, from 30 to 127.", "Lobby"],
		["ready_players_required", "Players ready for automatic countdown (%)", "The percentage of players who must be ready before the automatic countdown starts.", "Lobby"],
		["enable_track_vote", "Track voting", "Whether players vote for the next track after one ends. It needs event rotation set up, and players can start a vote with the console command startvote.", "Lobby"],
		["admin_steam_ids", "Admin Steam IDs", "The 64-bit Steam IDs of players who get admin rights automatically, separated by commas.", "Admins"],
		["op_steam_ids", "Moderator Steam IDs", "The 64-bit Steam IDs of players who get moderator rights automatically, separated by commas.", "Admins"],
		["track", "Track", "The track to race on. The console command tracks lists the names.", "Race"],
		["gamemode", "Game mode", "The game mode, such as racing or derby. The console command gamemodes lists the names.", "Race"],
		["laps", "Laps", "How many laps a race has, from 1 to 60.", "Race"],
		["time_limit", "Time limit (minutes)", "The time limit of a deathmatch game, in minutes.", "Race"],
		["num_teams", "Number of teams", "The number of teams in team game modes, from 2 to 4.", "Race"],
		["elimination_interval", "Elimination interval", "For elimination races: how often a player is eliminated. 0 means after every lap; the other choices are seconds.", "Race"],
		["weather", "Event weather", "The weather for events. The console command weathers lists the names.", "Race"],
		["vehicle_damage", "Vehicle damage", "How much damage cars take: normal, intense or realistic.", "Vehicles"],
		["car_class_restriction", "Fastest car class allowed", "Allows only cars up to a class, from class A (fastest) to class D.", "Vehicles"],
		["car_restriction", "Only one car", "Allows only one specific car when it is filled in. The console command cars lists the names.", "Vehicles"],
		["special_vehicles_disabled", "Special vehicles off", "Whether special vehicles are not allowed. 0 allows them; 1 does not.", "Vehicles"],
		["car_reset_disabled", "Car resets off", "Whether players can reset their car. 0 allows resets; 1 turns them off.", "Vehicles"],
		["car_reset_delay", "Car reset delay (seconds)", "The delay before a car reset takes effect: 0 for none, or 1 to 20 seconds.", "Vehicles"],
		["wrong_way_limiter_disabled", "Wrong-way speed limit off", "Whether the speed limit for players driving the wrong way is turned off. 0 keeps it; 1 turns it off.", "Vehicles"],
		["frequency", "Update frequency", "How often the server sends updates to players. Low uses less bandwidth but more processing on players' PCs; high is the other way round.", "Network"],
		["log", "Log file", "The file the server saves its messages to, in the server's folder, such as log.txt.", "Logs"],
	]),
	{
		exclude_from_quickplay: [["0", "Visible to Quick Match"], ["1", "Hidden from Quick Match"]],
		clear_users: [["0", "Keep them"], ["1", "Clear them"]],
		owner_disabled: [["0", "First player gets owner rights"], ["1", "Nobody gets owner rights"]],
		admin_control: [["0", "Starts automatically"], ["1", "Admin starts it"]],
		enable_track_vote: [["0", "Off"], ["1", "On"]],
		num_teams: ["2", "3", "4"],
		elimination_interval: [["0", "After every lap"], ["20", "20 seconds"], ["30", "30 seconds"], ["45", "45 seconds"], ["60", "60 seconds"], ["90", "90 seconds"], ["120", "120 seconds"]],
		vehicle_damage: ["normal", "intense", "realistic"],
		car_class_restriction: [["a", "Class A (fastest)"], ["b", "Class B"], ["c", "Class C"], ["d", "Class D"]],
		special_vehicles_disabled: [["0", "Allowed"], ["1", "Not allowed"]],
		car_reset_disabled: [["0", "Allowed"], ["1", "Turned off"]],
		wrong_way_limiter_disabled: [["0", "Speed limit kept"], ["1", "Speed limit off"]],
		frequency: [["low", "Low"], ["high", "High"]],
		track: { choices: [], allowCustom: true },
		gamemode: { choices: [], allowCustom: true },
		weather: { choices: [], allowCustom: true },
		car_restriction: { choices: [], allowCustom: true },
	},
);

// A choice list of nothing only asks for a typed value; drop it so the box is a plain text field.
for (const key of ["track", "gamemode", "weather", "car_restriction"]) {
	if (settings[key]?.options?.length === 0) delete settings[key].options;
}

const launch = {
	title: "Wreckfest",
	program: /Wreckfest_x64\.exe/i,
	style: "space",
	editable: false,
	where: "the `Wreckfest_x64.exe` line of the server's start script",
	intro:
		"The panel starts the server with -s, which tells it to read the settings file named by server_config=. Every setting is in server_config.cfg, not on the launch line.",
	args: [
		FLAG({
			flag: "-s",
			label: "Run as a server",
			group: "Required",
			edit: false,
			managed: true,
			description: "Starts the program as a dedicated server, reading the settings file that the next argument names. The panel always writes it.",
		}),
	],
};

const guide = {
	name: "Wreckfest",
	short: "Wreckfest",
	summary:
		"Wreckfest's server is Wreckfest_x64.exe, started by the panel's start script with -s and the settings file server_config.cfg in the install folder. The game makes that file from initial_server_config.cfg the first time it starts; the panel adds nothing to it.",
	files: {
		"server_config.cfg": "The server's settings, one key=value per line; lines starting with # are comments. Edit it while the server is stopped; changes typed in the console are not saved to it.",
	},
	notes: [
		"The defaults for every setting are not in the sources we could read. The keys and descriptions here come from an example file of December 2019, so check the names against the file your server created.",
		"The join password is left out: the example file gives it no explanation. Set one by editing server_config.cfg if you know the key, or by hand from the game.",
		"The panel's Stop closes the server cleanly. Back up the server before you update it anyway.",
		"The panel passes the game, query and Steam ports to the server with -server_set, so they override the ports in server_config.cfg.",
		"The game keeps its save data in the savestemp folder and writes log.txt, both in the server folder. The panel's backup keeps server_config.cfg and savestemp, and the Logs tab shows log.txt.",
		"Mods are copied into a mods folder by hand and named in the mods= setting, and every player needs the same mods. The panel does not manage either. A changed mod list takes effect only after the second restart.",
	],
};

export default {
	type: "wreckfest",
	title: "Wreckfest",
	files: {
		"server_config.cfg": {
			parser: "properties",
			excludeSections: [],
			sectionLabels: { root: "Server Settings" },
			settings,
			groupOrder: ["Players", "Lobby", "Admins", "Race", "Vehicles", "Network", "Logs"],
			mayBeMissing:
				"The game makes server_config.cfg in the server's install folder the first time the server starts. Start the server once, then reload this page.",
		},
	},
	launch,
	guide,
};

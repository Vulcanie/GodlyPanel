import { rows } from "../rows.js";
import { A } from "../launchHelpers.js";

// Red Orchestra: Ostfront 41-45 (dossier: docs/research/games/redorchestra/, confidence low; NOT checked on a real install). The settings
// file is system\RedOrchestra.ini. The dossier's only copy of the keys is a community default.ini with no descriptions, so each setting
// below is explained only from what the dossier's pages say about it. Every other key in that file stays out of the form.

const URL_SECTION = "URL";
const SERVER = "Engine.GameReplicationInfo";
const PLAYERS = "Engine.GameInfo";
const ACCESS = "Engine.AccessControl";
const WEB = "UWeb.WebServer";
const VOTING = "xVoting.xVotingHandler";

const settings = rows([
	[`${URL_SECTION}::Port`, "Game port", "The port players connect to; the console address is host:port, and 7757 is the community file's value. The panel sets it from the Game Port you chose.", "Network"],
	[`${SERVER}::ServerName`, "Server name", "The name shown in the server browser. The panel writes the Server Name you typed when it creates the server.", "Server"],
	[`${PLAYERS}::MaxPlayers`, "Maximum players", "The most players the server lets in at once. The community config file sets 16.", "Players"],
	[`${ACCESS}::GamePassword`, "Password to join", "The password players must type to join. Leave it empty and anyone can join.", "Access"],
	[`${ACCESS}::AdminPassword`, "Admin password", "The password for admin login on the server. The community file has a placeholder, so set your own.", "Access"],
	[`${WEB}::bEnabled`, "Web admin page", "Turns on the browser admin page. It is off in the community config file; the page uses the port below.", "Web admin"],
	[`${WEB}::ListenPort`, "Web admin port", "The port the browser admin page listens on, 8075 in the community config file. It is used only when the page is on.", "Web admin"],
	[`${VOTING}::bMapVote`, "Map voting", "Lets players vote for the next map. On in the community config file.", "Voting"],
	[`${VOTING}::bKickVote`, "Kick voting", "Lets players vote to remove another player from the server. On in the community config file.", "Voting"],
]);

const order = ["Network", "Server", "Players", "Access", "Web admin", "Voting"];

const launch = {
	title: "Red Orchestra: Ostfront 41-45",
	program: /\bucc(?:\.exe)?\b/i,
	style: "space",
	editable: false,
	where: "the `ucc.exe server` line of the server's start script",
	intro:
		"The panel starts the server with the first map, the game class and a log file. The map is the one set on the create form, so none of these can be changed from this form.",
	args: [
		A({
			flag: "-log",
			key: "log",
			style: "equals",
			label: "Log file",
			group: "Logs",
			edit: false,
			managed: true,
			example: "ServerLog.log",
			description: "The file the server writes its log to. The name comes from the forum example the panel's start line follows, and the Logs tab reads it from the System folder.",
		}),
	],
};

const guide = {
	name: "Red Orchestra: Ostfront 41-45",
	short: "Red Orchestra",
	summary:
		"Red Orchestra: Ostfront 41-45's server is ucc.exe under the install folder. The panel starts it with the first map and writes the server name, the join password and the game port into system\\RedOrchestra.ini.",
	files: {
		"RedOrchestra.ini": "The server's settings file. The panel writes the three settings above; the map list (Maps= lines) is left as the file has it and is edited by hand.",
	},
	notes: [
		"Not checked on a real install. The start line is from a forum post, and the server program's name is the most-evidenced one, not confirmed.",
		"The game port is 7757 by default. The sources do not confirm whether it is TCP or UDP. The LAN ports and the query port 7767 (a forum claim) are not set by the panel.",
		"The server has no confirmed graceful stop or RCON, so the panel ends it after about 15 seconds. Back up the server before you stop, update or copy it.",
		"Custom maps are files copied into the server's folders, not Workshop items: the .rom into Maps, .utx into Textures, .usx into StaticMeshes, .uax into Sounds. Then add the map's name to the map list in the file (Maps= lines in the [ROInterface.ROMapList] section). Players may need the same files; the sources do not confirm it.",
		"Settings not listed here are in the same file with no explanation in the sources, so the panel does not offer them.",
	],
};

export default {
	type: "redorchestra",
	title: "Red Orchestra: Ostfront 41-45",
	files: {
		"RedOrchestra.ini": {
			parser: "ini",
			excludeSections: [],
			sectionLabels: {
				[URL_SECTION]: "Network",
				[SERVER]: "Server",
				[PLAYERS]: "Players",
				[ACCESS]: "Access",
				[WEB]: "Web admin",
				[VOTING]: "Voting",
			},
			settings,
			groupOrder: order,
			mayBeMissing: "The panel writes this file when it makes the server. If it is missing, the game makes it on its first run. Start the server once, then come back.",
		},
	},
	launch,
	guide,
};

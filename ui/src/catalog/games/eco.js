import { rows } from "../rows.js";

// Eco. Its network and server settings are in Configs\Network.eco, which the panel writes when it creates the server (the ports, the name
// and the password). The file is read as JSON by the panel's json parser. The wiki's own description of the file calls it "JSON-like"
// (XGamingServer), and whether the game reads it as strict JSON is not confirmed: see the notes in the guide.
//
// The descriptions are from the research dossier (docs/research/games/eco/02-config.md), whose sources are the Eco wiki's Server
// Configuration pages (https://wiki.play.eco/en/Server_Configuration/Network.eco) and the Pterodactyl egg. The wiki pages are stale in
// places; each setting here is one the wiki's Network.eco table gives with a meaning.
//
// Not in the form, on purpose:
//   - GameServerPort and WebServerPort: the panel writes both when the server is created (the web port two above the game port). They
//     are not offered here, because the Ports section does not update them yet;
//   - PublicServer: the panel writes it as off, so the server is not listed publicly;
//   - UPnPEnabled: the wiki's default (true) and the egg's (false) disagree, so neither is offered;
//   - Playtime, ServerCategory, RconServerPort, RconPassword, IPAddress and RemoteAddress: their allowed values or their names conflict
//     between the wiki and the egg, or the dossier has no safe value for them.

const settings = rows([
	["Name", "Server name", "The name shown in the Eco server browser. The egg allows 50 characters; the wiki allows 250.", "Server"],
	["DetailedDescription", "Long description", "A longer description shown when a player selects the server in the browser. Up to 500 characters. Use \\n in the file for a new line.", "Server"],
	["DiscordAddress", "Discord invite", "Only the part of the invite address after discord.gg/ (for example the code). Leave empty to show no Discord link.", "Server"],

	["Password", "Join password", "What players type to join. Players on the server's whitelist do not need it. Leave empty for a server anyone can join.", "Access"],

	["DefaultSlots", "Player slots", "The most players the server allows at one time. -1 means no limit.", "Players"],
	["ReservedSlots", "Reserved slots", "Extra slots beyond the player limit, kept for players who have queue priority. -1 means no limit.", "Players"],
	["MaxUsersLoadingAtSameTime", "Players loading at once", "How many players can be loading into the world at the same time. -1 means no limit.", "Players"],

	["Rate", "Update rate (seconds)", "How often the server sends updates to players, in seconds. The valid range is 1 to 60; the wiki's default is 20.", "Performance"],
]);

export default {
	type: "eco",
	title: "Eco",
	files: {
		"Network.eco": {
			parser: "json",
			excludeSections: [],
			settings,
			groupOrder: ["Server", "Access", "Players", "Performance"],
			mayBeMissing: "The panel writes Network.eco in the Configs folder when it creates the server. If it has been deleted, copy Network.eco.template from the same folder, rename it to Network.eco, and set the ports again on the Ports section.",
		},
	},
	launch: null,
	guide: {
		name: "Eco",
		short: "Eco",
		summary:
			"Eco keeps its network and server settings in `Configs\\Network.eco` inside the server's folder. The panel writes that file when it creates the server, with the server's name, password and ports. The other settings there keep the server's own defaults until you change them.",
		files: {
			"Network.eco": "The server's name and description, the join password, the player slots and the network ports. The panel writes the ports, the name and the password.",
		},
		notes: [
			"The game port (UDP) and the web port (TCP, two above it) are written to Network.eco. The Ports section does not update that file for Eco, so after a port change set GameServerPort and WebServerPort in the file by hand as well, or the server will listen on the old ports.",
			"The file is written as JSON by the panel. The game's own notes describe it as 'JSON-like'. If the server does not start, or the settings do not show, check that the file is valid JSON.",
			"The panel stops the server by closing its window and, after 15 seconds, ending the process. The wiki says a save happens only on a clean shutdown (a SIGTERM or Ctrl+C in a Linux terminal, or `exit` typed into the server). Whether closing the window on Windows saves the world is not known, so a Stop may lose progress since the last save.",
			"Updating the server from Steam may overwrite the Configs folder. The backup keeps the Storage and Configs folders; copy them before an update.",
			"Mods go in the `Mods` folder and need a restart. The panel does not manage mods.",
		],
	},
};

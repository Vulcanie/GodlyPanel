import { rows, withChoices } from "./rows.js";
import { RUST_CHOICES } from "./enums.js";

// Rust is set up with "convars": settings named like server.hostname. The panel's start script gives some of them on the launch
// line (+server.hostname "My Server"); the rest can go in server\<identity>\cfg\server.cfg, one per line, which the game reads at
// start. A value on the launch line wins over one in server.cfg.

export const rustSettings = withChoices(
	rows([
		["server.hostname", "Server name", "The name shown in the in-game server browser.", "Server"],
		["server.description", "Description", "The text under the name in the server browser. Write \\n where you want a new line.", "Server"],
		["server.url", "Website", "A web address shown on the server's page in the browser.", "Server"],
		["server.headerimage", "Banner image", "The web address of a picture (512 by 256 pixels works best) shown at the top of the server's page.", "Server"],
		["server.maxplayers", "Max players", "The most players that can be on at once.", "Server"],
		["server.pve", "PvE (players can't hurt each other)", "Stops players from damaging each other.", "Server"],
		["server.secure", "Anti-cheat", "Easy Anti-Cheat. Leave it on for a public server.", "Server"],
		["server.globalchat", "Global chat", "Lets everyone read global chat. Turn off to make chat team-only.", "Server"],
		["server.identity", "Identity (folder name)", "The name of the folder this server keeps its world and settings in, under server\\. Don't change it unless you also move the folder.", "Server"],

		["server.ip", "Bind address", "The network address the server listens on. 0.0.0.0 means every address on this PC.", "Network"],
		["server.port", "Game port", "The port players connect to (UDP). Change it from the server's Ports section so the panel can check for clashes.", "Network"],
		["server.queryport", "Query port", "The port the server list asks for details on (UDP).", "Network"],
		["rcon.ip", "Remote console address", "The address the remote console listens on. 127.0.0.1 keeps it to this PC, which is what GodlyPanel needs.", "Network"],
		["rcon.port", "Remote console port", "The port of the remote console (TCP). It is only for the panel on this PC, so never open it in your router.", "Network"],
		["rcon.password", "Remote console password", "The remote console's password. The panel keeps it in step when you change it from the server's Automation tab.", "Network"],
		["rcon.web", "Remote console type", "1 uses the WebSocket remote console, 0 the classic one. GodlyPanel needs 0.", "Network"],
		["app.port", "Rust+ app port", "The port of the Rust+ phone app. -1 turns the app off.", "Network"],

		["server.worldsize", "Map size", "The size of the map in metres, from 1000 to 6000. Bigger maps take longer to make and use more memory. With the seed it decides what the map looks like.", "World"],
		["server.seed", "Map seed", "A number that decides what the map looks like. The same seed and size always give the same map.", "World"],
		["server.level", "Map type", "Procedural Map makes a new map from the seed and size. The others are the game's fixed maps.", "World"],
		["server.saveinterval", "Save every (seconds)", "How often the world is saved on its own. Players lose at most this much if the server crashes.", "World"],

		["decay.scale", "Decay speed", "How fast bases decay. 1 is normal; 0 turns decay off; 0.5 is half speed.", "Rules"],
		["decay.upkeep", "Upkeep", "Bases need materials in a tool cupboard to keep from decaying. Turn off for no upkeep.", "Rules"],
		["server.stability", "Building stability", "Buildings fall down if they aren't supported. Turn off to build anything anywhere.", "Rules"],
		["server.radiation", "Radiation", "Turns radiation zones on or off.", "Rules"],
		["server.itemdespawn", "Dropped item lifetime (seconds)", "How long an item left on the ground lasts before it disappears.", "Rules"],
		["craft.instant", "Instant crafting", "Everything is made at once, with no waiting.", "Rules"],

		["fps.limit", "Server frame rate limit", "The most updates a second the server runs. 30 to 60 is plenty; lower it to save CPU.", "Performance"],
	]),
	RUST_CHOICES,
);

export const rustGroupOrder = ["Server", "World", "Rules", "Network", "Performance"];

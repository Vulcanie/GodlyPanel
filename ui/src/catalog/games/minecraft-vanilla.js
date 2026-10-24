import { rows, withChoices } from "../rows.js";
import { A, FLAG } from "../launchHelpers.js";

// Minecraft Java Edition, the vanilla server. Two things are edited here:
//   server.properties  in the server's folder: `key=value` lines, `#` starts a comment. The panel writes the message and the port; the
//                      game writes every other key with its default on its first start. The Settings tab reads it with the
//                      "properties" parser.
//   Launch options     the `java` line of Start_Minecraft.bat. Only server arguments are offered: the memory (-Xmx) is set by the
//                      Max Memory field when the server is created, and JVM options must stay before -jar, which the form cannot do.
// Source of every name, default and description: the research dossier (research/minecraft-vanilla/02-config.md and 03-launch-args.md),
// whose sources are the Minecraft Wiki's Server.properties and Server.jar pages and its server tutorial. Only the keys and values the
// dossier lists are here.
//
// Left out, on purpose:
//  - server-port: it is set from the server's Ports section, so the file and the server's entry can't disagree;
//  - the RCON, query, management-server and JMX keys (the panel does not use them; the dossier calls RCON unencrypted);
//  - the keys the dossier marks "upcoming 26.4" (allowed-connection-ids, enable-legacy-status, status-contact-details), which may not exist
//    in the version the panel runs;
//  - the keys the dossier gives no description for, or marks as {{verify}} or {{Info needed}} on the wiki (max-tick-time, sync-chunk-writes,
//    network compression, the chat and command spam limits, the text filtering keys and similar);
//  - the server's own `--port`, `--pidFile` and `--initSettings` launch arguments (the panel's port and process are managed elsewhere), and `--jfrProfile` (a
//    developer profiling switch, not a server option).

const BOOL = [
	["true", "On"],
	["false", "Off"],
];
// The dossier gives these as true/false; a typed value is not offered because the game reads only those two words.
const ONOFF = { choices: BOOL };

export const minecraftServerSettings = withChoices(
	rows([
		// Server Info
		["motd", "Server Message", "The line of text shown under this server's name in the multiplayer server list. Keep it to about 59 characters, or the list can show a communication error. Colour codes work.", "Server Info"],
		["max-players", "Max Players", "The most players allowed on the server at the same time. The default is 20.", "Server Info"],
		["enable-status", "Show in Server List", "Whether the server appears as online in the server list. Off makes it show as offline, but players can still connect.", "Server Info"],
		["hide-online-players", "Hide Player List", "Hides the names of the players who are online from the server list.", "Server Info"],

		// Gameplay
		["difficulty", "Difficulty", "How hard the world is: how much damage monsters do, and how hunger and poison affect players.", "Gameplay"],
		["gamemode", "Default Game Mode", "The game mode players join in. Unless Force Default Game Mode is on, players come back in the mode they left.", "Gameplay"],
		["force-gamemode", "Force Default Game Mode", "Puts players into the default game mode each time they join, instead of the one they left in.", "Gameplay"],
		["hardcore", "Hardcore Mode", "Turns on hardcore mode for newly created worlds.", "Gameplay"],
		["allow-flight", "Allow Flight", "Lets players fly in survival mode without being kicked for it. With it on, griefers may become more common.", "Gameplay"],
		["spawn-protection", "Spawn Protection", "The size of the area around the spawn point that players cannot change. It is a square with a side of 2 times this number plus 1. 0 turns the protection off. The default is 16.", "Gameplay"],

		// World
		["level-name", "World Folder Name", "The name of the folder the world is saved in. The server loads that world if the folder holds one, and makes a new world there if not. The default is world.", "World"],
		["level-seed", "World Seed", "The seed a new world is generated from. Leave it blank for a random seed. Only used when a world is made.", "World"],
		["level-type", "World Type", "The kind of world made for a new world: normal, flat, large biomes, amplified (a higher build limit) or a single biome. Only used when a world is made.", "World"],
		["generate-structures", "Generate Structures", "Whether villages and other structures are generated in new areas. Dungeons still generate when this is off.", "World"],
		["max-world-size", "World Border Size", "How far from the centre of the world the world border reaches, in blocks, from 1 to 29999984. The default is 29999984, and a higher number does nothing.", "World"],

		// Players and Access
		["white-list", "Whitelist", "Only players on the whitelist can join. Operators are always on it.", "Players and Access"],
		["enforce-whitelist", "Enforce Whitelist", "Kicks players who are not on the whitelist as soon as the server reloads the whitelist, not only when they try to join.", "Players and Access"],
		["online-mode", "Verify Player Accounts", "Lets in only players whose accounts Mojang verifies. Turn it off only for a server that is not on the Internet: fake accounts can then join.", "Players and Access"],
		["enforce-secure-profile", "Require Signed Chat", "Lets in only players with a key signed by Mojang. Off lets unsigned chat through, and unsigned chat cannot be reported.", "Players and Access"],
		["player-idle-timeout", "Idle Timeout (minutes)", "How many minutes a player can stay idle before being kicked. 0 means idle players are never kicked.", "Players and Access"],
		["pause-when-empty-seconds", "Pause When Empty (seconds)", "How many seconds after the last player leaves before the server pauses. The default is 60.", "Players and Access"],

		// Performance
		["view-distance", "View Distance (chunks)", "How far, in chunks, the server sends world data to each player. 10 is the default and the recommended value. Higher numbers show more of the world but cost more processing; 3 to 32.", "Performance"],
		["simulation-distance", "Simulation Distance (chunks)", "How far, in chunks, from each player the server keeps mobs and growing crops active. 10 is the default and the recommended value; 3 to 32.", "Performance"],
		["entity-broadcast-range-percentage", "Entity Range (%)", "How far away mobs and other entities are sent to players, as a percentage. 100 is the default. Higher lets players see them from farther away and can cause more lag; 10 to 1000.", "Performance"],
	]),
	{
		difficulty: [
			["peaceful", "Peaceful"],
			["easy", "Easy"],
			["normal", "Normal"],
			["hard", "Hard"],
		],
		gamemode: [
			["survival", "Survival"],
			["creative", "Creative"],
			["adventure", "Adventure"],
			["spectator", "Spectator"],
		],
		"level-type": [
			["minecraft:normal", "Normal"],
			["minecraft:flat", "Flat"],
			["minecraft:large_biomes", "Large Biomes"],
			["minecraft:amplified", "Amplified"],
			["minecraft:single_biome_surface", "Single Biome Surface"],
		],
		"force-gamemode": ONOFF,
		hardcore: ONOFF,
		"allow-flight": ONOFF,
		"generate-structures": ONOFF,
		"enable-status": ONOFF,
		"hide-online-players": ONOFF,
		"white-list": ONOFF,
		"enforce-whitelist": ONOFF,
		"online-mode": ONOFF,
		"enforce-secure-profile": ONOFF,
	},
);

const minecraftGroupOrder = ["Server Info", "Gameplay", "World", "Players and Access", "Performance"];

const launch = {
	title: "Minecraft (vanilla)",
	// The panel's start script runs `java ... -jar server.jar --nogui`; the program is the .jar, so the Java options before it are not
	// shown here (the memory field sets them).
	// The jar is written "%~dp0server.jar" (its full path, so the panel can tell this server's java from another), so there is no word
	// boundary before it.
	program: /server\.jar\b/i,
	style: "space",
	editable: true,
	where: "the `java` line of the server's start script",
	intro: "The server's own options are in `server.properties` (the Settings tab). The options here are the server program's arguments, which come after `server.jar` on the launch line. Changes apply the next time the server starts. The memory the server may use is set by the Max Memory field when the server is made.",
	args: [
		FLAG({ flag: "--nogui", label: "No window", edit: false, managed: true, group: "Required", description: "Starts the server without its own small window. The panel always writes it." }),
		A({ flag: "--world", label: "World name", group: "World", example: "world", description: "Uses this world folder instead of the one named in server.properties. The panel's backup follows the name in server.properties, so a backup will not include a world chosen here." }),
		A({ flag: "--universe", label: "Universe folder", group: "World", example: "C:\\Minecraft\\worlds", description: "The folder the world name is relative to. Leave it off to use the server's own folder." }),
		FLAG({ flag: "--bonusChest", label: "Bonus chest", group: "World", description: "Adds the bonus chest to a world the first time it is made. Has no effect on a world that already exists." }),
		FLAG({ flag: "--demo", label: "Demo mode", group: "Advanced", description: "Runs the server as the demo: players get a demo pop-up, and after five in-game days they cannot break or place blocks." }),
		FLAG({ flag: "--safeMode", label: "Vanilla data packs only", group: "Advanced", description: "Makes the server load only the vanilla data pack, so other data packs are not loaded." }),
		A({ flag: "--serverId", label: "Server ID", group: "Advanced", example: "main", description: "A name shown in crash reports, to tell this server's reports apart from others'." }),
		FLAG({ flag: "--eraseCache", label: "Erase cached data", group: "Maintenance", description: "Deletes the cached light and biome data so the server makes it again. The next start is slower." }),
		FLAG({ flag: "--forceUpgrade", label: "Upgrade the world", group: "Maintenance", description: "Converts the world to the newest save format. After that, older versions of the game can no longer open the world. Make a backup first." }),
		FLAG({ flag: "--recreateRegionFiles", label: "Rebuild region files", group: "Maintenance", description: "Like Upgrade the world, but also rewrites every chunk into fresh region files. Takes longer, and the same warning about older versions applies." }),
	],
};

const guide = {
	name: "Minecraft (vanilla)",
	short: "Minecraft vanilla",
	summary:
		"Minecraft's own Java server. The settings are in `server.properties` in the server's folder, and the options for the server program are on the launch line of the start script. The panel makes the server, accepts Mojang's EULA for you when you tick the box, and writes the message and the port.",
	files: {
		"server.properties": "The server's settings: the message, the players allowed in, the game mode and difficulty, the world's name and type, and the distances the server works at. One `key=value` per line; the game fills in any key that is missing when it starts.",
	},
	notes: [
		"**Stopping.** Minecraft's own way to stop is the command `stop`, typed into the server's window. The panel cannot type into that window, so its Stop closes the window and, after 15 seconds, ends the java process. That skips the server's normal shutdown and its final save. Before you press Stop, update or restart, open the server's window (the panel keeps it minimized on the taskbar) and type `stop`, then wait for it to close.",
		"**Java 21.** This version needs Java 21 or newer on the PC, and the start script runs `java`, so it must be on the Windows PATH. If the window closes straight away, Java is probably missing or not on the PATH.",
		"**Memory.** The Max Memory field sets how much memory Java may use (`-Xmx`). The dossier suggests at least 2 GB for a small server and 4 GB or more for a bigger one. The panel's default is 4.",
		"**Port.** The game port is TCP. The panel writes it into `server-port` in server.properties, so change it from the server's Ports section, not here; and open it in Windows Firewall and on your router.",
		"**Settings** are read when the server starts: stop and start the server after a change. The game rewrites server.properties on each start and keeps your values.",
		"**Whitelist and operators** are the files `whitelist.json` and `ops.json` in the server's folder. They are not in this form.",
		"**Mods:** none for vanilla. Datapacks are not mods; they go in the world's `datapacks` folder, which the backup keeps with the world.",
		"**Logs:** the dossier does not say where the server writes its log, so the Logs tab shows nothing for this server. The window shows the server's output.",
	],
};

export default {
	type: "minecraft-vanilla",
	title: "Minecraft (vanilla)",
	files: {
		"server.properties": {
			parser: "properties",
			excludeSections: [],
			sectionLabels: { root: "Server Properties" },
			settings: minecraftServerSettings,
			groupOrder: minecraftGroupOrder,
			mayBeMissing: "The panel writes server.properties in the server's folder when it makes the server. If it is missing, start the server once: the game writes the file with its defaults.",
		},
	},
	launch,
	guide,
};

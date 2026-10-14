// Unturned (Smartly Dressed Games). Dedicated server tool: Steam app 1110390 (free, anonymous login), game: app 304930.
// Built from the research dossier (research/unturned/01..04): the official SDG docs, the game's own C# source, and a real install of
// server 3.26.3.13 that was started (not by this module) and read. The panel's create flow has not been run on a real install yet; the
// points listed in 05-implementation-notes.md still need a real run.
//
// - The program is Unturned.exe in the install folder, started directly with `-batchmode -nographics +InternetServer/<ID>`. The
//   shipped ServerHelper.bat only does `start "" Unturned.exe -batchmode -nographics %*` and exits, so it is not used.
// - The game reads the server ID as everything after the slash up to the END of the command line, so `+InternetServer/<ID>` has to be
//   the last argument. That is why this game has no "Launch options" form: the panel's launch-line editor adds new arguments at the
//   end of the line, which would turn them into part of the folder name.
// - Everything the server needs is written in `Servers\<ID>\Server\Commands.dat` (one command per line, read at start-up and after any
//   command-line command, so it wins): Name, Map, MaxPlayers, Port, Mode, Password and the Steam login token (GSLT).
// - `Port` is the Steam query port; the game's own traffic uses the next port up (seen on a real install: Port 27015 gave
//   "listen socket bound to [::]:27016"). Both are UDP.
// - Config.txt (the gameplay rules) is made by the game on its first run, in a block format ({ } sections, keys repeated across
//   sections) that none of the panel's file readers handle, so it is not offered in the Settings tab. The difficulty is the Mode line
//   in Commands.dat, which is.
// - Mods: Steam Workshop ids in `Servers\<ID>\WorkshopDownloadConfig.json` (File_IDs). The server downloads and updates them itself
//   when it starts; players get them automatically when they join. The file is also shown in the Settings tab.
// - Stopping: there is no autosave in vanilla Unturned. The game saves on its `Shutdown` console command and, per its source, on
//   Ctrl+C, Ctrl+Break and closing its console window. The panel asks the window to close and force-kills after its grace time, so
//   whether a Stop saves the world is the first thing to check on a real install.

const EXE = "Unturned.exe";
const SERVERS_DIR = "Servers";

// The window title in `start /MIN "<title>"`. A server's name is typed by a person, and cmd acts on these characters.
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").trim() || "Unturned";

// The game's own limits (its CommandName and CommandMaxPlayers source): a server name of 5 to 50 characters, 1 to 200 players.
const NAME_MIN = 5;
const NAME_MAX = 50;

const wholeNumber = (value, fallback, min, max) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

// A value on one line of Commands.dat: no control characters, no blanks at either end.
const lineText = (value) => String(value ?? "").replace(/[\u0000-\u001f]/g, " ").trim();

/**
 * The server ID: the folder name under Servers\ and the last word of the launch line. Letters, digits and `-` only (the dossier
 * recommends letters, digits, `_` and `-`; other characters are untested). `Singleplayer` is refused by the game.
 */
export function serverId(p) {
	const id = String(p?.instanceSlug ?? "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
	if (!id) return "server";
	return id === "singleplayer" ? "singleplayer-server" : id;
}

/** The Steam login token, as pasted: one piece of text. Empty means none. */
export function cleanLoginToken(raw) {
	const token = String(raw ?? "").trim();
	if (!token) return "";
	if (/[\s"'\u0000-\u001f]/.test(token)) throw new Error("The Steam login token has spaces or quotes in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers.");
	if (token.length > 64) throw new Error("The Steam login token is much longer than a real one (they are 32 characters). Paste only the token itself.");
	return token;
}

/**
 * The Steam Workshop file ids in a list typed by a person: ids, or Workshop links (`...?id=1234567890`), separated by commas, spaces
 * or semicolons. Each must be a number. A collection's id is accepted by the game (it installs the collection's items).
 */
export function parseWorkshopIds(raw) {
	const ids = [];
	for (const part of String(raw ?? "").split(/[\s,;]+/).filter(Boolean)) {
		const fromLink = /[?&]id=(\d+)/i.exec(part);
		const id = fromLink ? fromLink[1] : /^\d+$/.test(part) ? part : null;
		if (!id || id.length < 5 || id.length > 12) throw new Error(`"${part.slice(0, 40)}" is not a Steam Workshop file id. Use the number at the end of the item's Workshop page address (the part after ?id=), separated by commas.`);
		if (!ids.includes(id)) ids.push(id);
	}
	if (ids.length > 100) throw new Error("That is more than 100 Workshop items. Start with fewer.");
	return ids;
}

/** The map name written to Commands.dat: the name of the map's folder. The five official maps are the dropdown; nothing else odd gets through. */
const MAP_NAME = /^[A-Za-z0-9_][A-Za-z0-9_ -]{0,59}$/;

/** The WorkshopDownloadConfig.json the game writes itself on its first run, with the file ids filled in (the keys and defaults are the game's). */
export function workshopConfig(ids) {
	return JSON.stringify(
		{
			File_IDs: ids.map(Number),
			Ignore_Children_File_IDs: [],
			Query_Cache_Max_Age_Seconds: 600,
			Max_Query_Retries: 2,
			Use_Cached_Downloads: true,
			Should_Monitor_Updates: true,
			Shutdown_Update_Detected_Timer: 600,
			Shutdown_Update_Detected_Message: "Workshop file update detected, shutdown in: {0}",
			Shutdown_Kick_Message: "Shutdown for Workshop file update.",
		},
		null,
		2,
	);
}

const commandsPath = (id) => `${SERVERS_DIR}\\${id}\\Server\\Commands.dat`;
const workshopPath = (id) => `${SERVERS_DIR}\\${id}\\WorkshopDownloadConfig.json`;

// Folder path plus server ID: the dossier saw Workshop assets fail silently, and OpenMod fail to start, once files went past the 260
// characters Windows allows in a path. Its advice is to warn above about 90.
const PATH_BUDGET = 90;

const template = {
	id: "unturned",
	displayName: "Unturned",
	type: "unturned",
	// The game answers Steam's A2S query, but which of its two ports does is not settled (the docs, the source and GameDig disagree),
	// so the panel watches the process instead. That gives no player count.
	method: "process",
	updateAppId: "1110390",
	storeAppId: "304930",
	sharedInstall: false,
	// SteamCMD puts the game straight in the server's folder: Unturned.exe and Servers\ are in its root.
	installLayoutRoot: "",
	// The Windows depots add up to about 1.86 GB; saves and Workshop maps come on top.
	estimatedInstallBytes: 2_000_000_000,
	description:
		"Unturned's dedicated server. Keep the server's folder path short: Workshop maps and plugins create files with long paths, and past about 260 characters in all Windows (and the game) cannot open them. The game then silently skips some of a map's content, and the OpenMod plugin framework fails to start. The panel warns when the folder path plus the server's folder name goes over about 90 characters.",
	fields: ["sessionName", "serverPassword", "mapCode", "gslt", "mods"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server list, 5 to 50 characters)", type: "text" },
		gslt: { label: "Steam login token (optional, from steamcommunity.com/dev/managegameservers for app 304930). Without one the game does not list the server in the Internet server list.", type: "text" },
		mods: { label: "Steam Workshop file ids or links, comma-separated (optional). Players download them when they join. Keep this server's folder path short: long paths break Workshop maps (the panel warns above about 90 characters).", type: "text" },
	},
	// The five maps the official docs name. A Workshop map is added through the mods field and then named in the Settings tab (Map).
	mapChoices: [
		{ code: "PEI", label: "PEI" },
		{ code: "Washington", label: "Washington" },
		{ code: "Yukon", label: "Yukon" },
		{ code: "Russia", label: "Russia" },
		{ code: "Germany", label: "Germany" },
	],
	// UDP, the Steam query port and, next to it, the game's own traffic. 27015 and 27016 are other games' defaults here.
	ports: [{ key: "port", label: "Game Port (UDP, the next port up is used too)", default: 27315 }],
	implicitPorts: [{ offset: 1, label: "its in-game traffic port" }],
	// Rejects a bad name, token or Workshop list before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = lineText(raw.sessionName) || lineText(raw.name);
		if (name.length < NAME_MIN || name.length > NAME_MAX) throw new Error(`An Unturned server name has to be ${NAME_MIN} to ${NAME_MAX} characters long (the game's own limit). "${name.slice(0, 60)}" is ${name.length}.`);
		const map = lineText(raw.mapCode) || "PEI";
		if (!MAP_NAME.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the name of the map's folder, such as PEI or Washington.`);
		const ids = parseWorkshopIds(raw.mods);
		return { sessionName: name, mapCode: map, gslt: cleanLoginToken(raw.gslt), mods: ids.join(","), modIds: ids };
	},
	buildStartScriptFilename: () => "Start_Unturned.bat",
	// Everything the server is told is in Commands.dat; the launch line is the program, the two Unity arguments, and the server ID
	// as the LAST word (the game takes everything after the slash to the end of the line as the ID, so no trailing space either).
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${windowTitle(p.name)}" ${EXE} -batchmode -nographics +InternetServer/${serverId(p)}`,
			"",
		].join("\r\n"),
	// The first file the panel writes: Commands.dat, which the game reads at start-up. Only commands the research documents.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One command per line: its name, a space, then its value. Changes apply the next time the server starts.",
			`Name ${lineText(p.sessionName) || lineText(p.name)}`,
			`Map ${lineText(p.mapCode) || "PEI"}`,
			`MaxPlayers ${wholeNumber(p.maxPlayers, 8, 1, 200)}`,
			`Port ${Number(p.port)}`,
			"Mode Normal",
		];
		const password = lineText(p.serverPassword);
		if (password) lines.push(`Password ${password}`);
		const token = String(p.gslt ?? "").trim();
		if (token) lines.push(`GSLT ${token}`);
		lines.push("");
		return { relPath: commandsPath(serverId(p)), content: lines.join("\r\n") };
	},
	// The Workshop list. Written with the game's own defaults for the other keys; the game fills the file in itself if it is missing.
	buildExtraFiles: (p) => [{ relPath: workshopPath(serverId(p)), content: workshopConfig(Array.isArray(p.modIds) ? p.modIds : []) }],
	postWrite: async (p) => {
		const warnings = [];
		const id = serverId(p);
		const length = String(p.installDir ?? "").replace(/[\\/]+$/, "").length + id.length;
		if (length > PATH_BUDGET) {
			warnings.push(`This server's folder path is long (${length} characters with its server name). Windows stops at 260 characters for a whole file path, and Unturned's Workshop maps and plugin files go deep, so some of a map's content can silently fail to load. If you see "Could not find a part of the path" in the server log, move the server to a shorter folder.`);
		}
		if (!String(p.gslt ?? "").trim()) {
			warnings.push("No Steam login token was given. The game says a server without one is not listed in the Internet server list and cannot be joined over the Internet; it still prints a 17-digit Server Code in its log. Add a token with the GSLT line in Commands.dat (Settings tab or the file), then restart.");
		}
		return { warnings };
	},
	buildServerEntry: (p) => {
		const id = serverId(p);
		const commands = `${p.installDir}\\${commandsPath(id)}`;
		return {
			name: p.name,
			type: "unturned",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: lineText(p.sessionName) || lineText(p.name),
			serverPassword: p.serverPassword,
			configPath: commands,
			configPaths: { "Commands.dat": commands, "WorkshopDownloadConfig.json": `${p.installDir}\\${workshopPath(id)}` },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The player's own game is also Unturned.exe; the panel finds this server's process by where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "1110390",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// Every server folder: its world (Level), players, Commands.dat, Config.txt, Adminlist and the Workshop list. The Workshop downloads
	// are left out: they are large and the server fetches them again from WorkshopDownloadConfig.json when it starts. Note that
	// Commands.dat holds the server password and the Steam login token.
	backup: {
		paths: [{ base: "working", rel: "Servers", label: "Worlds, players and settings", exclude: ["*/Workshop/Steam"] }],
	},
	// Server_<ID>.log, the Workshop download log and the connection logs, in the install's Logs folder.
	logs: [{ kind: "dir", base: "working", rel: "Logs", label: "Server logs" }],
	// Off on purpose: the server ID has to be the last word of the launch line, and the editor adds new arguments at the end.
	launchOptions: false,
};

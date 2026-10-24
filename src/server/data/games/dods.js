// Day of Defeat: Source (Valve). Dedicated server: Steam app 232290 ("Day of Defeat: Source Dedicated Server"; anonymous login is the
// plan, see docs/research/games/dods/05-implementation-notes.md), game: app 300.
//
// Facts from the research dossier (docs/research/games/dods/01..04). Its sources are hosting-provider guides (ZAP-Hosting, FireDaemon,
// XGamingServer, Citadel, GameServerManagers' server.cfg) because Valve's own pages were blocked. In short:
//  - the program is srcds.exe in the install folder, started with
//      -console -game dod -secure -port <n> +maxplayers <n> +map <map> +exec server.cfg
//    plus, when given, +sv_setsteamaccount <token>. Nothing has to be last on the line, so the "Launch options" form stays on;
//  - one game port: the engine's default is 27015 and the guides allow 27015 to 27020. This module starts at 25965 (25966 is kept
//    free beside it), so no other template's ports are taken. SourceTV and the client port are not moved;
//  - the panel writes dod\cfg\server.cfg itself (name, password, sv_lan 0); the launch line runs it with `+exec server.cfg`;
//  - the Steam login token is needed for public listing (ZAP-Hosting). Its game id is 232290 (the dossier's resolved id);
//  - method "process", no rconPort: no page names a stop command. The panel asks the window to close, then ends the program after 15 s;
//  - mods: the dossier's mods are SourceMod and MetaMod copied into folders by hand. The panel has no field for that, so none is added.
// Not verified on a real install (see docs/research/games/dods/05-implementation-notes.md): anonymous SteamCMD login for app 232290,
// that srcds.exe sits in the install root and stays the one running process, that closing the window ends it, and every setting name.

const EXE = "srcds.exe";
const GAME_DIR = "dod";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "dod_anzio";
// The dossier's examples are 32 (FireDaemon, a DoD map) and 22 (ZAP-Hosting). 32 is the start value and the ceiling for the form,
// because it is the largest figure any page shows; the real limit is not on a page.
const DEFAULT_PLAYERS = 32;
const MAX_PLAYERS = 32;

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

const wholeNumber = (value, fallback, min, max) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);

/**
 * A value for a line of a Source .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line, so such a value is refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Day of Defeat: Source's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map name as it appears in a file name: letters, digits, `_`, `-`, `.`. */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;

/** The Game Server Login Token, as pasted: one piece of text. Empty means none. */
export function cleanLoginToken(raw) {
	const token = String(raw ?? "").trim();
	if (!token) return "";
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(token)) {
		throw new Error("The Steam login token has spaces or odd characters in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers (create it for game id 232290).");
	}
	return token;
}

/** The launch line's arguments after the program. */
function launchArguments(p) {
	const args = [
		"-console",
		`-game ${GAME_DIR}`,
		"-secure",
		`-port ${Number(p.port)}`,
		`+maxplayers ${playerLimit(p.maxPlayers)}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		"+exec server.cfg",
	];
	// Only a value that is plainly a token reaches the script.
	const token = String(p.gslt ?? "").trim();
	if (/^[A-Za-z0-9_-]{1,64}$/.test(token)) args.push(`+sv_setsteamaccount ${token}`);
	return args;
}

const template = {
	id: "dods",
	displayName: "Day of Defeat: Source",
	type: "dods",
	// The dossier found no stop command and no RCON setting it can rely on: the panel watches the process.
	method: "process",
	updateAppId: "232290",
	storeAppId: "300",
	sharedInstall: false,
	// SteamCMD puts the server in its folder: srcds.exe and dod\ sit in the root (the ZAP-Hosting path is ...\dod-ds\dod\cfg\server.cfg).
	installLayoutRoot: "",
	description:
		"Day of Defeat: Source's dedicated server (srcds). It is meant to install with an anonymous Steam login, which one dossier source disputes. A Steam login token is needed for other players to find the server in the public list. Friends who know the address join with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode", "gslt"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		gslt: { label: "Steam login token (for the public server list, from steamcommunity.com/dev/managegameservers, game id 232290)", type: "text" },
	},
	// The map the dossier's FireDaemon example starts with. Any other map is set with the Map argument in the Settings tab's Launch options.
	mapChoices: [{ code: "dod_anzio", label: "Anzio (dod_anzio)" }],
	// Game port: the engine's default is 27015 and the guides allow 27015 to 27020. 25965 is outside every other template's ports, and
	// 25966 (the port beside it) is kept free by the panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25965 }],
	// Rejects a bad name, password, map or token before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as dod_anzio.`);
		return { sessionName: name, serverPassword: password, mapCode: map, gslt: cleanLoginToken(raw.gslt) };
	},
	buildStartScriptFilename: () => "Start_DODS.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Day of Defeat Source Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Day of Defeat Source Server"}"`,
		];
		const password = cfgText(p.serverPassword, "The password");
		if (password) lines.push(`sv_password "${password}"`);
		lines.push("sv_lan 0", "");
		return { relPath: SERVER_CFG_REL, content: lines.join("\r\n") };
	},
	buildServerEntry: (p) => {
		const serverCfg = `${p.installDir}\\${SERVER_CFG_REL}`;
		return {
			name: p.name,
			type: "dods",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running (srcds.exe on Windows, per the ZAP-Hosting and FireDaemon guides; not yet seen on a real
			// install of this game). The panel finds this server's process by where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "232290",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder. The dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "dod/cfg", label: "Server settings" }],
	},
	// The dossier names no log folder for this game and the launch line has no -condebug, so no log file is listed.
	logs: [],
	launchOptions: true,
};

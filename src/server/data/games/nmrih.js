// No More Room in Hell (co-op zombie survival, Valve engine). Dedicated server: Steam app 317670, game: app 224260. The dossier disputes
// whether it installs with anonymous SteamCMD login (Valve's archived list says no; a host guide uses `login anonymous`). The plan here is
// anonymous login; see docs/research/games/nmrih/05-implementation-notes.md.
//
// Facts from the research dossier (docs/research/games/nmrih/01..04). Its sources are hosting-provider guides (ZAP-Hosting, XGamingServer,
// GameHostBros, Emerald Host, a Docker image) and Valve's archived pages for the generic srcds options. In short:
//  - the program is srcds.exe in the install folder (srcds_run on Linux, not used here), started with
//      -console -game nmrih -port <n> +maxplayers <n> +map <map> +exec server.cfg
//    plus, when given, +sv_setsteamaccount <token>. Nothing has to be last on the line, so the "Launch options" form stays on.
//    -secure is left out: the dossier's examples use it but no fetched page says what it does;
//  - one game port: the generic srcds default is 27015 (game, RCON). The dossier's host guide says players connect on 2456 instead
//    (a conflict, not picked). This module starts at 25985 (25986 is kept free beside it), so no other template's ports are taken;
//  - the panel writes nmrih\cfg\server.cfg itself (name, password, sv_lan 0);
//  - the Steam login token is needed for other players to join (ZAP-Hosting, game id 317670);
//  - method "process", no rconPort: no in-game or console quit command was found. The panel asks the window to close, then ends the
//    program after 15 s;
//  - mods: Metamod:Source and SourceMod are installed by hand, so this module adds no mod field.
// Not verified on a real install (see docs/research/games/nmrih/05-implementation-notes.md): anonymous SteamCMD login for app 317670,
// the start map (the dossier's two examples disagree), the player limit, that srcds.exe is the one running process, and that closing
// the window ends it.

const EXE = "srcds.exe";
const GAME_DIR = "nmrih";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

// The docker-srcds example starts nmo_broadway, the ZAP-Hosting example de_dust (a Counter-Strike map, so it is not used).
const DEFAULT_MAP = "nmo_broadway";
// The dossier's examples are 8 (docker-srcds) and 22 (ZAP-Hosting). 8 is the start value; 22, the largest figure a page shows, is the
// ceiling for the form. No page gives the real limit.
const DEFAULT_PLAYERS = 8;
const MAX_PLAYERS = 22;

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
		throw new Error(`${what} has a character that No More Room in Hell's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
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
		throw new Error("The Steam login token has spaces or odd characters in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers (create it for game id 317670).");
	}
	return token;
}

/** The launch line's arguments after the program. */
function launchArguments(p) {
	const args = [
		"-console",
		`-game ${GAME_DIR}`,
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
	id: "nmrih",
	displayName: "No More Room in Hell",
	type: "nmrih",
	// No stop command was found: the panel watches the process.
	method: "process",
	updateAppId: "317670",
	storeAppId: "224260",
	sharedInstall: false,
	// SteamCMD puts the server in its folder: srcds.exe and nmrih\ sit in the root (the ZAP-Hosting Linux path is .../nmrih-ds/nmrih/cfg).
	installLayoutRoot: "",
	description:
		"No More Room in Hell's dedicated server (srcds). The install is meant to use an anonymous Steam login, which one source disputes. A Steam login token is needed for other players to join. Friends who know the address join with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode", "gslt"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		gslt: { label: "Steam login token (for other players to join, from steamcommunity.com/dev/managegameservers, game id 317670)", type: "text" },
	},
	// The one map the docker-srcds example starts with. Any other map is set with the Map argument in the Settings tab's Launch options.
	mapChoices: [{ code: "nmo_broadway", label: "Broadway (nmo_broadway)" }],
	// Game port: the generic srcds default is 27015 and the host guide says 2456 for players (a conflict, not picked). 25985 is outside every
	// other template's ports, and 25986 (the port beside it) is kept free by the panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25985 }],
	// Rejects a bad name, password, map or token before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as nmo_broadway.`);
		return { sessionName: name, serverPassword: password, mapCode: map, gslt: cleanLoginToken(raw.gslt) };
	},
	buildStartScriptFilename: () => "Start_NMRIH.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "No More Room in Hell Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "No More Room in Hell Server"}"`,
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
			type: "nmrih",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running (srcds.exe on Windows, per the Valve archive; not yet seen on a real install of this game).
			// The panel finds this server's process by where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "317670",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder. The dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "nmrih/cfg", label: "Server settings and map cycle" }],
	},
	// The dossier names no log folder for this game and the launch line has no -condebug, so no log file is listed.
	logs: [],
	launchOptions: true,
};

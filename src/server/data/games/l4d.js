// Left 4 Dead (Valve, 2008; the first game, not Left 4 Dead 2). Dedicated server: Steam app 222840 (the dossier's app-id resolution:
// "Left 4 Dead Dedicated Server", a Tool with a parent of 500), game: app 500. Anonymous login is UNVERIFIED for this app: the
// dossier's API section type says "ownersonly", and the one search snippet that said anonymous works could not be re-read.
//
// Facts from the research dossier (docs/research/games/l4d/01..04). Its sources are Valve's developer wiki (Source Dedicated Server,
// Command line options, the Left 4 Dead console command list, Add-on), an XGamingServer page and a Docker image's README. Nothing was
// run on a real install of this game. In short:
//  - the program is srcds.exe in the install folder, started with
//      -console -game left4dead -port <n> +maxplayers <n> +map <map> +exec server.cfg
//    plus, when given, +sv_setsteamaccount <token>. Nothing has to be last on the line, so the "Launch options" form stays on.
//    `-tickrate` is never offered: Valve's page says it cannot be altered in Left 4 Dead;
//  - one game port: UDP for players and the server list, TCP on the same number for Source's remote console (generic Source page).
//    The engine also takes UDP 27020 (SourceTV) and a client port (27005 or 27002 by two Valve pages); the panel keeps the port after
//    the game port free (portRules.js) and leaves 27020 alone, as the other Source templates do;
//  - the game ships no server.cfg that the dossier names, so the panel writes left4dead\cfg\server.cfg itself with the name, the
//    password and sv_lan 0, and the launch line runs it with `+exec server.cfg`;
//  - the Steam login token is optional: Valve's generic Source page says it is needed when the server fails with error 18 or 106;
//  - method "process": the dossier found no quit command and no working RCON stop. The panel asks the window to close, then ends the
//    program after 15 s;
//  - mods: VPK add-ons go in left4dead\addons by hand. The dossier recommends no install field, so this module adds none.
// Not verified on a real install (see docs/research/games/l4d/05-implementation-notes.md): anonymous SteamCMD login, that srcds.exe
// sits in the install root and stays the one running process, that `-game left4dead` is the right value, that the cfg is run.

const EXE = "srcds.exe";
const GAME_DIR = "left4dead";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "l4d_hospital01_apartment";
const DEFAULT_PLAYERS = 8;
const MAX_PLAYERS = 8;

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

/** Player slots: 8 is the example on the XGamingServer page (`+maxplayers 8`); the dossier gives no ceiling, so 8 is used here too. */
const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);

/**
 * A value for a line of a Source .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line (the CFG page: a line can hold several commands separated by `;`, and `//` starts a comment), so such a value is
 * refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Left 4 Dead's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
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
		throw new Error("The Steam login token has spaces or odd characters in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers (Left 4 Dead's server is app 222840, its game app 500).");
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
	id: "l4d",
	displayName: "Left 4 Dead",
	type: "l4d",
	// Source's RCON exists on the game port, but the dossier has no stop command and no verified RCON stop: the panel watches the process.
	method: "process",
	updateAppId: "222840",
	storeAppId: "500",
	sharedInstall: false,
	// SteamCMD puts the server straight in the server's folder: srcds.exe and left4dead\ are in its root (to be confirmed).
	installLayoutRoot: "",
	description:
		"Left 4 Dead's dedicated server (srcds, the 2008 game; Left 4 Dead 2 is a separate server). It installs with a Steam login that is expected to be anonymous, which is not yet confirmed for this game. A Steam login token is optional: Valve's page says one is only needed if the server stops with error 18 or 106. Friends join from the in-game console with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode", "gslt"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		gslt: { label: "Steam login token (optional, from steamcommunity.com/dev/managegameservers, game app 500). Valve says one is only needed if the server stops with error 18 or 106.", type: "text" },
	},
	// The one Left 4 Dead map the research saw in a start line (the XGamingServer page's example). Any other map is set with the Map
	// argument in the Settings tab's Launch options.
	mapChoices: [{ code: DEFAULT_MAP, label: `${DEFAULT_MAP} (the research's example map)` }],
	// One game port: UDP for players and the server list, TCP on the same number for the remote console. Ports used by the other
	// templates: 27015 (Source's default, Core Keeper's here), 27020 (SourceTV), 27005 (client), 25952 and 25954 belong to the other two
	// modules being built beside this one. 25950 is kept free with 25951 beside it (portRules.js).
	ports: [{ key: "port", label: "Game Port (UDP, and TCP for the remote console; the next port up is kept free too)", default: 25950 }],
	// Rejects a bad name, password, map or token before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as l4d_hospital01_apartment.`);
		return { sessionName: name, serverPassword: password, mapCode: map, gslt: cleanLoginToken(raw.gslt) };
	},
	buildStartScriptFilename: () => "Start_L4D.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Left 4 Dead Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Left 4 Dead Server"}"`,
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
			type: "l4d",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running (per Valve's generic Source pages; NOT confirmed for this game, see the notes). The panel
			// finds this server's process by where it runs from, so another srcds.exe elsewhere on the PC is not mistaken for it.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "222840",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder (server.cfg and any ban lists the game writes there). The
	// dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "left4dead/cfg", label: "Server settings and ban lists" }],
	},
	// No log file is named for this game by the dossier (-condebug is not in its launch-argument research), so none is listed.
	logs: [],
	launchOptions: true,
	// The game loads add-ons from its addons folder, so a .vpk dropped there is an add-on. Only the plain folder is used:
	// no Workshop, since Left 4 Dead has none.
	mods: {
		adapter: "folder",
		label: "Add-ons",
		dir: { base: "working", rel: "left4dead/addons" },
		accepts: [".vpk"],
		sources: ["github", "url"],
		note: "Drop .vpk add-on files here. Restart the server after a change.",
	},
};

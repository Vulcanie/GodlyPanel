// Double Action: Boogaloo (a Source-engine game, mod "dab"). Dedicated server: Steam app 317800, installed with an anonymous SteamCMD
// login (the dossier's FireDaemon install command uses +login anonymous; the Valve list says anonymous login is yes).
//
// Facts from the research dossier (docs/research/games/doubleaction/01..04). The sources are a hosting vendor's guides, a Docker image and
// a sample config, because no developer documentation was reached. The store page says the server is "no longer available on the
// Steam store", while the vendor still installs it with SteamCMD. In short:
//  - the program is srcds.exe in the install folder, started with
//      -console -game dab -port <n> +maxplayers <n> +map <map> +exec server.cfg
//    The vendor's full line also has -secure, -autoupdate and +log on: -secure is left out (the Valve list has -insecure, and no -secure),
//    and -autoupdate is left out because the vendor says Valve has not implemented it on Windows. Nothing has to be last on the line, so
//    the "Launch options" form stays on;
//  - one game port, 25928 here. The dossier gives 27015 (vendor, Valve) and 27019 (Docker image); the brief sets 25928 so no other
//    template's ports are taken. The engine's default SourceTV port and client port are not moved;
//  - the panel writes dab\cfg\server.cfg itself (name, password, sv_lan 0); the launch line runs it with `+exec server.cfg`. The dossier
//    found NO config folder, so dab\cfg is the usual Source place for a -game dab server and is UNVERIFIED (see the notes);
//  - no Steam login token: the dossier says a token is unsure for this game and no page shows a token setting in the launch line;
//  - method "process", no rconPort: the vendor says the game does NOT respond to a graceful shutdown, so the panel's Stop (close the
//    window, then end the program after 15 s) is the only stop. Save data may not be written on stop;
//  - mods: the dossier found no server mod method, so none is added.
// Not verified on a real install (see docs/research/games/doubleaction/05-implementation-notes.md): srcds.exe is the one running process,
// the config folder, the port protocol, and every setting name.

const EXE = "srcds.exe";
const GAME_DIR = "dab";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "da_rooftops";
// The vendor's example is 10 players. The Docker image's default is 24, the largest figure any page shows, so it is the ceiling here.
// No page gives the real limit.
const DEFAULT_PLAYERS = 10;
const MAX_PLAYERS = 24;

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
		throw new Error(`${what} has a character that Double Action's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map name as it appears in a file name: letters, digits, `_`, `-`, `.`. */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;

/** The launch line's arguments after the program. */
function launchArguments(p) {
	return [
		"-console",
		`-game ${GAME_DIR}`,
		`-port ${Number(p.port)}`,
		`+maxplayers ${playerLimit(p.maxPlayers)}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		"+exec server.cfg",
	];
}

const template = {
	id: "doubleaction",
	displayName: "Double Action: Boogaloo",
	type: "doubleaction",
	// The vendor says the game does not respond to a graceful shutdown and gives no console quit command: the panel watches the process.
	method: "process",
	updateAppId: "317800",
	// The game's own store id is not in the dossier (the store page for 317800 is the dedicated server's, and says it is delisted).
	storeAppId: "317800",
	sharedInstall: false,
	// SteamCMD puts the server in its folder: srcds.exe and dab\ sit in the root (the vendor's install folder is the server root).
	installLayoutRoot: "",
	description:
		"Double Action: Boogaloo's dedicated server (srcds). It installs with an anonymous Steam login. The game does not respond to a graceful shutdown, so Stop may end it without a save. Friends join with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// The map the vendor's examples start with. Any other map is set with the Map argument in the Settings tab's Launch options.
	mapChoices: [{ code: DEFAULT_MAP, label: "da_rooftops" }],
	// One game port. 25928 is outside every other template's ports; 25929 (the port beside it) is kept free by the panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25928 }],
	// Rejects a bad name, password or map before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as da_rooftops.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_DoubleAction.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, "Double Action Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Double Action Server"}"`,
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
			type: "doubleaction",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running (srcds.exe, from the FireDaemon guides; not yet seen on a real install of this game).
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "317800",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder. The dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "dab/cfg", label: "Server settings" }],
	},
	// The dossier names no log folder for this game and the launch line has no -condebug, so no log file is listed.
	logs: [],
	launchOptions: true,
};

// Empires (Empires Mod, a Half-Life 2 Source total conversion). Dedicated server: Steam app 460040, game: app 17740. Installed with an
// anonymous SteamCMD login, which the dossier marks unconfirmed (docs/research/games/empires/01-basics.md).
//
// Facts from the research dossier (docs/research/games/empires/01..04). Its sources are a 2017 paste, hosting-provider guides and a
// sample server.cfg, because the official setup page returned 504. In short:
//  - the program is srcds.exe in the install folder, started with
//      -game empires -console -toconsole -secure -port <n> +maxplayers <n> +map <map> +exec server.cfg
//    The paste's minimal line has no -port: the panel adds -port, the standard Source option, so the port is the one the panel shows.
//    Nothing has to be last on the line, so the "Launch options" form stays on;
//  - one game port, 25926 here (the dossier's connect port is 27015; the brief sets 25926 so no other template's ports are taken);
//  - the panel writes empires\cfg\server.cfg itself (name, password); the launch line runs it with `+exec server.cfg`;
//  - no Steam login token: the dossier names no token setting for this game;
//  - method "process", no rconPort: the dossier has RCON (rcon_password) but no verified stop command and no verified RCON protocol
//    path in the panel, so the panel asks the window to close, then ends the program after 15 s;
//  - mods: SourceMod and Metamod are copied into folders by hand. The panel has no field for that, so none is added.
// Not verified on a real install (see docs/research/games/empires/05-implementation-notes.md): anonymous SteamCMD login for app 460040,
// that srcds.exe is the one running process, the -secure and -toconsole flags, and every setting name.

const EXE = "srcds.exe";
const GAME_DIR = "empires";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "con_district402";
// The dossier's host guide says the panel default is 62 and the range is 1 to 64; the 2017 paste used 64. 62 is the start value.
const DEFAULT_PLAYERS = 62;
const MAX_PLAYERS = 64;

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
		throw new Error(`${what} has a character that Empires config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map name as it appears in a file name: letters, digits, `_`, `-`, `.`. */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;

/** The launch line's arguments after the program. */
function launchArguments(p) {
	return [
		`-game ${GAME_DIR}`,
		"-console",
		"-toconsole",
		"-secure",
		`-port ${Number(p.port)}`,
		`+maxplayers ${playerLimit(p.maxPlayers)}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		"+exec server.cfg",
	];
}

const template = {
	id: "empires",
	displayName: "Empires",
	type: "empires",
	// No verified stop command and no verified RCON path in the panel: the panel watches the process.
	method: "process",
	updateAppId: "460040",
	storeAppId: "17740",
	sharedInstall: false,
	// The server sits in the install folder: srcds.exe and empires\ are in its root (the dossier's paths put empires\ beside the exe).
	installLayoutRoot: "",
	description:
		"Empires' dedicated server (srcds, a Half-Life 2 total conversion). It is meant to install with an anonymous Steam login, which the research could not confirm on an official page. Players must run the same Empires version as the server, so keep updates on. Friends join with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// The one map the research saw in a start line. Any other map is set with the Map argument in the Settings tab's Launch options.
	mapChoices: [{ code: DEFAULT_MAP, label: "con_district402" }],
	// One game port, UDP and TCP as Source uses it. 25926 is outside every other template's ports; 25927 (the port beside it) is kept free.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25926 }],
	// Rejects a bad name, password or map before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as con_district402.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_Empires.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, "Empires Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest. The dossier's sample uses `hostname` and `sv_password`.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Empires Server"}"`,
		];
		const password = cfgText(p.serverPassword, "The password");
		if (password) lines.push(`sv_password "${password}"`);
		lines.push("");
		return { relPath: SERVER_CFG_REL, content: lines.join("\r\n") };
	},
	buildServerEntry: (p) => {
		const serverCfg = `${p.installDir}\\${SERVER_CFG_REL}`;
		return {
			name: p.name,
			type: "empires",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running (srcds.exe, from a 2017 paste; not yet seen on a real install of this game).
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "460040",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder. The dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "empires/cfg", label: "Server settings" }],
	},
	// The dossier names no log folder for this game and the launch line has no -condebug, so no log file is listed.
	logs: [],
	launchOptions: true,
};

// IOSoccer (Source engine soccer game). Dedicated server: Steam app 673990 (the dossier's id; its Steam type is UNSURE, see the notes),
// anonymous login. The player game's store page is app 673560. Windows (srcds_win64.exe) and Linux.
//
// Facts from the research dossier (docs/research/games/iosoccer/01..04). Its sources are the SteamAH install guide and console-command
// page, LinuxGSM, XGamingServer's sample server.cfg and EmeraldHost's pages. No developer config file was found. In short:
//  - the program is srcds_win64.exe in the install folder (the anonymous install holds only that 64-bit exe, no srcds.exe), started with
//      -console -game iosoccer -port <n> +maxplayers <n> +map <map> +exec server.cfg
//    The example line's -condebug, +fps_max and -tickrate are left out: the guide gives them without saying they are needed. -secure is
//    not in the dossier for this game, so it is left out too. Nothing has to be last on the line, so the "Launch options" form stays on;
//  - one game port: the dossier says there is no separate query port (queries share the game port), and the example uses 27015. This
//    module starts at 25948 (25949 is kept free beside it), so no other template's ports are taken. SourceTV is not used;
//  - the panel writes iosoccer\cfg\server.cfg itself (name, password, sv_lan 0); the launch line runs it with `+exec server.cfg`;
//  - method "process", no rconPort: the dossier names a console `quit` only from the client console (via RCON), and no RCON protocol the
//    panel speaks is verified for this game. The panel asks the window to close, then ends the program after 15 s;
//  - mods: Metamod:Source and SourceMod by hand (see the dossier's mods page), so this module adds no mod field.
// Not verified on a real install (see docs/research/games/iosoccer/05-implementation-notes.md): that the anonymous install of app 673990
// works, that srcds_win64.exe sits in the install root and stays the one running process, that server.cfg is read from iosoccer\cfg, and the
// meaning of +maxplayers for this game.

const EXE = "srcds_win64.exe";
const GAME_DIR = "iosoccer";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

// The dossier's example map (SteamAH's launch line and the XGamingServer sample).
const DEFAULT_MAP = "8v8_vienna";
// The dossier's example player count is 32. The EmeraldHost host page gives the Max Players range as 2 to 33 (spectators included),
// so the form stops there. The per-side cvar mp_maxplayers (1 to 11) is a different setting and is not used here.
const DEFAULT_PLAYERS = 32;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 33;

// The game port, and the port beside it kept free. 25948 and 25949 are outside every other template's ports.
const DEFAULT_PORT = 25948;

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

const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, MIN_PLAYERS, MAX_PLAYERS);

/**
 * A value for a line of a Source .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line, so such a value is refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that IOSoccer's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
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
	id: "iosoccer",
	displayName: "IOSoccer",
	type: "iosoccer",
	// The dossier gives no RCON protocol the panel speaks for this game: the panel watches the process.
	method: "process",
	updateAppId: "673990",
	storeAppId: "673560",
	sharedInstall: false,
	// SteamCMD puts the server in its folder: srcds.exe and iosoccer\ sit in the root (the guides' install is +force_install_dir iosoccer).
	installLayoutRoot: "",
	description:
		"IOSoccer's dedicated server (srcds). It is meant to install with an anonymous Steam login, which the research did not confirm on a real install. Friends who know the address join with connect <your address>:<port>. The panel cannot send the game's quit command, so Stop closes the server's window and, after 15 seconds, ends the program.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// The map the dossier's guides start with. Any other map is set with the Map argument in the Settings tab's Launch options.
	mapChoices: [{ code: "8v8_vienna", label: "Vienna 8v8 (8v8_vienna)" }],
	// Game port: one port for play and queries. 25948 is outside every other template's ports, and 25949 (the port beside it) is kept free.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: DEFAULT_PORT }],
	// Rejects a bad name, password or map before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as 8v8_vienna.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_IOSoccer.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, "IOSoccer Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One command per line, the name and then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "IOSoccer Server"}"`,
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
			type: "iosoccer",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The 64-bit program is the only srcds exe in the install, so it is the one the panel starts and watches.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "673990",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder. The dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "iosoccer/cfg", label: "Server settings" }],
	},
	// The dossier names no log folder for this game and the launch line has no -condebug, so no log file is listed.
	logs: [],
	launchOptions: true,
};

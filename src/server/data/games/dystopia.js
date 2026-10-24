// Dystopia (a Source engine total conversion). Dedicated server: Steam app 17585 (anonymous login); the playable game is app 17580.
//
// Facts from the research dossier (docs/research/games/dystopia/01..04). Its sources are the Valve server list and SteamDB (the Windows
// launch config), GameHostBros and XGamingServer guides, the GameServerManagers sample server.cfg, and a Dockerfile read as a summary.
// In short:
//  - the program is srcds.exe in bin\win32 (SteamDB's Windows launch config: executable srcds.exe, working folder bin/win32, argument
//    -console). The panel starts it from that folder, with the game folder given as a path that leads back up to dystopia\:
//      -console -game ..\..\dystopia -port <n> +map <map> +exec server.cfg
//    The `-game` path and the working folder are the module's main uncertainty (see docs/research/games/dystopia/05-implementation-notes.md);
//  - one game port (27015 by default; the panel uses 25924 from its band). The client and SourceTV ports are not moved;
//  - the panel writes dystopia\cfg\server.cfg itself (name, password, sv_lan 0, log on); the launch line runs it with `+exec server.cfg`;
//  - no login token field: the guides say a token is optional and that a server without one still shows in the browser;
//  - no player limit is written: the dossier names no +maxplayers for this game, so the game's own default applies;
//  - method "process", no rconPort: no stop command is documented. The panel asks the window to close, then ends the program after 15 s;
//  - mods: the dossier found no server-side mod install method, so none is added.
// Not verified on a real install (see docs/research/games/dystopia/05-implementation-notes.md): anonymous SteamCMD login for app 17585,
// the -game path from bin\win32, that +exec server.cfg is read, and that closing the window ends the program.

const EXE = "srcds.exe";
const EXE_DIR = "bin\\win32";
const GAME_DIR = "dystopia";
// From bin\win32 back up to the install folder, then into dystopia.
const GAME_PATH = `..\\..\\${GAME_DIR}`;
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "dys_vaccine";

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/**
 * A value for a line of a Source .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line, so such a value is refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Dystopia's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map name as it appears in a file name: letters, digits, `_`, `-`, `.`. */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;

/** The launch line's arguments after the program. */
function launchArguments(p) {
	return [
		"-console",
		`-game ${GAME_PATH}`,
		`-port ${Number(p.port)}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		"+exec server.cfg",
	];
}

const template = {
	id: "dystopia",
	displayName: "Dystopia",
	type: "dystopia",
	// The dossier found no stop command and no RCON quit: the panel watches the process.
	method: "process",
	updateAppId: "17585",
	storeAppId: "17580",
	sharedInstall: false,
	// SteamDB's install folder is the server's root: bin\win32 and dystopia\ sit under it.
	installLayoutRoot: "",
	description:
		"Dystopia's dedicated server (srcds). It installs with an anonymous Steam login. A Steam login token is optional; a server without one still shows in the server browser. Friends join from the in-game console with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// The map the Dockerfile's example starts with. Any other map is set with the Map argument in the Settings tab's Launch options.
	mapChoices: [{ code: "dys_vaccine", label: "dys_vaccine (the guide's example)" }],
	// One game port. 25924 is outside every other template's ports, and 25925 (the port beside it) is kept free by the panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25924 }],
	// Rejects a bad name, password or map before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as dys_vaccine.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_Dystopia.bat",
	// The program is run from bin\win32, the folder SteamDB's Windows launch config names. New arguments are appended at the end by the
	// Launch options form; nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			`cd /d "%~dp0${EXE_DIR}"`,
			`start /MIN "${batSafe(p.name, "Dystopia Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Dystopia Server"}"`,
		];
		const password = cfgText(p.serverPassword, "The password");
		if (password) lines.push(`sv_password "${password}"`);
		lines.push("sv_lan 0", "log on", "");
		return { relPath: SERVER_CFG_REL, content: lines.join("\r\n") };
	},
	buildServerEntry: (p) => {
		const serverCfg = `${p.installDir}\\${SERVER_CFG_REL}`;
		return {
			name: p.name,
			type: "dystopia",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}\\${EXE_DIR}`,
			// srcds.exe, run from bin\win32 (SteamDB). The panel finds this server's process by where it runs from: bin\win32 is inside the
			// install folder, so the match holds. Not yet seen on a real install.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "17585",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder (server.cfg and mapcycle.txt, which the guide puts in cfg).
	backup: {
		paths: [{ base: "working", rel: "dystopia/cfg", label: "Server settings and map list" }],
	},
	// The dossier names no log folder for this game, and the launch line writes no -condebug, so no log file is listed.
	logs: [],
	launchOptions: true,
};

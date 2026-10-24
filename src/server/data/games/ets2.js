// Euro Truck Simulator 2 (SCS Software). Dedicated server: Steam app 1948160; game app 227300 (for the logon token, not used here).
//
// Built from the research dossier (docs/research/games/ets2/, confidence medium) and NOT yet run on a real install. The notes in
// docs/research/games/ets2/05-implementation-notes.md list what must be checked first. What it relies on:
//  - THE PROGRAM NAME IS UNVERIFIED. No fetched page names the Windows server program. The start script runs
//    bin\win_x64\eurotrucks2_server.exe, a name inferred from the ATS server (amtrucks_server.exe, which the IONOS guide names). If the
//    real file has another name, the start script and the watched process must both be changed.
//  - the server's files (server_config.sii, server.log.txt, and the two package files) live in the server home folder. The start script
//    sets that folder to the data folder inside the server's folder with -homedir (the SCS page's option for this). The panel writes
//    server_config.sii into that folder, so the game reads the name and the ports the panel chose. The game's own ports, 27015 and 27016,
//    are used by the Source servers, so the panel uses 28100 and 28102.
//  - the game refuses to start without server_packages.sii and server_packages.dat in the data folder. The panel cannot make them: they
//    are exported from a game copy with export_server_packages. Copy them into the data folder before the first start.
//
// Not done, and why:
//  - no settings form: server_config.sii is SiiNunit (key: value inside braces), which no existing parser reads.
//  - no password, moderator or logon-token fields: the dossier does not settle how the token affects public listing, and its
//    password and moderator notes are not enough to write them safely.
//  - no clean stop: the dossier names Ctrl + C only. The panel's Stop closes the window and ends the program after 15 s.

const EXE = "eurotrucks2_server.exe";
const EXE_PATH = `bin\\win_x64\\${EXE}`;
const DATA_DIR = "data";
// The game makes its own folder under the -homedir folder and keeps everything there (checked on a real install).
const HOME_DIR = `${DATA_DIR}\\Euro Truck Simulator 2`;
const CONFIG_FILE = "server_config.sii";
const LOG_FILE = "server.log.txt";

const DEFAULT_PORT = 28100;
const DEFAULT_QUERY_PORT = 28102;
const DEFAULT_NAME = "Euro Truck Simulator 2 Dedicated Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** The server name written into server_config.sii: quotes, backslashes and control characters removed, at most 63 characters. */
function lobbyText(value) {
	return String(value ?? "")
		.replace(/[\u0000-\u001f"\\]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 63)
		.trim();
}

/** A port as a whole number, or the default when none was given. Anything else is refused. */
function portOf(value, fallback, what) {
	if (value === undefined || value === null || value === "") return fallback;
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`The ${what} must be a whole number from 1 to 65535.`);
	return n;
}

/**
 * The contents of server_config.sii. The name, the two dedicated ports and the other values below are written; the keys this file
 * does not list (the timezone, the logon token, the moderators) are left to the game's own defaults. The values are the XGamingServer
 * ETS2 reference's defaults (a community source), except the name and the ports, which are the panel's. The dossier's sources
 * disagree on the default name and the default timezone, so the panel writes its own name and leaves the timezone out.
 */
function serverConfig(p) {
	const name = lobbyText(p.sessionName) || lobbyText(p.name) || DEFAULT_NAME;
	const port = portOf(p.port, DEFAULT_PORT, "game port");
	const queryPort = portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port");
	return [
		"SiiNunit",
		"{",
		"server_config : .unnamed {",
		` lobby_name: "${name}"`,
		' description: ""',
		' welcome_message: ""',
		' password: ""',
		" max_players: 8",
		" max_vehicles_total: 100",
		" max_ai_vehicles_player: 50",
		" max_ai_vehicles_player_spawn: 50",
		` connection_dedicated_port: ${port}`,
		` query_dedicated_port: ${queryPort}`,
		" connection_virtual_port: 100",
		" query_virtual_port: 101",
		" player_damage: true",
		" traffic: true",
		" hide_in_company: false",
		" hide_colliding: true",
		" force_speed_limiter: false",
		" mods_optioning: false",
		" service_no_collision: false",
		" in_menu_ghosting: false",
		" name_tags: true",
		" friends_only: false",
		" show_server: true",
		"}",
		"}",
		"",
	].join("\r\n");
}

const template = {
	id: "ets2",
	displayName: "Euro Truck Simulator 2",
	type: "ets2",
	// The panel watches eurotrucks2_server.exe, the program the start script runs (name unverified, see the header).
	method: "process",
	updateAppId: "1948160",
	storeAppId: "227300",
	sharedInstall: false,
	// SteamCMD puts the server's files in the install folder; the program is under bin\win_x64.
	installLayoutRoot: "",
	description:
		"Euro Truck Simulator 2's dedicated server, installed from Steam app 1948160. The start script runs bin\\win_x64\\eurotrucks2_server.exe (checked on a real install). The panel writes the server's settings file with the name and the ports, and keeps the server's files in its data folder. Before the first start, copy the two package files (server_packages.sii and server_packages.dat), which you export from the game with export_server_packages, into the data folder (data\\Euro Truck Simulator 2 in the server folder, which the server creates on its first start); the server does not start without them. The panel's Stop closes the window and ends the program after 15 seconds, so back up before you stop or update.",
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	ports: [
		{ key: "port", label: "Game Port (TCP and UDP)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Query Port (TCP and UDP)", default: DEFAULT_QUERY_PORT },
	],
	resolveParams: async (raw) => ({
		sessionName: lobbyText(raw.sessionName) || lobbyText(raw.name) || DEFAULT_NAME,
	}),
	buildStartScriptFilename: () => "Start_ETS2.bat",
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE_PATH} -homedir "%~dp0${DATA_DIR}"`,
			"",
		].join("\r\n"),
	// Written before the first start, so the game reads these ports and this name instead of its own defaults.
	buildConfigFile: (p) => ({ relPath: `${HOME_DIR}\\${CONFIG_FILE}`, content: serverConfig(p) }),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "ets2",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		queryPort: portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port"),
		sessionName: lobbyText(p.sessionName) || lobbyText(p.name) || DEFAULT_NAME,
		configPath: `${p.installDir}\\${HOME_DIR}\\${CONFIG_FILE}`,
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "1948160",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The data folder holds the settings, the package files and the logs. Saved sessions: NOT FOUND in the dossier.
	backup: {
		paths: [{ base: "working", rel: DATA_DIR, label: "Server settings, package files and logs" }],
	},
	// The server writes server.log.txt in its home folder, which is the data folder here.
	logs: [{ kind: "file", base: "working", rel: `${DATA_DIR}/Euro Truck Simulator 2/${LOG_FILE}`, label: "Server log" }],
	// The launch line's flags are all written by the panel, so there is nothing to edit there.
	launchOptions: false,
};

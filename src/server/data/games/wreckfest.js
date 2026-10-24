// Wreckfest (Bugbear Entertainment). Dedicated server: Steam app 361580 (anonymous login; game app 228380). Built from the research
// dossier docs/research/games/wreckfest/ (confidence medium for the install and start line, low for the rest). NOT yet run on a real
// install: see 05-implementation-notes.md.
//  - the program is Wreckfest_x64.exe in the install folder (checked on a real install), started from the install folder with `-s server_config=server_config.cfg` (the developer
//    post's start line, per the dossier).
//  - the settings file is server_config.cfg in the install folder. The game makes it from initial_server_config.cfg on its first
//    start. The start script makes it the same way when it is missing, so the first start does not fail (the copy is our own line;
//    the dossier says the game's start script does this, and its text is not on any page).
//  - the panel writes no settings: the name is not in any evidenced key (the -server_set switch is a 2014 post), and a partial
//    file would replace the game's full defaults.
//  - the game port is 33540 (the Unraid template's "Game Port"). No port key is in the example config, so the start line cannot set
//    the port. The Steam query ports 27015 and 27016 are not declared: other templates use them, and the start line does not set them.
//
// Not done, and why:
//  - no mods field: the dossier says mods are copied by hand and named in `mods=`, and that is a manual step the panel does not do.
//  - no RCON stop. Checked on a real install: the panel's Stop closes the process cleanly (log.txt keeps no shutdown line).
//  - the game writes log.txt in the install folder and keeps its save data in savestemp\ (dedicated.ddst) there.
//  - no log file: the dossier names no log folder or log switch.

// Checked on a real install: SteamCMD puts Wreckfest_x64.exe (and a 32-bit Wreckfest.exe) in the install folder root. There is no server folder.
const EXE = "Wreckfest_x64.exe";
const CONFIG = "server_config.cfg";
const INITIAL_CONFIG = "initial_server_config.cfg";

// The Unraid template's game port. Not one of the other templates' ports, and the port above it is kept free too.
const DEFAULT_PORT = 33540;
const DEFAULT_QUERY_PORT = 33542;
const DEFAULT_STEAM_PORT = 33544;
const DEFAULT_NAME = "Wreckfest Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

const portOf = (value, fallback, what) => {
	if (value === undefined || value === null || value === "") return fallback;
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`The ${what} must be a whole number from 1 to 65535.`);
	return n;
};

const template = {
	id: "wreckfest",
	displayName: "Wreckfest",
	type: "wreckfest",
	// The panel watches Wreckfest.exe, the program the start script runs. Which process stays running is not in the dossier.
	method: "process",
	updateAppId: "361580",
	storeAppId: "228380",
	sharedInstall: false,
	// SteamCMD puts the install in the folder root; the server program sits in the server folder under it.
	installLayoutRoot: "",
	description:
		"Wreckfest's dedicated server (Wreckfest_x64.exe). It installs from Steam and reads server_config.cfg in its install folder, which the game creates on its first start. The panel's Stop closes it cleanly.",
	fields: [],
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Query Port (UDP)", default: DEFAULT_QUERY_PORT },
		{ key: "steamPort", label: "Steam Port (UDP)", default: DEFAULT_STEAM_PORT },
	],
	buildStartScriptFilename: () => "Start_Wreckfest.bat",
	buildStartScript: (p) => {
		const port = portOf(p.port, DEFAULT_PORT, "game port");
		const queryPort = portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port");
		const steamPort = portOf(p.steamPort, DEFAULT_STEAM_PORT, "Steam port");
		return [
			"@echo off",
			'cd /d "%~dp0"',
			// The game makes server_config.cfg from initial_server_config.cfg on its first start; this does the same when it is missing.
			`if not exist "${CONFIG}" if exist "${INITIAL_CONFIG}" copy /Y "${INITIAL_CONFIG}" "${CONFIG}" >nul`,
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} -s server_config=${CONFIG} -server_set game_port=${port} query_port=${queryPort} steam_port=${steamPort}`,
			"",
		].join("\r\n");
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "wreckfest",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		queryPort: portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port"),
		steamPort: portOf(p.steamPort, DEFAULT_STEAM_PORT, "Steam port"),
		configPath: `${p.installDir}\\${CONFIG}`,
		configPaths: { [CONFIG]: `${p.installDir}\\${CONFIG}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "361580",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The settings file is kept. The save folder is not in the dossier, so no other folder is listed.
	backup: {
		paths: [
			{ base: "working", rel: CONFIG, label: "Server settings" },
			{ base: "working", rel: "savestemp", label: "Save data" },
		],
	},
	// No log file is evidenced, so the Logs tab has nothing to read.
	logs: [{ kind: "file", base: "working", rel: "log.txt", label: "Server log" }],
	// The launch line is fixed (the program, the config switch), so the form does not add to it.
	launchOptions: false,
};

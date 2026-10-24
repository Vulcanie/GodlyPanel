// HYPERCHARGE: Unboxed (Steam dedicated server tool app 1045940; the game itself is app 523660). Anonymous SteamCMD install works
// (about 700 MB). Built from the research dossier docs/research/games/hyperchargeunboxed/ (confidence low). Checked on a
// real install (see 06-verification.md): UnboxedServer.exe is a launcher that keeps running beside UnboxedServer-Win64-Shipping.exe.
// The game takes play through PlayFab Party (an invite code in the log), so it listens on no fixed game port and answers no A2S;
// -Port and -QueryPort are passed but the log shows "listening on port 0" and only a random UDP port is bound.
//  - the program is UnboxedServer.exe, and the start line begins with the word Unboxed. Both come from one 2020 community guide
//    (steamah) that says it is a work in progress. The dossier has no official source for either.
//  - the map and game mode are fixed in the start line (Garage, co-op "Game=WV"), because the dossier gives no verified way to
//    change them from the panel. They are the example values of that guide.
//  - the ports are passed as -Port and -QueryPort. The guide gives both flags only as examples, with 7777 and 27015; the panel's own
//    ports are used instead so that the server, the firewall and the panel agree.
//  - there is no settings file: the dossier finds none, and the game's options are launch parameters.
//
// Not done, and why:
//  - no launch-arguments form: the game's options follow the map name after a "?", so an option appended to the end of the line
//    would be in the wrong place, and no value form for the switches is verified;
//  - no console socket (-UseConsoleSocket), which the guide calls experimental;
//  - no mods, no RCON.
//
// Stop: no quit command or RCON is documented. The panel closes the window and, after 15 seconds, ends the process.

const EXE = "UnboxedServer.exe";

// Chosen to avoid every other template's defaults, and the two ports after the game port (the panel's companion port and the next one).
const DEFAULT_PORT = 9400;
const DEFAULT_QUERY_PORT = 9402;
const DEFAULT_NAME = "HYPERCHARGE Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on, and no quote. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A port as a whole number, or the default when none was given. Anything else is refused. */
function portOf(value, fallback, what) {
	if (value === undefined || value === null || value === "") return fallback;
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`The ${what} must be a whole number from 1 to 65535.`);
	return n;
}

const template = {
	id: "hyperchargeunboxed",
	displayName: "HYPERCHARGE: Unboxed",
	type: "hyperchargeunboxed",
	// The panel watches the program the start script runs (UNVERIFIED: the name comes from one 2020 community guide).
	method: "process",
	updateAppId: "1045940",
	storeAppId: "523660",
	sharedInstall: false,
	// SteamCMD puts the server files at the install root (UNVERIFIED: the dossier has no install layout).
	installLayoutRoot: "",
	description:
		"HYPERCHARGE: Unboxed's dedicated server (UnboxedServer.exe, unverified). The panel starts it on the Garage map in co-op mode, with the game port and the query port as -Port and -QueryPort. The game's other options are launch parameters the guide describes but the panel does not set. On a real install the server opens no fixed port (players join through PlayFab with an invite code), so the ports shown are not bound.",
	fields: [],
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Query Port (UDP)", default: DEFAULT_QUERY_PORT },
	],
	buildStartScriptFilename: () => "Start_HYPERCHARGE.bat",
	buildStartScript: (p) => {
		const port = portOf(p.port, DEFAULT_PORT, "game port");
		const queryPort = portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port");
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} Unboxed Garage?Game=WV -Port=${port} -QueryPort=${queryPort}`,
			"",
		].join("\r\n");
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "hyperchargeunboxed",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		queryPort: portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port"),
		sessionName: batSafe(p.name, DEFAULT_NAME),
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "1045940",
		autoUpdate: false,
	}),
};

export default {
	template,
	// No save location is documented, so the panel's backup has nothing certain to keep and lists nothing.
	backup: { paths: [] },
	// No log path is documented.
	logs: [],
	// The launch line is written by the panel, and its options sit in the middle of it, so the form is not offered.
	launchOptions: false,
};

// Assetto Corsa Competizione (Kunos). Dedicated server: Steam tool app 1430110 ("Assetto Corsa Competizione Dedicated Server"); the
// game is app 805550. Built from the research dossier (docs/research/games/acc/, confidence low) and NOT yet run on a real install:
// see 05-implementation-notes.md.
//  - the program is server\accServer.exe. The start script changes into the server folder first, because the game reads its
//    settings from server\cfg, and starts accServer.exe with no arguments (none is documented).
//  - the settings files (settings.json, configuration.json, event.json and the rest) are UTF-16 little-endian. The panel reads and
//    writes files as UTF-8, so it cannot write them, and it cannot show them in a form either. Nothing is written into cfg\.
//  - so the server name, the passwords and the ports come from the user's own files. The game port 28110 is the panel's value for
//    the port checks only: the game takes its port from configuration.json, and that file must be set to the same number by hand.
//
// Not done, and why:
//  - no settings form and no config file: see above.
//  - no RCON stop: none is documented. The panel's Stop closes the window; the game's save on close is not known.
//  - no log folder: the dossier names none for this server.

const EXE = "accServer.exe";
const SERVER_DIR = "server";
const DEFAULT_PORT = 28110;
const DEFAULT_NAME = "Assetto Corsa Competizione Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
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
	id: "acc",
	displayName: "Assetto Corsa Competizione",
	type: "acc",
	// The panel watches accServer.exe, the program the start script runs. Which process stays running is not in the dossier.
	method: "process",
	updateAppId: "1430110",
	storeAppId: "805550",
	sharedInstall: false,
	// SteamCMD puts the install in the folder root; the server program sits in the server folder under it.
	installLayoutRoot: "",
	description:
		"Assetto Corsa Competizione's dedicated server (server\\accServer.exe). The panel starts it, but it cannot write or show the server's settings: they are UTF-16 files that you edit by hand, and the game port must be set to the same number in configuration.json. The server's anonymous install is unverified.",
	fields: [],
	ports: [{ key: "port", label: "Game Port (UDP and TCP)", default: DEFAULT_PORT }],
	buildStartScriptFilename: () => "Start_ACC.bat",
	buildStartScript: (p) => {
		portOf(p.port, DEFAULT_PORT, "game port");
		return [
			"@echo off",
			`cd /d "%~dp0${SERVER_DIR}"`,
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE}`,
			"",
		].join("\r\n");
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "acc",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "1430110",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The cfg folder holds the settings the user edits by hand.
	backup: { paths: [{ base: "working", rel: "server/cfg", label: "Server settings (cfg folder)" }] },
	// No log location is evidenced for this server, so the Logs tab has nothing to read.
	logs: [],
	// The launch line is fixed (the program only), so the form does not add to it.
	launchOptions: false,
};

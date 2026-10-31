// HumanitZ (Salmon Brain / the HumanitZ developers). Dedicated server: Steam app 2728330 (game app 1766060), anonymous SteamCMD login.
// Built from the research dossier docs/research/games/humanitz/ (confidence medium). NOT yet run on a real install: see
// docs/research/games/humanitz/05-implementation-notes.md for what must be checked first.
//
// Facts used (all from the dossier, sources in its 01..03 files):
//  - the Windows program is HumanitZServer.exe. The dossier conflicts: the wiki ReadMe and Supercraft (which quotes the developers'
//    readme) name HumanitZServer.exe, XGamingServer names HumanitZServer.exe. The most-evidenced name is used; see the notes;
//  - the start line is the dossier's Windows minimal line without the server name flag: -log -port=<n> -queryport=<n>. The
//    -steamservername flag is left out because no page says what it does (the server name is in the settings file instead);
//  - the settings are GameServerSettings.ini in the HumanitZServer folder. The game makes it when it is missing; the wiki says to
//    rename REF_GameServerSettings.ini to it and Supercraft says to copy it, so the panel copies the shipped REF file (the copy is
//    made only when the install has one, and never over a file that already exists).
//
// Not done, and why:
//  - no RCON: the dossier says RCON uses "a similar implementation to Valve's rcon" but does not verify the protocol, so the panel
//    does not use it (method "process"). RCONEnabled stays false, as the shipped file has it;
//  - no server name field: the name is ServerName in the settings file, which the Settings tab edits;
//  - the Steam query port is declared, since the dossier gives -queryport for the server browser.
//
// Stop: the dossier gives RCON "shutdown" and, on Linux, SIGINT; no Windows stop is documented. The panel closes the window.

const EXE = "HumanitZServer.exe";
const SETTINGS_REL = "HumanitZServer\\GameServerSettings.ini";
const REF_REL = "HumanitZServer\\REF_GameServerSettings.ini";
const LOG_REL = "HumanitZServer/Saved/Logs/HumanitZServer.log";

// Chosen to avoid the other templates' ports, and the ports after the game port (the panel's companion port and the query port's).
const DEFAULT_PORT = 27090;
const DEFAULT_QUERY_PORT = 27092;
const DEFAULT_NAME = "HumanitZ Server";

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
	id: "humanitz",
	displayName: "HumanitZ",
	type: "humanitz",
	// The panel watches HumanitZServer.exe, the program the start script runs (the name is the dossier's most-evidenced one).
	method: "process",
	updateAppId: "2728330",
	storeAppId: "1766060",
	sharedInstall: false,
	// SteamCMD puts the server files at the install root, with the HumanitZServer folder beside the program.
	installLayoutRoot: "",
	description:
		"HumanitZ's dedicated server (HumanitZServer.exe). The panel starts it with the game port and the Steam query port, and copies the game's settings file into HumanitZServer the first time. The game answers no Steam query (A2S) on either port on a fresh install, so a server browser may not list it until RCON is enabled in the settings file. Closing its window may not save the world.",
	fields: [],
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Steam Query Port (UDP)", default: DEFAULT_QUERY_PORT },
	],
	buildStartScriptFilename: () => "Start_HumanitZ.bat",
	buildStartScript: (p) => {
		const port = portOf(p.port, DEFAULT_PORT, "game port");
		const queryPort = portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port");
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} -log -port=${port} -queryport=${queryPort}`,
			"",
		].join("\r\n");
	},
	// The shipped REF file becomes the server's settings file. Never over one already there (the create flow skips it then).
	copyInstalledFiles: [{ from: REF_REL, to: SETTINGS_REL }],
	buildServerEntry: (p) => ({
		name: p.name,
		type: "humanitz",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		queryPort: portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port"),
		sessionName: batSafe(p.name, DEFAULT_NAME),
		configPath: `${p.installDir}\\${SETTINGS_REL}`,
		configPaths: {
			"GameServerSettings.ini": `${p.installDir}\\${SETTINGS_REL}`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "2728330",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The settings file and the saved world (HumanitZServer/Saved, which holds the save named SaveName). The Logs folder inside it is left out.
	backup: {
		paths: [
			{ base: "working", rel: "HumanitZServer/Saved", label: "Saved worlds and settings", exclude: ["Logs"] },
			{ base: "working", rel: "HumanitZServer/GameServerSettings.ini", label: "Server settings" },
		],
	},
	logs: [{ kind: "file", base: "working", rel: LOG_REL, label: "Server log" }],
	// The launch line is written by the panel, so the form does not add to it.
	launchOptions: false,
	// The server mounts every .pak under Content/Paks, the ~mods folder included, so a .pak dropped there loads with no setting.
	// The folder sits inside the HumanitZServer folder the panel already runs from, so the working base is right.
	mods: {
		adapter: "folder",
		label: "Mods",
		dir: { base: "working", rel: "HumanitZServer/Content/Paks/~mods" },
		accepts: [".pak"],
		sources: ["github", "url"],
		note: "Drop .pak mod files here. Every player needs the same mods. Stop the server and back up its Saved folder before changing mods.",
	},
};

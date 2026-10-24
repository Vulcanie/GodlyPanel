// Day of Dragons (Steam dedicated server app 1088320, anonymous SteamCMD install). Built from the research dossier
// docs/research/games/dayofdragons/ (confidence medium); checked on a real install, see 06-verification.md.
// The root DragonsServer.exe is a launcher; it stays alive beside Dragons/Binaries/Win64/DragonsServer-Win64-Shipping.exe, which holds the port.
//  - the program is DragonsServer.exe in the install root. Only one community guide (SurvivalServers) gives that name and path;
//    the developer post does not name the program. Which program stays running is not documented, so the panel watches the same exe.
//  - the start line is the community guide's line without its start prefix: -SteamServerName="<name>" -log. Neither flag is
//    documented by the developers; -log is a standard Unreal flag, and the name flag is taken from the guide's example.
//  - the settings file is Dragons/Saved/Config/WindowsServer/Game.ini. The panel writes only the section header the developer post
//    gives; every other key is set in the Settings tab. Whether the game makes the file on first run is not documented.
//
// Found on a real install: -QueryPort=<port> is honoured and A2S answers there with the server name. -Port is ignored and the server
// binds no game UDP port at all (play goes through Steam networking), so the port the panel shows is the query port.
//
// Not done, and why:
//  - no RCON: the dossier finds none;
//  - no mods: the dossier finds no mod support;
//  - no whitelist, ban list or server password list keys beyond the developer post's own (the conflicting key names are left out).
//
// Stop: no quit command or RCON is documented. The panel closes the window and, after 15 seconds, ends the process.

const EXE = "DragonsServer.exe";
const CONFIG_REL = "Dragons\\Saved\\Config\\WindowsServer\\Game.ini";
// The section header the developer post gives (lowercase). The hosting guides use a different spelling of the same class path; see the notes.
const SECTION = "[/game/_dev/runtime/classes/dragonsgi.dragonsgi_c]";

// Chosen to avoid every other template's defaults, and the two ports after the game port (the panel's companion port and the next one).
const DEFAULT_PORT = 9300;
const DEFAULT_NAME = "Day of Dragons Server";

/** A text safe to put inside a .bat `start` title and the -SteamServerName value: nothing cmd would act on, and no quote. */
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
	id: "dayofdragons",
	displayName: "Day of Dragons",
	type: "dayofdragons",
	// The panel watches the program the start script runs (the launcher stays alive).
	method: "process",
	updateAppId: "1088320",
	storeAppId: "1088090",
	sharedInstall: false,
	// SteamCMD puts the server files at the install root, as the community guide's C:\dayofdragons\DragonsServer.exe path shows.
	installLayoutRoot: "",
	description:
		"Day of Dragons' dedicated server (DragonsServer.exe). The panel starts it with the server name, -log and the query port. The game's settings are in Dragons\\Saved\\Config\\WindowsServer\\Game.ini, which the panel creates with the section header only. The server opens no game port of its own (players connect through Steam), so the only port is the query port that the server list and the panel's online check use.",
	fields: [],
	ports: [{ key: "port", label: "Query Port (UDP)", default: DEFAULT_PORT }],
	buildStartScriptFilename: () => "Start_DayofDragons.bat",
	buildStartScript: (p) => {
		const port = portOf(p.port, DEFAULT_PORT, "game port");
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} -SteamServerName="${batSafe(p.name, DEFAULT_NAME)}" -log -QueryPort=${port}`,
			"",
		].join("\r\n");
	},
	// The header only. The keys the panel sets are written by the Settings tab, and everything else keeps the game's own defaults.
	buildConfigFile: () => ({
		relPath: CONFIG_REL,
		content: [SECTION, ""].join("\r\n"),
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "dayofdragons",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		sessionName: batSafe(p.name, DEFAULT_NAME),
		configPath: `${p.installDir}\\${CONFIG_REL}`,
		configPaths: {
			"Game.ini": `${p.installDir}\\${CONFIG_REL}`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "1088320",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The settings file and the saved world (Dragons/Saved holds the config and the save data, per the community guide).
	backup: {
		paths: [{ base: "working", rel: "Dragons/Saved", label: "Saved worlds and settings", exclude: ["Logs"] }],
	},
	logs: [{ kind: "file", base: "working", rel: "Dragons/Saved/Logs/Dragons.log", label: "Server log" }],
	// The launch line is written by the panel, so the form does not add to it.
	launchOptions: false,
};

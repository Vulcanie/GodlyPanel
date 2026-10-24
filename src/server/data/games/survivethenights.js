// Survive the Nights (Steam dedicated server, app 1502300, anonymous SteamCMD install). Built from the research dossier
// docs/research/games/survivethenights/ (confidence low); checked on a real install, see 06-verification.md.
//  - the program is STN_Dedicated_Server.exe in the install root (a Unity build). The dossier had no name; the guess was wrong.
//  - the settings file is Config/ServerConfig.txt. The game creates it with every key at first start, with ServerPort=7950 and
//    UseUpnp=True; the panel writes the name, ServerPort and UseUpnp=False before the first start.
//  - the start line has no arguments: none is documented, and none was needed.
//
// Not done, and why:
//  - no settings catalog file in the UI: there is no parser for the file's // comments.
//  - no password or mods field.
//  - no stop command: none is documented. The panel closes the window, and the game may not save first.

const PROGRAM = "STN_Dedicated_Server.exe";

// The sample ServerConfig.txt's ServerPort, kept as the default.
const DEFAULT_PORT = 7950;
const DEFAULT_NAME = "Survive the Nights Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on, and no quote. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A text safe inside a quoted ServerConfig.txt value: no quote, line break or comment start. */
const cfgSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"]/g, "")
		.replace(/\/\//g, "/")
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
	id: "survivethenights",
	displayName: "Survive the Nights",
	type: "survivethenights",
	// The panel watches the program the start script runs.
	method: "process",
	updateAppId: "1502300",
	sharedInstall: false,
	// SteamCMD puts the server files at the install root (the dossier does not say otherwise).
	installLayoutRoot: "",
	description:
		"Survive the Nights' dedicated server. The panel starts the server program with no arguments. Unconfirmed: the program's name, and whether a stop saves the world. The panel writes the server name, the game port and UPnP off into Config/ServerConfig.txt before the first start; the game fills in the other settings, which you can edit in that file.",
	fields: ["sessionName"],
	fieldMeta: { sessionName: { label: "Server Name", type: "text" } },
	ports: [{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT }],
	resolveParams: async (raw) => ({ sessionName: cfgSafe(raw.sessionName, "") || cfgSafe(raw.name, DEFAULT_NAME) }),
	// The game makes Config/ServerConfig.txt with every key at first start and keeps the keys it is given. The panel writes the few it
	// must own: the name, the port (the game would otherwise use 7950) and UPnP off (the game's own default is on).
	buildConfigFile: (p) => ({
		relPath: "Config\\ServerConfig.txt",
		content: [
			`ServerName="${cfgSafe(p.sessionName, "") || cfgSafe(p.name, DEFAULT_NAME)}"`,
			`ServerPort=${portOf(p.port, DEFAULT_PORT, "game port")}`,
			"UseUpnp=False",
			"UseSteamRelays=false",
			"",
		].join("\r\n"),
	}),
	buildStartScriptFilename: () => "Start_SurvivetheNights.bat",
	buildStartScript: (p) => {
		portOf(p.port, DEFAULT_PORT, "game port");
		return ["@echo off", 'cd /d "%~dp0"', `start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${PROGRAM}`, ""].join("\r\n");
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "survivethenights",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: PROGRAM,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "1502300",
		autoUpdate: false,
	}),
};

export default {
	template,
	// Found on a real install: Config/ServerConfig.txt, and the world in .stn-server-V8.db (with -shm and -wal) in the server folder.
	backup: {
		paths: [
			{ base: "working", rel: "Config", label: "Server settings and world metadata" },
			{ base: "working", rel: ".stn-server-V8.db", label: "World database" },
		],
	},
	// No log file is documented.
	logs: [],
	launchOptions: false,
};

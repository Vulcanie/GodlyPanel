// Age of Chivalry (Team Chivalry). Dedicated server: Steam app 17515 (game app 17510), installed anonymously by the panel's SteamCMD call.
// Built from the research dossier docs/research/games/ageofchivalry/ (confidence low). NOT yet run on a real install: see
// docs/research/games/ageofchivalry/05-implementation-notes.md for what must be checked first.
//
// Facts used (all from the dossier, sources in its 01..03 files):
//  - the program is srcds.exe in the install folder, started with -game ageofchivalry (the mod folder inside the install);
//  - the start line is the FireDaemon example, minus -autoupdate (FireDaemon says Valve has not implemented it on Windows):
//      -console -game ageofchivalry -secure +map aoc_siege +log on +maxplayers 32 -port <n> +ip 0.0.0.0 +exec server.cfg
//  - the settings are Source console commands in ageofchivalry\cfg\server.cfg, one per line; the panel writes the server name
//    there when it creates the server (hostname) and the file shows sv_lan 0 as its default.
//
// Not done, and why:
//  - no mods field: the dossier finds no way a dedicated server loads mods;
//  - no RCON and no rcon_password: the dossier gives no RCON port or protocol the panel could speak (method "process");
//  - no query port: Source answers its query on the game port itself, and the dossier's 27016 comes from one plugin only, so it is
//    not declared. The port after the game port is kept free by the panel anyway;
//  - no second Steam app: the dossier names no base app and its FireDaemon install is app 17515 alone. The task brief says the server
//    depends on Source Dedicated Server (app 310); the dossier does not show that, so the panel installs only app 17515 and the notes
//    list it as the first thing to check on a real install.
//
// Stop: the dossier finds no console quit command and FireDaemon says the server does not respond to a graceful shutdown. The panel
// closes the window; the server may not save first.

const EXE = "srcds.exe";
const GAME_DIR = "ageofchivalry";
const CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "aoc_siege";
// The dossier's example value (FireDaemon and the WindowsGSM plugin both use 32). Not a documented maximum.
const MAX_PLAYERS = 32;
// Chosen to avoid the other templates' ports, and the port after it (the panel's companion port) and the two after that.
const DEFAULT_PORT = 27030;
const DEFAULT_NAME = "Age of Chivalry Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on, and no quote. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/**
 * A server name for a line of server.cfg. A quote, a backslash, a semicolon (which separates commands on one line) or a slash (which
 * starts a comment) would change what the game reads, so they are dropped rather than sent.
 */
export function cfgName(value, fallback) {
	return (
		String(value ?? "")
			.replace(/[\u0000-\u001f"\\;/]/g, "")
			.replace(/\s+/g, " ")
			.trim() || fallback
	);
}

/** A port as a whole number, or the default when none was given. Anything else is refused. */
function portOf(value, fallback, what) {
	if (value === undefined || value === null || value === "") return fallback;
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`The ${what} must be a whole number from 1 to 65535.`);
	return n;
}

const template = {
	id: "ageofchivalry",
	displayName: "Age of Chivalry",
	type: "ageofchivalry",
	// The panel watches srcds.exe, the program the start script runs.
	method: "process",
	updateAppId: "17515",
	storeAppId: "17510",
	sharedInstall: false,
	// SteamCMD puts the server files at the install root: srcds.exe and the ageofchivalry folder.
	installLayoutRoot: "",
	description:
		"Age of Chivalry's dedicated server (srcds.exe). The panel starts it on one game port with the server name, and writes ageofchivalry\\cfg\\server.cfg. Unconfirmed: whether the server needs a second Steam app installed beside it, whether anonymous SteamCMD works for it, and whether closing its window saves the world.",
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	ports: [{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT }],
	resolveParams: async (raw) => ({
		sessionName: cfgName(raw.sessionName, "") || cfgName(raw.name, DEFAULT_NAME),
	}),
	buildStartScriptFilename: () => "Start_AgeOfChivalry.bat",
	buildStartScript: (p) => {
		const port = portOf(p.port, DEFAULT_PORT, "game port");
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} -console -game ${GAME_DIR} -secure +map ${DEFAULT_MAP} +log on +maxplayers ${MAX_PLAYERS} -port ${port} +ip 0.0.0.0 +exec server.cfg`,
			"",
		].join("\r\n");
	},
	// server.cfg: the name the panel was given, and the dossier's own defaults for the two settings it names (sv_lan 0, log on).
	buildConfigFile: (p) => {
		const name = cfgName(p.sessionName, "") || cfgName(p.name, DEFAULT_NAME);
		return {
			relPath: CFG_REL,
			content: ["// Age of Chivalry server settings, written by GodlyPanel when the server was created.", `hostname "${name}"`, "sv_lan 0", "log on", ""].join("\r\n"),
		};
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "ageofchivalry",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		sessionName: cfgName(p.sessionName, "") || cfgName(p.name, DEFAULT_NAME),
		configPath: `${p.installDir}\\${CFG_REL}`,
		configPaths: {
			"server.cfg": `${p.installDir}\\${CFG_REL}`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "17515",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The settings file and the folder of configs the server reads. The dossier names no save folder, so saves are not listed.
	backup: {
		paths: [{ base: "working", rel: `${GAME_DIR}/cfg`, label: "Server settings" }],
	},
	// The dossier names no log file: `+log on` prints to the console, which the panel keeps for a server started with no window.
	logs: [],
	// The launch line is written by the panel, so the form does not add to it.
	launchOptions: false,
};

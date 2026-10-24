// The Front (Steam). Dedicated server: Steam app 2612550 (Windows, anonymous login), resolved in the research dossier
// docs/research/games/thefront/ (app-id resolution, 2026-10-22). Confidence low: the dossier is built from host guides, not from the
// game's own documentation. Checked on a real install (see 06-verification.md): the program starts, binds the game, beacon and query ports
// (UDP) and the shutdown service port (TCP), and answers A2S on the query port.
//  - the program is ProjectWar\Binaries\Win64\TheFrontServer.exe, started from the install folder. The dossier's only full command line
//    (a host guide) gives the arguments used here. The other source names ProjectWarServer.exe; see the notes.
//  - the settings the manager reads are in TheFrontManager\ServerConfig_.ini ([BaseServerConfig]). The panel writes the name and the
//    join password there when it creates the server, because the config file overrides the launch line (per the same host guide).
//  - ports: the game port is 7900 UDP. The beacon (7901), query (7902) and shutdown service (7903) ports are the ones above it, as in the
//    host guide's PORT, PORT+1, PORT+2 and PORT+3 arguments.
//
// Not done, and why:
//  - no stop command: the dossier finds no console or RCON command. The shutdown service port (7903) is said to be used for clean stops,
//    but the dossier gives no protocol for it, so the panel closes the window like any other game without one.
//  - no ServerConfig_.ini keys for the ports: the host guides give placeholder numbers only, and the launch line carries the ports.
//  - no mods field: the dossier finds no official mod method.
//  - no ServerAdminAccounts, ServerFightModeType, IsCanChat, IsCanMail or self-damage keys written: their values are not documented.

const PROGRAM = "ProjectWar\\Binaries\\Win64\\TheFrontServer.exe";
const PROCESS_NAME = "TheFrontServer.exe";

// Chosen to avoid the other templates' ports and the ports next to them (checked by the unit test).
const DEFAULT_PORT = 7900;
const DEFAULT_NAME = "The Front Server";
// The host guide's launch line caps the server at 8 players and sets the same queue threshold. Kept fixed here.
const MAX_PLAYERS = 8;

/** A text safe to put inside a .bat `start` title or a quoted launch value: nothing cmd would act on, and no quote. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A text safe to put in a quoted INI value: no quote and no line break. */
const iniSafe = (value) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"]/g, "")
		.trim();

/** A port as a whole number, or the default when none was given. Anything else is refused. */
function portOf(value, fallback, what) {
	if (value === undefined || value === null || value === "") return fallback;
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`The ${what} must be a whole number from 1 to 65535.`);
	return n;
}

const serverName = (p) => batSafe(p.sessionName, "") || batSafe(p.name, DEFAULT_NAME);

const template = {
	id: "thefront",
	displayName: "The Front",
	type: "thefront",
	// The panel watches TheFrontServer.exe, the program the start script runs. Whether a second process stays up after a stop is
	// one of the things to check on a real install.
	method: "process",
	updateAppId: "2612550",
	storeAppId: "2285150",
	sharedInstall: false,
	// SteamCMD installs straight into the server folder, so ProjectWar\ sits at its root.
	installLayoutRoot: "",
	description:
		"The Front's dedicated server (TheFrontServer.exe, Windows). The panel starts it with the game port and the server name, and writes the server name and join password to TheFrontManager\\ServerConfig_.ini. Unconfirmed: which exe name the current build uses, whether the server starts from a fresh install without the client's files, and whether a stop saves the world.",
	fields: ["sessionName", "serverPassword"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		serverPassword: { label: "Join Password (leave empty for a public server)", type: "text" },
	},
	ports: [{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT }],
	// The beacon, query and shutdown service ports are the three above the game port, as the host guide's launch line has them.
	implicitPorts: [
		{ offset: 1, label: "its beacon port" },
		{ offset: 2, label: "its query port" },
		{ offset: 3, label: "its shutdown service port" },
	],
	resolveParams: async (raw) => ({
		sessionName: batSafe(raw.sessionName, "") || batSafe(raw.name, DEFAULT_NAME),
		serverPassword: iniSafe(raw.serverPassword),
	}),
	buildStartScriptFilename: () => "Start_TheFront.bat",
	buildStartScript: (p) => {
		const port = portOf(p.port, DEFAULT_PORT, "game port");
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${PROGRAM} ProjectWar ProjectWar_Start ?Listen?MaxPlayers=${MAX_PLAYERS} -server -game -QueueThreshold=${MAX_PLAYERS} -ServerName="${serverName(p)}" -port=${port} -BeaconPort=${port + 1} -QueryPort=${port + 2} -ShutDownServicePort=${port + 3}`,
			"",
		].join("\r\n");
	},
	// The manager's settings file. The dossier says the file is not always created on install, so the panel writes the two keys it
	// knows about. Every other key keeps the game's own default (or whatever the manager writes on its first run).
	buildConfigFile: (p) => ({
		relPath: "TheFrontManager\\ServerConfig_.ini",
		content: [
			"[BaseServerConfig]",
			`ServerName="${serverName(p)}"`,
			p.serverPassword ? `ServerPassword="${iniSafe(p.serverPassword)}"` : "ServerPassword=",
			"",
		].join("\r\n"),
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "thefront",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		sessionName: serverName(p),
		configPath: `${p.installDir}\\TheFrontManager\\ServerConfig_.ini`,
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: PROCESS_NAME,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "2612550",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The manager's settings file is the only file the panel knows of. The world is a MariaDB database plus files whose folders the
	// dossier does not give (see the notes), so a backup does not yet keep the world.
	backup: {
		paths: [
			{ base: "working", rel: "ProjectWar/Saved", label: "Saved worlds and settings", exclude: ["Logs"] },
			{ base: "working", rel: "TheFrontManager/ServerConfig_.ini", label: "Server settings" },
		],
	},
	logs: [{ kind: "file", base: "working", rel: "ProjectWar/Saved/Logs/ProjectWar.log", label: "Server log" }],
	// The launch line is written by the panel, so the form does not add to it.
	launchOptions: false,
};

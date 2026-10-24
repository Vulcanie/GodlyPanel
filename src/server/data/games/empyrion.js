// Empyrion - Galactic Survival dedicated server (Steam app 530870, anonymous SteamCMD install, Windows 64-bit only). Built from the
// research dossier docs/research/games/empyrion/ (confidence medium). Checked on a real install, see 06-verification.md: the game reads dedicated.yaml from the install ROOT
// (not DedicatedServer), keeps Saves and Logs in the root, and uses the game port, +1 and +3; telnet saveandexit stops it cleanly.
//  - the program is EmpyrionDedicated.exe in the DedicatedServer folder of the install. The Pterodactyl egg and the FireDaemon guide
//    both run it directly; the Red Switches guide starts EmpyrionLauncher.exe -startDedi instead. The egg and FireDaemon are used here.
//    Which of the two processes stays running is NOT FOUND; the panel watches EmpyrionDedicated.exe.
//  - the settings file is dedicated.yaml in the install root (checked), written by the panel with the keys the XGamingServer page
//    gives. Whether the game makes the file itself is NOT FOUND, so the panel writes the whole file: keys left out take the game's own
//    defaults, which is unverified.
//  - the ports: 30000 is the game port (TCP and UDP, the Red Switches guide's "30000-30003"); 30001 to 30003 are kept free as the game's
//    own. The telnet console is 30004 (Red Switches and XGamingServer). The egg uses 27015/27016 and a hard-coded telnet 1030; those are
//    not used here, see the notes.
//  - stop: the panel's existing telnet hook sends "saveandexit 0" (the command the Red Switches guide and the egg give) before it closes
//    the window. The egg says telnet has no authentication, and XGamingServer says the telnet port is localhost only; the panel
//    connects to 127.0.0.1 only. A real stop saved the world and quit (log: scheduled quit, PfServer shutdown done).
//
// Not done, and why:
//  - no RCON and no query port: the dossier finds no RCON; the query port the egg gives (27016) is not used.
//  - no mods: the dossier names scenarios (folders in Content/Scenarios with CustomScenario in the yaml) as the mod system. The panel
//    does not download or copy scenarios, so no scenario setting is offered.
//  - no dedicated.yaml editor: the format has no parser in the panel, so the Settings tab offers only the launch arguments.

const EXE = "EmpyrionDedicated.exe";
const SERVER_DIR = "DedicatedServer";
const CONFIG_FILE = "dedicated.yaml";
// The egg's log path, relative to the server's folder (the Logs folder sits beside DedicatedServer).
const LOG_REL = "../Logs/server/server.log";
const LOG_FROM_ROOT = "Logs/server/server.log";

const DEFAULT_PORT = 30000;
const DEFAULT_TELNET_PORT = 30004;
const DEFAULT_NAME = "Empyrion Server";
const DEFAULT_MAX_PLAYERS = 20;
// The XGamingServer page's defaults for the save name, the world seed and the mode.
const SAVE_NAME = "MyGame";
const SEED = 1011345;
const MODE = "Survival";
// The telnet command that makes the server save and close (Red Switches guide; the egg's stop command).
const TELNET_STOP = "saveandexit 0";

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

/** A YAML double-quoted string. A JSON string is one, so quotes, backslashes and control characters are escaped. */
const yamlString = (value) => JSON.stringify(String(value ?? ""));

function dedicatedYaml(p) {
	const port = portOf(p.port, DEFAULT_PORT, "game port");
	const telnetPort = portOf(p.telnetPort, DEFAULT_TELNET_PORT, "telnet port");
	const maxPlayers = portOf(p.maxPlayers, DEFAULT_MAX_PLAYERS, "maximum number of players");
	return [
		"ServerConfig:",
		`  Srv_Port: ${port}`,
		`  Srv_Name: ${yamlString(p.sessionName || p.name || DEFAULT_NAME)}`,
		`  Srv_Password: ${yamlString(p.serverPassword)}`,
		`  Srv_MaxPlayers: ${maxPlayers}`,
		"  Srv_Public: true",
		"  Tel_Enabled: true",
		`  Tel_Port: ${telnetPort}`,
		'  Tel_Pwd: ""',
		"GameConfig:",
		`  GameName: ${yamlString(SAVE_NAME)}`,
		`  Mode: ${MODE}`,
		`  Seed: ${SEED}`,
		'  CustomScenario: ""',
		"",
	].join("\r\n");
}

const template = {
	id: "empyrion",
	displayName: "Empyrion - Galactic Survival",
	type: "empyrion",
	// The panel watches the server exe (UNVERIFIED which of the two processes stays running; see the header).
	method: "process",
	updateAppId: "530870",
	storeAppId: "383120",
	sharedInstall: false,
	// SteamCMD puts the server files in a DedicatedServer folder, which the egg and the FireDaemon guide both start from.
	installLayoutRoot: "",
	description:
		"Empyrion's dedicated server (EmpyrionDedicated.exe, Windows only). The panel writes dedicated.yaml with the name, the join password and the ports, then starts the server. Stopping it asks the server to save and exit over telnet first (not yet checked on a real install).",
	fields: ["sessionName", "serverPassword"],
	fieldMeta: { sessionName: { label: "Server name (shown in the server browser)", type: "text" } },
	ports: [
		{ key: "port", label: "Game Port (TCP and UDP)", default: DEFAULT_PORT },
		{ key: "telnetPort", label: "Telnet Port (TCP, this PC only)", default: DEFAULT_TELNET_PORT },
	],
	// The game uses 30001 to 30003 beside the game port (the Red Switches guide's 30000-30003 range).
	implicitPorts: [
		{ offset: 1, label: "its internal game port" },
		{ offset: 2, label: "its game port" },
		{ offset: 3, label: "its game port" },
	],
	buildStartScriptFilename: () => "Start_Empyrion.bat",
	buildStartScript: (p) => {
		portOf(p.port, DEFAULT_PORT, "game port");
		return [
			"@echo off",
			`cd /d "%~dp0${SERVER_DIR}"`,
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} -batchmode -nographics -logFile "${LOG_REL}"`,
			"",
		].join("\r\n");
	},
	buildConfigFile: (p) => ({
		relPath: CONFIG_FILE,
		content: dedicatedYaml(p),
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "empyrion",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		telnetPort: portOf(p.telnetPort, DEFAULT_TELNET_PORT, "telnet port"),
		// The panel's telnet save hook sends this before it closes the window (it would send "saveworld" otherwise).
		telnetSaveCommand: TELNET_STOP,
		sessionName: batSafe(p.sessionName || p.name, DEFAULT_NAME),
		serverPassword: p.serverPassword,
		configPath: `${p.installDir}\\${CONFIG_FILE}`,
		configPaths: {
			[CONFIG_FILE]: `${p.installDir}\\${CONFIG_FILE}`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "530870",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The yaml the panel wrote, and the saved worlds. Saves are in Saves/Games (checked: Saves/Games/DediGame).
	backup: {
		paths: [
			{ base: "working", rel: CONFIG_FILE, label: "Server settings" },
			{ base: "working", rel: "Saves/Games", label: "Saved games" },
		],
	},
	logs: [{ kind: "file", base: "working", rel: LOG_FROM_ROOT, label: "Server log" }],
	// The start script's launch line gets the "Launch options" form.
	launchOptions: true,
};

// Assetto Corsa (Kunos), the stock dedicated server. Steam app 302550 (anonymous login NOT confirmed by any source; the game app is
// 244210). Built from the research dossier (docs/research/games/assettocorsa/, confidence low) and NOT yet run on a real install:
// see 05-implementation-notes.md.
//  - the program is acServer.exe in the install folder's root, started with no arguments (none is documented).
//  - the settings are in cfg\\server_cfg.ini (INI). The panel writes it before the first start, with the name, the game ports
//    (UDP and TCP, which must match) and the HTTP port, so the game uses the ports the panel reports. Other keys are left to the game.
//  - the panel's ports are 27600 (game, UDP and TCP) and 27602 (HTTP, TCP). The panel reserves 27601 as its own companion port.
//
// Not done, and why:
//  - no entry_list.ini: no source shows a car slot file that works without knowing the installed car names. Without slots the
//    server may not take players: verify on a real install.
//  - no session sections: the sources' sample file has them, but their defaults conflict, so the panel writes none.
//  - no RCON stop: none is documented. The panel's Stop closes the window; whether that saves the session is not known.

const EXE = "acServer.exe";
const CONFIG_REL = "cfg\\server_cfg.ini";
const LOG_DIR = "log";

const DEFAULT_PORT = 27600;
const DEFAULT_HTTP_PORT = 27602;
const DEFAULT_NAME = "Assetto Corsa Server";
// The track the sources give as the default. The car list is left empty, as the sources give it.
const DEFAULT_TRACK = "monza";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A value for an INI line: no quotes, brackets, semicolons, equals signs or control characters, which the file format reads. */
const iniText = (value, fallback) =>
	String(value ?? "")
		.replace(/[;=]/g, " ")
		.replace(/["[\]\u0000-\u001f]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A port as a whole number, or the default when none was given. Anything else is refused. */
function portOf(value, fallback, what) {
	if (value === undefined || value === null || value === "") return fallback;
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`The ${what} must be a whole number from 1 to 65535.`);
	return n;
}

/** The contents of cfg\\server_cfg.ini: the [SERVER] section with the name, the track, the ports and the lobby listing. */
function serverConfig(p) {
	const name = iniText(p.sessionName, "") || iniText(p.name, DEFAULT_NAME);
	const port = portOf(p.port, DEFAULT_PORT, "game port");
	const httpPort = portOf(p.httpPort, DEFAULT_HTTP_PORT, "HTTP port");
	return [
		"[SERVER]",
		`NAME=${name}`,
		`TRACK=${DEFAULT_TRACK}`,
		"CONFIG_TRACK=",
		"MAX_CLIENTS=24",
		`UDP_PORT=${port}`,
		`TCP_PORT=${port}`,
		`HTTP_PORT=${httpPort}`,
		"REGISTER_TO_LOBBY=1",
		"PASSWORD=",
		"ADMIN_PASSWORD=",
		"",
	].join("\r\n");
}

const template = {
	id: "assettocorsa",
	displayName: "Assetto Corsa",
	type: "assettocorsa",
	// The panel watches acServer.exe, the program the start script runs.
	method: "process",
	updateAppId: "302550",
	storeAppId: "244210",
	sharedInstall: false,
	// SteamCMD puts acServer.exe in the install folder's root.
	installLayoutRoot: "",
	description:
		"Assetto Corsa's stock dedicated server (acServer.exe). The panel writes cfg\\server_cfg.ini with the name and the ports before the first start. The server needs no car slot file from the panel, so check that players can join: the sources do not show a working one without the car names. Its Stop closes the window; the game's own stop is not documented.",
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	ports: [
		{ key: "port", label: "Game Port (UDP and TCP)", default: DEFAULT_PORT },
		{ key: "httpPort", label: "HTTP Port (TCP)", default: DEFAULT_HTTP_PORT },
	],
	resolveParams: async (raw) => ({
		sessionName: iniText(raw.sessionName, "") || iniText(raw.name, DEFAULT_NAME),
	}),
	buildStartScriptFilename: () => "Start_AssettoCorsa.bat",
	buildStartScript: (p) => {
		portOf(p.port, DEFAULT_PORT, "game port");
		return ["@echo off", 'cd /d "%~dp0"', `start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE}`, ""].join("\r\n");
	},
	// Written before the first start, so the game reads these ports and this name instead of its own defaults.
	buildConfigFile: (p) => ({ relPath: CONFIG_REL, content: serverConfig(p) }),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "assettocorsa",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		httpPort: portOf(p.httpPort, DEFAULT_HTTP_PORT, "HTTP port"),
		sessionName: iniText(p.sessionName, "") || iniText(p.name, DEFAULT_NAME),
		configPath: `${p.installDir}\\${CONFIG_REL}`,
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "302550",
		autoUpdate: false,
	}),
};

export default {
	template,
	backup: { paths: [{ base: "working", rel: "cfg", label: "Server settings (cfg folder)" }] },
	// The server writes its logs to the log folder beside acServer.exe (log.txt, lobby.log, crash.log, per the sources).
	logs: [{ kind: "dir", base: "working", rel: LOG_DIR, label: "Server logs" }],
	// The launch line is fixed (the program only), so the form does not add to it.
	launchOptions: false,
};

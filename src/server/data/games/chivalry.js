// Chivalry: Medieval Warfare (Torn Banner Studios). Dedicated server: Steam app 220070 (game app 219640), built from the research dossier
// docs/research/games/chivalry/ and checked on a real Windows install (06-verification.md): it installs anonymously (1.5 GB), UDK.exe in
// Binaries\Win64 stays running with both UDP ports bound, and the panel's Stop closes it gracefully. The query port does not answer
// A2S (the game port replies with a non-A2S packet), so the panel's status comes from the process. Whether the game reads the
// PCServer-UDKGame.ini the panel writes was not proven without a client. Facts used, with where the dossier got them:
//  - the server program is UDK.exe in Binaries\Win64 (FireDaemon page; the panel's watched process is the same exe).
//  - start line: MAPNAME?steamsockets -dedicated=true -seekfreeloadingserver, and the last flag "should not be removed" (FireDaemon page).
//  - ports: UDP game port 7000 and query port 7010, the Unraid template's defaults, passed as ?port= and ?queryport= on the map string
//    (Unraid template only; the order of the options is not confirmed).
//  - settings: PCServer-UDKGame.ini in UDKGame\Config, sections [Engine.GameReplicationInfo] (ServerName) and [Engine.AccessControl]
//    (AdminPassword). Both from the community sample (xgamingserver), not an official file.
//  - the admin password can't be empty (Unraid template).
//  - stop: the panel closes the window; the game does not answer a graceful stop (FireDaemon page), so a clean save is not confirmed.

const EXE = "UDK.exe";
const RUN_DIR = "Binaries\\Win64";
const CONFIG_REL = "UDKGame\\Config\\PCServer-UDKGame.ini";
const CONFIG_FILE = "PCServer-UDKGame.ini";

// The game's default ports (Unraid template). 7001 is held by the panel's rule; 7000-7012 are free in the other templates.
const DEFAULT_PORT = 7000;
const DEFAULT_QUERY_PORT = 7010;
// The first map the Unraid template uses, and the one the developer's own shortcut example names. Both are in the dossier.
const DEFAULT_MAP = "AOCFFA-Arena3_p";
const DEFAULT_NAME = "Chivalry Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A value for a line of the .ini file: a line break would start a new setting, and `;` starts a comment, so both are refused. */
function iniText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f;]/.test(text)) {
		throw new Error(`${what} cannot hold a semicolon or a line break. Use letters, digits, spaces and ordinary punctuation without a semicolon.`);
	}
	return text;
}

/** A map name goes straight onto the command line, so only letters, digits, underscores and hyphens are allowed. */
function mapName(value) {
	const text = String(value ?? "").trim() || DEFAULT_MAP;
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(text)) {
		throw new Error(`"${text.slice(0, 60)}" is not a map name. Use the map's name with no spaces or quotes, such as ${DEFAULT_MAP}.`);
	}
	return text;
}

const portOf = (value, fallback) => {
	const n = Math.floor(Number(value));
	return Number.isFinite(n) && n > 0 && n < 65536 ? n : fallback;
};

const template = {
	id: "chivalry",
	displayName: "Chivalry: Medieval Warfare",
	type: "chivalry",
	// The panel watches UDK.exe, the program the start script runs.
	method: "process",
	updateAppId: "220070",
	storeAppId: "219640",
	sharedInstall: false,
	// SteamCMD puts the install in the folder root; UDK.exe sits in Binaries\Win64 under it.
	installLayoutRoot: "",
	description:
		"Chivalry: Medieval Warfare's dedicated server (a UDK program, UDK.exe). It installs from Steam and reads its settings from PCServer-UDKGame.ini. The game and query ports are UDP. The panel's Stop closes the window; the game does not answer a graceful stop, so it may not save on the way out.",
	// The admin password is required: the Unraid template says it can't be empty. There is no join password: the dossier gives none.
	fields: ["sessionName", "adminPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		adminPassword: { label: "Admin Password (lets you run admin commands in the game; required)", type: "text" },
		mapCode: { label: `Map (the map's file name, such as ${DEFAULT_MAP})`, type: "text" },
	},
	ports: [
		{ key: "port", label: "Game Port (UDP; the port beside it is kept free too)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Query Port (UDP)", default: DEFAULT_QUERY_PORT },
	],
	resolveParams: async (raw) => {
		const name = iniText(raw.sessionName, "The server name") || iniText(raw.name, "The server name");
		const admin = iniText(raw.adminPassword, "The admin password");
		if (!admin) throw new Error("The admin password cannot be empty. Chivalry's server needs one.");
		return { sessionName: name, adminPassword: admin, mapCode: mapName(raw.mapCode) };
	},
	buildStartScriptFilename: () => "Start_Chivalry.bat",
	// Runs from Binaries\Win64, where UDK.exe is. The map and the two ports go on the map string; the admin password is not on the
	// command line (it is in the settings file).
	buildStartScript: (p) => {
		const map = mapName(p.mapCode);
		const port = portOf(p.port, DEFAULT_PORT);
		const queryPort = portOf(p.queryPort, DEFAULT_QUERY_PORT);
		return [
			"@echo off",
			`cd /d "%~dp0${RUN_DIR}"`,
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} ${map}?steamsockets?port=${port}?queryport=${queryPort} -dedicated=true -seekfreeloadingserver`,
			"",
		].join("\r\n");
	},
	// Writes the name and the admin password where the game reads them. The game fills in the other keys itself.
	buildConfigFile: (p) => {
		const name = iniText(p.sessionName, "The server name") || iniText(p.name, "The server name") || DEFAULT_NAME;
		const admin = iniText(p.adminPassword, "The admin password");
		const lines = ["[Engine.GameReplicationInfo]", `ServerName=${name}`, ""];
		if (admin) lines.push("[Engine.AccessControl]", `AdminPassword=${admin}`, "");
		return { relPath: CONFIG_REL, content: lines.join("\r\n") };
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "chivalry",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		sessionName: iniText(p.sessionName, "The server name") || p.name,
		configPath: `${p.installDir}\\${CONFIG_REL}`,
		configPaths: { [CONFIG_FILE]: `${p.installDir}\\${CONFIG_REL}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "220070",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The settings folder (the server's .ini files) and the folder the Workshop tool and the cooked mod files use.
	backup: {
		paths: [
			{ base: "working", rel: "UDKGame/Config", label: "Server settings (UDKGame Config folder)" },
			{ base: "working", rel: "UDKGame/CookedSDK", label: "Mod files (CookedSDK folder)" },
		],
	},
	// The dossier does not name the game's own log folder, so the Logs tab has nothing to read yet.
	logs: [],
	// The launch line is fixed: the map, the ports and two flags the dossier says must stay. The form cannot add to it yet.
	launchOptions: false,
};

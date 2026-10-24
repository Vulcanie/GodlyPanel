// ATLAS (Grapeshot Games). Dedicated server: Steam app 1006030 (store app 834910), installed anonymously with SteamCMD. Built from the
// research dossier docs/research/games/atlas/ (confidence medium: community guides, one official devkit page). Checked on a real
// install (see 06-verification.md): the anonymous install works but is about 33 GB, the program name is right, and the server stops
// gracefully. It then binds only the query port (UDP) and logs "Failed to load or parse entries from ServerGrid.ServerOnly.json": the
// seamless grid needs ServerGrid.json, ServerGrid.ServerOnly.json (with a Redis database) from the grid editor, which the panel does not make.
//  - the program is ShooterGame\Binaries\Win64\ShooterGameServer.exe, started from the install folder (the dossier's IONOS and NANDS
//    examples). The panel watches the same exe. Which process must stay running is not documented.
//  - the start line is the seamless-grid example from IONOS: the start map Ocean with ServerX/ServerY, then the ports and the admin
//    password on the URL, then -log -server -NoBattlEye. The dossier names those arguments but gives no full list of what they do.
//  - the join password goes in ShooterGame\Saved\Config\WindowsServer\GameUserSettings.ini ([ServerSettings] ServerPassword), which
//    the dossier names. The panel writes the section header and the join password, and nothing else.
//
// Ports: the dossier's defaults (7777 game, 27015 query) are taken by other templates here, so the game port is 7400 and the query
// port 7402 (two above, so the panel's companion port 7401 is kept free). Nothing else from another template is within three of 7400.
//
// Not done, and why:
//  - no SeamlessIP argument: the dossier shows it with the server's public address, which the panel does not know. Left out.
//  - no SeamlessPort, RCON or other ports: the IONOS firewall table lists ranges (27000 to 27008, 28000 to 28008), and no page gives
//    a launch argument for them. They are not passed, and the panel reserves nothing for them.
//  - no server name: no fetched page gives a launch argument for the name in the server browser (ServerName appears only in a
//    third-party updater's settings file, and the dossier cannot confirm it).
//  - no max players argument: its key is in the dossier's examples, but no page explains it or gives a default.
//  - no mods field: the dossier's Ocean Grid method is a ModIDs list in ServerGrid.json, which the panel does not create. That file
//    is offered in the Settings tab for editing instead (see ui/src/catalog/games/atlas.js).
//
// Stop: no quit command or RCON is documented. The panel closes the window and, after 15 seconds, ends the process.

const EXE = "ShooterGameServer.exe";
const EXE_PATH = "ShooterGame\\Binaries\\Win64\\ShooterGameServer.exe";
const CONFIG_REL = "ShooterGame\\Saved\\Config\\WindowsServer\\GameUserSettings.ini";
const GRID_REL = "ShooterGame\\ServerGrid.json";
// The start map of the seamless-grid examples. Each grid region is its own process; this panel runs one.
const MAP = "Ocean";

// Chosen to avoid every other template's ports and the ports next to them (checked by the unit test).
const DEFAULT_PORT = 7400;
const DEFAULT_QUERY_PORT = 7402;
const DEFAULT_NAME = "ATLAS Server";

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

// A password goes into the start line (a URL) or an INI value, so only a few characters are allowed. Empty means no password.
const PASSWORD = /^[A-Za-z0-9._@#$*+~-]+$/;
const passwordText = (value, what) => {
	const text = String(value ?? "").trim();
	if (text === "") return "";
	if (!PASSWORD.test(text)) throw new Error(`The ${what} can only use letters, numbers and these marks: - _ . @ # $ * + ~ (no spaces or other punctuation).`);
	return text;
};

const template = {
	id: "atlas",
	displayName: "ATLAS",
	type: "atlas",
	// The panel watches ShooterGameServer.exe, the program the start script runs.
	method: "process",
	updateAppId: "1006030",
	storeAppId: "834910",
	sharedInstall: false,
	// SteamCMD puts ShooterGame and Engine directly in the install folder.
	installLayoutRoot: "",
	description:
		"ATLAS's dedicated server (ShooterGame\\Binaries\\Win64\\ShooterGameServer.exe), installed from Steam app 1006030. The panel starts the Ocean seamless-grid map with the game and query ports and the admin password on the start line. The join password is written to GameUserSettings.ini. The grid file (ServerGrid.json) is made by the game's grid editor, not by the panel. Checked on a real install: it only starts fully with a seamless-grid setup (ServerGrid.json, ServerGrid.ServerOnly.json and a Redis database) made with the grid editor, which the panel does not create.",
	fields: ["serverPassword", "adminPassword"],
	fieldMeta: {
		serverPassword: { label: "Join Password (leave blank for a public server)", type: "password" },
		adminPassword: { label: "Admin Password (for in-game admin commands)", type: "password" },
	},
	ports: [
		{ key: "port", label: "Game Port (TCP and UDP)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Query Port (UDP)", default: DEFAULT_QUERY_PORT },
	],
	resolveParams: async (raw) => ({
		serverPassword: passwordText(raw.serverPassword, "join password"),
		adminPassword: passwordText(raw.adminPassword, "admin password"),
	}),
	buildStartScriptFilename: () => "Start_ATLAS.bat",
	buildStartScript: (p) => {
		const port = portOf(p.port, DEFAULT_PORT, "game port");
		const queryPort = portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port");
		const admin = passwordText(p.adminPassword, "admin password");
		const url = [MAP, "ServerX=0", "ServerY=0", `QueryPort=${queryPort}`, `Port=${port}`, ...(admin ? [`ServerAdminPassword=${admin}`] : [])].join("?");
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE_PATH} ${url} -log -server -NoBattlEye`,
			"",
		].join("\r\n");
	},
	// The join password, if one is set, goes in the [ServerSettings] section. Every other key keeps the game's own default.
	buildConfigFile: (p) => {
		const join = passwordText(p.serverPassword, "join password");
		return {
			relPath: CONFIG_REL,
			content: ["[ServerSettings]", ...(join ? [`ServerPassword=${join}`] : []), ""].join("\r\n"),
		};
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "atlas",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		queryPort: portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port"),
		sessionName: batSafe(p.name, DEFAULT_NAME),
		configPath: `${p.installDir}\\${CONFIG_REL}`,
		configPaths: {
			"GameUserSettings.ini": `${p.installDir}\\${CONFIG_REL}`,
			"ServerGrid.json": `${p.installDir}\\${GRID_REL}`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "1006030",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The config folder and the saved data (the dossier does not name the save folder, so the whole Saved folder is kept).
	backup: {
		paths: [{ base: "working", rel: "ShooterGame/Saved", label: "Settings and saved worlds", exclude: ["Logs"] }],
	},
	// The dossier names no log file or folder, so none is offered.
	logs: [],
	// The start line is one ?Key=Value URL, which the generic launch form cannot read, so the form is read-only (see ui/src/catalog/games/atlas.js).
	launchOptions: false,
};

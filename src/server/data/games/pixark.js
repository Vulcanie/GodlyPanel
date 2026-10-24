// PixARK (Wildcard). Dedicated server tool: Steam app 824360 (the game is app 593600). Windows server (on Linux it runs under Wine,
// which the panel does not set up). Built from the research dossier (docs/research/games/pixark/); see 05-implementation-notes.md there.
//
// - The program is ShooterGame\Binaries\Win64\PixARKServer.exe, started from the install folder. Most of its settings are on the
//   launch line, inside one quoted URL ("CubeWorld_Light?listen?MaxPlayers=..?SessionName=..?Port=..?..."), as the Nodecraft guide
//   writes it. The panel's start script writes the name, the player limit, the ports and the passwords there.
// - The panel writes no config file. GameUserSettings.ini (ShooterGame\Saved\Config\WindowsServer) is one the game may write on its
//   own; the dossier does not say when. The Settings tab shows only the PvE switch from it.
// - Ports: the game port and the query port are UDP, the RCON and cube ports are TCP (the cube port carries the terrain). The
//   dossier's own defaults (27015 to 27018, 14999 and 15000) are taken by other templates here, so these four start at 27730.
// - Stop: the dossier has no save or stop command; the egg uses Ctrl+C. The panel's Stop asks the window to close and ends the
//   program after 15 seconds, so a Stop may not save the world.
// - Mods: no mod list is read from the launch line; mod folders are copied in by hand (see the notes). No mods field is offered.

const EXE = "PixARKServer.exe";
const EXE_PATH = "ShooterGame\\Binaries\\Win64\\PixARKServer.exe";
const CONFIG_REL = "ShooterGame\\Saved\\Config\\WindowsServer\\GameUserSettings.ini";
const CONFIG_NAME = "GameUserSettings.ini";
const MAP = "CubeWorld_Light";
const CUBE_WORLD = "world";
const LANGUAGE = "en";
// The player limit the Nodecraft guide uses as its example (not a documented default).
const DEFAULT_PLAYERS = 10;
const DEFAULT_NAME = "PixARK Server";

const DEFAULT_PORT = 27730;
const DEFAULT_QUERY_PORT = 27740;
const DEFAULT_RCON_PORT = 27750;
const DEFAULT_CUBE_PORT = 27760;

// The window title in `start /MIN "<title>"`. The name is typed by a person, and cmd acts on these characters.
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim() || DEFAULT_NAME;

// The session name goes into the URL. Characters that split the URL or that cmd acts on are dropped; spaces become underscores,
// because a space inside the URL is not documented as safe.
const sessionText = (value) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!?=]/g, "")
		.trim()
		.replace(/\s+/g, "_")
		.slice(0, 100);

// A password goes into the URL too, so only a few characters are allowed. Empty means no password.
const PASSWORD = /^[A-Za-z0-9._@#$*+~-]+$/;
const passwordText = (value, what) => {
	const text = String(value ?? "").trim();
	if (text === "") return "";
	if (!PASSWORD.test(text)) throw new Error(`The ${what} can only use letters, numbers and these marks: - _ . @ # $ * + ~ (no spaces or other punctuation).`);
	return text;
};

const playerLimit = (value) => {
	const n = Math.floor(Number(value));
	return Number.isFinite(n) && n >= 1 ? n : DEFAULT_PLAYERS;
};

const template = {
	id: "pixark",
	displayName: "PixARK",
	type: "pixark",
	method: "process",
	updateAppId: "824360",
	storeAppId: "593600",
	sharedInstall: false,
	// SteamCMD puts ShooterGame and the rest directly in the install folder.
	installLayoutRoot: "",
	description:
		"PixARK's dedicated server (ShooterGame\\Binaries\\Win64\\PixARKServer.exe), installed from Steam app 824360. The panel starts it with a name, a player limit, the game, query, RCON and cube ports and the passwords on the launch line. Mods are not offered: they are copied in by hand from a PC. Stop closes the window and, if the game does not exit within 15 seconds, ends it, so back up before you stop or update.",
	fields: ["sessionName", "serverPassword", "adminPassword"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		serverPassword: { label: "Join Password (leave blank for a public server)", type: "password" },
		adminPassword: { label: "Admin Password (for in-game admin commands)", type: "password" },
	},
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Query Port (UDP)", default: DEFAULT_QUERY_PORT },
		{ key: "rconPort", label: "RCON Port (TCP; RCON is off, so the port is only reserved)", default: DEFAULT_RCON_PORT },
		{ key: "cubePort", label: "Cube (Terrain) Port (TCP)", default: DEFAULT_CUBE_PORT },
	],
	resolveParams: async (raw) => {
		if (/[\u0000-\u001f]/.test(String(raw.sessionName ?? ""))) throw new Error("The server name cannot contain a line break. Use one line of text.");
		return {
		sessionName: sessionText(raw.sessionName),
		serverPassword: passwordText(raw.serverPassword, "server password"),
		adminPassword: passwordText(raw.adminPassword, "admin password"),
		};
	},
	buildStartScriptFilename: () => "Start_PixARK.bat",
	buildStartScript: (p) => {
		const name = sessionText(p.sessionName) || sessionText(p.name) || DEFAULT_NAME;
		const url = [
			MAP,
			"listen",
			`MaxPlayers=${playerLimit(p.maxPlayers)}`,
			`SessionName=${name}`,
			`Port=${Number(p.port)}`,
			`QueryPort=${Number(p.queryPort)}`,
			`RCONPort=${Number(p.rconPort)}`,
			...(p.serverPassword ? [`ServerPassword=${passwordText(p.serverPassword, "server password")}`] : []),
			...(p.adminPassword ? [`ServerAdminPassword=${passwordText(p.adminPassword, "admin password")}`] : []),
			`CULTUREFORCOOKING=${LANGUAGE}`,
		].join("?");
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${windowTitle(p.name)}" "${EXE_PATH}" "${url}" -NoBattlEye -CubePort=${Number(p.cubePort)} -cubeworld=${CUBE_WORLD} -nosteamclient -NoHangDetection -game -server -log`,
			"",
		].join("\r\n");
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "pixark",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		sessionName: sessionText(p.sessionName) || sessionText(p.name) || DEFAULT_NAME,
		configPath: `${p.installDir}\\${CONFIG_REL}`,
		configPaths: { [CONFIG_NAME]: `${p.installDir}\\${CONFIG_REL}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "824360",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The config folder holds GameUserSettings.ini; the CubeServers folder holds the cube world the game saves (the dossier does not
	// list its files, so the whole folder is kept).
	backup: {
		paths: [
			{ base: "working", rel: "ShooterGame/Saved/Config", label: "Server settings" },
			{ base: "working", rel: "ShooterGame/Saved/CubeServers", label: "Saved world and server data" },
		],
	},
	// The dossier names no log file or folder, so none is offered (the start line adds -log).
	logs: [],
	// The form for the start line can't read the URL inside the quotes, so the Launch options form is off.
	launchOptions: false,
};

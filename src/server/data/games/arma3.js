// Arma 3 dedicated server (Steam app 233780). Built from the research dossier docs/research/games/arma3/ (confidence medium).
// NOT yet run on a real install: see docs/research/games/arma3/05-implementation-notes.md for what must be checked first.
//  - the program is arma3server.exe in the install root (the wiki's and Valve's page spelling). The 64-bit Windows name
//    (arma3server_x64.exe) was NOT FOUND on the fetched pages, so it is not used. The panel watches arma3server.exe, which is the
//    process that stays running.
//  - the start line is the wiki's Windows example: -profiles, -port, -config and -world=empty. -profiles points into the server's
//    own folder so two servers on one PC do not share profiles.
//  - the server settings file server.cfg is written by the panel before the first start, with the names the wiki gives. The basic
//    network file (-cfg=) is not written: the dossier does not give its content (its page was not fetched).
//  - anonymous SteamCMD login is UNSURE for this app (one source says it works, Valve's list says it needs a purchase). If the
//    install fails with "No subscription", this module cannot be used without an account that owns Arma 3.
//
// Not done, and why:
//  - no RCON and no query port of its own: the dossier finds no RCON on the fetched pages. The Steam query port (game + 1) is kept free.
//  - no mod field: mods are added with the -mod and -serverMod launch arguments (see ui/src/catalog/games/arma3.js), and the Workshop
//    route needs an account that owns the game, which the panel cannot offer.
//
// Stop: the Windows stop is NOT FOUND in the dossier. The panel closes the server's window and, after 15 seconds, ends the process.

const EXE = "arma3server.exe";
const CONFIG_FILE = "server.cfg";

// The wiki's default game port. Its Steam query, Steam master, VON and BattlEye ports are the next four (2303 to 2306).
const DEFAULT_PORT = 2302;
const DEFAULT_NAME = "Arma 3 Server";
// The wiki's "maxPlayers" default for a dedicated server (SC table: 64 (DS)).
const DEFAULT_MAX_PLAYERS = 64;

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

/**
 * A value written between double quotes in server.cfg. The dossier does not say how the file escapes a quote, so a quote and a
 * line break are refused instead of guessed at. The value itself is never put in an error message (it may be a password).
 */
function cfgText(value, what) {
	const s = String(value ?? "");
	if (/["\r\n\u0000-\u001f]/.test(s)) throw new Error(`The ${what} cannot contain a double quote or a line break.`);
	return s;
}

function serverCfg(p) {
	const adminPassword = cfgText(p.adminPassword, "admin password");
	if (!adminPassword) throw new Error("An admin password is required: the wiki says passwordAdmin must be set on a server.");
	const maxPlayers = portOf(p.maxPlayers, DEFAULT_MAX_PLAYERS, "maximum number of players");
	return [
		`hostname = "${cfgText(p.sessionName || p.name || DEFAULT_NAME, "server name")}";`,
		`passwordAdmin = "${adminPassword}";`,
		`password = "${cfgText(p.serverPassword, "join password")}";`,
		`maxPlayers = ${maxPlayers};`,
		"// The three lines below are the wiki's recommended security settings (BattlEye on, signatures checked, no file patching for players).",
		"BattlEye = 1;",
		"verifySignatures = 2;",
		"allowedFilePatching = 0;",
		"",
	].join("\r\n");
}

const template = {
	id: "arma3",
	displayName: "Arma 3",
	type: "arma3",
	// The panel watches the server exe itself (UNVERIFIED for the 64-bit build; see the header).
	method: "process",
	updateAppId: "233780",
	storeAppId: "107410",
	sharedInstall: false,
	// SteamCMD puts the server files at the install root, as the wiki's Windows example (D:\Games\Arma3\A3Master) shows.
	installLayoutRoot: "",
	description:
		"Arma 3's dedicated server (arma3server.exe, the Windows name from the wiki). The panel writes server.cfg with the name, the join password, the admin password and the wiki's security settings, then starts the server with its own profile folder. Mods are added with the launch arguments.",
	fields: ["sessionName", "serverPassword", "adminPassword"],
	fieldMeta: { sessionName: { label: "Server name (shown in the server browser)", type: "text" } },
	ports: [{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT }],
	// The next four ports are the game's own: Steam query (+1), Steam master (+2), VON (+3, reserved), BattlEye (+4).
	implicitPorts: [
		{ offset: 1, label: "its Steam query port" },
		{ offset: 2, label: "its Steam master port" },
		{ offset: 3, label: "its VON port (reserved by the game)" },
		{ offset: 4, label: "its BattlEye port" },
	],
	buildStartScriptFilename: () => "Start_Arma3.bat",
	buildStartScript: (p) => {
		const port = portOf(p.port, DEFAULT_PORT, "game port");
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} "-profiles=%~dp0profiles" -port=${port} -config=${CONFIG_FILE} -world=empty`,
			"",
		].join("\r\n");
	},
	buildConfigFile: (p) => ({
		relPath: CONFIG_FILE,
		content: serverCfg(p),
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "arma3",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
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
		updateAppId: "233780",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The server settings, the profile folder (the server's own profile and player files) and the custom missions folder.
	backup: {
		paths: [
			{ base: "working", rel: CONFIG_FILE, label: "Server settings" },
			{ base: "working", rel: "profiles", label: "Profiles and player files" },
			{ base: "working", rel: "MPMissions", label: "Custom missions" },
		],
	},
	// No log is listed: the dossier does not say which folder the report (arma3.rpt) is written to.
	logs: [],
	// The start script's launch line gets the "Launch options" form.
	launchOptions: true,
};

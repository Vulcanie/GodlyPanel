// The Forest (Endnight Games). Dedicated server: Steam app 556450 (anonymous login); the game itself is app 242760, which only the Steam
// Account Token uses (the panel has none, so it is not named here). The depot the server needs is Windows-only (556451, about 1.7 GB).
//
// Facts from the research dossier (research/theforest/00..04), whose sources are the Pterodactyl egg, Game Server Kings' setup guide,
// Supercraft's and ITechGuides' pages and XGamingServer's docs. Nothing was run on a real install. In short:
//  - the program is TheForestDedicatedServer.exe in the install folder (the egg runs it from the folder root under Wine);
//  - the start line is the egg's command with the Linux wrapper (winetricks, xvfb-run, wine, grep) removed: `start /MIN` of the exe with
//    -batchmode -nographics -nosteamclient, -savefolderpath and -configfilepath, plus -inittype New and, when given, -serverPasswordAdmin,
//    in the order the egg writes them. The dossier names no native Windows start command, so this is the egg's line made plain;
//  - config.cfg: the egg, Game Server Kings and the dossier's "best-evidenced" path put it at TheForestDedicatedServer_Data\forest\config\.
//    Other sources name other places (Server.cfg under AppData\LocalLow, the install root). The panel writes it there and passes the same
//    path through -configfilepath, so the two agree whichever of them the game would use. NEEDS REAL-INSTALL VERIFICATION;
//  - the config is `key value` lines with spaces (`serverName My Server`). No parser exists for it in the panel and none is written: the
//    Settings tab offers the launch-arguments form only, and the file is edited by hand;
//  - ports: the dossier gives 8766 (Steam), 27015 (game) and 27016 (query), but Sons of the Forest holds 8766 and 27016 here, and Core
//    Keeper holds 27015. So the defaults are 27455 (game, with 27456 kept free beside it and query at 27457) and 8770 (Steam). Both are
//    TCP and UDP per the dossier; the panel's firewall check opens UDP only;
//  - NO GRACEFUL STOP FROM THE PANEL. The egg stops the server with ^C in its console. The panel cannot type there, so Stop asks the
//    window to close and ends the process after 15 s. The window is kept minimized so ^C can be sent by hand first;
//  - mods: none. The dossier finds no server-side mod path or launch switch; ModAPI is a client-side launcher and is not managed here;
//  - no log file is known, so the Logs tab lists none. Ready when the console prints "Game autosave started".
// Not verified on a real install (see docs/research/games/theforest/05-implementation-notes.md).

const EXE = "TheForestDedicatedServer.exe";
const DATA_DIR = "TheForestDedicatedServer_Data";
const CONFIG_REL = `${DATA_DIR}\\forest\\config\\config.cfg`;

// The egg's own defaults for the ports the panel does not manage (the rest of the Ports section is the panel's).
const DEFAULT_GAME_PORT = 27455;
const DEFAULT_QUERY_PORT = 27457;
const DEFAULT_STEAM_PORT = 8770;

// The egg's default is 5 and the one source with a range says 1 to 8. Gameserverkings calls the field view-only; this keeps the egg value.
const PLAYERS_DEFAULT = 5;
const PLAYERS_MIN = 1;
const PLAYERS_MAX = 8;

// Characters cmd acts on inside a .bat even between quotes, a quote, a backslash (read as escaping the quote after it by the game's
// command-line parser), control characters, and anything outside plain ASCII (the server's log is ASCII; the dossier does not say more).
const UNSAFE = /[\u0000-\u001f"%&|<>^!\\]|[^\u0000-\u007f]/;

/** A text for a `key value` line of config.cfg: a line break or `//` would change what the game reads, so it is refused, not altered. */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f]|\/\//.test(text)) {
		throw new Error(`${what} has a character the server's config file cannot hold (a line break or two slashes in a row). Use plain text without those.`);
	}
	return text;
}

/** A value that goes on the launch line, between quotes: refused when cmd or the game's command-line reader would act on it. */
export function argText(value, what) {
	const text = String(value ?? "");
	if (UNSAFE.test(text)) {
		throw new Error(`${what} has a character the start script cannot carry safely (a quote, %, &, |, <, >, ^, !, a backslash, or a non-ASCII letter). Use plain letters, digits and simple punctuation.`);
	}
	return text.trim();
}

/** A player count the config file takes: a whole number from 1 to 8, or the egg's 5. */
const playerLimit = (value) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= PLAYERS_MIN && n <= PLAYERS_MAX ? n : PLAYERS_DEFAULT;
};

/** A text safe to put between the quotes of a .bat `start` title. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

const nameOf = (p) => cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "The Forest Server";

/** The egg's order of the launch arguments. The admin password is given only when one was typed. */
function launchArguments(p) {
	const admin = argText(p.adminPassword, "The admin password");
	return [
		"-batchmode",
		"-nographics",
		...(admin ? [`-serverPasswordAdmin "${admin}"`] : []),
		"-inittype New",
		"-nosteamclient",
		`-savefolderpath "${DATA_DIR}"`,
		`-configfilepath "${CONFIG_REL}"`,
	];
}

const template = {
	id: "theforest",
	displayName: "The Forest",
	type: "theforest",
	// The dossier verifies no RCON or query protocol the panel speaks, so the panel watches the process.
	method: "process",
	updateAppId: "556450",
	storeAppId: "242760",
	sharedInstall: false,
	// The exe and TheForestDedicatedServer_Data sit in the install folder's root (the egg runs the exe from there).
	installLayoutRoot: "",
	// About 1.7 GB for the Windows depot (dossier, from the Steam app info). Saves come on top; the dossier gives no save size.
	estimatedInstallBytes: 1_700_000_000,
	description:
		"The Forest's dedicated server (Windows-only; it installs anonymously and needs no Steam account). THE PANEL CANNOT SAVE AND STOP IT CLEANLY: the server is stopped with ^C in its own console window, and the panel cannot type there, so Stop closes the window and ends the process after 15 seconds. Before Stop, open the server's window (it is kept minimized on the taskbar), press Ctrl+C, and wait for it to close. The admin password goes on the start command, and the settings file is edited by hand.",
	fields: ["sessionName", "serverPassword", "adminPassword"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		adminPassword: { label: "Admin Password (optional: unlocks the in-game admin commands; written on the start command)", type: "text" },
	},
	// The game port takes UDP and TCP; the query port sits two above it (the panel keeps the one beside the game port free); the Steam port is
	// separate. Defaults avoid 8766, 27015 and 27016, which other templates here use.
	ports: [
		{ key: "port", label: "Game Port (UDP and TCP; the next port up is kept free too)", default: DEFAULT_GAME_PORT },
		{ key: "queryPort", label: "Query Port (UDP; the port players connect through)", default: DEFAULT_QUERY_PORT },
		{ key: "steamPort", label: "Steam Port (UDP and TCP; for the server browser)", default: DEFAULT_STEAM_PORT },
	],
	// The dossier names no port the game takes beside its game port, so offset 1 is only the panel's precaution (see portRules.js).
	// Rejects a bad name or password before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => ({
		sessionName: cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name"),
		serverPassword: cfgText(raw.serverPassword, "The password"),
		adminPassword: argText(raw.adminPassword, "The admin password"),
	}),
	buildStartScriptFilename: () => "Start_TheForest.bat",
	// The exe is run from the install folder, as the egg does. `start /MIN` keeps its window minimized rather than hidden, so ^C can be sent.
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, "The Forest Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// config.cfg, the panel-managed lines of the egg's template, in the egg's order. The egg's serverContact placeholder and saveFolderPath
	// are left out: the first is "not required" per the dossier and the second is set on the command line.
	buildConfigFile: (p) => {
		const lines = [
			"serverIP 0.0.0.0",
			`serverSteamPort ${Number(p.steamPort) || DEFAULT_STEAM_PORT}`,
			`serverGamePort ${Number(p.port) || DEFAULT_GAME_PORT}`,
			`serverQueryPort ${Number(p.queryPort) || DEFAULT_QUERY_PORT}`,
			`serverName ${nameOf(p)}`,
			`serverPlayers ${playerLimit(p.maxPlayers)}`,
			`serverPassword ${cfgText(p.serverPassword, "The password")}`,
			"serverSteamAccount ",
			"enableVAC on",
			"serverAutoSaveInterval 15",
			"difficulty Normal",
			"initType New",
			"slot 1",
			"showLogs off",
			"veganMode off",
			"vegetarianMode off",
			"resetHolesMode off",
			"treeRegrowMode off",
			"allowBuildingDestruction on",
			"allowEnemiesCreativeMode off",
			"allowCheats off",
			"targetFpsIdle 5",
			"targetFpsActive 60",
			"",
		];
		return { relPath: CONFIG_REL, content: lines.join("\r\n") };
	},
	postWrite: async (p) => {
		const warnings = [
			"The Forest's server cannot be stopped cleanly from the panel. The game stops with ^C in its own console window, and the panel cannot type into a console. Stop closes the window and ends the process after 15 seconds. Open the server's window (kept minimized on the taskbar), press Ctrl+C, wait for it to close, and only then press Stop or update.",
			"The config file's location is not settled between sources. The panel writes it to TheForestDedicatedServer_Data\\forest\\config\\config.cfg and passes that path with -configfilepath. Check on the first start that the server reads it.",
			"The Forest's server is Windows-only. The depot is about 1.7 GB, and the server's save folder is the TheForestDedicatedServer_Data folder.",
		];
		if (!String(p?.adminPassword ?? "").trim()) warnings.push("No admin password was set, so the in-game admin commands are not available to anyone.");
		return { warnings };
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "theforest",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		steamPort: p.steamPort,
		sessionName: p.sessionName,
		serverPassword: p.serverPassword,
		adminPassword: p.adminPassword,
		configPath: `${p.installDir}\\${CONFIG_REL}`,
		configPaths: {
			"config.cfg": `${p.installDir}\\${CONFIG_REL}`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		// Kept on the taskbar rather than hidden, so ^C can be typed into the console before Stop (the panel cannot send it).
		windowMode: "minimized",
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "556450",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The save folder is the -savefolderpath folder, TheForestDedicatedServer_Data. The dossier does not name a save subfolder inside it,
	// so the whole folder is kept: it also holds the game's own shipped files, which a restore would put back.
	backup: {
		paths: [{ base: "working", rel: DATA_DIR, label: "Server settings and saves (TheForestDedicatedServer_Data)" }],
	},
	// No server log file is named by any source the dossier used.
	logs: [],
	launchOptions: true,
};

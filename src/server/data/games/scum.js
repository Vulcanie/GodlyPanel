// SCUM (Gamepires). Dedicated server app 3792580 (a Tool, Windows only, anonymous login), game 513710.
//
// Facts from the research dossier (research/scum/01..04), whose sources are the SCUM community wiki
// (https://scum.wiki.gg/wiki/Scum_Dedicated_server_setup), Steam's own app info for 3792580, GameServerKings, GG Host and several
// hosting guides. Nothing was run on a real install. In short:
//  - the program is SCUM\Binaries\Win64\SCUMServer.exe, started with `-log -port=<n> -MaxPlayers=<n>`;
//  - one UDP game port; the game also takes the next two (+1 a raw UDP socket, +2 the Steam server list query), so players find the
//    server on game port + 2 in Steam favorites. The optional RCON on TCP 7777 is not documented and is not used;
//  - the server's name, password and player limit are not launch arguments: they are scum.ServerName, scum.ServerPassword and
//    scum.MaxPlayers in SCUM\Saved\Config\WindowsServer\ServerSettings.ini, so the panel writes that file before the first start;
//  - there is no documented way to stop it from outside but Ctrl+C in its console window, and its save database (SaveFiles\SCUM.db) is
//    written on a graceful shutdown;
//  - SCUM has no mod support, so there is no mods field.
// Not verified on a real install (see research/scum/05-implementation-notes.md): that SCUMServer.exe is the program that stays running,
// that a ServerSettings.ini holding only the three lines below is kept by the game when it starts, and that closing the window saves.

const EXE = "SCUMServer.exe";
const EXE_PATH = `SCUM\\Binaries\\Win64\\${EXE}`;
const SETTINGS_REL = "SCUM\\Saved\\Config\\WindowsServer\\ServerSettings.ini";

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A value for a line of ServerSettings.ini: one line, no surrounding spaces. */
const iniValue = (value) => String(value ?? "").replace(/[\u0000-\u001f]/g, "").trim();

/** A whole number from 1 to 128 (the range the settings table gives for the player limit). */
const playerLimit = (value) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= 1 ? Math.min(n, 128) : 64;
};

const template = {
	id: "scum",
	displayName: "SCUM",
	type: "scum",
	// No RCON or console command is documented, so the server is watched by its process; the panel closes its window and force-kills
	// after its grace time, which is all that can be done from outside.
	method: "process",
	updateAppId: "3792580",
	storeAppId: "513710",
	sharedInstall: false,
	installLayoutRoot: "",
	// The depots add up to about 15.35 GB installed.
	estimatedInstallBytes: 15_400_000_000,
	// No mods field: the developer has said official mod support will not come in 2026 and there is no Workshop.
	fields: ["sessionName", "serverPassword"],
	fieldMeta: { sessionName: { label: "Server Name (shown in the server browser)", type: "text" } },
	// Seen on a real install: the game binds the UDP -port, a UDP Steam query port (27015 unless -QueryPort says otherwise, so the panel
	// always gives one) and a TCP port at game port + 2. 7777 to 7779 belong to other games' defaults here, so this starts at 7870.
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: 7870 },
		{ key: "queryPort", label: "Query Port (UDP)", default: 7880 },
	],
	implicitPorts: [{ offset: 2, label: "its TCP port" }],
	buildStartScriptFilename: () => "Start_SCUM.bat",
	// Started from the install folder, as in the community guides, without -nobattleye. -MaxPlayers is the wiki's own example line and
	// overrides the limit in ServerSettings.ini. SCUMServer.exe asks Windows for administrator rights ("highestAvailable"); started
	// that way a panel that is not elevated cannot see its path or stop it, so it is started as the person running the panel instead
	// (RunAsInvoker, checked on a real install: it then starts in seconds and Stop works).
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			"set __COMPAT_LAYER=RunAsInvoker",
			`start /MIN "${batSafe(p.name, "SCUM Server")}" ${EXE_PATH} -log -port=${p.port} -QueryPort=${p.queryPort} -MaxPlayers=${playerLimit(p.maxPlayers)}`,
			"",
		].join("\r\n"),
	// The name, password and player limit. The game adds every other setting to the file itself.
	buildConfigFile: (p) => ({
		relPath: SETTINGS_REL,
		content: [
			"[General]",
			`scum.ServerName=${iniValue(p.sessionName || p.name)}`,
			`scum.ServerPassword=${iniValue(p.serverPassword)}`,
			`scum.MaxPlayers=${playerLimit(p.maxPlayers)}`,
			"",
		].join("\r\n"),
	}),
	// Checked on a real install: on a brand-new save folder the first start throws away the settings file the panel wrote and writes the
	// game's own defaults in its place (about 430 settings). From the second start it keeps the name, password and player limit.
	postWrite: async () => ({
		warnings: [
			"SCUM replaces its settings file with the game's own defaults on its very first start. Start the server once, stop it, check the name, password and player limit on the Settings tab, and start it again; from the second start they are kept.",
		],
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "scum",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		sessionName: p.sessionName,
		serverPassword: p.serverPassword,
		configPath: `${p.installDir}\\${SETTINGS_REL}`,
		configPaths: { "ServerSettings.ini": `${p.installDir}\\${SETTINGS_REL}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "3792580",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The world is one SQLite database, SaveFiles\SCUM.db (written when the server shuts down properly), and the settings, admin and
	// player lists, trader prices, raid times and loot overrides are in Config\WindowsServer.
	backup: {
		paths: [
			{ base: "working", rel: "SCUM/Saved/SaveFiles", label: "Saved world and players", exclude: ["Logs"] },
			{ base: "working", rel: "SCUM/Saved/Config/WindowsServer", label: "Server settings and player lists" },
		],
	},
	logs: [{ kind: "dir", base: "working", rel: "SCUM/Saved/Logs", label: "Game log" }],
	launchOptions: true,
};

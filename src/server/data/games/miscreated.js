// Miscreated (Entrada Interactive). Dedicated server: Steam app 302200 (the server package); game app 299740. Built from the research
// dossier docs/research/games/miscreated/ (confidence low). NOT yet run on a real install: see 05-implementation-notes.md.
//  - the program is Bin64_dedicated\MiscreatedServer.exe, started from the server folder (hosting.cfg and miscreated.db live there).
//  - the start line: -mis_gameserverid 1337 (the dossier's example; the dossier says changing it later wipes the server), -sv_port <port>,
//    and +sv_servername "<name>" (the dossier says the runtime value is the one used on the current build).
//  - port: 27960 for the game port. The dossier's own ports (64090 and up) are left alone; 27960 is free of the other templates.
//
// Not done, and why:
//  - no -sv_bind: the Docker page says the server fails to start on patch 1.18.x without it, and gives no way for the panel to know
//    the public IP. This is the first thing to check on a real install.
//  - no RCON (+http_startserver): the RCON there has no password unless hosting.cfg sets http_password, and the panel does not write that.
//  - no hosting.cfg written: the dossier gives no defaults for most keys, and the file ships with the server. The panel backs it up.
//  - no mods field: the dossier's mod method (the steam_ugc line of hosting.cfg) is not automated here.
//  - no stop command: the dossier finds none. The panel closes the window, and the game may keep running (see the notes).
//  - checked on a real install: server.log in the server folder is the log; hosting.cfg is the user file (dedicated.cfg says so);
//    A2S answers on the game port + 2; the world is miscreated.db.

const PROGRAM = "Bin64_dedicated\\MiscreatedServer.exe";
// The dossier's example id. The dossier says a different id on an existing server wipes it, so it is fixed here.
const GAME_SERVER_ID = 1337;

// Chosen to avoid the other templates' ports (checked by the unit test).
const DEFAULT_PORT = 27960;
const DEFAULT_NAME = "Miscreated Server";

/** A text safe to put inside a .bat `start` title or a quoted value: nothing cmd would act on, and no quote. */
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

const template = {
	id: "miscreated",
	displayName: "Miscreated",
	type: "miscreated",
	// The panel watches MiscreatedServer.exe, the program the start script runs. The dossier says a second process (Miscreated.exe)
	// may still show after a stop on some builds, so this is one of the things to check.
	method: "process",
	updateAppId: "302200",
	storeAppId: "299740",
	sharedInstall: false,
	// SteamCMD puts the server folder at the install root, with Bin64_dedicated and hosting.cfg inside it.
	installLayoutRoot: "",
	description:
		"Miscreated's dedicated server (MiscreatedServer.exe). The panel starts it with the game port and the server name. Unconfirmed: whether the server starts without the -sv_bind address the newest build may need, whether a stop saves the world cleanly, and whether anonymous SteamCMD works for this app. Back up the world by hand before you update.",
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	ports: [{ key: "port", label: "Game Port (TCP and UDP)", default: DEFAULT_PORT }],
	resolveParams: async (raw) => ({
		sessionName: batSafe(raw.sessionName, "") || batSafe(raw.name, DEFAULT_NAME),
	}),
	buildStartScriptFilename: () => "Start_Miscreated.bat",
	buildStartScript: (p) => {
		const port = portOf(p.port, DEFAULT_PORT, "game port");
		const serverName = batSafe(p.sessionName, "") || batSafe(p.name, DEFAULT_NAME);
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${PROGRAM} -mis_gameserverid ${GAME_SERVER_ID} -sv_port ${port} +sv_servername "${serverName}"`,
			"",
		].join("\r\n");
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "miscreated",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		sessionName: batSafe(p.sessionName, "") || batSafe(p.name, DEFAULT_NAME),
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: "MiscreatedServer.exe",
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "302200",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The world database and the settings file in the server folder. Both are named by the dossier.
	backup: {
		paths: [
			{ base: "working", rel: "miscreated.db", label: "World database" },
			{ base: "working", rel: "hosting.cfg", label: "Server settings" },
		],
	},
	// server.log in the server folder (found on a real install).
	logs: [{ kind: "file", base: "working", rel: "server.log", label: "Server log" }],
	// The launch line is written by the panel, so the form does not add to it.
	launchOptions: false,
};

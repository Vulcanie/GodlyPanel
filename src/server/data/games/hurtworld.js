// Hurtworld (Bloodbath Games). Dedicated server: Steam app 405100 ("Hurtworld Dedicated Server"); game: app 393420.
//
// Built from the research dossier (docs/research/games/hurtworld/) and checked on a real Windows install (06-verification.md): the server
// installs anonymously, the start line below runs as written, the query port answers A2S (name, map "nullius", max 50), and the panel's Stop
// is a force-end after 15 s (the game does not exit on the close message). What it relies on:
//  - the program is Hurtworld.exe, started from the server folder with `-batchmode -nographics` (headless).
//  - the settings the panel writes go through `-exec`, a quoted string of semicolon-separated commands: `host <port>`,
//    `queryport <port>`, `servername <name>`. The wiki's example uses exactly these.
//  - `-logfile "gamelog.txt"` (the wiki's example), so the Logs tab has a file to read.
//  - ports: the game (host) port 12871 and the query port 12881, both from the wiki's example. The Unraid page labels them UDP, the
//    Docker page lists them as TCP and UDP. The protocol is UNVERIFIED; the catalog labels them UDP as the Unraid page does.
//
// Not done, and why:
//  - no autoexec.cfg: the dossier does not say where the file lives or whether the game creates it, so the panel does not write it.
//  - no admin (`addadmin <steam64>`): the create form does not ask for a Steam ID. Admins must be added another way (not evidenced).
//  - no RCON stop: no RCON port or password is evidenced. The panel's Stop closes the window; whether that saves the world is not known.
//  - no backup folders: the save location is NOT FOUND in the dossier.

const EXE = "Hurtworld.exe";
const LOG = "gamelog.txt";

// The ports the wiki's example uses. 12872 and 12882 are kept free as well (checked against every other template).
const DEFAULT_PORT = 12871;
const DEFAULT_QUERY_PORT = 12881;
const DEFAULT_NAME = "Hurtworld Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/**
 * A text for the servername inside -exec. The -exec string is quoted in the .bat and split on semicolons by the game, so a quote,
 * a semicolon or a cmd character is removed rather than passed on.
 */
const execSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!;]/g, "")
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
	id: "hurtworld",
	displayName: "Hurtworld",
	type: "hurtworld",
	// The panel watches Hurtworld.exe, the program the start script runs. Which process stays running is not in the dossier.
	method: "process",
	updateAppId: "405100",
	storeAppId: "393420",
	sharedInstall: false,
	// SteamCMD puts Hurtworld.exe in the install folder's root.
	installLayoutRoot: "",
	description:
		"Hurtworld's dedicated server (Hurtworld.exe). The panel starts it headless and sets the game port, the query port and the server name when it starts. Its save folder and the Stop behaviour are not confirmed yet, so back up your world by hand before you update the server.",
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Query Port (UDP)", default: DEFAULT_QUERY_PORT },
	],
	resolveParams: async (raw) => ({
		sessionName: execSafe(raw.sessionName, "") || execSafe(raw.name, DEFAULT_NAME),
	}),
	buildStartScriptFilename: () => "Start_Hurtworld.bat",
	buildStartScript: (p) => {
		const port = portOf(p.port, DEFAULT_PORT, "game port");
		const queryPort = portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port");
		const serverName = execSafe(p.sessionName, "") || execSafe(p.name, DEFAULT_NAME);
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} -batchmode -nographics -exec "host ${port};queryport ${queryPort};servername ${serverName}" -logfile "${LOG}"`,
			"",
		].join("\r\n");
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "hurtworld",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		queryPort: portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port"),
		sessionName: execSafe(p.sessionName, "") || execSafe(p.name, DEFAULT_NAME),
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "405100",
		autoUpdate: false,
	}),
};

export default {
	template,
	// No save folder is evidenced in the dossier, so the panel's backup keeps nothing for now.
	backup: { paths: [] },
	// The start script writes the log to gamelog.txt in the server folder.
	logs: [{ kind: "file", base: "working", rel: LOG, label: "Server log" }],
	// The launch line's flags are all written by the panel, so there is nothing to edit there.
	launchOptions: false,
};

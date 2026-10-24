// Tower Unite (Steam dedicated server tool, app 439660, anonymous SteamCMD install; the game itself is app 394690). Built from the research
// dossier docs/research/games/towerunite/ (confidence medium). checked on a real install, see 06-verification.md.
//
//  - The program is TowerServer.exe in the install root: a launcher that starts Tower/Binaries/Win64/TowerServer-Win64-Shipping.exe. The
//    game's own StartTowerCondo.bat runs it from the root. (The guessed Tower\Binaries\Win64\TowerServer.exe does not exist.)
//  - The settings file is Tower\Saved\Config\WindowsServer\TowerServer.ini. The dossier gives the Linux path and the WindowsServer folder
//    for Game.ini and TowerBans.ini; the game ships that file at the Windows path.
//  - The game port is 7800, not the official 7777: 7777 is the default of the Valheim and Satisfactory templates here.
//  - The query port 27016 is fixed on the launch line, as the official guide asks (it must be 27016 to play on the same PC). It is not
//    declared as a port, because 27016 is also the default of the Sons of the Forest template.
//
// Not done, and why:
//  - no login tokens: the panel does not ask for them. The condo cannot be listed on the server list without them, and the settings tab
//    shows the keys so they can be added by hand.
//  - no AdminSteamID line: the game reads one line per admin, which the panel does not write.
//  - no stop command: none is documented. The panel closes the window, and the game may not save first.
//  - no RCON: none is documented.

// The batch file starts this program, from the install root (see the header).
const PROGRAM = "TowerServer.exe";
// The settings file the game reads on Windows (see the header). Relative to the install folder.
const CONFIG_REL = "Tower\\Saved\\Config\\WindowsServer\\TowerServer.ini";

// The condo map, from the official guide's example. Any other map name from the list in the dossier is also valid.
const MAP = "/Game/Maps/C_Condo";
// Query port: 27016 is required to play on the same PC (the official guides say so). Written on the launch line.
const QUERY_PORT = 27016;
// The game's own default is 32 (2 to 64 allowed, per the official Linux guide).
const MAX_PLAYERS = 32;

// Chosen to avoid the other templates' ports (checked by the unit test). The game's own default is 7777.
const DEFAULT_PORT = 7800;
const DEFAULT_TITLE = "Tower Unite Condo";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on, and no quote. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A text safe to put on one line of an .ini value: no line breaks or control characters. */
const iniSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f]/g, "")
		.trim() || fallback;

/** A port as a whole number, or the default when none was given. Anything else is refused. */
function portOf(value, fallback, what) {
	if (value === undefined || value === null || value === "") return fallback;
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`The ${what} must be a whole number from 1 to 65535.`);
	return n;
}

const title = (p) => iniSafe(p.sessionName, "") || iniSafe(p.name, DEFAULT_TITLE);

const template = {
	id: "towerunite",
	displayName: "Tower Unite",
	type: "towerunite",
	// The panel watches the program the batch file starts.
	method: "process",
	updateAppId: "439660",
	storeAppId: "394690",
	sharedInstall: false,
	// SteamCMD puts the server files at the install root, with Tower\ inside it.
	installLayoutRoot: "",
	description:
		"Tower Unite's dedicated condo server (TowerServer.exe). The panel writes the condo title, the settings file and the start script with the game port. Unconfirmed: whether the server starts without the two login tokens, which the panel does not write and which are needed to list the condo, whether a stop saves the condo. Add the tokens in the Settings tab; keep them secret.",
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Condo title (the server's title)", type: "text" },
	},
	ports: [{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT }],
	buildStartScriptFilename: () => "Start_TowerUnite.bat",
	buildStartScript: (p) => {
		const port = portOf(p.port, DEFAULT_PORT, "game port");
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_TITLE)}" ${PROGRAM} ${MAP} -log -Port=${port} -nosteamclient -QueryPort=${QUERY_PORT}`,
			"",
		].join("\r\n");
	},
	// The settings file the game reads (see the header). The tokens are left empty for the person to fill in.
	// CondoAutoSave and CondoBackupsEnabled are written as the official sample sets them, which is True.
	buildConfigFile: (p) => ({
		relPath: CONFIG_REL,
		content: [
			"[/script/towernetworking.dedicatedserveroptions]",
			`ServerTitle=${title(p)}`,
			`MaxPlayers=${MAX_PLAYERS}`,
			"SteamLoginToken=",
			"TowerLoginToken=",
			"",
			"[DedicatedCondoOptions]",
			"CondoAutoSave=True",
			"CondoBackupsEnabled=True",
			"",
		].join("\r\n"),
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "towerunite",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		sessionName: title(p),
		configPath: `${p.installDir}\\${CONFIG_REL}`,
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: "TowerServer.exe",
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "439660",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The condos (the .map files) and the settings and ban list the game keeps in the server's folder (from the dossier).
	backup: {
		paths: [
			{ base: "working", rel: "Tower/Condos", label: "Condo save data" },
			{ base: "working", rel: "Tower/Saved/Config/WindowsServer", label: "Server settings and ban list" },
		],
	},
	// The chat and join log in the Tower folder (from the dossier). The game's own -log folder is not in the dossier.
	logs: [{ kind: "file", base: "working", rel: "Tower/TowerServer_Chat.txt", label: "Chat and join log" }],
	// The launch line is written by the panel, so the form does not add to it.
	launchOptions: false,
};

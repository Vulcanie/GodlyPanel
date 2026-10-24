// Killing Floor 2 (Unreal Engine 3, Tripwire, Windows server). Dedicated server: Steam app 232130 (anonymous login per the dossier: the
// egg and two guides use it), game: app 232090 (UNSURE, per the dossier; it is only linked, not named). Built from the research dossier
// (docs/research/games/killingfloor2/, confidence low; the official wiki was blocked). Checked on a real install (about 30 GB, anonymous):
// KFServer.exe is the right name, but it needs the Visual C++ 2012 runtime (MSVCR110.dll). Without it the process stays alive, idle,
// with no port and no log. The runtime ships in the install at Binaries/Redist/vcredist_x64.exe. See 06-verification.md.
//
// What it relies on, and how sure each part is:
//  - the program is KFServer.exe in Binaries\Win64, started with the map first, then the options joined with `?`:
//      kf-bioticslab?Port=<game>?QueryPort=<query>
//    The Windows exe name is NOT in any page the dossier read. KFServer.exe comes from the dossier's sources list, which the dossier
//    itself says no page supports. The Linux binary (KFGameSteamServer.bin.x86_64, same folder) is from the Pterodactyl egg. So
//    KFServer.exe is UNVERIFIED, and it is the process the panel watches.
//  - the map and the two ports are on the start line (?Port=, ?QueryPort=: the egg's own form). The egg's map default is kf-bioticslab.
//  - the name and the password are NOT written at create time: the dossier says the game regenerates its configuration on its first
//    boot, and that a panel must not create or edit the INI files before the first successful start. They are set in the Settings tab
//    after that first start, in KFGame\Config\PCServer-KFGame.ini (the Windows file the dossier's examples name).
//  - game port UDP, and query port UDP (the dossier's query default is 27015, which other templates use). The panel uses 7811 and 7813,
//    which no other template uses, nor a port beside theirs. WebAdmin is off: it is a beta setting the dossier says to avoid exposing.
//  - method "process": no stop command the panel can send. The dossier's stop is Ctrl+C (SIGINT) on Linux. The panel asks the window to
//    close, then ends the program after 15 s.
//  - no mods: Workshop items are listed in an Engine INI, which the dossier gives in two conflicting files. Not added.

const EXE = "KFServer.exe";
const RUN_DIR = "Binaries\\Win64";
const SETTINGS_REL = "KFGame\\Config\\PCServer-KFGame.ini";

const DEFAULT_MAP = "kf-bioticslab";
const DEFAULT_PORT = 7811;
const DEFAULT_QUERY_PORT = 7813;
const DEFAULT_NAME = "Killing Floor 2 Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A map name for the start line: letters, digits, underscores and hyphens. */
const NAME_WORD = /^[A-Za-z0-9_-]{1,64}$/;
const mapOf = (value) => (NAME_WORD.test(String(value ?? "")) ? String(value) : DEFAULT_MAP);

/** A port as a whole number from 1024 to 65535, or the default when none was given. */
const portOf = (value, fallback) => {
	const n = Math.floor(Number(value));
	return Number.isFinite(n) && n >= 1024 && n <= 65535 ? n : fallback;
};

const template = {
	id: "killingfloor2",
	displayName: "Killing Floor 2",
	type: "killingfloor2",
	// No stop command the panel can send: the process is ended after 15 s if its window does not close.
	method: "process",
	updateAppId: "232130",
	storeAppId: "232090",
	sharedInstall: false,
	// SteamCMD puts the server in its folder: Binaries\ and KFGame\ sit under the root (per the dossier's Linux paths).
	installLayoutRoot: "",
	description:
		"Killing Floor 2's dedicated server, for Windows. The panel installs it with SteamCMD using an anonymous Steam login and starts it with the map, the game port and the query port. The server's name and password are set in the Settings tab after its first start, because the game writes its settings files the first time it runs.",
	// Nothing is written at create time (see the header), so the create form asks for nothing extra.
	fields: [],
	mapChoices: [{ code: DEFAULT_MAP, label: "BioticsLab (kf-bioticslab)" }],
	// The game port and the query port. Both dossier defaults (7777 and 27015) are used by other templates here, so these are free instead.
	ports: [
		{ key: "port", label: "Game Port (UDP; the next port up is kept free too)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Query Port (UDP, the Steam server query)", default: DEFAULT_QUERY_PORT },
	],
	buildStartScriptFilename: () => "Start_KF2.bat",
	// The panel writes the whole line, so the Launch options form is off.
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" /D "%~dp0${RUN_DIR}" ${EXE} "${mapOf(p.mapCode)}?Port=${portOf(p.port, DEFAULT_PORT)}?QueryPort=${portOf(p.queryPort, DEFAULT_QUERY_PORT)}"`,
			"",
		].join("\r\n"),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "killingfloor2",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT),
		queryPort: portOf(p.queryPort, DEFAULT_QUERY_PORT),
		sessionName: p.name,
		configPath: `${p.installDir}\\${SETTINGS_REL}`,
		configPaths: { "PCServer-KFGame.ini": `${p.installDir}\\${SETTINGS_REL}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// The Windows program the dossier could not confirm (see the header). The panel finds this server's process by where it runs from.
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "232130",
		autoUpdate: false,
	}),
};

export default {
	template,
	backup: {
		paths: [{ base: "working", rel: "KFGame/Config", label: "Server settings (KFGame\\Config)" }],
	},
	// The dossier names no Windows server log file, so none is listed.
	logs: [],
	launchOptions: false,
};

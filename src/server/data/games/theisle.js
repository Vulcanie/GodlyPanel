// The Isle (Evrima branch). Dedicated server app 412680, anonymous SteamCMD login, and the `evrima` beta branch
// (the default branch is an old Legacy build that does not run this server). The template sets updateBranch "evrima", so the install
// and every later update use `+app_update 412680 -beta evrima validate`.
//
// Facts from the research dossier (docs/research/games/theisle/01..04). Every source is COMMUNITY (xgamingserver, supercraft, physgun,
// gamehostbros); no official page was read. Nothing was run on a real install. In short:
//  - the program is TheIsleServer.exe, in the root of the install folder (the panel's start script runs it from there);
//  - the start line is `TheIsleServer.exe ?Port=<n> -log`. "?listen" is a Legacy-era flag and is not used. The game port is UDP and the
//    dossier says the query shares it, so the panel lists only the game port (no query, RCON or queue port);
//  - settings are Unreal .ini files in TheIsle\Saved\Config\WindowsServer\. The panel writes Game.ini with the name, map, join password
//    and the switch for it. The dossier says the game makes Game.ini and Engine.ini on its first run and overwrites them on shutdown; it
//    is not known whether a Game.ini written before the first run is kept. The dossier's other keys are in the Settings tab;
//  - Engine.ini must hold the Epic Online Services dedicated-server client id and secret. Checked on a real install (2026-10-23): without
//    them the server exits within seconds with "Unable to initialize EOS platform". The dossier gives no value it can be sure of, so the
//    panel writes neither and does not show them in the form, which means the server does not start until the person
//    adds them by hand (see the guide in ui/src/catalog/games/theisle.js);
//  - the server is stopped by closing its window, which the panel does after asking. The dossier documents no save command, no signal
//    and no RCON stop (the RCON that exists uses a custom protocol that the panel does not speak), so a stop may lose the time since the
//    game last saved;
//  - mods are PAK + SIG files in TheIsle\Content\Paks (or Paks\LogicMods or Paks\~mods, which the dossier's sources disagree on), and UE4SS
//    mods on Windows only. Steam Workshop ids no longer work. The panel adds nothing for mods.
// Not verified on a real install (see docs/research/games/theisle/05-implementation-notes.md): that TheIsleServer.exe is the process that
// stays running, that the Game.ini written before the first start is kept, the Engine.ini credentials, that ?Port= sets the game port,
// and whether closing the window saves the world.

const EXE = "TheIsleServer.exe";
const CONFIG_DIR = "TheIsle\\Saved\\Config\\WindowsServer";
const GAME_REL = `${CONFIG_DIR}\\Game.ini`;
export const SESSION_SECTION = "/Script/TheIsle.TIGameSession";
const BRANCH = "evrima";
const DEFAULT_PORT = 25920;

/** The window title in `start /MIN "<title>"`: a server's name is typed by a person, and cmd acts on these characters. */
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim() || "The Isle";

/** A value for a line of Game.ini: one line, no control characters and no double quotes (the value is written between quotes). */
const iniValue = (value) => String(value ?? "").replace(/["\u0000-\u001f\u007f]/g, "").trim();

/** The name in the server browser. The dossier gives no length limit, so none is applied. */
export function serverName(value, fallback = "The Isle Server") {
	return iniValue(value).replace(/\s+/g, " ") || fallback || "The Isle Server";
}

/** The join password. Blank means an open server. */
export function joinPassword(value) {
	return iniValue(value);
}

/** A port number from the form, or the default when it is not a usable one. */
export function portNumber(value) {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= 1 && n <= 65535 ? n : DEFAULT_PORT;
}

const template = {
	id: "theisle",
	displayName: "The Isle (Evrima)",
	type: "theisle",
	// No query or RCON the panel can use: it watches the process and stops it by closing its window.
	method: "process",
	updateAppId: "412680",
	// Only the evrima beta works; the panel passes `-beta evrima` on the install and on every update.
	updateBranch: BRANCH,
	sharedInstall: false,
	installLayoutRoot: "",
	description:
		"The Isle (Evrima) dedicated server, installed from the evrima beta branch (the default branch is an old build that does not run this server). Players also need the evrima beta. THE SERVER DOES NOT START WITHOUT Epic Online Services credentials in Engine.ini (it exits at once with \"Unable to initialize EOS platform\"). The panel does not write them: add them by hand while the server is stopped. The panel stops the server by closing its window, and the game documents no save command.",
	fields: ["sessionName", "serverPassword"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the in-game server browser)", type: "text" },
		serverPassword: { label: "Server Password (players type it to join; empty = anyone can join)", type: "text" },
	},
	// The game port (UDP). The dossier says the query uses the same port. 25920 is not any other template's default.
	ports: [{ key: "port", label: "Game Port (UDP; the query uses it too)", default: DEFAULT_PORT }],
	buildStartScriptFilename: () => "Start_TheIsle.bat",
	// Started from the install folder, which holds TheIsleServer.exe. -log opens the server's console window, as the dossier's examples do.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${windowTitle(p.name)}" ${EXE} ?Port=${portNumber(p.port)} -log`,
			"",
		].join("\r\n"),
	// Game.ini: only the keys the panel owns. Everything else is left to the game's own defaults and to the Settings tab. The
	// section and key names are the dossier's (XGS-CONFIG and XGS-SETUP agree on the section; the keys are listed there).
	buildConfigFile: (p) => {
		const password = joinPassword(p.serverPassword);
		const lines = [
			`[${SESSION_SECTION}]`,
			`ServerName="${serverName(p.sessionName, serverName(p.name))}"`,
			"MapName=Gateway",
			`bServerPassword=${password ? "true" : "false"}`,
			`ServerPassword="${password}"`,
			"",
		];
		return { relPath: GAME_REL, content: lines.join("\r\n") };
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "theisle",
		method: "process",
		host: "127.0.0.1",
		port: portNumber(p.port),
		sessionName: serverName(p.sessionName, serverName(p.name)),
		configPath: `${p.installDir}\\${GAME_REL}`,
		configPaths: {
			"Game.ini": `${p.installDir}\\${GAME_REL}`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// The dossier does not say which process stays running; TheIsleServer.exe is the one it names for Windows (see the header).
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "412680",
		// The same beta branch on every update, so an update does not switch the install back to the Legacy build.
		updateBranch: BRANCH,
		autoUpdate: false,
	}),
};

export default {
	template,
	// The Game.ini / Engine.ini overrides. The saves are not backed up: the dossier gives no save location (its file tree names a
	// PlayerData folder, which is not confirmed to hold saves).
	backup: {
		paths: [{ base: "working", rel: "TheIsle/Saved/Config/WindowsServer", label: "Game.ini and Engine.ini settings" }],
	},
	logs: [{ kind: "file", base: "working", rel: "TheIsle/Saved/Logs/TheIsle.log", label: "Server log (startup and configuration errors)" }],
	// The launch line has only ?Port= and -log, which the panel writes itself, so there is no Launch options form.
	launchOptions: false,
};

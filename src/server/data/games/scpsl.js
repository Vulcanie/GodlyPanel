// SCP: Secret Laboratory (Northwood Studios). Dedicated server: the server tool, Steam app 996560 (anonymous login works).
//
// Facts from the research dossier (docs/research/games/scpsl/01..04), whose sources are the TechWiki server guides (install, gameplay
// config, remote admin config, verify), the LocalAdmin V2 README on GitHub and the TechWiki launch-options page. Nothing was run on a
// real install. In short:
//  - the server is started through LocalAdmin.exe, from the folder that holds SCPSL.exe, with the port as its first argument:
//      LocalAdmin.exe 25977 --acceptEULA --useDefault
//    --acceptEULA stops the EULA question (the README's option; the other way is the ACCEPT_SCPSL_EULA variable) and --useDefault
//    stops LocalAdmin's first-run "configure a few settings" prompt (the README: uses the default config when none is present).
//    Both are on the line so an unattended window does not wait for a key; see 05-implementation-notes.md on the EULA;
//  - one port, given to LocalAdmin. The dossier names no default port and no protocol, so this module uses 25977 (25978 is kept free
//    beside it). The query port is TCP and off by default (enable_query), so it is not set;
//  - the settings the panel would need (server name, port-specific config) live in config_gameplay.txt and config_remoteadmin.txt in
//    %APPDATA%\SCP Secret Laboratory\config\<port>\, keyed by the port. The panel does not write or edit those files: the format is
//    "key: value" (the dossier's UNSURE), which no existing parser reads, and the folder is outside the install. See the notes;
//  - no graceful stop is documented (no console quit, no RCON, no stop argument). The panel's Stop closes the window and ends the
//    process after 15 s. The launcher is watched (LocalAdmin.exe); whether closing it also ends SCPSL.exe is not verified.
// Not verified on a real install (see 05-implementation-notes.md): the port's protocol, whether LocalAdmin needs the port argument,
// that --acceptEULA and --useDefault do what the README says, and where the logs and saves go.

const LAUNCHER = "LocalAdmin.exe";

/** The window title in `start /MIN "<title>"`: cmd acts on these characters, so they are dropped. */
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim() || "SCP Secret Laboratory";

const DEFAULT_PORT = 25977;

const template = {
	id: "scpsl",
	displayName: "SCP: Secret Laboratory",
	type: "scpsl",
	// The launcher and the port are all the panel knows. No query port (off by default) and no RCON is documented, so the panel watches the
	// process and stops it by closing its window.
	method: "process",
	updateAppId: "996560",
	sharedInstall: false,
	installLayoutRoot: "",
	// Nothing is asked in the create form: the server name and the join password are in config_gameplay.txt, which the panel does not write.
	fields: [],
	// One game port (see the header). The next port up is kept free by the panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: DEFAULT_PORT }],
	buildStartScriptFilename: () => "Start_SCPSL.bat",
	// LocalAdmin must run from the folder that holds SCPSL.exe, so the script changes to its own folder first (the TechWiki says so).
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${windowTitle(p.name)}" ${LAUNCHER} ${Number(p.port) || DEFAULT_PORT} --acceptEULA --useDefault`,
			"",
		].join("\r\n"),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "scpsl",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// LocalAdmin.exe is the program the panel starts and the one that stays up for the server's life (it runs SCPSL.exe and restarts
		// it). The panel finds this server's process by where it runs from, so another server's LocalAdmin.exe is not mistaken for it.
		processName: LAUNCHER,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "996560",
		autoUpdate: false,
	}),
};

export default {
	template,
	// Nothing in the install folder is the server's own data: the settings live under %APPDATA%, outside the folder the panel backs up.
	backup: { paths: [] },
	// The dossier names no log folder for LocalAdmin or the game (the LocalAdmin README gives --logs, with no default path).
	logs: [],
	// The launch line has LocalAdmin's own options (see ui/src/catalog/games/scpsl.js), but the form stays off: the generic reader cannot parse `--` flags or a leading port, so the guide documents them instead.
	launchOptions: false,
};

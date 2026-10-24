// Team Fortress 2 Classified (a free mod of Team Fortress 2, on the TF2 engine branch). Dedicated server: Steam app 3557020 ("Team Fortress
// 2 Classified Dedicated Server", a SteamCMD tool, Windows and Linux). Its game is app 3545060. Anonymous login is the plan; the dossier
// could not confirm it (docs/research/games/tf2classified/01-basics.md).
//
// Facts from the research dossier (docs/research/games/tf2classified/01..04). Almost nothing about this server is on a page the research
// could reach: its ports, its full start line, its settings and its stop method are all NOT FOUND. In short:
//  - the program is srcds_win64.exe in the install folder (Windows; the dossier also lists srcds.sh for Linux). The dossier's only
//    server argument is -steam. This module's process name is srcds_win64.exe, not srcds.exe, as the dossier says;
//  - the game folder is tf2classified (SteamCMD's gamedir). The launch line adds `-game tf2classified`, which the dossier does not
//    confirm (see the notes). The line is therefore
//      -steam -game tf2classified -console -port <n> +exec server.cfg
//    The port, -console and +exec are the TF2 engine's standard srcds options, not confirmed by a page for this game. No map and no
//    player limit are written: the dossier names no default for either, so the server starts with its own (see the notes);
//  - one game port, 25930 here (no page gives one); the brief sets it so no other template's ports are taken;
//  - the panel writes tf2classified\cfg\server.cfg itself (name, password). The dossier gives that path (GameHostBros) and the
//    `mp_timelimit` example line;
//  - no Steam login token: the dossier says GSLT is optional for the host, but names no launch flag or config key for it, so the panel
//    offers none;
//  - method "process", no rconPort: no stop command and no RCON setting is confirmed, so the panel asks the window to close, then ends
//    the program after 15 s;
//  - mods: the dossier says mods are supported (VScript, a custom folder, server plug-ins) with no install method, so none is added.
// Not verified on a real install (see docs/research/games/tf2classified/05-implementation-notes.md): the install, anonymous login, the
// full launch line, the port, the map default, and every setting name.

const EXE = "srcds_win64.exe";
const GAME_DIR = "tf2classified";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/**
 * A value for a line of a Source .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line, so such a value is refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Team Fortress 2 Classified's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** The launch line's arguments after the program. */
function launchArguments(p) {
	return [
		"-steam",
		`-game ${GAME_DIR}`,
		"-console",
		`-port ${Number(p.port)}`,
		"+exec server.cfg",
	];
}

const template = {
	id: "tf2classified",
	displayName: "Team Fortress 2 Classified",
	type: "tf2classified",
	// No stop command and no RCON setting is confirmed for this game: the panel watches the process.
	method: "process",
	updateAppId: "3557020",
	// The game itself (the client, which the store lists as a mod of TF2) is app 3545060.
	storeAppId: "3545060",
	sharedInstall: false,
	// SteamCMD puts the server in its folder: srcds_win64.exe and tf2classified\ sit in the root (the dossier's gamedir is beside the exe).
	installLayoutRoot: "",
	description:
		"Team Fortress 2 Classified's dedicated server. Installing it with an anonymous Steam login is not confirmed by the research. The research could not confirm its settings, ports or how it stops, so the panel only sets the name, the password and the port. Friends join with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// One game port. 25930 is outside every other template's ports; 25931 (the port beside it) is kept free by the panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25930 }],
	// Rejects a bad name or password before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		return { sessionName: name, serverPassword: password };
	},
	buildStartScriptFilename: () => "Start_TF2Classified.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, "Team Fortress 2 Classified Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Team Fortress 2 Classified Server"}"`,
		];
		const password = cfgText(p.serverPassword, "The password");
		if (password) lines.push(`sv_password "${password}"`);
		lines.push("");
		return { relPath: SERVER_CFG_REL, content: lines.join("\r\n") };
	},
	buildServerEntry: (p) => {
		const serverCfg = `${p.installDir}\\${SERVER_CFG_REL}`;
		return {
			name: p.name,
			type: "tf2classified",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running. The dossier names srcds_win64.exe for Windows (not srcds.exe as on the other Source games);
			// not yet seen on a real install.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "3557020",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder. The dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "tf2classified/cfg", label: "Server settings" }],
	},
	// The dossier names no log folder for this game and the launch line has no -condebug, so no log file is listed.
	logs: [],
	launchOptions: true,
};

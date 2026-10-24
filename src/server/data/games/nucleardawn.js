// Nuclear Dawn (Source engine, Valve-based). Dedicated server: Steam app 111710; game: app 17710 (shown on the create screen only).
// See docs/research/games/nucleardawn/05-implementation-notes.md.
//
// Facts from the research dossier (docs/research/games/nucleardawn/01..04). Its sources are a FireDaemon KB article (the one complete
// launch line and the one concrete install command), LinuxGSM's default files, a Docker image, an XGamingServer sample and hosting-provider
// guides. In short:
//  - the program is ndsrv.exe in the install folder, started with
//      -console -game nucleardawn -port <n> +maxplayers <n> +map <map> +exec server.cfg
//    (FireDaemon's line, with +exec for the settings file, as in the Source servers). Nothing has to be last, so the "Launch options" form
//    stays on;
//  - one game port: the dossier gives 27015 as the default (TCP and UDP). This module starts at 25961 (25962 is kept free beside it), so no
//    other template's ports are taken. The client and SourceTV ports are LinuxGSM script defaults with no description, so they are not used;
//  - the panel writes nucleardawn\cfg\server.cfg itself (name, password, sv_lan 0). The dossier does not give the folder of server.cfg,
//    and this module uses the Source layout (<game>\cfg), which is UNVERIFIED;
//  - method "process", no rconPort: the dossier's two sources disagree on a graceful stop (LinuxGSM says quit, FireDaemon says the game
//    ignores a graceful shutdown). The panel asks the window to close, then ends the program after 15 s;
//  - the Steam download is anonymous here (the FireDaemon command). LinuxGSM's default file says a Steam account must own the game, which
//    is the open conflict in the dossier;
//  - no mod field: the dossier's mods are SourceMod (a host toggle) and nothing else.
// Not verified on a real install (see docs/research/games/nucleardawn/05-implementation-notes.md): anonymous login, the server.cfg folder,
// +exec (and not LinuxGSM's +servercfgfile), +maxplayers (and not -maxplayers), that ndsrv.exe is the one running process, and that closing
// the window ends it cleanly.

const EXE = "ndsrv.exe";
const GAME_DIR = "nucleardawn";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "downtown";
// The dossier's two command lines (FireDaemon and LinuxGSM's default) both use 32. 32 is the start value and the ceiling for the form,
// because it is the largest figure any page shows; the real limit is not on a page.
const DEFAULT_PLAYERS = 32;
const MAX_PLAYERS = 32;

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

const wholeNumber = (value, fallback, min, max) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);

/**
 * A value for a line of a Source .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line, so such a value is refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Nuclear Dawn's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map name as it appears in a file name: letters, digits, `_`, `-`, `.`. */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;

/** The launch line's arguments after the program. */
function launchArguments(p) {
	return [
		"-console",
		`-game ${GAME_DIR}`,
		`-port ${Number(p.port)}`,
		`+maxplayers ${playerLimit(p.maxPlayers)}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		"+exec server.cfg",
	];
}

const template = {
	id: "nucleardawn",
	displayName: "Nuclear Dawn",
	type: "nucleardawn",
	// The dossier found no stop command that both sources agree on: the panel watches the process.
	method: "process",
	updateAppId: "111710",
	storeAppId: "17710",
	sharedInstall: false,
	// SteamCMD puts the server in its folder: ndsrv.exe and nucleardawn\ sit in the root (the FireDaemon example installs to one folder).
	installLayoutRoot: "",
	description:
		"Nuclear Dawn's dedicated server. It installs with an anonymous Steam login, as one guide shows, though another guide says a Steam account must own the game. Players join with the console command connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// The map the FireDaemon example starts with. Any other map is set with the Map argument in the Settings tab's Launch options.
	mapChoices: [{ code: "downtown", label: "Downtown (downtown)" }],
	// Game port: the dossier's default. 25961 is outside every other template's ports, and 25962 (the port beside it) is kept free by the
	// panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25961 }],
	// Rejects a bad name, password or map before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as downtown.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_NuclearDawn.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Nuclear Dawn Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Nuclear Dawn Server"}"`,
		];
		const password = cfgText(p.serverPassword, "The password");
		if (password) lines.push(`sv_password "${password}"`);
		lines.push("sv_lan 0", "");
		return { relPath: SERVER_CFG_REL, content: lines.join("\r\n") };
	},
	buildServerEntry: (p) => {
		const serverCfg = `${p.installDir}\\${SERVER_CFG_REL}`;
		return {
			name: p.name,
			type: "nucleardawn",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program the panel watches. The dossier does not say which exe stays running; ndsrv.exe is the one it names for Windows.
			// The panel finds this server's process by where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "111710",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder. The dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "nucleardawn/cfg", label: "Server settings" }],
	},
	// The dossier names no log folder for this game (the sample's "logs/L<date>.log" is not confirmed), so no log file is listed.
	logs: [],
	launchOptions: true,
};

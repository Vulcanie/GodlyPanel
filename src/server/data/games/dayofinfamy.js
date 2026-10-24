// Day of Infamy (Source engine, Windows). Dedicated server: Steam app 462310 (the template's GAME_ID; the community Docker template is
// the only source for it), game: app 447820. Built from the research dossier (docs/research/games/dayofinfamy/, confidence low). Run on a
// real install (see 06-verification.md): anonymous install works (about 13 GB), srcds_x64.exe stays alive and binds the game port (UDP and
// RCON TCP) plus 27005 and 27020. A2S could not be checked (Windows Block rule for the new exe). No log is written without +log on.
//
// What it relies on, and how sure each part is:
//  - the program is srcds_x64.exe in the install folder, started with `-console -game doi`. That exe name comes from one Steam
//    Workshop user's post; no official or template page names it. Which exe stays running is not in the dossier, so the panel watches
//    srcds_x64.exe (confirmed on a real install).
//  - the start line's pieces are the ones the dossier has: `-port`, `+map sicily` and `+mp_gamemode frontline` (the Docker template's
//    GAME_PARAMS default), and `+servercfgfile` with a file name (one user's post). The dossier does not say where the game reads the
//    settings file from; the panel writes doi\cfg\server.cfg (UNVERIFIED) and points the server at it with +servercfgfile.
//  - the settings file holds `hostname` and `sv_password` (both in the sample server.cfg the dossier cites) and `sv_lan 0`, the same
//    Source convention the sample uses.
//  - one game port, UDP. The template's default is 27015; the panel uses 27715, which no other template uses, nor one beside it.
//  - method "process": no stop command is known. The panel asks the window to close, then ends the program after 15 s.
//  - no mods: the dossier finds no way a dedicated server loads Workshop mods, so no mod field is added.

const EXE = "srcds_x64.exe";
const GAME_DIR = "doi";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;
const SERVER_CFG_ARG = "server.cfg";

const DEFAULT_MAP = "sicily";
// The dossier's start-line default (the Docker template's GAME_PARAMS). No gamemode is offered: the dossier names only this one.
const GAME_MODE = "frontline";
const DEFAULT_NAME = "Day of Infamy Server";

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
		throw new Error(`${what} has a character that Day of Infamy's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map name as it appears on the start line: letters, digits, `_` and `-`. */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_-]{0,63}$/;

/** A port as a whole number from 1024 to 65535, or the default when none was given. */
const DEFAULT_PORT = 27715;
const portOf = (value) => {
	const n = Math.floor(Number(value));
	return Number.isFinite(n) && n >= 1024 && n <= 65535 ? n : DEFAULT_PORT;
};

const mapOf = (value) => (NAME_WORD.test(String(value ?? "")) ? String(value) : DEFAULT_MAP);

/** The launch line's arguments after the program. */
function launchArguments(p) {
	return [
		"-console",
		`-game ${GAME_DIR}`,
		`-port ${portOf(p.port)}`,
		`+map ${mapOf(p.mapCode)}`,
		`+mp_gamemode ${GAME_MODE}`,
		`+servercfgfile ${SERVER_CFG_ARG}`,
	];
}

const template = {
	id: "dayofinfamy",
	displayName: "Day of Infamy",
	type: "dayofinfamy",
	// No stop command is in the dossier: the panel watches the process.
	method: "process",
	updateAppId: "462310",
	storeAppId: "447820",
	sharedInstall: false,
	// SteamCMD puts the server in its folder: srcds_x64.exe and doi\ are expected in the root (UNVERIFIED).
	installLayoutRoot: "",
	description:
		"Day of Infamy's dedicated server (a Source-engine WWII shooter). The panel installs it with SteamCMD and starts it with the map and the game port. Whether the server installs with an anonymous Steam login is unverified: the community Docker template leaves the login blank, and no page confirms it. Players join with the server's address and port.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	mapChoices: [{ code: DEFAULT_MAP, label: "Sicily (sicily)" }],
	// The game port from the dossier's template is 27015, which other servers in this panel use. 27715 is free, and so is the port beside it.
	ports: [{ key: "port", label: "Game Port (UDP; the next port up is kept free too)", default: DEFAULT_PORT }],
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map's name with no spaces, such as sicily.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_DOI.bat",
	// The panel writes the whole line, so the Launch options form is off.
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab edits the rest. Location and reading of this file are UNVERIFIED.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || DEFAULT_NAME}"`,
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
			type: "dayofinfamy",
			method: "process",
			host: "127.0.0.1",
			port: portOf(p.port),
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program the dossier names, from one user's post (UNVERIFIED for this game). The panel finds this server's process by
			// where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "462310",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	backup: {
		paths: [{ base: "working", rel: `${GAME_DIR}/cfg`, label: "Server settings (cfg folder)" }],
	},
	// The dossier names no log file or folder for the server, so none is listed.
	logs: [],
	launchOptions: false,
};

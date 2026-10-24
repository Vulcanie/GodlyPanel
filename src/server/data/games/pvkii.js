// Pirates, Vikings, and Knights II (Source engine). Dedicated server: Steam app 17575 (anonymous login), game: app 17570.
//
// Facts from the research dossier (docs/research/games/pvkii/01..04). Its sources are Valve's Dedicated Servers List and the generic
// Source pages (Valve's own PVKII page was not read), SteamDB, and the LinuxGSM and Game-Server-Configs repositories, which show a
// real PVKII launch line and server.cfg. In short:
//  - the program is srcds_win64.exe in the install folder (seen on a real install: srcds.exe is a launcher that starts it, and a graceful Stop only works on srcds_win64.exe; see
//    docs/research/games/pvkii/05-implementation-notes.md), started with
//      -console -game pvkii -strictportbind -port <n> +maxplayers <n> +map <map> +exec server.cfg
//    `-strictportbind` and `-game pvkii` are LinuxGSM's; `-console` is the panel's, as in the other Source modules;
//  - one game port (27015 by default; the panel uses 25922 from its band). The client port (27005) and SourceTV port (27020) are not
//    moved and not written, so the engine's defaults apply;
//  - the panel writes pvkii\cfg\server.cfg itself (name, password, sv_lan 0); the launch line runs it with `+exec server.cfg`;
//  - no login token field: the dossier could not say whether PVKII needs one for public listing;
//  - method "process", no rconPort: no developer statement of a stop command. The panel asks the window to close, then ends the program
//    after 15 s;
//  - mods: SourceMod plugins are copied in by hand per host guides. The panel has no field for that, so none is added.
// Not verified on a real install (see docs/research/games/pvkii/05-implementation-notes.md): anonymous SteamCMD login for app 17575,
// the Windows program name, that +exec server.cfg is read, and that closing the window ends it.

const EXE = "srcds_win64.exe";
const GAME_DIR = "pvkii";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "bt_island";
// LinuxGSM's default is 24. The dossier names no ceiling; 32 is the panel's limit for the form, not a figure from a page.
const DEFAULT_PLAYERS = 24;
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
		throw new Error(`${what} has a character that Pirates, Vikings, and Knights II's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
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
		"-strictportbind",
		`-port ${Number(p.port)}`,
		`+maxplayers ${playerLimit(p.maxPlayers)}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		"+exec server.cfg",
	];
}

const template = {
	id: "pvkii",
	displayName: "Pirates, Vikings, and Knights II",
	type: "pvkii",
	// The dossier found no developer stop command and no RCON setting the panel can rely on: the panel watches the process.
	method: "process",
	updateAppId: "17575",
	storeAppId: "17570",
	sharedInstall: false,
	// SteamCMD puts the server in its folder: srcds.exe and pvkii\ sit in the root (the LinuxGSM layout, with the Valve install command).
	installLayoutRoot: "",
	description:
		"Pirates, Vikings, and Knights II's dedicated server (srcds). It is meant to install with an anonymous Steam login. Friends join from the in-game console with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// The map LinuxGSM's default launch line starts with. Any other map is set with the Map argument in the Settings tab's Launch options.
	mapChoices: [{ code: "bt_island", label: "bt_island (LinuxGSM's default map)" }],
	// One game port. 25922 is outside every other template's ports, and 25923 (the port beside it) is kept free by the panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25922 }],
	// Rejects a bad name, password or map before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as bt_island.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_PVKII.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "PVKII Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "PVKII Server"}"`,
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
			type: "pvkii",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The install holds srcds.exe, a launcher that starts srcds_win64.exe and stays; closing the launcher's window does not reach the game,
			// so the panel starts and watches srcds_win64.exe itself (seen on a real install: a graceful Stop works that way). It finds the process by where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "17575",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder. The dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "pvkii/cfg", label: "Server settings" }],
	},
	// The dossier names a logs folder only in LinuxGSM's config (pvkii\logs), and this launch line writes no -condebug, so no log is listed.
	logs: [],
	launchOptions: true,
};

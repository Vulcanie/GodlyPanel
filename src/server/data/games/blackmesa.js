// Black Mesa (Source engine, the Black Mesa: Deathmatch dedicated server). Steam app 346680 (anonymous login), game app 362890.
//
// Facts from the research dossier (docs/research/games/blackmesa/01..04). Its sources are Valve's wiki and Dedicated Servers List, the
// Pterodactyl egg, LinuxGSM-style and hosting-provider guides, and Docker's lacledeslan image. The dossier has NO Windows server program
// name (its only server program is srcds_run, for Linux). A real install shows the Windows program is srcds.exe (32-bit; there is no
// srcds_win64.exe). See docs/research/games/blackmesa/06-verification.md. In short:
//  - the program is srcds.exe in the install folder, started with
//      -console -game bms -strictportbind -port <n> +maxplayers <n> +map <map> +exec server.cfg
//    `-game bms` is the game folder the dossier gives on every page; `-console` and `-strictportbind` are as in the other Source modules;
//  - one game port (27015 by default; the panel uses 25916 from its band). The client port (27005) and SourceTV port (27020) are not
//    moved and not written, so the engine's defaults apply;
//  - the panel writes bms\cfg\server.cfg itself (name, password, sv_lan 0); the launch line runs it with `+exec server.cfg`;
//  - method "process", no rconPort: the dossier's only stop command is the console `quit`, which the panel cannot send. The panel asks
//    the window to close, then ends the program after 15 s;
//  - mods: maps and VPKs are copied in by hand and listed in bms\addonlist.txt; the panel has no field for that, so none is added.
// Checked on a real install: anonymous login, the program name and folder, the map and game folder. See 06-verification.md.

const EXE = "srcds.exe";
const GAME_DIR = "bms";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

// The map the dossier's PTERO egg command starts on, and one of the ten official maps the LINODE and EMERALD guides list. The
// dossier's LINODE and DOCKER commands say `+map gasworks`, but the official file name is dm_gasworks; the panel uses dm_crossfire.
const DEFAULT_MAP = "dm_crossfire";
// LINODE and DOCKER use 24 and 16. The dossier gives no ceiling; 32 is the figure in the PTERO egg's command.
const DEFAULT_PLAYERS = 24;
const MAX_PLAYERS = 32;

/** The ten official multiplayer maps, as LINODE and EMERALD list them (file names without .bsp). */
const OFFICIAL_MAPS = [
	"dm_bounce",
	"dm_chopper",
	"dm_crossfire",
	"dm_gasworks",
	"dm_lambdabunker",
	"dm_power",
	"dm_stack",
	"dm_stalkyard",
	"dm_subtransit",
	"dm_undertow",
];

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
		throw new Error(`${what} has a character that Black Mesa's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
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
	id: "blackmesa",
	displayName: "Black Mesa",
	type: "blackmesa",
	// The dossier's only stop command is `quit` on the console, which the panel cannot send: the panel watches the process.
	method: "process",
	updateAppId: "346680",
	storeAppId: "362890",
	sharedInstall: false,
	// SteamCMD puts the server in its folder: the program and bms\ sit in the root (assumed for Windows; the dossier gives no Windows layout).
	installLayoutRoot: "",
	description:
		"Black Mesa's Deathmatch dedicated server (Source engine). It installs with an anonymous Steam login. Friends join from the in-game console with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// The ten official maps. Any other map (a Workshop or custom map) is set with the Map argument in the Settings tab's Launch options.
	mapChoices: OFFICIAL_MAPS.map((code) => ({ code, label: code })),
	// One game port. 25916 is outside every other template's ports, and 25917 (the port beside it) is kept free by the panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25916 }],
	// Rejects a bad name, password or map before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as dm_crossfire.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_BlackMesa.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Black Mesa Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Black Mesa Server"}"`,
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
			type: "blackmesa",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program the panel starts and watches. A real install has only srcds.exe
			// (32-bit). It finds the process by where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "346680",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder (server.cfg, config_deathmatch.cfg, mapcycle.txt). The dossier
	// found no save location.
	backup: {
		paths: [{ base: "working", rel: "bms/cfg", label: "Server settings" }],
	},
	// The dossier says `sv_logfile 1` writes logs, but no page gives the file's path, so no log is listed.
	logs: [],
	launchOptions: true,
};

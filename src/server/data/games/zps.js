// Zombie Panic! Source (a Source-engine mod-game on its own server). Dedicated server: Steam app 17505 ("Zombie Panic Source Dedicated
// Server", a Tool, anonymous login per Valve's Dedicated Servers List), game: app 17500.
//
// Facts from the research dossier (docs/research/games/zps/01..04). Its sources are a Steam community guide for the Linux server (v3.1+),
// a Windows discussion thread (fetch summary), LinuxGSM's ZPS defaults, XGamingServer and PingPerfect config pages, and Valve's generic
// Source pages. Nothing was run on a real install of this game. In short:
//  - the program is srcds.exe in the install folder, started with
//      -console -game zps -dedicated -secure -port <n> -strictportbind -maxplayers <n> +map <map>
//    plus, when given, +sv_setsteamaccount <token>. The Windows thread's startup line has -game zps, -dedicated and -secure;
//    -console is from a search snippet, -strictportbind from LinuxGSM's ZPS defaults. Nothing has to be last on the line;
//  - one game port: UDP for players and the server list, TCP on the same number for Source's remote console. The engine also takes
//    UDP 27020 (SourceTV) and a client port; the panel keeps the port after the game port free (portRules.js);
//  - the settings file is zps\cfg\server.cfg, which the game runs by itself (the dossier says `+servercfgfile` is only needed to name
//    another one), so the launch line does not run it. The panel writes it with the name, the password and sv_lan 0;
//  - the Steam login token is optional: Valve's page says one is needed when the server fails with error 18 or 106, and LinuxGSM
//    leaves it empty by default;
//  - method "process": the dossier names `quit` typed into the console as the stop, which the panel cannot type. The panel asks the
//    window to close, then ends the program after 15 s;
//  - mods: the Workshop collection, AngelScript and the admin files are edited by hand in zps\data and zps\; the dossier recommends no
//    install field, so this module adds none.
// Not verified on a real install (see docs/research/games/zps/05-implementation-notes.md): anonymous SteamCMD login, that srcds.exe
// sits in the install root and stays the one running process, that `-secure` and `-dedicated` are needed, that the cfg is run.

const EXE = "srcds.exe";
const GAME_DIR = "zps";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "zpo_biotec";
const DEFAULT_PLAYERS = 20;
const MAX_PLAYERS = 24;

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

/** Player slots: 24 is the ZPS guide's "the maximum supported by ZPS"; 20 is LinuxGSM's default. */
const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);

/**
 * A value for a line of a Source .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line (the CFG page: a line can hold several commands separated by `;`, and `//` starts a comment), so such a value is
 * refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Zombie Panic! Source's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map name as it appears in a file name: letters, digits, `_`, `-`, `.`. */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;

/** The Game Server Login Token, as pasted: one piece of text. Empty means none. */
export function cleanLoginToken(raw) {
	const token = String(raw ?? "").trim();
	if (!token) return "";
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(token)) {
		throw new Error("The Steam login token has spaces or odd characters in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers (Zombie Panic! Source is game app 17500, server app 17505).");
	}
	return token;
}

/** The launch line's arguments after the program. */
function launchArguments(p) {
	const args = [
		"-console",
		`-game ${GAME_DIR}`,
		"-dedicated",
		"-secure",
		`-port ${Number(p.port)}`,
		"-strictportbind",
		`-maxplayers ${playerLimit(p.maxPlayers)}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
	];
	// Only a value that is plainly a token reaches the script.
	const token = String(p.gslt ?? "").trim();
	if (/^[A-Za-z0-9_-]{1,64}$/.test(token)) args.push(`+sv_setsteamaccount ${token}`);
	return args;
}

const template = {
	id: "zps",
	displayName: "Zombie Panic! Source",
	type: "zps",
	// The dossier's stop is the `quit` console command, which the panel cannot type: the panel watches the process and asks it to close.
	method: "process",
	updateAppId: "17505",
	storeAppId: "17500",
	sharedInstall: false,
	// SteamCMD puts the server straight in the server's folder: srcds.exe and zps\ are in its root (to be confirmed).
	installLayoutRoot: "",
	description:
		"Zombie Panic! Source's dedicated server. It installs with an anonymous Steam login. A Steam login token is optional: Valve's page says one is only needed if the server stops with error 18 or 106. The first start downloads more files and can take a long time. Friends join from the in-game console with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode", "gslt"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		gslt: { label: "Steam login token (optional, from steamcommunity.com/dev/managegameservers, game app 17500). Valve says one is only needed if the server stops with error 18 or 106.", type: "text" },
	},
	// The one ZPS map the research saw in a start line (the Linux guide's example). Any other map is set with the Map argument in the
	// Settings tab's Launch options.
	mapChoices: [{ code: DEFAULT_MAP, label: `${DEFAULT_MAP} (the guide's example map)` }],
	// One game port: UDP for players and the server list, TCP on the same number for the remote console. 27015 (the engine's default) is
	// Core Keeper's here; 27020 is SourceTV's; 25950 and 25954 are the other two Source-era modules built beside this one. 25952 is kept
	// free with 25953 beside it (portRules.js).
	ports: [{ key: "port", label: "Game Port (UDP, and TCP for the remote console; the next port up is kept free too)", default: 25952 }],
	// Rejects a bad name, password, map or token before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as zpo_biotec.`);
		return { sessionName: name, serverPassword: password, mapCode: map, gslt: cleanLoginToken(raw.gslt) };
	},
	buildStartScriptFilename: () => "Start_ZPS.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Zombie Panic Source Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Zombie Panic Source Server"}"`,
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
			type: "zps",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running (per the dossier's Windows sources; the Linux guide says srcds_run only launches srcds_linux,
			// and which one stays running on Windows is NOT confirmed). The panel finds this server's process by where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "17505",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder and the lists the admins and the Workshop use (zps\cfg,
	// zps\data, plus the map lists in zps\). The validate warning in the dossier says a SteamCMD validate overwrites some of these.
	backup: {
		paths: [
			{ base: "working", rel: "zps/cfg", label: "Server settings" },
			{ base: "working", rel: "zps/data", label: "Admin, Workshop and plugin data" },
			{ base: "working", rel: "zps/default_plugins.json", label: "AngelScript plugin setup" },
			{ base: "working", rel: "zps/mapcycle.txt", label: "Map rotation" },
			{ base: "working", rel: "zps/maplist.txt", label: "Map list" },
		],
	},
	// No log file is named for ZPS by the dossier (the Linux guide names no log path and -condebug is not in its research), so none is listed.
	logs: [],
	launchOptions: true,
};

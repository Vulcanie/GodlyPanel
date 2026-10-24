// Insurgency (2014) (Valve, Source engine). Dedicated server: Steam app 237410, anonymous login, game: app 222880.
//
// Facts from the research dossier (docs/research/games/insurgency/01..04). Its main source is Valve's developer wiki page for the
// 2014 dedicated server, which is thin: one example start line, a list of server.cfg keys, no defaults and no stop command. In short:
//  - the program is srcds.exe in the install folder, started with the Valve example's arguments:
//      -console -port <n> +maxplayers <n> +map <map> +exec server.cfg
//    `-game` is not in the Valve example and is not added (see docs/research/games/insurgency/05-implementation-notes.md);
//  - one game port (the example's 27015 is moved to 25934, the panel's band);
//  - the panel writes insurgency\cfg\server.cfg itself (the name and the password): the page says to rename server.cfg.example to
//    server.cfg, so the game does not create it. The launch line runs it with `+exec server.cfg`;
//  - the Steam login token is not part of the dossier (token_required: unsure), so no token field is offered;
//  - method "process", no rconPort: the dossier names no stop command. The panel asks the window to close, then ends the program after 15 s;
//  - mods: the Workshop path is unconfirmed (the only source was unreadable), so no mod field is added.
// Not verified on a real install (see docs/research/games/insurgency/05-implementation-notes.md): anonymous SteamCMD login for app 237410,
// that srcds.exe starts the 2014 game without -game, that +exec server.cfg is read, and that closing the window ends it.

const EXE = "srcds.exe";
const GAME_DIR = "insurgency";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "market_coop";
// The Valve example uses 32 and the dossier names no other limit, so 32 is the start value and the form's ceiling.
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
		throw new Error(`${what} has a character that Insurgency's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map name as it appears in a file name: letters, digits, `_`, `-`, `.`. */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;

/** The launch line's arguments after the program. */
function launchArguments(p) {
	return [
		"-console",
		`-port ${Number(p.port)}`,
		`+maxplayers ${playerLimit(p.maxPlayers)}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		"+exec server.cfg",
	];
}

const template = {
	id: "insurgency",
	displayName: "Insurgency (2014)",
	type: "insurgency",
	// The dossier found no stop command and no RCON quit: the panel watches the process.
	method: "process",
	updateAppId: "237410",
	storeAppId: "222880",
	sharedInstall: false,
	// The Valve page's install command puts the server straight in the install folder: srcds.exe and insurgency\ sit in its root.
	installLayoutRoot: "",
	description:
		"Insurgency (2014)'s dedicated server (srcds). It is meant to install with an anonymous Steam login. Friends join from the in-game console with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// The map the Valve page's example starts with. Any other map is set with the Map argument in the Settings tab's Launch options.
	mapChoices: [{ code: "market_coop", label: "Market (market_coop)" }],
	// One game port. 25934 is outside every other template's ports, and 25935 (the port beside it) is kept free by the panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25934 }],
	// Rejects a bad name, password or map before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map's name, such as market_coop.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_Insurgency.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Insurgency Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Insurgency Server"}"`,
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
			type: "insurgency",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// srcds.exe is the program the Valve page names for Windows. Not yet seen on a real install of this game, nor is it confirmed
			// that it is the one process that stays running. The panel finds this server's process by where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "237410",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder. The dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "insurgency/cfg", label: "Server settings" }],
	},
	// The dossier names no log folder for this game and the launch line writes no -condebug, so no log file is listed.
	logs: [],
	launchOptions: true,
};

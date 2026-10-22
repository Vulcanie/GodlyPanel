// Counter-Strike: Source (Valve). Dedicated server: Steam app 232330 ("Counter-Strike: Source Dedicated Server", a Steam "Tool",
// anonymous login), game: app 240.
//
// Facts from the research dossier (docs/research/games/css/01..04), whose sources are Valve's developer wiki (Source Dedicated Server,
// Command line options, CFG, Dedicated Servers List, SteamCMD), SteamDB and a Docker image's README. The dossier is thin for this game:
// it names no server.cfg setting but hostname, sv_lan and sv_cheats. What is borrowed from the same-engine modules (Garry's Mod, which
// was seen working on a real install, and Left 4 Dead 2) is said so in docs/research/games/css/05-implementation-notes.md. In short:
//  - the program is srcds.exe in the install folder, started with
//      -console -game cstrike -port <n> -strictportbind +maxplayers <n> +map <map> +exec server.cfg -condebug
//    plus, when given, +sv_setsteamaccount <token>. Nothing has to be last on the line, so the "Launch options" form stays on.
//    `-tickrate` is never offered: Valve's page says it cannot be altered in CS:S;
//  - one game port: UDP for players and the server list, TCP on the same number for Source's remote console. The engine also takes
//    UDP 27020 (SourceTV) and a client port; 27020 is another template's default here, so two Source servers on one PC will have the
//    second one fall back to another port for it;
//  - the panel writes cstrike\cfg\server.cfg itself (name, password, sv_lan 0); the launch line runs it with `+exec server.cfg`. The
//    dossier could not say whether the game ships its own server.cfg (see the notes: a SteamCMD `validate` could reset it);
//  - the Steam login token is optional: Valve's page only says a token is needed when the server fails with error 18 or 106;
//  - method "process", no rconPort: the dossier found no stop command and no RCON password setting. The panel asks the window to
//    close, which ended Garry's Mod's srcds.exe cleanly in 4.5 s on a real install;
//  - mods: the dossier found no install method, so this module adds no mod field.
// Not verified on a real install (see docs/research/games/css/05-implementation-notes.md): that srcds.exe sits in the install root and
// stays the one running process, that `-game cstrike` is the right value, that the cfg is run, and that closing the window ends it.

const EXE = "srcds.exe";
const GAME_DIR = "cstrike";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "de_dust2";
const DEFAULT_PLAYERS = 10;
const MAX_PLAYERS = 64;

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

/** Player slots: 10 is the dossier's only CS:S example (a Docker README); the ceiling of 64 is the Source engine's, not from the dossier. */
const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);

/**
 * A value for a line of a Source .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line (the CFG page: a line can hold several commands separated by `;`, and `//` starts a comment), so such a value is
 * refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Counter-Strike: Source's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
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
		throw new Error("The Steam login token has spaces or odd characters in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers (Counter-Strike: Source is app 240).");
	}
	return token;
}

/** The launch line's arguments after the program. */
function launchArguments(p) {
	const args = [
		"-console",
		`-game ${GAME_DIR}`,
		`-port ${Number(p.port)}`,
		"-strictportbind",
		`+maxplayers ${playerLimit(p.maxPlayers)}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		"+exec server.cfg",
		"-condebug",
	];
	// Only a value that is plainly a token reaches the script.
	const token = String(p.gslt ?? "").trim();
	if (/^[A-Za-z0-9_-]{1,64}$/.test(token)) args.push(`+sv_setsteamaccount ${token}`);
	return args;
}

const template = {
	id: "css",
	displayName: "Counter-Strike: Source",
	type: "css",
	// Source's RCON exists (game port, TCP) but the dossier has no password setting or stop command for it: the panel watches the process.
	method: "process",
	updateAppId: "232330",
	storeAppId: "240",
	sharedInstall: false,
	// SteamCMD puts the server straight in the server's folder: srcds.exe and cstrike\ are in its root (to be confirmed).
	installLayoutRoot: "",
	description:
		"Counter-Strike: Source's dedicated server (srcds). It installs with an anonymous Steam login. A Steam login token is optional: Valve's page says one is only needed if the server stops with error 18 or 106. Friends join from the in-game console with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode", "gslt"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		gslt: { label: "Steam login token (optional, from steamcommunity.com/dev/managegameservers, app 240). Valve says one is only needed if the server stops with error 18 or 106.", type: "text" },
	},
	// The one CS:S map the research saw in a start line (a Docker README). Any other map is set with the Map argument in the Settings
	// tab's Launch options.
	mapChoices: [{ code: "de_dust2", label: "Dust II (de_dust2)" }],
	// UDP for players and the server list, TCP on the same number for the remote console. 27015 (the engine's default) is Core Keeper's
	// default here; 27145 is Garry's Mod's, 27245 Left 4 Dead 2's, 27215/27217 Barotrauma's and 27315 Unturned's, so this starts at 27515
	// (27516 is kept free beside it). The engine's UDP 27020 (SourceTV) is another template's default and is not moved.
	ports: [{ key: "port", label: "Game Port (UDP, and TCP for the remote console; the next port up is kept free too)", default: 27515 }],
	// Rejects a bad name, password, map or token before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as de_dust2.`);
		return { sessionName: name, serverPassword: password, mapCode: map, gslt: cleanLoginToken(raw.gslt) };
	},
	buildStartScriptFilename: () => "Start_CSS.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Counter-Strike Source Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest. Valve's page: "Change the hostname line ... in
	// <game>/cfg/server.cfg".
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Counter-Strike Source Server"}"`,
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
			type: "css",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running (per Valve's pages and the same engine's Garry's Mod, seen on a real install; to be
			// confirmed for this game). The panel finds this server's process by where it runs from, so another srcds.exe elsewhere on
			// the PC is not mistaken for it.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "232330",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder (server.cfg and the ban lists the game may write there). The
	// dossier found no save location, and a round restarts from the map.
	backup: {
		paths: [{ base: "working", rel: "cstrike/cfg", label: "Server settings and ban lists" }],
	},
	// console.log: everything the console prints, written because the launch line has -condebug (Valve's page; the file name and place
	// were seen on Garry's Mod). The game's own log folder is not in the dossier, so it is not listed.
	logs: [{ kind: "file", base: "working", rel: "cstrike/console.log", label: "Console log" }],
	launchOptions: true,
};

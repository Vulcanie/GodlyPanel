// Team Fortress 2 (Valve). Dedicated server: Steam app 232250 ("TF2 Dedicated Server", anonymous login). Game: app 440.
//
// Facts from the research dossier (docs/research/games/teamfortress2/01..04), whose sources are the TF Wiki's Linux and Windows
// dedicated-server pages and Valve's Source pages, a Docker image's README and the Valve command-line options page. Those pages were
// read as summarised text, and the dossier is rated low confidence. In short:
//  - the program is srcds.exe in the install folder, started with
//      -console -game tf -port <n> -strictportbind +maxplayers <n> +map ctf_2fort +exec server.cfg -condebug
//    plus, when given, +sv_setsteamaccount <token>. Nothing has to be last on the line, so the "Launch options" form stays on;
//  - one game port: UDP for players and the server list, TCP on the same number for the remote console (dossier, TF Wiki Linux page).
//    The engine also binds UDP 27020 (SourceTV) and UDP 27005 (client), and Steam uses UDP 26900; those are the engine's own defaults
//    and are not moved here, so a second Source server on the PC may fall back to another port for them;
//  - the panel writes tf\cfg\server.cfg itself (name and password); the launch line runs it with `+exec server.cfg`. The dossier says
//    the admin creates server.cfg by hand, so the panel's file is the one the game reads;
//  - the Steam Game Server Login Token is optional here. The dossier says a token is needed to appear in the server browser, but the
//    panel never requires it for install or start; it is passed with +sv_setsteamaccount only when given;
//  - method "process", no rconPort: the dossier gives an RCON password setting and a TCP RCON port but no verified quit command, so the
//    panel asks the window to close instead (see docs/research/games/teamfortress2/05-implementation-notes.md);
//  - mods: the dossier names no loader and no install method, so this module adds no mod field.
// Not verified on a real install (see docs/research/games/teamfortress2/05-implementation-notes.md).

const EXE = "srcds.exe";
const GAME_DIR = "tf";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "ctf_2fort";
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

/** Player slots: the dossier's Windows example uses 24 and says the maximum is 32. */
const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);

/**
 * A value for a line of a Source .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line (a line can hold several commands separated by `;`, and `//` starts a comment), so such a value is refused instead
 * of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Team Fortress 2's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
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
		throw new Error("The Steam login token has spaces or odd characters in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers (Team Fortress 2 is app 440).");
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
	id: "teamfortress2",
	displayName: "Team Fortress 2",
	type: "teamfortress2",
	// The dossier gives an RCON password setting and a TCP RCON port, but no verified quit command: the panel watches the process.
	method: "process",
	updateAppId: "232250",
	// Tokens are generated for app 440 (the dossier's Docker README), which is the game's own store id, used for dashboard artwork only.
	storeAppId: "440",
	sharedInstall: false,
	// SteamCMD puts the server straight in the server's folder: srcds.exe and tf\ are in its root (dossier's install folder layout).
	installLayoutRoot: "",
	description:
		"Team Fortress 2's dedicated server (srcds). It installs with an anonymous Steam login, and the install is large (about 8 GB free disk is advised). A Steam Game Server Login Token is optional here: without one the server may not appear in the public server browser, so friends can still join by address.",
	fields: ["sessionName", "serverPassword", "mapCode", "gslt"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		gslt: { label: "Steam login token (optional, from steamcommunity.com/dev/managegameservers, app 440). Without it the server may not show in the public browser.", type: "text" },
	},
	// The one map the dossier names in a start line (the Docker README and the TF Wiki examples). Any other map is set with the Map
	// argument in the Settings tab's Launch options.
	mapChoices: [{ code: "ctf_2fort", label: "2Fort (ctf_2fort)" }],
	// One game port: UDP for players and the server list, TCP on the same number for the remote console. 27015 (the engine's default) is
	// Core Keeper's default here, and 27515 is Counter-Strike: Source's, so this starts at 27615 (27616 is kept free beside it by the
	// shared port rule).
	ports: [{ key: "port", label: "Game Port (UDP, and TCP for the remote console; the next port up is kept free too)", default: 27615 }],
	// Rejects a bad name, password, map or token before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as ctf_2fort.`);
		return { sessionName: name, serverPassword: password, mapCode: map, gslt: cleanLoginToken(raw.gslt) };
	},
	buildStartScriptFilename: () => "Start_TF2.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Team Fortress 2 Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Team Fortress 2 Server"}"`,
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
			type: "teamfortress2",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running. The dossier's Windows page names srcds.exe as the server program but does not say which
			// process stays up (NOT FOUND); the panel finds this server's process by where it runs from, so another srcds.exe elsewhere
			// on the PC is not mistaken for it. To be confirmed on a real install.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "232250",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder (server.cfg and the files the dossier names next to it:
	// motd.txt, mapcycle.txt, pure_server_whitelist.txt). The dossier found no save location; a round restarts from the map.
	backup: {
		paths: [{ base: "working", rel: "tf/cfg", label: "Server settings, map rotation and custom-content lists" }],
	},
	// console.log: everything the console prints, written because the launch line has -condebug (Valve's options page). The place of
	// the file is the game folder, as with the other Source games; the dossier does not name it for this game, so it is unverified.
	logs: [{ kind: "file", base: "working", rel: "tf/console.log", label: "Console log" }],
	launchOptions: true,
};

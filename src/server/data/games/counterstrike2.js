// Counter-Strike 2 (Valve). Dedicated server: Steam app 730 (anonymous login; the old CS:GO server app 740 is obsolete), game: app 730.
//
// Facts from the research dossier (docs/research/games/counterstrike2/01..04), whose sources are Valve's developer wiki (Counter-Strike 2
// Dedicated Servers), csdb.gg's setup guide, XGaming's and GameHostBros' config guides and joedwards32's Docker image (CS2). Nothing was
// run on a real install. In short:
//  - the program is cs2.exe in game\bin\win64, started from that folder with
//      -dedicated -port <n> -maxplayers <n> +sv_setsteamaccount <token> (only when given) +map <map> +exec server.cfg
//    `-dedicated` is required (without it the game opens as a normal client). Nothing has to be last on the line, so the
//    "Launch options" form stays on;
//  - one game port, UDP for players and the server list. The dossier found no RCON default port and no stop command, so the panel
//    does not use RCON (method "process"). SourceTV (UDP 27020) is off unless a setting turns it on, and this module does not;
//  - the panel writes game\csgo\cfg\server.cfg itself (name, password, sv_lan 0). The launch line runs it with `+exec server.cfg`.
//    The panel also lists game\csgo\cfg\gamemode_competitive_server.cfg (the file the competitive mode reads, per the Docker page), but
//    the panel does not write that file: it is made when someone saves a setting in it;
//  - the Steam login token (GSLT) is OPTIONAL. Without one the server still installs and starts, but it is LAN-only and not listed
//    publicly (xgamingserver and csdb). It is only added to the launch line when given;
//  - mods: the dossier names Metamod:Source with CounterStrikeSharp as the plugin route but gives no install steps, so this module adds
//    no mod field. Workshop maps are "experimental" and need a Web API key: not offered.
// Not verified on a real install (see docs/research/games/counterstrike2/05-implementation-notes.md): that cs2.exe is the one process
// that stays running, that it must be started from game\bin\win64, that server.cfg is read through `+exec`, and that closing the
// window ends the server cleanly.

const EXE = "cs2.exe";
const EXE_DIR = "game\\bin\\win64";
const CFG_DIR = "game\\csgo\\cfg";
const SERVER_CFG_REL = `${CFG_DIR}\\server.cfg`;
const MODE_CFG_REL = `${CFG_DIR}\\gamemode_competitive_server.cfg`;

// Dossier: the Docker image's default game port is 27015, which Core Keeper uses here, so this starts at 27065 (27015 to 27099 is the
// range asked for; 27065 is free of every other template's default and of the ranges the other Source-style games use).
const DEFAULT_PORT = 27065;
const DEFAULT_MAP = "de_dust2";
// The Docker image's default (CS2_MAXPLAYERS=10). The dossier does not state a maximum; 64 is the panel's own ceiling, not a researched
// figure (see the notes: needs real-install verification).
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

const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);

/**
 * A value for a line of a Source-style .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game
 * does with the line (a line can hold several commands separated by `;`, and `//` starts a comment), so such a value is refused instead
 * of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Counter-Strike 2's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map name as it appears in a launch line: letters, digits, `_`, `-`, `.` (for example de_dust2). */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;

/** The Game Server Login Token, as pasted: one piece of text. Empty means none. */
export function cleanLoginToken(raw) {
	const token = String(raw ?? "").trim();
	if (!token) return "";
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(token)) {
		throw new Error("The Steam login token has spaces or odd characters in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers (Counter-Strike 2 is app 730).");
	}
	return token;
}

/** The launch line's arguments after the program. */
function launchArguments(p) {
	const args = [
		"-dedicated",
		`-port ${wholeNumber(p.port, DEFAULT_PORT, 1, 65535)}`,
		`-maxplayers ${playerLimit(p.maxPlayers)}`,
	];
	// Only a value that is plainly a token reaches the script.
	const token = String(p.gslt ?? "").trim();
	if (/^[A-Za-z0-9_-]{1,64}$/.test(token)) args.push(`+sv_setsteamaccount ${token}`);
	args.push(`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`, "+exec server.cfg");
	return args;
}

const template = {
	id: "counterstrike2",
	displayName: "Counter-Strike 2",
	type: "counterstrike2",
	// The dossier found no RCON default port and no stop command: the panel watches the process and asks its window to close.
	method: "process",
	updateAppId: "730",
	storeAppId: "730",
	sharedInstall: false,
	// SteamCMD puts the server straight in the server's folder: game\ is in its root (to be confirmed on a real install).
	installLayoutRoot: "",
	description:
		"Counter-Strike 2's dedicated server (cs2.exe, Steam app 730). It installs with an anonymous Steam login but is a large download (about 60 GB). A Steam login token is optional: without one the server is LAN-only and is not listed publicly. Friends join from the in-game console with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode", "gslt"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		gslt: { label: "Steam login token (optional, from steamcommunity.com/dev/managegameservers, app 730). Without one the server is LAN-only and is not listed publicly.", type: "text" },
	},
	// The two maps the research names: de_dust2 (Valve's example) and de_inferno (the Docker image's default start map). Any other map is
	// set with the Start map argument in the Settings tab's Launch options.
	mapChoices: [
		{ code: "de_dust2", label: "Dust II (de_dust2)" },
		{ code: "de_inferno", label: "Inferno (de_inferno)" },
	],
	// One game port: UDP for players and the server list. See the header for why 27065.
	ports: [{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT }],
	// Rejects a bad name, password, map or token before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map's name, such as de_dust2.`);
		return { sessionName: name, serverPassword: password, mapCode: map, gslt: cleanLoginToken(raw.gslt) };
	},
	buildStartScriptFilename: () => "Start_CS2.bat",
	// The program is run from game\bin\win64, the folder the dossier's Windows command is written from. New arguments are appended at the
	// end by the Launch options form; nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			`cd /d "%~dp0${EXE_DIR}"`,
			`start /MIN "${batSafe(p.name, "Counter-Strike 2 Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// The name, the password and sv_lan 0 are the lines the panel needs; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Counter-Strike 2 Server"}"`];
		const password = cfgText(p.serverPassword, "The password");
		if (password) lines.push(`sv_password "${password}"`);
		lines.push("sv_lan 0", "");
		return { relPath: SERVER_CFG_REL, content: lines.join("\r\n") };
	},
	buildServerEntry: (p) => {
		const serverCfg = `${p.installDir}\\${SERVER_CFG_REL}`;
		const modeCfg = `${p.installDir}\\${MODE_CFG_REL}`;
		return {
			name: p.name,
			type: "counterstrike2",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg, "gamemode_competitive_server.cfg": modeCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program the panel watches: the only one the research says to start. Not verified that it is the one process that stays up
			// (see the header). The panel finds this server's process by where it runs from, so a cs2.exe elsewhere is not mistaken for it.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "730",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder (server.cfg, the mode files, mapcycle.txt, if it is there) and
	// any plugins under csgo\addons (Metamod:Source and CounterStrikeSharp, per the dossier). The dossier found no save folder, so none is listed.
	backup: {
		paths: [
			{ base: "working", rel: "game/csgo/cfg", label: "Server settings and mode settings" },
			{ base: "working", rel: "game/csgo/addons", label: "Plugins and their settings (if any are installed)" },
		],
	},
	// The dossier found no log file location for the native server (only the Docker image's CS2_LOG_FILE switch), so nothing is listed.
	logs: [],
	launchOptions: true,
};

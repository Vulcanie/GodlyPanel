// BrainBread 2 (a Source-engine zombie co-op game). Dedicated server: Steam app 475370 ("BrainBread 2 Dedicated Server", a Tool, Windows and
// Linux), game: app 346330. Anonymous login is NOT confirmed: the FireDaemon guide's SteamCMD line uses `+login anonymous`, while a
// search snippet of Valve's list said "No" (that page could not be read). The resolved app-id table says "likely yes".
//
// Facts from the research dossier (docs/research/games/brainbread2/01..04). Its sources are a FireDaemon setup guide (2016, the only
// launch line), XGamingServer's config page (community), Game Host Bros' host guides and Steam's store page for the game. The official
// Valve wiki page was offline when the dossier was written. Nothing was run on a real install of this game. In short:
//  - the program is srcds.exe in the install folder, started with the FireDaemon guide's own order:
//      -console -game BrainBread2 -secure +map <map> +maxplayers <n> -port <n> +ip 0.0.0.0 +exec server.cfg
//    plus, when given, +sv_setsteamaccount <token>. Nothing has to be last on the line, so the "Launch options" form stays on.
//    THE PORT: the guide says the port "can be changed to anywhere from 27015 to 27020". The panel's default (25954) is outside that
//    range, as the brief asked. This is the first thing to test on a real install (see the notes);
//  - `+ip`: the guide says to put the PC's own address there ("not 127.0.0.1") and says the command "should never be removed". The
//    panel cannot know that address, so it writes 0.0.0.0 (all addresses). That is a choice, not from the guide: test it;
//  - the settings file is brainbread2\cfg\server.cfg, run with `+exec server.cfg`. The panel writes it with the name, the password and
//    sv_lan 0; the other lines are added by the Settings tab;
//  - the Steam login token is optional (the XGamingServer page has an empty sv_setsteamaccount line; Valve's generic page says one is
//    needed only when the server fails with error 18 or 106);
//  - method "process": the dossier names no stop command and no RCON stop. The panel asks the window to close, then ends the program
//    after 15 s;
//  - mods: the guide's gameinfo.txt Workshop lines are not touched; custom maps and content are files a person adds by hand. The
//    dossier recommends no install field, so this module adds none.
// Not verified on a real install (see docs/research/games/brainbread2/05-implementation-notes.md): anonymous login, the port range,
// the +ip value, that srcds.exe stays the one running process, that the server.cfg is run.

const EXE = "srcds.exe";
const GAME_ARG = "BrainBread2";
const GAME_DIR = "brainbread2";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "bbc_termoil";
const DEFAULT_PLAYERS = 12;
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

/** Player slots: 12 is the FireDaemon guide's example (`+maxplayers 12`); the dossier gives no ceiling, so the Source convention of 64 is used. */
const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);

/**
 * A value for a line of a Source .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line (the CFG page: a line can hold several commands separated by `;`, and `//` starts a comment), so such a value is
 * refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that BrainBread 2's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
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
		throw new Error("The Steam login token has spaces or odd characters in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers (BrainBread 2 is game app 346330, server app 475370).");
	}
	return token;
}

/** The launch line's arguments after the program, in the order the FireDaemon guide gives them. */
function launchArguments(p) {
	const args = [
		"-console",
		`-game ${GAME_ARG}`,
		"-secure",
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		`+maxplayers ${playerLimit(p.maxPlayers)}`,
		`-port ${Number(p.port)}`,
		"+ip 0.0.0.0",
		"+exec server.cfg",
	];
	// Only a value that is plainly a token reaches the script.
	const token = String(p.gslt ?? "").trim();
	if (/^[A-Za-z0-9_-]{1,64}$/.test(token)) args.push(`+sv_setsteamaccount ${token}`);
	return args;
}

const template = {
	id: "brainbread2",
	displayName: "BrainBread 2",
	type: "brainbread2",
	// The dossier names no console stop and no RCON stop for this game: the panel watches the process and asks it to close.
	method: "process",
	updateAppId: "475370",
	storeAppId: "346330",
	sharedInstall: false,
	// SteamCMD puts the server straight in the server's folder: srcds.exe and brainbread2\ are in its root (to be confirmed).
	installLayoutRoot: "",
	description:
		"BrainBread 2's dedicated server (srcds). It installs with the Steam login the setup guide uses, anonymous, which is not yet confirmed for this game. A Steam login token is optional. The vendor guide says the port can be moved only within 27015 to 27020, so this server's default port is one to test first. Friends join from the in-game console with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode", "gslt"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		gslt: { label: "Steam login token (optional, from steamcommunity.com/dev/managegameservers, game app 346330). Valve says one is only needed if the server stops with error 18 or 106.", type: "text" },
	},
	// The one BrainBread 2 map the research saw in a start line (the FireDaemon guide's example). Any other map is set with the Map
	// argument in the Settings tab's Launch options.
	mapChoices: [{ code: DEFAULT_MAP, label: `${DEFAULT_MAP} (the guide's example map)` }],
	// One game port. 27015 (the engine's and the guide's default) is Core Keeper's here, and 27020 is SourceTV's; 25954 is the panel's
	// choice from the range the other Source modules use (25950 and 25952 are the other two). 25954 is kept free with 25955 beside it.
	// The guide's own range is 27015 to 27020: see the notes before relying on this port.
	ports: [{ key: "port", label: "Game Port (UDP, and TCP for the remote console; the next port up is kept free too)", default: 25954 }],
	// Rejects a bad name, password, map or token before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as bbc_termoil.`);
		return { sessionName: name, serverPassword: password, mapCode: map, gslt: cleanLoginToken(raw.gslt) };
	},
	buildStartScriptFilename: () => "Start_BB2.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "BrainBread 2 Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "BrainBread 2 Server"}"`,
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
			type: "brainbread2",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running (the FireDaemon guide runs srcds.exe as a Windows service and names no other process; NOT
			// confirmed beyond that). The panel finds this server's process by where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "475370",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder, and the custom content the host adds (the Game Host Bros
	// guide's custom folder). The dossier found no save location for the server.
	backup: {
		paths: [
			{ base: "working", rel: "brainbread2/cfg", label: "Server settings and ban lists" },
			{ base: "working", rel: "brainbread2/custom", label: "Custom maps and content" },
		],
	},
	// No log file is named for BrainBread 2 by the dossier, so none is listed.
	logs: [],
	launchOptions: true,
};

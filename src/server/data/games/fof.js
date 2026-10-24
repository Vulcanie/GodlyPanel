// Fistful of Frags (Valve-engine Wild West shooter, developer Tripwire-era Source mod). Dedicated server: Steam app 295230 (anonymous login
// per the dossier), game: app 265630 (shown only in store URLs). See docs/research/games/fof/05-implementation-notes.md.
//
// Facts from the research dossier (docs/research/games/fof/01..04). Its sources are a FireDaemon KB article, a Pterodactyl egg, a Steam
// forum thread, a Docker image and hosting-provider guides; no developer config reference was found. In short:
//  - the program is srcds.exe in the install folder, started with
//      -console -game fof -port <n> +maxplayers <n> +map <map> +exec server.cfg
//    Nothing has to be last on the line, so the "Launch options" form stays on. -ip is left out: the dossier's two sources disagree
//    on what it means;
//  - one game port: the dossier gives 27015 as the default (protocol not stated) and 27020 for SourceTV. This module starts at 25975
//    (25976 is kept free beside it), so no other template's ports are taken;
//  - the panel writes fof\cfg\server.cfg itself (name, password, sv_lan 0). The dossier conflicts on the file name: most sources say
//    server.cfg, one host guide says the server only reads fofserver.cfg. server.cfg is used (see the notes);
//  - the Steam login token: the host guide (EmeraldHost) puts it in server.cfg as sv_setsteamaccount "TOKEN", so it is written there,
//    not on the launch line, and it is kept out of the .bat. Whether a token is needed for public listing is UNSURE in the dossier;
//  - method "process", no rconPort: the stop command conflicts across sources (a Pterodactyl egg says `quit`, FireDaemon says the game
//    does not respond to a graceful shutdown). The panel asks the window to close, then ends the program after 15 s;
//  - mods: Metamod:Source and SourceMod are installed by hand, so this module adds no mod field.
// Not verified on a real install (see docs/research/games/fof/05-implementation-notes.md): that srcds.exe sits in the install root, that
// server.cfg (and not fofserver.cfg) is read, that closing the window ends it, and whether the token is needed.

const EXE = "srcds.exe";
const GAME_DIR = "fof";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "fof_fistful";
// The dossier's examples are 20 (FireDaemon, Steam forum) and the XGamingServer template's "16 max for FFA". 16 is the start value and 20,
// the largest figure the examples show, is the ceiling for the form.
const DEFAULT_PLAYERS = 16;
const MAX_PLAYERS = 20;

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
		throw new Error(`${what} has a character that Fistful of Frags' config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
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
		throw new Error("The Steam login token has spaces or odd characters in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers (create it for game id 295230).");
	}
	return token;
}

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
	id: "fof",
	displayName: "Fistful of Frags",
	type: "fof",
	// The dossier's stop evidence conflicts (see the header): the panel watches the process and asks the window to close.
	method: "process",
	updateAppId: "295230",
	storeAppId: "265630",
	sharedInstall: false,
	// SteamCMD puts the server in its folder: srcds.exe and fof\ sit in the root (FireDaemon's path is C:\Fistful of Frags\srcds.exe).
	installLayoutRoot: "",
	description:
		"Fistful of Frags' dedicated server (srcds). It installs with an anonymous Steam login. Whether a Steam login token is needed for other players to find the server is not settled: the panel writes the token into the server's settings file when you give one. Friends who know the address join with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode", "gslt"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		gslt: { label: "Steam login token (optional, from steamcommunity.com/dev/managegameservers, game id 295230)", type: "text" },
	},
	// The two maps the dossier's examples start with (FireDaemon, Pterodactyl egg). Any other map is set in the Settings tab's Launch options.
	mapChoices: [
		{ code: "fof_fistful", label: "Fistful (fof_fistful)" },
		{ code: "fof_revenge", label: "Revenge (fof_revenge)" },
	],
	// Game port: the dossier gives 27015 as the default. 25975 is outside every other template's ports, and 25976 (the port beside it) is
	// kept free by the panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25975 }],
	// Rejects a bad name, password, map or token before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as fof_fistful.`);
		return { sessionName: name, serverPassword: password, mapCode: map, gslt: cleanLoginToken(raw.gslt) };
	},
	buildStartScriptFilename: () => "Start_FOF.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Fistful of Frags Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest. The token, when given, goes here (the host guide's
	// place for it), not on the launch line.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Fistful of Frags Server"}"`,
		];
		const password = cfgText(p.serverPassword, "The password");
		if (password) lines.push(`sv_password "${password}"`);
		lines.push("sv_lan 0");
		const token = cleanLoginToken(p.gslt);
		if (token) lines.push(`sv_setsteamaccount "${token}"`);
		lines.push("");
		return { relPath: SERVER_CFG_REL, content: lines.join("\r\n") };
	},
	buildServerEntry: (p) => {
		const serverCfg = `${p.installDir}\\${SERVER_CFG_REL}`;
		return {
			name: p.name,
			type: "fof",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running (srcds.exe on Windows, per the FireDaemon KB and the Steam forum; not yet seen on a real
			// install of this game). The panel finds this server's process by where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "295230",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder. The dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "fof/cfg", label: "Server settings" }],
	},
	// The dossier names no log folder for this game and the launch line has no -condebug, so no log file is listed.
	logs: [],
	launchOptions: true,
};

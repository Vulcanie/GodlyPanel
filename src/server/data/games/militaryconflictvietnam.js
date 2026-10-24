// Military Conflict: Vietnam (Source engine). Dedicated server: Steam app 1136190 (a Tool; anonymous login NOT FOUND in the dossier).
// Game: app 1012110. Facts from the research dossier (docs/research/games/militaryconflictvietnam/01..04). The dossier is low confidence:
// its sources are the SteamCMD app info, the Valve wiki page, SteamDB and one hosting provider's guides (Game Host Bros). In short:
//  - the program is srcds_x64.exe in the install folder: the Windows server launch entry SteamCMD lists for app 1136190. Which
//    process stays running was NOT FOUND, so the panel watches srcds_x64.exe; srcds_win64.exe is the other name Source servers use.
//    Confirmed on a real install: srcds_x64.exe is the only server program and the one that stays running (06-verification.md);
//  - started with -console -game vietnam -port <n> +maxplayers <n> +map <map> +exec server.cfg. `-game vietnam` comes from the hosting
//    panel's paths (/vietnam/cfg/server.cfg, /vietnam/maps); the other arguments are Source's usual ones and are not in the dossier;
//  - one game port, 25970 by default (from the panel's band; 25971 is kept free by the panel's rule). No query or RCON port is
//    written: the dossier found no RCON port;
//  - the panel writes vietnam\cfg\server.cfg itself (hostname, sv_password, sv_lan 0);
//  - no login token field: the dossier could not say whether the game needs one for public listing;
//  - method "process": no developer statement of a stop command. The panel asks the window to close, then ends the program after 15 s;
//  - mods: SourceMod and Metamod are installed by hand per the host guide. The panel has no field for that, so none is added.

const EXE = "srcds_x64.exe";
const GAME_DIR = "vietnam";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

// The dossier's most-evidenced map: listed on the Valve wiki's map list and on the host's Zombies page (both name mcv_bridge).
const DEFAULT_MAP = "mcv_bridge";
// The dossier gives no player default or ceiling. 32 is the panel's limit for the form, not a figure from a page.
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
		throw new Error(`${what} has a character that Military Conflict: Vietnam's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
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
		`-port ${Number(p.port)}`,
		`+maxplayers ${playerLimit(p.maxPlayers)}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		"+exec server.cfg",
	];
}

const template = {
	id: "militaryconflictvietnam",
	displayName: "Military Conflict: Vietnam",
	type: "militaryconflictvietnam",
	// The dossier found no developer stop command and no RCON port the panel can rely on: the panel watches the process.
	method: "process",
	updateAppId: "1136190",
	storeAppId: "1012110",
	sharedInstall: false,
	// SteamCMD puts the server in its folder, with the program and vietnam\ in the root (dossier: install folder name, not a layout).
	installLayoutRoot: "",
	description:
		"Military Conflict: Vietnam's dedicated server (Source engine). It is meant to install with an anonymous Steam login, which the research could not confirm. Friends join from the in-game console with connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// The dossier's most-evidenced map. Any other map is set with the Map argument in the Settings tab's Launch options.
	mapChoices: [{ code: DEFAULT_MAP, label: `${DEFAULT_MAP} (the dossier's default map)` }],
	// One game port. 25970 is outside every other template's ports, and 25971 (the port beside it) is kept free by the panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25970 }],
	// Rejects a bad name, password or map before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as mcv_bridge.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_MilitaryConflictVietnam.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Military Conflict Vietnam Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Military Conflict Vietnam Server"}"`,
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
			type: "militaryconflictvietnam",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The panel starts and watches srcds_x64.exe itself, found by where it runs from. Confirmed on a real install.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "1136190",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder. The dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "vietnam/cfg", label: "Server settings" }],
	},
	// The dossier names no log folder or log argument for this game, so no log is listed.
	logs: [],
	launchOptions: true,
};

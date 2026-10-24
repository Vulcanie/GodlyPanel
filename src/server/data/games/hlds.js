// Half-Life Dedicated Server (GoldSrc, Valve). Dedicated server: Steam app 90 (a tool app; SteamCMD needs the game folder chosen first with
// `app_set_config 90 mod cstrike`). Game: Counter-Strike 1.6, which runs from the `cstrike` folder. See
// docs/research/games/hlds/05-implementation-notes.md.
//
// Facts from the research dossier (docs/research/games/hlds/01..04). The dossier's most-evidenced default game is cstrike (Valve's
// command-line page, the ReHLDS egg's default and LinuxGSM's CS 1.6 defaults all use it), so this module serves Counter-Strike 1.6. In short:
//  - the program is hlds.exe in the install folder, started with
//      -console -game cstrike -port <n> +maxplayers <n> +map <map> -exec server.cfg
//    (Valve's own minimal start line, with -exec for the settings file). Nothing has to be last, so the "Launch options" form stays on;
//  - one game port: the dossier gives 27015 as the default. This module starts at 25944 (25945 is kept free beside it), so no other
//    template's ports are taken. The VAC port (-sport, 26900) is left to the engine, which moves it on for a second server;
//  - the panel writes cstrike\server.cfg itself (name, password, sv_lan 0). Verified on a real install: the engine reads server.cfg from
//    the game folder, NOT from cstrike\cfg\ (a file there is ignored), and the panel's file replaces the stock one the install brings;
//  - method "process", no rconPort: no page names a stop command. The panel asks the window to close, then ends the program after 15 s;
//  - mods: Metamod and AMX Mod X are installed by hand, so this module adds no mod field.
// SteamCMD must run `+app_set_config 90 mod cstrike` before `+app_update 90`; the template's updateMod does that.
// Verified on a real install: the mod step above (updateMod), that hlds.exe is the one process that stays running, and A2S.

const EXE = "hlds.exe";
const GAME_DIR = "cstrike";
const SERVER_CFG_REL = `${GAME_DIR}\\server.cfg`;

const DEFAULT_MAP = "de_dust2";
// The dossier's examples are 8 (Valve's minimal start line), 20 and 22 (Valve's command-line page), and the ReHLDS egg's 32. 32 is the
// start value and the ceiling for the form: 32 is the largest figure any page shows, and the real limit is not on a page.
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
 * A value for a line of a GoldSrc .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line, so such a value is refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Half-Life's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
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
		"-exec server.cfg",
	];
}

const template = {
	id: "hlds",
	displayName: "Half-Life Dedicated Server",
	type: "hlds",
	// The dossier found no stop command and no RCON setting it can rely on: the panel watches the process.
	method: "process",
	updateAppId: "90",
	// App 90 holds many mods; without this SteamCMD fetches only the base `valve` folder and -game cstrike cannot start.
	updateMod: "cstrike",
	// The Counter-Strike 1.6 store page, shown on the create screen. The dossier gives it as app 10.
	storeAppId: "10",
	sharedInstall: false,
	// SteamCMD puts the server in its folder: hlds.exe and cstrike\ sit in the root.
	installLayoutRoot: "",
	description:
		"Valve's GoldSrc dedicated server, set up here to run Counter-Strike 1.6. Valve no longer updates it. Friends who know the address join with the console command connect <your address>:<port>.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// The map the dossier's Valve command-line page and the ReHLDS egg both start with. Any other map is set with the Map argument in the
	// Settings tab's Launch options.
	mapChoices: [{ code: "de_dust2", label: "Dust II (de_dust2)" }],
	// Game port: the dossier's default. 25944 is outside every other template's ports, and 25945 (the port beside it) is kept free by
	// the panel's rule.
	ports: [{ key: "port", label: "Game Port (the port players connect to; the next port up is kept free too)", default: 25944 }],
	// Rejects a bad name, password or map before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as de_dust2.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_HLDS.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Half-Life Dedicated Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// Only the lines the panel needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Half-Life Server"}"`,
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
			type: "hlds",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program the panel watches. The dossier does not say which exe stays running on Windows; hlds.exe is the only Windows
			// server program it names. The panel finds this server's process by where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "90",
			// The same mod on every update (see the template).
			updateMod: "cstrike",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder. The dossier found no save location.
	backup: {
		paths: [{ base: "working", rel: "cstrike/server.cfg", label: "Server settings" }],
	},
	// The dossier names no log folder for this game and the launch line has no -condebug, so no log file is listed.
	logs: [],
	launchOptions: true,
};

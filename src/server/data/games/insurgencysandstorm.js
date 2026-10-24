// Insurgency: Sandstorm (New World Interactive). Dedicated server: Steam app 581330, anonymous login. The Steam game-server login token
// (GSLT) is made for app 581320 and is optional here.
//
// Facts from the research dossier (docs/research/games/insurgencysandstorm/01..04), whose sources are the Pterodactyl egg, the mod.io
// Server Admin Guide, Nodecraft's config and mods pages, Host Havoc's GSLT page, LinuxGSM and two Docker READMEs. The official NWI guide
// could not be read, so every fact here comes from those pages. In short:
//  - the program is InsurgencyServer.exe (the dossier's Windows name; no path is given, so the start script runs it from the install
//    folder root, which is UNVERIFIED). The panel watches the same name;
//  - the start line is the map and scenario, then ?MaxPlayers=28 (and ?Password= when set) on the same address, then the dash
//    options -Port, -QueryPort, -log, -hostname and (when given) -GSLTToken, in the egg's order. Dash options go after the program and
//    the map address after the map, as the dossier's examples show. The "Launch options" form appends at the end, which nothing needs
//    to be last;
//  - the default map and scenario are the mod.io guide's own example pair (Oilfield / Scenario_Refinery_Push_Security). The dossier
//    says a typo falls back to Farmhouse and that the scenario must suit the map, so the pair is unverified beyond the example;
//  - ports: the dossier's 27102 (game) and 27131 (query) are not used. The panel uses 25940 (UDP game port) and 25942 (query, which the
//    mod.io guide says needs both TCP and UDP), with 25941 kept free as the panel's companion-port precaution (see portRules.js). All
//    in the 25900-25989 range no other template uses. No RCON port is set: the dossier's RCON protocol is NOT FOUND;
//  - the join password goes on the map address (?Password=), the form the mod.io guide gives. The name goes on -hostname. The
//    login token goes on -GSLTToken. The dossier gives no length limits, so the panel's own checks are only for characters that break
//    the start script or the address;
//  - Game.ini (Insurgency\Saved\Config\WindowsServer) is created as a comment-only file. The guide says the admin creates the .ini files,
//    and the game's own creation of them is NOT FOUND. Admins.txt (Insurgency\Config\Server) is created empty, since the guide says
//    the file must exist. The Settings tab adds the Game.ini settings the dossier gives with defaults;
//  - NO GRACEFUL STOP FROM THE PANEL. The egg stops the server with ^C in its console. The panel cannot type there, so Stop closes the
//    window and ends the process after 15 s. The window is kept minimized so ^C can be sent by hand first. No RCON stop command is
//    documented (NOT FOUND);
//  - mods: none. Mods come from mod.io and need a login that changed in update 1.20 (an emailed one-time code, per one Docker README);
//    the panel has no path for that, so no mod field is built and the -mods flag is left out;
//  - the Windows log folder and the save folder are NOT FOUND, so no log is listed and saves are not backed up.
// See docs/research/games/insurgencysandstorm/05-implementation-notes.md for what must be checked on a real install.

const EXE = "InsurgencyServer.exe";
const CONFIG_DIR = "Insurgency\\Saved\\Config\\WindowsServer";
const GAME_INI_REL = `${CONFIG_DIR}\\Game.ini`;
const SERVER_CONFIG_DIR = "Insurgency\\Config\\Server";
const ADMINS_REL = `${SERVER_CONFIG_DIR}\\Admins.txt`;

// The mod.io guide's own example start line (map, scenario). Named here so the form and the notes can point at it.
const MAP_AND_SCENARIO = "Oilfield?Scenario=Scenario_Refinery_Push_Security";
// The mod.io guide's example player count.
const MAX_PLAYERS = 28;

// Ports in the 25900-25989 range, clear of the other templates (see the header).
const DEFAULT_GAME_PORT = 25940;
const DEFAULT_QUERY_PORT = 25942;

const SERVER_NAME_FALLBACK = "Insurgency Sandstorm Server";

/**
 * A text the start script holds between quotes or on the address: a quote, a percent sign, a caret, `!`, `&`, `|`, `<`, `>` or a line
 * break would change what cmd does with the line, so such a value is refused instead of being quietly altered.
 */
export function plainText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"%^!&|<>]/.test(text)) {
		throw new Error(`${what} has a character the server's start script cannot hold (a quote, %, ^, !, &, |, <, > or a line break). Use plain letters, digits, spaces and punctuation.`);
	}
	return text;
}

/** The panel's own name, used for the server name when none was typed: those characters are removed, not refused. */
const cleanedName = (value) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%^!&|<>]/g, "")
		.replace(/\s+/g, " ")
		.trim();

/** The join password. It sits on the map address, so only letters, digits and a few punctuation marks are taken. Blank means open. */
const PASSWORD_RE = /^[A-Za-z0-9_.@#*+~-]{1,64}$/;
export function joinPassword(value) {
	const text = String(value ?? "").trim();
	if (!text) return "";
	if (!PASSWORD_RE.test(text)) {
		throw new Error("The join password can use only letters, digits and these: _ . - @ # * + ~ (it is written into the server's map address, where a space, ?, = or & would break it). Up to 64 characters.");
	}
	return text;
}

/** The Steam login token, as pasted. Blank means none. */
const TOKEN_RE = /^[A-Za-z0-9_-]{1,64}$/;
export function loginToken(value) {
	const text = String(value ?? "").trim();
	if (!text) return "";
	if (!TOKEN_RE.test(text)) {
		throw new Error("The Steam login token has spaces or odd characters in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers (the token is made for app 581320).");
	}
	return text;
}

/** A port number from the form, or the default when it is not a usable one. */
const portOr = (value, fallback) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= 1 && n <= 65535 ? n : fallback;
};

/** The server name the panel writes: the typed name, or the panel's name, cleaned, or a fallback. */
const serverNameOf = (p) => plainText(p.sessionName, "The server name") || cleanedName(p.name) || SERVER_NAME_FALLBACK;

/** The window title in `start /MIN "<title>"`: the panel's name with the characters cmd acts on removed. */
const windowTitleOf = (p) => cleanedName(p.name) || SERVER_NAME_FALLBACK;

/** The start line: the map address, then the dash options in the egg's order, with the token last when one is given. */
function startLine(p) {
	const password = joinPassword(p.serverPassword);
	const address = `${MAP_AND_SCENARIO}?MaxPlayers=${MAX_PLAYERS}${password ? `?Password=${password}` : ""}`;
	const args = [
		EXE,
		address,
		`-Port=${portOr(p.port, DEFAULT_GAME_PORT)}`,
		`-QueryPort=${portOr(p.queryPort, DEFAULT_QUERY_PORT)}`,
		"-log",
		`-hostname="${serverNameOf(p)}"`,
	];
	const token = loginToken(p.gslt);
	if (token) args.push(`-GSLTToken=${token}`);
	return args.join(" ");
}

const template = {
	id: "insurgencysandstorm",
	displayName: "Insurgency: Sandstorm",
	type: "insurgencysandstorm",
	// The dossier gives no verified RCON protocol and no stop command, so the panel watches the process.
	method: "process",
	updateAppId: "581330",
	sharedInstall: false,
	// SteamCMD installs the server into the server's folder; the dossier's paths are relative to that folder.
	installLayoutRoot: "",
	description:
		"Insurgency: Sandstorm's dedicated server (anonymous install, about 5.6 GB, and 1 GB of RAM with no players). The panel cannot stop it cleanly: the game stops with ^C in its own console window, and the panel cannot type there, so Stop closes the window and ends the process after 15 seconds. The Steam login token is optional here; the sources disagree on whether the server runs without one. Mods are not supported.",
	fields: ["sessionName", "serverPassword", "gslt"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		serverPassword: { label: "Join Password (optional; players type it to join)", type: "text" },
		gslt: { label: "Steam login token (optional; made for app 581320 at steamcommunity.com/dev/managegameservers)", type: "text" },
	},
	// The game port (UDP) and the query port (the mod.io guide says both TCP and UDP). 25941 is kept free beside the game port.
	ports: [
		{ key: "port", label: "Game Port (UDP; the next port up is kept free too)", default: DEFAULT_GAME_PORT },
		{ key: "queryPort", label: "Query Port (UDP and TCP, the one the server browser asks)", default: DEFAULT_QUERY_PORT },
	],
	// Rejects a bad name, password or token before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => ({
		sessionName: plainText(raw.sessionName, "The server name") || plainText(raw.name, "The server name"),
		serverPassword: joinPassword(raw.serverPassword),
		gslt: loginToken(raw.gslt),
	}),
	buildStartScriptFilename: () => "Start_Insurgency.bat",
	// Started from the install folder, as the egg does. `start /MIN` keeps the window minimized rather than hidden, so ^C can be sent.
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${windowTitleOf(p)}" ${startLine(p)}`,
			"",
		].join("\r\n"),
	// Game.ini is created as a comment only: the guide says the admin creates the .ini files, and the Settings tab adds the keys.
	buildConfigFile: () => ({
		relPath: GAME_INI_REL,
		content: "; Written by GodlyPanel. Each setting goes under the section header it belongs to; the Settings tab writes them for you.\r\n",
	}),
	// Admins.txt is created empty: the guide says the file must exist. The admin list is edited by hand (steamID64 per line).
	buildExtraFiles: () => [{ relPath: ADMINS_REL, content: "" }],
	postWrite: async (p) => {
		const warnings = [
			"The server cannot be stopped cleanly from the panel. The game stops with ^C in its own console window, and the panel cannot type into a console. Stop closes the window and ends the process after 15 seconds. Open the server's window (kept minimized on the taskbar), press Ctrl+C, wait for it to close, and only then press Stop or update.",
		];
		if (!String(p?.gslt ?? "").trim()) {
			warnings.push("No Steam login token was given. The sources disagree: one says the server will not start without it, the others say it only lets the server show in the public browser. Check this on a real install.");
		}
		return { warnings };
	},
	buildServerEntry: (p) => {
		const gameIni = `${p.installDir}\\${GAME_INI_REL}`;
		return {
			name: p.name,
			type: "insurgencysandstorm",
			method: "process",
			host: "127.0.0.1",
			port: portOr(p.port, DEFAULT_GAME_PORT),
			queryPort: portOr(p.queryPort, DEFAULT_QUERY_PORT),
			sessionName: serverNameOf(p),
			serverPassword: joinPassword(p.serverPassword),
			configPath: gameIni,
			configPaths: {
				"Game.ini": gameIni,
			},
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The dossier names InsurgencyServer.exe as the server program; that it is the process which stays running is UNVERIFIED.
			processName: EXE,
			// Kept on the taskbar rather than hidden, so ^C can be typed into the console before Stop (the panel cannot send it).
			windowMode: "minimized",
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "581330",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// The settings folder (Game.ini) and the admin and map-list folder (Admins.txt, MapCycle.txt, Motd.txt, Mods.txt). No save folder
	// is known, so saves are not backed up here.
	backup: {
		paths: [
			{ base: "working", rel: CONFIG_DIR, label: "Server settings (Insurgency\\Saved\\Config\\WindowsServer)" },
			{ base: "working", rel: SERVER_CONFIG_DIR, label: "Admin, map cycle and message lists (Insurgency\\Config\\Server)" },
		],
	},
	// The Windows log folder is NOT FOUND in the dossier, so no log is listed.
	logs: [],
	launchOptions: true,
};

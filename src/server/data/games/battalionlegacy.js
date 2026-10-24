// BATTALION: Legacy (Unreal Engine). Dedicated server: Steam app 805140, anonymous login. The game's own store app is 489940. Windows
// (BattalionServer.exe) and Linux (BattalionServer.sh).
//
// Facts from the research dossier (docs/research/games/battalionlegacy/01..04). Its sources are a 2022 Steam forum guide, a Pterodactyl
// egg, a Docker image and hosting-provider pages; the publisher's own docs were not found, and nothing was run on a real install. In short:
//  - the program is BattalionServer.exe in the install root (seen on a real install; the dossier's BattalionServer folder does not exist). It is a
//    launcher that stays running and starts BattalionServer-Win64-Shipping.exe, which holds the ports; stopping the launcher ends both;
//  - the arguments are the egg's, in its `-Name=value` form, plus -Port (seen on a real install to set the game port): -Port, -QueryPort, -SteamServerName (the name) and -AdminPassword. Its
//    -Queue="Wartide" and -Log are left out: the dossier gives no meaning for the first and no log file location for the second;
//  - ports: the egg's 27015 (game) and 27016 (query) are Source-era defaults that other modules here use, so this module starts at 25956
//    (game) and 25958 (query). The launch line sets both: -Port (the game port; the log shows the game net driver listening on it) and
//    -QueryPort (answers A2S). The server also opens the game port + 1. See the notes and 06-verification.md;
//  - NO CONFIG FILE. The example Game.ini's location is NOT FOUND on any page, and the forum says edits to the packaged file often did
//    nothing, so the panel writes no file. The name and the admin password are on the launch line instead. A join password has no
//    evidenced flag (the forum's -Password conflicts with the egg), so the form offers none;
//  - NO GRACEFUL STOP FROM THE PANEL. The egg stops the server with ^C in its console. The panel cannot type there, so Stop closes the
//    window and ends the process after 15 s. The window is kept minimized so ^C can be sent by hand first;
//  - method "process", no RCON (none found). The process watched is the BattalionServer.exe launcher, which stays running for as long as
//    the game does; Stop ends it and its child after 15 s (seen on a real install);
//  - mods: none (no official mod path was found). No mod field is added.
// Verified on a real install (docs/research/games/battalionlegacy/06-verification.md): install, start, A2S on the query port, game port, Stop.

const EXE = "BattalionServer.exe";

// The game port and the query port, with the port beside each kept free (portRules.js). Both are outside every other template's ports.
const DEFAULT_GAME_PORT = 25956;
const DEFAULT_QUERY_PORT = 25958;

// The egg's limits for the name and the admin password (its SERVER_NAME and ADMIN_PW validation).
const NAME_MAX = 60;
const ADMIN_PASSWORD_MAX = 20;

// Characters cmd acts on inside a .bat, even between quotes (%, and ! when delayed expansion is on), that end the quoted value (the quote,
// and a backslash which the game's argument reading may treat as an escape), or that a line break would split.
const UNSAFE = /[\u0000-\u001f"%&|<>^!\\]/;
const stripUnsafe = (value) => String(value ?? "").replace(/[\u0000-\u001f"%&|<>^!\\]/g, "");

/**
 * Refuses a name or password that cannot go on the launch line safely, instead of quietly changing it. A quote, a percent sign,
 * & | < > ^ !, a backslash or a line break would change what cmd (or the game's argument reading) does with the line.
 */
export function launchText(value, what, max) {
	const text = String(value ?? "").trim();
	if (UNSAFE.test(text)) {
		throw new Error(`${what} has a character that cannot go safely on BATTALION's launch line (a quote, a percent sign, & | < > ^ !, a backslash or a line break). Use letters, digits, spaces and plain punctuation without those.`);
	}
	if (max && text.length > max) throw new Error(`${what} is longer than ${max} characters, the most the game's own setup accepts.`);
	return text;
}

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) => stripUnsafe(value).replace(/\s+/g, " ").trim() || fallback;

/** The server name as it goes on the launch line: at most 60 characters. */
const serverName = (p) => batSafe(p.sessionName || p.name, "BATTALION Server").slice(0, NAME_MAX).trim();

const portOr = (value, fallback) => Number(value) || fallback;

const template = {
	id: "battalionlegacy",
	displayName: "BATTALION: Legacy",
	type: "battalionlegacy",
	// No RCON or admin REST API was found, so the panel watches the process.
	method: "process",
	updateAppId: "805140",
	storeAppId: "489940",
	sharedInstall: false,
	// The egg installs the server into the folder root, so BattalionServer\ sits directly inside the server's folder.
	installLayoutRoot: "",
	description:
		"BATTALION: Legacy's dedicated server (anonymous install, no Steam account needed). The panel cannot stop it cleanly: the server stops with Ctrl+C in its own console window, and the panel cannot type there, so Stop closes the window and ends the process after 15 seconds. The server name and the admin password go on the server's start command; the game's settings file is not used by the panel.",
	fields: ["sessionName", "adminPassword"],
	fieldMeta: {
		sessionName: { label: `Server Name (shown in the server browser, ${NAME_MAX} characters at most)`, type: "text" },
		adminPassword: { label: `Admin Password (optional; lets a player use the in-game admin login; ${ADMIN_PASSWORD_MAX} characters at most)`, type: "text" },
	},
	ports: [
		{ key: "port", label: "Game Port (UDP; the next port up is kept free too; see the notes on the game port)", default: DEFAULT_GAME_PORT },
		{ key: "queryPort", label: "Query Port (UDP; the server browser asks it; the next port up is kept free too)", default: DEFAULT_QUERY_PORT },
	],
	// Rejects a name or password that cannot go on the launch line before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => ({
		sessionName: launchText(raw.sessionName, "The server name", NAME_MAX) || launchText(raw.name, "The server name", NAME_MAX),
		adminPassword: launchText(raw.adminPassword, "The admin password", ADMIN_PASSWORD_MAX),
	}),
	buildStartScriptFilename: () => "Start_BATTALION.bat",
	// Run from the install folder, as the egg does. `start /MIN` keeps the window minimized rather than hidden, so Ctrl+C can be sent.
	// The name and admin password are written in the egg's `-Name="value"` form; the admin password flag is left out when none is set.
	buildStartScript: (p) => {
		const admin = stripUnsafe(p.adminPassword).trim();
		const args = [
			`-Port=${portOr(p.port, DEFAULT_GAME_PORT)}`,
			`-QueryPort=${portOr(p.queryPort, DEFAULT_QUERY_PORT)}`,
			`-SteamServerName="${serverName(p)}"`,
		];
		if (admin) args.push(`-AdminPassword="${admin}"`);
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, "BATTALION Server")}" ${EXE} ${args.join(" ")}`,
			"",
		].join("\r\n");
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "battalionlegacy",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		sessionName: p.sessionName,
		adminPassword: p.adminPassword,
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// The launcher stays running and starts BattalionServer-Win64-Shipping.exe, which holds the ports; Stop ends both.
		processName: EXE,
		// Kept on the taskbar rather than hidden, so Ctrl+C can be typed into the console before Stop (the panel cannot send it).
		windowMode: "minimized",
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "805140",
		autoUpdate: false,
	}),
};

export default {
	template,
	// No settings folder or save folder is known, so the panel's backup keeps nothing.
	backup: { paths: [] },
	// No log file location is known (the forum says -log prints to the console window).
	logs: [],
	launchOptions: true,
};

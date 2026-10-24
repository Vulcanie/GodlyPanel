// Mordhau (Triternion). Dedicated server: Steam app 629800, anonymous login (no account needed). The game's own app id is not in the dossier,
// so the template does not name it (storeAppId is left out).
//
// Facts from the research dossier (docs/research/games/mordhau/01..04), whose sources are the Pterodactyl egg, ESAGAMES' guide, Mintservers',
// XGamingServer's, Emerald's and FreakHosting's pages and the cm2network Docker image. The Fandom guide could not be read. Nothing was run on
// a real install until 2026-10-23, when the panel's own install showed what the dossier could not: the Windows build has `MordhauServer.exe`
// in the folder root, which starts `Mordhau\Binaries\Win64\MordhauServer-Win64-Shipping.exe` (the process that holds the ports). In short:
//  - the panel starts `MordhauServer.exe` and watches the Shipping process;
//  - the start line is the egg's command with the map first, then -MaxSlots, -Port, -queryport and -beaconport, in the egg's order. The
//    egg's -USEALLAVAILABLECORES is left out: no source describes it. The map is the egg's default, Grad/FL_Grad, and is not in the form;
//  - Game.ini under Mordhau\Saved\Config\WindowsServer (the game fills it with its defaults on a first start) holds the name and the two passwords. The panel writes it when the server is created,
//    which the dossier says the game does only after a full first start. The section is [/Script/Mordhau.MordhauGameSession] (two sources;
//    Emerald's MapRotation page puts MapRotation under MordhauGameMode instead, so MapRotation is left out). The game rewrites Game.ini on
//    shutdown and strips comments, so the file is edited only with the server stopped;
//  - MaxSlots is written on the launch line, not in Game.ini: the egg passes it that way, and two sources give it in Game.ini as well. Writing
//    both would risk two different values, so the launch line alone is used. The Settings tab does not show the Game.ini MaxSlots key;
//  - ports: the egg's 7777, 27015 and 15000 are not used, because they are the game's common defaults and other templates here take them.
//    The panel uses 25900 (game), 25902 (query) and 25903 (beacon), with 25901 kept free as the game's companion port (the panel's own
//    precaution, see portRules.js). All in the 25900-25989 range that no other template uses;
//  - NO GRACEFUL STOP FROM THE PANEL. The egg stops the server with ^C in its console. The panel cannot type there, so Stop closes the window
//    and ends the process after 15 s. The window is kept minimized so ^C can be sent by hand first;
//  - mods: none. The dossier gives two sections for `Mods=` (MordhauGameSession and Modivol) and says mod.io only, so no field is built. The
//    -ModDownload flag is left out for the same reason;
//  - the game log is Mordhau\Saved\Logs\Mordhau.log; the save folder is not known, so only the settings folder is backed up.
// See docs/research/games/mordhau/05-implementation-notes.md and 06-verification.md.

const EXE_PATH = "MordhauServer.exe";
const EXE = "MordhauServer-Win64-Shipping.exe";
const CONFIG_DIR = "Mordhau\\Saved\\Config\\WindowsServer";
const GAME_INI_REL = `${CONFIG_DIR}\\Game.ini`;
const SECTION = "[/Script/Mordhau.MordhauGameSession]";

// The egg's first map (its DEFAULT_MAP example and its start command).
const DEFAULT_MAP = "/Game/Mordhau/Maps/Grad/FL_Grad";
// The egg's example player count. Its validation rule is 1 to 60; the panel writes this value and it can be changed in Launch options.
const MAX_SLOTS = 48;

// Ports in the 25900-25989 range, clear of the other templates (see the header). Game port, query port (two up: the next one is kept free)
// and beacon port (one per server).
const DEFAULT_GAME_PORT = 25900;
const DEFAULT_QUERY_PORT = 25902;
const DEFAULT_BEACON_PORT = 25903;

// The Pterodactyl egg's own limits for the name and the passwords (its validation rules).
const NAME_MAX = 40;
const PASSWORD_MAX = 20;

/** A text for the config file, or for a password or name: a line break or control character would change what the game reads, so it is refused. */
export function textFor(value, what, max) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f]/.test(text)) {
		throw new Error(`${what} has a line break or a control character, which the server's config file cannot hold. Use plain text.`);
	}
	if (text.length > max) {
		throw new Error(`${what} is longer than ${max} characters, the most the game's own setup accepts.`);
	}
	return text;
}

/** A text safe to put between the quotes of a .bat `start` title. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

const portOr = (value, fallback) => Number(value) || fallback;

const nameOf = (p) => textFor(p.sessionName, "The server name", NAME_MAX) || textFor(p.name, "The server name", NAME_MAX) || "Mordhau Server";

const template = {
	id: "mordhau",
	displayName: "Mordhau",
	type: "mordhau",
	// The dossier verifies no RCON protocol the panel speaks, so the panel watches the process.
	method: "process",
	updateAppId: "629800",
	sharedInstall: false,
	// The egg installs the server into the folder root, so Mordhau\ is directly inside the server's folder.
	installLayoutRoot: "",
	description:
		"Mordhau's dedicated server (anonymous install, no Steam account needed). The panel cannot stop it cleanly either: the server is stopped with ^C in its own console window, and the panel cannot type there, so Stop closes the window and ends the process after 15 seconds. The name and the passwords go in Game.ini, which the panel writes when it creates the server.",
	fields: ["sessionName", "serverPassword", "adminPassword"],
	fieldMeta: {
		sessionName: { label: `Server Name (shown in the server browser, ${NAME_MAX} characters at most)`, type: "text" },
		serverPassword: { label: `Join Password (optional; ${PASSWORD_MAX} characters at most)`, type: "text" },
		adminPassword: { label: `Admin Password (optional; lets a player use AdminLogin in the game; ${PASSWORD_MAX} characters at most)`, type: "text" },
	},
	ports: [
		{ key: "port", label: "Game Port (UDP; the next port up is kept free too)", default: DEFAULT_GAME_PORT },
		{ key: "queryPort", label: "Query Port (UDP; the port the server browser asks)", default: DEFAULT_QUERY_PORT },
		{ key: "beaconPort", label: "Beacon Port (UDP; one per server on this PC)", default: DEFAULT_BEACON_PORT },
	],
	// Rejects a bad name or password before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => ({
		sessionName: textFor(raw.sessionName, "The server name", NAME_MAX) || textFor(raw.name, "The server name", NAME_MAX),
		serverPassword: textFor(raw.serverPassword, "The join password", PASSWORD_MAX),
		adminPassword: textFor(raw.adminPassword, "The admin password", PASSWORD_MAX),
	}),
	buildStartScriptFilename: () => "Start_Mordhau.bat",
	// Started from the install folder, as the egg does. `start /MIN` keeps the window minimized rather than hidden, so ^C can be sent.
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, "Mordhau Server")}" ${EXE_PATH} ${DEFAULT_MAP} -MaxSlots=${MAX_SLOTS} -Port=${portOr(p.port, DEFAULT_GAME_PORT)} -queryport=${portOr(p.queryPort, DEFAULT_QUERY_PORT)} -beaconport=${portOr(p.beaconPort, DEFAULT_BEACON_PORT)}`,
			"",
		].join("\r\n"),
	// Game.ini: the name and the two passwords, in the section the dossier gives. The game keeps the rest of its own defaults.
	buildConfigFile: (p) => {
		const lines = [
			SECTION,
			`ServerName=${nameOf(p)}`,
			`ServerPassword=${textFor(p.serverPassword, "The join password", PASSWORD_MAX)}`,
			`AdminPassword=${textFor(p.adminPassword, "The admin password", PASSWORD_MAX)}`,
			"",
		];
		return { relPath: GAME_INI_REL, content: lines.join("\r\n") };
	},
	postWrite: async (p) => {
		const warnings = [
			"The server cannot be stopped cleanly from the panel. The game stops with ^C in its own console window, and the panel cannot type into a console. Stop closes the window and ends the process after 15 seconds. Open the server's window (kept minimized on the taskbar), press Ctrl+C, wait for it to close, and only then press Stop or update.",
			"Game.ini is rewritten by the game when the server shuts down, so edit it only while the server is stopped.",
		];
		if (!String(p?.adminPassword ?? "").trim()) warnings.push("No admin password was set, so the in-game admin login (AdminLogin) is not available to anyone.");
		return { warnings };
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "mordhau",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		beaconPort: p.beaconPort,
		sessionName: p.sessionName,
		serverPassword: p.serverPassword,
		adminPassword: p.adminPassword,
		configPath: `${p.installDir}\\${GAME_INI_REL}`,
		configPaths: {
			"Game.ini": `${p.installDir}\\${GAME_INI_REL}`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// MordhauServer.exe starts this program and keeps running next to it; this is the one that holds the ports.
		processName: EXE,
		// Kept on the taskbar rather than hidden, so ^C can be typed into the console before Stop (the panel cannot send it).
		windowMode: "minimized",
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "629800",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The settings folder, which holds Game.ini and Engine.ini. No save folder is known, so saves are not backed up here.
	backup: {
		paths: [{ base: "working", rel: CONFIG_DIR, label: "Server settings (Mordhau\\Saved\\Config\\WindowsServer)" }],
	},
	logs: [{ kind: "file", base: "working", rel: "Mordhau/Saved/Logs/Mordhau.log", label: "Game log" }],
	launchOptions: true,
};

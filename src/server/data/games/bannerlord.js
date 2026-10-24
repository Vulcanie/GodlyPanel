// Mount & Blade II: Bannerlord (TaleWorlds). Dedicated server: Steam tool app 1863440 ("Mount & Blade II: Dedicated Server"), anonymous login.
// The game's own app id (261550) is not used here: the dossier says it may download the game instead of the server tool.
//
// Facts from the research dossier (docs/research/games/bannerlord/01..04). The official hosting page (moddocs.bannerlord.com) gives the
// launch flags, the config keys named below, the default port, the token steps and the console commands. The program's name and folder
// (bin\Win64_Shipping_Server\DedicatedCustomServer.Starter.exe) and the app id come from community pages only; the dossier rates the
// whole game "medium" confidence and nothing was run on a real install. In short:
//  - the panel starts `DedicatedCustomServer.Starter.exe` from the install folder with
//      /dedicatedcustomserverconfigfile ds_config_server.txt /port 25910 /LogOutputPath "<folder>\logs" [/dedicatedcustomserverauthtoken <token>]
//    The official page's config file must sit in Modules\Native, so that is where the panel writes it;
//  - one UDP port for players (the dossier also gives TCP on the same number for the web admin panel and map downloads: not checked here);
//  - the config file holds the three keys the official page names (ServerName, GameType, AdminPassword), then start_game_and_mission,
//    which the page gives as the shorthand that makes the server visible and starts a mission. Without it players wait in intermission;
//  - the login token is passed on the launch line, which the official page allows (no token file is needed). The page says a token is
//    required for a public listing; without one the server may run but not register publicly. The token is a secret: it is in the
//    start script (as the Team Fortress 2 login token is) and is not stored in the server's entry;
//  - the panel cannot stop the server cleanly: no stop command or signal is on any page, so Stop closes the window and ends the process
//    after 15 s (the panel's usual method). The window is kept minimized;
//  - method "process": no RCON or query port is documented (NOT FOUND), so the panel watches the process;
//  - no mod field: the dossier names no Workshop ids or loader; mods are folders the players must also load;
//  - the process that stays running is not named by any page; the Starter is used because it is the program the dossier names. Unverified.
// What is NOT written, and why, is in docs/research/games/bannerlord/05-implementation-notes.md.

const PROGRAM_REL = "bin\\Win64_Shipping_Server\\DedicatedCustomServer.Starter.exe";
const PROCESS = "DedicatedCustomServer.Starter.exe";
const CONFIG_NAME = "ds_config_server.txt";
const CONFIG_REL = `Modules\\Native\\${CONFIG_NAME}`;
const NATIVE_DIR_REL = "Modules\\Native";
const LOG_DIR_NAME = "logs";

// Port 25910 (UDP): clear of the other templates, and the next port up (25911) is held by the panel's companion-port rule.
const DEFAULT_PORT = 25910;

// The official page's list of game modes, and the mode the panel writes (the official page's own example, and the community examples).
const DEFAULT_GAME_TYPE = "TeamDeathmatch";
const DEFAULT_NAME = "Bannerlord Server";

/** A text for a config line or a password: a line break or control character would change what the file says, so it is refused. */
export function lineText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f]/.test(text)) {
		throw new Error(`${what} has a line break or a control character, which the server's config file cannot hold. Use plain text.`);
	}
	return text;
}

/**
 * A login token, as pasted from the game's console (customserver.gettoken). The dossier does not give its format, so only plain letters,
 * digits and a few marks are accepted, which keeps the launch line safe for cmd. Empty means no token.
 */
const TOKEN_RE = /^[A-Za-z0-9_][A-Za-z0-9_+/=.-]{0,511}$/;
export function cleanToken(raw) {
	const token = String(raw ?? "").trim();
	if (!token) return "";
	if (!TOKEN_RE.test(token)) {
		throw new Error("The login token has spaces or characters the panel cannot put on the launch line. Paste only the token itself, the text the game's console printed for customserver.gettoken.");
	}
	return token;
}

/** A text safe to put between the quotes of a .bat `start` title. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

const portOr = (value, fallback) => Number(value) || fallback;

const nameOf = (p) => lineText(p.sessionName, "The server name") || lineText(p.name, "The server name") || DEFAULT_NAME;

/** The folder for the server's logs, quoted on the line. A folder with a character cmd acts on is left out rather than risked. */
const logFolderOf = (installDir) => {
	const dir = String(installDir ?? "").replace(/\\+$/, "");
	if (!dir || /["%&|<>^!]/.test(dir)) return null;
	return `${dir}\\${LOG_DIR_NAME}`;
};

const template = {
	id: "bannerlord",
	displayName: "Mount & Blade II: Bannerlord",
	type: "bannerlord",
	// No RCON or query port is documented, so the panel watches the process.
	method: "process",
	updateAppId: "1863440",
	sharedInstall: false,
	// The dossier's install folder layout puts bin\ and Modules\ in the server's folder root.
	installLayoutRoot: "",
	description:
		"Mount & Blade II: Bannerlord's dedicated server (a Steam tool, anonymous install). A login token made in the game is needed for the server to be listed publicly; without one the server may run but not appear in the public list. The panel cannot stop the server cleanly: Stop closes its window and ends the process after 15 seconds.",
	fields: ["sessionName", "adminPassword", "authToken"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		adminPassword: { label: "Admin Password (optional; protects the server's web admin panel)", type: "text" },
		authToken: {
			label: "Login token (optional; made in the game with customserver.gettoken, needed for a public listing; it expires after 3 months)",
			type: "text",
		},
	},
	ports: [{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT }],
	// Rejects a bad name, password or token before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => ({
		sessionName: lineText(raw.sessionName, "The server name") || lineText(raw.name, "The server name"),
		adminPassword: lineText(raw.adminPassword, "The admin password"),
		authToken: cleanToken(raw.authToken),
	}),
	buildStartScriptFilename: () => "Start_Bannerlord.bat",
	// Run from the install folder, as the dossier's examples do. `start /MIN` keeps the window minimized.
	buildStartScript: (p) => {
		const args = [`/dedicatedcustomserverconfigfile ${CONFIG_NAME}`, `/port ${portOr(p.port, DEFAULT_PORT)}`];
		const logs = logFolderOf(p.installDir);
		if (logs) args.push(`/LogOutputPath "${logs}"`);
		const token = cleanToken(p.authToken);
		if (token) args.push(`/dedicatedcustomserverauthtoken ${token}`);
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, "Bannerlord Server")}" ${PROGRAM_REL} ${args.join(" ")}`,
			"",
		].join("\r\n");
	},
	// The config file the official page's launch flag names. The three keys are the ones the official page names; the file ends with
	// start_game_and_mission (the page's shorthand), so the server becomes visible and starts a mission.
	buildConfigFile: (p) => {
		const lines = [`ServerName ${nameOf(p)}`, `GameType ${DEFAULT_GAME_TYPE}`];
		const admin = lineText(p.adminPassword, "The admin password");
		if (admin) lines.push(`AdminPassword ${admin}`);
		lines.push("start_game_and_mission", "");
		return { relPath: CONFIG_REL, content: lines.join("\r\n") };
	},
	postWrite: async (p) => {
		const warnings = [
			"The server cannot be stopped cleanly from the panel: no stop command is documented. Stop closes the server's window and ends the process after 15 seconds. Keep the window (it is minimized on the taskbar), and close it yourself first if you can.",
			"The panel registers no map: the research found no map file name for the official build. Without a map in ds_config_server.txt the server may have nothing to play; add one by hand with the server stopped, once you know your install's map names.",
		];
		if (!String(p?.authToken ?? "").trim()) {
			warnings.push("No login token was given, so the server is not listed publicly. It can still run and be joined by its address, if the game lets it.");
		}
		return { warnings };
	},
	buildServerEntry: (p) => {
		const configPath = `${p.installDir}\\${CONFIG_REL}`;
		return {
			name: p.name,
			type: "bannerlord",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: p.sessionName,
			configPath,
			configPaths: { [CONFIG_NAME]: configPath },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program the dossier names. Which process stays running is NOT FOUND on any page; to be checked on a real install.
			processName: PROCESS,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "1863440",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// The folder with the config file (ds_config_server.txt) and the game's own sample configs. No save folder is named by any page.
	backup: {
		paths: [{ base: "working", rel: NATIVE_DIR_REL, label: "Server settings (the config file in Modules\\Native)" }],
	},
	logs: [{ kind: "dir", base: "working", rel: LOG_DIR_NAME, label: "Server log" }],
	// The dossier documents no launch argument that needs a form, and the launch line has no "-" or "+" argument the form could find.
	launchOptions: false,
};

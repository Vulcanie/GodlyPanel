// Wurm Unlimited (Code Club). Dedicated server: Steam app 402370 ("Wurm Unlimited Dedicated Server", anonymous login), game: app 366220.
//
// Facts from the research dossier (research/wurmunlimited/00..04), whose sources are the Wurmpedia server page (the main source, last
// edited in 2016), Supercraft, XGamingServer, Citadel, Pingperfect, the Docker image and the Pterodactyl egg. NOTHING was run on a real
// install, and the dossier's sources disagree on the config file name. In short:
//  - the program is WurmServerLauncher.exe in the install folder (Wurmpedia: "run WurmServerLauncher.exe from the installation folder");
//  - the world is chosen with `start=<world>`, a folder in the install folder. The dossier says a world must be made first with the game's
//    own launcher, so the panel does not create one: it only names a world that already exists. Creative and Adventure are the two names
//    the Pterodactyl egg and XGamingServer give; the egg's `start= dist/Adventure` (a path) is not used;
//  - everything the panel sets is on the launch line: the world, the game port (3724 TCP on Wurmpedia, which the egg calls "externalport"),
//    the Steam query port (one port of 27016-27030 UDP, as `queryport`), the player limit, the server name, the server password and the
//    admin password (`adminpwd`). Nothing else is written by the panel;
//  - wurm.ini, the main settings file (Wurmpedia: "the wurm.ini file in the folder of the server that is loaded ... with the start= argument"),
//    is read from the world folder at start. The panel does NOT create it (the dossier does not say whether the game does); the Settings tab
//    edits it once it exists;
//  - no mods are managed: a community modloader is needed first and the dossier gives no panel-safe mod path;
//  - NO GRACEFUL STOP FROM THE PANEL. The launcher's own "Shutdown server" (in its window, with seconds and a reason) is the documented
//    way. The panel has no way to press it, so Stop closes the window and ends the process after 15 seconds. The window is kept minimized,
//    not hidden, so the shutdown can be used first;
//  - the process watched is WurmServerLauncher.exe. The dossier does not say which process stays running (the launcher may start Java).
// Not verified on a real install (see research/wurmunlimited/05-implementation-notes.md).

const EXE = "WurmServerLauncher.exe";

// The two worlds the dossier names (Pterodactyl egg: "The defaults provided are Creative and Adventure (case sensitive)").
const WORLD_CHOICES = [
	{ code: "Creative", label: "Creative" },
	{ code: "Adventure", label: "Adventure" },
];
const DEFAULT_WORLD = "Creative";

// The Wurmpedia page: 3724 TCP is the port the clients connect through. The query port is one port of the 27016-27030 UDP range.
const DEFAULT_PORT = 3724;
const DEFAULT_QUERY_PORT = 27020;

// The egg and XGamingServer give maxplayers without a range; 1 to 200 is only a sanity range for the form. 25 is the egg's example value and
// the panel's starting value, not a game default.
const PLAYERS_MIN = 1;
const PLAYERS_MAX = 200;
const PLAYERS_DEFAULT = 25;

// The egg's rule for the server name: 64 characters at most.
const NAME_MAX = 64;

// Characters cmd acts on inside a .bat (even between quotes, % and ! when delayed expansion is on), a quote, a backslash and control
// characters. Outside plain ASCII is refused too: the dossier says nothing about it and the panel's other Windows games keep to ASCII.
const UNSAFE_TEXT = /[\u0000-\u001f"%&|<>^!\\]|[^\u0000-\u007f]/;
const UNSAFE_TEXT_ALL = new RegExp(UNSAFE_TEXT.source, "g");
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;

const wholeNumber = (value, fallback, min, max) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

const portOf = (p) => wholeNumber(p.port, DEFAULT_PORT, 1, 65535);
const queryOf = (p) => wholeNumber(p.queryPort, DEFAULT_QUERY_PORT, 1, 65535);
const playersOf = (p) => wholeNumber(p.maxPlayers, PLAYERS_DEFAULT, PLAYERS_MIN, PLAYERS_MAX);

/** The world the server loads: a folder name in the install folder. Anything that is not a plain folder name falls back to Creative. */
const worldOf = (p) => {
	const world = String(p.mapCode ?? "").trim();
	return NAME_WORD.test(world) ? world : DEFAULT_WORLD;
};

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const windowTitle = (value) =>
	String(value ?? "")
		.replace(UNSAFE_TEXT_ALL, "")
		.replace(/\s+/g, " ")
		.trim() || "Wurm Unlimited Server";

/** The server name for the launch line, cleaned (used for values that were not checked by resolveParams). */
const displayName = (value) =>
	String(value ?? "")
		.replace(UNSAFE_TEXT_ALL, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, NAME_MAX)
		.trim() || "Wurm Unlimited Server";

/** A password with its characters cmd acts on removed (used for values that were not checked by resolveParams). */
const passwordWord = (value) => String(value ?? "").trim().replace(/[\s"%&|<>^!\\]/g, "");

/**
 * A text value that the panel refuses rather than changes: a quote, a percent sign, the cmd characters, a backslash, a control character or
 * a non-ASCII letter would change what cmd does with the line. Spaces and common punctuation are allowed.
 */
export function plainText(value, what, max) {
	const text = String(value ?? "").trim();
	if (UNSAFE_TEXT.test(text)) {
		throw new Error(`${what} can only use plain English letters, digits, spaces and ordinary punctuation. Quotes, % & | < > ^ ! and backslashes are not allowed.`);
	}
	if (text.length > max) throw new Error(`${what} can be ${max} characters at most.`);
	return text;
}

/** A password or admin password: one word of plain English letters, digits and ordinary punctuation, with no spaces. */
export function secretWord(value, what) {
	const text = String(value ?? "").trim();
	if (!text) return "";
	if (/[\s"%&|<>^!\\]|[^!-~]/.test(text)) {
		throw new Error(`${what} must be one word of plain English letters, digits and punctuation, with no spaces, quotes, % & | < > ^ ! or backslashes.`);
	}
	return text;
}

/** The world name: a plain folder name such as Creative. Anything else is refused before the download starts. */
export function worldName(value) {
	const world = String(value ?? "").trim() || DEFAULT_WORLD;
	if (!NAME_WORD.test(world)) throw new Error(`"${world.slice(0, 60)}" is not a world folder name. Use the folder's name only (letters, digits, _, . and -), such as Creative.`);
	return world;
}

const template = {
	id: "wurmunlimited",
	displayName: "Wurm Unlimited",
	type: "wurmunlimited",
	// No query or RCON protocol the panel speaks is verified (the RMI remote control is off by default and is not the panel's protocol), so the
	// panel watches the process.
	method: "process",
	updateAppId: "402370",
	storeAppId: "366220",
	sharedInstall: false,
	// Wurmpedia runs WurmServerLauncher.exe from the installation folder, so the program sits in the folder's root.
	installLayoutRoot: "",
	// Not in the dossier ("Install size: NOT FOUND"). The task gives the two Steam depots as about 185 MB and 230 MB; this is a rounded guess for
	// the free-space check only.
	estimatedInstallBytes: 500_000_000,
	description:
		"Wurm Unlimited's dedicated server, a standalone sandbox server run by a Java launcher. A world (a folder in the server's folder) must be made first with the game's own launcher; the panel can only name one that exists. THE PANEL CANNOT SHUT IT DOWN CLEANLY: the launcher's own Shutdown server command has to be used in its window first. Stop closes the window and ends the process after 15 seconds. Mods need a community modloader that is not managed here.",
	fields: ["sessionName", "serverPassword", "adminPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser; 64 characters at most, plain English letters and digits)", type: "text" },
		adminPassword: { label: "Admin Password (optional: unlocks the in-game admin commands; one word, no spaces)", type: "text" },
	},
	// The worlds the dossier names. The world must already exist in the server's folder; the panel does not make one.
	mapChoices: WORLD_CHOICES,
	// The game port (TCP, for players) and the Steam query port (UDP). Wurmpedia also lists UDP 8766 for general Steam communication and RMI on
	// 7220 and 7221 on the local address; no launch argument sets those in the dossier, so the panel does not manage them (see the notes).
	ports: [
		{ key: "port", label: "Game Port (TCP, players connect here)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Steam Query Port (UDP; one of 27016 to 27030)", default: DEFAULT_QUERY_PORT },
	],
	// Rejects a bad name, password, admin password or world before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const sessionName = String(raw.sessionName ?? "").trim() ? plainText(raw.sessionName, "The server name", NAME_MAX) : displayName(raw.name);
		return {
			sessionName,
			serverPassword: secretWord(raw.serverPassword, "The server password"),
			adminPassword: secretWord(raw.adminPassword, "The admin password"),
			mapCode: worldName(raw.mapCode),
		};
	},
	buildStartScriptFilename: () => "Start_WurmUnlimited.bat",
	// The launcher, run from the install folder. The title ends in "-Wurm" so the line has a "-x" word before the program: the panel's Launch
	// options reader only recognises a line with one, and Wurm's own arguments are written without a dash (key=value).
	buildStartScript: (p) => {
		const args = [
			`start=${worldOf(p)}`,
			`externalport=${portOf(p)}`,
			`queryport=${queryOf(p)}`,
			`maxplayers=${playersOf(p)}`,
			`servername="${p.sessionName ? displayName(p.sessionName) : displayName(p.name)}"`,
		];
		const serverPassword = passwordWord(p.serverPassword);
		const adminPassword = passwordWord(p.adminPassword);
		if (serverPassword) args.push(`serverpassword=${serverPassword}`);
		if (adminPassword) args.push(`adminpwd=${adminPassword}`);
		// Real install: the world must be a folder in the install root, but Steam only ships the templates under dist\<world>. The first
		// start copies the template over (nothing is overwritten once the world has its wurm.ini).
		const world = worldOf(p);
		const seed = `if not exist "%~dp0${world}\\wurm.ini" if exist "%~dp0dist\\${world}" xcopy "%~dp0dist\\${world}" "%~dp0${world}\\" /E /I /Q /Y >nul`;
		return ["@echo off", 'cd /d "%~dp0"', seed, `start /MIN "${windowTitle(p.name)} -Wurm" ${EXE} ${args.join(" ")}`, ""].join("\r\n");
	},
	// No config file is written: the launch line carries everything the panel sets, and the game's wurm.ini is not known to be created by the
	// game or to need the panel's keys (see the notes).
	postWrite: async (p) => {
		const warnings = [
			"Wurm Unlimited cannot be stopped cleanly from the panel. Use Shutdown server in the launcher's window first (it asks for seconds and a reason), wait for the window to close, and only then press Stop or update. Stop closes the window and ends the process after 15 seconds.",
			`The world "${worldOf(p)}" is made on the first start by copying the template that ships with the server (dist\\${worldOf(p)}) into the server's folder. A world with another name must already exist there, made with the game's own launcher.`,
			"The game port is TCP (players connect through it) and the query port is UDP. The panel's firewall check opens UDP only, so also allow the game port's TCP in Windows Firewall and forward it on your router.",
		];
		if (!String(p?.adminPassword ?? "").trim()) {
			warnings.push("No admin password was set, so the in-game admin commands are locked. Add adminpwd=<password> to the launch line in Launch options to unlock them.");
		}
		return { warnings };
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "wurmunlimited",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p),
		queryPort: queryOf(p),
		sessionName: p.sessionName || displayName(p.name),
		serverPassword: p.serverPassword ?? "",
		world: worldOf(p),
		// wurm.ini is read from the world folder (Wurmpedia). The panel does not write it, so the Settings tab shows it once it exists.
		configPath: `${p.installDir}\\${worldOf(p)}\\wurm.ini`,
		configPaths: {
			"wurm.ini": `${p.installDir}\\${worldOf(p)}\\wurm.ini`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// The launcher is the program the dossier names. Which process stays running after the Java start is NOT FOUND in the dossier.
		processName: EXE,
		// Kept on the taskbar rather than hidden, so the launcher's Shutdown server can be used before Stop.
		windowMode: "minimized",
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "402370",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The world folders the panel knows about (the two the dossier names). A world with another name is not backed up by this list. The
	// Supercraft page calls the whole server folder "the save"; that is not copied here because the game's own files are most of it.
	backup: {
		paths: [
			{ base: "working", rel: "Creative", label: "Creative world (database, map and settings)" },
			{ base: "working", rel: "Adventure", label: "Adventure world (database, map and settings)" },
		],
	},
	// numplayers.log is the player statistics log, written at regular intervals to the server folder by default (Wurmpedia, PLAYERLOG). The
	// game's own server log is not described in the dossier.
	logs: [{ kind: "file", base: "working", rel: "numplayers.log", label: "Player statistics log (numplayers.log)" }],
	launchOptions: true,
};

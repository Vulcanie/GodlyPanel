// Rising Storm 2: Vietnam (Tripwire Interactive). Dedicated server: Steam app 418480; the game is app 418460. Windows only (community guides).
// Built from the research dossier (docs/research/games/risingstorm2/, confidence low) and checked on a real install (see
// docs/research/games/risingstorm2/06-verification.md). The server needs the Visual C++ 2012 x64 redistributable (MSVCP110.dll).
//
// What it relies on:
//  - the program is VNGame.exe in Binaries\Win64 (community guides; the wiki writes vngame in Binaries\win64). Windows file names are not
//    case-sensitive, so one name covers both. The server runs in its own window, so VNGame.exe is the process the panel watches. The
//    dossier gives no other process to watch.
//  - the start line is the community's form: <map>?MaxPlayers=<n> then -Port= and -QueryPort= switches. The wiki names -Port and
//    -QueryPort as switches. The map name uses the GameMode-MapName form; the wiki's own example is vnsu-SongBe, and VNSU-SongBe is in the
//    wiki's Supremacy list, so it is the default. Checked: the server accepts it and answers A2S with that map.
//  - ports: the community says the game port defaults to 7777, the wiki gives the query port default as 27015. Neither is used: 27015
//    is used by another template, and the panel's rule is to keep ports in 27xxx-29xxx and clear of others. So the game port is 27070
//    and the query port 27072 (game + 2 for the companion rule). Both are the panel's picks. The web admin (8080) is not offered: its
//    switch is in beta and the switch against the URL form is in conflict.
//  - the settings file is ROGame\Config\ROGame.ini (wiki and community). The server name is under [Engine.GameReplicationInfo] and the
//    join password (GamePassword) under [Engine.AccessControl]. The panel writes those two when it creates the server. The community
//    says some config files only appear after the first run; the game is expected to fill in the rest.
//  - the stop is the panel's window close, which the game handles gracefully (the log ends with "Log file closed").
//  - -log makes the game write ROGame\Logs\Launch.log; without it that file is empty.
//
// Not done, and why:
//  - no mods: the wiki's Workshop path (ServerSubscribedWorkshopItems in ROEngine.ini) conflicts with the community's DownloadManagers
//    value, and the GAM DLC needs files copied from a client. Neither is safe to automate from the dossier.
//  - no MaxPlayers form field: a player count is fixed at 32 here (a panel choice; the wiki gives no default).
//  - no RCON and no web admin: the wiki's RCON is NOT FOUND and the web admin is off unless ROWeb.ini is changed by hand.

const EXE = "VNGame.exe";
const RUN_DIR = "Binaries\\Win64";
const CONFIG_REL = "ROGame\\Config\\ROGame.ini";
const CONFIG_FILE = "ROGame.ini";

// The ports are the panel's own picks (see the header). 27015 belongs to another template and is not used.
const DEFAULT_PORT = 27070;
const DEFAULT_QUERY_PORT = 27072;
const DEFAULT_MAP = "VNSU-SongBe";
const DEFAULT_NAME = "Rising Storm 2 Server";
// A panel choice, not a game default (the dossier gives none).
const MAX_PLAYERS = 32;

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A value for a line of the .ini file: a line break would start a new setting, and `;` starts a comment, so both are refused. */
function iniText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f;]/.test(text)) {
		throw new Error(`${what} cannot hold a semicolon or a line break. Use letters, digits, spaces and ordinary punctuation without a semicolon.`);
	}
	return text;
}

/** A map name goes straight onto the command line, so only letters, digits, underscores and hyphens are allowed. */
function mapName(value) {
	const text = String(value ?? "").trim() || DEFAULT_MAP;
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(text)) {
		throw new Error(`"${text.slice(0, 60)}" is not a map name. Use the map's name with no spaces or quotes, such as ${DEFAULT_MAP}.`);
	}
	return text;
}

/** A port as a whole number, or the default when none was given. */
const portOf = (value, fallback) => {
	const n = Math.floor(Number(value));
	return Number.isFinite(n) && n > 0 && n < 65536 ? n : fallback;
};

const template = {
	id: "risingstorm2",
	displayName: "Rising Storm 2: Vietnam",
	type: "risingstorm2",
	// The panel watches VNGame.exe, the program the start script runs (the process the server window shows).
	method: "process",
	updateAppId: "418480",
	storeAppId: "418460",
	sharedInstall: false,
	// SteamCMD puts the install in the folder root; the server program sits in Binaries\Win64 under it.
	installLayoutRoot: "",
	description:
		"Rising Storm 2: Vietnam's dedicated server (VNGame.exe, Windows only). The panel starts it with the map and two ports, and writes the server name and the join password into ROGame\\Config\\ROGame.ini. The protocols of the ports and the Stop behaviour are not confirmed yet, so check the first start by hand.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		serverPassword: { label: "Join Password (leave empty for an open server)", type: "text" },
		mapCode: { label: `Map (such as ${DEFAULT_MAP})`, type: "text" },
	},
	ports: [
		{ key: "port", label: "Game Port", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Steam Query Port", default: DEFAULT_QUERY_PORT },
	],
	resolveParams: async (raw) => {
		const name = iniText(raw.sessionName, "The server name") || iniText(raw.name, "The server name");
		return {
			sessionName: name,
			serverPassword: iniText(raw.serverPassword, "The join password"),
			mapCode: mapName(raw.mapCode),
		};
	},
	buildStartScriptFilename: () => "Start_RS2.bat",
	buildStartScript: (p) => {
		const map = mapName(p.mapCode);
		const port = portOf(p.port, DEFAULT_PORT);
		const queryPort = portOf(p.queryPort, DEFAULT_QUERY_PORT);
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${RUN_DIR}\\${EXE} ${map}?MaxPlayers=${MAX_PLAYERS} -Port=${port} -QueryPort=${queryPort} -log`,
			"",
		].join("\r\n");
	},
	// Writes the server name and, when one was typed, the join password. The game fills in the other keys itself.
	buildConfigFile: (p) => {
		const name = iniText(p.sessionName, "The server name") || iniText(p.name, "The server name") || DEFAULT_NAME;
		const password = iniText(p.serverPassword, "The join password");
		const lines = ["[Engine.GameReplicationInfo]", `ServerName=${name}`, ""];
		if (password) lines.push("[Engine.AccessControl]", `GamePassword=${password}`, "");
		return { relPath: CONFIG_REL, content: lines.join("\r\n") };
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "risingstorm2",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT),
		queryPort: portOf(p.queryPort, DEFAULT_QUERY_PORT),
		sessionName: iniText(p.sessionName, "The server name") || p.name,
		configPath: `${p.installDir}\\${CONFIG_REL}`,
		configPaths: { [CONFIG_FILE]: `${p.installDir}\\${CONFIG_REL}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "418480",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The config folder holds the settings the panel and the game write. The save folder is not evidenced, so it is not listed.
	backup: { paths: [{ base: "working", rel: "ROGame/Config", label: "Server settings (ROGame Config folder)" }] },
	// -log makes the game write Launch.log here.
	logs: [{ kind: "file", base: "working", rel: "ROGame/Logs/Launch.log", label: "Server log" }],
	// The launch line is written by the panel, so there is no launch form.
	launchOptions: false,
};

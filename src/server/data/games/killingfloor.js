// Killing Floor (2009, Unreal Engine 2, Tripwire). Windows dedicated server: Steam app 215350 ("Killing Floor Dedicated Server - Win32");
// the game is app 1250. Built from the research dossier (docs/research/games/killingfloor/, confidence low). NOT run on a real install.
// See docs/research/games/killingfloor/05-implementation-notes.md for what is unverified.
//
// What it relies on:
//  - the server program is ucc.exe in the System folder, started as "ucc server <map>?game=KFmod.KFGameType ..." (the playit.gg
//    Windows guide's minimal start line; FireDaemon's form is the same). The dossier does not confirm that ucc.exe is the process that
//    stays running; it is the most-evidenced name, so the panel watches it.
//  - the game port and the name and password are not on the command line in the dossier. They go in System\KillingFloor.ini, which
//    the game makes on its first run: [URL] Port (example 7707), [Engine.GameReplicationInfo] ServerName, and
//    [Engine.AccessControl] GamePassword. patchInstalledConfig writes them, and creates the file with just those when it is missing.
//  - the game also uses the port beside the game port (7708). The dossier lists 7708 as a game port, so it is kept free as an implied port.
//  - the start line is written by the panel, so the Launch options form is off.
//
// Not done, and why:
//  - no admin name or admin password on the start line: the dossier gives them only as web-admin examples; the panel has no field for them.
//  - no WebAdmin: the dossier says it must be turned on in the ini and gives no panel-safe way to set it, so the panel leaves it off.
//  - no mods: the dossier finds no confirmed dedicated-server mod folder or Workshop list.
//  - no stop command: the dossier says the server does not respond to a graceful shutdown, so the panel force-ends it after 15 s.

const EXE = "ucc.exe";
const RUN_DIR = "System";
const SETTINGS_REL = "System\\KillingFloor.ini";
const LOG_REL = "System/server.log";

const DEFAULT_PORT = 7707;
const DEFAULT_MAP = "KF-BioticsLab.rom";
const DEFAULT_NAME = "Killing Floor Server";
// The dossier's example value (FireDaemon and the example config). Not a game default: no source gives one.
const MAX_PLAYERS = 6;

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A value for a line of an .ini file: a line break would split it, so it is refused rather than altered. */
export function iniText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f]/.test(text)) {
		throw new Error(`${what} has a line break or a control character in it, which Killing Floor's settings file cannot hold. Use one line of plain text.`);
	}
	return text;
}

/** A map name for the URL on the start line: letters, digits, underscores and hyphens, with .rom at the end (added when left off). */
function mapName(value) {
	const raw = String(value ?? "").trim() || DEFAULT_MAP;
	const base = raw.replace(/\.rom$/i, "");
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(base)) {
		throw new Error(`"${raw.slice(0, 60)}" is not a map name. Use the map's file name with no spaces or quotes, such as ${DEFAULT_MAP}.`);
	}
	return `${base}.rom`;
}

/** A port as a whole number from 1024 to 65535, or the default when none was given. */
const portOf = (value) => {
	const n = Math.floor(Number(value));
	return Number.isFinite(n) && n >= 1024 && n <= 65535 ? n : DEFAULT_PORT;
};

/**
 * Sets one key in one [Section] of an .ini text. The section is added at the end, and the key after the section's last line, when they
 * are missing. Every other line stays as it is.
 */
export function setIniValue(text, section, key, value) {
	const lines = text ? text.split(/\r?\n/) : [];
	const header = `[${section}]`;
	const line = `${key}=${value}`;
	const at = lines.findIndex((l) => l.trim() === header);
	if (at < 0) {
		if (lines.length && lines[lines.length - 1] !== "") lines.push("");
		lines.push(header, line, "");
		return lines.join("\r\n");
	}
	let end = at + 1;
	while (end < lines.length && !/^\s*\[/.test(lines[end])) end++;
	for (let i = at + 1; i < end; i++) {
		if (lines[i].split("=")[0].trim() === key) {
			lines[i] = line;
			return lines.join("\r\n");
		}
	}
	lines.splice(end, 0, line);
	return lines.join("\r\n");
}

/** The three settings the panel writes into the game's settings file, given the server's values. */
function settingsFor(content, p) {
	let out = setIniValue(content, "URL", "Port", portOf(p.port));
	out = setIniValue(out, "Engine.GameReplicationInfo", "ServerName", iniText(p.sessionName, "The server name") || iniText(p.name, "The server name") || DEFAULT_NAME);
	out = setIniValue(out, "Engine.AccessControl", "GamePassword", iniText(p.serverPassword, "The password"));
	return out;
}

const template = {
	id: "killingfloor",
	displayName: "Killing Floor",
	type: "killingfloor",
	// The panel watches ucc.exe (see the header). Stop is not verified: the process is ended after 15 s.
	method: "process",
	updateAppId: "215350",
	storeAppId: "1250",
	sharedInstall: false,
	// SteamCMD puts the server in the folder root; ucc.exe and System\ sit under it.
	installLayoutRoot: "",
	description:
		"Killing Floor's dedicated server (the 2009 game, Windows). The panel starts it with the map and the game port, and writes the server name and the password into System\\KillingFloor.ini. The Stop request is not confirmed, so the panel ends the server after 15 seconds.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		mapCode: { label: `Map file (such as ${DEFAULT_MAP})`, type: "text" },
	},
	// The game port from the dossier's example config. The game also uses the port beside it (implicitPorts).
	ports: [{ key: "port", label: "Game Port", default: DEFAULT_PORT }],
	implicitPorts: [{ offset: 1, label: "the game's second port, beside the Game Port (7708 in the dossier)" }],
	resolveParams: async (raw) => {
		const name = iniText(raw.sessionName, "The server name") || iniText(raw.name, "The server name");
		const password = iniText(raw.serverPassword, "The password");
		return { sessionName: name, serverPassword: password, mapCode: mapName(raw.mapCode) };
	},
	buildStartScriptFilename: () => "Start_KF.bat",
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" /D "%~dp0${RUN_DIR}" ${EXE} server ${mapName(p.mapCode)}?game=KFmod.KFGameType?VACSecured=true?MaxPlayers=${MAX_PLAYERS} -log=server.log`,
			"",
		].join("\r\n"),
	// Writes the name, the password and the port into the game's settings file. The game makes that file on its first run; when it is
	// already there, only these three values change.
	patchInstalledConfig: {
		relPath: SETTINGS_REL,
		apply: (content, p) => settingsFor(content, p),
		create: (p) => settingsFor("", p),
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "killingfloor",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port),
		sessionName: iniText(p.sessionName, "") || iniText(p.name, "") || DEFAULT_NAME,
		serverPassword: p.serverPassword,
		configPath: `${p.installDir}\\${SETTINGS_REL}`,
		configPaths: { "KillingFloor.ini": `${p.installDir}\\${SETTINGS_REL}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "215350",
		autoUpdate: false,
	}),
};

export default {
	template,
	backup: { paths: [{ base: "working", rel: "System/KillingFloor.ini", label: "Server settings (KillingFloor.ini)" }] },
	logs: [{ kind: "file", base: "working", rel: LOG_REL, label: "Server log" }],
	// The start line is written by the panel, so there is no launch form.
	launchOptions: false,
};

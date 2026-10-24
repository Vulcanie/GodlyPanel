// Red Orchestra: Ostfront 41-45 (Unreal Engine 2, Tripwire). Windows dedicated server: Steam app 223240 ("Red Orchestra Windows Dedicated
// Server"); the Linux server is app 223250 and the game is app 1200. Built from the research dossier (docs/research/games/redorchestra/,
// confidence low). NOT run on a real install. See docs/research/games/redorchestra/05-implementation-notes.md for what is unverified.
//
// What it relies on:
//  - the server program is system\ucc.exe under the install folder, started as "ucc.exe server <map>?game=ROEngine.ROTeamGame -log=...".
//    That line is from one 2014 forum post, not from a page about Ostfront 41-45 (the post's spacing was forum formatting and was
//    corrected; its trailing "?" and its MinPlayers/deathmessagemode options are left out). The dossier does not name the server binary,
//    so ucc.exe is the most-evidenced name and the panel watches it.
//  - the game port is not on the command line in the dossier. It is [URL] Port=7757 in the game's own ini, which the hosting guides
//    say is system\RedOrchestra.ini (the community default.ini has the same section). patchInstalledConfig sets the port, the server name
//    and the join password there, and creates the file with those when it is missing.
//  - the query port 7767 is a forum claim only, so it is not used. The LAN ports (11757, 10757) are for LAN play and are not set.
//  - method "process": no graceful stop or RCON was found, so the panel ends the server after 15 s.
//
// Not done, and why:
//  - the map list (Maps= lines in [ROInterface.ROMapList]): a repeated key, which the settings form cannot edit. Left as the file has it.
//  - no admin password field: the file's AdminPassword is a placeholder and the dossier gives no safe way to set it from the panel.
//  - no Web Admin (bEnabled stays False in the file), and no mods: the dossier finds no Workshop or loader, only custom map files.

const EXE = "ucc.exe";
const PROGRAM_REL = "system\\ucc.exe";
const SETTINGS_REL = "system\\RedOrchestra.ini";
const LOG_FILE = "ServerLog.log";

const DEFAULT_PORT = 7757;
const DEFAULT_MAP = "RO-Konigsplatz.rom";
const DEFAULT_NAME = "Red Orchestra Server";

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
		throw new Error(`${what} has a line break or a control character in it, which Red Orchestra's settings file cannot hold. Use one line of plain text.`);
	}
	return text;
}

/** A map name for the start line: letters, digits, underscores and hyphens, with .rom at the end (added when left off). */
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
	id: "redorchestra",
	displayName: "Red Orchestra: Ostfront 41-45",
	type: "redorchestra",
	// The panel watches ucc.exe (see the header). Stop is not verified: the process is ended after 15 s.
	method: "process",
	updateAppId: "223240",
	storeAppId: "1200",
	sharedInstall: false,
	// SteamCMD puts the server in the folder root; system\ucc.exe sits under it.
	installLayoutRoot: "",
	description:
		"Red Orchestra: Ostfront 41-45's dedicated server (Windows). The panel starts it with the first map and the game port, and writes the server name and the password into system\\RedOrchestra.ini. The port and the Stop behaviour are not confirmed, so check the first start by hand.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		mapCode: { label: `Map file (such as ${DEFAULT_MAP})`, type: "text" },
	},
	// The game port from the dossier's default.ini ([URL] Port). The query port is a forum claim and is not used.
	ports: [{ key: "port", label: "Game Port", default: DEFAULT_PORT }],
	resolveParams: async (raw) => {
		const name = iniText(raw.sessionName, "The server name") || iniText(raw.name, "The server name");
		const password = iniText(raw.serverPassword, "The password");
		return { sessionName: name, serverPassword: password, mapCode: mapName(raw.mapCode) };
	},
	buildStartScriptFilename: () => "Start_RO.bat",
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${PROGRAM_REL} server ${mapName(p.mapCode)}?game=ROEngine.ROTeamGame -log=${LOG_FILE}`,
			"",
		].join("\r\n"),
	// Writes the port, the name and the password into the game's settings file. The file's map list is left as it is.
	patchInstalledConfig: {
		relPath: SETTINGS_REL,
		apply: (content, p) => settingsFor(content, p),
		create: (p) => settingsFor("", p),
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "redorchestra",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port),
		sessionName: iniText(p.sessionName, "") || iniText(p.name, "") || DEFAULT_NAME,
		serverPassword: p.serverPassword,
		configPath: `${p.installDir}\\${SETTINGS_REL}`,
		configPaths: { "RedOrchestra.ini": `${p.installDir}\\${SETTINGS_REL}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "223240",
		autoUpdate: false,
	}),
};

export default {
	template,
	backup: { paths: [{ base: "working", rel: "system/RedOrchestra.ini", label: "Server settings (RedOrchestra.ini, with the map list)" }] },
	logs: [{ kind: "file", base: "working", rel: `system/${LOG_FILE}`, label: "Server log" }],
	// The start line is written by the panel, so there is no launch form.
	launchOptions: false,
};

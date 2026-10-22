// Avorion (Boxelware). Dedicated server tool: Steam app 565060 ("Avorion Dedicated Server", anonymous login), game: app 445220.
//
// Facts from the research dossier (research/avorion/00..04), whose sources are the Avorion wiki (avorion.fandom.com/wiki/Server), Nodecraft's
// and Supercraft's and XGamingServer's guides and the Pterodactyl egg. NO official (Boxelware) server document was found and nothing was run
// on a real install. In short:
//  - the program is `bin\AvorionServer.exe` in the install folder (the egg starts `./bin/AvorionServer` on Linux, the wiki says
//    AvorionServer.exe; the folder it sits in on Windows is the one unverified guess here);
//  - everything the panel needs is on the launch line: `--galaxy-name`, `--datapath galaxy` (the egg's value, so a galaxy is the folder
//    galaxy\<name> inside the install), the ports, `--max-players`, `--server-name` and, when given, `--admin <Steam64 id>`. The other
//    arguments are optional and are offered in Launch options;
//  - ports: game 27000 (UDP and TCP), and three more the egg passes as `--query-port`, `--steam-query-port` and `--steam-master-port`. No
//    source describes them; the egg's own values (27003, 27020, 27021) are spread out, so the panel derives all three from the game port
//    instead (game+2 Steam query, game+3 Steam master, game+4 query) to let several servers share a PC without clashing;
//  - server.ini is made by the server on its first run, inside the galaxy folder, and OVERWRITTEN BY THE SERVER AT STARTUP, and a single
//    mistake in it makes the server rebuild it with defaults and a NEW SEED. The panel therefore writes no server.ini. The Settings tab
//    edits the file the server made (stop the server first);
//  - mods: the developers' recommended way is Steam Workshop ids in `modconfig.lua` in the galaxy folder, which the server downloads at
//    its next start. The panel writes that file (only when Workshop ids are given in the form, and only the ids);
//  - NO GRACEFUL STOP FROM THE PANEL. The server is stopped with the console commands `/save` and then `/stop`; the dossier says "rather
//    than killing the process". The panel has no way to type into a console, so Stop asks the process to close and force-kills it after
//    its 15 s grace time. The window is kept minimized, not hidden, so the commands can be typed first;
//  - the server log is %appdata%\Avorion\serverlog.txt, outside the install, which the panel cannot read, so there are no log entries.
// Not verified on a real install (see research/avorion/05-implementation-notes.md).

const PROGRAM = "bin\\AvorionServer.exe";
const EXE = "AvorionServer.exe";

/** Player limit: the wiki gives a default of 10 and no limit. 1 to 1000 is only a sanity range for the form. */
const SLOTS_MIN = 1;
const SLOTS_MAX = 1000;
const SLOTS_DEFAULT = 10;
const MAX_MODS = 50;

// Characters cmd acts on inside a .bat even between quotes (%, and ! when delayed expansion is on), the quote that would end the value, a
// backslash (read as escaping the quote after it) and control characters. A character outside plain ASCII is not allowed either: the
// server only supports ASCII (the wiki says so for paths and the log).
const UNSAFE = /[\u0000-\u001f"%&|<>^!\\]|[^\u0000-\u007f]/;
const UNSAFE_GLOBAL = new RegExp(UNSAFE.source, "g");

/**
 * The galaxy's name as it goes on the launch line and becomes a folder name: letters, digits, `_` and `-`, 40 characters at most. Spaces
 * become `_`, everything else is dropped. (The dossier does not say which characters the game accepts; this stays inside what every file
 * system and cmd accept and the server's ASCII-only rule.)
 */
export function galaxyName(value, fallback = "Avorion") {
	const cleaned = String(value ?? "")
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[^A-Za-z0-9_-]/g, "")
		.slice(0, 40);
	return cleaned || fallback;
}

/** The name shown in the server list: ASCII, no character cmd acts on, one space between words, 60 characters at most. */
export function serverNameText(value, fallback = "Avorion Server") {
	const cleaned = String(value ?? "")
		.replace(UNSAFE_GLOBAL, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 60)
		.trim();
	return cleaned || fallback;
}

/** A text safe to put between the quotes of a .bat `start` title. */
const windowTitle = (value) =>
	String(value ?? "")
		.replace(UNSAFE_GLOBAL, "")
		.replace(/\s+/g, " ")
		.trim() || "Avorion Server";

/** The player limit: a whole number from 1 to 1000, 10 when none is given. */
const playerLimit = (value) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= SLOTS_MIN ? Math.min(n, SLOTS_MAX) : SLOTS_DEFAULT;
};

/** A Steam64 id as `--admin` takes it: 17 digits, or nothing. Throws for anything else, rather than quietly changing it. */
export function adminSteamId(value) {
	const text = String(value ?? "").trim();
	if (!text) return "";
	if (!/^\d{17}$/.test(text)) {
		throw new Error("The admin Steam ID must be the 17-digit Steam64 id (for example 76561198000000000), or empty for none. It is not the player's name or the profile link.");
	}
	return text;
}

/**
 * The Steam Workshop item ids in what a person typed: numbers, or the items' links (`...?id=1691539727`), separated by commas, spaces or
 * line breaks. Empty means none. Throws for something that is neither.
 */
export function parseModIds(raw) {
	const text = String(raw ?? "").trim();
	if (!text) return [];
	const ids = [];
	for (const part of text.split(/[\s,;]+/).filter(Boolean)) {
		const fromLink = /[?&]id=(\d+)/i.exec(part);
		const id = fromLink ? fromLink[1] : /^\d+$/.test(part) ? part : null;
		if (!id || id.length < 5 || id.length > 12) {
			throw new Error(`"${part.slice(0, 60)}" is not a Steam Workshop item id. Use the number after ?id= in the mod's page address, one per mod, separated by commas.`);
		}
		if (!ids.includes(id)) ids.push(id);
	}
	if (ids.length > MAX_MODS) throw new Error(`That is ${ids.length} Workshop mods; the most this form takes is ${MAX_MODS}. Add the rest later by hand in modconfig.lua.`);
	return ids;
}

const idsOrNone = (raw) => {
	try {
		return parseModIds(raw);
	} catch {
		return [];
	}
};

const galaxyOf = (p) => galaxyName(p.galaxyName || p.name);
const galaxyRel = (p) => `galaxy\\${galaxyOf(p)}`;

/** The three ports derived from the game port; an own query port wins over the derived one. */
const portsOf = (p) => {
	const port = Number(p.port);
	return {
		port,
		query: Number.isInteger(Number(p.queryPort)) && Number(p.queryPort) > 0 ? Number(p.queryPort) : port + 4,
		steamQuery: port + 2,
		steamMaster: port + 3,
	};
};

/** modconfig.lua: the developers' template (from Nodecraft's page) with the Workshop ids filled in. Only Workshop mods; no manual `path` mods. */
function modConfig(ids) {
	return [
		'modLocation = ""',
		"forceEnabling = false",
		"mods =",
		"{",
		...ids.map((id, i) => `\t{workshopid = "${id}"}${i < ids.length - 1 ? "," : ""}`),
		"}",
		"allowed =",
		"{",
		"}",
		"",
	].join("\r\n");
}

const template = {
	id: "avorion",
	displayName: "Avorion",
	type: "avorion",
	// The dossier verifies no query or RCON protocol the panel speaks (RCON is off unless a password is set in server.ini, and its protocol
	// is not described), so the panel watches the process.
	method: "process",
	updateAppId: "565060",
	storeAppId: "445220",
	sharedInstall: false,
	installLayoutRoot: "",
	// The install size is NOT FOUND in any source; this is only a guess for the free-space check.
	estimatedInstallBytes: 1_500_000_000,
	description:
		"Avorion's dedicated server. THE PANEL CANNOT SAVE AND STOP IT CLEANLY: the server is stopped by typing /save and then /stop into its own console window, and the dossier warns against killing it. The panel has no way to type into a console, so Stop closes the window and then ends the process after 15 seconds, and the galaxy keeps only what the server saved before. Before pressing Stop, open the server's window (it is kept minimized on the taskbar), type /save, then /stop, and wait for it to close. Mods are Steam Workshop ids, written into modconfig.lua.",
	fields: ["galaxyName", "adminSteamId", "mods"],
	fieldMeta: {
		galaxyName: { label: "Galaxy name (the save folder under galaxy; made on the first start. Letters, digits, _ and - only, 40 characters at most, no spaces)", type: "text" },
		adminSteamId: { label: "Admin Steam ID (optional: the 17-digit Steam64 id of the player who becomes server admin. Without it nobody is admin.)", type: "text" },
		mods: { label: "Steam Workshop mod ids or links, comma-separated (optional). They are written to modconfig.lua and the server downloads them at its next start. Every player gets offered the same mods.", type: "text" },
	},
	// Game port UDP and TCP; the other three are derived from it (see the top of the file). 27000 is the game's own default and no other
	// template uses it or the four ports after it. The panel's firewall check opens UDP only: the game's TCP port needs opening by hand.
	ports: [
		{ key: "port", label: "Game Port (UDP and TCP; the next four ports up are used too)", default: 27000 },
		{ key: "queryPort", label: "Query Port (UDP)", default: 27004 },
	],
	// game+2 is --steam-query-port, game+3 is --steam-master-port. game+1 stays the panel's automatic precaution.
	implicitPorts: [
		{ offset: 2, label: "its Steam query port" },
		{ offset: 3, label: "its Steam master port" },
	],
	// Rejects a bad Steam id or mod list before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => ({
		galaxyName: galaxyName(raw.galaxyName, galaxyName(raw.name)),
		adminSteamId: adminSteamId(raw.adminSteamId),
		mods: parseModIds(raw.mods).join(","),
	}),
	buildStartScriptFilename: () => "Start_Avorion.bat",
	// bin\AvorionServer.exe started from the install folder. The title ends in "-Avorion" so the line has a "-x" word before the program:
	// the panel's Launch options reader only recognises a line with one, and every Avorion argument starts with "--".
	// --admin is left off when no id was given; the optional arguments (difficulty, save interval, ...) are not on the line, so the Launch
	// options form may add any at the end.
	buildStartScript: (p) => {
		const { port, query, steamQuery, steamMaster } = portsOf(p);
		const admin = String(p.adminSteamId ?? "").replace(/\D/g, "");
		return [
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${windowTitle(p.name)} -Avorion" "${PROGRAM}" --galaxy-name "${galaxyOf(p)}" --datapath galaxy --port ${port} --query-port ${query} --steam-master-port ${steamMaster} --steam-query-port ${steamQuery} --max-players ${playerLimit(p.maxPlayers)} --server-name "${serverNameText(p.sessionName || p.name)}"${admin.length === 17 ? ` --admin ${admin}` : ""}`,
			"",
		].join("\r\n");
	},
	// modconfig.lua, only when Workshop ids were given. server.ini is made by the server on its first run and is never written here.
	buildExtraFiles: (p) => {
		const ids = idsOrNone(p.mods);
		return ids.length ? [{ relPath: `${galaxyRel(p)}\\modconfig.lua`, content: modConfig(ids) }] : [];
	},
	postWrite: async (p) => {
		const warnings = [
			"Avorion's server cannot be stopped cleanly from the panel. It is stopped by typing /save and then /stop into its own console window, and the panel cannot type into a console. Stop closes the window and then ends the process after 15 seconds, so the galaxy keeps only what the server saved before. Open the server's window (it is kept minimized on the taskbar), type /save, then /stop, wait for the window to close, and only then press Stop or update.",
			"server.ini is made by the server the first time it runs, inside the galaxy folder, and the server overwrites it at every start. Stop the server before editing it, and make a backup first: a single mistake makes the server rebuild the file with default settings and a NEW SEED. The join password is Password under [Administration] in that file, so set it after the first start.",
			"Forward the game port on your router for both UDP and TCP. The panel's firewall check opens only UDP, so also allow the game port's TCP in Windows Firewall. A direct-IP join works only on port 27000; another port needs Steam networking.",
		];
		if (!String(p?.adminSteamId ?? "").trim()) warnings.push("No admin was set, so nobody has admin rights yet. Put a player's 17-digit Steam64 id after --admin in Launch options.");
		if (idsOrNone(p?.mods).length) warnings.push("The Workshop mods in modconfig.lua are downloaded by the server when it next starts. Disabling a mod later can corrupt the save, so back up the galaxy first.");
		return { warnings };
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "avorion",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: portsOf(p).query,
		galaxyName: galaxyOf(p),
		adminSteamId: p.adminSteamId ?? "",
		mods: p.mods ?? "",
		// The server makes server.ini on its first run; the Settings tab shows it once it exists.
		configPath: `${p.installDir}\\${galaxyRel(p)}\\server.ini`,
		configPaths: {
			"server.ini": `${p.installDir}\\${galaxyRel(p)}\\server.ini`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		// Kept on the taskbar rather than hidden, so the console can be reached to type /save and /stop (the panel cannot send them).
		windowMode: "minimized",
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "565060",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The galaxy folder holds the save, server.ini and modconfig.lua (with --datapath galaxy, inside the install folder).
	backup: {
		paths: [{ base: "working", rel: "galaxy", label: "Galaxy (saves, settings, mods)" }],
	},
	// The server's own log is %appdata%\Avorion\serverlog.txt, outside the install, which the panel cannot read.
	logs: [],
	launchOptions: true,
};

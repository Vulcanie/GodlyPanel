// Blade Symphony (Berimbau / Blade Symphony team). Dedicated server: Steam app 228780 (SteamCMD; anonymous login expected by the
// preflight, but the Valve list says "Anonymous Login No" for it, so this is the first thing to check). The game itself is app 225600.
//
// Facts from the research dossier (docs/research/games/bladesymphony/01..04). The main source is the game's official server guide
// (blade-symphony.com/server-guide), dated 2013; the rest are community guides and the Valve Source pages, which are generic. Nothing was
// run on a real install. In short:
//  - the program is srcds.exe, a Source-engine server, started from the install folder with the official Windows line
//      -console +maxplayers 16 +map duel_winter
//    The panel adds -port <n> so the chosen port is used: the official line has no port, and the generic Source page says the game port
//    (27015 by default) changes with -port. That flag is NOT confirmed for this game (see the notes);
//  - one game port (UDP), chosen by the panel from free ports (27034). Other ports the generic Source pages list (27005, 27020, 26900)
//    are not Blade-specific, so none is managed here;
//  - the settings are cvar lines in berimbau\cfg\server.cfg. The official page names hostname, rcon_password, sv_password,
//    mp_timelimit and mapcyclefile. The panel writes the name and the password; the rest is on the Settings tab;
//  - the Steam login token (GSLT) is left out: the sources disagree on whether it is needed (LinuxGSM "required", a hosting guide "optional"),
//    and the dossier's app id for it is also in conflict (225600 or 228780);
//  - no in-game quit command is documented: the panel's Stop asks the window to close and force-ends after 15 seconds;
//  - mods: none managed. Custom maps (.bsp files) go in berimbau\maps by hand (the backup keeps that folder).

const EXE = "srcds.exe";
const CFG_REL = "berimbau\\cfg\\server.cfg";

// Free default port, chosen by the panel (27015 is the Source default and is held by other templates here).
const DEFAULT_PORT = 27034;
// The official guide's start map, and the player count it uses. Ranges and defaults for both are not on any official page.
const DEFAULT_MAP = "duel_winter";
const PLAYERS = 16;

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/**
 * A value for a line of server.cfg. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does with the
 * line (a line can hold several commands separated by `;`, and `//` starts a comment), so such a value is refused, not altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Blade Symphony's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map name as it appears on the launch line: letters, digits, `_`, `-` (for example duel_winter). */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_-]{0,63}$/;

const portNumber = (value, fallback) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= 1024 && n <= 65535 ? n : fallback;
};

/** The launch line's arguments after the program, in the official guide's order, with the port added. */
function launchArguments(p) {
	return [
		"-console",
		`-port ${portNumber(p.port, DEFAULT_PORT)}`,
		`+maxplayers ${PLAYERS}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
	];
}

const template = {
	id: "bladesymphony",
	displayName: "Blade Symphony",
	type: "bladesymphony",
	// No console command or RCON use is documented for a clean stop: the panel watches the process and asks its window to close.
	method: "process",
	updateAppId: "228780",
	storeAppId: "225600",
	sharedInstall: false,
	// SteamCMD puts the server in the install folder, and the official guide's berimbau folder sits beside srcds.exe.
	installLayoutRoot: "",
	description:
		"Blade Symphony's dedicated server (srcds.exe, a Source-engine server, Steam app 228780). It is installed with SteamCMD. Its settings are in berimbau\\cfg\\server.cfg. The official guide dates from 2013, so some details may have changed; the login token is not used, which means the server may not appear in Steam's public list.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// The map the official guide starts with. Other maps are set with the Start map argument in the Settings tab's Launch options.
	mapChoices: [{ code: "duel_winter", label: "Winter duel (duel_winter)" }],
	ports: [{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT }],
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as duel_winter.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_BladeSymphony.bat",
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, "Blade Symphony Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// The name and the password. hostname is written with a quoted value, as the Source cvar lines are. The rest is on the Settings tab.
	buildConfigFile: (p) => {
		const lines = [`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Blade Symphony Server"}"`];
		const password = cfgText(p.serverPassword, "The password");
		if (password) lines.push(`sv_password "${password}"`);
		lines.push("");
		return { relPath: CFG_REL, content: lines.join("\r\n") };
	},
	buildServerEntry: (p) => {
		const serverCfg = `${p.installDir}\\${CFG_REL}`;
		return {
			name: p.name,
			type: "bladesymphony",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The Windows program name from the official guide. Srcds.exe is shared by many Source games, so the panel finds this server's
			// process by where it runs from.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "228780",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: its settings folder (server.cfg and any files beside it) and the custom maps the
	// owner has added to berimbau\maps by hand.
	backup: {
		paths: [
			{ base: "working", rel: "berimbau/cfg", label: "Server settings" },
			{ base: "working", rel: "berimbau/maps", label: "Custom maps added by hand" },
		],
	},
	// The dossier names no log folder for this game, so none is listed.
	logs: [],
	launchOptions: true,
};

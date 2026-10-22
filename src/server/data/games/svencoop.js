// Sven Co-op (Sven Co-op Team). Dedicated server: Steam app 276060 (anonymous login), game: app 225840.
//
// Facts from the research dossier (research/svencoop/01..04), whose sources are the game's own manual (svencoop.com/manual: server-basic,
// server-advanced, server-config) and the Sven Co-op wiki (Running a server: Installation, Configuration; Starting a server). Nothing was
// run on a real install. In short:
//  - the program is SvenDS.exe in the install folder, started with
//      -console -port <n> +maxplayers <n> +servercfgfile server.cfg +map <map> +log on
//    `-console` is required (without it the server opens a window), `+map` is required (without it the server "will remain stuck in an
//    un-connectible state"), `+servercfgfile server.cfg` is what the wiki says has to be declared for the config file to be used. Every one
//    of those can be appended to in any order, so this game keeps the "Launch options" form (nothing has to be last);
//  - one game port, UDP for players. The manual also lists TCP on the same number for the remote console, and UDP 26900 (`-sport`) for
//    Valve Anti-Cheat, which "auto-increments from default if taken to the next available port", so the panel does not manage it;
//  - the server's name and password are settings in server.cfg, the game's only config file the dossier describes. The game is documented
//    to ship server_example.cfg, not server.cfg, so the panel writes server.cfg itself (and a SteamCMD `validate` has no shipped server.cfg
//    to put back). The wiki asks for `hostname` to be the first line, which is why the file starts with it and has no comment above it.
//    Everything else is in the same file, which the user edits (the Settings tab);
//  - the remote console exists (TCP, `rcon_password`), but this module does not use it (method "process", no rconPort): the dossier names
//    no command to stop the server from the console, and the only documented way to stop it is closing the window. See notes;
//  - mods: none managed. Custom maps go in the `svencoop_addons` folder by hand (the backup keeps it).
// Not verified on a real install (see research/svencoop/05-implementation-notes.md): the program's name (SvenDS.exe on two pages, svends.exe
// on a third), that it sits in the install folder's root with `svencoop\` beside it, that the game reads svencoop\server.cfg and that
// `hostname "name"` is its syntax, that closing the window (the panel's Stop) shuts it down cleanly, and where its logs go.

const EXE = "SvenDS.exe";
const GAME_DIR = "svencoop";
const SERVER_CFG_REL = `${GAME_DIR}\\server.cfg`;

const DEFAULT_MAP = "stadium4";
// The manual: "+maxplayers: 2 to 32. It will be 12 if you do not specify this."
const DEFAULT_PLAYERS = 12;

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

const wholeNumber = (value, fallback, min, max) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

/** Player slots: the manual says 2 to 32, and 12 when it is left out. */
const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 2, 32);

/**
 * A value for a line of server.cfg. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line, so such a value is refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Sven Co-op's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map name as it appears in a file name: letters, digits, `_`, `-`, `.` (maps such as stadium4 or _server_start). */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;

/** The launch line's arguments after the program, in the order the manual's own example uses, plus the config file the wiki says to name. */
function launchArguments(p) {
	return [
		"-console",
		`-port ${Number(p.port)}`,
		`+maxplayers ${playerLimit(p.maxPlayers)}`,
		"+servercfgfile server.cfg",
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		"+log on",
	];
}

const template = {
	id: "svencoop",
	displayName: "Sven Co-op",
	type: "svencoop",
	// The remote console exists but is not used: see the header. The panel watches the process, which gives no player count.
	method: "process",
	updateAppId: "276060",
	storeAppId: "225840",
	sharedInstall: false,
	// SteamCMD puts the server straight in the server's folder: SvenDS.exe and svencoop\ are in its root (the wiki installs to C:\SvenDS).
	installLayoutRoot: "",
	description:
		"Sven Co-op's dedicated server (SvenDS), a Half-Life cooperative game. It installs anonymously, with no Steam account and without owning the game. The server's only documented way to stop is closing its window, which is what the panel's Stop does, so stop every server before you update it. Custom maps are added by hand to the svencoop_addons folder.",
	fields: ["sessionName", "serverPassword", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser; about 40 characters is the most the wiki suggests)", type: "text" },
	},
	// The one map the manual and the wiki name. Any other map is set with the Start map argument in the Settings tab's Launch options.
	mapChoices: [{ code: "stadium4", label: "stadium4" }],
	// UDP for players. 27015 (the engine's default) is Core Keeper's here and the numbers around it belong to other games, so this starts
	// at 27355 (27356 is kept free beside it). The anti-cheat port (26900) looks for a free one by itself.
	ports: [{ key: "port", label: "Game Port (UDP; the next port up is kept free too)", default: 27355 }],
	// Rejects a bad name, password or map before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as stadium4.`);
		return { sessionName: name, serverPassword: password, mapCode: map };
	},
	buildStartScriptFilename: () => "Start_SvenCoop.bat",
	// The program is in the install folder and is run from it (the manual: "You must change the working directory to the game server root
	// first"). New arguments are appended at the end by the Launch options form; nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Sven Co-op Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// The name and the password, in server.cfg. `hostname` is the first line on purpose (the wiki asks for it, so the server does not show
	// up under the default name), so there is no comment above it: the research did not find which comment marker the file takes.
	buildConfigFile: (p) => {
		const lines = [`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Sven Co-op Server"}"`];
		const password = cfgText(p.serverPassword, "The password");
		if (password) lines.push(`sv_password "${password}"`);
		lines.push("");
		return { relPath: SERVER_CFG_REL, content: lines.join("\r\n") };
	},
	postWrite: async () => ({
		warnings: [
			"Sven Co-op's server has no documented way to be stopped from its console. The panel's Stop closes the server's window and, after 15 seconds, ends the program. Whether a console-mode server shuts down cleanly when its window is closed was not tested.",
		],
	}),
	buildServerEntry: (p) => {
		const serverCfg = `${p.installDir}\\${SERVER_CFG_REL}`;
		return {
			name: p.name,
			type: "svencoop",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running (per the manual and the wiki; to be confirmed on a real install, one page spells it svends.exe;
			// Windows does not tell the two spellings apart). The panel finds this server's process by where it runs from, so a second
			// SvenDS.exe elsewhere on the PC is not mistaken for it.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "276060",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: its settings and the lists next to them (admins, bans, map cycle and vote lists, the
	// welcome message, the skill file, the plugin list), the per-server profiles folder, and the custom maps and content added by hand. The
	// game's own maps and files come from the game itself, so they are left out. The dossier names no save folder, so there is none to keep.
	backup: {
		paths: [
			{ base: "working", rel: "svencoop/server.cfg", label: "Server settings" },
			{ base: "working", rel: "svencoop/admins.txt", label: "Admin list" },
			{ base: "working", rel: "svencoop/banned.cfg", label: "Banned Steam IDs" },
			{ base: "working", rel: "svencoop/listip.cfg", label: "Banned IP addresses" },
			{ base: "working", rel: "svencoop/mapcycle.txt", label: "Map cycle" },
			{ base: "working", rel: "svencoop/mapvote.cfg", label: "Map vote list" },
			{ base: "working", rel: "svencoop/motd.txt", label: "Welcome message" },
			{ base: "working", rel: "svencoop/skill.cfg", label: "Skill settings" },
			{ base: "working", rel: "svencoop/default_plugins.txt", label: "Plugin list" },
			{ base: "working", rel: "svencoop/servers", label: "Server profiles" },
			{ base: "working", rel: "svencoop_addons", label: "Custom maps and content added by hand" },
		],
	},
	// `+log on` is on the launch line, and the manual says `logsdir` defaults to `logs`. Which folder that is relative to is not documented;
	// the game folder is the manual's own wording for where configurations live.
	logs: [{ kind: "dir", base: "working", rel: "svencoop/logs", label: "Server log" }],
	launchOptions: true,
};

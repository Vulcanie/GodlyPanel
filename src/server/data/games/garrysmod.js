// Garry's Mod (Facepunch). Dedicated server: Steam app 4020 (anonymous login), game: app 4000.
//
// Facts from the research dossier (research/garrysmod/01..04), whose sources are the Facepunch wiki (Downloading a Dedicated Server,
// Workshop for Dedicated Servers, Command Line Parameters, Steam Game Server Accounts, ConVars in Garrysmod), Valve's developer wiki
// (Source Dedicated Server, Command line options, Source RCON Protocol), the game's own shipped files in Facepunch's GitHub repo and
// LinuxGSM's default command line. Nothing was run on a real install. In short:
//  - the program is srcds.exe in the install folder, started with
//      -console -game garrysmod -port <n> -strictportbind +maxplayers <n> +gamemode <mode> +map <map> -condebug
//    plus, when given, +sv_setsteamaccount <GSLT> and +host_workshop_collection <id>. Every one of those can be appended to in any
//    order, so this game keeps the "Launch options" form (nothing has to be last);
//  - one game port, UDP for players and the server list. Source's remote console (RCON) uses TCP on the same port number;
//  - the server's name and password are convars. They are written to garrysmod\cfg\autoexec.cfg, NOT server.cfg: server.cfg ships with
//    the game (empty), and the panel updates with `app_update ... validate`, which puts a shipped file back as it was, so whatever the
//    panel had put in server.cfg would be gone after the first update. autoexec.cfg is not shipped and the shipped valve.rc runs it
//    at start-up. Everything else is in server.cfg, which the user edits (the Settings tab);
//  - the Source RCON exists, but this module does not use it (method "process", no rconPort): the panel's Stop sends "DoExit" to an
//    RCON game it has no command for, which Source ignores, and then reports success while the server keeps running. See notes.
//  - mods: one Steam Workshop collection id (`+host_workshop_collection <id>`), the dossier's recommendation.
// Not verified on a real install (see research/garrysmod/05-implementation-notes.md): that srcds.exe is the program that stays
// running, that closing its window shuts it down and runs the ShutDown hooks that save, that autoexec.cfg's hostname and sv_password
// survive until the server is listed, and the upper limit of +maxplayers.

const EXE = "srcds.exe";
const GAME_DIR = "garrysmod";
const AUTOEXEC_REL = `${GAME_DIR}\\cfg\\autoexec.cfg`;
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;

const DEFAULT_MAP = "gm_construct";
const DEFAULT_GAMEMODE = "sandbox";
const DEFAULT_PLAYERS = 16;

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

/** Player slots: the dossier only knows "limited by the game/mod" (commonly 128), so 128 is the ceiling used here. */
const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, 128);

/**
 * A value for a line of a Source .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line, so such a value is refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Garry's Mod's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map or gamemode name as it appears in a file name: letters, digits, `_`, `-`, `.` (maps such as zs_cleanoffice_v2). */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;

/** The Game Server Login Token, as pasted: one piece of text. Empty means none. */
export function cleanLoginToken(raw) {
	const token = String(raw ?? "").trim();
	if (!token) return "";
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(token)) {
		throw new Error("The Steam login token has spaces or odd characters in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers (create it for app 4000).");
	}
	return token;
}

/**
 * The Steam Workshop collection id in what a person typed: the number, or the collection's link (`...?id=157384458`). Empty means none.
 * Only one collection: the game takes one `+host_workshop_collection`.
 */
export function parseCollectionId(raw) {
	const text = String(raw ?? "").trim();
	if (!text) return "";
	const fromLink = /[?&]id=(\d+)/i.exec(text);
	const id = fromLink ? fromLink[1] : /^\d+$/.test(text) ? text : null;
	if (!id || id.length < 5 || id.length > 12) {
		throw new Error(`"${text.slice(0, 60)}" is not a Steam Workshop collection id. Use the number after ?id= in the collection's page address. One collection only; put all the addons you want in it, and make the collection Public or Unlisted.`);
	}
	return id;
}

/** The launch line's arguments after the program, in the order the Facepunch examples and LinuxGSM use. */
function launchArguments(p) {
	const args = [
		"-console",
		`-game ${GAME_DIR}`,
		`-port ${Number(p.port)}`,
		"-strictportbind",
		`+maxplayers ${playerLimit(p.maxPlayers)}`,
		`+gamemode ${NAME_WORD.test(String(p.gamemode ?? "")) ? p.gamemode : DEFAULT_GAMEMODE}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		"-condebug",
	];
	// Only a value that is plainly a token / a number reaches the script.
	const token = String(p.gslt ?? "").trim();
	if (/^[A-Za-z0-9_-]{1,64}$/.test(token)) args.push(`+sv_setsteamaccount ${token}`);
	const collection = String(p.mods ?? "").trim();
	if (/^\d{5,12}$/.test(collection)) args.push(`+host_workshop_collection ${collection}`);
	return args;
}

const template = {
	id: "garrysmod",
	displayName: "Garry's Mod",
	type: "garrysmod",
	// Source's RCON exists but is not used: see the header. The panel watches the process, which gives no player count.
	method: "process",
	updateAppId: "4020",
	storeAppId: "4000",
	sharedInstall: false,
	// SteamCMD puts the game straight in the server's folder: srcds.exe and garrysmod\ are in its root.
	installLayoutRoot: "",
	description:
		"Garry's Mod's dedicated server (srcds). Facepunch asks every server to have a Game Server Login Token (free, from steamcommunity.com/dev/managegameservers, app 4000); without one the server ranks very low in the server list, and an invalid one stops it from starting. Players only download an addon's content from your server if the addon is marked for download in a Lua file; a Workshop collection on its own only mounts the addons on the server.",
	fields: ["sessionName", "serverPassword", "mapCode", "gslt", "mods"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		gslt: { label: "Game Server Login Token (recommended, from steamcommunity.com/dev/managegameservers, app 4000). Without one the server ranks very low in the server list; an invalid one stops it from starting.", type: "text" },
		mods: { label: "Steam Workshop collection id or link (optional). The collection must be Public or Unlisted; the server downloads its addons every time it starts.", type: "text" },
	},
	// The two maps the Facepunch wiki and the installation guides name. Any other map (a Workshop map, say) is set with the Map
	// argument in the Settings tab's Launch options.
	mapChoices: [
		{ code: "gm_construct", label: "gm_construct" },
		{ code: "gm_flatgrass", label: "gm_flatgrass" },
	],
	// UDP for players and the server list. Source's remote console would use TCP on the same number. 27015 (the engine's default) is
	// Core Keeper's default here, 27315 is Unturned's and 27116 is Space Engineers', so this starts at 27145 (27146 is kept free beside it).
	ports: [{ key: "port", label: "Game Port (UDP; the next port up is kept free too)", default: 27145 }],
	// Rejects a bad name, password, token or collection before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as gm_construct.`);
		return { sessionName: name, serverPassword: password, mapCode: map, gslt: cleanLoginToken(raw.gslt), mods: parseCollectionId(raw.mods) };
	},
	buildStartScriptFilename: () => "Start_GarrysMod.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Garry's Mod Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// The name and password, in autoexec.cfg (see the header for why it is not server.cfg). The game's other settings are the user's,
	// in server.cfg, and only the lines the user changed belong there.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Garry's Mod Server"}"`,
		];
		const password = cfgText(p.serverPassword, "The password");
		if (password) lines.push(`sv_password "${password}"`);
		lines.push("");
		return { relPath: AUTOEXEC_REL, content: lines.join("\r\n") };
	},
	postWrite: async (p) => {
		const warnings = [];
		if (!String(p.gslt ?? "").trim()) {
			warnings.push("No Game Server Login Token was given. Facepunch says every Garry's Mod server should have one (steamcommunity.com/dev/managegameservers, app 4000): without it the server ranks very low in the server list. Add it with the Login token argument in the Settings tab's Launch options, then restart.");
		}
		if (String(p.mods ?? "").trim()) {
			warnings.push("A Workshop collection was added. The server mounts its addons, but players only download an addon's content from your server if the addon is marked for download in a Lua file (resource.AddWorkshop in garrysmod\\lua\\autorun\\server) or is the current map or gamemode. The panel does not write that file.");
		}
		return { warnings };
	},
	buildServerEntry: (p) => {
		const autoexec = `${p.installDir}\\${AUTOEXEC_REL}`;
		const serverCfg = `${p.installDir}\\${SERVER_CFG_REL}`;
		return {
			name: p.name,
			type: "garrysmod",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: autoexec,
			configPaths: { "autoexec.cfg": autoexec, "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running (per the Facepunch and Valve pages; to be confirmed on a real install). The panel finds
			// this server's process by where it runs from, so a second srcds.exe elsewhere on the PC is not mistaken for it.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "4020",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: its data folder (Sandbox's persistent props, saved files), the config folder
	// (autoexec.cfg, server.cfg, the shipped cfg files are small), the admin list, custom server-side Lua and manual addons.
	// Workshop addons are downloaded again from the collection at every start, and the maps and the shipped gamemodes come from the
	// game itself, so they are left out.
	backup: {
		paths: [
			{ base: "working", rel: "garrysmod/data", label: "Saved data and persistent props" },
			{ base: "working", rel: "garrysmod/cfg", label: "Server settings" },
			{ base: "working", rel: "garrysmod/settings/users.txt", label: "Admin list" },
			{ base: "working", rel: "garrysmod/lua/autorun/server", label: "Server-side Lua scripts" },
			{ base: "working", rel: "garrysmod/addons", label: "Addons added by hand" },
		],
	},
	// console.log: everything the console prints, written because the launch line has -condebug (the Facepunch wiki says it goes in the garrysmod folder).
	logs: [{ kind: "file", base: "working", rel: "garrysmod/console.log", label: "Console log" }],
	launchOptions: true,
	// Each addon is a folder under addons/ with lua/, materials/ and the rest directly inside it. A zip holding one folder is put in as
	// that folder. A zip whose files sit at its top level is put in a folder named after the zip, which works. The trap is a zip whose
	// only top-level entry is lua/, materials/ or similar: that becomes addons/lua/, which the game reads as an addon called "lua".
	mods: {
		adapter: "folder",
		label: "Add-ons",
		dir: { base: "working", rel: "garrysmod/addons" },
		accepts: ["archive"],
		sources: ["github", "url"],
		note: "Each addon is a folder under addons (with lua/, materials/ and the rest directly inside it). Upload a .zip of the addon. If the .zip holds only a lua or materials folder, put it inside a folder of its own first.",
	},
};

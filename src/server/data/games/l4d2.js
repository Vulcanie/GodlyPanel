// Left 4 Dead 2 (Valve). Dedicated server: Steam app 222860 ("Left 4 Dead 2 Dedicated Server", free, anonymous login), game: app 550.
//
// Facts from the research dossier (research/l4d2/01..04), whose sources are Valve's developer wiki (Source Dedicated Server, Command
// line options, Source RCON Protocol, the Left 4 Dead 2 console command list), FireDaemon's and the other hosting guides, LinuxGSM's
// default command line and Steam's own app info for 222860. Nothing was run on a real install of THIS game; the points marked "same
// engine" were seen on a real Garry's Mod install by the same panel. In short:
//  - the program is srcds.exe in the install folder, started with
//      -console -game left4dead2 -port <n> -strictportbind +maxplayers <n> +map <map> +exec server.cfg -condebug
//    plus, when given, +sv_setsteamaccount <GSLT>. Nothing has to be last on the line, so the "Launch options" form stays on.
//    `-tickrate` is disabled in the game's code (Valve's page), so it is never offered;
//  - one game port: UDP for players and the server list, TCP on the same number for Source's remote console (same engine: seen
//    on Garry's Mod). The engine also takes UDP 27020 (SourceTV / the Steam client) and a random client port; 27020 is another
//    template's default here, so two Source servers on one PC will have the second one fall back to another port for it;
//  - the game ships NO server.cfg ("not included by default and must be created", FireDaemon), so the panel writes
//    left4dead2\cfg\server.cfg itself with the name, the password and the one setting a friends' server needs:
//    sv_allow_lobby_connect_only 0 (the game's default is 1, which refuses everyone who does not come from matchmaking). Because the
//    file is not shipped, SteamCMD's `validate` does not put it back, which is why this module (unlike Garry's Mod) has no autoexec.cfg;
//  - GSLT (Game Server Login Token) is optional here (third-party sources only; Valve says nothing), app 550 if one is used;
//  - the Source RCON exists, but this module does not use it (method "process", no rconPort): the panel's Stop has no command for
//    this game, and the dossier only has indirect evidence (LinuxGSM) that `quit` makes the server exit. The panel asks the window to
//    close, which ended Garry's Mod's srcds.exe cleanly in 4.5 s on a real install;
//  - mods: Steam Workshop addon (item) ids. The Workshop is fetched by SteamCMD's workshop_download_item with app 550 and anonymous
//    login (what LinuxGSM does; the dossier says no key is needed) and the .vpk is copied to left4dead2\addons\<id>.vpk. SourceMod and
//    Metamod are NOT installed by this module (they need a download-and-extract step the panel has no hook for).
// Not verified on a real install (see research/l4d2/05-implementation-notes.md): that srcds.exe sits in the install root and stays the
// one running process, that server.cfg is run by `+exec`, that the lobby setting lets friends in with `connect`, the Workshop download
// path, and that closing the window shuts the server down.

import { execFile } from "node:child_process";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";

const EXE = "srcds.exe";
const GAME_DIR = "left4dead2";
const SERVER_CFG_REL = `${GAME_DIR}\\cfg\\server.cfg`;
const ADDONS_REL = `${GAME_DIR}\\addons`;

/** The Workshop app the items belong to: the game (550), not the dedicated server tool (222860). */
const WORKSHOP_APP = "550";

const DEFAULT_MAP = "c1m1_hotel";
const DEFAULT_PLAYERS = 4;
const MAX_PLAYERS = 32;
const MAX_ADDONS = 30;

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

/** Player slots: 4 in Co-op and 8 in Versus is what the game supports (FireDaemon); the ceiling of 32 is the most add-ons raise it to. */
const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);

/**
 * A value for a line of a Source .cfg file. A quote, a semicolon, a backslash, a `//` or a line break would change what the game does
 * with the line, so such a value is refused instead of being quietly altered.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"\\;]|\/\//.test(text)) {
		throw new Error(`${what} has a character that Left 4 Dead 2's config files cannot hold safely (a quote, a semicolon, a backslash, two slashes in a row or a line break). Use plain letters, digits, spaces and punctuation without those.`);
	}
	return text;
}

/** A map name as it appears in a file name: letters, digits, `_`, `-`, `.`. */
const NAME_WORD = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$/;

/** The Game Server Login Token, as pasted: one piece of text. Empty means none. */
export function cleanLoginToken(raw) {
	const token = String(raw ?? "").trim();
	if (!token) return "";
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(token)) {
		throw new Error("The Steam login token has spaces or odd characters in it. Paste only the token itself, one piece of text, from steamcommunity.com/dev/managegameservers (create it for app 550).");
	}
	return token;
}

/**
 * The Steam Workshop item ids in what a person typed: numbers, or the items' links (`...?id=3815658696`), separated by commas, spaces
 * or line breaks. Empty means none. A collection's id is a number too and cannot be told apart here; the download then finds nothing
 * and the panel says so.
 */
export function parseAddonIds(raw) {
	const text = String(raw ?? "").trim();
	if (!text) return [];
	const ids = [];
	for (const part of text.split(/[\s,;]+/).filter(Boolean)) {
		const fromLink = /[?&]id=(\d+)/i.exec(part);
		const id = fromLink ? fromLink[1] : /^\d+$/.test(part) ? part : null;
		if (!id || id.length < 5 || id.length > 12) {
			throw new Error(`"${part.slice(0, 60)}" is not a Steam Workshop item id. Use the number after ?id= in the item's page address, one per item, separated by commas.`);
		}
		if (!ids.includes(id)) ids.push(id);
	}
	if (ids.length > MAX_ADDONS) throw new Error(`That is ${ids.length} Workshop items; the most this form takes is ${MAX_ADDONS}. Add the rest later by copying their files into left4dead2\\addons.`);
	return ids;
}

/** The launch line's arguments after the program. */
function launchArguments(p) {
	const args = [
		"-console",
		`-game ${GAME_DIR}`,
		`-port ${Number(p.port)}`,
		"-strictportbind",
		`+maxplayers ${playerLimit(p.maxPlayers)}`,
		`+map ${NAME_WORD.test(String(p.mapCode ?? "")) ? p.mapCode : DEFAULT_MAP}`,
		"+exec server.cfg",
		"-condebug",
	];
	// Only a value that is plainly a token reaches the script.
	const token = String(p.gslt ?? "").trim();
	if (/^[A-Za-z0-9_-]{1,64}$/.test(token)) args.push(`+sv_setsteamaccount ${token}`);
	return args;
}

// ---- Workshop addons -----------------------------------------------------------------------------------------------------------------

/** The first bytes of a Source package (.vpk) file: what a legacy Workshop item's `<hash>_legacy.bin` starts with too. */
const VPK_MAGIC = Buffer.from([0x34, 0x12, 0xaa, 0x55]);

function runSteamCmd(steamCmdExe, args, timeoutMs) {
	return new Promise((resolve) => {
		execFile(steamCmdExe, args, { windowsHide: true, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 }, (error, stdout) => {
			// SteamCMD's exit code is not reliable (it can be non-zero after a self-update); the files it left are what count.
			resolve({ output: String(stdout ?? ""), error });
		});
	});
}

async function filesUnder(dir, depth = 4) {
	const found = [];
	for (const entry of await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory() && depth > 0) found.push(...(await filesUnder(full, depth - 1)));
		else if (entry.isFile()) found.push(full);
	}
	return found.sort();
}

async function isPackage(file) {
	const handle = await fsp.open(file, "r").catch(() => null);
	if (!handle) return false;
	try {
		const head = Buffer.alloc(4);
		const { bytesRead } = await handle.read(head, 0, 4, 0);
		return bytesRead === 4 && head.equals(VPK_MAGIC);
	} finally {
		await handle.close();
	}
}

/**
 * Downloads the Workshop items in `p.mods` with SteamCMD (anonymous, app 550) and puts each one's package in left4dead2\addons as
 * `<id>.vpk`. An item that cannot be fetched is reported, never fatal. `run` is SteamCMD (replaceable for tests).
 */
export async function downloadAddons(p, { log = () => {}, run = runSteamCmd } = {}) {
	const warnings = [];
	const ids = parseAddonIds(p.mods);
	if (ids.length === 0) return { warnings, installed: [] };
	const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "gp-l4d2-"));
	const installed = [];
	try {
		const args = ["+force_install_dir", scratch, "+login", "anonymous"];
		for (const id of ids) args.push("+workshop_download_item", WORKSHOP_APP, id);
		args.push("+quit");
		log(`Downloading ${ids.length} Workshop addon(s) with SteamCMD...`);
		const { output } = await run(p.steamCmdExe, args, 30 * 60_000);
		const addons = path.win32.join(p.installDir, ADDONS_REL);
		await fsp.mkdir(addons, { recursive: true });
		for (const id of ids) {
			const files = await filesUnder(path.join(scratch, "steamapps", "workshop", "content", WORKSHOP_APP, id));
			const packages = [];
			for (const file of files) if (/\.(vpk|bin)$/i.test(file) && (await isPackage(file))) packages.push(file);
			if (packages.length === 0) {
				const why = String(output ?? "").split(/\r?\n/).reverse().find((l) => l.includes(id) && /error|fail|denied|timeout|no subscription/i.test(l));
				warnings.push(`Workshop item ${id} was not added: Steam gave no addon file for it${why ? ` (${why.trim().slice(0, 160)})` : ""}. Check the number is an addon (not a collection) and that it is public.`);
				continue;
			}
			for (const [i, file] of packages.entries()) {
				const name = i === 0 ? `${id}.vpk` : `${id}_${i + 1}.vpk`;
				await fsp.copyFile(file, path.win32.join(addons, name));
				installed.push(name);
				log(`Added ${name} to ${ADDONS_REL}.`);
			}
		}
	} finally {
		await fsp.rm(scratch, { recursive: true, force: true }).catch(() => {});
	}
	if (installed.length > 0) {
		warnings.push("Workshop addons were put in left4dead2\\addons. Every player needs the same addons (subscribe to them on Steam) or is refused with a missing-file message; Valve's updates or the addon authors' updates can also stop an addon from working. SourceMod and Metamod are not installed by the panel.");
	}
	return { warnings, installed };
}

// ---- The template --------------------------------------------------------------------------------------------------------------------

const template = {
	id: "l4d2",
	displayName: "Left 4 Dead 2",
	type: "l4d2",
	// Source's RCON exists but is not used: see the header. The panel watches the process, which gives no player count.
	method: "process",
	updateAppId: "222860",
	storeAppId: "550",
	sharedInstall: false,
	// SteamCMD puts the server straight in the server's folder: srcds.exe and left4dead2\ are in its root (to be confirmed).
	installLayoutRoot: "",
	description:
		"Left 4 Dead 2's dedicated server (srcds). Friends join with the console command connect <your address>:<port>; the panel sets sv_allow_lobby_connect_only to 0 for that, because with the game's own default (1) nobody can join except through matchmaking. They must not use the matchmaking menu. A Steam login token is optional. Addons from the Steam Workshop are copied into the server, and every player needs the same ones.",
	fields: ["sessionName", "serverPassword", "mapCode", "gslt", "mods"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		gslt: { label: "Steam login token (optional, from steamcommunity.com/dev/managegameservers, app 550). Third-party guides say the server works without one; with one it can be listed and use VAC.", type: "text" },
		mods: { label: "Steam Workshop addon ids or links (optional, separated by commas). Each must be a public addon, not a collection; they are downloaded once, now. Every player needs the same addons.", type: "text" },
	},
	// The first map of each official campaign, as Valve's page lists them. Any other map (a Workshop campaign, say) is set with the Map
	// argument in the Settings tab's Launch options.
	mapChoices: [
		{ code: "c1m1_hotel", label: "Dead Center (c1m1_hotel)" },
		{ code: "c2m1_highway", label: "Dark Carnival (c2m1_highway)" },
		{ code: "c3m1_plankcountry", label: "Swamp Fever (c3m1_plankcountry)" },
		{ code: "c4m1_milltown_a", label: "Hard Rain (c4m1_milltown_a)" },
		{ code: "c5m1_waterfront", label: "The Parish (c5m1_waterfront)" },
		{ code: "c6m1_riverbank", label: "The Passing (c6m1_riverbank)" },
		{ code: "c7m1_docks", label: "The Sacrifice (c7m1_docks)" },
		{ code: "c8m1_apartments", label: "No Mercy (c8m1_apartments)" },
		{ code: "c9m1_alleys", label: "Crash Course (c9m1_alleys)" },
		{ code: "c10m1_caves", label: "Death Toll (c10m1_caves)" },
		{ code: "c11m1_greenhouse", label: "Dead Air (c11m1_greenhouse)" },
		{ code: "c12m1_hilltop", label: "Blood Harvest (c12m1_hilltop)" },
		{ code: "c13m1_alpinecreek", label: "Cold Stream (c13m1_alpinecreek)" },
		{ code: "c14m1_junkyard", label: "The Last Stand (c14m1_junkyard)" },
	],
	// UDP for players and the server list (Source's remote console would use TCP on the same number). 27015 (the engine's default) is
	// Core Keeper's default here, 27145 is Garry's Mod's, 27215 is Barotrauma's and 27315 is Unturned's, so this starts at 27245 (27246
	// is kept free beside it). The engine's UDP 27020 (SourceTV / Steam client) is another template's default and is not moved.
	ports: [{ key: "port", label: "Game Port (UDP, and TCP for the remote console; the next port up is kept free too)", default: 27245 }],
	// Rejects a bad name, password, map, token or addon list before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		const map = String(raw.mapCode ?? "").trim() || DEFAULT_MAP;
		if (!NAME_WORD.test(map)) throw new Error(`"${map.slice(0, 60)}" is not a map name. Use the map file's name without .bsp, such as c1m1_hotel.`);
		return { sessionName: name, serverPassword: password, mapCode: map, gslt: cleanLoginToken(raw.gslt), mods: parseAddonIds(raw.mods).join(",") };
	},
	buildStartScriptFilename: () => "Start_L4D2.bat",
	// The program is in the install folder and is run from it. New arguments are appended at the end by the Launch options form;
	// nothing here has to be last.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Left 4 Dead 2 Server")}" ${EXE} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// The game ships no server.cfg, so the panel writes it. Only the lines it needs are in it; the Settings tab adds the rest.
	buildConfigFile: (p) => {
		const lines = [
			"// Written by GodlyPanel. One setting per line: its name, a space, then its value. Applies the next time the server starts.",
			`hostname "${cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Left 4 Dead 2 Server"}"`,
		];
		const password = cfgText(p.serverPassword, "The password");
		if (password) lines.push(`sv_password "${password}"`);
		lines.push(
			"// 0 lets friends join with the console command connect <address>:<port>; the game's own default (1) allows only matchmaking lobbies.",
			"sv_allow_lobby_connect_only 0",
			"sv_lan 0",
			"",
		);
		return { relPath: SERVER_CFG_REL, content: lines.join("\r\n") };
	},
	// The Workshop addons, fetched once while the server is being created.
	postWrite: async (p, ctx = {}) => {
		const { warnings } = await downloadAddons(p, { log: ctx.log });
		return { warnings };
	},
	buildServerEntry: (p) => {
		const serverCfg = `${p.installDir}\\${SERVER_CFG_REL}`;
		return {
			name: p.name,
			type: "l4d2",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath: serverCfg,
			configPaths: { "server.cfg": serverCfg },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running (per Valve's pages and Steam's launch entry; to be confirmed on a real install). The panel
			// finds this server's process by where it runs from, so another srcds.exe elsewhere on the PC is not mistaken for it.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "222860",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: the config folder (server.cfg and the ban lists banned_user.cfg and
	// banned_ip.cfg, which the game writes there) and the addons folder (Workshop downloads and files added by hand: the panel does not
	// fetch them again). The game has no world or save to keep: a round restarts from the campaign's first map.
	backup: {
		paths: [
			{ base: "working", rel: "left4dead2/cfg", label: "Server settings and ban lists" },
			{ base: "working", rel: "left4dead2/addons", label: "Addons (Workshop downloads and files added by hand)" },
		],
	},
	// console.log: everything the console prints, written because the launch line has -condebug (named console.log, in the game
	// folder: seen on Garry's Mod). The game's own log files are in left4dead2/logs (sv_logfile and sv_logsdir default, per Valve's list).
	logs: [
		{ kind: "file", base: "working", rel: "left4dead2/console.log", label: "Console log" },
		{ kind: "dir", base: "working", rel: "left4dead2/logs", label: "Game log" },
	],
	launchOptions: true,
	// The game loads every .vpk in its addons folder, so a file dropped there is an add-on. The Workshop items the form
	// downloads land in the same folder; this block only adds the plain folder, with no Workshop.
	mods: {
		adapter: "folder",
		label: "Add-ons",
		dir: { base: "working", rel: "left4dead2/addons" },
		accepts: [".vpk"],
		sources: ["github", "url"],
		note: "Drop .vpk add-on files here. Every player needs the same add-ons. Restart the server after a change.",
	},
};

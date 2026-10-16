// Squad (Offworld Industries). Dedicated server tool: Steam app 403240 (anonymous login), game: app 393380.
//
// Facts from the research dossier (research/squad/01..04), whose sources are the game's official wiki (Server Installation, Server
// Configuration, Server licensing, Uploading a mod to a dedicated server; read through the wiki's MediaWiki API), the community Docker
// image cm2network/squad and its entry script, the Pterodactyl/Pelican egg, and several hosting guides. Nothing was run on a real
// install of THIS game. In short:
//  - the program is SquadGame\Binaries\Win64\SquadGameServer.exe (the wiki's own start script; the earlier guess "SquadServer.exe" has
//    no source), started with the wiki's arguments, which are written KEY=value with NO leading dash:
//      Port=<n> QueryPort=<n> beaconport=<n> FIXEDMAXPLAYERS=<n> RANDOM=NONE -log
//    Port= is written first on purpose: the other arguments (QueryPort=, beaconport=) end in "port=", and the wiki's examples all
//    have Port= before them. The panel's launch-line editor reads "equals" arguments without a dash, so the "Launch options" form stays on;
//  - ports (the wiki's firewall list): game UDP 7787 and the next one up (7788), Steam query 27165 (and 27166), beacon 15000 (UDP and
//    TCP, one per server), remote console 21114. The panel records the game, query and beacon ports. The remote console is not part of
//    the template (see below);
//  - the server's name, player limit and everything else are in SquadGame\ServerConfig\Server.cfg, which is key=value with the name in
//    double quotes. Whether the install ships that file is not known (the Docker image edits an existing one), so the panel patches
//    the lines it owns (ServerName, MaxPlayers) in the shipped file, or makes a small file when there is none. No join password is set:
//    the official Server.cfg has no key for it (a ServerPassword key is seen only in third-party sources);
//  - the remote console: the panel does not use it. Its method is "process" and the entry has no rconPort/rconPassword, because with both
//    the panel's Stop would send a Source RCON command that Squad is not known to understand. The panel writes Rcon.cfg from the wiki's
//    template with an EMPTY password, which the wiki says keeps RCON turned off, so a password in a shipped sample file cannot leave a
//    remote console open. To use RCON (SquadJS and the like) the person sets Password (and, for a second server, Port) in Rcon.cfg;
//  - stopping: the game's documented graceful stop is Ctrl+C. The panel closes the program's window and force-kills after 15 s. Squad has
//    no persistent world to save (no source documents one), so nothing is lost by that, but whether closing the window exits the server
//    promptly is not verified;
//  - mods: Steam Workshop items of the GAME (393380), not the server tool. The server does not fetch them itself and there is no mod
//    argument and no mod list in Server.cfg. SteamCMD's `+workshop_download_item 393380 <id>` (anonymous) downloads each into
//    <install>\steamapps\workshop\content\393380\<id>, which has to be at SquadGame\Plugins\Mods\<id> (directly containing the mod's
//    Content folder, .uplugin and modinfo.smi, not one folder deeper). This module does that once, while the server is created. The
//    mods' layers still have to be added to the rotation files by hand, and ModsConfig.cfg (whose syntax is undocumented) is not touched.
// Not verified on a real install (see research/squad/05-implementation-notes.md): that SquadGameServer.exe is the one process that stays
// running, that the Server.cfg patch is kept, that the ports are the defaults the game uses when a flag is missing, that closing the
// window stops the server, and the Workshop download path.

import { execFile } from "node:child_process";
import { promises as fsp } from "node:fs";
import path from "node:path";

const EXE = "SquadGameServer.exe";
const EXE_PATH = `SquadGame\\Binaries\\Win64\\${EXE}`;
const CONFIG_DIR = "SquadGame\\ServerConfig";
const SERVER_CFG_REL = `${CONFIG_DIR}\\Server.cfg`;
const RCON_CFG_REL = `${CONFIG_DIR}\\Rcon.cfg`;
const MODS_REL = "SquadGame\\Plugins\\Mods";

/** The Workshop app the items belong to: the game (393380), not the dedicated server tool (403240). */
const WORKSHOP_APP = "393380";

// 80 is what the wiki's start script and the Docker image use; 100 is the most the wiki prints anywhere (Server.cfg's MaxPlayers and
// its start-script example).
const DEFAULT_PLAYERS = 80;
const MAX_PLAYERS = 100;
const MAX_MODS = 30;

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

const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);

/**
 * The server's name for Server.cfg, where it sits between double quotes (the wiki: without them the server may not become visible). A
 * double quote or a line break would end the value early, so such a name is refused instead of being quietly altered.
 */
export function serverNameText(value, what = "The server name") {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f"]/.test(text)) {
		throw new Error(`${what} has a double quote or a line break in it. Squad's Server.cfg keeps the name between double quotes, so use plain letters, digits, spaces and other punctuation.`);
	}
	return text;
}

/**
 * The Steam Workshop item ids in what a person typed: numbers, or the items' links (`...?id=3516838562`), separated by commas, spaces
 * or line breaks. Empty means none.
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
	if (ids.length > MAX_MODS) throw new Error(`That is ${ids.length} Workshop mods; the most this form takes is ${MAX_MODS}. Add the rest later by hand into SquadGame\\Plugins\\Mods.`);
	return ids;
}

/**
 * The launch line's arguments after the program, as the wiki writes them. Port= comes first (see the header). RANDOM=NONE and -log are
 * in every example of the wiki's start script. Nothing here has to be last, so the Launch options form can add to the end.
 */
function launchArguments(p) {
	return [
		`Port=${Number(p.port)}`,
		`QueryPort=${Number(p.queryPort)}`,
		`beaconport=${Number(p.beaconPort)}`,
		`FIXEDMAXPLAYERS=${playerLimit(p.maxPlayers)}`,
		"RANDOM=NONE",
		"-log",
	];
}

// ---- Server.cfg ----------------------------------------------------------------------------------------------------------------------

/** Sets `Key=value` on the line that starts with `Key=` (a commented-out copy is left alone), or adds the line at the end. */
function setLine(text, key, value) {
	const line = new RegExp(`^${key}=[^\\r\\n]*`, "m");
	if (line.test(text)) return text.replace(line, () => `${key}=${value}`);
	const eol = text.includes("\r\n") ? "\r\n" : "\n";
	const lead = text === "" || text.endsWith("\n") ? "" : eol;
	return `${text}${lead}${key}=${value}${eol}`;
}

/** The shipped Server.cfg with this server's name and player limit put in; everything else in it is left as the game wrote it. */
function patchServerCfg(original, p) {
	const name = serverNameText(p.sessionName || p.name) || "Squad Server";
	return setLine(setLine(original, "ServerName", `"${name}"`), "MaxPlayers", String(playerLimit(p.maxPlayers)));
}

/** A Server.cfg with only what the panel owns, for an install that ships none. The values are the wiki's printed defaults. */
function newServerCfg(p) {
	const name = serverNameText(p.sessionName || p.name) || "Squad Server";
	return [
		"// Written by GodlyPanel. One setting per line (Key=value). The game reads this file when it starts.",
		`ServerName="${name}"`,
		"ShouldAdvertise=true",
		"IsLANMatch=false",
		`MaxPlayers=${playerLimit(p.maxPlayers)}`,
		"",
	].join("\r\n");
}

/** Rcon.cfg as the wiki prints it, with the password empty: the wiki says an empty password keeps the remote console turned off. */
function rconCfg() {
	return [
		"// Written by GodlyPanel. The remote console (RCON) is OFF while Password is empty.",
		"// To use it with an outside tool, set a long Password; a second server on this PC needs its own Port.",
		"IP=0.0.0.0",
		"Port=21114",
		"Password=",
		"MaxConnections=5",
		"SecondsBeforeTimeoutCheck=120",
		"",
	].join("\r\n");
}

// ---- Workshop mods -------------------------------------------------------------------------------------------------------------------

function runSteamCmd(steamCmdExe, args, timeoutMs) {
	return new Promise((resolve) => {
		execFile(steamCmdExe, args, { windowsHide: true, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 }, (error, stdout) => {
			// SteamCMD's exit code is not reliable (it can be non-zero after a self-update); the files it left are what count.
			resolve({ output: String(stdout ?? ""), error });
		});
	});
}

const entriesOf = (dir) => fsp.readdir(dir, { withFileTypes: true }).catch(() => []);

/**
 * Downloads each Workshop item in `p.mods` with SteamCMD (anonymous, app 393380; one call per item, as the wiki's script does) and moves
 * it to SquadGame\Plugins\Mods\<id>, on the same drive so it takes no extra space. A mod that cannot be fetched is reported, never fatal.
 * `run` is SteamCMD (replaceable for tests).
 */
export async function downloadMods(p, { log = () => {}, run = runSteamCmd } = {}) {
	const warnings = [];
	const ids = parseModIds(p.mods);
	if (ids.length === 0) return { warnings, installed: [] };
	const content = path.win32.join(p.installDir, "steamapps", "workshop", "content", WORKSHOP_APP);
	const mods = path.win32.join(p.installDir, MODS_REL);
	const installed = [];
	try {
		await fsp.mkdir(mods, { recursive: true });
		for (const id of ids) {
			log(`Downloading Workshop mod ${id} with SteamCMD (this can take a long time for a big mod)...`);
			const { output } = await run(p.steamCmdExe, ["+force_install_dir", p.installDir, "+login", "anonymous", "+workshop_download_item", WORKSHOP_APP, id, "+quit"], 90 * 60_000);
			const from = path.win32.join(content, id);
			const found = await entriesOf(from);
			if (found.length === 0) {
				const why = String(output ?? "").split(/\r?\n/).reverse().find((l) => l.includes(id) && /error|fail|denied|timeout|no subscription/i.test(l));
				warnings.push(`Workshop mod ${id} was not added: Steam gave no files for it${why ? ` (${why.trim().slice(0, 160)})` : ""}. Check the number is a mod's own page (not a collection) and that it is public.`);
				continue;
			}
			const to = path.win32.join(mods, id);
			await fsp.rm(to, { recursive: true, force: true });
			try {
				await fsp.rename(from, to);
			} catch {
				await fsp.cp(from, to, { recursive: true });
			}
			installed.push(id);
			log(`Added mod ${id} to ${MODS_REL}.`);
			// The wiki and hosting guides: the mod's own files must sit directly in the folder (a Content folder and a .uplugin file).
			const top = await entriesOf(to);
			if (!top.some((e) => (e.isDirectory() && /^content$/i.test(e.name)) || (e.isFile() && /\.uplugin$/i.test(e.name)))) {
				warnings.push(`Mod ${id} was put in ${MODS_REL}\\${id}, but its top level has no Content folder or .uplugin file. Squad will not load a mod that sits one folder too deep, so open that folder and check.`);
			}
		}
	} finally {
		// Only mods were downloaded here; SteamCMD's bookkeeping for them is no use once they are moved.
		await fsp.rm(path.win32.join(p.installDir, "steamapps", "workshop"), { recursive: true, force: true }).catch(() => {});
	}
	if (installed.length > 0) {
		warnings.push("Workshop mods were put in SquadGame\\Plugins\\Mods. Add each mod's layer names (they are on its Workshop page) to the rotation file in SquadGame\\ServerConfig, then restart. Every player needs the same mods, and a Squad update can stop a mod working until its author updates it. The panel does not update mods later.");
	}
	return { warnings, installed };
}

// ---- The template --------------------------------------------------------------------------------------------------------------------

const template = {
	id: "squad",
	displayName: "Squad",
	type: "squad",
	// The only documented graceful stop is Ctrl+C in the console window and the one query worth having (the player count) is in the
	// remote console's ShowServerInfo, which the panel does not speak, so the server is watched by its process.
	method: "process",
	updateAppId: "403240",
	storeAppId: "393380",
	sharedInstall: false,
	// SteamCMD puts the server straight in the server's folder: SquadGame\ is in its root.
	installLayoutRoot: "",
	// About 14.9 GB (Steam's own metadata), before any Workshop mods.
	estimatedInstallBytes: 15_000_000_000,
	description:
		"Squad's dedicated server (about 15 GB). Close the Steam program on this PC before starting it, or the server will not start; the game's wiki also lists the Visual C++ 2013 and 2015 runtimes and DirectX June 2010 as requirements. A server made here has no license from the game's makers, so according to the wiki it is listed in the in-game Custom Servers browser. There is no join password to set up: the game's own Server.cfg has no key for it. Workshop mods can be added now; players need the same ones.",
	fields: ["sessionName", "mods"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		mods: { label: "Steam Workshop mod ids or links, comma-separated (optional). They are downloaded once, now, which can take a long time. Mods are for the game's own app, and every player needs the same ones.", type: "text" },
	},
	// The game's own examples: 7787 (UDP; 7788 is used too), 27165 (Steam query; the wiki's firewall list has 27166 as well, which the
	// panel cannot keep free: only offsets from the game port can be listed as implicit) and 15000 (beacon, one per server; the panel
	// does not check this one against other servers, as it knows only the game, query and RCON ports). The remote console (21114) is
	// not a panel port: see the header.
	ports: [
		{ key: "port", label: "Game Port (UDP; the next port up is used too)", default: 7787 },
		{ key: "queryPort", label: "Steam Query Port (UDP and TCP; the next port up is used too)", default: 27165 },
		{ key: "beaconPort", label: "Beacon Port (UDP and TCP, one per server)", default: 15000 },
	],
	implicitPorts: [{ offset: 1, label: "its second game port" }],
	// Rejects a bad name or mod list before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = serverNameText(raw.sessionName) || serverNameText(raw.name);
		return { sessionName: name, mods: parseModIds(raw.mods).join(",") };
	},
	buildStartScriptFilename: () => "Start_Squad.bat",
	// Started from the install folder with the wiki's arguments; the program is given by its path from there, as in SCUM's script.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Squad Server")}" ${EXE_PATH} ${launchArguments(p).join(" ")}`,
			"",
		].join("\r\n"),
	// The name and the player limit, in the Server.cfg the install ships (patched in place) or, if it has none, a small one.
	patchInstalledConfig: {
		relPath: SERVER_CFG_REL,
		apply: (original, p) => patchServerCfg(original, p),
		create: (p) => newServerCfg(p),
	},
	// The remote console switched off (empty password); see the header.
	buildExtraFiles: () => [{ relPath: RCON_CFG_REL, content: rconCfg() }],
	// The Workshop mods, fetched once while the server is being created.
	postWrite: async (p, ctx = {}) => {
		const { warnings } = await downloadMods(p, { log: ctx.log });
		return { warnings };
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "squad",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		beaconPort: p.beaconPort,
		sessionName: serverNameText(p.sessionName) || p.name,
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// Per the wiki's own start script (to be confirmed on a real install that it is the one process that stays running). The panel
		// finds this server's process by where it runs from, so another SquadGameServer.exe elsewhere on the PC is not mistaken for it.
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "403240",
		autoUpdate: false,
	}),
};

export default {
	template,
	// Everything in ServerConfig: Server.cfg, Rcon.cfg, the admin list, the ban list and the rotation, vote and message files. The
	// game has no world or save to keep. The Workshop mods are left out: they are large and are downloaded again from their pages.
	// Game.ini / Engine.ini (made by the game on its first run) hold the few overrides the wiki mentions; missing ones are skipped.
	backup: {
		paths: [
			{ base: "working", rel: "SquadGame/ServerConfig", label: "Server settings, admin list, bans and map rotation" },
			{ base: "working", rel: "SquadGame/Saved/Config/WindowsServer", label: "Game.ini and Engine.ini overrides" },
		],
	},
	// SquadGame\Saved\Logs (the SquadJS README and the wiki's pages); the game's own log inside is SquadGame.log.
	logs: [{ kind: "dir", base: "working", rel: "SquadGame/Saved/Logs", label: "Game log" }],
	// The launch line has arguments written KEY=value without a dash: the panel's editor reads those in its "equals" form (-log keeps it
	// on the line, which the editor needs to recognise it).
	launchOptions: true,
};

// Terraria with tModLoader (tModLoader team). Not a SteamCMD game: vanilla Terraria has no dedicated server on Steam, and tModLoader's
// Steam app (1281930) installs only with a real Steam login. So this module installs from the project's GitHub release instead
// (`zipInstall`, see data/gameTemplates.js and services/zipInstall.js): tModLoader.zip of the latest release, checked against the
// SHA-256 GitHub publishes for it, and only after the person creating the server has agreed to the download.
//
// Facts from the research dossier (research/terraria/01..04), whose sources are the tModLoader repository (its shipped scripts,
// serverconfig.txt, source code), its wiki, the Terraria wiki (Server, Command-line parameters) and Steam's own app info. Nothing was
// run on a real install. In short:
//  - tModLoader is the only server: vanilla clients cannot join it and it cannot be joined by vanilla clients, even with no mods;
//  - there is no server exe. The server is `dotnet\dotnet.exe tModLoader.dll -server ...` in the install folder. The release zip has no
//    dotnet\ folder: the shipped start script downloads .NET 8 into it on the FIRST start (needs internet, up to a few minutes). The
//    script therefore starts the shipped bash script through the zip's own busybox (the same chain the shipped .bat uses), and the
//    entry's processName is dotnet.exe. The panel tells this server's dotnet.exe from any other .NET program by where it runs from:
//    <install>\dotnet\dotnet.exe is inside the server's folder (see serverProcesses.js). Nothing here kills by image name;
//  - the shipped start-tModLoaderServer.sh ASKS ("Use steam server (y/n)") unless -nosteam or -steam is on the line, and it joins its
//    arguments into one string that is split on spaces again, so a value with a space in it falls apart. Hence: -nosteam is always
//    given; every value on the launch line is a single word (a relative folder, a number); and everything that can have a space in it
//    (the world's path, its name, the password) is in serverconfig.txt, where a value runs to the end of the line;
//  - one TCP game port (the Terraria wiki: "Default: TCP port 7777"); 7777 is Valheim's and Satisfactory's default here, so 7878 is
//    used. The panel's port editor changes -port on the launch line, so the port is NOT also written to serverconfig.txt (two copies
//    could disagree); the same goes for -players;
//  - serverconfig.txt is `key=value` lines with `#` comment lines: exactly the shape of the panel's "properties" reader, so the
//    Settings tab edits it. The panel writes a small file of its own (world, autocreate, worldname, password) instead of the shipped
//    all-commented example. `world=` is a full path with no quotes; the data is kept in the server's folder (-tmlsavedirectory tmldata:
//    Worlds\, Mods\, ModConfigs\ below it), so a server made here is self-contained and a backup finds it;
//  - NO GRACEFUL STOP FROM THE PANEL. The world is saved by the console command `exit` (or `save`); the server "will only save on shutdown
//    when using the exit command" (Terraria wiki), and what closing the window or ending the process does is not documented. The panel has
//    no way to type into a console, so Stop asks the process to close and ends it after 15 s. Type `exit` in the server's window (it is
//    kept minimized, not hidden) and wait for it to close before pressing Stop. The server also autosaves, how often is not documented;
//  - mods: Steam Workshop items of the tModLoader app (1281930) are downloaded by SteamCMD's anonymous `+workshop_download_item 1281930
//    <id>` (what the official management script does) into <install>\steamapps\workshop\content\1281930\<id>; the launch line then has
//    `-steamworkshopfolder steamapps/workshop` (as the official script's does) so tModLoader scans it. Which of them LOAD is decided by tmldata\Mods\enabled.json, a JSON
//    array of the mods' INTERNAL names; this module reads each name from the downloaded .tmod file's header (format from TmodFile.Read in
//    the tModLoader source: "TMOD", the tML version, a 20-byte hash, a 256-byte signature, a length, then the mod's name) and writes
//    that file. Dependencies are NOT downloaded by SteamCMD (a mod's "required items" must be listed too);
// Not verified on a real install (see research/terraria/05-implementation-notes.md): that the zip's chain (busybox -> bash -> dotnet)
// runs from a panel-started window and leaves dotnet.exe running from <install>\dotnet, that .NET downloads unattended on the first start,
// that relative -tmlsavedirectory and a config file read by -config work, that the Workshop folder is found without -steamworkshopfolder,
// that -port/-players override anything in the config, and what Stop does to the world.

import { execFile } from "node:child_process";
import { promises as fsp } from "node:fs";
import path from "node:path";

const WORKSHOP_APP = "1281930";
const CONFIG_FILE = "serverconfig.txt";
const SAVE_DIR = "tmldata";
const MODS_REL = `${SAVE_DIR}\\Mods`;
const WORKSHOP_REL = "steamapps\\workshop\\content\\" + WORKSHOP_APP;

const DEFAULT_PLAYERS = 8;
const MAX_PLAYERS = 255;
const MAX_MODS = 60;
/** The world-creation menu allows 27 characters (Terraria wiki, World). */
const WORLD_NAME_MAX = 27;

const wholeNumber = (value, fallback, min, max) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

/** The player limit: 1 to 255 ("Value must be between 1 and 255", the shipped config), 8 when none is given (its example). */
export const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);

/** A text safe to put between the quotes of a .bat `start` title. */
const windowTitle = (value) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!\\]|[^\u0000-\u007f]/g, "")
		.replace(/\s+/g, " ")
		.trim() || "Terraria Server";

/**
 * The world's name, which is also the file's name (`<name>.wld`): letters, digits, spaces, `_`, `-` and `.`, 27 characters at most, no
 * blanks or dots at either end. Anything else is dropped; this stays inside what every file system and the config reader accept.
 */
export function worldName(value, fallback = "World") {
	const cleaned = String(value ?? "")
		.replace(/[^A-Za-z0-9 _.-]/g, "")
		.replace(/\s+/g, " ")
		.slice(0, WORLD_NAME_MAX)
		.replace(/^[\s.]+|[\s.]+$/g, "");
	return cleaned || fallback;
}

/**
 * A text for the right-hand side of a config line: it runs to the end of the line, so only a line break could end it early (the create
 * flow already refuses those). Surrounding blanks are not kept. Control characters are dropped.
 */
const configValue = (value) => String(value ?? "").replace(/[\u0000-\u001f]/g, "").trim();

/**
 * The Steam Workshop item ids in what a person typed: numbers, or the items' links (`...?id=2824688072`), separated by commas, spaces or
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
	if (ids.length > MAX_MODS) throw new Error(`That is ${ids.length} Workshop mods; the most this form takes is ${MAX_MODS}. Add the rest later by hand.`);
	return ids;
}

/** The ids in a mod list, or none for one that cannot be read (resolveParams refuses those; this never throws). */
const modIdsOrNone = (raw) => {
	try {
		return parseModIds(raw);
	} catch {
		return [];
	}
};

/** Whether the form asks for Workshop mods (so SteamCMD is needed). Never throws: the form may not have been checked yet. */
const wantsMods = (raw) => modIdsOrNone(raw?.mods).length > 0;

// ---- serverconfig.txt ----------------------------------------------------------------------------------------------------------------

/** Where the world file is: in the server's own folder, under the save folder the launch line names. */
const worldPath = (p) => `${p.installDir}\\${SAVE_DIR}\\Worlds\\${worldName(p.sessionName || p.name)}.wld`;

/**
 * The settings file the panel writes. Only what has to be here: the world (a full path, no quotes), a new Medium world if there is none yet
 * under that name, the world's name, and the join password when there is one. The port and the player limit are on the launch line.
 * The settings the game's own example lists are all in the Settings tab's catalog for adding.
 */
function serverConfig(p) {
	const password = configValue(p.serverPassword);
	return [
		"# Written by GodlyPanel. One setting per line: key=value. A line starting with # is ignored.",
		"# The game port (-port) and the player limit (-players) are on the launch line in Start_Terraria.bat, not here.",
		"# Stop the server before editing this file; it is read when the server starts.",
		`world=${worldPath(p)}`,
		"# 1 = Small, 2 = Medium, 3 = Large. Only used when the world above does not exist yet.",
		"autocreate=2",
		`worldname=${worldName(p.sessionName || p.name)}`,
		...(password ? [`password=${password}`] : []),
		"",
	].join("\r\n");
}

// ---- Workshop mods -------------------------------------------------------------------------------------------------------------------

/**
 * The mod's internal name, read from the start of a .tmod file. The layout is TmodFile.Read in the tModLoader source: the four bytes
 * "TMOD", the tML version as a .NET BinaryWriter string (a 7-bit-encoded length, then UTF-8), a 20-byte hash, a 256-byte signature, an int32
 * length of the rest, then the mod's name as another such string. Null when the bytes are not that.
 */
export function modNameFromTmod(buffer) {
	try {
		let at = 0;
		if (buffer.length < 8 || buffer.toString("ascii", 0, 4) !== "TMOD") return null;
		at = 4;
		const readString = () => {
			let length = 0;
			let shift = 0;
			for (;;) {
				const byte = buffer[at++];
				if (byte === undefined || shift > 28) throw new Error("bad length");
				length |= (byte & 0x7f) << shift;
				if ((byte & 0x80) === 0) break;
				shift += 7;
			}
			if (length < 0 || at + length > buffer.length) throw new Error("bad string");
			const text = buffer.toString("utf8", at, at + length);
			at += length;
			return text;
		};
		readString(); // the tModLoader version it was built for
		at += 20 + 256 + 4; // hash, signature, length of the rest
		const name = readString();
		// An internal name is a C# identifier; anything else is not a mod name.
		return /^[A-Za-z_][A-Za-z0-9_.]{0,100}$/.test(name) ? name : null;
	} catch {
		return null;
	}
}

function runSteamCmd(steamCmdExe, args, timeoutMs) {
	return new Promise((resolve) => {
		execFile(steamCmdExe, args, { windowsHide: true, timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 }, (error, stdout) => {
			// SteamCMD's exit code is not reliable (it can be non-zero after a self-update); the files it left are what count.
			resolve({ output: String(stdout ?? ""), error });
		});
	});
}

/** Every .tmod file below a folder (a Workshop item holds one or more, in folders named for the tModLoader version). */
async function tmodFilesUnder(dir) {
	const found = [];
	const walk = async (folder, depth) => {
		for (const entry of await fsp.readdir(folder, { withFileTypes: true }).catch(() => [])) {
			const full = path.win32.join(folder, entry.name);
			if (entry.isDirectory() && depth < 4) await walk(full, depth + 1);
			else if (entry.isFile() && /\.tmod$/i.test(entry.name)) found.push(full);
		}
	};
	await walk(dir, 0);
	return found;
}

/**
 * Downloads each Workshop item in `p.mods` with SteamCMD (anonymous, the tModLoader app 1281930; one call per item), reads the internal
 * name of the mod in each from its .tmod file, and writes tmldata\Mods\enabled.json with those names. The downloads stay where SteamCMD
 * put them (steamapps\workshop\content\1281930\<id>): that is the folder tModLoader loads Workshop mods from. A mod that cannot be fetched
 * is reported, never fatal. `run` is SteamCMD (replaceable for tests).
 * @returns {Promise<{ warnings: string[], installed: string[], enabled: string[] }>}
 */
export async function downloadMods(p, { log = () => {}, run = runSteamCmd } = {}) {
	const warnings = [];
	const ids = parseModIds(p.mods);
	if (ids.length === 0) return { warnings, installed: [], enabled: [] };
	const installed = [];
	const enabled = [];
	for (const id of ids) {
		log(`Downloading Workshop mod ${id} with SteamCMD (this can take a long time for a big mod)...`);
		const { output } = await run(p.steamCmdExe, ["+force_install_dir", p.installDir, "+login", "anonymous", "+workshop_download_item", WORKSHOP_APP, id, "+quit"], 90 * 60_000);
		const files = await tmodFilesUnder(path.win32.join(p.installDir, WORKSHOP_REL, id));
		if (files.length === 0) {
			const why = String(output ?? "").split(/\r?\n/).reverse().find((l) => l.includes(id) && /error|fail|denied|timeout|no subscription/i.test(l));
			warnings.push(`Workshop mod ${id} was not added: Steam gave no .tmod file for it${why ? ` (${why.trim().slice(0, 160)})` : ""}. Check the number is a mod's own page (not a collection) and that it is public.`);
			continue;
		}
		installed.push(id);
		let name = null;
		for (const file of files) {
			name = modNameFromTmod(await fsp.readFile(file).catch(() => Buffer.alloc(0)));
			if (name) break;
		}
		if (name) {
			if (!enabled.includes(name)) enabled.push(name);
			log(`Mod ${id} is "${name}".`);
		} else {
			warnings.push(`Workshop mod ${id} was downloaded, but the panel could not read its name from the file, so it is not in the list of enabled mods. Add its name to ${MODS_REL}\\enabled.json by hand.`);
		}
	}
	if (enabled.length > 0) {
		const file = path.win32.join(p.installDir, MODS_REL, "enabled.json");
		await fsp.mkdir(path.dirname(file), { recursive: true });
		await fsp.writeFile(file, `${JSON.stringify(enabled, null, 2)}\n`, "utf8");
		log(`Wrote ${MODS_REL}\\enabled.json with ${enabled.length} mod${enabled.length === 1 ? "" : "s"}.`);
	}
	if (installed.length > 0) {
		warnings.push("Steam does not download the mods a mod needs (its \"required items\" on the Workshop page). Add each one's number too, or the server will not load that mod. Players need the same mods and tModLoader version; the game offers to download missing mods when they join.");
	}
	return { warnings, installed, enabled };
}

// ---- The template --------------------------------------------------------------------------------------------------------------------

const STOP_WARNING =
	"The panel cannot save and stop this server cleanly. The world is saved by the `exit` command typed into the server's own console window, and the panel has no way to type into a console. Stop closes the window and ends the process after 15 seconds, so the world keeps only what the server saved before. Open the server's window (it is kept minimized on the taskbar), type exit, wait for the window to close, and only then press Stop or restart.";

const template = {
	id: "terraria",
	displayName: "Terraria (tModLoader)",
	type: "terraria",
	method: "process",
	// tModLoader's own Steam page, used only to find the dashboard artwork: nothing is installed through Steam.
	storeAppId: WORKSHOP_APP,
	sharedInstall: false,
	// The release zip is unpacked straight into the server's folder: tModLoader.dll, start-tModLoaderServer.sh and LaunchUtils\ are in its root.
	installLayoutRoot: "",
	// Installed from the project's GitHub release, never through SteamCMD (no Steam login is needed): see the top of this file. maxBytes is
	// well above the 61 MB the file is today and well below anything that could fill a disk.
	zipInstall: {
		repo: "tModLoader/tModLoader",
		asset: "tModLoader.zip",
		maxBytes: 500 * 1024 * 1024,
		expect: ["tModLoader.dll", "start-tModLoaderServer.sh", "LaunchUtils\\busybox64.exe", "LaunchUtils\\ScriptCaller.sh"],
	},
	// The 61 MB zip unpacked, the .NET 8 runtime the first start downloads, and room for worlds.
	estimatedInstallBytes: 1_000_000_000,
	// SteamCMD is used only for Workshop mods, when some are asked for.
	needsSteamCmd: wantsMods,
	description:
		"Terraria with the tModLoader mod loader, installed from tModLoader's own GitHub release (about 60 MB, checked against GitHub's published checksum; no Steam account needed). Only tModLoader players can join it, and they need the same mods. THE PANEL CANNOT SAVE AND STOP IT CLEANLY: the world is saved when `exit` is typed into the server's own console window, and the panel has no way to type into a console, so Stop closes the window and then ends the process after 15 seconds. Before pressing Stop, open the server's window (it is kept minimized on the taskbar), type exit and wait for it to close. The first start downloads the .NET runtime and can take several minutes. Steam Workshop mods can be added now.",
	fields: ["sessionName", "serverPassword", "mods"],
	fieldMeta: {
		sessionName: { label: "World name (also its file name; made if it does not exist. Letters, digits, spaces, - _ . only, 27 characters at most)", type: "text" },
		serverPassword: { label: "Server Password (leave empty for none; it is written in serverconfig.txt)", type: "text" },
		mods: { label: "Steam Workshop mod ids or links for tModLoader, comma-separated (optional). They are downloaded once, now, with SteamCMD, which can take a long time. Also list the mods they require; every player needs the same ones.", type: "text" },
	},
	// TCP. 7777 is the game's own default but Valheim's and Satisfactory's here, so 7878 is used; no other template uses it or the port after it.
	ports: [{ key: "port", label: "Game Port (TCP)", default: 7878 }],
	// Rejects a bad mod list or password before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => ({
		sessionName: worldName(raw.sessionName, worldName(raw.name)),
		serverPassword: configValue(raw.serverPassword),
		mods: parseModIds(raw.mods).join(","),
	}),
	buildStartScriptFilename: () => "Start_Terraria.bat",
	// Started from the install folder through the zip's own busybox and its start script, as the shipped start-tModLoaderServer.bat does,
	// but with `start /MIN` on the program itself (the shipped bat's busybox-sh.bat uses `start` and returns at once) and every value a
	// single word. -nosteam: no Steam lobby and no question. The folder for worlds, mods and per-mod settings is relative (tmldata). When
	// Workshop mods were asked for, -steamworkshopfolder points tModLoader at where SteamCMD put them (the official script does the same).
	// Nothing has to be last, so the Launch options form may add arguments at the end; a value with a space in it would be split by the
	// shipped script (see the header), so keep them to single words.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${windowTitle(p.name)}" "LaunchUtils\\busybox64.exe" bash ./start-tModLoaderServer.sh -nosteam -config ${CONFIG_FILE} -port ${Number(p.port)} -players ${playerLimit(p.maxPlayers)} -tmlsavedirectory ${SAVE_DIR}${wantsMods(p) ? " -steamworkshopfolder steamapps/workshop" : ""}`,
			"",
		].join("\r\n"),
	buildConfigFile: (p) => ({ relPath: CONFIG_FILE, content: serverConfig(p) }),
	// The folders the game reads from, with a note in each (a text file is the only way to have the panel make a folder).
	buildExtraFiles: () => [
		{ relPath: `${MODS_REL}\\Put .tmod files here.txt`, content: "Copy tModLoader mod files (.tmod) into this folder while the server is stopped, and add each mod's name to enabled.json (a list like [\"MagicStorage\"]) next to this note. Players need the same mods.\r\n" },
		{ relPath: `${SAVE_DIR}\\Worlds\\Put a world here.txt`, content: "To use a world you made in the game, copy its .wld and .twld files into this folder and put its full path in serverconfig.txt on the world= line (the .wld, not the .twld).\r\n" },
	],
	// The Workshop mods, fetched once while the server is being created, and the warnings every new server gets.
	postWrite: async (p, ctx = {}) => {
		const { warnings } = await downloadMods(p, { log: ctx.log });
		return {
			warnings: [
				STOP_WARNING,
				"The first start downloads the .NET runtime (the program that runs tModLoader) into the server's folder, which needs internet and can take several minutes; the server shows as stopped until it is done. Windows may ask to allow dotnet.exe through the firewall: allow it, and forward TCP port " + Number(p.port) + " on your router for players outside your home.",
				"Only tModLoader players can join, on the same tModLoader version (the first three numbers). The panel does not update tModLoader or its mods later; a monthly tModLoader release can break mods, so take a backup before changing either.",
				...warnings,
			],
		};
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "terraria",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		sessionName: worldName(p.sessionName || p.name),
		serverPassword: p.serverPassword,
		configPath: `${p.installDir}\\${CONFIG_FILE}`,
		configPaths: { [CONFIG_FILE]: `${p.installDir}\\${CONFIG_FILE}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// The program that stays running is dotnet.exe, from <install>\dotnet (not observed running). The name is shared by every .NET
		// program, so the panel tells this server's by where it runs from: that folder is inside the server's.
		processName: "dotnet.exe",
		// Kept on the taskbar rather than hidden, so the console can be reached to type `exit` (the panel cannot send it).
		windowMode: "minimized",
		installDir: `${p.installDir}\\`,
		autoUpdate: false,
	}),
};

export default {
	template,
	// Under tmldata: the worlds (and the game's own rolling backups in Worlds\Backups), each mod's settings, and the list of enabled mods
	// with any .tmod files put there by hand. serverconfig.txt and the ban list are small. Workshop downloads (steamapps) are left out: they
	// are large and are downloaded again by Steam from their pages. Files that don't exist are skipped.
	backup: {
		paths: [
			{ base: "working", rel: "tmldata/Worlds", label: "Worlds" },
			{ base: "working", rel: "tmldata/ModConfigs", label: "Mod settings" },
			{ base: "working", rel: "tmldata/Mods", label: "Enabled mods and mods added by hand" },
			{ base: "working", rel: "serverconfig.txt", label: "Server settings" },
			{ base: "working", rel: "banlist.txt", label: "Ban list" },
		],
	},
	logs: [{ kind: "dir", base: "working", rel: "tModLoader-Logs", label: "Server logs" }],
	launchOptions: true,
};

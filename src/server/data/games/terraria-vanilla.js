// Terraria, the vanilla dedicated server (Re-Logic). Not a Steam install: the server is a zip from terraria.org, installed through the
// template's `webInstall` (see data/gameTemplates.js and services/webInstall.js). The tModLoader server is a separate module (terraria.js,
// id `terraria`): this one is the game with no mod loader.
//
// Facts from the research dossier (research/terraria-vanilla/01..04), whose sources are the Terraria wiki's Server page, Command-line
// parameters page and Setting up a server guide (the wiki was read through a mirror). The Windows server was run through the panel on a real install (see 06-verification.md). In short:
//  - the server is TerrariaServer.exe, started with `-config serverconfig.txt`; the dossier names -port and -maxplayers (and their
//    config keys port and maxplayers, 16 by default, 1 to 255);
//  - serverconfig.txt is key=value lines, `#` starts a comment line. The panel writes world, autocreate, worldname and (when set)
//    password; port and maxplayers are on the start script's line only, so the file never disagrees with the script;
//  - the world is saved only by the console command `exit` (or `save`). The server also saves at dawn (every 24 minutes). The panel
//    cannot type into a console, so its Stop closes the window; see STOP_WARNING and the notes;
//  - TCP 7777 is the default port in the dossier. This module uses 7790 instead because 7777 is already taken by two templates here;
//  - no mod support is managed (the dossier says vanilla mod support is not stated).
//
// Verified on a real download: the zip unpacks to `1458WindowsTerrariaServer.exe`, so the start script and the config file sit in that
// platform folder (the template's `expect` checks the exe is there). Also verified: TerrariaServer.exe will not start unless Microsoft's
// XNA Framework 4.0 assemblies are beside it. The zip does not carry them, so the template's `webInstall.extras` has the panel fetch
// Microsoft's redistributable MSI (after the person agrees), check it, unpack it without installing it, and copy the DLLs next to the exe.
// Without them the server window shows an assembly-load error and closes.

import { terrariaServerZip } from "../../services/webResolvers.js";

const VERSION = "1.4.5.8";
// The zip's version folder: the version without its dots (1.4.5.8 -> 1458), as the terraria.org download name is built.
const VERSION_FOLDER = VERSION.replaceAll(".", "");
// The zip holds one folder per platform inside the version folder; the Windows server is in its Windows folder.
const SERVER_DIR = `${VERSION_FOLDER}\\Windows`;
const EXE = "TerrariaServer.exe";
const CONFIG_FILE = "serverconfig.txt";
const WORLD_FOLDER = "Worlds";

// Used when the form leaves them out. 16 players is the dossier's default; the port is not the dossier's 7777 (see the header).
const DEFAULT_PORT = 7790;
const DEFAULT_PLAYERS = 16;
const MAX_PLAYERS = 255;
// Medium. The dossier gives 1 (small), 2 (medium) and 3 (large) and no default; this is the panel's choice for a new world.
const DEFAULT_SIZE = 2;
const DEFAULT_WORLD = "World";

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

/** The player limit: a whole number from 1 to 255 (the dossier's config key range); 16 when it is left out. */
const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);
const portOf = (p) => wholeNumber(p.port, DEFAULT_PORT, 1, 65535);

// A world's file name and its name in the game: letters, digits, spaces, `-`, `_` and `.`, 27 characters at most. The 27 is the
// panel's own limit (the game's world-creation menu is said to use it, per the tModLoader research); it is not in the dossier.
const WORLD_NAME = /^[A-Za-z0-9](?:[A-Za-z0-9 _.-]{0,25}[A-Za-z0-9_.-])?$/;

/**
 * A value for a line of serverconfig.txt. A line break or another control character would start a new setting, so such a value is
 * refused instead of being quietly altered. Anything else (quotes, spaces, #) is written as typed: the dossier shows unquoted paths
 * with spaces, and does not say how a quote or a # inside a value is read.
 */
export function configText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f]/.test(text)) {
		throw new Error(`${what} has a line break or another control character, which cannot be written in ${CONFIG_FILE}. Use one line of plain text.`);
	}
	return text;
}

/** The world name, checked. */
export function worldNameOf(value) {
	const name = String(value ?? "").trim() || DEFAULT_WORLD;
	if (!WORLD_NAME.test(name)) {
		throw new Error(`"${name.slice(0, 60)}" cannot be a world name. Use letters, digits, spaces, - _ . only, 27 characters at most, starting and ending with a letter, digit, _, - or .`);
	}
	return name;
}

const worldFile = (p) => `${p.installDir}\\${SERVER_DIR}\\${WORLD_FOLDER}\\${worldNameOf(p.sessionName)}.wld`;

const template = {
	id: "terraria-vanilla",
	displayName: "Terraria (vanilla)",
	type: "terraria-vanilla",
	method: "process",
	// The full Terraria client's Steam app (105600), used only to find the dashboard artwork. Nothing is installed through Steam.
	storeAppId: "105600",
	sharedInstall: false,
	// The start script, the config file and the server's working folder are all in the platform folder (see SERVER_DIR).
	installLayoutRoot: SERVER_DIR,
	// Downloaded from terraria.org, after the person creating the server has agreed (the create form asks first). terraria.org publishes
	// no checksum, so the panel shows the SHA-256 it computes. `expect` checks the exe is where the zip puts it.
	webInstall: {
		label: `Terraria dedicated server ${VERSION}`,
		hosts: terrariaServerZip.hosts,
		kind: "zip",
		expect: [`${SERVER_DIR}\\${EXE}`],
		resolve: terrariaServerZip(VERSION),
		// The server will not start without Microsoft's XNA Framework 4.0, which the zip does not carry. The panel fetches Microsoft's
		// redistributable MSI (pinned by size and SHA-256, and it must be signed by Microsoft), unpacks it without installing it, and
		// copies the Framework's DLLs beside the exe, where the server finds them.
		extras: [
			{
				label: "Microsoft XNA Framework 4.0 Redistributable",
				why: "the server cannot start without it",
				hosts: ["download.microsoft.com"],
				url: "https://download.microsoft.com/download/A/C/2/AC2C903B-E6E8-42C2-9FD7-BEBAC362A930/xnafx40_redist.msi",
				kind: "msi",
				bytes: 7054848,
				sha256: "47260420773a20443fb1e38a89b7f39c5237a80a842de598e6c8f7f90a3bbd6d",
				signer: "Microsoft Corporation",
				pick: /^(Microsoft\.Xna\.Framework(\.[A-Za-z.]+)?\.dll|XnaNative\.dll|EULA\.en-US\.txt)$/i,
				expect: ["Microsoft.Xna.Framework.dll", "Microsoft.Xna.Framework.Game.dll", "Microsoft.Xna.Framework.Graphics.dll", "XnaNative.dll"],
				into: SERVER_DIR,
			},
		],
	},
	description:
		"The vanilla Terraria dedicated server from terraria.org (a zip, not Steam; no Steam account is needed). The panel also fetches Microsoft's XNA Framework 4.0 files the server needs (checked, unpacked into the server's folder, nothing installed on the PC). Players join with plain Terraria; a mod loader is not used here (tModLoader has its own entry). THE PANEL CANNOT SAVE AND STOP IT CLEANLY: the world is saved when `exit` is typed into the server's own console window, and the panel has no way to type into a console. Stop closes the window and ends the process after 15 seconds. Before pressing Stop, open the server's window (it is kept minimized on the taskbar), type exit and wait for it to close.",
	fields: ["sessionName", "serverPassword"],
	fieldMeta: {
		sessionName: { label: "World name (also its file name; made if it does not exist yet. Letters, digits, spaces, - _ . only, 27 characters at most)", type: "text" },
		serverPassword: { label: "Server Password (leave empty for none; it is written in serverconfig.txt)", type: "text" },
	},
	// TCP, the game's only port per the wiki (UDP only for cloud hosts, which this is not). 7777 is the game's default but is taken here.
	ports: [{ key: "port", label: "Game Port (TCP)", default: DEFAULT_PORT }],
	// Rejects a bad world name or password before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const sessionName = worldNameOf(raw.sessionName ?? "");
		const serverPassword = configText(raw.serverPassword, "The password");
		return { sessionName, serverPassword };
	},
	buildStartScriptFilename: () => "Start_Terraria.bat",
	// Started from the platform folder, where the program is, as the wiki's command does (`TerrariaServer.exe -config <file>`). The
	// launch options form may add arguments at the end; the dossier gives no order rule for them.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Terraria Server")}" ${EXE} -config ${CONFIG_FILE} -port ${portOf(p)} -maxplayers ${playerLimit(p.maxPlayers)}`,
			"",
		].join("\r\n"),
	// The settings the panel writes: the world (a full path, so backups and the Worlds folder agree), a new medium world if there is none,
	// its name, and the password when there is one. Port and player limit are on the launch line above, not here.
	buildConfigFile: (p) => {
		const name = worldNameOf(p.sessionName);
		const password = configText(p.serverPassword, "The password");
		const lines = [
			"# Written by GodlyPanel. One setting per line: key=value. A line starting with # is ignored.",
			"# The game port (-port) and the player limit (-maxplayers) are on the launch line in Start_Terraria.bat, not here.",
			"# Stop the server before editing this file; it is read when the server starts.",
			`world=${worldFile({ installDir: p.installDir, sessionName: name })}`,
			"# 1 = Small, 2 = Medium, 3 = Large. Only used when the world above does not exist yet.",
			`autocreate=${DEFAULT_SIZE}`,
			`worldname=${name}`,
			...(password ? [`password=${password}`] : []),
			"",
		];
		return { relPath: CONFIG_FILE, content: lines.join("\r\n") };
	},
	// The Worlds folder the world line points at, with a note in it (a text file is the only way to have the panel make a folder).
	buildExtraFiles: () => [
		{
			relPath: `${SERVER_DIR}\\${WORLD_FOLDER}\\Put a world here.txt`,
			content:
				"To use a world made in the game, copy its .wld file into this folder, then put its full path on the world= line of serverconfig.txt. Stop the server first. A new world is made here when the file named on that line does not exist.\r\n",
		},
	],
	postWrite: async () => ({
		warnings: [
			"Terraria's Windows server needs Microsoft XNA Framework 4.0, so the panel put its DLLs beside TerrariaServer.exe (nothing was installed on this PC). If the server's window still closes straight away with an error about Microsoft.Xna.Framework, check that the Microsoft.Xna.Framework*.dll files are in the server's folder.",
			"The panel cannot save and stop this server cleanly. Terraria saves the world when `exit` is typed into the server's own console window, and the panel has no way to type into a console. Stop closes the window and ends the process after 15 seconds, so the world keeps only what the server saved before. The server also saves at dawn (about every 24 minutes), and items moved between chests can be lost if the window is closed without `exit`. Before you press Stop or restart, open the server's window (it is kept minimized on the taskbar), type exit and wait for the window to close.",
			`Terraria ${VERSION} was installed once and the panel does not update it later.`,
		],
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "terraria-vanilla",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p),
		sessionName: worldNameOf(p.sessionName),
		serverPassword: p.serverPassword,
		configPath: `${p.installDir}\\${SERVER_DIR}\\${CONFIG_FILE}`,
		configPaths: { [CONFIG_FILE]: `${p.installDir}\\${SERVER_DIR}\\${CONFIG_FILE}` },
		startScriptPath: `${p.installDir}\\${SERVER_DIR}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}\\${SERVER_DIR}`,
		// The program that stays running. It is the server itself (a console program, no child process).
		processName: EXE,
		// Kept on the taskbar rather than hidden, so the console can be reached to type `exit` (the panel cannot send it).
		windowMode: "minimized",
		installDir: `${p.installDir}\\`,
		autoUpdate: false,
	}),
};

export default {
	template,
	// The settings file and the worlds the panel's Worlds folder holds, and the ban list. The worlds folder is where the world line points
	// (see buildConfigFile); a world kept elsewhere by a changed worldpath is not in this backup.
	backup: {
		paths: [
			{ base: "working", rel: CONFIG_FILE, label: "Server settings" },
			{ base: "working", rel: WORLD_FOLDER, label: "Worlds" },
			{ base: "working", rel: "banlist.txt", label: "Ban list" },
		],
	},
	// The dossier names no log file or folder for the server; the panel keeps what the console prints (see notes).
	logs: [],
	launchOptions: true,
};

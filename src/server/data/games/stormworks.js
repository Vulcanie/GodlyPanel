// Stormworks: Build and Rescue (Stormworks developers). Dedicated server tool: Steam app 1247090 ("Stormworks Dedicated Server", Windows
// only, anonymous login per SteamAH); game: app 573090. The dossier resolved 1247090 through SteamCMD's app info on 2026-10-22.
//
// Facts from the research dossier (research/stormworks/00..04), whose sources are SteamAH's setup guide, XGamingServer's docs, LOW.MS's
// configuration page and the Pterodactyl egg. Nothing was run on a real install. In short:
//  - the program is server.exe, started from the install folder (SteamAH). The egg runs server64.exe under Wine instead, which the panel
//    does not use. Which of the two processes stays running is NOT FOUND, so the panel watches server.exe;
//  - the only documented launch argument is `+server_dir <folder>` (the egg's start command). The dossier gives no description of it and
//    does not say whether a native server.exe needs it. The panel writes it with the install folder, so the server looks in the same place
//    as its settings file would be; this is a guess from the egg and is the first thing to check on a real install;
//  - the server reads its game port from server_config.xml, not from the launch line, so the port the panel reserves (25560) only
//    matches the server when the file says the same. The panel does not write server_config.xml: the dossier's sources disagree on its
//    root element (attributes or child elements) and on where it is (%appdata%\Stormworks, the server root, or the egg's server_data),
//    and the format does not fit the panel's XML parser. The server makes the file on its first run (SteamAH); the user edits it by hand;
//  - ports: the game port is UDP. LOW.MS and SteamAH say the server uses three consecutive ports (game, +1, +2); the egg says two. The
//    panel keeps three. The game's own default is 25564, but 25564 to 25566 would collide with the Minecraft modpack's 25565 and 25566,
//    so the panel starts at 25560 instead;
//  - NO GRACEFUL STOP FROM THE PANEL. The egg stops the server with ^C (SIGINT); no page names a console command to save or quit. The
//    panel's Stop asks the window to close and force-kills the process after 15 s, which may lose progress since the last save.
// Not verified on a real install (see research/stormworks/05-implementation-notes.md).

const EXE = "server.exe";
const SERVER_DIR_FLAG = "+server_dir";
const GAME_PORT = 25560;

/** A text safe to put between the quotes of a .bat `start` title. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/**
 * The install folder as the value of +server_dir. It is the panel's own path, but a quote or a character cmd acts on would change the
 * line, so such a folder is refused instead of being altered.
 */
const serverDirOf = (installDir) => {
	const dir = String(installDir ?? "").replace(/\\+$/, "");
	if (!dir || /[\u0000-\u001f"%&|<>^!]/.test(dir)) {
		throw new Error("The server's folder has a character the start script cannot hold safely (a quote, %, &, |, <, >, ^ or !). Choose an install folder without those.");
	}
	return dir;
};

const template = {
	id: "stormworks",
	displayName: "Stormworks: Build and Rescue",
	type: "stormworks",
	// The dossier verifies no query or RCON protocol the panel speaks, so the panel watches the process.
	method: "process",
	updateAppId: "1247090",
	storeAppId: "573090",
	sharedInstall: false,
	// SteamCMD puts the server straight in the server's folder: server.exe is in its root.
	installLayoutRoot: "",
	description:
		"Stormworks: Build and Rescue's dedicated server, a Windows program. The panel installs it anonymously, which the setup guide says works, but the Pterodactyl host says anonymous install is no longer supported, so check the first install. The panel cannot save or stop the server cleanly: Stop closes its window and then ends the program. The server's name, password and port are set in server_config.xml, which you edit by hand.",
	fields: [],
	// The game port. The server's own UDP ports, the next two up, are kept free too (see the header). 25560 is clear of every other template.
	ports: [{ key: "port", label: "Game Port (UDP; the next two ports up are used too)", default: GAME_PORT }],
	// game+1 and game+2: the second and third consecutive ports LOW.MS and SteamAH name. The egg names only two, so game+2 is the less sure of the two.
	implicitPorts: [
		{ offset: 1, label: "its second game port" },
		{ offset: 2, label: "its third game port (the egg says the server uses only two)" },
	],
	buildStartScriptFilename: () => "Start_Stormworks.bat",
	// server.exe started from the install folder, with +server_dir set to that folder. The title is the server's name, cut to what cmd
	// accepts; the folder is refused when it holds a character cmd acts on.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Stormworks Server")}" ${EXE} ${SERVER_DIR_FLAG} "${serverDirOf(p.installDir)}"`,
			"",
		].join("\r\n"),
	postWrite: async (p) => ({
		warnings: [
			`The server reads its port from server_config.xml, not from the start script. Set the port in that file to ${Number(p?.port) || GAME_PORT} before you start the server, or the panel will watch a port the server does not use.`,
			"server_config.xml is made by the server the first time it runs, in the server's folder (one guide says %appdata%\\Stormworks instead). The panel does not write it. Set the server name and password there by hand.",
			"Stormworks has no console command the panel can send to save or quit. Stop closes the server's window and, after 15 seconds, ends the program, so progress since the last save can be lost. Do not update while a server runs.",
		],
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "stormworks",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// The program that stays running, per the dossier's sources (server.exe). Which process it is on a real install is NOT FOUND.
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "1247090",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The settings file the server makes in the install folder. The dossier names no save folder, so there is none to keep.
	backup: {
		paths: [{ base: "working", rel: "server_config.xml", label: "Server settings" }],
	},
	// The dossier names no log folder.
	logs: [],
	launchOptions: true,
};

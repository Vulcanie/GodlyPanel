// Colony Survival (Pipliz). Dedicated server: Steam app 748090 (anonymous login), game: app 366090 (not used for SteamCMD installs).
//
// Facts from the research dossier (docs/research/games/colonysurvival/01..04), whose sources are the Redswitches setup guide (RS), the
// Pterodactyl egg (PT), the Unraid template (UN), and a hosting provider's knowledge base (EH). The official Pipliz pages and the Fandom
// wiki were not readable. Checked on a real install (see 06-verification.md): the settings file is nested, with a NewOptions and a
// ServerSettings object, and the server stops at once on a flat file. In short:
//  - the program is colonyserver.exe, started in batch mode with its config file:
//      colonyserver.exe -batchmode -nographics +server.config "<path>\server.config.json"
//    (RS). It is taken to sit in the install folder root, as StarRupture's and Sven Co-op's do; that is not in the dossier.
//  - the settings live in one JSON file, server.config.json, which the game's own template copies to the server root (RS). The panel
//    writes that file itself, with the keys the guides name and no others. The dossier does not say whether the game creates the file,
//    or what it does with a key it does not know, so the file written here is the only source of truth the panel has.
//  - the game port is ServerGamePort (RS: default 27005; PT says 27004, UN says 27016). The panel uses 25936 instead, from its band.
//  - stopping: RS says the bundled client's RCON command `quit_server` and in-game quit are the clean ways. This module does not use RCON
//    (the protocol is not verified in the dossier), so the panel's Stop closes the window and, after 15 seconds, ends the program.
//  - mods: none managed. Mods are folders under gamedata/mods, enabled in the world's worldconfig.json; the server cannot download Workshop
//    mods itself (EH). The backup keeps the mods folder and the save folder.
// Checked on a real install: the file layout below, the program in the folder's root, and a clean stop (the panel's Stop is graceful).
// The game port is TCP; the server also answers LAN discovery on UDP 27101, which the panel does not move.

const EXE = "colonyserver.exe";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

const wholeNumber = (value, fallback, min, max) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

// The guides' own example value for MaxPlayerCount ("10 in the current template", RS).
const DEFAULT_PLAYERS = 10;
// Normal: the value the hosting provider's Server.bat page uses for "Initial Settings" (CIT). The dossier gives the list of levels only.
const DEFAULT_DIFFICULTY = 2;
const DEFAULT_WORLD = "ColonySurvival";
const DEFAULT_NAME = "Colony Survival Server";

/**
 * A value for a JSON string in server.config.json. JSON.stringify escapes quotes and backslashes; a line break is refused. The name and
 * password go only into the JSON file, never onto the .bat line.
 */
function jsonText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f]/.test(text)) throw new Error(`${what} cannot contain a line break. Use one line of text.`);
	return text;
}

const template = {
	id: "colonysurvival",
	displayName: "Colony Survival",
	type: "colonysurvival",
	// The panel watches the process. The RCON and quit_server route is in the dossier, but its protocol is not verified (see the header).
	method: "process",
	updateAppId: "748090",
	storeAppId: "366090",
	sharedInstall: false,
	// The dedicated server installs straight into the server's folder (RS: "Colony Survival Dedicated Server" from the Tools section).
	installLayoutRoot: "",
	description:
		"Colony Survival's dedicated server (Pipliz). It installs anonymously, with no Steam account. It is started in batch mode and reads its settings from server.config.json. The panel's Stop closes the server's window; the dossier names a clean quit command (quit_server) that needs RCON, which this module does not use, so stop every server before you update it, and back up the world first.",
	fields: ["sessionName", "serverPassword"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server list)", type: "text" },
		serverPassword: { label: "Join password (leave empty for an open server)", type: "password" },
	},
	// The game port. 27005 is the port RS names, which other templates here may use, so this starts at 25936 (25937 is held beside it).
	ports: [{ key: "port", label: "Game Port (the port players connect to)", default: 25936 }],
	resolveParams: async (raw) => {
		const name = jsonText(raw.sessionName, "The server name") || jsonText(raw.name, "The server name");
		const password = jsonText(raw.serverPassword, "The password");
		return { sessionName: name, serverPassword: password };
	},
	buildStartScriptFilename: () => "Start_ColonySurvival.bat",
	// The server reads its settings from the config file it is given, so the file's full path is on the command line. %~dp0 is the folder
	// the .bat is in (the full path with its trailing backslash), so the panel can tell this server's program from another.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Colony Survival Server")}" ${EXE} -batchmode -nographics +server.config "%~dp0server.config.json"`,
			"",
		].join("\r\n"),
	// The file the game reads. Only the keys the guides name are written. The game's own template (gamedata/help/hosting_docker/server.config.json)
	// is not in the panel's reach, so the file is written here in full.
	buildConfigFile: (p) => {
		const config = {
			NewOptions: { WorldName: DEFAULT_WORLD, DifficultyKey: String(DEFAULT_DIFFICULTY), DifficultyIsLocked: false, WorldType: 2 },
			ServerSettings: {
				ServerName: jsonText(p.sessionName, "The server name") || jsonText(p.name, "The server name") || DEFAULT_NAME,
				ServerPassword: jsonText(p.serverPassword, "The password"),
				ServerIP: "0.0.0.0",
				ServerGamePort: Number(p.port),
				UseVAC: false,
				MaxPlayerCount: DEFAULT_PLAYERS,
				NetworkType: "SteamOnline",
				ServerListPublicly: false,
				ServerListLAN: true,
				ServerListFriends: false,
				RCONPassword: "",
			},
		};
		return { relPath: "server.config.json", content: `${JSON.stringify(config, null, 2)}\r\n` };
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "colonysurvival",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		sessionName: jsonText(p.sessionName, "The server name") || p.name,
		serverPassword: p.serverPassword,
		configPath: `${p.installDir}\\server.config.json`,
		configPaths: { "server.config.json": `${p.installDir}\\server.config.json` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// The program that stays running. RS names it as the process a terminal run is ended by; it is the one the panel looks for.
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "748090",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The worlds (gamedata/savegames/<world>/), the mods the owner added by hand (gamedata/mods), the server's own settings file
	// (gamedata/settings/server.json: pause and time settings, per RS), and server.config.json itself.
	backup: {
		paths: [
			{ base: "working", rel: "server.config.json", label: "Server settings" },
			{ base: "working", rel: "gamedata/savegames", label: "Saved worlds" },
			{ base: "working", rel: "gamedata/mods", label: "Mods added by hand" },
			{ base: "working", rel: "gamedata/settings/server.json", label: "Server pause and time settings" },
		],
	},
	// The server writes one text log per start into gamedata/logs/server (seen on a real install).
	logs: [{ kind: "dir", base: "working", rel: "gamedata/logs/server", label: "Server log" }],
	launchOptions: false,
};

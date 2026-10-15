// Barotrauma (FakeFish / Undertow Games). Dedicated server tool: Steam app 1026340 ("Barotrauma Dedicated Server", free, anonymous
// login expected), game: app 602960 (the paid game, not needed on the server). Windows and Linux.
//
// Facts from the research dossier (research/barotrauma/01..04), whose sources are the game's own public source (FakeFishGames/Barotrauma
// on GitHub, the server's GameMain.cs, Program.cs, ServerSettings.cs, SaveUtil.cs, DebugConsole.cs), Steam's own app info for 1026340
// and the official wiki. Nothing was run on a real install. In short:
//  - the program is DedicatedServer.exe in the install folder (one .NET 8 process; it sets its own working folder to the folder it is in);
//  - it is started with `-name -port -queryport -public -maxplayers` and either `-password "<text>"` or `-nopassword`. Command-line values
//    override serversettings.xml, so the panel does not have to write that file;
//  - ports: one UDP game port (Lidgren) and one UDP query port. The query port is only opened when the server is public;
//  - THE PANEL WRITES NO serversettings.xml. Every setting of that file is an attribute on one <serversettings> root element, a shape
//    none of the panel's file readers handle, and the dossier has no minimal file that was checked on a real install. The server writes the
//    file itself on its first start (and rewrites it whenever an admin changes a setting in the game and again when it shuts down), so
//    the Settings tab offers the launch arguments only;
//  - NO GRACEFUL STOP FROM THE PANEL. The server takes its `exit` / `quit` / `close` command only from a real console's keyboard; it
//    ignores redirected input. The panel asks the window to close and force-kills after its grace time. What a closed window does
//    (whether the server then saves its settings) is not known. A campaign is saved when it is created and at the end of every round, so
//    a forced stop loses only the round in progress;
//  - saves are NOT in the install folder: they are in %LocalAppData%\Daedalic Entertainment GmbH\Barotrauma\Multiplayer of the Windows
//    user that runs the server (shared with every other Barotrauma server on the PC and with the game itself). The default backup
//    therefore keeps only the files in the install folder (see the backup list below);
//  - mods: the server loads the packages listed in config_player.xml from LocalMods\ or the Workshop folder and downloads nothing by
//    itself. The dossier's `mods` field (a list written into config_player.xml) is NOT built here: see 05-implementation-notes.md.
// Not verified on a real install (see research/barotrauma/05-implementation-notes.md): that `+login anonymous` installs app 1026340, that
// DedicatedServer.exe is the one process that stays running, what a closed window does, and that nothing needs a runtime installed first.

const EXE = "DedicatedServer.exe";

/** The game's own limits: a server name of at most 60 characters (NetConfig.ServerNameMaxLength; longer is cut by the game) and 1 to 16 players (NetConfig.MaxPlayers). */
const NAME_MAX = 60;
const PLAYERS_MIN = 1;
const PLAYERS_MAX = 16;
const PLAYERS_DEFAULT = 10;

// Characters cmd acts on inside a .bat, even between quotes (%, and ! when delayed expansion is on), or that end the quoted value (the
// quote, and a backslash which .NET reads as escaping the quote after it). A control character would break the line.
const UNSAFE = /[\u0000-\u001f"%&|<>^!\\]/;
const stripUnsafe = (value) => String(value ?? "").replace(/[\u0000-\u001f"%&|<>^!\\]/g, "");

/** A text safe to put between the quotes of a .bat `start` title or a launch argument: nothing cmd would act on. */
const batSafe = (value, fallback = "") =>
	stripUnsafe(value)
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** The server name as it goes on the launch line: at most 60 characters. */
const serverName = (p) => batSafe(p.sessionName || p.name, "Barotrauma Server").slice(0, NAME_MAX).trim();

/** The player limit: a whole number from 1 to 16, 10 when none is given (the game's own start-up default). */
const playerLimit = (value) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= PLAYERS_MIN ? Math.min(n, PLAYERS_MAX) : PLAYERS_DEFAULT;
};

/**
 * Refuses a server name or join password that cannot be put on the launch line safely, instead of quietly changing it. A quote, a percent
 * sign, & | < > ^ !, a backslash or a line break would change what cmd (or the game's argument reading) does with the line.
 */
export function launchText(value, what) {
	const text = String(value ?? "").trim();
	if (UNSAFE.test(text)) {
		throw new Error(`${what} has a character that cannot go safely on Barotrauma's launch line (a quote, a percent sign, & | < > ^ !, a backslash or a line break). Use letters, digits, spaces and plain punctuation without those.`);
	}
	return text;
}

const template = {
	id: "barotrauma",
	displayName: "Barotrauma",
	type: "barotrauma",
	// No RCON or REST exists. The query port answers Steam's server-list query only while the server is public (it is not opened
	// otherwise) and that was not tested, so the panel watches the process. That gives no player count.
	method: "process",
	updateAppId: "1026340",
	storeAppId: "602960",
	sharedInstall: false,
	// SteamCMD puts DedicatedServer.exe and Content\ straight in the server's folder.
	installLayoutRoot: "",
	// The Windows depots add up to about 220 MB installed (80 MB download).
	estimatedInstallBytes: 250_000_000,
	description:
		"Barotrauma's dedicated server. The panel cannot ask it to shut down properly: it only accepts its exit command typed into its own console window, so Stop closes the window and then ends the process. A campaign is saved when it is made and at the end of every round, so stopping in the middle of a round loses that round. Campaign saves are kept in the Windows user's profile (%LocalAppData%\\Daedalic Entertainment GmbH\\Barotrauma), not in the server's folder, and are shared with every other Barotrauma server on this PC and with the game itself.",
	// The password is on the launch line (the game also reads it from serversettings.xml, which the panel does not write).
	fields: ["sessionName", "serverPassword"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server list, 60 characters at most)", type: "text" },
		serverPassword: { label: "Server Password (leave empty for none; it is written on the launch line of the start script)", type: "text" },
	},
	// Both UDP. The game's own 27015 and 27016 are Core Keeper's and Sons of the Forest's defaults here, so this starts at 27215 (the
	// panel keeps the port after the game port free for every game).
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: 27215 },
		{ key: "queryPort", label: "Query Port (UDP; only open while the server is public)", default: 27217 },
	],
	// Rejects a name or password that cannot go on the launch line before the download starts, and hands the cleaned values on.
	// A name over 60 characters is not refused: the game cuts it to 60 itself (GameServer constructor), and so does the start script.
	resolveParams: async (raw) => ({
		sessionName: launchText(raw.sessionName, "The server name") || launchText(raw.name, "The server name"),
		serverPassword: launchText(raw.serverPassword, "The password"),
	}),
	buildStartScriptFilename: () => "Start_Barotrauma.bat",
	// The program is in the install folder and sets its own working folder, so no extra folder handling is needed. Everything but the
	// password and `-nopassword` is written explicitly because the game's defaults differ between its code and its file
	// (IsPublic false vs true, MaxPlayers 10 vs 8). -public False keeps a new server out of the public list until its owner chooses.
	// No argument has to be last, so the Launch options form may add any of them at the end of the line.
	buildStartScript: (p) => {
		const password = stripUnsafe(p.serverPassword).trim(); // as typed (a double space stays) minus what cmd acts on; resolveParams already refused such a password
		return [
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Barotrauma Server")}" ${EXE} -name "${serverName(p)}" -port ${Number(p.port)} -queryport ${Number(p.queryPort)} -public False -maxplayers ${playerLimit(p.maxPlayers)} ${password ? `-password "${password}"` : "-nopassword"}`,
			"",
		].join("\r\n");
	},
	postWrite: async () => ({
		warnings: [
			"Barotrauma's server cannot be stopped cleanly from the panel: it only takes its exit command typed into its own console window. Stop closes that window and then ends the process. The campaign is saved when it is created and at the end of each round, so stopping mid-round loses that round. Stop between rounds, or type exit in the server's console window yourself.",
			"The server writes its own serversettings.xml the first time it starts, and the Settings tab has no editor for it (open it in a text editor with the server stopped; the server rewrites it when it shuts down). The panel starts the server as not public, so it is not in the public server list until you start it with -public True (Launch options).",
		],
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "barotrauma",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		sessionName: p.sessionName,
		serverPassword: p.serverPassword,
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// The one process the dossier expects (a single .NET assembly, no launcher); the panel finds this server's process by where it
		// runs from, so a second DedicatedServer.exe elsewhere on the PC is not mistaken for it. Not observed running.
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "1026340",
		autoUpdate: false,
	}),
};

export default {
	template,
	// Only what is in the install folder. The campaign saves are in %LocalAppData%\Daedalic Entertainment GmbH\Barotrauma\Multiplayer,
	// outside the folders a backup entry can name with base "working" or "install", so they are NOT in this list (see the notes):
	// add that folder as a custom backup path of the server if it should be kept.
	// serversettings.xml and config_player.xml are written by the server itself (serversettings.xml again on every change and at exit),
	// Data\clientpermissions.xml is the admin/permission list, bannedplayers.txt the ban list, LocalMods the mods copied in by hand
	// (the server downloads none), and Data\Saves older saves from before the saves moved to the profile. Files that don't exist are skipped.
	backup: {
		paths: [
			{ base: "working", rel: "serversettings.xml", label: "Server settings" },
			{ base: "working", rel: "config_player.xml", label: "Mod list and game config" },
			{ base: "working", rel: "Data/clientpermissions.xml", label: "Player permissions" },
			{ base: "working", rel: "Data/permissionpresets_player.xml", label: "Custom permission presets" },
			{ base: "working", rel: "Data/bannedplayers.txt", label: "Ban list" },
			{ base: "working", rel: "LocalMods", label: "Mods added by hand" },
			{ base: "working", rel: "Data/Saves", label: "Older saves kept in the server's folder" },
		],
	},
	// ServerLogs is written at the end of every round and when the server shuts down properly (SaveServerLogs, on by default), so a
	// forced stop loses the log of the round in progress; servercrashreport.log is written after an unhandled error. The server prints everything else only in its console window.
	logs: [
		{ kind: "dir", base: "working", rel: "ServerLogs", label: "Server logs (saved at the end of each round and on a clean shutdown)" },
		{ kind: "file", base: "working", rel: "servercrashreport.log", label: "Crash report" },
	],
	launchOptions: true,
};

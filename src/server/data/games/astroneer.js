// Astroneer (System Era). Dedicated server app 728470 (anonymous SteamCMD login works).
//
// Facts from the research dossier (docs/research/games/astroneer/01..04), whose sources are the Pterodactyl egg
// (https://eggs.pterodactyl.io/egg/games-astroneer-dedicated-server), GameServerKings
// (https://www.gameserverkings.com/knowledge-base/astroneer/astroneer-dedicated-server/), xgamingserver and Nodecraft:
//  - the server program is Astro\Binaries\Win64\AstroServer-Win64-Shipping.exe; no command-line argument is documented anywhere,
//    so the start script runs it bare. Everything is set in two files in Astro\Saved\Config\WindowsServer\:
//    AstroServerSettings.ini (name, passwords, owner, public IP, save intervals) and Engine.ini ([URL] Port=);
//  - the server does not start when PublicIP, OwnerName or OwnerGuid is empty, so the panel asks for them when it creates the server;
//  - the game makes both files itself on a first run, but they can be written before it (the Pterodactyl egg does that), which is
//    what the panel does so the very first start has the right port and owner;
//  - no query protocol, no RCON the panel could speak and no graceful stop are documented: the panel closes the window and
//    force-kills after its grace time (see 05-implementation-notes.md: a Stop may lose the world since the last auto-save).
// Not verified on a real install (see 05-implementation-notes.md): which of the launcher and the Shipping exe stays running, the
// port's protocol, whether a pre-written Engine.ini survives the first start, and the player-limit key name.

const EXE = "AstroServer-Win64-Shipping.exe";
const EXE_REL = `Astro\\Binaries\\Win64\\${EXE}`;
const CONFIG_DIR = "Astro\\Saved\\Config\\WindowsServer";
const SETTINGS_REL = `${CONFIG_DIR}\\AstroServerSettings.ini`;
const ENGINE_REL = `${CONFIG_DIR}\\Engine.ini`;
export const SETTINGS_SECTION = "/Script/Astro.AstroServerSettings";

/** The window title in `start /MIN "<title>"`: a server's name is typed by a person, and cmd acts on these characters. */
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").trim() || "Astroneer";

/** A value for a line of an ini file: one line, no control characters, no surrounding spaces. */
const iniValue = (value) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();

/** The name in the server browser: the Pterodactyl egg allows 60 characters at most (required, so never empty). */
export function serverName(value, fallback = "Astroneer Server") {
	const text = iniValue(value).replace(/\s+/g, " ").slice(0, 60).trim();
	return text || fallback || "Astroneer Server";
}

/** The join password: the egg's rule is letters, numbers, dashes and underscores, 1 to 100 characters; blank is an open server. */
export function joinPassword(value) {
	return String(value ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 100);
}

/** The owner's Steam name, exactly as other players see it. Quotes are dropped because the PlayerProperties entry quotes it. */
export function ownerName(value) {
	return iniValue(value).replace(/["]/g, "").slice(0, 100).trim();
}

/** The owner's SteamID64: 17 digits. Blank or anything else is 0, which the game documents as "assign it when the owner joins". */
export function ownerGuid(value) {
	const text = String(value ?? "").trim();
	return /^\d{17}$/.test(text) ? text : "0";
}

/** The address players join with, without a port ("203.0.113.5:8787" -> "203.0.113.5"). */
export function publicIp(value) {
	const text = iniValue(value).replace(/\s+/g, "");
	const withPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(text);
	return (withPort ? withPort[1] : text).replace(/[^A-Za-z0-9.:_-]/g, "").slice(0, 253);
}

const template = {
	id: "astroneer",
	displayName: "Astroneer",
	type: "astroneer",
	// No query port and no RCON the panel can use: it watches the process and stops it by closing its window.
	method: "process",
	updateAppId: "728470",
	sharedInstall: false,
	installLayoutRoot: "",
	// The server will not start with PublicIP, OwnerName or OwnerGuid empty (GameServerKings, the Pterodactyl egg).
	fields: ["sessionName", "serverPassword", "ownerName", "ownerGuid", "publicIp"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser, 60 characters at most)", type: "text" },
		serverPassword: { label: "Server Password (letters, numbers, - and _ only; empty = anyone can join)", type: "text" },
		ownerName: { label: "Owner's Steam name (required; spelled exactly as other players see it)", type: "text" },
		ownerGuid: { label: "Owner's SteamID64 (17 digits; empty or 0 = filled in when the owner first joins)", type: "text" },
		publicIp: { label: "Public IP address (required; the address players join with, without a port)", type: "text" },
	},
	// 8777 is Soulmask's, 27000 is Avorion's and the game's own other documented defaults are taken too (the Pterodactyl egg says 27000,
	// the other guides 8777), so this server starts at 8787. The port after it is kept free by the panel. The game's remote console
	// port (TCP 1234 in xgamingserver's table) is not written by the panel, so it is not listed.
	ports: [{ key: "port", label: "Game Port (UDP)", default: 8787 }],
	buildStartScriptFilename: () => "Start_Astroneer.bat",
	// No argument is documented, so the program is started bare, from the install folder (the Pterodactyl egg does the same).
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${windowTitle(p.name)}" "${EXE_REL}"`,
			"",
		].join("\r\n"),
	// AstroServerSettings.ini: the 20 keys of Nodecraft's listing of the file the game makes itself, in that order, with this
	// server's details filled in and the other values as listed there. PlayerProperties is not in that file; it is the owner entry
	// the Pterodactyl egg writes on every start so the owner is the server's admin, and only written for a real SteamID64.
	buildConfigFile: (p) => {
		const guid = ownerGuid(p.ownerGuid);
		const owner = ownerName(p.ownerName);
		const lines = [
			`[${SETTINGS_SECTION}]`,
			"bLoadAutoSave=true",
			"MaxServerFramerate=30",
			"MaxServerIdleFramerate=3.000000",
			"bWaitForPlayersBeforeShutdown=false",
			"ConsolePassword=",
			`PublicIP=${publicIp(p.publicIp)}`,
			`ServerName=${serverName(p.sessionName, serverName(p.name))}`,
			"ServerGuid=",
			`OwnerName=${owner}`,
			`OwnerGuid=${guid}`,
			"PlayerActivityTimeout=0",
			`ServerPassword=${joinPassword(p.serverPassword)}`,
			"bDisableServerTravel=false",
			"DenyUnlistedPlayers=false",
			"VerbosePlayerProperties=false",
			"AutoSaveGameInterval=900",
			"BackupSaveGamesInterval=7200",
			"ActiveSaveFileDescriptiveName=SAVE_1",
			"ShareCode=",
			"ServerAdvertisedName=",
		];
		if (guid !== "0" && owner) lines.push(`PlayerProperties=(PlayerFirstJoinName="${owner}",PlayerCategory=Admin,PlayerGuid="${guid}",PlayerRecentJoinName="")`);
		lines.push("");
		return { relPath: SETTINGS_REL, content: lines.join("\r\n") };
	},
	// Engine.ini holds the game port, [URL] Port= (Steam thread, xgamingserver, GameServerKings, the egg). net.AllowEncryption is not
	// written: on Windows "encryption works", and only the Linux/Proton servers force it off (GameServerKings).
	buildExtraFiles: (p) => [{ relPath: ENGINE_REL, content: ["[URL]", `Port=${Number(p.port)}`, ""].join("\r\n") }],
	buildServerEntry: (p) => ({
		name: p.name,
		type: "astroneer",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		sessionName: serverName(p.sessionName, serverName(p.name)),
		configPath: `${p.installDir}\\${SETTINGS_REL}`,
		configPaths: {
			"AstroServerSettings.ini": `${p.installDir}\\${SETTINGS_REL}`,
			"Engine.ini": `${p.installDir}\\${ENGINE_REL}`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "728470",
		autoUpdate: false,
	}),
};

export default {
	template,
	// Worlds are .savegame files in Astro/Saved/SaveGames (GameServerKings); the two config files are in Saved/Config/WindowsServer.
	backup: {
		paths: [
			{ base: "working", rel: "Astro/Saved/SaveGames", label: "Saved worlds" },
			{ base: "working", rel: "Astro/Saved/Config/WindowsServer", label: "Server settings" },
		],
	},
	// No log file or folder is named by any page of the dossier (the one report of logs says there are none), so the Logs tab is not given one.
	logs: [],
	// The program takes no documented command-line argument, so there is no launch form.
	launchOptions: false,
};

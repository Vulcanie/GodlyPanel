// VEIN (Ramjet Studios). Dedicated server app 2131400 (store app 1857950), installed anonymously with SteamCMD into the install
// folder itself (no steamapps\common nesting).
//
// Facts from the research dossier (research/vein/01..04 and its raw page copies). The sources are Ramjet's own Notion pages
// (Initial Setup, Config, Troubleshooting), the official wiki https://vein.wiki.gg/wiki/Vein_Dedicated_Server_Setup, and community
// hosts (GameServerKings, XGamingServer, Citadel, the WindowsGSH module). Where they disagree the choice made here is written out
// below, and every such choice is listed in research/vein/05-implementation-notes.md under "needs real-install verification".
//
// - Program: the wiki's start command is Vein\Binaries\Win64\VeinServer-Win64-Test.exe -log -port=7777 ..., run from that folder.
//   Ramjet and the WindowsGSH module name a root launcher, VeinServer.exe, whose child is that same VeinServer-Win64-Test.exe. No
//   page says which of the two stays running, so the script starts the wiki's program directly (one process, which the panel
//   tracks and asks to close) and processName is that one. NOT verified on a real install.
// - Ports: game UDP, query UDP; both flags are documented (-Port=, -QueryPort=, with the =). The query port's default is a source
//   conflict (7778 = game + 2 on the wiki and WindowsGSH, 27015 on Ramjet and the hosts), which does not matter here because the
//   panel always passes -QueryPort=. The wiki's "TCP 7777 RCON" is not used: a host's page says the RCON port binding was removed in
//   0.019 Hotfix 2, and nothing documents an RCON password or protocol.
// - Name, join password and player limit are not launch arguments (the wiki's "optional arguments" section says "Pending further
//   testing"); Ramjet's Config page puts them in Game.ini, [/Script/Vein.VeinGameSession] ServerName / Password and
//   [/Script/Engine.GameSession] MaxPlayers. The panel writes that file before the first start (the page says to create it if it is
//   missing). Unreal removes lines that merely repeat a default, so lines may vanish later; that is not a fault.
// - Admins are SteamID64s in Game.ini (AdminSteamIDs / SuperAdminSteamIDs). There is no admin password, so the create form asks for
//   none, and the panel writes no admin line: the person adds their own on the Settings tab or in the file.
// - Gameplay rules are console variables (vein.*) in Engine.ini under [ConsoleVariables]. The panel seeds that file with only the
//   header (no value is written, so no default of the community lists can override the game's own).
// - No mods field: there is no Steam Workshop and no official server mod support.

const SHIPPING_EXE = "VeinServer-Win64-Test.exe";
const WIN64 = "Vein\\Binaries\\Win64";
const CONFIG_DIR = "Vein\\Saved\\Config\\WindowsServer";
const GAME_INI = `${CONFIG_DIR}\\Game.ini`;
const ENGINE_INI = `${CONFIG_DIR}\\Engine.ini`;

// The window title in `start /MIN "<title>"`. A server's name is typed by a person, and cmd acts on these characters.
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").trim() || "VEIN";

/** A value for a line of an .ini file: one line, no surrounding spaces. */
const iniValue = (value) => String(value ?? "").replace(/[\u0000-\u001f]/g, "").trim();

/** The server's name for Game.ini: one line, at most the 64 characters the browser takes (a host's panel limit), never empty. */
export function serverName(value, fallback = "Vein Server") {
	return iniValue(value).replace(/\s+/g, " ").slice(0, 64).trim() || fallback;
}

// 16 is the figure Ramjet's Config page uses as the default; the wiki's example is 64 and one host reports about 32 as a practical limit.
const slots = (value) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= 1 ? n : 16;
};

const template = {
	id: "vein",
	displayName: "VEIN",
	type: "vein",
	// The only documented remote access is a removed RCON port and an unauthenticated HTTP API the dossier cannot place in a
	// section, so the server is watched as a plain process.
	method: "process",
	updateAppId: "2131400",
	storeAppId: "1857950",
	sharedInstall: false,
	// SteamCMD puts VeinServer.exe and the Vein and Engine folders directly in the install folder.
	installLayoutRoot: "",
	// A name and a join password. Admins are listed by Steam ID in Game.ini; there is no RCON and no mods.
	fields: ["sessionName", "serverPassword"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser, 64 characters at most)", type: "text" },
		serverPassword: { label: "Join Password (case-sensitive; leave empty for an open server)", type: "text" },
	},
	// Both UDP. The game's own defaults (7777, and 7778 or 27015) clash with other templates here (Valheim, Satisfactory, Core
	// Keeper), so these are free ones. The query port is the game port + 2, the wiki's rule, which also keeps the port after the
	// game port free as the panel does for every game, and sits outside 27020 to 27050, which the wiki says Steam uses.
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: 8960 },
		{ key: "queryPort", label: "Query Port (UDP)", default: 8962 },
	],
	buildStartScriptFilename: () => "Start_Vein.bat",
	// Run from the program's own folder, as the wiki says. -log gives the server a console window the panel can ask to close.
	// Written -Port= and -QueryPort= (with the =), the spelling the hosting page stresses. Name, password and player limit are in
	// Game.ini, not on this line.
	buildStartScript: (p) =>
		[
			"@echo off",
			`cd /d "%~dp0${WIN64}"`,
			`start /MIN "${windowTitle(p.name)}" ${SHIPPING_EXE} -log -Port=${Number(p.port)} -QueryPort=${Number(p.queryPort)}`,
			"",
		].join("\r\n"),
	// Ramjet's Config page, Game.ini: only the three lines the create form has an answer for.
	buildConfigFile: (p) => ({
		relPath: GAME_INI,
		content: [
			"[/Script/Engine.GameSession]",
			`MaxPlayers=${slots(p.maxPlayers)}`,
			"",
			"[/Script/Vein.VeinGameSession]",
			`ServerName=${serverName(p.sessionName || p.name)}`,
			`Password=${iniValue(p.serverPassword)}`,
			"",
		].join("\r\n"),
	}),
	// Engine.ini (gameplay console variables) is created with its header only. Ramjet says to create it if it is missing; the
	// vein.* names and defaults come from community lists that disagree in places, so none is written here.
	buildExtraFiles: () => [
		{
			relPath: ENGINE_INI,
			content: ["[ConsoleVariables]", ""].join("\r\n"),
		},
	],
	buildServerEntry: (p) => ({
		name: p.name,
		type: "vein",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		sessionName: serverName(p.sessionName || p.name),
		serverPassword: p.serverPassword,
		configPath: `${p.installDir}\\${GAME_INI}`,
		configPaths: {
			"Game.ini": `${p.installDir}\\${GAME_INI}`,
			"Engine.ini": `${p.installDir}\\${ENGINE_INI}`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: SHIPPING_EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "2131400",
		autoUpdate: false,
	}),
};

export default {
	template,
	// Settings, logs and saves are all below Vein\Saved (the WindowsGSH module backs up the whole folder; the wiki's own "Backing Up
	// Server Data" section says "To be determined"). One page warns saves may be under %LOCALAPPDATA%\Vein on some builds after a
	// March 2026 migration; that folder is not backed up here, see the implementation notes.
	backup: {
		paths: [{ base: "working", rel: "Vein/Saved", label: "Saved worlds and settings", exclude: ["Logs", "Crashes"] }],
	},
	logs: [{ kind: "dir", base: "working", rel: "Vein/Saved/Logs", label: "Game log" }],
	launchOptions: true,
};

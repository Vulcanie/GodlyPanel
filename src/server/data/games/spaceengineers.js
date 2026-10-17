// Space Engineers (Keen Software House). Dedicated server tool: Steam app 298740 (anonymous login works), game: app 244850. Windows only.
//
// Behaviour below was checked on a real install (build 01_210_014) through the panel; the evidence is in
// research/spaceengineers/06-verification.md. The sources before that were Keen's server page, the community-run Space Engineers wiki
// and Keen's published source (2022).
//
// - The program is DedicatedServer64\SpaceEngineersDedicated.exe, one process (plus its console host). It must be started with
//   -console (or -noconsole): without either, it opens a setup window and never starts a server by itself. Its manifest asks for no
//   elevation (asInvoker), so no RunAsInvoker line is needed (SCUM's is).
// - The data folder (config, worlds, logs) is pinned with -path to Data\ inside the install folder.
// - FIRST START WITH AN EMPTY Data FOLDER: the game writes no config and makes no world. It logs "Cannot start new world - Premade
//   world not found", says the session cannot start, and then the process sits idle (no ports, no players) until it is closed. So the
//   panel writes Data\SpaceEngineers-Dedicated.cfg itself. With a PremadeCheckpointPath that points at one of the worlds the install
//   ships in Content\CustomWorlds, the first start copies that world into Data\Saves\<WorldName> and logs "Game ready...". That is
//   the whole recipe: the panel copies no world file. Later starts resume the world last played (Saves\LastSession.sbl), so the
//   premade path and WorldName only matter once.
// - The cfg's SessionSettings (OnlineMode, MaxPlayers, ...) are applied when the world is made; after that the world's own
//   Saves\<world>\Sandbox_config.sbc holds them and wins. ServerName is read at every start. OnlineMode is OFFLINE when it is not
//   written, so the cfg says PUBLIC.
// - -port on the line replaces ServerPort (the game bound the UDP port from the line). The game also answers Steam A2S queries on
//   that same port. SteamPort is not bound, so it is left out.
// - STOP DOES NOT SAVE. The panel stops the program with a plain close request (taskkill without /F) and the game ignores it (its
//   console belongs to another process, so it has no window to close); the panel waits 15 s and force-kills, and the game never
//   logs a shutdown or a save. Only the autosave (AutoSaveInMinutes, 5 by default) and the save at world creation exist, so a Stop
//   can lose up to the last 5 minutes. A force-killed world loaded fine on the next start.
// - The Torch wrapper (a third-party program that runs the game in its own process, Torch.Server.exe) is out of scope for v1.
// - No join password (it is stored as a hash by an undocumented method) and no RCON (none exists). Mods are a list in the config file
//   and the world's Sandbox_config.sbc, so no mods field is offered.

const EXE = "SpaceEngineersDedicated.exe";
const EXE_DIR = "DedicatedServer64";
const DATA = "Data";
const CFG_REL = `${DATA}\\SpaceEngineers-Dedicated.cfg`;
// A world the install ships (Content\CustomWorlds\<name>), relative to DedicatedServer64, where the start script runs the game from.
// Both "Star System" (a star with planets and moons, about 1.6 GB of memory once running) and "Empty World" (space only, about
// 0.6 GB) started a server with the settings from the cfg.
const PREMADE_WORLD = "..\\Content\\CustomWorlds\\Star System";
const DEFAULT_PLAYERS = 8;

// The window title in `start /MIN "<title>"`. A server's name is typed by a person, and cmd acts on these characters.
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").trim() || "Space Engineers";

// The name the server list shows: one line, no control characters. The 100-character cap is the panel's own.
export const serverName = (value, fallback = "") => {
	const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 100).trim();
	return text || fallback;
};

// The world's folder under Data\Saves is named from it: no character Windows forbids in a folder name, no trailing dot or space, and
// not a name Windows reserves.
export const worldFolderName = (value) => {
	let text = String(value ?? "").replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, "").replace(/\s+/g, " ").trim().slice(0, 60).replace(/[. ]+$/, "");
	if (!text) return "Space Engineers World";
	if (/^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(text)) text += " World";
	return text;
};

const xmlText = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The game's player window accepts 2 to 64 players; blank means the panel's default.
const playerLimit = (value) => {
	const n = Math.floor(Number(value));
	return Number.isFinite(n) && n >= 1 ? Math.max(2, Math.min(64, n)) : DEFAULT_PLAYERS;
};

const template = {
	id: "spaceengineers",
	displayName: "Space Engineers",
	type: "spaceengineers",
	method: "process",
	updateAppId: "298740",
	storeAppId: "244850",
	sharedInstall: false,
	// SteamCMD puts DedicatedServer64, Content and the rest directly in the install folder.
	installLayoutRoot: "",
	// The create form's server name is the ServerName in the config file and names the world.
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server list; it also names the world, made the first time the server starts)", type: "text" },
	},
	// The game's own default is UDP 27016, which Sons of the Forest already uses here (its query port). 27117 (the port after this
	// one) is not used by any game here. The game also answers Steam queries on this port; its SteamPort is not bound.
	ports: [{ key: "port", label: "Game Port (UDP)", default: 27116 }],
	buildStartScriptFilename: () => "Start_SpaceEngineers.bat",
	// Runs from the program's own folder, as starting it by hand does. -path is the full path of the data folder (%~dp0 ends in a
	// backslash). The player limit is in the config file, not on this line.
	buildStartScript: (p) =>
		[
			"@echo off",
			`cd /d "%~dp0${EXE_DIR}"`,
			`start /MIN "${windowTitle(p.name)}" ${EXE} -console -path "%~dp0${DATA}" -port ${Number(p.port)}`,
			"",
		].join("\r\n"),
	// The first config. Writing it also makes the Data folder, which has to exist before the game starts (it quits at once, without a
	// message, when -path is missing). Only what a real start showed to be needed: the name, the world's name, the premade world to
	// copy on the first start, and PUBLIC (the game's own default is OFFLINE) with a player limit. The remote API (a key-protected web
	// interface) is switched off. The ports are on the launch line.
	buildConfigFile: (p) => {
		const name = serverName(p.sessionName, serverName(p.name, "Space Engineers"));
		return {
			relPath: CFG_REL,
			content: [
				'<?xml version="1.0"?>',
				'<MyConfigDedicated xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
				"  <SessionSettings>",
				"    <OnlineMode>PUBLIC</OnlineMode>",
				`    <MaxPlayers>${playerLimit(p.maxPlayers)}</MaxPlayers>`,
				"  </SessionSettings>",
				`  <ServerName>${xmlText(name)}</ServerName>`,
				`  <WorldName>${xmlText(worldFolderName(name))}</WorldName>`,
				`  <PremadeCheckpointPath>${PREMADE_WORLD}</PremadeCheckpointPath>`,
				"  <RemoteApiEnabled>false</RemoteApiEnabled>",
				"</MyConfigDedicated>",
				"",
			].join("\r\n"),
		};
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "spaceengineers",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		sessionName: serverName(p.sessionName, serverName(p.name)),
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "298740",
		autoUpdate: false,
	}),
};

export default {
	template,
	// Worlds are Data\Saves\<world>\ (Sandbox.sbc, Sandbox_config.sbc, the sector file, the game's own Backup folder). The config file
	// is next to Saves.
	backup: {
		paths: [
			{ base: "working", rel: "Data/Saves", label: "Saved worlds" },
			{ base: "working", rel: "Data/SpaceEngineers-Dedicated.cfg", label: "Server config" },
		],
	},
	// The game writes SpaceEngineersDedicated_<date>_<time>.log in the data folder (one per start) and Steam's workshop log in the
	// program's folder. Folders that do not exist are skipped, and only .log and .txt files are offered.
	logs: [
		{ kind: "dir", base: "working", rel: "Data", label: "Game log" },
		{ kind: "dir", base: "working", rel: "DedicatedServer64/logs", label: "Steam and Workshop logs" },
	],
	launchOptions: true,
};

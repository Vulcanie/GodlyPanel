// Space Engineers (Keen Software House). Dedicated server tool: Steam app 298740 (anonymous login works), game: app 244850. Windows only.
//
// Built from the research dossier (research/spaceengineers/01..04), whose sources are Keen's server page, the community-run Space
// Engineers wiki, and Keen's published source (2022). Nothing here has been run on a real install; the points that must be checked
// are listed in research/spaceengineers/05-implementation-notes.md.
//
// - The program is DedicatedServer64\SpaceEngineersDedicated.exe, one process. It must be started with -console (or -noconsole):
//   without either, it opens a setup window and never starts a server by itself. -console also gives it a console window, which is
//   what the panel closes to stop it (Keen's source saves and exits when that window is closed or the process is asked to close).
// - The data folder (config, worlds, mods, logs) is pinned with -path to Data\ inside the install folder. The game exits at once,
//   without a message, when that folder does not exist, so the panel creates it (a short note file is written into it).
// - THE PANEL WRITES NO SpaceEngineers-Dedicated.cfg AND NO WORLD. The dossier has no minimal config that was verified to produce a
//   running server: Keen's 2022 source starts a brand-new world only from a "premade" world folder named in the config, and whether
//   the current game still needs that, or makes a random world by itself (as one hosting guide says), was not established. The file
//   is XML in a shape none of the panel's file readers handle (plain child elements, no <property name= value=>), so there is no
//   Settings-tab form for it either: the Settings tab offers the launch arguments only. The server name, the Steam port, admins,
//   the password and the world are set in the game's own config file and world, by hand or with the game's setup window.
// - -port is passed on the line (the dossier documents it as overriding the config). The Steam port (the game's SteamPort, 8766 by
//   default) has no argument: it is only in the config file, so it is not a panel port.
// - The Torch wrapper (a third-party program that runs the game in its own process, Torch.Server.exe) is out of scope for v1.
// - No fields: no join password (it is stored as a hash by an undocumented method), no session name (it is a config file setting),
//   no RCON (none exists). Mods are a list in the config file and the world's Sandbox_config.sbc, so no mods field is offered.

const EXE = "SpaceEngineersDedicated.exe";
const EXE_DIR = "DedicatedServer64";
const DATA = "Data";

// The window title in `start /MIN "<title>"`. A server's name is typed by a person, and cmd acts on these characters.
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").trim() || "Space Engineers";

// The Dedicated Server window of the game accepts 2 to 64 players. Nothing is passed when none is asked for, so the world's own
// limit applies.
const playerLimit = (value) => {
	const n = Math.floor(Number(value));
	return Number.isFinite(n) && n >= 1 ? Math.max(2, Math.min(64, n)) : null;
};

const ABOUT = [
	"This is the data folder of this Space Engineers server (the start script gives it to the game with -path).",
	"",
	"Put the server's config here, as SpaceEngineers-Dedicated.cfg, and its worlds in the Saves folder, one folder per world",
	"(each with a Sandbox.sbc and a Sandbox_config.sbc). The game writes its logs and keeps its backups of worlds here too.",
	"",
	"The panel does not write the config file or a world. LoadWorld in the config has to be the full path of a world folder,",
	"for example C:\\Servers\\space\\Data\\Saves\\MyWorld. Stop the server before changing any of these files.",
	"",
].join("\r\n");

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
	fields: [],
	// The game's own default is UDP 27016, which Sons of the Forest already uses here (its query port), and the Steam port's default
	// 8766 is that game's game port. 27117 (the port after this one) is not used by any game here.
	ports: [{ key: "port", label: "Game Port (UDP)", default: 27116 }],
	buildStartScriptFilename: () => "Start_SpaceEngineers.bat",
	// Runs from the program's own folder, as starting it by hand does. -path is the full path of the data folder (%~dp0 ends in a
	// backslash); -maxPlayers is only passed when the create form asked for a number.
	buildStartScript: (p) => {
		const limit = playerLimit(p.maxPlayers);
		return [
			"@echo off",
			`cd /d "%~dp0${EXE_DIR}"`,
			`start /MIN "${windowTitle(p.name)}" ${EXE} -console -path "%~dp0${DATA}" -port ${Number(p.port)}${limit ? ` -maxPlayers ${limit}` : ""}`,
			"",
		].join("\r\n");
	},
	// Makes the data folder, which has to exist before the game starts.
	buildExtraFiles: () => [{ relPath: `${DATA}\\ABOUT-THIS-FOLDER.md`, content: ABOUT }],
	buildServerEntry: (p) => ({
		name: p.name,
		type: "spaceengineers",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
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
	// Worlds are Data\Saves\<world>\ (Sandbox.sbc, Sandbox_config.sbc, the sector file, the game's own Backup and Storage folders).
	// The config file, with the admin and ban lists and the Steam port, is next to Saves.
	backup: {
		paths: [
			{ base: "working", rel: "Data/Saves", label: "Saved worlds" },
			{ base: "working", rel: "Data/SpaceEngineers-Dedicated.cfg", label: "Server config" },
		],
	},
	// The game writes its log in the data folder (the dossier says so without naming the file) and the Workshop download log in the
	// program's folder. Folders that do not exist are skipped, and only .log and .txt files are offered.
	logs: [
		{ kind: "dir", base: "working", rel: "Data", label: "Game log" },
		{ kind: "dir", base: "working", rel: "DedicatedServer64/logs", label: "Workshop log" },
	],
	launchOptions: true,
};

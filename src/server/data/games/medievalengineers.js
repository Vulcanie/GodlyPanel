// Medieval Engineers (Keen Software House). Dedicated server tool: Steam app 367970 (anonymous login per the game's SteamCMD script),
// game: app 333950. Windows only. Built from the research dossier (docs/research/games/medievalengineers/); see
// 05-implementation-notes.md there for what is unverified.
//
// - Checked on a real install (06-verification.md). The program is DedicatedServer64\MedievalEngineersDedicated.exe. The arguments need
//   dashes: `-console -path "<folder>"`. The bare `console path` the official page lists leaves a process that never starts the game.
//   Without -console it opens its setup dialogs and waits. With them it creates the world in Data\Saves, logs to
//   Data\MedievalEngineersDedicated.log and answers A2S on the game port (max players 4 by default).
// - `-path` points the game's config and saves at the Data folder inside the install folder.
// - The config file is XML with the root MyConfigDedicated. The dossier gives the file name and the root element, and a sample with
//   the key names; the element form is taken from that sample. The panel writes the first file with the name, the world name, the
//   port, the scenario from the sample and the remote API switched off. Whether the game writes its own file first is not known.
// - Stop: the dossier says `taskkill /IM` (no /F) saves the world and `/F` does not. The panel's Stop asks the window to close (the
//   same kind of request as taskkill without /F) and ends the program after 15 seconds. Whether that saves is not checked.
// - Mods: three conflicting places in the sources, so no mods field is offered.

const EXE = "MedievalEngineersDedicated.exe";
const EXE_DIR = "DedicatedServer64";
const DATA = "Data";
const CFG_NAME = "MedievalEngineers-Dedicated.cfg";
const CFG_REL = `${DATA}\\${CFG_NAME}`;
// The game's default listen port (dossier: UDP 27016) is held by Sons of the Forest's query port here, so this starts at 27680.
const DEFAULT_PORT = 27680;
const DEFAULT_NAME = "Medieval Engineers Server";

// The window title in `start /MIN "<title>"`. The name is typed by a person, and cmd acts on these characters.
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim() || "Medieval Engineers";

// The name shown in the server list and the world's name: one line, no control characters, at most 100 characters.
const nameText = (value, what = "The server name") => {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f]/.test(text)) throw new Error(`${what} cannot contain a line break. Use one line of text.`);
	return text.slice(0, 100).trim();
};

const xmlText = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const template = {
	id: "medievalengineers",
	displayName: "Medieval Engineers",
	type: "medievalengineers",
	method: "process",
	updateAppId: "367970",
	storeAppId: "333950",
	sharedInstall: false,
	// SteamCMD puts DedicatedServer64 directly in the install folder.
	installLayoutRoot: "",
	description:
		"Medieval Engineers' dedicated server (DedicatedServer64\\MedievalEngineersDedicated.exe), installed from Steam app 367970. The panel starts it in console mode with its data folder in the server's Data folder, and writes its first config file with the name and the port. The game's own world rules and mods are not offered in the panel. Stop closes the window and, if the game does not exit within 15 seconds, ends it, so back up before you stop or update.",
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server list; also names the world)", type: "text" },
	},
	ports: [{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT }],
	resolveParams: async (raw) => ({ sessionName: nameText(raw.sessionName) || nameText(raw.name) }),
	buildStartScriptFilename: () => "Start_MedievalEngineers.bat",
	buildStartScript: (p) =>
		[
			"@echo off",
			`cd /d "%~dp0${EXE_DIR}"`,
			`start /MIN "${windowTitle(p.name)}" ${EXE} -console -path "%~dp0${DATA}"`,
			"",
		].join("\r\n"),
	// The first config. The Data folder is made when the file is written, before the game starts.
	buildConfigFile: (p) => {
		const name = nameText(p.sessionName) || nameText(p.name, "The server name") || DEFAULT_NAME;
		return {
			relPath: CFG_REL,
			content: [
				'<?xml version="1.0"?>',
				'<MyConfigDedicated xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
				"  <IP>0.0.0.0</IP>",
				`  <ServerPort>${Number(p.port) || DEFAULT_PORT}</ServerPort>`,
				`  <ServerName>${xmlText(name)}</ServerName>`,
				`  <WorldName>${xmlText(name)}</WorldName>`,
				'  <Scenario Type="ScenarioDefinition" Subtype="SafeAreaStart" />',
				"  <RemoteApiEnabled>false</RemoteApiEnabled>",
				"</MyConfigDedicated>",
				"",
			].join("\r\n"),
		};
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "medievalengineers",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		sessionName: nameText(p.sessionName) || nameText(p.name) || DEFAULT_NAME,
		configPath: `${p.installDir}\\${CFG_REL}`,
		configPaths: { [CFG_NAME]: `${p.installDir}\\${CFG_REL}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "367970",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The Data folder holds the config file and the worlds the game saves there (the dossier does not say which files).
	backup: {
		paths: [{ base: "working", rel: DATA, label: "Server config and saved worlds" }],
	},
	// The game writes its log in the path folder (checked on a real install).
	logs: [{ kind: "file", base: "working", rel: `${DATA}/MedievalEngineersDedicated.log`, label: "Server log" }],
	// The start line has managed -console -path arguments only, so the Launch options form can't read it.
	launchOptions: false,
};

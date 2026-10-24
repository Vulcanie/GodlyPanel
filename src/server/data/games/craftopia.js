// Craftopia (Pocket Pair). Dedicated server: Steam app 1670340 (anonymous login); game app 1307550. Built from the research dossier
// docs/research/games/craftopia/ (confidence medium). NOT yet run on a real install: see 05-implementation-notes.md.
//  - the program is Craftopia.exe, started from the server folder with `-batchmode -showlogs` (the flags on the two guides; their
//    meaning is not documented).
//  - every setting is in ServerSetting.ini, next to the program. The panel writes the whole file when it creates the server, with the
//    defaults of the Pterodactyl egg's file (the dossier's copy) and the name, the port and the lobby switch set. The game reads it at start.
//  - port: 27980 for the game port (the dossier's default 6587 is left alone; the pages disagree on it, and 27980 is free of the other
//    templates). The port is written into ServerSetting.ini, so the script does not need it.
//
// Not done, and why:
//  - no password: the game takes a numbers-only PIN up to 8 digits, and the form has no field for it. usePassword stays 0.
//  - no stop command: the guides say CTRL+C in the console; the panel closes the window. Whether that saves the world is not known.
//  - no log file: -showlogs writes to the console, and the dossier names no log file.
//  - no mods: the dossier finds no official mod support; BepInEx is only in a third-party Docker image.
//  - dedicated server build: a Steam forum says the dedicated server works only with the legacy build; that is unresolved.

const EXE = "Craftopia.exe";

// Chosen to avoid the other templates' ports (checked by the unit test).
const DEFAULT_PORT = 27980;
const DEFAULT_NAME = "Craftopia Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A text safe as a value in ServerSetting.ini: no brackets, semicolons, equals signs, hashes or quotes, which the game reads as syntax. */
const iniSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f\[\];=#"]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A port as a whole number, or the default when none was given. Anything else is refused. */
function portOf(value, fallback, what) {
	if (value === undefined || value === null || value === "") return fallback;
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`The ${what} must be a whole number from 1 to 65535.`);
	return n;
}

/** The settings file the game reads, with the dossier's defaults and the panel's own values (name and port). */
function serverSettingIni(p) {
	const port = portOf(p.port, DEFAULT_PORT, "game port");
	const worldName = iniSafe(p.sessionName, "") || iniSafe(p.name, DEFAULT_NAME);
	const sections = [
		["GameWorld", [["name", worldName], ["difficulty", "1"], ["gameMode", "1"]]],
		[
			"Host",
			[
				["isUseSteamLobby", "0"],
				["port", String(port)],
				["maxPlayerNumber", "7"],
				["usePassword", "0"],
				["serverPassword", "00000000"],
				["bindAddress", "0.0.0.0"],
			],
		],
		[
			"Graphics",
			[
				["vSyncCount", "0"],
				["maxFPS", "60"],
				["grassBend", "0"],
				["clothSimOption", "2"],
			],
		],
		[
			"Save",
			[
				["autoSaveSec", "300"],
				["autoSavePerHour", "1"],
				["savePath", "DedicatedServerSave/"],
			],
		],
		[
			"CreativeModeSetting",
			[
				["quickCraft", "1"],
				["ageLevel", "7"],
				["islandLevel", "-1"],
				["noDeath", "1"],
				["noDamage", "1"],
				["noHunger", "1"],
				["infinitStamina", "1"],
				["forceDayTime", "-1"],
				["buildingIgnoreDamage", "0"],
				["noBuild", "0"],
			],
		],
		[
			"CreativeModePlStatus",
			[
				["Level", "0"],
				["Health", "0"],
				["Mana", "0"],
				["Stamina", "0"],
				["Money", "1000"],
				["SkillPoint", "0"],
				["EnchantPoint", "0"],
			],
		],
	];
	const lines = [];
	for (const [section, keys] of sections) {
		lines.push(`[${section}]`);
		for (const [key, value] of keys) lines.push(`${key}=${value}`);
		lines.push("");
	}
	return lines.join("\r\n");
}

const template = {
	id: "craftopia",
	displayName: "Craftopia",
	type: "craftopia",
	// The panel watches Craftopia.exe, the program the start script runs. The dossier does not say which process stays running.
	method: "process",
	updateAppId: "1670340",
	storeAppId: "1307550",
	sharedInstall: false,
	// SteamCMD puts Craftopia.exe and ServerSetting.ini in the install folder's root.
	installLayoutRoot: "",
	description:
		"Craftopia's dedicated server (Craftopia.exe). The panel writes its ServerSetting.ini with the world name and the port, then starts the server. Unconfirmed: which build the dedicated server runs on right now, and whether closing the window saves the world. Back up the saves folder by hand before you update.",
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Server Name (the world name shown to players)", type: "text" },
	},
	ports: [{ key: "port", label: "Game Port (TCP and UDP)", default: DEFAULT_PORT }],
	resolveParams: async (raw) => ({
		sessionName: iniSafe(raw.sessionName, "") || iniSafe(raw.name, DEFAULT_NAME),
	}),
	buildStartScriptFilename: () => "Start_Craftopia.bat",
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} -batchmode -showlogs`,
			"",
		].join("\r\n"),
	buildConfigFile: (p) => ({
		relPath: "ServerSetting.ini",
		content: serverSettingIni(p),
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "craftopia",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		sessionName: iniSafe(p.sessionName, "") || iniSafe(p.name, DEFAULT_NAME),
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "1670340",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The saves folder (the savePath default) and the settings file, both in the server folder.
	backup: {
		paths: [
			{ base: "working", rel: "DedicatedServerSave", label: "Saved worlds and players" },
			{ base: "working", rel: "ServerSetting.ini", label: "Server settings" },
		],
	},
	// -showlogs writes to the console. The game log is in the user profile (AppData/LocalLow/PocketPair/Craftopia/Logs_DS), outside the server folder, so the Logs tab cannot read it.
	logs: [],
	// The launch line is written by the panel, so the form does not add to it.
	launchOptions: false,
};

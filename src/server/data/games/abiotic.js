// Abiotic Factor (Deep Field Games). Server app 2857200 (store app 427410), installed anonymously with SteamCMD into the install folder
// itself (no steamapps\common nesting). Facts come from the research dossier: the developer's wiki (DFJacob/AbioticFactorDedicatedServer),
// a real SteamCMD install run on build 24343458 (game 1.0.0.6), and hosting guides where marked in the implementation notes.
//
// - Two programs run when the root AbioticFactorServer.exe is started: that small launcher and, as its child, the real server
//   AbioticFactor\Binaries\Win64\AbioticFactorServer-Win64-Shipping.exe. The developer's own example start file runs the Shipping
//   program directly, from its own folder (where steam_appid.txt is), and that is what this script does: one process, which is
//   the one the panel tracks and asks to close. (Through the launcher a quoted name's quotes were seen to be dropped from the
//   forwarded command line, which would cut a server name with spaces short; started directly, the quotes reach the game.)
// - -log is always on the line: with it the server has a console window the panel can ask to close, without it the server has no
//   window at all and can only be force-killed (tested). There is no RCON and no stop command.
// - The game does not make SandboxSettings.ini for a dedicated server (a reported issue; the docs disagree). The panel writes it
//   with the game's own defaults and points the server at it with -SandboxIniPath, so no world folder has to be made ahead of the
//   game and the settings do not depend on the world's name.
// - Admin.ini is made by the game on its first start; the panel does not write it.
// - No mods field: the developer supports no mods on dedicated servers yet (the dossier recommends adding nothing).

const BASE = "AbioticFactor";
const SANDBOX_REL = "Config/WindowsServer/SandboxSettings.ini"; // relative to AbioticFactor\Saved, as -SandboxIniPath wants
const SANDBOX_FILE = `${BASE}\\Saved\\Config\\WindowsServer\\SandboxSettings.ini`;
const ADMIN_FILE = `${BASE}\\Saved\\SaveGames\\Server\\Admin.ini`;
const WORLD = "Cascade"; // the game's own default world name

// Every key of the developer's example SandboxSettings.ini, in its order, with the value it ships. Booleans are written True/False.
export const SANDBOX_DEFAULTS = [
	["GameDifficulty", "1"],
	["HardcoreMode", "False"],
	["LootRespawnEnabled", "False"],
	["PowerSocketsOffAtNight", "True"],
	["DayNightCycleState", "0"],
	["DayNightCycleSpeedMultiplier", "1.0"],
	["WeatherFrequency", "3"],
	["SinkRefillRate", "1.0"],
	["FoodSpoilSpeedMultiplier", "1.0"],
	["RefrigerationEffectivenessMultiplier", "1.0"],
	["EnemySpawnRate", "1.0"],
	["EnemyHealthMultiplier", "1.0"],
	["EnemyPlayerDamageMultiplier", "1.0"],
	["EnemyDeployableDamageMultiplier", "1.0"],
	["DamageToAlliesMultiplier", "0.5"],
	["HungerSpeedMultiplier", "1.0"],
	["ThirstSpeedMultiplier", "1.0"],
	["FatigueSpeedMultiplier", "1.0"],
	["ContinenceSpeedMultiplier", "1.0"],
	["DetectionSpeedMultiplier", "1.0"],
	["BonusPerkPoints", "0"],
	["PlayerXPGainMultiplier", "1.0"],
	["ItemStackSizeMultiplier", "1.0"],
	["ItemWeightMultiplier", "1.0"],
	["ItemDurabilityMultiplier", "1.0"],
	["DurabilityLossOnDeathMultiplier", "0.1"],
	["ShowDeathMessages", "True"],
	["AllowRecipeSharing", "True"],
	["AllowPagers", "True"],
	["AllowTransmog", "True"],
	["DisableResearchMinigame", "False"],
	["DeathPenalties", "1"],
	["FirstTimeStartingWeapon", "0"],
	["HostAccessPlayerCorpses", "True"],
	["StorageByTag", "True"],
	["StructuralSupportLimit", "5"],
	["AllowCharacterReset", "True"],
	["BridgeSupports", "2"],
	["HomeWorlds", "True"],
	["InvisibleRadiation", "False"],
	["BaseInventorySize", "12"],
	["TaintedSinkWater", "False"],
	["RadiationDealsDamage", "False"],
	["PlayerFurnitureDestruction", "False"],
	["AllowIronMode", "True"],
	["EnemyAccuracy", "2"],
	["ApocalypticAbilities", "False"],
	["MaximizeEnemySpawns", "False"],
];

// The window title in `start /MIN "<title>"`. A server's name is typed by a person, and cmd acts on these characters.
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").trim() || "Abiotic Factor";

// A value written inside double quotes on the launch line. A quote can't be escaped in there, so it is dropped; a % would start a
// variable in a .bat, so it is doubled; a backslash right before the closing quote would swallow it, so trailing ones are dropped.
const quoted = (value) => `"${String(value ?? "").replace(/["\u0000-\u001f]/g, "").replace(/%/g, "%%").replace(/\\+$/, "")}"`;

// The game allows 1 to 24 players and its wiki warns above 6, which is the default.
const slots = (value) => {
	const n = Math.floor(Number(value));
	return Number.isFinite(n) && n >= 1 ? Math.min(24, n) : 6;
};

const template = {
	id: "abiotic",
	displayName: "Abiotic Factor",
	type: "abiotic",
	method: "process",
	updateAppId: "2857200",
	storeAppId: "427410",
	sharedInstall: false,
	// SteamCMD puts AbioticFactorServer.exe, AbioticFactor and Engine directly in the install folder.
	installLayoutRoot: "",
	// A join password and an in-game admin password (the game's -AdminPassword). No RCON, no mods.
	fields: ["sessionName", "serverPassword", "adminPassword"],
	fieldMeta: { sessionName: { label: "Server Name (shown in the server list)", type: "text" } },
	// The game's own defaults are 7777 and 27015, which other games here already use. Both ports are UDP. Only these two were open
	// on a real server (the game has no TCP listener and no RCON).
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: 8950 },
		{ key: "queryPort", label: "Query Port (UDP)", default: 8952 },
	],
	buildStartScriptFilename: () => "Start_AbioticFactor.bat",
	// Runs from the Shipping program's own folder, as the developer's example does. -WorldSaveName names the world's save folder;
	// -SandboxIniPath says where the settings file is (relative to AbioticFactor\Saved). The admin password is left off when empty,
	// because leaving it off is what turns password admin off.
	buildStartScript: (p) =>
		[
			"@echo off",
			`cd /d "%~dp0${BASE}\\Binaries\\Win64"`,
			`start /MIN "${windowTitle(p.name)}" AbioticFactorServer-Win64-Shipping.exe -log -useperfthreads -MaxServerPlayers=${slots(p.maxPlayers)} -PORT=${Number(p.port)} -QueryPort=${Number(p.queryPort)} -SteamServerName=${quoted(p.sessionName || p.name)} -WorldSaveName=${WORLD} -SandboxIniPath=${SANDBOX_REL}${p.serverPassword ? ` -ServerPassword=${quoted(p.serverPassword)}` : ""}${p.adminPassword ? ` -AdminPassword=${quoted(p.adminPassword)}` : ""}`,
			"",
		].join("\r\n"),
	// The game's own defaults, written before the first start so the Settings tab has the whole list to change.
	buildConfigFile: () => ({
		relPath: SANDBOX_FILE,
		content: ["[SandboxSettings]", ...SANDBOX_DEFAULTS.map(([key, value]) => `${key}=${value}`), ""].join("\r\n"),
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "abiotic",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		sessionName: p.sessionName || p.name,
		serverPassword: p.serverPassword,
		configPath: `${p.installDir}\\${SANDBOX_FILE}`,
		configPaths: {
			"SandboxSettings.ini": `${p.installDir}\\${SANDBOX_FILE}`,
			"Admin.ini": `${p.installDir}\\${ADMIN_FILE}`,
		},
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: "AbioticFactorServer-Win64-Shipping.exe",
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "2857200",
		autoUpdate: false,
	}),
};

export default {
	template,
	// Worlds, the admin list and the game's own world backups are under SaveGames\Server. The settings file is the panel's own.
	backup: {
		paths: [
			{ base: "working", rel: "AbioticFactor/Saved/SaveGames", label: "Saved worlds and admin list" },
			{ base: "working", rel: "AbioticFactor/Saved/Config/WindowsServer/SandboxSettings.ini", label: "World rules (sandbox settings)" },
		],
	},
	// AbioticFactor.log; on each start the previous one is renamed AbioticFactor-backup-<date>.log (all in this folder).
	logs: [{ kind: "dir", base: "working", rel: "AbioticFactor/Saved/Logs", label: "Game log" }],
	launchOptions: true,
};

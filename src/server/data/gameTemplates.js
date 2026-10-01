import crypto from "node:crypto";

// Recipes for one-click server creation. Each template knows everything
// generic per-game creation logic (services/serverCreationService.js) needs:
// the Steam appid to install, where within that install the actual server
// binary/start script end up, what ports to ask for, and how to generate a
// working start script + (where applicable) a config file + the servers.js
// entry itself.
//
// These are hand-verified against real, currently-working installs in this
// project — not guessed. Where a game's own config file contains fields the
// engine auto-generates on first boot (unique server/world IDs), this is
// called out in a comment on that template so the creation flow knows to
// leave them alone rather than fabricate them.

import {
	getUploadManifest,
	resolveAndDownloadMods,
	installOverrides,
	cleanupUpload,
} from "../services/modpackService.js";


// CurseForge manifest.json modLoaders[].id families the bundled ServerPackCreator
// scaffold (ServerData/templates/neoforge/{start.bat,start.ps1}) can actually
// install — its SetupNeoForge/SetupForge/SetupFabric functions all self-install
// from just these three variables.txt values. Quilt/LegacyFabric are technically
// supported by that same script too, but rare enough in real CurseForge exports
// that they're not wired up here — rejected with a clear error instead of
// guessed at.
export const SUPPORTED_MODLOADER_FAMILIES = ["neoforge", "forge", "fabric"];
const MODLOADER_DISPLAY_NAMES = { neoforge: "NeoForge", forge: "Forge", fabric: "Fabric" };
// CurseForge manifests give the Fabric LOADER version, never the separate
// Fabric INSTALLER tool version start.ps1 also needs — pinned to the same
// version the two existing live NeoForge servers already use successfully.
const FABRIC_INSTALLER_VERSION = "1.1.2";

// variables.txt's real comment header (verbatim from the proven-working
// minecraft-bmc6 install) — 100% boilerplate, identical for every modpack.
const VARIABLES_TXT_HEADER = `###
# REMEMBER:
#   Escape \\ and : in your Java path on Windows with another \\
#   Example:
#     From: C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.9.9-hotspot\\bin\\java.exe
#     To:   C\\:\\\\Program Files\\\\Eclipse Adoptium\\\\jdk-17.0.9.9-hotspot\\\\bin\\\\java.exe
#   More on escape characters at https://en.wikipedia.org/wiki/Escape_character
#
# MINECRAFT_VERSION, MODLOADER and MODLOADER_VERSION were auto-detected from
#   the uploaded modpack's manifest.json. Changing them may break the server.
# JAVA_ARGS are arguments to pass to the JVM. A good default for a modded
#   server is 4-6GB; raise it if the pack is heavy or you see memory warnings.
# RESTART true/false enables/disables automatically restarting the server
#   should it crash. Left off by default to avoid crash-loop restarts.
# Variables are not reloaded between automatic restarts. If you've made
#   changes and want them to take effect, stop the server and re-run it.
###
`;

function buildVariablesTxt(p) {
	const minMemGB = Math.max(2, Math.floor((p.maxMemoryGB || 6) / 2));
	const lines = [
		VARIABLES_TXT_HEADER,
		`MINECRAFT_VERSION=${p.mcVersion}`,
		`MODLOADER=${MODLOADER_DISPLAY_NAMES[p.modLoaderFamily]}`,
		`MODLOADER_VERSION=${p.modLoaderVersion}`,
		"LEGACYFABRIC_INSTALLER_VERSION=1.1.1",
		`FABRIC_INSTALLER_VERSION=${FABRIC_INSTALLER_VERSION}`,
		"QUILT_INSTALLER_VERSION=0.15.1",
		"RECOMMENDED_JAVA_VERSION=25",
		"WAIT_FOR_USER_INPUT=false",
		'JAVA="java"',
		// Deliberately no ZGC/generational flags here — those require
		// hand-verifying JVM-version compatibility per server (established
		// this session: -XX:+ZGenerational is required on Java 21-23, a
		// no-op on 24, and refused outright on 25+). A fresh modpack of
		// unknown provenance gets the safe, universally-compatible default;
		// GC tuning is an opt-in follow-up, not a blind copy from BMC6.
		`JAVA_ARGS="-Xmx${p.maxMemoryGB || 6}G -Xms${minMemGB}G"`,
		'ADDITIONAL_ARGS="-Dlog4j2.formatMsgNoLookups=true"',
		'SSJ_FORGE_ARGS="-Djava.security.manager=allow"',
		"RESTART=false",
		"SKIP_JAVA_CHECK=false",
		"JDK_VENDOR=temurin",
		"JABBA_INSTALL_URL_SH=https://github.com/Jabba-Team/jabba/raw/main/install.sh",
		"JABBA_INSTALL_URL_PS=https://github.com/Jabba-Team/jabba/raw/main/install.ps1",
		"JABBA_INSTALL_VERSION=0.14.0",
		"SERVERSTARTERJAR_FORCE_FETCH=true",
		"SERVERSTARTERJAR_VERSION=latest",
		"USE_SSJ=true",
		'CLEANUP="libraries,run.sh,run.bat,*installer.jar,*installer.jar.log,server.jar,.mixin.out,ldlib,local,fabric-server-launcher.jar,fabric-server-launch.jar,.fabric-installer,fabric-installer.jar,legacyfabric-installer.jar,.fabric versions"',
		"",
	];
	return lines.join("\r\n");
}

function buildServerProperties(p) {
	return [
		`server-port=${p.port}`,
		"enable-rcon=true",
		`rcon.port=${p.rconPort}`,
		`rcon.password=${p.rconPassword}`,
		"broadcast-rcon-to-ops=true",
		"enable-query=true",
		`query.port=${p.port}`,
		`motd=${p.sessionName || p.name}`,
		"max-players=20",
		"online-mode=true",
		"white-list=false",
		"",
	].join("\r\n");
}

export const GAME_TEMPLATES = [
	// ---------------------------------------------------------------------
	// ARK: Survival Ascended — shared install. All maps run out of ONE
	// SteamCMD install (appid 2430930); creating a new "server" here usually
	// means adding another map's Start_<Map>.bat to an install that already
	// exists, not a fresh install. serverCreationService looks for an
	// existing entry with type "ark" and a matching install root to decide
	// which path applies.
	// ---------------------------------------------------------------------
	{
		id: "ark-asa",
		displayName: "ARK: Survival Ascended",
		type: "ark",
		method: "rcon",
		updateAppId: "2430930",
		// The game's own store appid, as opposed to the dedicated-server tool
		// above. Only used to find dashboard artwork — server tools mostly have
		// none (2 of the 10 here do). It's a fallback: artService reads
		// steam_appid.txt out of the install first, which is both dynamic and
		// correct for games nobody has written a template for.
		storeAppId: "2399830",
		sharedInstall: true,
		// Known official map codes -> display names. "custom" lets the admin
		// type any other WP map code (mods, unofficial maps, etc.).
		mapChoices: [
			{ code: "TheIsland_WP", label: "The Island" },
			{ code: "TheCenter_WP", label: "The Center" },
			{ code: "ScorchedEarth_WP", label: "Scorched Earth" },
			{ code: "Aberration_WP", label: "Aberration" },
			{ code: "Extinction_WP", label: "Extinction" },
			{ code: "Ragnarok_WP", label: "Ragnarok" },
			{ code: "Valguero_WP", label: "Valguero" },
			{ code: "CrystalIsles_WP", label: "Crystal Isles" },
			{ code: "LostIsland_WP", label: "Lost Island" },
			{ code: "Fjordur_WP", label: "Fjordur" },
			{ code: "Astraeos_WP", label: "Astraeos" },
			{ code: "Genesis_WP", label: "Genesis: Part 1" },
			{ code: "Gen2_WP", label: "Genesis: Part 2" },
			{ code: "BobsMissions_WP", label: "Club ARK (Bob's Tavern)" },
		],
		fields: ["sessionName", "serverPassword", "rconPassword", "mapCode", "clusterId", "mods"],
		ports: [
			{ key: "port", label: "Game Port", default: 7015 },
			{ key: "queryPort", label: "Query Port", default: 7017 },
			{ key: "rconPort", label: "RCON Port", default: 27025 },
		],
		// installDir/steamCmdPath/workingDir all point at the shared root — the
		// same for every map. Only the map-specific bits (session name, ports,
		// save dir, mods) vary per instance.
		buildStartScriptFilename: (p) => `Start_${p.instanceSlug}.bat`,
		buildStartScript: (p) =>
			[
				"@echo off",
				`title ARK ASA - ${p.instanceSlug} Server Launcher`,
				"color 0A",
				"",
				`SET "BasePath=${p.installDir}"`,
				`SET "ClusterPath=%BasePath%\\ClusterStorage"`,
				"",
				`cd /d "%BasePath%\\ShooterGame\\Binaries\\Win64"`,
				"",
				`echo Launching ${p.instanceSlug} server...`,
				`start /MIN "${p.instanceSlug}" ArkAscendedServer.exe ${p.mapCode}?SessionName=${p.sessionName}${p.serverPassword ? `?ServerPassword=${p.serverPassword}` : ""}?ServerAdminPassword=${p.rconPassword}?RCONEnabled=True?RCONPort=${p.rconPort}?AltSaveDirectoryName=${p.instanceSlug}Save?MaxPlayers=${p.maxPlayers || 10}?ClusterId=${p.clusterId} -RCONPort=${p.rconPort} -Port=${p.port} -QueryPort=${p.queryPort} -server -ForceRespawnDinos -log -NoBattlEye -NoSteamClient -ClusterDirOverride="%ClusterPath%" -ForceAllowCaveFlyers${p.mods ? ` -mods=${p.mods}` : ""}`,
				"",
				"echo.",
				`echo ${p.instanceSlug} server has been launched!`,
				"exit",
				"",
			].join("\r\n"),
		buildServerEntry: (p) => ({
			name: p.name,
			type: "ark",
			method: "rcon",
			host: "127.0.0.1",
			rconPort: p.rconPort,
			rconPassword: p.rconPassword,
			sessionName: p.sessionName,
			serverPassword: p.serverPassword,
			configPaths: {
				"GameUserSettings.ini": `${p.installDir}\\ShooterGame\\Saved\\Config\\WindowsServer\\GameUserSettings.ini`,
				"Game.ini": `${p.installDir}\\ShooterGame\\Saved\\Config\\WindowsServer\\Game.ini`,
			},
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}\\`,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "2430930",
			autoUpdate: false,
		}),
	},

	// ---------------------------------------------------------------------
	// ARK: Survival Evolved — separate, single-instance install (not shared
	// like ASA). One steamcmd install per instance.
	// ---------------------------------------------------------------------
	{
		id: "ark-ase",
		displayName: "ARK: Survival Evolved",
		type: "ark",
		method: "rcon",
		updateAppId: "376030",
		storeAppId: "346110",
		sharedInstall: false,
		// ARK: Survival Evolved opens a raw UDP socket on the game port + 1. (Ascended
		// no longer does, so its template doesn't list one.)
		implicitPorts: [{ offset: 1, label: "its raw UDP socket" }],
		// SteamCMD installs straight into the server folder, so the game is at its root
		// (the steamapps\common\... nesting is SteamCMD's default location, which the panel
		// doesn't use).
		installLayoutRoot: "ShooterGame\\Binaries\\Win64",
		fields: ["sessionName", "serverPassword", "rconPassword", "mapCode", "mods"],
		ports: [
			{ key: "port", label: "Game Port", default: 26000 },
			{ key: "queryPort", label: "Query Port", default: 26002 },
			{ key: "rconPort", label: "RCON Port", default: 26003 },
		],
		mapChoices: [
			{ code: "TheIsland", label: "The Island" },
			{ code: "Ragnarok", label: "Ragnarok" },
			{ code: "Fjordur", label: "Fjordur" },
			{ code: "CrystalIsles", label: "Crystal Isles" },
		],
		buildStartScriptFilename: () => "Start_Server.bat",
		buildStartScript: (p) =>
			[
				"@echo off",
				`title ARK ASE - ${p.name} Server Launcher`,
				"color 0A",
				"",
				`SET "BasePath=${p.installDir}"`,
				`SET "InstallPath=%BasePath%\\${p.installLayoutRoot}"`,
				"",
				`cd /d "%InstallPath%"`,
				"",
				`echo Launching ${p.name} server...`,
				`start /MIN "${p.name}" ShooterGameServer.exe ${p.mapCode}?listen?SessionName=${p.sessionName}${p.serverPassword ? `?ServerPassword=${p.serverPassword}` : ""}?ServerAdminPassword=${p.rconPassword}?RCONEnabled=True?RCONPort=${p.rconPort}?MaxPlayers=${p.maxPlayers || 10}${p.mods ? `?GameModIds=${p.mods}` : ""} ${p.mods ? "-automanagedmods " : ""}-RCONPort=${p.rconPort} -Port=${p.port} -QueryPort=${p.queryPort} -server -ForceRespawnDinos -log -NoBattlEye -NoSteamClient -ForceAllowCaveFlyers`,
				"",
				"echo.",
				`echo ${p.name} server has been launched!`,
				"exit",
				"",
			].join("\r\n"),
		buildServerEntry: (p) => ({
			name: p.name,
			type: "ark",
			method: "rcon",
			host: "127.0.0.1",
			rconPort: p.rconPort,
			rconPassword: p.rconPassword,
			sessionName: p.sessionName,
			serverPassword: p.serverPassword,
			configPaths: {
				"GameUserSettings.ini": `${p.installDir}\\${p.installLayoutRoot}\\..\\..\\Saved\\Config\\WindowsServer\\GameUserSettings.ini`,
				"Game.ini": `${p.installDir}\\${p.installLayoutRoot}\\..\\..\\Saved\\Config\\WindowsServer\\Game.ini`,
			},
			startScriptPath: `${p.installDir}\\${p.installLayoutRoot}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}\\${p.installLayoutRoot}`,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "376030",
			autoUpdate: false,
		}),
	},

	// ---------------------------------------------------------------------
	{
		id: "conan",
		displayName: "Conan Exiles",
		type: "conan",
		method: "gamedig",
		queryProtocol: "conanexiles",
		updateAppId: "443030",
		storeAppId: "440900",
		sharedInstall: false,
		// A genuinely fresh `+force_install_dir` install places
		// ConanSandboxServer.exe (and the ConanSandbox/ project folder) at
		// the install root, confirmed via a real live test — not nested
		// under "steamapps\common\Conan Exiles Dedicated Server" like the
		// existing, historically-set-up production server. Same class of
		// mismatch already found and fixed for Enshrouded; don't assume an
		// existing install's layout predicts a fresh one's.
		installLayoutRoot: "",
		fields: ["sessionName", "serverPassword", "rconPassword"],
		ports: [
			{ key: "port", label: "Game Port", default: 8892 },
			{ key: "queryPort", label: "Query Port", default: 8894 },
			{ key: "rconPort", label: "RCON Port", default: 8895 },
		],
		// Conan opens a second UDP socket on the game port + 1 without being asked.
		// Nothing else may use it: with the query port there, the game and the
		// panel's status query fight over it, and the server neither shows as
		// online nor accepts players. This is why the defaults leave a gap.
		implicitPorts: [{ offset: 1, label: "its raw UDP socket" }],
		buildStartScriptFilename: () => "Start_Conan.bat",
		buildStartScript: (p) =>
			[
				"@echo off",
				`start /MIN "${p.name}" ConanSandboxServer.exe -log -ServerName=${p.sessionName} -ServerPassword=${p.serverPassword} -MULTIHOME=0.0.0.0 -Port=${p.port} -QueryPort=${p.queryPort}`,
				"",
			].join("\r\n"),
		// Game.ini (where Conan's RCON settings live) is NOT engine-generated
		// on first boot — confirmed via a real live test creation: the file
		// was still absent minutes after a full boot (RCON stayed disabled
		// the whole time, "LogRcon: Display: Rcon disabled." in the log). The
		// real production server's RCON-enabled Game.ini was hand-created by
		// a human, not autogenerated. So write it directly at creation time
		// instead — same pattern as Enshrouded/7-Days-to-Die/Dragonwilds —
		// rather than trying to patch a file that never gets created.
		buildConfigFile: (p) => ({
			relPath: "ConanSandbox\\Saved\\Config\\WindowsServer\\Game.ini",
			content: [
				";METADATA=(Diff=true, UseCommands=true)",
				"[RconPlugin]",
				"RconEnabled=1",
				`RconPassword=${p.rconPassword}`,
				`RconPort=${p.rconPort}`,
				"RconMaxKarma=60",
				"",
			].join("\r\n"),
		}),
		buildServerEntry: (p) => ({
			name: p.name,
			type: "conan",
			method: "gamedig",
			host: "127.0.0.1",
			port: p.port,
			queryPort: p.queryPort,
			queryProtocol: "conanexiles",
			sessionName: p.sessionName,
			serverPassword: p.serverPassword,
			configPath: `${p.installDir}\\ConanSandbox\\Saved\\Config\\WindowsServer\\ServerSettings.ini`,
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			processName: "ConanSandboxServer-Win64-Shipping.exe",
			rconPort: p.rconPort,
			rconPassword: p.rconPassword,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "443030",
			autoUpdate: false,
		}),
	},

	// ---------------------------------------------------------------------
	{
		id: "valheim",
		displayName: "Valheim",
		type: "valheim",
		method: "gamedig",
		updateAppId: "896660",
		storeAppId: "892970",
		sharedInstall: false,
		// SteamCMD is told to install straight into the server folder (+force_install_dir),
		// so the game files are in its root. The steamapps\common\... nesting belongs to
		// SteamCMD's default install location, which the panel doesn't use. (Found on a
		// real install: the server was registered at a folder that held only its script.)
		installLayoutRoot: "",
		fields: ["sessionName", "serverPassword"],
		ports: [{ key: "port", label: "Game Port", default: 7777 }],
		// Valheim uses three consecutive UDP ports: the game port and the two above it.
		implicitPorts: [
			{ offset: 1, label: "Steam queries" },
			{ offset: 2, label: "a third port some versions use", precaution: true },
		],
		buildStartScriptFilename: () => "Valheim-Server-Start.bat",
		buildStartScript: (p) =>
			[
				"@echo off",
				"set SteamAppId=892970",
				"",
				// -savedir keeps this server's worlds in its own folder. Without it Valheim
				// writes to the signed-in user's profile, shared with every other Valheim
				// server on the PC, so two servers could end up using the same world file
				// and a restore would replace all of them.
				`start /MIN "${p.name}" valheim_server.exe -nographics -batchmode -name "${p.sessionName}" -port ${p.port} -world "${p.worldName || p.instanceSlug || "World"}" -savedir "%~dp0saves" -logFile "%~dp0valheim_server.log" -password "${p.serverPassword}"`,
				"",
			].join("\r\n"),
		buildServerEntry: (p) => ({
			name: p.name,
			type: "valheim",
			method: "gamedig",
			host: "127.0.0.1",
			port: p.port,
			sessionName: p.sessionName,
			serverPassword: p.serverPassword,
			startScriptPath: `${p.installDir}\\${p.installLayoutRoot}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}\\${p.installLayoutRoot}`,
			processName: "valheim_server.exe",
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "896660",
			autoUpdate: false,
		}),
	},

	// ---------------------------------------------------------------------
	{
		id: "enshrouded",
		displayName: "Enshrouded",
		type: "enshrouded",
		method: "gamedig",
		updateAppId: "2278520",
		storeAppId: "1203620",
		sharedInstall: false,
		// A genuinely fresh `+force_install_dir` install places every file —
		// exe, config, everything — directly at the install root, confirmed
		// via a real live test. The nested "steamapps\common\EnshroudedServer"
		// layout on the existing hand-set-up server is a historical artifact
		// of however that one was originally installed, not what a new
		// install actually produces — don't assume the two match.
		installLayoutRoot: "",
		fields: ["sessionName", "serverPassword", "adminPassword"],
		ports: [{ key: "port", label: "Query Port", default: 15637 }],
		buildStartScriptFilename: () => "Launch Enshrouded Server.bat",
		buildStartScript: () =>
			[
				"@echo off",
				"echo Launching server",
				"start /MIN enshrouded_server.exe",
				"",
			].join("\r\n"),
		// enshrouded_server.json has no auto-generated unique IDs — safe to
		// write in full at creation time.
		buildConfigFile: (p) => ({
			relPath: "enshrouded_server.json",
			content: JSON.stringify(
				{
					name: p.sessionName,
					saveDirectory: "./savegame",
					logDirectory: "./logs",
					ip: "0.0.0.0",
					queryPort: p.port,
					slotCount: p.maxPlayers || 16,
					tags: [],
					voiceChatMode: "Proximity",
					enableVoiceChat: true,
					enableTextChat: true,
					gameSettingsPreset: "Default",
					gameSettings: {},
					userGroups: [
						{
							name: "Admin",
							// The game refuses to start when two groups share a password ("user groups
							// passwords must be unique", seen on a real install), so the admin one is
							// never the join password, even when none was given.
							password: p.adminPassword && p.adminPassword !== p.serverPassword ? p.adminPassword : crypto.randomBytes(6).toString("base64url"),
							canKickBan: true,
							canAccessInventories: true,
							canEditWorld: true,
							canEditBase: true,
							canExtendBase: true,
							reservedSlots: 0,
						},
						{
							name: "Friend",
							password: p.serverPassword,
							canKickBan: false,
							canAccessInventories: true,
							canEditWorld: true,
							canEditBase: true,
							canExtendBase: true,
							reservedSlots: 0,
						},
					],
					bannedAccounts: [],
				},
				null,
				2,
			),
		}),
		buildServerEntry: (p) => ({
			name: p.name,
			type: "enshrouded",
			method: "gamedig",
			host: "127.0.0.1",
			port: p.port,
			sessionName: p.sessionName,
			serverPassword: p.serverPassword,
			configPath: `${p.installDir}\\enshrouded_server.json`,
			startScriptPath: `${p.installDir}\\Launch Enshrouded Server.bat`,
			workingDir: `${p.installDir}`,
			processName: "enshrouded_server.exe",
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "2278520",
			autoUpdate: false,
		}),
	},

	// ---------------------------------------------------------------------
	{
		id: "dragonwilds",
		displayName: "RuneScape: Dragonwilds",
		type: "rune",
		method: "process",
		updateAppId: "4019830",
		storeAppId: "1374490",
		sharedInstall: false,
		installLayoutRoot: "",
		fields: ["sessionName", "serverPassword"],
		ports: [{ key: "port", label: "Port", default: 8888 }],
		buildStartScriptFilename: () => "Start_Dragonwilds.bat",
		buildStartScript: (p) =>
			[
				"@echo off",
				`start /MIN "${p.name}" .\\RSDragonwildsServer.exe -log -port=${p.port}`,
				"",
			].join("\r\n"),
		// DedicatedServer.ini also carries an OwnerId/ServerGuid the engine
		// generates itself on first boot — deliberately omitted here so the
		// game fills them in rather than us fabricating something invalid.
		buildConfigFile: (p) => ({
			relPath:
				"RSDragonwilds\\Saved\\Config\\WindowsServer\\DedicatedServer.ini",
			content: [
				";METADATA=(Diff=true, UseCommands=true)",
				"[/Script/Dominion.DedicatedServerSettings]",
				`AdminPassword=${p.adminPassword || p.serverPassword}`,
				`ServerName=${p.sessionName}`,
				`WorldPassword=${p.serverPassword}`,
				`DefaultWorldName=${p.sessionName}`,
				"",
			].join("\r\n"),
		}),
		buildServerEntry: (p) => ({
			name: p.name,
			type: "rune",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: p.sessionName,
			serverPassword: p.serverPassword,
			configPath: `${p.installDir}\\RSDragonwilds\\Saved\\Config\\WindowsServer\\DedicatedServer.ini`,
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			processName: "RSDragonwildsServer-Win64-Shipping.exe",
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}`,
			updateAppId: "4019830",
			autoUpdate: false,
		}),
	},

	// ---------------------------------------------------------------------
	{
		id: "windrose",
		displayName: "Windrose",
		type: "windrose",
		method: "process",
		updateAppId: "4129620",
		storeAppId: "3041230",
		sharedInstall: false,
		// SteamCMD installs straight into the server folder: the game is at its root, not under
		// steamapps\common (SteamCMD's default location, which the panel doesn't use).
		installLayoutRoot: "",
		fields: ["sessionName", "serverPassword"],
		ports: [{ key: "port", label: "Port", default: 8890 }],
		buildStartScriptFilename: () => "StartServerForeground.bat",
		buildStartScript: () =>
			[
				"@echo off",
				"pushd %~dp0%",
				"",
				'start /MIN /abovenormal "Windrose" R5\\Binaries\\Win64\\WindroseServer-Win64-Shipping.exe -log',
				"",
				"popd",
				"",
			].join("\r\n"),
		// ServerDescription.json's PersistentServerId/InviteCode/WorldIslandId
		// are engine-generated on first boot (the InviteCode literally shows
		// up in this project's existing "Windrose (005526ee)" server name) —
		// deliberately NOT writing this file. The creation flow starts the
		// server once to let it generate its own defaults, stops it, then
		// patches just Password/ServerName/MaxPlayerCount in place.
		patchAfterFirstBoot: {
			relPath: "R5\\ServerDescription.json",
			apply: (content, p) => {
				const data = JSON.parse(content);
				const persistent = data.ServerDescription_Persistent || {};
				persistent.ServerName = p.sessionName;
				persistent.Password = p.serverPassword;
				persistent.IsPasswordProtected = Boolean(p.serverPassword);
				if (p.maxPlayers) persistent.MaxPlayerCount = p.maxPlayers;
				data.ServerDescription_Persistent = persistent;
				return JSON.stringify(data, null, 2);
			},
		},
		buildServerEntry: (p) => ({
			name: p.name,
			type: "windrose",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: p.sessionName,
			serverPassword: p.serverPassword,
			configPath: `${p.installDir}\\${p.installLayoutRoot}\\R5\\ServerDescription.json`,
			startScriptPath: `${p.installDir}\\${p.installLayoutRoot}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}\\${p.installLayoutRoot}`,
			processName: "WindroseServer-Win64-Shipping.exe",
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "4129620",
			autoUpdate: false,
		}),
	},

	// ---------------------------------------------------------------------
	{
		id: "subsistence",
		displayName: "Subsistence",
		type: "subsistence",
		method: "process",
		updateAppId: "1362640",
		storeAppId: "418030",
		sharedInstall: false,
		// The game is at the server folder's root (SteamCMD installs straight into it); the
		// launcher sits in Binaries\Win64.
		installLayoutRoot: "Binaries\\Win64",
		fields: ["serverPassword"],
		ports: [{ key: "port", label: "Port", default: 8900 }],
		buildStartScriptFilename: () => "UpdateandRun.bat",
		buildStartScript: (p) =>
			[
				"@echo off",
				"",
				`start /MIN "${p.name}" "Start_Server.bat"`,
				"",
			].join("\r\n"),
		buildInnerStartScript: (p) =>
			[
				`start /MIN "${p.name}" Subsistence.exe server coldmap1?steamsockets -log  -Password=${p.serverPassword}`,
				"",
			].join("\r\n"),
		buildServerEntry: (p) => ({
			name: p.name,
			type: "subsistence",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: p.name,
			configPath: `${p.installDir}\\UDKGame\\Config\\UDKDedServerSettings.ini`,
			startScriptPath: `${p.installDir}\\${p.installLayoutRoot}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			processName: "Subsistence.exe",
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "1362640",
			autoUpdate: false,
		}),
	},

	// ---------------------------------------------------------------------
	{
		id: "7days",
		displayName: "7 Days to Die",
		type: "7days",
		method: "gamedig",
		queryProtocol: "sdtd",
		updateAppId: "294420",
		storeAppId: "251570",
		sharedInstall: false,
		installLayoutRoot: "",
		fields: ["sessionName", "serverPassword"],
		ports: [
			{ key: "port", label: "Port", default: 8910 },
			// The panel saves the world over this before a stop or a backup. It is for the
			// panel only (no password, answers on this PC alone), so it never needs opening.
			{ key: "telnetPort", label: "Telnet Port (panel commands)", default: 8915 },
		],
		// 7 Days to Die listens on the ports after the server port too: Steam
		// traffic, LiteNetLib, and the extra crossplay one.
		implicitPorts: [
			// Seen on a real server: it binds the game port (UDP and TCP) and the port two above
			// it (UDP). The ones between and after are kept free in case a version uses them.
			{ offset: 1, label: "Steam traffic", precaution: true },
			{ offset: 2, label: "its LiteNetLib (crossplay) port" },
			{ offset: 3, label: "its extra networking port", precaution: true },
		],
		buildStartScriptFilename: () => "startdedicated.bat",
		buildStartScript: (p) =>
			[
				"@echo off",
				"",
				"echo|set /p=\"251570\" > steam_appid.txt",
				"set SteamAppId=251570",
				"",
				// UserDataFolder keeps this server's saves in its own folder; by default 7 Days
				// to Die writes to the signed-in user's profile, shared with every other
				// server on the PC.
				`start /MIN "${p.name}" 7DaysToDieServer -logfile "output_log.txt" -quit -batchmode -nographics -configfile=serverconfig.xml "-UserDataFolder=%~dp0userdata" -dedicated`,
				"",
				"echo Server launched minimized. Closing this window.",
				"exit /b 0",
				"",
			].join("\r\n"),
		// serverconfig.xml has no auto-generated unique IDs — safe to write
		// the whole file. Keeping it to just the fields that matter; the
		// rest is 7DTD's own stock defaults for everything else once the
		// admin opens it in the config editor.
		buildConfigFile: (p) => ({
			relPath: "serverconfig.xml",
			content: [
				'<?xml version="1.0"?>',
				"<ServerSettings>",
				`\t<property name="ServerName" value="${p.sessionName}"/>`,
				`\t<property name="ServerPassword" value="${p.serverPassword || ""}"/>`,
				`\t<property name="ServerPort" value="${p.port}"/>`,
				'\t<property name="ServerVisibility" value="2"/>',
				`\t<property name="ServerMaxPlayerCount" value="${p.maxPlayers || 8}"/>`,
				'\t<property name="GameWorld" value="Navezgane"/>',
				`\t<property name="WorldGenSeed" value="${p.worldName || "World"}"/>`,
				'\t<property name="WorldGenSize" value="6144"/>',
				`\t<property name="GameName" value="${p.worldName || "World"}"/>`,
				'\t<property name="TelnetEnabled" value="true"/>',
				`\t<property name="TelnetPort" value="${p.telnetPort}"/>`,
				'\t<property name="TelnetPassword" value=""/>',
				"</ServerSettings>",
				"",
			].join("\r\n"),
		}),
		buildServerEntry: (p) => ({
			name: p.name,
			type: "7days",
			method: "gamedig",
			queryProtocol: "sdtd",
			host: "127.0.0.1",
			port: p.port,
			sessionName: p.sessionName,
			serverPassword: p.serverPassword,
			configPath: `${p.installDir}\\serverconfig.xml`,
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			processName: "7DaysToDieServer.exe",
			telnetPort: p.telnetPort,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}`,
			updateAppId: "294420",
			autoUpdate: false,
		}),
	},

	// ---------------------------------------------------------------------
	{
		id: "palworld",
		displayName: "Palworld",
		type: "Palword",
		method: "gamedig",
		queryProtocol: "palworld",
		updateAppId: "2394010",
		storeAppId: "1623730",
		sharedInstall: false,
		// A fresh SteamCMD install puts PalServer.exe and everything else directly in the
		// install folder (checked on a real install); the steamapps\common\PalServer nesting
		// is how an older, hand-made server happened to be laid out.
		installLayoutRoot: "",
		fields: ["sessionName", "serverPassword", "rconPassword"],
		ports: [
			{ key: "port", label: "Game Port", default: 8920 },
			{ key: "queryPort", label: "REST API Port", default: 8922 },
			{ key: "rconPort", label: "RCON Port", default: 8923 },
		],
		buildStartScriptFilename: () => "Start_Palworld.bat",
		buildStartScript: (p) =>
			[
				"@echo off",
				`title ${p.name} Launcher`,
				"",
				`cd /d "${p.installDir}"`,
				"",
				`start /MIN "${p.name}" PalServer.exe ^`,
				`    -ServerName="${p.sessionName}" ^`,
				`    -password=${p.serverPassword} ^`,
				`    -port=${p.port} ^`,
				`    -publicport=${p.port} ^`,
				"    -region=NA ^",
				`    -players=${p.maxPlayers || 32} ^`,
				"    -log ^",
				"    -nosteam ^",
				"    -publiclobby",
				"",
				"exit /b",
				"",
			].join("\r\n"),
		// The status check (gamedig's "palworld" protocol) asks the server's REST API on the
		// query port, signing in as admin with the admin password, and the RCON console needs
		// its own switch. A fresh install has none of these on, so a server made without this
		// file never showed as online. Everything else the game fills in with its defaults.
		buildConfigFile: (p) => {
			const q = (v) => `"${String(v ?? "").replace(/"/g, "")}"`;
			const options = [
				`ServerName=${q(p.sessionName)}`,
				`ServerPassword=${q(p.serverPassword)}`,
				`AdminPassword=${q(p.rconPassword)}`,
				`PublicPort=${p.port}`,
				`ServerPlayerMaxNum=${p.maxPlayers || 32}`,
				"RCONEnabled=True",
				`RCONPort=${p.rconPort}`,
				"RESTAPIEnabled=True",
				`RESTAPIPort=${p.queryPort}`,
			];
			return {
				relPath: "Pal\\Saved\\Config\\WindowsServer\\PalWorldSettings.ini",
				content: `[/Script/Pal.PalGameWorldSettings]\r\nOptionSettings=(${options.join(",")})\r\n`,
			};
		},
		buildServerEntry: (p) => ({
			name: p.name,
			type: "Palword",
			method: "gamedig",
			queryProtocol: "palworld",
			queryPort: p.queryPort,
			host: "127.0.0.1",
			port: p.port,
			sessionName: p.sessionName,
			serverPassword: p.serverPassword,
			configPath: `${p.installDir}\\Pal\\Saved\\Config\\WindowsServer\\PalWorldSettings.ini`,
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			processName: "PalServer-Win64-Shipping-Cmd.exe",
			rconPort: p.rconPort,
			rconPassword: p.rconPassword,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}`,
			updateAppId: "2394010",
			autoUpdate: false,
		}),
	},

	// ---------------------------------------------------------------------
	// Minecraft (Modpack) — no Steam install at all. The admin uploads a
	// CurseForge modpack export zip (manifest.json + overrides/); MC
	// version/modloader family/modloader version are auto-detected from it
	// (see routes/api.js's POST /uploads/modpack) rather than asked for
	// again here. Uses the real, proven ServerPackCreator/ServerStarterJar
	// launcher scaffold (ServerData/templates/neoforge/{start.bat,start.ps1},
	// copied verbatim from the live minecraft-bmc6 install) — one unmodified
	// script pair self-installs NeoForge, Forge, or Fabric on first boot,
	// driven entirely by variables.txt.
	// ---------------------------------------------------------------------
	{
		id: "minecraft-modpack",
		displayName: "Minecraft (Modpack)",
		type: "minecraft",
		method: "gamedig",
		sharedInstall: false,
		requiresEula: true,
		fields: [
			"sessionName",
			"serverPassword",
			"rconPassword",
			"maxMemoryGB",
			"uploadId",
			"eulaAccepted",
		],
		fieldMeta: {
			sessionName: { label: "Join Address / Session Name", type: "text" },
			serverPassword: { label: "Server Password", type: "text" },
			rconPassword: { label: "RCON Password", type: "text" },
			maxMemoryGB: { label: "Max Memory (GB)", type: "text" },
			uploadId: { label: "Modpack (.zip, CurseForge export)", type: "file" },
			eulaAccepted: {
				label:
					"I confirm I am authorized to accept Mojang's EULA (https://aka.ms/MinecraftEULA) on behalf of this server, and I accept it.",
				type: "checkbox",
			},
		},
		ports: [
			{ key: "port", label: "Server Port", default: 25565 },
			{ key: "rconPort", label: "RCON Port", default: 25575 },
		],
		// Re-derives the modloader/MC version straight from the saved
		// upload's manifest.json — never trusts whatever the client echoed
		// back in the form. Also the one place that rejects an unsupported
		// modloader family, since the upload endpoint's own check only ran
		// against whatever zip was uploaded first, not necessarily this one.
		resolveParams: async (rawParams) => {
			if (!rawParams.uploadId) {
				throw new Error("No modpack was uploaded.");
			}
			const manifest = getUploadManifest(rawParams.uploadId);
			if (!SUPPORTED_MODLOADER_FAMILIES.includes(manifest.modLoaderFamily)) {
				throw new Error(
					`Unsupported modloader "${manifest.modLoaderFamily}" — only NeoForge, Forge, and Fabric modpacks are supported.`,
				);
			}
			return {
				mcVersion: manifest.mcVersion,
				modLoaderFamily: manifest.modLoaderFamily,
				modLoaderVersion: manifest.modLoaderVersion,
			};
		},
		copyStaticAssets: [
			{ from: "neoforge/start.bat", to: "start.bat" },
			{ from: "neoforge/start.ps1", to: "start.ps1" },
			// start.ps1's InstallJava function sources this companion script
			// by relative path (". .\install_java.ps1") to auto-install the
			// right JDK via jabba when the system "java" doesn't match
			// RECOMMENDED_JAVA_VERSION — confirmed required via a real live
			// test creation (NeoForge 26.1.2.109 needs Java 25, this machine's
			// "java" resolves to 21; without this file the version check
			// silently had nothing to fix itself with).
			{ from: "neoforge/install_java.ps1", to: "install_java.ps1" },
		],
		buildExtraFiles: (p) => [
			{ relPath: "variables.txt", content: buildVariablesTxt(p) },
			{
				relPath: "eula.txt",
				content:
					"#By changing the setting below to TRUE you are indicating your agreement to Mojang's EULA (https://aka.ms/MinecraftEULA).\r\neula=true\r\n",
			},
			{ relPath: "server.properties", content: buildServerProperties(p) },
		],
		// The heavy part: resolve manifest.files -> real jars via CurseForge,
		// download them into mods/, copy overrides/, then discard the upload.
		// Mods CF can't resolve don't fail the job — they're surfaced as
		// warnings so the admin knows to add them manually.
		postWrite: async (p, { log, setStatus }) => {
			const manifest = getUploadManifest(p.uploadId);

			setStatus({ status: "resolving-mods" });
			log(`Resolving ${manifest.files.length} mod file(s) via CurseForge...`);

			setStatus({ status: "downloading-mods" });
			const modsDir = `${p.installDir}\\mods`;
			const { downloaded, failed, skippedClientOnly } = await resolveAndDownloadMods(
				manifest,
				modsDir,
				{ onProgress: (done, total) => log(`Mods: ${done}/${total}`) },
			);
			log(`Downloaded ${downloaded.length} mod(s).`);
			if (skippedClientOnly.length > 0) {
				log(
					`Skipped ${skippedClientOnly.length} client-only mod(s) (not needed on a dedicated server): ${skippedClientOnly
						.map((f) => f.fileName)
						.join(", ")}`,
				);
			}
			if (failed.length > 0) {
				log(
					`WARNING: ${failed.length} mod(s) could not be resolved: ${failed
						.map((f) => `${f.projectID} (${f.reason})`)
						.join("; ")}`,
				);
			}

			log("Copying modpack overrides (configs, resource packs, etc.), if any...");
			await installOverrides(p.uploadId, manifest, p.installDir);

			await cleanupUpload(p.uploadId);

			return { warnings: failed };
		},
		buildServerEntry: (p) => ({
			name: p.name,
			type: "minecraft",
			method: "gamedig",
			host: "127.0.0.1",
			port: p.port,
			sessionName: p.sessionName,
			serverPassword: p.serverPassword,
			joinAddress: p.sessionName,
			configPath: `${p.installDir}\\server.properties`,
			startScriptPath: `${p.installDir}\\start.bat`,
			workingDir: `${p.installDir}`,
			rconPort: p.rconPort,
			rconPassword: p.rconPassword,
			installDir: `${p.installDir}\\`,
			autoUpdate: false,
		}),
	},
	// ---------------------------------------------------------------------
	{
		id: "rust",
		displayName: "Rust",
		type: "rust",
		method: "rcon",
		updateAppId: "258550",
		storeAppId: "252490",
		sharedInstall: false,
		installLayoutRoot: "",
		fields: ["sessionName", "rconPassword"],
		ports: [
			{ key: "port", label: "Game Port", default: 28015 },
			{ key: "queryPort", label: "Query Port", default: 28017 },
			{ key: "rconPort", label: "RCON Port", default: 28018 },
		],
		buildStartScriptFilename: () => "Start_Rust.bat",
		// Rust keeps each server's world and settings under server\<identity>, inside this
		// folder. +rcon.web 0 selects the ordinary (Source) RCON over TCP instead of the
		// WebSocket one; +app.port -1 turns off the Rust+ companion-app port.
		buildStartScript: (p) =>
			[
				"@echo off",
				"cd /d \"%~dp0\"",
				"",
				`start /MIN "${p.name}" RustDedicated.exe -batchmode -nographics -logfile "rustserver.log" +server.ip 0.0.0.0 +server.port ${p.port} +server.queryport ${p.queryPort} +rcon.ip 127.0.0.1 +rcon.port ${p.rconPort} +rcon.password "${p.rconPassword}" +rcon.web 0 +app.port -1 +server.identity "${p.instanceSlug || "server"}" +server.hostname "${p.sessionName}" +server.maxplayers ${p.maxPlayers || 20} +server.worldsize ${p.worldSize || 3000} +server.seed ${p.seed || 1337} +server.saveinterval 300`,
				"",
			].join("\r\n"),
		buildServerEntry: (p) => ({
			name: p.name,
			type: "rust",
			method: "rcon",
			host: "127.0.0.1",
			port: p.port,
			queryPort: p.queryPort,
			rconPort: p.rconPort,
			rconPassword: p.rconPassword,
			sessionName: p.sessionName,
			configPath: `${p.installDir}\\server\\${p.instanceSlug || "server"}\\cfg\\server.cfg`,
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			processName: "RustDedicated.exe",
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "258550",
			autoUpdate: false,
		}),
	},
];

export function getTemplate(id) {
	return GAME_TEMPLATES.find((t) => t.id === id) ?? null;
}

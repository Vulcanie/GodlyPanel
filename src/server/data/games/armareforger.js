// Arma Reforger (Bohemia Interactive). Dedicated server: Steam app 1874900 (stable; 1890870 is the experimental branch, not used here),
// anonymous login. The game itself (store app 1874880) is not needed on the server.
//
// Facts from the research dossier (research/armareforger/01..04 and its raw/ page copies), whose sources are Bohemia Interactive's
// own wiki (Server Hosting, Server Config, Startup Parameters) and, for what the wiki leaves open, the IONOS, GameCP and Unraid
// guides and XGamingServer's reference pages. Nothing was run on a real install. In short:
//  - the program is ArmaReforgerServer.exe in the install folder's root, started with
//      -config ".\Configs\server-config.json" -profile "%~dp0profile" -maxFPS 60
//    -config is how the wiki and IONOS point the server at its settings file; -maxFPS is "heavily recommended" by the wiki (60..120),
//    because without it the server tries to use all the resources of the PC; -profile keeps the server's logs, add-on downloads and
//    saves in its own folder instead of the one folder in Documents that every Reforger server on the PC would share (the wiki's
//    Linux example and GameCP both pass -profile). Nothing has to be last on the line, so the "Launch options" form stays on;
//  - ports: UDP 2001 (game), UDP 17777 (Steam query) and, if RCON were switched on, UDP 19999. Another template here already has
//    17777, so the query port starts at 17877. The config's publicPort is the game port; bindPort is left out on purpose (the wiki says
//    to leave it out so it follows publicPort), as are bindAddress and publicAddress (the game finds its own address);
//  - ONE JSON file holds everything (name, passwords, scenario, player limit, rules, mods). The panel writes a first one, from the
//    wiki's template with its defaults, before the first start, so the Settings tab has the list to change;
//  - mods are not a launch argument: they are the game.mods list of that file, each entry the Workshop GUID, and the server downloads
//    them itself when it starts. The dossier recommends no create-form field for them, so there is none;
//  - RCON: the game has one (UDP, port 19999, password of at least 3 letters), but it is not the Source RCON the panel's Stop speaks, so
//    method is "process", the config has no rcon block (the wiki: RCON does not start without a password) and the entry has no rconPort;
//  - the panel's Stop asks the window to close and force-kills after 15 s. No page says how the server stops cleanly or saves on stop
//    (NOT FOUND), but it autosaves every 10 minutes by default (persistence.autoSaveInterval), so a forced stop costs at most that.
// Not verified on a real install (see research/armareforger/05-implementation-notes.md): that ArmaReforgerServer.exe is the one
// process that stays running, that the very file the panel writes starts the server (a2s.address 0.0.0.0, the scenario id), that a
// relative -config path and an absolute -profile path are read the way the wiki's examples suggest, that closing the window stops it,
// and where the saves and logs end up inside the profile folder.

const EXE = "ArmaReforgerServer.exe";
const CONFIG_REL = "Configs\\server-config.json";
const PROFILE_DIR = "profile";

/**
 * The scenario used when none is given. The wiki says only that scenarioId is the scenario's .conf path and to list them with
 * -listScenarios; this value is the one XGamingServer's reference page and its mod guide both show (the standard campaign).
 */
export const DEFAULT_SCENARIO = "{ECC61978EDCC2B5A}Missions/23_Campaign.conf";

// The wiki: maxPlayers 1..128, default 64.
const DEFAULT_PLAYERS = 64;
const MAX_PLAYERS = 128;
// The wiki: game.name is 0..100 characters.
const MAX_NAME = 100;

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

const wholeNumber = (value, fallback, min, max) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

const playerLimit = (value) => wholeNumber(value, DEFAULT_PLAYERS, 1, MAX_PLAYERS);

/** A name or a password for the JSON file: one line, no control characters. JSON encoding takes care of quotes and backslashes. */
const jsonText = (value) => String(value ?? "").replace(/[\u0000-\u001f]/g, "").trim();

/** The scenario's .conf path, as typed. Empty means the default. */
export function cleanScenario(raw) {
	const text = String(raw ?? "").trim();
	if (!text) return "";
	if (text.length > 300 || !/\.conf$/i.test(text) || /[\u0000-\u001f"\\]/.test(text)) {
		throw new Error(`"${text.slice(0, 60)}" is not a scenario. It is the path of the scenario's .conf file, for example ${DEFAULT_SCENARIO}. Start the server with the -listScenarios launch option to see the list in its log.`);
	}
	return text;
}

/** The in-game admin password: the wiki says it cannot hold spaces. */
export function cleanAdminPassword(raw) {
	const text = jsonText(raw);
	if (/\s/.test(text)) throw new Error("The admin password cannot have spaces in it (Arma Reforger does not support them).");
	return text;
}

/**
 * The first settings file: the wiki's template with its documented defaults. The keys the wiki says to leave out (bindAddress,
 * bindPort, publicAddress), the rcon block and the mods' entries are not in it. Booleans and numbers are real JSON booleans and
 * numbers (GameCP strips the quotes from "true" and "false" in this file, so quoted ones are not wanted).
 */
export function configObject(p) {
	return {
		publicPort: Number(p.port),
		a2s: { address: "0.0.0.0", port: Number(p.queryPort) },
		game: {
			name: jsonText(p.sessionName || p.name).slice(0, MAX_NAME),
			password: jsonText(p.serverPassword),
			passwordAdmin: cleanAdminPassword(p.adminPassword),
			admins: [],
			scenarioId: cleanScenario(p.scenarioId) || DEFAULT_SCENARIO,
			maxPlayers: playerLimit(p.maxPlayers),
			visible: true,
			crossPlatform: false,
			gameProperties: {
				serverMaxViewDistance: 1600,
				serverMinGrassDistance: 0,
				networkViewDistance: 1500,
				disableThirdPerson: false,
				fastValidation: true,
				battlEye: true,
				VONDisableUI: false,
				VONDisableDirectSpeechUI: false,
				VONCanTransmitCrossFaction: false,
				persistence: {
					autoSaveInterval: 10,
					saveRetention: 10,
					loadSessionSave: true,
					keepSessionSave: false,
					hiveId: 0,
				},
			},
			mods: [],
		},
		operating: {
			lobbyPlayerSynchronise: true,
			disableCrashReporter: false,
			disableServerShutdown: false,
			disableAI: false,
			playerSaveTime: 120,
			aiLimit: -1,
			slotReservationTimeout: 60,
			joinQueue: { maxSize: 0 },
		},
	};
}

const template = {
	id: "armareforger",
	displayName: "Arma Reforger",
	type: "armareforger",
	// The game's RCON is not Source RCON and is switched off here (see the header), so the panel watches the process.
	method: "process",
	updateAppId: "1874900",
	storeAppId: "1874880",
	sharedInstall: false,
	// SteamCMD puts the server straight in the server's folder; the wiki runs ArmaReforgerServer from the installation directory.
	installLayoutRoot: "",
	description:
		"Arma Reforger's dedicated server. Everything is set in one JSON file (Settings tab): the name, passwords, scenario, player limit, rules and mods. Mods are listed there by their Workshop id and the server downloads them itself when it starts; players get them when they join. Players find the server in the in-game server browser or by IP and the game port.",
	fields: ["sessionName", "serverPassword", "adminPassword", "scenarioId"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser, up to 100 characters)", type: "text" },
		adminPassword: { label: "Admin Password (type #login <password> in the in-game chat to get admin rights; no spaces)", type: "text" },
		scenarioId: {
			label: `Scenario (optional; the scenario's .conf path, such as ${DEFAULT_SCENARIO}. Leave blank for that one. The -listScenarios launch option prints the list in the server log)`,
			type: "text",
		},
	},
	// The game's own ports are UDP 2001 (game) and UDP 17777 (Steam query). 17777 is another template's default here, so the query
	// port starts at 17877. The wiki also lists UDP 19999 for RCON, which this template does not switch on.
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: 2001 },
		{ key: "queryPort", label: "Steam Query Port (UDP)", default: 17877 },
	],
	// Rejects a bad scenario or admin password before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => ({
		scenarioId: cleanScenario(raw.scenarioId),
		adminPassword: cleanAdminPassword(raw.adminPassword),
	}),
	buildStartScriptFilename: () => "Start_ArmaReforger.bat",
	// -maxFPS is the wiki's "heavily recommended" setting for a server (60..120); -config and -profile are described in the header.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Arma Reforger Server")}" ${EXE} -config ".\\${CONFIG_REL}" -profile "%~dp0${PROFILE_DIR}" -maxFPS 60`,
			"",
		].join("\r\n"),
	buildConfigFile: (p) => ({ relPath: CONFIG_REL, content: JSON.stringify(configObject(p), null, 2) + "\n" }),
	postWrite: async (p) => ({
		warnings: cleanScenario(p.scenarioId)
			? []
			: [
					`The server is set to the standard campaign scenario (${DEFAULT_SCENARIO}), the one the community guides use. If it does not start, add the -listScenarios launch option, start once, read the scenario paths in the log and set game.scenarioId on the Settings tab.`,
				],
	}),
	buildServerEntry: (p) => {
		const config = `${p.installDir}\\${CONFIG_REL}`;
		return {
			name: p.name,
			type: "armareforger",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			queryPort: p.queryPort,
			sessionName: jsonText(p.sessionName) || p.name,
			serverPassword: p.serverPassword,
			configPath: config,
			configPaths: { "server-config.json": config },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program the wiki and the guides start (no page says which process stays running; to be confirmed on a real install).
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "1874900",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// The profile folder holds what the server writes while it runs (the wiki: logs, and add-ons by default); where inside it the
	// saves are is not stated anywhere, so all of it is kept except the logs and the add-ons, which the game downloads again from
	// the Workshop when it starts. The settings file has the name, the passwords and the mod list.
	backup: {
		paths: [
			{ base: "working", rel: "profile", label: "Server profile (saves and player data)", exclude: ["logs", "addons"] },
			{ base: "working", rel: "Configs", label: "Server settings (and the mod list)" },
		],
	},
	// The wiki says the console logs are in the profile folder; which sub-folder is not stated, so both places are listed.
	logs: [
		{ kind: "dir", base: "working", rel: "profile", label: "Game log" },
		{ kind: "dir", base: "working", rel: "profile/logs", label: "Game log" },
	],
	launchOptions: true,
};

// Ballistic Overkill (Team Ballistic Overkill). Dedicated server: Steam app 416880 (SteamCMD, anonymous login expected but not yet
// confirmed by any source); the base game it is said to need is app 296300.
//
// Facts from the research dossier (docs/research/games/ballisticoverkill/01..04). The sources are the LinuxGSM default config for the game
// (launch line, config file name, stop mode), the Game-Server-Configs repo copy of config.txt (keys and example values) and two
// community pages. There is no developer documentation. Nothing was run on a real install. In short:
//  - the program is BODS, started with -batchmode -nographics -dedicated -configfile=<path>, from the server's own folder (the
//    LinuxGSM default). Only the Linux binary name (BODS.x86_64) is evidenced; the panel is Windows-only, so BODS.exe is an
//    extrapolation and is the first thing to check on a real install (see docs/research/games/ballisticoverkill/05-implementation-notes.md);
//  - the ports are not on the launch line: ServerPort and QueryPort are written into config.txt. The dossier's 27015 and 27016 are
//    example values in a community file, so the defaults here are free ports chosen by the panel (27080 and 27082, the query port two
//    above the game port as the panel's port rules want);
//  - config.txt is Key=value with # comments. The panel writes only the keys it needs (the name, the two ports and the password when one
//    is set). Every other key is left to the game and the Settings tab. The dossier does not say whether the game writes the file itself;
//  - no graceful stop is documented: the panel's Stop asks the window to close and force-ends after 15 seconds;
//  - mods: none managed (the dossier found no mod mechanism for the dedicated server).

const EXE = "BODS.exe";
const CONFIG_REL = "config.txt";

// Free default ports chosen by the panel: the game port, the companion port the game may keep (held by the panel), then the query port.
const DEFAULT_PORT = 27080;
const DEFAULT_QUERY_PORT = 27082;

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/**
 * A value for a line of config.txt (Key=value). A line break would start a new setting, so it is refused rather than altered.
 * Nothing else is refused: the dossier does not say which characters config.txt treats as special.
 */
export function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f]/.test(text)) {
		throw new Error(`${what} has a line break or a control character, which Ballistic Overkill's config.txt cannot hold. Use one line of plain text.`);
	}
	return text;
}

const portNumber = (value, fallback) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= 1024 && n <= 65535 ? n : fallback;
};

const template = {
	id: "ballisticoverkill",
	displayName: "Ballistic Overkill",
	type: "ballisticoverkill",
	// No RCON and no console command for a clean stop is documented: the panel watches the process and asks its window to close.
	method: "process",
	updateAppId: "416880",
	storeAppId: "296300",
	sharedInstall: false,
	// SteamCMD puts the server straight in the server's folder, where config.txt is written (LinuxGSM's layout; to confirm on a real install).
	installLayoutRoot: "",
	description:
		"Ballistic Overkill's dedicated server (Steam app 416880), installed with SteamCMD. The server takes its name, ports and password from config.txt. The install is expected to be anonymous, but this has not been tried, and a community installer says the base game is also needed on the PC. Players connect with the server's address and game port.",
	fields: ["sessionName", "serverPassword"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	// The game port (UDP). The query port is set two above it by the panel's port layout (see blockLayout in portRules.js).
	ports: [
		{ key: "port", label: "Server Port (UDP)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Query Port (UDP)", default: DEFAULT_QUERY_PORT },
	],
	// Rejects a bad name or password before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		const password = cfgText(raw.serverPassword, "The password");
		return { sessionName: name, serverPassword: password };
	},
	buildStartScriptFilename: () => "Start_BallisticOverkill.bat",
	// The program runs from the server's folder, and config.txt is passed as an absolute path (the LinuxGSM default uses the full path).
	// Nothing is added after the config flag, so the launch options form is not offered for this game.
	buildStartScript: (p) =>
		[
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, "Ballistic Overkill Server")}" ${EXE} -batchmode -nographics -dedicated -configfile="%~dp0${CONFIG_REL}"`,
			"",
		].join("\r\n"),
	// The name, the two ports and the password. The Settings tab adds the rest. The ports go here, not on the launch line.
	buildConfigFile: (p) => {
		const name = cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name") || "Ballistic Overkill Server";
		const lines = [`ServerName=${name}`, `ServerPort=${portNumber(p.port, DEFAULT_PORT)}`, `QueryPort=${portNumber(p.queryPort, DEFAULT_QUERY_PORT)}`];
		const password = cfgText(p.serverPassword, "The password");
		if (password) lines.push(`Password=${password}`);
		lines.push("");
		return { relPath: CONFIG_REL, content: lines.join("\r\n") };
	},
	buildServerEntry: (p) => {
		const configPath = `${p.installDir}\\${CONFIG_REL}`;
		return {
			name: p.name,
			type: "ballisticoverkill",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			queryPort: p.queryPort,
			sessionName: cfgText(p.sessionName, "The server name") || p.name,
			serverPassword: p.serverPassword,
			configPath,
			configPaths: { "config.txt": configPath },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// Unverified for Windows: BODS.exe is the Linux binary's name with the Windows extension. The real name is the first check.
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "416880",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: its settings file. The dossier names no save folder, so none is listed.
	backup: {
		paths: [{ base: "working", rel: "config.txt", label: "Server settings" }],
	},
	// Checked on a real install: the game writes no log file in the server folder (the logs folder there is SteamCMD's), so none is listed.
	logs: [],
	launchOptions: false,
};

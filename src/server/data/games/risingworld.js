// Rising World (Rising World team). Dedicated server: Steam app 339010 (anonymous login), game: app 324080 (not used for SteamCMD installs).
//
// Checked on a real install (build 0.9.3.2, docs/research/games/risingworld/06-verification.md). The research dossier described the old Java
// server; the current one is a Unity program, so everything below follows what the install showed:
//  - the program is RisingWorldServer.exe in the install's root, started with `-batchmode -nographics` (a Unity server with no window).
//    There is no server.jar and no Java. `+serverport` and the other `+name=value` arguments of the Java server are ignored.
//  - the settings file is server.properties, with capitalised keys (`Server_Name`, `Server_Port`, `Server_Password`, ...). The game writes
//    the full file with comments on its first start and ignores lowercase keys, so the panel writes the capitalised ones. The shipped
//    server.example.properties lists every key.
//  - ports: the game port is UDP. The web and query port is the game port minus one (TCP and UDP): it answers A2S and a JSON page.
//    The panel's port rules only hold ports above the game port, so the query port is listed in the notes, not held.
//  - the worlds are in Worlds, plugins in Plugins, logs in Logs.
//  - stopping: the panel's Stop closes the server cleanly (the log ends with [END]); the game's own command is `shutdown`.

const EXE = "RisingWorldServer.exe";
const PROPERTIES = "server.properties";

// The game's own default port (4255). 4254 to 4256 are free in the panel's other templates.
const DEFAULT_PORT = 4255;
const DEFAULT_NAME = "Rising World Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/**
 * A value for a line of server.properties. A line break would start a new setting, and a backslash is an escape in a .properties file,
 * so such a value is refused rather than changed.
 */
function propText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f\\]/.test(text)) {
		throw new Error(`${what} cannot hold a backslash or a line break. Use plain letters, digits, spaces and punctuation without a backslash.`);
	}
	return text;
}

const template = {
	id: "risingworld",
	displayName: "Rising World",
	type: "risingworld",
	// The panel watches RisingWorldServer.exe, which is the program the server runs as.
	method: "process",
	updateAppId: "339010",
	storeAppId: "324080",
	sharedInstall: false,
	// SteamCMD puts RisingWorldServer.exe in the install folder's root.
	installLayoutRoot: "",
	description:
		"Rising World's dedicated server (a Unity program, RisingWorldServer.exe). It installs anonymously and reads its settings from server.properties. The game port is UDP, and the web and query port is the port just below it. The panel's Stop closes it cleanly. Back up the worlds before you update the server.",
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
	},
	ports: [{ key: "port", label: "Game Port (UDP; the web and query port is the port below it)", default: DEFAULT_PORT }],
	resolveParams: async (raw) => {
		const name = propText(raw.sessionName, "The server name") || propText(raw.name, "The server name");
		return { sessionName: name };
	},
	buildStartScriptFilename: () => "Start_RisingWorld.bat",
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Rising World Server")}" ${EXE} -batchmode -nographics`,
			"",
		].join("\r\n"),
	// The game fills in every other key on its first start; it keeps the ones written here.
	buildConfigFile: (p) => {
		const name = propText(p.sessionName, "The server name") || propText(p.name, "The server name") || DEFAULT_NAME;
		return {
			relPath: PROPERTIES,
			content: [`Server_Name=${name}`, `Server_Port=${Number(p.port)}`, ""].join("\r\n"),
		};
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "risingworld",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		sessionName: propText(p.sessionName, "The server name") || p.name,
		configPath: `${p.installDir}\\${PROPERTIES}`,
		configPaths: { [PROPERTIES]: `${p.installDir}\\${PROPERTIES}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "339010",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The worlds (each world is a subfolder of Worlds), the plugins folder, the player lists and the settings file.
	backup: {
		paths: [
			{ base: "working", rel: PROPERTIES, label: "Server settings" },
			{ base: "working", rel: "Worlds", label: "Saved worlds" },
			{ base: "working", rel: "Plugins", label: "Plugins" },
			{ base: "working", rel: "whitelist", label: "Whitelist" },
			{ base: "working", rel: "blacklist", label: "Blacklist" },
		],
	},
	// The server writes its log files in the Logs subfolder.
	logs: [{ kind: "dir", base: "working", rel: "Logs", label: "Server log" }],
	// The launch line has only the two Unity flags the game needs, so there is nothing to edit there.
	launchOptions: false,
};

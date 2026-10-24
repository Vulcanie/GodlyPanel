// Motor Town: Behind The Wheel (Motor Town developer). Dedicated server tool: Steam app 2223650 ("Motor Town: Behind The Wheel -
// Dedicated Server", windows only, parent game app 1369670). Built from the research dossier docs/research/games/motortown/
// (confidence low: one vendor guide for the exe, the app id and the launch line; nothing checked on a real install).
//
// SIGN-IN: the vendor guide says an anonymous SteamCMD install fails with "No subscription" and that the install needs an owning
// account plus the beta code `motortowndedi`. The create flow (services/serverCreationService.js, runSteamCmd) always logs in as
// `anonymous` and has no template hook for an account or a beta code, so this module cannot ask for a Steam login yet. Until
// that flow gains a hook, the install will fail as the guide predicts. See 05-implementation-notes.md.
//
// - The program is MotorTown\Binaries\Win64\MotorTownServer-Win64-Shipping.exe (vendor guide only). The start script runs it by
//   its relative path from the install folder, with the map token and the two flags from the guide.
// - The panel passes -Port and -QueryPort (the guide's own overrides). Defaults 7777 and 27015 are the guide's, but both 27015 and
//   7777 are defaults of other modules here, so this module uses 9600 and 9602 (see the notes).
// - Settings are in DedicatedServerConfig.json in the install folder. The guide says to rename DedicatedServerConfig_Sample.json
//   to that name, so the panel copies the shipped sample on creation (copyInstalledFiles) and never overwrites an existing file.
// - Stop: no quit command or RCON is documented. The panel closes the window and, after 15 seconds, ends the process.
//
// Not done, and why:
//  - no Web API (port 8080, off by default and not part of the guide's launch line);
//  - no mods: the vehicle-mod switch (bAllowModdedVehicle) is not in the panel's form; the guide names it but not its JSON shape;
//  - no `-log` file path: the guide gives no log location, so the Logs tab uses the Unreal default folder, unverified.

const EXE = "MotorTown\\Binaries\\Win64\\MotorTownServer-Win64-Shipping.exe";
const EXE_NAME = "MotorTownServer-Win64-Shipping.exe";
const MAP = "Jeju_World?listen?";
const SAMPLE_REL = "DedicatedServerConfig_Sample.json";
const CONFIG_REL = "DedicatedServerConfig.json";

// Chosen to avoid every other template's ports, with a margin of 3 either side for the game port.
const DEFAULT_PORT = 9600;
const DEFAULT_QUERY_PORT = 9602;
const DEFAULT_NAME = "Motor Town Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on, and no quote. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A port as a whole number, or the default when none was given. Anything else is refused. */
function portOf(value, fallback, what) {
	if (value === undefined || value === null || value === "") return fallback;
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`The ${what} must be a whole number from 1 to 65535.`);
	return n;
}

/** The two ports as the start script and the entry use them. The query port must be at least two above the game port. */
function portsOf(p) {
	const port = portOf(p.port, DEFAULT_PORT, "game port");
	const queryPort = portOf(p.queryPort, DEFAULT_QUERY_PORT, "query port");
	if (queryPort < port + 2) throw new Error(`The query port must be at least ${port + 2}, two above the game port.`);
	return { port, queryPort };
}

const template = {
	id: "motortown",
	displayName: "Motor Town: Behind The Wheel",
	type: "motortown",
	method: "process",
	updateAppId: "2223650",
	storeAppId: "1369670",
	sharedInstall: false,
	installLayoutRoot: "",
	description:
		"Motor Town: Behind The Wheel's dedicated server (MotorTownServer-Win64-Shipping.exe). The panel starts it on the map Jeju_World with the game port and the query port. The server's name, password, player limit and message are in DedicatedServerConfig.json, which the panel creates from the game's sample file. The install needs an owning Steam account and the beta code, which this panel cannot give yet, so the install is expected to fail until that is added.",
	fields: [],
	ports: [
		{ key: "port", label: "Game Port (TCP and UDP)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Steam Query Port (UDP)", default: DEFAULT_QUERY_PORT },
	],
	buildStartScriptFilename: () => "Start_MotorTown.bat",
	buildStartScript: (p) => {
		const { port, queryPort } = portsOf(p);
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} ${MAP} -server -log -useperfthreads -Port=${port} -QueryPort=${queryPort}`,
			"",
		].join("\r\n");
	},
	// The game's own sample becomes the settings file the panel edits. An existing file is never overwritten.
	copyInstalledFiles: [{ from: SAMPLE_REL, to: CONFIG_REL }],
	buildServerEntry: (p) => {
		const { port, queryPort } = portsOf(p);
		return {
			name: p.name,
			type: "motortown",
			method: "process",
			host: "127.0.0.1",
			port,
			queryPort,
			sessionName: batSafe(p.name, DEFAULT_NAME),
			configPath: `${p.installDir}\\${CONFIG_REL}`,
			configPaths: {
				"DedicatedServerConfig.json": `${p.installDir}\\${CONFIG_REL}`,
			},
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			processName: EXE_NAME,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "2223650",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	backup: {
		paths: [
			{ base: "working", rel: CONFIG_REL, label: "Server settings" },
			{ base: "working", rel: "MotorTown/Saved/SaveGames", label: "Saved worlds" },
		],
	},
	// The log folder is the Unreal default for the project folder; the vendor guide does not name it. Unverified.
	logs: [{ kind: "dir", base: "working", rel: "MotorTown/Saved/Logs", label: "Server log" }],
	// The launch line is written by the panel, so the form does not add to it.
	launchOptions: false,
};

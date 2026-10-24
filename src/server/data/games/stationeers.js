// Stationeers (Rocketwerkz). Dedicated server: Steam app 600760 (anonymous login). Built from the research dossier
// docs/research/games/stationeers/ (confidence low). NOT yet run on a real install: see 05-implementation-notes.md.
//  - the program is rocketstation_DedicatedServer.exe, started from the server folder. Every setting goes on the launch line
//    through -settings "<Name> <value>" pairs. The dossier's sources say ports and passwords are only honoured as launch arguments.
//  - the world: -LOAD Panel <world type>. Checked on a real install: -LOAD makes the save saves\Panel the first time and loads it on every
//    start after (-NEW would make a new world each start). The dossier's world types are out of date: the game lists Europa3, Lunar,
//    Mars2, MimasHerschel, Venus, Vulcan2 and refuses any other name.
//  - -batchmode -nographics -logfile server.log keep it headless and put the log in the server folder. Stop closes gracefully.
//  - ports: GamePort and UpdatePort are the dossier's game and Steam ports (27016 and 27015 in its samples). Those numbers are
//    used by other templates here, so this module uses 27816 and 27818 instead, and passes them on the launch line.
//
// Not done, and why:
//  - no setting.xml: its folder is not evidenced, and no key has a known default or type.
//  - no stop method: the dossier finds no stop command, RCON or quit command. The panel closes the window.
//  - the game does not answer A2S; the port check is the bound UDP port and the RakNet line in server.log.
//  - no meta port (TCP 8081): only one source names it.

const EXE = "rocketstation_DedicatedServer.exe";

// Chosen to avoid the other templates' ports and the companion ports they keep free (see the unit test).
const DEFAULT_PORT = 27816;
const DEFAULT_UPDATE_PORT = 27818;
// The stable world types the XGaming guide lists. Any other name is refused, so a typo is not sent to the game.
const WORLDS = ["Mars2", "Europa3", "Lunar", "MimasHerschel", "Venus", "Vulcan2"];
const DEFAULT_WORLD = WORLDS[0];
const SAVE_NAME = "Panel";
const DEFAULT_NAME = "Stationeers Server";

/** A text safe to put inside a .bat `start` title or a quoted -settings value: nothing cmd would act on. */
const safeText = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A password goes on the command line unquoted, so spaces, quotes and cmd characters are refused rather than changed. */
function passwordOf(value) {
	const text = String(value ?? "");
	if (text === "") return "";
	if (/[\u0000-\u001f\s"%&|<>^!]/.test(text)) {
		throw new Error("The server password cannot hold a space, a quote or one of these characters: % & | < > ^ !. Choose another password.");
	}
	return text;
}

/** The world type goes on the command line, so only letters, digits and underscores are allowed. */
function worldOf(value) {
	const text = String(value ?? "").trim() || DEFAULT_WORLD;
	const found = WORLDS.find((w) => w.toLowerCase() === text.toLowerCase());
	if (!found) throw new Error(`"${text.slice(0, 40)}" is not a world type. Use one of: ${WORLDS.join(", ")}.`);
	return found;
}

const portOf = (value, fallback, what) => {
	if (value === undefined || value === null || value === "") return fallback;
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`The ${what} must be a whole number from 1 to 65535.`);
	return n;
};

const template = {
	id: "stationeers",
	displayName: "Stationeers",
	type: "stationeers",
	// The panel watches the server program the start script runs. Which process stays running is not in the dossier.
	method: "process",
	updateAppId: "600760",
	sharedInstall: false,
	installLayoutRoot: "",
	description:
		"Stationeers' dedicated server (rocketstation_DedicatedServer.exe). The panel starts it headless with a save called Panel (made the first time, from the world type you pick, and loaded every time after) and sets the name, the password and the two ports on the launch line. Unconfirmed: whether a restart keeps the saved world, where the save is kept, and how to stop it cleanly. Back up the world by hand before you update.",
	fields: ["sessionName", "mapCode", "serverPassword"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		mapCode: { label: `World Type (such as ${DEFAULT_WORLD})`, type: "text" },
		serverPassword: { label: "Server Password (leave empty for an open server; no spaces)", type: "text" },
	},
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Steam Update Port (UDP)", default: DEFAULT_UPDATE_PORT },
	],
	resolveParams: async (raw) => ({
		sessionName: safeText(raw.sessionName, "") || safeText(raw.name, DEFAULT_NAME),
		mapCode: worldOf(raw.mapCode),
		serverPassword: passwordOf(raw.serverPassword),
	}),
	buildStartScriptFilename: () => "Start_Stationeers.bat",
	buildStartScript: (p) => {
		const world = worldOf(p.mapCode);
		const port = portOf(p.port, DEFAULT_PORT, "game port");
		const updatePort = portOf(p.queryPort, DEFAULT_UPDATE_PORT, "Steam update port");
		const serverName = safeText(p.sessionName, "") || safeText(p.name, DEFAULT_NAME);
		const password = passwordOf(p.serverPassword);
		const settings = [
			`ServerName "${serverName}"`,
			"ServerVisible true",
			"StartLocalHost true",
			`GamePort ${port}`,
			`UpdatePort ${updatePort}`,
		];
		if (password) settings.push(`ServerPassword ${password}`);
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${safeText(p.name, DEFAULT_NAME)}" ${EXE} -batchmode -nographics -logfile "%~dp0server.log" -LOAD ${SAVE_NAME} ${world} -settings ${settings.join(" ")}`,
			"",
		].join("\r\n");
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "stationeers",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT, "game port"),
		queryPort: portOf(p.queryPort, DEFAULT_UPDATE_PORT, "Steam update port"),
		sessionName: safeText(p.sessionName, "") || safeText(p.name, DEFAULT_NAME),
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "600760",
		autoUpdate: false,
	}),
};

export default {
	template,
	// Checked on a real install: saves are in saves\\Panel; setting.xml holds the game's own settings.
	backup: { paths: [{ base: "working", rel: "saves", label: "Saved worlds" }, { base: "working", rel: "setting.xml", label: "Game settings" }] },
	logs: [{ kind: "file", base: "working", rel: "server.log", label: "Server log" }],
	// The launch line is written by the panel (world, name, ports, password), so the form does not add to it.
	launchOptions: false,
};

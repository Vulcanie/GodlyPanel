// Operation: Harsh Doorstop (Bohemia-style Unreal Engine shooter, Donkeh). Dedicated server: Steam app 950900 ("Operation: Harsh Doorstop
// Dedicated Server"); the game is app 736590. Built from the research dossier (docs/research/games/ohd/, confidence low) and checked on a
// real Windows install (docs/research/games/ohd/06-verification.md).
//
// What it relies on:
//  - the program is HarshDoorstopServer-Win64-Shipping.exe in HarshDoorstop\Binaries\Win64. The dossier only has the Linux name
//    (HarshDoorstopServer-Linux-Shipping, from the Pterodactyl egg). The Windows name is the Unreal convention applied to that name, not
//    a source. Checked: that is the real name, and the panel watches it.
//  - the start line is the egg's startup line, minus the RCON flags (no RCON is enabled, since no RCON protocol is verified):
//    <exe> HarshDoorstop <Map>?MaxPlayers=32 -SteamServerName="..." -Port=... -MULTIHOME=0.0.0.0 -QueryPort=...
//  - ports: the dossier gives game 7777 and query 27005 (egg) or 27015 (host page). Those are not used here: the panel's rule is to keep
//    ports in 27xxx-29xxx and clear of other templates. Game 27050 and query 27052 are the defaults instead (game + 2 for the companion
//    rule). Both are the panel's choice, not the game's. Protocol (TCP/UDP) is NOT FOUND in the dossier.
//  - the host page's map names (Anviloy, Khafji, ...) do NOT exist in the current build: the server logs "failed to resolve Anviloy.umap"
//    and falls back to AAS-TestMap. The shipped HarshDoorstopServer.bat uses AAS-TestMap. The maps in the paks are named like
//    Jaziira_AASSmall, so that is the default; it loaded and answered A2S as Jaziira_AASSmall.
//
// Not done, and why:
//  - no Game.ini: the dossier names only the Linux folder (HarshDoorstop/Saved/Config/LinuxServer), the Windows folder is NOT FOUND, and
//    the key names are conflicting or from one host page. Nothing is written; the panel passes the name on the command line instead.
//  - no RCON and no stop command. Checked: the panel's Stop does not end it in 15 s, so the panel force-ends the process.
//  - no password field: no password flag is evidenced for the server (the host panel has a field, its flag is NOT FOUND).
//  - no mods: the Workshop Mods field is a host-panel field, and the self-hosted method conflicts (SFTP into a Mods folder). Left out.
//  - the game writes HarshDoorstop\Saved\Logs\HarshDoorstop.log (without -log) and HarshDoorstop\Saved\Config\WindowsServer\GameUserSettings.ini.

const EXE = "HarshDoorstopServer-Win64-Shipping.exe";
const RUN_DIR = "HarshDoorstop\\Binaries\\Win64";
const PROJECT = "HarshDoorstop";

// The ports the dossier's sources give are 7777 and 27005/27015; the ports used here are the panel's own picks (see the header).
const DEFAULT_PORT = 27050;
const DEFAULT_QUERY_PORT = 27052;
const DEFAULT_MAP = "Jaziira_AASSmall";
const DEFAULT_NAME = "Operation Harsh Doorstop Server";
// The egg's example and the only player count the dossier names with a source (egg MAX_PLAYERS example). A panel choice, not a game default.
const MAX_PLAYERS = 32;

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** The server name goes inside a quoted -SteamServerName="..." argument: a quote or a command character is removed. */
const nameText = (value, fallback) => batSafe(value, fallback);

/** A map name goes straight onto the command line, so only letters, digits, underscores and hyphens are allowed. */
function mapName(value) {
	const text = String(value ?? "").trim() || DEFAULT_MAP;
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(text)) {
		throw new Error(`"${text.slice(0, 60)}" is not a map name. Use the map's name with no spaces or quotes, such as ${DEFAULT_MAP}.`);
	}
	return text;
}

/** A port as a whole number, or the default when none was given. */
const portOf = (value, fallback) => {
	const n = Math.floor(Number(value));
	return Number.isFinite(n) && n > 0 && n < 65536 ? n : fallback;
};

const template = {
	id: "ohd",
	displayName: "Operation: Harsh Doorstop",
	type: "ohd",
	// The panel watches the Shipping exe that the start script runs (the process that stays running, per the Unreal layout). UNVERIFIED.
	method: "process",
	updateAppId: "950900",
	storeAppId: "736590",
	sharedInstall: false,
	// SteamCMD puts the install in the folder root; the server program sits in HarshDoorstop\Binaries\Win64 under it.
	installLayoutRoot: "",
	description:
		"Operation: Harsh Doorstop's dedicated server (a Windows program in HarshDoorstop\\Binaries\\Win64). The panel starts it with the map, the server name and two ports. The Windows program name, the port protocols and the Stop behaviour are not confirmed yet, so check the first start by hand.",
	fields: ["sessionName", "mapCode"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser)", type: "text" },
		mapCode: { label: `Map (case-sensitive, such as ${DEFAULT_MAP})`, type: "text" },
	},
	ports: [
		{ key: "port", label: "Game Port", default: DEFAULT_PORT },
		{ key: "queryPort", label: "Steam Query Port", default: DEFAULT_QUERY_PORT },
	],
	resolveParams: async (raw) => ({
		sessionName: nameText(raw.sessionName, "") || nameText(raw.name, DEFAULT_NAME),
		mapCode: mapName(raw.mapCode),
	}),
	buildStartScriptFilename: () => "Start_OHD.bat",
	buildStartScript: (p) => {
		const map = mapName(p.mapCode);
		const port = portOf(p.port, DEFAULT_PORT);
		const queryPort = portOf(p.queryPort, DEFAULT_QUERY_PORT);
		const serverName = nameText(p.sessionName, "") || nameText(p.name, DEFAULT_NAME);
		return [
			"@echo off",
			'cd /d "%~dp0"',
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${RUN_DIR}\\${EXE} ${PROJECT} ${map}?MaxPlayers=${MAX_PLAYERS} -SteamServerName="${serverName}" -Port=${port} -MULTIHOME=0.0.0.0 -QueryPort=${queryPort}`,
			"",
		].join("\r\n");
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "ohd",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p.port, DEFAULT_PORT),
		queryPort: portOf(p.queryPort, DEFAULT_QUERY_PORT),
		sessionName: nameText(p.sessionName, "") || nameText(p.name, DEFAULT_NAME),
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "950900",
		autoUpdate: false,
	}),
};

export default {
	template,
	backup: { paths: [{ base: "working", rel: "HarshDoorstop/Saved/Config/WindowsServer", label: "Server settings (WindowsServer config folder)" }] },
	logs: [{ kind: "file", base: "working", rel: "HarshDoorstop/Saved/Logs/HarshDoorstop.log", label: "Server log" }],
	// The launch line is written by the panel, so there is no launch form.
	launchOptions: false,
};

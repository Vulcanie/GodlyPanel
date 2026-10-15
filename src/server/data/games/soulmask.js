import crypto from "node:crypto";
import { parseWorkshopIds } from "./dst.js";

// Soulmask (CampFire Studio). Dedicated server tool: Steam app 3017310 (anonymous login works), game: app 2646460.
// Built from the research dossier (research/soulmask/01..04: the official-style wiki page https://soulmask.fandom.com/wiki/Private_Server,
// saraserenity.net's dedicated server guide with its full parameter table, and the SoulMask-Server-Manager / WindowsGSM sources); no
// real install has been through the panel's create flow, so the points listed as unverified in the notes still need a real run.
//
// - The whole server is set up by launch arguments: the name, passwords, player limit, ports, PvE or PvP and the save timers are all
//   on the launch line. The one settings file (WS\Saved\GameplaySettings\GameXishu.json, made by the game on its first start) has no
//   explanation anywhere in the dossier, so the panel offers no form for it (see the notes that came with this module).
// - The Shipping program is started directly, from the install folder, with SteamAppId set: that is what the dedicated-server guide's
//   own serve.bat, the Server Manager and WindowsGSM do. The root WSServer.exe is a wrapper that those tools avoid. WHICH of the two
//   stays running is not confirmed by any source; the Shipping one is what the panel starts, so it is what it tracks.
// - STOPPING: the game only saves safely on a command typed into its local telnet console (EchoPort: `saveworld 1`, then `quit`),
//   which the panel has no way to send. The panel closes the window and then force-kills the program, and the game's own docs warn
//   that closing it "may lead to data rollback". The world reaches the disk every -backup seconds (900 here), so a Stop can lose up to
//   that much play. The guide for the game says so.
// - Mods are Steam Workshop mods by id: `-mod="ID1,ID2"` on the line, only when the form's mods field is filled.

const SHIPPING_PATH = "WS\\Binaries\\Win64\\WSServer-Win64-Shipping.exe";
const SHIPPING_EXE = "WSServer-Win64-Shipping.exe";
const STEAM_APP_ID = "2646460";
const DEFAULT_LEVEL = "Level01_Main";

// The maps: the level name is the first argument of the line. Level01_Main is the base game's Cloud Mist Forest; DLC_Level01_Main is the
// Shifting Sands map (Fandom says "only one: Level01_Main", written before the DLC; the DLC name is from the indifferentbroccoli image's
// map table, the Server Manager and a hosting guide).
export const MAP_CHOICES = [
	{ code: DEFAULT_LEVEL, label: "Cloud Mist Forest (base game)" },
	{ code: "DLC_Level01_Main", label: "Shifting Sands (needs the DLC)" },
];

// The three Steam DLLs that the dedicated-server guides copy from the install folder to the folder of the Shipping program, which
// is what lets it start the Steam side. The files are from the guides (IONOS names these three; the dedicated-server guide's update
// script copies the folder's DLLs); whether the current build still needs it is not verified.
const STEAM_DLLS = ["steamclient64.dll", "tier0_s64.dll", "vstdlib_s64.dll"];

// The window title in `start /MIN "<title>"`. A server's name is typed by a person, and cmd acts on these characters.
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").trim() || "Soulmask";

// A value written inside double quotes on the launch line. A quote can't be escaped in there, so it is dropped (the Server Manager
// does the same); a % would start a variable in a .bat, so it is doubled; a backslash right before the closing quote would swallow it,
// so trailing ones are dropped.
const quoted = (value) => `"${String(value ?? "").replace(/["\u0000-\u001f]/g, "").replace(/%/g, "%%").replace(/\\+$/, "")}"`;

const wholeNumber = (value, fallback, min = 1, max = 9999) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

const levelOf = (mapCode) => MAP_CHOICES.find((m) => m.code === mapCode)?.code ?? DEFAULT_LEVEL;

// The ids in the mods field, once it has been through resolveParams (a comma list); anything that is not an id is dropped.
const modIdsOf = (mods) =>
	[...new Set(String(mods ?? "").split(/[\s,;]+/).filter((id) => /^\d{5,12}$/.test(id)))].slice(0, 100);

const template = {
	id: "soulmask",
	displayName: "Soulmask",
	type: "soulmask",
	method: "process",
	updateAppId: "3017310",
	storeAppId: "2646460",
	sharedInstall: false,
	// SteamCMD puts WSServer.exe and the WS folder directly in the install folder.
	installLayoutRoot: "",
	// The name, the map, the join password (-PSW), the admin password (-adminpsw) and the Workshop mods (-mod).
	fields: ["sessionName", "mapCode", "serverPassword", "adminPassword", "mods"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server list)", type: "text" },
		adminPassword: { label: "Admin Password (in the game press ~ and type: gm key followed by this password)", type: "text" },
		mods: { label: "Steam Workshop mod ids or links, comma-separated (optional). The server downloads them when it starts; every player must subscribe to the same mods.", type: "text" },
	},
	mapChoices: MAP_CHOICES,
	// The game's own defaults are 8777 (UDP, players), 27015 (UDP, the Steam query: Core Keeper already uses it here) and 18888 (TCP,
	// the local telnet console). The query port is the game port + 2, because the port right after the game port is kept free for
	// every game. The console port is only reachable from this PC and needs no firewall rule.
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: 8777 },
		{ key: "queryPort", label: "Query Port (UDP)", default: 8779 },
		{ key: "echoPort", label: "Console Port (TCP, this PC only)", default: 18888 },
	],
	// Rejects a bad mod list before the multi-gigabyte download starts, and hands the cleaned list on.
	resolveParams: async (raw) => {
		const ids = parseWorkshopIds(raw.mods);
		return { mods: ids.join(",") };
	},
	buildStartScriptFilename: () => "Start_Soulmask.bat",
	// The line of the dedicated-server guide (-log -server -UTF8Output the ports -forcepassthrough, then the name and passwords, then the
	// save timers) with this server's values. -pve is the mode the wiki's own examples use. -serverpm=2 turns the ban list on: without it
	// every permission list is off after a restart, so bans do not hold. The join password is left off when empty (an open server).
	buildStartScript: (p) => {
		const ids = modIdsOf(p.mods);
		const adminPassword = String(p.adminPassword ?? "").trim() || crypto.randomBytes(6).toString("hex");
		return [
			"@echo off",
			"cd /d \"%~dp0\"",
			`set SteamAppId=${STEAM_APP_ID}`,
			`start /MIN "${windowTitle(p.name)}" "${SHIPPING_PATH}" ${levelOf(p.mapCode)} -log -server -UTF8Output -PORT=${Number(p.port)} -QueryPort=${Number(p.queryPort)} -EchoPort=${wholeNumber(p.echoPort, 18888, 1, 65535)} -forcepassthrough -SteamServerName=${quoted(p.sessionName || p.name)} -MaxPlayers=${wholeNumber(p.maxPlayers, 20)}${p.serverPassword ? ` -PSW=${quoted(p.serverPassword)}` : ""} -adminpsw=${quoted(adminPassword)} -pve -saving=600 -backup=900 -serverpm=2${ids.length ? ` -mod="${ids.join(",")}"` : ""}`,
			"",
		].join("\r\n");
	},
	copyInstalledFiles: STEAM_DLLS.map((dll) => ({ from: dll, to: `WS\\Binaries\\Win64\\${dll}` })),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "soulmask",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		echoPort: p.echoPort,
		sessionName: p.sessionName || p.name,
		serverPassword: p.serverPassword,
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// Not confirmed by any source (see the notes): the Shipping program is the one the script starts.
		processName: SHIPPING_EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "3017310",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The world is WS\Saved\Worlds\Dedicated\<level>\world.db (with the game's own backup copies); the gameplay settings are one file;
	// the ban and allow lists are plain text files in WS\Saved. Missing ones are skipped.
	backup: {
		paths: [
			{ base: "working", rel: "WS/Saved/Worlds", label: "Saved worlds" },
			{ base: "working", rel: "WS/Saved/GameplaySettings", label: "Gameplay settings (GameXishu.json)" },
			{ base: "working", rel: "WS/Saved/Config/WindowsServer/Engine.ini", label: "Engine.ini" },
			{ base: "working", rel: "WS/Saved/BlackAccountList.txt", label: "Banned accounts" },
			{ base: "working", rel: "WS/Saved/WhiteAccountList.txt", label: "Allowed accounts" },
			{ base: "working", rel: "WS/Saved/BlackIPList.txt", label: "Banned IP addresses" },
			{ base: "working", rel: "WS/Saved/WhiteIPList.txt", label: "Allowed IP addresses" },
			{ base: "working", rel: "WS/Saved/BanSpeek.txt", label: "Muted players" },
		],
	},
	// WS.log; the dossier gives WS\Saved\Logs\WS.log as the log.
	logs: [{ kind: "dir", base: "working", rel: "WS/Saved/Logs", label: "Game log" }],
	launchOptions: true,
};

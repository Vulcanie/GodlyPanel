import crypto from "node:crypto";

// Icarus (RocketWerkz). Dedicated server app 2089300, game 1149460.
//
// Facts from the research dossier (research/icarus/01..04), whose sources are the official RocketWerkz wiki
// (https://github.com/RocketWerkz/IcarusDedicatedServer/wiki) and the repo's ServerSettings.ini:
//  - the server is started with -Log, the name comes from -SteamServerName= (SessionName in the ini does nothing),
//    the ports are -PORT= (UDP, default 17777) and -QueryPort= (UDP, default 27015);
//  - there is no RCON listener: the "RCON commands" are typed into the in-game chat after /AdminLogin;
//  - ServerSettings.ini is only made by the game once the server has reached its lobby, so the panel writes the official
//    12-key template (with the name and passwords filled in) before the first start;
//  - difficulty is not in any file: it is part of the -CreateProspect="<Type> <Difficulty 1-4> <Hardcore> <SaveName>" argument,
//    or is picked in the in-game lobby. With no prospect argument the server waits in a lobby, which is what the panel starts.
// Not verified on a real install (see research/icarus/05-implementation-notes.md): which of IcarusServer.exe and
// IcarusServer-Win64-Shipping.exe stays running (the Shipping one is started directly, as WindowsGSM, FireDaemon, the Pterodactyl
// egg and the mornedhels image do), where Saved ends up, and what a closed window does to the world.

const SHIPPING_EXE = "IcarusServer-Win64-Shipping.exe";
const SHIPPING_PATH = `Icarus\\Binaries\\Win64\\${SHIPPING_EXE}`;
const SETTINGS_REL = "Icarus\\Saved\\Config\\WindowsServer\\ServerSettings.ini";

/**
 * A name that is safe on the launch line of a .bat: no quotes, percent signs, or characters cmd would act on. The game takes at most
 * 64 characters (-SteamServerName=).
 */
export function batSafeName(value, fallback = "Icarus Server") {
	const cleaned = String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 64)
		.trim();
	return cleaned || fallback;
}

/** A value for a line of ServerSettings.ini: one line, no surrounding spaces. */
const iniValue = (value) => String(value ?? "").replace(/[\u0000-\u001f]/g, "").trim();

const wholeNumber = (value, fallback) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= 1 ? n : fallback;
};

const template = {
	id: "icarus",
	displayName: "Icarus",
	type: "icarus",
	// No RCON exists, so there is nothing to ask the server to stop with: the panel closes its window and force-kills after its grace
	// time. The query port answers Steam queries (checked on a real install), so the server is watched through it.
	method: "gamedig",
	queryProtocol: "icarus",
	updateAppId: "2089300",
	storeAppId: "1149460",
	sharedInstall: false,
	installLayoutRoot: "",
	fields: ["sessionName", "serverPassword", "adminPassword"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server browser, 64 characters at most)", type: "text" },
		adminPassword: { label: "Admin Password (type /AdminLogin followed by it in the game's chat to become admin)", type: "text" },
	},
	// Both UDP. 27015 is Core Keeper's default query port, so the query port here is the game port + 2 (the panel keeps the port
	// after the game port free for every game).
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: 17777 },
		{ key: "queryPort", label: "Query Port (UDP)", default: 17779 },
	],
	buildStartScriptFilename: () => "Start_Icarus.bat",
	// The program is started from the server's folder, as the tools that run it as a service do. -Log shows the log window
	// (without it the official docs say nothing is visible). No -CreateProspect: the server waits in its lobby (or resumes the last
	// world: ResumeProspect is True in the settings file) and players pick or create a world there.
	buildStartScript: (p) => {
		const name = batSafeName(p.sessionName || p.name);
		return [
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafeName(p.name, name)}" "${SHIPPING_PATH}" -Log -SteamServerName="${name}" -PORT=${p.port} -QueryPort=${p.queryPort}`,
			"",
		].join("\r\n");
	},
	// The official template (RocketWerkz/IcarusDedicatedServer ServerSettings.ini) with this server's details in it.
	buildConfigFile: (p) => ({
		relPath: SETTINGS_REL,
		content: [
			"[/Script/Icarus.DedicatedServerSettings]",
			// Documented as doing nothing (the name is -SteamServerName= on the launch line); filled in for the day it does.
			`SessionName=${iniValue(batSafeName(p.sessionName || p.name))}`,
			`JoinPassword=${iniValue(p.serverPassword)}`,
			// The official page documents 1 to 8; an empty value is left for the game's own default only when none is asked for.
			`MaxPlayers=${wholeNumber(p.maxPlayers, 8)}`,
			// Left empty, anyone could type /AdminLogin and become admin, so a password is always set.
			`AdminPassword=${iniValue(p.adminPassword) || crypto.randomBytes(6).toString("hex")}`,
			"ShutdownIfNotJoinedFor=300.000000",
			"ShutdownIfEmptyFor=300.000000",
			"AllowNonAdminsToLaunchProspects=True",
			"AllowNonAdminsToDeleteProspects=False",
			"LoadProspect=",
			"CreateProspect=",
			"ResumeProspect=True",
			"LastProspectName=",
			"",
		].join("\r\n"),
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "icarus",
		method: "gamedig",
		queryProtocol: "icarus",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		sessionName: p.sessionName,
		serverPassword: p.serverPassword,
		configPath: `${p.installDir}\\${SETTINGS_REL}`,
		configPaths: { "ServerSettings.ini": `${p.installDir}\\${SETTINGS_REL}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: SHIPPING_EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "2089300",
		autoUpdate: false,
	}),
};

export default {
	template,
	// Worlds ("prospects") are one .json each; the ban list and admin list are plain text files in Saved. Missing ones are skipped.
	backup: {
		paths: [
			{ base: "working", rel: "Icarus/Saved/PlayerData/DedicatedServer/Prospects", label: "Saved worlds (prospects)" },
			{ base: "working", rel: "Icarus/Saved/Config/WindowsServer", label: "Server settings" },
			{ base: "working", rel: "Icarus/Saved/PlayerBanList.txt", label: "Ban list" },
			{ base: "working", rel: "Icarus/Saved/AdminWhitelist.txt", label: "Admin list" },
		],
	},
	logs: [{ kind: "dir", base: "working", rel: "Icarus/Saved/Logs", label: "Game log" }],
	launchOptions: true,
};

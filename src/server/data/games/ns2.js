// Natural Selection 2 (Unknown Worlds). Dedicated server: Steam app 4940 ("Natural Selection 2 Dedicated Server", resolved in the dossier with
// api.steamcmd.net and LinuxGSM's config). The game client is app 4920 and is not used for SteamCMD installs.
//
// Checked on a real Windows install (docs/research/games/ns2/06-verification.md). The dossier was written from Linux sources; the install showed:
//  - the program is x64\Server.exe. The Server.exe in the install's root is a stub that does not start the game, so the start script runs
//    x64\Server.exe from the root. The running process is still called Server.exe, which is what the panel watches.
//  - the start line uses the three arguments the forum calls required (-name, -map, -limit). The map (ns2_summit) and the player limit (20)
//    are the forum's own example values, not documented defaults. The panel's start script adds the game port (-port), points the config
//    folder into the server's folder (-config_path) and the log folder too (-logdir), since both default to the user's AppData.
//  - ports: the game answers A2S on the game port + 1, and the panel's port rules reserve that companion port.
//  - the game creates its config files on the first start in the -config_path folder, and the panel's catalog covers mapcycle.json only.
//  - the mods come from the -mods launch argument (Workshop IDs, space separated), which the launch form offers. The Workshop mod storage
//    still goes to AppData\Roaming\Natural Selection 2\workshop unless -modstorage is given.
//  - stopping: the game has no clean stop the panel uses; Stop closes the window and, after 15 seconds, ends the program. Back up before you
//    stop or update.

const EXE = "Server.exe";
const EXE_PATH = "x64\\Server.exe";

/** A text safe to put inside a .bat `start` title or a quoted argument: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A server name for the -name argument. A line break is refused; the characters cmd would act on are dropped. */
function nameText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f]/.test(text)) throw new Error(`${what} cannot contain a line break. Use one line of text.`);
	return text;
}

// The game's example map and player limit, from the forum's required-arguments example (not documented defaults).
const EXAMPLE_MAP = "ns2_summit";
const EXAMPLE_LIMIT = 20;
// Port 27015 is the game's documented default, but corekeeper holds it. 27040 is free, and 27041 is held beside it.
const DEFAULT_PORT = 27040;
const DEFAULT_NAME = "Natural Selection 2 Server";
const CONFIG_DIR = "config";
const LOG_DIR = "serverlogs";

const template = {
	id: "ns2",
	displayName: "Natural Selection 2",
	type: "ns2",
	// The panel watches the process called Server.exe, which the start script launches from x64\ (see the header).
	method: "process",
	updateAppId: "4940",
	storeAppId: "4920",
	sharedInstall: false,
	// SteamCMD puts the game files in the install folder's root; the server program is x64\Server.exe.
	installLayoutRoot: "",
	description:
		"Natural Selection 2's dedicated server (x64\\Server.exe), installed from Steam app 4940. The panel starts it with a name, a map, a player limit and a port, and keeps its config files and its log in the server's folder. The server answers queries on the port after the game port. The panel's Stop closes the window and, if the game does not exit within 15 seconds, ends it, so back up before you stop or update.",
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server list)", type: "text" },
	},
	ports: [{ key: "port", label: "Game Port", default: DEFAULT_PORT }],
	resolveParams: async (raw) => {
		const name = nameText(raw.sessionName, "The server name") || nameText(raw.name, "The server name");
		return { sessionName: name };
	},
	buildStartScriptFilename: () => "Start_NS2.bat",
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE_PATH} -name "${batSafe(p.sessionName || p.name, DEFAULT_NAME)}" -map ${EXAMPLE_MAP} -limit ${EXAMPLE_LIMIT} -port ${Number(p.port)} -config_path "%~dp0${CONFIG_DIR}" -logdir "%~dp0${LOG_DIR}"`,
			"",
		].join("\r\n"),
	buildServerEntry: (p) => {
		const dir = `${p.installDir}\\${CONFIG_DIR}`;
		return {
			name: p.name,
			type: "ns2",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: nameText(p.sessionName, "The server name") || p.name,
			configPath: `${dir}\\serverconfig.json`,
			configPaths: {
				"serverconfig.json": `${dir}\\serverconfig.json`,
				"serveradmin.json": `${dir}\\serveradmin.json`,
				"mapcycle.json": `${dir}\\mapcycle.json`,
			},
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			processName: EXE,
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			updateAppId: "4940",
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// The config folder holds the server's settings and admin and map lists. Saved worlds: NOT FOUND in the dossier, so not backed up.
	backup: {
		paths: [{ base: "working", rel: CONFIG_DIR, label: "Server settings, admin and map lists" }],
	},
	// -logdir in the start script puts the game's log in the install (the game names the file log-Server.txt).
	logs: [{ kind: "file", base: "working", rel: `${LOG_DIR}/log-Server.txt`, label: "Server log" }],
	// The launch line gets the form, so Workshop mods (-mods) can be added to the end of it.
	launchOptions: true,
};

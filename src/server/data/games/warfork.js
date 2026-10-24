// Warfork (Warsow-based arena FPS, Steam server app 1136510 with anonymous login; game app 671610).
//
// Checked on a real Windows install (docs/research/games/warfork/06-verification.md). The research dossier knew only the Linux
// binary; the install showed:
//  - the program is wf_server_x64.exe in the install's root (next to warfork_x64.exe and wftv_server_x64.exe). It stays running as the
//    server, and its window is not shown when started through `start /MIN`.
//  - the shipped basewf\dedicated_autoexec.cfg holds every server setting as a console `set` line and is run last at launch. The game
//    never writes it. A basewf\server.cfg is NOT read, so the panel does not write one.
//  - a `+set name value` argument on the launch line overrides the file, so the panel passes the name and the ports there and leaves
//    the shipped file as it is.
//  - ports: sv_port 44400 is the game port (UDP, and it answers A2S); sv_http_port 44444 is a TCP port for file downloads, which the
//    panel moves to the port after the game port so two servers do not fight over 44444.
//  - the console log is basewf\wfconsole.log.
//  - stopping: the panel's Stop closes the window and force-ends the process after 15 s.

const EXE = "wf_server_x64.exe";
// The shipped settings file the owner edits. The panel only reads it.
const CONFIG = "basewf\\dedicated_autoexec.cfg";

// The game's own default port.
const DEFAULT_PORT = 44400;
const DEFAULT_NAME = "Warfork Server";

/** A text safe to put inside a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/**
 * A text for `+set sv_hostname "..."`. The engine reads the value as console text, so a quote, a semicolon (a command separator),
 * a backslash or a line break would change what the line does. Such a name is refused rather than changed.
 */
function cfgText(value, what) {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f";\\]/.test(text)) {
		throw new Error(`${what} cannot hold a quote, a semicolon, a backslash or a line break. Use plain letters, digits, spaces and punctuation.`);
	}
	return text;
}

const template = {
	id: "warfork",
	displayName: "Warfork",
	type: "warfork",
	// The panel watches wf_server_x64.exe, the program the start script runs.
	method: "process",
	updateAppId: "1136510",
	storeAppId: "671610",
	sharedInstall: false,
	installLayoutRoot: "",
	description:
		"Warfork's dedicated server (wf_server_x64.exe). It installs anonymously. The panel passes the server name and the ports on the launch line and leaves the shipped basewf\\dedicated_autoexec.cfg, which holds every other setting, for you to edit. The game port is UDP; the port after it is a TCP port for file downloads.",
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server list)", type: "text" },
	},
	ports: [{ key: "port", label: "Game Port (UDP; the next port is the TCP download port)", default: DEFAULT_PORT }],
	resolveParams: async (raw) => {
		const name = cfgText(raw.sessionName, "The server name") || cfgText(raw.name, "The server name");
		return { sessionName: name };
	},
	buildStartScriptFilename: () => "Start_Warfork.bat",
	buildStartScript: (p) => {
		const name = batSafe(cfgText(p.sessionName, "The server name") || cfgText(p.name, "The server name"), DEFAULT_NAME);
		const port = Number(p.port);
		return [
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, DEFAULT_NAME)}" ${EXE} +set sv_hostname "${name}" +set fs_usehomedir 0 +set sv_port ${port} +set sv_port6 ${port} +set sv_http_port ${port + 1}`,
			"",
		].join("\r\n");
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "warfork",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		sessionName: cfgText(p.sessionName, "The server name") || p.name,
		configPath: `${p.installDir}\\${CONFIG}`,
		configPaths: { [CONFIG]: `${p.installDir}\\${CONFIG}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "1136510",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The shipped settings file and the folder of per-gametype configs.
	backup: {
		paths: [
			{ base: "working", rel: "basewf/dedicated_autoexec.cfg", label: "Server settings" },
			{ base: "working", rel: "basewf/configs", label: "Gametype configs" },
		],
	},
	logs: [{ kind: "file", base: "working", rel: "basewf/wfconsole.log", label: "Server log" }],
	// The launch line is built by the panel; the generic reader cannot parse `+set name value` pairs, so there is no launch form.
	launchOptions: false,
};

// Eco (Strange Loop Games). Dedicated server: the server tool, Steam app 739590 (anonymous login works; the game itself is app 382310).
//
// Facts from the research dossier (docs/research/games/eco/01..04), whose sources are the Eco wiki (Setting Up a Server, Server on Linux,
// Server Configuration: Network.eco), the Pterodactyl egg (games-eco) and XGamingServer. The wiki pages were read through a mirror and some
// are stale (they cite Beta 9.4.1; a third-party guide names 14.1.1). Nothing was run on a real install. In short:
//  - the program is EcoServer.exe in the install folder, started with no arguments (the wiki's own examples). The Pterodactyl egg
//    passes --username and --password for the Strange Loop account; the dossier does not say whether the server needs them, so the
//    panel does not pass them (see 05-implementation-notes.md);
//  - the ports are set only in Configs\Network.eco: the game port (UDP, 3000 by default) and the web port (TCP, 3001 by default). The
//    panel writes both: the game port is the panel's port and the web port is two above it (the dossier's 3000 / 3001 pair is one apart; the panel uses two so the port beside the game port stays free). RCON and
//    the Steam port are left out, since RCON needs a password and is off without one;
//  - Network.eco is written by the panel, since the dossier's install has only the .template copies; the egg copies those too. Only the
//    keys the wiki's table gives are written, and every other key keeps the server's own default;
//  - no graceful stop is documented for Windows. The wiki says SIGTERM and Ctrl+C save the world and SIGINT does not; the egg stops it
//    with `exit` typed in the console. The panel can do neither, so Stop closes the window and ends the process after 15 s.
// Not verified on a real install (see 05-implementation-notes.md): that a file with only these keys starts the server, the version,
// whether the server needs the Strange Loop account, and whether closing the window saves the world.

const EXE = "EcoServer.exe";
const CONFIG_REL = "Configs\\Network.eco";

const DEFAULT_PORT = 25980;
/** The web port sits two above the game port (see the header). */
const WEB_OFFSET = 2;

/** The window title in `start /MIN "<title>"`: cmd acts on these characters, so they are dropped. */
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim() || "Eco Server";

/** The server's name, in the form the file holds it: one line, no control characters, at most 50 characters (the egg's limit). */
export function serverName(value, fallback = "Eco Server") {
	const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 50).trim();
	return text || fallback;
}

/** The join password: one line, at most 20 characters (the egg's limit). Blank means no password. */
export function joinPassword(value) {
	return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 20);
}

const template = {
	id: "eco",
	displayName: "Eco",
	type: "eco",
	// No RCON and no query port are written, so the panel watches the process and stops it by closing its window.
	method: "process",
	updateAppId: "739590",
	sharedInstall: false,
	installLayoutRoot: "",
	fields: ["sessionName", "serverPassword"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the Eco server browser; 50 characters at most)", type: "text" },
		serverPassword: { label: "Server Password (empty = anyone can join; players on the whitelist never need it)", type: "text" },
	},
	// The game port (UDP). The web port is implicit (two above it), and the panel keeps the port after the game port free too.
	ports: [{ key: "port", label: "Game Port (UDP; the web port two above it and the next port up are kept free too)", default: DEFAULT_PORT }],
	implicitPorts: [{ offset: WEB_OFFSET, label: "its web port (TCP)" }],
	buildStartScriptFilename: () => "Start_Eco.bat",
	// Started from its own folder, with no arguments (the wiki's examples): the wiki says starting it from another folder does not work.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${windowTitle(p.name)}" ${EXE}`,
			"",
		].join("\r\n"),
	// Network.eco: the ports, the name, the password and the public listing. Written as JSON, so any character in the name or password
	// stays inside its string. The keys are the wiki's (Name, not the egg's Description; see the notes).
	buildConfigFile: (p) => {
		const port = Number(p.port) || DEFAULT_PORT;
		const network = {
			Name: serverName(p.sessionName, serverName(p.name)),
			Password: joinPassword(p.serverPassword),
			PublicServer: false,
			GameServerPort: port,
			WebServerPort: port + WEB_OFFSET,
		};
		return { relPath: CONFIG_REL, content: `${JSON.stringify(network, null, 2)}\r\n` };
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "eco",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		sessionName: serverName(p.sessionName, serverName(p.name)),
		configPath: `${p.installDir}\\${CONFIG_REL}`,
		configPaths: { "Network.eco": `${p.installDir}\\${CONFIG_REL}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// EcoServer.exe is the program the wiki starts and the one that stays running (no launcher is named on any page).
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "739590",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The world (Storage: the save, Game.db, the backups folder) and the settings (Configs). The wiki says a Steam update may wipe the
	// configuration, so both are kept.
	backup: {
		paths: [
			{ base: "working", rel: "Storage", label: "Saved world" },
			{ base: "working", rel: "Configs", label: "Server settings" },
		],
	},
	// The dossier's only log folder is the mods' crash logs (it appears after a mod crashes), so no log is listed.
	logs: [],
	// The start line has no arguments, so there is no Launch options form.
	launchOptions: false,
};

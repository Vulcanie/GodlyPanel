// StarRupture (Creepy Jar). Checked against the dedicated server tool (Steam app 3809400, build 25642172) installed by SteamCMD.
//
// - The server is two programs. StarRuptureServerEOS.exe in the install folder is a small launcher (it is what the game's own
//   SRServerWithLog.bat starts); it starts StarRupture\Binaries\Win64\StarRuptureServerEOS-Win64-Shipping.exe, which is the
//   real server (the game's own log names it as the running executable, with the launcher's arguments on its command line).
//   The panel therefore tracks the Shipping program.
// - There is no world until DSSettings.txt exists: the server never creates it. With it, the server builds (or loads) a world by
//   itself at start-up, with no game client needed. It is JSON and every value is a string. It sits next to the launcher.
// - Passwords are not set here. The game reads them from Password.json and PlayerPassword.json, which hold a value that only a
//   third-party website can make, so the panel does not write them (see the notes that came with this module).
// - The player limit is fixed at 4 by the game and there are no mods to configure, so neither is asked for.

// The one thing the settings file is for is the world's name, which is also the name of its save folder. Characters Windows does
// not allow in a folder name are dropped, and it is kept short: the one Docker image that documents a limit says 20 characters.
const FORBIDDEN_IN_FOLDER_NAME = /[<>:"/\\|?*\u0000-\u001f]/g;
const DEFAULT_WORLD = "StarRuptureServer";
function worldName(raw) {
	const cleaned = String(raw ?? "")
		.replace(FORBIDDEN_IN_FOLDER_NAME, "")
		.slice(0, 20)
		.replace(/[ .]+$/, "")
		.replace(/^ +/, "");
	return cleaned || DEFAULT_WORLD;
}

// The window title in `start /MIN "<title>"`. A server's name is typed by a person, and cmd acts on these characters.
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").trim() || "StarRupture";

const template = {
	id: "starrupture",
	displayName: "StarRupture",
	type: "starrupture",
	method: "process",
	updateAppId: "3809400",
	storeAppId: "1631270",
	sharedInstall: false,
	// SteamCMD puts StarRuptureServerEOS.exe and the StarRupture folder directly in the install folder.
	installLayoutRoot: "",
	// No join password (the game wants a value only a third-party website can make), no max players (fixed at 4), no mods.
	fields: ["sessionName"],
	fieldMeta: { sessionName: { label: "World Name (also its save folder, up to 20 characters)", type: "text" } },
	// The game port carries gameplay over UDP. The same number also answers on TCP for the in-game "Manage Server" screen, which
	// has a reported security hole: it is deliberately not in the ports to open. 7777 is the game's own default, but Conan Exiles
	// and Satisfactory already use it here.
	ports: [{ key: "port", label: "Game Port (UDP)", default: 7780 }],
	buildStartScriptFilename: () => "Start_StarRupture.bat",
	// The launcher the game ships starts with -Log. The two Remote Control arguments switch off the engine's built-in web
	// service, as the community server setups do.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${windowTitle(p.name)}" StarRuptureServerEOS.exe -Log -Port=${Number(p.port)} -RCWebControlDisable -RCWebInterfaceDisable`,
			"",
		].join("\r\n"),
	// Written before the first start, because the server never makes it and sits idle without it. StartNewGame "true" builds the
	// world on this first start; it has to be switched to "false" (and LoadSavedGame to "true") afterwards, or the world is
	// made again at every start. The Settings tab explains this.
	buildConfigFile: (p) => ({
		relPath: "DSSettings.txt",
		content: JSON.stringify(
			{
				SessionName: worldName(p.sessionName),
				SaveGameInterval: "300",
				StartNewGame: "true",
				LoadSavedGame: "false",
				SaveGameName: "AutoSave0.sav",
			},
			null,
			2,
		),
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "starrupture",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		sessionName: worldName(p.sessionName),
		configPath: `${p.installDir}\\DSSettings.txt`,
		configPaths: { "DSSettings.txt": `${p.installDir}\\DSSettings.txt` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		processName: "StarRuptureServerEOS-Win64-Shipping.exe",
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "3809400",
		autoUpdate: false,
	}),
};

export default {
	template,
	// Worlds are in StarRupture\Saved\SaveGames\<world name>\ (AutoSave0.sav with its .met). The settings file and the two password
	// files are in the folder root.
	backup: {
		paths: [
			{ base: "working", rel: "StarRupture/Saved/SaveGames", label: "Saved worlds" },
			{ base: "working", rel: "DSSettings.txt", label: "Server settings" },
			{ base: "working", rel: "Password.json", label: "Admin password" },
			{ base: "working", rel: "PlayerPassword.json", label: "Join password" },
		],
	},
	logs: [{ kind: "dir", base: "working", rel: "StarRupture/Saved/Logs", label: "Game log" }],
	launchOptions: true,
};

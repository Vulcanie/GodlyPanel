// Starbound (Chucklefish). Dedicated server tool: Steam app 533830 ("Starbound Dedicated Server"), game: app 211820. The install is done
// with SteamCMD as an anonymous login (see the open questions below: this is not confirmed).
//
// Facts from the research dossier (docs/research/games/starbound/00..04), whose sources are the Starbounder wiki (LinuxServerSetup), the
// Game Server Kings and iTechGuides pages, esagames, IONOS and a 1.0-era forum post. Nothing was run on a real install. In short:
//  - the program is `win64\starbound_server.exe` in the install folder (the Linux one is `linux/starbound_server`). It is started from the
//    install folder, not from win64\, so the server's `storage` and `mods` folders are the install folder's own (the dossier's Linux
//    systemd example sets the working folder to the server root, and the forum log writes `..\storage\starbound_server.config` from
//    the win32 folder). No launch argument is documented, so the start script runs the program with none;
//  - the settings are one JSON file, `storage\starbound_server.config`. The game writes it on its first start. The panel writes only the
//    three keys the dossier explains (serverName, gameServerPort, maxPlayers), so the port and the name are right from the first start.
//    Whether the game fills in the keys left out is NOT verified (see the notes);
//  - the port is 21025 (the game's default, which no template here uses). The dossier does not settle TCP or UDP; the panel's form says TCP;
//  - no query or RCON port is set: both are off by default and their protocol is not verified, so the panel watches the process;
//  - Stop: the dossier documents only Ctrl+C (Linux) and systemd's stop. Windows has no documented stop, so the panel closes the window
//    and ends the process after 15 s (the panel's usual Stop). Whether that saves the universe is not known;
//  - mods: manual only (copy each Workshop `contents.pak` into `mods`). The dossier gives no Workshop-id setting, so no mod field is added.
//
// OPEN QUESTIONS (needs real-install verification, see docs/research/games/starbound/05-implementation-notes.md):
//  1. whether SteamCMD `+login anonymous` installs app 533830 (the dossier has sources on both sides);
//  2. whether the server needs the game's own `assets\packed.pak` from an owned copy of app 211820 beside it;
//  3. whether the Windows exe needs the install folder as its working folder, and whether it accepts a config with only three keys.

const EXE_PATH = "win64\\starbound_server.exe";
const EXE = "starbound_server.exe";
const CONFIG_REL = "storage\\starbound_server.config";

// The dossier's default for the game port (21025, TCP for play per two sources). No other template in this panel uses it.
const DEFAULT_PORT = 21025;
// The dossier's value for maxPlayers in the key table ("value shown: 8"); the panel does not ask for it.
const DEFAULT_PLAYERS = 8;

const wholeNumber = (value, fallback, min, max) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

const portOf = (p) => wholeNumber(p.port, DEFAULT_PORT, 1, 65535);

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

/** A text for the server name in the JSON file. JSON escapes quotes and backslashes itself; only line breaks are refused. */
export function nameText(value, what = "The server name") {
	const text = String(value ?? "").trim();
	if (/[\u0000-\u001f]/.test(text)) {
		throw new Error(`${what} has a line break or another control character. Use one line of plain text.`);
	}
	return text;
}

const serverNameOf = (p) => nameText(p.sessionName) || nameText(p.name) || "Starbound Server";

const template = {
	id: "starbound",
	displayName: "Starbound",
	type: "starbound",
	// The panel watches the process: no query or RCON protocol is verified (both are off by default in the config).
	method: "process",
	updateAppId: "533830",
	// The full game's Steam app (211820), used only for the dashboard artwork. The dedicated server tool is the one installed.
	storeAppId: "211820",
	sharedInstall: false,
	// The start script and the config file are both relative to the install folder (see the header). Unlike Terraria, the program's own
	// folder (win64) is NOT the layout root, because the config and the mods folder are in the install folder.
	installLayoutRoot: "",
	description:
		"Starbound's free dedicated server tool from Steam, which runs a persistent universe that players share. The panel installs it with SteamCMD and keeps its settings in one JSON file. Mods are added by hand: copy each mod's contents.pak into the server's mods folder. Stop closes the server's window; Starbound has no documented way to save from a Windows console, so the panel cannot guarantee the universe is saved.",
	// Only the server name is asked for. The game port is the panel's default, and the player limit is 8.
	fields: ["sessionName"],
	fieldMeta: {
		sessionName: { label: "Server name (shown in the server browser; written to the server's settings file)", type: "text" },
	},
	// One game port. Only the game port is in the config file; there is no launch argument for it.
	ports: [{ key: "port", label: "Game Port (TCP)", default: DEFAULT_PORT }],
	// Rejects a bad name before the download starts, and hands the cleaned value on.
	resolveParams: async (raw) => ({
		sessionName: nameText(raw.sessionName ?? ""),
	}),
	buildStartScriptFilename: () => "Start_Starbound.bat",
	// The program is started from the install folder (the script's own folder) with no arguments: none is documented.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Starbound Server")}" ${EXE_PATH}`,
			"",
		].join("\r\n"),
	// The file the game would otherwise write on its first start, with only the three keys the dossier explains. JSON cannot hold comments.
	buildConfigFile: (p) => {
		const config = {
			serverName: serverNameOf(p),
			gameServerPort: portOf(p),
			maxPlayers: DEFAULT_PLAYERS,
		};
		return { relPath: CONFIG_REL, content: `${JSON.stringify(config, null, 2).replace(/\n/g, "\r\n")}\r\n` };
	},
	postWrite: async () => ({
		warnings: [
			"The panel writes three settings into storage\\starbound_server.config (name, port, player limit). The game's other settings are not in the file yet; whether the game adds the missing ones on its first start has not been checked on a real install. If the server does not start, check the file and the server's window.",
			"Starbound has no documented way to save and stop from a Windows console. The panel's Stop closes the server's window and, after 15 seconds, ends the program, so the universe keeps only what the server saved before. Stop the server before you edit the settings file, and back up the storage folder first.",
		],
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "starbound",
		method: "process",
		host: "127.0.0.1",
		port: portOf(p),
		sessionName: serverNameOf(p),
		configPath: `${p.installDir}\\${CONFIG_REL}`,
		configPaths: { "starbound_server.config": `${p.installDir}\\${CONFIG_REL}` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// The program that stays running (the dossier's Linux systemd example shows the server process as the main one; Windows is not verified).
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "533830",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The universe, the players' files and the settings are all in storage; mods are the files the person copied into mods.
	backup: {
		paths: [
			{ base: "working", rel: "storage", label: "Storage (universe, player files, settings)" },
			{ base: "working", rel: "mods", label: "Mods copied in by hand" },
		],
	},
	// The dossier names no log file or folder, so the panel reads none.
	logs: [],
	// No launch arguments are documented, so the start script has no launch line for the Launch options form.
	launchOptions: false,
};

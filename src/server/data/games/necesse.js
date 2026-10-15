// Necesse (Fair Games). Dedicated server tool: Steam app 1169370 ("Necesse Dedicated Server", free, anonymous login), game: app 1169040.
//
// Facts from the research dossier (research/necesse/01..04), whose sources are the Necesse Wiki (necessewiki.com/Multiplayer and
// /Modding, which say their parameter list comes from DesktopServerWrapper inside Necesse.jar), Steam's own app info for 1169370, the
// Pelican/Pterodactyl egg, a developer's `-help` post and a community Docker image. Nothing was run on a real install. In short:
//  - the server is a Java program shipped with its own JRE: `jre\bin\java.exe -jar Server.jar -nogui` in the install folder (the
//    second launch entry Steam lists for the app). There is no Necesse-named exe, so `processName` is java.exe and the panel tells this
//    server's process from any other Java program by where it runs from: the bundled jre\bin\java.exe is inside the server's folder, and
//    Stop only ever closes processes that run from inside that folder (see serverProcesses.js). Nothing here kills by image name;
//  - the shipped StartServer*.bat files use `start jre\bin\javaw.exe`/`java.exe ... %*`, which opens a second window; this script starts
//    java.exe itself, as the dossier recommends;
//  - one UDP game port, 14159 by default. No query, RCON or web port exists, so the panel watches the process (no player count);
//  - `-world "<name>"` skips the console questions the server asks without it, and creates the world if it does not exist;
//  - `-localdir` keeps the server's data (cfg\server.cfg, saves, logs) in the folder the server is started from instead of the Windows
//    user's AppData\Roaming\Necesse, so every panel server is self-contained (the Pelican egg and the Docker image start it this way);
//  - everything is given as launch arguments (they win over server.cfg, which the server fills with its defaults and rewrites when it
//    stops). THE PANEL WRITES NO server.cfg: it is a Lua-like `SERVER = { key = value, // comment }` block, a shape neither the panel's
//    "properties" nor its convar reader parses (trailing commas, braces, comments), and worldSettings.cfg is a zipped file inside the world
//    save, which is not touched;
//  - mods are plain .jar files: `-mod .\mods` points the server at a mods folder in its install (the wiki's dedicated-server recipe).
//    The server downloads no Workshop mods itself; the jars are copied in by hand. A mods tab (upload / delete jars) would be the right
//    feature, but it needs code in existing files, so it is only described in the guide and the implementation notes;
//  - NO GRACEFUL STOP FROM THE PANEL. The server saves on its console `quit` (also /stop, /exit) and does not save on SIGTERM. The panel
//    has no way to type into a console, so Stop asks the process to close and force-kills it after its 15 s grace time: the world keeps only
//    what the server saved before. Type `quit` in the server's window (it is kept minimized, not hidden) before pressing Stop.
// Not verified on a real install (see research/necesse/05-implementation-notes.md): that java.exe from the install's jre\bin stays running
// as the one process, that `-nogui -world` asks no question at all on a brand-new world, where -localdir really puts cfg, saves and logs,
// that `-mod .\mods` is accepted by the server and a folder holding only a text file is fine, and what Stop does to the save.

const PROGRAM = "jre\\bin\\java.exe";

/** The game's own limits: 1 to 250 player slots (the wiki's wizard text and server.cfg comment); 10 when none is given (the server.cfg default). */
const SLOTS_MIN = 1;
const SLOTS_MAX = 250;
const SLOTS_DEFAULT = 10;

// Characters cmd acts on inside a .bat even between quotes (%, and ! when delayed expansion is on), the quote that would end the value, a
// backslash (read as escaping the quote after it) and control characters. A character outside plain ASCII would be read back through the
// console's code page by cmd, so it is not allowed either.
const UNSAFE = /[\u0000-\u001f"%&|<>^!\\]|[^\u0000-\u007f]/;
const UNSAFE_GLOBAL = new RegExp(UNSAFE.source, "g");

/**
 * The world's name as it goes on the launch line and in its save file's name: letters, digits, spaces, `_`, `-` and `.`, 40 characters at
 * most, no blanks or dots at either end. Anything else is dropped. (The dossier does not say which characters the game accepts; this
 * stays inside what every file system and cmd accept.)
 */
export function worldName(value, fallback = "world") {
	const cleaned = String(value ?? "")
		.replace(/[^A-Za-z0-9 _.-]/g, "")
		.replace(/\s+/g, " ")
		.slice(0, 40)
		.replace(/^[\s.]+|[\s.]+$/g, "");
	return cleaned || fallback;
}

/** A text safe to put between the quotes of a .bat `start` title. */
const windowTitle = (value) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!\\]|[^\u0000-\u007f]/g, "")
		.replace(/\s+/g, " ")
		.trim() || "Necesse Server";

/** The player limit: a whole number from 1 to 250, 10 when none is given. */
const playerLimit = (value) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= SLOTS_MIN ? Math.min(n, SLOTS_MAX) : SLOTS_DEFAULT;
};

/**
 * Refuses a join password that cannot be put on the launch line safely, instead of quietly changing it. A quote, a percent sign,
 * & | < > ^ !, a backslash, a line break or a character outside plain ASCII would change what cmd (or Java's argument reading) does.
 */
export function launchPassword(value) {
	const text = String(value ?? "").trim();
	if (UNSAFE.test(text)) {
		throw new Error("The password has a character that cannot go safely on Necesse's launch line (a quote, a percent sign, & | < > ^ !, a backslash, a line break or a letter outside plain English). Use letters, digits, spaces and plain punctuation without those.");
	}
	return text;
}

const template = {
	id: "necesse",
	displayName: "Necesse",
	type: "necesse",
	// No query port, RCON or web port was found in any source, so the panel watches the process (its java.exe, told apart by where it
	// runs from). That gives no player count.
	method: "process",
	updateAppId: "1169370",
	storeAppId: "1169040",
	sharedInstall: false,
	// SteamCMD puts Server.jar and jre\ straight in the server's folder.
	installLayoutRoot: "",
	// The 64-bit Windows depot is about 180 MB on disk; the other Windows depots in the app's info add up to about 330 MB at most.
	estimatedInstallBytes: 400_000_000,
	description:
		"Necesse's dedicated server. THE PANEL CANNOT SAVE AND STOP IT CLEANLY: the server saves the world when `quit` is typed into its own console window, and it does not save when it is simply closed. The panel has no way to type into a console, so Stop closes the window and then ends the process after 15 seconds, and the world keeps only what the server saved before. Before pressing Stop, open the server's window (it is kept minimized on the taskbar), type quit and wait for it to close. Mods are plain .jar files copied into the server's mods folder.",
	// The session name field is the world's name: the server asks for one at every start unless it is given -world.
	fields: ["sessionName", "serverPassword"],
	fieldMeta: {
		sessionName: { label: "World name (the save the server loads; it is made if it does not exist. Letters, digits, spaces, - _ . only)", type: "text" },
		serverPassword: { label: "Server Password (leave empty for none; it is written on the launch line of the start script)", type: "text" },
	},
	// UDP. 14159 is the game's own default and no other template here uses it or the port after it.
	ports: [{ key: "port", label: "Game Port (UDP)", default: 14159 }],
	// Rejects a password that cannot go on the launch line before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => ({
		sessionName: worldName(raw.sessionName, worldName(raw.name)),
		serverPassword: launchPassword(raw.serverPassword),
	}),
	buildStartScriptFilename: () => "Start_Necesse.bat",
	// java.exe from the bundled JRE is started directly (not through the shipped StartServer*.bat, which `start`s a second window), from
	// the install folder so jre\ and Server.jar resolve. -nogui is the text console; -localdir keeps cfg, saves and logs in this folder;
	// -mod points at the mods folder; -world skips the console questions. The password is left off when empty (the server then uses the
	// one in its server.cfg, which is empty). Nothing has to be last, so the Launch options form may add any argument at the end.
	buildStartScript: (p) => {
		const password = String(p.serverPassword ?? "").replace(UNSAFE_GLOBAL, "").trim(); // resolveParams already refused such a password
		return [
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${windowTitle(p.name)}" "${PROGRAM}" -jar Server.jar -nogui -localdir -mod .\\mods -world "${worldName(p.sessionName || p.name)}" -port ${Number(p.port)} -slots ${playerLimit(p.maxPlayers)}${password ? ` -password "${password}"` : ""}`,
			"",
		].join("\r\n");
	},
	// The mods folder the launch line points at. A text file is the only way to have the panel create a folder; the server is only
	// expected to look at .jar files in it.
	buildExtraFiles: () => [
		{ relPath: "mods\\Put mod jar files here.txt", content: "Copy Necesse mod .jar files into this folder while the server is stopped. Players need the same mods.\r\n" },
	],
	postWrite: async () => ({
		warnings: [
			"Necesse's server cannot be stopped cleanly from the panel. It saves the world when `quit` is typed into its own console window and does not save when it is just closed, and the panel cannot type into a console. Stop closes the window and then ends the process after 15 seconds, so the world keeps only what the server saved before. Open the server's window (it is kept minimized on the taskbar), type quit, wait for the window to close, and only then press Stop or update.",
			"No owner is set, so nobody has admin rights yet. Add -owner <your player name> in Launch options (anyone who joins with exactly that name becomes the owner, so set a password).",
			"Mods are .jar files copied by hand into the server's mods folder while it is stopped; players need the same mods. A world made with a mod may lose that mod's content if the mod is removed.",
		],
	}),
	buildServerEntry: (p) => ({
		name: p.name,
		type: "necesse",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		sessionName: p.sessionName,
		serverPassword: p.serverPassword,
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// The program that stays running is java.exe from the bundled JRE (not observed running). The name is shared by every Java
		// program, so the panel tells this server's process by where it runs from: the install's jre\bin is inside its folder.
		processName: "java.exe",
		// Kept on the taskbar rather than hidden, so the console can be reached to type `quit` (the panel cannot send it). The hiding
		// watcher also matches by program name only, which for java.exe would be any Java window on the PC.
		windowMode: "minimized",
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "1169370",
		autoUpdate: false,
	}),
};

export default {
	template,
	// With -localdir the data is next to the server: cfg\server.cfg, the world saves (a .zip per world, or a folder when zipSaves is
	// off; the dossier's sources disagree on whether they sit in saves\ or saves\worlds\, so the whole saves folder is kept) and the
	// mods the owner copied in. Files that don't exist are skipped.
	backup: {
		paths: [
			{ base: "working", rel: "saves", label: "Saved worlds" },
			{ base: "working", rel: "cfg", label: "Server settings" },
			{ base: "working", rel: "mods", label: "Mods added by hand" },
		],
	},
	logs: [{ kind: "dir", base: "working", rel: "logs", label: "Server logs" }],
	launchOptions: true,
};

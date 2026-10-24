// Minecraft Java Edition, the vanilla server (Mojang's server.jar). Facts from the research dossier (research/minecraft-vanilla/01..03),
// whose sources are the Minecraft Wiki (Tutorial: Setting up a Java Edition server, Server.properties, Server.jar), Mojang's version
// manifest and the per-version listing. Nothing was run on a real install. In short:
//  - not a SteamCMD game: the jar is downloaded from Mojang (webInstall, services/webResolvers.js), pinned to 1.21.11, which needs Java 21;
//  - the start script is `java -Xmx<n>G -jar server.jar --nogui` in the server's folder, in a minimized window (`start /MIN`);
//  - the EULA must be accepted: eula.txt is written with eula=true when the person creating the server ticks the box;
//  - the game reads server.properties from its working folder. The panel writes the message (from the name field) and the port it
//    allocated, and the game fills in every other key with its default on the first start;
//  - the game port is TCP (server-port). Its own stop command is `stop` typed into the console; the panel has no console or RCON link to
//    it (method "process"), so its Stop closes the window and ends the process after 15 seconds. See the notes in the UI module.

import { mojangServerJar } from "../../services/webResolvers.js";

const JAR = "server.jar";
const PROPERTIES = "server.properties";
const DEFAULT_MEMORY_GB = 4;
// The highest memory the form accepts. The dossier gives no maximum; this stops a typo from asking Java for something absurd.
const MAX_MEMORY_GB = 256;
// Game ports are 1 to 65534 (the dossier's range for server-port).
const PORT_MIN = 1;
const PORT_MAX = 65534;

/** A text safe to put between the quotes of a .bat `start` title: nothing cmd would act on. */
const batSafe = (value, fallback) =>
	String(value ?? "")
		.replace(/[\u0000-\u001f"%&|<>^!]/g, "")
		.replace(/\s+/g, " ")
		.trim() || fallback;

const wholeNumber = (value) => {
	const text = String(value ?? "").trim();
	return /^\d+$/.test(text) ? Number(text) : NaN;
};

/** The memory the form gives, in whole gigabytes; a value that is not a whole number in range falls back to the default. */
function memoryGB(value) {
	const n = wholeNumber(value);
	return Number.isInteger(n) && n >= 1 && n <= MAX_MEMORY_GB ? n : DEFAULT_MEMORY_GB;
}

/** The message of the day: a .properties value can't hold a backslash or a line break without the game reading it differently. */
function motdText(value) {
	const text = String(value ?? "").trim();
	if (/\\/.test(text)) throw new Error("The server message cannot have a backslash (\\) in it. Use letters, digits, spaces and punctuation.");
	if (/[\u0000-\u001f]/.test(text)) throw new Error("The server message cannot have a line break in it.");
	return text;
}

const template = {
	id: "minecraft-vanilla",
	displayName: "Minecraft (Java, vanilla)",
	type: "minecraft-vanilla",
	// Process-method: the panel watches the java process and has no RCON to this server. See the header.
	method: "process",
	sharedInstall: false,
	// The jar is written straight into the server's folder (server.jar is run from there).
	installLayoutRoot: "",
	// Java 21 is the dossier's requirement for 1.20.5 and later; 1.21.11 is in that range. The panel does not install Java.
	description:
		"Mojang's own Minecraft Java Edition server, pinned to version 1.21.11. The panel downloads server.jar from Mojang and checks it against Mojang's published SHA-1. It needs Java 21 or newer installed on this PC (the start script runs `java`, so Java must be on the Windows PATH). Accepting Mojang's EULA is required before the server starts. Vanilla has no mods; datapacks go in the world folder.",
	requiresEula: true,
	// Downloaded from Mojang's own site (Mojang publishes a SHA-1 for the jar, which the download must match). Nothing is downloaded
	// until the person creating the server has agreed (see services/webInstall.js).
	webInstall: {
		label: "Minecraft Java server 1.21.11",
		hosts: mojangServerJar.hosts,
		kind: "file",
		fileName: JAR,
		resolve: mojangServerJar("1.21.11"),
	},
	fields: ["sessionName", "maxMemoryGB", "eulaAccepted"],
	fieldMeta: {
		sessionName: { label: "Server Message (shown under the name in the server list; about 59 characters or fewer)", type: "text" },
		maxMemoryGB: { label: "Max Memory (GB)", type: "text" },
		eulaAccepted: {
			label: "I confirm I am authorized to accept Mojang's EULA (https://aka.ms/MinecraftEULA) on behalf of this server, and I accept it.",
			type: "checkbox",
		},
	},
	// TCP. 25565 is the modpack template's default (and its companion port 25566 is held beside it), so this starts further up.
	ports: [{ key: "port", label: "Game Port (TCP)", default: 25585 }],
	// Refuses a bad message or memory value before the download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const sessionName = motdText(raw.sessionName);
		const rawMemory = String(raw.maxMemoryGB ?? "").trim();
		if (rawMemory !== "" && memoryGB(rawMemory) !== wholeNumber(rawMemory)) {
			throw new Error(`Max memory must be a whole number of gigabytes from 1 to ${MAX_MEMORY_GB}, such as 4.`);
		}
		return { sessionName, maxMemoryGB: memoryGB(rawMemory) };
	},
	buildStartScriptFilename: () => "Start_Minecraft.bat",
	// The panel's own process is java, started in the server's folder (where server.jar and server.properties are). The window is
	// minimized, not hidden, so the person can type `stop` into it.
	buildStartScript: (p) =>
		[
			"@echo off",
			"cd /d \"%~dp0\"",
			`start /MIN "${batSafe(p.name, "Minecraft Server")}" java -Xmx${memoryGB(p.maxMemoryGB)}G -jar "%~dp0${JAR}" --nogui`,
			"",
		].join("\r\n"),
	// server.properties: the message (only when one is given, so the game's default stays) and the port the panel allocated. The game
	// rewrites this file on every start, keeping these values and filling in every missing key with its default.
	buildConfigFile: (p) => {
		const port = Number(p.port);
		if (!Number.isInteger(port) || port < PORT_MIN || port > PORT_MAX) throw new Error(`The game port must be a number from ${PORT_MIN} to ${PORT_MAX}.`);
		const lines = [];
		const motd = motdText(p.sessionName);
		if (motd) lines.push(`motd=${motd}`);
		lines.push(`server-port=${port}`);
		return { relPath: PROPERTIES, content: lines.join("\r\n") + "\r\n" };
	},
	// eula.txt is written only when the EULA box was ticked (the create form refuses the server otherwise: requiresEula).
	buildExtraFiles: (p) =>
		p.eulaAccepted === true
			? [
					{
						relPath: "eula.txt",
						content:
							"#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://aka.ms/MinecraftEULA).\r\neula=true\r\n",
					},
				]
			: [],
	postWrite: async () => ({
		warnings: [
			"Minecraft's own stop command (`stop`) can only be typed into the server's window; the panel cannot send it. The panel's Stop closes that window and, after 15 seconds, ends the java process, which skips the server's normal shutdown and its final save. Type `stop` into the window first when that matters.",
		],
	}),
	buildServerEntry: (p) => {
		const serverProps = `${p.installDir}\\${PROPERTIES}`;
		return {
			name: p.name,
			type: "minecraft-vanilla",
			method: "process",
			host: "127.0.0.1",
			port: p.port,
			sessionName: motdText(p.sessionName) || p.name,
			configPath: serverProps,
			configPaths: { [PROPERTIES]: serverProps },
			startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
			workingDir: `${p.installDir}`,
			// The program that stays running is the java process started with server.jar (dossier 01-basics). The panel matches the process
			// it finds by where it runs from, so another java program on the PC is not taken for this server. To confirm on a real install.
			processName: "java.exe",
			steamCmdPath: p.steamCmdExe,
			installDir: `${p.installDir}\\`,
			autoUpdate: false,
		};
	},
};

export default {
	template,
	// What a server keeps on disk that is not the game: its settings, the operator and whitelist lists, and the world folder. The
	// world folder is named by level-name in server.properties (the `property` entry), so a changed name is still backed up. The
	// dossier names no other files worth keeping; the game's own jar and libraries come back from Mojang.
	backup: {
		paths: [
			{ base: "property", file: PROPERTIES, key: "level-name", default: "world", label: "World", exclude: ["session.lock"] },
			{ base: "working", rel: PROPERTIES, label: "Server settings" },
			{ base: "working", rel: "ops.json", label: "Operators" },
			{ base: "working", rel: "whitelist.json", label: "Whitelist" },
		],
	},
	// The dossier does not say where the game writes its log, so the Logs tab has nothing to read. The server's console window
	// shows the output while it runs.
	logs: [],
	launchOptions: true,
};

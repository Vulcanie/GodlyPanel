// Don't Starve Together (Klei). Dedicated server tool: Steam app 343050 (anonymous login works), game: app 322330.
// Built from the research dossier (docs, Klei forum posts, the game's own scripts and three test runs of build 756039); no real
// install has been through the panel's create flow yet, so the points listed as unverified in the notes still need a real run.
//
// - One process per shard, and the panel runs one process per server, so this first version is a SINGLE overworld shard: the
//   Master shard only, no Caves. `shard_enabled = false` is written in cluster.ini (the game's own single-shard setting).
// - The exe has to be started from bin64. The start script goes there first; everything the game writes goes in the server's own
//   `data` folder (-persistent_storage_root) so two servers on one PC, or the user's Documents, are never shared.
// - Ports are on the launch line (they win over server.ini), so the panel's "change port" and the Launch options form can move
//   them. The game port is -port, the Steam "master server" port is the entry's queryPort, and the Steam authentication port is
//   kept two above the game port (an implicit port) so no two DST servers on one PC can pick the same one.
// - Online play needs cluster_token.txt from the person's Klei account. The create form asks for it (a template field). Without
//   one the cluster is written as an offline (LAN-only) one, which does not need a token.
// - Mods: a list of Steam Workshop ids becomes ServerModSetup(...) lines in mods\dedicated_server_mods_setup.lua (what to download)
//   and an enabled entry per mod in Master\modoverrides.lua (what to run).
// - Stopping: the game only saves cleanly on its own shutdown command (c_shutdown() typed into the console), which the panel has
//   no way to send. The panel closes the process and forces it after a grace period. The world is saved at the end of every
//   in-game day (autosaver_enabled); anything since then is lost on a Stop.

const EXE = "dontstarve_dedicated_server_nullrenderer_x64.exe";
const CONF_DIR = "DoNotStarveTogether";
const CLUSTER = "Cluster_1";
const SHARD = "Master";
// Everything below the server's folder that belongs to the cluster.
const CLUSTER_REL = `data\\${CONF_DIR}\\${CLUSTER}`;

// The window title in `start /MIN "<title>"`. A server's name is typed by a person, and cmd acts on these characters.
const windowTitle = (name) => String(name ?? "").replace(/["%&|<>^!\u0000-\u001f]/g, "").trim() || "Dont Starve Together";

const wholeNumber = (value, fallback, min = 1, max = 64) => {
	const n = Math.trunc(Number(value));
	return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

// A value written into an INI line: one line, no leading or trailing blanks.
const iniText = (value) => String(value ?? "").replace(/[\u0000-\u001f]/g, " ").trim();

/**
 * The cluster token, as the game reads it from cluster_token.txt: one string with nothing else in the file. Empty means none.
 * Whitespace inside it, or a quote, can only be a mistake (a sentence pasted instead of the token).
 */
export function cleanClusterToken(raw) {
	const token = String(raw ?? "").trim();
	if (!token) return "";
	if (/[\s"'\u0000-\u001f]/.test(token)) throw new Error("The cluster token has spaces or quotes in it. Paste only the token itself, one long piece of text, from your Klei account's Game Servers page.");
	if (token.length > 512) throw new Error("The cluster token is much longer than a real one. Paste only the token itself.");
	return token;
}

/**
 * The Steam Workshop mod ids in a list typed by a person: ids, or Workshop links (`...?id=1234567`), separated by commas, spaces
 * or semicolons. Each must be a number. Collections are not told apart from mods here, so a collection id is not supported.
 */
export function parseWorkshopIds(raw) {
	const ids = [];
	for (const part of String(raw ?? "").split(/[\s,;]+/).filter(Boolean)) {
		const fromLink = /[?&]id=(\d+)/i.exec(part);
		const id = fromLink ? fromLink[1] : /^\d+$/.test(part) ? part : null;
		if (!id || id.length < 5 || id.length > 12) throw new Error(`"${part.slice(0, 40)}" is not a Steam Workshop mod id. Use the number at the end of the mod's Workshop page address (the part after ?id=), separated by commas.`);
		if (!ids.includes(id)) ids.push(id);
	}
	if (ids.length > 100) throw new Error("That is more than 100 mods. Start with fewer.");
	return ids;
}

const template = {
	id: "dst",
	displayName: "Don't Starve Together",
	type: "dst",
	method: "process",
	updateAppId: "343050",
	storeAppId: "322330",
	sharedInstall: false,
	// SteamCMD puts the game straight in the server's folder: bin64, mods and the rest are in its root.
	installLayoutRoot: "",
	// cluster_name, cluster_password, the cluster token (a field of its own) and the Workshop mods.
	fields: ["sessionName", "serverPassword", "clusterToken", "mods"],
	fieldMeta: {
		sessionName: { label: "Server Name (shown in the server list). This version runs the overworld only, no Caves.", type: "text" },
		clusterToken: { label: "Klei cluster token (get one at accounts.klei.com: Games, Don't Starve Together, Game Servers). Leave empty to make an offline server for your own network.", type: "text" },
		mods: { label: "Steam Workshop mod ids or links, comma-separated (optional). Only mods the server runs; client-only mods are installed by each player.", type: "text" },
	},
	// The Steam master server port is the one the server list uses to ask about the server; the panel records it as the query port.
	// The game also takes a Steam authentication port, kept at game port + 2.
	ports: [
		{ key: "port", label: "Game Port (UDP)", default: 8930 },
		{ key: "queryPort", label: "Steam Server Port (UDP)", default: 8933 },
	],
	implicitPorts: [
		{ offset: 1, label: "a companion port", precaution: true },
		{ offset: 2, label: "its Steam login port" },
	],
	// Rejects a bad token or mod list before the multi-gigabyte download starts, and hands the cleaned values on.
	resolveParams: async (raw) => {
		const ids = parseWorkshopIds(raw.mods);
		return { clusterToken: cleanClusterToken(raw.clusterToken), mods: ids.join(","), modIds: ids };
	},
	buildStartScriptFilename: () => "Start_DST.bat",
	buildStartScript: (p) =>
		[
			"@echo off",
			// The program has to be started from bin64.
			'cd /d "%~dp0bin64"',
			`start /MIN "${windowTitle(p.name)}" ${EXE} -console -persistent_storage_root "%~dp0data" -conf_dir ${CONF_DIR} -cluster ${CLUSTER} -shard ${SHARD} -port ${Number(p.port)} -steam_master_server_port ${Number(p.queryPort)} -steam_authentication_port ${Number(p.port) + 2}`,
			"",
		].join("\r\n"),
	// The cluster's shared settings. Only keys the research documents, with the game's own defaults except where noted: the
	// player limit (the game's is 16) and pausing an empty world are the panel's choice for a friends' server.
	buildConfigFile: (p) => {
		const token = String(p.clusterToken ?? "").trim();
		return {
			relPath: `${CLUSTER_REL}\\cluster.ini`,
			content: [
				"[GAMEPLAY]",
				"game_mode = survival",
				`max_players = ${wholeNumber(p.maxPlayers, 8)}`,
				"pvp = false",
				"pause_when_empty = true",
				"vote_enabled = true",
				"",
				"[NETWORK]",
				`cluster_name = ${iniText(p.sessionName) || iniText(p.name)}`,
				"cluster_description = ",
				`cluster_password = ${iniText(p.serverPassword)}`,
				// An online cluster needs the token; without one the cluster is an offline one, which does not.
				`offline_cluster = ${token ? "false" : "true"}`,
				"lan_only_cluster = false",
				"autosaver_enabled = true",
				"",
				"[MISC]",
				"console_enabled = true",
				"max_snapshots = 6",
				"",
				// One shard only (the overworld): the panel runs one process per server.
				"[SHARD]",
				"shard_enabled = false",
				"",
			].join("\r\n"),
		};
	},
	buildExtraFiles: (p) => {
		const files = [
			// The shard's own file. Its ports are on the launch line (the line wins), so none are written here.
			{ relPath: `${CLUSTER_REL}\\${SHARD}\\server.ini`, content: ["[SHARD]", "is_master = true", "", "[ACCOUNT]", "encode_user_path = true", ""].join("\r\n") },
		];
		const token = String(p.clusterToken ?? "").trim();
		// The token alone: any extra character at the end makes the game call it expired.
		if (token) files.push({ relPath: `${CLUSTER_REL}\\cluster_token.txt`, content: token });
		const ids = Array.isArray(p.modIds) ? p.modIds : [];
		if (ids.length > 0) {
			files.push({
				relPath: "mods\\dedicated_server_mods_setup.lua",
				content: ["-- Written by GodlyPanel: the Steam Workshop mods this server downloads when it starts.", ...ids.map((id) => `ServerModSetup("${id}")`), ""].join("\r\n"),
			});
			files.push({
				relPath: `${CLUSTER_REL}\\${SHARD}\\modoverrides.lua`,
				content: ["return {", ...ids.map((id) => `  ["workshop-${id}"] = { enabled = true },`), "}", ""].join("\r\n"),
			});
		}
		return files;
	},
	postWrite: async (p) => {
		const warnings = [];
		const port = Number(p.port);
		if (!String(p.clusterToken ?? "").trim() && (port < 10998 || port > 11018)) {
			warnings.push(`No cluster token was given, so this is an offline server. Don't Starve Together documents game ports 10998 to 11018 for those, and ${port} is outside that range. If the server does not start or players on your network cannot find it, change the game port into that range.`);
		}
		return { warnings };
	},
	buildServerEntry: (p) => ({
		name: p.name,
		type: "dst",
		method: "process",
		host: "127.0.0.1",
		port: p.port,
		queryPort: p.queryPort,
		sessionName: iniText(p.sessionName) || p.name,
		serverPassword: p.serverPassword,
		configPath: `${p.installDir}\\${CLUSTER_REL}\\cluster.ini`,
		configPaths: { "cluster.ini": `${p.installDir}\\${CLUSTER_REL}\\cluster.ini` },
		startScriptPath: `${p.installDir}\\${p.startScriptFilename}`,
		workingDir: `${p.installDir}`,
		// Every shard runs this same program, but this server has one (the Master).
		processName: EXE,
		steamCmdPath: p.steamCmdExe,
		installDir: `${p.installDir}\\`,
		updateAppId: "343050",
		autoUpdate: false,
	}),
};

export default {
	template,
	// The whole cluster folder: its settings, the lists of admins and banned players, and the world (Master\save). The cluster token
	// is left out, so a backup that is copied elsewhere does not carry the account's token.
	backup: {
		paths: [{ base: "working", rel: `data/${CONF_DIR}/${CLUSTER}`, label: "World and settings", exclude: ["cluster_token.txt"] }],
	},
	logs: [
		{ kind: "file", base: "working", rel: `data/${CONF_DIR}/${CLUSTER}/${SHARD}/server_log.txt`, label: "Server log" },
		{ kind: "file", base: "working", rel: `data/${CONF_DIR}/${CLUSTER}/${SHARD}/server_chat_log.txt`, label: "Chat log" },
	],
	launchOptions: true,
};

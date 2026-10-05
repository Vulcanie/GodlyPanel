// One source of truth for every setting: its default, how to validate it,
// whether changing it needs an API restart, and the label a settings form
// should show. Keeping these together is what stops the settings UI (Stage 4)
// from drifting out of sync with what the server actually honours.
//
// Deliberately narrow: a key only appears here once something actually reads
// it. A config file full of settings that silently do nothing is worse than a
// short one, so later stages grow this rather than it shipping half-dead.

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULTS = {
	schemaVersion: CURRENT_SCHEMA_VERSION,

	http: {
		port: 8765,
		bindAll: true,
	},

	network: {
		allowCgnat: true,
		allowLinkLocal: true,
		extraAllowedCidrs: [],
		extraAllowedHosts: [],
	},

	paths: {
		// "" means "derive it" — resolved against the data dir at load time, so
		// a portable install stays relocatable instead of baking in a path.
		serversRoot: "",
		steamCmdPath: "",
		jcmdPath: "",
	},

	portAllocation: {
		step: 10,
		reservedPorts: [],
	},

	polling: {
		serversMs: 7500,
		systemStatsMs: 10000,
		serverStatsMs: 15000,
		buildCheckMs: 900000,
		uploadSweepMs: 3600000,
		enableServerStats: true,
		enableHeapStats: true,
		enableBuildCheck: false,
	},

	storage: {
		quotaBytes: 0,
		enforce: "warn",
		scanIntervalMs: 3600000,
		scanConcurrency: 2,
	},

	servers: {
		defaultRconPasswordMode: "generate",
		defaultWindowMode: "hidden",
	},

	discord: {
		enabled: false,
		adminRoleId: "",
		// The slash-command bot. Its token is a secret (Settings -> Discord).
		botEnabled: false,
		botApplicationId: "",
		botGuildId: "",
	},

	backups: {
		// "" means a folder inside the data directory.
		dir: "",
		keepCount: 10,
		keepDays: 0,
		minFreeGB: 2,
	},

	startup: {
		openAtLogin: false,
		startHidden: true,
		// Servers set to start with the panel are started this far apart, so a
		// dozen games don't all load at once.
		autoStartDelaySec: 20,
	},

	metrics: {
		// A reading of CPU, memory and players per server, kept as history for the charts.
		enabled: true,
		sampleSec: 30,
	},

	updates: {
		// Ask GitHub's public releases list whether there is a newer GodlyPanel.
		check: true,
		includePrereleases: true,
		repo: "Vulcanie/GodlyPanel",
	},

	notifications: {
		// A native Windows notification. Webhook and email are set up with their own
		// secrets (Settings -> Notifications).
		desktop: true,
		events: [
			"server.crashed",
			"server.gave_up",
			"server.unresponsive",
			"server.restart_failed",
			"server.start_failed",
			"backup.failed",
			"backup.restore_failed",
			"backup.restart_failed",
			"schedule.failed",
			"disk.low",
			"panel.update_available",
			"panel.update_failed",
		],
		diskLowGB: 10,
		email: {
			enabled: false,
			host: "",
			port: 587,
			secure: false,
			from: "",
			to: "",
			user: "",
		},
	},

	recovery: {
		// How long a server has to be down before it counts as crashed, and how
		// many times in a window the panel will restart it before giving up.
		graceSec: 45,
		maxRestarts: 3,
		windowMin: 15,
		startupGraceMin: 10,
	},
};

/**
 * path        dotted location in the config object
 * type        "int" | "bool" | "string" | "enum" | "intArray"
 * restart     true when the running API can't pick the change up live
 */
export const FIELD_SPECS = [
	{
		path: "http.port",
		type: "int",
		min: 1024,
		max: 65535,
		restart: true,
		label: "Web port",
		help: "The port the panel is served on. Changing this restarts the API.",
	},
	{
		path: "http.bindAll",
		type: "bool",
		restart: true,
		label: "Allow access from your network",
		help: "Off means only this computer can open the panel.",
	},

	{
		path: "network.allowCgnat",
		type: "bool",
		restart: false,
		label: "Allow mesh VPN addresses",
		help: "Tailscale and ZeroTier use the 100.64.0.0/10 range. Turn off to allow only ordinary local addresses.",
	},
	{
		path: "network.allowLinkLocal",
		type: "bool",
		restart: false,
		label: "Allow link-local addresses",
		help: "Used when two machines are connected directly with no router.",
	},
	{
		path: "network.extraAllowedCidrs",
		type: "stringArray",
		restart: false,
		label: "Additional allowed networks",
		help: "Extra IP ranges to accept, e.g. 10.8.0.0/24 for a VPN.",
	},
	{
		path: "network.extraAllowedHosts",
		type: "stringArray",
		restart: false,
		label: "Additional allowed names",
		help: "Names you type in the address bar to reach the panel, besides its IP address and the computer's own name — e.g. a name your router gives it.",
	},

	{
		path: "paths.serversRoot",
		type: "string",
		restart: false,
		label: "Server install folder",
		help: "Where new game servers are installed. Blank uses a folder inside your data directory.",
	},
	{
		path: "paths.steamCmdPath",
		type: "string",
		restart: false,
		label: "SteamCMD location",
		help: "Blank downloads and manages SteamCMD automatically.",
	},
	{
		path: "paths.jcmdPath",
		type: "string",
		restart: false,
		label: "jcmd location",
		help: "Part of a JDK; used for Minecraft heap stats. Blank uses jcmd from PATH.",
	},

	{
		path: "portAllocation.step",
		type: "int",
		min: 1,
		max: 1000,
		restart: false,
		label: "Port spacing",
		help: "How far apart suggested ports are when creating servers.",
	},
	{
		path: "portAllocation.reservedPorts",
		type: "intArray",
		restart: false,
		label: "Reserved ports",
		help: "Ports that should never be suggested for a new server.",
	},

	{
		path: "polling.serversMs",
		type: "int",
		min: 2000,
		max: 120000,
		restart: false,
		label: "Server status interval (ms)",
	},
	{
		path: "polling.systemStatsMs",
		type: "int",
		min: 2000,
		max: 120000,
		restart: false,
		label: "System stats interval (ms)",
	},
	{
		path: "polling.serverStatsMs",
		type: "int",
		min: 5000,
		max: 300000,
		restart: false,
		label: "Per-server CPU/RAM interval (ms)",
	},
	{
		path: "polling.buildCheckMs",
		type: "int",
		min: 60000,
		max: 86400000,
		restart: false,
		label: "Steam update check interval (ms)",
	},
	{
		path: "polling.uploadSweepMs",
		type: "int",
		min: 300000,
		max: 86400000,
		restart: false,
		label: "Abandoned upload cleanup interval (ms)",
	},
	{
		path: "polling.enableServerStats",
		type: "bool",
		restart: false,
		label: "Collect per-server CPU/RAM",
		help: "The heaviest recurring check. Turn off on a low-powered machine.",
	},
	{
		path: "polling.enableHeapStats",
		type: "bool",
		restart: false,
		label: "Collect Minecraft heap usage",
		help: "Needs a JDK installed. Ignored if jcmd isn't available.",
	},
	{
		path: "polling.enableBuildCheck",
		type: "bool",
		restart: false,
		label: "Check Steam for game updates",
		help: "When on, servers with auto-update enabled will update and restart themselves.",
	},

	{
		path: "storage.quotaBytes",
		type: "int",
		min: 0,
		max: Number.MAX_SAFE_INTEGER,
		restart: false,
		label: "Storage limit (bytes)",
		help: "0 means no limit. Applies to your servers and app data combined.",
	},
	{
		path: "storage.enforce",
		type: "enum",
		values: ["off", "warn", "block"],
		restart: false,
		label: "When the limit is reached",
		help: "Warn shows it on the dashboard. Block also refuses new installs. Starting a server is never blocked.",
	},
	{
		path: "storage.scanIntervalMs",
		type: "int",
		min: 300000,
		max: 86400000,
		restart: false,
		label: "Storage recheck interval (ms)",
	},
	{
		path: "storage.scanConcurrency",
		type: "int",
		min: 1,
		max: 8,
		restart: false,
		label: "Folders scanned at once",
	},

	{
		path: "servers.defaultRconPasswordMode",
		type: "enum",
		values: ["generate", "fixed"],
		restart: false,
		label: "RCON password for new servers",
		help: "Generate a unique random password per server, or reuse one you set.",
	},
	{
		path: "servers.defaultWindowMode",
		type: "enum",
		values: ["minimized", "hidden", "windowless"],
		restart: false,
		label: "Server windows",
		help: "minimized: a taskbar entry per server. hidden: hidden as soon as it opens. windowless: launched directly with no window. Each server can override this.",
	},

	{
		path: "discord.enabled",
		type: "bool",
		restart: false,
		label: "Post status to Discord",
	},
	{
		path: "discord.adminRoleId",
		type: "string",
		restart: false,
		label: "Discord admin role mention",
	},
	{
		path: "discord.botEnabled",
		type: "bool",
		restart: false,
		label: "Discord bot (slash commands)",
		help: "Lets people in your Discord server see servers with /servers, /status and /players, and lets the admin role start, stop, restart and back them up.",
	},
	{
		path: "discord.botApplicationId",
		type: "string",
		restart: false,
		label: "Discord bot application ID",
		help: "From the Discord developer portal: your application's General Information page.",
	},
	{
		path: "discord.botGuildId",
		type: "string",
		restart: false,
		label: "Discord server (guild) ID",
		help: "Turn on Developer Mode in Discord, then right-click your server and choose Copy Server ID. The bot only answers there.",
	},

	{
		path: "backups.dir",
		type: "string",
		restart: false,
		label: "Backup folder",
		help: "Where backups are stored. Blank uses a folder inside your data directory. Put it on another drive to survive a disk failure.",
	},
	{
		path: "backups.keepCount",
		type: "int",
		min: 1,
		max: 500,
		restart: false,
		label: "Scheduled backups to keep",
		help: "Per server. Older scheduled backups are deleted; ones you made by hand never are.",
	},
	{
		path: "backups.keepDays",
		type: "int",
		min: 0,
		max: 3650,
		restart: false,
		label: "Delete scheduled backups older than (days)",
		help: "0 keeps them until the count above pushes them out.",
	},
	{
		path: "backups.minFreeGB",
		type: "int",
		min: 0,
		max: 100000,
		restart: false,
		label: "Refuse backups below this much free space (GB)",
		help: "A backup that would leave the drive with less than this is not started.",
	},

	{
		path: "startup.openAtLogin",
		type: "bool",
		restart: false,
		label: "Start GodlyPanel when I sign in to Windows",
	},
	{
		path: "startup.startHidden",
		type: "bool",
		restart: false,
		label: "Start in the tray, without opening the window",
	},
	{
		path: "startup.autoStartDelaySec",
		type: "int",
		min: 0,
		max: 600,
		restart: false,
		label: "Delay between starting servers at launch (seconds)",
		help: "For servers set to start with the panel.",
	},

	{
		path: "metrics.enabled",
		type: "bool",
		restart: false,
		label: "Keep a history of CPU, memory and players",
		help: "One reading every few seconds, stored as one point a minute for a week and one an hour for three months. It is a few megabytes at most.",
	},
	{
		path: "metrics.sampleSec",
		type: "int",
		min: 5,
		max: 600,
		restart: false,
		label: "Seconds between readings",
	},
	{
		path: "updates.check",
		type: "bool",
		restart: false,
		label: "Check for new versions of GodlyPanel",
		help: "Asks GitHub's public releases list, every few hours. Nothing about you or your servers is sent. It never installs anything.",
	},
	{
		path: "updates.includePrereleases",
		type: "bool",
		restart: false,
		label: "Include pre-release (alpha/beta) versions",
	},
	{
		path: "updates.repo",
		type: "string",
		restart: false,
		label: "Where releases are published",
		help: "owner/name on GitHub.",
	},
	{
		path: "notifications.desktop",
		type: "bool",
		restart: false,
		label: "Show Windows notifications",
	},
	{
		path: "notifications.events",
		type: "stringArray",
		restart: false,
		label: "Events to tell you about",
		help: "Event names, one per line. See the list on this page for what is available.",
	},
	{
		path: "notifications.diskLowGB",
		type: "int",
		min: 0,
		max: 100000,
		restart: false,
		label: "Warn when a drive has less free space than (GB)",
		help: "0 turns the low-space warning off.",
	},
	{ path: "notifications.email.enabled", type: "bool", restart: false, label: "Send email" },
	{ path: "notifications.email.host", type: "string", restart: false, label: "Mail server" },
	{ path: "notifications.email.port", type: "int", min: 1, max: 65535, restart: false, label: "Mail server port" },
	{ path: "notifications.email.secure", type: "bool", restart: false, label: "Use TLS from the start (port 465)" },
	{ path: "notifications.email.user", type: "string", restart: false, label: "Mail account name" },
	{ path: "notifications.email.from", type: "string", restart: false, label: "Send from" },
	{ path: "notifications.email.to", type: "string", restart: false, label: "Send to" },

	{
		path: "recovery.graceSec",
		type: "int",
		min: 10,
		max: 3600,
		restart: false,
		label: "Seconds down before it counts as a crash",
	},
	{
		path: "recovery.maxRestarts",
		type: "int",
		min: 1,
		max: 50,
		restart: false,
		label: "Automatic restarts before giving up",
		help: "Within the window below. Stops a server that crashes on every start from restarting forever.",
	},
	{
		path: "recovery.windowMin",
		type: "int",
		min: 1,
		max: 1440,
		restart: false,
		label: "Window for counting restarts (minutes)",
	},
	{
		path: "recovery.startupGraceMin",
		type: "int",
		min: 1,
		max: 120,
		restart: false,
		label: "Minutes a restarted server gets to come online",
	},
];

function getAt(obj, dotted) {
	return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setAt(obj, dotted, value) {
	const keys = dotted.split(".");
	const last = keys.pop();
	let cur = obj;
	for (const k of keys) {
		if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
		cur = cur[k];
	}
	cur[last] = value;
}

function clone(value) {
	return JSON.parse(JSON.stringify(value));
}

/**
 * Merge a raw (possibly hand-edited, possibly older) config over the defaults
 * and coerce every known field into range.
 *
 * Out-of-range numbers are clamped rather than rejected: a config the user
 * typo'd shouldn't stop the panel booting, and silently reverting to a default
 * hides the mistake. Unknown keys are preserved so downgrading and upgrading
 * again doesn't quietly discard settings a newer version wrote.
 *
 * @returns {{ config: object, issues: string[] }}
 */
export function coerceConfig(raw) {
	const issues = [];
	const config = clone(DEFAULTS);

	if (raw && typeof raw === "object") {
		// Deep-merge known object branches, preserve everything else verbatim.
		for (const [key, value] of Object.entries(raw)) {
			if (
				value &&
				typeof value === "object" &&
				!Array.isArray(value) &&
				config[key] &&
				typeof config[key] === "object"
			) {
				Object.assign(config[key], value);
			} else {
				config[key] = value;
			}
		}
	}

	for (const spec of FIELD_SPECS) {
		const value = getAt(config, spec.path);
		const fallback = getAt(DEFAULTS, spec.path);

		if (value === undefined || value === null) {
			setAt(config, spec.path, fallback);
			continue;
		}

		switch (spec.type) {
			case "int": {
				let n = Number(value);
				if (!Number.isFinite(n)) {
					issues.push(`${spec.path}: "${value}" is not a number — using ${fallback}.`);
					n = fallback;
				}
				n = Math.round(n);
				if (spec.min !== undefined && n < spec.min) {
					issues.push(`${spec.path}: ${n} is below the minimum — clamped to ${spec.min}.`);
					n = spec.min;
				}
				if (spec.max !== undefined && n > spec.max) {
					issues.push(`${spec.path}: ${n} is above the maximum — clamped to ${spec.max}.`);
					n = spec.max;
				}
				setAt(config, spec.path, n);
				break;
			}
			case "bool":
				setAt(config, spec.path, Boolean(value));
				break;
			case "string":
				setAt(config, spec.path, String(value));
				break;
			case "enum":
				if (!spec.values.includes(value)) {
					issues.push(
						`${spec.path}: "${value}" is not one of ${spec.values.join(", ")} — using ${fallback}.`,
					);
					setAt(config, spec.path, fallback);
				}
				break;
			case "stringArray": {
				const arr = Array.isArray(value) ? value : [];
				if (!Array.isArray(value)) {
					issues.push(`${spec.path}: expected a list — using an empty one.`);
				}
				setAt(
					config,
					spec.path,
					arr.map(String).map((s) => s.trim()).filter(Boolean),
				);
				break;
			}
			case "intArray": {
				const arr = Array.isArray(value) ? value : [];
				if (!Array.isArray(value)) {
					issues.push(`${spec.path}: expected a list — using an empty one.`);
				}
				setAt(
					config,
					spec.path,
					arr.map(Number).filter((n) => Number.isFinite(n)).map(Math.round),
				);
				break;
			}
			default:
				break;
		}
	}

	config.schemaVersion = CURRENT_SCHEMA_VERSION;
	return { config, issues };
}

/** Field paths that can't be applied to a running API. */
export function restartRequiredFor(changedPaths) {
	const restartPaths = new Set(
		FIELD_SPECS.filter((s) => s.restart).map((s) => s.path),
	);
	return changedPaths.filter((p) => restartPaths.has(p));
}

/** Flatten a config object to dotted paths, for diffing two versions. */
export function changedPaths(before, after) {
	return FIELD_SPECS.map((s) => s.path).filter(
		(p) => JSON.stringify(getAt(before, p)) !== JSON.stringify(getAt(after, p)),
	);
}

export { getAt, setAt };

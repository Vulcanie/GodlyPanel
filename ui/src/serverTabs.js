// The tabs of a server's page, and which role sees which. Kept apart from the page so the command palette can list them without
// loading the page.

const ALL = [
	{ key: "overview", label: "Overview", words: "status start stop restart update console rcon charts cpu memory stats controls live", operator: true },
	{ key: "settings", label: "Settings", words: "config configuration options rules ini launch arguments history versions undo", admin: true },
	{ key: "players", label: "Players", words: "who online kick ban whitelist admins", operator: true },
	{ key: "backups", label: "Backups", words: "backup restore save world copy off-site", operator: true },
	{ key: "schedules", label: "Schedules", words: "schedule timer restart announce automatic cron", operator: true },
	{ key: "logs", label: "Logs", words: "log output errors search", operator: true },
	{ key: "network", label: "Network", words: "ports firewall address join ip forward open", operator: true },
	{ key: "mods", label: "Mods", words: "mods workshop thunderstore modpack plugins", admin: true },
	{ key: "activity", label: "Activity", words: "events history audit who did", operator: true },
	{ key: "automation", label: "Automation", words: "crash restart hang auto start presets clone motd rcon password message of the day", admin: true },
	{ key: "advanced", label: "Advanced", words: "window hidden minimized launch program priority folder location delete remove batch script", admin: true },
];

/** The tabs this role sees, in order. */
export function serverTabs(isAdmin) {
	return ALL.filter((t) => (isAdmin ? true : t.operator));
}

export const DEFAULT_TAB = "overview";

// The tabs of a server's page, and the permission each one needs. Kept apart from the page so the command palette can list them
// without loading the page. The permissions are the ones the server's routes check (src/server/routes/operations.js), so a tab
// shows exactly when the server would accept its requests.

const ALL = [
	{ key: "overview", label: "Overview", words: "status start stop restart update console rcon charts cpu memory stats controls live", permission: "server.control" },
	{ key: "settings", label: "Settings", words: "config configuration options rules ini launch arguments history versions undo", admin: true },
	{ key: "players", label: "Players", words: "who online kick ban whitelist admins", permission: "server.players" },
	{ key: "backups", label: "Backups", words: "backup restore save world copy off-site", permission: "server.backup" },
	{ key: "schedules", label: "Schedules", words: "schedule timer restart announce automatic cron", permission: "schedules.view" },
	{ key: "logs", label: "Logs", words: "log output errors search", permission: "server.logs" },
	{ key: "network", label: "Network", words: "ports firewall address join ip forward open", permission: "server.control" },
	{ key: "mods", label: "Mods", words: "mods workshop thunderstore modpack plugins", admin: true },
	{ key: "activity", label: "Activity", words: "events history audit who did", permission: "activity.view" },
	{ key: "automation", label: "Automation", words: "crash restart hang auto start presets clone motd rcon password message of the day", admin: true },
	{ key: "advanced", label: "Advanced", words: "window hidden minimized launch program priority folder location delete remove batch script", admin: true },
];

/**
 * The tabs this person sees on one server, in order. `canOnServer(permission)` says whether they may do that permission on this
 * server. An administrator sees every tab. Admin-only tabs are never offered to anyone else, so the check is skipped for them.
 */
export function serverTabs(isAdmin, canOnServer) {
	if (isAdmin) return ALL;
	return ALL.filter((t) => !t.admin && canOnServer(t.permission));
}

export const DEFAULT_TAB = "overview";

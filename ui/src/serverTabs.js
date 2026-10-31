import { t } from "./i18n";

// The tabs of a server's page, and the permission each one needs. Kept apart from the page so the command palette can list them
// without loading the page. The permissions are the ones the server's routes check (src/server/routes/operations.js), so a tab
// shows exactly when the server would accept its requests.

// `label` is a getter so each tab's name is read in the active language when it is used (the labels are not stored as English here).
const ALL = [
	{ key: "overview", get label() { return t("server.tab.overview"); }, words: "status start stop restart update console rcon charts cpu memory stats controls live", permission: "server.control" },
	{ key: "settings", get label() { return t("common.settings"); }, words: "config configuration options rules ini launch arguments history versions undo", admin: true },
	{ key: "players", get label() { return t("server.tab.players"); }, words: "who online kick ban whitelist admins", permission: "server.players" },
	{ key: "backups", get label() { return t("server.tab.backups"); }, words: "backup restore save world copy off-site", permission: "server.backup" },
	{ key: "schedules", get label() { return t("server.tab.schedules"); }, words: "schedule timer restart announce automatic cron", permission: "schedules.view" },
	{ key: "logs", get label() { return t("server.tab.logs"); }, words: "log output errors search", permission: "server.logs" },
	{ key: "network", get label() { return t("server.tab.network"); }, words: "ports firewall address join ip forward open", permission: "server.control" },
	{ key: "mods", get label() { return t("server.tab.mods"); }, words: "mods workshop thunderstore modpack plugins", admin: true },
	{ key: "files", get label() { return t("server.tab.files"); }, words: "files folder upload download edit config text zip trash", permission: "files.view" },
	{ key: "activity", get label() { return t("server.tab.activity"); }, words: "events history audit who did", permission: "activity.view" },
	{ key: "automation", get label() { return t("server.tab.automation"); }, words: "crash restart hang auto start presets clone motd rcon password message of the day", admin: true },
	{ key: "advanced", get label() { return t("server.tab.advanced"); }, words: "window hidden minimized launch program priority folder location delete remove batch script", admin: true },
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

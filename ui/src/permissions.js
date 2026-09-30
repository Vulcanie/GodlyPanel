// What the interface offers each role. This only decides what to show: the server
// checks every request again, so editing this in the browser unlocks nothing.
// Keep it in step with src/server/middleware/permissions.js.

const MODERATOR = new Set([
	"server.control",
	"server.console",
	"server.update",
	"server.backup",
	"server.logs",
	"server.players",
	"players.kick",
	"players.ban",
	"activity.view",
	"schedules.view",
	"metrics.view",
]);

export function can(role, permission) {
	if (role === "admin") return true;
	if (role === "moderator") return MODERATOR.has(permission);
	return false;
}

/** May run servers day to day: an administrator or a moderator. */
export const isOperator = (role) => role === "admin" || role === "moderator";

export const ROLE_LABELS = { admin: "Administrator", moderator: "Moderator", guest: "Viewer" };

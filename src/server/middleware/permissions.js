// What each role may do. Admins may do everything; guests only look. A moderator
// runs the servers day to day (start, stop, update, back up, read logs and see
// who is on) but can't change how they are set up, read their passwords, delete
// anything, restore over a world, or manage people and settings.
//
// A moderator can also be limited to some servers (see userStore's `servers`).

export const PERMISSIONS = [
	"server.control", // start, stop, restart
	"server.console", // send RCON commands
	"server.update", // run a game update
	"server.backup", // list and take backups
	"server.logs",
	"server.players",
	"activity.view",
	"schedules.view",
	"metrics.view",
];

export const ROLE_PERMISSIONS = {
	admin: null, // null = everything
	moderator: new Set(PERMISSIONS),
	guest: new Set(),
};

export const ROLES = Object.keys(ROLE_PERMISSIONS);

export function can(user, permission) {
	if (!user) return false;
	const granted = ROLE_PERMISSIONS[user.role];
	if (granted === undefined) return false;
	return granted === null || granted.has(permission);
}

/** Admins, and anyone not limited to a list of servers, may act on any server. */
export function canAccessServer(user, serverName) {
	if (!user) return false;
	if (user.role === "admin") return true;
	return !Array.isArray(user.servers) || user.servers.includes(serverName);
}

/**
 * Route guard. When the route has a :serverName the server limit is enforced too,
 * so a moderator limited to one game can't reach another by editing the address.
 */
export function requirePermission(permission) {
	return (req, res, next) => {
		if (!req.user) return res.status(401).json({ error: "Sign in required.", code: "unauthenticated" });
		if (!can(req.user, permission)) return res.status(403).json({ error: "You don't have access to that.", code: "forbidden" });
		if (req.server && !canAccessServer(req.user, req.server.name)) {
			return res.status(403).json({ error: "You don't have access to that server.", code: "forbidden_server" });
		}
		next();
	};
}

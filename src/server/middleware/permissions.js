// What each role may do. Admins may do everything; guests only look. A moderator
// runs the servers day to day (start, stop, update, back up, read logs and see
// who is on) but can't change how they are set up, read their passwords, delete
// anything, restore over a world, or manage people and settings.
//
// A moderator can also be limited to some servers (see userStore's `servers`).

import { PERMISSIONS, MODERATOR_PERMISSIONS, PERMISSION_GROUPS } from "../data/permissionCatalog.js";
import { permissionsFor } from "../data/roleStore.js";

// The names live in permissionCatalog.js. They are re-exported here so existing imports keep working.
export { PERMISSIONS, PERMISSION_GROUPS };

// The three built-in roles. Custom roles are kept in roleStore.js, which `can` asks for every check.
export const ROLE_PERMISSIONS = {
	admin: null, // null = everything
	moderator: new Set(MODERATOR_PERMISSIONS),
	guest: new Set(),
};

export const ROLES = Object.keys(ROLE_PERMISSIONS);

/**
 * The role that applies to this user on this server. A per-server role is used when one is set. An "admin" entry is never
 * used: otherwise anyone who could write one entry could make someone admin of a single server, so the user keeps their own role.
 */
function roleIdFor(user, serverName) {
	if (typeof serverName === "string" && user.serverRoles && typeof user.serverRoles === "object") {
		// Only the object's own property counts, so an inherited name like "constructor" is never mistaken for an override.
		const override = Object.getOwnPropertyDescriptor(user.serverRoles, serverName)?.value;
		if (typeof override === "string" && override !== "admin") return override;
	}
	return user.role;
}

export function can(user, permission, serverName = undefined) {
	if (!user) return false;
	const granted = permissionsFor(roleIdFor(user, serverName));
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

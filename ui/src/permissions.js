// What the interface offers a person. The lists come from the server with the session (/api/auth/me), so this module never
// decides what an account may do by its role name: a custom role has no name here, only its list. This only decides what to
// show. The server checks every request again, so editing these lists in the browser unlocks nothing.

// Whether a value is an object we can ask about its own keys. Null and primitives are not.
const isObject = (value) => value !== null && typeof value === "object";

// The list that applies on one server. A per-server role replaces the global list on that server only. The server name is a
// key from the server, so it is checked with Object.hasOwn: "constructor" or "__proto__" must not pick up something inherited.
function listFor(user, serverName) {
	const perServer = user.serverPermissions;
	if (typeof serverName === "string" && isObject(perServer) && Object.hasOwn(perServer, serverName)) return perServer[serverName];
	return user.permissions;
}

/** May this person do `permission`, on `serverName` when given. */
export function can(user, permission, serverName) {
	if (!user) return false;
	const list = listFor(user, serverName);
	return Array.isArray(list) && list.includes(permission);
}

/** May run servers day to day: holds at least one permission, globally or on any one server. A guest with nothing is not. */
export function isOperator(user) {
	if (!user) return false;
	if (Array.isArray(user.permissions) && user.permissions.length > 0) return true;
	if (!isObject(user.serverPermissions)) return false;
	return Object.values(user.serverPermissions).some((list) => Array.isArray(list) && list.length > 0);
}

/** May do `permission` either globally or on some server. For pages that are not about one server, such as Activity. */
export function canAnywhere(user, permission) {
	if (!user) return false;
	if (can(user, permission)) return true;
	if (!isObject(user.serverPermissions)) return false;
	return Object.values(user.serverPermissions).some((list) => Array.isArray(list) && list.includes(permission));
}

export const ROLE_LABELS = { admin: "Administrator", moderator: "Moderator", guest: "Viewer" };

/** The name to show for a role. A custom role has no label yet, so its id is shown as it is. */
export function roleLabel(role) {
	return Object.hasOwn(ROLE_LABELS, role) ? ROLE_LABELS[role] : role;
}

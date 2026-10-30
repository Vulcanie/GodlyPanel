// The rules behind the roles page and the access dialog on the people page. Pure functions only, so they can be tested without a
// browser. They decide what to show; the server checks every change again.

// Keys come from the server and from the browser's own lists, so every lookup goes through Object.hasOwn: a name such as
// "constructor" must not pick up something inherited from Object.prototype.

export const PERMISSION_LABELS = {
	"server.control": "Start, stop and restart",
	"server.console": "Use the console",
	"server.update": "Update the game",
	"server.backup": "Back up servers",
	"server.logs": "Read logs",
	"server.players": "See who is online",
	"players.kick": "Kick players",
	"players.ban": "Ban players",
	"activity.view": "See the activity feed",
	"schedules.view": "See schedules",
	"metrics.view": "See charts and stats",
	"files.view": "Browse files",
	"files.edit": "Edit files",
	"files.delete": "Delete files",
	"mods.manage": "Manage mods",
	"servers.migrate": "Move servers",
	"roles.manage": "Create and edit roles",
};

export const GROUP_LABELS = {
	control: "Running servers",
	backups: "Backups",
	monitoring: "Watching",
	players: "Players",
	files: "Files",
	mods: "Mods",
	admin: "Administration",
};

// The three roles that exist before anyone makes one. Their names are what the people page has always shown.
const BUILT_IN_ROLES = [
	{ id: "admin", name: "Administrator" },
	{ id: "moderator", name: "Moderator" },
	{ id: "guest", name: "Viewer" },
];

/** A plain-English label for a permission. An unknown name is shown as it is. */
export function permissionLabel(name) {
	return typeof name === "string" && Object.hasOwn(PERMISSION_LABELS, name) ? PERMISSION_LABELS[name] : name;
}

/** A plain-English label for a permission group. An unknown group is shown as its id. */
export function groupLabel(id) {
	return typeof id === "string" && Object.hasOwn(GROUP_LABELS, id) ? GROUP_LABELS[id] : id;
}

/**
 * The permissions the page offers, sorted into the server's groups in the server's order. Only permissions in `permissions` are
 * kept, and a group with none of them is left out. A permission in no group lands in a last "Other" group, so a permission added
 * later still shows up instead of disappearing.
 */
export function groupedPermissions(groups, permissions) {
	if (!Array.isArray(permissions)) return [];
	const groupMap = groups !== null && typeof groups === "object" && !Array.isArray(groups) ? groups : {};
	const present = new Set(permissions);
	const placed = new Set();
	const out = [];

	for (const id of Object.keys(groupMap)) {
		const members = Array.isArray(groupMap[id]) ? groupMap[id] : [];
		const items = members.filter((p) => present.has(p));
		for (const p of items) placed.add(p);
		if (items.length > 0) out.push({ id, label: groupLabel(id), items });
	}

	const other = permissions.filter((p) => !placed.has(p));
	if (other.length > 0) out.push({ id: "other", label: "Other", items: [...new Set(other)] });
	return out;
}

/**
 * May the signed-in person grant this permission to someone else. An administrator may grant anything. Anyone else may only grant
 * what they hold themselves, so a non-admin with the roles permission cannot hand out more than they have.
 */
export function canGrant(actorPermissions, permission, isAdmin) {
	if (isAdmin) return true;
	return Array.isArray(actorPermissions) && actorPermissions.includes(permission);
}

/** The list with one permission added if it is missing, or removed if it is there. Returns a new sorted list; the input is untouched. */
export function togglePermission(list, permission) {
	const base = Array.isArray(list) ? list : [];
	const next = base.includes(permission) ? base.filter((p) => p !== permission) : [...base, permission];
	return [...new Set(next)].sort();
}

/**
 * Whether a role can be limited to some servers. This mirrors the server's rule: the limit applies to every role except admin
 * (which always sees everything) and guest (which has its own server rules).
 */
export function canBeLimited(roleId) {
	return roleId !== "admin" && roleId !== "guest";
}

/** The roles to offer in a picker, as id and name, in the server's order. Without a usable list, the built-in three. */
export function roleOptions(roles) {
	if (!Array.isArray(roles)) return BUILT_IN_ROLES.map((r) => ({ ...r }));
	return roles.filter((r) => r !== null && typeof r === "object" && typeof r.id === "string").map((r) => ({ id: r.id, name: r.name }));
}

/** The name to show for a role id. Without the role in the list, the id is shown, and a built-in id still gets its name. */
export function roleNameOf(roles, id) {
	const found = roleOptions(roles).find((r) => r.id === id);
	return found ? found.name : id;
}

/**
 * One row per server for the per-server access editor. `role` is the server's own role id, or "" when the server simply follows
 * the person's access. The server names are looked up with Object.hasOwn, so a server called "constructor" stays its own row.
 */
export function serverRoleRows(serverNames, serverRoles) {
	if (!Array.isArray(serverNames)) return [];
	const map = serverRoles !== null && typeof serverRoles === "object" ? serverRoles : null;
	return serverNames.map((server) => {
		const role = map && Object.hasOwn(map, server) && typeof map[server] === "string" ? map[server] : "";
		return { server, role };
	});
}

/**
 * The rows turned back into what the server takes. Rows that follow the person's access are left out. When nothing is left, the
 * answer is null, which tells the server to drop every per-server role.
 */
export function serverRolesFromRows(rows) {
	if (!Array.isArray(rows)) return null;
	const kept = rows.filter((r) => r !== null && typeof r === "object" && typeof r.role === "string" && r.role !== "");
	if (kept.length === 0) return null;
	// Object.fromEntries defines each key as its own property, so a server named __proto__ stays a plain entry.
	return Object.fromEntries(kept.map((r) => [r.server, r.role]));
}

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

// The console scope: which commands a role may run. The server makes the real decision; these helpers only shape what the editor
// shows and what it is willing to send.

export const SCOPE_MODES = [
	{ id: "all", label: "Any command" },
	{ id: "allow", label: "Only these commands" },
	{ id: "deny", label: "Any command except these" },
];

// The server caps a scope at this many patterns, and each pattern at this length.
const PATTERN_MAX = 64;
const PATTERNS_MAX = 50;

function isPlainObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Turns any input into a scope the editor can work with. Anything that is not allow or deny is treated as an all scope, and an
// all scope has no patterns, since they would do nothing.
function scopeOf(scope) {
	const mode = isPlainObject(scope) && (scope.mode === "allow" || scope.mode === "deny") ? scope.mode : "all";
	return { mode, patterns: mode === "all" ? [] : Array.isArray(scope.patterns) ? scope.patterns : [] };
}

// Trims, lower-cases, drops blanks and removes repeats, keeping the first order. Non-string entries are dropped.
function tidyPatterns(list) {
	const seen = new Set();
	const out = [];
	for (const item of list) {
		if (typeof item !== "string") continue;
		const clean = item.trim().toLowerCase();
		if (clean === "" || seen.has(clean)) continue;
		seen.add(clean);
		out.push(clean);
	}
	return out;
}

/** A one-line description of a scope for the roles list, such as "Only 2 commands". Anything odd reads as "Any command". */
export function scopeSummary(scope) {
	if (!isPlainObject(scope)) return "Any command";
	const count = Array.isArray(scope.patterns) ? scope.patterns.length : 0;
	const noun = count === 1 ? "command" : "commands";
	if (scope.mode === "allow") return `Only ${count} ${noun}`;
	if (scope.mode === "deny") return `All but ${count} ${noun}`;
	return "Any command";
}

/** The commands typed into the box, one per line or separated by commas, cleaned up the way the server will read them. */
export function normalizePatterns(text) {
	if (typeof text !== "string") return [];
	return tidyPatterns(text.split(/[\r\n,]+/));
}

/** Why one pattern cannot be used, as a short message for the person. An empty string means it is fine. */
export function patternProblem(pattern) {
	if (typeof pattern !== "string" || pattern.trim() === "") return "Enter a command.";
	if (pattern.length > PATTERN_MAX) return "Keep it under 65 characters.";
	if (/[\u0000-\u001f\u007f]/.test(pattern)) return "No special characters.";
	if (/\s/.test(pattern)) return "One word only.";
	return "";
}

/** The first reason a scope cannot be saved, or an empty string when it can. An all scope always passes. */
export function scopeProblem(scope) {
	const { mode, patterns } = scopeOf(scope);
	if (mode === "all") return "";
	if (patterns.length > PATTERNS_MAX) return "At most 50 commands.";
	if (mode === "allow" && patterns.length === 0) return "Add at least one command, or choose Any command.";
	for (const pattern of patterns) {
		const problem = patternProblem(pattern);
		if (problem) return problem;
	}
	return "";
}

/**
 * Whether the scope differs from another one. The order and letter case of the commands do not count, so only a real change
 * counts. A scope that is not valid is compared as an all scope.
 */
export function scopeChanged(a, b) {
	const left = scopeOf(a);
	const right = scopeOf(b);
	if (left.mode !== right.mode) return true;
	const leftList = [...new Set(tidyPatterns(left.patterns))].sort();
	const rightList = [...new Set(tidyPatterns(right.patterns))].sort();
	return leftList.join("\n") !== rightList.join("\n");
}

/** A fresh copy of a preset's mode and patterns, so editing the form never changes the preset itself. */
export function applyPreset(preset) {
	const { mode, patterns } = scopeOf(preset);
	return { mode, patterns: patterns.filter((p) => typeof p === "string") };
}

import { describe, it, expect } from "vitest";
import {
	PERMISSION_LABELS,
	GROUP_LABELS,
	permissionLabel,
	groupLabel,
	groupedPermissions,
	canGrant,
	togglePermission,
	canBeLimited,
	roleOptions,
	roleNameOf,
	serverRoleRows,
	serverRolesFromRows,
	SCOPE_MODES,
	scopeSummary,
	normalizePatterns,
	patternProblem,
	scopeProblem,
	scopeChanged,
	applyPreset,
} from "../roleEditor.js";

// The roles page and the people page only decide what to show. These tests pin the rules the screens rely on; the server checks
// every change again.

const ALL_PERMISSIONS = [
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
	"files.view",
	"files.edit",
	"files.delete",
	"mods.manage",
	"servers.migrate",
	"roles.manage",
];

const GROUPS = {
	control: ["server.control", "server.console", "server.update"],
	backups: ["server.backup"],
	monitoring: ["server.logs", "activity.view", "schedules.view", "metrics.view"],
	players: ["server.players", "players.kick", "players.ban"],
	files: ["files.view", "files.edit", "files.delete"],
	mods: ["mods.manage"],
	admin: ["servers.migrate", "roles.manage"],
};

describe("PERMISSION_LABELS and permissionLabel", () => {
	it("has a plain-English label for each of the 17 permissions", () => {
		expect(Object.keys(PERMISSION_LABELS).sort()).toEqual([...ALL_PERMISSIONS].sort());
		expect(PERMISSION_LABELS["server.control"]).toBe("Start, stop and restart");
		expect(PERMISSION_LABELS["roles.manage"]).toBe("Create and edit roles");
	});

	it("returns the label for a known permission", () => {
		expect(permissionLabel("players.ban")).toBe("Ban players");
	});

	it("returns the name itself for an unknown permission", () => {
		expect(permissionLabel("made.up")).toBe("made.up");
		expect(permissionLabel("")).toBe("");
	});

	it("does not pick up inherited keys", () => {
		expect(permissionLabel("constructor")).toBe("constructor");
		expect(permissionLabel("toString")).toBe("toString");
		expect(permissionLabel("__proto__")).toBe("__proto__");
	});
});

describe("GROUP_LABELS and groupLabel", () => {
	it("has the seven group labels", () => {
		expect(GROUP_LABELS).toEqual({
			control: "Running servers",
			backups: "Backups",
			monitoring: "Watching",
			players: "Players",
			files: "Files",
			mods: "Mods",
			admin: "Administration",
		});
	});

	it("returns the label for a known group and the id for an unknown one", () => {
		expect(groupLabel("files")).toBe("Files");
		expect(groupLabel("secret")).toBe("secret");
		expect(groupLabel("constructor")).toBe("constructor");
	});
});

describe("groupedPermissions", () => {
	it("follows the server's group order and keeps only permissions present", () => {
		const result = groupedPermissions(GROUPS, ["roles.manage", "server.console", "server.control", "files.view"]);
		expect(result).toEqual([
			{ id: "control", label: "Running servers", items: ["server.control", "server.console"] },
			{ id: "files", label: "Files", items: ["files.view"] },
			{ id: "admin", label: "Administration", items: ["roles.manage"] },
		]);
	});

	it("skips groups with nothing present", () => {
		const result = groupedPermissions(GROUPS, ["mods.manage"]);
		expect(result).toEqual([{ id: "mods", label: "Mods", items: ["mods.manage"] }]);
	});

	it("puts permissions in no group into a final Other group", () => {
		const result = groupedPermissions(GROUPS, ["mods.manage", "brand.new", "other.one"]);
		expect(result[result.length - 1]).toEqual({ id: "other", label: "Other", items: ["brand.new", "other.one"] });
		expect(result.map((g) => g.id)).toEqual(["mods", "other"]);
	});

	it("does not add an Other group when every permission is grouped", () => {
		const result = groupedPermissions(GROUPS, ["mods.manage"]);
		expect(result.some((g) => g.id === "other")).toBe(false);
	});

	it("returns an empty list for no permissions", () => {
		expect(groupedPermissions(GROUPS, [])).toEqual([]);
	});

	it("treats null and non-array inputs as empty", () => {
		expect(groupedPermissions(null, null)).toEqual([]);
		expect(groupedPermissions(undefined, "mods.manage")).toEqual([]);
		expect(groupedPermissions(GROUPS, { 0: "mods.manage" })).toEqual([]);
	});

	it("puts everything into Other when the groups are missing", () => {
		expect(groupedPermissions(null, ["mods.manage"])).toEqual([{ id: "other", label: "Other", items: ["mods.manage"] }]);
	});

	it("does not mutate its inputs", () => {
		const permissions = ["roles.manage", "mods.manage"];
		groupedPermissions(GROUPS, permissions);
		expect(permissions).toEqual(["roles.manage", "mods.manage"]);
	});
});

describe("canGrant", () => {
	it("lets an administrator grant anything", () => {
		expect(canGrant([], "roles.manage", true)).toBe(true);
		expect(canGrant(null, "anything", true)).toBe(true);
	});

	it("lets a non-admin grant only what they hold", () => {
		expect(canGrant(["roles.manage", "mods.manage"], "mods.manage", false)).toBe(true);
		expect(canGrant(["roles.manage"], "mods.manage", false)).toBe(false);
	});

	it("refuses a non-admin with no list", () => {
		expect(canGrant(null, "mods.manage", false)).toBe(false);
		expect(canGrant(undefined, "mods.manage")).toBe(false);
		expect(canGrant("mods.manage", "mods.manage", false)).toBe(false);
	});
});

describe("togglePermission", () => {
	it("adds a missing permission and keeps the list sorted", () => {
		expect(togglePermission(["server.update", "files.view"], "mods.manage")).toEqual(["files.view", "mods.manage", "server.update"]);
	});

	it("removes a present permission", () => {
		expect(togglePermission(["files.view", "mods.manage"], "files.view")).toEqual(["mods.manage"]);
	});

	it("never mutates the list it is given", () => {
		const list = ["mods.manage"];
		const next = togglePermission(list, "files.view");
		expect(list).toEqual(["mods.manage"]);
		expect(next).not.toBe(list);
	});

	it("de-duplicates", () => {
		expect(togglePermission(["mods.manage", "mods.manage"], "files.view")).toEqual(["files.view", "mods.manage"]);
	});

	it("treats a non-array list as empty", () => {
		expect(togglePermission(null, "files.view")).toEqual(["files.view"]);
		expect(togglePermission("files.view", "files.view")).toEqual(["files.view"]);
	});
});

describe("canBeLimited", () => {
	it("is false for admin and guest, true for every other role", () => {
		expect(canBeLimited("admin")).toBe(false);
		expect(canBeLimited("guest")).toBe(false);
		expect(canBeLimited("moderator")).toBe(true);
		expect(canBeLimited("r-1a2b3c4d")).toBe(true);
	});

	it("is true for an odd value, since only admin and guest are exempt", () => {
		expect(canBeLimited(null)).toBe(true);
		expect(canBeLimited(undefined)).toBe(true);
	});
});

describe("roleOptions", () => {
	it("returns id and name for each role in the server's order", () => {
		const roles = [
			{ id: "admin", name: "Administrator", locked: true, permissions: [], commandScope: "all", users: 1 },
			{ id: "r-1a2b3c4d", name: "Night shift", locked: false, permissions: [], commandScope: "all", users: 0 },
		];
		expect(roleOptions(roles)).toEqual([
			{ id: "admin", name: "Administrator" },
			{ id: "r-1a2b3c4d", name: "Night shift" },
		]);
	});

	it("returns the three built-in roles when roles is not an array", () => {
		const builtIns = [
			{ id: "admin", name: "Administrator" },
			{ id: "moderator", name: "Moderator" },
			{ id: "guest", name: "Viewer" },
		];
		expect(roleOptions(null)).toEqual(builtIns);
		expect(roleOptions(undefined)).toEqual(builtIns);
		expect(roleOptions({ id: "admin" })).toEqual(builtIns);
	});

	it("skips entries that are not roles", () => {
		expect(roleOptions([null, "moderator", { id: "moderator", name: "Moderator" }])).toEqual([{ id: "moderator", name: "Moderator" }]);
	});
});

describe("roleNameOf", () => {
	const roles = [
		{ id: "admin", name: "Administrator" },
		{ id: "r-1a2b3c4d", name: "Night shift" },
	];

	it("returns the name of a known role", () => {
		expect(roleNameOf(roles, "r-1a2b3c4d")).toBe("Night shift");
		expect(roleNameOf(roles, "admin")).toBe("Administrator");
	});

	it("returns the id for an unknown role", () => {
		expect(roleNameOf(roles, "r-deleted")).toBe("r-deleted");
	});

	it("falls back to the built-in names when the roles list is missing", () => {
		expect(roleNameOf(null, "moderator")).toBe("Moderator");
		expect(roleNameOf(undefined, "guest")).toBe("Viewer");
		expect(roleNameOf(null, "r-1a2b3c4d")).toBe("r-1a2b3c4d");
	});

	it("does not pick up inherited keys", () => {
		expect(roleNameOf(roles, "constructor")).toBe("constructor");
		expect(roleNameOf(roles, "__proto__")).toBe("__proto__");
	});
});

describe("serverRoleRows", () => {
	it("gives a row per server, with the role where one is set", () => {
		expect(serverRoleRows(["Alpha", "Beta"], { Beta: "moderator" })).toEqual([
			{ server: "Alpha", role: "" },
			{ server: "Beta", role: "moderator" },
		]);
	});

	it("gives an empty role when there is no map", () => {
		expect(serverRoleRows(["Alpha"], null)).toEqual([{ server: "Alpha", role: "" }]);
		expect(serverRoleRows(["Alpha"], undefined)).toEqual([{ server: "Alpha", role: "" }]);
	});

	it("does not pick up inherited keys for a server named like an object property", () => {
		expect(serverRoleRows(["constructor", "toString"], {})).toEqual([
			{ server: "constructor", role: "" },
			{ server: "toString", role: "" },
		]);
	});

	it("treats a non-array server list as empty", () => {
		expect(serverRoleRows(null, { Alpha: "guest" })).toEqual([]);
		expect(serverRoleRows("Alpha", null)).toEqual([]);
	});

	it("round-trips a server named __proto__ or constructor", () => {
		const serverRoles = JSON.parse('{"__proto__":"moderator","constructor":"guest"}');
		const rows = serverRoleRows(["__proto__", "constructor", "Alpha"], serverRoles);
		expect(rows).toEqual([
			{ server: "__proto__", role: "moderator" },
			{ server: "constructor", role: "guest" },
			{ server: "Alpha", role: "" },
		]);
		const back = serverRolesFromRows(rows);
		expect(Object.hasOwn(back, "__proto__")).toBe(true);
		expect(Object.getPrototypeOf(back)).toBe(Object.prototype);
		expect(JSON.stringify(back)).toBe('{"__proto__":"moderator","constructor":"guest"}');
	});
});

describe("serverRolesFromRows", () => {
	it("returns null when no row has a role", () => {
		expect(serverRolesFromRows([{ server: "Alpha", role: "" }])).toBe(null);
		expect(serverRolesFromRows([])).toBe(null);
	});

	it("returns an object of only the rows that have a role", () => {
		expect(
			serverRolesFromRows([
				{ server: "Alpha", role: "" },
				{ server: "Beta", role: "moderator" },
			]),
		).toEqual({ Beta: "moderator" });
	});

	it("treats odd rows as no role", () => {
		expect(serverRolesFromRows(null)).toBe(null);
		expect(serverRolesFromRows([null, { server: "Alpha" }, { server: "Beta", role: null }])).toBe(null);
	});
});

describe("SCOPE_MODES", () => {
	it("lists the three modes in order with plain-English labels", () => {
		expect(SCOPE_MODES).toEqual([
			{ id: "all", label: "Any command" },
			{ id: "allow", label: "Only these commands" },
			{ id: "deny", label: "Any command except these" },
		]);
	});
});

describe("scopeSummary", () => {
	it("says Any command for an all scope", () => {
		expect(scopeSummary({ mode: "all", patterns: [] })).toBe("Any command");
	});

	it("counts the commands for an allow scope, with singular for one", () => {
		expect(scopeSummary({ mode: "allow", patterns: ["kick", "ban"] })).toBe("Only 2 commands");
		expect(scopeSummary({ mode: "allow", patterns: ["kick"] })).toBe("Only 1 command");
	});

	it("counts the commands left out for a deny scope, with singular for one", () => {
		expect(scopeSummary({ mode: "deny", patterns: ["stop", "say", "op"] })).toBe("All but 3 commands");
		expect(scopeSummary({ mode: "deny", patterns: ["stop"] })).toBe("All but 1 command");
	});

	it("says Any command for anything that is not a valid scope", () => {
		expect(scopeSummary(null)).toBe("Any command");
		expect(scopeSummary(undefined)).toBe("Any command");
		expect(scopeSummary(7)).toBe("Any command");
		expect(scopeSummary("allow")).toBe("Any command");
		expect(scopeSummary(["kick"])).toBe("Any command");
		expect(scopeSummary({ mode: "weird", patterns: ["kick"] })).toBe("Any command");
	});

	it("counts zero for an allow scope whose patterns are not a list", () => {
		expect(scopeSummary({ mode: "allow", patterns: "kick" })).toBe("Only 0 commands");
		expect(scopeSummary({ mode: "allow" })).toBe("Only 0 commands");
	});
});

describe("normalizePatterns", () => {
	it("splits on new lines and commas, trims, lower-cases and drops blanks", () => {
		expect(normalizePatterns(" Kick* \n\n BAN,  say ,,\r\nop ")).toEqual(["kick*", "ban", "say", "op"]);
	});

	it("de-duplicates while keeping the first order", () => {
		expect(normalizePatterns("ban\nkick\nBAN\nkick")).toEqual(["ban", "kick"]);
	});

	it("keeps a leading slash as typed", () => {
		expect(normalizePatterns("/kick")).toEqual(["/kick"]);
	});

	it("returns an empty list for blank text or text that is not a string", () => {
		expect(normalizePatterns("")).toEqual([]);
		expect(normalizePatterns("  \n , ")).toEqual([]);
		expect(normalizePatterns(null)).toEqual([]);
		expect(normalizePatterns(undefined)).toEqual([]);
		expect(normalizePatterns(42)).toEqual([]);
		expect(normalizePatterns(["kick"])).toEqual([]);
	});
});

describe("patternProblem", () => {
	it("returns an empty string for a fine pattern", () => {
		expect(patternProblem("kick*")).toBe("");
		expect(patternProblem("/kick")).toBe("");
	});

	it("asks for a command when the pattern is empty or blank", () => {
		expect(patternProblem("")).toBe("Enter a command.");
		expect(patternProblem("   ")).toBe("Enter a command.");
		expect(patternProblem(null)).toBe("Enter a command.");
		expect(patternProblem(undefined)).toBe("Enter a command.");
		expect(patternProblem(5)).toBe("Enter a command.");
	});

	it("accepts exactly 64 characters and refuses 65", () => {
		expect(patternProblem("a".repeat(64))).toBe("");
		expect(patternProblem("a".repeat(65))).toBe("Keep it under 65 characters.");
	});

	it("refuses control characters", () => {
		expect(patternProblem("ki\u0001ck")).toBe("No special characters.");
		expect(patternProblem("kick\u007f")).toBe("No special characters.");
	});

	it("refuses whitespace inside a pattern", () => {
		expect(patternProblem("kick me")).toBe("One word only.");
	});

	it("reports the control-character problem before the whitespace one", () => {
		expect(patternProblem("kick\tme")).toBe("No special characters.");
	});
});

describe("scopeProblem", () => {
	it("is empty for an all scope, whatever its patterns", () => {
		expect(scopeProblem({ mode: "all", patterns: [] })).toBe("");
		expect(scopeProblem({ mode: "all", patterns: Array(60).fill("x") })).toBe("");
		expect(scopeProblem(null)).toBe("");
	});

	it("allows exactly 50 patterns and refuses 51", () => {
		const fifty = Array.from({ length: 50 }, (_, i) => `cmd${i}`);
		expect(scopeProblem({ mode: "allow", patterns: fifty })).toBe("");
		expect(scopeProblem({ mode: "deny", patterns: [...fifty, "one-more"] })).toBe("At most 50 commands.");
	});

	it("asks for at least one command in allow mode", () => {
		expect(scopeProblem({ mode: "allow", patterns: [] })).toBe("Add at least one command, or choose Any command.");
		expect(scopeProblem({ mode: "allow", patterns: null })).toBe("Add at least one command, or choose Any command.");
	});

	it("allows deny mode with no patterns", () => {
		expect(scopeProblem({ mode: "deny", patterns: [] })).toBe("");
	});

	it("reports the first bad pattern", () => {
		expect(scopeProblem({ mode: "allow", patterns: ["kick", "", "kick me"] })).toBe("Enter a command.");
		expect(scopeProblem({ mode: "deny", patterns: ["kick", "kick me"] })).toBe("One word only.");
	});

	it("treats a non-list patterns value as no patterns", () => {
		expect(scopeProblem({ mode: "deny", patterns: "kick" })).toBe("");
		expect(scopeProblem({ mode: "allow", patterns: "kick" })).toBe("Add at least one command, or choose Any command.");
	});
});

describe("scopeChanged", () => {
	it("is false for the same scope", () => {
		expect(scopeChanged({ mode: "allow", patterns: ["kick"] }, { mode: "allow", patterns: ["kick"] })).toBe(false);
	});

	it("is true when the mode differs", () => {
		expect(scopeChanged({ mode: "allow", patterns: ["kick"] }, { mode: "deny", patterns: ["kick"] })).toBe(true);
	});

	it("ignores the order and case of the patterns", () => {
		expect(scopeChanged({ mode: "allow", patterns: ["kick", "ban"] }, { mode: "allow", patterns: ["Ban", "KICK"] })).toBe(false);
	});

	it("is true when a pattern is added or removed", () => {
		expect(scopeChanged({ mode: "allow", patterns: ["kick"] }, { mode: "allow", patterns: ["kick", "ban"] })).toBe(true);
		expect(scopeChanged({ mode: "allow", patterns: ["kick", "ban"] }, { mode: "allow", patterns: ["kick"] })).toBe(true);
	});

	it("treats null and odd input as an all scope", () => {
		expect(scopeChanged(null, { mode: "all", patterns: [] })).toBe(false);
		expect(scopeChanged(undefined, undefined)).toBe(false);
		expect(scopeChanged("allow", { mode: "all", patterns: [] })).toBe(false);
		expect(scopeChanged(null, { mode: "allow", patterns: ["kick"] })).toBe(true);
	});

	it("ignores patterns on an all scope, since they do nothing there", () => {
		expect(scopeChanged({ mode: "all", patterns: ["kick"] }, { mode: "all", patterns: [] })).toBe(false);
	});
});

describe("applyPreset", () => {
	it("copies the mode and patterns of a preset", () => {
		expect(applyPreset({ id: "p1", label: "Safe", mode: "deny", patterns: ["stop", "op"] })).toEqual({
			mode: "deny",
			patterns: ["stop", "op"],
		});
	});

	it("gives a copy, never the same list as the preset", () => {
		const preset = { mode: "allow", patterns: ["kick"] };
		const applied = applyPreset(preset);
		expect(applied.patterns).not.toBe(preset.patterns);
		applied.patterns.push("ban");
		expect(preset.patterns).toEqual(["kick"]);
	});

	it("returns an all scope for odd input", () => {
		expect(applyPreset(null)).toEqual({ mode: "all", patterns: [] });
		expect(applyPreset(undefined)).toEqual({ mode: "all", patterns: [] });
		expect(applyPreset("allow")).toEqual({ mode: "all", patterns: [] });
		expect(applyPreset({ mode: "allow", patterns: "kick" })).toEqual({ mode: "allow", patterns: [] });
		expect(applyPreset({ mode: "weird", patterns: ["kick"] })).toEqual({ mode: "all", patterns: [] });
	});
});

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

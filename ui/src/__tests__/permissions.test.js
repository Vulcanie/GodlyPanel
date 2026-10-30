import { describe, it, expect } from "vitest";
import { can, isOperator, canAnywhere, roleLabel, ROLE_LABELS } from "../permissions.js";

// The interface's view of what an account may do. The lists come from the session (the server's /api/auth/me), so these tests
// build users the way the server describes them. A per-server role replaces the global list on that server only.

const MODERATOR = [
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
];
const ADMIN = ["server.control", "server.settings", "users.manage", "activity.view", "server.backup", "server.logs"];

const admin = { role: "admin", permissions: ADMIN, serverPermissions: {} };
const moderator = { role: "moderator", permissions: MODERATOR, serverPermissions: {} };
const guest = { role: "guest", permissions: [], serverPermissions: {} };

describe("can", () => {
	it("gives an administrator every permission it is sent", () => {
		for (const p of ADMIN) expect(can(admin, p)).toBe(true);
		expect(can(admin, "nothing.like.this")).toBe(false);
	});

	it("gives a moderator exactly its eleven permissions", () => {
		for (const p of MODERATOR) expect(can(moderator, p)).toBe(true);
		expect(can(moderator, "server.settings")).toBe(false);
		expect(can(moderator, "users.manage")).toBe(false);
		expect(moderator.permissions).toHaveLength(11);
	});

	it("gives a guest nothing", () => {
		expect(can(guest, "server.control")).toBe(false);
		expect(can(guest, "activity.view")).toBe(false);
	});

	it("honours a custom role's own list", () => {
		const custom = { role: "helper", permissions: ["schedules.view"], serverPermissions: {} };
		expect(can(custom, "schedules.view")).toBe(true);
		expect(can(custom, "server.control")).toBe(false);
	});

	it("uses a server's own list instead of the global one, when that server has one", () => {
		// Global: may control. On "Valheim" only: may view schedules, nothing else.
		const user = { role: "moderator", permissions: ["server.control"], serverPermissions: { Valheim: ["schedules.view"] } };
		expect(can(user, "server.control", "Valheim")).toBe(false);
		expect(can(user, "schedules.view", "Valheim")).toBe(true);
		expect(can(user, "server.control", "Other")).toBe(true);
		expect(can(user, "server.control")).toBe(true);
	});

	it("lets a per-server role grant more than the global list on that server", () => {
		const user = { role: "guest", permissions: [], serverPermissions: { Valheim: ["server.control"] } };
		expect(can(user, "server.control", "Valheim")).toBe(true);
		expect(can(user, "server.control", "Other")).toBe(false);
		expect(can(user, "server.control")).toBe(false);
	});

	it("treats a server with an empty per-server list as having nothing there", () => {
		const user = { role: "admin", permissions: ADMIN, serverPermissions: { Valheim: [] } };
		expect(can(user, "server.control", "Valheim")).toBe(false);
		expect(can(user, "server.control", "Other")).toBe(true);
	});

	it("does not read inherited names as servers", () => {
		const user = { role: "guest", permissions: ["server.control"], serverPermissions: {} };
		// The prototype has "constructor" and "__proto__", but no server list of its own. These fall back to the global list.
		expect(can(user, "server.control", "constructor")).toBe(true);
		expect(can(user, "server.control", "__proto__")).toBe(true);
		expect(can(user, "server.control", "toString")).toBe(true);
		const noGlobal = { role: "guest", permissions: [], serverPermissions: {} };
		expect(can(noGlobal, "server.control", "constructor")).toBe(false);
		expect(can(noGlobal, "server.control", "__proto__")).toBe(false);
	});

	it("reads a server named __proto__ or constructor only when it really has its own list", () => {
		const user = { role: "guest", permissions: [], serverPermissions: JSON.parse('{"__proto__":["server.logs"],"constructor":["server.console"]}') };
		expect(can(user, "server.logs", "__proto__")).toBe(true);
		expect(can(user, "server.console", "constructor")).toBe(true);
		expect(can(user, "server.console", "__proto__")).toBe(false);
		expect(can(user, "server.logs", "constructor")).toBe(false);
	});

	it("does not treat a role id of __proto__ or constructor as a permission list", () => {
		const user = { role: "__proto__", permissions: ["server.logs"], serverPermissions: {} };
		expect(can(user, "server.logs")).toBe(true);
		expect(can({ role: "constructor", permissions: [], serverPermissions: {} }, "server.logs")).toBe(false);
	});

	it("gives false for no user", () => {
		expect(can(null, "server.control")).toBe(false);
		expect(can(undefined, "server.control")).toBe(false);
		expect(can(null, "server.control", "Valheim")).toBe(false);
	});

	it("gives no permissions for a user from an older server that does not send the new fields", () => {
		const old = { id: 3, username: "sam", role: "moderator" };
		expect(can(old, "server.control")).toBe(false);
		expect(can(old, "server.control", "Valheim")).toBe(false);
	});

	it("treats a non-array list as nothing", () => {
		const bad = { role: "x", permissions: "server.control", serverPermissions: { Valheim: "server.control" } };
		expect(can(bad, "server.control")).toBe(false);
		expect(can(bad, "server.control", "Valheim")).toBe(false);
	});
});

describe("isOperator", () => {
	it("is true for an administrator and a moderator", () => {
		expect(isOperator(admin)).toBe(true);
		expect(isOperator(moderator)).toBe(true);
	});

	it("is false for a guest with nothing", () => {
		expect(isOperator(guest)).toBe(false);
	});

	it("is true when the user has any one permission globally", () => {
		expect(isOperator({ role: "helper", permissions: ["schedules.view"], serverPermissions: {} })).toBe(true);
	});

	it("is true when the user has a permission only through one server's role", () => {
		expect(isOperator({ role: "guest", permissions: [], serverPermissions: { Valheim: ["server.logs"] } })).toBe(true);
	});

	it("is false for a server role with an empty list", () => {
		expect(isOperator({ role: "guest", permissions: [], serverPermissions: { Valheim: [] } })).toBe(false);
	});

	it("is false for no user and for a user from an older server", () => {
		expect(isOperator(null)).toBe(false);
		expect(isOperator(undefined)).toBe(false);
		expect(isOperator({ id: 1, username: "old", role: "admin" })).toBe(false);
	});
});

describe("canAnywhere", () => {
	it("is true when the global list has the permission", () => {
		expect(canAnywhere(moderator, "activity.view")).toBe(true);
	});

	it("is true when only a server's list has it", () => {
		const user = { role: "guest", permissions: [], serverPermissions: { Valheim: ["activity.view"] } };
		expect(canAnywhere(user, "activity.view")).toBe(true);
	});

	it("is false when nothing has it", () => {
		expect(canAnywhere(guest, "activity.view")).toBe(false);
		expect(canAnywhere(null, "activity.view")).toBe(false);
	});

	it("does not read inherited server names", () => {
		const user = { role: "guest", permissions: [], serverPermissions: {} };
		expect(canAnywhere(user, "constructor")).toBe(false);
	});
});

describe("roleLabel", () => {
	it("gives the built-in labels", () => {
		expect(roleLabel("admin")).toBe("Administrator");
		expect(roleLabel("moderator")).toBe("Moderator");
		expect(roleLabel("guest")).toBe("Viewer");
		expect(ROLE_LABELS.guest).toBe("Viewer");
	});

	it("gives a custom role id back as it is", () => {
		expect(roleLabel("helper")).toBe("helper");
	});

	it("gives inherited names back as the string itself", () => {
		expect(roleLabel("__proto__")).toBe("__proto__");
		expect(roleLabel("constructor")).toBe("constructor");
	});
});

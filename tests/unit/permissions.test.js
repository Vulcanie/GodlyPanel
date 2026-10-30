import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Same setup as roleStore.test.js: the data folder is read once when paths.js loads.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "perms-"));
process.env.GHP_DATA_DIR = dir;
const { can, PERMISSIONS, ROLES, ROLE_PERMISSIONS } = await import("../../src/server/middleware/permissions.js");
const { PERMISSION_GROUPS, MODERATOR_PERMISSIONS } = await import("../../src/server/data/permissionCatalog.js");
const store = await import("../../src/server/data/roleStore.js");

const OLD = [
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
const NEW = ["files.view", "files.edit", "files.delete", "mods.manage", "servers.migrate", "roles.manage"];

const user = (role, extra = {}) => ({ username: "u", role, ...extra });

describe("the permission table", () => {
	it("keeps the 11 old names and adds the 6 new ones in order", () => {
		assert.deepEqual(PERMISSIONS, [...OLD, ...NEW]);
	});

	for (const perm of OLD) {
		it(`${perm}: admin and moderator can, guest cannot`, () => {
			assert.equal(can(user("admin"), perm), true);
			assert.equal(can(user("moderator"), perm), true);
			assert.equal(can(user("guest"), perm), false);
		});
	}

	for (const perm of NEW) {
		it(`${perm}: admin can, moderator and guest cannot`, () => {
			assert.equal(can(user("admin"), perm), true);
			assert.equal(can(user("moderator"), perm), false);
			assert.equal(can(user("guest"), perm), false);
		});
	}

	it("moderator is exactly the old 11 and nothing new", () => {
		assert.deepEqual(MODERATOR_PERMISSIONS, OLD);
		assert.deepEqual([...ROLE_PERMISSIONS.moderator].sort(), [...OLD].sort());
	});

	it("ROLES still names the built-ins", () => {
		assert.deepEqual(ROLES, ["admin", "moderator", "guest"]);
	});
});

describe("custom roles", () => {
	let roleId;
	before(async () => {
		await store.initRoleStore();
		roleId = (await store.create({ name: "Control Only", permissions: ["server.control"] })).id;
	});

	it("a custom role gets exactly its own permissions", () => {
		const u = user(roleId);
		assert.equal(can(u, "server.control"), true);
		assert.equal(can(u, "files.edit"), false);
		assert.equal(can(u, "server.console"), false);
	});

	it("an unknown role id is refused for everything", () => {
		for (const perm of PERMISSIONS) {
			assert.equal(can(user("r-deadbeef"), perm), false, perm);
			assert.equal(can(user("__proto__"), perm), false, perm);
			assert.equal(can(user("constructor"), perm), false, perm);
		}
		assert.equal(can(user(undefined), "server.control"), false);
	});

	it("no user means no permission", () => {
		assert.equal(can(null, "server.control"), false);
		assert.equal(can(undefined, "server.control"), false);
	});
});

describe("per-server role overrides", () => {
	let roleId;
	before(async () => {
		await store.initRoleStore();
		roleId = (await store.create({ name: "Server A Mod", permissions: ["server.control"] })).id;
	});

	it("an override applies to its own server only", () => {
		const u = user("guest", { serverRoles: { A: roleId } });
		assert.equal(can(u, "server.control", "A"), true);
		assert.equal(can(u, "server.control", "B"), false);
		assert.equal(can(u, "server.control"), false);
	});

	it("an override of admin is ignored, so the user keeps their own role", () => {
		const u = user("guest", { serverRoles: { A: "admin" } });
		assert.equal(can(u, "files.edit", "A"), false);
		assert.equal(can(u, "server.control", "A"), false);
	});

	it("a missing own property is ignored", () => {
		const u = user("moderator", { serverRoles: {} });
		assert.equal(can(u, "server.control", "constructor"), true);
		assert.equal(can(u, "mods.manage", "constructor"), false);
		assert.equal(can(u, "server.control", "toString"), true);
	});

	it("a __proto__ entry that is not a role id is ignored", () => {
		const u = user("moderator", { serverRoles: JSON.parse('{"__proto__":{"role":"admin"}}') });
		assert.equal(can(u, "mods.manage", "__proto__"), false);
		assert.equal(can(u, "server.control", "__proto__"), true);
	});

	it("a non-string override is ignored", () => {
		const u = user("guest", { serverRoles: { A: 7 } });
		assert.equal(can(u, "server.control", "A"), false);
	});

	it("an override naming an unknown role gives nothing", () => {
		const u = user("admin", { serverRoles: { A: "r-deadbeef" } });
		assert.equal(can(u, "server.control", "A"), false);
	});
});

describe("permission groups", () => {
	it("every permission is in exactly one group and no group names an unknown one", () => {
		const seen = Object.values(PERMISSION_GROUPS).flat();
		for (const perm of PERMISSIONS) {
			assert.equal(seen.filter((p) => p === perm).length, 1, perm);
		}
		for (const name of seen) {
			assert.ok(PERMISSIONS.includes(name), `unknown ${name}`);
		}
	});
});

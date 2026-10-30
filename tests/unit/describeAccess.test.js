import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Same setup as permissions.test.js: the data folder is read once when paths.js loads, so it is pointed at a throw-away folder
// before anything from src/server is imported.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "describe-access-"));
process.env.GHP_DATA_DIR = dir;
const { describeAccess } = await import("../../src/server/middleware/permissions.js");
const { PERMISSIONS, MODERATOR_PERMISSIONS } = await import("../../src/server/data/permissionCatalog.js");
const roleStore = await import("../../src/server/data/roleStore.js");

const lead = await roleStore.create({ name: "Lead", permissions: ["server.logs", "players.kick"] });
const other = await roleStore.create({ name: "Other", permissions: ["server.control"] });

describe("describeAccess", () => {
	it("gives an admin every permission", () => {
		const access = describeAccess({ role: "admin", serverRoles: null });
		assert.deepEqual(access.permissions, [...PERMISSIONS]);
		assert.deepEqual(access.serverPermissions, {});
	});

	it("gives a moderator exactly the 11 moderator permissions, sorted", () => {
		const access = describeAccess({ role: "moderator", serverRoles: null });
		assert.deepEqual(access.permissions, [...MODERATOR_PERMISSIONS].sort());
		assert.equal(access.permissions.length, 11);
	});

	it("gives a guest nothing", () => {
		assert.deepEqual(describeAccess({ role: "guest", serverRoles: null }), { permissions: [], serverPermissions: {} });
	});

	it("gives a custom role its own permissions, sorted", () => {
		const access = describeAccess({ role: lead.id, serverRoles: null });
		assert.deepEqual(access.permissions, ["players.kick", "server.logs"]);
	});

	it("an unknown role id gets nothing", () => {
		assert.deepEqual(describeAccess({ role: "r-00000000", serverRoles: null }), { permissions: [], serverPermissions: {} });
	});

	it("lists a per-server custom role under its server name", () => {
		const access = describeAccess({ role: "guest", serverRoles: { Alpha: other.id } });
		assert.deepEqual(access.serverPermissions, { Alpha: ["server.control"] });
		assert.deepEqual(access.permissions, []);
	});

	it("skips a per-server entry that says admin, the same way the permission check does", () => {
		const access = describeAccess({ role: "guest", serverRoles: { Alpha: "admin", Beta: other.id } });
		assert.deepEqual(Object.keys(access.serverPermissions), ["Beta"]);
	});

	it("keeps a server named __proto__ as an ordinary entry and leaves the prototype alone", () => {
		// JSON.parse makes "__proto__" an own key, the way a saved map would hold it; an object literal would set the prototype instead.
		const serverRoles = JSON.parse(`{"__proto__": "${lead.id}"}`);
		const access = describeAccess({ role: "guest", serverRoles });
		assert.equal(Object.getPrototypeOf(access.serverPermissions), Object.prototype);
		assert.deepEqual(Object.getOwnPropertyDescriptor(access.serverPermissions, "__proto__").value, ["players.kick", "server.logs"]);
	});

	it("does not invent an entry for a name that is only inherited", () => {
		const access = describeAccess({ role: "guest", serverRoles: { Alpha: other.id } });
		assert.equal(Object.hasOwn(access.serverPermissions, "constructor"), false);
		assert.equal(Object.hasOwn(access.serverPermissions, "toString"), false);
	});

	it("an absent user gets nothing", () => {
		assert.deepEqual(describeAccess(null), { permissions: [], serverPermissions: {} });
		assert.deepEqual(describeAccess(undefined), { permissions: [], serverPermissions: {} });
	});
});

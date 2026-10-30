import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

// The account store and role store read their folder once, when paths.js first loads, so point them at a
// throwaway folder before importing anything from them.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "user-roles-"));
process.env.GHP_DATA_DIR = dir;
const userStore = await import("../../src/server/data/userStore.js");
const roleStore = await import("../../src/server/data/roleStore.js");

const USERS_FILE = path.join(dir, "users.json");
const ROLES_FILE = path.join(dir, "roles.json");
const PASSWORD = "Correct-Horse-9-Staple";

// Starts each test from empty files. `users` lets a test write accounts in the saved shape before the store loads them.
async function fresh(users = []) {
	for (const f of [USERS_FILE, `${USERS_FILE}.bak`, ROLES_FILE, `${ROLES_FILE}.bak`]) fs.rmSync(f, { force: true });
	fs.writeFileSync(USERS_FILE, JSON.stringify({ schemaVersion: 1, users }));
	await roleStore.initRoleStore();
	await userStore.initUserStore();
}

let seq = 0;
const newUser = (role, servers) => userStore.createUser({ username: `user${++seq}`, password: PASSWORD, role, servers });
const newRole = (name) => roleStore.create({ name, permissions: ["server.control"] });
const find = (id) => userStore.list().find((u) => u.id === id);

beforeEach(() => fresh());

describe("createUser with custom roles", () => {
	it("accepts a custom role id", async () => {
		const role = await newRole("Operator");
		const user = await newUser(role.id);
		assert.equal(user.role, role.id);
	});

	it("refuses an unknown role id", async () => {
		await assert.rejects(newUser("no-such-role"), { message: /Unknown role/ });
	});

	it("refuses __proto__ as a role", async () => {
		await assert.rejects(newUser("__proto__"), { message: /Unknown role/ });
	});

	it("keeps the server list for a custom-role account", async () => {
		const role = await newRole("Operator");
		const user = await newUser(role.id, ["A"]);
		assert.deepEqual(user.servers, ["A"]);
	});

	it("gives a guest no server list, even if one was passed", async () => {
		const user = await newUser("guest", ["A"]);
		assert.equal(user.servers, null);
	});

	it("gives an admin no server list, even if one was passed", async () => {
		const user = await newUser("admin", ["A"]);
		assert.equal(user.servers, null);
	});

	it("starts with no per-server roles", async () => {
		const user = await newUser("guest");
		assert.equal(user.serverRoles, null);
	});
});

describe("setRole with custom roles", () => {
	it("moderator to a custom role keeps the server list", async () => {
		const role = await newRole("Operator");
		const mod = await newUser("moderator", ["A"]);
		const changed = await userStore.setRole(mod.id, role.id);
		assert.equal(changed.role, role.id);
		assert.deepEqual(changed.servers, ["A"]);
	});

	it("custom role to guest clears the server list", async () => {
		const role = await newRole("Operator");
		const user = await newUser(role.id, ["A"]);
		const changed = await userStore.setRole(user.id, "guest");
		assert.equal(changed.servers, null);
	});

	it("to admin clears per-server roles", async () => {
		const role = await newRole("Operator");
		const user = await newUser(role.id);
		await userStore.setServerRoles(user.id, { Alpha: role.id });
		const changed = await userStore.setRole(user.id, "admin");
		assert.equal(changed.role, "admin");
		assert.equal(changed.serverRoles, null);
	});

	it("refuses an unknown role id", async () => {
		const user = await newUser("guest");
		await assert.rejects(userStore.setRole(user.id, "no-such-role"), { message: /Unknown role/ });
	});

	it("still refuses to demote the last admin to a custom role", async () => {
		const role = await newRole("Operator");
		const admin = await newUser("admin");
		await assert.rejects(userStore.setRole(admin.id, role.id), { message: /Cannot change the role of the only admin account/ });
	});
});

describe("setServers with custom roles", () => {
	it("works for a custom-role account", async () => {
		const role = await newRole("Operator");
		const user = await newUser(role.id);
		const changed = await userStore.setServers(user.id, ["B"]);
		assert.deepEqual(changed.servers, ["B"]);
	});

	it("stores null for a guest", async () => {
		const user = await newUser("guest");
		const changed = await userStore.setServers(user.id, ["B"]);
		assert.equal(changed.servers, null);
	});
});

describe("setServerRoles", () => {
	it("stores a valid map and shows it in list()", async () => {
		const role = await newRole("Operator");
		const user = await newUser("guest");
		await userStore.setServerRoles(user.id, { Alpha: role.id, Beta: "moderator" });
		assert.deepEqual(find(user.id).serverRoles, { Alpha: role.id, Beta: "moderator" });
	});

	it("bumps sessionVersion", async () => {
		const role = await newRole("Operator");
		const user = await newUser("guest");
		const before = find(user.id).sessionVersion;
		await userStore.setServerRoles(user.id, { Alpha: role.id });
		assert.equal(find(user.id).sessionVersion, before + 1);
	});

	it("refuses the admin role as a value", async () => {
		const user = await newUser("guest");
		await assert.rejects(userStore.setServerRoles(user.id, { Alpha: "admin" }), Error);
		assert.equal(find(user.id).serverRoles, null);
	});

	it("refuses an unknown role", async () => {
		const user = await newUser("guest");
		await assert.rejects(userStore.setServerRoles(user.id, { Alpha: "no-such-role" }), Error);
	});

	it("refuses any change on an admin account", async () => {
		const role = await newRole("Operator");
		const admin = await newUser("admin");
		await assert.rejects(userStore.setServerRoles(admin.id, { Alpha: role.id }), { message: /already have every permission/ });
	});

	it("refuses 51 entries", async () => {
		const role = await newRole("Operator");
		const user = await newUser("guest");
		const map = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`S${i}`, role.id]));
		await assert.rejects(userStore.setServerRoles(user.id, map), Error);
	});

	it("accepts exactly 50 entries", async () => {
		const role = await newRole("Operator");
		const user = await newUser("guest");
		const map = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`S${i}`, role.id]));
		await userStore.setServerRoles(user.id, map);
		assert.equal(Object.keys(find(user.id).serverRoles).length, 50);
	});

	it("refuses an array", async () => {
		const role = await newRole("Operator");
		const user = await newUser("guest");
		await assert.rejects(userStore.setServerRoles(user.id, [role.id]), Error);
	});

	it("stores a __proto__ key as an ordinary key and leaves Object.prototype alone", async () => {
		const role = await newRole("Operator");
		const user = await newUser("guest");
		// JSON.parse makes "__proto__" an ordinary own property, which is the case an attacker would send.
		const map = JSON.parse(`{"__proto__": "${role.id}"}`);
		await userStore.setServerRoles(user.id, map);
		const stored = find(user.id).serverRoles;
		assert.equal(Object.getPrototypeOf(stored), Object.prototype);
		assert.equal(Object.getOwnPropertyDescriptor(stored, "__proto__").value, role.id);
		assert.equal(({}).polluted, undefined);
		assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted"), false);
	});

	it("stores null for null, undefined and an empty object", async () => {
		const role = await newRole("Operator");
		const user = await newUser("guest");
		for (const empty of [null, undefined, {}]) {
			await userStore.setServerRoles(user.id, { Alpha: role.id });
			await userStore.setServerRoles(user.id, empty);
			assert.equal(find(user.id).serverRoles, null);
		}
	});

	it("refuses a server name with a control character", async () => {
		const role = await newRole("Operator");
		const user = await newUser("guest");
		await assert.rejects(userStore.setServerRoles(user.id, { "Al\npha": role.id }), Error);
	});

	it("refuses an unknown account", async () => {
		await assert.rejects(userStore.setServerRoles(crypto.randomUUID(), null), { message: /No such user/ });
	});
});

describe("countWithRole", () => {
	it("is synchronous", async () => {
		assert.equal(typeof userStore.countWithRole("guest"), "number");
	});

	it("counts accounts by their role", async () => {
		const role = await newRole("Operator");
		await newUser(role.id);
		await newUser("guest");
		assert.equal(userStore.countWithRole(role.id), 1);
	});

	it("counts a use in serverRoles", async () => {
		const role = await newRole("Operator");
		const user = await newUser("guest");
		await userStore.setServerRoles(user.id, { Alpha: role.id });
		assert.equal(userStore.countWithRole(role.id), 1);
	});

	it("counts an account once when it matches both ways", async () => {
		const role = await newRole("Operator");
		const user = await newUser(role.id);
		await userStore.setServerRoles(user.id, { Alpha: role.id, Beta: role.id });
		assert.equal(userStore.countWithRole(role.id), 1);
	});

	it("is 0 for an unused id", async () => {
		assert.equal(userStore.countWithRole("r-00000000"), 0);
	});
});

describe("deleting a role in use", () => {
	it("refuses while an account holds it as its role, then allows it once moved", async () => {
		const role = await newRole("Operator");
		const user = await newUser(role.id);
		await assert.rejects(roleStore.remove(role.id, userStore.countWithRole), { status: 409, code: "role_in_use" });
		await userStore.setRole(user.id, "guest");
		await roleStore.remove(role.id, userStore.countWithRole);
		assert.equal(roleStore.get(role.id), null);
	});

	it("refuses while an account uses it on one server, then allows it once cleared", async () => {
		const role = await newRole("Operator");
		const user = await newUser("guest");
		await userStore.setServerRoles(user.id, { Alpha: role.id });
		await assert.rejects(roleStore.remove(role.id, userStore.countWithRole), { status: 409, code: "role_in_use" });
		await userStore.setServerRoles(user.id, null);
		await roleStore.remove(role.id, userStore.countWithRole);
		assert.equal(roleStore.get(role.id), null);
	});
});

describe("accounts saved before serverRoles existed", () => {
	const legacy = () => ({
		id: crypto.randomUUID(),
		username: "legacy",
		role: "guest",
		passwordHash: "not-used-in-this-test",
		sessionVersion: 1,
		servers: null,
		disabled: false,
		createdAt: new Date().toISOString(),
	});

	it("read as null serverRoles", async () => {
		await fresh([legacy()]);
		assert.equal(find(userStore.list()[0].id).serverRoles, null);
	});

	it("can have serverRoles set", async () => {
		await fresh([legacy()]);
		const role = await newRole("Operator");
		const user = userStore.list()[0];
		await userStore.setServerRoles(user.id, { Alpha: role.id });
		assert.deepEqual(find(user.id).serverRoles, { Alpha: role.id });
	});

	it("are not rewritten on load", async () => {
		await fresh([legacy()]);
		const saved = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
		assert.equal("serverRoles" in saved.users[0], false);
	});
});

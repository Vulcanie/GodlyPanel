import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The role store reads its folder once, when paths.js first loads, so point it at a
// throwaway folder before importing anything from it.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "roles-"));
process.env.GHP_DATA_DIR = dir;
const store = await import("../../src/server/data/roleStore.js");

const ROLES_FILE = path.join(dir, "roles.json");

// The 11 permissions a moderator had before roles became data. If this table changes, existing moderators change too.
const OLD_MODERATOR = [
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

// Each test starts from an empty folder and a freshly loaded store.
async function fresh(contents) {
	for (const f of [ROLES_FILE, `${ROLES_FILE}.bak`]) fs.rmSync(f, { force: true });
	if (contents !== undefined) fs.writeFileSync(ROLES_FILE, contents);
	await store.initRoleStore();
}

async function expectError(promise, status, code) {
	await assert.rejects(promise, (err) => {
		assert.equal(err.name, "RoleError");
		assert.equal(err.status, status, `status for ${err.message}`);
		assert.equal(err.code, code, `code for ${err.message}`);
		return true;
	});
}

describe("built-in roles", () => {
	before(() => fresh());

	it("are listed first and are all locked", async () => {
		const list = store.list();
		assert.deepEqual(list.slice(0, 3).map((r) => r.id), ["admin", "moderator", "guest"]);
		assert.ok(list.slice(0, 3).every((r) => r.locked === true));
		assert.deepEqual(list.slice(0, 3).map((r) => r.name), ["Administrator", "Moderator", "Viewer"]);
	});

	it("moderator is exactly the 11 permissions it had before", async () => {
		const moderator = store.get("moderator");
		assert.deepEqual([...moderator.permissions].sort(), [...OLD_MODERATOR].sort());
		assert.deepEqual([...store.permissionsFor("moderator")].sort(), [...OLD_MODERATOR].sort());
	});

	it("guest has no permissions and admin means everything", async () => {
		assert.deepEqual(store.permissionsFor("guest"), new Set());
		assert.equal(store.permissionsFor("admin"), null);
	});

	it("each built-in gets the default command scope", async () => {
		for (const id of ["admin", "moderator", "guest"]) {
			assert.deepEqual(store.get(id).commandScope, { mode: "all", patterns: [] });
		}
	});

	it("editing or removing a built-in is refused as locked", async () => {
		await expectError(store.update("admin", { name: "Boss" }), 409, "role_locked");
		await expectError(store.update("moderator", { permissions: [] }), 409, "role_locked");
		await expectError(store.remove("guest", () => 0), 409, "role_locked");
	});

	it("returned role objects cannot change the stored role", async () => {
		store.list()[1].permissions.push("roles.manage");
		assert.equal(store.isKnownRole("moderator"), true);
		assert.ok(!store.permissionsFor("moderator").has("roles.manage"));
	});
});

describe("persistence", () => {
	it("a saved custom role reloads after initRoleStore() runs again", async () => {
		await fresh();
		const made = await store.create({ name: "Helper", permissions: ["server.logs"] });
		await store.initRoleStore();
		const again = store.get(made.id);
		assert.equal(again.name, "Helper");
		assert.deepEqual(again.permissions, ["server.logs"]);
	});

	it("a corrupt roles.json gives built-ins only", async () => {
		await fresh("{ this is not json");
		assert.deepEqual(store.list().map((r) => r.id), ["admin", "moderator", "guest"]);
	});

	it("bad entries in roles.json are dropped and the good ones kept", async () => {
		const good = { id: "r-0a1b2c3d", name: "Good", permissions: ["files.view"], commandScope: { mode: "all", patterns: [] } };
		const bad = [
			{ id: "admin", name: "Sneaky", permissions: ["roles.manage"] },
			{ id: "r-11111111", name: "Moderator", permissions: [] },
			{ id: "r-22222222", name: "Unknown perm", permissions: ["nope"] },
			{ id: "__proto__", name: "Proto", permissions: [] },
			"not an object",
		];
		await fresh(JSON.stringify({ schemaVersion: 1, roles: [good, ...bad] }));
		assert.deepEqual(store.list().map((r) => r.id), ["admin", "moderator", "guest", "r-0a1b2c3d"]);
	});
});

describe("creating roles", () => {
	before(() => fresh());

	it("returns a custom id that is not a built-in", async () => {
		const role = await store.create({ name: "Night Crew", permissions: ["server.control"] });
		assert.match(role.id, /^r-[0-9a-f]{8}$/);
		assert.equal(role.locked, false);
		assert.deepEqual(role.commandScope, { mode: "all", patterns: [] });
		assert.equal(store.get(role.id).name, "Night Crew");
	});

	it("refuses a duplicate name in any case, including a built-in name", async () => {
		await store.create({ name: "Duplicate", permissions: [] });
		await expectError(store.create({ name: "duplicate", permissions: [] }), 400, "bad_role");
		await expectError(store.create({ name: "moderator", permissions: [] }), 400, "bad_role");
		await expectError(store.create({ name: "VIEWER", permissions: [] }), 400, "bad_role");
	});

	it("refuses an unknown permission and names it", async () => {
		await assert.rejects(store.create({ name: "Typo", permissions: ["server.contrl"] }), (err) => {
			assert.equal(err.status, 400);
			assert.equal(err.code, "bad_role");
			assert.match(err.message, /server\.contrl/);
			return true;
		});
	});

	it("de-duplicates permissions", async () => {
		const role = await store.create({ name: "Dupes", permissions: ["files.view", "files.view"] });
		assert.deepEqual(role.permissions, ["files.view"]);
	});

	it("refuses a name that is blank, too long or has a control character", async () => {
		await expectError(store.create({ name: "   ", permissions: [] }), 400, "bad_role");
		await expectError(store.create({ name: "x".repeat(41), permissions: [] }), 400, "bad_role");
		await expectError(store.create({ name: "bad\u0007name", permissions: [] }), 400, "bad_role");
		await expectError(store.create({ name: 42, permissions: [] }), 400, "bad_role");
	});

	it("refuses bad command scopes", async () => {
		const scope = (s) => store.create({ name: `Scope ${Math.random()}`, permissions: [], commandScope: s });
		await expectError(scope({ mode: "maybe", patterns: [] }), 400, "bad_role");
		await expectError(scope({ mode: "allow", patterns: Array.from({ length: 51 }, (_, i) => `p${i}`) }), 400, "bad_role");
		await expectError(scope({ mode: "deny", patterns: ["stop\u0000now"] }), 400, "bad_role");
		await expectError(scope({ mode: "deny", patterns: [""] }), 400, "bad_role");
		await expectError(scope({ mode: "deny", patterns: ["x".repeat(65)] }), 400, "bad_role");
	});

	it("accepts a valid command scope and keeps it", async () => {
		const role = await store.create({
			name: "Scoped",
			permissions: [],
			commandScope: { mode: "allow", patterns: ["say *", "list"] },
		});
		assert.deepEqual(role.commandScope, { mode: "allow", patterns: ["say *", "list"] });
	});

	it("two quick creates both persist", async () => {
		await fresh();
		await Promise.all([
			store.create({ name: "First", permissions: [] }),
			store.create({ name: "Second", permissions: [] }),
		]);
		const saved = JSON.parse(fs.readFileSync(ROLES_FILE, "utf8"));
		assert.deepEqual(saved.roles.map((r) => r.name).sort(), ["First", "Second"]);
		await store.initRoleStore();
		assert.deepEqual(store.list().slice(3).map((r) => r.name).sort(), ["First", "Second"]);
	});
});

describe("updating and removing roles", () => {
	it("update changes only the fields given", async () => {
		await fresh();
		const role = await store.create({
			name: "Editable",
			permissions: ["files.view"],
			commandScope: { mode: "deny", patterns: ["stop"] },
		});
		const updated = await store.update(role.id, { permissions: ["files.view", "files.edit"] });
		assert.equal(updated.name, "Editable");
		assert.deepEqual(updated.permissions, ["files.view", "files.edit"]);
		assert.deepEqual(updated.commandScope, { mode: "deny", patterns: ["stop"] });
	});

	it("update of an unknown id is a 404", async () => {
		await expectError(store.update("r-deadbeef", { name: "Ghost" }), 404, "no_role");
	});

	it("update validates the new fields", async () => {
		await fresh();
		const a = await store.create({ name: "Alpha", permissions: [] });
		await store.create({ name: "Beta", permissions: [] });
		await expectError(store.update(a.id, { name: "beta" }), 400, "bad_role");
		await expectError(store.update(a.id, { permissions: ["nope"] }), 400, "bad_role");
	});

	it("update keeps the role's own name when it is renamed to itself in another case", async () => {
		await fresh();
		const a = await store.create({ name: "Gamma", permissions: [] });
		const renamed = await store.update(a.id, { name: "GAMMA" });
		assert.equal(renamed.name, "GAMMA");
	});

	it("remove with users still holding the role is a 409", async () => {
		await fresh();
		const a = await store.create({ name: "Busy", permissions: [] });
		await expectError(store.remove(a.id, () => 2), 409, "role_in_use");
		assert.equal(store.isKnownRole(a.id), true);
	});

	it("remove with nobody holding the role removes it and saves that", async () => {
		await fresh();
		const a = await store.create({ name: "Idle", permissions: [] });
		await store.remove(a.id, () => 0);
		assert.equal(store.isKnownRole(a.id), false);
		await store.initRoleStore();
		assert.equal(store.isKnownRole(a.id), false);
	});

	it("remove of an unknown id is a 404", async () => {
		await expectError(store.remove("r-deadbeef", () => 0), 404, "no_role");
	});

	it("a count that is not a clear zero counts as in use", async () => {
		await fresh();
		const a = await store.create({ name: "Unsure", permissions: [] });
		await expectError(store.remove(a.id, () => undefined), 409, "role_in_use");
		assert.equal(store.isKnownRole(a.id), true);
	});
});

describe("unsafe ids", () => {
	before(() => fresh());

	it("get and permissionsFor are safe with __proto__ and constructor", async () => {
		for (const id of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
			assert.equal(store.get(id), null, id);
			assert.deepEqual(store.permissionsFor(id), new Set(), id);
			assert.equal(store.isKnownRole(id), false, id);
		}
	});

	it("permissionsFor fails closed for non-string ids", async () => {
		assert.deepEqual(store.permissionsFor(undefined), new Set());
		assert.deepEqual(store.permissionsFor(null), new Set());
		assert.deepEqual(store.permissionsFor({ toString: () => "admin" }), new Set());
		assert.equal(store.get(undefined), null);
	});
});

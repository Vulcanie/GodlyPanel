import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ADMIN, GUEST } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// The role routes (/api/roles) and per-server role assignment (/api/users/:id/server-roles), through real sign-ins against an
// in-process panel. The role and account stores are imported inside `before`, after startInProcess has set the data folder:
// importing them at the top would load paths.js first and startInProcess would refuse to run.

const PASSWORD = "RoleRoutes!2345";
const NO_SCOPE = { mode: "all", patterns: [] };
const ESCALATION = "You can't give a role permissions you don't have yourself.";

describe("role routes and per-server role assignment", () => {
	let panel;
	let api;
	let roleStore;
	let userStore;
	let adminCookie;
	let guestCookie;
	let modCookie;
	let managerCookie; // a custom role holding roles.manage only
	let logsCookie; // a custom role holding server.logs, without roles.manage
	let escalatorCookie; // a custom role holding roles.manage and server.logs (for the R35 checks)
	let escalatorRoleId;
	let logsRoleId; // server.logs
	let controlRoleId; // server.control
	let logWatcherId; // server.logs, made by the admin, for the R35 checks
	let assigneeId;
	let assigneeCookie;

	before(async () => {
		panel = await startInProcess({});
		api = panel.api;
		adminCookie = api.cookie;
		guestCookie = await api.cookieFor(GUEST);
		roleStore = await import("../../src/server/data/roleStore.js");
		userStore = await import("../../src/server/data/userStore.js");

		const account = async (username, role) => {
			await userStore.createUser({ username, password: PASSWORD, role });
			return api.cookieFor({ username, password: PASSWORD });
		};

		logsRoleId = (await roleStore.create({ name: "Logs fixture", permissions: ["server.logs"] })).id;
		controlRoleId = (await roleStore.create({ name: "Starter fixture", permissions: ["server.control"] })).id;
		logWatcherId = (await roleStore.create({ name: "Log watcher", permissions: ["server.logs"] })).id;
		const escalator = await roleStore.create({ name: "Escalator", permissions: ["roles.manage", "server.logs"] });
		escalatorRoleId = escalator.id;
		const manager = await roleStore.create({ name: "Role editor", permissions: ["roles.manage"] });

		modCookie = await account("modtest", "moderator");
		managerCookie = await account("rolemanager", manager.id);
		logsCookie = await account("logsreader", logsRoleId);
		escalatorCookie = await account("escalator", escalatorRoleId);

		await userStore.createUser({ username: "assignee", password: PASSWORD, role: "guest" });
		assigneeId = userStore.getByUsername("assignee").id;
		assigneeCookie = await api.cookieFor({ username: "assignee", password: PASSWORD });
	});
	after(() => panel.stop());

	describe("an administrator", () => {
		let createdId;

		it("creates a role, which then lists with no users, and can rename, re-permission and delete it", async () => {
			const created = await api.post("/api/roles", { name: "Admin made", permissions: ["server.backup"], commandScope: NO_SCOPE }, { cookie: adminCookie });
			assert.equal(created.status, 200, JSON.stringify(created.json));
			assert.match(created.json.id, /^r-/);
			createdId = created.json.id;

			const listed = (await api.get("/api/roles", { cookie: adminCookie })).json;
			assert.equal(listed.roles.find((r) => r.id === createdId).users, 0);
			assert.ok(listed.permissions.includes("roles.manage"));
			assert.ok(listed.groups.admin.includes("roles.manage"));

			const renamed = await api.put(`/api/roles/${createdId}`, { name: "Admin renamed", permissions: ["server.backup", "server.logs"] }, { cookie: adminCookie });
			assert.equal(renamed.status, 200, JSON.stringify(renamed.json));
			assert.equal(renamed.json.name, "Admin renamed");
			assert.deepEqual([...renamed.json.permissions].sort(), ["server.backup", "server.logs"]);

			const removed = await api.call("DELETE", `/api/roles/${createdId}`, undefined, { cookie: adminCookie });
			assert.equal(removed.status, 200);
			assert.deepEqual(removed.json, { success: true });
			assert.equal((await api.get("/api/roles", { cookie: adminCookie })).json.roles.some((r) => r.id === createdId), false);
		});

		it("records the creation in the activity log, with who did it and the role's name", () => {
			const lines = fs.readFileSync(path.join(panel.dir, "state", "activity.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
			const entry = lines.find((e) => e.type === "role.created" && e.message.includes('"Admin made"'));
			assert.ok(entry, "a role.created entry names the role");
			assert.ok(entry.message.startsWith(`${ADMIN.username} `), "and says who created it");
		});

		it("refuses a name that is already taken, ignoring case", async () => {
			const r = await api.post("/api/roles", { name: "moderator", permissions: [], commandScope: NO_SCOPE }, { cookie: adminCookie });
			assert.equal(r.status, 400);
		});

		it("refuses a permission that doesn't exist", async () => {
			const r = await api.post("/api/roles", { name: "Typo role", permissions: ["server.nope"], commandScope: NO_SCOPE }, { cookie: adminCookie });
			assert.equal(r.status, 400);
		});

		it("refuses to edit or delete a built-in role", async () => {
			const edit = await api.put("/api/roles/moderator", { name: "Mods" }, { cookie: adminCookie });
			assert.equal(edit.status, 409);
			assert.equal(edit.json.code, "role_locked");
			const del = await api.call("DELETE", "/api/roles/admin", undefined, { cookie: adminCookie });
			assert.equal(del.status, 409);
			assert.equal(del.json.code, "role_locked");
		});

		it("refuses to delete a role that someone holds, and deletes it once they are moved", async () => {
			const held = await api.post("/api/roles", { name: "Held role", permissions: ["server.logs"], commandScope: NO_SCOPE }, { cookie: adminCookie });
			const holder = await api.post("/api/users", { username: "holder", password: PASSWORD, role: "guest" }, { cookie: adminCookie });
			const moved = await api.put(`/api/users/${holder.json.id}/role`, { role: held.json.id }, { cookie: adminCookie });
			assert.equal(moved.status, 200, JSON.stringify(moved.json));

			const inUse = await api.call("DELETE", `/api/roles/${held.json.id}`, undefined, { cookie: adminCookie });
			assert.equal(inUse.status, 409);
			assert.equal(inUse.json.code, "role_in_use");

			assert.equal((await api.put(`/api/users/${holder.json.id}/role`, { role: "guest" }, { cookie: adminCookie })).status, 200);
			const deleted = await api.call("DELETE", `/api/roles/${held.json.id}`, undefined, { cookie: adminCookie });
			assert.equal(deleted.status, 200);
		});

		it("gets a 404 for an unknown id, including the object-prototype names", async () => {
			for (const id of ["r-00000000", "__proto__", "constructor"]) {
				const put = await api.put(`/api/roles/${id}`, { name: "Ghost" }, { cookie: adminCookie });
				assert.equal(put.status, 404, `PUT ${id}`);
				assert.equal(put.json.code, "no_role");
				const del = await api.call("DELETE", `/api/roles/${id}`, undefined, { cookie: adminCookie });
				assert.equal(del.status, 404, `DELETE ${id}`);
				assert.equal(del.json.code, "no_role");
			}
		});
	});

	describe("who may use the role routes", () => {
		it("refuses a moderator, a guest and a custom role without roles.manage on every route", async () => {
			const routes = [
				["GET", "/api/roles", undefined],
				["POST", "/api/roles", { name: "Sneaky", permissions: [], commandScope: NO_SCOPE }],
				["PUT", "/api/roles/r-00000000", { name: "Sneaky" }],
				["DELETE", "/api/roles/r-00000000", undefined],
			];
			for (const cookie of [modCookie, guestCookie, logsCookie]) {
				for (const [method, url, body] of routes) {
					const r = await api.call(method, url, body, { cookie });
					assert.equal(r.status, 403, `${method} ${url}`);
					assert.equal(r.json.code, "forbidden", `${method} ${url}`);
				}
			}
		});

		it("lets a custom role with roles.manage edit roles, but not assign them to accounts", async () => {
			assert.equal((await api.get("/api/roles", { cookie: managerCookie })).status, 200);
			const assign = await api.put(`/api/users/${assigneeId}/role`, { role: "moderator" }, { cookie: managerCookie });
			assert.equal(assign.status, 403);
			const assignServers = await api.put(`/api/users/${assigneeId}/server-roles`, { serverRoles: { Alpha: logsRoleId } }, { cookie: managerCookie });
			assert.equal(assignServers.status, 403);
		});
	});

	describe("no privilege escalation", () => {
		let ownRoleId;

		it("lets a non-admin create a role made only of permissions it holds", async () => {
			const r = await api.post("/api/roles", { name: "Escalator made", permissions: ["server.logs"], commandScope: NO_SCOPE }, { cookie: escalatorCookie });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			ownRoleId = r.json.id;
		});

		it("refuses to create a role with a permission it doesn't hold", async () => {
			const r = await api.post("/api/roles", { name: "Too strong", permissions: ["server.control"], commandScope: NO_SCOPE }, { cookie: escalatorCookie });
			assert.equal(r.status, 403);
			assert.equal(r.json.code, "role_escalation");
			assert.equal(r.json.error, ESCALATION);
		});

		it("refuses to create a role with a command scope, which only an admin may set", async () => {
			const r = await api.post("/api/roles", { name: "Scoped", permissions: ["server.logs"], commandScope: { mode: "deny", patterns: ["stop"] } }, { cookie: escalatorCookie });
			assert.equal(r.status, 403);
			assert.equal(r.json.code, "role_escalation");
		});

		it("refuses to edit a role holding a permission it lacks, even to rename it", async () => {
			const r = await api.put(`/api/roles/${controlRoleId}`, { name: "Starter renamed" }, { cookie: escalatorCookie });
			assert.equal(r.status, 403);
			assert.equal(r.json.code, "role_escalation");
		});

		it("refuses to add a permission it lacks to a role it holds", async () => {
			const r = await api.put(`/api/roles/${logWatcherId}`, { permissions: ["server.logs", "server.control"] }, { cookie: escalatorCookie });
			assert.equal(r.status, 403);
			assert.equal(r.json.code, "role_escalation");
		});

		it("refuses to change a command scope, but allows sending the scope it already has", async () => {
			const changed = await api.put(`/api/roles/${logWatcherId}`, { commandScope: { mode: "allow", patterns: ["say *"] } }, { cookie: escalatorCookie });
			assert.equal(changed.status, 403);
			assert.equal(changed.json.code, "role_escalation");
			const same = await api.put(`/api/roles/${logWatcherId}`, { name: "Log watcher", commandScope: NO_SCOPE }, { cookie: escalatorCookie });
			assert.equal(same.status, 200, JSON.stringify(same.json));
		});

		it("refuses to delete a role holding a permission it lacks, and deletes one it holds", async () => {
			const refused = await api.call("DELETE", `/api/roles/${controlRoleId}`, undefined, { cookie: escalatorCookie });
			assert.equal(refused.status, 403);
			assert.equal(refused.json.code, "role_escalation");
			const allowed = await api.call("DELETE", `/api/roles/${ownRoleId}`, undefined, { cookie: escalatorCookie });
			assert.equal(allowed.status, 200);
		});

		it("lets an administrator do all of those things", async () => {
			const made = await api.post("/api/roles", { name: "Admin strong", permissions: ["server.control"], commandScope: NO_SCOPE }, { cookie: adminCookie });
			assert.equal(made.status, 200);
			const widened = await api.put(`/api/roles/${controlRoleId}`, { permissions: ["server.control", "server.console"] }, { cookie: adminCookie });
			assert.equal(widened.status, 200, JSON.stringify(widened.json));
			const scoped = await api.put(`/api/roles/${logWatcherId}`, { commandScope: { mode: "allow", patterns: ["say *"] } }, { cookie: adminCookie });
			assert.equal(scoped.status, 200, JSON.stringify(scoped.json));
			const removed = await api.call("DELETE", `/api/roles/${made.json.id}`, undefined, { cookie: adminCookie });
			assert.equal(removed.status, 200);
		});
	});

	describe("per-server role assignment", () => {
		it("sets an account's roles per server, shows them in the users list and in its own /me", async () => {
			const r = await api.put(`/api/users/${assigneeId}/server-roles`, { serverRoles: { Alpha: logsRoleId } }, { cookie: adminCookie });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.deepEqual(r.json.serverRoles, { Alpha: logsRoleId });

			const listed = (await api.get("/api/users", { cookie: adminCookie })).json.find((u) => u.id === assigneeId);
			assert.deepEqual(listed.serverRoles, { Alpha: logsRoleId });

			const fresh = await api.cookieFor({ username: "assignee", password: PASSWORD });
			const me = (await api.get("/api/auth/me", { cookie: fresh })).json.user;
			assert.deepEqual(me.serverPermissions, { Alpha: ["server.logs"] });
		});

		it("ends the account's sessions when its server roles change", async () => {
			const before = await api.get("/api/auth/me", { cookie: assigneeCookie });
			assert.equal(before.status, 401, "the cookie from before the last change is already dead");
			const again = await api.cookieFor({ username: "assignee", password: PASSWORD });
			await api.put(`/api/users/${assigneeId}/server-roles`, { serverRoles: { Alpha: controlRoleId } }, { cookie: adminCookie });
			assert.equal((await api.get("/api/auth/me", { cookie: again })).status, 401, "a sign-in made before the change is ended");
		});

		it("refuses the built-in admin role as a per-server role", async () => {
			const r = await api.put(`/api/users/${assigneeId}/server-roles`, { serverRoles: { Alpha: "admin" } }, { cookie: adminCookie });
			assert.equal(r.status, 400);
		});

		it("refuses a role that doesn't exist", async () => {
			const r = await api.put(`/api/users/${assigneeId}/server-roles`, { serverRoles: { Alpha: "r-00000000" } }, { cookie: adminCookie });
			assert.equal(r.status, 400);
		});

		it("refuses an administrator account, which already has every permission", async () => {
			const adminId = (await api.get("/api/users", { cookie: adminCookie })).json.find((u) => u.username === ADMIN.username).id;
			const r = await api.put(`/api/users/${adminId}/server-roles`, { serverRoles: { Alpha: logsRoleId } }, { cookie: adminCookie });
			assert.equal(r.status, 400);
		});

		it("refuses a moderator", async () => {
			const r = await api.put(`/api/users/${assigneeId}/server-roles`, { serverRoles: { Alpha: logsRoleId } }, { cookie: modCookie });
			assert.equal(r.status, 403);
		});
	});

	describe("roleName on /api/auth/me", () => {
		it("gives the built-in names and a custom role's own name", async () => {
			assert.equal((await api.get("/api/auth/me", { cookie: adminCookie })).json.user.roleName, "Administrator");
			assert.equal((await api.get("/api/auth/me", { cookie: modCookie })).json.user.roleName, "Moderator");
			assert.equal((await api.get("/api/auth/me", { cookie: guestCookie })).json.user.roleName, "Viewer");
			assert.equal((await api.get("/api/auth/me", { cookie: escalatorCookie })).json.user.roleName, "Escalator");
		});
	});
});

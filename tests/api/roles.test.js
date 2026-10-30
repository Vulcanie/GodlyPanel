import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { serverEntry, GUEST } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// Custom roles reaching the panel's routes, through real sign-ins against an in-process panel with two servers.
// The role and account stores are imported inside `before`, after startInProcess has set the data folder: importing them at
// the top would load paths.js first and startInProcess would refuse to run.

const PASSWORD = "CustomRole!2345";

describe("custom roles at the routes", () => {
	let panel;
	let api;
	let roleStore;
	let userStore;
	let adminCookie;
	let guestCookie;
	let logsCookie; // a custom role holding server.logs
	let emptyCookie; // a custom role holding nothing
	let limitedCookie; // server.logs, limited to Alpha
	let lobbyCookie; // a plain guest with a per-server role on Alpha
	let removedCookie; // a custom role that was removed while this account still held it
	let modCookie;

	before(async () => {
		panel = await startInProcess({
			servers: (dir) => [serverEntry(dir, { name: "Alpha" }), serverEntry(dir, { name: "Beta" })],
		});
		api = panel.api;
		adminCookie = api.cookie;
		guestCookie = await api.cookieFor(GUEST);
		roleStore = await import("../../src/server/data/roleStore.js");
		userStore = await import("../../src/server/data/userStore.js");

		const account = async (username, role, extra = {}) => {
			await userStore.createUser({ username, password: PASSWORD, role, ...extra });
			return api.cookieFor({ username, password: PASSWORD });
		};

		const logs = await roleStore.create({ name: "Log reader", permissions: ["server.logs"] });
		const nothing = await roleStore.create({ name: "Nothing at all", permissions: [] });
		const control = await roleStore.create({ name: "Starter", permissions: ["server.control"] });
		const doomed = await roleStore.create({ name: "Doomed", permissions: ["server.logs"] });

		logsCookie = await account("logsreader", logs.id);
		emptyCookie = await account("nothingrole", nothing.id);
		limitedCookie = await account("alphaonly", logs.id, { servers: ["Alpha"] });
		modCookie = await account("modtest", "moderator");

		const lobby = await userStore.createUser({ username: "lobbyguest", password: PASSWORD, role: "guest" });
		await userStore.setServerRoles(lobby.id, { Alpha: control.id });
		lobbyCookie = await api.cookieFor({ username: "lobbyguest", password: PASSWORD });

		// The account is made while the role exists; then the role goes while the account still holds it.
		await userStore.createUser({ username: "doomedacct", password: PASSWORD, role: doomed.id });
		await roleStore.remove(doomed.id, () => 0);
		removedCookie = await api.cookieFor({ username: "doomedacct", password: PASSWORD });
	});
	after(() => panel.stop());

	it("a role holding server.logs reads logs and is refused every admin or operator route", async () => {
		assert.equal((await api.get("/api/server/Alpha/logs", { cookie: logsCookie })).status, 200);
		assert.equal((await api.post("/api/control/Alpha/start", undefined, { cookie: logsCookie })).status, 403);
		assert.equal((await api.get("/api/users", { cookie: logsCookie })).status, 403);
		assert.equal((await api.get("/api/settings", { cookie: logsCookie })).status, 403);
		assert.equal((await api.get("/api/activity/export", { cookie: logsCookie })).status, 403);
		assert.equal((await api.post("/api/server/Alpha/network/firewall-rule", undefined, { cookie: logsCookie })).status, 403);
	});

	it("a role holding server.logs is a viewer: the status page is open to it", async () => {
		assert.equal((await api.get("/api/status", { cookie: logsCookie })).status, 200);
	});

	it("/api/auth/me lists the role's permissions and no per-server ones", async () => {
		const me = (await api.get("/api/auth/me", { cookie: logsCookie })).json.user;
		assert.deepEqual(me.permissions, ["server.logs"]);
		assert.deepEqual(me.serverPermissions, {});
	});

	it("a role with no permissions behaves like a guest: logs refused, status open", async () => {
		assert.equal((await api.get("/api/server/Alpha/logs", { cookie: emptyCookie })).status, 403);
		assert.equal((await api.get("/api/status", { cookie: emptyCookie })).status, 200);
	});

	it("a role limited to Alpha reads Alpha's logs and is refused Beta's", async () => {
		assert.equal((await api.get("/api/server/Alpha/logs", { cookie: limitedCookie })).status, 200);
		const beta = await api.get("/api/server/Beta/logs", { cookie: limitedCookie });
		assert.equal(beta.status, 403);
		assert.equal(beta.json.code, "forbidden_server");
	});

	it("a guest with a per-server role gets that role's permission on its server only", async () => {
		const me = (await api.get("/api/auth/me", { cookie: lobbyCookie })).json.user;
		assert.deepEqual(me.serverPermissions, { Alpha: ["server.control"] });
		assert.deepEqual(me.permissions, []);

		// The start itself may fail for other reasons (there is no real game here), so this only asks that the permission check let it through.
		const alpha = await api.post("/api/control/Alpha/start", undefined, { cookie: lobbyCookie });
		assert.notEqual(alpha.status, 403, "the per-server role lets the request past the permission check");

		const beta = await api.post("/api/control/Beta/start", undefined, { cookie: lobbyCookie });
		assert.equal(beta.status, 403, "and gives nothing on Beta");
	});

	it("an account whose role was removed is refused everywhere, including the status page", async () => {
		assert.equal((await api.get("/api/status", { cookie: removedCookie })).status, 403);
		assert.equal((await api.get("/api/server/Alpha/logs", { cookie: removedCookie })).status, 403);
		assert.equal((await api.get("/api/users", { cookie: removedCookie })).status, 403);
		const me = (await api.get("/api/auth/me", { cookie: removedCookie })).json.user;
		assert.deepEqual(me.permissions, [], "the removed role grants nothing");
	});

	it("admin still reaches the admin routes", async () => {
		assert.equal((await api.get("/api/users", { cookie: adminCookie })).status, 200);
	});

	it("a moderator reads logs and is refused the admin list of users", async () => {
		assert.equal((await api.get("/api/server/Alpha/logs", { cookie: modCookie })).status, 200);
		assert.equal((await api.get("/api/users", { cookie: modCookie })).status, 403);
	});

	it("a guest sees status and is refused logs", async () => {
		assert.equal((await api.get("/api/status", { cookie: guestCookie })).status, 200);
		assert.equal((await api.get("/api/server/Alpha/logs", { cookie: guestCookie })).status, 403);
	});
});

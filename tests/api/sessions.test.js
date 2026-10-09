import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import { ADMIN, GUEST } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// Each sign-in is a record the panel keeps: what signed in, from where, when last used. A person can see theirs and end any of
// them; an administrator can end anyone's. A token stops working the moment its record is gone, signing out included.

describe("sessions", () => {
	let panel;
	let api;
	let a; // the administrator, signed in twice: a laptop and a phone
	let b;
	let viewer;

	const sessions = async (cookie) => (await api.get("/api/auth/sessions", { cookie })).json.sessions;
	const me = async (cookie) => (await api.get("/api/auth/me", { cookie })).status;

	before(async () => {
		panel = await startInProcess({});
		api = panel.api;
		const mac = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" };
		const phone = { "user-agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36" };
		a = await panel.api.cookieFor(ADMIN, mac);
		b = await panel.api.cookieFor(ADMIN, phone);
		viewer = await panel.api.cookieFor(GUEST);
		// Setting up the first account signed this client in; the tests count sign-ins, so end that one.
		await api.post("/api/auth/logout", {});
	});
	after(() => panel.stop());

	it("lists your own sign-ins, saying which is this one, and on what", async () => {
		const list = await sessions(a);
		assert.equal(list.length, 2);
		assert.equal(list.filter((s) => s.current).length, 1);
		assert.deepEqual(list.map((s) => s.device).sort(), ["Chrome on Android", "Chrome on Windows"]);
		assert.ok(list.every((s) => s.username === "admin" && s.ip && s.createdAt && s.lastSeen && s.expiresAt));
		assert.equal(JSON.stringify(list).includes("token"), false);
	});

	it("shows a viewer only their own", async () => {
		const list = await sessions(viewer);
		assert.equal(list.length, 1);
		assert.equal(list[0].username, "viewer");
	});

	it("will not end someone else's sign-in", async () => {
		const mine = (await sessions(a)).find((s) => !s.current);
		assert.equal((await api.del(`/api/auth/sessions/${mine.id}`, { cookie: viewer })).status, 404);
		assert.equal(await me(b), 200);
	});

	it("ends a single sign-in, which stops working at once, and leaves the others", async () => {
		const phone = (await sessions(a)).find((s) => !s.current);
		const r = await api.del(`/api/auth/sessions/${phone.id}`, { cookie: a });
		assert.equal(r.status, 200);
		assert.equal(r.json.wasThisOne, false);
		assert.equal(await me(b), 401, "the phone is signed out");
		assert.equal(await me(a), 200, "the laptop is not");
		assert.equal((await sessions(a)).length, 1);
	});

	it("signs out everywhere else in one go", async () => {
		const one = await panel.api.cookieFor(ADMIN);
		const two = await panel.api.cookieFor(ADMIN);
		assert.equal((await sessions(a)).length, 3);
		const r = await api.post("/api/auth/sessions/revoke-others", {}, { cookie: a });
		assert.equal(r.json.revoked, 2);
		assert.equal(await me(one), 401);
		assert.equal(await me(two), 401);
		assert.equal(await me(a), 200);
	});

	it("makes signing out real: the old cookie no longer works", async () => {
		const stolen = await panel.api.cookieFor(ADMIN);
		assert.equal(await me(stolen), 200);
		await api.post("/api/auth/logout", {}, { cookie: stolen });
		assert.equal(await me(stolen), 401, "a copied cookie is dead after the person signs out");
	});

	it("ends every other sign-in when the password changes, and keeps this one", async () => {
		const other = await panel.api.cookieFor(GUEST);
		assert.equal((await sessions(viewer)).length, 2);
		const changed = await api.post("/api/auth/change-password", { currentPassword: GUEST.password, newPassword: "BrandNewPass!2345" }, { cookie: viewer });
		assert.equal(changed.status, 200, JSON.stringify(changed.json));
		assert.equal(await me(other), 401);
		const fresh = changed.headers.get("set-cookie")?.split(";")[0];
		assert.ok(fresh, "a fresh sign-in is issued for this browser");
		assert.equal(await me(fresh), 200);
		assert.equal((await sessions(fresh)).length, 1);
		viewer = fresh;
	});

	describe("an administrator", () => {
		it("sees everyone's", async () => {
			const all = (await api.get("/api/users/sessions", { cookie: a })).json.sessions;
			assert.ok(all.some((s) => s.username === "admin") && all.some((s) => s.username === "viewer"));
			assert.equal((await api.get("/api/users/sessions", { cookie: viewer })).status, 403);
		});

		it("can end one, or sign a person out everywhere", async () => {
			const v1 = await panel.api.cookieFor({ username: GUEST.username, password: "BrandNewPass!2345" });
			const v2 = await panel.api.cookieFor({ username: GUEST.username, password: "BrandNewPass!2345" });
			const all = (await api.get("/api/users/sessions", { cookie: a })).json.sessions.filter((s) => s.username === "viewer");
			assert.ok(all.length >= 2);
			assert.equal((await api.del(`/api/users/sessions/${all[0].id}`, { cookie: a })).status, 200);
			const users = (await api.get("/api/users", { cookie: a })).json;
			const viewerId = (users.users ?? users).find((u) => u.username === "viewer").id;
			const r = await api.del(`/api/users/${viewerId}/sessions`, { cookie: a });
			assert.ok(r.json.revoked >= 1);
			assert.equal(await me(v1), 401);
			assert.equal(await me(v2), 401);
		});

		it("is recorded who ended whose", async () => {
			const log = (await api.get("/api/activity?limit=100", { cookie: a })).json.map((e) => e.message);
			assert.ok(log.some((m) => /admin \(admin\): signed viewer out everywhere/.test(m)), log.join("\n"));
			assert.ok(log.some((m) => /admin \(admin\): signed out everywhere else/.test(m)));
		});
	});

	describe("a sign-in from before sessions existed", () => {
		it("keeps working, and is given a record, so nobody is signed out by an update", async () => {
			const { getSecrets } = await import("../../src/server/config/secretsStore.js");
			const { getByUsername } = await import("../../src/server/data/userStore.js");
			const admin = getByUsername("admin");
			const legacy = jwt.sign({ sub: admin.id, u: admin.username, role: admin.role, sv: admin.sessionVersion }, getSecrets().jwtSecret, { expiresIn: 3600, algorithm: "HS256" });
			const before = (await sessions(a)).length;
			const r = await api.get("/api/auth/me", { cookie: `gp_session=${legacy}` });
			assert.equal(r.status, 200);
			const upgraded = r.headers.get("set-cookie")?.split(";")[0];
			assert.ok(upgraded?.startsWith("gp_session="), "the browser is handed a token that points at a record");
			assert.notEqual(upgraded, `gp_session=${legacy}`);
			assert.equal((await sessions(a)).length, before + 1);
			assert.equal(await me(upgraded), 200);
			assert.ok(jwt.decode(upgraded.slice("gp_session=".length)).sid, "and it carries the id");
			// Its lifetime is the old token's, not a fresh week.
			assert.ok(jwt.decode(upgraded.slice("gp_session=".length)).exp - Math.floor(Date.now() / 1000) <= 3600);
		});

		it("is refused if it is forged", async () => {
			const forged = jwt.sign({ sub: "x", sv: 1 }, "not the real key", { algorithm: "HS256" });
			assert.equal(await me(`gp_session=${forged}`), 401);
		});
	});

	it("keeps no token on disk, only what the list shows", async () => {
		const { flushSessions } = await import("../../src/server/services/sessionStore.js");
		await flushSessions();
		const text = fs.readFileSync(path.join(panel.dir, "state", "sessions.json"), "utf8");
		assert.doesNotMatch(text, /eyJ/);
		assert.match(text, /"userAgent"/);
	});
});

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { startInstance, serverEntry, ADMIN, GUEST } from "../helpers/instance.js";

// Accounts, sessions, roles, and the network-facing hardening. Each test talks
// to a real API process started for this file, so what's checked is what a
// person on the network would actually get.

/** A request with a chosen Host header, which fetch() won't allow. */
function requestWithHost(port, host, path = "/api/setup/status") {
	return new Promise((resolve, reject) => {
		const req = http.request({ host: "127.0.0.1", port, path, headers: { Host: host } }, (res) => {
			let body = "";
			res.on("data", (d) => (body += d));
			res.on("end", () => resolve({ status: res.statusCode, body }));
		});
		req.on("error", reject);
		req.end();
	});
}

describe("accounts and sessions", () => {
	let panel;
	let api;
	let adminCookie;
	let guestCookie;

	before(async () => {
		panel = await startInstance({
			prepare: () => {},
			servers: [serverEntry("C:\\", { name: "Secret Server", serverPassword: "join-me-123", sessionName: "Visible Name", processName: "x.exe" })],
		});
		api = panel.api;
		adminCookie = api.cookie;
		guestCookie = await api.cookieFor(GUEST);
	});
	after(() => panel.stop());

	it("the first-run wizard closes once an admin exists", async () => {
		const again = await api.post("/api/setup/admin", { username: "second", password: "AnotherPass!234" });
		assert.equal(again.status, 409);
		assert.equal((await api.get("/api/setup/status", { cookie: "" })).json.setupRequired, false);
	});

	it("nothing is readable without signing in", async () => {
		for (const url of ["/api/status", "/api/system-stats", "/api/users", "/api/settings", "/api/appearance", "/api/events"]) {
			assert.equal((await api.get(url, { cookie: "" })).status, 401, url);
		}
	});

	it("rejects a wrong password without saying which half was wrong", async () => {
		const r = await api.post("/api/auth/login", { username: ADMIN.username, password: "wrong" }, { cookie: "" });
		assert.equal(r.status, 401);
		assert.equal(r.json.error, "Incorrect username or password.");
		const unknown = await api.post("/api/auth/login", { username: "nobody", password: "wrong" }, { cookie: "" });
		assert.equal(unknown.json.error, r.json.error);
	});

	it("an unknown username costs about the same as a wrong password", async () => {
		// Returning instantly for an unknown name lets anyone on the network find
		// valid usernames just by timing the login.
		const time = async (username) => {
			const started = Date.now();
			await api.post("/api/auth/login", { username, password: "wrong-password" }, { cookie: "" });
			return Date.now() - started;
		};
		const known = await time(GUEST.username);
		const unknown = await time("nobody-by-that-name");
		assert.ok(unknown > known * 0.5, `known ${known}ms vs unknown ${unknown}ms`);
	});

	it("rate-limits repeated failures, with Retry-After, without affecting other accounts", async () => {
		let limitedOn = null;
		let retryAfter = 0;
		for (let attempt = 1; attempt <= 12 && limitedOn === null; attempt += 1) {
			const r = await api.post("/api/auth/login", { username: "victim", password: `nope${attempt}` }, { cookie: "" });
			if (r.status === 429) {
				limitedOn = attempt;
				retryAfter = Number(r.headers.get("retry-after"));
			}
		}
		assert.ok(limitedOn !== null && limitedOn <= 10, `limited on attempt ${limitedOn}`);
		assert.ok(retryAfter > 0);
		assert.equal((await api.post("/api/auth/login", GUEST, { cookie: "" })).status, 200, "a different account still signs in");
	});

	it("a malformed cookie is a clean 401, not a server error", async () => {
		const r = await api.get("/api/auth/me", { cookie: "gp_session=%E0%A4%A" });
		assert.equal(r.status, 401);
	});

	it("rejects a token signed with the 'none' algorithm", async () => {
		const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
		const forged = `${enc({ alg: "none", typ: "JWT" })}.${enc({ sub: "x", role: "admin", sv: 1 })}.`;
		assert.equal((await api.get("/api/auth/me", { cookie: `gp_session=${forged}` })).status, 401);
	});

	it("session cookies are HttpOnly and SameSite=Strict", async () => {
		const res = await fetch(`${panel.base}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(GUEST),
		});
		const cookie = res.headers.get("set-cookie");
		assert.match(cookie, /HttpOnly/i);
		assert.match(cookie, /SameSite=Strict/i);
	});

	describe("Host header (DNS rebinding)", () => {
		it("answers to an IP address and to localhost", async () => {
			assert.equal((await requestWithHost(panel.port, `127.0.0.1:${panel.port}`)).status, 200);
			assert.equal((await requestWithHost(panel.port, `localhost:${panel.port}`)).status, 200);
		});

		it("refuses a name someone else controls", async () => {
			const r = await requestWithHost(panel.port, "evil.example.com");
			assert.equal(r.status, 400);
			assert.match(r.body, /bad_host/);
		});
	});

	describe("roles", () => {
		it("a guest can see status, but not what would let them join or administer", async () => {
			const guest = (await api.get("/api/status", { cookie: guestCookie })).json;
			const admin = (await api.get("/api/status", { cookie: adminCookie })).json;
			assert.equal(admin["Secret Server"].serverPassword, "join-me-123");
			assert.equal("serverPassword" in guest["Secret Server"], false, "the join password is admin-only");
			assert.equal(guest["Secret Server"].sessionName, "Visible Name");
		});

		it("a guest is refused every admin surface", async () => {
			for (const [method, url] of [
				["GET", "/api/users"],
				["GET", "/api/settings"],
				["PUT", "/api/settings"],
				["GET", "/api/storage"],
				["GET", "/api/config/Secret%20Server?file=x"],
				["POST", "/api/control/Secret%20Server/start"],
				["PUT", "/api/appearance/custom"],
				["GET", "/api/batch-files/by-server/Secret%20Server"],
			]) {
				const r = await api.call(method, url, method === "GET" ? undefined : {}, { cookie: guestCookie });
				assert.equal(r.status, 403, `${method} ${url}`);
			}
		});

		it("/api/auth/me reports the role from the server, not from anything the browser stored", async () => {
			assert.equal((await api.get("/api/auth/me", { cookie: adminCookie })).json.user.role, "admin");
			assert.equal((await api.get("/api/auth/me", { cookie: guestCookie })).json.user.role, "guest");
		});
	});

	describe("managing people", () => {
		it("changing someone's password ends their existing sessions immediately", async () => {
			const users = (await api.get("/api/users", { cookie: adminCookie })).json;
			const viewer = users.find((u) => u.username === GUEST.username);
			const before = await api.cookieFor(GUEST);
			assert.equal((await api.get("/api/auth/me", { cookie: before })).status, 200);

			const changed = await api.put(`/api/users/${viewer.id}/password`, { password: "BrandNewPass!987" }, { cookie: adminCookie });
			assert.equal(changed.status, 200);
			assert.equal((await api.get("/api/auth/me", { cookie: before })).status, 401, "the old session is dead");
			assert.equal((await api.post("/api/auth/login", GUEST, { cookie: "" })).status, 401, "the old password no longer works");
			const fresh = await api.post("/api/auth/login", { username: GUEST.username, password: "BrandNewPass!987" }, { cookie: "" });
			assert.equal(fresh.status, 200, "the new one does");
		});

		it("refuses to remove, disable or demote the only admin", async () => {
			const users = (await api.get("/api/users", { cookie: adminCookie })).json;
			const admin = users.find((u) => u.username === ADMIN.username);
			assert.equal((await api.del(`/api/users/${admin.id}`, { cookie: adminCookie })).status, 400);
			assert.equal((await api.put(`/api/users/${admin.id}/disabled`, { disabled: true }, { cookie: adminCookie })).status, 400);
			assert.equal((await api.put(`/api/users/${admin.id}/role`, { role: "guest" }, { cookie: adminCookie })).status, 400);
		});

		it("validates usernames and passwords", async () => {
			const short = await api.post("/api/users", { username: "ab", password: "LongEnough123", role: "guest" }, { cookie: adminCookie });
			assert.equal(short.status, 400);
			const weak = await api.post("/api/users", { username: "someone", password: "short", role: "guest" }, { cookie: adminCookie });
			assert.equal(weak.status, 400);
			const odd = await api.post("/api/users", { username: "has space", password: "LongEnough123", role: "guest" }, { cookie: adminCookie });
			assert.equal(odd.status, 400);
		});
	});
});

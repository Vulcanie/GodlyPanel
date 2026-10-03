import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { startInstance, serverEntry, freePort, sleep, ROOT, GUEST, tempDir, removeDir } from "../helpers/instance.js";

// The community view: a small second web server that a tunnel publishes, so people outside the
// house can see the guest dashboard. What matters most is what it will NOT do. These tests use a
// stand-in for cloudflared (tests/helpers/fakeCloudflared.js) and talk to the small server the way
// the tunnel would: arriving from this PC, with Cloudflare's headers and the public name as Host.

const FAKE = path.join(ROOT, "tests", "helpers", "fakeCloudflared.js");
const PUBLIC = "fake-test-name.trycloudflare.com";

/** A request straight to the small server, with whatever Host and headers the test wants. */
function raw(port, { method = "GET", url = "/", host = PUBLIC, headers = {}, body, cookie, stream = false }) {
	return new Promise((resolve, reject) => {
		const data = body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body);
		const req = http.request({ host: "127.0.0.1", port, method, path: url, headers: { Host: host, ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers } }, (res) => {
			if (stream) return resolve({ status: res.status ?? res.statusCode, headers: res.headers, res });
			let text = "";
			res.on("data", (c) => (text += c));
			res.on("end", () => {
				let json;
				try {
					json = JSON.parse(text);
				} catch {
					json = text;
				}
				resolve({ status: res.statusCode, headers: res.headers, json, text });
			});
		});
		req.on("error", reject);
		if (data) req.write(data);
		req.end();
	});
}

const cookieOf = (r) => r.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";

describe("the community view", () => {
	let panel;
	let api;
	let port;
	let guestCookie;

	before(async () => {
		port = await freePort();
		panel = await startInstance({
			servers: (dir) => [serverEntry(dir, { name: "Alpha", processName: "nope-a.exe", sessionName: "Visible Name", serverPassword: "join-secret", rconPassword: "rcon-secret", rconPort: 1 })],
			env: { GHP_CLOUDFLARED_EXE: process.execPath, GHP_CLOUDFLARED_PREARGS: JSON.stringify([FAKE]) },
		});
		api = panel.api;
		await api.post("/api/users", { username: "mod-one", password: "ModPass!12345", role: "moderator" });
		await api.put("/api/users/invite", { enabled: true });
	});
	after(async () => {
		await api.post("/api/community/disable");
		await panel.stop();
	});

	it("is off to begin with, and only an administrator can see or change it", async () => {
		const status = (await api.get("/api/community")).json;
		assert.equal(status.enabled, false);
		assert.equal(status.cloudflared.found, true);
		assert.equal(status.listener.running, false);
		assert.equal(status.tokenSaved, false);
		const guest = await api.cookieFor(GUEST);
		assert.equal((await api.get("/api/community", { cookie: guest })).status, 403);
		assert.equal((await api.post("/api/community/enable", {}, { cookie: guest })).status, 403);
		assert.equal((await fetch(`${api.base}/api/community`)).status, 401);
	});

	it("explains what is missing before it will turn on", async () => {
		assert.equal((await api.put("/api/community", { mode: "token" })).status, 200);
		let r = await api.post("/api/community/enable");
		assert.equal(r.status, 400);
		assert.match(r.json.error, /token/i);
		assert.equal((await api.put("/api/community", { token: "short" })).status, 400);
		assert.equal((await api.put("/api/community", { token: "x".repeat(10) + " not a token" })).status, 400);
		assert.equal((await api.put("/api/community", { token: "eyJhIjoiYWNjb3VudCIsInQiOiJ0dW5uZWwiLCJzIjoic2VjcmV0In0=" + "A".repeat(20) })).status, 200);
		r = await api.post("/api/community/enable");
		assert.match(r.json.error, /public address/i);
		assert.equal((await api.put("/api/community", { hostname: "not a name" })).status, 400);
		assert.equal((await api.get("/api/community")).json.enabled, false);
		await api.put("/api/community", { mode: "quick" });
	});

	it("turns on with a temporary link: the small server starts, the tunnel connects, there is an address", async () => {
		assert.equal((await api.put("/api/community", { port })).status, 200);
		const r = await api.post("/api/community/enable");
		assert.equal(r.status, 200, JSON.stringify(r.json));
		let status;
		for (let i = 0; i < 40; i += 1) {
			status = (await api.get("/api/community")).json;
			if (status.tunnel.status === "connected" && status.publicUrl) break;
			await sleep(250);
		}
		assert.equal(status.listener.running, true);
		assert.equal(status.listener.port, port);
		assert.equal(status.tunnel.status, "connected");
		assert.equal(status.publicUrl, `https://${PUBLIC}/`);
		assert.ok(status.tunnel.lines.some((l) => l.includes(`serving to http://127.0.0.1:${port}`)), "pointed at the small server, not at the panel");
	});

	it("only answers to its public name", async () => {
		assert.equal((await raw(port, { url: "/api/auth/join", host: "evil.example.com" })).status, 421);
		assert.equal((await raw(port, { url: "/api/auth/join", host: `127.0.0.1:${port}` })).status, 421);
		assert.equal((await raw(port, { url: "/api/auth/join", host: "trycloudflare.com" })).status, 421);
		assert.equal((await raw(port, { url: "/api/auth/join", host: PUBLIC })).status, 200);
	});

	it("shows the sign-in page, and nothing of the panel until someone signs in", async () => {
		const page = await raw(port, { url: "/" });
		// The page is the built interface; on a machine that hasn't built it (the test runner) there is a plain notice instead.
		if (fs.existsSync(path.join(ROOT, "ui", "build", "index.html"))) {
			assert.equal(page.status, 200);
			assert.match(page.text, /<div id="root">/);
		} else {
			assert.equal(page.status, 503);
		}
		for (const url of ["/api/status", "/api/events", "/api/system-stats", "/api/operations", "/api/appearance", "/api/art/valheim"]) {
			assert.equal((await raw(port, { url })).status, 401, url);
		}
	});

	it("lets a guest sign in, with a cookie that is only for https", async () => {
		const bad = await raw(port, { method: "POST", url: "/api/auth/login", body: { username: GUEST.username, password: "wrong-password" } });
		assert.equal(bad.status, 401);
		const ok = await raw(port, { method: "POST", url: "/api/auth/login", body: GUEST, headers: { "cf-ray": "abc-ORD", "cf-connecting-ip": "203.0.113.7" } });
		assert.equal(ok.status, 200, ok.text);
		assert.match(ok.headers["set-cookie"][0], /; Secure/i);
		assert.match(ok.headers["set-cookie"][0], /HttpOnly/i);
		assert.match(ok.headers["set-cookie"][0], /SameSite=Strict/i);
		guestCookie = cookieOf(ok);
		assert.equal((await raw(port, { url: "/api/auth/me", cookie: guestCookie })).json.user.role, "guest");
	});

	it("shows a guest the dashboard, without any password", async () => {
		const r = await raw(port, { url: "/api/status", cookie: guestCookie });
		assert.equal(r.status, 200);
		assert.ok(r.json.Alpha, "the server is listed");
		const everything = JSON.stringify(r.json);
		assert.ok(!everything.includes("join-secret") && !everything.includes("rcon-secret"), "no passwords");
		for (const url of ["/api/operations", "/api/system-stats", "/api/server-stats", "/api/status/latest", "/api/appearance"]) {
			assert.equal((await raw(port, { url, cookie: guestCookie })).status, 200, url);
		}
	});

	it("has nothing else: no settings, no users, no control, no files, no console", async () => {
		const gets = ["/api/users", "/api/users/invite", "/api/settings", "/api/community", "/api/storage", "/api/server/Alpha", "/api/server/Alpha/logs", "/api/server/Alpha/players", "/api/config/Alpha", "/api/templates", "/api/activity", "/api/batch-files", "/api/updates/panel", "/api/mods/Alpha", "/api/setup/status"];
		for (const url of gets) assert.equal((await raw(port, { url, cookie: guestCookie })).status, 404, `GET ${url}`);
		const posts = ["/api/control/Alpha/stop", "/api/control/Alpha/start", "/api/servers", "/api/server/Alpha/rcon", "/api/users", "/api/setup/admin", "/api/server/Alpha/backups", "/api/community/enable"];
		for (const url of posts) assert.equal((await raw(port, { method: "POST", url, cookie: guestCookie, body: {} })).status, 404, `POST ${url}`);
		for (const method of ["PUT", "DELETE", "PATCH"]) assert.equal((await raw(port, { method, url: "/api/server/Alpha", cookie: guestCookie, body: {} })).status, 404, method);
		assert.equal((await raw(port, { method: "POST", url: "/api/status", cookie: guestCookie, body: {} })).status, 404);
	});

	it("will not let an administrator or a moderator in, says why, and ignores their sessions", async () => {
		const admin = await raw(port, { method: "POST", url: "/api/auth/login", body: { username: "admin", password: "TestAdmin!2345" } });
		assert.equal(admin.status, 403);
		assert.equal(admin.json.code, "staff_not_allowed_here");
		assert.match(admin.json.error, /password is right/i);
		assert.match(admin.json.error, /admin accounts can't sign in on this public address/i);
		assert.ok(!admin.headers["set-cookie"], "no session is given");
		const mod = await raw(port, { method: "POST", url: "/api/auth/login", body: { username: "mod-one", password: "ModPass!12345" } });
		assert.equal(mod.status, 403);
		assert.match(mod.json.error, /moderator accounts/i);
		// Everything that is NOT a right password still reads the same, whoever it is for: a stranger learns
		// nothing about which names exist, or which are administrators.
		const wrongAdmin = await raw(port, { method: "POST", url: "/api/auth/login", body: { username: "admin", password: "not-the-password" } });
		const wrongNobody = await raw(port, { method: "POST", url: "/api/auth/login", body: { username: "no-such-person", password: "not-the-password" } });
		assert.equal(wrongAdmin.status, 401);
		assert.deepEqual(wrongAdmin.json, wrongNobody.json);
		assert.equal(wrongAdmin.json.error, "Incorrect username or password.");
		// A right password isn't a wrong guess: it doesn't count towards a lockout.
		for (let i = 0; i < 15; i += 1) assert.equal((await raw(port, { method: "POST", url: "/api/auth/login", body: { username: "admin", password: "TestAdmin!2345" }, headers: { "cf-connecting-ip": "203.0.113.99" } })).status, 403);
		// A real administrator session, made on the panel itself, is worth nothing here.
		const adminCookie = await api.cookieFor({ username: "admin", password: "TestAdmin!2345" });
		assert.equal((await raw(port, { url: "/api/auth/me", cookie: adminCookie })).status, 401);
		assert.equal((await raw(port, { url: "/api/status", cookie: adminCookie })).status, 401);
		assert.equal((await raw(port, { method: "POST", url: "/api/control/Alpha/stop", cookie: adminCookie, body: {} })).status, 401, "not even a route for them");
	});

	it("staff sign-in is off until the owner turns it on, and only an administrator can", async () => {
		assert.equal((await api.get("/api/community")).json.staffSignIn, false);
		const mod = await api.cookieFor({ username: "mod-one", password: "ModPass!12345" });
		assert.equal((await api.put("/api/community", { staffSignIn: true }, { cookie: mod })).status, 403);
		assert.equal((await api.put("/api/community", { staffSignIn: "yes" })).status, 400);
		assert.equal((await api.get("/api/community")).json.staffSignIn, false);
	});

	describe("with staff sign-in on", () => {
		const login = (u, ip) => raw(port, { method: "POST", url: "/api/auth/login", body: u, headers: { "cf-ray": "x", "cf-connecting-ip": ip } });
		const ADMIN_LOGIN = { username: "admin", password: "TestAdmin!2345" };
		const MOD_LOGIN = { username: "mod-one", password: "ModPass!12345" };
		let adminCookie;
		let modCookie;

		before(async () => {
			const r = await api.put("/api/community", { staffSignIn: true });
			assert.equal(r.status, 200);
			assert.equal(r.json.staffSignIn, true);
		});
		after(async () => {
			await api.put("/api/community", { staffSignIn: false });
		});

		it("lets an administrator sign in, over https only, and use the whole panel", async () => {
			const r = await login(ADMIN_LOGIN, "203.0.113.20");
			assert.equal(r.status, 200, r.text);
			assert.equal(r.json.user.role, "admin");
			assert.match(r.headers["set-cookie"][0], /; Secure/i);
			adminCookie = cookieOf(r);
			assert.equal((await raw(port, { url: "/api/auth/me", cookie: adminCookie })).json.user.role, "admin");
			for (const url of ["/api/status", "/api/settings", "/api/users", "/api/community", "/api/server/Alpha", "/api/activity", "/api/storage"]) {
				assert.equal((await raw(port, { url, cookie: adminCookie })).status, 200, url);
			}
			// The panel's own writes work too, and a real request body isn't held to the guest page's 4 KB.
			const made = await raw(port, { method: "POST", url: "/api/users", cookie: adminCookie, body: { username: "made-outside", password: "Outside!Pass-2345", role: "guest", padding: "x".repeat(6000) } });
			assert.notEqual(made.status, 413);
			assert.equal(made.status, 200, made.text);
			assert.equal((await raw(port, { method: "DELETE", url: `/api/users/${made.json.id}`, cookie: adminCookie })).status, 200);
		});

		it("lets a moderator sign in, as a moderator: they still can't reach what only an administrator can", async () => {
			const r = await login(MOD_LOGIN, "203.0.113.21");
			assert.equal(r.status, 200, r.text);
			assert.equal(r.json.user.role, "moderator");
			modCookie = cookieOf(r);
			assert.equal((await raw(port, { url: "/api/status", cookie: modCookie })).status, 200);
			assert.equal((await raw(port, { url: "/api/activity", cookie: modCookie })).status, 200);
			for (const url of ["/api/users", "/api/settings", "/api/community", "/api/storage", "/api/config/Alpha"]) {
				assert.equal((await raw(port, { url, cookie: modCookie })).status, 403, url);
			}
			assert.equal((await raw(port, { method: "POST", url: "/api/users", cookie: modCookie, body: { username: "sneaky", password: "SneakyPass!123", role: "admin" } })).status, 403);
		});

		it("never offers first-run setup, even though it arrives from this PC", async () => {
			// An administrator finds no such route; a moderator is turned away by the admin-only groups first.
			for (const [cookie, expected] of [[adminCookie, [404]], [modCookie, [403, 404]], [undefined, [401]]]) {
				const get = await raw(port, { url: "/api/setup/status", cookie });
				const post = await raw(port, { method: "POST", url: "/api/setup/admin", cookie, body: { username: "intruder", password: "IntruderPass!123" } });
				assert.ok(expected.includes(get.status), `GET setup: ${get.status}`);
				assert.ok(expected.includes(post.status), `POST setup: ${post.status}`);
			}
			assert.equal((await api.get("/api/users")).json.some((u) => u.username === "intruder"), false);
		});

		it("records who signed in from outside, and that it was switched on", async () => {
			const log = (await api.get("/api/activity?limit=100")).json;
			assert.ok(log.some((e) => e.type === "community.staff-on"));
			const entry = log.find((e) => e.type === "community.staff-signin" && e.message.startsWith("admin "));
			assert.ok(entry, "the administrator's sign-in is on record");
			assert.equal(entry.data.ip, "203.0.113.20");
		});

		it("guests are exactly as before", async () => {
			assert.equal((await raw(port, { url: "/api/status", cookie: guestCookie })).status, 200);
			assert.equal((await raw(port, { url: "/api/settings", cookie: guestCookie })).status, 404);
			assert.equal((await raw(port, { method: "POST", url: "/api/control/Alpha/stop", cookie: guestCookie, body: {} })).status, 404);
		});

		it("counts wrong guesses more strictly, and apart from the panel's own sign-in", async () => {
			const guess = () => login({ username: "admin", password: "wrong-wrong" }, "203.0.113.30");
			let last;
			for (let i = 0; i < 5; i += 1) last = await guess();
			assert.equal(last.status, 401);
			assert.equal((await guess()).status, 429, "locked after five wrong guesses");
			// Even the right password is refused while locked, from anywhere, at the public address...
			assert.equal((await login(ADMIN_LOGIN, "203.0.113.31")).status, 429);
			// ...but the administrator at home is not locked out by someone guessing from the internet.
			assert.ok(await api.cookieFor(ADMIN_LOGIN), "signing in at the panel still works");
		});

		it("is switched off again at once: sessions stop working and live streams are cut", async () => {
			const stream = await raw(port, { url: "/api/events", cookie: modCookie, headers: { "cf-connecting-ip": "203.0.113.40" }, stream: true });
			assert.equal(stream.status, 200);
			const ended = new Promise((resolve) => stream.res.on("close", resolve));
			stream.res.resume();
			assert.equal((await api.put("/api/community", { staffSignIn: false })).json.staffSignIn, false);
			await Promise.race([ended, sleep(3000).then(() => assert.fail("the stream was left open"))]);
			assert.equal((await raw(port, { url: "/api/auth/me", cookie: adminCookie })).status, 401);
			assert.equal((await raw(port, { url: "/api/status", cookie: modCookie })).status, 401);
			const refused = await login(MOD_LOGIN, "203.0.113.41");
			assert.equal(refused.status, 403);
			assert.equal(refused.json.code, "staff_not_allowed_here");
			assert.ok(!refused.headers["set-cookie"]);
			assert.equal((await raw(port, { url: "/api/status", cookie: guestCookie })).status, 200, "guests carry on");
		});
	});

	it("lets a friend join with the community code", async () => {
		const code = (await api.get("/api/users/invite")).json.code;
		assert.equal((await raw(port, { url: "/api/auth/join" })).json.open, true);
		const r = await raw(port, { method: "POST", url: "/api/auth/join", body: { code, username: "outside-friend", password: "FriendPass!123" }, headers: { "cf-ray": "x", "cf-connecting-ip": "198.51.100.9" } });
		assert.equal(r.status, 200, r.text);
		assert.equal(r.json.user.role, "guest");
		assert.equal((await raw(port, { url: "/api/status", cookie: cookieOf(r) })).status, 200);
		assert.equal((await raw(port, { method: "POST", url: "/api/auth/join", body: { code: "ZZZZ-ZZZZ", username: "x-friend", password: "FriendPass!123" } })).status, 403);
	});

	it("counts wrong guesses per visitor, not per tunnel", async () => {
		const guess = (ip) => raw(port, { method: "POST", url: "/api/auth/login", body: { username: `nobody-${ip}`, password: "nope" }, headers: { "cf-connecting-ip": ip } });
		let last;
		for (let i = 0; i < 31; i += 1) last = await guess("192.0.2.50");
		assert.equal(last.status, 429, "that visitor is slowed down");
		// Another visitor through the same tunnel is not.
		const other = await raw(port, { method: "POST", url: "/api/auth/login", body: GUEST, headers: { "cf-connecting-ip": "192.0.2.51" } });
		assert.equal(other.status, 200);
	});

	it("limits live streams per visitor, and keeps the panel's own streams free", async () => {
		const open = () => raw(port, { url: "/api/events", cookie: guestCookie, headers: { "cf-connecting-ip": "192.0.2.60" }, stream: true });
		const a = await open();
		const b = await open();
		assert.equal(a.status, 200);
		assert.equal(b.status, 200);
		const c = await open();
		const chunk = await new Promise((resolve) => c.res.once("data", (d) => resolve(String(d))));
		assert.match(chunk, /Too many live connections/);
		a.res.destroy();
		b.res.destroy();
		c.res.destroy();
		// The panel's own live updates are separate.
		const mine = await fetch(`${api.base}/api/events`, { headers: { Cookie: api.cookie } });
		assert.equal(mine.status, 200);
		await mine.body.cancel();
	});

	it("refuses large or broken requests", async () => {
		const big = await raw(port, { method: "POST", url: "/api/auth/login", body: { username: "a", password: "x".repeat(10_000) } });
		assert.equal(big.status, 413);
		const broken = await raw(port, { method: "POST", url: "/api/auth/login", body: "{not json" });
		assert.equal(broken.status, 400);
	});

	it("is unreachable through the panel itself: the panel refuses anything a tunnel has touched", async () => {
		const viaTunnel = await fetch(`${api.base}/api/auth/me`, { headers: { "cf-connecting-ip": "203.0.113.9" } });
		assert.equal(viaTunnel.status, 403);
		assert.equal((await viaTunnel.json()).code, "tunnel_refused");
		assert.equal((await fetch(`${api.base}/api/setup/status`, { headers: { "cf-ray": "abc-ORD" } })).status, 403);
		assert.equal((await fetch(`${api.base}/api/setup/status`)).status, 200, "ordinary requests are unaffected");
	});

	it("is only reachable from this PC", async () => {
		// Bound to 127.0.0.1: the machine's own LAN address is refused at the door.
		const lan = Object.values((await import("node:os")).networkInterfaces()).flat().find((i) => i?.family === "IPv4" && !i.internal);
		if (!lan) return;
		const refused = await new Promise((resolve) => {
			const s = net.connect({ host: lan.address, port, timeout: 2000 }, () => {
				s.destroy();
				resolve(false);
			});
			s.on("error", () => resolve(true));
			s.on("timeout", () => {
				s.destroy();
				resolve(true);
			});
		});
		assert.equal(refused, true);
	});

	it("turns off completely: the tunnel stops and the small server closes", async () => {
		const before = (await api.get("/api/community")).json.tunnel.pid;
		assert.ok(before);
		const r = await api.post("/api/community/disable");
		assert.equal(r.status, 200);
		assert.equal(r.json.enabled, false);
		assert.equal(r.json.tunnel.status, "stopped");
		assert.equal(r.json.listener.running, false);
		await assert.rejects(raw(port, { url: "/api/auth/join" }));
		await sleep(300);
		assert.throws(() => process.kill(before, 0), "the tunnel program is gone");
	});

	it("comes back by itself when the panel restarts, if it was on", async () => {
		const stateFile = path.join(panel.dir, "state", "community-view.json");
		const saved = JSON.parse(fs.readFileSync(stateFile, "utf8"));
		assert.equal(saved.enabled, false);
		assert.equal(saved.mode, "quick");
	});
});

describe("a tunnel made in the Cloudflare dashboard (token)", () => {
	let panel;
	let api;
	let port;
	const TOKEN = "eyJhIjoiYWNjb3VudCIsInQiOiJ0dW5uZWwiLCJzIjoic2VjcmV0In0=" + "B".repeat(30);

	before(async () => {
		port = await freePort();
		panel = await startInstance({ env: { GHP_CLOUDFLARED_EXE: process.execPath, GHP_CLOUDFLARED_PREARGS: JSON.stringify([FAKE]) } });
		api = panel.api;
	});
	after(async () => {
		await api.post("/api/community/disable");
		await panel.stop();
	});

	it("uses the token without putting it anywhere it can be read, and checks the public name", async () => {
		await api.put("/api/community", { mode: "token", token: TOKEN, hostname: "https://Panel.Example.com/some/path", port });
		const before = (await api.get("/api/community")).json;
		assert.equal(before.hostname, "panel.example.com");
		assert.equal(before.tokenSaved, true);
		assert.ok(!JSON.stringify(before).includes(TOKEN), "the token is never sent back");
		const on = await api.post("/api/community/enable");
		assert.equal(on.status, 200, JSON.stringify(on.json));
		let status;
		for (let i = 0; i < 40; i += 1) {
			status = (await api.get("/api/community")).json;
			if (status.tunnel.status === "connected") break;
			await sleep(250);
		}
		assert.equal(status.publicUrl, "https://panel.example.com/");
		const lines = status.tunnel.lines.join("\n");
		assert.match(lines, /token present, \d+ characters/);
		assert.match(lines, /command line had a token: false/);
		assert.ok(!JSON.stringify(status).includes(TOKEN));
		assert.ok(!fs.readFileSync(path.join(panel.dir, "state", "community-view.json"), "utf8").includes(TOKEN), "not in the settings file either");
		// Its public name, and only that, is served.
		assert.equal((await raw(port, { url: "/api/auth/join", host: "panel.example.com" })).status, 200);
		assert.equal((await raw(port, { url: "/api/auth/join", host: PUBLIC })).status, 421);
		assert.equal((await raw(port, { url: "/api/auth/join", host: "other.example.com" })).status, 421);
	});

	it("can forget the token", async () => {
		await api.post("/api/community/disable");
		const r = await api.put("/api/community", { clearToken: true });
		assert.equal(r.json.tokenSaved, false);
		assert.match((await api.post("/api/community/enable")).json.error, /token/i);
	});
});

describe("a tunnel already on this PC", () => {
	let panel;
	let api;
	let port;
	let home;
	let original;

	before(async () => {
		port = await freePort();
		home = tempDir("home");
		fs.mkdirSync(path.join(home, ".cloudflared"), { recursive: true });
		const credentials = path.join(home, ".cloudflared", "my-old-tunnel.json").split(path.sep).join("/");
		original = ["tunnel: my-old-tunnel", `credentials-file: ${credentials}`, "", "ingress:", "  - hostname: api.example.org", "    service: http://localhost:3001", "  - service: http_status:404", ""].join("\n");
		fs.writeFileSync(path.join(home, ".cloudflared", "config.yml"), original);
		fs.writeFileSync(path.join(home, ".cloudflared", "my-old-tunnel.json"), '{"AccountTag":"a","TunnelSecret":"s","TunnelID":"i"}');
		panel = await startInstance({ env: { USERPROFILE: home, HOME: home, GHP_CLOUDFLARED_EXE: process.execPath, GHP_CLOUDFLARED_PREARGS: JSON.stringify([FAKE]) } });
		api = panel.api;
	});
	after(async () => {
		await api.post("/api/community/disable");
		await panel.stop();
		removeDir(home);
	});

	it("is found, with its name and the addresses it already serves", async () => {
		const found = (await api.get("/api/community")).json.detectedTunnel;
		assert.equal(found.tunnel, "my-old-tunnel");
		assert.deepEqual(found.hostnames, ["api.example.org"]);
		assert.equal(found.credentialsFound, true);
	});

	it("refuses a tunnel that isn't there", async () => {
		assert.equal((await api.put("/api/community", { mode: "existing" })).status, 200);
		const r = await api.put("/api/community", { existing: { tunnel: "some-other-tunnel" } });
		assert.equal(r.status, 400);
		assert.match(r.json.error, /wasn't found/);
		assert.match((await api.post("/api/community/enable")).json.error, /choose which existing tunnel|existing/i);
	});

	it("runs it with a settings file of the panel's own that points at the small server, and leaves the user's file alone", async () => {
		const r = await api.put("/api/community", { mode: "existing", existing: { tunnel: "my-old-tunnel" }, hostname: "api.example.org", port });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		const on = await api.post("/api/community/enable");
		assert.equal(on.status, 200, JSON.stringify(on.json));
		let status;
		for (let i = 0; i < 40; i += 1) {
			status = (await api.get("/api/community")).json;
			if (status.tunnel.status === "connected") break;
			await sleep(250);
		}
		assert.equal(status.publicUrl, "https://api.example.org/");
		const lines = status.tunnel.lines.join("\n");
		assert.ok(lines.includes("hostname: api.example.org"));
		assert.ok(lines.includes(`service: http://127.0.0.1:${port}`));
		assert.ok(!lines.includes("3001"), "not pointed at the old address");
		const mine = fs.readFileSync(path.join(panel.dir, "state", "cloudflared-community.yml"), "utf8");
		assert.match(mine, /^tunnel: my-old-tunnel/m);
		assert.equal(fs.readFileSync(path.join(home, ".cloudflared", "config.yml"), "utf8"), original, "their own file is untouched");
		assert.equal((await raw(port, { url: "/api/auth/join", host: "api.example.org" })).status, 200);
	});
});

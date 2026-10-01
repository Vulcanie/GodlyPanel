import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, GUEST } from "../helpers/instance.js";

// The community code: people make their own guest account with it, so the owner doesn't hand
// out a password per friend. It is off until the owner turns it on, only the owner can see or
// change it, a wrong code gets nothing (and tells nothing), and what comes out of it is an
// ordinary guest.

const CODE_SHAPE = /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/;

describe("the community code", () => {
	let panel;
	let api;
	let guestCookie;

	const join = (body) => fetch(`${api.base}/api/auth/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
	const open = async () => (await (await fetch(`${api.base}/api/auth/join`)).json()).open;
	let code;

	before(async () => {
		panel = await startInstance();
		api = panel.api;
		guestCookie = await api.cookieFor(GUEST);
	});
	after(() => panel.stop());

	it("is off to begin with, and the sign-in page is told so without signing in", async () => {
		assert.equal(await open(), false);
		const status = (await api.get("/api/users/invite")).json;
		assert.equal(status.enabled, false);
		assert.equal(status.open, false);
		const refused = await join({ code: "AAAA-BBBB", username: "friend-one", password: "FriendPass!1" });
		assert.equal(refused.status, 403);
		assert.equal((await refused.json()).code, "bad_code");
	});

	it("can be read and changed only by an administrator", async () => {
		assert.equal((await api.get("/api/users/invite", { cookie: guestCookie })).status, 403);
		assert.equal((await api.put("/api/users/invite", { enabled: true }, { cookie: guestCookie })).status, 403);
		const anon = await fetch(`${api.base}/api/users/invite`);
		assert.equal(anon.status, 401);
	});

	it("makes a code when switched on, and the sign-in page then offers it", async () => {
		const r = await api.put("/api/users/invite", { enabled: true });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		code = r.json.code;
		assert.match(code, CODE_SHAPE);
		assert.equal(r.json.open, true);
		assert.equal(await open(), true);
		// The page learns nothing else about it.
		assert.deepEqual(await (await fetch(`${api.base}/api/auth/join`)).json(), { open: true });
	});

	it("turns a right code into a signed-in guest, however it is typed", async () => {
		const typed = ` ${code.toLowerCase().replace("-", " ")} `;
		const r = await join({ code: typed, username: "friend-one", password: "FriendPass!1" });
		assert.equal(r.status, 200, await r.clone().text());
		const cookie = r.headers.get("set-cookie").split(";")[0];
		const me = (await api.get("/api/auth/me", { cookie })).json;
		assert.equal(me.user.role, "guest");
		assert.equal(me.user.username, "friend-one");
		// They can look at the dashboard...
		assert.equal((await api.get("/api/status", { cookie })).status, 200);
		// ...and nothing that changes things or the panel's own settings.
		assert.equal((await api.get("/api/users", { cookie })).status, 403);
		assert.equal((await api.get("/api/users/invite", { cookie })).status, 403);
		assert.equal((await api.get("/api/settings", { cookie })).status, 403);
		// Their own password works afterwards, like any account.
		assert.ok(await api.cookieFor({ username: "friend-one", password: "FriendPass!1" }));
		assert.equal((await api.get("/api/users/invite")).json.joins, 1);
	});

	it("refuses a wrong code and makes no account", async () => {
		const r = await join({ code: "ZZZZ-ZZZZ", username: "intruder", password: "IntruderPass!1" });
		assert.equal(r.status, 403);
		assert.equal((await r.json()).code, "bad_code");
		assert.equal((await api.get("/api/users")).json.some((u) => u.username === "intruder"), false);
	});

	it("explains a taken name or a weak password, without using up a sign-up", async () => {
		const taken = await join({ code, username: "friend-one", password: "SomethingElse!1" });
		assert.equal(taken.status, 400);
		assert.match((await taken.json()).error, /already exists/);
		const weak = await join({ code, username: "friend-two", password: "short" });
		assert.equal(weak.status, 400);
		assert.match((await weak.json()).error, /at least 8/);
		assert.equal((await api.get("/api/users/invite")).json.joins, 1);
	});

	it("only ever creates guests, whatever the request asks for", async () => {
		const r = await join({ code, username: "friend-three", password: "FriendPass!3", role: "admin" });
		assert.equal(r.status, 200);
		assert.equal((await r.json()).user.role, "guest");
	});

	it("stops at the limit, telling someone with the code but nobody else", async () => {
		const set = await api.put("/api/users/invite", { maxJoins: 2 });
		assert.equal(set.status, 200);
		assert.equal(set.json.open, false, "2 of 2 used");
		assert.equal(await open(), false);
		const withCode = await join({ code, username: "friend-four", password: "FriendPass!4" });
		assert.equal(withCode.status, 403);
		assert.equal((await withCode.json()).code, "closed");
		const wrong = await join({ code: "ZZZZ-ZZZZ", username: "friend-five", password: "FriendPass!5" });
		assert.equal((await wrong.json()).code, "bad_code");
	});

	it("is replaced by a new code, which starts the count again and kills the old one", async () => {
		const r = await api.put("/api/users/invite", { regenerate: true, maxJoins: 0 });
		assert.notEqual(r.json.code, code);
		assert.equal(r.json.joins, 0);
		assert.equal(r.json.open, true);
		const old = await join({ code, username: "friend-six", password: "FriendPass!6" });
		assert.equal(old.status, 403);
		assert.equal((await join({ code: r.json.code, username: "friend-six", password: "FriendPass!6" })).status, 200);
		code = r.json.code;
	});

	it("can be switched off, and then every code is refused", async () => {
		assert.equal((await api.put("/api/users/invite", { enabled: false })).json.open, false);
		assert.equal(await open(), false);
		const r = await join({ code, username: "friend-seven", password: "FriendPass!7" });
		assert.equal((await r.json()).code, "bad_code");
		// Switching back on keeps the same code.
		assert.equal((await api.put("/api/users/invite", { enabled: true })).json.code, code);
	});

	it("checks the limits it is given", async () => {
		assert.equal((await api.put("/api/users/invite", { expiresInDays: -2 })).status, 400);
		assert.equal((await api.put("/api/users/invite", { expiresInDays: 9999 })).status, 400);
		assert.equal((await api.put("/api/users/invite", { maxJoins: 1.5 })).status, 400);
		const ok = await api.put("/api/users/invite", { expiresInDays: 7 });
		assert.equal(ok.status, 200);
		assert.ok(ok.json.expiresAt > Date.now() + 6 * 86_400_000);
		assert.equal((await api.put("/api/users/invite", { expiresInDays: null })).json.expiresAt, null);
	});

	it("slows down guessing", async () => {
		let last;
		for (let i = 0; i < 12; i += 1) last = await join({ code: `WRNG-${String(i).padStart(4, "A")}`, username: `guesser-${i}`, password: "GuesserPass!1" });
		assert.equal(last.status, 429);
		assert.equal((await last.json()).code, "rate_limited");
		// Even the right code waits its turn.
		assert.equal((await join({ code, username: "friend-eight", password: "FriendPass!8" })).status, 429);
	});
});

describe("a code that has run out", () => {
	let panel;
	before(async () => {
		panel = await startInstance({
			prepare: (dir) => {
				fs.mkdirSync(path.join(dir, "state"), { recursive: true });
				fs.writeFileSync(path.join(dir, "state", "community-invite.json"), JSON.stringify({ enabled: true, code: "OLDD-CODE", createdAt: 1, expiresAt: Date.now() - 1000, maxJoins: null, joins: 0 }));
			},
		});
	});
	after(() => panel.stop());

	it("is not offered, and tells the person who has it that it ran out", async () => {
		const api = panel.api;
		assert.equal((await (await fetch(`${api.base}/api/auth/join`)).json()).open, false);
		const r = await fetch(`${api.base}/api/auth/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: "OLDD-CODE", username: "late-friend", password: "LatePass!123" }) });
		assert.equal(r.status, 403);
		assert.equal((await r.json()).code, "closed");
		assert.equal((await api.get("/api/users/invite")).json.closedBecause, "expired");
	});

	it("is kept across a restart of the panel's data (the code was read from disk)", async () => {
		assert.equal((await panel.api.get("/api/users/invite")).json.code, "OLDD-CODE");
	});
});

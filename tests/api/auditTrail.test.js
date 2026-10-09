import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { ADMIN, until } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";

// Who did what: sign-ins, failed sign-ins and every change, recorded without what was typed; the whole log as a CSV or JSON Lines
// file for an administrator; and a copy of each action posted to a webhook as it happens.

const MOD = { username: "mod-mia", password: "TestMod!2345" };

describe("the audit trail", () => {
	let panel;
	let api;
	let hook;
	let hookCalls;
	let stopFeed;
	let modCookie;

	const events = async (type) => (await api.get("/api/activity?limit=500")).json.filter((e) => e.type === type);
	const logFile = () => fs.readFileSync(path.join(panel.dir, "state", "activity.jsonl"), "utf8");

	before(async () => {
		hookCalls = [];
		hook = http.createServer((req, res) => {
			let body = "";
			req.on("data", (c) => (body += c));
			req.on("end", () => {
				hookCalls.push(JSON.parse(body));
				res.end("ok");
			});
		});
		await new Promise((r) => hook.listen(0, "127.0.0.1", r));
		panel = await startInProcess({});
		api = panel.api;
		const { patchSecrets } = await import("../../src/server/config/secretsStore.js");
		const { startAuditFeed } = await import("../../src/server/services/auditFeed.js");
		await patchSecrets({ auditWebhookUrl: `http://127.0.0.1:${hook.address().port}/` });
		stopFeed = startAuditFeed({ flushEveryMs: 50 });
	});
	after(async () => {
		stopFeed?.();
		await panel.stop();
		await new Promise((r) => hook.close(r));
	});

	describe("signing in", () => {
		it("records a wrong password, naming the account but never the password", async () => {
			const r = await api.post("/api/auth/login", { username: "admin", password: "definitely-wrong-guess" }, { cookie: "" });
			assert.equal(r.status, 401);
			const [failed] = await events("auth.failed");
			assert.match(failed.message, /"admin" failed/);
			assert.equal(failed.level, "warn");
			assert.ok(failed.data.ip);
			assert.equal(logFile().includes("definitely-wrong-guess"), false);
		});

		it("records an administrator signing in", async () => {
			assert.equal((await api.post("/api/auth/login", ADMIN)).status, 200);
			const [signedIn] = await events("auth.signed_in");
			assert.match(signedIn.message, /^admin \(admin\) signed in/);
		});

		it("does not record a viewer signing in: that is not an administrator's action", async () => {
			const before = (await events("auth.signed_in")).length;
			const { GUEST } = await import("../helpers/instance.js");
			await api.post("/api/auth/login", GUEST, { cookie: "" });
			assert.equal((await events("auth.signed_in")).length, before);
		});

		it("keeps what someone typed as a name on one line", async () => {
			await api.post("/api/auth/login", { username: "evil\nname\r\n=cmd|' /C calc'!A0", password: "x" }, { cookie: "" });
			const [failed] = await events("auth.failed");
			assert.doesNotMatch(failed.message, /[\r\n]/);
		});
	});

	describe("changes", () => {
		it("records creating an account without its password", async () => {
			const r = await api.post("/api/users", { ...MOD, role: "moderator" });
			assert.equal(r.status, 200, JSON.stringify(r.json));
			const [action] = await events("admin.action");
			assert.equal(action.message, "admin (admin): created the account mod-mia (moderator)");
			assert.equal(action.data.status, 200);
			assert.equal(action.data.route, "/users");
			assert.equal(logFile().includes(MOD.password), false);
		});

		it("records a change to a person by name, and settings by which ones, never their values", async () => {
			const users = (await api.get("/api/users")).json;
			const mia = (users.users ?? users).find((u) => u.username === MOD.username);
			assert.equal((await api.put(`/api/users/${mia.id}/role`, { role: "guest" })).status, 200);
			assert.equal((await events("admin.action"))[0].message, "admin (admin): made mod-mia guest");
			assert.equal((await api.put(`/api/users/${mia.id}/role`, { role: "moderator" })).status, 200);

			assert.equal((await api.put("/api/settings/secrets", { alertWebhookUrl: "https://hooks.example/SECRET-TOKEN-123" })).status, 200);
			assert.equal((await events("admin.action"))[0].message, "admin (admin): changed secrets (alertWebhookUrl)");
			assert.equal((await api.put("/api/settings", { notifications: { diskLowGB: 7 } })).status, 200);
			assert.equal((await events("admin.action"))[0].message, "admin (admin): changed settings (notifications.diskLowGB)");
			assert.equal(logFile().includes("SECRET-TOKEN-123"), false);
		});

		it("does not record reading, or a request that was simply wrong", async () => {
			const count = async () => (await events("admin.action")).length;
			const before = await count();
			await api.get("/api/users");
			await api.put("/api/users/no-such-id/role", { role: "moderator" });
			await api.post("/api/settings/notifications/test", {});
			assert.equal(await count(), before);
		});

		it("records what a moderator was refused", async () => {
			modCookie = await panel.api.cookieFor(MOD);
			assert.ok(modCookie, "the moderator can sign in");
			assert.equal((await api.put("/api/settings", { notifications: { diskLowGB: 1 } }, { cookie: modCookie })).status, 403);
			const [refused] = await events("admin.action");
			assert.equal(refused.message, "mod-mia (moderator): changed settings (notifications.diskLowGB) (refused)");
			assert.equal(refused.level, "warn");
		});
	});

	describe("exporting", () => {
		it("gives an administrator the whole log as CSV, with a header, a byte-order mark, and spreadsheet formulas defused", async () => {
			const r = await api.get("/api/activity/export?format=csv");
			assert.equal(r.status, 200);
			assert.match(r.headers.get("content-disposition"), /attachment; filename="godlypanel-activity-\d{4}-\d\d-\d\d\.csv"/);
			const text = typeof r.json === "string" ? r.json : "";
			assert.ok(text.startsWith("\uFEFFtime,level,type,server,message,details\r\n"), text.slice(0, 80));
			assert.match(text, /admin\.action/);
			// A message that begins with a formula character is stored as text, not run.
			const { formatActivity } = await import("../../src/server/services/activityLog.js");
			assert.match(formatActivity([{ t: "2026-01-01T00:00:00Z", level: "info", type: "x", message: '=HYPERLINK("http://evil")' }], "csv"), /,"'=HYPERLINK\(""http:\/\/evil""\)",/);
		});

		it("gives JSON Lines, oldest first, one event to a line", async () => {
			const r = await api.get("/api/activity/export?format=jsonl");
			const lines = String(r.json).trim().split("\n").map((l) => JSON.parse(l));
			assert.ok(lines.length > 5);
			assert.deepEqual(lines.map((l) => l.t), [...lines.map((l) => l.t)].sort());
		});

		it("can be narrowed by type and by date", async () => {
			const only = String((await api.get("/api/activity/export?format=jsonl&types=auth.")).json).trim().split("\n").map((l) => JSON.parse(l));
			assert.ok(only.length > 0 && only.every((e) => e.type.startsWith("auth.")));
			assert.equal(String((await api.get("/api/activity/export?format=jsonl&to=2000-01-01")).json).trim(), "");
			assert.equal(String((await api.get("/api/activity/export?format=jsonl&from=2999-01-01")).json).trim(), "");
		});

		it("is for administrators only", async () => {
			assert.equal((await api.get("/api/activity/export", { cookie: modCookie })).status, 403);
			assert.equal((await api.get("/api/activity/export", { cookie: "" })).status, 401);
		});
	});

	describe("the webhook", () => {
		it("has had the actions, as Discord-formatted lines with a time", async () => {
			assert.equal(await until(() => hookCalls.some((c) => /created the account mod-mia/.test(c.content)), { timeoutMs: 10_000 }), true);
			const text = hookCalls.map((c) => c.content).join("\n");
			assert.match(text, /<t:\d+:T>/);
			assert.match(text, /signed in/);
			assert.match(text, /changed secrets \(alertWebhookUrl\)/);
			assert.equal(text.includes("SECRET-TOKEN-123"), false);
		});

		it("cannot be made to ping anyone by a name someone typed", async () => {
			hookCalls.length = 0;
			await api.post("/api/auth/login", { username: "@everyone", password: "x" }, { cookie: "" });
			assert.equal(await until(() => hookCalls.some((c) => /sign-in as/.test(c.content)), { timeoutMs: 10_000 }), true);
			const call = hookCalls.find((c) => /sign-in as/.test(c.content));
			assert.deepEqual(call.allowed_mentions, { parse: [] });
			assert.equal(call.content.includes("@everyone"), false);
		});

		it("sends nothing about what viewers do", async () => {
			hookCalls.length = 0;
			await api.get("/api/users");
			await new Promise((r) => setTimeout(r, 300));
			assert.equal(hookCalls.length, 0);
		});
	});
});

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";

// What you can see of a running server: its logs (followed live, searched, with
// passwords masked for anyone but an admin), who is on it and who has been, and the
// notifications that tell you when something goes wrong.

async function until(check, { timeoutMs = 60_000, everyMs = 400 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("logs, players and notifications", () => {
	let panel;
	let api;
	let folder;
	let mod;
	let limited;
	let hook;
	const received = [];

	const NAME = "Fake Visible";
	const base = `/api/server/${encodeURIComponent(NAME)}`;
	const logFile = () => path.join(folder, "ConanSandbox", "Saved", "Logs", "game.log");
	const online = async () => (await api.get("/api/status")).json[NAME]?.online === true;

	before(async () => {
		// A webhook to receive alerts.
		const hookPort = await freePort();
		hook = http.createServer((req, res) => {
			let body = "";
			req.on("data", (c) => (body += c));
			req.on("end", () => {
				received.push(JSON.parse(body || "{}"));
				res.end("ok");
			});
		});
		await new Promise((r) => hook.listen(hookPort, "127.0.0.1", r));

		const rconPort = await freePort();
		panel = await startInstance({
			config: { recovery: { graceSec: 10, startupGraceMin: 1, maxRestarts: 3, windowMin: 15 }, notifications: { diskLowGB: 0 } },
			servers: (dir) => {
				folder = path.join(dir, "fake-visible");
				return [makeFakeGame(folder, { name: NAME, rconPort, exe: "gp-fake-visible.exe" })];
			},
		});
		api = panel.api;
		fs.writeFileSync(path.join(folder, "players.txt"), "Alice\nBob\n");
		await api.post("/api/users", { username: "mod-vis", password: "TestMod!2345", role: "moderator" });
		await api.post("/api/users", { username: "mod-vis2", password: "TestMod!2345", role: "moderator", servers: ["Someone Else"] });
		mod = await api.cookieFor({ username: "mod-vis", password: "TestMod!2345" });
		limited = await api.cookieFor({ username: "mod-vis2", password: "TestMod!2345" });
		await api.put("/api/settings/secrets", { alertWebhookUrl: `http://127.0.0.1:${hookPort}/hook` });
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
		await new Promise((r) => hook.close(r));
	});

	describe("logs", () => {
		let id;

		it("finds the game's log once it has written one", async () => {
			await api.post(`/api/control/${encodeURIComponent(NAME)}/start`);
			assert.equal(await until(online), true);
			const logs = (await api.get(`${base}/logs`)).json;
			const game = logs.find((l) => l.name === "game.log");
			assert.ok(game, JSON.stringify(logs));
			assert.equal(game.label, "Game log");
			assert.equal("path" in game, false, "no folder paths are given out");
			id = game.id;
		});

		it("shows the end of a log", async () => {
			const r = (await api.get(`${base}/logs/${id}?lines=50`)).json;
			assert.ok(r.lines.some((l) => l.includes("rcon listening")));
			assert.equal(r.reset, true);
			assert.ok(r.offset > 0);
		});

		it("follows a log: only what was added since last time", async () => {
			const first = (await api.get(`${base}/logs/${id}`)).json;
			const quiet = (await api.get(`${base}/logs/${id}?since=${first.offset}`)).json;
			assert.deepEqual(quiet.lines.filter((l) => !/rcon: ListPlayers/i.test(l)), [], "nothing new (beyond the panel's own player checks)");
			await api.post(`/api/control/${encodeURIComponent(NAME)}/rcon`, { command: "saveworld" });
			const fresh = (await api.get(`${base}/logs/${id}?since=${first.offset}`)).json;
			assert.ok(fresh.lines.some((l) => l.includes("rcon: saveworld")));
			assert.ok(fresh.offset > first.offset);
		});

		it("starts over when the file was replaced by a shorter one", async () => {
			const r = (await api.get(`${base}/logs/${id}?since=99999999`)).json;
			assert.equal(r.reset, true);
		});

		it("searches the whole log", async () => {
			const r = (await api.get(`${base}/logs/${id}?search=SAVEWORLD`)).json;
			assert.ok(r.lines.length >= 1);
			assert.ok(r.lines.every((l) => /saveworld/i.test(l)));
			assert.equal((await api.get(`${base}/logs/${id}?search=zzz-no-such-text`)).json.lines.length, 0);
		});

		it("masks passwords for a moderator but not an admin", async () => {
			fs.appendFileSync(logFile(), "LogInit: Command Line: -ServerName=x -ServerPassword=hunter2 -RCONPassword=swordfish\nAdminPassword = letmein\n");
			const admin = (await api.get(`${base}/logs/${id}?lines=20`)).json.lines.join("\n");
			assert.match(admin, /hunter2/);
			const moderator = (await api.get(`${base}/logs/${id}?lines=20`, { cookie: mod })).json.lines.join("\n");
			assert.doesNotMatch(moderator, /hunter2|swordfish|letmein/);
			assert.match(moderator, /-ServerPassword=\*{4,}/);
			const searched = (await api.get(`${base}/logs/${id}?search=ServerPassword`, { cookie: mod })).json.lines.join("\n");
			assert.doesNotMatch(searched, /hunter2/);
		});

		it("only reads the server's own logs, by id", async () => {
			for (const bad of ["nope", "..%2F..%2Fsecrets.json", "C%3A%5CWindows%5Cwin.ini"]) {
				assert.equal((await api.get(`${base}/logs/${bad}`)).status, 404, bad);
			}
		});

		it("keeps logs from guests and from moderators of other servers", async () => {
			const guest = await api.cookieFor({ username: "viewer", password: "TestGuest!2345" });
			assert.equal((await api.get(`${base}/logs`, { cookie: guest })).status, 403);
			assert.equal((await api.get(`${base}/logs`, { cookie: limited })).status, 403);
			assert.equal((await api.get(`${base}/logs`, { cookie: mod })).status, 200);
		});
	});

	describe("players", () => {
		const players = async (cookie) => (await api.get(`${base}/players`, cookie ? { cookie } : undefined)).json;

		it("lists who is on now, without calling them new arrivals", async () => {
			assert.equal(await until(async () => (await players()).online.length === 2), true);
			const p = await players();
			assert.deepEqual(p.online.map((x) => x.name), ["Alice", "Bob"]);
			assert.equal(p.recent.some((e) => e.type === "join"), false, "already there when the panel first looked");
		});

		it("records people joining and leaving", async () => {
			fs.writeFileSync(path.join(folder, "players.txt"), "Bob\nCarol\n");
			assert.equal(await until(async () => (await players()).recent.length >= 2), true);
			const p = await players();
			assert.deepEqual(p.online.map((x) => x.name), ["Bob", "Carol"]);
			assert.ok(p.recent.some((e) => e.type === "join" && e.name === "Carol"));
			assert.ok(p.recent.some((e) => e.type === "leave" && e.name === "Alice"));
			const carol = p.people.find((x) => x.name === "Carol");
			assert.equal(carol.online, true);
			assert.equal(carol.sessions, 1);
			assert.equal(p.people.find((x) => x.name === "Alice").online, false);
		});

		it("is open to a moderator, not to a guest", async () => {
			assert.equal((await api.get(`${base}/players`, { cookie: mod })).status, 200);
			const guest = await api.cookieFor({ username: "viewer", password: "TestGuest!2345" });
			assert.equal((await api.get(`${base}/players`, { cookie: guest })).status, 403);
		});
	});

	describe("notifications", () => {
		it("sends a test to the webhook, in a shape Discord and Slack can both read", async () => {
			received.length = 0;
			const r = await api.post("/api/settings/notifications/test", {});
			assert.equal(r.json.webhook.ok, true, JSON.stringify(r.json));
			assert.equal(received.length, 1);
			assert.match(received[0].content, /notifications from GodlyPanel are working/);
			assert.match(received[0].text, /GodlyPanel test/);
			assert.equal(r.json.email.skipped, true, "email isn't set up");
		});

		it("reports a channel that fails instead of hiding it", async () => {
			await api.put("/api/settings", { notifications: { email: { enabled: true, host: "127.0.0.1", port: 9, to: "me@example.com" } } });
			const r = await api.post("/api/settings/notifications/test", {});
			assert.equal(r.json.email.ok, false);
			assert.ok(r.json.email.error);
			assert.equal(r.json.webhook.ok, true, "and the others still work");
			await api.put("/api/settings", { notifications: { email: { enabled: false } } });
		});

		it("tells you when a server crashes, and only about the things you chose", async () => {
			await api.put(`${base}/options`, { autoRestart: true });
			await sleep(6000); // let the watcher see it up
			received.length = 0;
			await api.post(`/api/control/${encodeURIComponent(NAME)}/rcon`, { command: "crash" }).catch(() => {});
			assert.equal(await until(() => received.some((m) => m.event === "server.crashed"), { timeoutMs: 60_000 }), true);
			const crash = received.find((m) => m.event === "server.crashed");
			assert.equal(crash.server, NAME);
			assert.equal(crash.level, "warn");
			assert.match(crash.content, /went down unexpectedly/);
			// A restart isn't in the default list, so it isn't sent.
			assert.equal(await until(async () => (await api.get("/api/activity?types=server.restarted.auto")).json.length > 0), true);
			assert.equal(received.some((m) => m.event === "server.restarted.auto"), false);
		});

		it("says so when a drive is nearly full", async () => {
			await api.put("/api/settings", { notifications: { diskLowGB: 100000000 } });
			received.length = 0;
			const r = await api.post("/api/settings/notifications/check-disks", {});
			assert.ok(r.json.low.length >= 1);
			assert.equal(await until(() => received.some((m) => m.event === "disk.low")), true);
			assert.match(received.find((m) => m.event === "disk.low").text, /GB free/);
			await api.put("/api/settings", { notifications: { diskLowGB: 0 } });
		});

		it("is for admins only to set up", async () => {
			assert.equal((await api.post("/api/settings/notifications/test", {}, { cookie: mod })).status, 403);
			assert.equal((await api.put("/api/settings/secrets", { alertWebhookUrl: "http://x" }, { cookie: mod })).status, 403);
		});
	});
});

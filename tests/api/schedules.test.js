import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames, gameLog } from "../helpers/fakeGame.js";

// Scheduled tasks against real stand-in game processes: a backup, a restart and a
// console command, run on demand and on their own, with old scheduled backups
// trimmed, and only people allowed to see or change schedules doing so.

async function until(check, { timeoutMs = 90_000, everyMs = 500 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("schedules", () => {
	let panel;
	let api;
	let folders;
	let mod;
	let limited;

	const SERVER = "Fake Sched";
	const base = `/api/server/${encodeURIComponent(SERVER)}`;
	const online = async () => (await api.get("/api/status")).json[SERVER]?.online === true;
	const idle = async () => !(await api.get("/api/operations")).json[SERVER];
	const tasks = async () => (await api.get("/api/schedules")).json;
	const task = async (id) => (await tasks()).find((t) => t.id === id);
	const backups = async () => (await api.get(`${base}/backups`)).json.backups;
	const daily = { type: "daily", time: "04:00" };

	before(async () => {
		const ports = [await freePort(), await freePort()];
		folders = [];
		panel = await startInstance({
			config: { backups: { keepCount: 2 } },
			servers: (dir) => {
				const make = (name, exe, port) => {
					const folder = path.join(dir, exe);
					folders.push(folder);
					return makeFakeGame(folder, { name, rconPort: port, exe: `${exe}.exe` });
				};
				return [make(SERVER, "gp-fake-sched", ports[0]), make("Fake Gone", "gp-fake-gone", ports[1])];
			},
		});
		api = panel.api;
		await api.post("/api/users", { username: "mod-sched", password: "TestMod!2345", role: "moderator" });
		await api.post("/api/users", { username: "mod-sched2", password: "TestMod!2345", role: "moderator", servers: ["Fake Gone"] });
		mod = await api.cookieFor({ username: "mod-sched", password: "TestMod!2345" });
		limited = await api.cookieFor({ username: "mod-sched2", password: "TestMod!2345" });
	});
	after(async () => {
		for (const f of folders) killFakeGames(f);
		await panel.stop();
	});

	it("refuses schedules that don't make sense", async () => {
		for (const body of [
			{ kind: "backup", servers: [], when: daily },
			{ kind: "backup", servers: ["Nobody"], when: daily },
			{ kind: "backup", servers: [SERVER], when: { type: "daily", time: "4am" } },
			{ kind: "explode", servers: [SERVER], when: daily },
			{ kind: "command", servers: [SERVER], when: daily, options: {} },
		]) {
			assert.equal((await api.post("/api/schedules", body)).status, 400, JSON.stringify(body));
		}
		assert.equal((await tasks()).length, 0);
	});

	it("keeps a schedule and says when it will next run", async () => {
		const made = await api.post("/api/schedules", { kind: "backup", name: "Nightly", servers: [SERVER], when: daily });
		assert.equal(made.status, 200, JSON.stringify(made.json));
		assert.ok(made.json.id);
		assert.ok(Date.parse(made.json.nextRunAt) > Date.now());
		assert.equal(new Date(made.json.nextRunAt).getHours(), 4);
		const off = await api.put(`/api/schedules/${made.json.id}`, { enabled: false });
		assert.equal(off.json.enabled, false);
		assert.equal(off.json.nextRunAt, null, "a disabled one has no next run");
		assert.equal((await api.del(`/api/schedules/${made.json.id}`)).status, 200);
		assert.equal((await api.del(`/api/schedules/${made.json.id}`)).status, 404);
		assert.equal((await api.put("/api/schedules/nope", { enabled: true })).status, 404);
	});

	it("runs a backup on demand, marked as scheduled, and keeps only the newest few", async () => {
		await api.post(`${base}/backups`, { mode: "stop" }); // one by hand: never trimmed
		await until(idle);
		const made = (await api.post("/api/schedules", { kind: "backup", name: "Hourly", servers: [SERVER], when: { type: "interval", everyMinutes: 60 } })).json;
		for (let i = 0; i < 4; i += 1) {
			assert.equal((await api.post(`/api/schedules/${made.id}/run`)).status, 202);
			assert.equal(await until(async () => (await task(made.id)).running === false && (await task(made.id)).lastRunAt !== null && (await idle()), { timeoutMs: 30_000 }), true);
			await sleep(1100); // backup ids carry the second they were taken
		}
		const t = await task(made.id);
		assert.equal(t.lastStatus, "ok");
		assert.match(t.lastMessage, /Fake Sched: backed up/);
		const kinds = (await backups()).map((b) => b.kind);
		assert.equal(kinds.filter((k) => k === "manual").length, 1, "the one made by hand is never trimmed");
		assert.equal(kinds.filter((k) => k === "scheduled").length, 2, "keepCount is 2");
		await api.del(`/api/schedules/${made.id}`);
	});

	it("restarts a running server on schedule, and leaves a stopped one alone", async () => {
		const made = (await api.post("/api/schedules", { kind: "restart", name: "Nightly restart", servers: [SERVER], when: daily, options: { warnMinutes: [] } })).json;
		await api.post(`/api/schedules/${made.id}/run`);
		await until(async () => (await task(made.id)).lastRunAt !== null);
		assert.match((await task(made.id)).lastMessage, /wasn't running, so left alone/);

		assert.equal((await api.post(`/api/control/${encodeURIComponent(SERVER)}/start`)).status, 200);
		assert.equal(await until(online), true);
		await until(idle);
		const shutdownsBefore = (gameLog(folders[0]).match(/rcon: Shutdown/g) ?? []).length;

		await api.post(`/api/schedules/${made.id}/run`);
		assert.equal(await until(async () => (await task(made.id)).lastMessage?.includes("restarted"), { timeoutMs: 120_000 }), true);
		assert.equal((gameLog(folders[0]).match(/rcon: Shutdown/g) ?? []).length, shutdownsBefore + 1, "it was stopped");
		assert.equal(await until(online), true, "and is back");
		const ev = (await api.get(`/api/activity?server=${encodeURIComponent(SERVER)}&types=server.restarted.scheduled`)).json;
		assert.equal(ev.length, 1);
		await api.del(`/api/schedules/${made.id}`);
	});

	it("sends a console command to a running server", async () => {
		await until(idle);
		const made = (await api.post("/api/schedules", { kind: "command", servers: [SERVER], when: daily, options: { command: "saveworld" } })).json;
		await api.post(`/api/schedules/${made.id}/run`);
		assert.equal(await until(async () => (await task(made.id)).lastStatus === "ok"), true);
		assert.match(gameLog(folders[0]), /rcon: saveworld/);
		await api.del(`/api/schedules/${made.id}`);
	});

	it("runs a timed schedule by itself when it comes due", async () => {
		const at = new Date(Date.now() + 2000).toISOString();
		const made = (await api.post("/api/schedules", { kind: "command", servers: [SERVER], when: { type: "once", at }, options: { command: "saveworld" } })).json;
		const before = (gameLog(folders[0]).match(/rcon: saveworld/g) ?? []).length;
		assert.equal(await until(async () => (await task(made.id)).lastStatus === "ok", { timeoutMs: 60_000 }), true, "ran on its own");
		assert.equal((gameLog(folders[0]).match(/rcon: saveworld/g) ?? []).length, before + 1);
		const t = await task(made.id);
		assert.equal(t.enabled, false, "a one-off switches itself off");
		assert.equal(t.nextRunAt, null);
		await api.del(`/api/schedules/${made.id}`);
	});

	it("skips one that was due long ago instead of running it late", async () => {
		const at = new Date(Date.now() - 3 * 3600_000).toISOString();
		const before = (await backups()).length;
		const made = (await api.post("/api/schedules", { kind: "backup", servers: [SERVER], when: { type: "once", at }, options: {} })).json;
		assert.equal(await until(async () => (await task(made.id)).lastStatus === "skipped", { timeoutMs: 60_000 }), true);
		assert.match((await task(made.id)).lastMessage, /panel wasn't running/);
		assert.equal((await backups()).length, before, "nothing was backed up");
		await api.del(`/api/schedules/${made.id}`);
	});

	it("takes a deleted server out of its schedules", async () => {
		const made = (await api.post("/api/schedules", { kind: "backup", servers: [SERVER, "Fake Gone"], when: daily })).json;
		const removed = await api.call("DELETE", "/api/server/Fake%20Gone", { confirmName: "Fake Gone", deleteFiles: false });
		assert.equal(removed.status, 200, JSON.stringify(removed.json));
		assert.deepEqual((await task(made.id)).servers, [SERVER]);
		await api.del(`/api/schedules/${made.id}`);
	});

	describe("who may see and change them", () => {
		it("lets a moderator look but not change", async () => {
			const made = (await api.post("/api/schedules", { kind: "backup", servers: [SERVER], when: daily })).json;
			assert.equal((await api.get("/api/schedules", { cookie: mod })).json.length, 1);
			assert.equal((await api.post("/api/schedules", { kind: "backup", servers: [SERVER], when: daily }, { cookie: mod })).status, 403);
			assert.equal((await api.put(`/api/schedules/${made.id}`, { enabled: false }, { cookie: mod })).status, 403);
			assert.equal((await api.del(`/api/schedules/${made.id}`, { cookie: mod })).status, 403);
			assert.equal((await api.post(`/api/schedules/${made.id}/run`, {}, { cookie: mod })).status, 403);
			// One limited to a different server doesn't see it at all.
			assert.equal((await api.get("/api/schedules", { cookie: limited })).json.length, 0);
			await api.del(`/api/schedules/${made.id}`);
		});

		it("shows the activity log to a moderator, but only for their servers", async () => {
			const all = (await api.get("/api/activity?limit=200", { cookie: mod })).json;
			assert.ok(all.some((e) => e.server === SERVER));
			const theirs = (await api.get("/api/activity?limit=200", { cookie: limited })).json;
			assert.equal(theirs.some((e) => e.server === SERVER), false);
			assert.equal((await api.get(`/api/activity?server=${encodeURIComponent(SERVER)}`, { cookie: limited })).status, 403);
			const guest = await api.cookieFor({ username: "viewer", password: "TestGuest!2345" });
			assert.equal((await api.get("/api/activity", { cookie: guest })).status, 403);
			assert.equal((await api.get("/api/schedules", { cookie: guest })).status, 403);
		});
	});
});

describe("announcements", () => {
	let panel;
	let api;
	let folders;

	const enc = encodeURIComponent;
	const logOf = (folder) => gameLog(folder);

	before(async () => {
		const ports = [await freePort(), await freePort()];
		folders = [];
		panel = await startInstance({
			servers: (dir) => {
				const make = (name, exe, port, extra = {}) => {
					const folder = path.join(dir, exe);
					folders.push(folder);
					return { ...makeFakeGame(folder, { name, rconPort: port, exe: `${exe}.exe` }), ...extra };
				};
				return [make("Talk Here", "gp-fake-talk", ports[0]), make("Mute Game", "gp-fake-mute", ports[1], { method: "process", rconPort: undefined, rconPassword: undefined })];
			},
		});
		api = panel.api;
	});
	after(async () => {
		for (const f of folders) killFakeGames(f);
		await panel.stop();
	});

	const task = async (id) => (await api.get("/api/schedules")).json.find((t) => t.id === id);
	const runAndWait = async (id) => {
		const before = (await task(id)).lastRunAt;
		await api.post(`/api/schedules/${id}/run`);
		await until(async () => (await task(id)).lastRunAt !== before && !(await task(id)).running);
		return task(id);
	};

	it("says each message in turn, wrapping round", async () => {
		await api.post("/api/control/Talk%20Here/start");
		await until(async () => (await api.get("/api/status")).json["Talk Here"]?.online === true);
		await until(async () => !(await api.get("/api/operations")).json["Talk Here"]);
		const made = (await api.post("/api/schedules", { kind: "announce", name: "Reminders", servers: ["Talk Here"], when: { type: "interval", everyMinutes: 30 }, options: { messages: ["Join our Discord", "Be kind to each other"] } })).json;
		const first = await runAndWait(made.id);
		assert.equal(first.lastStatus, "ok");
		assert.match(first.lastMessage, /announced "Join our Discord"/);
		await runAndWait(made.id);
		await runAndWait(made.id);
		const log = logOf(folders[0]);
		const said = [...log.matchAll(/rcon: broadcast (.+)/g)].map((m) => m[1]);
		assert.deepEqual(said, ["Join our Discord", "Be kind to each other", "Join our Discord"]);
	});

	it("does nothing to a server that isn't running", async () => {
		const made = (await api.post("/api/schedules", { kind: "announce", servers: ["Mute Game"], when: { type: "interval", everyMinutes: 30 }, options: { messages: ["hi"] } })).json;
		const r = await runAndWait(made.id);
		assert.match(r.lastMessage, /wasn't running, so nothing was announced/);
	});

	it("says plainly when a server has no RCON to broadcast through", async () => {
		await api.post("/api/control/Mute%20Game/start");
		assert.equal(await until(async () => (await api.get("/api/status")).json["Mute Game"]?.online === true), true);
		await until(async () => !(await api.get("/api/operations")).json["Mute Game"]);
		const made = (await api.post("/api/schedules", { kind: "announce", servers: ["Mute Game"], when: { type: "interval", everyMinutes: 30 }, options: { messages: ["hi"] } })).json;
		const r = await runAndWait(made.id);
		assert.equal(r.lastStatus, "failed", r.lastMessage);
		assert.match(r.lastMessage, /RCON isn't set up for this server/);
	});
});

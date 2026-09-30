import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";

// The history charts are fed by a real sampler watching a real (stand-in) game.

async function until(check, { timeoutMs = 90_000, everyMs = 1000 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("CPU, memory and player history", () => {
	let panel;
	let api;
	let folder;
	const NAME = "Fake Metrics";
	const series = async (range = "1h") => (await api.get(`/api/server/${encodeURIComponent(NAME)}/metrics?range=${range}`)).json;

	before(async () => {
		const rconPort = await freePort();
		panel = await startInstance({
			config: { metrics: { enabled: true, sampleSec: 5 } },
			servers: (dir) => {
				folder = path.join(dir, "fake-metrics");
				return [makeFakeGame(folder, { name: NAME, rconPort, exe: "gp-fake-metrics.exe" })];
			},
		});
		api = panel.api;
		fs.writeFileSync(path.join(folder, "players.txt"), "Alice\nBob\nCarol\n");
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	it("records how many players were on, and how much the game used, while it runs", async () => {
		await api.post(`/api/control/${encodeURIComponent(NAME)}/start`);
		assert.equal(await until(async () => (await series()).points.some((p) => p.players >= 3)), true, JSON.stringify(await series()));
		const point = (await series()).points.find((p) => p.players >= 3);
		assert.equal(point.playersMax >= 3, true);
		assert.ok(point.ramMB > 10, `the stand-in game uses some memory: ${point.ramMB}`);
		assert.ok("cpu" in point);
		assert.equal(point.up, 1);
	});

	it("records the whole PC too", async () => {
		const sys = (await api.get("/api/metrics/system?range=1h")).json;
		assert.ok(sys.points.length >= 1);
		assert.ok(sys.points[0].ramMB > 100);
	});

	it("knows the ranges, and falls back to a day for one it doesn't", async () => {
		assert.equal((await series("7d")).range, "7d");
		assert.equal((await api.get(`/api/server/${encodeURIComponent(NAME)}/metrics?range=forever`)).json.range, "24h");
	});

	it("is for moderators and administrators, not guests", async () => {
		await api.post("/api/users", { username: "modm2", password: "TestMod!2345", role: "moderator" });
		await api.post("/api/users", { username: "modm3", password: "TestMod!2345", role: "moderator", servers: ["Other"] });
		const mod = await api.cookieFor({ username: "modm2", password: "TestMod!2345" });
		const limited = await api.cookieFor({ username: "modm3", password: "TestMod!2345" });
		const guest = await api.cookieFor({ username: "viewer", password: "TestGuest!2345" });
		assert.equal((await api.get(`/api/server/${encodeURIComponent(NAME)}/metrics`, { cookie: mod })).status, 200);
		assert.equal((await api.get(`/api/server/${encodeURIComponent(NAME)}/metrics`, { cookie: limited })).status, 403);
		assert.equal((await api.get("/api/metrics/system", { cookie: guest })).status, 403);
	});
});

describe("player statistics endpoint", () => {
	let panel;
	let api;
	let folder;
	const NAME = "Fake Stats";

	before(async () => {
		const rconPort = await freePort();
		panel = await startInstance({
			config: { metrics: { enabled: true, sampleSec: 5 } },
			servers: (dir) => {
				folder = path.join(dir, "fake-stats");
				return [makeFakeGame(folder, { name: NAME, rconPort, exe: "gp-fake-stats.exe" })];
			},
		});
		api = panel.api;
		fs.writeFileSync(path.join(folder, "players.txt"), "Alice\nBob\n");
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	it("works out the peak, the busiest hours and who plays most", async () => {
		await api.post(`/api/control/${encodeURIComponent(NAME)}/start`);
		const get = async () => (await api.get(`/api/server/${encodeURIComponent(NAME)}/player-stats?days=7`)).json;
		const ok = await until(async () => (await get()).peak.players >= 2, { timeoutMs: 90_000 });
		assert.equal(ok, true);
		const s = await get();
		assert.equal(s.peak.players, 2);
		assert.ok(s.averageWhileUp > 0);
		assert.equal(s.hours.length, 7);
		assert.equal(s.hours[0].length, 24);
		const now = new Date();
		assert.ok(s.hours[now.getDay()][now.getHours()] > 0, "the current hour of the current weekday has players");
		assert.equal(s.daily.at(-1).date.length, 10);
		assert.equal((await api.get(`/api/server/${encodeURIComponent(NAME)}/player-stats?days=9999`)).json.days, 90, "capped at ninety days");
	});
});

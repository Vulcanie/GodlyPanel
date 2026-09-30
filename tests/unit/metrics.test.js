import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The history behind the charts: one point a minute (an average, with players at their
// peak), one an hour after that, read back in a few hundred points at most.

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-metrics-"));
process.env.GHP_DATA_DIR = dir;
const { addSample, flushAll, readSeries, readMinutes, bucketize, forgetMetrics } = await import("../../src/server/services/metrics.js");

const MIN = 60_000;
const t0 = Date.now() - 3 * 3_600_000;
const at = (minutes, extraMs = 0) => Math.floor(t0 / MIN) * MIN + minutes * MIN + extraMs;

describe("keeping a history of how busy things are", () => {
	after(() => fs.rmSync(dir, { recursive: true, force: true }));

	it("averages the readings inside a minute, and keeps the peak number of players", async () => {
		await addSample("server:A", { cpu: 10, ramMB: 1000, players: 2 }, at(0, 1000));
		await addSample("server:A", { cpu: 30, ramMB: 2000, players: 6 }, at(0, 31_000));
		await addSample("server:A", { cpu: 50, ramMB: 3000, players: 4 }, at(1)); // the next minute starts
		await flushAll();
		const minutes = await readMinutes("server:A", 4 * 3_600_000);
		assert.equal(minutes.length, 2);
		assert.deepEqual(minutes[0], { t: at(0), cpu: 20, ramMB: 1500, players: 4, playersMax: 6 });
		assert.equal(minutes[1].cpu, 50);
	});

	it("reads a series back in time order, for a range", async () => {
		for (let m = 2; m < 130; m += 1) await addSample("server:B", { cpu: m % 10, players: m % 4 }, at(m));
		const r = await readSeries("server:B", "24h");
		assert.ok(r.points.length >= 40 && r.points.length <= 600, `${r.points.length} points (a day is averaged into a few minutes each)`);
		assert.ok(r.points.every((p, i) => i === 0 || p.t > r.points[i - 1].t));
		const short = await readSeries("server:B", "1h");
		assert.ok(short.points.length < r.points.length, "a shorter range has fewer points");
	});

	it("writes an hourly point once an hour is over", async () => {
		const hourly = fs.readdirSync(path.join(dir, "state", "metrics")).filter((f) => f.includes("B") && f.endsWith(".hourly.jsonl"));
		assert.equal(hourly.length, 1, "the hourly file exists for the server with two hours of minutes");
		const lines = fs.readFileSync(path.join(dir, "state", "metrics", hourly[0]), "utf8").trim().split("\n");
		assert.ok(lines.length >= 1);
	});

	it("averages down to a few hundred points for a long range", async () => {
		const pts = Array.from({ length: 10_000 }, (_, i) => ({ t: i * MIN, cpu: i % 100, players: i % 7, playersMax: i % 7 }));
		const b = bucketize(pts, 30 * MIN);
		assert.ok(b.length <= 10_000 / 30 + 1);
		assert.equal(b[0].cpu, 14.5);
		assert.equal(b[0].playersMax, 6, "the peak survives averaging");
	});

	it("forgets a server when it is deleted", async () => {
		await forgetMetrics("server:A");
		assert.equal((await readMinutes("server:A", 4 * 3_600_000)).length, 0);
	});
});

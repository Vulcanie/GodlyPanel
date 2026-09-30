import { readMinutes, readSeries } from "./metrics.js";
import { playersFor } from "./playerTracker.js";

// Player statistics worked out from the per-minute history: the busiest moment, the
// average crowd, when people play (a grid of weekday by hour), and a line per day.
// Times are the PC's local time, which is what "Friday evening" means to the owner.

const MINUTE = 60_000;
const HOUR = 3_600_000;
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (t) => {
	const d = new Date(t);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * @param {{ t: number, players?: number, playersMax?: number, up?: number }[]} points
 * @param {number} stepMs  how much time each point stands for
 */
export function computeStats(points, stepMs = MINUTE) {
	const out = {
		peak: { players: 0, at: null },
		averagePlayers: 0,
		averageWhileUp: 0,
		uptimePercent: null,
		playerHours: 0,
		hours: null,
		daily: [],
		samples: points.length,
	};
	if (points.length === 0) return out;

	const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ sum: 0, n: 0 })));
	const days = new Map();
	let playerSum = 0;
	let upTime = 0;
	let upPlayerSum = 0;
	let upN = 0;
	let upSum = 0;

	for (const p of points) {
		const players = p.players ?? 0;
		const peak = p.playersMax ?? players;
		if (peak > out.peak.players) out.peak = { players: peak, at: new Date(p.t).toISOString() };
		playerSum += players;
		if (p.up !== undefined) {
			upSum += p.up;
			upN += 1;
		}
		if ((p.up ?? 1) >= 0.5) {
			upPlayerSum += players;
			upTime += 1;
		}
		const d = new Date(p.t);
		const cell = grid[d.getDay()][d.getHours()];
		cell.sum += players;
		cell.n += 1;

		const key = dayKey(p.t);
		const day = days.get(key) ?? { date: key, peak: 0, playerMinutes: 0, upPoints: 0, points: 0 };
		day.peak = Math.max(day.peak, peak);
		day.playerMinutes += (players * stepMs) / MINUTE;
		day.points += 1;
		if ((p.up ?? 1) >= 0.5) day.upPoints += 1;
		days.set(key, day);
	}

	out.averagePlayers = Math.round((playerSum / points.length) * 100) / 100;
	out.averageWhileUp = upTime ? Math.round((upPlayerSum / upTime) * 100) / 100 : 0;
	out.uptimePercent = upN ? Math.round((upSum / upN) * 1000) / 10 : null;
	out.playerHours = Math.round(points.reduce((s, p) => s + ((p.players ?? 0) * stepMs) / HOUR, 0) * 10) / 10;
	out.hours = grid.map((row) => row.map((c) => (c.n ? Math.round((c.sum / c.n) * 100) / 100 : null)));
	out.daily = [...days.values()]
		.sort((a, b) => (a.date < b.date ? -1 : 1))
		.map((d) => ({ date: d.date, peak: d.peak, playerMinutes: Math.round(d.playerMinutes), uptimePercent: Math.round((d.upPoints / d.points) * 1000) / 10 }));
	return out;
}

/** Statistics for a server over the last `days` days (up to 90). */
export async function statsFor(serverName, days = 7, now = Date.now()) {
	const key = `server:${serverName}`;
	const span = days * 24 * HOUR;
	let points;
	let stepMs;
	if (days <= 7) {
		points = await readMinutes(key, span, now);
		stepMs = MINUTE;
	} else {
		// Older than the per-minute file keeps: one point an hour.
		const series = await readSeries(key, days <= 30 ? "30d" : "90d", now);
		points = series.points;
		stepMs = series.bucketMs;
	}
	const stats = computeStats(points, stepMs);
	const people = playersFor(serverName).people
		.filter((p) => Date.parse(p.lastSeen) >= now - span)
		.sort((a, b) => b.totalMinutes - a.totalMinutes)
		.slice(0, 10);
	return { days, ...stats, topPlayers: people.map((p) => ({ name: p.name, minutes: p.totalMinutes, sessions: p.sessions, lastSeen: p.lastSeen })) };
}

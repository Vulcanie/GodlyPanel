import { promises as fs } from "node:fs";
import path from "node:path";
import { paths } from "../paths.js";

// History of how busy the PC and each server are: CPU, memory and how many players.
// One point per minute (the average over that minute, and for players also the peak),
// kept for a week, and one point per hour (same idea) kept for ninety days. Small
// files, one per thing measured, appended to and trimmed, so it costs next to nothing.
//
// The player numbers here are also what the player statistics (peak, busiest hours)
// are worked out from.

const DIR = path.join(paths.dataDir, "state", "metrics");
const MINUTE = 60_000;
const HOUR = 3_600_000;
const MINUTE_KEEP_MS = 7 * 24 * HOUR;
const HOUR_KEEP_MS = 90 * 24 * HOUR;
const TRIM_EVERY = 500; // writes between looks at file length
const MAX_POINTS = 600; // what a chart is ever given

const fileFor = (key, hourly = false) => path.join(DIR, `${key.replace(/[^A-Za-z0-9._-]+/g, "_")}-${Buffer.from(key).toString("hex").slice(0, 8)}${hourly ? ".hourly" : ""}.jsonl`);

const minuteAcc = new Map(); // key -> accumulator for the minute being filled
const hourAcc = new Map(); // key -> accumulator for the hour being filled
const writes = new Map();

const newAcc = (slot) => ({ slot, n: 0, sum: {}, max: {} });

function add(acc, values) {
	acc.n += 1;
	for (const [name, value] of Object.entries(values)) {
		if (!Number.isFinite(value)) continue;
		acc.sum[name] = (acc.sum[name] ?? 0) + value;
		acc.max[name] = Math.max(acc.max[name] ?? -Infinity, value);
	}
}

function toPoint(acc, slotMs) {
	const point = { t: acc.slot * slotMs };
	for (const [name, total] of Object.entries(acc.sum)) point[name] = Math.round((total / acc.n) * 10) / 10;
	// Players matter at their peak, not just their average.
	if (acc.max.players !== undefined) point.playersMax = acc.max.players;
	return point;
}

async function append(file, point) {
	await fs.mkdir(DIR, { recursive: true });
	await fs.appendFile(file, `${JSON.stringify(point)}\n`);
}

async function trim(file, keepMs) {
	try {
		const lines = (await fs.readFile(file, "utf8")).split("\n").filter(Boolean);
		const cutoff = Date.now() - keepMs;
		const kept = lines.filter((l) => {
			try {
				return JSON.parse(l).t >= cutoff;
			} catch {
				return false;
			}
		});
		if (kept.length !== lines.length) await fs.writeFile(file, `${kept.join("\n")}\n`);
	} catch {
		// Nothing to trim yet.
	}
}

async function flushMinute(key, acc) {
	const point = toPoint(acc, MINUTE);
	await append(fileFor(key), point);

	// Feed the hour being filled; write it when the hour changes.
	const hourSlot = Math.floor(point.t / HOUR);
	let hour = hourAcc.get(key);
	if (hour && hour.slot !== hourSlot) {
		await append(fileFor(key, true), toPoint(hour, HOUR));
		hour = null;
	}
	hour ??= newAcc(hourSlot);
	hourAcc.set(key, hour);
	// An hour is the average of its minutes, so each minute counts once.
	const asValues = Object.fromEntries(Object.entries(point).filter(([k]) => k !== "t" && k !== "playersMax"));
	if (point.playersMax !== undefined) asValues.players = point.playersMax;
	add(hour, asValues);

	const count = (writes.get(key) ?? 0) + 1;
	writes.set(key, count);
	if (count % TRIM_EVERY === 0) {
		await trim(fileFor(key), MINUTE_KEEP_MS);
		await trim(fileFor(key, true), HOUR_KEEP_MS);
	}
}

/**
 * Record a reading for `key` ("system", or "server:<name>").
 * @param {Record<string, number>} values  e.g. { cpu, ramMB, players }
 */
export async function addSample(key, values, now = Date.now()) {
	const slot = Math.floor(now / MINUTE);
	const current = minuteAcc.get(key);
	if (current && current.slot !== slot) {
		minuteAcc.delete(key);
		await flushMinute(key, current);
	}
	const acc = minuteAcc.get(key) ?? newAcc(slot);
	minuteAcc.set(key, acc);
	add(acc, values);
}

/** Write what has been collected for the minute in progress, so a reader sees it. */
export async function flushAll() {
	for (const [key, acc] of [...minuteAcc]) {
		minuteAcc.delete(key);
		await flushMinute(key, acc);
	}
}

export async function forgetMetrics(key) {
	minuteAcc.delete(key);
	hourAcc.delete(key);
	await fs.rm(fileFor(key), { force: true }).catch(() => {});
	await fs.rm(fileFor(key, true), { force: true }).catch(() => {});
}

async function readPoints(file, sinceMs) {
	try {
		return (await fs.readFile(file, "utf8"))
			.split("\n")
			.filter(Boolean)
			.map((l) => {
				try {
					return JSON.parse(l);
				} catch {
					return null;
				}
			})
			.filter((p) => p && p.t >= sinceMs);
	} catch {
		return [];
	}
}

/** Average points into buckets of `bucketMs`; players keep their peak. Pure. */
export function bucketize(points, bucketMs) {
	const buckets = new Map();
	for (const p of points) {
		const slot = Math.floor(p.t / bucketMs);
		if (!buckets.has(slot)) buckets.set(slot, { slot, n: 0, sum: {}, max: {} });
		const b = buckets.get(slot);
		b.n += 1;
		for (const [name, value] of Object.entries(p)) {
			if (name === "t" || !Number.isFinite(value)) continue;
			b.sum[name] = (b.sum[name] ?? 0) + value;
			b.max[name] = Math.max(b.max[name] ?? -Infinity, value);
		}
	}
	return [...buckets.values()]
		.sort((a, b) => a.slot - b.slot)
		.map((b) => {
			const point = { t: b.slot * bucketMs };
			for (const [name, total] of Object.entries(b.sum)) point[name] = name === "playersMax" ? b.max[name] : Math.round((total / b.n) * 10) / 10;
			return point;
		});
}

export const RANGES = { "1h": HOUR, "6h": 6 * HOUR, "24h": 24 * HOUR, "7d": 7 * 24 * HOUR, "30d": 30 * 24 * HOUR, "90d": 90 * 24 * HOUR };

/**
 * A series for a chart. Up to a week comes from the per-minute file, longer from the
 * hourly one, and either is averaged down to a few hundred points.
 */
export async function readSeries(key, range = "24h", now = Date.now()) {
	await flushAll();
	const span = RANGES[range] ?? RANGES["24h"];
	const since = now - span;
	const hourly = span > MINUTE_KEEP_MS;
	const points = await readPoints(fileFor(key, hourly), since);
	const step = hourly ? HOUR : MINUTE;
	const bucket = Math.max(step, Math.ceil(span / MAX_POINTS / step) * step);
	return { range, bucketMs: bucket, points: bucket > step ? bucketize(points, bucket) : points };
}

/** Every minute point in a range, unbucketed, for statistics. */
export async function readMinutes(key, spanMs, now = Date.now()) {
	await flushAll();
	return readPoints(fileFor(key), now - spanMs);
}

export const metricsDir = DIR;

import path from "node:path";
import fs from "node:fs";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { paths } from "../paths.js";
import { getConfig } from "../config/configStore.js";
import { all as allServers } from "../data/serverStore.js";
import { readJson, writeJsonAtomic } from "../util/atomicJson.js";

const CACHE_PATH = path.join(paths.dataDir, "cache", "storage-usage.json");
const WORKER_PATH = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"workers",
	"dirSizeWorker.js",
);

let cache = {
	schemaVersion: 1,
	totals: { bytes: 0, files: 0 },
	roots: [],
	volumes: [],
	scannedAt: null,
	status: "idle",
	error: null,
};
let scanning = false;

function normalise(p) {
	return path.resolve(String(p)).replace(/[\\/]+$/, "");
}

/**
 * Every distinct folder worth measuring, with anything nested inside another
 * dropped — several ARK maps share one install, and counting that install
 * once per map would multiply the number by ten.
 */
export function storageRoots() {
	const candidates = new Set([normalise(paths.dataDir)]);
	const { paths: configured } = getConfig();
	if (configured.serversRoot) candidates.add(normalise(configured.serversRoot));
	for (const server of allServers()) {
		for (const key of ["installDir", "workingDir"]) {
			if (server[key]) candidates.add(normalise(server[key]));
		}
	}

	const all = [...candidates].sort((a, b) => a.length - b.length);
	const kept = [];
	for (const candidate of all) {
		const nested = kept.some(
			(root) =>
				candidate.toLowerCase() === root.toLowerCase() ||
				candidate.toLowerCase().startsWith(root.toLowerCase() + path.sep),
		);
		if (!nested) kept.push(candidate);
	}
	return kept;
}

function measureRoot(root) {
	return new Promise((resolve) => {
		const started = Date.now();
		const worker = new Worker(WORKER_PATH, { workerData: { root } });
		let settled = false;

		const finish = (result) => {
			if (settled) return;
			settled = true;
			resolve({
				path: root,
				bytes: result?.bytes ?? 0,
				files: result?.files ?? 0,
				partial: Boolean(result?.partial),
				durationMs: Date.now() - started,
				scannedAt: new Date().toISOString(),
				error: result?.error ?? null,
			});
		};

		worker.on("message", finish);
		worker.on("error", (err) => finish({ error: err.message }));
		worker.on("exit", () => finish({ error: "Scan ended unexpectedly." }));
	});
}

function readVolumes(roots) {
	const seen = new Map();
	for (const root of roots) {
		const drive = path.parse(root).root;
		if (!drive || seen.has(drive)) continue;
		try {
			const stats = fs.statfsSync(drive);
			seen.set(drive, {
				root: drive,
				freeBytes: stats.bavail * stats.bsize,
				totalBytes: stats.blocks * stats.bsize,
			});
		} catch {
			// Drive not ready (removable media, disconnected share).
		}
	}
	return [...seen.values()];
}

export async function initStorage() {
	const stored = await readJson(CACHE_PATH, null);
	if (stored) cache = { ...cache, ...stored, status: "idle" };
	return getStorage();
}

export function getStorage() {
	const { storage } = getConfig();
	const scannedAt = cache.scannedAt ? Date.parse(cache.scannedAt) : 0;
	const stale = !scannedAt || Date.now() - scannedAt > storage.scanIntervalMs * 1.5;

	return {
		...cache,
		volumes: readVolumes(storageRoots()),
		quotaBytes: storage.quotaBytes,
		enforce: storage.enforce,
		usedRatio:
			storage.quotaBytes > 0 ? cache.totals.bytes / storage.quotaBytes : null,
		stale,
	};
}

/** Walks every root. Concurrency-capped so it doesn't thrash the disk. */
export async function rescan() {
	if (scanning) return getStorage();
	scanning = true;
	cache.status = "scanning";

	try {
		const roots = storageRoots();
		const { storage } = getConfig();
		const limit = Math.max(1, storage.scanConcurrency);
		const results = [];

		for (let i = 0; i < roots.length; i += limit) {
			const batch = roots.slice(i, i + limit);
			results.push(...(await Promise.all(batch.map(measureRoot))));
		}

		cache = {
			...cache,
			roots: results,
			totals: {
				bytes: results.reduce((sum, r) => sum + r.bytes, 0),
				files: results.reduce((sum, r) => sum + r.files, 0),
			},
			scannedAt: new Date().toISOString(),
			status: "idle",
			error: null,
		};
		await writeJsonAtomic(CACHE_PATH, cache);
	} catch (err) {
		cache.status = "error";
		cache.error = err.message;
	} finally {
		scanning = false;
	}

	return getStorage();
}

/**
 * Called before installing something. Two separate checks:
 *
 * - Free disk space is verified regardless of the quota setting, because
 *   filling the drive corrupts servers that are currently running. That's
 *   correctness, not policy.
 * - The quota itself only blocks in "block" mode, and only for installs.
 *   It deliberately never blocks starting a server — refusing to bring a
 *   community's server back up because a log grew is not a reasonable thing
 *   for a panel to do — and it fails open on stale or partial data, since a
 *   quota enforced on numbers we don't trust is worse than none.
 */
export function assertStorageHeadroom(estimatedBytes = 0) {
	const state = getStorage();

    const volume = state.volumes[0];
	if (volume && estimatedBytes > 0 && volume.freeBytes < estimatedBytes * 1.2) {
		const err = new Error(
			`Not enough free disk space: about ${formatBytes(estimatedBytes)} needed, ` +
				`${formatBytes(volume.freeBytes)} free.`,
		);
		err.code = "disk_full";
		throw err;
	}

	if (state.enforce !== "block" || !state.quotaBytes) return;
	if (state.stale || state.roots.some((r) => r.partial)) return;

	if (state.totals.bytes + estimatedBytes > state.quotaBytes) {
		const err = new Error(
			`This would exceed your storage limit of ${formatBytes(state.quotaBytes)} ` +
				`(currently using ${formatBytes(state.totals.bytes)}).`,
		);
		err.code = "storage_quota_exceeded";
		throw err;
	}
}

export function formatBytes(bytes) {
	if (!bytes) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

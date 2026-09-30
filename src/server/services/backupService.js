import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getConfig } from "../config/configStore.js";
import { getOptions } from "../data/serverOptions.js";
import { BACKUP_TEMPLATES } from "../data/backupTemplates.js";
import { templateOfServer } from "./serverCreationService.js";
import { getSaveCommand } from "./gameCommands.js";
import { isServerRunning, isFullyStopped } from "./serverState.js";
import { stopAndWait, waitUntilOnline } from "./serverLifecycle.js";
import { startServer, sendRconCommand } from "./serverControl.js";
import { logActivity } from "./activityLog.js";
import { protectedReason } from "./serverRemoval.js";
import { broadcastSseEvent } from "./sseHub.js";
import { createZip, listZip, extractZip, unsafeEntries } from "../util/tarZip.js";
import { sleep } from "../util/async.js";

// Backups of a server's saves and settings, as one zip each with a small JSON
// record beside it. The panel decides what to copy (the game's known save
// folders, or the ones the owner chose), makes sure there is room, stops the
// server for the copy when the game can't be saved on command, checks the archive
// reads back, and applies the retention rules. Restoring reverses it, after taking
// a safety backup of whatever it is about to replace.

const GIB = 1024 ** 3;
const MANIFEST_NAME = "gp-backup.json";
const SAFE_ID = /^[A-Za-z0-9._-]+$/;
const SAFETY_KINDS = ["pre-restore", "pre-update"];
const SAFETY_KEEP = 3;

// Things that want to know about each finished backup (copying it off the machine) register
// here, so this file doesn't have to know about them.
const backupHooks = [];
export const onBackupFinished = (fn) => backupHooks.push(fn);

export class BackupError extends Error {
	constructor(message, code, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
}

// ---- where things are -------------------------------------------------------

export const backupRoot = () => getConfig().backups.dir;

const slug = (name) => String(name).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "server";

/** One folder per server. The hash keeps "A B" and "A-B" from sharing one. */
export function serverBackupDir(server) {
	const hash = crypto.createHash("sha1").update(server.name).digest("hex").slice(0, 6);
	return path.join(backupRoot(), `${slug(server.name)}-${hash}`);
}

const expandEnv = (text) => text.replace(/%([^%]+)%/g, (whole, key) => process.env[key] ?? whole);

const exists = async (p) => {
	try {
		return await fs.stat(p);
	} catch {
		return null;
	}
};

// ---- what to back up --------------------------------------------------------

/** The value a start script gives a flag (`-savedir "x"`, `-UserDataFolder=x`, `"-UserDataFolder=x"`), or null. */
export function flagValue(text, flag) {
	const name = flag.replace(/=$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const quotedWhole = new RegExp(`"${name}=([^"]*)"`, "i").exec(text);
	if (quotedWhole) return quotedWhole[1];
	const m = new RegExp(`(?:^|\\s)${name}(?:=|\\s+)(?:"([^"]*)"|(\\S+))`, "i").exec(text);
	return m ? (m[1] ?? m[2]) : null;
}

const baseFor = (server, base) => (base === "install" ? server.installDir : server.workingDir || server.installDir);

/**
 * The folders and files that make up a server's backup.
 * @returns {Promise<{ source: "custom"|"default"|"none", specs: object[] }>}
 */
export async function backupSpecsFor(server) {
	const options = getOptions(server.name).backup;
	let raw = [];
	let source = "none";

	if (Array.isArray(options.paths)) {
		source = "custom";
		raw = options.paths.map((p) => ({ path: p.path, label: p.label || path.basename(p.path), exclude: p.exclude ?? [] }));
	} else {
		const template = BACKUP_TEMPLATES[templateOfServer(server)?.id];
		if (template && template.paths.length > 0) {
			source = "default";
			const script = server.startScriptPath ? await fs.readFile(server.startScriptPath, "utf8").catch(() => "") : "";
			for (const p of template.paths) {
				if (p.base === "flag") {
					const working = server.workingDir || server.installDir || "";
					const value = flagValue(script, p.flag);
					if (value) {
						const dir = path.resolve(working, value.replaceAll("%~dp0", `${working}\\`));
						raw.push({ path: p.join ? path.join(dir, p.join) : dir, label: p.label, exclude: p.exclude ?? [] });
					} else {
						raw.push({ path: path.resolve(expandEnv(p.fallback)), label: p.label, exclude: p.exclude ?? [], shared: true });
					}
					continue;
				}
				const root = p.base === "abs" ? null : baseFor(server, p.base);
				if (p.base !== "abs" && !root) continue;
				raw.push({
					path: p.base === "abs" ? path.resolve(expandEnv(p.rel)) : path.resolve(root, p.rel),
					label: p.label,
					exclude: p.exclude ?? [],
				});
			}
		}
	}

	const specs = [];
	for (const spec of raw) {
		const stat = await exists(spec.path);
		specs.push({ ...spec, exists: Boolean(stat), isDirectory: Boolean(stat?.isDirectory()), leaf: path.basename(spec.path) });
	}
	return { source, specs };
}

/** Throws on a list of folders that can't be backed up or restored safely. */
export function validateBackupPaths(list) {
	if (!Array.isArray(list)) throw new BackupError("The backup folders must be a list.", "bad_paths");
	if (list.length > 30) throw new BackupError("That's a lot of folders. Keep it to 30 or fewer.", "bad_paths");
	const seen = new Map();
	const clean = [];
	for (const item of list) {
		const raw = typeof item === "string" ? item : item?.path;
		if (typeof raw !== "string" || raw.trim() === "") throw new BackupError("Every entry needs a path.", "bad_paths");
		const expanded = expandEnv(raw.trim());
		if (!path.win32.isAbsolute(expanded)) throw new BackupError(`"${raw}" isn't a full path (like D:\\Servers\\World).`, "bad_paths");
		const full = path.resolve(expanded);
		const reason = protectedReason(full);
		if (reason) throw new BackupError(`"${raw}" can't be a backup folder. ${reason}`, "bad_paths");
		const leaf = path.basename(full);
		if (seen.has(leaf.toLowerCase())) {
			throw new BackupError(`Two of these are both called "${leaf}" (${seen.get(leaf.toLowerCase())} and ${full}). Each needs a different last folder name.`, "bad_paths");
		}
		seen.set(leaf.toLowerCase(), full);
		const label = String(item?.label ?? "").trim().slice(0, 60);
		clean.push({ path: full, ...(label ? { label } : {}) });
	}
	return clean;
}

async function sizeOf(spec) {
	const skip = new Set((spec.exclude ?? []).map((e) => e.toLowerCase()));
	let total = 0;
	async function walk(dir) {
		let entries;
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (skip.has(entry.name.toLowerCase())) continue;
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) await walk(full);
			else if (entry.isFile()) total += (await fs.stat(full).catch(() => ({ size: 0 }))).size;
		}
	}
	const stat = await exists(spec.path);
	if (!stat) return 0;
	if (stat.isFile()) return stat.size;
	await walk(spec.path);
	return total;
}

async function freeBytes(dir) {
	await fs.mkdir(dir, { recursive: true });
	const info = await fs.statfs(dir);
	return Number(info.bavail) * Number(info.bsize);
}

// ---- backups on disk --------------------------------------------------------

const stamp = (d = new Date()) => {
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

function progress(server, phase, detail = null) {
	broadcastSseEvent(
		{ type: "backup_progress", serverName: server.name, phase, detail },
		(client) => client.role === "admin" || client.role === "moderator",
	);
}

export async function listBackups(server) {
	const dir = serverBackupDir(server);
	let names;
	try {
		names = await fs.readdir(dir);
	} catch {
		return [];
	}
	const out = [];
	for (const name of names) {
		if (!name.endsWith(".zip")) continue;
		const id = name.slice(0, -4);
		const zipStat = await exists(path.join(dir, name));
		if (!zipStat) continue;
		let manifest = null;
		try {
			manifest = JSON.parse(await fs.readFile(path.join(dir, `${id}.json`), "utf8"));
		} catch {
			// No record: still listed, so it can be seen and deleted.
		}
		out.push({
			id,
			kind: manifest?.kind ?? "unknown",
			reason: manifest?.reason ?? null,
			createdAt: manifest?.createdAt ?? zipStat.mtime.toISOString(),
			sizeBytes: zipStat.size,
			sourceBytes: manifest?.sourceBytes ?? null,
			mode: manifest?.mode ?? null,
			consistent: manifest?.consistent ?? null,
			serverWasRunning: manifest?.serverWasRunning ?? null,
			entries: manifest?.entries?.map((e) => ({ label: e.label, path: e.path })) ?? [],
			hasRecord: Boolean(manifest),
		});
	}
	return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function backupFile(server, id) {
	if (!SAFE_ID.test(id ?? "")) throw new BackupError("That isn't a valid backup id.", "bad_id");
	return path.join(serverBackupDir(server), `${id}.zip`);
}

export async function deleteBackup(server, id) {
	const file = backupFile(server, id);
	if (!(await exists(file))) throw new BackupError("That backup doesn't exist.", "not_found", 404);
	await fs.rm(file, { force: true });
	await fs.rm(file.replace(/\.zip$/, ".json"), { force: true });
	logActivity({ type: "backup.deleted", server: server.name, message: `Deleted backup ${id}.` });
}

/** Scheduled backups are trimmed to the keep rules; safety backups to the last few; manual ones never. */
export async function applyRetention(server) {
	const config = getConfig().backups;
	const options = getOptions(server.name).backup;
	const keepCount = options.keepCount ?? config.keepCount;
	const keepDays = options.keepDays ?? config.keepDays;
	const all = await listBackups(server);
	const doomed = new Set();

	const scheduled = all.filter((b) => b.kind === "scheduled");
	scheduled.slice(keepCount).forEach((b) => doomed.add(b.id));
	if (keepDays > 0) {
		const cutoff = Date.now() - keepDays * 86_400_000;
		scheduled.filter((b) => Date.parse(b.createdAt) < cutoff).forEach((b) => doomed.add(b.id));
	}
	for (const kind of SAFETY_KINDS) {
		all.filter((b) => b.kind === kind).slice(SAFETY_KEEP).forEach((b) => doomed.add(b.id));
	}

	for (const id of doomed) {
		await fs.rm(backupFile(server, id), { force: true }).catch(() => {});
		await fs.rm(backupFile(server, id).replace(/\.zip$/, ".json"), { force: true }).catch(() => {});
	}
	return [...doomed];
}

// ---- making a backup --------------------------------------------------------

/**
 * How the server is treated during a backup.
 *   "stop"  it is stopped for the copy, then started again
 *   "live"  it keeps running; if the game can save on command, that is sent first
 */
export function resolveMode(server, requested) {
	const wanted = requested ?? getOptions(server.name).backup.mode ?? "auto";
	if (wanted === "stop" || wanted === "live") return wanted;
	return getSaveCommand(server) && server.rconPort && server.rconPassword ? "live" : "stop";
}

/**
 * Take a backup. The caller holds the server's lock (see serverOps).
 * @param {object} server
 * @param {object} [options]
 * @param {"manual"|"scheduled"|"pre-restore"|"pre-update"} [options.kind]
 * @param {string|null} [options.reason]
 * @param {"stop"|"live"|null} [options.mode]
 * @param {() => void} [options.onReady]  called once the checks have passed and the real work begins
 */
export async function createBackup(server, { kind = "manual", reason = null, mode = null, onReady = null } = {}) {
	const startedAt = Date.now();
	const { specs } = await backupSpecsFor(server);
	if (specs.length === 0) {
		throw new BackupError("No folders are set up to back up for this server. Choose them in the server's backup settings.", "no_paths");
	}
	const present = specs.filter((s) => s.exists);
	if (present.length === 0) {
		throw new BackupError("None of this server's save folders exist yet, so there is nothing to back up. Start the server once so it creates them.", "nothing_to_back_up");
	}
	const leaves = new Set();
	for (const spec of present) {
		if (leaves.has(spec.leaf.toLowerCase())) {
			throw new BackupError(`Two folders are both called "${spec.leaf}", which one archive can't hold. Give them different last folder names.`, "duplicate_names");
		}
		leaves.add(spec.leaf.toLowerCase());
	}

	const dir = serverBackupDir(server);
	await fs.mkdir(dir, { recursive: true });

	// Room first: a backup that fills the drive is worse than none.
	progress(server, "checking");
	let sourceBytes = 0;
	for (const spec of present) sourceBytes += await sizeOf(spec);
	const minFree = getConfig().backups.minFreeGB * GIB;
	const free = await freeBytes(dir);
	if (free - sourceBytes * 1.05 < minFree) {
		throw new BackupError(
			`Not enough room on the backup drive: ${(free / GIB).toFixed(1)} GB free, this backup needs up to ${(sourceBytes / GIB).toFixed(1)} GB and ${getConfig().backups.minFreeGB} GB must stay free. Free some space or change the backup folder in Settings.`,
			"low_space",
			507,
		);
	}

	onReady?.();
	const wasRunning = await isServerRunning(server);
	const chosenMode = resolveMode(server, mode);
	let stoppedByUs = false;
	let consistent = true;

	const id = `${slug(server.name)}_${stamp()}_${kind}`;
	const zipPath = path.join(dir, `${id}.zip`);
	const partial = `${zipPath}.partial`;

	try {
		if (wasRunning && chosenMode === "stop") {
			progress(server, "stopping");
			await stopAndWait(server);
			stoppedByUs = true;
		} else if (wasRunning) {
			const save = getSaveCommand(server);
			if (save && server.rconPort && server.rconPassword) {
				progress(server, "saving");
				try {
					await sendRconCommand(server, save);
					await sleep(5000);
				} catch (err) {
					consistent = false;
					console.warn(`[backup] Save command failed for ${server.name}: ${err.message}`);
				}
			} else {
				// Copying a world while the game writes to it can catch it half-written.
				consistent = false;
			}
		}

		progress(server, "copying");
		const manifest = {
			format: 1,
			id,
			server: server.name,
			kind,
			reason,
			createdAt: new Date().toISOString(),
			mode: wasRunning ? chosenMode : "offline",
			serverWasRunning: wasRunning,
			consistent,
			sourceBytes,
			entries: present.map((s) => ({ name: s.leaf, path: s.path, label: s.label, type: s.isDirectory ? "dir" : "file", exclude: s.exclude })),
		};

		const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "gp-backup-"));
		try {
			await fs.writeFile(path.join(scratch, MANIFEST_NAME), JSON.stringify(manifest, null, 2));
			const exclude = present.flatMap((s) => s.exclude.map((e) => `${s.leaf}/${e}`));
			await createZip(partial, [{ dir: scratch, name: MANIFEST_NAME }, ...present.map((s) => ({ dir: path.dirname(s.path), name: s.leaf }))], exclude);
		} finally {
			await fs.rm(scratch, { recursive: true, force: true }).catch(() => {});
		}

		// A zip that can't be read back is not a backup.
		progress(server, "verifying");
		const names = await listZip(partial);
		if (!names.includes(MANIFEST_NAME) || names.length < 2) {
			throw new BackupError("The backup was written but couldn't be read back, so it was discarded.", "verify_failed", 500);
		}
		await fs.rename(partial, zipPath);
		const sizeBytes = (await fs.stat(zipPath)).size;
		const record = { ...manifest, sizeBytes, durationMs: Date.now() - startedAt };
		await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(record, null, 2));

		await applyRetention(server);
		logActivity({
			type: "backup.completed",
			server: server.name,
			message: `Backup of ${server.name} finished (${(sizeBytes / 1024 ** 2).toFixed(1)} MB, ${kind}${consistent ? "" : ", copied while running"}).`,
			data: { id, kind, sizeBytes },
		});
		// Copying elsewhere carries on in the background; it never holds up or fails the backup.
		for (const hook of backupHooks) Promise.resolve(hook(server, id)).catch((err) => console.warn(`[backup] After-backup step failed: ${err.message}`));
		return { ...record, hasRecord: true };
	} catch (err) {
		await fs.rm(partial, { force: true }).catch(() => {});
		logActivity({ type: "backup.failed", server: server.name, level: "error", message: `Backup of ${server.name} failed: ${err.message}`, data: { kind } });
		throw err;
	} finally {
		if (stoppedByUs) {
			progress(server, "starting");
			try {
				await startServer(server);
				await waitUntilOnline(server);
			} catch (err) {
				logActivity({ type: "server.start_failed", server: server.name, level: "error", message: `${server.name} was stopped for its backup and could not be started again: ${err.message}` });
			}
		}
		progress(server, "done");
	}
}

// ---- restoring --------------------------------------------------------------

async function readManifest(zipFile) {
	const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "gp-restore-read-"));
	try {
		await extractZip(zipFile, scratch, [MANIFEST_NAME]);
		return JSON.parse(await fs.readFile(path.join(scratch, MANIFEST_NAME), "utf8"));
	} catch {
		throw new BackupError("That backup has no readable record of what it holds, so it can't be restored safely.", "no_manifest");
	} finally {
		await fs.rm(scratch, { recursive: true, force: true }).catch(() => {});
	}
}

/**
 * Put a backup back. The caller holds the server's lock. The server must be
 * stopped; whatever is about to be replaced is backed up first (unless `safety`
 * is false), and if replacing any part fails, the parts already done are put back.
 */
export async function restoreBackup(server, id, { safety = true, onReady = null, allowShared = false } = {}) {
	const zipFile = backupFile(server, id);
	if (!(await exists(zipFile))) throw new BackupError("That backup doesn't exist.", "not_found", 404);
	if (!(await isFullyStopped(server))) {
		throw new BackupError("Stop the server first. Restoring replaces files the game is using.", "server_running", 409);
	}

	progress(server, "checking");
	let names;
	try {
		names = await listZip(zipFile);
	} catch (err) {
		throw new BackupError(`That backup can't be read (${err.message}), so nothing was changed. It may be damaged.`, "unreadable");
	}
	const unsafe = unsafeEntries(names);
	if (unsafe.length > 0) throw new BackupError(`That archive contains paths outside its folders (${unsafe[0]}), so it won't be restored.`, "unsafe_archive");
	const manifest = await readManifest(zipFile);

	// The backup can only go back where this server's folders are now.
	const { specs } = await backupSpecsFor(server);
	const norm = (p) => path.resolve(p).toLowerCase();
	const targets = [];
	for (const entry of manifest.entries ?? []) {
		if (!names.some((n) => n === entry.name || n.startsWith(`${entry.name}/`))) continue;
		const match = specs.find((s) => norm(s.path) === norm(entry.path));
		if (match?.shared && !allowShared) {
			throw new BackupError(
				`${match.path} is a folder every such server on this PC shares, and it may hold other servers' worlds, so the restore would replace theirs as well. If you are sure, restore with the go-ahead for shared folders.`,
				"shared_folder",
				409,
			);
		}
		if (!match) {
			throw new BackupError(
				`This backup holds ${entry.path}, which is no longer one of this server's backup folders, so it won't be restored over anything. Add that folder back in the backup settings, or restore it by hand.`,
				"paths_changed",
			);
		}
		const reason = protectedReason(match.path);
		if (reason) throw new BackupError(`${match.path} can't be replaced. ${reason}`, "protected");
		targets.push({ entry, target: match.path });
	}
	if (targets.length === 0) throw new BackupError("That backup holds nothing that can be restored to this server.", "nothing_to_restore");

	const needed = (manifest.sourceBytes ?? 0) * 1.1;
	const free = await freeBytes(path.dirname(targets[0].target));
	if (free < needed) throw new BackupError(`Not enough free space to restore: about ${(needed / GIB).toFixed(1)} GB needed.`, "low_space", 507);

	onReady?.();
	let safetyId = null;
	if (safety) {
		progress(server, "safety-backup");
		try {
			safetyId = (await createBackup(server, { kind: "pre-restore", reason: `Before restoring ${id}`, mode: "live" })).id;
		} catch (err) {
			if (!["nothing_to_back_up", "no_paths"].includes(err.code)) {
				throw new BackupError(`Couldn't take the safety backup first (${err.message}), so nothing was changed.`, "safety_failed", 500);
			}
		}
	}

	progress(server, "restoring");
	const done = [];
	const cleanup = [];
	const at = Date.now();
	try {
		for (const { entry, target } of targets) {
			const parent = path.dirname(target);
			await fs.mkdir(parent, { recursive: true });
			const staging = path.join(parent, `.gp-restore-${at}`);
			await fs.mkdir(staging, { recursive: true });
			cleanup.push(staging);
			await extractZip(zipFile, staging, [entry.name]);
			const staged = path.join(staging, entry.name);
			if (!(await exists(staged))) throw new Error(`${entry.name} was not found in the archive.`);

			const old = path.join(parent, `.gp-old-${at}-${entry.name}`);
			const hadOld = Boolean(await exists(target));
			if (hadOld) await fs.rename(target, old);
			try {
				await fs.rename(staged, target);
			} catch (err) {
				if (hadOld) await fs.rename(old, target).catch(() => {});
				throw err;
			}
			done.push({ target, old: hadOld ? old : null });
			if (hadOld) cleanup.push(old);
		}
	} catch (err) {
		// Put back whatever was already replaced.
		for (const { target, old } of done.reverse()) {
			await fs.rm(target, { recursive: true, force: true }).catch(() => {});
			if (old) await fs.rename(old, target).catch(() => {});
		}
		for (const p of cleanup) await fs.rm(p, { recursive: true, force: true }).catch(() => {});
		logActivity({ type: "backup.restore_failed", server: server.name, level: "error", message: `Restoring ${id} to ${server.name} failed: ${err.message}` });
		throw new BackupError(`Restore failed and was rolled back: ${err.message}. Something may still be using those files.`, "restore_failed", 500);
	}
	for (const p of cleanup) await fs.rm(p, { recursive: true, force: true }).catch(() => {});

	logActivity({
		type: "backup.restored",
		server: server.name,
		message: `Restored ${server.name} from backup ${id}.`,
		data: { id, safetyBackup: safetyId },
	});
	progress(server, "done");
	return { restored: targets.map((t) => t.target), safetyBackup: safetyId };
}

// ---- overview ---------------------------------------------------------------

export async function backupOverview(server) {
	const { source, specs } = await backupSpecsFor(server);
	const options = getOptions(server.name).backup;
	const backups = await listBackups(server);
	const dir = serverBackupDir(server);
	let free = null;
	try {
		free = await freeBytes(dir);
	} catch {
		// The folder can't be created (bad drive); the UI shows the specs anyway.
	}
	return {
		directory: dir,
		freeBytes: free,
		source,
		specs: specs.map((s) => ({ path: s.path, label: s.label, exists: s.exists, exclude: s.exclude, shared: Boolean(s.shared) })),
		needsSetup: specs.length === 0,
		mode: options.mode ?? "auto",
		effectiveMode: resolveMode(server, null),
		keepCount: options.keepCount,
		keepDays: options.keepDays,
		canSaveOnCommand: Boolean(getSaveCommand(server) && server.rconPort && server.rconPassword),
		totalBytes: backups.reduce((sum, b) => sum + b.sizeBytes, 0),
		backups,
	};
}

/** Remove half-written archives left by a crash mid-backup. */
export async function sweepPartialBackups() {
	let roots;
	try {
		roots = await fs.readdir(backupRoot());
	} catch {
		return;
	}
	for (const name of roots) {
		const dir = path.join(backupRoot(), name);
		const files = await fs.readdir(dir).catch(() => []);
		for (const f of files) {
			if (!f.endsWith(".partial")) continue;
			const stat = await exists(path.join(dir, f));
			if (stat && Date.now() - stat.mtimeMs > 3_600_000) await fs.rm(path.join(dir, f), { force: true }).catch(() => {});
		}
	}
}

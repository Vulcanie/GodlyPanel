import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { paths } from "../paths.js";
import { getConfig } from "../config/configStore.js";
import { getSecrets, patchSecrets } from "../config/secretsStore.js";
import { readJson, writeJsonAtomic, createWriteQueue } from "../util/atomicJson.js";
import { createS3Client } from "./s3Client.js";
import { serverBackupDir, listBackups, BackupError } from "./backupService.js";
import { logActivity } from "./activityLog.js";
import { all as allServers } from "../data/serverStore.js";

// Copies of backups kept somewhere other than this PC's backup folder: another drive, a
// network share (UNC path), a cloud-sync folder (OneDrive, Dropbox, Google Drive, Syncthing
// all sync an ordinary folder), or S3-compatible storage (Backblaze B2, Wasabi, MinIO,
// Cloudflare R2, Amazon S3). A backup that only exists on the machine that broke is not
// much of a backup.
//
// Every finished backup is copied to each enabled destination in the background. The
// backup itself never fails because a copy did: the result per backup and destination is
// recorded, shown in the interface, and retried until it lands. Each destination has its own
// keep rules, and keeping an old copy there never depends on the local folder still having it.

const DESTINATIONS_FILE = path.join(paths.dataDir, "state", "backup-destinations.json");
const STATUS_FILE = path.join(paths.dataDir, "state", "replication.json");
const enqueue = createWriteQueue();
const SAFE_ID = /^[A-Za-z0-9._-]+$/;
const TYPES = ["folder", "s3"];
const MAX_ATTEMPTS_PER_SWEEP = 1;

let destinations = null;
let statuses = null;

// ---- storing the list ---------------------------------------------------------

async function load() {
	if (destinations) return;
	destinations = (await readJson(DESTINATIONS_FILE, { destinations: [] })).destinations ?? [];
	statuses = await readJson(STATUS_FILE, {});
}

const saveList = () => writeJsonAtomic(DESTINATIONS_FILE, { destinations });
const saveStatuses = () => writeJsonAtomic(STATUS_FILE, statuses);

/** What the interface and API may see: everything but the secret itself. */
function publicView(d) {
	const secrets = getSecrets().destinationKeys ?? {};
	return { ...d, s3: d.s3 ? { ...d.s3, hasSecret: Boolean(secrets[d.id]) } : undefined };
}

export async function listDestinations() {
	await load();
	return destinations.map(publicView);
}

function clean(input, existing = null) {
	const type = input.type ?? existing?.type;
	if (!TYPES.includes(type)) throw new BackupError('type must be "folder" or "s3".', "bad_type");
	const name = String(input.name ?? existing?.name ?? "").trim().slice(0, 60);
	if (!name) throw new BackupError("Give the destination a name.", "bad_name");
	const out = {
		id: existing?.id ?? `dest-${crypto.randomBytes(4).toString("hex")}`,
		name,
		type,
		enabled: input.enabled ?? existing?.enabled ?? true,
		// null = follow the panel-wide keep rules
		keepCount: input.keepCount === undefined ? (existing?.keepCount ?? null) : input.keepCount,
		keepDays: input.keepDays === undefined ? (existing?.keepDays ?? null) : input.keepDays,
		// Only backups made after this are copied automatically (0 = every existing one too).
		since: existing?.since ?? (input.includeExisting ? 0 : Date.now()),
		createdAt: existing?.createdAt ?? new Date().toISOString(),
	};
	for (const k of ["keepCount", "keepDays"]) {
		if (out[k] !== null && (!Number.isInteger(out[k]) || out[k] < 0 || out[k] > 3650)) throw new BackupError(`${k} must be a whole number or blank.`, "bad_number");
	}
	if (type === "folder") {
		const p = String(input.folder?.path ?? existing?.folder?.path ?? "").trim();
		if (!p) throw new BackupError("Choose the folder to copy backups into.", "bad_path");
		if (!path.isAbsolute(p)) throw new BackupError("Use a full folder path, such as D:\\Backups or \\\\nas\\share\\backups.", "bad_path");
		const local = path.resolve(getConfig().backups.dir).toLowerCase();
		const target = path.resolve(p).toLowerCase();
		if (target === local || target.startsWith(`${local}${path.sep}`) || local.startsWith(`${target}${path.sep}`)) {
			throw new BackupError("That folder is inside (or contains) the local backup folder, so it wouldn't be a separate copy.", "same_place");
		}
		out.folder = { path: p };
	} else {
		const s3 = { ...(existing?.s3 ?? {}), ...(input.s3 ?? {}) };
		delete s3.hasSecret;
		let endpoint = String(s3.endpoint ?? "").trim().replace(/\/+$/, "");
		if (!/^https?:\/\//i.test(endpoint)) throw new BackupError("The endpoint must start with https:// (or http:// for a server on your own network).", "bad_endpoint");
		try {
			new URL(endpoint);
		} catch {
			throw new BackupError("That endpoint isn't a valid address.", "bad_endpoint");
		}
		if (!String(s3.bucket ?? "").trim()) throw new BackupError("Enter the bucket name.", "bad_bucket");
		if (!String(s3.accessKeyId ?? "").trim()) throw new BackupError("Enter the access key ID.", "bad_key");
		out.s3 = {
			endpoint,
			region: String(s3.region ?? "").trim() || "us-east-1",
			bucket: String(s3.bucket).trim(),
			prefix: String(s3.prefix ?? "").trim().replace(/^\/+|\/+$/g, ""),
			pathStyle: s3.pathStyle !== false,
			accessKeyId: String(s3.accessKeyId).trim(),
		};
	}
	return out;
}

export async function saveDestination(input, id = null) {
	await load();
	return enqueue(async () => {
		const existing = id ? destinations.find((d) => d.id === id) : null;
		if (id && !existing) throw new BackupError("That destination doesn't exist.", "not_found", 404);
		const next = clean(input, existing);
		const secret = input.s3?.secretAccessKey;
		if (next.type === "s3" && !existing && !secret) throw new BackupError("Enter the secret access key.", "bad_key");
		if (destinations.some((d) => d.id !== next.id && d.name.toLowerCase() === next.name.toLowerCase())) {
			throw new BackupError("Another destination already has that name.", "name_taken");
		}
		if (secret) {
			await patchSecrets({ destinationKeys: { ...(getSecrets().destinationKeys ?? {}), [next.id]: String(secret) } });
		}
		destinations = existing ? destinations.map((d) => (d.id === next.id ? next : d)) : [...destinations, next];
		await saveList();
		return publicView(next);
	});
}

export async function removeDestination(id) {
	await load();
	return enqueue(async () => {
		if (!destinations.some((d) => d.id === id)) throw new BackupError("That destination doesn't exist.", "not_found", 404);
		destinations = destinations.filter((d) => d.id !== id);
		delete statuses[id];
		const keys = { ...(getSecrets().destinationKeys ?? {}) };
		delete keys[id];
		await patchSecrets({ destinationKeys: keys });
		await saveList();
		await saveStatuses();
		// Copies already made there are left alone: removing the destination stops copying, it doesn't delete backups.
	});
}

// ---- the two kinds of place ---------------------------------------------------

/**
 * A place that holds backups as `<server folder>/<id>.zip` plus `<id>.json`.
 * put/get move a file; list returns [{ name, size, modified }] for one server folder.
 */
function adapterFor(d, secretOverride = null) {
	if (d.type === "folder") {
		const root = d.folder.path;
		return {
			describe: root,
			async test() {
				await fs.mkdir(root, { recursive: true }).catch((err) => {
					throw new BackupError(`Couldn't open or create ${root}: ${err.code ?? err.message}. For a network share, check it is reachable and that this PC is signed in to it.`, "unreachable", 502);
				});
				const probe = path.join(root, `.godlypanel-test-${crypto.randomBytes(3).toString("hex")}`);
				try {
					await fs.writeFile(probe, "ok");
					await fs.rm(probe, { force: true });
				} catch (err) {
					throw new BackupError(`Can't write to ${root}: ${err.code ?? err.message}.`, "not_writable", 502);
				}
				const stat = await fs.statfs(root).catch(() => null);
				return stat ? { freeBytes: stat.bavail * stat.bsize } : {};
			},
			async put(file, dir, name) {
				const folder = path.join(root, dir);
				await fs.mkdir(folder, { recursive: true });
				const final = path.join(folder, name);
				const partial = `${final}.partial`;
				await fs.copyFile(file, partial);
				await fs.rename(partial, final);
				return (await fs.stat(final)).size;
			},
			async get(dir, name, dest) {
				await fs.copyFile(path.join(root, dir, name), dest);
			},
			async list(dir) {
				const folder = path.join(root, dir);
				const names = await fs.readdir(folder).catch(() => []);
				const out = [];
				for (const name of names) {
					if (name.endsWith(".partial")) continue;
					const stat = await fs.stat(path.join(folder, name)).catch(() => null);
					if (stat?.isFile()) out.push({ name, size: stat.size, modified: stat.mtime.toISOString() });
				}
				return out;
			},
			async remove(dir, name) {
				await fs.rm(path.join(root, dir, name), { force: true });
			},
		};
	}

	const secret = secretOverride || (getSecrets().destinationKeys ?? {})[d.id];
	const client = createS3Client({ ...d.s3, secretAccessKey: secret ?? "" });
	const key = (dir, name) => [d.s3.prefix, dir, name].filter(Boolean).join("/");
	return {
		describe: `${d.s3.bucket} at ${new URL(d.s3.endpoint).host}`,
		async test() {
			if (!secret) throw new BackupError("The secret access key isn't saved. Enter it again.", "bad_key");
			await client.test();
			return {};
		},
		async put(file, dir, name) {
			const result = await client.putFile(key(dir, name), file);
			return result.size;
		},
		async get(dir, name, dest) {
			await client.getFile(key(dir, name), dest);
		},
		async list(dir) {
			const prefix = `${key(dir, "")}/`;
			return (await client.list(prefix)).map((o) => ({ name: o.key.slice(prefix.length), size: o.size, modified: o.modified })).filter((o) => o.name && !o.name.includes("/"));
		},
		async remove(dir, name) {
			await client.remove(key(dir, name));
		},
	};
}

export async function testDestination(idOrInput) {
	await load();
	let d;
	let secretOverride = null;
	if (typeof idOrInput === "string") {
		d = destinations.find((x) => x.id === idOrInput);
		if (!d) throw new BackupError("That destination doesn't exist.", "not_found", 404);
	} else {
		// A draft from the form: checked without being saved. A blank secret reuses the saved one.
		const existing = idOrInput.id ? destinations.find((x) => x.id === idOrInput.id) : null;
		d = clean(idOrInput, existing);
		d.id = existing?.id ?? "draft";
		secretOverride = idOrInput.s3?.secretAccessKey ? String(idOrInput.s3.secretAccessKey) : null;
	}
	const adapter = adapterFor(d, secretOverride);
	const details = await adapter.test().catch((err) => {
		if (err instanceof BackupError) throw err;
		throw new BackupError(err.message, "unreachable", 502);
	});
	return { ok: true, where: adapter.describe, ...details };
}

// ---- copying ------------------------------------------------------------------

const statusKey = (server, id) => `${path.basename(serverBackupDir(server))}/${id}`;

function setStatus(destId, key, patch) {
	statuses[destId] ??= {};
	statuses[destId][key] = { ...(statuses[destId][key] ?? {}), ...patch };
}

/** What has been copied where, for the backup list. */
export async function replicationFor(server) {
	await load();
	const out = {};
	for (const d of destinations) {
		for (const [key, value] of Object.entries(statuses[d.id] ?? {})) {
			if (!key.startsWith(`${path.basename(serverBackupDir(server))}/`)) continue;
			const id = key.slice(key.indexOf("/") + 1);
			(out[id] ??= []).push({ destinationId: d.id, name: d.name, ...value });
		}
	}
	return out;
}

async function copyOne(d, server, backup) {
	const dir = path.basename(serverBackupDir(server));
	const local = serverBackupDir(server);
	const key = statusKey(server, backup.id);
	const adapter = adapterFor(d);
	setStatus(d.id, key, { status: "copying", attempts: (statuses[d.id]?.[key]?.attempts ?? 0) + 1 });
	try {
		const bytes = await adapter.put(path.join(local, `${backup.id}.zip`), dir, `${backup.id}.zip`);
		// The record goes last: a copy with a record is a complete copy.
		const record = path.join(local, `${backup.id}.json`);
		if (await fs.stat(record).catch(() => null)) await adapter.put(record, dir, `${backup.id}.json`);
		setStatus(d.id, key, { status: "ok", at: new Date().toISOString(), bytes, error: null });
		return true;
	} catch (err) {
		setStatus(d.id, key, { status: "failed", at: new Date().toISOString(), error: err.message });
		logActivity({ type: "backup.copy_failed", server: server.name, level: "warn", message: `Couldn't copy backup ${backup.id} of ${server.name} to ${d.name}: ${err.message} It will be tried again.`, data: { id: backup.id, destination: d.name } });
		return false;
	}
}

/** Copies one backup to every enabled destination. Never throws: a failed copy is recorded and retried. */
export async function replicateBackup(server, id) {
	await load();
	const backups = await listBackups(server);
	const backup = backups.find((b) => b.id === id);
	if (!backup) return;
	for (const d of destinations.filter((x) => x.enabled)) {
		if (Date.parse(backup.createdAt) < d.since && statuses[d.id]?.[statusKey(server, id)]?.status !== "failed") continue;
		const done = statuses[d.id]?.[statusKey(server, id)]?.status === "ok";
		if (done) continue;
		const ok = await copyOne(d, server, backup);
		if (ok) {
			logActivity({ type: "backup.copied", server: server.name, message: `Backup ${id} of ${server.name} copied to ${d.name}.`, data: { id, destination: d.name } });
			await trimDestination(d, server).catch((err) => console.warn(`[backup] Trimming ${d.name} failed: ${err.message}`));
		}
	}
	await enqueue(saveStatuses);
}

/** Tries again for anything that failed or was never copied. Safe to call often. */
export async function retryReplication() {
	await load();
	if (!destinations.some((d) => d.enabled)) return { tried: 0, copied: 0 };
	let tried = 0;
	let copied = 0;
	for (const server of allServers()) {
		const backups = await listBackups(server);
		for (const d of destinations.filter((x) => x.enabled)) {
			for (const backup of backups) {
				const current = statuses[d.id]?.[statusKey(server, backup.id)];
				if (current?.status === "ok") continue;
				if (!current && Date.parse(backup.createdAt) < d.since) continue;
				if ((current?.attempts ?? 0) >= 50) continue;
				tried += MAX_ATTEMPTS_PER_SWEEP;
				if (await copyOne(d, server, backup)) copied += 1;
			}
		}
	}
	if (tried) await enqueue(saveStatuses);
	return { tried, copied };
}

/** Copy everything that exists now, including backups older than the destination. */
export async function backfill(destId, server) {
	await load();
	const d = destinations.find((x) => x.id === destId);
	if (!d) throw new BackupError("That destination doesn't exist.", "not_found", 404);
	let copied = 0;
	for (const backup of await listBackups(server)) {
		if (statuses[d.id]?.[statusKey(server, backup.id)]?.status === "ok") continue;
		if (await copyOne(d, server, backup)) copied += 1;
	}
	await enqueue(saveStatuses);
	return { copied };
}

// ---- keeping it tidy ----------------------------------------------------------

const kindOf = (id) => /_(manual|scheduled|pre-restore|pre-update)$/.exec(id)?.[1] ?? "unknown";

/** Keep rules at a destination: scheduled backups by count and age, safety backups to the last few, manual ones always. */
async function trimDestination(d, server) {
	const config = getConfig().backups;
	const keepCount = d.keepCount ?? config.keepCount;
	const keepDays = d.keepDays ?? config.keepDays;
	const adapter = adapterFor(d);
	const dir = path.basename(serverBackupDir(server));
	const zips = (await adapter.list(dir)).filter((o) => o.name.endsWith(".zip")).sort((a, b) => (a.modified < b.modified ? 1 : -1));
	const doomed = new Set();
	const scheduled = zips.filter((o) => kindOf(o.name.slice(0, -4)) === "scheduled");
	scheduled.slice(keepCount).forEach((o) => doomed.add(o.name));
	if (keepDays > 0) scheduled.filter((o) => Date.parse(o.modified) < Date.now() - keepDays * 86_400_000).forEach((o) => doomed.add(o.name));
	for (const kind of ["pre-restore", "pre-update"]) {
		zips.filter((o) => kindOf(o.name.slice(0, -4)) === kind).slice(3).forEach((o) => doomed.add(o.name));
	}
	for (const name of doomed) {
		await adapter.remove(dir, name);
		await adapter.remove(dir, name.replace(/\.zip$/, ".json"));
		if (statuses[d.id]) delete statuses[d.id][`${dir}/${name.slice(0, -4)}`];
	}
	return [...doomed];
}

// ---- looking at and pulling back what's there --------------------------------

export async function listRemote(destId, server) {
	await load();
	const d = destinations.find((x) => x.id === destId);
	if (!d) throw new BackupError("That destination doesn't exist.", "not_found", 404);
	const dir = path.basename(serverBackupDir(server));
	const adapter = adapterFor(d);
	let objects;
	try {
		objects = await adapter.list(dir);
	} catch (err) {
		throw new BackupError(`Couldn't read ${d.name}: ${err.message}`, "unreachable", 502);
	}
	const local = new Set((await listBackups(server)).map((b) => b.id));
	return objects
		.filter((o) => o.name.endsWith(".zip"))
		.map((o) => {
			const id = o.name.slice(0, -4);
			return { id, kind: kindOf(id), sizeBytes: o.size, modified: o.modified, hasRecord: objects.some((x) => x.name === `${id}.json`), local: local.has(id) };
		})
		.sort((a, b) => (a.modified < b.modified ? 1 : -1));
}

/**
 * Bring a copy back into the server's local backup folder, where the normal restore
 * picks it up. This is the route back after losing the drive the local backups were on.
 */
export async function fetchRemote(destId, server, id) {
	await load();
	if (!SAFE_ID.test(id ?? "")) throw new BackupError("That isn't a valid backup id.", "bad_id");
	const d = destinations.find((x) => x.id === destId);
	if (!d) throw new BackupError("That destination doesn't exist.", "not_found", 404);
	const dir = path.basename(serverBackupDir(server));
	const local = serverBackupDir(server);
	await fs.mkdir(local, { recursive: true });
	const zip = path.join(local, `${id}.zip`);
	if (await fs.stat(zip).catch(() => null)) throw new BackupError("That backup is already in the local folder.", "already_local", 409);
	const adapter = adapterFor(d);
	const partial = `${zip}.partial`;
	try {
		await adapter.get(dir, `${id}.zip`, partial);
		await fs.rename(partial, zip);
	} catch (err) {
		await fs.rm(partial, { force: true }).catch(() => {});
		throw new BackupError(`Couldn't download ${id} from ${d.name}: ${err.message}`, "download_failed", 502);
	}
	await adapter.get(dir, `${id}.json`, path.join(local, `${id}.json`)).catch(() => {});
	await load();
	setStatus(d.id, `${dir}/${id}`, { status: "ok", at: new Date().toISOString(), error: null });
	await enqueue(saveStatuses);
	logActivity({ type: "backup.fetched", server: server.name, message: `Brought backup ${id} back from ${d.name}.`, data: { id, destination: d.name } });
	return { id };
}

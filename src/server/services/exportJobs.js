import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { BundleError, exportServer } from "./serverBundle.js";
import { runOperation } from "./serverOps.js";
import { logActivity } from "./activityLog.js";
import { broadcastSseEvent } from "./sseHub.js";

// Exporting a server bundle in the background. The job runs while the page watches it on the live stream; the finished .gpserver
// waits in a temp folder of its own until it is downloaded once. The folder goes after that download, after a failure, or 30
// minutes after the job finished, so a bundle (which holds saves and maybe passwords) is never left lying around.

const MAX_EXPORTING = 2; // across the whole panel, so a few big exports can't fill the disk and the CPU together
const MAX_REMEMBERED = 20;
const EXPIRY_MS = 30 * 60 * 1000;
// What a person sees when the export fails for a reason that isn't ours to show (the real error goes to the panel's log).
const GENERIC_FAILURE = "The export failed. The panel's log has the details.";

const jobs = new Map(); // id -> private job record; Map keeps insertion order, so the first entry is the oldest
let expiryMs = EXPIRY_MS;
let exporter = exportServer;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isExportJobId = (id) => typeof id === "string" && UUID.test(id);

// What the page is allowed to see. The file and its folder are kept out of it on purpose.
const publicJob = (job) => ({
	id: job.id,
	server: job.server,
	include: job.include,
	secrets: job.secrets,
	status: job.status,
	name: job.name,
	bytes: job.bytes,
	error: job.error,
	createdAt: job.createdAt,
	finishedAt: job.finishedAt,
});

// Same shape as the clone progress events: admins only, as the bundle holds everything the server has.
const announce = (job, extra = {}) => broadcastSseEvent({ type: "export_progress", jobId: job.id, ...publicJob(job), ...extra }, (c) => c.role === "admin");

const exportingCount = () => [...jobs.values()].filter((j) => j.status === "exporting").length;

/** Starts an export of a stopped server. Answers with the job once the server's lock is taken; the export itself carries on after. */
export async function startExportJob(server, { include = "saves", secrets = false } = {}) {
	// The same checks exportServer makes, done here so a bad value is refused now rather than as a failed job.
	if (include !== "saves" && include !== "all") throw new BundleError("include must be saves or all.", "bad_input");
	if (typeof secrets !== "boolean") throw new BundleError("secrets must be true or false.", "bad_input");
	if ([...jobs.values()].some((j) => j.status === "exporting" && j.server === server.name)) {
		throw new BundleError(`${server.name} is already being exported.`, "already_exporting", 409);
	}
	if (exportingCount() >= MAX_EXPORTING) {
		throw new BundleError("Two exports are already running. Wait for one to finish.", "too_many_exports", 429);
	}

	const job = {
		id: crypto.randomUUID(),
		server: server.name,
		include,
		secrets,
		status: "exporting",
		name: null,
		bytes: null,
		error: null,
		createdAt: new Date().toISOString(),
		finishedAt: null,
		file: null,
		dir: null,
		taken: false,
		timer: null,
	};

	// runOperation runs its work straight away when the lock is free, and refuses (rejects) when it isn't. The answer waits for
	// that moment, so a busy server is a 409 now and not a job that fails later. The job is registered before the answer.
	await new Promise((resolve, reject) => {
		const held = runOperation(server.name, "exporting a bundle", () => {
			jobs.set(job.id, job);
			trimRemembered();
			resolve();
			return run(job, server);
		});
		held.catch(reject);
	});
	return publicJob(job);
}

export function getExportJob(id) {
	const job = jobs.get(id);
	return job ? publicJob(job) : null;
}

/** The finished file, for one download. Only a ready job that hasn't been taken yet gives one; `done()` must be called after. */
export async function takeExportFile(id) {
	const job = jobs.get(id);
	if (!job || job.status !== "ready" || job.taken) return null;
	job.taken = true;
	return { file: job.file, name: job.name, bytes: job.bytes, done: () => forget(job) };
}

async function run(job, server) {
	let dir = null;
	try {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), "godlypanel-export-job-"));
		job.dir = dir;
		const made = await exporter(server, {
			include: job.include,
			secrets: job.secrets,
			outDir: dir,
			onProgress: ({ phase }) => announce(job, { phase }),
		});
		job.file = made.file;
		job.name = made.name;
		job.bytes = made.bytes;
		finish(job, "ready");
		logActivity({
			type: "server.exported",
			server: server.name,
			message: `${server.name} was exported to a bundle (${job.include}, ${job.secrets ? "with" : "without"} secrets).`,
		});
	} catch (err) {
		if (dir) await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
		job.dir = null;
		// A BundleError carries the user's reason (server running, not enough room). An archive failure's text is a raw system
		// error that names folders, so it is replaced, and the real error is logged instead.
		const shown = err instanceof BundleError && err.code !== "archive_failed";
		if (!shown) console.error(`[export] ${server.name} failed:`, err);
		job.error = shown ? err.message : GENERIC_FAILURE;
		finish(job, "failed");
		logActivity({ type: "server.export_failed", server: server.name, level: "error", message: `Exporting ${server.name} failed: ${job.error}` });
	}
}

function finish(job, status) {
	job.status = status;
	job.finishedAt = new Date().toISOString();
	job.timer = setTimeout(() => expire(job), expiryMs);
	job.timer.unref();
	announce(job);
}

// A file still being sent is left alone; its download's done() removes it.
function expire(job) {
	if (job.taken) return;
	forget(job);
}

/** Removes a job and its folder. Safe to call twice. */
async function forget(job) {
	clearTimeout(job.timer);
	jobs.delete(job.id);
	const dir = job.dir;
	job.dir = null;
	if (dir) await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
}

// Over the limit, the oldest finished job goes (one still exporting, or still being downloaded, is never dropped).
function trimRemembered() {
	for (const job of jobs.values()) {
		if (jobs.size <= MAX_REMEMBERED) break;
		if (job.status === "exporting" || job.taken) continue;
		forget(job);
	}
}

// Tests shorten the expiry and replace the exporter; the panel never calls these.
export function __setExpiryMsForTests(ms) {
	expiryMs = ms;
}

export function __setExporterForTests(fn) {
	exporter = fn ?? exportServer;
}

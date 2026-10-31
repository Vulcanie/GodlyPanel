import crypto from "node:crypto";
import { BundleError } from "./serverBundle.js";
import { importServer } from "./bundleImport.js";
import { templateOfServer } from "./serverCreationService.js";
import { logActivity } from "./activityLog.js";
import { broadcastSseEvent } from "./sseHub.js";

// Importing a server bundle in the background. Only one import runs at a time across the whole panel: each one unpacks a
// game-sized archive and builds a new server, and two at once would fight over the disk and the same name and ports. The job
// stays on the panel for a while after it ends, so the page can read how it went.

const MAX_REMEMBERED = 20;
const EXPIRY_MS = 30 * 60 * 1000;
// What a person sees when the import fails for a reason that isn't ours to show (the real error goes to the panel's log).
const GENERIC_FAILURE = "The import failed. The panel's log has the details.";

const jobs = new Map(); // id -> job record; Map keeps insertion order, so the first entry is the oldest
let expiryMs = EXPIRY_MS;
let importer = importServer;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isImportJobId = (id) => typeof id === "string" && UUID.test(id);

// What the page is allowed to see. The file, its folder and the cleanup step are kept out of it on purpose.
const publicJob = (job) => ({
	id: job.id,
	status: job.status,
	phase: job.phase,
	name: job.name,
	game: job.game,
	server: job.server,
	installing: job.installing,
	warnings: [...job.warnings],
	error: job.error,
	code: job.code,
	createdAt: job.createdAt,
	finishedAt: job.finishedAt,
});

// Admins only: the import is about a whole server, and its warnings can name folders and settings.
const announce = (job) => broadcastSseEvent({ type: "import_progress", jobId: job.id, ...publicJob(job) }, (c) => c.role === "admin");

/**
 * Starts an import. Answers with the job at once; the import itself carries on in the background. `cleanup` (optional) runs when
 * the import ends either way, and is how a staged upload is removed. Its own errors are ignored.
 */
export function startImportJob({ file, name, ports, parentDir, cleanup = null }) {
	if ([...jobs.values()].some((j) => j.status === "importing")) {
		throw new BundleError("An import is already running. Wait for it to finish.", "import_busy", 429);
	}
	const job = {
		id: crypto.randomUUID(),
		status: "importing",
		phase: null,
		name: typeof name === "string" ? name : null,
		game: null,
		server: null,
		installing: false,
		warnings: [],
		error: null,
		code: null,
		createdAt: new Date().toISOString(),
		finishedAt: null,
		timer: null,
	};
	jobs.set(job.id, job);
	trimRemembered();
	announce(job);

	run(job, { file, name, ports, parentDir, cleanup }).catch((err) => console.error("[import] unexpected:", err));
	return publicJob(job);
}

export function getImportJob(id) {
	const job = jobs.get(id);
	return job ? publicJob(job) : null;
}

async function run(job, { file, name, ports, parentDir, cleanup }) {
	let made = null;
	let failure = null;
	try {
		made = await importer(file, {
			name,
			ports,
			parentDir,
			onProgress: ({ phase }) => {
				job.phase = phase;
				announce(job);
			},
		});
	} catch (err) {
		failure = err;
	} finally {
		// Before the job says it ended, so a page that sees "ready" also finds the staged file gone.
		if (cleanup) await Promise.resolve().then(cleanup).catch(() => {});
	}

	if (failure) {
		// A BundleError carries the person's reason (a taken name, not enough room). Anything else may carry a path, so it is
		// replaced, and the real error is logged instead.
		const shown = failure instanceof BundleError;
		if (!shown) console.error(`[import] ${name} failed:`, failure);
		job.error = shown ? failure.message : GENERIC_FAILURE;
		job.code = shown ? failure.code : "import_failed";
		finish(job, "failed");
		logActivity({ type: "server.bundle_import_failed", server: name || null, level: "error", message: `Importing ${name || "a bundle"} failed: ${job.error}` });
		return;
	}

	job.server = made?.server?.name ?? name;
	// Looked up from the new server's record; a missing record must not leave the job stuck in "importing".
	job.game = made?.server ? (templateOfServer(made.server)?.id ?? null) : null;
	job.installing = made?.installing === true;
	job.warnings = [...(made?.warnings ?? [])];
	finish(job, "ready");
	// No success entry here: importServer writes its own "server.imported" one.
}

function finish(job, status) {
	job.status = status;
	job.phase = status === "ready" ? "done" : job.phase;
	job.finishedAt = new Date().toISOString();
	job.timer = setTimeout(() => jobs.delete(job.id), expiryMs);
	job.timer.unref();
	announce(job);
}

// Over the limit, the oldest finished job goes. A job still importing is never dropped.
function trimRemembered() {
	for (const job of jobs.values()) {
		if (jobs.size <= MAX_REMEMBERED) break;
		if (job.status === "importing") continue;
		clearTimeout(job.timer);
		jobs.delete(job.id);
	}
}

// Tests shorten the expiry and replace the importer; the panel never calls these.
export function __setImporterForTests(fn) {
	importer = fn ?? importServer;
}

export function __setExpiryMsForTests(ms) {
	expiryMs = ms;
}

export function __resetForTests() {
	for (const job of jobs.values()) clearTimeout(job.timer);
	jobs.clear();
	importer = importServer;
	expiryMs = EXPIRY_MS;
}

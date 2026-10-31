import { describe, it, before, after, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Import jobs: an import runs in the background, one at a time across the panel, and its staged upload (if any) is removed when it
// ends. The real importer is replaced by a stand-in, so these tests cover the job bookkeeping only (the import itself is covered by
// bundleImport.test.js). Admins see the progress on the live stream; nobody else does.

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gp-import-jobs-"));
process.env.GHP_DATA_DIR = path.join(tmp, "data");
const { BundleError } = await import("../../src/server/services/serverBundle.js");
const { addSseClient } = await import("../../src/server/services/sseHub.js");
const jobs = await import("../../src/server/services/importJobs.js");

const GENERIC = "The import failed. The panel's log has the details.";
const UUID_NOT_THERE = "00000000-0000-4000-8000-000000000000";

async function waitFor(check, ms = 5000) {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		if (await check()) return true;
		await new Promise((r) => setTimeout(r, 10));
	}
	return Boolean(await check());
}

// Every call to the stand-in is recorded. It reports two phases, then either fails, waits at `gate`, or finishes with a server.
let calls = [];
function fakeImporter({ fail = null, gate = null, warnings = ["Check the ports."], installing = true } = {}) {
	return async (file, options) => {
		calls.push({ file, options });
		options.onProgress({ phase: "checking" });
		options.onProgress({ phase: "unpacking" });
		if (gate) await gate;
		if (fail) throw fail;
		options.onProgress({ phase: "done" });
		return { server: { name: options.name, type: "conan" }, installing, warnings: [...warnings] };
	};
}

// The shape a live-stream client has (see sseHub.addSseClient), with a response that keeps what is written to it.
function liveClient(role) {
	const res = {
		writes: [],
		setHeader() {},
		flushHeaders() {},
		write(data) {
			this.writes.push(data);
		},
		end() {},
		writableLength: 0,
	};
	const req = {
		sid: null,
		closeHandler: null,
		on(event, fn) {
			if (event === "close") this.closeHandler = fn;
		},
	};
	addSseClient(req, res, { id: `${role}-id`, role });
	return { res, close: () => req.closeHandler?.() };
}

const eventsOf = (res, type) =>
	res.writes
		.filter((w) => w.startsWith("data: "))
		.map((w) => JSON.parse(w.slice(6)))
		.filter((e) => e.type === type);

describe("import jobs", () => {
	before(() => {
		mock.method(console, "error", () => {});
	});
	after(() => {
		jobs.__resetForTests();
		mock.restoreAll();
		fs.rmSync(tmp, { recursive: true, force: true });
	});
	beforeEach(() => {
		jobs.__resetForTests();
		calls = [];
	});

	it("goes from importing to ready with the new server, its warnings and the install flag", async () => {
		jobs.__setImporterForTests(fakeImporter());
		const started = jobs.startImportJob({ file: path.join(tmp, "a.gpserver"), name: "Copy", ports: { port: 9000 }, parentDir: path.join(tmp, "parent") });
		assert.equal(started.status, "importing");
		assert.equal(started.name, "Copy");

		assert.equal(await waitFor(() => jobs.getImportJob(started.id)?.status === "ready"), true);
		const shown = jobs.getImportJob(started.id);
		assert.equal(shown.server, "Copy");
		assert.equal(shown.game, "conan", "the game comes from the new server's record");
		assert.equal(shown.installing, true);
		assert.deepEqual(shown.warnings, ["Check the ports."]);
		assert.equal(shown.phase, "done");
		assert.equal(shown.error, null);
		assert.ok(shown.finishedAt);

		assert.equal(calls.length, 1);
		assert.equal(calls[0].file, path.join(tmp, "a.gpserver"));
		assert.equal(calls[0].options.name, "Copy");
		assert.deepEqual(calls[0].options.ports, { port: 9000 });
		assert.equal(calls[0].options.parentDir, path.join(tmp, "parent"), "the folder is passed through as given");
	});

	it("runs the cleanup once, before the job says it is ready, and again not at all", async () => {
		jobs.__setImporterForTests(fakeImporter());
		let cleaned = 0;
		let statusAtCleanup = null;
		const started = jobs.startImportJob({
			file: "x.gpserver",
			name: "Cleaned",
			cleanup: () => {
				cleaned += 1;
				statusAtCleanup = jobs.getImportJob(started.id)?.status;
			},
		});
		assert.equal(await waitFor(() => jobs.getImportJob(started.id)?.status === "ready"), true);
		assert.equal(cleaned, 1);
		assert.equal(statusAtCleanup, "importing", "the staged file is gone before the job reads as ready");
	});

	it("a failing cleanup does not change how the import went", async () => {
		jobs.__setImporterForTests(fakeImporter());
		const started = jobs.startImportJob({ file: "x.gpserver", name: "Sturdy", cleanup: () => Promise.reject(new Error("gone")) });
		assert.equal(await waitFor(() => jobs.getImportJob(started.id)?.status === "ready"), true);
	});

	it("a BundleError keeps its code and message, and the cleanup still runs", async () => {
		jobs.__setImporterForTests(fakeImporter({ fail: new BundleError('A server named "Copy" already exists.', "name_taken", 409) }));
		let cleaned = 0;
		const started = jobs.startImportJob({ file: "x.gpserver", name: "Copy", cleanup: () => (cleaned += 1) });
		assert.equal(await waitFor(() => jobs.getImportJob(started.id)?.status === "failed"), true);
		const shown = jobs.getImportJob(started.id);
		assert.equal(shown.code, "name_taken");
		assert.equal(shown.error, 'A server named "Copy" already exists.');
		assert.equal(shown.server, null);
		assert.equal(cleaned, 1);
	});

	it("any other error gets the generic text; the real one is logged and kept out of the job", async () => {
		jobs.__setImporterForTests(fakeImporter({ fail: new Error("disk on fire at C:\\secret\\place") }));
		const started = jobs.startImportJob({ file: "x.gpserver", name: "Broken" });
		assert.equal(await waitFor(() => jobs.getImportJob(started.id)?.status === "failed"), true);
		const shown = jobs.getImportJob(started.id);
		assert.equal(shown.error, GENERIC);
		assert.equal(shown.code, "import_failed");
		assert.ok(!JSON.stringify(shown).includes("secret"), "the raw error's path is not in the job");
		assert.equal(console.error.mock.callCount() > 0, true, "the real error is logged");
	});

	it("a second import while one runs is refused with import_busy, and the first is unaffected", async () => {
		let release;
		const gate = new Promise((r) => (release = r));
		jobs.__setImporterForTests(fakeImporter({ gate }));
		const first = jobs.startImportJob({ file: "a.gpserver", name: "First" });
		assert.throws(
			() => jobs.startImportJob({ file: "b.gpserver", name: "Second" }),
			(e) => e instanceof BundleError && e.code === "import_busy" && e.status === 429,
		);
		assert.equal(calls.length, 1, "the second never reached the importer");
		release();
		assert.equal(await waitFor(() => jobs.getImportJob(first.id)?.status === "ready"), true);
		// Once the first has ended, a new import is accepted again.
		const third = jobs.startImportJob({ file: "c.gpserver", name: "Third" });
		assert.equal(await waitFor(() => jobs.getImportJob(third.id)?.status === "ready"), true);
	});

	it("ids are checked as UUIDs, and an unknown job is null", async () => {
		jobs.__setImporterForTests(fakeImporter());
		const started = jobs.startImportJob({ file: "x.gpserver", name: "Ids" });
		assert.equal(jobs.isImportJobId(started.id), true);
		assert.equal(jobs.isImportJobId("../x"), false);
		assert.equal(jobs.isImportJobId("not-a-job"), false);
		assert.equal(jobs.isImportJobId(undefined), false);
		assert.equal(jobs.getImportJob(UUID_NOT_THERE), null);
		assert.equal(jobs.getImportJob("../x"), null);
		assert.equal(await waitFor(() => jobs.getImportJob(started.id)?.status === "ready"), true);
	});

	it("a finished job is dropped after its expiry time", async () => {
		jobs.__setExpiryMsForTests(60);
		jobs.__setImporterForTests(fakeImporter());
		const started = jobs.startImportJob({ file: "x.gpserver", name: "Expiring" });
		assert.equal(await waitFor(() => jobs.getImportJob(started.id)?.status === "ready"), true);
		assert.equal(await waitFor(() => jobs.getImportJob(started.id) === null), true, "the job expires");
	});

	it("keeps at most 20 jobs, dropping the oldest first", async () => {
		jobs.__setImporterForTests(fakeImporter());
		const ids = [];
		for (let i = 0; i < 21; i += 1) {
			const job = jobs.startImportJob({ file: "x.gpserver", name: `Many ${i}` });
			ids.push(job.id);
			assert.equal(await waitFor(() => jobs.getImportJob(job.id)?.status === "ready"), true);
		}
		assert.equal(jobs.getImportJob(ids[0]), null, "the oldest is gone");
		assert.ok(jobs.getImportJob(ids[1]), "the next one is kept");
		assert.ok(jobs.getImportJob(ids[20]), "the newest is kept");
	});

	it("progress and the end go to admins on the live stream, and not to a moderator", async () => {
		let release;
		const gate = new Promise((r) => (release = r));
		jobs.__setImporterForTests(fakeImporter({ gate }));
		const admin = liveClient("admin");
		const moderator = liveClient("moderator");
		try {
			const started = jobs.startImportJob({ file: "x.gpserver", name: "Watched" });
			release();
			assert.equal(await waitFor(() => jobs.getImportJob(started.id)?.status === "ready"), true);

			const phases = eventsOf(admin.res, "import_progress")
				.filter((e) => e.jobId === started.id)
				.map((e) => e.phase);
			assert.ok(phases.includes("checking"));
			assert.ok(phases.includes("unpacking"));
			assert.ok(phases.includes("done"));
			const last = eventsOf(admin.res, "import_progress").at(-1);
			assert.equal(last.status, "ready");
			assert.equal(last.id, started.id);
			assert.equal(last.server, "Watched");

			assert.equal(eventsOf(moderator.res, "import_progress").length, 0, "a moderator sees no import progress");
		} finally {
			admin.close();
			moderator.close();
		}
	});
});

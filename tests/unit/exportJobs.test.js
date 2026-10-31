import { describe, it, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { windowsOnly } from "../helpers/winEmulation.js";

// Export jobs: an export runs in the background, its file waits in a temp folder until it is downloaded once, and the folder goes
// after download, on failure, or when the job expires. The real exporter is replaced by a stand-in that writes a small file, so
// these tests cover the job bookkeeping only (the bundle itself is covered by serverBundle.test.js).

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gp-export-jobs-"));
process.env.GHP_DATA_DIR = path.join(tmp, "data");
// Job folders are made in the system temp folder; point that at this test's own folder so other test files don't see them.
process.env.TEMP = tmp;
process.env.TMP = tmp;
const { BundleError } = await import("../../src/server/services/serverBundle.js");
const { runOperation } = await import("../../src/server/services/serverOps.js");
const jobs = await import("../../src/server/services/exportJobs.js");

const DEFAULT_EXPIRY_MS = 30 * 60 * 1000;
const GENERIC = "The export failed. The panel's log has the details.";
const PUBLIC_KEYS = ["bytes", "createdAt", "error", "finishedAt", "id", "include", "name", "secrets", "server", "status"];

const serverNamed = (name) => ({ name, type: "conan", installDir: path.join(tmp, "servers", name.toLowerCase()) });

async function waitFor(check, ms = 5000) {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		if (await check()) return true;
		await new Promise((r) => setTimeout(r, 10));
	}
	return Boolean(await check());
}

// Every call to the stand-in is recorded, so a test can find the job's folder.
let calls = [];
function fakeExporter({ fail = null, gate = null } = {}) {
	return async (server, options) => {
		calls.push({ server, options });
		options.onProgress({ phase: "measuring" });
		if (gate) await gate;
		if (fail) throw fail;
		const name = "fake-20261030.gpserver";
		const file = path.join(options.outDir, name);
		fs.writeFileSync(file, "archive bytes");
		options.onProgress({ phase: "done" });
		return { file, bytes: 13, name };
	};
}

const folderOfLastCall = () => calls.at(-1).options.outDir;

describe("export jobs", windowsOnly("export jobs make bundles with Windows' real tar"), () => {
	before(() => {
		mock.method(console, "error", () => {});
	});
	after(() => {
		jobs.__setExporterForTests(null);
		jobs.__setExpiryMsForTests(DEFAULT_EXPIRY_MS);
		mock.restoreAll();
		fs.rmSync(tmp, { recursive: true, force: true });
	});

	it("goes from exporting to ready with its name and size, and the public shape has no path", async () => {
		calls = [];
		jobs.__setExporterForTests(fakeExporter());
		const started = await jobs.startExportJob(serverNamed("Alpha"), { include: "saves", secrets: false });
		assert.equal(started.status, "exporting");
		assert.equal(started.server, "Alpha");
		assert.equal(started.include, "saves");
		assert.equal(started.secrets, false);

		assert.equal(await waitFor(() => jobs.getExportJob(started.id)?.status === "ready"), true);
		const shown = jobs.getExportJob(started.id);
		assert.equal(shown.name, "fake-20261030.gpserver");
		assert.equal(shown.bytes, 13);
		assert.deepEqual(Object.keys(shown).sort(), PUBLIC_KEYS);
		const text = JSON.stringify(shown);
		assert.ok(!text.includes(folderOfLastCall()), "no temp folder in the job");
		assert.ok(!text.includes(tmp), "no path of this test folder either");
	});

	it("a failure is the generic text for a plain error and the message for a BundleError; its folder goes at once", async () => {
		calls = [];
		jobs.__setExporterForTests(fakeExporter({ fail: new Error("disk on fire at C:\\secret\\place") }));
		const plain = await jobs.startExportJob(serverNamed("Beta"), {});
		assert.equal(await waitFor(() => jobs.getExportJob(plain.id)?.status === "failed"), true);
		const failedPlain = jobs.getExportJob(plain.id);
		assert.equal(failedPlain.error, GENERIC);
		assert.ok(!JSON.stringify(failedPlain).includes("C:\\\\secret"), "the raw error's path doesn't reach the job");
		assert.equal(fs.existsSync(folderOfLastCall()), false, "the temp folder is removed");

		jobs.__setExporterForTests(fakeExporter({ fail: new BundleError("Stop the server first, so its files are copied in one piece.", "server_running", 409) }));
		const bundle = await jobs.startExportJob(serverNamed("Beta"), {});
		assert.equal(await waitFor(() => jobs.getExportJob(bundle.id)?.status === "failed"), true);
		assert.equal(jobs.getExportJob(bundle.id).error, "Stop the server first, so its files are copied in one piece.");
	});

	it("an archive failure whose text carries a path gets the generic text", async () => {
		calls = [];
		const raw = new BundleError(`EPERM: rename '${tmp}\\x.partial'`, "archive_failed", 500);
		jobs.__setExporterForTests(fakeExporter({ fail: raw }));
		const job = await jobs.startExportJob(serverNamed("Gamma"), {});
		assert.equal(await waitFor(() => jobs.getExportJob(job.id)?.status === "failed"), true);
		assert.equal(jobs.getExportJob(job.id).error, GENERIC);
	});

	it("a third export at once is refused with too_many_exports", async () => {
		calls = [];
		let release;
		const gate = new Promise((r) => (release = r));
		jobs.__setExporterForTests(fakeExporter({ gate }));
		const a = await jobs.startExportJob(serverNamed("Two-A"), {});
		const b = await jobs.startExportJob(serverNamed("Two-B"), {});
		await assert.rejects(jobs.startExportJob(serverNamed("Two-C"), {}), (e) => e instanceof BundleError && e.code === "too_many_exports" && e.status === 429);
		release();
		assert.equal(await waitFor(() => jobs.getExportJob(a.id)?.status === "ready" && jobs.getExportJob(b.id)?.status === "ready"), true);
	});

	it("the same server twice at once is refused with already_exporting", async () => {
		calls = [];
		let release;
		const gate = new Promise((r) => (release = r));
		jobs.__setExporterForTests(fakeExporter({ gate }));
		const first = await jobs.startExportJob(serverNamed("Same"), {});
		await assert.rejects(jobs.startExportJob(serverNamed("Same"), {}), (e) => e instanceof BundleError && e.code === "already_exporting" && e.status === 409);
		release();
		assert.equal(await waitFor(() => jobs.getExportJob(first.id)?.status === "ready"), true);
	});

	it("a server whose lock is held by something else is refused, and no job is kept", async () => {
		calls = [];
		let release;
		const holding = runOperation("Held", "backing up", () => new Promise((r) => (release = r)));
		const before = calls.length;
		jobs.__setExporterForTests(fakeExporter());
		await assert.rejects(jobs.startExportJob(serverNamed("Held"), {}), (e) => e.code === "server_busy" && e.status === 409);
		assert.equal(calls.length, before, "the exporter never ran");
		release();
		await holding;
	});

	it("validates include and secrets before anything starts", async () => {
		await assert.rejects(jobs.startExportJob(serverNamed("Bad"), { include: "some" }), (e) => e instanceof BundleError && e.code === "bad_input");
		await assert.rejects(jobs.startExportJob(serverNamed("Bad"), { secrets: "yes" }), (e) => e instanceof BundleError && e.code === "bad_input");
	});

	it("takes the file once; a second take is null; done() removes the folder and the job", async () => {
		calls = [];
		jobs.__setExporterForTests(fakeExporter());
		const job = await jobs.startExportJob(serverNamed("Taker"), {});
		assert.equal(await waitFor(() => jobs.getExportJob(job.id)?.status === "ready"), true);
		const folder = folderOfLastCall();

		const taken = await jobs.takeExportFile(job.id);
		assert.equal(taken.name, "fake-20261030.gpserver");
		assert.equal(taken.bytes, 13);
		assert.equal(fs.readFileSync(taken.file, "utf8"), "archive bytes");
		assert.equal(await jobs.takeExportFile(job.id), null, "only once");

		await taken.done();
		assert.equal(fs.existsSync(folder), false, "the folder is gone");
		assert.equal(jobs.getExportJob(job.id), null, "and the job");
		assert.equal(await jobs.takeExportFile(job.id), null);
	});

	it("does not take a job that is still exporting", async () => {
		let release;
		const gate = new Promise((r) => (release = r));
		jobs.__setExporterForTests(fakeExporter({ gate }));
		const job = await jobs.startExportJob(serverNamed("Slow"), {});
		assert.equal(await jobs.takeExportFile(job.id), null);
		release();
		assert.equal(await waitFor(() => jobs.getExportJob(job.id)?.status === "ready"), true);
	});

	it("expiry removes the temp folder and the job, but a file being downloaded stays until done()", async () => {
		calls = [];
		jobs.__setExpiryMsForTests(60);
		jobs.__setExporterForTests(fakeExporter());
		const job = await jobs.startExportJob(serverNamed("Expiring"), {});
		assert.equal(await waitFor(() => jobs.getExportJob(job.id)?.status === "ready"), true);
		const folder = folderOfLastCall();
		assert.equal(await waitFor(() => jobs.getExportJob(job.id) === null), true, "the job expires");
		assert.equal(fs.existsSync(folder), false, "its folder goes with it");

		calls = [];
		const second = await jobs.startExportJob(serverNamed("Downloading"), {});
		assert.equal(await waitFor(() => jobs.getExportJob(second.id)?.status === "ready"), true);
		const kept = folderOfLastCall();
		const taken = await jobs.takeExportFile(second.id);
		await new Promise((r) => setTimeout(r, 150));
		assert.equal(fs.existsSync(kept), true, "still there while it is being sent");
		await taken.done();
		assert.equal(fs.existsSync(kept), false);
		jobs.__setExpiryMsForTests(DEFAULT_EXPIRY_MS);
	});

	it("remembers at most 20 jobs, dropping the oldest finished first", async () => {
		calls = [];
		jobs.__setExporterForTests(fakeExporter());
		const ids = [];
		for (let i = 0; i < 21; i += 1) {
			const job = await jobs.startExportJob(serverNamed(`Many ${i}`), {});
			ids.push(job.id);
			assert.equal(await waitFor(() => jobs.getExportJob(job.id)?.status === "ready"), true);
		}
		assert.equal(jobs.getExportJob(ids[0]), null, "the oldest is gone");
		assert.ok(jobs.getExportJob(ids[1]), "the next one is kept");
		assert.ok(jobs.getExportJob(ids[20]), "the newest is kept");
	});
});

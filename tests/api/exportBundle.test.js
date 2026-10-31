import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";

// Exporting a stopped server as a .gpserver bundle from the panel: the job runs in the background, the file is downloaded once,
// and the temp folder it waited in is gone afterwards. Administrators only.

async function until(check, { timeoutMs = 60_000, everyMs = 300 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

const UUID_NOT_THERE = "00000000-0000-4000-8000-000000000000";
const enc = encodeURIComponent;
const jobFolders = () => fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith("godlypanel-export-job-")).sort();

describe("exporting a server bundle over the API", () => {
	let panel;
	let api;
	let dirs;
	const SRC = "Export Source";
	const RUN = "Export Running";

	before(async () => {
		const free = [await freePort(), await freePort()];
		dirs = {};
		panel = await startInstance({
			servers: (dir) => {
				const make = (key, exe, name, rcon, ports) => {
					dirs[key] = path.join(dir, exe);
					// Saves are downloaded again on import, so the game needs an app id to be exportable with saves.
					return { ...makeFakeGame(dirs[key], { name, rconPort: rcon, exe: `${exe}.exe`, ports }), updateAppId: "2465200" };
				};
				return [make("src", "gp-export-src", SRC, free[0], { port: 9811, queryPort: 9813 }), make("run", "gp-export-run", RUN, free[1], { port: 9821, queryPort: 9823 })];
			},
		});
		api = panel.api;
	});

	after(async () => {
		for (const d of Object.values(dirs)) killFakeGames(d);
		await panel.stop();
	});

	it("is for administrators only, on all three routes", async () => {
		await api.post("/api/users", { username: "exportmod", password: "TestMod!2345", role: "moderator" });
		const mod = await api.cookieFor({ username: "exportmod", password: "TestMod!2345" });
		assert.equal((await api.post(`/api/server/${enc(SRC)}/export`, { include: "saves" }, { cookie: mod })).status, 403);
		assert.equal((await api.get(`/api/export-jobs/${UUID_NOT_THERE}`, { cookie: mod })).status, 403);
		assert.equal((await api.get(`/api/export-jobs/${UUID_NOT_THERE}/download`, { cookie: mod })).status, 403);
	});

	it("refuses a wrong type or value before anything starts", async () => {
		const bad = await api.post(`/api/server/${enc(SRC)}/export`, { include: "x" });
		assert.equal(bad.status, 400);
		assert.equal(bad.json.code, "bad_input");
		const secrets = await api.post(`/api/server/${enc(SRC)}/export`, { secrets: "yes" });
		assert.equal(secrets.status, 400);
		assert.equal(secrets.json.code, "bad_input");
		const nullInclude = await api.post(`/api/server/${enc(SRC)}/export`, { include: null });
		assert.equal(nullInclude.status, 400);
		assert.equal(nullInclude.json.code, "bad_input");
		assert.deepEqual(jobFolders(), [], "no job folder was made");
	});

	it("answers 404 for an unknown job and for an id that isn't one", async () => {
		assert.equal((await api.get(`/api/export-jobs/${UUID_NOT_THERE}`)).status, 404);
		const notId = await api.get("/api/export-jobs/not-a-job");
		assert.equal(notId.status, 404);
		assert.equal(notId.json.error, "No such job.");
		assert.equal((await api.get("/api/export-jobs/not-a-job/download")).status, 404);
		assert.equal((await api.get(`/api/export-jobs/${UUID_NOT_THERE}/download`)).status, 404);
	});

	it("exports a stopped server in the background, and the file downloads once", async () => {
		const folders = jobFolders();
		const started = await api.post(`/api/server/${enc(SRC)}/export`, { include: "saves" });
		assert.equal(started.status, 202, JSON.stringify(started.json));
		assert.equal(started.json.status, "exporting");
		assert.equal(started.json.server, SRC);
		const id = started.json.id;

		assert.equal(await until(async () => (await api.get(`/api/export-jobs/${id}`)).json.status !== "exporting"), true);
		const job = (await api.get(`/api/export-jobs/${id}`)).json;
		assert.equal(job.status, "ready", JSON.stringify(job));
		assert.match(job.name, /\.gpserver$/);
		assert.ok(job.bytes > 0);
		const text = JSON.stringify(job);
		assert.ok(!text.includes(dirs.src), "no folder of the server");
		assert.ok(!text.includes(os.tmpdir()), "no temp folder");
		assert.ok(jobFolders().length > folders.length, "the file waits in its temp folder");

		const file = await fetch(`${api.base}/api/export-jobs/${id}/download`, { headers: { Cookie: api.cookie } });
		assert.equal(file.status, 200);
		assert.equal(file.headers.get("content-type"), "application/octet-stream");
		assert.match(file.headers.get("content-disposition") ?? "", /attachment/);
		const bytes = Buffer.from(await file.arrayBuffer());
		assert.ok(bytes.length > 0);
		assert.equal(bytes.subarray(0, 2).toString("latin1"), "PK", "a zip archive by default");

		assert.equal((await api.get(`/api/export-jobs/${id}/download`)).status, 404, "a second download finds nothing");
		assert.equal((await api.get(`/api/export-jobs/${id}`)).status, 404, "the job is gone after download");
		assert.equal(await until(async () => JSON.stringify(jobFolders()) === JSON.stringify(folders)), true, "the temp folder is gone");
	});

	it("a running server fails the job with the reason, and nothing is left behind", async () => {
		const folders = jobFolders();
		await api.post(`/api/control/${enc(RUN)}/start`);
		assert.equal(await until(async () => (await api.get("/api/status")).json[RUN]?.online === true, { timeoutMs: 90_000 }), true);
		await until(async () => !(await api.get("/api/operations")).json[RUN]);

		const started = await api.post(`/api/server/${enc(RUN)}/export`, { include: "saves" });
		assert.equal(started.status, 202, JSON.stringify(started.json));
		const id = started.json.id;
		assert.equal(await until(async () => (await api.get(`/api/export-jobs/${id}`)).json.status !== "exporting"), true);
		const job = (await api.get(`/api/export-jobs/${id}`)).json;
		assert.equal(job.status, "failed");
		assert.equal(job.error, "Stop the server first, so its files are copied in one piece.");
		assert.equal(await until(async () => JSON.stringify(jobFolders()) === JSON.stringify(folders)), true, "the temp folder is gone");

		await api.post(`/api/control/${enc(RUN)}/stop`);
		assert.equal(await until(async () => (await api.get("/api/status")).json[RUN]?.online === false), true);
	});

	it("writes the export to the activity log, with no path in it", async () => {
		const events = (await api.get("/api/activity?types=server.export")).json;
		const exported = events.find((e) => e.type === "server.exported" && e.server === SRC);
		const failed = events.find((e) => e.type === "server.export_failed" && e.server === RUN);
		assert.ok(exported, "the success is logged");
		assert.equal(exported.message, `${SRC} was exported to a bundle (saves, without secrets).`);
		assert.ok(failed, "the failure is logged");
		assert.equal(failed.level, "error");
		assert.ok(!JSON.stringify(events).includes(dirs.src));
	});
});

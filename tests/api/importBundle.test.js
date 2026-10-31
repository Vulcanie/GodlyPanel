import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";
import { windowsOnly } from "../helpers/winEmulation.js";

// Importing a .gpserver bundle from the panel: the file is uploaded and put aside, planned, then imported in the background under a
// new name. The staged upload goes when the import ends; a file the person gave by path is never removed. Administrators only.

async function until(check, { timeoutMs = 90_000, everyMs = 300 } = {}) {
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

describe("importing a server bundle over the API", windowsOnly("bundles are made and read by Windows' real tar"), () => {
	let panel;
	let api;
	let dirs;
	let modCookie;
	const SRC = "Import Source";
	const NEW = "Import Copy";
	const stagedPath = (uploadId) => path.join(panel.dir, "uploads", "bundles", `${uploadId}.gpserver`);

	before(async () => {
		const free = await freePort();
		dirs = {};
		panel = await startInstance({
			servers: (dir) => {
				dirs.src = path.join(dir, "gp-import-src");
				// Its own game folder, inside this instance's data folder, so nothing outside it is touched.
				return [{ ...makeFakeGame(dirs.src, { name: SRC, rconPort: free, exe: "gp-import-src.exe", ports: { port: 9811, queryPort: 9813 } }), updateAppId: "2465200" }];
			},
		});
		api = panel.api;
	});

	after(async () => {
		for (const d of Object.values(dirs)) killFakeGames(d);
		await panel.stop();
	});

	// Uploads a bundle as the given cookie (the administrator's by default), the way a browser's form would.
	async function uploadBundle(bytes, { cookie = api.cookie, filename = "copy.gpserver" } = {}) {
		const form = new FormData();
		form.append("bundleFile", new Blob([bytes]), filename);
		const res = await fetch(`${api.base}/api/uploads/bundle`, { method: "POST", headers: cookie ? { Cookie: cookie } : {}, body: form });
		const text = await res.text();
		let json = text;
		try {
			json = JSON.parse(text);
		} catch {
			// A plain-text answer stays as text.
		}
		return { status: res.status, json };
	}

	it("is for administrators only, on all four routes", async () => {
		await api.post("/api/users", { username: "importmod", password: "TestMod!2345", role: "moderator" });
		modCookie = await api.cookieFor({ username: "importmod", password: "TestMod!2345" });
		assert.equal((await uploadBundle(Buffer.from("x"), { cookie: modCookie })).status, 403);
		assert.equal((await api.post("/api/import/plan", { uploadId: UUID_NOT_THERE }, { cookie: modCookie })).status, 403);
		assert.equal((await api.post("/api/import", { uploadId: UUID_NOT_THERE, name: NEW }, { cookie: modCookie })).status, 403);
		assert.equal((await api.get(`/api/import-jobs/${UUID_NOT_THERE}`, { cookie: modCookie })).status, 403);
	});

	it("refuses a bad source or a bad form before anything starts", async () => {
		const none = await api.post("/api/import/plan", {});
		assert.equal(none.status, 400);
		assert.equal(none.json.code, "bad_input");

		const both = await api.post("/api/import/plan", { uploadId: UUID_NOT_THERE, path: path.join(os.tmpdir(), "x.gpserver") });
		assert.equal(both.status, 400);
		assert.equal(both.json.code, "bad_input");

		const relative = await api.post("/api/import/plan", { path: "copy.gpserver" });
		assert.equal(relative.status, 400);
		assert.equal(relative.json.code, "bad_file");

		const missing = await api.post("/api/import/plan", { path: path.join(os.tmpdir(), "gp-no-such-bundle.gpserver") });
		assert.equal(missing.status, 400);
		assert.equal(missing.json.code, "bad_file");

		const noName = await api.post("/api/import", { uploadId: UUID_NOT_THERE });
		assert.equal(noName.status, 400);
		assert.equal(noName.json.code, "bad_input");

		const listPorts = await api.post("/api/import", { uploadId: UUID_NOT_THERE, name: NEW, ports: [9000] });
		assert.equal(listPorts.status, 400);
		assert.equal(listPorts.json.code, "bad_input");

		const textPorts = await api.post("/api/import", { uploadId: UUID_NOT_THERE, name: NEW, ports: "9000" });
		assert.equal(textPorts.status, 400);
		assert.equal(textPorts.json.code, "bad_input");

		const relativeImport = await api.post("/api/import", { path: "copy.gpserver", name: NEW });
		assert.equal(relativeImport.status, 400);
		assert.equal(relativeImport.json.code, "bad_file");

		// A network path would make this PC sign in to another machine, so it is refused for both routes.
		for (const unc of ["\\\\host\\share\\x.gpserver", "//host/share/x.gpserver"]) {
			const plan = await api.post("/api/import/plan", { path: unc });
			assert.equal(plan.status, 400, unc);
			assert.equal(plan.json.code, "bad_file", unc);
			const start = await api.post("/api/import", { path: unc, name: NEW });
			assert.equal(start.status, 400, unc);
			assert.equal(start.json.code, "bad_file", unc);
		}

		const noFile = new FormData();
		noFile.append("notTheField", "hello");
		const noUpload = await fetch(`${api.base}/api/uploads/bundle`, { method: "POST", headers: { Cookie: api.cookie }, body: noFile });
		assert.equal(noUpload.status, 400);
	});

	it("answers 404 for an unknown job and for an id that isn't one", async () => {
		assert.equal((await api.get(`/api/import-jobs/${UUID_NOT_THERE}`)).status, 404);
		const notId = await api.get("/api/import-jobs/not-a-job");
		assert.equal(notId.status, 404);
		assert.equal(notId.json.error, "No such job.");
	});

	it("answers 404 for an upload that is not there", async () => {
		const plan = await api.post("/api/import/plan", { uploadId: UUID_NOT_THERE });
		assert.equal(plan.status, 404);
		assert.equal(plan.json.code, "no_such_upload");
		const notId = await api.post("/api/import", { uploadId: "../../escape", name: NEW });
		assert.equal(notId.status, 404);
		assert.equal(notId.json.code, "no_such_upload");
	});

	it("exports the source, uploads it, plans it, and imports it under a new name", async () => {
		const exported = await api.post(`/api/server/${enc(SRC)}/export`, { include: "all" });
		assert.equal(exported.status, 202, JSON.stringify(exported.json));
		const exportId = exported.json.id;
		assert.equal(await until(async () => (await api.get(`/api/export-jobs/${exportId}`)).json.status !== "exporting"), true);
		assert.equal((await api.get(`/api/export-jobs/${exportId}`)).json.status, "ready");
		const file = await fetch(`${api.base}/api/export-jobs/${exportId}/download`, { headers: { Cookie: api.cookie } });
		assert.equal(file.status, 200);
		const bytes = Buffer.from(await file.arrayBuffer());
		assert.equal(bytes.subarray(0, 2).toString("latin1"), "PK", "a zip archive");

		const up = await uploadBundle(bytes);
		assert.equal(up.status, 200, JSON.stringify(up.json));
		const { uploadId } = up.json;
		assert.match(uploadId, /^[0-9a-f-]{36}$/i);
		assert.equal(fs.existsSync(stagedPath(uploadId)), true, "the upload is put aside");

		const plan = await api.post("/api/import/plan", { uploadId });
		assert.equal(plan.status, 200, JSON.stringify(plan.json));
		assert.equal(plan.json.nameTaken, true, "the source's name is taken by the source itself");
		assert.notEqual(plan.json.name, SRC, "so the plan suggests another name");
		assert.equal(plan.json.include, "all");
		assert.equal(plan.json.needsGameDownload, false);
		assert.deepEqual(plan.json.source, { uploadId });
		assert.ok(plan.json.ports && typeof plan.json.ports === "object");

		const started = await api.post("/api/import", { uploadId, name: NEW, ports: plan.json.ports });
		assert.equal(started.status, 202, JSON.stringify(started.json));
		assert.equal(started.json.status, "importing");
		const jobId = started.json.id;
		assert.equal(await until(async () => (await api.get(`/api/import-jobs/${jobId}`)).json.status !== "importing"), true);
		const done = (await api.get(`/api/import-jobs/${jobId}`)).json;
		assert.equal(done.status, "ready", JSON.stringify(done));
		assert.equal(done.server, NEW);
		assert.equal(fs.existsSync(stagedPath(uploadId)), false, "the staged upload is gone once the import ends");

		const listed = (await api.get("/api/settings/servers")).json;
		assert.ok(Array.isArray(listed), `not a list: ${JSON.stringify(listed).slice(0, 300)}`);
		const made = listed.find((s) => s.name === NEW);
		assert.ok(made, "the new server is in the server list");
		const inside = path.resolve(made.installDir).toLowerCase().startsWith(path.resolve(panel.dir).toLowerCase());
		assert.equal(inside, true, "its folder is inside this test's own data folder, so it is removed with it");

		const again = await api.post("/api/import", { uploadId, name: "Again" });
		assert.equal(again.status, 404);
		assert.equal(again.json.code, "no_such_upload");
	});

	it("imports a bundle from a full path, and leaves that file where it was", async () => {
		const exported = await api.post(`/api/server/${enc(SRC)}/export`, { include: "all" });
		assert.equal(await until(async () => (await api.get(`/api/export-jobs/${exported.json.id}`)).json.status !== "exporting"), true);
		const file = await fetch(`${api.base}/api/export-jobs/${exported.json.id}/download`, { headers: { Cookie: api.cookie } });
		const bytes = Buffer.from(await file.arrayBuffer());

		const given = path.join(os.tmpdir(), `gp-import-path-${Date.now()}.gpserver`);
		fs.writeFileSync(given, bytes);
		try {
			const plan = await api.post("/api/import/plan", { path: given });
			assert.equal(plan.status, 200, JSON.stringify(plan.json));
			assert.deepEqual(plan.json.source, { path: given });

			const started = await api.post("/api/import", { path: given, name: "Path Copy", ports: plan.json.ports });
			assert.equal(started.status, 202, JSON.stringify(started.json));
			assert.equal(await until(async () => (await api.get(`/api/import-jobs/${started.json.id}`)).json.status !== "importing"), true);
			assert.equal((await api.get(`/api/import-jobs/${started.json.id}`)).json.status, "ready");
			assert.equal(fs.existsSync(given), true, "a file given by path is never removed");
		} finally {
			fs.rmSync(given, { force: true });
		}
	});

	it("a text file renamed to .gpserver is refused at the plan, with a code", async () => {
		const up = await uploadBundle(Buffer.from("this is only some plain text, not an archive"), { filename: "fake.gpserver" });
		assert.equal(up.status, 200, JSON.stringify(up.json));
		const plan = await api.post("/api/import/plan", { uploadId: up.json.uploadId });
		assert.equal(plan.status, 400);
		assert.equal(plan.json.code, "not_a_bundle");
		assert.equal(typeof plan.json.error, "string");
	});
});

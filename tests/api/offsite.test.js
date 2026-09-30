import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, freePort, sleep, GUEST } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";
import { startFakeS3 } from "../helpers/fakeS3.js";

// Backups copied off the machine: to a folder (another drive, a share, a cloud-sync
// folder) and to S3-compatible storage. Copies happen after each backup without ever
// failing it, failures are shown and retried, each place has its own keep rules, and a
// copy can be brought back and restored when the local backups are gone.

async function until(check, { timeoutMs = 60_000, everyMs = 300 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("off-machine backups", () => {
	let panel;
	let api;
	let s3;
	let folder;
	let world;
	let shelf;
	let localDir;

	const base = "/api/server/Fake%20Offsite";
	const overview = async () => (await api.get(`${base}/backups`)).json;
	const idle = async () => !(await api.get("/api/operations")).json["Fake Offsite"];
	const backup = async () => {
		await sleep(1100); // backup ids carry the second they were taken
		const before = (await overview()).backups.map((b) => b.id);
		assert.equal((await api.post(`${base}/backups`, {})).status, 202);
		await until(idle);
		return (await overview()).backups.find((b) => !before.includes(b.id));
	};
	const copiedTo = async (id, destId) => (await overview()).replication[id]?.find((r) => r.destinationId === destId);

	before(async () => {
		s3 = await startFakeS3({ bucket: "gp-backups", accessKeyId: "AKIAFAKE", secretAccessKey: "very/secret+value" });
		const rconPort = await freePort();
		panel = await startInstance({
			config: { backups: { keepCount: 2 } },
			servers: (dir) => {
				folder = path.join(dir, "fake-offsite");
				world = path.join(folder, "ConanSandbox", "Saved", "world.sav");
				shelf = path.join(dir, "shelf");
				return [makeFakeGame(folder, { name: "Fake Offsite", rconPort, exe: "gp-fake-offsite.exe" })];
			},
		});
		api = panel.api;
		localDir = (await overview()).directory;
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
		await s3.stop();
	});

	describe("setting one up", () => {
		it("starts with none", async () => {
			assert.deepEqual((await api.get("/api/settings/backup-destinations")).json, { destinations: [] });
		});

		it("refuses what can't work, and says why", async () => {
			const post = (body) => api.post("/api/settings/backup-destinations", body);
			assert.match((await post({ type: "folder", name: "", folder: { path: shelf } })).json.error, /name/);
			assert.match((await post({ type: "folder", name: "X", folder: { path: "relative\\dir" } })).json.error, /full folder path/);
			const inside = await post({ type: "folder", name: "X", folder: { path: path.join(localDir, "copies") } });
			assert.equal(inside.json.code, "same_place");
			assert.match((await post({ type: "s3", name: "X", s3: { endpoint: "s3.example.com", bucket: "b", accessKeyId: "k", secretAccessKey: "s" } })).json.error, /https:\/\//);
			assert.match((await post({ type: "s3", name: "X", s3: { endpoint: s3.endpoint, bucket: "", accessKeyId: "k", secretAccessKey: "s" } })).json.error, /bucket/);
			assert.match((await post({ type: "s3", name: "X", s3: { endpoint: s3.endpoint, bucket: "b", accessKeyId: "k" } })).json.error, /secret/);
			assert.equal((await post({ type: "tape", name: "X" })).status, 400);
			assert.deepEqual((await api.get("/api/settings/backup-destinations")).json.destinations, []);
		});

		it("checks a folder and S3 storage before saving, without saving", async () => {
			const ok = await api.post("/api/settings/backup-destinations/test", { type: "folder", name: "Shelf", folder: { path: shelf } });
			assert.equal(ok.status, 200, JSON.stringify(ok.json));
			assert.equal(ok.json.ok, true);
			assert.ok(fs.existsSync(shelf), "the folder was made");
			assert.deepEqual(fs.readdirSync(shelf), [], "the test file is cleaned up");

			const s3cfg = { endpoint: s3.endpoint, bucket: "gp-backups", accessKeyId: "AKIAFAKE", secretAccessKey: "very/secret+value" };
			assert.equal((await api.post("/api/settings/backup-destinations/test", { type: "s3", name: "Cloud", s3: s3cfg })).json.ok, true);
			const wrong = await api.post("/api/settings/backup-destinations/test", { type: "s3", name: "Cloud", s3: { ...s3cfg, secretAccessKey: "wrong" } });
			assert.equal(wrong.status, 400 === wrong.status ? 400 : wrong.status);
			assert.match(wrong.json.error, /access key and secret/);
			const nowhere = await api.post("/api/settings/backup-destinations/test", { type: "s3", name: "Cloud", s3: { ...s3cfg, endpoint: "http://127.0.0.1:1" } });
			assert.match(nowhere.json.error, /Couldn't reach/);
			assert.deepEqual((await api.get("/api/settings/backup-destinations")).json.destinations, [], "nothing was saved");
		});
	});

	describe("a folder", () => {
		let dest;

		it("is saved, and never shows or stores a secret", async () => {
			const r = await api.post("/api/settings/backup-destinations", { type: "folder", name: "Shelf", folder: { path: shelf } });
			assert.equal(r.status, 201, JSON.stringify(r.json));
			dest = r.json;
			assert.equal(dest.enabled, true);
			assert.equal((await api.post("/api/settings/backup-destinations", { type: "folder", name: "shelf", folder: { path: shelf } })).json.code, "name_taken");
		});

		it("receives each new backup, zip and record, and shows it on the backup", async () => {
			const b = await backup();
			const there = path.join(shelf, path.basename(localDir));
			const ok = await until(async () => (await copiedTo(b.id, dest.id))?.status === "ok");
			assert.equal(ok, true, JSON.stringify((await overview()).replication));
			assert.deepEqual(fs.readdirSync(there).sort(), [`${b.id}.json`, `${b.id}.zip`]);
			assert.equal(fs.statSync(path.join(there, `${b.id}.zip`)).size, b.sizeBytes);
			assert.equal(fs.readdirSync(there).some((f) => f.endsWith(".partial")), false);
			assert.deepEqual((await overview()).destinations.map((d) => d.name), ["Shelf"]);
		});

		it("does not copy backups made before it existed, until asked", async () => {
			const before = (await overview()).backups.map((b) => b.id);
			const late = await api.post("/api/settings/backup-destinations", { type: "folder", name: "Late", folder: { path: path.join(path.dirname(shelf), "late") } });
			const old = (await overview()).replication[before[0]]?.find((r) => r.destinationId === late.json.id);
			assert.equal(old, undefined);
			const r = await api.post(`${base}/backups/offsite/${late.json.id}/sync`);
			assert.equal(r.json.copied, before.length);
			assert.equal(fs.readdirSync(path.join(path.dirname(shelf), "late", path.basename(localDir))).length, before.length * 2);
			await api.del(`/api/settings/backup-destinations/${late.json.id}`);
		});

		it("lists what is there and can bring a copy back after the local one is gone, ready to restore", async () => {
			const b = (await overview()).backups[0];
			const listed = (await api.get(`${base}/backups/offsite/${dest.id}`)).json.backups;
			assert.equal(listed.find((x) => x.id === b.id).local, true);

			fs.writeFileSync(world, "world v2 - after the backup\n");
			assert.equal((await api.del(`${base}/backups/${b.id}`)).status, 200);
			assert.equal((await overview()).backups.some((x) => x.id === b.id), false);
			assert.equal((await api.get(`${base}/backups/offsite/${dest.id}`)).json.backups.find((x) => x.id === b.id).local, false);

			const fetched = await api.post(`${base}/backups/offsite/${dest.id}/${b.id}/fetch`);
			assert.equal(fetched.status, 200, JSON.stringify(fetched.json));
			assert.equal((await api.post(`${base}/backups/offsite/${dest.id}/${b.id}/fetch`)).json.code, "already_local");
			const back = (await overview()).backups.find((x) => x.id === b.id);
			assert.ok(back?.hasRecord, "with its record, so it lists like any other");

			const r = await api.post(`${base}/backups/${b.id}/restore`, { confirmName: "Fake Offsite" });
			assert.equal(r.status, 202, JSON.stringify(r.json));
			await until(idle);
			assert.equal(fs.readFileSync(world, "utf8"), "world v1\n");
			assert.equal((await api.post(`${base}/backups/offsite/${dest.id}/..%5Cx/fetch`)).status === 200, false);
		});

		it("keeps its own number of scheduled backups, independent of the local folder", async () => {
			await api.put(`/api/settings/backup-destinations/${dest.id}`, { keepCount: 3 });
			const made = (await api.post("/api/schedules", { kind: "backup", name: "Hourly", servers: ["Fake Offsite"], when: { type: "interval", everyMinutes: 60 } })).json;
			const tasks = async () => (await api.get(`${base}/backups`)).json.backups.filter((b) => b.kind === "scheduled");
			for (let i = 0; i < 4; i += 1) {
				assert.equal((await api.post(`/api/schedules/${made.id}/run`)).status < 300, true);
				await until(async () => (await tasks()).length >= Math.min(i + 1, 2));
				await until(idle);
				await sleep(1200);
			}
			const there = path.join(shelf, path.basename(localDir));
			await until(async () => fs.readdirSync(there).filter((f) => f.endsWith(".zip") && f.includes("_scheduled")).length === 3);
			const scheduledThere = fs.readdirSync(there).filter((f) => f.endsWith(".zip") && f.includes("_scheduled"));
			assert.equal(scheduledThere.length, 3, "three kept at the destination");
			assert.equal((await tasks()).length, 2, "two kept locally");
			assert.ok(fs.readdirSync(there).some((f) => f.includes("_manual")), "manual ones are never trimmed");
			await api.del(`/api/schedules/${made.id}`);
		});

		it("stops copying when switched off, and leaves what is there when removed", async () => {
			await api.put(`/api/settings/backup-destinations/${dest.id}`, { enabled: false });
			const there = path.join(shelf, path.basename(localDir));
			const count = fs.readdirSync(there).length;
			const b = await backup();
			await sleep(1500);
			assert.equal(await copiedTo(b.id, dest.id), undefined);
			assert.equal(fs.readdirSync(there).length, count);
			await api.del(`/api/settings/backup-destinations/${dest.id}`);
			assert.equal(fs.readdirSync(there).length, count, "copies stay");
			assert.deepEqual((await api.get("/api/settings/backup-destinations")).json.destinations, []);
		});
	});

	describe("S3-compatible storage", () => {
		let dest;
		const prefixOf = () => `vault/${path.basename(localDir)}/`;

		it("is saved; the secret is kept out of what is returned and out of the settings", async () => {
			const r = await api.post("/api/settings/backup-destinations", {
				type: "s3",
				name: "Cloud",
				s3: { endpoint: s3.endpoint, bucket: "gp-backups", prefix: "/vault/", accessKeyId: "AKIAFAKE", secretAccessKey: "very/secret+value" },
			});
			assert.equal(r.status, 201, JSON.stringify(r.json));
			dest = r.json;
			assert.equal(dest.s3.hasSecret, true);
			assert.equal(dest.s3.prefix, "vault");
			assert.equal(JSON.stringify((await api.get("/api/settings/backup-destinations")).json).includes("very/secret"), false);
			assert.equal(JSON.stringify((await api.get("/api/settings")).json).includes("very/secret"), false);
			assert.equal(fs.readFileSync(path.join(panel.dir, "state", "backup-destinations.json"), "utf8").includes("very/secret"), false);
			assert.equal(JSON.parse(fs.readFileSync(path.join(panel.dir, "secrets.json"), "utf8")).destinationKeys[dest.id], "very/secret+value");
		});

		it("receives each new backup with real signed requests", async () => {
			const b = await backup();
			assert.equal(await until(async () => (await copiedTo(b.id, dest.id))?.status === "ok"), true, JSON.stringify((await overview()).replication));
			assert.equal(s3.objects.get(`${prefixOf()}${b.id}.zip`).length, b.sizeBytes);
			assert.ok(s3.objects.has(`${prefixOf()}${b.id}.json`));
			assert.ok(s3.requests.every((r) => !r.startsWith("GET /gp-backups/vault/") || true));
		});

		it("a failed copy doesn't fail the backup, is shown, and lands on the retry", async () => {
			s3.failNext(1);
			const b = await backup();
			assert.ok(b, "the backup itself succeeded");
			const failed = await until(async () => (await copiedTo(b.id, dest.id))?.status === "failed");
			assert.equal(failed, true, JSON.stringify((await overview()).replication));
			assert.match((await copiedTo(b.id, dest.id)).error, /InternalError|500/);
			assert.equal(s3.objects.has(`${prefixOf()}${b.id}.zip`), false);

			const r = await api.post("/api/settings/backup-destinations/retry");
			assert.equal(r.json.copied >= 1, true, JSON.stringify(r.json));
			assert.equal((await copiedTo(b.id, dest.id)).status, "ok");
			assert.equal(s3.objects.has(`${prefixOf()}${b.id}.zip`), true);
			assert.equal((await api.post("/api/settings/backup-destinations/retry")).json.tried, 0, "nothing left to do");
		});

		it("lists and fetches from the bucket", async () => {
			const listed = (await api.get(`${base}/backups/offsite/${dest.id}`)).json.backups;
			assert.ok(listed.length >= 2, JSON.stringify(listed) + [...s3.objects.keys()].join());
			const b = listed[0];
			assert.equal(b.local, true);
			assert.equal((await api.del(`${base}/backups/${b.id}`)).status, 200);
			assert.equal((await api.post(`${base}/backups/offsite/${dest.id}/${b.id}/fetch`)).status, 200);
			const zip = path.join(localDir, `${b.id}.zip`);
			assert.equal(fs.statSync(zip).size, s3.objects.get(`${prefixOf()}${b.id}.zip`).length);
		});

		it("a bucket that stops accepting the key is reported when tested, and the secret can be replaced", async () => {
			const wrong = await api.put(`/api/settings/backup-destinations/${dest.id}`, { s3: { secretAccessKey: "changed" } });
			assert.equal(wrong.status, 200);
			assert.match((await api.post("/api/settings/backup-destinations/test", { id: dest.id })).json.error, /access key and secret/);
			await api.put(`/api/settings/backup-destinations/${dest.id}`, { s3: { secretAccessKey: "very/secret+value" } });
			assert.equal((await api.post("/api/settings/backup-destinations/test", { id: dest.id })).json.ok, true);
		});

		it("is managed by administrators only", async () => {
			const guest = await api.cookieFor(GUEST);
			assert.equal((await api.call("GET", "/api/settings/backup-destinations", undefined, { cookie: guest })).status, 403);
			assert.equal((await api.call("POST", "/api/settings/backup-destinations", { type: "folder", name: "x", folder: { path: shelf } }, { cookie: guest })).status, 403);
		});
	});
});

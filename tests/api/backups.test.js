import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames, gameLog } from "../helpers/fakeGame.js";
import { listZip } from "../../src/server/util/tarZip.js";

// Backups against a real stand-in game process: the world and settings are copied
// into a zip that reads back, a running server is stopped for the copy and started
// again, a restore puts the files back (after a safety backup) and refuses while
// the server is up, and only the people who should be able to do each thing can.

async function until(check, { timeoutMs = 90_000, everyMs = 400 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("backups", () => {
	let panel;
	let api;
	let folder;
	let world;

	const base = "/api/server/Fake%20Backup";
	const list = async () => (await api.get(`${base}/backups`)).json;
	const idle = async () => !(await api.get("/api/operations")).json["Fake Backup"];
	const online = async () => (await api.get("/api/status")).json["Fake Backup"]?.online === true;
	const offline = async () => !(await online());
	const read = () => fs.readFileSync(world, "utf8");

	before(async () => {
		const rconPort = await freePort();
		panel = await startInstance({
			servers: (dir) => {
				folder = path.join(dir, "fake-backup");
				world = path.join(folder, "ConanSandbox", "Saved", "world.sav");
				return [makeFakeGame(folder, { name: "Fake Backup", rconPort, exe: "gp-fake-backup.exe" })];
			},
		});
		api = panel.api;
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	it("knows where Conan keeps its saves and what it leaves out", async () => {
		const o = await list();
		assert.equal(o.source, "default");
		assert.equal(o.specs.length, 1);
		assert.equal(o.specs[0].path, path.join(folder, "ConanSandbox", "Saved"));
		assert.equal(o.specs[0].exists, true);
		assert.deepEqual(o.specs[0].exclude, ["Logs", "Crashes"]);
		assert.equal(o.backups.length, 0);
		// Conan can't be saved on command, so a running server is stopped for the copy.
		assert.equal(o.canSaveOnCommand, false);
		assert.equal(o.effectiveMode, "stop");
	});

	it("backs up a stopped server into a zip that holds the world and settings but not the logs", async () => {
		const r = await api.post(`${base}/backups`, {});
		assert.equal(r.status, 202, JSON.stringify(r.json));
		await until(idle);
		const o = await list();
		assert.equal(o.backups.length, 1);
		const b = o.backups[0];
		assert.equal(b.kind, "manual");
		assert.equal(b.serverWasRunning, false);
		assert.ok(b.sizeBytes > 0);
		const zip = path.join(o.directory, `${b.id}.zip`);
		const names = await listZip(zip);
		assert.ok(names.includes("gp-backup.json"));
		assert.ok(names.some((n) => n === "Saved/world.sav"), names.join(", "));
		assert.ok(names.some((n) => n === "Saved/Config/settings.ini"));
		assert.equal(names.some((n) => n.includes("Logs")), false, "logs are left out");
		assert.ok(fs.existsSync(path.join(o.directory, `${b.id}.json`)), "with a record beside it");
		assert.equal(fs.readdirSync(o.directory).some((f) => f.endsWith(".partial")), false);
	});

	it("restores the files, after taking a safety backup of what it replaces, and cleans up after itself", async () => {
		fs.writeFileSync(world, "world v2 - played on after the backup\n");
		const first = (await list()).backups[0];

		const unconfirmed = await api.post(`${base}/backups/${first.id}/restore`, {});
		assert.equal(unconfirmed.status, 400);
		assert.equal(unconfirmed.json.code, "confirm_mismatch");
		assert.match(read(), /world v2/, "nothing changed");

		const r = await api.post(`${base}/backups/${first.id}/restore`, { confirmName: "Fake Backup" });
		assert.equal(r.status, 202, JSON.stringify(r.json));
		await until(idle);
		assert.equal(read(), "world v1\n");
		const kinds = (await list()).backups.map((b) => b.kind).sort();
		assert.deepEqual(kinds, ["manual", "pre-restore"]);
		const leftovers = fs.readdirSync(path.join(folder, "ConanSandbox")).filter((n) => n.startsWith(".gp-"));
		assert.deepEqual(leftovers, []);
	});

	it("can go back to the state it was in before the restore", async () => {
		const safety = (await list()).backups.find((b) => b.kind === "pre-restore");
		const r = await api.post(`${base}/backups/${safety.id}/restore`, { confirmName: "Fake Backup", safety: false });
		assert.equal(r.status, 202, JSON.stringify(r.json));
		await until(idle);
		assert.match(read(), /world v2/);
		fs.writeFileSync(world, "world v1\n");
	});

	it("stops a running server for the copy, then starts it again", async () => {
		assert.equal((await api.post("/api/control/Fake%20Backup/start")).status, 200);
		assert.equal(await until(online), true);
		await until(idle);

		const r = await api.post(`${base}/backups`, {});
		assert.equal(r.status, 202, JSON.stringify(r.json));
		const ops = new Set();
		assert.equal(
			await until(async () => {
				const op = (await api.get("/api/operations")).json["Fake Backup"]?.op;
				if (op) ops.add(op);
				return !op;
			}),
			true,
		);
		assert.ok(ops.has("backing up"), [...ops].join());
		assert.equal(await until(online), true, "it is running again");
		assert.match(gameLog(folder), /rcon: Shutdown/);
		const newest = (await list()).backups[0];
		assert.equal(newest.serverWasRunning, true);
		assert.equal(newest.mode, "stop");
		assert.equal(newest.consistent, true);
		// The copy was taken after the game had saved as it exited.
		const zip = path.join((await list()).directory, `${newest.id}.zip`);
		assert.ok((await listZip(zip)).some((n) => n === "Saved/world.sav"));
	});

	it("refuses to restore while the server is running", async () => {
		const id = (await list()).backups[0].id;
		const r = await api.post(`${base}/backups/${id}/restore`, { confirmName: "Fake Backup" });
		assert.equal(r.status, 409);
		assert.equal(r.json.code, "server_running");
	});

	it("can copy a running server without stopping it, and says it may be inconsistent", async () => {
		const r = await api.post(`${base}/backups`, { mode: "live" });
		assert.equal(r.status, 202, JSON.stringify(r.json));
		await until(idle);
		assert.equal(await online(), true, "never stopped");
		const newest = (await list()).backups[0];
		assert.equal(newest.mode, "live");
		assert.equal(newest.consistent, false);
	});

	it("refuses a second action while one is under way", async () => {
		const first = await api.post(`${base}/backups`, {});
		assert.equal(first.status, 202);
		const second = await api.post(`${base}/backups`, {});
		assert.equal(second.status, 409);
		assert.equal(second.json.code, "server_busy");
		await until(idle);
		await until(online);
	});

	it("deletes a backup, and refuses ids that aren't backups", async () => {
		const before = (await list()).backups;
		const gone = await api.del(`${base}/backups/${before[0].id}`);
		assert.equal(gone.status, 200);
		assert.equal((await list()).backups.length, before.length - 1);
		assert.equal((await api.del(`${base}/backups/nope`)).status, 404);
		assert.equal((await api.del(`${base}/backups/..%2F..%2Fservers`)).status, 400);
		assert.equal((await api.del(`${base}/backups/a%5Cb`)).status, 400);
	});

	describe("the folders to back up", () => {
		it("refuses folders that aren't safe or make sense", async () => {
			for (const paths of [
				[{ path: "relative\\folder" }],
				[{ path: "C:\\Windows" }],
				[{ path: "C:\\" }],
				[{ path: process.env.USERPROFILE }],
				[{ path: path.join(folder, "a", "Saved") }, { path: path.join(folder, "b", "Saved") }],
				"not a list",
			]) {
				const r = await api.put(`${base}/backups/settings`, { paths });
				assert.equal(r.status, 400, JSON.stringify(paths));
			}
		});

		it("uses folders you choose instead of the game's usual ones, and can go back", async () => {
			const extra = path.join(folder, "extra-notes");
			fs.mkdirSync(extra);
			fs.writeFileSync(path.join(extra, "notes.txt"), "remember this");
			const set = await api.put(`${base}/backups/settings`, { paths: [{ path: extra, label: "My notes" }] });
			assert.equal(set.status, 200, JSON.stringify(set.json));
			assert.equal(set.json.source, "custom");
			assert.equal(set.json.specs[0].label, "My notes");

			await until(online);
			await until(idle);
			const r = await api.post(`${base}/backups`, { mode: "live" });
			assert.equal(r.status, 202, JSON.stringify(r.json));
			await until(idle);
			const newest = (await list()).backups[0];
			const names = await listZip(path.join((await list()).directory, `${newest.id}.zip`));
			assert.ok(names.includes("extra-notes/notes.txt"), names.join(", "));
			assert.equal(names.some((n) => n.startsWith("Saved/")), false);

			const back = await api.put(`${base}/backups/settings`, { paths: null });
			assert.equal(back.json.source, "default");
		});

		it("says so plainly when a game has nothing set up and nothing exists yet", async () => {
			const none = await api.put(`${base}/backups/settings`, { paths: [] });
			assert.equal(none.status, 200);
			assert.equal(none.json.needsSetup, true);
			const r = await api.post(`${base}/backups`, { mode: "live" });
			assert.equal(r.status, 400);
			assert.equal(r.json.code, "no_paths");
			await api.put(`${base}/backups/settings`, { paths: null });
		});
	});

	it("refuses when there isn't room, before touching the server", async () => {
		const small = await startInstance({
			config: { backups: { minFreeGB: 100000 } },
			servers: (dir) => [makeFakeGame(path.join(dir, "g"), { name: "Fake Backup", rconPort: 1, exe: "gp-fake-nospace.exe" })],
		});
		try {
			const r = await small.api.post(`${base}/backups`, {});
			assert.equal(r.status, 507);
			assert.equal(r.json.code, "low_space");
			assert.match(r.json.error, /Not enough room/);
		} finally {
			await small.stop();
		}
	});

	describe("who may do what", () => {
		let mod;
		let limited;
		let guest;

		before(async () => {
			await api.post("/api/users", { username: "mod-all", password: "TestMod!2345", role: "moderator" });
			await api.post("/api/users", { username: "mod-other", password: "TestMod!2345", role: "moderator", servers: ["Some Other Server"] });
			mod = await api.cookieFor({ username: "mod-all", password: "TestMod!2345" });
			limited = await api.cookieFor({ username: "mod-other", password: "TestMod!2345" });
			guest = await api.cookieFor({ username: "viewer", password: "TestGuest!2345" });
		});

		it("lets a moderator see and take backups", async () => {
			assert.equal((await api.get(`${base}/backups`, { cookie: mod })).status, 200);
			const r = await api.post(`${base}/backups`, { mode: "live" }, { cookie: mod });
			assert.equal(r.status, 202, JSON.stringify(r.json));
			await until(idle);
		});

		it("keeps restore, delete and settings for admins", async () => {
			const id = (await list()).backups[0].id;
			assert.equal((await api.post(`${base}/backups/${id}/restore`, { confirmName: "Fake Backup" }, { cookie: mod })).status, 403);
			assert.equal((await api.del(`${base}/backups/${id}`, { cookie: mod })).status, 403);
			assert.equal((await api.put(`${base}/backups/settings`, { mode: "live" }, { cookie: mod })).status, 403);
		});

		it("keeps a moderator out of what isn't theirs", async () => {
			assert.equal((await api.get("/api/users", { cookie: mod })).status, 403);
			assert.equal((await api.get("/api/settings", { cookie: mod })).status, 403);
			assert.equal((await api.get("/api/config/Fake%20Backup?file=config", { cookie: mod })).status, 403, "configs hold passwords");
		});

		it("limits a moderator to the servers they were given", async () => {
			const r = await api.get(`${base}/backups`, { cookie: limited });
			assert.equal(r.status, 403);
			assert.equal(r.json.code, "forbidden_server");
			assert.equal((await api.post("/api/control/Fake%20Backup/stop", {}, { cookie: limited })).status, 403);
			assert.deepEqual((await api.get("/api/my-servers", { cookie: limited })).json, []);
			assert.deepEqual((await api.get("/api/my-servers", { cookie: mod })).json, ["Fake Backup"]);
		});

		it("gives a guest none of it", async () => {
			assert.equal((await api.get(`${base}/backups`, { cookie: guest })).status, 403);
			assert.equal((await api.post("/api/control/Fake%20Backup/stop", {}, { cookie: guest })).status, 403);
			assert.equal((await api.get("/api/status", { cookie: guest })).status, 200);
		});

		it("sends a moderator the same trimmed status a guest gets, without passwords", async () => {
			const status = (await api.get("/api/status", { cookie: mod })).json["Fake Backup"];
			assert.equal("serverPassword" in status, false);
		});
	});
});

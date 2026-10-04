import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawn } from "node:child_process";
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

	describe("restart and use this backup", () => {
		const activity = async () => (await api.get("/api/activity?limit=100")).json;
		const copyOfV1 = async () => {
			// The backup taken when the server was stopped for it: "world v1" plus what the game wrote as it exited.
			const o = await list();
			return o.backups.find((b) => b.kind === "manual" && b.mode === "stop");
		};

		it("asks for a plain yes, or the server's name when there is no safety backup", async () => {
			const id = (await copyOfV1()).id;
			const none = await api.post(`${base}/backups/${id}/restore`, { restart: true });
			assert.equal(none.status, 400);
			assert.equal(none.json.code, "confirm_mismatch");
			const noSafety = await api.post(`${base}/backups/${id}/restore`, { restart: true, safety: false, confirm: true });
			assert.equal(noSafety.status, 400, "without a safety backup, a yes isn't enough");
			assert.equal(await online(), true, "nothing happened to the server");
		});

		it("stops a running server, puts the backup back, and starts it again", async () => {
			assert.equal(await until(online), true);
			fs.writeFileSync(world, "world v3 - newer than the backup\n");
			const id = (await copyOfV1()).id;
			const before = (await list()).backups.length;
			const shutdowns = () => (gameLog(folder).match(/rcon: Shutdown/g) ?? []).length;
			const stopsBefore = shutdowns();

			const r = await api.post(`${base}/backups/${id}/restore`, { restart: true, confirm: true });
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
			assert.ok(ops.has("restoring"), [...ops].join());
			assert.equal(shutdowns(), stopsBefore + 1, "it was asked to stop once, by the panel");
			assert.match(read(), /^world v1\n/, "the older world is back");
			assert.doesNotMatch(read(), /v3/, "what was newer is gone from the live world");
			assert.ok(fs.existsSync(path.join(path.dirname(world), "Logs", "game.log")), "the game's logs, which a backup leaves out, weren't swept away with the folder");
			assert.equal(await until(online), true, "and the server is running on it");
			const after = (await list()).backups;
			assert.equal(after.length, before + 1, "after a safety backup of the newer one");
			const safety = after.find((b) => b.kind === "pre-restore");
			assert.ok(safety, "the newer world is kept in a safety backup, so this can be undone");
			const done = (await activity()).find((e) => e.type === "backup.restored");
			assert.match(done.message, /started it again/);
		});

		it("starts a stopped server afterwards when asked to, and leaves it stopped otherwise", async () => {
			assert.equal((await api.post("/api/control/Fake%20Backup/stop")).status, 200);
			assert.equal(await until(offline), true);
			await until(idle);
			const id = (await copyOfV1()).id;

			const stays = await api.post(`${base}/backups/${id}/restore`, { confirm: true });
			assert.equal(stays.status, 202, JSON.stringify(stays.json));
			await until(idle);
			assert.equal(await online(), false, "no restart asked for, so it stays stopped");

			const starts = await api.post(`${base}/backups/${id}/restore`, { confirm: true, restart: true });
			assert.equal(starts.status, 202, JSON.stringify(starts.json));
			await until(idle);
			assert.equal(await until(online), true, "restart asked for, so it is running");
		});

		it("never takes the server down for a backup it can't restore", async () => {
			const id = (await copyOfV1()).id;
			const elsewhere = path.join(path.dirname(folder), "somewhere-else");
			fs.mkdirSync(elsewhere, { recursive: true });
			assert.equal((await api.put(`${base}/backups/settings`, { paths: [{ path: elsewhere }] })).status, 200);
			try {
				const r = await api.post(`${base}/backups/${id}/restore`, { restart: true, confirm: true });
				assert.equal(r.status, 400, JSON.stringify(r.json));
				assert.equal(r.json.code, "paths_changed");
				assert.equal(await online(), true, "still running, never stopped");
			} finally {
				assert.equal((await api.put(`${base}/backups/settings`, { paths: null })).status, 200);
			}
		});

		it("rolls back and starts the server again on its old files when the restore can't finish", async () => {
			const id = (await copyOfV1()).id;
			fs.writeFileSync(world, "world v4 - must survive a failed restore\n");
			// A program whose working folder is the save folder keeps Windows from renaming it out of the way.
			const saved = path.dirname(world);
			const holder = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { cwd: saved, stdio: "ignore" });
			await sleep(500);
			try {
				const r = await api.post(`${base}/backups/${id}/restore`, { restart: true, confirm: true });
				assert.equal(r.status, 202, JSON.stringify(r.json));
				await until(idle);
			} finally {
				holder.kill();
				await sleep(300);
			}
			assert.match(read(), /v4/, "the live world is as it was");
			assert.equal(await until(online), true, "the server was started again");
			const failed = (await activity()).find((e) => e.type === "backup.restore_failed");
			assert.ok(failed, "and the failure is recorded");
			assert.deepEqual(fs.readdirSync(path.join(folder, "ConanSandbox")).filter((n) => n.startsWith(".gp-")), []);
			fs.writeFileSync(world, "world v1\n");
		});
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

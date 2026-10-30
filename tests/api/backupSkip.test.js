import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, freePort, sleep } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames, gameLog } from "../helpers/fakeGame.js";

// A scheduled backup is skipped when nothing has changed since the newest backup, so an idle server doesn't pile up identical
// archives. Manual backups are always made, a skipped run never stops the server, and turning the setting off makes every
// scheduled backup happen again. These run through the panel's own API against the stand-in game.

async function until(check, { timeoutMs = 90_000, everyMs = 400 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value) return value;
		await sleep(everyMs);
	}
	return check();
}

describe("skipping a scheduled backup when nothing has changed", () => {
	let panel;
	let api;
	let folder;
	let world;

	const base = "/api/server/Fake%20Backup";
	const list = async () => (await api.get(`${base}/backups`)).json;
	const idle = async () => !(await api.get("/api/operations")).json["Fake Backup"];
	const online = async () => (await api.get("/api/status")).json["Fake Backup"]?.online === true;
	const activity = async () => (await api.get("/api/activity?limit=100")).json;
	const archives = async () => fs.readdirSync((await list()).directory).filter((f) => f.endsWith(".zip")).length;
	const shutdowns = () => (gameLog(folder).match(/rcon: Shutdown/g) ?? []).length;

	// A schedule that is due a year from now, so only the explicit run below ever runs it.
	let scheduleId;
	const taskNow = async () => (await api.get("/api/schedules")).json.find((t) => t.id === scheduleId);
	const runSchedule = async () => {
		const before = (await taskNow()).lastRunAt;
		const r = await api.post(`/api/schedules/${scheduleId}/run`, {});
		assert.equal(r.status, 202, JSON.stringify(r.json));
		assert.equal(await until(async () => {
			const t = await taskNow();
			return t.lastRunAt !== before && !t.running;
		}), true, "the scheduled run finished");
		await until(idle);
		return (await taskNow()).lastMessage;
	};

	before(async () => {
		const rconPort = await freePort();
		panel = await startInstance({
			servers: (dir) => {
				folder = path.join(dir, "fake-skip");
				world = path.join(folder, "ConanSandbox", "Saved", "world.sav");
				return [makeFakeGame(folder, { name: "Fake Backup", rconPort, exe: "gp-fake-skip.exe" })];
			},
		});
		api = panel.api;
		const made = await api.post("/api/schedules", {
			kind: "backup",
			name: "Skip test",
			servers: ["Fake Backup"],
			when: { type: "once", at: new Date(Date.now() + 365 * 86_400_000).toISOString() },
			options: {},
		});
		assert.equal(made.status, 200, JSON.stringify(made.json));
		scheduleId = made.json.id;
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	it("skips a scheduled backup after a manual one when nothing changed: no archive, no stop, and it is logged", async () => {
		// The first backup is taken by hand while the server is stopped, so its record holds the fingerprint of the saved files.
		assert.equal((await api.post(`${base}/backups`, {})).status, 202);
		await until(idle);
		assert.equal((await list()).backups.length, 1);
		assert.ok((await list()).backups[0].fingerprint, "a manual backup records a fingerprint");

		assert.equal((await api.post("/api/control/Fake%20Backup/start")).status, 200);
		assert.equal(await until(online), true);
		const before = await archives();
		const stopsBefore = shutdowns();

		const message = await runSchedule();
		assert.match(message, /no changes since last backup, skipped/);
		assert.equal(await archives(), before, "no new archive on disk");
		assert.equal(shutdowns(), stopsBefore, "the server was not stopped");
		assert.equal(await online(), true, "and it is still running");
		const logged = (await activity()).find((e) => e.type === "backup.skipped");
		assert.ok(logged, "the skip is in the activity log");
		assert.equal(logged.message, "Skipped the scheduled backup of Fake Backup: no changes since the last backup.");
	});

	it("never skips a backup made by hand, even when nothing changed", async () => {
		const before = await archives();
		const r = await api.post(`${base}/backups`, { mode: "live" });
		assert.equal(r.status, 202, JSON.stringify(r.json));
		await until(idle);
		assert.equal(await archives(), before + 1, "the manual backup was made");
		assert.equal((await list()).backups[0].kind, "manual");
		assert.equal(await online(), true, "and the server kept running");
	});

	it("makes a scheduled backup once the world has changed, and records the fingerprint with it", async () => {
		fs.writeFileSync(world, "world v5 - changed since the last backup\n");
		const before = await archives();
		const message = await runSchedule();
		assert.equal(message, "Fake Backup: backed up", JSON.stringify(message));
		assert.equal(await archives(), before + 1);
		const newest = (await list()).backups[0];
		assert.equal(newest.kind, "scheduled");
		const record = JSON.parse(fs.readFileSync(path.join((await list()).directory, `${newest.id}.json`), "utf8"));
		assert.match(record.fingerprint, /^[0-9a-f]{40}$/, "the fingerprint is in the record beside the archive");
		assert.equal(await until(online), true, "the server was stopped for it and started again");
	});

	it("turning the setting off makes every scheduled backup happen, even with nothing changed", async () => {
		// Refresh the newest record first: the stop above wrote a little to the save as the game exited.
		assert.equal((await api.post(`${base}/backups`, { mode: "live" })).status, 202);
		await until(idle);
		assert.equal(await until(online), true);

		const off = await api.put(`${base}/backups/settings`, { skipUnchanged: false });
		assert.equal(off.status, 200, JSON.stringify(off.json));
		assert.equal(off.json.effectiveSkipUnchanged, false);
		const before = await archives();
		assert.equal(await runSchedule(), "Fake Backup: backed up");
		assert.equal(await archives(), before + 1, "not skipped");

		assert.equal((await api.put(`${base}/backups/settings`, { skipUnchanged: null })).status, 200);
	});
});

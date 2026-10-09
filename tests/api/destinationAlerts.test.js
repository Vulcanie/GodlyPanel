import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { freePort, sleep, until } from "../helpers/instance.js";
import { startInProcess } from "../helpers/inprocess.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";

// A backup that never reaches an off-site destination (it is unreachable, full, its key was revoked) is easy to miss: the backup
// itself succeeded. checkDestinations() warns when one is overdue, once, then daily while it lasts, and says when it is caught up.
// "Now" is passed in, so a day passes without waiting for one.

const HOUR = 3600_000;

describe("warning about a destination that is behind", () => {
	let panel;
	let api;
	let folder;
	let broken;
	let hook;
	let hookCalls;
	let checkDestinations;
	let dest;
	const base = "/api/server/Fake%20Alerts";

	const events = async (type) => (await api.get("/api/activity?limit=200")).json.filter((e) => e.type === type);

	before(async () => {
		hookCalls = [];
		hook = http.createServer((req, res) => {
			let body = "";
			req.on("data", (c) => (body += c));
			req.on("end", () => {
				hookCalls.push(JSON.parse(body));
				res.end("ok");
			});
		});
		await new Promise((r) => hook.listen(0, "127.0.0.1", r));

		const rconPort = await freePort();
		panel = await startInProcess({
			servers: (dir) => {
				folder = path.join(dir, "fake-alerts");
				broken = path.join(dir, "shelf");
				return [makeFakeGame(folder, { name: "Fake Alerts", rconPort, exe: "gp-fake-alerts.exe" })];
			},
		});
		api = panel.api;
		({ checkDestinations } = await import("../../src/server/services/backupDestinations.js"));
		const { patchSecrets } = await import("../../src/server/config/secretsStore.js");
		const { startNotifier } = await import("../../src/server/services/notifier.js");
		await patchSecrets({ alertWebhookUrl: `http://127.0.0.1:${hook.address().port}/` });
		startNotifier();

		// A destination that can't work: its "folder" is a file.
		fs.writeFileSync(broken, "not a folder");
		const made = await api.post("/api/settings/backup-destinations", { type: "folder", name: "Shelf", folder: { path: broken } });
		assert.equal(made.status, 201, JSON.stringify(made.json));
		dest = made.json;

		await sleep(1100);
		assert.equal((await api.post(`${base}/backups`, {})).status, 202);
		await until(async () => !(await api.get("/api/operations")).json["Fake Alerts"]);
		assert.equal((await api.get(`${base}/backups`)).json.backups.length, 1, "a backup exists");
		const retried = await api.post("/api/settings/backup-destinations/retry", {});
		assert.ok(retried.json.tried >= 1 && retried.json.copied === 0, `the copy fails: ${JSON.stringify(retried.json)}`);
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
		await new Promise((r) => hook.close(r));
	});

	it("says nothing while a backup is still new", async () => {
		assert.deepEqual(await checkDestinations({ now: Date.now() + 2 * HOUR, staleHours: 24 }), []);
		assert.equal((await events("backup.destination_stale")).length, 0);
	});

	it("says nothing at all when the warning is turned off", async () => {
		assert.deepEqual(await checkDestinations({ now: Date.now() + 100 * HOUR, staleHours: 0 }), []);
		assert.equal((await events("backup.destination_stale")).length, 0);
	});

	it("warns once the backup is overdue, saying which destination and why", async () => {
		const behind = await checkDestinations({ now: Date.now() + 25 * HOUR, staleHours: 24 });
		assert.equal(behind.length, 1);
		assert.equal(behind[0].destination, "Shelf");
		assert.equal(behind[0].behind, 1);
		const [warning] = await events("backup.destination_stale");
		assert.match(warning.message, /Shelf/);
		assert.match(warning.message, /1 backup hasn't reached/);
		assert.match(warning.message, /Last error/);
	});

	it("sends it to the alert webhook, without the person having picked the event", async () => {
		assert.equal(await until(() => hookCalls.some((c) => c.event === "backup.destination_stale"), { timeoutMs: 10_000 }), true);
		assert.match(hookCalls.find((c) => c.event === "backup.destination_stale").content, /Shelf/);
	});

	it("does not repeat itself on the next check", async () => {
		await checkDestinations({ now: Date.now() + 26 * HOUR, staleHours: 24 });
		assert.equal((await events("backup.destination_stale")).length, 1);
	});

	it("reminds once a day while it lasts", async () => {
		await checkDestinations({ now: Date.now() + 51 * HOUR, staleHours: 24 });
		assert.equal((await events("backup.destination_stale")).length, 2);
	});

	it("says when it has caught up, once", async () => {
		fs.rmSync(broken);
		fs.mkdirSync(broken);
		const retried = await api.post("/api/settings/backup-destinations/retry", {});
		assert.equal(retried.json.copied, 1, JSON.stringify(retried.json));
		assert.deepEqual(await checkDestinations({ now: Date.now() + 52 * HOUR, staleHours: 24 }), []);
		assert.equal((await events("backup.destination_recovered")).length, 1);
		assert.match((await events("backup.destination_recovered"))[0].message, /Shelf has caught up/);
		await checkDestinations({ now: Date.now() + 53 * HOUR, staleHours: 24 });
		assert.equal((await events("backup.destination_recovered")).length, 1, "and not again");
	});

	it("is a setting, 24 hours unless changed", async () => {
		assert.equal((await api.get("/api/settings")).json.config.notifications.destinationStaleHours, 24);
		assert.equal(dest.enabled, true);
	});
});

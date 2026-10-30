import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { startInstance, serverEntry, freePort, until, GUEST } from "../helpers/instance.js";
import { makeFakeGame, killFakeGames } from "../helpers/fakeGame.js";

// Before a game update the servers are stopped and a backup of their save folders is taken, so SteamCMD never
// changes files under a save that is still being copied. A backup that fails stops the update and starts the
// servers that were running again. These run through the panel's own API against the stand-in game. The update
// itself runs a stand-in SteamCMD (node.exe, which exits at once), since only the log file it leaves matters here.

// Makes a fake game updatable: the update needs an app id, and the SteamCMD path has to exist.
const UPDATABLE = { updateAppId: "2430930", steamCmdPath: process.execPath };
const enc = encodeURIComponent;
// Each update writes its own log file here, so a new one appearing means SteamCMD was started.
const updateLogsOf = (panelDir) => {
	const dir = path.join(panelDir, "jobs", "update");
	return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
};

describe("backing up a game before it is updated", () => {
	let panel;
	let api;
	let folder;
	const name = "Fake Update";
	const base = `/api/server/${enc(name)}`;
	const preUpdate = async () => (await api.get(`${base}/backups`)).json.backups.filter((b) => b.kind === "pre-update");
	const busy = async (who) => (await api.get("/api/operations")).json[who];

	before(async () => {
		const rconPort = await freePort();
		panel = await startInstance({
			servers: (dir) => {
				folder = path.join(dir, "fake-update");
				const bare = path.join(dir, "bare-game");
				fs.mkdirSync(bare, { recursive: true });
				return [
					{ ...makeFakeGame(folder, { name, rconPort, exe: "gp-fake-update.exe" }), ...UPDATABLE },
					// A game with no save folders set up anywhere: nothing to back up, so the update should still go ahead.
					serverEntry(bare, { name: "Bare Game", processName: "nope-bare.exe", ...UPDATABLE }),
				];
			},
		});
		api = panel.api;
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	it("takes a pre-update backup, runs the update, and says so", async () => {
		const r = await api.post(`/api/control/${enc(name)}/update`, {});
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.match(r.json.message, /Backed up first\./);
		assert.equal((await preUpdate()).length, 1, "one pre-update backup");
		const log = r.json.message.match(/Log: (.+)$/)[1];
		assert.ok(fs.existsSync(log), "the update log exists, so SteamCMD was started");
		await until(async () => !(await busy(name)), { timeoutMs: 30_000 });
	});

	it("the setting can be turned off for one server: then the update takes no backup", async () => {
		const off = await api.put(`${base}/backups/settings`, { beforeUpdate: false });
		assert.equal(off.status, 200, JSON.stringify(off.json));
		assert.equal(off.json.beforeUpdate, false);
		assert.equal(off.json.effectiveBeforeUpdate, false);

		const r = await api.post(`/api/control/${enc(name)}/update`, {});
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.doesNotMatch(r.json.message, /Backed up first/);
		assert.equal((await preUpdate()).length, 1, "still only the one from before");
		await until(async () => !(await busy(name)), { timeoutMs: 30_000 });
	});

	it("refuses anything but true, false or null for the setting", async () => {
		const r = await api.put(`${base}/backups/settings`, { beforeUpdate: "yes" });
		assert.equal(r.status, 400);
		assert.equal(r.json.code, "bad_bool");
	});

	it("null hands the choice back to the panel-wide setting, which is on", async () => {
		const r = await api.put(`${base}/backups/settings`, { beforeUpdate: null });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(r.json.beforeUpdate, null);
		assert.equal(r.json.effectiveBeforeUpdate, true);
	});

	it("a game with no save folders set up is noted in the update log and updated anyway", async () => {
		const r = await api.post(`/api/control/${enc("Bare Game")}/update`, {});
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.doesNotMatch(r.json.message, /Backed up first/);
		// The log is written as the update starts, so wait for the line to land rather than reading a file still being written.
		const logPath = r.json.message.match(/Log: (.+)$/)[1];
		const read = () => (fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "");
		assert.equal(await until(async () => /Bare Game not backed up before the update: No folders are set up/.test(read()), { timeoutMs: 10_000 }), true, read());
		await until(async () => !(await busy("Bare Game")), { timeoutMs: 30_000 });
	});
});

describe("a backup that fails stops the update", () => {
	let panel;
	let api;
	let folder;
	const name = "Fake Refuse";
	const base = `/api/server/${enc(name)}`;
	const online = async () => (await api.get("/api/status")).json[name]?.online === true;
	const preUpdate = async () => (await api.get(`${base}/backups`)).json.backups.filter((b) => b.kind === "pre-update");
	const busy = async () => (await api.get("/api/operations")).json[name];

	before(async () => {
		const rconPort = await freePort();
		panel = await startInstance({
			// Asks for more free space than any disk has, so every backup is refused.
			config: { backups: { minFreeGB: 100000 } },
			servers: (dir) => {
				folder = path.join(dir, "fake-refuse");
				return [{ ...makeFakeGame(folder, { name, rconPort, exe: "gp-fake-refuse.exe" }), ...UPDATABLE }];
			},
		});
		api = panel.api;
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	it("refuses the update with 409, starts no SteamCMD, and starts the server that was running again", async () => {
		assert.equal((await api.post(`/api/control/${enc(name)}/start`)).status, 200);
		assert.equal(await until(online), true);
		// The start holds the server's lock until it has really come up, a moment after the status shows online.
		assert.equal(await until(async () => !(await busy())), true);
		const logsBefore = updateLogsOf(panel.dir).length;

		const r = await api.post(`/api/control/${enc(name)}/update`, {});
		assert.equal(r.json.code, "backup_failed");
		assert.equal(r.status, 409, JSON.stringify(r.json));
		assert.match(r.json.error, /Backup before the update failed for Fake Refuse/);
		assert.match(r.json.error, /so the update was not run/);
		assert.equal(updateLogsOf(panel.dir).length, logsBefore, "no update log appeared, so SteamCMD never ran");
		assert.equal((await preUpdate()).length, 0);
		assert.equal(await until(online), true, "it was running before, so it is running again");
		await until(async () => !(await busy()), { timeoutMs: 30_000 });
	});

	it("with proceedWithoutBackup the update goes ahead, with no pre-update backup", async () => {
		const logsBefore = updateLogsOf(panel.dir).length;
		const r = await api.post(`/api/control/${enc(name)}/update`, { proceedWithoutBackup: true });
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.doesNotMatch(r.json.message, /Backed up first/);
		assert.equal(updateLogsOf(panel.dir).length, logsBefore + 1, "SteamCMD ran");
		assert.equal((await preUpdate()).length, 0);
		const activity = (await api.get("/api/activity?limit=100")).json;
		assert.ok(activity.some((e) => e.type === "update.backup_skipped" && e.server === name), "the skip is in the activity feed");
		await until(async () => !(await busy()), { timeoutMs: 30_000 });
	});

	it("only a real true skips the backup: a truthy string does not", async () => {
		const r = await api.post(`/api/control/${enc(name)}/update`, { proceedWithoutBackup: "yes" });
		assert.equal(r.status, 409, JSON.stringify(r.json));
	});
});

describe("a shared ARK install backs up every map the update stops", () => {
	let panel;
	let api;
	let install;

	before(async () => {
		panel = await startInstance({
			servers: (dir) => {
				install = path.join(dir, "ark-asa");
				const saved = path.join(install, "ShooterGame", "Saved");
				for (const rel of ["RagnarokSave", "IslandSave", "SavedArks/TheIsland_WP", "Config/WindowsServer"]) fs.mkdirSync(path.join(saved, rel), { recursive: true });
				fs.mkdirSync(path.join(install, "ClusterStorage"), { recursive: true });
				const script = (name, map, alt) => {
					const file = path.join(install, `Start_${name}.bat`);
					fs.writeFileSync(file, `start /MIN "${name}" ArkAscendedServer.exe ${map}?SessionName=${name}${alt ? `?AltSaveDirectoryName=${alt}` : ""}?MaxPlayers=10 -RCONPort=27025\r\n`);
					return file;
				};
				const entry = (name, file) => serverEntry(install, { name, type: "ark", processName: `nope-${name}.exe`, startScriptPath: file, workingDir: install, installDir: install, ...UPDATABLE });
				return [entry("Ragnarok", script("Ragnarok", "Ragnarok_WP", "RagnarokSave")), entry("Island", script("Island", "TheIsland_WP", "IslandSave")), entry("Plain", script("Plain", "TheIsland_WP", null))];
			},
		});
		api = panel.api;
	});
	after(() => panel.stop());

	it("updating one map backs up every sibling first", async () => {
		const r = await api.post("/api/control/Ragnarok/update", {});
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.match(r.json.message, /Backed up first\./);
		for (const name of ["Ragnarok", "Island", "Plain"]) {
			const backups = (await api.get(`/api/server/${name}/backups`)).json.backups;
			assert.equal(backups.filter((b) => b.kind === "pre-update").length, 1, `${name} has a pre-update backup`);
		}
		await until(async () => !(await api.get("/api/operations")).json.Ragnarok, { timeoutMs: 30_000 });
	});
});

// After an update-and-reboot the panel watches each restarted server for a while. A server that comes online in time is "ok" and a
// server that does not is "failed", with a line in the activity feed so someone knows to look. The health timeout is set through the
// settings page; its smallest allowed value is one minute, so the failing case takes about a minute to show.
describe("the health check after an update-and-reboot", () => {
	let panel;
	let api;
	let folder;
	const name = "Fake Health";
	const base = `/api/server/${enc(name)}`;
	const online = async () => (await api.get("/api/status")).json[name]?.online === true;
	const busy = async () => (await api.get("/api/operations")).json[name];
	const status = async (opts) => (await api.get(`/api/control/${enc(name)}/update/status`, opts)).json;
	const activity = async () => (await api.get("/api/activity?limit=200")).json;
	const healthEvents = async () => (await activity()).filter((e) => e.server === name && /^update\.(failed|verified)$/.test(e.type));
	const preUpdateBackupId = async () => (await api.get(`${base}/backups`)).json.backups.find((b) => b.kind === "pre-update")?.id;

	before(async () => {
		const rconPort = await freePort();
		panel = await startInstance({
			servers: (dir) => {
				folder = path.join(dir, "fake-health");
				return [{ ...makeFakeGame(folder, { name, rconPort, exe: "gp-fake-health.exe" }), ...UPDATABLE }];
			},
		});
		api = panel.api;
	});
	after(async () => {
		killFakeGames(folder);
		await panel.stop();
	});

	it("a server that never comes back is marked failed, with its pre-update backup, and the feed says so", async () => {
		assert.equal((await api.post(`/api/control/${enc(name)}/start`)).status, 200);
		assert.equal(await until(online), true);
		assert.equal(await until(async () => !(await busy())), true);

		const script = path.join(folder, "Start_Fake.bat");
		const original = fs.readFileSync(script, "utf8");
		// The restart now runs a start script that launches nothing, so the server never reports online.
		fs.writeFileSync(script, "@echo off\r\nexit /b 0\r\n");
		try {
			const put = await api.put("/api/settings", { gameUpdates: { healthTimeoutMin: 1 } });
			assert.equal(put.status, 200, JSON.stringify(put.json));

			const r = await api.post(`/api/control/${enc(name)}/update-reboot`, {});
			assert.equal(r.status, 200, JSON.stringify(r.json));
			assert.equal(await until(async () => !(await busy())), true, "the update itself finishes without waiting for the health check");

			const latest = await until(async () => {
				const s = await status();
				return s.latest?.outcome === "failed" ? s : null;
			}, { timeoutMs: 150_000 });
			assert.ok(latest, JSON.stringify(await status()));
			assert.equal(latest.latest.backupId, await preUpdateBackupId(), "the record names the backup taken before the update");
			assert.equal(latest.healthTimeoutMin, 1);
			const failed = (await healthEvents()).filter((e) => e.type === "update.failed");
			assert.equal(failed.length, 1, "exactly one update.failed for the server");
			assert.match(failed[0].message, /did not come back online within 1 minutes/);
		} finally {
			fs.writeFileSync(script, original);
			await api.put("/api/settings", { gameUpdates: { healthTimeoutMin: 10 } });
		}
	});

	it("a server that comes back is marked ok, and the feed says it was verified", async () => {
		// Stopped by the failed update above, so it is started again and then updated with a reboot.
		assert.equal((await api.post(`/api/control/${enc(name)}/start`)).status, 200);
		assert.equal(await until(online), true);
		assert.equal(await until(async () => !(await busy())), true);
		const previousAt = (await status()).latest?.at;

		const r = await api.post(`/api/control/${enc(name)}/update-reboot`, {});
		assert.equal(r.status, 200, JSON.stringify(r.json));
		const latest = await until(async () => {
			const s = await status();
			return s.latest && s.latest.at !== previousAt && s.latest.outcome !== "checking" ? s : null;
		}, { timeoutMs: 120_000 });
		assert.equal(latest?.latest?.outcome, "ok", JSON.stringify(latest));
		assert.equal(await until(online), true, "it really is back");
		assert.ok((await healthEvents()).some((e) => e.type === "update.verified"), "the feed records the server as verified");
		await until(async () => !(await busy()), { timeoutMs: 30_000 });
	});

	it("a plain update (no reboot) is recorded as updated and never health-checked", async () => {
		const previousAt = (await status()).latest?.at;
		const seen = (await healthEvents()).length;
		const r = await api.post(`/api/control/${enc(name)}/update`, {});
		assert.equal(r.status, 200, JSON.stringify(r.json));
		assert.equal(await until(async () => !(await busy()), { timeoutMs: 30_000 }), true);
		const s = await status();
		assert.notEqual(s.latest?.at, previousAt);
		assert.equal(s.latest?.outcome, "updated");
		await new Promise((resolve) => setTimeout(resolve, 2000));
		assert.equal((await healthEvents()).length, seen, "no update.failed or update.verified was added");
	});

	it("the status needs the update permission: a guest gets 403, an admin gets the record", async () => {
		const guest = await api.cookieFor(GUEST);
		const denied = await api.get(`/api/control/${enc(name)}/update/status`, { cookie: guest });
		assert.equal(denied.status, 403);
		const allowed = await status();
		assert.ok(Array.isArray(allowed.history));
		assert.ok(allowed.history.length <= 5);
	});
});

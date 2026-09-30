// Day-to-day running of a server: backups, and (added alongside) logs, players and
// activity. Everything here is open to a moderator as well as an admin, each route
// naming the permission it needs; the ones that change how a server is set up or
// replace its files (restore, delete, settings) ask for more.
import express from "express";
import { get as getServer, all as allServers } from "../data/serverStore.js";
import { getOptions, setOptions } from "../data/serverOptions.js";
import { requirePermission, canAccessServer } from "../middleware/permissions.js";
import { listTasks, addTask, updateTask, removeTask, runTask } from "../services/scheduler.js";
import { recoveryState } from "../services/crashWatcher.js";
import { recentActivity } from "../services/activityLog.js";
import { listLogs, readLog, searchLog } from "../services/logService.js";
import { playersFor } from "../services/playerTracker.js";
import { readSeries, RANGES } from "../services/metrics.js";
import { statsFor } from "../services/playerStats.js";
import { runDetached } from "../services/serverOps.js";
import {
	BackupError,
	backupOverview,
	createBackup,
	deleteBackup,
	restoreBackup,
	validateBackupPaths,
} from "../services/backupService.js";
import { listDestinations, replicationFor, listRemote, fetchRemote, backfill } from "../services/backupDestinations.js";

const router = express.Router();

router.param("serverName", (req, res, next, name) => {
	const server = getServer(name);
	if (!server) return res.status(404).json({ error: "Server not found" });
	req.server = server;
	next();
});

function fail(res, err, what) {
	if (err instanceof BackupError || err.status) {
		return res.status(err.status ?? 400).json({ error: err.message, code: err.code });
	}
	console.error(`${what} failed:`, err);
	res.status(500).json({ error: `${what} failed: ${err.message}` });
}

// ---- backups ----------------------------------------------------------------

router.get("/server/:serverName/backups", requirePermission("server.backup"), async (req, res) => {
	try {
		const overview = await backupOverview(req.server);
		// Where each backup has been copied, so the list can show it.
		res.json({ ...overview, replication: await replicationFor(req.server), destinations: (await listDestinations()).map((d) => ({ id: d.id, name: d.name, type: d.type, enabled: d.enabled })) });
	} catch (err) {
		fail(res, err, "Reading the backups");
	}
});

// Answers as soon as the checks pass; the copy itself (and a stop and start around
// it, for games that can't save on command) carries on, reported over the live
// stream and in the activity log.
router.post("/server/:serverName/backups", requirePermission("server.backup"), async (req, res) => {
	const { mode, reason } = req.body ?? {};
	if (mode !== undefined && !["stop", "live"].includes(mode)) {
		return res.status(400).json({ error: 'mode must be "stop" or "live".' });
	}
	try {
		const started = await runDetached(req.server.name, "backing up", async (report) => {
			const made = await createBackup(req.server, {
				kind: "manual",
				mode: mode ?? null,
				reason: typeof reason === "string" ? reason.slice(0, 200) : null,
				onReady: () => report({ started: true }),
			});
			report({ started: true, backup: made });
		});
		res.status(202).json(started);
	} catch (err) {
		fail(res, err, "The backup");
	}
});

// What a destination holds for this server, and pulling a copy back into the local folder.
router.get("/server/:serverName/backups/offsite/:destId", requirePermission("server.backup"), async (req, res) => {
	try {
		res.json({ backups: await listRemote(req.params.destId, req.server) });
	} catch (err) {
		fail(res, err, "Reading the destination");
	}
});

router.post("/server/:serverName/backups/offsite/:destId/sync", requirePermission("server.backup"), async (req, res) => {
	try {
		res.json(await backfill(req.params.destId, req.server));
	} catch (err) {
		fail(res, err, "Copying to the destination");
	}
});

router.post("/server/:serverName/backups/offsite/:destId/:id/fetch", requirePermission("backup.restore"), async (req, res) => {
	try {
		res.json(await fetchRemote(req.params.destId, req.server, req.params.id));
	} catch (err) {
		fail(res, err, "Downloading the backup");
	}
});

router.delete("/server/:serverName/backups/:id", requirePermission("backup.delete"), async (req, res) => {
	try {
		await deleteBackup(req.server, req.params.id);
		res.json({ success: true });
	} catch (err) {
		fail(res, err, "Deleting the backup");
	}
});

router.post("/server/:serverName/backups/:id/restore", requirePermission("backup.restore"), async (req, res) => {
	if (req.body?.confirmName !== req.server.name) {
		return res.status(400).json({ error: "Type the server's exact name to confirm a restore.", code: "confirm_mismatch" });
	}
	try {
		const started = await runDetached(req.server.name, "restoring", async (report) => {
			const result = await restoreBackup(req.server, req.params.id, {
				safety: req.body?.safety !== false,
				allowShared: req.body?.allowShared === true,
				onReady: () => report({ started: true }),
			});
			report({ started: true, ...result });
		});
		res.status(202).json(started);
	} catch (err) {
		fail(res, err, "The restore");
	}
});

// What gets backed up, how, and how many are kept.
router.put("/server/:serverName/backups/settings", requirePermission("backup.settings"), async (req, res) => {
	const { paths, mode, keepCount, keepDays } = req.body ?? {};
	const patch = {};
	try {
		if (paths !== undefined) patch.paths = paths === null ? null : validateBackupPaths(paths);
		if (mode !== undefined) {
			if (!["auto", "stop", "live"].includes(mode)) throw new BackupError('mode must be "auto", "stop" or "live".', "bad_mode");
			patch.mode = mode;
		}
		for (const [key, value] of Object.entries({ keepCount, keepDays })) {
			if (value === undefined) continue;
			if (value !== null && (!Number.isInteger(value) || value < 0 || value > 3650)) throw new BackupError(`${key} must be a whole number or null.`, "bad_number");
			patch[key] = value;
		}
		await setOptions(req.server.name, { backup: patch });
		res.json(await backupOverview(req.server));
	} catch (err) {
		fail(res, err, "Saving the backup settings");
	}
});

// ---- what a server does on its own ------------------------------------------

router.get("/server/:serverName/options", requirePermission("server.control"), (req, res) => {
	const { autoRestart, autoStart, restartWhenUnresponsive, unresponsiveMinutes } = getOptions(req.server.name);
	res.json({ autoRestart, autoStart, restartWhenUnresponsive, unresponsiveMinutes, recovery: recoveryState(req.server.name) });
});

router.put("/server/:serverName/options", requirePermission("server.options"), async (req, res) => {
	const patch = {};
	for (const key of ["autoRestart", "autoStart"]) {
		if (req.body?.[key] === undefined) continue;
		if (typeof req.body[key] !== "boolean") return res.status(400).json({ error: `${key} must be true or false.` });
		patch[key] = req.body[key];
	}
	if (req.body?.restartWhenUnresponsive !== undefined) {
		if (typeof req.body.restartWhenUnresponsive !== "boolean") return res.status(400).json({ error: "restartWhenUnresponsive must be true or false." });
		patch.restartWhenUnresponsive = req.body.restartWhenUnresponsive;
	}
	if (req.body?.unresponsiveMinutes !== undefined) {
		const m = req.body.unresponsiveMinutes;
		if (!Number.isInteger(m) || m < 1 || m > 240) return res.status(400).json({ error: "unresponsiveMinutes must be a whole number from 1 to 240." });
		patch.unresponsiveMinutes = m;
	}
	const { autoRestart, autoStart, restartWhenUnresponsive, unresponsiveMinutes } = await setOptions(req.server.name, patch);
	res.json({ autoRestart, autoStart, restartWhenUnresponsive, unresponsiveMinutes, recovery: recoveryState(req.server.name) });
});

// ---- schedules ------------------------------------------------------------------

router.get("/schedules", requirePermission("schedules.view"), (req, res) => {
	// A limited moderator only sees schedules that involve their servers.
	res.json(listTasks().filter((t) => t.servers.some((s) => canAccessServer(req.user, s))));
});

router.post("/schedules", requirePermission("schedules.manage"), async (req, res) => {
	try {
		res.json(await addTask(req.body));
	} catch (err) {
		res.status(err.status ?? 500).json({ error: err.message });
	}
});

router.put("/schedules/:id", requirePermission("schedules.manage"), async (req, res) => {
	try {
		const task = await updateTask(req.params.id, req.body ?? {});
		if (!task) return res.status(404).json({ error: "No such schedule." });
		res.json(task);
	} catch (err) {
		res.status(err.status ?? 500).json({ error: err.message });
	}
});

router.delete("/schedules/:id", requirePermission("schedules.manage"), async (req, res) => {
	if (!(await removeTask(req.params.id))) return res.status(404).json({ error: "No such schedule." });
	res.json({ success: true });
});

// Runs in the background; the result shows in the activity log and on the schedule.
router.post("/schedules/:id/run", requirePermission("schedules.manage"), (req, res) => {
	if (!listTasks().some((t) => t.id === req.params.id)) return res.status(404).json({ error: "No such schedule." });
	runTask(req.params.id, { manual: true }).catch((err) => console.error("[schedule] manual run failed:", err));
	res.status(202).json({ started: true });
});

// ---- logs and players -------------------------------------------------------------

router.get("/server/:serverName/logs", requirePermission("server.logs"), async (req, res) => {
	const logs = await listLogs(req.server);
	// The folder paths are the owner's business; callers get names and ids.
	res.json(logs.map(({ path: _path, ...rest }) => rest));
});

// Anything that looks like a password is masked unless the caller is an admin.
router.get("/server/:serverName/logs/:id", requirePermission("server.logs"), async (req, res) => {
	const redact = req.user.role !== "admin";
	try {
		const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
		if (search) {
			const found = await searchLog(req.server, req.params.id, search, { redact });
			return found ? res.json(found) : res.status(404).json({ error: "No such log." });
		}
		const since = req.query.since !== undefined ? Number(req.query.since) : null;
		const result = await readLog(req.server, req.params.id, {
			lines: Number(req.query.lines) || 300,
			since: Number.isFinite(since) ? since : null,
			redact,
		});
		result ? res.json(result) : res.status(404).json({ error: "No such log." });
	} catch (err) {
		console.error("Reading a log failed:", err);
		res.status(500).json({ error: "Couldn't read that log." });
	}
});

router.get("/server/:serverName/players", requirePermission("server.players"), (req, res) => {
	res.json(playersFor(req.server.name));
});

// ---- how busy things have been --------------------------------------------------

const rangeOf = (req) => (RANGES[req.query.range] ? req.query.range : "24h");

router.get("/metrics/system", requirePermission("metrics.view"), async (req, res) => {
	res.json(await readSeries("system", rangeOf(req)));
});

router.get("/server/:serverName/metrics", requirePermission("metrics.view"), async (req, res) => {
	res.json(await readSeries(`server:${req.server.name}`, rangeOf(req)));
});

router.get("/server/:serverName/player-stats", requirePermission("server.players"), async (req, res) => {
	const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
	res.json(await statsFor(req.server.name, days));
});

// ---- what has happened -----------------------------------------------------------

// Newest first. A limited moderator only sees events for their servers (and the
// ones about no server in particular, like a skipped schedule).
router.get("/activity", requirePermission("activity.view"), (req, res) => {
	const limit = Math.min(Number(req.query.limit) || 100, 500);
	const types = typeof req.query.types === "string" && req.query.types ? req.query.types.split(",") : null;
	const server = typeof req.query.server === "string" && req.query.server ? req.query.server : null;
	if (server && !canAccessServer(req.user, server)) {
		return res.status(403).json({ error: "You don't have access to that server.", code: "forbidden_server" });
	}
	res.json(recentActivity({ server, types, limit }).filter((e) => !e.server || canAccessServer(req.user, e.server)));
});

// ---- a server as a moderator may see it -------------------------------------

router.get("/server/:serverName/overview", requirePermission("server.control"), (req, res) => {
	const server = req.server;
	const options = getOptions(server.name);
	res.json({
		name: server.name,
		type: server.type,
		hasRcon: Boolean(server.rconPort && server.rconPassword),
		hasUpdate: Boolean(server.updateAppId),
		autoRestart: options.autoRestart,
		autoStart: options.autoStart,
	});
});

// The servers this person may act on, so a limited moderator's dashboard can say so.
router.get("/my-servers", (req, res) => {
	res.json(allServers().filter((s) => canAccessServer(req.user, s.name)).map((s) => s.name));
});

export default router;

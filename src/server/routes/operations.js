// Day-to-day running of a server: backups, and (added alongside) logs, players and
// activity. Everything here is open to a moderator as well as an admin, each route
// naming the permission it needs; the ones that change how a server is set up or
// replace its files (restore, delete, settings) ask for more.
import express from "express";
import { get as getServer, all as allServers } from "../data/serverStore.js";
import { getOptions, setOptions } from "../data/serverOptions.js";
import { requirePermission, canAccessServer, can } from "../middleware/permissions.js";
import { listTasks, addTask, updateTask, removeTask, runTask } from "../services/scheduler.js";
import { recoveryState } from "../services/crashWatcher.js";
import { recentActivity, logActivity, allActivity, formatActivity, searchActivity } from "../services/activityLog.js";
import { requireRole } from "../middleware/auth.js";
import { listLogs, readLog, searchLog } from "../services/logService.js";
import { playersFor } from "../services/playerTracker.js";
import { serverStatus } from "../services/pollingService.js";
import { firewallReport, lanAddresses, ruleCommands, runElevated, forgetFirewallCache } from "../services/firewallCheck.js";
import { serverChecklist, summarise } from "../services/setupChecklist.js";
import { PlayerAdminError, capabilities, readLists, kickPlayer, banPlayer, unbanPlayer, addToList, removeFromList, setOpLevel } from "../services/playerAdmin.js";
import { readSeries, RANGES } from "../services/metrics.js";
import { statsFor } from "../services/playerStats.js";
import { runDetached } from "../services/serverOps.js";
import { isServerRunning } from "../services/serverState.js";
import {
	BackupError,
	backupOverview,
	createBackup,
	deleteBackup,
	isBackupId,
	listBackups,
	recompressBackup,
	restoreBackup,
	validateBackupPaths,
} from "../services/backupService.js";
import { formatBytes } from "../services/storageService.js";
import { listDestinations, replicationFor, listRemote, fetchRemote, backfill } from "../services/backupDestinations.js";
import { FORMATS } from "../util/archiveFormats.js";

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

// Rewrites backups in another format or level, one after another, in the background like a backup. Holds the server's lock
// for the whole run, so a restore or delete can't interleave with it. With no ids, every backup not already in that format and
// level is done. A backup that fails is recorded and the rest carry on.
router.post("/server/:serverName/backups/recompress", requirePermission("server.backup"), async (req, res) => {
	const { format, level, ids } = req.body ?? {};
	if (typeof format !== "string" || !Object.hasOwn(FORMATS, format)) return res.status(400).json({ error: 'format must be "zip", "zstd" or "xz".', code: "bad_format" });
	if (typeof level !== "string" || !["fast", "balanced", "max"].includes(level)) return res.status(400).json({ error: 'level must be "fast", "balanced" or "max".', code: "bad_level" });
	// Every id is checked before any work starts, so one bad id doesn't leave some backups done and others not.
	if (ids !== undefined) {
		if (!Array.isArray(ids) || ids.length > 200) return res.status(400).json({ error: "ids must be a list of up to 200 backup ids.", code: "bad_ids" });
		if (!ids.every(isBackupId)) return res.status(400).json({ error: "That isn't a valid backup id.", code: "bad_id" });
	}
	try {
		const started = await runDetached(req.server.name, "recompressing", async (report) => {
			report({ started: true });
			const targets = ids ?? (await listBackups(req.server)).filter((b) => !(b.format === format && b.level === level)).map((b) => b.id);
			const results = [];
			let saved = 0;
			for (const id of targets) {
				try {
					const done = await recompressBackup(req.server, id, { format, level });
					results.push({ id, skipped: done.skipped === true, before: done.before, after: done.after });
					if (!done.skipped) saved += Math.max(0, done.before - done.after);
				} catch (err) {
					results.push({ id, error: err.message, code: err.code ?? null });
				}
			}
			const failed = results.filter((r) => r.error).length;
			const recompressed = results.filter((r) => !r.error && !r.skipped).length;
			logActivity({ type: "backup.recompress_done", server: req.server.name, message: `Recompressed ${recompressed} backups, saved ${formatBytes(saved)} (${failed} failed).` });
			report({ done: true, results });
		});
		res.status(202).json(started);
	} catch (err) {
		fail(res, err, "Recompressing the backups");
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
	// A restore that first takes a safety backup can be undone, so a plain "yes" is enough. Without that safety net,
	// the server's exact name has to be typed.
	const safety = req.body?.safety !== false;
	if (safety ? req.body?.confirm !== true && req.body?.confirmName !== req.server.name : req.body?.confirmName !== req.server.name) {
		return res.status(400).json({ error: safety ? "Confirm the restore first." : "Type the server's exact name to restore without a safety backup.", code: "confirm_mismatch" });
	}
	try {
		const started = await runDetached(req.server.name, "restoring", async (report) => {
			const result = await restoreBackup(req.server, req.params.id, {
				safety,
				allowShared: req.body?.allowShared === true,
				restart: req.body?.restart === true,
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
	const { paths, mode, keepCount, keepDays, keepDaily, keepWeekly, keepMonthly, keepManual, skipUnchanged, format, level, maxTotalBytes } = req.body ?? {};
	const patch = {};
	try {
		if (paths !== undefined) patch.paths = paths === null ? null : validateBackupPaths(paths);
		if (mode !== undefined) {
			if (!["auto", "stop", "live"].includes(mode)) throw new BackupError('mode must be "auto", "stop" or "live".', "bad_mode");
			patch.mode = mode;
		}
		// Object.hasOwn rather than `in`, so a name like "__proto__" or "toString" from the request is refused. The string check keeps
		// an array or number that happens to match a key from getting through.
		if (format !== undefined) {
			if (format !== null && (typeof format !== "string" || !Object.hasOwn(FORMATS, format))) throw new BackupError('format must be "zip", "zstd", "xz" or null.', "bad_format");
			patch.format = format;
		}
		if (level !== undefined) {
			if (level !== null && (typeof level !== "string" || !["fast", "balanced", "max"].includes(level))) throw new BackupError('level must be "fast", "balanced", "max" or null.', "bad_level");
			patch.level = level;
		}
		// The limits for each whole-number setting. keepDays 0 means "no age limit"; keepCount 0 would delete each scheduled
		// backup as soon as it was made. The keys are fixed here, so a request can't name any other option.
		// maxTotalBytes is the per-server size limit in bytes: at least 1 MB, and at most 10 TB. Null means no limit.
		const limits = {
			keepCount: { min: 1, max: 3650 },
			keepDays: { min: 0, max: 3650 },
			keepDaily: { min: 0, max: 3650 },
			keepWeekly: { min: 0, max: 3650 },
			keepMonthly: { min: 0, max: 3650 },
			keepManual: { min: 0, max: 500 },
			maxTotalBytes: { min: 1_000_000, max: 10_000_000_000_000 },
		};
		const numbers = { keepCount, keepDays, keepDaily, keepWeekly, keepMonthly, keepManual, maxTotalBytes };
		for (const [key, value] of Object.entries(numbers)) {
			if (value === undefined) continue;
			const { min, max } = limits[key];
			if (value !== null && (!Number.isInteger(value) || value < min || value > max)) throw new BackupError(`${key} must be a whole number from ${min} to ${max}, or null.`, "bad_number");
			patch[key] = value;
		}
		if (skipUnchanged !== undefined) {
			if (skipUnchanged !== null && typeof skipUnchanged !== "boolean") throw new BackupError("skipUnchanged must be true, false or null.", "bad_bool");
			patch.skipUnchanged = skipUnchanged;
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
	const data = playersFor(req.server.name);
	// The game says how many are on but not who (Valheim without a log file to read): shown as a count rather than as nobody.
	const unnamed = serverStatus[req.server.name]?.online ? Math.max(0, (serverStatus[req.server.name].playerCount ?? 0) - data.online.length) : 0;
	res.json({ ...data, unnamed });
});

// ---- kicking, banning and the lists ---------------------------------------------

function adminFail(res, err, what) {
	if (err instanceof PlayerAdminError) return res.status(err.status).json({ error: err.message, code: err.code });
	if (err.code === "path_not_allowed") return res.status(403).json({ error: err.message, code: err.code });
	console.error(`${what} failed:`, err);
	res.status(500).json({ error: `${what} failed: ${err.message}` });
}

router.get("/server/:serverName/player-admin", requirePermission("server.players"), async (req, res) => {
	const caps = capabilities(req.server);
	let lists = [];
	let listError = null;
	if (caps.lists.length > 0) {
		try {
			lists = await readLists(req.server);
		} catch (err) {
			listError = err.message;
		}
	}
	res.json({ ...caps, lists, listError, running: lists.some((l) => l.levels) ? await isServerRunning(req.server) : false, canBan: can(req.user, "players.ban"), canKick: can(req.user, "players.kick") });
});

const actorOf = (req) => req.user?.username ?? null;

router.post("/server/:serverName/players/kick", requirePermission("players.kick"), async (req, res) => {
	try {
		res.json(await kickPlayer(req.server, req.body?.player, req.body?.reason, actorOf(req)));
	} catch (err) {
		adminFail(res, err, "Kicking");
	}
});

router.post("/server/:serverName/players/ban", requirePermission("players.ban"), async (req, res) => {
	try {
		res.json(await banPlayer(req.server, req.body?.player, req.body?.reason, actorOf(req)));
	} catch (err) {
		adminFail(res, err, "Banning");
	}
});

router.post("/server/:serverName/players/unban", requirePermission("players.ban"), async (req, res) => {
	try {
		res.json(await unbanPlayer(req.server, req.body?.player, actorOf(req)));
	} catch (err) {
		adminFail(res, err, "Unbanning");
	}
});

router.post("/server/:serverName/player-lists/:list", requirePermission("players.ban"), async (req, res) => {
	try {
		res.json(await addToList(req.server, req.params.list, req.body?.player, actorOf(req), { level: req.body?.level }));
	} catch (err) {
		adminFail(res, err, "Adding to the list");
	}
});

// A Minecraft operator's level (1 to 4).
router.put("/server/:serverName/player-lists/admins/:player/level", requirePermission("players.ban"), async (req, res) => {
	try {
		res.json(await setOpLevel(req.server, req.params.player, req.body?.level, actorOf(req)));
	} catch (err) {
		adminFail(res, err, "Changing the level");
	}
});

router.delete("/server/:serverName/player-lists/:list/:player", requirePermission("players.ban"), async (req, res) => {
	try {
		res.json(await removeFromList(req.server, req.params.list, req.params.player, actorOf(req)));
	} catch (err) {
		adminFail(res, err, "Removing from the list");
	}
});

// ---- can people reach it? ---------------------------------------------------------

router.get("/server/:serverName/checklist", requirePermission("server.control"), async (req, res) => {
	const items = await serverChecklist(req.server, { withFirewall: req.query.firewall !== "0" });
	res.json({ items, ...summarise(items) });
});

// This PC's addresses, what Windows Firewall does about the server's ports, and what the router needs.
router.get("/server/:serverName/network", requirePermission("server.control"), async (req, res) => {
	const firewall = await firewallReport(req.server, { force: req.query.refresh === "1" });
	const lan = lanAddresses();
	const gamePort = firewall.needs.find((n) => n.label === "Game port")?.port ?? firewall.needs[0]?.port ?? null;
	res.json({
		lan: lan.map((a) => ({ ...a, join: gamePort ? `${a.address}:${gamePort}` : a.address })),
		firewall,
		router: firewall.needs,
	});
});

// Opens the server's ports in Windows Firewall. Needs administrator rights on this PC, which Windows
// asks for with its own prompt; "dryRun" only returns what would be run.
router.post("/server/:serverName/network/firewall-rule", async (req, res) => {
	if (req.user?.role !== "admin") return res.status(403).json({ error: "Only an administrator can change the firewall.", code: "forbidden" });
	try {
		const firewall = await firewallReport(req.server, { force: true });
		const missing = (firewall.missing ?? firewall.needs ?? []).filter((p) => p.open !== true);
		if (missing.length === 0) return res.json({ changed: false, message: "Every port is already allowed." });
		const plan = ruleCommands(req.server, missing, { publicNetworks: req.body?.publicNetworks === true });
		if (req.body?.dryRun === true) return res.json({ changed: false, ...plan });
		await runElevated(plan.commands);
		forgetFirewallCache();
		logActivity({ type: "firewall.rule_added", server: req.server.name, message: `${req.user.username}: Opened ${missing.map((p) => `${p.port}/${p.protocol}`).join(", ")} in Windows Firewall for ${req.server.name}.` });
		res.json({ changed: true, ...plan, firewall: await firewallReport(req.server, { force: true }) });
	} catch (err) {
		res.status(err.status ?? 500).json({ error: err.message });
	}
});

// ---- how busy things have been --------------------------------------------------

// hasOwn: "constructor" and the like are on every object, and would otherwise pass for a range.
const rangeOf = (req) => (typeof req.query.range === "string" && Object.hasOwn(RANGES, req.query.range) ? req.query.range : "24h");

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
	res.json(recentActivity({ server, types, limit, canSee: (name) => canAccessServer(req.user, name) }));
});

// Search, filter and sort the whole log, a page at a time. Also says which servers and kinds of event the log holds, for the
// filter menus. A limited moderator only sees events for their servers, as in the plain list above.
router.get("/activity/search", requirePermission("activity.view"), (req, res) => {
	const list = (value) => (typeof value === "string" && value ? value.split(",").map((v) => v.trim()).filter(Boolean) : null);
	const date = (value) => (typeof value === "string" && value && Number.isFinite(Date.parse(value)) ? value : null);
	const server = typeof req.query.server === "string" && req.query.server ? req.query.server : null;
	if (server && !canAccessServer(req.user, server)) {
		return res.status(403).json({ error: "You don't have access to that server.", code: "forbidden_server" });
	}
	res.json(
		searchActivity({
			q: typeof req.query.q === "string" ? req.query.q.slice(0, 200) : "",
			types: list(req.query.types),
			levels: list(req.query.level),
			server,
			from: date(req.query.from),
			to: date(req.query.to),
			order: req.query.order === "asc" ? "asc" : "desc",
			limit: req.query.limit,
			offset: req.query.offset,
			canSee: (name) => canAccessServer(req.user, name),
		}),
	);
});

// The whole log as a file, for keeping elsewhere or handing to someone: CSV opens in a spreadsheet, JSON Lines in anything that reads
// logs. Administrators only, because it spans every server and every account's actions.
router.get("/activity/export", requireRole("admin"), (req, res) => {
	const format = req.query.format === "jsonl" ? "jsonl" : "csv";
	const date = (value) => (typeof value === "string" && value && Number.isFinite(Date.parse(value)) ? value : null);
	const types = typeof req.query.types === "string" && req.query.types ? req.query.types.split(",") : null;
	const events = allActivity({ from: date(req.query.from), to: date(req.query.to), types, server: typeof req.query.server === "string" && req.query.server ? req.query.server : null });
	res.setHeader("Content-Type", format === "jsonl" ? "application/x-ndjson; charset=utf-8" : "text/csv; charset=utf-8");
	res.setHeader("Content-Disposition", `attachment; filename="godlypanel-activity-${new Date().toISOString().slice(0, 10)}.${format}"`);
	res.send((format === "csv" ? "﻿" : "") + formatActivity(events, format));
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

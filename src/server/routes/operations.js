// Day-to-day running of a server: backups, and (added alongside) logs, players and
// activity. Everything here is open to a moderator as well as an admin, each route
// naming the permission it needs; the ones that change how a server is set up or
// replace its files (restore, delete, settings) ask for more.
import express from "express";
import { get as getServer, all as allServers } from "../data/serverStore.js";
import { getOptions, setOptions } from "../data/serverOptions.js";
import { requirePermission, canAccessServer } from "../middleware/permissions.js";
import { runDetached } from "../services/serverOps.js";
import {
	BackupError,
	backupOverview,
	createBackup,
	deleteBackup,
	restoreBackup,
	validateBackupPaths,
} from "../services/backupService.js";

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
		res.json(await backupOverview(req.server));
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

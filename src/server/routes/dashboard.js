// The read-only surface a guest is allowed to reach. Everything else lives in
// routes/api.js behind an admin check.
import express from "express";
import { serverStatus } from "../services/pollingService.js";
import { getSystemStats } from "../services/systemStats.js";
import { getServerStatsIfStale } from "../services/serverResourceStats.js";
import { getConfig } from "../config/configStore.js";
import { addSseClient } from "../services/sseHub.js";
import { sanitizeStatusMap } from "../data/sanitize.js";
import { getStorage } from "../services/storageService.js";
import { requireRole } from "../middleware/auth.js";
import { allOperations } from "../services/serverOps.js";

const router = express.Router();

router.get("/events", (req, res) => {
	addSseClient(req, res, req.user);
});

router.get("/status", (req, res) => {
	res.json(sanitizeStatusMap(serverStatus, req.user?.role));
});

router.get("/status/latest", (req, res) => {
	res.json(sanitizeStatusMap(serverStatus, req.user?.role));
});

// What each server is in the middle of (starting, stopping, updating, backing up...).
router.get("/operations", (req, res) => {
	res.json(allOperations());
});

// Cheap now (Node's own counters), so always current rather than last-polled.
router.get("/system-stats", async (req, res) => {
	res.json(await getSystemStats());
});

router.get("/server-stats", async (req, res) => {
	if (!getConfig().polling.enableServerStats) return res.json([]);
	try {
		res.json(await getServerStatsIfStale(getConfig().polling.serverStatsMs));
	} catch {
		res.json([]);
	}
});

// Served from cache — reading this never kicks off a scan, since walking a
// few hundred thousand files on request would make the dashboard hang.
// Admin only: it lists the install path of every server, which a guest has no
// business seeing.
router.get("/storage", requireRole("admin"), (req, res) => {
	res.json(getStorage());
});

export default router;

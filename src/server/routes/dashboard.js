// The read-only surface a guest is allowed to reach. Everything else lives in
// routes/api.js behind an admin check.
import express from "express";
import { serverStatus } from "../services/pollingService.js";
import { latestStats } from "../services/systemStats.js";
import { latestServerStats } from "../services/serverResourceStats.js";
import { addSseClient } from "../services/sseHub.js";
import { sanitizeStatusMap } from "../data/sanitize.js";

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

router.get("/system-stats", (req, res) => {
	res.json(latestStats || {});
});

router.get("/server-stats", (req, res) => {
	res.json(latestServerStats || []);
});

export default router;

import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import apiRouter, { broadcastSseEvent } from "./routes/api.js";
import authRoutes from "./routes/auth.js";
import { pollServers } from "./services/pollingService.js";
import { checkAndHandleUpdates } from "./services/autoUpdateService.js";
import { getSystemStats } from "./services/systemStats.js";
import { getServerResourceStats } from "./services/serverResourceStats.js";
import { cleanupStaleUploads } from "./services/modpackService.js";
import { verifyToken } from "./services/authService.js";
import { killTrackedSteamCmd, hasActiveJobs } from "./services/processRegistry.js";
import batchFileRoutes from "./routes/batchFiles.js";
import { ensureDataDirs, paths } from "./paths.js";

// Exit code the supervisor reads as "died on purpose, restart me" so it can
// tell a deliberate bail-out from a genuine crash (segfault, OOM).
const FATAL_EXIT_CODE = 17;

// An uncaught exception leaves us in an unknown state, so bail and let the
// supervisor restart cleanly rather than limping on. An unhandled REJECTION is
// different: under the old PM2 setup a flaky gamedig socket self-healed
// invisibly on the next 7.5s poll, and killing the process for one of those
// would turn a transient network blip into a visibly crashed panel for any
// user who happens to have one odd server. Log it and keep running.
process.on("uncaughtException", (err) => {
	console.error("[FATAL] Uncaught exception:", err);
	process.exit(FATAL_EXIT_CODE);
});

process.on("unhandledRejection", (reason) => {
	console.error("[WARN] Unhandled promise rejection:", reason);
});

ensureDataDirs();

const app = express();

app.use((req, res, next) => {
	console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
	next();
});

// No CORS by design: the UI is served by this same server and the Electron
// window loads it from this origin, so every request is same-origin. In the
// `dev:ui` flow, CRA's own dev-server proxy forwards /api to us, which is also
// same-origin from the browser's point of view.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Write protection. GET stays open in Stage 1 — unchanged from the original
// behaviour, deliberately: real per-role enforcement (and locking down the
// currently-public GET surface) is Stage 3's job, together with the cookie
// sessions that let the SSE endpoint authenticate at all.
function requireAdmin(req, res, next) {
	if (req.method === "GET") return next();

	const token = (req.get("authorization") || "").split(" ")[1] || "";
	const payload = token && verifyToken(token);

	if (payload?.role === "admin") return next();

	return res
		.status(401)
		.json({ error: "Unauthorized: admin login required." });
}

app.use("/api/auth", authRoutes);
app.use("/api/batch-files", requireAdmin, batchFileRoutes);
app.use("/api", requireAdmin, apiRouter);

app.use("/api/*", (req, res) => {
	console.warn("Unhandled API route:", req.method, req.originalUrl);
	res.status(404).json({ error: "API route not found" });
});

// Serve the built UI. This is what makes the whole app same-origin, so it is
// mandatory rather than the opt-in SERVE_STATIC flag the original API had.
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const uiBuildPath = path.resolve(serverDir, "..", "..", "ui", "build");

if (fs.existsSync(path.join(uiBuildPath, "index.html"))) {
	app.use(express.static(uiBuildPath));
	app.get("*", (req, res) => res.sendFile(path.join(uiBuildPath, "index.html")));
} else {
	console.warn(`[ui] No build found at ${uiBuildPath} — run "npm run build:ui".`);
	app.get("*", (req, res) =>
		res
			.status(503)
			.type("text/plain")
			.send("UI has not been built yet. Run: npm run build:ui"),
	);
}

const PORT = Number(process.env.GHP_PORT) || 8765;
const HOST = process.env.GHP_BIND_ALL === "0" ? "127.0.0.1" : "0.0.0.0";

const timers = [];
const addTimer = (fn, ms) => timers.push(setInterval(fn, ms));

const server = app.listen(PORT, HOST, () => {
	console.log(`API listening on http://${HOST}:${PORT} (data: ${paths.dataDir})`);
	process.send?.({ type: "ready", port: PORT, host: HOST });

	pollServers();
	addTimer(pollServers, 7500);

	const runSystemStatsCheck = () => {
		getSystemStats()
			.then((stats) => broadcastSseEvent({ type: "system_stats", stats }))
			.catch((err) =>
				console.error("[system-stats] Failed to read system stats:", err.message),
			);
	};
	runSystemStatsCheck();
	addTimer(runSystemStatsCheck, 10_000);

	const runServerStatsCheck = () => {
		getServerResourceStats()
			.then((stats) => broadcastSseEvent({ type: "server_stats", stats }))
			.catch((err) =>
				console.error("[server-stats] Failed to read per-server stats:", err.message),
			);
	};
	runServerStatsCheck();
	addTimer(runServerStatsCheck, 15_000);

	// The Steam build check can escalate to actually updating and restarting
	// servers, so it needs an off switch — essential when pointing a test
	// instance at a server list that references live installs. Becomes the
	// polling.enableBuildCheck setting in Stage 2.
	if (process.env.GHP_DISABLE_AUTO_UPDATE === "1") {
		console.log("[auto-update] Disabled via GHP_DISABLE_AUTO_UPDATE=1.");
	} else {
		const runUpdateCheck = () => {
			checkAndHandleUpdates().catch((err) =>
				console.error("[auto-update] Unexpected error in update check:", err),
			);
		};
		setTimeout(runUpdateCheck, 30_000);
		addTimer(runUpdateCheck, 15 * 60_000);
	}

	cleanupStaleUploads();
	addTimer(cleanupStaleUploads, 60 * 60_000);
});

server.on("error", (err) => {
	console.error("[FATAL] Could not bind HTTP server:", err.message);
	process.send?.({ type: "bind-error", code: err.code, port: PORT });
	process.exit(FATAL_EXIT_CODE);
});

let shuttingDown = false;

function shutdown(reason) {
	if (shuttingDown) return;
	shuttingDown = true;
	console.log(`[shutdown] ${reason}`);

	for (const t of timers) clearInterval(t);

	// Game servers are launched as genuinely independent processes and are
	// meant to outlive us. In-flight SteamCMD installs are not — they're
	// grandchildren of this process that Windows won't clean up on its own, so
	// they'd keep writing into a half-installed folder after we exit.
	killTrackedSteamCmd();

	server.close(() => {
		console.log("[shutdown] HTTP server closed.");
		process.exit(0);
	});
	setTimeout(() => process.exit(0), 5000).unref();
}

// Windows has no meaningful SIGTERM for a forked child, so the supervisor asks
// over IPC instead. Signals are still handled for a plain `node` run.
process.on("message", (msg) => {
	if (msg?.type === "shutdown") shutdown("requested by supervisor");
	if (msg?.type === "query-active-jobs") {
		process.send?.({ type: "active-jobs", jobs: hasActiveJobs() });
	}
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;

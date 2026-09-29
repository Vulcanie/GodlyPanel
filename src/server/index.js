import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import apiRouter from "./routes/api.js";
import { broadcastSseEvent } from "./services/sseHub.js";
import authRoutes from "./routes/auth.js";
import setupRoutes from "./routes/setup.js";
import dashboardRoutes from "./routes/dashboard.js";
import userRoutes from "./routes/users.js";
import settingsRoutes from "./routes/settings.js";
import { attachUser, requireRole } from "./middleware/auth.js";
import { createLanOnly, localAddresses } from "./middleware/lanOnly.js";
import { initUserStore, needsSetup } from "./data/userStore.js";
import { pollServers, initPollingState } from "./services/pollingService.js";
import { checkAndHandleUpdates } from "./services/autoUpdateService.js";
import { getSystemStats } from "./services/systemStats.js";
import { getServerResourceStats } from "./services/serverResourceStats.js";
import { cleanupStaleUploads } from "./services/modpackService.js";
import { killTrackedSteamCmd, hasActiveJobs } from "./services/processRegistry.js";
import batchFileRoutes from "./routes/batchFiles.js";
import { ensureDataDirs, paths } from "./paths.js";
import { initConfig, getConfig, onConfigChange } from "./config/configStore.js";
import { initSecrets } from "./config/secretsStore.js";
import { initServerStore } from "./data/serverStore.js";
import { registerTimer, scheduleAll, rescheduleAll, stopAll } from "./timerManager.js";

// Exit code the supervisor reads as "died on purpose, restart me" so it can
// tell a deliberate bail-out from a genuine crash (segfault, OOM).
const FATAL_EXIT_CODE = 17;

// An uncaught exception leaves us in an unknown state, so bail and let the
// supervisor restart cleanly rather than limping on. An unhandled REJECTION is
// different: under the old PM2 setup a flaky gamedig socket self-healed
// invisibly on the next poll, and killing the process for one of those would
// turn a transient network blip into a visibly crashed panel for any user who
// happens to have one odd server. Log it and keep running.
process.on("uncaughtException", (err) => {
	console.error("[FATAL] Uncaught exception:", err);
	process.exit(FATAL_EXIT_CODE);
});

process.on("unhandledRejection", (reason) => {
	console.error("[WARN] Unhandled promise rejection:", reason);
});

ensureDataDirs();

// Order matters: config and secrets underpin everything, and the server store
// has to be loaded before anything iterates the server list.
const config = await initConfig();
await initSecrets();
await initUserStore();
await initServerStore();
initPollingState();

if (needsSetup()) {
	console.log("[setup] No admin account yet — the panel will ask you to create one.");
}

const app = express();

// Nothing legitimate proxies this, so forwarding headers are never trusted —
// honouring them would let a caller claim to be on the LAN.
app.set("trust proxy", false);

// First, ahead of logging and body parsing: a refused request shouldn't get
// a 10MB body read off the wire before we turn it away.
app.use(createLanOnly(getConfig));

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

app.use(attachUser);

// Roles are enforced here, per route group, rather than by the old rule of
// "any GET is public, writes need admin". That rule existed because the live
// -update endpoint is an EventSource and can't send an Authorization header —
// which is no longer a constraint now that sessions are cookies on the same
// origin. Config reads in particular are admin-only: those files contain RCON
// and server passwords.
app.use("/api/setup", setupRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", requireRole("admin", "guest"), dashboardRoutes);
app.use("/api/users", requireRole("admin"), userRoutes);
app.use("/api/settings", requireRole("admin"), settingsRoutes);
app.use("/api/batch-files", requireRole("admin"), batchFileRoutes);
app.use("/api", requireRole("admin"), apiRouter);

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

const PORT = Number(process.env.GHP_PORT) || config.http.port;
const HOST = config.http.bindAll ? "0.0.0.0" : "127.0.0.1";

// Every recurring job goes through the timer manager so intervals can be
// changed from settings without a restart.
registerTimer(
	"servers",
	() => pollServers(),
	(c) => c.polling.serversMs,
);
registerTimer(
	"system-stats",
	() => {
		getSystemStats()
			.then((stats) => broadcastSseEvent({ type: "system_stats", stats }))
			.catch((err) =>
				console.error("[system-stats] Failed to read system stats:", err.message),
			);
	},
	(c) => c.polling.systemStatsMs,
);
registerTimer(
	"server-stats",
	() => {
		getServerResourceStats()
			.then((stats) => broadcastSseEvent({ type: "server_stats", stats }))
			.catch((err) =>
				console.error("[server-stats] Failed to read per-server stats:", err.message),
			);
	},
	(c) => c.polling.serverStatsMs,
	(c) => c.polling.enableServerStats,
);
registerTimer(
	"build-check",
	() => {
		checkAndHandleUpdates().catch((err) =>
			console.error("[auto-update] Unexpected error in update check:", err),
		);
	},
	(c) => c.polling.buildCheckMs,
	// Off by default: this can escalate to updating and restarting real
	// servers, which is not something a panel should do until asked.
	(c) => c.polling.enableBuildCheck,
);
registerTimer(
	"upload-sweep",
	() => cleanupStaleUploads(),
	(c) => c.polling.uploadSweepMs,
);

const server = app.listen(PORT, HOST, () => {
	console.log(`API listening on http://${HOST}:${PORT} (data: ${paths.dataDir})`);

	const shareUrls = config.http.bindAll ? localAddresses(PORT) : [];
	if (shareUrls.length > 0) {
		console.log(`[network] Others on your network can use: ${shareUrls.join(", ")}`);
	}
	process.send?.({ type: "ready", port: PORT, host: HOST, shareUrls });

	pollServers();
	if (getConfig().polling.enableServerStats) getServerResourceStats().catch(() => {});
	getSystemStats()
		.then((stats) => broadcastSseEvent({ type: "system_stats", stats }))
		.catch(() => {});
	cleanupStaleUploads();

	scheduleAll(getConfig());
});

onConfigChange((next, changed) => {
	if (changed.some((p) => p.startsWith("polling."))) rescheduleAll(next);
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

	stopAll();

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

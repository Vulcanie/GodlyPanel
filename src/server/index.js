import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import apiRouter from "./routes/api.js";
import { broadcastSseEvent, clientCount } from "./services/sseHub.js";
import authRoutes from "./routes/auth.js";
import setupRoutes from "./routes/setup.js";
import dashboardRoutes from "./routes/dashboard.js";
import artRoutes from "./routes/art.js";
import appearanceRoutes from "./routes/appearance.js";
import userRoutes from "./routes/users.js";
import settingsRoutes from "./routes/settings.js";
import { attachUser, requireRole } from "./middleware/auth.js";
import { createLanOnly, localAddresses } from "./middleware/lanOnly.js";
import { initUserStore, needsSetup } from "./data/userStore.js";
import { pollServers, initPollingState } from "./services/pollingService.js";
import { checkAndHandleUpdates } from "./services/autoUpdateService.js";
import { getSystemStats } from "./services/systemStats.js";
import { getServerResourceStats } from "./services/serverResourceStats.js";
import { discordEnabled } from "./services/discordService.js";
import { sweepWindowsOnBoot } from "./services/serverWindows.js";
import { cleanupStaleUploads } from "./services/modpackService.js";
import { killTrackedSteamCmd, hasActiveJobs } from "./services/processRegistry.js";
import batchFileRoutes from "./routes/batchFiles.js";
import controlRoutes from "./routes/control.js";
import operationsRoutes from "./routes/operations.js";
import { ensureDataDirs, paths } from "./paths.js";
import { initConfig, getConfig, onConfigChange } from "./config/configStore.js";
import { initSecrets } from "./config/secretsStore.js";
import { initServerStore } from "./data/serverStore.js";
import { initAppearanceStore } from "./data/appearanceStore.js";
import { initServerIntent } from "./data/serverIntent.js";
import { initServerOptions } from "./data/serverOptions.js";
import { initScheduler, tickScheduler } from "./services/scheduler.js";
import { checkServersOnce, startAutoStartServers } from "./services/crashWatcher.js";
import { sweepPartialBackups } from "./services/backupService.js";
import { startNotifier, checkDisks } from "./services/notifier.js";
import { initStorage, rescan } from "./services/storageService.js";
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
await initAppearanceStore();
await initServerIntent();
await initServerOptions();
await initScheduler();
await initStorage();
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
const viewers = requireRole("admin", "moderator", "guest");
const operators = requireRole("admin", "moderator");
app.use("/api/art", viewers, artRoutes);
// Guests can read how a card should look — the dashboard can't draw one
// otherwise; the routes that change it enforce admin individually.
app.use("/api/appearance", viewers, appearanceRoutes);
app.use("/api", viewers, dashboardRoutes);
// What a moderator may do as well as an admin. Each route names the permission it
// needs, so anything they may not do is refused there.
app.use("/api", operators, controlRoutes);
app.use("/api", operators, operationsRoutes);
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

// Last stop for anything that reaches next(err). Express's default answers
// with an HTML page containing the stack trace — file paths and all — which
// is more than a caller on the network should learn from sending bad JSON.
app.use((err, req, res, next) => {
	if (res.headersSent) return next(err);
	const status = err.status || err.statusCode || 500;
	if (status >= 500) console.error("[http] Unhandled error:", err);
	res.status(status).json({
		error: err.type === "entity.parse.failed" ? "That request wasn't valid JSON." : status >= 500 ? "Something went wrong on the server." : err.message,
	});
});

const PORT = Number(process.env.GHP_PORT) || config.http.port;
const HOST = config.http.bindAll ? "0.0.0.0" : "127.0.0.1";

// Every recurring job goes through the timer manager so intervals can be
// changed from settings without a restart.
registerTimer(
	"servers",
	() => pollServers(),
	(c) => c.polling.serversMs,
);
// Run a reader and push its result to every connected dashboard.
const publish = (label, read, type, key) => () =>
	read()
		.then((value) => broadcastSseEvent({ type, [key]: value }))
		.catch((err) => console.error(`[${label}] Failed to read: ${err.message}`));

registerTimer(
	"system-stats",
	publish("system-stats", getSystemStats, "system_stats", "stats"),
	(c) => c.polling.systemStatsMs,
);
registerTimer(
	"server-stats",
	// Skipped while nobody is watching and Discord isn't showing it: this is a
	// PowerShell round trip of a second or more, for a number no one would see.
	// A viewer who arrives later gets a fresh reading on demand.
	() => {
		if (clientCount() > 0 || discordEnabled()) {
			publish("server-stats", getServerResourceStats, "server_stats", "stats")();
		}
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
// Schedules and crash recovery run on their own short, fixed beats: they're about
// reacting promptly, not about how often to poll, so they aren't settings.
registerTimer("scheduler", () => tickScheduler().catch((err) => console.error("[schedule]", err)), () => 15_000);
registerTimer("crash-watch", () => checkServersOnce().catch((err) => console.error("[recovery]", err)), () => 5_000);
registerTimer("disk-watch", () => checkDisks().catch((err) => console.error("[disk]", err)), () => 10 * 60_000);
registerTimer(
	"storage-scan",
	() => {
		rescan().catch((err) => console.error("[storage] Scan failed:", err.message));
	},
	(c) => c.storage.scanIntervalMs,
);

const server = app.listen(PORT, HOST, () => {
	console.log(`API listening on http://${HOST}:${PORT} (data: ${paths.dataDir})`);

	const shareUrls = config.http.bindAll ? localAddresses(PORT) : [];
	if (shareUrls.length > 0) {
		console.log(`[network] Others on your network can use: ${shareUrls.join(", ")}`);
	}
	process.send?.({ type: "ready", port: PORT, host: HOST, shareUrls });
	sendStartupSettings(getConfig());

	pollServers();
	if (getConfig().polling.enableServerStats) getServerResourceStats().catch(() => {});
	getSystemStats()
		.then((stats) => broadcastSseEvent({ type: "system_stats", stats }))
		.catch(() => {});
	cleanupStaleUploads();

	// Servers already running when the panel starts still have their windows.
	setTimeout(() => sweepWindowsOnBoot(), 15_000);

	// After the first poll has said who is already running, start the servers set
	// to start with the panel.
	setTimeout(() => startAutoStartServers().catch((err) => console.error("[autostart]", err)), 12_000);
	sweepPartialBackups().catch(() => {});
	startNotifier();
	setTimeout(() => checkDisks().catch(() => {}), 30_000);

	// Deferred: the first poll matters more than the disk figure, and a walk
	// of every game install is heavy enough not to want it competing.
	setTimeout(() => {
		rescan().catch((err) => console.error("[storage] Initial scan failed:", err.message));
	}, 60_000);

	scheduleAll(getConfig());
});

// The desktop shell owns the Windows login entry; tell it what the settings say.
function sendStartupSettings(config) {
	process.send?.({ type: "startup-settings", openAtLogin: config.startup.openAtLogin, startHidden: config.startup.startHidden });
}

onConfigChange((next, changed) => {
	if (changed.some((p) => p.startsWith("polling."))) rescheduleAll(next);
	if (changed.some((p) => p.startsWith("startup."))) sendStartupSettings(next);
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

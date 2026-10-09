import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.js";
import setupRoutes from "./routes/setup.js";
import { attachUser } from "./middleware/auth.js";
import { auditActions } from "./services/auditTrail.js";
import { createPanelRouter } from "./routes/panelRoutes.js";
import { providePanelApi } from "./services/communityListener.js";
import { createLanOnly } from "./middleware/lanOnly.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { sameOriginOnly } from "./middleware/sameOrigin.js";
import { initUserStore, needsSetup } from "./data/userStore.js";
import { initPollingState } from "./services/pollingService.js";
import { initPanelUpdate } from "./services/panelUpdate.js";
import { initSelfUpdate } from "./services/selfUpdate.js";
import { initPresets } from "./services/presetService.js";
import { ensureDataDirs } from "./paths.js";
import { initConfig, getConfig } from "./config/configStore.js";
import { initSecrets } from "./config/secretsStore.js";
import { initCommunityInvite } from "./services/communityInvite.js";
import { initCommunityView } from "./services/communityView.js";
import { initServerStore } from "./data/serverStore.js";
import { initAppearanceStore } from "./data/appearanceStore.js";
import { initServerIntent } from "./data/serverIntent.js";
import { initServerOptions } from "./data/serverOptions.js";
import { initScheduler } from "./services/scheduler.js";
import { initStorage } from "./services/storageService.js";

// The panel's HTTP application, separate from running it: this loads what the data folder holds and builds the Express app,
// and nothing more. No port is opened, no timer is started and nothing is polled, which is what lets a test drive the real
// routes in-process (see tests/helpers/inprocess.js). index.js adds the rest: listening, the recurring jobs, and shutdown.
//
// Where the data folder is comes from the environment when the modules load (GHP_DATA_DIR, see paths.js), so a process
// serves one data folder, set before this is imported.

/**
 * Load every store from the data folder. Order matters: config and secrets underpin everything, and the server store
 * has to be loaded before anything iterates the server list.
 */
export async function loadStores() {
	ensureDataDirs();
	const config = await initConfig();
	await initSecrets();
	await initUserStore();
	await initCommunityInvite();
	await initCommunityView();
	await initServerStore();
	await initAppearanceStore();
	await initServerIntent();
	await initServerOptions();
	await initScheduler();
	await initPanelUpdate();
	await initSelfUpdate();
	await initPresets();
	await initStorage();
	initPollingState();

	if (needsSetup()) {
		console.log("[setup] No admin account yet — the panel will ask you to create one.");
	}
	return config;
}

/**
 * The Express application, with its middleware and routes. Needs the stores loaded first.
 * @param {object} [options]
 * @param {boolean} [options.quiet]  don't print a line per request (tests)
 * @param {boolean} [options.serveUi]  serve the built interface (on unless a test says otherwise)
 */
export function buildApp({ quiet = false, serveUi = true } = {}) {
	const app = express();

	// Nothing legitimate proxies this, so forwarding headers are never trusted —
	// honouring them would let a caller claim to be on the LAN.
	app.set("trust proxy", false);

	// First, ahead of logging and body parsing: a refused request shouldn't get
	// a 10MB body read off the wire before we turn it away.
	app.use(createLanOnly(getConfig));
	app.use(securityHeaders);
	app.use(sameOriginOnly);

	if (!quiet) {
		app.use((req, res, next) => {
			console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
			next();
		});
	}

	// No CORS by design: the UI is served by this same server and the Electron
	// window loads it from this origin, so every request is same-origin. In the
	// `dev:ui` flow, CRA's own dev-server proxy forwards /api to us, which is also
	// same-origin from the browser's point of view.
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	app.use(attachUser);
	app.use(auditActions);

	app.use("/api/setup", setupRoutes);
	app.use("/api/auth", authRoutes);
	// Roles are enforced per route group inside the panel router. The community address
	// shares it for staff accounts, when the owner allows that (see communityListener.js).
	const panelRouter = createPanelRouter();
	app.use(panelRouter);
	providePanelApi(panelRouter);

	app.use("/api/*", (req, res) => {
		console.warn("Unhandled API route:", req.method, req.originalUrl);
		res.status(404).json({ error: "API route not found" });
	});

	// Serve the built UI. This is what makes the whole app same-origin, so it is
	// mandatory rather than the opt-in SERVE_STATIC flag the original API had.
	if (serveUi) {
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

	return app;
}

/** Load the stores and build the app: everything a request needs, nothing that runs by itself. */
export async function createApp(options = {}) {
	await loadStores();
	return buildApp(options);
}

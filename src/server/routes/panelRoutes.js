import express from "express";
import apiRouter from "./api.js";
import dashboardRoutes from "./dashboard.js";
import artRoutes from "./art.js";
import appearanceRoutes from "./appearance.js";
import userRoutes from "./users.js";
import settingsRoutes from "./settings.js";
import communityRoutes from "./community.js";
import batchFileRoutes from "./batchFiles.js";
import controlRoutes from "./control.js";
import updatesRoutes from "./updates.js";
import modsRoutes from "./mods.js";
import operationsRoutes from "./operations.js";
import { requireRole } from "../middleware/auth.js";

/**
 * Everything the signed-in panel offers, with each group behind the role it needs. Sign-in, sign-up
 * and first-run setup are not in here: they differ between the panel itself and the community
 * address, so each of those places brings its own.
 *
 * Roles are enforced here, per route group, rather than by the old rule of "any GET is public,
 * writes need admin". That rule existed because the live-update endpoint is an EventSource and
 * can't send an Authorization header — which is no longer a constraint now that sessions are
 * cookies on the same origin. Config reads in particular are admin-only: those files contain RCON
 * and server passwords.
 */
export function createPanelRouter() {
	const router = express.Router();
	const viewers = requireRole("admin", "moderator", "guest");
	const operators = requireRole("admin", "moderator");
	router.use("/api/art", viewers, artRoutes);
	// Guests can read how a card should look — the dashboard can't draw one
	// otherwise; the routes that change it enforce admin individually.
	router.use("/api/appearance", viewers, appearanceRoutes);
	router.use("/api", viewers, dashboardRoutes);
	// What a moderator may do as well as an admin. Each route names the permission it
	// needs, so anything they may not do is refused there.
	router.use("/api", operators, controlRoutes);
	router.use("/api", operators, operationsRoutes);
	router.use("/api/users", requireRole("admin"), userRoutes);
	router.use("/api/updates", requireRole("admin"), updatesRoutes);
	router.use("/api", requireRole("admin"), modsRoutes);
	router.use("/api/settings", requireRole("admin"), settingsRoutes);
	router.use("/api/community", requireRole("admin"), communityRoutes);
	router.use("/api/batch-files", requireRole("admin"), batchFileRoutes);
	router.use("/api", requireRole("admin"), apiRouter);
	return router;
}

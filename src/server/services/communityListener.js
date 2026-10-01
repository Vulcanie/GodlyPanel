import express from "express";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyCredentials, getById, needsSetup, setPassword } from "../data/userStore.js";
import { attachUser, issueSession, clearSession, requireRole, clientAddress } from "../middleware/auth.js";
import { loginGuard, recordLoginFailure, clearLoginFailures } from "../middleware/loginLimiter.js";
import { joiningIsOpen, joinWithCode, JoinError } from "./communityInvite.js";
import { addSseClient } from "./sseHub.js";
import dashboardRoutes from "../routes/dashboard.js";
import artRoutes from "../routes/art.js";
import appearanceRoutes from "../routes/appearance.js";

// The community listener: a second, much smaller web server for people outside the house. It is
// what a Cloudflare tunnel points at, so the panel itself never has to be reachable from the
// internet. It listens on this PC only (127.0.0.1) and offers three things and nothing else:
//
//   - the panel's page (the same files the panel serves),
//   - sign-in for GUEST accounts and sign-up with the community code,
//   - the read-only dashboard data a guest sees: status, players, join address.
//
// Administrators and moderators cannot sign in here (even with the right password), and a session
// belonging to one is ignored here, so there is no way to start, stop, change or delete anything
// through it. Everything else answers "not found".

const GUEST_READS = new Set(["/status", "/status/latest", "/operations", "/system-stats", "/server-stats"]);

// Per visitor: a generous cap on everything, so one person can't use the PC up.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 600;
// Live-update streams are held open, so they're limited separately and can't crowd out the panel's own.
const SSE_GROUP = { group: "community", maxGroup: 24, perAddress: 2 };

/** Does this Host header belong to the address the owner chose (or, for a temporary link, to trycloudflare.com)? */
export function hostAllowed(hostHeader, rule) {
	const host = String(hostHeader ?? "").toLowerCase().replace(/:\d+$/, "");
	if (!host) return false;
	if (rule.suffix && host.endsWith(rule.suffix) && host.length > rule.suffix.length) return true;
	return Boolean(rule.exact) && host === String(rule.exact).toLowerCase();
}

/**
 * @param {{ hostRule: () => { exact?: string, suffix?: string }, uiDir?: string }} options
 */
export function createCommunityApp({ hostRule, uiDir }) {
	const app = express();
	app.disable("x-powered-by");
	app.set("trust proxy", false);

	app.use((req, res, next) => {
		res.setHeader("X-Content-Type-Options", "nosniff");
		res.setHeader("X-Frame-Options", "DENY");
		res.setHeader("Referrer-Policy", "no-referrer");
		res.setHeader("Cache-Control", "no-store");
		next();
	});

	// Only the chosen public name gets in. A request that reached the listener by its number, or under
	// another name, isn't coming from the tunnel.
	app.use((req, res, next) => {
		if (!hostAllowed(req.headers.host, hostRule())) return res.status(421).json({ error: "This address isn't served here." });
		next();
	});

	// Who is really asking: the tunnel says so in Cloudflare's header. Only programs on this PC can
	// reach this listener at all, so the header can't be forged from outside.
	app.use((req, res, next) => {
		const claimed = String(req.headers["cf-connecting-ip"] ?? "").trim();
		req.communityClientIp = net.isIP(claimed) ? claimed : clientAddress(req);
		next();
	});

	const seen = new Map();
	app.use((req, res, next) => {
		const now = Date.now();
		const key = req.communityClientIp;
		const e = seen.get(key);
		if (!e || now - e.since > WINDOW_MS) seen.set(key, { count: 1, since: now });
		else if (++e.count > MAX_REQUESTS_PER_WINDOW) return res.status(429).json({ error: "Slow down a little.", code: "rate_limited" });
		if (seen.size > 5000) for (const [k, v] of seen) if (now - v.since > WINDOW_MS) seen.delete(k);
		next();
	});

	app.use(express.json({ limit: "4kb" }));
	app.use(attachUser);
	// Only guests exist here. A session belonging to anyone else is treated as no session at all.
	app.use((req, res, next) => {
		if (req.user && req.user.role !== "guest") req.user = null;
		next();
	});

	// Marked Secure: the tunnel serves this over https, and the cookie shouldn't travel any other way.
	const secure = (req) => req.headers["x-forwarded-proto"] === "https" || Boolean(req.headers["cf-ray"]);

	// ---- accounts -------------------------------------------------------------------------------
	app.post("/api/auth/login", loginGuard, async (req, res) => {
		const { username, password } = req.body || {};
		if (!username || !password) return res.status(400).json({ error: "Username and password are required." });
		const user = needsSetup() ? null : await verifyCredentials(username, password);
		// Not a guest: refused the same way as a wrong password, so this page can't be used to find out
		// which administrator names exist.
		if (!user || user.role !== "guest") {
			recordLoginFailure(req);
			return res.status(401).json({ error: "Incorrect username or password." });
		}
		clearLoginFailures(req);
		issueSession(res, user, { secure: secure(req) });
		res.json({ user: { username: user.username, role: user.role } });
	});

	app.post("/api/auth/logout", (req, res) => {
		clearSession(res);
		res.json({ success: true });
	});

	app.get("/api/auth/me", (req, res) => {
		if (!req.user) return res.status(401).json({ error: "Not signed in.", code: "unauthenticated", setupRequired: false });
		res.json({ user: req.user });
	});

	app.get("/api/auth/join", (req, res) => res.json({ open: !needsSetup() && joiningIsOpen() }));
	app.post("/api/auth/join", async (req, res) => {
		const { code, username, password } = req.body || {};
		if (!code || !username || !password) return res.status(400).json({ error: "A code, a username and a password are all needed." });
		try {
			const user = await joinWithCode({ code, username, password }, req.communityClientIp);
			issueSession(res, getById(user.id), { secure: secure(req) });
			res.json({ user: { username: user.username, role: user.role } });
		} catch (e) {
			if (e instanceof JoinError) {
				if (e.status === 429) res.setHeader("Retry-After", "60");
				return res.status(e.status).json({ error: e.message, code: e.code });
			}
			res.status(400).json({ error: e.message });
		}
	});

	app.post("/api/auth/change-password", requireRole("guest"), async (req, res) => {
		const { currentPassword, newPassword } = req.body || {};
		const user = getById(req.user.id);
		if (!user || !(await verifyCredentials(user.username, currentPassword))) return res.status(403).json({ error: "Your current password is incorrect." });
		try {
			await setPassword(user.id, newPassword);
		} catch (e) {
			return res.status(400).json({ error: e.message });
		}
		issueSession(res, getById(user.id), { secure: secure(req) });
		res.json({ success: true });
	});

	// ---- what a guest may look at ---------------------------------------------------------------------
	const guest = requireRole("guest");
	const readOnly = (req, res, next) => (req.method === "GET" ? next() : res.status(404).json({ error: "Not found." }));

	app.get("/api/events", guest, (req, res) => addSseClient(req, res, req.user, { ...SSE_GROUP, address: req.communityClientIp }));
	app.use("/api/art", guest, readOnly, artRoutes);
	app.get("/api/appearance", guest, (req, res, next) => {
		req.url = "/";
		appearanceRoutes(req, res, next);
	});
	app.use("/api", guest, (req, res, next) => (req.method === "GET" && GUEST_READS.has(req.path) ? next() : res.status(404).json({ error: "Not found." })), dashboardRoutes);

	// Anything else under /api does not exist here.
	app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

	// ---- the page itself -------------------------------------------------------------------------------
	const here = path.dirname(fileURLToPath(import.meta.url));
	const ui = uiDir ?? path.resolve(here, "..", "..", "..", "ui", "build");
	if (fs.existsSync(path.join(ui, "index.html"))) {
		app.use(express.static(ui, { index: false, setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=300") }));
		app.get("*", (req, res) => res.sendFile(path.join(ui, "index.html")));
	} else {
		app.get("*", (req, res) => res.status(503).type("text/plain").send("The page hasn't been built."));
	}

	app.use((err, req, res, next) => {
		if (res.headersSent) return next(err);
		const status = err.status || err.statusCode || 500;
		res.status(status).json({ error: status >= 500 ? "Something went wrong." : "That request wasn't valid." });
	});
	return app;
}

// ---- running it --------------------------------------------------------------------------------------

let server = null;
let boundPort = null;

export const listenerPort = () => boundPort;

export function startListener({ port, hostRule, uiDir }) {
	return new Promise((resolve, reject) => {
		if (server) return resolve(boundPort);
		const s = http.createServer(createCommunityApp({ hostRule, uiDir }));
		// Slow connections and endless headers are how small servers get tied up.
		s.headersTimeout = 15_000;
		s.requestTimeout = 0; // live-update streams are long
		s.keepAliveTimeout = 30_000;
		s.maxHeadersCount = 40;
		s.once("error", reject);
		// 127.0.0.1 only: the tunnel runs on this PC, and nothing else should reach this directly.
		s.listen(port, "127.0.0.1", () => {
			server = s;
			boundPort = s.address().port;
			resolve(boundPort);
		});
	});
}

export function stopListener() {
	return new Promise((resolve) => {
		const s = server;
		server = null;
		boundPort = null;
		if (!s) return resolve();
		s.closeAllConnections?.();
		s.close(() => resolve());
		setTimeout(resolve, 2000).unref?.();
	});
}

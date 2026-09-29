import express from "express";
import {
	verifyCredentials,
	needsSetup,
	setPassword,
	getById,
} from "../data/userStore.js";
import { issueSession, clearSession, requireRole } from "../middleware/auth.js";
import { loginGuard, recordLoginFailure, clearLoginFailures } from "../middleware/loginLimiter.js";

const router = express.Router();

router.post("/login", loginGuard, async (req, res) => {
	const { username, password } = req.body || {};
	if (!username || !password) {
		return res.status(400).json({ error: "Username and password are required." });
	}
	if (needsSetup()) {
		return res.status(409).json({ error: "Setup has not been completed.", code: "setup_required" });
	}

	const user = await verifyCredentials(username, password);
	if (!user) {
		recordLoginFailure(req);
		// Deliberately not saying which half was wrong.
		return res.status(401).json({ error: "Incorrect username or password." });
	}

	clearLoginFailures(req);
	issueSession(res, user);
	res.json({ user: { username: user.username, role: user.role } });
});

router.post("/logout", (req, res) => {
	clearSession(res);
	res.json({ success: true });
});

// The only place the frontend learns its role. It used to read a value it had
// stored in localStorage at login, which meant editing one string in devtools
// unlocked the admin UI. (The server still refused the writes, but the app
// shouldn't have been presenting them.)
router.get("/me", (req, res) => {
	if (!req.user) {
		return res.status(401).json({
			error: "Not signed in.",
			code: needsSetup() ? "setup_required" : "unauthenticated",
			setupRequired: needsSetup(),
		});
	}
	res.json({ user: req.user });
});

router.post("/change-password", requireRole("admin", "guest"), async (req, res) => {
	const { currentPassword, newPassword } = req.body || {};
	const user = getById(req.user.id);
	if (!user) return res.status(401).json({ error: "Not signed in." });

	const ok = await verifyCredentials(user.username, currentPassword);
	if (!ok) return res.status(403).json({ error: "Your current password is incorrect." });

	try {
		await setPassword(user.id, newPassword);
	} catch (e) {
		return res.status(400).json({ error: e.message });
	}

	// Changing the password bumps sessionVersion, which invalidates this
	// session too — so issue a fresh one rather than silently logging them out.
	issueSession(res, getById(user.id));
	res.json({ success: true });
});

export default router;

import express from "express";
import { getById } from "../data/userStore.js";
import { listSessions, revokeSession, revokeUserSessions } from "../services/sessionStore.js";

// Who is signed in as you: this browser, and any other. Mounted for the signed-in person at /api/auth/sessions (on the panel and on
// the community address alike). An administrator's view of everyone's is in users.js.

/** "Chrome on Windows", from the browser's own description of itself. Best effort; the address says the rest. */
export function deviceName(userAgent = "") {
	const ua = String(userAgent);
	const app = /Electron\//.test(ua) ? "The GodlyPanel app" : /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "A browser";
	const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
	return os ? `${app} on ${os}` : app;
}

/** What the interface is told about a session. The id is what ends it; the token itself is never shown. */
export const present = (s, currentId) => ({
	id: s.id,
	username: s.username,
	role: s.role,
	current: s.id === currentId,
	device: deviceName(s.userAgent),
	ip: s.ip,
	via: s.via,
	createdAt: new Date(s.createdAt).toISOString(),
	lastSeen: new Date(s.lastSeen).toISOString(),
	expiresAt: new Date(s.expiresAt).toISOString(),
});

const router = express.Router();

router.get("/", (req, res) => {
	res.json({ sessions: listSessions({ userId: req.user.id, getUser: getById }).map((s) => present(s, req.sid)) });
});

// Ends every sign-in but this one: the answer to "I left myself signed in somewhere".
router.post("/revoke-others", (req, res) => {
	res.json({ revoked: revokeUserSessions(req.user.id, req.sid) });
});

router.delete("/:id", (req, res) => {
	const mine = listSessions({ userId: req.user.id, getUser: getById }).some((s) => s.id === req.params.id);
	if (!mine) return res.status(404).json({ error: "That sign-in doesn't exist any more.", code: "not_found" });
	revokeSession(req.params.id);
	res.json({ success: true, wasThisOne: req.params.id === req.sid });
});

export default router;

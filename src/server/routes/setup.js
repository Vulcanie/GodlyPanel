import express from "express";
import { needsSetup, createUser, getByUsername } from "../data/userStore.js";
import { issueSession, loopbackOnly } from "../middleware/auth.js";

const router = express.Router();

router.get("/status", (req, res) => {
	res.json({ setupRequired: needsSetup() });
});

// Creating the first admin is restricted to the machine itself — otherwise on
// a shared network whoever reaches the panel first could claim it.
router.post("/admin", loopbackOnly, async (req, res) => {
	if (!needsSetup()) {
		return res.status(409).json({ error: "Setup has already been completed." });
	}

	const { username, password } = req.body || {};
	try {
		const user = await createUser({ username, password, role: "admin" });
		issueSession(res, getByUsername(user.username));
		res.json({ success: true, user: { username: user.username, role: user.role } });
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

export default router;

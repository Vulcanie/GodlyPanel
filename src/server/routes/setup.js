import express from "express";
import { needsSetup, createUser, getByUsername } from "../data/userStore.js";
import { issueSession, loopbackOnly } from "../middleware/auth.js";
import { patchConfig } from "../config/configStore.js";
import { inspectFolder } from "../services/folderCheck.js";

const router = express.Router();

router.get("/status", (req, res) => {
	res.json({ setupRequired: needsSetup() });
});

// Both of these are only for the first-run wizard, and only from the machine
// itself, for the same reason account creation is: before an admin exists
// there's nobody to authorise anything, so it can't be left open to the LAN.
router.get("/folder-defaults", loopbackOnly, (req, res) => {
	if (!needsSetup()) return res.status(409).json({ error: "Setup has already been completed." });
	res.json(inspectFolder(""));
});

router.post("/check-folder", loopbackOnly, (req, res) => {
	if (!needsSetup()) return res.status(409).json({ error: "Setup has already been completed." });
	res.json(inspectFolder(req.body?.path));
});

// Creating the first admin is restricted to the machine itself — otherwise on
// a shared network whoever reaches the panel first could claim it.
router.post("/admin", loopbackOnly, async (req, res) => {
	if (!needsSetup()) {
		return res.status(409).json({ error: "Setup has already been completed." });
	}

	const { username, password, serversRoot } = req.body || {};
	try {
		// Checked before the account is made, so a bad folder doesn't leave
		// someone with an account but a setup they have to redo.
		const chosen = String(serversRoot ?? "").trim();
		if (chosen) {
			const check = inspectFolder(chosen);
			if (!check.ok) return res.status(400).json({ error: check.errors[0] });
		}
		const user = await createUser({ username, password, role: "admin" });
		if (chosen) await patchConfig({ paths: { serversRoot: chosen } });
		issueSession(res, getByUsername(user.username));
		res.json({ success: true, user: { username: user.username, role: user.role } });
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

export default router;

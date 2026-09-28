import express from "express";
import { verifyCredentials, issueToken } from "../services/authService.js";

const router = express.Router();

router.post("/login", async (req, res) => {
	const { username, password } = req.body || {};
	if (!username || !password) {
		return res.status(400).json({ error: "Username and password are required." });
	}

	const role = await verifyCredentials(username, password);
	if (!role) {
		return res.status(401).json({ error: "Invalid username or password." });
	}

	res.json({ token: issueToken(role), role });
});

export default router;

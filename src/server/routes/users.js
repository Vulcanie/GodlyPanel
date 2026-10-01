import express from "express";
import {
	list,
	createUser,
	setRole,
	setDisabled,
	setServers,
	setPassword,
	removeUser,
	getById,
} from "../data/userStore.js";
import { dropSessionsFor } from "../services/sseHub.js";
import { inviteStatus, updateInvite } from "../services/communityInvite.js";

const router = express.Router();

router.get("/", (req, res) => {
	res.json(list());
});

// The community code (administrators only): see it, switch it on or off, set its limits, replace it.
router.get("/invite", (req, res) => res.json(inviteStatus()));
router.put("/invite", async (req, res) => {
	const { enabled, expiresInDays, maxJoins, regenerate } = req.body || {};
	try {
		res.json(await updateInvite({ enabled, expiresInDays, maxJoins, regenerate: regenerate === true }));
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

router.post("/", async (req, res) => {
	const { username, password, role, servers } = req.body || {};
	try {
		res.json(await createUser({ username, password, role: role || "guest", servers }));
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

router.put("/:id/role", async (req, res) => {
	try {
		const user = await setRole(req.params.id, req.body?.role);
		// The role change already invalidated their token; close any live
		// stream too so they aren't left watching admin-level updates.
		dropSessionsFor(req.params.id);
		res.json(user);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

router.put("/:id/servers", async (req, res) => {
	try {
		const user = await setServers(req.params.id, req.body?.servers ?? null);
		dropSessionsFor(req.params.id);
		res.json(user);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

router.put("/:id/disabled", async (req, res) => {
	try {
		const user = await setDisabled(req.params.id, req.body?.disabled);
		dropSessionsFor(req.params.id);
		res.json(user);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

router.put("/:id/password", async (req, res) => {
	try {
		const user = await setPassword(req.params.id, req.body?.password);
		dropSessionsFor(req.params.id);
		res.json(user);
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

router.delete("/:id", async (req, res) => {
	if (!getById(req.params.id)) {
		return res.status(404).json({ error: "No such user." });
	}
	try {
		await removeUser(req.params.id);
		dropSessionsFor(req.params.id);
		res.json({ success: true });
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

export default router;

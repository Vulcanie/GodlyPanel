// Is there a newer GodlyPanel, fetching it, and installing it from inside the app. Admin only.
import express from "express";
import { updateStatus, checkForPanelUpdate, downloadPanelUpdate, downloadState, downloadFolder } from "../services/panelUpdate.js";
import { selfUpdateInfo, startInstall, dismissLastUpdate } from "../services/selfUpdate.js";

const router = express.Router();

const withDetails = async (status) => ({ ...status, download: downloadState(), downloadFolder, selfUpdate: await selfUpdateInfo() });

router.get("/panel", async (req, res) => {
	res.json(await withDetails(updateStatus()));
});

router.post("/panel/check", async (req, res) => {
	res.json(await withDetails(await checkForPanelUpdate()));
});

// Starts the download and answers at once; progress is on the live stream and on GET.
router.post("/panel/download", async (req, res) => {
	try {
		res.status(202).json(await downloadPanelUpdate());
	} catch (err) {
		res.status(err.status ?? 500).json({ error: err.message });
	}
});

// "Update now": download, check, and have the app replace itself and restart. Answers at once; the panel goes away
// a little later, and comes back as the new version (or as the old one, with a note, if the new one didn't start).
router.post("/panel/install", (req, res) => {
	try {
		// Requests that came through the public address carry the visitor's address; this is for the home network.
		res.status(202).json(startInstall({ fromOutside: Boolean(req.communityClientIp) }));
	} catch (err) {
		res.status(err.status ?? 500).json({ error: err.message });
	}
});

// The note about how the last update went, once it has been read.
router.post("/panel/update-result/dismiss", async (req, res) => {
	await dismissLastUpdate();
	res.json({ success: true });
});

export default router;

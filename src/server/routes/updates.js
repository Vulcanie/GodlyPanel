// Is there a newer GodlyPanel, and fetching it. Admin only.
import express from "express";
import { updateStatus, checkForPanelUpdate, downloadPanelUpdate, downloadState, downloadFolder } from "../services/panelUpdate.js";

const router = express.Router();

router.get("/panel", (req, res) => {
	res.json({ ...updateStatus(), download: downloadState(), downloadFolder });
});

router.post("/panel/check", async (req, res) => {
	res.json({ ...(await checkForPanelUpdate()), download: downloadState(), downloadFolder });
});

// Starts the download and answers at once; progress is on the live stream and on GET.
router.post("/panel/download", async (req, res) => {
	try {
		res.status(202).json(await downloadPanelUpdate());
	} catch (err) {
		res.status(err.status ?? 500).json({ error: err.message });
	}
});

export default router;

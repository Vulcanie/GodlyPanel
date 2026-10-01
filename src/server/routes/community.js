import express from "express";
import { communityStatus, saveCommunitySettings, setCommunityEnabled, downloadCloudflared } from "../services/communityView.js";
import { findCloudflared } from "../services/cloudflared.js";

// The community view's settings (administrators only; mounted behind the admin check).
const router = express.Router();

const fail = (res, err, status = 400) => res.status(status).json({ error: err.message });

router.get("/", async (req, res) => res.json(await communityStatus()));

router.put("/", async (req, res) => {
	try {
		res.json(await saveCommunitySettings(req.body || {}));
	} catch (err) {
		fail(res, err);
	}
});

// Same pattern as SteamCMD: nothing is downloaded until the interface has asked and been told yes.
router.post("/cloudflared/install", async (req, res) => {
	if (findCloudflared()) return res.json(await communityStatus());
	if (req.body?.acceptDownload !== true) return res.status(409).json({ error: "cloudflared isn't installed. It can be downloaded from Cloudflare once, on request.", code: "cloudflared-not-installed" });
	try {
		await downloadCloudflared();
		res.json(await communityStatus());
	} catch (err) {
		fail(res, err, 502);
	}
});

router.post("/enable", async (req, res) => {
	try {
		res.json(await setCommunityEnabled(true));
	} catch (err) {
		fail(res, err);
	}
});
router.post("/disable", async (req, res) => {
	try {
		res.json(await setCommunityEnabled(false));
	} catch (err) {
		fail(res, err);
	}
});

export default router;

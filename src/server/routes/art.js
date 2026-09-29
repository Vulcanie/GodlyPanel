import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { paths } from "../paths.js";
import { get as getAppearance, safeTypeKey } from "../data/appearanceStore.js";
import { ensureSteamArt } from "../services/artService.js";

// Serves one game type's banner. What that resolves to is the user's choice:
// artwork the panel found on Steam by itself, an image they uploaded, or
// nothing at all when they've picked a plain colour instead.
//
// A 404 here is a normal answer, not a failure — the dashboard draws its
// gradient underneath the image, so "no artwork" degrades to a plainer card
// rather than a broken one. That's also what makes a first run with no
// internet connection look intentional.

const router = express.Router();

function customArtPath(appearance) {
	const file = appearance?.image?.file;
	if (typeof file !== "string" || file === "") return null;
	// The stored name is generated here, never taken from the upload, but it
	// ends up in a join either way — so confirm it's still a bare filename.
	if (path.basename(file) !== file) return null;
	const full = path.join(paths.customArtDir, file);
	return existsSync(full) ? full : null;
}

router.get("/:type", async (req, res) => {
	const key = safeTypeKey(req.params.type);
	if (!key) return res.status(404).end();

	const appearance = getAppearance(key);
	const mode = appearance?.mode ?? "auto";

	if (mode === "image") {
		const file = customArtPath(appearance);
		if (!file) return res.status(404).end();
		res.setHeader("Content-Type", appearance.image.contentType ?? "image/png");
		res.setHeader("Cache-Control", "public, max-age=604800");
		return res.sendFile(file);
	}

	// A solid colour needs no image, and asking Steam for one would mean
	// walking installs and hitting the network for something nobody will see.
	if (mode === "color") return res.status(404).end();

	const file = await ensureSteamArt(key);
	if (!file) return res.status(404).end();
	res.setHeader("Content-Type", "image/jpeg");
	res.setHeader("Cache-Control", "public, max-age=604800");
	return res.sendFile(file);
});

export default router;

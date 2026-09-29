import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import { paths } from "../paths.js";

// Game artwork used to be hotlinked straight from Steam's CDN by the browser,
// which meant the panel's own chrome broke without an internet connection —
// on an app whose whole point is running on your own machine.
//
// It's fetched once, through here, and cached in the data dir. Not bundled
// into the download: the art is Valve's, and shipping it in a release is a
// different thing from each install fetching it for itself. If the fetch
// fails the UI falls back to a gradient, so no-internet is merely plainer
// rather than broken.

const ART_DIR = path.join(paths.dataDir, "cache", "art");
const STEAM_HERO = (appId) =>
	`https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`;

// Server type -> Steam appid. Types with no entry (Minecraft) use a gradient.
const APP_IDS = {
	ark: 2399830,
	valheim: 892970,
	conan: 440900,
	enshrouded: 1203620,
	rune: 1374490,
	windrose: 3041230,
	subsistence: 418030,
	"7days": 251570,
	palword: 1623730,
};

const router = express.Router();
const inFlight = new Map();

async function fetchAndCache(type, appId, file) {
	const res = await fetch(STEAM_HERO(appId));
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const buf = Buffer.from(await res.arrayBuffer());
	// Guard against caching an error page as if it were artwork.
	if (buf.length < 1024 || buf[0] !== 0xff || buf[1] !== 0xd8) {
		throw new Error("Response was not a JPEG.");
	}
	await fs.mkdir(ART_DIR, { recursive: true });
	await fs.writeFile(file, buf);
	return file;
}

router.get("/:type", async (req, res) => {
	const type = String(req.params.type || "").toLowerCase();
	const appId = APP_IDS[type];
	if (!appId) return res.status(404).end();

	const file = path.join(ART_DIR, `${type}.jpg`);
	if (existsSync(file)) {
		res.setHeader("Cache-Control", "public, max-age=604800");
		return res.sendFile(file);
	}

	try {
		// Collapse concurrent requests for the same image — the dashboard asks
		// for several at once on first load.
		if (!inFlight.has(type)) {
			inFlight.set(
				type,
				fetchAndCache(type, appId, file).finally(() => inFlight.delete(type)),
			);
		}
		await inFlight.get(type);
		res.setHeader("Cache-Control", "public, max-age=604800");
		res.sendFile(file);
	} catch {
		// No internet, or Valve changed something. The UI handles this by
		// showing its gradient instead.
		res.status(404).end();
	}
});

export default router;

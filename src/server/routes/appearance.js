import express from "express";
import multer from "multer";
import path from "node:path";
import { promises as fs } from "node:fs";
import { paths } from "../paths.js";
import * as appearanceStore from "../data/appearanceStore.js";
import { safeTypeKey, MODES } from "../data/appearanceStore.js";
import { resolveAppIds, forgetSteamArt } from "../services/artService.js";
import { sniffImage, describeFit, RECOMMENDED } from "../util/imageMeta.js";
import { requireRole } from "../middleware/auth.js";
import { singleFile } from "../middleware/uploadErrors.js";
import { broadcastSseEvent } from "../services/sseHub.js";
import { all as allServers } from "../data/serverStore.js";

// How each game type looks on the dashboard. Reading is open to guests because
// the dashboard can't draw a card without it; changing it is admin-only.

const router = express.Router();
const admin = requireRole("admin");

const upload = multer({
	storage: multer.memoryStorage(),
	// Generous for a banner, small enough that a misclicked video file is
	// refused before it's buffered in full.
	limits: { fileSize: 12 * 1024 * 1024 },
});

/**
 * What everyone — guests included — is allowed to know about a type's look.
 * Notably not the stored filename: the dashboard asks for /api/art/<type> and
 * lets the server work out what to send.
 */
function publicView(entry = {}) {
	return {
		mode: entry.mode ?? "auto",
		color: entry.color ?? null,
		color2: entry.color2 ?? null,
		appId: entry.appId ?? null,
		image: entry.image
			? { width: entry.image.width, height: entry.image.height, bytes: entry.image.bytes }
			: null,
		// Artwork is served with a week-long max-age, so without this a new
		// upload wouldn't appear in an already-open dashboard.
		version: entry.updatedAt ?? 0,
	};
}

function announce(type, entry) {
	broadcastSseEvent({ type: "appearance_updated", gameType: type, appearance: publicView(entry) });
}

/**
 * Types the dashboard might draw: everything with a server, plus anything with
 * an override already saved (so a type whose last server was deleted doesn't
 * silently lose its settings without the user seeing them).
 */
function knownTypes() {
	const types = new Set();
	for (const server of allServers()) {
		const key = safeTypeKey(server.type);
		if (key) types.add(key);
	}
	for (const key of Object.keys(appearanceStore.all())) types.add(key);
	return [...types].sort();
}

router.get("/", (req, res) => {
	const stored = appearanceStore.all();
	const types = {};
	for (const key of knownTypes()) {
		types[key] = publicView(stored[key]);
	}
	res.json({ types, modes: MODES, recommended: RECOMMENDED });
});

/**
 * What the panel would try on Steam for this type, and where each candidate
 * came from. Purely diagnostic: it's the difference between "this game has no
 * artwork" and "the panel never worked out which game this is".
 */
router.get("/:type/steam-candidates", admin, async (req, res) => {
	const key = safeTypeKey(req.params.type);
	if (!key) return res.status(400).json({ error: "Unrecognised game type." });
	try {
		res.json({ appIds: await resolveAppIds(key) });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.put("/:type", admin, async (req, res) => {
	const key = safeTypeKey(req.params.type);
	if (!key) return res.status(400).json({ error: "Unrecognised game type." });

	const before = appearanceStore.get(key);
	try {
		const saved = await appearanceStore.set(key, {
			mode: req.body.mode,
			color: req.body.color,
			color2: req.body.color2,
			appId: req.body.appId,
		});
		// A different appid means the cached image is the wrong game's.
		if ((before?.appId ?? null) !== (saved.appId ?? null)) await forgetSteamArt(key);
		announce(key, saved);
		res.json(publicView(saved));
	} catch (err) {
		res.status(400).json({ error: err.message });
	}
});

router.post("/:type/image", admin, singleFile(upload, "image", "12 MB"), async (req, res) => {
	const key = safeTypeKey(req.params.type);
	if (!key) return res.status(400).json({ error: "Unrecognised game type." });
	if (!req.file) return res.status(400).json({ error: "An image file is required." });

	// The format comes from the bytes, never the filename or the browser's
	// content type — this file gets written to disk and served back later.
	const meta = sniffImage(req.file.buffer);
	if (!meta) {
		return res.status(400).json({ error: "That doesn't look like a PNG or JPEG image." });
	}

	try {
		const previous = appearanceStore.get(key)?.image?.file;
		const file = `${key}.${meta.ext}`;
		await fs.mkdir(paths.customArtDir, { recursive: true });
		await fs.writeFile(path.join(paths.customArtDir, file), req.file.buffer);
		// Switching png -> jpg would otherwise leave the old one orphaned.
		if (previous && previous !== file) {
			await fs.rm(path.join(paths.customArtDir, previous), { force: true });
		}

		const saved = await appearanceStore.set(key, {
			mode: "image",
			image: {
				file,
				contentType: meta.contentType,
				width: meta.width,
				height: meta.height,
				bytes: req.file.buffer.length,
			},
		});
		announce(key, saved);
		// Uploaded, then advised — an unusual shape or size is the user's call
		// to make, not grounds for refusing their image.
		res.json({ ...publicView(saved), notes: describeFit(meta) });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.delete("/:type/image", admin, async (req, res) => {
	const key = safeTypeKey(req.params.type);
	if (!key) return res.status(400).json({ error: "Unrecognised game type." });

	try {
		const file = appearanceStore.get(key)?.image?.file;
		if (file) await fs.rm(path.join(paths.customArtDir, path.basename(file)), { force: true });
		const saved = await appearanceStore.set(key, { mode: "auto", image: null });
		announce(key, saved);
		res.json(publicView(saved));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

/** Drop the cached Steam artwork and look again — for when a game's art changes. */
router.post("/:type/refetch", admin, async (req, res) => {
	const key = safeTypeKey(req.params.type);
	if (!key) return res.status(400).json({ error: "Unrecognised game type." });
	try {
		await forgetSteamArt(key);
		const saved = await appearanceStore.set(key, {});
		announce(key, saved);
		res.json(publicView(saved));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

export default router;

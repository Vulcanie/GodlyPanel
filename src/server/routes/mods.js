// Mods for a server: what is installed, adding, turning off, removing. Admin only;
// every change needs the server stopped, since games read their mods at start.
import express from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { get as getServer } from "../data/serverStore.js";
import { paths } from "../paths.js";
import { runOperation } from "../services/serverOps.js";
import { isFullyStopped } from "../services/serverState.js";
import { singleFile } from "../middleware/uploadErrors.js";
import {
	ModError,
	listMods,
	installUpload,
	installWorkshopItem,
	installThunderstoreMod,
	addScriptId,
	setModEnabled,
	removeMod,
} from "../services/modService.js";

const router = express.Router();

router.param("serverName", (req, res, next, name) => {
	const server = getServer(name);
	if (!server) return res.status(404).json({ error: "Server not found" });
	req.server = server;
	next();
});

const uploadDir = path.join(paths.uploadsDir, "mods");
const upload = multer({
	storage: multer.diskStorage({
		destination: (req, file, cb) => {
			fs.mkdirSync(uploadDir, { recursive: true });
			cb(null, uploadDir);
		},
		filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.upload`),
	}),
	limits: { fileSize: 500 * 1024 * 1024 },
});

function fail(res, err, what) {
	if (err instanceof ModError) return res.status(err.status).json({ error: err.message, code: err.code });
	if (err.code === "path_not_allowed") return res.status(400).json({ error: err.message, code: err.code });
	if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
	console.error(`${what} failed:`, err);
	res.status(500).json({ error: `${what} failed: ${err.message}` });
}

/** Runs a change under the server's lock, refusing while the game is up. */
async function change(req, res, what, work) {
	try {
		const result = await runOperation(req.server.name, "changing mods", async () => {
			if (!(await isFullyStopped(req.server))) {
				throw new ModError("Stop the server first: a game reads its mods when it starts.", "server_running", 409);
			}
			return work();
		});
		res.json({ success: true, ...result });
	} catch (err) {
		fail(res, err, what);
	}
}

router.get("/server/:serverName/mods", async (req, res) => {
	try {
		res.json(await listMods(req.server));
	} catch (err) {
		fail(res, err, "Reading the mods");
	}
});

router.post("/server/:serverName/mods/upload", singleFile(upload, "mod", "500 MB"), async (req, res) => {
	if (!req.file) return res.status(400).json({ error: "Choose a file to add." });
	const temp = req.file.path;
	try {
		await change(req, res, "Adding the mod", () => installUpload(req.server, req.file.originalname, temp));
	} finally {
		fs.rm(temp, { force: true }, () => {});
	}
});

router.post("/server/:serverName/mods/workshop", (req, res) =>
	change(req, res, "Adding the Workshop item", () => installWorkshopItem(req.server, req.body?.id)),
);

router.post("/server/:serverName/mods/thunderstore", (req, res) =>
	change(req, res, "Adding the package", () => installThunderstoreMod(req.server, req.body?.package)),
);

router.post("/server/:serverName/mods/script-id", (req, res) =>
	change(req, res, "Adding the mod", () => addScriptId(req.server, req.body?.id)),
);

router.put("/server/:serverName/mods/enabled", (req, res) => {
	if (typeof req.body?.enabled !== "boolean" || typeof req.body?.id !== "string") {
		return res.status(400).json({ error: "id and enabled (true or false) are required." });
	}
	return change(req, res, "Changing the mod", async () => {
		await setModEnabled(req.server, req.body.id, req.body.enabled);
		return {};
	});
});

router.post("/server/:serverName/mods/remove", (req, res) => {
	if (typeof req.body?.id !== "string") return res.status(400).json({ error: "id is required." });
	return change(req, res, "Removing the mod", async () => {
		await removeMod(req.server, req.body.id);
		return {};
	});
});

export default router;

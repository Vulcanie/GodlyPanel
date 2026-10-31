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
	modConfigFor,
	modInstallContext,
	modsFolderOf,
} from "../services/modService.js";
import { installFromSource } from "../services/modSources/installer.js";
import { detectSource, getProvider } from "../services/modSources/index.js";
import { recordInstalled } from "../services/modRecord.js";
import { checkUpdates, applyUpdate } from "../services/modUpdates.js";
import * as modLock from "../services/modLock.js";

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
	if (err instanceof ModError) return res.status(err.status).json({ error: err.message, code: err.code, ...(err.details !== undefined ? { details: err.details } : {}) });
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

// The one-box install: a pasted address or a name. detectSource only reads the text; the source it names must be one this game takes.
const INPUT_MAX = 2000;

const labelOf = (id) => getProvider(id)?.label ?? id;

async function installFromAddress(server, found, body) {
	const dir = modsFolderOf(server);
	if (!dir) throw new ModError("This game's mods can't be added from an address.", "unsupported");
	const ctx = {
		...(await modInstallContext(server)),
		trusted: body.trusted === true,
		assetName: typeof body.assetName === "string" ? body.assetName : undefined,
		// A dependency already in the folder is passed over and reported, rather than failing the whole install.
		skipInstalled: true,
	};
	const result = await installFromSource(server, found.source, found.ref, ctx);
	await recordInstalled(server, dir, result);
	return { installed: result.installed, unverified: result.unverified, skipped: result.skipped };
}

router.post("/server/:serverName/mods/install", (req, res) => {
	const body = req.body ?? {};
	const input = typeof body.input === "string" ? body.input.trim() : "";
	if (input === "" || input.length > INPUT_MAX) {
		return res.status(400).json({ error: `Paste a mod's address or name, up to ${INPUT_MAX} characters.`, code: "bad_input" });
	}
	const spec = modConfigFor(req.server);
	const accepted = (Array.isArray(spec?.sources) ? spec.sources : []).map(labelOf);
	const found = detectSource(input);
	if (!found) return res.status(400).json({ error: "I don't recognise that link.", code: "unrecognised", accepted });
	if (!Array.isArray(spec?.sources) || !spec.sources.includes(found.source)) {
		return res.status(400).json({ error: `This game doesn't take mods from ${labelOf(found.source)}.`, code: "source_not_supported", accepted });
	}
	return change(req, res, "Installing the mod", async () => {
		try {
			return await installFromAddress(req.server, found, body);
		} catch (err) {
			if (err instanceof ModError) throw err;
			// Anything else may carry a path from the panel's own folders, which the response must not show.
			console.error("Installing a mod from an address failed:", err);
			throw new ModError("The mod couldn't be installed. The panel's log has the details.", "install_failed", 500);
		}
	});
});

router.get("/server/:serverName/mods/lock", async (req, res) => {
	try {
		const name = req.server.name;
		const dir = modsFolderOf(req.server);
		const { mods } = await modLock.read(name);
		const drift = dir ? await modLock.diffAgainstDisk(name, dir) : { changed: [], missing: [], untracked: [] };
		res.json({ entries: mods, drift, orphans: await modLock.orphans(name) });
	} catch (err) {
		fail(res, err, "Reading the mod lock");
	}
});

// What each mod in the lock could be updated to. Only asks the sources; nothing is downloaded or changed, so it works while the game runs.
router.get("/server/:serverName/mods/updates", async (req, res) => {
	try {
		res.json({ updates: await checkUpdates(req.server) });
	} catch (err) {
		fail(res, err, "Checking for updates");
	}
});

// Updates one mod from the lock, by its id. Needs the server stopped, like any change to the mods folder.
const UPDATE_ID_MAX = 600;
router.post("/server/:serverName/mods/update", (req, res) => {
	const id = req.body?.id;
	if (typeof id !== "string" || id === "" || id.length > UPDATE_ID_MAX) {
		return res.status(400).json({ error: `id is required, up to ${UPDATE_ID_MAX} characters.`, code: "bad_input" });
	}
	return change(req, res, "Updating the mod", async () => {
		try {
			return await applyUpdate(req.server, id);
		} catch (err) {
			if (err instanceof ModError) throw err;
			// Anything else may carry a path from the panel's own folders, which the response must not show.
			console.error("Updating a mod failed:", err);
			throw new ModError("The mod couldn't be updated. The panel's log has the details.", "update_failed", 500);
		}
	});
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
		// The mod is gone either way. A record that can't be updated is logged, not reported as a failed removal: the drift check shows it.
		await modLock.forgetName(req.server.name, req.body.id).catch((err) => console.error("Updating the mod lock failed:", err));
		return {};
	});
});

export default router;

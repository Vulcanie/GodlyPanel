// Admin-only surface. The read-only dashboard endpoints a guest is allowed to
// see live in routes/dashboard.js; everything here either exposes credentials
// and filesystem paths, or changes something.
import express from "express";
import multer from "multer";
import { get as getServer } from "../data/serverStore.js";
import { readManagedFile, writeManagedFile, sendFileError } from "../util/managedFiles.js";
import { singleFile } from "../middleware/uploadErrors.js";
import serverWindowRoutes from "./serverWindowRoutes.js";
import { isServerRunning } from "../services/serverState.js";
import { describePorts, checkPorts, applyPorts } from "../services/serverPorts.js";
import { planRemoval, removeServerCompletely } from "../services/serverRemoval.js";
import { forgetServerInSchedules } from "../services/scheduler.js";
import { forgetPlayers } from "../services/playerTracker.js";
import { extractModpackZip, cleanupUpload } from "../services/modpackService.js";
import { SUPPORTED_MODLOADER_FAMILIES } from "../data/gameTemplates.js";
import { pollServers } from "../services/pollingService.js";
import {
	isAutoUpdateEnabled,
	setAutoUpdateEnabled,
} from "../services/autoUpdateSettings.js";
import {
	listTemplates,
	suggestParams,
	createServer,
	getJob,
} from "../services/serverCreationService.js";

const router = express.Router();

// Every route with :serverName resolves it once, here, instead of repeating
// the lookup and the 404 in each handler.
router.param("serverName", (req, res, next, name) => {
	const server = getServer(name);
	if (!server) return res.status(404).json({ error: "Server not found" });
	req.server = server;
	next();
});

// Window mode, launch details and console output for one server.
router.use("/server/:serverName", serverWindowRoutes);

/** Which file a config request means: a named one, or the server's single file. */
function configPathFor(server, name) {
	return server.configPaths ? server.configPaths[name] : server.configPath;
}

// Basic info about a single server
router.get("/server/:serverName", async (req, res) => {
	const server = req.server;
	res.json({
		name: server.name,
		type: server.type,
		configNames: server.configPaths
			? Object.keys(server.configPaths)
			: server.configPath
				? ["config"]
				: [],
		hasUpdate: Boolean(server.updateAppId),
		hasRcon: Boolean(server.rconPort && server.rconPassword),
		hasAutoUpdate: Boolean(server.updateAppId),
		autoUpdateEnabled: server.updateAppId
			? await isAutoUpdateEnabled(server)
			: false,
	});
});

// Toggle whether this server participates in the Steam-build auto-update
// checker. Takes effect on the next check — no restart needed.
router.post("/server/:serverName/auto-update", async (req, res) => {
	const server = req.server;
	if (!server.updateAppId) {
		return res.status(400).json({ error: "This server has no update configured." });
	}

	const { enabled } = req.body || {};
	if (typeof enabled !== "boolean") {
		return res.status(400).json({ error: "`enabled` (boolean) is required." });
	}

	await setAutoUpdateEnabled(server.name, enabled);
	res.json({ success: true, autoUpdateEnabled: enabled });
});

// --- Ports ---

router.get("/server/:serverName/ports", async (req, res) => {
	res.json({ ...(await describePorts(req.server)), running: await isServerRunning(req.server) });
});

// Live validation for the ports form: the same check the save runs.
router.post("/server/:serverName/ports/check", async (req, res) => {
	res.json(await checkPorts(req.server, req.body?.ports));
});

router.put("/server/:serverName/ports", async (req, res) => {
	// A running game keeps the ports it started with, so a change would be
	// recorded as done while the server carried on using the old ones.
	if (await isServerRunning(req.server)) {
		return res.status(409).json({ error: "Stop the server first: a running game keeps the ports it started with.", code: "server_running" });
	}
	try {
		const result = await applyPorts(req.server, req.body?.ports);
		pollServers().catch(() => {});
		res.json({ success: true, ...result, ...(await describePorts(getServer(req.server.name))) });
	} catch (err) {
		if (err.code === "port_conflict") return res.status(400).json({ error: err.message, code: err.code });
		console.error(`Port change failed for ${req.server.name}:`, err);
		res.status(500).json({ error: `Couldn't change the ports: ${err.message}` });
	}
});

// --- Removing a server ---

router.get("/server/:serverName/removal", async (req, res) => {
	res.json({ ...planRemoval(req.server), running: await isServerRunning(req.server) });
});

router.delete("/server/:serverName", async (req, res) => {
	const { deleteFiles = false, confirmName } = req.body ?? {};
	if (confirmName !== req.server.name) {
		return res.status(400).json({ error: "Type the server's exact name to confirm.", code: "confirm_mismatch" });
	}
	if (await isServerRunning(req.server)) {
		return res.status(409).json({ error: "Stop the server first. A running server can't be removed.", code: "server_running" });
	}
	try {
		const removed = await removeServerCompletely(req.server, { deleteFiles: deleteFiles === true });
		await forgetServerInSchedules(req.server.name);
		forgetPlayers(req.server.name);
		res.json({ success: true, ...removed });
	} catch (err) {
		const status = err.code === "files_protected" ? 400 : 500;
		if (status === 500) console.error(`Removing ${req.server.name} failed:`, err);
		res.status(status).json({ error: err.message, code: err.code });
	}
});

// Get content of a specific config file
router.get("/config/:serverName", async (req, res) => {
	const target = configPathFor(req.server, req.query.file);
	if (!target) {
		return res.status(400).json({ error: "Valid config file must be specified." });
	}
	try {
		res.json({ content: await readManagedFile(target) });
	} catch (err) {
		sendFileError(res, err, `the config for ${req.server.name}`);
	}
});

// Save a config file
router.post("/config/:serverName", async (req, res) => {
	const { fileName, content } = req.body ?? {};
	const target = configPathFor(req.server, fileName);
	if (!target) {
		return res.status(400).json({ error: "A valid fileName must be provided." });
	}
	if (typeof content !== "string") {
		return res.status(400).json({ error: "Invalid content format" });
	}
	try {
		await writeManagedFile(target, content);
		res.json({ success: true, message: `${fileName ?? "Config"} saved successfully!` });
	} catch (err) {
		sendFileError(res, err, `the config for ${req.server.name}`);
	}
});

// --- Dynamic server creation ---

const modpackUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 500 * 1024 * 1024 },
});

// Upload + parse a CurseForge modpack export zip. Fast (zip I/O + JSON
// parse, no network calls) — responds synchronously with what was detected
// so the admin can confirm before the real creation job (which does the
// heavy mod-downloading) kicks off via the usual POST /servers below.
router.post("/uploads/modpack", singleFile(modpackUpload, "modpackZip", "500 MB"), async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: "A modpackZip file is required." });
	}
	try {
		const { uploadId, manifest, hasOverrides } = await extractModpackZip(req.file.buffer);
		if (!SUPPORTED_MODLOADER_FAMILIES.includes(manifest.modLoaderFamily)) {
			await cleanupUpload(uploadId);
			return res.status(400).json({
				error: `Unsupported modloader "${manifest.modLoaderFamily}" — only NeoForge, Forge, and Fabric modpacks are supported.`,
			});
		}
		res.json({
			uploadId,
			mcVersion: manifest.mcVersion,
			modLoaderFamily: manifest.modLoaderFamily,
			modLoaderVersion: manifest.modLoaderVersion,
			modCount: manifest.files.length,
			hasOverrides,
			packName: manifest.packName,
		});
	} catch (e) {
		res.status(400).json({ error: e.message });
	}
});

// List the one-click game templates available for creation.
router.get("/templates", (req, res) => {
	res.json(listTemplates());
});

// Suggested defaults for a template (next-free ports, and whether a shared
// install — e.g. ARK ASA — already exists so the UI can say "adding a map
// to your existing cluster" instead of "installing a new server").
router.get("/templates/:id/suggest", async (req, res) => {
	try {
		res.json(await suggestParams(req.params.id));
	} catch (e) {
		res.status(404).json({ error: e.message });
	}
});

// Kick off creating a new server from a template. Long-running (SteamCMD
// install) — returns a jobId immediately; poll it at GET /servers/create/:jobId.
router.post("/servers", async (req, res) => {
	const { templateId, ...params } = req.body || {};
	if (!templateId) {
		return res.status(400).json({ error: "templateId is required." });
	}
	try {
		const jobId = await createServer(templateId, params);
		res.json({ success: true, jobId });
	} catch (e) {
		res.status(e.code === "steamcmd-not-installed" ? 409 : 400).json({ error: e.message, code: e.code });
	}
});

router.get("/servers/create/:jobId", async (req, res) => {
	const job = await getJob(req.params.jobId);
	if (!job) {
		return res.status(404).json({ error: "Unknown job." });
	}
	res.json(job);
});

export default router;

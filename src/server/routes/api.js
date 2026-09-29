import express from "express";
import multer from "multer";
import { promises as fs } from "fs";
import { all as allServers } from "../data/serverStore.js";
import { extractModpackZip, cleanupUpload } from "../services/modpackService.js";
import { SUPPORTED_MODLOADER_FAMILIES } from "../data/gameTemplates.js";
import { serverStatus, pollServers } from "../services/pollingService.js";
import { latestStats } from "../services/systemStats.js";
import { latestServerStats } from "../services/serverResourceStats.js";
import {
	startServer,
	stopServer,
	sendRconCommand,
} from "../services/serverControl.js";
import { updateServer } from "../services/updateService.js";
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
const sseClients = new Set();

/**
 * Broadcast an SSE event to all connected clients.
 * Called by pollingService.js when status changes.
 */
export function broadcastSseEvent(payload) {
	const data = `data: ${JSON.stringify(payload)}\n\n`;
	for (const res of sseClients) {
		res.write(data);
	}
}

router.get("/events", (req, res) => {
	// Required SSE headers
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	// No CORS header: the UI is served from this same origin now. (The old
	// hosted setup hardcoded the GitHub Pages origin here.)
	res.setHeader("X-Accel-Buffering", "no");
	if (res.flushHeaders) res.flushHeaders();
	// Add client to the set
	sseClients.add(res);
	// Initial event so frontend knows it's connected
	res.write(
		`data: ${JSON.stringify({
			type: "connected",
			timestamp: Date.now(),
		})}\n\n`,
	);
	// Heartbeat every 15 seconds (Cloudflare requires this)
	const heartbeat = setInterval(() => {
		res.write("data: {}\n\n");
	}, 15000);
	// Remove client on disconnect
	req.on("close", () => {
		clearInterval(heartbeat);
		sseClients.delete(res);
		res.end();
	});
});

// Live status of all servers
router.get("/status", (req, res) => {
	res.setHeader("Content-Type", "application/json");
	res.json(serverStatus);
});

router.get("/status/latest", (req, res) => {
	res.json(serverStatus);
});

// Latest system resource reading (RAM/CPU), for the dashboard's initial
// load — live updates after that arrive over SSE as "system_stats" events.
router.get("/system-stats", (req, res) => {
	res.json(latestStats || {});
});

// Latest per-server RAM/CPU reading, for the dashboard's initial load —
// live updates after that arrive over SSE as "server_stats" events.
router.get("/server-stats", (req, res) => {
	res.json(latestServerStats || []);
});

// Basic info about a single server
router.get("/server/:serverName", async (req, res) => {
	const server = allServers().find(
		(s) => s.name === req.params.serverName,
	);
	if (!server) {
		return res.status(404).json({ error: "Server not found" });
	}
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
// checker. Takes effect on the next 15-minute check — no restart needed.
router.post("/server/:serverName/auto-update", async (req, res) => {
	const server = allServers().find(
		(s) => s.name === req.params.serverName,
	);
	if (!server) {
		return res.status(404).json({ error: "Server not found" });
	}
	if (!server.updateAppId) {
		return res
			.status(400)
			.json({ error: "This server has no update configured." });
	}

	const { enabled } = req.body || {};
	if (typeof enabled !== "boolean") {
		return res.status(400).json({ error: "`enabled` (boolean) is required." });
	}

	await setAutoUpdateEnabled(server.name, enabled);
	res.json({ success: true, autoUpdateEnabled: enabled });
});

// Get content of a specific config file
router.get("/config/:serverName", async (req, res) => {
	const server = allServers().find(
		(s) => s.name === req.params.serverName,
	);
	const { file } = req.query;

	if (!server) {
		return res.status(404).json({ error: "Server not found" });
	}

	let pathToRead = server.configPaths
		? server.configPaths[file]
		: server.configPath;

	if (!pathToRead) {
		return res
			.status(400)
			.json({ error: "Valid config file must be specified." });
	}

	try {
		const configContent = await fs.readFile(pathToRead, "utf-8");
		res.json({ content: configContent });
	} catch (error) {
		console.error(
			`Error reading config for ${req.params.serverName}:`,
			error,
		);
		res.status(500).json({ error: "Failed to read config file." });
	}
});

// Save a config file
router.post("/config/:serverName", async (req, res) => {
	const server = allServers().find(
		(s) => s.name === req.params.serverName,
	);
	const { fileName, content } = req.body;

	if (!server) {
		return res.status(404).json({ error: "Server not found" });
	}

	let pathToWrite = server.configPaths
		? server.configPaths[fileName]
		: server.configPath;

	if (!pathToWrite) {
		return res
			.status(400)
			.json({ error: "A valid fileName must be provided." });
	}

	try {
		await fs.copyFile(pathToWrite, `${pathToWrite}.bak`);
		await fs.writeFile(pathToWrite, content, "utf-8");
		res.json({ success: true, message: `${fileName} saved successfully!` });
	} catch (error) {
		console.error(`Error writing config for ${server.name}:`, error);
		res.status(500).json({
			error: `Failed to save ${fileName}. System error: ${error.code}`,
		});
	}
});

// Start, stop, or update a server
router.post("/control/:serverName/:action", async (req, res) => {
	const { serverName, action } = req.params;
	const server = allServers().find((s) => s.name === serverName);

	if (!server) {
		return res.status(404).json({ error: "Server not found" });
	}

	if (action === "start") {
		try {
			const result = await startServer(server);
			res.json(result);
			// Refresh right away instead of leaving the dashboard on stale
			// "offline" state until the next scheduled poll tick (≤7.5s).
			pollServers().catch(() => {});
		} catch (e) {
			console.error(`Start error for ${serverName}:`, e);
			res.status(500).json({ error: e.message });
		}
	} else if (action === "stop") {
		try {
			const result = await stopServer(server);
			res.json(result);
			pollServers().catch(() => {});
		} catch (e) {
			console.error(`Stop error for ${serverName}:`, e);
			res.status(500).json({ error: e.message });
		}
	} else if (action === "update" || action === "update-reboot") {
		const restart = action === "update-reboot";
		try {
			const { groupNames, logPath } = await updateServer(server, {
				restart,
			});
			const who =
				groupNames.length > 1
					? `${groupNames.join(", ")} (shared install)`
					: serverName;
			const afterward = restart
				? "they'll start back up automatically once the update finishes"
				: "left stopped when it's done";
			res.json({
				success: true,
				message: `Update${restart ? " + reboot" : ""} started for ${who}. This can take several minutes; ${afterward}. Log: ${logPath}`,
			});
			pollServers().catch(() => {});
		} catch (e) {
			console.error(`Update error for ${serverName}:`, e);
			res.status(500).json({ error: e.message });
		}
	} else if (action === "rcon") {
		const { command } = req.body || {};
		if (!command || typeof command !== "string") {
			return res.status(400).json({ error: "A command is required." });
		}
		try {
			const response = await sendRconCommand(server, command);
			res.json({ success: true, response });
		} catch (e) {
			console.error(`RCON command error for ${serverName}:`, e);
			res.status(500).json({ error: e.message });
		}
	} else {
		res.status(400).json({ error: "Invalid action." });
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
router.post("/uploads/modpack", modpackUpload.single("modpackZip"), async (req, res) => {
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
		res.status(400).json({ error: e.message });
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
